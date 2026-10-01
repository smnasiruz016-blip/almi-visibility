/**
 * F91 · PAGE OPPORTUNITY PLANNING (acceptance _handoffs 2048dd3, RR-113; scope reconciled 24c44d0).
 *
 * THREE NUMBERS, NEVER ONE. Each is reported apart, with its inputs, their sources, what was excluded and why, what is unknown, its method
 * and its bound — never summed, never substituted, never a page total, never a quota.
 *
 *   1 POSSIBLE COMBINATIONS   the product's DECLARED page dimensions: one dimension → its declared values; several → only the combinations
 *                             the product declares relevant, else NOT MEASURED (never the product of the sizes — no blind multiplication).
 *                             Candidates only: never a plan, a target, a potential or a page estimate.
 *   2 VERIFIED OPPORTUNITIES  a candidate counts only when all four limbs are RECORDED for it — a demand outcome in a state the OWNER has
 *                             declared qualifying, a reliable source, verified product fit, a materially distinct need. No declaration of
 *                             qualifying states → NOT MEASURED. A limb recorded as not met excludes the candidate (named); a limb with no
 *                             record leaves it undecided, and one undecided candidate makes the number NOT MEASURED — fails closed.
 *   3 GENUINELY NEEDED PAGES  only from number 2, after needs are grouped by an OWNER-DECLARED grouping rule and each group's existing
 *                             coverage and unique value are recorded; anything missing → NOT MEASURED. No threshold is chosen here.
 *   ORDER LAW                 all three measured → 1 ≥ 2 ≥ 3, else a planner DEFECT (DISPROVED), never reordered; any NOT MEASURED → the
 *                             order is NOT CHECKABLE, never "holding".
 * Pure: declared inputs in, counts out. Names no product. Never fetches, renders or writes.
 */
export const NOT_MEASURED = "NOT MEASURED";
export const VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const LABELS = Object.freeze({
  possible: "POSSIBLE COMBINATIONS — candidates only; not pages, not a plan, not a target, not a potential, not a page estimate",
  verified: "VERIFIED OPPORTUNITIES",
  needed: "GENUINELY NEEDED PAGES",
});
export const MISSING = Object.freeze({
  noDimension: "a declared page dimension with at least one declared value",
  combinationRule: "the product's declaration of which combinations of its several dimensions are relevant",
  qualifyingStates: "an owner declaration of which recorded demand states qualify as traceable demand",
  demandEvidence: "a recorded demand outcome for the candidate",
  groupingRule: "an owner-declared rule for when two needs are equivalent",
  coverage: "a recorded existing-coverage assessment for each group",
  uniqueValue: "a recorded unique-value assessment for each group (the page-quality gate F40 is BLOCKED-BY-AUTHORITY)",
});
const LIMBS = Object.freeze(["demand", "reliableSource", "productFit", "distinctNeed"]);
const measured = (v) => Number.isInteger(v);
const nm = (missing) => ({ value: NOT_MEASURED, missing });

/** Number 1. `dimensions`: [{ key, values }] as the product declares them; `declaredCombinations`: the product's own list, or null. */
export function possibleCombinations({ dimensions, declaredCombinations = null }) {
  const used = dimensions.filter((d) => Array.isArray(d.values) && d.values.length > 0);
  const omitted = dimensions.length - used.length;
  let candidates = null, missing = null;
  if (used.length === 0) missing = MISSING.noDimension;
  else if (used.length === 1) candidates = used[0].values.map((v) => ({ [used[0].key]: v }));
  else if (Array.isArray(declaredCombinations)) candidates = declaredCombinations;
  else missing = MISSING.combinationRule;
  return {
    label: LABELS.possible,
    ...(candidates ? { value: candidates.length } : nm(missing)),
    candidates,
    method: used.length > 1 ? "the combinations the product declares relevant — never the product of the dimensions' sizes" : "the declared values of the product's one declared page dimension",
    omittedDimensions: omitted,
  };
}

const keyOf = (c) => JSON.stringify(Object.keys(c).sort().map((k) => [k, c[k]]));

