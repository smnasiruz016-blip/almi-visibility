/**
 * 🔴 SPECIFICATION AMENDMENT 3 (RR-103 §2; _handoffs beb7362) — ONE row appended: F91 · Page opportunity planning. Denominator 90 → 91.
 *
 * Proves: (1) F91 is the amendment's line BYTE FOR BYTE — the line is carried here as TEXT and hashed here, never copied from the generated
 * file (CI has no _handoffs checkout); (2) the generated list is pinned to the amended_3 extract the derivation names; (3) ids are exactly
 * F01–F91 in order — since Amendment 5 (RR-182) F01–F96, the denominator 96 everywhere the board computes it — and no phantom id exists (F00,
 * F97, F99); (4) the control F91 held was RESTATED as F92, and since Amendment 5 as F97, and the restatement can fire; (5) F91 enters UNASSESSED with no events, no acceptance, not implementable.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { CAPABILITIES, EXTRACT_PROVENANCE } from "../config/fboard/capabilities.mjs";
import { EXTRACT_PROVENANCE as DERIVE_PROVENANCE } from "../bin/fboard-derive.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { CROSSWALK } from "../config/fboard/crosswalk.mjs";
import { buildBoard, boardErrors, progress, DENOMINATOR, mayImplement } from "../src/fboard/board.mjs";

const F91 = "F91 | Core intelligence | Page opportunity planning | For any client's product, report three distinct numbers, never collapsed into one: possible combinations of the dimensions relevant to that product and its verified data, as candidates only and never page commitments, a dimension that does not apply omitted rather than filled; verified opportunities, the combinations supported by traceable demand, a reliable source, verified product fit and a materially distinct need, keeping observed demand apart from inferred suggestion and owned Search Console evidence labelled owned, never global; and genuinely needed pages, counted only after equivalent questions are grouped and existing coverage and unique value are assessed; each number prints its own method and bound, unknown evidence stays NOT MEASURED and is never zero or estimated, dimensions are never blindly multiplied, no fixed page quota is set, and tenant isolation is preserved.";
/* Specification Amendment 4's appended sentence, carried as TEXT (CI has no _handoffs checkout) */
const A4_SENTENCE = "F91 also owns the governed connection that records an admitted, source-backed public question against the client's product, its underlying need and one page candidate: the same question from any country or language joins one need, materially different intents stay separate, a country-specific answer difference is kept as a section of that need's page, existing-page coverage is checked before any new page is recommended, and a lead, keyword idea, client claim or fixture never enters it.";
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const board = () => buildBoard(CAPABILITIES, DECLARED);
const ids = (n) => Array.from({ length: n }, (_, i) => `F${String(i + 1).padStart(2, "0")}`);

/* RESTATED 4 Oct 2026 (RR-153 §3), for a MEASURED reason: Specification Amendment 4 (_handoffs 6c606b2) APPENDED one sentence to F91's
 * line. Amendment 3's line stays, byte for byte, as the line's opening; the generated row now hashes Amendment 4's line (test/spec-amendment-4). */
test("A3·1 · F91 is the amendment's line, byte for byte — its class and name included", () => {
  const row = CAPABILITIES.find((c) => c.id === "F91");
  assert.ok(row, "F91 missing");
  assert.equal(row.lineSha256, sha(`${F91} ${A4_SENTENCE}`), "F91 is not Amendment 3's line with Amendment 4's sentence appended");
  const [, domain, name] = F91.split(" | ");
  assert.deepEqual([row.domain, row.name], [domain, name]);
  // CONTROL: one character changed in the line is seen
  assert.notEqual(row.lineSha256, sha(F91.replace("three distinct", "three distinct.")));
});

test("A3·2 · the generated list is pinned to the amended_3 extract the derivation names", () => {
  assert.deepEqual({ ...EXTRACT_PROVENANCE }, { ...DERIVE_PROVENANCE });
  /* since Amendment 4 (RR-153, _handoffs 6c606b2) the derivation names the amended_4 extract, which carries Amendment 3's rows unchanged
   * save F91's appended sentence; the amended_3 extract (beb7362, sha256 179cb43a…) stays byte-immutable in history */
  /* since Amendment 5 (RR-182, _handoffs 7acd99c) the derivation names the amended_5 extract, which carries F91's line unchanged */
  assert.match(EXTRACT_PROVENANCE.path, /amended_5\.extract\.txt$/);
  assert.equal(EXTRACT_PROVENANCE.commit, "7acd99cadc1af60e0a2757bdb02601303a00ffce");
  assert.equal(EXTRACT_PROVENANCE.sha256, "526c8e5de1e7c56c061f08ef24afdc65118891fe7f277c97e2ce2910a035583f");
});

