/**
 * 🔴 RR-366 Part 2 + Part 3 · KEEP GOOD QUESTIONS, ANSWER THEM (owner's rulings of 15 and 18 Oct; item 29). A clear question on this page's topic stays and gets an answer, in this order:
 *   1) a verified fact that answers it by meaning ("Who can take OET?" → OET's 12 professions);
 *   2) an opinion question → the general view people hold, its source and date beside it, marked as a view, never as an official rule;
 *   3) a question about classes or practice → our own edge, truthfully described, with the official link;
 *   4) nothing found → "OET's official page, checked <date>, does not say this", with the link. Said only of a page really read, whose words really lack it.
 * A country page carries the questions its people type, in their own wording; a test-format question belongs on its topic page. Pure; data per category, never per client.
 */
import { meaningOf } from "./coverage.mjs";
import { countriesIn } from "./world.mjs";
import { priceHere, placeHere } from "./truth-prices.mjs";

const ONE = (key, re, keys) => Object.freeze({ key, re, keys });
/* same-meaning words → the subject's own facts that answer them. First match decides. A local word stands beside the English one */
export const MEANINGS = Object.freeze([
  ONE("change-fee", /\b(?:reschedul\w*|postpone\w*|defer\w*|chang\w*|mov\w*)\b.*\b(?:date|booking|test|exam|fee|cost)\b|\b(?:fee|cost)\b.*\b(?:reschedul\w*|postpone\w*|defer\w*)\b/i, ["changeFee", "changeFeeComputer"]),
  ONE("remark", /\bre-?mark\w*|\bre-?evaluat\w*|\bre-?check\w*|\bre-?scor\w*/i, ["remarkFee", "remarkHours"]),
  ONE("result", /\bresults?\b/i, ["resultsPaper", "resultsIndia", "resultsComputer", "results95"]),
  ONE("offline", /\boffline\b|\bon paper\b|\bpaper[- ]based\b.*\b(?:apply|book|register)\b|\b(?:apply|book|register)\b.*\bpaper\b/i, ["bookFind", "bookPaper", "bookPaperCloses"]),
  /* RR-366 (found reading the ready pages): these stay narrow. A wrong answer is worse than "its official page does not say this" */
  ONE("home", /\bat home\b|@home\b|\bfrom home\b/i, ["bookComputerCloses", "resultsComputer"]),
  ONE("who", /^who\b|\beligib\w*|\bwho can\b|\bonly for\b|\b(?:for )?which professions?\b|^can (?:an?|my|the)\b[^?]*\b(?:take|sit|apply|give)\b/i, ["professions12", "notForOthers"]),
  ONE("abroad", /\b(?:study|work)(?: or (?:study|work))? abroad\b|\buse\b[^?]*\bto (?:study|work|register)\b/i, ["purpose"]),
  ONE("what", /\bkya hai\b|\bke ho\b|\bki hai\b|\bmatlab\b|^what is (?:an? )?[A-Za-z]{2,6}(?: exam| test)?\??$|\bmeaning\b|\bwhat is the use of\b/i, ["purpose", "scale"]),
  ONE("book", /\bbook\w*\b|\bregister for\b|\b(?:oet|exam|test) registration\b|\bregistration (?:for|in|of) (?:the )?(?:oet|exam|test)\b|\bregistration\b\s+\p{Lu}|\bapply for (?:the )?(?:oet|exam|test)\b|\bdates?\b/iu, ["bookFind", "bookPaperCloses", "bookComputerCloses"]),
  ONE("score", /\bscores?\b|\bgrades?\b|\bband\b|\bpass(?:ing)?\b.*\bmarks?\b|\bmarks?\b/i, ["scale", "gradeB"]),
]);
export const FEE_WORDS = /\bfees?\b|\bcosts?\b|\bprices?\b|\bhow much\b|\bkitni\b|\bkitna\b|\bmagkano\b|\bkharcha\b|\bcharges?\b/i;
export const CENTRE_WORDS = /\bcent(?:re|er)s?\b|\bvenues?\b|\bnear me\b|\bwhere\b.*\b(?:take|sit|give)\b/i;
const OPINION = /\bbetter\b|\bbest\b|\beasier\b|\bharder\b|\bvs\.?\b|\bversus\b|\bshould i\b|\bworth\b|\bor (?:ielts|pte|toefl|oet)\b|\b(?:ielts|pte|toefl|oet) or\b/i;
export const PRACTICE = /\bclass(?:es)?\b|\bcoaching\b|\bcourses?\b|\btuition\b|\btutors?\b|\blessons?\b|\bpractice\b|\bpractise\b|\bpreparation\b|\bprepare\b|\bprep\b|\bmock\b|\bsamples?\b|\bmaterials?\b|\bbooks?\b(?! (?:a|an|the|my|oet))/i;
/* a question about the test's own format: every country shares it, so it belongs on the topic page */
const FORMAT = /\brole[- ]?plays?\b|\brole[- ]?cards?\b|\binterlocut\w+|\bspeaking\b|\bwriting\b|\blistening\b|\breading\b|\bsub-?tests?\b|\bcase notes?\b|\bmarking\b|\bcriteria\b|\braw (?:test )?marks?\b|\bpencil\b|\bwarm-?up\b|\bassessors?\b/i;
export const SUBTEST_OF = (q) => ["Speaking", "Writing", "Listening", "Reading"].find((s) => new RegExp(`\\b${s}\\b`, "i").test(q)) ?? (/\brole[- ]?(?:plays?|cards?)\b|\binterlocut/i.test(q) ? "Speaking" : /\bcase notes?\b|\bletter\b/i.test(q) ? "Writing" : null);
/** a test-format question naming no place → it goes to its topic page; one naming the place stays */
export const isTestFormat = (q, place = null) => FORMAT.test(String(q)) && !(place && countriesIn(q).includes(place));

