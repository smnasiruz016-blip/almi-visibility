/**
 * F94 · ONE CLIENT'S SITE PLANS, FROM ITS RECORDED EVIDENCE (acceptance _handoffs 959ae05, RR-206). The plan itself is pure
 * (./site-plan.mjs); this module only assembles ONE tenant's records for it, through the readers already verified for that tenant:
 *
 *   pages, URLs, edges     F31: the tenant's partition of the crawl batch (src/crawl/batch-partition.mjs) and the links its own
 *                          observations recorded (the stored edge archive, readPartitionEdges); an edge's source page is the page whose
 *                          recorded observation it came from
 *   completeness + bound   F31's verdict (src/page/existing-page-population.mjs)
 *   coverage               F33: judgePage over the tenant's own pages and the registered need values
 *   other recorded URLs    the tenant's sitemap partition (listed) and its edges (linked) — C1's collision check
 *   target status          F23: every recorded observation of a URL (recordedTargets), classed by targetStatus
 *   subjects               F35's decisions, handed in by the caller (readClientActionEvidence): a grouped need it chose to CREATE, a page
 *                          it chose to improve
 *   hub needs              the registered need values and the grouped needs F35 chose
 *
 * 🔴 READ-ONLY. Nothing is fetched, rendered, followed or written: the scope handed to F31's reader carries no recorder, so its completeness
 * decision is computed and NOT recorded; no store is opened for writing. Another tenant's partition is never asked for. Count-only callers.
 */
import { readTenantPartition, readPartitionEdges } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../adapter/sitemap-subject.mjs";
import { canonicalUrl, targetPageId } from "../evidence/ids.mjs";
import { recordedTargets } from "../audit/link-audit-reader.mjs";
import { readExistingPagePopulation, declaredScope } from "./existing-page-population.mjs";
import { judgePage, PAGE_VERDICTS } from "./need-coverage.mjs";
import { DECISION } from "./action-decision.mjs";
import { planSite, planFaults, subjectOf } from "./site-plan.mjs";

const canon = (u) => { try { return canonicalUrl(String(u)); } catch { return null; } };
const listedUrls = (v) => (Array.isArray(v?.urls) ? v.urls : []).map((u) => (typeof u === "string" ? u : u?.loc ?? u?.url)).filter(Boolean);

/** The F35 decisions F94 places: CREATE (forConstruction), the grouped needs' section proposals and the pages it chose to improve. */
/** The registered need value a grouped need's page candidate names (its combination), or null. */
export function needOf(d, values = []) {
  try { return JSON.parse(d?.subject?.pageCandidate ?? "[]").map(([, v]) => v).find((v) => values.includes(v)) ?? null; } catch { return null; }
}

export function placementSubjects({ actionEvidence, values = [] }) {
  const out = [];
  for (const c of actionEvidence?.compiled?.forConstruction ?? []) out.push({ decision: c.decision, slug: c.slug, need: needOf(c.decision, values) });
  for (const c of actionEvidence?.compiled?.sectionProposals ?? []) for (const pageId of new Set((c.decision.actions ?? []).flatMap((a) => a.evidence ?? []))) out.push({ decision: c.decision, pageId, need: needOf(c.decision, values) });
  for (const d of actionEvidence?.pages ?? []) out.push({ decision: d, pageId: d.subject?.pageId });
  return out.filter((s) => subjectOf(s));
}

/** The default readers — F31's own. A test hands its own (`io`) to see exactly which tenant each read asks for. */
export const READERS = Object.freeze({
  partition: ({ batchId, tenantId, resolve, env }) => readTenantPartition({ batchId, tenantId, resolve, env }),
  edges: ({ batchId, observationIds, env }) => readPartitionEdges({ batchId, observationIds, env }),
  population: ({ tenantId, resolve, env, now }) => readExistingPagePopulation({ scope: { tenantId }, resolve, env, now }),
  origins: ({ tenantId, env }) => declaredScope({ tenantId, env }).origins,
});

