/**
 * 🔴 F91 · THE QUESTION-TO-PAGE-CANDIDATE CONNECTION (Acceptance Amendment 2, _handoffs fff60df; Specification Amendment 4, 6c606b2;
 * Acceptance Amendment 3, _handoffs b8a4ea5 — C14, C16, C17, C18). Pure: records in, records and refusals out — the governed writer is
 * bin/demand-connect.mjs. Names no product, tenant, dimension or quota.
 *
 *   C9/C16 ONE CONNECTION PER ADMITTED QUESTION, WITH ITS TIER   a stored, OBSERVED public question of THIS subject — or a RELEVANT
 *        research-derived question of it (F16 C27: its latest assessment RELEVANT) — joined to one of F91's possible combinations (its page
 *        candidate). An observed question keeps its original wording, source reference, observed date, country and language (NOT MEASURED where
 *        not recorded, never guessed) and its sampling method and limits. A research-derived question keeps its wording unchanged, its tier,
 *        its route and the formed research question it answers, and an optional reference where one was given; a field it does not have is
 *        NOT MEASURED, never guessed and never a refusal. Its connection is RESEARCH-DERIVED: never OBSERVED, never verified demand.
 *        Refused, each by name: a search lead, a keyword idea, a client's claim, an inferred suggestion, a fixture or test record, another
 *        subject's question, an unsupported author or observer attribute, a research-derived question not assessed RELEVANT, a duplicate.
 *   C10/C14 ONE NEED ACROSS COUNTRY AND LANGUAGE   a question joins an existing need when its wording is identical after F91's stated
 *        normalisation (country and language are never compared), or when a RECORDED sameness judgement names it — never by similarity.
 *        Anything else is its own need: materially different intents stay apart. One need has ONE page candidate. A country-specific
 *        answer difference is a SECTION of the need, kept even when it is UNKNOWN — never dropped, never a second need. A need's tier is
 *        OBSERVED when any of its questions is observed, else RESEARCH-DERIVED.
 *   C11/C17 ONE ANSWER, JUDGED CLAIM BY CLAIM       each draft's answer is judged (src/page/answer-support.mjs) BEFORE grouping; a need has
 *        one answer — two different ones are UNKNOWN, none chosen. No checker, signature or credential field is accepted.
 *   C14  THE COVERAGE RECORD F35 READS              for EVERY need, one record: FULL · PARTIAL · NONE · CANNOT DECIDE (or REFUSED, F33 C1)
 *        against the named existing pages, and whether a relevant question is missing — decided by F33's grouped-need function
 *        (src/page/grouped-need-coverage.mjs), from the STORED connections, after the answers and the grouping.
 *   C12/C18 COVERAGE BEFORE A NEW PAGE              the readback reads the coverage records: COVERED (FULL or PARTIAL — a PARTIAL need goes
 *        to IMPROVE / ADD SECTION, never a new page) is never recommended as a new page; undecided coverage is HELD; a group is HELD for an
 *        UNSUPPORTED CENTRAL answer only — never for SECONDARY support, never for a non-central UNKNOWN. Nothing here is a page.
 */
import { createHash } from "node:crypto";
import { candidateKey, normaliseWording, NOT_MEASURED } from "./page-opportunities.mjs";
import { answerSupport, ANSWER_STATES } from "./answer-support.mjs";
import { decideGroupedNeedCoverage, GROUPED } from "./grouped-need-coverage.mjs";
import { RESEARCH_DERIVED_RECORD, TIER as RESEARCH_TIER, RELEVANCE, relevanceOf } from "../research/research-derived.mjs";

