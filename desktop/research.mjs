/**
 * 🔴 RR-356 (owner: "Visibility's job is to make SEO pages by SEARCHING for information, and good searching means asking the right questions.
 * The fault is in Visibility's code": "OET for Nurses" had no Australia although an Ahpra fact was in the app's own data — the app matched
 * labels, it did not understand and connect; thin pages "waited for collectors" — the app never went to look for what was missing).
 * THE RESEARCH ENGINE — before a page is written, four steps:
 *   1 QUESTION LIST — the searches people make, plus the STANDARD questions of the page's type (per product category, never per client);
 *   2 UNDERSTAND AND CONNECT — the facts the app already has, by MEANING: a body's one standard for all its boards answers every profession
 *     that body registers (the exam owner's own list says which);
 *   3 SEARCH WHAT IS MISSING — each open question's official page is read (desktop/regulator-read.mjs: robots, the verbatim number check,
 *     source and date; kept 30 days, then read again); a page that cannot be read leaves the question honestly open;
 *   4 WRITE ONLY THEN — the page is written from the answers; it is ✅ only when its standard questions are answered, else ⚠️ names them.
 * Each page keeps a RESEARCH LEDGER: the questions asked, where Visibility searched, what it found, what it did not.
 * Pure, except searchMissing (it reads the web through the reader it is handed).
 */
import { PEOPLE_WORD, inCountry, isRegulator, callNames } from "./recognition.mjs";
import { readRegulator } from "./regulator-read.mjs";

/* the standard questions of each page type, per product CATEGORY (an exam; any other product) — never one client's list */
export const STANDARD = Object.freeze({
  exam: Object.freeze({
    country: Object.freeze([["fee", "the fee in its own money"], ["questions", "the questions people there ask, with answers"], ["centres", "test centres"], ["councils", "the council for each profession"], ["rules", "a rule special to it"]]),
    profession: Object.freeze([["score", "the score each council asks, in every main country that accepts it"], ["writing", "the Writing task for this profession"]]),
    topic: Object.freeze({
      Listening: ["format", "timing", "marks", "grade B", "how to prepare"], Reading: ["format", "timing", "marks", "grade B", "how to prepare"],
      Writing: ["timing", "length", "grade B", "how to prepare"], Speaking: ["format", "timing", "grade B", "how to prepare"],
      fee: ["the fee", "other fees"], result: ["when results come", "how it is scored"], book: ["how to book", "when bookings close"],
      date: ["when bookings close", "how far ahead"], online: ["taking it on computer", "taking it at home"], what: ["the parts", "how it is scored", "the fee"],
    }),
  }),
  general: Object.freeze({ page: Object.freeze([["what", "what it is"], ["cost", "what it costs"], ["how", "how it works"], ["who", "who it is for"]]) }),
});
/* which of the subject's own facts (desktop/subject-facts.mjs) answers each standard topic question */
export const TOPIC_ANSWERS = Object.freeze({
  format: (t) => [`${t.toLowerCase()}Glance`, `${t.toLowerCase()}Marks`, "speakingRoleplay"], timing: (t) => [`${t.toLowerCase()}Glance`, "readingPartA", "writingMinutes", "speakingRoleplay"],
  marks: (t) => [`${t.toLowerCase()}Marks`], "grade B": (t) => [`${t.toLowerCase()}B`, `${t.toLowerCase()}GradeB`], "how to prepare": () => ["practiceEvery"], length: () => ["writingWords"],
  "the fee": () => ["fee"], "other fees": () => ["changeFee", "remarkFee"], "when results come": () => ["resultsComputer", "resultsPaper", "results95"], "how it is scored": () => ["scale", "gradeB"],
  "how to book": () => ["bookAhead", "bookPaperCloses"], "when bookings close": () => ["bookPaperCloses", "bookComputerCloses"], "how far ahead": () => ["bookAhead"],
  "taking it on computer": () => ["speakingOtherDay", "bookComputerCloses", "resultsComputer"], "taking it at home": () => ["bookAhead"], "the parts": () => ["listeningGlance", "readingGlance", "writingGlance", "speakingGlance"],
});

