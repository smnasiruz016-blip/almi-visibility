/**
 * F16 · C27–C32 · RESEARCH-DERIVED QUESTIONS (Acceptance Amendment 5, _handoffs 91ef421; RTP-1 Revision 6 §6–§8, issued RR-170).
 *
 *   C27  ACCEPTED   a question research returns for a question Visibility FORMED (C20) is accepted as RESEARCH-DERIVED — its own named
 *                   sub-list of C3's INFERRED list. No original-post link, quote, research date, proof that anyone asked it, or demand
 *                   category is asked of it. Its RELEVANCE is ASSESSED (RELEVANT · HELD · REJECTED) from the declaration and the
 *                   question's meaning, each assessment carrying its five fields and the SOURCE of the assessment (a method or an agent).
 *                   No approval field exists anywhere here: an assessment is never the owner's approval and never observed demand.
 *   C28  TWO ROUTES route 1 (the client's own AI connection) and route 2 (the client's own research, returned against a formed question).
 *                   Neither is a condition. A statement tied to no formed question is a CLIENT CLAIM. An optional REFERENCE is kept as a
 *                   reference: never required, never fetched, never resolved as a lead, never dead while unfetched, never promoting.
 *   C29  GENERATED  the provider's question WORDING is kept, marked GENERATED, in its own field — never a quote, never attributed to anyone.
 *                   Wording that ATTRIBUTES itself ("people often ask…") is an attribution claim and needs observed evidence. The
 *                   provider's ANSWER text never reaches any record here: there is no field for it.
 *   C30  NO WINDOW  nothing here reads a date to accept, keep, age or expire a question; `recorded_at` is chronology only.
 *   C31  ITS TYPE   its own record type and its own count, never converted into or from any of F16's five kinds.
 *   C32  OWNED      an owned search query is OWNED SEARCH EVIDENCE — never a client-received question, never research-derived, never demand.
 * Pure: records and declarations in, decisions and records out. It holds no transport and names no product, provider, host or tenant.
 */
import { createHash } from "node:crypto";
import { ROUTE_RECORD } from "./research-routes.mjs";
import { LEAD_RECORD } from "./lead-intake.mjs";
import { RECORD_TYPE as PUBLIC_QUESTION } from "./public-questions.mjs";

export const RESEARCH_DERIVED_RECORD = "research_derived_question";
export const ASSESSMENT_RECORD = "relevance_assessment";
export const TIER = "RESEARCH-DERIVED";
export const PARENT_KIND = "INFERRED";
export const ROUTES = Object.freeze({ CLIENT_AI: "ROUTE_1_CLIENT_AI_CONNECTION", CLIENT_RESEARCH: "ROUTE_2_CLIENT_RESEARCH" });
export const RELEVANCE = Object.freeze({ RELEVANT: "RELEVANT", HELD: "HELD", REJECTED: "REJECTED" });
export const ASSESSOR_KINDS = Object.freeze({ METHOD: "METHOD", AGENT: "AGENT" });
export const OPTIONAL_REFERENCE = "OPTIONAL_REFERENCE";
export const SUBMISSION = Object.freeze({ RESEARCH_DERIVED: "RESEARCH_DERIVED", CLIENT_CLAIM: "CLIENT_CLAIM", OWNED_SEARCH_EVIDENCE: "OWNED_SEARCH_EVIDENCE", REFUSED: "REFUSED" });
export const OWNED_SEARCH_SOURCE = "OWNED_SEARCH";
/**
 * C31 · F16's five kinds (C21), each by its identity — its record type, and for the two kept as `public_question` records, its C3 kind. A
 * research-derived question converts into none of them, nor any of them into it.
 */
