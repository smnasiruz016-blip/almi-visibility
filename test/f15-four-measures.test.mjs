/**
 * F15 · Supply / visibility / demand / need separation (acceptance _handoffs AlmiVisibility_F15_ACCEPTANCE_2026-10-19.md; RR-291, light proof).
 * C1–C2 on fixtures with firing controls; C1–C3 REAL on the declared batch through bin/visibility-parts.mjs (count-only).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { needMeasure, supplyMeasure, visibilityMeasure, demandMeasure, demandState, demandEvidenceOf, DEMAND_STATE } from "../src/research/four-measures.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = readFileSync(join(REPO, "src/research/four-measures.mjs"), "utf8");

test("C1 · four functions, each over its own records with its own denominator; none reads another's result", () => {
  const cov = [{ needId: "n1", coverage: "FULL", pages: [{ pageId: "https://s.example/a" }] }, { needId: "n2", coverage: "NONE", pages: [] }];
  const ids = ["n1", "n2"];
  assert.deepEqual(needMeasure([{ needId: "n1", answer: { state: "SUPPORTED" } }, { needId: "n2" }]).counts, { SUPPORTED: 1, NO_ANSWER_RECORD: 1 });
  assert.deepEqual(supplyMeasure(ids, cov).counts, { FULL: 1, NONE: 1 });
  assert.deepEqual(visibilityMeasure(ids, cov, { window: {}, pages: { urls: [{ url: "https://s.example/a", impressions: 4 }] } }).counts, { SHOWN: 1, "NOT MEASURED": 1 });
  /* FIRING CONTROL: no export → every need's visibility NOT MEASURED, never 0 */
  assert.deepEqual(visibilityMeasure(ids, cov, null).counts, { "NOT MEASURED": 2 });
  /* no function body calls another measure (a census over the module's own text) */
  for (const fn of ["needMeasure", "supplyMeasure", "visibilityMeasure", "demandMeasure"]) {
    const body = SRC.slice(SRC.indexOf(`export function ${fn}`), SRC.indexOf("\n}\n", SRC.indexOf(`export function ${fn}`)));
    for (const other of ["needMeasure(", "supplyMeasure(", "visibilityMeasure(", "demandMeasure("].filter((o) => !o.startsWith(fn))) assert.ok(!body.includes(other), `${fn} reads ${other}`);
  }
});

test("C2 · demand STRONG only on 3 independent categories agreeing; MONITOR on conflict; UNKNOWN on fewer than 3", () => {
  const f = (c) => ({ needId: "n", category: c, polarity: "FOR" });
  assert.equal(demandState([f("A"), f("B"), f("C")]), DEMAND_STATE.STRONG);
  /* FIRING CONTROLS */
  assert.equal(demandState([f("A"), f("A"), f("B")]), DEMAND_STATE.UNKNOWN, "one category counted twice");
  assert.equal(demandState([f("A"), f("B")]), DEMAND_STATE.UNKNOWN);
  assert.equal(demandState([f("A"), f("B"), f("C"), { needId: "n", category: "D", polarity: "AGAINST" }]), DEMAND_STATE.MONITOR);
  assert.equal(demandState([]), DEMAND_STATE.UNKNOWN);
  /* a research-derived wording is never evidence */
  assert.deepEqual(demandEvidenceOf({ demandRows: [{ needId: "n", tier: "RESEARCH-DERIVED" }], coverageRows: [], joins: [] }), []);
  assert.deepEqual(demandMeasure(["n"], [f("A"), f("B"), f("C")]).counts, { STRONG: 1 });
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "planning.jsonl"));
test("REAL · C3 · the declared batch prints the four measures apart, each over the same 182 needs, none blended", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=four-measures", "--subject=almi-oet", `--research-batch=${BATCH}`, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  for (const m of ["NEED", "SUPPLY", "VISIBILITY", "DEMAND"]) assert.match(r.stdout, new RegExp(`\\n  ${m}\\s+over 182 need\\(s\\)`), m);
  assert.ok(!/score|total of the four|blended/i.test(r.stdout), "a blended line");
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).slice(1, 5).map((l) => l.trim()).join(" | ")}`);
});
