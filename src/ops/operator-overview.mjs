/**
 * F87 · THE ENGINE OPERATOR'S CROSS-TENANT OPERATIONAL OVERVIEW (owner decision, RR-130 §2, _handoffs f9f387a, 2 Oct 2026).
 *
 * The operator may see, across tenants, COUNTS AND STATES of jobs, failed or partial writes, refusals, cost-record completeness and
 * stale evidence — for running and repairing AlmiVisibility, never for reading a client's research or content. Bounded by:
 *
 *   1  DETAILED EVIDENCE STAYS IN ITS OWN SCOPE. Nothing here returns a record. The crawl batch is attributed only through F02's own
 *      partition arithmetic (src/tenancy/partition.mjs — identities in, counts out); a fact registry is read only inside its own
 *      product's scope (bin/fact-health.mjs), so facts are NOT MEASURED here, never read across tenants.
 *   2  UNSCOPED HISTORY STAYS UNATTRIBUTED. A cost entry is attributed only by F78's attributeCostEntry (REUSED); a crawl-batch
 *      record only by the F02 partition; an evidence-store, external or render record carries no tenant scope and is counted
 *      UNATTRIBUTED. Nothing is ever assigned to a tenant by default, by majority or by elimination.
 *   3  THE OVERVIEW RELEASES COUNTS AND STATE CODES ONLY. assertOverview refuses any key or value outside that shape — a URL, a host,
 *      an identifier, a sentence of content, a question — before anything is printed. No tenant identifier is released, so no
 *      per-client figure can be read off it.
 *   4  NOTHING CONVERTS ABSENCE INTO A PASS. A missing outcome stays NOT MEASURED; no recorded mid-write failure leaves recovery
 *      COULD-NOT-PROVE (src/ops/watchman.mjs). This decision scopes the READ; it proves nothing about recovery.
 *
 * Pure: summaries in, one overview out. Generic: names no product, tenant or host.
 */
import { NOT_MEASURED } from "./watchman.mjs";

export const OPERATOR_SCOPE = Object.freeze({ scopeType: "GLOBAL_PRODUCT", action: "READ_OPERATIONS_OVERVIEW", authority: "RR-130 §2" });
export const UNATTRIBUTED = "UNATTRIBUTED";

