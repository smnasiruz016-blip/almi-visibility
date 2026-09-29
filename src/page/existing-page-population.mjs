/**
 * F34 · THE SAME TENANT'S EXISTING-PAGE POPULATION, FOR THE EXISTING-PAGE CHECK (src/page/existing-page-first.mjs).
 *
 * Read ONLY through the tenant partition of the stored observation batch (src/crawl/batch-partition.mjs): the run's DECIDED
 * tenant, its own page records and only its own bodies. Another tenant's page is never parsed into a record here, so it can
 * never decide — or be named by — this tenant's outcome.
 *
 * 🔴 A POPULATION THAT CANNOT BE READ IS NOT AN EMPTY ONE. An unavailable, ambiguous or invalid batch returns `population: null`
 * with its fault, which the check turns into REFUSED; any other error is a defect and is thrown, never swallowed into "no pages".
 *
 * COVERAGE is the batch's own recorded statement about how much of the site it holds — the crawl run's `coverageState`, with any
 * recorded `crawl_run_correction` of that field applied (a correction is how a recorded COMPLETE became PARTIAL, and the old
 * value must not win). A run this partition cannot see leaves coverage UNKNOWN; more than one run keeps the weakest.
 *
 * A CRAWLED INVENTORY IS NOT THE SITE (src/crawl/inventory.mjs). That is why PARTIAL and UNKNOWN matter here: an empty partial
 * population says nothing about pages the crawl never reached, and the check will not produce a page on its silence.
 */
import { readTenantPartition, readPartitionBodies, readPartitionEdges } from "../crawl/batch-partition.mjs";
import { BATCH_ID, ObservationBatchFault } from "../crawl/observation-batch.mjs";
import { createTenantResolver, readDeclarations } from "../tenancy/resolver.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { SITEMAP_BATCH_ID } from "../adapter/sitemap-subject.mjs";
import { scopeCompleteness, coverageForConsumers } from "../crawl/scope-completeness.mjs";
import { scopeInventory } from "../crawl/scope-inventory.mjs";
import { rightToExist, mayProduceCandidate } from "./right-to-exist.mjs";
import { existingPageFirst, existingPageDecisionEvent } from "./existing-page-first.mjs";

const WEAKEST = ["UNKNOWN", "PARTIAL", "COMPLETE"];

/**
 * Pure: the population from a partition's records and bodies. Exported so the tests drive it with crafted records.
 * 🔴 F31 (RR-85): when the scope's completeness verdict is handed in, it — and only it — decides the coverage F33 and F34 read:
 * COMPLETE only for a fresh COMPLETE verdict. The run-record derivation below remains for callers that have no verdict.
 */
export function populationFromPartition({ tenantId, records, bodies, completeness = null, inventory = null }) {
  const observations = new Map(records.filter((r) => r.record_type === "observation").map((o) => [o.observation_id, o]));
  const corrections = records.filter((r) => r.record_type === "crawl_run_correction" && r.field === "coverageState");
  const runs = records.filter((r) => r.record_type === "crawl_run").map((run) => {
    const c = corrections.filter((k) => k.corrects_run_id === run.run_id).sort((a, b) => String(a.corrected_at).localeCompare(String(b.corrected_at))).at(-1);
    return c ? c.corrected_value : run.coverageState;
  });
  const coverageState = runs.length === 0 ? "UNKNOWN" : runs.reduce((w, s) => (WEAKEST.indexOf(s) < WEAKEST.indexOf(w) ? s : w), "COMPLETE");

  const pages = records.filter((r) => r.record_type === "page").map((p) => {
    const served = (p.observations ?? []).map((id) => observations.get(id)).filter((o) => o && bodies.has(o.observation_id))
      .sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at)));
    const latest = served.at(-1);
    return { pageId: p.page_id, tenantId, html: latest ? bodies.get(latest.observation_id) : "" };
  });
  const derived = WEAKEST.includes(coverageState) ? coverageState : "UNKNOWN";
  return Object.freeze({ tenantId, coverageState: completeness ? coverageForConsumers(completeness) : derived, pages, completeness, inventory });
}

/** The site origins declared to this tenant, and the tenant's declared inventory freshness rule (or null) — declarations only. */
export function declaredScope({ tenantId, env = process.env }) {
  const d = readDeclarations({ env });
  if (!d.readable) return { readable: false, origins: [], freshnessRule: null, reason: d.reason };
  const mine = (t) => decideResolvedTenants(tenantId, t).allowed;
  const origins = d.attachments.filter((a) => a?.resourceKind === "SITE_ORIGIN" && mine(a.tenantId)).map((a) => a.resourceRef);
  const rule = d.tenants.find((t) => mine(t?.tenantId))?.existingPageInventory ?? null;
  return { readable: true, origins, freshnessRule: rule && Number.isFinite(Number(rule.freshnessDays)) ? { freshnessDays: Number(rule.freshnessDays) } : null, reason: null };
}

