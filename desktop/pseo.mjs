/**
 * 🔴 RR-322 B + C · QUALITY + QUANTITY TOGETHER — the market's programmatic method, done better (owner, 24 Oct 2026, final):
 *   UNIVERSE   the head term × its modifiers (profession, destination, sub-test, university, topic, language) — every combination first;
 *   GATE 1     DEMAND, per pattern: 20 sample combinations; 60% or more with demand (Search Console, the client's AI browser search, a
 *              Keyword Planner file, AI research) → the pattern is PROVEN. A combination with no demand but a real, different answer is an
 *              OPPORTUNITY page (the owner's 18 Oct rule) — it is built, in a later batch;
 *   GATE 2     DATA: at least 8 data points of its own; fewer → a SECTION of a bigger page, never a thin page;
 *   GATE 3     DUPLICATE: two pages more than 75% alike → ONE page (the stronger keeps it, the other is "also asked" inside);
 *   CONTENT    every page: a 40–60-word answer with a number at the very top, a real table of its key numbers, steps, costs, a checklist,
 *              the questions people ask, one useful tip, "last updated", the client's own practice test as the call to action — hard facts
 *              (scores, fees, rules, dates) only from a source with its date; explanation may be written by the client's AI;
 *   LINKS      every page ≥ 3: its hub, one topic page, 3–5 related pages; hubs per country and per profession; ≤ 3 clicks from home;
 *   BATCHES    25 → 50 → 100 → 200 → 200 …, the most-searched and the strongest first.
 * Pure: everything is handed in.
 */
import { PEOPLE_WORD, inCountry, gradeLine } from "./recognition.mjs";
import { localDataPoints, localContent } from "./local-pages.mjs"; // RR-327

const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean);
export const GATES = Object.freeze({ sample: 20, demandShare: 0.6, minData: 8, maxAlike: 0.75 });
export const BATCH_SIZES = Object.freeze([25, 50, 100, 200]);
export const SUBTESTS = Object.freeze(["Listening", "Reading", "Writing", "Speaking"]);

