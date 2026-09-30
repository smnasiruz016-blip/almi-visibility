/**
 * 🔴 SPECIFICATION AMENDMENT 3 (RR-103 §2; _handoffs beb7362) — ONE row appended: F91 · Page opportunity planning. Denominator 90 → 91.
 *
 * Proves: (1) F91 is the amendment's line BYTE FOR BYTE — the line is carried here as TEXT and hashed here, never copied from the generated
 * file (CI has no _handoffs checkout); (2) the generated list is pinned to the amended_3 extract the derivation names; (3) ids are exactly
 * F01–F91 in order, the denominator is 91 everywhere the board computes it, and no phantom id exists (F00, F92, F99); (4) the control F91
 * held is RESTATED as F92, and the restatement can fire; (5) F91 enters UNASSESSED with no events, no acceptance, not implementable.
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
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const board = () => buildBoard(CAPABILITIES, DECLARED);
const ids = (n) => Array.from({ length: n }, (_, i) => `F${String(i + 1).padStart(2, "0")}`);

test("A3·1 · F91 is the amendment's line, byte for byte — its class and name included", () => {
  const row = CAPABILITIES.find((c) => c.id === "F91");
  assert.ok(row, "F91 missing");
  assert.equal(row.lineSha256, sha(F91), "F91 is not the amendment's line");
  const [, domain, name] = F91.split(" | ");
  assert.deepEqual([row.domain, row.name], [domain, name]);
  // CONTROL: one character changed in the line is seen
  assert.notEqual(row.lineSha256, sha(F91.replace("three distinct", "three distinct.")));
});

test("A3·2 · the generated list is pinned to the amended_3 extract the derivation names", () => {
  assert.deepEqual({ ...EXTRACT_PROVENANCE }, { ...DERIVE_PROVENANCE });
  assert.match(EXTRACT_PROVENANCE.path, /amended_3\.extract\.txt$/);
  assert.equal(EXTRACT_PROVENANCE.commit, "beb736250d9c44dfe46c345d78af7830c5ca6d67");
  assert.equal(EXTRACT_PROVENANCE.sha256, "179cb43a3a3dd59451eb5cac37ae54ccc112f2617d794d3974b805df164564f8");
});

test("A3·3 · the denominator is 91 — the constant, the capability list, the board, its split and the crosswalk agree; no phantom id", () => {
  assert.equal(DENOMINATOR, 91);
  assert.deepEqual(CAPABILITIES.map((c) => c.id), ids(91));
  const p = progress(board());
  assert.equal(p.total, 91);
  assert.equal(p.denominator, 91);
  assert.equal(Object.values(p.split).reduce((a, b) => a + b, 0), 91);
  assert.equal(CROSSWALK.entries.length, 91);
  assert.deepEqual(CROSSWALK.entries.map((e) => e.featureId), ids(91));
  for (const phantom of ["F00", "F92", "F99"]) {
    assert.equal(CAPABILITIES.some((c) => c.id === phantom), false, `${phantom} is a capability`);
    assert.equal(phantom in DECLARED, false, `${phantom} is declared on the board`);
    assert.equal(CROSSWALK.entries.some((e) => e.featureId === phantom), false, `${phantom} is in the crosswalk`);
  }
  assert.deepEqual(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }), []);
});

test("A3·4 · RESTATED CONTROL: F91's old control is now F92 — renaming the last row F92, or dropping F91, is a board error", () => {
  const renamed = board();
  renamed[DENOMINATOR - 1] = { ...renamed[DENOMINATOR - 1], featureId: "F92" };
  /* each guard by its code (RR-103 sabotage run 1: G06 stayed green while A3·4 asserted only "some error" — NOT_THE_SPECIFICATION alone
   * hid the id-range guard's removal). The id-range guard must refuse on its own, without the capability list. */
  assert.ok(boardErrors(renamed, { acceptances: ACCEPTANCES }).some((e) => e.code === "DENOMINATOR"), "the id-range guard accepted a phantom F92");
  assert.ok(boardErrors(renamed, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((e) => e.code === "NOT_THE_SPECIFICATION"), "the specification guard accepted a phantom F92");
  assert.ok(boardErrors(board().slice(0, 90), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((e) => e.code === "DENOMINATOR"), "a 90-row board was accepted");
});

test("A3·5 · F91 enters UNASSESSED: no events, no acceptance, not implementable, and no board row declares it", () => {
  const row = board().find((r) => r.featureId === "F91");
  assert.equal(row.state, "UNASSESSED");
  assert.deepEqual(row.events, []);
  assert.equal("F91" in DECLARED, false);
  assert.equal("F91" in ACCEPTANCES, false, "F91 has an acceptance — its scope is only PROPOSED (RR-103 §2.3)");
  assert.equal(mayImplement(board(), "F91", ACCEPTANCES), false);
  assert.equal(CROSSWALK.entries.find((e) => e.featureId === "F91").acceptanceRelation, "UNASSESSED");
});
