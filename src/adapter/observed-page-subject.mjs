/**
 * 🔴 REAL OBSERVED PAGES AS LAWFUL SUBJECTS — the external observation batch reaching Subject Binding V1.
 *
 * Until now the only real subject the engine had met was a FACT record cited by a page spec inside one
 * product's own registry: 28 of 28 BOUND on an exact id match in a single file, which proved very
 * little. This adapter binds the thing the sealed run actually failed at — a real page, on a real
 * host, to the bytes that were really served for it.
 *
 * ── THE TENANT OF AN OBSERVED PAGE — DECLARED, NOT INFERRED ────────────────
 *
 * 🔴 THIS MODULE USED TO READ THE CAPTURE BATCH'S OWN ID AS THE TENANT, AND THAT WAS WRONG.
 *
 * The reasoning at the time was that a batch is a stable identity naming no product, so it was
 * safer than a product id. It was safer. It was still a tenant this engine INFERRED from something
 * the material happened to carry, and the law is not about which value gets picked — it is that a
 * scope may not be derived at all. A capture batch is PROVENANCE: it says where a record came from,
 * never who it is isolated from. Two captures of one site are one scope; one capture of eighteen
 * sites is eighteen.
 *
 * So the tenant now comes from an explicit external declaration, looked up through the generic
 * resolver by the page's own canonical origin. `batchId` stays on every record as provenance and is
 * never read as a scope again.
 *
 * 🔴 AND IT IS SELF-ENFORCING. Each page carries its declared site scope, so an edge from one site's
 * page to another site's subject is INVALID_CROSS_TENANT. "Do not assign ownership" stops being a
 * promise this module makes and becomes something the binding contract refuses to let it break —
 * and, unlike before, it now holds BETWEEN the observed sites as well as around them.
 *
 * 🔴 AN UNDECLARED ORIGIN GETS NO TENANT AND NO BINDING. It does not get the batch's, it does not
 * get a neighbour's, and it does not get dropped: it stays in the population with its reason. An
 * absent declaration never means "the usual one".
 *
 * ── WHAT COUNTS AS AMBIGUOUS, AND WHY IT IS NOT "TWO OBSERVATIONS" ─────────
 *
 * Five pages in this batch carry two body-backed observations each. Measured, all five are the SAME
 * BYTES fetched twice — a trailing-slash variant of one URL, the same final_url, the same
 * content_sha256. Two witnesses who agree are not an ambiguity; there is nothing to choose between,
 * and AMBIGUOUS is defined as candidates "ALL of them named, never silently picked between".
 *
 * So the candidate identity is the page's DISTINCT OBSERVED CONTENT. One distinct content hash is
 * one candidate however many times it was fetched; two differing hashes are two candidates and the
 * page is AMBIGUOUS. Reporting UNKNOWN for a page whose served bytes are unambiguously known would
 * be a false coverage gap, which understates the engine as surely as a false finding overstates it.
 *
 * ── NOTHING HERE DECIDES A BINDING ─────────────────────────────────────────
 *
 * This module builds candidates and edges out of identifiers the records already carry, and hands
 * them to `bindSubject`. It never returns a state it chose itself.
 */
import { createHash } from "node:crypto";

import { subjectRef, refLabel } from "../detect/subject.mjs";
import { evidenceEdge, bindSubject } from "../detect/binding.mjs";
import { batchFile, readBatchManifest, BATCH_ID } from "../crawl/observation-batch.mjs";
import { createJsonlStore } from "../evidence/store.mjs";
import { readBodyArchive } from "../evidence/body-archive.mjs";
import { createTenantResolver } from "../tenancy/resolver.mjs";

/** Why a page is not BOUND. Every non-bound page keeps one of these and stays in the output. */
export const PAGE_REASONS = Object.freeze({
  UNIQUE_EXACT_JOIN: "one distinct observed content, hash-verified against the observation that recorded it",
  NO_OBSERVATION: "the page record names no observation this batch holds",
  NO_BODY: "the page's observations hold no archived body, so nothing was served to examine",
  MULTIPLE_DISTINCT_BODIES: "two or more DIFFERENT bodies were served for one canonical URL",
  MALFORMED_URL: "the page's canonical_url is not a URL",
  CONTRADICTORY_IDENTITY: "one canonical URL is claimed by more than one page_id",
  CROSS_HOST_EDGE: "an observation's target is on a different host from the page's canonical URL",
  BODY_HASH_MISMATCH: "the archived body does not hash to the content_sha256 the observation recorded",
  TENANT_UNDECLARED: "no declaration attaches this page's canonical origin to an isolation scope",
  TENANT_AMBIGUOUS: "two or more declarations attach this page's canonical origin to different scopes",
  TENANT_INVALID: "the declaration for this page's canonical origin is malformed or names a scope that is not declared",
  TENANT_SOURCE_UNKNOWN: "the declaration source could not be read, so this page's scope is unknown rather than absent",
});

