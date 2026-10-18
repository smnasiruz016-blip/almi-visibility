/**
 * 🔴 F18 · NEW-PRODUCT AND PRE-LAUNCH RESEARCH — observed demand and estimates, kept apart (acceptance _handoffs
 * AlmiVisibility_F18_ACCEPTANCE_2026-10-18.md, RR-284; the rule of beta-g decision D, one rule for every project).
 *
 *   OBSERVED   a record of a question or phrase people really asked, with its OWN source and date: a search phrase from Search Console,
 *              Bing, Keyword Planner, Google (seen by a person or the client's own AI) or a person's sighting; a public question with
 *              its reference page and date. The label alone never makes a record OBSERVED: a record that says OBSERVED with no source
 *              of its own or no date is REFUSED, named (C2).
 *   ESTIMATE   anything else — a research-derived question with no reference, an AI suggestion, an inference.
 *
 *   C1  every need is labelled OBSERVED or ESTIMATE, with the records it is observed in or estimated from
 *   C2  OBSERVED needs are counted from observed records alone; an estimate is never counted or shown as one
 *   C3  a need with both: the observation is reported beside the estimate, and the estimate is SUPERSEDED — kept, never deleted
 *   C4  only an OBSERVED need may create a page candidate; an ESTIMATE alone is refused, named. On published pages, every page question
 *       with no source of its own is listed — for the page-fix queue, never for a live change.
 *
 * Pure: records in, labels and lists out. Names no product, tenant or host.
 */
export const DEMAND = Object.freeze({ OBSERVED: "OBSERVED", ESTIMATE: "ESTIMATE", SUPERSEDED: "SUPERSEDED" });
export const DEMAND_REFUSAL = Object.freeze({ OBSERVED_WITHOUT_SOURCE: "OBSERVED_WITHOUT_ITS_OWN_SOURCE_AND_DATE", RECORD_NOT_FOUND: "RECORD_NOT_FOUND", ESTIMATE_ALONE: "NO_PAGE_BY_ESTIMATE_ALONE" });
/** the sources of observed demand (decision D): Search Console, Bing, Keyword Planner, Google as a person or the client's own AI saw it, a person's sighting */
export const OBSERVED_SOURCES = Object.freeze(["SEARCH_CONSOLE", "BING_KEYWORD_RESEARCH", "KEYWORD_PLANNER_FILE", "CLIENT_AI_GOOGLE", "PERSON_SEEN"]);
const ISO = /^\d{4}-\d{2}-\d{2}/;
const DATE_IN_WORDS = /\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/;
const named = (s) => typeof s === "string" && s.trim() !== "";

