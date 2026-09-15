/**
 * 🔴 THE LEDGER'S PROVENANCE — A ROW MAY NOT CREDIT THE WRONG AUTHORITY.
 *
 * Rows 59, 60 and 61 once read "(frozen `null`, moved by Amendment 4) · ruled in `A3`": admitted rows claiming
 * to have been moved, by an amendment that never touched them. The check below reads the GENERATED ledger back,
 * so a generator that regresses is caught in its output, not only in its source.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { provenanceErrors, classClause } from "../src/checklist/provenance.mjs";
import { loadBoundaries } from "../src/checklist/boundaries.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const LEDGER = readFileSync(`${REPO}CHECKLIST_BOUNDARIES.md`, "utf8").replace(/\r\n/g, "\n");

/** Replace exactly one occurrence, refusing if the text to sabotage is not there once — a RED must land. */
const once = (text, from, to) => {
  const n = text.split(from).length - 1;
  assert.equal(n, 1, `the text to sabotage occurs ${n} time(s), not once — the RED would not land`);
  return text.replace(from, to);
};
/** The state line of ONE row, found by its own heading — never by wording that other rows may share. */
const onRow = (text, id, from, to) => {
  const re = new RegExp(`(### ${id} · [^\\n]*\\n\\n)([^\\n]*)`);
  const m = re.exec(text);
  assert.ok(m, `row ${id} has no state line — the RED would not land`);
  assert.equal(m[2].split(from).length - 1, 1, `row ${id}'s state line does not contain the text to sabotage exactly once — the RED would not land`);
  return text.replace(re, `$1${m[2].replace(from, to)}`);
};

test("🟢 GREEN: every row of the generated ledger states its authority consistently — against itself and the loaded boundaries", () => {
  const b = loadBoundaries();
  const { errors, checked } = provenanceErrors(LEDGER, b);
  assert.deepEqual(errors, []);
  assert.equal(checked, Object.keys(b).length, "the check did not read every row");
  assert.equal(checked, 61);
});

test("the admitted rows say who admitted them, and nothing about a move", () => {
  // The class clause is what this test is about — a row's STATE may move by work; who admitted it may not.
  assert.match(LEDGER, /### 59 · [^\n]*\n\n\*\*[A-Z-]+\*\* · class `P` \(admitted by Amendment 3\) · ruled in `A3`/);
  assert.match(LEDGER, /### 60 · [^\n]*\n\n\*\*[A-Z-]+\*\* · class `P` \(admitted by Amendment 3\) · ruled in `A3`/);
  assert.match(LEDGER, /### 61 · [^\n]*\n\n\*\*[A-Z-]+\*\* · class `P` \(admitted by Amendment 5\) · ruled in `A5`/);
  assert.doesNotMatch(LEDGER, /frozen `null`/);
  const b = loadBoundaries();
  assert.equal(classClause(b[59]), " (admitted by Amendment 3)");
  assert.equal(classClause(b[61]), " (admitted by Amendment 5)");
});

test("CONTROL: a row Amendment 4 really moved keeps its moved clause, and passes", () => {
  // row 4 was built on 15 Sep 2026 (BUILT-NOT-PROVED) — its state changed, its provenance clause did not
  assert.match(LEDGER, /### 4 · Localized Human Thinking\n\n\*\*BUILT-NOT-PROVED\*\* · class `P` \(frozen `D`, moved by Amendment 4\) · ruled in `§6`/);
  assert.equal(classClause(loadBoundaries()[4]), " (frozen `D`, moved by Amendment 4)");
});

test("🔴 RED: the old wording — an admitted row that 'was moved', from a frozen class of null — is REFUSED", () => {
  const bad = onRow(LEDGER, 59, "(admitted by Amendment 3)", "(frozen `null`, moved by Amendment 4)");
  const { errors } = provenanceErrors(bad, loadBoundaries());
  const mine = errors.filter((e) => e.startsWith("item 59:"));
  assert.ok(mine.some((e) => /frozen class of `null`/.test(e)), mine.join(" | "));
  assert.ok(mine.some((e) => /moved by Amendment 4" but it is ruled in `A3`/.test(e)), mine.join(" | "));
  assert.ok(errors.every((e) => e.startsWith("item 59:")), `the sabotage of row 59 tripped another row: ${errors.join(" | ")}`);
});

test("🔴 RED: a class clause naming one amendment and a ruled-in clause naming another is REFUSED", () => {
  const bad = once(LEDGER, "**BUILT-NOT-PROVED** · class `P` (admitted by Amendment 5) · ruled in `A5`", "**BUILT-NOT-PROVED** · class `P` (admitted by Amendment 3) · ruled in `A5`");
  const { errors } = provenanceErrors(bad);
  assert.deepEqual(errors, ["item 61: its class clause names Amendment 3 but it is ruled in `A5`"]);
});

test("🔴 RED: a row ruled in an admitting amendment whose class clause says nothing of it is REFUSED; so is a moved row the boundaries say was not moved", () => {
  const silent = once(LEDGER, "class `P` (admitted by Amendment 5) · ruled in `A5`", "class `P` · ruled in `A5`");
  assert.deepEqual(provenanceErrors(silent).errors, ["item 61: it is ruled in `A5`, an admitting amendment, but its class clause does not say it was admitted"]);
  const falseMove = onRow(LEDGER, 58, "class `P` · ruled in `§6`", "class `P` (frozen `D`, moved by Amendment 4) · ruled in `§6`");
  assert.ok(provenanceErrors(falseMove, loadBoundaries()).errors.some((e) => /the boundaries say not moved, the ledger's class clause does not agree/.test(e)));
});
