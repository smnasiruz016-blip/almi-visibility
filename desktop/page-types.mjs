/**
 * 🔴 RR-362 · EVERY PAGE HAS A TYPE, AND EACH TYPE HAS CORE QUESTIONS (recipe v3.3: R3, R5, R6, G7, G9, G13). Why: beta-g read three "ready" pages on
 * 2 Nov 2026 and two were thin — 2 questions each — one without the score it was about. A page missing a core question is ⚠️ with the question named,
 * never ✅. These are data per product CATEGORY, never one client's list: only `exam` has types today; a product of another kind keeps its own checks.
 *   A country (people FROM a country, R5) · B profession (R6) · C destination × profession (where they want to WORK) ·
 *   D origin × profession (where they COME FROM) · E topic. C and D are never mixed in one page or title.
 * R3: a C or D page is made only when it answers ALL its core questions with something the matching A and B pages do not already say; otherwise it
 * is not a page: its facts go into A and B and the plan shows "merged". Pure.
 */
import { countriesIn } from "./world.mjs";

export const KIND = Object.freeze({ country: "country", profession: "profession", destination: "destination-profession", origin: "origin-profession", topic: "topic" });
export const TYPE_OF_KIND = Object.freeze({ [KIND.country]: "A", [KIND.profession]: "B", [KIND.destination]: "C", [KIND.origin]: "D", [KIND.topic]: "E" });
/* the plain name a client reads */
export const TYPE_WORDS = Object.freeze({ A: "Country page", B: "Profession page", C: "Working in a country", D: "Coming from a country", E: "Topic page" });

/* R5 + R6 + the owner's list of 2 Nov 2026 (the command's Part 2): each part of a page, in the words its ⚠️ shows */
export const CORE = Object.freeze({
  exam: Object.freeze({
    [KIND.country]: Object.freeze({ fee: "the fee in its own currency", questions: "the questions people there ask, with answers", centres: "test centres", councils: "the council for each profession", rules: "a rule special to it" }),
    [KIND.profession]: Object.freeze({ scores: "the score each council asks, by country", writing: "what the Writing letter is for this profession", questions: "its own questions and answers" }),
    [KIND.destination]: Object.freeze({ scores: "the score asked for each part of the test, with its date rule", regulator: "the regulator and how to register with it", others: "whether other English tests are accepted", questions: "the questions people in this profession ask about this country" }),
    [KIND.origin]: Object.freeze({ council: "their home council", standing: "how to get a good-standing or verification letter", destinations: "where these professionals go and the score each asks", fee: "the fee in their own currency", questions: "the questions people from this country and profession ask" }),
  }),
});
export const coreOf = (kind, category = "exam") => CORE[category]?.[kind] ?? null;

/* the English tests a regulator's page may name beside the subject (G7: read on its own page, never assumed); per category */
export const OTHER_TESTS = Object.freeze({ exam: Object.freeze([["IELTS", /\bIELTS\b/], ["OET", /\bOET\b/], ["PTE Academic", /\bPTE\b/], ["TOEFL iBT", /\bTOEFL\b/], ["Cambridge English", /\bCambridge (?:English|C1|C2|Assessment)\b|\bC1 Advanced\b|\bC2 Proficiency\b/], ["CELPIP", /\bCELPIP\b/], ["Duolingo English Test", /\bDuolingo\b/]]) });
/* a rule that tells a person from a country how to prove good standing or have documents verified (R5's country-specific rules) */
export const STANDING = /\bgood standing\b|\bverif(?:y|ication|ied)\b|\bcertificate of\b|\battest(?:ed|ation)?\b|\blegali[sz]\w+\b|\bapostille\b/i;

/*
 * G2 + item 19 · A QUESTION ON A PAGE IS CLEAR, ON THE PAGE'S TOPIC AND ANSWERABLE: "Why did a video make the student seem like the interviewer in
 * speaking?" is someone's story about a video, not a question a candidate has. → why it is dropped, or null. The reason is kept for the plan's list.
 */
