/**
 * 🔴 F91 · PAGE OPPORTUNITY PLANNING — AMENDMENT 6, THE OWNER'S DEMAND-OR-OPPORTUNITY RULE (acceptance _handoffs
 * AlmiVisibility_F91_ACCEPTANCE_AMENDMENT_6_2026-10-18.md, RR-286; owner decision of 18 Oct 2026: "visibility ko yehi demand dhoondhni hay").
 *
 *   C21  the raw combination count — the product of the two dimensions' value counts — candidates only
 *   C22  three counts, never one maximum: DEMAND pages · OPPORTUNITY pages · MERGED (each naming its target page)
 *   C23  DEMAND = its own recorded demand (a record with its own source and date naming BOTH values — never inherited) AND its own answer;
 *        (the two declared dimensions are named by the batch's inputs: "primary" holds the value whose page a combination merges into)
 *        OPPORTUNITY = no recorded demand, its own answer (a verified claim of a body of that secondary, on the primary's own page);
 *        MERGED INTO the larger page = no own answer, or the same answer as a page already planned. No two planned pages share an answer,
 *        and no planned page lacks one: never a duplicate, never a thin page.
 *   C24  every requested combination carries exactly one label and one reason; nothing is dropped
 *   C25  OPPORTUNITY is Visibility's own label: a combination moves to DEMAND as soon as a demand record names it (movedToDemand)
 * Pure: records in, a plan out. Names no product, tenant, host, primary or country — every value and wording comes from the inputs.
 */
import { recordDemand, DEMAND as D } from "../research/demand-evidence.mjs";

export const LABEL = Object.freeze({ DEMAND: "DEMAND", OPPORTUNITY: "OPPORTUNITY", MERGED: "MERGED", NOT_MEASURED: "NOT MEASURED" });
export const PLAN_LIMIT = "a plan of pages to build — the OPPORTUNITY label lives only in these records, never on a visible page; nothing is published";

