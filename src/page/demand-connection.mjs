/**
 * 🔴 F91 · THE QUESTION-TO-PAGE-CANDIDATE CONNECTION (Acceptance Amendment 2, _handoffs fff60df; Specification Amendment 4, 6c606b2).
 * Pure: records in, records and refusals out — the governed writer is bin/demand-connect.mjs. Names no product, tenant, dimension or quota.
 *
 *   C9   ONE CONNECTION PER ADMITTED QUESTION   only a stored, OBSERVED public question of THIS subject, joined to one of F91's possible
 *        combinations (its page candidate); its original wording, source reference, observed date, country and language (NOT MEASURED where
 *        not recorded, never guessed) and sampling method and limits kept. Refused as verified demand, each by name: a search lead, a
 *        keyword idea, a client's claim, an inferred suggestion, a fixture or test record, another subject's question, an unsupported author
 *        or observer attribute, a duplicate.
 *   C10  ONE NEED ACROSS COUNTRY AND LANGUAGE    a question joins an existing need when its wording is identical after F91's stated
 *        normalisation (country and language are never compared), or when a RECORDED sameness judgement names it — never by similarity.
 *        Anything else is its own need: materially different intents stay apart. One need has ONE page candidate. A country-specific
 *        answer difference is a SECTION of the need, kept even when its source is UNKNOWN — never dropped, never a second need.
 *   C11  ONE SOURCED ANSWER, NO CHECKER          a need's answer is the product's own official source (its page and the date it was read)
 *        or UNKNOWN with the reason named; every question, country and language of the need points to that one answer. No checker,
 *        signature or credential field is accepted — evidence is the source and its date.
 *   C12  COVERAGE BEFORE A NEW PAGE              the readback reads F91's recorded coverage decisions (F33's, as planning_group records):
 *        COVERED is never recommended, undetermined coverage is HELD, an UNKNOWN answer is HELD — and nothing here is a page.
 */
import { createHash } from "node:crypto";
import { candidateKey, normaliseWording, NOT_MEASURED } from "./page-opportunities.mjs";

export const CONNECTION = "planning_demand";
export const SAMENESS = "planning_sameness";
export const NEED = "planning_need";
export const REFUSAL = Object.freeze({
  LEAD: "SEARCH_LEAD_IS_NOT_A_QUESTION", KEYWORD: "KEYWORD_IDEA_IS_NOT_DEMAND", CLIENT_CLAIM: "CLIENT_CLAIM_IS_NOT_EVIDENCE",
  INFERRED: "INFERRED_SUGGESTION_IS_NOT_OBSERVED", NOT_A_QUESTION: "NOT_AN_ADMITTED_QUESTION", FIXTURE: "FIXTURE_OR_TEST_RECORD",
  OTHER_SUBJECT: "ANOTHER_PRODUCT_OR_TENANT", UNSUPPORTED_ATTRIBUTE: "UNSUPPORTED_AUTHOR_OR_OBSERVER_ATTRIBUTE", DUPLICATE: "DUPLICATE_WRITE",
  CANDIDATE: "PAGE_CANDIDATE_NOT_A_POSSIBLE_COMBINATION", SPANS_CANDIDATES: "ONE_NEED_TWO_PAGE_CANDIDATES",
  JUDGEMENT: "SAMENESS_JUDGEMENT_NAMES_NO_CONNECTED_QUESTION", CHECKER_FIELD: "CHECKER_FIELD_IS_NOT_EVIDENCE",
});
export const ANSWER_UNKNOWN = Object.freeze({
  none: "no answer source was recorded for this need",
  noOfficialSite: "the product declares no official site yet — its turn has not come (turn order, not a gap)",
  notOfficial: "the source is not the product's own official site",
  noDate: "the date the source was read is not recorded",
});
export const RECOMMENDATION = Object.freeze({
  COVERED: "COVERED — an existing page already serves this need; never recommended as a new page",
  HELD_COVERAGE: "HELD — existing-page coverage is not decided (no F33 decision recorded for this page candidate)",
  HELD_ANSWER: "HELD — the answer is UNKNOWN; an UNKNOWN never becomes a page recommendation",
  NOT_COVERED: "NOT COVERED — handed to F91's number 3, which alone decides whether a new page is needed",
});
const AUTHOR_EVIDENCE = "STATED_ON_THE_ORIGINAL_POST";
const AUTHOR_FIELDS = ["authorCountry", "authorRole"];
const OBSERVER_LABELS = Object.freeze({ PERSON_OBSERVED: "A PERSON — not the engine", AGENT_OBSERVED: "AN AGENT — not a person, and not the engine", SOURCE_ADAPTER_OBSERVED: "A SOURCE ADAPTER — the text as the source holds it" });
const CHECKER_FIELDS = /^(checked_?by|verified_?by|signature|signed_?by|credential|reviewer|approved_?by)$/i;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const present = (v) => typeof v === "string" && v.trim() !== "";
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);
const known = (v) => (present(v) && v !== NOT_MEASURED ? v : NOT_MEASURED);
const originOf = (u) => { try { return new URL(u).origin; } catch { return null; } };