const ASKS = /^(how|what|why|which|where|when|who|is|are|can|could|does|do|did|should|will|would|may|must|has|have)\b/i;
const STORY = /\b(?:the|this|that|a) (?:student|video|channel|clip|post|comment|teacher|tutor|instructor)\b|\bmy (?:friend|teacher|tutor|cousin|sister|brother)\b|\b(?:he|she|his|her|him)\b/i;
const CONTEXTLESS = /^(?:is|are|does|do|can|will|would|should|was|were) (?:it|this|that|these|those|they)\b|\b(?:this|that) (?:one|page|article|answer|thing)\b|\babove\b/i;
export function unclearWhy(question, { place = null } = {}) {
  const t = String(question ?? "").replace(/\s+/g, " ").trim(), words = t.split(" ").filter((w) => /\p{L}/u.test(w));
  if (!ASKS.test(t) && !/\?$/.test(t)) return "it is not a question";
  if (words.length < 4) return "too short to say what it asks";
  if (words.length > 30) return "too long to be one clear question";
  if (STORY.test(t)) return "it is about someone's story, not what a candidate needs";
  if (CONTEXTLESS.test(t)) return "it does not say what it is about";
  if (/^(?:why|how) did\b/i.test(t)) return "it asks about something that once happened, not what a candidate needs";
  if (place && countriesIn(t).some((c) => c !== place)) return "it is about another country";
  return null;
}
export const clearQuestion = (q, o) => !unclearWhy(q, o);

/* same-meaning words → the part of a C or D page that answers a question people ask (G7: by meaning, never by label) */
const ROUTES = Object.freeze([
  [/\b(other tests?|ielts|pte|toefl|cambridge|instead of|or oet|vs|versus)\b/i, ["others"]],
  [/\b(valid|validity|expire|expires|expiry|combine|combined|sittings?|how long)\b/i, ["rules"]],
  [/\b(fee|fees|cost|costs|price|prices|pay|payment|how much)\b/i, ["fee"]],
  [/\b(good standing|verif\w+|attest\w*|legali[sz]\w+|apostille|documents?)\b/i, ["standing"]],
  [/\b(register|registration|apply|application|licen[cs]e|licensing|council|board|regulator|steps?)\b/i, ["regulator", "council"]],
  [/\b(score|scores|grade|grades|band|bands|marks?|pass|passing|cutoff|cut-off|minimum|requirements?|required|require|need|needs)\b/i, ["scores", "destinations"]],
]);
/** which part of the page answers a question people ask → the item, or null: the FIRST meaning it asks decides; with no such part here the question stays out, never padded */
export function itemForAsked(question, items) {
  const route = ROUTES.find(([re]) => re.test(String(question))); if (!route) return null;
  for (const part of route[1]) { const it = items.find((x) => x.part === part && x.claims?.length); if (it) return it; }
  return null;
}
const nameIn = (text, word) => new RegExp(`(?<![\\p{L}])${String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu").test(String(text ?? ""));
/** a question this page's reader asks: clear, and naming the page's country or its people */
/* G4: people ask in search wordings too ("Australia OET score for nurses"): such a wording counts when it names BOTH the place and the people; never one that asks for another site or a free copy */
const OTHER_SITE = /\b(reddit|quora|youtube|pdf|free|login|near me)\b/i;
const namesPeople = (q, people) => people.some((w) => nameIn(q, w) || nameIn(q, String(w).replace(/s$/, "")));
export const askedHere = (q, { place, people = [] }) => { if (clearQuestion(q, { place })) return nameIn(q, place) || namesPeople(q, people); return nameIn(q, place) && namesPeople(q, people) && !OTHER_SITE.test(String(q)) && String(q).trim().split(/\s+/).length >= 3; };

/** the core parts a planned page still lacks (each by the words above): `askedHeads` = its headings that are questions people ask */
export function coreMissingOfPlan(page, category = "exam") {
  const want = coreOf(page.kind, category); if (!want) return [];
  const have = new Set(page.items.filter((it) => it.claims?.length).map((it) => String(it.part).replace(/\d+$/, "")));
  if (page.askedHeads?.length) have.add("questions");
  return Object.entries(want).filter(([k]) => !have.has(k)).map(([k, words]) => ({ part: k, words }));
}
const claimKey = (c) => String(c.text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
/** R3 · what this page says that neither matching bigger page says → the claims */
export function ownClaims(page, bigger = []) {
  const there = new Set(bigger.filter(Boolean).flatMap((p) => p.items.flatMap((it) => it.claims ?? [])).map(claimKey));
  return page.items.flatMap((it) => it.claims ?? []).filter((c) => !there.has(claimKey(c)));
}
/* R3 · the plain reason a C or D page is not a page of its own */
export function mergeWhy({ missing, own }) {
  if (missing.length) return `not a page of its own yet — it cannot answer: ${missing.map((m) => m.words).join("; ")}`;
  if (!own.length) return "not a page of its own — everything it would say is already on the country page and the profession page";
  return null;
}
