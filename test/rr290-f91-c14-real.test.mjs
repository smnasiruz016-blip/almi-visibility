/**
 * F91 C14 and C19 (Acceptance Amendment 7) · REAL, on the declared batch (RR-290 T2). C14: every need of the batch carries its coverage
 * record, decided by F33 C8's own function over the 14 pages C20 lets stand and the recorded per-question coverage judgements (a METHOD — the
 * recorded build's need ids — or an AGENT, never an approval). C19: F35 decides every need from those records, and the spec compiler compiles
 * exactly the needs F35's decision admits. Count-only; nothing fetched or written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { compileNeedSpec, purposeOf } from "../src/page/spec-compiler.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { readC20Keep } from "../src/page/c20-keep.mjs";
import { createTenantResolver, rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const RESEARCH = lookupStore(rootIndexFor(process.env), "RESEARCH");
const BATCH = join(RESEARCH.dir, "rr254-test-pages-2026-10-12");
const JUDGED = join(BATCH, "page-coverage-judgements-2026-10-19.json");
const HERE = existsSync(JUDGED);
const rows = () => readFileSync(join(BATCH, "planning.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const tally = (xs, f) => xs.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});

test("REAL · C14 · the 331 recorded judgements are all usable, and every one of the 182 needs carries its coverage record over the 14 standing pages: FULL 179 · NONE 3", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const j = coverageJudgementRecords(JSON.parse(readFileSync(JUDGED, "utf8")), { on: "2026-10-19" });
  assert.deepEqual([j.records.length, j.refused.length], [331, 0]);
  assert.deepEqual(tally(j.records, (r) => r.value.source.kind), { METHOD: 289, AGENT: 42 });
  const stored = rows();
  const needs = new Set(stored.filter((r) => r.record_type === "planning_demand" && r.needId).map((r) => r.needId));
  const latest = new Map(stored.filter((r) => r.record_type === "planning_coverage").map((r) => [r.needId, r]));
  assert.equal(needs.size, 182);
  assert.deepEqual([...needs].filter((n) => !latest.has(n)), [], "a need has no coverage record");
  const mine = [...needs].map((n) => latest.get(n));
  assert.deepEqual(tally(mine, (r) => r.coverage), { FULL: 179, NONE: 3 });
  assert.ok(mine.every((r) => r.considered === 14 && r.coverageState === "COMPLETE"), "a record was decided over another population");
  console.log("  REAL (count-only): judgements 331 (METHOD 289, AGENT 42) · needs 182 · FULL 179 · NONE 3 · each over 14 standing pages");
});

test("REAL · C19 · F35 decides every need from its coverage record (KEEP 179 · HOLD 3, answer unsupported), and the compiler compiles exactly what F35 admits — 0 today", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const T = "tenant:93b991d5afa33b16ccb9166b249593b6";
  const { population } = readExistingPagePopulation({ scope: { tenantId: T }, resolve: createTenantResolver(), keep: readC20Keep(BATCH).keep });
  assert.equal(population.pages.length, 14);
  const planningRows = rows();
  const G = decideGroupedNeeds({ tenantId: T, product: { variants: [], pageSpecs: {} }, population, planningRows });
  const cls = tally(G.groupedNeeds, (d) => (d.decision === "CHOSEN" ? (d.actions ?? []).map((a) => a.action).join("+") : d.class));
  assert.deepEqual(cls, { KEEP: 179, HOLD: 3 });
  assert.ok(G.groupedNeeds.filter((d) => d.decision !== "CHOSEN").every((d) => /central answer is unsupported/.test((d.missing ?? []).join(" "))), "a HOLD for another reason");
  const admitted = G.groupedNeeds.filter((d) => purposeOf(d));
  const compiled = G.groupedNeeds.map((d) => compileNeedSpec({ decision: d, rows: planningRows }).spec).filter(Boolean);
  assert.equal(compiled.length, admitted.length, "the compiler compiled a need F35 did not admit, or skipped one it did");
  assert.equal(G.compiled.forConstruction.length + G.compiled.sectionProposals.length + G.compiled.forJudgement, 0);
  console.log(`  REAL (count-only): F35 KEEP 179 · HOLD 3 (central answer unsupported) · admitted for compilation ${admitted.length} · compiled ${compiled.length}`);
});
