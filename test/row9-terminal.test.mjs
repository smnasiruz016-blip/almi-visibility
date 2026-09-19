/**
 * 🔴 ROW 9's GUARD — THREE STATES, AND THE THIRD STATE MUST FAIL.
 *
 * `row9Terminal` exists to let row 9 stand terminal with one dimension marked
 * `⚠`. A check that can only ever say "yes" would be worth nothing, and a
 * two-state check that cannot tell two different worlds apart is the defect
 * this project has now found thirteen times. So every guard below is proved in
 * the direction that FAILS, against a world built to break it:
 *
 *   (a) the `⚠` is dropped                           → NOT_TERMINAL_MARK_INCOMPLETE
 *   (b) the row is counted as all dimensions satisfied → overcountErrors fires
 *   (c) the unlock condition becomes true, not re-sat  → NOT_TERMINAL_UNLOCKED_AND_NOT_RE_SAT
 *
 * And condition 2 — the whole-boundary verification the 18 September ruling
 * waited for — is proved failable too, because a verification that cannot fail
 * did not verify anything.
 *
 * 🔴 ANTI-CIRCLE: none of this is row 9's evidence. Row 9's evidence is the six
 * dimensions ingested from the real property, asserted at the bottom of this
 * file against the committed store.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { PASS_DIMENSIONS } from "../src/search/dimensions.mjs";
import { classify, assertLawful, assertTransitions } from "../src/checklist/classification.mjs";
import {
  JUSTIFIED_UNAVAILABLE,
  UNAVAILABLE_DIMENSION,
  UNLOCK_CLAUSES,
  UNSUPPLIABLE_MEASUREMENT,
  boundaryVerification,
  justifiedUnavailableErrors,
  overcountErrors,
  row9Conditions,
  row9Terminal,
  unlockState,
} from "../src/search/row9-terminal.mjs";

const STORE = join(process.cwd(), "runs", "evidence", "evidence.jsonl");

const obs = (pull, value, at = "2026-09-12T00:00:00.000Z") => ({
  record_type: "observation", method: `gsc.searchAnalytics.query:${pull}`, observed_at: at, value,
});
const complete = (rows, extra = {}) => ({
  startDate: "a", endDate: "b", rowCount: rows.length, requestCount: 1, exhausted: true, dataState: "COMPLETE",
  rowLimitPerRequest: 25000, maxRequests: 20, rows, ...extra,
});
const metricRow = { clicks: 1, impressions: 2, ctr: 0.5, position: 3 };

/** The six buildable pulls, all proven — the world in which row 9 may stand terminal. */
function sixPulls(countryValue = complete([{ country: "gbr", ...metricRow }])) {
  return [
    obs("page-rows", { ...complete([{ url: "u", clicks: 1, impressions: 2 }]), exhausted: undefined, requestCount: undefined }),
    obs("query", complete([{ query: "q", ...metricRow }])),
    obs("query-page", complete([{ query: "q", url: "u", ...metricRow }])),
    obs("country", countryValue),
  ];
}

/* ==================================================================
 * THE BASELINE — the guard says YES, so that every RED below means something.
 * ================================================================== */

test("with the six proven and nothing unlocked, row 9 stands terminal with its ⚠", () => {
  assert.equal(row9Terminal({ records: sixPulls() }), "TERMINAL_WITH_JUSTIFIED_UNAVAILABLE");
});

/* ==================================================================
 * STATE (a) — THE ⚠ IS DROPPED.
 * ================================================================== */

test("🔴 RED (a): a ⚠ that names no dimension is refused", () => {
  const errs = justifiedUnavailableErrors({ ...JUSTIFIED_UNAVAILABLE, dimension: "" });
  assert.ok(errs.some((e) => /no dimension named/.test(e)), `expected a dimension complaint, got ${JSON.stringify(errs)}`);
});

test("🔴 RED (a): a ⚠ with NO unlock condition is refused — this is the whole point of the ruling", () => {
  assert.deepEqual(justifiedUnavailableErrors({ ...JUSTIFIED_UNAVAILABLE, unlockClauses: [] }), ["no unlock condition on the record"]);
});

test("🔴 RED (a): an unlock clause that states no condition is refused", () => {
  const errs = justifiedUnavailableErrors({ ...JUSTIFIED_UNAVAILABLE, unlockClauses: [{ id: "x", becomesTrueWhen: "" }] });
  assert.ok(errs.some((e) => /states no condition that could become true/.test(e)), JSON.stringify(errs));
});

