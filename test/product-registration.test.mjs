import test from "node:test";
import assert from "node:assert/strict";

import { licencesVisibleTo, engineLicences, registerLicences, quotabilityState, requiresCurrentVersion } from "../src/facts/licences.mjs";
import { registerGaps, declaredGaps, gapRegisterProducts } from "../src/facts/gaps.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { claimIdsOf } from "../src/page/claim-ids.mjs";
import { placeClaims, isPerVariant, isSharedAcrossVariants, buildPlacement } from "../src/page/claim-placement.mjs";
import { registerProduct, registeredProducts, coverage } from "../src/product.mjs";

import { ALMI_OET, PRODUCT_ID, FACTS_DIR, AXIS_KEY, PLACEMENT } from "../products/almi-oet/product.mjs";
import { ALMI_OET_LICENCES } from "../products/almi-oet/licences.mjs";
import { ALMI_OET_GAPS } from "../products/almi-oet/gaps.mjs";

// The licence view THIS product may read: the engine’s instruments plus its own.
// Another product’s entries are not in it, and that is the point.
const VISIBLE = licencesVisibleTo(PRODUCT_ID);

/* ------------------------------------------------------------------ *
 * THE MOVE CHANGED NOTHING — the entries are still there and still bite.
 * ------------------------------------------------------------------ */

test("the moved licence entries are in the catalogue, and behave exactly as before", () => {
  assert.equal(quotabilityState("NMC-6.3", PRODUCT_ID), "PERMITTED");
  assert.equal(quotabilityState("OET-CBLA-IP", PRODUCT_ID), "PROHIBITED");
  // 🔴 The condition that changes the engineering survived the move: this is
  // what makes an NMC quote lapse when the source stops being current.
  assert.equal(requiresCurrentVersion("NMC-6.3", PRODUCT_ID), true);
  assert.equal(requiresCurrentVersion("OGL-v3.0", PRODUCT_ID), false);
  assert.equal(VISIBLE["OET-CBLA-IP"].permitsCommercial, false);
});

test("a registered entry records which product brought it", () => {
  assert.equal(VISIBLE["NMC-6.3"]._productId, PRODUCT_ID);
  // The engine's own licences belong to nobody.
  assert.equal(VISIBLE["OGL-v3.0"]._productId, undefined);
});

test("the engine keeps the general instruments and the product keeps its documents", () => {
  assert.deepEqual(Object.keys(ALMI_OET_LICENCES).sort(), ["NMC-6.3", "OET-CBLA-IP"]);
  for (const general of ["OGL-v3.0", "CC-BY-3.0-NZ", "proprietary-no-reuse", "unknown-not-read", "unknown-licence-unreachable"]) {
    assert.equal(general in ALMI_OET_LICENCES, false, `${general} is a general instrument and must stay in the engine`);
  }
});

/* ------------------------------------------------------------------ *
 * 🔴 THE GUARDS ON REGISTRATION — RED-FORCED, not merely present.
 * ------------------------------------------------------------------ */

test("🔴 a licence may be ADDED, never REDEFINED", () => {
  // Redefining OGL-v3.0 would change what every OTHER product is permitted to
  // do, silently, from a file nobody reviewing that product would open.
  assert.throws(
    () => registerLicences("some-other-product", { "OGL-v3.0": { state: "PERMITTED" } }),
    /already defined/,
  );
  // …and the real entry is untouched by the attempt.
  assert.equal(VISIBLE["OGL-v3.0"].permitsCommercial, true);
});

test("🔴 a registered licence must declare a real quotability state", () => {
  assert.throws(() => registerLicences("bad-product", { "made-up": { state: "PROBABLY-FINE" } }), /not a quotability state/);
  assert.equal("made-up" in VISIBLE, false);
});

test("🔴 registering the same product's gaps twice throws instead of doubling the count", () => {
  assert.throws(() => registerGaps(PRODUCT_ID, ALMI_OET_GAPS), /already registered/);
});

