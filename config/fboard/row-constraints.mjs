/**
 * 🔴 CONSTRAINTS ON FUTURE F-ROWS — recorded now, enforced by the board (src/fboard/board.mjs boardErrors) on every build.
 *
 * A PROMISE IN A COMMENT IS NOT A GUARD. A constraint here makes an F-row's acceptance UNFREEZABLE unless its frozen
 * four-part contract carries the named precondition: a frozen acceptance that lacks it turns the board invalid, and every
 * board check (tests, CI) refuses it. Each constraint is backed by a CURRENT ruling in the authority register; a constraint
 * whose ruling is not CURRENT is itself a board error, so it cannot outlive or quietly lose its authority.
 *
 * Copied from committed rulings, never authored here.
 */
export const ROW_CONSTRAINTS = Object.freeze([
  Object.freeze({
    featureId: "F79",
    name: "Evidence cache before re-research",
    /* The precondition must appear, in these words, in one of the four frozen clauses (INPUT, EXPECTED, FAILURE, EVIDENCE). */
    requires: "F02 tenant-isolation conformance",
    why: "F02's learning limbs are deferred to F79; F79 may not create or reuse learning or evidence-cache data outside the F02 boundary. F02 reopens if F79 bypasses F02.",
    authority: Object.freeze({ propositionId: "OWNER_RULING_F02_DISPOSITION", scope: Object.freeze(["ALMIVISIBILITY", "F02"]) }),
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-25_F02_DISPOSITION.md", commit: "1145012eb6a6109c3367de033ed9e4f0a71a3e05" }),
  }),
  /* RR-127 §2a — the owner's F40 ruling REPLACES the universal word floor with an evidence-based check. These two make F40's future
   * acceptance unfreezable unless it carries that check and refuses any word floor; they decide nothing about a page by themselves. */
  Object.freeze({
    featureId: "F40",
    name: "Adaptive page-quality gate",
    requires: "whether the page answers its stated need",
    why: "The owner's ruling: the assessment is whether the page answers its stated need accurately and sufficiently; length is not the measure.",
    authority: Object.freeze({ propositionId: "OWNER_RULING_F40_ANSWER_SUFFICIENCY", scope: Object.freeze(["ALMIVISIBILITY", "F40"]) }),
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-10-02_F40_ANSWER_SUFFICIENCY.md", commit: "4761236e81f1fe6f0bd0d03172132d4109fcb36f" }),
  }),
  Object.freeze({
    featureId: "F40",
    name: "Adaptive page-quality gate",
    requires: "no fixed minimum and no fixed maximum page word count",
    why: "The owner's ruling removes the universal 350-word floor; no word count, minimum or maximum, may decide F40.",
    authority: Object.freeze({ propositionId: "OWNER_RULING_F40_ANSWER_SUFFICIENCY", scope: Object.freeze(["ALMIVISIBILITY", "F40"]) }),
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-10-02_F40_ANSWER_SUFFICIENCY.md", commit: "4761236e81f1fe6f0bd0d03172132d4109fcb36f" }),
  }),
]);
