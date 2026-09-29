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

/* C6: a research batch is read only when named here — the scope gate decides each for THIS tenant, and refuses another tenant's */
const BATCHES = process.argv.filter((a) => a.startsWith("--research-batch=")).map((a) => a.slice("--research-batch=".length)).filter(Boolean);
const SCOPE = scopedEntryPoint({ entry: "bin/cost-by-tenant.mjs", governed: false, resources: [RESOURCES.costLedger(), RESOURCES.evidenceStore(), ...BATCHES.map((b) => RESOURCES.researchBatch(b))] });

const r = readCostByTenant({ resolve: createTenantResolver(), batches: BATCHES });
const { mine, unattributedEntries } = viewForTenant(r, SCOPE.tenantId);
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F78 · SPEND AND WORKLOAD BY TENANT — this tenant only, recorded ledgers only, count-only");
console.log(`  bound            ${r.bound}`);
console.log(mine
  ? `  this tenant      entries ${mine.entries} · money measured ${fmt(mine.money)} · zero-by-tariff ${mine.moneyZeroByTariff} · money unknown ${mine.moneyUnknown} · provider calls ${mine.providerCalls} (unknown ${mine.providerCallsUnknown}) · founder time ${Math.round(mine.founderSeconds)} s (unknown ${mine.founderUnknown}) · measurable-but-not-recorded ${mine.measurableButNotRecorded}`
  : "  this tenant      no recorded cost entry is attributed to this tenant");
console.log(`  unattributed     ${unattributedEntries} entr(ies) no declaration assigns to any tenant — never counted as this tenant's`);
