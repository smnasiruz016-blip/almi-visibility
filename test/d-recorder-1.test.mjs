/**
 * 🔴 D-RECORDER-1 — THE RECORDER BINDS EVERY MOVEMENT TO WHAT WAS TRUE FOR THAT MOVEMENT (F08 reopened on
 * CONCRETE_CONTRADICTORY_EVIDENCE, _handoffs 99f0732; census of the three behaviours in the same record).
 *
 * Proofs run the PRODUCTION derivation (src/audit-trail/population.mjs familyBCandidates) and the PRODUCTION recorder
 * (src/audit-trail/recorder.mjs recordCandidates) into a real audit store (createAuditStore through productionAuditStore) placed
 * in an OS scratch directory. Rows are constructed; their authorities are REAL corpus propositions, resolved by F05 at the
 * event's day, as in production. The real trail is proved untouched, byte for byte.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { familyBCandidates } from "../src/audit-trail/population.mjs";
import { recordCandidates } from "../src/audit-trail/recorder.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import * as ACCEPTANCE_MODULE from "../config/fboard/acceptances.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();
const VERSIONS = [...new Set([...Object.values(ACCEPTANCE_MODULE.ACCEPTANCES), ...Object.values(ACCEPTANCE_MODULE)].filter((v) => v && typeof v === "object" && v.ruling?.sha256 && v.authority?.propositionId && v.contractSha256))];

/* Three constructed acceptance versions of one row, each naming a REAL, CURRENT corpus proposition. */
const ver = (n, propositionId) => ({ ruling: { sha256: sha(`synthetic-ruling-${n}`) }, authority: { propositionId, scope: ["ALMIVISIBILITY", "F07"] }, contractSha256: sha(`synthetic-contract-${n}`) });
const V1 = ver(1, "F07_FROZEN_ACCEPTANCE"), V2 = ver(2, "F07_ACCEPTANCE_AMENDMENT_1"), V3 = ver(3, "F07_ACCEPTANCE_AMENDMENT_2");
const SYN_VERSIONS = [V1, V2, V3];
const DAY = "2026-09-26";
const frozen = (v) => ({ kind: "ACCEPTANCE_FROZEN", on: DAY, ruling: v.ruling, contractSha256: v.contractSha256 });
const amended = (v) => ({ kind: "ACCEPTANCE_AMENDED", featureId: "F07", on: DAY, ruling: v.ruling, contractSha256: v.contractSha256 });
const move = (kind, from, to, reason) => ({ kind, featureId: "F07", on: DAY, from, to, reason });
/* ONE row, ONE day: frozen, verified; amended, reopened, re-verified; amended AGAIN, reopened AGAIN. */
const history = [
  frozen(V1), move("IMPLEMENTATION", "UNASSESSED", "IN-PROGRESS", "R1"), move("VERIFIED", "IN-PROGRESS", "VERIFIED-PASS", "R2"),
  amended(V2), move("REOPENED", "VERIFIED-PASS", "IN-PROGRESS", "AUTHORITATIVE_REQUIREMENT_CHANGE"), move("VERIFIED", "IN-PROGRESS", "VERIFIED-PASS", "R3"),
  amended(V3), move("REOPENED", "VERIFIED-PASS", "IN-PROGRESS", "AUTHORITATIVE_REQUIREMENT_CHANGE"),
];
const rowWith = (events, state) => ({ F07: { featureId: "F07", board: "F_BOARD", state, events } });

