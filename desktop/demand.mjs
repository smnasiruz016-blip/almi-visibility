/**
 * RR-323 · DEMAND FIRST — the client's own search-data file (Keyword Planner), clustered into the pages people search for.
 *   · a keyword's volume is GOOGLE'S RANGE (an account with no ads sees 0 / 50 / 500 / 5,000 / 50,000) — shown as the range, never exact
 *   · set aside, each with its reason: a brand or a website people go to (not our page), not about the subject, no clear need
 *   · every other keyword → its INTENT (practice / sample, tips, fees, booking and dates, results, scores, preparation, format, versus,
 *     on computer, where to take it) + its sub-test + its profession + a regulator or a country it names → ONE cluster per same meaning
 *     ("oet sample test", "sample oet exam", "oet practice exam" are one) → the page that answers it
 * Pure functions: no network, no file. The words of the keyword are the client's own data (his export).
 */
import { PROFESSION_WORD } from "./page-plan.mjs";
import { countriesIn } from "./world.mjs";

/* RR-326 I: Google's ranges moved to kp-file.mjs, unchanged */
import { RANGES, rangeOf, rangeWord as k } from "./kp-file.mjs";
export { RANGES, rangeOf };
/** a cluster's demand: the sum of its keywords' ranges ("1.2K–12K a month") */
export function sumRanges(rs) {
  const xs = rs.filter(Boolean); if (!xs.length) return null;
  const low = xs.reduce((s, r) => s + r.low, 0), high = xs.reduce((s, r) => s + r.high, 0);
  return { low, high, label: low === high ? k(low) : `${k(low)}–${k(high)}` };
}

