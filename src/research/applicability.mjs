/**
 * F16 · WHERE THE PRODUCT APPLIES, BEFORE ROUTES (RR-146 owner addendum) — pure, offline, bounded. It names no product, test,
 * country, institution or field of work: the dimensions and values come from the product's own declaration.
 *
 *   FOUR OUTCOMES, KEPT DISTINCT  REQUIRED · ACCEPTED · NOT_REQUIRED · UNKNOWN. An outcome is read ONLY from a fact that STATES it in its
 *                                 own `applicability.outcome` field — never inferred from a value, a word or another record. ACCEPTED is
 *                                 never turned into REQUIRED. Two records stating different outcomes for one combination are a CONFLICT:
 *                                 the combination is UNKNOWN with both named, never one chosen.
 *   AUTHORITATIVE ONLY            a record counts only when the existing checks pass: its source is tier 1 (the body that decides it, on its
 *                                 own site) by F46's authority check, its citation audit (F46, auditCitation) is PROVED, and its freshness
 *                                 (F45, freshnessOf) is USABLE. Otherwise the combination stays UNKNOWN, the reason named.
 *   ONE BODY IS ONE BODY          a record carrying an `institution` qualifier is evidence about that institution only. It never decides the
 *                                 outcome of the wider combination, and it is listed apart.
 *   BOUNDED                       outcomes are established ONLY for the combinations the routes in hand need. The declared research scope is
 *                                 a scope, never a page plan, and nothing here creates, counts or proposes a page.
 *   COUNTS                        every count names its population (the needed combinations) and its date. UNKNOWN is never zero, and NOT
 *                                 MEASURED is not zero.
 */
import { auditCitation, CITATION, authorityCheck } from "../facts/citation-audit.mjs";
import { freshnessOf } from "../facts/lifecycle.mjs";

export const OUTCOMES = Object.freeze({ REQUIRED: "REQUIRED", ACCEPTED: "ACCEPTED", NOT_REQUIRED: "NOT_REQUIRED", UNKNOWN: "UNKNOWN" });
export const STATED = Object.freeze([OUTCOMES.REQUIRED, OUTCOMES.ACCEPTED, OUTCOMES.NOT_REQUIRED]);
export const APPLICABLE = Object.freeze([OUTCOMES.REQUIRED, OUTCOMES.ACCEPTED]);
const NOT_MEASURED = "NOT MEASURED";
const present = (v) => typeof v === "string" && v.trim() !== "";

/** Why a stating record does not count, or null when it counts — F46's authority and citation checks and F45's freshness, as they stand. */
export function disqualification(f, { persons, now }) {
  const auth = authorityCheck(f);
  if (auth.result !== "ADMISSIBLE") return `source not admissible (${auth.result})`;
  if (f?.source?.tier !== 1) return "source is not tier 1 — not the body that decides it";
  const cite = auditCitation(f, { persons });
  if (cite.verdict !== CITATION.PROVED) return `citation audit ${cite.verdict}`;
  const fresh = freshnessOf(f, { now });
  if (fresh.state !== "USABLE") return `freshness ${fresh.state}`;
  return null;
}

/**
 * @param {{ facts: object[], axisKey: string, routeValues: string[], declaration: { dimension: string, values: string[] }, persons: string[], now: Date }} input
 */
export function applicabilityOf({ facts, axisKey, routeValues, declaration, persons, now }) {
  if (!declaration || !present(declaration.dimension) || !Array.isArray(declaration.values) || declaration.values.length === 0) return { measured: false, missing: "the product's declared applicability { dimension, values }" };
  if (!Array.isArray(persons)) throw new TypeError("the roster of declared persons must be passed explicitly (F46)");
  if (!Array.isArray(facts)) return { measured: false, missing: "the product's fact registry" };
  const dim = declaration.dimension;
  const needed = routeValues.flatMap((v) => declaration.values.map((s) => ({ [axisKey]: v, [dim]: s })));
  const stating = facts.filter((f) => STATED.includes(f?.applicability?.outcome));
  const institutions = [];
  const combinations = needed.map((c) => {
    const here = stating.filter((f) => f.locale?.[axisKey] === c[axisKey] && f.locale?.[dim] === c[dim]);
    for (const f of here.filter((x) => present(x.locale?.institution))) institutions.push({ combination: c, institution: f.locale.institution, outcome: f.applicability.outcome, counts: disqualification(f, { persons, now }) === null, factId: f.id ?? null });
    const pathway = here.filter((f) => !present(f.locale?.institution));
    const counting = [], set = [];
    for (const f of pathway) { const why = disqualification(f, { persons, now }); (why ? set : counting).push(why ? { factId: f.id ?? null, why } : f); }
    const outcomes = [...new Set(counting.map((f) => f.applicability.outcome))];
    if (outcomes.length === 1) return { combination: c, outcome: outcomes[0], records: counting.map((f) => f.id ?? null) };
    if (outcomes.length > 1) return { combination: c, outcome: OUTCOMES.UNKNOWN, why: `CONFLICT — records state ${outcomes.join(" and ")}; none is chosen`, records: counting.map((f) => f.id ?? null) };
    return { combination: c, outcome: OUTCOMES.UNKNOWN, why: pathway.length ? `no stating record counts (${set.map((x) => x.why).join("; ")})` : "no record states an outcome for it", records: [] };
  });
  const counts = Object.fromEntries(Object.values(OUTCOMES).map((o) => [o, combinations.filter((x) => x.outcome === o).length]));
  return { measured: true, population: needed.length, date: now.toISOString().slice(0, 10), counts, combinations, institutions, notes: "a scope for question research — never a page, a page count or a reason to create one" };
}

export const NOT_MEASURED_APPLICABILITY = NOT_MEASURED;
