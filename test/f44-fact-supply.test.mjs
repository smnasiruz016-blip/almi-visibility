/**
 * F44 · VERIFIED FACT SUPPLY (acceptance _handoffs eecdfe4, RR-113).
 *
 * Fixtures DRIVE the rules (hand-counted below); the REAL test reads the declared product's own registry through its own scope and is
 * the only source of reported figures. The capability rules are driven through the EXISTING admission (capability-claims.mjs) in a
 * constructed tenant world, as its own precondition test does. Nothing is fetched or re-checked; the production trail is not written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { auditFactSupply, FIELDS, DERIVED_WAIVED, VERDICT, MISSING } from "../src/facts/fact-supply.mjs";
import { readFactSupply, capabilityContext } from "../src/facts/fact-supply-reader.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { admitCapabilityClaim, CAPABILITY_KIND, INDEPENDENT } from "../src/facts/capability-claims.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const fact = (over = {}) => ({
  claim: { subject: "s", predicate: "p", qualifier: "q" }, value: { value: 1, valueType: "count", unit: "items" }, scope: "x",
  source: { url: "https://src.invalid/a", tier: 1 }, verification: { checkedBy: "human:c", checkedOn: "2026-09-12" },
  freshness: { rule: "machine-fingerprint", days: 180 }, provenance: { route: "r" }, ...over,
});
const noAdmit = () => { throw new Error("no capability claim was expected"); };

// ── the constructed tenant world for the existing admission ──
const TA = `tenant:${"5e1f".repeat(8)}`, TB = `tenant:${"b0c4".repeat(8)}`;
const ORIGINS = { "https://own.invalid": { state: "RESOLVED", tenantId: TA }, "https://other.invalid": { state: "RESOLVED", tenantId: TB } };
const PRODUCTS = { "prod-one": { state: "RESOLVED", tenantId: TA } };
function resolve(resource) {
  const table = resource.resourceKind === "SITE_ORIGIN" ? ORIGINS : resource.resourceKind === "FACT_REGISTRY" ? PRODUCTS : {};
  const hit = table[resource.resourceRef];
  return hit ? { ...hit, reason: "DECLARED" } : { state: "UNDECLARED", reason: "NOT_DECLARED", tenantId: null };
}
resolve.declarations = { readable: true, tenants: [{ tenantId: TA, status: "ACTIVE" }, { tenantId: TB, status: "ACTIVE" }], attachments: [] };
const ctx = { resolve, productResourceOf: (id) => (Object.hasOwn(PRODUCTS, id) ? { resourceKind: "FACT_REGISTRY", resourceRef: id } : null) };
const admit = (c) => admitCapabilityClaim(c, ctx);
const cap = (over = {}) => ({ kind: CAPABILITY_KIND, capabilityId: "cap-x", scope: { tenantId: TA, productId: "prod-one" }, source: { class: INDEPENDENT, origin: "https://outside.invalid", tier: 1 },
  checker: "human:c", date: "2026-09-28", freshness: { state: "FRESH" }, provenance: ["step"], verificationState: "UNKNOWN", ...over });

/* ================= C1 / C2 — one registry; nine recorded fields ================= */

test("C2 · FIRING CONTROL: each of the nine fields is PRESENT at its recorded path, and one ABSENT record DISPROVES that field alone", () => {
  for (const name of Object.keys(FIELDS)) {
    const broken = fact();
    const path = { claim: ["claim", "subject"], value: ["value", "value"], scope: ["scope"], source: ["source", "url"], tier: ["source", "tier"], checker: ["verification", "checkedBy"], date: ["verification", "checkedOn"], freshness: ["freshness", "days"], provenance: ["provenance", "route"] }[name];
    let o = broken; for (const k of path.slice(0, -1)) { o[k] = { ...o[k] }; o = o[k]; } delete o[path.at(-1)];
    const a = auditFactSupply([fact(), broken], { admit: noAdmit });
    assert.deepEqual([a.fields[name].present, a.fields[name].absent, a.fields[name].verdict], [1, 1, VERDICT.DISPROVED], `${name}: an absent field was not counted`);
    for (const other of Object.keys(FIELDS).filter((x) => x !== name)) assert.equal(a.fields[other].verdict, VERDICT.PROVED, `${name} removed, but ${other} moved`);
  }
  assert.equal(auditFactSupply([fact()], { admit: noAdmit }).fields.claim.verdict, VERDICT.PROVED);
});

