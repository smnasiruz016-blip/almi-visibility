/**
 * F11 · KEYWORD AND SEARCH-LANGUAGE DISCOVERY — the DECLARED sources, the declared pace of the client-AI source, and the general lists
 * a kind rule reads (acceptance: _handoffs AlmiVisibility_F11_ACCEPTANCE_2026-10-13.md; owner ruling …RR-259_F11_SOURCES_AND_RULES.md).
 * Product-neutral: no product, client, exam, place or entity is named here — those lists are DECLARED per product, in its own data.
 */

/** The label a phrase carries follows its SOURCE and nothing else (C1). */
export const LABELS = Object.freeze({ OBSERVED: "OBSERVED", SOURCE_REPORT: "THE SOURCE'S OWN REPORT", INFERRED: "INFERRED" });

/** The six sources, in the owner's order. `reportsVolume`: only a source that itself reports a volume may give one (C5). */
export const SOURCES = Object.freeze({
  CLIENT_AI_GOOGLE: Object.freeze({ letter: "a", label: LABELS.OBSERVED, says: "client-AI-observed Google", reportsVolume: false, kinds: Object.freeze(["AUTOCOMPLETE", "PEOPLE_ALSO_ASK", "PEOPLE_ALSO_SEARCH_FOR"]) }),
  SEARCH_CONSOLE: Object.freeze({ letter: "b", label: LABELS.OBSERVED, says: "the client's own Search Console", reportsVolume: false, kinds: Object.freeze(["QUERY"]) }),
  BING_KEYWORD_RESEARCH: Object.freeze({ letter: "c", label: LABELS.SOURCE_REPORT, says: "Bing Webmaster keyword research — a tool's ideas", reportsVolume: true, kinds: Object.freeze(["KEYWORD_IDEA"]) }),
  KEYWORD_PLANNER_FILE: Object.freeze({ letter: "d", label: LABELS.SOURCE_REPORT, says: "a Keyword Planner file the client exported — a tool's ideas", reportsVolume: true, kinds: Object.freeze(["KEYWORD_IDEA"]) }),
  PERSON_SEEN: Object.freeze({ letter: "e", label: LABELS.OBSERVED, says: "seen by a person", reportsVolume: false, kinds: Object.freeze(["AUTOCOMPLETE", "PEOPLE_ALSO_ASK", "PEOPLE_ALSO_SEARCH_FOR", "SEEN"]) }),
  AI_SUGGESTION: Object.freeze({ letter: "f", label: LABELS.INFERRED, says: "suggested by an AI", reportsVolume: false, kinds: Object.freeze(["SUGGESTION"]) }),
});

/** Source (a) is safe by construction (C2): the pace and the daily cap every run is held to. A hand-in may be slower or smaller, never faster or larger. */
export const CLIENT_AI_POLICY = Object.freeze({ minPauseSeconds: 20, dailyCap: 30, stopReasons: Object.freeze(["CAPTCHA", "UNUSUAL_TRAFFIC"]) });

/** A field its source does not report is named, never guessed (C1). */
export const NOT_REPORTED = "NOT REPORTED";
export const NO_NEED_YET = "NO NEED YET";
export const UNCLASSIFIED = "UNCLASSIFIED";

/** What the owner must do before the LIVE part of a source can be measured (C6). No account, key or cost here is the engine's. */
export const OWNER_STEPS = Object.freeze({
  SEARCH_CONSOLE: "run the Search Console pull again with the client's own access (the recorded pull is read; a fresh pull is the client's act)",
  BING_KEYWORD_RESEARCH: "in the client's own Bing Webmaster Tools, export the keyword research for the seed terms and file it in the research batch as phrase-sources/bing-keyword-research-<date>.json",
  KEYWORD_PLANNER_FILE: "in the client's own Google Ads account, export the Keyword Planner ideas as a file and file it in the research batch as phrase-sources/keyword-planner-<date>.csv, with its country, language and export date beside it",
  AI_SUGGESTION: "have the client's own AI suggest phrases and file them in the research batch as phrase-sources/ai-suggestions-<date>.json",
});

/** The general words a kind rule reads (C3). Lists of places, entities, language variants and the primary language are the product's own. */
export const KIND_RULES = Object.freeze({
  headMaxWords: 2,
  longTailMinWords: 4,
  questionWords: Object.freeze(["who", "what", "when", "where", "why", "how", "which", "is", "are", "can", "do", "does", "should", "will"]),
  comparisonWords: Object.freeze(["vs", "versus", "compare", "compared", "comparison", "difference", "better", "easier", "cheaper", "harder"]),
  intentWords: Object.freeze({
    fee: Object.freeze(["fee", "fees", "cost", "costs", "price", "prices", "charges"]),
    booking: Object.freeze(["book", "booking", "register", "registration", "apply"]),
    dates: Object.freeze(["date", "dates", "schedule", "calendar"]),
    samples: Object.freeze(["sample", "samples", "example", "examples", "practice", "mock", "pdf"]),
    contact: Object.freeze(["contact", "phone", "number", "address", "email"]),
    account: Object.freeze(["login", "account", "portal"]),
    result: Object.freeze(["result", "results", "score", "scores", "grade", "calculator"]),
    place: Object.freeze(["center", "centre", "centers", "centres", "venue", "near"]),
  }),
});
/** The lists a product declares for the kind rules. A list under any other name is not declared and is refused (C3). */
export const DECLARED_LISTS = Object.freeze(["primaryLanguage", "places", "entities", "languageVariants"]);