test("🔴 a gap with no reason is refused — an unexplained gap is a shrug", () => {
  assert.throws(() => registerGaps("gapless-product", [{ claim: "x" }]), /claim and a blockedBy/);
});

/* ------------------------------------------------------------------ *
 * 🔴 THE DEFAULTS THAT USED TO CARRY A PRODUCT ARE GONE.
 *
 * None of these threw before this refactor: each quietly fell back to
 * AlmiOET's facts, AlmiOET's page, or a path the engine computed for itself.
 * A default is a dependency nobody has to declare, which is why it survives
 * every refactor by being invisible.
 * ------------------------------------------------------------------ */

test("🔴 loadRegistry has no default directory", async () => {
  await assert.rejects(() => loadRegistry(), /no default/);
});

test("🔴 claimIdsOf has no default page", () => {
  assert.throws(() => claimIdsOf(), /no default page/);
});

test("🔴 placeClaims has no default page", () => {
  assert.throws(() => placeClaims(), /a product must hand one over/);
});

/* ------------------------------------------------------------------ *
 * 🔴 THE AXIS IS A PARAMETER, AND IT HAS TO ACTUALLY DO SOMETHING.
 *
 * A rename that leaves the old behaviour hardcoded underneath is a rename that
 * bought nothing. These prove the axis argument changes the answer.
 * ------------------------------------------------------------------ */

const claim = (qualifier) => ({ id: "x.y", claim: { qualifier } });

test("🔴 the engine refuses to guess what a page varies by", () => {
  assert.throws(() => isPerVariant(claim("profession=nursing")), /a product must say/);
  assert.throws(() => isPerVariant(claim("profession=nursing"), ""), /a product must say/);
});

test("🔴 the SAME record is per-variant on one axis and shared on another", () => {
  const r = claim("profession=nursing");
  assert.equal(isPerVariant(r, "profession"), true);
  assert.equal(isPerVariant(r, "country"), false);
  // …and the shared predicate inverts with it, which is what makes the overlap
  // measure follow the product rather than a word baked into the engine.
  assert.equal(isSharedAcrossVariants(r, "profession"), false);
  assert.equal(isSharedAcrossVariants(r, "country"), true);
});

test("a claim with no qualifier is shared on every axis", () => {
  const r = claim(null);
  assert.equal(isPerVariant(r, "profession"), false);
  assert.equal(isSharedAcrossVariants(r, "profession"), true);
  assert.equal(isSharedAcrossVariants(r, "anything-at-all"), true);
});

test("the product declares its own axis, and the engine never names it", () => {
  assert.equal(AXIS_KEY, "profession");
});

/* ------------------------------------------------------------------ *
 * 🔴 THE DESCRIPTOR — VALIDATED BEFORE ANYTHING IS REGISTERED.
 *
 * A half-accepted descriptor leaves the engine holding one product's licences
 * under another product's name, and nothing downstream would ever notice. So
 * every field is checked first, and each of these proves one check bites.
 * ------------------------------------------------------------------ */

const descriptor = (over = {}) => ({
  productId: "test-product",
  axis: { key: "country", label: "Country" },
  variants: ["uk", "ie"],
  factsDir: "/nowhere",
  pageSpecs: {},
  ...over,
});

test("🔴 a product must say what its pages vary BY", () => {
  assert.throws(() => registerProduct(descriptor({ axis: { label: "Country" } })), /axis\.key/);
  assert.throws(() => registerProduct(descriptor({ axis: { key: "country" } })), /axis\.label/);
});

test("🔴 a product with no variants has no siblings, and no overlap to measure", () => {
  assert.throws(() => registerProduct(descriptor({ variants: [] })), /no sibling pages/);
  assert.throws(() => registerProduct(descriptor({ variants: ["uk", "uk"] })), /duplicate/);
});

