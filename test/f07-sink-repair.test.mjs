/**
 * 🔴 F07/F08 SINK REPAIR — the durable / diagnostic line, DERIVED (owner ruling, 23 September 2026, option b).
 *
 *   Nobody requested the material  -> CLASSIFICATION -> kept by the run, not appended.
 *   Something tried to obtain it (granted or refused) -> ACCESS -> durable, always.
 *   A contamination finding -> VIOLATION -> durable.  A governed change -> GOVERNED_CHANGE -> durable.
 *
 * The zero (a clean run appends nothing) and the +1s (a refusal, a violation, an authorised access) are proved as a
 * MATCHED PAIR ON ONE MECHANISM: the in-process cases drive ONE sink object — built exactly as bin/heldout-firewall.mjs
 * builds it (governedGuardSink, the bin's own actor) — through a clean classification, a real refusal and a real
 * violation in sequence; the spawned real binary reports the same sink's own counters. If the zero came from a
 * disconnected path, the +1s on the same object could not appear.
 *
 * SYNTHETIC payload and confined stores only. The real sealed material is never opened.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { governedGuardSink, governedAuditContext, resolveAuditStoreLocation } from "../src/governance/governed-run.mjs";
import { auditClassOf, isDurableDecision, guardAuthority, AUDIT_CLASSES } from "../src/governance/guard-audit.mjs";
import { readUnsealed, SealedPathRefused } from "../src/governance/sealed-paths.mjs";
import { contentHashOf } from "../src/governance/evidence-roles.mjs";
import { contentFingerprint } from "../src/audit-trail/event.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { freezeMechanism, requestHeldOutAccess, mechanismHash, populationCommitment } from "../src/heldout/lifecycle.mjs";
import { scan } from "../tools/heldout-firewall.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();
const confined = () => governedAuditContext({ repo: REPO, correlationId: `run:f07-sink-count:${process.pid}` }).store;
const count = () => confined().readAll().events.length;

/* A synthetic tree: one registered observed-data file and one unregistered file, both carrying a synthetic "held-out"
 * phrase; one ordinary file; and one file under a synthetic sealed prefix. */
const MEMBER = "synthetic sink repair probe phrase";
function syntheticTree() {
  const dir = fs.mkdtempSync(join(REPO, ".test-scratch", "f07-sink-"));
  fs.mkdirSync(join(dir, "vault"));
  fs.writeFileSync(join(dir, "vault", "item.txt"), "synthetic sealed item\n");
  fs.writeFileSync(join(dir, "obs.jsonl"), `{"query":"${MEMBER}"}\n`);
  fs.writeFileSync(join(dir, "leak.md"), `A copied phrase: ${MEMBER}.\n`);
  fs.writeFileSync(join(dir, "ordinary.md"), "nothing held out here\n");
  const registry = [
    { id: "synthetic:sink-vault", role: "SEALED", resource: { root: "syn", pathPrefixes: ["vault/"] } },
    { id: "synthetic:sink-observed", role: "OBSERVED_DATA", resource: { root: "syn", path: "obs.jsonl" }, contentHash: contentHashOf(fs.readFileSync(join(dir, "obs.jsonl"))), maySupplyExpectedAnswer: false, mandatoryReadable: false },
  ];
  return { dir, registry };
}
const firewallSink = (tag) => governedGuardSink({ repo: REPO, correlationId: `run:f07-sink-${tag}:${process.pid}:${Date.now()}`, now: "2026-09-23", actor: "bin/heldout-firewall.mjs" });

test("(e) · tests write only a CONFINED store — this file is in a verified test context", () => {
  const loc = resolveAuditStoreLocation({ repo: REPO });
  assert.equal(loc.synthetic, true, "not confined — this file would write the production trail");
  assert.ok(!loc.eventsPath.replace(/\\/g, "/").endsWith("/audit-trail/events.jsonl") || loc.eventsPath.includes(".test-scratch"));
});

