/**
 * 🔴 RR-306 B + C · THE APP'S YOUTUBE: the right channel, always, and advice per product. Everything a product's YouTube needs, kept in
 * that product's OWN folder (desktop/products.mjs) and read through the official YouTube Data API only (src/video/youtube.mjs) with the
 * client's own key (desktop/secrets.mjs: Windows' secure store, else this computer's settings by NAME) — never a youtube.com or Google page.
 *   · settings: the @handle (suggested from the product's own address when it is a YouTube channel), the research topics (from the product's
 *     own declaration, editable), related product pages, the client's search-data files;
 *   · the channel is found by its EXACT @handle and shown (name, picture, subscribers) — "Is this your channel?" — and read only after Yes,
 *     by its channel ID from then on;
 *   · research spends the YouTube search quota only inside Visibility's daily cap (shown); raw data stays 30 days in the product's folder,
 *     never in git; no score is derived.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { youtubeApi, channelCheck, youtubeForReport, csvRows, HANDLE, API_BASE, QUOTA_RULE, KEY_NAME as YOUTUBE_KEY, videoKind, linkTargetFor } from "../src/video/youtube.mjs";
import { AI_PROVIDERS } from "./secrets.mjs";
import { autoTopics, tokens, channelAdvice, researchTerms, researchQuestions } from "./youtube-advice.mjs";
import { nicheOf, nicheSummary, onTopic, JUNK_WORDS } from "./youtube-niche.mjs";
import { youtubeScore, priorityOrder, optionsFor, doFirst, ideasFor, boilerplateOf, styleOf, TOP_N } from "./youtube-plan.mjs";
import { writeWithAI } from "./ai-write.mjs";

export const RAW_DAYS = 30;
export const MIN_SEARCHES_PER_PRODUCT = 3; // RR-307: a product's fair share of the day's cap is never below 3 searches
export const DEFAULT_SEARCH_CAP = 20; // Visibility's own daily cap — inside YouTube's 100 searches a day (QUOTA_RULE)
const PICTURE_HOSTS = /^https:\/\/(yt3\.ggpht\.com|yt3\.googleusercontent\.com|i\.ytimg\.com)\//;
const atomic = (f, o) => { writeFileSync(`${f}.tmp`, JSON.stringify(o)); renameSync(`${f}.tmp`, f); };
const readJson = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
export const handleFromSite = (site) => /youtube\.com\/(@[\w.-]{3,100})/i.exec(String(site ?? ""))?.[1] ?? null;

/** A search-data file the client adds: its query column (Search Console "Top queries", Bing / Keyword Planner "Keyword", …), impressions when given. */
export function phrasesFromFile(name, text, on) {
  const [head, ...rows] = csvRows(text);
  if (!head) return { ok: false, why: "The file is empty." };
  const h = head.map((x) => x.trim().toLowerCase());
  const q = h.findIndex((x) => ["query", "queries", "top queries", "keyword", "keywords", "search term", "search query", "search terms"].includes(x));
  if (q < 0) return { ok: false, why: "No query column found — the file needs a column named Query, Top queries or Keyword." };
  const imp = h.findIndex((x) => ["impressions", "avg. monthly searches", "search volume", "clicks"].includes(x));
  const phrases = rows.map((r) => ({ phrase: String(r[q] ?? "").trim(), impressions: imp < 0 ? null : Number(String(r[imp] ?? "").replace(/[^\d.]/g, "")) || null, file: String(name).slice(0, 80), on })).filter((p) => p.phrase && p.phrase.length <= 120);
  return phrases.length ? { ok: true, phrases } : { ok: false, why: "No queries were found in the file." };
}

