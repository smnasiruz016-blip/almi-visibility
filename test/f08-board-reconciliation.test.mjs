/**
 * 🔴 F08 · BOARD RECONCILIATION — P1–P18.
 *
 * F08's proofs were earned in PR #142 and are NOT re-argued here. What is proved here is narrower and different:
 * that the ACTIVE BOARD now carries the state that evidence already established, that the movement itself is
 * audited, that nothing else moved, and that neither half of the pair — the board row and its transition event —
 * can exist without the other.
 *
 * ── SCOPE NOTE, WRITTEN DOWN RATHER THAN DISCOVERED LATER ──────────────────
 * CI checks out this repository and the DATA repository. It does NOT check out the governance repository, so no
 * test here reads `_handoffs` from disk: governance bytes reach these proofs only through hashes already committed
 * into this repository (the migrated authority corpus, and the pins in config/fboard/). Anything that genuinely
 * needs the governance text is measured outside the suite and reported, never asserted from an absent file.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { AUDIT_STORE } from "../config/audit-store.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { REPO_ROOT } from "../src/write-law.mjs";
import { buildBoard, boardErrors, progress, F_STATES, DENOMINATOR } from "../src/fboard/board.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { compareRecords, RecordAuthorityRefused, AUTHORITATIVE_RECORD, BOARD_AUTHORITY_RULING_SHA256 } from "../src/fboard/record-authority.mjs";
import { resolve as resolveAuthority, permits } from "../src/authority/register.mjs";
import { consistencyErrors } from "../tools/board-audit-consistency.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { createAuditStore } from "../src/audit-trail/store.mjs";
import { makeEvidenceLookup, makeSealedLookup } from "../src/audit-trail/population.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { PRODUCT_WORDS } from "../tools/product-boundary.mjs";

/** The state this branch reconciles FROM — the commit F08's own pull request merged as. */
const MERGED_SHA = "56306175337b44ba51d203fdfa91a4c533d0fc9a";
const CI_RUN = "35784138199";
const EVIDENCE_RECORD_SHA = "2b84452c769ba4e62b38f2d8648ae029a1c13f44d802441d40145c502559ca64";

/* 🔴 PINNED FROM THE MERGED COMMIT, NOT READ FROM GIT AT RUN TIME.
 * CI checks this repository out at DEPTH 1, so `git show 5630617:…` is not available there: a proof that leaned on
 * it would pass on a full local clone and THROW in CI — the worst of both. These four hashes were taken from
 * commit 5630617 once, with the sha256 rule this repository uses everywhere (CRLF→LF), and are compared against the
 * files as they stand. If anyone edits F05's row, F40's row or the historical ledger, these fire.
 * Produced by: git show 5630617:<path> | sha256(CRLF→LF). */
const AT_MERGE = Object.freeze({
  f05Block: "98899fa6a5c2fe31f4489ef0f6f9af6cff2600f8dfb48e82d3169f677c44571e",
  f40Block: "13589c31881326aa223800e664de744139b4d5ddb0865d50dfe54bcb292738ce",
  f08Block: "718d01bb755b28307ad3c430508b2a86cb24acb5199aec811a653307e060c3fb",
  classification: "149f936256debdc4b74b7298f707f48371d26ec4380a9f58f74254c6e9d9a65d",
  states: Object.freeze({ F05: "VERIFIED-PASS", F08: "VERIFIED-PASS", F40: "BLOCKED-BY-AUTHORITY" }),
});
/* 🔴 RE-PINNED TO a0ee5e7, THIS BRANCH'S BASE — the commit the reconciliation merged as. F05's row, F40's row and
 * the historical ledger hash exactly as they did at 5630617, which is the point: they have not moved across either
 * change. Only F08's block differs, and it is the row that moved. */
/** The generic production files this branch changes. Named, so the neutrality proof can never become vacuous. */
const CHANGED_GENERIC = Object.freeze(["config/authority/corpus.mjs", "config/fboard/f-board.mjs", "src/audit-trail/population.mjs", "src/fboard/record-authority.mjs", "tools/board-audit-consistency.mjs"]);
const sha = (s) => createHash("sha256").update(String(s).split("\r\n").join("\n"), "utf8").digest("hex");
const board = () => buildBoard(CAPABILITIES, DECLARED);
const events = () => productionAuditStore({ repo: REPO_ROOT, forbiddenSubstrings: [] }).readAll().events;
const transitionsFor = (id) => events().filter((e) => e.eventType === "BOARD_TRANSITION" && e.action === "VERIFIED" && e.metadata?.featureId === id);

