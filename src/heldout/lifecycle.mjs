/**
 * 🔴 F07 §5.2–§5.5 · THE HELD-OUT EVALUATION LIFECYCLE — FREEZE, THEN ACCESS, THEN A COMPLETE SCORE (23 September 2026).
 *
 * Product-neutral: it knows sealed-set identifiers, mechanism identifiers and hashes, and counts. It never sees, stores or
 * reports a held-out item's content, label or expected answer.
 *
 * ── ONE AUDIT SYSTEM ────────────────────────────────────────────────────────
 * Every step is a metadata-only `EVALUATION` event appended to the F08 audit store it is handed (the production trail, or
 * the confined store in a verified test context). "Has this set been seen?", "is this a rerun?" and "was the mechanism
 * frozen?" are all answered FROM THE TRAIL. There is no second ledger to drift from the first.
 *
 * ── THE RULES ───────────────────────────────────────────────────────────────
 *   · An access request must name all eight: mechanism id, mechanism hash, sealed-set id, the set's population
 *     commitment, scoring protocol, evaluator authority, access purpose and timestamp. Any missing → REFUSED.
 *   · Only a registry entry of role HELD_OUT_EVIDENCE that permits evaluation is an evaluation set. A RETIRED population,
 *     a SEALED store readable only by its own evaluation, or an undeclared id → REFUSED, and recorded.
 *   · The exact mechanism (id AND hash) must have been FROZEN — recorded in the trail — at or before the request.
 *   · The first ALLOWED access to a set is its only UNTOUCHED access. Afterwards the set is SEEN: the same mechanism is
 *     a RERUN, a changed mechanism is an AFTER_MECHANISM_CHANGE access, and neither is ever untouched.
 *   · A score is refused if the mechanism changed after access (the evaluation is INVALIDATED, and recorded so); every
 *     declared item must be accounted for (remainder 0); UNKNOWN and UNAVAILABLE are never PASS and never dropped; an
 *     exclusion needs a declared reason.
 *   · A report says whether it is untouched, and `presentAsUntouched` refuses one that is not.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHORITY_CORPUS } from "../../config/authority/corpus.mjs";
import { classifySealed } from "../governance/sealed-paths.mjs";
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";
import { isoSeconds } from "../audit-trail/store.mjs";
import { metadataFaults } from "../audit-trail/event.mjs";
import { auditClassOf, isDurableDecision } from "../governance/guard-audit.mjs";
import { contentHashOf, sameTenantScope } from "../governance/evidence-roles.mjs";

export const EVALUATION_ACTIONS = Object.freeze({
  FROZEN: "HELDOUT_MECHANISM_FROZEN",
  ACCESS: "HELDOUT_ACCESS",
  INVALIDATED: "HELDOUT_EVALUATION_INVALIDATED",
  SCORED: "HELDOUT_EVALUATION_SCORED",
});
export const ACCESS_STATUS = Object.freeze(["FIRST_ACCESS", "RERUN", "AFTER_MECHANISM_CHANGE", "SET_PREVIOUSLY_ACCESSED"]);
export const REQUIRED_REQUEST_FIELDS = Object.freeze(["mechanismId", "mechanismHash", "sealedSetId", "populationCommitment", "protocolId", "evaluatorAuthority", "purpose", "at"]);
export const VERDICTS = Object.freeze(["PASS", "FAIL", "REFUSED", "UNAVAILABLE", "INVALID", "UNKNOWN", "EXCLUDED"]);
/** The only lawful reasons to leave an item unscored. A reason outside this list is not a reason. */
export const EXCLUSION_REASONS = Object.freeze(["ITEM_WITHDRAWN_BY_RULING", "ITEM_OUT_OF_PROTOCOL_SCOPE", "ITEM_DUPLICATE_OF_DECLARED_ITEM"]);

const HEX64 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9:._-]{1,80}$/;

export class HeldOutRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "HeldOutRefused"; this.code = code; }
}

/** The mechanism's immutable identity: sha256 over its files' names and raw-byte hashes, sorted. Content never leaves. */
export function mechanismHash(files) {
  const lines = Object.entries(files).map(([name, bytes]) => `${name}\u0000${createHash("sha256").update(Buffer.from(bytes)).digest("hex")}`).sort();
  return createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");
}

/** A sealed set's population commitment: sha256 over its item IDENTIFIERS (never their content), sorted, LF-joined. */
export const populationCommitment = (itemIds) => createHash("sha256").update([...itemIds].map(String).sort().join("\n"), "utf8").digest("hex");

const eventsOf = (audit) => audit.store.readAll().events.filter((e) => e.eventType === "EVALUATION" && e.metadata?.family === "H");