/** C11 — one answer reference: the product's own official source and the day it was read, or UNKNOWN with its reason. */
export function answerOf(a, officialSites) {
  if (!a || !present(a.sourceRef)) return Object.freeze({ state: "UNKNOWN", why: ANSWER_UNKNOWN.none });
  if (!Array.isArray(officialSites) || officialSites.length === 0) return Object.freeze({ state: "UNKNOWN", why: ANSWER_UNKNOWN.noOfficialSite });
  if (!officialSites.includes(originOf(a.sourceRef))) return Object.freeze({ state: "UNKNOWN", why: ANSWER_UNKNOWN.notOfficial });
  if (!ISO_DAY.test(a.readOn ?? "")) return Object.freeze({ state: "UNKNOWN", why: ANSWER_UNKNOWN.noDate });
  return Object.freeze({ state: "SOURCED", sourceRef: a.sourceRef, readOn: a.readOn });
}

/** C9 — why one record is not admitted as verified demand for this subject, or null. */
export function refusalOf(r, { subject }) {
  if (r?.record_type === "research_lead") return REFUSAL.LEAD;
  if (r?.record_type === "keyword_signal") return REFUSAL.KEYWORD;
  if (r?.record_type !== "public_question" || !present(r?.question_id)) return REFUSAL.NOT_A_QUESTION;
  const v = r.value ?? {};
  if (v.kind === "CLIENT_CLAIM") return REFUSAL.CLIENT_CLAIM;
  if (v.kind !== "OBSERVED") return REFUSAL.INFERRED;
  if (r.fixture === true || v.fixture === true || v.dataPurpose === "TEST_PILOT") return REFUSAL.FIXTURE;
  if (v.subject !== subject) return REFUSAL.OTHER_SUBJECT;
  if (AUTHOR_FIELDS.some((f) => present(v[f]) && v[f] !== NOT_MEASURED) && v.authorEvidence !== AUTHOR_EVIDENCE) return REFUSAL.UNSUPPORTED_ATTRIBUTE;
  const t = v.provenance?.observerType;
  if (!Object.hasOwn(OBSERVER_LABELS, t) || v.provenance.seenBy !== OBSERVER_LABELS[t]) return REFUSAL.UNSUPPORTED_ATTRIBUTE;
  if (!present(v.original)) return REFUSAL.NOT_A_QUESTION;
  return null;
}

/**
 * Drafts → connection, sameness and need records, or refusals. `possible` is F91's number 1 (possibleCombinations); `existing` are the rows
 * already in the planning store; `officialSites` are the product's own declared official origins.
 * A draft: { questionId, combination, sameAs?: { questionId, judgementRef, reason }, answer?: { sourceRef, readOn }, sections?: [{ country, sourceRef?, readOn? }] }
 */
