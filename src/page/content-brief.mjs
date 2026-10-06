/**
 * F41 · CONTENT BRIEF ENGINE — measured evidence turned into an implementation-ready, reviewable brief (acceptance _handoffs 454396e, as
 * amended by Acceptance Amendment 1, _handoffs be0ec9d, RR-179: C1 as amended under the owner's decision D5, and C8).
 *
 * Spec row: "Turn measured evidence into an implementation-ready, reviewable brief." Spec line 185: "Use competitor evidence as input,
 * not a universal word-count prescription." Spec §1: a recommendation and an approved item are different states. The owner's words for
 * this row (historical row 34, provenance only): the eleven sections below; FAILURE "any required section missing, or a fact without a
 * source".
 *
 * 🔴 C1 AS AMENDED (D5, RTP-1 S40 with Correction 1): a routine brief is PREPARED for an action F35 chose WITHOUT the owner's per-item
 * approval. A brief is a recommendation and a preparation — never an approval, never labelled or counted as one. A complete passing preview
 * is put before the owner for publication approval (`previewForOwner`); publication, and any live or client-site change, happen only with
 * his exact recorded approval (`publicationDecision` — F41 itself publishes nothing). No approval is assumed.
 *
 *   NOT_ISSUED   F35 chose no action for this subject — there is nothing to prepare
 *   INCOMPLETE   prepared, but a required section is MISSING — each named with its missing fact
 *   READY        prepared, and every section FILLED from recorded evidence (its evidence identities and rule carried)
 *
 * 🔴 C8: the brief carries each question's TIER and GENERATED marking (a question item without its tier is excluded and named — never shown
 * untiered, never as observed), and a grouped need's brief names the GROUPED NEED as its intent.
 *
 * Facts: VERIFIED registry facts with a source and a USABLE or FRESH freshness state (C3), and — in a grouped need's brief — the SUPPORTED
 * claims of its answer (F91 C17), each with its label (RESPONSIBLE BODY · PRODUCT'S OWN SITE · SECONDARY), its source's name, link and date
 * read, and its freshness under v3 §10.4 (C8 narrows C3). A claim records no fact class, so the strictest §10.4 window (30 days, "urgent or
 * highly dynamic") is applied — a declared choice, never presented as a measured requirement. An UNKNOWN part is carried as UNKNOWN, never
 * placed as a fact; no claim is excluded for its label or its source's category or tier. Every excluded fact is named. No word-count or
 * length target exists anywhere in a brief; competitor evidence is carried only as a recorded diagnostic input. Pure: F41 writes no page.
 */
import { createHash } from "node:crypto";
import { JUDGED_KIND as F40_JUDGED_KIND } from "./quality-judgements.mjs";
import { freshnessOf } from "../facts/lifecycle.mjs";

