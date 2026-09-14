/**
 * 🔴 ROW 60 — A CLASS SPLIT IS A READING OF THE STORE, NEVER A WRITE TO IT.
 *
 * `classOf` places an issue in the half of its class whose declared signal its OWN stored fields match. `splitView`
 * is every issue as row 60 counts it: its effective class beside its untouched id, evidence, opened_at and state.
 * `splitErrors` checks both against the store, independently of the code that produced them. Each limb is its own:
 *
 *   signal      a half declares no stored signal, or a record matches no half or more than one
 *   identity    an issue's id, evidence or opened_at differs from what the store holds
 *   state       an issue's state differs from the store's lifecycle
 *   reopened    a SUPERSEDED or CLOSED issue reads as OPEN
 *   misnamed    a class whose records are all checks that never ran is not named `-check-not-run`, or a class so
 *               named holds a record that is not one
 *   mixed       a class in use holds both checks that never ran and anything else — a bundle nobody split
 *
 * This module names no product.
 */

import { lifecycleOf } from "../evidence/lifecycle.mjs";

const NOT_RUN = "-check-not-run";

const matches = (issue, when) =>
  Object.entries(when).every(([field, want]) => {
    const got = issue[field] ?? null;
    return Array.isArray(want) ? want.includes(got) : got === want;
  });

/** Whether a stored issue records a check that did not produce a measurement. */
export function isUnmeasured(issue, unmeasuredCodes) {
  return issue?.verdict === "UNKNOWN" && unmeasuredCodes.includes(issue?.reason_code ?? null);
}

/** The class an issue is counted under, and how it got there. A record no half claims keeps its parent — visibly. */
export function classOf(issue, splits) {
  const s = splits?.[issue?.issue_class];
  if (!s) return { class: issue?.issue_class, splitFrom: null, matched: null };
  const hits = s.halves.filter((h) => Object.keys(h.when ?? {}).length > 0 && matches(issue, h.when));
  return hits.length === 1 ? { class: hits[0].class, splitFrom: s.parent, matched: 1 } : { class: s.parent, splitFrom: null, matched: hits.length };
}

/** Every distinct issue as row 60 counts it. Nothing in the returned view is written anywhere. */
export function splitView(records, splits) {
  const life = lifecycleOf(records);
  const view = new Map();
  for (const [id, i] of life.issues) {
    const c = classOf(i.issue, splits);
    view.set(id, {
      issue_id: i.issue.issue_id,
      class: c.class,
      splitFrom: c.splitFrom,
      matched: c.matched,
      storedClass: i.issue.issue_class,
      verdict: i.issue.verdict,
      reason_code: i.issue.reason_code ?? null,
      evidence: i.issue.evidence,
      opened_at: i.issue.opened_at,
      state: i.state ?? "OPEN",
    });
  }
  return { view, lifecycleErrors: life.errors };
}

/** 🔴 The classes whose records are checks that never ran: the COVERAGE population, never a finding (owner, 14 Sep 2026). */
export function coverageClassesOf(splits) {
  return new Set(Object.values(splits ?? {}).flatMap((s) => s.halves.filter((h) => h.measures === "unmeasured").map((h) => h.class)));
}

/** The effective classes present on issue records. */
export function effectiveClassesInUse(records, splits) {
  return [...new Set([...splitView(records, splits).view.values()].map((v) => v.class).filter(Boolean))].sort();
}

/**
 * @param {object}   a
 * @param {object[]} a.records          every record in the store
 * @param {object}   a.splits           the declared splits
 * @param {string[]} a.unmeasuredCodes  reason codes that mean no measurement was made
 * @param {Map}     [a.view]            the view to check — by default the one splitView produces
 */
export function splitErrors({ records, splits, unmeasuredCodes, view = splitView(records, splits).view }) {
  const errors = [];

  for (const s of Object.values(splits ?? {})) {
    for (const h of s.halves) {
      if (!h.when || Object.keys(h.when).length === 0) errors.push({ limb: "signal", id: h.class, why: `half ${h.class} of ${s.parent} declares no stored signal — a record cannot be placed in it without guessing` });
      if ((h.measures === "unmeasured") !== String(h.class).endsWith(NOT_RUN)) {
        errors.push({ limb: "misnamed", id: h.class, why: `half ${h.class} is declared to measure "${h.measures}", and its name says ${String(h.class).endsWith(NOT_RUN) ? "a check that never ran" : "something found"} — a declaration and its name may not disagree` });
      }
    }
  }

  // The store's own reading, taken separately: the first record of each issue, and the lifecycle's state.
  const stored = new Map();
  for (const r of records) if (r.record_type === "issue" && !stored.has(r.issue_id)) stored.set(r.issue_id, r);
  const states = lifecycleOf(records).issues;

  for (const [id, r] of stored) {
    const v = view.get(id);
    if (!v) {
      errors.push({ limb: "identity", id, why: "an issue in the store is missing from the split view" });
      continue;
    }
    // Re-judged here from the stored record and the declaration — never taken from the classifier's own word.
    const s = splits?.[r.issue_class];
    if (s) {
      const claimed = s.halves.filter((h) => Object.keys(h.when ?? {}).length > 0 && matches(r, h.when));
      const placed = s.halves.find((h) => h.class === v.class);
      if (claimed.length !== 1 || !placed || !Object.keys(placed.when ?? {}).length || !matches(r, placed.when)) {
        errors.push({
          limb: "signal",
          id,
          why: `a ${r.issue_class} record (verdict ${r.verdict}, reason_code ${r.reason_code ?? "none"}, detector ${r.detector}) is counted under ${v.class}, but its stored fields satisfy ${claimed.length} half/halves${placed ? "" : " and name no half"} — a record is placed only by the signal it carries, never guessed`,
        });
      }
    }
    if (v.issue_id !== r.issue_id || JSON.stringify(v.evidence) !== JSON.stringify(r.evidence) || v.opened_at !== r.opened_at) {
      errors.push({ limb: "identity", id, why: "the split changed the issue's id, evidence or opened_at — a split changes the class it is counted under and nothing else" });
    }
    const storedState = states.get(id)?.state ?? "OPEN";
    if (v.state !== storedState) {
      const reopened = storedState !== "OPEN" && v.state === "OPEN";
      errors.push({ limb: reopened ? "reopened" : "state", id, why: `the split reads ${v.state} where the store holds ${storedState}${reopened ? " — a closed or superseded issue reopened" : ""}` });
    }
  }
  for (const id of view.keys()) if (!stored.has(id)) errors.push({ limb: "identity", id, why: "the split view holds an issue the store does not" });

  const byClass = new Map();
  for (const v of view.values()) {
    const e = byClass.get(v.class) ?? { unmeasured: 0, other: 0 };
    if (isUnmeasured(v, unmeasuredCodes)) e.unmeasured += 1;
    else e.other += 1;
    byClass.set(v.class, e);
  }
  for (const [k, e] of byClass) {
    const named = String(k).endsWith(NOT_RUN);
    if (e.unmeasured > 0 && e.other === 0 && !named) errors.push({ limb: "misnamed", id: k, why: `all ${e.unmeasured} of its records are checks that never ran, and its name reads as a defect found — it must end ${NOT_RUN}` });
    if (named && e.other > 0) errors.push({ limb: "misnamed", id: k, why: `it is named ${NOT_RUN} and holds ${e.other} record(s) that are not checks that never ran` });
    if (e.unmeasured > 0 && e.other > 0 && !named) errors.push({ limb: "mixed", id: k, why: `${e.unmeasured} checks that never ran and ${e.other} other records under one name — a bundle nobody split` });
  }
  return errors;
}
