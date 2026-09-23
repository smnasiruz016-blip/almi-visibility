/**
 * 🔴 F08 · THE TARGET-AWARE GOVERNED-WRITE BOUNDARY (23 September 2026).
 *
 * Contract: owner ruling sha256 29ef6d74fc85944f7cf69f33c39fd0946e5eab77e8317fa5893fa086cfff4f0d.
 *
 * Every proof here has a FIRING CASE and, where a clean result could be produced by a check that cannot fail, a
 * CONTROL shown separately to be capable of the other verdict. An outcome measured UNREACHABLE is reported as
 * DECLARED-UNREACHABLE with its measurement and is never reported as proved.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, appendFileSync, symlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

import {
  executeGovernedWrite, recoverGovernedWrite, deriveIdempotencyKey, incompleteSagas,
  GovernedWriteRefused, PROFILES, RETURNED_OUTCOMES, DISCOVERED_STATES, DECLARED_UNREACHABLE,
  TERMINAL_EVENT_FOR, OUTCOME_FOR_PHASE, SAGA, AUDIT_STORE_EXEMPTION,
} from "../src/governance/governed-write.mjs";
import { stagedReplaceAdapter, jsonlAppendAdapter, TEMP_MARKER, contentHash, byteHash } from "../src/governance/durability-adapters.mjs";
import {
  resolveAuditStoreLocation, inVerifiedTestContext, AuditStoreOverrideForbidden,
  AUDIT_STORE_OVERRIDE_ENV, AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT, SYNTHETIC_LABEL, isRealEvidence,
} from "../src/governance/governed-run.mjs";
import { createAuditStore, isoSeconds } from "../src/audit-trail/store.mjs";
import { RECORDER_EXECUTION_FIELDS, contentFingerprint } from "../src/audit-trail/event.mjs";
import { announceWritePermission, writePermission, LOCAL } from "../src/write-law.mjs";
import { AUDIT_STORE } from "../config/audit-store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scratch = () => {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  return mkdtempSync(join(REPO, ".test-scratch", "gw-"));
};
const rel = (p) => p.slice(REPO.length).split("\\").join("/");
const storeAt = (d) => createAuditStore({ eventsPath: join(d, "e.jsonl"), headPath: join(d, "h.json") });
const OCCURRED = isoSeconds(Date.now());
const ctx = (d) => ({
  store: storeAt(d), actor: "engine", actorType: "ENGINE", softwareVersion: "engine:test",
  correlationId: "run:governed-write-test", authorityRef: { propositionId: "P-TEST", scope: ["TEST"] },
  authorityHash: "d".repeat(64),
});
const act = (name, fingerprint) => ({ name, scopeType: "GLOBAL_PRODUCT", occurredAt: OCCURRED, occurrenceFingerprint: fingerprint, evidenceRefs: [] });
const ALLOWED = { mayWrite: true, reason: "TEST" };
const REFUSED = { mayWrite: false, reason: "DRY_RUN" };

const fileAdapter = (dir, name, bytes) =>
  stagedReplaceAdapter({ repo: REPO, repoRelativeTarget: rel(join(dir, name)), targetClass: "REPOSITORY_FILE", bytes });
const logAdapter = (dir, name, record) =>
  jsonlAppendAdapter({ repo: REPO, repoRelativeTarget: rel(join(dir, name)), targetClass: "RUN_EVIDENCE", record, occurrenceKeyOf: (r) => r.id });

/* ══════════════════════════════════════════════════════════════════════════ *
 * THE CONTRACT ITSELF — the two vocabularies stay separate
 * ══════════════════════════════════════════════════════════════════════════ */

test("P49 · every outcome the ruling declares is either a returned outcome or a named discovered state — and the totals reconcile", () => {
  assert.deepEqual([...PROFILES], ["STAGED_REPLACE", "VALIDATED_APPEND"]);
  const returned = PROFILES.flatMap((p) => RETURNED_OUTCOMES[p]);
  const discovered = PROFILES.flatMap((p) => DISCOVERED_STATES[p]);
  assert.equal(returned.length, 9, "the ruling measured 9 reachable-as-returned outcomes");
  assert.equal(discovered.length, 2, "the ruling measured 2 reachable-as-discovered states");
  assert.equal(DECLARED_UNREACHABLE.length, 1);
  assert.equal(returned.length + discovered.length + DECLARED_UNREACHABLE.length, 12, "12 accounted, remainder 0");

  // 🔴 EVERY DISCOVERED STATE NAMES AN OWNER. A state with no owner is a leak, not a state.
  for (const d of discovered) {
    assert.ok(typeof d.owner === "string" && d.owner.length > 3, `${d.state} has no named owner`);
    assert.ok(typeof d.how === "string" && d.how.length > 40, `${d.state}'s owner does not say what it does`);
  }
  // The two vocabularies do not overlap, which is the whole point of keeping them apart.
  for (const p of PROFILES) {
    for (const d of DISCOVERED_STATES[p]) {
      assert.ok(!RETURNED_OUTCOMES[p].includes(d.state), `${p}.${d.state} is in BOTH vocabularies`);
    }
  }
});

