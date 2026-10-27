/**
 * 🔴 RR-330 · THE QUESTIONS COLLECTOR — one (product, country): the questions people really ask, grouped by meaning, each group answered
 * from an OFFICIAL page (desktop/real-questions.mjs is the pure half). Called by the Country Facts collector (cf-collector.mjs) for its
 * "questions" task, inside its caps (time, page reads, AI dollars).
 *   1 ASKED     the keyword database's question-form searches FROM that country (Google's volumes); the questions in comments under the
 *               subject's most relevant videos for that country (the official YouTube Data API only — YOUTUBE_API_KEY in Vercel; search.list
 *               has its own 100-a-day bucket, each comment page costs 1 of 10,000 units; at most once a week a country); the owner's own lines.
 *               A comment's words are kept 30 days at most (YouTube's rule for API data) and are never a page's words.
 *   2 GROUPED   same meaning → one group; its key stays from run to run.
 *   3 ANSWERED  the fee from the fee fact (OET's own page); every other group by ONE AI question (web search) per country — each "official"
 *               answer is checked HERE: its page read (robots obeyed), its address official (the subject's site, a government's, a body
 *               already found for that country), its quoted words on the page, and every number it states on the page too. "Guidance" —
 *               where no official page says it — may state no number at all. What fails is stored "unconfirmed" (never shown) with why.
 *   4 COUNTED   per country: questions asked, groups, groups a page may carry (desktop/real-questions.mjs pageable) — kept in the task.
 */
import { numbersOf, quoteOnPage, hostOf, governmentHost, SHOWN_STATUS } from "../desktop/country-facts.mjs";
import { groupQuestions, questionsInComment, isQuestionForm, pageable, REDDIT } from "../desktop/real-questions.mjs";
import { youtubeApi } from "../src/video/youtube.mjs";
import { feeShown } from "../desktop/rates.mjs";
import { officialAnswerQuestion } from "./cf-ai.mjs";

export const CF_QUESTIONS = Object.freeze({ videos: 4, commentsPerVideo: 50, youtubeEveryDays: 7, rawDays: 30, answerPerRun: 8, answerAgainDays: 30 });
export { REDDIT };

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9~]+/g, "-").replace(/^-|-$/g, "");
const daysAgo = (iso, today) => (iso ? Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(String(iso).slice(0, 10) + "T00:00:00Z")) / 864e5) : Infinity);

/**
 * One (product, country). `ctx` comes from the collector run: { store, kwStore, env, reader, room(needAi), askOne(q), put(fact), today, at(),
 * fetchImpl, youtube }. → { state: "done"|"searching"|"waiting"|"retry", note, stats: { asked, groups, pageable, sources }, why }
 */
