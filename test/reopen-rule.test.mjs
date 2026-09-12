/**
 * 🔴 LOSING A VERIFIED-PASS — THE CHECKLIST'S REOPEN RULE, EXECUTED.
 *
 * The seven states had rules for leaving FAILED and none for losing a tick. The
 * checklist had the rule in prose; this is the rule as a law with a test.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  REOPEN_RULE_TEXT, REOPEN_REASONS, classify, assertTransitions, BEFORE_AMENDMENT_2, MOVES_AMENDMENT_2,
} from "../src/checklist/classification.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("🔴 the rule in code is the checklist's sentence, VERBATIM", () => {
  const source = readFileSync(`${REPO}KEY_FEATURE_CHECKLIST_SOURCE.md`, "utf8").replace(/\s+/g, " ");
  assert.ok(source.includes(REOPEN_RULE_TEXT), "the reopen rule in code is not the frozen checklist's words");
  assert.equal(REOPEN_REASONS.length, 5);
});

const passBefore = { ...BEFORE_AMENDMENT_2, 8: "VERIFIED-PASS" };
const at8 = (state) => {
  const rows = classify();
  rows[8] = { ...rows[8], state, test: "t", failureMet: "x" };
  return rows;
};
const reopen = (over = {}) => ({ ...MOVES_AMENDMENT_2, 8: [{ from: "VERIFIED-PASS", to: "FAILED", kind: "work", route: "REOPENED", reopenReason: "REAL_REGRESSION", evidence: ["runs/x.jsonl shows the regression"], date: "2026-09-13", reason: "a check stopped firing", ...over }] });

test("🔴 RED: a tick quietly dropped to BUILT-NOT-PROVED with no declared move is REFUSED", () => {
  const errors = assertTransitions(at8("BUILT-NOT-PROVED"), passBefore, MOVES_AMENDMENT_2);
  assert.ok(errors.some((e) => /item 8: loses VERIFIED-PASS for BUILT-NOT-PROVED by no declared route/.test(e)), errors.join("\n"));
});

test("🔴 RED: a reopen for a reason that is not one of the five is REFUSED", () => {
  const errors = assertTransitions(at8("FAILED"), passBefore, reopen({ reopenReason: "FELT_WRONG" }));
  assert.ok(errors.some((e) => /loses VERIFIED-PASS for FAILED by route REOPENED/.test(e)), errors.join("\n"));
});

test("🔴 RED: a reopen with no evidence is REFUSED", () => {
  const errors = assertTransitions(at8("FAILED"), passBefore, reopen({ evidence: [] }));
  assert.ok(errors.some((e) => /loses VERIFIED-PASS/.test(e)));
});

test("🔴 RED: a tick moved by any other route is REFUSED", () => {
  const errors = assertTransitions(at8("TESTABLE-NOW"), passBefore, reopen({ route: "TEST_RUN", to: "TESTABLE-NOW" }));
  assert.ok(errors.some((e) => /loses VERIFIED-PASS for TESTABLE-NOW by route TEST_RUN/.test(e)));
});

test("CONTROL: a lawful reopen — one of the five, with evidence, date and reason — is accepted", () => {
  assert.deepEqual(assertTransitions(at8("FAILED"), passBefore, reopen()), []);
});

test("CONTROL: an owner-approved scope change is a RULING reopen, and must be declared as one", () => {
  const asWork = reopen({ reopenReason: "OWNER_APPROVED_SCOPE_CHANGE" });
  assert.ok(assertTransitions(at8("FAILED"), passBefore, asWork).some((e) => /only an owner ruling is a ruling move/.test(e)));
  const asRuling = reopen({ reopenReason: "OWNER_APPROVED_SCOPE_CHANGE", kind: "ruling" });
  assert.deepEqual(assertTransitions(at8("FAILED"), passBefore, asRuling), []);
});

test("🔴 REAL: item 48 lost its tick by a LAWFUL reopen — concrete contradictory evidence, cited", () => {
  const [move] = MOVES_AMENDMENT_2[48];
  assert.equal(move.from, "VERIFIED-PASS");
  assert.equal(move.to, "FAILED");
  assert.equal(move.route, "REOPENED");
  assert.equal(move.reopenReason, "CONCRETE_CONTRADICTORY_EVIDENCE");
  assert.ok(move.evidence.some((e) => /868 extra copies/.test(e)));
  assert.deepEqual(assertTransitions(classify()), []);
  assert.equal(classify()[48].state, "FAILED");
});
