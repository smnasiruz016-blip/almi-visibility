/**
 * F41 · CONTENT BRIEF ENGINE — measured evidence turned into an implementation-ready, reviewable brief (acceptance _handoffs 454396e).
 *
 * Spec row: "Turn measured evidence into an implementation-ready, reviewable brief." Spec line 185: "Use competitor evidence as input,
 * not a universal word-count prescription." Spec §1: a recommendation and an approved item are different states. The owner's words for
 * this row (historical row 34, provenance only): INPUT "the evidence for one approved action"; the eleven sections below; FAILURE "any
 * required section missing, or a fact without a source".
 *
 *   NOT_ISSUED   no RECORDED owner approval of a chosen F35 action — a recommendation alone produces no brief
 *   INCOMPLETE   approved, but a required section is MISSING — each named with its missing fact
 *   READY        approved, and every section FILLED from recorded evidence (its evidence identities and rule carried)
 *
 * Facts: only VERIFIED registry facts with a source and a USABLE or FRESH freshness state enter a brief; every other candidate fact is
 * EXCLUDED and named (stricter than "not STALE": EXPIRED and UNKNOWN freshness are not fresh enough either). No word-count or length
 * target exists anywhere in a brief; competitor evidence is carried only as a recorded diagnostic input. Pure: F41 writes no page.
 */
import { freshnessOf } from "../facts/lifecycle.mjs";

export const SECTIONS = Object.freeze(["intent", "entities", "questions", "verifiedFactsAndSources", "uniqueValue", "localeTerms", "internalLinks", "cta", "schema", "prohibitedClaims", "acceptanceCriteria"]);
export const BRIEF_STATE = Object.freeze({ READY: "READY", INCOMPLETE: "INCOMPLETE", NOT_ISSUED: "NOT_ISSUED" });
export const FRESH_ENOUGH = Object.freeze(["USABLE", "FRESH"]);
/** The recorded rules a page built from this brief must pass — the frozen acceptances of the production gates. */
export const ACCEPTANCE_CRITERIA = Object.freeze([
  Object.freeze({ gate: "F34 existing-page check: NO_EXISTING_PAGE or NOT_COVERED", ref: "_handoffs 53f74b4" }),
  Object.freeze({ gate: "F36 right-to-exist ESTABLISHED", ref: "_handoffs 2635153" }),
  Object.freeze({ gate: "F39 original information gain ESTABLISHED", ref: "_handoffs 90e798d" }),
  Object.freeze({ gate: "Gate A adaptive parts (facts, completeness, overlap) PASS", ref: "src/page/construct.mjs" }),
]);
export const MISSING = Object.freeze({
  APPROVAL: "a recorded owner approval of this action for this subject — none is recorded; none is assumed or requested (no new owner labels)",
  NO_ACTION: "F35 chose no action for this subject (CANNOT DECIDE) — there is nothing to approve",
  intent: "the registered need this subject serves (F33) — none is recorded for it",
  entities: "a recorded entity list for the need — no store exists",
  questions: "a recorded question set for the need (F10 held) — none is recorded",
  verifiedFactsAndSources: "at least one VERIFIED registry fact with a source and a USABLE or FRESH freshness state for this subject",
  uniqueValue: "a recorded information-gain record (F39) — none is recorded",
  localeTerms: "recorded search-language evidence for the need's locale — none is recorded",
  internalLinks: "recorded internal link targets within a COMPLETE inventory (F31) — the inventory is not COMPLETE or no edge is recorded",
  cta: "a recorded call to action for the product — none is declared",
  schema: "a recorded structured-data type for the page — none is declared",
  prohibitedClaims: "a recorded list of prohibited claims for the product — none is declared",
});

const filled = (rule, content, evidence) => Object.freeze({ state: "FILLED", rule, content, evidence: Object.freeze(evidence.filter(Boolean)) });
const missing = (key, why = MISSING[key]) => Object.freeze({ state: "MISSING", missing: why });
const recorded = (x) => x && typeof x.ref === "string" && x.ref !== "";

/** The facts a brief may carry, and every one it may not — with why. */
export function selectFacts(facts, { now }) {
  const included = [];
  const excluded = [];
  for (const f of facts ?? []) {
    const hasSource = Boolean(f?.source && (f.source.url || f.source.documentRef));
    const fresh = freshnessOf(f, { now }).state;
    const why = !hasSource ? "NO_SOURCE" : f.verificationState !== "VERIFIED" ? "NOT_VERIFIED" : !FRESH_ENOUGH.includes(fresh) ? `FRESHNESS_${fresh}` : null;
    if (why) excluded.push(Object.freeze({ factId: f?.id ?? null, why }));
    else included.push(Object.freeze({ factId: f.id, source: f.source.documentRef ?? f.source.url, freshness: fresh }));
  }
  return { included, excluded };
}

