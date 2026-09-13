/**
 * 🔴 ITEM 50 — THE REAL TRANSITION TEST, RE-RUN AFTER THE REOPEN (D-GUARD-1).
 *
 * Boundary: no path converts UNKNOWN into PASS · the guard must govern REAL records ·
 * FAILURE: a label is absent or wrong, OR THE GUARD POLICES AN EMPTY POPULATION.
 *
 * Reopened 13 September 2026: the writing record was labelled VERIFIED on a verdict
 * that confirmed three of the six claims its value makes, with `elementsNotFound: 0`
 * supplied by the verdict itself — and the first guard trusted that number. The guard
 * now RECONCILES the record's declared element list against the keys a verdict names,
 * and derives what is missing. Every test here reads the REAL registry through the REAL
 * validation path.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { productFromArgv } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { validateRegistry } from "../src/facts/validate.mjs";
import { judgeLeavingUnknown, departuresWithoutJudgement, reconcileElements } from "../src/evidence/verdict.mjs";
import { UNKNOWN_REASONS } from "../src/facts/record.mjs";
import { forbiddenTextCensus, FORBIDDEN_PHRASE_HASHES, normaliseWords } from "../tools/forbidden-text-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
// The product is registered through the same entry point the CLI uses — its licence terms only exist once it is.
const product = await productFromArgv(["--product=almi-oet"]);
const { records } = await loadRegistry(product.factsDir, product.productId);
const { UNKNOWN_ON_2026_09_12 } = await import(pathToFileURL(`${REPO}products/almi-oet/facts/_verification-baseline-2026-09-12.mjs`).href);
const v = validateRegistry(records);
const byId = new Map(records.map((r) => [r.id, r]));
const judgementOf = (id) => v.guard.judgements.find((j) => j.id === id);
const lawsOf = (recs) => [...new Set(validateRegistry(recs).registryErrors.map((e) => e.law))].sort();
const withVerification = (id, patch) => records.map((r) => (r.id === id ? { ...r, verification: { ...r.verification, ...patch } } : r));

const LICENCE = "oet.content-licence-permits-stored-quotation";
const WRITING = "oet.writing-task-type.profession=nursing";
const SPEAKING = "oet.speaking-roleplay-setting.profession=nursing";
const GRADES = "oet.grade-bands-0-500";
const GOVERNED = [LICENCE, WRITING, SPEAKING, GRADES];

/* ---- the corrected population, through the reconciled guard -------------- */

test("🔴 50 · DIRECTION ONE — evidence arrived: the licence record left UNKNOWN THROUGH the guard, every declared element confirmed", () => {
  assert.equal(v.valid, true, JSON.stringify(v.registryErrors.concat(v.invalidRecords), null, 1));
  const j = judgementOf(LICENCE);
  assert.ok(j, "the licence record reached VERIFIED without the guard judging it");
  assert.deepEqual([j.from, j.asked, j.decision, j.declared, j.agrees], ["UNKNOWN", "VERIFIED", "ADVANCED_ON_NEW_MEASUREMENT", "VERIFIED", true]);
  assert.deepEqual([j.elements.listed, j.elements.confirmed, j.elements.notConfirmed], [1, 1, 0]);
  assert.deepEqual(j.reasons, []);
  const r = byId.get(LICENCE);
  assert.equal(r.verificationState, "VERIFIED");
  assert.ok(r.verification.checkedOn > r.verification.previous.checkedOn, "not a new measurement");
});

test("🔴 50 · DIRECTION TWO — evidence insufficient: writing, speaking and grade bands were ASKED to advance, REFUSED, and stay UNKNOWN", () => {
  const expected = {
    [WRITING]: { code: "PARTIAL_EVIDENCE", words: "PARTIAL EVIDENCE — three elements confirmed, three not found", listed: 6, confirmed: 3, notConfirmed: 3 },
    [SPEAKING]: { code: "PARTIAL_EVIDENCE", words: "PARTIAL EVIDENCE — one element confirmed, two not found", listed: 6, confirmed: 1, notConfirmed: 5 },
    [GRADES]: { code: "SOURCE_UNREACHABLE", words: "SOURCE UNREACHABLE — three pages returned 403", listed: 5, confirmed: 0, notConfirmed: 5 },
  };
  for (const [id, e] of Object.entries(expected)) {
    const j = judgementOf(id);
    assert.ok(j, `${id} was never put to the guard — "nobody tried" is not "the guard refused"`);
    assert.equal(j.asked, "VERIFIED", "the guard was not asked to advance it");
    assert.equal(j.decision, "REFUSED", `the guard advanced ${id} on insufficient evidence`);
    assert.deepEqual([j.declared, j.agrees], ["UNKNOWN", true]);
    // 🔴 the counts are DERIVED by reconciliation — the speaking verdict named 2 not found; silence on 3 more is not confirmation
    assert.deepEqual([j.elements.listed, j.elements.confirmed, j.elements.notConfirmed], [e.listed, e.confirmed, e.notConfirmed], `${id}: the guard's derived counts`);
    const r = byId.get(id);
    assert.equal(r.verificationState, "UNKNOWN");
    assert.equal(r.verification.reason, e.code);
    assert.ok(e.code in UNKNOWN_REASONS);
    assert.equal(r.verification.verdictWords, e.words, "the verdict's reason is not in its exact words");
  }
  assert.match(judgementOf(WRITING).reasons.join(" | "), /3 of 6 declared element\(s\) not confirmed/);
  assert.match(judgementOf(GRADES).reasons.join(" | "), /the source was not read — 3 page\(s\) refused \(403\)/);
});

