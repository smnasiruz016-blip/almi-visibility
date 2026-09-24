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
 * ── 🔴 AND WHY 'not-applicable' NEVER MAPS TO PASS ──────────────────────────
 *
 * "This check does not apply" is not "this check passed". A record whose source
 * may not be quoted has `quoteMatchOutcome: "not-applicable"` — lawful, and
 * carrying no evidence whatsoever about the claim. Mapping it to PASS would let
 * an inapplicable check promote a fact, which is exactly the failure item 50
 * forbids: turning an absence of evidence into a pass. Since the F06 correction
 * (24 September 2026) it is NOT_APPLICABLE, not UNKNOWN, and shares UNKNOWN's edges:
 * it never becomes PASS.
 */

import { transition, canTransition, CHECK_OUTCOMES } from "./transitions.mjs";
import { CLAIM_DIMENSIONS, DIMENSION_NOT_APPLICABLE, DIMENSION_REQUIRED_BY, DECLARATION_CONTRACT_AFTER } from "../facts/schema.mjs";

/**
 * The registry's vocabulary → an outcome.
 *
 * 🔴 Frozen and total. An unmapped value THROWS rather than defaulting, because
 * a default here would silently decide the very thing this module governs.
 *
 * ── 🔴 F06 CORRECTION (owner ruling, 24 September 2026) — FOUR BRANCHES, AND TWO OF THEM ARE DECIDED BY STRUCTURE ──
 *
 * This table used to collapse both inconclusive literals into UNKNOWN. That erased two F06 distinctions:
 *   "not-applicable"  a check that is not lawful or not meaningful for the record — NOT_APPLICABLE, never UNKNOWN;
 *   "could-not-check" is written by the record constructor as a DEFAULT (src/facts/record.mjs) and by every checker
 *                     path that did not reach a result. A check that was reached and could not establish is UNKNOWN;
 *                     one that was never performed is NOT_MEASURED; the literal alone cannot tell them apart.
 * So only the two conclusive literals decide here. The other two name the rule that decides, and `placeCheckOutcome`
 * applies it to the record's own POSITIVE structure. Where no positive structure decides, the answer is UNMAPPED:
 * an empty or absent field is never proof.
 */
export const OUTCOME_ALIASES = Object.freeze({
  pass: Object.freeze({ state: "PASS", decidedBy: "LITERAL" }),
  fail: Object.freeze({ state: "FAIL", decidedBy: "LITERAL" }),
  "not-applicable": Object.freeze({ state: "NOT_APPLICABLE", decidedBy: "STRUCTURE", requires: "a declared scope and reason, else UNMAPPED" }),
  "could-not-check": Object.freeze({ state: null, decidedBy: "STRUCTURE", requires: "a positive record that the check was reached (UNKNOWN) or was not performed (NOT_MEASURED), else UNMAPPED" }),
});

/** The display word for an outcome that no rule may place. */
export const UNMAPPED_OUTCOME = "UNMAPPED";

/** The placed outcomes a supersession is judged over. The three absences share UNKNOWN's edges: none becomes PASS. */
export const PLACED_OUTCOMES = Object.freeze(["PASS", "FAIL", "UNKNOWN", "NOT_MEASURED", "NOT_APPLICABLE"]);
const EDGE_CLASS = Object.freeze({ PASS: "PASS", FAIL: "FAIL", UNKNOWN: "UNKNOWN", NOT_MEASURED: "UNKNOWN", NOT_APPLICABLE: "UNKNOWN" });

function aliasOf(raw) {
  const alias = Object.prototype.hasOwnProperty.call(OUTCOME_ALIASES, String(raw)) ? OUTCOME_ALIASES[String(raw)] : null;
  if (!alias) {
    throw new TypeError(
      `unknown check outcome ${JSON.stringify(raw)} — add it to OUTCOME_ALIASES deliberately, ` +
        "do not let it default",
    );
  }
  return alias;
}

/**
 * The literal alone — ONLY for the two literals that decide by themselves.
 * The inconclusive two THROW: "never decide from the old label alone" (owner ruling, 24 September 2026).
 */
export function toCheckOutcome(raw) {
  const alias = aliasOf(raw);
  if (alias.decidedBy !== "LITERAL") {
    throw new TypeError(`check outcome ${JSON.stringify(raw)} is not decided by its literal — place it from the record's structure (placeCheckOutcome)`);
  }
  return alias.state;
}

