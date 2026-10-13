/**
 * 🔴 F11 · KEYWORD AND SEARCH-LANGUAGE DISCOVERY — SIX SOURCES, ONE RECORD (acceptance _handoffs d941e18,
 * AlmiVisibility_F11_ACCEPTANCE_2026-10-13.md; owner ruling …RR-259_F11_SOURCES_AND_RULES.md).
 *
 * Pure: hand-ins in, records out. 🔴 IT FETCHES NOTHING. The engine never queries a search engine: for source (a) it records what the
 * client's own AI saw in the client's own browser and handed in; (c) and (d) are files the client exported from its own accounts; (b) is
 * the stored pull, handed in already partitioned to ONE tenant by its caller. It reads no credential and no environment.
 *
 *   C1  every phrase verbatim in one record: phrase, source, observation kind, place, language, date; a field the source does not report
 *       is NOT REPORTED by name; the LABEL follows the source alone; the same phrase from the same source, kind, place, language and seed
 *       is stored once.
 *   C2  a run of source (a) is accepted only when its record shows a client start, a notice first, every pause at least the declared one,
 *       the day's searches within the declared cap, and — when a captcha or "unusual traffic" page was met — an immediate stop, the
 *       client told, and no observation after it. A refused run stores its run record and NOT ONE of its phrases.
 *   C3  kinds by stated rules over declared lists; a phrase no rule decides is UNCLASSIFIED.
 *   C4  equivalent wording in ONE need; every phrase in exactly one need or in "no need yet" by name. Nothing here is a page.
 *   C5  a volume only from a source that itself reports one, as that source's own estimate with its date.
 *   C6  no account, key or cost is the engine's: a live part with no hand-in is NOT MEASURED with the owner's step named.
 * Product-neutral: names no product, client, place, entity or exam.
 */
import { createHash } from "node:crypto";
import { SOURCES, LABELS, CLIENT_AI_POLICY, NOT_REPORTED, NO_NEED_YET, UNCLASSIFIED, OWNER_STEPS, KIND_RULES, DECLARED_LISTS } from "../../config/discovery/search-phrases.mjs";

export const PHRASE_RECORD = "search_phrase";
export const RUN_RECORD = "search_phrase_run";
export const GROUP_RECORD = "search_phrase_group";
export const STATUS_RECORD = "search_phrase_source_status";

export const REFUSAL = Object.freeze({
  UNKNOWN_SOURCE: "UNKNOWN_SOURCE",
  NO_PHRASE: "PHRASE_ABSENT_OR_NOT_TEXT",
  NO_DATE: "DATE_ABSENT_OR_NOT_A_DAY",
  KIND: "OBSERVATION_KIND_IS_NOT_THIS_SOURCES",
  LABEL: "LABEL_IS_NOT_THE_SOURCES_OWN",
  VOLUME_SOURCE: "VOLUME_FROM_A_SOURCE_THAT_REPORTS_NONE",
  VOLUME_DATE: "VOLUME_WITHOUT_ITS_DATE",
  FILE: "HAND_IN_UNREADABLE",
  /* C2 */
  NOT_CLIENT_STARTED: "RUN_NOT_STARTED_BY_THE_CLIENT",
  NO_NOTICE: "RUN_WITHOUT_A_NOTICE_FIRST",
  POLICY: "RUN_DECLARES_A_FASTER_PACE_OR_A_LARGER_CAP_THAN_ALLOWED",
  INCOMPLETE: "RUN_RECORD_INCOMPLETE",
  PAUSE: "PAUSE_SHORTER_THAN_DECLARED",
  CAP: "DAILY_CAP_EXCEEDED",
  STOP: "STOP_NOT_RECORDED_AS_AN_IMMEDIATE_STOP_TOLD_TO_THE_CLIENT",
  AFTER_STOP: "OBSERVATION_OR_SEARCH_AFTER_THE_STOP",
  ORPHAN: "OBSERVATION_NAMES_NO_SEARCH_OF_ITS_RUN",
  /* C3, C4 */
  LISTS: "KIND_LIST_NOT_DECLARED",
  TWO_NEEDS: "PHRASE_IN_TWO_NEEDS",
});

