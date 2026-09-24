/**
 * 🔴 F08 · THE AUDIT EVENT — ITS FIELDS, ITS REFUSALS, ITS CANONICAL FORM AND ITS HASH (22 September 2026).
 * Acceptance: the F08 owner ruling committed in the governance repository at 19e6b7b (sha256 f6aef340…d18a;
 * pinned in config/fboard/acceptances.mjs).
 *
 * Generic: it knows no subject, product, client, host or regulator. Every identifier it stores is one somebody else
 * DECLARED. It judges an event by structure alone and refuses BEFORE anything is written — there is no repair, no
 * default and no redaction-after-storage anywhere in this file.
 *
 * ── THE FOUR RULES THAT ARE NOT NEGOTIABLE ─────────────────────────────────
 *
 *   ABSENT IS NEVER A DEFAULT.  A missing scope is not GLOBAL_PRODUCT; a missing actor is not "the engine"; a missing
 *   authority is not "whatever is current". Each is REFUSED, with the reason named.
 *
 *   NO AUTOMATED PROCESS IS EVER A HUMAN.  `actorType: "HUMAN"` is refused unless the event ALSO names the committed
 *   evidence that a person personally did the thing (`metadata.humanAttestation`). An engine, a CI job, a model or an
 *   agent can never satisfy that by accident, because it has nothing to name.
 *
 *   A TENANT IDENTIFIER IS OPAQUE AND DECLARED.  It must match the production tenancy pattern
 *   (src/tenancy/resolver.mjs) — 32 hex characters behind a fixed prefix. A hostname, a product name, a repository
 *   name, a folder path, a batch id, a country or a page's content cannot match that shape, so a computed tenant
 *   cannot be laundered in through this field.
 *
 *   THE AUTHORITY IS THE ONE THAT GOVERNED AT THE TIME.  `authorityHash` is the hash of the authority bytes as they
 *   stood when the event happened. Later supersession never rewrites it; the READER reports the difference.
 *
 * ── THE TIME RULE, DECLARED BEFORE IT IS ENFORCED (§8.6) ───────────────────
 *
 *   occurredAt  the CALLER supplies it, as an ISO-8601 instant in UTC, from the clock that witnessed the action.
 *   recordedAt  the STORE supplies it, at append time, from the store's injected clock. A caller may not set it.
 *
 *   The permitted relationship is  occurredAt <= recordedAt.  There are THREE worlds, never two:
 *     VALID                        it parses, it is UTC, and it is not after recordedAt;
 *     REFUSED                      absent, unparseable, not UTC, or IN THE FUTURE relative to recordedAt;
 *     RECORDED-WITH-ANOMALY-FLAG   earlier than the previous event's occurredAt — lawful (a migration appends old
 *                                  events after new ones) but never silent: `metadata.timeAnomaly` is set by the
 *                                  store, and the reader prints it on every event that carries one. A flag no reader
 *                                  shows is not a flag.
 *   Silent acceptance is not one of the three.
 */
import { createHash } from "node:crypto";
import { TENANT_ID_PATTERN } from "../tenancy/resolver.mjs";

export const AUDIT_VERSION = 1;

/** 🔴 THE FIELD ORDER IS PART OF THE CONTRACT. The canonical serialisation — and therefore every hash — depends on it. */
export const FIELD_ORDER = Object.freeze([
  "auditVersion", "eventId", "eventType", "occurredAt", "recordedAt", "actor", "actorType", "scopeType", "tenantId",
  "subjectId", "action", "outcome", "reasonCode", "authorityRef", "authorityHash", "softwareVersion", "evidenceRefs",
  "previousEventHash", "eventHash", "correlationId", "parentEventId", "migration", "migrationSource", "migratedAt",
  "metadata",
]);

