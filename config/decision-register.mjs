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

/* 🔴 RR-196 · THE T-2 REVIEW SIGNALS (7 October 2026). Not a finding: under PG-A1 the measured number decides nothing. Each record keeps its
 * page and its measured value — the owner's sheet lists every one (src/audit/ruling-sheet.mjs, `signals`) — and waits on a human
 * judgement of that page against its need (P21), which no number makes. */
const reviewSignals = (splitFrom, count, measured) =>
  Object.freeze({
    splitFrom,
    count,
    decided: `PG-A1 (owner): ${measured} no longer decides anything (RTP-1 S10); the 15 named T-2 runs (RR-195) superseded every version-1 FAIL by a version-2 review signal that keeps the page and its measured value, labelled`,
    notEstablished: "Whether any of these pages fails its need is NOT established by the number: completeness is judged for a need (P21), by a human, page by page",
    awaits: "PG-A1",
    recordedOn: "2026-10-07",
  });

export const DECISION_REGISTER = Object.freeze({
  "noindex-declared-deliberate": decision(
    "noindex",
    134,
    "to de-index these cv-guide pages deliberately: noindex, correctly configured and crawlable, keyed on a country-verification gate (commit 50f8c20, as the review record reads)",
    "Whether it is still the right rule is UNKNOWN from our evidence: the premise it cites is not confirmed by our similarity measurement. Owner's decision: REC-NOINDEX-CV-GUIDE.",
    "REC-NOINDEX-CV-GUIDE",
  ),
  "thin-content-review-signal": reviewSignals("thin-content", 118, "the count of unique body words"),
  "near-duplicate-review-signal": reviewSignals("near-duplicate", 5, "body similarity to a sibling page"),
  "template-dominance-review-signal": reviewSignals("template-dominance", 2, "the shell's share of a page's words"),
});
