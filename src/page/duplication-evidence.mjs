/**
 * F32 · ONE CLIENT'S PAGES, ASSEMBLED FOR DUPLICATE, THIN AND TEMPLATE DETECTION (acceptance _handoffs a0b9776, RR-87).
 *
 * The population, bodies and body verification are F31's (src/page/existing-page-population.mjs): the client's own partition only.
 * A body is measured only when its own fingerprint is VERIFIED (the stored bytes hash to the recorded content_sha256).
 *   semantic reviews        NONE recorded — no store exists; passed as [] and named as missing by the detection
 *   unique-value records    NONE recorded — no store exists; passed as [] and named as missing by the detection
 * Count-only output; no page content, host or URL.
 */
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { detectDuplication } from "./duplication.mjs";

/** Each population page with the verification of the body it carries. */
export function verifiedPages(population) {
  const fp = new Map(population.inventory.pages.map((p) => [p.pageId, p.fingerprints]));
  return population.pages.map((p) => ({
    pageId: p.pageId,
    html: p.html,
    verified: p.bodyObservationId !== null && (fp.get(p.pageId) ?? []).some((f) => f.observationId === p.bodyObservationId && f.verified === true),
  }));
}

export function readClientDuplication({ tenantId, resolve, env = process.env, now = new Date() }) {
  const { population, fault } = readExistingPagePopulation({ scope: { tenantId }, resolve, env, now });
  if (!population) return { fault, bound: `recorded data only · population UNAVAILABLE (${fault})` };
  const r = detectDuplication({ pages: verifiedPages(population), reviews: [], valueRecords: [] });
  const s = r.summary;
  return {
    fault: null,
    ...r,
    bound: `recorded data only · ${s.population} page(s) · ${s.measured} measured (verified body) · ${s.pairs} sibling pair(s) · semantic reviews recorded 0 · unique-value records 0 · no paid or metered call`,
  };
}
