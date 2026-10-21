/**
 * 🔴 YOUTUBE — CHANNEL AND VIDEO VISIBILITY (RR-301 B2; the owner's decision of 12 Oct 2026: YouTube is INCLUDED; no derived score; raw
 * data kept 30 days and never in git). For ANY client type. F92 (src/page/media-visibility.mjs) stays what it is — the videos a PAGE
 * embeds; this module is the client's own CHANNEL and its videos.
 *   DATA comes ONLY from the client's own YouTube Data API key (its variable NAMED, never printed or logged) or a YouTube Studio export file
 *   the client imports. youtube.com pages are NEVER scraped.
 *   · video SEO: a title, description, tags and chapters drawn ONLY from the product's recorded search phrases and questions (and, for
 *     chapters, the video's own transcript times) — nothing invented; a suggestion names the record it came from;
 *   · Q&A from a transcript — the OWNER'S OWN channel only — feeding the page builder, each answer with its source (the video, at its time)
 *     and date;
 *   · VideoObject structured data when a page embeds a client video;
 *   · a short video SCRIPT from an article (like the social posts) — Visibility never makes the video itself;
 *   · a CHANNEL CHECK: missing titles, descriptions, chapters, thumbnail text, links back to the product page — what the data does not hold
 *     is NOT MEASURED, never a zero, never a finding;
 *   · the monthly report's YouTube part (or NOT CONNECTED).
 * Pure, apart from the API reader (which is DEFERRED with no key). No score is derived.
 */
export const KEY_NAME = "YOUTUBE_API_KEY";
export const RAW_DAYS = 30;
export const NOT_MEASURED = "NOT MEASURED";
export const TITLE_MAX = 100; // YouTube's own limit for a video title
export const DESCRIPTION_MAX = 5000; // YouTube's own limit for a video description
const present = (s) => typeof s === "string" && s.trim() !== "";
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const words = (s) => new Set(norm(s).split(" ").filter((w) => w.length > 2));

