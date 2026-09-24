/**
 * 🔴 ROW 7 — MARKET MEASUREMENT · THE OWNED HALF. GREEN on the stored measurement; each limb RED, ALONE.
 *
 * The frozen contract: INPUT the owned rows — impressions, clicks, CTR, position, by query, page and country — with
 * their date range and dataState · EXPECTED DEMAND and VISIBILITY/REACH measured and reported SEPARATELY, each naming
 * its own method and date range, each carrying query truncation, data lag and dataState on its face; the other three
 * UNKNOWN · FAILURE conflated; OR impressions reported as demand; OR a deferred dimension rendered as measured,
 * indistinguishable from a measured value, or defaulted to low · EVIDENCE two distinct methods, range and dataState
 * quoted from the stored observation, and a test that goes RED when a third dimension is filled from an unmeasured source.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { measureMarket, marketErrors, DEFERRED } from "../src/discovery/market-measurement.mjs";
import { LEGACY_MARKET_MEASUREMENT, marketMeasurementCompat } from "../src/evidence/legacy-artefacts.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const STORE = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const STORED_TEXT = readFileSync(join(REPO, "runs", "discovery", "market-measurement-2026-09-15.json"), "utf8").replace(/\r\n/g, "\n");
const STORED = JSON.parse(STORED_TEXT);
/* The measurement the code produces now. Each RED limb below damages THIS, not the 15 September bytes: a damaged
 * copy of the pinned artefact is no longer the pinned artefact, and is judged as a current result. */
const FRESH = measureMarket(STORE);
/* 🔴 F06 CORRECTION (24 September 2026) — the ONLY difference the fix may make, declared path by path. */
const SUPERSESSION_DELTA = Object.freeze(DEFERRED.map((k) => Object.freeze({ path: ["dimensions", k, "state"], from: "UNKNOWN", to: "NOT_MEASURED" })));
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const say = (errs) => errs.slice(0, 4).map((e) => `[${e.limb}] ${e.why}`).join("\n");
const clone = (x) => JSON.parse(JSON.stringify(x));
const errorsOf = (result) => marketErrors({ result, storeRecords: STORE });

test("🟢 MEASURED — five cuts and the property total, re-derived from the rows: 3,289 by page, 2,374 by property and country, 541 by query, 807 by query×page", () => {
  const t = STORED.totals;
  const row = (x) => [x.observation_id, x.rows, x.impressions, x.clicks];
  assert.deepEqual(row(t.property), ["8c5f987dc5074cd5", 1, 2374, 20]);
  assert.deepEqual(row(t.country), ["59535dbde94fbacd", 126, 2374, 20]);
  assert.deepEqual(row(t.page), ["9f8cbf772d1cd434", 1525, 3289, 21]);
  assert.deepEqual(row(t.query), ["45ce21253a3fc58c", 337, 541, 0]);
  assert.deepEqual(row(t.countryQuery), ["9bf50cfb134a0d7d", 388, 541, 0]);
  assert.deepEqual(row(t.queryPage), ["c97334fdd102df8e", 574, 807, 0]);
  for (const o of Object.values(STORED.input)) {
    assert.deepEqual([o.startDate, o.endDate, o.dataState], ["2026-08-15", "2026-09-12", "COMPLETE"], o.observation_id);
  }
  // the page-rows pull stores neither field — said, never filled in
  assert.deepEqual([STORED.input.pageRows.exhausted, STORED.input.pageRows.truncationReason], ["NOT STORED", "NOT STORED"]);
  for (const k of ["aggregate", "country", "query", "queryPage", "countryQuery"]) assert.deepEqual([STORED.input[k].exhausted, STORED.input[k].truncationReason], [true, null], k);
});

test("🔴 THE STORED MEASUREMENT IS EXACTLY WHAT THE STORE YIELDS — a fresh run reproduces the committed file byte for byte, except EXACTLY the declared F06 supersession delta", () => {
  // The 15 September bytes are pinned by their full hash: never edited, regenerated, replaced or re-dated.
  assert.equal(createHash("sha256").update(STORED_TEXT).digest("hex"), "34bcac0714db248e16a342a0a57f2b72bc97be9e41fffff71eb3f67fd152d2bd");
  assert.equal(LEGACY_MARKET_MEASUREMENT.sha256, "34bcac0714db248e16a342a0a57f2b72bc97be9e41fffff71eb3f67fd152d2bd");
  // Apply the declared delta to the stored bytes, and ONLY it: the result is the fresh run, byte for byte.
  const superseded = clone(STORED);
  for (const { path, from, to } of SUPERSESSION_DELTA) {
    const parent = path.slice(0, -1).reduce((o, k) => o[k], superseded);
    assert.equal(parent[path.at(-1)], from, path.join("."));
    parent[path.at(-1)] = to;
  }
  assert.equal(`${JSON.stringify(FRESH, null, 2)}\n`, `${JSON.stringify(superseded, null, 2)}\n`);
  assert.notEqual(`${JSON.stringify(FRESH, null, 2)}\n`, STORED_TEXT, "the fix changed nothing — the delta is not real");
});

