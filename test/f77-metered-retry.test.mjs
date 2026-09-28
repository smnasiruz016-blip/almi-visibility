/**
 * 🔴 F77 · R2 — A RETRY IS NOT A NEW COLLECTION (owner ruling RR-82 §2.1, _handoffs a726cc3; F77 Amendment 1, b443e5e).
 *
 * Both sides, proved on the REAL metered call sequence — the production `runIngest`, through the provider seam, with a NON-NETWORKED
 * stand-in provider (no live metered query is ever issued; RR-82 §4):
 *   RETRY (same operation identity, after an interruption or an uncertain outcome) — never reissues a metered query, never repeats a save;
 *   FRESH (a new identity, even over the same date range) — queries again, records a new sighting, every query counted.
 * Plus the entry point end to end through its declared synthetic seam (--source): a retry of a committed operation asks and saves
 * nothing; a fresh operation asks again and records its sighting.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { runIngest } from "../src/search/ingest.mjs";
import { openOperation, parseJournal, journaledProvider, markCommitted, operationClock, OperationRefused } from "../src/search/ingest-operation.mjs";
import { createDryRunStore, createJsonlStore, RESIGHTING_TYPE } from "../src/evidence/store.mjs";
import { censusOf, productionFiles, deferredLimbFaults } from "../tools/paid-metered-call-census.mjs";
import { DEFERRED_LIMBS } from "../config/fboard/deferred-limbs.mjs";
import { pathToFileURL } from "node:url";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { SYNTHETIC_PROPERTY, writeSyntheticSource } from "./support/gsc-synthetic-source.mjs";
/* F02: the entry point decides its tenant first — the end-to-end runs go through a DECLARED FIXTURE WORLD, never the real population. */
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
const NO_NETWORK = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "support", "no-network.mjs")).href;

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailHash = () => createHash("sha256").update(readFileSync(TRAIL)).digest("hex");
const scratch = () => { mkdirSync(join(REPO, ".test-scratch"), { recursive: true }); return mkdtempSync(join(REPO, ".test-scratch", "f77r2-")); };
const PROPERTY = "sc-domain:f77-standin.invalid";

/** The stand-in: the provider interface runIngest takes. Counts every call it answers (each one would count against the quota). */
function standIn({ failAt = null } = {}) {
  let calls = 0;
  const tick = () => { calls += 1; if (failAt !== null && calls === failAt) throw new Error("STAND_IN_CALL_FAILED_UNCERTAIN"); };
  return {
    providerId: "f77-stand-in",
    calls: () => calls,
    async listProperties() { tick(); return [{ propertyId: PROPERTY, permissionLevel: "siteOwner", propertyType: "DOMAIN", authState: "GRANTED" }]; },
    async queryRows({ propertyId, dimensions = [], rowLimitPerRequest = 25000, maxRequests = 20 }) {
      tick();
      const ok = propertyId === PROPERTY;
      return { rows: [], rowCount: 0, requestCount: 1, exhausted: ok, truncationReason: ok ? null : "API_ERROR", dataState: ok ? "COMPLETE" : "UNKNOWN", propertyId, httpStatus: ok ? 200 : 403, rowLimitPerRequest, maxRequests, cost: { provider: "f77-stand-in", apiCalls: 1, amount: 0, currency: "USD", amountState: "ZERO_BY_TARIFF" }, dimensions };
    },
  };
}

/** One ingest operation, as the entry point runs it: open (retry if a journal exists), journal every call, collect, commit, mark. */
async function operate(dir, operationId, provider, { crashAfterSaves = null } = {}) {
  const journalPath = join(dir, "journals", `${operationId}.json`);
  mkdirSync(dirname(journalPath), { recursive: true });
  const op = openOperation({ operationId, existing: existsSync(journalPath) ? parseJournal(readFileSync(journalPath, "utf8")) : null });
  if (op.committed) return { op, skipped: true, issued: 0, replayed: 0, saved: 0 };
  let saves = 0;
  const persist = (bytes) => { saves += 1; writeFileSync(journalPath, bytes); if (crashAfterSaves !== null && saves === crashAfterSaves) throw new Error("PROCESS_DIED_HERE"); };
  const { provider: p, counters } = journaledProvider({ provider, operation: op, persist });
  const storePath = join(dir, "store.jsonl");
  const collector = createDryRunStore(storePath, { mode: op.mode });
  const r = await runIngest({ provider: p, store: collector, propertyId: PROPERTY, estateHostnames: ["f77-standin.invalid"], days: 28, controlProperty: "https://f77-control.invalid/", now: operationClock(op) });
  const toCommit = collector.commitInput();
  const real = createJsonlStore(storePath);
  for (const rec of toCommit) real.appendIfNew(rec, { seenAt: op.startedAt });
  markCommitted(op, persist);
  return { op, issued: counters.issued, replayed: counters.replayed, saved: toCommit.length, alreadySaved: r.alreadySaved };
}
const lines = (dir) => (existsSync(join(dir, "store.jsonl")) ? readFileSync(join(dir, "store.jsonl"), "utf8").trim().split("\n").filter(Boolean) : []);

