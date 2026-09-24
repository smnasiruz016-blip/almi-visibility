/**
 * 🔴 F06 · THE CANONICAL EVIDENCE STATE — ONE CLOSED VOCABULARY, NO DEFAULT (24 September 2026).
 *
 * Acceptance: `_handoffs` a0c94ce `AlmiVisibility_F06_FROZEN_ACCEPTANCE_2026-09-24.md` (pinned in
 * config/fboard/acceptances.mjs). An evidence state says HOW WE KNOW, never WHAT IS TRUE:
 *
 *   OBSERVED        directly measured, retrieved or witnessed — a source, a time, a traceable evidence reference
 *   INFERRED        derived from identified inputs by a named rule, formula or method — never shown as observed
 *   RECOMMENDED     a proposed action or judgement, on identified evidence — not proof, and not an implementation
 *   UNKNOWN         the question WAS reached, and the evidence does not lawfully establish an answer
 *   NOT_MEASURED    the check was not performed, or produced no measurement — never zero, PASS, FAIL or UNKNOWN
 *   NOT_APPLICABLE  outside the item's DECLARED scope, with a specific, reviewable reason
 *
 * ── WHAT THIS MODULE REFUSES ─────────────────────────────────────────────────
 *   · an item with no state, with two states, or with a literal outside the six (EVIDENCE_STATE_ABSENT / _MULTIPLE /
 *     _UNKNOWN_LITERAL) — there is NO default state, anywhere;
 *   · a state without the metadata its definition requires (EVIDENCE_STATE_METADATA_MISSING / _MALFORMED);
 *   · a state that carries a verdict, confidence, verification, workflow, board or action value inside it
 *     (EVIDENCE_STATE_COUPLED) — those are separate typed dimensions and stay beside it, never in it;
 *   · an evidence reference from another tenant, or from another subject where isolation requires it;
 *   · a transition the transition law does not permit (EVIDENCE_TRANSITION_REFUSED).
 *
 * Product-neutral: it knows states, reason codes and references — never a client, host, subject word or value.
 */
import { createHash } from "node:crypto";

export const EVIDENCE_STATES = Object.freeze(["OBSERVED", "INFERRED", "RECOMMENDED", "UNKNOWN", "NOT_MEASURED", "NOT_APPLICABLE"]);
/** The version of the model and its adapters' rules. It travels with every state as `ruleVersion`. */
export const EVIDENCE_STATE_MODEL_VERSION = "f06-1";

/** What each state must carry. Every field is required and non-empty; arrays need at least one element. */
export const REQUIRED_METADATA = Object.freeze({
  OBSERVED: Object.freeze(["evidenceRef", "sourceId", "observedAt"]),
  INFERRED: Object.freeze(["inputRefs", "method", "computedAt"]),
  RECOMMENDED: Object.freeze(["supportingRefs", "rule", "proposedAt"]),
  UNKNOWN: Object.freeze(["checkId", "insufficiency"]),
  NOT_MEASURED: Object.freeze(["checkId", "noMeasurementReason"]),
  NOT_APPLICABLE: Object.freeze(["checkId", "scope", "applicabilityReason"]),
});
const TIME_FIELDS = Object.freeze(["observedAt", "computedAt", "proposedAt"]);
const ARRAY_FIELDS = Object.freeze(["inputRefs", "supportingRefs"]);
/** Shared metadata every state carries: which adapter rule assigned it, and the model version. */
const SHARED = Object.freeze(["assignedBy", "ruleVersion"]);
/** Metadata keys a state may carry beyond its required ones. Anything else is refused — a closed shape. */
const OPTIONAL = Object.freeze(["tenantId", "subjectId", "value", "valueUnit", "detail"]);
/** Other dimensions. They live BESIDE an evidence state, never inside it. */
export const COUPLED_DIMENSIONS = Object.freeze(["verdict", "confidence", "verificationState", "workflowState", "boardState", "actionState", "applied", "approved", "pass", "status", "outcome", "score"]);
/** Reason codes are codes: upper-case, bounded. A sentence is not a reason code. */
const CODE = /^[A-Z][A-Z0-9_]{1,63}$/;
const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

export class EvidenceStateRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "EvidenceStateRefused"; this.code = code; }
}

