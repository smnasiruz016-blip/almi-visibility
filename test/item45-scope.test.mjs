/**
 * ITEM 45 — THE SCOPE RULING, THE PERMANENT LOSS, AND ONE REAL RUN.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { makeCostEntry, item45Verdict, createCostLedger, LEDGER_EXISTS_FROM, runStartedAt, coverageFailures } from "../src/cost/ledger.mjs";
import { classify } from "../src/checklist/classification.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const REGISTER = readFileSync(`${REPO}PHASE_0_FROZEN_GAP_REGISTER.md`, "utf8");

const entry = (over = {}) => makeCostEntry({
  entry_id: "run:2026-09-13T00:00:00.000Z", run_kind: "k", run_ref: "r", run_started_at: "2026-09-13T00:00:00.000Z", recorded_at: "t",
  money: { amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis: "free tariff, stated by the provider" },
  providerCalls: { state: "MEASURED", total: 3 },
  budget: { kind: "crawl", used: { urlsFetched: 0 }, zeroBasis: "this operation crawls nothing at all", bounds: { maxUrlsPerRun: 500 }, capReached: false },
  founderTime: { state: "MEASURED", seconds: 1.2 },
  ...over,
});

/* ---- 🔴 A LEGITIMATE ZERO IS TRACKED. AN ABSENT FIELD IS NOT. ------------ */

test("🔴 an all-zero budget with no zeroBasis is REFUSED — it reads as nothing recorded", () => {
  assert.throws(() => entry({ budget: { kind: "crawl", used: { urlsFetched: 0 }, bounds: { maxUrlsPerRun: 500 }, capReached: false } }), /all zero with no zeroBasis/);
});

test("🔴 a budget that omits what was used is REFUSED, and a blank count is not a zero", () => {
  assert.throws(() => entry({ budget: { kind: "crawl", bounds: { maxUrlsPerRun: 500 }, capReached: false } }), /budget\.used is required/);
  assert.throws(() => entry({ budget: { kind: "crawl", used: { urlsFetched: null }, zeroBasis: "nothing crawled here", bounds: { maxUrlsPerRun: 500 }, capReached: false } }), /is not a number/);
});

test("🔴 zero calls or zero seconds without a basis are REFUSED", () => {
  assert.throws(() => entry({ providerCalls: { state: "MEASURED", total: 0 } }), /providerCalls is 0 with no zeroBasis/);
  assert.throws(() => entry({ founderTime: { state: "MEASURED", seconds: 0 } }), /founderTime is 0 with no zeroBasis/);
});

test("CONTROL: a zero WITH its basis is accepted", () => {
  assert.equal(entry().budget.used.urlsFetched, 0);
});

/* ---- the scope verdict ---------------------------------------------------- */

test("the scope start is the ledger's own birth, measured: commit 8c9d68b at 2026-09-12T23:03:09Z", () => {
  assert.equal(LEDGER_EXISTS_FROM, "2026-09-12T23:03:09Z");
});

test("🔴 NOT_RUN when nothing is in scope — a scope with nothing in it proves nothing", () => {
  const old = entry({ entry_id: "old:2026-09-12T00:00:00.000Z", run_started_at: "2026-09-12T00:00:00.000Z" });
  assert.equal(item45Verdict([old]).verdict, "NOT_RUN");
});

test("🔴 FAILED when an IN-SCOPE run has a measurable UNKNOWN", () => {
  const bad = entry({ founderTime: { state: "UNKNOWN", seconds: null, unknownKind: "MEASURABLE_BUT_NOT_RECORDED", unknownReason: "the run recorded no start" } });
  assert.equal(item45Verdict([bad]).verdict, "FAILED");
});

