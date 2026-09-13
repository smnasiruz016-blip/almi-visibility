/**
 * 🔴 ITEM 56 — VERIFIED-PASS BY OWNER VERIFICATION, AND BY NOTHING ELSE.
 *
 * The owner's ruling (§4): "Owner visual check ke baad hi Item 56 ko VERIFIED-PASS
 * mark karo. Automated GREEN is owner-eye requirement ko replace nahi karta." So
 * no automated run may ever set item 56 — only a dated owner verification record
 * can — and every way around that is tried here and refused.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

import { classify, assertTransitions, BEFORE_AMENDMENT_2, MOVES_AMENDMENT_2, OWNER_VERIFIED_ITEMS } from "../src/checklist/classification.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const DIR = "runs/owner-verification/item-56-2026-09-13";
const RECORD = JSON.parse(readFileSync(`${REPO}${DIR}/owner-verification.json`, "utf8"));
const RULING = readFileSync(`${REPO}OWNER_RULING_2026-09-13_COMPLETION_LAW.md`, "utf8").replace(/\r\n/g, "\n");
const blob = (rel) => execFileSync("git", ["hash-object", rel], { cwd: REPO, encoding: "utf8" }).trim();

test("🔴 item 56 is VERIFIED-PASS by OWNER VERIFICATION on 13 September 2026, its move declared and lawful", () => {
  const r = classify()[56];
  assert.equal(r.state, "VERIFIED-PASS");
  const chain = MOVES_AMENDMENT_2[56];
  assert.equal(chain.length, 1);
  assert.deepEqual([chain[0].from, chain[0].to, chain[0].route, chain[0].kind, chain[0].date], ["BLOCKED-UNKNOWN", "VERIFIED-PASS", "OWNER_VERIFICATION", "work", "2026-09-13"]);
  assert.equal(chain[0].record, `${DIR}/owner-verification.json`);
  assert.deepEqual(OWNER_VERIFIED_ITEMS, [56]);
  assert.deepEqual(assertTransitions(classify()), []);
});

test("🔴 the owner's criteria are on the row in HIS words — and beauty is not the question", () => {
  const r = classify()[56];
  assert.ok(RULING.includes(r.criteriaOwnerWords), "the criteria on the row are not the owner's sentence");
  assert.match(r.criteriaOwnerWords, /khoobsurti ka nahi/);
  assert.equal(RECORD.criteriaOwnerWords, r.criteriaOwnerWords);
  assert.deepEqual(r.criteria, ["critical information readable", "workflow understandable", "controls and links usable", "no clipping, overlap or broken critical view", "beauty is not the question"]);
});

test("🔴 the four screenshots are committed beside the row, tracked, and match the record — pinned as git BLOBS", () => {
  assert.equal(RECORD.screenshots.length, 4);
  const tracked = execFileSync("git", ["ls-files", DIR], { cwd: REPO, encoding: "utf8" }).split("\n").filter(Boolean);
  for (const s of RECORD.screenshots) {
    const rel = `${DIR}/${s.file}`;
    assert.ok(existsSync(`${REPO}${rel}`), `${s.file} is not in the repository`);
    assert.ok(tracked.includes(rel), `${s.file} is not committed`);
    assert.equal(blob(rel), s.blob, `${s.file} is not the screenshot the owner's record names`);
  }
  assert.deepEqual([RECORD.item, RECORD.date, RECORD.verifiedBy, RECORD.result], [56, "2026-09-13", "owner", "VERIFIED-PASS"]);
});

test("🔴 the finding beta-g raised AND the owner's ruling on it are both recorded — an overruled finding is still a finding", () => {
  const r = classify()[56];
  assert.match(r.findingRaised, /cost ledger's lines extend past a narrow viewport/);
  assert.match(r.findingRaised, /horizontal scrolling/);
  assert.match(r.ownerRulingOnFinding, /NOT CLIPPING/);
  assert.match(r.ownerRulingOnFinding, /nothing is lost/);
  assert.equal(RECORD.findingRaised.status, "RAISED");
  assert.match(RECORD.ownerRulingOnFinding.ruling, /NOT CLIPPING/);
  assert.match(readFileSync(`${REPO}POST_DONE_BACKLOG.md`, "utf8"), /PD-1[\s\S]*horizontal scrolling/);
});

test("the record says which widths its screenshots hold — it does not let four narrow images pass for both", () => {
  assert.match(RECORD.widthsRecorded, /narrow/);
  assert.match(RECORD.widthsRecorded, /desktop/);
  assert.match(classify()[56].evidenceNote, /narrow/);
});

/* ---- 3E · THE GUARD: no automated run may set item 56 ------------------- */