/* the main countries people go to (the owner's list) — first; then every other country where the exam owner's list names a regulator */
export const MAIN_DESTINATIONS = Object.freeze(["United Kingdom", "Australia", "New Zealand", "Ireland", "United States", "Canada", "Singapore", "United Arab Emirates", "Qatar", "Saudi Arabia"]);
const PROF_NAME = { nursing: /nurs|midwi/i, medicine: /medical|medicine|physician|doctor/i, dentistry: /dent/i, pharmacy: /pharm/i, physiotherapy: /physio/i, "occupational therapy": /occupational/i, radiography: /radiat|radiog|imaging/i, dietetics: /diet|nutrition/i, optometry: /optom|optical|optician/i, podiatry: /podiat/i, "speech pathology": /speech/i, "veterinary science": /veterin/i };
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
const rank = (r, prof) => (r.record?.officialUrl ? 3 : 0) + (PROF_NAME[prof]?.test(r.name) ? 2 : 0) + (/healthcare regulator/i.test(r.kind ?? "") ? 1 : 0) - (/directory|registry|aide/i.test(r.name) ? 3 : 0);

/* 🔴 RR-357 (owner: "United States: Alabama Board of Nursing … 340, 320, 350, 360 names numbers without saying which sub-test each belongs to,
 * and one state is not the whole country") · A SCORE IS SHOWN ONLY TIED TO ITS SUB-TEST, as the official page states it ("Listening 350",
 * "B in each", "1400 total"); a page that gives numbers without saying which is which shows NO number — its page is linked, the question stays
 * open. A state or provincial board is said as such: "United States — Alabama (state board)". */
export const TIED = /\b(?:listening|reading|writing|speaking)\b[^.;]{0,24}?(?:\b[ABC]\+?(?![\w+])|\b\d{3}\b)|\b[ABC]\+?(?:\s*\(\d{3}\+?\))?\s+in\s+(?:each|all|three)\b|\b(?:in|for)\s+each\b[^.;]{0,40}\b\d{3}\b|\b\d{3,4}\s+total\b|\b(?:at least|minimum)\s+(?:grade\s+)?[ABC]\+?\s+(?:in|for)\s+(?:each|all)\b|\bgrade\s+[ABC]\+?(?:\s*\(\d{3}\+?\))?\s+in\s+(?:each|all)\b|\b[AB]\s+or\s+B\b|\b(?:minimum |at least )?(?:grade )?[ABC]\+?\s+(?:in|for)\s+(?:listening|reading|writing|speaking)\b|\b\d{3}\+?\s+(?:or (?:above|higher)\s+)?(?:in|for)\s+(?:listening|reading|writing|speaking)\b/i;
export const UNTIED = /\bthe results it names with\b/i;
/** does a line state its scores tied to their sub-tests? (a line with no score at all is not a score answer either) */
export const scoresTied = (text) => TIED.test(String(text ?? "")) && !UNTIED.test(String(text ?? ""));
const US_STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"];
const CA_PROVINCES = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Northwest Territories", "Nunavut", "Yukon"];
/** where a body's rule holds: the whole country, or one state / province of it → { label, part } */
export function placeOf(country, bodyName) {
  const n = String(bodyName ?? ""), find = (xs) => xs.filter((x) => new RegExp(`\\b${x}\\b`, "i").test(n)).sort((a, b) => b.length - a.length)[0] ?? null;
  const part = country === "United States" ? find(US_STATES) : country === "Canada" ? find(CA_PROVINCES) : null;
  return part ? { part, label: `${inCountry(country)} — ${part} (${country === "United States" ? "state board" : "provincial college"})` } : { part: null, label: inCountry(country) };
}

/**
 * 1 · THE DESTINATIONS of a profession: each country where the exam owner's own list names a health regulator that accepts the exam for it,
 * with that country's best-placed regulator for it (its own record first) and, beside it, the bodies whose one standard may cover it.
 * → [{ country, regulator, also: [regulators] }] — the main countries first, at most `max`.
 */
export function destinationsFor(prof, list = [], { max = 10 } = {}) {
  /* a country outside the main ones is asked only when its regulator can be searched (the list gives its address) — else it is named in the
   * ledger as accepting, never a question that can never be answered */
  const regs = list.filter((r) => r?.country && (r.professions ?? []).includes(prof) && isRegulator(r)).filter((r, _, all) => MAIN_DESTINATIONS.includes(r.country) || all.some((x) => x.country === r.country && (x.record?.officialUrl || x.website)));
  const countries = [...new Set(regs.map((r) => r.country))].sort((a, b) => (MAIN_DESTINATIONS.indexOf(a) + 1 || 99) - (MAIN_DESTINATIONS.indexOf(b) + 1 || 99) || regs.filter((r) => r.country === b).length - regs.filter((r) => r.country === a).length);
  return countries.slice(0, max).map((country) => { const here = regs.filter((r) => r.country === country).sort((a, b) => rank(b, prof) - rank(a, prof)); return { country, regulator: here[0], also: here.slice(1, 4) }; });
}

