/**
 * 🔴 F12 · INTENT AND QUESTION CLUSTERING — WORDINGS INTO NEEDS, BY A RECORDED GROUPING (acceptance _handoffs d960fa8,
 * AlmiVisibility_F12_ACCEPTANCE_2026-10-13.md; the owner's sameness ruling of 3 October 2026).
 *
 * Pure: inputs and a recorded grouping in, records out. 🔴 IT FETCHES NOTHING AND IT JUDGES NO MEANING. Which wordings mean the same is
 * the RECORDED grouping's judgement — a person's, the owner's, or a machine's (then INFERRED). This module only holds that grouping to
 * its rules, and refuses the whole of it when one is broken: nothing is half-clustered.
 *
 *   C1  every stored phrase and recorded question is read and ends in exactly one place — a need, "navigational — no page", or
 *       "no need yet" — its original wording word for word.
 *   C2  a wording joins a need only because a recorded judgement names it, or because it is identical to a named wording after the
 *       DECLARED clean-up. Never by a score. The place a wording came from is never, alone, a reason to split.
 *   C3  an answer that differs by country or jurisdiction stays INSIDE the one need, as a part naming its country and its fact. Another
 *       difference makes a different need only with the fact that changes the answer named. No page-level decision is made here.
 *   C4  every need has its reason, its maker and its date; a machine's or an AI's grouping is INFERRED; a grouping is never OBSERVED;
 *       every wording keeps the label its own source gave it.
 *   C5  a navigational wording has its reason and is in no need.
 *   C6  nothing here is a page or a page candidate.
 *   C7  the owner's sample: ten needs, 3 to 5 wordings and the reason each, his yes or no in his own words, every "no" corrected.
 * Product-neutral: names no product, client, place, entity or exam.
 */
import { createHash } from "node:crypto";
import { PLACES, CLEAN_UP, JOINS, SCORE_FIELDS, PLACE_AXES, PAGE_FIELDS, MAKERS, NEVER_A_GROUPING_LABEL, SAMPLE, GROUPING_KEYS } from "../../config/discovery/need-clusters.mjs";

export const CLUSTER_RECORD = "need_cluster";
export const SAMPLE_RECORD = "need_sample_answer";

export const REFUSAL = Object.freeze({
  NO_DATE: "DATE_ABSENT_OR_NOT_A_DAY",
  /* C1 */
  NOT_READ: "INPUT_NOT_READ",
  NO_PLACE: "INPUT_IN_NO_PLACE",
  TWO_PLACES: "INPUT_IN_TWO_PLACES",
  PLACE: "PLACE_NOT_NAMED",
  CHANGED: "ORIGINAL_WORDING_CHANGED",
  /* C2 */
  JOIN: "JOINED_BY_NEITHER_A_JUDGEMENT_NOR_THE_DECLARED_CLEAN_UP",
  SCORE: "JOIN_BY_A_SCORE",
  STEP: "CLEAN_UP_STEP_NOT_DECLARED",
  APART: "JUDGED_THE_SAME_AND_LEFT_APART",
  COUNTRY_SPLIT: "NEED_SPLIT_BY_COUNTRY",
  /* C3 */
  PART_COUNTRY: "COUNTRY_PART_WITHOUT_ITS_COUNTRY",
  PART_FACT: "COUNTRY_PART_WITHOUT_ITS_FACT",
  SPLIT_FACT: "DIFFERENT_NEED_WITHOUT_THE_FACT_THAT_CHANGES_THE_ANSWER",
  PAGE: "PAGE_LEVEL_DECISION_IS_NOT_THIS_FEATURES",
  /* C4 */
  NEED_ID: "NEED_UNNAMED_OR_NAMED_TWICE",
  REASON: "NEED_WITHOUT_ITS_REASON",
  MAKER: "DECISION_WITHOUT_ITS_MAKER",
  DATE: "DECISION_WITHOUT_ITS_DATE",
  LABEL: "GROUPING_LABEL_IS_NOT_ITS_MAKERS",
  SOURCE_LABEL: "WORDING_LOST_ITS_SOURCES_LABEL",
  /* C5 */
  NAV_REASON: "NAVIGATIONAL_WITHOUT_ITS_REASON",
  NAV_IN_NEED: "NAVIGATIONAL_WORDING_IN_A_NEED",
  /* C7 */
  FEW_ITEMS: "SAMPLE_HAS_FEWER_THAN_THE_DECLARED_ITEMS",
  ITEM: "SAMPLE_ITEM_INCOMPLETE",
  FEW_ANSWERS: "FEWER_OWNER_ANSWERS_THAN_SAMPLE_ITEMS",
  NOT_OWNER: "ANSWER_IS_NOT_THE_OWNERS_OWN_WORDS",
  NO_CORRECTION: "NO_WITHOUT_A_RECORDED_CORRECTION",
});