/** Every outcome field a fact record carries, in one place. */
export const CHECK_FIELDS = Object.freeze([
  "linkCheckOutcome",
  "quoteMatchOutcome",
  "fingerprintOutcome",
]);

/** The fields a derived fact cannot have performed: it has no source document (F28 forbids one). */
const isDeclaredDerived = (r) =>
  r?.kind === "derived" && Array.isArray(r?.derivation?.inputs) && r.derivation.inputs.length > 0 && (r.source === undefined || r.source === null);

/**
 * 🔴 PLACE ONE CHECK OUTCOME from the record's own structure.
 *
 *   pass / fail          PASS / FAIL — the check ran, and the literal says how it ended
 *   not-applicable       NOT_APPLICABLE with scope and reason — only where a declared rule makes the check inapplicable:
 *                        quoteMatch on a record whose DECLARED `sourceQuotable` is false or "unknown" (F6, F9: the licence
 *                        does not permit, or has not been shown to permit, a stored quote — nothing is attempted)
 *   could-not-check      UNKNOWN only on a positive record that THIS check was REACHED for THIS record (`attempt`, a
 *                        checker's own result: { recordId, field, reached: true, outcome: "could-not-check" });
 *                        NOT_MEASURED only where the structure proves it was not performed — a declared derived fact
 *                        (kind "derived", a cited derivation, no source) has no source document to check
 *   anything else        UNMAPPED, with the reason — never a guess
 */
export function placeCheckOutcome({ record, field, attempt = null }) {
  if (!CHECK_FIELDS.includes(field)) throw new TypeError(`${JSON.stringify(field)} is not a check field (${CHECK_FIELDS.join(", ")})`);
  const originalOutcome = record?.checks?.[field];
  const alias = aliasOf(originalOutcome);
  const base = { field, originalOutcome };
  const unmapped = (why) => Object.freeze({ ...base, state: UNMAPPED_OUTCOME, unmapped: true, why });
  if (alias.decidedBy === "LITERAL") return Object.freeze({ ...base, state: alias.state, basis: "CHECK_RAN" });

  if (originalOutcome === "not-applicable") {
    const q = record?.sourceQuotable;
    if (field === "quoteMatchOutcome" && (q === false || q === "unknown")) {
      return Object.freeze({
        ...base,
        state: "NOT_APPLICABLE",
        basis: "DECLARED_SOURCE_QUOTABLE",
        scope: `quote match · records whose declared sourceQuotable is ${JSON.stringify(q)}`,
        applicabilityReason: q === false ? "LICENCE_DOES_NOT_PERMIT_STORED_QUOTE" : "LICENCE_PERMISSION_NOT_ESTABLISHED",
      });
    }
    return unmapped(
      field === "quoteMatchOutcome"
        ? `not-applicable, but the declared sourceQuotable reads ${JSON.stringify(q)} — no declared rule makes a quote match inapplicable here`
        : `not-applicable on ${field}, and no declared rule makes this check inapplicable`,
    );
  }

  // could-not-check
  if (attempt && attempt.reached === true && attempt.recordId === record?.id && attempt.field === field && attempt.outcome === "could-not-check") {
    return Object.freeze({ ...base, state: "UNKNOWN", basis: "CHECK_REACHED", checkId: field, insufficiency: "CHECK_REACHED_RESULT_NOT_ESTABLISHABLE" });
  }
  if (isDeclaredDerived(record)) {
    return Object.freeze({ ...base, state: "NOT_MEASURED", basis: "DECLARED_DERIVED_FACT", checkId: field, noMeasurementReason: "DERIVED_FACT_HAS_NO_SOURCE_DOCUMENT" });
  }
  return unmapped("could-not-check with no positive record of whether the check was reached or never performed — the record constructor writes this literal as a default, and an absent date or baseline is not proof");
}

/**
 * Judge one supersession: old record → new record, field by field, each side PLACED from its own structure.
 *
 * Returns a list of violations rather than throwing, because the registry
 * validator reports every breach in one pass instead of stopping at the first.
 * An UNMAPPED side is a violation: an outcome nobody can place cannot be judged lawful.
 */
