/**
 * 🔴 RR-375 items 1, 2, 3, 5 (owner, 5 Nov 2026; plan jobs 2 + 5) · THE ANSWERS COLLECTOR (Vercel Cron → /cron/answers): product by product, country by country, every question the collectors hold gets ONE saved answer with its source's name, link, date, type (official or not) and kind (truth or other). Same rules as the app: desktop/answer-finder.mjs is the one code for both.
 * IT RUNS ALONE: each answer is saved the moment it is known, so a crash or a restart loses nothing and nothing paid is done twice. A lock stops two runs at once.
 * ITS MONEY: the collectors' one AI cap (site/cf-collector.mjs capsOf, $2 a day; the owner may set $3 in Vercel), read before each call; it stops with a margin and says why. Paid Google results only through the top-pages collector's own list (its $1 a day and $50 in total): a question that needs them is put on that list once, and read when it comes. No cap is changed here.
 * FRESHNESS comes first in each run: answers due (desktop/freshness.mjs) are read again, free. A changed one is marked; the app lists its pages as "needs rebuild".
 * BING, the lawful way: Bing Webmaster's own query report for our own sites (a key named BING_WEBMASTER_API_KEY in Vercel), as questions and as what people search. Never a Bing page.
 */
import { randomBytes } from "node:crypto";
import { findOne, keyOf, officialHostsOf, FINDER } from "../desktop/answer-finder.mjs";
import { costOf } from "../desktop/ai-coach.mjs";
import { isDue, recheck } from "../desktop/freshness.mjs";
import { freeSearch } from "../desktop/free-search.mjs";
import { countriesIn } from "../desktop/world.mjs";
import { BING_API, bingRows } from "../desktop/bing-webmaster.mjs";
import { allTopics, answersTopic, answerRow, questionBank, LIVE_JOBS } from "./almiseo.mjs";
import { capsOf } from "./cf-collector.mjs";
import { aiConfigured, CF_AI } from "./cf-ai.mjs";
import { DEFAULT_QUEUE } from "./queue.mjs";
import { pathwayQuestions, OFFICIAL_HOSTS } from "./pathway-data.mjs"; // RR-376
import { recordRun } from "./health.mjs";

export const ANSWERS = Object.freeze({ runBudgetMs: 240000, lockSeconds: 290, marginUsd: 0.05, recheckPerRun: 80, queuedIntentsPerTopic: 60, offEnv: "ALMISEO_ANSWERS_OFF", bingKey: "BING_WEBMASTER_API_KEY", job: "answers" });
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const LOCK = "av:answers:lock", INTENTS = (id) => `answer-intents:${id}`, USAGE = "free-search-usage", BING = (id) => `bing-queries:${id}`;
const looksAsked = (q) => /\?\s*$/.test(q) || /^(?:how|what|which|who|where|when|why|can|does|do|is|are|should)\b/i.test(q);

/** a topic's questions, the queue's countries first, each once */
export function questionsOf({ bank = { groups: [], asked: [] }, lists = [], bing = [], countries = DEFAULT_QUEUE.countries }) {
  const rank = new Map(countries.map((c, i) => [c, i])), seen = new Map();
  const put = (q, source) => { const t = String(q ?? "").replace(/\s+/g, " ").trim(); if (t.length < 8 || t.length > 200 || !looksAsked(t)) return; const k = keyOf(t); if (!seen.has(k)) seen.set(k, { key: k, question: /\?$/.test(t) ? t : `${t}?`, source }); };
  for (const g of bank.groups ?? []) put(g.question, "collector"); for (const a of bank.asked ?? []) put(a.question ?? a.text, a.source ?? "asked"); for (const l of lists) for (const p of l.paa ?? []) put(p, "people also ask"); for (const b of bing) put(b.query, "Bing");
  const place = (r) => Math.min(...countriesIn(r.question).map((c) => rank.get(c) ?? 1e6), 1e6);
  return [...seen.values()].map((r) => ({ ...r, country: countriesIn(r.question)[0] ?? null, at: place(r) })).sort((a, b) => a.at - b.at);
}
const hostsFor = (topic, facts) => { const pages = facts.filter((f) => (f.product ?? "oet") === topic.id && ["confirmed", "approved"].includes(f.status)).flatMap((f) => [f.sourceUrl, f.value?.website]).filter((u) => /^https?:/.test(u ?? "")); return officialHostsOf({ pages: [{ items: [{ claims: pages.map((link) => ({ official: true, link })) }] }] }); };
const CLASS = (q) => (/\bprepar\w*|\bpractice\b|\bstudy\b|\btips?\b|\bwait\w*|\bdocuments?\b|\bcomputer\b.*\bpaper\b|\bpaper\b.*\bcomputer\b/i.test(q) && !/\bfees?\b|\bcosts?\b|\bscores?\b|\bregist\w*|\baccept\w*|\bvalid\w*/i.test(q) ? "other" : "truth");