test("P23 · COMMIT_STATUS_UNKNOWN is DECLARED-UNREACHABLE with its measurement — and is not implemented", () => {
  const u = DECLARED_UNREACHABLE[0];
  assert.equal(u.profile, "VALIDATED_APPEND");
  assert.equal(u.outcome, "COMMIT_STATUS_UNKNOWN");
  assert.match(u.measurement, /SYNCHRONOUS/, "an unreachable outcome must carry the measurement that declares it so");
  assert.ok(!RETURNED_OUTCOMES.VALIDATED_APPEND.includes("COMMIT_STATUS_UNKNOWN"));
  /* 🔴 NOT IMPLEMENTED, AND PROVED SO FROM THE SOURCE. A branch that cannot fire is a check that cannot fail; the
   * honest form is to declare it and leave it unbuilt, never to write it and report it as passing. */
  const source = readFileSync(join(REPO, "src/governance/governed-write.mjs"), "utf8");
  const asCode = source.split("\n").filter((l) => !/^\s*\*/.test(l) && l.includes("COMMIT_STATUS_UNKNOWN"));
  assert.equal(asCode.length, 1, "COMMIT_STATUS_UNKNOWN appears in code beyond its single DECLARED_UNREACHABLE entry");
});

test("P50 · the idempotency key derivation holds in BOTH directions, and a supplied part is validated not trusted", () => {
  const base = { profile: "VALIDATED_APPEND", targetClass: "RUN_EVIDENCE", repoRelativeTarget: "runs/a.jsonl", occurrenceFingerprint: "a".repeat(64) };
  // the SAME governed action always yields the SAME key
  assert.equal(deriveIdempotencyKey(base), deriveIdempotencyKey({ ...base }));
  // two GENUINELY DIFFERENT governed actions can never yield the same key — every part moves it
  const different = [
    { ...base, profile: "STAGED_REPLACE" },
    { ...base, targetClass: "GENERATED_CONFIG" },
    { ...base, repoRelativeTarget: "runs/b.jsonl" },
    { ...base, occurrenceFingerprint: "b".repeat(64) },
  ];
  const keys = new Set([deriveIdempotencyKey(base), ...different.map(deriveIdempotencyKey)]);
  assert.equal(keys.size, 5, "two different governed actions derived the same key");
  // a caller-supplied part is VALIDATED
  assert.throws(() => deriveIdempotencyKey({ ...base, occurrenceFingerprint: "not-a-digest" }), /OCCURRENCE_FINGERPRINT_INVALID/);
  assert.throws(() => deriveIdempotencyKey({ ...base, targetClass: "WHATEVER" }), /TARGET_CLASS_UNDECLARED/);
  assert.throws(() => deriveIdempotencyKey({ ...base, profile: "SOMETHING_ELSE" }), /PROFILE_UNDECLARED/);
});

