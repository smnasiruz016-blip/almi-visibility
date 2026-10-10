/**
 * 🔴 F78 · ACCEPTANCE AMENDMENT 1 — C8 RUN COMPLETENESS and C9 THE TENANT'S OWN LEDGER, in ONE place every cost-writing entry point uses.
 *
 * C9 · WHERE A COST ENTRY GOES. Only to the run's own tenant's DECLARED cost ledger: the COST_LEDGER attached to that tenant as
 *   cost-ledger/<tenantId> (tenantLedgerRef). An entry point names RESOURCES.costLedger(ownLedgerRef()) in its scoped entry, so F02 decides
 *   the ledger with everything else BEFORE anything is read or requested; a tenant with no declared ledger is refused there. The ledger's
 *   file sits beside the declarations that attach it — <the declaration source>/cost-ledgers/<tenant hex>.jsonl — so it is the tenant's
 *   data, in the tenant data repository, and never the engine's shared cost ledger under runs/cost, which stays read-only history.
 *
 * C8 · ONE ENTRY FOR EVERY RUN. runCost() registers, once, an exit hook that writes the run's entry — its outcome, its wall-clock and the
 *   requests its opened connectors made — whether the run completed, failed or was refused, unless the entry point already wrote its own
 *   entry for the run (covered()). The hook writes through the governed path: without write permission the write law refuses it and that
 *   refusal is recorded on the audit trail.
 *
 * C8 · NO REQUEST WITHOUT --confirm. metered() is how an entry point holds its opened connector: without write permission it refuses
 *   BEFORE any request (the run could not record its cost); with it, every request through the connector is counted.
 */
import { join, dirname, relative, isAbsolute, resolve as resolvePath } from "node:path";
import { tmpdir } from "node:os";
import { inVerifiedTestContext } from "../governance/governed-run.mjs";
import { tenantLedger, tenantLedgerRef } from "./tenant-ledger.mjs";
import { requestedTenant } from "../tenancy/scoped-run.mjs";
import { makeCostEntry } from "./ledger.mjs";
import { isoSeconds } from "../audit-trail/store.mjs";

/* the last uncaught failure of this process, so the exit hook can name it (one listener per process, never per recorder) */
let lastFailure = null;
process.on("uncaughtExceptionMonitor", (e) => { lastFailure = e?.name ?? "Error"; });

export const RUN_COST_ACTION = "APPEND_RUN_COST_ENTRY";
export { TENANT_LEDGER_DIR, tenantLedgerRef, tenantLedger, declaredTenantLedgers } from "./tenant-ledger.mjs";
/** The reference of the ledger of the tenant this run requests (--tenant=), for the entry point's scoped resources. */
export const ownLedgerRef = (argv = process.argv) => tenantLedgerRef(requestedTenant(argv) ?? "none");

/** The connector-run entry (C8): outcome, wall-clock and requests; money is the serving operator's, not readable here. */
export function connectorRunEntry({ entryPoint, tenantId, startedAt, finishedAt, outcome, requests, kinds }) {
  const seconds = Math.max(0, (Date.parse(finishedAt) - Date.parse(startedAt)) / 1000);
  return Object.freeze({
    ...makeCostEntry({
      entry_id: `run:${entryPoint}:${startedAt}:${process.pid}`,
      run_kind: "connector-run",
      run_ref: `${entryPoint} · started ${startedAt} · ${outcome}`,
      run_started_at: startedAt,
      recorded_at: finishedAt,
      money: { amountState: "UNKNOWN", amount: null, currency: "USD", unknownKind: "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD", unknownReason: "each origin reached bears its own serving cost, which nothing this engine holds can read; no paid provider is called here (F78 C2)" },
      providerCalls: requests > 0
        ? { state: "MEASURED", total: requests, perProvider: Object.fromEntries(Object.entries(kinds).filter(([, n]) => n > 0)) }
        : { state: "MEASURED", total: 0, perProvider: {}, zeroBasis: `no request was made: the run ended (${outcome}) before any request through a connector` },
      budget: { kind: "connector-run", used: { requests }, bounds: { requestPath: "the opened connector's fetch, the one egress path (F03)" }, capReached: false, ...(requests === 0 ? { zeroBasis: `no request was made: the run ended (${outcome}) before any request` } : {}) },
      founderTime: seconds > 0 ? { state: "MEASURED", seconds, from: startedAt, to: finishedAt } : { state: "MEASURED", seconds: 0, from: startedAt, to: finishedAt, zeroBasis: "the run started and ended within the clock's resolution" },
    }),
    outcome,
    scope: Object.freeze({ tenantId }),
  });
}

