/**
 * 🔴 RR-329 B · COUNTRY FACTS FOR EVERY PRODUCT (owner, rule R6) — each product's own facts template: the parts ITS country pages need.
 *   · the TEST products (AlmiOET and the other English tests; the language products, whose exams people take: TEF/TCF, Goethe, DELE …)
 *     keep the owner's FIVE parts: 1 the fee in that country, 2 the questions people there ask, 3 the test centres there (or taking it at
 *     home), 4 the offices — the bodies in that country that ask for or accept the test (for AlmiOET: the council of each of its 12
 *     professions, desktop/country-facts.mjs), 5 a rule of that country;
 *   · AlmiCV: the questions, that country's CV norms, its public employment service, its work-permit rule;
 *   · AlmiJob: the questions, the public employment service, the work-permit rule, the body that recognises foreign qualifications;
 *   · AlmiStudy: the questions, the universities (the official body that lists them), the admission rule, the student-visa office, a
 *     government scholarship;
 *   · AlmiSalary: the questions, the minimum wage, the average salary (the official statistics office), the tax authority, the currency.
 * A page is made only when every part of its template is filled (as the five-part rule); a part not filled is "missing: …", never padded.
 * Every fact stands on an official page the collector reads itself: the government's, the body's own, or the test owner's (OWNER_SITES).
 * A BODY part (offices, employment service, universities, tax authority, recognition) is searched again every day until found, under any
 * same-meaning name (rule R1). Pure.
 */
export const PART_INFO = Object.freeze({
  fee: { name: "the fee in that country", kind: "quote", ask: "the fee to take the test in this country, in the money it is paid in — copy the sentence of the official page that states it (with the amount)" },
  questions: { name: "the questions people there ask, with answers", kind: "questions" },
  centres: { name: "test centres (or taking it at home)", kind: "quote", ask: "where the test can be taken in this country: the official test-centre list or the test owner's page naming the cities or centres (or saying it is taken at home/online there)" },
  councils: { name: "the council for each profession", kind: "councils" }, // AlmiOET's part 4 (desktop/country-facts.mjs), collected by the RR-328 council search
  offices: { name: "the offices that ask for it", kind: "body", ask: "an official body in this country that asks for or accepts this test (immigration, a professional council, a university admissions office, the national test office) — its official name and website" },
  rules: { name: "a rule of its own", kind: "quote", ask: "one rule specific to this country for people who take this test (registration, documents, attestation, visa or recognition step)" },
  cvNorms: { name: "the CV norms there", kind: "quote", ask: "what a CV or job application looks like in this country (length, photo, personal details, language) — from the public employment service or a government page" },
  employment: { name: "the public employment service", kind: "body", ask: "the official public employment service of this country (where jobs are listed by the state) — its official name and website" },
  workRules: { name: "the work-permit rule", kind: "quote", ask: "the rule a foreigner must meet to work in this country (the work permit or visa), from the government's page" },
  workPermit: { name: "the work-permit rule", kind: "quote", ask: "the rule a foreigner must meet to work in this country (the work permit or visa), from the government's page" },
  recognition: { name: "who recognises foreign qualifications", kind: "body", ask: "the official body in this country that recognises foreign qualifications or diplomas — its official name and website" },
  universities: { name: "the universities (the official list)", kind: "body", ask: "the official body that lists or accredits the universities of this country (the ministry or higher-education commission) — its official name and website" },
  admission: { name: "the admission rule", kind: "quote", ask: "a rule for foreign students' admission to universities in this country (language test, documents, recognition), from an official page" },
  studentVisa: { name: "the student-visa office", kind: "body", ask: "the official body that issues student visas or permits for this country — its official name and website" },
  scholarships: { name: "a government scholarship", kind: "quote", ask: "one government scholarship for foreign or local students in this country, from the government's or the scholarship's official page" },
  minimumWage: { name: "the minimum wage", kind: "quote", ask: "the national minimum wage of this country (the amount and period), from the government's page" },
  averageSalary: { name: "the average salary", kind: "quote", ask: "the average or median salary of this country, from the official statistics office's page" },
  tax: { name: "the tax authority", kind: "body", ask: "the official tax authority of this country — its official name and website" },
  currency: { name: "the currency", kind: "auto" },
});
const TEST = ["fee", "questions", "centres", "offices", "rules"];
/* each product: the name pages use, the words its questions contain (the keyword database), its own brand words (never skipped as a
 * "competitor"), the official sites of its test owner (a fee or centre page there is official) */
