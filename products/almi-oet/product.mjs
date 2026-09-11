/**
 * ALMIOET — THE FIRST ADAPTER. A PROOF, NOT A PRODUCT.
 *
 * Everything the engine is allowed to know about AlmiOET is in this one object.
 * The engine takes the descriptor; it never reaches back into this folder, and
 * `test/product-boundary.test.mjs` fails the build if it ever does.
 *
 * 🔴 THE ENGINE DOES NOT LEARN NURSING HERE. IT GAINS THE ABILITY TO HOLD IT.
 * The day AlmiCV wants profile pages that vary by country, it writes a second
 * file of this shape — `axis: { key: "country" }`, its own variants, its own
 * facts directory — and nothing under `src/` is edited at all. That is the
 * whole point of the ruling, and this file is what makes it checkable.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { registerProduct } from "../../src/product.mjs";
import { buildPlacement } from "../../src/page/claim-placement.mjs";

import { ALMI_OET_LICENCES } from "./licences.mjs";
import { ALMI_OET_GAPS } from "./gaps.mjs";
import { UNIVERSAL_CLAIMS, PENDING_LAYERS } from "./claim-placement.mjs";
import { NURSING_PAGE, SPEECH_PATHOLOGY_PAGE } from "./page-specs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * 🔴 THE TWELVE, DECLARED BY THE PRODUCT AND BY NOBODY ELSE.
 *
 * ⚠️ This is a STATEMENT OF INTENT, not a report of what has supply. Two of the
 * twelve have a page today. Inferring the list from the records instead would
 * make the product report that it has two professions, and a cohort of twelve
 * would quietly become a cohort of two — with nothing anywhere going red.
 *
 * The gap between this list and the pages that exist is precisely the number
 * worth reporting, and `coverage()` reports it.
 */
export const VARIANTS = Object.freeze([
  "dentistry", "dietetics", "medicine", "nursing", "occupational-therapy", "optometry",
  "pharmacy", "physiotherapy", "podiatry", "radiography", "speech-pathology", "veterinary-science",
]);

export const ALMI_OET = registerProduct({
  productId: "almi-oet",

  /**
   * 🔴 WHAT THIS PRODUCT'S PAGES VARY BY.
   *
   * The engine asks "does this claim's value change from one sibling page to
   * the next?" It cannot answer that without being told what a sibling IS, and
   * it is not entitled to guess. The claim qualifiers in this product's records
   * read `profession=nursing`, so `profession` is the prefix the engine looks
   * for. Nothing in `src/` may know that string.
   */
  axis: { key: "profession", label: "Profession" },
  variants: VARIANTS,

  factsDir: join(HERE, "facts"),
  pageSpecs: { nursing: NURSING_PAGE, "speech-pathology": SPEECH_PATHOLOGY_PAGE },

  gapRegister: ALMI_OET_GAPS,
  licenceEntries: ALMI_OET_LICENCES,

  placement: buildPlacement({ universal: UNIVERSAL_CLAIMS, pendingLayers: PENDING_LAYERS }),
});

/**
 * 🔴 THE NAME THE ENGINE LOOKS FOR.
 *
 * `src/product-cli.mjs` resolves a product by reading `PRODUCT` from
 * `products/<id>/product.mjs`. It must be a name that belongs to no product —
 * reading a named export like this product's own constant would have put this
 * product's name inside the engine, and the boundary law would have failed
 * on the engine's own file. Caught while writing it.
 */
export const PRODUCT = ALMI_OET;

/** Convenience re-exports for the runners. The engine uses the descriptor. */
export const { productId: PRODUCT_ID, factsDir: FACTS_DIR, placement: PLACEMENT } = ALMI_OET;
export const AXIS_KEY = ALMI_OET.axis.key;
