/**
 * F66 · Instant Website Visibility Score, F67 · Quick and full modes, F68 · Transparent scoring and denominator (acceptances _handoffs
 * AlmiVisibility_F66/F67/F68_ACCEPTANCE_2026-10-19.md; RR-291, light proof). Fixtures with firing controls, and REAL on the client's own
 * stored page reads through bin/visibility-parts.mjs (count-only).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CHECKS, RESULT, checkUrl, score, runMode, findingsOf, evidenceByUrl } from "../src/report/visibility-score.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const words = Array(320).fill("word").join(" ");
const good = `<html lang="en"><head><title>A good page title here</title><meta name="description" content="${"d".repeat(80)}"><meta name="viewport" content="w"><link rel="canonical" href="https://s.example/a"><script type="application/ld+json">{}</script></head><body><h1>H</h1><p>${words}</p><img src="x" alt=""></body></html>`;
const ev = (html, extra = {}) => ({ ids: { page: "read:1" }, page: { html }, ...extra });

test("F66 C1–C2 · a URL is scored from its stored evidence only; every result names its check and evidence id; failures carry finding and action", () => {
  const r = checkUrl("https://s.example/a", ev(good));
  assert.equal(r.length, CHECKS.length);
  assert.ok(r.filter((x) => x.result !== RESULT.NOT_MEASURED).every((x) => x.check && x.evidenceId === "read:1"));
  const bad = checkUrl("https://s.example/b", ev(good.replace(/<title>.*<\/title>/, "")));
  const f = findingsOf(bad);
  assert.deepEqual(f.map((x) => x.check), ["title"]);
  assert.ok(f[0].finding && f[0].action && f[0].evidenceId);
  /* FIRING CONTROL: with no stored read every page check is NOT MEASURED — never a FAIL invented */
  assert.ok(checkUrl("u", { ids: {} }).every((x) => x.result === RESULT.NOT_MEASURED));
});

test("F68 C1–C2 · weights, evaluated checks and NOT MEASURED values reported; NOT MEASURED leaves the denominator unchanged", () => {
  const r = checkUrl("https://s.example/a", ev(good, { security: { read: { status: 200 } }, ids: { page: "read:1", security: "sec:1" } }));
  const s = score(r);
  assert.equal(s.notMeasured.length, 1, "links-resolve is NOT MEASURED without link observations");
  assert.equal(s.denominator, CHECKS.reduce((t, c) => t + c.weight, 0) - CHECKS.find((c) => c.id === "links-resolve").weight);
  assert.match(s.denominatorRule, /NOT MEASURED check is not in it/);
  /* FIRING CONTROL: add a NOT MEASURED check — the denominator does not move */
  const plus = score([...r, { url: "u", check: "x", category: "LINKS", weight: 9, result: RESULT.NOT_MEASURED, needs: "n" }]);
  assert.equal(plus.denominator, s.denominator);
  assert.equal(plus.score, s.score);
  assert.deepEqual(Object.keys(s.weights), CHECKS.map((c) => c.id));
});

test("F67 C1–C2 · quick and full call the SAME checks; quick states its sample size and what it skipped", () => {
  const m = new Map(["https://s.example/1", "https://s.example/2", "https://s.example/3", "https://s.example/4"].map((u) => [u, ev(good)]));
  const quick = runMode({ mode: "quick", evidenceByUrl: m, sample: 2 }), full = runMode({ mode: "full", evidenceByUrl: m });
  assert.deepEqual([quick.sampleSize, quick.of, quick.skipped.length], [2, 4, 2]);
  assert.deepEqual([full.sampleSize, full.skipped.length], [4, 0]);
  assert.deepEqual([...new Set(quick.results.map((r) => r.check))], [...new Set(full.results.map((r) => r.check))]);
  /* CENSUS: the module holds one check list and runMode's both modes go through checkUrl — no second copy of a check */
  const src = readFileSync(join(REPO, "src/report/visibility-score.mjs"), "utf8");
  const body = src.slice(src.indexOf("export function runMode"), src.indexOf("\n}\n", src.indexOf("export function runMode")));
  assert.match(body, /checkUrl\(/);
  assert.equal((src.match(/export const CHECKS/g) ?? []).length, 1);
  assert.ok(!/\.run\(/.test(body), "runMode runs a check itself");
});

test("evidence · the latest stored read of each URL wins; a security or link record for an unread URL adds no URL", () => {
  const m = evidenceByUrl({ pageReads: [{ url: "u", html: "old", recorded_at: "1", measurement_key: "a" }, { url: "u", html: "new", recorded_at: "2", measurement_key: "b" }], securityReads: [{ url: "v", kind: "PAGE" }] });
  assert.deepEqual([...m.keys()], ["u"]);
  assert.equal(m.get("u").ids.page, "b");
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "live-pages.jsonl"));
const run = (part) => spawnSync(process.execPath, ["bin/visibility-parts.mjs", `--part=${part}`, "--subject=almi-oet", `--research-batch=${BATCH}`, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
test("REAL · F66 C3, F67, F68 · the client's own stored live pages scored full and quick; score, findings, actions, weights, NOT MEASURED and the denominator printed", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const full = run("score"), quick = run("score-quick");
  assert.equal(full.status, 0, full.stderr);
  assert.equal(quick.status, 0, quick.stderr);
  const of = Number(/sample (\d+) of (\d+)/.exec(full.stdout)?.[2]);
  assert.ok(of >= 10, `EMPTY or shrunken real population: ${of}`);
  assert.match(full.stdout, /score \d+ = \d+ \/ \d+ — the denominator is the weights of the EVALUATED checks only/);
  assert.match(full.stdout, /weights title 3/);
  assert.match(full.stdout, /evaluated checks \d+ · NOT MEASURED \d+/);
  assert.match(full.stdout, /findings \d+ \(each with its check, evidence id and next action\)/);
  assert.match(quick.stdout, new RegExp(`mode QUICK  sample 3 of ${of} URL\\(s\\) · skipped ${of - 3}:`));
  console.log(`  REAL: ${full.stdout.split(/\r?\n/).slice(1, 3).map((l) => l.trim()).join(" | ")} | quick ${/score (\d+)/.exec(quick.stdout)?.[1]}`);
});