/** ONE tenant's records, in the shape planSite reads. */
export function readSiteRecords({ tenantId, values = [], resolve, env = process.env, now = new Date(), io = READERS }) {
  const part = io.partition({ batchId: BATCH_ID, tenantId, resolve, env });
  const { population, fault } = io.population({ tenantId, resolve, env, now });
  if (!population) return { fault: fault ?? "POPULATION_UNAVAILABLE" };
  const html = new Map(population.pages.map((p) => [p.pageId, p.html]));
  const pageOfObs = new Map();
  const pages = part.records.filter((r) => r.record_type === "page").map((r) => {
    for (const o of r.observations ?? []) pageOfObs.set(o, r.page_id);
    const page = { pageId: r.page_id, html: html.get(r.page_id) ?? "" };
    return { pageId: r.page_id, tenantId, url: canon(r.canonical_url), covers: values.filter((v) => judgePage(page, v, values).verdict === PAGE_VERDICTS.COVERS) };
  });
  const edges = io.edges({ batchId: BATCH_ID, observationIds: part.observationIds, env })
    .map((e) => ({ fromPageId: pageOfObs.get(e.from_observation_id) ?? null, toUrl: canon(e.to) }))
    .filter((e) => e.fromPageId && e.toUrl)
    .map((e) => ({ ...e, ref: `edge:${e.fromPageId}->${targetPageId(e.toUrl)}` }));
  const sitemap = io.partition({ batchId: SITEMAP_BATCH_ID, tenantId, resolve, env });
  const recordedUrls = [...new Set([...sitemap.records.filter((r) => r.record_type === "observation").flatMap((o) => listedUrls(o.value)), ...edges.map((e) => e.toUrl)].map(canon).filter(Boolean))];
  const targets = recordedTargets(part.records);
  return { fault: null, pages, edges, recordedUrls, recordsOf: (u) => targets.get(canon(u)) ?? [], completeness: population.completeness, origins: io.origins({ tenantId, env }) };
}

/** Every placement subject's plan for ONE tenant; a plan with any fault is refused, never handed on. Count-only callers. */
export function readClientSitePlans({ tenantId, actionEvidence, values = [], hubNeeds = null, resolve, env = process.env, now = new Date(), io = READERS }) {
  const rec = readSiteRecords({ tenantId, values, resolve, env, now, io });
  if (rec.fault) return { fault: rec.fault, plans: [], refused: [] };
  const needs = hubNeeds ?? [
    ...values.map((v) => ({ kind: "REGISTERED_NEED_VALUE", need: v, ref: `registered-need:${v}` })),
    ...(actionEvidence?.groupedNeeds ?? []).filter((d) => d.decision === DECISION.CHOSEN).map((d) => ({ kind: "F35_CHOSEN_GROUPED_NEED", need: needOf(d, values), ref: `F35:${d.subject.needId}` })),
  ];
  const plans = [], refused = [];
  for (const subject of placementSubjects({ actionEvidence, values })) {
    const plan = planSite({ tenantId, subject, pages: rec.pages, recordedUrls: rec.recordedUrls, edges: rec.edges, recordsOf: rec.recordsOf, completeness: rec.completeness, hubNeeds: needs, origins: rec.origins });
    const faults = planFaults(plan, { tenantId, pages: rec.pages, recordedUrls: rec.recordedUrls, origins: rec.origins, recordsOf: rec.recordsOf, hubNeeds: needs });
    (faults.length || !plan.planned ? refused : plans).push(faults.length ? { plan, faults } : plan);
  }
  return { fault: null, plans, refused, summary: summarisePlans(plans, refused), records: { pages: rec.pages.length, edges: rec.edges.length, recordedUrls: rec.recordedUrls.length, completeness: rec.completeness?.state ?? "UNKNOWN" } };
}

/** [ALL] · the counts a run reports, taken ONLY from the plans it produced; a refused plan is counted as refused, never as a plan. */
export function summarisePlans(plans, refused) {
  const tally = (f) => plans.reduce((m, p) => ((m[f(p)] = (m[f(p)] ?? 0) + 1), m), {});
  return Object.freeze({
    plans: plans.length,
    refused: refused.length,
    url: tally((p) => p.url.state),
    cluster: tally((p) => p.cluster.state),
    linksIn: plans.reduce((n, p) => n + p.linksIn.length, 0),
    linksOut: plans.reduce((n, p) => n + p.linksOut.length, 0),
    notPlanned: plans.reduce((n, p) => n + p.notPlanned.length, 0),
    missingSteps: plans.reduce((n, p) => n + (p.breadcrumb.missingSteps?.length ?? 0), 0),
    complete: plans.filter((p) => p.complete).length,
  });
}