/* ── the sub-test facts on the subject's own pages ("OET Writing, at a glance 45 mins in duration …") — numbers only, never its sentences ── */
export function subtestFactsOf(pages) {
  const out = {};
  for (const p of pages.filter((x) => x?.ok)) {
    const s = SUBTESTS.find((x) => new RegExp(`\\b${x}\\b`, "i").test(p.title ?? "")); if (!s) continue;
    const i = p.text.indexOf("at a glance"), g = i >= 0 ? p.text.slice(i, i + 260) : "";
    const n = (re) => re.exec(g)?.[1] ?? null;
    out[s] = { subtest: s, link: p.url, on: p.checkedOn,
      minutes: n(/(\d{2,3})\s*min/i), parts: n(/\b(\w+) parts? in the sub-test/i), questions: n(/(\d{1,3}) questions/i), roleplays: n(/\b(\w+) profession-specific role-?plays?/i), roleplayMinutes: n(/role-?plays? \((\d{1,2}) mins/i), criteria: n(/using (\w+) assessment criteria/i), assessors: /two (official )?(OET )?assessors/i.test(p.text) ? "two" : null };
  }
  return out;
}

/* ── GATE 2 · the data points of a page: each a label, its value, and (for a hard fact) its source and date ── */
export function dataPointsOf(p) {
  const dp = [], add = (label, value, src = null) => { if (value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && !value.length)) dp.push({ label, value: Array.isArray(value) ? value.join(", ") : String(value), ...(src ? { link: src.link, on: src.on } : {}) }); };
  const scores = (p.claims ?? []).find((c) => c.fact === "scores"), listC = (p.claims ?? []).find((c) => c.fromList);
  switch (p.kind) {
    case "regulator": {
      const g = p.confirmedGrade ?? p.grade;
      for (const s of SUBTESTS) add(`${s} grade`, g?.[s.toLowerCase()] ?? null, scores ? { link: scores.link, on: scores.readOn } : listC ? { link: listC.link, on: listC.readOn } : null);
      add("Regulator", p.body); add("Country", p.country); add("Professions", (p.professions ?? []).map((x) => PEOPLE_WORD[x] ?? x));
      for (const f of ["validity", "combining", "steps", "link"]) { const c = (p.claims ?? []).find((x) => x.fact === f); if (c) add(cap(f === "link" ? "official page" : f), c.text, { link: c.link, on: c.readOn }); }
      add("Test fee", p.fee ?? null); add("Where to take it", p.whereTitle ?? null);
      for (const b of p.boards ?? []) add("Board its rule covers", b.body); // RR-323 decision 9
      break;
    }
    case "subtest": {
      const f = p.facts ?? {};
      for (const [k, label] of [["minutes", "Minutes"], ["parts", "Parts"], ["questions", "Questions"], ["roleplays", "Role-plays"], ["roleplayMinutes", "Minutes per role-play"], ["criteria", "Assessment criteria"], ["assessors", "Assessors"]]) add(label, f[k], f.link ? { link: f.link, on: f.on } : null);
      for (const r of p.required ?? []) add(`${p.subtest} grade at ${r.short ?? r.body}`, r.grade, r.src);
      add("Profession", PEOPLE_WORD[p.profession] ?? p.profession); add("Sample tests", p.samples ?? null, p.samplesSrc ?? null);
      break;
    }
    case "university": {
      const u = p.uni ?? {};
      add("University", u.name); add("City", u.city); add("Country", p.country); add("Type", u.type); add("Language of teaching", u.language); add("Accreditation", u.accreditation);
      add("Website", u.page); add("Professions taught", p.professions); add("Fields", (u.fields ?? []).slice(0, 6));
      for (const d of (p.destinations ?? []).slice(0, 6)) add(`Regulators in ${d.country}`, d.count);
      add("OET venue at home", p.home?.venue ? "yes" : p.home ? "no venue named" : null); add("Fee in local money", p.home?.fee ?? null); add("Home council", p.home?.council?.council ?? null);
      break;
    }
    case "taking": for (const s of p.sections ?? []) add(`${s.country}`, `${s.venue ? "venue" : "no venue named"} · ${s.fee}`); add("At home", p.home?.says ?? null); break;
    /* RR-323: a cluster of 45 keywords that all mean "OET fees" is ONE need — the questions count at most 6 data points; the table's rows count */
    case "topic": for (const c of (p.claims ?? []).filter((x) => !x.pointer)) add(c.source ?? "fact", c.text, { link: c.link, on: c.readOn }); for (const r of p.rows ?? []) add(r[0], r.slice(1).join(" · ")); for (const g of (p.questions ?? []).slice(0, 6)) add("Question answered", g.question); for (const x of p.ai?.points ?? []) add("Explained", x); for (const x of p.ai?.steps ?? []) add("Step", x); break;
    /* RR-323 · profession × sub-test × intent: the sub-test's facts, the grades asked for this profession, the original sample's parts */
    case "practice": {
      for (const c of (p.claims ?? []).filter((x) => !x.pointer)) add(c.source ?? "fact", c.text, { link: c.link, on: c.readOn });
      for (const r of p.required ?? []) add(`${p.subtest} grade at ${r.short ?? r.body}`, r.grade, r.src);
      for (const r of p.rows ?? []) add(r[0], r.slice(1).join(" · "));
      const s = p.sample; if (s) { add("Practice sample", s.title); add("Task", s.task); for (const x of (s.caseNotes ?? []).slice(0, 6)) add("Case note", x); for (const x of (s.questions ?? []).slice(0, 6)) add("Practice question", x.q); add("Model answer", s.letter ? `${words(s.letter).length} words` : null); add("Role-play card", s.card?.setting ?? null); }
      for (const x of p.ai?.points ?? []) add("Explained", x); for (const x of p.ai?.steps ?? []) add("Step", x);
      for (const g of (p.questions ?? []).slice(0, 6)) add("Question answered", g.question);
      break;
    }
    case "hub": for (const r of p.rows ?? []) add(r[0], r.slice(1).join(" · ")); break;
    /* RR-327 · country, country × profession, city: their own facts only (desktop/local-pages.mjs) */
    case "country": case "countryprof": case "city": localDataPoints(p, add); break;
    default: break;
  }
  return dp;
}

/* ── GATE 3 · how alike two pages are: their data points (label = value), Jaccard — names count, as on the page ── */
const SIG = new WeakMap();
const sig = (p) => { if (!SIG.has(p)) SIG.set(p, new Set(dataPointsOf(p).map((d) => `${d.label}=${d.value}`.toLowerCase()))); return SIG.get(p); };
export function alike(a, b) { const x = sig(a), y = sig(b); if (!x.size || !y.size) return 0; let both = 0; for (const v of x) if (y.has(v)) both++; return both / (x.size + y.size - both); }

/* ── GATE 1 · demand: a page's questions (by source) — Search Console, the browser search, a Keyword Planner file, AI research ── */
const DEMAND_KINDS = new Set(["search", "observed", "tool", "ai research"]);
export const demandOf = (p) => [...new Set((p.questions ?? []).flatMap((g) => (g.sources ?? []).map((s) => s.kind)).filter((k) => DEMAND_KINDS.has(k)))];
/** a family's pattern: 20 sample combinations, spread over the family (every k-th) → the share with demand */
export function patternDemand(pages) {
  const k = Math.max(1, Math.floor(pages.length / GATES.sample)), sample = pages.filter((_, i) => i % k === 0).slice(0, GATES.sample);
  const withDemand = sample.filter((p) => demandOf(p).length).length, share = sample.length ? withDemand / sample.length : 0;
  return { sample: sample.length, withDemand, share, proven: share >= GATES.demandShare, sampleTitles: sample.map((p) => ({ name: p.title, why: demandOf(p).length ? `demand: ${demandOf(p).join(", ")}` : "no demand found yet" })) };
}