/** Every fault of a candidate evidence state. [] means lawful. Never throws. */
export function evidenceStateFaults(candidate) {
  const f = [];
  const bad = (code, why) => f.push({ code, why });
  if (candidate === null || candidate === undefined || typeof candidate !== "object" || Array.isArray(candidate)) { bad("EVIDENCE_STATE_ABSENT", "no evidence state was supplied — there is no default"); return f; }
  const s = candidate.state;
  if (s === undefined || s === null || s === "") { bad("EVIDENCE_STATE_ABSENT", "the item carries no state — there is no default"); return f; }
  if (Array.isArray(s) || (typeof s === "string" && /[,|/ ]/.test(s.trim()))) { bad("EVIDENCE_STATE_MULTIPLE", "an item has exactly one evidence state"); return f; }
  if (typeof s !== "string" || !EVIDENCE_STATES.includes(s)) { bad("EVIDENCE_STATE_UNKNOWN_LITERAL", `${JSON.stringify(s)} is not one of the six canonical states`); return f; }
  const others = EVIDENCE_STATES.filter((x) => x !== s && Object.hasOwn(candidate, x.toLowerCase()));
  if (others.length) bad("EVIDENCE_STATE_MULTIPLE", `the item also claims ${others.join(", ")}`);
  const meta = candidate.meta;
  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) { bad("EVIDENCE_STATE_METADATA_MISSING", `${s} carries no metadata`); return f; }
  for (const k of Object.keys(candidate)) if (!["state", "meta"].includes(k)) bad(COUPLED_DIMENSIONS.includes(k) ? "EVIDENCE_STATE_COUPLED" : "EVIDENCE_STATE_MALFORMED", `the state object carries ${k}`);
  for (const k of [...REQUIRED_METADATA[s], ...SHARED]) {
    const v = meta[k];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) bad("EVIDENCE_STATE_METADATA_MISSING", `${s} requires ${k}`);
  }
  const allowed = new Set([...REQUIRED_METADATA[s], ...SHARED, ...OPTIONAL]);
  for (const k of Object.keys(meta)) {
    if (COUPLED_DIMENSIONS.includes(k)) bad("EVIDENCE_STATE_COUPLED", `${k} is a separate dimension and may not live inside an evidence state`);
    else if (!allowed.has(k)) bad("EVIDENCE_STATE_MALFORMED", `${s} does not carry ${k}`);
  }
  /* A value belongs only to a state that HAS one. NOT_MEASURED carrying "0", UNKNOWN carrying "PASS", RECOMMENDED
   * carrying a result — each is the conversion the acceptance forbids, refused here rather than trusted to a caller. */
  if (!["OBSERVED", "INFERRED"].includes(s)) for (const k of ["value", "valueUnit"]) if (Object.hasOwn(meta, k)) bad("EVIDENCE_STATE_VALUE_FORBIDDEN", `${s} carries no value — ${k} is refused`);
  for (const k of TIME_FIELDS) if (meta[k] !== undefined && meta[k] !== null && !(typeof meta[k] === "string" && ISO.test(meta[k]))) bad("EVIDENCE_STATE_MALFORMED", `${k} is not an ISO date or instant`);
  for (const k of ARRAY_FIELDS) if (meta[k] !== undefined && (!Array.isArray(meta[k]) || meta[k].some((r) => typeof r !== "string" || r === ""))) bad("EVIDENCE_STATE_MALFORMED", `${k} must be an array of non-empty reference strings`);
  for (const k of ["insufficiency", "noMeasurementReason", "applicabilityReason"]) if (meta[k] !== undefined && !(typeof meta[k] === "string" && CODE.test(meta[k]))) bad("EVIDENCE_STATE_MALFORMED", `${k} must be a reason CODE, not free text`);
  for (const k of ["evidenceRef", "sourceId", "method", "rule", "checkId", "scope", "ruleVersion", "assignedBy"]) if (meta[k] !== undefined && typeof meta[k] !== "string") bad("EVIDENCE_STATE_MALFORMED", `${k} must be a string`);
  return f;
}

/** The one constructor. Returns a frozen, validated state or throws the first fault, typed. */
export function makeEvidenceState(state, meta) {
  const candidate = { state, meta: { ruleVersion: EVIDENCE_STATE_MODEL_VERSION, ...meta } };
  const faults = evidenceStateFaults(candidate);
  if (faults.length) throw new EvidenceStateRefused(faults[0].code, faults.map((x) => x.why).join("; "));
  const m = { ...candidate.meta };
  for (const k of ARRAY_FIELDS) if (m[k]) m[k] = Object.freeze([...m[k]]);
  return Object.freeze({ state, meta: Object.freeze(m) });
}

