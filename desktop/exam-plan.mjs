/**
 * 🔴 RR-354 (owner, AlmiOET's run on 1.15.7: "the plan must include profession pages (12 OET professions) and country pages (the 10 main OET
 * countries), not only keyword pages … OET for Nurses was mapped to the Pakistan country page") · THE PLAN OF AN EXAM-PREP SITE.
 *   · One page per profession ("OET for Nurses"), one per main country, and topic pages for the rest of the searches — the same need asked
 *     two ways one page. A search for another site, a competitor or the real exam's questions makes no page — said, with why.
 * 🔴 RR-355 (owner, reading the 1.15.8 drafts: "the five checks test only 'does each fact have a source'. They do not test 'is this page good
 * to read'") · EACH PAGE IS A SET OF QUESTIONS, EACH ANSWERED WITH ITS OWN CHECKED FACTS, ABOUT THE PAGE'S OWN TOPIC:
 *   · a COUNTRY page has the owner's five things, in this order: the fee in that country's money (ONE exchange-rate service for every page,
 *     the official fee beside it — never a central bank's page), the questions people there ask with their answers, its test centres, each
 *     profession's council there, a rule of its own; then, where its regulators accept the test, the score each asks;
 *   · a PROFESSION page: the score each council asks of that profession (country by country), what the Writing letter is for it, its own
 *     questions;
 *   · a TOPIC page (a sub-test, the fee, results, booking, taking it online): the subject's OWN facts about that topic only — a Reading page
 *     about Reading, never another country's Listening score.
 *   · Every fact's text is cleaned of research notes first (desktop/page-quality.mjs cleanFact); a rate from a central bank is never used.
 * Facts come ONLY from checked sources: the owner's facts file (VERIFIED facts), AlmiWorld's country facts (shown facts only) and the
 * subject's own pages (desktop/subject-facts.mjs). Pure.
 */
import { PEOPLE_WORD, inCountry } from "./recognition.mjs";
import { countriesIn } from "./world.mjs";
import { professionIn } from "./page-plan.mjs";
import { CURRENCY_OF } from "./rates.mjs";
import { cleanFact, centralBankLink, SUBTESTS, plainScores } from "./page-quality.mjs";
import { openOf, ledgerOf, STANDARD, TOPIC_ANSWERS } from "./research.mjs"; // RR-356
import { KIND, TYPE_OF_KIND, STANDING, unclearWhy, clearQuestion, askedHere, itemForAsked, coreMissingOfPlan, ownClaims, mergeWhy } from "./page-types.mjs"; // RR-362: R3, R5, R6

const STOP = new Set(["the", "a", "an", "for", "of", "in", "to", "and", "or", "is", "what", "how", "my", "your", "with", "on", "at", "about", "do", "does", "i", "you"]);
const SAME = { examination: "exam", exams: "exam", test: "exam", tests: "exam", english: "exam", occupational: "exam", practise: "practice", mock: "practice", preparation: "practice", prep: "practice", sample: "practice", results: "result", score: "result", scores: "result", centre: "centre", centres: "centre", center: "centre", centers: "centre", venue: "centre", venues: "centre", fees: "fee", cost: "fee", costs: "fee", price: "fee", registration: "book", register: "book", booking: "book", dates: "date", schedule: "date" };
const words = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
/** the need a search asks, without the subject's own name and the words every search of it shares */
export const needOf = (text, subject) => { const sub = new Set(words(subject)); const w = [...new Set(words(text).filter((x) => !STOP.has(x) && !sub.has(x)).map((x) => SAME[x] ?? x))].filter((x) => x !== "exam"); return w.sort().join(" "); };

/* a search for ANOTHER site, or for the real exam's own questions: no page of ours answers it honestly */
const NAVIGATIONAL = /\b(com|org|net|login|log in|sign in|portal|official web ?site|official site|website|global|customer (care|service)|contact)\b|^\S{13,}$/i; // one long word: a site's own name ("occupationalenglishtest")
const COMPETITOR = /\b(e2|e2language|benchmark|swoosh|ieltsliz|magoosh)\b/i;
const EXAM_IP = /\b(recent|real|actual|leaked|previous|past|latest)\b.*\b(questions?|papers?|topics?|letters?|case notes?)\b|\banswers? (key|pdf)\b|\bwriting questions?\b/i;
export function skipWhy(text) {
  if (EXAM_IP.test(text)) return "asks for the real exam's own questions — Visibility never copies or promises them";
  if (COMPETITOR.test(text)) return "a search for another company's product";
  if (NAVIGATIONAL.test(text)) return "people searching this want another website (the official one) — a page of ours would not be what they look for";
  return null;
}

const title = (s) => String(s).replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bOet\b/g, "OET");
const peopleOf = (prof) => PEOPLE_WORD[prof] ?? prof;
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
/* the card a checked fact shows: a piece of its OWN text — "not accepted", a score ("Grade B (350)", "B (350+)", "350"), a fee ("AUD 587") or a
 * count ("22 cities") — with its country; none when its text holds none (never a number typed in) */
