/**
 * 🔴 RR-360 (owner, 1 Nov 2026, ruling R13) · THE APP READS ALMISEO DATA — AlmiWorld's own collectors, for the product's OWN subject only (the
 * RR-359 isolation stays): all its keywords by relevance with their volumes (question-type keywords become questions), the question groups, the
 * country facts with their review state, the collectors' page plan and the saved coverage lists. On start, on a schedule and before each run;
 * the file says when it was last read. A client never needs DataForSEO or any other service for this.
 *
 * WHY THE APP GOT SO LITTLE BEFORE (measured on the owner's AlmiOET folder, 1 Nov 2026): it asked the service for the ONE seed word "oet" — a
 * different search from the collector's ("seeds:<hash>", 10 seeds), so it never read what the collector holds, only Google's answer to that
 * one word — in 19 locations of the collector's 193 (529 keywords); it asked the facts of 10 countries only; no route gave it the question
 * groups or the collectors' page plan at all.
 *
 * G5's order, per intent: (1) the saved coverage list from AlmiSEO Data → (2) the client's own AI in the client's own browser (free) → (3) the
 * client's own paid service, ONLY if the client switched it on. The ledger says which route answered.
 */
import { cleanCoverage, meaningOf } from "./coverage.mjs";
import { secondSearch } from "./recipe.mjs";
import { COUNTRIES } from "./world.mjs";
import { KIND, clearQuestion } from "./page-types.mjs"; // RR-362
import { licenceHeaderOf, LICENCE_HEADER, SERVICE_URL } from "./keyword-service.mjs";

export const ALMISEO_FILE = "almiseo.json", ALMISEO_KEYWORDS = "almiseo-keywords.json", BROWSER_COVERAGE = "browser-coverage.json";
export const SYNC = Object.freeze({ everyHours: 12, firstMs: 20000, beforeRunHours: 6, maxKeywordPages: 400, maxCountryPages: 10, historyDays: 8 });
export const ROUTES = Object.freeze({ saved: "saved", browser: "browser", paid: "paid", none: "none" });
export const ROUTE_LINE = Object.freeze({
  saved: "AlmiSEO Data's saved list of Google's top results",
  browser: "your own AI, in your own browser",
  paid: "your own paid service, which you switched on",
  none: "not read yet",
});
export const NOT_READ_LINE = "AlmiSEO Data holds no saved list for this page yet. You can have your own AI read Google's results in your own browser, free (Research → Use my AI in my browser). No other service is needed.";

/** the service's answers — read only, the licence checked by the server. fetchImpl handed in (tests: the service's own handler) */
export function almiSeoClient({ siteUrl = SERVICE_URL, signed = null, fetchImpl = fetch } = {}) {
  const call = async (path, init = {}) => {
    if (!signed) return { ok: false, why: "Add your plan first (Your plan) — AlmiSEO Data checks it." };
    let r, j;
    try { r = await fetchImpl(new URL(path, siteUrl), { ...init, headers: { ...(init.headers ?? {}), [LICENCE_HEADER]: licenceHeaderOf(signed) }, signal: AbortSignal.timeout(60000) }); j = await r.json().catch(() => ({})); }
    catch { return { ok: false, why: "AlmiSEO Data did not answer — check the internet connection; the app tries again by itself." }; }
    return r.ok && j.ok ? j : { ok: false, why: j.why ?? `AlmiSEO Data answered ${r.status}.`, status: r.status };
  };
  return Object.freeze({
    part: (part, subject, page = 0) => call(`v1/almiseo?subject=${encodeURIComponent(subject)}&part=${part}${page ? `&page=${page}` : ""}`),
    register: (b) => call("v1/almiseo/topic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }),
    saveSearches: (b) => call("v1/almiseo/saved", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }),
  });
}

const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
/**
 * One read of AlmiSEO Data for one product: the whole answer, or nothing changed (a failed read keeps the last one, said so).
 * read(name, default) / write(name, value) = the product's own folder. → { ok, line, summary?, why? }
 */
