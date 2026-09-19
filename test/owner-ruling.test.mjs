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
import { execFileSync } from "node:child_process";

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

/* 🔴 E-CL-3 — the first version of this test asserted that CRLF bytes hash to the same blob on ANY
 * machine. That is only true where git converts line endings on the way in (core.autocrlf=true, as on
 * the Windows machine that checks the file out as CRLF). The Linux CI runner has no such setting — and
 * it never sees CRLF, because it checks the file out as LF. So the Windows condition is now STATED to
 * git explicitly, and the test holds on both platforms for the reason that is actually true. */
test("🔴 E-CL-2 cannot recur here: a Windows CRLF checkout (core.autocrlf=true) has the SAME blob as the LF file", () => {
  const crlf = Buffer.from(BYTES.toString("utf8").replace(/\r?\n/g, "\r\n"), "utf8");
  const windowsBlob = execFileSync("git", ["-c", "core.autocrlf=true", "hash-object", "--stdin", `--path=${RULING_FILE}`], { cwd: REPO, input: crlf, encoding: "utf8" }).trim();
  assert.equal(windowsBlob, EXPECTED_BLOB);
  const lf = Buffer.from(BYTES.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  const linuxBlob = execFileSync("git", ["-c", "core.autocrlf=false", "hash-object", "--stdin", `--path=${RULING_FILE}`], { cwd: REPO, input: lf, encoding: "utf8" }).trim();
  assert.equal(linuxBlob, EXPECTED_BLOB, "the LF checkout a Linux runner holds does not hash to the pinned blob");
  assert.equal(blobOf(BYTES), EXPECTED_BLOB, "this machine's own checkout does not verify");
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

/* 🔴 19 SEPTEMBER 2026 — ROW 9 LEFT THIS LABEL, AND THE RULING'S REQUIREMENT DID NOT LEAVE WITH IT.
 *
 * The 13 September ruling's subject is the downstream-outcome EVIDENCE, not the whole row: what is
 * unavailable without connected-product instrumentation must be recorded BLOCKED / UNKNOWN BY EXTERNAL
 * PREREQUISITE, with its missing evidence, blocker and unlock condition. The later ruling of 18 September
 * (FROZEN TERMINAL SEMANTICS, ROW 9 ONLY) settled that such a dimension does not by itself hold the ROW open.
 *
 * So the dimension keeps every specific the 13 September ruling demanded, and this test now checks exactly
 * that: the row ticked, and NOTHING the ruling required was dropped on the way through. */
test("🔴 ITEM 9 — its missing evidence, blocker, unlock condition and his sentence all SURVIVE the tick", () => {
  const r = classify()[9];
  assert.equal(r.state, "VERIFIED-PASS");
  assert.equal(r.label, "VERIFIED PASS WITH A JUSTIFIED UNAVAILABLE DIMENSION");
  assert.match(r.missingEvidence, /downstream outcome tied to a search/);
  assert.match(r.blocker, /0 of 36 product repositories/);
  assert.match(r.blocker, /NO SEARCH SOURCE/);
  assert.match(r.blocker, /cannot read product databases/);
  assert.ok(r.unlockCondition.length > 200, "the unlock condition does not tell a later reader what to do");
  assert.ok(BODY.includes(r.ownerSentence), "the owner's sentence on the row is not his sentence");
  // 🔴 The ⚠ is machine-readable now, not prose only — dimension, unlock clauses and the date measured.
  assert.equal(r.justifiedUnavailable.dimension, "downstream outcomes");
  assert.ok(r.justifiedUnavailable.unlockClauses.length >= 3, "the ⚠ carries too few unlock clauses to notice a change");
  assert.match(r.justifiedUnavailable.measuredUnsuppliableOn, /^2026-09-19$/);
  assert.match(r.why, /VERIFIED PASS WITH ONE JUSTIFIED UNAVAILABLE DIMENSION/);
  assert.match(r.why, /SIX OF SEVEN IS STILL SIX/);
});

/* 🔴 ROW 9 WAS THIS GUARD'S ONLY VEHICLE, AND IT TICKED ON 19 SEPTEMBER. A guard with no vehicle left to
 * fire on quietly becomes decoration — so the label guard is driven with a row that wears the label, and the
 * guard that REPLACED it for row 9 is proved separately, on row 9 itself. Both laws stay executable. */
test("🔴 RED: an external-prerequisite label that drops any of its three specifics is refused", () => {
  const wearing = (over) => {
    const rows = classify();
    rows[9] = { ...rows[9], state: "BLOCKED-UNKNOWN", label: "BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE", justifiedUnavailable: undefined, ...over };
    return rows;
  };
  for (const field of ["missingEvidence", "blocker", "unlockCondition"]) {
    const rows = wearing({ [field]: "" });
    assert.ok(assertLawful(rows).some((e) => /BY EXTERNAL PREREQUISITE/.test(e) && e.includes(field)), `dropping ${field} was accepted`);
  }
  assert.deepEqual(assertLawful(wearing({})), [], "CONTROL: a row wearing the label with all three specifics is lawful");
});

test("🔴 RED: the guard that REPLACED it — a ticked row may not drop the same three specifics", () => {
  for (const field of ["missingEvidence", "blocker", "unlockCondition"]) {
    const rows = classify();
    rows[9] = { ...rows[9], [field]: "" };
    assert.ok(
      assertLawful(rows).some((e) => /JUSTIFIED UNAVAILABLE DIMENSION/.test(e) && e.includes(field)),
      `a VERIFIED-PASS row dropped its ${field} and was accepted — leaving the label retired the obligation`,
    );
  }
  assert.deepEqual(assertLawful(classify()), []);
});