export async function collectQuestions({ country, location, subject, subjectSite, skip, fee = null, lines = [], bodies = [], keyOf = (g) => `question|${country}|${slug(g.id)}`, product = "oet" }, ctx) {
  const { store, kwStore, reader, room, askOne, put, today } = ctx;
  /* 1 · asked: keywords, YouTube, the owner */
  const items = [];
  if (location && kwStore) for (const r of await kwStore.keywordsAt({ location: location.code, language: "en" })) if (isQuestionForm(r.keyword)) items.push({ text: r.keyword, source: "keywords", volume: r.volume, period: r.period });
  const yt = await youtubeOf({ country, location, subject, product }, ctx);
  for (const q of await store.questions({ product, country })) items.push({ text: q.text, source: q.source, ...(q.source === "gsc" ? { volume: q.impressions ?? 0 } : {}) });
  /* 2 · grouped — last run's groups first, so a group keeps its key */
  const old = (await store.facts({ country })).filter((f) => (f.product ?? "oet") === product && f.part === "questions");
  const known = old.map((f) => ({ id: f.value?.group ?? f.key.split("|").pop(), need: f.value?.intent ?? f.value?.group, sig: f.value?.sig ?? [] })).filter((k) => k.id && k.need);
  const groups = groupQuestions(items, { subject, country, known, skip });
  const stats = { asked: items.length, groups: groups.length, pageable: 0, sources: { keywords: items.filter((x) => x.source === "keywords").length, youtube: items.filter((x) => x.source === "youtube").length, owner: items.filter((x) => x.source === "owner").length, gsc: items.filter((x) => x.source === "gsc").length }, youtube: yt.note, reddit: REDDIT.why };
  if (!groups.length) return { state: "done", note: `no question asked about ${subject} from ${country} yet (keywords ${stats.sources.keywords}, YouTube ${yt.note}, yours ${stats.sources.owner})`, stats };
  const value = (g, extra) => ({ group: g.id, intent: g.need, sig: g.sig, question: g.question, asked: g.asked.filter((a) => a.source !== "youtube"), keywords: g.asked.filter((a) => a.source === "keywords").map((a) => a.text), count: g.count, volume: g.volume, period: g.period, sources: g.sources, ...extra });
  const prev = new Map(old.map((f) => [f.key, f]));
  /* 3 · answered: the fee from its fact; the rest by the AI, checked here */
  for (const g of groups.filter((x) => x.need === "fees" && fee)) {
    const v = value(g, { question: g.question ?? `How much does ${subject} cost in ${country}?`, answer: `${subject} costs ${feeShown(fee.value, { date: false })} in ${country} (${subject}'s own page, read ${fee.readOn}${fee.value.rate ? `; the rate: ${fee.value.rate.source}, ${fee.value.rate.date}` : ""}).`, answerKind: "official", quote: null });
    await put({ key: keyOf(g), product, country, part: "questions", kind: "question", value: { ...v, pageable: pageable(g, { kind: "official", shown: true }) }, sourceUrl: fee.sourceUrl, sourceTitle: fee.sourceTitle, readOn: today, status: "confirmed" });
  }
  /* an answer given in the last 30 days (shown or not) is not asked again before then — the cost stays inside the day's cap */
  const fresh = (g) => { const f = prev.get(keyOf(g)); return Boolean(f?.value?.answer && daysAgo(f.readOn, today) < CF_QUESTIONS.answerAgainDays); };
  const open = groups.filter((g) => !(g.need === "fees" && fee) && !fresh(g)), ask = open.slice(0, CF_QUESTIONS.answerPerRun);
  stats.pageable = countPageable(groups, prev, keyOf, fee);
  if (!ask.length) return { state: "done", note: noteOf(stats), stats };
  if (!ctx.aiOn) return { state: "waiting", note: `the AI is not connected yet (ANTHROPIC_API_KEY) — only the fee questions are answered · ${noteOf(stats)}`, stats };
  if (!room(true)) return { state: null, stats };
  const r = await askOne(officialAnswerQuestion({ country, subject, subjectSite, groups: ask, facts: lines, bodies: bodies.map((b) => b.name) }));
  if (!r.ok) return { state: "retry", note: r.why, why: r.why, stats };
  const officialHosts = new Set([hostOf(subjectSite), ...bodies.map((b) => hostOf(b.website))].filter(Boolean));
  const official = (h) => Boolean(h && (governmentHost(h) || officialHosts.has(h) || [...officialHosts].some((o) => h.endsWith(`.${o}`))));
  const allowedNumbers = new Set(numbersOf(lines.join(" ")));
  for (const g of ask) {
    const a = (r.data.answers ?? []).find((x) => x.group === g.id); if (!a?.answer) continue;
    const answer = String(a.answer).trim(), said = numbersOf(answer), kind = a.kind === "official" ? "official" : "guidance";
    /* the question as shown: a person's own words where we may show them (a search, the owner's line), else the AI's plain wording */
    const question = g.question ?? (String(a.question ?? "").trim() || null);
    if (kind === "guidance") {
      const extra = said.filter((n) => !allowedNumbers.has(n) && !g.asked.some((x) => numbersOf(x.text).includes(n)));
      await put({ key: keyOf(g), product, country, part: "questions", kind: "question", value: value(g, { question, answer, answerKind: "guidance", label: "general guidance (no official page says it)", quote: null, pageable: false }), readOn: today, aiWritten: true, proposedBy: "ai",
        status: extra.length || !question ? "unconfirmed" : "confirmed", why: extra.length ? `the answer states ${extra.join(", ")}, which no confirmed fact says — general guidance may state no number` : !question ? "no question in words we may show" : null });
      continue;
    }
    if (!room()) return { state: null, stats };
    const page = await reader.read(a.sourceUrl), h = hostOf(page.ok ? page.url : a.sourceUrl), text = page.ok ? `${page.title ?? ""} ${page.h1 ?? ""} ${page.text}` : "";
    const onPage = page.ok && a.quote && quoteOnPage(a.quote, page.text), numbersOk = said.every((n) => numbersOf(text).includes(n));
    const why = !official(h) ? "its source page is not official (the subject's own site, a council's or a government's)" : !page.ok ? `its source page could not be read (${page.why})` : !onPage ? "the quoted words are not on its source page" : !numbersOk ? `the answer states ${said.filter((n) => !numbersOf(text).includes(n)).join(", ")}, which its source page does not` : !question ? "no question in words we may show" : null;
    const shown = !why;
    await put({ key: keyOf(g), product, country, part: "questions", kind: "question", value: value(g, { question, answer, answerKind: "official", quote: a.quote, pageable: pageable(g, { kind: "official", shown }) }), sourceUrl: page.ok ? page.url : a.sourceUrl, sourceTitle: page.title ?? null, readOn: page.checkedOn ?? today, aiWritten: true, proposedBy: "ai", status: shown ? "confirmed" : "unconfirmed", why });
  }
  const after = new Map((await store.facts({ country })).filter((f) => (f.product ?? "oet") === product && f.part === "questions").map((f) => [f.key, f]));
  stats.pageable = countPageable(groups, after, keyOf, fee);
  /* groups still without an answer: asked again tomorrow (background), never left silent */
  const still = groups.filter((g) => !after.get(keyOf(g))?.value?.answer).length;
  return still ? { state: "searching", note: `${still} of ${groups.length} question groups still to answer — again tomorrow · ${noteOf(stats)}`, stats } : { state: "done", note: noteOf(stats), stats };
}
const noteOf = (s) => `${s.asked} questions asked (keywords ${s.sources.keywords}, YouTube ${s.sources.youtube}, yours ${s.sources.owner}) · ${s.groups} groups · ${s.pageable} a page may carry`;
function countPageable(groups, facts, keyOf, fee) {
  return groups.filter((g) => { const f = facts.get(keyOf(g)); if (!f) return false; if (g.need === "fees" && fee) return pageable(g, { kind: "official", shown: true }); return SHOWN_STATUS.includes(f.status) && pageable(g, { kind: f.value?.answerKind, shown: true }); }).length;
}

