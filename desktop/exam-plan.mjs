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
import { asksLine, officeLine, mergeOffices } from "./council-truth.mjs";
import { CURRENCY_OF } from "./rates.mjs";
import { cleanFact, centralBankLink, SUBTESTS, plainScores, ownPart, topicOf as pageTopicOf } from "./page-quality.mjs";
import { openOf, ledgerOf, STANDARD, TOPIC_ANSWERS } from "./research.mjs"; // RR-356
import { coveredResearch } from "./source-links.mjs"; // RR-370 item 3
import { viewsOf } from "./subject-demand.mjs"; // RR-363
import { fitCard, staleNews } from "./truth-checks.mjs"; // RR-363: R15
import { oldWording } from "./subject-facts.mjs"; // RR-363
import { KIND, TYPE_OF_KIND, STANDING, unclearWhy, clearQuestion, askedHere, itemForAsked, coreMissingOfPlan, ownClaims, mergeWhy, questionOffIntentWhy } from "./page-types.mjs"; // RR-362: R3, R5, R6
import { answerQuestion, factAnswer, isTestFormat, SUBTEST_OF, classOfPhrase, phraseOutWhy, shownWording, ASK_OF_CLASS } from "./answer-ladder.mjs"; // RR-366
import { meaningOf } from "./coverage.mjs"; // RR-366
import { intentOfFact, splitOtherFees } from "./fact-intent.mjs"; // RR-370 A
import { OPEN_QUESTION } from "./council-truth.mjs"; // RR-366
import { needClass } from "./truth-checks.mjs"; // RR-366
import { priceHere } from "./truth-prices.mjs";

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
/* RR-363 (R15: summary = fact): whatever short form is found, it keeps the fact's meaning, or the card is the whole sentence */
export const cardOf = (text, country = null) => { const v = shortCard(text, country); return v ? fitCard(v, text) : v; };
export function shortCard(text, country = null) {
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
const claimOf = (f, country = null, card = undefined) => ({ claimId: f.claimId ?? f.id, card: card === undefined ? cardOf(f.text, country) : card, text: country ? `In ${inCountry(country)}: ${f.text}` : f.text, link: f.link, readOn: f.readOn ?? f.on, source: `${f.source ?? f.body ?? hostOf(f.link) ?? "its official page"} — its official page`, official: true, body: f.source ?? f.body ?? null, fromCollector: f.fromCollector ?? false, intent: intentOfFact(f) });

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
    for (const [prof, f] of Object.entries(p?.councils ?? {})) if (sourced(f) && f.found !== false && f.value?.name) add("home-council", `${f.value.name} registers ${peopleOf(prof)} in ${inCountry(country)}${/^https?:\/\//.test(f.value.website ?? "") ? ` — ${f.value.website}` : ""}.`, f.source, f.readOn, { profession: prof, councilName: f.value.name, website: f.value.website ?? null, address: f.value.address ?? null, approved: f.status === "approved" });
    for (const r of p?.rules ?? []) if (sourced(r) && r.value?.rule) add("rules", r.value.rule, r.source, r.readOn, { key: r.key ?? null, ruleProfession: r.profession ?? null }); /* RR-370 A: what it was collected for stays with it */
    /* the questions people there ask, each with its checked answer — never one that restates the fee in another amount */
    for (const q of p?.questions ?? []) if (sourced(q) && q.value?.question && q.value?.answer && q.value.answerKind === "official" && !/\babout [\d,]{3,} [A-Z]{3}\b|≈/.test(q.value.answer)) add("questions", q.value.answer, q.source, q.readOn, { question: q.value.question });
  }
  return out;
}