export function youtubeApp({ store, dataDir, keys, config = {}, fetchImpl = (u, i) => fetch(u, { ...i, signal: AbortSignal.timeout(15000) }), aiFetchImpl = fetch, now = () => Date.now() }) {
  const apiBase = config.youtubeApiBase ?? API_BASE;
  const cap = Number.isInteger(config.youtubeSearchesPerDay) ? config.youtubeSearchesPerDay : DEFAULT_SEARCH_CAP;
  const today = () => new Date(now()).toISOString().slice(0, 10);
  const quotaFile = join(dataDir, "youtube-quota.json");
  const quota = () => { const q = readJson(quotaFile, {}); return q.day === today() ? q : { day: today(), searches: 0, units: 0 }; };
  const count = (path) => { const q = quota(); if (path === "search") q.searches++; else q.units++; atomic(quotaFile, q); };
  const api = () => youtubeApi({ key: keys.get(YOUTUBE_KEY), fetchImpl, apiBase, onCall: count });
  const yt = (s) => s.setup?.youtube ?? {};
  const rawDir = (id) => { const d = join(store.dirOf(id), "youtube-raw"); mkdirSync(d, { recursive: true }); return d; };
  const prune = (id) => { const d = rawDir(id); for (const f of readdirSync(d)) { const m = /(\d{4}-\d{2}-\d{2})\.json$/.exec(f); if (m && now() - Date.parse(m[1]) > RAW_DAYS * 86400000) rmSync(join(d, f)); } };
  const latest = (id, prefix) => { const d = rawDir(id); const f = readdirSync(d).filter((x) => x.startsWith(prefix) && /\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort().at(-1); return f ? readJson(join(d, f), null) : null; };
  const filesOf = (id) => readJson(join(store.dirOf(id), "search-data-files.json"), []);
  const quotaLine = () => { const q = quota(); return `YouTube research today: ${q.searches} of ${cap} searches used (Visibility's own cap; your key's limit is ${QUOTA_RULE.searchCallsPerDay} searches a day) · ${q.units} other calls of ${QUOTA_RULE.unitsPerDay}.`; };
  const productIsChannel = (s) => { const c = yt(s).confirmed; const site = String(s.product?.site ?? "").toLowerCase(); return /youtube\.com/.test(site) && (c ? site.includes(String(c.handle ?? "").toLowerCase()) || site.includes(String(c.channelId).toLowerCase()) : true); };
  const mismatch = (s, handle) => { const h = handleFromSite(s.product?.site); return h && handle && h.toLowerCase() !== handle.toLowerCase() ? `Careful: your product's address is ${s.product.site}, but you typed ${handle}. They are different channels.` : null; };
  const picture = async (url) => { if (!PICTURE_HOSTS.test(String(url ?? ""))) return null; try { const r = await fetchImpl(url); if (!r.ok) return null; return `data:${r.headers.get("content-type") ?? "image/jpeg"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`; } catch { return null; } };
  /* RR-307 (RR-306 defect 2): every topic, found automatically; the client may add more, never has to */
  /* RR-308 A3: the research topics are the channel's NICHE — short phrases from its own videos' tags and its own description (desktop/
   * youtube-niche.mjs); before the channel's videos are read, the product's own words (autoTopics). The client may add more, never has to. */
  const nicheFor = (id, s = store.read(id)) => { const y = yt(s); const own = latest(id, "videos-")?.videos ?? []; return own.length && y.confirmed ? nicheOf({ channel: { ...y.confirmed }, videos: own, product: { name: s.product?.name, what: s.setup?.product?.what } }) : null; };
  const topicsOf = (id, s = store.read(id)) => { const y = yt(s); const n = nicheFor(id, s);
    if (n?.queries.length) return [...new Set([...n.queries.map((q) => q.q), ...(y.extraTopics ?? [])])];
    const own = latest(id, "videos-")?.videos ?? []; const site = readJson(join(store.dirOf(id), "site-read.json"), null);
    const auto = autoTopics({ what: s.setup?.product?.what, names: [s.product?.name, y.confirmed?.title, y.handle], ownTitles: own.map((v) => v.title), siteHeadings: (site?.pages ?? []).flatMap((p) => [p.h1, p.title]).filter(Boolean) });
    /* short phrases only (a long one keeps its first 3 meaning words); junk ("full episode") never */
    return [...new Set([...auto.map((t) => (/^[A-Z]{2,6}(\s|$)/.test(t) ? t : tokens(t).slice(0, 3).join(" "))).filter((t) => t && !String(t).split(/\s+/).some((w) => JUNK_WORDS.has(w.toLowerCase()))), ...(y.extraTopics ?? [])])]; };
  /* the confirmed channel's own description (its "about" text) — asked once from YouTube (1 unit), kept with the confirmation */
  const describe = async (id, a) => { const s = store.read(id), c = yt(s).confirmed; if (typeof c.description === "string") return c; const ch = await a.channelById(c.channelId); const d = { ...c, description: String(ch.description ?? "").slice(0, 2000) }; s.setup.youtube = { ...yt(s), confirmed: d }; store.write(id, s); return d; };
  const topicState = (id) => readJson(join(store.dirOf(id), "youtube-topics.json"), {});
  /* the day's cap, shared fairly: each product with a confirmed channel gets an equal part (never below 3) */
  const shareOf = () => { const n = store.list().filter((p) => p.setup?.youtube?.confirmed).length; return Math.max(MIN_SEARCHES_PER_PRODUCT, Math.floor(cap / Math.max(1, n))); };
  const topicLines = (id) => { const st = topicState(id), all = topicsOf(id); const done = all.filter((q) => st[q] === today()), wait = all.filter((q) => st[q] !== today());
    return { all, searchedToday: done, waiting: wait.map((q) => ({ q, last: st[q] ?? null })), line: `Topics searched today: ${done.length ? done.join(", ") : "none yet"}. ${wait.length ? `Waiting for a later search (oldest first): ${wait.join(", ")}.` : "Every topic is searched."}` }; };
  /* all research of the last 30 days, merged: each topic's latest result; every comment once */
  const researchAll = (id) => { const d = rawDir(id); const files = readdirSync(d).filter((x) => /^research-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort(); if (!files.length) return null;
    const topics = new Map(), niche = new Map(), comments = new Map(); let readOn = null;
    for (const fn of files) { const r = readJson(join(d, fn), null); if (!r) continue; readOn = r.readOn; for (const tp of r.topics ?? []) topics.set(tp.q, tp); for (const n of r.niche ?? []) niche.set(`${n.q}|${n.kind}`, n); for (const c of r.comments ?? []) comments.set(`${c.videoId}|${c.text}`, c); }
    return { readOn, topics: [...topics.values()], niche: [...niche.values()], comments: [...comments.values()] }; };
  /* RR-308: everything the options are written from — the niche (the channel's own tags and description), who and where it is, the niche
   * research's summary, the channel's own boilerplate lines (never used as a video's summary) */
  const contextFor = (s, confirmed, videos, research, opts) => {
    const niche = nicheOf({ channel: confirmed, videos, product: { name: s.product?.name, what: s.setup?.product?.what } });
    const summary = research?.niche?.length ? nicheSummary({ niche, research, own: videos, ownChannelId: confirmed.channelId }) : null;
    return { channel: { ...confirmed, boilerplate: boilerplateOf(videos) }, persona: niche.persona, niche, summary, ...opts, readOn: research?.readOn ?? null };
  };
  /* the client's AI connection (Settings → Your AI connection): its provider, the key's NAME, whether a key is saved */
  const aiOf = (s) => { const c = s.setup?.aiConnection; const p = AI_PROVIDERS.find((x) => x.id === c?.provider || x.keyName === c?.keyName); return p && keys.status(p.keyName).saved ? { ready: true, provider: p.id, keyName: p.keyName, name: p.name } : { ready: false }; };
  const keyLine = () => { const k = keys.status(YOUTUBE_KEY); return k.saved ? `Your YouTube key: saved ✓ (ends …${k.ends}) — ${k.where}.` : "Your YouTube key is not saved yet — paste it in YouTube settings."; };

  const self = {
    settings(id) {
      const s = store.read(id), y = yt(s);
      return { handle: y.handle ?? "", suggestedHandle: handleFromSite(s.product?.site), confirmed: y.confirmed ?? null, key: keys.status(YOUTUBE_KEY), topics: topicLines(id), extraTopics: y.extraTopics ?? [], relatedPages: y.relatedPages ?? [], files: filesOf(id).length, quota: quotaLine(), skipped: y.skipped === true };
    },
    saveSettings(id, v) {
      const s = store.read(id), y = yt(s);
      const handle = String(v.handle ?? y.handle ?? "").trim();
      if (handle && !HANDLE.test(handle)) return { ok: false, why: "Type the channel's @handle, for example @mychannel." };
      const extraTopics = Array.isArray(v.extraTopics) ? v.extraTopics.map((x) => String(x).trim()).filter(Boolean).slice(0, 10) : y.extraTopics;
      const relatedPages = Array.isArray(v.relatedPages) ? v.relatedPages.map((p) => ({ words: String(p.words ?? "").split(",").map((w) => w.trim()).filter(Boolean), url: String(p.url ?? "").trim() })).filter((p) => p.words.length && /^https:\/\/\S+$/.test(p.url)).slice(0, 20) : y.relatedPages;
      /* a changed @handle needs a new confirmation — the old channel ID is never kept for another handle */
      const confirmed = y.confirmed && handle.toLowerCase() === String(y.handle ?? "").toLowerCase() ? y.confirmed : null;
      s.setup = { ...s.setup, youtube: { handle, confirmed, ...(extraTopics ? { extraTopics } : {}), ...(relatedPages ? { relatedPages } : {}) } };
      store.write(id, s);
      return { ok: true, mismatch: mismatch(s, handle) };
    },
    /** B1 + B2: the channel of this exact @handle, to show before anything is read */
    async lookup(id, handle) {
      const a = api(); if (a.state !== "READY") return { found: false, line: keyLine() };
      const c = await a.lookupHandle(String(handle ?? "").trim());
      if (!c.found) return c;
      return { ...c, picture: await picture(c.pictureUrl), mismatch: mismatch(store.read(id), c.handle) };
    },
    /** B2: "Yes, this is my channel" — the channel is looked up AGAIN by the exact @handle, and its ID must be the one shown */
    async confirm(id, { handle, channelId }) {
      const a = api(); if (a.state !== "READY") return { ok: false, why: keyLine() };
      const c = await a.lookupHandle(String(handle ?? "").trim());
      if (!c.found || c.channelId !== channelId) return { ok: false, why: c.found ? "That channel changed since it was shown — look it up again." : c.line };
      const s = store.read(id);
      s.setup = { ...s.setup, youtube: { ...yt(s), handle: c.handle, confirmed: { channelId: c.channelId, title: c.title, handle: c.handle, description: String(c.description ?? "").slice(0, 2000), on: today() } } };
      store.write(id, s);
      return { ok: true, line: `Saved: ${c.title} (${c.handle}). From now on it is read by its channel ID.` };
    },
    /** B4: all the confirmed channel's videos, by its ID — kept as raw data for 30 days */
    async read(id) {
      const c = yt(store.read(id)).confirmed;
      if (!c) return { ok: false, why: "Confirm your channel first." };
      const r = await api().allVideos(c.channelId);
      atomic(join(rawDir(id), `videos-${today()}.json`), { recorded_at: new Date(now()).toISOString(), channelId: c.channelId, pages: r.pages, complete: r.complete, videos: r.videos });
      prune(id);
      return { ok: true, channel: r.channel, videos: r.videos, pages: r.pages, complete: r.complete };
    },
    /** RR-308 A · the NICHE research: the channel's own niche (its tags, its description, the product's words), then — through the official
     *  API, inside the day's cap — each niche phrase's TOP videos (most viewed in the last year) and, for the first two, its RISING ones (most
     *  viewed in the last 30 days), in the channel's own language when it is not English; then what viewers write under them */
    async research(id) {
      const s = store.read(id), y = yt(s);
      if (!y.confirmed) return { ok: false, why: "Confirm your channel first." };
      const a = api(); if (a.state !== "READY") return { ok: false, why: keyLine() };
      const own = latest(id, "videos-")?.videos ?? (await self.read(id)).videos ?? [];
      const confirmed = await describe(id, a);
      const niche = nicheOf({ channel: confirmed, videos: own, product: { name: s.product?.name, what: s.setup?.product?.what } });
      const st = topicState(id), all = topicsOf(id);
      if (!all.length) return { ok: false, why: "No research topics could be found yet — describe what your product does in its Settings." };
      const usedHere = all.filter((q) => st[q] === today()).length;
      const room = Math.min(shareOf() - usedHere, cap - quota().searches);
      const chosen = all.filter((q) => st[q] !== today()).sort((x, z) => String(st[x] ?? "").localeCompare(String(st[z] ?? ""))).slice(0, Math.max(0, Math.ceil(room * 2 / 3)));
      if (!chosen.length) return { ok: false, why: room <= 0 ? `Today's research limit is reached (${quota().searches} of ${cap} searches used; this product's share today: ${shareOf()}). It starts again tomorrow. ${topicLines(id).line}` : `Every topic was searched today. ${topicLines(id).line}` };
      const lang = (s.setup?.languages?.codes ?? []).find((c) => c !== "en") ?? null;
      const runs = [...chosen.map((q) => ({ q, kind: "top", days: 365 })), ...chosen.slice(0, 2).map((q) => ({ q, kind: "rising", days: 30 }))].slice(0, Math.max(1, room));
      const out = { readOn: new Date(now()).toISOString(), nicheLabel: niche.label, niche: [], topics: [], comments: [] };
      /* YouTube's own relevance inside the window (top: a year; rising: 30 days), then only the videos that are ABOUT the phrase, most viewed
       * first (ordering by views alone returned giant off-topic clips) */
      for (const r of runs) { const found = await a.searchTopic(r.q, { max: 25, order: "relevance", publishedAfter: new Date(now() - r.days * 86400000).toISOString(), relevanceLanguage: lang }); const videos = found.filter((v) => onTopic(v, r.q)).slice(0, 15); out.niche.push({ q: r.q, kind: r.kind, videos, found: found.length }); if (r.kind === "top") out.topics.push({ q: r.q, videos }); }
      /* what viewers write: under the channel's own 10 most-commented videos and the niche's top 2 per search — read 5 at a time; one video
       * that does not answer is skipped, never the whole research (a stalled read once held the research for minutes) */
      const reads = [...own.slice().sort((x, z) => (z.comments ?? 0) - (x.comments ?? 0)).slice(0, 10).filter((v) => (v.comments ?? 1) > 0).map((v) => ({ v, own: true })),
        ...out.niche.filter((r) => r.kind === "top").flatMap((t) => t.videos.filter((x) => x.channelId !== confirmed.channelId).slice(0, 2).map((v) => ({ v, own: false })))];
      for (let i = 0; i < reads.length; i += 5) for (const got of await Promise.all(reads.slice(i, i + 5).map(({ v, own: mine }) => a.comments(v.videoId).then((cs) => cs.map((c) => ({ ...c, own: mine, videoTitle: v.title, ...(mine ? {} : { channelTitle: v.channelTitle }) }))).catch(() => [])))) out.comments.push(...got);
      const prev = readJson(join(rawDir(id), `research-${today()}.json`), null);
      atomic(join(rawDir(id), `research-${today()}.json`), prev ? { ...out, niche: [...(prev.niche ?? []).filter((p) => !runs.some((r) => r.q === p.q && r.kind === p.kind)), ...out.niche], topics: [...(prev.topics ?? []).filter((p) => !chosen.includes(p.q)), ...out.topics], comments: [...(prev.comments ?? []), ...out.comments] } : out);
      atomic(join(store.dirOf(id), "youtube-topics.json"), { ...topicState(id), ...Object.fromEntries(chosen.map((q) => [q, today()])) });
      prune(id);
      return { ok: true, line: `Research done: ${runs.length} searches of your niche (${chosen.join(", ")}), ${out.niche.reduce((n, t) => n + t.videos.length, 0)} videos, ${out.comments.length} comments read. ${quotaLine()} ${topicLines(id).line}` };
    },
    addFile(id, { name, text }) {
      const r = phrasesFromFile(name, text, today());
      if (!r.ok) return r;
      atomic(join(store.dirOf(id), "search-data-files.json"), [...filesOf(id).filter((p) => p.file !== r.phrases[0].file), ...r.phrases]);
      return { ok: true, line: `Added ${r.phrases.length} search phrases from ${name}.` };
    },
    /** C: the advice — the channel read today (or now), the latest research (30 days), the files */
    async advice(id, { offset = 0 } = {}) {
      const s = store.read(id), y = yt(s);
      if (!y.handle) return { state: "NOT_SET", lines: ["YouTube is not set up — it is optional. Open YouTube settings to add your channel."] };
      if (!keys.status(YOUTUBE_KEY).saved) return { state: "NO_KEY", lines: [keyLine()] };
      if (!y.confirmed) return { state: "CONFIRM", handle: y.handle, lines: [`Confirm your channel first: open YouTube settings and check that ${y.handle} is yours.`] };
      let raw = latest(id, "videos-");
      if (!raw || raw.recorded_at?.slice(0, 10) !== today() || raw.channelId !== y.confirmed.channelId) { const r = await self.read(id); raw = { videos: r.videos, pages: r.pages, complete: r.complete }; }
      const research = researchAll(id);
      /* RR-307 E4 · one channel, several products: each video goes to the product whose own words it uses most (a CV video → the CV
       * product); words every sharing product has (the brand) decide nothing; a video using none is "not linked to a product" */
      const sharing = store.list().filter((p) => p.id !== id && p.setup?.youtube?.confirmed?.channelId === y.confirmed.channelId);
      let videos = raw.videos, shared = null;
      if (sharing.length) {
        const wordsOf = (p) => new Set(autoTopics({ what: p.setup?.product?.what, names: [] }).concat(p.product?.name ?? "").flatMap((t) => tokens(t)));
        const all = [s, ...sharing].map((p) => ({ id: p.id, name: p.product?.name, words: wordsOf(p) }));
        const common = new Set([...all[0].words].filter((w) => all.every((p) => p.words.has(w))));
        const owner = (v) => { const vt = new Set(tokens(`${v.title} ${String(v.description ?? "").split("\n").slice(0, 2).join(" ")} ${(v.tags ?? []).join(" ")}`)); const sc = all.map((p) => [p, [...p.words].filter((w) => !common.has(w) && vt.has(w)).length]).sort((a, b) => b[1] - a[1]); return sc[0][1] > 0 && sc[0][1] > (sc[1]?.[1] ?? 0) ? sc[0][0].id : null; };
        const assigned = raw.videos.map((v) => [v, owner(v)]);
        videos = assigned.filter(([, o]) => o === id).map(([v]) => v);
        shared = { products: all.map((p) => p.name), mine: videos.length, unlinked: assigned.filter(([, o]) => o === null).length, others: assigned.filter(([, o]) => o && o !== id).length,
          line: `This channel serves ${all.length} products (${all.map((p) => p.name).join(", ")}). ${videos.length} of its ${raw.videos.length} videos ${videos.length === 1 ? "is" : "are"} about ${s.product?.name}; ${assigned.filter(([, o]) => o === null).length} ${assigned.filter(([, o]) => o === null).length === 1 ? "is" : "are"} not linked to any product.` };
      }
      const opts = { productUrl: s.product?.site ?? null, productIsChannel: productIsChannel(s), relatedPages: y.relatedPages ?? [] };
      /* RR-308 B: the niche, the plan, the YouTube score, the most-viewed and newest videos first with 3 ready options each — who the
       * channel is comes from its own description, asked once (a channel confirmed before RR-308 has none kept yet) */
      const confirmed = typeof y.confirmed.description === "string" ? y.confirmed : await describe(id, api()).catch(() => y.confirmed);
      const ctx = contextFor(s, confirmed, videos, research, opts);
      const { order, why } = priorityOrder(videos);
      const page = order.slice(offset, offset + TOP_N).map((v) => ({ ...optionsFor(v, ctx), why: why.get(v.videoId)?.join(" and ") ?? null }));
      const more = Math.max(0, order.length - offset - page.length);
      if (offset) return { state: "READY", top: page, more };
      const files = filesOf(id), lang = s.setup?.languages?.codes ?? [];
      const terms = researchTerms({ research, files }), questions = researchQuestions({ research, files, product: { ...s.setup?.product, languages: lang }, terms });
      const score = youtubeScore(videos, opts);
      const ideas = ideasFor({ summary: ctx.summary, videos, persona: ctx.persona, questions });
      const report = youtubeForReport({ ok: true, source: "YOUTUBE_DATA_API", importedOn: today(), videos: raw.videos }, channelCheck(raw.videos, opts)).lines;
      const ai = aiOf(s);
      return { state: "READY", confirmed: y.confirmed, complete: raw.complete !== false, report, quota: quotaLine(), topics: topicLines(id), shared, researchOn: research?.readOn ?? null,
        channel: { title: y.confirmed.title, videos: videos.length, shorts: videos.filter((v) => videoKind(v) === "SHORT").length, long: videos.filter((v) => videoKind(v) === "LONG").length },
        score, niche: { label: ctx.niche.label, queries: ctx.niche.queries, persona: ctx.persona }, summary: ctx.summary, doFirst: doFirst({ videos, top: page, score, summary: ctx.summary, ideas, persona: ctx.persona }), ideas, top: page, more,
        channelAdvice: channelAdvice({ channel: y.confirmed, product: { ...s.setup?.product, site: s.product?.site, languages: lang }, videos, terms, readOn: research?.readOn ?? today() }),
        terms: terms.slice(0, 15).map((t) => ({ phrase: t.display ?? t.phrase, from: t.sources[0] })), questions: questions.slice(0, 15),
        aiLine: ai.ready ? `AI writing: your ${ai.name} key is connected — press "Write better options with AI" under a video (it uses your own AI account).` : "AI writing: not connected — the options below are written by Visibility's templates from your own videos and the research. An AI writes better options: connect your AI key in Settings → Your AI connection.",
        notEnough: [] };
    },
    /** RR-308 B6: three options for ONE video, written by the client's own AI on the client's click — checked for invented facts */
    async write(id, { videoId }) {
      const s = store.read(id), y = yt(s);
      if (!y.confirmed) return { ok: false, why: "Confirm your channel first." };
      const ai = aiOf(s); if (!ai.ready) return { ok: false, why: "Connect your AI key first (Settings → Your AI connection)." };
      const raw = latest(id, "videos-"); const v = raw?.videos?.find((x) => x.videoId === videoId); if (!v) return { ok: false, why: "That video was not found in today's read — open the YouTube tab again." };
      const opts = { productUrl: s.product?.site ?? null, productIsChannel: productIsChannel(s), relatedPages: y.relatedPages ?? [] };
      const ctx = contextFor(s, y.confirmed, raw.videos, researchAll(id), opts);
      const target = linkTargetFor(v, opts);
      return writeWithAI({ provider: ai.provider, key: keys.get(ai.keyName), video: v, ctx: { ...ctx, kind: videoKind(v), style: styleOf(v), links: [...(target ? [target.url] : []), `https://www.youtube.com/${y.confirmed.handle}`] }, fetchImpl: aiFetchImpl, ...(config.aiApiBase ? { base: config.aiApiBase } : {}) });
    },
    /** what the research found (its phrases and questions) — for the Overview and the page plan, WITHOUT reading the channel again */
    foundFor(id) {
      const s = store.read(id), y = yt(s); if (!y.confirmed) return null;
      const research = researchAll(id), files = filesOf(id); if (!research && !files.length) return null;
      const terms = researchTerms({ research, files }), questions = researchQuestions({ research, files, product: { ...s.setup?.product, languages: s.setup?.languages?.codes ?? [] }, terms });
      return { state: "READY", confirmed: y.confirmed, terms: terms.slice(0, 15).map((t) => ({ phrase: t.display ?? t.phrase, from: t.sources[0] })), questions: questions.slice(0, 15) };
    },
    /** RR-307 (22 Oct): the product's tab list says where YouTube stands WITHOUT reading the channel (a channel of 1,437 videos took
     *  half a minute on every tab switch) — the advice is read on the YouTube tab only */
    quickLines(id) {
      const y = yt(store.read(id));
      if (!y.handle) return ["YouTube is not set up — it is optional. Open YouTube settings to add your channel."];
      if (!keys.status(YOUTUBE_KEY).saved) return [keyLine()];
      if (!y.confirmed) return [`Confirm your channel first: open YouTube settings and check that ${y.handle} is yours.`];
      return [`${y.confirmed.title}: ${y.confirmed.handle}`, "Open the YouTube tab for the advice."];
    },
    /** the YouTube lines for the monthly report (reads the channel) */
    async lines(id) { try { const a = await self.advice(id); return a.state === "READY" ? [`${a.confirmed.title}: ${a.confirmed.handle}`, ...a.report] : a.lines; } catch (e) { return [`YouTube could not be read now (${/answered HTTP \d+/.exec(String(e?.message))?.[0] ?? "no answer"}). Nothing was changed.`]; } },
  };
  return Object.freeze(self);
}
