#!/usr/bin/env node
/**
 * F78 · SPEND AND WORKLOAD BY TENANT — one client's recorded costs, attributed through declared scope; count-only.
 *
 *   node bin/cost-by-tenant.mjs --tenant=<id> --actor=<id> [--research-batch=<id> ...]   READ-ONLY; this tenant's totals only; writes nothing
 *
 * 🔴 F02 / RR-89 "Clients stay separate" — the tenant is decided HERE, and only ITS totals are printed: another client's spend is never
 * shown. Entries no declaration attributes are counted (UNATTRIBUTED, each with its reason), never assigned to this tenant. A cost the
 * ledger marks MEASURABLE_BUT_NOT_RECORDED is a gap, never a zero. No paid or metered call is made.
 * Attribution: src/cost/tenant-attribution.mjs; reading: src/cost/cost-by-tenant.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { readCostByTenant, viewForTenant } from "../src/cost/cost-by-tenant.mjs";
import { ownLedgerRef } from "../src/cost/run-cost.mjs";
import { tenantLedger } from "../src/cost/tenant-ledger.mjs";

/* C6: a research batch is read only when named here — the scope gate decides each for THIS tenant, and refuses another tenant's */
const BATCHES = process.argv.filter((a) => a.startsWith("--research-batch=")).map((a) => a.slice("--research-batch=".length)).filter(Boolean);
const SCOPE = scopedEntryPoint({ entry: "bin/cost-by-tenant.mjs", governed: false, resources: [RESOURCES.costLedger(), RESOURCES.costLedger(ownLedgerRef()), RESOURCES.evidenceStore(), ...BATCHES.map((b) => RESOURCES.researchBatch(b))] });

/* F78 Amendment 1, C9 (RR-243): this tenant's OWN declared ledger, decided above with everything else — never another tenant's */
const OWN = tenantLedger({ tenantId: SCOPE.tenantId });
const r = readCostByTenant({ resolve: createTenantResolver(), batches: BATCHES, tenantLedgers: OWN.state === "DECLARED" ? [{ tenantId: SCOPE.tenantId, path: OWN.path }] : [] });
const { mine, unattributedEntries } = viewForTenant(r, SCOPE.tenantId);
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F78 · SPEND AND WORKLOAD BY TENANT — this tenant only, recorded ledgers only, count-only");
console.log(`  bound            ${r.bound}`);
console.log(mine
  ? `  this tenant      entries ${mine.entries} · money measured ${fmt(mine.money)} · zero-by-tariff ${mine.moneyZeroByTariff} · money unknown ${mine.moneyUnknown} · provider calls ${mine.providerCalls} (unknown ${mine.providerCallsUnknown}) · founder time ${Math.round(mine.founderSeconds)} s (unknown ${mine.founderUnknown}) · measurable-but-not-recorded ${mine.measurableButNotRecorded}`
  : "  this tenant      no recorded cost entry is attributed to this tenant");
const g = r.gaps;
console.log(`  gaps (A1)        boundary ${g.boundary} · pre-boundary list ${g.listed.total} (${fmt(g.listed.byKind)}; list intact ${g.listIntact}) · listed seen in the ledgers ${g.listed.seenInLedgers} · unlisted ${g.unlisted.length} · on or after the boundary ${g.postBoundary.length} · C1 gaps ${g.verdict}`);
console.log(`  listed by name   ${g.listed.names.join(" ")} — reported, never PROVED, never hidden`);
console.log(`  unattributed     ${unattributedEntries} entr(ies) no declaration assigns to any tenant — never counted as this tenant's`);
