/**
 * 🔴 F08 §6 · THE TWO SHARED GUARDS AUDIT THEIR OWN DECISIONS — ONCE, METADATA ONLY, NEVER WITHOUT A SINK.
 *
 * Every branch of `readUnsealed` and `observedDataExemption` is driven here with a synthetic registry and a counted
 * `read`, so "the sealed resource was never opened" and "no payload entered the event" are measured, not asserted.
 * The durable case writes to the CONFINED store a verified test context resolves — never the production trail, whose
 * bytes are hashed around this file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { readUnsealed, SealedPathRefused } from "../src/governance/sealed-paths.mjs";
import { observedDataExemption, contentHashOf } from "../src/governance/evidence-roles.mjs";
import { diagnosticGuardSink, durableGuardSink, guardAuthority, requireGuardSink, resourceRef, GUARD_METADATA_KEYS, GUARD_AUTHORITY } from "../src/governance/guard-audit.mjs";
import { governedGuardSink, resolveAuditStoreLocation } from "../src/governance/governed-run.mjs";
import { guardEmitsOnEveryDecision } from "../tools/decision-site-census.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => (existsSync(p) ? sha(readFileSync(p)) : "ABSENT"));
const PROD_BEFORE = prodHashes();

/* A synthetic registry: one sealed prefix, one observed file, one marking key beside a second observed file. */
const SEALED_PREFIX = "zz-sealed-area/";
const SEALED_PATH = `${SEALED_PREFIX}inner/secret-name-7c1f.json`;
const PAYLOAD = "PAYLOAD-SENTINEL-4f0e-never-in-the-trail";
const base = { scope: "t", source: "t", provenance: "t", capturedAt: "2026-09-23", retiredReason: null, mandatoryReadable: false, mayTrain: false, mayEvaluate: false, maySupplyExpectedAnswer: false, sealed: false };
const REG = [
  { ...base, id: "sealed:zz", role: "SEALED", resource: { root: "t", pathPrefixes: [SEALED_PREFIX] }, contentHash: null, sealed: true },
  { ...base, id: "observed:ok", role: "OBSERVED_DATA", resource: { root: "t", path: "data/observed.jsonl" }, contentHash: contentHashOf(PAYLOAD) },
  { ...base, id: "observed:beside-key", role: "OBSERVED_DATA", resource: { root: "t", path: "keyed/observed.jsonl" }, contentHash: contentHashOf(PAYLOAD) },
  { ...base, id: "key:beside", role: "MARKING_KEY", resource: { root: "t", path: "keyed/key.json" }, contentHash: "a".repeat(64), sealed: true },
  { ...base, id: "odd:role", role: "MADE_UP_ROLE", resource: { root: "t", path: "data/odd.jsonl" }, contentHash: contentHashOf(PAYLOAD) },
];
const counted = () => { const c = { n: 0 }; c.read = () => { c.n += 1; return PAYLOAD; }; return c; };
const leaks = (events, ...needles) => needles.filter((s) => JSON.stringify(events).includes(s));

test("G1 · no sink, no decision — BOTH guards refuse before anything is read (GUARD_AUDIT_SINK_ABSENT)", () => {
  for (const path of [SEALED_PATH, "data/observed.jsonl"]) {
    const c = counted();
    assert.throws(() => readUnsealed({ registry: REG, root: "t", base: "/nowhere", path, read: c.read }), { code: "GUARD_AUDIT_SINK_ABSENT" });
    assert.throws(() => observedDataExemption({ registry: REG, root: "t", path, read: c.read }), { code: "GUARD_AUDIT_SINK_ABSENT" });
    assert.equal(c.n, 0, `${path} was read by a guard that had no audit sink`);
  }
  // control: a sink that is an object without emit() is not a sink
  assert.throws(() => requireGuardSink({ emitted: 0 }, "x"), { code: "GUARD_AUDIT_SINK_ABSENT" });
});