/** How a resolution state that is not RESOLVED becomes a page outcome. Nothing here is a default. */
const TENANT_FAILURE = Object.freeze({
  UNDECLARED: { state: "UNBOUND", reason: "TENANT_UNDECLARED" },
  AMBIGUOUS: { state: "AMBIGUOUS", reason: "TENANT_AMBIGUOUS" },
  INVALID: { state: "INVALID", reason: "TENANT_INVALID" },
  UNKNOWN: { state: "UNBOUND", reason: "TENANT_SOURCE_UNKNOWN" },
});

/** The canonical origin of a page URL — the reference its site scope is declared against. */
export function pageOriginRef(url) {
  return { resourceKind: "SITE_ORIGIN", resourceRef: new URL(url).origin };
}

/**
 * The canonical identity of an observed page: its URL, normalised only in ways that cannot change
 * which resource is meant — case of the host, the fragment, one trailing slash. Anything it cannot
 * parse throws, because a malformed identity must not become a quietly different one.
 */
export function normaliseObservedUrl(raw) {
  if (typeof raw !== "string" || raw.trim() === "") throw new TypeError("normaliseObservedUrl: a URL is required");
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError(`normaliseObservedUrl: ${url.protocol} is not an observable web protocol`);
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/**
 * Read the batch and produce one result per page record — BOUND or not, every one of them present.
 *
 * 🔴 An unbound page is never dropped. The counts below are over the whole page population, so the
 * buckets sum to it with no remainder; a joiner that quietly returns only what it managed to join
 * reports a clean rate over a population it chose.
 */
export function observedPageSubjects({ batchId = BATCH_ID, env = process.env, resolveTenant = null, partition = null } = {}) {
  const manifest = readBatchManifest({ batchId, env });
  const resolve = resolveTenant ?? createTenantResolver({ env });
  const locator = `observations/${manifest.batchId}/first-real-crawl-2026-09-12.jsonl`;

  /* F02 (partition): a tenant-scoped run hands in ITS partition of the batch — the records whose own identities resolve to
   * its tenant, and only their bodies (src/crawl/batch-partition.mjs). Without one, the whole batch is read, as the
   * adapter's own tests do; a production entry point never calls it that way (bin/detect.mjs passes its partition). */
  const rows = partition ? partition.records : createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl", { batchId, env })).readAll();
  const bodies = partition ? partition.bodies : readBodyArchive(batchFile("bodies-2026-09-12.jsonl.br", { batchId, env }));
  const observations = new Map(rows.filter((r) => r.record_type === "observation").map((o) => [o.observation_id, o]));
  const pageRecords = rows.filter((r) => r.record_type === "page");

  /* One canonical URL claimed by two page_ids is a contradiction, not a choice. Computed over the
   * whole population first, so both sides of a collision are marked, not just the second one. */
  const idsByUrl = new Map();
  for (const p of pageRecords) {
    let url;
    try { url = normaliseObservedUrl(p.canonical_url); } catch { continue; }
    if (!idsByUrl.has(url)) idsByUrl.set(url, new Set());
    idsByUrl.get(url).add(p.page_id);
  }

  /* 🔴 EACH PAGE RESOLVES ITS OWN SCOPE, FROM ITS OWN ORIGIN. A page whose origin is not declared
   * is judged here and never reaches judgeObservedPage — because that function needs a tenant, and
   * the one thing this adapter may not do is invent one to get past this line. */
  const resolution = { RESOLVED: 0, UNDECLARED: 0, AMBIGUOUS: 0, INVALID: 0, UNKNOWN: 0 };
  const pages = pageRecords.map((p) => {
    let ref = null;
    try { ref = pageOriginRef(normaliseObservedUrl(p.canonical_url)); } catch { /* judged below as MALFORMED_URL */ }
    if (ref === null) {
      return judgeObservedPage({ page: p, tenantId: null, locator, batchId: manifest.batchId, observations, bodies, idsByUrl });
    }
    const r = resolve(ref);
    resolution[r.state] += 1;
    if (r.state !== "RESOLVED") {
      const outcome = TENANT_FAILURE[r.state];
      return {
        pageId: p.page_id, rawUrl: p.canonical_url, url: normaliseObservedUrl(p.canonical_url),
        state: outcome.state, reason: outcome.reason, tenantId: null, origin: ref.resourceRef,
        batchId: manifest.batchId, tenantDetail: r.detail,
        subject: null, pageSubject: null, candidates: [], bundleCandidates: [], edges: [], bodyIds: [], distinctContents: 0, binding: null,
      };
    }
    const judged = judgeObservedPage({ page: p, tenantId: r.tenantId, locator, batchId: manifest.batchId, observations, bodies, idsByUrl });
    return { ...judged, tenantId: r.tenantId, origin: ref.resourceRef, batchId: manifest.batchId };
  });

  const counts = { BOUND: 0, AMBIGUOUS: 0, UNBOUND: 0, INVALID: 0 };
  const reasons = {};
  for (const r of pages) {
    counts[r.state] += 1;
    reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  }

  /* `batchId` and `classificationState` travel with the result as PROVENANCE. Nothing downstream
   * may read either as a scope; `tenants` below is the only scope information here. */
  return {
    batchId: manifest.batchId, classificationState: manifest.classificationState,
    provenance: { batchId: manifest.batchId, locator },
    resolution, tenants: [...new Set(pages.map((p) => p.tenantId).filter(Boolean))].sort(),
    pages, counts, reasons, population: pageRecords.length,
  };
}

/**
 * Group one result into ONE BUNDLE PER DECLARED TENANT.
 *
 * 🔴 WHY THE RUNNER MUST LOOP. `runDetectors` takes ONE tenant for a whole run and `bindSubject`
 * refuses any candidate belonging to a different one. That was invisible while every page shared a
 * single batch scope; with real declared site scopes a single run over this population would reject
 * every page outside the one scope it was handed — measured at 345 of 495. The fix is a loop in the
 * runner, not a change to the binder: the shared integration point stays exactly as it is.
 */
export function bundlesByTenant(result) {
  const byTenant = new Map();
  for (const p of result.pages) {
    if (!p.tenantId) continue;
    if (!byTenant.has(p.tenantId)) byTenant.set(p.tenantId, []);
    byTenant.get(p.tenantId).push(p);
  }
  return [...byTenant.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([tenantId, pages]) => ({ tenantId, pages, bundle: toBundle({ pages }) }));
}

/**
 * Judge ONE page record. 🔴 Exported because the real material reaches only two of its outcomes —
 * 389 BOUND and 106 UNBOUND — and an INVALID or AMBIGUOUS branch that no input can drive is a
 * comment, not a guard. Tests drive the rest directly with crafted records.
 */
export function judgeObservedPage({ page, tenantId, locator, batchId, observations, bodies, idsByUrl }) {
  const base = { pageId: page.page_id, rawUrl: page.canonical_url };

  let url;
  try { url = normaliseObservedUrl(page.canonical_url); } catch {
    return { ...base, url: null, state: "INVALID", reason: "MALFORMED_URL", subject: null, pageSubject: null, candidates: [], bundleCandidates: [], edges: [], bodyIds: [], distinctContents: 0, binding: null };
  }

  if ((idsByUrl.get(url)?.size ?? 0) > 1) {
    return { ...base, url, state: "INVALID", reason: "CONTRADICTORY_IDENTITY", subject: null, pageSubject: null, candidates: [], bundleCandidates: [], edges: [], bodyIds: [], distinctContents: 0, binding: null };
  }

  const host = new URL(url).hostname;
  /* Built here, before any early return: an UNBOUND page still needs a subject, or the runner will
   * bind it with its own fallback edge and hand back BOUND. */
  const pageSubject = subjectRef({ type: "PAGE", tenantId, identityKind: "CANONICAL_URL", identity: url, locator });
  const unbound = (reason) => ({
    ...base, url, state: "UNBOUND", reason, subject: refLabel(pageSubject), pageSubject,
    candidates: [refLabel(pageSubject)], bundleCandidates: [pageSubject], edges: [], bodyIds: [], distinctContents: 0,
    binding: bindSubject({ tenantId, candidates: [pageSubject], edges: [] }),
  });
  const invalid = (reason, bodyIds = []) => ({
    ...base, url, state: "INVALID", reason, subject: null, pageSubject: null,
    candidates: [], bundleCandidates: [], edges: [], bodyIds, distinctContents: 0, binding: null,
  });
  const named = Array.isArray(page.observations) ? page.observations : [];
  const known = named.filter((id) => observations.has(id));
  if (known.length === 0) {
    return unbound("NO_OBSERVATION");
  }

  /* 🔴 THE FIRST OBSERVATION THIS PAGE NAMES, CARRIED FORWARD WHOLE. A later comparator needs what
   * was actually recorded — status, final URL, robots state — and must not re-derive any of it.
   * It travels even on an UNBOUND page, because "robots disallowed it" is exactly the sort of thing
   * a sitemap comparison needs to know and exactly the page that has no body to read it from. */
  const primaryObservation = observations.get(known[0]);

  /* An observation about another host is a cross-boundary edge, whatever the page record says. */
  for (const id of known) {
    let target = null;
    try { target = new URL(observations.get(id).target.ref).hostname.toLowerCase(); } catch { /* unparseable */ }
    if (target !== host) {
      return invalid("CROSS_HOST_EDGE");
    }
  }

  const withBody = known.filter((id) => bodies.has(id));
  if (withBody.length === 0) {
    return { ...unbound("NO_BODY"), primaryObservation };
  }

  /* Every archived body must be the body its observation recorded. A hash that does not match is a
   * fault about the evidence, never a page merely lacking one. */
  for (const id of withBody) {
    if (sha256(bodies.get(id)) !== observations.get(id).content_sha256) {
      return invalid("BODY_HASH_MISMATCH", withBody);
    }
  }

  /* DISTINCT content, not observation count: two fetches of identical bytes are one candidate. */
  const byContent = new Map();
  for (const id of withBody) {
    const hash = observations.get(id).content_sha256;
    if (!byContent.has(hash)) byContent.set(hash, []);
    byContent.get(hash).push(id);
  }

  /* One SERVED_OBSERVATION per DISTINCT content. Identity is the observation id of the first fetch
   * that produced those bytes; two fetches of identical bytes are one candidate, not two. */
  const served = [...byContent.keys()].map((hash) => subjectRef({
    type: "SERVED_OBSERVATION", tenantId, identityKind: "OBSERVATION_ID",
    identity: byContent.get(hash)[0], locator: `${locator} → content_sha256 ${hash}`,
  }));

  /* 🔴 THE EDGE REACHES THE PAGE. from = what was served, to = the page it was served for. That is
   * what OBSERVATION_OF_PAGE means, and it is what lets bindSubject find the page as the subject. */
  const edges = served.map((c) => evidenceEdge({
    from: c, to: pageSubject, edgeType: "OBSERVATION_OF_PAGE", tenantId,
    method: "page.observations names the observation id; the archived body hashes to the observation's content_sha256",
    artifact: `observations/${batchId}`,
    reason: `the observation's target.ref is this page's canonical URL on ${host}, and its recorded content hash matches the archived body`,
  }));

  /* 🔴 WHERE AMBIGUITY LIVES. One distinct content: the subject is the page, and the single edge
   * binds it. Two differing contents: the competing candidates ARE the observations, both named,
   * and bindSubject returns AMBIGUOUS because it will not choose between them. */
  const bundleCandidates = served.length === 1 ? [pageSubject] : served;
  const binding = bindSubject({ tenantId, candidates: bundleCandidates, edges });
  const reason = binding.state === "BOUND" ? "UNIQUE_EXACT_JOIN"
    : binding.state === "AMBIGUOUS" ? "MULTIPLE_DISTINCT_BODIES"
    : binding.reason;

  return {
    ...base, url, state: binding.state, reason,
    subject: refLabel(pageSubject), pageSubject,
    candidates: bundleCandidates.map(refLabel), bundleCandidates, edges, bodyIds: withBody,
    distinctContents: byContent.size, binding, primaryObservation,
  };
}

/**
 * Hand the bound pages to the shared A–F integration point. 🔴 The bindings are OFFERED, not
 * asserted: runDetectors re-judges every candidate and edge through bindSubject.
 */
export function toBundle(result) {
  const subjectBindings = {};
  const pageSubjects = [];

  for (const p of result.pages) {
    /* 🔴 A PAGE LISTED WITHOUT A BINDING IS BOUND BY THE RUNNER'S OWN FALLBACK.
     *
     * runDetectors, given a page subject it has no supplied binding for, builds a BELONGS_TO_TENANT
     * edge from the fact that the page is in the bundle at all — and binds it. That is correct for a
     * bundle of captured pages the runner assembled itself, and completely wrong here: it would take
     * the 106 pages this adapter judged UNBOUND for having no body and hand them back BOUND, able to
     * carry a page-level finding. So every page offered below carries an EXPLICIT binding, and a page
     * that cannot carry one is not offered as a subject at all. */
    if (!p.url || !p.pageSubject) continue;

    /* An INVALID page is never offered. Its fault is about the evidence, and the runner cannot
     * re-derive a host boundary from V1's vocabulary — offering it with empty edges would let
     * INVALID read as UNBOUND, which is exactly the collapse the binding contract forbids. It stays
     * in `result.pages` with its reason, visible and counted. */
    if (p.state === "INVALID") continue;

    pageSubjects.push(p.url);
    subjectBindings[p.url] = { candidates: p.bundleCandidates, edges: p.edges };
  }

  return { pageSubjects, subjectBindings };
}
