/**
 * 🔴 ROW 60 — THREE LIVE POPULATIONS AND ONE ARCHIVE (owner's ruling, Option A, 14 September 2026).
 *
 *   FINDINGS            a check ran and found something          → carries a level
 *   COVERAGE GAP        a check never ran                        → never a level
 *   DECISION ON RECORD  a deliberate choice whose consequence is
 *                       not established                          → never a level, awaits the owner
 *   AUDIT TRAIL         a claim that was withdrawn; nothing open → not live at all
 *
 * Every distinct issue lands in EXACTLY ONE, and the four totals sum to the store. These are the checks, each its own
 * limb, taken from the registers and the store — never from the code that renders them:
 *
 *   population-level       a decision or audit-trail class carries a level, or sits in the consequence register
 *   population-ranked      a decision or audit-trail class appears in the findings order
 *   decision-hidden        a decision on record does not surface on the owner's report — with its count, its
 *                          impressions and the recommendation it waits on
 *   population-membership  an issue that lands in two populations, or in none
 *   population-sum         the four totals do not sum to the store's distinct issues, or a declared count disagrees
 *   archive                an audit-trail class holding an OPEN issue, or any issue not SUPERSEDED
 *
 * This module names no product.
 */

import { targetPageId, canonicalUrl } from "../evidence/ids.mjs";

export const POPULATIONS = Object.freeze(["FINDINGS", "COVERAGE GAP", "DECISION ON RECORD", "AUDIT TRAIL"]);
const LEVEL_KEYS = Object.freeze(["level", "severity", "consequence", "reversibility", "blastRadius", "escalatedFrom", "ruledBy"]);

/** Every population whose register holds this class. Exactly one is lawful. */
export function populationsOf(issueClass, { register, coverage, decisions, auditTrail }) {
  return [
    register?.[issueClass] ? "FINDINGS" : null,
    coverage?.[issueClass] ? "COVERAGE GAP" : null,
    decisions?.[issueClass] ? "DECISION ON RECORD" : null,
    auditTrail?.[issueClass] ? "AUDIT TRAIL" : null,
  ].filter(Boolean);
}

/** The four-way split of every distinct issue, by the registers. An issue in two or none is counted under neither. */
export function fourWay(view, registers) {
  const totals = Object.fromEntries(POPULATIONS.map((p) => [p, 0]));
  const open = Object.fromEntries(POPULATIONS.map((p) => [p, 0]));
  let unplaced = 0;
  for (const v of view.values()) {
    const ps = populationsOf(v.class, registers);
    if (ps.length !== 1) {
      unplaced += 1;
      continue;
    }
    totals[ps[0]] += 1;
    if (v.state === "OPEN") open[ps[0]] += 1;
  }
  return { distinct: view.size, totals, open, unplaced };
}

/** Measured search impressions on the pages a class's issues name, from the newest COMPLETE page-rows pull. */
export function impressionsForClass(issueClass, { view, records }) {
  const pull = records
    .filter((r) => r.method === "gsc.searchAnalytics.query:page-rows" && r.value?.dataState === "COMPLETE")
    .sort((a, b) => a.observed_at.localeCompare(b.observed_at))
    .at(-1);
  const pageOf = new Map(records.filter((r) => r.record_type === "issue").map((r) => [r.issue_id, r.target_page_id]));
  const pages = new Set([...view.values()].filter((v) => v.class === issueClass).map((v) => pageOf.get(v.issue_id)));
  if (!pull) return { state: "UNKNOWN", reason: "no COMPLETE page-rows pull is stored", pages: pages.size };
  let impressions = 0;
  let joined = new Set();
  for (const row of pull.value.rows ?? []) {
    let id;
    try {
      id = targetPageId(canonicalUrl(row.url));
    } catch {
      continue;
    }
    if (!pages.has(id)) continue;
    impressions += row.impressions ?? 0;
    joined.add(id);
  }
  return { state: "MEASURED", impressions, pages: pages.size, pagesJoined: joined.size, pull: pull.observation_id, window: `${pull.value.startDate}..${pull.value.endDate}` };
}

/**
 * 🔴 RR-196 · EVERY PAGE AND ITS MEASURED SIGNAL, for a decision on record whose records carry a REVIEW SIGNAL — one row per distinct
 * issue, read from its first stored copy, never summarised away (the owner's sheet and the owner's report both list these). A class
 * whose records carry no signal (noindex) has none. The page is named by its stored target_page_id — the records hold no URL.
 */
export function signalsForClass(issueClass, { view, records }) {
  const first = new Map();
  for (const r of records) if (r.record_type === "issue" && !first.has(r.issue_id)) first.set(r.issue_id, r);
  return [...view.values()].filter((v) => v.class === issueClass).map((v) => first.get(v.issue_id)).filter((r) => r?.signal)
    .map((r) => ({ target_page_id: r.target_page_id, issue_id: r.issue_id, signal: r.signal.name, value: r.signal.value, bound: r.signal.bound, state: view.get(r.issue_id).state }))
    .sort((a, b) => (a.target_page_id < b.target_page_id ? -1 : a.target_page_id > b.target_page_id ? 1 : a.issue_id < b.issue_id ? -1 : 1));
}