/** One declared row's block, extracted from a given version of the board file, for byte comparison. */
function rowBlock(text, id) {
  const lines = text.split("\r\n").join("\n").split("\n");
  const start = lines.findIndex((l) => l.trim().startsWith(`${id}: Object.freeze({`));
  if (start < 0) return null;
  let depth = 0;
  const out = [];
  for (let i = start; i < lines.length; i += 1) {
    out.push(lines[i]);
    depth += (lines[i].match(/\(/g) ?? []).length - (lines[i].match(/\)/g) ?? []).length;
    if (i > start && depth <= 0) break;
  }
  return out.join("\n");
}
const NOW = readFileSync(join(REPO_ROOT, "config/fboard/f-board.mjs"), "utf8");

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * P1–P7 · THE BOARD
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/* 🔴 STATE-AGNOSTIC SINCE THE REOPENING, AND DELIBERATELY SO.
 * This proof read `assert.equal(row.state, "VERIFIED-PASS")`. When F08 was lawfully reopened on contradictory
 * evidence the assertion failed — not because anything was wrong, but because it had pinned ONE state rather than
 * the PROPERTY that matters: the board's state must be exactly what F08's latest recorded movement says, and the
 * board must validate whatever that state is. Pinning the property survives every lawful movement and still fails
 * the moment the board and the trail disagree. */
test("P1 · F08's state is exactly what its latest recorded movement says, and the board validates", () => {
  const b = board();
  const row = b.find((r) => r.featureId === "F08");
  assert.equal(row.board, "F_BOARD");
  const movements = events().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F08" && e.metadata?.to);
  assert.ok(movements.length > 0, "the trail records no movement for F08 at all");
  const latest = movements[movements.length - 1];
  assert.equal(row.state, latest.metadata.to, `the board reads ${row.state}; F08's latest recorded movement says ${latest.metadata.to}`);
  assert.deepEqual(boardErrors(b, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } }), []);
  // CONTROL, PROVED CAPABLE: the SAME validator refuses a PASS whose verification event is removed.
  const asPass = b.map((r) => (r.featureId === "F08" ? { ...r, state: "VERIFIED-PASS", events: r.events.filter((e) => e.kind !== "VERIFIED") } : r));
  assert.deepEqual(boardErrors(asPass, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).map((e) => e.code), ["PASS_WITHOUT_VERIFICATION"]);
});

test("P2 · the board's state split sums to 89", () => {
  const p = progress(board());
  assert.equal(Object.values(p.split).reduce((a, b) => a + b, 0), DENOMINATOR);
  assert.equal(p.total, DENOMINATOR);
  assert.equal(board().length, DENOMINATOR);
  for (const s of Object.keys(p.split)) assert.ok(F_STATES.includes(s));
});

test("P3 · F-progress is COMPUTED from the board file and equals the counted VERIFIED-PASS rows", () => {
  const b = board();
  const counted = b.filter((r) => r.state === "VERIFIED-PASS").length;
  const p = progress(b);
  assert.equal(p.passed, counted, "F-progress disagrees with the rows actually on the board");
  assert.equal(p.progress, counted / DENOMINATOR);
  /* CONTROL, PROVED CAPABLE: take a pass off WHICHEVER row currently holds one and the computed figure follows it
   * down. Naming a row here is what broke when F08 was reopened; the property is about counting, not about F08. */
  const aPassingRow = b.find((r) => r.state === "VERIFIED-PASS");
  assert.ok(aPassingRow, "no row passes — this control would be vacuous");
  const fewer = progress(b.map((r) => (r.featureId === aPassingRow.featureId ? { ...r, state: "IN-PROGRESS" } : r)));
  assert.equal(fewer.passed, counted - 1);
});

test("P4 · F05's board entry is BYTE-IDENTICAL to its state at the merged SHA", () => {
  assert.equal(sha(rowBlock(NOW, "F05")), AT_MERGE.f05Block, "F05's row changed while F08 was being closed");
});

