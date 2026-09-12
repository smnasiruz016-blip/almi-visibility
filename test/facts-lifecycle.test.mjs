import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  detectConflicts, freshnessOf, markForReview, makeDerivedFact, recomputeDerived,
  createFactCache, FORMULAS, FACT_STATES, REVIEW_REASONS,
} from "../src/facts/lifecycle.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * 🔴 LAW-FIXTURE-1 — what these fixtures are NOT.
 *
 * They are minimal fact shapes: an id, a claim, a value, a source tier and a
 * freshness rule. Real registry records carry ~20 more fields (licences,
 * quotability, page fingerprints, check outcomes). These therefore do NOT test
 * interaction with any of that. The assertions at the foot run against the real
 * 46-record registry.
 */
const F = (id, over = {}) => ({
  id,
  claim: { subject: "s", predicate: "p", qualifier: null },
  scope: "destination",
  value: { value: 1, valueType: "count", unit: "x" },
  source: { tier: 1 },
  verificationState: "UNVERIFIED",
  life: { status: "active", extractedOn: "2026-09-01" },
  freshness: { rule: "machine-fingerprint", days: 180 },
  ...over,
});

/* ================================================================== *
 * 2A — CONFLICT. DETECTED, NEVER AUTO-RESOLVED.
 * ================================================================== */

test("🔴 CONFLICT — FIRES on two values for one claim, and NEVER auto-resolves", () => {
  /* 🔴 THE TIERS ARE DELIBERATELY DIFFERENT.
   *
   * A first version of this test used two equal-tier records. A sabotage that
   * auto-resolved a conflict whenever one side outranked the other therefore
   * slipped straight past it — the test could not reach the branch it was
   * meant to guard. Unequal tiers are the case where auto-resolution is
   * tempting, so that is the case this must assert on. */
  const c = detectConflicts([
    F("a", { value: { value: 350 }, source: { tier: 1 } }),
    F("b", { value: { value: 400 }, source: { tier: 4 } }),
  ]);
  assert.equal(c.length, 1);
  assert.equal(c[0].state, "CONFLICTED");
  assert.equal(c[0].resolvedState, "UNKNOWN", "a conflict resolves to UNKNOWN, never to a winner — even a clear one");
  assert.equal(c[0].needsExplicitReview, true);
});

test("🔴 CONFLICT — BOTH values are retained; the loser is never discarded", () => {
  const c = detectConflicts([F("a", { value: { value: 350 } }), F("b", { value: { value: 400 } })]);
  assert.equal(c[0].records.length, 2);
  assert.deepEqual(c[0].records.map((r) => r.value).sort(), [350, 400]);
});

test("CONFLICT — a higher-tier source is SUGGESTED, not applied", () => {
  const c = detectConflicts([
    F("official", { value: { value: 350 }, source: { tier: 1 } }),
    F("secondary", { value: { value: 400 }, source: { tier: 4 } }),
  ]);
  assert.equal(c[0].suggestedAuthority, "official");
  assert.equal(c[0].resolvedState, "UNKNOWN", "even with a clear authority, it stays UNKNOWN until a person rules");
  assert.match(c[0].why, /never auto-resolved/);
});

test("CONFLICT — equal authority does not settle it, and the reason says so", () => {
  const c = detectConflicts([
    F("a", { value: { value: 350 }, source: { tier: 1 } }),
    F("b", { value: { value: 400 }, source: { tier: 1 } }),
  ]);
  assert.equal(c[0].suggestedAuthority, null);
  assert.match(c[0].why, /does not settle it/);
});

test("🔴 CONFLICT — CLEAN CONTROL: two records with the SAME value are not a conflict", () => {
  assert.deepEqual(detectConflicts([F("a"), F("b")]), [], "🔴 FALSE POSITIVE: agreement was called a conflict");
});

test("CONFLICT — CLEAN CONTROL: two records for DIFFERENT claims are not a conflict", () => {
  const c = detectConflicts([F("a"), F("b", { claim: { subject: "s", predicate: "other", qualifier: null }, value: { value: 9 } })]);
  assert.deepEqual(c, []);
});

/* ================================================================== *
 * 2B — FRESHNESS.
 * ================================================================== */

test("🔴 STALE — FIRES past the freshness window, SILENT inside it", () => {
  const old = F("old", { life: { status: "active", extractedOn: "2020-01-01" } });
  assert.equal(freshnessOf(old, { now: new Date("2026-09-12") }).state, "STALE");
  const fresh = F("new", { life: { status: "active", extractedOn: "2026-09-01" } });
  assert.equal(freshnessOf(fresh, { now: new Date("2026-09-12") }).state, "USABLE");
});

test("🔴 EXPIRED — FIRES when the source is GONE (404/410)", () => {
  const f = freshnessOf(F("a"), { now: new Date("2026-09-12"), sourceReachable: false });
  assert.equal(f.state, "EXPIRED");
  assert.match(f.why, /is gone/);
});

