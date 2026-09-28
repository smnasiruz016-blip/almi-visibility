/**
 * 🔴 PART D1/D2 (command af4e9c8) — THE GOVERNED KEY-REGISTRATION READER AND PRE-SCORING KEY PREFLIGHT, BY BEHAVIOUR.
 *
 * src/heldout/key-registration.mjs against a REAL audit store with a REAL out-of-tree witness, in scratch directories, over
 * constructed non-sensitive stand-in keys. Each guard is shown firing on purpose and silent on its control:
 *   G1 · the ACCESS event is on the trail and the witness EQUAL at the moment the FIRST key byte is read; no witness, a witness
 *        not EQUAL, or an append that fails → refused, and NO key byte is read;
 *   G2 · the result and every event carry a count, a commitment and codes only — no label, item, class or per-class count;
 *   G3 · an incomplete, wider, duplicated or malformed key, an unregistered key (before any read) and a changed key are REFUSED.
 * Plus the REAL entry point, confined: with no witness it refuses before reading (G1 at the bin level) and the production trail is
 * unchanged.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createAuditStore } from "../src/audit-trail/store.mjs";
import { createWitness, linesOf } from "../src/audit-trail/witness.mjs";
import { measureKey, KeyRegistrationRefused, KEY_ACTIONS } from "../src/heldout/key-registration.mjs";
import { keyCommitment, populationCommitment } from "../src/heldout/lifecycle.mjs";
import { storeFiles } from "../src/governance/sealed-store-roots.mjs";
import { guardAuthority } from "../src/governance/guard-audit.mjs";

const AUTH = guardAuthority({ now: new Date().toISOString().slice(0, 10) });

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = () => ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => sha(fs.readFileSync(join(REPO, p))));
const CLASSES = ["GOAL", "QUESTION", "CONCERN", "CONFUSION"], EXCL = ["EXCLUDED_PERSONAL", "CANNOT_TELL"];

/** A scratch world: a store S with one key under key/, a registry naming its linked set, a real audit store with a real witness. */
function world({ rows, registerKey = null, extraRows = [], mutate = null } = {}) {
  const dir = fs.mkdtempSync(join(os.tmpdir(), "f10kr-"));
  const S = join(dir, "S"), A = join(dir, "audit");
  fs.mkdirSync(join(S, "key"), { recursive: true }); fs.mkdirSync(A);
  const items = rows ?? Array.from({ length: 12 }, (_, i) => `zqitem${i}x${sha(dir).slice(0, 6)}`);
  const lines = [...items.map((it, i) => (i % 5 === 4 ? { item: it, exclusion: "CANNOT_TELL" } : { item: it, classes: i % 2 ? ["GOAL"] : ["QUESTION", "CONCERN"] })), ...extraRows];
  let text = lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  if (mutate) text = mutate(text);
  fs.writeFileSync(join(S, "key", "labels.jsonl"), text);
  const setEntry = { id: "synthetic:kr-set", role: "HELD_OUT_EVIDENCE", sealed: true, contentHash: populationCommitment(items) };
  const keyCommit = keyCommitment({ "key/labels.jsonl": fs.readFileSync(join(S, "key", "labels.jsonl")) });
  const registry = [setEntry, ...(registerKey ? [{ id: "synthetic:kr-key", role: "MARKING_KEY", sealed: true, linkedSet: setEntry.id, contentHash: registerKey === "SAME" ? keyCommit : registerKey }] : [])];
  const witnessPath = join(dir, "witness.jsonl");
  const witness = createWitness({ locate: () => witnessPath });
  const store = createAuditStore({ eventsPath: join(A, "events.jsonl"), headPath: join(A, "head.json"), witness });
  const audit = { store, actor: "test", correlationId: `run:kr:${dir.slice(-6)}`, softwareVersion: "test", authorityRef: AUTH.authorityRef, authorityHash: AUTH.authorityHash };
  const reads = [];
  const read = (p) => { reads.push({ p, trail: store.readAll().events.map((e) => e.action), relation: witness.status(linesOf(fs.readFileSync(store.eventsPath, "utf8"))).relation }); return fs.readFileSync(p); };
  const run = (mode, over = {}) => measureKey({
    audit, witness, trailLines: () => linesOf(fs.readFileSync(store.eventsPath, "utf8")), registry, stores: { roots: { "kr-store": S } },
    spec: { keyId: "synthetic:kr-key", root: "kr-store", prefix: "key/", linkedSetId: setEntry.id, classes: CLASSES, exclusions: EXCL }, mode, read, list: storeFiles, ...over,
  });
  const code = (mode, over) => { try { run(mode, over); return "PASSED"; } catch (e) { if (e instanceof KeyRegistrationRefused) return e.code; throw e; } };
  return { dir, S, store, witness, reads, run, code, keyCommit, items, events: () => store.readAll().events, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test("K1 · MEASURE: the row count and the scorer's own commitment, and NOTHING else leaves (G2)", () => {
  const w = world();
  try {
    const r = w.run("MEASURE");
    assert.deepEqual(Object.keys(r).sort(), ["commitment", "mode", "rows"]);
    assert.equal(r.rows, 12);
    assert.equal(r.commitment, w.keyCommit, "not the lifecycle's keyCommitment over the same relative path the scorer reads");
    const trailText = fs.readFileSync(w.store.eventsPath, "utf8");
    for (const leak of [...CLASSES, ...EXCL, ...w.items]) assert.ok(!trailText.includes(leak), "a label, class or item reached the trail");
    assert.deepEqual(w.events().map((e) => `${e.action}/${e.outcome}`), [`${KEY_ACTIONS.ACCESS}/ALLOWED`, `${KEY_ACTIONS.MEASURED}/RECORDED`]);
    assert.equal(w.events()[1].metadata.commitment, w.keyCommit);
  } finally { w.cleanup(); }
});

test("K2 · G1 ORDER: at the FIRST key read, the ACCESS event is already on the trail and the witness is EQUAL", () => {
  const w = world();
  try {
    w.run("MEASURE");
    assert.ok(w.reads.length >= 1, "CONTROL: no key byte was read at all");
    assert.deepEqual(w.reads[0].trail, [KEY_ACTIONS.ACCESS], "a key byte was read before its ACCESS event was on the trail");
    assert.equal(w.reads[0].relation, "EQUAL", "a key byte was read before the witness matched the trail");
  } finally { w.cleanup(); }
});

test("K3 · G1 FIRES: no witness · a witness not EQUAL · an ACCESS append that fails → refused, and NO key byte is read", () => {
  const cases = [
    ["WITNESS_UNAVAILABLE", { witness: null }],
    ["WITNESS_NOT_EQUAL", { witness: { status: () => ({ relation: "DIVERGED" }) } }],
  ];
  for (const [want, over] of cases) {
    const w = world();
    try {
      assert.equal(w.code("MEASURE", over), want);
      assert.equal(w.reads.length, 0, `${want}: a key byte was read`);
      assert.ok(w.events().some((e) => e.action === KEY_ACTIONS.MEASURED && e.outcome === "REFUSED" && e.reasonCode === want), `${want}: the refusal was not recorded`);
    } finally { w.cleanup(); }
  }
  const w = world();
  try {
    const failing = { ...w.store, append: () => { throw new Error("disk full"); }, readAll: w.store.readAll };
    assert.equal(w.code("MEASURE", { audit: { store: failing, actor: "t", correlationId: "c", softwareVersion: "t", authorityRef: AUTH.authorityRef, authorityHash: AUTH.authorityHash } }), "ACCESS_NOT_RECORDED");
    assert.equal(w.reads.length, 0, "a key byte was read after the ACCESS append failed");
  } finally { w.cleanup(); }
});

test("K4 · G3 FIRES: incomplete, wider, duplicated and malformed keys are refused — CONTROL: the complete key passes", () => {
  const items = Array.from({ length: 8 }, (_, i) => `zqkey${i}ab`);
  const set = (w) => w; // readability
  const incomplete = world({ rows: items, mutate: (t) => t.split("\n").slice(1).join("\n") });
  const wider = world({ rows: items, extraRows: [{ item: "zqforeign99", classes: [] }] });
  const dup = world({ rows: items, extraRows: [{ item: items[0], classes: [] }] });
  const badClass = world({ rows: items, mutate: (t) => t.replace('"GOAL"', '"NOT_A_CLASS"') });
  const ok = world({ rows: items });
  try {
    assert.equal(set(incomplete).code("MEASURE"), "KEY_NOT_THE_LINKED_SET", "an incomplete key passed");
    assert.equal(wider.code("MEASURE"), "KEY_NOT_THE_LINKED_SET", "a key wider than its set passed");
    assert.equal(dup.code("MEASURE"), "KEY_INPUT_DUPLICATE", "a duplicated row passed");
    assert.equal(badClass.code("MEASURE"), "KEY_INPUT_INCONSISTENT", "a class outside the protocol passed");
    assert.equal(ok.code("MEASURE"), "PASSED", "CONTROL: the complete key was refused");
  } finally { for (const w of [incomplete, wider, dup, badClass, ok]) w.cleanup(); }
});

test("K5 · VERIFY: unregistered → refused BEFORE any read; changed since registration → refused; CONTROL: the registered key passes", () => {
  const unreg = world(), changed = world({ registerKey: "0".repeat(64) }), same = world({ registerKey: "SAME" });
  try {
    assert.equal(unreg.code("VERIFY"), "KEY_UNREGISTERED");
    assert.equal(unreg.reads.length, 0, "an unregistered key was read");
    assert.ok(!unreg.events().some((e) => e.action === KEY_ACTIONS.ACCESS), "an unregistered key's refusal recorded an ACCESS");
    assert.equal(changed.code("VERIFY"), "KEY_CHANGED_SINCE_REGISTRATION");
    assert.equal(same.code("VERIFY"), "PASSED", "CONTROL: the registered, unchanged key was refused");
  } finally { for (const w of [unreg, changed, same]) w.cleanup(); }
});

test("K6 · REAL entry point, confined: with no witness it refuses BEFORE reading (G1 at the bin), and the production trail is unchanged", () => {
  const before = PROD();
  const nonce = `f10kr-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  const env = { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: process.env.NODE_TEST_WORKER_ID || "1", ALMIVISIBILITY_AUDIT_RUN: nonce };
  delete env.ALMIVISIBILITY_SEALED_STORE_F10_KEY;
  try {
    const dry = spawnSync(process.execPath, ["bin/f10-register-key.mjs", "measure", "c6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", env, timeout: 120_000 });
    assert.equal(dry.status, 0);
    assert.match(dry.stdout, /\[dry-run\] nothing is recorded and no key byte is read/);
    const r = spawnSync(process.execPath, ["bin/f10-register-key.mjs", "measure", "c6", "--actor=actor:cc", "--confirm"], { cwd: REPO, encoding: "utf8", env, timeout: 120_000 });
    assert.equal(r.status, 5, `expected a refusal: ${r.stdout.slice(-300)} ${r.stderr.slice(-300)}`);
    assert.match(r.stderr, /KEY C6 MEASURE REFUSED — (SEALED_STORE_UNLOCATED|WITNESS_UNAVAILABLE)/, "the confined run did not refuse before reading");
  } finally { fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true }); }
  assert.deepEqual(PROD(), before, "a confined key-registration run changed the production trail");
});
