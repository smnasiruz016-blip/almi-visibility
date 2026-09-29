/**
 * F48 · ONE CLIENT'S STRUCTURED DATA, FROM ITS STORED VERIFIED BODIES (acceptance _handoffs 8d03429, RR-92).
 *
 * The population and body verification are F31's (src/page/existing-page-population.mjs, src/page/duplication-evidence.mjs
 * verifiedPages). Nothing is fetched, rendered or tested live: a rich-result test would be a new act and is not run.
 * Count-only output; no page content, host or URL.
 */
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { verifiedPages } from "./duplication-evidence.mjs";
import { assessPage, summariseStructuredData } from "./structured-data.mjs";

export function readClientStructuredData({ tenantId, resolve, env = process.env, now = new Date() }) {
  const { population, fault } = readExistingPagePopulation({ scope: { tenantId }, resolve, env, now });
  if (!population) return { fault, bound: `recorded data only · population UNAVAILABLE (${fault})` };
  const source = new Map(population.pages.map((p) => [p.pageId, p.bodyObservationId]));
  const assessments = verifiedPages(population).map((p) => assessPage({ pageId: p.pageId, html: p.html, verified: p.verified, ref: source.get(p.pageId) ? `body:${source.get(p.pageId)}` : null }));
  const summary = summariseStructuredData(assessments);
  return {
    fault: null,
    assessments,
    summary,
    schemaFacts: new Map(assessments.filter((a) => a.schemaFact).map((a) => [a.pageId, a.schemaFact])),
    bound: `recorded data only · ${assessments.length} page(s) · stored verified bodies · JSON-LD only · no live rich-result test · ${summary.notice}`,
  };
}