test("🔴 LAW-ABSENT-1 — a source we COULD NOT FETCH is UNKNOWN, never EXPIRED and never 'unsourced'", () => {
  /* "The source is gone" and "we could not reach the source" are different
   * facts. Only the first says anything about the fact. */
  const f = freshnessOf(F("a"), { now: new Date("2026-09-12"), sourceReachable: "UNREACHABLE" });
  assert.equal(f.state, "UNKNOWN");
  assert.match(f.why, /fact about our tool, not about the source/);
});

test("FRESHNESS — no rule and no recheck date is UNKNOWN, not USABLE", () => {
  const f = freshnessOf({ id: "x", life: {} }, { now: new Date("2026-09-12") });
  assert.equal(f.state, "UNKNOWN");
  assert.ok(FACT_STATES.includes(f.state));
});

/* ================================================================== *
 * 2C / 3D — 🔴 THE DEPENDENCY WALK.
 * ================================================================== */

test("🔴 DEPENDENCY WALK — a bad input marks every fact derived from it, TRANSITIVELY", () => {
  const facts = [
    F("base"),
    { id: "d1", derivation: { inputs: ["base"] } },
    { id: "d2", derivation: { inputs: ["d1"] } },   // depends on a derived fact
    { id: "unrelated", derivation: { inputs: ["other"] } },
  ];
  const w = markForReview({ facts, findings: [], badFactIds: ["base"], reason: "INPUT_STALE" });
  const ids = w.markedFacts.map((m) => m.id).sort();
  assert.deepEqual(ids, ["d1", "d2"], "the walk must be transitive, and must not touch unrelated facts");
  assert.equal(w.total, 2);
});

test("🔴 DEPENDENCY WALK — FINDINGS that cited the bad fact are marked too", () => {
  const w = markForReview({
    facts: [F("base")],
    findings: [
      { issue_id: "i1", sources: ["base"] },
      { issue_id: "i2", sources: ["something-else"] },
    ],
    badFactIds: ["base"],
    reason: "INPUT_CONFLICTED",
  });
  assert.deepEqual(w.markedFindings.map((m) => m.id), ["i1"]);
});

test("DEPENDENCY WALK — CLEAN CONTROL: nothing depends on the bad fact, so nothing is marked", () => {
  const w = markForReview({ facts: [F("base"), { id: "d", derivation: { inputs: ["other"] } }], findings: [], badFactIds: ["base"], reason: "INPUT_STALE" });
  assert.equal(w.total, 0, "🔴 FALSE POSITIVE: an unrelated fact was marked");
});

test("a review reason must be declared, not free-texted", () => {
  assert.throws(() => markForReview({ facts: [], badFactIds: [], reason: "BECAUSE" }), /unknown review reason/);
  assert.ok(REVIEW_REASONS.includes("INPUT_CHANGED"));
});

/* ================================================================== *
 * ITEM 17 — DERIVED FACT PROVENANCE.
 * ================================================================== */

const V = (id, value, state) => F(id, { value: { value }, verificationState: state });

test("🔴 DERIVED — the FORMULA is stored and is re-executable, not described", () => {
  const d = makeDerivedFact({
    id: "d", claim: { subject: "s", predicate: "total", qualifier: null },
    formula: "sum", inputs: ["a", "b"],
    inputFacts: [V("a", 300, "VERIFIED"), V("b", 100, "VERIFIED")],
  });
  assert.equal(d.derivation.formula, "sum");
  assert.deepEqual([...d.derivation.inputs], ["a", "b"]);
  assert.equal(d.value.value, 400);
  assert.equal(typeof FORMULAS[d.derivation.formula], "function", "the formula must be executable");
});

test("🔴 DERIVED — a described formula is refused; only a declared one is accepted", () => {
  assert.throws(
    () => makeDerivedFact({ id: "d", claim: {}, formula: "add them together", inputs: ["a"], inputFacts: [V("a", 1, "VERIFIED")] }),
    /must be re-executable, not described/,
  );
});

test("🔴 DERIVED — it can NEVER be more verified than its least-verified input", () => {
  assert.throws(
    () => makeDerivedFact({
      id: "d", claim: {}, formula: "sum", inputs: ["a", "b"],
      inputFacts: [V("a", 1, "VERIFIED"), V("b", 2, "UNVERIFIED")],
      verificationState: "VERIFIED",
    }),
    /never be more verified than its weakest input/,
  );
});

test("🔴 DERIVED — it INHERITS the weakest input's state automatically", () => {
  const d = makeDerivedFact({
    id: "d", claim: {}, formula: "sum", inputs: ["a", "b"],
    inputFacts: [V("a", 1, "VERIFIED"), V("b", 2, "UNKNOWN")],
  });
  assert.equal(d.verificationState, "UNKNOWN");

  const allVerified = makeDerivedFact({
    id: "d2", claim: {}, formula: "sum", inputs: ["a", "b"],
    inputFacts: [V("a", 1, "VERIFIED"), V("b", 2, "VERIFIED")],
  });
  assert.equal(allVerified.verificationState, "VERIFIED", "🔴 all-verified inputs must not be needlessly downgraded");
});

test("🔴 DERIVED — a fact with no inputs cannot be constructed", () => {
  assert.throws(() => makeDerivedFact({ id: "d", claim: {}, formula: "sum", inputs: [], inputFacts: [] }), /must cite the fact_ids/);
});

