/**
 * 🔴 F08 · AUDIT TRAIL AND PROVENANCE — P1–P34, over the REAL populations, through the PRODUCTION path.
 *
 * Acceptance: the owner ruling committed in the governance repository at 19e6b7b (sha256 f6aef340…d18a), pinned and
 * re-derived in config/fboard/acceptances.mjs. Nothing here re-states the contract; the board checks the pins.
 *
 * ── HOW EACH PROOF IS BUILT, AND WHY IT IS BUILT THAT WAY ──────────────────
 *
 * Every refusal proof has TWO halves that share ONE code path:
 *   the FIRING CASE — the fault is present, and the named refusal code comes back;
 *   the SILENT CLEAN CONTROL — the same event with the fault removed is APPENDED.
 * The control is what proves the check is not simply refusing everything; the firing case is what proves the control
 * is not simply passing everything. A control that can never fail proves nothing, so each control is asserted to
 * produce the OTHER verdict on the same call.
 *
 * ── WHAT IS REAL HERE ──────────────────────────────────────────────────────
 *
 * The authority corpus, the evidence-role registry, the sealed registry entry, the declared tenants and the committed
 * audit store are the real ones. Only the STORE PATH is a scratch file, so a test can never write into the committed
 * trail — the code under test is the production code either way.
 *
 * 🔴 A retired held-out member is NEVER written into this file. P14 derives one at runtime and never prints it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { AUDIT_STORE } from "../config/audit-store.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { REPO_ROOT, writePermission, LOCAL, PRODUCTION } from "../src/write-law.mjs";
import { createTenantResolver, TENANT_ID_PATTERN } from "../src/tenancy/resolver.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { queryObservation } from "../src/discovery/row5.mjs";
import { splitPopulation } from "../src/discovery/query-population.mjs";
import { isHeldOut } from "../src/discovery/intent-clusters.mjs";
import { PRODUCT_WORDS } from "../tools/product-boundary.mjs";
import {
  AUDIT_VERSION, EVENT_TYPES, FIELD_ORDER, GENESIS_PREVIOUS_HASH, canonicalJson, contentFingerprint, eventFaults,
  hashEvent,
} from "../src/audit-trail/event.mjs";
import { AuditRefused, DETECTION_BOUNDARY, createAuditStore, isoSeconds, orderedFor } from "../src/audit-trail/store.mjs";
import { createAuditReader } from "../src/audit-trail/reader.mjs";
import { makeEvidenceLookup, makeSealedLookup, refForEntry, familyTCandidates } from "../src/audit-trail/population.mjs";
import { recordCandidates, writeGateEvent } from "../src/audit-trail/recorder.mjs";
import { auditAuthorityMigration } from "../src/audit-trail/callers.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";

const NOW = CORPUS_PROVENANCE.now;
const SW = "engine:test";
const evidenceEntryFor = makeEvidenceLookup(EVIDENCE_ROLE_REGISTRY);
const isSealedRef = makeSealedLookup(EVIDENCE_ROLE_REGISTRY);

/** A scratch store — the PRODUCTION store module, pointed at a throwaway path inside this repository. */
const scratchDirs = [];
function scratchStore(opts = {}) {
  mkdirSync(join(REPO_ROOT, ".test-scratch"), { recursive: true });
  const dir = mkdtempSync(join(REPO_ROOT, ".test-scratch", "f08-"));
  scratchDirs.push(dir);
  return createAuditStore({
    eventsPath: join(dir, "events.jsonl"),
    headPath: join(dir, "head.json"),
    evidenceEntryFor, isSealedRef,
    ...opts,
  });
}
test.after(() => { for (const d of scratchDirs) rmSync(d, { recursive: true, force: true }); });

/** The REAL authority this feature's own events are decided under, and the hash that governed. */
const F08_AUTHORITY = { propositionId: "OWNER_RULING_F08_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F08"] };
const F08_RECORD = AUTHORITY_CORPUS.find((r) => r.propositionId === F08_AUTHORITY.propositionId);
assert.ok(F08_RECORD, "the real corpus must hold F08's acceptance ruling — without it these proofs stand on nothing");

/* 🔴 ONE BASE INSTANT FOR THE WHOLE FILE. Taking `Date.now()` per call made two otherwise identical drafts differ by
 * a second whenever the clock ticked between them — and an idempotency proof that is flaky is not a proof. */
const BASE = Date.now();
const at = (s) => isoSeconds(BASE - s * 1000);
/** A lawful GLOBAL_PRODUCT draft over real authority. Overrides are applied last, so any field can be broken. */
const draft = (o = {}) => ({
  eventType: "BOARD_TRANSITION",
  action: "TEST_GOVERNED_ACTION",
  outcome: "RECORDED",
  reasonCode: "TEST",
  occurredAt: at(60),
  actor: "test/audit-trail.test.mjs",
  actorType: "ENGINE",
  scopeType: "GLOBAL_PRODUCT",
  tenantId: null,
  subjectId: null,
  authorityRef: { ...F08_AUTHORITY, scope: [...F08_AUTHORITY.scope] },
  authorityHash: F08_RECORD.contentHash,
  softwareVersion: SW,
  evidenceRefs: [],
  correlationId: "test-run",
  parentEventId: null,
  migration: false,
  migrationSource: null,
  migratedAt: null,
  metadata: {},
  ...o,
});

/** Append and return the refusal codes, or [] when it was appended. One helper, so firing and control share code. */
function codesFor(store, d) {
  try { store.append(d); return []; }
  catch (e) { if (!(e instanceof AuditRefused)) throw e; return e.faults.map((f) => f.code); }
}

/** The REAL declared tenants, from the production resolver. Absence is a failure, never a silent pass. */
const resolver = createTenantResolver({});
const DECLARATIONS = resolver.declarations;
const REAL_TENANTS = DECLARATIONS.readable ? [...new Set(DECLARATIONS.attachments.map((a) => a.tenantId))].sort() : [];

test("🔴 the declared tenant source is readable and holds real declared tenants — absence here is a RED, never a silent pass", () => {
  assert.equal(DECLARATIONS.readable, true, `the tenant declaration source could not be read: ${DECLARATIONS.reason} — "I could not look" is not "there is nothing there"`);
  assert.ok(REAL_TENANTS.length >= 2, `these proofs need at least two declared tenants; the source declares ${REAL_TENANTS.length}`);
  for (const t of REAL_TENANTS) assert.match(t, TENANT_ID_PATTERN);
});

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * P1–P6 · SCOPE AND ACTOR
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("P1 · a valid GLOBAL_PRODUCT event appends and reads back", () => {
  const store = scratchStore();
  const r = store.append(draft());
  assert.equal(r.status, "APPENDED");
  const reader = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor });
  const back = reader.byId(r.event.eventId);
  assert.equal(back.status, "OK");
  assert.equal(back.event.scopeType, "GLOBAL_PRODUCT");
  assert.equal(back.event.tenantId, null);
  assert.equal(back.event.migrationStatus, "NATIVE");
  // CONTROL, PROVED CAPABLE: the same reader says UNAVAILABLE for an id it does not hold.
  assert.equal(reader.byId("f".repeat(32)).status, "UNAVAILABLE");
});