export function judgeSupersession({ previous, next, attempts = [] }) {
  const violations = [];
  const attemptFor = (record, field) => attempts.find((a) => a?.recordId === record?.id && a?.field === field) ?? null;
  for (const field of CHECK_FIELDS) {
    const from = placeCheckOutcome({ record: previous, field, attempt: attemptFor(previous, field) });
    const to = placeCheckOutcome({ record: next, field, attempt: attemptFor(next, field) });
    if (from.unmapped || to.unmapped) {
      violations.push({
        field,
        from: from.state,
        to: to.state,
        message: `${field}: ${from.state} → ${to.state} cannot be judged — ${(from.unmapped ? from : to).why}`,
      });
      continue;
    }
    if (!canTransition(EDGE_CLASS[from.state], EDGE_CLASS[to.state])) {
      violations.push({
        field,
        from: from.state,
        to: to.state,
        message:
          `${field}: ${from.state} → ${to.state} is forbidden. ` +
          (EDGE_CLASS[from.state] === "UNKNOWN" && to.state === "PASS"
            ? `${from.state} never becomes PASS (DoD §170) — take a new measurement and date it, do not promote an absence.`
            : "add it to TRANSITIONS deliberately if it is legal."),
      });
    }
  }
  return violations;
}

/**
 * Apply a transition on a single field. Throws on a forbidden edge.
 *
 * Each side is a PLACED outcome — one of PLACED_OUTCOMES, as `placeCheckOutcome` returns it — or a literal that
 * decides alone ("pass", "fail"). `transition()` stays the arbiter underneath so there is exactly one table.
 */
