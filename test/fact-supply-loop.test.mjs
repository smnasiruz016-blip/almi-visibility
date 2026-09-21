/**
 * ITEM 15 — THE VERIFIED FACT SUPPLY LOOP, ON REAL VERIFIED FACTS.
 *
 * The boundary: a fact with source, tier, scope, verification date and freshness
 * window is **stored once, reused WITHIN its scope and window, REFUSED outside
 * either, and expires on schedule** — and **any leg that is fixture-only is a
 * FAILURE**.
 *
 * So every leg below runs on the 32 facts a named person verified on
 * 12 September 2026. No fixture facts appear in this file.
 *
 * 🔴 LEG (iii) IS THE ONE THAT GETS FUDGED. "Close enough" is how a cache turns
 * into a quiet source of wrong answers, and its hit rate improves for it. The
 * pair used is real and the distinction is real: Ireland's NMBI and the UK's NMC
 * both publish an OET minimum grade for nursing, and they are **not the same
 * fact**. A candidate given the wrong one prepares to the wrong threshold and
 * fails at the gate.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { loadRegistry, verifiedSourceBearingFacts, REGISTRY_VERIFIED_COUNT } from "../src/facts/registry.mjs";
import { createFactCache, freshnessOf } from "../src/facts/lifecycle.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const { records } = await loadRegistry((await (await import("./support/subjects.mjs")).subject("almi-oet")).factsDir, "almi-oet");

/* 🔴 SOURCE-BEARING ONLY. Every leg below asks a verified fact for its source, its tier and its
 * recheck window — the three things a derived record does not carry (F28). Filtering on the label
 * alone picked the right population only while the one derived record was UNKNOWN. */
const VERIFIED = verifiedSourceBearingFacts(records);
const TODAY = new Date("2026-09-12");
const ask = (f) => ({ subject: f.claim.subject, predicate: f.claim.predicate, qualifier: f.claim.qualifier, scope: f.scope });

const IE = records.find((f) => f.id === "ie-nmbi.oet-minimum-grade.profession=nursing");
const UK = records.find((f) => f.id === "uk-nmc.oet-minimum-grade.profession=nursing");

/* ================================================================== *
 * THE INPUT — real facts, with everything the boundary names.
 * ================================================================== */

// 🔴 34 since 13 Sep 2026: two more records left UNKNOWN through the F24 guard (item 50), dated that day.
// 🔴 33 since the item-50 reopen: the writing record #63 counted as verified is UNKNOWN.
// 🔴 25 since item 50's whole population was reconciled (13 Sep 2026 morning).
// 🔴 16 since the 9 ambiguous labels were demoted by beta-g ruling (13 Sep 2026 evening).
test("🔴 the input is 16 REAL verified facts, each with source, tier, scope, date and window", () => {
  /* 🔴 AGAINST THE REGISTRY'S OWN DECLARATION, not a number retyped here. 16 until the owner's
   * verification of 21 Sep 2026 added the two pk-pnmc destination fees. */
  assert.equal(VERIFIED.length, REGISTRY_VERIFIED_COUNT);
  assert.ok(VERIFIED.length > 0, "no verified fact at all — the loop would be proving nothing");
  for (const f of VERIFIED) {
    assert.ok(f.source?.url, `${f.id}: no source`);
    assert.ok(typeof f.source?.tier === "number", `${f.id}: no tier`);
    assert.ok(f.scope, `${f.id}: no scope`);
    assert.ok(["2026-09-12", "2026-09-13", "2026-09-21"].includes(f.checks.factCheckedOn), `${f.id}: no verification date`);
    assert.ok(f.checks.recheckAfter, `${f.id}: no freshness window — it would never expire`);
  }
});

