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
import { createTenantResolver } from "./resolver.mjs";
import { decideForTenant, scopeRefusalEvent } from "./scope.mjs";
import { subjectRoots, availableSubjects, importSubjectModule } from "../subject-roots.mjs";
import { factRegistryRef } from "./refs.mjs";
import { batchJsonlFiles } from "../crawl/observation-batch.mjs";
import { createJsonlStore } from "../evidence/store.mjs";

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
  crawlBatch: (batchId, { env = process.env } = {}) => ({ label: "observation batch", resourceKind: "CRAWL_BATCH", resourceRef: batchId, scopeClass: "TENANT", members: memberOrigins(() => batchPageUrls(batchId, env)) }),
  sitemapCollection: (batchId, { env = process.env } = {}) => ({ label: "sitemap collection", resourceKind: "SITEMAP_COLLECTION", resourceRef: batchId, scopeClass: "TENANT", members: memberOrigins(() => sitemapListedUrls(batchId, env)) }),
  evidenceStore: (name = "evidence-store") => ({ label: "evidence store", resourceKind: "EVIDENCE_STORE", resourceRef: name, scopeClass: "TENANT" }),
  costLedger: (name = "cost-ledger") => ({ label: "cost ledger", resourceKind: "COST_LEDGER", resourceRef: name, scopeClass: "TENANT" }),
  cache: (name) => ({ label: "cache", resourceKind: "CACHE_STORE", resourceRef: name, scopeClass: "TENANT" }),
  captures: (name = "page-capture-set") => ({ label: "page captures", resourceKind: "CAPTURE_SET", resourceRef: name, scopeClass: "TENANT" }),
  research: (name = "research-batch-set") => ({ label: "research batch", resourceKind: "RESEARCH_BATCH", resourceRef: name, scopeClass: "TENANT" }),
  operatorDirectory: (name = "operator-chosen directory") => ({ label: "operator-chosen directory", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  productDescriptor: (name) => ({ label: "product descriptor", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  runArtefacts: (name = "run-artefact-set") => ({ label: "run artefacts", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  /** A store partitioned BY the declared tenant id (F01's declaration store): its partition key is the declaration. */
  tenantPartition: (tenantId, name = "declaration store") => ({ label: `${name} partition`, resourceKind: "TENANT_PARTITION", resourceRef: tenantId, scopeClass: "TENANT" }),
  /** A fact registry located from its directory under the external root that holds it (factRegistryRef's rule). */
  factRegistryAt: (factsDir, { env = process.env } = {}) => {
    const root = typeof factsDir === "string" ? subjectRoots(env).filter((r) => r.kind === "external").find((r) => factsDir.startsWith(r.path)) : null;
    const ref = root ? factRegistryRef({ factsDir, rootPath: root.path }) : null;
    return { label: "fact registry", resourceKind: ref ? "FACT_REGISTRY" : null, resourceRef: ref?.resourceRef ?? "registry-outside-every-declared-root", scopeClass: "TENANT" };
  },
});

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

/** Every declared subject's fact registry, each located by its descriptor's factsDir (for runs that read them all). */
export async function everySubjectRegistry({ env = process.env } = {}) {
  const out = [];
  const roots = subjectRoots(env);
  for (const id of availableSubjects({ roots })) {
    let factsDir = null;
    try { factsDir = (await importSubjectModule(id, "product.mjs", { roots }))?.PRODUCT?.factsDir ?? null; } catch { factsDir = null; }
    out.push(RESOURCES.factRegistryAt(factsDir, { env }));
  }
  return out.length ? out : [RESOURCES.factRegistry(null)];
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
