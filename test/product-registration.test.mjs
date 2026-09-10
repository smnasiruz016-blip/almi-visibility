import test from "node:test";
import assert from "node:assert/strict";

import { LICENCES, registerLicences, quotabilityState, requiresCurrentVersion } from "../src/facts/licences.mjs";
import { registerGaps, declaredGaps, gapRegisterProducts } from "../src/facts/gaps.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { claimIdsOf } from "../src/page/claim-ids.mjs";
import { placeClaims } from "../src/page/claim-placement.mjs";

import { PRODUCT_ID, FACTS_DIR } from "../products/almi-oet/register.mjs";
import { ALMI_OET_LICENCES } from "../products/almi-oet/licences.mjs";
import { ALMI_OET_GAPS } from "../products/almi-oet/gaps.mjs";

/* ------------------------------------------------------------------ *
 * THE MOVE CHANGED NOTHING — the entries are still there and still bite.
 * ------------------------------------------------------------------ */

test("the moved licence entries are in the catalogue, and behave exactly as before", () => {
  assert.equal(quotabilityState("NMC-6.3"), "PERMITTED");
  assert.equal(quotabilityState("OET-CBLA-IP"), "PROHIBITED");
  // 🔴 The condition that changes the engineering survived the move: this is
  // what makes an NMC quote lapse when the source stops being current.
  assert.equal(requiresCurrentVersion("NMC-6.3"), true);
  assert.equal(requiresCurrentVersion("OGL-v3.0"), false);
  assert.equal(LICENCES["OET-CBLA-IP"].permitsCommercial, false);
});

test("a registered entry records which product brought it", () => {
  assert.equal(LICENCES["NMC-6.3"]._productId, PRODUCT_ID);
  // The engine's own licences belong to nobody.
  assert.equal(LICENCES["OGL-v3.0"]._productId, undefined);
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
  assert.equal(LICENCES["OGL-v3.0"].permitsCommercial, true);
});

test("🔴 a registered licence must declare a real quotability state", () => {
  assert.throws(() => registerLicences("bad-product", { "made-up": { state: "PROBABLY-FINE" } }), /not a quotability state/);
  assert.equal("made-up" in LICENCES, false);
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
 * THE GAP COUNT, AND WHY "NO GAPS" MUST NOT LOOK LIKE GOOD NEWS.
 * ------------------------------------------------------------------ */

test("every declared gap is attributed to the product that declared it", () => {
  const gaps = declaredGaps();
  assert.equal(gaps.length, ALMI_OET_GAPS.length);
  assert.ok(gaps.length > 0, "an empty gap register would make the census flattering, not clean");
  for (const g of gaps) assert.equal(g.productId, PRODUCT_ID);
  assert.deepEqual(gapRegisterProducts(), [PRODUCT_ID]);
});

test("the product's facts load from the product's own directory", async () => {
  const { files, records } = await loadRegistry(FACTS_DIR);
  assert.equal(records.length, 46);
  assert.ok(files.length > 0);
  assert.match(FACTS_DIR.replace(/\\/g, "/"), /products\/almi-oet\/facts$/);
});
