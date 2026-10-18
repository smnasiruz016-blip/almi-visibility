/**
 * F87 · OPERATIONAL MONITORING ALERTS AND RECOVERY — one client project's own operations (acceptance _handoffs
 * AlmiVisibility_F87_ACCEPTANCE_2026-10-17.md; scope by beta-g decision B of 18 Oct 2026, RR-284).
 *
 * Firing controls on fixed records; REAL over the engine's audit trail and the declared batch's facts and reads; C4 and C5 on a SCRATCH
 * copy of the batch, never the real one. Nothing fetched or sent; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync, appendFileSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { failedRuns, staleFacts, blockedSources, damageOf, partialOutputs, recoveryPlan, applyRecovery, recordCount, operationsReport, PARTIAL, RECOVERY_REFUSAL, SIDECAR } from "../src/ops/project-operations.mjs";
import { SAGA, ALERT_SENDING } from "../src/ops/watchman.mjs";
import { batchFacts } from "../src/facts/batch-facts.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const T = "tenant:t1";
const ev = (o) => ({ eventId: o.id, occurredAt: "2026-10-01T00:00:00Z", eventType: o.type ?? "GOVERNED_WRITE", action: "A", outcome: o.outcome, reasonCode: o.reason ?? null, tenantId: o.tenant === undefined ? T : o.tenant, metadata: o.meta ?? {} });

test("C1 · FAILED JOBS · FIRING CONTROL: every refused or failed run of the project is listed with its reason; the count equals the trail's; another project's and the engine's own are not listed", () => {
  const events = [ev({ id: "1", outcome: "REFUSED", reason: "R1" }), ev({ id: "2", outcome: "FAILED", reason: "R2" }), ev({ id: "3", outcome: "APPLIED" }), ev({ id: "4", outcome: "REFUSED", tenant: "tenant:other" }), ev({ id: "5", outcome: "REFUSED", tenant: null }), ev({ id: "6", outcome: "INVALID", reason: "R6" })];
  const r = failedRuns(events, { tenantId: T });
  assert.deepEqual(r.listed.map((x) => [x.eventId, x.reason]), [["1", "R1"], ["2", "R2"], ["6", "R6"]]);
  assert.equal(r.inTrail, 3);
  assert.equal(r.engineOwn, 1);
});

const fact = (id, readOn, recheckDays) => ({ factId: id, readOn, recheckDays, pages: ["p"] });
test("C2 · STALE EVIDENCE · FIRING CONTROL: a fact past its own interval is listed; one not yet due is not; a CURRENT recheck moves the read date; a missing interval is NOT MEASURED", () => {
  const facts = [fact("due", "2026-10-01", 7), fact("notyet", "2026-10-10", 7), fact("rechecked", "2026-10-01", 7), fact("noint", "2026-10-01", null)];
  const r = staleFacts(facts, { on: "2026-10-12", rechecks: [{ factId: "rechecked", state: "CURRENT", recorded_at: "2026-10-09T00:00:00Z" }, { factId: "due", state: "REJECTED", recorded_at: "2026-10-11T00:00:00Z" }] });
  assert.deepEqual(r.stale.map((f) => f.factId), ["due"]);
  assert.equal(r.current, 2);
  assert.deepEqual(r.notMeasured.map((f) => f.factId), ["noint"]);
});

const read = (url, state, readOn, reason) => ({ record_type: "source_page_read", url, host: new URL(url).host, state, readOn, ...(reason ? { reason } : {}) });
test("C3 · UNAVAILABLE SOURCES · FIRING CONTROL: a source BLOCKED in its latest read is listed with its reason; one read since is not", () => {
  const r = blockedSources([read("https://a.example/x", "BLOCKED", "2026-10-01", "CHALLENGE"), read("https://a.example/x", "READ", "2026-10-02"), read("https://b.example/y", "READ", "2026-10-01"), read("https://b.example/y", "BLOCKED", "2026-10-03", "NOT_FOUND"), { record_type: "cost_entry", url: "https://c.example/" }]);
  assert.deepEqual(r.blocked.map((s) => [s.url, s.reason]), [["https://b.example/y", "NOT_FOUND"]]);
  assert.equal(r.sources, 2);
});

const scratch = () => mkdtempSync(join(tmpdir(), "f87-"));
test("C4 · PARTIAL OUTPUTS · FIRING CONTROL: a store left half-written and a write begun and never finished are detected; whole stores and finished writes are not", () => {
  assert.equal(damageOf("a.jsonl", '{"a":1}\n{"b":2}\n'), null);
  assert.equal(damageOf("a.jsonl", '{"a":1}\n{"b":'), PARTIAL.NO_LINE_END);
  assert.equal(damageOf("a.jsonl", '{"a":1}\n{"b":\n{"c":3}\n'), PARTIAL.LINE_UNREADABLE);
  assert.equal(damageOf("a.json", '{"a":'), PARTIAL.JSON_UNREADABLE);
  const d = scratch();
  try {
    writeFileSync(join(d, "whole.jsonl"), '{"a":1}\n'); writeFileSync(join(d, "half.jsonl"), '{"a":1}\n{"a":');
    const w = (k, phase) => ev({ id: k + phase, outcome: "ALLOWED", meta: { governedWriteKey: k, governedWritePhase: phase } });
    const events = [w("k1", SAGA.ATTEMPTED), w("k1", SAGA.COMMITTED), w("k2", SAGA.ATTEMPTED), { ...w("k3", SAGA.ATTEMPTED), tenantId: "tenant:other" }];
    const p = partialOutputs({ dir: d, events, tenantId: T });
    assert.deepEqual(p.halfWritten.map((x) => [x.file, x.state]), [["half.jsonl", PARTIAL.NO_LINE_END]]);
    assert.deepEqual(p.neverFinished.map((x) => x.eventId), ["k2ATTEMPTED"]);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("C5 · RECOVERY WITHOUT LOSS · FIRING CONTROL: only the half-written store is touched, every whole record kept, the broken tail moved beside it — nothing deleted; the real store is refused", () => {
  const d = scratch();
  try {
    writeFileSync(join(d, "whole.jsonl"), '{"a":1}\n'); writeFileSync(join(d, "half.jsonl"), '{"a":1}\n{"a":2}\n{"a":');
    const wholeBefore = readFileSync(join(d, "whole.jsonl"));
    const plan = recoveryPlan({ dir: d, real: [join(d, "..", "not-it")] });
    const r = applyRecovery(plan, { write: (p, t) => writeFileSync(p, t) });
    assert.deepEqual(r.rerun.map((x) => x.file), ["half.jsonl"], "recovery re-runs something that did not fail, or misses what did");
    assert.ok(r.after >= r.before, "recovery left fewer records than before");
    assert.equal(readFileSync(join(d, "half.jsonl"), "utf8"), '{"a":1}\n{"a":2}\n');
    assert.equal(readFileSync(join(d, "half.jsonl" + SIDECAR), "utf8"), '{"a":\n', "the broken tail was not kept beside the store");
    assert.ok(readFileSync(join(d, "whole.jsonl")).equals(wholeBefore), "a whole store was rewritten");
    assert.deepEqual(partialOutputs({ dir: d, tenantId: T }).halfWritten, [], "the store is still half-written after recovery");
    assert.equal(recoveryPlan({ dir: d, real: [d] }).refused, RECOVERY_REFUSAL.NOT_A_SCRATCH_COPY, "recovery ran on the real store");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("C6 · ALERT · FIRING CONTROL: the report names every part with its count and says nothing is sent", () => {
  const t = operationsReport({ subject: "s", on: "2026-10-18", runs: { inTrail: 1, engineOwn: 0, listed: [{ occurredAt: "x", eventType: "E", action: "A", outcome: "REFUSED", reason: "R" }] }, facts: { stale: [], current: 1, notMeasured: [], of: 1 }, sources: { blocked: [{ url: "https://a.example/", reason: "CHALLENGE" }], sources: 1 }, partial: { halfWritten: [], neverFinished: [], files: 2 } });
  for (const s of ["1. FAILED OR REFUSED RUNS OF THIS PROJECT: 1", "REFUSED — R", "2. FACTS PAST THEIR OWN RECHECK INTERVAL: 0 of 1", "3. SOURCES BLOCKED IN THEIR LATEST READ: 1 of 1", "CHALLENGE", "4. PARTIAL OUTPUTS: stores half-written 0 of 2", ALERT_SENDING]) assert.ok(t.includes(s), `the report lacks: ${s}`);
});

/* ── REAL ── */
const index = rootIndexFor(process.env);
const BATCH = join(lookupStore(index, "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const TENANT = "tenant:93b991d5afa33b16ccb9166b249593b6";
const HERE = existsSync(join(BATCH, "source-reads.jsonl")) && existsSync(TRAIL);
const json = (f) => JSON.parse(readFileSync(join(BATCH, f), "utf8"));
const rows = (f) => readFileSync(join(BATCH, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const trailEvents = () => readFileSync(TRAIL, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const realFacts = () => batchFacts({ drafts: json("page-drafts.json"), findings: json("findings.json"), registry: json(readdirSync(BATCH).find((f) => /^facts-registry-\d{4}-\d{2}-\d{2}\.json$/.test(f))), intervals: json("recheck-intervals.json") });
const SKIP = HERE ? false : "the declared batch or the audit trail is not on this machine";

test("REAL · C1: the project's failed or refused runs on the real trail — the count listed equals the trail's, each with its reason", { skip: SKIP }, () => {
  const events = trailEvents();
  const r = failedRuns(events, { tenantId: TENANT });
  const inTrail = events.filter((e) => e.tenantId === TENANT && ["REFUSED", "FAILED", "INVALID", "ERROR"].includes(e.outcome)).length;
  assert.ok(inTrail > 0, "an empty population proves nothing");
  assert.equal(r.listed.length, inTrail);
  assert.ok(r.listed.every((x) => typeof x.reason === "string" && x.reason !== ""), "a failed run is listed without its reason");
  console.log(`  REAL (count-only): this project's failed or refused runs ${r.listed.length} = the trail's ${inTrail} · the engine's own (no project) ${r.engineOwn}, not listed`);
});

test("REAL · C2: on a stated date the batch's 7-day fee facts appear once due, and never before", { skip: SKIP }, () => {
  const facts = realFacts(), rechecks = rows("fact-rechecks.jsonl");
  const weekly = facts.filter((f) => f.recheckDays === 7);
  assert.ok(weekly.length > 0, "no 7-day fact in the batch");
  const due = (on) => staleFacts(facts, { on, rechecks }).stale.map((f) => f.factId);
  const plus = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  /* each fact's own read date: its registry date, moved by its latest kept recheck that found the source CURRENT (computed here, apart) */
  const readOf = (f) => rechecks.filter((r) => r.factId === f.factId && r.state === "CURRENT").map((r) => r.recorded_at.slice(0, 10)).concat(f.readOn).sort().at(-1);
  let moved = 0;
  for (const f of weekly) {
    const r = readOf(f); if (r !== f.readOn) moved += 1;
    assert.ok(!due(plus(r, 6)).includes(f.factId), `${f.factId} is listed before it is due`);
    assert.ok(due(plus(r, 7)).includes(f.factId), `${f.factId} is not listed once due`);
  }
  const on = plus(weekly.map(readOf).sort()[0], 7);
  for (const id of due(on)) { const f = facts.find((x) => x.factId === id); assert.ok(Date.parse(`${on}T00:00:00Z`) - Date.parse(`${readOf(f)}T00:00:00Z`) >= f.recheckDays * 86400000, `${id} was listed but not due`); }
  console.log(`  REAL (count-only): facts ${facts.length} · 7-day facts ${weekly.length} (read date moved by a CURRENT recheck ${moved}) · each listed on its day 7, none on its day 6`);
});

test("REAL · C3: the sources BLOCKED in their latest read are listed with their reasons — ECFMG, VCI and AHPRA's web page among them", { skip: SKIP }, () => {
  const r = blockedSources(rows("source-reads.jsonl"));
  const hosts = r.blocked.map((s) => s.host);
  for (const h of ["www.ecfmg.org", "www.vci.ie", "www.ahpra.gov.au"]) assert.ok(hosts.includes(h), `${h} is not listed`);
  assert.ok(r.blocked.every((s) => typeof s.reason === "string"), "a blocked source carries no reason");
  console.log(`  REAL (count-only): sources ${r.sources} · blocked in their latest read ${r.blocked.length}`);
});

test("REAL · C4 + C5 on a SCRATCH copy of the batch: a planted half-written store is flagged and recovered — records before ≤ after, every other store byte-identical, the real batch and trail untouched", { skip: SKIP }, () => {
  const d = scratch(), copy = join(d, "batch");
  const realSha = createHash("sha256").update(readFileSync(join(BATCH, "fact-rechecks.jsonl"))).digest("hex");
  try {
    cpSync(BATCH, copy, { recursive: true });
    assert.deepEqual(partialOutputs({ dir: copy, tenantId: TENANT }).halfWritten, [], "the real batch is already half-written");
    appendFileSync(join(copy, "fact-rechecks.jsonl"), '{"record_type":"fact_recheck","factId":"half');
    const flagged = partialOutputs({ dir: copy, tenantId: TENANT }).halfWritten;
    assert.deepEqual(flagged.map((x) => x.file), ["fact-rechecks.jsonl"], "the planted half-written store is not flagged");
    const others = readdirSync(copy).filter((f) => /\.jsonl?$/.test(f) && f !== "fact-rechecks.jsonl").map((f) => [f, createHash("sha256").update(readFileSync(join(copy, f))).digest("hex")]);
    const r = applyRecovery(recoveryPlan({ dir: copy, real: [BATCH] }), { write: (p, t) => writeFileSync(p, t) });
    assert.ok(r.after >= r.before, "recovery lost records");
    assert.deepEqual(r.rerun.map((x) => x.file), ["fact-rechecks.jsonl"]);
    for (const [f, h] of others) assert.equal(createHash("sha256").update(readFileSync(join(copy, f))).digest("hex"), h, `${f} was touched`);
    assert.equal(createHash("sha256").update(readFileSync(join(copy, "fact-rechecks.jsonl"))).digest("hex"), realSha, "the recovered store differs from the whole one");
    assert.equal(createHash("sha256").update(readFileSync(join(BATCH, "fact-rechecks.jsonl"))).digest("hex"), realSha, "the real batch was touched");
    console.log(`  REAL (count-only, scratch copy): stores ${others.length + 1} · flagged 1 · records before ${r.before} → after ${r.after} · other stores unchanged ${others.length}`);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("ENTRY · bin/project-operations.mjs: a call with no stated date is a usage exit before anything is read or recorded", () => {
  const r = spawnSync(process.execPath, ["bin/project-operations.mjs", "--subject=s", "--research-batch=b"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /the date is stated/);
});

test("the monitor names no product and loads no module that can make a network, process, connector or paid call — and each control fires", () => {
  const F = "src/ops/project-operations.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the read rules held in the monitor are the source reader's own — they cannot drift apart unseen", async () => {
  const SR = await import("../src/facts/source-reader.mjs");
  const P = await import("../src/ops/project-operations.mjs");
  assert.equal(P.SOURCE_READ_RECORD, SR.SOURCE_READ_RECORD);
  assert.equal(P.BLOCKED, SR.READ_STATE.BLOCKED);
  for (const [f, on] of [[{ readOn: "2026-10-01", recheckDays: 7 }, "2026-10-08"], [{ readOn: "2026-10-01", recheckDays: 7 }, "2026-10-07"], [{ readOn: null, recheckDays: 7 }, "2026-10-08"], [{ readOn: "2026-10-01", recheckDays: 0 }, "2026-10-08"]]) assert.equal(P.dueOn(f, on), SR.dueOn(f, on));
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
