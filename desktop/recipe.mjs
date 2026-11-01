/**
 * 🔴 RR-356 · THE PAGE RECIPE v3 IN FULL (owner's law: C:\Projects\_handoffs\ALMIVISIBILITY_BEST_PAGE_RECIPE_STRATEGY_FINAL_v3.docx, with the
 * owner's later rulings R1–R9 over it). Every step runs for every page; each writes what it did into the page's RESEARCH LEDGER.
 *   G0 the real person, context and goal · G1–G2 demand evidence and the Human Question Universe, each question with its source and date ·
 *   G3 localized thinking (desktop/research.mjs: destinations, countries) · G4 same-intent wordings clustered, the real words kept ·
 *   G5 read what ranks → a coverage list (diagnostic only — never a fact) · G6 the second-search test · G7 answer by meaning, then the official
 *   source found (desktop/research.mjs) · G8 KEEP / IMPROVE / ADD SECTION / MERGE / CREATE / MONITOR / NOINDEX / REJECT · G9 why this URL deserves
 *   to exist (R3: demand, or an opportunity with its own answer) · G10–G13 the answer first, a verified comparison, what applies and what is
 *   still uncertain · G14 freshness windows · G15 a textual overlap above 40% → a meaning review · G16–G17 the technical and readability checks
 *   (desktop/seo-pages.mjs) · G18–G19 preview, then publish by the client's choice in small batches · G20 measured after publishing, no verdict
 *   before 28 days.
 * Pure, except where a function is handed a reader.
 */
import { PEOPLE_WORD, inCountry } from "./recognition.mjs";
import { cleanCoverage, coversByMeaning } from "./coverage.mjs"; // RR-359: only real subtopics; covered by meaning

/* ── G0 · the real person, context and goal of a page's intent ── */
export function personOf(page, { subject = null /* RR-359: no default subject */, product = null } = {}) {
  const people = page.profession ? PEOPLE_WORD[page.profession] ?? page.profession : null;
  if (page.kind === "profession") return { person: `A trained ${people?.replace(/s$/, "")} who wants to work abroad`, context: `must show English for registration with a council in another country`, goal: `know which council asks which ${subject} score, and how the ${subject} for ${people} works` };
  if (page.kind === "country") return { person: `A healthcare professional in or from ${inCountry(page.country)}`, context: `is planning to take ${subject} there, or to register there`, goal: `know the fee in local money, where to take it, which council registers them and what is special to ${inCountry(page.country)}` };
  /* RR-360 · the two kinds the collectors plan */
  if (page.kind === "country-profession") return { person: `A trained ${people?.replace(/s$/, "")} in or from ${inCountry(page.country)}`, context: `needs the council that registers ${people} there, and what it asks`, goal: `know which council registers ${people} in ${inCountry(page.country)} and what ${subject} score applies` };
  if (page.kind === "question") return { person: `Someone who asked this about ${subject}`, context: page.country ? `in ${inCountry(page.country)}` : "looking for a straight answer", goal: `get a sourced answer to "${page.title}"` };
  if (page.kind === "topic") return { person: `A ${subject} candidate`, context: `preparing for ${page.title}`, goal: `understand ${page.title} well enough to prepare and pass` };
  return { person: product?.who ?? "A visitor", context: product?.what ?? "looking for an answer", goal: `get a clear answer to "${page.title}"` };
}

/* ── G2 · THE HUMAN QUESTION UNIVERSE: first, next, eligibility, cost, time, documents, mistakes, exceptions, actions — per page kind (a
 * category's question set, never one client's). Each is a question the person really has; it is answered where a checked fact exists ── */
