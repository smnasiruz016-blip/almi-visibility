/**
 * 🔴 F08 §0.3 · P28 · P29 — THE ACCEPTANCE THE ENGINE CARRIES IS THE RULING'S, AND ONE CHANGED WORD IS REFUSED.
 *
 * The FRESH derivation from the ruling's own committed bytes needs the governance repository, which CI does not check
 * out; it is tools/f08-acceptance-derivation.mjs, and its recorded run is committed evidence
 * (runs/audit/f08-acceptance-derivation-2026-09-23.txt). What CAN be proved on every run is proved here: the carried
 * clauses hash to the pinned contract, the pins name the committed ruling, and a changed word is ACCEPTANCE_TAMPERED
 * on F08 by the board's own validator.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { buildBoard, boardErrors } from "../src/fboard/board.mjs";

test("F-ACC · P28 · P29 · F08's carried acceptance hashes to its pinned contract, and ONE changed word is ACCEPTANCE_TAMPERED", () => {
  const acc = ACCEPTANCES.F08;
  assert.equal(contractSha256(acc), acc.contractSha256, "the carried clauses no longer hash to the pinned contract");
  assert.equal(acc.contractSha256, "92d20a631da004bf6de5accd4df87df933ca99d0c9661bc49f8d9b8361b2a826");
  assert.equal(acc.ruling.sha256, "f6aef3403621f7275b2a2173da4c66cd562a400a9e581fc48c3f13c87981d18a");
  assert.equal(acc.ruling.commit, "19e6b7b6aa4ad4757ac1c797d674754a4b92f1bb");
  const board = buildBoard(CAPABILITIES, DECLARED);
  assert.deepEqual(boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).filter((e) => e.id === "F08"), []);
  // CONTROL — one word of EXPECTED changed in memory: the board's own validator must refuse it, by name, on F08.
  const tampered = { ...ACCEPTANCES, F08: { ...acc, expected: acc.expected.replace("product-neutral", "product-specific") } };
  assert.notEqual(tampered.F08.expected, acc.expected, "the control did not land");
  assert.notEqual(contractSha256(tampered.F08), acc.contractSha256);
  const errs = boardErrors(board, { capabilities: CAPABILITIES, acceptances: tampered }).filter((e) => e.id === "F08");
  assert.ok(errs.some((e) => e.code === "ACCEPTANCE_TAMPERED"), `a changed acceptance word was not refused: ${JSON.stringify(errs)}`);
});
