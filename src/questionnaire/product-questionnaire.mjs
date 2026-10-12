/**
 * 🔴 THE CLIENT PRODUCT QUESTIONNAIRE — ONE, PRODUCT-NEUTRAL (owner answer A2, 12 October 2026, RR-250).
 *
 *   "AlmiVisibility gets ONE product-neutral client intake questionnaire. When any client adds a product, it gives the full
 *    product information there (what the product does, prices, durations, counts, with units)."
 *
 * A questionnaire records what a CLIENT SAYS about its own product. It verifies nothing. Every answer is first-party: it
 * can only ever become a SELF-SOURCED capability claim (src/facts/capability-claims.mjs) — never an independent fact,
 * never VERIFIED.
 *
 * ── THE FOUR SECTIONS, AND NOTHING ELSE ─────────────────────────────────────
 *   CAPABILITY   what the product does       a statement in plain words; it carries no value
 *   PRICE        what it costs               a money value WITH its unit (the currency)
 *   DURATION     how long something lasts    a duration value WITH its unit
 *   COUNT        how many of something       a count value WITH its unit
 *
 * 🔴 THE UNIT RULE IS THE OWNER'S (A1): "a unit is required only for money, duration and count facts." A price, duration
 * or count without its unit is REFUSED here, before it can become anything. A capability statement carries no value and
 * therefore no unit, and none is asked of it.
 *
 * ── 🔴 AN ANSWER IS NOT EVIDENCE UNTIL THE OWNER APPROVES IT ────────────────
 * An answer the client did not write itself is marked INFERRED and must name what it was inferred from. Whatever its basis,
 * an answer becomes a claim ONLY when its approval is APPROVED and names the committed record of that approval (A2: "the
 * owner approves them in plain words before they become evidence"). A PENDING or REJECTED answer yields nothing — not a
 * weaker claim, nothing.
 *
 * 🔴 NO CLIENT KNOWLEDGE. Nothing here names a client, product, host or tenant. A client's words live only in its answers.
 */
import { findSecrets } from "../intake/secrets.mjs";
import { TENANT_ID_PATTERN } from "../tenancy/resolver.mjs";
import { CAPABILITY_KIND, SELF_SOURCED } from "../facts/capability-claims.mjs";

export const SCHEMA_VERSION = 1;
export const CONTRACT_ID = "product-questionnaire/1";

/** The one file a product's fact registry may hold its questionnaire in. The leading underscore keeps it out of the fact records. */
export const QUESTIONNAIRE_FILE = "_product-questionnaire.mjs";

/** Each section, the question the client is asked in plain words, and the value type its answers carry (null: a statement only). */
export const SECTIONS = Object.freeze({
  CAPABILITY: Object.freeze({ question: "What does the product do for its user? One plain statement per thing it does.", valueType: null }),
  PRICE: Object.freeze({ question: "What does the product cost? Each price with its amount, its currency and what it buys.", valueType: "money" }),
  DURATION: Object.freeze({ question: "How long does each thing last (a trial, a billing period, a timed task)? Each with its number and its unit.", valueType: "duration" }),
  COUNT: Object.freeze({ question: "How many of each thing does the product have or allow? Each with its number and what is being counted.", valueType: "count" }),
});

/** A1, the owner's rule: the value types that must carry a unit. No other type is ever judged for one. */
export const UNIT_REQUIRED_VALUE_TYPES = Object.freeze(["money", "duration", "count"]);

export const BASES = Object.freeze({
  CLIENT_DECLARED: "the client wrote this answer itself",
  INFERRED: "someone else filled this answer in from the product's own code or public site; the client has not yet said it",
});
export const INFERRED_FROM_KINDS = Object.freeze(["CODE", "PUBLIC_SITE"]);
export const APPROVAL_STATES = Object.freeze(["PENDING", "APPROVED", "REJECTED"]);

export const TOP_LEVEL_FIELDS = Object.freeze(["schemaVersion", "contractId", "questionnaireId", "tenantId", "productId", "submittedBy", "submittedOn", "answers"]);
export const ANSWER_FIELDS = Object.freeze(["answerId", "section", "statement", "value", "basis", "inferredFrom", "approval"]);

