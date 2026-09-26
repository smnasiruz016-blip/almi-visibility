/**
 * 🔴 F10 · C1 · THE HUMAN-QUESTION POPULATION — COUNT-ONLY ACCOUNTING OVER PER-TENANT PARTITIONS.
 *
 * Input: each eligible tenant's partition (src/discovery/search-console-partition.mjs), already decided by F02 — never the
 * shared store read whole. The owner-authorised exclusions are applied in the committed order, each by count:
 *
 *   start = unattributed + operator + Σ exclusion families + retired + cross-tenant duplicates + within-tenant duplicates
 *           + eligible,     remainder 0
 *
 * 🔴 THE ONE CROSS-PARTITION STEP, STATED: the owner's cross-tenant duplicate rule compares partitions. It compares SHA-256
 * digests of normalised wording only, returns counts only, and moves no row between tenants — a row it matches is removed
 * from EVERY tenant that holds it. Measured count at this freeze: 0.
 *
 * Returns counts to any caller, and each tenant's eligible ITEMS (id, row position, wording, source rows) to its caller in
 * memory only. Nothing here prints, logs or records wording. Generic: names no tenant, subject, host or query.
 */
import { createHash } from "node:crypto";

import { hasOperatorSyntax, splitPopulation } from "./query-population.mjs";
import { isHeldOut } from "./intent-clusters.mjs";
import { EXCLUSION_RULES, EXCLUSION_FAMILIES, POPULATION_SOURCE } from "../../config/human-questions.mjs";

export class PopulationRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "PopulationRefused"; this.code = code; }
}

const norm = (q) => String(q).trim().toLowerCase();
const digest = (s) => createHash("sha256").update(s, "utf8").digest("hex");
/** The retired population's registered fingerprint rule (config/evidence-roles.mjs, the RETIRED_CONTAMINATED entry). */
const fingerprint = (members) => digest([...new Set(members.map((m) => m.toLowerCase()))].sort().join("\n")).slice(0, 16);

/**
 * The retired population, re-derived from its own registered observation and CHECKED against its registered fingerprint and
 * size before it is used — a population that does not re-derive is refused, never applied.
 */
export function retiredMembers({ records, entry, observationId = POPULATION_SOURCE.retiredObservationId }) {
  const o = records.find((r) => r?.record_type === "observation" && r.observation_id === observationId);
  if (!o) throw new PopulationRefused("RETIRED_OBSERVATION_ABSENT", "the retired population's observation is not in the store");
  const members = [...new Set(splitPopulation((o.value?.rows ?? []).map((r) => ({ query: r.query }))).human.map((r) => r.query).filter(isHeldOut))];
  if (!entry || fingerprint(members) !== entry.contentHash || members.length !== entry.population) {
    throw new PopulationRefused("RETIRED_POPULATION_DOES_NOT_REDERIVE", "the retired population does not re-derive to its registered fingerprint and size");
  }
  return new Set(members.map(norm));
}

/** The first owner-authorised rule a wording matches, or null. */
export const firstRule = (query, rules = EXCLUSION_RULES) => rules.find((r) => r.re.test(String(query))) ?? null;

/**
 * Account the population. `partitions`: Map tenantId → { items: [{ itemId, rowIndex, query }], arithmetic } for every ACTIVE
 * tenant read; `start`: the observation's row count. Returns { totals, perTenant, eligibleItems, reconciliation, remainder }.
 * perTenant and totals are counts; eligibleItems (Map tenantId → items) is for the caller's mechanism run only.
 */