test("G2 · P19 · a SEALED refusal emits EXACTLY ONE metadata-only event, reads nothing, and carries no path, name or payload", () => {
  const sink = diagnosticGuardSink({ actor: "test" });
  const c = counted();
  assert.throws(() => readUnsealed({ registry: REG, root: "t", base: "/nowhere", path: SEALED_PATH, read: c.read, audit: sink }), (e) => e instanceof SealedPathRefused);
  assert.equal(c.n, 0, "the sealed resource was opened");
  assert.equal(sink.events.length, 1, "one refusal, one event");
  const [ev] = sink.events;
  assert.deepEqual([ev.eventType, ev.action, ev.outcome, ev.reasonCode], ["REFUSAL", "READ_SEALED_PATH", "REFUSED", "SEALED_PATH_REFUSED"]);
  assert.deepEqual(Object.keys(ev.metadata).filter((k) => k !== "family").sort(), ["classification", "guard", "root", "ruleEntry"]);
  assert.equal(ev.metadata.ruleEntry, "sealed:zz");
  assert.deepEqual(leaks(sink.events, SEALED_PATH, "secret-name-7c1f", "inner/", PAYLOAD), [], "sealed path material or payload entered the event");
  // control: the leak check CAN see the path when it is there
  assert.deepEqual(leaks([{ x: SEALED_PATH }], SEALED_PATH), [SEALED_PATH]);
});

test("G3 · a PERMITTED unsealed read behaves exactly as before — it returns the bytes and emits NOTHING", () => {
  const sink = diagnosticGuardSink({ actor: "test" });
  const c = counted();
  assert.equal(readUnsealed({ registry: REG, root: "t", base: "/b", path: "data/observed.jsonl", read: c.read, audit: sink }), PAYLOAD);
  assert.equal(c.n, 1);
  assert.equal(sink.events.length, 0, "a permitted read was audited as if it were a refusal");
});

test("G4 · a failed emission FAILS CLOSED — the refusal still stands and the sealed resource is still never read", () => {
  const broken = { emit: () => { throw new Error("the audit store is unavailable"); } };
  const c = counted();
  assert.throws(() => readUnsealed({ registry: REG, root: "t", base: "/b", path: SEALED_PATH, read: c.read, audit: broken }), /the audit store is unavailable/);
  assert.equal(c.n, 0);
  assert.throws(() => observedDataExemption({ registry: REG, root: "t", path: "data/observed.jsonl", read: c.read, audit: broken }), /the audit store is unavailable/,
    "an ALLOWED decision was returned although it could not be audited");
});

test("G5 · P20 · every role decision — the ALLOWED one and all SEVEN refusals — emits exactly one event, and no payload or path", () => {
  const cases = [
    ["data/observed.jsonl", {}, "REGISTERED_OBSERVED_DATA", "ALLOWED"],
    ["data/unregistered.jsonl", {}, "UNREGISTERED", "REFUSED"],
    ["keyed/key.json", {}, "NOT_OBSERVED_DATA", "REFUSED"],
    ["data/observed.jsonl", { read: () => "CHANGED BYTES" }, "HASH_MISMATCH", "REFUSED"],
    ["data/observed.jsonl", { reg: REG.map((e) => (e.id === "observed:ok" ? { ...e, maySupplyExpectedAnswer: true } : e)) }, "MAY_SUPPLY_EXPECTED_ANSWER", "REFUSED"],
    ["data/observed.jsonl", { reg: REG.map((e) => (e.id === "observed:ok" ? { ...e, mandatoryReadable: true } : e)) }, "MANDATORY_READING", "REFUSED"],
    ["data/observed.jsonl", { evaluatorSources: ["reads data/observed.jsonl here"] }, "IMPORTED_BY_HELD_OUT_EVALUATOR", "REFUSED"],
    ["keyed/observed.jsonl", {}, "EXPECTED_LABEL_ALONGSIDE", "REFUSED"],
  ];
  const all = [];
  for (const [path, o, code, outcome] of cases) {
    const sink = diagnosticGuardSink({ actor: "test" });
    const r = observedDataExemption({ registry: o.reg ?? REG, root: "t", path, read: o.read ?? (() => PAYLOAD), evaluatorSources: o.evaluatorSources ?? [], audit: sink });
    assert.equal(r.code, code);
    assert.equal(sink.events.length, 1, `${code}: ${sink.events.length} events for one decision`);
    const [ev] = sink.events;
    assert.deepEqual([ev.eventType, ev.outcome, ev.reasonCode], ["EVIDENCE_ROLE_DECISION", outcome, code]);
    assert.equal(ev.metadata.resourceRef, resourceRef("t", path));
    assert.match(ev.metadata.resourceRef, /^[0-9a-f]{16}$/);
    for (const k of Object.keys(ev.metadata)) assert.ok(k === "family" || GUARD_METADATA_KEYS.includes(k), `${code}: undeclared metadata key ${k}`);
    all.push(...sink.events);
  }
  assert.equal(all.length, cases.length);
  assert.deepEqual(leaks(all, PAYLOAD, "CHANGED BYTES", "data/observed.jsonl", "keyed/observed.jsonl", "reads data"), [], "payload or path entered a role event");
  assert.deepEqual(new Set(all.map((e) => e.outcome)), new Set(["ALLOWED", "REFUSED"]), "both allowed and refused decisions must be traced");
});