export function promoteOutcome(from, to) {
  const placed = (x) => (PLACED_OUTCOMES.includes(x) ? x : toCheckOutcome(x));
  const [a, b] = [placed(from), placed(to)];
  if (EDGE_CLASS[a] === "UNKNOWN" && b === "PASS") {
    throw new Error(`${a} never becomes PASS (DoD §170) — take a new measurement and date it, do not promote an absence.`);
  }
  transition(EDGE_CLASS[a], EDGE_CLASS[b]);
  return b;
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

/** 🔴 R4 — is this verification bound by the declaration contract? Dated after the contract's day, or not dated at all. */
export function underDeclarationContract(verification) {
  const on = verification?.checkedOn;
  return !(ISO_DAY.test(on ?? "") && on <= DECLARATION_CONTRACT_AFTER);
}

/**
 * 🔴 R4 — each dimension's declaration, judged against the record's own elements and the verdict's named keys.
 *
 *   UNDECLARED              absent, empty or not a string — an absent dimension is not an inapplicable one
 *   REQUIRED_NOT_DECLARED   "NOT_APPLICABLE" where the claim's own structure makes the dimension real
 *   NOT_AN_ELEMENT          a key that is not one of the record's claimElements — a dimension is a first-class element
 *   NOT_CONFIRMED_BY_NAME   a declared element the verdict does not confirm by name, or names as not found
 *   NOT_APPLICABLE · CONFIRMED
 */
export function judgeDimensions(declaration, claimElements, verification) {
  const declared = declaration?.claimDimensions;
  const listed = Array.isArray(claimElements) ? claimElements : [];
  const confirmedKeys = Array.isArray(verification?.elementsConfirmedKeys) ? verification.elementsConfirmedKeys : [];
  const notFoundKeys = Array.isArray(verification?.elementsNotFoundKeys) ? verification.elementsNotFoundKeys : [];
  const out = {};
  for (const dim of Object.keys(CLAIM_DIMENSIONS)) {
    const value = declared !== null && typeof declared === "object" ? declared[dim] : undefined;
    const required = DIMENSION_REQUIRED_BY[dim](declaration);
    let state;
    if (typeof value !== "string" || value.trim() === "") state = "UNDECLARED";
    else if (value === DIMENSION_NOT_APPLICABLE) state = required ? "REQUIRED_NOT_DECLARED" : "NOT_APPLICABLE";
    else if (!listed.includes(value)) state = "NOT_AN_ELEMENT";
    else if (!confirmedKeys.includes(value) || notFoundKeys.includes(value)) state = "NOT_CONFIRMED_BY_NAME";
    else state = "CONFIRMED";
    out[dim] = Object.freeze({ declared: value === undefined ? null : value, required, state });
  }
  return Object.freeze(out);
}

/** F30's population: a declaration that is absent or malformed, as distinct from one the verdict failed to confirm. */
export const DIMENSION_DECLARATION_FAULTS = Object.freeze(["UNDECLARED", "REQUIRED_NOT_DECLARED", "NOT_AN_ELEMENT"]);

export function judgeLeavingUnknown(id, verification, claimElements, declaration) {
  const previous = verification?.previous;
  if (!previous || VERIFICATION_OUTCOME[previous.state] !== "UNKNOWN") return null;
  const v = verification;
  const e = reconcileElements(claimElements, v);
  const contract = underDeclarationContract(v);
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
   * exists — at which point no verdict will lack `sourceRead` and the derivation will never fire.
   *
   * 🔴 R4 (owner ruling FAISLA 2, 16 September 2026) — REPLACED BY THE DECLARATION FOR EVERY NEW VERDICT, NOT YET
   * REMOVED. Under the declaration contract (dated after DECLARATION_CONTRACT_AFTER, or undated) the derivation never
   * fires: a read is declared `sourceRead: true`, or refused. It survives ONLY for pre-contract verdicts. MEASURED
   * 15 September 2026 on the first product's registry: 32 of the 36 governed verdicts carry no `sourceRead`, and 24
   * judgements depend on this branch — 15 labels declared VERIFIED and the nine held UNKNOWN by elementAmbiguity.
   * Removing it now would re-judge all 24 by side effect. It goes when the 12 September run's provenance declaration
   * is recorded beside those records, in the data repository, from that run's own evidence — never manufactured from
   * this inference. */
  /* 🔴 R4 (16 September 2026): under the declaration contract the derivation never fires — a read is DECLARED. */
  const readDerived = !contract && v.sourceRead === undefined && e.listed !== null && e.confirmed.length > 0;
  if (!(v.sourceRead === true || readDerived)) {
    const refused = (v.attempts ?? []).filter((a) => a.status !== 200);
    const unrecorded = contract
      ? " — under the declaration contract a read is DECLARED (sourceRead: true), never derived from the elements a verdict names"
      : " — the verdict records no read and names no element seen on it";
    reasons.push(`the source was not read${refused.length ? ` — ${refused.length} page(s) refused (${[...new Set(refused.map((a) => a.status))].join(", ")})` : v.sourceRead === undefined ? unrecorded : ""}`);
  }
  if (!e.listed) {
    reasons.push("the record declares no element list — what is missing cannot be reconciled, so nothing of it counts as confirmed");
  } else {
    if (e.confirmed.length === 0) reasons.push("no declared element of the claim is confirmed");
    if (e.notConfirmed.length > 0) {
      reasons.push(`${e.notConfirmed.length} of ${e.listed.length} declared element(s) not confirmed — partial confirmation is not verification`);
    }
  }
  /* 🔴 R4 — under the declaration contract every dimension is DECLARED, and a declared one is CONFIRMED BY NAME.
   * A declared dimension is one of the record's claimElements, so D-GUARD-1's all-elements limb above refuses an
   * unconfirmed one too; this names WHICH dimension failed, and is the only limb that refuses an undeclared one. */
  const dimensions = contract ? judgeDimensions(declaration, claimElements, v) : null;
  for (const [dim, d] of Object.entries(dimensions ?? {})) {
    if (d.state === "UNDECLARED") {
      reasons.push(`${dim} is not declared — claimDimensions must name it as one of the record's elements or say ${DIMENSION_NOT_APPLICABLE}; an absent dimension is not an inapplicable one`);
    } else if (d.state === "REQUIRED_NOT_DECLARED") {
      reasons.push(`${dim} is declared ${DIMENSION_NOT_APPLICABLE}, but the claim's own structure requires it — ${CLAIM_DIMENSIONS[dim]}`);
    } else if (d.state === "NOT_AN_ELEMENT") {
      reasons.push(`${dim} is declared as ${JSON.stringify(d.declared)}, which is not one of the record's claimElements — a dimension is a first-class element`);
    } else if (d.state === "NOT_CONFIRMED_BY_NAME") {
      reasons.push(`${dim} is declared as ${JSON.stringify(d.declared)} and the verdict does not confirm it by name`);
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
    contract: contract ? "DECLARATION_CONTRACT" : "PRE_CONTRACT",
    dimensions,
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