test("P2 · a valid TENANT event appends over a REAL declared tenant and stays inside it", () => {
  const store = scratchStore();
  const [a, b] = REAL_TENANTS;
  store.append(draft({ scopeType: "TENANT", tenantId: a, action: "TENANT_A" }));
  store.append(draft({ scopeType: "TENANT", tenantId: b, action: "TENANT_B", occurredAt: at(30) }));
  const reader = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor });
  const onlyA = reader.byTenant(a);
  assert.equal(onlyA.status, "OK");
  assert.equal(onlyA.count, 1);
  assert.equal(onlyA.events[0].tenantId, a);
  // CONTROL, PROVED CAPABLE: the SAME filter returns the other tenant's event for the other id.
  assert.equal(reader.byTenant(b).events[0].tenantId, b);
});

test("P3 · a SUBJECT event requires BOTH tenantId and subjectId", () => {
  const store = scratchStore();
  const t = REAL_TENANTS[0];
  assert.deepEqual(codesFor(store, draft({ scopeType: "SUBJECT", tenantId: t, subjectId: null })), ["SUBJECT_ID_ABSENT"]);
  assert.deepEqual(codesFor(store, draft({ scopeType: "SUBJECT", tenantId: null, subjectId: "s1" })), ["TENANT_ID_ABSENT"]);
  // CONTROL: with both, the same call appends.
  assert.deepEqual(codesFor(store, draft({ scopeType: "SUBJECT", tenantId: t, subjectId: "s1" })), []);
});

test("P4 · a missing scope is REFUSED and never defaults to global", () => {
  const store = scratchStore();
  for (const bad of [null, undefined, "", "GLOBAL", "global_product"]) {
    assert.ok(codesFor(store, draft({ scopeType: bad })).includes("SCOPE_ABSENT"), `scopeType ${JSON.stringify(bad)} was not refused`);
  }
  assert.deepEqual(codesFor(store, draft({ scopeType: "GLOBAL_PRODUCT" })), []); // CONTROL
  // And nothing was silently recorded as global while it was being refused.
  assert.equal(store.readAll().events.filter((e) => e.action === "TEST_GOVERNED_ACTION").length, 1);
});

test("P5 · a missing actor is REFUSED", () => {
  const store = scratchStore();
  for (const bad of [null, "", "   "]) assert.ok(codesFor(store, draft({ actor: bad })).includes("ACTOR_ABSENT"));
  assert.deepEqual(codesFor(store, draft({ actor: "bin/audit-trail.mjs" })), []); // CONTROL
});

test("P6 · an ENGINE/CI process cannot be recorded as HUMAN, and this run wrote no HUMAN actor anywhere", () => {
  const store = scratchStore();
  assert.deepEqual(codesFor(store, draft({ actorType: "HUMAN" })), ["HUMAN_ACTOR_UNATTESTED"]);
  assert.ok(codesFor(store, draft({ actorType: "OWNER" })).includes("ACTOR_TYPE_UNKNOWN"));
  // CONTROL: the same event as ENGINE appends; and a HUMAN actor WITH committed attestation is lawful — so the rule
  // refuses the unattested claim, not the word.
  assert.deepEqual(codesFor(store, draft({ actorType: "ENGINE" })), []);
  assert.deepEqual(codesFor(store, draft({ actorType: "HUMAN", action: "SIGNED_IN_PERSON", metadata: { humanAttestation: "_handoffs:19e6b7b" } })), []);
  // 🔴 AND THE COMMITTED TRAIL CARRIES NONE. Not one event this run created names a person as actor.
  const committed = productionAuditStore({ repo: REPO_ROOT, forbiddenSubstrings: [] }).readAll().events;
  assert.ok(committed.length > 0, "the committed audit trail is empty — there is nothing to check");
  assert.deepEqual(committed.filter((e) => e.actorType === "HUMAN").map((e) => e.eventId), []);
});

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * P7–P9 · AUTHORITY, AND THE THREE VALUES
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("P7 · a governed event resolves its authority through F05's production path, and names it or is refused", () => {
  const store = scratchStore();
  // An event that names no authority, no hash, no software version or no run is refused before anything else.
  assert.ok(codesFor(store, draft({ authorityRef: null })).includes("AUTHORITY_REF_ABSENT"));
  assert.ok(codesFor(store, draft({ authorityRef: { propositionId: "X" } })).includes("AUTHORITY_REF_ABSENT"));
  assert.ok(codesFor(store, draft({ authorityHash: null })).includes("AUTHORITY_HASH_MALFORMED"));
  assert.ok(codesFor(store, draft({ authorityHash: "not-a-hash" })).includes("AUTHORITY_HASH_MALFORMED"));
  assert.ok(codesFor(store, draft({ softwareVersion: null })).includes("SOFTWARE_VERSION_ABSENT"));
  assert.ok(codesFor(store, draft({ correlationId: "" })).includes("CORRELATION_ID_ABSENT"));
  assert.ok(codesFor(store, draft({ eventType: "SOMETHING" })).includes("EVENT_TYPE_UNKNOWN"));
  assert.ok(codesFor(store, draft({ outcome: "REFUSED", reasonCode: "" })).includes("REASON_CODE_ABSENT"));
  assert.equal(store.readAll().events.length, 0, "a refused event was written anyway");
  const candidates = [{ family: "B", sourceId: "p7", draft: { ...draft(), authorityHash: undefined } }];
  const out = recordCandidates({ store, candidates, corpus: AUTHORITY_CORPUS });
  assert.equal(out.counts.migrated, 1, `the event was not recorded with a resolved AUTHORITY: ${JSON.stringify(out.notMigratable)} ${JSON.stringify(out.invalid)}`);
  assert.equal(store.readAll().events[0].authorityHash, F08_RECORD.contentHash, "the stored authorityHash is not the one F05's resolver returned");
  // CONTROL, PROVED CAPABLE: a proposition the register does not hold is NOT_MIGRATABLE, not a default.
  const store2 = scratchStore();
  const out2 = recordCandidates({
    store: store2, corpus: AUTHORITY_CORPUS,
    candidates: [{ family: "B", sourceId: "p7b", draft: { ...draft(), authorityHash: undefined, authorityRef: { propositionId: "NO_SUCH_PROPOSITION", scope: ["ALMIVISIBILITY"] } } }],
  });
  assert.equal(out2.counts.migrated, 0);
  assert.equal(out2.counts.notMigratable, 1);
  assert.match(out2.notMigratable[0].notMigratable, /AUTHORITY_NOT_CURRENT_AT_EVENT/);
});

