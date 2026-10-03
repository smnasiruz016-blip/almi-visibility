/**
 * 🔴 F62 · INTERNATIONAL AND LOCALE INTELLIGENCE — WHERE A PRODUCT APPLIES (acceptance _handoffs a5ec9f1, RR-148). Pure, offline,
 * bounded. It names no product, host, tenant, profession, country, institution or dimension: the dimension is the product's own
 * declared KEY, its values are the ones the product's own records carry (F13's qualifier reader), and every judgement is F45's or F46's.
 *
 *   C1 FOUR OUTCOMES     REQUIRED · ACCEPTED · NOT_REQUIRED · UNKNOWN, read ONLY from a record's own stated `applicability.outcome`.
 *                        ACCEPTED is never REQUIRED. Two deciding records stating different outcomes → UNKNOWN, both named, none chosen.
 *   C2 ABSENT → UNKNOWN  a needed combination with no record stating an outcome for its exact scope is UNKNOWN, "no source" named.
 *   C3 DECIDES ONLY IF   F46's authority check reads ADMISSIBLE, the source is tier 1 (the deciding body's own source), F46's citation
 *                        audit reads PROVED, and F45 presents the record CURRENT (fresh on the STATED date, uncontradicted). Otherwise
 *                        UNKNOWN with the failing reason. An undated record is NOT MEASURED by F45, so it never decides.
 *   C4 ONE SCOPE         a record decides only a combination whose scope is EXACTLY its own (the same qualifier keys, the same values).
 *                        A record naming MORE keys is narrower — evidence about that narrower scope only, listed apart; a record naming
 *                        FEWER keys is wider — never copied down to the narrower combination.
 *   C5 BOUNDED           only the combinations the routes in hand need: each route × each value of the declared dimension that the
 *                        product's own records carry. No catalogue, and nothing asked of the owner beyond the dimension's key.
 *   C6 NOT A PAGE        nothing here creates, counts or proposes a page; the hand-off is routes for REQUIRED/ACCEPTED combinations only,
 *                        each carrying its records, their dates and its limits — never an observed question, an opportunity or demand.
 *   C8 THE REST          language, cultural and search differences have no defined evidence path: each is NOT MEASURED, named.
 */
import { qualifierPairs } from "../discovery/context-axes.mjs";
import { auditCitation, CITATION } from "../facts/citation-audit.mjs";
import { assessFactHealth } from "../facts/fact-health.mjs";