/**
 * @param {object}   a
 * @param {Map}      a.view        splitView's view of the store
 * @param {object[]} a.records     every record — for the impressions join
 * @param {object}   a.register    the consequence register (findings)
 * @param {object}   a.coverage    the coverage register
 * @param {object}   a.decisions   the decision register
 * @param {object}   a.auditTrail  the audit trail
 * @param {string[]} a.orderIds    every id in the findings order
 * @param {string}   a.reportHtml  the owner's report as committed — or null when no report is being checked
 * @param {Function} [a.assign]    the population assignment to police (default: populationsOf)
 */
export function populationErrors({ view, records, register, coverage, decisions, auditTrail, orderIds = [], reportHtml = null, assign = populationsOf }) {
  const errors = [];
  const registers = { register, coverage, decisions, auditTrail };

  for (const [label, reg] of [["decision on record", decisions], ["audit trail", auditTrail]]) {
    for (const [k, e] of Object.entries(reg ?? {})) {
      const held = LEVEL_KEYS.filter((f) => e?.[f] !== undefined);
      if (held.length) errors.push({ limb: "population-level", id: k, why: `a ${label} entry carries ${held.join(", ")} — it is not a finding, and no severity is true of it` });
      if (register?.[k]) errors.push({ limb: "population-level", id: k, why: `a ${label} class sits in the consequence register — it is not a finding and is given no level` });
      if (orderIds.includes(k)) errors.push({ limb: "population-ranked", id: k, why: `a ${label} class appears in the findings order — it is never ranked beside a finding` });
    }
  }

  // exactly one population per issue — judged through the assignment, against the registers
  const byClass = new Map();
  for (const v of view.values()) {
    const ps = assign(v.class, registers);
    if (ps.length !== 1) errors.push({ limb: "population-membership", id: v.issue_id, class: v.class, count: ps.length, why: `issue of class ${v.class} lands in ${ps.length ? ps.join(" AND ") : "no population"} — every issue lands in exactly one` });
    const e = byClass.get(v.class) ?? { distinct: 0, open: 0, notSuperseded: 0 };
    e.distinct += 1;
    if (v.state === "OPEN") e.open += 1;
    if (v.state !== "SUPERSEDED") e.notSuperseded += 1;
    byClass.set(v.class, e);
  }
  // collapse to one error per class so a sabotage reads cleanly
  const seen = new Set();
  for (let i = errors.length - 1; i >= 0; i--) {
    const e = errors[i];
    if (e.limb !== "population-membership") continue;
    const key = e.why.replace(/^issue of class (\S+).*/, "$1");
    if (seen.has(key)) errors.splice(i, 1);
    else seen.add(key);
  }

  // the declared counts, and the four totals against the store
  const declared = (reg) => Object.entries(reg ?? {}).reduce((n, [k, e]) => {
    const stored = byClass.get(k)?.distinct ?? 0;
    if (e.count !== stored && reg !== coverage) errors.push({ limb: "population-sum", id: k, why: `the entry records ${e.count} and the store holds ${stored}` });
    return n + (e.count ?? 0);
  }, 0);
  const findings = [...view.values()].filter((v) => register?.[v.class]).length;
  const sum = findings + declared(coverage) + declared(decisions) + declared(auditTrail);
  if (sum !== view.size) errors.push({ limb: "population-sum", shortfall: view.size - sum, why: `findings ${findings} + coverage + decisions + audit trail = ${sum}, and the store holds ${view.size} distinct issues — the four populations must sum to the store` });

  // the archive holds withdrawn claims only
  for (const k of Object.keys(auditTrail ?? {})) {
    const e = byClass.get(k);
    if (e?.open) errors.push({ limb: "archive", id: k, why: `${e.open} OPEN issue(s) put in the audit trail — a class with open issues is live, never history` });
    else if (e?.notSuperseded) errors.push({ limb: "archive", id: k, why: `${e.notSuperseded} issue(s) not SUPERSEDED in the audit trail — only a claim withdrawn as wrong is archived, not a real defect that was closed` });
  }

  // 🔴 a decision on record is MORE visible than a finding: the owner's report shows it, above the findings
  if (reportHtml !== null) {
    const section = reportHtml.match(/<section id="decisions">([\s\S]*?)<\/section>/)?.[1] ?? null;
    const recsAt = reportHtml.indexOf('<section id="recommendations">');
    const decAt = reportHtml.indexOf('<section id="decisions">');
    for (const [k, e] of Object.entries(decisions ?? {})) {
      const imp = impressionsForClass(k, { view, records });
      const shown =
        section !== null &&
        section.includes(`<code>${k}</code>`) &&
        section.includes(`<strong>${e.count}</strong> issues`) &&
        section.includes(`<code>${e.awaits}</code>`) &&
        (imp.state !== "MEASURED" || section.includes(`<strong>${imp.impressions}</strong> search impressions`)) &&
        (recsAt < 0 || decAt < recsAt);
      if (!shown) errors.push({ limb: "decision-hidden", id: k, why: "a decision on record does not surface on the owner's report — its count, impressions and the recommendation it waits on, above the findings" });
    }
  }
  return errors;
}
