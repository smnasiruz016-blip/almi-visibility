/**
 * F62 · ONE PRODUCT'S DERIVED RESEARCH DECLARATION, READ ONE WAY (RR-149; acceptance _handoffs a5ec9f1). Read-only: F13's axes through
 * the product's own scope, and the product's own fact registry; F45 and F46 judge, as they stand, on a STATED date. Nothing fetched or
 * written; names no product.
 */
import { readProductAxes } from "../discovery/context-axes-reader.mjs";
import { loadRegistry } from "../facts/registry.mjs";
import { NO_DECLARED_PERSON_CHECKERS } from "../facts/citation-audit.mjs";
import { deriveDeclaration } from "./applicability.mjs";

export async function readDerivedDeclaration({ product, tenantId, resolve, on = null, persons = NO_DECLARED_PERSON_CHECKERS }) {
  let facts = null;
  try { facts = (await loadRegistry(product.factsDir, product.productId)).records; } catch { facts = null; }
  let axes = null;
  try { axes = (await readProductAxes({ product, tenantId, resolve })).axes; } catch { axes = null; }
  return deriveDeclaration({ axes, facts, persons, on });
}