/** LAW-BOUND-1: the one bound on the answers one questionnaire may hold. */
export const MAX_ANSWERS = 500;

const ID = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const text = (v) => typeof v === "string" && v.trim() !== "";
const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Validate one questionnaire. Returns { valid, faults } — every fault a code and a JSON path, never the client's wording.
 * Deny by default: an unknown field, section, basis or state is a fault, never ignored.
 */
export function validateQuestionnaire(q) {
  const faults = [];
  const push = (code, path) => faults.push({ code, path });
  if (!plain(q)) return { valid: false, faults: [{ code: "NOT_AN_OBJECT", path: "$" }] };
  for (const k of Object.keys(q)) if (!TOP_LEVEL_FIELDS.includes(k)) push("UNKNOWN_FIELD", `$.${k}`);
  if (q.schemaVersion !== SCHEMA_VERSION) push("SCHEMA_VERSION_UNKNOWN", "$.schemaVersion");
  if (q.contractId !== CONTRACT_ID) push("CONTRACT_ID_UNKNOWN", "$.contractId");
  if (!(typeof q.questionnaireId === "string" && ID.test(q.questionnaireId))) push("QUESTIONNAIRE_ID_MALFORMED", "$.questionnaireId");
  if (!(typeof q.tenantId === "string" && TENANT_ID_PATTERN.test(q.tenantId))) push("TENANT_ID_ABSENT_OR_MALFORMED", "$.tenantId");
  if (!(typeof q.productId === "string" && ID.test(q.productId))) push("PRODUCT_ID_ABSENT_OR_MALFORMED", "$.productId");
  if (!text(q.submittedBy)) push("SUBMITTED_BY_ABSENT", "$.submittedBy");
  if (!(typeof q.submittedOn === "string" && ISO_DAY.test(q.submittedOn))) push("SUBMITTED_ON_ABSENT_OR_MALFORMED", "$.submittedOn");
  if (!Array.isArray(q.answers)) { push("ANSWERS_NOT_A_LIST", "$.answers"); return { valid: false, faults }; }
  if (q.answers.length > MAX_ANSWERS) push("ANSWERS_OVER_BOUND", "$.answers");
  const seen = new Set();
  q.answers.forEach((a, i) => {
    const at = `$.answers[${i}]`;
    if (!plain(a)) { push("ANSWER_NOT_AN_OBJECT", at); return; }
    for (const k of Object.keys(a)) if (!ANSWER_FIELDS.includes(k)) push("UNKNOWN_FIELD", `${at}.${k}`);
    if (!(typeof a.answerId === "string" && ID.test(a.answerId))) push("ANSWER_ID_MALFORMED", `${at}.answerId`);
    else if (seen.has(a.answerId)) push("ANSWER_ID_DUPLICATED", `${at}.answerId`);
    else seen.add(a.answerId);
    if (!text(a.statement)) push("STATEMENT_ABSENT", `${at}.statement`);
    const section = Object.hasOwn(SECTIONS, a.section ?? "") ? SECTIONS[a.section] : null;
    if (!section) push("SECTION_UNKNOWN", `${at}.section`);
    else if (section.valueType === null) {
      if (a.value !== null) push("CAPABILITY_CARRIES_A_VALUE", `${at}.value`);
    } else if (!plain(a.value)) push("VALUE_ABSENT", `${at}.value`);
    else {
      if (a.value.valueType !== section.valueType) push("VALUE_TYPE_NOT_OF_ITS_SECTION", `${at}.value.valueType`);
      if (!(typeof a.value.value === "number" && Number.isFinite(a.value.value) && a.value.value >= 0)) push("VALUE_NOT_A_NUMBER", `${at}.value.value`);
      /* A1 — the owner's rule, and the only unit rule there is */
      if (UNIT_REQUIRED_VALUE_TYPES.includes(a.value.valueType) && !text(a.value.unit)) push("UNIT_REQUIRED_AND_ABSENT", `${at}.value.unit`);
    }
    if (!Object.hasOwn(BASES, a.basis ?? "")) push("BASIS_UNKNOWN", `${at}.basis`);
    if (!Array.isArray(a.inferredFrom)) push("INFERRED_FROM_NOT_A_LIST", `${at}.inferredFrom`);
    else {
      if (a.basis === "INFERRED" && a.inferredFrom.length === 0) push("INFERRED_WITHOUT_ITS_SOURCE", `${at}.inferredFrom`);
      a.inferredFrom.forEach((s, j) => { if (!(plain(s) && INFERRED_FROM_KINDS.includes(s.kind) && text(s.ref))) push("INFERRED_FROM_MALFORMED", `${at}.inferredFrom[${j}]`); });
    }
    const p = a.approval;
    if (!(plain(p) && APPROVAL_STATES.includes(p.state))) push("APPROVAL_STATE_UNKNOWN", `${at}.approval`);
    else if (p.state === "APPROVED") {
      if (!text(p.by)) push("APPROVAL_WITHOUT_ITS_APPROVER", `${at}.approval.by`);
      if (!(typeof p.on === "string" && ISO_DAY.test(p.on))) push("APPROVAL_WITHOUT_ITS_DATE", `${at}.approval.on`);
      if (!(plain(p.record) && text(p.record.repo) && text(p.record.path) && typeof p.record.commit === "string" && COMMIT.test(p.record.commit))) push("APPROVAL_WITHOUT_ITS_COMMITTED_RECORD", `${at}.approval.record`);
    }
  });
  for (const s of findSecrets(q)) push("SECRET_SHAPED_VALUE", s.path ?? "$");
  return { valid: faults.length === 0, faults };
}

