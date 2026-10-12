/**
 * THE CLIENT PRODUCT QUESTIONNAIRE, READ FROM ONE PRODUCT'S OWN FACT REGISTRY (owner answer A2, RR-250).
 *
 * The questionnaire lives in the product's registry directory as `_product-questionnaire.mjs`. The leading underscore keeps it
 * out of the fact records (`loadRegistry` skips it), so an answer never poses as a source-read fact; it is read ONLY here. The
 * directory is the product's own, handed in by a caller that has already decided its scope — nothing here resolves a product.
 *
 * Read only. A product with no questionnaire file has NONE: reported, never invented.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { QUESTIONNAIRE_FILE, capabilityClaimsOf, validateQuestionnaire } from "./product-questionnaire.mjs";

export const QUESTIONNAIRE_STATES = Object.freeze(["NONE", "INVALID", "READ"]);

/** @param {{factsDir: string, productId: string}} product  the resolved product */
export async function readProductQuestionnaire(product) {
  if (typeof product?.factsDir !== "string" || product.factsDir.length === 0) throw new Error("readProductQuestionnaire(product): a product must say where its registry lives — there is no default");
  const file = join(product.factsDir, QUESTIONNAIRE_FILE);
  if (!existsSync(file)) return { state: "NONE", questionnaire: null, claims: [], answers: 0, approved: 0, withheld: 0, faults: [] };
  const questionnaire = (await import(pathToFileURL(file).href)).default;
  const v = validateQuestionnaire(questionnaire);
  /* a questionnaire filed under one product may never speak for another */
  const faults = [...v.faults];
  if (v.valid && questionnaire.productId !== product.productId) faults.push({ code: "QUESTIONNAIRE_OF_ANOTHER_PRODUCT", path: "$.productId" });
  if (faults.length > 0) return { state: "INVALID", questionnaire, claims: [], answers: Array.isArray(questionnaire?.answers) ? questionnaire.answers.length : 0, approved: 0, withheld: Array.isArray(questionnaire?.answers) ? questionnaire.answers.length : 0, faults };
  return { state: "READ", questionnaire, ...capabilityClaimsOf(questionnaire) };
}