export const EVENT_TYPES = Object.freeze([
  "AUTHORITY_RESOLUTION", "AUTHORITY_MIGRATION", "BOARD_TRANSITION", "EVIDENCE_ROLE_DECISION", "WRITE_GATE_DECISION",
  "SCOPE_RESOLUTION", "REFUSAL", "EVALUATION",
  /* Added for the governed-write boundary: one audited saga per governed mutation. Additive — it widens a
   * validation allowlist and changes no stored byte, because these allowlists are never serialised into an event. */
  "GOVERNED_WRITE",
]);
export const ACTOR_TYPES = Object.freeze(["HUMAN", "ENGINE", "CI", "EXTERNAL_SYSTEM"]);
export const SCOPE_TYPES = Object.freeze(["GLOBAL_PRODUCT", "TENANT", "SUBJECT"]);
/* INDETERMINATE was added for one measured state no existing value describes truthfully: a target whose mutation
 * COMMITTED but could not be confirmed afterwards. Calling that APPLIED claims a confirmation never obtained;
 * calling it FAIL denies a mutation that really landed. */
export const OUTCOMES = Object.freeze(["ALLOWED", "REFUSED", "RECORDED", "APPLIED", "PASS", "FAIL", "INVALID", "INDETERMINATE"]);

/**
 * 🔴 THE GENESIS PIN. The first event's `previousEventHash` must be exactly this. An ABSENT previousEventHash is
 * REFUSED, because "missing" would otherwise mean both "this is the first event" and "the events before it were
 * deleted" — and a value that means two opposite things detects neither.
 *
 * Product-neutral by construction: it is the hash of a fixed generic sentence naming no client, product or subject.
 */
export const GENESIS_PREVIOUS_HASH = createHash("sha256").update("AUDIT_CHAIN_GENESIS_v1", "utf8").digest("hex");

const HEX64 = /^[0-9a-f]{64}$/;
const HEX32 = /^[0-9a-f]{32}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const nonEmpty = (s) => typeof s === "string" && s.trim() !== "";

/**
 * 🔴 WHAT MAY NEVER ENTER THE TRAIL, REFUSED BEFORE APPEND (§8.11). Generic shapes only — a key whose NAME declares a
 * secret, and a value whose SHAPE is one. Subject-specific payload (a retired held-out member, a marking key's text)
 * is not knowable here and must not be guessed: the caller injects `forbiddenSubstrings`, derived at runtime from the
 * evidence-role registry, and this module never learns what they mean.
 */
/* 🔴 MATCHED AGAINST THE KEY'S NORMALISED FORM — lower-cased with every separator removed — so `sessionToken`,
 * `session_token` and `SESSIONTOKEN` are one thing. EXACT equality, never containment: `authorityBlob` normalises to
 * `authorityblob`, and a containment test on "auth" would refuse the very field that records which authority governed.
 * That is why the combined forms are spelled out here instead. */
export const FORBIDDEN_METADATA_KEYS = Object.freeze([
  "password", "passwd", "secret", "secrets", "token", "tokens", "accesstoken", "refreshtoken", "authtoken",
  "sessiontoken", "bearertoken", "idtoken", "jwt", "cookie", "cookies", "apikey", "apikeys", "authorization",
  "privatekey", "privatekeys", "signingkey", "session", "sessionid", "credential", "credentials", "answerkey",
  "answerkeys", "markingkey", "markingkeys", "expectedanswer", "expectedanswers", "answers", "answermap", "body",
  "requestbody", "responsebody", "payload",
]);
export const FORBIDDEN_VALUE_SHAPES = Object.freeze([
  { code: "PEM_BLOCK", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { code: "BEARER_TOKEN", re: /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/ },
  { code: "SET_COOKIE", re: /\bSet-Cookie\s*:/i },
  { code: "BASIC_AUTH_URL", re: /\bhttps?:\/\/[^\s/@]+:[^\s/@]+@/ },
]);
export const METADATA_MAX_VALUE_CHARS = 200;
export const METADATA_MAX_KEYS = 24;

/** Canonical JSON: object keys sorted, no whitespace. Deterministic across machines and Node versions. */
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
}

/** The event's canonical serialisation, in FIELD_ORDER, with `eventHash` omitted — what the hash covers. */
export function canonicalWithoutHash(event) {
  const parts = [];
  for (const k of FIELD_ORDER) {
    if (k === "eventHash") continue;
    parts.push(JSON.stringify(k) + ":" + canonicalJson(event[k] ?? null));
  }
  return "{" + parts.join(",") + "}";
}

