/**
 * 🔴 RR-376 item 5 (owner, 5 Nov 2026; AlmiPathway's working plan) · ALMIPATHWAY'S FACTS, FOR THE COLLECTORS' STORE ONLY. Wave 1: Pakistan to Canada, the UK, Australia and the USA, and India to Canada, the UK, Australia and Germany, all for Study. For each: documents, proof of funds, the English-test gate, credential evaluation, fees and timelines.
 * THE TRUTH RULES: official sources only, each with its date. A blocked official site is never guessed: the row says "verify on official", with the link, and goes on the owner's "Read these pages myself" list. Guidance, never advice. The almi-pathway repository is not touched: its pages come later, from this store. Pure.
 */
export const PATHWAY_TOPIC = Object.freeze({ id: "pathway", name: "AlmiPathway", subject: "AlmiPathway", words: Object.freeze(["almipathway", "study visa", "student visa"]) });
export const WAVE_1 = Object.freeze([["Pakistan", "Canada"], ["Pakistan", "United Kingdom"], ["Pakistan", "Australia"], ["Pakistan", "United States"], ["India", "Canada"], ["India", "United Kingdom"], ["India", "Australia"], ["India", "Germany"]].map(([from, to]) => Object.freeze({ from, to, purpose: "Study" })));
/* the governments' and official evaluators' own starting pages. Each is READ before anything is said from it */
export const OFFICIAL_PAGES = Object.freeze({
  Canada: Object.freeze(["https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html", "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html", "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5269-applying-study-permit-outside-canada.html"]),
  "United Kingdom": Object.freeze(["https://www.gov.uk/student-visa", "https://www.gov.uk/student-visa/money", "https://www.gov.uk/student-visa/documents", "https://www.gov.uk/student-visa/knowledge-of-english"]),
  Australia: Object.freeze(["https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500", "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/higher-education-sector", "https://www.studyaustralia.gov.au/en/plan-your-move/your-guide-to-visas"]),
  "United States": Object.freeze(["https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html", "https://studyinthestates.dhs.gov/"]),
  Germany: Object.freeze(["https://www.auswaertiges-amt.de/en/visa-service/visabestimmungen-node", "https://www.make-it-in-germany.com/en/study-training/studies-in-germany/visa", "https://www.daad.de/en/studying-in-germany/requirements/"]),
  Pakistan: Object.freeze(["https://www.hec.gov.pk/english/services/students/Degree%20Attestation%20System/Pages/default.aspx"]),
  India: Object.freeze(["https://www.mea.gov.in/apostille.htm"]),
});
export const OFFICIAL_HOSTS = Object.freeze(["canada.ca", "gov.uk", "homeaffairs.gov.au", "studyaustralia.gov.au", "state.gov", "dhs.gov", "auswaertiges-amt.de", "make-it-in-germany.com", "daad.de", "hec.gov.pk", "mea.gov.in", "wes.org", "enic.org.uk", "ecctis.com"]);
const inThe = (c) => (/^(?:United Kingdom|United States)$/.test(c) ? `the ${c}` : c);
export const PARTS = Object.freeze([
  ["documents", (c) => `What documents does a student from ${c.from} need for a study visa for ${inThe(c.to)}?`],
  ["funds", (c) => `How much proof of funds does a student from ${c.from} need for a study visa for ${inThe(c.to)}?`],
  ["english", (c) => `Which English tests and scores does a study visa for ${inThe(c.to)} accept from a student from ${c.from}?`],
  ["evaluation", (c) => `Does a student from ${c.from} need a credential evaluation to study in ${inThe(c.to)}, and from which body?`],
  ["fees", (c) => `What is the visa application fee for a student from ${c.from} going to ${inThe(c.to)}?`],
  ["timelines", (c) => `How long does a study visa for ${inThe(c.to)} take for a student from ${c.from}?`],
]);
/** every question of Wave 1, in the owner's order */
export const pathwayQuestions = (corridors = WAVE_1) => corridors.flatMap((c) => PARTS.map(([part, ask]) => ({ question: ask(c), corridor: `${c.from} to ${c.to} (${c.purpose})`, part, from: c.from, to: c.to, pages: [...(OFFICIAL_PAGES[c.to] ?? []), ...(OFFICIAL_PAGES[c.from] ?? [])] })));