/**
 * One subject's brief.
 * @param {{ decision: object, approvals: object[], evidence: object, now?: Date }} input
 *   decision   an F35 decision ({ subject, decision, actions })
 *   approvals  RECORDED owner approvals: { subject: {kind, id}, action, ref }
 *   evidence   the recorded section inputs: { need, entities, questions, facts, gain, links, cta, schema, prohibitedClaims, competitorInputs }
 */
export function buildBrief({ decision, approvals, evidence, now = new Date() }) {
  if (!Array.isArray(approvals)) throw new TypeError("approvals must be passed explicitly — an empty list is a recorded fact, not a default");
  const id = decision.subject.pageId ?? decision.subject.slug;
  const subject = Object.freeze({ kind: decision.subject.kind, id });
  if (decision.decision !== "CHOSEN" || decision.actions.length === 0) return Object.freeze({ subject, state: BRIEF_STATE.NOT_ISSUED, missing: Object.freeze([MISSING.NO_ACTION]) });
  const approval = approvals.find((a) => recorded(a) && a.subject?.kind === subject.kind && a.subject?.id === id && decision.actions.some((x) => x.action === a.action)) ?? null;
  if (!approval) return Object.freeze({ subject, state: BRIEF_STATE.NOT_ISSUED, recommended: Object.freeze(decision.actions.map((a) => a.action)), missing: Object.freeze([MISSING.APPROVAL]) });

  const e = evidence ?? {};
  const facts = selectFacts(e.facts, { now });
  const s = {};
  s.intent = recorded(e.need) && e.need.value ? filled("THE_REGISTERED_NEED_THE_SUBJECT_SERVES", e.need.value, [e.need.ref]) : missing("intent");
  s.entities = recorded(e.entities) && e.entities.items?.length ? filled("RECORDED_ENTITIES_FOR_THE_NEED", [...e.entities.items], [e.entities.ref]) : missing("entities");
  s.questions = recorded(e.questions) && e.questions.items?.length ? filled("RECORDED_QUESTIONS_FOR_THE_NEED", [...e.questions.items], [e.questions.ref]) : missing("questions");
  s.verifiedFactsAndSources = facts.included.length ? filled("VERIFIED_SOURCED_FRESH_REGISTRY_FACTS", facts.included, facts.included.map((f) => f.factId)) : missing("verifiedFactsAndSources");
  s.uniqueValue = recorded(e.gain) && e.gain.adds ? filled("A_RECORDED_INFORMATION_GAIN_RECORD", { kind: e.gain.kind, adds: e.gain.adds }, [e.gain.ref]) : missing("uniqueValue");
  s.localeTerms = recorded(e.localeTerms) && e.localeTerms.items?.length ? filled("RECORDED_SEARCH_LANGUAGE_EVIDENCE", [...e.localeTerms.items], [e.localeTerms.ref]) : missing("localeTerms");
  s.internalLinks = recorded(e.links) && e.links.completeness === "COMPLETE" && e.links.targets?.length ? filled("RECORDED_LINK_TARGETS_IN_A_COMPLETE_INVENTORY", [...e.links.targets], [e.links.ref]) : missing("internalLinks");
  s.cta = recorded(e.cta) && e.cta.text ? filled("A_RECORDED_PRODUCT_CALL_TO_ACTION", e.cta.text, [e.cta.ref]) : missing("cta");
  s.schema = recorded(e.schema) && e.schema.type ? filled("A_RECORDED_STRUCTURED_DATA_TYPE", e.schema.type, [e.schema.ref]) : missing("schema");
  s.prohibitedClaims = recorded(e.prohibitedClaims) && e.prohibitedClaims.items?.length ? filled("A_RECORDED_PROHIBITED_CLAIMS_LIST", [...e.prohibitedClaims.items], [e.prohibitedClaims.ref]) : missing("prohibitedClaims");
  s.acceptanceCriteria = filled("THE_FROZEN_PRODUCTION_GATES", ACCEPTANCE_CRITERIA.map((c) => c.gate), ACCEPTANCE_CRITERIA.map((c) => c.ref));

  const missingSections = SECTIONS.filter((k) => s[k].state === "MISSING");
  return Object.freeze({
    subject,
    state: missingSections.length ? BRIEF_STATE.INCOMPLETE : BRIEF_STATE.READY,
    action: approval.action,
    approval: approval.ref,
    sections: Object.freeze(s),
    missing: Object.freeze(missingSections.map((k) => `${k}: ${s[k].missing}`)),
    excludedFacts: Object.freeze(facts.excluded),
    /* competitor evidence: a recorded diagnostic input only — never a length target, never a fact */
    diagnostics: Object.freeze((e.competitorInputs ?? []).filter(recorded).map((c) => c.ref)),
  });
}

export function summariseBriefs(briefs) {
  const by = (f) => briefs.reduce((m, b) => ((m[f(b)] = (m[f(b)] ?? 0) + 1), m), {});
  return Object.freeze({ population: briefs.length, state: by((b) => b.state) });
}
