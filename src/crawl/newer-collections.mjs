/**
 * F31 · C9 · NEWER DECLARED COLLECTIONS — what a client's tenant holds beside the fixed 2026-09-12 batches (Acceptance Amendment 1,
 * _handoffs 7805047, RR-223).
 *
 *   WHICH      every RESEARCH_BATCH attached to the client's tenant (F02) AND named as a member of a subject that resolves to that same
 *              tenant (F03). A batch attached to another tenant, attached to none, or named by no subject of this tenant is never read.
 *   WHAT       from the batch's own directory in the declared RESEARCH store: its crawl records (crawl.jsonl: observations, link records,
 *              run records), its sitemap listings (sitemaps.jsonl) and its stored bodies (bodies.jsonl — the batch's declared body store).
 *              Records are partitioned to the tenant by their own identities, exactly as the fixed batch is; a body is read only for an
 *              observation of that partition. No other file, and no local or undeclared corpus, is ever read for a body.
 *   NEWEST     per URL the newest recorded observation is the one the verdict uses; every older one stays in the page's evidence. Per
 *              origin the newest sitemap listing is used. Links are those recorded FROM the observations used. The as-of time is
 *              therefore the earliest observation the verdict uses (scopeCompleteness takes the minimum over what it is handed).
 *   CUT SHORT  a newer crawl run whose own record says it was not COMPLETE (a cap, a robots gap, an error) is counted, and keeps the
 *              verdict INCOMPLETE; a capped or partial sitemap listing does so through C6 as before.
 *
 * Reads files; fetches nothing (C8). Names no product, tenant, host or batch.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rootIndexFor, readDeclarations } from "../tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../tenancy/root-registry.mjs";
import { decideResolvedTenants, resolveSide } from "../tenancy/scope.mjs";
import { RESOURCES } from "../tenancy/scoped-run.mjs";
import { partitionRecords } from "./batch-partition.mjs";
import { decideResearchBatch } from "../tenancy/research-batch-decision.mjs";
import { canonicalUrl, targetPageId } from "../evidence/ids.mjs";

export const NEWER_FILES = Object.freeze({ CRAWL: "crawl.jsonl", SITEMAPS: "sitemaps.jsonl", BODIES: "bodies.jsonl" });
const BATCH_ID = /^[a-z0-9][a-z0-9-]*$/;
const canon = (u) => { try { return canonicalUrl(String(u)); } catch { return null; } };
const originOf = (u) => { const c = canon(u); return c ? new URL(c).origin : null; };
const urlOfObservation = (o) => o?.target?.ref ?? o?.value?.requested_url ?? o?.value?.final_url ?? null;
const jsonl = (path) => (existsSync(path) ? readFileSync(path, "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l)) : []);

/**
 * F02 Amendment 2's decision for every research batch THIS tenant's own declarations name — attached to it, or named by one of its
 * subjects (src/tenancy/research-batch-decision.mjs). Another tenant's batch is never located.
 */
export function newerBatchDecisions({ tenantId, resolve, env = process.env }) {
  const d = readDeclarations({ env });
  if (!d.readable) return [];
  const attached = new Set(d.attachments.filter((a) => a?.resourceKind === "RESEARCH_BATCH" && decideResolvedTenants(tenantId, a.tenantId).allowed).map((a) => a.resourceRef));
  const mineAttached = (m) => d.attachments.some((a) => a?.resourceKind === m?.resourceKind && a?.resourceRef === m?.resourceRef && decideResolvedTenants(tenantId, a.tenantId).allowed);
  const index = rootIndexFor(env);
  /* named: batches of subjects that RESOLVE to this tenant (membership); located: also the batches of any subject one of whose members
   * is attached to this tenant — so a batch such a subject names but that is attached elsewhere, or nowhere, is decided and refused */
  const named = new Set(), located = new Set();
  for (const subjectId of index.subjects instanceof Map ? index.subjects.keys() : []) {
    const l = lookupSubject(index, subjectId);
    if (l.state !== "DECLARED") continue;
    const members = l.entry?.members ?? [];
    const batches = members.filter((m) => m?.resourceKind === "RESEARCH_BATCH").map((m) => m.resourceRef);
    if (!batches.length) continue;
    if (members.some(mineAttached)) for (const b of batches) located.add(b);
    const side = resolveSide(resolve, RESOURCES.subject(subjectId));
    if (!decideResolvedTenants(tenantId, side?.tenantId).allowed) continue;
    for (const b of batches) named.add(b);
  }
  return [...new Set([...attached, ...located, ...named])].filter((b) => BATCH_ID.test(b)).sort().map((batchId) => decideResearchBatch({ resolve, tenantId, batchId, named }));
}

/** The RESEARCH_BATCH ids this tenant may read: those F02 decided ALLOWED (attached to it AND a member of a subject that resolves to it). */
export function declaredNewerBatches({ tenantId, resolve, env = process.env }) {
  return newerBatchDecisions({ tenantId, resolve, env }).filter((x) => x.allowed).map((x) => x.batchId);
}

/**
 * Each declared newer batch's own records, partitioned to the tenant, with the bodies its declared store holds for them. Every F02
 * decision — the allowed and the refused — is handed to `record` (the run's scope record) before any batch is read; only ALLOWED batches
 * are read. `batches`, when given, are read as already decided (tests of the merge only).
 */