function scratch() {
  const dir = fs.mkdtempSync(join(os.tmpdir(), "d-recorder-1-"));
  const store = productionAuditStore({ repo: REPO, at: { eventsPath: join(dir, "events.jsonl"), headPath: join(dir, "head.json") }, forbiddenSubstrings: [] });
  return { store, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
const run = (store, declared, versions = SYN_VERSIONS) => recordCandidates({ store, corpus: AUTHORITY_CORPUS,
  candidates: familyBCandidates({ declared, versions, recorded: store.readAll().events, softwareVersion: "engine:test", correlationId: "run:d-recorder-1", migratedAt: "2026-09-26T12:00:00Z", blockerAuthority: {} }) });
const moves = (store) => store.readAll().events.filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F07");

test("D-RECORDER-1 · two same-day amendments on one row: every movement recorded ONCE, each under the acceptance that governed it, with the state after IT", () => {
  const s = scratch();
  try {
    const r = run(s.store, rowWith(history, "IN-PROGRESS"));
    assert.deepEqual([r.counts.migrated, r.counts.invalid, r.counts.notMigratable, r.remainder], [8, 0, 0, 0], `a same-day movement was refused or lost: ${JSON.stringify(r.invalid.concat(r.notMigratable))}`);
    const m = moves(s.store);
    assert.deepEqual(m.map((e) => `${e.action}:${e.authorityRef.propositionId}:${e.metadata.stateAfter}`), [
      "ACCEPTANCE_FROZEN:F07_FROZEN_ACCEPTANCE:UNASSESSED", "IMPLEMENTATION:F07_FROZEN_ACCEPTANCE:IN-PROGRESS", "VERIFIED:F07_FROZEN_ACCEPTANCE:VERIFIED-PASS",
      "ACCEPTANCE_AMENDED:F07_ACCEPTANCE_AMENDMENT_1:VERIFIED-PASS", "REOPENED:F07_ACCEPTANCE_AMENDMENT_1:IN-PROGRESS", "VERIFIED:F07_ACCEPTANCE_AMENDMENT_1:VERIFIED-PASS",
      "ACCEPTANCE_AMENDED:F07_ACCEPTANCE_AMENDMENT_2:VERIFIED-PASS", "REOPENED:F07_ACCEPTANCE_AMENDMENT_2:IN-PROGRESS",
    ], "a movement was attributed to a later acceptance, or carries a state that was not true after it");
    assert.equal(m.at(-1).action, "REOPENED", "the last movement on the trail is not the reopen the board reads");
  } finally { s.cleanup(); }
});

test("D-RECORDER-1 · two same-kind movements on one day under ONE acceptance (reopened twice): both recorded, neither hides behind the other — and a re-run re-emits neither", () => {
  const s = scratch();
  try {
    const twice = [frozen(V1), move("VERIFIED", "IN-PROGRESS", "VERIFIED-PASS", "R2"), move("REOPENED", "VERIFIED-PASS", "IN-PROGRESS", "CONCRETE_CONTRADICTORY_EVIDENCE"),
      move("VERIFIED", "IN-PROGRESS", "VERIFIED-PASS", "R3"), move("REOPENED", "VERIFIED-PASS", "IN-PROGRESS", "CONCRETE_CONTRADICTORY_EVIDENCE")];
    const r = run(s.store, rowWith(twice, "IN-PROGRESS"));
    assert.deepEqual([r.counts.migrated, r.counts.invalid, r.counts.alreadyAudited], [5, 0, 0], `a second same-day movement under one acceptance was lost or refused: ${JSON.stringify(r.invalid)}`);
    assert.equal(moves(s.store).filter((e) => e.action === "REOPENED").length, 2, "the second reopen hid behind the first");
    const again = run(s.store, rowWith(twice, "IN-PROGRESS"));
    assert.deepEqual([again.counts.migrated, again.counts.alreadyAudited], [0, 5], "a re-run re-emitted a movement");
  } finally { s.cleanup(); }
});

test("D-RECORDER-1 · LEGACY events (written before the write-time key) are recognised and each consumed ONCE — a later identical movement is still recorded", () => {
  const s = scratch();
  try {
    const twice = [frozen(V1), move("VERIFIED", "IN-PROGRESS", "VERIFIED-PASS", "R2"), move("REOPENED", "VERIFIED-PASS", "IN-PROGRESS", "CONCRETE_CONTRADICTORY_EVIDENCE"),
      move("VERIFIED", "IN-PROGRESS", "VERIFIED-PASS", "R3"), move("REOPENED", "VERIFIED-PASS", "IN-PROGRESS", "CONCRETE_CONTRADICTORY_EVIDENCE")];
    /* The first three written the OLD way: no write-time key in their stored metadata. */
    const legacy = familyBCandidates({ declared: rowWith(twice.slice(0, 3), "IN-PROGRESS"), versions: SYN_VERSIONS, recorded: [], softwareVersion: "engine:test", correlationId: "run:legacy", migratedAt: "2026-09-26T12:00:00Z", blockerAuthority: {} })
      .map((c) => { const { identitySubject, ...md } = c.draft.metadata; void identitySubject; return { ...c, draft: { ...c.draft, metadata: md } }; });
    recordCandidates({ store: s.store, candidates: legacy, corpus: AUTHORITY_CORPUS });
    const r = run(s.store, rowWith(twice, "IN-PROGRESS"));
    assert.deepEqual([r.counts.alreadyAudited, r.counts.migrated, r.counts.invalid], [3, 2, 0], "a legacy event was matched twice, or a later identical movement hid behind it");
  } finally { s.cleanup(); }
});

test("D-RECORDER-1 · idempotent re-derivation: a second run on the same history, and a run after the row moves on, re-emit NOTHING", () => {
  const s = scratch();
  try {
    run(s.store, rowWith(history.slice(0, 6), "VERIFIED-PASS"));
    const n = s.store.readAll().events.length;
    const again = run(s.store, rowWith(history.slice(0, 6), "VERIFIED-PASS"));
    assert.deepEqual([again.counts.migrated, again.counts.alreadyAudited, again.counts.invalid], [0, 6, 0], "a re-run re-emitted or refused an earlier movement");
    /* The row moves on: a later amendment and a reopen, same day. The six earlier movements must stay exactly as they are. */
    const later = run(s.store, rowWith(history, "IN-PROGRESS"));
    assert.deepEqual([later.counts.migrated, later.counts.alreadyAudited, later.counts.invalid], [2, 6, 0], "a later amendment re-identified or re-emitted an earlier movement");
    assert.equal(s.store.readAll().events.length, n + 2);
  } finally { s.cleanup(); }
});

test("D-RECORDER-1 · an old VERIFIED followed by a new REOPENED: the old VERIFIED is never re-emitted after the reopen, and the trail's last movement matches the board", () => {
  const s = scratch();
  try {
    run(s.store, rowWith(history.slice(0, 6), "VERIFIED-PASS"));
    run(s.store, rowWith(history, "IN-PROGRESS"));
    const m = moves(s.store);
    const lastVerified = m.map((e) => e.action).lastIndexOf("VERIFIED"), lastReopen = m.map((e) => e.action).lastIndexOf("REOPENED");
    assert.ok(lastVerified < lastReopen, "an earlier VERIFIED was re-emitted after the new REOPENED");
    assert.equal(m.filter((e) => e.action === "VERIFIED").length, 2, "a VERIFIED was duplicated or lost");
  } finally { s.cleanup(); }
});

test("D-RECORDER-1 · collision refusal still holds: the same identity with different content is refused, never merged — CONTROL: the identical draft is an idempotent retry", () => {
  const s = scratch();
  try {
    run(s.store, rowWith(history.slice(0, 3), "VERIFIED-PASS"));
    const e = moves(s.store)[2];
    const draft = { ...e, eventId: undefined, recordedAt: undefined, previousEventHash: undefined, eventHash: undefined, auditVersion: undefined };
    for (const k of Object.keys(draft)) if (draft[k] === undefined) delete draft[k];
    assert.throws(() => s.store.append({ ...draft, metadata: { ...draft.metadata, stateAfter: "FAILED" } }), /EVENT_ID_CONFLICT/, "a conflicting duplicate was accepted");
    assert.equal(s.store.append(draft).status, "IDEMPOTENT_RETRY", "CONTROL: the identical draft was not an idempotent retry");
  } finally { s.cleanup(); }
});

test("D-RECORDER-1 · REAL · the production derivation over the real board and the real trail re-emits nothing: every declared movement is already audited; the real trail is untouched", () => {
  const dir = fs.mkdtempSync(join(os.tmpdir(), "d-recorder-1-real-"));
  try {
    fs.copyFileSync(PROD[0], join(dir, "events.jsonl"));
    fs.copyFileSync(PROD[1], join(dir, "head.json"));
    const store = productionAuditStore({ repo: REPO, at: { eventsPath: join(dir, "events.jsonl"), headPath: join(dir, "head.json") }, forbiddenSubstrings: [] });
    const before = store.readAll().events.length;
    const r = recordCandidates({ store, corpus: AUTHORITY_CORPUS, candidates: familyBCandidates({ declared: DECLARED, versions: VERSIONS, recorded: store.readAll().events, softwareVersion: "engine:test", correlationId: "run:d-recorder-1-real", migratedAt: "2026-09-26T12:00:00Z", blockerAuthority: { F40: { propositionId: "CC_COMMAND_F05_CURRENT_AUTHORITY_REGISTER_CHAIN", scope: ["ALMIVISIBILITY", "F05"] } } }) });
    assert.ok(r.total > 0, "the real declared population is empty — nothing was measured");
    assert.deepEqual([r.counts.invalid, r.counts.notMigratable, r.remainder], [0, 0, 0], `a real movement was refused or unresolvable: ${JSON.stringify(r.invalid.concat(r.notMigratable)).slice(0, 300)}`);
    assert.equal(r.counts.migrated, 0, "an earlier real movement was re-emitted");
    assert.equal(store.readAll().events.length - before, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.deepEqual(prodHashes(), PROD_BEFORE, "the real trail changed");
});

test("D-RECORDER-1 · the derivation refuses to run without every acceptance version and the recorded trail — a default would restore the defect", () => {
  assert.throws(() => familyBCandidates({ declared: rowWith(history, "IN-PROGRESS"), recorded: [] }), /needs every acceptance version/);
  assert.throws(() => familyBCandidates({ declared: rowWith(history, "IN-PROGRESS"), versions: SYN_VERSIONS }), /needs every acceptance version/);
  const unknown = familyBCandidates({ declared: rowWith([amended(ver(9, "F07_ACCEPTANCE_AMENDMENT_2"))], "IN-PROGRESS"), versions: SYN_VERSIONS, recorded: [], softwareVersion: "t", correlationId: "c", migratedAt: "2026-09-26T00:00:00Z", blockerAuthority: {} });
  assert.match(unknown[0].notMigratable, /GOVERNING_ACCEPTANCE_UNRESOLVED/, "an unpinned ruling was attributed to some acceptance");
});

test("D-RECORDER-1 · the production audit trail is byte-identical after every proof in this file", () => {
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