/** Validate a state that came from anywhere else (a store, a caller). Throws the typed refusal. */
export function requireEvidenceState(candidate) {
  const faults = evidenceStateFaults(candidate);
  if (faults.length) throw new EvidenceStateRefused(faults[0].code, faults.map((x) => x.why).join("; "));
  return candidate;
}

/* ── ISOLATION ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * A reference may name the tenant it belongs to as `tenant:<id>/…`. A state for one tenant may not cite another
 * tenant's evidence; where `subjectId` is declared, references naming a subject (`…/subject:<id>/…`) must match it.
 */
export function isolationFaults(es) {
  const f = [];
  const refs = [es?.meta?.evidenceRef, ...(es?.meta?.inputRefs ?? []), ...(es?.meta?.supportingRefs ?? [])].filter(Boolean);
  for (const r of refs) {
    const t = /(?:^|\/)tenant:([^/]+)/.exec(r)?.[1];
    if (t && es.meta.tenantId && t !== es.meta.tenantId) f.push({ code: "EVIDENCE_REF_CROSS_TENANT", why: `a reference belongs to tenant ${t}, not ${es.meta.tenantId}` });
    if (t && !es.meta.tenantId) f.push({ code: "EVIDENCE_REF_CROSS_TENANT", why: "a tenant-scoped reference is cited by a state that declares no tenant" });
    const s = /(?:^|\/)subject:([^/]+)/.exec(r)?.[1];
    if (s && es.meta.subjectId && s !== es.meta.subjectId) f.push({ code: "EVIDENCE_REF_CROSS_SUBJECT", why: "a reference belongs to another subject" });
  }
  return f;
}
export function requireIsolated(es) {
  const f = isolationFaults(es);
  if (f.length) throw new EvidenceStateRefused(f[0].code, f[0].why);
  return es;
}

/* ── STABLE SERIALISATION ──────────────────────────────────────────────────────────────────────────────────────── */

const canonical = (v) => (Array.isArray(v) ? `[${v.map(canonical).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`
    : JSON.stringify(v));
export const serializeEvidenceState = (es) => canonical(requireEvidenceState(es));
export function parseEvidenceState(text) {
  const o = JSON.parse(text);
  return makeEvidenceState(o?.state, o?.meta ?? null);
}

/* ── REPORTING — the words a reader sees. None of them reads as 0, PASS, clean or absent. ─────────────────────── */

export const DISPLAY = Object.freeze({
  OBSERVED: "OBSERVED", INFERRED: "INFERRED", RECOMMENDED: "RECOMMENDED",
  UNKNOWN: "UNKNOWN", NOT_MEASURED: "NOT MEASURED", NOT_APPLICABLE: "NOT APPLICABLE",
});
/** The word shown for an item no rule could place. It is not a seventh state; it is a visible refusal to guess. */
export const UNMAPPED = "UNMAPPED";
export const displayOf = (state) => DISPLAY[state] ?? UNMAPPED;

/* ── THE TRANSITION LAW (§9) ─────────────────────────────────────────────────────────────────────────────────────
 *
 * Evidence is never relabelled in place. A lawful change is a NEW item — a new record — whose state differs from
 * the one it supersedes, and the pair is checked here. Measured in the real product (24 September 2026): the only
 * production writer that supersedes an item is bin/supersede-noindex.mjs, which replaced 134 INFERRED findings by
 * UNKNOWN ones on new evidence. Each rule below names what it needs.
 */
export const TRANSITION_RULES = Object.freeze({
  "NOT_MEASURED->OBSERVED": "a real measurement now exists (the new item is OBSERVED, with its own evidence reference)",
  "NOT_MEASURED->UNKNOWN": "the question was reached and the evidence remains insufficient",
  "NOT_MEASURED->INFERRED": "a conclusion is now derived from declared inputs by a named method",
  "UNKNOWN->OBSERVED": "new direct evidence",
  "UNKNOWN->INFERRED": "declared inputs and method",
  "INFERRED->UNKNOWN": "new evidence shows the derivation's premise is not established",
  "INFERRED->INFERRED": "a re-derivation on new or corrected inputs",
  "OBSERVED->INFERRED": "a NEW derived item that keeps the observation among its inputs — the observation is not relabelled",
  "NOT_APPLICABLE->OBSERVED": "an explicit scope change or corrected applicability decision",
  "NOT_APPLICABLE->NOT_MEASURED": "an explicit scope change or corrected applicability decision",
  "NOT_APPLICABLE->UNKNOWN": "an explicit scope change or corrected applicability decision",
});

