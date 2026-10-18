/**
 * F91 · AMENDMENT 6 · the page plan by the owner's demand-or-opportunity rule (acceptance _handoffs
 * AlmiVisibility_F91_ACCEPTANCE_AMENDMENT_6_2026-10-18.md, RR-286). Firing controls on fixed records; REAL over the batch's stored records —
 * the client's own imported Search Console queries among them. Nothing fetched or written; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { planPages, planFaults, movedToDemand, names, LABEL } from "../src/page/page-plan.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const PROF = [{ value: "a", aliases: ["alpha"], page: "https://s.example/alpha" }, { value: "b", aliases: ["beta"], page: "https://s.example/beta" }];
const DEST = [{ value: "x", aliases: ["xland"], bodies: ["X Board"] }, { value: "y", aliases: ["yland"], bodies: ["Y Board"] }, { value: "z", aliases: ["zland"], bodies: ["Z Board"] }];
const CLAIMS = [
  { claimId: "c1", primary: "a", body: "X Board", text: "Alpha needs grade B." },
  { claimId: "c2", primary: "b", body: "X Board", text: "Alpha needs grade B." },
  { claimId: "c3", primary: "b", body: "Y Board", text: "Beta needs 350." },
];
const phrase = (id, text, source = "SEARCH_CONSOLE", label = "OBSERVED") => ({ record_type: "search_phrase", measurement_key: `search_phrase:${id}`, phrase_id: id, phrase: text, source, label, date: "2026-10-18" });
/* p4 names one value only: never demand for a combination */
const RECORDS = [phrase("p1", "alpha exam xland"), phrase("p2", "beta in yland", "AI_SUGGESTION", "INFERRED"), phrase("p4", "exam in yland")];
const plan = (records = RECORDS) => planPages({ primaries: PROF, secondaries: DEST, claims: CLAIMS, records });

test("C22 · THREE COUNTS · FIRING CONTROL: (with C21) the raw combination count, candidates only, and DEMAND, OPPORTUNITY and MERGED apart — never one maximum", () => {
  const p = plan();
  assert.equal(p.candidates, 6, "the raw combination count is not the product of the value counts");
  assert.deepEqual(p.counts, { DEMAND: 1, OPPORTUNITY: 1, MERGED: 4, NOT_MEASURED: 0 });
  assert.ok(!("maximum" in p) && !("pages" in p), "a single page total is printed");
  assert.equal(planPages({ primaries: [], secondaries: DEST, claims: CLAIMS, records: [] }).measured, false);
});

test("C23 · DEMAND OR OPPORTUNITY, NEVER DUPLICATE OR THIN · FIRING CONTROL: own demand and own answer is DEMAND; own answer alone is OPPORTUNITY; no own answer, or the same answer, is MERGED — an estimate never makes demand", () => {
  const by = (k) => plan().rows.find((r) => r.combination === k);
  assert.equal(by("a × x").label, LABEL.DEMAND, "own demand and own answer is not DEMAND");
  assert.equal(by("b × x").label, LABEL.MERGED, "the same answer became a second page");
  assert.equal(by("b × x").target, "a × x");
  assert.equal(by("b × y").label, LABEL.OPPORTUNITY, "an AI suggestion (an ESTIMATE), or a record naming one value only, made it DEMAND");
  assert.equal(by("a × y").label, LABEL.MERGED, "a combination with no answer of its own became a page");
  assert.equal(by("a × y").target, "https://s.example/alpha");
  assert.deepEqual(planFaults(plan(), { claims: CLAIMS }), []);
  const dup = { rows: [{ combination: "p", label: LABEL.OPPORTUNITY, answer: ["c1"], demand: [] }, { combination: "q", label: LABEL.OPPORTUNITY, answer: ["c2"], demand: [] }, { combination: "r", label: LABEL.DEMAND, answer: [], demand: [] }] };
  assert.deepEqual(planFaults(dup, { claims: CLAIMS }).map((f) => f.fault.split(" ")[0]), ["DUPLICATE", "THIN", "DEMAND"]);
});

test("C23 · the same answer is ONE page, and it is the one with the most recorded demand — the others are its sections", () => {
  const p = plan([phrase("p3", "beta for xland")]);
  const by = (k) => p.rows.find((r) => r.combination === k);
  assert.equal(by("b × x").label, LABEL.DEMAND);
  assert.equal(by("a × x").label, LABEL.MERGED);
  assert.equal(by("a × x").target, "b × x", "the larger page with demand is not the one kept");
});

test("C24 · EXACTLY ONE LABEL AND ONE REASON · FIRING CONTROL: every requested combination labelled once, with its reason — none dropped", () => {
  const p = plan();
  assert.equal(p.rows.length, p.candidates);
  for (const r of p.rows) { assert.ok(Object.values(LABEL).includes(r.label)); assert.ok(typeof r.reason === "string" && r.reason.length > 0, `${r.combination} has no reason`); }
  assert.equal(new Set(p.rows.map((r) => r.combination)).size, p.rows.length);
});