/**
 * The three gates over every family. A page passes → DEMAND (demand found) or OPPORTUNITY (none yet, a real different answer); a regulator
 * page with no score its own page confirms → WAITING (in the plan, never a ready draft); fewer than 8 data points → SECTION of its parent;
 * more than 75% alike another page of its family → MERGED into it. → { families: { kind: { universe, pattern, pages, sections, merged } } }
 */
export function runGates(byKind, { parentOf = () => null, retitle = () => {} } = {}) {
  const families = {};
  for (const [kind, all] of Object.entries(byKind)) {
    const pattern = patternDemand(all), pages = [], sections = [], merged = [];
    for (const p of all) {
      p.dataPoints = dataPointsOf(p);
      p.demand = demandOf(p);
      /* RR-323 decision 9: a board a parent's one rule covers is a SECTION of the parent's page — never a page of its own */
      if (p.sectionOf) { p.status = "section"; p.into = p.sectionOf; sections.push({ name: p.title, why: `a section of "${p.sectionOf}" — ${p.sectionWhy ?? "covered by its rule"}` }); continue; }
      if (p.dataPoints.length < GATES.minData && !p.keepWhole) { p.status = "section"; p.into = parentOf(p); sections.push({ name: p.title, why: `${p.dataPoints.length} data points (fewer than ${GATES.minData}) — a section of ${p.into ?? "a bigger page"}` }); continue; }
      /* duplicates: against the pages already kept of this family (the stronger first: more demand, more data) */
      const twin = pages.find((q) => (q.country === p.country || !p.country) && alike(p, q) > GATES.maxAlike);
      /* the kept page names every one it now covers (a table of them) — "14 state boards ask the same", never a page that hides them */
      if (twin) { p.status = "merged"; p.into = twin.title; (twin.questions ??= []).push(...(p.questions ?? [])); (twin.covers ??= [twin]).push(p); merged.push({ name: p.title, why: `${Math.round(alike(p, twin) * 100)}% alike "${twin.title}" — one page` }); continue; }
      /* RR-323: a page that needs something before it is a ready draft (a sample not written yet, or one that failed the originality check) WAITS */
      p.status = (kind === "regulator" && !p.confirmed) || p.waitFor ? "waiting" : p.demand.length ? "demand" : "opportunity";
      pages.push(p);
    }
    for (const p of pages.filter((x) => x.covers?.length > 1)) { const was = p.title; retitle(p); for (const m of merged) m.why = m.why.replace(`"${was}"`, `"${p.title}"`); if (p.covers.some((q) => q.confirmed)) p.confirmed = true; if (kind === "regulator" && p.confirmed && p.status === "waiting") p.status = p.demand.length ? "demand" : "opportunity"; }
    families[kind] = { universe: all.length, pattern, pages, sections, merged,
      counts: { demand: pages.filter((p) => p.status === "demand").length, opportunity: pages.filter((p) => p.status === "opportunity").length, waiting: pages.filter((p) => p.status === "waiting").length } };
  }
  return families;
}

