/**
 * 🔴 ROW 60 — THE DECLARED CLASS SPLITS. 14 September 2026, on the owner's answer "All seven".
 *
 * Seven finding classes held two different things under one name. In six, the second thing is a CHECK THAT NEVER
 * RAN — a record whose verdict is UNKNOWN because an input was missing, the tool failed, or the check needs rendered
 * HTML that v0.1 does not have — carried under a name that reads as a defect found. That is absence of evidence
 * presented as a finding. In the seventh, `noindex`, the two things are a defect claim that was withdrawn and the
 * record that replaced it, declaring the noindex deliberate.
 *
 * 🔴 EVERY SPLIT USES A SIGNAL THE STORE ALREADY RECORDS — `verdict`, `reason_code`, `detector`. Nothing is inferred
 * and no detector was re-run. A record that matches no half, or more than one, is REFUSED, never guessed.
 *
 * 🔴 NO ISSUE IS TOUCHED. Its id, evidence, opened_at and state stay exactly as stored; only the class it is COUNTED
 * under changes, derived at read time from this declaration. Delete an entry here and the store reads as before.
 *
 * Naming: a half whose records are checks that never ran ends in `-check-not-run`. A half whose records are defects
 * a check actually found ends in `-found`. The census refuses a name that says the opposite of its records.
 */

/** Reason codes that mean the check did not produce a measurement. */
export const UNMEASURED_REASON_CODES = Object.freeze(["MISSING_INPUT", "NEEDS_RENDERED_HTML", "TOOL_FAILED"]);

const found = (parent) => Object.freeze({ class: `${parent}-found`, measures: "defect", when: Object.freeze({ verdict: "FAIL", reason_code: null }) });
const notRun = (parent, codes) =>
  Object.freeze({ class: `${parent}-check-not-run`, measures: "unmeasured", when: Object.freeze({ verdict: "UNKNOWN", reason_code: Object.freeze(codes) }) });
const split = (parent, halves) => Object.freeze({ parent, splitOn: "2026-09-14", halves: Object.freeze(halves) });

export const CLASS_SPLITS = Object.freeze({
  "indexability-preflight": split("indexability-preflight", [found("indexability-preflight"), notRun("indexability-preflight", ["MISSING_INPUT"])]),
  "sitemap-advertises-blocked-url": split("sitemap-advertises-blocked-url", [found("sitemap-advertises-blocked-url"), notRun("sitemap-advertises-blocked-url", ["MISSING_INPUT"])]),
  "orphan-within-crawled-set": split("orphan-within-crawled-set", [found("orphan-within-crawled-set"), notRun("orphan-within-crawled-set", ["NEEDS_RENDERED_HTML"])]),
  "thin-content": split("thin-content", [found("thin-content"), notRun("thin-content", ["MISSING_INPUT", "NEEDS_RENDERED_HTML"])]),
  "near-duplicate": split("near-duplicate", [found("near-duplicate"), notRun("near-duplicate", ["MISSING_INPUT", "TOOL_FAILED"])]),
  "template-dominance": split("template-dominance", [found("template-dominance"), notRun("template-dominance", ["MISSING_INPUT", "TOOL_FAILED"])]),
  // noindex: the original detector's FAIL claims, every one SUPERSEDED on 12 Sep, against the origin-review records that
  // replaced them, which declare the noindex DELIBERATE and leave its near-duplicate premise UNKNOWN. Neither half is a
  // check that never ran, and neither is an open defect.
  noindex: split("noindex", [
    Object.freeze({ class: "noindex-defect-claim-withdrawn", measures: "withdrawn", when: Object.freeze({ detector: "noindex", verdict: "FAIL", reason_code: null }) }),
    Object.freeze({ class: "noindex-declared-deliberate", measures: "decision", when: Object.freeze({ detector: "noindex.origin-review", verdict: "UNKNOWN", reason_code: null }) }),
  ]),
});