test("G6 · an UNKNOWN role FAILS CLOSED, and is traced", () => {
  const sink = diagnosticGuardSink({ actor: "test" });
  const r = observedDataExemption({ registry: REG, root: "t", path: "data/odd.jsonl", read: () => PAYLOAD, audit: sink });
  assert.equal(r.exempt, false);
  assert.equal(r.code, "NOT_OBSERVED_DATA");
  assert.equal(sink.events[0].metadata.role, "MADE_UP_ROLE");
  assert.equal(sink.events[0].outcome, "REFUSED");
});

test("G7 · the metadata-only rule is ENFORCED by the sink — a decision carrying a path or a body is refused, and emits nothing", () => {
  for (const sink of [diagnosticGuardSink({ actor: "test" }), durableGuardSink({ store: { append: () => { throw new Error("must not be reached"); } }, actor: "t", softwareVersion: "v", correlationId: "c", authorityRef: {}, authorityHash: "d".repeat(64) })]) {
    assert.throws(() => sink.emit({ eventType: "REFUSAL", action: "A", outcome: "REFUSED", reasonCode: "R", metadata: { guard: "g", path: SEALED_PATH } }), /GUARD_EVENT_NOT_METADATA_ONLY/);
    assert.throws(() => sink.emit({ eventType: "REFUSAL", action: "A", outcome: "REFUSED", reasonCode: "R", metadata: { guard: "g", body: PAYLOAD } }), /GUARD_EVENT_NOT_METADATA_ONLY/);
  }
});

test("G8 · tenant and subject never leak — every guard event is GLOBAL_PRODUCT, names no tenant or subject, and carries no evidence reference to join", () => {
  const sink = diagnosticGuardSink({ actor: "test" });
  assert.throws(() => readUnsealed({ registry: REG, root: "t", base: "/b", path: SEALED_PATH, read: () => "", audit: sink }));
  observedDataExemption({ registry: REG, root: "t", path: "data/observed.jsonl", read: () => PAYLOAD, audit: sink });
  for (const e of sink.events) {
    assert.equal(e.scopeType, "GLOBAL_PRODUCT");
    assert.equal(e.tenantId, null);
    assert.equal(e.subjectId, null);
    assert.deepEqual(e.evidenceRefs, []);
  }
});