/* ── YouTube: the questions under the subject's most relevant videos for the country (official API only; at most once a week a country) ── */
async function youtubeOf({ country, location, subject, product }, { store, env, fetchImpl, youtube = null, today, at }) {
  /* YouTube's rule for API data: a comment's words are kept 30 days at most */
  await store.dropQuestions({ source: "youtube", before: new Date(Date.parse(`${today}T00:00:00Z`) - CF_QUESTIONS.rawDays * 864e5).toISOString() });
  const api = youtube ?? youtubeApi({ env, fetchImpl });
  if (api.state !== "READY") return { note: "not connected (YOUTUBE_API_KEY)" };
  if (!location?.code || location.code === "ALL") return { note: "no region code for this country" };
  const last = (await store.questions({ product, country, source: "youtube" }))[0];
  if (last && daysAgo(last.at, today) < CF_QUESTIONS.youtubeEveryDays) return { note: `read ${last.at.slice(0, 10)}` };
  try {
    const videos = await api.searchTopic(`${subject} exam`, { max: CF_QUESTIONS.videos, order: "relevance", regionCode: location.code, relevanceLanguage: "en" });
    const found = [];
    for (const v of videos.slice(0, CF_QUESTIONS.videos)) for (const c of await api.comments(v.videoId, { max: CF_QUESTIONS.commentsPerVideo })) for (const q of questionsInComment(c.text)) found.push({ text: q, ref: v.videoId });
    const r = await store.putQuestions({ product, country, source: "youtube", items: found, at: at() });
    return { note: `${found.length} questions under ${videos.length} videos (${r.added} new)` };
  } catch (e) { return { note: `not read (${e?.reason ?? e?.message ?? "no answer"})` }; }
}
