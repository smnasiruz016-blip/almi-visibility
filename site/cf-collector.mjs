/**
 * 🔴 RR-328 B, RR-329 · THE COUNTRY FACTS COLLECTOR (Vercel Cron → /cron/country-facts, and the owner's button on /owner/countries). It fills
 * each product's country template (desktop/country-facts.mjs for AlmiOET's five parts; desktop/product-facts.mjs for every other product —
 * rule R6) into the live database (cf-store.mjs), in the owner's PRIORITY QUEUE (site/queue.mjs, rule R4): AlmiOET's first 30 countries,
 * then AlmiCV's … each product's other countries and the daily re-searches in the background.
 * AlmiOET:
 *   · FEE (all countries, daily): the subject's fee from its own page (fee.mjs feeOf) in each country's currency (rates.mjs);
 *   · CENTRES (all countries, weekly): the venues the subject's own pages name (venues.mjs), and — where none — taking it at home (its own
 *     page's words) with the nearest venues (the UN's sub-regions);
 *   · QUESTIONS (per country, weekly; RR-330 — REPLACES RR-328's keyword groups answered from the facts): the questions people really ask
 *     (question-form searches FROM that country, YouTube comments' questions through the official API, the owner's own), grouped by
 *     meaning, each answered from an OFFICIAL page and checked here — else "general guidance" with no number (cf-questions.mjs);
 *   · COUNCILS (per country × the 12 professions; RR-328 addition, rule R1: searched EVERY DAY until each profession has its body, under
 *     any same-meaning name — its name type recorded, the names tried kept — "searching" on /owner until then) and RULES (per country, monthly): AlmiOET's official records first, then the AI's
 *     candidates (cf-ai.mjs) — EACH one confirmed by reading its source page here (robots obeyed, public addresses only, paced: the official
 *     reader of desktop/official.mjs): the page must be the body's own website or its government's, and must show the name (and the
 *     address, or the quoted rule). Not found there → stored "unconfirmed", never shown on a page. RR-329 (rule R8): an AlmiOET record whose
 *     page is GONE (404/410) is stored so — hidden from pages — until a later read confirms it again.
 * Every other product (RR-329 B): its QUESTIONS the same way (its own words), and ONE AI question for all its other parts — each fact
 * confirmed on its official page (the government's, the body's own, or the test owner's — product-facts.mjs OWNER_SITES): a body by its
 * name on the page, a statement by its quoted words. A body not found is searched again every day (rule R1, background work).
 *   · finished work is not done again until it is due; one run at a time (a lock); a run stops at its time, at today's page reads, or at
 *     today's AI dollars (COUNTRY_FACTS_AI_USD_PER_DAY, COUNTRY_FACTS_READS_PER_DAY in Vercel — the defaults below); history is kept;
 *   · RR-329 C/F: each country's cost is measured (the owner's ETA) and each run is recorded for the 3-day health check (health.mjs).
 */
import { randomBytes } from "node:crypto";
import { COUNTRIES, neighboursOf } from "../desktop/world.mjs";
import { CF_PROFESSIONS, NAME_TYPES, nameTypeOf, councilFound, officialSite, blockedSource, SITE_ABROAD, nameOnPage, addressOnPage, quoteOnPage, numbersOf, hostOf, governmentHost, SHOWN_STATUS, refuseBlocked } from "../desktop/country-facts.mjs";
import { ownerCouncilsOf, OWNER_COUNCILS } from "../desktop/owner-councils.mjs"; // RR-333; RR-343 the re-check
import { PRODUCT_FACTS, PART_INFO, FACT_PRODUCTS, searchedParts, bodyParts, ownerSite, templateOf } from "../desktop/product-facts.mjs";
import { feeOf } from "../desktop/fee.mjs";
import { readRates, feeInCurrency, CURRENCY_OF, localShown as localFee, feeShown } from "../desktop/rates.mjs";
import { venueCountries } from "../desktop/venues.mjs";
import { BRANDS } from "./kw-finder.mjs";
import ORIGIN from "../desktop/lists/almiworld-oet-origin-facts.json" with { type: "json" };
import { LOCATIONS } from "./kw-seeds.mjs";
import { DEFAULT_QUEUE, orderWork } from "./queue.mjs";
import { recordRun } from "./health.mjs";
import { askAi, aiConfigured, councilQuestion, ruleQuestion, productQuestion, keywordIdeasQuestion } from "./cf-ai.mjs";
import { collectQuestions, sweepQuestions, CF_QUESTIONS } from "./cf-questions.mjs";
import { youtubeApi } from "../src/video/youtube.mjs";
import { questionsInComment } from "../desktop/real-questions.mjs";
import { ARTICLES, ARTICLE_PRODUCTS, answerDrafts, introQuestion, checkIntro, articleQuality, judgeQuestion, judgementsOf } from "./articles.mjs";
/* RR-333 D: what people ask under videos about what AlmiVisibility does (3 searches a week of YouTube's 100 a day) */
export const VIS_YOUTUBE = Object.freeze(["AI search visibility", "keyword research tool", "website SEO audit"]);
/* RR-334 (owner's templates b and d) · the keyword ideas: a product every 30 days, at most 2 a day, AlmiOET and AlmiVisibility first; the
 * people each one is for (the owner's examples: nurses from Pakistan who want to work in the UK; business owners for AlmiVisibility) */
export const IDEAS = Object.freeze({ everyDays: 30, perDay: 2, max: 10,
  oet: Object.freeze({ name: "OET", countries: ["Pakistan", "India", "the Philippines"], personas: [{ who: "nurses", country: "Pakistan", goal: "work in the UK" }, { who: "doctors", country: "India", goal: "work in Ireland" }, { who: "nurses", country: "the Philippines", goal: "work in Australia" }], words: /\boet\b/ }),
  visibility: Object.freeze({ name: "getting a business found on Google and in AI answers (SEO, AI search, website checks)", countries: ["the UK", "Pakistan"], personas: [{ who: "restaurant owners", country: "the UK", goal: "get more customers from Google" }, { who: "small business owners", country: "Pakistan", goal: "show up in ChatGPT answers" }], words: /\b(seo|google|chatgpt|ai|website|site|rank\w*|search|keywords?|audit|visib\w*|perplexity|gemini)\b/ }),
});

export const CF_SUBJECT = Object.freeze({ name: "OET", site: "https://oet.com" });
/* RR-342 (owner: "0 test dates for every test × country after 2+ days"): the four country-facts runs used the whole day's caps before the
 * test-dates runs (13:37, 14:37 UTC) began, so every dates run stopped before its first question. Country facts now leave datesShare for them. */