const present = (v) => typeof v === "string" && v.trim() !== "";
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);
const isDay = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
const instant = (t) => (typeof t === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/.test(t) ? Date.parse(t) : NaN);
const reported = (v) => (present(v) ? v.trim() : NOT_REPORTED);

/** The wording two phrases share when they are the same words: case, punctuation and spacing aside. Used to group, never to store. */
export const normalForm = (text) => String(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).join(" ");

/** What makes two records the same observation (C1): the phrase EXACTLY as handed in, its source, kind, place, language and seed. */
export const phraseKey = (r) => hash([r.source, r.kind, r.place, r.language, r.seed ?? null, r.phrase]);

/**
 * ONE RECORD (C1). `item`: { text, kind, seed?, place?, language?, date, label?, volume? }. The phrase is stored EXACTLY as handed in.
 * @returns {{ record: object } | { refused: string }}
 */
export function phraseRecord(source, item) {
  const s = Object.hasOwn(SOURCES, source ?? "") ? SOURCES[source] : null;
  if (!s) return { refused: REFUSAL.UNKNOWN_SOURCE };
  if (!present(item?.text)) return { refused: REFUSAL.NO_PHRASE };
  if (!isDay(item.date)) return { refused: REFUSAL.NO_DATE };
  if (!s.kinds.includes(item.kind)) return { refused: REFUSAL.KIND };
  /* the label is the source's own: a hand-in that claims another is refused, never corrected silently */
  if (item.label !== undefined && item.label !== s.label) return { refused: REFUSAL.LABEL };
  let volume = null;
  if (item.volume !== undefined && item.volume !== null) {
    if (!s.reportsVolume) return { refused: REFUSAL.VOLUME_SOURCE };
    if (!isDay(item.volume?.asOf) || !(present(item.volume?.estimate) || Number.isFinite(item.volume?.estimate))) return { refused: REFUSAL.VOLUME_DATE };
    volume = Object.freeze({ estimate: item.volume.estimate, whose: `${s.says} — the source's own estimate`, asOf: item.volume.asOf });
  }
  const base = { source, sourceSays: s.says, label: s.label, kind: item.kind, phrase: item.text, seed: present(item.seed) ? item.seed : null, place: reported(item.place), language: reported(item.language), date: item.date };
  const key = phraseKey(base);
  return { record: Object.freeze({ record_type: PHRASE_RECORD, measurement_key: `${PHRASE_RECORD}:${key}`, phrase_id: key, recorded_at: `${item.date}T00:00:00Z`, ...base, ...(present(item.runId) ? { runId: item.runId } : {}), ...(present(item.caveat) ? { caveat: item.caveat } : {}), ...(volume ? { volume } : {}) }) };
}

const collect = (source, items) => {
  const records = [], refused = [];
  for (const it of items) { const r = phraseRecord(source, it); if (r.record) records.push(r.record); else refused.push(Object.freeze({ source, code: r.refused })); }
  return { records, refused };
};

/** A run's identity: its day, its name and its searches as recorded. */
export const runKeyOf = (handIn, run) => hash([handIn?.date ?? null, run?.runId ?? null, (Array.isArray(run?.searches) ? run.searches : []).map((s) => [s?.n ?? null, s?.at ?? null])]);

/** C2 · the day's searches ALREADY recorded before this hand-in — accepted or refused, every one counts against the day's cap. A run of
 * this same hand-in that is already held is not counted twice. */
export function daySearchesBefore(held, handIn) {
  const mine = new Set((Array.isArray(handIn?.runs) ? handIn.runs : []).map((run) => runKeyOf(handIn, run)));
  return (held ?? []).filter((r) => r?.record_type === RUN_RECORD && r.date === handIn?.date && !mine.has(r.run_id)).reduce((n, r) => n + (Number.isInteger(r.searchesUsed) ? r.searchesUsed : 0), 0);
}

