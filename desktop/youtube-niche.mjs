/**
 * 🔴 RR-308 A · YOUTUBE NICHE RESEARCH FIRST (owner, 21 Oct 2026: "is ko ek general search karni chahiye thi ke daily life vlog mein log kya
 * dekhna chahte hain"). PURE: it reads what it is handed and fetches nothing — the reads are made by desktop/youtube-app.mjs through the
 * official YouTube Data API only, inside Visibility's daily cap. Never a youtube.com or Google page.
 *   · THE NICHE comes from the channel's OWN content: the tags its own videos use most, the phrases of its own description ("family vlogs,
 *     daily routines"), the product's own words — short phrases people search (1–3 words), never a long sentence; junk ("full episode",
 *     "episode today", "#viral") is dropped. Who the channel is ("Pakistani mom") and where ("Denmark", "Iceland") are read the same way.
 *   · THE SUMMARY ("What viewers of <niche> watch most") is counted from the niche's top and rising videos: the formats that do best (day in
 *     my life, grocery haul, routine, travel …) with their median views, the title patterns, typical length, Shorts vs long, and what viewers
 *     ask and praise in comments — every line with its examples and its source (the search, the date).
 * No views, reach or earnings are predicted; every number is a count of what was read.
 */
import { tokens, questionsIn, autoTopics } from "./youtube-advice.mjs";
import { videoKind } from "../src/video/youtube.mjs";