export const PRODUCT_FACTS = Object.freeze({
  oet: { name: "OET", kind: "test", subject: ["oet"], own: /\boet\b/, sites: ["oet.com"], parts: ["fee", "questions", "centres", "councils", "rules"] },
  cv: { name: "CV", kind: "service", subject: ["cv", "resume", "curriculum vitae"], own: /\b(cv|resume)\b/, sites: [], parts: ["questions", "cvNorms", "employment", "workRules"] },
  jobs: { name: "jobs", kind: "service", subject: ["jobs", "job", "vacancies", "vacancy"], own: /\bjobs?\b/, sites: [], parts: ["questions", "employment", "workPermit", "recognition"] },
  study: { name: "study abroad", kind: "service", subject: ["study", "university", "universities", "scholarship", "scholarships", "admission"], own: /\b(study|universit\w*)\b/, sites: [], parts: ["questions", "universities", "admission", "studentVisa", "scholarships"] },
  salary: { name: "salary", kind: "service", subject: ["salary", "salaries", "wage", "wages"], own: /\b(salar\w*|wages?)\b/, sites: [], parts: ["questions", "minimumWage", "averageSalary", "tax", "currency"] },
  prep: { name: "IELTS", kind: "test", subject: ["ielts"], own: /\b(ielts|idp|british council)\b/, sites: ["ielts.org", "britishcouncil.org", "idp.com", "ieltsusa.org"], parts: TEST },
  pte: { name: "PTE Academic", kind: "test", subject: ["pte"], own: /\b(pte|pearson)\b/, sites: ["pearsonpte.com", "pearson.com"], parts: TEST },
  toefl: { name: "TOEFL", kind: "test", subject: ["toefl"], own: /\btoefl\b/, sites: ["ets.org"], parts: TEST },
  det: { name: "Duolingo English Test", kind: "test", subject: ["duolingo english test", "duolingo test"], own: /\bduolingo\b/, sites: ["englishtest.duolingo.com", "duolingo.com"], parts: TEST },
  celpip: { name: "CELPIP", kind: "test", subject: ["celpip"], own: /\bcelpip\b/, sites: ["celpip.ca", "paragontesting.ca"], parts: TEST },
  french: { name: "French (TEF, TCF, DELF)", kind: "test", subject: ["tef", "tcf", "delf", "dalf", "french"], own: /\b(tef|tcf|delf|dalf)\b/, sites: ["france-education-international.fr", "lefrancaisdesaffaires.fr", "cci-paris-idf.fr"], parts: TEST },
  goethe: { name: "German (Goethe)", kind: "test", subject: ["goethe", "german"], own: /\bgoethe\b/, sites: ["goethe.de"], parts: TEST },
  spanish: { name: "Spanish (DELE, SIELE)", kind: "test", subject: ["dele", "siele", "spanish"], own: /\b(dele|siele|cervantes)\b/, sites: ["cervantes.es", "siele.org"], parts: TEST },
  italian: { name: "Italian (CILS, CELI, PLIDA)", kind: "test", subject: ["cils", "celi", "plida", "italian"], own: /\b(cils|celi|plida)\b/, sites: ["unistrasi.it", "unistrapg.it", "plida.it", "ladante.it"], parts: TEST },
  portuguese: { name: "Portuguese (CAPLE, Celpe-Bras)", kind: "test", subject: ["caple", "celpe", "portuguese"], own: /\b(caple|celpe)\b/, sites: ["caple.letras.ulisboa.pt", "gov.br"], parts: TEST },
  dutch: { name: "Dutch (inburgering, NT2)", kind: "test", subject: ["inburgering", "nt2", "dutch"], own: /\b(inburgering|nt2)\b/, sites: ["inburgeren.nl", "staatsexamensnt2.nl", "duo.nl"], parts: TEST },
  japanese: { name: "Japanese (JLPT)", kind: "test", subject: ["jlpt", "japanese"], own: /\bjlpt\b/, sites: ["jlpt.jp", "jpf.go.jp"], parts: TEST },
  korean: { name: "Korean (TOPIK)", kind: "test", subject: ["topik", "korean"], own: /\btopik\b/, sites: ["topik.go.kr"], parts: TEST },
  danish: { name: "Danish (Prøve i Dansk)", kind: "test", subject: ["danish", "prøve i dansk", "prove i dansk"], own: /\bdanish\b/, sites: ["uim.dk", "nyidanmark.dk"], parts: TEST },
  norwegian: { name: "Norwegian (Norskprøve)", kind: "test", subject: ["norwegian", "norskprøve", "norskprove"], own: /\bnorsk\w*\b/, sites: ["hkdir.no", "kompetansenorge.no"], parts: TEST },
  swedish: { name: "Swedish (Swedex, SFI)", kind: "test", subject: ["swedish", "swedex", "sfi"], own: /\b(swedex|sfi)\b/, sites: ["swedex.net", "uhr.se", "skolverket.se"], parts: TEST },
  icelandic: { name: "Icelandic", kind: "test", subject: ["icelandic"], own: /\bicelandic\b/, sites: ["mms.is", "island.is"], parts: TEST },
  swiss: { name: "Swiss language test (fide)", kind: "test", subject: ["fide", "swiss"], own: /\bfide\b/, sites: ["fide-service.ch", "sem.admin.ch"], parts: TEST },
});
/* the products Country Facts collects, in no particular order (the queue orders them — site/queue.mjs) */
export const FACT_PRODUCTS = Object.freeze(Object.keys(PRODUCT_FACTS));
export const partsOfProduct = (p) => PRODUCT_FACTS[p]?.parts ?? [];
/** the AI-searched parts of a product other than AlmiOET (the questions come from the keyword database; the currency is known) */
export const searchedParts = (p) => partsOfProduct(p).filter((k) => ["quote", "body"].includes(PART_INFO[k]?.kind));
export const bodyParts = (p) => partsOfProduct(p).filter((k) => PART_INFO[k]?.kind === "body");
/** an official site of the product's test owner */
export const ownerSite = (p, host) => (PRODUCT_FACTS[p]?.sites ?? []).some((s) => host === s || String(host).endsWith(`.${s}`));
