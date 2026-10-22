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
import { youtubeApi, plainYouTubeWhy, channelCheck, youtubeForReport, csvRows, HANDLE, API_BASE, QUOTA_RULE, KEY_NAME as YOUTUBE_KEY, videoKind, linkTargetFor } from "../src/video/youtube.mjs";
import { AI_PROVIDERS } from "./secrets.mjs";
import { autoTopics, tokens, channelAdvice, researchTerms, researchQuestions } from "./youtube-advice.mjs";
import { nicheOf, nicheSummary, onTopic, channelScripts, inOwnScripts, JUNK_WORDS, JUNK_PHRASE } from "./youtube-niche.mjs";
import { channelLanguage, sameLanguage, langOf, questionTitle, ownDataFindings, keywordIdeas, scorecard, newUploads, suggestCompetitors, beforeAfter, chaptersFrom, parseVtt } from "./youtube-insights.mjs";
import { youtubeScore, priorityOrder, optionsFor, doFirst, ideasFor, boilerplateOf, styleOf, gapFixes, TOP_N } from "./youtube-plan.mjs";
import { writeWithAI } from "./ai-write.mjs";
import { youtubeItems } from "./action-plan.mjs";

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

export function youtubeApp({ store, dataDir, keys, config = {}, fetchImpl = (u, i) => fetch(u, { ...i, signal: AbortSignal.timeout(15000) }), aiFetchImpl = fetch, now = () => Date.now(), ledger = null, signin = null }) {
  const apiBase = config.youtubeApiBase ?? API_BASE;
  const cap = Number.isInteger(config.youtubeSearchesPerDay) ? config.youtubeSearchesPerDay : DEFAULT_SEARCH_CAP;
  const today = () => new Date(now()).toISOString().slice(0, 10);
  const quotaFile = join(dataDir, "youtube-quota.json");
  const quota = () => { const q = readJson(quotaFile, {}); return q.day === today() ? q : { day: today(), searches: 0, units: 0 }; };
  const count = (path) => { const q = quota(); if (path === "search") q.searches++; else q.units++; atomic(quotaFile, q); };
  /* RR-313 A (owner's PC, 22 Oct: the key saved in Visibility was refused as "not valid"; the one in his computer's settings works): every
   * place a key is kept is tried, the one that answered last first; a key Google refuses is named, never silently dropped */
  const keyState = { good: null, refused: new Map() };
  const keyOrder = () => { const xs = keys.sources ? keys.sources(YOUTUBE_KEY) : [keys.get(YOUTUBE_KEY)].filter(Boolean).map((value) => ({ where: "your YouTube key", value, ends: value.slice(-4) })); return [...xs.filter((x) => x.where === keyState.good), ...xs.filter((x) => x.where !== keyState.good)]; };
  const api = () => { const xs = keyOrder(); return youtubeApi({ key: xs.map((x) => x.value), fetchImpl, apiBase, onCall: count, onKey: (i, refused) => { const x = xs[i]; if (!x) return; if (refused) keyState.refused.set(x.where, x.ends); else { keyState.good = x.where; keyState.refused.delete(x.where); } } }); };
  /** RR-313 A4: which key is in use, said plainly — "Using the key saved in Visibility (ends …1234)" */
  const keySource = () => {
    const xs = keyOrder(); if (!xs.length) return null;
    const used = xs.find((x) => x.where === keyState.good) ?? xs.find((x) => !keyState.refused.has(x.where)) ?? xs[0];
    const refused = xs.filter((x) => x !== used && keyState.refused.has(x.where));
    return `Using ${used.where}, ending …${used.ends}.${refused.map((x) => ` ${x.where[0].toUpperCase()}${x.where.slice(1)}, ending …${x.ends}, was not accepted by Google (keyInvalid) — paste the working key in YouTube settings to replace it.`).join("")}`;
  };
  const yt = (s) => s.setup?.youtube ?? {};
  /* RR-311: the channel's own analytics only while its owner is signed in — never an old read after a sign-out */
  const signedOf = (id) => (signin?.status(id).signedIn ? readJson(join(store.dirOf(id), "youtube-signed.json"), null) : null);
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
    const scripts = channelScripts({ videos, languages: s.setup?.languages?.codes ?? [] }); // RR-309 B1: the channel's own scripts
    const summary = research?.niche?.length ? nicheSummary({ niche, research, own: videos, ownChannelId: confirmed.channelId, scripts }) : null;
    return { channel: { ...confirmed, boilerplate: boilerplateOf(videos) }, persona: niche.persona, niche, summary, scripts, ...opts, readOn: research?.readOn ?? null };
  };
  /* the client's AI connection (Settings → Your AI connection): its provider, the key's NAME, whether a key is saved */
  const aiOf = (s) => { const c = s.setup?.aiConnection; const p = AI_PROVIDERS.find((x) => x.id === c?.provider || x.keyName === c?.keyName); return p && keys.status(p.keyName).saved ? { ready: true, provider: p.id, keyName: p.keyName, name: p.name } : { ready: false }; };
  const keyLine = () => { const k = keys.status(YOUTUBE_KEY); return k.saved ? `Your YouTube key: saved ✓ (ends …${k.ends}) — ${k.where}.` : "Your YouTube key is not saved yet — paste it in YouTube settings."; };

  const self = {
    settings(id) {
      const s = store.read(id), y = yt(s);
      return { handle: y.handle ?? "", suggestedHandle: handleFromSite(s.product?.site), confirmed: y.confirmed ?? null, key: keys.status(YOUTUBE_KEY), keySource: keySource(), topics: topicLines(id), extraTopics: y.extraTopics ?? [], relatedPages: y.relatedPages ?? [], files: filesOf(id).length, quota: quotaLine(), skipped: y.skipped === true };
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
      let c; try { c = await a.lookupHandle(String(handle ?? "").trim()); } catch (e) { return { found: false, line: plainYouTubeWhy(e), keySource: keySource() }; }
      if (!c.found) return { ...c, keySource: keySource() };
      return { ...c, picture: await picture(c.pictureUrl), mismatch: mismatch(store.read(id), c.handle), keySource: keySource() };
    },
    /** B2: "Yes, this is my channel" — the channel is looked up AGAIN by the exact @handle, and its ID must be the one shown */
    async confirm(id, { handle, channelId }) {
      const a = api(); if (a.state !== "READY") return { ok: false, why: keyLine() };
      let c; try { c = await a.lookupHandle(String(handle ?? "").trim()); } catch (e) { return { ok: false, why: plainYouTubeWhy(e) }; }
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
      /* RR-311 C1 (owner: "the niche learns from the wrong channels — American lifestyle creators"): the channel's OWN language, read from its
       * own titles, decides the API's language filter (and the region, when the channel's analytics say where its viewers are); then each
       * result's own language is checked, and clips ("full episode", Bigg Boss) are left out */
      const chLang = channelLanguage(own);
      const lang = chLang.code === "en" ? (s.setup?.languages?.codes ?? []).find((c) => c !== "en") ?? "en" : chLang.relevance;
      const region = signedOf(id)?.analytics?.countries?.[0]?.country ?? null;
      const runs = [...chosen.map((q) => ({ q, kind: "top", days: 365 })), ...chosen.slice(0, 2).map((q) => ({ q, kind: "rising", days: 30 }))].slice(0, Math.max(1, room));
      const out = { readOn: new Date(now()).toISOString(), nicheLabel: niche.label, language: chLang.label, languageCode: chLang.code, region, niche: [], topics: [], comments: [], otherLanguage: 0 };
      /* YouTube's own relevance inside the window (top: a year; rising: 30 days), then only the videos that are ABOUT the phrase, most viewed
       * first (ordering by views alone returned giant off-topic clips) */
      for (const r of runs) { const found = await a.searchTopic(r.q, { max: 25, order: "relevance", publishedAfter: new Date(now() - r.days * 86400000).toISOString(), relevanceLanguage: lang, regionCode: region }); const onIt = found.filter((v) => onTopic(v, r.q) && !JUNK_PHRASE.test(v.title)); const videos = onIt.filter((v) => sameLanguage(v, chLang)).slice(0, 15); out.otherLanguage += onIt.length - videos.length; out.niche.push({ q: r.q, kind: r.kind, videos, found: found.length }); if (r.kind === "top") out.topics.push({ q: r.q, videos }); }
      /* what viewers write: under the channel's own 10 most-commented videos and the niche's top 2 per search — read 5 at a time; one video
       * that does not answer is skipped, never the whole research (a stalled read once held the research for minutes) */
      const reads = [...own.slice().sort((x, z) => (z.comments ?? 0) - (x.comments ?? 0)).slice(0, 10).filter((v) => (v.comments ?? 1) > 0).map((v) => ({ v, own: true })),
        ...out.niche.filter((r) => r.kind === "top").flatMap((t) => t.videos.filter((x) => x.channelId !== confirmed.channelId).slice(0, 2).map((v) => ({ v, own: false })))];
      for (let i = 0; i < reads.length; i += 5) for (const got of await Promise.all(reads.slice(i, i + 5).map(({ v, own: mine }) => a.comments(v.videoId).then((cs) => cs.map((c) => ({ ...c, own: mine, videoTitle: v.title, ...(mine ? {} : { channelTitle: v.channelTitle }) }))).catch(() => [])))) out.comments.push(...got);
      const prev = readJson(join(rawDir(id), `research-${today()}.json`), null);
      atomic(join(rawDir(id), `research-${today()}.json`), prev ? { ...out, niche: [...(prev.niche ?? []).filter((p) => !runs.some((r) => r.q === p.q && r.kind === p.kind)), ...out.niche], topics: [...(prev.topics ?? []).filter((p) => !chosen.includes(p.q)), ...out.topics], comments: [...(prev.comments ?? []), ...out.comments] } : out);
      atomic(join(store.dirOf(id), "youtube-topics.json"), { ...topicState(id), ...Object.fromEntries(chosen.map((q) => [q, today()])) });
      prune(id);
      return { ok: true, line: `Research done in your channel's language (${chLang.label}): ${runs.length} searches of your niche (${chosen.join(", ")}), ${out.niche.reduce((n, t) => n + t.videos.length, 0)} videos kept${out.otherLanguage ? ` (${out.otherLanguage} in other languages left out)` : ""}, ${out.comments.length} comments read. ${quotaLine()} ${topicLines(id).line}` };
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
      /* the questions people ask (research comments and files), in the channel's own scripts — Option 2 of each video uses them (RR-309 B4) */
      const files = filesOf(id), lang = s.setup?.languages?.codes ?? [];
      /* RR-311 C4: and in the channel's own LANGUAGE (a Banglish question is Latin script too — it is left out of an Urdu/Hindi channel) */
      const chLang = channelLanguage(videos);
      const inLang = (t) => { const l = langOf(t); return l === chLang.code || (chLang.code === "en" && l === null) || (chLang.code === "ur-hi" && l === "en"); };
      const terms = researchTerms({ research, files }), questions = researchQuestions({ research, files, product: { ...s.setup?.product, languages: lang }, terms }).filter((q) => inOwnScripts(q.text, ctx.scripts) && inLang(q.text));
      ctx.questions = [...questions, ...(ctx.summary?.asks ?? []).filter((a) => inLang(a.text)).map((a) => ({ text: a.text, source: `a comment under "${a.under}", ${a.on}`, likes: a.likes }))];
      ctx.chapters = readJson(join(store.dirOf(id), "youtube-chapters.json"), {}); // RR-311 A1: real chapters, made from captions on the client's click
      const signed = signedOf(id);
      const { order, why } = priorityOrder(videos);
      const page = order.slice(offset, offset + TOP_N).map((v) => ({ ...optionsFor(v, ctx), why: why.get(v.videoId)?.join(" and ") ?? null }));
      const more = Math.max(0, order.length - offset - page.length);
      if (offset) return { state: "READY", top: page, more };
      const score = youtubeScore(videos, opts);
      /* RR-311 C4: a viewer's question becomes a proper ready title (its own words, cleaned, in the channel's language); the question is the source */
      const ideas = ideasFor({ summary: ctx.summary, videos, persona: ctx.persona, questions, topic: ctx.niche.queries?.[0]?.q ?? null }).flatMap((i) => {
        if (i.kind !== "QUESTION") return [i];
        const src = questions.find((q) => q.text === i.question)?.source ?? "the research";
        const t = questionTitle({ text: i.question, source: src }, chLang); return t ? [{ ...i, title: t.title, why: `${t.from} — none of your videos answers it yet` }] : [];
      });
      /* RR-311 B1 + C2 + C3: from YOUR channel's data; the competitors; keyword ideas with a demand estimate */
      const own = ownDataFindings(videos, { now: now(), analytics: signed?.analytics ?? null, reach: signed?.reach ?? null, retention: signed?.retention ?? {} });
      const comp = self.competitors(id, { research, chLang, channelId: y.confirmed.channelId });
      const report = youtubeForReport({ ok: true, source: "YOUTUBE_DATA_API", importedOn: today(), videos: raw.videos }, channelCheck(raw.videos, opts)).lines;
      const ai = aiOf(s);
      const out = { state: "READY", confirmed: y.confirmed, complete: raw.complete !== false, report, quota: quotaLine(), topics: topicLines(id), shared, researchOn: research?.readOn ?? null,
        channel: { title: y.confirmed.title, videos: videos.length, shorts: videos.filter((v) => videoKind(v) === "SHORT").length, long: videos.filter((v) => videoKind(v) === "LONG").length },
        score, niche: { label: ctx.niche.label, queries: ctx.niche.queries, persona: ctx.persona, basis: ctx.niche.basis ?? null }, aiReady: ai.ready, summary: ctx.summary, doFirst: doFirst({ videos, top: page, score, summary: ctx.summary, ideas, persona: ctx.persona }), ideas, top: page, more,
        gaps: gapFixes(videos, ctx, opts), // RR-310 A: each failing check with its most-viewed videos and their ready text
        channelAdvice: channelAdvice({ channel: y.confirmed, product: { ...s.setup?.product, site: s.product?.site, languages: lang }, videos, terms, readOn: research?.readOn ?? today() }),
        terms: terms.slice(0, 15).map((t) => ({ phrase: t.display ?? t.phrase, from: t.sources[0] })), questions: questions.slice(0, 15),
        language: chLang, ownData: own, competitors: comp, keywords: keywordIdeas(research, terms.slice(0, 40), now(), chLang).slice(0, 12),
        signin: signin ? { ...signin.status(id), on: signed?.on ?? null, reachLine: signed?.reach?.line ?? null } : null, aiCost: ledger ? ledger.line() : null,
        applied: beforeAfter(readJson(join(store.dirOf(id), "youtube-applied.json"), []).filter((c) => !c.undoneOn), { daily: signed?.daily ?? {}, reach: signed?.reach ?? null, now: now() }),
        thumbnailGuide: "Test your thumbnails with YouTube's own \"Test & Compare\" (YouTube Studio → the video → Thumbnail → Test & Compare): upload up to 3 thumbnails and YouTube shows them to viewers and picks the one watched most. Visibility gives 3 thumbnail texts under each video; it never runs an unofficial test.",
        aiLine: ai.ready ? `AI writing: your ${ai.name} key is connected — press "Write better options with AI" under a video (it uses your own AI account).` : "Better with AI — connect your AI (Settings → Your AI connection). Until then, the options below are written by Visibility's templates, only from your own videos and the research.",
        notEnough: [] };
      /* RR-310 A: "Do these first this week" = the same items as the action plan's YouTube part (problem, solution, ready text) */
      return { ...out, planItems: youtubeItems(out).sort((p, q) => q.effect - p.effect).slice(0, 5) };
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
      /* RR-311 B6: the month's AI cap first; every request counted */
      if (ledger) { const ok = ledger.allowed(); if (!ok.ok) return { ok: false, why: ok.why }; }
      /* RR-311 B3: the video's captions (when signed in with Apply on), its real chapters, its channel's own data, its language */
      const capFile = join(store.dirOf(id), "youtube-captions", `${videoId}.vtt`);
      const captions = existsSync(capFile) ? readFileSync(capFile, "utf8").replace(/^WEBVTT.*$/m, "").replace(/\n{2,}/g, "\n").slice(0, 4000) : null;
      const signed = signedOf(id);
      const own = ownDataFindings(raw.videos, { now: now(), analytics: signed?.analytics ?? null, reach: signed?.reach ?? null, retention: signed?.retention ?? {} }).findings.slice(0, 4).map((f) => f.line);
      const chapters = readJson(join(store.dirOf(id), "youtube-chapters.json"), {})[videoId] ?? null;
      const r = await writeWithAI({ provider: ai.provider, key: keys.get(ai.keyName), video: v, ctx: { ...ctx, kind: videoKind(v), style: styleOf(v), language: channelLanguage(raw.videos).label, captions, chapters, ownData: own, links: [...(target ? [target.url] : []), `https://www.youtube.com/${y.confirmed.handle}`] }, fetchImpl: aiFetchImpl, ...(config.aiApiBase ? { base: config.aiApiBase } : {}) });
      if (ledger) for (const u of r.usages ?? (r.usage ? [r.usage] : [])) ledger.add(u); // RR-312: the retry is a request too
      return { ...r, aiCost: ledger ? ledger.line() : null };
    },
    /* ── RR-311 C2 · competitors: the client picks 3–5; Visibility suggests same-language channels from the research ── */
    competitors(id, { research = researchAll(id), chLang = null, channelId = null } = {}) {
      const s = store.read(id), y = yt(s), list = y.competitors ?? [];
      const cache = readJson(join(store.dirOf(id), "youtube-competitors.json"), {});
      const ch = chLang ?? channelLanguage(latest(id, "videos-")?.videos ?? []);
      return { list: list.map((c) => ({ ...c, ...(cache[c.channelId] ?? {}) })), suggestions: suggestCompetitors(research, channelId ?? y.confirmed?.channelId, ch).filter((x) => !list.some((c) => c.channelId === x.channelId)), on: cache._on ?? null };
    },
    async addCompetitor(id, { handle, channelId }) {
      const s = store.read(id), y = yt(s), list = y.competitors ?? [];
      if (list.length >= 5) return { ok: false, why: "Five competitors at most — remove one first." };
      const a = api(); if (a.state !== "READY") return { ok: false, why: keyLine() };
      const c = handle ? await a.lookupHandle(String(handle).trim()) : await a.channelById(channelId);
      if (!c.found) return { ok: false, why: c.line ?? "Channel not found." };
      if (c.channelId === y.confirmed?.channelId) return { ok: false, why: "That is your own channel." };
      if (list.some((x) => x.channelId === c.channelId)) return { ok: false, why: "Already on your list." };
      s.setup.youtube = { ...y, competitors: [...list, { channelId: c.channelId, title: c.title, handle: c.handle ?? null }] }; store.write(id, s);
      await self.refreshCompetitors(id).catch(() => null);
      return { ok: true, line: `Added ${c.title}. Visibility now watches its new uploads.` };
    },
    removeCompetitor(id, channelId) { const s = store.read(id), y = yt(s); s.setup.youtube = { ...y, competitors: (y.competitors ?? []).filter((c) => c.channelId !== channelId) }; store.write(id, s); return { ok: true }; },
    /** each competitor's latest uploads (one page, 3 units): the scorecard and the NEW uploads since last time — the alerts */
    async refreshCompetitors(id) {
      const y = yt(store.read(id)), list = y.competitors ?? []; if (!list.length) return { ok: true, alerts: [] };
      const a = api(); if (a.state !== "READY") return { ok: false, why: keyLine() };
      const file = join(store.dirOf(id), "youtube-competitors.json"), cache = readJson(file, {}), alerts = [];
      for (const c of list) {
        const r = await a.latestUploads(c.channelId).catch(() => null); if (!r) continue;
        const prev = cache[c.channelId], fresh = prev ? newUploads(prev.seen ?? [], r.videos) : [];
        cache[c.channelId] = { scorecard: scorecard({ ...c }, r.videos, now()), seen: [...new Set([...(prev?.seen ?? []), ...r.videos.map((v) => v.videoId)])].slice(-200), newOnes: [...fresh.map((v) => ({ videoId: v.videoId, title: v.title, publishedAt: v.publishedAt, views: v.views })), ...(prev?.newOnes ?? [])].slice(0, 20) };
        for (const v of fresh) alerts.push({ channel: c.title, title: v.title, publishedAt: v.publishedAt, videoId: v.videoId });
      }
      cache._on = new Date(now()).toISOString(); atomic(file, cache);
      return { ok: true, alerts };
    },
    /* ── RR-311 A · the channel's own analytics, after its owner signed in (kept a day; the reach report comes within 48 hours) ── */
    async refreshSigned(id, { force = false } = {}) {
      if (!signin?.status(id).signedIn) return { ok: false, why: "Sign in to YouTube first." };
      const file = join(store.dirOf(id), "youtube-signed.json"), old = readJson(file, null);
      if (!force && old?.on === today()) return { ok: true, cached: true, data: old };
      const analytics = await signin.analytics(id);
      const reach = await signin.reach(id).catch((e) => ({ state: "FAILED", line: `Google did not give the impressions report (${e.status ?? "no answer"}).` }));
      const retention = {};
      for (const v of (analytics.byVideo ?? []).slice(0, 5)) retention[v.videoId] = await signin.retention(id, v.videoId).catch(() => []);
      /* the views per day of every video changed through "Apply to YouTube" — its before → after */
      const daily = {}; for (const c of readJson(join(store.dirOf(id), "youtube-applied.json"), []).filter((x) => !x.undoneOn)) daily[c.videoId] = await signin.daily(id, c.videoId, new Date(Date.parse(c.on) - 15 * 864e5).toISOString().slice(0, 10), today()).catch(() => []);
      const data = { on: today(), analytics, reach, retention, daily };
      atomic(file, data);
      return { ok: true, data };
    },
    /** A1 · real chapters from the video's own captions (needs the Apply permission — Google has no read-only one for captions) */
    async chapters(id, videoId) {
      if (!signin?.status(id).signedIn) return { ok: false, why: "Sign in to YouTube first." };
      if (!signin.status(id).write) return { ok: false, why: "Google gives a video's captions only with the \"Apply to YouTube\" permission — turn it on (it signs you in again), then press this again." };
      const raw = latest(id, "videos-"); const v = raw?.videos?.find((x) => x.videoId === videoId); if (!v) return { ok: false, why: "That video was not found in today's read." };
      const vtt = await signin.captions(id, videoId).catch(() => null);
      if (!vtt) return { ok: false, why: "This video has no captions on YouTube yet — YouTube makes automatic ones for most videos within a day; add your own in YouTube Studio → Subtitles." };
      const dir = join(store.dirOf(id), "youtube-captions"); mkdirSync(dir, { recursive: true }); atomic(join(dir, `${videoId}.vtt`), vtt);
      const ch = chaptersFrom(parseVtt(vtt), v.durationSec);
      if (!ch) return { ok: false, why: "The captions are too short to make at least 3 chapters." };
      const file = join(store.dirOf(id), "youtube-chapters.json"); atomic(file, { ...readJson(file, {}), [videoId]: ch.text });
      return { ok: true, chapters: ch.text, from: ch.from };
    },
    /** D5 · the facts the AI coach may answer from — every one THIS channel's own, with its source */
    async coachFacts(id) {
      const a = await self.advice(id); if (a.state !== "READY") return [];
      const f = [];
      f.push({ text: `The channel ${a.confirmed.title} has ${a.channel.videos} videos (${a.channel.shorts} Shorts, ${a.channel.long} long).`, source: "YouTube, read today" });
      for (const c of a.score.checks) f.push({ text: c.text, source: "Visibility's YouTube check" });
      for (const x of a.ownData.findings) f.push({ text: x.line, source: x.from });
      for (const x of a.summary?.lines ?? []) f.push({ text: `${x.what}: ${x.line}`, source: x.from });
      for (const k of a.keywords.slice(0, 8)) f.push({ text: `Keyword "${k.phrase}" — ${k.estimate}`, source: k.source });
      for (const c of a.competitors.list) if (c.scorecard) f.push({ text: `Competitor ${c.title}: ${c.scorecard.uploadsPerWeek} uploads a week, median ${c.scorecard.medianViews} views on its last 20, top topics ${c.scorecard.topTopics.join(", ") || "none"}.`, source: "its latest uploads, read through YouTube" });
      for (const i of a.ideas.slice(0, 5)) f.push({ text: `Video idea: "${i.title}"`, source: i.why });
      return f.slice(0, 60);
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