/** 1 · a profession page's question list: one score question per destination, and its Writing task */
export function professionQuestions({ subject, prof, destinations }) {
  const people = PEOPLE_WORD[prof] ?? prof;
  /* a country whose boards are its states' or provinces' own (the United States, Canada): the question is about such a board, and each answer
   * names its own state or province — never one state's rule for the whole country */
  return [...destinations.map((d) => { const pl = placeOf(d.country, d.regulator.name), kind = d.country === "United States" ? "a state board" : "a provincial college"; return { id: `score:${d.country}`, kind: "score", country: d.country, place: pl.label, regulator: d.regulator, also: d.also ?? [], question: pl.part ? `What ${subject} score does ${kind} in ${inCountry(d.country)} ask of ${people}?` : `What ${subject} score does ${d.regulator.short ?? d.regulator.name} in ${inCountry(d.country)} ask of ${people}?`, answer: null, partial: null, how: null, searched: [] }; }),
    { id: "writing", kind: "writing", question: `What is the ${subject} Writing task for ${people}?`, answer: null, how: null, searched: [] }];
}

/* a body's ONE standard for all its boards: its own words say so, or its facts for different professions hold the very same scores */
const ALL_BOARDS = /\bNational Boards\b|\b(?:all|each|every) (?:of its |the )?(?:national )?boards?\b|\ball (?:health |registered )?professions\b|\bevery profession\b/i;
const scoresOf = (t) => (String(t).match(/\b(?:listening|reading|writing|speaking)\s*(?:[ABC]\+?\s*)?\(?\d{3}\+?\)?|\b\d{3,4} total\b/gi) ?? []).map((x) => x.toLowerCase().replace(/\s+/g, " ")).join("|");
const standardPart = (t) => (/accepts? OET[.:]?\s*([\s\S]+)$/i.exec(String(t))?.[1] ?? String(t)).trim();

/**
 * 2 · UNDERSTAND AND CONNECT. `facts` = the checked facts the app already has ({ country, part, profession, text, link, on, key }).
 * A score question is answered by a fact for that very profession in that country; else by a body-wide standard: a fact from a body the
 * exam owner's list names for this profession (by its website) whose standard is one for all its boards (its words say so, or the same
 * scores stand for two or more of its professions). → the questions, each with { answer: [claims], how } where answered.
 */
export function connectByMeaning({ questions, facts = [], prof, subject = "OET" }) {
  const people = PEOPLE_WORD[prof] ?? prof;
  for (const q of questions.filter((x) => x.kind === "score" && !x.answer)) {
    const here = facts.filter((f) => f.country === q.country && f.part === "councils" && f.verified !== false);
    /* a fact whose numbers are not tied to their sub-tests answers nothing (RR-357) — one with no number at all ("does not accept") does */
    const own = here.filter((f) => f.profession === prof && (scoresTied(f.text) || !/\b\d{3}\b/.test(f.text)));
    if (own.length) { q.answer = own.map((f) => ({ fact: f, text: `In ${inCountry(q.country)}: ${f.text}` })); q.how = "already in Visibility's checked facts"; continue; }
    /* the bodies the list names for this profession here, and the hosts of their sites */
    const bodies = [q.regulator, ...q.also].filter(Boolean), hosts = new Set(bodies.flatMap((b) => [hostOf(b.website), hostOf(b.record?.officialUrl)]).filter(Boolean));
    const byHost = new Map(); for (const f of here) { const h = hostOf(f.link); if (h && hosts.has(h)) (byHost.get(h) ?? byHost.set(h, []).get(h)).push(f); }
    for (const [h, fs] of byHost) {
      const said = fs.find((f) => ALL_BOARDS.test(f.text));
      const same = !said && fs.filter((f, i, all) => scoresOf(f.text) && all.some((g) => g !== f && g.profession !== f.profession && scoresOf(g.text) === scoresOf(f.text)));
      const f = said ?? (same?.length >= 2 ? same[0] : null); if (!f) continue;
      const body = bodies.find((b) => hostOf(b.website) === h || hostOf(b.record?.officialUrl) === h);
      const name = body?.short ?? body?.name ?? h;
      q.answer = [{ fact: f, connected: true, text: `In ${inCountry(q.country)}: ${name} sets one English standard for every board it registers, the board for ${people} included (${subject}'s own list names ${name} for ${people}) — ${standardPart(f.text)}` }];
      q.how = said ? `connected by meaning: ${name}'s own words say its standard is for all its boards` : `connected by meaning: ${name}'s standard is the same for ${same.length} of its professions, and ${subject}'s list names ${name} for ${people}`;
      break;
    }
  }
  return questions;
}