const present = (v) => typeof v === "string" && v.trim() !== "";
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);
const isDay = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
const list = (v) => (Array.isArray(v) ? v : []);
const holdsAny = (o, fields) => o !== null && typeof o === "object" && fields.some((f) => Object.hasOwn(o, f));
const factOk = (f) => present(f?.statement) && present(f?.reference);
const NOT_REPORTED = "NOT REPORTED";

/**
 * C1 · THE INPUTS of one tenant's batch: its stored phrase records and its recorded questions, each with its original wording and the
 * label its own source gave it. A record of these kinds that holds no wording is NOT skipped: it is returned as unread, by its id.
 */
export function inputsOf({ phrases = [], publicQuestions = [], derivedQuestions = [] }) {
  const inputs = [], unread = [];
  const take = (inputId, kind, wording, sourceLabel) => (present(wording) ? inputs.push(Object.freeze({ inputId, kind, wording, sourceLabel: present(sourceLabel) ? sourceLabel : NOT_REPORTED })) : unread.push(inputId));
  for (const p of list(phrases)) if (p?.record_type === "search_phrase") take(`search_phrase:${p.phrase_id}`, "PHRASE", p.phrase, p.label);
  for (const q of list(publicQuestions)) if (q?.record_type === "public_question") take(`public_question:${q.question_id}`, "QUESTION", q.value?.original, q.value?.kind);
  for (const q of list(derivedQuestions)) if (q?.record_type === "research_derived_question") take(`research_derived_question:${q.question_id}`, "QUESTION", q.wording?.text, q.tier);
  return Object.freeze({ inputs: Object.freeze(inputs), unread: Object.freeze(unread) });
}

/** C2 · the DECLARED clean-up, and nothing more: a step that is not declared is not applied; a step this engine does not know is named. */
export function cleanerOf(steps) {
  const declared = list(steps);
  const unknown = declared.filter((s) => !Object.hasOwn(CLEAN_UP, s));
  const known = declared.filter((s) => Object.hasOwn(CLEAN_UP, s));
  return Object.freeze({ unknown: Object.freeze(unknown), clean: (w) => known.reduce((s, k) => CLEAN_UP[k](s), String(w ?? "")) });
}

/** C4 · a decision's maker and date, judged; returns the grouping label that maker gives, or null. */
function decision(d, where, no) {
  if (!d || !Object.hasOwn(MAKERS, d.kind) || !present(d.name)) { no(REFUSAL.MAKER, where); return null; }
  if (!isDay(d.on)) no(REFUSAL.DATE, where);
  return MAKERS[d.kind];
}

/**
 * C1–C6 · THE GROUPING HELD TO ITS RULES. `grouping`: { cleanUp: [step], needs: [{ need, title, reason, decidedBy: { kind, name, on },
 * wordings: [text], countryParts?: [{ country, fact: { statement, reference }, wordings?: [text] }], differsFrom?: { need, by, fact } }],
 * navigational: [{ wording, reason, decidedBy }], noNeedYet: [text], judgedSame?: [[text, text]] }. One broken rule refuses the whole
 * grouping: no record is made. 🔴 A need is not a page and proposes none.
 */