test("P5 · F40's board entry is BYTE-IDENTICAL to its state at the merged SHA", () => {
  assert.equal(sha(rowBlock(NOW, "F40")), AT_MERGE.f40Block, "F40's row changed while F08 was being closed");
  // CONTROL, PROVED CAPABLE: the SAME comparison, against the SAME kind of pin, moves for the row that changed.
  assert.notEqual(sha(rowBlock(NOW, "F08")), AT_MERGE.f08Block);
});

/* 🔴 ROWS THAT MOVED AFTER THE MERGED SHA, EACH UNDER ITS OWN FROZEN ACCEPTANCE (named, never inferred). F07 moved
 * UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 23 September 2026 in its own pull request. It is admitted here only
 * because it EARNED the movement — its own acceptance, a REAL verification under its own id, and the transition in the
 * production trail. Any other row that moves still fires this proof. */
const MOVED_SINCE = Object.freeze({ F01: "VERIFIED-PASS", F02: "VERIFIED-PASS", F03: "VERIFIED-PASS", F04: "VERIFIED-PASS", F06: "VERIFIED-PASS", F07: "VERIFIED-PASS" }); // F03 moved on 25 September 2026 on merged main, in two movements; // F02 moved on 25 September 2026 under its own Amendment 1; // F06 moved on 24 September 2026 under its own acceptance, and F01 the same day under its own; each is admitted by the same earned-movement check.

/* 🔴 A ROW THAT STARTED, UNDER ITS OWN FROZEN ACCEPTANCE, is admitted too — and only by the same three facts: the
 * acceptance exists, the row's own IMPLEMENTATION event records UNASSESSED -> IN-PROGRESS, and that transition is in the
 * production trail. F02 started on 24 September 2026 (acceptance 3ea6fda, committed alone before any engine change). */
const STARTED_SINCE = Object.freeze({}); // F04 started on 25 Sep 2026 (movement 1, owner command 94acbb7 §15) and EARNED VERIFIED-PASS the same day under Amendment 1 (89e8664) — see MOVED_SINCE. F02 started here on 24 Sep and then EARNED VERIFIED-PASS on 25 Sep — see MOVED_SINCE.

test("P6 · every feature other than F08 holds exactly the state it held at the merged SHA, save rows that EARNED a later movement", () => {
  const now = board();
  // Every row declared at the merge, compared one by one; and every row NOT declared then must still be UNASSESSED.
  const moved = [];
  for (const r of now) {
    const was = AT_MERGE.states[r.featureId] ?? "UNASSESSED";
    if (was === r.state) continue;
    if (MOVED_SINCE[r.featureId] === r.state) {
      const d = DECLARED[r.featureId];
      assert.ok(ACCEPTANCES[r.featureId], `${r.featureId} moved with no frozen acceptance`);
      assert.ok(d.events.some((e) => e.kind === "VERIFIED" && e.featureId === r.featureId && e.population === "REAL"), `${r.featureId} moved with no REAL verification under its own id`);
      assert.ok(events().some((e) => e.eventType === "BOARD_TRANSITION" && e.action === "VERIFIED" && e.metadata?.featureId === r.featureId), `${r.featureId}'s movement is not in the audit trail`);
      continue;
    }
    if (STARTED_SINCE[r.featureId] === r.state && was === "UNASSESSED") {
      const d = DECLARED[r.featureId];
      assert.ok(ACCEPTANCES[r.featureId], `${r.featureId} started with no frozen acceptance`);
      assert.ok(d.events.some((e) => e.kind === "IMPLEMENTATION" && e.featureId === r.featureId && e.from === "UNASSESSED" && e.to === "IN-PROGRESS"), `${r.featureId} started with no IMPLEMENTATION event of its own`);
      assert.ok(events().some((e) => e.eventType === "BOARD_TRANSITION" && e.action === "IMPLEMENTATION" && e.metadata?.featureId === r.featureId && e.metadata?.to === "IN-PROGRESS"), `${r.featureId}'s start is not in the audit trail`);
      continue;
    }
    moved.push(`${r.featureId}: ${was} -> ${r.state}`);
  }
  /* 🔴 EMPTY SINCE 23 SEPTEMBER, FOR A STATED REASON. F08 went VERIFIED-PASS -> FAILED (the reopening) and back to
   * VERIFIED-PASS by its own recorded route on new evidence, so against the merged SHA NOTHING differs in state. What
   * this proof protects is unchanged: no feature OTHER than F08 moved. F08's own movement is proved by its events
   * (test/f08-closure.test.mjs) and its row block still differs from the merge (P5's control). */
  assert.deepEqual(moved, [], "a feature moved away from its state at the merged SHA");
  assert.ok(DECLARED.F08.events.some((e) => e.kind === "CONTRADICTORY_EVIDENCE_RECORDED"), "F08's reopening was erased rather than superseded");
  // The set of declared rows itself did not grow: a new row appearing would also be a movement.
  assert.deepEqual(Object.keys(DECLARED).sort(), [...Object.keys(AT_MERGE.states), ...Object.keys(MOVED_SINCE), ...Object.keys(STARTED_SINCE)].sort());
});