export const HONEST = /\bofficial page, checked \d{4}-\d{2}-\d{2}, does not say this\b|\bofficial page, checked \d{4}-\d{2}-\d{2}, is the place to read this\b/;
export const VIEW_MARK = "A view many people hold, not an official rule:";
const short = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
const fromSubject = (f, country) => ({ claimId: `ladder-${f.claimId}`, card: null, text: country ? placeHere(priceHere(f.text, country), country) : f.text /* no one country: the whole fact, as the topic page shows it */, link: f.link, readOn: f.readOn, source: f.source ?? "its own page", official: true, body: f.body ?? null });
/* a view may not carry a fee, a date, a score or a time limit: those are facts, and need their own source */
const HOLDS_A_NUMBER = /(?:AU[D$]|US[D$]|[$£€])\s?\d|\b\d{2,}\b/;
const FOR_PLACE = (f, country) => { const here = countriesIn(placeHere(priceHere(f?.text ?? "", country), country)); return !here.length || !country || here.includes(country); };

/** step 1 → the claims of the first meaning that fits, or null. `extra`: facts the caller holds for a need (a validity read from a regulator's own page) */
export function factAnswer(question, { subjectFacts = {}, country = null, extra = {} } = {}) {
  const q = short(question);
  if (/\b(?:valid|validity|expires?|expiry)\b/i.test(q) && extra.validity?.length) return { how: "validity", claims: extra.validity };
  for (const m of MEANINGS) {
    if (!m.re.test(q)) continue;
    let keys = m.keys;
    if (m.key === "result") keys = country && /^(?:India|Philippines)$/.test(country) ? ["resultsIndia", "resultsComputer", "results95"] : ["resultsPaper", "resultsComputer", "results95"];
    const facts = keys.map((k) => subjectFacts[k]).filter((f) => f?.text && /^https?:/.test(f.link ?? "") && FOR_PLACE(f, country));
    /* "What grade is 300?" must say 300: a score asked is answered with that score, or not by this rung */
    const asked = q.match(/\b[1-5]\d{2}\b/g) ?? [], hold = asked.length ? facts.filter((f) => asked.some((n) => String(f.text).includes(n))) : facts;
    if (hold.length) return { how: m.key, claims: hold.map((f) => fromSubject(f, country)) };
    return null;
  }
  return null;
}
/** which of the subject's read pages to point at, and whether its words really lack what is asked */
export function honestAnswer(question, { subject, pages = [] }) {
  const usable = pages.filter((p) => /^https?:/.test(p.url ?? "") && /^\d{4}-\d{2}-\d{2}/.test(p.on ?? "") && Array.isArray(p.words)); if (!usable.length) return null;
  const want = meaningOf(question, { drop: [subject] }), scored = usable.map((p) => { const w = new Set(p.words); return { p, hit: want.filter((x) => w.has(x)).length }; }).sort((a, b) => b.hit - a.hit), best = scored[0], says = want.length && best.hit === want.length;
  return { claimId: `ladder-honest-${hostOf(best.p.url)}`, card: null, text: says ? `${subject}'s official page, checked ${best.p.on}, is the place to read this.` : `${subject}'s official page, checked ${best.p.on}, does not say this.`, link: best.p.url, readOn: best.p.on, source: `${subject} — its own page`, official: true, body: subject };
}
/** the whole ladder → { claims, step } */
export function answerQuestion(question, ctx) {
  const { subject, country = null, subjectFacts = {}, view = null, edge = [], pages = [], extra = {}, allowHonest = true } = ctx, q = short(question);
  /* an opinion is asked as an opinion first: a fact about IELTS is not the view asked for */
  if (OPINION.test(q) && view?.answer && /^https?:/.test(view.link ?? "") && !HOLDS_A_NUMBER.test(view.answer)) return { step: 2, claims: [{ claimId: `ladder-view-${hostOf(view.link)}`, card: null, text: `${VIEW_MARK} ${short(view.answer)}`, link: view.link, readOn: view.on, source: `${hostOf(view.link)} — a view, not an official rule`, official: false, view: true }] };
  const fact = factAnswer(q, { subjectFacts, country, extra }); if (fact && !PRACTICE.test(q)) return { step: 1, how: fact.how, claims: fact.claims };
  if (PRACTICE.test(q) && edge.length) return { step: 3, claims: edge };
  if (fact) return { step: 1, how: fact.how, claims: fact.claims };
  const honest = allowHonest ? honestAnswer(q, { subject, pages }) : null;
  return honest ? { step: 4, claims: [honest] } : null;
}
/** R15: our own edge, truthfully described: the words the client's own site says of itself, the link to it, and the subject's own practice page */
export function edgeClaims({ product, site, description, on, subjectFacts = {} }) {
  const out = [], official = subjectFacts.sampleTests ?? subjectFacts.practiceEvery; if (official?.text) out.push({ claimId: `ladder-${official.claimId}`, card: null, text: official.text, link: official.link, readOn: official.readOn, source: official.source ?? "its own page", official: true });
  if (product && /^https?:/.test(site ?? "") && description) out.push({ claimId: `ladder-edge-${hostOf(site)}`, card: null, text: `${product} is our own practice site: ${short(description).replace(/[.]*$/, ".")}`, link: site, readOn: String(on ?? "").slice(0, 10), source: `${hostOf(site)} — our own product`, official: false, ownProduct: true });
  return out;
}
/* ── Part 3: the questions people of a country type ── */
const ANOTHER_SITE = /\b(?:reddit|quora|youtube|pdf|login|log in|sign in|portal|\.com|\.org)\b/i;
export const shownWording = (phrase, subject, country = null) => { const t = short(phrase).replace(/[?.]+$/, ""), s = String(subject), named = t.replace(new RegExp(`\\b${s}\\b`, "gi"), s); return `${(country ? named.replace(new RegExp(`\\b${country}\\b`, "gi"), country) : named).replace(/^./, (x) => x.toUpperCase())}?`; };
/** the need a typed phrase asks: its class, or null when no verified answer could be matched */
export function classOfPhrase(phrase) {
  const p = short(phrase);
  if (MEANINGS.find((m) => m.key === "change-fee").re.test(p)) return "change-fee";
  if (FEE_WORDS.test(p)) return "fee";
  if (/\baccepted\b|\brequirements?\b/i.test(p) && !/\bwhich countries\b/i.test(p)) return "accepted";
  if (CENTRE_WORDS.test(p)) return "centre";
  if (PRACTICE.test(p)) return "practice";
  return MEANINGS.find((m) => m.re.test(p))?.key ?? null;
}
/** a typed phrase's fate on this country's page → why it is not used, or null */
export function phraseOutWhy(phrase, { country, subject, skipWhy = () => null }) {
  const p = short(phrase); if (!new RegExp(`\\b${String(subject)}\\b`, "i").test(p)) return "it is not about this subject";
  const places = countriesIn(p); if (places.some((c) => c !== country)) return "it is about another country";
  if (ANOTHER_SITE.test(p)) return "people typing this want another website";
  return skipWhy(p);
}