const SUBTEST = [["Writing", /\b(writing|writ\w*|letters?|case ?notes?|referral|discharge|transfer letter)\b/], ["Speaking", /\b(speaking|role ?plays?|roleplay)\b/], ["Listening", /\blisten\w*\b/], ["Reading", /\breading\b/]];
/* the intents, in the order they are tried (the first that matches wins) */
const INTENT = [
  ["remark", /\b(re-?mark\w*|recheck\w*|re-?evaluat\w*|appeals?)\b/], // RR-327: re-marking is its own need (its own fee and window) — first: "remarking fee" is about re-marking
  ["vs", /\b(vs|versus|or ielts|ielts or|difference|compare\w*|easier|harder|better than|ielts (and|oet)|(and|to) ielts|ielts oet pte)\b/],
  ["countries", /\b(which countr\w*|countries|country list|accepted countr\w*|accepted in|countr\w* (list|accept\w*)|each country|different countries)\b/],
  ["tips", /\b(tips?|tricks?|mistakes?|strateg\w*|how to (pass|score|improve|crack|clear|get|write|answer|prepare for)|band 7|secrets?)\b/],
  ["sample", /\b(samples?|practi[cs]e|mock|model (answers?|letters?|tests?)|test papers?|question papers?|past papers?|papers?|questions?|exercises?|worksheets?|answers?|case ?notes?|letters?|referral|discharge|role ?plays?|roleplay|scripts?|pdf)\b/],
  ["fees", /\b(fees?|costs?|price|prices|how much|charges?|payment|pay|in (inr|pkr|rupees|usd|aud))\b/],
  ["booking", /\b(book\w*|register|registration|apply|application|enrol\w*|dates?|schedule\w*|slots?|calendar|when is|next exam|availability|seats?|today'?s?|resit\w*|january|february|march|april|may|june|july|august|september|october|november|december)\b/],
  ["results", /\b(results?|result date|released?|validity|valid|expir\w*|how long (are|is|does)|certificate|re-?mark\w*|recheck)\b/],
  ["scores", /\b(scores?|scoring|grades?|grading|bands?|pass(ing)? marks?|marks?|mark list|marking|passing|pass rate|pass percentage|success rate|conversion|equivalent|chart|calculator|criteria|requirement\w*|required|minimum|b means|[abc]\+?|b1)\b/],
  ["computer", /\b(computer|cbt|at home|from home|home test|home|@home|remote|online|prometric)\b/],
  ["where", /\b(near me|centres?|centers?|venues?|test cent\w*|exam cent\w*|locations?|where (to|can i|is))\b/],
  ["prep", /\b(prepar\w*|course\w*|coaching|class(es)?|tuition|training|study|books?|materials?|tutors?|teachers?|institutes?|academy|learn\w*|lessons?|guide|vocabulary|grammar)\b/],
  ["format", /\b(format|pattern|syllabus|structure|duration|how long is|parts?|what is|about|details|information|meaning|full form|full|overview|sub-?tests?|modules?|test day|exam day|language test|english language test|for health professionals|healthcare professionals|exam for( what)?|is for|conducted by|process|2\.0|oet 2)\b/],
];
/* a business's name, a teacher's or a forum, or a website people go to — not our page (owner decision 5). The names are the file's own
 * words (the client's data) — schools, teachers and sites seen in his export */
const NAV_SITE = /\b(official|website|site|home ?page|login|log in|sign in|portal|my ?oet|app|\.com|com|org|net|www|de|reddit|telegram)\b/;
const NAV = new RegExp(`${NAV_SITE.source}|\\b(e2|e2language|e2oet|benchmark|edubenchmark|acumen|oetacumen|oetofficial|oetonline|swoosh|ajinorah|neethu'?s?|medcity|medicity|kaplan|cambridge|boxhill|cbla|set english|set oet|set|mu|jahshan|iilt|edu skills|slc|british council|idp|khaira|gurleen|maggie ryan|steve|jay|betty olsen|banfield|manjoorans|planet edu|xic|universal|santa monica|winner|champs|english melon|mentor merlin|jeremiah|yesudas|grace|ebek|irs|cila|aims|b good|be good|b ghud|maiva|es|fast track|fast|dr|shirley decosta|tiju'?s?|englishwise|bamf)\\b`);
/* a profession the subject does not test — said so, not a page */
const NOT_A_PROFESSION = /\b(engineers?|lab technicians?|social workers?|teachers? of|accountants?)\b/;
/* "OET for USMLE" is ECFMG's rule; "OET for PLAB" is the GMC's (the regulator's page answers it) */
const EXAM_OF = [[/\busmle\b/, "ecfmg"], [/\bplab\b/, "gmc"]];
const SUBJECT = /\b(oet|o\.e\.t|occupational english)\b/;
const HEAD = /^(the )?(oet|occupational english test|occupational english|english occupational test|oet occupational english test|oet english test|oet english|oet test|test oet|oet exam|oet examination|oet english exam|exam oet|oet uk|oet full form)$/;
const YEAR = /\b20\d\d\b/g;
const norm = (s) => String(s ?? "").toLowerCase().replace(YEAR, " ").replace(/[^\p{L}\p{N}@.' +-]+/gu, " ").replace(/\s+/g, " ").trim();
const profOf = (t) => PROFESSION_WORD.find(([re]) => re.test(t))?.[1] ?? null;

/**
 * one keyword → { set: null | "brand" | "not-about" | "unclear", why } or { cluster, intent, subtest, profession, regulator, country }
 * `regulators`: [{ key, title, names: [lowercase names/short names] }] — a keyword naming one is that regulator's demand
 */
export function classify(keyword, { regulators = [], subject = "OET" } = {}) {
  const t = norm(keyword);
  if (!t) return { set: "not-about", why: "empty" };
  if (NAV.test(t)) return { set: "brand", why: NAV_SITE.test(t) ? "a website or a forum people go to — not our page" : "a school's, a teacher's or a business's own name — not our page" };
  const reversed = /english occupational test/.test(t);
  if (!SUBJECT.test(t) && !reversed) return { set: "not-about", why: `does not name ${subject}` };
  if (NOT_A_PROFESSION.test(t)) return { set: "unclear", why: `a profession ${subject} does not test` };
  const exam = EXAM_OF.find(([re]) => re.test(t))?.[1];
  const reg = regulators.find((r) => (exam ? r.names.includes(exam) : r.names.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t)))) ?? null;
  const subtest = SUBTEST.find(([, re]) => re.test(t))?.[0] ?? null, profession = profOf(t);
  const country = countriesIn(t)[0] ?? null;
  let intent = INTENT.find(([, re]) => re.test(t))?.[0] ?? null;
  if (!intent && subtest === "Writing" && /\b(letters?|case ?notes?|referral|discharge)\b/.test(t)) intent = "sample";
  if (HEAD.test(t)) intent = "format";
  if (reg && (!intent || intent === "scores" || intent === "results" || intent === "booking" || intent === "format")) return { intent: "regulator", regulator: reg.key, profession, country, cluster: `regulator|${reg.key}` };
  /* "OET score for nurses in the UK": the grade a country's regulator asks for that profession — that regulator's page */
  if (intent === "scores" && country && profession) return { intent: "requirement", profession, country, cluster: `requirement|${country}|${profession}` };
  if (intent === "where" || (intent === "prep" && /\b(near me|in [a-z]+$)\b/.test(t) && !profession)) return { intent: "where", country, cluster: "where" };
  if (intent === "sample" || intent === "tips") {
    const sub = subtest, prof = sub === "Listening" || sub === "Reading" ? null : profession; // Listening and Reading are the same for every profession
    return { intent, subtest: sub, profession: prof, cluster: `practice|${intent}|${sub ?? "-"}|${prof ?? "-"}` };
  }
  if (!intent && subtest) return { intent: "subtest", subtest, profession, cluster: profession ? `subtest|${subtest}|${profession}` : `subtest-info|${subtest}` };
  if (intent) return { intent, subtest, profession, country, cluster: `topic|${intent}` };
  if (profession) return { intent: "profession", profession, cluster: `profession|${profession}` };
  if (country) return { intent: "country", country, cluster: `country|${country}` };
  return { set: "unclear", why: "no clear need in its words (a name or a word we cannot place)" };
}

/**
 * the file's keywords → clusters → the pages they ask for. items: [{ text, volume: { estimate } }] (research5.takeSearchFile phrases)
 * → { keywords, setAside: { brand, notAbout, unclear }, clusters: [{ key, intent, subtest, profession, regulator, country, keywords:
 *   [{ text, range }], demand, top }], line }
 */
export function clusterKeywords(items, { regulators = [], subject = "OET" } = {}) {
  const setAside = { brand: [], notAbout: [], unclear: [] }, by = new Map();
  for (const it of items) {
    const text = String(it.text ?? "").trim(); if (!text) continue;
    const range = rangeOf(it.volume?.estimate ?? it.volume ?? null), c = classify(text, { regulators, subject });
    if (c.set) { setAside[c.set === "not-about" ? "notAbout" : c.set].push({ name: text, why: c.why, range: range?.label ?? null }); continue; }
    const cl = by.get(c.cluster) ?? { key: c.cluster, intent: c.intent, subtest: c.subtest ?? null, profession: c.profession ?? null, regulator: c.regulator ?? null, country: c.intent === "country" ? c.country : null, keywords: [], countries: new Set() };
    cl.keywords.push({ text, range }); if (c.country) cl.countries.add(c.country); by.set(c.cluster, cl);
  }
  const clusters = [...by.values()].map((c) => { const ks = c.keywords.sort((a, b) => (b.range?.high ?? 0) - (a.range?.high ?? 0) || a.text.localeCompare(b.text)); return { ...c, countries: [...c.countries], keywords: ks, demand: sumRanges(ks.map((x) => x.range)), top: ks[0].text }; })
    .sort((a, b) => (b.demand?.high ?? 0) - (a.demand?.high ?? 0) || a.key.localeCompare(b.key));
  const n = items.length, kept = clusters.reduce((s, c) => s + c.keywords.length, 0);
  return { keywords: n, kept, setAside, clusters, line: `${n.toLocaleString("en-US")} keywords → ${kept.toLocaleString("en-US")} about ${subject} → ${clusters.length} clusters of the same meaning; set aside: ${setAside.brand.length} brands and websites, ${setAside.notAbout.length} not about ${subject}, ${setAside.unclear.length} with no clear need` };
}