const fold = (s) => ` ${String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
/** a wording names a value when one of its aliases stands in it as whole words */
export const names = (text, aliases) => (aliases ?? []).some((a) => fold(text).includes(fold(a)));
const sig = (claims) => claims.map((c) => fold(c.text).trim()).sort().join(" | ");

/**
 * The plan. `primaries`: [{ value, aliases, page }] (page = the larger page a combination merges into); `secondaries`: [{ value, aliases,
 * bodies }]; `claims`: [{ claimId, primary, body, text }] verified claims on each primary's own page; `records`: stored demand records
 * (search phrases, public questions…), each judged by F18's rule (src/research/demand-evidence.mjs) with `textOf(record)` its wording.
 */
export function planPages({ primaries = [], secondaries = [], claims = [], records = [], textOf = (r) => r?.phrase ?? r?.value?.original ?? r?.wording?.text ?? "" }) {
  if (!primaries.length || !secondaries.length) return Object.freeze({ measured: false, missing: !primaries.length ? "the primary dimension's values" : "the secondary dimension's values" });
  const observed = records.map((r) => ({ r, d: recordDemand(r) })).filter((x) => x.d.demand === D.OBSERVED).map((x) => ({ id: x.r.measurement_key ?? x.r.question_id ?? x.r.phrase_id, text: textOf(x.r), source: x.d.source, date: x.d.date }));
  const all = [];
  for (const p of primaries) for (const d of secondaries) {
    const key = `${p.value} × ${d.value}`;
    const own = claims.filter((c) => c.primary === p.value && d.bodies.includes(c.body));
    const demand = observed.filter((o) => names(o.text, p.aliases) && names(o.text, d.aliases));
    all.push({ p, own, demand, base: { combination: key, primary: p.value, secondary: d.value, demand: Object.freeze(demand.map((o) => Object.freeze({ id: o.id, text: o.text, source: o.source, date: o.date }))), answer: Object.freeze(own.map((c) => c.claimId)) } });
  }
  /* the same answer is ONE page: in each group of combinations whose own answers are identical, the one with the most recorded demand is the
   * page (the larger page that has demand; on a tie, the first requested), and every other is a section of it */
  const groups = new Map();
  for (const x of all) if (x.p.page && x.own.length) { const s = sig(x.own); if (!groups.has(s)) groups.set(s, []); groups.get(s).push(x); }
  const repOf = new Map([...groups.values()].map((g) => [sig(g[0].own), g.reduce((a, b) => (b.demand.length > a.demand.length ? b : a))]));
  const rows = all.map(({ p, own, demand, base }) => {
    if (!p.page) return Object.freeze({ ...base, label: LABEL.NOT_MEASURED, reason: "the primary has no page of its own to merge into — the missing input" });
    if (!own.length) return Object.freeze({ ...base, label: LABEL.MERGED, target: p.page, reason: `no answer of its own from a verified fact${demand.length ? ` (demand found: ${demand.length} record(s)) — the question becomes a section of the larger page` : ""}` });
    const rep = repOf.get(sig(own));
    if (rep.base.combination !== base.combination) return Object.freeze({ ...base, label: LABEL.MERGED, target: rep.base.combination, reason: `the same answer as ${rep.base.combination} — a section of that page, never a duplicate` });
    return Object.freeze(demand.length
      ? { ...base, label: LABEL.DEMAND, page: base.combination, reason: `its own recorded demand (${demand.length} record(s)) and its own answer (${own.length} verified claim(s))` }
      : { ...base, label: LABEL.OPPORTUNITY, page: base.combination, reason: `no searches recorded, but its own answer from verified facts (${own.length} claim(s) of its own body) — built complete, labelled OPPORTUNITY in these records only` });
  });
  const n = (l) => rows.filter((r) => r.label === l).length;
  return Object.freeze({
    measured: true, limit: PLAN_LIMIT,
    candidates: primaries.length * secondaries.length,
    counts: Object.freeze({ DEMAND: n(LABEL.DEMAND), OPPORTUNITY: n(LABEL.OPPORTUNITY), MERGED: n(LABEL.MERGED), NOT_MEASURED: n(LABEL.NOT_MEASURED) }),
    rows: Object.freeze(rows), observedRecords: observed.length,
  });
}

/** C23 · the plan's own guard: no two planned pages with the same answer, no planned page without one. */
export function planFaults(plan, { claims = [] } = {}) {
  const text = new Map(claims.map((c) => [c.claimId, c]));
  const pages = (plan.rows ?? []).filter((r) => r.label === LABEL.DEMAND || r.label === LABEL.OPPORTUNITY);
  const faults = [];
  const seen = new Map();
  for (const r of pages) {
    if (!r.answer.length) { faults.push({ combination: r.combination, fault: "THIN — no answer of its own" }); continue; }
    const s = sig(r.answer.map((id) => text.get(id) ?? { text: id }));
    if (seen.has(s)) faults.push({ combination: r.combination, fault: `DUPLICATE — the same answer as ${seen.get(s)}` }); else seen.set(s, r.combination);
  }
  for (const r of plan.rows ?? []) if (r.label === LABEL.MERGED && !r.target) faults.push({ combination: r.combination, fault: "MERGED without its target page" });
  for (const r of plan.rows ?? []) if (r.label === LABEL.DEMAND && !r.demand.length) faults.push({ combination: r.combination, fault: "DEMAND without its own demand record" });
  return faults;
}

/** C25 · the OPPORTUNITY pages a later plan moves to DEMAND, with the records that moved each. */
export function movedToDemand(before, after) {
  const was = new Map((before.rows ?? []).map((r) => [r.combination, r]));
  return (after.rows ?? []).filter((r) => r.label === LABEL.DEMAND && was.get(r.combination)?.label === LABEL.OPPORTUNITY).map((r) => Object.freeze({ combination: r.combination, by: r.demand.map((d) => d.id) }));
}
