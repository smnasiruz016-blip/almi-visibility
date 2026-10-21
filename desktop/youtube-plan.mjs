/**
 * 🔴 RR-308 B · A CLEAR YOUTUBE PLAN WITH OPTIONS (owner, 21 Oct 2026: "Koi wazeh mashwara nazar nahien aa raha, options nahien de raha").
 * PURE: it reads what it is handed and fetches nothing.
 *   · THE YOUTUBE SCORE (owner's answer 2, 22 Oct 2026 — updates the 12 Oct "no derived score" rule ONLY in this form): its own /100 = the
 *     share of plain countable checks passed, each check shown with its count ("Every video has a description: 1,402 of 1,437" — RR-310 B5). No guess about views,
 *     reach or earnings.
 *   · "DO THESE FIRST THIS WEEK": 3–5 concrete steps for THIS channel, from the niche research and its own videos.
 *   · PRIORITY: the most-viewed and the newest videos first (20), the rest behind "Show more" — never a wall of 1,437.
 *   · PER VIDEO, 3 READY OPTIONS: a full title (place + activity + who, main words first, the channel's own language style), a full
 *     description (two lines with the key words, the video's own summary, chapters for long videos, the right links), 3 hashtags and a
 *     thumbnail text of 2–4 words — each option saying what it is based on. Built from the niche research, the channel's own description and
 *     the video's own title and description; a word that is not in one of those is never added (no invented place, person or fact).
 *   · NEW VIDEO IDEAS: formats that do well in the niche that the channel has not covered, and viewers' questions — each with a ready title
 *     and why it is suggested.
 */
import { videoKind, linkTargetFor, TITLE_MAX } from "../src/video/youtube.mjs";
import { GENERIC_HASHTAGS, tokens, newVideoIdeas, RULES } from "./youtube-advice.mjs";
import { FORMATS, placeIn, properNames } from "./youtube-niche.mjs";