export function clusterInputs({ inputs = [], unread = [], grouping = null, on }) {
  const refused = [];
  const no = (code, detail = {}) => refused.push(Object.freeze({ code, ...detail }));
  const g = grouping !== null && typeof grouping === "object" && !Array.isArray(grouping) ? grouping : {};
  if (!isDay(on)) no(REFUSAL.NO_DATE);
  for (const id of list(unread)) no(REFUSAL.NOT_READ, { inputId: id });
  for (const k of Object.keys(g)) if (!GROUPING_KEYS.includes(k)) no(PAGE_FIELDS.includes(k) ? REFUSAL.PAGE : SCORE_FIELDS.includes(k) ? REFUSAL.SCORE : REFUSAL.PLACE, { key: k });
  const { unknown, clean } = cleanerOf(g.cleanUp);
  for (const s of unknown) no(REFUSAL.STEP, { step: String(s) });

  /* every named wording, by its cleaned form: the one place it stands in, and the exact texts the grouping named */
  const placeOf = new Map();
  const put = (w, where) => {
    const k = clean(w);
    if (!k) return;
    const had = placeOf.get(k);
    if (!had) { placeOf.set(k, { ...where, named: new Set([String(w)]) }); return; }
    if (had.key === where.key) { had.named.add(String(w)); return; }
    const places = [had.place, where.place];
    no(places.includes(PLACES.NAVIGATIONAL) && places.includes(PLACES.NEED) ? REFUSAL.NAV_IN_NEED : REFUSAL.TWO_PLACES, { wording: k });
  };

  const needs = new Map();
  for (const n of list(g.needs)) {
    const id = n?.need;
    if (!present(id) || needs.has(id)) { no(REFUSAL.NEED_ID, { need: present(id) ? id : null }); continue; }
    const where = { need: id };
    if (holdsAny(n, SCORE_FIELDS)) no(REFUSAL.SCORE, where);
    if (holdsAny(n, PAGE_FIELDS)) no(REFUSAL.PAGE, where);
    if (!present(n.reason)) no(REFUSAL.REASON, where);
    const label = decision(n.decidedBy, where, no);
    if (n.label === NEVER_A_GROUPING_LABEL || (present(n.label) && label !== null && n.label !== label)) no(REFUSAL.LABEL, where);
    /* C2, C3 — a country never makes a need of its own: it is a part inside one */
    if (holdsAny(n, ["country", "jurisdiction"])) no(REFUSAL.COUNTRY_SPLIT, where);
    let differsFrom = null;
    if (n.differsFrom !== undefined && n.differsFrom !== null) {
      const d = n.differsFrom;
      if (PLACE_AXES.includes(String(d?.by ?? "").trim().toUpperCase())) no(REFUSAL.COUNTRY_SPLIT, where);
      else if (!present(d?.need) || !present(d?.by) || !factOk(d?.fact)) no(REFUSAL.SPLIT_FACT, where);
      else differsFrom = Object.freeze({ need: d.need, by: d.by, fact: Object.freeze({ statement: d.fact.statement, reference: d.fact.reference }) });
    }
    const parts = [];
    for (const p of list(n.countryParts)) {
      if (!present(p?.country)) no(REFUSAL.PART_COUNTRY, where);
      if (!factOk(p?.fact)) no(REFUSAL.PART_FACT, where);
      if (present(p?.country) && factOk(p?.fact)) parts.push(Object.freeze({ country: p.country, fact: Object.freeze({ statement: p.fact.statement, reference: p.fact.reference }), wordings: Object.freeze(list(p.wordings).map(String)) }));
      for (const w of list(p?.wordings)) put(w, { key: `need:${id}`, place: PLACES.NEED, need: id });
    }
    for (const w of list(n.wordings)) put(w, { key: `need:${id}`, place: PLACES.NEED, need: id });
    needs.set(id, { title: present(n.title) ? n.title : id, reason: n.reason, decidedBy: n.decidedBy, label, parts, differsFrom });
  }
  for (const [id, n] of needs) if (n.differsFrom && !needs.has(n.differsFrom.need)) no(REFUSAL.SPLIT_FACT, { need: id });

  const navigational = new Map();
  for (const v of list(g.navigational)) {
    const where = { wording: clean(v?.wording) };
    if (!present(v?.reason)) no(REFUSAL.NAV_REASON, where);
    const label = decision(v?.decidedBy, where, no);
    put(v?.wording, { key: "navigational", place: PLACES.NAVIGATIONAL, need: null });
    navigational.set(clean(v?.wording), { reason: v?.reason, decidedBy: v?.decidedBy, label });
  }
  for (const w of list(g.noNeedYet)) put(w, { key: "no-need-yet", place: PLACES.NO_NEED_YET, need: null });

  for (const pair of list(g.judgedSame)) {
    const [a, b] = list(pair).map((w) => placeOf.get(clean(w)));
    if (!a || !b || a.key !== b.key) no(REFUSAL.APART, { wordings: list(pair).map((w) => clean(w)) });
  }

  /* C1, C2 — each input, by its own wording, to the one place a named wording gives it; no named wording, no place */
  const members = new Map();
  for (const i of list(inputs)) {
    const k = clean(i.wording);
    const where = placeOf.get(k);
    if (!where) { no(REFUSAL.NO_PLACE, { inputId: i.inputId }); continue; }
    const key = where.place === PLACES.NAVIGATIONAL ? `navigational:${k}` : where.key;
    const m = members.get(key) ?? [];
    m.push(Object.freeze({ inputId: i.inputId, kind: i.kind, wording: i.wording, sourceLabel: i.sourceLabel, joinedBy: where.named.has(i.wording) ? JOINS.JUDGEMENT : JOINS.IDENTICAL }));
    members.set(key, m);
  }
  if (refused.length) return Object.freeze({ refused: Object.freeze(refused), records: Object.freeze([]), counts: null });

  const at = `${on}T00:00:00Z`;
  const sorted = (m) => Object.freeze([...(m ?? [])].sort((a, b) => (a.inputId < b.inputId ? -1 : 1)));
  const record = (place, body, m) => {
    const id = hash([place, body.need ?? body.wording ?? null, m.map((x) => x.inputId)]);
    return Object.freeze({ record_type: CLUSTER_RECORD, measurement_key: `${CLUSTER_RECORD}:${id}`, cluster_id: id, recorded_at: at, place, ...body, wordings: new Set(m.map((x) => clean(x.wording))).size, inputs: m.length, members: m });
  };
  const records = [];
  for (const [id, n] of [...needs].sort(([a], [b]) => (a < b ? -1 : 1))) {
    records.push(record(PLACES.NEED, { need: id, title: n.title, reason: n.reason, decidedBy: Object.freeze({ kind: n.decidedBy.kind, name: n.decidedBy.name, on: n.decidedBy.on }), label: n.label,
      countryParts: Object.freeze(n.parts), ...(n.differsFrom ? { differsFrom: n.differsFrom } : {}) }, sorted(members.get(`need:${id}`))));
  }
  for (const [k, v] of [...navigational].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const m = sorted(members.get(`navigational:${k}`));
    if (m.length) records.push(record(PLACES.NAVIGATIONAL, { wording: k, reason: v.reason, decidedBy: Object.freeze({ kind: v.decidedBy.kind, name: v.decidedBy.name, on: v.decidedBy.on }), label: v.label }, m));
  }
  const none = sorted(members.get("no-need-yet"));
  if (none.length) records.push(record(PLACES.NO_NEED_YET, {}, none));
  return Object.freeze({ refused: Object.freeze([]), records: Object.freeze(records), counts: countsOf(records, inputs) });
}

