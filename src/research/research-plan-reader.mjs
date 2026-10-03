/**
 * F16 · ONE PRODUCT'S RESEARCH PLAN, READ ONE WAY (RR-146; applicability is F62's, acceptance _handoffs a5ec9f1): F13's axes → the routes
 * in hand → F62's applicability over the product's own fact registry (F45 health and F46 citation, both as they stand, on a STATED date)
 * → the narrowed routes handed to F16. Read-only; both entry points use THIS reader, so a route id is the same wherever it is computed.
 * Names no product.
 */
import { readProductAxes } from "../discovery/context-axes-reader.mjs";
import { loadRegistry } from "../facts/registry.mjs";
import { NO_DECLARED_PERSON_CHECKERS } from "../facts/citation-audit.mjs";
import { researchRoutes } from "./research-routes.mjs";
import { applicabilityOf } from "./applicability.mjs";

export async function readResearchPlan({ product, subject, tenantId, resolve, on = null, persons = NO_DECLARED_PERSON_CHECKERS }) {
  const { axes } = await readProductAxes({ product, tenantId, resolve });
  let applicability = null;
  if (product?.research?.applicability) {
    let facts = null;
    try { facts = (await loadRegistry(product.factsDir, product.productId)).records; } catch { facts = null; }
    /* the routes in hand: the product's own routes before any narrowing — F62 measures only what these need */
    const inHand = researchRoutes({ subject, product: { ...product, research: { ...product.research, applicability: undefined } }, axes });
    applicability = applicabilityOf({ product, axes, routes: inHand.routes, facts, persons, on });
  }
  return { axes, applicability, plan: researchRoutes({ subject, product, axes, applicability }) };
}