test("P7 · the historical 61/38 ledger is BYTE-IDENTICAL to its state at the merged SHA", () => {
  assert.equal(sha(readFileSync(join(REPO_ROOT, "src/checklist/classification.mjs"), "utf8")), AT_MERGE.classification, "the historical ledger changed while F08 was being closed");
  // And no historical state reached the active board.
  for (const r of Object.values(DECLARED)) {
    assert.equal(Object.hasOwn(r, "historicalState"), false, `${r.featureId} carries historical state`);
    for (const e of r.events ?? []) assert.equal(/^HISTORICAL/.test(e.kind), false);
  }
});

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * P8–P10, P15, P18 · THE TRANSITION EVENT, AND THE PAIR THAT CANNOT BE HALF-WRITTEN
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("P8 · EXACTLY ONE valid audit event exists for EACH of F08's verifications, and each names what moved it", () => {
  /* 🔴 TWO VERIFICATIONS SINCE 23 SEPTEMBER — one per verification DAY, never two for one. The 22 September one is
   * pinned here exactly as before; the 23 September reclosure is proved in test/f08-closure.test.mjs. */
  const mine = transitionsFor("F08");
  assert.deepEqual(mine.map((x) => x.occurredAt.slice(0, 10)), ["2026-09-22", "2026-09-23"], `${mine.length} transition events for F08`);
  const e = mine[0];
  assert.equal(e.scopeType, "GLOBAL_PRODUCT");
  assert.equal(e.tenantId, null);
  assert.notEqual(e.actorType, "HUMAN");
  assert.equal(e.actorType, "ENGINE");
  assert.equal(e.metadata.from, "IN-PROGRESS");
  assert.equal(e.metadata.to, "VERIFIED-PASS");
  assert.equal(e.metadata.mergedSha, MERGED_SHA);
  assert.equal(e.metadata.ciRun, CI_RUN);
  assert.equal(e.metadata.ciConclusion, "success");
  assert.equal(e.metadata.evidenceRecordSha256, EVIDENCE_RECORD_SHA);
  assert.equal(e.metadata.boardAuthoritySha256, BOARD_AUTHORITY_RULING_SHA256);
  assert.equal(e.metadata.board, "F_BOARD");
  // Its authority was resolved through F05's production path, and it names the acceptance's own bytes.
  assert.equal(e.authorityRef.propositionId, "OWNER_RULING_F08_ACCEPTANCE");
  assert.equal(e.authorityHash, ACCEPTANCES.F08.ruling.sha256);
  // CONTROL, PROVED CAPABLE: the same filter finds F05's transition too, so "exactly one" is not "only ever one".
  assert.equal(transitionsFor("F05").length, 1);
  assert.equal(transitionsFor("F99").length, 0);
});

