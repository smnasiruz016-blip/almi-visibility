/**
 * RR-296 · THE TEST PROJECT — made only for testing. A neutral subject (a fictional "Widgetry licence" exam on a reserved .example host),
 * its own site design, a few sourced facts and its real questions. It is no client and no product, and nothing of it is ever published.
 */
export const SITE = "https://widgetry.example";
const SRC = (path) => `https://board.widgetry.example/${path}`;
const claim = (claimId, text, path, quotation) => ({ claimId, text, link: SRC(path), source: "Widgetry Licensing Board", readOn: "2026-10-18", quotation });

export const DESIGN = Object.freeze({
  siteAddress: SITE, brandName: "Widgetry Prep", productLine: "Widgetry Prep — practice for the Widgetry licence exam (a test project).",
  company: { name: "Widgetry Co", href: "https://widgetry.example/", logo: { file: "design/widgetry-logo.png", alt: "Widgetry Co" } },
  logo: { mark: "W", wordmark: "Widgetry Prep" },
  colours: { background: "#FFFFFF", surface: "#FFFFFF", border: "#DDDDDD", primary: "#335577", primaryDeep: "#224466", accent: "#118877", ink: "#111111", text: "#333333", muted: "#555555", footerBackground: "#111111", footerAccent: "#CCAA44", onDark: "#FFFFFF" },
  fonts: { body: "system-ui, sans-serif" }, card: { radius: "12px" },
  nav: [{ label: "Home", href: "https://widgetry.example/" }, { label: "Guides", href: "https://widgetry.example/guides/" }],
  footer: { columns: [{ title: "Widgetry Co", links: [{ label: "Contact", href: "https://widgetry.example/contact" }, { label: "About", href: "https://widgetry.example/about" }] }] },
});

/* the facts, each with its verbatim quotation from the (fictional) board's page */
const FEE = claim("w-fee-1", "The Widgetry licence exam costs WB$120.", "fees", "The exam fee is WB$120 per sitting.");
const VALID = claim("w-valid-1", "Widgetry licence exam results are valid for 2 years from the test date.", "results", "Results remain valid for 2 years from the test date.");
const ONLINE = claim("w-online-1", "The Widgetry licence exam can be taken online from home.", "online", "Candidates may sit the exam online from home.");
const ATTEMPTS = claim("w-attempts-1", "A candidate may sit the Widgetry licence exam up to 3 times in 12 months.", "attempts", "Up to 3 attempts are allowed in any 12 months.");
const ID = claim("w-id-1", "A passport or national ID card is needed on Widgetry licence exam day.", "id", "Bring a passport or national ID card on exam day.");
export const CLAIMS = Object.freeze([FEE, VALID, ONLINE, ATTEMPTS, ID]);
export const KEY_FACTS = Object.freeze([
  { page: "widgetry", claimId: "w-fee-1", value: "WB$120" },
  { page: "widgetry", claimId: "w-valid-1", value: "2 years" },
  { page: "widgetry", claimId: "w-online-1", value: "online from home" },
  { page: "widgetry", claimId: "w-attempts-1", value: "3 attempts" },
  { page: "widgetry", claimId: "w-id-1", value: "passport or national ID card" },
]);
export const quotationOf = (id) => CLAIMS.find((c) => c.claimId === id)?.quotation ?? null;

/** The planned needs: two NEW pages, and one whose answer is already on an existing page (a section), and two refusals as controls. */
export const NEEDS = (existingClaim) => Object.freeze([
  { needId: "n-fee", label: "DEMAND", path: "/guides/widgetry-exam-fee", question: "How much does the Widgetry licence exam cost?", claims: [FEE] },
  { needId: "n-valid", label: "OPPORTUNITY", path: "/guides/widgetry-results-validity", question: "How long are Widgetry licence exam results valid?", claims: [VALID] },
  ...(existingClaim ? [{ needId: "n-existing", label: "DEMAND", path: "/guides/same-as-existing", question: existingClaim.question, claims: [existingClaim.claim] }] : []),
  { needId: "n-merged", label: "MERGED", path: "/guides/not-planned", question: "Is there a Widgetry fee discount?", claims: [FEE] },
  { needId: "n-unsourced", label: "DEMAND", path: "/guides/unsourced", question: "Is the Widgetry exam hard?", claims: [{ claimId: "w-x", text: "It is hard.", link: null, readOn: null }] },
]);

/** The product's real questions for articles: each seen in a recorded source, with its sourced answer. */
export const TOPICS = Object.freeze([
  { topicId: "t-online", label: "DEMAND", question: "Can I take the Widgetry licence exam online?", seenIn: "search_phrase:widgetry-online", claims: [ONLINE] },
  { topicId: "t-attempts", label: "OPPORTUNITY", question: "How many times can I sit the Widgetry licence exam in a year?", seenIn: "public_question:widgetry-attempts", claims: [ATTEMPTS, FEE] }, /* RR-297: the fee is shown here too, so a fee change refreshes a page AND an article */
  { topicId: "t-id", label: "DEMAND", question: "What ID do I need on Widgetry licence exam day?", seenIn: "search_phrase:widgetry-id", claims: [ID],
    /* an opinion: shown only under "General view — not an official fact" */
    generalView: { text: "Arriving early can make exam day calmer.", source: "the test project's own research (an opinion, not a fact)" } },
  /* day 4's only candidates: one already answered by a new page, one with no recorded question (made up) */
  { topicId: "t-fee-again", label: "DEMAND", question: "How much does the Widgetry licence exam cost?", seenIn: "search_phrase:widgetry-fee", claims: [FEE] },
  { topicId: "t-made-up", label: "DEMAND", question: "Why is Widgetry the best licence?", seenIn: "", claims: [FEE] },
]);

/** RR-297: real questions recorded but not yet answered with a source — next month's planned topics (none is made up) */
export const NEXT_TOPICS = Object.freeze([
  { topicId: "t-book", label: "DEMAND", question: "How do I book the Widgetry licence exam?", seenIn: "search_phrase:widgetry-book", claims: [] },
  { topicId: "t-retake", label: "OPPORTUNITY", question: "How soon can I retake the Widgetry licence exam?", seenIn: "public_question:widgetry-retake", claims: [] },
]);

/** RR-297: the rechecks of a later day — the fee CHANGED (re-read, with its new wording), one BLOCKED, one REJECTED, one CHANGED with no new wording recorded */
export const RECHECKS = Object.freeze([
  { record_type: "fact_recheck", factId: "claim:w-fee-1", state: "CHANGED", url: "https://board.widgetry.example/fees", readOn: "2026-10-25",
    newClaim: { text: "The Widgetry licence exam costs WB$135.", quotation: "The exam fee is WB$135 per sitting.", readOn: "2026-10-25", cardValue: "WB$135" } },
  { record_type: "fact_recheck", factId: "claim:w-valid-1", state: "BLOCKED", reason: "BOT_CHECK", url: "https://board.widgetry.example/results" },
  { record_type: "fact_recheck", factId: "claim:w-id-1", state: "REJECTED", reason: "NO_RECORDED_WORD_FOR_WORD_QUOTATION", url: "https://board.widgetry.example/id" },
  { record_type: "fact_recheck", factId: "claim:w-online-1", state: "CHANGED", url: "https://board.widgetry.example/online", readOn: "2026-10-25" },
]);