test("🔴 RED (a): a ⚠ with NO date measured unsuppliable is refused", () => {
  const errs = justifiedUnavailableErrors({ ...JUSTIFIED_UNAVAILABLE, measuredUnsuppliableOn: undefined });
  assert.deepEqual(errs, ["no date on which it was measured unsuppliable"]);
});

test("🔴 RED (a): a ⚠ on a dimension row 9 does not have is refused", () => {
  const errs = justifiedUnavailableErrors({ ...JUSTIFIED_UNAVAILABLE, dimension: "bounce rate" });
  assert.ok(errs.some((e) => /not one of row 9's seven dimensions/.test(e)), JSON.stringify(errs));
});

test("🔴 RED (a): an absent ⚠ record is refused, not silently treated as clean", () => {
  assert.deepEqual(justifiedUnavailableErrors(null), ["the ⚠ record is absent"]);
  assert.deepEqual(justifiedUnavailableErrors(undefined).length > 0, true);
});

/* ==================================================================
 * STATE (b) — THE ROW IS COUNTED AS ALL DIMENSIONS SATISFIED.
 * ================================================================== */

test("🔴 RED (b): counting seven of seven satisfied is refused — outcomes was never measured", () => {
  const errs = overcountErrors({ dimensionsSatisfied: 7 });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /counts 7 of 7/);
  assert.match(errs[0], /downstream outcomes/);
});

test("🔴 RED (b): six of seven is the truthful count and passes", () => {
  assert.deepEqual(overcountErrors({ dimensionsSatisfied: 6 }), []);
});

test("🔴 RED (b): the mark declares it is never to be represented as measured", () => {
  assert.equal(JUSTIFIED_UNAVAILABLE.neverRepresentedAsMeasured, true);
  assert.equal(JUSTIFIED_UNAVAILABLE.mark, "⚠");
  assert.notEqual(JUSTIFIED_UNAVAILABLE.mark, "⏭", "⚠ was converted into ⏭ — the 18 September ruling forbids exactly this");
});

/* ==================================================================
 * STATE (c) — A TOOL BECAME AVAILABLE AND THE ROW WAS NOT SAT AGAIN.
 * ================================================================== */

test("🔴 RED (c): an analytics package appears in a product repo — the row is NOT terminal until re-sat", () => {
  const unlockInputs = { ...UNSUPPLIABLE_MEASUREMENT, productReposWithAnalytics: 1 };
  assert.deepEqual(unlockState(unlockInputs).map((c) => c.id), ["analytics-package"]);
  assert.equal(row9Terminal({ records: sixPulls(), unlockInputs }), "NOT_TERMINAL_UNLOCKED_AND_NOT_RE_SAT");
});

test("🔴 RED (c): an analytics TAG in a product layout unlocks it just as a package does", () => {
  const unlockInputs = { ...UNSUPPLIABLE_MEASUREMENT, productReposLoadingAnalyticsTag: 1 };
  assert.equal(row9Terminal({ records: sixPulls(), unlockInputs }), "NOT_TERMINAL_UNLOCKED_AND_NOT_RE_SAT");
});

test("🔴 RED (c): the credential gaining an analytics scope unlocks it", () => {
  const unlockInputs = {
    ...UNSUPPLIABLE_MEASUREMENT,
    credentialScopes: [...UNSUPPLIABLE_MEASUREMENT.credentialScopes, "https://www.googleapis.com/auth/analytics.readonly"],
  };
  assert.deepEqual(unlockState(unlockInputs).map((c) => c.id), ["analytics-scope"]);
  assert.equal(row9Terminal({ records: sixPulls(), unlockInputs }), "NOT_TERMINAL_UNLOCKED_AND_NOT_RE_SAT");
});

test("🔴 RED (c): the funnel allow-list gaining a search-source key unlocks it", () => {
  const unlockInputs = { ...UNSUPPLIABLE_MEASUREMENT, funnelKeysCarryingSearchSource: 1 };
  assert.equal(row9Terminal({ records: sixPulls(), unlockInputs }), "NOT_TERMINAL_UNLOCKED_AND_NOT_RE_SAT");
});

test("🔴 RED (c): authorising a product-database read unlocks it", () => {
  const unlockInputs = { ...UNSUPPLIABLE_MEASUREMENT, productDatabaseReadAuthorised: true };
  assert.equal(row9Terminal({ records: sixPulls(), unlockInputs }), "NOT_TERMINAL_UNLOCKED_AND_NOT_RE_SAT");
});

test("🔴 (c) THE THIRD STATE: unlocked AND re-sat afterwards is terminal again — the guard is not a one-way door", () => {
  const unlockInputs = { ...UNSUPPLIABLE_MEASUREMENT, measuredOn: "2026-10-01", productReposWithAnalytics: 1 };
  assert.equal(row9Terminal({ records: sixPulls(), unlockInputs, reSatOn: "2026-09-30" }), "NOT_TERMINAL_UNLOCKED_AND_NOT_RE_SAT",
    "a re-sit BEFORE the unlock does not answer it");
  assert.equal(row9Terminal({ records: sixPulls(), unlockInputs, reSatOn: "2026-10-02" }), "TERMINAL_WITH_JUSTIFIED_UNAVAILABLE");
});

test("🔴 every unlock clause is individually capable of firing — none is decorative", () => {
  const worlds = {
    "analytics-scope": { credentialScopes: ["https://www.googleapis.com/auth/analytics.readonly"] },
    "analytics-package": { productReposWithAnalytics: 1 },
    "search-source-key": { funnelKeysCarryingSearchSource: 1 },
    "product-db-read": { productDatabaseReadAuthorised: true },
  };
  for (const c of UNLOCK_CLAUSES) {
    assert.ok(worlds[c.id], `unlock clause ${c.id} has no world that fires it — add one or delete the clause`);
    assert.deepEqual(unlockState({ ...UNSUPPLIABLE_MEASUREMENT, ...worlds[c.id] }).map((x) => x.id), [c.id]);
  }
});

/* ==================================================================
 * CONDITION 2 — THE WHOLE-BOUNDARY VERIFICATION, PROVED FAILABLE.
 * ================================================================== */

test("🔴 RED: a pull claiming dataState COMPLETE without its bounds fails the FAILURE clause's second limb", () => {
  const records = [...sixPulls(), obs("by-page", complete([{ url: "u", ...metricRow }], { maxRequests: undefined }))];
  const v = boundaryVerification(records);
  assert.equal(v.satisfied, false);
  assert.ok(v.failures.some((f) => /by-page claims dataState COMPLETE without maxRequests/.test(f)), JSON.stringify(v.failures));
});

test("🔴 RED: a missing dimension fails the FAILURE clause's first limb", () => {
  const v = boundaryVerification([obs("query", complete([{ query: "q", ...metricRow }]))]);
  assert.equal(v.satisfied, false);
  assert.ok(v.failures.some((f) => /"pages" is/.test(f)), JSON.stringify(v.failures));
  assert.equal(row9Terminal({ records: [obs("query", complete([{ query: "q", ...metricRow }]))] }), "NOT_TERMINAL_BOUNDARY_UNPROVED");
});

test("🔴 RED: a truncated country pull leaves countries BUILT_NOT_RUN and the boundary unproved", () => {
  const records = sixPulls(complete([{ country: "gbr", ...metricRow }], { exhausted: false, dataState: "UNKNOWN" }));
  const v = boundaryVerification(records);
  assert.equal(v.satisfied, false);
  assert.equal(row9Terminal({ records }), "NOT_TERMINAL_BOUNDARY_UNPROVED");
});

test("a pull that CLAIMS NOTHING is reported, never counted against the row and never dropped", () => {
  const records = [...sixPulls(), obs("control", { dataState: "UNKNOWN", requestCount: 1 })];
  const v = boundaryVerification(records);
  assert.equal(v.satisfied, true, "an honest UNKNOWN pull broke the boundary — it claims no completeness");
  assert.deepEqual(v.claimsNothing.map((p) => p.pull), ["control"]);
});

/* ==================================================================
 * 🔴 ROW 9's ACTUAL EVIDENCE — the committed store, not a fixture.
 * ================================================================== */

test("🔴 REAL: the committed store proves six of seven, outcomes ⚠, and row 9 stands terminal",
  { skip: !existsSync(STORE) }, () => {
    const records = createJsonlStore(STORE).readAll();
    const c = row9Conditions({ records });

    assert.equal(c.verification.ingested, 6);
    assert.equal(c.verification.blocked, 1);
    assert.equal(c.verification.missing, 0);
    assert.equal(c.verification.builtNotRun, 0);
    assert.equal(c.verification.ingested + c.verification.blocked, PASS_DIMENSIONS.length);

    assert.equal(c.c1_boundaryAuthorisesTheMark.held, true);
    assert.deepEqual(c.c2_everyOtherRequirementSatisfied.failures, []);
    assert.deepEqual(c.c3_stillVisiblyUnavailable.failures, []);
    assert.deepEqual(c.c4_noRequiredToolHasBecomeAvailable.unlocked, []);

    assert.equal(row9Terminal({ records }), "TERMINAL_WITH_JUSTIFIED_UNAVAILABLE");
    assert.equal(
      c.verification.dimensions.find((d) => d.dimension === UNAVAILABLE_DIMENSION).state,
      "BLOCKED",
      "🔴 the store was read as supplying downstream outcomes — it supplies nothing after the click",
    );
  });

/* ==================================================================
 * 🔴 THE LEDGER GUARD — the obligation follows the ⚠, not the label.
 *
 * Row 9 left BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE on 19 September. The
 * clause that forced that label to keep its missing evidence, blocker and
 * unlock condition no longer applies to it. If nothing replaced that clause,
 * the tick would have silently retired the obligation — which is precisely the
 * failure condition 3 of the 18 September ruling exists to prevent.
 * ================================================================== */

test("🔴 RED: a row claiming a justified unavailable dimension with NO unlock condition is refused", () => {
  const rows = classify();
  rows[9] = { ...rows[9], unlockCondition: "" };
  const errors = assertLawful(rows);
  assert.ok(errors.some((e) => /item 9 .* with no unlockCondition/.test(e)), JSON.stringify(errors));
});

test("🔴 RED: a row that ticks while dropping its blocker or missing evidence is refused", () => {
  for (const field of ["missingEvidence", "blocker"]) {
    const rows = classify();
    rows[9] = { ...rows[9], [field]: "" };
    assert.ok(assertLawful(rows).some((e) => new RegExp(`item 9 .* with no ${field}`).test(e)), `dropping ${field} was allowed`);
  }
});

test("🔴 RED: a row whose ⚠ record loses its measured date is refused by the ledger, not just by the module", () => {
  const rows = classify();
  rows[9] = { ...rows[9], justifiedUnavailable: { ...rows[9].justifiedUnavailable, measuredUnsuppliableOn: undefined } };
  assert.ok(assertLawful(rows).some((e) => /no date on which it was measured unsuppliable/.test(e)), "a dateless ⚠ ticked");
});

test("🔴 RED: a row whose ⚠ record loses its unlock clauses is refused by the ledger", () => {
  const rows = classify();
  rows[9] = { ...rows[9], justifiedUnavailable: { ...rows[9].justifiedUnavailable, unlockClauses: [] } };
  assert.ok(assertLawful(rows).some((e) => /no unlock condition on the record/.test(e)), "a ⚠ with no unlock condition ticked");
});

test("CONTROL: the real ledger is lawful, and row 9 carries its ⚠ while reading VERIFIED-PASS", () => {
  const rows = classify();
  assert.deepEqual(assertLawful(rows), []);
  assert.deepEqual(assertTransitions(rows), []);
  assert.equal(rows[9].state, "VERIFIED-PASS");
  assert.equal(rows[9].justifiedUnavailable.dimension, UNAVAILABLE_DIMENSION);
  assert.equal(rows[9].justifiedUnavailable.mark, "⚠");
  assert.ok(rows[9].unlockCondition.length > 20, "the unlock condition survived the tick");
});

test("🔴 REAL: the measurement behind the ⚠ carries its own date and denominator",
  { skip: !existsSync(STORE) }, () => {
    assert.match(UNSUPPLIABLE_MEASUREMENT.measuredOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(UNSUPPLIABLE_MEASUREMENT.productReposWithAnalytics, 0);
    assert.equal(UNSUPPLIABLE_MEASUREMENT.productReposLoadingAnalyticsTag, 0);
    assert.ok(UNSUPPLIABLE_MEASUREMENT.productRepositories > 0, "a 0-of-0 count is a vacuous zero");
    assert.equal(UNSUPPLIABLE_MEASUREMENT.funnelKeysCarryingSearchSource, 0);
    assert.ok(UNSUPPLIABLE_MEASUREMENT.funnelEventAllowListKeys.length > 0, "an empty allow-list proves nothing");
    assert.equal(UNSUPPLIABLE_MEASUREMENT.credentialScopes.every((s) => /readonly/.test(s)), true);
  });