/* words that make a phrase junk for research (the owner's examples: "full episode", "episode today") */
export const JUNK_WORDS = new Set(["episode", "episodes", "full", "today", "part", "new", "latest", "viral", "trending", "fyp", "fypシ", "shorts", "short", "shortsfeed", "shortvideo", "subscribe", "like", "share", "comment", "video", "videos", "reels", "status", "song", "songs", "lyrics", "movie", "official", "live", "2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027"]);
/* the formats viewers look for — matched in a video's own title and first description lines, never its tags (English and Roman Urdu/Hindi words) */
export const FORMATS = Object.freeze([
  { id: "day-in-life", title: "A Day in My Life", label: "Day in my life", re: /\bday in (?:my|the|our) life\b|\bdayinmylife\b|\bdin bhar\b/i },
  { id: "morning-routine", title: "Morning Routine", label: "Morning routine", re: /\bmorning routine\b|\bsubah\b/i },
  { id: "night-routine", title: "Night Routine", label: "Night routine", re: /\bnight routine\b|\bevening routine\b|\braat\b/i },
  { id: "routine", title: "Daily Routine", label: "Daily routine", re: /\bdaily routine\b|(?<!morning |night |evening )\broutine\b|\bmamool\b/i },
  { id: "grocery", title: "Grocery Haul", label: "Grocery haul", re: /\bgrocery\b|\bgroceries\b|\bsupermarket\b|\bhaul\b|\bsauda\b/i },
  { id: "cost-of-living", title: "Cost of Living", label: "Cost of living", re: /\bcost of living\b|\bexpenses?\b|\bkharch[ae]?\b|\bbudget\b|\bsalary\b|\bprices?\b/i },
  { id: "cleaning", title: "Cleaning Routine", label: "Cleaning", re: /\bclean(?:ing)?\b|\bsafai\b|\borganiz(?:e|ing|ation)\b|\bdeclutter/i },
  { id: "cooking", label: "Cooking", re: /\bcook(?:ing)?\b|\brecipe\b|\bkhana\b|\bdinner\b|\blunch\b|\bbreakfast\b|\bnashta\b|\bbiryani\b|\bkitchen\b/i },
  { id: "travel", label: "Travel", re: /\btravel(?:l?ing)?\b|\btrip\b|\bsafar\b|\broad trip\b|\bholiday\b|\bvacation\b|\btour\b/i },
  { id: "shopping", label: "Shopping", re: /\bshopping\b|\bmall\b|\bbazaar\b|\bmarket\b/i },
  { id: "home-tour", title: "House Tour", label: "House tour", re: /\bhouse tour\b|\bhome tour\b|\bghar\b|\bapartment\b/i },
  { id: "festival", label: "Eid / Ramadan / festivals", re: /\beid\b|\bramadan\b|\bramzan\b|\biftar\b|\bsehri\b|\bchristmas\b|\bdiwali\b|\bnew year\b/i },
  { id: "family-event", label: "Family events (birthday, wedding)", re: /\bbirthday\b|\bwedding\b|\bshadi\b|\bmehndi\b|\banniversary\b|\bbaby shower\b/i },
  { id: "kids", label: "Kids and parenting", re: /\bkids?\b|\bbaby\b|\bbachay\b|\bbache\b|\bdaughter\b|\bson\b|\bnewborn\b|\bschool\b|\bparenting\b/i },
  { id: "couple", label: "Husband and wife", re: /\bhusband\b|\bwife\b|\bcouple\b|\bmiyan biwi\b|\bshohar\b/i },
  { id: "life-abroad", label: "Life abroad", re: /\blife in\b|\bliving in\b|\babroad\b|\boverseas\b|\bpardes\b|\bmoving to\b|\bimmigrant\b/i },
  { id: "first-time", label: "First time / trying something", re: /\bfirst time\b|\btrying\b|\btried\b|\breaction\b/i },
  { id: "qa", title: "Q&A", label: "Q&A and answers to viewers", re: /\bq ?& ?a\b|\bq and a\b|\bquestions?\b|\bsawal\b|\bfaq\b/i },
  { id: "skincare", label: "Self-care and skincare", re: /\bskin ?care\b|\bself ?care\b|\bmakeup\b|\bgrwm\b|\bget ready with me\b/i },
  { id: "weekend", title: "Weekend Vlog", label: "Weekend vlog", re: /\bweekend\b|\bsunday\b|\bsaturday\b/i },
]);
/* countries and the large cities people name in titles — a place is a place only when one of these is written */
export const PLACES = Object.freeze(("Afghanistan Albania Algeria Argentina Australia Austria Bahrain Bangladesh Belgium Brazil Bulgaria Canada Chile China Colombia Croatia Cyprus Czechia Denmark Egypt England Estonia Finland France Germany Greece Hungary Iceland India Indonesia Iran Iraq Ireland Italy Japan Jordan Kenya Korea Kuwait Latvia Lebanon Lithuania Luxembourg Malaysia Maldives Malta Mexico Morocco Nepal Netherlands Holland Nigeria Norway Oman Pakistan Philippines Poland Portugal Qatar Romania Russia Saudi Scotland Serbia Singapore Slovakia Slovenia Spain Sweden Switzerland Thailand Turkey Türkiye UAE Dubai Ukraine UK USA America Wales Vietnam Scandinavia Europe " +
  "Copenhagen Aarhus Odense Aalborg Reykjavik Oslo Bergen Stockholm Gothenburg Malmo Helsinki London Manchester Birmingham Glasgow Dublin Paris Berlin Hamburg Munich Amsterdam Rotterdam Brussels Madrid Barcelona Rome Milan Vienna Zurich Geneva Prague Warsaw Istanbul Toronto Vancouver Montreal Sydney Melbourne Brisbane Perth Auckland Riyadh Jeddah Makkah Madinah Doha Muscat Lahore Karachi Islamabad Rawalpindi Peshawar Multan Faisalabad Sialkot Quetta Delhi Mumbai Dhaka Kabul Tokyo Seoul Bangkok").split(" "));
