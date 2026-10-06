/**
 * 🔴 F05 · THE CURRENT AUTHORITY REGISTER — P1–P26, P-R26 (22 September 2026). GUARD, NOT EVIDENCE.
 * Acceptance: the committed F05 owner ruling (governance 5868599, sha256 035ae68d…1f70), pinned in config/fboard/acceptances.mjs.
 *
 * Every proof has a FIRING case and a SILENT CLEAN CONTROL, and — where a production path exists — runs through it:
 * `resolve` over the MIGRATED REAL CORPUS (config/authority/corpus.mjs), `bin/authority-resolve.mjs`, `bin/fboard-status.mjs`,
 * `bin/fboard-crosswalk.mjs`. Fixtures alone cannot close F05, so each fixture case is paired with the real corpus.
 *
 * SYNTHETIC — NOT REAL EVIDENCE: `rec()` records, built by one declared rule (every field lawful, proposition "P",
 * issuer OWNER, source a governance record) and varied one field at a time. They name no real ruling, product or client.
 * The planted real-corpus controls CLONE a real record in memory and change one field; nothing is written anywhere.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { resolve, permits, requireCurrent, recordFaults, FIELDS, DISPOSITIONS } from "../src/authority/register.mjs";
import { census, ruleFor, propositionOf, scopeOf } from "../src/authority/corpus.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { ROW_CONSTRAINTS } from "../config/fboard/row-constraints.mjs";
import { GOVERNANCE_RULES, EXCLUDE } from "../config/authority/inclusion.mjs";
import { buildBoard, boardErrors, fBoardState, mayImplement, progress, DENOMINATOR, F_BOARD } from "../src/fboard/board.mjs";
import { compareContracts, contractSha256, acceptanceRelation } from "../src/fboard/acceptance.mjs";
import { buildCrosswalk, crosswalkErrors } from "../src/fboard/crosswalk.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { CROSSWALK } from "../config/fboard/crosswalk.mjs";
import { renderCrosswalk } from "../bin/fboard-crosswalk.mjs";
import { classify, STATES, HISTORICAL_BOARD, LEDGER_STATUS } from "../src/checklist/classification.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { queryObservation } from "../src/discovery/row5.mjs";
import { splitPopulation } from "../src/discovery/query-population.mjs";
import { isHeldOut } from "../src/discovery/intent-clusters.mjs";
import { scan, derivePopulation, distinctiveFragments, trackedFiles } from "../tools/heldout-firewall.mjs";
import { syntheticCorpus } from "./support/synthetic-queries.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NOW = "2026-09-22";
const F05_RULING_SHA = "035ae68d09de3378a18d4935af146308fdeef34ab21f5121dde4db47fb3a1f70";
const F05_CONTRACT_SHA = "942308f9d58f5c2960a49f6b4abe00b1a1899ebee813cadb715b6e881e4cf68d";
const F05_PROP = "OWNER_RULING_F05_ACCEPTANCE";
const F05_SCOPE = ["ALMIVISIBILITY", "F05"];
const H = (s) => createHash("sha256").update(String(s)).digest("hex");
const node = (...a) => spawnSync(process.execPath, a, { cwd: REPO, encoding: "utf8" });

/* SYNTHETIC — NOT REAL EVIDENCE. One lawful record; each test varies one field. */
const rec = (o = {}) => ({
  authorityId: "syn:a", propositionId: "P", scope: ["ROOT"], issuer: { class: "OWNER" }, issuedAt: "2026-01-01", effectiveFrom: "2026-01-01",
  sourceRef: { kind: "GOVERNANCE_RECORD", path: "syn-a.md", commit: "c0" }, status: "CURRENT", supersedes: [], supersededBy: [],
  contentHash: H("a"), recordedAt: "2026-01-01T00:00:00Z", ...o,
});
const OLD = rec({ authorityId: "syn:old", contentHash: H("old") });
const NEW = rec({ authorityId: "syn:new", issuedAt: "2026-03-01", effectiveFrom: "2026-03-01", contentHash: H("new") });
const disp = (res, id) => res.candidates.find((c) => c.authorityId === id)?.disposition;

/* The real F05 ruling record — and an in-memory clone that differs in one field (a planted control, never written). */
const REAL_F05 = AUTHORITY_CORPUS.find((r) => r.propositionId === F05_PROP);
const clone = (o) => ({ ...REAL_F05, authorityId: "planted:clone", ...o });
const board = () => buildBoard(CAPABILITIES, DECLARED);
/* A WHOLE-BOARD judgement over the REAL corpus is made on the day the corpus was measured: on NOW (22 Sep) a later
 * row's acceptance (F07, effective 23 Sep) does not exist yet and would read ABSENT — true, and not what these probe. */
const REAL_DAY = CORPUS_PROVENANCE.now;
const REAL_AUTH = { records: AUTHORITY_CORPUS, now: REAL_DAY };
/* The only F-rows that may have moved: F05 (its own lawful path) and F40 (its blocker). F-progress counts F05 only once it is VERIFIED-PASS. */
/* 🔴 EVERY ROW THAT HAS LEFT UNASSESSED, EXACTLY. +F08 on 22 September 2026, when its acceptance was frozen in the
 * governance repository (_handoffs 19e6b7b) — a CORRECT CONSEQUENCE of a second row being frozen, not a loosening:
 * the list is still exact, and a row moving without appearing here still fails. */