/** Counts only, from the records themselves. */
export function countsOf(records, inputs = []) {
  const of = (place) => list(records).filter((r) => r?.record_type === CLUSTER_RECORD && r.place === place);
  const sum = (rs) => rs.reduce((n, r) => n + r.members.length, 0);
  const needs = of(PLACES.NEED), joins = {};
  for (const r of needs) for (const m of r.members) joins[m.joinedBy] = (joins[m.joinedBy] ?? 0) + 1;
  return Object.freeze({ inputs: list(inputs).length, phrases: list(inputs).filter((i) => i.kind === "PHRASE").length, questions: list(inputs).filter((i) => i.kind === "QUESTION").length,
    needs: needs.length, needsHoldingAnInput: needs.filter((r) => r.members.length > 0).length, inNeed: sum(needs), navigational: sum(of(PLACES.NAVIGATIONAL)), navigationalWordings: of(PLACES.NAVIGATIONAL).length, noNeedYet: sum(of(PLACES.NO_NEED_YET)),
    joins: Object.freeze(joins), needsWithCountryParts: needs.filter((r) => r.countryParts.length > 0).length, needsDifferingByAFact: needs.filter((r) => r.differsFrom).length,
    labels: Object.freeze(needs.reduce((m, r) => ((m[r.label] = (m[r.label] ?? 0) + 1), m), {})) });
}