function emit(audit, { action, outcome, reasonCode, metadata, occurredAt, identityExtra }) {
  const md = { family: "H", ...metadata };
  const faults = metadataFaults(md);
  if (faults.length) throw new HeldOutRefused("EVALUATION_EVENT_NOT_METADATA_ONLY", faults.map((f) => f.code).join(","));
  const draft = {
    eventType: "EVALUATION", action, outcome, reasonCode, occurredAt,
    actor: audit.actor, actorType: "ENGINE", scopeType: "GLOBAL_PRODUCT", tenantId: null, subjectId: null,
    authorityRef: audit.authorityRef, authorityHash: audit.authorityHash, softwareVersion: audit.softwareVersion,
    evidenceRefs: [], correlationId: audit.correlationId, parentEventId: null,
    migration: false, migrationSource: null, migratedAt: null, metadata: md,
  };
  /* The SAME derivation the guard sink applies (guard-audit.mjs `auditClassOf`). Every lifecycle step is an ACCESS or a
   * GOVERNED_CHANGE, so each is durable; should the derivation ever call one a classification, this refuses rather
   * than let an access pass unrecorded. */
  if (!isDurableDecision(draft)) throw new HeldOutRefused("EVALUATION_EVENT_NOT_DURABLE", `${action} was derived ${auditClassOf(draft)} — an access or governed change is never kept off the trail`);
  /* One decision, one event: the identity carries the run, the instant, the action and a sequence over what the trail
   * already holds for this action — so two decisions in one second are two events (the F08 guard lesson). */
  const seq = eventsOf(audit).filter((e) => e.action === action).length + 1;
  return audit.store.append(draft, { identity: { action, occurredAt, correlationId: audit.correlationId, seq, ...identityExtra } });
}

/** Append a run's write-gate decision drafts (built by `writeGateEvent`) to the audit store it is handed — nothing else. */
export function recordGateDecisions({ audit, drafts }) {
  return drafts.map((d) => audit.store.append(d));
}

/** Freeze a mechanism: record its id and hash BEFORE any held-out access. */
export function freezeMechanism({ audit, mechanismId, mechanismHash: hash, frozenAt = isoSeconds(Date.now()) }) {
  if (!SAFE_ID.test(String(mechanismId ?? ""))) throw new HeldOutRefused("MECHANISM_ID_INVALID", "a mechanism id is a short safe identifier");
  if (!HEX64.test(String(hash ?? ""))) throw new HeldOutRefused("MECHANISM_HASH_INVALID", "a mechanism hash is a sha256");
  const r = emit(audit, { action: EVALUATION_ACTIONS.FROZEN, outcome: "RECORDED", reasonCode: "MECHANISM_FROZEN", occurredAt: frozenAt, metadata: { mechanismId, mechanismHash: hash } });
  return { eventId: r.event.eventId, mechanismId, mechanismHash: hash, frozenAt };
}

/** The declared evaluation set, or the reason there is none. */
function evaluationSet(registry, sealedSetId) {
  const e = (registry ?? []).find((x) => x.id === sealedSetId);
  if (!e) return { refuse: "SET_UNDECLARED" };
  if (e.role === "RETIRED_CONTAMINATED") return { refuse: "SET_RETIRED_CONTAMINATED" };
  if (e.role !== "HELD_OUT_EVIDENCE" || e.mayEvaluate !== true || e.sealed !== true) return { refuse: "SET_NOT_AN_EVALUATION_SET" };
  return { entry: e };
}

/**
 * Request access to a held-out set. EVERY request is recorded — refused or allowed — before anything is returned.
 * @returns {{ allowed: boolean, code: string, status: string|null, untouched: boolean, eventId: string, request: object }}
 */
