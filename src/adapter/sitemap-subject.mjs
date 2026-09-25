/**
 * 🔴 REAL SITEMAP URLS AS LAWFUL SUBJECTS — and the first join this engine has ever made between
 * two independently captured populations.
 *
 * ── WHY THIS IS THE HARD CASE, NOT THE EASY ONE ────────────────────────────
 *
 * Every binding the engine had managed until now joined material to ITSELF: a page to the bytes
 * served for it, a claim to the registry that declares it. Both sides came out of one capture, so
 * "are these the same thing?" was answered by an identifier one side already carried about the
 * other.
 *
 * A sitemap and a crawl share no identifier at all. They were collected minutes apart by different
 * collectors, and the only thing they have in common is a URL string — which is exactly the kind of
 * resemblance Subject Binding V1 refuses to accept on its own. A URL that matches proves the two
 * populations are TALKING ABOUT the same address. It does not prove they are talking about the same
 * SUBJECT, because two isolation scopes may both serve `/pricing`.
 *
 * 🔴 SO THE JOIN REQUIRES BOTH: the exact normalised URL, and the exact DECLARED scope, each side
 * resolved independently through the same resolver from its own reference. Equal origins are not
 * enough — two origins that look alike are two scopes until one declaration says otherwise, and no
 * alias is authorised. A URL that matches across scopes is INVALID, never a binding.
 *
 * ── WHAT THIS ADAPTER DOES NOT MEASURE, STATED HERE RATHER THAN IMPLIED ────
 *
 * The stored sitemap observations record, per collection: the URLs declared, the origin, the counts
 * and the storage bound. They do NOT record, per URL, a noindex directive or a declared canonical.
 * So this adapter supplies the detector the fields the capture actually holds — status, redirect
 * target, robots state and whether a body was archived — and supplies `noindexed` and `canonical`
 * as null rather than inventing them. A CLEAN from detector D on this input therefore means
 * "advertised, fetched, resolved, not redirected and not robots-blocked"; it is NOT a statement
 * about noindex or canonical, and must not be read as one.
 *
 * ── THE STORAGE BOUND TRAVELS WITH THE RESULT ──────────────────────────────
 *
 * One collection stored 20,000 of 240,328 URLs it counted. Every population this module reports is
 * therefore over what was STORED, and `bounds` carries the difference so a later reader cannot
 * mistake a stored count for a complete one.
 */
import { subjectRef, refLabel } from "../detect/subject.mjs";
import { evidenceEdge, bindSubject } from "../detect/binding.mjs";
import { batchFile, readBatchManifest } from "../crawl/observation-batch.mjs";
import { createJsonlStore } from "../evidence/store.mjs";
import { createTenantResolver } from "../tenancy/resolver.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { normaliseObservedUrl } from "./observed-page-subject.mjs";

/** The collection this engine currently reads. A collection id is a capture, never a scope. */
export const SITEMAP_BATCH_ID = "sitemap-2026-09-12";
export const SITEMAP_FILE = "sitemaps.jsonl";

export const SITEMAP_REASONS = Object.freeze({
  UNIQUE_EXACT_JOIN: "one observed page at the same normalised URL in the same declared scope",
  NO_OBSERVED_PAGE: "no observed page in this scope was captured at this URL — an unfetched entry is unmeasured, never healthy",
  CROSS_TENANT_URL: "an observed page exists at this exact URL but in a DIFFERENT declared scope",
  MALFORMED_URL: "the sitemap declares a string that is not a URL",
  TENANT_UNDECLARED: "no declaration attaches this URL's origin to an isolation scope",
  TENANT_AMBIGUOUS: "two or more declarations attach this URL's origin to different scopes",
  TENANT_INVALID: "the declaration for this URL's origin is malformed or names a scope that is not declared",
  TENANT_SOURCE_UNKNOWN: "the declaration source could not be read, so this URL's scope is unknown rather than absent",
  COLLECTION_UNRESOLVED: "the sitemap collection itself is not attached to a declared scope",
});

const TENANT_FAILURE = Object.freeze({
  UNDECLARED: { state: "UNBOUND", reason: "TENANT_UNDECLARED" },
  AMBIGUOUS: { state: "AMBIGUOUS", reason: "TENANT_AMBIGUOUS" },
  INVALID: { state: "INVALID", reason: "TENANT_INVALID" },
  UNKNOWN: { state: "UNBOUND", reason: "TENANT_SOURCE_UNKNOWN" },
});

/** The references each side of this adapter is declared against. */
export const sitemapCollectionRef = (batchId) => ({ resourceKind: "SITEMAP_COLLECTION", resourceRef: batchId });
export const sitemapOriginRef = (url) => ({ resourceKind: "SITE_ORIGIN", resourceRef: new URL(url).origin });