test("🔴 an out-of-scope loss does not fail the verdict — and is still reported, never dropped", () => {
  const lost = entry({ entry_id: "old:2026-09-12T00:00:00.000Z", run_started_at: "2026-09-12T00:00:00.000Z", founderTime: { state: "UNKNOWN", seconds: null, unknownKind: "MEASURABLE_BUT_NOT_RECORDED", unknownReason: "the run recorded no start" } });
  const v = item45Verdict([lost, entry()]);
  assert.equal(v.verdict, "PASS");
  assert.equal(v.lostBeforeScope.length, 1);
});

test("🔴 an entry whose run start cannot be read fails — scope cannot be decided for it", () => {
  const e = { ...entry(), entry_id: "no-date", run_started_at: undefined, founderTime: { state: "MEASURED", seconds: 1 } };
  assert.equal(runStartedAt(e), null);
  assert.equal(item45Verdict([e]).verdict, "FAILED");
});

/* ---- REAL ----------------------------------------------------------------- */

test("🔴 REAL: the ledger holds one IN-SCOPE real run with all four recorded, every zero with its basis — item 45 PASSES", () => {
  const entries = createCostLedger(`${REPO}runs/cost/ledger.jsonl`).readAll();
  const v = item45Verdict(entries);
  assert.equal(v.verdict, "PASS");
  assert.ok(v.inScope.length >= 1, "no real run inside the scope");
  const run = v.inScope.find((e) => e.run_kind === "gsc-ingest");
  assert.ok(run, "the in-scope run is not a Search Console run");
  assert.equal(run.money.amountState, "ZERO_BY_TARIFF");
  assert.match(run.money.basis, /free/i);
  assert.equal(run.providerCalls.state, "MEASURED");
  assert.ok(run.providerCalls.total > 0);
  assert.equal(run.budget.kind, "crawl");
  assert.deepEqual(run.budget.used, { urlsFetched: 0, requestsIssued: 0 });
  assert.match(run.budget.zeroBasis, /crawls nothing/);
  assert.equal(run.founderTime.state, "MEASURED");
  assert.ok(run.founderTime.seconds > 0);
  assert.ok(run.run_started_at >= LEDGER_EXISTS_FROM);
  assert.deepEqual(coverageFailures(v.inScope), []);
});

test("🔴 REAL: the nine runs before the ledger existed are OUT of scope, with their 12 lost costs still named", () => {
  const v = item45Verdict(createCostLedger(`${REPO}runs/cost/ledger.jsonl`).readAll());
  assert.equal(v.outOfScope.length, 9);
  assert.equal(v.lostBeforeScope.length, 12);
});

test("🔴 the ruling is recorded WITH its goalpost reasoning, so a later reader can judge it", () => {
  assert.match(REGISTER, /TECHNICAL-OWNER RULING — ITEM 45's SCOPE BEGINS WHEN THE LEDGER EXISTED/);
  // The sentence wraps inside a markdown quote, so the line break carries a "> ".
  assert.match(REGISTER, /A COMPONENT CANNOT BE FAILED FOR A PERIOD BEFORE[\s>]+IT EXISTED/);
  assert.match(REGISTER, /The bar is unchanged/);
  assert.match(REGISTER, /whether a post was moved or drawn/);
});

/**
 * 🔴 THE LOSS OUTLIVES THE TICK. While item 45 is VERIFIED-PASS this test
 * requires the permanent-loss row to exist, unchanged in substance — so ticking
 * the row can never quietly tidy the loss away.
 */
test("🔴 PERMANENT: the L-COST-1 row exists, says IRRECOVERABLE and not estimated — and must survive item 45's tick", () => {
  const row = REGISTER.split("\n").find((l) => l.startsWith("| **L-COST-1** |"));
  assert.ok(row, "the permanent-loss row is gone");
  assert.match(row, /eight Search Console ingest runs/);
  assert.match(row, /12 measurable costs never recorded/);
  assert.match(row, /IRRECOVERABLE/);
  assert.match(row, /Not estimated/);
  assert.match(row, /Not closed by item 45's tick/);
  assert.match(row, /the cost ledger did not exist/);
  assert.equal(classify()[45].state, "VERIFIED-PASS");
});
