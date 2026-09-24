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
 */
import { createTenantResolver } from "../tenancy/resolver.mjs";
import { decideRunResources, requestedTenant, RESOURCES, SCOPE_REFUSED_EXIT } from "../tenancy/scoped-run.mjs";
import { diagnosticGuardSink } from "./guard-audit.mjs";
import { governedGuardSink } from "./governed-run.mjs";
import { isoSeconds } from "../audit-trail/store.mjs";

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

export function scopedEntryPoint({ entry, governed, resources, argv = process.argv, env = process.env, resolve = createTenantResolver({ env }) }) {
  const sink = governed
    ? governedGuardSink({ repo: ENGINE_ROOT, env, correlationId: `run:${entry}:tenant-scope:${isoSeconds(Date.now())}`, now: isoSeconds(Date.now()).slice(0, 10), actor: entry })
    : diagnosticGuardSink({ actor: entry });
  const run = requireScopedRun({ argv, resolve, resources, sink });
  return { ...run, writeScope: Object.freeze({ scopeType: "TENANT", tenantId: run.tenantId }) };
}
