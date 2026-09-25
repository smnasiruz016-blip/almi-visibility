/**
 * 🔴 F02 · THE SCOPED ENTRY POINT — the one line every tenant-governed entry point runs FIRST.
 *
 *   const SCOPE = scopedEntryPoint({ entry: "bin/x.mjs", governed: true, resources: [RESOURCES.…] });
 *
 * It lives HERE, beside the other guards' sinks, because it constructs the sink a refusal is recorded to — F08's governed
 * guard sink in a governed run (durable; confined inside a verified test context), the diagnostic sink otherwise. The
 * decision itself is pure and lives in src/tenancy/ (scope.mjs, scoped-run.mjs), handed that sink. A refusal event is an
 * ACCESS decision appended to the audit store — the emission IS the audit, exactly as for every other guard.
 *
 * On success it returns `writeScope`: the scope every governed write of this run must carry, so a run's OUTPUT belongs to
 * the tenant its inputs did. On any refusal the process ends with SCOPE_REFUSED_EXIT (3).
 *
 * 🔴 F04 (25 Sep 2026): SCOPE IS NOT PERMISSION. Once F02 has decided WHERE the run may read, F04 decides WHO may: the actor
 * the run names (`--actor=`) is authorised for READ_PROTECTED_TENANT_DATA over the tenant F02 resolved, and for
 * OPEN_CONNECTOR_<kind> over each connector the run declared — through the one decision (src/governance/authorisation.mjs),
 * recorded through the SAME guard sink, BEFORE anything is read or constructed. A refusal ends the process with
 * AUTHORISATION_REFUSED_EXIT (5). The genuine decisions are returned as `authorisations`; openConnector requires one.
 */
import { createTenantResolver } from "../tenancy/resolver.mjs";
import { decideRunResources, requestedTenant, RESOURCES, SCOPE_REFUSED_EXIT } from "../tenancy/scoped-run.mjs";
import { diagnosticGuardSink } from "./guard-audit.mjs";
import { governedGuardSink } from "./governed-run.mjs";
import { isoSeconds } from "../audit-trail/store.mjs";
import { partitionRefusalEvent } from "../tenancy/partition.mjs";
import { scopeResolutionEvent, RECORDED_RESOLUTION_KINDS } from "../tenancy/scope.mjs";
import { authorise, authorisationEvent, namedActor, AUTHORISATION_REFUSED_EXIT } from "./authorisation.mjs";

/* The engine's own root, from this module's fixed place (src/governance/) — never from the caller's location, which a
 * subject-owned tool three levels down would get wrong (F02 relocation, 24 Sep 2026). */
const ENGINE_ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * Decide a run's resources (pure, src/tenancy/scoped-run.mjs), emit each refusal to the guard sink, and report.
 * @param {{ argv?: string[], resolve?: Function, resources: object[], sink: {emit: Function}, log?: Function }} o
 */
export function decideScopedRun({ argv = process.argv, resolve = createTenantResolver(), resources, sink, log = console.error }) {
  if (!sink || typeof sink.emit !== "function") throw new TypeError("a scoped run records its refusals — it needs a guard sink");
  /* A resource that is absent (an input path not given) is read by no one and decided by no one. A run that, this time,
   * names nothing is STILL decided — for its requested tenant's own partition — so no entry point runs without a declared
   * ACTIVE tenant, whatever it was asked to read. */
  const named = Array.isArray(resources) ? resources.filter(Boolean) : resources;
  const list = Array.isArray(named) && named.length === 0 && resources.length > 0 ? [RESOURCES.tenantPartition(requestedTenant(argv), "requested tenant")] : named;
  const run = decideRunResources({ argv, resolve, resources: list });
  for (const e of run.refusalEvents) sink.emit(e);
  /* 🔴 F03: when the run proceeds, each subject root and connector it OBTAINED is recorded through the same guard sink — an
   * access that was granted (owner's line, 23 Sep 2026). A refused run obtains nothing and records only its refusals. */
  if (run.allowed) for (const d of run.decisions) if (RECORDED_RESOLUTION_KINDS[d.decision.target?.resourceKind]) sink.emit(scopeResolutionEvent(d.decision));
  if (run.refused.length) {
    log(`🔴 TENANT SCOPE REFUSED — ${run.refused.length} of ${run.decisions.length} resource(s) do not belong to the requested tenant; nothing was read`);
    for (const d of run.refused) log(`   ${d.label.padEnd(26)} ${d.decision.outcome} (${d.decision.reason}) · ref ${d.decision.target.resourceRefDigest}`);
  }
  return { allowed: run.allowed, tenantId: run.tenantId, decisions: run.decisions, refused: run.refused };
}