/** 🔴 The event hash covers the canonical event AND previousEventHash — so a link cannot be re-pointed silently. */
export const hashEvent = (event) =>
  createHash("sha256").update(canonicalWithoutHash(event) + "\n" + String(event.previousEventHash), "utf8").digest("hex");

/**
 * 🔴 RECORDER-EXECUTION METADATA — DESCRIBES THE RECORDING, NOT THE OCCURRENCE.
 *
 * `recordedAt`, the chain links and `migratedAt` are decided by the STORE. `softwareVersion` is decided by the
 * BUILD that happened to be running. None of them is part of what happened.
 *
 * `softwareVersion` was excluded on 23 September 2026, and the reason is worth keeping: while it was included,
 * re-offering an ALREADY-COMMITTED occurrence from a different build produced the same eventId but a different
 * fingerprint, so the store correctly read it as a conflicting duplicate and refused it. A build change is not a
 * content change. The event still RECORDS `softwareVersion` — it is stored, hashed into `eventHash` and read back
 * unchanged as the version at the event; it simply no longer decides whether two records are the same occurrence.
 */
export const RECORDER_EXECUTION_FIELDS = Object.freeze([
  "recordedAt", "previousEventHash", "eventHash", "migratedAt", "softwareVersion",
]);

/**
 * The event's OCCURRENCE fingerprint — everything except the recorder-execution fields above and the store-set
 * anomaly flag. Two records that share an eventId are the SAME occurrence only when this matches; otherwise they
 * are a conflicting duplicate and the second is REFUSED, never merged, never overwritten.
 *
 * It is computed from stored bytes at read time, so the exclusion applies identically to events committed before
 * it and after it. No committed line is rewritten to obtain it.
 */
/**
 * 🔴 FOR A MIGRATED EVENT, `correlationId` NAMES THE MIGRATION PASS, NOT THE OCCURRENCE (measured 23 September 2026).
 *
 * Every migrated event carries `migration:<governance commit the corpus was migrated from>` (113 of 113 in the trail).
 * Each re-migration moves that commit, so re-offering an ALREADY-recorded occurrence produced the same eventId and a
 * different fingerprint, and the store refused it as EVENT_ID_CONFLICT: 98 such refusals in F08's closing recorder run
 * and 101 in F07's, 93 of them differing in nothing else. The identity (which names the source record) already says
 * which occurrence it is. This is excluded ONLY when `migration === true`: for a native event the correlation is the
 * run that performed the action, and it stays part of what happened. The field is still stored and hashed into
 * `eventHash`; genuine content differences still conflict.
 */
export const MIGRATION_PASS_FIELDS = Object.freeze(["correlationId"]);

export function contentFingerprint(event) {
  const body = {};
  for (const k of FIELD_ORDER) {
    if (RECORDER_EXECUTION_FIELDS.includes(k)) continue;
    if (event.migration === true && MIGRATION_PASS_FIELDS.includes(k)) continue;
    body[k] = k === "metadata" ? stripStoreFlags(event.metadata) : (event[k] ?? null);
  }
  return createHash("sha256").update(canonicalJson(body), "utf8").digest("hex");
}
const stripStoreFlags = (m) => {
  if (!m || typeof m !== "object") return m ?? null;
  const { timeAnomaly, ...rest } = m;
  return rest;
};

/** A deterministic eventId from the caller's declared identity — so an honest retry recomputes the SAME id. */
export function deriveEventId(identity) {
  return createHash("sha256").update(canonicalJson(identity), "utf8").digest("hex").slice(0, 32);
}

/**
 * EVERY REASON AN EVENT MAY NOT BE APPENDED. `[]` means it may. Each fault carries a code; nothing is repaired here.
 *
 * @param {object} event                      the candidate, with recordedAt and previousEventHash already set
 * @param {object} ctx
 * @param {(ref) => object|null} ctx.evidenceEntryFor  the production evidence-role lookup (fails closed on null)
 * @param {(ref) => boolean} ctx.isSealedRef           is this reference sealed material?
 * @param {string[]} ctx.forbiddenSubstrings           runtime-derived protected payload; never listed in this file
 */
