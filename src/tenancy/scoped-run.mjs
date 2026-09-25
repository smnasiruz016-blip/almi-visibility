/**
 * 🔴 F02 · THE SCOPED RUN — an entry point asks, BEFORE it reads any tenant-governed payload, whether every resource it
 * is about to read belongs to the tenant it was asked to run for. One call, at the top, through ./scope.mjs.
 *
 *   node bin/<tool>.mjs --tenant=<declared tenant id> …
 *
 * 🔴 THERE IS NO DEFAULT TENANT. No `--tenant`, or one that is not an ACTIVE declaration, refuses every resource. The
 * request is checked against the declarations; it never ATTACHES anything — which resource belongs to which tenant is
 * answered only by the resolver, from the external declaration source.
 *
 * Every resource an entry point reads is named here, by the declared kind the resolver knows (SITE_ORIGIN,
 * FACT_REGISTRY, SITEMAP_COLLECTION, CRAWL_BATCH) or with `resourceKind: null` where NO kind is declared — an evidence
 * store, a cost ledger, a cache, a capture or research batch, an operator-chosen directory, a product descriptor. A
 * resource with no declared kind is UNDECLARED, and UNDECLARED refuses. That is a finding about the declarations, never
 * about the guard: the remedy is a declaration, never a wider rule.
 *
 * Refusals go to the F08 guard sink: durable (appended) in a governed run, reported and not appended in a read-only
 * diagnostic, exactly as every other guard decision. An ALLOWED decision is a classification and is not appended.
 */
import { createTenantResolver, rootIndexFor } from "./resolver.mjs";
import { decideForTenant, resolveSide, scopeRefusalEvent } from "./scope.mjs";
import { subjectRoots } from "../subject-roots.mjs";
import { declaredSubjectIds, lookupSubject } from "./root-registry.mjs";
import { factRegistryRef } from "./refs.mjs";
import { batchJsonlFiles } from "../crawl/observation-batch.mjs";
import { createJsonlStore } from "../evidence/store.mjs";
import { relative, resolve as resolvePath, sep, isAbsolute } from "node:path";
import { ENGINE } from "../subject-roots.mjs";

export const TENANT_ARG = "tenant";
/** The exit code of a run refused on tenant scope — distinct from a check failure (1) and a usage error (2). */
export const SCOPE_REFUSED_EXIT = 3;

/** `--tenant=<id>` from argv, or null. Never a fallback. */
export function requestedTenant(argv = process.argv) {
  const hit = argv.find((a) => typeof a === "string" && a.startsWith(`--${TENANT_ARG}=`));
  return hit ? hit.slice(TENANT_ARG.length + 3) : null;
}

