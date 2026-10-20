/** RR-298 · the languages proof, in memory: 2 pages + 1 article of the RR-296 test project in English, Spanish and Arabic (right-to-left). */
import { languageVersions, gateLanguages } from "../../src/page/languages.mjs";
import { GUIDANCE } from "../../config/guidance/guidance-read.mjs";
import { newPageRun, articleRun, ROBOTS, COST, P } from "./rr296-proof.mjs";
import { TRANSLATIONS, BAD } from "../fixtures/rr298-translations.mjs";

export function languagesRun({ withBad = false } = {}) {
  const np = newPageRun();
  const [day1] = articleRun({ newPages: np });
  const article = day1.articles[0];
  const topic = P.TOPICS.find((x) => x.topicId === article.topicId);
  const sources = [
    ...np.pages.map((p) => ({ key: p.needId, page: { url: p.url, title: p.title, items: p.items, questions: p.questions } })),
    { key: article.topicId, page: { url: article.url, title: article.question, items: [{ needId: topic.topicId, needKey: topic.topicId, heading: { wording: topic.question }, questions: [{ questionId: topic.topicId, wording: topic.question }], claims: topic.claims, statements: [] }], questions: article.questions } },
  ];
  const langUrl = (lang, url) => { const u = new URL(url); return lang === "en" ? u.href : `${u.origin}/${lang}${u.pathname}`; };
  /* each language page links its same-language siblings */
  const related = (key) => (lang) => sources.filter((s) => s.key !== key).map((s) => ({ href: langUrl(lang, s.page.url), label: s.page.title }));
  const built = sources.map((s) => ({ key: s.key, ...languageVersions({ page: s.page, keyFacts: P.KEY_FACTS, translations: [...TRANSLATIONS[s.key], ...(withBad && s.key === "n-fee" ? [BAD] : [])], design: P.DESIGN, on: "2026-10-20", related: related(s.key) }) }));
  const versions = built.flatMap((b) => b.versions);
  const gates = gateLanguages({ versions, guidance: GUIDANCE, on: "2026-10-20", cost: COST, robotsTxt: ROBOTS });
  return { built, versions, gates, refused: built.flatMap((b) => b.refused) };
}
