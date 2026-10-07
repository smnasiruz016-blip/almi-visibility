/**
 * 🔴 ROW 60 — THE AUDIT TRAIL. A CLAIM THAT WAS WITHDRAWN; NOTHING OPEN (owner's ruling, Option A, 14 September 2026).
 *
 * History, kept and queryable, never counted as live. What belongs here is decided by the owner's answer of the same
 * day: ONLY issues SUPERSEDED because their premise was wrong. A class merely having no open issue is NOT enough —
 * `instrument-disagreement` has 11 issues, all CLOSED, and stays a live finding class with its ruled HIGH, because a
 * real defect that was fixed is still a finding ("Base severity describes the class, not today's zero").
 *
 * An audit-trail class may hold no OPEN issue and no issue in any state but SUPERSEDED (limb archive), carries no level,
 * and is never ranked. `count` is checked against the store (limb population-sum).
 */

const withdrawn = (splitFrom, count, why) => Object.freeze({ splitFrom, count, why, recordedOn: "2026-09-14" });

/* RR-196 · the T-2 version-1 claims (7 October 2026): each FAIL said the number decided a defect; PG-A1 ruled that premise out. */
const withdrawnT2 = (splitFrom, count, number) =>
  Object.freeze({ splitFrom, count, why: `the claim that ${number} decided a defect was withdrawn under the owner's PG-A1 (RTP-1 S10); each FAIL was superseded by the 15 named T-2 runs (RR-195) by a version-2 review signal, now held under ${splitFrom}-review-signal`, recordedOn: "2026-10-07" });

export const AUDIT_TRAIL = Object.freeze({
  "noindex-defect-claim-withdrawn": withdrawn(
    "noindex",
    134,
    "the claim that noindex on these pages was a DEFECT was withdrawn on 12 September 2026 — later evidence showed a deliberate de-indexing decision — and each claim was superseded by the review record now held under noindex-declared-deliberate",
  ),
  "thin-content-claim-withdrawn": withdrawnT2("thin-content", 118, "a count of unique body words"),
  "near-duplicate-claim-withdrawn": withdrawnT2("near-duplicate", 5, "a body similarity"),
  "template-dominance-claim-withdrawn": withdrawnT2("template-dominance", 2, "a shell share"),
});
