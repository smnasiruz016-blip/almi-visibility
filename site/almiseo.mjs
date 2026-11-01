/**
 * 🔴 RR-360 (owner, 1 Nov 2026, ruling R13) · ALMISEO DATA — AlmiWorld's own collectors, connected to the app for every client.
 * The owner's dashboard showed what the collectors hold; no route gave it to the app. This module is that route's logic:
 *   · ONE TOPIC LIST (every product of every client; the owner adds any idea in one line) — nothing here is tied to exams or languages;
 *   · each topic's keywords by relevance, question groups, country facts with their review state, the collectors' page plan, the saved
 *     coverage lists (site/top-pages.mjs), and the facts that changed — each answer ONLY for the topic of the subject asked (RR-359 isolation);
 *   · ONE findings store (source link + date, no repeats, "fact changed" → review needed + an e-mail to the owner);
 *   · ONE spend ledger and the per-plan monthly limits.
 *
 * 🔴 OWNER'S RULING 2 (1 Nov 2026, after RR-360): OUTSIDE CLIENTS GET THE FINISHED PAGES ONLY. Never keywords, volumes, keyword lists, coverage lists or any raw
 * data — they never even reach a client's computer. A client's licence is answered ONLY with page content: each question in OUR OWN words, each answer with its
 * official page and day. AlmiWorld's own licence reads everything. Google is not asked for a client's subject (Google's Ads policy, read 1 Nov 2026).
 */
import { createHash } from "node:crypto";
import { PRODUCT_FACTS, FACT_PRODUCTS, templateOf, setClientTemplates } from "../desktop/product-facts.mjs";
import { PLANS } from "../desktop/licence.mjs";
import { doneIn, pageCounts, countryPacket, CF_PROFESSIONS, councilFound, SHOWN_STATUS, productPartsOf, waiting, isQuestion } from "../desktop/country-facts.mjs";
import { COUNTRIES } from "../desktop/world.mjs";
import { PRODUCT_NAMES } from "./owner-status.mjs";
import { capsOf } from "./cf-collector.mjs";
import { DEFAULT_QUEUE, FIRST_15 } from "./queue.mjs";
import { PLAN_LOCATIONS, normSeed, LOCATIONS } from "./kw-seeds.mjs";

export const ALMISEO = Object.freeze({ keywordsPerPage: 5000, countriesPerPage: 40, clientCountries: 5, reviewParts: Object.freeze(["fee", "rules", "dates", "scores", "workRules", "workPermit", "admission", "minimumWage"]) });
export const ENV_NAMES = Object.freeze({ alertEmail: "ALMISEO_ALERT_EMAIL", topPagesOn: "ALMISEO_TOP_PAGES_ON", dfsLogin: "ALMISEO_DATAFORSEO_LOGIN", dfsPassword: "ALMISEO_DATAFORSEO_PASSWORD", topPagesUsd: "ALMISEO_TOP_PAGES_USD_PER_DAY", topPagesReads: "ALMISEO_TOP_PAGES_READS_PER_DAY", topPagesBudget: "ALMISEO_TOP_PAGES_BUDGET_USD" });
export const JOBS = Object.freeze({ keywords: "keywords", questions: "questions", facts: "country facts", "top-pages": "top pages", market: "market needs (not built yet)", competitors: "similar apps (not built yet)", tools: "new tools (not built yet)" });
export const LIVE_JOBS = Object.freeze(["keywords", "questions", "facts", "top-pages"]);
/* the proposed limits (OWNER'S MONEY DECISION — a setting, changed on /owner/almiseo): what one client's collecting may cost AlmiWorld per month,
 * and how many countries each of its products gets: about a tenth of the plan's price */
export const DEFAULT_PLAN_LIMITS = Object.freeze({ visibility_1: Object.freeze({ usdMonth: 3, countries: 5 }), visibility_5: Object.freeze({ usdMonth: 5, countries: 5 }), visibility_10: Object.freeze({ usdMonth: 8, countries: 10 }), visibility_unlimited: Object.freeze({ usdMonth: 12, countries: 15 }) });
/* OWNER'S RULING 1: the $50 he topped up on AlmiWorld's own account is the TOTAL: the collector stops by itself when it is spent */
export const TOP_PAGES_CAPS = Object.freeze({ usdPerDay: 1, readsPerDay: 300, refreshDays: 30, budgetUsd: 50, searchReserveUsd: 0.01 });
export const TOP_PAGES_JOB = "top-pages", TOP_PAGES_READS_JOB = "top-pages-reads";
export const RESEARCH_CAP = Object.freeze({ usdPerDay: 1, built: false });

