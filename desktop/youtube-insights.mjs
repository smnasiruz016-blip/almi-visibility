/**
 * 🔴 RR-311 B + C + D · ADVICE FROM THE CHANNEL'S OWN DATA, IN THE RIGHT LANGUAGE (owner, 21 Oct 2026: "his daughter gets similar advice from
 * free ChatGPT — Visibility must clearly beat that"). What a chatbot cannot know: THIS channel's own numbers.
 *   · LANGUAGE: the channel's language read from its own titles (Roman Urdu / Hindi words, scripts) and YouTube's own audio-language field;
 *     the niche, the competitors and the viewers' questions are kept to the same language — never American lifestyle channels for an
 *     Urdu/Hindi family vlog, never a Banglish question for an Urdu channel.
 *   · "FROM YOUR CHANNEL'S DATA": which topics, places and kinds of video get more views than the channel's own others, by how much, from
 *     how many videos; best length and day to publish from its own videos (an estimate, said so); with sign-in: retention, the searches that
 *     brought viewers, traffic sources, and the videos YouTube shows a lot but people click little (impressions × the click-through gap).
 *   · COMPETITORS (TubeBuddy's scorecard): upload rhythm, top topics, title patterns, views; their new uploads as alerts.
 *   · KEYWORDS with an honest demand ESTIMATE: how many matching videos the research found, their median views, how recent — "estimate".
 *   · CHAPTERS from the video's own captions, with the real times.
 *   · BEFORE → AFTER for every change applied to YouTube.
 * PURE: reads what it is handed.
 */
import { tokens, aboutOthersContent, nameTokensOf, NAME_STOP } from "./youtube-advice.mjs";
import { placeIn, FORMATS, properNames } from "./youtube-niche.mjs";
import { videoKind } from "../src/video/youtube.mjs";
import { spellFix } from "./youtube-plan.mjs";

const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
/* views are whole numbers: a median of two is rounded (never "2,676,131.5 views") */
const median = (xs) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2)) : null; };
const ratio = (a, b) => (b > 0 ? a / b : null);

/* ── language ── */
const ROMAN_HINDUSTANI = new Set("hai hain ka ki ke ko se mein mai main aur nahi nahin kya kaise kaisa kaisi ho gaya gayi gaye hum ham mera meri mere apna apni apne aaj kal wala wali wale saath sath bhi tha thi kar karo karna karne raha rahi rahe liye ammi abbu amma abba bhai baji behan shadi ghar khana bachon bacho bache phupo chachu nani dadi naya nayi pehla pehli kuch bahut bohot sab yeh woh ye wo jab tab aaya aayi gya gyi pohanch pohnch gayi kiya kiye diya liya mil milte dekho dekhiye apko aapko aap tum tera teri hamara hamari humara humari jaldi abhi phir dobara".split(" "));
const ROMAN_BANGLA = new Set("ami tumi apnar apni amar tomar bhalo naki kore korbo hobe ache achhe kemon keno kothay ekta onek hoye korte dekhun dekho banglay bangla korun valo shob".split(" "));
const ENGLISH = new Set("the and is are to of in for with my your how what this that you it on from was we our can do does be by at an as or if will get not have has".split(" "));
/** the language of one text: ur-hi (Hindustani: Urdu / Hindi, Roman or its own script), bn, en — or null */
export function langOf(text) {
  const s = String(text ?? "");
  if (/[ऀ-ॿ]/.test(s)) return "ur-hi"; // Devanagari
  if (/[؀-ۿ]/.test(s)) return "ur-hi"; // Urdu's Arabic script
  if (/[ঀ-৿]/.test(s)) return "bn";
  const w = s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const n = (set) => w.filter((x) => set.has(x)).length;
  const h = n(ROMAN_HINDUSTANI), b = n(ROMAN_BANGLA), e = n(ENGLISH);
  if (b > 0 && b >= h) return "bn";
  if (h > 0 && h >= e * 0.5) return "ur-hi";
  if (e > 0) return "en";
  return null;
}
const AUDIO = (code) => (/^(ur|hi|pa)/i.test(String(code ?? "")) ? "ur-hi" : /^bn/i.test(String(code ?? "")) ? "bn" : /^en/i.test(String(code ?? "")) ? "en" : null);
/** the channel's language, from its own titles and YouTube's audio-language field */
export function channelLanguage(videos) {
  /* YouTube's audio-language field says "en" by default (Dhanak: 1,222 of 1,438 "en", while 664 of its titles are Roman Urdu) — so "en"
   * there decides nothing; the titles and a non-English audio field do. A channel that writes a quarter of its titles in Urdu/Hindi speaks
   * to Urdu/Hindi viewers, even when it mixes in English. */
  const votes = new Map();
  for (const v of videos) { const a = AUDIO(v.language), t = langOf(`${v.title} ${String(v.description ?? "").split("\n")[0]}`); for (const l of [a === "en" ? null : a, t]) if (l) votes.set(l, (votes.get(l) ?? 0) + 1); }
  const classified = [...votes.values()].reduce((n, x) => n + x, 0) || 1;
  const nonEn = [...votes.entries()].filter(([l]) => l !== "en").sort((a, b) => b[1] - a[1])[0];
  const code = nonEn && nonEn[1] >= Math.max(2, classified * 0.25) ? nonEn[0] : "en";
  return { code, relevance: code === "ur-hi" ? "ur" : code === "bn" ? "bn" : "en", second: code === "ur-hi" ? "hi" : null, label: code === "ur-hi" ? "Urdu / Hindi (Roman or its own script)" : code === "bn" ? "Bangla" : "English", votes: Object.fromEntries(votes) };
}
/** is a niche video in the channel's language? Its audio-language field first, else its own words */
export const sameLanguage = (v, ch) => { const a = AUDIO(v.language); if (a && a !== "en") return a === ch.code; if (a === "en" && ch.code === "en") return true; if (ch.code === "en") { const l = langOf(`${v.title} ${String(v.description ?? "").slice(0, 300)}`); return l === "en" || l === null; } return langOf(`${v.title} ${String(v.description ?? "").slice(0, 300)}`) === ch.code; };