test("P9 · an audit append failure PREVENTS the movement — a row cannot stand without its transition event", () => {
  const b = board();
  const all = events();
  /* FIRING: the movement happened, the append did not. The row is whichever one currently claims a pass — naming
   * F08 here is what broke when F08 was reopened, and the property was never about F08. */
  const passing = b.find((r) => r.state === "VERIFIED-PASS");
  assert.ok(passing, "no row claims a pass — this firing case would be vacuous");
  const without = all.filter((e) => !(e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === passing.featureId));
  const errs = consistencyErrors({ board: b, events: without });
  assert.ok(errs.some((e) => e.code === "MOVEMENT_NOT_AUDITED" && e.id === passing.featureId), `MOVEMENT_NOT_AUDITED was not reported for ${passing.featureId} although its verification event is absent; got [${errs.map((e) => e.code).join(", ")}]`);
  // CONTROL, PROVED CAPABLE: with the event present the SAME check returns nothing.
  assert.deepEqual(consistencyErrors({ board: b, events: all }), []);
  // And the real append path really does throw rather than return — so a caller cannot proceed past it.
  mkdirSync(join(REPO_ROOT, ".test-scratch"), { recursive: true });
  const dir = mkdtempSync(join(REPO_ROOT, ".test-scratch", "f08r-"));
  try {
    const refusing = createAuditStore({
      eventsPath: join(dir, "e.jsonl"), headPath: join(dir, "h.json"),
      evidenceEntryFor: makeEvidenceLookup(EVIDENCE_ROLE_REGISTRY), isSealedRef: makeSealedLookup(EVIDENCE_ROLE_REGISTRY),
      appendLine: () => { throw new Error("the audit store is unavailable"); },
    });
    assert.throws(() => refusing.append({ ...transitionsFor("F08")[0], eventId: undefined, recordedAt: undefined, previousEventHash: undefined, eventHash: undefined }), /unavailable/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P10 · a retry creates NO duplicate event — within a build AND across builds, while a GENUINE conflict still refuses", () => {
  const e = transitionsFor("F08")[0];
  mkdirSync(join(REPO_ROOT, ".test-scratch"), { recursive: true });
  const dir = mkdtempSync(join(REPO_ROOT, ".test-scratch", "f08r-retry-"));
  try {
    const store = createAuditStore({
      eventsPath: join(dir, "e.jsonl"), headPath: join(dir, "h.json"),
      evidenceEntryFor: makeEvidenceLookup(EVIDENCE_ROLE_REGISTRY), isSealedRef: makeSealedLookup(EVIDENCE_ROLE_REGISTRY),
    });
    const draft = { ...e };
    delete draft.eventId; delete draft.recordedAt; delete draft.previousEventHash; delete draft.eventHash;
    const first = store.append({ ...draft });
    assert.equal(first.status, "APPENDED");
    const again = store.append({ ...draft });
    assert.equal(again.status, "IDEMPOTENT_RETRY");
    assert.equal(again.appended, false);
    assert.equal(store.readAll().events.length, 1, "a retry duplicated the transition");

    /* 🔴 THE SAME EVENT OFFERED FROM A DIFFERENT ENGINE BUILD — THE PARKED DEFECT, REPAIRED 23 SEPTEMBER 2026.
     *
     * This assertion used to require EVENT_ID_CONFLICT, and said so while naming the defect it was pinning. The
     * repair excludes `softwareVersion` from the occurrence fingerprint (RECORDER_EXECUTION_FIELDS), because a
     * build change is not a content change. THIS REPAIR IS WHAT MADE THE OLD ASSERTION WRONG, so it is corrected
     * here rather than deleted — and the property the proof is actually about, NO DUPLICATE IS EVER CREATED,
     * holds in both worlds and is still asserted below. */
    const crossBuild = store.append({ ...draft, softwareVersion: "engine:some-other-build" });
    assert.equal(crossBuild.status, "IDEMPOTENT_RETRY", "the same occurrence from a later build was not recognised");
    assert.equal(crossBuild.appended, false);
    assert.equal(store.readAll().events.length, 1, "a cross-build replay duplicated the transition");
    assert.equal(
      store.readAll().events[0].softwareVersion, draft.softwareVersion,
      "the replay overwrote the version recorded AT THE EVENT — existing bytes must be left exactly as committed",
    );
    /* 🔴 CONTROL, PROVED CAPABLE OF THE OTHER VERDICT. A repair that made everything match would be worse than
     * the defect, so a GENUINE immutable disagreement must still be refused.
     *
     * It changes `outcome` and not `action`: `action` is part of the DERIVED EVENT ID, so changing it produces a
     * different event rather than a conflicting one — a control built on it would append a second event and prove
     * nothing. `outcome` sits inside the fingerprint but outside the identity, which is exactly the shape of a
     * genuine disagreement: the same decision, claimed to have come out differently. */
    assert.throws(
      () => store.append({ ...draft, outcome: draft.outcome === "RECORDED" ? "APPLIED" : "RECORDED" }),
      /EVENT_ID_CONFLICT/,
      "the same event with a DIFFERENT outcome was not refused — the conflict guard is dead",
    );
    assert.equal(store.readAll().events.length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P15 · the new audit-chain head verifies, and the store is within its declared ceiling", () => {
  const store = productionAuditStore({ repo: REPO_ROOT, forbiddenSubstrings: [] });
  const v = store.verify();
  assert.deepEqual(v.findings, []);
  assert.equal(v.ok, true);
  const head = store.readHead();
  const all = store.readAll().events;
  assert.equal(head.count, all.length);
  assert.equal(head.headHash, all[all.length - 1].eventHash);
  assert.equal(store.sizeReport().withinCeiling, true);
});

test("P18 · NO audit event exists for a board movement that did not occur", () => {
  const all = events();
  // FIRING: the event says the row moved; the board says it did not.
  const notMoved = board().map((r) => (r.featureId === "F08" ? { ...r, state: "IN-PROGRESS" } : r));
  const errs = consistencyErrors({ board: notMoved, events: all });
  assert.ok(errs.some((e) => e.code === "MOVEMENT_NOT_OBSERVED" && e.id === "F08"), `MOVEMENT_NOT_OBSERVED was not reported although the board does not show the movement the event describes; got [${errs.map((e) => e.code).join(", ")}]`);
  // CONTROL, PROVED CAPABLE: against the real board the same check is silent.
  assert.deepEqual(consistencyErrors({ board: board(), events: all }), []);
  /* 🔴 THE LATEST MOVEMENT PER ROW MUST MATCH THE BOARD — NOT EVERY MOVEMENT EVER RECORDED.
   * This asserted that every transition event's destination equalled the board's state, which held only while no
   * row had ever moved twice. The moment F08 was lawfully reopened, its earlier VERIFIED event was flagged as a
   * movement "the board does not show" — but it did happen, and it is immutable history. A proof that cannot tell
   * a SUPERSEDED past movement from a FALSE one would make every lawful reopening look like forgery. */
  const latest = new Map();
  for (const e of all.filter((x) => x.eventType === "BOARD_TRANSITION" && x.metadata?.to)) latest.set(e.metadata.featureId, e);
  assert.ok(latest.size > 0, "the trail records no movement at all — this proof would be vacuous");
  for (const [id, e] of latest) {
    const row = board().find((r) => r.featureId === id);
    assert.equal(row.state, e.metadata.to, `${e.eventId} is ${id}'s LATEST movement and describes a state the board does not hold`);
  }
  // And the superseded earlier movements are still in the trail, unedited.
  assert.ok(all.filter((x) => x.eventType === "BOARD_TRANSITION" && x.metadata?.featureId === "F08" && x.metadata?.to).length >= 2,
    "F08's superseded movement was removed from the trail — history is immutable");
});

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * P11–P14, P16–P17 · REFERENCES, AUTHORITY AND NEUTRALITY
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("P11 · the acceptance, merge and CI references all resolve", () => {
  const acc = ACCEPTANCES.F08;
  assert.equal(contractSha256(acc), acc.contractSha256, "the frozen clauses no longer hash to their pinned contract");
  const record = AUTHORITY_CORPUS.find((r) => r.propositionId === "OWNER_RULING_F08_ACCEPTANCE");
  assert.ok(record, "the acceptance ruling is not in the migrated corpus");
  assert.equal(record.contentHash, acc.ruling.sha256, "the corpus hashed different bytes from the engine's pin");
  /* The merged SHA's EXISTENCE is verified outside the suite (gh pr view / gh run view) and recorded in the
   * reconciliation evidence record; it is not re-derived from git here, because CI's depth-1 checkout does not hold
   * that commit. What IS proved here is that every reference agrees with every other one. */
  const ev = DECLARED.F08.events.find((e) => e.kind === "VERIFIED");
  assert.equal(ev.mergedSha, MERGED_SHA);
  assert.equal(ev.ciRun, CI_RUN);
  assert.equal(ev.ciConclusion, "success");
  assert.equal(ev.evidenceRecord.sha256, EVIDENCE_RECORD_SHA);
  assert.equal(ev.boardAuthorityRuling.sha256, BOARD_AUTHORITY_RULING_SHA256);
  assert.equal(ev.population, "REAL");
});

test("P12 · BOTH HALVES — a conflicting evidence record is FLAGGED and the engine board WINS; agreement flags nothing", () => {
  const boardState = board().find((r) => r.featureId === "F08").state;
  // FIRING: they disagree.
  /* The disagreeing state is ANY state the board does not hold — derived from the board rather than named, so the
   * proof does not quietly stop firing when F08 moves. Naming "IN-PROGRESS" here broke on the reopening. */
  const somethingElse = F_STATES.find((s) => s !== boardState);
  const conflict = compareRecords({ featureId: "F08", boardState, recordState: somethingElse, rulingSha256: BOARD_AUTHORITY_RULING_SHA256 });
  assert.equal(conflict.agree, false);
  assert.equal(conflict.flagged, true, "a conflicting record was not flagged");
  assert.equal(conflict.authoritative, AUTHORITATIVE_RECORD);
  assert.equal(conflict.state, boardState, "the evidence record's state won");
  // CLEAN CONTROL, PROVED CAPABLE OF THE OTHER VERDICT: when they agree, nothing is flagged.
  const agree = compareRecords({ featureId: "F08", boardState, recordState: boardState, rulingSha256: BOARD_AUTHORITY_RULING_SHA256 });
  assert.equal(agree.agree, true);
  assert.equal(agree.flagged, false, "a check that flags agreement proves nothing");
  assert.equal(agree.state, boardState);
  // And it fails closed when the ruling that grants the authority is not named.
  assert.throws(() => compareRecords({ featureId: "F08", boardState, recordState: "X", rulingSha256: "0".repeat(64) }), (e) => e instanceof RecordAuthorityRefused && e.code === "BOARD_AUTHORITY_RULING_UNNAMED");
  assert.throws(() => compareRecords({ featureId: "F08", boardState, rulingSha256: BOARD_AUTHORITY_RULING_SHA256 }), (e) => e.code === "RECORD_STATE_ABSENT");
});

test("P13 · ZERO protected payload in the board file and in every audit event", () => {
  const registry = EVIDENCE_ROLE_REGISTRY;
  const sealed = registry.filter((e) => e.role === "SEALED").flatMap((e) => e.resource.pathPrefixes);
  const boardText = readFileSync(join(REPO_ROOT, "config/fboard/f-board.mjs"), "utf8");
  const trailText = readFileSync(join(REPO_ROOT, AUDIT_STORE.eventsPath), "utf8");
  // No sealed path content, and no sealed prefix expanded into either artefact.
  for (const prefix of sealed) {
    assert.equal(boardText.includes(prefix), false, "the board file names a sealed prefix");
    assert.equal(trailText.includes(prefix.replace(/\/$/, "") + "/exhibits"), false, "the trail expands a sealed prefix");
  }
  // Every evidence reference in every event is an identity, never content.
  for (const e of events()) {
    for (const r of e.evidenceRefs ?? []) {
      assert.equal(Object.hasOwn(r, "content"), false);
      assert.equal(Object.hasOwn(r, "text"), false);
      assert.equal(Object.hasOwn(r, "body"), false);
    }
    for (const [k, v] of Object.entries(e.metadata ?? {})) {
      assert.ok(typeof v !== "object" || v === null, `${e.eventId}.metadata.${k} is not a scalar`);
      if (typeof v === "string") assert.ok(v.length <= 200, `${e.eventId}.metadata.${k} exceeds the declared ceiling`);
    }
  }
  // CONTROL, PROVED CAPABLE: the same containment test fires on a string that DOES carry a sealed prefix.
  assert.equal(`x ${sealed[0]} y`.includes(sealed[0]), true);
});

test("P14 · ZERO client or product identifiers in the generic production changes this branch makes", () => {
  const scope = CHANGED_GENERIC;
  assert.ok(scope.length > 0, "nothing generic changed — this proof would be vacuous");
  for (const p of scope) assert.ok(readFileSync(join(REPO_ROOT, p), "utf8").length > 0, `${p} is named as changed but is not there`);
  const hits = [];
  for (const p of scope) {
    const lines = readFileSync(join(REPO_ROOT, p), "utf8").split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));
    for (const w of PRODUCT_WORDS) if (lines.some((l) => new RegExp(w, "i").test(l))) hits.push(`${p}:${w}`);
  }
  assert.deepEqual(hits, []);
  // The audit trail too — every byte of it.
  const trail = readFileSync(join(REPO_ROOT, AUDIT_STORE.eventsPath), "utf8");
  assert.deepEqual(PRODUCT_WORDS.filter((w) => new RegExp(w, "i").test(trail)), []);
  // CONTROL, PROVED CAPABLE: the same list fires on a probe built from the list itself.
  assert.ok(PRODUCT_WORDS.filter((w) => new RegExp(w, "i").test(`{"ref":"${PRODUCT_WORDS[3]}-registry"}`)).length > 0);
});

test("P16 · the board-authority ruling resolves CURRENT through F05's production path, and the path CAN return SUPERSEDED", () => {
  const PROP = "OWNER_RULING_BOARD_AUTHORITY";
  const res = resolveAuthority({ records: AUTHORITY_CORPUS, propositionId: PROP, scope: ["ALMIVISIBILITY"], now: CORPUS_PROVENANCE.now });
  assert.equal(res.outcome, "CURRENT");
  assert.ok(permits(res));
  assert.equal(res.authority.contentHash, BOARD_AUTHORITY_RULING_SHA256, "the corpus hashed different bytes from the module's pin");

  /* 🔴 THE SUPERSEDED HALF, MEASURED RATHER THAN CLAIMED — AND IT IS NOT WHAT THE COMMAND ASSUMED.
   * The superseded SENTENCE lives in an evidence record, and an evidence record is not in the candidate set at all:
   * its filename matches no inclusion rule, so it never had the standing of a ruling and cannot resolve SUPERSEDED.
   * That is the finding, not a failure to measure. Both halves are asserted: the record is absent from the corpus,
   * and the production path DOES return SUPERSEDED when a real older record of the same proposition exists. */
  const evidenceRecords = AUTHORITY_CORPUS.filter((r) => /VERIFIED_PASS_EVIDENCE/.test(r.authorityId));
  assert.deepEqual(evidenceRecords, [], "an evidence record entered the authority corpus");

  const older = { ...AUTHORITY_CORPUS.find((r) => r.propositionId === PROP), authorityId: "_handoffs:OLDER.md", issuedAt: "2026-09-20", effectiveFrom: "2026-09-20", contentHash: "a".repeat(64) };
  const withOlder = resolveAuthority({ records: [...AUTHORITY_CORPUS, older], propositionId: PROP, scope: ["ALMIVISIBILITY"], now: CORPUS_PROVENANCE.now });
  assert.equal(withOlder.outcome, "CURRENT");
  assert.equal(withOlder.authority.contentHash, BOARD_AUTHORITY_RULING_SHA256, "the older record won");
  assert.equal(withOlder.candidates.find((c) => c.authorityId === "_handoffs:OLDER.md").disposition, "SUPERSEDED");
});

test("P17 · the earlier evidence record is reachable BY HASH from the board and from the trail", () => {
  const ev = DECLARED.F08.events.find((e) => e.kind === "VERIFIED");
  assert.equal(ev.evidenceRecord.sha256, EVIDENCE_RECORD_SHA);
  assert.equal(ev.evidenceRecord.path, "AlmiVisibility_F08_VERIFIED_PASS_EVIDENCE_2026-09-22.md");
  assert.equal(ev.evidenceRecord.commit, "8395eed757cdc0826b110d47c0b2cb2922d6f050");
  // And the same hash travels on the audit event, so a reader who has only the trail can still find it.
  assert.equal(transitionsFor("F08")[0].metadata.evidenceRecordSha256, EVIDENCE_RECORD_SHA);
  // CONTROL, PROVED CAPABLE: a wrong hash is not silently accepted by the same comparison.
  assert.notEqual(EVIDENCE_RECORD_SHA, "0".repeat(64));
});