/**
 * C1, C2, C4 · THE STORED RECORDS READ BACK against the inputs: every input in exactly one named place, its wording and its source's
 * label unchanged, every join one of the two ways, every need with its reason, maker, date and a label that is never OBSERVED.
 */
export function clusterFaults({ records = [], inputs = [] }) {
  const faults = [];
  const fault = (code, detail = {}) => faults.push(Object.freeze({ code, ...detail }));
  const seen = new Map();
  const NAMED = Object.values(PLACES), WAYS = Object.values(JOINS);
  for (const r of list(records)) {
    if (r?.record_type !== CLUSTER_RECORD) continue;
    if (!NAMED.includes(r.place)) fault(REFUSAL.PLACE, { cluster: r.cluster_id });
    if (r.place === PLACES.NEED || r.place === PLACES.NAVIGATIONAL) {
      if (r.place === PLACES.NEED && !present(r.reason)) fault(REFUSAL.REASON, { cluster: r.cluster_id });
      if (r.place === PLACES.NAVIGATIONAL && !present(r.reason)) fault(REFUSAL.NAV_REASON, { cluster: r.cluster_id });
      if (!r.decidedBy || !Object.hasOwn(MAKERS, r.decidedBy.kind) || !present(r.decidedBy.name)) fault(REFUSAL.MAKER, { cluster: r.cluster_id });
      else if (!isDay(r.decidedBy.on)) fault(REFUSAL.DATE, { cluster: r.cluster_id });
      if (r.label === NEVER_A_GROUPING_LABEL || r.label !== MAKERS[r.decidedBy?.kind]) fault(REFUSAL.LABEL, { cluster: r.cluster_id });
    }
    for (const m of list(r.members)) {
      seen.set(m.inputId, [...(seen.get(m.inputId) ?? []), m]);
      if (r.place === PLACES.NEED && !WAYS.includes(m.joinedBy)) fault(REFUSAL.JOIN, { inputId: m.inputId });
    }
  }
  for (const i of list(inputs)) {
    const at = seen.get(i.inputId) ?? [];
    if (at.length === 0) fault(REFUSAL.NO_PLACE, { inputId: i.inputId });
    if (at.length > 1) fault(REFUSAL.TWO_PLACES, { inputId: i.inputId });
    for (const m of at) {
      if (m.wording !== i.wording) fault(REFUSAL.CHANGED, { inputId: i.inputId });
      if (m.sourceLabel !== i.sourceLabel) fault(REFUSAL.SOURCE_LABEL, { inputId: i.inputId });
    }
  }
  return Object.freeze(faults);
}

/**
 * C7 · THE SAMPLE shown to the owner. `sample`: { items: [{ need, wordings: [text] }] } — which needs, and which of each need's own
 * wordings. Each item is completed from the need's record: its title and its reason. An item with an unknown need, fewer or more
 * wordings than declared, a wording that is not that need's, or no reason is incomplete; fewer items than declared is no sample.
 */
export function sampleItems({ records = [], sample = null }) {
  const refused = [], items = [];
  const needs = new Map(list(records).filter((r) => r?.record_type === CLUSTER_RECORD && r.place === PLACES.NEED).map((r) => [r.need, r]));
  list(sample?.items).forEach((s, n) => {
    const r = needs.get(s?.need), words = list(s?.wordings);
    const own = r ? new Set(r.members.map((m) => m.wording)) : new Set();
    if (!r || !present(r.reason) || words.length < SAMPLE.minWordings || words.length > SAMPLE.maxWordings || words.some((w) => !own.has(w))) { refused.push(Object.freeze({ code: REFUSAL.ITEM, item: n + 1 })); return; }
    items.push(Object.freeze({ item: n + 1, need: r.need, title: r.title, wordings: Object.freeze(words.slice()), reason: r.reason, label: r.label }));
  });
  if (list(sample?.items).length < SAMPLE.items) refused.push(Object.freeze({ code: REFUSAL.FEW_ITEMS, items: list(sample?.items).length }));
  return Object.freeze({ items: Object.freeze(refused.length ? [] : items), refused: Object.freeze(refused) });
}

