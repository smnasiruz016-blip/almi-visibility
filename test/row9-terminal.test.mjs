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
 *   (c) an unlock predicate becomes TRUE                → NOT_TERMINAL_UNLOCKED
 *
 * 🔴 (c) CHANGED AFTER PR #120. It read "becomes true, and the row is not re-sat", and a re-sit
 * DATE alone was accepted as the answer. A date is not evidence. See the three states below.
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
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { PASS_DIMENSIONS, dimensionCensus } from "../src/search/dimensions.mjs";
import { classify, assertLawful, assertTransitions } from "../src/checklist/classification.mjs";
import {
  JUSTIFIED_UNAVAILABLE,
  MEASUREMENT_PRODUCER,
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

/** Row 9 as the ledger holds it: six proven pulls and the ⚠ record the row actually claims. */
const asRowNine = (over = {}) => ({ mark: JUSTIFIED_UNAVAILABLE, ...over });

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
  assert.equal(row9Terminal(asRowNine({ records: sixPulls() })), "TERMINAL_WITH_JUSTIFIED_UNAVAILABLE");
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

test("🔴 RED (c): an analytics package in a product repo ends terminal status — no date restores it", () => {
  const unlockInputs = { ...UNSUPPLIABLE_MEASUREMENT, productReposWithAnalytics: 1 };
  assert.deepEqual(unlockState(unlockInputs).map((c) => c.id), ["analytics-package"]);
  assert.equal(row9Terminal(asRowNine({ records: sixPulls(), unlockInputs })), "NOT_TERMINAL_UNLOCKED");
});

test("🔴 RED (c): an analytics TAG in a product layout ends it just as a package does", () => {
  const unlockInputs = { ...UNSUPPLIABLE_MEASUREMENT, productReposLoadingAnalyticsTag: 1 };
  assert.equal(row9Terminal(asRowNine({ records: sixPulls(), unlockInputs })), "NOT_TERMINAL_UNLOCKED");
});

test("🔴 RED (c): the credential gaining an analytics scope unlocks it", () => {
  const unlockInputs = {
    ...UNSUPPLIABLE_MEASUREMENT,
    credentialScopes: [...UNSUPPLIABLE_MEASUREMENT.credentialScopes, "https://www.googleapis.com/auth/analytics.readonly"],
  };
  assert.deepEqual(unlockState(unlockInputs).map((c) => c.id), ["analytics-scope"]);
  assert.equal(row9Terminal(asRowNine({ records: sixPulls(), unlockInputs })), "NOT_TERMINAL_UNLOCKED");
});

test("🔴 RED (c): the funnel allow-list gaining a search-source key unlocks it", () => {
  const unlockInputs = { ...UNSUPPLIABLE_MEASUREMENT, funnelKeysCarryingSearchSource: 1 };
  assert.equal(row9Terminal(asRowNine({ records: sixPulls(), unlockInputs })), "NOT_TERMINAL_UNLOCKED");
});

test("🔴 RED (c): authorising a product-database read unlocks it", () => {
  const unlockInputs = { ...UNSUPPLIABLE_MEASUREMENT, productDatabaseReadAuthorised: true };
  assert.equal(row9Terminal(asRowNine({ records: sixPulls(), unlockInputs })), "NOT_TERMINAL_UNLOCKED");
});

/* ==================================================================
 * 🔴 THE THREE STATES — REPLACING THE DEFECTIVE "re-sit DATE" TEST.
 *
 * WHAT THE DELETED TEST ASSERTED: that an unlocked row became terminal again as soon as
 * `reSatOn` was on or after the unlock measurement's date. That was the defect, asserted as
 * if it were the law. It could only ever catch a re-sit dated BEFORE the unlock.
 *
 * WHAT THESE COVER THAT IT DID NOT:
 *   · a re-sit date is now NEVER sufficient — there is no date input left to pass;
 *   · terminal returns only on a NEWLY DATED all-FALSE measurement (route A);
 *   · the case the old test could not reach at all: `downstream outcomes` genuinely
 *     INGESTED (route B), where the justified-unavailable answer must never be returned
 *     and a ⚠ still claimed on it is itself a defect.
 * ================================================================== */

/** The dimension table as it would read once an outcome pull exists and is ingested. */
const SEVEN_WITH_OUTCOMES = PASS_DIMENSIONS.map((d) =>
  d.dimension === UNAVAILABLE_DIMENSION ? { dimension: d.dimension, pulls: ["outcomes"] } : d);

const UNLOCKED = { ...UNSUPPLIABLE_MEASUREMENT, measuredOn: "2026-10-01", productReposWithAnalytics: 1 };

test("🔴 STATE 1: unlock FALSE + six ingested + a lawful ⚠ → terminal", () => {
  assert.deepEqual(unlockState(UNSUPPLIABLE_MEASUREMENT), []);
  assert.equal(row9Terminal(asRowNine({ records: sixPulls() })), "TERMINAL_WITH_JUSTIFIED_UNAVAILABLE");
});

test("🔴 STATE 2: unlock TRUE + a later re-sit date + outcomes still ⚠ → NOT terminal", () => {
  assert.deepEqual(unlockState(UNLOCKED).map((c) => c.id), ["analytics-package"]);
  assert.equal(row9Terminal(asRowNine({ records: sixPulls(), unlockInputs: UNLOCKED })), "NOT_TERMINAL_UNLOCKED");
  // 🔴 A DATE BUYS NOTHING. Passing one — by any name — does not move the answer, because
  // there is no date input left for it to land in.
  assert.equal(row9Terminal(asRowNine({ records: sixPulls(), unlockInputs: UNLOCKED, reSatOn: "2026-10-02" })), "NOT_TERMINAL_UNLOCKED");
  assert.equal(row9Terminal(asRowNine({ records: sixPulls(), unlockInputs: UNLOCKED, reSatOn: "2099-01-01" })), "NOT_TERMINAL_UNLOCKED");
});

test("🔴 STATE 2, ROUTE A: only a NEWLY DATED all-FALSE measurement restores terminal", () => {
  const reMeasured = { ...UNSUPPLIABLE_MEASUREMENT, measuredOn: "2026-10-05", productReposWithAnalytics: 0 };
  assert.deepEqual(unlockState(reMeasured), []);
  assert.equal(row9Terminal(asRowNine({ records: sixPulls(), unlockInputs: reMeasured })), "TERMINAL_WITH_JUSTIFIED_UNAVAILABLE");
});

test("🔴 STATE 3: unlock TRUE + outcomes genuinely INGESTED + ⚠ removed → the ordinary seven, never justified-unavailable", () => {
  const records = [...sixPulls(), obs("outcomes", complete([{ outcome: "signup", query: "q", ...metricRow }]))];
  const census = dimensionCensus(records, SEVEN_WITH_OUTCOMES);
  assert.equal(census.dimensions.find((d) => d.dimension === UNAVAILABLE_DIMENSION).state, "INGESTED",
    "the state-3 world was not built — outcomes is not ingested, so this proves nothing");
  assert.equal(census.ingested, 7);

  const verdict = row9Terminal({ records, unlockInputs: UNLOCKED, mark: undefined, table: SEVEN_WITH_OUTCOMES });
  assert.equal(verdict, "TERMINAL_ALL_SEVEN_INGESTED");
  assert.notEqual(verdict, "TERMINAL_WITH_JUSTIFIED_UNAVAILABLE",
    "🔴 a measured dimension was reported as justified-unavailable");
});

test("🔴 STATE 3 RED: keeping the ⚠ on a dimension the store proves INGESTED is refused", () => {
  const records = [...sixPulls(), obs("outcomes", complete([{ outcome: "signup", query: "q", ...metricRow }]))];
  assert.equal(
    row9Terminal({ records, unlockInputs: UNLOCKED, mark: JUSTIFIED_UNAVAILABLE, table: SEVEN_WITH_OUTCOMES }),
    "NOT_TERMINAL_MARK_CLAIMED_ON_AN_INGESTED_DIMENSION",
  );
});

test("🔴 dropping the ⚠ while the dimension is STILL blocked does not tick the row either", () => {
  assert.equal(row9Terminal({ records: sixPulls(), mark: undefined }), "NOT_TERMINAL_MARK_INCOMPLETE");
  assert.equal(row9Terminal({ records: sixPulls(), mark: null }), "NOT_TERMINAL_MARK_INCOMPLETE");
});

/* 🔴 §4 — THE MEASUREMENT BOUNDARY, STATED HONESTLY AND CHECKED. */
test("🔴 UNSUPPLIABLE_MEASUREMENT is a DATED SNAPSHOT, not a live detector — and no source claims otherwise", () => {
  assert.equal(MEASUREMENT_PRODUCER, null, "a producer now exists — this test and the module's comment must be rewritten");
  const src = readFileSync(new URL("../src/search/row9-terminal.mjs", import.meta.url), "utf8");
  assert.match(src, /DATED SNAPSHOT, not a live detector/);
  assert.match(src, /IT WOULD NOT/, "the withdrawn claim is not recorded as withdrawn");
  for (const overclaim of [/will be detected automatically(?! )/i, /automatically detected/i, /will notice/i]) {
    assert.ok(!overclaim.test(src), `the source still claims live detection: ${overclaim}`);
  }
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
  assert.equal(row9Terminal(asRowNine({ records: [obs("query", complete([{ query: "q", ...metricRow }]))] })), "NOT_TERMINAL_BOUNDARY_UNPROVED");
});

test("🔴 RED: a truncated country pull leaves countries BUILT_NOT_RUN and the boundary unproved", () => {
  const records = sixPulls(complete([{ country: "gbr", ...metricRow }], { exhausted: false, dataState: "UNKNOWN" }));
  const v = boundaryVerification(records);
  assert.equal(v.satisfied, false);
  assert.equal(row9Terminal(asRowNine({ records })), "NOT_TERMINAL_BOUNDARY_UNPROVED");
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
    const c = row9Conditions(asRowNine({ records }));

    assert.equal(c.verification.ingested, 6);
    assert.equal(c.verification.blocked, 1);
    assert.equal(c.verification.missing, 0);
    assert.equal(c.verification.builtNotRun, 0);
    assert.equal(c.verification.ingested + c.verification.blocked, PASS_DIMENSIONS.length);

    assert.equal(c.c1_boundaryAuthorisesTheMark.held, true);
    assert.deepEqual(c.c2_everyOtherRequirementSatisfied.failures, []);
    assert.deepEqual(c.c3_stillVisiblyUnavailable.failures, []);
    assert.deepEqual(c.c4_noRequiredToolHasBecomeAvailable.unlocked, []);

    assert.equal(row9Terminal(asRowNine({ records })), "TERMINAL_WITH_JUSTIFIED_UNAVAILABLE");
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
