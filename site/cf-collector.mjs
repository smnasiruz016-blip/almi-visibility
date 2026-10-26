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
import { CF_PROFESSIONS, NAME_TYPES, nameTypeOf, councilWhole, questionGroups, nameOnPage, addressOnPage, quoteOnPage, numbersOf, hostOf, governmentHost, SHOWN_STATUS } from "../desktop/country-facts.mjs";
import { PRODUCT_FACTS, PART_INFO, FACT_PRODUCTS, searchedParts, bodyParts, ownerSite } from "../desktop/product-facts.mjs";
import { feeOf } from "../desktop/fee.mjs";
import { readRates, feeInCurrency, CURRENCY_OF, localShown as localFee } from "../desktop/rates.mjs";
import { venueCountries } from "../desktop/venues.mjs";
import { BRANDS } from "./kw-finder.mjs";
import ORIGIN from "../desktop/lists/almiworld-oet-origin-facts.json" with { type: "json" };
import { LOCATIONS } from "./kw-seeds.mjs";
import { DEFAULT_QUEUE, orderWork } from "./queue.mjs";
import { recordRun } from "./health.mjs";
import { askAi, aiConfigured, councilQuestion, ruleQuestion, answerQuestion, productQuestion } from "./cf-ai.mjs";
import { collectQuestions } from "./cf-questions.mjs";

export const CF_SUBJECT = Object.freeze({ name: "OET", site: "https://oet.com" });
export const CF_COLLECTOR = Object.freeze({ runBudgetMs: 240000, lockSeconds: 290, aiUsdPerDay: 2, readsPerDay: 200, aiReserveUsd: 0.1, maxGroups: 8, refreshDays: Object.freeze({ fee: 1, centres: 7, questions: 7, councils: 30, rules: 30, facts: 30 }),
  /* a country's AI cost and page reads until enough are measured (Claude Haiku 5.5: about 6 web searches a question; AlmiOET reads its 12
   * councils' pages, its rules and AlmiOET's records) */
  defaultCost: Object.freeze({ oet: 0.25, other: 0.12 }), defaultReads: Object.freeze({ oet: 18, other: 4 }) });
/* RR-329: the queue's country order (the owner's first 15, next 15, then the rest) — kept under its RR-328 name */
export const CF_ORDER = DEFAULT_QUEUE.countries;
const OET_TASKS = ["questions", "councils", "rules"];
const ALL = "*";
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const PROF_OF = Object.fromEntries(CF_PROFESSIONS.flatMap((p) => [[p, p], [`${p}s`, p]]).concat([["doctors", "medicine"], ["nurses", "nursing"], ["dentists", "dentistry"], ["pharmacists", "pharmacy"], ["physiotherapists", "physiotherapy"], ["occupational therapists", "occupational therapy"], ["radiographers", "radiography"], ["dietitians", "dietetics"], ["optometrists", "optometry"], ["podiatrists", "podiatry"], ["speech pathologists", "speech pathology"], ["vets", "veterinary science"], ["veterinarians", "veterinary science"]]));
export const professionKey = (s) => PROF_OF[String(s ?? "").toLowerCase().trim()] ?? null;
export const capsOf = (env = process.env) => ({ aiUsd: Number(env.COUNTRY_FACTS_AI_USD_PER_DAY) > 0 ? Number(env.COUNTRY_FACTS_AI_USD_PER_DAY) : CF_COLLECTOR.aiUsdPerDay, reads: Number(env.COUNTRY_FACTS_READS_PER_DAY) > 0 ? Math.floor(Number(env.COUNTRY_FACTS_READS_PER_DAY)) : CF_COLLECTOR.readsPerDay });
/* the tasks of one (product, country) — AlmiOET keeps its RR-328 task names; every other product "<key>:questions" and "<key>:facts" */
export const tasksOf = (product) => (product === "oet" ? OET_TASKS : [`${product}:questions`, `${product}:facts`]);
const refreshOf = (t) => CF_COLLECTOR.refreshDays[t.includes(":") ? t.split(":")[1] : t] ?? 30;
/** a (product, country) is FINISHED for the queue when each of its tasks was tried once (a body still searched for is background work) */
export const finishedIn = (tasks) => (product, country) => tasksOf(product).every((t) => { const x = tasks.get(`${country}|${t}`); return x && ["done", "searching", "waiting"].includes(x.state); });
/** the measured AI cost of one country of a product (kept in the store's KV as a running average) */
export const costKey = (p) => `av:cf:cost:${p}`;