export async function syncProduct({ client, subject, name = null, site = null, countries = [], intents = [], read, write, now = new Date().toISOString() }) {
  const old = read(ALMISEO_FILE, null), kept = String(old?.subject ?? "").toLowerCase() === String(subject ?? "").toLowerCase() ? old : null;
  if (!subject) return { ok: false, why: "no subject yet" };
  /* the collectors start on the product's subject when it is first added — the same subject of two clients is one topic */
  const reg = await client.register({ subject, name, site, countries, intents: intents.slice(0, 100) });
  const sum = await client.part("summary", subject);
  if (!sum.ok) { write(ALMISEO_FILE, { ...(kept ?? { subject }), subject, triedOn: now, lastWhy: sum.why }); return { ok: false, why: sum.why, line: kept?.readOn ? `AlmiSEO Data could not be read just now (${sum.why}) — what it gave on ${dayOf(kept.readOn)} is used.` : `AlmiSEO Data could not be read just now (${sum.why}).` }; }
  if (!sum.topic) { write(ALMISEO_FILE, { subject, readOn: now, topic: null, line: sum.line, registered: reg.ok ?? false, history: kept?.history ?? [] }); return { ok: true, empty: true, line: sum.line }; }
  /* 🔴 OWNER'S RULING 2: an outside client's app is sent finished page content only: it asks for nothing else and keeps nothing else */
  if (sum.outside) {
    const kit = await client.part("pages", subject);
    if (!kit.ok) { write(ALMISEO_FILE, { ...(kept ?? { subject }), subject, triedOn: now, lastWhy: kit.why }); return { ok: false, why: kit.why, line: `AlmiWorld's research could not be read just now (${kit.why}).` }; }
    const n = (kit.plan ?? []).length, line = `AlmiWorld's research: ${n} page${n === 1 ? "" : "s"} ready to make for ${subject}.`;
    write(ALMISEO_FILE, { subject, readOn: now, outside: true, topic: kit.topic ?? null, plan: kit.plan ?? [], countries: kit.countries ?? {}, counts: { pages: n }, line });
    return { ok: true, outside: true, line, counts: { pages: n } };
  }
  /* every page of every part — all the keywords, not a sample */
  const rows = []; let pages = 1, seen = sum.keywords?.allowed ? 0 : -1, kwFailed = null;
  if (sum.keywords?.allowed) for (let p = 0; p < Math.min(pages, SYNC.maxKeywordPages); p++) { const k = await client.part("keywords", subject, p); if (!k.ok) { kwFailed = k.why; break; } rows.push(...k.rows); pages = k.pages || 1; seen = k.total; }
  const qs = await client.part("questions", subject), plan = await client.part("plan", subject), cov = await client.part("coverage", subject), packets = {};
  let cp = 1, cFailed = null; for (let p = 0; p < Math.min(cp, SYNC.maxCountryPages); p++) { const c = await client.part("countries", subject, p); if (!c.ok) { cFailed = c.why; break; } Object.assign(packets, c.countries); cp = c.pages || 1; }
  /* keywords only when the whole list arrived (a list cut by a failed page never replaces a whole one) */
  if (!kwFailed) write(ALMISEO_KEYWORDS, { subject, on: now, rows });
  const line = { on: dayOf(now), keywords: kwFailed ? (kept?.counts?.keywords ?? 0) : rows.length, questions: (qs.groups ?? []).length, countries: Object.keys(packets).length, allParts: Object.values(packets).filter((p) => p.complete).length, plan: (plan.pages ?? []).length, coverage: (cov.lists ?? []).length };
  const history = [...(kept?.history ?? []).filter((h) => h.on !== line.on), line].slice(-SYNC.historyDays);
  write(ALMISEO_FILE, { subject, readOn: now, topic: sum.topic, summary: sum, keywordsAllowed: Boolean(sum.keywords?.allowed), questions: qs.groups ?? [], asked: qs.asked ?? [], countries: cFailed ? kept?.countries ?? {} : packets, plan: plan.pages ?? [], counter: plan.counter ?? null, coverage: cov.lists ?? [], review: sum.review ?? [], counts: line, history, ...(kwFailed || cFailed ? { partial: kwFailed ?? cFailed } : {}) });
  void seen;
  return { ok: true, counts: line, line: `AlmiSEO Data read: ${line.keywords.toLocaleString("en-US")} keywords, ${line.questions} question groups, ${line.countries} countries (${line.allParts} with all their parts), ${line.plan} planned pages.` };
}
/** the file, only for this subject (RR-359) */
export const heldFor = (file, subject) => (file && String(file.subject ?? "").toLowerCase() === String(subject ?? "").toLowerCase() ? file : null);