/** F31's one recorded decision per read: the completeness verdict and its basis, counts and codes only. */
export function completenessEvent(v) {
  const c = v.basis.counts;
  return {
    eventType: "EVALUATION",
    action: "DECIDE_EXISTING_PAGE_INVENTORY_COMPLETENESS",
    outcome: v.state === "COMPLETE" ? "PASS" : v.state === "INCOMPLETE" || v.state === "STALE" ? "FAIL" : "INDETERMINATE",
    reasonCode: v.basis.reasons[0],
    metadata: {
      guard: "existing-page-inventory",
      classification: `state=${v.state} method=${v.basis.method} origins=${c.origins} obs=${c.observations} listed=${c.listedTotal} listedUnobserved=${c.listedUnobserved} linkedUnobserved=${c.linkedUnobserved} cutShort=${c.sitemapCutShort} asOf=${v.basis.asOf ?? "none"} freshDays=${v.basis.freshnessRule?.freshnessDays ?? "none"}`.slice(0, 200),
      ruleEntry: "F31: a completeness claim carries its method, scope, as-of time and freshness rule",
      role: "EXISTING_PAGE_INVENTORY>COMPLETENESS",
      resourceRef: `reasons:${v.basis.reasons.join(",")}`.slice(0, 200),
    },
  };
}

/**
 * The decided tenant's existing pages from the stored batch. `scope` is the run's scoped entry (its `tenantId` and
 * `recordPartition`); the partition's quarantine is recorded through it, exactly as bin/detect.mjs records it.
 */
export function readExistingPagePopulation({ scope, batchId = BATCH_ID, sitemapBatchId = SITEMAP_BATCH_ID, env = process.env, resolve, now = new Date() }) {
  try {
    const part = readTenantPartition({ batchId, tenantId: scope.tenantId, resolve, env });
    scope.recordPartition?.(part.partition, { collectionKind: "CRAWL_BATCH", collectionRef: batchId });
    const bodies = readPartitionBodies({ batchId, observationIds: part.observationIds, env });
    /* 🔴 F31 (RR-85) — the scope's completeness, from ITS OWN recorded sources: its sitemap partition, the links its observations
     * recorded, and its declarations. Nothing another tenant owns is parsed. */
    const sitemapPart = readTenantPartition({ batchId: sitemapBatchId, tenantId: scope.tenantId, resolve, env });
    scope.recordPartition?.(sitemapPart.partition, { collectionKind: "SITEMAP_COLLECTION", collectionRef: sitemapBatchId });
    const edges = readPartitionEdges({ batchId, observationIds: part.observationIds, env });
    const declared = declaredScope({ tenantId: scope.tenantId, env });
    const completeness = scopeCompleteness({
      origins: declared.origins,
      observations: part.records.filter((r) => r.record_type === "observation"),
      sitemaps: sitemapPart.records.filter((r) => r.record_type === "observation"),
      edges,
      freshnessRule: declared.freshnessRule,
      now,
    });
    const inventory = scopeInventory({ tenantId: scope.tenantId, batchId, records: part.records, bodies, unplaced: { undeclared: part.partition.arithmetic.undeclared, ambiguous: part.partition.arithmetic.ambiguous } });
    scope.recordDecision?.(completenessEvent(completeness));
    return { population: populationFromPartition({ tenantId: scope.tenantId, records: part.records, bodies, completeness, inventory }), fault: null, population_of: part.partition.arithmetic.population };
  } catch (e) {
    if (e instanceof ObservationBatchFault) return { population: null, fault: e.fault, population_of: null };
    throw e;
  }
}

/**
 * 🔴 THE ONE CALL A PAGE-PRODUCING ENTRY POINT MAKES BEFORE IT WRITES A CANDIDATE PAGE (F34 C1, C5, C6).
 *
 * Reads this run's tenant population once, decides for the candidate, records the decision through the run's own guard sink when
 * it stops production, prints one count-only line, and returns the decision. The caller writes the page ONLY when
 * `decision.mayProduce` is true — the entry points that render a candidate outside constructCandidates route through here.
 */
/**
 * 🔴 F36 (RR-87) — THE ONE GATE A PAGE-PRODUCING TOOL CALLS: F34's existing-page check, then F36's right-to-exist outcome over it.
 * The candidate may be produced only when BOTH let it — `mayProduce` is the conjunction, and `rightToExist` carries the outcome.
 */
export function rightToExistGate({ scope, entry, candidate, spec, siblings = [], variants = [], env = process.env, gate = existingPageGate }) {
  /* `gate` is the existing-page check (F34), a DECLARED dependency so a test can hand it a decision that lets the page through. */
  const decision = gate({ scope, entry, candidate, env });
  const rte = rightToExist({ slug: candidate?.slug, spec, siblings, variants, existingPageDecision: decision });
  console.log(`right-to-exist        ${rte.outcome}${rte.failed.length ? ` — failed: ${rte.failed.join(", ")}` : ""}${rte.undecided.length ? ` — undecided: ${rte.undecided.join(", ")}` : ""} · NOT MEASURED: whether the need is real and the value distinct in substance`);
  return Object.freeze({ ...decision, mayProduce: mayProduceCandidate(decision, rte), rightToExist: rte });
}

const loaded = new WeakMap();
export function existingPageGate({ scope, entry, candidate, env = process.env }) {
  if (!loaded.has(scope)) loaded.set(scope, readExistingPagePopulation({ scope, env, resolve: createTenantResolver({ env }) }));
  const { population, fault } = loaded.get(scope);
  const decision = existingPageFirst({ candidate, tenantId: scope.tenantId, population });
  const ev = existingPageDecisionEvent(decision, { entry });
  if (ev) scope.recordDecision(ev);
  console.log(`existing-page first  ${decision.outcome} — ${population ? `${decision.considered} existing page(s) of this tenant, ${decision.matched} naming this intent, coverage ${decision.coverageState}` : `population UNAVAILABLE (${fault})`}${decision.mayProduce ? "" : " — the candidate page is NOT produced"}`);
  return decision;
}