/** Number 2. `records`: Map(candidateKey → { demand: { state, owned, observed }, reliableSource, productFit, distinctNeed }) — RECORDED only. */
export function verifiedOpportunities({ possible, qualifyingDemandStates = null, records = new Map() }) {
  const excluded = Object.fromEntries(LIMBS.map((l) => [l, 0]));
  if (!measured(possible.value)) return { label: LABELS.verified, ...nm(`number 1, which is itself NOT MEASURED — ${possible.missing}`), excluded, undecided: null, opportunities: null };
  if (!Array.isArray(qualifyingDemandStates)) return { label: LABELS.verified, ...nm(MISSING.qualifyingStates), excluded, undecided: null, opportunities: null };
  const opportunities = [];
  let undecided = 0, owned = 0, inferred = 0;
  for (const c of possible.candidates) {
    const r = records.get(keyOf(c));
    const met = {
      demand: r?.demand?.state === undefined || r?.demand?.state === null ? undefined : qualifyingDemandStates.includes(r.demand.state),
      reliableSource: r?.reliableSource, productFit: r?.productFit, distinctNeed: r?.distinctNeed,
    };
    if (LIMBS.some((l) => met[l] !== true && met[l] !== false)) { undecided++; continue; }
    const failed = LIMBS.find((l) => met[l] === false);
    if (failed) { excluded[failed]++; continue; }
    if (r.demand.owned === true) owned++;
    if (r.demand.observed !== true) inferred++;
    opportunities.push(c);
  }
  if (undecided > 0) return { label: LABELS.verified, ...nm(`${MISSING.demandEvidence} or another limb — ${undecided} of ${possible.value} candidate(s) undecided`), excluded, undecided, opportunities: null };
  return { label: LABELS.verified, value: opportunities.length, excluded, undecided: 0, opportunities, ownedEvidence: owned, inferredDemand: inferred };
}

/** Number 3. `groupOf(c)` is the OWNER-DECLARED grouping rule; `assessments`: Map(groupKey → { covered, uniqueValue }) — RECORDED only. */
export function neededPages({ verified, groupOf = null, assessments = new Map() }) {
  if (!measured(verified.value)) return { label: LABELS.needed, ...nm(`number 2, which is itself NOT MEASURED — ${verified.missing}`) };
  if (typeof groupOf !== "function") return { label: LABELS.needed, ...nm(MISSING.groupingRule) };
  const groups = [...new Set(verified.opportunities.map((c) => groupOf(c)))];
  let covered = 0, noValue = 0, pages = 0;
  for (const g of groups) {
    const a = assessments.get(g);
    if (a?.covered !== true && a?.covered !== false) return { label: LABELS.needed, ...nm(MISSING.coverage), groups: groups.length };
    if (a?.uniqueValue !== true && a?.uniqueValue !== false) return { label: LABELS.needed, ...nm(MISSING.uniqueValue), groups: groups.length };
    if (a.covered) covered++; else if (!a.uniqueValue) noValue++; else pages++;
  }
  return { label: LABELS.needed, value: pages, groups: groups.length, excluded: { coveredByAnExistingPage: covered, noUniqueValue: noValue } };
}

/** The order law: checked only when all three are numbers; a breach is a DEFECT, never reordered. */
export function orderLaw(n1, n2, n3) {
  if (![n1, n2, n3].every((n) => measured(n.value))) return { state: "NOT CHECKABLE", verdict: VERDICT.COULD_NOT_PROVE };
  return n1.value >= n2.value && n2.value >= n3.value ? { state: "HOLDS", verdict: VERDICT.PROVED } : { state: "BREACHED — a planner defect", verdict: VERDICT.DISPROVED };
}

export function planPages({ dimensions, declaredCombinations = null, qualifyingDemandStates = null, records = new Map(), groupOf = null, assessments = new Map() }) {
  const possible = possibleCombinations({ dimensions, declaredCombinations });
  const verified = verifiedOpportunities({ possible, qualifyingDemandStates, records });
  const needed = neededPages({ verified, groupOf, assessments });
  const order = orderLaw(possible, verified, needed);
  /* the order law already returns PROVED only when all three are measured and in order, DISPROVED on a breach, else COULD-NOT-PROVE */
  const verdict = order.verdict;
  return { possible, verified, needed, order, verdict };
}

/** C4/C6: one number's line — a value or NOT MEASURED with its missing input; never 0 in its place, never summed with another. */
export const formatNumber = (n) => (measured(n.value) ? `${n.label}: ${n.value}` : `${n.label}: NOT MEASURED — missing ${n.missing}`);