export const OUTCOMES = Object.freeze({ REQUIRED: "REQUIRED", ACCEPTED: "ACCEPTED", NOT_REQUIRED: "NOT_REQUIRED", UNKNOWN: "UNKNOWN" });
export const STATED = Object.freeze([OUTCOMES.REQUIRED, OUTCOMES.ACCEPTED, OUTCOMES.NOT_REQUIRED]);
export const APPLICABLE = Object.freeze([OUTCOMES.REQUIRED, OUTCOMES.ACCEPTED]);
export const NOT_MEASURED = "NOT MEASURED";
export const NOT_MEASURED_APPLICABILITY = NOT_MEASURED;
/* C8 — the other differences F62's line names, held as words of the row, never as a product's dimension */
export const OTHER_DIFFERENCES = Object.freeze(["language", "cultural", "search"]);
export const MISSING = Object.freeze({
  date: "a stated judging date (YYYY-MM-DD) — a date is a measurement, never the clock's default",
  dimension: "the product's declared applicability dimension — its KEY only, never a list of values",
  facts: "the product's fact registry",
  routes: "research routes in hand",
  discovered: "F13 reports no such dimension from the product's own records",
  carried: "a record of the product carrying a value of the declared applicability dimension",
  otherEvidence: "an owner-defined recorded evidence path for this difference (F62 C8)",
});
export const ROUTE_LIMITS = "a place to look for public questions in a combination where a current, proved, authoritative record states the product applies — not an observed question, not a page opportunity and not evidence of demand";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const present = (v) => typeof v === "string" && v.trim() !== "";
const active = (f) => f?.life?.status !== "retired";
const scopeOf = (f) => new Map(qualifierPairs(f));
/* every pair of `inner` is also in `outer` */
const covers = (outer, inner) => [...inner].every(([k, v]) => outer.get(k) === v);
/* C3 — a deciding record's observed date: F45's recorded check date, one reader for every path */
const observedOnOf = (health, f) => health.get(f.id)?.freshness?.checkedOn ?? null;
/* C8 — one builder, used by every path: each difference NOT MEASURED, its missing definition named */
const otherDifferencesNow = () => Object.freeze(Object.fromEntries(OTHER_DIFFERENCES.map((d) => [d, Object.freeze({ state: NOT_MEASURED, missing: MISSING.otherEvidence })])));
const comboKey = (m) => JSON.stringify([...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** C5 — the combinations the routes in hand need: each route × each value of the declared dimension the product's records carry. */
export function neededCombinations({ routes, dimension, facts }) {
  const values = [...new Set(facts.filter(active).flatMap((f) => qualifierPairs(f).filter(([k]) => k === dimension).map(([, v]) => v)))].sort();
  const byKey = new Map();
  for (const r of routes) {
    const own = present(r?.dimension) ? [[r.dimension, r.value]] : [];
    const targets = own.length && r.dimension === dimension ? [r.value] : values;
    for (const v of targets) {
      const scope = new Map([...own.filter(([k]) => k !== dimension), [dimension, v]]);
      const k = comboKey(scope);
      if (!byKey.has(k)) byKey.set(k, { scope, route: { dimension: present(r?.dimension) ? r.dimension : null, value: present(r?.dimension) ? r.value : null }, routeIds: [] });
      if (r?.route_id) byKey.get(k).routeIds.push(r.route_id);
    }
  }
  return { values: values.length, combinations: [...byKey.values()] };
}

/** C3 — why a record stating an outcome does not decide, or null when it decides: F46's checks and F45's presentation, as they stand. */
export function disqualification(f, { persons, health }) {
  const cite = auditCitation(f, { persons });
  const auth = cite.checks.authority;
  if (auth.result !== "ADMISSIBLE") return `source not admissible (F46 AUTHORITY ${auth.result}${auth.missing ? ` — missing ${auth.missing}` : ""})`;
  if (f?.source?.tier !== 1) return "source is not tier 1 — not the deciding body's own source";
  if (cite.verdict !== CITATION.PROVED) {
    const open = Object.entries(cite.checks).filter(([, c]) => !["WORKED", "MATCHED", "NOT_APPLICABLE", "ADMISSIBLE", "CONFIRMED"].includes(c.result)).map(([k, c]) => `${k.toUpperCase()} ${c.result}${c.reason ? ` (${c.reason})` : ""}`);
    return `citation ${cite.verdict} by F46 — ${open.join(", ")}`;
  }
  const h = health.get(f.id);
  if (!h) return "F45 holds no assessment of it";
  if (h.presentation !== "CURRENT") return `F45 ${h.presentation} — ${h.reasons.join("; ")}`;
  return null;
}

/**
 * @param {{ product: object, axes: object, routes: object[]|string, facts: object[]|null, persons: string[], on: string }} input
 */
export function applicabilityOf({ product, axes, routes, facts, persons, on }) {
  if (!Array.isArray(persons)) throw new TypeError("the roster of declared persons must be passed explicitly (F46) — an empty roster is a recorded fact, not a default");
  const otherDifferences = otherDifferencesNow();
  const base = { otherDifferences, pagesCreated: 0, pagesCounted: 0, notes: "a scope for question research — never a page, a page count or a reason to create one" };
  const unmeasured = (missing) => Object.freeze({ ...base, measured: false, missing });
  if (!ISO.test(on ?? "")) return unmeasured(MISSING.date);
  const dimension = product?.research?.applicability?.dimension;
  if (!present(dimension)) return unmeasured(MISSING.dimension);
  if (!Array.isArray(facts)) return unmeasured(MISSING.facts);
  if (!Array.isArray(routes) || routes.length === 0) return unmeasured(MISSING.routes);
  if (!(axes?.discovered ?? []).some((d) => d?.key === dimension)) return unmeasured(MISSING.discovered);
  const { values, combinations: needed } = neededCombinations({ routes, dimension, facts });
  if (values === 0) return unmeasured(MISSING.carried);

  const act = facts.filter(active);
  const health = new Map(assessFactHealth(act, { on }).facts.map((x) => [x.id, x]));
  const stating = act.filter((f) => STATED.includes(f?.applicability?.outcome));
  const narrower = new Map();
  const combinations = needed.map((n) => {
    const exact = [], wider = [];
    for (const f of stating) {
      const s = scopeOf(f);
      if (s.size === n.scope.size && covers(s, n.scope)) exact.push(f);
      else if (s.size > n.scope.size && covers(s, n.scope)) narrower.set(f.id ?? JSON.stringify([...s]), { factId: f.id ?? null, outcome: f.applicability.outcome, extraKeys: s.size - n.scope.size });
      else if (s.size < n.scope.size && covers(n.scope, s)) wider.push(f.id ?? null);
    }
    const counting = [], refused = [];
    for (const f of exact) { const why = disqualification(f, { persons, health }); if (why) refused.push({ factId: f.id ?? null, why }); else counting.push(f); }
    const out = { scope: Object.freeze(Object.fromEntries(n.scope)), route: n.route, routeIds: n.routeIds };
    const outcomes = [...new Set(counting.map((f) => f.applicability.outcome))];
    if (outcomes.length === 1) return Object.freeze({ ...out, outcome: outcomes[0], records: counting.map((f) => Object.freeze({ factId: f.id ?? null, observedOn: observedOnOf(health, f) })) });
    if (outcomes.length > 1) return Object.freeze({ ...out, outcome: OUTCOMES.UNKNOWN, why: `CONFLICT — deciding records state ${outcomes.join(" and ")}; none is chosen`, records: [] });
    if (refused.length) return Object.freeze({ ...out, outcome: OUTCOMES.UNKNOWN, why: `no stating record decides it (${refused.map((x) => x.why).join("; ")})`, records: [] });
    if (wider.length) return Object.freeze({ ...out, outcome: OUTCOMES.UNKNOWN, why: `scope not covered — only a wider record states an outcome (${wider.length}), never copied down`, records: [] });
    return Object.freeze({ ...out, outcome: OUTCOMES.UNKNOWN, why: "no source — no record states an outcome for this exact scope", records: [] });
  });
  const counts = Object.freeze(Object.fromEntries(Object.values(OUTCOMES).map((o) => [o, combinations.filter((x) => x.outcome === o).length])));
  return Object.freeze({
    ...base, measured: true, on, dimension,
    population: combinations.length,
    bound: `the combinations the ${routes.length} route(s) in hand need × the ${values} value(s) of the declared dimension carried by the product's own records`,
    counts, combinations: Object.freeze(combinations),
    narrower: Object.freeze([...narrower.values()]),
    statingRecords: stating.length, activeRecords: act.length,
  });
}

/* RR-149 · THE DERIVED RESEARCH DECLARATION — a reviewable proposal built ONLY from evidence the product already holds; nobody lists
 * a country, profession, institution, link or route count. Each DECIDING BODY is a record's own `claim.subject` among its tier-1 records
 * (the body that publishes its own rule); each SCOPE is a distinct qualifier set those records carry; the body is part of the scope, so
 * one body's record never decides another's check. Every check's outcome is decided by exactly the same rules as above (C1–C4). */
export const PROPOSED_CHECK_IS_NOT = Object.freeze(["an applicability verdict", "a public question", "demand evidence", "a page opportunity", "permission to make a page"]);
export const CHECK_AUTHORITY = "the deciding body's own current source (tier 1) — a test owner's recognition list, a regulator's or council's own page, or the institution's or employer's own page; a blog, coaching site, aggregator or third-party list never decides";
export const MISSING_FACT = Object.freeze({
  outcome: "a record of this body, for this exact scope, that STATES an outcome (REQUIRED · ACCEPTED · NOT_REQUIRED)",
  person: "a checker declared a person, whose recorded verdict confirms the record (F46 C3)",
  tier1: "a current record from any deciding body's own source (tier 1)",
  registry: "the product's fact registry",
  dimensions: "F13's dimensions for the product",
});
const scopeKey = (body, scope) => JSON.stringify([body, [...scope].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))]);