// F07 joined on 23 September 2026 under its own frozen acceptance (config/fboard/f-board.mjs).
/* F13 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 2 Oct 2026 (RR-131, acceptance 0ca24d3) — the board reads 33/91 */
/* F19 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 2 Oct 2026 (RR-135, acceptance 61407eb) — the board reads 34/91 */
/* F22 moved UNASSESSED -> IN-PROGRESS on 2 Oct 2026 (RR-137, acceptance 2d20a63) — IN-PROGRESS 10, UNASSESSED 47; the board still reads 34/91 */
/* F25 moved UNASSESSED -> IN-PROGRESS on 2 Oct 2026 (RR-137, acceptance b56655a) — IN-PROGRESS 11, UNASSESSED 46; the board still reads 34/91 */
const MOVED = ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10", "F13", "F16", "F19", "F20", "F21", "F22", "F23", "F25", "F26", "F27", "F29", "F31", "F32", "F33", "F34", "F35", "F36", "F37" /* RR-180: started under its own frozen acceptance (9516f2c) */, "F39", "F40", /* F40 left this list on 2 Oct 2026: its blocker lifted by the owner ruling _handoffs 4761236 (RR-127 §2a), it is UNASSESSED again */ "F41", "F43", "F44", "F45", "F46", "F47", "F48", "F55", "F62", "F73", "F75", "F77", "F78", "F79", "F81", "F82", "F90", "F91"]; /* F23 moved UNASSESSED -> IN-PROGRESS on 1 Oct 2026 (RR-111, acceptance d3c8e79) — IN-PROGRESS only: its real population is INCOMPLETE; the board still reads 32/91 */ /* F75 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-103, acceptance 01275a9) — the board reads 32/91 */ /* F90 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-102, acceptance 73b50bf) — the board reads 31/90 */ /* F73 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-97, acceptance 366476c) — the board reads 30/90 */ /* F29 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance c8eee0c) — the board reads 29/90 */ /* F20 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance f566059) — the board reads 28/90 */ /* F47 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance ccd4c1e) — the board reads 27/90 */ /* F46 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance 2e76216) — the board reads 26/90 */ /* F26 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-95, acceptance b1a94e7) — the board reads 25/90 */ /* F45 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-94, acceptance dcb9fbb) — the board reads 24/90 */ /* F55 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance 7323446) — the board reads 23/90 */ /* F79 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance f34f3af) — the board reads 22/90 */ /* F78 moved UNASSESSED -> IN-PROGRESS on 29 Sep 2026 (RR-93, acceptance a1885de; C1 DISPROVED on the real ledger) — the board still reads 21/90 */ /* F48 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 8d03429) — the board reads 21/90 */ /* F82 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 25c7f49) — the board reads 20/90 */ /* F43 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-91, acceptance 6c7627a) — the board reads 19/90 */ /* F41 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 454396e) — the board reads 18/90 */ /* F39 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-90, acceptance 90e798d) — the board reads 17/90 */ /* F32 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance a0b9776) — the board reads 16/90 */ /* F35 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-88, acceptance da659bd) — the board reads 15/90 */ /* F36 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 2635153) — the board reads 14/90 */ /* F21 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-86, acceptance 804ebd1) — the board reads 13/90 */ /* F31 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-85, acceptance 3a8f7ba) — the board reads 12/90 */ /* F33 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-84, acceptance 9dc9bc2) — the board reads 11/90 */ /* F34 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-83, acceptance 53f74b4) — the board reads 10/90 */ /* F77 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-82, Amendment 1 b443e5e) — the board reads 9/90 */ // F10 joined on 26 September 2026: IN-PROGRESS by movement 1 under its own frozen acceptance (504dbb9; test/f10-human-question-discovery.test.mjs) — no PASS. // F09 joined on 25 September 2026: IN-PROGRESS by movement 1 (test/f09-cross-client-portability.test.mjs). // F04 joined on 25 September 2026: IN-PROGRESS by movement 1 only (test/f04-roles-permissions-approvals.test.mjs). // F03 joined on 25 September 2026: VERIFIED-PASS on merged main, in two movements (test/f03-closure.test.mjs). // F02 STARTED (IN-PROGRESS) on 24 September 2026 under its own frozen acceptance (3ea6fda) — it earned no PASS. // F06 joined on 24 September 2026 under its own frozen acceptance; F01 the same day, under its own (test/f01-closure.test.mjs).
const UNASSESSED_ROWS = 96 - MOVED.length; // 91 -> 96: Specification Amendment 5 (RR-182): F92–F96 appended; 89 -> 90: Specification Amendment 1, owner ruling _handoffs a3a777b: F90 appended; 90 -> 91: Specification Amendment 3 (RR-103): F91 appended
/* 🔴 EVERY PASS ON THE BOARD THAT WAS ACTUALLY EARNED — counted, not assumed.
 * This read `DECLARED.F05.state === "VERIFIED-PASS" ? 1 : 0`, which silently assumed F05 was the only row that
 * could ever pass. F08 passed on 22 September 2026 and the constant was simply wrong, not the board. Counting it
 * this way is STRICTER, not looser: a pass counts only when the row carries its own frozen acceptance AND a
 * verification recorded UNDER ITS OWN ID over the REAL population, so `progress().passed === EARNED` now fails for
 * ANY row that reaches VERIFIED-PASS without earning it — not just for F05. */
const EARNED = Object.values(DECLARED).filter(
  (r) => r.state === "VERIFIED-PASS"
    && ACCEPTANCES[r.featureId]
    && (r.events ?? []).some((e) => e.kind === "VERIFIED" && e.featureId === r.featureId && e.population === "REAL"),
).length;

/* ═════════ §7 — THE REAL CORPUS ═════════ */

test("§7 REAL — the committed corpus is non-empty, names the commits it measured, and reconciles with remainder zero", () => {
  assert.match(CORPUS_PROVENANCE.governanceCommit, /^[0-9a-f]{40}$/);
  assert.match(CORPUS_PROVENANCE.engineCommit, /^[0-9a-f]{40}$/);
  assert.ok(AUTHORITY_CORPUS.length >= 50, `only ${AUTHORITY_CORPUS.length} records`);
  /* The REAL corpus is judged on the day it was measured (CORPUS_PROVENANCE.now), because its stored statuses were
   * resolved on that day. Since the F07 migration (23 Sep) that day is later than the fixed synthetic NOW, and one real
   * record is lawfully SUPERSEDED on it — the 22 Sep F08 command, by the 23 Sep one. */
  const c = census(AUTHORITY_CORPUS, CORPUS_PROVENANCE.now);
  assert.equal(c.remainder, 0);
  assert.equal(Object.values(c.counts).reduce((a, b) => a + b, 0), c.total);
  assert.equal(c.total, AUTHORITY_CORPUS.length);
  for (const d of c.dispositions) assert.ok(DISPOSITIONS.includes(d.disposition), `${d.authorityId}: ${d.disposition}`);
  // stored status is what resolution finds — never a claim
  for (const [i, r] of AUTHORITY_CORPUS.entries()) assert.equal(r.status, c.dispositions[i].disposition === "INVALID" ? null : c.dispositions[i].disposition, r.authorityId);
  // every INVALID is an undeclared issuer, never a guessed one
  for (const d of c.dispositions.filter((x) => x.disposition === "INVALID")) assert.match(d.reason, /ISSUER_UNDECLARED/);
});

test("§7 REAL — every ZERO in the census has a LIVE POSITIVE CONTROL over the same records and the same code", () => {
  /* Resolved on the corpus's OWN measuring day. On the fixed synthetic NOW (22 Sep) the 23 Sep records are simply not
   * yet in effect — a date artefact, not a finding. */
  const DAY = CORPUS_PROVENANCE.now;
  const c = census(AUTHORITY_CORPUS, DAY);
  /* SUPERSEDED → a newer clone of a real record makes exactly ONE MORE record SUPERSEDED, measured from the real
   * baseline on the same day. (It was "0 → 1" until the real corpus held a real supersession — 23 Sep, F07 migration.) */
  const base = census(AUTHORITY_CORPUS, "2026-09-24").counts.SUPERSEDED;
  const s = census([...AUTHORITY_CORPUS, clone({ issuedAt: "2026-09-24", effectiveFrom: "2026-09-24", contentHash: H("newer") })], "2026-09-24");
  assert.equal(c.counts.SUPERSEDED, base, "the real supersession count moved between the measuring day and the next");
  assert.equal(s.counts.SUPERSEDED, base + 1);
  // OPEN_CONFLICT 0 → a same-day clone that disagrees makes both OPEN_CONFLICT
  const o = census([...AUTHORITY_CORPUS, clone({ contentHash: H("disagrees") })], DAY);
  assert.equal(c.counts.OPEN_CONFLICT, 0);
  assert.equal(o.counts.OPEN_CONFLICT, 2);
  // NOT_APPLICABLE 0 → the same corpus resolved before its records were effective
  const n = census(AUTHORITY_CORPUS, "2026-01-01");
  assert.equal(c.counts.NOT_APPLICABLE, 0);
  assert.ok(n.counts.NOT_APPLICABLE > 0);
});