test("🔴 STORED MEASUREMENT — every limb holds: two separate measurements, no impressions as demand, three dimensions NOT_MEASURED (read through the compatibility adapter), quoted, limited, no inference promoted", () => {
  const errs = errorsOf(STORED);
  assert.deepEqual(limbs(errs), [], say(errs));
});

test("🔴 FRESH RUN — every limb holds on the measurement the code produces now, not only on the stored file", () => {
  const errs = errorsOf(measureMarket(STORE));
  assert.deepEqual(limbs(errs), [], say(errs));
});

test("🟢 OBSERVED — query coverage on ONE counting basis: 541 of 2,374 impressions (22.8%) and 0 of 20 clicks; the 16.4% mixes two bases; the anonymisation reading stays UNKNOWN", () => {
  const c = STORED.coverage;
  assert.equal(c.label, "OBSERVED");
  assert.deepEqual(c.byProperty, { impressions: "541 of 2374", share: "22.8%", clicks: "0 of 20" });
  assert.deepEqual(c.byPage, { impressions: "807 of 3289", share: "24.5%", clicks: "0 of 21" });
  assert.equal(c.mixedBasis.ratio, "541 of 3289 = 16.4%");
  assert.deepEqual([c.clickedPages, c.clickedPagesWithAnyQueryRow], [9, 2]);
  assert.deepEqual(c.truncationReasonOnEveryQueryPull, [null, null, null]);
  assert.equal(c.explanation.label, "UNKNOWN");
  assert.match(c.explanation.why, /holds the GAP, not its cause/);
});

test("🟢 THE 807-vs-541 DISCREPANCY — localised to 13 queries shown with more than one page; its counting explanation INFERRED, not closed", () => {
  const d = STORED.discrepancy;
  assert.equal(d.status, "LOCALISED, NOT CLOSED");
  const o = d.observed;
  assert.deepEqual(
    [o.queryImpressions, o.queryPageImpressions, o.excess, o.queriesInBoth, o.queriesOnlyInOne, o.queriesWhereTheSumsAgree, o.queriesWithExcess, o.excessQueriesShownWithMoreThanOnePage, o.queriesWhereTheFinerCutHasFewer, o.pagesWhereQueryPageExceedsThePageRow],
    [541, 807, 266, 337, 0, 324, 13, 13, 0, 0],
  );
  assert.equal(o.countryQueryAgreesWithQuery, "337 of 337 queries");
  assert.equal(o.theSameGapAtTheTop, "page 3289 against property 2374 and country 2374");
  assert.equal(d.explanation.label, "INFERRED");
  assert.match(d.explanation.why, /the request named no aggregationType/);
});

test("🟢 DATA LAG — the same range pulled three times grew 2,261 → 2,374 impressions in 23.2 hours; whether it is final is UNKNOWN", () => {
  const l = STORED.dataLag;
  assert.equal(l.rangeEndsOnThePullDay, true);
  assert.deepEqual(l.restatements.map((r) => [r.observation_id, r.impressions, r.clicks]), [["f294cb34162421cc", 2261, 20], ["96ac9479e50cee08", 2374, 20], ["8c5f987dc5074cd5", 2374, 20]]);
  assert.deepEqual(l.grew, { impressions: 113, clicks: 0, hours: 23.2 });
  assert.equal(l.final.label, "UNKNOWN");
});

