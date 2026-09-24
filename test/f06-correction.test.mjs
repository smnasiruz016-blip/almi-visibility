/**
 * 🔴 F06 CORRECTION (owner ruling, 24 September 2026) — THE PROOFS.
 *
 * A bounded correction of F06, not a new feature:
 *   · the 15 September Row 7 artefact is never edited, and is read canonically only through a lossless compatibility
 *     adapter that says NOT_MEASURED where its stored structure independently proves the measurement was not
 *     performed, and UNMAPPED everywhere else;
 *   · the live Row 7 writer says NOT_MEASURED for what it did not measure, and keeps UNKNOWN where it read the store
 *     and could not establish;
 *   · OUTCOME_ALIASES' four branches: not-applicable → NOT_APPLICABLE with scope and reason · could-not-check →
 *     UNKNOWN only if the check was reached · not performed → NOT_MEASURED · ambiguous → UNMAPPED;
 *   · the census counts the populations F06's never did, with four zeros that each have a firing control.
 * Synthetic records only; the real populations are measured by `node tools/evidence-state-census.mjs`, whose output
 * is committed as runs/audit/f06-correction-census-2026-09-24.txt.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { measureMarket, marketErrors } from "../src/discovery/market-measurement.mjs";
import {
  LEGACY_MARKET_MEASUREMENT, marketMeasurementCompat, isLegacyMarketArtefact, isLegacyMarketBytes, readLegacyMarketMeasurement,
} from "../src/evidence/legacy-artefacts.mjs";
import { OUTCOME_ALIASES, placeCheckOutcome, judgeSupersession, promoteOutcome, toCheckOutcome, PLACED_OUTCOMES } from "../src/evidence/verdict.mjs";
import {
  DISCOVERY_ARTEFACTS, correctionZeros, correctionControls, legacyMarketItems, currentMarketItems, checkOutcomeItems, preCorrectionReading,
} from "../tools/evidence-state-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const STORE = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const STORED_TEXT = readFileSync(join(REPO, LEGACY_MARKET_MEASUREMENT.path), "utf8").replace(/\r\n/g, "\n");
const STORED = JSON.parse(STORED_TEXT);
const FRESH = measureMarket(STORE);
const clone = (x) => JSON.parse(JSON.stringify(x));
const DEFERRED_PATHS = ["$.dimensions.SUPPLY.state", "$.dimensions.AUDIENCE_NEED.state", "$.dimensions.WORTHINESS.state"];

/* A record shaped like each real population the census measured (structure only; no value, URL or text). */
const fact = (o = {}) => ({ id: "f", checks: { linkCheckOutcome: "pass", quoteMatchOutcome: "pass", fingerprintOutcome: "pass", ...(o.checks ?? {}) }, ...o, checks: { linkCheckOutcome: "pass", quoteMatchOutcome: "pass", fingerprintOutcome: "pass", ...(o.checks ?? {}) } });
const DERIVED = fact({ id: "d", kind: "derived", derivation: { inputs: ["a", "b"] }, checks: { linkCheckOutcome: "could-not-check", quoteMatchOutcome: "could-not-check", fingerprintOutcome: "could-not-check" } });
const NO_BASELINE = fact({ id: "b", sourceMachineReadable: true, sourceQuotable: true, pageFingerprint: null, checks: { fingerprintOutcome: "could-not-check" } });
const LICENCE = (q) => fact({ id: `q-${String(q)}`, sourceQuotable: q, checks: { quoteMatchOutcome: "not-applicable" } });

test("K1 · the compatibility adapter is LOSSLESS — nine labelled elements, each keeping its stored literal as originalState", () => {
  const compat = marketMeasurementCompat(STORED);
  assert.equal(compat.length, 9);
  const literal = (path) => path.slice(2).split(".").reduce((o, k) => o?.[k], STORED);
  for (const e of compat) assert.equal(e.originalState, literal(e.path), e.path);
  assert.deepEqual(compat.map((e) => e.originalState), ["OBSERVED", "UNKNOWN", "OBSERVED", "INFERRED", "OBSERVED", "UNKNOWN", "UNKNOWN", "UNKNOWN", "UNKNOWN"]);
  const nm = compat.filter((e) => e.canonicalEvidenceState === "NOT_MEASURED");
  assert.deepEqual(nm.map((e) => e.path), DEFERRED_PATHS);
  for (const e of nm) { assert.equal(e.basis, "DECLARED_MEASURED_FALSE"); assert.ok(e.noMeasurementReason, e.path); }
  const un = compat.filter((e) => e.canonicalEvidenceState === "UNMAPPED");
  assert.equal(un.length, 6);
  for (const e of un) assert.ok(e.unmapped === true && e.why, e.path);
});