test("P15 · a supplied idempotency key that the action does not derive is REFUSED, never trusted", () => {
  const dir = scratch();
  try {
    const a = fileAdapter(dir, "t.json", "x");
    assert.throws(
      () => executeGovernedWrite({ permission: ALLOWED, audit: ctx(dir), adapter: a, action: act("t", a.occurrenceFingerprint), idempotencyKey: "f".repeat(64) }),
      /IDEMPOTENCY_KEY_NOT_DERIVABLE/,
    );
    // CONTROL: the correctly derived key is accepted by the same call shape.
    const key = deriveIdempotencyKey({ profile: "STAGED_REPLACE", targetClass: "REPOSITORY_FILE", repoRelativeTarget: rel(join(dir, "t.json")), occurrenceFingerprint: a.occurrenceFingerprint });
    const ok = executeGovernedWrite({ permission: ALLOWED, audit: ctx(dir), adapter: fileAdapter(dir, "t.json", "x"), action: act("t", a.occurrenceFingerprint), idempotencyKey: key });
    assert.equal(ok.outcome, "COMMITTED");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("🔴 an ABSENT SCOPE is refused, never widened to global", () => {
  const dir = scratch();
  try {
    const a = fileAdapter(dir, "t.json", "x");
    assert.throws(
      () => executeGovernedWrite({ permission: ALLOWED, audit: ctx(dir), adapter: a, action: { name: "n", occurredAt: OCCURRED, occurrenceFingerprint: a.occurrenceFingerprint } }),
      /SCOPE_ABSENT/,
    );
    // and a TENANT scope with no tenant is refused too — tenancy is never inferred
    assert.throws(
      () => executeGovernedWrite({ permission: ALLOWED, audit: ctx(dir), adapter: a, action: { name: "n", scopeType: "TENANT", occurredAt: OCCURRED, occurrenceFingerprint: a.occurrenceFingerprint } }),
      /TENANT_ABSENT/,
    );
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ══════════════════════════════════════════════════════════════════════════ *
 * THE SAGA
 * ══════════════════════════════════════════════════════════════════════════ */

test("P7 · P8 · an allowed action appends ATTEMPTED BEFORE the mutation, then exactly one terminal outcome", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const bytes = "committed-bytes\n";
    const a = fileAdapter(dir, "out.txt", bytes);
    /* The firing case: prove ATTEMPTED is already DURABLE at the moment the mutation begins, by reading the store
     * from inside commit(). A claim that it happens "first" is worth nothing unless something looks. */
    let attemptedWasDurable = null;
    const realCommit = a.commit.bind(a);
    a.commit = (tmp) => { attemptedWasDurable = storeAt(dir).readAll().events.map((e) => e.metadata.governedWritePhase); realCommit(tmp); };

    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter: a, action: act("write", a.occurrenceFingerprint) });
    assert.equal(r.outcome, "COMMITTED");
    assert.deepEqual(attemptedWasDurable, ["ATTEMPTED"], "the mutation began before ATTEMPTED was durable");
    assert.equal(readFileSync(join(dir, "out.txt"), "utf8"), bytes);

    const phases = storeAt(dir).readAll().events.map((e) => e.metadata.governedWritePhase);
    assert.deepEqual(phases, ["ATTEMPTED", "COMMITTED"], "a saga must be ATTEMPTED then EXACTLY ONE terminal");
    assert.equal(incompleteSagas(storeAt(dir).readAll().events).length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P9 · a refused action is audited REFUSED, executes no adapter and writes nothing", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const a = fileAdapter(dir, "never.txt", "x");
    let adapterTouched = false;
    for (const m of ["prepare", "commit", "verify", "inspect", "prevalidate"]) {
      const orig = a[m].bind(a);
      a[m] = (...args) => { adapterTouched = true; return orig(...args); };
    }
    const r = executeGovernedWrite({ permission: REFUSED, audit, adapter: a, action: act("write", a.occurrenceFingerprint) });
    assert.equal(r.outcome, "REFUSED");
    assert.equal(adapterTouched, false, "a refused decision reached the durability adapter");
    assert.equal(existsSync(join(dir, "never.txt")), false);
    const events = storeAt(dir).readAll().events;
    assert.deepEqual(events.map((e) => e.metadata.governedWritePhase), ["REFUSED"]);
    assert.equal(events[0].outcome, "REFUSED");
    assert.ok(events[0].reasonCode.length > 0, "a refusal that names no reason cannot be reconstructed");
    // CONTROL: the SAME adapter and action, permitted, does reach it and does write.
    const ok = executeGovernedWrite({ permission: ALLOWED, audit, adapter: fileAdapter(dir, "never.txt", "x"), action: act("write", a.occurrenceFingerprint) });
    assert.equal(ok.outcome, "COMMITTED");
    assert.equal(existsSync(join(dir, "never.txt")), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P10 · P17 · a failed target receives FAILED — never COMMITTED — and leaves no authoritative target", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const a = fileAdapter(dir, "t.txt", "x");
    a.prepare = () => { const e = new Error("nope"); e.code = "ENOENT"; throw e; };
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter: a, action: act("t", a.occurrenceFingerprint) });
    assert.equal(r.outcome, "FAILED_BEFORE_COMMIT");
    assert.equal(TERMINAL_EVENT_FOR[r.outcome], SAGA.FAILED);
    assert.equal(existsSync(join(dir, "t.txt")), false, "a failed preparation left an authoritative target");
    const terminal = storeAt(dir).readAll().events.at(-1);
    assert.equal(terminal.metadata.governedWritePhase, "FAILED");
    assert.equal(terminal.outcome, "FAIL");
    assert.notEqual(terminal.outcome, "APPLIED");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P11 · an ATTEMPTED with no terminal is EXPOSED as an incomplete saga, not hidden", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const a = fileAdapter(dir, "t.txt", "x");
    /* A process that dies between ATTEMPTED and its terminal is the one thing the boundary cannot prevent — so it
     * is reported. A reader that quietly dropped these would turn a crash into a clean-looking trail. */
    a.commit = () => { throw Object.assign(new Error("killed"), { code: "SIGKILL", fatal: true }); };
    const realAppend = audit.store.append;
    let appends = 0;
    audit.store.append = (d, o) => { appends += 1; if (appends === 2) throw new Error("the process died here"); return realAppend(d, o); };
    assert.throws(() => executeGovernedWrite({ permission: ALLOWED, audit, adapter: a, action: act("t", a.occurrenceFingerprint) }), /died here/);

    const events = storeAt(dir).readAll().events;
    const incomplete = incompleteSagas(events);
    assert.equal(incomplete.length, 1, "a dangling ATTEMPTED was not exposed");
    assert.equal(incomplete[0].action, "t");
    // CONTROL, PROVED CAPABLE OF THE OTHER VERDICT: a complete saga reports nothing.
    const clean = scratch();
    try {
      const b = fileAdapter(clean, "ok.txt", "y");
      executeGovernedWrite({ permission: ALLOWED, audit: ctx(clean), adapter: b, action: act("ok", b.occurrenceFingerprint) });
      assert.deepEqual(incompleteSagas(storeAt(clean).readAll().events), []);
    } finally { rmSync(clean, { recursive: true, force: true }); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P13 · P14 · P21 · a retry creates ONE target and ONE occurrence event, and returns ALREADY_COMMITTED", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const bytes = "once\n";
    const fp = fileAdapter(dir, "one.txt", bytes).occurrenceFingerprint;

    const first = executeGovernedWrite({ permission: ALLOWED, audit, adapter: fileAdapter(dir, "one.txt", bytes), action: act("w", fp) });
    assert.equal(first.outcome, "COMMITTED");
    const afterFirst = storeAt(dir).readAll().events.length;

    for (let i = 0; i < 3; i += 1) {
      const again = executeGovernedWrite({ permission: ALLOWED, audit, adapter: fileAdapter(dir, "one.txt", bytes), action: act("w", fp) });
      assert.equal(again.outcome, "ALREADY_COMMITTED");
      assert.equal(again.terminalEventId, null, "ALREADY_COMMITTED appended a terminal event");
      assert.equal(again.attemptedEventId, null, "ALREADY_COMMITTED appended a second ATTEMPTED");
    }
    assert.equal(storeAt(dir).readAll().events.length, afterFirst, "retries added occurrence events");
    assert.equal(readdirSync(dir).filter((n) => n === "one.txt").length, 1);
    assert.equal(readFileSync(join(dir, "one.txt"), "utf8"), bytes);
    assert.equal(readdirSync(dir).filter((n) => n.includes(TEMP_MARKER)).length, 0, "a retry left a temporary behind");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ══════════════════════════════════════════════════════════════════════════ *
 * PROFILE 1 · STAGED_REPLACE
 * ══════════════════════════════════════════════════════════════════════════ */

test("P16 · preparation happens INSIDE the target's own confined directory", () => {
  const dir = scratch();
  try {
    const a = fileAdapter(dir, join("nested", "t.txt"), "x");
    let preparedAt = null;
    const realPrepare = a.prepare.bind(a);
    a.prepare = () => { preparedAt = realPrepare(); return preparedAt; };
    executeGovernedWrite({ permission: ALLOWED, audit: ctx(dir), adapter: a, action: act("t", a.occurrenceFingerprint) });
    assert.equal(dirname(preparedAt), join(dir, "nested"), "the temporary was prepared outside the target's directory");
    assert.ok(preparedAt.includes(TEMP_MARKER));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("🔴 BINARY content is hashed RAW — a buffer holding CRLF bytes is not normalised into a different occurrence", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    /* Two governed callers write brotli buffers. A brotli payload really does contain 0x0D 0x0A pairs that mean
     * nothing of the sort, so applying the text rule to them would change the hash of bytes that never changed. */
    const binary = Buffer.from([0x1f, 0x0d, 0x0a, 0x42, 0x0d, 0x0a, 0x00, 0xff]);
    const a = stagedReplaceAdapter({ repo: REPO, repoRelativeTarget: rel(join(dir, "b.bin")), targetClass: "RUN_EVIDENCE", bytes: binary });
    assert.equal(executeGovernedWrite({ permission: ALLOWED, audit, adapter: a, action: act("bin", a.occurrenceFingerprint) }).outcome, "COMMITTED");
    // the bytes on disk are EXACTLY the bytes offered — nothing was decoded, replaced or collapsed
    assert.deepEqual(readFileSync(join(dir, "b.bin")), binary);
    const again = stagedReplaceAdapter({ repo: REPO, repoRelativeTarget: rel(join(dir, "b.bin")), targetClass: "RUN_EVIDENCE", bytes: binary });
    assert.equal(executeGovernedWrite({ permission: ALLOWED, audit, adapter: again, action: act("bin", again.occurrenceFingerprint) }).outcome, "ALREADY_COMMITTED");

    /* 🔴 CONTROL, SHOWING THE HAZARD IS REAL: under the TEXT rule these two DIFFERENT buffers collapse to the same
     * digest. That is precisely why the rule is chosen by what the caller supplies instead of applied to all. */
    const other = Buffer.from([0x1f, 0x0a, 0x42, 0x0a, 0x00, 0xff]);
    assert.equal(contentHash(binary), contentHash(other), "the text rule no longer collapses CRLF — this control has stopped demonstrating the hazard");
    assert.notEqual(byteHash(binary), byteHash(other), "the byte rule collapsed two different buffers");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P18 · a successful rename is DETECTED as committed by re-reading the target", () => {
  const dir = scratch();
  try {
    const bytes = "landed\n";
    const a = fileAdapter(dir, "t.txt", bytes);
    const r = executeGovernedWrite({ permission: ALLOWED, audit: ctx(dir), adapter: a, action: act("t", a.occurrenceFingerprint) });
    assert.equal(r.outcome, "COMMITTED");
    // detection is by CONTENT, read back from disk — not by the call having returned
    assert.equal(contentHash(readFileSync(join(dir, "t.txt"))), a.occurrenceFingerprint);
    assert.deepEqual(fileAdapter(dir, "t.txt", bytes).inspect(), { state: "COMMITTED" });
    // CONTROL: a DIFFERENT occurrence is not detected as committed against the same target
    assert.deepEqual(fileAdapter(dir, "t.txt", "something else\n").inspect(), { state: "ABSENT" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("🔴 the rename landed but the confirmation did not — RECOVERY_REQUIRED, which is neither COMMITTED nor FAILED", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const a = fileAdapter(dir, "t.txt", "moved\n");
    a.verify = () => [{ code: "INJECTED_VERIFY_FAILURE", why: "the target cannot be confirmed" }];
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter: a, action: act("t", a.occurrenceFingerprint) });
    assert.equal(r.outcome, "RECOVERY_REQUIRED");
    assert.equal(readFileSync(join(dir, "t.txt"), "utf8"), "moved\n", "the target really did move — this is not a failure");
    const terminal = storeAt(dir).readAll().events.at(-1);
    assert.equal(terminal.metadata.governedWritePhase, "RECOVERY_REQUIRED");
    assert.equal(terminal.outcome, "INDETERMINATE");
    assert.equal(OUTCOME_FOR_PHASE.RECOVERY_REQUIRED, "INDETERMINATE");
    // CONTROL: without the injected failure the same write confirms cleanly.
    const clean = scratch();
    try {
      const b = fileAdapter(clean, "t.txt", "moved\n");
      assert.equal(executeGovernedWrite({ permission: ALLOWED, audit: ctx(clean), adapter: b, action: act("t", b.occurrenceFingerprint) }).outcome, "COMMITTED");
    } finally { rmSync(clean, { recursive: true, force: true }); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P19 · the PREPARED discovered state has a working owner — it discards ITS OWN temporary and nothing else", () => {
  const dir = scratch();
  try {
    mkdirSync(join(dir, "d"), { recursive: true });
    const target = join(dir, "d", "t.txt");
    // a temporary that outlived its process, named as ours
    const abandoned = `${target}${TEMP_MARKER}9999-abcdef.tmp`;
    writeFileSync(abandoned, "prepared but never renamed", "utf8");
    // and an UNRELATED file that must survive untouched
    const unrelated = join(dir, "d", "somebody-elses.tmp");
    writeFileSync(unrelated, "not ours", "utf8");

    const a = fileAdapter(dir, join("d", "t.txt"), "new\n");
    const r = executeGovernedWrite({ permission: ALLOWED, audit: ctx(dir), adapter: a, action: act("t", a.occurrenceFingerprint) });
    assert.equal(r.outcome, "COMMITTED");
    assert.equal(existsSync(abandoned), false, "the owner did not discard its own abandoned temporary");
    assert.equal(existsSync(unrelated), true, "the owner removed an UNRELATED file");
    assert.equal(readFileSync(unrelated, "utf8"), "not ours");
    // 🔴 DISCARDED, NEVER ADOPTED: the committed bytes are the new ones, not the abandoned temporary's.
    assert.equal(readFileSync(target, "utf8"), "new\n");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P12 · recovery APPENDS a recovery outcome and rewrites no prior event", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const bytes = "r\n";
    const a = fileAdapter(dir, "t.txt", bytes);
    executeGovernedWrite({ permission: ALLOWED, audit, adapter: a, action: act("t", a.occurrenceFingerprint) });
    const before = readFileSync(join(dir, "e.jsonl"), "utf8");

    const key = deriveIdempotencyKey({ profile: "STAGED_REPLACE", targetClass: "REPOSITORY_FILE", repoRelativeTarget: rel(join(dir, "t.txt")), occurrenceFingerprint: a.occurrenceFingerprint });
    const rec = recoverGovernedWrite({ audit, adapter: fileAdapter(dir, "t.txt", bytes), action: act("t", a.occurrenceFingerprint), idempotencyKey: key });
    assert.equal(rec.outcome, SAGA.RECOVERED_COMMITTED);

    const after = readFileSync(join(dir, "e.jsonl"), "utf8");
    assert.ok(after.startsWith(before), "recovery rewrote history instead of appending to it");
    assert.equal(after.length > before.length, true);
    // CONTROL: recovery of something that never committed says so, rather than assuming success.
    const b = fileAdapter(dir, "absent.txt", "never\n");
    const missingKey = deriveIdempotencyKey({ profile: "STAGED_REPLACE", targetClass: "REPOSITORY_FILE", repoRelativeTarget: rel(join(dir, "absent.txt")), occurrenceFingerprint: b.occurrenceFingerprint });
    assert.equal(recoverGovernedWrite({ audit, adapter: b, action: act("absent", b.occurrenceFingerprint), idempotencyKey: missingKey }).outcome, SAGA.RECOVERY_FAILED);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ══════════════════════════════════════════════════════════════════════════ *
 * PROFILE 2 · VALIDATED_APPEND
 * ══════════════════════════════════════════════════════════════════════════ */

test("P20 · P22 · a validated append prevalidates first and commits EXACTLY one record", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const record = { id: "r-1", value: 1 };
    const a = logAdapter(dir, "log.jsonl", record);
    const order = [];
    for (const m of ["prevalidate", "commit"]) { const o = a[m].bind(a); a[m] = (...x) => { order.push(m); return o(...x); }; }
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter: a, action: act("append", a.occurrenceFingerprint) });
    assert.equal(r.outcome, "COMMITTED");
    assert.deepEqual(order, ["prevalidate", "commit"], "the record was appended before it was validated");
    assert.equal(readFileSync(join(dir, "log.jsonl"), "utf8").trim().split("\n").length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P15 · P22 · a CONFLICTING occurrence is refused and never overwrites the committed one", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const a = logAdapter(dir, "log.jsonl", { id: "r-1", value: 1 });
    assert.equal(executeGovernedWrite({ permission: ALLOWED, audit, adapter: a, action: act("append", a.occurrenceFingerprint) }).outcome, "COMMITTED");
    const committed = readFileSync(join(dir, "log.jsonl"), "utf8");

    const b = logAdapter(dir, "log.jsonl", { id: "r-1", value: 999 });
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter: b, action: act("append", b.occurrenceFingerprint) });
    assert.equal(r.outcome, "FAILED_BEFORE_COMMIT");
    assert.equal(readFileSync(join(dir, "log.jsonl"), "utf8"), committed, "a conflicting occurrence overwrote or appended");
    const terminal = storeAt(dir).readAll().events.at(-1);
    assert.equal(terminal.reasonCode, "GOVERNED_WRITE_OCCURRENCE_CONFLICT");
    // 🔴 FIELD IDENTIFIERS ONLY — a conflict report never carries the values that disagree.
    assert.equal(terminal.metadata.conflictingFields, "value");
    assert.ok(!JSON.stringify(terminal).includes("999"), "the conflict report leaked a disagreeing VALUE");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P24 · P25 · a partial tail is DETECTED, the append is refused, and no valid record is truncated", () => {
  const dir = scratch();
  try {
    const audit = ctx(dir);
    const log = join(dir, "log.jsonl");
    const good = logAdapter(dir, "log.jsonl", { id: "r-1", value: 1 });
    executeGovernedWrite({ permission: ALLOWED, audit, adapter: good, action: act("append", good.occurrenceFingerprint) });
    // a torn write, as an interrupted append would leave it
    appendFileSync(log, '{"id":"r-2","val', "utf8");
    const damaged = readFileSync(log, "utf8");

    const next = logAdapter(dir, "log.jsonl", { id: "r-3", value: 3 });
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter: next, action: act("append", next.occurrenceFingerprint) });
    assert.equal(r.outcome, "FAILED_BEFORE_COMMIT");
    assert.equal(r.faults[0].code, "MALFORMED_TAIL");
    /* 🔴 THE OWNER BLOCKS; IT DOES NOT REPAIR. There is no recovery law in this repository and F08 invents none,
     * so the damaged bytes are left EXACTLY as found — a valid committed record is never truncated to tidy up. */
    assert.equal(readFileSync(log, "utf8"), damaged, "recovery truncated or rewrote the damaged log");
    // CONTROL: on an undamaged log the same append commits.
    const clean = scratch();
    try {
      const c = logAdapter(clean, "log.jsonl", { id: "r-3", value: 3 });
      assert.equal(executeGovernedWrite({ permission: ALLOWED, audit: ctx(clean), adapter: c, action: act("append", c.occurrenceFingerprint) }).outcome, "COMMITTED");
    } finally { rmSync(clean, { recursive: true, force: true }); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ══════════════════════════════════════════════════════════════════════════ *
 * THE AUDIT-STORE EXEMPTION — BY NAME, AND FENCED
 * ══════════════════════════════════════════════════════════════════════════ */

test("P26 · P51 · the audit store's own persistence is exempt BY NAME, and the fence refuses anything else claiming it", () => {
  assert.equal(AUDIT_STORE_EXEMPTION.module, "src/audit-trail/store.mjs");
  assert.deepEqual([...AUDIT_STORE_EXEMPTION.writes], ["EVENT_APPEND", "HEAD_RECORD"]);
  /* 🔴 EXACTLY THOSE, AND NOTHING ELSE. "Infrastructure" is not a word any future write may claim for itself,
   * so the exemption is one module and two writes — not a category a file can put itself into. */
  const dir = scratch();
  try {
    const audit = ctx(dir);
    /* A governed write that TARGETS the audit store is refused: auditing it would call the store being written.
     *
     * 🔴 THE FIRING CASE AIMS AT A STAND-IN, NOT AT THE REAL TRAIL — and that is not fastidiousness. The fence
     * compares the target against the audit context's OWN store paths, so a temporary store proves exactly the
     * same thing. An earlier version of this test pointed at the real events.jsonl; when §13 sabotaged the fence,
     * the STAGED_REPLACE adapter renamed over it and destroyed all 179 committed events. They were restored from
     * the committed blob and the chain re-verified, but a proof whose firing case can do that is a hazard, not a
     * proof. It now cannot happen: the worst a sabotage can reach is a scratch file. */
    const pretendEvents = join(dir, "pretend-audit", "events.jsonl");
    const a = stagedReplaceAdapter({ repo: REPO, repoRelativeTarget: rel(pretendEvents), targetClass: "AUDIT_TRAIL", bytes: "x" });
    const auditAtItsOwnStore = { ...audit, store: { ...audit.store, eventsPath: pretendEvents, headPath: join(dir, "pretend-audit", "head.json") } };
    assert.throws(
      () => executeGovernedWrite({ permission: ALLOWED, audit: auditAtItsOwnStore, adapter: a, action: act("t", a.occurrenceFingerprint) }),
      /AUDIT_STORE_TARGET_FORBIDDEN/,
      "a governed write targeting the audit store was not refused — the exemption has become a hole",
    );
    // CONTROL, PROVED CAPABLE: an ordinary target under the same call shape is accepted.
    const b = fileAdapter(dir, "ordinary.txt", "x");
    assert.equal(executeGovernedWrite({ permission: ALLOWED, audit, adapter: b, action: act("t", b.occurrenceFingerprint) }).outcome, "COMMITTED");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ══════════════════════════════════════════════════════════════════════════ *
 * THE CONFINED TEST STORE
 * ══════════════════════════════════════════════════════════════════════════ */

const testEnv = (extra = {}) => ({ NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: "7", ...extra });

test("P32 · P39 · inside a verified test context the store is confined, and unique per worker AND per run", () => {
  assert.equal(inVerifiedTestContext(testEnv()), true);
  const RUN_A = "aaaa1111";
  const w7 = resolveAuditStoreLocation({ repo: REPO, env: testEnv({ [AUDIT_RUN_ENV]: RUN_A }) });
  const w8 = resolveAuditStoreLocation({ repo: REPO, env: testEnv({ NODE_TEST_WORKER_ID: "8", [AUDIT_RUN_ENV]: RUN_A }) });
  assert.equal(w7.synthetic, true);
  assert.ok(w7.eventsPath.includes(join("audit", `run-${RUN_A}`, "worker-7")), w7.eventsPath);
  assert.notEqual(w7.eventsPath, w8.eventsPath, "two workers in one run were handed the same store");

  /* 🔴 AND A LATER RUN NEVER INHERITS AN EARLIER ONE'S. This assertion previously required only `worker-7`, and
   * THAT WAS THE DEFECT: confining by worker id alone meant `worker-3` was the same directory in every invocation,
   * so events accumulated across suite runs — measured growing 6 -> 7 -> 8 lines over three consecutive runs. A
   * test could then read a store it had not filled. The run scope is what made the old assertion wrong. */
  const laterRun = resolveAuditStoreLocation({ repo: REPO, env: testEnv({ [AUDIT_RUN_ENV]: "bbbb2222" }) });
  assert.notEqual(w7.eventsPath, laterRun.eventsPath, "a later run reused an earlier run's store");

  /* The minted nonce is written back into the environment, so anything this process SPAWNS inherits it — that is
   * what lets a binary spawned by a test share that test's store while unrelated tests do not. */
  const env = testEnv();
  assert.equal(env[AUDIT_RUN_ENV], undefined);
  resolveAuditStoreLocation({ repo: REPO, env });
  assert.match(String(env[AUDIT_RUN_ENV]), /^\d+-[0-9a-f]{8}$/, "the minted run nonce was not exported for spawned children");

  // 🔴 THE NONCE BECOMES A PATH SEGMENT, SO IT IS VALIDATED, NOT TRUSTED.
  assert.throws(() => resolveAuditStoreLocation({ repo: REPO, env: testEnv({ [AUDIT_RUN_ENV]: "../../escape" }) }), AuditStoreOverrideForbidden);

  // and this very process is running under one
  assert.equal(resolveAuditStoreLocation({ repo: REPO }).synthetic, true, "the test suite itself is not confined");
});

test("P38 · a SYMLINKED store location that escapes the scratch root is refused, by realpath not by spelling", () => {
  const outside = mkdtempSync(join(tmpdir(), "gw-outside-"));
  const link = join(REPO, TEST_SCRATCH_AUDIT_ROOT, `escape-${process.pid}`);
  const real = join(REPO, TEST_SCRATCH_AUDIT_ROOT, `real-${process.pid}`);
  mkdirSync(dirname(link), { recursive: true });
  let made = null;
  try { symlinkSync(outside, link, "junction"); made = true; } catch (err) { made = err.code ?? String(err); }
  try {
    /* 🔴 IF THE LINK CANNOT BE CREATED THIS PROOF IS NOT RUN, AND SAYS SO. It is never reported as passed on the
     * strength of an exception that never had the chance to fire. */
    assert.equal(made, true, `a junction could not be created (${made}) — P38 is NOT RUN on this machine`);
    /* The path is LEXICALLY inside the scratch root; only realpath reveals that it leaves the repository. */
    assert.throws(
      () => resolveAuditStoreLocation({ repo: REPO, env: testEnv({ [AUDIT_STORE_OVERRIDE_ENV]: link }) }),
      AuditStoreOverrideForbidden,
      "a symlinked escape was accepted as a confined store",
    );
    // CONTROL, PROVED CAPABLE: a REAL directory in the very same place is accepted.
    mkdirSync(real, { recursive: true });
    assert.equal(resolveAuditStoreLocation({ repo: REPO, env: testEnv({ [AUDIT_STORE_OVERRIDE_ENV]: real }) }).synthetic, true);
  } finally {
    try { rmSync(link, { recursive: true, force: true }); } catch { /* the junction may already be gone */ }
    rmSync(real, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("P33 · both of Node's own test signals survive the real spawn shape", () => {
  const out = execFileSync(process.execPath, ["-e", "process.stdout.write(JSON.stringify([process.env.NODE_TEST_CONTEXT,Boolean(process.env.NODE_TEST_WORKER_ID)]))"], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(out), ["child-v8", true], "the measured test signals do not survive spawn");
});

test("P34 · outside a verified test context a present override is REFUSED and no governed write happens", () => {
  const forbidden = [
    { NODE_TEST_CONTEXT: "child-v8" },                    // worker id missing
    { NODE_TEST_WORKER_ID: "3" },                          // context missing
    {},                                                    // neither
  ];
  for (const env of forbidden) {
    assert.throws(
      () => resolveAuditStoreLocation({ repo: REPO, env: { ...env, [AUDIT_STORE_OVERRIDE_ENV]: join(REPO, TEST_SCRATCH_AUDIT_ROOT, "x") } }),
      AuditStoreOverrideForbidden,
      `an override was honoured with env ${JSON.stringify(env)}`,
    );
  }
  // CONTROL, PROVED CAPABLE: with BOTH signals the same override resolves.
  const ok = resolveAuditStoreLocation({ repo: REPO, env: testEnv({ [AUDIT_STORE_OVERRIDE_ENV]: join(REPO, TEST_SCRATCH_AUDIT_ROOT, "x") }) });
  assert.equal(ok.synthetic, true);
});

test("P35 · P36 · P37 · outside-repository, repository-root and production-store overrides are all refused", () => {
  const cases = {
    "outside the repository": "C:\\Windows\\Temp\\elsewhere",
    "the repository root": REPO,
    "the production store": join(REPO, AUDIT_STORE.eventsPath),
    "inside the repo but outside the scratch root": join(REPO, "runs"),
  };
  for (const [why, path] of Object.entries(cases)) {
    assert.throws(
      () => resolveAuditStoreLocation({ repo: REPO, env: testEnv({ [AUDIT_STORE_OVERRIDE_ENV]: path }) }),
      AuditStoreOverrideForbidden,
      `${why} was accepted as a store location`,
    );
  }
});

test("P41 · P42 · a confined store's events are SYNTHETIC_TEST_FIXTURE and can never count as real evidence", () => {
  const dir = scratch();
  try {
    const audit = { ...ctx(dir), store: { ...storeAt(dir), append: (d, o) => storeAt(dir).append({ ...d, metadata: { ...(d.metadata ?? {}), evidenceClass: SYNTHETIC_LABEL } }, o) } };
    const a = fileAdapter(dir, "t.txt", "x");
    executeGovernedWrite({ permission: ALLOWED, audit, adapter: a, action: act("t", a.occurrenceFingerprint) });
    const events = storeAt(dir).readAll().events;
    assert.ok(events.length > 0);
    for (const e of events) {
      assert.equal(e.metadata.evidenceClass, SYNTHETIC_LABEL);
      assert.equal(isRealEvidence(e), false, "a synthetic fixture was accepted as real evidence");
    }
    // CONTROL: an unlabelled event IS real evidence, so the check is not simply always-false.
    assert.equal(isRealEvidence({ metadata: {} }), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ══════════════════════════════════════════════════════════════════════════ *
 * CROSS-BUILD REPLAY — the owner requirement above the contract
 * ══════════════════════════════════════════════════════════════════════════ */

test("P43 · P46 · the same occurrence under a later build is recognised, and existing bytes are untouched", () => {
  assert.ok(RECORDER_EXECUTION_FIELDS.includes("softwareVersion"), "the recorder's build is still part of occurrence identity");
  const dir = scratch();
  try {
    const store = storeAt(dir);
    const draft = (build) => ({
      eventType: "GOVERNED_WRITE", action: "replay", outcome: "APPLIED", reasonCode: "GOVERNED_WRITE_COMMITTED",
      occurredAt: OCCURRED, actor: "engine", actorType: "ENGINE", scopeType: "GLOBAL_PRODUCT", tenantId: null,
      subjectId: null, authorityRef: { propositionId: "P-T", scope: ["T"] }, authorityHash: "e".repeat(64),
      softwareVersion: build, evidenceRefs: [], correlationId: "c", parentEventId: null,
      migration: false, migrationSource: null, migratedAt: null, metadata: {},
    });
    const identity = { k: "one" };
    const first = store.append(draft("engine:aaa"), { identity });
    assert.equal(first.status, "APPENDED");
    const later = store.append(draft("engine:zzz"), { identity });
    assert.equal(later.status, "IDEMPOTENT_RETRY", "a later build was treated as a conflicting duplicate");
    assert.equal(later.appended, false);

    const lines = readFileSync(join(dir, "e.jsonl"), "utf8").trim().split("\n");
    assert.equal(lines.length, 1, "a cross-build replay appended a duplicate");
    const stored = JSON.parse(lines[0]);
    assert.equal(stored.softwareVersion, "engine:aaa", "softwareVersionAtEvent was overwritten by the replay");
    assert.equal(stored.recordedAt, first.event.recordedAt, "firstRecordedAt was overwritten by the replay");

    // 🔴 CONTROL: a GENUINE immutable disagreement still conflicts. A repair that made everything match
    // would be worse than the defect it fixed.
    assert.throws(() => store.append({ ...draft("engine:aaa"), outcome: "FAIL" }, { identity }), /EVENT_ID_CONFLICT/);
    assert.equal(readFileSync(join(dir, "e.jsonl"), "utf8").trim().split("\n").length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P44 · cross-build false conflicts are ZERO for the ALREADY-COMMITTED production population — with a live control", () => {
  const eventsPath = join(REPO, AUDIT_STORE.eventsPath);
  const committed = existsSync(eventsPath)
    ? readFileSync(eventsPath, "utf8").replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l))
    : [];
  assert.ok(committed.length > 0, "the population is empty — a zero over nothing proves nothing");

  const OTHER = "engine:0000000000000000000000000000000000000000";
  const falseConflicts = committed.filter((e) => contentFingerprint({ ...e, softwareVersion: OTHER }) !== contentFingerprint(e));
  assert.deepEqual(falseConflicts.map((e) => e.eventId), [], `${falseConflicts.length} of ${committed.length} committed events still conflict across builds`);

  /* 🔴 LIVE CONTROL over the SAME population and the SAME function: a genuine change is still detected.
   * Without this, "zero" could equally mean the comparison had stopped looking. */
  const genuine = committed.filter((e) => contentFingerprint({ ...e, action: `${e.action}-X` }) !== contentFingerprint(e));
  assert.equal(genuine.length, committed.length, "the fingerprint no longer detects a genuine content change");
});

test("P52 · the committed production trail is not rewritten by any of this — its bytes still verify", () => {
  const eventsPath = join(REPO, AUDIT_STORE.eventsPath);
  const lines = readFileSync(eventsPath, "utf8").replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const events = lines.map((l) => JSON.parse(l));
  /* Read from the stored bytes: the repair changed the COMPARISON, not the file. Every event still carries the
   * build that actually recorded it. */
  assert.ok(events.every((e) => typeof e.softwareVersion === "string" && e.softwareVersion.startsWith("engine:")));
  assert.equal(new Set(events.map((e) => e.eventId)).size, events.length, "the trail holds duplicate event ids");
});
