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
import { youtubeAdvice, topicsFromDeclaration } from "./youtube-advice.mjs";

export const RAW_DAYS = 30;
export const SEARCHES_PER_RUN = 3; // one search per topic, the first 3 topics
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
  const keyLine = () => { const k = keys.status(YOUTUBE_KEY); return k.saved ? `Your YouTube key: saved ✓ (ends …${k.ends}) — ${k.where}.` : "Your YouTube key is not saved yet — paste it in YouTube settings."; };

  const self = {
    settings(id) {
      const s = store.read(id), y = yt(s);
      return { handle: y.handle ?? "", suggestedHandle: handleFromSite(s.product?.site), confirmed: y.confirmed ?? null, key: keys.status(YOUTUBE_KEY), topics: y.topics ?? topicsFromDeclaration(s.setup?.product?.what, { names: [s.product?.name, y.confirmed?.title, y.handle] }), relatedPages: y.relatedPages ?? [], files: filesOf(id).length, quota: quotaLine(), skipped: y.skipped === true };
    },
    saveSettings(id, v) {
      const s = store.read(id), y = yt(s);
      const handle = String(v.handle ?? y.handle ?? "").trim();
      if (handle && !HANDLE.test(handle)) return { ok: false, why: "Type the channel's @handle, for example @mychannel." };
      const topics = Array.isArray(v.topics) ? v.topics.map((t) => String(t).trim()).filter(Boolean).slice(0, 6) : y.topics;
      const relatedPages = Array.isArray(v.relatedPages) ? v.relatedPages.map((p) => ({ words: String(p.words ?? "").split(",").map((w) => w.trim()).filter(Boolean), url: String(p.url ?? "").trim() })).filter((p) => p.words.length && /^https:\/\/\S+$/.test(p.url)).slice(0, 20) : y.relatedPages;
      /* a changed @handle needs a new confirmation — the old channel ID is never kept for another handle */
      const confirmed = y.confirmed && handle.toLowerCase() === String(y.handle ?? "").toLowerCase() ? y.confirmed : null;
      s.setup = { ...s.setup, youtube: { handle, confirmed, ...(topics ? { topics } : {}), ...(relatedPages ? { relatedPages } : {}) } };
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
      const topics = (y.topics ?? topicsFromDeclaration(s.setup?.product?.what, { names: [s.product?.name, y.confirmed?.title, y.handle] })).slice(0, SEARCHES_PER_RUN);
      if (!topics.length) return { ok: false, why: "No research topics — add your topic words in YouTube settings (what your product is about)." };
      if (quota().searches + topics.length > cap) return { ok: false, why: `Today's research limit is reached (${quota().searches} of ${cap} searches used). It starts again tomorrow.` };
      const own = latest(id, "videos-")?.videos ?? (await self.read(id)).videos ?? [];
      const out = { readOn: new Date(now()).toISOString(), topics: [], comments: [] };
      for (const q of topics) out.topics.push({ q, videos: await a.searchTopic(q, { max: 10 }) });
      for (const v of own.slice().sort((x, z) => (z.comments ?? 0) - (x.comments ?? 0)).slice(0, 10)) if ((v.comments ?? 1) > 0) for (const c of await a.comments(v.videoId)) out.comments.push({ ...c, own: true, videoTitle: v.title });
      for (const t of out.topics) for (const v of t.videos.slice(0, 2)) for (const c of await a.comments(v.videoId)) out.comments.push({ ...c, own: false, videoTitle: v.title, channelTitle: v.channelTitle });
      atomic(join(rawDir(id), `research-${today()}.json`), out);
      prune(id);
      return { ok: true, line: `Research done: ${out.topics.length} topic(s), ${out.topics.reduce((n, t) => n + t.videos.length, 0)} top videos, ${out.comments.length} comments read. ${quotaLine()}` };
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
      const research = latest(id, "research-");
      const opts = { productUrl: s.product?.site ?? null, productIsChannel: productIsChannel(s), relatedPages: y.relatedPages ?? [] };
      const adv = youtubeAdvice({ product: { ...s.setup?.product, languages: s.setup?.languages?.codes ?? [] }, channel: y.confirmed, videos: raw.videos, research, files: filesOf(id), ...opts, readOn: new Date(now()).toISOString() });
      const report = youtubeForReport({ ok: true, source: "YOUTUBE_DATA_API", importedOn: today(), videos: raw.videos }, channelCheck(raw.videos, opts)).lines;
      return { state: "READY", confirmed: y.confirmed, complete: raw.complete !== false, report, quota: quotaLine(), researchOn: research?.readOn ?? null, ...adv };
    },
    /** the YouTube lines for the product's tab list (and the monthly report) */
    async lines(id) { try { const a = await self.advice(id); return a.state === "READY" ? [`${a.confirmed.title}: ${a.confirmed.handle}`, ...a.report] : a.lines; } catch (e) { return [`YouTube could not be read now (${/answered HTTP \d+/.exec(String(e?.message))?.[0] ?? "no answer"}). Nothing was changed.`]; } },
  };
  return Object.freeze(self);
}
