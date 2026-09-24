/**
 * 🔴 THE EVIDENCE LABELS ON THE PAGE — NOW THE SIX CANONICAL STATES OF F06 (24 September 2026).
 *
 * Key features 50/51 asked for OBSERVED / INFERRED / RECOMMENDED / UNKNOWN to be kept apart and SEEN. F06 makes that a
 * closed, enforced model (src/evidence/evidence-state.mjs) with two more states — NOT MEASURED and NOT APPLICABLE — and
 * this module is now only its face: every label comes from the one adapter (src/evidence/evidence-state-adapters.mjs),
 * placed by a record's STRUCTURE, never by a table keyed on its name alone.
 *
 * ── WHAT CHANGED, AND WHY EACH WAS A DEFECT UNDER F06's FROZEN ACCEPTANCE ────
 *   · every `issue` read RECOMMENDED. A finding is a conclusion a detector DERIVED from stored evidence (INFERRED), and a
 *     check that never ran (the producer's could-not-answer reasons) is NOT MEASURED — neither is a proposed action.
 *   · an UNVERIFIED fact read UNKNOWN. src/facts/record.mjs defines UNVERIFIED as "nobody has looked. No check has
 *     happened" — NOT MEASURED. UNKNOWN is a question REACHED and not established.
 *   · a VERIFIED fact read OBSERVED on its label alone — even with empty checks. It is OBSERVED only with its check
 *     date, checker and source reference; a VERIFIED derivation is INFERRED.
 *   · an unrecognised record type DEFAULTED to UNKNOWN. It is now UNMAPPED: still shown, with its type — never hidden,
 *     and never given a canonical state it was not proved to have.
 */
import { EVIDENCE_STATES, displayOf, UNMAPPED } from "../evidence/evidence-state.mjs";
import { evidenceStateOf, adapterContext } from "../evidence/evidence-state-adapters.mjs";

/** The six canonical states, in the order the page shows them. UNMAPPED is not a label; it is counted beside them. */
export const LABELS = EVIDENCE_STATES;

/**
 * Every record type a committed store holds, and the states its rule may place it in. Declared, so a new record type
 * cannot acquire a label by accident — it is UNMAPPED until a rule is written for it.
 */
export const LABEL_BY_TYPE = Object.freeze({
  observation: Object.freeze({ states: Object.freeze(["OBSERVED", "NOT_MEASURED"]), why: "measured, with a content hash and a time — or, where the fetch was skipped or refused, not measured" }),
  resighting: Object.freeze({ states: Object.freeze(["OBSERVED", "INFERRED"]), why: "an observation seen again (OBSERVED), or a finding re-derived (INFERRED)" }),
  source: Object.freeze({ states: Object.freeze(["OBSERVED"]), why: "a retrieved document with a date" }),
  issue: Object.freeze({ states: Object.freeze(["INFERRED", "NOT_MEASURED", "UNKNOWN"]), why: "a finding derived by a detector; a check that never ran; or a question reached and not established" }),
  draft_recommendation: Object.freeze({ states: Object.freeze(["RECOMMENDED"]), why: "a drafted action on linked evidence — not approved, not applied, not proof" }),
  crawl_run: Object.freeze({ states: Object.freeze(["INFERRED"]), why: "computed from the observations of one run" }),
  crawl_run_correction: Object.freeze({ states: Object.freeze(["INFERRED"]), why: "a re-derivation of a summary field" }),
  inventory_note: Object.freeze({ states: Object.freeze(["INFERRED"]), why: "computed from the observations already in the store" }),
  page: Object.freeze({ states: Object.freeze(["INFERRED"]), why: "a page identity assembled from observations" }),
  issue_state_change: Object.freeze({ states: Object.freeze(["INFERRED"]), why: "a lifecycle decision made from evidence" }),
  duplicate_record_superseded: Object.freeze({ states: Object.freeze(["INFERRED"]), why: "a note that a stored copy repeats an earlier record" }),
  cost_entry: Object.freeze({ states: Object.freeze(["INFERRED"]), why: "computed from a run's own counts; each PART carries its own state" }),
  recommendation_evidence: Object.freeze({ states: Object.freeze(["INFERRED"]), why: "which stored records a recommendation stands on — a link, not a measurement" }),
});

/**
 * Label one record. Never returns null and never throws: an item no rule can place is UNMAPPED, with the reason.
 * `ctx` is the adapter context (built from the whole record set); without it a drafted recommendation cannot find its
 * linked evidence and is, correctly, UNMAPPED.
 */
export function labelFor(record, ctx = {}) {
  const s = evidenceStateOf(record, ctx);
  if (s.unmapped) return { label: UNMAPPED, display: UNMAPPED, why: `no rule places this item — ${s.why}`, state: null };
  const type = record?.record_type ?? "fact";
  return { label: s.state, display: displayOf(s.state), why: `${type} · ${s.meta.assignedBy}`, state: s };
}

/** Count records by state, plus UNMAPPED. Used by the header, so the page can state its own mix. */
export function labelCensus(records) {
  const ctx = adapterContext(records);
  const counts = Object.fromEntries([...LABELS, UNMAPPED].map((l) => [l, 0]));
  for (const r of records) counts[labelFor(r, ctx).label] += 1;
  return counts;
}

export { adapterContext };