/* ── LINKS: its hub, one topic page, 3–5 related pages of its family; hubs link their pages; the index links every hub ── */
export function linkPages(pages, hubs, topics, index) {
  const byTitle = new Map(pages.map((p) => [p.title, p]));
  for (const p of pages) {
    if (p.kind === "hub" || p.kind === "index" || p.fixedLinks) continue; // a guide's own links (the practice hub, the A–Z guides) are kept whole
    const hub = hubs.find((h) => (h.country && h.country === p.country && p.kind !== "subtest") || (h.profession && p.profession === h.profession && (p.kind === "subtest" || p.kind === "practice")));
    const near = (q) => (q.profession && q.profession === p.profession ? 2 : 0) + (q.subtest && q.subtest === p.subtest ? 1 : 0) + (q.country && q.country === p.country ? 1 : 0);
    const related = pages.filter((q) => q !== p && q.kind === p.kind && near(q) > 0 && q.status !== "section").sort((a, b) => near(b) - near(a)).slice(0, 5);
    const topic = topics.find((t) => t !== p && t.status !== "section");
    const profHubs = p.kind === "regulator" ? hubs.filter((h) => h.profession && (p.professions ?? []).includes(h.profession)).slice(0, 2).map((h) => h.title) : [];
    const countryHubs = p.kind === "taking" ? hubs.filter((h) => h.country).slice(0, 6).map((h) => h.title) : p.kind === "topic" ? [...pages.filter((q) => q.kind === "taking").map((q) => q.title), ...hubs.filter((h) => h.profession).slice(0, 3).map((h) => h.title)] : [];
    p.links = [...new Set([hub?.title, p.whereTitle, topic?.title, ...related.map((q) => q.title), ...profHubs, ...countryHubs, ...(p.links ?? []), index?.title].filter((t) => t && byTitle.has(t) && t !== p.title))].slice(0, 9);
  }
  for (const h of hubs) if (!h.fixedLinks) h.links = pages.filter((p) => p.kind !== "hub" && p.kind !== "index" && p.kind !== "university" && ((h.country && p.country === h.country && p.kind !== "subtest") || (h.profession && p.profession === h.profession))).map((p) => p.title).slice(0, 200);
  const extra = pages.filter((p) => p.kind === "taking" || (p.kind === "topic" && p.status !== "section")).map((p) => p.title);
  for (const h of hubs) if (!h.fixedLinks) h.links = [...h.links, ...(index ? [index.title] : []), ...extra.slice(0, 3)];
  if (index) index.links = [...hubs.map((h) => h.title), ...extra];
  for (const p of pages.filter((x) => x.kind === "language")) { const base = byTitle.get(p.base); p.links = [p.base, ...(base?.links ?? []).slice(0, 3)]; if (base) base.links = [...(base.links ?? []), p.title]; }
  /* click depth: home → the index (1) → a hub (2) → a page (3) */
  const depth = new Map(); if (index) depth.set(index.title, 1);
  for (const h of hubs) depth.set(h.title, 2);
  for (const h of hubs) for (const t of h.links) if (!depth.has(t)) depth.set(t, 3);
  let changed = true; while (changed) { changed = false; for (const p of pages) if (depth.has(p.title)) for (const t of p.links ?? []) if (!depth.has(t) || depth.get(t) > depth.get(p.title) + 1) { depth.set(t, depth.get(p.title) + 1); changed = true; } }
  for (const p of pages) p.depth = depth.get(p.title) ?? null;
  return { tooDeep: pages.filter((p) => !p.depth || p.depth > 3).map((p) => p.title), fewLinks: pages.filter((p) => p.kind !== "index" && (p.links?.length ?? 0) < 3).map((p) => p.title) };
}

/* ── BATCHES: 25 → 50 → 100 → 200 …; demand pages first (the most countries searching, the most seen), then confirmed and strong ── */
export function batchesOf(pages, reach = () => ({ countries: 0, impressions: 0 })) {
  /* RR-322 proof: 11 of the first 25 were the A–Z university guides (100 rows each) — data points capped, the kind weighs more, guides last.
   * RR-323 (owner decision 7): demand pages by the Keyword Planner range first (its top), then Search Console (countries, then impressions) */
  const score = (p) => { const r = reach(p); return (p.status === "demand" ? 1e15 : 0) + Math.min(9e6, p.kp?.high ?? 0) * 1e7 + r.countries * 1e6 + r.impressions * 10 + (p.status === "waiting" ? -1e17 : 0) + Math.min(30, p.dataPoints?.length ?? 0) * 10 + ({ regulator: 40, country: 36, taking: 35, countryprof: 34, subtest: 30, practice: 30, hub: 28, topic: 25, city: 22, university: 10, language: 5 }[p.kind] ?? 0) * 1000 - (p.fixedLinks ? 1e5 : 0); };
  const ready = pages.filter((p) => p.status !== "waiting" && p.status !== "section" && p.status !== "merged" && p.kind !== "index").sort((a, b) => score(b) - score(a));
  const out = []; let i = 0, k = 0;
  while (i < ready.length) { const n = BATCH_SIZES[Math.min(k, BATCH_SIZES.length - 1)]; out.push(ready.slice(i, i + n).map((p) => p.title)); i += n; k++; }
  return out;
}

