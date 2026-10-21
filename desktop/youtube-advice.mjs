/**
 * 🔴 RR-306 C · YOUTUBE THAT ADVISES (owner decision, 21 Oct 2026: "it should advise what to do to make it better, search according to the
 * product and gather keywords and questions and other info"). PURE: it reads what it is handed and fetches nothing.
 *   IN: the product's own declaration (name, "what it does", languages); the client's confirmed channel and ALL its videos; the research read
 *       through the official YouTube Data API only (the videos that do well for the product's topics; the questions people write in
 *       comments); the client's own search-data files (Search Console / Bing / Keyword Planner) when given.
 *   OUT: per-video advice (title with the main words first, description with the key words and the right link, chapters for LONG videos
 *       only, relevant hashtags in place of generic ones, a thumbnail text idea), channel advice (identity, description, playlists, one
 *       language style), new video ideas from questions no video answers yet — and, where the data is not enough, a plain line saying so
 *       and what to do. EVERY piece of advice names where it came from (the phrase or question, its source, its date). Nothing is invented;
 *       no score is derived.
 */
import { videoKind, linkTargetFor, TITLE_MAX } from "../src/video/youtube.mjs";

export const RULES = Object.freeze({
  chapters: Object.freeze({ firstAt: "00:00", min: 3, minSec: 10, source: "YouTube Help — \"Video chapters\" (support.google.com/youtube/answer/9884579), read 2026-10-21" }),
  hashtags: Object.freeze({ ignoredAbove: 60, shownAboveTitle: 3, source: "YouTube Help — \"Hashtags on YouTube\" (support.google.com/youtube/answer/6390658), read 2026-10-21: over 60 hashtags are all ignored; up to 3 show by the title; misleading or unrelated hashtags may lead to removal" }),
});
/* hashtags that say nothing about the video (the owner's own examples: #viral #fyp) */
export const GENERIC_HASHTAGS = new Set(["viral", "viralshort", "viralshorts", "viralvideo", "viralvideos", "fyp", "foryou", "foryoupage", "trending", "trend", "explore", "explorepage", "tiktok", "reels", "instagood", "subscribe", "like", "likes", "youtube", "youtuber", "ytshorts", "youtubeshorts"]);
const STOP = new Set(("a an and are as at be been but by can do does for from had has have how i if in into is it its just me my no not of on or our so than that the their them then there these they this to too up was we were what when where which who why will with you your yours about after all also any back been both each even ever every get got here him his her more most much new now off one only other out over same she should some such very well yet youtube channel channels video videos short shorts vlog vlogs official " +
  /* Roman Urdu / Hindi function words */ "hai hain ka ki ke ko se mein main aur ye yeh wo woh bhi na nahi kya ho tha thi par pe to hi ek apna apni apne hum ham mera meri mere tum aap kar karo karna karte karti kiya gaya gayi").split(" "));
export const QUESTION_START = /^(how|what|why|which|where|when|who|can|could|is|are|does|do|should|will|would|kya|kaise|kaisay|kyun|kyon|kyu|kab|kahan|kidhar|kitna|kitni|kitne|kaun|konsa|konsi)\b/i;
const LANGUAGE_WORDS = new Set(["urdu", "hindi", "english", "arabic", "punjabi", "bengali", "bangla", "french", "german", "spanish", "chinese", "tamil", "telugu"]);
const ROMAN_URDU = new Set(["hai", "hain", "ka", "ki", "ke", "ko", "mein", "aur", "kya", "kaise", "nahi", "apni", "apna", "hum", "mera", "meri", "gaye", "gayi", "wala", "wali", "liye", "sath", "saath", "kar", "karo", "bhi", "yeh", "ye", "wo"]);

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFKC").replace(/[’']s\b/g, "").replace(/[’']/g, "").replace(/#[\p{L}\p{N}_]+/gu, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export const tokens = (s) => norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
const tokenSet = (s) => new Set(tokens(s));
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const day = (d) => String(d ?? "").slice(0, 10);
const hashtagsIn = (s) => [...String(s ?? "").matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]);
const camelTag = (display) => String(display).split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 4).map(cap).join("");

/**
 * C1 · the research topics from the product's OWN declaration ("what it does"): each clause with 2+ meaning words (up to 5), and the
 * short upper-case names it lists (e.g. OET, IELTS); language names are not topics. Shown to the client and editable — never searched
 * without them.
 */
