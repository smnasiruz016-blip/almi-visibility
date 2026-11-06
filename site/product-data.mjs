/**
 * 🔴 RR-380 item 1 (owner, 6 Nov 2026: "collectors for everything") · THE PRODUCT QUEUE WITH EACH PRODUCT'S OWN DATA LIST, in the plan's order
 * (ALMIVISIBILITY_COLLECTORS_AND_SEARCH_PLAN_2026-11-05.md sections 0 and 12): AlmiOET, AlmiVisibility, almiworld.com, AlmiCV, AlmiJob,
 * AlmiSalary, AlmiStudy, AlmiPathway, AlmiPrep, AlmiPTE, AlmiTOEFL, AlmiDET, AlmiCELPIP, AlmiGoethe, the language products, EBooks.
 * Each data item names the job that fills it and how often it is rechecked (Q&A LAW 7: fees and dates monthly, rules every 3 months, the
 * rest every 6). An item no job fills yet says so ("not built"): nothing is silently dropped.
 * Pure: no store, no network.
 */
export const RECHECK = Object.freeze({ money: 30, date: 30, rule: 90, other: 180 });
/** the jobs that fill data, and what each is (the collectors on the AlmiSEO Data server) */
export const DATA_JOBS = Object.freeze({
  keywords: "keyword collector (Google Ads Keyword Planner)", questions: "questions (keywords, Search Console, People also ask)", facts: "country facts (official pages, Sonnet with web search)",
  answers: "answers collector (one answer per question, with source)", "top-pages": "top pages (DataForSEO, standard queue)", dates: "test dates", rules: "rules that change (RR-380)",
  trends: "trends (RR-380)", places: "places (RR-380, OpenStreetMap)", research: "research (competitors, measured only)", pathway: "pathway corridors", general: "general market data (RR-380)",
  lists: "data lists (RR-382: ESCO, ILOSTAT, World Bank, Wikidata, College Scorecard, AlAdhan)",
});
const d = (what, job, kind = "other", built = true) => Object.freeze({ what, job, kind, recheckDays: RECHECK[kind], built });
const EXAM = (exam) => Object.freeze([d(`${exam} format and sections`, "facts", "rule"), d(`${exam} scores and what each score means`, "facts", "rule"), d(`${exam} fees per country`, "facts", "money"), d("test centres per country", "facts", "other"), d("test dates per country", "dates", "date"), d("regulators and the score each asks, per profession and country", "facts", "rule"), d("what people ask, per country", "questions"), d("answers with sources", "answers"), d("top pages per topic", "top-pages"), d("keywords and volumes", "keywords"), d("rising topics and questions", "trends"), d("competitors (measured only)", "research")]);
const LANG = (lang, exam) => Object.freeze([d(`${lang} exams (${exam}): format, levels, fees per country`, "facts", "rule"), d("test centres and dates", "dates", "date"), d("what learners ask, per country", "questions"), d("answers with sources", "answers"), d("keywords and volumes", "keywords"), d("top pages per topic", "top-pages"), d("rising topics", "trends")]);
/* the country-facts collector's own parts (site/cf-collector.mjs PRODUCT_FACTS): cv cvNorms/employment/workRules, jobs employment/workPermit/recognition, salary minimumWage/averageSalary/tax/currency, study universities/admission/studentVisa/scholarships */
const CAREER_BASE = [d("what people ask, per country", "questions"), d("keywords and volumes", "keywords"), d("top pages per topic", "top-pages"), d("rising topics", "trends")];
const CV = Object.freeze([d("CV rules per country (cvNorms)", "facts", "rule"), d("employment rules and work rules per country", "facts", "rule"), ...CAREER_BASE]);
/* 🔴 RR-382 item 1d: the lists that said "not built" are filled by the lists collector (site/data-lists.mjs), each row with its source and date */
const JOBS_DATA = Object.freeze([d("employment, work permits and recognition per country", "facts", "rule"), d("job titles and essential skills by role (ESCO, EU-wide)", "lists", "other"), ...CAREER_BASE]);
const SALARY = Object.freeze([d("minimum wage, average salary, tax and currency per country", "facts", "money"), d("earnings by occupation group per country (ILOSTAT)", "lists", "money"), d("price level per country (World Bank)", "lists", "money"), d("cost of living by city (no official open source per city)", "lists", "money", false), ...CAREER_BASE]);
/** [key, name, kind, data] — key = the seed list's product key (site/kw-seeds.mjs) where one exists */
export const PRODUCT_DATA = Object.freeze([
  ["oet", "AlmiOET", "exam", EXAM("OET")], ["visibility", "AlmiVisibility", "service", [d("SEO, AI search and app-store questions", "questions"), d("keywords and volumes", "keywords"), d("top pages per topic", "top-pages"), d("competitors (measured only)", "research"), d("rising topics", "trends"), d("general market data for clients' categories and niches", "general")]],
  ["almiworld", "almiworld.com", "brand", [d("what people ask about AlmiWorld's products", "questions"), d("keywords and volumes", "keywords"), d("top pages per topic", "top-pages")]],
  ["cv", "AlmiCV", "career", [...CV, d("competitors (measured only)", "research")]], ["jobs", "AlmiJob", "career", JOBS_DATA], ["salary", "AlmiSalary", "career", SALARY],
  ["study", "AlmiStudy", "study", [d("universities per country", "facts", "other"), d("admission rules, student visas and scholarships per country", "facts", "rule"), d("universities with website, founding year and founders (Wikidata)", "lists", "other"), d("tuition per university (US: College Scorecard; other countries have no official open source)", "lists", "money"), d("accreditation (no open source across countries)", "lists", "other", false), d("what students ask, per country", "questions"), d("keywords and volumes", "keywords"), d("rising topics", "trends")]],
  ["pathway", "AlmiPathway", "pathway", [d("visa types, documents, proof of funds, fees and timelines per corridor", "pathway", "rule"), d("English-test gates and credential evaluation per corridor", "pathway", "rule"), d("visa rules that change (rechecked every 3 months)", "rules", "rule"), d("fees per corridor (rechecked monthly)", "rules", "money"), d("what people ask per corridor", "answers"), d("rising topics", "trends")]],
  ["prep", "AlmiPrep (IELTS)", "exam", EXAM("IELTS")], ["pte", "AlmiPTE", "exam", EXAM("PTE Academic")], ["toefl", "AlmiTOEFL", "exam", EXAM("TOEFL iBT")], ["det", "AlmiDET", "exam", EXAM("Duolingo English Test")], ["celpip", "AlmiCELPIP", "exam", EXAM("CELPIP")], ["goethe", "AlmiGoethe", "exam", EXAM("Goethe-Zertifikat")],
  ["french", "AlmiFrench", "language", LANG("French", "TCF, TEF, DELF/DALF")], ["spanish", "AlmiSpanish", "language", LANG("Spanish", "DELE, SIELE")], ["japanese", "AlmiJapanese", "language", LANG("Japanese", "JLPT")], ["korean", "AlmiKorean", "language", LANG("Korean", "TOPIK")], ["italian", "AlmiItalian", "language", LANG("Italian", "CILS, CELI")], ["portuguese", "AlmiPortuguese", "language", LANG("Portuguese", "CAPLE, Celpe-Bras")], ["dutch", "AlmiDutch", "language", LANG("Dutch", "inburgering, NT2")], ["icelandic", "AlmiIcelandic", "language", LANG("Icelandic", "the Icelandic citizenship test")], ["danish", "AlmiDanish", "language", LANG("Danish", "Prøve i Dansk")], ["norwegian", "AlmiNorwegian", "language", LANG("Norwegian", "Norskprøven")], ["swedish", "AlmiSwedish", "language", LANG("Swedish", "Swedex, SFI")], ["swiss", "AlmiSwiss", "language", LANG("Swiss languages", "fide")],
  ["ebooks", "EBooks", "store", [d("what readers search for", "keywords"), d("rising topics", "trends")]],
  /* RR-380 item 2: the local directories (in the owner's specs; places by city, links only) */
  ["halal", "AlmiHalal", "directory", [d("halal restaurants and mosques by city (OpenStreetMap)", "places"), d("prayer times by city with their calculation method (AlAdhan)", "lists", "date"), d("what people search by city", "keywords")]],
  ["health", "AlmiHealth", "directory", [d("doctors, hospitals and clinics by city (OpenStreetMap)", "places"), d("public-register status (e.g. PMDC)", "places", "rule", false)]],
  ["architect", "AlmiArchitect", "directory", [d("architects and builders by city (OpenStreetMap)", "places"), d("licence or registration status from public registers", "places", "rule", false)]],
].map(([key, name, kind, data]) => Object.freeze({ key, name, kind, data: Object.freeze([...data]) })));
/** the queue order the plan gives (live products first, the directories after) */
export const PLAN_ORDER = Object.freeze(PRODUCT_DATA.map((p) => p.key));
export const productOf = (key) => PRODUCT_DATA.find((p) => p.key === key) ?? null;
/** for the collector page: each product's data list against what is held. held(key, item) → { rows, newest, oldest } | null */
export function dataStatus(product, held, today) {
  return product.data.map((item) => { const h = held(product.key, item); if (!item.built) return { ...item, state: "not built yet", rows: 0 }; if (!h?.rows) return { ...item, state: "missing", rows: 0 };
    const age = h.oldest ? Math.round((Date.parse(today) - Date.parse(h.oldest)) / 864e5) : null; return { ...item, state: age != null && age > item.recheckDays ? "due for recheck" : "fresh", rows: h.rows, newest: h.newest ?? null, oldest: h.oldest ?? null }; });
}
