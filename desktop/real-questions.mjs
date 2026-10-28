/**
 * 🔴 RR-330 · THE QUESTIONS PEOPLE REALLY ASK (owner, 27 Oct 2026: "wo questions chahiyay… jawab bhi un swaloon ka dhoondh ker page per
 * dena hay"). The Country Facts collector found KEYWORDS; this finds the QUESTIONS, per product × country, from three sources:
 *   · KEYWORDS  a search in the keyword database that has a question's form (a question word, or fee / cost / price / near me …),
 *               with Google's monthly volume;
 *   · YOUTUBE   the questions in comments under the subject's videos, through the official YouTube Data API only (site/cf-questions.mjs) —
 *               a comment's own words are kept 30 days at most (YouTube's rule for API data), never on a page, never with a name;
 *   · OWNER     the questions the owner pastes on /owner (nurses, doctors, PNC/PMDC — what people asked him).
 *   · REDDIT    OFF — see REDDIT below.
 * Same-meaning questions are grouped into ONE: first by the need they ask about (desktop/country-facts.mjs QUESTION_GROUPS), then, inside
 * a need, by their content words (two questions share a group when most of their content words agree). A group keeps its key from run to
 * run (`known`), so its answer and the owner's decisions stay with it. Pure: text in, groups out. No Google result page, no "People also
 * ask" — nothing here reads a search engine.
 */
import { QUESTION_GROUPS, normText } from "./country-facts.mjs";
import { namesOf } from "./world.mjs";

/* RR-330 (owner, 27 Oct 2026): Reddit only through its official API, and only if its terms allow our use — they do not, so it stays OFF */
export const REDDIT = Object.freeze({ on: false, why: "OFF — Reddit's Data API Terms require Reddit's own written approval for any commercial use of its data, and AlmiVisibility is a commercial product; no approval has been asked for. Turned on only with that approval." });
/* RR-331: "gsc" — the searches that reached our own sites (Search Console), their impressions as their weight */
export const QUESTION_SOURCES = Object.freeze(["keywords", "youtube", "owner", "gsc"]);
export const QUESTIONS = Object.freeze({ minChars: 12, maxChars: 200, joinShare: 0.5, maxGroups: 30, pageVolume: 50, pageAskers: 3 });

/* the owner's list (27 Oct): how / what / can / is / when / where / which / why / fee / near me … */
const ASK_FIRST = /^(how|what|whats|when|where|which|why|who|whom|whose|can|could|is|are|am|was|were|do|does|did|should|shall|will|would|may|must|has|have)\b/;
const ASK_ANYWHERE = /\b(how|what|when|where|which|why|can i|is it|is there|do i|does it|fees?|cost|costs|price|prices|how much|near me|eligib\w*|requirements?)\b/;
/** a search or a sentence that ASKS something */
export const isQuestionForm = (text) => { const t = String(text ?? "").toLowerCase().trim(); return t.endsWith("?") || ASK_FIRST.test(t) || ASK_ANYWHERE.test(t); };