/**
 * Read the external sitemap collection. 🔴 An absent source raises through the batch accessors,
 * which a caller turns into UNKNOWN — never into an empty, clean-looking population.
 */
export function readSitemapCollection({ batchId = SITEMAP_BATCH_ID, env = process.env } = {}) {
  const manifest = readBatchManifest({ batchId, env });
  const records = createJsonlStore(batchFile(SITEMAP_FILE, { batchId, env })).readAll();
  return { manifest, records };
}

/**
 * Judge every stored sitemap URL against the observed pages.
 *
 * @param observedPages the result of `observedPageSubjects()` — each page already carrying the scope
 *                      IT resolved independently. This module never resolves a page's scope for it.
 */
export function sitemapUrlSubjects({ batchId = SITEMAP_BATCH_ID, env = process.env, resolveTenant = null, observedPages, partition = null } = {}) {
  const resolve = resolveTenant ?? createTenantResolver({ env });
  /* F02 (partition): a tenant-scoped run hands in ITS partition of the collection (src/crawl/batch-partition.mjs). */
  const read = readSitemapCollection({ batchId, env });
  const manifest = read.manifest;
  const records = partition ? partition.records : read.records;
  const locator = `observations/${batchId}/${SITEMAP_FILE}`;

  /* The collection is a resource too, and it has its own scope. It spans many origins, so it is
   * NOT the scope any of its URLs belongs to — it is provenance about where they were read. */
  const collection = resolve(sitemapCollectionRef(batchId));

  /* The observed side, indexed by normalised URL AND by the scope the page itself resolved. */
  const pageByUrl = new Map();
  for (const p of observedPages.pages) {
    if (!p.url) continue;
    if (!pageByUrl.has(p.url)) pageByUrl.set(p.url, []);
    pageByUrl.get(p.url).push(p);
  }

  const bounds = [];
  const entries = [];
  for (const rec of records) {
    const stored = rec.value?.urls ?? [];
    bounds.push({
      observationId: rec.observation_id, origin: rec.value?.origin ?? null,
      urlsStored: stored.length, urlsTotal: rec.value?.urlsTotal ?? null,
      bounded: (rec.value?.urlsTotal ?? 0) > stored.length,
    });
    for (const raw of stored) entries.push(judgeSitemapUrl({ raw, rec, locator, batchId, resolve, pageByUrl }));
  }

  const counts = { BOUND: 0, AMBIGUOUS: 0, UNBOUND: 0, INVALID: 0 };
  const reasons = {};
  for (const e of entries) {
    counts[e.state] += 1;
    reasons[e.reason] = (reasons[e.reason] ?? 0) + 1;
  }

  return {
    batchId, collectionState: collection.state, collectionTenantId: collection.tenantId,
    provenance: { batchId, locator, classificationState: manifest.classificationState },
    entries, counts, reasons, population: entries.length, bounds,
    documents: records.length,
  };
}