/**
 * SOURCE (a) · C2 · one hand-in of the client's own AI: its runs, each judged ALONE and in the day's order. A refused run yields its run
 * record and none of its phrases. `searchesBefore`: the day's searches already recorded (the cap is the day's).
 */
export function clientAiHandIn(handIn, { policy = CLIENT_AI_POLICY, searchesBefore = 0 } = {}) {
  const records = [], runs = [], refused = [];
  if (handIn?.source !== "CLIENT_AI_GOOGLE" || !Array.isArray(handIn.runs)) return { records, runs, refused: [Object.freeze({ source: "CLIENT_AI_GOOGLE", code: REFUSAL.FILE })] };
  const declared = handIn.policy ?? {};
  let used = searchesBefore, last = NaN;
  for (const run of handIn.runs) {
    const searches = Array.isArray(run?.searches) ? run.searches : [], observations = Array.isArray(run?.observations) ? run.observations : [];
    const why = [];
    if (!(handIn.startedBy?.who === "CLIENT" && present(handIn.startedBy?.record))) why.push(REFUSAL.NOT_CLIENT_STARTED);
    const times = searches.map((s) => instant(s?.at)), ends = searches.map((s, i) => (s?.until === undefined ? times[i] : instant(s.until)));
    const complete = present(run?.runId) && searches.length > 0 && isDay(handIn.date) && searches.every((s, i) => Number.isInteger(s?.n) && present(s.query) && ["AUTOCOMPLETE", "RESULTS"].includes(s.action) && !Number.isNaN(times[i]) && !Number.isNaN(ends[i]) && ends[i] >= times[i]);
    if (!complete) why.push(REFUSAL.INCOMPLETE);
    if (!(present(handIn.notice?.text) && !Number.isNaN(instant(handIn.notice?.givenAt)) && (!complete || instant(handIn.notice.givenAt) <= times[0]))) why.push(REFUSAL.NO_NOTICE);
    if (!(Number.isFinite(declared.minPauseSeconds) && declared.minPauseSeconds >= policy.minPauseSeconds && Number.isInteger(declared.dailyCap) && declared.dailyCap <= policy.dailyCap)) why.push(REFUSAL.POLICY);
    const pauses = [];
    if (complete) for (let i = 0; i < searches.length; i++) { const before = i === 0 ? last : ends[i - 1]; if (!Number.isNaN(before)) pauses.push((times[i] - before) / 1000); }
    if (complete && pauses.some((p) => p < policy.minPauseSeconds)) why.push(REFUSAL.PAUSE);
    used += searches.length;
    if (used > policy.dailyCap) why.push(REFUSAL.CAP);
    const stop = run?.stopped ?? null;
    if (stop !== null) {
      const at = instant(stop?.at);
      if (!(policy.stopReasons.includes(stop?.reason) && !Number.isNaN(at) && stop.toldClient === true)) why.push(REFUSAL.STOP);
      else if (complete && (times.some((t) => t > at) || observations.some((o) => { const k = searches.findIndex((s) => s.n === o?.search); return k >= 0 && times[k] >= at; }))) why.push(REFUSAL.AFTER_STOP);
    }
    const byN = new Map(searches.map((s) => [s?.n, s]));
    const kindOk = (o) => { const s = byN.get(o?.search); return s && (o.kind === "AUTOCOMPLETE" ? s.action === "AUTOCOMPLETE" : s.action === "RESULTS") && Array.isArray(o.texts); };
    if (!observations.every(kindOk)) why.push(REFUSAL.ORPHAN);
    const accepted = why.length === 0;
    const mine = [];
    if (accepted) for (const o of observations) for (const text of o.texts) {
      const r = phraseRecord("CLIENT_AI_GOOGLE", { text, kind: o.kind, seed: byN.get(o.search).query, place: handIn.place, language: handIn.language, date: handIn.date, runId: run.runId, caveat: handIn.caveat });
      if (r.record) mine.push(r.record); else refused.push(Object.freeze({ source: "CLIENT_AI_GOOGLE", runId: run.runId, code: r.refused }));
    }
    records.push(...mine);
    if (complete) last = ends.at(-1);
    const runKey = runKeyOf(handIn, run);
    runs.push(Object.freeze({ record_type: RUN_RECORD, measurement_key: `${RUN_RECORD}:${runKey}`, run_id: runKey, recorded_at: isDay(handIn.date) ? `${handIn.date}T00:00:00Z` : null, source: "CLIENT_AI_GOOGLE", runId: run?.runId ?? null,
      verdict: accepted ? "ACCEPTED" : "REFUSED", refusedFor: Object.freeze([...new Set(why)]), startedBy: handIn.startedBy?.who ?? null, noticeGivenAt: handIn.notice?.givenAt ?? null,
      searchesUsed: searches.length, searchesOfTheDay: used, dailyCap: policy.dailyCap, minPauseSeconds: policy.minPauseSeconds, shortestPauseSeconds: pauses.length ? Math.min(...pauses) : null, pauses: pauses.length,
      stopped: stop === null ? "NO" : `${stop?.reason ?? "UNKNOWN"} at ${stop?.at ?? "UNKNOWN"}`, observationsHandedIn: observations.reduce((n, o) => n + (Array.isArray(o?.texts) ? o.texts.length : 0), 0), phrasesKept: mine.length, place: reported(handIn.place), language: reported(handIn.language), date: handIn.date ?? null }));
  }
  return { records, runs, refused };
}