/** Bing's own report for a site of ours, kept for the questions job. No key: nothing runs */
export async function readBing({ seo, env, topic, site, fetchImpl = fetch, at }) {
  const key = String(env[ANSWERS.bingKey] ?? ""); if (!key || !site) return { read: false };
  const held = await seo.setting(BING(topic.id)).catch(() => null); if (held?.on === dayOf(at)) return { read: false, rows: held.rows ?? [] };
  let r; try { r = await fetchImpl(`${BING_API}GetQueryStats?siteUrl=${encodeURIComponent(site)}&apikey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(30000) }); } catch { return { read: false, rows: held?.rows ?? [] }; }
  if (!r.ok) return { read: false, rows: held?.rows ?? [] };
  const rows = bingRows(await r.json().catch(() => null)).slice(0, 2000); await seo.setSetting(BING(topic.id), { on: dayOf(at), rows }, { at }); return { read: true, rows };
}
/** answers due are read again, free. → how many changed */
export async function runFreshness({ seo, topic, reader, today, at, keep = () => true, limit = ANSWERS.recheckPerRun }) {
  const t = answersTopic(topic.id), keys = (await seo.searchKeys(t)) ?? [], rows = await seo.searches(t, keys), out = { checked: 0, changed: 0, unread: 0 };
  for (const r of rows) {
    if (out.checked >= limit || !keep()) break; const v = r.data; if (!v?.ok || v.changed || !isDue(v, today)) continue;
    out.checked++; const page = await Promise.resolve(reader.read(v.url)).catch(() => null), c = recheck(v, page);
    if (c.state === "unread") { out.unread++; continue; } /* a page that would not open is not a change: it is tried again */
    if (c.state === "changed") out.changed++;
    await seo.putSearches([{ topic: t, key: r.key, kind: "answer", day: today, data: { ...v, checkedOn: today, ...(c.state === "changed" ? { changed: { on: today, why: c.why } } : {}) } }], { at });
  }
  return out;
}
export async function runAnswers({ seo, cf, kv = null, env = process.env, reader, fetchImpl = fetch, aiFetch = fetchImpl, aiBase = undefined, now = () => Date.now(), budgetMs = ANSWERS.runBudgetMs, groups = [], queue = DEFAULT_QUEUE, siteOf = () => null, freeBases = undefined }) {
  const start = now(), at = new Date(start).toISOString(), today = dayOf(start), id = randomBytes(8).toString("hex");
  if (env[ANSWERS.offEnv] === "1") return { ok: false, day: today, why: `The answers collector is switched off (${ANSWERS.offEnv}).` };
  if (!aiConfigured(env)) return { ok: false, day: today, why: `${CF_AI.keyName} is not set in Vercel yet.` };
  if (kv) { const [locked] = await kv.run([["SET", LOCK, id, "NX", "EX", ANSWERS.lockSeconds]]); if (locked !== "OK") return { ok: false, day: today, why: "Another answers run is working: this one did nothing." }; }
  const out = { ok: true, day: today, answered: 0, noSource: 0, waiting: 0, checked: 0, changed: 0, usd: 0, stoppedBy: null, why: null, topic: null, left: 0 };
  try {
    const caps = capsOf(env), spent0 = (await cf.spend(today)).aiUsd ?? 0, facts = await cf.facts(), order = (() => { const list = queue.products.filter((p) => p !== "pathway"), at = list.indexOf("visibility"); list.splice(at + 1, 0, "pathway"); return list; })() /* RR-376: right after AlmiVisibility */, rank = (t) => { const i = order.indexOf(t.id); return i < 0 ? 1e6 : i; };
    const topics = (await allTopics({ seo, groups })).filter((t) => t.owner === "almiworld" && !t.paused && ((t.jobs ?? LIVE_JOBS).includes("questions") || t.id === "pathway")).sort((a, b) => rank(a) - rank(b));
    const room = () => spent0 + out.usd + ANSWERS.marginUsd < caps.aiUsd, inTime = () => now() - start < budgetMs;
    const usage = (await seo.setting(USAGE).catch(() => null)) ?? {}, free = freeSearch({ keyOf: (n) => env[n] || null, usage, fetchImpl, now, ...(freeBases ? { bases: freeBases } : {}) });
    let spendQueue = Promise.resolve();
    for (const topic of topics) {
      if (out.stoppedBy) break;
      const fresh = await runFreshness({ seo, topic, reader, today, at, keep: inTime }); out.checked += fresh.checked; out.changed += fresh.changed;
      if (!room()) { out.stoppedBy = "CAP"; out.why = `Today's collector AI cap ($${caps.aiUsd}) is reached: saved, and tomorrow continues.`; break; }
      if (!inTime()) { out.stoppedBy = "TIME"; out.why = "This run's time is used: the next run continues."; break; }
      /* 🔴 RR-376 item 5: official only, for every line; a blocked official site is "verify on official", with its link, for the owner's own browser */
      if (topic.id === "pathway") { const t = answersTopic("pathway"), hosts = new Set(OFFICIAL_HOSTS), rows = pathwayQuestions(), keys = rows.map((r) => keyOf(r.question)), held = new Map((await seo.searches(t, keys)).map((r) => [r.key, r])), todo = rows.filter((r) => { const h = held.get(keyOf(r.question))?.data; return !h || h.changed || (!h.ok && isDue(h, today)); }); out.left += todo.length; for (const r of todo) { if (!inTime()) { out.stoppedBy = "TIME"; out.why = "This run's time is used: the next run continues."; break; } if (!room()) { out.stoppedBy = "CAP"; out.why = `Today's collector AI cap ($${caps.aiUsd}) is reached: saved, and tomorrow continues.`; break; } const key = keyOf(r.question); let verify = null; const v = await findOne({ key, part: "fee", question: r.question, cls: "truth", pages: [], country: r.to, link: null, body: null }, { read: (u) => reader.read(u), on: today, key: env[CF_AI.keyName], officialHosts: hosts, allowed: room, onUnread: (u) => { verify ??= u; }, onUsage: (u) => { const c = costOf(u); out.usd += c; spendQueue = spendQueue.then(() => cf.addSpend(today, { aiUsd: c })); }, moreAddresses: () => r.pages, fetchImpl: aiFetch, ...(aiBase ? { base: aiBase } : {}) }); if (v.stopped) { out.stoppedBy = v.stopped === "cap" ? "CAP" : "AI"; out.why = v.stopped === "cap" ? `Today's collector AI cap ($${caps.aiUsd}) is reached: saved, and tomorrow continues.` : v.stopped; break; } await seo.putSearches([{ topic: t, key, kind: "answer", day: today, data: { ...answerRow({ ...v, key }, today), corridor: r.corridor, partOf: r.part, ...(!v.ok && verify ? { verify } : {}) } }], { at }); if (v.ok) out.answered++; else out.noSource++; out.left--; } continue; }
      const bing = await readBing({ seo, env, topic, site: siteOf(topic), fetchImpl, at }).catch(() => ({ rows: [] })), lists = await seo.lists(topic.id), bank = await questionBank({ cf, topic, keywords: true }), asked = questionsOf({ bank, lists, bing: bing.rows ?? [], countries: queue.countries });
      if (!asked.length) continue;
      const t = answersTopic(topic.id), held = new Map(); for (let i = 0; i < asked.length; i += 500) for (const r of await seo.searches(t, asked.slice(i, i + 500).map((x) => x.key))) held.set(r.key, r);
      const todo = asked.filter((x) => { const r = held.get(x.key); return !r || r.data?.again || r.data?.changed || (!r.data?.ok && isDue(r.data, today)); }); out.left += todo.length; if (!todo.length) continue; out.topic ??= topic.id;
      const officialHosts = hostsFor(topic, facts), byCountry = new Map(); for (const f of facts) if ((f.product ?? "oet") === topic.id && f.country && /^https?:/.test(f.sourceUrl ?? "")) byCountry.set(f.country, [...(byCountry.get(f.country) ?? []), f.sourceUrl]);
      const serpCache = Object.fromEntries(lists.map((l) => [`${l.intent}||`, { results: l.results ?? [] }])), listOf = new Map(lists.map((l) => [l.intent, l])), intentsHeld = (await seo.setting(INTENTS(topic.id)).catch(() => null)) ?? { intents: [] }, officialLines = facts.filter((f) => (f.product ?? "oet") === topic.id && f.part === "questions" && f.status === "confirmed" && f.value?.answer).map((f) => String(f.value.answer));
      const search = async (q) => { const l = listOf.get(q); if (l?.results?.length) return l.results; if (!intentsHeld.intents.includes(q) && intentsHeld.intents.length < ANSWERS.queuedIntentsPerTopic) { intentsHeld.intents.push(q); await seo.setSetting(INTENTS(topic.id), intentsHeld, { at }); } return []; };
      for (const x of todo) {
        if (!inTime()) { out.stoppedBy = "TIME"; out.why = "This run's time is used: the next run continues."; break; }
        if (!room()) { out.stoppedBy = "CAP"; out.why = `Today's collector AI cap ($${caps.aiUsd}) is reached: saved, and tomorrow continues.`; break; }
        const row = { key: x.key, part: "questionsa", question: x.question, cls: CLASS(x.question), pages: [], country: x.country, link: null, body: null };
        const v = await findOne(row, { read: (u) => reader.read(u), on: today, key: env[CF_AI.keyName], officialHosts, serpCache, search, free, allowed: room, onUsage: (u) => { const c = costOf(u); out.usd += c; spendQueue = spendQueue.then(() => cf.addSpend(today, { aiUsd: c })); }, officialLines: () => officialLines.filter((a) => a.toLowerCase().split(/\W+/).some((w) => w.length > 4 && x.question.toLowerCase().includes(w))).slice(0, 6), moreAddresses: () => byCountry.get(x.country) ?? [], prev: held.get(x.key)?.data ?? null, fetchImpl: aiFetch, ...(aiBase ? { base: aiBase } : {}) });
        if (v.stopped) { out.stoppedBy = v.stopped === "cap" ? "CAP" : "AI"; out.why = v.stopped === "cap" ? `Today's collector AI cap ($${caps.aiUsd}) is reached: saved, and tomorrow continues.` : v.stopped; break; }
        await seo.putSearches([{ topic: t, key: x.key, kind: "answer", day: today, data: { ...answerRow({ ...v, key: x.key }, today), ...(v.again ? { again: true, triedA: true } : {}) } }], { at });
        if (v.ok) { out.answered++; out.left--; } else if (v.again) out.waiting++; else { out.noSource++; out.left--; }
      }
    }
    await spendQueue; await seo.setSetting(USAGE, usage, { at }).catch(() => null);
    await seo.setSetting("answers-last-run", { on: at, ...out }, { at }).catch(() => null);
    await recordRun(kv, ANSWERS.job, today, { progress: out.answered + out.noSource, code: out.stoppedBy, why: out.why, aiUsd: out.usd, facts: out.answered });
    return out;
  } catch (e) { return { ...out, ok: false, why: `The answers run stopped: ${String(e?.message ?? e).slice(0, 200)}. What was saved stays; the next run continues.` }; }
  finally { if (kv) await kv.run([["GET", LOCK]]).then(async ([v]) => { if (v === id) await kv.run([["DEL", LOCK]]); }).catch(() => null); }
}
export { FINDER };