test("C25 · OPPORTUNITY MOVES · FIRING CONTROL: a demand record that names an OPPORTUNITY moves it to DEMAND, named by the record", () => {
  const before = plan(), after = plan([...RECORDS, phrase("p9", "beta yland")]);
  assert.deepEqual(movedToDemand(before, after), [{ combination: "b × y", by: ["search_phrase:p9"] }]);
  assert.ok(names("OET for Beta in YLand", ["yland"]) && !names("ylander", ["yland"]), "whole-word matching is broken");
});

/* ── REAL ── */
const BATCH = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "page-plan-inputs-2026-10-18.json")) && existsSync(join(BATCH, "search-console-exports.jsonl"));
const SKIP = HERE ? false : "the declared batch is not on this machine";
function real() {
  const json = (f) => JSON.parse(readFileSync(join(BATCH, f), "utf8"));
  const rows = (f) => readFileSync(join(BATCH, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const inputs = json("page-plan-inputs-2026-10-18.json");
  const published = [...new Map(rows("joined-pages.jsonl").filter((r) => r.record_type === "joined_page_draft" && r.publishedUrl).map((r) => [r.value, r])).values()];
  const professions = inputs.professions.map((p) => ({ ...p, page: published.find((x) => x.value === p.value)?.publishedUrl ?? null }));
  const claims = json("page-drafts.json").pages.flatMap((p) => p.needs.flatMap((n) => (n.answer?.claims ?? []).map((c) => ({ claimId: c.claimId, primary: p.combination?.profession, body: c.body ?? c.source?.body, text: c.text }))));
  const records = [...rows("questions.jsonl"), ...rows("research-derived-questions.jsonl"), ...[...rows("search-phrases.jsonl"), ...rows("search-console-exports.jsonl")].filter((x) => x.record_type === "search_phrase")];
  return { primaries: professions, secondaries: inputs.destinations, claims, records };
}

test("REAL · the batch's requested combinations: each exactly one of DEMAND / OPPORTUNITY / MERGED INTO <page> with its reason; 0 duplicate or thin pages; the three examples", { skip: SKIP }, () => {
  const x = real();
  const p = planPages(x);
  assert.equal(p.rows.length, p.candidates);
  assert.deepEqual(planFaults(p, { claims: x.claims }), [], "a duplicate or thin page is planned");
  for (const l of [LABEL.DEMAND, LABEL.OPPORTUNITY, LABEL.MERGED]) assert.ok(p.counts[l] > 0, `${l} has an empty population`);
  const nz = p.rows.find((r) => r.demand.some((d) => d.text === "oet for nurses in new zealand"));
  assert.ok(nz && nz.label === LABEL.DEMAND, "the top observed query's combination is not DEMAND");
  assert.ok(nz.demand.some((d) => d.source === "SEARCH_CONSOLE"), "the client's own Search Console query is not among its demand");
  const opp = p.rows.find((r) => r.label === LABEL.OPPORTUNITY);
  assert.ok(opp.demand.length === 0 && opp.answer.length > 0);
  const merged = p.rows.find((r) => r.label === LABEL.MERGED && /the same answer as/.test(r.reason));
  assert.ok(merged);
  console.log(`  REAL (count-only): candidates ${p.candidates} · DEMAND ${p.counts.DEMAND} · OPPORTUNITY ${p.counts.OPPORTUNITY} · MERGED ${p.counts.MERGED} (the same answer ${p.rows.filter((r) => r.label === LABEL.MERGED && /same answer/.test(r.reason)).length}, no own answer ${p.rows.filter((r) => r.label === LABEL.MERGED && !/same answer/.test(r.reason)).length}) · NOT MEASURED ${p.counts.NOT_MEASURED} · demand records ${p.observedRecords} · faults 0`);
  console.log(`  examples: ${nz.combination} → DEMAND · ${opp.combination} → OPPORTUNITY · ${merged.combination} → MERGED INTO ${merged.target}`);
});

test("ENTRY · bin/page-plan.mjs: counts by default; a bad call is a usage exit", { skip: SKIP }, () => {
  const go = (args) => spawnSync(process.execPath, ["bin/page-plan.mjs", "--subject=almi-oet", "--research-batch=rr254-test-pages-2026-10-12", ...args, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  const r = go(["--inputs=page-plan-inputs-2026-10-18.json"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /plan {13}DEMAND \d+ · OPPORTUNITY \d+ · MERGED \d+ · NOT MEASURED \d+/);
  assert.match(r.stdout, /duplicate\/thin {3}0 planned page/);
  assert.equal(go(["--inputs=x.json"]).status, 2);
});

test("the planner names no product and loads no module that can make a network, process, connector or paid call — and the control fires", () => {
  const F = "src/page/page-plan.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