test("🔴 50 · THE POPULATION IS REAL AND NOT EMPTY — 4 real records judged leaving UNKNOWN: 1 advanced, 3 refused", () => {
  assert.deepEqual([v.guard.judged, v.guard.advanced, v.guard.refused], [4, 1, 3]);
  assert.deepEqual(v.guard.judgements.map((j) => j.id).sort(), [...GOVERNED].sort());
  assert.equal(UNKNOWN_ON_2026_09_12.length, 14);
  assert.deepEqual(departuresWithoutJudgement(records, UNKNOWN_ON_2026_09_12), []);
});

test("🔴 the writing record is CORRECTED, not re-verified: UNKNOWN, PARTIAL_EVIDENCE, same checker, date, source and previous", () => {
  const w = byId.get(WRITING).verification;
  assert.deepEqual([w.state, w.verdict, w.reason], ["UNKNOWN", "UNKNOWN", "PARTIAL_EVIDENCE"]);
  assert.deepEqual([w.checkedOn, w.checkedBy, w.sourceUrl, w.sourceTier, w.sourceRead], ["2026-09-13", "human:beta-g (Cowork)", "https://oet.com/ready/writing", "OFFICIAL", true]);
  assert.deepEqual([w.previous.state, w.previous.reason, w.previous.checkedOn], ["UNKNOWN", "SOURCE_UNREACHABLE", "2026-09-12"]);
  assert.equal(w.recheckAfter, undefined, "an UNKNOWN record carries no recheck date of a verification it does not have");
});

/* ---- D-GUARD-1 · each limb ALONE, by injection ---------------------------- */

test("🔴 LIMB 1 · a supplied count is REFUSED (F25) and ignored — elementsNotFound: 0 on a record whose list says 3", () => {
  const recs = withVerification(WRITING, { elementsNotFound: 0 });
  assert.deepEqual(lawsOf(recs), ["F25"], "the supplied count tripped more — or less — than its own limb");
  const j = judgeLeavingUnknown(WRITING, recs.find((r) => r.id === WRITING).verification, byId.get(WRITING).claimElements);
  assert.equal(j.decision, "REFUSED", "a supplied 0 changed the guard's answer");
  assert.equal(j.elements.notConfirmed, 3);
});

test("🔴 LIMB 2 · a verdict key the record does not declare is STALE (F26) — and confirms nothing", () => {
  const w = byId.get(WRITING).verification;
  const recs = withVerification(WRITING, { elementsConfirmedKeys: [...w.elementsConfirmedKeys, "invented-element"] });
  assert.deepEqual(lawsOf(recs), ["F26"]);
  const j = judgeLeavingUnknown(WRITING, recs.find((r) => r.id === WRITING).verification, byId.get(WRITING).claimElements);
  assert.deepEqual([j.elements.confirmed, [...j.elements.stale]], [3, ["invented-element"]]);
});

test("🔴 LIMB 3 · an element the verdict leaves UNMENTIONED is NOT CONFIRMED — the record is refused advancement (F24)", () => {
  const recs = withVerification(LICENCE, { elementsConfirmedKeys: [] });
  assert.deepEqual(lawsOf(recs), ["F24"], "an unmentioned element was counted as confirmed by omission");
  const j = judgeLeavingUnknown(LICENCE, recs.find((r) => r.id === LICENCE).verification, byId.get(LICENCE).claimElements);
  assert.deepEqual([j.decision, j.elements.notConfirmed], ["REFUSED", 1]);
});

test("🔴 LIMB 4 · a governed record with NO element list is a FAILURE (F27) — and nothing of it counts as confirmed", () => {
  const recs = records.map((r) => (r.id === WRITING ? { ...r, claimElements: undefined } : r));
  assert.deepEqual(lawsOf(recs), ["F27"]);
  const j = judgeLeavingUnknown(WRITING, byId.get(WRITING).verification, undefined);
  assert.deepEqual([j.decision, j.elements.missingList, j.elements.confirmed], ["REFUSED", true, 0]);
});

test("reconciliation, stated once: declared ∩ named-confirmed; silence and contradiction are not confirmation", () => {
  const e = reconcileElements(["a", "b", "c"], { elementsConfirmedKeys: ["a", "c", "z"], elementsNotFoundKeys: ["c"] });
  assert.deepEqual([[...e.confirmed], [...e.notConfirmed], [...e.stale], [...e.contradictory]], [["a"], ["b", "c"], ["z"], ["c"]]);
  assert.equal(reconcileElements(undefined, {}).listed, null);
});

