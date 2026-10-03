/**
 * 🔴 A SECOND NEUTRAL DECLARED TEST PRODUCT — ROW 61's INPUT, NOT A REAL PRODUCT.
 *
 * Row 61's frozen evidence: "a run on two different products, one of them the neutral test product". The first
 * neutral product (neutral-test-ferments) declares no page spec, and row 53 — VERIFIED-PASS — rests on exactly that,
 * so it is not touched. The owner ruled, 15 September 2026 (_handoffs/AlmiVisibility_ROW61_OWNER_DECISION_2026-09-15.md):
 * "use a SECOND DECLARED NEUTRAL TEST PRODUCT / PROJECT · use an evidence-bearing page spec · DO NOT change what Row
 * 53 checks". This is that product, declared as such.
 *
 * ── WHY THIS SUBJECT ────────────────────────────────────────────────────────
 *
 * It shares nothing with the first product or with the first neutral product:
 *
 *   subject     rope knots — not exams, not migration, not health professions, not fermentation
 *   axis        pages vary by KNOT
 *   sources     no publisher; a reserved example.org address that does not exist
 *   licence     its own DECLARED-TEST-DATA entry, reserving everything
 *   specs       two, each holding CLAIM IDS ONLY — never a value, never a rationale nobody owns
 *
 * 🔴 NOTHING HERE IS A FACT. Every value is declared test data — UNVERIFIED, status `lead` so nothing can render
 * it, route R4 so nothing can cite it. The specs exist to be REFUSED by Gate A inside the construction path: the
 * owner's success test is a generator that "REFUSES BAD OR UNSUPPORTED PAGES CORRECTLY — NOT WHEN IT PRODUCES MANY
 * PAGES". No WHY_THIS_URL_DESERVES_TO_EXIST is declared: whoever owns the evidence writes one, and CC must not invent
 * one — its absence is recorded as a DATA GAP, as it is on every real spec.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { registerProduct } from "../../src/product.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export const DECLARATION = Object.freeze({
  kind: "NEUTRAL DECLARED TEST PRODUCT",
  row: 61,
  declaredOn: "2026-09-15",
  ruling: "_handoffs/AlmiVisibility_ROW61_OWNER_DECISION_2026-09-15.md",
  boundaryWords: "a run on two different products, one of them the neutral test product",
  notA: "not a real product, not a real subject of any AlmiWorld product, and not a source of any fact",
});

export const PRODUCT = registerProduct({
  productId: "neutral-test-knots",
  declaredTestProduct: true,
  declaration: DECLARATION,

  axis: { key: "knot", label: "Knot" },
  variants: ["bowline", "clove-hitch", "sheet-bend"],
  /* RR-146 · the product's declared research block (F16 routes): a test topic, a route bound and one fixture source — never fetched */
  research: { topic: "declared test topic one", maxRoutes: 4, language: "en", sources: [{ sourceId: "stack-exchange", site: "fixture-site-one" }] },

  factsDir: join(HERE, "facts"),
  pageSpecs: {
    bowline: {
      slug: "bowline",
      variant: "bowline",
      title: "Declared test page — bowline",
      intro: "Declared test framing for a page that does not exist and is never published.",
      sections: [
        {
          heading: "Declared test section",
          framing: "Declared test framing only. Every statement on this page would be a registry record cited by id.",
          claims: ["fixed-loop.turns-before-tuck.knot=bowline", "fixed-loop.holds-under-cyclic-load.knot=bowline"],
        },
      ],
    },
    "clove-hitch": {
      slug: "clove-hitch",
      variant: "clove-hitch",
      title: "Declared test page — clove hitch",
      intro: "Declared test framing for a second page that does not exist and is never published.",
      sections: [
        {
          heading: "Declared test section",
          framing: "Declared test framing only. Nothing here is a value; the claims below are ids.",
          claims: ["post-hitch.crossing-turns.knot=clove-hitch"],
        },
      ],
    },
  },

  gapRegister: [
    { claim: "bend.joins-unequal-diameters.knot=sheet-bend", neededBy: "no page — declared test data", blockedBy: "declared test product: no source was declared for this variant" },
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
      clause: "These records are declared test data for row 61. They grant nothing, assert nothing, and may not be quoted, rendered or cited.",
    },
  },
});