export const FIVE_KINDS = Object.freeze({ route: ROUTE_RECORD, lead: LEAD_RECORD, sourceVerifiedQuestion: `${PUBLIC_QUESTION}:OBSERVED`, keywordIdea: "keyword_signal", clientClaim: `${PUBLIC_QUESTION}:CLIENT_CLAIM` });
/** The kind identity of a stored record: its record type, or for a public question, its type and its C3 kind. */
export const kindIdentityOf = (r) => (r?.record_type === PUBLIC_QUESTION ? `${PUBLIC_QUESTION}:${r.value?.kind ?? "?"}` : r?.record_type ?? null);
export const STATUS = "RESEARCH-DERIVED — nobody is shown to have asked it; never OBSERVED, never verified public demand, never a client-received question";
export const REFERENCE_MEANING = "an optional reference the client or a research route gave — stored as given, never fetched, never resolved as a lead, never proof that anyone asked";
export const ASSESSMENT_MEANING = "assessed from the subject's declaration and the question's meaning — never the owner's approval, never observed demand";
export const NOT_YET_ASSESSED = "NOT YET ASSESSED — held until a method or an agent assesses its relevance";
const MAX_WORDING = 400;
const URL_IN_TEXT = /https?:\/\//i;
const present = (v) => typeof v === "string" && v.trim() !== "";
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 32);
const oneLine = (s) => String(s).replace(/\s+/g, " ").trim();

/**
 * C29 · the GENERATED question wording a provider's output carries — only from its structured `questions` list, each marked generated.
 * Never from prose: an output's text, title or summary is not read here. A wording that holds a web address is dropped whole, so no
 * address the search did not return leaves this way (C25 as narrowed).
 */
export function generatedWordingOf(output, cap) {
  const out = [];
  for (const q of Array.isArray(output?.questions) ? output.questions : []) {
    if (out.length >= cap) break;
    if (q?.generated !== true || !present(q?.wording)) continue;
    const w = oneLine(q.wording);
    if (w.length > MAX_WORDING || URL_IN_TEXT.test(w) || out.includes(w)) continue;
    out.push(w);
  }
  return out;
}

/** C28 · an optional reference, kept as given: never fetched, never a lead, never resolved — so never a dead lead. */
export function optionalReference(value) {
  if (!present(value)) return null;
  return Object.freeze({ kind: OPTIONAL_REFERENCE, value: value.trim(), fetched: false, meaning: REFERENCE_MEANING });
}

/**
 * C27/C29/C31 · one research-derived question. It asks for the formed question it answers, its route and its wording — and for nothing
 * else: no link, no quote, no date, no proof, no demand category.
 */
export function researchDerivedQuestion({ subject, planId = null, queryId, route, wording, providerId = null, reference = null, at }) {
  if (!Object.values(ROUTES).includes(route)) throw new TypeError("a research-derived question names its route (ROUTE_1 or ROUTE_2)");
  if (!present(subject) || !present(queryId)) throw new TypeError("a research-derived question names its subject and the formed research question it answers");
  if (!present(wording)) throw new TypeError("a research-derived question carries its wording");
  if (route === ROUTES.CLIENT_AI && !present(providerId)) throw new TypeError("a route-1 question names the client's provider");
  const text = oneLine(wording);
  const id = hash([subject, queryId, route, text]);
  return Object.freeze({
    record_type: RESEARCH_DERIVED_RECORD, question_id: id, measurement_key: `${RESEARCH_DERIVED_RECORD}:${id}`,
    subject, plan_id: planId, query_id: queryId, route, tier: TIER, parent_kind: PARENT_KIND,
    sourceId: route === ROUTES.CLIENT_AI ? `client-ai-connection:${providerId}` : "client-research",
    wording: Object.freeze({ text, generated: route === ROUTES.CLIENT_AI }),
    reference: optionalReference(reference),
    recorded_at: at, status: STATUS,
  });
}

/**
 * C28/C32 · what a route-2 submission is. Tied to a formed question Visibility gave → RESEARCH_DERIVED (nothing else asked of it).
 * An owned search query → OWNED_SEARCH_EVIDENCE, never a question. Any other statement → a CLIENT CLAIM.
 */
export function classifySubmission(row, { formedIds }) {
  if (row?.source === OWNED_SEARCH_SOURCE) return { kind: SUBMISSION.OWNED_SEARCH_EVIDENCE, code: "OWNED_SEARCH_EVIDENCE_IS_NOT_A_QUESTION" };
  if (!present(row?.wording)) return { kind: SUBMISSION.REFUSED, code: "SUBMISSION_HAS_NO_WORDING" };
  if (present(row.formedQueryId) && formedIds.has(row.formedQueryId)) return { kind: SUBMISSION.RESEARCH_DERIVED, code: null };
  return { kind: SUBMISSION.CLIENT_CLAIM, code: null };
}

