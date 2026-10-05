/**
 * F36 · URL RIGHT-TO-EXIST — ONE OUTCOME FOR EVERY PROPOSED NEW URL (acceptance _handoffs 2635153, RR-87).
 *
 * Spec row: "Require a specific useful reason for every proposed new URL." V3 §11 G9: "Write a specific
 * WHY_THIS_URL_DESERVES_TO_EXIST based on distinct need and value"; §19: "specific and evidence-backed"; §13's failure: "Country or
 * keyword substitution without genuine value"; §2: "Improve before create".
 *
 * ── THE TWO MEASURABLE PARTS ────────────────────────────────────────────────────────────────────────
 *
 *   SPECIFIC     Gate A's own part-4 judgement (../gate-a/why-this-url.mjs judgeWhy), REUSED unchanged: a declared human need and
 *                distinct value, naming more than the variable, not a sibling's reason with the variable swapped, not near-identical
 *                to any sibling's.
 *   NOT SERVED   the existing-page decision (F34, carrying F33's judgement): the need is not already served — no existing page in a
 *                COMPLETE population, or F33 NOT COVERED.
 *
 * ── THREE OUTCOMES, NEVER TWO ─────────────────────────────────────────────────────────────────────
 *
 *   ESTABLISHED    both parts pass
 *   REFUSED        a named failure: no reason, a variable-only / templated / near-identical reason, or an existing page covers the need
 *   CANNOT_DECIDE  a part could not be judged: a sibling reason missing, a rationale overlap with no recorded substance review (S38),
 *                  the existing-page information refused, or F33 unable to decide. A lone page with no sibling is NOT undecided for that
 *                  alone (D1; the owner's record B, _handoffs d014ca1).
 *   A named failure outranks a missing judgement.
 *
 * 🔴 EVERY OUTCOME CARRIES THE RESIDUE THAT CANNOT BE MEASURED — whether the named need is real and the value genuinely distinct in
 * substance (Gate A's WHY_NOT_ENFORCED). ESTABLISHED never means more than the two measured parts.
 *
 * Pure. No product is named here.
 */
import { judgeWhy, WHY_NOT_ENFORCED } from "../gate-a/why-this-url.mjs";
import { EXISTING_PAGE_OUTCOMES } from "./existing-page-first.mjs";

export const RIGHT_TO_EXIST = Object.freeze({ ESTABLISHED: "ESTABLISHED", REFUSED: "REFUSED", CANNOT_DECIDE: "CANNOT_DECIDE" });
export const NOT_MEASURED_RESIDUE = WHY_NOT_ENFORCED;

/** The not-served part, from the existing-page decision. */
export function notServedPart(decision) {
  if (!decision || typeof decision !== "object") return { state: "CANNOT_DECIDE", reason: "NO_EXISTING_PAGE_DECISION" };
  if (decision.mayProduce) return { state: "PASS", reason: decision.reason, outcome: decision.outcome };
  if (decision.outcome === EXISTING_PAGE_OUTCOMES.REFUSED) return { state: "CANNOT_DECIDE", reason: decision.reason, outcome: decision.outcome };
  const covered = decision.needCoverage?.outcome === "COVERED" || decision.outcome === EXISTING_PAGE_OUTCOMES.IMPROVE || decision.reason === "AN_EXISTING_PAGE_SERVES_THIS_INTENT";
  return covered
    ? { state: "FAIL", reason: "AN_EXISTING_PAGE_COVERS_THE_NEED — improve it, do not create", outcome: decision.outcome }
    : { state: "CANNOT_DECIDE", reason: decision.reason, outcome: decision.outcome };
}

/** The gate's one rule: a candidate may be produced only when the existing-page check lets it AND its right to exist is ESTABLISHED. */
export function mayProduceCandidate(existingPageDecision, rte) {
  return Boolean(existingPageDecision?.mayProduce) && rte?.outcome === RIGHT_TO_EXIST.ESTABLISHED;
}

/**
 * @param {{ slug: string, spec: object, siblings: {slug: string, spec: object}[], variants: string[], existingPageDecision: object, rationaleReviews?: object[] }} input
 *   rationaleReviews  the recorded substance reviews of rationale pairs (S38) — none recorded is [] and leaves an overlap undecided
 */
export function rightToExist({ slug, spec, siblings = [], variants = [], existingPageDecision, rationaleReviews = [] }) {
  const why = judgeWhy(slug, spec, siblings, variants, { reviews: rationaleReviews });
  const specific = why.state === "PASS" ? { state: "PASS" } : why.state === "FAIL" ? { state: "FAIL", kind: why.kind, reason: why.reason } : { state: "CANNOT_DECIDE", reason: why.reason };
  const notServed = notServedPart(existingPageDecision);
  const parts = Object.freeze({ specific: Object.freeze(specific), notServed: Object.freeze(notServed) });
  const failed = Object.entries(parts).filter(([, p]) => p.state === "FAIL").map(([k]) => k);
  const undecided = Object.entries(parts).filter(([, p]) => p.state === "CANNOT_DECIDE").map(([k]) => k);
  const outcome = failed.length ? RIGHT_TO_EXIST.REFUSED : undecided.length ? RIGHT_TO_EXIST.CANNOT_DECIDE : RIGHT_TO_EXIST.ESTABLISHED;
  return Object.freeze({ slug, outcome, parts, failed: Object.freeze(failed), undecided: Object.freeze(undecided), checks: why.checks, notMeasured: NOT_MEASURED_RESIDUE });
}