/**
 * @param {{ axes: object|null, facts: object[]|null, persons: string[], on: string }} input
 */
export function deriveDeclaration({ axes, facts, persons, on }) {
  if (!Array.isArray(persons)) throw new TypeError("the roster of declared persons must be passed explicitly (F46) — an empty roster is a recorded fact, not a default");
  const otherDifferences = otherDifferencesNow();
  const base = { kind: "DERIVED RESEARCH DECLARATION — a proposal for review, never a verdict", notA: PROPOSED_CHECK_IS_NOT, otherDifferences, pagesCreated: 0, pagesCounted: 0 };
  if (!ISO.test(on ?? "")) return Object.freeze({ ...base, derived: false, missing: [MISSING.date] });
  if (!Array.isArray(facts)) return Object.freeze({ ...base, derived: false, missing: [MISSING_FACT.registry] });
  const dimensions = Array.isArray(axes?.discovered)
    ? Object.freeze(axes.discovered.map((d) => Object.freeze({ key: d.key, status: (axes.declared ?? []).find((x) => x.key === d.key)?.status ?? "CANDIDATE", records: d.records ?? null, verifiedRecords: d.verifiedRecords ?? null, distinctValues: d.distinctValues ?? null })))
    : NOT_MEASURED;
  const act = facts.filter(active);
  const deciding = act.filter((f) => f?.source?.tier === 1 && present(f?.claim?.subject));
  const health = new Map(assessFactHealth(act, { on }).facts.map((x) => [x.id, x]));
  const byKey = new Map();
  for (const f of deciding) {
    const scope = scopeOf(f);
    const k = scopeKey(f.claim.subject, scope);
    if (!byKey.has(k)) byKey.set(k, { body: f.claim.subject, scope, records: [] });
    byKey.get(k).records.push(f);
  }
  const checks = [...byKey.values()].map(({ body, scope, records }) => {
    const stating = records.filter((f) => STATED.includes(f?.applicability?.outcome));
    const counting = [], refused = [];
    for (const f of stating) { const why = disqualification(f, { persons, health }); if (why) refused.push(why); else counting.push(f); }
    const outcomes = [...new Set(counting.map((f) => f.applicability.outcome))];
    const unknownFields = [];
    if (!stating.length) unknownFields.push(MISSING_FACT.outcome);
    if (!records.some((f) => persons.includes(f?.verification?.checkedBy))) unknownFields.push(MISSING_FACT.person);
    const outcome = outcomes.length === 1 ? outcomes[0] : OUTCOMES.UNKNOWN;
    const why = outcomes.length === 1 ? null : outcomes.length > 1 ? `CONFLICT — deciding records state ${outcomes.join(" and ")}; none is chosen` : refused.length ? `no stating record decides it (${refused.join("; ")})` : "no source — no record of this body states an outcome for this exact scope";
    return Object.freeze({
      body, scope: Object.freeze(Object.fromEntries(scope)), outcome, why,
      provenance: Object.freeze(records.map((f) => Object.freeze({ factId: f.id ?? null, observedOn: observedOnOf(health, f), presentation: health.get(f.id)?.presentation ?? null }))),
      requiredAuthority: CHECK_AUTHORITY, unknownFields: Object.freeze(unknownFields), status: "PROPOSED — not a verdict, not a question, not demand, not a page",
    });
  });
  const missing = [];
  if (!deciding.length) missing.push(MISSING_FACT.tier1);
  if (dimensions === NOT_MEASURED) missing.push(MISSING_FACT.dimensions);
  if (checks.some((c) => c.unknownFields.includes(MISSING_FACT.outcome))) missing.push(MISSING_FACT.outcome);
  if (checks.some((c) => c.unknownFields.includes(MISSING_FACT.person))) missing.push(MISSING_FACT.person);
  return Object.freeze({
    ...base, derived: true, on, dimensions, checks: Object.freeze(checks),
    counts: Object.freeze({
      checks: checks.length, bodies: new Set(checks.map((c) => c.body)).size,
      byOutcome: Object.freeze(Object.fromEntries(Object.values(OUTCOMES).map((o) => [o, checks.filter((c) => c.outcome === o).length]))),
      activeRecords: act.length, decidingRecords: deciding.length, notDeciding: act.length - deciding.length,
      statingRecords: act.filter((f) => STATED.includes(f?.applicability?.outcome)).length,
    }),
    missing: Object.freeze(missing),
    bound: `the ${act.length} active record(s) the product already holds — no catalogue, no list typed by anyone`,
  });
}

/**
 * C6 — the hand-off to F16: one research route per REQUIRED or ACCEPTED combination, each carrying the records that decided it, their
 * observed dates and its limits. Read-only. Unmeasured applicability hands over nothing.
 */
export function applicableRoutes(applicability) {
  if (!applicability?.measured) return NOT_MEASURED;
  return Object.freeze(applicability.combinations.filter((c) => APPLICABLE.includes(c.outcome)).map((c) => Object.freeze({
    route: c.route, scope: c.scope, outcome: c.outcome, records: c.records, measuredOn: applicability.on, limits: ROUTE_LIMITS,
  })));
}