/** Judge ONE sitemap URL. Exported so every branch can be driven by a crafted record in a test. */
export function judgeSitemapUrl({ raw, rec, locator, batchId, resolve, pageByUrl }) {
  const base = { rawUrl: raw, observationId: rec?.observation_id ?? null, batchId };

  let url;
  try { url = normaliseObservedUrl(raw); } catch {
    return { ...base, url: null, state: "INVALID", reason: "MALFORMED_URL", tenantId: null, origin: null, subject: null, edges: [], binding: null, page: null };
  }

  const ref = sitemapOriginRef(url);
  const r = resolve(ref);
  if (r.state !== "RESOLVED") {
    const outcome = TENANT_FAILURE[r.state];
    return { ...base, url, state: outcome.state, reason: outcome.reason, tenantId: null, origin: ref.resourceRef, tenantDetail: r.detail, subject: null, edges: [], binding: null, page: null };
  }
  const tenantId = r.tenantId;

  const entrySubject = subjectRef({ type: "SITEMAP_ENTRY", tenantId, identityKind: "CANONICAL_URL", identity: url, locator });

  /* 🔴 BOTH CONDITIONS, JUDGED SEPARATELY. The URL match is found first because it is what makes a
   * cross-scope match REPORTABLE: without it a page in another scope is indistinguishable from no
   * page at all, and the difference between those two is the whole point of declared tenancy. */
  const atUrl = pageByUrl.get(url) ?? [];
  /* F02: the entry's and each page's resolved tenants are decided by the ONE decision (src/tenancy/scope.mjs), never compared here. */
  const sameScope = atUrl.filter((p) => decideResolvedTenants(tenantId, p.tenantId).allowed);
  const otherScope = atUrl.filter((p) => decideResolvedTenants(tenantId, p.tenantId).outcome === "CROSS_TENANT_REFUSED");

  if (sameScope.length === 0) {
    if (otherScope.length > 0) {
      return { ...base, url, state: "INVALID", reason: "CROSS_TENANT_URL", tenantId, origin: ref.resourceRef, subject: refLabel(entrySubject), entrySubject, edges: [], binding: null, page: null,
        detail: `${otherScope.length} observed page(s) sit at this exact URL in ${new Set(otherScope.map((p) => p.tenantId)).size} other declared scope(s); a URL match across scopes is not a binding` };
    }
    return { ...base, url, state: "UNBOUND", reason: "NO_OBSERVED_PAGE", tenantId, origin: ref.resourceRef, subject: refLabel(entrySubject), entrySubject, edges: [], binding: null, page: null };
  }

  /* Two pages in ONE scope at one URL is a contradiction the observed side already refuses; if it
   * ever reaches here, it is named, never chosen between. */
  const candidates = sameScope.map((p) => p.pageSubject).filter(Boolean);
  if (candidates.length !== 1) {
    return { ...base, url, state: "AMBIGUOUS", reason: "MULTIPLE_PAGES_IN_SCOPE", tenantId, origin: ref.resourceRef, subject: refLabel(entrySubject), entrySubject,
      edges: [], binding: bindSubject({ tenantId, candidates, edges: [] }), page: null };
  }

  const page = sameScope[0];
  const edges = [evidenceEdge({
    /* The edge type V1 already declared for exactly this join. No new vocabulary is added here. */
    from: entrySubject, to: page.pageSubject, edgeType: "SITEMAP_ADVERTISES_PAGE", tenantId,
    method: "exact normalised URL equality AND exact declared tenant equality, each side resolved independently from its own declared reference",
    artifact: `observations/${batchId}/${SITEMAP_FILE}`,
    reason: `the sitemap collection declares ${url}, and an observed page captured at the same normalised URL resolves to the same declared scope ${tenantId}`,
  })];
  const binding = bindSubject({ tenantId, candidates: [page.pageSubject], edges });

  return { ...base, url, state: binding.state, reason: binding.state === "BOUND" ? "UNIQUE_EXACT_JOIN" : binding.reason,
    tenantId, origin: ref.resourceRef, subject: refLabel(entrySubject), entrySubject, edges, binding, page };
}

/**
 * Build detector D's input, PER SCOPE. 🔴 Only BOUND entries are offered: an entry whose scope is
 * undeclared, ambiguous, invalid or cross-scope has not earned a comparison, and offering it with an
 * empty observation would let it read as UNKNOWN when it is actually refused.
 */
export function sitemapDetectorInputsByTenant(result, observedPages) {
  const obsById = new Map();
  for (const p of observedPages.pages) if (p.pageId) obsById.set(p.pageId, p);

  const byTenant = new Map();
  for (const e of result.entries) {
    if (e.state !== "BOUND" || !e.page) continue;
    if (!byTenant.has(e.tenantId)) byTenant.set(e.tenantId, { tenantId: e.tenantId, sitemapUrls: [], observations: {}, subjectBindings: {}, pageSubjects: [] });
    const g = byTenant.get(e.tenantId);
    g.sitemapUrls.push(e.url);
    g.observations[e.url] = observedStateOf(e.page);
    /* 🔴 THE BINDING IS OFFERED, NOT ASSERTED. runDetectors re-judges these candidates and edges
     * through bindSubject; if the edge were malformed or crossed a scope it would come back INVALID
     * no matter what this adapter decided. Without offering it, a lawfully joined entry reaches the
     * detector as an unbound subject and its verdict is downgraded to UNKNOWN — which is V1 refusing
     * correctly, and exactly why the join has to travel with the comparison. */
    g.subjectBindings[e.url] = { candidates: [e.page.pageSubject], edges: e.edges };
    g.pageSubjects.push(e.url);
  }
  return [...byTenant.values()].sort((a, b) => b.sitemapUrls.length - a.sitemapUrls.length);
}

/**
 * The observed state of one page, from the fields the capture RECORDED. `noindexed` and `canonical`
 * are null because the stored observations do not carry them per URL — see the header. They are
 * passed explicitly rather than omitted so a reader of this object can see they were not measured.
 */
function observedStateOf(page) {
  const o = page.primaryObservation ?? null;
  return {
    status: o?.value?.status ?? page.observedStatus ?? null,
    redirectTo: o?.value?.final_url && o.value.final_url !== o.value.requested_url ? o.value.final_url : null,
    robotsAllowed: o?.value?.robotsState === undefined ? null : o.value.robotsState !== "DISALLOWED",
    noindexed: null,
    canonical: null,
    hasContent: (page.bodyIds?.length ?? 0) > 0,
  };
}