test("🔴 TWO DISTINCT METHODS — DEMAND reads the query field only, as a presence bound; VISIBILITY/REACH reads impressions, position, clicks, CTR; nothing shared", () => {
  const { DEMAND, VISIBILITY_REACH } = STORED.dimensions;
  assert.deepEqual(DEMAND.method.fields, ["query"]);
  assert.deepEqual(VISIBILITY_REACH.method.fields, ["impressions", "position", "clicks", "ctr"]);
  assert.notEqual(DEMAND.method.name, VISIBILITY_REACH.method.name);
  assert.deepEqual(DEMAND.method.fields.filter((f) => VISIBILITY_REACH.method.fields.includes(f)), []);
  assert.equal(DEMAND.state, "BOUNDED — PRESENCE ONLY, MAGNITUDE UNKNOWN");
  assert.deepEqual([DEMAND.value.distinctHumanWordings, DEMAND.value.operatorStringsExcluded], [329, 8]);
  assert.match(DEMAND.value.magnitude, /^UNKNOWN/);
  assert.match(DEMAND.value.upperBound, /^UNKNOWN/);
  assert.doesNotMatch(JSON.stringify(DEMAND.value), /impression/i);
  assert.match(DEMAND.limits.selection, /demand seen THROUGH our own visibility/);
  assert.equal(VISIBILITY_REACH.state, "MEASURED");
  assert.deepEqual([VISIBILITY_REACH.value.property.impressions, VISIBILITY_REACH.value.byCountry.impressions, VISIBILITY_REACH.value.byPage.impressions], [2374, 2374, 3289]);
  assert.match(VISIBILITY_REACH.value.byPage.position, /^NOT STORED/);
  // each quotes its OWN observations' range and dataState
  assert.deepEqual([DEMAND.source.observation_id, DEMAND.source.startDate, DEMAND.source.endDate, DEMAND.source.dataState], ["45ce21253a3fc58c", "2026-08-15", "2026-09-12", "COMPLETE"]);
  assert.deepEqual(VISIBILITY_REACH.sources.map((s) => s.observation_id), ["8c5f987dc5074cd5", "59535dbde94fbacd", "9f8cbf772d1cd434"]);
});

