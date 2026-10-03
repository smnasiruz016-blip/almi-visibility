/**
 * F16 · ONE PRODUCT'S RESEARCH PLAN, READ ONE WAY (RR-146 + owner addendum): F13's axes → applicability over the product's own fact
 * registry (F45 freshness, F46 citation, both as they stand) → bounded routes. Read-only; both entry points use THIS reader, so a route id
 * is the same wherever it is computed. Names no product.
 */
import { readProductAxes } from "../discovery/context-axes-reader.mjs";
import { loadRegistry } from "../facts/registry.mjs";
import { NO_DECLARED_PERSON_CHECKERS } from "../facts/citation-audit.mjs";
import { researchRoutes, declaredValuesOf } from "./research-routes.mjs";
import { applicabilityOf } from "./applicability.mjs";

export async function readResearchPlan({ product, subject, tenantId, resolve, now = new Date(), persons = NO_DECLARED_PERSON_CHECKERS }) {
  const { axes } = await readProductAxes({ product, tenantId, resolve });
  let applicability = null;
  if (product?.research?.applicability) {
    let facts = null;
    try { facts = (await loadRegistry(product.factsDir, product.productId)).records; } catch { facts = null; }
    const axisKey = product.axis?.key ?? null;
    const evidenced = (axes.declared ?? []).some((d) => d.key === axisKey && d.status === "EVIDENCED");
    applicability = applicabilityOf({ facts, axisKey, routeValues: evidenced ? declaredValuesOf(product, axisKey) ?? [] : [], declaration: product.research.applicability, persons, now });
  }
  return { axes, applicability, plan: researchRoutes({ subject, product, axes, applicability }) };
}