/** C28 · a statement tied to no formed question: the client's own claim, a C3 CLIENT_CLAIM — never evidence, never research-derived. */
export function clientClaimRecord({ subject, wording, at }) {
  const text = oneLine(wording);
  const id = hash(["client-claim", subject, text]);
  return Object.freeze({ record_type: PUBLIC_QUESTION, question_id: id, measurement_key: `${PUBLIC_QUESTION}:${id}`, recorded_at: at,
    value: Object.freeze({ kind: "CLIENT_CLAIM", subject, original: text, provenance: Object.freeze({ given: "a route-2 statement tied to no formed research question" }) }) });
}

const APPROVAL_FIELD = /approv/i;
const HUMAN_WORD = /\bhuman\b/i;
/**
 * C27 · one relevance assessment, with its five fields: the declaration version, the meaning test, the verdict, a one-line reason, and the
 * source (a METHOD or an AGENT). A refusal is named; nothing is assumed. No approval field is accepted, and the word "human" never appears.
 */
export function assessmentRecord({ question, draft, at }) {
  if (question?.record_type !== RESEARCH_DERIVED_RECORD) return { outcome: "REFUSED", code: "ASSESSMENT_NAMES_NO_RESEARCH_DERIVED_QUESTION" };
  if (!draft || typeof draft !== "object") return { outcome: "REFUSED", code: "ASSESSMENT_ABSENT" };
  if (Object.keys(draft).some((k) => APPROVAL_FIELD.test(k)) || Object.keys(draft.source ?? {}).some((k) => APPROVAL_FIELD.test(k))) return { outcome: "REFUSED", code: "AN_ASSESSMENT_IS_NEVER_AN_APPROVAL" };
  if (!Object.values(RELEVANCE).includes(draft.verdict)) return { outcome: "REFUSED", code: "ASSESSMENT_VERDICT_NOT_RELEVANT_HELD_OR_REJECTED" };
  if (!present(draft.declarationVersion)) return { outcome: "REFUSED", code: "ASSESSMENT_NAMES_NO_DECLARATION_VERSION" };
  if (!present(draft.meaningTest)) return { outcome: "REFUSED", code: "ASSESSMENT_NAMES_NO_MEANING_TEST" };
  if (!present(draft.reason) || /\n/.test(draft.reason.trim())) return { outcome: "REFUSED", code: "ASSESSMENT_REASON_NOT_ONE_LINE" };
  if (!Object.values(ASSESSOR_KINDS).includes(draft.source?.kind) || !present(draft.source?.ref)) return { outcome: "REFUSED", code: "ASSESSMENT_NAMES_NO_METHOD_OR_AGENT" };
  if ([draft.source.ref, draft.reason].some((s) => HUMAN_WORD.test(s))) return { outcome: "REFUSED", code: "ASSESSMENT_SOURCE_IS_A_METHOD_OR_AN_AGENT_NEVER_HUMAN" };
  const value = Object.freeze({ question_id: question.question_id, verdict: draft.verdict, reason: oneLine(draft.reason), meaningTest: oneLine(draft.meaningTest),
    declarationVersion: draft.declarationVersion.trim(), source: Object.freeze({ kind: draft.source.kind, ref: draft.source.ref.trim() }) });
  const id = hash([value, at]);
  return { outcome: "RECORDED", record: Object.freeze({ record_type: ASSESSMENT_RECORD, assessment_id: id, measurement_key: `${ASSESSMENT_RECORD}:${id}`, recorded_at: at, value, meaning: ASSESSMENT_MEANING }) };
}

/** C27 · a question's relevance now: its LATEST assessment decides; none at all is HELD, NOT YET ASSESSED. */
export function relevanceOf(questionId, assessments = []) {
  const mine = assessments.filter((a) => a?.record_type === ASSESSMENT_RECORD && a.value?.question_id === questionId);
  return mine.length ? mine.at(-1).value.verdict : RELEVANCE.HELD;
}

