/**
 * RR-98 · A CITED COMMAND MUST EXIST (correction record _handoffs d400e73).
 *
 * The board validator fails with COMMAND_PATH_UNRESOLVED when a board event cites a command path that is no governance record in the
 * committed authority corpus. Three merged rows (F47, F20, F29) once cited a file that never existed; the fault lived only in source and was
 * corrected in place. No trail event is touched here; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { boardErrors, buildBoard, progress } from "../src/fboard/board.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const AUTH = { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now };
const board = (declared = DECLARED) => buildBoard(CAPABILITIES, declared);
const unresolved = (errs) => errs.filter((e) => e.code === "COMMAND_PATH_UNRESOLVED");
const RIGHT = "AlmiVisibility_CC_COMMAND_2026-09-30_RR-96_CLOSE_197_CONTINUE_F46.md";
const withPath = (featureId, path) => ({ ...DECLARED, [featureId]: { ...DECLARED[featureId], events: DECLARED[featureId].events.map((e) => (e.command ? { ...e, command: { ...e.command, path } } : e)) } });

test("the real board: every cited command resolves to a governance record in the committed corpus", () => {
  const cited = Object.values(DECLARED).flatMap((r) => (r.events ?? []).map((e) => e.command).filter((c) => c && c.repo === "_handoffs"));
  assert.ok(cited.length > 40, "the population of cited commands shrank — this check would be near-vacuous");
  assert.deepEqual(unresolved(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: AUTH })), []);
});

test("FIRING CONTROL: each historical wrong name, planted back into its own row, is COMMAND_PATH_UNRESOLVED for that row — and so is any new wrong name", () => {
  for (const id of ["F47", "F20", "F29"]) {
    const errs = unresolved(boardErrors(board(withPath(id, `AlmiVisibility_CC_COMMAND_2026-09-30_RR-96_CLOSE_197_CONTINUE_${id}.md`)), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: AUTH }));
    assert.deepEqual(errs.map((e) => e.id), [id], `the historical wrong name on ${id} was not caught`);
  }
  /* no row is exempt: an invented name on any other row fires too */
  assert.deepEqual(unresolved(boardErrors(board(withPath("F73", "AlmiVisibility_CC_COMMAND_2099-01-01_NEVER_WRITTEN.md")), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: AUTH })).map((e) => e.id), ["F73"]);
});

test("the correction moved nothing but the name: the three rows cite the real file with their original pins, and stay VERIFIED-PASS", () => {
  for (const id of ["F47", "F20", "F29"]) {
    const c = DECLARED[id].events.find((e) => e.command).command;
    assert.deepEqual([c.path, c.commit, c.sha256], [RIGHT, "6eccb9ba7c62a1b51f2b6d37016c6429154791cc", "8422c1fd911fff92ffc28ec6b9a9cff07572e2334209c8e41e0e130d60d2828c"]);
    assert.equal(board().find((r) => r.featureId === id).state, "VERIFIED-PASS", `${id}'s verdict moved`);
  }
  assert.equal(progress(board()).passed, 34); /* F35 and F34 REOPENED 5 Oct 2026 (AUTHORITATIVE_REQUIREMENT_CHANGE, RR-174 §4) and RE-PROVED the same day under their Amendments 1 (RR-174 §8) — the board reads 34/90 again */
});

test("every production caller of the validator hands it the committed corpus — the guard cannot silently not run", () => {
  for (const f of ["bin/fboard-status.mjs", "tools/board-audit-consistency.mjs", "tools/audit-trail-census.mjs"]) {
    const call = readFileSync(join(REPO, f), "utf8").split(/\r?\n/).find((l) => l.includes("boardErrors("));
    assert.match(call ?? "", /authority: \{ records: AUTHORITY_CORPUS/, `${f} calls the validator without the corpus`);
  }
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
