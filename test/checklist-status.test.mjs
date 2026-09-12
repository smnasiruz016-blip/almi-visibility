import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { verify, EXPECTED_BODY_SHA256, EXPECTED_FEATURE_COUNT, splitSource } from "../tools/verify-checklist-source.mjs";
import { STATES as SIX_STATES, classify } from "../src/checklist/classification.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SOURCE = REPO + "KEY_FEATURE_CHECKLIST_SOURCE.md";
const STATUS = REPO + "CHECKLIST_STATUS.md";

const STATUSES = ["☑", "◐", "☐", "⚠"];
const SCOPES = ["IN", "OUT", "PARTIAL"];

/* ------------------------------------------------------------------ *
 * PART ONE — THE FROZEN TEXT IS THE OWNER'S TEXT.
 *
 * 🔴 A provenance header that says "verbatim" is a claim. This is that claim
 * made falsifiable: change one byte of the body and the suite goes red.
 * ------------------------------------------------------------------ */

test("🔴 the frozen checklist body hashes to the recorded sha256", () => {
  const r = verify(SOURCE);
  assert.equal(r.sha, EXPECTED_BODY_SHA256, "KEY_FEATURE_CHECKLIST_SOURCE.md body has changed");
  assert.equal(r.matches, true);
});

test("🔴 the frozen source carries exactly 58 numbered features", () => {
  // A hash catches a changed byte but does not say what the document should
  // CONTAIN. 58 is the denominator every status report is measured against, so
  // it is asserted independently.
  assert.equal(verify(SOURCE).featureCount, EXPECTED_FEATURE_COUNT);
});

test("the hash covers the BODY only — our header is separable and may be corrected", () => {
  const { header, body } = splitSource(readFileSync(SOURCE, "utf8").replace(/\r\n/g, "\n"));
  assert.ok(header.includes("Hash verification"), "the header should be ours");
  // 🔴 NOT `!body.includes("Provenance")` — the owner's own item 17 is called
  // "Derived Fact Provenance". A first draft of this test asserted that and went
  // red against correct data: the check has to name something only OUR header
  // says, not a word the source may legitimately use.
  assert.ok(!body.includes("Hash verification"), "the body must be the owner's text alone");
  assert.ok(body.startsWith("ALMIVISIBILITY"), "the body must start at the owner's title");
});

test("the frozen source records the TICK LAW verbatim", () => {
  const text = readFileSync(SOURCE, "utf8");
  assert.match(
    text,
    /A feature is not complete because code exists\. Tick it only when real evidence proves it works\./,
  );
});

/* ------------------------------------------------------------------ *
 * PART TWO — THE TRACKER COVERS EVERY ITEM, WITH A LEGAL STATUS.
 *
 * 🔴 The failure this prevents is a tracker that quietly drops a row. A missing
 * row and a ☐ row look identical in a total, and the total is the number that
 * gets quoted.
 * ------------------------------------------------------------------ */

function statusRows() {
  const text = readFileSync(STATUS, "utf8");
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\|\s*(\d{1,2})\s*\|(.+)$/.exec(line.trim());
    if (!m) continue;
    const cells = m[2].split("|").map((c) => c.trim());
    rows.push({ n: Number(m[1]), cells });
  }
  return rows;
}

test("🔴 the tracker has exactly 58 item rows, numbered 1..58 with no gap and no duplicate", () => {
  const rows = statusRows().filter((r) => r.n >= 1 && r.n <= 58 && r.cells.length >= 8);
  assert.equal(rows.length, 58, `expected 58 item rows, found ${rows.length}`);
  const numbers = rows.map((r) => r.n).sort((a, b) => a - b);
  assert.deepEqual(numbers, Array.from({ length: 58 }, (_, i) => i + 1));
});

/**
 * 🔴 THE VOCABULARY CHANGED BY OWNER RULING ON 12 SEPTEMBER 2026.
 *
 * This test used to assert the four symbols, and it was right to while four was
 * the vocabulary. `PASS_BOUNDARIES_SOURCE.md` replaced them with six states, and
 * by the recorded precedence the ruling wins over any internal practice —
 * including this test.
 *
 * 🔴 AND THE STATES ARE WORDS, NOT SYMBOLS. A broken glyph in a Windows terminal
 * becomes a wrong status, and this file is read in terminals. The assertion
 * below fails on a symbol, which is the point.
 */