export function requestHeldOutAccess({ audit, registry, request, authorityRecords = AUTHORITY_CORPUS }) {
  const r = request ?? {};
  const at = typeof r.at === "string" && !Number.isNaN(Date.parse(r.at)) ? isoSeconds(Date.parse(r.at)) : isoSeconds(Date.now());
  /* F07 Amendment 2: a request that names a marking key asks for a LINKED grant — every linked field is then required, and
   * all of them are bound into the grant's own recorded event. A request naming no key is exactly what it always was. */
  const linked = LINKED_REQUEST_FIELDS.some((k) => r[k] !== undefined);
  const base = {
    mechanismId: SAFE_ID.test(String(r.mechanismId ?? "")) ? r.mechanismId : "INVALID",
    mechanismHash: HEX64.test(String(r.mechanismHash ?? "")) ? r.mechanismHash : "INVALID",
    sealedSetId: SAFE_ID.test(String(r.sealedSetId ?? "")) ? r.sealedSetId : "INVALID",
    protocolId: SAFE_ID.test(String(r.protocolId ?? "")) ? r.protocolId : "INVALID",
    purpose: SAFE_ID.test(String(r.purpose ?? "")) ? r.purpose : "INVALID",
    role: SAFE_ID.test(String(r.role ?? "")) ? r.role : "evaluator",
    ...(linked ? {
      keySetId: SAFE_ID.test(String(r.keySetId ?? "")) ? r.keySetId : "INVALID",
      keyCommitment: HEX64.test(String(r.keyCommitment ?? "")) ? r.keyCommitment : "INVALID",
      scorerId: SAFE_ID.test(String(r.scorerId ?? "")) ? r.scorerId : "INVALID",
      scorerHash: HEX64.test(String(r.scorerHash ?? "")) ? r.scorerHash : "INVALID",
      evaluatorAuthority: SAFE_ID.test(String(r.evaluatorAuthority?.propositionId ?? "")) ? r.evaluatorAuthority.propositionId : "INVALID",
    } : {}),
  };
  const refuse = (code) => {
    const ev = emit(audit, { action: EVALUATION_ACTIONS.ACCESS, outcome: "REFUSED", reasonCode: code, occurredAt: at, metadata: { ...base, accessStatus: "REFUSED", untouched: "false" } });
    return { allowed: false, code, status: null, untouched: false, eventId: ev.event.eventId, request: base };
  };

  const missing = REQUIRED_REQUEST_FIELDS.filter((k) => r[k] === undefined || r[k] === null || r[k] === "" || (k === "evaluatorAuthority" && !r[k]?.propositionId));
  if (missing.length) return refuse("FREEZE_DECLARATION_INCOMPLETE");
  if (Object.values(base).includes("INVALID")) return refuse("REQUEST_FIELD_INVALID");

  const set = evaluationSet(registry, r.sealedSetId);
  if (set.refuse) return refuse(set.refuse);
  if (set.entry.contentHash !== r.populationCommitment) return refuse("POPULATION_COMMITMENT_MISMATCH");
  if (linked) {
    const why = linkedPairRefusal(registry, set.entry, r);
    if (why) return refuse(why);
    base.scopeDigest = scopeDigestOf(set.entry);
  }

  const res = resolveAuthority({ records: authorityRecords, propositionId: r.evaluatorAuthority.propositionId, scope: r.evaluatorAuthority.scope ?? [], now: at.slice(0, 10) });
  if (!permits(res)) return refuse("EVALUATOR_AUTHORITY_NOT_CURRENT");

  const trail = eventsOf(audit);
  const frozen = trail.filter((e) => e.action === EVALUATION_ACTIONS.FROZEN && e.metadata.mechanismId === r.mechanismId);
  if (!frozen.some((e) => e.metadata.mechanismHash === r.mechanismHash && e.occurredAt <= at)) {
    /* Three different refusals, named apart: never frozen · this exact hash frozen only AFTER the request · only other
     * hashes of this mechanism frozen. The first draft called the second "hash not frozen", which it was not. */
    const sameHash = frozen.filter((e) => e.metadata.mechanismHash === r.mechanismHash);
    return refuse(frozen.length === 0 ? "MECHANISM_NOT_FROZEN" : sameHash.length ? "MECHANISM_FROZEN_AFTER_REQUEST" : "MECHANISM_HASH_NOT_FROZEN");
  }
  /* F07 Amendment 2: a linked grant also binds a FROZEN scorer — the same freeze record, under the scorer's own id. */
  if (linked && !trail.some((e) => e.action === EVALUATION_ACTIONS.FROZEN && e.metadata.mechanismId === r.scorerId && e.metadata.mechanismHash === r.scorerHash && e.occurredAt <= at)) return refuse("SCORER_NOT_FROZEN");

  const prior = trail.filter((e) => e.action === EVALUATION_ACTIONS.ACCESS && e.outcome === "ALLOWED" && e.metadata.sealedSetId === r.sealedSetId);
  const status = prior.length === 0 ? "FIRST_ACCESS"
    : prior.some((e) => e.metadata.mechanismId === r.mechanismId && e.metadata.mechanismHash === r.mechanismHash) ? "RERUN"
    : prior.some((e) => e.metadata.mechanismId === r.mechanismId) ? "AFTER_MECHANISM_CHANGE"
    : "SET_PREVIOUSLY_ACCESSED";
  const untouched = status === "FIRST_ACCESS";
  const ev = emit(audit, { action: EVALUATION_ACTIONS.ACCESS, outcome: "ALLOWED", reasonCode: `ACCESS_${status}`, occurredAt: at, metadata: { ...base, accessStatus: status, untouched: String(untouched) } });
  return { allowed: true, code: `ACCESS_${status}`, status, untouched, eventId: ev.event.eventId, request: base };
}

/**
 * Score an evaluation over its COMPLETE declared population. Refused — and the evaluation INVALIDATED on the trail — if
 * the mechanism changed after access. Counts only; no item's content, label or answer is ever in the report.
 */
