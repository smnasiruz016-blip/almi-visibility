/**
 * 🔴 THE FOUR LABELS, AND THE RULE THAT NOTHING ESCAPES THEM.
 *
 * Key feature 50 requires OBSERVED / INFERRED / RECOMMENDED / UNKNOWN to be
 * kept apart. Key feature 51 requires the owner to be able to SEE which is
 * which. A separation that exists only in the data model and never reaches a
 * screen is a separation nobody can check.
 *
 * ── WHY AN UNKNOWN RECORD TYPE IS `UNKNOWN`, NOT SKIPPED ────────────────────
 *
 * The tempting default for an unrecognised record is to leave it out of the
 * view. That would make the page quietly incomplete: a record we could not
 * classify would be indistinguishable from a record that does not exist. So an
 * unrecognised type renders, labelled UNKNOWN, with its type shown.
 *
 * ── AND WHY A SUMMARY IS `INFERRED`, NOT `OBSERVED` ─────────────────────────
 *
 * A `crawl_run` was not measured — it was COMPUTED from things that were. Its
 * numbers are true, and they are still a derivation. Labelling a derivation as
 * an observation is precisely the collapse this product exists to prevent, and
 * it is the easy mistake because the derivation is usually correct.
 */

export const LABELS = Object.freeze(["OBSERVED", "INFERRED", "RECOMMENDED", "UNKNOWN"]);

/**
 * record_type → label, with the reason each one carries.
 *
 * 🔴 One table, frozen. A `switch` scattered through the renderer would let a
 * new record type acquire a label by accident.
 */
export const LABEL_BY_TYPE = Object.freeze({
  observation: { label: "OBSERVED", why: "measured, with a content hash and a timestamp" },
  resighting: { label: "OBSERVED", why: "we looked again on this date and the content was unchanged" },
  crawl_run: { label: "INFERRED", why: "computed from the observations of one run, not measured directly" },
  crawl_run_correction: { label: "INFERRED", why: "a re-derivation of a summary field, superseding the original" },
  inventory_note: { label: "INFERRED", why: "computed from the observations already in the store" },
  page: { label: "INFERRED", why: "a page identity assembled from one or more observations" },
  source: { label: "OBSERVED", why: "a retrieved document with a date" },
  issue: { label: "RECOMMENDED", why: "a claim that something is wrong, derived from evidence" },
  /* 🔴 13 September 2026 (item 50): every record type in a committed store now has a DECLARED label.
   * Before, these four fell through to UNKNOWN — a drafted recommendation read as "unknown". */
  draft_recommendation: { label: "RECOMMENDED", why: "a drafted action — not approved and not applied" },
  issue_state_change: { label: "INFERRED", why: "a lifecycle decision made from evidence, recorded beside the conclusion it changes" },
  duplicate_record_superseded: { label: "INFERRED", why: "a note that a stored copy repeats an earlier record — derived, not measured" },
  cost_entry: { label: "INFERRED", why: "computed from a run's own counts and clock; any part it could not measure says UNKNOWN" },
  recommendation_evidence: { label: "INFERRED", why: "which stored records a recommendation stands on — a link, not a measurement" },
});

/**
 * Label one record. Never returns null and never throws.
 *
 * A fact record is a special case: its own `verificationState` decides. An
 * UNVERIFIED fact is not an observation of ours — nobody has checked it — so it
 * is UNKNOWN however confident its value looks.
 */
export function labelFor(record) {
  if (record?.verificationState === "UNVERIFIED") {
    return { label: "UNKNOWN", why: "the record is declared UNVERIFIED — nobody has fact-checked it" };
  }
  if (record?.verificationState === "VERIFIED") {
    return { label: "OBSERVED", why: "fact-checked, with a date and a named checker" };
  }
  const hit = LABEL_BY_TYPE[record?.record_type];
  if (hit) return hit;
  return {
    label: "UNKNOWN",
    why: `record_type ${JSON.stringify(record?.record_type ?? null)} has no declared label — shown rather than hidden`,
  };
}

/** Count records by label. Used by the header, so the page can state its own mix. */
export function labelCensus(records) {
  const counts = Object.fromEntries(LABELS.map((l) => [l, 0]));
  for (const r of records) counts[labelFor(r).label] += 1;
  return counts;
}