/* ── LANGUAGES: a question's language (script, or Roman Urdu / Spanish … words); demand per language; only strong pages translated ── */
const LANG_TEST = [["ur", /[؀-ۿ]/, /\b(kya|kaise|kitni|kitna|hai|hain|mein|ke liye|chahiye|karna)\b/i], ["ar", /[؀-ۿ]/, null], ["hi", /[ऀ-ॿ]/, null], ["zh", /[一-鿿]/, null], ["es", null, /\b(cuánto|cuanto|cómo|como|para|enfermer[ao]s?|examen|precio|requisitos)\b/i], ["pt", null, /\b(quanto|como|para|enfermeir[ao]s?|exame|preço|requisitos)\b/i], ["fr", null, /\b(combien|comment|pour|infirmi[eè]res?|examen|prix|exigences)\b/i], ["de", null, /\b(wie viel|wie|für|pflegekr[aä]fte?|prüfung|kosten|anforderungen)\b/i], ["it", null, /\b(quanto|come|per|infermier[ei]|esame|costo|requisiti)\b/i]];
export function languageOf(text) {
  const t = String(text ?? "");
  if (/[؀-ۿ]/.test(t)) return /[پچژگںھہے]/.test(t) ? "ur" : "ar"; // پ چ ژ گ ں ھ ہ ے are Urdu's own letters
  for (const [code, script, word] of LANG_TEST) { if (script && script.test(t)) return code; if (!script && word && word.test(t) && !/\b(the|is|for nurses|how much)\b/i.test(t)) return code; }
  if (/\b(kya|kaise|kitni|kitna|hai|chahiye|ke liye)\b/i.test(t)) return "ur"; // Roman Urdu
  return "en";
}
export function languageDemand(items, chosen = []) {
  const by = {}; for (const x of items) { const l = languageOf(x.text); if (l === "en") continue; (by[l] ??= []).push(x.text); }
  return Object.entries(by).map(([code, qs]) => ({ code, questions: qs, chosen: chosen.includes(code) })).sort((a, b) => b.questions.length - a.questions.length);
}
/** the strongest pages to make in a language with demand: demand pages with the most data, confirmed; at most 2 per question, 10 at most */
export function strongForLanguage(pages, n) { return pages.filter((p) => p.status === "demand" && p.kind !== "hub" && p.kind !== "index" && (p.dataPoints?.length ?? 0) >= 12).sort((a, b) => b.dataPoints.length - a.dataPoints.length).slice(0, Math.min(10, Math.max(1, n * 2))); }

