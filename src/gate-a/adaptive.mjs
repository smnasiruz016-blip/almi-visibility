/**
 * 🔴 GATE A's ADAPTIVE PAGE FLOOR — amendment 7, row 61.
 *
 * Three numeric readings were superseded by the owner on 21 September 2026: ≥5 verified sourced
 * facts, ≥350 unique words, and automatic rejection above 40% sibling overlap. They are replaced by
 * rules that judge what the page actually does rather than how much of it there is.
 *
 * ── WHY THIS MODULE IS A LIST OF NAMED RULES AND NOT A BRANCH ──────────────
 *
 * The floor it replaces was three numbers: crude, but anybody could read them and nobody could argue
 * about them. Adaptive rules lose that unless they are written down as separately testable things,
 * so each rule here owns its id, its requirement and its predicate, and the caller reports WHICH one
 * refused rather than only that something did.
 *
 * 🔴 EVERY RULE IS DECIDABLE, AND EACH DECIDES ON A DECLARATION.
 *
 * "Material factual claim", "completely answers one intent" and "distinct user value" are judgements
 * a model must never make silently on a page's behalf. So none of them is inferred from prose: each
 * is read from something the SPEC DECLARES. A spec that declares nothing cannot be judged, and an
 * unjudgeable part is NOT TESTED, which refuses. That is the same law R4 applies to claim
 * dimensions — an absent declaration is not an inapplicable one, it is undeclared, and the guard
 * refuses.
 *
 * 🔴 WHAT THE OLD NUMBERS CAUGHT AND THESE RULES DO NOT. A completely supported page citing ONE
 * claim now passes where five were demanded, and a page answering every declared section in few
 * words now passes where 350 were demanded. Both losses are deliberate and are recorded in
 * amendment 7 §4. They are not side effects of this file.
 */

/* 🔴 ONE VOCABULARY, NOT TWO. These are the construction path's own state strings, repeated here
 * rather than imported so this module stays free of a circular dependency — and pinned by a test, so
 * the two can never drift apart again. They drifted once: an invented "NOT_TESTED" did not match
 * "BLOCKED / NOT TESTED", and a refusal would have been recorded in neither accounting list. */
export const PASS = "PASS";
export const FAIL = "FAIL";
export const NOT_TESTED = "BLOCKED / NOT TESTED";
/** Above the overlap bar, the page is not rejected by the percentage — it must be REVIEWED. */
export const REVIEW_REQUIRED = "REVIEW_REQUIRED";

/** The bar that now triggers review instead of rejection. The number did not change; its effect did. */
export const OVERLAP_REVIEW_TRIGGER = 0.40;

const norm = (s) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ").toLowerCase() : "");
const filled = (s) => typeof s === "string" && s.trim() !== "";

/**
 * A · FACT SUFFICIENCY — every material factual claim the page MAKES must be supported.
 *
 * No count. One unsupported claim fails a page however many supported ones it carries, and a page
 * carrying a single supported claim passes.
 *
 * 🔴 A ZERO-CLAIM PAGE MUST SAY SO OUT LOUD. Silence is not a declaration that the page is a
 * non-factual utility; it is far more often a spec that forgot its claims. So a page citing no claim
 * passes only where it DECLARES `makesNoMaterialFactualClaim`, and otherwise it is a DATA GAP.
 *
 * @param {{ claimIds: string[], unsupported: string[], declaresNoMaterialFactualClaim: boolean }} x
 */
export function judgeFactSufficiency({ claimIds = [], unsupported = [], declaresNoMaterialFactualClaim = false }) {
  if (claimIds.length === 0) {
    return declaresNoMaterialFactualClaim
      ? { rule: "A", state: PASS, kind: null, reason: null, detail: "the spec cites no claim and DECLARES it makes no material factual claim" }
      : {
          rule: "A", state: FAIL, kind: "DATA GAP",
          reason: "the spec cites no claim and does not declare that it makes no material factual claim — silence is not a declaration, and a page may not state fees, scores, deadlines, eligibility or policy without support",
          detail: null,
        };
  }
  if (unsupported.length > 0) {
    return {
      rule: "A", state: FAIL, kind: "DATA GAP",
      reason: `${unsupported.length} of ${claimIds.length} cited claim(s) lack a fresh approved source: ${unsupported.join(", ")}. Support is never padded, inferred or counted around`,
      detail: null,
    };
  }
  return { rule: "A", state: PASS, kind: null, reason: null, detail: `all ${claimIds.length} cited claim(s) resolve to a fresh approved source` };
}

/**
 * B · CONTENT COMPLETENESS — the declared coverage must actually be answered, without filler.
 *
 * No floor and no ceiling. The spec's own declared sections ARE its coverage, so completeness is
 * measurable against them; a spec that declares none cannot be judged at all.
 *
 * 🔴 FILLER IS CAUGHT STRUCTURALLY, NOT BY LENGTH. Two sections carrying the same answer is padding
 * whichever way it is worded, and it is the shape length floors were really aiming at.
 */