/* ---- 3C · the split was the sources' doing ------------------------------ */

test("🔴 3C · all four were attempted IDENTICALLY in ONE pass by the same verifier", () => {
  const four = GOVERNED.map((id) => byId.get(id).verification);
  assert.equal(new Set(four.map((x) => x.pass)).size, 1);
  assert.match(four[0].pass, /attempted identically in one pass/);
  assert.deepEqual([...new Set(four.map((x) => x.checkedOn))], ["2026-09-13"]);
  assert.deepEqual([...new Set(four.map((x) => x.checkedBy))], ["human:beta-g (Cowork)"]);
});

/* ---- 1A · NO OET TEXT ---------------------------------------------------- */

test("🔴 1A · NO OET TEXT IN THE REPOSITORY — the policy wording it had quoted, found by hash, occurs nowhere in the current tree", () => {
  const r = forbiddenTextCensus();
  assert.ok(r.scanned > 200, `only ${r.scanned} files scanned`);
  assert.deepEqual(r.hits, [], `stored OET wording: ${r.hits.map((h) => `${h.file}@${h.wordIndex}`).join(", ")}`);
});

test("CONTROL: the census DOES find a phrase it holds the hash of — so its zero means something", () => {
  const planted = "a harmless test phrase nobody wrote down anywhere";
  const words = normaliseWords(planted);
  const sha = execFileSync(process.execPath, ["-e", `process.stdout.write(require("crypto").createHash("sha256").update(${JSON.stringify(words.join(" "))}).digest("hex"))`], { encoding: "utf8" });
  const r = forbiddenTextCensus({ sources: [{ file: "x.md", text: `before. ${planted.toUpperCase()}! after` }], hashes: [{ words: words.length, sha256: sha, what: "planted" }] });
  assert.equal(r.hits.length, 1);
  assert.equal(FORBIDDEN_PHRASE_HASHES.length, 5);
});

test("🔴 1A · the four records store element keys, verdict, URL, date and tier — no count, no quoted span, no OET wording", () => {
  const allowed = new Set(["state", "verdict", "reason", "verdictWords", "checkedOn", "checkedBy", "sourceUrl", "attempts", "sourceTier", "sourceRead", "elementsConfirmedKeys", "elementsNotFoundKeys", "recheckAfter", "recheckWindowDays", "pass", "note", "previous"]);
  for (const id of GOVERNED) {
    const r = byId.get(id);
    assert.ok(Array.isArray(r.claimElements) && r.claimElements.length > 0, `${id}: no declared element list`);
    for (const k of r.claimElements) assert.match(k, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${id}: element key ${k} is not a short stable key`);
    assert.equal(r.evidence.quotedSpan ?? null, null);
    for (const k of Object.keys(r.verification)) assert.ok(allowed.has(k), `${id}: unexpected verification field ${k}`);
    assert.match(r.verification.note, /no OET text/);
  }
});

/* 🔴 PINNED AS HASHES, NOT READ FROM HISTORY — a depth-1 clone (and CI) does not have main's older commits.
 * sha256 of JSON.stringify(value) and JSON.stringify(evidence) for each record as committed on main (9995edd). */
const ON_MAIN = Object.freeze({
  [LICENCE]: { value: "59eae93e7cd619eccde8e9f72894130cca17d4e2e13e9564996dfd04707011f5", evidence: "b6980e6d778e58aa7601d1f80e907b3eb1658ee1518cd7e46d9c0671e1832083" },
  [WRITING]: { value: "6349d5afbef13b5e19b0cbbc9afabe3735660acc89ae9c886e50423611fd70ee", evidence: "ae6f858e03c35ed2d918e583c6e6286d01a60cc98d6a06ef992904bfd15b6c4f" },
  [SPEAKING]: { value: "3307859cc7ce98608c10c34e126706632d0440ef2172addc147fb20447531b25", evidence: "3ceb60b9744185307d2ec3aa76013e9ce7583aca4dcf2fe01619e98226a1edf5" },
  [GRADES]: { value: "442f7939b076a8b1a9577865d448d22b816b736a096973c7f69a81eea37e52dc", evidence: "6bef225f82cbc681b57a5e1885ca532de9b75dfff606b42876d2f833a019822f" },
});

test("🔴 1C · no value amended and no evidence touched — each hashes exactly as on main, through the correction too", async () => {
  const { createHash } = await import("node:crypto");
  const sha = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
  for (const id of GOVERNED) {
    const r = byId.get(id);
    assert.equal(sha(r.value), ON_MAIN[id].value, `${id}: the value differs from main`);
    assert.equal(sha(r.evidence), ON_MAIN[id].evidence, `${id}: the evidence differs from main`);
  }
});