export function connectQuestions({ subject, possible, records, drafts, existing = [], officialSites = [], on }) {
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
    const why = refusalOf(r, { subject });
    if (why) { refuse(d, why); continue; }
    if (connected.has(r.question_id)) { refuse(d, REFUSAL.DUPLICATE); continue; }
    if (!candidates || !d?.combination || !candidates.has(candidateKey(d.combination))) { refuse(d, REFUSAL.CANDIDATE); continue; }
    const v = r.value;
    let needId, judgement = null;
    if (d.sameAs) {
      const target = connected.get(d.sameAs.questionId);
      if (!target || !present(d.sameAs.judgementRef)) { refuse(d, REFUSAL.JUDGEMENT); continue; }
      needId = target.needId;
      judgement = d.sameAs;
    } else needId = needOfWording.get(normaliseWording(v.original)) ?? `need:${hash([subject, r.question_id])}`;
    const ck = candidateKey(d.combination);
    if (needCandidate.has(needId) && needCandidate.get(needId) !== ck) { refuse(d, REFUSAL.SPANS_CANDIDATES); continue; }
    needCandidate.set(needId, ck);
    const rec = Object.freeze({
      record_type: CONNECTION, measurement_key: `${CONNECTION}:${r.question_id}`, recorded_at: `${on}T00:00:00Z`, subject,
      combination: Object.freeze({ ...d.combination }), state: "OBSERVED", questionId: r.question_id, wording: v.original, needId,
      source: Object.freeze({ reference: known(v.reference), sourceId: known(v.sourceId) }), observedOn: present(r.recorded_at) ? r.recorded_at.slice(0, 10) : NOT_MEASURED,
      country: known(v.country), language: known(v.language),
      sampling: Object.freeze({ method: known(v.method), limits: known(v.limits), surface: known(v.surface) }),
    });
    out.push(rec);
    connected.set(r.question_id, rec);
    if (!needOfWording.has(normaliseWording(v.original))) needOfWording.set(normaliseWording(v.original), needId);
    if (judgement) out.push(Object.freeze({ record_type: SAMENESS, measurement_key: `${SAMENESS}:${hash([judgement.questionId, r.question_id])}`, recorded_at: `${on}T00:00:00Z`, subject, questions: Object.freeze([judgement.questionId, r.question_id]), judgementRef: judgement.judgementRef, reason: judgement.reason ?? null }));
    const n = needs.get(needId) ?? { needId, combination: d.combination, answers: [], sections: [] };
    if (d.answer) n.answers.push(d.answer);
    for (const s of d.sections ?? []) n.sections.push(s);
    needs.set(needId, n);
  }
  for (const n of needs.values()) {
    const answers = [...new Map(n.answers.map((a) => [JSON.stringify([a.sourceRef, a.readOn]), a])).values()];
    const answer = answers.length > 1 ? Object.freeze({ state: "UNKNOWN", why: "two different answer sources were recorded for one need — none is chosen" }) : answerOf(answers[0], officialSites);
    const sections = n.sections.filter((s) => present(s?.country)).map((s) => Object.freeze({ country: s.country, answer: answerOf(s, officialSites) }));
    out.push(Object.freeze({ record_type: NEED, measurement_key: `${NEED}:${hash([n.needId, answer, sections])}`, recorded_at: `${on}T00:00:00Z`, subject, needId: n.needId, combination: Object.freeze({ ...n.combination }), answer, sections: Object.freeze(sections) }));
  }
  return Object.freeze({ records: Object.freeze(out), refused: Object.freeze(refused) });
}

/**
 * READBACK — every need with its questions, countries, languages, its one answer, its sections, and its coverage recommendation (C12), from
 * the planning store's rows (connections, needs, and F91's recorded coverage decisions as planning_group records). Count-only fields.
 */
export function readConnections(rows = []) {
  const connections = rows.filter((r) => r?.record_type === CONNECTION && present(r.needId));
  const latestNeed = new Map();
  for (const r of rows) if (r?.record_type === NEED && present(r.needId)) latestNeed.set(r.needId, r);
  const coverage = new Map();
  for (const r of rows) if (r?.record_type === "planning_group" && Array.isArray(r.members) && r.members.length === 1) coverage.set(candidateKey(r.members[0]), r.coverage);
  const needIds = [...new Set(connections.map((c) => c.needId))];
  const needs = needIds.map((id) => {
    const qs = connections.filter((c) => c.needId === id);
    const need = latestNeed.get(id);
    const answer = need?.answer ?? Object.freeze({ state: "UNKNOWN", why: ANSWER_UNKNOWN.none });
    const cov = coverage.get(candidateKey(qs[0].combination));
    const recommendation = cov === "COVERED" ? RECOMMENDATION.COVERED : cov !== "NOT_COVERED" ? RECOMMENDATION.HELD_COVERAGE : answer.state !== "SOURCED" ? RECOMMENDATION.HELD_ANSWER : RECOMMENDATION.NOT_COVERED;
    return Object.freeze({
      needId: id, pageCandidate: candidateKey(qs[0].combination), questions: qs.length,
      countries: new Set(qs.map((q) => q.country).filter((c) => c !== NOT_MEASURED)).size, languages: new Set(qs.map((q) => q.language).filter((l) => l !== NOT_MEASURED)).size,
      originals: Object.freeze(qs.map((q) => q.wording)), answer, sections: need?.sections ?? [], recommendation,
    });
  });
  const count = (r) => needs.filter((n) => n.recommendation === r).length;
  return Object.freeze({
    needs: Object.freeze(needs),
    counts: Object.freeze({ questions: connections.length, needs: needs.length, pageCandidates: new Set(needs.map((n) => n.pageCandidate)).size, covered: count(RECOMMENDATION.COVERED), heldCoverage: count(RECOMMENDATION.HELD_COVERAGE), heldAnswer: count(RECOMMENDATION.HELD_ANSWER), notCovered: count(RECOMMENDATION.NOT_COVERED) }),
  });
}
