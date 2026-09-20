/**
 * 🔴 REAL OBSERVED PAGES AS LAWFUL SUBJECTS — the external observation batch reaching Subject Binding V1.
 *
 * Until now the only real subject the engine had met was a FACT record cited by a page spec inside one
 * product's own registry: 28 of 28 BOUND on an exact id match in a single file, which proved very
 * little. This adapter binds the thing the sealed run actually failed at — a real page, on a real
 * host, to the bytes that were really served for it.
 *
 * ── THE TENANT OF AN UNASSIGNED PAGE ───────────────────────────────────────
 *
 * The batch's manifest says `classificationState: "UNASSIGNED"`, and the move that created it
 * recorded "No product owns these records here." So the tenant cannot be a product without
 * asserting the one thing the material explicitly denies.
 *
 * It does not have to be. A tenant in this contract is an ISOLATION SCOPE, not an owner:
 * subject.mjs requires one because "a subject with no tenant cannot be isolated", and binding.mjs
 * says "Generic engine code is shared freely; a tenant's own subjects and edges never are." The
 * batch is exactly such a scope — a stable identity the capture already assigned, recorded
 * mechanically in the manifest as `batchId`, naming no product.
 *
 * 🔴 AND IT IS SELF-ENFORCING. With the batch as tenant, any edge from one of these pages to a
 * product's subject is INVALID_CROSS_TENANT. "Do not assign product ownership" stops being a promise
 * this module makes and becomes something the binding contract refuses to let it break.
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
});

/**
 * The tenant: the batch's own identity. 🔴 No default — a manifest without a batch identity, or one
 * that has been assigned to a product, is not something this adapter may guess its way past.
 */
export function batchTenantId(manifest) {
  const id = manifest?.batchId;
  if (typeof id !== "string" || id.trim() === "") {
    throw new TypeError("batchTenantId: the manifest carries no batchId — an observation batch with no identity cannot be a tenant, and an absent tenant never means \"the usual one\"");
  }
  if (manifest.classificationState !== "UNASSIGNED") {
    throw new TypeError(`batchTenantId: this batch is ${JSON.stringify(manifest.classificationState)}, not UNASSIGNED — an assigned batch has an owner, and this adapter must not overwrite one`);
  }
  return `observation-batch:${id}`;
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
export function observedPageSubjects({ batchId = BATCH_ID, env = process.env } = {}) {
  const manifest = readBatchManifest({ batchId, env });
  const tenantId = batchTenantId(manifest);
  const locator = `observations/${manifest.batchId}/first-real-crawl-2026-09-12.jsonl`;

  const rows = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl", { batchId, env })).readAll();
  const bodies = readBodyArchive(batchFile("bodies-2026-09-12.jsonl.br", { batchId, env }));
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

  const pages = pageRecords.map((p) => judgeObservedPage({ page: p, tenantId, locator, batchId: manifest.batchId, observations, bodies, idsByUrl }));

  const counts = { BOUND: 0, AMBIGUOUS: 0, UNBOUND: 0, INVALID: 0 };
  const reasons = {};
  for (const r of pages) {
    counts[r.state] += 1;
    reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  }

  return { tenantId, batchId: manifest.batchId, classificationState: manifest.classificationState, pages, counts, reasons, population: pageRecords.length };
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
    return unbound("NO_BODY");
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
    distinctContents: byContent.size, binding,
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