test("C2 · a qualifier recorded as null is the schema's 'no qualifier' — present; a missing qualifier key is ABSENT", () => {
  const nul = fact({ claim: { subject: "s", predicate: "p", qualifier: null } });
  const missing = fact({ claim: { subject: "s", predicate: "p" } });
  const a = auditFactSupply([nul, missing], { admit: noAdmit });
  assert.deepEqual([a.fields.claim.present, a.fields.claim.absent], [1, 1]);
});

test("C1 · records the registry declares derived are counted apart, and an empty population never reads PROVED", () => {
  const derived = { kind: "derived", claim: { subject: "s", predicate: "d", qualifier: null }, value: { value: 2, valueType: "derived", unit: null }, derivation: { formula: "f", inputs: ["a", "b"] } };
  const a = auditFactSupply([fact(), derived], { admit: noAdmit });
  assert.deepEqual([a.records, a.primary, a.derived.records], [2, 1, 1]);
  const empty = auditFactSupply([], { admit: noAdmit });
  assert.equal(empty.fields.source.verdict, VERDICT.COULD_NOT_PROVE, "an empty population read PROVED");
  assert.equal(empty.verdict, VERDICT.COULD_NOT_PROVE);
});

/* ================= C3 — unit never judged ================= */

test("C3 · FIRING CONTROL: a unit is counted recorded or recorded-empty by value type, never judged required", () => {
  const a = auditFactSupply([fact(), fact({ value: { value: "r", valueType: "rule", unit: null } }), fact({ value: { value: "r", valueType: "rule", unit: "" } })], { admit: noAdmit });
  assert.deepEqual(a.unit.byValueType, { count: { recorded: 1, "recorded-empty": 0 }, rule: { recorded: 0, "recorded-empty": 2 } });
  assert.equal(a.unit.verdict, VERDICT.COULD_NOT_PROVE, "a unit was judged");
  assert.equal(a.unit.missing, MISSING.unitRule);
});

/* ================= C4 — the derived waiver ================= */

test("C4 · FIRING CONTROL: the waiver reaches only records declared derived; a derived record without its derivation DISPROVES the part", () => {
  assert.deepEqual([...DERIVED_WAIVED], ["source", "tier", "checker", "date", "freshness"]);
  const sourceless = fact({ source: undefined, verification: undefined, freshness: undefined });
  const notDeclared = auditFactSupply([sourceless], { admit: noAdmit });
  assert.equal(notDeclared.fields.source.verdict, VERDICT.DISPROVED, "a waiver reached a record not declared derived");
  const good = { kind: "derived", claim: { subject: "s", predicate: "d", qualifier: null }, value: { value: 2 }, derivation: { inputs: ["a", "b"] } };
  const bad = { kind: "derived", claim: { subject: "s", predicate: "e", qualifier: null }, value: { value: 3 } };
  assert.deepEqual([auditFactSupply([good], { admit: noAdmit }).derived.verdict, auditFactSupply([good], { admit: noAdmit }).derived.inputs], [VERDICT.PROVED, 2]);
  assert.equal(auditFactSupply([good, bad], { admit: noAdmit }).derived.verdict, VERDICT.DISPROVED);
});

/* ================= C5 — capability claims by the existing rules ================= */

test("C5 · FIRING CONTROL: capability claims go through the existing admission — an owner-declared source is SELF-SOURCED with no tier; a VERIFIED self-sourced claim is refused and DISPROVES", () => {
  const independent = cap();
  const selfDeclared = cap({ source: { class: INDEPENDENT, declarationRef: "owner-decl-1", tier: 1 } });
  const a = auditFactSupply([independent, selfDeclared], { admit });
  assert.deepEqual([a.capability.claims, a.capability.admitted, a.capability.selfSourced, a.capability.selfSourcedWithATier], [2, 2, 1, 0]);
  assert.equal(a.capability.verdict, VERDICT.PROVED);
  const verifiedSelf = cap({ source: { class: INDEPENDENT, declarationRef: "owner-decl-1", tier: 1 }, verificationState: "VERIFIED" });
  const b = auditFactSupply([verifiedSelf], { admit });
  assert.equal(b.capability.refusedBy.SELF_SOURCED_CANNOT_BE_VERIFIED, 1);
  assert.equal(b.capability.verdict, VERDICT.DISPROVED, "a self-sourced claim reached VERIFIED");
  const otherTenant = cap({ scope: { tenantId: TB, productId: "prod-one" } });
  assert.equal(auditFactSupply([otherTenant], { admit }).capability.verdict, VERDICT.DISPROVED, "a claim crossed its product's tenant");
});

