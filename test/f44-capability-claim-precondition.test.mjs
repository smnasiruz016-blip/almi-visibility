/**
 * 🔴 F44 · CAPABILITY-CLAIM PRECONDITION — the owner's three conditions (RR-79 §3) and the admission fields (RR-78 §1.2),
 * each proved on the production code path (src/facts/capability-claims.mjs, src/evidence/source-tiers.mjs).
 *
 *   Acceptance: _handoffs/AlmiVisibility_F44_CAPABILITY_CLAIM_PRECONDITION_ACCEPTANCE_2026-09-28.md (d6a41a3).
 *
 * The world is CONSTRUCTED and non-sensitive: two synthetic tenants, reserved `.invalid` origins, synthetic product and
 * capability ids. No real tenant, host, product claim or registry record is written or read here, except the read-only census
 * of the real registries in P4, which counts and never prints a record.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  admitCapabilityClaim, independentCorroboration, presentAsThirdParty, independentTierOf, readCapabilityClaims,
  registryCapabilityCensus, firstPartyOf, SELF_SOURCED, INDEPENDENT, MAX_CLAIMS_PER_CALL, CAPABILITY_KIND,
} from "../src/facts/capability-claims.mjs";
import { sourceTierOfFact, sourceRecordFromFact } from "../src/evidence/source-tiers.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { subject } from "./support/subjects.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { declaredSubjectIds } from "../src/tenancy/root-registry.mjs";

// ── the constructed world ────────────────────────────────────────────────────
const TA = `tenant:${"5e1f".repeat(8)}`;
const TB = `tenant:${"b0c4".repeat(8)}`;
const TC_INACTIVE = `tenant:${"d7a9".repeat(8)}`;
const ORIGINS = {
  "https://capa-own.invalid": { state: "RESOLVED", tenantId: TA },
  "https://capa-other.invalid": { state: "RESOLVED", tenantId: TB },
  "https://capa-split.invalid": { state: "AMBIGUOUS", tenantId: null },
};
const PRODUCTS = { "capa-product-one": { state: "RESOLVED", tenantId: TA }, "capa-product-two": { state: "RESOLVED", tenantId: TB } };
function resolve(resource) {
  const table = resource.resourceKind === "SITE_ORIGIN" ? ORIGINS : resource.resourceKind === "FACT_REGISTRY" ? PRODUCTS : {};
  const hit = table[resource.resourceRef];
  if (!hit) return { state: "UNDECLARED", reason: "NOT_DECLARED", tenantId: null };
  return { ...hit, reason: hit.state === "RESOLVED" ? "DECLARED" : "CONFLICT" };
}
resolve.declarations = { readable: true, tenants: [{ tenantId: TA, status: "ACTIVE" }, { tenantId: TB, status: "ACTIVE" }, { tenantId: TC_INACTIVE, status: "RETIRED" }], attachments: [] };
const productResourceOf = (productId) => (Object.hasOwn(PRODUCTS, productId) ? { resourceKind: "FACT_REGISTRY", resourceRef: productId } : null);
const ctx = { resolve, productResourceOf };

const claim = (over = {}) => ({
  kind: CAPABILITY_KIND,
  capabilityId: "capa-cap-x",
  scope: { tenantId: TA, productId: "capa-product-one" },
  source: { class: INDEPENDENT, origin: "https://capa-outside.invalid", tier: 1 },
  checker: "human:capa checker",
  date: "2026-09-28",
  freshness: { state: "FRESH" },
  provenance: ["capa-step-1"],
  verificationState: "UNKNOWN",
  ...over,
});
const fromDeclaration = (over = {}) => claim({ source: { class: INDEPENDENT, declarationRef: "capa-declaration-1", tier: 1 }, ...over });
const fromOwnOrigin = (over = {}) => claim({ source: { class: INDEPENDENT, origin: "https://capa-own.invalid", tier: 1 }, ...over });

// ── P1 · SELF-SOURCED marking ───────────────────────────────────────────────
test("P1a · the owner's own declaration is marked SELF-SOURCED whatever class the record states", () => {
  const a = admitCapabilityClaim(fromDeclaration(), ctx);
  assert.equal(a.admitted, true, a.refusals.join());
  assert.equal(a.record.source.class, SELF_SOURCED);
  assert.equal(a.record.firstParty.basis, "OWNER_DECLARATION");
  assert.equal(a.record.firstParty.reclassified, true, "the stated INDEPENDENT was overruled, and the record says so");
});

test("P1b · a source origin declared to the claim's OWN tenant is first-party (F02 decides, not the label)", () => {
  const a = admitCapabilityClaim(fromOwnOrigin(), ctx);
  assert.equal(a.record.source.class, SELF_SOURCED);
  assert.equal(a.record.firstParty.basis, "ORIGIN_OF_THE_CLAIMS_OWN_TENANT");
  // controls: another tenant's origin and an origin declared to nobody are NOT first-party
  assert.equal(admitCapabilityClaim(claim({ source: { class: INDEPENDENT, origin: "https://capa-other.invalid", tier: 2 } }), ctx).record.source.class, INDEPENDENT);
  assert.equal(admitCapabilityClaim(claim(), ctx).record.source.class, INDEPENDENT);
});

test("P1c · an origin F02 cannot place is REFUSED, never assumed independent (fails closed)", () => {
  const a = admitCapabilityClaim(claim({ source: { class: INDEPENDENT, origin: "https://capa-split.invalid", tier: 1 } }), ctx);
  assert.equal(a.admitted, false);
  assert.ok(a.refusals.includes("FIRST_PARTY_UNDECIDABLE_AMBIGUOUS_REFUSED"), a.refusals.join());
  assert.equal(firstPartyOf(claim({ source: { class: INDEPENDENT, tier: 1 } }), ctx).reason, "SOURCE_ORIGIN_ABSENT");
});

test("P1d · a self-sourced claim is NEVER counted as independent corroboration of itself — the mixed population, printed with its bound", () => {
  const selfOnly = [fromDeclaration(), fromOwnOrigin(), fromOwnOrigin({ provenance: ["capa-step-2"] })];
  const c0 = independentCorroboration("capa-cap-x", selfOnly, ctx);
  console.log(`[P1d self-only] population ${c0.population} · bound ${c0.bound} · independent ${c0.independent} · self-sourced excluded ${c0.selfSourcedExcluded} · refused ${c0.refused}`);
  assert.deepEqual([c0.population, c0.independent, c0.selfSourcedExcluded, c0.refused], [3, 0, 3, 0], "a claim supported only by self-sourced records has ZERO independent corroboration");

  const mixed = [...selfOnly, claim(), claim({ source: { class: INDEPENDENT, origin: "https://capa-other.invalid", tier: 2 } }), claim({ checker: "" }), claim({ capabilityId: "capa-cap-y" })];
  const c1 = independentCorroboration("capa-cap-x", mixed, ctx);
  console.log(`[P1d mixed] population ${c1.population} · bound ${c1.bound} · independent ${c1.independent} · self-sourced excluded ${c1.selfSourcedExcluded} · refused ${c1.refused}`);
  assert.deepEqual([c1.population, c1.independent, c1.selfSourcedExcluded, c1.refused, c1.bound], [7, 2, 3, 1, MAX_CLAIMS_PER_CALL], "CONTROL: independent records DO count, so the zero above is the marking, not a counter that never counts");
});

test("P1e · a self-sourced record is never presented as third-party evidence", () => {
  assert.throws(() => presentAsThirdParty(admitCapabilityClaim(fromDeclaration(), ctx).record), /SELF_SOURCED_IS_NOT_THIRD_PARTY/);
  assert.equal(presentAsThirdParty(admitCapabilityClaim(claim(), ctx).record).sourceClass, INDEPENDENT, "CONTROL: an independent one is presented");
});

// ── P2 · demotion from the independent tier ─────────────────────────────────
test("P2a · a first-party claim holds NO independent tier, whatever tier it declares", () => {
  for (const declared of [1, 2, 3, 4, "OFFICIAL", null]) {
    const r = admitCapabilityClaim(fromOwnOrigin({ source: { class: INDEPENDENT, origin: "https://capa-own.invalid", tier: declared } }), ctx).record;
    assert.equal(r.source.tier, null, `declared tier ${declared} survived on a self-sourced record`);
    assert.equal(r.source.declaredTier, declared, "the declared tier is kept apart, for audit");
    assert.equal(independentTierOf(r), null);
  }
  assert.equal(independentTierOf(admitCapabilityClaim(claim(), ctx).record), 1, "CONTROL: an independent tier-1 record keeps tier 1");
});

test("P2b · the evidence-tier reader refuses to rank a self-sourced capability claim at ANY tier", () => {
  const selfRec = admitCapabilityClaim(fromDeclaration(), ctx).record;
  assert.throws(() => sourceTierOfFact(selfRec), /holds no evidence tier/);
  assert.throws(() => sourceTierOfFact({ ...selfRec, verification: { sourceTier: "OFFICIAL" } }), /holds no evidence tier/, "a NAMED tier does not rescue it either");
  assert.throws(() => sourceRecordFromFact({ ...selfRec, id: "capa-rec" }), /holds no evidence tier/);
  assert.equal(sourceTierOfFact(admitCapabilityClaim(claim(), ctx).record), "OFFICIAL", "CONTROL: an independent capability claim is ranked");
});

test("P2c · a self-sourced claim never reaches VERIFIED; a declaration is never verification", () => {
  const a = admitCapabilityClaim(fromDeclaration({ verificationState: "VERIFIED" }), ctx);
  assert.equal(a.admitted, false);
  assert.ok(a.refusals.includes("SELF_SOURCED_CANNOT_BE_VERIFIED"));
  assert.ok(admitCapabilityClaim(fromOwnOrigin({ verificationState: "VERIFIED" }), ctx).refusals.includes("SELF_SOURCED_CANNOT_BE_VERIFIED"));
  assert.equal(admitCapabilityClaim(claim({ verificationState: "VERIFIED" }), ctx).admitted, true, "CONTROL: an independent source may be VERIFIED");
});

// ── P3 · product/tenant scope ───────────────────────────────────────────────
test("P3a · a claim without scope, or with a product of ANOTHER tenant, is refused", () => {
  assert.ok(admitCapabilityClaim(claim({ scope: { productId: "capa-product-one" } }), ctx).refusals.includes("SCOPE_TENANT_ABSENT"));
  assert.ok(admitCapabilityClaim(claim({ scope: { tenantId: TA } }), ctx).refusals.includes("SCOPE_PRODUCT_ABSENT"));
  assert.ok(admitCapabilityClaim(claim({ scope: { tenantId: TA, productId: "capa-product-two" } }), ctx).refusals.includes("PRODUCT_NOT_OF_THIS_TENANT_CROSS_TENANT_REFUSED"));
  assert.ok(admitCapabilityClaim(claim({ scope: { tenantId: TA, productId: "capa-product-none" } }), ctx).refusals.includes("PRODUCT_NOT_DECLARED"));
  assert.equal(admitCapabilityClaim(claim(), ctx).admitted, true, "CONTROL: the product of the claim's own tenant is admitted");
});

test("P3b · a claim cannot be read outside its own scope — the mixed population, printed with its bound", () => {
  const store = [
    admitCapabilityClaim(claim(), ctx).record,
    admitCapabilityClaim(fromDeclaration(), ctx).record,
    admitCapabilityClaim(claim({ scope: { tenantId: TB, productId: "capa-product-two" }, source: { class: INDEPENDENT, origin: "https://capa-outside.invalid", tier: 2 } }), ctx).record,
    { kind: "primary", scope: { tenantId: TA, productId: "capa-product-one" } },
  ];
  assert.equal(store.filter((r) => r === null).length, 0);
  const a = readCapabilityClaims(store, { resolve, requestedTenantId: TA, productId: "capa-product-one" });
  console.log(`[P3b read A] population ${a.population} · bound ${a.bound} · returned ${a.returned} · withheld ${a.withheld}`);
  assert.deepEqual([a.returned, a.withheld], [2, 2]);
  assert.ok(a.claims.every((r) => r.scope.tenantId === TA && r.scope.productId === "capa-product-one"));
  assert.equal(readCapabilityClaims(store, { resolve, requestedTenantId: TB, productId: "capa-product-one" }).returned, 0, "tenant B cannot read tenant A's product");
  assert.equal(readCapabilityClaims(store, { resolve, requestedTenantId: TA, productId: "capa-product-two" }).returned, 0, "tenant A cannot read tenant B's product");
  assert.equal(readCapabilityClaims(store, { resolve, requestedTenantId: TB, productId: "capa-product-two" }).returned, 1, "CONTROL: tenant B reads its own");
  const none = readCapabilityClaims(store, { resolve, requestedTenantId: null, productId: "capa-product-one" });
  assert.deepEqual([none.returned, none.refused], [0, "NO_TENANT_REQUESTED"], "no tenant, no claims");
  assert.equal(readCapabilityClaims(store, { resolve, requestedTenantId: TC_INACTIVE, productId: "capa-product-one" }).returned, 0, "a tenant that is not ACTIVE reads nothing");
});

// ── P4 · admission fields, bound, and nothing stored ────────────────────────
test("P4a · every field RR-78 §1.2 names is required — each absence refused by its own code", () => {
  const cases = [
    ["SOURCE_ABSENT", { source: null }],
    ["SOURCE_CLASS_ABSENT_OR_UNKNOWN", { source: { origin: "https://capa-outside.invalid", tier: 1 } }],
    ["SOURCE_CLASS_ABSENT_OR_UNKNOWN", { source: { class: "THIRD_PARTY", origin: "https://capa-outside.invalid" } }],
    ["CHECKER_ABSENT", { checker: " " }],
    ["DATE_ABSENT_OR_MALFORMED", { date: "28 Sep" }],
    ["FRESHNESS_STATE_ABSENT", { freshness: {} }],
    ["PROVENANCE_CHAIN_ABSENT", { provenance: [] }],
    ["NOT_A_CAPABILITY_CLAIM", { kind: "primary" }],
  ];
  for (const [code, over] of cases) {
    const a = admitCapabilityClaim(claim(over), ctx);
    assert.equal(a.admitted, false, `${code}: admitted`);
    assert.ok(a.refusals.includes(code), `${code} not among ${a.refusals.join()}`);
  }
  assert.equal(admitCapabilityClaim(claim(), ctx).admitted, true, "CONTROL: the complete claim is admitted");
});

test("P4b · a population above the bound is refused, by name (LAW-BOUND-1)", () => {
  const over = Array.from({ length: MAX_CLAIMS_PER_CALL + 1 }, () => claim());
  assert.throws(() => independentCorroboration("capa-cap-x", over, ctx), /POPULATION_OVER_BOUND/);
  assert.throws(() => readCapabilityClaims(over, { resolve, requestedTenantId: TA, productId: "capa-product-one" }), /POPULATION_OVER_BOUND/);
});

test("P4c · the REAL registries hold ZERO capability claims (nothing was stored), and the census can fire", async () => {
  const counted = [];
  /* every DECLARED subject, enumerated from the root registry — a generic test names none (F09) */
  for (const id of declaredSubjectIds(rootIndexFor())) {
    let s;
    try { s = await subject(id); } catch { continue; }
    if (typeof s?.factsDir !== "string") continue;
    const { records } = await loadRegistry(s.factsDir, s.productId);
    counted.push(registryCapabilityCensus(records));
  }
  const population = counted.reduce((n, c) => n + c.population, 0);
  const capability = counted.reduce((n, c) => n + c.capabilityClaims, 0);
  console.log(`[P4c real registries] registries ${counted.length} · records ${population} · bound per registry ${MAX_CLAIMS_PER_CALL} · capability claims ${capability}`);
  assert.ok(counted.length >= 1 && population > 0, "the census read no real registry — an empty population is not a pass");
  assert.equal(capability, 0, "a capability claim is stored in a real registry");
  assert.equal(registryCapabilityCensus([{ kind: "primary" }, claim()]).capabilityClaims, 1, "CONTROL: a planted capability claim is counted");
});
