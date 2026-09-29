/**
 * F35 · ONE CLIENT'S RECORDED EVIDENCE, ASSEMBLED FOR THE ACTION DECISION (acceptance _handoffs da659bd, RR-88).
 *
 * Everything here is read through the client's own partitions by modules already verified for it — nothing new is collected:
 *   population, inventory, completeness   F31 (src/page/existing-page-population.mjs)
 *   coverage of each registered need       F33 (src/page/need-coverage.mjs judgePage) over the client's own pages
 *   right-to-exist of each candidate       F36 over F34 (src/page/right-to-exist.mjs, existing-page-first.mjs)
 *   indexability contradictions            F21 (src/audit/indexability-reader.mjs)
 *   facts on a page and their freshness    the subject's fact registry, read by its lifecycle (src/facts/lifecycle.mjs freshnessOf)
 *   demand                                 NONE: no row issues a recorded V3 §5 demand outcome — passed as null, and named as missing
 *   quality · question coverage · post-publication evidence   NONE recorded — passed as null, named as missing by the decision
 *
 * The decision itself is pure (./action-decision.mjs). Count-only output; no page content, host or URL.
 */
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { existingPageFirst } from "./existing-page-first.mjs";
import { rightToExist } from "./right-to-exist.mjs";
import { judgePage, PAGE_VERDICTS } from "./need-coverage.mjs";
import { decideForNeed, decideForPage, summarise } from "./action-decision.mjs";
import { readClientIndexabilitySignals } from "../audit/indexability-reader.mjs";
import { factsPresentIn } from "../gate-a/existing-pages.mjs";
import { freshnessOf } from "../facts/lifecycle.mjs";

/** Pages that each cover the same registered need — each page's peers. */
export function sameNeedPeers(pages, values) {
  const peers = new Map(pages.map((p) => [p.pageId, new Set()]));
  for (const v of values) {
    const covering = pages.filter((p) => judgePage(p, v, values).verdict === PAGE_VERDICTS.COVERS).map((p) => p.pageId);
    if (covering.length < 2) continue;
    for (const id of covering) for (const other of covering) if (other !== id) peers.get(id).add(other);
  }
  return peers;
}

/**
 * @param {{ tenantId: string, product: object, records: object[], resolve: Function, env?: object, now?: Date, demand?: object|null }} input
 * `records` is the subject's fact registry (loadRegistry), handed in by the caller that loaded the product.
 */
export function readClientActionEvidence({ tenantId, product, records = [], resolve, env = process.env, now = new Date(), demand = null }) {
  const { population, fault } = readExistingPagePopulation({ scope: { tenantId }, resolve, env, now });
  if (!population) return { fault, needs: [], pages: [], bound: `recorded data only · population UNAVAILABLE (${fault})` };
  const values = product.variants ?? [];
  const signals = new Map(readClientIndexabilitySignals({ tenantId, resolve, env }).urls.map((u) => [u.pageId, u]));
  const peers = sameNeedPeers(population.pages, values);
  const html = new Map(population.pages.map((p) => [p.pageId, p.html]));

  const pages = population.inventory.pages.map((p) => {
    const s = signals.get(p.pageId);
    const present = factsPresentIn(html.get(p.pageId) ?? "", records);
    return decideForPage({
      pageId: p.pageId,
      servedState: p.servedState.state === "OBSERVED" ? { ...p.servedState, evidence: p.evidence.observationIds } : p.servedState,
      signals: s ? { state: s.state, classes: s.classes, sources: s.sources } : { state: "NOT_MEASURED", classes: [] },
      sameNeedPeers: [...(peers.get(p.pageId) ?? [])],
      inboundLinks: p.inboundLinks,
      completeness: population.completeness.state,
      completenessRef: `completeness:${population.completeness.basis.method}:${population.completeness.basis.asOf}`,
      staleFacts: present.filter((f) => freshnessOf(f, { now }).state === "STALE").map((f) => f.id),
      quality: null, questionCoverage: null, postPublication: null, removal: null,
    });
  });

  const slugs = Object.keys(product.pageSpecs ?? {});
  const needs = slugs.map((slug) => {
    const spec = product.pageSpecs[slug];
    const ex = existingPageFirst({ candidate: { slug, intent: spec.variant, structure: { values } }, tenantId, population });
    const rte = rightToExist({ slug, spec, siblings: slugs.filter((x) => x !== slug).map((x) => ({ slug: x, spec: product.pageSpecs[x] })), variants: values, existingPageDecision: ex });
    return decideForNeed({ slug, rightToExist: rte, existingPageDecision: ex, demand });
  });

  return {
    fault: null,
    needs,
    pages,
    summary: { needs: summarise(needs), pages: summarise(pages) },
    bound: `recorded data only · ${needs.length} proposed need(s) · ${pages.length} existing page(s) · inventory ${population.completeness.state} · ${records.length} registry fact(s) · demand ${demand ? "RECORDED" : "NOT RECORDED"}`,
  };
}
