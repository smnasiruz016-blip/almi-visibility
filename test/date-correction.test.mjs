/**
 * 🔴 RR-153 TIMING CORRECTION · F05 · DECLARED DATE CORRECTION (src/authority/date-correction.mjs; the owner's ruling, _handoffs b91ef2a).
 *
 *   D1 a block is parsed only in its declared shape; a malformed or unclosed one refuses
 *   D2 applied, the target takes the corrected date and its source NAMES the correction and the file-name date — the input is not mutated
 *   D3 refusals, each with a control that applies: an unknown target or declarer, a declarer that is not OWNER, a date in the correction's
 *      own future, a second correction of one target
 *   D4 the real corpus: the five records the owner's correction names read 3 October and stay CURRENT; nothing else moved
 */
import test from "node:test";
import assert from "node:assert/strict";
import { declaredDateCorrections, applyDateCorrections, DateCorrectionRefused } from "../src/authority/date-correction.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";

const block = (target, date = "2026-10-03", reason = "the named date was an error") => `DATE-CORRECTION v1\ntarget: ${target}\neffectiveFrom: ${date}\nreason: ${reason}\nEND DATE-CORRECTION\n`;
const rec = (id, issuedAt, issuerClass = "OWNER") => ({ authorityId: id, issuedAt, effectiveFrom: issuedAt, issuedAtSource: "FILE_NAME", issuer: { class: issuerClass } });
const CORPUS = [rec("g:decl", "2026-10-03"), rec("g:target", "2026-10-04"), rec("g:other", "2026-10-04"), rec("g:cc", "2026-10-03", "BETA_G")];
const refusedWith = (fn, code) => { try { fn(); } catch (e) { return e instanceof DateCorrectionRefused && e.code === code; } return false; };

test("D1 · a DATE-CORRECTION block is read only in its declared shape — an unknown line, a missing field or an unclosed block refuses", () => {
  assert.deepEqual(declaredDateCorrections(`prose\n${block("g:target")}more prose`), [{ target: "g:target", effectiveFrom: "2026-10-03", reason: "the named date was an error" }]);
  assert.deepEqual(declaredDateCorrections("no block here"), []);
  assert.ok(refusedWith(() => declaredDateCorrections("DATE-CORRECTION v1\ntarget: g:x\neffectiveFrom: 2026-10-03\nreason: r\n"), "DATE_CORRECTION_MALFORMED"), "an unclosed block was accepted");
  assert.ok(refusedWith(() => declaredDateCorrections(block("g:x").replace("reason: the named date was an error\n", "")), "DATE_CORRECTION_MALFORMED"), "a block with no reason was accepted");
  assert.ok(refusedWith(() => declaredDateCorrections(block("g:x", "3 Oct")), "DATE_CORRECTION_MALFORMED"), "a non-ISO date was accepted");
  assert.ok(refusedWith(() => declaredDateCorrections(block("g:x").replace("reason:", "signedBy: x\nreason:")), "DATE_CORRECTION_MALFORMED"), "an unknown line was accepted");
});

test("D2 · applied: the target takes the corrected date, its source NAMES the correction and the date its file name carried; nothing else moves; the input is not mutated", () => {
  const out = applyDateCorrections(CORPUS, [{ declarer: "g:decl", target: "g:target", effectiveFrom: "2026-10-03", reason: "r" }]);
  const t = out.find((r) => r.authorityId === "g:target");
  assert.deepEqual([t.issuedAt, t.effectiveFrom], ["2026-10-03", "2026-10-03"]);
  assert.equal(t.issuedAtSource, "DATE_CORRECTION — named 2026-10-04, corrected by g:decl", "the original date or the correcting record is not named");
  assert.deepEqual(out.find((r) => r.authorityId === "g:other"), CORPUS[2], "a record the correction does not name moved");
  assert.equal(CORPUS[1].issuedAt, "2026-10-04", "the input was mutated");
  assert.deepEqual(applyDateCorrections(CORPUS, []), CORPUS, "with no correction, something moved");
});

test("D3 · refused, each with a control that applies: an unknown target, an unknown declarer, a declarer not OWNER-issued, a date in the correction's own future, a second correction", () => {
  const ok = { declarer: "g:decl", target: "g:target", effectiveFrom: "2026-10-03", reason: "r" };
  assert.ok(applyDateCorrections(CORPUS, [ok]), "CONTROL: a lawful correction was refused");
  assert.ok(refusedWith(() => applyDateCorrections(CORPUS, [{ ...ok, target: "g:missing" }]), "DATE_CORRECTION_TARGET_UNKNOWN"));
  assert.ok(refusedWith(() => applyDateCorrections(CORPUS, [{ ...ok, declarer: "g:missing" }]), "DATE_CORRECTION_DECLARER_UNKNOWN"));
  assert.ok(refusedWith(() => applyDateCorrections(CORPUS, [{ ...ok, declarer: "g:cc" }]), "DATE_CORRECTION_NOT_OWNER"), "a non-owner record corrected a date");
  assert.ok(refusedWith(() => applyDateCorrections(CORPUS, [{ ...ok, effectiveFrom: "2026-10-05" }]), "DATE_CORRECTION_IN_FUTURE"), "a correction moved a record into its own future");
  assert.ok(refusedWith(() => applyDateCorrections(CORPUS, [ok, { ...ok }]), "DATE_CORRECTION_DUPLICATE"));
});

test("D4 · THE REAL CORPUS: the five records the owner's correction names read 3 October, each naming its correction, and stay CURRENT", () => {
  const corrected = AUTHORITY_CORPUS.filter((r) => String(r.issuedAtSource).startsWith("DATE_CORRECTION"));
  assert.equal(corrected.length, 5, "the five corrections did not all apply — or another record was corrected");
  for (const r of corrected) {
    assert.deepEqual([r.issuedAt, r.effectiveFrom, r.status], ["2026-10-03", "2026-10-03", "CURRENT"], r.authorityId);
    assert.match(r.issuedAtSource, /named 2026-10-04, corrected by _handoffs:AlmiVisibility_OWNER_DECISION_2026-10-03_RR-153_DATE_CORRECTION\.md$/);
    assert.match(r.authorityId, /2026-10-04/, "a record's name was rewritten");
  }
});
