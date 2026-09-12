/**
 * THE VERDICT PATH — the one place an outcome may change.
 *
 * ── 🔴 WHY THIS FILE EXISTS ─────────────────────────────────────────────────
 *
 * `transitions.mjs` encoded the law that UNKNOWN never becomes PASS, proved it
 * falsifiable by injection, and was imported **by nothing except its own test**.
 *
 * That is the same shape as `bin/placement-measure.mjs`, which was dead from
 * PR #20 until an audit found it. A law with no caller is not a law; it is a
 * well-tested opinion sitting beside the code it was supposed to govern.
 *
 * This module is the bridge. It translates the facts registry's own outcome
 * vocabulary into the three check outcomes, and every supersession in the
 * registry is judged through `transition()` — so the law now governs real
 * records rather than a table nobody reads.
 *
 * ── 🔴 AND WHY 'not-applicable' MAPS TO UNKNOWN, NOT PASS ───────────────────
 *
 * "This check does not apply" is not "this check passed". A record whose source
 * may not be quoted has `quoteMatchOutcome: "not-applicable"` — lawful, and
 * carrying no evidence whatsoever about the claim. Mapping it to PASS would let
 * an inapplicable check promote a fact, which is exactly the failure item 50
 * forbids: turning an absence of evidence into a pass.
 */

import { transition, canTransition, CHECK_OUTCOMES } from "./transitions.mjs";

/**
 * The registry's vocabulary → the three outcomes.
 *
 * 🔴 Frozen and total. An unmapped value THROWS rather than defaulting, because
 * a default here would silently decide the very thing this module governs.
 */
export const OUTCOME_ALIASES = Object.freeze({
  pass: "PASS",
  fail: "FAIL",
  "could-not-check": "UNKNOWN",
  "not-applicable": "UNKNOWN",
});

export function toCheckOutcome(raw) {
  const mapped = OUTCOME_ALIASES[String(raw)];
  if (!mapped) {
    throw new TypeError(
      `unknown check outcome ${JSON.stringify(raw)} — add it to OUTCOME_ALIASES deliberately, ` +
        "do not let it default",
    );
  }
  return mapped;
}

/** Every outcome field a fact record carries, in one place. */
export const CHECK_FIELDS = Object.freeze([
  "linkCheckOutcome",
  "quoteMatchOutcome",
  "fingerprintOutcome",
]);

/**
 * Judge one supersession: old record → new record, field by field.
 *
 * Returns a list of violations rather than throwing, because the registry
 * validator reports every breach in one pass instead of stopping at the first.
 */
export function judgeSupersession({ previous, next }) {
  const violations = [];
  for (const field of CHECK_FIELDS) {
    const from = toCheckOutcome(previous?.checks?.[field]);
    const to = toCheckOutcome(next?.checks?.[field]);
    if (!canTransition(from, to)) {
      violations.push({
        field,
        from,
        to,
        message:
          `${field}: ${from} → ${to} is forbidden. ` +
          (from === "UNKNOWN" && to === "PASS"
            ? "UNKNOWN never becomes PASS (DoD §170) — take a new measurement and date it, do not promote an absence."
            : "add it to TRANSITIONS deliberately if it is legal."),
      });
    }
  }
  return violations;
}

/**
 * Apply a transition on a single field. Throws on a forbidden edge.
 *
 * This is the callable other code should reach for; `transition()` stays the
 * arbiter underneath so there is exactly one table.
 */
export function promoteOutcome(fromRaw, toRaw) {
  return transition(toCheckOutcome(fromRaw), toCheckOutcome(toRaw));
}

export { CHECK_OUTCOMES };