test("C5 · an empty capability population is reported empty and COULD-NOT-PROVE, never PROVED", () => {
  const a = auditFactSupply([fact()], { admit: noAdmit });
  assert.deepEqual([a.capability.claims, a.capability.verdict, a.capability.missing], [0, VERDICT.COULD_NOT_PROVE, MISSING.noCapability]);
});

/* ================= C6 — verdicts ================= */

test("C6 · FIRING CONTROL: one DISPROVED part disproves the row; the row is never PROVED while unit stays unjudged", () => {
  assert.equal(auditFactSupply([fact({ provenance: undefined })], { admit: noAdmit }).verdict, VERDICT.DISPROVED);
  assert.equal(auditFactSupply([fact()], { admit: noAdmit }).verdict, VERDICT.COULD_NOT_PROVE);
});

/* ================= REAL ================= */

test("REAL · the declared product's registry: every field counted against the non-derived records; nothing reads PROVED overall", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const a = await readFactSupply(product);
  assert.ok(a.primary > 0, "EMPTY real population");
  for (const [name, f] of Object.entries(a.fields)) assert.equal(f.present + f.absent, a.primary, `${name} lost a record`);
  assert.equal(a.primary + a.derived.records, a.records);
  assert.notEqual(a.verdict, VERDICT.PROVED);
  console.log(`  REAL (count-only, the declared product's own registry): ${JSON.stringify({ records: a.records, primary: a.primary, fields: Object.fromEntries(Object.entries(a.fields).map(([k, f]) => [k, `${f.present}/${f.denominator} ${f.verdict}`])), unit: a.unit.byValueType, derived: a.derived, capability: { claims: a.capability.claims, verdict: a.capability.verdict }, verdict: a.verdict })}`);
});

test("C5 · REAL RESOLVER: the reader's context admits a claim of the product's OWN tenant and refuses one scoped to another tenant", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const real = createTenantResolver();
  const own = resolveSide(real, RESOURCES.subject(product.productId)).tenantId;
  const d = readDeclarations();
  const other = (d.tenants?.tenants ?? d.tenants).map((x) => x.tenantId).find((id) => id !== own);
  assert.ok(own && other, "the real tenancy declares no two tenants");
  const c = capabilityContext(product, real);
  const base = { kind: CAPABILITY_KIND, capabilityId: "cap-r", source: { class: INDEPENDENT, origin: "https://outside.invalid", tier: 1 }, checker: "human:c", date: "2026-10-01", freshness: { state: "FRESH" }, provenance: ["step"], verificationState: "UNKNOWN" };
  assert.equal(admitCapabilityClaim({ ...base, scope: { tenantId: own, productId: product.productId } }, c).admitted, true, "the product's own tenant was refused");
  const crossed = admitCapabilityClaim({ ...base, scope: { tenantId: other, productId: product.productId } }, c);
  assert.equal(crossed.admitted, false, "a claim crossed into another tenant's product");
  assert.ok(crossed.refusals.some((r) => r.startsWith("PRODUCT_NOT_OF_THIS_TENANT")));
  assert.equal(admitCapabilityClaim({ ...base, scope: { tenantId: own, productId: "another-product" } }, c).refusals.includes("PRODUCT_NOT_DECLARED"), true);
});

/* ================= the entry point, no network ================= */

test("C1 · THE ENTRY POINT: in a declared world it prints every field with its denominator, the empty capability population, no URL, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/fact-supply.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+\d+ record\(s\): \d+ non-derived, \d+ derived/);
    for (const name of Object.keys(FIELDS)) assert.match(ok.stdout, new RegExp(`  ${name}\\s+present \\d+ of \\d+ · absent \\d+ — `), `missing ${name}`);
    assert.match(ok.stdout, /unit\s+never judged — missing an owner declaration/);
    assert.match(ok.stdout, /capability\s+(0 capability claim\(s\) recorded — the population is EMPTY, never a pass|\d+ claim\(s\): admitted)/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C1 · the audit and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/facts/fact-supply.mjs", "src/facts/fact-supply-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