const rows56 = () => classify();
const withMove = (over) => ({ ...MOVES_AMENDMENT_2, 56: [{ ...MOVES_AMENDMENT_2[56][0], ...over }] });
const ownerRecord = () => RECORD;

for (const route of ["TEST_RUN", "RETEST_PASSED", "INPUT_EXISTS", "OWNER_RULING"]) {
  test(`🔴 RED: item 56 set VERIFIED-PASS by route ${route} — an automated or non-verification route — is REFUSED`, () => {
    const errors = assertTransitions(rows56(), BEFORE_AMENDMENT_2, withMove({ route, test: "node bin/report.mjs", kind: route === "OWNER_RULING" ? "ruling" : "work", ruling: "x", reason: "looks fine" }), ownerRecord);
    assert.ok(errors.some((e) => /item 56: reaches VERIFIED-PASS by route/.test(e) && /only a dated owner verification record/.test(e)), errors.join("\n"));
  });
}

test("🔴 RED: an owner-verification move with no date, or no record, is REFUSED", () => {
  assert.ok(assertTransitions(rows56(), BEFORE_AMENDMENT_2, withMove({ date: undefined }), ownerRecord).some((e) => /item 56: .*date and a record/.test(e)));
  assert.ok(assertTransitions(rows56(), BEFORE_AMENDMENT_2, withMove({ record: undefined }), ownerRecord).some((e) => /item 56: .*date and a record/.test(e)));
});

test("🔴 RED: a record that is missing, not the owner's, for another date or another item is REFUSED", () => {
  const cases = [() => null, () => ({ ...RECORD, verifiedBy: "bin/report.mjs" }), () => ({ ...RECORD, date: "2026-09-14" }), () => ({ ...RECORD, item: 57 }), () => ({ ...RECORD, screenshots: [] })];
  for (const read of cases) {
    const errors = assertTransitions(rows56(), BEFORE_AMENDMENT_2, MOVES_AMENDMENT_2, read);
    assert.ok(errors.some((e) => /item 56: .*owner verification record/.test(e)), `accepted: ${JSON.stringify(read())?.slice(0, 80)}`);
  }
});

test("🔴 RED: item 56 at VERIFIED-PASS with NO declared move at all is REFUSED", () => {
  const moves = { ...MOVES_AMENDMENT_2 };
  delete moves[56];
  assert.ok(assertTransitions(rows56(), BEFORE_AMENDMENT_2, moves, ownerRecord).some((e) => /item 56/.test(e)));
});

test("🔴 RED: the OWNER_VERIFICATION route cannot be borrowed by another row to tick it", () => {
  const rows = classify();
  rows[25] = { ...rows[25], state: "VERIFIED-PASS" };
  const moves = { ...MOVES_AMENDMENT_2, 25: [...MOVES_AMENDMENT_2[25], { from: "TESTABLE-NOW", to: "VERIFIED-PASS", kind: "work", route: "OWNER_VERIFICATION", date: "2026-09-13", record: `${DIR}/owner-verification.json` }] };
  assert.ok(assertTransitions(rows, BEFORE_AMENDMENT_2, moves, ownerRecord).some((e) => /item 25: route OWNER_VERIFICATION belongs only to/.test(e)));
});

test("CONTROL: the real move and the real record are accepted", () => {
  assert.deepEqual(assertTransitions(classify(), BEFORE_AMENDMENT_2, MOVES_AMENDMENT_2, ownerRecord), []);
});
