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
function csvRows(text) {
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
export function youtubeApi({ env = process.env, fetchImpl = null } = {}) {
  const key = env[KEY_NAME];
  if (!key) return Object.freeze({ state: "DEFERRED", why: `DEFERRED — no YouTube Data API key in the environment (${KEY_NAME}); import a YouTube Studio export instead, or add the key` });
  if (typeof fetchImpl !== "function") return Object.freeze({ state: "DEFERRED", why: "DEFERRED — the key is set, but no connection was handed in by the client's resolved YouTube connector" });
  const get = async (path, params) => { const u = new URL(`https://www.googleapis.com/youtube/v3/${path}`); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v); u.searchParams.set("key", key); const r = await fetchImpl(u, { headers: { Accept: "application/json" } }); if (!r.ok) throw new Error(`the YouTube Data API answered HTTP ${r.status}`); return r.json(); };
  return Object.freeze({
    state: "READY",
    /** The channel's videos (its uploads playlist), with title, description, tags, publish time, duration and views — the API only. */
    async channelVideos(channelId, { max = 50 } = {}) {
      const ch = await get("channels", { part: "contentDetails,snippet", id: channelId });
      const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploads) return [];
      const pl = await get("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: String(Math.min(max, 50)) });
      const ids = (pl.items ?? []).map((i) => i.contentDetails.videoId).join(",");
      if (!ids) return [];
      const v = await get("videos", { part: "snippet,contentDetails,statistics", id: ids });
      return (v.items ?? []).map((x) => Object.freeze({ videoId: x.id, title: x.snippet.title, description: x.snippet.description, tags: x.snippet.tags ?? [], publishedAt: x.snippet.publishedAt, durationSec: isoSeconds(x.contentDetails.duration), views: Number(x.statistics?.viewCount ?? 0), thumbnailText: undefined, channelTitle: x.snippet.channelTitle }));
    },
  });
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

/** The channel check — a finding only where the data holds the field; NOT MEASURED where it does not. No score. */
export function channelCheck(videos, { productUrl = null } = {}) {
  return Object.freeze(videos.map((v) => {
    const f = [], nm = [];
    if (!present(v.title)) f.push("no title"); else if (v.title.length > TITLE_MAX) f.push(`the title is ${v.title.length} characters — over YouTube's ${TITLE_MAX}`);
    if (v.description === undefined) nm.push("description (not in the data)"); else if (!present(v.description)) f.push("no description");
    if (v.description === undefined) nm.push("chapters (no description in the data)"); else if (present(v.description) && !/(^|\n)0?0:00\s/.test(v.description)) f.push("no chapters (the description has no 0:00 timestamp list)");
    if (v.thumbnailText === undefined) nm.push("thumbnail text (not in the data)"); else if (!present(v.thumbnailText)) f.push("no text on the thumbnail");
    if (productUrl) { if (v.description === undefined) nm.push("link back to the product page (no description in the data)"); else if (!String(v.description).includes(productUrl)) f.push("no link back to the product page"); }
    return Object.freeze({ videoId: v.videoId, title: v.title, findings: Object.freeze(f), notMeasured: Object.freeze(nm) });
  }));
}

/** The monthly report's YouTube part: the videos, their views, the channel-check findings — or NOT CONNECTED (never zero). */
export function youtubeForReport(imported, check) {
  if (!imported?.ok) return Object.freeze({ connected: false, line: "YouTube: NOT CONNECTED — no YouTube API key and no Studio export imported (this is not zero)" });
  const views = imported.videos.map((v) => v.views).filter(Number.isFinite);
  const withFindings = check.filter((c) => c.findings.length);
  return Object.freeze({ connected: true, lines: Object.freeze([
    `YouTube (${imported.source === "YOUTUBE_STUDIO_EXPORT" ? "your Studio export" : "your API key"}, ${imported.importedOn}): ${imported.videos.length} video(s)${views.length ? `, ${views.reduce((a, b) => a + b, 0)} views in the export` : ""}.`,
    ...withFindings.slice(0, 5).map((c) => `Video "${c.title}": ${c.findings.join("; ")}`),
    ...(check.some((c) => c.notMeasured.length) ? [`Not measured from this data: ${[...new Set(check.flatMap((c) => c.notMeasured))].join(", ")}.`] : []),
  ]) });
}
