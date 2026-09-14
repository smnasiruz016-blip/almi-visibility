/**
 * 🔴 ROW 60 — DECISIONS ON RECORD. A DELIBERATE CHOICE WHOSE CONSEQUENCE IS NOT ESTABLISHED (owner's ruling, Option A,
 * 14 September 2026).
 *
 * Not a finding: nothing was detected. A REVIEW recorded a decision somebody made on purpose, and could not establish
 * whether that decision does harm. So it carries no level — no severity on the scale is true of it — and it is never
 * ranked beside a finding. It waits on a human.
 *
 * 🔴 AND IT MUST BE MORE VISIBLE THAN A FINDING, NOT LESS. The owner's report shows every entry here, above the
 * findings, with its count, its measured search impressions and the recommendation it waits on
 * (src/audit/populations.mjs, limb decision-hidden). A decision that goes quiet has done harm.
 *
 * `count` is checked against the store (limb population-sum). Impressions are never typed here: they are derived from
 * the newest COMPLETE page-rows pull every time the census or the report runs.
 */

const decision = (splitFrom, count, decided, notEstablished, awaits) =>
  Object.freeze({ splitFrom, count, decided, notEstablished, awaits, recordedOn: "2026-09-14" });

export const DECISION_REGISTER = Object.freeze({
  "noindex-declared-deliberate": decision(
    "noindex",
    134,
    "to de-index these cv-guide pages deliberately: noindex, correctly configured and crawlable, keyed on a country-verification gate (commit 50f8c20, as the review record reads)",
    "Whether it is still the right rule is UNKNOWN from our evidence: the premise it cites is not confirmed by our similarity measurement. Owner's decision: REC-NOINDEX-CV-GUIDE.",
    "REC-NOINDEX-CV-GUIDE",
  ),
});