export function scoreHeldOutEvaluation({ audit, grant, currentMechanismHash, declaredItems, outcomes }) {
  if (!grant?.allowed) throw new HeldOutRefused("NO_ACCESS_GRANT", "scoring requires an allowed, recorded access");
  const at = isoSeconds(Date.now());
  const meta = { mechanismId: grant.request.mechanismId, mechanismHash: grant.request.mechanismHash, sealedSetId: grant.request.sealedSetId };
  if (currentMechanismHash !== grant.request.mechanismHash) refuseChangedMechanism(audit, grant, at, meta);
  const counts = Object.fromEntries(VERDICTS.map((v) => [v, 0]));
  const faults = [];
  const declared = [...new Set(declaredItems.map(String))];
  for (const id of declared) {
    const o = outcomes.get(id);
    if (!o) { faults.push("ITEM_UNACCOUNTED"); continue; }
    if (!VERDICTS.includes(o.verdict)) { faults.push("VERDICT_UNDECLARED"); continue; }
    if (o.verdict === "EXCLUDED" && !EXCLUSION_REASONS.includes(o.reason)) { faults.push("EXCLUSION_WITHOUT_LAWFUL_REASON"); continue; }
    counts[o.verdict] += 1;
  }
  const extra = [...outcomes.keys()].filter((k) => !declared.includes(k)).length;
  if (extra) faults.push("OUTCOME_FOR_UNDECLARED_ITEM");
  const accounted = VERDICTS.reduce((n, v) => n + counts[v], 0);
  const report = {
    sealedSetId: meta.sealedSetId, mechanismId: meta.mechanismId, mechanismHash: meta.mechanismHash,
    declared: declared.length,
    scored: counts.PASS + counts.FAIL, pass: counts.PASS, fail: counts.FAIL,
    refused: counts.REFUSED, unavailable: counts.UNAVAILABLE, invalid: counts.INVALID,
    unscoredWithReason: counts.UNKNOWN + counts.EXCLUDED, unknown: counts.UNKNOWN, excluded: counts.EXCLUDED,
    remainder: declared.length - accounted,
    untouched: grant.untouched, accessStatus: grant.status,
    label: grant.untouched ? "UNTOUCHED HELD-OUT EVALUATION" : `NOT AN UNTOUCHED HELD-OUT EVALUATION — ${grant.status}`,
  };
  if (faults.length || report.remainder !== 0) {
    emit(audit, { action: EVALUATION_ACTIONS.SCORED, outcome: "INVALID", reasonCode: "POPULATION_NOT_ACCOUNTED", occurredAt: at, metadata: { ...meta, remainder: String(report.remainder), faults: [...new Set(faults)].join(",").slice(0, 190) } });
    throw new HeldOutRefused("POPULATION_NOT_ACCOUNTED", `${report.remainder} of ${declared.length} declared item(s) unaccounted; ${[...new Set(faults)].join(", ")}`);
  }
  emit(audit, {
    action: EVALUATION_ACTIONS.SCORED, outcome: "RECORDED", reasonCode: grant.untouched ? "SCORED_UNTOUCHED" : "SCORED_NOT_UNTOUCHED", occurredAt: at,
    metadata: { ...meta, declared: String(report.declared), scored: String(report.scored), pass: String(report.pass), fail: String(report.fail), refused: String(report.refused), unavailable: String(report.unavailable), invalid: String(report.invalid), unscoredWithReason: String(report.unscoredWithReason), remainder: "0", untouched: String(report.untouched), accessStatus: String(grant.status) },
  });
  return report;
}

/**
 * A mechanism change after access, recorded ONCE PER ATTEMPT: the first attempt records the evaluation INVALIDATED;
 * any later attempt against the same grant records a REFUSED access naming that invalidation. One attempt, one event.
 */
function refuseChangedMechanism(audit, grant, at, meta) {
  const already = eventsOf(audit).some((e) => e.action === EVALUATION_ACTIONS.INVALIDATED && e.metadata.accessEventId === grant.eventId);
  if (already) emit(audit, { action: EVALUATION_ACTIONS.ACCESS, outcome: "REFUSED", reasonCode: "MECHANISM_CHANGED_AFTER_ACCESS", occurredAt: at, metadata: { ...meta, accessStatus: "EVALUATION_ALREADY_INVALIDATED", untouched: "false" } });
  else emit(audit, { action: EVALUATION_ACTIONS.INVALIDATED, outcome: "INVALID", reasonCode: "MECHANISM_CHANGED_AFTER_ACCESS", occurredAt: at, metadata: { ...meta, accessEventId: grant.eventId } });
  throw new HeldOutRefused("MECHANISM_CHANGED_AFTER_ACCESS", "the mechanism was modified after held-out access; this evaluation is invalid and is recorded so");
}

/**
 * Read ONE sealed item for a granted evaluation — the only lawful read of a held-out store. Refused, recorded and unread
 * unless: the grant is an allowed, recorded access; the mechanism has not changed since it; and the path lies inside the
 * GRANTED set (classified by the same classifier the ordinary loader uses). Ordinary loaders keep refusing these paths.
 */
export function readHeldOutItem({ audit, grant, currentMechanismHash, registry, root, base, path, read = readFileSync, foreignRoots }) {
  const at = isoSeconds(Date.now());
  const meta = { mechanismId: grant?.request?.mechanismId ?? "NONE", mechanismHash: grant?.request?.mechanismHash ?? "NONE", sealedSetId: grant?.request?.sealedSetId ?? "NONE" };
  const refuse = (code) => {
    emit(audit, { action: EVALUATION_ACTIONS.ACCESS, outcome: "REFUSED", reasonCode: code, occurredAt: at, metadata: { ...meta, accessStatus: "ITEM_READ_REFUSED", untouched: "false" } });
    throw new HeldOutRefused(code, "the held-out item was not read");
  };
  if (!grant?.allowed) refuse("NO_ACCESS_GRANT");
  if (currentMechanismHash !== grant.request.mechanismHash) refuseChangedMechanism(audit, grant, at, meta);
  const v = classifySealed({ registry, root, base, path, ...(foreignRoots ? { foreignRoots } : {}) });
  /* F07 Amendment 2: a LINKED grant covers its two sides — the set and its bound marking key — and nothing else. */
  const sides = [grant.request.sealedSetId, grant.request.keySetId].filter((s) => typeof s === "string" && s !== "INVALID");
  if (!(v.refuse && v.code === "SEALED_PATH_REFUSED" && sides.includes(v.entryId))) refuse("ITEM_OUTSIDE_GRANTED_SET");
  /* 🔴 F07 Amendment 2 · GOVERNED READ: the read is recorded as a durable ACCESS BEFORE the value exists in memory. If the
   * record cannot be made, `emit` throws and the file is never opened. */
  emit(audit, { action: LINKED_ACTIONS.ITEM_READ, outcome: "ALLOWED", reasonCode: v.entryId === grant.request.keySetId ? "KEY_ITEM_READ" : "SET_ITEM_READ", occurredAt: at, metadata: { ...meta, side: v.entryId === grant.request.keySetId ? "MARKING_KEY" : "HELD_OUT_EVIDENCE", readOf: String(v.entryId), grantEventId: String(grant.eventId) } });
  return read(join(base, path));
}