test("P8 · authorityAtEvent is preserved after a later supersession, and P9 · the reader gives three distinct values", () => {
  const store = scratchStore();
  const r = store.append(draft());
  const atEvent = r.event.authorityHash;

  // A LATER, NEWER applicable authority for the same proposition and scope, with DIFFERENT content.
  const superseding = {
    ...F08_RECORD,
    authorityId: "_handoffs:LATER_RULING.md",
    issuedAt: "2026-09-23", effectiveFrom: "2026-09-23",
    contentHash: createHash("sha256").update("a later ruling", "utf8").digest("hex"),
  };
  const later = [...AUTHORITY_CORPUS, superseding];
  const reader = createAuditReader({ store, authorityRecords: later, now: "2026-09-23", evidenceEntryFor });
  const view = reader.byId(r.event.eventId).event;

  assert.equal(view.authority.authorityAtEvent, atEvent, "the stored authority was rewritten by a later supersession");
  assert.equal(view.authority.authorityCurrentNow, superseding.contentHash);
  assert.equal(view.authority.supersededSinceEvent, true);
  assert.notEqual(view.authority.authorityAtEvent, view.authority.authorityCurrentNow);
  // CONTROL, PROVED CAPABLE: with no supersession the SAME three values agree and the flag is false.
  const clean = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor }).byId(r.event.eventId).event;
  assert.equal(clean.authority.supersededSinceEvent, false);
  assert.equal(clean.authority.authorityAtEvent, clean.authority.authorityCurrentNow);
});

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * P10–P14 · EVIDENCE AND PAYLOAD
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const OBSERVED = EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "OBSERVED_DATA" && e.resource.root === "engine");
const SEALED = EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "SEALED");
const RETIRED = EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "RETIRED_CONTAMINATED");

test("P10 · evidence references resolve through the role registry, and an unregistered one FAILS CLOSED", () => {
  const store = scratchStore();
  const unregistered = { root: "engine", ref: "runs/no-such-artefact.json", role: "OBSERVED_DATA", contentHash: "0".repeat(64) };
  assert.ok(codesFor(store, draft({ evidenceRefs: [unregistered] })).includes("EVIDENCE_ROLE_UNREGISTERED"));
  // A registered artefact whose ROLE is misdeclared is refused too — a role is read, never asserted.
  assert.ok(codesFor(store, draft({ evidenceRefs: [{ ...refForEntry(OBSERVED), role: "HELD_OUT_EVIDENCE" }] })).includes("EVIDENCE_ROLE_MISMATCH"));
  assert.deepEqual(codesFor(store, draft({ evidenceRefs: [refForEntry(OBSERVED)] })), []); // CONTROL
});

test("P11 · cross-tenant evidence is REFUSED, over two REAL declared tenants", () => {
  const store = scratchStore();
  const [a, b] = REAL_TENANTS;
  const theirs = { ...refForEntry(OBSERVED), tenantId: b };
  assert.ok(codesFor(store, draft({ scopeType: "TENANT", tenantId: a, evidenceRefs: [theirs] })).includes("EVIDENCE_CROSS_TENANT"));
  // CONTROL: the same reference inside its OWN tenant appends.
  assert.deepEqual(codesFor(store, draft({ scopeType: "TENANT", tenantId: b, evidenceRefs: [theirs] })), []);
  // And a tenant-bearing reference may not ride on a GLOBAL_PRODUCT event either.
  assert.ok(codesFor(store, draft({ evidenceRefs: [theirs] })).includes("EVIDENCE_TENANT_IN_GLOBAL_EVENT"));
});

test("P12 · RETIRED_CONTAMINATED cannot support a PASSING evaluation event", () => {
  const store = scratchStore();
  const retiredRef = refForEntry(RETIRED);
  assert.ok(codesFor(store, draft({ eventType: "EVALUATION", outcome: "PASS", evidenceRefs: [retiredRef] })).includes("EVIDENCE_RETIRED_CANNOT_PASS"));
  // CONTROL, PROVED CAPABLE: the same retired reference on a NON-passing event is lawful (it is evidence of its own
  // retirement), and a PASS backed by ordinary observed data is lawful too. The rule is about the pair, not the word.
  assert.deepEqual(codesFor(store, draft({ eventType: "EVALUATION", action: "RETIRED_ON_A_FAIL", outcome: "FAIL", evidenceRefs: [retiredRef] })), []);
  assert.deepEqual(codesFor(store, draft({ eventType: "EVALUATION", action: "OBSERVED_ON_A_PASS", outcome: "PASS", evidenceRefs: [refForEntry(OBSERVED)] })), []);
});

test("P13 · SEALED evidence is named and NEVER expanded by any read path", () => {
  const store = scratchStore();
  const sealedRef = refForEntry(SEALED);
  assert.equal(sealedRef.contentHash, null, "sealed material must carry no content hash — its bytes are not read");
  const r = store.append(draft({ evidenceRefs: [sealedRef] }));
  const reader = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor });
  const ev = reader.byId(r.event.eventId).event.evidence[0];
  assert.equal(ev.status, "OK");
  assert.equal(ev.role, "SEALED");
  assert.equal(ev.expanded, false);
  assert.equal(ev.contentHash, null);
  // A sealed reference carrying a content hash is refused: that hash could only come from reading it.
  assert.ok(codesFor(store, draft({ evidenceRefs: [{ ...sealedRef, contentHash: "0".repeat(64) }] })).includes("EVIDENCE_SEALED_CONTENT_HASHED"));
  // CONTROL, PROVED CAPABLE: an UNSEALED reference IS returned with its hash — so `expanded:false` is not universal.
  const r2 = store.append(draft({ action: "UNSEALED", evidenceRefs: [refForEntry(OBSERVED)], occurredAt: at(10) }));
  assert.equal(reader.byId(r2.event.eventId).event.evidence[0].contentHash, OBSERVED.contentHash);
});