test("§7 REAL — the inclusion rule: the report exclusion is by document TYPE, and no near-miss governance name escapes it", () => {
  // firing: a register and a resume about a ruling are excluded; silent: a ruling ABOUT a census, and a command ABOUT a register, are not
  assert.equal(ruleFor(GOVERNANCE_RULES, "AlmiVisibility_RULING_REGISTER_2026-09-19.md", EXCLUDE), null);
  assert.equal(ruleFor(GOVERNANCE_RULES, "AlmiVisibility_X_DECISION_ONLY_RESUME_2026-09-17.md", EXCLUDE), null);
  assert.ok(ruleFor(GOVERNANCE_RULES, "AlmiVisibility_GAP2_MEASURE_CENSUS_BEFORE_FIXING_RULING_2026-09-16.md", EXCLUDE));
  assert.ok(ruleFor(GOVERNANCE_RULES, "AlmiVisibility_CC_COMMAND_2026-09-22_F05_CURRENT_AUTHORITY_REGISTER_CHAIN.md", EXCLUDE));
  assert.ok(ruleFor(GOVERNANCE_RULES, "AlmiVisibility_ROW61_OWNER_DECISION_2026-09-15.md", EXCLUDE));
  // other products' commands are never candidates
  assert.equal(ruleFor(GOVERNANCE_RULES, "AlmiOET_CC_COMMAND_2026-09-04_ALL.md", EXCLUDE), null);
  assert.equal(propositionOf("AlmiVisibility_OWNER_RULING_2026-09-22_F05_ACCEPTANCE.md", "(AlmiVisibility_)?"), F05_PROP);
  assert.deepEqual(scopeOf(F05_PROP, "ALMIVISIBILITY"), F05_SCOPE);
});

test("§7A REAL — historical board records are NOT in the candidate set: every corpus record is a governance record, none a ledger", () => {
  const query = (r) => r.sourceRef.kind !== "GOVERNANCE_RECORD" || /^(src\/checklist\/|CHECKLIST_STATUS\.md$|CHECKLIST_BOUNDARIES\.md$|PHASE_0_FROZEN_GAP_REGISTER\.md$)/.test(r.sourceRef.path);
  assert.deepEqual(AUTHORITY_CORPUS.filter(query).map((r) => r.authorityId), []);
  // live positive control — the same query finds a planted ledger-sourced record
  assert.equal([clone({ sourceRef: { kind: "HISTORICAL_BOARD_STATE", path: "src/checklist/classification.mjs", commit: "c" } })].filter(query).length, 1);
  // …and the historical rows went to the crosswalk, as provenance: 61
  assert.equal(CROSSWALK.provenance.length, 61);
});

/* ═════════ P1–P12 — THE RESOLVER ═════════ */

test("P1 — a newer exact-scope authority becomes CURRENT (synthetic, and a real record's newer clone)", () => {
  const r = resolve({ records: [OLD, NEW], propositionId: "P", scope: ["ROOT"], now: NOW });
  assert.equal(r.outcome, "CURRENT");
  assert.deepEqual(r.authority.authorityIds, ["syn:new"]);
  // silent control: the older alone is CURRENT
  assert.deepEqual(resolve({ records: [OLD], propositionId: "P", scope: ["ROOT"], now: NOW }).authority.authorityIds, ["syn:old"]);
  // real: a newer clone of the F05 ruling governs over the real record
  const real = resolve({ records: [...AUTHORITY_CORPUS, clone({ issuedAt: "2026-09-23", effectiveFrom: "2026-09-23", contentHash: H("n") })], propositionId: F05_PROP, scope: F05_SCOPE, now: "2026-09-23" });
  assert.deepEqual(real.authority.authorityIds, ["planted:clone"]);
});

test("P2 — the older conflicting authority is SUPERSEDED — DO NOT APPLY, and is never the authority", () => {
  const r = resolve({ records: [OLD, NEW], propositionId: "P", scope: ["ROOT"], now: NOW });
  assert.equal(disp(r, "syn:old"), "SUPERSEDED");
  assert.match(r.candidates.find((c) => c.authorityId === "syn:old").reason, /SUPERSEDED — DO NOT APPLY/);
  assert.ok(!r.authority.authorityIds.includes("syn:old"));
  // silent control: with no newer record the same record is CURRENT, not SUPERSEDED
  assert.equal(disp(resolve({ records: [OLD], propositionId: "P", scope: ["ROOT"], now: NOW }), "syn:old"), "CURRENT");
});

test("P3 — superseded content stays retrievable and hash-identical: nothing is deleted or mutated", () => {
  const records = [OLD, NEW].map((x) => structuredClone(x));
  const before = JSON.stringify(records);
  const r = resolve({ records, propositionId: "P", scope: ["ROOT"], now: NOW });
  assert.equal(JSON.stringify(records), before, "the resolver mutated its input");
  assert.ok(r.candidates.some((c) => c.authorityId === "syn:old" && c.disposition === "SUPERSEDED"), "the superseded record left the audit trail");
  assert.equal(records.find((x) => x.authorityId === "syn:old").contentHash, H("old"));
  // real: the corpus records are frozen, and superseding the real F05 ruling leaves its record and hash in place
  assert.ok(Object.isFrozen(AUTHORITY_CORPUS) && AUTHORITY_CORPUS.every((x) => Object.isFrozen(x)));
  const real = resolve({ records: [...AUTHORITY_CORPUS, clone({ issuedAt: "2026-09-23", effectiveFrom: "2026-09-23", contentHash: H("n") })], propositionId: F05_PROP, scope: F05_SCOPE, now: "2026-09-23" });
  assert.equal(disp(real, REAL_F05.authorityId), "SUPERSEDED");
  assert.equal(AUTHORITY_CORPUS.find((x) => x.authorityId === REAL_F05.authorityId).contentHash, F05_RULING_SHA);
});

const BROAD = rec({ authorityId: "syn:broad", scope: ["ROOT"], contentHash: H("broad") });
const NARROW = rec({ authorityId: "syn:narrow", scope: ["ROOT", "F05"], issuedAt: "2026-03-01", effectiveFrom: "2026-03-01", contentHash: H("narrow") });

test("P4 — a narrow authority does not supersede a sibling scope, nor the wider scope above it", () => {
  const sib = resolve({ records: [BROAD, NARROW], propositionId: "P", scope: ["ROOT", "F06"], now: NOW });
  assert.deepEqual(sib.authority.authorityIds, ["syn:broad"]);
  assert.equal(disp(sib, "syn:narrow"), "NOT_APPLICABLE");
  // firing: inside its own scope the narrow one governs
  assert.deepEqual(resolve({ records: [BROAD, NARROW], propositionId: "P", scope: ["ROOT", "F05"], now: NOW }).authority.authorityIds, ["syn:narrow"]);
  // real: the F05 ruling does not reach the wider scope — ABSENT, never widened
  const wide = resolve({ records: AUTHORITY_CORPUS, propositionId: F05_PROP, scope: ["ALMIVISIBILITY"], now: NOW });
  assert.equal(wide.outcome, "ABSENT");
  assert.match(wide.candidates[0].reason, /never widened/);
  assert.equal(resolve({ records: AUTHORITY_CORPUS, propositionId: F05_PROP, scope: ["ALMIVISIBILITY", "F06"], now: NOW }).outcome, "ABSENT");
});

