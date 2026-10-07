/**
 * 🔴 BOARD AMENDMENT 1 (3 Oct 2026; _handoffs dd91e92, owner decision f8fa5e9, RR-145 §2) — F25 leaves the REQUIRED path; it is NOT passed.
 *
 * Proves, on the production board and the production entry points:
 *   B1 the real board reads 35/95 over the required rows and 35/96 over all rows (RR-182: Specification Amendment 5 added F92–F96; before it, 35/90 and 35/91; (32/90 between F35's and F34's reopening and re-proof, RR-174; 33/90 also between F33's reopening and its re-proof, RR-172), both printed; F25 is NOT REQUIRED with its work state;
 *   B2 the numerator can never rise by leaving: a NOT REQUIRED row that is VERIFIED-PASS still does not count (control: kept, it would);
 *   B3 no exclusion without a CURRENT owner authority named by its bytes — wrong pin, no ruling, an unknown proposition, an unknown row;
 *   B4 nothing is deleted: all 96 rows stay on the board, F25 keeps its acceptance chain and its events.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { NOT_REQUIRED } from "../config/fboard/required-path.mjs";
import { buildBoard, boardErrors, progress, DENOMINATOR } from "../src/fboard/board.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const AUTH = { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now };
const board = () => buildBoard(CAPABILITIES, DECLARED);
const errs = (b, notRequired) => boardErrors(b, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: AUTH, ...(notRequired ? { notRequired } : {}) });

test("B1 · the board reads 37/95 over the REQUIRED rows and 37/96 over all rows — both figures, F25 NOT REQUIRED with its work state", () => {
  const p = progress(board());
  /* RR-182 §3: Specification Amendment 5 appended F92–F96 UNASSESSED — UNASSESSED 44 → 49, rows 91 → 96, required 90 → 95; passed unchanged */
  assert.deepEqual([p.passed, p.denominator, p.total], [37, 96, 96], "the all-rows figure moved");
  assert.deepEqual([p.required.passed, p.required.denominator], [37, 95], "the required figure is not 37/95"); /* RR-208: F37 RE-PROVED under its Amendment 2 (rr208-sabotage-2026-10-07T2045: 59 of 59) */ /* RR-208: F37 REOPENED by its own Amendment 2 (_handoffs f9edf2a) — VERIFIED-PASS -> IN-PROGRESS */ /* RR-206: F94 PROVED in R7 (rr206-sabotage-2026-10-07T1855: 33 of 33) */ /* RR-192: F39 re-proved under Amendment 1 */
  assert.deepEqual(p.required.notRequired, [{ featureId: "F25", state: "IN-PROGRESS" }]);
  assert.deepEqual(errs(board()), [], "the real board is not lawful");
  const cli = spawnSync(process.execPath, ["bin/fboard-status.mjs"], { cwd: REPO, encoding: "utf8" });
  assert.match(cli.stdout, /F-progress: 37\/95 \(required rows\) · all rows 37\/96 · NOT REQUIRED 1: F25 \(work state IN-PROGRESS, not passed\)/, cli.stdout);
});

test("B2 · leaving the required path never raises the numerator: a NOT REQUIRED row that is VERIFIED-PASS still does not count (CONTROL: kept, it would)", () => {
  const b = board().map((r) => (r.featureId === "F25" ? { ...r, state: "VERIFIED-PASS" } : r));
  const p = progress(b);
  assert.equal(p.required.passed, 37, "a NOT REQUIRED row was counted as passed"); /* RR-208: F37 RE-PROVED under its Amendment 2 (rr208-sabotage-2026-10-07T2045: 59 of 59) */ /* RR-208: F37 REOPENED by its own Amendment 2 (_handoffs f9edf2a) — VERIFIED-PASS -> IN-PROGRESS */ /* RR-206: F94 PROVED in R7 (rr206-sabotage-2026-10-07T1855: 33 of 33) */
  assert.equal(p.required.denominator, 95);
  const kept = progress(b, { notRequired: {} });
  assert.equal(kept.required.passed, 38, "CONTROL: with no exclusion the same board must count it — the check could not fail");
  assert.equal(kept.required.denominator, 96);
});

test("B3 · no exclusion without a CURRENT owner authority named by its bytes", () => {
  const real = NOT_REQUIRED.F25;
  const codes = (nr) => errs(board(), nr).filter((e) => /^NOT_REQUIRED/.test(e.code)).map((e) => e.code);
  assert.deepEqual(codes({ F25: { ...real, authority: { ...real.authority, ruling: { ...real.authority.ruling, sha256: "0".repeat(64) } } } }), ["NOT_REQUIRED_NOT_THE_CURRENT_RULING"]);
  assert.deepEqual(codes({ F25: { ...real, authority: { propositionId: real.authority.propositionId } } }), ["NOT_REQUIRED_WITHOUT_AUTHORITY"]);
  assert.deepEqual(codes({ F25: { ...real, authority: { ...real.authority, propositionId: "NO_SUCH_OWNER_DECISION" } } }), ["NOT_REQUIRED_WITHOUT_AUTHORITY"]);
  assert.deepEqual(codes({ F99: { ...real, featureId: "F99" } }), ["NOT_REQUIRED_UNKNOWN_ROW"]);
  assert.deepEqual(codes({ F25: real }), [], "CONTROL: the real entry is refused");
  const res = AUTHORITY_CORPUS.find((r) => r.propositionId === real.authority.propositionId);
  assert.equal(res?.status, "CURRENT");
  assert.equal(res?.issuer?.class, "OWNER", "the authority is not the owner's");
  assert.equal(res?.contentHash, real.authority.ruling.sha256);
});

test("B4 · nothing is deleted: all 96 rows stay, F25 keeps its frozen acceptance chain and events; optional findings are reported, never gated on", () => {
  const b = board();
  assert.equal(b.length, DENOMINATOR);
  const f25 = b.find((r) => r.featureId === "F25");
  assert.equal(f25.state, "IN-PROGRESS");
  assert.deepEqual(f25.events.map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "ACCEPTANCE_AMENDED"]);
  assert.ok(ACCEPTANCES.F25, "F25's acceptance was removed");
  assert.ok(NOT_REQUIRED.F25.optionalFindings.length >= 1);
  assert.doesNotMatch(JSON.stringify(NOT_REQUIRED), /\b(fix|repair)\b/i, "a finding is worded as if Visibility repairs the client's layout");
});
