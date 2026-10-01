/**
 * F44 · ONE PRODUCT'S FACT REGISTRY, AUDITED (acceptance _handoffs eecdfe4, RR-113).
 * The registry is loaded through the product's own scope (the caller passes the resolved product); capability claims are admitted
 * by the existing rule with the production tenant resolver. Read only; nothing fetched, re-checked or written.
 */
import { loadRegistry } from "./registry.mjs";
import { admitCapabilityClaim } from "./capability-claims.mjs";
import { createTenantResolver } from "../tenancy/resolver.mjs";
import { RESOURCES } from "../tenancy/scoped-run.mjs";
import { auditFactSupply } from "./fact-supply.mjs";

/** The admission context for ONE product: only that product resolves, and only through the production tenant resolver. */
export const capabilityContext = (product, resolve) => ({ resolve, productResourceOf: (productId) => (productId === product.productId ? RESOURCES.subject(productId) : null) });

export async function readFactSupply(product, { resolve = createTenantResolver() } = {}) {
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const ctx = capabilityContext(product, resolve);
  return auditFactSupply(records, { admit: (c) => admitCapabilityClaim(c, ctx) });
}