test("P5 — a broad older authority remains CURRENT outside the narrow scope", () => {
  const out = resolve({ records: [BROAD, NARROW], propositionId: "P", scope: ["ROOT"], now: NOW });
  assert.equal(out.outcome, "CURRENT");
  assert.deepEqual(out.authority.authorityIds, ["syn:broad"]);
  // and inside the narrow scope the broad one is superseded — the same record, two scopes, two truthful answers
  assert.equal(disp(resolve({ records: [BROAD, NARROW], propositionId: "P", scope: ["ROOT", "F05"], now: NOW }), "syn:broad"), "SUPERSEDED");
});

test("P6 — equal or incomparable disagreement returns OPEN_CONFLICT; agreement does not", () => {
  const tie = resolve({ records: [OLD, rec({ authorityId: "syn:twin", contentHash: H("other") })], propositionId: "P", scope: ["ROOT"], now: NOW });
  assert.equal(tie.outcome, "OPEN_CONFLICT");
  assert.equal(tie.authority, null);
  const incomparable = resolve({ records: [OLD, rec({ authorityId: "syn:beta", issuer: { class: "BETA_G" }, issuedAt: "2026-05-01", effectiveFrom: "2026-05-01", contentHash: H("b") })], propositionId: "P", scope: ["ROOT"], now: NOW });
  assert.equal(incomparable.outcome, "OPEN_CONFLICT", "a newer record from another issuer class must not win by date");
  // silent control: the same authority recorded twice is one CURRENT authority
  assert.equal(resolve({ records: [OLD, rec({ authorityId: "syn:copy", contentHash: H("old") })], propositionId: "P", scope: ["ROOT"], now: NOW }).outcome, "CURRENT");
  // real: a disagreeing same-day clone of the F05 ruling is an open conflict
  assert.equal(resolve({ records: [...AUTHORITY_CORPUS, clone({ contentHash: H("x") })], propositionId: F05_PROP, scope: F05_SCOPE, now: NOW }).outcome, "OPEN_CONFLICT");
});

test("P7 — no applicable authority returns ABSENT (synthetic, real, and through the production CLI)", () => {
  assert.equal(resolve({ records: [OLD], propositionId: "Q", scope: ["ROOT"], now: NOW }).outcome, "ABSENT");
  assert.equal(resolve({ records: [], propositionId: "P", scope: ["ROOT"], now: NOW }).outcome, "ABSENT");
  const cli = node("bin/authority-resolve.mjs", "--proposition=NO_SUCH_PROPOSITION", "--scope=ALMIVISIBILITY", "--require");
  assert.equal(cli.status, 1);
  assert.match(cli.stdout, /^ABSENT · NO_SUCH_PROPOSITION/m);
  // silent control: the real F05 ruling through the same CLI is CURRENT, exit 0
  const ok = node("bin/authority-resolve.mjs", `--proposition=${F05_PROP}`, `--scope=${F05_SCOPE.join("/")}`, "--require");
  assert.equal(ok.status, 0, ok.stdout);
  assert.match(ok.stdout, new RegExp(`^CURRENT · ${F05_PROP}`, "m"));
  assert.match(ok.stdout, new RegExp(F05_RULING_SHA));
});

test("P8 — ABSENT cannot produce permission, a default or a PASS", () => {
  const r = resolve({ records: [], propositionId: "P", scope: ["ROOT"], now: NOW });
  assert.equal(permits(r), false);
  assert.throws(() => requireCurrent(r), /NO_CURRENT_AUTHORITY: ABSENT/);
  // production: a board whose acceptance ruling is ABSENT from the authority corpus is refused
  const errs = boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS.filter((x) => x.propositionId !== F05_PROP), now: REAL_DAY } });
  assert.deepEqual(errs.map((e) => `${e.code} ${e.id}`), ["ACCEPTANCE_NOT_CURRENT_AUTHORITY F05"]);
  assert.match(errs[0].why, /ABSENT/);
  // silent control: the real corpus
  assert.deepEqual(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: REAL_AUTH }), []);
  assert.deepEqual(requireCurrent(resolve({ records: AUTHORITY_CORPUS, propositionId: F05_PROP, scope: F05_SCOPE, now: NOW })).authorityIds, [REAL_F05.authorityId]);
});

test("P9 — OPEN_CONFLICT cannot produce permission, a default or a PASS — and never falls back to an older record", () => {
  const r = resolve({ records: [rec({ authorityId: "syn:older", issuedAt: "2025-01-01", effectiveFrom: "2025-01-01" }), OLD, rec({ authorityId: "syn:twin", contentHash: H("t") })], propositionId: "P", scope: ["ROOT"], now: NOW });
  assert.equal(r.outcome, "OPEN_CONFLICT");
  assert.equal(permits(r), false);
  assert.equal(disp(r, "syn:older"), "SUPERSEDED");
  assert.throws(() => requireCurrent(r), /NO_CURRENT_AUTHORITY: OPEN_CONFLICT/);
  const errs = boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: [...AUTHORITY_CORPUS, clone({ contentHash: H("x") })], now: REAL_DAY } });
  assert.deepEqual(errs.map((e) => `${e.code} ${e.id}`), ["ACCEPTANCE_NOT_CURRENT_AUTHORITY F05"]);
  assert.match(errs[0].why, /OPEN_CONFLICT/);
});

test("P10 — malformed authority is INVALID, and so is a request that omits proposition, scope or date", () => {
  const bad = [
    ["ISSUER_UNDECLARED", { issuer: {} }], ["SCOPE_ABSENT_OR_WILDCARD", { scope: ["*"] }], ["SCOPE_ABSENT_OR_WILDCARD", { scope: [] }],
    ["SOURCE_UNDECLARED", { sourceRef: { kind: "REPORT", path: "x", commit: "c" } }], ["CONTENT_HASH_MALFORMED", { contentHash: "abc" }],
    ["EFFECTIVE_BEFORE_ISSUED", { effectiveFrom: "2025-12-31" }], ["ISSUED_AT_UNDECLARED", { issuedAt: null }], ["STATUS_UNKNOWN", { status: null }],
  ];
  for (const [code, o] of bad) {
    const r = resolve({ records: [rec({ authorityId: "syn:bad", ...o })], propositionId: "P", scope: ["ROOT"], now: NOW });
    assert.equal(disp(r, "syn:bad"), "INVALID", code);
    assert.match(r.candidates[0].reason, new RegExp(code));
    assert.equal(r.outcome, "ABSENT", "an INVALID record takes no further part");
  }
  for (const req of [{ propositionId: "", scope: ["ROOT"], now: NOW }, { propositionId: "P", scope: null, now: NOW }, { propositionId: "P", scope: ["*"], now: NOW }, { propositionId: "P", scope: ["ROOT"], now: null }]) {
    assert.equal(resolve({ records: [OLD], ...req }).outcome, "INVALID");
  }
  assert.deepEqual(recordFaults(OLD), [], "silent control: the lawful record has no fault");
  // real: 20 records whose names declare no issuer are INVALID — never given one
  assert.ok(census(AUTHORITY_CORPUS, NOW).counts.INVALID > 0);
});

const permutations = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
const summary = (r) => JSON.stringify({ o: r.outcome, a: r.authority?.authorityIds ?? null, c: r.candidates.map((c) => `${c.authorityId}:${c.disposition}`) });

