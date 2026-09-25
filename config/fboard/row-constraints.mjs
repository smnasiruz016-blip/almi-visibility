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
]);
