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

/* ================================================================== *
 * 🔴 ITEM 50 — A FACT LEAVING UNKNOWN. THE GUARD DECIDES, FROM THE EVIDENCE.
 * ================================================================== */

/** A fact's verification state, in the three check outcomes. Never-checked is an absence, so UNKNOWN. */
export const VERIFICATION_OUTCOME = Object.freeze({ VERIFIED: "PASS", UNKNOWN: "UNKNOWN", UNVERIFIED: "UNKNOWN" });

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const NAMED_CHECKER = /^(human|model):\S/;

/**
 * May this record leave UNKNOWN?
 *
 * UNKNOWN → PASS is not an edge in `transitions.mjs`, and stays not an edge: an
 * absence is never promoted. A record leaves UNKNOWN only on a NEW measurement,
 * so the guard asks the same question of EVERY record whose verification names the
 * UNKNOWN it replaces — "advance to VERIFIED?" — and answers from the evidence:
 *
 *   a check dated AFTER the UNKNOWN · a named checker · an OFFICIAL source that was
 *   actually READ · at least one element of the claim confirmed · NO element not found
 *
 * Any one missing and the answer is REFUSED, with every reason. The verdict's own
 * label is not consulted to decide — it is compared with the decision afterwards,
 * so a record cannot be declared past the guard, nor held back when the evidence is
 * sufficient.
 *
 * Returns null for a record that is not leaving UNKNOWN (outside this population).
 */
/**
 * 🔴 D-GUARD-1 (13 September 2026) — "IS ANYTHING MISSING?" IS NEVER ANSWERED BY THE VERDICT'S OWN NUMBER.
 *
 * The first guard read `elementsNotFound` off the verdict and trusted it: a check fed
 * its own value. A record whose value makes six claims was ingested with three
 * confirmed and `elementsNotFound: 0`, and the guard advanced it. So the answer is now
 * RECONCILED, the way item 14's register is reconciled against its census:
 *
 *   the RECORD declares its elements   `claimElements` — one short stable key per claim its value makes
 *   the VERDICT names what it saw      `elementsConfirmedKeys` (and, where it said so, `elementsNotFoundKeys`)
 *   the GUARD derives the counts       confirmed = declared ∩ named-confirmed; everything else is NOT CONFIRMED
 *
 * An element the verdict does not mention is NOT CONFIRMED — never confirmed by
 * omission. A key the verdict names that the record does not declare is STALE. A key
 * named both ways is contradictory. A supplied count is ignored for the decision, and
 * the validator refuses it once every governed record declares its list. A record with
 * no list cannot have what is missing reconciled, so nothing of it counts as confirmed.
 */
export function reconcileElements(claimElements, verification) {
  const suppliedCount = ["elementsConfirmed", "elementsNotFound"].filter((k) => verification && Object.prototype.hasOwnProperty.call(verification, k));
  const listed = Array.isArray(claimElements) ? [...claimElements] : null;
  const confirmedKeys = Array.isArray(verification?.elementsConfirmedKeys) ? verification.elementsConfirmedKeys : [];
  const notFoundKeys = Array.isArray(verification?.elementsNotFoundKeys) ? verification.elementsNotFoundKeys : [];
  if (!listed) return Object.freeze({ listed: null, confirmed: [], notConfirmed: [], stale: [], contradictory: [], suppliedCount });
  const declared = new Set(listed);
  const stale = [...new Set([...confirmedKeys, ...notFoundKeys])].filter((k) => !declared.has(k));
  const contradictory = confirmedKeys.filter((k) => notFoundKeys.includes(k));
  const confirmed = listed.filter((k) => confirmedKeys.includes(k) && !notFoundKeys.includes(k));
  const notConfirmed = listed.filter((k) => !confirmed.includes(k));
  return Object.freeze({ listed, confirmed, notConfirmed, stale, contradictory, suppliedCount });
}