/** ALL its keywords as demand; a question-type keyword is a question — each with its volume and where it came from */
export const KEYWORD_SOURCE = "AlmiSEO Data";
export function keywordItems(file, subject) {
  const f = heldFor(file, subject); if (!f) return [];
  return (f.rows ?? []).map((r) => ({ text: r.k, source: KEYWORD_SOURCE, on: r.d ?? String(f.on).slice(0, 10), kind: r.q ? "question" : "search", volume: r.v ?? null, weight: (r.q ? 5 : 4) + (Number(r.v) > 0 ? Math.log10(1 + Number(r.v)) : 0) }));
}
/** the question groups as demand evidence — never as facts */
export function questionItems(file, subject) {
  const f = heldFor(file, subject); if (!f) return [];
  const seen = new Set(), out = [];
  const add = (text, source, on, weight) => { const k = String(text ?? "").toLowerCase().trim(); if (!k || seen.has(k)) return; seen.add(k); out.push({ text, source, on: on ?? null, kind: "question", weight }); };
  for (const q of f.questions ?? []) { add(q.question, `AlmiSEO Data's question bank (${q.country})`, q.on, 6); for (const w of q.wordings ?? []) add(w, `AlmiSEO Data's question bank (${q.country})`, q.on, 5); }
  for (const q of f.asked ?? []) add(q.text, `AlmiSEO Data's question bank (${q.source})`, q.on, 4);
  return out;
}

/* ── G5's ORDER ── */
const sameWords = (a, b) => { const x = meaningOf(a), y = meaningOf(b); return x.length > 0 && x.length === y.length && x.every((w) => y.includes(w)); };
/** which saved list answers this page: its own plan row (the same country, profession, kind), or the same words as its title */
export function savedListFor(page, file) {
  const lists = file?.coverage ?? []; if (!lists.length) return null;
  /* RR-362: C and D are the collectors' country × profession rows; the same search, never bought twice */
  const kind = page.kind === KIND.destination || page.kind === KIND.origin ? "country-profession" : page.kind;
  const row = (file.plan ?? []).find((p) => p.kind === kind && (p.country ?? null) === (page.country ?? null) && (p.profession ?? null) === (page.profession ?? null) && (page.kind !== "question" || sameWords(p.title, page.title)));
  return lists.find((l) => row && l.intent === row.title) ?? lists.find((l) => l.intent === page.title || sameWords(l.intent, page.title)) ?? null;
}
/**
 * Every page's coverage by the order above. Mutates each page: coverage, second, topRead, coverageRoute, coverageOn. `browser` = browser-coverage.json;
 * `paid(pages)` runs the client's own paid service for the pages still unanswered (only when the client switched it on). → the counts per route
 */
export async function coverageRoutes({ pages, file, browser = {}, paidOn = false, paid = null }) {
  const n = { saved: 0, browser: 0, paid: 0, none: 0 }, left = [];
  for (const p of pages) {
    const s = savedListFor(p, file), b = browser?.[p.title] ?? null;
    /* RR-362: what people asked comes with a saved list too (a page needs the questions as much as a paid search would bring them) */
    if (s) { Object.assign(p, { coverage: s.coverage ?? [], second: s.second ?? [], topRead: s.read ?? [], coverageRoute: ROUTES.saved, coverageOn: s.on, questions: [...(p.questions ?? []), ...(s.asked ?? []).filter((q) => !(p.questions ?? []).some((x) => (x.question ?? x) === q)).map((question) => ({ question, source: `what people search (${s.on})`, on: s.on }))] }); delete p.serpWhy; n.saved++; continue; }
    if (b) { Object.assign(p, { coverage: b.coverage ?? [], second: b.second ?? [], topRead: b.read ?? [], coverageRoute: ROUTES.browser, coverageOn: b.on }); delete p.serpWhy; n.browser++; continue; }
    left.push(p);
  }
  let paidResult = null;
  if (left.length && paidOn && paid) { paidResult = await paid(left); for (const p of left) { if (p.topRead?.length || p.coverage?.length) { p.coverageRoute = ROUTES.paid; n.paid++; } else { p.coverageRoute = ROUTES.none; n.none++; } } }
  else for (const p of left) { p.coverageRoute = ROUTES.none; n.none++; }
  return { counts: n, paid: paidResult, line: `Google's results by route: ${n.saved} saved in AlmiSEO Data, ${n.browser} from your own AI in your own browser, ${n.paid} from your own paid service, ${n.none} not read yet.` };
}
/*
 * 🔴 RR-362 item 14 (owner's run: "0 saved in AlmiSEO Data"): what this run searched is sent to AlmiSEO Data under the name the collectors' plan gives that page, so neither the server collector nor a later run buys it again.
 * Only what a search gave: addresses, topics, questions. → the lists to send
 */