/** A released value: a whole count, or a state/reason code with no character a URL, host, identifier, quote or question needs. */
const PERMITTED_TEXT = /^[A-Za-z][A-Za-z0-9 _'(),—-]{0,159}$/;
export const permittedValue = (v) => (typeof v === "number" ? Number.isInteger(v) && v >= 0 : typeof v === "string" && PERMITTED_TEXT.test(v) && !/\btenant\b\s*[0-9a-f]{6,}/i.test(v));

/** 🔴 Refuse, before anything is printed, any key or value the overview may not release. Returns the overview unchanged. */
export function assertOverview(o) {
  const bad = [];
  const walk = (x, path) => {
    if (x === null) return;
    if (Array.isArray(x)) { x.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (typeof x === "object") { for (const [k, v] of Object.entries(x)) { if (!permittedValue(k)) bad.push(`${path} key`); walk(v, `${path}.${k}`); } return; }
    if (!permittedValue(x)) bad.push(path);
  };
  walk(o, "overview");
  if (bad.length) throw Object.assign(new Error(`OVERVIEW_FIELD_NOT_PERMITTED: ${bad.length} field(s) outside counts and state codes`), { code: "OVERVIEW_FIELD_NOT_PERMITTED", fields: bad.length });
  return o;
}

/** The cost ledger's attribution, as counts: F78's own decisions, with every unattributed entry's reason class. */
export function costAttribution(attributions = []) {
  const out = { ATTRIBUTED: 0, [UNATTRIBUTED]: 0, of: attributions.length, tenantsWithAttributedCost: 0, unattributedWhy: {} };
  const tenants = new Set();
  for (const a of attributions) {
    if (a.state === "ATTRIBUTED" && typeof a.tenantId === "string" && a.tenantId !== "") { out.ATTRIBUTED += 1; tenants.add(a.tenantId); continue; }
    out[UNATTRIBUTED] += 1;
    const why = String(a.missing ?? "no declaration assigns it a tenant").split(" — ")[0].split(" (")[0];
    out.unattributedWhy[permittedValue(why) ? why : "an unnamed reason"] = (out.unattributedWhy[permittedValue(why) ? why : "an unnamed reason"] ?? 0) + 1;
  }
  out.tenantsWithAttributedCost = tenants.size;
  return out;
}

/** The crawl batch's attribution, from F02's own partition arithmetic — identities only, no record released. */
export function batchAttribution(arithmetic) {
  if (!arithmetic) return { [NOT_MEASURED]: "the batch's partition could not be computed" };
  return {
    of: arithmetic.population, inSomeTenantsPartition: arithmetic.inPartitions, tenantsWithAPartition: arithmetic.partitions,
    [UNATTRIBUTED]: arithmetic.undeclared + arithmetic.ambiguous, undeclared: arithmetic.undeclared, ambiguous: arithmetic.ambiguous, remainder: arithmetic.remainder,
  };
}

/** One overview from the watch (src/ops/watchman.mjs) and the attribution summaries. */
export function operatorOverview({ watch: w, bound, cost, batch, unscopedRecords, trailScopes }) {
  const { jobs, connectors, outputs, recovery } = w.parts;
  const o = {
    scope: OPERATOR_SCOPE.scopeType,
    bound: { ...bound },
    jobs: { costRefused: jobs.cost.REFUSED, costRefusedByCode: { ...jobs.cost.refusedByCode }, costNoOutcome: jobs.cost[NOT_MEASURED], costOf: jobs.cost.of,
      runsComplete: jobs.runs.COMPLETE, runsPartial: jobs.runs.PARTIAL, runsNotMeasured: jobs.runs[NOT_MEASURED], runsOf: jobs.runs.of, runsCorrected: jobs.runs.corrected, verdict: jobs.verdict },
    writes: { allowed: recovery.allowed, applied: recovery.applied, refused: recovery.refused, refusedBeforeAttempt: recovery.refusedBeforeAttempt, recordedFailures: recovery.recordedFailures,
      silentLoss: recovery.silentLoss, unclassified: recovery.unclassified, gateDecisionsWithoutSagaKey: recovery.gateDecisionsAllowed,
      lossVerdict: recovery.lossVerdict, recoveryVerdict: recovery.recoveryVerdict, recoveryWhy: recovery.recordedFailures === 0 ? "no real recorded mid-write failure — recovery UNPROVED, not passed" : "recorded failures exist — see the recovery verdict",
      byScope: { ...trailScopes } },
    connectors: { ...Object.fromEntries(Object.entries(connectors.perKind).map(([k, r]) => [k, { ...r }])), notRetrievals: connectors.outsideNotRetrievals, verdict: connectors.verdict },
    outputs: { complete: outputs.COMPLETE, partial: outputs.PARTIAL, notMeasured: outputs[NOT_MEASURED], of: outputs.of, partialWithReason: outputs.partialWithReason, verdict: outputs.verdict },
    staleness: { facts: NOT_MEASURED, factsWhy: "a fact registry is read only inside its own product's scope", otherEvidenceNotMeasured: w.parts.staleness.otherEvidence[NOT_MEASURED], verdict: w.parts.staleness.verdict },
    attribution: { costEntries: costAttribution(cost), crawlBatch: batchAttribution(batch), unscopedStores: { [UNATTRIBUTED]: unscopedRecords, why: "evidence, external and render records carry no tenant scope" } },
    alerts: w.alerts.map((a) => ({ condition: a.condition, count: a.count, denominator: a.denominator })),
    alertSending: "NOT BUILT — no alert channel is declared",
    incomplete: w.incomplete ? "INCOMPLETE" : "COMPLETE",
    verdict: w.verdict,
  };
  return assertOverview(o);
}

/** The printed lines — rendered only from an overview that passed assertOverview. */
export function renderOverview(o) {
  assertOverview(o);
  const fmt = (x) => Object.entries(x ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
  const a = o.attribution;
  return [
    "F87 · OPERATOR OVERVIEW — cross-tenant counts and states only (owner, RR-130 §2) · no record, URL, content or tenant identifier is released",
    `  bound            ${fmt(o.bound)} · read-only`,
    `  C1 jobs          cost REFUSED ${o.jobs.costRefused} (${fmt(o.jobs.costRefusedByCode)}) · no recorded outcome ${o.jobs.costNoOutcome} (NOT MEASURED) of ${o.jobs.costOf} · crawl runs COMPLETE ${o.jobs.runsComplete} · PARTIAL ${o.jobs.runsPartial} · NOT MEASURED ${o.jobs.runsNotMeasured} of ${o.jobs.runsOf} (after ${o.jobs.runsCorrected} correction(s)) — ${o.jobs.verdict}`,
    `  C2 connectors    ${Object.entries(o.connectors).filter(([, r]) => r && typeof r === "object").map(([k, r]) => `${k}: AVAILABLE ${r.AVAILABLE} · UNAVAILABLE ${r.UNAVAILABLE} · NOT MEASURED ${r[NOT_MEASURED]} of ${r.of}`).join(" | ")} — ${o.connectors.verdict}`,
    `  C3 outputs       COMPLETE ${o.outputs.complete} · PARTIAL ${o.outputs.partial} · NOT MEASURED ${o.outputs.notMeasured} of ${o.outputs.of} — ${o.outputs.verdict}`,
    `  C4 staleness     facts ${o.staleness.facts} — ${o.staleness.factsWhy} · other evidence NOT MEASURED ${o.staleness.otherEvidenceNotMeasured} — ${o.staleness.verdict}`,
    `  C5 writes        ALLOWED ${o.writes.allowed} · APPLIED ${o.writes.applied} · REFUSED ${o.writes.refused} · RECORDED FAILURE ${o.writes.recordedFailures} · SILENT LOSS ${o.writes.silentLoss} of ${o.writes.allowed} — ${o.writes.lossVerdict} · by scope ${fmt(o.writes.byScope)}`,
    `     recovery      ${o.writes.recoveryWhy} — ${o.writes.recoveryVerdict}`,
    `  ATTRIBUTION      cost entries ATTRIBUTED ${a.costEntries.ATTRIBUTED} (to ${a.costEntries.tenantsWithAttributedCost} tenant(s), never named) · UNATTRIBUTED ${a.costEntries.UNATTRIBUTED} of ${a.costEntries.of} (${fmt(a.costEntries.unattributedWhy)})`,
    `                   crawl batch records in some tenant's partition ${a.crawlBatch.inSomeTenantsPartition} · UNATTRIBUTED ${a.crawlBatch.UNATTRIBUTED} (undeclared ${a.crawlBatch.undeclared}, ambiguous ${a.crawlBatch.ambiguous}) of ${a.crawlBatch.of}`,
    `                   unscoped stores UNATTRIBUTED ${a.unscopedStores.UNATTRIBUTED} — ${a.unscopedStores.why}`,
    `  C6 alerts        ${o.alerts.length} condition(s) · sending: ${o.alertSending}`,
    ...o.alerts.map((x) => `    ALERT          ${x.condition}: ${x.count} of ${x.denominator}`),
    `  C7 population    ${o.incomplete} · verdict ${o.verdict}`,
  ];
}