/* ── data in ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A CSV line → fields (quotes and doubled quotes handled). */
export function csvRows(text) {
  const rows = []; let row = [], cur = "", q = false;
  const t = String(text ?? "").replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; continue; }
    if (c === '"') q = true; else if (c === ",") { row.push(cur); cur = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

/**
 * Import a YouTube Studio export (the "Content" table, CSV): its own column names. Studio's standard export holds the video id ("Content"),
 * "Video title", "Video publish time", "Duration", "Views", "Impressions" …; it does NOT hold descriptions, tags or thumbnails — those stay
 * NOT MEASURED unless the file carries a "Description" / "Tags" / "Thumbnail text" column. The "Total" row is not a video.
 */
export function importStudioExport(csvText, { importedOn }) {
  const [head, ...rest] = csvRows(csvText);
  if (!head) return Object.freeze({ ok: false, why: "the file is empty" });
  const col = (name) => head.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const id = col("Content"), title = col("Video title");
  if (id < 0 || title < 0) return Object.freeze({ ok: false, why: "not a YouTube Studio content export (no \"Content\" and \"Video title\" columns)" });
  const opt = (r, name) => { const i = col(name); return i < 0 ? undefined : r[i] ?? ""; };
  const num = (v) => (v === undefined || v === "" ? null : Number(String(v).replace(/,/g, "")));
  const videos = rest.filter((r) => r[id] && r[id].trim().toLowerCase() !== "total").map((r) => Object.freeze({
    videoId: r[id].trim(), title: r[title] ?? "", publishedAt: opt(r, "Video publish time") ?? null, durationSec: num(opt(r, "Duration")),
    views: num(opt(r, "Views")), impressions: num(opt(r, "Impressions")), ctr: num(opt(r, "Impressions click-through rate (%)")),
    description: opt(r, "Description"), tags: opt(r, "Tags") === undefined ? undefined : opt(r, "Tags").split(/[;,|]/).map((x) => x.trim()).filter(Boolean),
    thumbnailText: opt(r, "Thumbnail text"),
  }));
  return Object.freeze({ ok: true, source: "YOUTUBE_STUDIO_EXPORT", importedOn, videos: Object.freeze(videos), columns: Object.freeze(head.map((h) => h.trim())) });
}

/**
 * The client's own API key, by NAME. With no key the reader is DEFERRED, named; the key is never printed, logged or hashed. The connection
 * is NEVER opened here: `fetchImpl` must be handed in by the client's resolved connector (F03 — the one place a connection is opened);
 * without it the reader is DEFERRED too.
 */
/* RR-306 B · THE RIGHT CHANNEL, ALWAYS: a channel is found ONLY by its exact @handle through the API's own handle lookup (channels.list
 * forHandle) — never by search; an answer whose handle is not the one asked is refused. After the client confirms it ("Is this your
 * channel?"), it is read by its CHANNEL ID only. The first wrong read on the owner's PC (21 Oct 2026) was an exact lookup of a DIFFERENT
 * real handle typed in setup (@almiworld instead of @Almiworld-world) read with no confirmation — the confirmation now stands in between. */
export const HANDLE = /^@[\w.-]{3,100}$/;
export const API_BASE = "https://www.googleapis.com/youtube/v3/";
/* only YouTube's own API — or, in tests, a stand-in on this computer */
const allowedBase = (b) => b === API_BASE || /^http:\/\/127\.0\.0\.1:\d+\/youtube\/v3\/$/.test(b);
const MAX_VIDEOS = 5000; // a bound on one read (100 pages of 50): the whole channel for every channel the pilots hold
const channelShape = (x) => x ? Object.freeze({ found: true, channelId: x.id, title: x.snippet?.title ?? "", handle: x.snippet?.customUrl ?? null, description: x.snippet?.description ?? "",
  pictureUrl: x.snippet?.thumbnails?.default?.url ?? null, subscribers: x.statistics?.hiddenSubscriberCount ? null : (x.statistics?.subscriberCount === undefined ? null : Number(x.statistics.subscriberCount)),
  videoCount: x.statistics?.videoCount === undefined ? null : Number(x.statistics.videoCount), uploads: x.contentDetails?.relatedPlaylists?.uploads ?? null }) : null;
/* RR-306 B5 · a SHORT, by YouTube's own rule (YouTube Help "Understand three-minute YouTube Shorts", read 21 Oct 2026): uploaded after
 * 15 Oct 2024, square or vertical, up to 3 minutes; before that date a Short was up to 60 seconds. The shape comes from the API's player
 * size (videos.list part=player). Without a shape the kind is UNKNOWN — never guessed. */
export const SHORTS_RULE = Object.freeze({ since: "2024-10-15", maxSec: 180, maxSecBefore: 60, source: "YouTube Help — \"Understand three-minute YouTube Shorts\" (support.google.com/youtube/answer/15424877), read 2026-10-21" });
export function videoKind(v) {
  if (!Number.isFinite(v.durationSec)) return "UNKNOWN";
  const tall = Number.isFinite(v.width) && Number.isFinite(v.height) ? v.width <= v.height : null;
  const limit = String(v.publishedAt ?? "") >= SHORTS_RULE.since ? SHORTS_RULE.maxSec : SHORTS_RULE.maxSecBefore;
  if (v.durationSec > SHORTS_RULE.maxSec) return "LONG";
  if (tall === false) return "LONG";
  if (tall === true) return v.durationSec <= limit ? "SHORT" : "LONG";
  return "UNKNOWN";
}
/* the free quota (YouTube Data API "Quota calculator", support page updated 2026-10-15, read 2026-10-21): search.list has its OWN bucket
 * of 100 calls a day; every other call here costs 1 unit of 10,000 a day. Visibility's own cap keeps research well inside it. */
export const QUOTA_RULE = Object.freeze({ searchCallsPerDay: 100, unitsPerDay: 10000, source: "YouTube Data API — Quota calculator (developers.google.com/youtube/v3/determine_quota_cost), updated 2026-10-15, read 2026-10-21" });

export function youtubeApi({ env = process.env, fetchImpl = null, keyName = KEY_NAME, key = null, apiBase = API_BASE, onCall = () => {} } = {}) {
  key = key ?? env[keyName];
  if (!key) return Object.freeze({ state: "DEFERRED", why: `DEFERRED — no YouTube Data API key in the environment (${keyName}); import a YouTube Studio export instead, or add the key` });
  if (typeof fetchImpl !== "function") return Object.freeze({ state: "DEFERRED", why: "DEFERRED — the key is set, but no connection was handed in by the client's resolved YouTube connector" });
  if (!allowedBase(apiBase)) return Object.freeze({ state: "REFUSED", why: "REFUSED — the YouTube key is sent to YouTube's own API only" });
  const get = async (path, params) => {
    const u = new URL(`${apiBase}${path}`); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v); u.searchParams.set("key", key);
    onCall(path);
    const r = await fetchImpl(u, { headers: { Accept: "application/json" } });
    if (!r.ok) throw Object.assign(new Error(`the YouTube Data API answered HTTP ${r.status}`), { status: r.status });
    return r.json();
  };
  const videosByIds = async (ids) => {
    const out = [];
    for (let i = 0; i < ids.length; i += 50) {
      const v = await get("videos", { part: "snippet,contentDetails,statistics,player", id: ids.slice(i, i + 50).join(","), maxHeight: "360" });
      for (const x of v.items ?? []) out.push(Object.freeze({ videoId: x.id, title: x.snippet.title, description: x.snippet.description, tags: x.snippet.tags ?? [], publishedAt: x.snippet.publishedAt, durationSec: isoSeconds(x.contentDetails.duration),
        views: Number(x.statistics?.viewCount ?? 0), comments: x.statistics?.commentCount === undefined ? null : Number(x.statistics.commentCount), width: x.player?.embedWidth === undefined ? null : Number(x.player.embedWidth), height: x.player?.embedHeight === undefined ? null : Number(x.player.embedHeight),
        language: x.snippet.defaultAudioLanguage ?? x.snippet.defaultLanguage ?? null, thumbnailText: undefined, channelTitle: x.snippet.channelTitle, channelId: x.snippet.channelId }));
    }
    return out;
  };
  const api = {
    state: "READY",
    /** B1: the channel of this EXACT @handle — or not found. Never a search. */
    async lookupHandle(handle) {
      if (!HANDLE.test(String(handle ?? ""))) return Object.freeze({ found: false, line: "Type the channel's @handle, for example @mychannel." });
      const ch = await get("channels", { part: "snippet,statistics,contentDetails", forHandle: handle });
      const c = channelShape(ch.items?.[0]);
      if (!c) return Object.freeze({ found: false, line: `Channel not found — check the @handle (${handle}).` });
      if (String(c.handle ?? "").toLowerCase() !== handle.toLowerCase()) return Object.freeze({ found: false, line: `YouTube answered with another channel (${c.handle ?? "no handle"}) — not used. Check the @handle (${handle}).` });
      return c;
    },
    /** a confirmed channel, by its ID */
    async channelById(id) { if (!/^UC[\w-]{10,40}$/.test(String(id ?? ""))) return Object.freeze({ found: false, line: "not a channel ID" }); const ch = await get("channels", { part: "snippet,statistics,contentDetails", id }); return channelShape(ch.items?.[0]) ?? Object.freeze({ found: false, line: "The confirmed channel was not found any more — confirm your channel again." }); },
    /** B4: ALL the channel's videos — every page of its uploads playlist (bounded at 5,000). */
    async allVideos(channelId, known = null) {
      const ch = known?.found && known.channelId === channelId ? known : await api.channelById(channelId);
      if (!ch.found || !ch.uploads) return Object.freeze({ channel: ch, videos: [], pages: 0, complete: Boolean(ch.found) });
      const ids = []; let token = null, pages = 0;
      do {
        const pl = await get("playlistItems", { part: "contentDetails", playlistId: ch.uploads, maxResults: "50", ...(token ? { pageToken: token } : {}) });
        pages++; for (const i of pl.items ?? []) ids.push(i.contentDetails.videoId);
        token = pl.nextPageToken ?? null;
      } while (token && ids.length < MAX_VIDEOS);
      return Object.freeze({ channel: ch, videos: Object.freeze(await videosByIds(ids)), pages, complete: !token });
    },
    /** C1: the videos that do well on a topic — the API's own search (its own daily bucket), then their numbers */
    /* RR-308 A1: the niche's TOP and RISING videos — the API's own order by views, inside a date window, in the channel's language when set */
    async searchTopic(q, { max = 10, order = "relevance", publishedAfter = null, relevanceLanguage = null, regionCode = null } = {}) {
      if (!["relevance", "viewCount", "date"].includes(order)) order = "relevance";
      /* RR-311 C1: the API's own language and region filters, when the channel's language is known */
      const s = await get("search", { part: "snippet", type: "video", q, order, maxResults: String(max), ...(publishedAfter ? { publishedAfter } : {}), ...(relevanceLanguage && /^[a-z]{2}$/.test(relevanceLanguage) ? { relevanceLanguage } : {}), ...(regionCode && /^[A-Z]{2}$/.test(regionCode) ? { regionCode } : {}) });
      const ids = (s.items ?? []).map((i) => i.id?.videoId).filter(Boolean);
      return ids.length ? (await videosByIds(ids)).sort((a, b) => b.views - a.views) : [];
    },
    /** RR-311 C2: a competitor's latest uploads — one page of its uploads playlist (3 units), never the whole channel */
    async latestUploads(channelId, { max = 50 } = {}) {
      const ch = await api.channelById(channelId); if (!ch.found || !ch.uploads) return Object.freeze({ channel: ch, videos: [] });
      const pl = await get("playlistItems", { part: "contentDetails", playlistId: ch.uploads, maxResults: String(Math.min(50, max)) });
      return Object.freeze({ channel: ch, videos: Object.freeze(await videosByIds((pl.items ?? []).map((i) => i.contentDetails.videoId))) });
    },
    /** C1: what people write under a video — their own questions (comments turned off → none, said plainly) */
    async comments(videoId, { max = 50 } = {}) {
      try { const c = await get("commentThreads", { part: "snippet", videoId, order: "relevance", maxResults: String(max), textFormat: "plainText" }); return (c.items ?? []).map((t) => Object.freeze({ text: t.snippet?.topLevelComment?.snippet?.textDisplay ?? "", likes: Number(t.snippet?.topLevelComment?.snippet?.likeCount ?? 0), publishedAt: t.snippet?.topLevelComment?.snippet?.publishedAt ?? null, videoId })); }
      catch (e) { if (e.status === 403) return []; throw e; }
    },
    /** the bin's read: a channel by its ID, or by its exact @handle — every page */
    async channelVideos(channel) {
      const c = String(channel).startsWith("@") ? await api.lookupHandle(channel) : { found: true, channelId: channel };
      return c.found ? (await api.allVideos(c.channelId, c.uploads ? c : null)).videos : [];
    },
  };
  return Object.freeze(api);
}
/**
 * RR-302 C1 · the reader through the client's OPENED YouTube connector (src/tenancy/connectors.mjs, kind YOUTUBE_DATA_API): its paced,
 * origin-limited fetch, and the key read from the ONE variable its declaration names — read here and handed straight in, never kept or
 * printed. A connector of another kind, or one that names no credential, is refused; a missing key is DEFERRED, named.
 */