export const SECTIONS = Object.freeze(["intent", "entities", "questions", "verifiedFactsAndSources", "uniqueValue", "localeTerms", "internalLinks", "cta", "schema", "prohibitedClaims", "acceptanceCriteria"]);
export const BRIEF_STATE = Object.freeze({ READY: "READY", INCOMPLETE: "INCOMPLETE", NOT_ISSUED: "NOT_ISSUED" });
export const FRESH_ENOUGH = Object.freeze(["USABLE", "FRESH"]);
/** D5 · what a brief is: a recommendation and a preparation — never an approval. */
export const STANDING = "RECOMMENDATION — a preparation for review, never an approval";
/** v3 §10.4's strictest recheck window, applied to an answer claim that records no fact class (a declared choice). */
export const CLAIM_RECHECK_DAYS = 30;
/** The recorded rules a page built from this brief must pass — the frozen acceptances of the production gates. */
export const ACCEPTANCE_CRITERIA = Object.freeze([
  Object.freeze({ gate: "F35 chose CREATE for the need — construction acts only on F35's decision (ruling RR-179 (c))", ref: "_handoffs a8dc190" }),
  Object.freeze({ gate: "F34 existing-page check: NO_EXISTING_PAGE or NOT_COVERED", ref: "_handoffs 53f74b4" }),
  Object.freeze({ gate: "F36 right-to-exist ESTABLISHED", ref: "_handoffs 2635153" }),
  Object.freeze({ gate: "F39 original information gain ESTABLISHED", ref: "_handoffs 90e798d" }),
  Object.freeze({ gate: "Gate A adaptive parts (facts, completeness, overlap) PASS", ref: "src/page/construct.mjs" }),
]);
export const MISSING = Object.freeze({
  NO_ACTION: "F35 chose no action for this subject (CANNOT DECIDE / HOLD) — there is nothing to prepare",
  intent: "the registered need this subject serves (F33), or the grouped need F91 formed — none is recorded for it",
  entities: "a recorded entity list for the need — no store exists",
  questions: "a recorded question set for the need, each question with its tier and marking — none is recorded",
  verifiedFactsAndSources: "at least one VERIFIED registry fact, or one supported answer claim (F91 C17), with a source and a USABLE or FRESH freshness state for this subject",
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
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIERS = Object.freeze(["OBSERVED", "RESEARCH-DERIVED"]);

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
 * C8 (narrowing C3) · a grouped need's answer claims (F91 C17's judged claims): every SUPPORTED claim is placed with its label, source and
 * freshness; every other claim is an UNKNOWN part, carried and never placed as a fact. A claim is excluded only for a missing or stale
 * source — never for its label or its source's category or tier.
 */
export function selectAnswerClaims(claims, { now }) {
  const included = [], excluded = [], unknown = [];
  for (const c of claims ?? []) {
    if (c?.state !== "SUPPORTED") { unknown.push(Object.freeze({ claimId: c?.claimId ?? null, state: "UNKNOWN", why: c?.why ?? "unsupported" })); continue; }
    const s = c.source ?? {};
    if (!s.name || !s.link || !ISO_DAY.test(s.readOn ?? "")) { excluded.push(Object.freeze({ claimId: c.claimId, why: "NO_SOURCE" })); continue; }
    const due = new Date(`${s.readOn}T00:00:00Z`); due.setUTCDate(due.getUTCDate() + CLAIM_RECHECK_DAYS);
    if (now > due) { excluded.push(Object.freeze({ claimId: c.claimId, why: "FRESHNESS_STALE" })); continue; }
    included.push(Object.freeze({ claimId: c.claimId, label: c.label, source: Object.freeze({ name: s.name, link: s.link, readOn: s.readOn }), freshness: "USABLE", dueOn: due.toISOString().slice(0, 10) }));
  }
  return { included, excluded, unknown };
}

/** C8 · the question items a brief may carry — each with its tier and marking; an item without its tier is excluded and named. */
export function selectQuestions(items) {
  const included = [], excluded = [];
  for (const q of items ?? []) {
    if (!q || typeof q.wording !== "string" || q.wording.trim() === "" || !TIERS.includes(q.tier)) { excluded.push(Object.freeze({ question: q?.questionId ?? null, why: "NO_TIER" })); continue; }
    included.push(Object.freeze({ questionId: q.questionId ?? null, question: q.wording, tier: q.tier, marking: q.marking ?? null, observed: q.tier === "OBSERVED" }));
  }
  return { included, excluded };
}

/**
 * One subject's brief — prepared without a per-item approval (D5).
 * @param {{ decision: object, evidence: object, now?: Date }} input
 *   decision   an F35 decision ({ subject, decision, actions }) — an existing page, a declared spec, or a grouped need
 *   evidence   the recorded section inputs: { need, entities, questions, facts, answerClaims, gain, links, cta, schema, prohibitedClaims, competitorInputs }
 */
export function buildBrief({ decision, evidence, now = new Date() }) {
  const id = decision.subject.pageId ?? decision.subject.slug ?? decision.subject.needId;
  const subject = Object.freeze({ kind: decision.subject.kind, id });
  if (decision.decision !== "CHOSEN" || decision.actions.length === 0) return Object.freeze({ subject, state: BRIEF_STATE.NOT_ISSUED, standing: STANDING, missing: Object.freeze([MISSING.NO_ACTION]) });

  const e = evidence ?? {};
  const facts = selectFacts(e.facts, { now });
  const claims = selectAnswerClaims(e.answerClaims, { now });
  const qs = selectQuestions(e.questions?.items);
  const grouped = decision.subject.kind === "GROUPED_NEED";
  const s = {};
  s.intent = grouped
    ? (recorded(e.need) && e.need.groupedNeed === decision.subject.needId ? filled("THE_GROUPED_NEED_F91_FORMED", Object.freeze({ groupedNeed: e.need.groupedNeed, pageCandidate: e.need.pageCandidate ?? null }), [e.need.ref]) : missing("intent"))
    : (recorded(e.need) && e.need.value ? filled("THE_REGISTERED_NEED_THE_SUBJECT_SERVES", e.need.value, [e.need.ref]) : missing("intent"));
  s.entities = recorded(e.entities) && e.entities.items?.length ? filled("RECORDED_ENTITIES_FOR_THE_NEED", [...e.entities.items], [e.entities.ref]) : missing("entities");
  s.questions = recorded(e.questions) && qs.included.length ? filled("RECORDED_QUESTIONS_WITH_TIER_AND_MARKING", qs.included, [e.questions.ref]) : missing("questions");
  const placed = [...facts.included, ...claims.included];
  s.verifiedFactsAndSources = placed.length ? filled("VERIFIED_REGISTRY_FACTS_AND_SUPPORTED_ANSWER_CLAIMS", placed, placed.map((f) => f.factId ?? f.claimId)) : missing("verifiedFactsAndSources");
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
    standing: STANDING,
    recommended: Object.freeze(decision.actions.map((a) => a.action)),
    sections: Object.freeze(s),
    missing: Object.freeze(missingSections.map((k) => `${k}: ${s[k].missing}`)),
    excludedFacts: Object.freeze([...facts.excluded, ...claims.excluded]),
    excludedQuestions: Object.freeze(qs.excluded),
    unknownParts: Object.freeze(claims.unknown),
    /* competitor evidence: a recorded diagnostic input only — never a length target, never a fact */
    diagnostics: Object.freeze((e.competitorInputs ?? []).filter(recorded).map((c) => c.ref)),
  });
}