export function topicsFromDeclaration(what, { names = [] } = {}) {
  const text = String(what ?? "");
  const own = new Set(names.flatMap((n) => tokens(n)));
  const clauses = [];
  for (const chunk of text.split(/[:;—–(),.\/]|\band\b|\bwith\b/i)) {
    const t = [...new Set(tokens(chunk))].filter((w) => !LANGUAGE_WORDS.has(w) && !own.has(w));
    if (t.length >= 2) clauses.push(t.slice(0, 5).join(" "));
  }
  clauses.sort((a, b) => b.split(" ").length - a.split(" ").length);
  const acronyms = [...text.matchAll(/\b[A-Z]{3,6}\b/g)].map((m) => m[0]).filter((a) => !STOP.has(a.toLowerCase()) && !own.has(a.toLowerCase()));
  return [...new Set([...clauses.slice(0, 1), ...acronyms, ...clauses.slice(1)])].slice(0, 6);
}

/** the questions in a text: its sentences that end with "?" or start with a question word — 3+ meaning words, no links */
const URDU_QUESTION = /^(kya|kaise|kaisay|kyun|kyon|kyu|kab|kahan|kidhar|kitna|kitni|kitne|kaun|konsa|konsi)\b/i;
export function questionsIn(text) {
  return String(text ?? "").split(/(?<=[?!.।])\s+|\n+/).map((s) => s.trim().replace(/\s+/g, " ").replace(/^[^\p{L}\p{N}]+/u, "").replace(/\?{2,}$/, "?").replace(/\s+\?$/, "?"))
    .filter((s) => s.length >= 12 && s.length <= 200 && !/https?:\/\//i.test(s) && (s.endsWith("?") || (URDU_QUESTION.test(s) && !/[.!]$/.test(s))) && tokens(s).length >= 2);
}
/* the scripts a product's languages are written in: a question in another script is not one its viewers ask */
const SCRIPTS = { en: [/\p{Script=Latin}/u], ur: [/\p{Script=Latin}/u, /\p{Script=Arabic}/u], hi: [/\p{Script=Latin}/u, /\p{Script=Devanagari}/u], ar: [/\p{Script=Arabic}/u] };
const inScripts = (s, langs) => { const allowed = (langs?.length ? langs : ["en"]).flatMap((l) => SCRIPTS[l] ?? [/\p{Script=Latin}/u]); const letters = String(s).match(/\p{L}/gu) ?? []; return letters.length > 0 && letters.every((ch) => allowed.some((re) => re.test(ch))); };

/**
 * C1 · the words people use, each with its source: a phrase used by 2+ of the videos that do well for a topic (their own titles and
 * tags), the client's search-data files, and the declaration's own topics.
 */
export function researchTerms({ research = null, files = [] }) {
  const terms = new Map();
  const add = (phrase, display, source, weight) => { const k = tokens(phrase).join(" "); if (!k) return; const t = terms.get(k) ?? { phrase: k, display: String(display).trim(), sources: [], weight: 0 }; if (!t.sources.includes(source)) t.sources.push(source); t.weight += weight; terms.set(k, t); };
  /* a word's spelling as the top videos' own titles write it (IELTS, OET) — tags are often all lower case */
  const casing = new Map();
  for (const r of research?.topics ?? []) for (const v of r.videos) for (const w of String(v.title).split(/[^\p{L}\p{N}]+/u)) if (w && w !== w.toLowerCase() && !casing.has(w.toLowerCase())) casing.set(w.toLowerCase(), w);
  const spell = (s) => String(s).trim().split(/\s+/).filter((w) => !STOP.has(w.toLowerCase())).map((w) => casing.get(w.toLowerCase()) ?? w).join(" ");
  for (const r of research?.topics ?? []) {
    const seen = new Map();
    for (const v of r.videos) {
      const grams = new Map();
      for (const tag of v.tags ?? []) { const n = tokens(tag).length; if (n >= 1 && n <= 4) grams.set(tokens(tag).join(" "), spell(tag)); }
      const raw = String(v.title).replace(/#[\p{L}\p{N}_]+/gu, " ").split(/[^\p{L}\p{N}’'-]+/u).filter(Boolean);
      for (let i = 0; i + 1 < raw.length; i++) { const a = tokens(raw[i]), b = tokens(raw[i + 1]); if (a.length === 1 && b.length === 1) grams.set(`${a[0]} ${b[0]}`, `${raw[i]} ${raw[i + 1]}`); }
      for (const [g, d] of grams) { const s = seen.get(g) ?? { n: 0, d }; s.n++; seen.set(g, s); }
    }
    for (const [g, s] of seen) if (s.n >= 2) add(g, s.d, `YouTube search "${r.q}" — used by ${s.n} of its top ${r.videos.length} videos (read ${day(research.readOn)})`, s.n);
  }
  for (const f of files) add(f.phrase, f.phrase, `your file ${f.file} (added ${day(f.on)})`, 1 + Math.min(5, Math.log10(1 + (f.impressions ?? 0))));
  return [...terms.values()].sort((a, b) => b.weight - a.weight);
}

/** C1 · the questions people ask, each with its source: comments under the client's own videos and under the topic's top videos; files */
export function researchQuestions({ research = null, files = [], product = {}, terms = [] }) {
  const about = new Set([...tokens(product.what), ...terms.slice(0, 15).flatMap((t) => t.phrase.split(" "))]);
  const relevant = (q) => inScripts(q, product.languages) && tokens(q).some((w) => about.has(w));
  const out = [];
  const seen = [];
  const push = (text, source, likes = 0) => {
    const s = tokenSet(text);
    if (seen.some((x) => { let n = 0; for (const w of s) if (x.has(w)) n++; return n / Math.max(s.size, x.size) >= 0.8; })) return;
    seen.push(s); out.push({ text: text.endsWith("?") ? text : `${text}?`, source, likes });
  };
  for (const c of research?.comments ?? []) for (const q of questionsIn(c.text)) if (relevant(q)) push(q, `a comment under ${c.own ? "your video" : "the video"} "${c.videoTitle}"${c.own ? "" : ` (${c.channelTitle})`}, ${day(c.publishedAt)}`, c.likes ?? 0);
  for (const f of files) if (QUESTION_START.test(f.phrase) || f.phrase.endsWith("?")) push(f.phrase, `your file ${f.file} (added ${day(f.on)})`, 0);
  return out.sort((a, b) => b.likes - a.likes);
}

const matchScore = (termTokens, vset) => { let n = 0; for (const w of termTokens) if (vset.has(w)) n++; return n === termTokens.length ? n : 0; };
const share = (qTokens, vset) => qTokens.filter((w) => vset.has(w)).length;
const videoTokens = (v) => tokenSet(`${v.title} ${String(v.description ?? "").split(/\n/).filter((l) => l.trim()).slice(0, 2).join(" ")} ${(v.tags ?? []).join(" ")}`);

/** C2 · the advice for ONE video. */
export function adviceForVideo(v, { terms, questions, productUrl = null, productIsChannel = false, relatedPages = [] }) {
  const kind = videoKind(v);
  const vset = videoTokens(v), tset = tokenSet(v.title);
  const matched = terms.map((t) => { const w = t.phrase.split(" "); const s = matchScore(w, vset); return { t, s: s ? (matchScore(w, tset) ? 1000 : 0) + w.length * 10 + Math.min(9, t.weight) : 0 }; }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.t);
  const qs = questions.filter((q) => share([...tokenSet(q.text)], vset) >= 2).slice(0, 3);
  const generic = [...new Map(hashtagsIn(`${v.title} ${v.description ?? ""}`).filter((h) => GENERIC_HASHTAGS.has(h.toLowerCase())).map((h) => [h.toLowerCase(), h])).values()];
  const allTags = hashtagsIn(`${v.title} ${v.description ?? ""}`);
  const target = linkTargetFor(v, { productUrl, productIsChannel, relatedPages });
  const out = { videoId: v.videoId, title: v.title, kind, views: v.views, items: [] };
  if (!matched.length) {
    out.notEnough = "Not enough data for this video: none of the researched phrases or questions share its words. What to do: say in the title what the video is about, or add your topic words in YouTube settings and research again.";
  } else {
    const lead = matched[0];
    const leadText = cap(lead.display ?? lead.phrase);
    const cleanTitle = String(v.title).replace(/#[\p{L}\p{N}_]+/gu, (m) => (GENERIC_HASHTAGS.has(m.slice(1).toLowerCase()) ? "" : m)).replace(/\s*[|•]\s*$/, "").replace(/\s{2,}/g, " ").trim();
    const lt = tokens(cleanTitle);
    if (lt.slice(0, lead.phrase.split(" ").length).join(" ") === lead.phrase) out.items.push({ what: "Title", advice: `Keep it — it already starts with the main words people search: "${lead.display ?? lead.phrase}".`, from: lead.sources[0] });
    else if (matchScore(lead.phrase.split(" "), tset)) out.items.push({ what: "Title", advice: `Move the main words "${lead.display ?? lead.phrase}" to the start of the title — people search for them, and the start of a title is what they read first.`, from: lead.sources[0] });
    else if (!matchScore(lead.phrase.split(" "), tokenSet(String(v.description ?? "").split(/\n/).filter((l) => l.trim()).slice(0, 2).join(" ")))) out.items.push({ what: "Title", advice: `The title does not say in searched words what the video is about. Your own tags say "${lead.display ?? lead.phrase}" — if the video is about that, put those words first in the title.`, from: `${lead.sources[0]} · your video's own tags` });
    else { const s = `${leadText} — ${cleanTitle}`; out.items.push({ what: "Title", advice: s.length <= TITLE_MAX ? s : `${s.slice(0, TITLE_MAX - 1).replace(/\s+\S*$/, "")}…`, from: lead.sources[0] }); }
    const first = String(v.description ?? "").split(/\n/).map((x) => x.trim()).find((x) => x && !/^#/.test(x) && !/^https?:/.test(x));
    const lines = [`${leadText}: ${first ?? cleanTitle}`];
    if (qs.length) lines.push(`This video answers: ${qs.map((q) => q.text).join(" · ")}`);
    if (target) lines.push(`More: ${target.url}`);
    out.items.push({ what: "Description", advice: lines.join("\n"), from: [lead.sources[0], ...qs.map((q) => q.source), ...(target ? [target.why] : [])].join(" · ") });
    if (!target && productIsChannel) out.items.push({ what: "Link", advice: "No product page to link: this product is the channel itself. If this video is about one of your products, add that product's page under \"Related pages\" in YouTube settings.", from: "your YouTube settings" });
    const relevant = [...new Map(matched.slice(0, 3).map((t) => [camelTag(t.display ?? t.phrase).toLowerCase(), { tag: `#${camelTag(t.display ?? t.phrase)}`, from: t.sources[0] }])).values()].filter((h) => h.tag.length > 2);
    if (generic.length) out.items.push({ what: "Hashtags", advice: `Replace ${generic.map((h) => `#${h}`).join(" ")} — they say nothing about this video — with ${relevant.map((h) => h.tag).join(" ")}.`, from: `${RULES.hashtags.source} · ${relevant.map((h) => `${h.tag}: ${h.from}`).join(" · ")}` });
    else if (relevant.length) out.items.push({ what: "Hashtags", advice: `Use a few relevant ones: ${relevant.map((h) => h.tag).join(" ")} (up to 3 show by the title).`, from: `${RULES.hashtags.source} · ${relevant.map((h) => `${h.tag}: ${h.from}`).join(" · ")}` });
    out.items.push({ what: "Thumbnail text", advice: String(lead.display ?? lead.phrase).split(" ").slice(0, 4).join(" ").toUpperCase(), from: lead.sources[0] });
  }
  if (allTags.length > RULES.hashtags.ignoredAbove) out.items.push({ what: "Hashtags", advice: `This video has ${allTags.length} hashtags — over ${RULES.hashtags.ignoredAbove}, YouTube ignores all of them. Keep a few relevant ones.`, from: RULES.hashtags.source });
  if (kind === "LONG" && !/(^|\n)\s*0?0:00\b/.test(String(v.description ?? ""))) out.items.push({ what: "Chapters", advice: `Add chapters to the description: the first line "${RULES.chapters.firstAt} Introduction", then the time each part starts — at least ${RULES.chapters.min}, each part ${RULES.chapters.minSec} seconds or longer.`, from: RULES.chapters.source });
  if (kind === "SHORT") out.items.push({ what: "Chapters", advice: "None — Shorts have no chapters.", from: "YouTube Help — \"Understand three-minute YouTube Shorts\", read 2026-10-21" });
  return Object.freeze(out);
}

/** C3 · the channel's own advice: identity, description, playlists, one language style. */
export function channelAdvice({ channel, product, videos, terms, readOn }) {
  const out = [];
  const what = String(product.what ?? "").split(/[.]/)[0].trim();
  if (what) out.push({ what: "One-line identity", advice: `${channel.title}: ${what.replace(/^youtube channel( of [^:]+)?:\s*/i, "")}`.slice(0, 150), from: "your product's description" });
  const topicCount = new Map();
  const groups = new Map();
  for (const v of videos) {
    const vset = videoTokens(v);
    const best = terms.map((t) => ({ t, s: matchScore(t.phrase.split(" "), vset) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || b.t.weight - a.t.weight)[0]?.t;
    if (!best) continue;
    topicCount.set(best.phrase, (topicCount.get(best.phrase) ?? 0) + 1);
    groups.set(best.phrase, [...(groups.get(best.phrase) ?? []), v]);
  }
  const shown = new Map(terms.map((t) => [t.phrase, t.display ?? t.phrase]));
  const top = [...topicCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p]) => shown.get(p) ?? p);
  if (top.length) out.push({ what: "Channel description", advice: [what ? `${channel.title} — ${what.replace(/^youtube channel( of [^:]+)?:\s*/i, "")}.` : null, `Videos about: ${top.join(", ")}.`, product.site && !/youtube\.com/i.test(product.site) ? `More: ${product.site}` : null].filter(Boolean).join("\n"), from: `your product's description · the phrases your own videos match (read ${day(readOn)})` });
  const lists = [...groups.entries()].filter(([, vs]) => vs.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  if (lists.length) out.push({ what: "Playlist plan", advice: lists.map(([p, vs]) => `"${cap(shown.get(p) ?? p)}" — ${vs.length} videos (e.g. ${vs.slice(0, 2).map((v) => `"${v.title.slice(0, 50)}"`).join(", ")})`).join("\n"), from: `your own videos, grouped by the researched phrase each one matches (read ${day(readOn)})` });
  const style = { English: 0, "Roman Urdu/Hindi": 0, "Urdu script": 0, "Hindi script": 0 };
  for (const v of videos) {
    const t = String(v.title);
    if (/[؀-ۿ]/.test(t)) style["Urdu script"]++; else if (/[ऀ-ॿ]/.test(t)) style["Hindi script"]++;
    else if (norm(t).split(" ").some((w) => ROMAN_URDU.has(w))) style["Roman Urdu/Hindi"]++; else style.English++;
  }
  const used = Object.entries(style).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (used.length) {
    const [main, n] = used[0];
    out.push({ what: "Language style", advice: used.length === 1 || n / videos.length >= 0.8 ? `Your titles are ${used.length === 1 ? "all" : "mostly"} ${main} (${used.map(([k, c]) => `${k} ${c}`).join(", ")}) — keep that one style.` : `Your titles mix styles: ${used.map(([k, c]) => `${k} ${c}`).join(", ")}. Choose one style for titles and keep it${product.languages?.length ? ` (your product's languages: ${product.languages.join(", ")})` : ""}.`, from: `your own ${videos.length} video titles (read ${day(readOn)})` });
  }
  return out;
}

/** C4 · new video ideas: questions people ask that none of the client's videos answers yet (no video shares 2+ of their meaning words). */
export function newVideoIdeas({ questions, videos, max = 10 }) {
  const own = videos.map(videoTokens);
  return questions.filter((q) => { const s = [...tokenSet(q.text)]; return !own.some((v) => share(s, v) >= Math.min(2, s.length)); }).slice(0, max)
    .map((q) => ({ title: cap(q.text).slice(0, TITLE_MAX), from: q.source }));
}

/**
 * Everything for one product. `research` is null until the client runs it. `notEnough` says, in plain words, what is missing and what to do.
 */
export function youtubeAdvice({ product, channel, videos, research = null, files = [], productUrl = null, productIsChannel = false, relatedPages = [], readOn }) {
  const terms = researchTerms({ research, files });
  const questions = researchQuestions({ research, files, product, terms });
  const notEnough = [];
  if (!research) notEnough.push("Research has not run yet — press \"Research now\". It reads, through the YouTube Data API only, the videos that do well for your topics and the questions people write under them.");
  for (const t of research?.topics ?? []) if (t.videos.length < 2) notEnough.push(`YouTube found too few videos for "${t.q}" — change your topic words in YouTube settings.`);
  if (research && !questions.length) notEnough.push("No questions were found in the comments read. What to do: ask viewers a question at the end of your videos, or add a search-data file (Search Console, Bing or Keyword Planner) in YouTube settings.");
  if (!videos.length) notEnough.push("Your channel has no public videos yet — the advice starts with your first video.");
  const perVideo = videos.slice().sort((a, b) => b.views - a.views).map((v) => adviceForVideo(v, { terms, questions, productUrl, productIsChannel, relatedPages }));
  return Object.freeze({
    readOn, channel: { title: channel.title, videos: videos.length, shorts: videos.filter((v) => videoKind(v) === "SHORT").length, long: videos.filter((v) => videoKind(v) === "LONG").length, unknown: videos.filter((v) => videoKind(v) === "UNKNOWN").length },
    terms: terms.slice(0, 15).map((t) => ({ phrase: t.display ?? t.phrase, from: t.sources[0] })), questions: questions.slice(0, 15),
    channelAdvice: channelAdvice({ channel, product, videos, terms, readOn }), perVideo, ideas: newVideoIdeas({ questions, videos }), notEnough, invented: 0,
  });
}
