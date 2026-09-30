/**
 * F29 · TECHNICAL ISSUE PRIORITIZATION (acceptance _handoffs c8eee0c, RR-96).
 *
 * Spec row: "Rank issues by evidence, reach, severity, affected population, effort and reversibility." The spec gives no order or weights,
 * and choosing them is a product decision no authority has made — so NONE is invented: an issue ranks above another only when it
 * DOMINATES it (at least as high on every recorded dimension, higher on one). Issues neither of which dominates the other are INCOMPARABLE
 * and share a layer. A dimension recorded for one issue of a pair and not the other makes the pair INCOMPARABLE — a missing value never
 * lets one issue outrank another (fails closed). NOT MEASURED dimensions take no part and are named. Ranking changes nothing and
 * predicts no gain. Pure; names no product.
 */

export const DIMENSIONS = Object.freeze(["evidence", "reach", "severity", "affectedPopulation", "effort", "reversibility"]);
const SEVERITY = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 });
/* higher is more urgent for every compared dimension; effort and reversibility, when recorded, are LOWER effort and MORE reversible first */
const value = { evidence: (x) => x, reach: (x) => x, severity: (x) => SEVERITY[x] ?? null, affectedPopulation: (x) => x, effort: (x) => (typeof x === "number" ? -x : null), reversibility: (x) => (typeof x === "number" ? x : null) };

/** One issue's dimensions, each a number or null (NOT MEASURED). */
export function dimensionsOf(issue) {
  const d = {};
  for (const k of DIMENSIONS) { const v = issue[k] === null || issue[k] === undefined ? null : value[k](issue[k]); d[k] = typeof v === "number" && Number.isFinite(v) ? v : null; }
  return d;
}

/** 1 when a dominates b, -1 when b dominates a, 0 when incomparable or equal. */
export function compare(a, b) {
  let ge = true, le = true, gt = false, lt = false;
  for (const k of DIMENSIONS) {
    const x = a[k], y = b[k];
    if (x === null && y === null) continue;
    if (x === null || y === null) return 0; // recorded for one only — never decides an order
    if (x < y) { ge = false; lt = true; }
    if (x > y) { le = false; gt = true; }
  }
  if (ge && gt) return 1;
  if (le && lt) return -1;
  return 0;
}

/**
 * @param issues [{ id, issueClass, evidence, reach, reachWindow, severity, effort, reversibility }] — this client's own issues
 * @returns layers: layer 1 = issues no other issue dominates; then the same over the rest
 */
export function rankIssues(issues) {
  const perClass = new Map();
  for (const i of issues) perClass.set(i.issueClass, (perClass.get(i.issueClass) ?? 0) + 1);
  const rows = issues.map((i) => ({ id: i.id, issueClass: i.issueClass, reachWindow: i.reachWindow ?? null, dims: dimensionsOf({ ...i, affectedPopulation: perClass.get(i.issueClass) }) }));
  let rest = [...rows];
  const layers = [];
  while (rest.length) {
    const top = rest.filter((r) => !rest.some((o) => o !== r && compare(o.dims, r.dims) === 1));
    layers.push(top.map((r) => r.id));
    rest = rest.filter((r) => !top.includes(r));
  }
  const notMeasured = Object.fromEntries(DIMENSIONS.map((k) => [k, rows.filter((r) => r.dims[k] === null).length]));
  return Object.freeze({ issues: rows.length, layers, layerSizes: layers.map((l) => l.length), notMeasured, windows: [...new Set(rows.map((r) => r.reachWindow).filter(Boolean))] });
}