/**
 * 3 · SEARCH WHAT IS MISSING. Each open score question: its regulator's own page is read (then the other bodies the list names for it), with
 * the verbatim check; a page read in the last `keepDays` is not read again. `cache` = { get(url), set(url, value) }; `budget` = { left } — the regulators still to be read in this run, shared by every page (the rest are said: "not searched yet — next run"). → the questions, with what was searched and found.
 */
export async function searchMissing({ questions, subject, reader, cache, budget = { left: 20 }, keepDays = 30, now = new Date().toISOString() }) {
  for (const q of questions.filter((x) => x.kind === "score" && !x.answer)) {
    for (const body of [q.regulator, ...q.also].filter(Boolean).slice(0, 2)) {
      const url = body.record?.officialUrl ?? body.website; if (!url) { q.searched.push({ url: null, body: body.name, found: false, why: "the exam owner's list gives no address for it" }); continue; }
      let got = cache.get(url);
      if (!got || (Date.parse(now) - Date.parse(got.on ?? 0)) / 864e5 > keepDays) {
        if (budget.left <= 0) { q.searched.push({ url, body: body.name, found: false, why: "not searched yet — Visibility reads it on the next run" }); continue; }
        budget.left--;
        const r = await readRegulator({ page: { ...body, body: body.name, listId: body.id ?? body.name }, subject, reader }).catch((e) => ({ ok: false, why: String(e?.message ?? e).slice(0, 80), claims: [] }));
        got = { on: String(now).slice(0, 10), ok: r.ok, url: r.url ?? url, why: r.why ?? null, scores: r.ok ? (r.claims ?? []).find((c) => c.fact === "scores") ?? null : null };
        cache.set(url, got);
      }
      /* a page that only says it accepts the exam answers no score question: the scores themselves must stand on it */
      const hasScores = Boolean(got.scores) && scoresTied(got.scores.text), place = placeOf(q.country, body.name).label;
      q.searched.push({ url: got.url ?? url, body: body.name, on: got.on, found: hasScores, why: hasScores ? null : got.scores ? (UNTIED.test(got.scores.text) ? `its page gives numbers without saying which sub-test each is for — no number is shown` : `its page says it accepts ${subject} but states no scores`) : got.why ?? `its page does not state the ${subject} scores` });
      /* accepted, but no score tied to a sub-test: said with its page linked, never a number — the question stays open */
      if (!hasScores && got.scores && !q.partial) q.partial = { text: `In ${place}: ${body.name} names ${subject} on its own page among the English tests it accepts; the page does not say which score is for which sub-test — see its page.`, link: got.scores.link, on: got.scores.readOn, source: hostOf(got.scores.link) };
      if (hasScores) { q.answer = [{ fact: { id: `read-${got.scores.claimId}`, text: got.scores.text, link: got.scores.link, on: got.scores.readOn, source: hostOf(got.scores.link) }, read: true, text: `In ${place}: ${got.scores.text}` }]; q.how = `read on ${body.name}'s own page`; q.partial = null; break; }
    }
  }
  return questions;
}

/** 4 · the questions still open, in plain words; the research ledger rows ({ question, status, how, searched }) */
export const openOf = (questions) => questions.filter((q) => !q.answer).map((q) => q.question);
export const ledgerOf = (questions, extra = []) => [...questions.map((q) => ({ question: q.question, status: q.answer ? "answered" : "open", how: q.how ?? (q.answer ? "answered" : "not found"), searched: (q.searched ?? []).map((s) => `${s.body ?? ""}${s.url ? ` (${s.url})` : ""}${s.on ? `, ${s.on}` : ""}: ${s.found ? "found" : s.why}`) })), ...extra];