/** SOURCE (b) · the client's Search Console queries: rows ALREADY partitioned to one tenant by the caller. Search Console reports no language. */
export function searchConsoleRows(rows, { date }) {
  return collect("SEARCH_CONSOLE", (Array.isArray(rows) ? rows : []).map((r) => ({ text: r?.query, kind: "QUERY", place: r?.country, language: undefined, date })));
}

/** SOURCE (c) · Bing Webmaster keyword research, as the source's own response the client saved: { country, language, retrievedOn, keywords: [{ Query, Impressions }] }. */
export function bingKeywordResearch(handIn) {
  if (handIn?.source !== "BING_KEYWORD_RESEARCH" || !Array.isArray(handIn.keywords)) return { records: [], refused: [Object.freeze({ source: "BING_KEYWORD_RESEARCH", code: REFUSAL.FILE })] };
  return collect("BING_KEYWORD_RESEARCH", handIn.keywords.map((k) => ({ text: k?.Query, kind: "KEYWORD_IDEA", seed: handIn.seed, place: handIn.country, language: handIn.language, date: handIn.retrievedOn, label: handIn.label,
    ...(k?.Impressions !== undefined ? { volume: { estimate: k.Impressions, asOf: handIn.retrievedOn } } : {}) })));
}

/** One line of a delimited export, quotes honoured. */
const cells = (line, d) => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === "\"" && line[i + 1] === "\"") { cur += "\""; i++; } else if (c === "\"") q = false; else cur += c; } else if (c === "\"") q = true; else if (c === d) { out.push(cur); cur = ""; } else cur += c; } out.push(cur); return out; };

/** SOURCE (d) · a Keyword Planner file the client exported, with what the client states beside it: { country, language, exportedOn }. Never fetched. */
export function keywordPlannerFile(text, meta) {
  const lines = String(text ?? "").replace(/^﻿/, "").split(/\r?\n/);
  const at = lines.findIndex((l) => /(^|[\t,"])Keyword([\t,"]|$)/.test(l));
  if (at < 0) return { records: [], refused: [Object.freeze({ source: "KEYWORD_PLANNER_FILE", code: REFUSAL.FILE })] };
  const d = lines[at].includes("\t") ? "\t" : ",", head = cells(lines[at], d).map((h) => h.trim());
  const kw = head.indexOf("Keyword"), vol = head.findIndex((h) => /^Avg\. monthly searches$/i.test(h));
  const items = lines.slice(at + 1).map((l) => cells(l, d)).filter((c) => present(c[kw])).map((c) => ({ text: c[kw], kind: "KEYWORD_IDEA", place: meta?.country, language: meta?.language, date: meta?.exportedOn, label: meta?.label,
    ...(vol >= 0 && present(c[vol]) ? { volume: { estimate: c[vol].trim(), asOf: meta?.exportedOn } } : {}) }));
  return collect("KEYWORD_PLANNER_FILE", items);
}