test("the recheck policy that set those dates: 90 days for fees and lists, 180 for requirements", () => {
  const w = {};
  for (const f of VERIFIED) w[f.verification.recheckWindowDays] = (w[f.verification.recheckWindowDays] ?? 0) + 1;
  // 13 Sep evening demotion took 3 records with 90-day windows (2 pk-pnmc fees + 1 red-list-rule)
  // and 6 with 180-day windows (4 uk-nmc + ie-nmbi + uk-hcpc). {90: 5-3=2, 180: 20-6=14}, total 16.
  // 🔴 {90: 4, 180: 14}, total 18, since 21 Sep 2026: the two pk-pnmc fees the owner verified are
  // fees, so they return on the 90-day side they left — the policy this test names is unchanged.
  assert.deepEqual(w, { 90: 4, 180: 14 });
  const dates = VERIFIED.map((f) => f.checks.recheckAfter).sort();
  assert.equal(dates[0], "2026-12-11", "the earliest recheck falls due 11 December 2026");
  assert.equal(dates.at(-1), "2027-03-12"); // 2027-03-11 until the two 13 Sep verifications
});

/* ================================================================== *
 * LEG (i) — STORED ONCE. The same fact twice reaches the source once.
 * ================================================================== */

test("🔴 LEG (i): the same real fact requested THREE times reaches the source ONCE", () => {
  let sourceLookups = 0;
  const cache = createFactCache({ facts: VERIFIED, now: () => TODAY, onLookup: () => { sourceLookups += 1; } });
  const q = ask(IE);
  const a = cache.get(q), b = cache.get(q), c = cache.get(q);
  assert.deepEqual([a.hit, b.hit, c.hit], [true, true, true], "a stored verified fact should hit");
  assert.equal(sourceLookups, 0, "a hit must never reach the source");
  assert.equal(cache.stats().lookupsReachingSource, 0);
});

test("🔴 LEG (i): a fact NOT held reaches the source exactly once, then is memoised", () => {
  let lookups = 0;
  const researched = { ...IE, claim: { subject: "zz-new", predicate: "oet-minimum-grade", qualifier: null }, scope: "destination" };
  const cache = createFactCache({
    facts: VERIFIED,
    now: () => TODAY,
    onLookup: () => { lookups += 1; },
    research: () => researched,
  });
  const q = { subject: "zz-new", predicate: "oet-minimum-grade", qualifier: null, scope: "destination" };
  const first = cache.get(q);
  assert.equal(first.researched, true, "the miss should have reached the researcher");
  const second = cache.get(q);
  assert.equal(second.hit, true, "🔴 the miss was not memoised — 400 identical searches is the failure this item names");
  assert.equal(lookups, 1, `the source was reached ${lookups} times for one unchanged fact`);
});

/* ================================================================== *
 * LEG (ii) — REUSED WITHIN SCOPE AND WINDOW.
 * ================================================================== */

test("🔴 LEG (ii): all 16 verified facts are reusable inside their scope and window today", () => {
  const cache = createFactCache({ facts: VERIFIED, now: () => TODAY });
  for (const f of VERIFIED) {
    const r = cache.get(ask(f));
    assert.equal(r.hit, true, `${f.id} is verified and in-window but missed: ${r.reason}`);
    assert.equal(r.fact.id, f.id, `${f.id} returned a DIFFERENT fact — ${r.fact.id}`);
  }
  assert.equal(cache.stats().hits, VERIFIED.length, "every verified fact must be reusable, whatever the count is today");
});

/* ================================================================== *
 * 🔴 LEG (iii) — REFUSED OUTSIDE SCOPE. A REAL PAIR.
 * ================================================================== */

test("🔴 LEG (iii): the real pair exists and the two values genuinely differ", () => {
  assert.ok(IE, "ie-nmbi nursing grade missing");
  assert.ok(UK, "uk-nmc nursing grade missing");
  assert.equal(IE.claim.predicate, UK.claim.predicate);
  assert.equal(IE.claim.qualifier, UK.claim.qualifier, "the pair must differ ONLY by regulator");
  assert.notEqual(IE.locale.destination, UK.locale.destination);
  assert.notEqual(
    JSON.stringify(IE.value.value),
    JSON.stringify(UK.value.value),
    "🔴 if these two ever hold the same value, this test stops proving anything — find another pair",
  );
});

