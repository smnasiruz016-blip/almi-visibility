/**
 * 🔴 A NEUTRAL DECLARED TEST PRODUCT — ITEM 53's INPUT, NOT A REAL PRODUCT.
 *
 * Item 53's frozen boundary: "AlmiVisibility is given an UNSEEN subject or
 * product — a second real product, OR A NEUTRAL DECLARED TEST PRODUCT." This is
 * the second kind, declared as such, 13 September 2026.
 *
 * ── WHY THIS SUBJECT ────────────────────────────────────────────────────────
 *
 * It had to be genuinely unseen, not shaped around what the engine already
 * handles. So it shares nothing with the first product:
 *
 *   subject     home fermentation — brine, pH, maturation, sugar — not exams,
 *               not migration, not health professions
 *   axis        pages vary by FERMENT, not by any profession, country or route
 *   sources     no regulator; a reserved example.org address that does not exist
 *   licence     its own, DECLARED-TEST-DATA, reserving everything
 *   shape       records grouped by ferment family, not one file per publisher;
 *               no page specs at all; values in percent, pH, months and g/L
 *
 * 🔴 NOTHING HERE IS A FACT. Every value is declared test data — not verified,
 * not advice, status `lead` so nothing can render it, route R4 so nothing can
 * cite it. It exists to be loaded by a core that has never seen it.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { registerProduct } from "../../src/product.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export const DECLARATION = Object.freeze({
  kind: "NEUTRAL DECLARED TEST PRODUCT",
  row: 53,
  declaredOn: "2026-09-13",
  boundaryWords: "an unseen subject or product — a second real product, or a neutral declared test product",
  notA: "not a real product, not a real subject of any AlmiWorld product, and not a source of any fact",
});

export const PRODUCT = registerProduct({
  productId: "neutral-test-ferments",
  declaredTestProduct: true,
  declaration: DECLARATION,

  axis: { key: "ferment", label: "Ferment" },
  variants: ["sauerkraut", "kimchi", "kombucha", "water-kefir", "miso"],
  /* RR-146 · the product's declared research block (F16 routes): a test topic, a route bound and one fixture source — never fetched */
  research: { topic: "declared test topic two", maxRoutes: 6, language: "en", sources: [{ sourceId: "stack-exchange", site: "fixture-site-two" }],
    /* F62 · the dimension this test product applies along — its KEY only: the values are whatever its own records carry (F62 C5),
     * never a list typed here (RR-148 §1: nobody enumerates them by hand) */
    applicability: { dimension: "declared-scope" } },

  factsDir: join(HERE, "facts"),
  pageSpecs: {},

  gapRegister: [
    { claim: "kimchi-brine.minimum-salt-by-weight.ferment=kimchi", neededBy: "no page — declared test data", blockedBy: "declared test product: no source was declared for this variant" },
  ],
  licenceEntries: {
    "DECLARED-TEST-DATA": {
      state: "RESERVED",
      label: "declared test data — all rights reserved, nothing may be quoted",
      quotableClasses: [],
      permitsCommercial: false,
      permitsNetworkedStorage: false,
      requiresCurrentVersion: false,
      requiresPerPageThirdPartyCheck: false,
      requiredAttribution: null,
      attributionMustLinkTo: null,
      clause: "These records are declared test data for item 53. They grant nothing, assert nothing, and may not be quoted, rendered or cited.",
    },
  },
});