const planRowTitle = (page, file) => { const kind = page.kind === KIND.destination || page.kind === KIND.origin ? "country-profession" : page.kind; return (file?.plan ?? []).find((p) => p.kind === kind && (p.country ?? null) === (page.country ?? null) && (p.profession ?? null) === (page.profession ?? null) && kind !== "question")?.title ?? null; };
export const searchedLists = (pages, file) => pages.filter((p) => p.coverageRoute === ROUTES.paid && p.searchedOn).map((p) => ({ intent: planRowTitle(p, file) ?? p.title, on: p.searchedOn, read: p.topRead ?? [], paa: p.paa ?? [], related: p.related ?? [], coverage: (p.coverage ?? []).map((c) => c.topic ?? c), second: (p.second ?? []).map((x) => x.question ?? x) }));
/** the run's one line: saved · reused · bought (R13), and what is left for tomorrow */
export function searchCounts({ routes, paid = null, saved = 0 }) {
  const reused = (routes?.saved ?? 0) + (routes?.browser ?? 0) + (paid?.reused ?? 0), bought = paid?.bought ?? 0, cost = paid?.cost ?? 0, later = routes?.none ?? 0;
  return { saved, reused, bought, cost, later, line: `Searches: ${saved} saved in AlmiSEO Data, ${reused} reused free, ${bought} bought ($${cost.toFixed(2)}).${later ? ` ${later} page${later === 1 ? "" : "s"} will be checked tomorrow.` : ""}` };
}
/** one page's ledger line: which route answered */
export const routeLine = (p, serpWhy = null) => { const r = p?.coverageRoute ?? ROUTES.none; return r === ROUTES.none ? (serpWhy ?? NOT_READ_LINE) : `${(p.topRead ?? []).length} top results read for what they cover (never copied, no fact taken) — from ${ROUTE_LINE[r]}${p.coverageOn ? `, ${p.coverageOn}` : ""}.`; };

/* ── ROUTE 2: the client's own AI, in the client's own browser ── */
export const coverageItems = (pages, { max = 30 } = {}) => pages.filter((p) => p.coverageRoute === ROUTES.none).slice(0, max).map((p) => ({ kind: "coverage", url: `https://www.google.com/search?q=${encodeURIComponent(p.title)}`, label: p.title, why: "what Google's top results cover for this page" }));
/**
 * What the client's AI handed in → browser-coverage.json entries: ONLY addresses and headings, through the junk filter; a page's text is never
 * read from the file. `reads` = takeBrowserReads(...).pages, each with rows [{ url, headings }] and paa.
 */