/**
 * C7 · THE OWNER'S ANSWERS, judged. `answers`: { answeredBy, reference, on, answers: [{ item, answer, words, correction?: { what, on } }] }.
 * PASSED only when every sample item has the owner's yes or no in his own words, and every "no" names its recorded correction. With no
 * answers at all the sample is NOT ANSWERED — which is not a refusal, and is never a pass.
 */
export function ownerSampleVerdict({ items = [], answers = null, on }) {
  if (answers === null || answers === undefined) return Object.freeze({ state: "NOT ANSWERED", refused: Object.freeze([]), records: Object.freeze([]) });
  const refused = [];
  const no = (code, detail = {}) => refused.push(Object.freeze({ code, ...detail }));
  if (list(items).length < SAMPLE.items) no(REFUSAL.FEW_ITEMS, { items: list(items).length });
  if (answers.answeredBy !== SAMPLE.answeredBy || !present(answers.reference) || !isDay(answers.on)) no(REFUSAL.NOT_OWNER);
  const byItem = new Map(list(answers.answers).map((a) => [a?.item, a]));
  const records = [];
  for (const it of list(items)) {
    const a = byItem.get(it.item);
    if (!a || !SAMPLE.answers.includes(a.answer)) { no(REFUSAL.FEW_ANSWERS, { item: it.item }); continue; }
    if (!present(a.words)) no(REFUSAL.NOT_OWNER, { item: it.item });
    if (a.answer === "no" && !(present(a.correction?.what) && isDay(a.correction?.on))) no(REFUSAL.NO_CORRECTION, { item: it.item });
    const id = hash([it.need, it.wordings, a.answer, a.words, answers.reference]);
    records.push(Object.freeze({ record_type: SAMPLE_RECORD, measurement_key: `${SAMPLE_RECORD}:${id}`, answer_id: id, recorded_at: `${isDay(on) ? on : answers.on}T00:00:00Z`, item: it.item, need: it.need, title: it.title,
      wordings: it.wordings, reason: it.reason, answer: a.answer, words: a.words, answeredBy: answers.answeredBy, reference: answers.reference, answeredOn: answers.on, ...(a.correction ? { correction: Object.freeze({ what: a.correction.what, on: a.correction.on }) } : {}) }));
  }
  return Object.freeze({ state: refused.length ? "REFUSED" : "PASSED", refused: Object.freeze(refused), records: Object.freeze(refused.length ? [] : records) });
}

/** [ALL] · the real population: phrases and questions both held, and every one of them placed. Fixtures alone never complete it. */
export function realPopulation({ counts = null, faults = [] }) {
  const missing = [];
  if (!((counts?.phrases ?? 0) > 0)) missing.push("no stored phrase was read");
  if (!((counts?.questions ?? 0) > 0)) missing.push("no recorded question was read");
  if (counts && counts.inNeed + counts.navigational + counts.noNeedYet !== counts.inputs) missing.push("an input is not in exactly one place");
  if (list(faults).length) missing.push(`${list(faults).length} fault(s) in the stored records`);
  return Object.freeze({ state: missing.length ? "INCOMPLETE" : "COMPLETE", missing: Object.freeze(missing) });
}

/** [ALL] · PROVED only when C1 to C7 are each PROVED, the real population is COMPLETE and the owner's sample PASSED. */
export function rowVerdict({ clauses = {}, population = null, sample = null }) {
  const open = ["C1", "C2", "C3", "C4", "C5", "C6", "C7"].filter((c) => clauses[c] !== "PROVED");
  const real = population?.state === "COMPLETE", answered = sample?.state === "PASSED";
  return Object.freeze({ verdict: open.length === 0 && real && answered ? "PROVED" : "NOT PROVED", open: Object.freeze(open), realPopulation: real ? "COMPLETE" : "INCOMPLETE", ownerSample: answered ? "PASSED" : (sample?.state ?? "NOT ANSWERED") });
}

export { PLACES, JOINS, MAKERS, SAMPLE };
