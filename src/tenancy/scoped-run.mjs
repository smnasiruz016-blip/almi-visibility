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
import { diagnosticGuardSink } from "../governance/guard-audit.mjs";
import { governedGuardSink } from "../governance/governed-run.mjs";
import { isoSeconds } from "../audit-trail/store.mjs";
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
 * Decide every resource of a run against the requested tenant, emit each refusal to the sink, and report.
 * @param {{ argv?: string[], resolve?: Function, resources: object[], sink: {emit: Function}, log?: Function }} o
 * @returns {{ allowed: boolean, tenantId: string|null, decisions: object[], refused: object[] }}
 */
export function decideScopedRun({ argv = process.argv, resolve = createTenantResolver(), resources, sink, log = console.error }) {
  if (!sink || typeof sink.emit !== "function") throw new TypeError("a scoped run records its refusals — it needs a guard sink");
  if (!Array.isArray(resources) || resources.length === 0) throw new TypeError("a scoped run names the resources it will read — an empty list decides nothing");
  const tenantId = requestedTenant(argv);
  const decisions = resources.map((r) => ({ label: r.label, decision: decideForTenant(resolve, tenantId, r) }));
  const refused = decisions.filter((d) => !d.decision.allowed);
  for (const d of refused) sink.emit(scopeRefusalEvent(d.decision));
  if (refused.length) {
    log(`🔴 TENANT SCOPE REFUSED — ${refused.length} of ${decisions.length} resource(s) do not belong to the requested tenant; nothing was read`);
    for (const d of refused) log(`   ${d.label.padEnd(26)} ${d.decision.outcome} (${d.decision.reason}) · ref ${d.decision.target.resourceRefDigest}`);
  }
  return { allowed: refused.length === 0, tenantId: refused.length ? null : tenantId, decisions, refused };
}

/** For an entry point: decide, and end the process with SCOPE_REFUSED_EXIT on any refusal. Returns the run on success. */
export function requireScopedRun(o) {
  const run = decideScopedRun(o);
  if (!run.allowed) process.exit(SCOPE_REFUSED_EXIT);
  return run;
}

/**
 * The one line an entry point adds, FIRST, before it reads anything tenant-governed:
 *
 *   const SCOPE = scopedEntryPoint({ entry: "bin/x.mjs", governed: true, repoUrl: import.meta.url, resources: [RESOURCES.…] });
 *
 * `governed` entry points record refusals durably (F08's governed guard sink — confined in a verified test context);
 * read-only diagnostics report them and append nothing. On success it returns `writeScope`: the scope every governed
 * write of this run must carry, so a run's OUTPUT belongs to the tenant its inputs did.
 */
export function scopedEntryPoint({ entry, governed, repoUrl, resources, argv = process.argv, env = process.env, resolve = createTenantResolver({ env }) }) {
  const sink = governed ? governedSinkFor({ entry, repoUrl, env }) : diagnosticGuardSink({ actor: entry });
  const run = requireScopedRun({ argv, resolve, resources, sink });
  return { ...run, writeScope: Object.freeze({ scopeType: "TENANT", tenantId: run.tenantId }) };
}

function governedSinkFor({ entry, repoUrl, env }) {
  const repo = new URL("../", repoUrl).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const now = isoSeconds(Date.now()).slice(0, 10);
  return governedGuardSink({ repo, env, correlationId: `run:${entry}:tenant-scope:${isoSeconds(Date.now())}`, now, actor: entry });
}