/** C27 · what F16 hands on: RELEVANT questions only — a HELD or REJECTED question never leaves F16, so nothing downstream decides on it. */
export function carriedForward(questions, assessments) {
  return questions.filter((q) => q?.record_type === RESEARCH_DERIVED_RECORD && relevanceOf(q.question_id, assessments) === RELEVANCE.RELEVANT);
}

/** C31 · a research-derived question converts into no other kind, and no other kind into it (kinds by their identity, kindIdentityOf). */
export function kindConversionRefusal(fromKind, toKind) {
  if (fromKind === toKind) return null;
  if (fromKind === RESEARCH_DERIVED_RECORD || toKind === RESEARCH_DERIVED_RECORD) return "RESEARCH_DERIVED_NEVER_CONVERTS";
  return null;
}
/**
 * C31 · the production use of that rule: a record handed to the research-derived store must already BE a research-derived question — a
 * lead, a route, a keyword idea or any public question offered there is refused by name, never re-typed.
 */
export function researchDerivedStoreRefusals(records) {
  return records.map((r) => kindConversionRefusal(kindIdentityOf(r), RESEARCH_DERIVED_RECORD)).filter(Boolean);
}

/** C29 · wording that attributes a question to people ("people often ask…") — an attribution claim, needing observed evidence. */
export const ATTRIBUTION = /\b(people|users|clients|customers|readers|buyers|many|most|everyone)\s+(often\s+|commonly\s+|frequently\s+|usually\s+|always\s+|also\s+)?(ask|asks|asked|wonder|want to know)\b|\bwhat people (ask|want)\b|\b(frequently|commonly|often) asked\b|\bpopular questions?\b|\btop questions?\b/i;
export function attributionRefusal(text, { tier, observedEvidence = false }) {
  if (tier !== TIER || observedEvidence === true) return null;
  return ATTRIBUTION.test(String(text ?? "")) ? "ATTRIBUTION_NEEDS_OBSERVED_EVIDENCE" : null;
}

/**
 * F16's own count-only report of research-derived questions. Its attribution line is the production consumer of the attribution check:
 * a GENERATED wording that attributes itself is counted and flagged, never presented as asked. No wording is ever printed.
 */
export function researchDerivedReport({ questions = [], assessments = [], claims = 0, owned = 0, at }) {
  const rd = questions.filter((q) => q?.record_type === RESEARCH_DERIVED_RECORD);
  const by = (route) => rd.filter((q) => q.route === route).length;
  const rel = Object.fromEntries(Object.values(RELEVANCE).map((v) => [v, rd.filter((q) => relevanceOf(q.question_id, assessments) === v).length]));
  const attributing = rd.filter((q) => attributionRefusal(q.wording?.text, { tier: q.tier }) !== null).length;
  const lines = [
    `RESEARCH-DERIVED questions: ${rd.length} (route 1, the client's own AI connection: ${by(ROUTES.CLIENT_AI)} · route 2, the client's own research: ${by(ROUTES.CLIENT_RESEARCH)}) — as at ${at}`,
    `  ${STATUS}`,
    `  wording marked GENERATED: ${rd.filter((q) => q.wording?.generated === true).length} · with an optional reference (never fetched): ${rd.filter((q) => q.reference !== null).length}`,
    `  relevance: RELEVANT ${rel.RELEVANT} (carried forward) · HELD ${rel.HELD} (unclear, or ${NOT_YET_ASSESSED.split(" — ")[0]}) · REJECTED ${rel.REJECTED} (irrelevant) — ${ASSESSMENT_MEANING}`,
    `  wording that attributes itself to people (an attribution claim, needing observed evidence; never presented as asked): ${attributing}`,
    `  client claims (statements tied to no formed question; never evidence): ${claims} · owned search evidence kept apart (never a question): ${owned}`,
  ];
  const texts = rd.map((q) => q.wording?.text).filter(present);
  if (lines.some((l) => texts.some((t) => l.includes(t)))) throw new Error("QUESTION_WORDING_IN_OUTPUT: the report is count-only");
  return lines;
}