test("G9 · DURABLE inside a governed run: the refusal is appended to the CONFINED store, validated by it, and the production trail is untouched", () => {
  const now = isoSeconds(Date.now());
  const loc = resolveAuditStoreLocation({ repo: REPO });
  assert.equal(loc.synthetic, true, "this test is not running inside a verified test context — it would write production");
  const sink = governedGuardSink({ repo: REPO, correlationId: `run:shared-guard-test:${now}:${process.pid}`, now: now.slice(0, 10), actor: "test/shared-guard-audit.test.mjs" });
  assert.equal(sink.durable, true);
  const before = existsSync(loc.eventsPath) ? readFileSync(loc.eventsPath, "utf8").trim().split("\n").filter(Boolean).length : 0;
  assert.throws(() => readUnsealed({ registry: REG, root: "t", base: "/b", path: SEALED_PATH, read: () => { throw new Error("READ"); }, audit: sink }), (e) => e instanceof SealedPathRefused);
  const lines = readFileSync(loc.eventsPath, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(lines.length, before + 1, "one refusal did not append exactly one event");
  const ev = JSON.parse(lines.at(-1));
  assert.equal(ev.reasonCode, "SEALED_PATH_REFUSED");
  assert.match(ev.recordedAt, /Z$/);
  assert.match(ev.occurredAt, /Z$/);
  assert.equal(ev.authorityRef.propositionId, GUARD_AUTHORITY.propositionId);
  assert.match(ev.authorityHash, /^[0-9a-f]{64}$/);
  assert.match(ev.softwareVersion, /^engine:[0-9a-f]{40}/);
  assert.equal(ev.metadata.evidenceClass, "SYNTHETIC_TEST_FIXTURE", "a test's guard event could be counted as real evidence");
  assert.deepEqual(leaks([ev], SEALED_PATH, "secret-name-7c1f"), []);
  assert.deepEqual(prodHashes(), PROD_BEFORE, "the production trail changed");
});

test("G10 · the guards' authority resolves LIVE and fails closed — an unknown proposition is refused, not defaulted", () => {
  const a = guardAuthority({ now: "2026-09-23" });
  assert.match(a.authorityHash, /^[0-9a-f]{64}$/);
  assert.throws(() => guardAuthority({ now: "2026-09-23", records: [] }), /GUARD_AUTHORITY_UNRESOLVED/);
});

test("G11 · the decision-site census READS the emission out of each guard's source — and each mutation of it turns the reading false", () => {
  assert.equal(guardEmitsOnEveryDecision("src/governance/sealed-paths.mjs", "readUnsealed").ok, true);
  assert.equal(guardEmitsOnEveryDecision("src/governance/evidence-roles.mjs", "observedDataExemption").ok, true);
  const sealedSrc = readFileSync(join(REPO, "src/governance/sealed-paths.mjs"), "utf8");
  const roleSrc = readFileSync(join(REPO, "src/governance/evidence-roles.mjs"), "utf8");
  const mutate = (src, from, to) => { assert.equal(src.split(from).length, 2, `anchor ${from} not unique`); return src.replace(from, to); };
  const controls = [
    ["sink not required", mutate(sealedSrc, '  requireGuardSink(audit, "readUnsealed");\n', ""), "readUnsealed", /requireGuardSink/],
    ["refusal thrown without emitting", mutate(sealedSrc, "    audit.emit({", "    void ({"), "readUnsealed", /no audit\.emit\(/],
    ["one exit bypasses the emitting exit", mutate(roleSrc, 'if (!e) return decided({ exempt: false, code: "UNREGISTERED"', 'if (!e) return ({ exempt: false, code: "UNREGISTERED"'), "observedDataExemption", /bypass the emitting exit/],
    ["the emitting exit does not emit", mutate(roleSrc, "  const decided = (result, entry = null) => {\n    audit.emit({", "  const decided = (result, entry = null) => {\n    void ({"), "observedDataExemption", /does not emit/],
  ];
  for (const [label, text, fn, why] of controls) {
    const r = guardEmitsOnEveryDecision("x", fn, { text });
    assert.equal(r.ok, false, `${label}: the census still read the guard as audited`);
    assert.match(r.why, why, `${label}: wrong reason — ${r.why}`);
  }
});

test("G12 · the production audit trail is byte-identical after this file", () => {
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
