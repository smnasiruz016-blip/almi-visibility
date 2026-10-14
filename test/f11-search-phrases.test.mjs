/**
 * F11 · KEYWORD AND SEARCH-LANGUAGE DISCOVERY (acceptance _handoffs d941e18, AlmiVisibility_F11_ACCEPTANCE_2026-10-13.md).
 *
 * Fixtures DRIVE the rules (neutral stand-ins, hand-counted): one firing control per clause — it passes on a lawful hand-in and fails
 * alone, for its own reason. The REAL tests read the declared product's own stored phrase records from its research batch and report
 * counts only — never a phrase. Nothing is fetched; no credential is read; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { RESIGHTING_TYPE } from "../src/evidence/store.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { phraseRecord, clientAiHandIn, daySearchesBefore, searchConsoleRows, bingKeywordResearch, keywordPlannerFile, personSeen, aiSuggestions, freshPhrases, kindsOf, kindListFaults, groupPhrases, sourceStatus,
  realPopulation, rowVerdict, normalForm, phraseKey, REFUSAL, PHRASE_RECORD, RUN_RECORD, GROUP_RECORD, STATUS_RECORD, SOURCES, LABELS, CLIENT_AI_POLICY, NOT_REPORTED, NO_NEED_YET, UNCLASSIFIED, OWNER_STEPS } from "../src/discovery/search-phrase-sources.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailBefore = createHash("sha256").update(readFileSync(TRAIL)).digest("hex");
const CODE = ["src/discovery/search-phrase-sources.mjs", "bin/search-phrases.mjs", "config/discovery/search-phrases.mjs"];
const text = (p) => readFileSync(join(REPO, p), "utf8");
/** code without its comments: what runs, not what explains */
const running = (p) => text(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

/* ── neutral fixtures ── */
const DAY = "2026-09-01";
const search = (n, action, at, over = {}) => ({ n, action, query: "widget", at: `${DAY}T10:${at}Z`, ...over });
const RUN = (over = {}) => ({ runId: "r1", searches: [search(1, "AUTOCOMPLETE", "01:00"), search(2, "RESULTS", "01:25")], stopped: null,
  observations: [{ search: 1, kind: "AUTOCOMPLETE", texts: ["widget fee", "Widget Fee in Atlantis "] }, { search: 2, kind: "PEOPLE_ALSO_ASK", texts: ["How much is a widget?"] }, { search: 2, kind: "PEOPLE_ALSO_SEARCH_FOR", texts: ["widget vs gadget"] }], ...over });
const HANDIN = (over = {}) => ({ source: "CLIENT_AI_GOOGLE", startedBy: { who: "CLIENT", record: "the client's own command" }, notice: { givenAt: `${DAY}T10:00:00Z`, text: "I will search slowly and stop on a captcha." },
  policy: { minPauseSeconds: 20, dailyCap: 30 }, place: "Atlantis", language: "en", date: DAY, runs: [RUN()], ...over });
const verdicts = (h, opts) => clientAiHandIn(h, opts).runs.map((r) => [r.verdict, [...r.refusedFor]]);
const LISTS = { primaryLanguage: "english", places: [{ name: "Atlantis", forms: ["atlantean"] }], entities: [{ name: "Widget", forms: ["wdgt"] }], languageVariants: [{ language: "old-atlantean", markers: ["kwa", "zel"] }] };
const P = (phrase, over = {}) => ({ phrase, language: "english", ...over });

/* ================= C1 ================= */

test("C1 · FIRING CONTROL: every phrase is kept verbatim in one record with its source, kind, place, language and date; the label is the source's alone; a missing field is NOT REPORTED by name; each fault refuses for its own reason", () => {
  const a = clientAiHandIn(HANDIN());
  assert.deepEqual(a.records.map((r) => [r.phrase, r.source, r.label, r.sourceSays, r.kind, r.seed, r.place, r.language, r.date, r.record_type]), [
    ["widget fee", "CLIENT_AI_GOOGLE", "OBSERVED", "client-AI-observed Google", "AUTOCOMPLETE", "widget", "Atlantis", "en", DAY, PHRASE_RECORD],
    ["Widget Fee in Atlantis ", "CLIENT_AI_GOOGLE", "OBSERVED", "client-AI-observed Google", "AUTOCOMPLETE", "widget", "Atlantis", "en", DAY, PHRASE_RECORD],
    ["How much is a widget?", "CLIENT_AI_GOOGLE", "OBSERVED", "client-AI-observed Google", "PEOPLE_ALSO_ASK", "widget", "Atlantis", "en", DAY, PHRASE_RECORD],
    ["widget vs gadget", "CLIENT_AI_GOOGLE", "OBSERVED", "client-AI-observed Google", "PEOPLE_ALSO_SEARCH_FOR", "widget", "Atlantis", "en", DAY, PHRASE_RECORD]], "a phrase was altered, or a record lost a field");
  /* the six sources and their labels: (a) (b) (e) OBSERVED; (c) (d) the source's own report; (f) always INFERRED */
  const b = searchConsoleRows([{ query: "widget price", country: "atl" }, { query: "widget near me" }], { date: DAY });
  const c = bingKeywordResearch({ source: "BING_KEYWORD_RESEARCH", country: "Atlantis", language: "en", retrievedOn: DAY, keywords: [{ Query: "widget shop", Impressions: 40 }] });
  const d = keywordPlannerFile("Keyword Stats 2026\nKeyword\tCurrency\tAvg. monthly searches\nwidget deals\tXTS\t100 – 1K\n\"widget, large\"\tXTS\t10\n", { country: "Atlantis", language: "en", exportedOn: DAY });
  const e = personSeen([{ text: "widget for makers", kind: "AUTOCOMPLETE", query: "widget", observedOn: DAY, place: "Port Atlantis" }]);
  const f = aiSuggestions({ source: "AI_SUGGESTION", date: DAY, suggestions: [{ text: "best widget" }] });
  assert.deepEqual([b, c, d, e, f].map((x) => x.records.map((r) => [r.source, r.label, r.phrase, r.place, r.language])), [
    [["SEARCH_CONSOLE", LABELS.OBSERVED, "widget price", "atl", NOT_REPORTED], ["SEARCH_CONSOLE", LABELS.OBSERVED, "widget near me", NOT_REPORTED, NOT_REPORTED]],
    [["BING_KEYWORD_RESEARCH", LABELS.SOURCE_REPORT, "widget shop", "Atlantis", "en"]],
    [["KEYWORD_PLANNER_FILE", LABELS.SOURCE_REPORT, "widget deals", "Atlantis", "en"], ["KEYWORD_PLANNER_FILE", LABELS.SOURCE_REPORT, "widget, large", "Atlantis", "en"]],
    [["PERSON_SEEN", LABELS.OBSERVED, "widget for makers", "Port Atlantis", NOT_REPORTED]],
    [["AI_SUGGESTION", LABELS.INFERRED, "best widget", NOT_REPORTED, NOT_REPORTED]]]);
  assert.deepEqual([LABELS.SOURCE_REPORT, LABELS.OBSERVED, LABELS.INFERRED], ["THE SOURCE'S OWN REPORT", "OBSERVED", "INFERRED"]);
  assert.deepEqual(Object.values(SOURCES).map((s) => [s.letter, s.label]), [["a", "OBSERVED"], ["b", "OBSERVED"], ["c", "THE SOURCE'S OWN REPORT"], ["d", "THE SOURCE'S OWN REPORT"], ["e", "OBSERVED"], ["f", "INFERRED"]]);
  /* each fault, alone */
  const ok = { text: "widget", kind: "SEEN", date: DAY };
  assert.equal(phraseRecord("PERSON_SEEN", ok).record.phrase, "widget");
  for (const [source, item, code] of [["NEWSPAPER", ok, REFUSAL.UNKNOWN_SOURCE], [undefined, ok, REFUSAL.UNKNOWN_SOURCE], ["PERSON_SEEN", { ...ok, text: "  " }, REFUSAL.NO_PHRASE], ["PERSON_SEEN", { ...ok, text: 7 }, REFUSAL.NO_PHRASE],
    ["PERSON_SEEN", { ...ok, date: undefined }, REFUSAL.NO_DATE], ["PERSON_SEEN", { ...ok, date: "last week" }, REFUSAL.NO_DATE], ["PERSON_SEEN", { ...ok, kind: "KEYWORD_IDEA" }, REFUSAL.KIND],
    ["BING_KEYWORD_RESEARCH", { ...ok, kind: "KEYWORD_IDEA", label: "OBSERVED" }, REFUSAL.LABEL], ["KEYWORD_PLANNER_FILE", { ...ok, kind: "KEYWORD_IDEA", label: "OBSERVED" }, REFUSAL.LABEL], ["AI_SUGGESTION", { ...ok, kind: "SUGGESTION", label: "OBSERVED" }, REFUSAL.LABEL],
    ["PERSON_SEEN", { ...ok, label: "INFERRED" }, REFUSAL.LABEL]]) assert.equal(phraseRecord(source, item).refused, code, `${source} ${JSON.stringify(item)}`);
  assert.deepEqual(aiSuggestions({ source: "AI_SUGGESTION", date: DAY, label: "OBSERVED", suggestions: [{ text: "best widget" }] }).refused.map((x) => x.code), [REFUSAL.LABEL], "an AI suggestion was stored as OBSERVED");
  assert.deepEqual([bingKeywordResearch({ keywords: [] }).refused[0].code, keywordPlannerFile("no header here", {}).refused[0].code, aiSuggestions(null).refused[0].code, clientAiHandIn({ source: "CLIENT_AI_GOOGLE" }).refused[0].code], [REFUSAL.FILE, REFUSAL.FILE, REFUSAL.FILE, REFUSAL.FILE]);
  /* the evidence state follows the label: OBSERVED only for (a) (b) (e); a tool's idea and an AI's suggestion are INFERRED */
  assert.deepEqual([a, b, c, d, e, f].map((x) => evidenceStateOf(x.records[0]).state), ["OBSERVED", "OBSERVED", "INFERRED", "INFERRED", "OBSERVED", "INFERRED"]);
  assert.equal(evidenceStateOf({ ...a.records[0], label: "SEEN ON TV" }).unmapped, true);
});

test("C1 · FIRING CONTROL, ONCE: the same phrase from the same source, kind, place, language and seed is stored once; a change in any of them, or in one character of the phrase, is another observation", () => {
  const one = phraseRecord("PERSON_SEEN", { text: "widget fee", kind: "AUTOCOMPLETE", seed: "widget", place: "Atlantis", language: "en", date: DAY }).record;
  const again = phraseRecord("PERSON_SEEN", { text: "widget fee", kind: "AUTOCOMPLETE", seed: "widget", place: "Atlantis", language: "en", date: "2026-09-02" }).record;
  assert.equal(one.phrase_id, again.phrase_id, "the day made the same observation another one");
  const others = [{ text: "Widget fee" }, { kind: "SEEN" }, { seed: "gadget" }, { place: "Lemuria" }, { language: "fr" }].map((o) => phraseRecord("PERSON_SEEN", { text: "widget fee", kind: "AUTOCOMPLETE", seed: "widget", place: "Atlantis", language: "en", date: DAY, ...o }).record);
  assert.equal(new Set([one, ...others].map((r) => r.phrase_id)).size, 6);
  assert.equal(phraseRecord("CLIENT_AI_GOOGLE", { text: "widget fee", kind: "AUTOCOMPLETE", seed: "widget", place: "Atlantis", language: "en", date: DAY }).record.phrase_id === one.phrase_id, false, "two sources share one record");
  const f = freshPhrases([one], [again, others[0], others[0], others[1]]);
  assert.deepEqual([f.fresh.map((r) => r.phrase_id), f.repeated.length], [[others[0].phrase_id, others[1].phrase_id], 2], "a held or repeated observation was stored again");
  assert.equal(phraseKey(one).length, 24);
});

test("C1 · CENSUS: F11's code names no search-engine address and performs no fetch — it only records what is handed in", () => {
  for (const p of CODE) {
    const code = running(p);
    assert.doesNotMatch(code, /\bfetch\s*\(|\bXMLHttpRequest\b|node:https?|node:net|\bhttps?:\/\/|\bWebSocket\b|child_process/, `${p} reaches the network or another program`);
    assert.doesNotMatch(code, /google\.[a-z]|bing\.com|duckduckgo|yandex/i, `${p} names a search engine's address`);
  }
});

/* ================= C2 ================= */

test("C2 · FIRING CONTROL: a run of the client's own AI is accepted only with a client start, a notice first, every pause at least the declared one, the day's cap kept and a lawful stop — each breach refuses the run alone, and a refused run stores its record and not one phrase", () => {
  const good = clientAiHandIn(HANDIN());
  assert.deepEqual([good.runs.map((r) => [r.verdict, r.refusedFor.length, r.record_type]), good.records.length], [[["ACCEPTED", 0, RUN_RECORD]], 4]);
  /* the run record states the searches used, the cap, the pauses and the stop */
  const rec = good.runs[0];
  assert.deepEqual([rec.searchesUsed, rec.searchesOfTheDay, rec.dailyCap, rec.minPauseSeconds, rec.shortestPauseSeconds, rec.pauses, rec.stopped, rec.startedBy, rec.noticeGivenAt, rec.observationsHandedIn, rec.phrasesKept, rec.place, rec.language, rec.date],
    [2, 2, CLIENT_AI_POLICY.dailyCap, CLIENT_AI_POLICY.minPauseSeconds, 25, 1, "NO", "CLIENT", `${DAY}T10:00:00Z`, 4, 4, "Atlantis", "en", DAY]);
  const refusedAlone = (h, code, opts) => { const r = clientAiHandIn(h, opts); assert.deepEqual([r.runs.map((x) => [x.verdict, [...x.refusedFor]]), r.records.length, r.runs[0].phrasesKept, r.runs[0].record_type], [[["REFUSED", [code]]], 0, 0, RUN_RECORD], code); };
  refusedAlone(HANDIN({ startedBy: { who: "SCHEDULE", record: "a timer" } }), REFUSAL.NOT_CLIENT_STARTED);
  refusedAlone(HANDIN({ startedBy: { who: "CLIENT" } }), REFUSAL.NOT_CLIENT_STARTED);
  refusedAlone(HANDIN({ notice: undefined }), REFUSAL.NO_NOTICE);
  refusedAlone(HANDIN({ notice: { givenAt: `${DAY}T10:01:10Z`, text: "late" } }), REFUSAL.NO_NOTICE);
  refusedAlone(HANDIN({ runs: [RUN({ searches: [search(1, "AUTOCOMPLETE", "01:00"), search(2, "RESULTS", "01:19")] })] }), REFUSAL.PAUSE);
  /* a search still running when the next began: the pause is measured from its END */
  refusedAlone(HANDIN({ runs: [RUN({ searches: [search(1, "AUTOCOMPLETE", "01:00", { until: `${DAY}T10:01:10Z` }), search(2, "RESULTS", "01:25")] })] }), REFUSAL.PAUSE);
  refusedAlone(HANDIN({ policy: { minPauseSeconds: 5, dailyCap: 30 } }), REFUSAL.POLICY);
  refusedAlone(HANDIN({ policy: { minPauseSeconds: 20, dailyCap: 300 } }), REFUSAL.POLICY);
  refusedAlone(HANDIN(), REFUSAL.CAP, { searchesBefore: 29 });
  refusedAlone(HANDIN({ runs: [RUN({ searches: [search(1, "AUTOCOMPLETE", "01:00"), { n: 2, action: "RESULTS", query: "widget", at: null }] })] }), REFUSAL.INCOMPLETE);
  refusedAlone(HANDIN({ runs: [RUN({ observations: [{ search: 9, kind: "AUTOCOMPLETE", texts: ["widget fee"] }] })] }), REFUSAL.ORPHAN);
  refusedAlone(HANDIN({ runs: [RUN({ observations: [{ search: 1, kind: "PEOPLE_ALSO_ASK", texts: ["How much is a widget?"] }] })] }), REFUSAL.ORPHAN);
  /* the stop: at once, the client told, nothing after it */
  const stop = (over) => ({ reason: "CAPTCHA", at: `${DAY}T10:01:26Z`, toldClient: true, ...over });
  const stopped = clientAiHandIn(HANDIN({ runs: [RUN({ stopped: stop(), observations: [{ search: 1, kind: "AUTOCOMPLETE", texts: ["widget fee"] }] })] }));
  assert.deepEqual([stopped.runs[0].verdict, stopped.runs[0].stopped, stopped.records.length], ["ACCEPTED", `CAPTCHA at ${DAY}T10:01:26Z`, 1], "a run that stopped lawfully lost what it saw before the stop");
  refusedAlone(HANDIN({ runs: [RUN({ stopped: stop({ at: `${DAY}T10:01:10Z` }) })] }), REFUSAL.AFTER_STOP);
  refusedAlone(HANDIN({ runs: [RUN({ stopped: stop({ at: `${DAY}T10:01:25Z` }) })] }), REFUSAL.AFTER_STOP);
  refusedAlone(HANDIN({ runs: [RUN({ stopped: stop({ toldClient: false }) })] }), REFUSAL.STOP);
  refusedAlone(HANDIN({ runs: [RUN({ stopped: stop({ reason: "TIRED" }) })] }), REFUSAL.STOP);
  refusedAlone(HANDIN({ runs: [RUN({ stopped: { reason: "UNUSUAL_TRAFFIC", toldClient: true } })] }), REFUSAL.STOP);
});

test("C2 · FIRING CONTROL, THE DAY: runs are judged in the day's order — the pause from the run before counts, the cap is the day's, and a refused run still counts against it", () => {
  const second = RUN({ runId: "r2", searches: [search(3, "AUTOCOMPLETE", "01:40"), search(4, "RESULTS", "02:05")], observations: [{ search: 3, kind: "AUTOCOMPLETE", texts: ["widget dates"] }] });
  assert.deepEqual(verdicts(HANDIN({ runs: [RUN(), second] })), [["ACCEPTED", []], ["REFUSED", [REFUSAL.PAUSE]]], "the pause between two runs was not measured");
  const later = RUN({ runId: "r2", searches: [search(3, "AUTOCOMPLETE", "01:50"), search(4, "RESULTS", "02:15")], observations: [{ search: 3, kind: "AUTOCOMPLETE", texts: ["widget dates"] }] });
  const day = clientAiHandIn(HANDIN({ runs: [RUN({ searches: [search(1, "AUTOCOMPLETE", "01:00"), search(2, "RESULTS", "01:05")] }), later] }));
  assert.deepEqual([day.runs.map((r) => [r.verdict, r.searchesOfTheDay, r.phrasesKept]), day.records.map((r) => r.runId)], [[["REFUSED", 2, 0], ["ACCEPTED", 4, 1]], ["r2"]], "a refused run's phrases were kept, or its searches were not counted");
  const many = (n, id, startMinute) => RUN({ runId: id, searches: Array.from({ length: n }, (_, i) => ({ n: i + 1, action: "AUTOCOMPLETE", query: "widget", at: `${DAY}T${String(11 + Math.floor((startMinute + i) / 60)).padStart(2, "0")}:${String((startMinute + i) % 60).padStart(2, "0")}:00Z` })), observations: [] });
  assert.deepEqual(verdicts(HANDIN({ runs: [many(29, "big", 0), many(2, "over", 30)] })), [["ACCEPTED", []], ["REFUSED", [REFUSAL.CAP]]]);
  /* the cap is the day's across hand-ins: what is already recorded counts, a run of this same hand-in is not counted twice */
  const held = clientAiHandIn(HANDIN({ runs: [many(28, "morning", 0)] })).runs;
  assert.deepEqual([daySearchesBefore(held, HANDIN({ runs: [many(3, "evening", 40)] })), daySearchesBefore(held, HANDIN({ runs: [many(28, "morning", 0)] })), daySearchesBefore(held, HANDIN({ date: "2026-09-02" }))], [28, 0, 0]);
  assert.deepEqual(verdicts(HANDIN({ runs: [many(3, "evening", 40)] }), { searchesBefore: 28 }), [["REFUSED", [REFUSAL.CAP]]]);
});

/* ================= C3 ================= */

test("C3 · FIRING CONTROL: each phrase is sorted into every kind a stated rule decides — head, long-tail, question, local, language variant, intent (named), comparison, brand or entity — and a phrase no rule decides is UNCLASSIFIED", () => {
  const k = (phrase, over) => { const r = kindsOf(P(phrase, over), LISTS); return [[...r.kinds], [...r.intents]]; };
  assert.deepEqual(k("gizmo holder"), [["HEAD"], []]);
  assert.deepEqual(k("small blue gizmo holder"), [["LONG_TAIL"], []]);
  assert.deepEqual(k("gizmo holder strap"), [[UNCLASSIFIED], []], "a phrase no rule decides was given a kind");
  assert.deepEqual(k("How big is it?"), [["LONG_TAIL", "QUESTION"], []]);
  assert.deepEqual(k("is gizmo good"), [["QUESTION"], []]);
  assert.deepEqual(k("gizmo in atlantis today"), [["LONG_TAIL", "LOCAL"], []]);
  assert.deepEqual(k("atlantean gizmo strap"), [["LOCAL"], []]);
  assert.deepEqual(k("gizmo kwa holder"), [["LANGUAGE_VARIANT"], []]);
  assert.deepEqual(k("gizmo holder strap", { language: "old-atlantean" }), [["LANGUAGE_VARIANT"], []]);
  assert.deepEqual(k("gizmo holder strap", { language: NOT_REPORTED }), [[UNCLASSIFIED], []], "a language the source did not report made a variant");
  assert.deepEqual(k("gizmo holder fee"), [["INTENT"], ["fee"]]);
  assert.deepEqual(k("gizmo booking dates"), [["INTENT"], ["booking", "dates"]]);
  assert.deepEqual(k("gizmo vs gadget strap"), [["LONG_TAIL", "COMPARISON"], []]);
  assert.deepEqual(k("wdgt holder strap"), [["BRAND_OR_ENTITY"], []]);
  assert.deepEqual(k("How much is the widget fee in Atlantis?"), [["LONG_TAIL", "QUESTION", "LOCAL", "INTENT", "BRAND_OR_ENTITY"], ["fee"]]);
  assert.equal(kindsOf(P("gizmo in atlantis today"), LISTS).evidence.LOCAL, "Atlantis");
  /* a kind rule reads only a DECLARED list */
  assert.deepEqual([kindListFaults(LISTS), kindListFaults({}), kindListFaults({ ...LISTS, favourites: ["x"] }), kindListFaults({ places: ["Atlantis"] }), kindListFaults(null)], [[], [], [REFUSAL.LISTS], [REFUSAL.LISTS], [REFUSAL.LISTS]]);
  assert.deepEqual([kindsOf(P("gizmo in atlantis today"), { ...LISTS, favourites: ["x"] }).refused, [...kindsOf(P("gizmo in atlantis today"), { ...LISTS, favourites: ["x"] }).kinds]], [REFUSAL.LISTS, []]);
  assert.deepEqual([...kindsOf(P("gizmo in atlantis today"), {}).kinds], ["LONG_TAIL"], "a place nobody declared was found");
});

/* ================= C4 ================= */

test("C4 · FIRING CONTROL: equivalent wording is grouped into ONE need; every phrase ends in exactly one need or in \"no need yet\" by name; a wording under two needs refuses the grouping; a group is never a page", () => {
  const ph = ["widget fee", "Widget Fee!", "widget  FEE", "widget price", "widget dates", "widget song"].map((t, i) => phraseRecord("PERSON_SEEN", { text: t, kind: "SEEN", seed: `s${i}`, date: DAY }).record);
  const grouping = [{ need: "fee", wordings: ["widget fee", "widget price"] }, { need: "dates", wordings: ["Widget dates"], proposed: true }];
  const g = groupPhrases({ phrases: ph, grouping, on: DAY });
  assert.deepEqual(g.groups.map((x) => [x.need, x.wordings, x.phrases, x.record_type]), [[NO_NEED_YET, 1, 1, GROUP_RECORD], ["dates", 1, 1, GROUP_RECORD], ["fee", 2, 4, GROUP_RECORD]], "equivalent wordings were left apart, or a phrase is in no group");
  assert.deepEqual([g.assigned, g.noNeedYet, g.refused.length, NO_NEED_YET], [5, 1, 0, "NO NEED YET"]);
  const homes = new Map(); for (const x of g.groups) for (const id of x.phraseIds) homes.set(id, (homes.get(id) ?? 0) + 1);
  assert.deepEqual([homes.size, [...homes.values()].every((n) => n === 1)], [ph.length, true], "a phrase is in two groups, or in none");
  assert.match(g.groups.find((x) => x.need === "dates").state, /PROPOSED.*not a page, not a page candidate/);
  const twice = groupPhrases({ phrases: ph, grouping: [...grouping, { need: "cost", wordings: ["WIDGET FEE"] }], on: DAY });
  assert.deepEqual([twice.groups.length, twice.refused.map((r) => [r.code, r.wording])], [0, [[REFUSAL.TWO_NEEDS, "widget fee"]]]);
  assert.deepEqual(groupPhrases({ phrases: ph, grouping: [], on: DAY }).groups.map((x) => [x.need, x.phrases]), [[NO_NEED_YET, 6]]);
  assert.equal(normalForm("  Widget-Fee, in ATLANTIS? "), "widget fee in atlantis");
  /* F11 writes four record types and none is a page or a page candidate */
  const types = new Set(CODE.flatMap((p) => [...running(p).matchAll(/record_type: ([A-Z_]+|"[a-z_]+")/g)].map((m) => m[1])));
  assert.deepEqual([...types].sort(), ["GROUP_RECORD", "PHRASE_RECORD", "RUN_RECORD", "STATUS_RECORD"]);
  assert.deepEqual([PHRASE_RECORD, RUN_RECORD, GROUP_RECORD, STATUS_RECORD], ["search_phrase", "search_phrase_run", "search_phrase_group", "search_phrase_source_status"]);
  for (const p of CODE) assert.doesNotMatch(running(p), /page_candidate|pageCandidate|joined_page|page_spec|createPage|build-page|joinPages/, `${p} makes a page`);
});

/* ================= C5 ================= */

test("C5 · FIRING CONTROL: a volume is kept only from a source that itself reports one, as that source's own estimate with its date; nothing is ever called search volume", () => {
  const d = keywordPlannerFile("Keyword,Avg. monthly searches\nwidget deals,100 – 1K\nwidget shop,\n", { country: "Atlantis", language: "en", exportedOn: DAY });
  assert.deepEqual(d.records.map((r) => [r.phrase, r.volume ?? null]), [["widget deals", { estimate: "100 – 1K", whose: "a Keyword Planner file the client exported — a tool's ideas — the source's own estimate", asOf: DAY }], ["widget shop", null]]);
  const c = bingKeywordResearch({ source: "BING_KEYWORD_RESEARCH", country: "Atlantis", language: "en", retrievedOn: DAY, keywords: [{ Query: "widget shop", Impressions: 40 }, { Query: "widget song" }] });
  assert.deepEqual(c.records.map((r) => [r.phrase, r.volume?.estimate ?? null, r.volume?.asOf ?? null, r.volume?.whose ?? null]), [["widget shop", 40, DAY, "Bing Webmaster keyword research — a tool's ideas — the source's own estimate"], ["widget song", null, null, null]]);
  const v = { estimate: 500, asOf: DAY };
  for (const source of ["CLIENT_AI_GOOGLE", "SEARCH_CONSOLE", "PERSON_SEEN", "AI_SUGGESTION"]) assert.equal(phraseRecord(source, { text: "widget", kind: SOURCES[source].kinds[0], date: DAY, volume: v }).refused, REFUSAL.VOLUME_SOURCE, source);
  assert.deepEqual(personSeen([{ text: "widget", observedOn: DAY, volume: v }]).refused.map((x) => x.code), [REFUSAL.VOLUME_SOURCE]);
  for (const bad of [{ estimate: 500 }, { estimate: 500, asOf: "last month" }, { asOf: DAY }, {}]) assert.equal(phraseRecord("KEYWORD_PLANNER_FILE", { text: "widget", kind: "KEYWORD_IDEA", date: DAY, volume: bad }).refused, REFUSAL.VOLUME_DATE, JSON.stringify(bad));
  assert.equal(phraseRecord("KEYWORD_PLANNER_FILE", { text: "widget", kind: "KEYWORD_IDEA", date: DAY }).record.volume, undefined, "a volume was invented");
  /* a count or an order is never a volume: no F11 output or code calls anything search volume */
  for (const p of CODE) assert.doesNotMatch(running(p), /search[\s_-]*volume|searchVolume|popularity|rank(ed|ing)? by/i, `${p} calls something search volume`);
  const g = groupPhrases({ phrases: [...d.records, ...c.records], grouping: [], on: DAY }).groups[0];
  assert.deepEqual(Object.keys(g).filter((key) => /volume|rank|popular/i.test(key)), []);
});

/* ================= C6 ================= */

test("C6 · FIRING CONTROL: a live part with nothing handed in is NOT MEASURED with the owner's own step named — never measured, never skipped; the stored pull is not a fresh pull; no credential is read", () => {
  const none = sourceStatus({ counts: {}, on: DAY });
  assert.deepEqual(none.map((s) => [s.letter, s.state, s.livePart, typeof s.ownerStep === "string" && s.ownerStep.length > 20, s.record_type]), ["a", "b", "c", "d", "e", "f"].map((l) => [l, "NOT MEASURED", "NOT MEASURED", true, STATUS_RECORD]));
  assert.deepEqual(["SEARCH_CONSOLE", "BING_KEYWORD_RESEARCH", "KEYWORD_PLANNER_FILE"].map((s) => none.find((x) => x.source === s).ownerStep), [OWNER_STEPS.SEARCH_CONSOLE, OWNER_STEPS.BING_KEYWORD_RESEARCH, OWNER_STEPS.KEYWORD_PLANNER_FILE]);
  for (const step of Object.values(OWNER_STEPS)) assert.match(step, /client's own/, "an owner step names an account that is not the client's");
  const some = sourceStatus({ counts: { CLIENT_AI_GOOGLE: 9, SEARCH_CONSOLE: 1, PERSON_SEEN: 3 }, on: DAY });
  assert.deepEqual(some.map((s) => [s.letter, s.state, s.livePart, s.phrases, s.ownerStep === undefined]), [["a", "MEASURED", "MEASURED", 9, true], ["b", "MEASURED ON THE STORED PULL", "NOT MEASURED", 1, false], ["c", "NOT MEASURED", "NOT MEASURED", 0, false],
    ["d", "NOT MEASURED", "NOT MEASURED", 0, false], ["e", "MEASURED", "MEASURED", 3, true], ["f", "NOT MEASURED", "NOT MEASURED", 0, false]]);
  assert.deepEqual(sourceStatus({ counts: { SEARCH_CONSOLE: 1 }, freshPull: true, on: DAY }).find((s) => s.letter === "b").livePart, "MEASURED");
  /* no secret is read: the module reads no environment at all; the entry point hands the environment only to the scope and write gates */
  assert.doesNotMatch(running(CODE[0]), /process\.env|\benv\b/, "the module reads the environment");
  assert.doesNotMatch(running(CODE[2]), /process\.env/);
  assert.deepEqual([...running(CODE[1]).matchAll(/[A-Za-z(.: ]{0,22}process\.env[A-Za-z_.\[\]"]*/g)].map((m) => m[0].trim()).sort(), ["env: process.env", "rootIndexFor(process.env"].sort(), "the entry point reads something from the environment by itself");
  for (const p of CODE) assert.doesNotMatch(running(p), /api[_-]?key|apikey|secret|password|bearer|authorization|oauth|credentials?\s*[:=(]/i, `${p} handles a credential`);
});

/* ================= [ALL] ================= */

test("[ALL] · FIRING CONTROL: the row is PROVED only when every clause is PROVED and the real population is complete — source (a) with an accepted run, source (e), and source (b) on the stored pull; fixtures alone never complete it", () => {
  const run = (verdict, kept) => ({ record_type: RUN_RECORD, verdict, phrasesKept: kept });
  const full = { counts: { CLIENT_AI_GOOGLE: 5, PERSON_SEEN: 3, SEARCH_CONSOLE: 1 }, runs: [run("REFUSED", 0), run("ACCEPTED", 5)] };
  assert.deepEqual([realPopulation(full).state, [...realPopulation(full).missing]], ["COMPLETE", []]);
  const missing = (over) => realPopulation({ ...full, ...over });
  assert.match(missing({ counts: { ...full.counts, CLIENT_AI_GOOGLE: 0 } }).missing.join(), /source \(a\)/);
  assert.match(missing({ runs: [run("REFUSED", 0)] }).missing.join(), /source \(a\)/, "phrases with no accepted run completed source (a)");
  assert.match(missing({ runs: [run("ACCEPTED", 0)] }).missing.join(), /source \(a\)/);
  assert.match(missing({ counts: { ...full.counts, PERSON_SEEN: 0 } }).missing.join(), /source \(e\)/);
  assert.match(missing({ counts: { ...full.counts, SEARCH_CONSOLE: 0 } }).missing.join(), /source \(b\)/);
  assert.equal(realPopulation({}).state, "INCOMPLETE");
  const all = { C1: "PROVED", C2: "PROVED", C3: "PROVED", C4: "PROVED", C5: "PROVED", C6: "PROVED" };
  assert.deepEqual([rowVerdict({ clauses: all, population: realPopulation(full) }).verdict, rowVerdict({ clauses: all, population: realPopulation({}) }).verdict, rowVerdict({ clauses: all }).verdict], ["PROVED", "NOT PROVED", "NOT PROVED"]);
  for (const c of Object.keys(all)) assert.deepEqual([rowVerdict({ clauses: { ...all, [c]: "NOT PROVED" }, population: realPopulation(full) }).verdict, [...rowVerdict({ clauses: { ...all, [c]: undefined }, population: realPopulation(full) }).open]], ["NOT PROVED", [c]], c);
});

/* ================= REAL ================= */

const BATCH = "rr254-test-pages-2026-10-12";
const realDir = () => join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
const stored = () => readFileSync(join(realDir(), "search-phrases.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const latest = (rows, type, key) => [...new Map(rows.filter((r) => r.record_type === type).map((r) => [key(r), r])).values()];

test("REAL · C1 C2 · the declared product's stored phrases: every one verbatim against its hand-in, labelled by its source; the live run's record — searches within the cap, every pause at least the declared one, never stopped by a captcha; refused runs kept as records with no phrase", () => {
  const dir = realDir();
  assert.ok(existsSync(join(dir, "search-phrases.jsonl")), "EMPTY real population: the phrase store is not in the research batch");
  const rows = stored(), phrases = rows.filter((r) => r.record_type === PHRASE_RECORD), runs = rows.filter((r) => r.record_type === RUN_RECORD);
  assert.ok(phrases.length > 0 && runs.length > 0, "EMPTY real population");
  for (const r of phrases) {
    assert.ok(Object.hasOwn(SOURCES, r.source) && r.label === SOURCES[r.source].label && SOURCES[r.source].kinds.includes(r.kind), `a stored phrase is not labelled by its source (${r.source})`);
    assert.ok(typeof r.phrase === "string" && r.phrase.trim() !== "" && typeof r.place === "string" && typeof r.language === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date));
    assert.equal(r.volume, undefined, "a volume was stored for a source that reports none");
    assert.equal(evidenceStateOf(r).state, r.label === "OBSERVED" ? "OBSERVED" : "INFERRED");
  }
  assert.equal(new Set(phrases.map((r) => r.phrase_id)).size, phrases.length, "an observation is stored twice");
  /* (a): re-derived here from the hand-in, by the same function — the stored phrases ARE the accepted runs' phrases, verbatim */
  /* RR-264: every day's hand-in, each re-derived on its own day (a day's cap counts only that day's searches) */
  const handIns = readdirSync(join(dir, "phrase-sources")).filter((n) => n.startsWith("client-ai-google-") && n.endsWith(".json")).sort().map((n) => JSON.parse(readFileSync(join(dir, "phrase-sources", n), "utf8")));
  assert.ok(handIns.length > 0, "EMPTY real population: no hand-in of source (a)");
  const agains = handIns.map((h) => clientAiHandIn(h));
  const mine = phrases.filter((r) => r.source === "CLIENT_AI_GOOGLE");
  assert.deepEqual(mine.map((r) => r.phrase_id).sort(), agains.flatMap((a) => a.records.map((r) => r.phrase_id)).sort(), "the stored phrases of source (a) are not what the hand-ins' accepted runs hold");
  const handed = new Set(handIns.flatMap((h) => h.runs.flatMap((run) => run.observations.flatMap((o) => o.texts))));
  for (const r of mine) assert.ok(handed.has(r.phrase), "a stored phrase is not, character for character, a phrase handed in");
  for (const [k, handIn] of handIns.entries()) { const again = agains[k];
  const day = runs.filter((r) => r.date === handIn.date);
  assert.deepEqual(day.map((r) => [r.runId, r.verdict, [...r.refusedFor]]).sort(), again.runs.map((r) => [r.runId, r.verdict, [...r.refusedFor]]).sort());
  const accepted = day.filter((r) => r.verdict === "ACCEPTED"), refusedRuns = day.filter((r) => r.verdict === "REFUSED");
  assert.ok(accepted.length > 0 && accepted.every((r) => r.shortestPauseSeconds >= CLIENT_AI_POLICY.minPauseSeconds && r.stopped === "NO" && r.startedBy === "CLIENT" && r.phrasesKept === r.observationsHandedIn) && accepted.some((r) => r.phrasesKept > 0), "an accepted run broke the declared pace, or dropped a phrase handed in to it");
  assert.ok(Math.max(...day.map((r) => r.searchesOfTheDay)) <= CLIENT_AI_POLICY.dailyCap && day.reduce((n, r) => n + r.searchesUsed, 0) <= 30, "the day's searches exceed the cap");
  assert.ok(refusedRuns.every((r) => r.phrasesKept === 0 && !mine.some((p) => p.runId === r.runId)), "a refused run's phrase was stored");
  }
  /* (e) and (b) */
  const seen = JSON.parse(readFileSync(join(dir, "search-phrases.json"), "utf8"));
  assert.deepEqual(phrases.filter((r) => r.source === "PERSON_SEEN").map((r) => r.phrase).sort(), seen.map((x) => x.text).sort(), "the phrases a person saw are not stored verbatim, each once");
  assert.ok(phrases.filter((r) => r.source === "SEARCH_CONSOLE").length > 0, "source (b): the stored pull gave no query of this tenant");
  const by = (k) => phrases.reduce((m, r) => ((m[r[k]] = (m[r[k]] ?? 0) + 1), m), {});
  console.log(`  REAL (count-only; the declared product's stored phrases): ${JSON.stringify({ phrases: phrases.length, bySource: by("source"), byLabel: by("label"), byKind: by("kind"), runs: runs.map((r) => ({ verdict: r.verdict, refusedFor: r.refusedFor, searches: r.searchesUsed, shortestPause: r.shortestPauseSeconds, kept: r.phrasesKept })), searchesByDay: runs.reduce((m, r) => ((m[r.date] = (m[r.date] ?? 0) + r.searchesUsed), m), {}), cap: CLIENT_AI_POLICY.dailyCap })}`);
});

test("REAL · C3 C4 C6 [ALL] · every stored phrase has its kinds by the declared lists, stands in exactly one need or in \"no need yet\", each source states its live part, and the real population is complete", () => {
  const dir = realDir(), rows = stored();
  const phrases = rows.filter((r) => r.record_type === PHRASE_RECORD);
  const lists = JSON.parse(readFileSync(join(dir, "phrase-kind-lists.json"), "utf8"));
  assert.deepEqual(kindListFaults(lists), []);
  const kinds = {};
  for (const r of phrases) { const k = kindsOf(r, lists); assert.ok(k.kinds.length > 0 && !k.refused); for (const x of k.kinds) kinds[x] = (kinds[x] ?? 0) + 1; }
  /* the grouping, re-derived over the stored phrases from the recorded grouping */
  const g = groupPhrases({ phrases, grouping: JSON.parse(readFileSync(join(dir, "phrase-needs.json"), "utf8")), on: "2026-10-13" });
  assert.deepEqual([g.refused.length, g.assigned + g.noNeedYet], [0, phrases.length]);
  const homes = new Map(); for (const x of g.groups) for (const id of x.phraseIds) homes.set(id, (homes.get(id) ?? 0) + 1);
  assert.ok(homes.size === phrases.length && [...homes.values()].every((n) => n === 1), "a real phrase is in two needs, or in none");
  const storedGroups = latest(rows, GROUP_RECORD, (r) => r.need);
  assert.ok(storedGroups.length > 0 && storedGroups.every((x) => g.groups.some((y) => y.need === x.need)), "a stored group names a need the recorded grouping does not hold");
  /* the store's own re-sighting marks (a record handed in again on a later run) are the store's, never a phrase */
  assert.ok(rows.every((r) => [PHRASE_RECORD, RUN_RECORD, GROUP_RECORD, STATUS_RECORD, RESIGHTING_TYPE].includes(r.record_type)), "the phrase store holds a record that is not F11's — or a page");
  assert.ok(rows.filter((r) => r.record_type === RESIGHTING_TYPE).every((x) => rows.some((r) => r.record_type !== RESIGHTING_TYPE && r.measurement_key === x.measurement_key)), "a re-sighting re-sights no record held in the phrase store");
  const status = latest(rows, STATUS_RECORD, (r) => r.source);
  assert.deepEqual(status.map((s) => s.source).sort(), Object.keys(SOURCES).sort());
  for (const s of status) assert.ok(s.livePart === "MEASURED" || (s.livePart === "NOT MEASURED" && typeof s.ownerStep === "string" && s.ownerStep.length > 20), `${s.source}: a live part is neither measured nor NOT MEASURED with its owner step`);
  const counts = Object.fromEntries(Object.keys(SOURCES).map((s) => [s, phrases.filter((r) => r.source === s).length]));
  const population = realPopulation({ counts, runs: rows.filter((r) => r.record_type === RUN_RECORD) });
  assert.deepEqual([population.state, [...population.missing]], ["COMPLETE", []]);
  console.log(`  REAL (count-only; kinds, needs and sources): ${JSON.stringify({ kinds, groups: g.groups.length, inANeed: g.assigned, noNeedYet: g.noNeedYet, proposedNeeds: g.groups.filter((x) => /PROPOSED/.test(x.state)).length, live: Object.fromEntries(status.map((s) => [s.letter, s.livePart])), realPopulation: population.state })}`);
});

test("NOTHING HERE WROTE THE PRODUCTION TRAIL", () => {
  assert.equal(createHash("sha256").update(readFileSync(TRAIL)).digest("hex"), trailBefore);
});
