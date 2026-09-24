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
  crawlBatch: (batchId) => ({ label: "observation batch", resourceKind: "CRAWL_BATCH", resourceRef: batchId, scopeClass: "TENANT" }),
  sitemapCollection: (batchId) => ({ label: "sitemap collection", resourceKind: "SITEMAP_COLLECTION", resourceRef: batchId, scopeClass: "TENANT" }),
  evidenceStore: (name = "runs/evidence") => ({ label: "evidence store", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  costLedger: (name = "runs/cost") => ({ label: "cost ledger", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  cache: (name) => ({ label: "cache", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  captures: (name = "captures") => ({ label: "page captures", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  research: (name = "research") => ({ label: "research batch", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  operatorDirectory: (name = "operator-chosen directory") => ({ label: "operator-chosen directory", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  productDescriptor: (name) => ({ label: "product descriptor", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
  runArtefacts: (name = "runs") => ({ label: "run artefacts", resourceKind: null, resourceRef: name, scopeClass: "TENANT" }),
});

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
