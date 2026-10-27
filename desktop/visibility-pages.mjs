/**
 * 🔴 RR-333 D · ALMIVISIBILITY'S OWN PAGES (owner decision, 27 Oct 2026). Software, not an exam: the country five-part rule does NOT
 * apply. Its page families:
 *   FEATURES     one page per thing it does (keyword research, the free site checker, website audit, AI search visibility, AEO, GEO,
 *                YouTube SEO, local SEO) — ready when people search for it (the keyword database holds a figure for its words);
 *   USE-CASES    by business type (restaurant, school, online shop, clinic …) — ready when that business type's searches are recorded;
 *   HOW-TO       a question people ask about it — ready only when asked enough (50+ searches, 3+ askers, or the owner's own) AND answered
 *                from AlmiVisibility's own pages (no answer is written here: until then it waits, said so);
 *   FREE TOOLS   the free tools that are live on almivisibility.almiworld.com (the site score, the keyword finder) — ready, they exist;
 *   COMPARISONS  another tool — only with facts about it verified on its own page, with source and date; none collected yet → waiting.
 * LOCATIONS: where its searches show demand, never all 197 by default. Pure: the collected data in, the counts out — never an estimate.
 */
import { isQuestionForm, groupQuestions, QUESTIONS } from "./real-questions.mjs";

export const VIS_GROUPS = Object.freeze(["product:visibility", "our Search Console · visibility"]);
export const VIS_FEATURES = Object.freeze([
  ["keyword research", /keyword (research|tool|planner|finder)|search volume/], ["free site checker", /(seo|site|website) (checker|check|score|analy[sz]er)|free seo/],
  ["website audit", /(website|site|seo) audit/], ["AI search visibility", /\b(ai (search|visibility|overview)|chatgpt|perplexity|gemini|copilot)\b/],
  ["answer engine optimization (AEO)", /\baeo\b|answer engine/], ["generative engine optimization (GEO)", /\bgeo\b|generative engine/],
  ["YouTube SEO", /youtube (seo|tags|keywords|ranking)/], ["local SEO", /local seo|google (business|maps) (profile|ranking)|near me seo/],
]);
export const VIS_BUSINESS = Object.freeze([["restaurant", /restaurant|cafe|food/], ["school", /school|college|academy|tuition/], ["online shop", /online (shop|store)|e-?commerce|shopify|woocommerce/],
  ["clinic", /clinic|dentist|doctor|hospital|medical/], ["hotel", /hotel|guest ?house|resort/], ["salon", /salon|beauty|spa\b/], ["law firm", /law(yer| firm)|legal|attorney/],
  ["real estate", /real estate|property|realtor/], ["small business", /small business|local business/]]);
export const VIS_FREE_TOOLS = Object.freeze([{ name: "the free site score", url: "https://almivisibility.almiworld.com/" }, { name: "the keyword finder", url: "https://almivisibility.almiworld.com/" }]);
const SEO_WORDS = /\b(seo|search|google|ranking|rank|visibility|website|keywords?|chatgpt|ai)\b/;
const DEMAND = 10; // searches a month: at least this many, at some location, for a family's words to count as demand

/**
 * keywords [{ keyword, location, volume }] (the groups VIS_GROUPS) · questions [{ text, source, impressions }] (cf_question, any country)
 * · answered: Set of how-to group ids answered from AlmiVisibility's own pages · comparisons: [{ tool, facts: [{ source, on }] }]
 * → { features, useCases, howTo, freeTools, comparisons: { ready, waiting, why, items }, locations: [{ location, volume }] }
 */
export function visibilityPages({ keywords = [], questions = [], answered = new Set(), comparisons = [] } = {}) {
  const fam = (list, extra = () => true) => list.map(([name, re]) => { const hits = keywords.filter((k) => re.test(k.keyword) && extra(k.keyword) && (k.volume ?? 0) >= DEMAND); return { name, ready: hits.length > 0, volume: hits.reduce((a, k) => a + (k.volume ?? 0), 0), keywords: [...new Set(hits.map((k) => k.keyword))].slice(0, 5) }; });
  const count = (items, whyNot) => ({ ready: items.filter((x) => x.ready).length, waiting: items.filter((x) => !x.ready).length, why: items.some((x) => !x.ready) ? whyNot : null, items });
  const features = count(fam(VIS_FEATURES), "no search demand recorded yet for its words");
  const useCases = count(fam(VIS_BUSINESS, (t) => SEO_WORDS.test(t)), "no searches recorded yet for that business type with SEO / website words");
  /* how-to: the questions people ask (searches in a question's form, Search Console, YouTube, the owner), grouped by meaning */
  const items = [...keywords.filter((k) => isQuestionForm(k.keyword)).map((k) => ({ text: k.keyword, source: "keywords", volume: k.volume ?? 0 })), ...questions.map((q) => ({ text: q.text, source: q.source, ...(q.source === "gsc" ? { volume: q.impressions ?? 0 } : {}) }))];
  const groups = groupQuestions(items, { subject: ["seo", "website", "keyword", "keywords", "ai", "chatgpt", "google", "youtube", "visibility"], max: 60 }).map((g) => ({ name: g.question ?? g.id, id: g.id, asked: g.volume >= QUESTIONS.pageVolume || g.count >= QUESTIONS.pageAskers || g.sources.owner > 0, answered: answered.has(g.id) }));
  const howTo = { ready: groups.filter((g) => g.asked && g.answered).length, waiting: groups.filter((g) => !(g.asked && g.answered)).length,
    why: groups.length ? `${groups.filter((g) => g.asked && !g.answered).length} asked enough but not yet answered from AlmiVisibility's own pages · ${groups.filter((g) => !g.asked).length} asked too little` : "no questions collected yet", items: groups };
  const freeTools = { ready: VIS_FREE_TOOLS.length, waiting: 0, why: null, items: VIS_FREE_TOOLS };
  const comp = comparisons.map((c) => ({ name: c.tool, ready: (c.facts ?? []).some((f) => f.source && f.on) }));
  const compared = { ready: comp.filter((c) => c.ready).length, waiting: comp.filter((c) => !c.ready).length, why: comp.length ? "a tool without a fact verified on its own page (source + date)" : "no facts about another tool collected yet — no comparison page", items: comp };
  const byLoc = new Map(); for (const k of keywords) if ((k.volume ?? 0) >= DEMAND && k.location && k.location !== "ALL" && SEO_WORDS.test(k.keyword)) byLoc.set(k.location, (byLoc.get(k.location) ?? 0) + k.volume);
  return { features, useCases, howTo, freeTools, comparisons: compared, locations: [...byLoc].map(([location, volume]) => ({ location, volume })).sort((a, b) => b.volume - a.volume) };
}