/** Is this answer evidence? Only an APPROVED answer of a VALID questionnaire is; the caller validates first. */
export const isApproved = (a) => a?.approval?.state === "APPROVED";

/**
 * The capability claims a questionnaire yields: one per APPROVED answer, none for any other. An invalid questionnaire yields
 * NONE and reports why — half a questionnaire is not evidence. Every claim is SELF-SOURCED by the owner's declaration, holds
 * no tier and is UNVERIFIED; the existing admission (admitCapabilityClaim) still decides each one.
 */
export function capabilityClaimsOf(q) {
  const v = validateQuestionnaire(q);
  if (!v.valid) return { claims: [], answers: Array.isArray(q?.answers) ? q.answers.length : 0, approved: 0, withheld: Array.isArray(q?.answers) ? q.answers.length : 0, faults: v.faults };
  const approved = q.answers.filter(isApproved);
  const claims = approved.map((a) => Object.freeze({
    kind: CAPABILITY_KIND,
    capabilityId: a.answerId,
    section: a.section,
    statement: a.statement,
    value: a.value === null ? null : Object.freeze({ ...a.value }),
    scope: Object.freeze({ tenantId: q.tenantId, productId: q.productId }),
    source: Object.freeze({ class: SELF_SOURCED, declarationRef: `${a.approval.record.repo}:${a.approval.record.path}@${a.approval.record.commit}`, tier: null }),
    checker: a.approval.by,
    date: a.approval.on,
    freshness: Object.freeze({ state: "DECLARED", declaredOn: a.approval.on }),
    provenance: Object.freeze([`questionnaire:${q.questionnaireId}`, `basis:${a.basis}`, ...a.inferredFrom.map((s) => `inferred-from:${s.kind}:${s.ref}`), `approved-by:${a.approval.by}`]),
    verificationState: "UNVERIFIED",
  }));
  return { claims, answers: q.answers.length, approved: approved.length, withheld: q.answers.length - approved.length, faults: [] };
}

/** One answer in plain words, for the person who must approve it. A value is printed with its unit, never bare. */
export function plainWords(a) {
  const v = a?.value === null || a?.value === undefined ? "" : ` — ${a.value.value} ${a.value.unit ?? "(NO UNIT)"}`;
  return `${a.statement}${v}`;
}

/** Count-only summary of one questionnaire: by section, by basis and by approval state. */
export function summarise(q) {
  const tally = (key) => (Array.isArray(q?.answers) ? q.answers : []).reduce((t, a) => { const k = key(a) ?? "(none)"; t[k] = (t[k] ?? 0) + 1; return t; }, {});
  return { answers: Array.isArray(q?.answers) ? q.answers.length : 0, bySection: tally((a) => a?.section), byBasis: tally((a) => a?.basis), byApproval: tally((a) => a?.approval?.state) };
}