test("🔴 THE LIMITS ON THEIR FACES — query truncation stated as coverage and clicks, not as truncationReason; data lag; dataState", () => {
  for (const m of [STORED.dimensions.DEMAND, STORED.dimensions.VISIBILITY_REACH]) {
    assert.match(m.limits.queryTruncation, /truncationReason reads null on every query pull — that says the pager drained every row, NOT that every search was reported/);
    assert.match(m.limits.queryTruncation, /Only 541 of 2374 impressions \(22\.8%\) and 0 of 20 clicks carry a query/);
    assert.match(m.limits.dataLag, /grew from 2261 to 2374 impressions/);
    assert.match(m.limits.dataState, /the pager's word for "every page of rows was drained"/);
  }
});

test("🔴 THE THREE DEFERRED DIMENSIONS — present, NOT_MEASURED, unmeasured, valueless: never measured, never low; the 15 September UNKNOWN kept, and superseded canonically", () => {
  assert.deepEqual(DEFERRED, ["SUPPLY", "AUDIENCE_NEED", "WORTHINESS"]);
  const compat = marketMeasurementCompat(STORED);
  for (const k of DEFERRED) {
    const x = STORED.dimensions[k];
    assert.deepEqual([x.state, x.measured, x.value, x.method], ["UNKNOWN", false, null, null], k);
    const e = compat.find((c) => c.path === `$.dimensions.${k}.state`);
    assert.deepEqual([e.originalState, e.canonicalEvidenceState, e.basis], ["UNKNOWN", "NOT_MEASURED", "DECLARED_MEASURED_FALSE"], k);
    const f = FRESH.dimensions[k];
    assert.deepEqual([f.state, f.measured, f.value, f.method], ["NOT_MEASURED", false, null, null], k);
  }
});

test("🔴 F06 CORRECTION — a CURRENT result whose deferred dimension reads UNKNOWN is refused: the old label is tolerated only on the pinned bytes", () => {
  const r = clone(FRESH);
  r.dimensions.SUPPLY.state = "UNKNOWN";
  const errs = errorsOf(r);
  assert.deepEqual(limbs(errs), ["third-dimension-filled"], say(errs));
  assert.match(errs[0].why, /^SUPPLY reads state "UNKNOWN", measured false/);
  // and the SAME literal on the pinned bytes holds, because their declared measured:false proves NOT_MEASURED
  assert.deepEqual(limbs(errorsOf(STORED)), []);
});

test("🔴 THE BACKWARDS FINDING — rows 3, 5 and 6 stand on 22.8% of impressions and 0 of 20 clicks; reported, no row changed", () => {
  const b = STORED.backwardsFinding;
  assert.deepEqual(b.rows, [3, 5, 6]);
  assert.match(b.observed, /22\.8% of the property's impressions and 0 of 20 of its clicks/);
  assert.match(b.action, /REPORTED FOR THE OWNER'S RULING — no row changed/);
});

/* ---------- each limb RED, alone ---------- */

test("🔴 RED: SUPPLY filled from an unmeasured source — our own page count — is refused, alone", () => {
  const r = clone(FRESH);
  Object.assign(r.dimensions.SUPPLY, { state: "MEASURED", measured: true, value: 1525, method: { name: "pages-in-the-estate", fields: ["url"] } });
  const errs = errorsOf(r);
  assert.deepEqual(limbs(errs), ["third-dimension-filled"], say(errs));
  assert.match(errs[0].why, /^SUPPLY reads state "MEASURED"/);
});

test("🔴 RED: AUDIENCE/NEED filled from the searcher-country mix is refused, alone", () => {
  const r = clone(FRESH);
  Object.assign(r.dimensions.AUDIENCE_NEED, { state: "MEASURED", measured: true, value: "aus", method: { name: "searcher-country-mix", fields: ["country"] } });
  const errs = errorsOf(r);
  assert.deepEqual(limbs(errs), ["third-dimension-filled"], say(errs));
  assert.match(errs[0].why, /^AUDIENCE\/NEED reads/);
});

test("🔴 RED: WORTHINESS defaulted to LOW while still reading NOT_MEASURED is refused, alone — indistinguishable is the failure", () => {
  const r = clone(FRESH);
  r.dimensions.WORTHINESS.value = "LOW";
  const errs = errorsOf(r);
  assert.deepEqual(limbs(errs), ["third-dimension-filled"], say(errs));
  assert.match(errs[0].why, /^WORTHINESS reads state "NOT_MEASURED", measured false, value "LOW"/);
  const dropped = clone(FRESH);
  delete dropped.dimensions.WORTHINESS;
  assert.deepEqual(limbs(errorsOf(dropped)), ["third-dimension-filled"]);
});

test("🔴 RED: impressions reported as demand is refused, alone", () => {
  const r = clone(FRESH);
  r.dimensions.DEMAND.value.magnitude = "541 impressions — the searches for these needs";
  const errs = errorsOf(r);
  assert.deepEqual(limbs(errs), ["impressions-as-demand"], say(errs));
});

test("🔴 RED: DEMAND and VISIBILITY conflated — one method under two names, or one shared field — is refused", () => {
  const r = clone(FRESH);
  r.dimensions.DEMAND.method.name = r.dimensions.VISIBILITY_REACH.method.name;
  assert.deepEqual(limbs(errorsOf(r)), ["conflated"]);
  const shared = clone(FRESH);
  shared.dimensions.VISIBILITY_REACH.method.fields.push("query");
  assert.deepEqual(limbs(errorsOf(shared)), ["conflated"]);
});

test("🔴 RED: a range or a total that is not the stored observation's own is refused, alone", () => {
  const r = clone(FRESH);
  r.dimensions.DEMAND.source.endDate = "2026-09-14";
  assert.deepEqual(limbs(errorsOf(r)), ["not-quoted-from-store"]);
  const v = clone(FRESH);
  v.dimensions.VISIBILITY_REACH.value.byPage.impressions = 3290;
  assert.deepEqual(limbs(errorsOf(v)), ["not-quoted-from-store"]);
});

test("🔴 RED: a measurement without data lag on its face — or a truncation limit that omits the coverage — is refused, alone", () => {
  const r = clone(FRESH);
  delete r.dimensions.DEMAND.limits.dataLag;
  assert.deepEqual(limbs(errorsOf(r)), ["limit-missing"]);
  const t = clone(FRESH);
  t.dimensions.VISIBILITY_REACH.limits.queryTruncation = "QUERY TRUNCATION: truncationReason null — not truncated";
  assert.deepEqual(limbs(errorsOf(t)), ["limit-missing"]);
});

test("🔴 RED: an inference promoted to OBSERVED — the anonymisation reading, or the counting explanation — is refused, alone", () => {
  const r = clone(FRESH);
  r.coverage.explanation.label = "OBSERVED";
  assert.deepEqual(limbs(errorsOf(r)), ["inference-promoted"]);
  const d = clone(FRESH);
  d.discrepancy.explanation.label = "OBSERVED";
  assert.deepEqual(limbs(errorsOf(d)), ["inference-promoted"]);
});