test("R2 · the REAL metered call sequence of one ingest operation is non-empty and counted", async () => {
  const dir = scratch();
  try {
    const provider = standIn();
    const r = await operate(dir, "f77-seq", provider);
    console.log(`[R2 sequence] metered calls per operation ${provider.calls()} · issued ${r.issued} · replayed ${r.replayed} · records saved ${r.saved}`);
    assert.ok(provider.calls() >= 8, "the population of metered calls is not the real sequence");
    assert.equal(r.issued, provider.calls(), "a metered call bypassed the journal");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R2 · RETRY after an INTERRUPTION reissues no answered query and completes the rest — the total asked equals one operation's sequence", async () => {
  const dir = scratch();
  try {
    const first = standIn();
    // the process dies right after the THIRD call's answer is journaled (saves: ISSUED,ANSWERED × 3 = 6)
    await assert.rejects(operate(dir, "f77-interrupted", first, { crashAfterSaves: 6 }), /PROCESS_DIED_HERE/);
    assert.equal(first.calls(), 3);
    assert.equal(lines(dir).length, 0, "the interrupted operation saved something before its commit");
    const second = standIn();
    const r = await operate(dir, "f77-interrupted", second);
    const whole = standIn(); await operate(scratch(), "f77-reference", whole);
    console.log(`[R2 retry] first process asked ${first.calls()} · retry asked ${second.calls()} · replayed ${r.replayed} · one operation's sequence ${whole.calls()}`);
    assert.equal(r.op.mode, "RETRY");
    assert.equal(r.replayed, 3, "the retry did not replay the answered calls");
    assert.equal(first.calls() + second.calls(), whole.calls(), "a metered query was reissued");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R2 · RETRY after an UNCERTAIN outcome refuses the uncertain query instead of reissuing it", async () => {
  const dir = scratch();
  try {
    const first = standIn({ failAt: 4 });
    await assert.rejects(operate(dir, "f77-uncertain", first), /STAND_IN_CALL_FAILED_UNCERTAIN/);
    const second = standIn();
    await assert.rejects(operate(dir, "f77-uncertain", second), (e) => e instanceof OperationRefused && e.code === "UNCERTAIN_METERED_QUERY");
    assert.equal(second.calls(), 0, "the retry reissued a query — it may already have counted against the quota");
    assert.equal(lines(dir).length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R2 · RETRY after the evidence was committed (the mark never written) asks nothing and saves nothing twice", async () => {
  const dir = scratch();
  try {
    await operate(dir, "f77-committed", standIn());
    const held = lines(dir);
    // the process died after the commit and before the journal was marked: un-mark it, as that crash would leave it
    const jp = join(dir, "journals", "f77-committed.json");
    const j = JSON.parse(readFileSync(jp, "utf8")); j.committed = false; writeFileSync(jp, JSON.stringify(j));
    const again = standIn();
    const r = await operate(dir, "f77-committed", again);
    console.log(`[R2 retry-after-commit] asked ${again.calls()} · replayed ${r.replayed} · already saved ${r.alreadySaved} · saved again ${r.saved}`);
    assert.equal(again.calls(), 0, "a metered query was reissued");
    assert.equal(r.saved, 0, "a save was repeated");
    assert.deepEqual(lines(dir), held, "the store changed");
    // and once marked, a retry does not even open the provider
    const third = standIn();
    assert.equal((await operate(dir, "f77-committed", third)).skipped, true);
    assert.equal(third.calls(), 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R2 · a FRESH collection over the SAME date range queries again, counts every query, and records a new sighting", async () => {
  const dir = scratch();
  try {
    await operate(dir, "f77-first", standIn());
    const before = lines(dir);
    const fresh = standIn();
    const r = await operate(dir, "f77-second", fresh);
    const after = lines(dir).map((l) => JSON.parse(l));
    const newSightings = after.slice(before.length).filter((x) => x.record_type === RESIGHTING_TYPE);
    console.log(`[R2 fresh] asked ${fresh.calls()} · issued ${r.issued} · new sightings recorded ${newSightings.length}`);
    assert.equal(r.op.mode, "FRESH");
    assert.ok(fresh.calls() >= 8 && r.issued === fresh.calls(), "a fresh collection did not query again, or a query went uncounted");
    assert.ok(newSightings.length > 0, "a fresh collection recorded no new sighting");
    assert.ok(newSightings.every((x) => x.seen_at === r.op.startedAt), "the sighting is not the fresh operation's");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R2 · END TO END through the entry point's declared synthetic seam: retry of a committed operation asks and saves nothing; a fresh one asks again", () => {
  const trailBefore = trailHash();
  const dir = scratch();
  try {
    const src = writeSyntheticSource(REPO, "f77-gsc-source-");
    const source = src.file;
    const store = join(dir, "store.jsonl");
    const bin = (op) => spawnSync(process.execPath, WORLD.argv(["--import", NO_NETWORK, "bin/gsc-ingest.mjs", `--property=${SYNTHETIC_PROPERTY}`, `--source=${source}`, `--store=${store}`, `--operation=${op}`, "--confirm"]), { cwd: REPO, encoding: "utf8", timeout: 120000, maxBuffer: 64 * 1024 * 1024, env: WORLD.envWith({ ...process.env, GSC_SERVICE_ACCOUNT_KEY_FILE: "" }) });
    const a = bin("f77-e2e-one");
    assert.equal(a.status, 0, a.stderr);
    assert.match(a.stdout, /operation f77-e2e-one \(FRESH\): metered calls issued (\d+) · replayed from the journal 0/);
    const held = readFileSync(store, "utf8");
    const b = bin("f77-e2e-one");
    assert.equal(b.status, 0, b.stderr);
    assert.match(b.stdout, /operation f77-e2e-one: ALREADY COMMITTED — a retry issues no metered query and saves nothing\./);
    assert.equal(readFileSync(store, "utf8"), held, "the retry changed the store");
    const c = bin("f77-e2e-two");
    assert.equal(c.status, 0, c.stderr);
    assert.match(c.stdout, /operation f77-e2e-two \(FRESH\): metered calls issued [1-9]\d* /);
    assert.ok(readFileSync(store, "utf8").length > held.length, "the fresh collection recorded no new sighting");
    assert.deepEqual(readdirSync(join(dir, "store.jsonl.operations")).sort(), ["f77-e2e-one.json", "f77-e2e-two.json"]);
    assert.doesNotMatch(a.stderr + b.stderr + c.stderr, /\[no-network\] refused/, "a synthetic run asked for the network");
    rmSync(src.dir, { recursive: true, force: true });
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.equal(trailHash(), trailBefore, "the production trail changed");
});

test("R2P · the paid limb stands NOT MEASURED, and the REOPENING TRIGGER fails the moment a real paid provider is declared", () => {
  const f77 = DEFERRED_LIMBS.find((d) => d.featureId === "F77" && d.limb === "R2P");
  assert.ok(f77, "F77's paid limb is not declared deferred");
  assert.equal(f77.state, "NOT_MEASURED");
  assert.match(f77.scopeSentence, /does not cover any paid provider/);
  const real = censusOf(productionFiles());
  console.log(`[R2P] real paid providers ${real.realPaidProviders} · population ${real.population} · bound ${real.bound} · trigger faults ${deferredLimbFaults(real).length}`);
  assert.deepEqual(deferredLimbFaults(real), [], "the trigger fires on today's tree");
  // FIRING CONTROL — a planted real paid provider trips the trigger by name
  const planted = censusOf({ "bin/planted.mjs": "createPaidProviderGate({ providers: { p: realProvider } })" });
  const faults = deferredLimbFaults(planted);
  assert.deepEqual(faults.map((f) => `${f.code} ${f.featureId} ${f.limb}`), ["DEFERRED_LIMB_REOPEN_REQUIRED F77 R2P"]);
  // CONTROL — once the limb is no longer NOT MEASURED (a real paid-path proof exists), the same provider no longer trips it
  assert.deepEqual(deferredLimbFaults(planted, [{ ...f77, state: "PROVED" }]), []);
});
