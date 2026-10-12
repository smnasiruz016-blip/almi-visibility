/**
 * F44 · ONE PRODUCT'S FACT REGISTRY, AUDITED (acceptance _handoffs eecdfe4, RR-113; Amendment 1, _handoffs 1fe07aa, RR-251).
 * The registry is loaded through the product's own scope (the caller passes the resolved product): its fact records, and the capability
 * records its client questionnaire yields — one for each answer the owner has APPROVED and none for any other. Capability records are
 * admitted by the existing rule with the production tenant resolver. Read only; nothing fetched, re-checked or written.
 */
import { loadRegistry } from "./registry.mjs";
import { admitCapabilityClaim } from "./capability-claims.mjs";
import { createTenantResolver } from "../tenancy/resolver.mjs";
import { RESOURCES } from "../tenancy/scoped-run.mjs";
import { auditFactSupply } from "./fact-supply.mjs";
import { readProductQuestionnaire } from "../questionnaire/product-questionnaire-reader.mjs";

/** The admission context for ONE product: only that product resolves, and only through the production tenant resolver. */
export const capabilityContext = (product, resolve) => ({ resolve, productResourceOf: (productId) => (productId === product.productId ? RESOURCES.subject(productId) : null) });

export async function readFactSupply(product, { resolve = createTenantResolver() } = {}) {
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const ctx = capabilityContext(product, resolve);
  /* INPUT (Amendment 1): only an APPROVED answer is a record — a pending or rejected answer, or any answer of an invalid questionnaire, yields none */
  const q = await readProductQuestionnaire(product);
  const audit = auditFactSupply([...records, ...q.claims], { admit: (c) => admitCapabilityClaim(c, ctx) });
  return { ...audit, questionnaire: { state: q.state, answers: q.answers, approved: q.approved, withheld: q.withheld, faults: q.faults.length } };
}