export function judgeLeavingUnknown(id, verification, claimElements) {
  const previous = verification?.previous;
  if (!previous || VERIFICATION_OUTCOME[previous.state] !== "UNKNOWN") return null;
  const v = verification;
  const e = reconcileElements(claimElements, v);
  const reasons = [];
  /* 🔴 A NEW MEASUREMENT, in both of the ways a record can leave UNKNOWN (13 September 2026):
   *   · replacing an earlier UNKNOWN check — the new check must be dated AFTER it;
   *   · a never-checked record (UNVERIFIED, no earlier check at all) — its FIRST dated check is the new measurement.
   * A never-checked record with no dated check is still refused: an absence is never promoted. */
  const firstCheckOfNeverChecked = previous.state === "UNVERIFIED" && (previous.checkedOn === null || previous.checkedOn === undefined) && ISO_DAY.test(v.checkedOn ?? "");
  const laterThanEarlierCheck = ISO_DAY.test(v.checkedOn ?? "") && ISO_DAY.test(previous.checkedOn ?? "") && v.checkedOn > previous.checkedOn;
  if (!(firstCheckOfNeverChecked || laterThanEarlierCheck)) {
    reasons.push("no NEW measurement — the check is not dated after the UNKNOWN it would replace");
  }
  if (!NAMED_CHECKER.test(v.checkedBy ?? "")) reasons.push("nobody is named as having checked it");
  if (v.sourceTier !== "OFFICIAL") reasons.push(`the source is ${v.sourceTier ?? "untiered"}, not OFFICIAL`);
  /* 🔴 WAS THE SOURCE READ? (13 September 2026, item 50's remaining population)
   *
   * ── THE RULE ────────────────────────────────────────────────────────────────
   * A verdict that records `sourceRead` is taken at its word, and `false` always refuses. The 12 September verdicts
   * were recorded before the field existed; for them "read" is DERIVED from the only evidence they carry — a verdict
   * whose own words name at least one declared element saw that source, because nothing can be named from a page
   * nobody read. A verdict that records no read and names nothing is not read.
   *
   * ── 🔴 INTERIM ONLY — THE INFERENCE MUST BE REPLACED BY A DECLARATION ───────
   * The `readDerived` case is a rule about our PROCESS inferred from the content of our OUTPUT — the self-report
   * trap in a new costume. beta-g's own recorded error E-BG-3 proves it is unsound: the 1,527 page rows were
   * asserted, by name, from memory — and were not in the store. A claim can be named without any source being read.
   *
   * REPLACEMENT: one provenance record for the 12 September 2026 verification run — who, when, which sources were
   * read, the evidence artifact. Records from that run inherit `sourceRead` from that declaration, never from
   * whether their verdict happens to name a claim. One place, human-readable, auditable.
   *
   * SCOPE: this derivation fires on any verdict without `sourceRead`, and in the current registry that is only the
   * 12 September 2026 verdicts. Every verdict recorded after `sourceRead` was added to the field set must state it,
   * and is taken at its word. This branch is scheduled for removal once the 12 September provenance declaration
   * exists — at which point no verdict will lack `sourceRead` and the derivation will never fire. */
  const readDerived = v.sourceRead === undefined && e.listed !== null && e.confirmed.length > 0;
  if (!(v.sourceRead === true || readDerived)) {
    const refused = (v.attempts ?? []).filter((a) => a.status !== 200);
    reasons.push(`the source was not read${refused.length ? ` — ${refused.length} page(s) refused (${[...new Set(refused.map((a) => a.status))].join(", ")})` : v.sourceRead === undefined ? " — the verdict records no read and names no element seen on it" : ""}`);
  }
  if (!e.listed) {
    reasons.push("the record declares no element list — what is missing cannot be reconciled, so nothing of it counts as confirmed");
  } else {
    if (e.confirmed.length === 0) reasons.push("no declared element of the claim is confirmed");
    if (e.notConfirmed.length > 0) {
      reasons.push(`${e.notConfirmed.length} of ${e.listed.length} declared element(s) not confirmed — partial confirmation is not verification`);
    }
  }
  const permitted = reasons.length === 0 && !canTransition("UNKNOWN", "PASS") ? "VERIFIED" : "UNKNOWN";
  return Object.freeze({
    id,
    from: previous.state,
    asked: "VERIFIED",
    decision: permitted === "VERIFIED" ? "ADVANCED_ON_NEW_MEASUREMENT" : "REFUSED",
    permitted,
    declared: v.state,
    agrees: v.state === permitted,
    reasons: Object.freeze(reasons),
    elements: Object.freeze({
      listed: e.listed ? e.listed.length : null,
      confirmed: e.confirmed.length,
      notConfirmed: e.notConfirmed.length,
      stale: Object.freeze(e.stale),
      contradictory: Object.freeze(e.contradictory),
      suppliedCount: Object.freeze(e.suppliedCount),
      missingList: !e.listed,
    }),
  });
}

/** Records that were UNKNOWN in a frozen baseline and are not now — WITHOUT a judgement from the guard. */
export function departuresWithoutJudgement(records, baselineUnknownIds) {
  return records
    .filter((r) => baselineUnknownIds.includes(r?.id) && r?.verificationState !== "UNKNOWN" && !judgeLeavingUnknown(r.id, r.verification))
    .map((r) => r.id);
}

export { CHECK_OUTCOMES };