export const CF_COLLECTOR = Object.freeze({ runBudgetMs: 240000, lockSeconds: 290, aiUsdPerDay: 2, readsPerDay: 200, aiReserveUsd: 0.1, datesShare: Object.freeze({ aiUsd: 0.5, reads: 40 }), maxGroups: 8, dailyFirstFromHourUtc: 12, refreshDays: Object.freeze({ fee: 1, centres: 7, questions: 7, councils: 30, rules: 30, facts: 30 }),
  /* a country's AI cost and page reads until enough are measured (Claude Haiku 5.5: about 6 web searches a question; AlmiOET reads its 12
   * councils' pages, its rules and AlmiOET's records) */
  defaultCost: Object.freeze({ oet: 0.25, other: 0.12 }), defaultReads: Object.freeze({ oet: 18, other: 4 }) });
/* RR-329: the queue's country order (the owner's first 15, next 15, then the rest) — kept under its RR-328 name */
export const CF_ORDER = DEFAULT_QUEUE.countries;
const OET_TASKS = ["questions", "councils", "rules"];
/* RR-334 (owner, 27 Oct 2026: "old code stopped new rules twice this week") · the search and answer rules a finished task was done under:
 * a questions or rules task finished under OLDER rules is due at once — never left waiting its 7 or 30 days */
export const CF_RULES = CF_QUESTIONS.rules;
const STAMPED = (t) => t === "questions" || t === "rules" || t.endsWith(":questions");
const ALL = "*";
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const PROF_OF = Object.fromEntries(CF_PROFESSIONS.flatMap((p) => [[p, p], [`${p}s`, p]]).concat([["doctors", "medicine"], ["nurses", "nursing"], ["dentists", "dentistry"], ["pharmacists", "pharmacy"], ["physiotherapists", "physiotherapy"], ["occupational therapists", "occupational therapy"], ["radiographers", "radiography"], ["dietitians", "dietetics"], ["optometrists", "optometry"], ["podiatrists", "podiatry"], ["speech pathologists", "speech pathology"], ["vets", "veterinary science"], ["veterinarians", "veterinary science"]]));
export const professionKey = (s) => PROF_OF[String(s ?? "").toLowerCase().trim()] ?? null;
/** RR-342 · what country facts leave each day for the test dates: datesShare, but never more than a quarter of a smaller cap */
export const datesShareOf = (caps) => ({ aiUsd: Math.min(CF_COLLECTOR.datesShare.aiUsd, caps.aiUsd / 4), reads: Math.min(CF_COLLECTOR.datesShare.reads, Math.floor(caps.reads / 4)) });
export const capsOf = (env = process.env) => ({ aiUsd: Number(env.COUNTRY_FACTS_AI_USD_PER_DAY) > 0 ? Number(env.COUNTRY_FACTS_AI_USD_PER_DAY) : CF_COLLECTOR.aiUsdPerDay, reads: Number(env.COUNTRY_FACTS_READS_PER_DAY) > 0 ? Math.floor(Number(env.COUNTRY_FACTS_READS_PER_DAY)) : CF_COLLECTOR.readsPerDay });
/* the tasks of one (product, country) — AlmiOET keeps its RR-328 task names; every other product "<key>:questions" and "<key>:facts" */
export const tasksOf = (product) => (product === "oet" ? OET_TASKS : [`${product}:questions`, `${product}:facts`]);
const refreshOf = (t) => CF_COLLECTOR.refreshDays[t.includes(":") ? t.split(":")[1] : t] ?? 30;
/** a (product, country) is FINISHED for the queue when each of its tasks was tried once (a body still searched for is background work) */
export const finishedIn = (tasks) => (product, country) => tasksOf(product).every((t) => { const x = tasks.get(`${country}|${t}`); return x && ["done", "searching", "waiting"].includes(x.state); });
/** the measured AI cost of one country of a product (kept in the store's KV as a running average) */
export const costKey = (p) => `av:cf:cost:${p}`;