/** One record → OBSERVED or ESTIMATE, or REFUSED when it claims OBSERVED without its own source and date. */
export function recordDemand(r) {
  if (!r) return Object.freeze({ refused: DEMAND_REFUSAL.RECORD_NOT_FOUND });
  const claims = r.label === "OBSERVED" || r.value?.kind === "OBSERVED" || r.tier === "OBSERVED";
  let source = null, date = null;
  if (r.record_type === "search_phrase") { source = OBSERVED_SOURCES.includes(r.source) ? r.source : null; date = ISO.test(r.date ?? "") ? r.date.slice(0, 10) : null; }
  else if (r.record_type === "public_question") { const v = r.value ?? {}; source = named(v.source) && /^https?:\/\//.test(v.reference ?? "") ? v.reference : null; date = ISO.test(v.timeWindow?.from ?? "") ? v.timeWindow.from.slice(0, 10) : null; }
  else if (r.record_type === "research_derived_question") { source = /^https?:\/\//.test(r.reference ?? "") ? r.reference : null; date = source && ISO.test(r.recorded_at ?? "") ? r.recorded_at.slice(0, 10) : null; }
  /* a listed phrase of the owner's own sighting (search-phrases.json): its source line names who saw it, where and on which day */
  else if (r.phraseId) { source = r.label === "OBSERVED" && named(r.source) ? r.source : null; date = (DATE_IN_WORDS.exec(r.source ?? "") ?? [null])[0]; }
  if (source && date) return Object.freeze({ demand: DEMAND.OBSERVED, source, date });
  if (claims && r.record_type !== "research_derived_question") return Object.freeze({ refused: DEMAND_REFUSAL.OBSERVED_WITHOUT_SOURCE });
  return Object.freeze({ demand: DEMAND.ESTIMATE });
}

/** C1–C3 · one need from its member records. `recordOf(inputId)` returns the stored record or null. */
export function needDemand(need, recordOf) {
  const observedIn = [], estimatedFrom = [], refused = [];
  for (const m of need.members ?? []) {
    const d = recordDemand(recordOf(m.inputId));
    if (d.refused) refused.push(Object.freeze({ inputId: m.inputId, refused: d.refused }));
    else if (d.demand === DEMAND.OBSERVED) observedIn.push(Object.freeze({ inputId: m.inputId, source: d.source, date: d.date }));
    else estimatedFrom.push(m.inputId);
  }
  const observed = observedIn.length > 0;
  return Object.freeze({
    needId: need.cluster_id ?? need.needId, title: need.title ?? null,
    label: observed ? DEMAND.OBSERVED : DEMAND.ESTIMATE,
    observedIn: Object.freeze(observedIn),
    estimate: estimatedFrom.length ? Object.freeze({ state: observed ? DEMAND.SUPERSEDED : DEMAND.ESTIMATE, from: Object.freeze(estimatedFrom) }) : null,
    refused: Object.freeze(refused),
  });
}

/**
 * C2 + C4 (Amendment 2, RR-286) · the needs that may create a page candidate and those refused, named: an OBSERVED need; or an ESTIMATE whose
 * own materially different answer from verified facts is recorded (`answerOf(needId)` → its verified claim ids) — an OPPORTUNITY, labelled
 * so in these records only. An estimate with no answer of its own is refused: an estimate alone never creates a page.
 */
export const OPPORTUNITY = "OPPORTUNITY";
export function pageCandidates(needs, { answerOf = () => [] } = {}) {
  const candidates = [], refused = [], opportunities = [];
  for (const n of needs) {
    if (n.label === DEMAND.OBSERVED && n.observedIn.length > 0) { candidates.push(n.needId); continue; }
    const answer = answerOf(n.needId) ?? [];
    if (answer.length > 0) { candidates.push(n.needId); opportunities.push(Object.freeze({ needId: n.needId, label: OPPORTUNITY, answer: Object.freeze([...answer]) })); }
    else refused.push(Object.freeze({ needId: n.needId, refused: DEMAND_REFUSAL.ESTIMATE_ALONE }));
  }
  return Object.freeze({ candidates: Object.freeze(candidates), refused: Object.freeze(refused), opportunities: Object.freeze(opportunities) });
}
/**
 * RR-285 · a recorded judgement may JOIN an observed record to a page's need (`joins`: [{ page, needKey, inputId }]) — the research agent's
 * join, recorded with its reason, never a similarity score. The joined record is judged by its own source and date like any other.
 */
const joinedTo = (joins, page, needKey) => (joins ?? []).filter((j) => j.page === page && j.needKey === needKey).map((j) => j.inputId);

/** C3 · one need of a published page: its questions and its joined records, judged as one need (OBSERVED beside a SUPERSEDED estimate). */
export function pageNeedDemand(page, item, recordOf, { joins = [] } = {}) {
  const ids = [...(item.questions ?? []).map((q) => q.questionId), ...(item.heading?.searchPhrase ? [item.heading.searchPhrase] : []), ...joinedTo(joins, page, item.needKey)];
  return needDemand({ needId: `${page}#${item.needKey}`, members: [...new Set(ids)].map((inputId) => ({ inputId })) }, recordOf);
}

/**
 * C4 · on published pages as built: every page question (one item = one need on the page) with no source of its own — none of its
 * questions is an OBSERVED record, its heading's search phrase is not one, and no joined record is. `recordOf(id)` resolves a question id
 * or a phrase id (bare or keyed).
 */
export function unsourcedPageQuestions(pages, recordOf, { joins = [] } = {}) {
  const out = [];
  let items = 0;
  for (const p of pages) for (const it of p.itemList ?? []) {
    items += 1;
    const ids = [...(it.questions ?? []).map((q) => q.questionId), ...(it.heading?.searchPhrase ? [it.heading.searchPhrase] : []), ...joinedTo(joins, p.publishedUrl, it.needKey)];
    const own = ids.map((id) => recordDemand(recordOf(id))).find((d) => d.demand === DEMAND.OBSERVED);
    if (!own) out.push(Object.freeze({ page: p.publishedUrl, needKey: it.needKey, question: it.heading?.shown ?? it.heading?.wording ?? null, label: DEMAND.ESTIMATE }));
  }
  return Object.freeze({ items, unsourced: Object.freeze(out) });
}
