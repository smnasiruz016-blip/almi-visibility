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

/**
 * 🔴 WHAT THIS PRODUCT'S PAGES VARY BY.
 *
 * The engine asks "does this claim's value change from one sibling page to the
 * next?" It cannot answer that without being told what a sibling IS, and it is
 * not entitled to guess. AlmiOET's answer is `profession`; AlmiCV's would be a
 * country, AlmiPTE's a task type.
 *
 * The claim qualifiers in this product's records read `profession=nursing`, so
 * the axis key is the prefix the engine looks for. Nothing in `src/` may know
 * that string.
 */
export const AXIS_KEY = "profession";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Where this product keeps its fact records. The engine has no idea. */
export const FACTS_DIR = join(HERE, "facts");

registerLicences(PRODUCT_ID, ALMI_OET_LICENCES);
registerGaps(PRODUCT_ID, ALMI_OET_GAPS);