/* ── a viewer's question as a ready video title (no AI): its own words, cleaned, in the channel's language only ── */
export function questionTitle(q, ch) {
  if (langOf(q.text) !== ch.code && !(ch.code === "en" && langOf(q.text) === null)) return null;
  let t = String(q.text).replace(/^(sir|madam|mam|maam|bhai|baji|apa|ji|aapa|dear|hi|hello|assalam[- ]?o?[- ]?alaikum|salam)[,!.\s]+/i, "").replace(/\s+/g, " ").trim();
  t = spellFix(t);
  if (t.length < 12 || t.length > 100 || tokens(t).length < 3) return null;
  t = t.charAt(0).toUpperCase() + t.slice(1); if (!/[?]$/.test(t)) t = `${t.replace(/[.!]+$/, "")}?`;
  return { title: properNames(t), from: `a viewer's own question: "${q.text}" (${q.source})` };
}

/*
 * ── RR-315 D1 · a viewer's question as a PROPER video title (owner: asked in RR-311, not done) ──
 *   "In OET on computer, would they change the reading texts?" → "OET on Computer: Would They Change the Reading Texts? (2026)".
 *   · LEFT OUT: a question about another channel's OWN content — a numbered question or part of its test ("answer of question 18 from
 *     reading part A"), "your course", "the shown format", or the name of the channel it was asked under ("scores in e2").
 *   · A request to that creator ("Can you make please a video about new speaking strategies?") becomes the topic it asks for.
 *   · The exam / product it is about leads the title (from the question, else from the video it was asked under); the current year ends it.
 *   · Never cut mid-word: a long question keeps its first whole clause, or is left out.
 */