/** A report may be presented as an untouched held-out evaluation ONLY when it is one. */
export function presentAsUntouched(report) {
  if (report?.untouched !== true) throw new HeldOutRefused("NOT_AN_UNTOUCHED_EVALUATION", `this evaluation is ${report?.accessStatus ?? "unknown"} — it may not be presented as untouched`);
  return report;
}

/* ═══ F07 AMENDMENT 2 (governance 051feb9) — THE MARKING-KEY EVALUATOR ═════════════════════════════════════════════════════
 *
 *   LINKED GRANT     requestHeldOutAccess with keySetId + keyCommitment + scorerId + scorerHash binds ONE set to its ONE
 *                    linked, distinct marking key, their commitments, the tenant scope, the evaluator authority and a frozen
 *                    scorer, in the grant's own recorded event (above).
 *   GOVERNED READ    readHeldOutItem (either side, recorded before use) and readHeldOutDerivation (a derived set).
 *   AGGREGATE SCORE  scoreClassification: claims its (set · mechanism · scorer · key) combination on the trail FIRST, reads
 *                    both sides through the two readers above, fails closed on any missing, partial, duplicate, unreadable
 *                    or inconsistent input, and releases count-only per-class TP/FP/FN/TN tables — nothing tied to an item.
 *
 * Generic: the classes and exclusion codes are the protocol's, handed in; nothing here names a subject, class or client.
 */
export const LINKED_ACTIONS = Object.freeze({ ITEM_READ: "HELDOUT_ITEM_READ", CLAIMED: "HELDOUT_SCORING_CLAIMED" });
export const LINKED_REQUEST_FIELDS = Object.freeze(["keySetId", "keyCommitment", "scorerId", "scorerHash"]);
/** The declared ceiling on a protocol: the release must fit one metadata-only audit event (24 keys, src/audit-trail/event.mjs). */
export const MAX_PROTOCOL_TOKENS = 10;
/** Amendment 3 (governance 264c680): a PAIRED protocol releases three more aggregates, so it carries at most SEVEN tokens. */
export const MAX_PAIRED_PROTOCOL_TOKENS = 7;
const TOKEN = /^[A-Z][A-Z0-9_]{0,31}$/;
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/** A marking key's commitment: sha256 over its files' names and CRLF-normalised content hashes, sorted. Content never leaves. */
export function keyCommitment(files) {
  return sha256(Object.entries(files).map(([name, bytes]) => `${name}\u0000${contentHashOf(bytes)}`).sort().join("\n"));
}
/** A fingerprint of the tenant scope a grant binds: FNV-1a 64 over the sorted tenant ids. It is a BINDING fingerprint, not a
 * secret, and it makes no crypto call on purpose — requestHeldOutAccess is a registered audit-store-only primitive, and the
 * verifier (tools/audit-store-primitives.mjs) refuses any write-shaped call it can reach, a hash's `.update(` included. */
