/**
 * F12 · INTENT AND QUESTION CLUSTERING — the declared values (acceptance _handoffs d960fa8). Product-neutral: names no product, client,
 * place, entity or exam. A value here is a rule of the engine; which wordings belong together is never here — that is the recorded
 * grouping of one tenant's research batch.
 */

/** C1 · the three places an input may end in, by name. There is no fourth. */
export const PLACES = Object.freeze({ NEED: "A NEED", NAVIGATIONAL: "navigational — no page", NO_NEED_YET: "no need yet" });

/** C2 · the clean-up steps a grouping may DECLARE; a step it does not declare is not applied, and a step not listed here refuses. */
export const CLEAN_UP = Object.freeze({
  case: (s) => s.toLowerCase(),
  spaces: (s) => s.replace(/\s+/g, " ").trim(),
  "end-punctuation": (s) => s.replace(/[?.!\s]+$/u, ""),
});

/** C2 · the only two ways a wording joins a need. */
export const JOINS = Object.freeze({ JUDGEMENT: "A RECORDED JUDGEMENT NAMES IT", IDENTICAL: "IDENTICAL AFTER THE DECLARED CLEAN-UP" });

/** C2 · a grouping that carries any of these is a join by a score, whatever its value. */
export const SCORE_FIELDS = Object.freeze(["score", "similarity", "threshold", "distance", "confidence", "model"]);

/** C3 · an answer that differs by one of these stays INSIDE the one need, as a part; it never makes a second need. */
export const PLACE_AXES = Object.freeze(["COUNTRY", "JURISDICTION"]);

/** C3, C6 · a grouping that carries any of these decides something that is not F12's: a page, or who gets a separate one. */
export const PAGE_FIELDS = Object.freeze(["page", "pages", "separatePage", "audiencePage", "pageCandidate", "url", "slug"]);

/** C4 · who or what may make a grouping decision, and the label the grouping then carries. A grouping is never OBSERVED. */
export const MAKERS = Object.freeze({
  OWNER: "DECIDED BY THE OWNER",
  PERSON: "JUDGED BY A PERSON",
  MACHINE: "INFERRED",
  AI: "INFERRED",
});
export const NEVER_A_GROUPING_LABEL = "OBSERVED";

/** C7 · the owner's sample. */
export const SAMPLE = Object.freeze({ items: 10, minWordings: 3, maxWordings: 5, answers: Object.freeze(["yes", "no"]), answeredBy: "OWNER" });

/** The keys a recorded grouping may hold. Anything else that holds wordings is a place that was not named. */
export const GROUPING_KEYS = Object.freeze(["cleanUp", "needs", "navigational", "noNeedYet", "judgedSame", "note"]);
