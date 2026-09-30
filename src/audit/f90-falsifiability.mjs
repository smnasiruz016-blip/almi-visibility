/**
 * F90 · FALSIFIABILITY OF FINDINGS (acceptance _handoffs 73b50bf, RR-99 §4; prerequisites #204 and #205).
 *
 * Every finding presented as actionable must carry a structured refutation: METHOD (the registered check, by id and live version, that
 * raised it), OBSERVATION (what that check observes — a fresh observation of it would overturn the finding) and THRESHOLD (each condition
 * it fires on; the finding is void when a fresh observation makes every one false). Each part is TAKEN from the held check's own
 * declaration — `version` and `boundary` on its registration, crossed both ways against its run() by the rr100 and rr102 tests — or it is
 * NOT MEASURED with the missing fact named. Nothing is written freehand, estimated or filled.
 *
 * ── C1 · THE ACTIONABLE POPULATION ──────────────────────────────────────────────────────────────────────────────────────────────────
 * Per store, the production lifecycle reader (src/evidence/lifecycle.mjs) applies the recorded state changes. A finding is ACTIONABLE when
 * its latest state is OPEN, its verdict is FAIL, and no later record supersedes it. One finding written into several stores (a replay, a
 * second writer) is ONE finding, its physical copies counted beside it. Fails closed — the population is UNREADABLE (COULD-NOT-PROVE)
 * when a store's lifecycle has an error, when a record names an OPEN finding in `supersedes` without a recorded move, or when one finding id
 * reads differently in two stores, or when a store holds a line that does not parse.
 *
 * ── C5 · RECORDED DATA ONLY ─────────────────────────────────────────────────────────────────────────────────────────────────────────
 * This module is pure: records and registered checks in, counts out. It never calls a check's run(), fetches or writes.
 */
import { lifecycleOf } from "../evidence/lifecycle.mjs";

export const PARTS = Object.freeze(["METHOD", "OBSERVATION", "THRESHOLD"]);
export const F90_LIMIT =
  "a refutation states what would overturn a finding, taken from the held check's declaration; nothing is re-run, so whether a fresh observation would in fact overturn any finding is not measured here";

const key = (i) => [i.state, i.verdict, i.detector, i.detector_version, i.issue_class].join("|");

/** C1 — the population across every store, read through the lifecycle. `stores`: [{ name, records }]. */
export function actionablePopulation(stores) {
  const unreadable = [];
  const byId = new Map();
  for (const { name, records, unparseable = 0 } of stores) {
    if (unparseable > 0) unreadable.push({ store: name, reason: "UNPARSEABLE_LINES", count: unparseable });
    const { issues, errors } = lifecycleOf(records);
    if (errors.length) unreadable.push({ store: name, reason: "LIFECYCLE_ERRORS", count: errors.length });
    const namedInSupersedes = new Set(records.filter((r) => r?.record_type === "issue" && typeof r.supersedes === "string").map((r) => r.supersedes));
    for (const [id, e] of issues) {
      if (e.state === "OPEN" && namedInSupersedes.has(id)) unreadable.push({ store: name, reason: "SUPERSEDED_WITHOUT_A_RECORDED_MOVE", id });
      const seen = { state: e.state, verdict: e.issue.verdict, detector: e.issue.detector, detector_version: e.issue.detector_version, issue_class: e.issue.issue_class };
      const cur = byId.get(id);
      if (!cur) byId.set(id, { id, ...seen, stores: [name], copies: e.copies });
      else {
        if (key(cur) !== key(seen)) unreadable.push({ store: name, reason: "ONE_FINDING_READS_DIFFERENTLY_ACROSS_STORES", id });
        cur.stores.push(name);
        cur.copies += e.copies;
      }
    }
  }
  const apart = { OPEN_NOT_FAIL: 0, CLOSED: 0, SUPERSEDED: 0 };
  const verdictsApart = {};
  const actionable = [];
  for (const f of byId.values()) {
    if (f.state === "OPEN" && f.verdict === "FAIL") { actionable.push(f); continue; }
    if (f.state === "OPEN") { apart.OPEN_NOT_FAIL += 1; verdictsApart[f.verdict] = (verdictsApart[f.verdict] ?? 0) + 1; } else apart[f.state] = (apart[f.state] ?? 0) + 1;
  }
  return {
    actionable,
    apart,
    verdictsApart,
    logicalFindings: byId.size,
    physicalActionable: actionable.reduce((n, f) => n + f.copies, 0),
    stores: stores.map((s) => s.name),
    unreadable,
  };
}

