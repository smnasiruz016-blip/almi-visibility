/**
 * ALMIOET — WIRING ITS OWN KNOWLEDGE INTO THE ENGINE.
 *
 * Importing this module is what makes the engine aware of AlmiOET at all: its
 * licence terms, its declared gaps, and where its facts live. Nothing in `src/`
 * reaches for any of it.
 *
 * ⚠️ THIS FILE IS A STAGING POST, NOT THE DESTINATION. The next step gives the
 * product a single descriptor — an axis, its variants, and these same four
 * pointers — and the engine takes the descriptor rather than importing a
 * module for its side effects. Recorded here so the shortcut is visible while
 * it lasts, instead of quietly becoming the design.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { registerLicences } from "../../src/facts/licences.mjs";
import { registerGaps } from "../../src/facts/gaps.mjs";
import { ALMI_OET_LICENCES } from "./licences.mjs";
import { ALMI_OET_GAPS } from "./gaps.mjs";

export const PRODUCT_ID = "almi-oet";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Where this product keeps its fact records. The engine has no idea. */
export const FACTS_DIR = join(HERE, "facts");

registerLicences(PRODUCT_ID, ALMI_OET_LICENCES);
registerGaps(PRODUCT_ID, ALMI_OET_GAPS);