/* ── CONTENT (B6, B7): the answer first, the table, steps, costs, checklist, the questions answered, one tip, last updated, the CTA ── */
/* the answer is whole sentences: while it is over 60 words the LAST sentence goes (a sentence is never cut) */
/* the proof: a 35-word AI answer popped from the end left 36 words — first try leaving out ONE part (from the back) that lands in 40–60 */
const fitWords = (parts, min = 40, max = 60) => {
  let ss = parts.filter(Boolean).map((x) => String(x).trim()); const n = (xs) => words(xs.join(" ")).length;
  while (ss.length > 1 && n(ss) > max) { const k = [...ss.keys()].slice(1).reverse().find((i) => { const t = n(ss.filter((_, j) => j !== i)); return t >= min && t <= max; }); ss = k === undefined ? ss.slice(0, -1) : ss.filter((_, j) => j !== k); }
  return ss.join(" ").replace(/\s+/g, " ").trim();
};
/** "B in each sub-test" when all four are the same; else each one */
export const gradeSay = (g) => (!g ? null : new Set(SUBTESTS.map((s) => g[s.toLowerCase()])).size === 1 ? `${g.listening} in each sub-test` : SUBTESTS.map((s) => `${s} ${g[s.toLowerCase()]}`).join(", "));
const poss = (w) => (/s$/.test(w) ? `${w}'` : `${w}'s`);
const low = (x) => (x ? String(x).toLowerCase() : x);
export function contentOf(p, { subject, fee = null, where = null, cta = null, on = null }) {
  const people = (p.professions ?? [p.profession]).filter(Boolean).map((x) => PEOPLE_WORD[x] ?? x);
  const feeLine = fee?.ok ? `${subject} costs ${fee.said ?? `${fee.currency} ${fee.amount}`} (${subject}'s own page, ${fee.checkedOn})` : null;
  const dp = p.dataPoints ?? dataPointsOf(p), g = p.confirmedGrade ?? p.grade;
  let answer = null, table = [], steps = [], checklist = [], tip = null;
  if (p.kind === "regulator" && p.coverNames?.length > 1) {
    const gl = g ? gradeLine(g).replace(/ · /g, ", ") : null;
    answer = fitWords([`${p.coverNames.length} regulators in ${inCountry(p.country)} accept ${subject} for ${people.slice(0, 3).join(", ")} with the same grades${gl ? `: ${gl}` : ""} (${p.confirmed ? "a regulator's own page" : `${subject}'s list`}, checked ${p.lastChecked ?? on}).`, `They include ${p.coverNames.slice(0, 3).join(", ")}.`, feeLine ? `${feeLine}.` : null, "Find your own regulator in the table below and open its page before you book."]);
    table = [["Regulator", "Grades"], ...p.covers.map((q) => [q.body, gradeLine(q.confirmedGrade ?? q.grade) ?? "see its page"])];
    steps = [`Find your regulator in the table.`, `Open its own page and check the grade for your profession.`, `Book ${subject} — see "${where ?? `Where to take ${subject}`}".`, `Share your results with that regulator directly through ${subject}'s online account.`];
    checklist = ["Your passport or ID", "Your home registration papers", `Your ${subject} results shared with the regulator`];
    tip = "Each regulator can change its rule on its own date — open your own regulator's page again on the day you book.";
  } else if (p.kind === "regulator") {
    const gl = g ? gradeLine(g).replace(/ · /g, ", ") : null;
    answer = fitWords([`${p.body} accepts ${subject} for ${people.slice(0, 3).join(", ")}${people.length > 3 ? ` and ${people.length - 3} more` : ""} in ${inCountry(p.country)}.`, gl ? `The grades it asks for: ${gl}${p.confirmed ? " (its own page" : ` (${subject}'s list`}, checked ${p.lastChecked ?? on}).` : `Its own page does not state the grades yet — check it before you book.`, (p.claims ?? []).find((c) => c.fact === "validity")?.text ?? null, (p.claims ?? []).find((c) => c.fact === "combining")?.text ?? null, feeLine ? `${feeLine}.` : null, `Book the test, reach these grades, then share your results with ${p.short ?? "the regulator"} directly.`]);
    table = p.boards?.length ? [["Board", "Who", "Grades"], [p.body, people.join(", "), gradeLine(g) ?? "see its page"], ...p.boards.map((b) => [b.body, b.peopleSay ?? (b.professions ?? []).map((x) => PEOPLE_WORD[x] ?? x).join(", "), gradeLine(b.confirmedGrade ?? b.grade) ?? "see its page"])] : [["Sub-test", "Grade asked"], ...SUBTESTS.map((s) => [s, g?.[s.toLowerCase()] ?? "not stated"])];
    steps = [`Check ${p.body}'s own page for your profession (linked below).`, `Book ${subject} where you live — see "${where ?? `Where to take ${subject}`}".`, `Reach the grade in each sub-test.`, `Share your results with ${p.short ?? p.body} directly through ${subject}'s online account.`, `Apply for registration on ${p.short ?? p.body}'s own site.`];
    checklist = ["Your passport or ID as the test centre asks", "Your profession's registration papers from home", `Your ${subject} results shared with the regulator`, "The regulator's application form"];
    tip = `Rules change: open ${p.short ?? p.body}'s own page again on the day you book, and keep the date you read it.`;
  } else if (p.kind === "subtest") {
    const f = p.facts ?? {}, req = (p.required ?? []).slice(0, 4).map((r) => `${r.short ?? r.body} ${r.grade}`).join(", ");
    answer = fitWords([`${subject} ${p.subtest} for ${people[0]}${f.minutes ? ` lasts about ${f.minutes} minutes` : ""}${f.parts ? `, in ${low(f.parts)} parts` : ""}${f.questions ? ` with ${f.questions} questions` : ""}${f.roleplays ? `, with ${low(f.roleplays)} role-plays${f.roleplayMinutes ? ` of ${f.roleplayMinutes} minutes` : ""}` : ""} (${subject}'s own page, ${f.on ?? on}).`, req ? `The ${p.subtest} grade regulators ask ${people[0]} for: ${req}.` : null, p.ai?.answer ?? null, `Practise with ${poss(people[0])} own case types before the test day.`]);
    table = [["Regulator", `${p.subtest} grade for ${people[0]}`], ...(p.required ?? []).map((r) => [`${r.body} (${r.country})`, r.grade])];
    steps = [`Read how ${p.subtest} is marked on ${subject}'s own page.`, `Practise with ${poss(people[0])} case types.`, "Time yourself as on the test day.", `Take a full practice test${cta ? ` on ${cta.label}` : ""}.`];
    checklist = p.ai?.checklist ?? [`Know the ${p.subtest} format`, "Learn the profession's common words", "Practise under time", "Check the grade your regulator asks for"];
    tip = p.ai?.tip ?? `Most marks in ${p.subtest} come from doing the task the way the assessors' criteria describe — read them before you practise.`;
  } else if (p.kind === "university") {
    const d = (p.destinations ?? [])[0], r0 = d?.regulators[0], who = r0 ? /\(([^)]+)\)$/.exec(r0.title)?.[1] ?? r0.title : null;
    const sameAll = (s) => { const l = String(s ?? "").match(/\b[ABC]\+?(?=\s*(·|$))/g) ?? []; return l.length === 4 && new Set(l).size === 1 ? `${l[0]} in each sub-test` : s; };
    const subjects = (p.professions ?? []).slice(0, 4), more = (p.professions ?? []).length - subjects.length;
    answer = fitWords([`${p.coverNames?.length > 1 ? `Graduates of ${p.coverNames.slice(0, 2).join(" and ")}${p.coverNames.length > 2 ? ` and ${p.coverNames.length - 2} more` : ""}` : `${p.uni?.name ?? p.title} graduates`} in ${subjects.join(", ")}${more > 0 ? ` and ${more} more` : ""} can use ${subject} to register in ${(p.destinations ?? []).length} countries where a regulator accepts it.`, d && who ? `In ${inCountry(d.country)}, for example, ${who} asks for ${sameAll(r0.grade) ?? "the grades on its page"}.` : null, p.home ? `At home in ${inCountry(p.country)}, ${subject}'s own pages ${p.home.venue ? "name a venue" : "name no venue"}; the fee is ${String(p.home.fee).split(" — ")[0]}.` : null, p.home?.council ? `The ${p.home.council.council} verifies your home registration.` : null]);
    table = [["Destination", "Regulator", "Grade"], ...(p.destinations ?? []).flatMap((x) => x.regulators.slice(0, 1).map((r) => [x.country, r.title, r.grade ?? "see its page"]))];
    steps = [`Pick the country you want to work in (the table above).`, `Open its regulator's page here and check the grade for ${people[0] ?? "your profession"}.`, `Book ${subject} — see "${where ?? `Where to take ${subject}`}".`, p.home?.council ? `Ask the ${p.home.council.council} to verify your registration.` : "Ask your home council to verify your registration."];
    checklist = ["Your degree certificate and transcript", "Your home registration", `Your ${subject} results`, "Your passport"];
    tip = "Start the home council's verification early — it often takes longer than the test itself.";
  } else if (p.kind === "topic" && p.intent) {
    /* RR-323 · a demand topic: the answer is the subject's own facts first (each with its page and date), then the AI's explanation */
    const facts = (p.claims ?? []).filter((c) => c.fact && !c.pointer).map((c) => c.text.replace(new RegExp(`^${subject}'s own page:? `), "").replace(/^recommends /, `${subject} recommends `));
    const lead = p.lead ?? (p.intent === "fees" && feeLine ? `${feeLine}.` : null);
    answer = fitWords([lead, ...facts.slice(0, 3).map((t) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`), p.ai?.answer ?? null, `Each figure is from ${subject}'s own page, read ${p.lastChecked ?? on}.`]);
    table = p.rows?.length ? [p.head ?? ["Item", "Detail"], ...p.rows] : (p.claims ?? []).filter((c) => !c.pointer).length ? [["Fact", "Source"], ...(p.claims ?? []).filter((c) => !c.pointer).slice(0, 8).map((c) => [c.text, `${c.source}, ${c.readOn}`])] : [];
    const S = { booking: [`Choose on computer, at home or on paper.`, `Check the closing date on ${subject}'s own booking page.`, "Pay the fee and keep the receipt.", "Prepare your ID for test day."], results: [`Finish all four sub-tests.`, "Wait for the release (the table shows when).", `Open your ${subject} account and share the results with your regulator.`], remark: [`Wait for your results in your ${subject} account.`, "Decide within the time limit in the table (it counts from the results' release).", `Ask for the re-mark and pay the fee on ${subject}'s own site — it is not reviewed before payment.`, "Keep the receipt: the page says when the fee is refunded."], fees: [`Find your country in the table.`, `Book and pay on ${subject}'s own site.`, "Keep the receipt."], computer: [`Check your computer against ${subject}'s requirements.`, "Book at least the days ahead the table shows.", "Book Speaking on its own day."], countries: ["Find the country you want to work in.", "Open its regulator's page here for the grade.", `Book ${subject}.`] }[p.intent];
    steps = p.ai?.steps ?? S ?? ["Read the facts above.", `Check ${subject}'s own page on the day you act.`, "Take a practice test."];
    checklist = p.ai?.checklist ?? ["Your passport or ID", `Your ${subject} account`, "The date you read the official page"];
    tip = p.ai?.tip ?? `Rules and dates can change — open ${subject}'s own page (linked above) again on the day you act.`;
  } else if (p.kind === "topic") {
    answer = fitWords([p.ai?.answer ?? null, ...(p.claims ?? []).slice(0, 2).map((c) => c.text), feeLine && /fee|cost|price/i.test(p.title) ? `${feeLine}.` : null]);
    table = (p.claims ?? []).length ? [["Fact", "Source"], ...(p.claims ?? []).slice(0, 6).map((c) => [c.text, `${c.source}, ${c.readOn}`])] : [];
    steps = p.ai?.steps ?? []; checklist = p.ai?.checklist ?? []; tip = p.ai?.tip ?? null;
  } else if (p.kind === "practice") {
    /* RR-323 · a practice page: the format from the subject's own pages (sourced, dated), the grades asked, then the ORIGINAL sample */
    const facts = (p.claims ?? []).filter((c) => c.fact && !c.pointer).map((c) => c.text.replace(new RegExp(`^${subject}'s own page:? `), ""));
    const who = people[0] ? ` for ${people[0]}` : "", req = (p.required ?? []).slice(0, 3).map((r) => `${r.short ?? r.body} ${r.grade}`).join(", ");
    answer = fitWords([facts[0] ? `${p.subtest ? `${subject} ${p.subtest}${who}` : `${subject}${who}`}: ${facts[0].replace(/\.$/, "")} (${subject}'s own page, ${p.lastChecked ?? on}).` : null, ...facts.slice(1, 3).map((t) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`), req ? `Regulators ask ${people[0] ?? "candidates"} for ${p.subtest} ${req}.` : null, p.intent === "sample" ? `Below: a practice sample written by AlmiOET, not an official ${subject} paper.` : p.ai?.answer ?? null]);
    table = p.rows?.length ? [p.head ?? ["Item", "Detail"], ...p.rows] : p.required?.length ? [["Regulator", `${p.subtest} grade${who}`], ...p.required.map((r) => [`${r.body} (${r.country})`, r.grade])] : facts.length ? [["Fact", "Source"], ...(p.claims ?? []).filter((c) => c.fact).map((c) => [c.text, `${c.source}, ${c.readOn}`])] : [];
    steps = p.ai?.steps ?? (p.intent === "sample" ? ["Set a timer to the test's time.", "Do the practice sample below without notes.", "Check it against the criteria above.", `Take a full practice test${cta ? ` on ${cta.label}` : ""}.`] : ["Read the criteria above.", "Pick one mistake to fix this week.", "Practise under time.", "Take a practice test."]);
    checklist = p.ai?.checklist ?? ["A timer", "The criteria from the official page", "A quiet room", "A way to record or write your answer"];
    tip = p.ai?.tip ?? (p.subtest ? `In ${p.subtest}, read the assessors' criteria before you practise — marks follow the criteria, not length.` : "Practise one sub-test a day, and a full test every few weeks.");
  } else if (p.kind === "country" || p.kind === "countryprof" || p.kind === "city") {
    ({ answer, table, steps, checklist, tip } = localContent(p, { subject, fit: fitWords, cta }));
  } else if (p.kind === "hub" || p.kind === "index") {
    answer = fitWords([p.intro]); table = [p.head ?? ["Item", "Detail"], ...(p.rows ?? [])];
  } else if (p.kind === "taking") {
    answer = fitWords([`${subject} can be taken at venues in ${(p.sections ?? []).filter((s) => s.venue).length} countries named on ${subject}'s own pages, and at home where no venue exists yet.`, feeLine ? `${feeLine}; in your own money it is shown below, from each country's central bank where Visibility could read it.` : null]);
    table = [["Country", "Venue", "Fee"], ...(p.sections ?? []).map((s) => [s.country, s.venue ? "yes" : "none named", s.fee])];
    steps = ["Find your country below.", "Check the venue or take it at home.", `Book on ${subject}'s own site.`]; checklist = ["Your ID", "A card for the fee", "Your profession"]; tip = "Book early in busy months — places at venues fill first.";
  }
  const n = words(answer).length;
  return { answer, answerWords: n, answerHasNumber: /\d/.test(answer ?? ""), table: table.length > 1 ? table : [], points: [...(p.ai?.points ?? []), ...(p.localPoints ?? [])] /* RR-327: a university page's country — its searches and its venue cities */, steps, checklist, faq: (p.questions ?? []).slice(0, 8).map((q) => q.question), tip, lastUpdated: String(on).slice(0, 10), cta };
}

/* ── C2 · the template "read aloud": five pages of a family — how much of their wording is the same once names and numbers are taken out ── */
export function templateCheck(pages, { sample = 5 } = {}) {
  const k = Math.max(1, Math.floor(pages.length / sample)), five = pages.filter((_, i) => i % k === 0).slice(0, sample);
  const strip = (s) => String(s ?? "").replace(/\d[\d,.]*/g, "#").replace(/\b[A-Z][\w'’-]*(\s+[A-Z][\w'’-]*)*/g, "N").toLowerCase();
  const answers = five.map((p) => strip(p.content?.answer));
  const same = answers.length > 1 ? answers.filter((a, i) => answers.some((b, j) => j !== i && a === b)).length / answers.length : 0;
  return { sample: five.map((p) => ({ title: p.title, answer: p.content?.answer ?? null })), sameWording: same, fillInTheBlanks: same >= 0.6 };
}