/* ── THE RESOURCES, NAMED ONCE ─────────────────────────────────────────────────────────────────────────────────── */
export const RESOURCES = Object.freeze({
  siteOrigin: (origin) => ({ label: "site origin", resourceKind: "SITE_ORIGIN", resourceRef: origin, scopeClass: "TENANT" }),
  factRegistry: (ref) => ({ label: "fact registry", resourceKind: ref ? "FACT_REGISTRY" : null, resourceRef: ref?.resourceRef ?? "unresolvable-registry", scopeClass: "TENANT" }),
  /* A container names its MEMBERS' identities (a page's origin, a listed URL's origin), read from stored identity fields
   * only — never a body — so the one decision can see an item that is declared to another tenant (src/tenancy/scope.mjs). */
  crawlBatch: (batchId, { env = process.env } = {}) => ({ label: "observation batch", resourceKind: "CRAWL_BATCH", resourceRef: batchId, scopeClass: "TENANT", store: "OBSERVATIONS", members: memberOrigins(() => batchPageUrls(batchId, env)) }),
  sitemapCollection: (batchId, { env = process.env } = {}) => ({ label: "sitemap collection", resourceKind: "SITEMAP_COLLECTION", resourceRef: batchId, scopeClass: "TENANT", store: "OBSERVATIONS", members: memberOrigins(() => sitemapListedUrls(batchId, env)) }),
  evidenceStore: (name = "evidence-store") => ({ label: "evidence store", resourceKind: "EVIDENCE_STORE", resourceRef: name, scopeClass: "TENANT" }),
  costLedger: (name = "cost-ledger") => ({ label: "cost ledger", resourceKind: "COST_LEDGER", resourceRef: name, scopeClass: "TENANT" }),
  cache: (name) => ({ label: "cache", resourceKind: "CACHE_STORE", resourceRef: name, scopeClass: "TENANT" }),
  captures: (name) => ({ label: "page captures", resourceKind: "CAPTURE_SET", resourceRef: name, scopeClass: "TENANT", store: "CAPTURES" }),
  /**
   * 🔴 F03 · A SUBJECT'S DATA ROOT. Decided BEFORE any of the subject's files is read: it resolves only when the subject is
   * declared in a root registry AND every member it declares resolves, through the F02 attachments, to the requested tenant
   * (src/tenancy/scope.mjs). The descriptor, licences, facts — every file under the root — are read only after this.
   */
  subject: (subjectId) => ({ label: "subject data root", resourceKind: "SUBJECT_ROOT", resourceRef: typeof subjectId === "string" && subjectId !== "" ? subjectId : "\u0000no-subject-named", scopeClass: "TENANT" }),
  /**
   * 🔴 F03 · A CONNECTOR, by the KIND the entry point constructs (named in its own code) for the subject it runs for. Decided
   * BEFORE the connector is constructed: its subject must resolve, it must be the one connector of that kind the subject
   * declares, and everything it declares it reaches must resolve to the same tenant (src/tenancy/scope.mjs).
   */
  connector: (subjectId, connectorKind) => ({ label: `connector ${connectorKind}`, resourceKind: "CONNECTOR", resourceRef: `${typeof subjectId === "string" && subjectId !== "" ? subjectId : "\u0000no-subject-named"}#${connectorKind}`, subjectId: typeof subjectId === "string" && subjectId !== "" ? subjectId : null, connectorKind, scopeClass: "TENANT" }),
  /** 🔴 F03 · a research batch, inside the declared research store. */
  researchBatch: (batchId) => ({ label: "research batch", resourceKind: "RESEARCH_BATCH", resourceRef: batchId, scopeClass: "TENANT", store: "RESEARCH" }),
  /** A named set of run stores an entry point reads (its findings, results, corpora): declared by that name. */
  runArtefacts: (name) => ({ label: "run artefacts", resourceKind: "RUN_STORE", resourceRef: name, scopeClass: "TENANT" }),
  /**
   * A path an operator ASKED the run to read (--corpus, --spec, --store …). 🔴 Its ref is the PATH ITSELF — engine-relative
   * with "/", or absolute — never the flag's name: a declaration of "--corpus" would cover any corpus anyone passed, which
   * is an operator-chosen scope. A declaration must attach this exact path. No path given: nothing is read from it, and
   * the resource is absent (null) — the run is still decided for its requested tenant (src/governance/scoped-entry.mjs).
   */
  inputPath: (path, label) => (typeof path === "string" && path !== "" ? { label: `input path ${label}`, resourceKind: "INPUT_PATH", resourceRef: inputPathRef(path), scopeClass: "TENANT" } : null),
  /**
   * The requested tenant's PARTITION of a shared collection (the observation batch, the sitemap collection): decided for
   * the requested tenant before anything is read; the consumer then reads only members whose own identities resolve to
   * that tenant (src/crawl/batch-partition.mjs readTenantPartition). The whole collection is never read.
   */
  collectionPartition: (collectionKind, collectionRef) => ({ label: `${String(collectionKind).toLowerCase().replace(/_/g, " ")} partition`, resourceKind: "COLLECTION_PARTITION", resourceRef: `${collectionKind}:${collectionRef}`, scopeClass: "TENANT", store: "OBSERVATIONS" }),
  /** A store partitioned BY the declared tenant id: its partition key is the declaration. The requested tenant's own
   * partition (scoped-entry's fallback) lives in no store; F01's declaration store is `declarationStore` below. */
  tenantPartition: (tenantId, name = "requested tenant") => ({ label: `${name} partition`, resourceKind: "TENANT_PARTITION", resourceRef: tenantId, scopeClass: "TENANT" }),
  /** 🔴 F03 · F01's declaration store, partitioned by tenant — inside the declared PROJECT_DECLARATIONS store. */
  declarationStore: (tenantId) => ({ label: "declaration store partition", resourceKind: "TENANT_PARTITION", resourceRef: tenantId, scopeClass: "TENANT", store: "PROJECT_DECLARATIONS" }),
  /**
   * A fact registry located from its directory under the root that holds it (factRegistryRef's rule). A registry in the
   * engine's own FIXTURES root (the neutral declared test products) is named with that root's id as a prefix —
   * "engine-fixtures:<id>/facts" — so it can never be mistaken for an external registry of the same relative path.
   */
  factRegistryAt: (factsDir, { env = process.env } = {}) => {
    const root = typeof factsDir === "string" ? subjectRoots(env).find((r) => factRegistryRef({ factsDir, rootPath: r.path })) : null;
    const ref = root ? factRegistryRef({ factsDir, rootPath: root.path }) : null;
    const resourceRef = ref ? (root.kind === "fixtures" ? `${root.id}:${ref.resourceRef}` : ref.resourceRef) : "registry-outside-every-declared-root";
    return { label: "fact registry", resourceKind: ref ? "FACT_REGISTRY" : null, resourceRef, scopeClass: "TENANT" };
  },
});

/** An INPUT_PATH ref: engine-relative with "/" when inside the engine, else the absolute path with "/". */
export function inputPathRef(p) {
  const abs = resolvePath(p);
  const rel = relative(ENGINE, abs);
  return (rel !== "" && !rel.startsWith("..") && !isAbsolute(rel) ? rel : abs).split(sep).join("/");
}

