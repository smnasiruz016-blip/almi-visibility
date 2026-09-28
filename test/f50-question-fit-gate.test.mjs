/**
 * 🔴 F50 · QUESTION-FIT GATE (RR-80 §3; acceptance _handoffs ef4c6fc) — no ADDRESSES / PARTIALLY_ADDRESSES / DOES_NOT_ADDRESS
 * unless every relied-on capability is read back in scope as an INDEPENDENT VERIFIED claim; otherwise UNKNOWN.
 * Constructed, non-sensitive world: two synthetic tenants, reserved `.invalid` origins, synthetic ids.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { decideFit, isDecided, fitReadinessCensus, FIT_STATES } from "../src/facts/question-fit.mjs";
import { CAPABILITY_KIND, INDEPENDENT, MAX_CLAIMS_PER_CALL } from "../src/facts/capability-claims.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { subject } from "./support/subjects.mjs";
import { rootIndexFor, createTenantResolver } from "../src/tenancy/resolver.mjs";
import { declaredSubjectIds } from "../src/tenancy/root-registry.mjs";

const TA = `tenant:${"9a3e".repeat(8)}`;
const TB = `tenant:${"4c7d".repeat(8)}`;
const ORIGINS = { "https://fit-own.invalid": TA };
const PRODUCTS = { "fit-product-one": TA, "fit-product-two": TB };
function resolve(r) {
  const t = r.resourceKind === "SITE_ORIGIN" ? ORIGINS[r.resourceRef] : r.resourceKind === "FACT_REGISTRY" ? PRODUCTS[r.resourceRef] : undefined;
  return t ? { state: "RESOLVED", reason: "DECLARED", tenantId: t } : { state: "UNDECLARED", reason: "NOT_DECLARED", tenantId: null };
}
resolve.declarations = { readable: true, tenants: [{ tenantId: TA, status: "ACTIVE" }, { tenantId: TB, status: "ACTIVE" }], attachments: [] };
const productResourceOf = (p) => (Object.hasOwn(PRODUCTS, p) ? { resourceKind: "FACT_REGISTRY", resourceRef: p } : null);

const cap = (id, over = {}) => ({
  kind: CAPABILITY_KIND, capabilityId: id, scope: { tenantId: TA, productId: "fit-product-one" },
  source: { class: INDEPENDENT, origin: "https://fit-outside.invalid", tier: 1 }, checker: "human:fit checker", date: "2026-09-28",
  freshness: { state: "FRESH" }, provenance: ["fit-step"], verificationState: "VERIFIED", ...over,
});
const STORE = [
  cap("cap-verified"),
  cap("cap-verified-two"),
  cap("cap-unverified", { verificationState: "UNKNOWN" }),
  cap("cap-self", { source: { class: INDEPENDENT, origin: "https://fit-own.invalid", tier: 1 } }),
  cap("cap-declared", { source: { class: INDEPENDENT, declarationRef: "fit-declaration", tier: 1 }, verificationState: "UNKNOWN" }),
  cap("cap-other-tenant", { scope: { tenantId: TB, productId: "fit-product-two" } }),
];
const ctx = { records: STORE, resolve, productResourceOf };
const ask = (over = {}) => ({ questionId: "fit-q-1", tenantId: TA, productId: "fit-product-one", requestedState: "ADDRESSES", capabilityIds: ["cap-verified"], checker: "human:fit checker", date: "2026-09-28", reason: "fit-reason", ...over });

test("G1 · exactly four outcomes; UNKNOWN is recorded with its reason; anything else is refused", () => {
  assert.deepEqual([...FIT_STATES], ["ADDRESSES", "PARTIALLY_ADDRESSES", "DOES_NOT_ADDRESS", "UNKNOWN"]);
  assert.equal(decideFit(ask({ requestedState: "MOSTLY" }), ctx).refused, "UNKNOWN_FIT_STATE");
  const u = decideFit(ask({ requestedState: "UNKNOWN" }), ctx);
  assert.equal(u.record.outcome, "UNKNOWN");
  assert.match(u.record.reason, /UNKNOWN: REQUESTED/);
  assert.equal(decideFit(ask({ reason: "" }), ctx).refused, "CHECKER_DATE_OR_REASON_ABSENT");
});

test("G2 · a decided state ONLY on in-scope, independent, VERIFIED readback of every relied-on capability — else UNKNOWN", () => {
  const ok = decideFit(ask(), ctx);
  assert.equal(ok.record.outcome, "ADDRESSES", "CONTROL: a verified independent capability decides");
  assert.equal(isDecided(ok.record), true);
  const cases = [
    [["cap-unverified"], /NOT_VERIFIED/],
    [["cap-self"], /NOT_ADMITTED:SELF_SOURCED_CANNOT_BE_VERIFIED/],
    [["cap-other-tenant"], /NOT_READ_BACK_IN_SCOPE/],
    [["cap-missing"], /NOT_READ_BACK_IN_SCOPE/],
    [[], /NO_CAPABILITY_RELIED_ON/],
    [["cap-verified", "cap-unverified"], /cap-unverified=NOT_VERIFIED/],
  ];
  for (const [ids, why] of cases) {
    for (const state of ["ADDRESSES", "DOES_NOT_ADDRESS"]) {
      const r = decideFit(ask({ requestedState: state, capabilityIds: ids }), ctx);
      assert.equal(r.record.outcome, "UNKNOWN", `${state} on [${ids}] was decided`);
      assert.match(r.record.reason, why);
    }
  }
  // another tenant asking about its own product cannot rely on the first tenant's capability
  assert.equal(decideFit(ask({ tenantId: TB, productId: "fit-product-two", capabilityIds: ["cap-verified"] }), ctx).record.outcome, "UNKNOWN");
});

test("G3 · PARTIALLY names both parts, or it is refused as INCOMPLETE and recorded as nothing", () => {
  for (const over of [{ addressedPart: "fit-part-a" }, { unaddressedPart: "fit-part-b" }, { addressedPart: " ", unaddressedPart: "fit-part-b" }]) {
    const r = decideFit(ask({ requestedState: "PARTIALLY_ADDRESSES", ...over }), ctx);
    assert.deepEqual([r.recorded, r.refused], [false, "INCOMPLETE_PARTIALLY"]);
  }
  const full = decideFit(ask({ requestedState: "PARTIALLY_ADDRESSES", addressedPart: "fit-part-a", unaddressedPart: "fit-part-b" }), ctx);
  assert.deepEqual([full.record.outcome, full.record.addressedPart, full.record.unaddressedPart, full.record.unmet], ["PARTIALLY_ADDRESSES", "fit-part-a", "fit-part-b", "fit-part-b"], "CONTROL: a complete PARTIALLY is recorded, with its unmet part kept");
});

test("G4 · wording never decides, and a self-sourced or declared capability never supports a decided state", () => {
  const plain = decideFit(ask(), ctx).record.outcome;
  const worded = decideFit({ ...ask(), questionWording: "fit wording that shares every term with the capability", capabilityWording: "fit wording" }, ctx).record.outcome;
  assert.equal(worded, plain, "adding wording changed the outcome");
  for (const id of ["cap-self", "cap-declared"]) assert.equal(decideFit(ask({ capabilityIds: [id] }), ctx).record.outcome, "UNKNOWN", `${id} supported a decided state`);
});

test("G5 · DOES_NOT_ADDRESS keeps the unmet need with its reason, and the gate writes nothing", () => {
  const before = JSON.stringify(STORE);
  const r = decideFit(ask({ requestedState: "DOES_NOT_ADDRESS", capabilityIds: ["cap-verified", "cap-verified-two"], reason: "fit-unmet-reason" }), ctx);
  assert.deepEqual([r.record.outcome, r.record.unmet], ["DOES_NOT_ADDRESS", "fit-unmet-reason"]);
  assert.equal(JSON.stringify(STORE), before, "the capability store was changed");
  assert.equal(Object.isFrozen(r.record), true);
});

test("G6 · the answer is never read, and never changed", () => {
  const a = decideFit({ ...ask(), answer: { text: "fit-answer", state: "UNKNOWN" } }, ctx).record;
  const b = decideFit(ask(), ctx).record;
  assert.equal(a.outcome, b.outcome);
  assert.equal(Object.hasOwn(a, "answer"), false, "the fit record carries an answer");
});

test("G7 · the REAL population of usable capabilities is printed with its bound; while it is zero, nothing can be decided", async () => {
  const records = [];
  let registries = 0;
  for (const id of declaredSubjectIds(rootIndexFor())) {
    let s;
    try { s = await subject(id); } catch { continue; }
    if (typeof s?.factsDir !== "string") continue;
    registries += 1;
    records.push(...(await loadRegistry(s.factsDir, s.productId)).records);
  }
  const real = fitReadinessCensus(records, { resolve: createTenantResolver(), productResourceOf: () => null });
  console.log(`[G7 real] registries ${registries} · records ${real.population} · bound ${real.bound} · usable verified independent capabilities ${real.usableVerifiedIndependent}`);
  assert.ok(registries >= 1 && real.population > 0, "an empty population is not a pass");
  assert.equal(real.usableVerifiedIndependent, 0, "a verified independent capability exists — the real fit outcomes are no longer necessarily UNKNOWN; re-measure");
  assert.equal(real.bound, MAX_CLAIMS_PER_CALL);
  assert.equal(fitReadinessCensus(STORE, { resolve, productResourceOf }).usableVerifiedIndependent, 3, "CONTROL: the census counts usable capabilities when they exist");
});