test("A3·3 · the denominator is 96 since Amendment 5 (91 from Amendment 3) — the constant, the capability list, the board, its split and the crosswalk agree; no phantom id", () => {
  /* RR-182 §3: Specification Amendment 5 appended F92–F96 UNASSESSED — UNASSESSED 44 → 49, rows 91 → 96, required 90 → 95; passed unchanged */
  assert.deepEqual(CAPABILITIES.slice(0, 91).map((c) => c.id), ids(91), "Amendment 3's F01–F91 moved");
  assert.equal(DENOMINATOR, 96);
  assert.deepEqual(CAPABILITIES.map((c) => c.id), ids(96));
  const p = progress(board());
  assert.equal(p.total, 96);
  assert.equal(p.denominator, 96);
  assert.equal(Object.values(p.split).reduce((a, b) => a + b, 0), 96);
  assert.equal(CROSSWALK.entries.length, 96);
  assert.deepEqual(CROSSWALK.entries.map((e) => e.featureId), ids(96));
  for (const phantom of ["F00", "F97", "F99"]) {
    assert.equal(CAPABILITIES.some((c) => c.id === phantom), false, `${phantom} is a capability`);
    assert.equal(phantom in DECLARED, false, `${phantom} is declared on the board`);
    assert.equal(CROSSWALK.entries.some((e) => e.featureId === phantom), false, `${phantom} is in the crosswalk`);
  }
  assert.deepEqual(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }), []);
});

test("A3·4 · RESTATED CONTROL: F91's old control, F92 after Amendment 3, is F97 since Amendment 5 — renaming the last row F97, or dropping the last row, is a board error", () => {
  const renamed = board();
  renamed[DENOMINATOR - 1] = { ...renamed[DENOMINATOR - 1], featureId: "F97" };
  /* each guard by its code (RR-103 sabotage run 1: G06 stayed green while A3·4 asserted only "some error" — NOT_THE_SPECIFICATION alone
   * hid the id-range guard's removal). The id-range guard must refuse on its own, without the capability list. */
  assert.ok(boardErrors(renamed, { acceptances: ACCEPTANCES }).some((e) => e.code === "DENOMINATOR"), "the id-range guard accepted a phantom F97");
  assert.ok(boardErrors(renamed, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((e) => e.code === "NOT_THE_SPECIFICATION"), "the specification guard accepted a phantom F97");
  assert.ok(boardErrors(board().slice(0, DENOMINATOR - 1), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((e) => e.code === "DENOMINATOR"), `a ${DENOMINATOR - 1}-row board was accepted`);
});

/* RESTATED 1 Oct 2026 (RR-113), for a MEASURED reason: the amendment brought F91 in UNASSESSED with no events and no acceptance (still
 * proved below — the amendment act gave it nothing); F91 has since moved by its OWN acts: its scope reconciled (_handoffs 24c44d0), its
 * acceptance frozen ALONE (2048dd3) on 1 Oct, then IMPLEMENTATION. Never VERIFIED. The original assertions pinned the entry state. */
test("A3·5 · F91 ENTERED UNASSESSED with no events or acceptance; its only movement since is its own acceptance, frozen by a later separate act, then implementation — never VERIFIED", () => {
  const row = board().find((r) => r.featureId === "F91");
  const acc = ACCEPTANCES.F91;
  assert.equal(acc.featureId, "F91");
  /* RR-130 §3 (2 Oct 2026), for a MEASURED reason: F91's own Acceptance Amendment 1 (_handoffs 4ef1b9c), frozen ALONE, now governs; it
   * amends F91's own 1 Oct acceptance, which stays its origin. The history gains exactly one event, that amendment, after the two it had. */
  /* RR-153 §3 (4 Oct 2026), for a MEASURED reason: F91's own Acceptance Amendment 2 (_handoffs fff60df), frozen ALONE, now governs; it
   * amends Amendment 1, which amends the 1 Oct original. The history gains one event, that amendment. */
  /* RR-172 §4.1 (5 Oct 2026), for a MEASURED reason: F91's own Acceptance Amendment 3 (_handoffs b8a4ea5), approved by its hash and frozen
   * ALONE, now governs; it amends Amendment 2. The history gains one event, that amendment. */
  /* RR-179 §4.1 (5 Oct 2026), for a MEASURED reason: F91's own Acceptance Amendment 4 (_handoffs 0abcd15, C19 the spec compiler), approved by
   * its hash and frozen ALONE, now governs; it amends Amendment 3. The history gains one event, that amendment. */
  assert.equal(acc.ruling.path, "AlmiVisibility_F91_ACCEPTANCE_AMENDMENT_4_2026-10-05.md", "F91 carries an acceptance that is not its own");
  assert.equal(acc.amends.ruling.path, "AlmiVisibility_F91_ACCEPTANCE_AMENDMENT_3_2026-10-05.md", "F91's amendment does not amend F91's own previous acceptance");
  assert.ok(acc.frozenOn > "2026-09-30", "F91's acceptance predates the amendment that brought it in");
  assert.deepEqual(DECLARED.F91.events.map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "ACCEPTANCE_AMENDED", "ACCEPTANCE_AMENDED", "ACCEPTANCE_AMENDED", "ACCEPTANCE_AMENDED"]);
  assert.deepEqual([DECLARED.F91.events[2].on, DECLARED.F91.events[3].on, DECLARED.F91.events[4].on, DECLARED.F91.events[5].on], ["2026-10-02", "2026-10-03", "2026-10-05", "2026-10-05"]);
  assert.deepEqual([DECLARED.F91.events[0].on, DECLARED.F91.events[1].from, DECLARED.F91.events[1].to], ["2026-10-01", "UNASSESSED", "IN-PROGRESS"]);
  assert.equal(row.state, "IN-PROGRESS");
  assert.ok(!row.events.some((e) => e.kind === "VERIFIED"), "F91 was verified");
  assert.equal(CROSSWALK.entries.find((e) => e.featureId === "F91").acceptanceRelation, "NEW");
});
