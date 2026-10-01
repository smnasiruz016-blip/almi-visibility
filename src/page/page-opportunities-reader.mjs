/**
 * F91 · ONE PRODUCT'S DECLARED PLANNING INPUTS (acceptance _handoffs 2048dd3, RR-113).
 *
 *   dimensions        the product descriptor's declared page dimension (axis) and its declared values — read from the descriptor
 *   verified data     the claim-qualifier keys its fact registry records; a key the product does not declare as a page dimension is
 *                     EXCLUDED and counted, never combined
 *   demand, sources,  no recorded per-candidate demand outcome, source, product-fit or distinct-need record exists in any store, and no
 *   grouping          owner declaration of qualifying demand states or of a grouping rule exists — they are passed as absent, never filled
 * Read only, through the product's own scope; nothing fetched, rendered or written.
 */
import { loadRegistry } from "../facts/registry.mjs";
import { planPages } from "./page-opportunities.mjs";

/** The claim-qualifier keys a registry records (`key=value` pairs in each claim's qualifier), with how many records carry each. */
export function qualifierKeys(records) {
  const keys = new Map();
  for (const r of records) {
    const q = r?.claim?.qualifier;
    const text = typeof q === "string" ? q : q && typeof q === "object" ? Object.entries(q).map(([k, v]) => `${k}=${v}`).join(",") : "";
    for (const m of text.matchAll(/([A-Za-z][A-Za-z0-9_-]*)=/g)) keys.set(m[1], (keys.get(m[1]) ?? 0) + 1);
  }
  return keys;
}

export async function readProductPlan(product) {
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const dimensions = product.axis?.key ? [{ key: product.axis.key, values: [...(product.variants ?? [])] }] : [];
  const declaredKeys = new Set(dimensions.map((d) => d.key));
  const dataKeys = qualifierKeys(records);
  const excludedDataKeys = [...dataKeys.keys()].filter((k) => !declaredKeys.has(k)).length;
  const plan = planPages({ dimensions });
  return {
    plan,
    inputs: {
      declaredDimensions: dimensions.length,
      declaredValues: dimensions.reduce((n, d) => n + d.values.length, 0),
      factRecords: records.length,
      verifiedFacts: records.filter((r) => r.verificationState === "VERIFIED").length,
      qualifierKeysInFacts: dataKeys.size,
      excludedDataKeys,
      demandOutcomes: "NOT MEASURED — no store of per-candidate demand outcomes exists (no producer: F14 and F15 are UNASSESSED)",
    },
  };
}
