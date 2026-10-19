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
  assert.equal(progress(board()).passed, 62) /* RR-289: light proof rule 3 — F62 (1 deferred), F59 (3 deferred), F61 (2 deferred) VERIFIED — 59 -> 62, IN-PROGRESS 7 -> 4 */ /* RR-287: F60 PROVED (f60 7/7) and F88 PROVED under its Amendment 1 (f88 6/6, f88-a1 5/5, f88-css 1/1); F35 REOPENED by its Amendment 2 (beta-g decision A) and PROVED again (f35-a2 7/7, f35 26/26, rr174 42/42, rr179's 10 limbs on the changed file); F59 and F61 started; F96 frozen only — 57 -> 59, IN-PROGRESS 6 -> 7, UNASSESSED 33 -> 29, ACCEPTANCE-FROZEN 0 -> 1 */ /* RR-285: F18 PROVED under its Amendment 1 (f18-sabotage 7/7) and F49 PROVED (f49-sabotage 5/5), standing with the final suite and CI; F88 started, IN-PROGRESS (its real reports fail its checks, named) — 55 -> 57, UNASSESSED 35 -> 33, IN-PROGRESS 6 -> 6 */ /* RR-284: F74, F87 and F50 PROVED on the branch (sabotage 7/7, 6/6, 7/7), standing with the final suite and CI; F18 started, IN-PROGRESS (C3 as frozen not provable) — 52 -> 55, UNASSESSED 39 -> 35, IN-PROGRESS 5 -> 6 */ /* RR-283: F86 PROVED on the branch (f86-sabotage 9/9; the suite PASS here and in a fresh clone), standing with the final suite and CI — 51 -> 52, UNASSESSED 40 -> 39 */ /* RR-283: F42 PROVED on the branch (f42-sabotage 7/7), standing with the final suite and CI — 50 -> 51, UNASSESSED 41 -> 40 */ /* RR-283: F54 PROVED on the branch (f54-sabotage 11/11), standing with the final suite and CI — 49 -> 50, UNASSESSED 42 -> 41 */ /* RR-277: F44 PROVED under its Amendment 2 (f44-source-reader-sabotage 72/72) — 48 -> 49, IN-PROGRESS 6 -> 5 */ /* RR-272: F22 PROVED under its Amendment 1 (f22-built-sabotage) — 47 -> 48, IN-PROGRESS 7 -> 6 */ /* overnight 16 Oct 2026: F27 PROVED under its Amendment 3 (f27-live-sabotage, 25 of 25) — 46 -> 47, IN-PROGRESS 8 -> 7 */ /* RR-268: F44 REOPENED by its Acceptance Amendment 2 (the source reader, C7–C12) — 47 -> 46, IN-PROGRESS 7 -> 8 */ /* RR-263: F23 PROVED under its Amendment 2 (f23-sabotage-2026-10-14T0659: 63 of 63) — 46 -> 47, IN-PROGRESS 8 -> 7 */ /* RR-261: F10 PROVED under its Amendment 4 (f10-built-pages-sabotage-2026-10-13T2013: 69 of 69) — 45 -> 46, IN-PROGRESS 9 -> 8 */ /* RR-260: F12 PROVED (f12-sabotage-2026-10-13T1631: 65 of 65) — 44 -> 45, IN-PROGRESS 10 -> 9 */ /* RR-259: F11 PROVED (f11-sabotage-2026-10-13T0513-2: 51 of 51) — 43 -> 44, IN-PROGRESS 10 -> 9 */ /* RR-251: F44 PROVED under its Amendment 1 on the real registry (f44-sabotage-2026-10-12T1810: 38 of 38) — 42 -> 43, IN-PROGRESS 10 -> 9 */ /* RR-246: F07 VERIFIED-PASS again under its Amendment 4 (known reads represented, guard installed, every F07 proof and sabotage re-run: rr246-sabotage-2026-10-10T0325 10/10 and the *-rr246-2026-10-10 runs) — 41 -> 42, IN-PROGRESS 11 -> 10 */; /* RR-229 (c): F19 PROVED under its Amendment 1 on the committed real data (rr229c-sabotage-2026-10-08T2147: 14 of 14; rr227 68 of 68) — 39 -> 40, IN-PROGRESS 13 -> 12 */ /* RR-229: F31 re-proved under its same acceptance (rr229-sabotage-2026-10-08T1956: 37 of 37) — 38 -> 39, IN-PROGRESS 14 -> 13 */ /* RR-229: F31 REOPENED under its same acceptance (concrete contradictory evidence, _handoffs 57d6fe1) — VERIFIED-PASS -> IN-PROGRESS (39 -> 38, IN-PROGRESS 13 -> 14) until re-proved */ /* RR-227: F19 REOPENED by its own Amendment 1 (_handoffs b6b3382) — VERIFIED-PASS -> IN-PROGRESS (40 -> 39, IN-PROGRESS 12 -> 13) until re-proved in RR-228 */ /* RR-216: F92 PROVED (rr216-sabotage-2026-10-08T0359: 35 of 35) */ /* RR-214: F93 PROVED (rr214-sabotage-2026-10-08T0218: 31 of 31) */ /* RR-210: F38 PROVED (rr210-sabotage-2026-10-07T2305: 37 of 37) */ /* RR-208: F37 RE-PROVED under its Amendment 2 (rr208-sabotage-2026-10-07T2045: 59 of 59) */ /* RR-208: F37 REOPENED by its own Amendment 2 (_handoffs f9edf2a) — VERIFIED-PASS -> IN-PROGRESS */ /* RR-206: F94 PROVED in R7 (rr206-sabotage-2026-10-07T1855: 33 of 33) */ /* RR-192: F39 re-proved under Amendment 1 */ /* RR-225: F02 (Amendment 2) and F31 (Amendment 1) RE-PROVED (rr225-sabotage-2026-10-08T0805: 52 of 52) — the board back to 40/95, restated */ /* RR-244: F78 PROVED under its Amendment 2 on the real ledgers and the census (rr244-sabotage-2026-10-09T2236: 16 of 16; rr243-sabotage-2026-10-09T2240: 35 of 35; f78-sabotage-2026-10-09T2320: 22 of 22) — 40 -> 41, IN-PROGRESS 12 -> 11 */
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