/**
 * Check a supersession `from` → `to`, and return the metadata-only F08 event draft that records it. Refuses:
 *   · a pair the law does not name (RECOMMENDED never becomes OBSERVED because it was approved or implemented;
 *     OBSERVED is never relabelled; nothing becomes NOT_APPLICABLE without a scope decision);
 *   · a change that brings no NEW evidence reference;
 *   · OBSERVED → INFERRED that drops the observation from the derivation's inputs;
 *   · a change out of NOT_APPLICABLE without a declared scope change;
 *   · a change that crosses a tenant or subject.
 * `ctx` names who, when, under which rule and which build — every transition carries all four.
 */
export function checkTransition({ from, to, fromRef, toRef, newEvidenceRefs = [], scopeChange = null }, ctx) {
  requireEvidenceState(from);
  requireEvidenceState(to);
  requireIsolated(from);
  requireIsolated(to);
  const key = `${from.state}->${to.state}`;
  const refuse = (why) => { throw new EvidenceStateRefused("EVIDENCE_TRANSITION_REFUSED", `${key}: ${why}`); };
  if (!TRANSITION_RULES[key]) refuse("the transition law does not permit this change");
  for (const k of ["actor", "at", "rule", "softwareVersion", "correlationId", "authorityRef", "authorityHash"]) if (!ctx?.[k]) refuse(`a transition names its ${k}`);
  if (!ISO.test(ctx.at)) refuse("at is not an ISO instant");
  if (typeof fromRef !== "string" || !fromRef || typeof toRef !== "string" || !toRef || fromRef === toRef) refuse("a transition is a NEW item superseding an old one — two distinct references");
  if (!Array.isArray(newEvidenceRefs) || newEvidenceRefs.length === 0) refuse("no new evidence is cited");
  if (from.meta.tenantId && to.meta.tenantId && from.meta.tenantId !== to.meta.tenantId) throw new EvidenceStateRefused("EVIDENCE_REF_CROSS_TENANT", "a transition crosses tenants");
  if (from.meta.subjectId && to.meta.subjectId && from.meta.subjectId !== to.meta.subjectId) throw new EvidenceStateRefused("EVIDENCE_REF_CROSS_SUBJECT", "a transition crosses subjects");
  if (key === "OBSERVED->INFERRED" && !to.meta.inputRefs.includes(from.meta.evidenceRef)) refuse("the derived item does not keep the observation among its inputs");
  if (from.state === "NOT_APPLICABLE" && !(typeof scopeChange === "string" && CODE.test(scopeChange))) refuse("leaving NOT_APPLICABLE needs an explicit scope-change code");
  return Object.freeze({
    eventType: "EVIDENCE_STATE_TRANSITION",
    action: "SUPERSEDE_EVIDENCE_STATE",
    outcome: "RECORDED",
    reasonCode: `EVIDENCE_STATE_${from.state}_TO_${to.state}`,
    occurredAt: ctx.at,
    actor: ctx.actor,
    actorType: "ENGINE",
    scopeType: "GLOBAL_PRODUCT",
    tenantId: null,
    subjectId: null,
    authorityRef: ctx.authorityRef,
    authorityHash: ctx.authorityHash,
    softwareVersion: ctx.softwareVersion,
    evidenceRefs: [],
    correlationId: ctx.correlationId,
    parentEventId: null,
    migration: false,
    migrationSource: null,
    migratedAt: null,
    /* Metadata only: states, codes and hashes of the two references — never a path, a value or a payload. */
    metadata: {
      family: "S",
      from: from.state,
      to: to.state,
      rule: String(ctx.rule).slice(0, 120),
      ruleVersion: EVIDENCE_STATE_MODEL_VERSION,
      fromRef: createHash("sha256").update(fromRef, "utf8").digest("hex").slice(0, 16),
      toRef: createHash("sha256").update(toRef, "utf8").digest("hex").slice(0, 16),
      newEvidence: String(newEvidenceRefs.length),
    },
  });
}

/**
 * Record checked transitions through the F08 store it is handed — exactly one event per transition, and nothing for a
 * transition that was not checked. The identity is the pair of references, so a replayed append of the same transition
 * is an idempotent retry, never a second event.
 */
export function recordEvidenceStateTransitions({ audit, drafts }) {
  return drafts.map((d) => audit.store.append(d, { identity: { eventType: d.eventType, fromRef: d.metadata.fromRef, toRef: d.metadata.toRef } }));
}