/* a comment's personal parts are cut before anything is kept: web addresses, e-mail addresses, @names, phone numbers, a greeting to someone */
const PERSONAL = [/https?:\/\/\S+|www\.\S+/gi, /\S+@\S+\.\S+/g, /@[\w.-]+/g, /\+?\d[\d\s-]{7,}\d/g];
const GREETING = /^(hi|hello|hey|dear|salam|assalam\w*|thanks?|thank you|sir|mam|ma'am|madam)\b[^.?!]{0,30}[,!.]\s*/i;
/** the questions in one comment: its sentences that ask, cleaned of anything personal → ["can I take OET at home?", …] */
export function questionsInComment(text) {
  let t = String(text ?? "").replace(/\s+/g, " ").trim();
  for (const re of PERSONAL) t = t.replace(re, " ");
  return t.split(/(?<=[?!.])\s+|\n+/).map((s) => askingPart(s.replace(GREETING, "").replace(/\s+/g, " ").trim()))
    .filter((s) => s.length >= QUESTIONS.minChars && s.length <= QUESTIONS.maxChars && /\p{L}{3}/u.test(s) && (s.endsWith("?") || ASK_FIRST.test(s.toLowerCase())) && !notASearch(s));
}
/* RR-333 (owner, 27 Oct 2026: "think like the person"): a comment talking TO the video's maker or its viewers is not a question anyone
 * searches ("How can I register for your class?", "Will you apply for this year's match?", "Is anyone else here preparing?") */
const NOT_A_SEARCH = [
  [/\b(?:your|ur)\s+(?:class|channel|video|course|academy|institute|lecture|session|number|whatsapp|page)s?\b/i, "it asks the video's maker about their own class, channel or contact"],
  [/\b(?:this|that|the)\s+(?:video|lecture|channel)\b/i, "it is about the video itself"],
  [/\b(?:will|can|could|would)\s+(?:you|u)\s+(?:please\s+)?(?:apply|make|upload|share|teach|reply|send|post|guide|tell me)\b/i, "it asks the video's maker to do something"],
  [/\b(?:any ?one|anybody|someone|somebody|guys)\b/i, "it asks the other viewers"],
  [/\b(?:sir|ma'?am|mam|madam|bro|brother|sister)\b/i, "it speaks to a person"],
];
/** RR-334 · why a question is NOT one people search (a comment to the video's maker or its viewers) — or null */
export const notASearch = (text) => NOT_A_SEARCH.find(([re]) => re.test(String(text ?? "")))?.[1] ?? null;
/* the part of a sentence that asks: its last clause, from its first question word ("… mail me — see how long are results valid?" → "how long …") */
const QWORD = /\b(how|what|when|where|which|why|who|can|could|is|are|do|does|did|should|will|would)\b/i;
function askingPart(s) {
  if (!s.endsWith("?") || ASK_FIRST.test(s.toLowerCase())) return s;
  const clause = s.split(/\s[—–-]\s|[,;:]\s/).at(-1).trim(), at = clause.search(QWORD);
  const part = at > 0 ? clause.slice(at) : clause;
  return part.length >= QUESTIONS.minChars ? part : s;
}
/** the owner's pasted questions: one a line (a list's bullets and numbers cut) */
export const ownerLines = (text) => String(text ?? "").split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim()).filter((l) => l.length >= 6 && l.length <= 300);

/* ── same meaning ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const STOP = new Set("a an the of to for in on at by with and or is are am was be been do does did can could i my me we our you your it its this that there what how when where which why who will would should shall may must have has get getting take taking about from as if any much many more than so not no yes please".split(" "));
/* the same need said with other words */
const SAME = { cost: "fee", costs: "fee", price: "fee", prices: "fee", charge: "fee", charges: "fee", fees: "fee", payment: "fee", pay: "fee", center: "centre", centers: "centre", centres: "centre", venue: "centre", venues: "centre", exam: "test", exams: "test", tests: "test", results: "result", score: "result", scores: "result", grade: "result", grades: "result", marks: "result", valid: "validity", expire: "validity", expiry: "validity", book: "booking", register: "booking", registration: "booking", nurses: "nurse", nursing: "nurse", doctors: "doctor", physicians: "doctor", online: "home", remote: "home" };
const stem = (w) => SAME[w] ?? (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? SAME[w.slice(0, -1)] ?? w.slice(0, -1) : w);
/** a question's content words (the subject's and the country's names left out — every question of a page has them) */
export function signatureOf(text, { subject = [], country = null } = {}) {
  const drop = new Set([...[subject].flat(), ...(country ? namesOf(country) : [])].flatMap((s) => normText(s).split(" ")));
  return [...new Set(normText(text).split(" ").filter((w) => w && !STOP.has(w) && !drop.has(w) && !/^\d+$/.test(w)).map(stem))].sort();
}
const share = (a, b) => { const A = new Set(a), B = new Set(b), inter = [...A].filter((x) => B.has(x)).length, uni = new Set([...A, ...B]).size; return uni ? inter / uni : 0; };
const needOf = (text) => QUESTION_GROUPS.find(([, re]) => re.test(String(text).toLowerCase()))?.[0] ?? "other questions";
const slugOf = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const weightOf = (x) => Number(x.volume ?? 0) + (x.source === "owner" ? 50 : x.source === "youtube" ? 10 : 0);

/**
 * items [{ text, source: keywords|youtube|owner, volume?, period? }] → groups, biggest first:
 * [{ id, need, sig, question, asked: [{ text, source }…], count, volume, period, sources: { keywords, youtube, owner } }]
 * `known` [{ id, need, sig }] — last run's groups: an item joins its old group first, so a group's key (and its answer) stays.
 * The first group of a need is keyed by the need itself ("fees"); another of the same need by its words ("fees~pay-rupee").
 */
export function groupQuestions(items, { subject, country = null, known = [], skip = null, max = QUESTIONS.maxGroups } = {}) {
  const esc = (s) => String(s).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sub = new RegExp(`(?<![\\p{L}\\p{N}])(?:${[subject].flat().map(esc).join("|")})(?![\\p{L}\\p{N}])`, "u");
  const groups = known.map((k) => ({ id: k.id, need: k.need, sig: k.sig ?? [], members: [], seed: true }));
  const sorted = [...items].filter((x) => String(x.text ?? "").trim()).sort((a, b) => weightOf(b) - weightOf(a) || String(a.text).localeCompare(String(b.text)));
  for (const x of sorted) {
    const t = String(x.text).toLowerCase();
    /* a keyword must name the subject (a comment under its own video, or the owner's line, need not); a brand's name is no question */
    if ((x.source === "keywords" && !sub.test(t)) || (skip && skip.test(t)) || !isQuestionForm(t)) continue;
    const need = needOf(t), sig = signatureOf(t, { subject, country });
    let g = groups.filter((y) => y.need === need).map((y) => [y, share(sig, y.sig)]).filter(([y, s]) => s >= QUESTIONS.joinShare || (!y.sig.length && !sig.length)).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!g) {
      const first = !groups.some((y) => y.need === need), id = first ? need : `${need}~${slugOf(sig.slice(0, 3).join(" ")) || "q"}`;
      g = groups.find((y) => y.id === id) ?? (groups.push({ id, need, sig, members: [] }), groups.at(-1));
    }
    g.members.push(x);
  }
  return groups.filter((g) => g.members.length).map((g) => {
    const by = (s) => g.members.filter((m) => m.source === s);
    /* the group's question as people put it: the owner's line, else a search's words (YouTube's own words are never the shown question) */
    const shown = by("owner")[0] ?? by("keywords")[0] ?? by("gsc")[0] ?? null;
    return { id: g.id, need: g.need, sig: g.sig, question: shown ? String(shown.text).trim() : null, asked: g.members.slice(0, 10).map((m) => ({ text: String(m.text).trim(), source: m.source })),
      count: g.members.length, volume: by("keywords").reduce((a, m) => a + Number(m.volume ?? 0), 0), impressions: by("gsc").reduce((a, m) => a + Number(m.volume ?? 0), 0), period: by("keywords")[0]?.period ?? null,
      sources: Object.fromEntries(QUESTION_SOURCES.map((s) => [s, by(s).length])) };
  }).sort((a, b) => b.volume + 10 * b.count - (a.volume + 10 * a.count) || a.id.localeCompare(b.id)).slice(0, max);
}

/** a group a page may carry: its answer stands on an official page, and people really ask it (searched enough, several askers, or the owner's) */
export const pageable = (g, answer) => Boolean(answer && answer.kind === "official" && answer.shown && (g.volume >= QUESTIONS.pageVolume || g.count >= QUESTIONS.pageAskers || (g.sources?.owner ?? 0) > 0));
