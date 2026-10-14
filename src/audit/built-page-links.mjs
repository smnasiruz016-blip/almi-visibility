/**
 * F23 · ONE CLIENT'S BUILT AND LIVE PAGES, AS THE LINK AUDIT READS THEM (F23 Acceptance Amendment 1, INPUT and C1; RR-263).
 *
 * PURE: stored records in, the audited population out. Nothing is fetched, rendered or written, and no batch or date is a default — the
 * caller hands in the records of every research batch the client declares.
 *   BUILT   every page the engine has built for the client and not published, as it stands (the latest build of each; a page a stored
 *           cancellation names is no longer a page — src/page/built-page-needs.mjs builtPages)
 *   LIVE    every such page once published: its body is the latest stored read of its own address on the client's declared host. A
 *           published page with no stored read has no stored body and is counted absent; one published on a host the client does not
 *           declare is never read and is counted by itself
 * A built page has no address of its own yet: a link on it is INTERNAL when it points at one of the client's declared hosts.
 * It names no client, product, host or batch.
 */
import { builtPages, PUBLICATION } from "../page/built-page-needs.mjs";
import { PUBLISHED_FIELDS } from "../../config/page/built-page-needs.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { auditLinks, POPULATION, LINK_STATUS_RECORD } from "./page-links.mjs";
import { LIVE_READ_RECORD } from "./link-status.mjs";

const present = (v) => typeof v === "string" && v.trim() !== "";
const list = (v) => (Array.isArray(v) ? v : []);
const hostOf = (u) => { try { return new URL(u).host; } catch { return null; } };
/** A built page has no address: its links are resolved against a base that is no host at all (every link the builder writes is absolute). */
export const NO_ADDRESS_BASE = "https://built-page.invalid/";
/** The address a page's own record says it was published at, or null. */
export const publishedAddress = (record) => ["publishedUrl", "liveUrl"].map((f) => record?.[f]).find((v) => present(v) && /^https?:\/\//i.test(v)) ?? null;

/** whether a stored record is this tenant's is not decided here: it is F02's one decision (src/tenancy/scope.mjs) */
const ofTenant = (r, tenantId) => present(r?.tenantId) && present(tenantId) && decideResolvedTenants(r.tenantId, tenantId).allowed;

/**
 * THE POPULATION of one client. `batches`: [{ batchId, builds: joined-page rows, decisions: built-page-needs rows, reads: live-read rows }].
 * `hosts`: the hosts declared to the client.
 */
export function clientPages({ batches = [], tenantId, hosts = [] }) {
  const pages = [];
  let publishedElsewhere = 0, publishedWithNoAddress = 0;
  for (const b of list(batches)) {
    const reads = list(b.reads).filter((r) => r?.record_type === LIVE_READ_RECORD && ofTenant(r, tenantId));
    for (const p of builtPages({ records: [...list(b.builds), ...list(b.decisions)], tenantId })) {
      if (p.publication !== PUBLICATION.PUBLISHED) {
        pages.push(Object.freeze({ population: POPULATION.BUILT, batchId: b.batchId, pageId: p.pageId, build: p.build, canonical: NO_ADDRESS_BASE, html: typeof p.record.html === "string" ? p.record.html : null, internalHosts: Object.freeze([...hosts]) }));
        continue;
      }
      const address = publishedAddress(p.record);
      if (address === null) { publishedWithNoAddress += 1; continue; }
      if (!hosts.includes(hostOf(address))) { publishedElsewhere += 1; continue; }
      const read = reads.filter((r) => r.pageId === p.pageId && r.url === address).at(-1) ?? null;
      pages.push(Object.freeze({ population: POPULATION.LIVE, batchId: b.batchId, pageId: p.pageId, build: p.build, canonical: address, html: read ? read.html : null, internalHosts: Object.freeze([...hosts]) }));
    }
  }
  const of = (k) => pages.filter((p) => p.population === k).length;
  return Object.freeze({ pages: Object.freeze(pages), counts: Object.freeze({ built: of(POPULATION.BUILT), live: of(POPULATION.LIVE), liveWithNoStoredRead: pages.filter((p) => p.population === POPULATION.LIVE && p.html === null).length, publishedElsewhere, publishedWithNoAddress }) });
}

/** Every stored observation of the link-status check that is this tenant's, under the address it observed, in stored order. */
export function storedDestinations({ records = [], tenantId, canon }) {
  const map = new Map();
  for (const r of list(records)) {
    if (r?.record_type !== LINK_STATUS_RECORD || !ofTenant(r, tenantId)) continue;
    const c = canon(r.url);
    if (c !== null) (map.get(c) ?? map.set(c, []).get(c)).push(r);
  }
  return map;
}

/** The audit of one client's built and live pages. A client with none is 0, each population by name — never an error. */
export function auditClientPages({ batches = [], tenantId, hosts = [], canon, genericNames }) {
  const population = clientPages({ batches, tenantId, hosts });
  const destinations = storedDestinations({ records: list(batches).flatMap((b) => list(b.observations)), tenantId, canon });
  const audit = auditLinks({ pages: population.pages, recordsOf: (u) => destinations.get(u) ?? [], canon, ...(genericNames ? { genericNames } : {}) });
  return Object.freeze({ audit, population: population.counts, pages: population.pages, observedAddresses: destinations.size });
}

export { PUBLISHED_FIELDS };