export const CONNECTION = "planning_demand";
export const SAMENESS = "planning_sameness";
export const NEED = "planning_need";
export const COVERAGE = "planning_coverage";
export const TIERS = Object.freeze({ OBSERVED: "OBSERVED", RESEARCH_DERIVED: RESEARCH_TIER });
export const REFUSAL = Object.freeze({
  LEAD: "SEARCH_LEAD_IS_NOT_A_QUESTION", KEYWORD: "KEYWORD_IDEA_IS_NOT_DEMAND", CLIENT_CLAIM: "CLIENT_CLAIM_IS_NOT_EVIDENCE",
  INFERRED: "INFERRED_SUGGESTION_IS_NOT_OBSERVED", NOT_A_QUESTION: "NOT_AN_ADMITTED_QUESTION", FIXTURE: "FIXTURE_OR_TEST_RECORD",
  OTHER_SUBJECT: "ANOTHER_PRODUCT_OR_TENANT", UNSUPPORTED_ATTRIBUTE: "UNSUPPORTED_AUTHOR_OR_OBSERVER_ATTRIBUTE", DUPLICATE: "DUPLICATE_WRITE",
  CANDIDATE: "PAGE_CANDIDATE_NOT_A_POSSIBLE_COMBINATION", SPANS_CANDIDATES: "ONE_NEED_TWO_PAGE_CANDIDATES",
  JUDGEMENT: "SAMENESS_JUDGEMENT_NAMES_NO_CONNECTED_QUESTION", CHECKER_FIELD: "CHECKER_FIELD_IS_NOT_EVIDENCE",
  /* RR-158 §5: its admitting meaning judgement was overturned — it leaves every count */
  OVERTURNED: "ITS_ADMITTING_JUDGEMENT_WAS_OVERTURNED",
  /* C16 / F16 C27: a research-derived question goes on only when its latest assessment is RELEVANT */
  NOT_RELEVANT: "RESEARCH_DERIVED_QUESTION_NOT_ASSESSED_RELEVANT",
});
export const ANSWER_UNKNOWN = Object.freeze({
  none: "no answer was recorded for this need",
  two: "two different answers were recorded for one need — none is chosen",
});
export const RECOMMENDATION = Object.freeze({
  COVERED: "COVERED — an existing page already serves this need wholly (FULL); never recommended as a new page",
  COVERED_PARTIAL: "COVERED IN PART (PARTIAL) — the covering page is revised (IMPROVE / ADD SECTION, decided by F35); never a new page",
  HELD_COVERAGE: "HELD — existing-page coverage is not decided (no coverage record, CANNOT DECIDE, or the population REFUSED)",
  HELD_ANSWER: "HELD — the central answer is unsupported (C18); an unsupported answer never becomes a page recommendation",
  NOT_COVERED: "NOT COVERED — handed on to F35, which alone decides CREATE (R3); number 3 counts those, by tier",
});
const AUTHOR_EVIDENCE = "STATED_ON_THE_ORIGINAL_POST";
const AUTHOR_FIELDS = ["authorCountry", "authorRole"];
const OBSERVER_LABELS = Object.freeze({ PERSON_OBSERVED: "A PERSON — not the engine", AGENT_OBSERVED: "AN AGENT — not a person, and not the engine", SOURCE_ADAPTER_OBSERVED: "A SOURCE ADAPTER — the text as the source holds it" });
const CHECKER_FIELDS = /^(checked_?by|verified_?by|signature|signed_?by|credential|reviewer|approved_?by)$/i;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const present = (v) => typeof v === "string" && v.trim() !== "";
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);
const known = (v) => (present(v) && v !== NOT_MEASURED ? v : NOT_MEASURED);
const isFixture = (r) => r?.fixture === true || r?.value?.fixture === true || r?.value?.dataPurpose === "TEST_PILOT" || r?.dataPurpose === "TEST_PILOT";

/** C9/C16 — why one record is not admitted for this subject, or null. */
export function refusalOf(r, { subject, overturned = new Set(), assessments = [] }) {
  if (r?.record_type === "research_lead") return REFUSAL.LEAD;
  if (r?.record_type === "keyword_signal") return REFUSAL.KEYWORD;
  if (r?.record_type === RESEARCH_DERIVED_RECORD) {
    /* C16: a relevant research-derived question is admitted, with its tier — never refused as "not a question", never read as observed */
    if (!present(r.question_id) || r.tier !== RESEARCH_TIER || !present(r.wording?.text)) return REFUSAL.NOT_A_QUESTION;
    if (overturned.has(r.question_id)) return REFUSAL.OVERTURNED;
    if (isFixture(r)) return REFUSAL.FIXTURE;
    if (r.subject !== subject) return REFUSAL.OTHER_SUBJECT;
    if (relevanceOf(r.question_id, assessments) !== RELEVANCE.RELEVANT) return REFUSAL.NOT_RELEVANT;
    return null;
  }
  if (r?.record_type !== "public_question" || !present(r?.question_id)) return REFUSAL.NOT_A_QUESTION;
  if (overturned.has(r.question_id)) return REFUSAL.OVERTURNED;
  const v = r.value ?? {};
  if (v.kind === "CLIENT_CLAIM") return REFUSAL.CLIENT_CLAIM;
  if (v.kind !== "OBSERVED") return REFUSAL.INFERRED;
  if (isFixture(r)) return REFUSAL.FIXTURE;
  if (v.subject !== subject) return REFUSAL.OTHER_SUBJECT;
  if (AUTHOR_FIELDS.some((f) => present(v[f]) && v[f] !== NOT_MEASURED) && v.authorEvidence !== AUTHOR_EVIDENCE) return REFUSAL.UNSUPPORTED_ATTRIBUTE;
  const t = v.provenance?.observerType;
  if (!Object.hasOwn(OBSERVER_LABELS, t) || v.provenance.seenBy !== OBSERVER_LABELS[t]) return REFUSAL.UNSUPPORTED_ATTRIBUTE;
  if (!present(v.original)) return REFUSAL.NOT_A_QUESTION;
  return null;
}