export const PREVIEW = Object.freeze({ PUT_FORWARD: "PUT_FORWARD_FOR_THE_OWNER'S_PUBLICATION_APPROVAL", NOT_PUT_FORWARD: "NOT_PUT_FORWARD" });
/**
 * D5 · a COMPLETE PASSING preview is put before the owner for publication approval: construction ACCEPTED it (every frozen gate passed)
 * and its brief is READY. Anything else is NOT put forward, its missing parts named. A preview is never an approval and publishes nothing.
 */
/**
 * F41 C9 (Acceptance Amendment 2, RR-188; policy A): a preview is put forward only when F40's recorded result for the SAME subject — the
 * brief's subject of the kind F40 judges, with the same id — and the SAME content sha256 as the constructed page is a full PASS. Otherwise
 * NOT_PUT_FORWARD, F40's gate verdict and each blocker carried word for word. F41 reads F40's result; it never re-judges or overrides it.
 */
export function previewForOwner({ construction, brief, f40 = null }) {
  const missingParts = [];
  const pageSha = typeof construction?.html === "string" && construction.html !== "" ? createHash("sha256").update(construction.html).digest("hex") : null;
  if (!f40) missingParts.push("no F40 result for this draft — F40 has not judged it");
  else {
    if (typeof f40.contentSha256 !== "string" || f40.contentSha256 === "") missingParts.push("F40's result names no contentSha256 — it does not say which content it judged");
    else if (pageSha !== null && f40.contentSha256 !== pageSha) missingParts.push(`F40's result is for other content (${f40.contentSha256}), not this page (${pageSha})`);
    if (brief?.subject?.kind !== F40_JUDGED_KIND) missingParts.push(`the brief's subject is of kind ${brief?.subject?.kind ?? "none"}, not the kind F40 judges (${F40_JUDGED_KIND})`);
    else if (typeof brief.subject.id !== "string" || brief.subject.id === "") missingParts.push("the brief's subject has no id to match F40's subject");
    else if (brief.subject.id !== f40.subject) missingParts.push(`F40's result is for subject ${f40.subject ?? "none"}, not this brief's subject ${brief.subject.id}`);
    if (f40.judged !== true) missingParts.push(`F40 did not judge this draft: ${f40.why ?? "no reason recorded"}`);
    else if (f40.gate?.verdict !== "PASS") missingParts.push(`F40 gate ${f40.gate?.verdict ?? "absent"}`, ...(f40.gate?.blockers ?? []));
  }
  if (construction?.verdict !== "ACCEPTED" || typeof construction?.html !== "string" || construction.html === "") missingParts.push("the constructed page did not pass — construction did not ACCEPT it");
  if (brief?.state !== BRIEF_STATE.READY) missingParts.push(`the brief is ${brief?.state ?? "absent"}, not READY`);
  if (missingParts.length) return Object.freeze({ state: PREVIEW.NOT_PUT_FORWARD, missing: Object.freeze(missingParts) });
  return Object.freeze({ state: PREVIEW.PUT_FORWARD, subject: brief.subject, contentSha256: createHash("sha256").update(construction.html).digest("hex"),
    standing: "a preview put before the owner for his publication approval — not an approval, not published" });
}

/**
 * D5 · THE GUARD every publication path must pass: only the owner's EXACT recorded approval of THIS preview (same subject, same content
 * hash) lets anything be published or any live or client-site change be made. No approval is assumed. F41 itself publishes nothing — no
 * publication path exists today; this returns a decision, never an act.
 */
export function publicationDecision({ preview, approvals }) {
  if (!Array.isArray(approvals)) throw new TypeError("approvals must be passed explicitly — an empty list is a recorded fact, not a default");
  if (preview?.state !== PREVIEW.PUT_FORWARD) return Object.freeze({ outcome: "REFUSED", why: "no complete passing preview was put before the owner" });
  const exact = approvals.find((a) => recorded(a) && a.kind === "PUBLICATION" && a.exact === true && a.subject?.kind === preview.subject.kind && a.subject?.id === preview.subject.id && a.contentSha256 === preview.contentSha256);
  if (!exact) return Object.freeze({ outcome: "REFUSED", why: "no exact recorded owner approval of this preview — none is assumed" });
  return Object.freeze({ outcome: "APPROVED_BY_THE_OWNER", approval: exact.ref, published: false, note: "F41 publishes nothing; the approval is recorded for the publication path the owner names" });
}

export function summariseBriefs(briefs) {
  const by = (f) => briefs.reduce((m, b) => ((m[f(b)] = (m[f(b)] ?? 0) + 1), m), {});
  return Object.freeze({ population: briefs.length, state: by((b) => b.state) });
}