/** SOURCE (e) · what a person saw: [{ text, kind, query?, place?, language?, date | observedOn, label?, volume? }]. */
export function personSeen(items) {
  return collect("PERSON_SEEN", (Array.isArray(items) ? items : []).map((p) => ({ text: p?.text, kind: p?.kind ?? "SEEN", seed: p?.query, place: p?.place, language: p?.language, date: p?.date ?? p?.observedOn, caveat: p?.caveat, ...(p?.volume !== undefined ? { volume: p.volume } : {}) })));
}

/** SOURCE (f) · suggestions from an AI: always INFERRED — a hand-in that calls one OBSERVED is refused. */
export function aiSuggestions(handIn) {
  if (handIn?.source !== "AI_SUGGESTION" || !Array.isArray(handIn.suggestions)) return { records: [], refused: [Object.freeze({ source: "AI_SUGGESTION", code: REFUSAL.FILE })] };
  return collect("AI_SUGGESTION", handIn.suggestions.map((s) => ({ text: s?.text, kind: "SUGGESTION", seed: s?.seed, place: handIn.place, language: handIn.language, date: handIn.date, label: s?.label ?? handIn.label, ...(s?.volume !== undefined ? { volume: s.volume } : {}) })));
}

/** C1 · the same observation is stored once: what is new against what is held, and within the hand-in itself. */
export function freshPhrases(held, incoming) {
  const seen = new Set((held ?? []).filter((r) => r?.record_type === PHRASE_RECORD).map((r) => r.phrase_id));
  const fresh = [], repeated = [];
  for (const r of incoming) { if (seen.has(r.phrase_id)) repeated.push(r); else { seen.add(r.phrase_id); fresh.push(r); } }
  return { fresh, repeated };
}

/** C3 · the lists a product declares for the kind rules. Any other name is not declared. */
export function kindListFaults(lists) {
  if (lists === null || typeof lists !== "object" || Array.isArray(lists)) return [REFUSAL.LISTS];
  const ok = Object.keys(lists).every((k) => DECLARED_LISTS.includes(k)) && (lists.primaryLanguage === undefined || present(lists.primaryLanguage))
    && ["places", "entities"].every((k) => lists[k] === undefined || (Array.isArray(lists[k]) && lists[k].every((e) => present(e?.name) && (e.forms === undefined || (Array.isArray(e.forms) && e.forms.every(present))))))
    && (lists.languageVariants === undefined || (Array.isArray(lists.languageVariants) && lists.languageVariants.every((v) => present(v?.language) && Array.isArray(v.markers) && v.markers.every(present))));
  return ok ? [] : [REFUSAL.LISTS];
}

const holds = (tokens, form) => { const f = normalForm(form).split(" ").filter(Boolean); if (!f.length) return false; for (let i = 0; i + f.length <= tokens.length; i++) if (f.every((w, k) => tokens[i + k] === w)) return true; return false; };

/**
 * C3 · every kind a stated rule decides for one phrase, each with the rule's own evidence; UNCLASSIFIED when none does.
 * head / long-tail by word count; question by a closing question mark or an opening question word; local by a declared place;
 * language variant by the phrase's own recorded language or a declared variant's marker word; intent by a general intent word (named);
 * comparison by a comparison word; brand or entity by a declared entity.
 */
