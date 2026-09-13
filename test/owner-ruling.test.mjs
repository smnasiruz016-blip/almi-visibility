/**
 * 🔴 THE OWNER'S COMPLETION RULING OF 13 SEPTEMBER 2026 — FROZEN, AND APPLIED.
 *
 * Its text is verified against git's stored blob (never the checked-out bytes —
 * E-CL-2), its five reopen grounds govern the ledger in his wording, and item 9
 * carries his ruling on the row.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  verifyRuling, bodyOf, blobOf, RULING_FILE, EXPECTED_BLOB, COMPLETION_LOOP, OWNER_REOPEN_SENTENCE, FREEZE_LINE,
} from "../tools/verify-owner-ruling.mjs";
import { OWNER_REOPEN_RULE_TEXT, REOPEN_RULE_TEXT, REOPEN_REASONS, classify, assertLawful } from "../src/checklist/classification.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BYTES = readFileSync(`${REPO}${RULING_FILE}`);
const BODY = bodyOf(BYTES);

/* ---- 1A · frozen, and the verifier cannot pass vacuously ------------------ */

test("🔴 the ruling verifies: git blob, body hash, the loop, the reopen grounds, and his closing instruction", () => {
  const r = verifyRuling();
  assert.deepEqual(r.checks, { blobMatches: true, bodyMatches: true, hasCompletionLoop: true, hasReopenGrounds: true, endsWithFreeze: true });
  assert.equal(r.blob, EXPECTED_BLOB);
});

test("🔴 RED: one corrupted byte in HIS text fails the blob AND the body; the original bytes pass again", () => {
  const i = BYTES.indexOf(Buffer.from("Target fast completion"));
  assert.ok(i > 0, "the byte to corrupt was not found — the RED would not land");
  const bad = Buffer.from(BYTES);
  bad[i] = "t".charCodeAt(0);
  assert.notDeepEqual(bad, BYTES, "the corruption changed nothing");
  const red = verifyRuling({ bytes: bad });
  assert.equal(red.ok, false);
  assert.deepEqual([red.checks.blobMatches, red.checks.bodyMatches], [false, false]);
  assert.equal(verifyRuling({ bytes: BYTES }).ok, true);
});

test("🔴 E-CL-2 cannot recur here: the same text checked out with CRLF has the SAME blob", () => {
  const crlf = Buffer.from(BYTES.toString("utf8").replace(/\r?\n/g, "\r\n"), "utf8");
  assert.equal(blobOf(crlf), EXPECTED_BLOB);
  assert.equal(verifyRuling({ bytes: crlf }).ok, true);
});

test("1B/1C: the header records the precedence, and the body carries the loop exactly as he wrote it", () => {
  const header = BYTES.toString("utf8").split("\n---\n")[0];
  for (const w of ["says WHAT", "say WHEN", "HOW THE PATH TO DONE IS WALKED", "All three bind"]) assert.ok(header.includes(w), w);
  assert.ok(BODY.includes(COMPLETION_LOOP));
  assert.ok(BODY.trimEnd().endsWith(FREEZE_LINE));
});

/* ---- 1D · the five reopen grounds, in his wording ------------------------- */

test("🔴 1D: the ledger's reopen grounds are the OWNER's sentence — and the two that differed from the checklist are named", () => {
  assert.equal(OWNER_REOPEN_RULE_TEXT, OWNER_REOPEN_SENTENCE);
  assert.ok(BODY.includes(OWNER_REOPEN_RULE_TEXT));
  assert.deepEqual(REOPEN_REASONS, ["CONCRETE_CONTRADICTORY_EVIDENCE", "REAL_REGRESSION", "AUTHORITATIVE_REQUIREMENT_CHANGE", "SAFETY_OR_DATA_RISK", "OWNER_APPROVED_SCOPE_CHANGE"]);
  // the checklist said something else on two grounds; his wording won
  assert.match(REOPEN_RULE_TEXT, /new authoritative evidence/);
  assert.match(REOPEN_RULE_TEXT, /security\/data-safety risk/);
  assert.ok(!BODY.includes("new authoritative evidence"));
  assert.ok(BODY.includes("authoritative requirement change") && BODY.includes("safety/data risk"));
  const register = readFileSync(`${REPO}PHASE_0_FROZEN_GAP_REGISTER.md`, "utf8");
  assert.match(register, /new authoritative evidence[\s\S]{0,200}authoritative requirement change/);
});

/* ---- PART 2 · item 9 ------------------------------------------------------ */

test("🔴 ITEM 9 — BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE, with its missing evidence, blocker, unlock condition and his sentence", () => {
  const r = classify()[9];
  assert.equal(r.state, "BLOCKED-UNKNOWN");
  assert.equal(r.label, "BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE");
  assert.match(r.missingEvidence, /downstream outcome tied to a search/);
  assert.match(r.blocker, /0 of 36 product repositories/);
  assert.match(r.blocker, /NO SEARCH SOURCE/);
  assert.match(r.blocker, /cannot read product databases/);
  assert.ok(r.unlockCondition.length > 200, "the unlock condition does not tell a later reader what to do");
  assert.ok(BODY.includes(r.ownerSentence), "the owner's sentence on the row is not his sentence");
  assert.match(r.why, /NOT the machinery declaring failure/);
  assert.match(r.why, /Six of seven dimensions are ingested and complete/);
});

test("🔴 RED: an external-prerequisite label that drops any of its three specifics is refused", () => {
  for (const field of ["missingEvidence", "blocker", "unlockCondition"]) {
    const rows = classify();
    rows[9] = { ...rows[9], [field]: "" };
    assert.ok(assertLawful(rows).some((e) => /BY EXTERNAL PREREQUISITE/.test(e) && e.includes(field)), `dropping ${field} was accepted`);
  }
  assert.deepEqual(assertLawful(classify()), []);
});