test("P14 · protected payload is rejected BEFORE append — including a REAL retired held-out member", () => {
  // The member is derived at runtime from the registry's own derivation and is NEVER printed or asserted on.
  const rows = queryObservation(createJsonlStore(join(REPO_ROOT, "runs", "evidence", "evidence.jsonl")).readAll(), RETIRED.resource.derivation.observationId).value.rows;
  const members = splitPopulation(rows).human.filter((r) => isHeldOut(r.query)).map((r) => String(r.query));
  assert.ok(members.length > 0, "the retired population could not be derived — this proof cannot be made and must not pass");

  const store = scratchStore({ forbiddenSubstrings: members });
  const before = store.readAll().events.length;
  const codes = codesFor(store, draft({ metadata: { note: members[0] } }));
  assert.ok(codes.includes("METADATA_PROTECTED_PAYLOAD"), `expected a payload refusal, got ${codes.join(", ")}`);
  assert.equal(store.readAll().events.length, before, "the event was written and then judged — rejection must come BEFORE append");

  // Generic secret shapes are refused by NAME and by SHAPE, with no subject knowledge at all.
  assert.ok(codesFor(store, draft({ metadata: { sessionToken: "x" } })).includes("METADATA_FORBIDDEN_KEY"));
  assert.ok(codesFor(store, draft({ metadata: { note: "-----BEGIN RSA PRIVATE KEY-----" } })).includes("METADATA_FORBIDDEN_VALUE"));
  assert.ok(codesFor(store, draft({ metadata: { note: "x".repeat(400) } })).includes("METADATA_VALUE_TOO_LONG"));
  assert.ok(codesFor(store, draft({ metadata: { nested: { a: 1 } } })).includes("METADATA_NOT_FLAT"));
  // CONTROL, PROVED CAPABLE: ordinary metadata on the same call appends.
  assert.deepEqual(codesFor(store, draft({ metadata: { note: "an ordinary note", count: 3 } })), []);
});

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * P15–P20 · TAMPER EVIDENCE, AND THE DECLARED BOUNDARY
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Rewrite a store's lines directly — the only way to simulate somebody editing the file. */
function rewrite(store, events) {
  writeFileSync(store.eventsPath, events.map((e) => JSON.stringify(orderedFor(e))).join("\n") + (events.length ? "\n" : ""), "utf8");
}
function chainOf(n) {
  const store = scratchStore();
  for (let i = 0; i < n; i += 1) store.append(draft({ action: `E${i}`, occurredAt: at(100 - i) }));
  return store;
}
const findingCodes = (store) => store.verify().findings.map((f) => f.code);

test("P15 · a valid event hash verifies, and the whole chain does", () => {
  const store = chainOf(4);
  assert.equal(store.verify().ok, true, JSON.stringify(store.verify().findings));
  for (const e of store.readAll().events) assert.equal(hashEvent(e), e.eventHash);
});

test("P16 · MUTATION of a stored event is detected", () => {
  const store = chainOf(4);
  const events = store.readAll().events;
  events[1].outcome = "ALLOWED";
  rewrite(store, events);
  assert.ok(findingCodes(store).includes("EVENT_HASH_MISMATCH"));
  // CONTROL, PROVED CAPABLE: putting the byte back makes the same check green again.
  events[1].outcome = "RECORDED";
  rewrite(store, events);
  assert.equal(store.verify().ok, true);
});

test("P17 · DELETION OF A MIDDLE event is detected", () => {
  const store = chainOf(5);
  const events = store.readAll().events;
  rewrite(store, [events[0], events[1], events[3], events[4]]);
  assert.ok(findingCodes(store).includes("LINK_BROKEN"));
  rewrite(store, events);
  assert.equal(store.verify().ok, true); // CONTROL
});

test("P18 · INSERTION or REORDERING is detected", () => {
  const store = chainOf(4);
  const events = store.readAll().events;
  rewrite(store, [events[0], events[2], events[1], events[3]]);
  assert.ok(findingCodes(store).includes("LINK_BROKEN"));
  const foreign = chainOf(1).readAll().events[0];
  rewrite(store, [events[0], foreign, events[1], events[2], events[3]]);
  assert.ok(findingCodes(store).includes("LINK_BROKEN"));
  rewrite(store, events);
  assert.equal(store.verify().ok, true); // CONTROL
});

test("P19 · DELETION OF THE FIRST event is detected — the genesis pin holds", () => {
  const store = chainOf(4);
  const events = store.readAll().events;
  rewrite(store, events.slice(1));
  assert.ok(findingCodes(store).includes("GENESIS_PIN_MISSING"), `GENESIS_PIN_MISSING was not reported; findings: [${findingCodes(store).join(", ")}]`);
  rewrite(store, events);
  assert.equal(store.verify().ok, true); // CONTROL

  // 🔴 AND AN ABSENT LINK IS REFUSED, so "missing" can never mean both "genesis" and "truncated". The store always
  // SETS the link, so the refusal is proved where a stored event is judged: the validator, and `verify`.
  assert.ok(
    eventFaults({ ...draft(), recordedAt: at(0), previousEventHash: null }, { evidenceEntryFor, isSealedRef }).map((f) => f.code).includes("PREVIOUS_HASH_ABSENT"),
  );
  const s2 = chainOf(3);
  const ev = s2.readAll().events;
  ev[0].previousEventHash = null;
  rewrite(s2, ev);
  const c2 = findingCodes(s2);
  assert.ok(c2.includes("GENESIS_PIN_MISSING") && c2.includes("EVENT_HASH_MISMATCH"), `GENESIS_PIN_MISSING and EVENT_HASH_MISMATCH expected; findings: [${c2.join(", ")}]`);
  // CONTROL: a first event whose link IS the pinned genesis value verifies.
  const s3 = scratchStore();
  assert.equal(s3.append(draft()).event.previousEventHash, GENESIS_PREVIOUS_HASH);
  assert.equal(s3.verify().ok, true);
});