export function coverageFromBrowser(reads, { subject, now = new Date().toISOString() }) {
  const out = {};
  for (const r of reads) {
    if (r.kind !== "coverage") continue;
    const tops = (r.rows ?? []).filter((x) => /^https?:\/\//.test(x?.url ?? "") && !/reddit\.com|quora\.com/.test(x.url)).slice(0, 10).map((x) => ({ url: x.url, title: "", headings: (Array.isArray(x.headings) ? x.headings : []).map(String).slice(0, 40), text: "" }));
    const paa = (Array.isArray(r.paa) ? r.paa : []).map(String).slice(0, 12), words = { subject, title: r.label, now, names: COUNTRIES }, coverage = cleanCoverage({ results: tops, paa, ...words });
    out[r.label] = { on: String(r.date ?? now).slice(0, 10), coverage, second: secondSearch({ best: tops[0] ?? null, paa, coverage, subject, title: r.label }), read: tops.map((t) => t.url) };
  }
  return out;
}

/*
 * 🔴 RR-360 B · A PRODUCT OF ANY KIND GETS PAGES FROM ALMISEO DATA (found by the real-run test: a client's subject with checked answers made 0 pages —
 * only an exam-prep product read the collectors' plan). Each planned country page and question page, each answer with its official page and day;
 * a row without a checked answer makes no page, said. No fact from anywhere else; nothing is exam-shaped here.
 */
export const PART_WORDS = Object.freeze({ fee: "the fee", centres: "where it is taken", offices: "the offices that ask for it", rules: "a rule of its own", cvNorms: "the CV norms there", employment: "the public employment service", workRules: "the work-permit rule", workPermit: "the work-permit rule", recognition: "who recognises foreign qualifications", universities: "the universities", admission: "the admission rule", studentVisa: "the student-visa office", scholarships: "a government scholarship", minimumWage: "the minimum wage", averageSalary: "the average salary", tax: "the tax authority", currency: "the currency" });
const HOST = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
const FIGURE = /(?:[A-Z]{3}|[$£€])\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:%|percent|days?|weeks?|months?|years?|hours?|minutes?)\b/;
const claimFrom = (id, text, f) => ({ claimId: id, card: FIGURE.exec(String(text))?.[0] ?? null, text: String(text), link: f.source, readOn: String(f.readOn).slice(0, 10), source: `${HOST(f.source) ?? "its official page"} — its official page`, official: true });
const okFact = (f) => /^https:\/\//.test(f?.source ?? "") && /^\d{4}-\d{2}-\d{2}/.test(f?.readOn ?? "");
export function genericPlanPages({ file, subject }) {
  const pages = [], notBuilt = [], seen = new Set();
  const qsOf = (c) => (file.countries?.[c]?.parts?.questions ?? []).filter((f) => okFact(f) && f.value?.question && f.value?.answer && f.value?.answerKind !== "guidance" && clearQuestion(f.value.question, { place: c }) /* RR-362 item 19 */);
  for (const r of file.plan ?? []) {
    const k = String(r.title).toLowerCase().trim(); if (seen.has(k)) continue;
    if (r.kind === "country") {
      const P = file.countries?.[r.country]?.parts ?? {}, items = [];
      for (const [part, facts] of Object.entries(P)) { if (part === "questions") continue; const claims = facts.filter(okFact).map((f, i) => { const t = f.value?.text ?? (f.value?.name ? `${f.value.name}${/^https?:/.test(f.value.website ?? "") ? ` — ${f.value.website}` : ""}` : null); return t ? claimFrom(`${part}-${r.country}-${i}`.replace(/\s+/g, "-"), t, f) : null; }).filter(Boolean); if (claims.length) items.push({ part, question: `${subject} in ${r.country}: ${PART_WORDS[part] ?? part}`, claims }); }
      qsOf(r.country).slice(0, 6).forEach((f, i) => items.push({ part: `questions${i}`, question: f.value.question, claims: [claimFrom(`q-${r.country}-${i}`.replace(/\s+/g, "-"), f.value.answer, f)] }));
      if (!items.length) { notBuilt.push({ title: r.title, why: "no checked answer here" }); continue; }
      seen.add(k); pages.push({ kind: "country-facts", country: r.country, title: r.title, questions: qsOf(r.country).map((f) => ({ question: f.value.question, source: `AlmiWorld's question collector — ${r.country}`, on: String(f.readOn).slice(0, 10) })), items, content: null, open: [], ledger: [] });
    } else if (r.kind === "question") {
      const f = qsOf(r.country).find((x) => String(x.value.question).toLowerCase() === String(r.question).toLowerCase());
      if (!f) { notBuilt.push({ title: r.title, why: "its answer is not among the checked facts read here" }); continue; }
      seen.add(k); pages.push({ kind: "question", country: r.country, title: r.title, questions: [{ question: r.question, source: `AlmiWorld's question collector — ${r.country}`, on: String(f.readOn).slice(0, 10) }], items: [{ part: "questions0", question: r.question, claims: [claimFrom(`q-${k}`.replace(/[^a-z0-9]+/g, "-").slice(0, 60), f.value.answer, f)] }], content: null, open: [], ledger: [] });
    }
  }
  for (const p of pages) { p.claims = p.items[0].claims; p.lastChecked = p.items.flatMap((it) => it.claims.map((c) => c.readOn)).sort().at(-1) ?? null; p.weak = !p.questions.length; p.links = pages.filter((x) => x !== p && x.country === p.country).map((x) => x.title).slice(0, 8); }
  return { pages, notBuilt, counts: { country: pages.filter((p) => p.kind === "country-facts").length, question: pages.filter((p) => p.kind === "question").length }, skipped: [], existing: [] };
}