export const norm = (s) => normSeed(s);
export const accountHash = (a) => createHash("sha256").update(`almiseo|${a}`).digest("hex").slice(0, 24);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const daysBefore = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) - n * 864e5).toISOString().slice(0, 10);
const esc = (w) => String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ── ONE TOPIC LIST ── */
/* AlmiVisibility has keywords and questions and no country template; every other product has its own */
const VIS = Object.freeze({ id: "visibility", name: "AlmiVisibility", subject: "AlmiVisibility", words: Object.freeze(["seo", "keyword research", "website audit", "ai search", "almivisibility"]) });
const FALLBACK_TEMPLATE = Object.freeze({ parts: Object.freeze(["questions"]) });
const tplOf = (id) => templateOf(id) ?? FALLBACK_TEMPLATE;
/** AlmiWorld's own products as topics (their subject words and seeds from the seed list the owner keeps) */
export function ownTopics(groups = []) {
  const seedsOf = (p, d) => groups.find((g) => g.kind === "product" && g.key === p)?.seeds ?? d;
  return [...FACT_PRODUCTS.map((p) => ({ id: p, name: PRODUCT_NAMES[p] ?? p, subject: PRODUCT_FACTS[p].name, words: PRODUCT_FACTS[p].subject, seeds: seedsOf(p, PRODUCT_FACTS[p].subject), countries: [], languages: ["en"], jobs: [...LIVE_JOBS], owner: "almiworld", paused: false })),
    { ...VIS, words: [...VIS.words], seeds: seedsOf(VIS.id, [...VIS.words]), countries: [], languages: ["en"], jobs: ["keywords", "questions", "top-pages"], owner: "almiworld", paused: false }];
}
/** the owner's one line: Name | seed, seed | countries (or empty for the first 15) | jobs (or empty for all that are built) */
export function parseTopicLine(line) {
  const p = String(line ?? "").split("|").map((x) => x.trim());
  if (!p[0]) return { ok: false, why: "Write it as:  Name | seed, seed | countries | jobs (only the name and a seed are needed)." };
  const seeds = [...new Set(String(p[1] ?? "").split(",").map(norm).filter(Boolean))];
  if (!seeds.length) return { ok: false, why: "Give at least one seed word after the name:  Name | seed, seed" };
  const countries = String(p[2] ?? "").split(",").map((c) => c.trim()).filter(Boolean), bad = countries.find((c) => !COUNTRIES.includes(c));
  if (bad) return { ok: false, why: `${bad} is not on the countries list.` };
  const jobs = String(p[3] ?? "").split(",").map((j) => j.trim().toLowerCase()).filter(Boolean), badJ = jobs.find((j) => !JOBS[j]);
  if (badJ) return { ok: false, why: `${badJ} is not a job (${Object.keys(JOBS).join(", ")}).` };
  return { ok: true, topic: { id: `t-${slug(p[0])}`, name: p[0], subject: p[0], words: seeds, seeds, countries: countries.length ? countries : FIRST_15.slice(0, ALMISEO.clientCountries), languages: ["en"], jobs: jobs.length ? jobs : [...LIVE_JOBS], owner: "owner", paused: false } };
}
/** every topic: AlmiWorld's own, then the stored ones (a stored row with an own id changes that topic: the owner's pause) */
export async function allTopics({ seo, groups = [] }) {
  const stored = await seo.topics(), byId = new Map(stored.map((t) => [t.id, t]));
  const own = ownTopics(groups), ownIds = new Set(own.map((t) => t.id));
  /* of an own topic only the owner's pause and the app's intents are stored: its seeds stay the seed list's, live */
  return [...own.map((t) => (byId.has(t.id) ? { ...t, paused: byId.get(t.id).paused ?? t.paused, ...(byId.get(t.id).intents ? { intents: byId.get(t.id).intents } : {}) } : t)), ...stored.filter((t) => !ownIds.has(t.id))];
}
/** the subject asked → its topic, or null. Exact words only: never another product's (RR-359) */
export function topicForSubject(subject, topics) {
  const s = norm(subject); if (!s) return null;
  return topics.find((t) => norm(t.subject) === s || norm(t.name) === s || (t.words ?? []).some((w) => norm(w) === s) || (t.aliases ?? []).includes(s)) ?? null;
}
/** a client's product: its topic is made (or joined — the same subject of two clients is ONE topic, collected once) */
export async function registerClient({ seo, subject, name = null, seeds = [], site = null, countries = [], intents = [], lic, limits, groups = [], at }) {
  const s = norm(subject); if (!s || s.length > 80) return { ok: false, why: "Say what the product is about." };
  const topics = await allTopics({ seo, groups }), found = topicForSubject(s, topics), who = accountHash(lic.account);
  /* the intents the app plans (G5): AlmiWorld's own products by the owner's licence, a client's by its clients — never an outsider into another's topic */
  const wanted = [...new Set((Array.isArray(intents) ? intents : []).map((x) => String(x).trim().slice(0, 120)).filter(Boolean))].slice(0, 100);
  if (found && found.owner !== "client") { if (lic.owner && wanted.length && JSON.stringify(found.intents ?? []) !== JSON.stringify(wanted)) await seo.putTopic({ ...found, intents: wanted }, { at }); return { ok: true, topic: found, joined: false, own: true }; }
  const max = limits[lic.plan]?.countries ?? ALMISEO.clientCountries;
  const cs = [...new Set(countries.filter((c) => COUNTRIES.includes(c)))].slice(0, max);
  const t = found ?? { id: `c-${slug(s)}`, name: name ? String(name).slice(0, 80) : subject, subject: String(subject).trim().slice(0, 80), words: [s], seeds: [...new Set([s, ...(Array.isArray(seeds) ? seeds : []).map(norm).filter((x) => x && x.length <= 80)])].slice(0, 20), countries: cs.length ? cs : FIRST_15.slice(0, Math.min(max, ALMISEO.clientCountries)), languages: ["en"], jobs: [...LIVE_JOBS], owner: "client", clients: [], site: /^https:\/\//.test(site ?? "") ? site : null, paused: false, kind: /^https:\/\//.test(site ?? "") ? "test" : "service" };
  if (t.clients.includes(who)) { if (wanted.length && JSON.stringify(t.intents ?? []) !== JSON.stringify(wanted)) await seo.putTopic({ ...t, intents: wanted }, { at }); return { ok: true, topic: t, joined: false }; }
  await seo.putTopic({ ...t, clients: [...t.clients, who], planOf: { ...(t.planOf ?? {}), [who]: lic.plan }, intents: wanted }, { at });
  return { ok: true, topic: t, joined: Boolean(found), started: !found };
}

/* ── THE PLAN LIMITS ── */
export async function planLimits(seo) { const s = await seo.setting("plan-limits").catch(() => null); return Object.fromEntries(PLANS.map((p) => [p.id, { ...(DEFAULT_PLAN_LIMITS[p.id] ?? { usdMonth: 0, countries: 0 }), ...(s?.[p.id] ?? {}) }])); }
/** a client topic is worked while ONE of its accounts still has room this month */
export async function clientTopicsToWork({ seo, topics, today, limits }) {
  const month = today.slice(0, 7), out = [];
  for (const t of topics.filter((x) => x.owner === "client" && !x.paused)) {
    for (const who of t.clients ?? []) { const lim = limits[t.planOf?.[who]]?.usdMonth ?? 0, used = await seo.accountSpend(month, who); if (used < lim) { out.push({ ...t, payer: who }); break; } }
  }
  return out;
}
/** the template the country-facts collector uses for a client's topic: its questions, and — where it applies (a test with an official site) — the rest */
export const clientTemplate = (t) => ({ name: t.subject, kind: t.kind === "test" ? "test" : "service", subject: t.words, own: new RegExp(`\\b(?:${t.words.map(esc).join("|")})\\b`), sites: t.site ? [new URL(t.site).hostname.replace(/^www\./, "")] : [], parts: t.kind === "test" ? ["fee", "questions", "centres", "offices", "rules"] : ["questions"] });
export const useClientTemplates = (topics) => setClientTemplates(Object.fromEntries(topics.map((t) => [t.id, clientTemplate(t)])));

/** the owner's own topics only: Google is never asked for a client's subject — each asked only in its own countries */
export function groupsForTopics({ topics }) {
  const isOwn = (t) => t.owner === "owner" && !t.paused && (t.jobs ?? []).includes("keywords"), list = topics.filter(isOwn);
  return list.map((t) => Object.freeze({ id: `product:${t.id}`, kind: "product", key: t.id, name: t.name, seeds: Object.freeze(t.seeds.slice(0, 20)), locations: Object.freeze(["ALL", ...(t.countries ?? []).map((c) => LOCATIONS.find((l) => l.name === c)?.code).filter(Boolean)]) }));
}
/** a client's topic stands in the SAME queue as AlmiWorld's products: after AlmiOET and AlmiVisibility (the owner may move any product) */
export function queueWithClients(q, work = []) {
  if (!work.length) return q;
  const at = Math.max(q.products.indexOf("oet"), q.products.indexOf("visibility")) + 1, ids = work.map((t) => t.id).filter((x) => !q.products.includes(x));
  return Object.freeze({ ...q, products: Object.freeze([...q.products.slice(0, at), ...ids, ...q.products.slice(at)]) });
}
export const PLAN_LIMIT_FIELDS = Object.freeze(PLANS.map((p) => Object.freeze({ id: p.id, words: p.words })));

/* ── THE PLAN THE COLLECTORS PREPARED ("ready by the rules", the same rules as the owner's page counter) ── */
export function collectorPlan({ topic, facts, countries = DEFAULT_QUEUE.countries }) {
  const product = topic.id, T = tplOf(product), subject = topic.subject, done = doneIn(facts, { templates: T && product !== "oet" ? { [product]: T } : {} }), mine = facts.filter((f) => (f.product ?? "oet") === product && SHOWN_STATUS.includes(f.status)), pages = [];
  for (const c of countries) if (done(product, c)) pages.push({ kind: "country", country: c, title: `${subject} in ${c}`, reason: "all its parts are filled from official pages" });
  if (product === "oet") { const seen = new Set(); for (const f of mine.filter((x) => x.part === "councils" && x.value?.name && x.profession)) { const k = `${f.country}|${f.profession}`; if (seen.has(k)) continue; seen.add(k); pages.push({ kind: "country-profession", country: f.country, profession: f.profession, title: `${subject} for ${f.profession} in ${f.country}`, reason: `its council is found (${f.value.name})` }); } }
  for (const f of mine.filter((x) => x.part === "questions" && x.value?.pageable)) pages.push({ kind: "question", country: f.country, question: f.value.question, title: f.value.question, reason: "its answer is official, and it is asked enough" });
  return pages;
}
/** the plan and the owner's page counter must be the same number: both read the same facts */
export const counterTotal = (facts, { topic, countries = DEFAULT_QUEUE.countries }) => { const T = tplOf(topic.id), c = pageCounts(facts, { product: topic.id, countries, template: topic.id === "oet" ? null : T }); return c.country.ready + (c.countryProfession?.ready ?? 0) + c.questions.ready; };

/* ── WHAT A QUESTION PACKET MAY CARRY ── an outside client never gets Google's words or figures in it (Google Ads terms) ── */
const questionRow = (f, { keywords }) => ({ country: f.country, question: f.value?.question ?? null, answer: SHOWN_STATUS.includes(f.status) ? f.value?.answer ?? null : null, answerKind: f.value?.answerKind ?? null, group: f.value?.group ?? null, intent: f.value?.intent ?? null, pageable: Boolean(f.value?.pageable), link: f.sourceUrl, on: f.readOn, status: f.status, ...(keywords ? { volume: f.value?.volume ?? null, wordings: (f.value?.keywords ?? []).slice(0, 40) } : {}) });
/** ONE question bank: the groups the collectors answered, and every question stored once that holds this topic's words (any product's) */
export async function questionBank({ cf, topic, keywords = true }) {
  const facts = (await cf.facts()).filter((f) => (f.product ?? "oet") === topic.id && f.part === "questions");
  const asked = cf.bankQuestions ? await cf.bankQuestions(topic.words) : [];
  return { groups: facts.map((f) => questionRow(f, { keywords })).filter((q) => q.question), asked: asked.filter((q) => keywords || q.source !== "gsc") };
}
/* one country's packet for ANY topic: AlmiOET's five parts, or the topic's own template */
/* 🔴 found by its own test: a question fact's value holds Google's keywords (keywords, asked, volume) — an outside client's packet never carries them */
const noGoogle = (x) => { if (!x?.value || !("keywords" in x.value || "asked" in x.value || "volume" in x.value)) return x; const { keywords: _k, asked: _a, volume: _v, ...value } = x.value; return { ...x, value }; };
const packetFor = (p, keywords) => (keywords ? p : { ...p, ...(p.questions ? { questions: p.questions.map(noGoogle) } : {}), ...(p.parts?.questions ? { parts: { ...p.parts, questions: p.parts.questions.map(noGoogle) } } : {}) });
const anyPacket = (topic, country, facts) => {
  if (topic.id === "oet") return countryPacket(country, facts);
  const T = tplOf(topic.id), p = productPartsOf(topic.id, country, facts, { template: T }), pick = (f) => ({ key: f.key, value: f.value, source: f.sourceUrl, sourceTitle: f.sourceTitle, readOn: f.readOn, status: f.status, aiWritten: f.aiWritten });
  return { country, complete: p.complete, missing: p.missing, parts: Object.fromEntries(T.parts.map((k) => [k, p.parts[k].facts.map(pick)])) };
};

/* ── FINDINGS: a fact of a live product, once; a changed fee, date, score or rule raises the flag ── */
const fingerprint = (f) => f.part === "fee" ? String(f.value?.official ?? f.value?.text ?? "") : f.part === "dates" ? JSON.stringify((f.value?.dates ?? []).map((d) => d.date).sort()) : String(f.value?.rule ?? f.value?.text ?? f.value?.line ?? "");
export const reviewed = (f) => ALMISEO.reviewParts.includes(f.part) && SHOWN_STATUS.includes(f.status) && /^https?:\/\//.test(f.sourceUrl ?? "") && /^\d{4}-\d{2}-\d{2}/.test(f.readOn ?? "") && Boolean(fingerprint(f));
/** one confirmed fact → the findings store; → the changed finding, or null */
export async function noteFact({ seo, fact, at }) {
  if (!seo || !reviewed(fact)) return null;
  const topic = fact.product ?? "oet", id = createHash("sha256").update(`${topic}|${fact.key}`).digest("hex").slice(0, 24), value = fingerprint(fact);
  const r = await seo.addFinding({ id, topic, job: "facts", kind: fact.part, text: `${fact.country}: ${fact.key}`, sourceUrl: fact.sourceUrl, on: String(fact.readOn).slice(0, 10), value }, { at });
  return r.changed ? { id, topic, country: fact.country, part: fact.part, was: r.was, now: value, link: fact.sourceUrl, on: String(fact.readOn).slice(0, 10) } : null;
}
export const alertEmailOf = (env) => String(env[ENV_NAMES.alertEmail] ?? env.ADMIN_EMAILS ?? "").split(",")[0].trim() || null;
/** the e-mail to the owner for what changed in a live product; every changed finding not yet told */
export async function alertChanged({ seo, env, send, now = () => Date.now() }) {
  const open = (await seo.findings({ changed: true })).filter((f) => !f.alerted), to = alertEmailOf(env);
  if (!open.length) return { sent: 0 };
  if (!to) return { sent: 0, why: `${open.length} changed — no ${ENV_NAMES.alertEmail} or ADMIN_EMAILS to tell` };
  const lines = open.map((f) => `${PRODUCT_NAMES[f.topic] ?? f.topic} · ${f.text}: was "${f.was}", now "${f.value}" — ${f.sourceUrl} (read ${f.on})`);
  const r = await send({ to, subject: `AlmiSEO Data: ${open.length} fact${open.length === 1 ? "" : "s"} changed — review needed`, text: lines.join("\n"), html: `<p>${lines.map((l) => l.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])).join("<br>")}</p>`, unsubscribeUrl: "https://almivisibility.almiworld.com/owner/almiseo" });
  if (!r.sent) return { sent: 0, why: r.why };
  await seo.markAlerted(open.map((f) => f.id));
  return { sent: open.length, on: dayOf(now()) };
}

/** every fact changed since the last sync goes through the findings store (AlmiOET's and every product's collectors, the test dates, the owner's edits): the first sync only remembers */
export async function syncFindings({ seo, cf, at }) {
  const last = await seo.setting("findings-sync"), since = last?.at ?? null, facts = (await cf.facts()).filter((f) => !since || String(f.at ?? "") >= since);
  let noted = 0, changed = 0;
  for (const f of facts) { if (!reviewed(f)) continue; noted++; if (await noteFact({ seo, fact: f, at })) changed++; }
  await seo.setSetting("findings-sync", { at }, { at });
  return { noted, changed };
}

/* ── ONE SPEND LEDGER ── the AI (cf_day, inside COUNTRY_FACTS_AI_USD_PER_DAY), top pages, research ── */
export const topPagesCaps = (env = process.env) => ({ budget: Number(env[ENV_NAMES.topPagesBudget]) > 0 ? Number(env[ENV_NAMES.topPagesBudget]) : TOP_PAGES_CAPS.budgetUsd, usd: Number(env[ENV_NAMES.topPagesUsd]) > 0 ? Number(env[ENV_NAMES.topPagesUsd]) : TOP_PAGES_CAPS.usdPerDay, reads: Number(env[ENV_NAMES.topPagesReads]) > 0 ? Math.floor(Number(env[ENV_NAMES.topPagesReads])) : TOP_PAGES_CAPS.readsPerDay });
/** RULING 1: what the top-pages collector has spent in ALL its days, and the total → { spent, budget, left, line } */
export async function topPagesBudget({ seo, env = process.env }) {
  const b = topPagesCaps(env).budget, spent = Math.round((await seo.spendSince("2000-01-01")).filter((r) => r.job === TOP_PAGES_JOB).reduce((a, r) => a + r.usd, 0) * 1e4) / 1e4;
  return { spent, budget: b, left: Math.max(0, b - spent), line: `DataForSEO: $${spent.toFixed(2)} spent / $${b}` };
}
export async function spendLedger({ cf, seo, env = process.env, now = () => Date.now() }) {
  const today = dayOf(now()), month = `${today.slice(0, 8)}01`, ai = cf ? await cf.spendSince(month) : [], rows = await seo.spendSince(month), sum = (xs, f) => Math.round(xs.reduce((a, x) => a + f(x), 0) * 1e4) / 1e4, of = (j) => rows.filter((r) => r.job === j), tp = topPagesCaps(env);
  return { today, budget: await topPagesBudget({ seo, env }), jobs: [
    { job: "AI (questions, councils, rules, test dates)", cap: `$${capsOf(env).aiUsd} a day`, today: sum(ai.filter((x) => x.day === today), (x) => x.aiUsd), month: sum(ai, (x) => x.aiUsd), units: `${sum(ai.filter((x) => x.day === today), (x) => x.reads)} pages read today` },
    { job: "Top pages (AlmiWorld's DataForSEO account, its own products only)", cap: `$${tp.budget} in total, $${tp.usd} a day, ${tp.reads} page reads`, today: sum(of("top-pages").filter((x) => x.day === today), (x) => x.usd), month: sum(of("top-pages"), (x) => x.usd), units: `${sum(of("top-pages").filter((x) => x.day === today), (x) => x.units)} searches today`, on: env[ENV_NAMES.topPagesOn] === "1" },
    { job: "Research collector", cap: `$${RESEARCH_CAP.usdPerDay} a day`, today: 0, month: 0, units: "not built yet", on: false },
  ] };
}

/* ── THE APP'S ANSWER ── */
/** may this licence see Google's keyword data? AlmiWorld's own licence: yes. An outside client: only after the owner's switch (the terms above) */
export const keywordsAllowed = (lic) => Boolean(lic.owner);
/* 🔴 RULING 2 · THE ONLY THINGS AN OUTSIDE CLIENT'S APP IS EVER SENT */
export const CLIENT_PARTS = Object.freeze(["summary", "pages"]);
export const NOT_FOR_CLIENTS = "This is not part of your plan: AlmiWorld's research reaches you as finished pages.";
/* each question in OUR OWN words, by the need it asks about (never the words of a search) */
const OWN_WORDS = Object.freeze({ fees: "How much does {S} cost in {C}?", dates: "When can people in {C} take {S}?", results: "When do {S} results come in {C}?", scores: "What {S} score do people in {C} need?", centres: "Where can I take {S} in {C}?", booking: "How do I book {S} in {C}?", validity: "How long does a {S} result last for people in {C}?", home: "Can people in {C} take {S} online or at home?", requirements: "What does {S} ask of people in {C}?", practice: "How can people in {C} practise for {S}?", preparation: "How should people in {C} prepare for {S}?", remark: "How do people in {C} ask for a {S} re-mark?" });
export const ownWordsQuestion = (need, { subject, country }) => (OWN_WORDS[need] ?? "What should people in {C} know about {S}?").replace("{S}", subject).replace("{C}", country);
const plainFact = (f, subject) => {
  const base = { source: f.sourceUrl, readOn: f.readOn };
  if (f.part === "fee") return f.value?.line ? { ...base, value: { text: f.value.line } } : null;
  if (f.part === "centres") return f.value?.venue ? { ...base, value: { text: `${subject} can be taken at a test venue in ${f.country}.` } } : f.value?.home ? { ...base, value: { text: f.value.home } } : null;
  if (f.value?.name) return { ...base, value: { name: f.value.name, website: f.value.website ?? null } };
  const text = f.value?.rule ?? f.value?.text; return text ? { ...base, value: { text } } : null;
};
/** a client's finished page content for a subject: only official answers and checked facts, in the shape the app builds pages from; nothing else */
export function clientPagesOf({ topic, facts, countries = DEFAULT_QUEUE.countries }) {
  const subject = topic.subject, shown = facts.filter((f) => (f.product ?? "oet") === topic.id && SHOWN_STATUS.includes(f.status) && /^https:\/\//.test(f.sourceUrl ?? "") && /^\d{4}-\d{2}-\d{2}/.test(f.readOn ?? "")), rows = collectorPlan({ topic, facts }), out = {}, plan = [], asked = new Set();
  const answered = (f) => f.part === "questions" && f.value?.answerKind === "official" && f.value?.answer;
  for (const r of rows.filter((x) => x.kind === "country")) {
    const parts = {};
    for (const f of shown.filter((x) => x.country === r.country)) {
      if (answered(f)) { const question = ownWordsQuestion(f.value.group, { subject, country: r.country }); if (asked.has(`${r.country}|${question}`)) continue; asked.add(`${r.country}|${question}`); (parts.questions ??= []).push({ source: f.sourceUrl, readOn: f.readOn, value: { question, answer: f.value.answer, answerKind: "official" } }); }
      else if (f.part !== "questions") { const v = plainFact(f, subject); if (v) (parts[f.part] ??= []).push(v); }
    }
    out[r.country] = { country: r.country, parts }; plan.push({ kind: "country", country: r.country, title: r.title });
  }
  return { plan, countries: out };
}
/** the words a keyword must hold to be this topic's own (RR-359: never another product's keyword) */
export const ownWordsPattern = (topic) => `\\m(?:${[...new Set(topic.words ?? [])].map(esc).join("|")})\\M`;

/** part: summary | keywords | questions | countries | plan | coverage → the JSON the app reads */
export async function almiSeoAnswer({ part = "summary", subject, page = 0, lic, stores, env = process.env, now = () => Date.now(), groups = [] }) {
  const { db, cf, seo } = stores, topics = await allTopics({ seo, groups }), topic = topicForSubject(subject, topics);
  const today = dayOf(now());
  /* 🔴 RULING 2: an outside client is answered here and only here — finished page content and its count; no other part exists for it */
  if (!lic.owner) {
    if (!CLIENT_PARTS.includes(part)) return { ok: false, status: 403, why: NOT_FOR_CLIENTS };
    if (!topic) return { ok: true, outside: true, subject, topic: null, pages: 0, line: "AlmiWorld's research on this subject has started. Your pages appear here when they are ready." };
    useClientTemplates(topics.filter((t) => t.owner === "client"));
    const kit = clientPagesOf({ topic, facts: cf ? await cf.facts() : [] }), who = { name: topic.owner === "client" ? topic.name : subject };
    return part === "pages" ? { ok: true, outside: true, subject, topic: who, on: today, ...kit } : { ok: true, outside: true, subject, topic: who, on: today, pages: kit.plan.length };
  }
  if (!topic) return { ok: true, subject, topic: null, line: `AlmiSEO Data holds nothing about "${subject}" yet — the collectors start on it when your product is added.` };
  useClientTemplates(topics.filter((t) => t.owner === "client"));
  const allowed = keywordsAllowed(lic), base = { ok: true, subject, topic: { id: topic.id, name: topic.name, subject: topic.subject, owner: topic.owner, countries: topic.countries ?? [], jobs: topic.jobs }, keywordsAllowed: allowed, on: today };
  if (part === "keywords") {
    const r = db ? await db.topicKeywords({ groups: [`product:${topic.id}`], pattern: ownWordsPattern(topic), offset: page * ALMISEO.keywordsPerPage, limit: ALMISEO.keywordsPerPage }) : { rows: [], total: 0 };
    return { ...base, rows: r.rows.map((x) => ({ k: x.keyword, v: x.volume, l: x.places, d: x.last, ...(isQuestion(x.keyword) ? { q: 1 } : {}) })), total: r.total, week: r.week ?? 0, today: r.today ?? 0, page, pages: Math.ceil(r.total / ALMISEO.keywordsPerPage), source: "Google Ads Keyword Planner data, through AlmiWorld's keyword collector" };
  }
  const all = cf ? await cf.facts() : [], mine = all.filter((f) => (f.product ?? "oet") === topic.id);
  if (part === "questions") return { ...base, ...(cf ? await questionBank({ cf, topic, keywords: allowed }) : { groups: [], asked: [] }) };
  if (part === "plan") return { ...base, pages: collectorPlan({ topic, facts: all }), counter: counterTotal(all, { topic }) };
  if (part === "coverage") return { ...base, lists: (await seo.coverage(topic.id)).map((c) => ({ intent: c.intent, on: c.day, coverage: c.coverage, second: c.second, read: c.read })) };
  const held = [...new Set(mine.map((f) => f.country))].filter((c) => COUNTRIES.includes(c)), order = DEFAULT_QUEUE.countries.filter((c) => held.includes(c));
  if (part === "countries") {
    const shownFacts = all.filter((f) => SHOWN_STATUS.includes(f.status) && (f.product ?? "oet") === topic.id), slice = order.slice(page * ALMISEO.countriesPerPage, (page + 1) * ALMISEO.countriesPerPage);
    return { ...base, page, pages: Math.ceil(order.length / ALMISEO.countriesPerPage), countries: Object.fromEntries(slice.map((c) => [c, { ...packetFor(anyPacket(topic, c, shownFacts), allowed), waitingReview: mine.filter((f) => f.country === c && waiting(f)).length }])), source: "AlmiSEO Data's country facts — each fact read on its own official page" };
  }
  /* summary: what it holds, in numbers measured from the stores */
  const kw = allowed && db ? await db.topicKeywords({ groups: [`product:${topic.id}`], pattern: ownWordsPattern(topic), offset: 0, limit: 0 }) : { total: 0, week: 0, today: 0 };
  const bank = cf ? await questionBank({ cf, topic, keywords: allowed }) : { groups: [], asked: [] }, done = doneIn(all, { templates: topic.id === "oet" ? {} : { [topic.id]: tplOf(topic.id) } }), coverage = await seo.coverage(topic.id), lists = await seo.lists(topic.id);
  const urls = [...new Set(lists.flatMap((l) => (l.results ?? []).map((r) => r.url)))], read = (await seo.pages(urls)).filter((p) => p.ok);
  const review = (await seo.findings({ topic: topic.id, changed: true })).map((f) => ({ text: f.text, was: f.was, now: f.value, link: f.sourceUrl, on: f.on, kind: f.kind }));
  const facts = mine.filter((f) => f.part !== "questions" && SHOWN_STATUS.includes(f.status)), week = daysBefore(today, 7), newOn = (d) => mine.filter((f) => String(f.at ?? "").slice(0, 10) >= d).length;
  return { ...base, keywords: { total: kw.total, today: kw.today ?? 0, week: kw.week ?? 0, allowed }, questions: { groups: bank.groups.length, answered: bank.groups.filter((q) => q.answerKind === "official" && q.answer).length, asked: bank.asked.length },
    countries: { held: order.length, allParts: order.filter((c) => done(topic.id, c)).length, waitingReview: mine.filter(waiting).length, facts: facts.length }, topPages: { lists: lists.length, read: read.length, coverageLists: coverage.length, on: env[ENV_NAMES.topPagesOn] === "1" }, plan: { pages: counterTotal(all, { topic }) }, arrived: { today: newOn(today), week: newOn(week) }, lastRefresh: mine.map((f) => String(f.at ?? "").slice(0, 10)).sort().at(-1) ?? null, review };
}
export { PLAN_LOCATIONS, CF_PROFESSIONS, councilFound };