test("P20 · TAIL TRUNCATION behaves EXACTLY as declared — detected via the head record, and the stated limit is real", () => {
  assert.equal(DETECTION_BOUNDARY.tailTruncation, "DETECTED_VIA_HEAD_RECORD");
  const store = chainOf(5);
  const events = store.readAll().events;

  // Truncating the events file alone: DETECTED, because the head record still names the real head and count.
  rewrite(store, events.slice(0, 3));
  const codes = findingCodes(store);
  assert.ok(codes.includes("HEAD_COUNT_MISMATCH") && codes.includes("HEAD_HASH_MISMATCH"), codes.join(", "));

  // 🔴 THE DECLARED LIMIT, PROVED TO BE REAL rather than claimed away: truncate the head record CONSISTENTLY and
  // this design does not notice. The reader prints that limit; the implementation does not pretend otherwise.
  writeFileSync(store.headPath, JSON.stringify({ auditVersion: AUDIT_VERSION, count: 3, headHash: events[2].eventHash, updatedAt: at(0) }), "utf8");
  assert.equal(store.verify().ok, true, "the declared limit is not what the code does");
  assert.match(DETECTION_BOUNDARY.declaredLimit, /NOT DETECTED/);
  assert.match(DETECTION_BOUNDARY.notClaimed, /not cryptographic non-repudiation/);

  // CONTROL, PROVED CAPABLE: a missing head record is itself a finding, so "ok" above was not vacuous.
  rmSync(store.headPath);
  assert.ok(findingCodes(store).includes("HEAD_RECORD_ABSENT"));
});

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * P21–P27 · IDENTITY, ATOMICITY, TRAVERSAL, TIME
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("P21 · an idempotent retry creates EXACTLY one event", () => {
  const store = scratchStore();
  const d = draft();
  const first = store.append(d);
  const again = store.append(d);
  assert.equal(first.status, "APPENDED");
  assert.equal(again.status, "IDEMPOTENT_RETRY");
  assert.equal(again.appended, false);
  assert.equal(again.event.eventId, first.event.eventId);
  assert.equal(store.readAll().events.length, 1);
  // CONTROL, PROVED CAPABLE: a genuinely different event on the same store DOES append.
  store.append(draft({ action: "DIFFERENT", occurredAt: at(30) }));
  assert.equal(store.readAll().events.length, 2);
});

test("P22 · a CONFLICTING duplicate eventId is REFUSED — not merged, not overwritten", () => {
  const store = scratchStore();
  const first = store.append(draft());
  const conflicting = { ...draft({ outcome: "ALLOWED", reasonCode: "SOMETHING_ELSE" }), eventId: first.event.eventId };
  assert.deepEqual(codesFor(store, conflicting), ["EVENT_ID_CONFLICT"]);
  assert.equal(store.readAll().events.length, 1);
  assert.equal(store.readAll().events[0].outcome, "RECORDED", "the stored event was overwritten");
  // CONTROL: the SAME content under that id is the honest retry, and is accepted as one.
  assert.equal(store.append({ ...draft(), eventId: first.event.eventId }).status, "IDEMPOTENT_RETRY");
});

test("P23 · an interrupted or failed append leaves NO partial event", () => {
  const store = chainOf(2);
  const bytesBefore = readFileSync(store.eventsPath, "utf8");

  // (a) a validation failure writes nothing at all.
  assert.ok(codesFor(store, draft({ actor: null })).length > 0);
  assert.equal(readFileSync(store.eventsPath, "utf8"), bytesBefore, "a PARTIAL EVENT was left behind: the store's bytes changed although the append was refused");

  // (b) an append that THROWS mid-write leaves the file byte-identical, because the line is handed over in one call.
  const interrupted = createAuditStore({
    eventsPath: store.eventsPath, headPath: store.headPath, evidenceEntryFor, isSealedRef,
    appendLine: () => { throw new Error("interrupted"); },
  });
  assert.throws(() => interrupted.append(draft({ action: "WOULD_BE_PARTIAL", occurredAt: at(5) })), /interrupted/);
  assert.equal(readFileSync(store.eventsPath, "utf8"), bytesBefore);
  assert.equal(store.verify().ok, true);
  // CONTROL, PROVED CAPABLE: the same store with a working writer DOES change the bytes.
  store.append(draft({ action: "WOULD_BE_PARTIAL", occurredAt: at(5) }));
  assert.notEqual(readFileSync(store.eventsPath, "utf8"), bytesBefore);
});

test("P24 · correlation and parent traversal return the CORRECT chain", () => {
  const store = scratchStore();
  const root = store.append(draft({ action: "ROOT", correlationId: "c1", occurredAt: at(90) }));
  const mid = store.append(draft({ action: "MID", correlationId: "c1", parentEventId: root.event.eventId, occurredAt: at(80) }));
  const leaf = store.append(draft({ action: "LEAF", correlationId: "c1", parentEventId: mid.event.eventId, occurredAt: at(70) }));
  store.append(draft({ action: "OTHER", correlationId: "c2", occurredAt: at(60) }));

  const reader = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor });
  const corr = reader.byCorrelation("c1");
  assert.equal(corr.count, 3);
  assert.deepEqual(corr.events.map((e) => e.action), ["ROOT", "MID", "LEAF"]);
  const chain = reader.parentChain(leaf.event.eventId);
  assert.deepEqual(chain.chain.map((e) => e.action), ["LEAF", "MID", "ROOT"]);
  // CONTROL, PROVED CAPABLE: a correlation nobody used is UNAVAILABLE, not an empty success.
  assert.equal(reader.byCorrelation("c3").status, "UNAVAILABLE");
});

test("P25 · a tenant-filtered read leaks ZERO events from any other tenant, over the REAL committed trail", () => {
  const store = productionAuditStore({ repo: REPO_ROOT, forbiddenSubstrings: [] });
  const reader = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor });
  const committed = store.readAll().events;
  const tenantsInTrail = [...new Set(committed.filter((e) => e.tenantId).map((e) => e.tenantId))];
  assert.ok(tenantsInTrail.length >= 2, `the committed trail holds events for ${tenantsInTrail.length} tenant(s); this proof needs at least two`);
  let seen = 0;
  for (const t of tenantsInTrail) {
    const res = reader.byTenant(t);
    assert.equal(res.status, "OK");
    assert.ok(res.count > 0);
    seen += res.count;
    for (const e of res.events) assert.equal(e.tenantId, t, "a tenant filter returned another tenant's event");
  }
  // Every tenant-scoped event was reachable by exactly one tenant, and no global event leaked into any of them.
  assert.equal(seen, committed.filter((e) => e.scopeType !== "GLOBAL_PRODUCT").length);
  // CONTROL, PROVED CAPABLE: a non-opaque filter is INVALID, never a quiet empty list.
  assert.equal(reader.byTenant("almiworld.com").status, "INVALID");
});

test("P26 · an unresolvable reference returns INVALID, never an empty success", () => {
  const store = scratchStore({ evidenceEntryFor: () => ({ id: "x", role: "OBSERVED_DATA", sealed: false }) });
  const r = store.append(draft({ evidenceRefs: [{ root: "engine", ref: "runs/gone.json", role: "OBSERVED_DATA", contentHash: "0".repeat(64) }] }));
  // Read it back with the REAL lookup, which does not hold that artefact.
  const reader = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor });
  const ev = reader.byId(r.event.eventId).event.evidence[0];
  assert.equal(ev.status, "INVALID");
  assert.equal(ev.code, "EVIDENCE_UNRESOLVABLE");
  // A parent that is not held is INVALID too, not a short chain.
  const s2 = scratchStore();
  const orphan = s2.append(draft({ parentEventId: "a".repeat(32) }));
  assert.equal(s2 && createAuditReader({ store: s2, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor }).parentChain(orphan.event.eventId).code, "PARENT_NOT_FOUND");
  // CONTROL, PROVED CAPABLE: a reference that DOES resolve comes back OK on the same call.
  const s3 = scratchStore();
  const good = s3.append(draft({ evidenceRefs: [refForEntry(OBSERVED)] }));
  assert.equal(createAuditReader({ store: s3, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor }).byId(good.event.eventId).event.evidence[0].status, "OK");
});