export const TOP_N = 20;
const day = (d) => String(d ?? "").slice(0, 10);
const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const plural = (n, one, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
const hashtagsIn = (s) => [...String(s ?? "").matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]);
/* title case that keeps short capitals (CV, UK, OET), quiets SHOUTING words (BIRTHDAY → Birthday) and leaves small words small */
const SMALL = new Set(["a", "an", "the", "in", "of", "to", "and", "for", "with", "on", "at", "or", "by", "ka", "ki", "ke", "se", "aur", "or"]);
const titleCase = (s) => String(s).split(/\s+/).filter(Boolean).map((w, i) => (/^[\p{Lu}\d&]{2,4}$/u.test(w) ? w : w === w.toUpperCase() && w.length > 4 ? w.charAt(0) + w.slice(1).toLowerCase() : i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
/* a hashtag from the meaning words only (#WriteCV, never #HowToWriteA); short capitals kept */
const camel = (s) => String(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w && !SMALL.has(w.toLowerCase()) && !/^(how|what|why|my|your|our|this|that|is|are|i|we|you)$/i.test(w)).slice(0, 3).map((w) => (/^[\p{Lu}\d]{2,4}$/u.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join("");
/* fits a limit at a word boundary — never a "…" cut */
const fit = (s, n) => { s = String(s).replace(/\s+/g, " ").trim(); if (s.length <= n) return s; const cut = s.slice(0, n + 1).replace(/\s+\S*$/, "").replace(/[\s|,:;—–-]+$/, ""); return cut || s.slice(0, n); };

/* ── the YouTube score: plain countable checks ── */
export function youtubeScore(videos, { productUrl = null, productIsChannel = false, relatedPages = [] } = {}) {
  const long = videos.filter((v) => videoKind(v) === "LONG");
  const withTarget = videos.map((v) => [v, linkTargetFor(v, { productUrl, productIsChannel, relatedPages })]).filter(([, t]) => t);
  const has = (s, u) => String(s ?? "").toLowerCase().includes(String(u).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""));
  const checks = [
    { id: "description", line: "Every video has a description", of: videos.length, passed: videos.filter((v) => String(v.description ?? "").trim()).length },
    { id: "title", line: `Every title has words and fits YouTube's ${TITLE_MAX} characters`, of: videos.length, passed: videos.filter((v) => tokens(v.title).length > 0 && String(v.title).length <= TITLE_MAX).length },
    { id: "generic", line: "No video uses empty hashtags (#viral, #fyp, #trending …)", of: videos.length, passed: videos.filter((v) => !hashtagsIn(`${v.title} ${v.description ?? ""}`).some((h) => GENERIC_HASHTAGS.has(h.toLowerCase()))).length },
    { id: "hashtag-count", line: `Every video has ${RULES.hashtags.ignoredAbove} hashtags or fewer (above that YouTube ignores all of them)`, of: videos.length, passed: videos.filter((v) => hashtagsIn(`${v.title} ${v.description ?? ""}`).length <= RULES.hashtags.ignoredAbove).length },
    { id: "chapters", line: "Every long video has chapters", of: long.length, passed: long.filter((v) => /(^|\n)\s*0?0:00\b/.test(String(v.description ?? ""))).length },
    { id: "link", line: "Every video about your product links to its page", of: withTarget.length, passed: withTarget.filter(([v, t]) => has(v.description, t.url)).length },
  ].filter((c) => c.of > 0);
  const of = checks.reduce((n, c) => n + c.of, 0), passed = checks.reduce((n, c) => n + c.passed, 0);
  const score = of ? Math.round((passed / of) * 100) : null;
  return Object.freeze({ score, gauge: score === null ? "Not measured" : `${score}/100`, word: score === null ? "Not measured" : score >= 80 ? "Good" : score >= 50 ? "Needs work" : "Poor",
    checks: checks.map((c) => ({ ...c, text: `${c.line}: ${fmt(c.passed)} of ${fmt(c.of)}` })), how: `The share of these plain checks your ${plural(videos.length, "video")} pass (${fmt(passed)} of ${fmt(of)}). It says nothing about views, reach or earnings.` });
}

/* ── priority: the most-viewed and the newest first ── */
export function priorityOrder(videos) {
  const byViews = videos.slice().sort((a, b) => b.views - a.views), byNew = videos.slice().sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const why = new Map();
  for (const v of byViews.slice(0, TOP_N / 2)) why.set(v.videoId, ["one of your most-viewed"]);
  for (const v of byNew.slice(0, TOP_N / 2)) why.set(v.videoId, [...(why.get(v.videoId) ?? []), "one of your newest"]);
  const first = [...byViews.slice(0, TOP_N / 2), ...byNew.slice(0, TOP_N / 2)].filter((v, i, a) => a.findIndex((x) => x.videoId === v.videoId) === i);
  for (const v of byViews) { if (first.length >= TOP_N) break; if (!why.has(v.videoId)) { why.set(v.videoId, ["one of your most-viewed"]); first.push(v); } }
  const rest = byViews.filter((v) => !why.has(v.videoId));
  return { order: [...first, ...rest], why };
}

/* ── one video's own words: its title without hashtags, @names, the channel's own name, episode numbers and emoji ── */
export function ownWords(v, channel = {}) {
  const name = String(channel.title ?? "").toLowerCase();
  const clean = (s) => String(s ?? "").replace(/[#@]+[\p{L}\p{N}_.-]*/gu, " ") /* RR-310: "##shortsfeed" left a lone "#" */.replace(/\p{Extended_Pictographic}|️|‍|[\u{1F1E6}-\u{1F1FF}]/gu, " ").replace(/\b(?:daily )?vlog\s*#?\d+\b|\bep(?:isode)?\.?\s*\d+\b|#\d+/gi, " ").replace(/\s+/g, " ").trim();
  const parts = String(v.title ?? "").split(/\s*[|•]\s*|\s+[-–—]\s+/).map(clean).filter((p) => p && p.toLowerCase() !== name && tokens(p).length > 0);
  /* the video's own summary: a description line that is not a link, not the title again, not the channel's greeting used on every video */
  const tset = new Set(tokens(v.title));
  const boiler = channel.boilerplate ?? new Set();
  const first = String(v.description ?? "").split("\n").map(clean).find((l) => {
    const t = tokens(l); if (l.length < 15 || /https?:|www\.|\.(com|shop|net|org)\b|^welcome to\b|^subscribe\b|^follow\b|^(facebook|instagram|tiktok|email|contact)\b/i.test(l) || t.length < 3) return false;
    if (t.filter((w) => tset.has(w)).length / t.length >= 0.6) return false;
    return !boiler.has(lineKey(l, v));
  }) ?? null;
  return { parts, main: parts[0] ?? null, firstLine: first };
}
/* a description line with the video's own title and numbers taken out — the same key on many videos = the channel's boilerplate */
const lineKey = (l, v) => tokens(String(l).toLowerCase().replace(String(v.title ?? "").toLowerCase(), " ")).filter((w) => !/\d/.test(w)).join(" ");
export function boilerplateOf(videos) {
  const n = new Map();
  for (const v of videos) for (const l of new Set(String(v.description ?? "").split("\n").map((x) => lineKey(x, v)).filter(Boolean))) n.set(l, (n.get(l) ?? 0) + 1);
  return new Set([...n.entries()].filter(([, c]) => c >= Math.max(3, videos.length * 0.02)).map(([l]) => l));
}
/* RR-307 rule kept: a format is read from the video's OWN title and description — never from its tags alone (900 videos carry one tag) */
const formatOf = (v) => FORMATS.find((f) => f.re.test(`${v.title} ${String(v.description ?? "").split("\n").slice(0, 2).join(" ")}`)) ?? null;
/* the words of THIS video that name its activity: the shortest part of its own title that holds the format's word ("BIRTHDAY Weekend"),
 * else the word itself — never the category's name ("Family events") */
function activityOf(v, f, own) {
  if (!f) return own.main ? titleCase(fit(own.main, 45)) : null;
  const part = own.parts.filter((p) => f.re.test(p) && p.length <= 40).sort((a, b) => a.length - b.length)[0];
  if (part) return titleCase(part);
  const m = f.re.exec(`${v.title} ${String(v.description ?? "").split("\n").slice(0, 2).join(" ")}`);
  return f.title ?? titleCase(m[0]);
}
/* a title style: does the channel write its titles in English, or in Roman Urdu/Hindi? (its own words only are reused either way) */
const ROMAN = new Set(["hai", "hain", "ka", "ki", "ke", "ko", "mein", "aur", "kya", "kaise", "nahi", "apni", "apna", "mera", "meri", "mere", "saath", "sath", "gayi", "gaye", "wala", "wali"]);
export const styleOf = (v) => (String(v.title).toLowerCase().split(/[^\p{L}]+/u).some((w) => ROMAN.has(w)) ? "Roman Urdu/Hindi" : "English");

/**
 * B3 · three ready options for one video. `ctx` = { channel, persona, niche, summary, productUrl, productIsChannel, relatedPages, readOn }.
 * Every option: { title, description, hashtags: [3], thumbnail, basedOn: [...] }.
 */
export function optionsFor(v, ctx) {
  const { channel = {}, persona = {}, niche = {}, summary = null, readOn } = ctx;
  const kind = videoKind(v);
  const own = ownWords(v, channel);
  const f = formatOf(v);
  const vPlace = placeIn(`${v.title} ${own.firstLine ?? ""}`);
  /* the channel's home place only when the video names no other place and is not a trip (a trip elsewhere must not be put in the home country) */
  const place = vPlace ?? (f?.id !== "travel" ? persona.places?.[0] ?? null : null);
  const who = persona.who ?? null;
  const activity = activityOf(v, f, own);
  const target = linkTargetFor(v, { productUrl: ctx.productUrl, productIsChannel: ctx.productIsChannel, relatedPages: ctx.relatedPages ?? [] });
  /* the niche's phrases in the video's own spelling (its "CV", not "Cv") */
  const caps = new Map(String(v.title).split(/[^\p{L}\p{N}]+/u).filter((w) => /^[\p{Lu}\d]{2,4}$/u.test(w)).map((w) => [w.toLowerCase(), w]));
  /* a niche phrase that names ANOTHER place than this video's ("pakistani mom in denmark" for a trip to Iceland) is not used for it */
  const nicheTop = (niche.queries ?? []).map((q) => String(q.q).split(" ").map((w) => caps.get(w.toLowerCase()) ?? w).join(" ")).filter((q) => { const p = placeIn(q); return !p || p === (vPlace ?? (f?.id !== "travel" ? persona.places?.[0] : null)); });
  const fmtStat = f && summary?.formats?.find((x) => x.id === f.id);
  const basedOnCommon = [
    own.main ? `this video's own title ("${fit(own.main, 60)}")` : "this video's title says little about it — your channel's main topic is used",
    ...(vPlace ? [`the place this video names (${vPlace})`] : place ? [`your channel's home (${place}, from ${persona.whoFrom ?? "your channel"})`] : []),
    ...(who ? [`who your channel is (${who}, from ${persona.whoFrom})`] : []),
    ...(fmtStat ? [`niche research: "${fmtStat.label}" videos — ${fmtStat.count} of the top ones, median ${fmt(fmtStat.medianViews)} views (${summary.source})`] : nicheTop.length ? [`your niche: ${nicheTop.slice(0, 3).join(", ")} (from your own videos' tags and your channel's description${readOn ? `, read ${day(readOn)}` : ""})`] : []),
  ];
  /* the video's own main words — an all-lowercase title gets its capitals (the words stay the video's own) */
  const mainText = own.main ? fit(own.main === own.main.toLowerCase() ? titleCase(own.main) : own.main, 60) : null;
  /* RR-309 B4 · THREE DIFFERENT KINDS of option (owner): 1 · place + activity + who; 2 · a question people ask; 3 · a short hook — each built
   * only from the researched phrases and the video's own words; a kind that cannot be made from them is filled by the video's own words */
  const subject = activity ?? mainText ?? (nicheTop[0] ? titleCase(nicheTop[0]) : null);
  const where = place && subject && !subject.toLowerCase().includes(place.toLowerCase()) ? ` in ${place}` : "";
  const vt = new Set(tokens(`${v.title} ${own.firstLine ?? ""} ${activity ?? ""} ${place ?? ""}`));
  /* a question a viewer really asked (the research's comments, the client's files) that this video's own words answer */
  const asked = (ctx.questions ?? []).map((q) => ({ q, n: tokens(q.text).filter((w) => vt.has(w)).length })).filter((x) => x.n >= Math.min(2, tokens(x.q.text).length)).sort((a, b) => b.n - a.n || (b.q.likes ?? 0) - (a.q.likes ?? 0))[0]?.q ?? null;
  /* else a question in the shape this kind of video answers — made from the video's own words, and said so */
  const shaped = !subject ? null : f?.id === "travel" && place ? `Is ${place} Worth Visiting?` : f?.id === "cost-of-living" ? `How Much Does Life${where || (place ? ` in ${place}` : "")} Really Cost?` : ["routine", "morning-routine", "night-routine", "day-in-life"].includes(f?.id) ? `What Does a ${who ? `${who}'s` : "Real"} Day${where || (place ? ` in ${place}` : "")} Look Like?` : `${subject}${where}: What Is It Really Like?`;
  const hook = !subject ? null : kind === "SHORT" ? `Watch This: ${subject}` : `Come With Us: ${subject}${where.length && subject.length + where.length < 44 ? where : ""}`;
  const typed = [
    { type: "Place + activity + who", title: subject ? `${subject}${where}${who ? ` | ${who}${/vlog/i.test(who) ? "" : " Vlog"}` : channel.title ? ` | ${channel.title}` : ""}` : null, from: "the place, what happens and who — main words first" },
    { type: "A question people ask", title: asked ? asked.text : shaped, from: asked ? `a question a viewer asked: "${fit(asked.text, 80)}" (${asked.source})` : "a question shaped from this video's own words — no viewer has asked it yet; the research finds real ones" },
    { type: "A short hook", title: hook, from: "a short opening line from what happens in this video" },
    /* fillers, only when a kind above could not be made: the video's own words, the niche's phrase, the channel's name */
    { type: "Your own words first", title: mainText ? `${mainText}${activity && !mainText.toLowerCase().includes(activity.toLowerCase()) ? ` | ${activity}` : ""}${place && !mainText.toLowerCase().includes(place.toLowerCase()) ? ` in ${place}` : ""}` : null, from: "this video's own words first" },
    { type: "Your niche's words", title: mainText && nicheTop[0] && !mainText.toLowerCase().includes(nicheTop[0].toLowerCase()) ? `${titleCase(nicheTop[0])}: ${mainText}` : null, from: "your niche's phrase and this video's own words" },
  ].map((o) => ({ ...o, title: o.title ? properNames(fit(o.title.replace(/\s+/g, " ").replace(/^\s*\|\s*/, "").trim(), TITLE_MAX)) : null }));
  const seen = new Set();
  /* an option that only repeats the video's present title (without its hashtags and the channel's name) is not advice — it is left out */
  const now = String(own.parts.join(" | ")).replace(/\s+/g, " ").trim().toLowerCase();
  const usable = typed.filter((o) => o.title && o.title.length >= 8 && o.title.toLowerCase() !== now && o.title.toLowerCase() !== String(own.main ?? "").toLowerCase() && !seen.has(o.title.toLowerCase()) && seen.add(o.title.toLowerCase()));
  const uniqueTitles = usable.map((o) => o.title);
  const keyLine = [nicheTop[0], who, place].filter(Boolean).map(titleCase).join(" · ");
  const summaryLines = own.firstLine ? [own.firstLine] : ["(Add one or two sentences saying what happens in this video.)"];
  const chapters = kind === "LONG" ? ["", "Chapters (fill in the time each part starts — at least 3 parts, each 10 seconds or longer):", "0:00 Intro", "?:?? …", "?:?? …"] : [];
  const links = [...(target ? [`More: ${target.url}`] : []), ...(channel.handle ? [`Subscribe: https://www.youtube.com/${channel.handle}?sub_confirmation=1`] : [])];
  /* always 3 hashtags: what happens, where, who, the niche's phrases, then the video's own main words and the channel's own name */
  const tagPool = [...new Set([activity && camel(activity), place && camel(place), who && camel(who), ...nicheTop.map(camel), ...(own.parts ?? []).map(camel), channel.title && camel(channel.title)].filter((t) => t && t.length >= 3 && t.length <= 40))];
  const options = uniqueTitles.slice(0, 3).map((title, i) => {
    const o = usable[i];
    const lead = o.type === "A question people ask" ? `This video answers: ${title}` : o.type === "Your own words first" && mainText ? mainText : title.split(" | ")[0];
    const description = properNames([`${fit(lead, 120)}${place && !lead.toLowerCase().includes(place.toLowerCase()) ? ` — in ${place}` : ""}${/[.?!]$/.test(lead) ? "" : "."}`, keyLine, "", ...summaryLines, ...chapters, ...(links.length ? ["", ...links] : [])].join("\n"));
    const hashtags = [...tagPool.slice(i % 2, (i % 2) + 3), ...tagPool].filter((t, k, a) => a.indexOf(t) === k).slice(0, 3).map((t) => `#${t}`);
    /* 2–4 meaning words (no "HOW TO WRITE A") */
    /* up to 4 words as they are ("JAB WE MET"); a longer text keeps its meaning words only ("WRITE CV", never "HOW TO WRITE A") */
    const words = (xs) => { const all = xs.filter(Boolean).join(" ").replace(/[^\p{L}\p{N}' ]+/gu, " ").split(/\s+/).filter(Boolean); return all.length <= 4 ? all : all.filter((w) => !SMALL.has(w.toLowerCase()) && !/^(how|what|why|my|your|our|this|that|is|are|i|we|you)$/i.test(w)); };
    const pick = [words(o.type === "Place + activity + who" ? [activity, place] : o.type === "A question people ask" ? [subject, place] : o.type === "A short hook" ? [who, place] : [mainText]), words([activity, place, who, mainText, nicheTop[0], channel.title])].find((w) => w.length >= 2) ?? words([mainText, channel.title]);
    const thumbnail = [...new Set(pick.map((w) => w.toUpperCase()))].slice(0, 4).join(" ");
    return Object.freeze({ n: i + 1, type: o.type, title, description, hashtags, thumbnail, style: styleOf({ title }), basedOn: [o.from, ...basedOnCommon] });
  });
  return Object.freeze({ videoId: v.videoId, title: v.title, kind, views: v.views, publishedAt: day(v.publishedAt), options, firstLine: own.firstLine ?? null, link: target?.url ?? null,
    weak: !own.main && !f ? "This video's title and description say very little — the options use your channel's main topic. Check they fit before you use them." : null });
}

/** B1 · "Do these first this week" — 3 to 5 concrete steps for THIS channel. */
export function doFirst({ videos, top, score, summary, ideas, persona = {} }) {
  const steps = [];
  const weakTitles = top.filter((x) => { const v = videos.find((y) => y.videoId === x.videoId); return v && !placeIn(v.title) && !formatOf(v); }).slice(0, 5);
  if (weakTitles.length) steps.push({ step: `Give ${weakTitles.length} of your top videos a clearer title — say what happens and where. Pick one of the 3 ready titles under each: ${weakTitles.slice(0, 3).map((x) => `"${fit(x.title, 50)}"`).join(", ")}${weakTitles.length > 3 ? " …" : ""}.`, from: "your most-viewed and newest videos: their titles name no activity or place" });
  const idea = ideas.find((i) => i.kind === "FORMAT");
  if (idea) steps.push({ step: `Make one new video this week: "${idea.title}".`, from: idea.why });
  const ch = score.checks.find((c) => c.id === "chapters");
  if (ch && ch.passed < ch.of) { const longTop = top.filter((x) => x.kind === "LONG").slice(0, 3); steps.push({ step: `Add chapters to your long videos — ${fmt(ch.of - ch.passed)} of ${fmt(ch.of)} have none. Start with ${longTop.length ? longTop.map((x) => `"${fit(x.title, 40)}"`).join(", ") : "your newest long video"}.`, from: RULES.chapters.source }); }
  const gen = score.checks.find((c) => c.id === "generic");
  if (gen && gen.passed < gen.of) steps.push({ step: `Remove #viral, #fyp and #trending from your newest videos — ${fmt(gen.of - gen.passed)} videos use them; use the 3 hashtags given under each video instead.`, from: RULES.hashtags.source });
  if (summary && summary.medianViews.long !== null && summary.medianViews.shorts !== null) {
    const ownShorts = Math.round((videos.filter((v) => videoKind(v) === "SHORT").length / Math.max(1, videos.length)) * 100);
    if (summary.medianViews.long > summary.medianViews.shorts * 1.5 && ownShorts >= 60) steps.push({ step: `Post at least one long video this week (about ${summary.longMinutes} minutes): in your niche, long videos have a median of ${fmt(summary.medianViews.long)} views against ${fmt(summary.medianViews.shorts)} for Shorts, and ${ownShorts}% of your videos are Shorts.`, from: summary.source });
    else if (summary.medianViews.shorts > summary.medianViews.long * 1.5 && ownShorts <= 30) steps.push({ step: `Cut one Short from your next long video: in your niche, Shorts have a median of ${fmt(summary.medianViews.shorts)} views against ${fmt(summary.medianViews.long)} for long videos.`, from: summary.source });
  }
  const q = ideas.find((i) => i.kind === "QUESTION");
  if (q && steps.length < 5) steps.push({ step: `Answer a viewer's question in a video or a pinned comment: "${q.question}".`, from: q.why });
  return steps.slice(0, 5);
}

/**
 * RR-310 A · EVERY PROBLEM WITH ITS READY TEXT: for each YouTube check that some videos fail, the most-viewed videos that fail it (up to 3),
 * each with the text to paste — made by optionsFor from the video's own words and the research, never invented. Chapters: YouTube's official
 * service gives a video's captions only to its owner signed in, so the chapter list is a template with clear blanks.
 */
export const CHAPTERS_FROM = "a chapter template with blanks — Visibility cannot read your video's transcript with your YouTube key (YouTube gives captions only to the channel's owner, signed in)";
export function gapFixes(videos, ctx, opts = {}) {
  const byViews = videos.slice().sort((a, b) => b.views - a.views);
  const long = (v) => videoKind(v) === "LONG";
  const tags = (v) => hashtagsIn(`${v.title} ${v.description ?? ""}`);
  const fails = {
    description: (v) => !String(v.description ?? "").trim(),
    title: (v) => !(tokens(v.title).length > 0 && String(v.title).length <= TITLE_MAX),
    generic: (v) => tags(v).some((h) => GENERIC_HASHTAGS.has(h.toLowerCase())),
    "hashtag-count": (v) => tags(v).length > RULES.hashtags.ignoredAbove,
    chapters: (v) => long(v) && !/(^|\n)\s*0?0:00\b/.test(String(v.description ?? "")),
    link: (v) => { const t = linkTargetFor(v, opts); return Boolean(t) && !String(v.description ?? "").toLowerCase().includes(String(t.url).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")); },
    /* a title that names no activity and no place (the "clearer title" step) — counted on the most-viewed and newest only */
    clear: (v) => !placeIn(v.title) && !formatOf(v),
  };
  const out = {};
  for (const [id, bad] of Object.entries(fails)) {
    const pool = id === "clear" ? priorityOrder(videos).order.slice(0, TOP_N) : byViews;
    const failing = pool.filter(bad);
    if (!failing.length) continue;
    out[id] = { count: failing.length, of: id === "clear" ? pool.length : id === "chapters" ? videos.filter(long).length : id === "link" ? videos.filter((v) => linkTargetFor(v, opts)).length : videos.length,
      videos: failing.slice(0, 3).map((v) => {
        const a = optionsFor(v, ctx), o = a.options[0];
        const src = (what) => [what, ...(o?.basedOn ?? []).slice(1)].join(" · ");
        const ready = !o ? [] : id === "description" ? [{ kind: "description", label: "Full description", text: o.description, source: src(o.basedOn[0]) }]
          : id === "title" || id === "clear" ? a.options.map((x) => ({ kind: "title", label: `Title — ${x.type}`, text: x.title, source: src(x.basedOn[0]) }))
          : id === "generic" || id === "hashtag-count" ? [{ kind: "hashtags", label: "3 hashtags instead", text: o.hashtags.join(" "), source: src("the place, what happens and who in this video") }]
          : id === "chapters" ? [{ kind: "chapters", label: "Chapters", text: ["0:00 Intro", "?:?? …", "?:?? …"].join("\n"), source: CHAPTERS_FROM }]
          : id === "link" ? [{ kind: "link", label: "Link line for the description", text: `More: ${a.link}`, source: "the page of your product this video is about (your Settings)" }] : [];
        return { videoId: v.videoId, title: v.title, views: v.views, ready };
      }) };
  }
  return out;
}

/** B5 · new video ideas: formats that do well in the niche that the channel has (almost) not covered, and viewers' questions. */
export function ideasFor({ summary, videos, persona = {}, questions = [], max = 8, topic = null }) {
  const out = [];
  const place = persona.places?.[0] ?? null, who = persona.who ?? null;
  /* "not covered": at most 1 of the channel's own videos (or under 1% of them) says it in its own title or description */
  const few = Math.max(1, Math.floor(videos.length * 0.01));
  for (const f of summary?.formats ?? []) {
    /* RR-310: "does well" = its median views at least the niche's own median (an exam niche's "Cleaning" at 95 views is not a hit) */
    if (f.own > few || f.count < 2 || (Number.isFinite(summary.medianAll) && (f.medianViews ?? 0) < summary.medianAll)) continue;
    const e = f.examples[0];
    /* a bare format word ("Q&A") gets the niche's own topic when there is no place and no persona: "Q&A: IELTS Coaching" */
    out.push({ kind: "FORMAT", title: fit(`${f.title}${place ? ` in ${place}` : ""}${who ? ` | ${who}` : ""}${!place && !who && topic ? `: ${titleCase(topic)}` : ""}`, TITLE_MAX), why: `"${f.label}" is ${f.count} of the niche's top videos (median ${fmt(f.medianViews)} views${e ? `; e.g. "${fit(e.title, 60)}" by ${e.channel}, ${fmt(e.views)} views, ${e.publishedAt}` : ""}) — you have ${f.own === 0 ? "no such video" : `only ${f.own}`} yet. Source: ${summary.source}.` });
  }
  for (const i of newVideoIdeas({ questions, videos, max })) out.push({ kind: "QUESTION", question: i.title, title: fit(i.title, TITLE_MAX), why: `A viewer asked it and none of your videos answers it yet — ${i.from}.` });
  return out.slice(0, max).map((o) => ({ ...o, title: properNames(o.title) })); // RR-309 B2: names keep their capitals
}