/** one run. → { ok, day, saved, unconfirmed, kept, done: ["Pakistan · councils", …], searching, finished, stoppedBy, why, aiUsd, reads, searches } */
export async function runCountryFacts({ store, kwStore = null, kv = null, env = process.env, reader, ai = askAi, now = () => Date.now(), budgetMs = CF_COLLECTOR.runBudgetMs, countries = null, subject = CF_SUBJECT, queue = DEFAULT_QUEUE, products = FACT_PRODUCTS, youtube = null, youtubeFetch = fetch }) {
  const start = now(), today = dayOf(start), at = () => new Date(now()).toISOString(), id = randomBytes(8).toString("hex");
  if (kv) { const [locked] = await kv.run([["SET", "av:cf:lock", id, "NX", "EX", CF_COLLECTOR.lockSeconds]]); if (locked !== "OK") return { ok: false, day: today, why: "Another country-facts run is working — this one did nothing." }; }
  const caps = capsOf(env), spent = await store.spend(today), r0 = reader.requests(), tasks = await store.tasks();
  const out = { ok: true, day: today, saved: 0, unconfirmed: 0, kept: 0, done: [], searching: [], finished: [], stoppedBy: null, why: null, aiUsd: 0, reads: 0, searches: 0, aiError: null };
  /* RR-328 addition (rule R1): a council still "searching" is searched again every day — once a day, never stopped at "missing" */
  const due = (c, t) => { const x = tasks.get(`${c}|${t}`); return !x || (x.state === "searching" ? x.day !== today : x.state !== "done" || daysBetween(x.day, today) >= refreshOf(t)); };
  const stop = (code, why) => { out.stoppedBy = code; out.why = why; return false; };
  const room = (needAi = false) => {
    if (now() - start > budgetMs) return stop("TIME", "This run's time is used — the next run continues.");
    if (spent.reads + reader.requests() - r0 >= caps.reads) return stop("READS", `Today's ${caps.reads} page reads are used — the next day continues.`);
    if (needAi && spent.aiUsd + out.aiUsd + CF_COLLECTOR.aiReserveUsd > caps.aiUsd) return stop("AI_BUDGET", `Today's AI budget ($${caps.aiUsd.toFixed(2)}) is used — the next day continues.`);
    return true;
  };
  const put = async (f) => { const r = await store.putFact({ proposedBy: "official", aiWritten: false, ...f }, { at: at() }); if (r.saved) { out.saved++; if (f.status === "unconfirmed") out.unconfirmed++; } else if (/owner/.test(r.why ?? "")) out.kept++; return r; };
  const finish = async (c, t, state = "done", note = null, tried = null) => { await store.setTask(c, t, { day: today, state, note, tried }); tasks.set(`${c}|${t}`, { day: today, state, tried }); if (state === "done") out.done.push(`${c === ALL ? "all countries" : c} · ${t}`); if (state === "searching") out.searching.push(`${c} · ${t}`); };
  /* the AI's own failure (no key, a refused key, no answer) is kept for the health check — never silent */
  const askOne = async (q) => { const r = await ai({ env, ...q }); out.aiUsd += r.usd ?? 0; out.searches += r.searches ?? 0; if (!r.ok) out.aiError = r.why; return r; };
  const list = countries ?? queue.countries;
  const finished = finishedIn(tasks), costs = {};
  try {
    let sitemap = null; const urls = async () => (sitemap ??= await reader.sitemapOf(subject.site)).urls ?? [];
    /* ── 1 · AlmiOET: the fee in every country's money (daily) ── */
    if (products.includes("oet") && due(ALL, "fee") && room()) {
      const fee = await feeOf({ urls: await urls(), subject: subject.name, subjectName: subject.name, reader });
      if (!fee.ok) await finish(ALL, "fee", "retry", fee.why);
      else {
        const rates = await readRates({ reader, countries: COUNTRIES, on: at() });
        for (const c of COUNTRIES) {
          const f = feeInCurrency(fee, c, rates), last = f.steps?.at(-1) ?? null;
          await put({ key: `fee|${c}`, country: c, part: "fee", kind: "fee", value: { official: `${fee.currency} ${fee.amount}`, line: f.line, local: localFee(f.line), currency: f.currency ?? CURRENCY_OF[c] ?? null, amount: f.amount ?? null, rate: last ? { source: last.source, link: last.link, date: last.rateDate, said: last.said, open: Boolean(last.open) } : null }, sourceUrl: fee.source.url, sourceTitle: fee.source.title, readOn: fee.checkedOn, status: "confirmed" });
        }
        await finish(ALL, "fee");
      }
    }
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
    /* ── 3 · per (product, country), in the queue's order: the front first, a background task (another country, a daily re-search) every 4th ── */
    const units = [];
    for (const p of products) for (const c of list) {
      const ts = tasksOf(p).filter((t) => due(c, t)); if (!ts.length) continue;
      const background = finished(p, c) && ts.every((t) => tasks.get(`${c}|${t}`)?.state === "searching");
      units.push({ id: `${p}|${c}`, product: p, country: c, tasks: ts, background });
    }
    for (const u of orderWork(units, { queue })) {
      if (out.stoppedBy) break;
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
          const lines = known.filter((f) => (f.product ?? "oet") === "oet").map((f) => f.part === "fee" ? (f.value?.line ? `the ${subject.name} fee: ${String(f.value.line).split(" — ")[0]}` : null) : f.part === "centres" ? (f.value.venue ? `${subject.name}'s own pages name a test venue in ${country}` : f.value.home ? `no venue in ${country}; ${f.value.home}${f.value.nearest?.length ? `; nearest venues: ${f.value.nearest.join(", ")}` : ""}` : null) : f.part === "councils" ? `${f.profession}: ${f.value.name}` : f.part === "rules" ? f.value.rule : null).filter(Boolean);
          const bodies = [...new Map(known.filter((f) => f.part === "councils" && f.value?.name).map((f) => [f.value.name, { name: f.value.name, website: f.value.website }])).values()];
          const r = await collectQuestions({ country, location: loc, subject: subject.name, subjectSite: subject.site, skip: BRANDS, fee, lines, bodies },
            { store, kwStore, env, reader, room, askOne, put, today, at, fetchImpl: youtubeFetch, youtube, aiOn: aiConfigured(env) });
          if (r.state === null) return;
          return finish(country, "questions", r.state, r.note, { stats: r.stats });
        }

        /* RR-328 addition (rule R1): only the professions still without a whole council are searched; the body may have any same-meaning
         * name (its name type is recorded); each name tried and not confirmed is kept, so the next day's search looks further */
        async function councilsOf(country) {
          const shownC = (await facts()).filter((f) => (f.product ?? "oet") === "oet" && f.part === "councils"), whole = new Set(shownC.filter((f) => councilWhole(f.value) || f.status === "owner").map((f) => f.profession)), named = new Set(shownC.map((f) => f.profession));
          const needed = CF_PROFESSIONS.filter((p) => !whole.has(p));
          if (!needed.length) return finish(country, "councils");
          const prev = tasks.get(`${country}|councils`)?.tried ?? {}, tried = Object.fromEntries(Object.entries(prev).filter(([p]) => needed.includes(p)).map(([p, t]) => [p, { names: [...t.names], types: [...t.types], since: t.since, unread: [...(t.unread ?? [])] }]));
          /* RR-330: the official pages that could not be read last time are named, so the AI gives another official page (cause of most "0") */
          const unread = [...new Set(Object.values(tried).flatMap((t) => t.unread ?? []))];
          const known = (ORIGIN.items ?? []).filter((f) => f.country === country && f.fact === "council" && needed.includes(f.profession)).map((f) => ({ profession: f.profession, name: f.name ?? f.text, link: f.link }));
          let cands = known.map((k) => ({ profession: k.profession, name: k.name, nameType: nameTypeOf(k.name), website: k.link, address: "", sourceUrl: k.link, proposedBy: "almioet-record" }));
          if (aiConfigured(env)) {
            const r = await askOne(councilQuestion({ country, subject: subject.name, professions: needed, known, tried, unread }));
            if (!r.ok) return finish(country, "councils", "retry", r.why, tried);
            const ai = (r.data.councils ?? []).map((x) => ({ ...x, profession: professionKey(x.profession), nameType: NAME_TYPES.includes(x.nameType) ? x.nameType : nameTypeOf(x.name), proposedBy: "ai" })).filter((x) => x.profession && needed.includes(x.profession) && x.name && x.sourceUrl);
            cands = [...ai, ...cands.filter((k) => !ai.some((x) => x.profession === k.profession))];
          }
          for (const x of cands) {
            if (!room()) return;
            const page = await reader.read(x.sourceUrl), own = hostOf(x.sourceUrl) && (hostOf(x.sourceUrl) === hostOf(x.website) || governmentHost(hostOf(x.sourceUrl)));
            const text = page.ok ? `${page.title ?? ""} ${page.h1 ?? ""} ${page.text}` : "";
            const nameOk = page.ok && nameOnPage(x.name, text), addrOk = nameOk && x.address && addressOnPage(x.address, text);
            const why = !page.ok && goneOf(page) && x.proposedBy === "almioet-record" ? goneOf(page) : !own ? "its source page is not on the body's own website or its government's" : !page.ok ? `its source page could not be read (${page.why})` : !nameOk ? "the name is not on its source page" : null;
            const value = { name: x.name, nameType: x.nameType ?? null, website: x.website, address: addrOk ? x.address : null, ...(nameOk && !addrOk ? { addressWhy: x.address ? "the address given is not on the source page" : "no address found yet" } : {}) };
            if (own && nameOk && councilWhole(value)) { whole.add(x.profession); delete tried[x.profession]; }
            else { const t = (tried[x.profession] ??= { names: [], types: [], since: today }); if (!t.names.includes(x.name)) t.names.push(x.name); if (x.nameType && !t.types.includes(x.nameType)) t.types.push(x.nameType);
              if (!page.ok && !goneOf(page)) { t.unread ??= []; if (!t.unread.includes(x.sourceUrl)) t.unread = [...t.unread, x.sourceUrl].slice(-5); } }
            /* a council a page may already show (found by its name) is never replaced by an unconfirmed one — the new name is kept as tried */
            if (!(own && nameOk) && named.has(x.profession)) continue;
            await put({ key: `council|${country}|${slug(x.profession)}`, country, profession: x.profession, part: "councils", kind: "council", value,
              sourceUrl: page.ok ? page.url : x.sourceUrl, sourceTitle: page.title ?? null, readOn: page.checkedOn ?? today, proposedBy: x.proposedBy, status: own && nameOk ? "confirmed" : "unconfirmed", why });
          }
          const still = CF_PROFESSIONS.filter((p) => !whole.has(p));
          for (const p of still) tried[p] ??= { names: [], types: [], since: today };
          if (!still.length) return finish(country, "councils");
          if (!aiConfigured(env)) return finish(country, "councils", "waiting", "the AI is not connected yet (ANTHROPIC_API_KEY) — AlmiOET's records only", tried);
          return finish(country, "councils", "searching", `still searching for ${still.length} of ${CF_PROFESSIONS.length}: ${still.join(", ")} — again tomorrow`, tried);
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
      if (!wasFinished && finished(u.product, u.country)) { out.finished.push(`${u.product}|${u.country}`); (costs[u.product] ??= []).push({ usd: out.aiUsd - before, reads: reader.requests() - readsBefore }); }
    }

    /* ── RR-329 B · one (product, country) of every other product: its questions, then its other parts in ONE AI question ── */
    async function productOf(u) {
      const p = u.product, c = u.country, T = PRODUCT_FACTS[p], key = (part, n) => `${p}:${part}|${c}|${n}`;
      const mine = async () => (await store.facts({ country: c })).filter((f) => f.product === p && SHOWN_STATUS.includes(f.status));
      if (u.tasks.includes(`${p}:questions`) && room()) {
        const loc = LOCATIONS.find((l) => l.name === c), own = T.own;
        if (!loc || !kwStore) await finish(c, `${p}:questions`, "done", "no keyword data for this country (Google cannot target it)");
        else {
          const rows = await kwStore.keywordsAt({ location: loc.code, language: "en" });
          const top = questionGroups(rows, { subject: T.subject, skip: { test: (t) => BRANDS.test(t) && !own.test(t) }, max: CF_COLLECTOR.maxGroups });
          if (!top.length) await finish(c, `${p}:questions`, "done", `no question-type searches about ${T.name} from ${c} in the keyword database yet`);
          else if (!aiConfigured(env)) await finish(c, `${p}:questions`, "waiting", "the AI is not connected yet (ANTHROPIC_API_KEY)");
          else if (room(true)) {
            const lines = (await mine()).filter((f) => f.part !== "questions").map((f) => f.value?.text).filter(Boolean);
            const r = await askOne(answerQuestion({ country: c, subject: T.name, groups: top, facts: lines }));
            if (!r.ok) await finish(c, `${p}:questions`, "retry", r.why);
            else {
              const allowed = new Set([...numbersOf(lines.join(" ")), ...top.flatMap((g) => numbersOf(g.keywords.join(" ")))]);
              for (const g of top) {
                const a = (r.data.answers ?? []).find((x) => x.group === g.group); if (!a?.answer) continue;
                const extra = numbersOf(a.answer).filter((n) => !allowed.has(n));
                await put({ key: key("question", slug(g.group)), product: p, country: c, part: "questions", kind: "question", value: { question: g.keywords[0], keywords: g.keywords.slice(0, 10), volume: g.volume, period: g.period, intent: g.group, answer: a.answer.trim(), label: "AI-written from the country's confirmed facts" }, readOn: today, aiWritten: true, proposedBy: "ai",
                  status: extra.length ? "unconfirmed" : "confirmed", why: extra.length ? `the answer states ${extra.join(", ")}, which no confirmed fact says` : null });
              }
              await finish(c, `${p}:questions`);
            }
          }
        }
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

    out.reads = reader.requests() - r0;
    await store.addSpend(today, { aiUsd: out.aiUsd, reads: out.reads, searches: out.searches });
    /* the measured AI cost and page reads of a country per product: running averages the owner's ETA reads */
    if (kv) for (const [p, xs] of Object.entries(costs)) {
      try {
        const [old] = await kv.run([["GET", costKey(p)]]), o = old ? JSON.parse(old) : null, avg = (k) => xs.reduce((a, b) => a + b[k], 0) / xs.length, mix = (k, d) => Math.round((o?.[k] !== undefined ? o[k] * 0.7 + avg(k) * 0.3 : avg(k)) * 10 ** d) / 10 ** d;
        await kv.run([["SET", costKey(p), JSON.stringify({ usd: mix("usd", 4), reads: mix("reads", 1), n: (o?.n ?? 0) + xs.length }), "EX", 120 * 86400]]);
      } catch { /* the defaults are used */ }
    }
    if (kv) try { await kv.run([["SET", "av:cf:last", JSON.stringify({ at: at(), ...out }), "EX", 14 * 86400]]); } catch { /* the owner's page only */ }
    const noKey = !aiConfigured(env) && out.saved === 0;
    const code = out.stoppedBy === "TIME" ? null : out.stoppedBy ?? (noKey ? "AI_KEY" : out.aiError && out.saved === 0 ? (/not set|401|authentication|permission|403/i.test(out.aiError) ? "AI_KEY" : "AI_ERROR") : null);
    await recordRun(kv, "facts", today, { progress: out.saved + out.done.length, code, why: out.why ?? (noKey ? "ANTHROPIC_API_KEY is not set in Vercel — the collector can only read official pages and AlmiOET's records." : out.aiError), aiUsd: out.aiUsd, facts: out.saved, finished: out.finished });
    return out;
  } finally { if (kv) try { const [held] = await kv.run([["GET", "av:cf:lock"]]); if (held === id) await kv.run([["DEL", "av:cf:lock"]]); } catch { /* it expires by itself */ } }
}
/* RR-329 C (rule R8): a page that answered 404 or 410 is GONE — its record is hidden until a later read confirms it */
const goneOf = (page) => (/answered (404|410)\b/.test(page?.why ?? "") ? `the page is gone (it ${String(page.why).replace(/^the page /, "")}) — hidden until it is read again and confirmed` : null);