test("P27 · the declared TIME RULE is enforced — three worlds, and silent acceptance is not one of them", () => {
  const store = scratchStore();
  // REFUSED: absent, malformed, not UTC, or in the future.
  assert.ok(codesFor(store, draft({ occurredAt: null })).includes("OCCURRED_AT_ABSENT"));
  assert.ok(codesFor(store, draft({ occurredAt: "yesterday" })).includes("OCCURRED_AT_MALFORMED"));
  assert.ok(codesFor(store, draft({ occurredAt: "2026-09-22T10:00:00+02:00" })).includes("OCCURRED_AT_MALFORMED"));
  assert.ok(codesFor(store, draft({ occurredAt: isoSeconds(Date.now() + 3600_000) })).includes("OCCURRED_AT_IN_FUTURE"));
  // VALID.
  const ok = store.append(draft({ occurredAt: at(120) }));
  assert.equal(ok.event.metadata.timeAnomaly, undefined);
  // RECORDED-WITH-ANOMALY-FLAG: earlier than the previous event, flagged by the store AND SHOWN by the reader.
  const older = store.append(draft({ action: "OLDER", occurredAt: at(600) }));
  assert.equal(older.event.metadata.timeAnomaly, "OUT_OF_ORDER_OCCURRED_AT");
  const reader = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor });
  assert.equal(reader.byId(older.event.eventId).event.timeAnomaly, "OUT_OF_ORDER_OCCURRED_AT");
  // CONTROL, PROVED CAPABLE: the reader shows null for the in-order event, so the flag is not printed for everything.
  assert.equal(reader.byId(ok.event.eventId).event.timeAnomaly, null);
});

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * P28–P34 · MIGRATION, POPULATIONS, FAIL-CLOSED, NEUTRALITY
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("P28 · a migrated event is distinguishable from a native one in EVERY read path", () => {
  const store = scratchStore();
  const native = store.append(draft({ action: "NATIVE_ONE", correlationId: "m1" }));
  const migrated = store.append(draft({
    action: "MIGRATED_ONE", correlationId: "m1", occurredAt: at(30),
    migration: true, migrationSource: "fboard-declaration:F05:VERIFIED", migratedAt: at(1),
  }));
  const reader = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor });
  const paths = [
    reader.byId(migrated.event.eventId).event,
    reader.all().events.find((e) => e.eventId === migrated.event.eventId),
    reader.byCorrelation("m1").events.find((e) => e.eventId === migrated.event.eventId),
    reader.parentChain(migrated.event.eventId).chain[0],
  ];
  for (const v of paths) {
    assert.equal(v.migrationStatus, "MIGRATED");
    assert.equal(v.migrationSource, "fboard-declaration:F05:VERIFIED");
    assert.match(v.migrationNote, /does not prove the original action was correct/);
  }
  // CONTROL, PROVED CAPABLE: the native event says NATIVE on every one of the same paths.
  assert.equal(reader.byId(native.event.eventId).event.migrationStatus, "NATIVE");
  assert.equal(reader.byId(native.event.eventId).event.migrationNote, null);
  // And a half-declared migration is refused rather than recorded ambiguously.
  assert.ok(codesFor(store, draft({ migration: true, migrationSource: null, migratedAt: at(1) })).includes("MIGRATION_SOURCE_ABSENT"));
  assert.ok(codesFor(store, draft({ migration: false, migrationSource: "x" })).includes("MIGRATION_SOURCE_ON_NATIVE"));
});

test("P29 · migration accounting reconciles to a ZERO remainder, and NOT_MIGRATABLE is proved capable of firing", () => {
  const store = scratchStore();
  const good = { family: "B", sourceId: "ok", draft: { ...draft(), authorityHash: undefined } };
  const bad = { family: "B", sourceId: "bad", draft: { ...draft(), authorityHash: undefined, authorityRef: { propositionId: "NOT_A_PROPOSITION", scope: ["ALMIVISIBILITY"] } } };
  const refused = { family: "B", sourceId: "refused", draft: { ...draft(), actor: null } };
  const already = { family: "B", sourceId: "ok-again", draft: { ...draft(), authorityHash: undefined } };
  const out = recordCandidates({ store, candidates: [good, bad, refused, already], corpus: AUTHORITY_CORPUS, excluded: [{ sourceId: "x7", why: "read-only diagnostic" }] });
  assert.equal(out.counts.realCandidateEvents, 5);
  assert.equal(out.counts.migrated, 1);
  assert.equal(out.counts.alreadyAudited, 1);
  assert.equal(out.counts.notMigratable, 1);
  assert.equal(out.counts.invalid, 1);
  assert.equal(out.counts.excluded, 1);
  assert.equal(out.remainder, 0);
});

test("P30 · at least one REAL event exists for every family this feature integrated", () => {
  const events = productionAuditStore({ repo: REPO_ROOT, forbiddenSubstrings: [] }).readAll().events;
  const byFamily = {};
  for (const e of events) byFamily[e.metadata?.family ?? "?"] = (byFamily[e.metadata?.family ?? "?"] ?? 0) + 1;
  for (const f of ["A", "B", "C", "D", "E", "T"]) assert.ok((byFamily[f] ?? 0) > 0, `family ${f} has no real event in the committed trail (${JSON.stringify(byFamily)})`);
  // Real, not fixtures: every family-A event names a committed governance blob, and every family-B event an F-row.
  assert.ok(events.filter((e) => e.metadata?.family === "A" && e.metadata?.authorityBlob).length > 0);
  assert.ok(events.filter((e) => e.metadata?.family === "B" && /^F\d\d$/.test(e.metadata?.featureId ?? "")).length > 0);
  // And the committed trail holds both kinds, so no limb rests on migrated events alone.
  assert.ok(events.some((e) => e.migration === true) && events.some((e) => e.migration === false));
});