export function scopeDigestOf(entry) {
  let h = 0xcbf29ce484222325n;
  for (const byte of Buffer.from([...new Set(entry?.tenantScope ?? [])].sort().join("\n"), "utf8")) { h ^= BigInt(byte); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return h.toString(16).padStart(16, "0");
}

/** Why a requested key may not be bound to this set, or null. Each refusal is named; none is inferred from a name. */
export function linkedPairRefusal(registry, setEntry, r) {
  const k = (registry ?? []).find((x) => x?.id === r.keySetId);
  if (!k) return "MARKING_KEY_UNDECLARED";
  if (k.role !== "MARKING_KEY" || k.sealed !== true) return "MARKING_KEY_NOT_A_KEY";
  if (k.linkedSet !== setEntry.id) return "MARKING_KEY_NOT_LINKED";
  if (JSON.stringify(k.resource) === JSON.stringify(setEntry.resource)) return "MARKING_KEY_NOT_DISTINCT";
  if (!Array.isArray(k.tenantScope) || !Array.isArray(setEntry.tenantScope)) return "TENANT_SCOPE_UNDECLARED";
  if (!sameTenantScope(k, setEntry)) return "PAIR_CROSSES_TENANTS";
  if ((registry ?? []).filter((x) => x?.role === "MARKING_KEY" && x.linkedSet === setEntry.id).length !== 1) return "SET_KEY_AMBIGUOUS";
  if (k.contentHash !== r.keyCommitment) return "MARKING_KEY_COMMITMENT_MISMATCH";
  return null;
}

/**
 * Read a DERIVED held-out set's item identities for a granted evaluation — its registered deriver run inside the boundary,
 * the read recorded BEFORE the deriver runs, and the result checked against the registered commitment.
 */
export function readHeldOutDerivation({ audit, grant, currentMechanismHash, registry, derivers = {}, commitment = populationCommitment }) {
  const at = isoSeconds(Date.now());
  const meta = { mechanismId: grant?.request?.mechanismId ?? "NONE", mechanismHash: grant?.request?.mechanismHash ?? "NONE", sealedSetId: grant?.request?.sealedSetId ?? "NONE" };
  const refuse = (code) => {
    emit(audit, { action: EVALUATION_ACTIONS.ACCESS, outcome: "REFUSED", reasonCode: code, occurredAt: at, metadata: { ...meta, accessStatus: "DERIVATION_READ_REFUSED", untouched: "false" } });
    throw new HeldOutRefused(code, "the derived held-out set was not read");
  };
  if (!grant?.allowed) refuse("NO_ACCESS_GRANT");
  if (currentMechanismHash !== grant.request.mechanismHash) refuseChangedMechanism(audit, grant, at, meta);
  const entry = (registry ?? []).find((x) => x?.id === grant.request.sealedSetId);
  const d = entry?.resource?.derivation;
  if (!d) refuse("SET_NOT_DERIVED");
  if (typeof derivers[d.rule] !== "function") refuse("UNREGISTERED_DERIVATION");
  emit(audit, { action: LINKED_ACTIONS.ITEM_READ, outcome: "ALLOWED", reasonCode: "SET_DERIVATION_READ", occurredAt: at, metadata: { ...meta, side: "HELD_OUT_EVIDENCE", readOf: String(entry.id), grantEventId: String(grant.eventId) } });
  const got = derivers[d.rule](d.observationId) ?? {};
  const items = [...new Set((got.items ?? got.members ?? []).map(String))];
  if (!items.length || commitment(items) !== entry.contentHash) throw new HeldOutRefused("DERIVATION_MISMATCH", "the derivation does not reproduce the registered commitment");
  return items;
}

/**
 * Parse marking-key rows: one JSON object per non-empty line — { item, classes: [...] } or { item, exclusion: CODE }.
 * Returns { rows: Map item → { classes } | { exclusion } } or { fault: CODE }. Never returns or echoes a row's content.
 */
export function parseKeyRows(texts, { classes, exclusions }) {
  const rows = new Map();
  for (const text of texts) {
    for (const raw of String(text).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      let o;
      try { o = JSON.parse(line); } catch { return { fault: "INPUT_UNREADABLE" }; }
      if (!o || typeof o !== "object" || Array.isArray(o) || typeof o.item !== "string" || !o.item) return { fault: "INPUT_UNREADABLE" };
      if (rows.has(o.item)) return { fault: "INPUT_DUPLICATE" };
      const hasC = Object.hasOwn(o, "classes"), hasX = Object.hasOwn(o, "exclusion");
      if (hasC === hasX) return { fault: "INPUT_INCONSISTENT" };
      if (hasX && !exclusions.includes(o.exclusion)) return { fault: "INPUT_INCONSISTENT" };
      if (hasC && !(Array.isArray(o.classes) && o.classes.every((c) => classes.includes(c)) && new Set(o.classes).size === o.classes.length)) return { fault: "INPUT_INCONSISTENT" };
      rows.set(o.item, hasX ? { exclusion: o.exclusion } : { classes: [...o.classes] });
    }
  }
  return { rows };
}

/**
 * Amendment 3 — the PAIR STRUCTURE of a paired set, parsed inside the boundary only and never returned out of it. Every item id
 * is `need>candidate` (a matched pair) or `need>candidate|partnerNeed>candidate` (a re-pair of the SAME candidate with a
 * DIFFERENT need, naming the matched pair it was drawn from). Returns { links: [[rePair, matched], …] } or { fault: CODE }.
 * Faults are codes only — never an id.
 */
const PAIR_ID = /^([^>|]+)>([^>|]+)(?:\|([^>|]+)>([^>|]+))?$/;
export function parsePairStructure(items) {
  const seen = new Set(), parsed = [];
  for (const id of items) {
    const m = PAIR_ID.exec(String(id));
    if (!m) return { fault: "PAIR_STRUCTURE_MALFORMED" };
    const pair = `${m[1]}>${m[2]}`;
    if (seen.has(pair)) return { fault: "PAIR_DUPLICATE" };
    seen.add(pair);
    parsed.push({ id: String(id), need: m[1], candidate: m[2], partnerNeed: m[3], partnerCandidate: m[4] });
  }
  const matched = new Set(parsed.filter((p) => p.partnerNeed === undefined).map((p) => p.id));
  const links = [];
  for (const p of parsed) {
    if (p.partnerNeed === undefined) continue;
    if (p.partnerCandidate !== p.candidate || p.partnerNeed === p.need) return { fault: "PAIR_STRUCTURE_MALFORMED" };
    const partner = `${p.partnerNeed}>${p.partnerCandidate}`;
    if (!matched.has(partner)) return { fault: "PAIR_DANGLING" };
    links.push([p.id, partner]);
  }
  return { links };
}

/** One mechanism answer: { classes: [...] } — or, for a PAIRED protocol only, the explicit ABSTAIN { abstain: true }. Never both. */
const isAbstain = (o) => o?.abstain === true && Object.keys(o).length === 1;
const validAnswer = (o, classes, paired) => (paired && isAbstain(o)) || (!Object.hasOwn(o ?? {}, "abstain") && Array.isArray(o?.classes) && o.classes.every((c) => classes.includes(c)) && new Set(o.classes).size === o.classes.length);

/**
 * 🔴 THE AGGREGATE SCORE. One valid run per frozen (set · mechanism · scorer · key) combination, CLAIMED on the trail before
 * anything is compared. `outputs` is the frozen mechanism's answer for EVERY declared item: Map item → { classes } (an empty
 * list claims no class); for a PAIRED protocol only, { abstain: true } is an explicit ABSTAIN — scored not-positive in every
 * table, counted as an abstention, never as a negative answer. Both sides are read here, through the recorded readers — never
 * handed in. Returns — and records — only counts.
 *
 * Amendment 3 PREFLIGHT: every set-side and key-side input is read and checked BEFORE the claim; a fault is REFUSED and the
 * once-only run stays unspent. A missing or invalid mechanism OUTPUT is checked after the claim: the run is recorded INVALID.
 */
export function scoreClassification({ audit, grant, currentMechanismHash, registry, roots = {}, filesOf, derivers = {}, outputs, protocol, foreignRoots }) {
  const at = isoSeconds(Date.now());
  const req = grant?.request ?? {};
  const meta = { mechanismId: req.mechanismId ?? "NONE", mechanismHash: req.mechanismHash ?? "NONE", sealedSetId: req.sealedSetId ?? "NONE", scorerId: req.scorerId ?? "NONE", scorerHash: req.scorerHash ?? "NONE", keySetId: req.keySetId ?? "NONE" };
  const stop = (outcome, code, extra = {}) => {
    emit(audit, { action: EVALUATION_ACTIONS.SCORED, outcome, reasonCode: code, occurredAt: at, metadata: { ...meta, ...extra } });
    throw new HeldOutRefused(code, `the scoring run was ${outcome === "INVALID" ? "invalidated" : "refused"}; no result was released`);
  };
  if (!grant?.allowed) stop("REFUSED", "NO_ACCESS_GRANT");
  if (typeof req.keySetId !== "string" || req.keySetId === "INVALID" || !HEX64.test(String(req.keyCommitment ?? ""))) stop("REFUSED", "NO_LINKED_GRANT");
  if (currentMechanismHash !== req.mechanismHash) refuseChangedMechanism(audit, grant, at, meta);
  const classes = protocol?.classes ?? [], exclusions = protocol?.exclusions ?? [];
  if (!classes.length || [...classes, ...exclusions].some((t) => !TOKEN.test(String(t))) || new Set([...classes, ...exclusions]).size !== classes.length + exclusions.length || classes.length + exclusions.length > MAX_PROTOCOL_TOKENS) stop("REFUSED", "PROTOCOL_INVALID");
  const paired = protocol?.paired === undefined ? null : protocol.paired;
  if (paired !== null && !(paired && typeof paired === "object" && !Array.isArray(paired) && Object.keys(paired).length === 1 && classes.includes(paired.cls))) stop("REFUSED", "PROTOCOL_INVALID");
  if (paired && classes.length + exclusions.length > MAX_PAIRED_PROTOCOL_TOKENS) stop("REFUSED", "PROTOCOL_INVALID");

  // ── ONE VALID RUN: the combination is claimed BEFORE any comparison; a claim that exists is never made again ──
  const combination = sha256([req.sealedSetId, req.mechanismHash, req.scorerHash, req.keyCommitment].join("\n"));
  if (eventsOf(audit).some((e) => e.action === LINKED_ACTIONS.CLAIMED && e.metadata.combination === combination)) stop("REFUSED", "SCORING_ALREADY_CLAIMED", { combination });
  const refuse = (code) => stop("REFUSED", code, { combination });

  // ── PREFLIGHT (Amendment 3): BOTH SIDES, READ THROUGH THE LIFECYCLE ONLY, AND CHECKED — BEFORE THE CLAIM ──
  const underPrefix = (entry) => {
    const pre = (entry?.resource?.pathPrefixes ?? []).map((p) => String(p).replace(/\\/g, "/").replace(/\/?$/, "/"));
    const root = entry?.resource?.root;
    return { root, base: roots[root], files: typeof filesOf === "function" && pre.length ? filesOf(root).filter((p) => pre.some((x) => p.startsWith(x))) : [] };
  };
  const setEntry = (registry ?? []).find((x) => x?.id === req.sealedSetId);
  const keyEntry = (registry ?? []).find((x) => x?.id === req.keySetId);
  if (!setEntry || !keyEntry) refuse("INPUT_UNREGISTERED");
  let items;
  try {
    if (setEntry.resource?.derivation) items = readHeldOutDerivation({ audit, grant, currentMechanismHash, registry, derivers });
    else {
      const s = underPrefix(setEntry);
      if (!s.base || !s.files.length) refuse("INPUT_UNREADABLE");
      items = [...new Set(s.files.flatMap((p) => String(readHeldOutItem({ audit, grant, currentMechanismHash, registry, root: s.root, base: s.base, path: p, foreignRoots })).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)))];
    }
  } catch (e) { if (e instanceof HeldOutRefused && e.message.includes("no result was released")) throw e; refuse("INPUT_UNREADABLE"); }
  if (populationCommitment(items) !== setEntry.contentHash) refuse("SET_CHANGED_SINCE_REGISTRATION");
  const k = underPrefix(keyEntry);
  if (!k.base || !k.files.length) refuse("INPUT_UNREADABLE");
  const keyBytes = {};
  try { for (const p of k.files) keyBytes[p] = readHeldOutItem({ audit, grant, currentMechanismHash, registry, root: k.root, base: k.base, path: p, foreignRoots }); } catch { refuse("INPUT_UNREADABLE"); }
  if (keyCommitment(keyBytes) !== req.keyCommitment) refuse("KEY_CHANGED_SINCE_GRANT");
  const parsed = parseKeyRows(Object.values(keyBytes).map((b) => Buffer.from(b).toString("utf8")), { classes, exclusions });
  if (parsed.fault) refuse(parsed.fault);
  const itemSet = new Set(items);
  if ([...parsed.rows.keys()].some((i) => !itemSet.has(i))) refuse("INPUT_INCONSISTENT");
  if (items.some((i) => !parsed.rows.has(i))) refuse("INPUT_MISSING");
  const pairs = paired ? parsePairStructure(items) : null;
  if (pairs?.fault) refuse(pairs.fault);

  // ── THE CLAIM: only a complete, consistent set and key reach it ──
  const claim = emit(audit, { action: LINKED_ACTIONS.CLAIMED, outcome: "RECORDED", reasonCode: "SCORING_RUN_CLAIMED", occurredAt: at, metadata: { ...meta, combination, grantEventId: String(grant.eventId) } });
  const invalid = (code) => stop("INVALID", code, { combination, claimEventId: String(claim.event.eventId) });

  // ── THE MECHANISM'S OUTPUTS, CHECKED BEFORE ANY COUNT: a missing or invalid output INVALIDATES the claimed run ──
  if (!(outputs instanceof Map)) invalid("INPUT_UNREADABLE");
  if ([...outputs.keys()].some((i) => !itemSet.has(i))) invalid("INPUT_INCONSISTENT");
  if (items.some((i) => !outputs.has(i))) invalid("INPUT_MISSING");
  if ([...outputs.values()].some((o) => !validAnswer(o, classes, paired))) invalid("INPUT_INCONSISTENT");

  // ── THE TABLES: counts only, over the items the labeller did not exclude; an ABSTAIN is not-positive and counted apart ──
  const excluded = Object.fromEntries(exclusions.map((x) => [x, 0]));
  const tables = Object.fromEntries(classes.map((c) => [c, { tp: 0, fp: 0, fn: 0, tn: 0 }]));
  let denominator = 0, abstentions = 0;
  const positive = (i, c) => !isAbstain(outputs.get(i)) && outputs.get(i).classes.includes(c);
  for (const i of items) {
    const row = parsed.rows.get(i);
    if (row.exclusion) { excluded[row.exclusion] += 1; continue; }
    denominator += 1;
    if (isAbstain(outputs.get(i))) abstentions += 1;
    for (const c of classes) {
      const truth = row.classes.includes(c), guess = positive(i, c);
      tables[c][truth ? (guess ? "tp" : "fn") : (guess ? "fp" : "tn")] += 1;
    }
  }
  // ── Amendment 3, PAIRED only: a discordant unit is a re-pair and its matched pair, both not excluded, judged differently on
  //    the protocol's class; it is correct both ways when the mechanism's positive equals the judgement on BOTH sides ──
  let discordantPairs = 0, discordantBothCorrect = 0;
  for (const [rePair, matched] of pairs?.links ?? []) {
    const a = parsed.rows.get(matched), b = parsed.rows.get(rePair);
    if (a.exclusion || b.exclusion) continue;
    const ta = a.classes.includes(paired.cls), tb = b.classes.includes(paired.cls);
    if (ta === tb) continue;
    discordantPairs += 1;
    if (positive(matched, paired.cls) === ta && positive(rePair, paired.cls) === tb) discordantBothCorrect += 1;
  }
  const evidenceState = denominator > 0 ? "OBSERVED" : "NOT_MEASURED";
  const release = {
    ...meta, combination, claimEventId: String(claim.event.eventId), grantEventId: String(grant.eventId),
    declared: String(items.length), denominator: String(denominator), evidenceState, untouched: String(grant.untouched),
    ...Object.fromEntries(classes.map((c) => [`c_${c}`, `tp${tables[c].tp}-fp${tables[c].fp}-fn${tables[c].fn}-tn${tables[c].tn}`])),
    ...Object.fromEntries(exclusions.map((x) => [`x_${x}`, String(excluded[x])])),
    ...(paired ? { abstentions: String(abstentions), discordantPairs: String(discordantPairs), discordantBothCorrect: String(discordantBothCorrect) } : {}),
  };
  emit(audit, { action: EVALUATION_ACTIONS.SCORED, outcome: "RECORDED", reasonCode: grant.untouched ? "CLASS_TABLES_SCORED_UNTOUCHED" : "CLASS_TABLES_SCORED_NOT_UNTOUCHED", occurredAt: at, metadata: release });
  return Object.freeze({ ...release, tables: Object.freeze(Object.fromEntries(classes.map((c) => [c, Object.freeze({ ...tables[c] })]))), excluded: Object.freeze(excluded), declared: items.length, denominator, ...(paired ? { abstentions, discordantPairs, discordantBothCorrect } : {}) });
}
