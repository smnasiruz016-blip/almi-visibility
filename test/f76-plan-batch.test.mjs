/**
 * F76 C2 · the batch is the approved plan and nothing else (beta-g decision A of RR-292). Fixtures with firing controls; REAL: the client's
 * own F91 plan built at once as local drafts, every planned URL 200, every unplanned URL 404, nothing written or published.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPlanBatch, servePlanned, plannedPages, planPath, approvedKeys, allSlugsOverPlan } from "../src/page/plan-batch.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const row = (primary, secondary, label, extra = {}) => ({ combination: `${primary} × ${secondary}`, primary, secondary, label, answer: [{ claimId: `${primary}-${secondary}`, text: `a fact of ${primary} in ${secondary}`, body: "a body" }], ...extra });
const plan = { measured: true, rows: [row("a", "x", "DEMAND"), row("a", "y", "OPPORTUNITY"), row("b", "x", "MERGED", { target: "a × x", reason: "the same answer as a × x" }), row("b", "y", "MERGED", { target: "https://site.example/b", reason: "no answer of its own" })] };

test("C2 · every planned page built at once, and no other; a MERGED combination is a section, never a page; no OPPORTUNITY label on a page", () => {
  const b = buildPlanBatch(plan);
  assert.deepEqual([...b.keys()].sort(), ["/a/x", "/a/y"]);
  assert.equal(b.get("/a/x").sections, 1, "the merged combination is not a section of its page");
  assert.ok(![...b.values()].some((p) => /OPPORTUNITY|DEMAND/.test(p.html)), "a plan label on a page");
  assert.deepEqual(plannedPages(plan).map((p) => p.path), ["/a/x", "/a/y"]);
});

test("C2 · a URL answers only from the built batch: planned 200, unplanned 404 — and asking never builds a page", () => {
  const b = buildPlanBatch(plan);
  const before = b.size;
  assert.equal(servePlanned("/a/x", b).status, 200);
  assert.equal(servePlanned("/a/x/?utm=1", b).status, 200);
  for (const p of [planPath(plan.rows[2]), "/b/y", "/zzz/qqq", "/"]) assert.equal(servePlanned(p, b).status, 404, p);
  assert.equal(b.size, before, "a request added a page");
  /* CENSUS: servePlanned holds no builder — it cannot generate a page on request */
  const src = readFileSync(join(REPO, "src/page/plan-batch.mjs"), "utf8");
  const body = src.slice(src.indexOf("export function servePlanned"), src.indexOf("\n}\n", src.indexOf("export function servePlanned")));
  assert.ok(!/buildPlanBatch|planPages|approvedPlan|\.set\(/.test(body), "servePlanned can build or add a page");
});

test("C2 · build-page --all-slugs reads the approved plan only: a chosen need is built only when the plan holds its page; no plan, none", () => {
  const keys = approvedKeys(plan);
  assert.ok(keys.has("a × x") && keys.has("a-x") && !keys.has("b-x"));
  const chosen = [{ slug: "a-x", spec: {} }, { slug: "b-x", spec: {} }, { slug: "c-z", spec: {} }];
  assert.deepEqual(allSlugsOverPlan({ requested: ["declared"], chosen, approved: keys }), { requested: ["declared", "a-x"], notInPlan: ["b-x", "c-z"] });
  /* FIRING CONTROL: no plan filed — no chosen need is added, every one named */
  assert.deepEqual(allSlugsOverPlan({ requested: ["declared"], chosen, approved: null }), { requested: ["declared"], notInPlan: ["a-x", "b-x", "c-z"] });
  /* the runner uses this rule, and nothing else, for --all-slugs */
  const runner = readFileSync(join(REPO, "bin/build-page.mjs"), "utf8");
  assert.match(runner, /allSlugsOverPlan\(\{ requested, chosen: chosen\.decisions, approved: approvedPages \}\)/);
  assert.ok(!/chosen\.decisions\.filter\(\(d\) => d\.spec && !requested\.includes\(d\.slug\)\)\.map/.test(runner), "the old every-chosen-need path survives");
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "page-plan-inputs-2026-10-18.json"));
test("REAL · C2 · the client's own F91 plan: every planned page built at once as a local draft, every planned URL 200, every unplanned URL 404, nothing written or published", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=plan-batch", "--subject=almi-oet", `--research-batch=${BATCH}`, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const m = /built\s+(\d+) of (\d+) planned page\(s\), at once, as local drafts .* written 0 · published 0/.exec(r.stdout);
  assert.ok(m && Number(m[2]) > 0 && m[1] === m[2], r.stdout);
  assert.match(r.stdout, new RegExp(`planned URLs\\s+${m[2]} of ${m[2]} answer 200`));
  const u = /unplanned\s+(\d+) of (\d+) URL\(s\) answer 404/.exec(r.stdout);
  assert.ok(u && u[1] === u[2] && Number(u[2]) > 0, r.stdout);
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).slice(1, 5).map((l) => l.trim()).join(" | ")}`);
});