/** The fields a connection keeps, by tier (C9 for an observed question; C16 for a research-derived one). */
function connectionFields(r) {
  if (r.record_type === RESEARCH_DERIVED_RECORD) {
    return {
      state: TIERS.RESEARCH_DERIVED, tier: TIERS.RESEARCH_DERIVED, wording: r.wording.text, route: r.route,
      formedQuestion: Object.freeze({ queryId: r.query_id, planId: known(r.plan_id) }),
      reference: r.reference && typeof r.reference === "object" ? r.reference : NOT_MEASURED,
      source: Object.freeze({ reference: NOT_MEASURED, sourceId: known(r.sourceId) }), observedOn: NOT_MEASURED, country: NOT_MEASURED, language: NOT_MEASURED,
      sampling: Object.freeze({ method: NOT_MEASURED, limits: NOT_MEASURED, surface: NOT_MEASURED }),
    };
  }
  const v = r.value;
  return {
    state: TIERS.OBSERVED, tier: TIERS.OBSERVED, wording: v.original,
    source: Object.freeze({ reference: known(v.reference), sourceId: known(v.sourceId) }), observedOn: present(r.recorded_at) ? r.recorded_at.slice(0, 10) : NOT_MEASURED,
    country: known(v.country), language: known(v.language),
    sampling: Object.freeze({ method: known(v.method), limits: known(v.limits), surface: known(v.surface) }),
  };
}

/**
 * Drafts → connection, sameness and need records, or refusals. `possible` is F91's number 1 (possibleCombinations); `existing` are the rows
 * already in the planning store; `officialSites` are the product's own declared official origins; `assessments` are F16's relevance records.
 * A draft: { questionId, combination, sameAs?: { questionId, judgementRef, reason }, answer?: { claims: [...] }, sections?: [{ country, answer?: { claims } }] }
 */
