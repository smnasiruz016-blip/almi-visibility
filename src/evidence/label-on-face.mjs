/**
 * 🔴 ROW 50 — IS A GOVERNED RECORD LABELLED ON ITS FACE? JUDGED FROM ITS DECLARATIONS, NEVER FROM ITS DATE.
 *
 * Owner ruling, 21 September 2026 (`_handoffs/AlmiVisibility_OWNER_RULING_2026-09-21_ROW50_LABEL_ON_FACE.md`):
 *   1. a record carrying VERIFIED, UNKNOWN or another state but declaring no applicable claimDimensions does NOT
 *      satisfy "labelled on its face";
 *   2. a historical date exemption may keep a pre-contract record STORED; it does not turn an undeclared label into
 *      Row 50 evidence;
 *   7. `elementAmbiguity` prose is not authority and may not select which records the guard enforces.
 *
 * So this reads the production dimension judge (`judgeDimensions`, ./verdict.mjs) for EVERY governed record, whatever
 * its verification date. It never reads a date, and it never reads `elementAmbiguity` or any other prose field.
 *
 * ── A DIMENSION'S STANDING ─────────────────────────────────────────────────
 *
 *   NOT_APPLICABLE            declared so, and the claim's own structure does not make it real — labelled
 *   CONFIRMED                 declared as one of the record's elements, and the verdict confirms it by name — labelled
 *   NOT_CONFIRMED_BY_NAME     declared as an element the verdict does not confirm — labelled for a record that SAYS it
 *                             is not verified (UNKNOWN is the honest label); never labelled on a VERIFIED record
 *   UNDECLARED                absent — an absent dimension is not an inapplicable one
 *   REQUIRED_NOT_DECLARED     NOT_APPLICABLE where the structure makes it real — a wrong label
 *   NOT_AN_ELEMENT            names something that is not one of the record's elements — a wrong label
 *
 * A record is LABELLED only when every dimension is labelled. There is no "mostly labelled".
 * This module names no product, no subject and no authority.
 */

import { judgeDimensions, judgeLeavingUnknown } from "./verdict.mjs";
import { canTransition } from "./transitions.mjs";
import { bindResources } from "../tenancy/attachment.mjs";
import { CLAIM_DIMENSIONS, DIMENSION_REQUIRED_BY } from "../facts/schema.mjs";

export const LABEL_STATES = Object.freeze(["LABELLED", "UNLABELLED", "DERIVED", "INVALID"]);

/** Every named reason a dimension or record can carry. */
export const LABEL_REASONS = Object.freeze({
  DIMENSION_UNDECLARED: "DIMENSION_UNDECLARED",
  DIMENSION_REQUIRED_NOT_DECLARED: "DIMENSION_REQUIRED_NOT_DECLARED",
  DIMENSION_WRONG_ELEMENT: "DIMENSION_WRONG_ELEMENT",
  DIMENSION_NOT_CONFIRMED_ON_VERIFIED: "DIMENSION_NOT_CONFIRMED_ON_VERIFIED",
  DERIVED_BY_DERIVATION_LAW: "DERIVED_BY_DERIVATION_LAW",
  CROSS_TENANT: "CROSS_TENANT",
});

const DIM_REASON = Object.freeze({
  UNDECLARED: LABEL_REASONS.DIMENSION_UNDECLARED,
  REQUIRED_NOT_DECLARED: LABEL_REASONS.DIMENSION_REQUIRED_NOT_DECLARED,
  NOT_AN_ELEMENT: LABEL_REASONS.DIMENSION_WRONG_ELEMENT,
});

/**
 * Judge one record's face. A derived record is governed by its own derivation law and is never forced into the
 * primary-source dimension fields: it comes back DERIVED, never UNLABELLED and never LABELLED.
 */
export function labelOnFace(record) {
  if (record?.kind === "derived") return Object.freeze({ id: record.id, state: "DERIVED", reasons: Object.freeze([LABEL_REASONS.DERIVED_BY_DERIVATION_LAW]), dimensions: null });
  const dims = judgeDimensions(record, record?.claimElements, record?.verification);
  const reasons = [];
  for (const [dim, d] of Object.entries(dims)) {
    if (DIM_REASON[d.state]) reasons.push(`${DIM_REASON[d.state]}:${dim}`);
    else if (d.state === "NOT_CONFIRMED_BY_NAME" && record?.verificationState === "VERIFIED") reasons.push(`${LABEL_REASONS.DIMENSION_NOT_CONFIRMED_ON_VERIFIED}:${dim}`);
  }
  return Object.freeze({ id: record?.id ?? null, state: reasons.length ? "UNLABELLED" : "LABELLED", reasons: Object.freeze(reasons), dimensions: dims });
}