test("P31 · audit records carry ZERO protected payload and ZERO client or product identifiers", () => {
  const raw = readFileSync(join(REPO_ROOT, AUDIT_STORE.eventsPath), "utf8");
  // 🔴 THE CONTROL SHARES THE RULE'S CODE: PRODUCT_WORDS is imported from tools/product-boundary.mjs, never copied.
  const hits = PRODUCT_WORDS.filter((w) => new RegExp(w, "i").test(raw));
  assert.deepEqual(hits, [], `the committed audit trail names ${hits.length} product word class(es)`);
  // A declared tenant's LABEL (which carries hosts) never reaches the trail either — only the opaque id does.
  assert.equal(/almiworld\.com/i.test(raw), false, "a client host reached the audit trail");
  // CONTROL, PROVED CAPABLE: the same scan FIRES on a line that does carry one.
  assert.ok(PRODUCT_WORDS.filter((w) => new RegExp(w, "i").test('{"metadata":{"resourceRef":"almi-oet/facts"}}')).length > 0);
});

test("P32 · no historical 61/38 state produces an F08 pass or affects F-progress", () => {
  const events = productionAuditStore({ repo: REPO_ROOT, forbiddenSubstrings: [] }).readAll().events;
  for (const e of events) {
    assert.notEqual(e.metadata?.board, "HISTORICAL_61");
    assert.notEqual(e.metadata?.board, "HISTORICAL_38");
  }
  // Every board event this trail carries names the ACTIVE board, and F08's own row reached only ACCEPTANCE-FROZEN.
  const boardEvents = events.filter((e) => e.eventType === "BOARD_TRANSITION");
  assert.ok(boardEvents.length > 0);
  for (const e of boardEvents) assert.equal(e.metadata.board, "F_BOARD");
  /* 🔴 VERIFIED-PASS SINCE THE BOARD RECONCILIATION — AND THE POINT OF THIS PROOF IS UNCHANGED.
   * This assertion read IN-PROGRESS while F08's own pull request was open, because a tick needs a merge and a green
   * main CI run and neither existed then. Both now exist and PREDATE the movement (PR #142, merged 5630617, main CI
   * 35784138199 green on that exact SHA), so the state moved. What this proof is about never changed: whatever the
   * state is, NO HISTORICAL ROW MAY HAVE SUPPLIED IT. So the state is asserted exactly, the pass is required to
   * stand on a verification recorded UNDER F08 over the REAL population, and every historical channel is refused. */
  assert.equal(DECLARED.F08.state, "VERIFIED-PASS");
  assert.equal(DECLARED.F08.board, "F_BOARD");
  assert.equal(Object.hasOwn(DECLARED.F08, "historicalState"), false);
  const verified = DECLARED.F08.events.find((e) => e.kind === "VERIFIED");
  assert.ok(verified, "F08 is VERIFIED-PASS with no verification event");
  assert.equal(verified.featureId, "F08", "the verification was recorded under another row");
  assert.equal(verified.population, "REAL", "the verification was not over the real population");
  assert.equal(verified.mergedSha, "56306175337b44ba51d203fdfa91a4c533d0fc9a");
  assert.equal(verified.ciConclusion, "success");
});

test("P33 · a governed state-changing action FAILS CLOSED when the audit append fails", () => {
  // The real integrated caller, with a store that refuses everything. Nothing is returned; it throws.
  const refusing = createAuditStore({
    eventsPath: join(mkdtempSync(join(REPO_ROOT, ".test-scratch", "f08-fc-")), "events.jsonl"),
    headPath: join(mkdtempSync(join(REPO_ROOT, ".test-scratch", "f08-fc-")), "head.json"),
    evidenceEntryFor, isSealedRef,
    appendLine: () => { throw new Error("the audit store is unavailable"); },
  });
  assert.throws(
    () => auditAuthorityMigration({
      store: refusing, records: AUTHORITY_CORPUS, provenance: { governanceCommit: "g", engineCommit: "e", now: NOW },
      permission: writePermission({ target: LOCAL, argv: ["--confirm"], env: {} }), counts: { CURRENT: 1, INVALID: 0 },
      softwareVersion: SW, actor: "test", argv: ["--confirm"], env: {},
    }),
    /the audit store is unavailable/,
  );
  // And when the authority itself does not resolve, it refuses BEFORE touching the store.
  assert.throws(
    () => auditAuthorityMigration({
      store: scratchStore(), records: [], provenance: { governanceCommit: "g", engineCommit: "e", now: NOW },
      permission: writePermission({ target: LOCAL, argv: ["--confirm"], env: {} }), counts: {},
      softwareVersion: SW, actor: "test", argv: ["--confirm"], env: {},
    }),
    /AUDIT_REFUSED: the migration's governing authority resolves ABSENT/,
  );
  // 🔴 CONTROL, PROVED CAPABLE: the SAME call with a working store returns, so the throw is about the failure.
  const working = scratchStore();
  const r = auditAuthorityMigration({
    store: working, records: AUTHORITY_CORPUS, provenance: { governanceCommit: "g", engineCommit: "e", now: NOW },
    permission: writePermission({ target: LOCAL, argv: ["--confirm"], env: {} }), counts: { CURRENT: 62, INVALID: 20 },
    softwareVersion: SW, actor: "test", argv: ["--confirm"], env: {},
  });
  assert.equal(r.status, "APPENDED");
  assert.equal(working.readAll().events.length, 3);
  // The write-gate decision was recorded once, with the REAL answer the write law gave — including its refusal.
  const gates = working.readAll().events.filter((e) => e.eventType === "WRITE_GATE_DECISION");
  assert.deepEqual(gates.map((e) => e.outcome), ["ALLOWED", "REFUSED"]);
  assert.equal(writePermission({ target: PRODUCTION, argv: ["--confirm"], env: {} }).mayWrite, false);
});