export function judgeCompleteness({ sections }) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return {
      rule: "B", state: NOT_TESTED, kind: null,
      reason: "the spec declares no sections, so the coverage this page promises to answer is unknown — completeness cannot be judged, and an unjudgeable part never passes",
      detail: null,
    };
  }
  const unanswered = sections
    .map((s, i) => ({ i, heading: s?.heading, framing: s?.framing }))
    .filter((s) => !filled(s.heading) || !filled(s.framing));
  if (unanswered.length > 0) {
    return {
      rule: "B", state: FAIL, kind: "REJECT",
      reason: `${unanswered.length} of ${sections.length} declared section(s) are not answered: ${unanswered.map((s) => `#${s.i + 1} ${filled(s.heading) ? `"${s.heading}"` : "(no heading)"}`).join(", ")}`,
      detail: null,
    };
  }
  const seen = new Map();
  const duplicated = [];
  for (const [i, s] of sections.entries()) {
    const k = norm(s.framing);
    if (seen.has(k)) duplicated.push(`#${seen.get(k) + 1} and #${i + 1}`);
    else seen.set(k, i);
  }
  if (duplicated.length > 0) {
    return {
      rule: "B", state: FAIL, kind: "REJECT",
      reason: `${duplicated.length} pair(s) of declared sections carry the SAME answer (${duplicated.join("; ")}) — text repeated to fill a page is filler, and filler never completes an intent`,
      detail: null,
    };
  }
  return { rule: "B", state: PASS, kind: null, reason: null, detail: `all ${sections.length} declared section(s) answered, none duplicated` };
}

/**
 * C · OVERLAP AND DUPLICATION — the percentage triggers a review; it no longer rejects by itself.
 *
 * 🔴 AND DUPLICATION IS NOW CAUGHT WHERE THE NUMBER NEVER LOOKED. Two pages may share almost no
 * wording and still be the same page: the old bar could not see that at all. A declared distinct
 * value that matches a sibling's fails at ANY overlap.
 *
 * @param {{ maxOverlap: number|null, against: string|null, distinctUserValue: unknown,
 *           siblingDistinctValues: string[] }} x
 */
export function judgeOverlap({ maxOverlap, against = null, distinctUserValue, siblingDistinctValues = [] }) {
  const mine = norm(typeof distinctUserValue === "string" ? distinctUserValue : "");
  /* duplicate value first — it is true at any overlap, so a low number must not excuse it */
  if (filled(mine) && siblingDistinctValues.some((v) => norm(v) === mine)) {
    return {
      rule: "C", state: FAIL, kind: "REJECT", maxOverlap, against,
      reason: "its recorded distinct user value is identical to a sibling's — duplicate value fails even when the wording differs, and overlap does not enter into it",
      reviewRequired: false,
    };
  }
  if (typeof maxOverlap !== "number" || Number.isNaN(maxOverlap)) {
    return { rule: "C", state: NOT_TESTED, kind: null, maxOverlap, against, reason: "overlap was not measured, and an unmeasured part never passes", reviewRequired: false };
  }
  if (maxOverlap <= OVERLAP_REVIEW_TRIGGER) {
    return { rule: "C", state: PASS, kind: null, maxOverlap, against, reason: null, reviewRequired: false };
  }
  /* above the trigger: MANDATORY REVIEW. It passes only on a RECORDED distinct value. */
  if (!filled(mine)) {
    return {
      rule: "C", state: FAIL, kind: "REJECT", maxOverlap, against, reviewRequired: true,
      reason: `overlap ${maxOverlap.toFixed(4)} with ${against} is above ${OVERLAP_REVIEW_TRIGGER} and triggers MANDATORY REVIEW; no distinct user value is RECORDED, and an unreviewed high overlap is refused — the percentage did not reject it, the missing review did`,
    };
  }
  return {
    rule: "C", state: PASS, kind: null, maxOverlap, against, reviewRequired: true,
    reason: null,
    detail: `overlap ${maxOverlap.toFixed(4)} is above the ${OVERLAP_REVIEW_TRIGGER} review trigger and passed review on a RECORDED distinct user value`,
  };
}

/** The rules, enumerable — so a reader can count them without reading control flow. */
export const ADAPTIVE_RULES = Object.freeze([
  Object.freeze({ id: "A", name: "fact sufficiency", supersedes: "the ≥5 verified-sourced-facts floor" }),
  Object.freeze({ id: "B", name: "content completeness", supersedes: "the ≥350-unique-word floor" }),
  Object.freeze({ id: "C", name: "overlap and duplication", supersedes: "automatic rejection above 40% overlap" }),
  Object.freeze({ id: "D", name: "right to exist", supersedes: null }),
]);
