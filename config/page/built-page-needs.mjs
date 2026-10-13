/**
 * 🔴 F10 · BUILT PAGES AGAINST THEIR NEEDS — DECLARED (F10 Acceptance Amendment 4, _handoffs c063d3b; Specification Amendment 6).
 *
 * What the built-pages check may say and by what it may say it. Nothing here names a client, a subject or a page; the audience words of
 * a page are declared in the client's own private data, before a run.
 */

/** C4 · the three decisions of a pair of built pages. CANNOT DECIDE is never reported as either of the others. */
export const DECISIONS = Object.freeze({ SAME: "SAME NEED", DIFFERENT: "DIFFERENT NEED", CANNOT: "CANNOT DECIDE" });

/** C4 · the owner's one addition: a subset pair with the same declared audience. Recorded, listed for the owner, never cancelled. */
export const REVIEW_FLAG = "REVIEW";

/** C4 · every decision is the engine's own, from stored need records: INFERRED, never OBSERVED. */
export const DECISION_LABEL = "INFERRED";
export const NEVER_A_DECISION_LABEL = "OBSERVED";

/** C4 · a decision, a flag or a survivor is never made from one of these; a record that carries one is refused. */
export const SCORE_FIELDS = Object.freeze(["similarity", "score", "threshold", "cutoff", "cutOff", "distance", "confidence"]);

/** C5 · the owner's survivor rule (RR-261, point 2 b), in its order. A later step decides only when every earlier one ties. */
export const SURVIVOR_STEPS = Object.freeze(["AUDIENCE MATCH", "SOURCED ANSWERS", "EARLIER BUILD"]);

/** C5 · what a built page's record says about publication. Only a page recorded as not yet published is ever compared or cancelled. */
export const PUBLICATION = Object.freeze({ UNPUBLISHED: "NOT YET PUBLISHED", PUBLISHED: "PUBLISHED", NOT_RECORDED: "PUBLICATION STATE NOT RECORDED" });

/** C5 · the fields that record a page as published. */
export const PUBLISHED_FIELDS = Object.freeze(["publishedAt", "publishedOn", "publishedUrl", "liveUrl"]);

/** C3 · the question-and-answer section of a built page. */
export const SECTION = Object.freeze({ PRESENT: "PRESENT", ABSENT: "ABSENT", MORE: "MORE THAN ONE" });

/** C6 · the result on built pages. Fewer pages than this is an empty population: COULD-NOT-PROVE, never PROVED. */
export const VERDICTS = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT: "COULD-NOT-PROVE" });
export const MIN_PAGES = 2;