test("🔴 LEG (iii): asked for UK-NMC while holding only IE-NMBI, the cache MISSES — it does not stretch", () => {
  const cache = createFactCache({ facts: [IE], now: () => TODAY });
  const r = cache.get(ask(UK));
  assert.equal(r.hit, false, "🔴 a fact verified for IRELAND was served for a UNITED KINGDOM question");
  assert.equal(r.reason, "NOT_IN_CACHE");
  assert.equal(r.fact, null, "the Irish value was handed back on a UK question");
});

test("🔴 LEG (iii): and the same refusal ACROSS PROFESSIONS, not only across countries", () => {
  const nursing = VERIFIED.filter((f) => f.claim.qualifier === "profession=nursing");
  // 🔴 3 since 13 Sep 2026 evening: 4 profession=nursing records were among the 9 demoted for elementAmbiguity
  // (oet-minimum-grade, english-evidence-routes, oet-combining-sittings-floor, accepted-oet-delivery-modes).
  // Remaining VERIFIED: uk-nmc.oet-profession-version, ie-nmbi.oet-minimum-grade, ie-nmbi.oet-version-required.
  assert.ok(nursing.length >= 3, `only ${nursing.length} nursing-scoped verified facts`);
  const cache = createFactCache({ facts: nursing, now: () => TODAY });
  const f = nursing[0];
  const r = cache.get({ ...ask(f), qualifier: "profession=speech-pathology" });
  assert.equal(r.hit, false, `${f.id} was served for speech-pathology — a nursing fact is not a fact about another profession`);
});

test("CONTROL: the same cache DOES hit for the question it actually holds", () => {
  const cache = createFactCache({ facts: [IE], now: () => TODAY });
  assert.equal(cache.get(ask(IE)).hit, true, "the cache refuses everything, so leg (iii) proves nothing");
});

/* ================================================================== *
 * LEG (iv) — EXPIRES ON SCHEDULE.
 * ================================================================== */

test("🔴 LEG (iv): on the day after its recheck date, a real verified fact stops being reusable", () => {
  const day = new Date(IE.checks.recheckAfter);
  day.setDate(day.getDate() + 1);

  const before = createFactCache({ facts: [IE], now: () => TODAY }).get(ask(IE));
  assert.equal(before.hit, true, "it should be usable today");

  const after = createFactCache({ facts: [IE], now: () => day }).get(ask(IE));
  assert.equal(after.hit, false, `${IE.id} was still served past ${IE.checks.recheckAfter}`);
  assert.equal(after.reason, "STALE");
  // 🔴 Read the REASON, not just the state: it must expire on ITS OWN date, not
  // down the old extractedOn+days path that happens to also have passed.
  assert.match(after.freshness.why, new RegExp(`past its recheck date of ${IE.checks.recheckAfter}`));
});

test("🔴 LEG (iv): every one of the 16 expires on its own recorded date, none immortal", () => {
  for (const f of VERIFIED) {
    const day = new Date(f.checks.recheckAfter);
    day.setDate(day.getDate() + 1);
    const r = freshnessOf(f, { now: day });
    assert.equal(r.state, "STALE", `${f.id} is still USABLE after ${f.checks.recheckAfter}`);
    assert.equal(r.why, `past its recheck date of ${f.checks.recheckAfter}`);
  }
});

test("🔴 LEG (iv): the whole shelf goes stale on schedule — 0 of 16 usable after the last date", () => {
  const past = new Date("2027-03-13"); // one day after the latest recheck (2027-03-12 since 13 Sep 2026)
  const cache = createFactCache({ facts: VERIFIED, now: () => past });
  let hits = 0;
  for (const f of VERIFIED) if (cache.get(ask(f)).hit) hits += 1;
  assert.equal(hits, 0, `${hits} facts were still served after every recheck date had passed`);
});