const PRICE = /(?:AUD|A\$|AU\$|US\$|USD|GBP|£|EUR|€|PKR|INR|NGN|PHP|SGD|AED|NZD|Rs\.?)\s?\$?\s?\d[\d,]*(?:\.\d+)?/;
const SCORE = /grade\s+[abc]\+?\s*\(\d{3}\+?\)|\b[abc]\+?\s*\(\d{3}\+?\)|\b(?:minimum|at least|score of|min\.?)\s+(?:a\s+)?(?:grade\s+)?[abc]?\+?\s*\(?\d{3}\+?\)?|\b(?:listening|reading|writing|speaking)\s+\d{3}\b|\b\d{4} total\b/i;
export function cardOf(text, country = null) {
  const t = String(text ?? ""), at = (v) => (country ? `${country} — ${v}` : v);
  if (/\b(does not|doesn't|do not|not) accept\b/i.test(t)) return at("OET not accepted");
  /* RR-357: "minimum 350 in Reading, Listening and Speaking; minimum 300 in Writing" is ONE card, every number with its sub-tests */
  const groups = [...t.matchAll(/\b(\d{3})\+?\s+(?:or (?:above|higher)\s+)?in\s+((?:(?:Listening|Reading|Writing|Speaking)(?:\s*,\s*|\s+and\s+)?){1,4})/gi)].map((m) => `${(m[2].match(/Listening|Reading|Writing|Speaking/gi) ?? []).map((x) => x[0].toUpperCase()).join("/")} ${m[1]}`);
  if (groups.length >= 2) return at(groups.join(" · "));
  /* RR-357: "Writing C+ (300), the other three B (350)" is ONE card, both halves kept */
  const odd = /\b(Listening|Reading|Writing|Speaking) ([ABC]\+?) \((\d{3})\), the other three ([ABC]\+?) \((\d{3})\)/.exec(t);
  if (odd) return at(`${odd[1]} ${odd[2]} (${odd[3]}) · others ${odd[4]} (${odd[5]})`);
  /* RR-356: four scores stated together are one card — never "Listening 350" alone for a standard of four */
  const four = /listening\s+(\d{3})\+?,?\s+reading\s+(\d{3})\+?,?\s+writing\s+(\d{3})\+?,?\s+(?:and\s+)?speaking\s+(\d{3})/i.exec(t);
  if (four) return at(`L ${four[1]} · R ${four[2]} · W ${four[3]} · S ${four[4]}`);
  /* a range is the whole range ("180–200 words", never "200 words"; "every 2–3 weeks", never "3 weeks") */
  const m = t.match(SCORE) ?? t.match(PRICE) ?? t.match(/\b\d[\d,]*(?:\s?[–-]\s?\d[\d,]*)?\s(?:cities|venues|centres|centers|countries|minutes|hours|days|weeks|marks|words)\b/i);
  if (!m) return null;
  let v = m[0].replace(/\s+/g, " ").trim(); if (v.endsWith(")") && !v.includes("(")) v = v.slice(0, -1); if (v.includes("(") && !v.includes(")")) v = v.replace(/\s*\(/, " ");
  return at(v.trim());
}
const claimOf = (f, country = null, card = undefined) => ({ claimId: f.claimId ?? f.id, card: card === undefined ? cardOf(f.text, country) : card, text: country ? `In ${inCountry(country)}: ${f.text}` : f.text, link: f.link, readOn: f.readOn ?? f.on, source: `${f.source ?? f.body ?? hostOf(f.link) ?? "its official page"} — its official page`, official: true, body: f.source ?? f.body ?? null, fromCollector: f.fromCollector ?? false });

const SHOWN = new Set(["confirmed", "approved", "edited", "owner"]);
const sourced = (x) => /^https:\/\//.test(x?.source ?? "") && /^\d{4}-\d{2}-\d{2}/.test(x?.readOn ?? "") && SHOWN.has(x?.status ?? "confirmed");
/** AlmiWorld's country facts (the service's packets: shown facts only) → checked lines per country, each with its page and date */
export function serviceFactsOf(packets = {}, subject = null /* RR-359: no default subject */) {
  const out = {};
  for (const [country, p] of Object.entries(packets ?? {})) {
    let n = 0;
    const add = (part, text, source, readOn, extra = {}) => { const t = cleanFact(text); if (!t || !/^https:\/\//.test(source ?? "") || !/^\d{4}-\d{2}-\d{2}/.test(readOn ?? "") || centralBankLink(source)) return; (out[country] ??= []).push({ id: `svc-${part}-${country}-${n++}`, country, part, text: t, link: source, on: String(readOn).slice(0, 10), body: hostOf(source), verified: true, fromCollector: true, ...extra }); };
    /* the fee: only the OFFICIAL fee (its converted amount is made once, by the page, with the one rate service) */
    if (p?.fee && sourced(p.fee) && p.fee.value?.official) add("fee", `${subject}'s own page: the full ${subject} costs ${p.fee.value.official}.`, p.fee.source, p.fee.readOn, { official: p.fee.value.official });
    if (p?.centres && sourced(p.centres)) add("centres", p.centres.value?.venue ? `${subject} can be taken at a test venue in ${inCountry(country)}.` : p.centres.value?.home, p.centres.source, p.centres.readOn);
    for (const [prof, f] of Object.entries(p?.councils ?? {})) if (sourced(f) && f.found !== false && f.value?.name) add("home-council", `${f.value.name} registers ${peopleOf(prof)} in ${inCountry(country)}${/^https?:\/\//.test(f.value.website ?? "") ? ` — ${f.value.website}` : ""}.`, f.source, f.readOn, { profession: prof });
    for (const r of p?.rules ?? []) if (sourced(r) && r.value?.rule) add("rules", r.value.rule, r.source, r.readOn);
    /* the questions people there ask, each with its checked answer — never one that restates the fee in another amount */
    for (const q of p?.questions ?? []) if (sourced(q) && q.value?.question && q.value?.answer && q.value.answerKind === "official" && !/\babout [\d,]{3,} [A-Z]{3}\b|≈/.test(q.value.answer)) add("questions", q.value.answer, q.source, q.readOn, { question: q.value.question });
  }
  return out;
}

/* the subject's own facts (desktop/subject-facts.mjs) a topic is answered with, each fact under the question it answers */
/* {S} the subject, {T} the sub-test of the page (empty on another page) */
const ASK = Object.freeze({
  bookPaperCloses: "When do {S} bookings close?", bookComputerCloses: "When do {S} bookings close?", bookAhead: "How far ahead can I book {S}?", changeFee: "What does changing a {S} booking cost?",
  resultsComputer: "When do {S} results come?", resultsPaper: "When do {S} results come?", results95: "When do {S} results come?", resultsIndia: "When do {S} results come?", resultsPhilippines: "When do {S} results come?",
  scale: "How is {S} {T} scored?", gradeB: "What is grade B in {S}?", benchmarkIelts: "How does {S} compare with IELTS?", practiceEvery: "How often should I take a {S} {T} practice test?",
  listeningMarks: "How is {S} Listening built?", listeningB: "What score is grade B in {S} Listening?", readingMarks: "How is {S} Reading built?", readingPartA: "How is {S} Reading built?", readingB: "What score is grade B in {S} Reading?",
  writingWords: "How long is the {S} Writing task?", writingMinutes: "How long is the {S} Writing task?", writingGradeB: "What is grade B in {S} Writing?", writingTask: "What is the {S} Writing task?",
  speakingRoleplay: "How long is an {S} Speaking role-play?", speakingGradeB: "What is grade B in {S} Speaking?", speakingOtherDay: "When is {S} Speaking taken on computer?",
  remarkFee: "How do I ask for an {S} re-mark?", remarkHours: "How do I ask for an {S} re-mark?",
  listeningGlance: "How long is {S} Listening, and how many questions?", readingGlance: "How long is {S} Reading, and how many questions?", speakingGlance: "How long is {S} Speaking?", writingGlance: "How long is {S} Writing?",
});
const askOf = (k, subject, sub) => String(ASK[k] ?? "What should I know about {S} {T}?").replace("{S}", subject).replace("{T}", sub ?? "").replace(/\s+/g, " ").replace(/\s\?/, "?").replace(/\ba (?=[AEIOU][A-Z])/g, "an ");
/* a question people asked, shown as a question ("can i take oet at home" → "Can i take oet at home?"); a bare search wording is no heading */
const ASKQ = /^(how|what|why|which|where|when|who|is|are|can|does|do|should|will)\b/i;
const asAsked = (q) => { const t = String(q ?? "").trim().replace(/\s+/g, " "); return ASKQ.test(t) ? `${t.charAt(0).toUpperCase()}${t.slice(1).replace(/[?.]*$/, "")}?` : null; };
const TOPIC_FACTS = Object.freeze({
  Listening: ["listeningGlance", "listeningMarks", "listeningB", "scale", "practiceEvery"], Reading: ["readingGlance", "readingMarks", "readingPartA", "readingB", "scale", "practiceEvery"],
  Writing: ["writingGlance", "writingWords", "writingMinutes", "writingGradeB", "practiceEvery"], Speaking: ["speakingGlance", "speakingRoleplay", "speakingGradeB", "speakingOtherDay", "practiceEvery"],
  fee: ["changeFee", "remarkFee", "bookAhead"], result: ["resultsComputer", "results95", "resultsPaper", "resultsIndia", "resultsPhilippines", "scale", "gradeB", "remarkHours"],
  book: ["bookPaperCloses", "bookComputerCloses", "bookAhead", "changeFee"], date: ["bookPaperCloses", "bookComputerCloses", "bookAhead", "resultsPaper"],
  online: ["bookAhead", "speakingOtherDay", "resultsComputer", "bookComputerCloses"], practice: ["practiceEvery", "gradeB", "writingWords", "readingPartA"],
  vs: ["benchmarkIelts", "scale", "gradeB"], what: ["scale", "listeningGlance", "readingGlance", "writingGlance", "speakingGlance", "gradeB", "resultsComputer"],
});
const topicKeyOf = (need, text) => { const w = new Set(String(need).split(" ")); const sub = SUBTESTS.find((s) => new RegExp(`\\b${s}\\b`, "i").test(text)); if (sub) return sub;
  for (const k of ["fee", "result", "book", "date", "practice", "vs"]) if (w.has(k)) return k; if (w.has("online") || w.has("computer") || w.has("home")) return "online"; if (w.has("ielts")) return "vs"; return need ? null : "what"; };
const fromSubject = (f) => ({ claimId: f.claimId, card: cardOf(f.text) ?? null, text: f.text, link: f.link, readOn: f.readOn, source: f.source ?? "its own page", official: true, body: f.body ?? null });
/** the items (questions, each with its own facts) a topic page is made of — only facts about that topic */
function topicItems(key, subjectFacts, subject) {
  const keys = TOPIC_FACTS[key] ?? [], items = new Map();
  for (const k of keys) { const f = subjectFacts?.[k]; if (!f?.text || !/^https?:\/\//.test(f.link ?? "")) continue; const q = askOf(k, subject, SUBTESTS.includes(key) ? key : null);
    (items.get(q) ?? items.set(q, { part: "topic", question: q, claims: [] }).get(q)).claims.push(fromSubject(f)); }
  return [...items.values()];
}

/* the fee in a country's money: the official fee, and the amount by the ONE exchange-rate service (its name and day beside it) */
export function localFee({ official, country, rates }) {
  const m = /(?:AUD|A\$|AU\$)\s?\$?\s?(\d[\d,]*)/.exec(String(official ?? "")); if (!m) return null;
  const aud = Number(m[1].replace(/,/g, "")), cur = CURRENCY_OF[country], r = Number(rates?.rates?.[cur]);
  if (!cur || cur === "AUD") return { currency: "AUD", aud, card: `AUD ${aud} — the official fee`, line: `The full test costs AUD ${aud} — the official fee, paid in Australian dollars.` };
  if (!(r > 0) || !rates?.date) return null;
  const amount = Math.round(aud * r), shown = amount.toLocaleString("en-US"), rate = r >= 10 ? r.toFixed(2) : r.toPrecision(4);
  return { currency: cur, aud, amount, rate, date: rates.date, card: `${cur} ≈ ${shown} (AUD ${aud} official fee · rate from ${rates.short}, ${rates.date} · approximate)`,
    line: `The full test costs AUD ${aud} (the official fee). In ${inCountry(country)} that is about ${cur} ${shown} — converted with ${rates.short}'s rate of ${rates.date} (1 AUD = ${rate} ${cur}). It is approximate: you pay the official fee in AUD.` };
}

/* RR-356 (never filler): boards of one body that state the very same standard ("Medical Board of Australia (via Ahpra). Accepts OET. Tests on/after
 * …", nine times) are ONE line naming each board — the standard said once, its source the first board's page */
export function sameStandard(facts) {
  const split = (t) => { const m = /^(.+?)\.\s+(?:Accepts OET\.\s+)?(.+)$/.exec(String(t)); return m ? { head: m[1].trim(), rest: m[2].trim() } : { head: String(t), rest: null }; };
  const groups = new Map();
  for (const f of facts) { const { head, rest } = split(f.text), k = rest && `${hostOf(f.link)}|${rest}`; if (!k) { groups.set(f.id, [f]); continue; } (groups.get(k) ?? groups.set(k, []).get(k)).push({ ...f, head, rest }); }
  return [...groups.values()].map((g) => (g.length < 2 ? (({ head, rest, ...f }) => f)(g[0]) : { ...g[0], id: `${g[0].id}-same`, text: `${g.map((x) => x.head.replace(/\s*\(via [^)]*\)/i, "")).join(", ")} (each ${/via ([^)]*)\)/i.exec(g[0].head)?.[1] ? `via ${/via ([^)]*)\)/i.exec(g[0].head)[1]}` : "its own board"}) accept OET — ${g[0].rest}` }));
}
/** the facts a page may use: checked, sourced, dated; never a rate fact or a central bank's page (the page converts the fee itself, with the
 *  ONE rate service); each fact's notes taken out, and a fact left with nothing to say dropped */
export const usableFacts = (facts = []) => facts.filter((f) => f.verified && f.text && /^https?:\/\//.test(f.link ?? "") && /^\d{4}-\d{2}-\d{2}/.test(f.on ?? "") && String(f.key ?? "").toLowerCase() !== "rate" && !centralBankLink(f.link))
  .map((f) => ({ ...f, text: plainScores(cleanFact(f.text)) })).filter((f) => f.text.length >= 12);

/**
 * → { pages: [pagePlan entries: { kind, title, profession?, country?, items: [{ part, question, claims }], questions, claims, links, lastChecked,
 *     content? }], skipped: [{ text, why }], existing: [{ text, page }], counts: { profession, country, topic } }
 * `facts` = the facts file's facts plus serviceFactsOf rows; `subjectFacts` = subjectFactsOf (the subject's own pages); `rates` = the one
 * exchange-rate service's day ({ date, rates: { PKR: … }, short, link }); `demand` = [{ text, source, weight }]; `site` = the client's site read.
 */
/* 🔴 RR-360 · `collector` = AlmiSEO Data's page plan ("ready by the rules"), merged here without duplicates (G8): its country pages join the country pages; a country × profession page and a question page are made where their checked answers are here. `maxCountries`: AlmiSEO Data names every country with all its parts. A page keeps at most PAGE_QUESTIONS searches in its ledger, the most searched first, and counts the rest (all the keywords are read; none is dropped from the count) */
export const PAGE_QUESTIONS = 60;
const isLocal = (p) => p.kind === KIND.destination || p.kind === KIND.origin;
const countsOf = (pages, merged) => ({ profession: pages.filter((p) => p.kind === KIND.profession).length, country: pages.filter((p) => p.kind === KIND.country).length, topic: pages.filter((p) => p.kind === KIND.topic).length, destination: pages.filter((p) => p.kind === KIND.destination).length, origin: pages.filter((p) => p.kind === KIND.origin).length, merged: merged.length, improve: pages.filter((p) => p.improve).length });
/* R3: a merged page's facts go into the country page and the profession page: a council, a fee or a good-standing rule to the country; a score or a test rule to the profession, beside that country's score. Its questions stand on the profession page */
function placeFacts(p, A, B) {
  const has = (q, c) => q?.items.some((i) => (i.claims ?? []).some((x) => x.text === c.text));
  for (const it of p.items) for (const c of it.claims ?? []) {
    if (has(A, c) || has(B, c)) continue;
    const toCountry = ["council", "regulator", "fee", "standing"].includes(it.part), target = toCountry ? A ?? B : B ?? A; if (!target) continue;
    const beside = target === B ? B.items.find((i) => (i.claims ?? []).some((x) => x.text.startsWith(`In ${inCountry(p.country)}`))) : A.items.find((i) => i.part === "councils");
    if (beside) beside.claims.push({ ...c, card: null }); else target.items.push({ part: toCountry ? "councils" : `scores${90 + target.items.length}`, question: toCountry ? `Which council registers each profession in ${inCountry(p.country)}?` : it.question, claims: [{ ...c, card: null }] });
  }
  if (B) for (const q of p.questions ?? []) if (!B.questions.some((x) => x.question === q.question) && B.questions.length < PAGE_QUESTIONS) B.questions.push(q);
}
/*
 * 🔴 RR-362 · R3, AFTER THE SEARCHES (a search may bring the question people ask): a C or D page stays a page only when every core question is answered and
 * it says something the country page and the profession page do not. A question people ask counts only when this page answers it, by meaning; their own
 * words then head that answer (G4). Otherwise its facts go into those two and the plan shows "merged". `onlyBefore`: only what no search can bring
 * is judged, so a page that can never be whole costs no search. The client's existing page stays an improve entry (G8). Mutates the plan; → the plan.
 */
export function settleLocal(plan, { onlyBefore = false } = {}) {
  const { countryPages = [], profPages = [] } = plan.bigger ?? {}, keep = [];
  for (const p of plan.pages) {
    if (!isLocal(p) || p.improve) { keep.push(p); continue; }
    const place = p.country, people = [peopleOf(p.profession)], used = new Set();
    p.askedHeads = p.items.filter((it) => /^questions\d*$/.test(it.part)).map((it) => it.question);
    for (const q of (p.questions ?? []).map((x) => x.question ?? x).filter((x) => askedHere(x, { place, people }))) { const it = itemForAsked(q, p.items); if (!it || used.has(it)) continue; used.add(it); it.question = asAsked(q) ?? it.question; p.askedHeads.push(it.question); }
    const A = countryPages.find((x) => x.title === p.home) ?? null, B = profPages.find((x) => x.title === p.prof) ?? null;
    const missing = coreMissingOfPlan(p).filter((m) => !onlyBefore || m.part !== "questions"), own = ownClaims(p, [A, B]);
    const why = mergeWhy({ missing, own }); // a search brings questions, never an answer of its own: a page with nothing of its own costs no search either
    if (!why) { keep.push(p); continue; }
    placeFacts(p, A, B);
    plan.merged.push({ type: p.type, title: p.title, country: place, profession: p.profession, into: [A?.title, B?.title].filter(Boolean), why, missing: missing.map((m) => m.words) });
  }
  plan.pages = keep; plan.counts = countsOf(keep, plan.merged);
  if (!onlyBefore) for (const p of keep.filter(isLocal)) for (const t of [p.home, p.prof]) { const big = [...countryPages, ...profPages].find((x) => x.title === t); if (big) big.links = [...new Set([...(big.links ?? []), p.title])]; }
  return plan;
}
export function examPlan({ subject = null /* RR-359: no default subject */, professions = [], countries = [], facts = [], subjectFacts = {}, rates = null, demand = [], site = null, maxTopics = 10, research = {}, searchedOn = null, collector = [], maxCountries = 10 }) {
  /* a fact is used only when checked, sourced, dated — its notes taken out, a rate from a central bank (or any rate fact) never */
  const ok = usableFacts(facts);
  const cs = [...new Set([...(countries.length ? countries : [...new Set(ok.map((f) => f.country))]).slice(0, maxCountries), /* RR-362 (R3): a country with a council row gets its country page: the merged facts need a home, and a missing part is named (R5) */ ...collector.filter((r) => r.kind === "country" || r.kind === "country-profession").map((r) => r.country)])];
  const join = (page, q) => { page.asked = (page.asked ?? 0) + 1; if (page.questions.length < PAGE_QUESTIONS) page.questions.push(q); };
  const skipped = [], existing = []; let skippedMore = 0;
  const scoreFacts = (f) => f.part === "councils" && f.profession; // a destination regulator's score (the facts file)
  /* PROFESSION pages: the score each council asks (by country) · the Writing letter · its own questions (joined below) */
  /* the questions every candidate shares, answered from the subject's own pages and the official fee */
  const feeFact = ok.find((x) => x.part === "fee" && /oet\.com/.test(x.link) && /AU\$|AUD/.test(x.text));
  const shared = [
    ...(feeFact ? [{ question: `How much does ${subject} cost?`, claims: [{ ...claimOf(feeFact, null), card: null }] }] : []),
    { question: `When do ${subject} results come?`, claims: ["resultsComputer", "resultsPaper"].map((k) => subjectFacts?.[k]).filter((f) => f?.text).map((f) => ({ ...fromSubject(f), card: null })) },
    { question: `When do ${subject} bookings close?`, claims: ["bookPaperCloses", "bookComputerCloses"].map((k) => subjectFacts?.[k]).filter((f) => f?.text).map((f) => ({ ...fromSubject(f), card: null })) },
  ].filter((it) => it.claims.length);
  const profPages = professions.map((prof) => {
    const fx = ok.filter((f) => scoreFacts(f) && f.profession === prof);
    const writing = ["writingGlance", "writingWords", "writingMinutes", "writingGradeB"].map((k) => subjectFacts?.[k]).filter((f) => f?.text);
    /* its own questions: the questions people ask (AlmiWorld's question collector, any country) that name this profession, each with its checked answer */
    const mineQ = [...new Map(ok.filter((f) => f.part === "questions" && asAsked(f.question) && clearQuestion(f.question) /* RR-362 item 19 */ && (professionIn(f.question) === prof || professionIn(f.text) === prof)).map((f) => [f.question.toLowerCase(), { ...f, question: asAsked(f.question) }])).values()].slice(0, 4);
    /* RR-356 · THE RESEARCH ENGINE's answers (desktop/research.mjs): one score per main destination the exam owner's list names, each
     * answered from the checked facts, by meaning, or from its regulator's own page — the rest named as open questions */
    const qs = research[prof] ?? null;
    if (qs) { const w = qs.find((q) => q.kind === "writing"); if (w && writing.length) { w.answer = writing.map((f) => ({ fact: f })); w.how = `${subject}'s own Writing page`; w.searched = [{ body: `${subject}'s own Writing page`, on: String(searchedOn ?? "").slice(0, 10) || null, found: true }]; } }
    const scoreClaims = qs ? qs.filter((q) => q.kind === "score" && q.answer).flatMap((q) => q.answer.map((a) => ({ claimId: a.connected ? `conn-${prof}-${q.country}`.replace(/\s+/g, "-") : a.fact.claimId ?? a.fact.id, card: cardOf(a.fact.text, /^In (?:the )?(.+?)(?: \((?:state board|provincial college)\))?:/.exec(a.text)?.[1] ?? q.country) /* the place of the body that answered */, text: plainScores(cleanFact(a.text)), link: a.fact.link, readOn: a.fact.readOn ?? a.fact.on, source: `${a.fact.source ?? hostOf(a.fact.link) ?? "its official page"} — its official page`, official: true })))
      : fx.map((f) => claimOf(f, f.country));
    /* RR-356: each main destination its own question — its council, its score, its source and date */
    const scoreItems = qs ? [...qs.filter((q) => q.kind === "score" && q.answer).map((q, i) => ({ part: `scores${i}`, question: q.question, claims: scoreClaims.filter((c) => c.text.startsWith(`In ${inCountry(q.country)}`)) })).filter((it) => it.claims.length),
      /* RR-357: accepted there, but its page ties no score to a sub-test — said with its page linked, never a number; the question stays open */
      ...qs.filter((q) => q.kind === "score" && !q.answer && q.partial).map((q, i) => ({ part: `scores${60 + i}`, question: q.question, claims: [{ claimId: `partial-${prof}-${q.country}`.replace(/\s+/g, "-"), card: null, text: q.partial.text, link: q.partial.link, readOn: q.partial.on, source: `${q.partial.source} — its official page`, official: true }] }))] : null;
    const items = [...(scoreItems ?? [{ part: "scores", question: `What ${subject} score does each council ask of ${peopleOf(prof)}?`, claims: scoreClaims }]),
      { part: "writing", question: `What is the ${subject} Writing letter for ${peopleOf(prof)}?`, claims: writing.map(fromSubject) },
      ...mineQ.map((f, i) => ({ part: `questions${i}`, question: f.question, claims: [claimOf(f, null, null)] })),
      /* R6 (owner: "a profession page answers every need of its audience; shared questions appear on each page"): the fee, the results, booking */
      ...shared.map((it, i) => ({ ...it, part: `shared${i}` })) /* RR-362: on the page, but not "its own questions" */];
    /* G11 the answer first · G12 a verified comparison — each country's council and the score it asks, from the facts below */
    const answered = qs ? qs.filter((q) => q.kind === "score" && q.answer) : [];
    const content = answered.length ? { answer: `${answered.length} ${answered.length === 1 ? "country's council accepts" : "countries' councils accept"} ${subject} for ${peopleOf(prof)} on their own pages: ${answered.map((q) => inCountry(q.country)).join(", ")}. The score each one asks is below, with its official page and the day it was checked.`,
      table: [["Country", "Council", "What it asks"], ...answered.map((q) => [q.country, q.regulator.short ?? q.regulator.name, (cardOf(q.answer[0].fact.text, null) ?? "see its page").replace(/^[A-Za-z ]+ — /, "")])] } : null;
    return { kind: "profession", profession: prof, title: `${subject} for ${title(peopleOf(prof))}`, questions: [], items, content, ...(qs ? { open: openOf(qs), ledger: ledgerOf(qs) } : {}) };
  });
  /* COUNTRY pages: the five things, in the owner's order */
  const plannedQ = new Set(collector.filter((r) => r.kind === "question").map((r) => String(r.question).toLowerCase()));
  const countryPages = cs.map((c) => {
    const mine = ok.filter((f) => f.country === c), feeFacts = mine.filter((f) => f.part === "fee");
    const officialOf = (f) => f.official ?? (/(?:AU\$|AUD\s?\$?|A\$)\s?(\d{3,4})/.exec(f.text) ? `AUD ${/(?:AU\$|AUD\s?\$?|A\$)\s?(\d{3,4})/.exec(f.text)[1]}` : null);
    const feeSrc = feeFacts.find((f) => /oet\.com/.test(f.link) && officialOf(f)) ?? feeFacts.find(officialOf);
    const lf = feeSrc ? localFee({ official: officialOf(feeSrc), country: c, rates }) : null;
    const feeClaim = lf ? { claimId: `fee-${c}`, card: lf.card, text: lf.line, link: feeSrc.link, readOn: feeSrc.on, source: `${hostOf(feeSrc.link)} — the official fee; the rate: ${rates?.short ?? "—"} (${rates?.link ?? ""})`, official: true } : null;
    const other = [subjectFacts?.changeFee, subjectFacts?.remarkFee].filter((f) => f?.text).map((f) => ({ ...fromSubject(f), card: null }));
    const items = [
      { part: "fee", question: `How much does ${subject} cost in ${inCountry(c)}?`, claims: feeClaim ? [feeClaim, ...other] : [] },
      /* RR-362 item 19: only clear questions on this page's topic; a question the collectors planned a page for stands here (R3), first */
      ...mine.filter((f) => f.part === "questions" && asAsked(f.question) && clearQuestion(f.question, { place: c })).sort((a, b) => plannedQ.has(String(b.question).toLowerCase()) - plannedQ.has(String(a.question).toLowerCase())).slice(0, 8).map((f, i) => ({ part: `questions${i}`, question: asAsked(f.question), claims: [claimOf(f, null, null)] })),
      { part: "centres", question: `Where can I take ${subject} in ${inCountry(c)}?`, claims: (() => { const all = mine.filter((f) => f.part === "centres"), named = all.filter((f) => !f.fromCollector); return (named.length ? named : all).map((f) => claimOf(f, null, null)); })() /* the collector's general "can be taken at a venue" only when nothing names the venues */ },
      { part: "councils", question: `Which council registers each profession in ${inCountry(c)}?`, claims: mine.filter((f) => f.part === "home-council").slice(0, 12).map((f) => claimOf(f, null, null)) },
      { part: "rules", question: `What rules are special to ${inCountry(c)}?`, claims: [...new Map(mine.filter((f) => f.part === "rules").map((f) => [f.text, f])).values()].slice(0, 6).map((f) => claimOf(f, null, null)) },
      { part: "scores", question: `What ${subject} score do the councils in ${inCountry(c)} ask?`, claims: sameStandard(mine.filter(scoreFacts)).map((f) => claimOf(f, null, cardOf(f.text, null))) },
    ].filter((it) => it.part === "fee" || it.claims.length);
    const table = lf && lf.currency !== "AUD" ? [["What you pay for", "Official fee", `About in ${lf.currency}`], ["The full test (all four sub-tests)", `AUD ${lf.aud}`, `${lf.currency} ${lf.amount.toLocaleString("en-US")}`]] : null;
    return { kind: "country", country: c, title: `${subject} in ${inCountry(c)}: fee, centres and councils`, questions: mine.filter((f) => f.part === "questions" && f.question).map((f) => ({ question: f.question, source: `AlmiWorld's question collector — asked by people in ${inCountry(c)}`, on: f.on })) /* RR-356 G1: their questions are demand evidence */, items, localCurrency: lf?.currency ?? CURRENCY_OF[c] ?? null, content: table ? { table, lastUpdated: rates?.date ?? null } : null };
  });
  /* each search joins the page it is about; the rest are topics, one page per need */
  const askedOfPair = {}, topics = new Map(), sitePages = (site?.pages ?? []).map((p) => ({ url: p.url, need: needOf([p.h1, p.title].filter(Boolean).join(" "), subject) }));
  for (const d of [...demand].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))) {
    const why = skipWhy(d.text); if (why) { if (skipped.length < 300) skipped.push({ text: d.text, why }); skippedMore++; continue; }
    const prof = professionIn(d.text), where = countriesIn(d.text).filter((c) => cs.includes(c));
    if (prof && where.length) (askedOfPair[`${prof}|${where[0]}`] ??= []).push({ question: d.text, source: d.source }); // RR-362: what a C or D page must answer
    if (prof && profPages.some((p) => p.profession === prof)) { join(profPages.find((p) => p.profession === prof), { question: d.text, source: d.source }); continue; }
    if (where.length) { join(countryPages.find((p) => p.country === where[0]), { question: d.text, source: d.source }); continue; }
    const need = needOf(d.text, subject); if (!need && topics.has("")) { join(topics.get(""), { question: d.text, source: d.source }); continue; }
    const own = need && sitePages.find((p) => p.need === need); if (own) { if (existing.length < 300) existing.push({ text: d.text, page: own.url }); continue; }
    const tk = topicKeyOf(need, d.text), mapKey = SUBTESTS.includes(tk) ? `sub:${tk}` : need;
    const t = topics.get(mapKey) ?? { kind: "topic", need, key: tk, title: need ? title(d.text) : `What is ${subject}? The test, its fee and the scores asked`, questions: [], source: d.source };
    if (topics.has(mapKey)) join(t, { question: d.text, source: d.source }); topics.set(mapKey, t);
  }
  /* a TOPIC page: the subject's own facts about its topic only; two topics never carry the same facts (a page with another's facts competes) */
  const used = new Set(), chosen = [...topics.values()].slice(0, maxTopics), itemsOf = new Map();
  /* a sub-test page owns its sub-test's facts: the sub-test topics choose first, the general topics after */
  for (const t of [...chosen].sort((a, b) => SUBTESTS.includes(b.key) - SUBTESTS.includes(a.key))) {
    /* RR-355 (a topic left with one fact is too thin to help): a topic page answers its own questions with every fact of its topic — only its FIRST
     * question must be its own (a page whose first answer is another page's is planned as a section of that page, never a second page) */
    const all = topicItems(t.key, subjectFacts, subject), firstOwn = all.findIndex((it) => it.claims.some((c) => !used.has(c.claimId)));
    const items = firstOwn < 0 ? [] : [all[firstOwn], ...all.filter((_, i) => i !== firstOwn)];
    for (const c of items[0]?.claims ?? []) used.add(c.claimId);
    itemsOf.set(t, items);
  }
  const topicPages = chosen.map((t) => {
    const items = itemsOf.get(t);
    /* the fee topic: the official fee, from the checked facts (its own currency) */
    if (t.key === "fee" || t.key === "what") { const f = ok.find((x) => x.part === "fee" && /oet\.com/.test(x.link) && /AU\$|AUD/.test(x.text)); if (f) items.unshift({ part: "fee", question: `How much does ${subject} cost?`, claims: [claimOf(f, null)] }); }
    return { kind: "topic", topic: t.key, title: t.title, questions: t.questions, items, source: t.source };
  });
  /* 🔴 RR-362 (recipe R3; beta-g, 2 Nov 2026: "OET for Nurses in Australia" and "OET for Doctors in Egypt" had two questions each) · THE COLLECTORS' PLAN, BY TYPE:
   *   a country × profession row is C when a regulator there accepts the exam for this profession (they want to WORK there), else D (they COME FROM there);
   *   it stays a page only with every core question answered and something of its own (settleLocal, after the searches). A question page is never a page
   *   of its own (one answer is thin): it stands on its country page (R3). A row with no checked answer makes no page: counted, with why */
  const localPages = [], merged = [], notBuilt = [];
  const says = (text, link, on, id) => ({ claimId: id.replace(/\s+/g, "-"), card: null, text, link, readOn: on, source: `${hostOf(link) ?? "its official page"} — its official page`, official: true });
  const scoreClaimsOf = (prof, q) => (q?.answer ?? []).map((a) => ({ claimId: a.connected ? `conn-${prof}-${q.country}`.replace(/\s+/g, "-") : a.fact.claimId ?? a.fact.id, card: cardOf(a.fact.text, null), text: plainScores(cleanFact(a.text)), link: a.fact.link, readOn: a.fact.readOn ?? a.fact.on, source: `${a.fact.source ?? hostOf(a.fact.link) ?? "its official page"} — its official page`, official: true }));
  for (const r of collector) {
    if (r.kind === "question") {
      const home = countryPages.find((p) => p.country === r.country), odd = unclearWhy(r.question, { place: r.country });
      merged.push({ type: "question", title: asAsked(r.question) ?? title(r.question), country: r.country, into: home && !odd ? [home.title] : [], why: odd ? `dropped: ${odd}` : "one answer is thin — it stands on its country page" });
      continue;
    }
    if (r.kind !== "country-profession") continue;
    const people = peopleOf(r.profession), dq = (research[r.profession] ?? []).find((q) => q.kind === "score" && q.country === r.country) ?? null, mine = ok.filter((f) => f.country === r.country);
    const council = mine.filter((f) => f.part === "home-council" && f.profession === r.profession), direct = mine.filter((f) => scoreFacts(f) && f.profession === r.profession);
    const isC = Boolean(dq) || direct.length > 0, kind = isC ? KIND.destination : KIND.origin, pageTitle = `${subject} for ${title(people)} ${isC ? "in" : "from"} ${inCountry(r.country)}`, cl = (fs) => fs.map((f) => claimOf(f, null, null));
    let items;
    if (isC) {
      const d = dq?.details ?? null, body = dq?.regulator?.short ?? dq?.regulator?.name ?? "the regulator", id = (w) => `${w}-${r.profession}-${r.country}`, on = d?.on ?? null;
      items = [
        { part: "scores", question: `What ${subject} score does ${body} ask of ${people}?`, claims: dq?.answer ? scoreClaimsOf(r.profession, dq) : sameStandard(direct).map((f) => claimOf(f, null, cardOf(f.text, null))) },
        { part: "regulator", question: `Who registers ${people} in ${inCountry(r.country)}, and how do I register?`, claims: d?.steps && council.length ? [...cl(council), says(`${body}'s own page about applying sets out the registration steps.`, d.steps, on, id("steps"))] : [] },
        { part: "others", question: `Does ${body} accept other English tests?`, claims: d?.others ? [says(d.others.length ? `${body}'s own page also names ${d.others.join(", ")}.` : `${body}'s own page names no other English test.`, d.url, on, id("others"))] : [] },
        { part: "rules", question: `How long does a ${subject} result count for ${body}?`.replace(/\ba (?=[AEIOU][A-Z])/g, "an "), claims: [...(d?.validity ? [says(`${body}'s own page gives ${subject} results a time limit of ${d.validity.n} ${d.validity.unit}.`, d.url, on, id("valid"))] : []), ...(d?.combining ? [says(d.combining.allowed ? `${body}'s own page accepts results from two sittings${d.combining.months ? `, taken within ${d.combining.months} months` : ""}.` : `${body}'s own page asks for all parts of the test in one sitting.`, d.url, on, id("combine"))] : [])] },
      ];
    } else {
      const fees = mine.filter((f) => f.part === "fee"), src = fees.find((f) => f.official) ?? fees[0], lf = src?.official ? localFee({ official: src.official, country: r.country, rates }) : null;
      items = [
        { part: "council", question: `Which council in ${inCountry(r.country)} registers ${people}?`, claims: cl(council) },
        { part: "standing", question: `How do ${people} from ${inCountry(r.country)} prove they are in good standing?`, claims: cl(mine.filter((f) => f.part === "rules" && STANDING.test(f.text)).slice(0, 3)) },
        { part: "destinations", question: `Where do ${people} from ${inCountry(r.country)} go, and what score does each country ask?`, claims: (research[r.profession] ?? []).filter((q) => q.kind === "score" && q.answer).flatMap((q) => scoreClaimsOf(r.profession, q).map((c) => ({ ...c, card: null }))).slice(0, 10) },
        { part: "fee", question: `How much does ${subject} cost in ${inCountry(r.country)}?`, claims: lf ? [{ claimId: `fee-${r.country}-${r.profession}`.replace(/\s+/g, "-"), card: lf.card, text: lf.line, link: src.link, readOn: src.on, source: `${hostOf(src.link)} — the official fee; the rate: ${rates?.short ?? "—"} (${rates?.link ?? ""})`, official: true }] : [] },
      ];
    }
    /* the questions people from here, in this profession, ask — with their checked answer */
    items.push(...mine.filter((f) => f.part === "questions" && asAsked(f.question) && clearQuestion(f.question, { place: r.country }) && professionIn(f.question) === r.profession).slice(0, 4).map((f, i) => ({ part: `questions${i}`, question: asAsked(f.question), claims: [claimOf(f, null, null)] })));
    localPages.push({ kind, type: TYPE_OF_KIND[kind], country: r.country, profession: r.profession, title: pageTitle, questions: [...(askedOfPair[`${r.profession}|${r.country}`] ?? [])], items: items.filter((it) => it.claims.length).map((it) => ({ ...it, claims: it.claims.map((c) => ({ ...c, claimId: `${isC ? "c" : "d"}-${r.profession}-${r.country}-${c.claimId}`.replace(/\s+/g, "-") })) })) /* its own answers: the planner must not read a shared fact as "the same page" (whether it says anything of its own is R3's question, by what it says) */, localCurrency: isC ? null : CURRENCY_OF[r.country] ?? null, content: null, home: countryPages.find((p) => p.country === r.country)?.title ?? null, prof: profPages.find((p) => p.profession === r.profession)?.title ?? null, askedHeads: [] });
  }
  /* a topic page with nothing of its topic is thin (R3): its searches stand on the general page */
  const realTopics = topicPages.filter((p) => p.items.length), bigTopic = realTopics.find((p) => p.topic === "what") ?? realTopics[0] ?? null;
  for (const p of topicPages.filter((x) => !x.items.length)) { if (bigTopic) for (const q of p.questions) join(bigTopic, q); merged.push({ type: "E", title: p.title, into: bigTopic ? [bigTopic.title] : [], why: "no checked fact of its topic yet — its searches stand on a bigger page" }); }
  const pages = [...profPages, ...countryPages, ...realTopics, ...localPages];
  for (const p of localPages) { p.links = [p.home, p.prof].filter(Boolean); p.open = []; p.ledger = []; }
  /* the pages link each other: a profession page its country pages, a country page its profession pages, a topic page the hubs */
  for (const p of profPages) p.links = countryPages.map((c) => c.title);
  for (const p of countryPages) p.links = profPages.filter((x) => x.items.some((it) => it.claims.some((c) => c.text.startsWith(`In ${inCountry(p.country)}:`)))).map((x) => x.title).concat(realTopics.slice(0, 2).map((x) => x.title));
  for (const p of realTopics) p.links = [...countryPages.slice(0, 4), ...profPages.slice(0, 4)].map((x) => x.title);
  for (const p of pages) {
    p.claims = p.items.find((it) => it.claims.length)?.claims ?? [];
    p.lastChecked = p.items.flatMap((it) => it.claims.map((c) => c.readOn)).filter(Boolean).sort().at(-1) ?? null; p.weak = !p.questions.length;
  }
  /* RR-356 · each country and topic page's STANDARD questions (desktop/research.mjs STANDARD): answered by its parts, or open — and its ledger */
  const on = String(searchedOn ?? "").slice(0, 10) || null;
  for (const p of countryPages) {
    const have = new Set(p.items.filter((it) => it.claims.length).map((it) => it.part.replace(/\d+$/, "")));
    const qs = STANDARD.exam.country.map(([k, words]) => ({ question: `${inCountry(p.country)}: ${words}`, answer: have.has(k) ? true : null, how: have.has(k) ? "already in Visibility's checked facts" : null,
      searched: [{ body: "the owner's checked facts file", found: have.has(k) }, { body: "AlmiWorld's country facts", found: have.has(k) }, ...(k === "fee" && rates ? [{ body: `${rates.short}'s rates`, on: rates.date, found: have.has(k) }] : [])].map((s) => ({ ...s, why: s.found ? null : "not stated" })) }));
    p.open = openOf(qs); p.ledger = ledgerOf(qs);
  }
  for (const p of realTopics) {
    const sub = SUBTESTS.includes(p.topic) ? p.topic : null, names = STANDARD.exam.topic[p.topic] ?? [];
    const qs = names.map((n) => { const keys = TOPIC_ANSWERS[n]?.(sub ?? "") ?? [], got = keys.some((k) => (k === "fee" ? p.items.some((it) => it.part === "fee") : Boolean(subjectFacts?.[k]))); return { question: `${sub ? `${subject} ${sub}` : p.title}: ${n}`, answer: got ? true : null, how: got ? `${subject}'s own pages` : null, searched: [{ body: `${subject}'s own pages`, on, found: got, why: got ? null : "not stated there" }] }; });
    p.open = openOf(qs); p.ledger = ledgerOf(qs);
  }
  /* 🔴 RR-356 PART B · IMPROVE, DON'T DUPLICATE (owner): the client's existing page on the same profession, country or topic is improved —
   * never a second page beside it. A page that names a country is that country's page; one that names only a profession is that profession's */
  const own = (site?.pages ?? []).filter((x) => x.url && x.url.replace(/\/$/, "") !== String(site?.origin ?? "").replace(/\/$/, "")).map((x) => { const t = `${x.title ?? ""} ${x.h1 ?? ""}`; return { url: x.url, title: x.h1 || x.title || x.url, country: countriesIn(t)[0] ?? null, profession: professionIn(t) }; });
  for (const p of countryPages) { const e = own.find((x) => x.country === p.country); if (e) p.improve = { url: e.url, title: e.title }; }
  for (const p of profPages) { const e = own.find((x) => !x.country && x.profession === p.profession); if (e) p.improve = { url: e.url, title: e.title }; }
  /* RR-360: the country × profession page the client already has is improved too (G8), never a second page */
  for (const p of localPages) { const e = own.find((x) => x.country === p.country && x.profession === p.profession); if (e) p.improve = { url: e.url, title: e.title }; }
  /* 🔴 RR-362 item 16 (owner's run: /guides/oet-pakistan twice, "13 new questions" then "1 new question"): ONE improve entry per existing page — the bigger page keeps it; a smaller page gives it its facts (R3) */
  for (const p of pages) p.category = "exam"; // its core questions and what it may be about are an exam's
  const byUrl = new Map();
  for (const p of pages.filter((x) => x.improve)) { const had = byUrl.get(p.improve.url); if (!had) { byUrl.set(p.improve.url, p); continue; } const [keep, drop] = isLocal(had) && !isLocal(p) ? [p, had] : [had, p]; byUrl.set(p.improve.url, keep); delete drop.improve; }
  /* R3 before the searches: a C or D page that cannot be whole, whatever a search finds, costs no search */
  return settleLocal({ pages, skipped, skippedTotal: skippedMore, existing, notBuilt, merged, counts: countsOf(pages, merged), bigger: { countryPages, profPages } }, { onlyBefore: true });
}
