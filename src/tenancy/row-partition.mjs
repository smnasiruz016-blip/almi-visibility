/**
 * 🔴 PARTITION A ROW POPULATION BY THE HOST EACH ROW ALREADY STORES.
 *
 * A mixed capture — one Search Console property covering many sites — is not one tenant's data. It
 * is many tenants' data in one file, and reading it as one would let any client's rows decide
 * another client's question.
 *
 * ── THE ONE RULE THIS MODULE EXISTS TO KEEP ───────────────────────────────
 *
 * 🔴 THE HOST PARTITIONS THE ROWS. THE OWNER'S DECLARATION ASSIGNS THE TENANT.
 *
 * The host is read because each row STORES it. It is then looked up as a declared site origin, and
 * the tenant comes from that declaration and nowhere else. A host nobody declared yields NO tenant —
 * never a guess, never the tenant of a similar-looking host, never "the one this file is probably
 * about". That is why this module needs no new declaration and introduces no new resource kind: the
 * attachments that assign these tenants already exist, and inventing a second place to say the same
 * thing would be a second place for the two to disagree.
 *
 * ── FAIL CLOSED, INCLUDING FOR ROWS THAT DO NOT EXIST YET ─────────────────
 *
 * An unmatched host is REJECTED, and so is a row added tomorrow whose host nobody has declared. A
 * partition that quietly widened to cover new rows would inherit today's tenant for material the
 * owner has never seen.
 */

/** Every state a row can be in. REJECTED and UNREADABLE are never a tenancy. */
export const ROW_PARTITION_STATES = Object.freeze(["ATTRIBUTED", "REJECTED", "UNREADABLE"]);

/**
 * The host a row stores, from the first field that parses as a URL.
 * 🔴 It is never composed, defaulted or guessed — a row that stores no readable URL is UNREADABLE.
 */
export function storedHost(row, fields = ["url", "page", "canonical", "target"]) {
  if (row === null || typeof row !== "object") return null;
  for (const f of fields) {
    try {
      return new URL(row[f]).host;
    } catch {
      /* not this field */
    }
  }
  return null;
}

/**
 * Partition rows by their stored host, resolving each host through the owner's DECLARED site
 * origins.
 *
 * @param {object} args
 * @param {Array<object>} args.rows
 * @param {(ref: {resourceKind: string, resourceRef: string}) => {state: string, tenantId?: string|null}} args.resolve
 *        the production resolver — injected, so the dependency is declared and reachable by a test
 * @param {(host: string) => string} [args.originRef] how a host is written as a site-origin
 *        reference. Default `https://<host>`; it identifies a declared origin, it does not create one.
 * @returns {{ byTenant: Record<string, object[]>, rejected: object[], unreadable: object[],
 *             hosts: Array<{host: string, rows: number, state: string, tenantId: string|null}>,
 *             arithmetic: object }}
 */
export function partitionRowsByDeclaredHost({ rows = [], resolve, originRef = (h) => `https://${h}` }) {
  if (typeof resolve !== "function") throw new TypeError("partitionRowsByDeclaredHost needs the production resolver");

  const byHost = new Map();
  const unreadable = [];
  for (const row of rows) {
    const h = storedHost(row);
    if (h === null) { unreadable.push(row); continue; }
    byHost.set(h, [...(byHost.get(h) ?? []), row]);
  }

  const byTenant = {};
  const rejected = [];
  const hosts = [];
  for (const [host, hostRows] of byHost) {
    const r = resolve({ resourceKind: "SITE_ORIGIN", resourceRef: originRef(host) });
    /* 🔴 ONLY A RESOLVED DECLARATION ATTRIBUTES. Every other state — UNDECLARED, AMBIGUOUS, INVALID,
     * UNKNOWN — rejects, because none of them is the owner having said so. */
    if (r?.state !== "RESOLVED" || typeof r.tenantId !== "string" || r.tenantId === "") {
      rejected.push(...hostRows);
      hosts.push({ host, rows: hostRows.length, state: "REJECTED", tenantId: null, why: `the host resolves ${r?.state ?? "UNKNOWN"} — no declared site origin assigns it a tenant` });
      continue;
    }
    byTenant[r.tenantId] = [...(byTenant[r.tenantId] ?? []), ...hostRows];
    hosts.push({ host, rows: hostRows.length, state: "ATTRIBUTED", tenantId: r.tenantId, why: null });
  }

  const attributed = Object.values(byTenant).reduce((a, x) => a + x.length, 0);
  return {
    byTenant,
    rejected,
    unreadable,
    hosts: hosts.sort((a, b) => b.rows - a.rows),
    arithmetic: Object.freeze({
      total: rows.length,
      attributed,
      rejected: rejected.length,
      unreadable: unreadable.length,
      remainder: rows.length - attributed - rejected.length - unreadable.length,
      tenants: Object.keys(byTenant).length,
    }),
  };
}