/** Distinct SITE_ORIGIN members from identity URLs. An unreadable container yields one UNKNOWN-making member, never []. */
function memberOrigins(urlsOf) {
  let urls;
  try { urls = urlsOf(); } catch { return [{ resourceKind: "SITE_ORIGIN", resourceRef: "\u0000container-members-unreadable" }]; }
  const origins = new Set();
  for (const u of urls) { try { origins.add(new URL(u).origin); } catch { /* an unparseable identity is not an origin claim */ } }
  return [...origins].sort().map((o) => ({ resourceKind: "SITE_ORIGIN", resourceRef: o }));
}
const batchPageUrls = (batchId, env) => batchJsonlFiles({ batchId, env }).flatMap((f) => createJsonlStore(f.path ?? f).readAll()).filter((r) => r.record_type === "page").map((r) => r.canonical_url);
const sitemapListedUrls = (batchId, env) => batchJsonlFiles({ batchId, env }).flatMap((f) => createJsonlStore(f.path ?? f).readAll()).flatMap((r) => r.value?.urls ?? []);

/**
 * The hosts a run may touch: the SITE_ORIGIN attachments DECLARED to the tenant it runs for, each decided by the one
 * decision. This replaced a hand-written list of one estate's hostnames (relocated to its subject package, F02 24 Sep
 * 2026): a run's reach is what its tenant's declarations say, never a list in shared code. No tenant, no host.
 */
export function declaredSiteHosts({ tenantId, resolve = createTenantResolver() } = {}) {
  if (typeof tenantId !== "string" || !resolve.declarations?.readable) return [];
  const hosts = new Set();
  for (const a of resolve.declarations.attachments) {
    if (a?.resourceKind !== "SITE_ORIGIN" || typeof a.resourceRef !== "string") continue;
    if (!decideForTenant(resolve, tenantId, RESOURCES.siteOrigin(a.resourceRef)).allowed) continue;
    try { hosts.add(new URL(a.resourceRef).hostname); } catch { /* a malformed origin is no host */ }
  }
  return [...hosts].sort();
}

/**
 * Every declared subject — its data root and each fact registry it DECLARES as a member (for runs that read them all).
 * 🔴 F03: read from the root registries, never by importing each subject's descriptor: importing a descriptor is reading
 * subject data, and it used to happen here BEFORE the decision this list feeds. An unreadable index names nothing, so the
 * run is refused (an unresolvable registry), never run over an empty list.
 */
export async function everySubjectRegistry({ env = process.env } = {}) {
  const index = rootIndexFor(env);
  const out = [];
  for (const id of declaredSubjectIds(index)) {
    out.push(RESOURCES.subject(id));
    for (const m of lookupSubject(index, id).entry?.members ?? []) if (m.resourceKind === "FACT_REGISTRY") out.push(RESOURCES.factRegistry({ resourceRef: m.resourceRef }));
  }
  return out.length ? out : [RESOURCES.factRegistry(null)];
}

/**
 * 🔴 F03 · FOR A READ-ONLY CENSUS THAT MEASURES EVERY TENANT'S POPULATION — never for a run. The subject is decided, by the
 * one decision, for the one tenant its OWN declared members resolve to (resolveSide), exactly as a run for that tenant
 * would be. Nothing is requested on the subject's behalf and nothing is widened: a subject whose members resolve to no
 * single tenant is refused here too. Returns the shape a scoped run returns, for productFromArgv's `scope`.
 */
export function censusSubjectScope(subjectId, { resolve = createTenantResolver() } = {}) {
  const resource = RESOURCES.subject(subjectId);
  const own = resolveSide(resolve, resource);
  return Object.freeze({ decisions: [{ label: resource.label, decision: decideForTenant(resolve, own.state === "RESOLVED" ? own.tenantId : null, resource) }] });
}

/**
 * Decide every resource of a run against the requested tenant. PURE: it records nothing. The refusal EVENTS are returned
 * for the caller's guard sink — which lives in src/governance/scoped-entry.mjs (decideScopedRun, requireScopedRun,
 * scopedEntryPoint), because emitting a guard decision to the audit store is a governed write.
 * @param {{ argv?: string[], resolve?: Function, resources: object[] }} o
 * @returns {{ allowed: boolean, tenantId: string|null, decisions: object[], refused: object[], refusalEvents: object[] }}
 */
export function decideRunResources({ argv = process.argv, resolve = createTenantResolver(), resources }) {
  if (!Array.isArray(resources) || resources.length === 0) throw new TypeError("a scoped run names the resources it will read — an empty list decides nothing");
  const tenantId = requestedTenant(argv);
  const decisions = resources.map((r) => ({ label: r.label, decision: decideForTenant(resolve, tenantId, r) }));
  const refused = decisions.filter((d) => !d.decision.allowed);
  return { allowed: refused.length === 0, tenantId: refused.length ? null : tenantId, decisions, refused, refusalEvents: refused.map((d) => scopeRefusalEvent(d.decision)) };
}