export const UNIVERSE = Object.freeze({
  profession: (s, people) => [["first", `Which countries accept ${s} for ${people}?`], ["eligibility", `Can ${people} take the ${s} for their own profession?`], ["cost", `How much does ${s} cost?`], ["time", `When do ${s} results come?`], ["exceptions", `Is ${s} taken at home accepted?`], ["next", `What is the ${s} Writing task for ${people}?`], ["actions", `How do I book ${s}?`], ["documents", `What documents does a council ask for besides ${s}?`], ["mistakes", `What mistakes cost ${people} their registration?`]],
  country: (s, c) => [["cost", `How much does ${s} cost in ${c}?`], ["first", `Where can I take ${s} in ${c}?`], ["eligibility", `Which council registers each profession in ${c}?`], ["exceptions", `What rules are special to ${c}?`], ["next", `What do people in ${c} ask about ${s}?`], ["time", `When do ${s} results come?`], ["documents", `What documents do I need from ${c}?`], ["actions", `How do I book ${s} in ${c}?`], ["mistakes", `What mistakes do candidates from ${c} make?`]],
  topic: (s, t) => [["first", `What is ${t}?`], ["time", `How long does it take?`], ["cost", `What does it cost?`], ["next", `How is it scored?`], ["actions", `How should I prepare?`], ["mistakes", `What mistakes lose marks?`], ["exceptions", `What is different on computer or at home?`]],
});
/** → [{ question, category, source, on, from }] — the universe for the page, then the questions people asked (its demand), each with its source */
export function questionsOf(page, { subject = null /* RR-359: no default subject */, on = null, extra = [] } = {}) {
  const people = page.profession ? PEOPLE_WORD[page.profession] ?? page.profession : null;
  const set = page.kind === "profession" ? UNIVERSE.profession(subject, people) : page.kind === "country" ? UNIVERSE.country(subject, inCountry(page.country)) : UNIVERSE.topic(subject, page.title);
  return [...set.map(([category, question]) => ({ question, category, source: "the recipe's question set for this kind of page", from: "recipe", on })),
    ...(page.questions ?? []).map((q) => ({ question: q.question ?? q, category: "asked", source: q.source ?? "a search people make", from: /reddit/i.test(q.source ?? "") ? "reddit" : /quora/i.test(q.source ?? "") ? "quora" : /your AI/i.test(q.source ?? "") ? "ai" : /question collector/i.test(q.source ?? "") ? "collector" : "search", on: q.on ?? on })),
    ...extra];
}

/* ── G4 · same-intent wordings clustered into ONE intent, every real wording kept ── */
const STOPW = new Set(["the", "a", "an", "for", "of", "in", "to", "and", "or", "is", "what", "how", "do", "does", "i", "my", "can", "you", "with", "on", "at"]);
const sig = (s) => [...new Set(String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w && !STOPW.has(w)).map((w) => w.replace(/ies$/, "y").replace(/(s|x|ch|sh)es$/, "$1").replace(/([^s])s$/, "$1")))].sort();
export function clusterIntents(questions) {
  const out = [];
  for (const q of questions) { const s = sig(q.question); const c = out.find((x) => { const both = s.filter((w) => x.sig.includes(w)).length; return both / Math.max(1, Math.min(s.length, x.sig.length)) >= 0.75 && Math.abs(s.length - x.sig.length) <= 2; });
    if (c) c.wordings.push(q); else out.push({ intent: q.question, sig: s, wordings: [q] }); }
  return out.map(({ sig: _s, ...c }) => c);
}

/* ── G5 · READ WHAT RANKS → THE COVERAGE LIST: from the top results' own headings (read with robots obeyed), the subtopics people find
 * answered — diagnostic only: never a sentence copied, never a fact taken. `results` = [{ url, title, headings: [..], tables, updated }] ── */
export function coverageOf(results = [], opts = {}) {
  /* 🔴 RR-359 (owner's first real run: menus, comments, forms, ads, code and past years in "Not covered yet"): desktop/coverage.mjs keeps only
   * the topic's real subtopics — shown by two independent sites, or in "People also ask", or clearly a reader's question */
  return cleanCoverage({ results, ...opts });
}
/* ── G6 · THE SECOND-SEARCH TEST: what would the reader still need to search after the best result? The questions people also ask that
 * the best result does not answer, and the coverage subtopics it lacks ── */