test("P33b · the audited caller FAILS CLOSED BY CONSTRUCTION — the append is called before the governed write, and nothing catches it", () => {
  const text = readFileSync(join(REPO_ROOT, "bin/authority-migrate.mjs"), "utf8").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const open = lines.findIndex((l) => l.startsWith("if (permission.mayWrite) {"));
  const close = lines.findIndex((l, i) => i > open && l === "} else {");
  assert.ok(open >= 0 && close > open, "the write law's granted branch could not be found in the audited caller");
  const block = lines.slice(open, close);
  const auditAt = block.findIndex((l) => /^\s*auditMigration\(/.test(l));
  const writeAt = block.findIndex((l) => /^\s*writeFileSync\(OUT/.test(l));
  assert.ok(auditAt >= 0, "the granted branch does not record the decision at all");
  assert.ok(writeAt > auditAt, "the governed write does not come AFTER the audit append");
  // 🔴 NOTHING CATCHES. A try/catch here would let the corpus be written after the trail refused it.
  assert.equal(block.some((l) => /\b(try|catch)\b/.test(l) && !/^\s*(\*|\/\/)/.test(l)), false, "the granted branch catches — the write could proceed after a failed append");
});

test("P34 · the declared store location and format are product-neutral, and the store is where it says it is", () => {
  for (const segment of [AUDIT_STORE.eventsPath, AUDIT_STORE.headPath, AUDIT_STORE.format, AUDIT_STORE.repository]) {
    const hits = PRODUCT_WORDS.filter((w) => new RegExp(w, "i").test(segment));
    assert.deepEqual(hits, [], `${segment} names a product word`);
  }
  assert.equal(AUDIT_STORE.repository, "engine");
  assert.ok(readFileSync(join(REPO_ROOT, AUDIT_STORE.eventsPath), "utf8").length > 0);
  // The store is inside THIS repository, and a path outside it is refused before a byte (write-law confinement).
  const tracked = execFileSync("git", ["ls-files", AUDIT_STORE.eventsPath], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  assert.equal(tracked, AUDIT_STORE.eventsPath, "the declared store is not tracked where it says it is");
});

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * THE REAL COMMITTED TRAIL, AND THE SCHEMA ITSELF
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("🔴 the COMMITTED audit trail verifies, in field order, with its head record and within its declared ceiling", () => {
  const store = productionAuditStore({ repo: REPO_ROOT, forbiddenSubstrings: [] });
  const v = store.verify();
  assert.deepEqual(v.findings, []);
  assert.equal(v.ok, true);
  const size = store.sizeReport();
  assert.ok(size.events > 0);
  assert.equal(size.withinCeiling, true, `${size.bytes} bytes exceeds the declared ceiling ${size.ceilingBytes}`);
  for (const e of store.readAll().events) {
    assert.deepEqual(Object.keys(e), [...FIELD_ORDER]);
    assert.ok(EVENT_TYPES.includes(e.eventType));
    assert.equal(e.auditVersion, AUDIT_VERSION);
  }
});

test("🔴 the canonical form is deterministic, and the fingerprint ignores exactly the fields the STORE decides", () => {
  const a = { z: 1, a: [3, { y: 2, x: 1 }] };
  const b = { a: [3, { x: 1, y: 2 }], z: 1 };
  assert.equal(canonicalJson(a), canonicalJson(b));
  const store = scratchStore();
  const e = store.append(draft()).event;
  const moved = { ...e, recordedAt: at(0), previousEventHash: "f".repeat(64), eventHash: "f".repeat(64), migratedAt: at(0) };
  assert.equal(contentFingerprint(moved), contentFingerprint(e));
  assert.notEqual(contentFingerprint({ ...e, outcome: "ALLOWED" }), contentFingerprint(e));
});

test("🔴 F08's acceptance is the one the governance repository committed, and the board carries only the frozen event", () => {
  const acc = ACCEPTANCES.F08;
  assert.equal(acc.ruling.repo, "_handoffs");
  assert.equal(acc.ruling.sha256, "f6aef3403621f7275b2a2173da4c66cd562a400a9e581fc48c3f13c87981d18a");
  assert.equal(acc.contractSha256, "92d20a631da004bf6de5accd4df87df933ca99d0c9661bc49f8d9b8361b2a826");
  /* 🔴 RE-DERIVED, NOT JUST COMPARED TO ITS OWN PIN. The sabotage set found this hole: changing a CLAUSE while
   * leaving the pinned hash alone left this test green, because it only checked the literal against itself. The
   * board's own check re-derives; so does this one now. */
  assert.equal(contractSha256(acc), acc.contractSha256, "a frozen clause was altered: the four clauses no longer hash to the contract the ruling froze");
  /* The lawful order, asserted exactly: the acceptance is frozen FIRST, implementation follows it, and the
   * verification comes last. The board refuses the other orders by code (IMPLEMENTATION_BEFORE_ACCEPTANCE,
   * PASS_WITHOUT_VERIFICATION); this pins the sequence the row actually carries. */
  assert.deepEqual(DECLARED.F08.events.map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "VERIFIED"]);
  assert.equal(DECLARED.F08.events[1].after, "ACCEPTANCE_FROZEN");
  assert.equal(DECLARED.F08.events[2].from, "IN-PROGRESS");
  assert.equal(DECLARED.F08.events[2].to, "VERIFIED-PASS");
  assert.equal(DECLARED.F08.events[0].contractSha256, acc.contractSha256);
});

test("🔴 the added TENANT population comes from the DECLARED source, and stores a hash of the reference, never the reference", () => {
  const refHash = (s) => createHash("sha256").update(String(s), "utf8").digest("hex");
  const cands = familyTCandidates({
    attachments: DECLARATIONS.attachments, resolveScope: resolver, refHash,
    softwareVersion: SW, correlationId: "t", occurredAt: at(10),
    authorityRef: { propositionId: "OWNER_RULING_TENANT_RESOURCE_ATTACHMENTS", scope: ["ALMIVISIBILITY"] },
  });
  assert.equal(cands.length, DECLARATIONS.attachments.length);
  const serialised = JSON.stringify(cands);
  for (const a of DECLARATIONS.attachments) {
    assert.equal(serialised.includes(a.resourceRef), false, "a declared resource reference reached the audit event");
    assert.equal(serialised.includes(refHash(a.resourceRef)), true);
  }
  assert.ok(cands.some((c) => c.draft?.scopeType === "TENANT"));
  assert.ok(cands.some((c) => c.draft?.scopeType === "SUBJECT"));
});

test("🔴 an appended event never carries an undeclared field, and a store with no path refuses to exist", () => {
  const store = scratchStore();
  assert.ok(codesFor(store, { ...draft(), somethingElse: 1 }).includes("FIELD_UNDECLARED"));
  assert.throws(() => createAuditStore({ eventsPath: "", headPath: "x" }), /never chooses one for itself/);
  assert.throws(() => createAuditStore({ eventsPath: "x" }), /head-record path/);
});

test("🔴 a store whose FINAL line is truncated refuses to be appended to, and reports MALFORMED_TAIL", () => {
  const store = chainOf(2);
  appendFileSync(store.eventsPath, '{"auditVersion":1,"eventId":"deadbe', "utf8");
  assert.ok(store.verify().findings.some((f) => f.code === "MALFORMED_TAIL" || f.code === "MALFORMED_LINE"));
  assert.ok(codesFor(store, draft({ action: "ONTO_DAMAGE" })).includes("MALFORMED_TAIL"));
  const reader = createAuditReader({ store, authorityRecords: AUTHORITY_CORPUS, now: NOW, evidenceEntryFor });
  assert.equal(reader.all().status, "INVALID");
  assert.equal(reader.all().code, "CHAIN_INVALID");
});