export function readNewerCollections({ tenantId, resolve, env = process.env, record = null, batches = undefined }) {
  if (batches === undefined) {
    const decisions = newerBatchDecisions({ tenantId, resolve, env });
    for (const x of decisions) record?.(x.event);
    batches = decisions.filter((x) => x.allowed).map((x) => x.batchId);
  }
  const store = lookupStore(rootIndexFor(env), "RESEARCH");
  if (store.state !== "DECLARED") return [];
  const out = [];
  for (const batchId of batches) {
    const dir = join(store.dir, batchId);
    const crawl = jsonl(join(dir, NEWER_FILES.CRAWL));
    const sitemapRecs = jsonl(join(dir, NEWER_FILES.SITEMAPS));
    if (!crawl.length && !sitemapRecs.length) continue;
    const mine = partitionRecords({ records: [...crawl, ...sitemapRecs], fileName: `${batchId}/records`, tenantId, resolve });
    const ids = new Set(mine.records.filter((r) => r.record_type === "observation").map((r) => r.observation_id));
    const bodies = new Map();
    for (const b of jsonl(join(dir, NEWER_FILES.BODIES))) if (ids.has(b?.observation_id) && typeof b.body === "string") bodies.set(b.observation_id, b.body);
    const fromSitemaps = new Set(sitemapRecs);
    out.push(Object.freeze({
      batchId,
      observations: mine.records.filter((r) => r.record_type === "observation" && !fromSitemaps.has(r)),
      sitemaps: mine.records.filter((r) => r.record_type === "observation" && fromSitemaps.has(r)),
      links: mine.records.filter((r) => r.record_type === "page_links"),
      runs: crawl.filter((r) => r.record_type === "crawl_run"),
      bodies,
    }));
  }
  return out;
}

/**
 * Pure: the fixed batch's partition merged with the newer collections — the observations, sitemap listings and links the verdict uses
 * (newest per URL, newest listing per origin, links from the used observations), every observation kept in the page records' evidence,
 * and the newer crawl runs that were cut short.
 *
 * @param fixed  { batchId, records, bodies: Map, sitemaps: observation[], edges: {from_observation_id, to}[] }
 * @param newer  readNewerCollections' output
 */
export function mergeCollections({ fixed, newer = [] }) {
  const allObs = [...fixed.records.filter((r) => r.record_type === "observation").map((o) => ({ o, batchId: fixed.batchId })),
    ...newer.flatMap((n) => n.observations.map((o) => ({ o, batchId: n.batchId })))];
  const newest = new Map();
  for (const x of allObs) {
    const key = canon(urlOfObservation(x.o)) ?? `\u0000${x.o.observation_id}`;
    const cur = newest.get(key);
    if (!cur || String(x.o.observed_at).localeCompare(String(cur.o.observed_at)) > 0) newest.set(key, x);
  }
  const used = [...newest.values()];
  const usedIds = new Set(used.map((x) => x.o.observation_id));

  const allMaps = [...fixed.sitemaps, ...newer.flatMap((n) => n.sitemaps)];
  const mapByOrigin = new Map();
  for (const s of allMaps) {
    const key = originOf(s.value?.origin ?? s.value?.rootUrl ?? s.target?.ref ?? s.target) ?? `\u0000${s.observation_id}`;
    const cur = mapByOrigin.get(key);
    if (!cur || String(s.observed_at).localeCompare(String(cur.observed_at)) > 0) mapByOrigin.set(key, s);
  }

  const newerEdges = newer.flatMap((n) => n.links.flatMap((l) => (Array.isArray(l.value?.links) ? l.value.links : []).map((x) => ({ from_observation_id: l.source_observation_id, to: x?.to }))))
    .filter((e) => typeof e.to === "string");
  const edges = [...fixed.edges, ...newerEdges].filter((e) => usedIds.has(e.from_observation_id));

  /* page records: the fixed batch's own, each newer observation added to the page its URL derives (C1), a new page where none exists */
  const pages = new Map(fixed.records.filter((r) => r.record_type === "page").map((p) => [p.page_id, { ...p, observations: [...(p.observations ?? [])] }]));
  for (const n of newer) for (const o of n.observations) {
    const c = canon(urlOfObservation(o));
    if (!c) continue;
    const id = targetPageId(c);
    if (!pages.has(id)) pages.set(id, { record_type: "page", page_id: id, canonical_url: c, observations: [] });
    pages.get(id).observations.push(o.observation_id);
  }
  const records = [...fixed.records.filter((r) => r.record_type !== "page"), ...newer.flatMap((n) => n.observations), ...pages.values()];
  const bodies = new Map([...fixed.bodies, ...newer.flatMap((n) => [...n.bodies])]);
  const batchOf = new Map(allObs.map((x) => [x.o.observation_id, x.batchId]));
  const crawlRunsCutShort = newer.reduce((k, n) => k + n.runs.filter((r) => r.coverageState !== "COMPLETE").length, 0);
  return Object.freeze({
    observations: Object.freeze(used.map((x) => x.o)),
    sitemaps: Object.freeze([...mapByOrigin.values()]),
    edges: Object.freeze(edges),
    records: Object.freeze(records),
    bodies,
    batchOf,
    crawlRunsCutShort,
    newerBatches: Object.freeze(newer.map((n) => n.batchId)),
  });
}