export function connectQuestions({ subject, possible, records, drafts, existing = [], officialSites = [], on, overturned = new Set(), assessments = [] }) {
  if (!present(subject)) throw new TypeError("a connection names its subject");
  if (!ISO_DAY.test(on ?? "")) throw new TypeError("the run's stated date (YYYY-MM-DD)");
  const byId = new Map(records.map((r) => [r?.question_id ?? r?.lead_id ?? r?.signal_id, r]));
  const candidates = Array.isArray(possible?.candidates) ? new Set(possible.candidates.map(candidateKey)) : null;
  const connected = new Map(existing.filter((r) => r?.record_type === CONNECTION).map((r) => [r.questionId, r]));
  const needOfWording = new Map([...connected.values()].map((r) => [normaliseWording(r.wording), r.needId]));
  const needCandidate = new Map([...connected.values()].map((r) => [r.needId, candidateKey(r.combination)]));
  const out = [], refused = [], needs = new Map();
  const refuse = (d, code) => refused.push(Object.freeze({ questionId: d?.questionId ?? null, code }));
  for (const d of drafts) {
    if (Object.keys(d ?? {}).some((k) => CHECKER_FIELDS.test(k)) || Object.keys(d?.answer ?? {}).some((k) => CHECKER_FIELDS.test(k))) { refuse(d, REFUSAL.CHECKER_FIELD); continue; }
    const r = byId.get(d?.questionId);
    const why = refusalOf(r, { subject, overturned, assessments });
    if (why) { refuse(d, why); continue; }
    if (connected.has(r.question_id)) { refuse(d, REFUSAL.DUPLICATE); continue; }
    if (!candidates || !d?.combination || !candidates.has(candidateKey(d.combination))) { refuse(d, REFUSAL.CANDIDATE); continue; }
    const fields = connectionFields(r);
    /* C14's order: the question's answer is judged BEFORE it is grouped */
    const judged = d.answer ? { given: d.answer, support: answerSupport(d.answer, { officialSites }) } : null;
    let needId, judgement = null;
    if (d.sameAs) {
      const target = connected.get(d.sameAs.questionId);
      if (!target || !present(d.sameAs.judgementRef)) { refuse(d, REFUSAL.JUDGEMENT); continue; }
      needId = target.needId;
      judgement = d.sameAs;
    } else needId = needOfWording.get(normaliseWording(fields.wording)) ?? `need:${hash([subject, r.question_id])}`;
    const ck = candidateKey(d.combination);
    if (needCandidate.has(needId) && needCandidate.get(needId) !== ck) { refuse(d, REFUSAL.SPANS_CANDIDATES); continue; }
    needCandidate.set(needId, ck);
    const rec = Object.freeze({
      record_type: CONNECTION, measurement_key: `${CONNECTION}:${r.question_id}`, recorded_at: `${on}T00:00:00Z`, subject,
      combination: Object.freeze({ ...d.combination }), questionId: r.question_id, needId, ...fields,
    });
    out.push(rec);
    connected.set(r.question_id, rec);
    if (!needOfWording.has(normaliseWording(fields.wording))) needOfWording.set(normaliseWording(fields.wording), needId);
    if (judgement) out.push(Object.freeze({ record_type: SAMENESS, measurement_key: `${SAMENESS}:${hash([judgement.questionId, r.question_id])}`, recorded_at: `${on}T00:00:00Z`, subject, questions: Object.freeze([judgement.questionId, r.question_id]), judgementRef: judgement.judgementRef, reason: judgement.reason ?? null }));
    const n = needs.get(needId) ?? { needId, combination: d.combination, answers: [], sections: [] };
    if (judged) n.answers.push(judged);
    for (const s of d.sections ?? []) n.sections.push(s);
    needs.set(needId, n);
  }
  for (const n of needs.values()) {
    const answers = [...new Map(n.answers.map((a) => [JSON.stringify(a.given), a])).values()];
    const answer = answers.length > 1 ? Object.freeze({ state: ANSWER_STATES.UNKNOWN, why: ANSWER_UNKNOWN.two, centralSupported: false, claims: Object.freeze([]) })
      : answers.length === 1 ? answers[0].support : Object.freeze({ state: ANSWER_STATES.UNKNOWN, why: ANSWER_UNKNOWN.none, centralSupported: false, claims: Object.freeze([]) });
    const sections = n.sections.filter((s) => present(s?.country)).map((s) => Object.freeze({ country: s.country, answer: answerSupport(s.answer, { officialSites }) }));
    out.push(Object.freeze({ record_type: NEED, measurement_key: `${NEED}:${hash([n.needId, answer, sections])}`, recorded_at: `${on}T00:00:00Z`, subject, needId: n.needId, combination: Object.freeze({ ...n.combination }), answer, sections: Object.freeze(sections) }));
  }
  return Object.freeze({ records: Object.freeze(out), refused: Object.freeze(refused) });
}

/**
 * C14 · THE COVERAGE RECORD, FOR EVERY NEED — from the STORED connections (after the answers and the grouping), through F33's grouped-need
 * function over the SAME tenant's existing-page population and the recorded per-question coverage judgements. `rows` are the planning
 * store's rows; returns one record per need, each naming the covering pages, per page whether a relevant question in its intent is missing
 * (F35 reads that as `newQuestionInIntent`), and the missing questions.
 */
export function coverageRecords({ subject, rows = [], tenantId, population, judgements = [], on, overturned = new Set() }) {
  if (!ISO_DAY.test(on ?? "")) throw new TypeError("the run's stated date (YYYY-MM-DD)");
  const connections = rows.filter((r) => r?.record_type === CONNECTION && present(r.needId) && !overturned.has(r.questionId));
  const needIds = [...new Set(connections.map((c) => c.needId))];
  return Object.freeze(needIds.map((needId) => {
    const qs = connections.filter((c) => c.needId === needId);
    const d = decideGroupedNeedCoverage({ need: { needId, questions: qs.map((q) => ({ questionId: q.questionId, wording: q.wording })) }, tenantId, population, judgements });
    const missing = new Set(d.missingQuestions);
    const pages = d.coveringPages.map((pageId) => Object.freeze({ pageId, covers: Object.freeze(d.perQuestion.filter((q) => q.covering.includes(pageId)).map((q) => q.questionId)), newQuestionInIntent: missing.size > 0 }));
    const value = { needId, coverage: d.outcome, asF33: d.asF33, reason: d.reason, missingFact: d.missingFact, coverageState: d.coverageState, considered: d.considered, pages, missingQuestions: [...missing], relevantQuestionMissing: missing.size > 0 };
    return Object.freeze({
      record_type: COVERAGE, measurement_key: `${COVERAGE}:${hash([subject, value])}`, recorded_at: `${on}T00:00:00Z`, subject,
      combination: Object.freeze({ ...qs[0].combination }), ...value, pages: Object.freeze(pages), missingQuestions: Object.freeze(value.missingQuestions),
      method: "F33 C8: a recorded per-question coverage judgement (a method or an agent) or an exact match after the one declared normalisation — never similarity",
    });
  }));
}