export function kindsOf(record, lists = {}, rules = KIND_RULES) {
  if (kindListFaults(lists).length) return Object.freeze({ kinds: Object.freeze([]), refused: REFUSAL.LISTS });
  const tokens = normalForm(record?.phrase ?? "").split(" ").filter(Boolean);
  const kinds = [], evidence = {};
  const add = (k, why) => { kinds.push(k); evidence[k] = why; };
  if (tokens.length > 0 && tokens.length <= rules.headMaxWords) add("HEAD", `${tokens.length} word(s)`);
  if (tokens.length >= rules.longTailMinWords) add("LONG_TAIL", `${tokens.length} words`);
  const asks = /[?؟]\s*$/.test(record?.phrase ?? "");
  if (asks || rules.questionWords.includes(tokens[0])) add("QUESTION", asks ? "ends in a question mark" : `opens with "${tokens[0]}"`);
  const place = (lists.places ?? []).find((p) => [p.name, ...(p.forms ?? [])].some((f) => holds(tokens, f)));
  if (place) add("LOCAL", place.name);
  const variant = (lists.languageVariants ?? []).find((v) => v.markers.some((m) => holds(tokens, m)));
  /* the phrase's own recorded language makes a variant only when it is a DECLARED variant — so NOT REPORTED, or any undeclared name, makes none */
  const spoken = present(record?.language) && present(lists.primaryLanguage) && normalForm(record.language) !== normalForm(lists.primaryLanguage) ? record.language : null;
  if (variant) add("LANGUAGE_VARIANT", variant.language); else if (spoken && (lists.languageVariants ?? []).some((v) => normalForm(v.language) === normalForm(spoken))) add("LANGUAGE_VARIANT", spoken);
  const intents = Object.entries(rules.intentWords).filter(([, words]) => words.some((w) => tokens.includes(w))).map(([name]) => name);
  if (intents.length) add("INTENT", intents.join(", "));
  const cmp = rules.comparisonWords.find((w) => tokens.includes(w));
  if (cmp) add("COMPARISON", cmp);
  const entity = (lists.entities ?? []).filter((e) => [e.name, ...(e.forms ?? [])].some((f) => holds(tokens, f))).map((e) => e.name);
  if (entity.length) add("BRAND_OR_ENTITY", entity.join(", "));
  return Object.freeze({ kinds: Object.freeze(kinds.length ? kinds : [UNCLASSIFIED]), intents: Object.freeze(intents), evidence: Object.freeze(evidence) });
}

/**
 * C4 · EQUIVALENT WORDING IN ONE NEED. `grouping`: [{ need, wordings: [text], proposed? }] — the recorded judgement of which wording
 * belongs to which need. Wordings that are the same words (normalForm) are one wording. A wording under two needs refuses the whole
 * grouping. Every phrase ends in exactly one need, or in "no need yet" by name. 🔴 A group is not a page and proposes none.
 */
export function groupPhrases({ phrases = [], grouping = [], on }) {
  const needOf = new Map(), twice = new Set();
  for (const g of Array.isArray(grouping) ? grouping : []) for (const w of Array.isArray(g?.wordings) ? g.wordings : []) {
    const k = normalForm(w);
    if (!present(g?.need) || !k) continue;
    if (needOf.has(k) && needOf.get(k) !== g.need) twice.add(k);
    needOf.set(k, g.need);
  }
  if (twice.size) return Object.freeze({ groups: Object.freeze([]), refused: Object.freeze([...twice].sort().map((w) => Object.freeze({ code: REFUSAL.TWO_NEEDS, wording: w }))), assigned: 0, noNeedYet: 0 });
  const proposed = new Set((Array.isArray(grouping) ? grouping : []).filter((g) => g?.proposed === true).map((g) => g.need));
  const byNeed = new Map();
  for (const p of phrases) {
    const k = normalForm(p.phrase), need = needOf.get(k) ?? NO_NEED_YET;
    const g = byNeed.get(need) ?? { wordings: new Set(), phraseIds: [] };
    g.wordings.add(k); g.phraseIds.push(p.phrase_id);
    byNeed.set(need, g);
  }
  const groups = [...byNeed].sort(([a], [b]) => (a < b ? -1 : 1)).map(([need, g]) => Object.freeze({ record_type: GROUP_RECORD, measurement_key: `${GROUP_RECORD}:${hash([need, [...g.phraseIds].sort()])}`, group_id: hash([need, [...g.phraseIds].sort()]), recorded_at: `${on}T00:00:00Z`,
    need, state: need === NO_NEED_YET ? NO_NEED_YET : proposed.has(need) ? "A NEED PROPOSED BY THE GROUPING — not a page, not a page candidate" : "A RECORDED NEED", wordings: g.wordings.size, phrases: g.phraseIds.length, phraseIds: Object.freeze([...g.phraseIds].sort()) }));
  const none = byNeed.get(NO_NEED_YET)?.phraseIds.length ?? 0;
  return Object.freeze({ groups: Object.freeze(groups), refused: Object.freeze([]), assigned: phrases.length - none, noNeedYet: none });
}