export const YOUTUBE_CONNECTOR_KIND = "YOUTUBE_DATA_API";
export function youtubeReaderFrom(connector, { env = process.env } = {}) {
  if (connector?.kind !== YOUTUBE_CONNECTOR_KIND) return Object.freeze({ state: "REFUSED", why: `REFUSED — not a ${YOUTUBE_CONNECTOR_KIND} connector` });
  if (!connector.credentialName) return Object.freeze({ state: "REFUSED", why: "REFUSED — the YouTube connector declares no credential name" });
  return youtubeApi({ env, fetchImpl: connector.fetch, keyName: connector.credentialName });
}
const isoSeconds = (d) => { const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(d ?? "")); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : null; };

/** Raw data is kept 30 days: older raw rows are dropped (they are never written to git — the client's data folder only). */
export const retainRaw = (rows, now = Date.now()) => rows.filter((r) => now - Date.parse(r.recorded_at ?? r.importedOn ?? 0) <= RAW_DAYS * 86400000);

/* ── what Visibility makes from it ───────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The recorded phrases and questions that are about this video (they share its meaning words). Each keeps its record id. */
export function recordsFor(video, { phrases = [], questions = [] }) {
  const v = words(`${video.title} ${video.description ?? ""}`);
  const about = (t) => { const w = words(t); let n = 0; for (const x of w) if (v.has(x)) n++; return n >= Math.min(2, w.size); };
  return {
    phrases: phrases.filter((p) => present(p.text) && about(p.text)).map((p) => ({ text: p.text.trim(), ref: p.ref })),
    questions: questions.filter((q) => present(q.text) && about(q.text)).map((q) => ({ text: q.text.trim(), ref: q.ref })),
  };
}
/** The transcript segment that answers a question: the one sharing the MOST of its meaning words (at least two), earliest on a tie. */
const bestSegment = (q, transcript, { sentence = false } = {}) => {
  const qw = words(q);
  let best = null, bestN = 0;
  for (const s of transcript) { if (sentence && !/[.!?]$/.test(s.text.trim())) continue; const n = [...qw].filter((w) => words(s.text).has(w)).length; if (n > bestN) { best = s; bestN = n; } }
  return bestN >= Math.min(2, qw.size) ? best : null;
};
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Video SEO for one video — only from recorded phrases and questions (and the transcript's own times for chapters). A field with no
 * recorded source is left as it is and says so. `productUrl` is the product page the description links back to.
 */
export function videoSeo(video, { phrases = [], questions = [], transcript = null, productUrl = null }) {
  const r = recordsFor(video, { phrases, questions });
  const lead = r.phrases[0] ?? r.questions[0] ?? null;
  const titleHas = lead && norm(video.title).includes(norm(lead.text));
  const title = !lead ? { keep: video.title, why: "no recorded search phrase or question is about this video — the title is left as it is" }
    : titleHas ? { keep: video.title, why: `the title already holds the recorded phrase "${lead.text}"` }
    : { suggest: `${video.title} — ${lead.text.charAt(0).toUpperCase()}${lead.text.slice(1)}`.slice(0, TITLE_MAX), from: lead.ref };
  /* chapters: a recorded question the transcript answers, at the transcript's own time; YouTube needs the first at 0:00 and 3+ chapters */
  const marks = transcript ? r.questions.map((q) => { const seg = bestSegment(q.text, transcript); return seg ? { at: seg.start, label: q.text, from: q.ref } : null; }).filter(Boolean).sort((a, b) => a.at - b.at) : [];
  const chapters = marks.length >= 2 ? [{ at: 0, label: "Introduction", from: "the video's start" }, ...marks.filter((m) => m.at >= 10)] : [];
  const chapterLines = chapters.length >= 3 ? chapters.map((c) => `${fmt(c.at)} ${c.label}`) : [];
  const description = [r.questions.length ? `In this video:\n${r.questions.map((q) => `• ${q.text}`).join("\n")}` : null, chapterLines.length ? chapterLines.join("\n") : null, productUrl ? `More, with every source: ${productUrl}` : null].filter(Boolean).join("\n\n");
  return Object.freeze({
    videoId: video.videoId, title, tags: Object.freeze(r.phrases.map((p) => p.text).slice(0, 15)),
    description: description ? { suggest: description.slice(0, DESCRIPTION_MAX), from: [...r.questions.map((q) => q.ref), ...(productUrl ? ["the product page"] : [])] } : { keep: video.description ?? null, why: "no recorded question is about this video" },
    chapters: chapterLines.length ? { suggest: chapterLines, from: chapters.map((c) => c.from) } : { why: transcript ? "fewer than 3 chapters found in the transcript for recorded questions" : `${NOT_MEASURED} — no transcript` },
    invented: 0,
  });
}

/**
 * Q&A from a video's transcript, for the page builder — the OWNER'S OWN channel only. Each answer is the transcript's own sentence, with its
 * source (the video, at its time) and the date the transcript was read. `transcript` is [{ start (s), text }].
 */
export function transcriptQA({ video, transcript, questions, ownChannel, channelTitle, readOn }) {
  if (ownChannel !== true) return Object.freeze({ ok: false, why: "Q&A is taken from a transcript of the client's OWN channel only" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(readOn ?? "")) return Object.freeze({ ok: false, why: "the transcript's read date is missing" });
  const items = [];
  for (const q of questions) {
    const seg = bestSegment(q.text, transcript, { sentence: true });
    if (!seg) continue;
    items.push(Object.freeze({ needId: `video:${video.videoId}:${q.ref}`, needKey: `video:${video.videoId}:${q.ref}`, heading: { wording: q.text }, questions: [{ questionId: q.ref, wording: q.text }],
      claims: [Object.freeze({ claimId: `yt-${video.videoId}-${Math.floor(seg.start)}`, text: seg.text.trim(), quotation: seg.text.trim(), link: `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}&t=${Math.floor(seg.start)}s`, source: `${channelTitle} on YouTube — "${video.title}" at ${fmt(seg.start)}`, readOn })], statements: [] }));
  }
  return Object.freeze({ ok: true, items: Object.freeze(items) });
}

/** VideoObject structured data for a page that embeds a client video — only from the video's own recorded fields. */
export function videoObject(video, { embedUrl, thumbnailUrl = null }) {
  if (!present(video.title) || !present(video.description) || !present(video.publishedAt)) return Object.freeze({ ok: false, why: "a VideoObject needs the video's name, description and upload date — one is not recorded" });
  return Object.freeze({ ok: true, jsonLd: Object.freeze({ "@context": "https://schema.org", "@type": "VideoObject", name: video.title, description: video.description, uploadDate: video.publishedAt, embedUrl,
    ...(thumbnailUrl ? { thumbnailUrl } : {}), ...(Number.isFinite(video.durationSec) ? { duration: `PT${Math.floor(video.durationSec / 60)}M${video.durationSec % 60}S` } : {}) }) });
}

/** A short video script from an article: its question, its sourced facts (each with its source and date), and the link. Never a promise. */
export function scriptFromArticle(article) {
  const facts = article.items.flatMap((it) => it.claims).filter((c) => present(c.text) && present(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "")).slice(0, 3);
  if (!facts.length) return Object.freeze({ ok: false, why: "the article has no sourced fact — no script is written" });
  const lines = [`[Open] ${article.question}`, ...facts.map((c, i) => `[Point ${i + 1}] ${c.text.trim()}  (on screen: Source — ${c.source ?? new URL(c.link).hostname}, checked ${c.readOn})`), ...(article.generalView ? [`[Opinion — say "General view — not an official fact"] ${article.generalView.text}`] : []), `[Close] The full answer, with every source: ${article.url}`];
  return Object.freeze({ ok: true, lines: Object.freeze(lines), note: "A script only — Visibility does not make the video. It promises no views, ranking or results." });
}

/**
 * RR-306 B6 · the page a video should link to: the product's own page — unless the product IS this channel (its address is the channel),
 * then a related product page the client listed whose words the video is about (e.g. a CV video → the CV product's page), or none.
 */
export function linkTargetFor(video, { productUrl = null, productIsChannel = false, relatedPages = [] } = {}) {
  const v = words(`${video.title} ${video.description ?? ""}`);
  const rel = relatedPages.find((p) => (p.words ?? []).some((w) => [...words(w)].every((x) => v.has(x))));
  if (rel) return { url: rel.url, why: `your related page for "${rel.words.join(", ")}"` };
  if (productUrl && !productIsChannel) return { url: productUrl, why: "your product's page" };
  return null;
}
const sameUrl = (text, url) => { const t = String(text ?? "").toLowerCase(); const u = String(url).toLowerCase().replace(/\/$/, ""); return t.includes(u) || t.includes(u.replace(/^https?:\/\//, "")); };

/** The channel check — a finding only where the data holds the field; NOT MEASURED where it does not. No score. RR-306: Shorts and long
 *  videos are judged apart (chapters only for long ones); the link back follows linkTargetFor. */
export function channelCheck(videos, { productUrl = null, productIsChannel = false, relatedPages = [] } = {}) {
  return Object.freeze(videos.map((v) => {
    const f = [], nm = [];
    const kind = videoKind(v);
    if (!present(v.title)) f.push("no title"); else if (v.title.length > TITLE_MAX) f.push(`the title is ${v.title.length} characters — over YouTube's ${TITLE_MAX}`);
    if (v.description === undefined) nm.push("description (not in the data)"); else if (!present(v.description)) f.push("no description");
    if (kind !== "SHORT") {
      if (v.description === undefined) nm.push("chapters (no description in the data)");
      else if (kind === "UNKNOWN") nm.push("chapters (not known whether this is a Short or a long video)");
      else if (present(v.description) && !/(^|\n)0?0:00\s/.test(v.description)) f.push("no chapters (the description has no 0:00 timestamp list)");
    }
    if (v.thumbnailText === undefined) nm.push("thumbnail text (not in the data)"); else if (!present(v.thumbnailText)) f.push("no text on the thumbnail");
    const target = linkTargetFor(v, { productUrl, productIsChannel, relatedPages });
    if (target) { if (v.description === undefined) nm.push("link back (no description in the data)"); else if (!sameUrl(v.description, target.url)) f.push(`no link to ${target.why} (${target.url})`); }
    return Object.freeze({ videoId: v.videoId, title: v.title, kind, findings: Object.freeze(f), notMeasured: Object.freeze(nm) });
  }));
}

/** The monthly report's YouTube part: the videos, their views, the channel-check findings — or NOT CONNECTED (never zero). */
export function youtubeForReport(imported, check) {
  if (!imported?.ok) return Object.freeze({ connected: false, line: "YouTube: NOT CONNECTED — no YouTube API key and no Studio export imported (this is not zero)" });
  const views = imported.videos.map((v) => v.views).filter(Number.isFinite);
  const withFindings = check.filter((c) => c.findings.length);
  return Object.freeze({ connected: true, lines: Object.freeze([
    /* RR-306 B7: "read with your YouTube key" — an export only when the data came from a Studio export */
    `YouTube (${imported.source === "YOUTUBE_STUDIO_EXPORT" ? "your Studio export" : "read with your YouTube key"}, ${imported.importedOn}): ${imported.videos.length} video(s)${views.length ? `, ${views.reduce((a, b) => a + b, 0)} views ${imported.source === "YOUTUBE_STUDIO_EXPORT" ? "in the export" : "in total"}` : ""}.`,
    ...withFindings.slice(0, 5).map((c) => `Video "${c.title}": ${c.findings.join("; ")}`),
    ...(check.some((c) => c.notMeasured.length) ? [`Not measured from this data: ${[...new Set(check.flatMap((c) => c.notMeasured))].join(", ")}.`] : []),
  ]) });
}