/**
 * 🔴 EXACT-MAPPING ADJUDICATION — may a dimension be declared WITHOUT a human judgement? (owner ruling, clause 4)
 *
 * For each dimension: NOT_APPLICABLE when the schema's own law (DIMENSION_REQUIRED_BY) does not make it real;
 * otherwise the structured fields that can name its element are read, and a candidate is a claimElement VERBATIM EQUAL
 * to one of them — EXACT when there is one and only one, MULTIPLE when more, ABSENT when none. The structured fields
 * are the record's own `claimDimensions[dim]` and, for the qualifier, `claim.qualifier`. Nothing else: no substring,
 * keyword, similarity, prose or model reading ever manufactures a candidate.
 */
export const MAPPING = Object.freeze(["EXACT", "MULTIPLE", "ABSENT", "NOT_APPLICABLE"]);

export function adjudicateDimensions(record) {
  const elements = Array.isArray(record?.claimElements) ? record.claimElements : [];
  const out = {};
  for (const dim of Object.keys(CLAIM_DIMENSIONS)) {
    if (!DIMENSION_REQUIRED_BY[dim](record)) { out[dim] = Object.freeze({ mapping: "NOT_APPLICABLE", candidates: Object.freeze([]) }); continue; }
    const fields = [record?.claimDimensions?.[dim], dim === "qualifier" ? record?.claim?.qualifier : undefined].filter((x) => typeof x === "string" && x.trim() !== "");
    const candidates = [...new Set(fields.filter((f) => elements.includes(f)))];
    out[dim] = Object.freeze({ mapping: candidates.length === 1 ? "EXACT" : candidates.length > 1 ? "MULTIPLE" : "ABSENT", candidates: Object.freeze(candidates) });
  }
  return Object.freeze(out);
}

/** A governed record is one the real guard judges as leaving UNKNOWN — the same test the validator uses. */
export const isGoverned = (r) => Boolean(judgeLeavingUnknown(r?.id, r?.verification, r?.claimElements, r));

/**
 * 🔴 ROW 50 OVER A POPULATION.
 * @param {object} input
 * @param {object[]} input.records               the registry, as the production loader returns it
 * @param {{resourceKind: string, resourceRef: string, evidenceClass: string}} input.subject   the subject's registry
 * @param {(record: object) => {resourceKind: string, resourceRef: string, evidenceClass: string}} input.registryOf
 *        the registry each record was loaded from — declared by the loader, never read from the record's id
 * @param {Function} input.resolve               the production tenant resolver
 */
export function row50Census({ records, subject, registryOf, resolve }) {
  const results = [];
  for (const r of records ?? []) {
    if (!isGoverned(r) && r?.kind !== "derived") continue;
    const tenancy = bindResources(resolve, registryOf(r), subject);
    if (tenancy.binding !== "BOUND") {
      results.push(Object.freeze({ id: r?.id ?? null, state: "INVALID", reasons: Object.freeze([`${LABEL_REASONS.CROSS_TENANT}:${tenancy.binding}`]), dimensions: null, verificationState: r?.verificationState, evidenceClass: registryOf(r)?.evidenceClass }));
      continue;
    }
    results.push(Object.freeze({ ...labelOnFace(r), verificationState: r?.verificationState, evidenceClass: registryOf(r)?.evidenceClass }));
  }
  const governed = results.filter((x) => x.state !== "DERIVED");
  const count = (s) => results.filter((x) => x.state === s).length;
  const reasons = [];
  if (governed.length === 0) reasons.push({ code: "EMPTY_POPULATION", why: "the guard governs no record — a law seen by nothing proves nothing" });
  if (governed.some((x) => x.evidenceClass !== "REAL")) reasons.push({ code: "NOT_REAL_EVIDENCE", why: "a governed record is not REAL — a fixture is a control, never Row 50 evidence" });
  if (count("INVALID")) reasons.push({ code: "CROSS_TENANT_RECORDS", why: `${count("INVALID")} record(s) do not bind to the subject's registry` });
  if (count("UNLABELLED")) reasons.push({ code: "LABELS_ABSENT_OR_WRONG", why: `${count("UNLABELLED")} governed record(s) are not labelled on their face — Row 50's FAILURE: "a label is absent or wrong"` });
  if (canTransition("UNKNOWN", "PASS")) reasons.push({ code: "UNKNOWN_CAN_BECOME_PASS", why: "the transition law admits UNKNOWN → PASS" });
  return Object.freeze({
    results: Object.freeze(results),
    counts: Object.freeze({ considered: results.length, governed: governed.length, LABELLED: count("LABELLED"), UNLABELLED: count("UNLABELLED"), INVALID: count("INVALID"), DERIVED: count("DERIVED"), remainder: results.length - (count("LABELLED") + count("UNLABELLED") + count("INVALID") + count("DERIVED")) }),
    verdict: reasons.length ? "FAIL" : "PASS",
    reasons: Object.freeze(reasons),
  });
}