test("P11 — file order cannot alter the result (every permutation, CURRENT and OPEN_CONFLICT cases; the real corpus reversed)", () => {
  for (const set of [[OLD, NEW, BROAD, NARROW], [OLD, rec({ authorityId: "syn:twin", contentHash: H("t") }), rec({ authorityId: "syn:older", issuedAt: "2025-01-01", effectiveFrom: "2025-01-01" })]]) {
    const seen = new Set(permutations(set).map((p) => summary(resolve({ records: p, propositionId: "P", scope: ["ROOT", "F05"], now: NOW }))));
    assert.equal(seen.size, 1, [...seen].join("\n"));
  }
  const fwd = census(AUTHORITY_CORPUS, NOW), rev = census([...AUTHORITY_CORPUS].reverse(), NOW);
  assert.deepEqual(rev.counts, fwd.counts);
  assert.deepEqual(new Map(rev.dispositions.map((d) => [d.authorityId, d.disposition])), new Map(fwd.dispositions.map((d) => [d.authorityId, d.disposition])));
});

test("P12 — filename and authority id cannot alter the result: renaming either never breaks or makes a tie", () => {
  const rename = (r, id) => ({ ...r, authorityId: id, sourceRef: { ...r.sourceRef, path: `${id}.md` } });
  for (const [a, b] of [["aaa", "zzz"], ["zzz", "aaa"], ["2099", "0000"]]) {
    const twin = resolve({ records: [rename(OLD, a), rename(rec({ contentHash: H("t") }), b)], propositionId: "P", scope: ["ROOT"], now: NOW });
    assert.equal(twin.outcome, "OPEN_CONFLICT", `ids ${a}/${b} broke a tie`);
    const pair = resolve({ records: [rename(OLD, a), rename(NEW, b)], propositionId: "P", scope: ["ROOT"], now: NOW });
    assert.deepEqual(pair.authority.authorityIds, [b], `ids ${a}/${b} changed which record is newest`);
  }
});

/* ═════════ P13–P19 — THE BOARD, THE CROSSWALK, THE COMPARATOR ═════════ */

test("P13 — historical PASS cannot become F-row authority: not as a record, not as a state, not on a board row", () => {
  const hist = rec({ authorityId: "syn:hist", sourceRef: { kind: "HISTORICAL_BOARD_STATE", path: "ledger", commit: "c" } });
  const r = resolve({ records: [hist], propositionId: "P", scope: ["ROOT"], now: NOW });
  assert.equal(disp(r, "syn:hist"), "INVALID");
  assert.match(r.candidates[0].reason, /HISTORICAL_BOARD_STATE_IS_NOT_AUTHORITY/);
  assert.equal(r.outcome, "ABSENT");
  const rows = classify();
  assert.throws(() => fBoardState({ board: rows[4].board, state: rows[4].state }), (e) => e.code === "HISTORICAL_STATE_REFUSED");
  const b = board().map((x) => (x.featureId === "F01" ? { ...x, historicalState: "VERIFIED-PASS" } : x));
  assert.deepEqual(boardErrors(b, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).map((e) => e.code), ["HISTORICAL_STATE_IMPORTED"]);
  // silent control: an F-board record is read
  assert.equal(fBoardState({ board: F_BOARD, state: "VERIFIED-PASS" }), "VERIFIED-PASS");
});

