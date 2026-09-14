import test from "node:test";
import assert from "node:assert/strict";

import {
  registerLicences,
  licencesVisibleTo,
  engineLicences,
  licenceRegisterProducts,
  quotabilityState,
  quotableUnder,
  licenceClause,
  requiredAttribution,
  requiresCurrentVersion,
} from "../src/facts/licences.mjs";
import { registerGaps, declaredGaps, gapRegisterProducts } from "../src/facts/gaps.mjs";

import { subject } from "./support/subjects.mjs";
const { productId: PRODUCT_ID } = await subject("almi-oet");

/**
 * 🔴 ISO-1 — TWO PRODUCTS MUST NOT SEE EACH OTHER'S EVIDENCE.
 *
 * This was measured as BROKEN before it was fixed. A second tenant registered in
 * memory could read the first's licence terms by name and its declared gaps by
 * asking, and registering it moved shared counters — licences 7→8, gaps 12→13.
 * Redefinition was refused; **reading was not.**
 *
 * ⚠️ THE ENGINE'S OWN INSTRUMENTS ARE SHARED ON PURPOSE. OGL v3.0, CC BY 3.0 NZ
 * and the two UNKNOWN states are the law, not one product's data, and every
 * product reads them. A test that demanded total separation would be demanding
 * the wrong thing — so each assertion below says which kind it is checking.
 */

const A = PRODUCT_ID; // the real product, registered by importing its descriptor

// A second tenant, registered here and nowhere else. Nothing is written to disk.
const B = "iso-probe-tenant";
registerLicences(B, {
  "PROBE-TERMS": {
    state: "PERMITTED",
    label: "probe-only terms",
    quotableClasses: ["guidance"],
    permitsCommercial: true,
    permitsNetworkedStorage: true,
    requiresCurrentVersion: true,
    requiresPerPageThirdPartyCheck: false,
    requiredAttribution: "Probe Tenant",
    attributionMustLinkTo: null,
    clause: "A probe-only clause, long enough to be a real one for the purposes of this test.",
  },
});
registerGaps(B, [{ claim: "probe.claim", blockedBy: "declared by the probe tenant only" }]);

/* ------------------------------------------------------------------ *
 * 🔴 THE LAW: NEITHER TENANT SEES THE OTHER'S ENTRIES.
 * ------------------------------------------------------------------ */

test("🔴 B cannot read A's licence terms by name", () => {
  assert.equal("NMC-6.3" in licencesVisibleTo(B), false, "A's terms are visible to B");
  assert.equal("OET-CBLA-IP" in licencesVisibleTo(B), false);
});

test("🔴 A cannot read B's licence terms by name", () => {
  assert.equal("PROBE-TERMS" in licencesVisibleTo(A), false, "B's terms are visible to A");
});

test("🔴 every accessor refuses the other tenant's licence, not just the catalogue view", () => {
  // A view can be filtered and the accessors still leak. Each one is checked.
  assert.equal(quotabilityState("NMC-6.3", B), "UNREAD", "state leaked to B");
  // 🔴 `false`, NOT `"unknown"` — and the difference matters. `"unknown"` is
  // reserved for the two licences that ARE unread; a licence B simply cannot see
  // is not quotable at all. The stricter answer is the correct one, and this
  // assertion was written expecting "unknown" until the test said otherwise.
  assert.equal(quotableUnder("NMC-6.3", "guidance", B), false, "quotability leaked to B");
  assert.equal(licenceClause("NMC-6.3", B), null, "the clause leaked to B");
  assert.equal(requiredAttribution("NMC-6.3", B), null, "the credit leaked to B");
  assert.equal(requiresCurrentVersion("NMC-6.3", B), false, "the currency condition leaked to B");

  assert.equal(quotabilityState("PROBE-TERMS", A), "UNREAD", "B's state leaked to A");
  assert.equal(requiresCurrentVersion("PROBE-TERMS", A), false, "B's currency condition leaked to A");
});

test("🔴 B cannot read A's declared gaps", () => {
  const forB = declaredGaps(B);
  assert.equal(forB.length, 1);
  assert.equal(forB.every((g) => g.productId === B), true, "A's gaps reached B");
});

test("🔴 A cannot read B's declared gaps", () => {
  assert.equal(declaredGaps(A).some((g) => g.productId === B), false, "B's gaps reached A");
});

/* ------------------------------------------------------------------ *
 * ⚠️ AND THE SHARING THAT IS CORRECT, ASSERTED SO IT IS NOT "FIXED" LATER.
 * ------------------------------------------------------------------ */

test("both tenants read the ENGINE's general instruments — that sharing is the law", () => {
  for (const p of [A, B]) {
    assert.equal(quotabilityState("OGL-v3.0", p), "PERMITTED", p);
    assert.equal(quotabilityState("proprietary-no-reuse", p), "RESERVED", p);
    assert.equal(quotabilityState("unknown-not-read", p), "UNREAD", p);
  }
  assert.equal("OGL-v3.0" in engineLicences(), true);
  assert.equal("NMC-6.3" in engineLicences(), false, "a product's terms must not be in the engine's own set");
});

test("🔴 an ENGINE instrument may still never be redefined, by anybody", () => {
  assert.throws(() => registerLicences("some-third-product", { "OGL-v3.0": { state: "PERMITTED" } }), /already defined/);
  assert.equal(quotabilityState("OGL-v3.0", A), "PERMITTED", "the attempt damaged the real entry");
});

/* ------------------------------------------------------------------ *
 * 🔴 THE SAFE DIRECTION: AN OMITTED PRODUCT MUST NARROW, NEVER WIDEN.
 * ------------------------------------------------------------------ */

test("🔴 a caller that forgets the product sees the ENGINE's licences only — less, not more", () => {
  const anonymous = licencesVisibleTo(undefined);
  assert.equal("OGL-v3.0" in anonymous, true);
  assert.equal("NMC-6.3" in anonymous, false, "forgetting the product WIDENED what is visible");
  assert.equal("PROBE-TERMS" in anonymous, false);
});

test("🔴 a caller that forgets the product sees NO gaps — not everyone's", () => {
  assert.deepEqual([...declaredGaps(undefined)], [], "forgetting the product exposed every product's gaps");
});

test("both tenants are registered, so these assertions are not passing on an empty set", () => {
  // 🔴 A gate over an empty population proves nothing. This is the population check.
  assert.equal(licenceRegisterProducts().includes(A), true);
  assert.equal(licenceRegisterProducts().includes(B), true);
  assert.equal(gapRegisterProducts().includes(A), true);
  assert.equal(gapRegisterProducts().includes(B), true);
  assert.ok(declaredGaps(A).length > 1, "A must have real gaps, or the isolation checks are vacuous");
});