test("K2 · §B — an empty or absent field is NOT proof: only the declared boolean measured:false places NOT_MEASURED; the old label never does", () => {
  for (const [label, measured] of [["absent", undefined], ["null", null], ["the string \"false\"", "false"], ["0", 0], ["true", true]]) {
    const a = clone(STORED);
    if (measured === undefined) delete a.dimensions.SUPPLY.measured; else a.dimensions.SUPPLY.measured = measured;
    const e = marketMeasurementCompat(a).find((x) => x.path === "$.dimensions.SUPPLY.state");
    assert.equal(e.originalState, "UNKNOWN", label);
    assert.equal(e.canonicalEvidenceState, "UNMAPPED", `measured ${label} must not prove NOT_MEASURED`);
  }
  // and the label is not what decides: the same UNKNOWN on a non-deferred element stays UNMAPPED
  assert.equal(marketMeasurementCompat(STORED).find((x) => x.path === "$.dataLag.final.label").canonicalEvidenceState, "UNMAPPED");
});

test("K3 · the reading is bound to the exact 15 September bytes by full sha256 — other bytes are refused, never read as it", () => {
  assert.equal(LEGACY_MARKET_MEASUREMENT.sha256, "34bcac0714db248e16a342a0a57f2b72bc97be9e41fffff71eb3f67fd152d2bd");
  assert.equal(isLegacyMarketBytes(STORED_TEXT.replace('"UNKNOWN"', '"NOT_MEASURED"')), false, "altered bytes must never read as the 15 September artefact");
  assert.equal(isLegacyMarketBytes(STORED_TEXT), true);
  assert.equal(isLegacyMarketArtefact(STORED), true);
  assert.equal(isLegacyMarketArtefact(FRESH), false, "the fresh result is not the pinned artefact");
  const dir = mkdtempSync(join(tmpdir(), "f06c-"));
  try {
    mkdirSync(join(dir, "runs", "discovery"), { recursive: true });
    writeFileSync(join(dir, LEGACY_MARKET_MEASUREMENT.path), STORED_TEXT.replace("2374", "2375"));
    assert.throws(() => readLegacyMarketMeasurement(dir), /is not the pinned 15 September bytes/);
    writeFileSync(join(dir, LEGACY_MARKET_MEASUREMENT.path), STORED_TEXT);
    assert.equal(readLegacyMarketMeasurement(dir).elements.length, 9);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("K4 · the live Row 7 writer: NOT performed → NOT_MEASURED; REACHED but not establishable → UNKNOWN, kept", () => {
  for (const k of ["SUPPLY", "AUDIENCE_NEED", "WORTHINESS"]) {
    assert.deepEqual([FRESH.dimensions[k].state, FRESH.dimensions[k].measured], ["NOT_MEASURED", false], k);
  }
  // the store was read and holds no answer: UNKNOWN is the right word, and stays
  assert.equal(FRESH.coverage.explanation.label, "UNKNOWN");
  assert.equal(FRESH.dataLag.final.label, "UNKNOWN");
  assert.deepEqual(currentMarketItems(FRESH).map((i) => i.state), ["OBSERVED", "UNKNOWN", "OBSERVED", "INFERRED", "OBSERVED", "UNKNOWN", "NOT_MEASURED", "NOT_MEASURED", "NOT_MEASURED"]);
});

test("K4b · Row 7's law reads the CANONICAL state: a current result reading UNKNOWN for an unmeasured dimension is refused", () => {
  const r = clone(FRESH);
  r.dimensions.WORTHINESS.state = "UNKNOWN";
  const errs = marketErrors({ result: r, storeRecords: STORE });
  assert.deepEqual([...new Set(errs.map((e) => e.limb))], ["third-dimension-filled"]);
  assert.deepEqual(marketErrors({ result: FRESH, storeRecords: STORE }), []);
  assert.deepEqual(marketErrors({ result: STORED, storeRecords: STORE }), []);
});

test("K5 · OUTCOME_ALIASES branch 1 — not-applicable → NOT_APPLICABLE with scope and reason, only on a DECLARED rule", () => {
  assert.equal(OUTCOME_ALIASES["not-applicable"].state, "NOT_APPLICABLE");
  const no = placeCheckOutcome({ record: LICENCE(false), field: "quoteMatchOutcome" });
  assert.deepEqual([no.state, no.applicabilityReason, no.basis], ["NOT_APPLICABLE", "LICENCE_DOES_NOT_PERMIT_STORED_QUOTE", "DECLARED_SOURCE_QUOTABLE"]);
  assert.match(no.scope, /declared sourceQuotable is false/);
  const unk = placeCheckOutcome({ record: LICENCE("unknown"), field: "quoteMatchOutcome" });
  assert.deepEqual([unk.state, unk.applicabilityReason], ["NOT_APPLICABLE", "LICENCE_PERMISSION_NOT_ESTABLISHED"]);
  // never UNKNOWN; and no declared rule → UNMAPPED, not NOT_APPLICABLE
  for (const q of [true, undefined, null]) assert.equal(placeCheckOutcome({ record: LICENCE(q), field: "quoteMatchOutcome" }).state, "UNMAPPED", String(q));
  assert.equal(placeCheckOutcome({ record: fact({ checks: { linkCheckOutcome: "not-applicable" } }), field: "linkCheckOutcome" }).state, "UNMAPPED");
});

test("K6 · OUTCOME_ALIASES branch 2 — could-not-check → UNKNOWN ONLY if this check was reached for this record", () => {
  const rec = fact({ id: "r", checks: { linkCheckOutcome: "could-not-check" } });
  const reached = placeCheckOutcome({ record: rec, field: "linkCheckOutcome", attempt: { recordId: "r", field: "linkCheckOutcome", reached: true, outcome: "could-not-check" } });
  assert.deepEqual([reached.state, reached.basis, reached.insufficiency], ["UNKNOWN", "CHECK_REACHED", "CHECK_REACHED_RESULT_NOT_ESTABLISHABLE"]);
  for (const attempt of [
    { recordId: "other", field: "linkCheckOutcome", reached: true, outcome: "could-not-check" },
    { recordId: "r", field: "quoteMatchOutcome", reached: true, outcome: "could-not-check" },
    { recordId: "r", field: "linkCheckOutcome", reached: "yes", outcome: "could-not-check" },
    { recordId: "r", field: "linkCheckOutcome", reached: true, outcome: "pass" },
  ]) assert.equal(placeCheckOutcome({ record: rec, field: "linkCheckOutcome", attempt }).state, "UNMAPPED", JSON.stringify(attempt));
});

test("K7 · OUTCOME_ALIASES branch 3 — not performed → NOT_MEASURED, only where the structure proves it (a declared derived fact)", () => {
  for (const field of ["linkCheckOutcome", "quoteMatchOutcome", "fingerprintOutcome"]) {
    const p = placeCheckOutcome({ record: DERIVED, field });
    assert.deepEqual([p.state, p.basis, p.noMeasurementReason], ["NOT_MEASURED", "DECLARED_DERIVED_FACT", "DERIVED_FACT_HAS_NO_SOURCE_DOCUMENT"], field);
  }
  // half a derived fact is not one: a source, or no cited inputs, and it proves nothing
  assert.equal(placeCheckOutcome({ record: { ...DERIVED, source: { url: "x" } }, field: "linkCheckOutcome" }).state, "UNMAPPED");
  assert.equal(placeCheckOutcome({ record: { ...DERIVED, derivation: { inputs: [] } }, field: "linkCheckOutcome" }).state, "UNMAPPED");
});

test("K8 · OUTCOME_ALIASES branch 4 — ambiguous → UNMAPPED: a could-not-check with no baseline and no attempt marker is not guessed", () => {
  const p = placeCheckOutcome({ record: NO_BASELINE, field: "fingerprintOutcome" });
  assert.equal(p.state, "UNMAPPED");
  assert.equal(p.originalOutcome, "could-not-check");
  assert.match(p.why, /no positive record of whether the check was reached or never performed/);
  // the conclusive literals still decide alone; the inconclusive ones never do
  assert.deepEqual([toCheckOutcome("pass"), toCheckOutcome("fail")], ["PASS", "FAIL"]);
  assert.throws(() => toCheckOutcome("could-not-check"), /not decided by its literal/);
  assert.throws(() => toCheckOutcome("not-applicable"), /not decided by its literal/);
});

test("K9 · the four zeros hold on the corrected reading, and each FIRES on the pre-correction reading (same counter)", () => {
  const legacyItems = legacyMarketItems(STORED, marketMeasurementCompat(STORED));
  const items = [...legacyItems, ...currentMarketItems(FRESH), ...checkOutcomeItems([DERIVED, NO_BASELINE, LICENCE(false), LICENCE("unknown")])];
  assert.deepEqual(correctionZeros(items), { unknownForUnmeasured: 0, notApplicableCollapsedIntoUnknown: 0, ambiguousAutomaticMappings: 0, remainder: 0 });
  assert.deepEqual(correctionControls({ legacyItems }), { unknownForUnmeasuredFires: true, notApplicableCollapseFires: true, ambiguousMappingFires: true, remainderFires: true });
  const old = correctionZeros(preCorrectionReading(checkOutcomeItems([DERIVED, LICENCE(false)]), { checks: true }));
  assert.equal(old.unknownForUnmeasured, 3);
  assert.equal(old.notApplicableCollapsedIntoUnknown, 1);
});

test("K10 · every tracked runs/discovery artefact is DECLARED to the census — the denominator F06 missed cannot silently reopen", () => {
  const tracked = execFileSync("git", ["-C", REPO, "ls-files", "runs/discovery"], { encoding: "utf8" }).trim().split("\n").filter((p) => p.endsWith(".json")).sort();
  assert.deepEqual(Object.keys(DISCOVERY_ARTEFACTS).sort(), tracked);
  assert.equal(DISCOVERY_ARTEFACTS[LEGACY_MARKET_MEASUREMENT.path].reading, "LEGACY_COMPAT");
});

test("K11 · no absence becomes PASS: UNKNOWN, NOT_MEASURED and NOT_APPLICABLE all refuse → PASS; PASS may still fall back to any of them", () => {
  for (const a of ["UNKNOWN", "NOT_MEASURED", "NOT_APPLICABLE"]) assert.throws(() => promoteOutcome(a, "PASS"), new RegExp(`${a} never becomes PASS`), `${a} must never become PASS`);
  for (const b of ["UNKNOWN", "NOT_MEASURED", "NOT_APPLICABLE", "FAIL"]) assert.equal(promoteOutcome("PASS", b), b);
  const v = judgeSupersession({ previous: DERIVED, next: { ...DERIVED, id: "d2", checks: { linkCheckOutcome: "pass", quoteMatchOutcome: "could-not-check", fingerprintOutcome: "could-not-check" } } });
  assert.equal(v.length, 1);
  assert.match(v[0].message, /NOT_MEASURED never becomes PASS/);
});

test("K12 · the edge law's strength is UNCHANGED: on every placeable pair of the four literals, the verdict equals the pre-correction table's", () => {
  const OLD = { pass: "PASS", fail: "FAIL", "could-not-check": "UNKNOWN", "not-applicable": "UNKNOWN" };
  const forbiddenOld = (a, b) => a === "UNKNOWN" && b === "PASS";
  const sides = { pass: fact(), fail: fact({ checks: { linkCheckOutcome: "fail" } }), "could-not-check": DERIVED, "not-applicable": LICENCE(false) };
  const field = { pass: "linkCheckOutcome", fail: "linkCheckOutcome", "could-not-check": "linkCheckOutcome", "not-applicable": "quoteMatchOutcome" };
  let pairs = 0;
  for (const a of Object.keys(OLD)) for (const b of Object.keys(OLD)) {
    const from = placeCheckOutcome({ record: sides[a], field: field[a] }).state;
    const to = placeCheckOutcome({ record: sides[b], field: field[b] }).state;
    assert.ok(PLACED_OUTCOMES.includes(from) && PLACED_OUTCOMES.includes(to));
    let refused = false;
    try { promoteOutcome(from, to); } catch { refused = true; }
    assert.equal(refused, forbiddenOld(OLD[a], OLD[b]), `${a} → ${b}`);
    pairs += 1;
  }
  assert.equal(pairs, 16);
});
