/**
 * 🔴 RR-243 · A MINIMAL ENTRY POINT FOR THE RUN-COST PROOFS — spawned by test/rr243-f78-cost.test.mjs inside a declared fixture world. It
 * goes through the REAL path every connector entry point uses: F02's scoped entry naming the tenant's own ledger, src/cost/run-cost.mjs,
 * the governed write and the ledger file. Its "connector" is a stand-in whose fetch counts and never leaves the process.
 *
 *   node test/helpers/rr243-run-cost-child.mjs --deliberate --mode=<mode> --tenant=<t> --actor=<a> [--confirm]
 *     complete        opens the connector, makes 2 requests, ends 0
 *     refuse          ends with exit 3 after the gate, before any request (a refusal)
 *     throw           opens the connector, makes 1 request, throws (an error)
 *     own-entry       writes its own entry for the run, then ends 0 (the hook writes no second one)
 *     open-only       opens the connector (metered) and ends — the probe of "no request without --confirm"
 *     target-refusal  RR-244: opens the connector, makes 1 request the target refuses (403), ends with exit 3 (a refusal by the target)
 * Test material only.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { scopedEntryPoint } from "../../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../../src/tenancy/scoped-run.mjs";
import { writePermission, LOCAL } from "../../src/write-law.mjs";
import { runCost, ownLedgerRef, connectorRunEntry } from "../../src/cost/run-cost.mjs";
import { governedStoreAppend } from "../../src/governance/governed-run.mjs";
import { createCostLedger } from "../../src/cost/ledger.mjs";
import { executeGovernedWrite } from "../../src/governance/governed-write.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const mode = process.argv.find((a) => a.startsWith("--mode="))?.slice(7);
const SCOPE = scopedEntryPoint({ entry: "test/helpers/rr243-run-cost-child.mjs", governed: true, resources: [RESOURCES.costLedger(ownLedgerRef())] });
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const RUN_COST = runCost({ entryPoint: "test/helpers/rr243-run-cost-child.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO });
let fetched = 0;
const standIn = Object.freeze({ kind: "PUBLIC_SITE", origins: [], admits: () => true, fetch: async () => { fetched += 1; return mode === "target-refusal" ? new Response("forbidden", { status: 403 }) : new Response("ok"); } });
process.on("exit", () => console.log(`STAND_IN_REQUESTS ${fetched}`));
if (mode === "refuse") { console.error("REFUSED — a post-gate refusal, before any request"); process.exit(3); }
if (mode === "own-entry") {
  const own = connectorRunEntry({ entryPoint: "test/helpers/rr243-run-cost-child.mjs#own", tenantId: SCOPE.tenantId, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), outcome: "OWN", requests: 0, kinds: {} });
  const g = RUN_COST.appendOwn(own);
  console.log(`OWN ${g.outcome}`);
  process.exit(0);
}
const c = RUN_COST.metered(standIn);
if (mode === "open-only") process.exit(0);
if (mode === "target-refusal") { const r = await c.fetch("https://fixture-world.invalid/a"); console.error(`REFUSED BY THE TARGET (${r.status})`); process.exit(3); }
await c.fetch("https://fixture-world.invalid/a");
if (mode === "throw") throw new TypeError("a run that ends in error");
await c.fetch("https://fixture-world.invalid/b");
process.exit(0);