test("🔴 RECOMPUTE — a match passes; a MISMATCH is a finding, never a repair", () => {
  const d = makeDerivedFact({
    id: "d", claim: {}, formula: "sum", inputs: ["a", "b"],
    inputFacts: [V("a", 300, "VERIFIED"), V("b", 100, "VERIFIED")],
  });
  assert.equal(recomputeDerived(d, [V("a", 300, "VERIFIED"), V("b", 100, "VERIFIED")]).ok, true);

  const drifted = recomputeDerived(d, [V("a", 300, "VERIFIED"), V("b", 999, "VERIFIED")]);
  assert.equal(drifted.ok, false);
  assert.equal(drifted.stored, 400);
  assert.equal(drifted.recomputed, 1299);
  assert.match(drifted.note, /a finding, not a repair/);
});

/* ================================================================== *
 * ITEM 46 — THE CACHE.
 * ================================================================== */

test("🔴 CACHE — the same fact requested TWICE reaches the source EXACTLY ONCE", () => {
  let sourceHits = 0;
  const researched = F("found", { claim: { subject: "new", predicate: "thing", qualifier: null }, scope: "destination" });
  const cache = createFactCache({
    facts: [],
    research: () => { sourceHits += 1; return researched; },
  });
  const q = { subject: "new", predicate: "thing", qualifier: null, scope: "destination" };
  cache.get(q);
  cache.get(q);
  cache.get(q);
  assert.equal(sourceHits, 1, "🔴 the spec's own words: do not run 400 identical searches for one unchanged fact");
  assert.equal(cache.stats().hits, 2, "the second and third requests must be cache hits");
});

test("🔴 CACHE — outside its SCOPE it is a MISS, not a stretch", () => {
  const cache = createFactCache({ facts: [F("a", { scope: "destination" })] });
  const hit = cache.get({ subject: "s", predicate: "p", qualifier: null, scope: "destination" });
  assert.equal(hit.hit, true);
  const miss = cache.get({ subject: "s", predicate: "p", qualifier: null, scope: "origin" });
  assert.equal(miss.hit, false, "🔴 serving a fact outside its scope because it is 'close enough' is how a cache becomes a source of quiet errors");
});

test("🔴 CACHE — outside its FRESHNESS WINDOW it is a MISS", () => {
  const cache = createFactCache({
    facts: [F("old", { life: { status: "active", extractedOn: "2020-01-01" } })],
    now: () => new Date("2026-09-12"),
  });
  const r = cache.get({ subject: "s", predicate: "p", qualifier: null, scope: "destination" });
  assert.equal(r.hit, false);
  assert.equal(r.reason, "STALE");
});

test("🔴 CACHE — LAW-BOUND-1: the freshness window prints beside the hit rate", () => {
  const cache = createFactCache({ facts: [F("a")] });
  cache.get({ subject: "s", predicate: "p", qualifier: null, scope: "destination" });
  const s = cache.stats();
  assert.ok(Array.isArray(s.bound.freshnessWindowDays));
  assert.deepEqual(s.bound.freshnessWindowDays, [180]);
  assert.match(s.bound.scopeRule, /MISS, not a stretch/);
  assert.equal(s.hitRate, 1);
});

test("CACHE — hits AND misses are both counted; a cache nobody measures is one nobody can trust", () => {
  const cache = createFactCache({ facts: [F("a")] });
  cache.get({ subject: "s", predicate: "p", qualifier: null, scope: "destination" });
  cache.get({ subject: "nope", predicate: "p", qualifier: null, scope: "destination" });
  const s = cache.stats();
  assert.equal(s.hits, 1);
  assert.equal(s.misses, 1);
  assert.equal(s.hitRate, 0.5);
  assert.equal(s.missReasons.NOT_IN_CACHE, 1);
});

/* ================================================================== *
 * AGAINST THE REAL REGISTRY AND THE REAL EXPORT.
 * ================================================================== */

const CSV = `${REPO}runs/export/facts-for-verification.csv`;

test("🔴 REAL: the export carries all 46 rows and every column populated or explicitly UNKNOWN", { skip: !existsSync(CSV) }, () => {
  const lines = readFileSync(CSV, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "" && !l.startsWith("#"));
  const header = lines[0].split(",");
  const rows = lines.slice(1);
  assert.equal(rows.length, 46, `expected 46 rows, found ${rows.length}`);
  assert.equal(header.length, 9);
  for (const r of rows) {
    assert.ok(!/,,/.test(r.replace(/"[^"]*"/g, "Q")), "an empty cell escaped — every column must be populated or UNKNOWN");
  }
});

test("🔴 REAL: the export verifies NOTHING and says so at the top of the file", { skip: !existsSync(CSV) }, () => {
  const text = readFileSync(CSV, "utf8");
  assert.match(text, /NONE of these has been verified/);
  assert.match(text, /never a guessed URL/);
  assert.ok(!/,VERIFIED,/.test(text), "a row claims VERIFIED — nothing in this PR may verify a fact");
});
