/**
 * 🔴 F77 · IDEMPOTENCY, RETRY AND ROLLBACK SAFETY (acceptance _handoffs 7042c77; limb map 84f26b9; RR-81).
 *
 * The repaired limbs, proved on the production paths:
 *   M1 (R6·R1) a retry that crosses a second boundary appends NO second authorisation decision;
 *   M2 (R1b·R3) the SAME governed write from N genuinely parallel processes commits ONCE, and concurrent appends keep the chain;
 *   M4 (R5b) the paid and metered call-path census over the real tree, with its bound and firing controls;
 *   M5 (R4) recovery run again changes nothing.
 * Every store here is a CONFINED scratch store inside .test-scratch (confineToRepo refuses the OS temp directory). The production
 * trail is hashed before and after this file and must be byte-identical.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { executeGovernedWrite, recoverGovernedWrite, deriveIdempotencyKey, sagaLockPath } from "../src/governance/governed-write.mjs";
import { stagedReplaceAdapter, TEMP_MARKER } from "../src/governance/durability-adapters.mjs";
import { createAuditStore } from "../src/audit-trail/store.mjs";
import { withExclusiveLock, LOCK_BOUND_MS } from "../src/governance/process-lock.mjs";
import { censusOf, productionFiles, FILE_BOUND, CONNECTOR_CALL_CLASS } from "../tools/paid-metered-call-census.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHILD = join(REPO, "test", "helpers", "f77-concurrent-writer.mjs");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailHash = () => createHash("sha256").update(readFileSync(TRAIL)).digest("hex");
const TRAIL_BEFORE = trailHash();
after(() => assert.equal(trailHash(), TRAIL_BEFORE, "the production trail changed during the F77 proofs"));

const scratch = () => { mkdirSync(join(REPO, ".test-scratch"), { recursive: true }); return mkdtempSync(join(REPO, ".test-scratch", "f77-")); };
const rel = (p) => p.slice(REPO.length).split("\\").join("/");
const storeAt = (d) => createAuditStore({ eventsPath: join(d, "e.jsonl"), headPath: join(d, "h.json") });
const audit = (d) => ({ store: storeAt(d), actor: "engine", actorType: "ENGINE", softwareVersion: "engine:test", correlationId: "run:f77-test", authorityRef: { propositionId: "P-TEST", scope: ["TEST"] }, authorityHash: "d".repeat(64) });
const fileAdapter = (d, bytes = "once\n") => stagedReplaceAdapter({ repo: REPO, repoRelativeTarget: rel(join(d, "one.txt")), targetClass: "REPOSITORY_FILE", bytes });
const act = (fp, occurredAt) => ({ name: "WRITE_FACTS_CENSUS", label: "f77", scopeType: "GLOBAL_PRODUCT", occurredAt, occurrenceFingerprint: fp, evidenceRefs: [] });
const ALLOWED = { mayWrite: true, reason: "TEST", actorRef: "actor:cc" };
const secondOf = (ms) => new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

/** N processes, one common start instant; resolves to their printed outcomes. */
function parallel(n, mode, dir) {
  const startAt = Date.now() + 1500;
  return Promise.all(Array.from({ length: n }, (_, i) => new Promise((res) => {
    let out = "";
    const c = spawn(process.execPath, [CHILD, mode, dir, String(startAt), `p${i}`]);
    c.stdout.on("data", (d) => (out += d));
    c.on("close", () => res(out.trim()));
  })));
}
const tally = (xs) => xs.reduce((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {});

test("M2 · R1b · the SAME governed write from 8 parallel processes commits ONCE; the rest return ALREADY_COMMITTED; the chain stays whole", async () => {
  const dir = scratch();
  try {
    const outs = await parallel(8, "governed-write", dir);
    const events = storeAt(dir).readAll().events;
    const ids = new Set(events.map((e) => e.eventId));
    const t = tally(outs);
    console.log(`[M2 saga] processes 8 · outcomes ${JSON.stringify(t)} · events ${events.length} · distinct ids ${ids.size}`);
    assert.deepEqual(t, { COMMITTED: 1, ALREADY_COMMITTED: 7 }, "a concurrent repeat wrote again, or failed");
    assert.equal(events.length, ids.size, "a duplicate event id");
    assert.deepEqual(storeAt(dir).verify().findings.map((f) => f.code), [], "the chain is broken");
    assert.equal(readFileSync(join(dir, "one.txt"), "utf8"), "once\n");
    assert.deepEqual(readdirSync(dir).filter((n) => n.includes(TEMP_MARKER)), [], "a temporary was left behind");
    assert.equal(existsSync(`${join(dir, "e.jsonl")}.lock`), false, "a lock was left behind");
    // CONTROL: one process alone produces exactly the same record — the parallel result is not a different, smaller shape
    const solo = scratch();
    try {
      await parallel(1, "governed-write", solo);
      assert.equal(storeAt(solo).readAll().events.length, events.length, "parallel and solo runs recorded different event counts");
    } finally { rmSync(solo, { recursive: true, force: true }); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("M2 · R3 · 8 parallel appends of DISTINCT events all land, and 8 of the SAME event land once — the chain verifies", async () => {
  const d1 = scratch();
  const d2 = scratch();
  try {
    const distinct = await parallel(8, "append-distinct", d1);
    const e1 = storeAt(d1).readAll().events;
    console.log(`[M2 store distinct] processes 8 · outcomes ${JSON.stringify(tally(distinct))} · events ${e1.length}`);
    assert.deepEqual(tally(distinct), { APPENDED: 8 });
    assert.equal(e1.length, 8);
    assert.deepEqual(storeAt(d1).verify().findings.map((f) => f.code), []);
    const same = await parallel(8, "append-same", d2);
    const e2 = storeAt(d2).readAll().events;
    console.log(`[M2 store same] processes 8 · outcomes ${JSON.stringify(tally(same))} · events ${e2.length}`);
    assert.deepEqual(tally(same), { APPENDED: 1, IDEMPOTENT_RETRY: 7 });
    assert.equal(e2.length, 1);
    assert.deepEqual(storeAt(d2).verify().findings.map((f) => f.code), []);
  } finally { rmSync(d1, { recursive: true, force: true }); rmSync(d2, { recursive: true, force: true }); }
});

test("M1 · R6 · a retry in a LATER SECOND appends no second authorisation decision; the decision carries the action's time", () => {
  const dir = scratch();
  try {
    const occurredAt = secondOf(Date.now());
    const a = audit(dir);
    const fp = fileAdapter(dir).occurrenceFingerprint;
    assert.equal(executeGovernedWrite({ permission: ALLOWED, audit: a, adapter: fileAdapter(dir), action: act(fp, occurredAt) }).outcome, "COMMITTED");
    const before = storeAt(dir).readAll().events.length;
    const t0 = Date.now();
    while (secondOf(Date.now()) === secondOf(t0)) { /* cross into the next second — deterministic, not load-dependent */ }
    const again = executeGovernedWrite({ permission: ALLOWED, audit: a, adapter: fileAdapter(dir), action: act(fp, occurredAt) });
    assert.equal(again.outcome, "ALREADY_COMMITTED");
    const events = storeAt(dir).readAll().events;
    assert.equal(events.length, before, "the retry in a later second appended an event");
    const decisions = events.filter((e) => e.eventType === "AUTHORISATION_DECISION");
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0].occurredAt, occurredAt, "the decision is not recorded at the action's time");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("M5 · R4 · recovery run again — and again after a second — changes nothing; the chain verifies", () => {
  const dir = scratch();
  try {
    const a = audit(dir);
    const fp = fileAdapter(dir, "r\n").occurrenceFingerprint;
    const action = act(fp, secondOf(Date.now()));
    executeGovernedWrite({ permission: ALLOWED, audit: a, adapter: fileAdapter(dir, "r\n"), action });
    const key = deriveIdempotencyKey({ profile: "STAGED_REPLACE", targetClass: "REPOSITORY_FILE", repoRelativeTarget: rel(join(dir, "one.txt")), occurrenceFingerprint: fp });
    const n = () => storeAt(dir).readAll().events.length;
    const n0 = n();
    const r1 = recoverGovernedWrite({ audit: a, adapter: fileAdapter(dir, "r\n"), action, idempotencyKey: key });
    const n1 = n();
    const r2 = recoverGovernedWrite({ audit: a, adapter: fileAdapter(dir, "r\n"), action, idempotencyKey: key });
    const n2 = n();
    const t0 = Date.now();
    while (secondOf(Date.now()) === secondOf(t0)) { /* the next second */ }
    const r3 = recoverGovernedWrite({ audit: a, adapter: fileAdapter(dir, "r\n"), action, idempotencyKey: key });
    const n3 = n();
    console.log(`[M5] recoveries ${r1.outcome},${r2.outcome},${r3.outcome} · appended ${n1 - n0},${n2 - n1},${n3 - n2}`);
    assert.deepEqual([n1 - n0, n2 - n1, n3 - n2], [1, 0, 0], "a repeated recovery appended again");
    assert.deepEqual([r1.outcome, r2.outcome, r3.outcome], ["RECOVERED_COMMITTED", "RECOVERED_COMMITTED", "RECOVERED_COMMITTED"]);
    assert.deepEqual(storeAt(dir).verify().findings.map((f) => f.code), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("M2 · the lock is BOUNDED and fails closed while a live process holds it; a dead holder's lock is cleared", () => {
  const dir = scratch();
  try {
    const lock = join(dir, "x.jsonl.lock");
    // a LIVE holder: this process's parent holds a token naming a pid that is alive (our own parent), so it is never stale
    writeFileSync(lock, `${process.ppid}:${Date.now()}:held`);
    const t0 = Date.now();
    assert.throws(() => withExclusiveLock(lock, () => "ran", { boundMs: 200, pollMs: 20 }), (e) => e.code === "LOCK_TIMEOUT" && /bound of 200 ms/.test(e.message));
    assert.ok(Date.now() - t0 < 5000, "the bound was not honoured");
    // a DEAD holder: a process that has exited
    const dead = spawnSync(process.execPath, ["-e", "process.exit(0)"]).pid;
    writeFileSync(lock, `${dead}:${Date.now()}:stale`);
    assert.equal(withExclusiveLock(lock, () => "ran", { boundMs: 2000, pollMs: 20 }), "ran", "a dead holder's lock was not cleared");
    assert.equal(existsSync(lock), false, "the lock was not released");
    assert.equal(LOCK_BOUND_MS, 30000);
    assert.match(sagaLockPath(storeAt(dir), "a".repeat(64)), /e\.jsonl\.lock\.a{64}$/, "the saga lock is a FILE beside the store, never a directory");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("M4 · R5b · the paid and metered call-path census over the REAL tree, with its bound — and its controls fire", () => {
  const real = censusOf(productionFiles());
  console.log(`[M4 real] population ${real.population} · bound ${real.bound} · declared egress ${real.declaredEgress.length} · unclassified ${real.unclassifiedEgress.length} · metered kinds ${real.meteredKinds.join(",")} · paid gate sites ${real.paidGateSites.length} · REAL paid providers ${real.realPaidProviders}`);
  assert.ok(real.population > 100, "an empty population is not a census");
  assert.equal(real.bound, FILE_BOUND);
  assert.equal(real.ok, true);
  assert.equal(real.declaredEgress.length, 1, "every network call leaves through the one connector fetch");
  /* RR-155: F16's collection limb adds a keyed, quota-counted public-question source connector — a SECOND metered kind, re-measured */
  /* RR-159: the client's own AI provider connection (F16 C17) is keyed and billed to the client's own account — a THIRD metered kind, re-measured */
  assert.deepEqual(real.meteredKinds, ["SEARCH_CONSOLE_API", "QUESTION_SOURCE_API", "AI_PROVIDER"]);
  assert.equal(real.realPaidProviders, 0, "a REAL paid provider now exists — F77's paid limb is measurable and must be proved on it");
  // CONTROLS — each planted defect is SEEN
  assert.deepEqual(censusOf({ "src/planted.mjs": "const r = await fetch(u);" }).unclassifiedEgress, ["src/planted.mjs:1"]);
  assert.equal(censusOf({ "bin/planted.mjs": "createPaidProviderGate({ providers: { p: realProvider } })" }).realPaidProviders, 1);
  assert.deepEqual(censusOf({}, { connectorKinds: [...Object.keys(CONNECTOR_CALL_CLASS), "NEW_KIND"] }).unclassifiedKinds, ["NEW_KIND"]);
  assert.deepEqual(censusOf({ "src/x.mjs": "// a comment naming fetch( is not a call" }).unclassifiedEgress, [], "CONTROL: a comment is not a call");
});