export function secondSearch({ best = null, paa = [], coverage = [], subject = null, title = "" }) {
  const has = (q) => coversByMeaning(`${best?.title ?? ""} ${(best?.headings ?? []).join(" ")} ${best?.text ?? ""}`, q, { subject, title }); // RR-359: by meaning
  /* RR-360: one question once (Google's question is often also on the coverage list) */
  const seen = new Set(), once = (x) => { const k = String(x.question).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); if (seen.has(k)) return false; seen.add(k); return true; };
  return [...paa.filter((q) => !has(q)).map((q) => ({ question: q, why: "people also ask it, and the best result does not answer it" })), ...coverage.filter((c) => !has(c.topic)).map((c) => ({ question: c.topic, why: `other top results cover it (${c.seenOn}), the best one does not` }))].filter(once);
}
/** does our page cover a coverage topic or a second-search question? (its own headings and answers) */
export const covers = (pageText, q, opts = {}) => coversByMeaning(pageText, q, opts); // RR-359: by meaning, never the exact words

/* ── G8 · THE DECISION per intent ── */
export const DECISIONS = Object.freeze(["KEEP", "IMPROVE", "ADD SECTION", "MERGE", "CREATE", "MONITOR", "NOINDEX", "REJECT"]);
export function decisionOf({ row, pack = null, measured = null }) {
  if (row.kind === "REFUSED" && /navigational|competitor|real exam|another website|another company/i.test(row.why ?? "")) return "REJECT";
  if (measured?.verdict === "NOINDEX" || measured?.verdict === "MERGE") return measured.verdict; // only proposed — the client's OK first (G20)
  if (row.kind === "IMPROVE") return pack && !pack.add.length ? "KEEP" : "IMPROVE";
  if (row.kind === "SECTION") return /^https?:\/\//.test(row.into ?? "") ? "ADD SECTION" : "MERGE";
  if (row.kind === "REFUSED") return "MONITOR";
  if (measured?.verdict === "WEAK") return "MONITOR";
  return "CREATE";
}

/* ── G9 · WHY THIS URL DESERVES TO EXIST (R3: demand found → a page; no search but a real need with its own answer → an OPPORTUNITY page) ── */
export function rightToExist({ page, questions, answered }) {
  const asked = questions.filter((q) => q.from !== "recipe"), sources = [...new Set(asked.map((q) => q.from))];
  const kind = asked.length ? "demand" : "opportunity";
  const need = page.kind === "country-profession" ? `the council that registers ${PEOPLE_WORD[page.profession] ?? page.profession} in ${inCountry(page.country)}` : page.kind === "profession" ? `which council in each country asks which score of ${PEOPLE_WORD[page.profession] ?? page.profession}` : page.kind === "country" ? `the fee in local money, the centres, the councils and the rules of ${inCountry(page.country)}` : page.title;
  return { kind, sources, why: kind === "demand" ? `${asked.length} search${asked.length === 1 ? "" : "es"} people make (${sources.join(", ")}) ask for ${need}; ${answered} of its questions are answered with official sources no other page of this site gives.` : `No search names it yet, but the person needs ${need}, and its ${answered} checked answers differ from every other page — an opportunity page, built strong and watched.` };
}

/* ── G14 · FRESHNESS (v3 §10.4): fees, dates, scores and policies 90 days; requirements and processes 180; stable background 365 ── */
export const FRESH_DAYS = Object.freeze({ dynamic: 90, process: 180, stable: 365 });
export const factClass = (text) => (/\b(?:AUD|USD|PKR|INR|GBP|EUR|AED|fee|cost|price|\d{3}\b|grade [ABC]|score|deadline|date|closes?|days?|hours?|valid|policy|from \d{4}|on or after)\b/i.test(String(text)) ? "dynamic" : /\b(?:must|requires?|asks?|accepts?|register|apply|submit|steps?)\b/i.test(String(text)) ? "process" : "stable");
/** → { fresh: [{ text, on, until }], expired: [{ text, on, days }] } — an expired fact is never shown as current */
export function freshness(claims = [], now = new Date().toISOString()) {
  const out = { fresh: [], expired: [] };
  for (const c of claims) { if (!/^\d{4}-\d{2}-\d{2}/.test(c.readOn ?? "")) continue; const days = (Date.parse(String(now).slice(0, 10)) - Date.parse(c.readOn)) / 864e5, max = FRESH_DAYS[factClass(c.text)];
    const until = new Date(Date.parse(c.readOn) + max * 864e5).toISOString().slice(0, 10);
    (days > max ? out.expired : out.fresh).push({ text: String(c.text).slice(0, 90), on: c.readOn, until, days: Math.round(days) }); }
  return out;
}