/* ── REVIEW NEEDED: a changed fee, date, score or rule of this subject holds the pages that show it ── */
export function reviewLinesFor(page, file) {
  return (file?.review ?? []).filter((r) => !page.country || String(r.text).startsWith(`${page.country}:`)).filter((r) => page.country ? true : !/^[^:]+:/.test(String(r.text))).map((r) => `Review needed — the official page changed (${r.kind}): was "${r.was}", now "${r.now}" (${r.link}, read ${r.on}).`);
}

/* ── THE "ALMISEO DATA" PAGE ── numbers only as measured; a number the server could not give is said so ── */
export function almiSeoView(file, { subject = null, nowDay = dayOf(new Date()), planOk = true } = {}) {
  if (!subject) return { state: "NO_SUBJECT", line: "Tell Visibility what this product is about (Settings → Your product) — AlmiSEO Data is read for that subject only." };
  if (!planOk) return { state: "NO_PLAN", line: "Add your plan first (Your plan) — AlmiSEO Data comes with every plan." };
  const f = heldFor(file, subject);
  /* RULING 2: an outside client sees the pages ready, nothing about what stands behind them */
  if (f?.outside && f.readOn) return { state: "PAGES", subject, readOn: f.readOn, pages: f.counts?.pages ?? 0, line: `${f.line} Last read ${String(f.readOn).slice(0, 16).replace("T", " ")}.` };
  if (!f?.readOn) return { state: "NOT_READ", line: f?.lastWhy ? `AlmiSEO Data could not be read yet: ${f.lastWhy}` : "AlmiSEO Data has not been read yet — the app reads it by itself on start.", triedOn: f?.triedOn ?? null };
  if (!f.topic) return { state: "EMPTY", line: f.line, readOn: f.readOn };
  const s = f.summary ?? {}, h = f.history ?? [], c = f.counts ?? {}, base = h.filter((x) => x.on < nowDay), weekBase = h.find((x) => x.on >= dayOf(Date.parse(`${nowDay}T00:00:00Z`) - 7 * 864e5) && x.on < nowDay) ?? null, yesterday = base.at(-1) ?? null, diff = (b, k) => (b ? Math.max(0, (c[k] ?? 0) - (b[k] ?? 0)) : null);
  return { state: "READ", subject, topic: f.topic.name, readOn: f.readOn, lastRefresh: s.lastRefresh ?? null, partial: f.partial ?? null, triedOn: f.triedOn ?? null, lastWhy: f.lastWhy ?? null,
    keywords: { count: c.keywords ?? 0, allowed: f.keywordsAllowed === true, line: s.keywords?.line ?? null, today: s.keywords?.today ?? null, week: s.keywords?.week ?? null },
    questions: { groups: c.questions ?? 0, answered: s.questions?.answered ?? null, asked: s.questions?.asked ?? null },
    countries: { held: c.countries ?? 0, allParts: c.allParts ?? 0, waitingReview: s.countries?.waitingReview ?? null, list: Object.values(f.countries ?? {}).filter((p) => p.complete).map((p) => p.country) },
    topPages: { lists: c.coverage ?? 0, read: s.topPages?.read ?? null, on: s.topPages?.on ?? false }, plan: { pages: c.plan ?? 0 },
    arrived: { today: { facts: s.arrived?.today ?? null, keywords: s.keywords?.today ?? null, sinceYesterday: diff(yesterday, "keywords") }, week: { facts: s.arrived?.week ?? null, keywords: s.keywords?.week ?? null, sinceThen: diff(weekBase, "keywords") } },
    review: f.review ?? [], line: `AlmiSEO Data for ${subject}: ${(c.keywords ?? 0).toLocaleString("en-US")} keywords · ${c.questions ?? 0} question groups · ${c.countries ?? 0} countries (${c.allParts ?? 0} with all their parts) · ${c.plan ?? 0} planned pages. Last read ${String(f.readOn).slice(0, 16).replace("T", " ")}.` };
}