const SMALL_WORDS = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "by", "with", "from", "vs", "as"]);
const titleWords = (s) => String(s).split(/\s+/).filter(Boolean).map((w, i) => (/^[\p{Lu}\d&]{2,6}[?:]?$/u.test(w) || /^\p{L}+\p{Lu}/u.test(w) ? w : i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
export function questionIdea(q, ch, { topics = [], year = new Date().getUTCFullYear(), max = 100 } = {}) {
  if (langOf(q.text) !== ch.code && !(ch.code === "en" && langOf(q.text) === null)) return null;
  if (aboutOthersContent(q.text, q.channel, topics)) return null; // RR-315 D1, shared with the niche summary (RR-316 D1)
  let t = String(q.text).replace(/\s+/g, " ").trim().replace(/[?.!]+$/, "");
  t = t.replace(/^(?:(?:hi|hey|hello|dear|sir|madam|mam|maam|bhai|baji|great video|thank you|thanks)[\s,!.]+)+/i, "").replace(/^(?:i (?:just )?(?:want(?:ed)?|would like) to (?:ask|know)(?: that| if| whether)?|my question is(?: that)?|please tell(?: me)?(?: that| if)?)[\s,:]+/i, "");
  /* a request to the creator → the topic it asks for */
  const ask = /^(?:could|can|would|will) you(?: please| kindly)* (?:make|create|do|upload|share|post|record)(?: please)?\s+(?:(?:a|an|the|some|more)\s+)?(?:(?:full|complete|new)\s+)?(video|videos|course|class|lesson|playlist|series)\s+(?:(?:about|on|for|regarding|of)\s+)?(.+)$/i.exec(t);
  const request = Boolean(ask);
  if (ask) t = /video|lesson/i.test(ask[1]) ? ask[2] : `${ask[2]}: full ${ask[1].toLowerCase()}`;
  t = t.replace(/^(?:we|i) (?:will|would|shall) be able to\b/i, "can you").replace(/^(?:will|would) we be able to\b/i, "can you").replace(/^is it possible to\b/i, "can you")
    .replace(/^(?:i\s+)?(?:may|can|could) (?:i|we) (?:know|ask)(?: that)?\s+/i, "").replace(/^(where|how|what|when|which) (?:i|we) (?:can|should|could|must) (\w+)/i, "$1 to $2");
  /* a leading "In X, in Y," says what it is about: it leads the title */
  let lead = null; const ctx = /^in ([^,]{2,40}),\s*(?:in ([^,]{2,40}),\s*)?(.+)$/i.exec(t);
  if (ctx) { lead = ctx[1]; t = ctx[3]; }
  /* the first whole clause when it is long — never a cut word */
  if (t.length > 70) { const parts = t.split(/,\s+|\s+(?:or|and then|but|so)\s+/i); t = parts[0]; }
  t = spellFix(t);
  if (tokens(t).length < 3 && !request) return null;
  /* a statement is not a question to answer ("I am looking for …") — a title starts with what it asks */
  if (!request && !/^(?:what|how|why|when|where|which|who|whom|whose|can|could|is|are|was|were|do|does|did|will|would|should|shall|may|might|must|has|have|had)\b/i.test(t)) return null;
  const has = (s) => topics.find((x) => new RegExp(`\\b${String(x).split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(s));
  const name = (x) => (String(x).split(/\s+/).find((w) => /^[A-Z]{2,6}$/.test(w)) ?? titleWords(x));
  const about = has(lead ?? "") ?? has(t) ?? has(q.under ?? "");
  const upper = (s) => String(s).replace(/\b(\p{L}{2,6})\b/gu, (w) => (topics.some((x) => name(x) === w.toUpperCase()) ? w.toUpperCase() : w)); // "oet" → "OET"
  const head = lead ? titleWords(upper(lead)) : about && !has(t) ? name(about) : null;
  t = upper(t);
  let body = titleWords(properNames(t));
  if (!request && !/\?$/.test(body)) body = `${body}?`;
  const out = `${head ? `${head}: ` : ""}${body}${/\b20\d\d\b/.test(`${head ?? ""} ${body}`) ? "" : ` (${year})`}`;
  if (out.length > max) return null;
  return { title: out, from: `a viewer's own question: "${q.text}" (${q.source})` };
}

/* ── B1 · from YOUR channel's data ── */
const word = (k) => ({ SHORT: "Shorts", LONG: "long videos" }[k] ?? "videos");
/** topic / place / kind groups that get more views than the channel's other videos — each said with its numbers */
export function ownDataFindings(videos, { now = Date.now(), analytics = null, reach = null, retention = {} } = {}) {
  const out = [], all = videos.filter((v) => Number.isFinite(v.views));
  /* RR-316 B2 (owner's real sign-in: "From YOUR channel's data" showed nothing new): what Google GAVE is always said — even a little, even
   * nothing — and before anything else (a channel of 5 videos stopped here before Google's numbers were looked at) */
  const gave = googleGave(analytics, all);
  if (all.length < 6) return { findings: gave.finding ? [gave.finding] : [], line: `Your channel has ${all.length} videos — too few to compare them with each other yet.${gave.line ? ` ${gave.line}` : ""}` };
  const med = median(all.map((v) => v.views));
  const groups = new Map(); const add = (key, label, v) => { const g = groups.get(key) ?? { label, videos: [] }; g.videos.push(v); groups.set(key, g); };
  for (const v of all) {
    const p = placeIn(`${v.title} ${String(v.description ?? "").split("\n").slice(0, 2).join(" ")}`); if (p) add(`place:${p}`, `${p} videos`, v);
    const f = FORMATS.find((x) => x.re.test(v.title)); if (f) add(`format:${f.id}`, `${f.label} videos`, v);
    /* a title's own words — never an @handle or a #hashtag ("sambhavnasethentertainment" is a tagged channel, not a topic) */
    for (const w of new Set(tokens(String(v.title).replace(/[#@][\p{L}\p{N}_.-]+/gu, " ")).filter((x) => x.length >= 4 && x.length <= 20 && !ENGLISH.has(x) && !ROMAN_HINDUSTANI.has(x) && !/^\d+$/.test(x)))) add(`word:${w}`, `videos with "${w}" in the title`, v);
  }
  for (const [key, g] of groups) {
    if (g.videos.length < 3 || g.videos.length > all.length * 0.6) continue;
    const ids = new Set(g.videos.map((v) => v.videoId));
    const mine = median(g.videos.map((v) => v.views)), others = median(all.filter((v) => !ids.has(v.videoId)).map((v) => v.views));
    const r = ratio(mine, others); if (!r || r < 1.8) continue;
    out.push({ id: key, kind: "topic", effect: Math.round(mine - others), /* about this many more views for one more such video */ line: `Your ${g.label} get ${r >= 10 ? Math.round(r) : r.toFixed(1)}× the views of your other videos (median ${fmt(mine)} against ${fmt(others)}, ${g.videos.length} videos)`,
      advice: `Make more of them — and give your other videos' titles the same clear subject.`, examples: g.videos.slice().sort((a, b) => b.views - a.views).slice(0, 3).map((v) => ({ title: v.title, views: v.views })), from: "your own videos' public view counts, read today" });
  }
  /* keep the strongest few, no two of the same videos */
  const topics = out.sort((a, b) => b.effect - a.effect).filter((x, i, a) => a.findIndex((y) => y.examples[0]?.title === x.examples[0]?.title) === i).slice(0, 4);
  const findings = [...topics];
  /* Shorts vs long */
  const byKind = Object.fromEntries(["SHORT", "LONG"].map((k) => [k, median(all.filter((v) => videoKind(v) === k).map((v) => v.views))]));
  if (byKind.SHORT && byKind.LONG) { const big = byKind.SHORT > byKind.LONG ? "SHORT" : "LONG", small = big === "SHORT" ? "LONG" : "SHORT", r = ratio(byKind[big], byKind[small]); if (r >= 1.5) findings.push({ id: "kind", kind: "kind", effect: Math.round(byKind[big] - byKind[small]), line: `Your ${word(big)} get ${r.toFixed(1)}× the views of your ${word(small)} (median ${fmt(byKind[big])} against ${fmt(byKind[small])})`, advice: `Put more of your time into ${word(big)}.`, from: "your own videos' public view counts, read today" }); }
  /* best length and best day — only videos older than 30 days (a new video has not had its views yet); an estimate, said so */
  const old = all.filter((v) => now - Date.parse(v.publishedAt) > 30 * 864e5);
  const longs = old.filter((v) => videoKind(v) === "LONG" && Number.isFinite(v.durationSec));
  const B = [[0, 480, "under 8 minutes"], [480, 900, "8–15 minutes"], [900, 1800, "15–30 minutes"], [1800, 1e9, "over 30 minutes"]].map(([a, b, l]) => ({ l, xs: longs.filter((v) => v.durationSec >= a && v.durationSec < b) })).filter((x) => x.xs.length >= 5);
  if (B.length >= 2) { const best = B.map((x) => ({ ...x, m: median(x.xs.map((v) => v.views)) })).sort((a, b) => b.m - a.m); const r = ratio(best[0].m, best[1].m); if (r >= 1.3) findings.push({ id: "length", kind: "length", effect: Math.round((best[0].m - best[1].m) / 2), line: `Your long videos of ${best[0].l} do best (median ${fmt(best[0].m)} views, ${best[0].xs.length} videos; next: ${best[1].l}, ${fmt(best[1].m)})`, advice: `Aim for ${best[0].l} — an estimate from your own videos, not a promise.`, from: "your own long videos older than 30 days, their public view counts" }); }
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const D = DAYS.map((d, i) => ({ d, xs: old.filter((v) => new Date(v.publishedAt).getUTCDay() === i) })).filter((x) => x.xs.length >= 5).map((x) => ({ ...x, m: median(x.xs.map((v) => v.views)) })).sort((a, b) => b.m - a.m);
  if (D.length >= 3 && ratio(D[0].m, median(D.map((x) => x.m))) >= 1.3) { const hours = D[0].xs.map((v) => new Date(v.publishedAt).getUTCHours()); const h = median(hours); findings.push({ id: "day", kind: "time", effect: Math.round((D[0].m - median(D.map((x) => x.m))) / 2), line: `Videos you published on a ${D[0].d} got the most views (median ${fmt(D[0].m)}, ${D[0].xs.length} videos) — usually around ${String(Math.round(h)).padStart(2, "0")}:00 UTC`, advice: `Publish on ${D[0].d}s — an estimate from your own videos, not a promise.`, from: "your own videos older than 30 days: the day they went up and their views" }); }
  /* with sign-in: the channel's own analytics */
  if (analytics?.searchTerms?.length) findings.push({ id: "search", kind: "search", effect: Math.round(analytics.searchTerms.slice(0, 8).reduce((n, t) => n + t.views, 0) / 2), line: `Search terms that brought viewers: ${analytics.searchTerms.slice(0, 8).map((t) => `"${t.term}" (${fmt(t.views)})`).join(", ")}`, advice: "Use these exact words in your next titles and descriptions — people already find you with them.", terms: analytics.searchTerms.slice(0, 15).map((t) => t.term), from: `YouTube Analytics — your YouTube searches, ${analytics.window}` });
  if (analytics?.sources?.length) { const tot = analytics.sources.reduce((n, s) => n + s.views, 0); findings.push({ id: "sources", kind: "sources", effect: 0, line: `Where your views come from: ${analytics.sources.slice(0, 4).map((s) => `${SOURCE_WORDS[s.source] ?? s.source} ${Math.round((s.views / tot) * 100)}%`).join(", ")}`, advice: "", from: `YouTube Analytics — traffic sources, ${analytics.window}` }); }
  const early = Object.entries(retention).map(([videoId, pts]) => ({ videoId, v: all.find((x) => x.videoId === videoId), at: pts.find((p) => p.at >= Math.min(0.5, 30 / Math.max(30, (all.find((x) => x.videoId === videoId)?.durationSec ?? 300)))) })).filter((x) => x.v && x.at && x.at.watching < 0.6);
  if (early.length) findings.push({ id: "retention", kind: "retention", effect: Math.round(early.reduce((n, x) => n + x.v.views * (0.6 - x.at.watching), 0)), line: `Videos where viewers leave in the first 30 seconds: ${early.map((x) => `"${x.v.title}" (${Math.round(x.at.watching * 100)}% still watching)`).join(", ")}`, advice: "Open with the best moment: show in the first seconds what the title promises.", from: "YouTube Analytics — audience retention of your top videos" });
  if (reach?.rows?.length) {
    const per = new Map(); for (const r of reach.rows) { const x = per.get(r.videoId) ?? { imp: 0, clicks: 0 }; x.imp += r.impressions; x.clicks += r.impressions * r.ctr; per.set(r.videoId, x); }
    const ctrs = [...per.values()].filter((x) => x.imp >= 200).map((x) => x.clicks / x.imp), medCtr = median(ctrs) ?? 0;
    const gap = [...per.entries()].map(([videoId, x]) => ({ videoId, imp: x.imp, ctr: x.clicks / Math.max(1, x.imp), lost: Math.round(x.imp * Math.max(0, medCtr - x.clicks / Math.max(1, x.imp))) })).filter((x) => x.lost > 0 && x.imp >= 200).sort((a, b) => b.lost - a.lost).slice(0, 5);
    if (gap.length) findings.push({ id: "ctr", kind: "ctr", effect: gap.reduce((n, g) => n + g.lost, 0), line: `Shown a lot, clicked little: ${gap.map((g) => `"${all.find((v) => v.videoId === g.videoId)?.title ?? g.videoId}" — ${fmt(g.imp)} impressions, ${(g.ctr * 100).toFixed(1)}% clicked (your median ${(medCtr * 100).toFixed(1)}%)`).join("; ")}`, advice: "A clearer title and thumbnail text for these first — YouTube already shows them; about " + fmt(gap.reduce((n, g) => n + g.lost, 0)) + " more clicks if they reached your median.", videos: gap.map((g) => g.videoId), from: "YouTube reach report — thumbnail impressions and click-through rate" });
  }
  if (gave.finding) findings.push(gave.finding);
  return { findings: findings.sort((a, b) => b.effect - a.effect), medianViews: med, line: `Compared across your ${fmt(all.length)} videos (median ${fmt(med)} views).${gave.line ? ` ${gave.line}` : ""}` };
}
/** RR-316 B2 · what Google's analytics returned for the signed-in channel, in plain words: the totals, the countries, the sources — or that it returned nothing */
export function googleGave(analytics, all = []) {
  if (!analytics) return { line: null, finding: null };
  if (analytics.byVideo === null && analytics.countries === null && analytics.sources === null) return { line: "Google did not answer for your channel's numbers this time — Visibility asks again on your next visit tomorrow.", finding: null };
  const rows = analytics.byVideo ?? [], views = rows.reduce((n, r) => n + (r.views || 0), 0), minutes = rows.reduce((n, r) => n + (r.minutes || 0), 0);
  const countries = (analytics.countries ?? []).filter((c) => c.views > 0), sources = (analytics.sources ?? []).filter((s) => s.views > 0);
  if (!views && !countries.length && !sources.length) return { line: `Google returned no viewer data yet (${analytics.window ?? "the last 90 days"}) — your channel has very few views.`, finding: null };
  const parts = [`${fmt(views)} view${views === 1 ? "" : "s"}`, Math.round(minutes) === 0 ? "less than a minute watched in all" : `${fmt(Math.round(minutes))} minute${Math.round(minutes) === 1 ? "" : "s"} watched`]; // the owner's real channel: 6 views, "0 minutes"
  if (countries.length) parts.push(`countries: ${countries.slice(0, 5).map((c) => `${c.country} ${fmt(c.views)}`).join(", ")}`);
  if (sources.length) parts.push(`from: ${sources.slice(0, 4).map((s) => `${SOURCE_WORDS[s.source] ?? s.source} ${fmt(s.views)}`).join(", ")}`);
  const top = rows.slice().sort((a, b) => b.views - a.views)[0], topV = top ? all.find((v) => v.videoId === top.videoId) : null;
  return { line: null, finding: { id: "google", kind: "google", effect: 0, line: `What Google gave for your channel (${analytics.window ?? "last 90 days"}): ${parts.join(" · ")}.${views < 100 ? " Few views so far — the numbers are small, but they are your own." : ""}`,
    advice: topV ? `Most watched in that time: "${topV.title}" (${fmt(top.views)} views, ${Math.round(top.avgPct ?? 0)}% watched on average).` : null, examples: [], from: `YouTube Analytics (your own channel, signed in), ${analytics.on ?? "today"}` } };
}
const SOURCE_WORDS = { YT_SEARCH: "YouTube search", SUBSCRIBER: "your subscribers' feeds", RELATED_VIDEO: "suggested next to other videos", EXT_URL: "other websites", BROWSE: "the YouTube home page", NO_LINK_OTHER: "direct or unknown", SHORTS: "the Shorts feed", PLAYLIST: "playlists", NOTIFICATION: "notifications", YT_CHANNEL: "your channel page", YT_OTHER_PAGE: "other YouTube pages" };

/* ── C2 · competitors ── */
export function scorecard(channel, videos, now = Date.now()) {
  const recent = videos.filter((v) => now - Date.parse(v.publishedAt) <= 90 * 864e5);
  const last20 = videos.slice().sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 20);
  const words = new Map(); for (const v of last20) for (const w of new Set(tokens(v.title).filter((x) => x.length >= 4 && !ENGLISH.has(x) && !ROMAN_HINDUSTANI.has(x)))) words.set(w, (words.get(w) ?? 0) + 1);
  const share = (re) => Math.round((last20.filter((v) => re.test(v.title)).length / Math.max(1, last20.length)) * 100);
  return { title: channel.title, handle: channel.handle ?? null, channelId: channel.channelId, uploadsPerWeek: +(recent.length / 13).toFixed(1), lastUpload: last20[0]?.publishedAt?.slice(0, 10) ?? null,
    medianViews: median(last20.map((v) => v.views)), topTopics: [...words.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w),
    patterns: { avgLength: Math.round(median(last20.map((v) => String(v.title).length)) ?? 0), emoji: share(/\p{Extended_Pictographic}/u), pipe: share(/\|/), number: share(/\d/) },
    best: last20.slice().sort((a, b) => b.views - a.views)[0] ?? null };
}
export const newUploads = (seen = [], videos = []) => videos.filter((v) => !seen.includes(v.videoId)).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
/** channels the niche research found that speak the channel's language — suggested, ranked by how often they came up and their views */
export function suggestCompetitors(research, ownChannelId, ch) {
  const m = new Map();
  for (const r of research?.niche ?? []) for (const v of r.videos ?? []) { if (!v.channelId || v.channelId === ownChannelId || !sameLanguage(v, ch)) continue; const x = m.get(v.channelId) ?? { channelId: v.channelId, title: v.channelTitle, hits: 0, views: 0, examples: [] }; x.hits++; x.views += v.views; if (x.examples.length < 2) x.examples.push(v.title); m.set(v.channelId, x); }
  return [...m.values()].sort((a, b) => b.hits - a.hits || b.views - a.views).slice(0, 8);
}

/* ── C3 · keyword ideas with an honest demand ESTIMATE ── */
export function keywordIdeas(research, terms, now = Date.now(), ch = null) {
  const vids = (research?.niche ?? []).flatMap((r) => r.videos ?? []).filter((v, i, a) => a.findIndex((x) => x.videoId === v.videoId) === i).filter((v) => !ch || sameLanguage(v, ch));
  return terms.map((t) => {
    const want = tokens(t.phrase ?? t); const hit = vids.filter((v) => { const vt = new Set(tokens(`${v.title} ${(v.tags ?? []).join(" ")}`)); return want.every((w) => vt.has(w)); });
    return { phrase: t.display ?? t.phrase ?? t, videos: hit.length, medianViews: median(hit.map((v) => v.views)), recent: hit.filter((v) => now - Date.parse(v.publishedAt) <= 30 * 864e5).length,
      estimate: hit.length ? `estimate: ${hit.length} matching videos in your niche research, median ${fmt(median(hit.map((v) => v.views)))} views, ${hit.filter((v) => now - Date.parse(v.publishedAt) <= 30 * 864e5).length} of them from the last 30 days` : "estimate: no matching video in your niche research yet", source: t.sources?.[0] ?? t.from ?? "your niche research" };
  }).filter((k) => k.videos > 0).sort((a, b) => (b.medianViews ?? 0) * Math.sqrt(b.videos) - (a.medianViews ?? 0) * Math.sqrt(a.videos));
}

/*
 * ── RR-315 D3 · keyword ideas a client can USE (owner, on an exam channel: "linguamarina", "Skills PTE Academic nakul", "PTE 2025") ──
 *   · never a channel's or a creator's name: a phrase holding every name word of a channel of the research, or only words of a channel's
 *     title with a name word among them (a name word = not the niche's own topic, not a common word such as "academic" or "test");
 *     a word that is only ever said in ONE channel's own titles (a creator's own name) is a name word too;
 *   · the current year: "PTE 2025" becomes "PTE 2026" in 2026 — unless that phrase came from real searches (a search-data file);
 *   · near-duplicates merged ("PTE Skills Academic" = "Skills PTE Academic"; "TOEFL prep" = "TOEFL preparation").
 */
const LIGHT = new Set(["the", "with", "and", "of", "by", "for", "your", "my", "our", "a", "an"]);
const searched = (t) => /your file|search console|searches that brought|search terms/i.test(String(t.sources?.[0] ?? t.from ?? ""));
export function currentYearTerms(terms, year) {
  return terms.map((t) => { if (searched(t)) return t; const fix = (s) => String(s ?? "").replace(/\b(20[12]\d)\b/g, (y) => (Number(y) < year ? String(year) : y)); return { ...t, phrase: fix(t.phrase), ...(t.display ? { display: fix(t.display) } : {}) }; });
}
export function usableKeywords(keywords, research, topics = []) {
  const topicWords = new Set(topics.flatMap((t) => String(t).toLowerCase().split(/\s+/)));
  const vids = (research?.niche ?? []).flatMap((r) => r.videos ?? []);
  const chans = [...new Set([...vids.map((v) => v.channelTitle), ...(research?.comments ?? []).map((c) => c.channelTitle)].filter(Boolean))];
  /* words said in ONE channel's titles and tags only, never elsewhere — a creator's own name ("nakul" is in one channel's tags) */
  const byWord = new Map(); for (const v of vids) for (const w of new Set(`${v.title} ${(v.tags ?? []).join(" ")}`.toLowerCase().split(/[^\p{L}\p{N}]+/u))) { if (!byWord.has(w)) byWord.set(w, new Set()); byWord.get(w).add(v.channelTitle); }
  const words = (s) => String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const isName = (phrase) => { const ws = words(phrase);
    for (const c of chans) { const all = words(c).filter((w) => !LIGHT.has(w)), nm = nameTokensOf(c, topicWords); if (!nm.length) continue;
      if (all.every((w) => ws.includes(w))) return true; // the channel's whole name ("Skills PTE Academic", "linguamarina")
      if (ws.every((w) => all.includes(w)) && ws.some((w) => nm.includes(w))) return true;
      /* the channel's words run together, as in its hashtag ("skillspte") */
      const glued = words(c); if (ws.length === 1) for (let i = 0; i < glued.length; i++) for (let j = i + 2; j <= glued.length; j++) if (glued.slice(i, j).join("") === ws[0]) return true;
      /* the channel's name word with a word only THAT channel says in its titles ("Skills PTE nakul" — its presenter's name) */
      if (ws.some((w) => nm.includes(w)) && ws.some((w) => !topicWords.has(w) && !nm.includes(w) && w.length >= 4 && byWord.get(w)?.size === 1 && byWord.get(w).has(c))) return true; }
    /* a word only ONE channel says in its titles, and its own name holds it */
    return ws.some((w) => !topicWords.has(w) && !NAME_STOP.has(w) && w.length >= 4 && byWord.get(w)?.size === 1 && words([...byWord.get(w)][0]).includes(w)); };
  const SAME = { prep: "preparation", tips: "tip", tests: "test", exams: "exam", videos: "video" };
  const key = (p) => words(p).map((w) => SAME[w] ?? w).filter((w) => !/^20\d\d$/.test(w)).sort().join(" ");
  const seen = new Set(), out = [];
  for (const k of keywords) { if (isName(k.phrase)) continue; const kk = key(k.phrase); if (seen.has(kk)) continue; seen.add(kk); out.push(k); }
  return out;
}

/* ── A1 · chapters from the video's own captions, with the real times ── */
export function parseVtt(text) {
  const cues = [];
  for (const block of String(text ?? "").replace(/\r/g, "").split(/\n\n+/)) {
    const m = /(\d{1,2}:)?(\d{1,2}):(\d{2})[.,]\d{3}\s+-->\s+(\d{1,2}:)?(\d{1,2}):(\d{2})[.,]\d{3}/.exec(block); if (!m) continue;
    const sec = (h, mm, ss) => (h ? Number(h.slice(0, -1)) * 3600 : 0) + Number(mm) * 60 + Number(ss);
    const words = block.split("\n").slice(block.split("\n").findIndex((l) => l.includes("-->")) + 1).join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (words) cues.push({ start: sec(m[1], m[2], m[3]), end: sec(m[4], m[5], m[6]), text: words });
  }
  return cues;
}
const stamp = (s) => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
/** 3–8 chapters at the caption boundary nearest each even part; each titled with the first words said there (the client edits them) */
export function chaptersFrom(cues, durationSec) {
  if (!cues.length || !(durationSec >= 60)) return null;
  const n = Math.max(3, Math.min(8, Math.round(durationSec / 150)));
  const out = [];
  for (let i = 0; i < n; i++) {
    const target = (durationSec * i) / n; const c = i === 0 ? { start: 0, text: cues[0].text } : cues.slice().sort((a, b) => Math.abs(a.start - target) - Math.abs(b.start - target))[0];
    if (out.length && c.start - out[out.length - 1].at < 10) continue;
    const t = spellFix(c.text.split(/\s+/).slice(0, 6).join(" ").replace(/[,.;:!?]+$/, ""));
    out.push({ at: Math.floor(c.start), line: `${stamp(i === 0 ? 0 : c.start)} ${i === 0 ? "Intro — " : ""}${t.charAt(0).toUpperCase()}${t.slice(1)}` });
  }
  return out.length >= 3 ? { text: out.map((x) => x.line).join("\n"), from: "your video's own captions — the real times; each chapter named with the first words said there (edit them if you like)" } : null;
}

/* ── D4 · before → after of every change applied to YouTube ── */
export function beforeAfter(changes, { daily = {}, reach = null, now = Date.now() } = {}) {
  return changes.map((c) => {
    const at = Date.parse(c.on), days = Math.floor((now - at) / 864e5);
    const d = daily[c.videoId] ?? [];
    const avg = (from, to) => { const xs = d.filter((x) => { const t = Date.parse(x.day); return t >= from && t < to; }).map((x) => x.views); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
    const span = Math.min(14, days);
    const before = avg(at - 14 * 864e5, at), after = span >= 1 ? avg(at, at + span * 864e5) : null;
    const rr = (reach?.rows ?? []).filter((r) => r.videoId === c.videoId);
    const ctr = (from, to) => { const xs = rr.filter((r) => { const t = Date.parse(r.day); return t >= from && t < to; }); const imp = xs.reduce((n, r) => n + r.impressions, 0); return imp ? { imp, ctr: xs.reduce((n, r) => n + r.impressions * r.ctr, 0) / imp } : null; };
    const b = before === null ? null : Math.round(before), aft = after === null ? null : Math.round(after);
    return { ...c, days, perDayBefore: b, perDayAfter: aft, ctrBefore: ctr(at - 14 * 864e5, at), ctrAfter: span >= 1 ? ctr(at, at + span * 864e5) : null,
      line: before === null ? "Sign in to YouTube to measure the views per day before and after." : after === null ? "Applied today — the first day after is measured tomorrow." : `Views per day: ${fmt(b)} in the 14 days before → ${fmt(aft)} in the ${span} day${span === 1 ? "" : "s"} after` };
  });
}