/* ── G15 · DUPLICATION: textual overlap of two pages (5-word shingles); above 40% → a MEANING review: the same intent and the same facts is
 * a duplicate; a different intent (another country, profession or topic) with its own facts is distinct, said ── */
const shingles = (t) => { const w = String(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" "); const s = new Set(); for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(" ")); return s; };
export function overlap(a, b) { const x = shingles(a), y = shingles(b); if (!x.size || !y.size) return 0; let n = 0; for (const s of x) if (y.has(s)) n++; return n / Math.min(x.size, y.size); }
export function duplicationReview(pages) {
  const out = new Map(pages.map((p) => [p.url, { worst: 0, with: null, verdict: "distinct", why: null }]));
  for (let i = 0; i < pages.length; i++) for (let j = i + 1; j < pages.length; j++) {
    const o = overlap(pages[i].text, pages[j].text); if (o <= 0.4) continue;
    const sameIntent = pages[i].intent === pages[j].intent, ownFacts = (p, q) => p.facts.some((f) => !q.facts.includes(f));
    const dup = sameIntent || !(ownFacts(pages[i], pages[j]) && ownFacts(pages[j], pages[i]));
    for (const [p, q] of [[pages[i], pages[j]], [pages[j], pages[i]]]) { const r = out.get(p.url); if (o > r.worst) Object.assign(r, { worst: o, with: q.title, verdict: dup ? "duplicate" : "distinct", why: dup ? `it says what "${q.title}" says (${Math.round(o * 100)}% the same words, and no answer of its own)` : `${Math.round(o * 100)}% of its words are also on "${q.title}" (shared questions), reviewed: a different intent with its own checked facts` }); }
  }
  return out;
}

/* ── G18–G19 · publish in small batches (a controlled cohort) ── */
export const BATCH = 5;
/* ── G20 · AFTER PUBLISHING: Search Console read; no verdict before 28 days; 100+ impressions or day 90 → a verdict; weak → improve once,
 * re-measure; then KEEP, MERGE or NOINDEX — MERGE and NOINDEX only proposed (the client's OK), never deleted ── */
export function afterPublish({ live = [], perPage = {}, now = new Date().toISOString(), improved = {} }) {
  return live.map((r) => { const days = (Date.parse(now) - Date.parse(r.on ?? now)) / 864e5, m = perPage[r.live ?? r.url] ?? { impressions: 0, clicks: 0 };
    if (days < 28) return { url: r.url, verdict: "WAIT", line: `Live ${Math.floor(days)} days — no verdict before 28 days.` };
    if (m.impressions < 100 && days < 90) return { url: r.url, verdict: "WAIT", line: `${m.impressions} impressions so far — judged at 100 impressions, or at day 90.` };
    if (m.clicks > 0 || m.impressions >= 100) return { url: r.url, verdict: "KEEP", line: `${m.impressions} impressions, ${m.clicks} clicks — keep it.` };
    if (!improved[r.url]) return { url: r.url, verdict: "WEAK", line: "Weak after 90 days — Visibility improves it once, then measures again." };
    return { url: r.url, verdict: "NOINDEX", line: "Still weak after one improvement — Visibility proposes merging it or taking it out of Google; nothing changes without your OK." }; });
}
