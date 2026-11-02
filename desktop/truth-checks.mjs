/**
 * 🔴 RR-363 · R15's TWO TRUTH CHECKS (beta-g, 2 Nov 2026, on pages marked ready: "United Kingdom — NMC — B (350+)" while the NMC asks Writing C+ (300+); "How far ahead can I book OET? 7 days" while
 * bookings CLOSE 7 days before; "How long does it take to get your results?" answered about OET@Home; New Zealand's council answered with UK and Ahpra text). A page failing either is never ✅.
 *   A · SUMMARY = FACT: a card, table cell or title line that shortens a fact keeps its meaning: every score, the direction of a time rule, the right place. If it cannot, the full sentence is shown.
 *   B · ANSWER FITS QUESTION: an answer answers its own question: the same place, body, profession and part of the test, the asked thing said. A line that does not fit leaves the question; a question left
 *       with nothing is dropped (a core question then stays open, named). Recipe R12 (no lies to customers), R15. Pure.
 */
import { countriesIn } from "./world.mjs";
import { meaningOf, NEED_GROUPS } from "./coverage.mjs";
import { oldWording } from "./subject-facts.mjs";
import { professionIn } from "./page-plan.mjs";

const SUBTESTS = ["Listening", "Reading", "Writing", "Speaking"];
const distinct = (xs) => [...new Set(xs)];
/* a score, never money or a rate ("AUD 587", "= 194.49"); "340, 320" is two scores */
const scoresIn = (t) => distinct(String(t).match(/(?<![\d.,])(?<!\b[A-Z]{3} |[$£€] ?)[1-5]\d{2}(?!\d|[.,]\d)/g) ?? []);
const gradesIn = (t) => distinct((String(t).match(/\b[ABC]\+?(?=\s*\(\d{3}|\s+in\b|\s+for\b|\s*[,;.]|\s+\(|\s*$)/g) ?? []).filter((g) => g !== "A" && /\d{3}/.test(t) || /\+/.test(g)));
const TIME_RULE = /\b(before|after|within|from|up to|at least|no later|as little as|in as little|close[sd]?)\b/i, BARE_TIME = /^(?:[A-Za-z ]+ — )?(?:about |up to )?\d[\d–-]*\s*(?:minutes?|hours?|days?|weeks?|months?|years?)$/i;

/** A · why this short form changes the fact → the reason, or null */
export function summaryFault(card, text) {
  const c = String(card ?? "").trim(), t = String(text ?? ""); if (!c) return null;
  const s = scoresIn(t), lost = s.filter((n) => !c.includes(n));
  if (scoresIn(c).length && lost.length) return `it shows ${scoresIn(c).join(", ")} but the fact also says ${lost.join(", ")}`;
  if (!scoresIn(c).length && s.length >= 2 && /\b[ABC]\+?\b/.test(c)) return `it shows a grade but the fact states ${s.join(", ")}`;
  const lostGrade = gradesIn(t).filter((g) => /\+/.test(g) && !c.includes(g)); if (lostGrade.length && /\b[ABC]\+?\b|\d{3}/.test(c)) return `it leaves out ${lostGrade.join(", ")}`;
  if (BARE_TIME.test(c) && TIME_RULE.test(t)) return "a time alone: the fact says which way it runs (before, after, within)";
  const here = countriesIn(c), there = countriesIn(t); if (here.length && there.length && !here.some((x) => there.includes(x))) return `it names ${here[0]}, the fact is about ${there[0]}`;
  return null;
}
/** a card as the page shows it: judged by its own fact; a card nobody planned (an edit) by the facts that hold its number */
export function cardFaultOf(value, planned, texts = []) {
  if (planned) return summaryFault(value, planned);
  const nums = String(value).match(/\d[\d,.]*/g) ?? [], whys = texts.filter((t) => nums.some((n) => String(t).includes(n))).map((t) => summaryFault(value, t));
  return whys.length && whys.every(Boolean) ? whys[0] : null;
}
/* the fact's own sentence, without the "X's own page:" lead-in: never cut */
export const wholeFact = (text) => { const t = String(text ?? "").replace(/^[^:]{0,40}own page:\s*/i, "").trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
/** a short form that keeps the fact's meaning, or the whole sentence */
export const fitCard = (card, text) => (summaryFault(card, text) ? wholeFact(text) : card);

const nameIn = (t, w) => new RegExp(`(?<![\\p{L}])${String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu").test(String(t ?? ""));
const OPTIONS = Object.freeze([["paper", /\bon paper\b|\bpaper\b/i], ["computer", /\bon computer\b|\bcomputer\b/i], ["home", /@home|\bat home\b/i]]);
const ASKS_TIME = /^(how long|when)\b/i, SAYS_TIME = /\d|\b(?:minutes?|hours?|days?|weeks?|months?|years?|immediately|same day)\b/i;
const placesOf = (t, bodies) => distinct([...countriesIn(t), ...bodies.filter((b) => (b.names ?? []).some((n) => nameIn(t, n))).map((b) => b.country)]);

/**
 * B · why this answer does not answer its question → the reason, or null. `bodies` = [{ names, country }] (a regulator's name says its country); `loose`: a part the plan built for this very
 * question (its fee, its councils): only who and where are judged, never the words.
 */
export function answerFitWhy(question, answer, { subject = null, bodies = [], loose = false } = {}) {
  const q = String(question ?? ""), a = String(answer ?? "");
  if (oldWording(a)) return "it gives an old figure the official page has replaced"; /* Part D: whatever page it came from, the client's own too */
  const qp = placesOf(q, bodies), ap = placesOf(a, bodies); if (qp.length && ap.length && !ap.some((x) => qp.includes(x))) return `it asks about ${qp[0]}, the answer is about ${ap[0]}`;
  const prof = professionIn(q), other = professionIn(a); if (prof && other && prof !== other) return `it asks about ${prof}, the answer is about ${other}`;
  const sq = SUBTESTS.filter((s) => nameIn(q, s)), sa = SUBTESTS.filter((s) => new RegExp(`(?<![\\p{L}])${s}(?![\\p{L}])`, "u").test(a)); if (sq.length && sa.length && !sa.some((s) => sq.includes(s))) return `it asks about ${sq[0]}, the answer is about ${sa[0]}`;
  if (loose) return null;
  const oq = OPTIONS.filter(([, re]) => re.test(q)).map(([k]) => k), oa = OPTIONS.filter(([, re]) => re.test(a)).map(([k]) => k); if (oq.length && oa.length && !oa.some((k) => oq.includes(k))) return `it asks about the test ${oq[0]}, the answer is about the test ${oa[0]}`;
  /* a need the words must meet (a cost, a time, a score …); a question with no such need is judged by who and where: an official answer may say it in other words */
  const drop = [subject], want = meaningOf(q, { drop }), have = new Set(meaningOf(a, { drop })); const needs = want.filter((w) => NEED_GROUPS.has(w)); if (needs.length && !needs.some((w) => have.has(w))) return "the answer talks about something else";
  if (ASKS_TIME.test(q) && !SAYS_TIME.test(a)) return "it asks how long or when, the answer gives no time";
  /* "How long does it take to get your results?" must say results, not only some time */
  const nouns = want.filter((w) => !["time", "long", "take", "way", "much", "know"].includes(w)); if (ASKS_TIME.test(q) && nouns.length && !nouns.some((w) => have.has(w))) return "it gives a time, but not of what was asked";
  return null;
}
const WATCHED = /^(questions|topic|main)\d*$/;
/** the parts a page shows, each line that fits its own question kept → { parts, removed: [{ question, line, why }], dropped: [question] }. A question left with nothing goes */
export function fitParts(parts, { subject = null, bodies = [] } = {}) {
  const removed = [], dropped = [], out = [];
  for (const it of parts) {
    const loose = !WATCHED.test(String(it.part)), kept = (it.claims ?? []).filter((c) => { const why = answerFitWhy(it.question, c.text, { subject, bodies, loose }); if (why) removed.push({ question: it.question, line: String(c.text).slice(0, 160), why }); return !why; });
    if (kept.length) out.push({ ...it, claims: kept }); else if ((it.claims ?? []).length) dropped.push(it.question);
  }
  return { parts: out, removed, dropped };
}
