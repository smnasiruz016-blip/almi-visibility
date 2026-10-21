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
import { youtubeApi, channelCheck, youtubeForReport, csvRows, HANDLE, API_BASE, QUOTA_RULE, KEY_NAME as YOUTUBE_KEY } from "../src/video/youtube.mjs";
import { youtubeAdvice, autoTopics, tokens } from "./youtube-advice.mjs";

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

export function youtubeApp({ store, dataDir, keys, config = {}, fetchImpl = (u, i) => fetch(u, { ...i, signal: AbortSignal.timeout(15000) }), now = () => Date.now() }) {
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
  const topicsOf = (id, s = store.read(id)) => { const y = yt(s); const own = latest(id, "videos-")?.videos ?? []; const site = readJson(join(store.dirOf(id), "site-read.json"), null);
    const auto = autoTopics({ what: s.setup?.product?.what, names: [s.product?.name, y.confirmed?.title, y.handle], ownTitles: own.map((v) => v.title), siteHeadings: (site?.pages ?? []).flatMap((p) => [p.h1, p.title]).filter(Boolean) });
    return [...new Set([...auto, ...(y.extraTopics ?? [])])]; };
  const topicState = (id) => readJson(join(store.dirOf(id), "youtube-topics.json"), {});
  /* the day's cap, shared fairly: each product with a confirmed channel gets an equal part (never below 3) */
  const shareOf = () => { const n = store.list().filter((p) => p.setup?.youtube?.confirmed).length; return Math.max(MIN_SEARCHES_PER_PRODUCT, Math.floor(cap / Math.max(1, n))); };
  const topicLines = (id) => { const st = topicState(id), all = topicsOf(id); const done = all.filter((q) => st[q] === today()), wait = all.filter((q) => st[q] !== today());
    return { all, searchedToday: done, waiting: wait.map((q) => ({ q, last: st[q] ?? null })), line: `Topics searched today: ${done.length ? done.join(", ") : "none yet"}. ${wait.length ? `Waiting for a later search (oldest first): ${wait.join(", ")}.` : "Every topic is searched."}` }; };
  /* all research of the last 30 days, merged: each topic's latest result; every comment once */
  const researchAll = (id) => { const d = rawDir(id); const files = readdirSync(d).filter((x) => /^research-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort(); if (!files.length) return null;
    const topics = new Map(), comments = new Map(); let readOn = null;
    for (const fn of files) { const r = readJson(join(d, fn), null); if (!r) continue; readOn = r.readOn; for (const tp of r.topics ?? []) topics.set(tp.q, tp); for (const c of r.comments ?? []) comments.set(`${c.videoId}|${c.text}`, c); }
    return { readOn, topics: [...topics.values()], comments: [...comments.values()] }; };
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
      s.setup = { ...s.setup, youtube: { ...yt(s), handle: c.handle, confirmed: { channelId: c.channelId, title: c.title, handle: c.handle, on: today() } } };
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
    /** C1: the topics' top videos and the questions people write — inside the daily cap */
    async research(id) {
      const s = store.read(id), y = yt(s);
      if (!y.confirmed) return { ok: false, why: "Confirm your channel first." };
      const a = api(); if (a.state !== "READY") return { ok: false, why: keyLine() };
      const own = latest(id, "videos-")?.videos ?? (await self.read(id)).videos ?? [];
      /* RR-307: never-searched topics first, then the oldest; as many as this product's fair share and the day's cap allow */
      const st = topicState(id), all = topicsOf(id);
      if (!all.length) return { ok: false, why: "No research topics could be found yet — describe what your product does in its Settings." };
      const usedHere = all.filter((q) => st[q] === today()).length;
      const room = Math.min(shareOf() - usedHere, cap - quota().searches);
      const topics = all.filter((q) => st[q] !== today()).sort((x, z) => String(st[x] ?? "").localeCompare(String(st[z] ?? ""))).slice(0, Math.max(0, room));
      if (!topics.length) return { ok: false, why: room <= 0 ? `Today's research limit is reached (${quota().searches} of ${cap} searches used; this product's share today: ${shareOf()}). It starts again tomorrow. ${topicLines(id).line}` : `Every topic was searched today. ${topicLines(id).line}` };
      const out = { readOn: new Date(now()).toISOString(), topics: [], comments: [] };
      for (const q of topics) out.topics.push({ q, videos: await a.searchTopic(q, { max: 10 }) });
      for (const v of own.slice().sort((x, z) => (z.comments ?? 0) - (x.comments ?? 0)).slice(0, 10)) if ((v.comments ?? 1) > 0) for (const c of await a.comments(v.videoId)) out.comments.push({ ...c, own: true, videoTitle: v.title });
      for (const t of out.topics) for (const v of t.videos.slice(0, 2)) for (const c of await a.comments(v.videoId)) out.comments.push({ ...c, own: false, videoTitle: v.title, channelTitle: v.channelTitle });
      const prev = readJson(join(rawDir(id), `research-${today()}.json`), null);
      atomic(join(rawDir(id), `research-${today()}.json`), prev ? { readOn: out.readOn, topics: [...prev.topics.filter((p) => !topics.includes(p.q)), ...out.topics], comments: [...prev.comments, ...out.comments] } : out);
      atomic(join(store.dirOf(id), "youtube-topics.json"), { ...topicState(id), ...Object.fromEntries(topics.map((q) => [q, today()])) });
      prune(id);
      return { ok: true, line: `Research done: ${out.topics.length} topic(s), ${out.topics.reduce((n, t) => n + t.videos.length, 0)} top videos, ${out.comments.length} comments read. ${quotaLine()} ${topicLines(id).line}` };
    },
    addFile(id, { name, text }) {
      const r = phrasesFromFile(name, text, today());
      if (!r.ok) return r;
      atomic(join(store.dirOf(id), "search-data-files.json"), [...filesOf(id).filter((p) => p.file !== r.phrases[0].file), ...r.phrases]);
      return { ok: true, line: `Added ${r.phrases.length} search phrases from ${name}.` };
    },
    /** C: the advice — the channel read today (or now), the latest research (30 days), the files */
    async advice(id) {
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
      const adv = youtubeAdvice({ product: { ...s.setup?.product, languages: s.setup?.languages?.codes ?? [] }, channel: y.confirmed, videos, research, files: filesOf(id), ...opts, readOn: new Date(now()).toISOString() });
      const report = youtubeForReport({ ok: true, source: "YOUTUBE_DATA_API", importedOn: today(), videos: raw.videos }, channelCheck(raw.videos, opts)).lines;
      return { state: "READY", confirmed: y.confirmed, complete: raw.complete !== false, report, quota: quotaLine(), topics: topicLines(id), shared, researchOn: research?.readOn ?? null, ...adv };
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