/** For an entry point: decide, and end the process with SCOPE_REFUSED_EXIT on any refusal. Returns the run on success. */
export function requireScopedRun(o) {
  const run = decideScopedRun(o);
  if (!run.allowed) process.exit(SCOPE_REFUSED_EXIT);
  return run;
}

/**
 * F04: the authorisation requests a scoped run makes once F02 allowed it — research over the resolved tenant, and one
 * OPEN_CONNECTOR_<kind> per declared connector. Pure; exported so the census and the tests read the same list.
 */
export function runAuthorisationRequests({ tenantId, resources }) {
  const requests = [{ action: "READ_PROTECTED_TENANT_DATA", resourceRef: `tenant-partition:${tenantId}` }];
  for (const r of (Array.isArray(resources) ? resources : []).filter(Boolean)) {
    if (r.resourceKind === "CONNECTOR") requests.push({ action: `OPEN_CONNECTOR_${r.connectorKind}`, resourceRef: r.resourceRef });
  }
  return requests;
}

/** Decide every request for the named actor, record each decision through the sink, and report. Never exits. */
export function authoriseScopedRun({ actorRef, tenantId, resources, sink, now = isoSeconds(Date.now()), log = console.error }) {
  const authorisations = runAuthorisationRequests({ tenantId, resources }).map((q) =>
    authorise({ actorRef, action: q.action, scope: { scopeType: "TENANT", tenantId }, resourceRef: q.resourceRef, now }));
  for (const d of authorisations) sink.emit(authorisationEvent(d));
  const refused = authorisations.filter((d) => !d.allowed);
  for (const d of refused) log(`🔴 AUTHORISATION REFUSED — ${d.action}: ${d.outcome} (${d.reason}); nothing was read`);
  return { allowed: refused.length === 0, authorisations, refused };
}

export function scopedEntryPoint({ entry, governed, resources, argv = process.argv, env = process.env, resolve = createTenantResolver({ env }), actorRef = namedActor(argv) }) {
  const sink = governed
    ? governedGuardSink({ repo: ENGINE_ROOT, env, correlationId: `run:${entry}:tenant-scope:${isoSeconds(Date.now())}`, now: isoSeconds(Date.now()).slice(0, 10), actor: entry })
    : diagnosticGuardSink({ actor: entry });
  const run = requireScopedRun({ argv, resolve, resources, sink });
  /* 🔴 F04 — after F02 allowed, before any read: the named actor must be AUTHORISED for what this run will do. */
  const auth = authoriseScopedRun({ actorRef, tenantId: run.tenantId, resources, sink });
  if (!auth.allowed) process.exit(AUTHORISATION_REFUSED_EXIT);
  /* A partition's quarantine is a refusal: recorded through the SAME guard sink as the run's scope decision — counts and
   * digests only. A partition that quarantined nothing records nothing. */
  const recordPartition = (partition, { collectionKind, collectionRef }) => { const ev = partitionRefusalEvent(partition, { collectionKind, collectionRef }); if (ev) sink.emit(ev); return ev; };
  /* F04: a decision the run makes later (a paid call, an approval check) is recorded through this run's SAME guard sink. */
  const recordDecision = (decision) => sink.emit(decision);
  return { ...run, authorisations: auth.authorisations, recordDecision, writeScope: Object.freeze({ scopeType: "TENANT", tenantId: run.tenantId }), recordPartition };
}
