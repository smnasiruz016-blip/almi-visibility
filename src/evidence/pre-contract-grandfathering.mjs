/**
 * 🔴 THE PRE-CONTRACT GRANDFATHERING RULE — the owner's ruling, as DATA the guard evaluates.
 *
 * R4's declaration contract governs every verification dated after its cut-off, and every UNDATED
 * one. Records checked on or before the cut-off pre-date it, and the owner has ruled that such a
 * record may satisfy "labelled on its face" WITHOUT retrospective claimDimensions — but only when
 * five things are true at once.
 *
 * ── WHY THE CONDITIONS LIVE HERE AS DATA AND NOT AS A BRANCH ───────────────
 *
 * An exemption written as `if (date <= X) return PASS` is a rule nobody can enumerate, test one
 * limb of, or find again in six months. So each condition is a named entry with its own predicate,
 * and the verdict is the conjunction of the list. A test can then drive ONE condition false and see
 * exactly which refusal it produces, and a reader can count the conditions without reading control
 * flow.
 *
 * 🔴 THE FIVE ARE CONJUNCTIVE. A record failing any one is NOT grandfathered — it is REFUSED, not
 * excused. Grandfathering removes the obligation to DECLARE dimensions retrospectively; it removes
 * no evidence obligation whatever.
 *
 * ── CONDITION 3 IS STRUCTURAL, NOT A NAME ─────────────────────────────────
 *
 * "A named human checker" is decided by the schema's TYPED PREFIX — `human:` versus `model:` in
 * FACT_CHECKED_BY_PATTERN — never by reading a name, matching a substring, or keeping a list of
 * known tool names. This registry's law is that a fact check names a person: a model may PROPOSE a
 * fact, it may never BE the source. The prefix is how that law is machine-readable.
 *
 * 🔴 NOTE WHAT THIS TIGHTENS. `judgeLeavingUnknown` requires a NAMED checker and accepts either
 * prefix, because its question is "did anybody sign this?". Grandfathering asks a narrower one —
 * "did a PERSON sign it?" — and a `model:` signature, though schema-valid, fails condition 3.
 */
import { FACT_CHECKED_BY_PATTERN, DECLARATION_CONTRACT_AFTER } from "../facts/schema.mjs";
import { underDeclarationContract, reconcileElements } from "./verdict.mjs";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The typed prefix that marks a checker as a person. Structural — never a name or a substring. */
export const NAMED_HUMAN_CHECKER = /^human:/;

/** Is this checker a named human, by the schema's own type marker? */
export function isNamedHumanChecker(checkedBy) {
  return typeof checkedBy === "string" && NAMED_HUMAN_CHECKER.test(checkedBy) && FACT_CHECKED_BY_PATTERN.test(checkedBy);
}

/**
 * The ruling, enumerable. Each condition owns its id, its words and its predicate, so a caller can
 * report WHICH one failed rather than only that something did.
 *
 * @typedef {{ verificationState: string|undefined, verification: object|undefined,
 *             claimElements: string[]|undefined, governed: boolean }} Subject
 */
export const PRE_CONTRACT_CONDITIONS = Object.freeze([
  Object.freeze({
    id: "DATE_EXEMPT",
    requirement: "the record is lawfully date-exempt from the declaration contract",
    holds: ({ verification }) => !underDeclarationContract(verification),
  }),
  Object.freeze({
    id: "STATE_EXPLICIT",
    requirement: "verificationState is explicit on the record",
    holds: ({ verificationState }) => typeof verificationState === "string" && verificationState.trim() !== "",
  }),
  Object.freeze({
    id: "NAMED_HUMAN_AND_DATE",
    requirement: "the verification carries a named human checker and a date",
    holds: ({ verification }) => isNamedHumanChecker(verification?.checkedBy) && ISO_DAY.test(verification?.checkedOn ?? ""),
  }),
  Object.freeze({
    id: "ELEMENTS_RECONCILE",
    requirement: "the real guard reconciles every governed claimElement with notConfirmed = 0",
    /* 🔴 Only a GOVERNED record carries this obligation. A record the guard never judges has no
     * element to reconcile, and refusing it would be over-blocking (requirement 10). */
    holds: ({ governed, claimElements, verification }) =>
      !governed || (reconcileElements(claimElements, verification).notConfirmed?.length ?? 0) === 0,
  }),
  Object.freeze({
    id: "NO_PROMOTION_OF_UNKNOWN",
    requirement: "no UNKNOWN record is promoted and no missing evidence is inferred",
    /* A record declared VERIFIED must carry the verification that says so. An absent verification
     * behind a VERIFIED label is precisely "missing evidence inferred into a PASS". */
    holds: ({ verificationState, verification }) => verificationState !== "VERIFIED" || Boolean(verification),
  }),
]);

export const GRANDFATHERING = Object.freeze({
  cutOff: DECLARATION_CONTRACT_AFTER,
  conditionIds: Object.freeze(PRE_CONTRACT_CONDITIONS.map((c) => c.id)),
  conjunctive: true,
  appliesTo: "a verification dated on or before the cut-off; an undated or malformed-dated record is never grandfathered",
});

/**
 * Judge one record against the ruling.
 *
 * 🔴 IT NEVER RETURNS "PASS". It returns which regime the record is in and which conditions hold;
 * whether that permits advancing is the caller's existing evidence law, unchanged.
 *
 * @returns {{ regime: "GRANDFATHERED"|"R4_GOVERNED"|"REFUSED_PRE_CONTRACT",
 *             conditions: Record<string, boolean>, failed: string[] }}
 */
export function judgeGrandfathering(subject) {
  const conditions = {};
  const failed = [];
  for (const c of PRE_CONTRACT_CONDITIONS) {
    const ok = Boolean(c.holds(subject));
    conditions[c.id] = ok;
    if (!ok) failed.push(c.id);
  }
  /* 🔴 THE DATE DECIDES THE REGIME FIRST. A record under the contract is R4-GOVERNED whatever else
   * is true of it — it is not "failing grandfathering", it was never eligible for it, and it must
   * declare its dimensions explicitly. Collapsing the two would let an undated record be reported
   * as a near-miss rather than as a record in the wrong regime. */
  if (!conditions.DATE_EXEMPT) return Object.freeze({ regime: "R4_GOVERNED", conditions: Object.freeze(conditions), failed: Object.freeze(failed) });
  return Object.freeze({
    regime: failed.length === 0 ? "GRANDFATHERED" : "REFUSED_PRE_CONTRACT",
    conditions: Object.freeze(conditions),
    failed: Object.freeze(failed),
  });
}
