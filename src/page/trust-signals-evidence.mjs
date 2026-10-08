/**
 * F93 · ONE CLIENT'S TRUST SIGNALS, FROM ITS RECORDED EVIDENCE (acceptance _handoffs 4938f07, RR-214). The rules are pure (./trust-signals.mjs);
 * this module only assembles ONE tenant's records for them, through readers already verified for that tenant:
 *
 *   pages, bodies, fingerprints, bound   F31: the tenant's population (stored bodies), its inventory (each page's fingerprints) and verdict
 *   URLs, links, target status           F31's partition (each page's canonical URL), its stored edges, F23's recorded target observations
 *   organisation identity                the tenant's declaration, only if it names one (none does today) — never inferred from a page
 *   citation verdicts                    none: F46 audits the fact registry, not pages — handed in as [] and reported NOT MEASURED
 *   new pages                            F35's chosen CREATE needs (handed in), each F37's own render (plan: null — F94 C7), read, never changed
 *
 * 🔴 READ-ONLY. The scope handed to F31's reader carries no recorder; nothing is fetched, written or published. Count-only callers.
 */
import { readTenantPartition, readPartitionEdges } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { readDeclarations } from "../tenancy/resolver.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { recordedTargets, canon } from "../audit/link-audit-reader.mjs";
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { renderCompiledDraft, DRAFT } from "./draft-render.mjs";
import { auditTrust, planForDraft } from "./trust-signals.mjs";

/** The default readers — F31's and the declarations' own. A test hands its own (`io`) to see which tenant each read asks for. */
export const READERS = Object.freeze({
  population: ({ tenantId, resolve, env, now }) => readExistingPagePopulation({ scope: { tenantId }, resolve, env, now }),
  partition: ({ tenantId, resolve, env }) => readTenantPartition({ batchId: BATCH_ID, tenantId, resolve, env }),
  edges: ({ observationIds, env }) => readPartitionEdges({ batchId: BATCH_ID, observationIds, env }),
  organisation: ({ tenantId, env }) => {
    const d = readDeclarations({ env });
    const t = (d.tenants ?? []).find((x) => decideResolvedTenants(tenantId, x?.tenantId).allowed);
    return t?.organisation && typeof t.organisation.name === "string" ? { name: t.organisation.name, ref: `declaration:${t.tenantId}:organisation` } : null;
  },
});

export function readClientTrust({ tenantId, chosen = [], resolve, env = process.env, now = new Date(), io = READERS }) {
  const { population, fault } = io.population({ tenantId, resolve, env, now });
  if (!population) return { fault: fault ?? "POPULATION_UNAVAILABLE", audit: null, plans: [] };
  const part = io.partition({ tenantId, resolve, env });
  const urlOf = new Map(), pageOf = new Map();
  for (const r of part.records.filter((x) => x.record_type === "page")) { urlOf.set(r.page_id, r.canonical_url); for (const o of r.observations ?? []) pageOf.set(o, r.page_id); }
  const fps = new Map((population.inventory?.pages ?? []).map((p) => [p.pageId, (p.fingerprints ?? []).map((f) => ({ sha256: f.sha256, observedAt: f.observedAt }))]));
  const pages = population.pages.map((p) => ({ pageId: p.pageId, tenantId: p.tenantId ?? tenantId, url: urlOf.get(p.pageId) ?? null, html: p.html, fingerprints: fps.get(p.pageId) ?? [] }));
  const edges = io.edges({ observationIds: part.observationIds, env }).map((e) => ({ fromPageId: pageOf.get(e.from_observation_id) ?? null, toUrl: e.to })).filter((e) => e.fromPageId);
  const targets = recordedTargets(part.records);
  const recordsOf = (u) => targets.get(canon(u)) ?? [];
  const audit = auditTrust({ tenantId, pages, edges, recordsOf, completeness: population.completeness, citationVerdicts: [] });
  const organisation = io.organisation({ tenantId, env });
  const plans = chosen.filter((d) => d?.spec).map((d) => ({ d, draft: renderCompiledDraft({ spec: d.spec, decision: d.decision, plan: null }) }))
    .filter((x) => x.draft.state === DRAFT.RENDERED)
    .map(({ d, draft }) => ({ ...planForDraft({ draft, organisation, pages, recordsOf, tenantId, completeness: population.completeness }), subject: d.spec.subject }));
  return { fault: null, audit, plans, organisationRecorded: Boolean(organisation) };
}