/**
 * C6 · the LIVE part of each source, from what was handed in — never from a credential: MEASURED (with what), or NOT MEASURED with the
 * owner's own step named. (a) and (e) are measured when a hand-in was accepted; (b) when a stored pull was read.
 */
export function sourceStatus({ counts = {}, freshPull = false, on }) {
  return Object.freeze(Object.keys(SOURCES).map((source) => {
    const n = counts[source] ?? 0;
    const measured = n > 0;
    /* the LIVE part: for the Search Console it is a fresh pull, never the stored one; for the file sources it is the file itself */
    const live = source === "SEARCH_CONSOLE" ? freshPull === true : measured;
    return Object.freeze({ record_type: STATUS_RECORD, measurement_key: `${STATUS_RECORD}:${hash([source, on, n, live])}`, status_id: hash([source, on, n, live]), recorded_at: `${on}T00:00:00Z`, source, letter: SOURCES[source].letter, label: SOURCES[source].label,
      state: measured ? (source === "SEARCH_CONSOLE" && !live ? "MEASURED ON THE STORED PULL" : "MEASURED") : "NOT MEASURED", phrases: n, livePart: live ? "MEASURED" : "NOT MEASURED",
      ...(live ? {} : { ownerStep: OWNER_STEPS[source] ?? "hand in what was seen, as a file in the research batch" }) });
  }));
}

/**
 * [ALL] · THE REAL POPULATION the row must be proved on: source (a) with at least one ACCEPTED run and its phrases, source (e), and
 * source (b) on the stored pull. Fixtures alone never complete it.
 */
export function realPopulation({ counts = {}, runs = [] }) {
  const missing = [];
  if (!((counts.CLIENT_AI_GOOGLE ?? 0) > 0 && runs.some((r) => r?.record_type === RUN_RECORD && r.verdict === "ACCEPTED" && r.phrasesKept > 0))) missing.push("source (a): no accepted run of the client's own AI holds a phrase");
  if (!((counts.PERSON_SEEN ?? 0) > 0)) missing.push("source (e): no phrase a person saw is held");
  if (!((counts.SEARCH_CONSOLE ?? 0) > 0)) missing.push("source (b): the stored pull holds no query of this tenant");
  return Object.freeze({ state: missing.length ? "INCOMPLETE" : "COMPLETE", missing: Object.freeze(missing) });
}

/** [ALL] · the row is PROVED only when every clause is PROVED and the real population is COMPLETE. Anything else is NOT PROVED, by name. */
export function rowVerdict({ clauses = {}, population = null }) {
  const open = ["C1", "C2", "C3", "C4", "C5", "C6"].filter((c) => clauses[c] !== "PROVED");
  const real = population?.state === "COMPLETE";
  return Object.freeze({ verdict: open.length === 0 && real ? "PROVED" : "NOT PROVED", open: Object.freeze(open), realPopulation: real ? "COMPLETE" : "INCOMPLETE" });
}

export { SOURCES, LABELS, CLIENT_AI_POLICY, NOT_REPORTED, NO_NEED_YET, UNCLASSIFIED, OWNER_STEPS };