test("🔴 every row carries one of the SIX states, written as a word", () => {
  for (const row of statusRows().filter((r) => r.cells.length >= 8)) {
    const status = row.cells[1];
    assert.ok(
      SIX_STATES.includes(status),
      `item ${row.n} has status "${status}", which is not one of ${SIX_STATES.join(" | ")}`,
    );
  }
});

test("🔴 the tracker's states agree with the classification module, row for row", () => {
  const rows = classify();
  for (const row of statusRows().filter((r) => r.cells.length >= 8)) {
    assert.equal(
      row.cells[1],
      rows[row.n].state,
      `item ${row.n}: the tracker and the classification disagree — one of them is stale`,
    );
  }
});

test("🔴 every row carries a v0.1 SCOPE of IN / OUT / PARTIAL, and NOTHING is marked N/A", () => {
  const text = readFileSync(STATUS, "utf8");
  for (const row of statusRows().filter((r) => r.cells.length >= 8)) {
    const scope = row.cells[2];
    const head = scope.split("—")[0].trim();
    assert.ok(SCOPES.includes(head), `item ${row.n} scope "${scope}" does not begin with IN/OUT/PARTIAL`);
    // 🔴 A scope with no citation is an assertion. The boundary must be pointed at.
    assert.ok(scope.includes("—"), `item ${row.n} scope cites no V5.1 section`);
  }
  assert.ok(!/\|\s*N\/A\s*\|/.test(text), "N/A is a justification, and justifications are the owner's");
});

test("🔴 every ◐ names its missing evidence — 'needs work' is not a blocker", () => {
  for (const row of statusRows().filter((r) => r.cells.length >= 8)) {
    if (row.cells[1] !== "◐") continue;
    const blocker = row.cells[6];
    assert.ok(blocker && blocker !== "—" && blocker.length > 25, `item ${row.n} is ◐ with no specific blocker`);
    assert.ok(
      !/^needs? (more )?work/i.test(blocker),
      `item ${row.n}'s blocker does not name a missing test or measurement`,
    );
  }
});

test("🔴 every ☑ would have to answer §3 question 4 — and there are none to check yet", () => {
  const ticked = statusRows().filter((r) => r.cells.length >= 8 && r.cells[1] === "☑");
  // This is not a test that ticks are forbidden. It is a test that a tick cannot
  // be added without integrated evidence, which is what the TICK LAW requires.
  for (const row of ticked) {
    const evidence = row.cells[3];
    assert.ok(
      /integrat/i.test(evidence),
      `item ${row.n} is ☑ but its Evidence does not answer §3 question 4 (integrated behaviour)`,
    );
  }
  assert.equal(ticked.length, 0, "the headline count says 0 ☑ — if that changed, update the headline too");
});

test("the headline counts match the rows they summarise", () => {
  const rows = statusRows().filter((r) => r.cells.length >= 8);
  const tally = Object.fromEntries(SIX_STATES.map((s) => [s, rows.filter((r) => r.cells[1] === s).length]));
  const text = readFileSync(STATUS, "utf8");
  // 🔴 The headline is the number people quote. If it drifts from the table, the
  // table is right and the headline is a lie — so they are compared here.
  for (const [state, count] of Object.entries(tally)) {
    if (count === 0) continue;
    const re = new RegExp(`\\| \\*\\*${state}\\*\\* \\| [^|]* \\| \\*\\*${count}\\*\\* \\|`);
    assert.match(text, re, `the headline count for ${state} does not say ${count}`);
  }
});

/**
 * 🔴 DEFERRED IS NOT A TICK, AND THE HEADLINE MUST NOT LET IT READ AS ONE.
 *
 * 28 rows moved out of NOT-STARTED into DEFERRED without anything being built.
 * That is the most misreadable number in the document — a reader skimming the
 * counts sees NOT-STARTED fall from 33 to 3 and concludes thirty features got
 * done. So the headline is REQUIRED to say otherwise, in its own words.
 */
test("🔴 the headline separates the three earned ticks from the 33 renamed rows", () => {
  const text = readFileSync(STATUS, "utf8");
  assert.match(text, /THREE TICKS — THE FIRST THIS PROJECT HAS EVER AWARDED/);
  assert.match(text, /DEFERRED IS NOT A TICK AND NEVER COUNTS AS ONE/);
  assert.match(text, /only three rows in the whole ledger whose status moved because \*\*work happened\*\*/);
  // 🔴 And the ledger must still say plainly that a deferral is not progress.
  assert.match(text, /The 28 DEFERRED rows are not progress and nothing was built for any of them/);
  assert.match(text, /Item 14 did NOT tick/);
});
