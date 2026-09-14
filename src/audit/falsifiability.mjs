/**
 * 🔴 ROW 59 — THE REFUTATION CENSUS.
 *
 * Every finding this engine presents is an assertion, and a claim nothing could refute is an opinion wearing a
 * number. This census proves that every presented finding carries a STRUCTURED refutation — observation · source ·
 * condition — whose source names a method this product actually holds.
 *
 * ── THE POPULATION COMES FROM THE STORE, NEVER FROM THE REGISTER ────────────
 *
 * A census that enumerated the register's own keys would read its own source as compliant — the FAILURE the row
 * names. So the population is read from the evidence store: every `issue_class` present on an issue record, and
 * every drafted recommendation. The register is then checked AGAINST it, and a register key the store does not
 * hold is STALE. An empty population is a FAILURE, never a pass, and the population is always returned so it
 * can be printed.
 *
 * ── A METHOD WE HOLD ────────────────────────────────────────────────────────
 *
 * Not a list typed here: the detectors recorded on the issue records in the store, and the runners that exist in
 * bin/. A refutation whose `source.method` is neither names an observation no method we hold could produce.
 *
 * ── 🔴 THE LIMIT ────────────────────────────────────────────────────────────
 *
 * It proves the three parts are PRESENT and point at a method we HOLD. It CANNOT prove a refutation is well
 * chosen — that is human judgement, and this census does not pretend otherwise.
 *
 * This module names no product.
 */

export const REFUTATION_PARTS = Object.freeze(["observation", "source", "condition"]);
export const CENSUS_LIMIT =
  "the census proves each refutation's three parts are present and that its source names a method this product holds; it CANNOT prove the refutation is well chosen — that is human judgement";

const filled = (s) => typeof s === "string" && s.trim().length > 0;

/** The presented population, read from records alone. */
export function presentedPopulation(records = []) {
  const classes = [...new Set(records.filter((r) => r.record_type === "issue" && filled(r.issue_class)).map((r) => r.issue_class))].sort();
  const recommendations = [...new Set(records.filter((r) => r.record_type === "draft_recommendation" && filled(r.recommendation_id)).map((r) => r.recommendation_id))].sort();
  return { classes, recommendations };
}

/** Methods this product holds: detectors recorded in the store, and runners that exist (e.g. "bin/crawl.mjs"). */
export function heldMethods({ records = [], runners = [] }) {
  const detectors = records.filter((r) => r.record_type === "issue" && filled(r.detector)).map((r) => r.detector);
  return new Set([...detectors, ...runners]);
}

/**
 * @param {object}   a
 * @param {object[]} a.records   the evidence store's records
 * @param {object}   a.register  { classes: {key: refutation}, recommendations: {id: refutation} }
 * @param {string[]} a.runners   runner paths that exist, e.g. "bin/crawl.mjs"
 */
export function refutationCensus({ records, register, runners }) {
  const population = presentedPopulation(records);
  const methods = heldMethods({ records, runners });
  const items = [
    ...population.classes.map((key) => ({ kind: "class", key, entry: register?.classes?.[key] })),
    ...population.recommendations.map((key) => ({ kind: "recommendation", key, entry: register?.recommendations?.[key] })),
  ];

  const missing = [];
  const unrefutable = [];
  const emptyParts = [];
  const unobtainable = [];
  const carrying = [];
  for (const { kind, key, entry } of items) {
    if (!entry) {
      missing.push({ kind, key });
      continue;
    }
    if (entry.unrefutable) {
      unrefutable.push({ kind, key, reason: entry.unrefutable.reason ?? null });
      continue;
    }
    const empty = [];
    if (!filled(entry.observation)) empty.push("observation");
    if (!filled(entry.source?.method)) empty.push("source");
    if (!filled(entry.condition)) empty.push("condition");
    for (const part of empty) emptyParts.push({ kind, key, part });
    if (filled(entry.source?.method) && !methods.has(entry.source.method)) unobtainable.push({ kind, key, method: entry.source.method });
    if (empty.length === 0 && methods.has(entry.source.method)) carrying.push({ kind, key, method: entry.source.method });
  }

  const stale = [
    ...Object.keys(register?.classes ?? {}).filter((k) => !population.classes.includes(k)).map((key) => ({ kind: "class", key })),
    ...Object.keys(register?.recommendations ?? {}).filter((k) => !population.recommendations.includes(k)).map((key) => ({ kind: "recommendation", key })),
  ];
  const vacuous = items.length === 0;

  return {
    population,
    checked: items.length,
    carrying,
    missing,
    unrefutable,
    emptyParts,
    unobtainable,
    stale,
    vacuous,
    methodsHeld: [...methods].sort(),
    ok: !vacuous && !missing.length && !unrefutable.length && !emptyParts.length && !unobtainable.length && !stale.length && carrying.length === items.length,
    limit: CENSUS_LIMIT,
  };
}
