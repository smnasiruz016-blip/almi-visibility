/**
 * 🔴 ROW 60 — AN UNMEASURED CHECK IS NOT A FINDING (owner's ruling, 14 September 2026).
 *
 * A check that never ran says nothing about the product; it says something about OUR INSTRUMENT — we could not
 * look. So it has no consequence to a person, no severity on the scale is true of it, and it leaves the findings
 * population for a COVERAGE REGISTER of its own: separately counted, never ranked beside a finding, never given a
 * level. These are the checks that keep the two populations apart, and the two that stop volume that was not real
 * from deciding a level again. Each limb is its own:
 *
 *   coverage-level    a coverage class carries a level, or appears in the consequence register at all
 *   coverage-ranked   a coverage class appears in the findings order — ranked, or routed beside a finding
 *   coverage-count    a coverage entry's count or reason codes disagree with the store
 *   coverage-missing  a class of checks that never ran with no coverage entry, an entry for a class with no records,
 *                     or an entry that does not say what input or capability is missing
 *   blast-radius      a live register entry whose blast-radius figure is not the store's count of REAL findings
 *   void-escalation   an escalation resting on a count that is not real findings, standing without a recorded void
 *
 * REAL FINDINGS (owner's answer, 14 September 2026): distinct issues that are not checks that never ran — FAIL, and
 * UNKNOWN verdicts that carry no not-run reason code.
 *
 * This module names no product.
 */

import { isUnmeasured } from "./class-split.mjs";

const leadingFigure = (s) => {
  const m = typeof s === "string" ? s.match(/^\s*(\d[\d,]*)/) : null;
  return m ? Number(m[1].replace(/,/g, "")) : null;
};

/** Distinct issues per effective class, split into real findings and checks that never ran. */
export function populationOf(view, unmeasuredCodes) {
  const by = new Map();
  for (const v of view.values()) {
    const e = by.get(v.class) ?? { real: 0, realOpen: 0, notRun: 0, reasonCodes: new Set() };
    if (isUnmeasured(v, unmeasuredCodes)) {
      e.notRun += 1;
      e.reasonCodes.add(v.reason_code);
    } else {
      e.real += 1;
      if (v.state === "OPEN") e.realOpen += 1;
    }
    by.set(v.class, e);
  }
  return by;
}

/**
 * @param {object}   a
 * @param {object}   a.coverage         the coverage register
 * @param {object}   a.register         the consequence register
 * @param {Map}      a.view             splitView's view of the store
 * @param {string[]} a.unmeasuredCodes
 * @param {string[]} a.orderIds         every id in the findings order, ranked or routed
 */
export function coverageErrors({ coverage, register, view, unmeasuredCodes, orderIds = [] }) {
  const errors = [];
  const pop = populationOf(view, unmeasuredCodes);
  const LEVEL_KEYS = ["level", "severity", "consequence", "reversibility", "blastRadius", "escalatedFrom"];

  for (const [k, e] of Object.entries(coverage ?? {})) {
    const held = LEVEL_KEYS.filter((f) => e?.[f] !== undefined);
    if (held.length) errors.push({ limb: "coverage-level", id: k, why: `a coverage entry carries ${held.join(", ")} — a check that never ran has no consequence to a person, and no severity is true of it` });
    if (register?.[k]) errors.push({ limb: "coverage-level", id: k, why: "a coverage class sits in the consequence register — a check that never ran is not a finding and is given no level" });
    const p = pop.get(k);
    if (!p || p.notRun === 0) {
      errors.push({ limb: "coverage-missing", id: k, why: "a coverage entry for a class that holds no check that never ran" });
      continue;
    }
    if (e.count !== p.notRun) errors.push({ limb: "coverage-count", id: k, why: `the entry records ${e.count} and the store holds ${p.notRun} checks that never ran` });
    if (JSON.stringify([...(e.reasonCodes ?? [])].sort()) !== JSON.stringify([...p.reasonCodes].sort())) {
      errors.push({ limb: "coverage-count", id: k, why: `the entry records reason codes ${JSON.stringify(e.reasonCodes)} and the store holds ${JSON.stringify([...p.reasonCodes].sort())}` });
    }
    if (typeof e.missing !== "string" || !e.missing.trim()) errors.push({ limb: "coverage-missing", id: k, why: "the entry does not say what input or capability is missing" });
  }
  for (const [k, p] of pop) {
    if (p.notRun > 0 && p.real === 0 && !coverage?.[k]) errors.push({ limb: "coverage-missing", id: k, why: `${p.notRun} checks that never ran with no coverage entry` });
  }
  for (const id of orderIds) {
    if (coverage?.[id]) errors.push({ limb: "coverage-ranked", id, why: "a coverage class appears in the findings order — 'we did not look' is never ranked beside 'we found something'" });
  }
  return errors;
}

/** 3c — a live entry's blast-radius figure must be the store's count of REAL findings for its class. */
export function blastRadiusErrors({ register, view, unmeasuredCodes }) {
  const errors = [];
  const pop = populationOf(view, unmeasuredCodes);
  for (const [k, e] of Object.entries(register ?? {})) {
    const figure = leadingFigure(e?.blastRadius);
    if (figure === null) continue;
    const real = pop.get(k)?.real ?? 0;
    if (figure !== real) errors.push({ limb: "blast-radius", id: k, why: `its blast radius cites ${figure}, and the store holds ${real} real finding(s) for this class — volume that is not real findings may not stand in a level's reasoning` });
  }
  return errors;
}

/**
 * 3a — an escalation is volume crossing a level. One that rests on a count that is not real findings is void, and it
 * may stand in no entry — live or superseded — unless its void is recorded on that entry, with the cause.
 *
 * @param {Map} a.storedReal   real findings per STORED class name (a superseded entry names the class it was)
 */
export function voidEscalationErrors({ register, superseded, view, unmeasuredCodes }) {
  const errors = [];
  const realByStored = new Map();
  for (const v of view.values()) if (!isUnmeasured(v, unmeasuredCodes)) realByStored.set(v.storedClass, (realByStored.get(v.storedClass) ?? 0) + 1);
  const pop = populationOf(view, unmeasuredCodes);
  const judge = (k, e, where) => {
    if (e?.escalatedFrom === undefined) return;
    const figure = leadingFigure(e.blastRadius);
    const real = where === "superseded" ? realByStored.get(k) ?? 0 : pop.get(k)?.real ?? 0;
    const voided = e.escalationVoid && typeof e.escalationVoid.cause === "string" && e.escalationVoid.cause.trim() && /^\d{4}-\d{2}-\d{2}$/.test(e.escalationVoid.on ?? "");
    if (figure !== real && !voided) {
      errors.push({ limb: "void-escalation", id: k, why: `the ${where} entry's escalation from ${e.escalatedFrom} rests on ${figure} while the store holds ${real} real finding(s), and no void is recorded — an escalation on volume that is not real is void and must say so` });
    }
    if (where === "live" && e.escalationVoid) errors.push({ limb: "void-escalation", id: k, why: "a live entry still applies an escalation recorded as void" });
  };
  for (const [k, e] of Object.entries(register ?? {})) judge(k, e, "live");
  for (const [k, e] of Object.entries(superseded ?? {})) judge(k, e, "superseded");
  return errors;
}