export function eventFaults(event, { evidenceEntryFor = () => null, isSealedRef = () => false, forbiddenSubstrings = [] } = {}) {
  const f = [];
  const bad = (code, why) => f.push({ code, why });
  if (!event || typeof event !== "object") return [{ code: "NOT_AN_EVENT", why: "the candidate is not an object" }];

  if (event.auditVersion !== AUDIT_VERSION) bad("AUDIT_VERSION_UNKNOWN", `auditVersion ${JSON.stringify(event.auditVersion)} is not ${AUDIT_VERSION}`);
  for (const k of Object.keys(event)) if (!FIELD_ORDER.includes(k)) bad("FIELD_UNDECLARED", `${k} is not a declared audit field`);
  for (const k of FIELD_ORDER) if (!Object.hasOwn(event, k)) bad("FIELD_MISSING", `the event does not declare ${k} — a permissive missing field is how an audit trail stops being one`);

  if (!HEX32.test(event.eventId ?? "")) bad("EVENT_ID_MALFORMED", "eventId must be 32 hex characters");
  if (!EVENT_TYPES.includes(event.eventType)) bad("EVENT_TYPE_UNKNOWN", `eventType ${JSON.stringify(event.eventType)} is not declared`);
  if (!nonEmpty(event.action)) bad("ACTION_ABSENT", "an event that names no action records nothing");
  if (!OUTCOMES.includes(event.outcome)) bad("OUTCOME_UNKNOWN", `outcome ${JSON.stringify(event.outcome)} is not declared`);
  if (event.outcome === "REFUSED" && !nonEmpty(event.reasonCode)) bad("REASON_CODE_ABSENT", "a refusal that names no reason cannot be reconstructed");
  if (!nonEmpty(event.softwareVersion)) bad("SOFTWARE_VERSION_ABSENT", "an event that names no software version cannot be reproduced");
  if (!nonEmpty(event.correlationId)) bad("CORRELATION_ID_ABSENT", "every event belongs to a run");

  // ── ACTOR ──
  if (!nonEmpty(event.actor)) bad("ACTOR_ABSENT", "an event without an actor names nobody — refused, never defaulted");
  if (!ACTOR_TYPES.includes(event.actorType)) bad("ACTOR_TYPE_UNKNOWN", `actorType ${JSON.stringify(event.actorType)} is not one of ${ACTOR_TYPES.join(", ")}`);
  if (event.actorType === "HUMAN" && !nonEmpty(event.metadata?.humanAttestation)) {
    bad("HUMAN_ACTOR_UNATTESTED", "a HUMAN actor must name the committed evidence that a person personally did this — no model, agent, engine or CI job can");
  }

  // ── SCOPE ──
  if (!SCOPE_TYPES.includes(event.scopeType)) bad("SCOPE_ABSENT", `scopeType ${JSON.stringify(event.scopeType)} is not declared — AN ABSENT SCOPE IS NEVER GLOBAL`);
  else if (event.scopeType === "GLOBAL_PRODUCT") {
    if (event.tenantId !== null) bad("GLOBAL_SCOPE_CARRIES_TENANT", "a GLOBAL_PRODUCT event names no tenant");
    if (event.subjectId !== null) bad("GLOBAL_SCOPE_CARRIES_SUBJECT", "a GLOBAL_PRODUCT event names no subject");
  } else {
    if (!nonEmpty(event.tenantId)) bad("TENANT_ID_ABSENT", `${event.scopeType} requires a declared tenantId`);
    else if (!TENANT_ID_PATTERN.test(event.tenantId)) bad("TENANT_ID_NOT_OPAQUE", "tenantId is not a declared opaque identifier — it is never computed from a host, product, repository, path, batch, country or page content");
    if (event.scopeType === "SUBJECT" && !nonEmpty(event.subjectId)) bad("SUBJECT_ID_ABSENT", "a SUBJECT event requires both tenantId and subjectId");
    if (event.scopeType === "TENANT" && event.subjectId !== null) bad("TENANT_SCOPE_CARRIES_SUBJECT", "a TENANT event names no subject");
  }

  // ── AUTHORITY ──
  if (!event.authorityRef || !nonEmpty(event.authorityRef.propositionId) || !Array.isArray(event.authorityRef.scope) || event.authorityRef.scope.length === 0) {
    bad("AUTHORITY_REF_ABSENT", "a governed event names the proposition and scope it was decided under");
  }
  if (!HEX64.test(event.authorityHash ?? "")) bad("AUTHORITY_HASH_MALFORMED", "authorityHash must be the sha256 of the authority bytes that GOVERNED AT THE TIME of the event");

  // ── TIME ──
  if (!nonEmpty(event.occurredAt)) bad("OCCURRED_AT_ABSENT", "the caller must supply occurredAt — it is never invented here");
  else if (!ISO_UTC.test(event.occurredAt)) bad("OCCURRED_AT_MALFORMED", "occurredAt must be an ISO-8601 instant in UTC (…Z)");
  if (!nonEmpty(event.recordedAt) || !ISO_UTC.test(event.recordedAt ?? "")) bad("RECORDED_AT_MALFORMED", "recordedAt is set by the store, as an ISO-8601 UTC instant");
  // 🔴 COMPARED AS INSTANTS, NEVER AS STRINGS. "…15Z" and "…15.123Z" are the same second and sort the wrong way.
  if (ISO_UTC.test(event.occurredAt ?? "") && ISO_UTC.test(event.recordedAt ?? "") && Date.parse(event.occurredAt) > Date.parse(event.recordedAt)) {
    bad("OCCURRED_AT_IN_FUTURE", "occurredAt is after recordedAt — an action cannot have happened after it was recorded");
  }

  // ── CHAIN ──
  if (!HEX64.test(event.previousEventHash ?? "")) bad("PREVIOUS_HASH_ABSENT", "previousEventHash must be the previous event's hash, or the pinned GENESIS value — absent is refused, because it would mean both genesis and truncated");
  if (event.parentEventId !== null && !HEX32.test(event.parentEventId ?? "")) bad("PARENT_EVENT_ID_MALFORMED", "parentEventId is a 32-hex event id, or null");

  // ── MIGRATION ──
  if (typeof event.migration !== "boolean") bad("MIGRATION_FLAG_ABSENT", "every event declares explicitly whether it was migrated");
  if (event.migration === true) {
    if (!nonEmpty(event.migrationSource)) bad("MIGRATION_SOURCE_ABSENT", "a migrated event names the committed evidence it was reconstructed from");
    if (!nonEmpty(event.migratedAt) || !ISO_UTC.test(event.migratedAt ?? "")) bad("MIGRATED_AT_ABSENT", "a migrated event records when it was migrated");
  } else {
    if (event.migrationSource !== null) bad("MIGRATION_SOURCE_ON_NATIVE", "a natively recorded event has no migration source");
    if (event.migratedAt !== null) bad("MIGRATED_AT_ON_NATIVE", "a natively recorded event has no migratedAt");
  }

  // ── EVIDENCE REFERENCES ──
  if (!Array.isArray(event.evidenceRefs)) bad("EVIDENCE_REFS_MALFORMED", "evidenceRefs must be an array (possibly empty)");
  else for (const [i, ref] of event.evidenceRefs.entries()) {
    const at = `evidenceRefs[${i}]`;
    if (!ref || typeof ref !== "object" || !nonEmpty(ref.root) || !nonEmpty(ref.ref)) { bad("EVIDENCE_REF_MALFORMED", `${at} names no root and ref`); continue; }
    if (Object.hasOwn(ref, "content") || Object.hasOwn(ref, "text") || Object.hasOwn(ref, "body")) bad("EVIDENCE_REF_CARRIES_CONTENT", `${at} carries content — the trail stores references, roles, hashes and scopes, never payload`);
    const entry = evidenceEntryFor(ref);
    if (!entry) { bad("EVIDENCE_ROLE_UNREGISTERED", `${at} resolves to no registry entry — an unregistered role FAILS CLOSED`); continue; }
    if (ref.role !== entry.role) bad("EVIDENCE_ROLE_MISMATCH", `${at} claims role ${JSON.stringify(ref.role)}; the registry declares ${entry.role} — a role is read, never asserted`);
    if (entry.sealed === true) {
      if (!isSealedRef(ref)) bad("EVIDENCE_SEALED_INCONSISTENT", `${at} is registered SEALED but is not recognised as sealed material`);
      if (ref.contentHash !== null) bad("EVIDENCE_SEALED_CONTENT_HASHED", `${at} is SEALED — its content is not read, so it carries no content hash`);
    } else if (!HEX64.test(ref.contentHash ?? "") && !/^[0-9a-f]{16}$/.test(ref.contentHash ?? "")) {
      bad("EVIDENCE_HASH_MALFORMED", `${at} carries no lawful content hash`);
    }
    if (entry.role === "RETIRED_CONTAMINATED" && event.outcome === "PASS") {
      bad("EVIDENCE_RETIRED_CANNOT_PASS", `${at} is RETIRED_CONTAMINATED and may not support a passing evaluation`);
    }
    if (nonEmpty(ref.tenantId) && event.scopeType !== "GLOBAL_PRODUCT" && ref.tenantId !== event.tenantId) {
      bad("EVIDENCE_CROSS_TENANT", `${at} belongs to another declared tenant — cross-tenant evidence is never joined`);
    }
    if (nonEmpty(ref.tenantId) && event.scopeType === "GLOBAL_PRODUCT") {
      bad("EVIDENCE_TENANT_IN_GLOBAL_EVENT", `${at} carries a tenant on a GLOBAL_PRODUCT event`);
    }
  }

  // ── METADATA · REJECT BEFORE APPEND, NEVER REDACT AFTER ──
  f.push(...metadataFaults(event.metadata, forbiddenSubstrings));
  return f;
}