test("🔴 there is no default facts directory", () => {
  assert.throws(() => registerProduct(descriptor({ factsDir: undefined })), /no default place to look/);
});

test("🔴 a page spec must be FOR a variant the product declared", () => {
  // A page whose variant is not in the list is a page nobody counts in the
  // rollout — it would pass every test and never be measured against siblings.
  assert.throws(
    () => registerProduct(descriptor({ pageSpecs: { x: { variant: "france", sections: [] } } })),
    /not one of this product's variants/,
  );
});

test("🔴 registering the same product twice throws", () => {
  assert.throws(() => registerProduct(descriptor({ productId: PRODUCT_ID })), /already registered/);
});

test("a failed descriptor registers NOTHING — validation runs first", () => {
  const before = registeredProducts().length;
  assert.throws(() => registerProduct(descriptor({ variants: [] })));
  assert.equal(registeredProducts().length, before);
  assert.equal(gapRegisterProducts().includes("test-product"), false);
});

/* ------------------------------------------------------------------ *
 * 🔴 THE PENDING LAYERS ARE OWED, NOT BUILT.
 * ------------------------------------------------------------------ */

test("🔴 a pending layer that claimed to EXIST is refused", () => {
  assert.throws(
    () => buildPlacement({ universal: [], pendingLayers: [{ claims: ["a"], layer: "somewhere", exists: true }] }),
    /owed, not built/,
  );
});

test("🔴 a claim cannot be both universal and pending — it cannot stay and leave", () => {
  assert.throws(
    () => buildPlacement({ universal: ["a"], pendingLayers: [{ claims: ["a"], layer: "l", exists: false }] }),
    /stay and leave/,
  );
});

test("allRepeated is universal PLUS pending — the distinction that moved 0.3921 to 0.1927", () => {
  // The shared half is a property of the page AS RENDERED. The pending claims
  // are still on the as-built page, so they still count as repeated.
  assert.deepEqual([...PLACEMENT.universal], [...ALMI_OET.placement.universal]);
  assert.equal(PLACEMENT.allRepeated.length, PLACEMENT.universal.length + PLACEMENT.removed.length);
  assert.ok(PLACEMENT.removed.length > 0);
  for (const id of PLACEMENT.removed) assert.ok(PLACEMENT.allRepeated.includes(id), id);
});

/* ------------------------------------------------------------------ *
 * 🔴 COVERAGE — AND ITS DENOMINATOR IS THE DECLARED VARIANTS.
 * ------------------------------------------------------------------ */

test("🔴 coverage counts against what the product DECLARED, not what we built", () => {
  const c = coverage(PRODUCT_ID);
  assert.equal(c.declared, 12);
  assert.equal(c.withAPage, 2);
  assert.equal(c.missing.length, 10);
  // A gate may not build its denominator from its own output. "2 of 2 pages
  // built" is exactly that, and it is the number this refuses to report.
  assert.notEqual(c.declared, c.withAPage);
});

/* ------------------------------------------------------------------ *
 * THE GAP COUNT, AND WHY "NO GAPS" MUST NOT LOOK LIKE GOOD NEWS.
 * ------------------------------------------------------------------ */

test("every declared gap is attributed to the product that declared it", () => {
  const gaps = declaredGaps(PRODUCT_ID);
  assert.equal(gaps.length, ALMI_OET_GAPS.length);
  assert.ok(gaps.length > 0, "an empty gap register would make the census flattering, not clean");
  for (const g of gaps) assert.equal(g.productId, PRODUCT_ID);
  assert.deepEqual(gapRegisterProducts(), [PRODUCT_ID]);
});

test("the product's facts load from the product's own directory", async () => {
  const { files, records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
  assert.equal(records.length, 46);
  assert.ok(files.length > 0);
  assert.match(FACTS_DIR.replace(/\\/g, "/"), /products\/almi-oet\/facts$/);
});