/** C2 + C3 — one finding's refutation, every part from the held check or NOT MEASURED with the missing fact named. */
export function refutationOf(finding, checks) {
  const check = checks.get(finding.detector);
  const missing = [];
  let method = null;
  if (!check) missing.push({ part: "METHOD", fact: `no registered check is named ${JSON.stringify(finding.detector)} — the method is not held` });
  else if (check.version === undefined) missing.push({ part: "METHOD", fact: `${check.id} declares no live version — whether it is the recorded version ${JSON.stringify(finding.detector_version)} is NOT MEASURED` });
  else if (check.version !== finding.detector_version) missing.push({ part: "METHOD", fact: `${check.id} is live at version ${check.version}; the finding was recorded by version ${JSON.stringify(finding.detector_version)} — that version is not held` });
  else method = { check: check.id, version: check.version };

  let observation = null;
  let threshold = null;
  if (!method) {
    missing.push({ part: "OBSERVATION", fact: "no held method to take it from" }, { part: "THRESHOLD", fact: "no held method to take it from" });
  } else if (!check.boundary) {
    missing.push({ part: "OBSERVATION", fact: `${check.id} declares no boundary: what it observes` }, { part: "THRESHOLD", fact: `${check.id} declares no boundary: the conditions it fires on` });
  } else {
    observation = check.boundary.observes;
    threshold = check.boundary.fires;
  }
  return { id: finding.id, issueClass: finding.issue_class, method, observation, threshold, missing, falsifiable: missing.length === 0 };
}

/** C4 — the census, with its population and bound, by class and by missing part. `checks`: registeredChecks(). */
export function falsifiabilityCensus({ stores, checks }) {
  const population = actionablePopulation(stores);
  const byId = new Map(checks.map((c) => [c.id, c]));
  const refutations = population.actionable.map((f) => refutationOf(f, byId));
  const byClass = {};
  const byMissingPart = Object.fromEntries(PARTS.map((p) => [p, 0]));
  const byMethod = {};
  for (const r of refutations) {
    const c = (byClass[r.issueClass] ??= { falsifiable: 0, notFalsifiable: 0 });
    if (r.falsifiable) c.falsifiable += 1; else c.notFalsifiable += 1;
    for (const p of new Set(r.missing.map((m) => m.part))) byMissingPart[p] += 1;
    const m = r.method ? `${r.method.check}@${r.method.version}` : "NOT HELD";
    byMethod[m] = (byMethod[m] ?? 0) + 1;
  }
  const falsifiable = refutations.filter((r) => r.falsifiable).length;
  const notFalsifiable = refutations.length - falsifiable;
  const verdict = population.unreadable.length > 0 || refutations.length === 0 ? "COULD-NOT-PROVE" : notFalsifiable > 0 ? "DISPROVED" : "PROVED";
  const why = population.unreadable.length > 0
    ? `the population cannot be read: ${[...new Set(population.unreadable.map((u) => u.reason))].join(", ")}`
    : refutations.length === 0 ? "the actionable population is EMPTY — nothing is proved on an empty population"
      : notFalsifiable > 0 ? `${notFalsifiable} actionable finding(s) are NOT FALSIFIABLE` : "every actionable finding carries all three parts from a held method";
  return {
    verdict,
    why,
    population,
    refutations,
    falsifiable,
    notFalsifiable,
    byClass,
    byMissingPart,
    byMethod,
    bound: `recorded data only · ${population.stores.length} store(s) holding findings · ${population.logicalFindings} logical finding(s) · ${refutations.length} actionable (${population.physicalActionable} physical copies) · ${checks.length} registered check(s) · nothing fetched, re-run or written`,
    limit: F90_LIMIT,
  };
}