/** one run. → { ok, day, saved, unconfirmed, kept, done: ["Pakistan · councils", …], searching, finished, stoppedBy, why, aiUsd, reads, searches } */
export async function runCountryFacts({ store, kwStore = null, kv = null, env = process.env, reader, ai = askAi, now = () => Date.now(), budgetMs = CF_COLLECTOR.runBudgetMs, countries = null, subject = CF_SUBJECT, queue = DEFAULT_QUEUE, products = FACT_PRODUCTS, youtube = null, youtubeFetch = fetch, countriesOf = null /* RR-360 B: a client topic has its own countries */ }) {
  const start = now(), today = dayOf(start), at = () => new Date(now()).toISOString(), id = randomBytes(8).toString("hex");
  reader = refuseBlocked(reader); // RR-333 C: the owner's blocked private sites are never read
  if (kv) { const [locked] = await kv.run([["SET", "av:cf:lock", id, "NX", "EX", CF_COLLECTOR.lockSeconds]]); if (locked !== "OK") return { ok: false, day: today, why: "Another country-facts run is working — this one did nothing." }; }
  const caps = capsOf(env), spent = await store.spend(today), r0 = reader.requests(), tasks = await store.tasks();
  const out = { ok: true, day: today, saved: 0, unconfirmed: 0, kept: 0, done: [], searching: [], finished: [], stoppedBy: null, why: null, aiUsd: 0, reads: 0, searches: 0, aiError: null, templates: {}, byProduct: {} /* RR-360 B: what each product cost in this run — a client's goes against its plan's month */ };
  /* RR-334 (owner: test and tune the templates) · per template: questions asked, web searches, results confirmed on an official page */
  const tpl = (name) => (out.templates[name] ??= { asks: 0, searches: 0, found: 0, guidance: 0 });
  const foundBy = (f) => (f.part === "councils" ? "councils" : f.part === "rules" ? "rules" : f.part === "questions" ? (f.value?.answerKind === "official" && f.aiWritten ? "answers" : f.value?.answerKind === "guidance" ? "answers:guidance" : null) : f.product && f.product !== "oet" && f.proposedBy === "ai" ? "facts" : null);
  /* RR-328 addition (rule R1): a council still "searching" is searched again every day — once a day, never stopped at "missing" */
  /* RR-333, RR-334: a task finished under older rules (RR-328's keyword answers, RR-330's first queries …) is due at once */
  const due = (c, t) => { const x = tasks.get(`${c}|${t}`); if (x && STAMPED(t) && x.state === "done" && x.tried?.rules !== CF_RULES) return true; return !x || (x.state === "searching" ? x.day !== today : x.state !== "done" || daysBetween(x.day, today) >= refreshOf(t)); };
  const stop = (code, why) => { out.stoppedBy = code; out.why = why; return false; };
  const share = datesShareOf(caps); // RR-342
  const room = (needAi = false) => {
    if (now() - start > budgetMs) return stop("TIME", "This run's time is used — the next run continues.");
    if (spent.reads + reader.requests() - r0 >= caps.reads - share.reads) return stop("READS", `Today's ${caps.reads - share.reads} page reads for country facts are used (${share.reads} stay for the test dates) — the next day continues.`);
    if (needAi && spent.aiUsd + out.aiUsd + CF_COLLECTOR.aiReserveUsd > caps.aiUsd - share.aiUsd) return stop("AI_BUDGET", `Today's AI budget for country facts ($${(caps.aiUsd - share.aiUsd).toFixed(2)}) is used ($${share.aiUsd.toFixed(2)} stays for the test dates) — the next day continues.`);
    return true;
  };
  const put = async (f) => { const r = await store.putFact({ proposedBy: "official", aiWritten: false, ...f }, { at: at() }); if (r.saved) { out.saved++; if (f.status === "unconfirmed") out.unconfirmed++; const by = f.status === "confirmed" ? foundBy(f) : null; if (by === "answers:guidance") tpl("answers").guidance++; else if (by) tpl(by).found++; } else if (/owner/.test(r.why ?? "")) out.kept++; return r; };
  const finish = async (c, t, state = "done", note = null, tried = null) => { if (STAMPED(t)) tried = { ...(tried ?? {}), rules: CF_RULES }; await store.setTask(c, t, { day: today, state, note, tried }); tasks.set(`${c}|${t}`, { day: today, state, tried }); if (state === "done") out.done.push(`${c === ALL ? "all countries" : c} · ${t}`); if (state === "searching") out.searching.push(`${c} · ${t}`); };
  /* the AI's own failure (no key, a refused key, no answer) is kept for the health check — never silent */
  const askOne = async (q) => { const r = await ai({ env, ...q }); out.aiUsd += r.usd ?? 0; out.searches += r.searches ?? 0; if (q.template) { tpl(q.template).asks++; tpl(q.template).searches += r.searches ?? 0; } if (!r.ok) out.aiError = r.why; return r; };
  const list = countries ?? queue.countries;
  const finished = finishedIn(tasks), costs = {};
  try {
    /* RR-343 (owner, 29 Oct 2026) · the re-check under the new rule: his own councils (desktop/owner-councils.mjs) count by his word at once —
     * no read, no AI. One he rejected or decided, one already found, or one never tried yet is left as it is; every other stored council is re-counted by
     * councilFound when it is read (no new cost) */
    out.recheck = { approved: 0 };
    for (const o of OWNER_COUNCILS) {
      const key = `council|${o.country}|${slug(o.profession)}`, old = (await store.facts({ country: o.country })).find((f) => f.key === key);
      /* only one already stored (tried before, still not found): a new one is read on its own site first by councilsOf, then his word */
      if (!old || ["approved", "edited", "rejected", "owner"].includes(old.status) || councilFound(old) || blockedSource(o.website)) continue;
      /* straight to the store: the re-check is not this run's finding (the run's own counts and its health line stay its own) */
      const r = await store.putFact({ key, country: o.country, profession: o.profession, part: "councils", kind: "council", sourceUrl: o.website, sourceTitle: null, readOn: today, proposedBy: "owner-input", aiWritten: false, status: "approved",
        value: { name: o.name, nameType: nameTypeOf(o.name), website: o.website, address: o.address ?? null, siteCheck: null, ...(o.address ? { addressFrom: "the owner's input — not yet read on its official page" } : { addressWhy: "no address found yet (optional)" }) },
        why: `your own council — counted by your word (RR-343)${o.doubt ? `; your note: ${o.doubt}` : ""}` }, { at: at() });
      if (r.saved) out.recheck.approved++;
    }
    let sitemap = null; const urls = async () => (sitemap ??= await reader.sitemapOf(subject.site)).urls ?? [];
    /* RR-333 (owner, 27 Oct: a short run spent its whole time on exchange rates): the fee and the centres are a DAILY step of their own,
     * taken only AFTER the first 15 countries' missing parts (below); the day's rates are read once and kept for the day (KV) */
    let dailyDone = false;
    const visibilityYouTube = async () => {
      const last = (await store.questions({ product: "visibility", country: "*", source: "youtube" }))[0];
      if (last && Date.parse(today) - Date.parse(last.at.slice(0, 10)) < 7 * 864e5) return;
      const api = youtube ?? youtubeApi({ env, fetchImpl: youtubeFetch }); if (api.state !== "READY") return;
      const found = [];
      for (const q of VIS_YOUTUBE) for (const v of (await api.searchTopic(q, { max: 2, order: "relevance", relevanceLanguage: "en" })).slice(0, 2)) for (const c of await api.comments(v.videoId, { max: 50 })) for (const x of questionsInComment(c.text)) found.push({ text: x, ref: v.videoId });
      await store.putQuestions({ product: "visibility", country: "*", source: "youtube", items: found, at: at() });
    };
    /* RR-334 · a once-a-day question (keyword ideas, an introduction) marks its day — a failed one waits until tomorrow, never every run */
    const triedToday = (task) => tasks.get(`${ALL}|${task}`)?.day === today;
    const triedOn = (prefix) => [...tasks.entries()].filter(([k, x]) => k.startsWith(`${ALL}|${prefix}`) && x.day === today).length;
    const tried = async (task, r) => { await store.setTask(ALL, task, { day: today, state: r.ok ? "done" : "retry", note: r.ok ? null : r.why ?? null }); tasks.set(`${ALL}|${task}`, { day: today, state: r.ok ? "done" : "retry" }); };
    const dailySteps = async () => {
    dailyDone = true;
    /* ── 0 · RR-333 D: AlmiVisibility's questions on YouTube (official API, weekly; no country) ── */
    try { await visibilityYouTube(); } catch { /* never stops the run */ }
    /* ── 1 · AlmiOET: the fee in every country's money (daily) ── */
    if (products.includes("oet") && due(ALL, "fee") && room()) {
      const fee = await feeOf({ urls: await urls(), subject: subject.name, subjectName: subject.name, reader });
      if (!fee.ok) await finish(ALL, "fee", "retry", fee.why);
      else {
        const rates = await ratesOfToday({ kv, today, read: () => readRates({ reader, countries: COUNTRIES, on: at() }) });
        for (const c of COUNTRIES) {
          const f = feeInCurrency(fee, c, rates), last = f.steps?.at(-1) ?? null;
          await put({ key: `fee|${c}`, country: c, part: "fee", kind: "fee", value: { official: `${fee.currency} ${fee.amount}`, line: f.line, local: localFee(f.line), currency: f.currency ?? CURRENCY_OF[c] ?? null, amount: f.amount ?? null, rate: last ? { source: last.source, link: last.link, date: last.rateDate, said: last.said, open: Boolean(last.open) } : null }, sourceUrl: fee.source.url, sourceTitle: fee.source.title, readOn: fee.checkedOn, status: "confirmed" });
        }
        await finish(ALL, "fee");
      }
    }
    /* ── 1b · RR-334: the words people type about a product (templates b and d) → that product's Google Ads seeds ── */
    if (kwStore?.seedIdeas && aiConfigured(env)) try {
      const ideas = await kwStore.seedIdeas(); let n = triedOn("ideas:");
      for (const p of ["oet", "visibility", ...products.filter((x) => x !== "oet")]) {
        if (n >= IDEAS.perDay || !room(true)) break;
        if ((ideas[p]?.on && daysBetween(ideas[p].on, today) < IDEAS.everyDays) || triedToday(`ideas:${p}`)) continue;
        const T = IDEAS[p] ?? (PRODUCT_FACTS[p] ? { name: PRODUCT_FACTS[p].name, countries: ["Pakistan", "India"], personas: [], words: PRODUCT_FACTS[p].own } : null); if (!T) continue;
        n++; const r = await askOne(keywordIdeasQuestion({ product: T.name, countries: T.countries, personas: T.personas }));
        await tried(`ideas:${p}`, r);
        if (!r.ok) continue;
        const seeds = [...new Set((r.data.keywords ?? []).map((k) => String(k).toLowerCase().replace(/["“”]/g, "").replace(/\s+/g, " ").trim()).filter((k) => k.length >= 6 && k.length <= 80 && k.includes(" ") && T.words.test(k) && !BRANDS.test(k.replace(T.words, ""))))].slice(0, IDEAS.max);
        ideas[p] = { seeds, on: today, template: "keywords" }; tpl("keywords").found += seeds.length;
        await kwStore.setSeedIdeas(ideas, at());
      }
    } catch { /* never stops the run */ }
    /* ── 1c · RR-334: article drafts for every AlmiWorld product (drafts only — the owner approves on /owner/articles) ── */
    if (store.putArticle) try { await articleSteps(); } catch { /* never stops the run */ }
    /* ── 2 · AlmiOET: the test centres, and at home with the nearest venues (weekly) ── */
    if (products.includes("oet") && due(ALL, "centres") && room()) {
      const v = await venueCountries({ urls: await urls(), subject: subject.name, reader });
      const venues = new Map(v.countries.map((x) => [x.name, x]));
      if (!venues.size && !v.home) await finish(ALL, "centres", "retry", "no venue page could be read");
      else {
        for (const c of COUNTRIES) {
          const x = venues.get(c);
          if (x) await put({ key: `centres|${c}`, country: c, part: "centres", kind: "venue", value: { venue: true, home: null, nearest: [] }, sourceUrl: x.source.url, sourceTitle: x.source.title, readOn: x.checkedOn, status: "confirmed" });
          else if (v.home) await put({ key: `centres|${c}`, country: c, part: "centres", kind: "home", value: { venue: false, home: v.home.says, nearest: neighboursOf(c).filter((n) => venues.has(n)).slice(0, 4) }, sourceUrl: v.home.url, sourceTitle: v.home.title, readOn: v.home.checkedOn, status: "confirmed" });
        }
        await finish(ALL, "centres");
      }
    }
    };
    async function articleSteps() {
      const all = await store.facts(), have = new Map((await store.articles()).map((a) => [a.id, a])), fresh = (id) => { const a = have.get(id); return a && (a.status !== "draft" || daysBetween(a.at.slice(0, 10), today) < ARTICLES.refreshDays); };
      const save = async (d) => { const r = await store.putArticle({ id: d.id, product: d.product, kind: d.kind, title: d.title, body: d, why: d.dropped?.length ? `${d.dropped.length} block(s) left out: not found on an official page` : null }, { at: at() }); if (r.saved) (out.articles ??= []).push(d.id); };
      /* the answers: from the question facts already checked (no AI, no page read) */
      for (const p of ARTICLE_PRODUCTS) for (const d of answerDrafts({ product: p.key, facts: all, today })) if (!fresh(d.id)) await save(d);
      /* the introductions: one AI question each, at most 2 a day, AlmiOET and AlmiVisibility first */
      let n = triedOn("articles:");
      for (const p of [...ARTICLE_PRODUCTS].sort((a, b) => ["oet", "visibility"].indexOf(b.key) - ["oet", "visibility"].indexOf(a.key))) {
        if (n >= ARTICLES.introsPerDay || !aiConfigured(env) || !room(true)) break;
        if (fresh(`${p.key}|intro`) || triedToday(`articles:${p.key}`)) continue;
        n++;
        const lines = all.filter((x) => (x.product ?? "oet") === p.key && SHOWN_STATUS.includes(x.status) && x.part !== "questions").map((x) => x.part === "councils" ? `${x.country}, ${x.profession}: ${x.value?.name} (${x.sourceUrl})` : x.value?.text || x.value?.rule || x.value?.line ? `${x.country}: ${x.value.text ?? x.value.rule ?? x.value.line} (${x.sourceUrl})` : null).filter(Boolean);
        const r = await askOne(introQuestion({ product: p.key, facts: lines }));
        await tried(`articles:${p.key}`, r);
        if (!r.ok) continue;
        const c = await checkIntro({ product: p.key, data: r.data, reader, room, today });
        tpl("articles").found += c.draft ? c.draft.blocks.filter((b) => b.label === "official").length : 0;
        if (c.draft) await save(c.draft);
      }
      /* RR-335 · F40 with a cost guard: the page-law checks first (no AI); only a draft that passes them is judged by the AI — inside the
       * daily cap, at most judgedPerDay a day, each verdict with its call id and its cost; one not yet judged waits (never refused) */
      let j = triedOn("judge:");
      for (const a of (await store.articles()).filter((x) => x.status === "draft" && !x.body?.judged)) {
        if (articleQuality(a.body).state !== "WAITING") continue;
        if (j >= ARTICLES.judgedPerDay || !aiConfigured(env) || !room(true)) break;
        if (triedToday(`judge:${a.id}`)) continue;
        j++;
        const r = await askOne(judgeQuestion(a.body));
        await tried(`judge:${a.id}`, r);
        const judgements = r.ok ? judgementsOf(r.data, r.callId) : [];
        if (judgements.length) await store.putArticle({ id: a.id, product: a.product, kind: a.kind, title: a.title, body: { ...a.body, judged: { judgements, callId: r.callId, usd: Math.round((r.usd ?? 0) * 1e5) / 1e5, at: at() } }, why: a.why ?? null }, { at: at() });
      }
    }
    /* ── 3 · per (product, country), in the queue's order: the front first, a background task (another country, a daily re-search) every 4th ── */
    const units = [];
    for (const p of products) for (const c of countriesOf?.(p) ?? list) {
      const ts = tasksOf(p).filter((t) => due(c, t)); if (!ts.length) continue;
      const background = finished(p, c) && ts.every((t) => tasks.get(`${c}|${t}`)?.state === "searching");
      units.push({ id: `${p}|${c}`, product: p, country: c, tasks: ts, background });
    }
    const FIRST15 = new Set(queue.countries.slice(0, 15));
    /* RR-334 · a stored question that is a comment to a video's maker or its viewers leaves the counts (reversible: Approve) */
    try { out.removed = await sweepQuestions({ store, put }); } catch { /* never stops the run */ }
    /* the very first run (no fee read yet) takes the daily step first: the fee questions are answered from it.
     * RR-335 (live, 28 Oct: 4 runs, every one used up on the first 15's councils — no article, no fee, no keyword idea all day): from
     * the day's last run on (dailyFirstFromHourUtc), a daily step not yet taken today goes first; the earlier runs keep RR-333's order */
    const dailyLate = new Date(now()).getUTCHours() >= CF_COLLECTOR.dailyFirstFromHourUtc && tasks.get(`${ALL}|fee`)?.day !== today;
    if (!tasks.has(`${ALL}|fee`) || dailyLate) { await dailySteps(); }
    for (const u of orderWork(units, { queue })) {
      if (out.stoppedBy) break;
      if (!dailyDone && !(u.product === "oet" && FIRST15.has(u.country))) { await dailySteps(); if (out.stoppedBy) break; }
      const before = out.aiUsd, readsBefore = reader.requests(), wasFinished = finished(u.product, u.country);
      const facts = async () => (await store.facts({ country: u.country })).filter((f) => SHOWN_STATUS.includes(f.status));
      if (u.product === "oet") {
        const c = u.country;
        if (u.tasks.includes("questions") && room()) await questionsOf(c);
        if (out.stoppedBy) break;
        if (u.tasks.includes("councils") && room(true)) await councilsOf(c);
        if (out.stoppedBy) break;
        if (u.tasks.includes("rules") && room(true)) await rulesOf(c);

        /* RR-330 (owner, 27 Oct 2026): the QUESTIONS people really ask (keywords in a question's form, YouTube comments' questions, the
         * owner's own), grouped by meaning, each answered from an official page and checked here (cf-questions.mjs) — REPLACES RR-328's
         * "question-type keywords answered from the country's facts" */
        async function questionsOf(country) {
          const loc = LOCATIONS.find((l) => l.name === country) ?? null;
          const known = await facts(), fee = known.find((f) => (f.product ?? "oet") === "oet" && f.part === "fee" && localFee(f.value?.line));
          const lines = known.filter((f) => (f.product ?? "oet") === "oet").map((f) => f.part === "fee" ? (f.value?.line ? `the ${subject.name} fee: ${feeShown(f.value)}` : null) : f.part === "centres" ? (f.value.venue ? `${subject.name}'s own pages name a test venue in ${country}` : f.value.home ? `no venue in ${country}; ${f.value.home}${f.value.nearest?.length ? `; nearest venues: ${f.value.nearest.join(", ")}` : ""}` : null) : f.part === "councils" ? `${f.profession}: ${f.value.name}` : f.part === "rules" ? f.value.rule : null).filter(Boolean);
          const bodies = [...new Map(known.filter((f) => f.part === "councils" && f.value?.name).map((f) => [f.value.name, { name: f.value.name, website: f.value.website }])).values()];
          const r = await collectQuestions({ country, location: loc, subject: subject.name, subjectSite: subject.site, skip: BRANDS, fee, lines, bodies },
            { store, kwStore, env, reader, room, askOne, put, today, at, fetchImpl: youtubeFetch, youtube, aiOn: aiConfigured(env) });
          if (r.state === null) return;
          return finish(country, "questions", r.state, r.note, { stats: r.stats });
        }

        /* RR-328 addition (rule R1): only the professions still without a whole council are searched; the body may have any same-meaning
         * name (its name type is recorded); each name tried and not confirmed is kept, so the next day's search looks further */
        async function councilsOf(country) {
          const shownC = (await facts()).filter((f) => (f.product ?? "oet") === "oet" && f.part === "councils"), whole = new Set(shownC.filter((f) => councilFound(f) || f.status === "owner").map((f) => f.profession)), named = new Set(shownC.map((f) => f.profession));
          const needed = CF_PROFESSIONS.filter((p) => !whole.has(p));
          if (!needed.length) return finish(country, "councils");
          const prev = tasks.get(`${country}|councils`)?.tried ?? {}, tried = Object.fromEntries(Object.entries(prev).filter(([p]) => needed.includes(p)).map(([p, t]) => [p, { names: [...t.names], types: [...t.types], since: t.since, unread: [...(t.unread ?? [])], ...(t.notFound ? { notFound: t.notFound } : {}) }]));
          /* RR-330: the official pages that could not be read last time are named, so the AI gives another official page (cause of most "0") */
          const unread = [...new Set(Object.values(tried).flatMap((t) => t.unread ?? []))];
          const known = (ORIGIN.items ?? []).filter((f) => f.country === country && f.fact === "council" && needed.includes(f.profession)).map((f) => ({ profession: f.profession, name: f.name ?? f.text, link: f.link }));
          let cands = known.map((k) => ({ profession: k.profession, name: k.name, nameType: nameTypeOf(k.name), website: k.link, address: "", sourceUrl: k.link, proposedBy: "almioet-record" })), seen = [];
          /* RR-333 · the owner's councils (desktop/owner-councils.mjs) are tried FIRST, each on its own official site; the AI is told of them */
          const mine = ownerCouncilsOf(country).filter((o) => needed.includes(o.profession)).map((o) => ({ profession: o.profession, name: o.name, nameType: nameTypeOf(o.name), website: o.website, address: o.address ?? "", sourceUrl: o.website, doubt: o.doubt, proposedBy: "owner-input" }));
          const told = [...mine.map((o) => ({ profession: o.profession, name: o.name, link: o.website })), ...known.filter((k) => !mine.some((o) => o.profession === k.profession))];
          /* RR-343 · the re-check, no new AI cost: a council already stored (its name read on an official page) is tried again first — its
           * website read — and the AI is asked only for the professions still not found */
          const stored = shownC.filter((f) => needed.includes(f.profession) && f.status === "confirmed" && f.value?.name && officialSite(f.value.name, f.value.website))
            .map((f) => ({ profession: f.profession, name: f.value.name, nameType: f.value.nameType ?? nameTypeOf(f.value.name), website: f.value.website, address: f.value.address ?? "", sourceUrl: f.sourceUrl ?? f.value.website, proposedBy: f.proposedBy ?? "official" }));
          /* a site the owner doubts is never confirmed by itself — whoever proposes it */
          const doubted = new Map(mine.filter((o) => o.doubt).map((o) => [hostOf(o.website), o.doubt])), ownerHeld = new Set();
          if (!(await tryAll([...mine, ...stored]))) return;
          const left = needed.filter((p) => !whole.has(p));
          if (left.length && aiConfigured(env)) {
            const r = await askOne(councilQuestion({ country, subject: subject.name, professions: left, known: told.filter((k) => left.includes(k.profession)), tried, unread })); seen = r.results ?? [];
            if (!r.ok && left.length === needed.length && !mine.length && !stored.length) return finish(country, "councils", "retry", r.why, tried);
            const ai = r.ok ? (r.data.councils ?? []).map((x) => ({ ...x, profession: professionKey(x.profession), nameType: NAME_TYPES.includes(x.nameType) ? x.nameType : nameTypeOf(x.name), proposedBy: "ai" })).filter((x) => x.profession && left.includes(x.profession) && x.name && x.sourceUrl) : [];
            /* RR-334 (owner: where truly none exists, say "not found" and why) — kept with the names tried; still searched every day (rule R1) */
            if (r.ok) for (const x of r.data.councils ?? []) { const p = professionKey(x.profession); if (x.notFound && p && left.includes(p) && String(x.why ?? "").trim()) (tried[p] ??= { names: [], types: [], since: today }).notFound = String(x.why).trim().slice(0, 300); }
            cands = [...ai, ...cands.filter((k) => !ai.some((x) => x.profession === k.profession))];
          }
          if (left.length && !(await tryAll(cands))) return;
          const still = CF_PROFESSIONS.filter((p) => !whole.has(p));
          for (const p of still) tried[p] ??= { names: [], types: [], since: today };
          if (!still.length) return finish(country, "councils");
          if (!aiConfigured(env)) return finish(country, "councils", "waiting", "the AI is not connected yet (ANTHROPIC_API_KEY) — AlmiOET's records only", tried);
          return finish(country, "councils", "searching", `still searching for ${still.length} of ${CF_PROFESSIONS.length}: ${still.join(", ")} — again tomorrow`, tried);
          /** each candidate read and judged (RR-343 rule); false when the run's room is used up */
          async function tryAll(list) {
          for (const x0 of list) {
            if (!room()) return false;
            if (whole.has(x0.profession)) continue; // RR-333: already whole this run — no further read
            const x = { ...x0, doubt: x0.doubt ?? doubted.get(hostOf(x0.sourceUrl)) ?? null };
            const page = await reader.read(x.sourceUrl), own = hostOf(x.sourceUrl) && (hostOf(x.sourceUrl) === hostOf(x.website) || governmentHost(hostOf(x.sourceUrl)));
            const text = page.ok ? `${page.title ?? ""} ${page.h1 ?? ""} ${page.text}` : "";
            const nameOk = page.ok && nameOnPage(x.name, text), byOwner = x.proposedBy === "owner-input", siteOk = officialSite(x.name, x.website);
            /* RR-343 (owner, 29 Oct 2026): FOUND = the official name + the official website (the body's own domain), the website confirmed by
             * reading it — the source page is on it, or it is read now — or, when it does not open from abroad, by its domain and the name
             * together in the search results. The address is optional: kept only when it stands on the body's pages (its contact page too). */
            let siteCheck = nameOk && hostOf(page.url ?? x.sourceUrl) === hostOf(x.website) ? "read" : null, site = null;
            if (!siteCheck && siteOk && hostOf(x.sourceUrl) !== hostOf(x.website) && room()) { site = await reader.read(x.website); if (site.ok && nameOnPage(x.name, `${site.title ?? ""} ${site.h1 ?? ""} ${site.text}`)) siteCheck = "read"; }
            const abroad = (p) => p && !p.ok && !goneOf(p) && hostOf(p.url ?? "") === hostOf(x.website);
            if (!siteCheck && siteOk && (abroad(page) || abroad(site) || (!page.ok && !goneOf(page) && hostOf(x.sourceUrl) === hostOf(x.website))) && seen.some((s) => hostOf(s.url) === hostOf(x.website) && nameOnPage(x.name, s.title))) siteCheck = "search";
            const ok = siteOk && Boolean(siteCheck) && !x.doubt, ownerWord = byOwner && !blockedSource(x.website);
            let addrOk = Boolean(x.address) && ((nameOk && addressOnPage(x.address, text)) || Boolean(site?.ok && addressOnPage(x.address, site.text)));
            for (const path of ["/contact", "/contact-us"]) { if (addrOk || !ok || !x.address || siteCheck !== "read" || !room()) break; const c = await reader.read(new URL(path, x.website).href); addrOk = Boolean(c.ok && addressOnPage(x.address, c.text)); }
            /* RR-343: the owner's own councils count by his word ("approved"); never one on a blocked private site */
            const why = ok ? null : ownerWord ? `your own council — counted by your word (RR-343)${x.doubt ? `; your note: ${x.doubt}` : ""}` : x.doubt ? `to verify — ${x.doubt}` : !page.ok && goneOf(page) && x.proposedBy === "almioet-record" ? goneOf(page)
              : page.ok && !nameOk ? "the name is not on its source page" : !siteOk ? "its website is not the body's own domain (a government's, an .org or the body's own name)"
              : !page.ok && !site?.ok ? `its website could not be read (${page.why}) and the search results do not show its name on that domain` : "its official website could not be confirmed";
            const keepOwn = byOwner && !addrOk && Boolean(x.address);
            const value = { name: x.name, nameType: x.nameType ?? null, website: x.website, address: addrOk || keepOwn ? x.address : null, siteCheck, ...(siteCheck === "search" ? { siteNote: SITE_ABROAD } : {}),
              ...(keepOwn ? { addressFrom: "the owner's input — not yet read on its official page" } : !addrOk ? { addressWhy: x.address ? "the address given is not on the body's pages" : "no address found yet (optional)" } : {}) };
            if (ok || ownerWord) { whole.add(x.profession); delete tried[x.profession]; }
            else { const t = (tried[x.profession] ??= { names: [], types: [], since: today }); if (!t.names.includes(x.name)) t.names.push(x.name); if (x.nameType && !t.types.includes(x.nameType)) t.types.push(x.nameType);
              if (!page.ok && !goneOf(page)) { t.unread ??= []; if (!t.unread.includes(x.sourceUrl)) t.unread = [...t.unread, x.sourceUrl].slice(-5); } }
            /* a council a page may already show (found by its name) is never replaced by an unconfirmed one — the new name is kept as tried */
            if (!ok && !ownerWord && named.has(x.profession)) continue;
            /* RR-333: the owner's own "to verify" is never replaced by someone else's unconfirmed one */
            if (!ok && !byOwner && ownerHeld.has(x.profession)) continue;
            if (byOwner && !ok) ownerHeld.add(x.profession);
            await put({ key: `council|${country}|${slug(x.profession)}`, country, profession: x.profession, part: "councils", kind: "council", value,
              sourceUrl: page.ok ? page.url : x.sourceUrl, sourceTitle: page.title ?? null, readOn: page.checkedOn ?? today, proposedBy: x.proposedBy, status: ok ? "confirmed" : ownerWord ? "approved" : "unconfirmed", why });
          }
          return true;
          }
        }

        async function rulesOf(country) {
          const councils = (await facts()).filter((f) => (f.product ?? "oet") === "oet" && f.part === "councils");
          const hosts = new Set(councils.map((f) => hostOf(f.value?.website)).filter(Boolean));
          let cands = (ORIGIN.items ?? []).filter((f) => f.country === country && ["goodStanding", "attestation"].includes(f.fact)).map((f) => ({ kind: f.fact === "goodStanding" ? "good standing" : "attestation", rule: f.text, quote: null, sourceUrl: f.link, proposedBy: "almioet-record", profession: f.profession ?? null }));
          if (aiConfigured(env)) {
            /* RR-330: the rules' pages that could not be read last time are named, so another official page is given */
            const unread = [...new Set((await store.facts({ country })).filter((f) => (f.product ?? "oet") === "oet" && f.part === "rules" && f.status === "unconfirmed" && /could not be read|answered 40[13]/.test(f.why ?? "")).map((f) => f.sourceUrl).filter(Boolean))];
            const r = await askOne(ruleQuestion({ country, subject: subject.name, councils: councils.map((f) => f.value.name), unread }));
            if (!r.ok) return finish(country, "rules", "retry", r.why);
            cands = [...(r.data.rules ?? []).filter((x) => x.rule && x.quote && x.sourceUrl).slice(0, 3).map((x) => ({ ...x, proposedBy: "ai" })), ...cands];
          }
          let n = 0;
          for (const x of cands) {
            if (!room()) return;
            const page = await reader.read(x.sourceUrl), h = hostOf(x.sourceUrl), own = Boolean(h && (governmentHost(h) || hosts.has(h) || x.proposedBy === "almioet-record"));
            const found = page.ok && (x.quote ? quoteOnPage(x.quote, page.text) : true);
            const why = !page.ok && goneOf(page) && x.proposedBy === "almioet-record" ? goneOf(page) : !own ? "its source page is not on an official website (the council's or the government's)" : !page.ok ? `its source page could not be read (${page.why})` : !found ? "the quoted words are not on its source page" : null;
            await put({ key: `rule|${country}|${slug(x.kind)}|${++n}`, country, profession: x.profession ?? null, part: "rules", kind: x.kind, value: { rule: x.rule, quote: x.quote ?? null }, sourceUrl: page.ok ? page.url : x.sourceUrl, sourceTitle: page.title ?? null, readOn: page.checkedOn ?? today, proposedBy: x.proposedBy, aiWritten: x.proposedBy === "ai", status: own && found ? "confirmed" : "unconfirmed", why });
          }
          return finish(country, "rules", aiConfigured(env) ? "done" : "waiting", aiConfigured(env) ? null : "the AI is not connected yet (ANTHROPIC_API_KEY) — AlmiOET's records only");
        }
      } else await productOf(u);
      /* the country's AI cost, for the owner's ETA (only a country tried in full counts) */
      out.byProduct[u.product] = (out.byProduct[u.product] ?? 0) + (out.aiUsd - before);
      if (!wasFinished && finished(u.product, u.country)) { out.finished.push(`${u.product}|${u.country}`); (costs[u.product] ??= []).push({ usd: out.aiUsd - before, reads: reader.requests() - readsBefore }); }
    }

    /* ── RR-329 B · one (product, country) of every other product: its questions, then its other parts in ONE AI question ── */
    async function productOf(u) {
      const p = u.product, c = u.country, T = templateOf(p), key = (part, n) => `${p}:${part}|${c}|${n}`;
      const mine = async () => (await store.facts({ country: c })).filter((f) => f.product === p && SHOWN_STATUS.includes(f.status));
      /* RR-334 (owner: every collector by the same rules) · REPLACES RR-329's "keyword groups answered from the country's facts": the
       * questions people really ask (keywords, Search Console, the owner's), grouped by meaning and answered from an official page, checked
       * here — else general guidance with no number (cf-questions.mjs); YouTube stays AlmiOET's */
      if (u.tasks.includes(`${p}:questions`) && room()) {
        const loc = LOCATIONS.find((l) => l.name === c) ?? null, own = T.own, have = await mine();
        const lines = have.filter((f) => f.part !== "questions").map((f) => f.value?.text).filter(Boolean);
        const bodies = [...new Map(have.filter((f) => f.value?.name && f.value?.website).map((f) => [f.value.name, { name: f.value.name, website: f.value.website }])).values()];
        const r = await collectQuestions({ country: c, location: loc, subject: T.name, subjectWords: T.subject, subjectSite: T.sites[0] ? `https://${T.sites[0]}` : null, skip: { test: (x) => BRANDS.test(x) && !own.test(x) }, lines, bodies, keyOf: (g) => key("question", slug(g.id)), product: p, youtube: false },
          { store, kwStore, env, reader, room, askOne, put, today, at, fetchImpl: youtubeFetch, youtube, aiOn: aiConfigured(env) });
        if (r.state !== null) await finish(c, `${p}:questions`, r.state, r.note, { stats: r.stats });
      }
      if (out.stoppedBy || !u.tasks.includes(`${p}:facts`)) return;
      /* the currency is known (ISO 4217) — a part of AlmiSalary's template */
      if (T.parts.includes("currency") && CURRENCY_OF[c]) await put({ key: key("currency", 1), product: p, country: c, part: "currency", kind: "currency", value: { text: `${c} pays in ${CURRENCY_OF[c]}.`, code: CURRENCY_OF[c] }, sourceUrl: "https://www.six-group.com/en/products-services/financial-information/data-standards.html", sourceTitle: "ISO 4217 (SIX, the maintenance agency)", readOn: today, status: "confirmed" });
      if (!aiConfigured(env)) return finish(c, `${p}:facts`, "waiting", "the AI is not connected yet (ANTHROPIC_API_KEY)");
      const have = await mine(), filled = new Set(have.filter((f) => f.part !== "questions").map((f) => f.part));
      const want = searchedParts(p).filter((k) => !filled.has(k)), bodies = bodyParts(p);
      if (!want.length) return finish(c, `${p}:facts`);
      if (!room(true)) return;
      const prev = tasks.get(`${c}|${p}:facts`)?.tried ?? {}, tried = Object.fromEntries(Object.entries(prev).filter(([k]) => want.includes(k)));
      const r = await askOne(productQuestion({ country: c, name: T.name, parts: want, info: PART_INFO, bodies: bodies.filter((b) => want.includes(b)), tried }));
      if (!r.ok) return finish(c, `${p}:facts`, "retry", r.why, prev);
      const got = new Set(), n = {};
      for (const x of (r.data.facts ?? []).filter((y) => want.includes(y.part) && y.sourceUrl).slice(0, 2 * want.length)) {
        if (!room()) return;
        const body = PART_INFO[x.part].kind === "body", page = await reader.read(x.sourceUrl), h = hostOf(x.sourceUrl);
        const official = Boolean(h && (governmentHost(h) || ownerSite(p, h) || (body && h === hostOf(x.website)) || have.some((f) => hostOf(f.value?.website) === h)));
        const text = page.ok ? `${page.title ?? ""} ${page.h1 ?? ""} ${page.text}` : "";
        const ok = page.ok && official && (body ? x.name && nameOnPage(x.name, text) : x.quote && quoteOnPage(x.quote, page.text)) && (x.part !== "fee" || numbersOf(x.quote).some((d) => numbersOf(page.text).includes(d)));
        const why = !official ? "its source page is not official (the government's, the body's own website or the test owner's)" : !page.ok ? `its source page could not be read (${page.why})` : !ok ? (body ? "the name is not on its source page" : "the quoted words are not on its source page") : null;
        if (ok) got.add(x.part); else if (body) { const t = (tried[x.part] ??= { names: [], types: [], since: today }); if (x.name && !t.names.includes(x.name)) t.names.push(x.name); if (x.nameType && !t.types.includes(x.nameType)) t.types.push(x.nameType); }
        n[x.part] = (n[x.part] ?? 0) + 1;
        await put({ key: key(x.part, n[x.part]), product: p, country: c, part: x.part, kind: body ? "body" : "statement", value: body ? { name: x.name, nameType: NAME_TYPES.includes(x.nameType) ? x.nameType : nameTypeOf(x.name), website: x.website, text: x.text, quote: x.quote || null } : { text: x.text, quote: x.quote },
          sourceUrl: page.ok ? page.url : x.sourceUrl, sourceTitle: page.title ?? null, readOn: page.checkedOn ?? today, proposedBy: "ai", aiWritten: true, status: ok ? "confirmed" : "unconfirmed", why });
      }
      for (const b of bodies) if (got.has(b)) delete tried[b];
      const stillBodies = bodies.filter((b) => !filled.has(b) && !got.has(b));
      for (const b of stillBodies) tried[b] ??= { names: [], types: [], since: today };
      /* rule R1: a body not found is searched again tomorrow (background work); the statements are tried again when due (30 days) */
      return stillBodies.length ? finish(c, `${p}:facts`, "searching", `still searching for ${stillBodies.map((b) => PART_INFO[b].name).join(", ")} — again tomorrow`, tried) : finish(c, `${p}:facts`);
    }

    if (!dailyDone && !out.stoppedBy) await dailySteps();
    out.reads = reader.requests() - r0;
    await store.addSpend(today, { aiUsd: out.aiUsd, reads: out.reads, searches: out.searches });
    /* the measured AI cost and page reads of a country per product: running averages the owner's ETA reads */
    if (kv) for (const [p, xs] of Object.entries(costs)) {
      try {
        const [old] = await kv.run([["GET", costKey(p)]]), o = old ? JSON.parse(old) : null, avg = (k) => xs.reduce((a, b) => a + b[k], 0) / xs.length, mix = (k, d) => Math.round((o?.[k] !== undefined ? o[k] * 0.7 + avg(k) * 0.3 : avg(k)) * 10 ** d) / 10 ** d;
        await kv.run([["SET", costKey(p), JSON.stringify({ usd: mix("usd", 4), reads: mix("reads", 1), n: (o?.n ?? 0) + xs.length }), "EX", 120 * 86400]]);
      } catch { /* the defaults are used */ }
    }
    /* RR-334 · the day's template counts (KV, 40 days) — the owner's page shows searches → confirmed results per template */
    if (kv && Object.keys(out.templates).length) try { const k = `av:cf:tpl:${today}`, [old] = await kv.run([["GET", k]]), sum = old ? JSON.parse(old) : {}; for (const [n, x] of Object.entries(out.templates)) { const s = (sum[n] ??= { asks: 0, searches: 0, found: 0, guidance: 0 }); for (const f of Object.keys(s)) s[f] += x[f] ?? 0; } await kv.run([["SET", k, JSON.stringify(sum), "EX", 40 * 86400]]); } catch { /* the owner's page only */ }
    if (kv) try { await kv.run([["SET", "av:cf:last", JSON.stringify({ at: at(), ...out }), "EX", 14 * 86400]]); } catch { /* the owner's page only */ }
    const noKey = !aiConfigured(env) && out.saved === 0;
    const code = out.stoppedBy === "TIME" ? null : out.stoppedBy ?? (noKey ? "AI_KEY" : out.aiError && out.saved === 0 ? (/not set|401|authentication|permission|403/i.test(out.aiError) ? "AI_KEY" : "AI_ERROR") : null);
    await recordRun(kv, "facts", today, { progress: out.saved + out.done.length, code, why: out.why ?? (noKey ? "ANTHROPIC_API_KEY is not set in Vercel — the collector can only read official pages and AlmiOET's records." : out.aiError), aiUsd: out.aiUsd, facts: out.saved, finished: out.finished });
    return out;
  } finally { if (kv) try { const [held] = await kv.run([["GET", "av:cf:lock"]]); if (held === id) await kv.run([["DEL", "av:cf:lock"]]); } catch { /* it expires by itself */ } }
}
/* RR-333 · the day's exchange rates, read once a day (KV, 2 days) — every later run that day reuses them */
export async function ratesOfToday({ kv, today, read }) {
  const key = `av:cf:rates:${today}`;
  if (kv) { try { const [r] = await kv.run([["GET", key]]); if (r) return JSON.parse(r); } catch { /* read them */ } }
  const rates = await read();
  if (kv) try { await kv.run([["SET", key, JSON.stringify(rates), "EX", 2 * 86400]]); } catch { /* read again next run */ }
  return rates;
}
/* RR-329 C (rule R8): a page that answered 404 or 410 is GONE — its record is hidden until a later read confirms it */
const goneOf = (page) => (/answered (404|410)\b/.test(page?.why ?? "") ? `the page is gone (it ${String(page.why).replace(/^the page /, "")}) — hidden until it is read again and confirmed` : null);