/**
 * The run's cost recorder (C8/C9). `scope` is the entry point's scoped run (its tenant and writeScope); `permission` its write permission.
 * `write` is the entry point's OWN governed append of one entry into the cost ledger at w.path, inside its executeGovernedWrite — so the
 * write is routed, and seen, where the entry point is; this module writes nothing itself. Refuses (exit 3) when the tenant has no declared ledger — the scope gate has normally refused already. Injectable for tests.
 */
export function runCost({ entryPoint, scope, permission, auditRepo, write, env = process.env, now = () => Date.now(), onExit = (fn) => process.on("exit", fn), exit = (code) => process.exit(code), log = console.error }) {
  if (typeof write !== "function") throw new TypeError("runCost: the entry point must hand in its own governed write");
  const ledger = tenantLedger({ tenantId: scope?.tenantId, env });
  if (ledger.state !== "DECLARED") {
    log(`🔴 REFUSED — ${ledger.reason}: the run's tenant has no declared cost ledger (cost-ledger/<tenantId>), so it could not record its cost. NO REQUEST WAS MADE.`);
    return exit(3);
  }
  /* A verified test run writes a tenant ledger only inside a DISPOSABLE world (under the OS temp directory) — never the real tenant data
   * repository, whose ledgers only a real, owner-approved run may write. Confined by default, like the audit store. */
  const fromTmp = relative(resolvePath(tmpdir()), resolvePath(ledger.root));
  if (inVerifiedTestContext(env) && (fromTmp.startsWith("..") || isAbsolute(fromTmp))) {
    log("🔴 REFUSED — TEST_RUN_OUTSIDE_A_DISPOSABLE_WORLD: a test run may write a tenant cost ledger only inside a disposable world. NO REQUEST WAS MADE.");
    return exit(3);
  }
  const startedAt = new Date(now()).toISOString();
  const kinds = {};
  let requests = 0, coveredBy = null, written = false;
  const append = (entry) => {
    const occurredAt = isoSeconds(now());
    return write(Object.freeze({ entry: { ...entry, scope: { tenantId: scope.tenantId } }, path: ledger.path, root: ledger.root, auditRepo, permission, occurredAt, correlationId: `run:run-cost:${occurredAt}` }));
  };
  const api = Object.freeze({
    ledgerPath: ledger.path,
    ledgerRoot: ledger.root,
    /** The opened connector, metered: refused before any request without write permission; every request through it counted. */
    metered(connector) {
      if (!permission?.mayWrite) {
        log(`🔴 REFUSED — NO_WRITE_PERMISSION: ${entryPoint} makes no request without --confirm — a run that cannot record its cost makes no request (F78 C8). NO REQUEST WAS MADE.`);
        return exit(3);
      }
      const kind = connector.kind ?? "connector";
      return Object.freeze({ ...connector, fetch: (url, init) => { requests += 1; kinds[kind] = (kinds[kind] ?? 0) + 1; return connector.fetch(url, init); } });
    },
    /** The entry point wrote its own entry for this run, to this ledger (appendOwn): the exit hook writes no second one. */
    covered(entryId) { coveredBy = entryId; },
    /** Append the entry point's own entry (its kind's own builder) to the tenant's ledger, through the governed path. */
    appendOwn(entry) { const g = append(entry); if (g?.outcome === "COMMITTED" || g?.outcome === "ALREADY_COMMITTED") coveredBy = entry.entry_id; return g; },
    /** A request the run made outside a connector (a crawl's IPv6 egress probe, its DNS lookups) — counted in the same entry. */
    noteRequests(kind, n = 1) { requests += n; kinds[kind] = (kinds[kind] ?? 0) + n; },
    requests: () => requests,
    /** The entry the exit hook writes — exposed so a test can read what a run would record. */
    entryFor(outcome) { return connectorRunEntry({ entryPoint, tenantId: scope.tenantId, startedAt, finishedAt: new Date(now()).toISOString(), outcome, requests, kinds: { ...kinds } }); },
    /** The exit hook itself (C8): one entry, whatever ended the run. */
    finish(code) {
      if (written || coveredBy) return null;
      written = true;
      const failure = lastFailure;
      const outcome = failure ? `FAILED (${failure})` : code === 0 ? "COMPLETED" : `ENDED (exit ${code})`;
      try { return append(api.entryFor(outcome)); } catch (e) { log(`🔴 the run's cost entry was not written: ${e?.message ?? e}`); return null; }
    },
  });
  onExit((code) => api.finish(code));
  return api;
}