const PLACE_BY = new Map(PLACES.map((p) => [p.toLowerCase(), p]));
const ADJ_PLACE = new Map(Object.entries({ danish: "Denmark", icelandic: "Iceland", norwegian: "Norway", swedish: "Sweden", finnish: "Finland", pakistani: "Pakistan", indian: "India", british: "UK", american: "USA", canadian: "Canada", german: "Germany", dutch: "Netherlands", turkish: "Turkey", arab: null }));
const ROLE = /\b(mom|mum|mother|mama|ammi|dad|father|papa|family|couple|wife|husband|student|nurse|doctor|teacher|housewife|homemaker|vlogger|girl|boy|woman|man|immigrant|expat)s?\b/i;
const NICHE_WORD = /\b(vlogs?|vlogger|life|lifestyle|living|family|home|diaries|diary|tips|guide|how to|tutorial|review|explained|prep|practice|exam|course|lessons?)\b/i;
const day = (d) => String(d ?? "").slice(0, 10);
const median = (xs) => { const s = xs.filter(Number.isFinite).slice().sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2)) : null; };
const fmt = (n) => (n === null || n === undefined ? "?" : Number(n).toLocaleString("en-US"));
const textOf = (v) => `${v.title} ${String(v.description ?? "").split("\n").filter((l) => l.trim()).slice(0, 2).join(" ")}`;
export const formatsOf = (v) => FORMATS.filter((f) => f.re.test(textOf(v))).map((f) => f.id);
/* a phrase worth searching: 1–3 meaning words, no junk word, not the channel's own name, not a person's name the channel tags once */
const goodPhrase = (p, own) => {
  const t = tokens(p), raw = String(p).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  /* junk is checked on the RAW words too ("shorts" is a filler word the tokenizer drops), and a word that hides the channel's own name
   * ("dhanakvlogs") is the channel, not its niche */
  return t.length >= 1 && t.length <= 3 && raw.length <= 4 && !raw.some((w) => JUNK_WORDS.has(w) || [...own].some((o) => o.length >= 4 && w.includes(o))) && !t.some((w) => own.has(w)) && !/[#@]/.test(p) && String(p).length <= 40;
};
const tidy = (p) => String(p).toLowerCase().replace(/[#@][\p{L}\p{N}_]+/gu, " ").replace(/[^\p{L}\p{N}' -]+/gu, " ").replace(/\s+/g, " ").trim();

/** Who and where the channel is — read from its own description, tags and titles (never guessed). */
export function personaOf({ channel = {}, videos = [], product = {} }) {
  const desc = `${channel.description ?? ""}\n${product.what ?? ""}`;
  const m = /\b(?:i am|i'm|i’m|we are|we're|we’re)\s+(?:an?\s+|the\s+)?([^.,!?\n]{3,40}?)(?=\s+(?:living|based|from|who|in|sharing|and)\b|[.,!?\n])/i.exec(desc);
  let who = m && ROLE.test(m[1]) ? m[1].trim() : null;
  if (!who) {
    const counts = new Map();
    for (const v of videos) for (const t of v.tags ?? []) { const p = tidy(t); if (ROLE.test(p) && tokens(p).length >= 2 && tokens(p).length <= 3) counts.set(p, (counts.get(p) ?? 0) + 1); }
    who = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  const placeCount = new Map();
  const addPlaces = (text, w) => { for (const word of String(text).split(/[^\p{L}]+/u)) { const k = word.toLowerCase(); const p = PLACE_BY.get(k) ?? (ADJ_PLACE.get(k) && !who?.toLowerCase().includes(k) ? ADJ_PLACE.get(k) : null); if (p) placeCount.set(p, (placeCount.get(p) ?? 0) + w); } };
  addPlaces(desc, 5);
  for (const v of videos) addPlaces(`${v.title} ${(v.tags ?? []).join(" ")}`, 1);
  const places = [...placeCount.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).map(([p]) => p).slice(0, 4);
  const titleCase = (s) => String(s).split(" ").map((w) => (w.length > 2 || /^[A-Z]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
  return Object.freeze({ who: who ? titleCase(who) : null, places, whoFrom: who ? (m ? "your channel's description" : "the tags your own videos use most") : null });
}
export const placeIn = (text) => { for (const word of String(text).split(/[^\p{L}]+/u)) { const p = PLACE_BY.get(word.toLowerCase()); if (p) return p; } return null; };

/**
 * A1 + A3 · the channel's NICHE from its own content: short phrases, each with how many of the channel's own videos use it.
 * Returns { label, queries:[{ q, videos, from }], persona } — `queries` are what the research searches (at most `max`).
 */
export function nicheOf({ channel = {}, videos = [], product = {}, max = 4 }) {
  /* the channel's OWN NAME is not its niche — but only its distinctive words are: "Dhanak", "Duniya" yes; "Mom" in "Mom Diaries" is a
   * niche word and stays (its "mom vlog" is what viewers search); a phrase that is only the name ("mom diaries"), or glues it ("momdiaries"), never */
  const nameWords = [...tokens(channel.title), ...tokens(channel.handle), ...tokens(product.name)];
  const own = new Set(nameWords.filter((w) => !ROLE.test(w) && !NICHE_WORD.test(w) && !FORMATS.some((f) => f.re.test(w)) && !PLACE_BY.has(w) && !ADJ_PLACE.has(w)));
  const glued = [String(channel.title ?? ""), String(product.name ?? ""), String(channel.handle ?? "")].map((s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")).filter((s) => s.length >= 5);
  const nameSet = new Set(nameWords);
  const counts = new Map();
  const add = (phrase, vid, from) => { const p = tidy(phrase); if (!goodPhrase(p, own) || glued.some((g) => p.replace(/[^\p{L}\p{N}]+/gu, "").includes(g)) || p.split(/\s+/).filter((w) => !/^(in|my|the|a|an|of|ki|ka|ke)$/.test(w)).every((w) => nameSet.has(w))) return; const k = tokens(p).join(" "); const x = counts.get(k) ?? { display: p, videos: new Set(), from: new Set(), weight: 0 }; if (vid) x.videos.add(vid); x.from.add(from); counts.set(k, x); };
  for (const v of videos) for (const t of v.tags ?? []) add(t, v.videoId, "the tags your own videos use");
  for (const v of videos) for (const h of [...String(`${v.title} ${v.description ?? ""}`).matchAll(/#([\p{L}\p{N}_]{3,30})/gu)].map((x) => x[1])) add(h.replace(/([a-z])([A-Z])/g, "$1 $2"), v.videoId, "the hashtags your own videos use");
  /* the channel's own description and the product's own words: each clause of 1–3 meaning words */
  /* (the channel's own name is taken out of a clause first — "videos about AlmiWorld's language exam preparation" → "language exam preparation") */
  for (const chunk of `${channel.description ?? ""}\n${product.what ?? ""}`.split(/[\n,;:.!|•—–()/]|\band\b|\bwith\b/i)) { const rest = String(chunk).trim().split(/\s+/).filter((w) => { const k = tokens(w)[0]; return !k || !own.has(k.replace(/s$/, "")) && !own.has(k); }).join(" ").replace(/^(videos?|vlogs?|about|of|on|for)\s+/i, "").replace(/^(videos?|vlogs?|about|of|on|for)\s+/i, ""); const t = tokens(rest); if (t.length >= 1 && t.length <= 3) add(rest, null, "your channel's description"); }
  /* a channel with few videos or no tags (AlmiWorld: 5 videos, no tags): the product's short names with the word its own titles put after
   * them ("CV builder", "IELTS coaching") — RR-307's topic finder — each counted against the channel's own titles */
  for (const t of autoTopics({ what: product.what, names: [channel.title, channel.handle, product.name], ownTitles: videos.map((v) => v.title) })) {
    const w = String(t).toLowerCase().split(/\s+/);
    const n = videos.filter((v) => w.every((x) => ` ${String(v.title).toLowerCase()} `.includes(x))).map((v) => v.videoId);
    if (w.length >= 2 && w.length <= 3) { add(t, null, "your product's own words and your video titles"); const x = counts.get(tokens(tidy(t)).join(" ")); if (x) for (const id of n) x.videos.add(id); }
  }
  const n = Math.max(1, videos.length);
  const ranked = [...counts.values()].map((x) => ({ ...x, count: x.videos.size, score: x.videos.size / n + (x.from.has("your channel's description") ? 0.08 : 0) + (tokens(x.display).length >= 2 ? 0.02 : 0) }))
    .filter((x) => x.count >= Math.max(2, Math.round(n * 0.01)) || x.from.has("your channel's description") || (x.from.has("your product's own words and your video titles") && x.count >= 1))
    /* a search needs 2–3 words: one word alone ("cooking", "vlogger") finds the whole world, not this niche */
    .filter((x) => String(x.display).split(/\s+/).filter((w) => !/^(in|my|the|a|an|of|to|and|for|with|on|at|our|your)$/i.test(w)).length >= 2)
    /* a niche phrase says WHAT or WHO or WHERE — a format, a role (mom, family), a place, vlog/life — or the channel says it about itself;
     * two words that are only a name the channel tags ("saba ibrahim") are not a niche */
    .filter((x) => x.from.has("your channel's description") || x.from.has("your product's own words and your video titles") || NICHE_WORD.test(x.display) || ROLE.test(x.display) || FORMATS.some((f) => f.re.test(x.display)) || String(x.display).split(/[^\p{L}]+/u).some((w) => PLACE_BY.has(w.toLowerCase()) || ADJ_PLACE.has(w.toLowerCase())))
    .sort((a, b) => b.score - a.score);
  const picked = [];
  for (const x of ranked) { const t = new Set(tokens(x.display)); if (picked.some((p) => { const u = tokens(p.display); return u.every((w) => t.has(w)) || [...t].every((w) => u.includes(w)); })) continue; picked.push(x); if (picked.length >= 8) break; }
  const persona = personaOf({ channel, videos, product });
  /* the first search says who and where, in the channel's own words ("pakistani mom in denmark") — the niche at its most exact */
  const exact = persona.who && persona.places[0] && persona.whoFrom === "your channel's description" ? [Object.freeze({ q: `${persona.who} in ${persona.places[0]}`.toLowerCase(), videos: 0, from: "your channel's description (who you are and where)" })] : [];
  const queries = [...exact, ...picked.slice(0, max - exact.length).map((x) => Object.freeze({ q: x.display, videos: x.count, from: `${[...x.from].join(" and ")}${x.count ? ` — ${x.count} of your ${videos.length} videos` : ""}` }))];
  return Object.freeze({ label: queries.slice(0, 3).map((x) => x.q).join(" · ") || null, queries, more: picked.slice(max).map((x) => x.display), persona });
}

/* a search result counts for the niche only when it is ABOUT the search: it names the search's own words (a place, a role, a topic) — the
 * giant clips YouTube also returns ("Roz lunch …", 350 million views) are left out. Words every vlog has decide nothing. */
const GENERIC = new Set(["vlog", "vlogs", "vlogger", "life", "lifestyle", "daily", "day", "my", "in", "the", "a", "of", "and", "family", "video", "videos"]);
export function onTopic(v, q) {
  const words = String(q).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const distinct = words.filter((w) => !GENERIC.has(w));
  const text = ` ${`${v.title} ${String(v.description ?? "").slice(0, 600)} ${(v.tags ?? []).join(" ")}`.toLowerCase()} `;
  const has = (w) => new RegExp(`[^\\p{L}\\p{N}]${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u").test(text);
  return distinct.length ? distinct.filter(has).length >= Math.min(2, distinct.length) : words.every(has);
}

const PRAISE =/\b(love|loved|lovely|beautiful|amazing|great|best|nice|good|wow|mashallah|masha allah|subhanallah|inspir\w*|cute|thank\w*|helpful|bohat acha|bahut accha|zabardast|kamaal)\b/i;

/**
 * A1 · "What viewers of <niche> watch most" — counted from the niche research (`research.niche`: each search's top or rising videos) and the
 * comments read under them. `own` = the channel's own videos (to say which formats it has not covered). Every line names its source.
 */
export function nicheSummary({ niche, research, own = [], ownChannelId = null }) {
  const runs = research?.niche ?? [];
  if (!runs.length) return null;
  const readOn = day(research.readOn);
  const seen = new Map();
  for (const r of runs) for (const v of r.videos ?? []) if (v.channelId !== ownChannelId && !seen.has(v.videoId)) seen.set(v.videoId, { ...v, q: r.q, kind: r.kind });
  const vids = [...seen.values()];
  if (!vids.length) return Object.freeze({ title: `What viewers of ${niche.label} watch most`, lines: [], videos: 0, readOn, empty: `YouTube found no videos for ${runs.map((r) => `"${r.q}"`).join(", ")} on ${readOn}.` });
  const src = `YouTube search ${[...new Set(runs.map((r) => `"${r.q}"`))].join(", ")} — top and rising videos, read ${readOn}`;
  const ex = (v) => ({ title: v.title, channel: v.channelTitle, views: v.views, publishedAt: day(v.publishedAt), videoId: v.videoId });
  /* formats: how many of the niche's videos use each, their median views, and how many of the channel's own videos do */
  /* a format's words for a title: its own phrase, else the word the niche's best video of that format uses ("Eid", "Birthday") */
  const wordOf = (f, xs) => f.title ?? (xs[0] ? String(f.re.exec(textOf(xs[0]))?.[0] ?? f.label).replace(/^\w/, (c) => c.toUpperCase()) : f.label);
  const formats = FORMATS.map((f) => { const xs = vids.filter((v) => f.re.test(textOf(v))).sort((a, b) => b.views - a.views); return { id: f.id, label: f.label, title: wordOf(f, xs), count: xs.length, medianViews: median(xs.map((v) => v.views)), examples: xs.sort((a, b) => b.views - a.views).slice(0, 2).map(ex), own: own.filter((v) => f.re.test(textOf(v))).length }; })
    .filter((f) => f.count >= 2).sort((a, b) => (b.medianViews ?? 0) * Math.sqrt(b.count) - (a.medianViews ?? 0) * Math.sqrt(a.count));
  /* title patterns */
  const share = (pred) => Math.round((vids.filter(pred).length / vids.length) * 100);
  const patterns = [
    { line: `${share((v) => placeIn(v.title))}% name a place (a country or city)`, pct: share((v) => placeIn(v.title)) },
    { line: `${share((v) => /\|/.test(v.title))}% use "|" to split the title in two parts`, pct: share((v) => /\|/.test(v.title)) },
    { line: `${share((v) => /\d/.test(v.title))}% have a number`, pct: share((v) => /\d/.test(v.title)) },
    { line: `${share((v) => /\p{Extended_Pictographic}/u.test(v.title))}% have an emoji`, pct: share((v) => /\p{Extended_Pictographic}/u.test(v.title)) },
    { line: `${share((v) => /\?/.test(v.title))}% ask a question`, pct: share((v) => /\?/.test(v.title)) },
  ].sort((a, b) => b.pct - a.pct);
  const titleLen = median(vids.map((v) => String(v.title).length));
  /* length: Shorts vs long */
  const shorts = vids.filter((v) => videoKind(v) === "SHORT"), long = vids.filter((v) => videoKind(v) === "LONG");
  const longMin = median(long.map((v) => v.durationSec)) === null ? null : Math.round(median(long.map((v) => v.durationSec)) / 60);
  /* comments under the niche's videos: what viewers ask and what they praise */
  const comments = (research.comments ?? []).filter((c) => !c.own);
  /* a viewer's question counts only when it is about the niche: it names one of its formats or shares a word with its phrases */
  const nicheWords = new Set((niche.queries ?? []).flatMap((q) => tokens(q.q)));
  /* a real question, about the niche, worth showing: 4+ words, no swearing */
  const RUDE = /\b(wtf|f+u+c+k\w*|shit\w*|damn|stfu|idiot|stupid)\b/i;
  const about = (q) => q.split(/\s+/).length >= 4 && !RUDE.test(q) && (FORMATS.some((f) => f.re.test(q)) || tokens(q).some((w) => nicheWords.has(w)));
  const asks = [...new Map(comments.flatMap((c) => questionsIn(c.text).filter(about).map((q) => [q.toLowerCase(), { text: q, likes: c.likes ?? 0, under: c.videoTitle, on: day(c.publishedAt) }]))).values()].sort((a, b) => b.likes - a.likes).slice(0, 6);
  const praise = new Map();
  for (const c of comments) for (const f of FORMATS) if (PRAISE.test(c.text) && f.re.test(c.text)) praise.set(f.label, (praise.get(f.label) ?? 0) + 1);
  const lines = [];
  if (formats.length) lines.push({ what: "Formats that do best", line: formats.slice(0, 5).map((f) => `${f.label} (${f.count} videos, median ${fmt(f.medianViews)} views)`).join(" · "), examples: formats.slice(0, 3).flatMap((f) => f.examples.slice(0, 1)), from: src });
  lines.push({ what: "Title patterns", line: `${patterns.slice(0, 3).map((p) => p.line).join("; ")}. Typical title: ${titleLen} characters.`, examples: vids.slice().sort((a, b) => b.views - a.views).slice(0, 3).map(ex), from: src });
  lines.push({ what: "Length", line: `${shorts.length} Shorts and ${long.length} long videos among the ${vids.length} read${long.length ? `; long ones are typically ${longMin} minutes` : ""}. Median views: Shorts ${fmt(median(shorts.map((v) => v.views)))}, long ${fmt(median(long.map((v) => v.views)))}.`, from: src });
  if (asks.length) lines.push({ what: "What viewers ask", line: asks.slice(0, 4).map((q) => `"${q.text}"`).join(" · "), from: `comments under the niche's top videos, read ${readOn}` });
  if (praise.size) lines.push({ what: "What viewers praise", line: [...praise.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} (${n} comments)`).join(" · "), from: `comments under the niche's top videos, read ${readOn}` });
  return Object.freeze({ title: `What viewers of ${niche.label} watch most`, readOn, videos: vids.length, lines, formats, asks, longMinutes: longMin, shortsShare: Math.round((shorts.length / vids.length) * 100), medianViews: { shorts: median(shorts.map((v) => v.views)), long: median(long.map((v) => v.views)) }, source: src });
}
