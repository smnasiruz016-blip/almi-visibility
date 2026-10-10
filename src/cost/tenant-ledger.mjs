/**
 * 🔴 F78 · ACCEPTANCE AMENDMENT 1, C9 — WHERE A TENANT'S OWN COST LEDGER IS. Pure and read-only: it reads the declarations and decides
 * nothing else, so a reader (src/cost/cost-by-tenant.mjs) can locate the ledgers without loading any writer.
 *
 * A tenant's ledger is the COST_LEDGER attached to that tenant as cost-ledger/<tenantId>; its file sits beside the declarations that
 * attach it: <the declaration source>/cost-ledgers/<tenant hex>.jsonl. Whether a ledger and a tenant are the same tenant is F02's one
 * decision (decideResolvedTenants), never a comparison made here.
 */
import { join, dirname } from "node:path";
import { readDeclarations } from "../tenancy/resolver.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";

export const TENANT_LEDGER_DIR = "cost-ledgers";
const TENANT_ID = /^tenant:[0-9a-f]{32}$/;

/** The declared ledger's reference for a tenant: cost-ledger/<tenantId>. */
export const tenantLedgerRef = (tenantId) => `cost-ledger/${tenantId}`;
const fileOf = (dir, tenantId) => join(dir, TENANT_LEDGER_DIR, `${tenantId.slice(7)}.jsonl`);

/** Tenant T's declared ledger: { state: "DECLARED", path, root } — or UNDECLARED / UNKNOWN with why. */
export function tenantLedger({ tenantId, env = process.env, declarations = readDeclarations({ env }) }) {
  if (!TENANT_ID.test(String(tenantId))) return Object.freeze({ state: "UNDECLARED", reason: "NO_TENANT" });
  if (!declarations?.readable) return Object.freeze({ state: "UNKNOWN", reason: declarations?.reason ?? "DECLARATION_SOURCE_ABSENT" });
  const mine = declarations.attachments.filter((a) => a?.resourceKind === "COST_LEDGER" && a.resourceRef === tenantLedgerRef(tenantId));
  if (mine.length !== 1 || !decideResolvedTenants(mine[0].tenantId, tenantId).allowed) return Object.freeze({ state: "UNDECLARED", reason: "NO_DECLARED_COST_LEDGER" });
  return Object.freeze({ state: "DECLARED", path: fileOf(declarations.dir, tenantId), root: dirname(declarations.dir) });
}

/** Every declared tenant ledger whose reference names the tenant it is attached to: [{ tenantId, path }]. */
export function declaredTenantLedgers({ env = process.env, declarations = readDeclarations({ env }) } = {}) {
  if (!declarations?.readable) return [];
  return declarations.attachments
    .filter((a) => a?.resourceKind === "COST_LEDGER" && TENANT_ID.test(String(a.tenantId)) && a.resourceRef === tenantLedgerRef(a.tenantId))
    .map((a) => Object.freeze({ tenantId: a.tenantId, path: fileOf(declarations.dir, a.tenantId) }));
}