/* 🔴 RR-366 Part 2: every question the collectors heard from a country, whatever its answer's kind: a question with demand stays and gets its answer (desktop/answer-ladder.mjs). A guidance answer with a source can only ever be shown as a view; one with no source is never shown */
export function askedOf(packets = {}) {
  const out = {};
  for (const [country, p] of Object.entries(packets ?? {})) for (const q of p?.questions ?? []) { if (!q?.value?.question || !SHOWN.has(q.status ?? "confirmed")) continue; (out[country] ??= []).push({ question: q.value.question, kind: q.value.answerKind ?? "none", answer: q.value.answer ?? null, link: /^https:\/\//.test(q.source ?? "") ? q.source : null, on: String(q.readOn ?? "").slice(0, 10) || null }); }
  return out;
}
/* D: how long a result counts is a body's rule: read from that body's own page, it names the body */
export function validityClaimsOf(research = {}, subject = null) {
  const seen = new Set(), out = [];
  for (const qs of Object.values(research ?? {})) for (const q of qs ?? []) { const d = q.details, body = q.regulator?.short ?? q.regulator?.name; if (!d?.validity || !body || !/^https?:/.test(d.url ?? "") || seen.has(body)) continue; seen.add(body); out.push({ claimId: `ladder-valid-${body}`.replace(/\s+/g, "-"), card: null, text: `${body}'s own page gives ${subject} results a time limit of ${d.validity.n} ${d.validity.unit}.`, link: d.url, readOn: String(d.on ?? "").slice(0, 10), source: `${body} — its own page`, official: true, body }); }
  return out.slice(0, 4);
}
/* the subject's own facts (desktop/subject-facts.mjs) a topic is answered with, each fact under the question it answers */
/* {S} the subject, {T} the sub-test of the page (empty on another page) */
const ASK = Object.freeze({
  bookPaperCloses: "When do {S} bookings close?", bookComputerCloses: "When do {S} bookings close?", changeFee: "What does changing a {S} booking cost?", changeFeeComputer: "What does changing a {S} booking cost?",
  resultsComputer: "When do {S} results come?", resultsPaper: "When do {S} results come?", results95: "When do {S} results come?", resultsIndia: "When do {S} results come?",
  scale: "How is {S} {T} scored?", gradeB: "What is grade B in {S}?", benchmarkIelts: "How does {S} compare with IELTS?", practiceEvery: "How often should I take a {S} {T} practice test?",
  listeningMarks: "How is {S} Listening built?", listeningB: "What score is grade B in {S} Listening?", readingMarks: "How is {S} Reading built?", readingPartA: "How is {S} Reading built?", readingB: "What score is grade B in {S} Reading?",
  writingWords: "How long is the {S} Writing task?", writingMinutes: "How long is the {S} Writing task?", writingGradeB: "What is grade B in {S} Writing?", writingTask: "What is the {S} Writing task?",
  speakingRoleplay: "How long is an {S} Speaking role-play?", speakingGradeB: "What is grade B in {S} Speaking?", speakingOtherDay: "When is {S} Speaking taken on computer?",
  remarkFee: "What does an {S} re-mark cost?", remarkHours: "How long do I have to ask for an {S} re-mark?", /* RR-365: a fee never answered "How do I ask?" */
  listeningGlance: "How long is {S} Listening, and how many questions?", readingGlance: "How long is {S} Reading, and how many questions?", speakingGlance: "How long is {S} Speaking?", writingGlance: "How long is {S} Writing?",
});
const askOf = (k, subject, sub) => String(ASK[k] ?? "What should I know about {S} {T}?").replace("{S}", subject).replace("{T}", sub ?? "").replace(/\s+/g, " ").replace(/\s\?/, "?").replace(/\ba (?=[AEIOU][A-Z])/g, "an ");
/* a question people asked, shown as a question ("can i take oet at home" → "Can i take oet at home?"); a bare search wording is no heading */
const ASKQ = /^(how|what|why|which|where|when|who|is|are|can|does|do|should|will)\b/i;
const asAsked = (q) => { const t = String(q ?? "").trim().replace(/\s+/g, " "); return ASKQ.test(t) ? `${t.charAt(0).toUpperCase()}${t.slice(1).replace(/[?.]*$/, "")}?` : null; };
const TOPIC_FACTS = Object.freeze({
  Listening: ["listeningGlance", "listeningMarks", "listeningB", "scale", "practiceEvery"], Reading: ["readingGlance", "readingMarks", "readingPartA", "readingB", "scale", "practiceEvery"],
  Writing: ["writingGlance", "writingWords", "writingMinutes", "writingGradeB", "practiceEvery"], Speaking: ["speakingGlance", "speakingRoleplay", "speakingGradeB", "speakingOtherDay", "practiceEvery"],
  fee: ["changeFee", "changeFeeComputer", "remarkFee"], result: ["resultsComputer", "results95", "resultsPaper", "resultsIndia", "scale", "gradeB", "remarkHours"],
  book: ["bookPaperCloses", "bookComputerCloses", "changeFee", "changeFeeComputer"], date: ["bookPaperCloses", "bookComputerCloses", "resultsPaper", "resultsComputer"],
  online: ["speakingOtherDay", "resultsComputer", "results95", "bookComputerCloses"], practice: ["practiceEvery", "gradeB", "writingWords", "readingPartA"],
  vs: ["benchmarkIelts", "scale", "gradeB"], what: ["scale", "listeningGlance", "readingGlance", "writingGlance", "speakingGlance", "gradeB", "resultsComputer"],
});
const COACHING = /\b(?:coaching|tuition|tutors?|tutoring|classes)\b/i;
const topicKeyOf = (need, text) => { const w = new Set(String(need).split(" ")); const sub = SUBTESTS.find((s) => new RegExp(`\\b${s}\\b`, "i").test(text)); if (sub) return sub;
  /* RR-366 X4: coaching is preparation: a coaching search stands on the preparation page */
  if (COACHING.test(text)) return "practice";
  if (/\bwhich\b[^?]*\bbooks?\b|\bbooks?\b (?:should|to (?:read|buy|study)|for (?:prep|study))/i.test(text)) return "practice"; /* RR-367 item 5: a book to read is preparation, not a booking */
  for (const k of ["fee", "result", "book", "date", "practice", "vs"]) if (w.has(k)) return k; if (w.has("online") || w.has("computer") || w.has("home")) return "online"; if (w.has("ielts")) return "vs"; return need ? null : "what"; };
const fromSubject = (f) => ({ claimId: f.claimId, card: cardOf(f.text) ?? null, text: f.text, link: f.link, readOn: f.readOn, source: f.source ?? "its own page", official: true, body: f.body ?? null, intent: intentOfFact(f) });
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

/* 🔴 R12 (beta-g: "USD ≈ 413" while OET's own page says US$455): a price the official source states in the country's own money is THE price, never converted. Only that country's own money counts ("US$455 applies only in the US" fixes nothing for the Philippines) */
const MONEY_MARK = Object.freeze({ USD: "US\\$|USD", GBP: "£|GBP", EUR: "€|EUR", NZD: "NZ\\$|NZD", CAD: "CA\\$|CAD", SGD: "S\\$|SGD", INR: "₹|INR", PKR: "PKR", AED: "AED", SAR: "SAR", PHP: "₱|PHP", NGN: "₦|NGN" });
export function officialLocalPrice({ facts = [], country, aud = null, subject }) {
  const cur = CURRENCY_OF[country]; if (!cur || cur === "AUD") return null;
  const re = new RegExp(`(?<![A-Za-z])(?:${MONEY_MARK[cur] ?? cur})\\s?(\\d[\\d,]*)([^.;)]*)`);
  for (const f of facts) { if (f.part !== "fee") continue; const said = String(f.quote ?? f.text ?? ""); if (/estimate|≈|about|convert|approximate|\bbank\b|\brate\b/i.test(said)) continue; const m = re.exec(said); if (!m) continue;
    const amount = Number(m[1].replace(/,/g, "")), scope = m[2].replace(/\s+/g, " ").trim().replace(/^applies only\b.*$/i, ""), shown = `${cur} ${amount.toLocaleString("en-US")}`;
    return { currency: cur, aud, amount, official: true, fact: f, scope, card: `${shown}${scope ? ` ${scope}` : ""} — ${subject}'s own price`, line: `${subject}'s own price in ${inCountry(country)} is ${shown}${scope ? ` ${scope}` : ""}.${aud ? ` Any other way of taking it costs AUD ${aud}.` : ""}` }; }
  return null;
}

export { priceHere } from "./truth-prices.mjs"; /* RR-365: a page about the US says the US price */

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
export const usableFacts = (facts = []) => facts.filter((f) => f.verified && f.text && !oldWording(f.text) /* RR-363 */ && !staleNews(f.text) /* R12 */ && /^https?:\/\//.test(f.link ?? "") && /^\d{4}-\d{2}-\d{2}/.test(f.on ?? "") && String(f.key ?? "").toLowerCase() !== "rate" && !centralBankLink(f.link))
  .map((f) => ({ ...f, text: f.corrected ? f.text /* RR-369: the honest line, as written */ : plainScores(cleanFact(f.text)) })).filter((f) => f.text.length >= 12);

/**
 * → { pages: [pagePlan entries: { kind, title, profession?, country?, items: [{ part, question, claims }], questions, claims, links, lastChecked,
 *     content? }], skipped: [{ text, why }], existing: [{ text, page }], counts: { profession, country, topic } }
 * `facts` = the facts file's facts plus serviceFactsOf rows; `subjectFacts` = subjectFactsOf (the subject's own pages); `rates` = the one
 * exchange-rate service's day ({ date, rates: { PKR: … }, short, link }); `demand` = [{ text, source, weight }]; `site` = the client's site read.
 */
/* 🔴 RR-360 · `collector` = AlmiSEO Data's page plan ("ready by the rules"), merged here without duplicates (G8): its country pages join the country pages; a country × profession page and a question page are made where their checked answers are here. `maxCountries`: AlmiSEO Data names every country with all its parts. A page keeps at most PAGE_QUESTIONS searches in its ledger, the most searched first, and counts the rest (all the keywords are read; none is dropped from the count) */
export const PAGE_QUESTIONS = 60;
/*
 * 🔴 RR-363 (R15; the owner's reading of Google's top pages) · THE BLOCKS OF A PAGE FAMILY, from our checked facts only: a topic bar shared by the family, a box to choose your country or profession, the official finder and booking
 * link, tabs per option (paper / computer), numbered steps split by option, practical tips, headings that open their own page, many countries as fold-out sections. A block with no checked fact behind it is left out, never padded.
 */
function familyBlocks({ subject, f = {}, countryPages, profPages, topics, pages }) {
  const fact = (k) => f?.[k] ?? null, say = (x) => String(x.text).replace(/^[^:]{0,40}own page:\s*/i, ""), up = (s) => s.charAt(0).toUpperCase() + s.slice(1), src = (x) => ({ text: up(say(x)), link: x.link, on: x.readOn }), facts = (ks) => ks.map(fact).filter(Boolean);
  const official = fact("bookPaperCloses")?.link ?? null, finder = official ? { label: `Find a test on ${subject}'s own booking page`, href: official } : null;
  const shared = { bar: topics.slice(0, 8).map((t) => t.title), chooser: { groups: [{ label: "Choose your country", links: countryPages.map((p) => ({ text: p.country, title: p.title })) }, { label: "Choose your profession", links: profPages.map((p) => ({ text: p.title.replace(`${subject} for `, ""), title: p.title })) }], finder }, official: official ? { label: `Book on ${subject}'s own site`, href: official } : null };
  for (const p of pages) p.content = { ...(p.content ?? {}), ...shared };
  const OPTIONS = [["On paper at a venue", { "Bookings close": "bookPaperCloses", Results: "resultsPaper", "Results in India and the Philippines": "resultsIndia" }], ["On computer or at home", { "Bookings close": "bookComputerCloses", Results: "resultsComputer", "Most results": "results95" }]];
  const tabs = OPTIONS.map(([label, rows]) => ({ label, rows: Object.entries(rows).filter(([, k]) => fact(k)).map(([what, k]) => ({ what, ...src(fact(k)) })) })).filter((x) => x.rows.length);
  const steps = [["On paper at a venue", ["bookFind", "bookPaper"]], ["On computer or at home", ["bookFind", "bookComputer"]]].map(([label, ks]) => ({ label, steps: facts(ks).map(src) })).filter((x) => x.steps.length >= 2), tips = facts(["tipCard", "tipMinutes", "tipSpam"]).map(src);
  for (const t of topics) {
    if (["book", "date", "result", "online"].includes(t.topic) && tabs.length) t.content.tabs = tabs;
    if (t.topic === "book") { if (steps.length) t.content.stepsBy = steps; if (tips.length) t.content.tips = tips; }
    if (t.topic === "what") t.content.hub = topics.filter((x) => x !== t).map((x) => ({ title: x.title, line: x.items[0]?.question ?? null }));
    if (t.topic === "fee") t.content.foldouts = countryPages.map((c) => ({ label: c.country, title: c.title, lines: c.items.filter((i) => ["fee", "centres"].includes(i.part)).flatMap((i) => i.claims.slice(0, 1)).map((x) => ({ text: up(String(x.text)), link: x.link, on: x.readOn })) })).filter((x) => x.lines.length);
  }
  /* each profession page opens what its country pages say about it: one level deeper */
  for (const p of profPages) p.content.hub = countryPages.filter((c) => c.items.some((i) => i.part === "councils" && i.claims.some((x) => professionIn(x.text) === p.profession))).slice(0, 8).map((c) => ({ title: c.title, line: `Who registers ${peopleOf(p.profession)} in ${inCountry(c.country)}, the fee in local money and the centres.` }));
}
const isLocal = (p) => p.kind === KIND.destination || p.kind === KIND.origin;
const countsOf = (pages, merged) => ({ profession: pages.filter((p) => p.kind === KIND.profession).length, country: pages.filter((p) => p.kind === KIND.country).length, topic: pages.filter((p) => p.kind === KIND.topic).length, destination: pages.filter((p) => p.kind === KIND.destination).length, origin: pages.filter((p) => p.kind === KIND.origin).length, merged: merged.length, improve: pages.filter((p) => p.improve).length });
/* R3: a merged page's facts go into the country page and the profession page: a council, a fee or a good-standing rule to the country; a score or a test rule to the profession, beside that country's score. Its questions stand on the profession page */
function placeFacts(p, A, B) {
  const has = (q, c) => q?.items.some((i) => (i.claims ?? []).some((x) => x.text === c.text));
  for (const it of p.items) for (const c of it.claims ?? []) {
    if (has(A, c) || has(B, c)) continue;
    const toCountry = ["council", "regulator", "fee", "standing"].includes(it.part), target = toCountry ? A ?? B : B ?? A; if (!target) continue;
    /* 🔴 RR-365 (the US page: "about USD 413" stood among the councils, against OET's own US$455): a fee joins the page's fee, a good-standing rule its rules; the page's own fee line is never joined by another page's */
    const home = it.part === "fee" ? "fee" : it.part === "standing" ? "rules" : "councils";
    if (target === A && home === "fee" && /(?:^|-)fee-/.test(String(c.claimId)) && A.items.some((i) => i.part === "fee" && (i.claims ?? []).some((x) => String(x.claimId).startsWith("fee-")))) continue;
    const beside = target === B ? B.items.find((i) => (i.claims ?? []).some((x) => x.text.startsWith(`In ${inCountry(p.country)}`))) : A.items.find((i) => i.part === home);
    const WORDS = { fee: `How much does it cost in ${inCountry(p.country)}?`, rules: `What rules are special to ${inCountry(p.country)}?`, councils: `Which council registers each profession in ${inCountry(p.country)}?` };
    if (beside) beside.claims.push({ ...c, card: null }); else target.items.push({ part: toCountry ? home : `scores${90 + target.items.length}`, question: toCountry ? WORDS[home] : it.question, claims: [{ ...c, card: null }] });
  }
  if (B) for (const q of p.questions ?? []) if (!B.questions.some((x) => x.question === q.question) && B.questions.length < PAGE_QUESTIONS) B.questions.push(q);
}
/*
 * 🔴 RR-362 · R3, AFTER THE SEARCHES (a search may bring the question people ask): a C or D page stays a page only when every core question is answered and
 * it says something the country page and the profession page do not. A question people ask counts only when this page answers it, by meaning; their own
 * words then head that answer (G4). Otherwise its facts go into those two and the plan shows "merged". `onlyBefore`: only what no search can bring
 * is judged, so a page that can never be whole costs no search. The client's existing page stays an improve entry (G8). Mutates the plan; → the plan.
 */
/*
 * 🔴 RR-366 Part 3 (item 29) · A COUNTRY PAGE SPEAKS THE WORDS ITS PEOPLE TYPE: what Google's autocomplete shows in that country (p.localAsked), most typed first. A phrase that asks what a part already answers heads that part, in their wording; another gets its answer from the ladder; none is made up. → each page's localReport
 */
export function applyLocalQuestions(plan, { subject, ctxFor = () => ({}) } = {}) {
  for (const p of plan.pages ?? []) {
    if (p.kind !== KIND.country || !p.localAsked?.length) continue;
    const report = [], classes = new Map(), first = []; let n = 0;
    for (const phrase of p.localAsked) {
      const out = phraseOutWhy(phrase, { country: p.country, subject, skipWhy }); if (out) { report.push({ phrase, used: false, why: out }); continue; }
      const cls = classOfPhrase(phrase, { subject, country: p.country }); if (!cls) { report.push({ phrase, used: false, why: "no verified answer matched it" }); continue; }
      if (classes.has(cls)) { report.push({ phrase, used: false, why: `the same need as "${classes.get(cls)}"` }); continue; }
      const shown = shownWording(phrase, subject, p.country), part = cls === "fee" ? "fee" : cls === "centre" ? "centres" : cls === "accepted" ? "scores" : null; let it = part ? p.items.find((x) => x.part === part && x.claims?.length) : null;
      if (it) { it.question = shown; it.localWording = true; it.askedBefore = true; } else if (!part) { const a = answerQuestion(ASK_OF_CLASS(cls, subject) ?? phrase, { subject, country: p.country, allowHonest: false, ...ctxFor(p) }); if (a?.claims?.length) { it = { part: `questionsa${70 + n++}`, question: shown, claims: a.claims, localWording: true }; p.items.push(it); } }
      /* RR-367 item 4: "oet accepted in usa" with no body's score here: where OET is accepted, from OET's own page */
      if (!it && cls === "accepted") { const a = answerQuestion(`${subject} is accepted in which countries`, { subject, country: p.country, allowHonest: false, ...ctxFor(p) }); if (a?.claims?.length) { it = { part: `questionsa${70 + n++}`, question: shown, claims: a.claims, localWording: true }; p.items.push(it); } }
      if (!it) { report.push({ phrase, used: false, why: "no verified answer matched it" }); continue; }
      classes.set(cls, shown); first.push(it); report.push({ phrase, used: true, shown, source: "Google's autocomplete in this country" });
    }
    /* the fee first (R5), then what people there type, most typed first, then the rest */
    const fee = p.items.filter((x) => x.part === "fee"), rest = p.items.filter((x) => x.part !== "fee" && !first.includes(x));
    p.items = [...fee, ...first.filter((x) => x.part !== "fee"), ...rest]; p.localReport = report;
  }
  return plan;
}
/* 🔴 RR-369 Part 4: a C or D page with no question yet takes real ones: what people asked Google about it (People also ask, related searches, its saved list, autocomplete there), each with a verified answer. None: the page stays, marked (plan.questionsWanted) */
export function applyPairQuestions(plan, { subject, ctxFor = () => ({}) } = {}) {
  const wanted = [], sigOf = (q) => meaningOf(q, { drop: [subject] }).join(" ");
  for (const p of plan.pages ?? []) {
    if (!p.questionsWanted) continue;
    const seen = new Set(); let n = 0;
    for (const raw of [...(p.localAsked ?? []), ...(p.paa ?? []), ...(p.questions ?? []).map((x) => x.question ?? x), ...(p.related ?? [])]) {
      if (n >= 4) break; const q = asAsked(raw); if (!q || unclearWhy(q, { place: p.country }) || questionOffIntentWhy(q, { subject }) || isTestFormat(q, p.country)) continue; const asker = professionIn(q); if (asker && asker !== p.profession) continue; const other = countriesIn(q).filter((c) => c !== p.country); if (other.length) continue; const s = sigOf(q); if (seen.has(s) || p.items.some((it) => sigOf(it.question) === s)) continue; seen.add(s);
      const a = answerQuestion(q, { subject, country: p.country, allowHonest: false, ...ctxFor(p) }); if (!a?.claims?.length) continue; p.items.push({ part: `questionsa${90 + n}`, question: q, claims: a.claims, realQuestion: true }); n++;
    }
    /* RR-369b item 3: what autocomplete brings is mostly a search wording, not a question ("oet physiotherapists nepal fee"): as on a country page, a wording that asks what a verified answer holds takes that answer, in their words */
    for (const phrase of p.localAsked ?? []) { if (n >= 4) break; if (phraseOutWhy(phrase, { country: p.country, subject, skipWhy }) || asAsked(phrase)) continue; const cls = classOfPhrase(phrase, { subject, country: p.country }); if (!cls || seen.has(cls)) continue; const shown = shownWording(phrase, subject, p.country), part = cls === "fee" ? "fee" : cls === "centre" ? "centres" : cls === "accepted" ? "scores" : null, own = part ? p.items.find((x) => x.part === part && x.claims?.length) : null; /* what a part already answers heads that part, in their words, as on a country page */ if (own) { seen.add(cls); own.question = shown; own.localWording = true; own.realQuestion = true; (p.askedHeads ??= []).push(shown); n++; continue; } const a = answerQuestion(ASK_OF_CLASS(cls, subject) ?? phrase, { subject, country: p.country, allowHonest: false, ...ctxFor(p) }); if (!a?.claims?.length) continue; seen.add(cls); p.items.push({ part: `questionsa${90 + n}`, question: shown, claims: a.claims, realQuestion: true, localWording: true }); n++; }
    if (n) { delete p.questionsWanted; delete p.askSeeds; } else wanted.push({ country: p.country, profession: p.profession, title: p.title });
  }
  plan.questionsWanted = wanted;
  return plan;
}
export function settleLocal(plan, { onlyBefore = false } = {}) {
  const { countryPages = [], profPages = [] } = plan.bigger ?? {}, keep = [], same = new Map();
  for (const p of plan.pages) {
    if (!isLocal(p) || p.improve) { keep.push(p); continue; }
    const place = p.country, people = [peopleOf(p.profession)], used = new Set();
    p.askedHeads = p.items.filter((it) => /^questions\d*$/.test(it.part)).map((it) => it.question);
    for (const q of (p.questions ?? []).map((x) => x.question ?? x).filter((x) => askedHere(x, { place, people }))) { const it = itemForAsked(q, p.items); if (!it || used.has(it)) continue; used.add(it); it.q0 ??= it.question /* RR-370 B: the part's own question, if the judge says their words do not fit */; it.question = asAsked(q) ?? it.question; p.askedHeads.push(it.question); }
    /* 🔴 RR-367 R-C (owner, 3 Nov 2026: 181 pages merged into 53 is rejected): a page is its own questions, answers and profession. A fee, an office, a score or a country shared with another page makes it neither weak nor a duplicate, and a gap is researched, never a reason to drop it. Only two pages with the same questions and the same answers, for the same profession and country, are one */
    const sig = `${p.profession}|${p.country}|${p.items.map((it) => `${it.question}=${(it.claims ?? []).map((c) => c.text).sort().join("~")}`).sort().join("|")}`, twin = same.get(sig);
    if (twin) { plan.merged.push({ type: p.type, title: p.title, country: place, profession: p.profession, into: [twin.title], why: `the same questions and the same answers as "${twin.title}", for the same profession and country`, missing: [] }); continue; }
    same.set(sig, p); const own = p.items.filter((it) => /^questions/.test(it.part)).length; p.keptWhy = `its own page for ${people[0]} ${p.type === "C" ? "in" : "from"} ${inCountry(place)}: ${p.items.length} questions answered, ${own} of them asked by these people`; keep.push(p);
  }
  plan.pages = keep; plan.counts = countsOf(keep, plan.merged);
  if (!onlyBefore) for (const p of keep.filter(isLocal)) for (const t of [p.home, p.prof]) { const big = [...countryPages, ...profPages].find((x) => x.title === t); if (big) big.links = [...new Set([...(big.links ?? []), p.title])]; }
  return plan;
}
export function examPlan({ subject = null /* RR-359: no default subject */, professions = [], countries = [], facts = [], subjectFacts = {}, rates = null, demand = [], site = null, maxTopics = 10, research = {}, searchedOn = null, collector = [], maxCountries = 10, asked = {}, ladder = {} }) {
  research = coveredResearch(research);
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
    /* RR-367: a score not found stands as an honest line with the page checked and its date; never searched: still open */
    const gapScores = (qs ?? []).filter((q) => q.kind === "score" && !q.answer && !q.partial).flatMap((q, i) => { const s = (q.searched ?? []).find((x) => x.url && x.on); return s ? [{ part: `scores${80 + i}`, question: q.question, claims: [{ claimId: `gap-score-${prof}-${q.country}`.replace(/\s+/g, "-"), card: null, text: /could not be read|answered \d{3}|robots\.txt|security service/i.test(String(s.why ?? "")) /* RR-368: a page never read is never said to be silent */ ? `${s.body}'s own page could not be read on ${String(s.on).slice(0, 10)}; this is still being looked for.` : `${s.body}'s official page, checked ${String(s.on).slice(0, 10)}, does not say this.`, link: s.url, readOn: String(s.on).slice(0, 10), source: `${s.body} — its official page`, official: true }] }] : []; });
    /* 🔴 RR-369 Part 5: a score never searched yet, and a profession with no question of its own yet: an honest line, and the page stands */
    const scaleOn = String(subjectFacts?.scale?.readOn ?? searchedOn ?? "").slice(0, 10), gapLine0 = (id, text) => (subjectFacts?.scale?.link && scaleOn ? [{ claimId: id.replace(/\s+/g, "-"), card: null, text, link: subjectFacts.scale.link, readOn: scaleOn, source: `${hostOf(subjectFacts.scale.link) ?? "its official page"} — its official page`, official: true, gap: true }] : []);
    const neverRead = (qs ?? []).filter((q) => q.kind === "score" && !q.answer && !q.partial && !(q.searched ?? []).some((x) => x.url && x.on)).flatMap((q, i) => { const c = gapLine0(`gap-open-${prof}-${q.country}`, `${subject}'s official page, checked ${scaleOn}, does not say this. Ask ${q.regulator?.name ?? "the council"} directly.`); return c.length ? [{ part: `scores${120 + i}`, question: q.question, claims: c }] : []; });
    const ownQGap = mineQ.length ? [] : gapLine0(`gap-questions-${prof}`, `${subject}'s official page, checked ${scaleOn}, does not say this. No question from ${peopleOf(prof)} with a checked answer is held yet.`).map((c) => ({ part: "questionsa99", question: `What do ${peopleOf(prof)} ask about ${subject}?`, claims: [c] }));
    const items = [...(scoreItems ?? [{ part: "scores", question: `What ${subject} score does each council ask of ${peopleOf(prof)}?`, claims: scoreClaims }]), ...gapScores, ...neverRead, ...ownQGap,
      { part: "writing", question: `What is the ${subject} Writing letter for ${peopleOf(prof)}?`, claims: writing.map(fromSubject) },
      ...mineQ.map((f, i) => ({ part: `questions${i}`, question: f.question, claims: [claimOf(f, null, null)] })),
      /* R6 (owner: "a profession page answers every need of its audience; shared questions appear on each page"): the fee, the results, booking */
      ...shared.map((it, i) => ({ ...it, part: `shared${i}` })) /* RR-362: on the page, but not "its own questions" */];
    /* G11 the answer first · G12 a verified comparison — each country's council and the score it asks, from the facts below */
    const answered = qs ? qs.filter((q) => q.kind === "score" && q.answer) : [];
    const content = answered.length ? { answer: `${answered.length} ${answered.length === 1 ? "country's council accepts" : "countries' councils accept"} ${subject} for ${peopleOf(prof)} on their own pages: ${answered.map((q) => inCountry(q.country)).join(", ")}. The score each one asks is below, with its official page and the day it was checked.`,
      table: [["Country", "Council", "What it asks"], ...answered.map((q) => [q.country, q.regulator.short ?? q.regulator.name, (cardOf(q.answer[0].fact.text, null) ?? "see its page").replace(/^[A-Za-z ]+ — /, "")])] } : null;
    return { kind: "profession", profession: prof, title: `${subject} for ${title(peopleOf(prof))}`, questions: [], items, content, ...(qs ? { open: openOf(qs).filter((x) => ![...gapScores, ...neverRead].some((g) => g.question === x) && !qs.some((q) => q.question === x && q.partial) /* RR-369 Part 5: accepted there, its page linked, no score tied: that line stands; it blocks nothing */), ledger: ledgerOf(qs) } : {}) };
  });
  /* COUNTRY pages: the five things, in the owner's order */
  const plannedQ = new Set(collector.filter((r) => r.kind === "question").map((r) => String(r.question).toLowerCase()));
  /* 🔴 RR-366 Part 2 + 3: every question heard, its fate said in plain words; a test-format question goes to its topic page */
  const droppedQuestions = [], movedQuestions = [], validity = validityClaimsOf(research, subject), ladderOf = (c, view = null) => ({ subject, country: c, subjectFacts, edge: ladder.edge ?? [], pages: ladder.pages ?? [], extra: { validity }, view });
  const sigOf = (q) => meaningOf(q, { drop: [subject] }).join(" ");
  const countryPages = cs.map((c) => {
    const mine = ok.filter((f) => f.country === c), feeFacts = mine.filter((f) => f.part === "fee");
    const officialOf = (f) => f.official ?? (/(?:AU\$|AUD\s?\$?|A\$)\s?(\d{3,4})/.exec(f.text) ? `AUD ${/(?:AU\$|AUD\s?\$?|A\$)\s?(\d{3,4})/.exec(f.text)[1]}` : null);
    const feeSrc = feeFacts.find((f) => /oet\.com/.test(f.link) && officialOf(f)) ?? feeFacts.find(officialOf);
    const converted = feeSrc ? localFee({ official: officialOf(feeSrc), country: c, rates }) : null, ownPrice = officialLocalPrice({ facts: ok, country: c, aud: converted?.aud ?? null, subject }), lf = ownPrice ?? converted;
    const feeClaim = ownPrice ? { claimId: `fee-${c}`, card: lf.card, text: lf.line, link: ownPrice.fact.link, readOn: ownPrice.fact.on, source: `${hostOf(ownPrice.fact.link)} — its own price`, official: true } : lf ? { claimId: `fee-${c}`, card: lf.card, text: lf.line, link: feeSrc.link, readOn: feeSrc.on, source: `${hostOf(feeSrc.link)} — the official fee; the rate: ${rates?.short ?? "—"} (${rates?.link ?? ""})`, official: true } : null;
    const other = [subjectFacts?.changeFee, subjectFacts?.changeFeeComputer, subjectFacts?.remarkFee].filter((f) => f?.text).map((f) => ({ ...fromSubject(f), card: null, text: priceHere(f.text, c) }));
    const items = [
      { part: "fee", question: `How much does ${subject} cost in ${inCountry(c)}?`, claims: feeClaim ? [feeClaim, ...other] : [] },
      /* RR-362 item 19: only clear questions on this page's topic; a question the collectors planned a page for stands here (R3), first */
      ...(() => { const page = `${subject} in ${inCountry(c)}`, seen = new Set(), keep = [], say = (question, why) => droppedQuestions.push({ page, question, why });
        const rows = [...mine.filter((f) => f.part === "questions").map((f) => ({ question: f.question, fact: f })), ...(asked[c] ?? []).filter((r) => r.kind !== "official").map((r) => ({ question: r.question, view: r.link && r.answer ? { answer: r.answer, link: r.link, on: r.on } : null }))];
        for (const r of rows) { const q = asAsked(r.question); if (!q) { say(r.question, "it is a search wording, not a question: the page's own parts answer it"); continue; } const why = unclearWhy(q, { place: c }) ?? questionOffIntentWhy(q, { subject }); if (why) { say(q, why); continue; } const sig = sigOf(q); if (seen.has(sig)) { say(q, "the same question is already on this page"); continue; } seen.add(sig); if (isTestFormat(q, c)) { movedQuestions.push({ ...r, question: q, from: page, country: c }); continue; } keep.push({ ...r, question: q }); }
        const ordered = keep.sort((a, b) => plannedQ.has(String(b.question).toLowerCase()) - plannedQ.has(String(a.question).toLowerCase()) || viewsOf(b.question, subject) - viewsOf(a.question, subject)); let n = 0;
        return ordered.flatMap((r, i) => { if (n >= 8) { say(r.question, "this page already carries its eight questions; those people ask most came first"); return []; } if (r.fact) { n++; return [{ part: `questions${i}`, question: r.question, claims: [claimOf(r.fact, null, null)] }]; } const a = answerQuestion(r.question, ladderOf(c, r.view)); if (!a?.claims?.length) { say(r.question, "no verified answer, and no official page read to point at"); return []; } n++; return [{ part: `questionsa${i}`, question: r.question, claims: a.claims, ladderStep: a.step }]; }); })(),
      /* 🔴 RR-366 Part 4: the result answer is whole: both ways of taking the test, from the official page; India's and the Philippines' own 5 days first */
      ...(() => { const a = factAnswer(`How long does it take to get ${subject} results?`, { subjectFacts, country: c }); return a ? [{ part: "results", question: `How long does it take to get ${subject} results?`, claims: a.claims }] : []; })(),
      { part: "centres", question: `Where can I take ${subject} in ${inCountry(c)}?`, claims: (() => { const all = mine.filter((f) => f.part === "centres"), named = all.filter((f) => !f.fromCollector); const held = (named.length ? named : all).map((f) => claimOf(f, null, null)); return !held.length && subjectFacts?.bookFind?.text /* RR-367: no venue named yet: the official finder, for every country */ ? [{ ...fromSubject(subjectFacts.bookFind), text: `To find a test venue in ${inCountry(c)}, use Find a test on ${subject}'s booking page.`, card: null }] /* R12: old news left: the official finder; said in its own words: the booking question says the same steps */ : held; })() /* the collector's general "can be taken at a venue" only when nothing names the venues */ },
      { part: "councils", question: `Which council registers each profession in ${inCountry(c)}?`, claims: [...Object.entries(research ?? {}).flatMap(([prof, qs]) => (mine.some((f) => f.part === "home-council" && f.profession === prof) ? [] : (qs ?? []).filter((q) => q.kind === "score" && q.country === c && q.answer?.length && q.regulator && !/^an? /i.test(q.regulator.name ?? "")).slice(0, 1).map((q) => { const a = q.answer[0].fact; /* RR-367 R-A: the body whose own page gave the score is shown as this profession's office: where a council list had no row */ return { claimId: `office-${prof}-${c}`.replace(/\s+/g, "-"), card: null, text: (q.answer[0].text ?? a.text) ? asksLine({ name: q.regulator.name ?? q.regulator.short, people: peopleOf(prof), scoreText: q.answer[0].text ?? a.text }) /* RR-369: its own page gives the score: said plainly */ : officeLine({ name: q.regulator.name ?? q.regulator.short, people: peopleOf(prof), place: inCountry(c) }), link: a.link, readOn: a.on ?? a.readOn, source: `${q.regulator.short ?? q.regulator.name} — its official page`, official: true }; }))), ...mine.filter((f) => f.part === "home-council").map((f) => claimOf(f, null, null))].slice(0, 12) },
      { part: "openCouncils", question: OPEN_QUESTION(inCountry(c)), claims: mine.filter((f) => f.part === "open-council").slice(0, 12).map((f) => claimOf(f, null, null)) },
      { part: "rules", question: `What rules are special to ${inCountry(c)}?`, claims: [...new Map(mine.filter((f) => f.part === "rules").map((f) => [f.text, f])).values()].slice(0, 6).map((f) => claimOf(f, null, null)) },
      { part: "scores", question: `What ${subject} score do the councils in ${inCountry(c)} ask?`, claims: sameStandard(mine.filter(scoreFacts)).map((f) => claimOf(f, null, cardOf(f.text, null))) },
    ].filter((it) => it.part === "fee" || it.claims.length);
    /* 🔴 RR-369 Part 5: a part still missing is an honest line with the page checked and its date, and the page stands; never invented */
    if (!items.some((it) => /^questions/.test(it.part) && it.claims.length) && subjectFacts?.scale?.link) { const on = String(subjectFacts.scale.readOn ?? searchedOn ?? "").slice(0, 10); items.push({ part: "questionsa99", question: `What do people in ${inCountry(c)} ask about ${subject}?`, claims: [{ claimId: `gap-questions-${c}`.replace(/\s+/g, "-"), card: null, text: `${subject}'s official page, checked ${on}, does not say this. No question from people in ${inCountry(c)} with a checked answer is held yet.`, link: subjectFacts.scale.link, readOn: on, source: `${hostOf(subjectFacts.scale.link) ?? "its official page"} — its official page`, official: true, gap: true }] }); }
    const table = ownPrice ? [["What you pay for", "Official price"], [ownPrice.scope ? ownPrice.scope.replace(/^for\s+/i, "") : "The full test", `${ownPrice.currency} ${ownPrice.amount.toLocaleString("en-US")}`], ...(ownPrice.aud ? [["Any other way of taking it", `AUD ${ownPrice.aud}`]] : [])] : lf && lf.currency !== "AUD" ? [["What you pay for", "Official fee", `About in ${lf.currency}`], ["The full test (all four sub-tests)", `AUD ${lf.aud}`, `${lf.currency} ${lf.amount.toLocaleString("en-US")}`]] : null;
    return { kind: "country", country: c, title: `${subject} in ${inCountry(c)}: fee, centres and councils`, questions: mine.filter((f) => f.part === "questions" && f.question).map((f) => ({ question: f.question, source: `AlmiWorld's question collector — asked by people in ${inCountry(c)}`, on: f.on })) /* RR-356 G1: their questions are demand evidence */, items, localCurrency: lf?.currency ?? CURRENCY_OF[c] ?? null, content: table ? { table, lastUpdated: rates?.date ?? null } : null };
  });
  /* each search joins the page it is about; the rest are topics, one page per need */
  const rankOf = {}, askedOfPair = {}, topics = new Map(), sitePages = (site?.pages ?? []).map((p) => ({ url: p.url, need: needOf([p.h1, p.title].filter(Boolean).join(" "), subject) }));
  for (const d of [...demand].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))) {
    const why = skipWhy(d.text); if (why) { if (skipped.length < 300) skipped.push({ text: d.text, why }); skippedMore++; continue; }
    if (d.ranks) { rankOf[d.ranks] = Math.max(rankOf[d.ranks] ?? 0, d.weight); continue; } /* RR-363 (R15, item 22): what most people read ranks the page that answers it; it is no page of its own */
    const prof = professionIn(d.text), where = countriesIn(d.text).filter((c) => cs.includes(c));
    if (prof && where.length) (askedOfPair[`${prof}|${where[0]}`] ??= []).push({ question: d.text, source: d.source }); // RR-362: what a C or D page must answer
    if (prof && profPages.some((p) => p.profession === prof)) { join(profPages.find((p) => p.profession === prof), { question: d.text, source: d.source }); continue; }
    if (where.length) { join(countryPages.find((p) => p.country === where[0]), { question: d.text, source: d.source }); continue; }
    const need = needOf(d.text, subject); if (!need && topics.has("")) { join(topics.get(""), { question: d.text, source: d.source }); continue; }
    const own = need && sitePages.find((p) => p.need === need); if (own) { if (existing.length < 300) existing.push({ text: d.text, page: own.url }); continue; }
    const tk = topicKeyOf(need, d.text), mapKey = SUBTESTS.includes(tk) ? `sub:${tk}` : need;
    const t = topics.get(mapKey) ?? { kind: "topic", need, key: tk, asked0: d.text, title: !need ? `What is ${subject}? The test, its fee and the scores asked` : COACHING.test(d.text) ? `${subject} Preparation Online` /* RR-366 X4: never a promise of a coaching centre this product is not */ : title(d.text), questions: [], source: d.source };
    if (topics.has(mapKey)) join(t, { question: d.text, source: d.source }); topics.set(mapKey, t);
  }
  /* RR-363 (R3): "oet result", "oet result today", "latest oet result": one need, one page: the others' searches stand on the first (the most-searched) */
  const oneForEachKey = () => { const first = new Map(), out = []; for (const t of topics.values()) { const had = t.key ? first.get(t.key) : null; if (had) { for (const q of [{ question: t.asked0, source: t.source }, ...t.questions]) join(had, q); continue; } if (t.key) first.set(t.key, t); out.push(t); } return out; };
  const hasFacts = (t) => Number(t.key === "what" || topicItems(t.key, subjectFacts, subject).length > 0 || t.key === "fee");
  /* a TOPIC page: the subject's own facts about its topic only; two topics never carry the same facts (a page with another's facts competes) */
  const used = new Set(), chosen = oneForEachKey().sort((a, b) => hasFacts(b) - hasFacts(a) || (rankOf[b.key] ?? 0) - (rankOf[a.key] ?? 0)).slice(0, maxTopics) /* RR-363: a topic we can say nothing about takes no place */, itemsOf = new Map();
  /* a sub-test page owns its sub-test's facts: the sub-test topics choose first, the general topics after */
  /* RR-363: booking before dates: the booking facts are its own, a schedule page may stand on the rest */
  const FIRST = (k) => (SUBTESTS.includes(k) ? 2 : k === "book" ? 1 : 0);
  for (const t of [...chosen].sort((a, b) => FIRST(b.key) - FIRST(a.key))) {
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
    if (t.key === "fee" || t.key === "what") { const f = ok.find((x) => x.part === "fee" && /oet\.com/.test(x.link) && /AU\$|AUD/.test(x.text)); if (f) items[t.key === "fee" ? "unshift" : "push"]({ part: "fee", question: `How much does ${subject} cost?`, claims: [{ ...claimOf(f, null), claimId: `${f.id ?? f.claimId}-${t.key}` /* RR-363: the fee page and the general page are two pages: the planner must not read one fact as one page */ }] }); }
    return { kind: "topic", topic: t.key, title: t.title, questions: t.questions, items, source: t.source };
  });
  /* 🔴 RR-362 (recipe R3; beta-g, 2 Nov 2026: "OET for Nurses in Australia" and "OET for Doctors in Egypt" had two questions each) · THE COLLECTORS' PLAN, BY TYPE:
   *   a country × profession row is C when a regulator there accepts the exam for this profession (they want to WORK there), else D (they COME FROM there);
   *   it stays a page only with every core question answered and something of its own (settleLocal, after the searches). A question page is never a page
   *   of its own (one answer is thin): it stands on its country page (R3). A row with no checked answer makes no page: counted, with why */
  const localPages = [], merged = [], notBuilt = [], bodyHosts = {};
  const says = (text, link, on, id) => ({ claimId: id.replace(/\s+/g, "-"), card: null, text, link, readOn: on, source: `${hostOf(link) ?? "its official page"} — its official page`, official: true });
  const scoreClaimsOf = (prof, q) => (q?.answer ?? []).map((a) => ({ claimId: a.connected ? `conn-${prof}-${q.country}`.replace(/\s+/g, "-") : a.fact.claimId ?? a.fact.id, card: cardOf(a.fact.text, null), text: plainScores(cleanFact(a.text)), link: a.fact.link, readOn: a.fact.readOn ?? a.fact.on, source: `${a.fact.source ?? hostOf(a.fact.link) ?? "its official page"} — its official page`, official: true, intent: "required-score" }));
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
    /* RR-367: a gap is an honest line with the page checked and its date, never a reason to drop the page */
    const asker = council[0] ?? null, gapWho = asker?.councilName ?? subject, gapLink = asker?.link ?? subjectFacts?.scale?.link ?? null, gapOn = asker?.checkedOn ?? asker?.on ?? subjectFacts?.scale?.readOn ?? null;
    const gapLine = (w) => (w === "steps" && asker?.stepsLine ? [{ claimId: `steps-${r.profession}-${r.country}`.replace(/\s+/g, "-"), card: null, text: asker.stepsLine, link: asker.stepsLink ?? asker.link, readOn: String(asker.stepsOn ?? asker.on).slice(0, 10), source: `${hostOf(asker.stepsLink ?? asker.link) ?? "its official page"} — its official page`, official: true, intent: "registration" }] : gapLink && gapOn ? [{ claimId: `gap-${w}`, card: null, text: asker?.checkedWhy === "unread" ? `${gapWho}'s own page could not be read on ${String(gapOn).slice(0, 10)}; this is still being looked for.` : `${gapWho}'s ${/contact/i.test(gapLink) ? "contact" : /^https?:\/\/[^/]+\/?$/.test(gapLink) ? "home" : "official"} page, checked ${String(gapOn).slice(0, 10)}, does not say this.`, link: gapLink, readOn: String(gapOn).slice(0, 10), source: `${hostOf(gapLink) ?? "its official page"} — its official page`, official: true, gap: true }] : []);
    const orGap = (cs, w) => (cs.length ? cs : gapLine(w));
    /* RR-367: the Nursing Council of Kenya's service on the doctors' page: a shared rule, not one that names another profession's council */
    const topicHere = pageTopicOf({ title: pageTitle, kind, country: r.country, profession: r.profession, people: PEOPLE_WORD }), shortOf = (n) => /\(([A-Z&]{2,})\)/.exec(n)?.[1] ?? String(n).split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join(""), mineShort = new Set(council.map((f) => shortOf(f.councilName ?? ""))), otherBodies = [...new Set(mine.filter((f) => f.part === "home-council" && f.profession !== r.profession).map((f) => shortOf(f.councilName ?? "")))].filter((a) => a.length >= 3 && !mineShort.has(a)).map((a) => new RegExp(`\\b${a.replace(/&/g, "")}\\b`));
    /* 🔴 RR-370 A: a rule read on the site of ANOTHER profession's council is that profession's rule. Decided by whose site it was read on, never by a word in it */
    const siteOf = (f) => hostOf(f.website ?? "") , myHosts = new Set(council.map(siteOf).filter(Boolean)), otherHosts = new Set(mine.filter((f) => f.part === "home-council" && f.profession !== r.profession).map(siteOf).filter((h) => h && !myHosts.has(h))), ofAnotherBody = (link) => otherHosts.has(hostOf(link ?? ""));
    let items, noRealQuestion = false;
    if (isC) {
      const d = dq?.details ?? null, body = dq?.regulator?.short ?? dq?.regulator?.name ?? council[0]?.councilName ?? "the regulator", id = (w) => `${w}-${r.profession}-${r.country}`, on = d?.on ?? null;
      items = [
        { part: "scores", question: `What ${subject} score does ${body} ask of ${people}?`, claims: orGap(dq?.answer ? scoreClaimsOf(r.profession, dq) : sameStandard(direct).map((f) => claimOf(f, null, cardOf(f.text, null))), "score") },
        { part: "regulator", question: `Who registers ${people} in ${inCountry(r.country)}, and how do I register?`, claims: [...cl(council), ...(d?.steps ? [says(`${body}'s own page about applying sets out the registration steps.`, d.steps, on, id("steps"))] : gapLine("steps"))] },
        { part: "others", question: `Does ${body} accept other English tests?`, claims: d?.others ? [says(d.others.length ? `${body}'s own page also names ${d.others.join(", ")}.` : `${body}'s own page names no other English test.`, d.url, on, id("others"))] : gapLine("others") },
        { part: "rules", question: `How long does a ${subject} result count for ${body}?`.replace(/\ba (?=[AEIOU][A-Z])/g, "an "), claims: [...(d?.validity ? [says(`${body}'s own page gives ${subject} results a time limit of ${d.validity.n} ${d.validity.unit}.`, d.url, on, id("valid"))] : []), ...(d?.combining ? [says(d.combining.allowed ? `${body}'s own page accepts results from two sittings${d.combining.months ? `, taken within ${d.combining.months} months` : ""}.` : `${body}'s own page asks for all parts of the test in one sitting.`, d.url, on, id("combine"))] : [])] },
      ];
    } else {
      const fees = mine.filter((f) => f.part === "fee"), src = fees.find((f) => f.official) ?? fees[0], own = officialLocalPrice({ facts: ok, country: r.country, aud: null, subject }) /* RR-365: its own price here too */, lf = own ?? (src?.official ? localFee({ official: src.official, country: r.country, rates }) : null);
      items = [
        { part: "council", question: `Which council in ${inCountry(r.country)} registers ${people}?`, claims: orGap(cl(council), "council") },
        { part: "regulator", question: `How do ${people} register in ${inCountry(r.country)}?`, claims: gapLine("steps") },
        { part: "standing", question: `How do ${people} from ${inCountry(r.country)} prove they are in good standing?`, claims: orGap(cl(mine.filter((f) => f.part === "rules" && !ofAnotherBody(f.link) && (intentOfFact(f) === "good-standing" || (!f.key && /\bgood standing\b|\bverification of registration\b/i.test(f.text))) /* 🔴 RR-370 A: what it was collected for, never a word it shares: attestation is its own question */ && (!f.ruleProfession || f.ruleProfession === r.profession || !/\bnurs|\bdoctor|\bpharmac|\bdentist/i.test(f.text)) && ownPart(cleanFact(f.text), topicHere) && !otherBodies.some((b) => b.test(f.text))).slice(0, 3)), "standing") },
        { part: "documents", question: `How do ${people} from ${inCountry(r.country)} get their documents attested?`, claims: [...new Map(mine.filter((f) => f.part === "rules" && !ofAnotherBody(f.link) && intentOfFact(f) === "documents").map((f) => [f.text, f])).values()].slice(0, 2).map((f) => claimOf(f, null, null)) },
        { part: "destinations", question: `Where do ${people} from ${inCountry(r.country)} go, and what score does each country ask?`, claims: orGap((research[r.profession] ?? []).filter((q) => q.kind === "score" && q.answer).flatMap((q) => scoreClaimsOf(r.profession, q).map((c) => ({ ...c, card: null }))).slice(0, 10), "score") },
        { part: "fee", question: `How much does ${subject} cost in ${inCountry(r.country)}?`, claims: lf ? [{ claimId: `fee-${r.country}-${r.profession}`.replace(/\s+/g, "-"), card: lf.card, text: lf.line, link: own ? own.fact.link : src.link, readOn: own ? own.fact.on : src.on, source: own ? `${hostOf(own.fact.link)} — its own price` : `${hostOf(src.link)} — the official fee; the rate: ${rates?.short ?? "—"} (${rates?.link ?? ""})`, official: true }] : [] },
      ];
    }
    /* the questions people from here, in this profession, ask — with their checked answer */
    /* RR-367: its own questions first: this profession here; then this country's, about no other profession; then this profession's from anywhere, naming no other place. None: the question everyone in this profession has */
    { const seen = new Set(), fits = (q) => { const a = asAsked(q); if (!a || /^can (?:an?|my)\s/i.test(a) && professionIn(a) !== r.profession /* another job's question ("Can an anesthesia technician …") is no question of these people */ || unclearWhy(a, { place: r.country }) || questionOffIntentWhy(a, { subject }) || isTestFormat(a, r.country)) return null; const s = sigOf(a); if (seen.has(s)) return null; seen.add(s); return a; }, other = (x) => professionIn(x) && professionIn(x) !== r.profession;
      const rows = [...mine.filter((f) => f.part === "questions" && professionIn(f.question) === r.profession), ...mine.filter((f) => f.part === "questions" && !other(f.question) && !other(f.text) && professionIn(f.question) !== r.profession), ...ok.filter((f) => f.part === "questions" && f.country !== r.country && professionIn(f.question) === r.profession && !countriesIn(f.question).length && !countriesIn(f.text).length)];
      let n = 0; for (const f of rows) { if (n >= 6) break; const q = fits(f.question); if (!q) continue; items.push({ part: `questions${n}`, question: q, claims: [claimOf(f, null, null)] }); n++; }
      for (const row of (asked[r.country] ?? []).filter((x) => x.kind !== "official" && !other(x.question))) { if (n >= 6) break; const q = fits(row.question); if (!q) continue; const a = answerQuestion(q, { ...ladderOf(r.country, row.link && row.answer ? { answer: row.answer, link: row.link, on: row.on } : null), allowHonest: false }); if (!a?.claims?.length) continue; items.push({ part: `questionsa${n}`, question: q, claims: a.claims }); n++; }
      /* 🔴 RR-369 Part 4 (REPLACES RR-367's "the question everyone in this profession has"): no question of our own writing. None real yet: the page stands, marked for the collector and for Google's autocomplete there */
      noRealQuestion = !n;
      /* shared facts are fine (R-C) */
      const homeP = countryPages.find((p) => p.country === r.country), sharedOf = (part) => (homeP?.items ?? []).find((it) => it.part === part);
      if (!items.some((it) => it.part === "fee") && sharedOf("fee")?.claims?.length) items.push({ part: "fee", question: sharedOf("fee").question, claims: sharedOf("fee").claims.slice(0, 1) });
      for (const part of ["centres", "results"]) { const it = sharedOf(part); if (it?.claims?.length) items.push({ part, question: it.question, claims: it.claims.map((c) => ({ ...c, card: null })) }); }
      if (isC && sharedOf("rules")?.claims?.length) items.push({ part: "country-rules", question: sharedOf("rules").question, claims: sharedOf("rules").claims.filter((c) => !ofAnotherBody(c.link)).map((c) => ({ ...c, card: null })) }); }
    for (const [host, who] of mine.filter((f) => f.part === "home-council" && siteOf(f)).map((f) => [siteOf(f), f.profession])) (((bodyHosts[r.country] ??= {})[host] ??= new Set())).add(who);
    localPages.push({ kind, type: TYPE_OF_KIND[kind], country: r.country, profession: r.profession, title: pageTitle, ...(noRealQuestion ? { questionsWanted: true, askSeeds: [`${subject} ${people}`.toLowerCase(), `${subject} ${people} ${String(r.country).toLowerCase()}`] } : {}), questions: [...(askedOfPair[`${r.profession}|${r.country}`] ?? [])], items: items.filter((it) => it.claims.length).map((it) => ({ ...it, claims: it.claims.map((c) => ({ ...c, claimId: `${isC ? "c" : "d"}-${r.profession}-${r.country}-${c.claimId}`.replace(/\s+/g, "-") })) })) /* its own answers: the planner must not read a shared fact as "the same page" (whether it says anything of its own is R3's question, by what it says) */, localCurrency: isC ? null : CURRENCY_OF[r.country] ?? null, content: null, home: countryPages.find((p) => p.country === r.country)?.title ?? null, prof: profPages.find((p) => p.profession === r.profession)?.title ?? null, askedHeads: [] });
  }
  /* a topic page with nothing of its topic is thin (R3): its searches stand on the general page */
  const realTopics = topicPages.filter((p) => p.items.length), bigTopic = realTopics.find((p) => p.topic === "what") ?? realTopics[0] ?? null;
  for (const p of topicPages.filter((x) => !x.items.length)) { if (bigTopic) for (const q of p.questions) join(bigTopic, q); merged.push({ type: "E", title: p.title, into: bigTopic ? [bigTopic.title] : [], why: "no checked fact of its topic yet — its searches stand on a bigger page" }); }
  /* RR-366 Part 3: a test-format question stands once, on its topic page, never on every country page */
  { const placed = new Set(), perPage = new Map(); for (const r of movedQuestions) { const sub = SUBTEST_OF(r.question), home = realTopics.find((x) => x.topic === sub) ?? bigTopic, sig = sigOf(r.question), say = (why) => droppedQuestions.push({ page: r.from, question: r.question, why }); if (!home) { say("it is a test-format question and no topic page is planned for it yet"); continue; } if (placed.has(sig)) { say(`it is a test-format question: it stands once, on "${home.title}"`); continue; } if ((perPage.get(home) ?? 0) >= 6) { say(`it is a test-format question: "${home.title}" already carries six of them`); continue; } const claims = r.fact ? [claimOf(r.fact, null, null)] : answerQuestion(r.question, ladderOf(null, r.view))?.claims; if (!claims?.length) { say("it is a test-format question with no verified answer yet"); continue; } placed.add(sig); perPage.set(home, (perPage.get(home) ?? 0) + 1); home.items.push({ part: `questionsa${60 + perPage.get(home)}`, question: r.question, claims }); say(`it is a test-format question, so it moved to "${home.title}"`); } }
  const pages = [...profPages, ...countryPages, ...realTopics, ...localPages];
  /* 🔴 RR-370: "How much does OET cost?" is the test's price. What a change or a re-mark costs is true, and has a question of its own */
  splitOtherFees(pages, subject);
  for (const p of pages) for (const it of p.items ?? []) if (it.part === "councils") it.claims = mergeOffices(it.claims);
  for (const p of localPages) { const kin = localPages.filter((x) => x !== p && x.profession === p.profession && x.kind === p.kind).map((x) => x.title), at = kin.findIndex((t) => t > p.title); /* 🔴 RR-370 item 10: its country page, its profession page, the nearest pages of the same profession */ p.links = [p.home, p.prof, ...[...kin.slice(Math.max(0, at)), ...kin].slice(0, 3)].filter(Boolean); p.open = []; p.ledger = []; }
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
    const have = new Set(p.items.filter((it) => it.claims.length).map((it) => it.part.replace(/\d+$/, "").replace(/^questionsa$/, "questions") /* RR-366 */));
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
  familyBlocks({ subject, f: subjectFacts, countryPages, profPages, topics: realTopics, pages });
  const byUrl = new Map();
  for (const p of pages.filter((x) => x.improve)) { const had = byUrl.get(p.improve.url); if (!had) { byUrl.set(p.improve.url, p); continue; } const [keep, drop] = isLocal(had) && !isLocal(p) ? [p, had] : [had, p]; byUrl.set(p.improve.url, keep); delete drop.improve; }
  /* R3 before the searches: a C or D page that cannot be whole, whatever a search finds, costs no search */
  return settleLocal({ pages, bodyHosts: Object.fromEntries(Object.entries(bodyHosts).map(([c, m]) => [c, Object.fromEntries(Object.entries(m).map(([h, s]) => [h, [...s]]))])), skipped, skippedTotal: skippedMore, existing, notBuilt, merged, droppedQuestions, counts: countsOf(pages, merged), bigger: { countryPages, profPages } }, { onlyBefore: true });
}