test("(a)(b)(d) · ONE SINK: a clean classification appends 0, a real sealed refusal appends exactly 1, a real violation appends exactly 1", () => {
  const { dir, registry } = syntheticTree();
  try {
    const sink = firewallSink("pair");
    const start = count();

    // (a) CLEAN — a registered observed-data file judged lawful, and an ordinary file: nothing requested, nothing disclosed.
    const clean = scan({ registry, root: "syn", base: dir, files: ["obs.jsonl", "ordinary.md", "vault/item.txt"], members: [MEMBER], fragments: [], audit: sink });
    assert.equal(clean.failures.length, 0);
    assert.equal(clean.sealedExcluded, 1, "the sealed path was not excluded unread");
    assert.deepEqual([sink.classified, sink.emitted], [1, 0]);
    assert.equal(count() - start, 0, "a clean classification reached the durable trail");

    // (b) REFUSED ACCESS — the SAME sink: code asks the loader for the sealed file.
    let readerCalls = 0;
    assert.throws(() => readUnsealed({ registry, root: "syn", base: dir, path: "vault/item.txt", audit: sink, read: () => { readerCalls += 1; return ""; } }), SealedPathRefused);
    assert.equal(readerCalls, 0);
    assert.equal(count() - start, 1, "a real refusal did not append exactly one event");
    const refusal = confined().readAll().events.at(-1);
    assert.deepEqual([refusal.eventType, refusal.outcome, refusal.reasonCode, refusal.actor], ["REFUSAL", "REFUSED", "SEALED_PATH_REFUSED", "bin/heldout-firewall.mjs"]);
    assert.ok(!JSON.stringify(refusal).includes("vault/item.txt") && !JSON.stringify(refusal).includes("item.txt"), "the path entered the event");
    assert.deepEqual(Object.keys(refusal.metadata).filter((k) => !["family", "guard", "classification", "ruleEntry", "root", "evidenceClass"].includes(k)), [], "metadata is not metadata-only");

    // (d) VIOLATION — the SAME sink: the phrase in an unregistered file is contamination.
    const dirty = scan({ registry, root: "syn", base: dir, files: ["leak.md"], members: [MEMBER], fragments: [], audit: sink });
    assert.deepEqual(dirty.failures.map((f) => f.path), ["leak.md"]);
    assert.equal(count() - start, 2, "a real violation did not append exactly one event");
    const violation = confined().readAll().events.at(-1);
    assert.deepEqual([violation.eventType, violation.action, violation.outcome, violation.reasonCode], ["EVIDENCE_ROLE_DECISION", "HELD_OUT_PAYLOAD_FOUND", "REFUSED", "FAIL_RETIRED_PAYLOAD"]);
    assert.ok(!JSON.stringify(violation).includes("leak.md") && !JSON.stringify(violation).includes(MEMBER), "the path or the match entered the event");

    // ONE MECHANISM: all three decisions passed through this one object; it kept all three and appended exactly two.
    assert.deepEqual(sink.events.map((e) => auditClassOf(e)), ["CLASSIFICATION", "ACCESS", "VIOLATION"]);
    assert.deepEqual([sink.events.length, sink.classified, sink.emitted], [3, 1, 2]);
    assert.equal(confined().verify().ok, true);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("(a)(f) · the REAL firewall binary, twice, on the real tree: 0 appended each run — reported by the same sink's own counters", () => {
  const before = count();
  for (let run = 1; run <= 2; run += 1) {
    const r = spawnSync(process.execPath, ["bin/heldout-firewall.mjs", "--check"], { cwd: REPO, encoding: "utf8", env: process.env, timeout: 300_000 });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const m = r.stdout.match(/appended to the audit trail: (\d+) \(access or violation\) · classification only, not appended: (\d+)/);
    assert.ok(m, `run ${run}: the sink's counters were not reported`);
    assert.equal(Number(m[1]), 0, `run ${run}: a clean firewall run appended`);
    assert.ok(Number(m[2]) >= 1, `run ${run}: the run classified nothing — the zero would be vacuous`);
    assert.equal(count() - before, 0, `run ${run}: the store grew`);
  }
  // The binary builds its sink through the same constructor, and hands that sink to every scan.
  const src = fs.readFileSync(join(REPO, "bin/heldout-firewall.mjs"), "utf8");
  assert.match(src, /const AUDIT = governedGuardSink\(/);
  assert.equal((src.match(/scan\(\{[^}]*audit: AUDIT \}\)/g) ?? []).length, 3);
});

test("(c) · an AUTHORISED synthetic held-out access appends exactly 1 event, derived ACCESS, on the confined F08 store", () => {
  const ctx = governedAuditContext({ repo: REPO, correlationId: `run:f07-sink-c:${process.pid}:${Date.now()}` });
  const { authorityRef, authorityHash } = guardAuthority({ now: "2026-09-23" });
  const audit = { store: ctx.store, actor: "test/f07-sink", softwareVersion: ctx.softwareVersion, correlationId: `run:f07-sink-c:${process.pid}:${Date.now()}`, authorityRef, authorityHash };
  const ITEMS = ["s-1", "s-2"];
  const SET = { id: `synthetic:sink-set-${process.pid}-${Date.now()}`, role: "HELD_OUT_EVIDENCE", sealed: true, mayEvaluate: true, mandatoryReadable: false, maySupplyExpectedAnswer: false, mayTrain: false, retiredReason: null, contentHash: populationCommitment(ITEMS), resource: { root: "syn", pathPrefixes: ["sink-heldout/"] } };
  const OWNER = AUTHORITY_CORPUS.find((r) => r.status === "CURRENT" && r.issuer?.class === "OWNER");
  const AUTH = [...AUTHORITY_CORPUS, { ...OWNER, authorityId: "synthetic:sink-evaluator", propositionId: "SYNTHETIC_SINK_EVALUATOR", scope: ["ALMIVISIBILITY"], supersedes: [], supersededBy: [], contentHash: "e".repeat(64), issuedAt: "2026-01-01", effectiveFrom: "2026-01-01" }];
  const MECH = mechanismHash({ "m.mjs": `export const f = () => ${process.pid};` });
  freezeMechanism({ audit, mechanismId: "synthetic-sink-mechanism", mechanismHash: MECH, frozenAt: "2026-09-23T10:00:00Z" });
  const before = count();
  const g = requestHeldOutAccess({ audit, registry: [SET, ...EVIDENCE_ROLE_REGISTRY], authorityRecords: AUTH, request: { mechanismId: "synthetic-sink-mechanism", mechanismHash: MECH, sealedSetId: SET.id, populationCommitment: SET.contentHash, protocolId: "synthetic", evaluatorAuthority: { propositionId: "SYNTHETIC_SINK_EVALUATOR", scope: ["ALMIVISIBILITY"] }, purpose: "assessment", at: "2026-09-23T11:00:00Z" } });
  assert.equal(g.allowed, true, g.code);
  assert.equal(count() - before, 1, "an authorised access did not append exactly one event");
  const e = confined().readAll().events.at(-1);
  assert.deepEqual([e.eventType, e.action, e.outcome, auditClassOf(e)], ["EVALUATION", "HELDOUT_ACCESS", "ALLOWED", "ACCESS"]);
});

test("DERIVATION, NOT DECLARATION · the class comes from the decision itself — a caller's flag or name cannot move it", () => {
  const table = [
    [{ eventType: "REFUSAL", action: "READ_SEALED_PATH", outcome: "REFUSED" }, "ACCESS"],
    [{ eventType: "EVIDENCE_ROLE_DECISION", action: "EXEMPT_AS_OBSERVED_DATA", outcome: "ALLOWED" }, "CLASSIFICATION"],
    [{ eventType: "EVIDENCE_ROLE_DECISION", action: "EXEMPT_AS_OBSERVED_DATA", outcome: "REFUSED" }, "VIOLATION"],
    [{ eventType: "EVALUATION", action: "HELDOUT_ACCESS", outcome: "ALLOWED" }, "ACCESS"],
    [{ eventType: "EVALUATION", action: "HELDOUT_ACCESS", outcome: "REFUSED" }, "ACCESS"],
    [{ eventType: "EVALUATION", action: "HELDOUT_MECHANISM_FROZEN", outcome: "RECORDED" }, "GOVERNED_CHANGE"],
    [{ eventType: "EVALUATION", action: "HELDOUT_EVALUATION_SCORED", outcome: "RECORDED" }, "GOVERNED_CHANGE"],
    [{ eventType: "SOMETHING_NEW", action: "X", outcome: "ALLOWED" }, "UNDERIVED"],
  ];
  for (const [d, cls] of table) assert.equal(auditClassOf(d), cls, JSON.stringify(d));
  for (const [d] of table) assert.equal(isDurableDecision(d), auditClassOf(d) !== "CLASSIFICATION");
  assert.equal(isDurableDecision({ eventType: "SOMETHING_NEW", outcome: "ALLOWED" }), true, "an undeclared kind failed OPEN");
  assert.deepEqual([...AUDIT_CLASSES].sort(), ["ACCESS", "CLASSIFICATION", "GOVERNED_CHANGE", "UNDERIVED", "VIOLATION"]);

  // A caller's label is not read: a refusal flagged "diagnostic" still appends; a classification flagged "durable" does not.
  const { dir, registry } = syntheticTree();
  try {
    for (const actor of ["bin/heldout-firewall.mjs", "tools/audit-trail-census.mjs", "test/anything"]) {
      const sink = governedGuardSink({ repo: REPO, correlationId: `run:f07-sink-label:${actor}:${process.pid}:${Date.now()}`, now: "2026-09-23", actor });
      const before = count();
      sink.emit({ eventType: "REFUSAL", action: "READ_SEALED_PATH", outcome: "REFUSED", reasonCode: "SEALED_PATH_REFUSED", durable: false, diagnostic: true, metadata: { guard: "readUnsealed", classification: "SEALED", ruleEntry: "synthetic:sink-vault", root: "syn" } });
      sink.emit({ eventType: "EVIDENCE_ROLE_DECISION", action: "EXEMPT_AS_OBSERVED_DATA", outcome: "ALLOWED", reasonCode: "REGISTERED_OBSERVED_DATA", durable: true, metadata: { guard: "observedDataExemption", classification: "OBSERVED_DATA_EXEMPT", ruleEntry: "synthetic:sink-observed", role: "OBSERVED_DATA", root: "syn" } });
      assert.equal(count() - before, 1, `${actor}: a caller's flag or name moved the line`);
      assert.deepEqual([sink.emitted, sink.classified], [1, 1], actor);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("CONFLICT FIX · a migrated event's MIGRATION PASS no longer decides sameness — a native event's correlation still does", () => {
  const events = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).readAll().events;
  const migrated = events.filter((e) => e.migration === true);
  const native = events.filter((e) => e.migration !== true);
  assert.ok(migrated.length >= 100 && native.length >= 100, `${migrated.length} migrated, ${native.length} native`);
  // Every migrated event carries the migration pass as its correlation (the premise the fix rests on).
  for (const e of migrated) assert.match(e.correlationId, /^migration:[0-9a-f]{12}$/, e.eventId);
  // Re-offered under another migration pass: the SAME occurrence (the 93 correlation-only conflicts).
  for (const e of migrated) assert.equal(contentFingerprint({ ...e, correlationId: "migration:000000000000" }), contentFingerprint(e), e.eventId);
  // GENUINE detection is unchanged: a migrated event whose content differs is still different …
  for (const e of migrated) assert.notEqual(contentFingerprint({ ...e, outcome: `${e.outcome}-X` }), contentFingerprint(e), e.eventId);
  for (const e of migrated.filter((x) => x.metadata?.family === "B")) assert.notEqual(contentFingerprint({ ...e, metadata: { ...e.metadata, stateAfter: "X" } }), contentFingerprint(e), e.eventId);
  // … and a NATIVE event's correlation is still part of what happened.
  for (const e of native) assert.notEqual(contentFingerprint({ ...e, correlationId: `${e.correlationId}-other` }), contentFingerprint(e), e.eventId);
});

test("(g) · the production trail verifies, every eventId is distinct, and nothing in this file touched it", () => {
  const store = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] });
  assert.equal(store.verify().ok, true);
  const ev = store.readAll().events;
  assert.equal(new Set(ev.map((e) => e.eventId)).size, ev.length);
  assert.deepEqual(prodHashes(), PROD_BEFORE, "the production trail changed during this file");
});