test("P14 — the crosswalk cannot transfer historical PASS: provenance only, and the artefact is fresh", () => {
  assert.deepEqual(crosswalkErrors(CROSSWALK), []);
  assert.equal(CROSSWALK.entries.length, DENOMINATOR);
  assert.ok(CROSSWALK.entries.every((e) => e.authorityImported === false && e.freshVerificationRequired === true));
  assert.ok(CROSSWALK.provenance.every((p) => p.board === HISTORICAL_BOARD && p.role === "PROVENANCE_REFERENCE" && p.authorityImported === false));
  assert.ok(CROSSWALK.provenance.filter((p) => p.state === "VERIFIED-PASS").length > 0, "control: historical PASS rows ARE present, as provenance");
  const bad = structuredClone(CROSSWALK);
  bad.entries[4].authorityImported = true;
  bad.provenance[3].role = "AUTHORITY";
  assert.deepEqual(crosswalkErrors(bad).map((e) => e.code).sort(), ["AUTHORITY_IMPORTED", "PROVENANCE_AS_AUTHORITY"]);
  const cur = readFileSync(join(REPO, "config", "fboard", "crosswalk.mjs"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(cur, renderCrosswalk().text, "config/fboard/crosswalk.mjs is stale — run node bin/fboard-crosswalk.mjs");
  // and historical PASS moves no F-progress
  assert.equal(progress(board()).passed, EARNED, "historical PASS moved F-progress");
});

test("P15 — NEW and CHANGED require full fresh proof: nothing is waived, and a PASS needs its own verification", () => {
  const f05 = CROSSWALK.entries.find((e) => e.featureId === "F05");
  assert.equal(f05.acceptanceRelation, "NEW");
  const changed = acceptanceRelation({ acceptance: ACCEPTANCES.F05, historicalContracts: [{ row: 5, ...ACCEPTANCES.F05, expected: "something else" }] });
  assert.equal(changed.relation, "CHANGED");
  const waived = structuredClone(CROSSWALK);
  waived.entries[4].freshVerificationRequired = false;
  assert.deepEqual(crosswalkErrors(waived).map((e) => e.code), ["FRESH_VERIFICATION_WAIVED"]);
  // (the fixture removes F05's own recorded verification first — a PASS with none must be refused)
  const b = board().map((x) => (x.featureId === "F05" ? { ...x, state: "VERIFIED-PASS", events: x.events.filter((e) => e.kind !== "VERIFIED") } : x));
  assert.deepEqual(boardErrors(b, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).map((e) => e.code), ["PASS_WITHOUT_VERIFICATION"]);
});

test("P16 — IDENTICAL requires byte-identical four-part acceptance after ONLY the declared normalisation", () => {
  const A = ACCEPTANCES.F05;
  // firing first: a semantically similar clause is CHANGED — the guard this proof exists for
  for (const [why, v] of [["case", A.failure.toUpperCase()], ["punctuation", A.failure.replace(/;/g, ",")], ["synonym", A.failure.replace("older", "earlier")], ["one word dropped", A.failure.replace(/quietly\s+/, "")]]) {
    const r = compareContracts(A, { ...A, failure: v });
    assert.equal(r.relation, "CHANGED", `a ${why} variant was called IDENTICAL`);
    assert.deepEqual(r.differing, ["failure"], why);
  }
  // silent control: whitespace and line endings alone — the declared normalisation — are IDENTICAL, with the same hash
  const reflowed = { ...A, input: A.input.replace(/\n/g, "\r\n   "), expected: `  ${A.expected}  ` };
  assert.equal(compareContracts(A, reflowed).relation, "IDENTICAL");
  assert.equal(contractSha256(reflowed), A.contractSha256);
});

test("P17 — IDENTICAL still requires a current real-population rerun UNDER THE F-ID", () => {
  const same = acceptanceRelation({ acceptance: ACCEPTANCES.F05, historicalContracts: [{ row: 5, ...ACCEPTANCES.F05 }] });
  assert.equal(same.relation, "IDENTICAL");
  const cw = buildCrosswalk({ capabilities: CAPABILITIES, acceptances: ACCEPTANCES, mappings: { F05: { contracts: [{ row: 5, ...ACCEPTANCES.F05 }] } } });
  assert.equal(cw.entries[4].acceptanceRelation, "IDENTICAL");
  assert.equal(cw.entries[4].freshVerificationRequired, true);
  const pass = (ev) => board().map((x) => (x.featureId === "F05" ? { ...x, state: "VERIFIED-PASS", events: [...x.events.filter((e) => e.kind !== "VERIFIED"), ev] } : x));
  for (const ev of [{ kind: "VERIFIED", featureId: "F04", population: "REAL" }, { kind: "VERIFIED", featureId: "F05", population: "FIXTURE" }, { kind: "VERIFIED", row: 5, population: "REAL" }]) {
    assert.deepEqual(boardErrors(pass(ev), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).map((e) => e.code), ["PASS_WITHOUT_VERIFICATION"], JSON.stringify(ev));
  }
  // silent control: a real-population verification under F05 is accepted
  assert.deepEqual(boardErrors(pass({ kind: "VERIFIED", featureId: "F05", population: "REAL" }), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }), []);
});

test("P18 — UNASSESSED cannot enter implementation", () => {
  const b = board();
  const unassessed = b.filter((x) => x.state === "UNASSESSED");
  assert.equal(unassessed.length, UNASSESSED_ROWS);
  for (const x of unassessed) assert.equal(mayImplement(b, x.featureId, ACCEPTANCES), false, x.featureId);
  // F11: an UNASSESSED row (F01, F02, F03, F04, F09, then F10, were this example until each moved under its own acceptance; F10 on 26 September 2026).
  const impl = b.map((x) => (x.featureId === "F11" ? { ...x, events: [{ kind: "IMPLEMENTATION", on: NOW }] } : x));
  assert.deepEqual(boardErrors(impl, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).map((e) => e.code).sort(), ["IMPLEMENTATION_BEFORE_ACCEPTANCE", "UNASSESSED_IMPLEMENTED"]);
  // silent control: F05, with its frozen acceptance, may
  assert.equal(mayImplement(b, "F05", ACCEPTANCES), true);
});

/* RR-127 §2a (2 Oct 2026): P19 used to pin F40's 350-word-floor blocker. The owner ruling (_handoffs 4761236) superseded it; this proves
 * the lift is lawful and loses nothing — the blocker's record and the old note survive in the row's history — and that F40 is still not
 * implementable, and its future acceptance cannot be frozen without the owner's check. */
test("P19 — F40's 350-word-floor blocker is lifted ONLY by a CURRENT owner ruling, its history kept; F40 was UNASSESSED and not implementable until its own acceptance froze (RR-184), carrying both of the ruling's preconditions", () => {
  const f40 = board().find((x) => x.featureId === "F40");
  /* RR-184: F40 frozen under its own acceptance (_handoffs 6d64c27), started after its lift, then PROVED (rr184-sabotage-2026-10-06T0301: 37 of 37) */
  assert.equal(fBoardState(f40), ((r) => (r.state === "IN-PROGRESS" && r.events.at(-1)?.kind === "REOPENED" && r.events.at(-1)?.reason === "AUTHORITATIVE_REQUIREMENT_CHANGE" && r.events.at(-2)?.kind === "ACCEPTANCE_AMENDED" ? "IN-PROGRESS" : "VERIFIED-PASS"))(f40)); /* RR-188: F40's lawful state — VERIFIED-PASS, or IN-PROGRESS while its own Amendment 1 has reopened it */
  assert.equal(f40.blocker, undefined);
  const [rec, lift] = f40.events;
  assert.deepEqual([rec.kind, lift.kind, lift.from, lift.to, lift.liftedBlocker], ["BLOCKER_RECORDED", "BLOCKER_LIFTED", "BLOCKED-BY-AUTHORITY", "UNASSESSED", "UNIVERSAL_350_WORD_FLOOR_STILL_APPLICABLE"]);
  assert.match(lift.supersededNote, /Amendment 7 changed only the fact floor/);
  assert.equal(resolve({ records: AUTHORITY_CORPUS, propositionId: lift.authority.propositionId, scope: lift.authority.scope, now: CORPUS_PROVENANCE.now }).outcome, "CURRENT");
  assert.deepEqual(ROW_CONSTRAINTS.filter((c) => c.featureId === "F40").map((c) => c.requires), ["whether the page answers its stated need", "no fixed minimum and no fixed maximum page word count"]);
  /* RR-184: implementable ONLY because its own frozen acceptance carries both preconditions; without it, still not implementable */
  for (const c of ROW_CONSTRAINTS.filter((x) => x.featureId === "F40")) assert.ok([ACCEPTANCES.F40.input, ACCEPTANCES.F40.expected, ACCEPTANCES.F40.failure, ACCEPTANCES.F40.evidence].join("\n").includes(c.requires), c.requires);
  assert.equal(mayImplement(board(), "F40", ACCEPTANCES), true);
  const { F40: _f40, ...withoutF40 } = ACCEPTANCES;
  assert.equal(mayImplement(board(), "F40", withoutF40), false, "F40 is implementable without its own acceptance");
  /* the BLOCKER_UNNAMED control, kept able to fire: F40 put back into a blocked state with no named blocker is refused */
  const stripped = board().map((x) => (x.featureId === "F40" ? { ...x, state: "BLOCKED-BY-AUTHORITY", blocker: "" } : x));
  assert.deepEqual(boardErrors(stripped, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).map((e) => `${e.code} ${e.id}`), ["BLOCKER_UNNAMED F40"]);
});

/* ═════════ P20–P26 ═════════ */

const F05_FILES = trackedFiles(REPO).concat(["config/authority/corpus.mjs", "config/authority/inclusion.mjs", "config/fboard/crosswalk.mjs", "config/fboard/acceptances.mjs", "config/fboard/f-board.mjs", "config/fboard/capabilities.mjs", "src/authority/register.mjs", "src/authority/corpus.mjs", "src/fboard/board.mjs", "src/fboard/acceptance.mjs", "src/fboard/crosswalk.mjs", "bin/fboard-derive.mjs", "bin/authority-migrate.mjs", "bin/authority-resolve.mjs", "bin/fboard-status.mjs", "bin/fboard-crosswalk.mjs", "test/f05-authority-register.test.mjs"])
  .filter((p, i, a) => a.indexOf(p) === i && /^(src\/(authority|fboard)|config\/(authority|fboard)|bin\/(authority|fboard)-|test\/f05-|runs\/audit\/f05-)/.test(p));

test("P20 — the new mandatory-readable F05 files contain no held-out payload (real population; planted synthetic control)", () => {
  assert.ok(F05_FILES.length >= 12, `only ${F05_FILES.length} F05 files`);
  const STORE = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
  const derive = (id) => {
    const rows = queryObservation(STORE, id).value.rows;
    const members = splitPopulation(rows).human.filter((r) => isHeldOut(r.query)).map((r) => r.query);
    const set = new Set(members.map((m) => m.toLowerCase()));
    return { members, others: rows.map((r) => r.query).filter((q) => !set.has(String(q).toLowerCase())) };
  };
  const pop = derivePopulation(EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "RETIRED_CONTAMINATED"), derive);
  assert.equal(pop.ok, true);
  const prod = trackedFiles(REPO).filter((p) => /^(src|bin|tools|config|subjects)\/.*\.mjs$/.test(p)).map((p) => readFileSync(join(REPO, p), "utf8"));
  const fragments = distinctiveFragments(pop.members, pop.others, prod);
  const r = scan({ registry: EVIDENCE_ROLE_REGISTRY, root: "engine", base: REPO, files: F05_FILES, members: pop.members, fragments });
  assert.deepEqual(r.failures.map((f) => `${f.disposition} ${f.path}`), []);
  // SYNTHETIC — NOT REAL EVIDENCE (seed 7801): a planted synthetic member in a copy of an F05 governance file IS caught
  const syn = syntheticCorpus({ seed: 7801, intents: 1, queriesPerIntent: 2, fillerCount: 1 }).rows.map((q) => q.query);
  const dir = mkdtempSync(join(tmpdir(), "f05-p20-"));
  try {
    mkdirSync(join(dir, "config", "fboard"), { recursive: true });
    writeFileSync(join(dir, "config", "fboard", "acceptances.mjs"), `${readFileSync(join(REPO, "config/fboard/acceptances.mjs"), "utf8")}\n// held-out: ${syn[0]}\n`);
    const planted = scan({ registry: EVIDENCE_ROLE_REGISTRY, root: "engine", base: dir, files: ["config/fboard/acceptances.mjs"], members: syn, fragments: [] });
    assert.equal(planted.failures.length, 1);
    const clean = scan({ registry: EVIDENCE_ROLE_REGISTRY, root: "engine", base: REPO, files: ["config/fboard/acceptances.mjs"], members: syn, fragments: [] });
    assert.equal(clean.failures.length, 0, "silent control");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const PRODUCT = /almi|\boet\b|celpip|toefl|ielts|\bpte\b|nursing|_handoffs/i;
test("P21 — the generic F05 production code carries no product or client name — comments included", () => {
  const generic = F05_FILES.filter((p) => /^src\//.test(p));
  assert.ok(generic.length >= 5, `only ${generic.length} generic modules`);
  const hits = generic.flatMap((p) => readFileSync(join(REPO, p), "utf8").split("\n").map((l, i) => (PRODUCT.test(l) ? `${p}:${i + 1}` : null)).filter(Boolean));
  assert.deepEqual(hits, []);
  assert.ok(PRODUCT.test("// the AlmiVisibility ruling") && PRODUCT.test("OET"), "control: the pattern fires on a planted name");
});

test("P22 — F01–F96 each exist once, in the specification's order, and the denominator is 96 (Amendment 1: 90; Amendment 3, RR-103: 91; Amendment 5, RR-182: 96)", () => {
  assert.equal(DENOMINATOR, 96);
  assert.deepEqual(CAPABILITIES.map((c) => c.id), Array.from({ length: 96 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`));
  const s = progress(board());
  assert.equal(s.total, 96);
  assert.equal(Object.values(s.split).reduce((a, b) => a + b, 0), 96);
  assert.deepEqual(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }), []);
  assert.ok(boardErrors(board().slice(0, DENOMINATOR - 1), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((e) => e.code === "DENOMINATOR"));
  const dup = board(); dup[DENOMINATOR - 1] = { ...dup[0] };
  assert.ok(boardErrors(dup, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).some((e) => e.code === "DENOMINATOR"));
});

test("P22b — F90 is the owner ruling's row, byte for byte; F00 and F97 do not exist (Amendment 1; the F91 control restated as F92 by Amendment 3, and as F97 by Amendment 5)", () => {
  /* The ruling's fenced line (_handoffs a3a777b), carried here as TEXT and hashed here — CI has no _handoffs checkout,
   * and a pin compared to itself proves nothing, so the expected hash is re-derived, never copied from capabilities.mjs. */
  const RULING_F90 = "F90 | Assurance | Falsifiability of findings | Every finding presented as actionable carries a structured refutation — what observation, from a method the product actually holds, would overturn it, and the threshold at which it is void — proved by a census over the real findings.";
  const f90 = CAPABILITIES.find((c) => c.id === "F90");
  assert.ok(f90, "F90 exists");
  assert.equal(f90.lineSha256, createHash("sha256").update(RULING_F90).digest("hex"));
  assert.equal(f90.name, "Falsifiability of findings");
  const row = board().find((r) => r.featureId === "F90");
  /* F90 started UNASSESSED with no events (Amendment 1, 28 Sep). On 30 Sep 2026 it moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS under
   * its own frozen acceptance (_handoffs 73b50bf, RR-102): its first event is that freeze, and its first movement leaves UNASSESSED. */
  assert.equal(row.state, "VERIFIED-PASS");
  assert.deepEqual(row.events.map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "VERIFIED"]);
  assert.equal(row.events[1].from, "UNASSESSED");
  /* 🔴 RESTATED 30 Sep 2026 (Specification Amendment 3, RR-103 §2.2): F91 was this control — "the id one past the last row does not exist" —
   * until F91 became a row. The control is restated, not retired: it was F92, one past the new last row.
   * 🔴 RESTATED 6 Oct 2026 (Specification Amendment 5, RR-182 §3): F92–F96 are rows; the control is now F97, one past the new last row. */
  assert.ok(CAPABILITIES.some((c) => c.id === "F91"), "F91 is a row since Amendment 3");
  assert.ok(CAPABILITIES.some((c) => c.id === "F96"), "F96 is a row since Amendment 5");
  for (const absent of ["F00", "F97"]) assert.equal(CAPABILITIES.some((c) => c.id === absent), false, `${absent} must not exist`);
  /* negative control: renaming the last row F97 is a board error, so the check above can fail */
  const renamed = board(); renamed[DENOMINATOR - 1] = { ...renamed[DENOMINATOR - 1], featureId: "F97" };
  assert.notDeepEqual(boardErrors(renamed, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }), []);
});

test("P23 — historical 61/38 results remain reproducible, and do not affect F-progress", () => {
  const rows = classify();
  const tally = Object.fromEntries(STATES.map((s) => [s, 0]));
  for (const k of Object.keys(rows)) tally[rows[k].state] += 1;
  assert.deepEqual(STATES.map((s) => tally[s]), [2, 4, 0, 27, 3, 2, 23]);
  assert.equal(Object.keys(rows).length, 61);
  assert.equal(61 - tally.DEFERRED, 38);
  assert.ok(Object.values(rows).every((r) => r.board === HISTORICAL_BOARD));
  assert.equal(LEDGER_STATUS.transfersState, false);
  assert.equal(LEDGER_STATUS.grantsAcceptanceAuthority, false);
  const p = progress(board());
  assert.equal(p.passed, EARNED, "27 historical PASSes moved F-progress");
  assert.deepEqual(board().filter((x) => x.state !== "UNASSESSED").map((x) => x.featureId), MOVED, `a feature outside ${MOVED.join(", ")} moved`);
  assert.equal(p.split.UNASSESSED, UNASSESSED_ROWS);
  assert.ok(["IN-PROGRESS", "VERIFIED-PASS"].includes(DECLARED.F05.state), DECLARED.F05.state);
});

test("P24 — the committed F05 ruling hash is the acceptance used by code and tests, end to end", () => {
  assert.equal(ACCEPTANCES.F05.ruling.sha256, F05_RULING_SHA);
  assert.equal(ACCEPTANCES.F05.contractSha256, F05_CONTRACT_SHA);
  assert.equal(contractSha256(ACCEPTANCES.F05), F05_CONTRACT_SHA);
  assert.equal(REAL_F05.contentHash, F05_RULING_SHA, "the migrated corpus hashed different bytes");
  /* 🔴 CORRECTED 22 September 2026, and it is a STRENGTHENING, not a relaxation.
   *
   * This line used to read `REAL_F05.sourceRef.commit === ACCEPTANCES.F05.ruling.commit`, and it passed only because
   * F05's ruling happened to be the NEWEST governance commit when the corpus was migrated. Those are two different
   * facts: the acceptance pins the commit that introduced the RULING, while sourceRef.commit names the SNAPSHOT the
   * corpus was migrated from. The moment any later governance commit exists — F08's, here — they diverge, and the
   * assertion would fail without anything being wrong.
   *
   * The end-to-end claim that actually matters is byte identity, and it is asserted above and unchanged. What is
   * added here is the invariant the old line was reaching for: EVERY record names the same migration snapshot, so a
   * corpus assembled from mixed commits is still caught. */
  assert.equal(REAL_F05.sourceRef.commit, CORPUS_PROVENANCE.governanceCommit, "the F05 record does not name the corpus's own migration snapshot");
  for (const r of AUTHORITY_CORPUS.filter((x) => x.sourceRef.repo === "_handoffs")) {
    assert.equal(r.sourceRef.commit, CORPUS_PROVENANCE.governanceCommit, `${r.authorityId} was migrated from a different commit`);
  }
  const ev = DECLARED.F05.events.find((e) => e.kind === "ACCEPTANCE_FROZEN");
  assert.equal(ev.ruling.sha256, F05_RULING_SHA);
  assert.equal(ev.contractSha256, F05_CONTRACT_SHA);
  // firing: a tampered clause, and a corpus whose CURRENT ruling is other bytes
  const tampered = { ...ACCEPTANCES, F05: { ...ACCEPTANCES.F05, expected: `${ACCEPTANCES.F05.expected} (loosened)` } };
  assert.deepEqual(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: tampered }).map((e) => e.code), ["ACCEPTANCE_TAMPERED"]);
  const other = AUTHORITY_CORPUS.map((r) => (r === REAL_F05 ? { ...r, contentHash: H("other bytes") } : r));
  assert.deepEqual(boardErrors(board(), { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: other, now: REAL_DAY } }).map((e) => e.code), ["ACCEPTANCE_NOT_THE_CURRENT_RULING"]);
  // production: the board's own entry point checks it, clean
  const cli = node("bin/fboard-status.mjs", "--check");
  assert.equal(cli.status, 0, cli.stdout);
  const split = progress(board()).split;
  const line = `F-board: 96 rows · ${Object.entries(split).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(" · ")} · sum 96`;
  assert.ok(cli.stdout.includes(line), `${line}\n${cli.stdout}`);
  /* Board Amendment 1 (3 Oct 2026, RR-145 §2): the line reads the REQUIRED figure first and the all-rows figure beside it — F25 is NOT REQUIRED, not passed */
  assert.ok(cli.stdout.includes(`F-progress: ${EARNED}/95 (required rows) · all rows ${EARNED}/96`), cli.stdout);
});

test("P25 — a bare state string without board identity is REFUSED", () => {
  for (const s of ["VERIFIED-PASS", "FAILED", "UNASSESSED"]) assert.throws(() => fBoardState(s), (e) => e.code === "BARE_STATE_REFUSED", s);
  assert.throws(() => fBoardState({ state: "VERIFIED-PASS" }), (e) => e.code === "BARE_STATE_REFUSED");
  assert.throws(() => fBoardState({ board: "HISTORICAL_38", state: "VERIFIED-PASS" }), (e) => e.code === "HISTORICAL_STATE_REFUSED");
  assert.throws(() => progress([...board().slice(0, 88), "VERIFIED-PASS"]), (e) => e.code === "BARE_STATE_REFUSED");
  assert.equal(fBoardState({ board: F_BOARD, state: "FAILED" }), "FAILED", "silent control");
});

test("P26 — the resolver treats its OWN defining ruling like any other record: same fields, same refusals, no exemption", () => {
  assert.deepEqual(Object.keys(REAL_F05).filter((k) => FIELDS.includes(k)).sort(), [...FIELDS].sort());
  for (const r of AUTHORITY_CORPUS) assert.deepEqual(Object.keys(r).sort(), Object.keys(REAL_F05).sort(), r.authorityId);
  // the same refusals: strip its issuer and it is INVALID; a newer disagreeing clone supersedes it; a same-day one conflicts
  const noIssuer = AUTHORITY_CORPUS.map((r) => (r === REAL_F05 ? { ...r, issuer: {} } : r));
  assert.equal(resolve({ records: noIssuer, propositionId: F05_PROP, scope: F05_SCOPE, now: NOW }).candidates[0].disposition, "INVALID");
  assert.equal(disp(resolve({ records: [...AUTHORITY_CORPUS, clone({ issuedAt: "2026-09-23", effectiveFrom: "2026-09-23", contentHash: H("n") })], propositionId: F05_PROP, scope: F05_SCOPE, now: "2026-09-23" }), REAL_F05.authorityId), "SUPERSEDED");
  // no special case anywhere in the resolver or the corpus census
  const code = (p) => readFileSync(join(REPO, p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const p of ["src/authority/register.mjs", "src/authority/corpus.mjs"]) assert.doesNotMatch(code(p), /F05|035ae68d|ACCEPTANCE\b/, `the code of ${p} special-cases its defining ruling`);
  assert.match(code("src/fboard/board.mjs"), /resolve\(\{ records: authority\.records/, "the board resolves acceptances through the register");
  // and it is resolved CURRENT exactly as the census resolves every other record
  assert.equal(census(AUTHORITY_CORPUS, NOW).dispositions.find((d) => d.authorityId === REAL_F05.authorityId).disposition, "CURRENT");
});

test("P-R26 — historical Row 4 status does not transfer to any F-row", () => {
  const row4 = classify()[4];
  assert.equal(row4.board, HISTORICAL_BOARD);
  const prov = CROSSWALK.provenance.find((p) => p.row === 4);
  assert.deepEqual({ ...prov }, { board: HISTORICAL_BOARD, row: 4, state: row4.state, role: "PROVENANCE_REFERENCE", authorityImported: false });
  assert.ok(CROSSWALK.entries.every((e) => !e.historicalRows.includes(4)), "a crosswalk entry maps Row 4");
  /* A PASS on an F-row is lawful only as THAT ROW'S OWN: its frozen acceptance, and a verification recorded under
   * its own id over the real population. This used to name F05 as the only row allowed to carry one, which stopped
   * being true when F08 passed. Naming the row was never the guard — OWNERSHIP was, and ownership is what is
   * checked here, for every row that passes. */
  const passes = board().filter((x) => x.state === "VERIFIED-PASS").map((x) => x.featureId);
  const ownItsPass = (id) => Boolean(ACCEPTANCES[id]) && (DECLARED[id]?.events ?? []).some((e) => e.kind === "VERIFIED" && e.featureId === id && e.population === "REAL");
  assert.ok(board().every((x) => x.board === F_BOARD && !Object.hasOwn(x, "historicalState")) && passes.every(ownItsPass), `an F-row carries a status it did not earn under its own id: ${passes.filter((id) => !ownItsPass(id)).join(", ") || passes.join(", ")}`);
  assert.equal(progress(board()).passed, EARNED);
  // firing: an F-row given Row 4's state, as a historical record, is refused
  const moved = board().map((x) => (x.featureId === "F04" ? { ...x, board: row4.board, state: row4.state } : x));
  assert.deepEqual(boardErrors(moved, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).map((e) => `${e.code} ${e.id}`), ["HISTORICAL_STATE_REFUSED F04"]);
});