export function accountPopulation({ start, partitions, retired, rules = EXCLUSION_RULES }) {
  if (!Number.isInteger(start) || start < 0) throw new PopulationRefused("START_UNKNOWN", "the population's starting count is required");
  if (!(partitions instanceof Map)) throw new PopulationRefused("PARTITIONS_ABSENT", "the accounting needs each tenant's partition");
  const attributed = [...partitions.values()].reduce((n, p) => n + p.items.length, 0);
  const zeroFamilies = () => Object.fromEntries(EXCLUSION_FAMILIES.map((f) => [f, 0]));
  const per = new Map();
  const pools = new Map();
  for (const [t, p] of partitions) {
    const c = { attributed: p.items.length, operator: 0, human: 0, byFamily: zeroFamilies(), byRule: Object.fromEntries(rules.map((r) => [r.name, 0])), retired: 0, crossTenantDuplicates: 0, withinTenantDuplicates: 0, eligible: 0 };
    let pool = p.items.filter((it) => { if (hasOperatorSyntax(it.query)) { c.operator += 1; return false; } return true; });
    c.human = pool.length;
    pool = pool.filter((it) => { const r = firstRule(it.query, rules); if (r) { c.byRule[r.name] += 1; c.byFamily[r.family] += 1; return false; } return true; });
    pool = pool.filter((it) => { if (retired.has(norm(it.query))) { c.retired += 1; return false; } return true; });
    per.set(t, c);
    pools.set(t, pool);
  }
  /* The cross-tenant duplicate rule — digests only, counts only (see the header). */
  const holders = new Map();
  for (const [t, pool] of pools) for (const it of pool) { const d = digest(norm(it.query)); if (!holders.has(d)) holders.set(d, new Set()); holders.get(d).add(t); }
  const eligibleItems = new Map();
  for (const [t, pool] of pools) {
    const c = per.get(t);
    const kept = pool.filter((it) => { if (holders.get(digest(norm(it.query))).size > 1) { c.crossTenantDuplicates += 1; return false; } return true; });
    const firstOf = new Map();
    for (const it of kept) {
      const k = norm(it.query);
      if (firstOf.has(k)) { c.withinTenantDuplicates += 1; firstOf.get(k).sourceRowIds.push(it.itemId); continue; }
      firstOf.set(k, { itemId: it.itemId, rowIndex: it.rowIndex, query: it.query, sourceRowIds: [it.itemId] });
    }
    const items = [...firstOf.values()];
    c.eligible = items.length;
    eligibleItems.set(t, items);
  }
  const sum = (k) => [...per.values()].reduce((n, c) => n + c[k], 0);
  const byFamily = zeroFamilies();
  for (const c of per.values()) for (const f of EXCLUSION_FAMILIES) byFamily[f] += c.byFamily[f];
  const totals = {
    start, unattributed: start - attributed, operator: sum("operator"), byFamily, excludedByRules: Object.values(byFamily).reduce((a, b) => a + b, 0),
    retired: sum("retired"), crossTenantDuplicates: sum("crossTenantDuplicates"), withinTenantDuplicates: sum("withinTenantDuplicates"), eligible: sum("eligible"),
  };
  const remainder = totals.start - totals.unattributed - totals.operator - totals.excludedByRules - totals.retired - totals.crossTenantDuplicates - totals.withinTenantDuplicates - totals.eligible;
  const reconciliation = `${totals.start} = ${totals.unattributed} + ${totals.operator} + ${totals.excludedByRules} + ${totals.retired} + ${totals.crossTenantDuplicates} + ${totals.withinTenantDuplicates} + ${totals.eligible}`;
  return Object.freeze({ totals: Object.freeze(totals), perTenant: per, eligibleItems, reconciliation, remainder });
}

/**
 * Reconcile a recount with the committed accounting (config/human-questions.mjs COMMITTED_ACCOUNTING). Count-only: the
 * eligible capacities are compared as a multiset. Returns the differing fields, [] when they agree.
 */
export function reconcileWithCommitted(account, committed) {
  const t = account.totals;
  const diffs = [];
  for (const k of ["start", "unattributed", "operator", "retired", "crossTenantDuplicates", "withinTenantDuplicates", "eligible"]) if (t[k] !== committed[k]) diffs.push(k);
  for (const f of EXCLUSION_FAMILIES) if (t.byFamily[f] !== committed.byFamily[f]) diffs.push(`byFamily:${f}`);
  const caps = [...account.perTenant.values()].map((c) => c.eligible).filter((n) => n > 0).sort((a, b) => b - a);
  if (JSON.stringify(caps) !== JSON.stringify(committed.eligibleCapacitiesDescending)) diffs.push("eligibleCapacities");
  if (account.remainder !== 0) diffs.push("remainder");
  return diffs;
}