/** C14 · what F35's rule reads for ONE existing page, from the coverage record F91 wrote — or null when the record names no such page. */
export function questionCoverageFor(record, pageId) {
  const p = record?.record_type === COVERAGE ? record.pages.find((x) => x.pageId === pageId) : null;
  return p ? Object.freeze({ newQuestionInIntent: p.newQuestionInIntent === true, ref: record.measurement_key }) : null;
}

/**
 * READBACK — every need with its questions, tier, countries, languages, its one answer, its sections, and its coverage recommendation (C12,
 * C14, C18), from the planning store's rows. Count-only fields.
 */
export function readConnections(rows = [], { overturned = new Set() } = {}) {
  /* RR-158 §5: a connection whose question was overturned leaves every count */
  const all = rows.filter((r) => r?.record_type === CONNECTION && present(r.needId));
  const connections = all.filter((r) => !overturned.has(r.questionId));
  const latestNeed = new Map(), latestCoverage = new Map();
  for (const r of rows) if (r?.record_type === NEED && present(r.needId)) latestNeed.set(r.needId, r);
  for (const r of rows) if (r?.record_type === COVERAGE && present(r.needId)) latestCoverage.set(r.needId, r);
  const needIds = [...new Set(connections.map((c) => c.needId))];
  const needs = needIds.map((id) => {
    const qs = connections.filter((c) => c.needId === id);
    const need = latestNeed.get(id);
    const answer = need?.answer ?? Object.freeze({ state: ANSWER_STATES.UNKNOWN, why: ANSWER_UNKNOWN.none, centralSupported: false });
    const cov = latestCoverage.get(id)?.coverage ?? null;
    const recommendation = cov === GROUPED.FULL ? RECOMMENDATION.COVERED : cov === GROUPED.PARTIAL ? RECOMMENDATION.COVERED_PARTIAL : cov !== GROUPED.NONE ? RECOMMENDATION.HELD_COVERAGE
      : answer.centralSupported !== true ? RECOMMENDATION.HELD_ANSWER : RECOMMENDATION.NOT_COVERED;
    return Object.freeze({
      needId: id, pageCandidate: candidateKey(qs[0].combination), questions: qs.length, tier: qs.some((q) => (q.tier ?? TIERS.OBSERVED) === TIERS.OBSERVED) ? TIERS.OBSERVED : TIERS.RESEARCH_DERIVED,
      byTier: Object.freeze({ [TIERS.OBSERVED]: qs.filter((q) => (q.tier ?? TIERS.OBSERVED) === TIERS.OBSERVED).length, [TIERS.RESEARCH_DERIVED]: qs.filter((q) => q.tier === TIERS.RESEARCH_DERIVED).length }),
      countries: new Set(qs.map((q) => q.country).filter((c) => c !== NOT_MEASURED)).size, languages: new Set(qs.map((q) => q.language).filter((l) => l !== NOT_MEASURED)).size,
      originals: Object.freeze(qs.map((q) => q.wording)), answer, sections: need?.sections ?? [], coverage: cov, recommendation,
    });
  });
  const count = (r) => needs.filter((n) => n.recommendation === r).length;
  return Object.freeze({
    needs: Object.freeze(needs),
    counts: Object.freeze({ overturned: all.length - connections.length, questions: connections.length, needs: needs.length, pageCandidates: new Set(needs.map((n) => n.pageCandidate)).size,
      withoutCoverageRecord: needs.filter((n) => n.coverage === null).length,
      covered: count(RECOMMENDATION.COVERED), coveredPartial: count(RECOMMENDATION.COVERED_PARTIAL), heldCoverage: count(RECOMMENDATION.HELD_COVERAGE), heldAnswer: count(RECOMMENDATION.HELD_ANSWER), notCovered: count(RECOMMENDATION.NOT_COVERED) }),
  });
}