/** Metadata is a flat map of short scalars. Anything else, any secret-shaped key or value, and any injected
 *  protected substring is REFUSED — the event is never written, and nothing is redacted afterwards. */
export function metadataFaults(metadata, forbiddenSubstrings = []) {
  const f = [];
  const bad = (code, why) => f.push({ code, why });
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    bad("METADATA_NOT_FLAT", "metadata must be a flat object of short scalars (use {} for none)");
    return f;
  }
  const keys = Object.keys(metadata);
  if (keys.length > METADATA_MAX_KEYS) bad("METADATA_TOO_MANY_KEYS", `${keys.length} keys exceeds the declared ceiling of ${METADATA_MAX_KEYS}`);
  for (const k of keys) {
    const v = metadata[k];
    const low = k.toLowerCase().replace(/[^a-z_]/g, "");
    if (FORBIDDEN_METADATA_KEYS.includes(low)) bad("METADATA_FORBIDDEN_KEY", `metadata.${k} names a class of value that never enters an audit trail`);
    if (v !== null && typeof v === "object") { bad("METADATA_NOT_FLAT", `metadata.${k} is not a scalar`); continue; }
    if (typeof v === "string") {
      if (v.length > METADATA_MAX_VALUE_CHARS) bad("METADATA_VALUE_TOO_LONG", `metadata.${k} is ${v.length} characters; the ceiling is ${METADATA_MAX_VALUE_CHARS} — an unrestricted body never enters the trail`);
      for (const s of FORBIDDEN_VALUE_SHAPES) if (s.re.test(v)) bad("METADATA_FORBIDDEN_VALUE", `metadata.${k} carries a ${s.code}`);
      // 🔴 Counts and codes only. The matched text is NEVER echoed — not into the fault, not into a log.
      const lowered = v.toLowerCase();
      if (forbiddenSubstrings.some((s) => s && lowered.includes(String(s).toLowerCase()))) {
        bad("METADATA_PROTECTED_PAYLOAD", `metadata.${k} carries protected payload — rejected BEFORE append; the matched text is not reproduced`);
      }
    }
  }
  return f;
}
