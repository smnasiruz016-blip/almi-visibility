/**
 * F44 · VERIFIED FACT SUPPLY (acceptance _handoffs eecdfe4, RR-113; ACCEPTANCE AMENDMENT 1, _handoffs 1fe07aa, RR-251: the unit is judged by
 * the owner's rule — money, duration and count only; a capability record exists only as an owner-approved questionnaire answer and is
 * judged by C5, not by the nine fields; the row can read PROVED, and only when every part does).
 *
 * Fixtures DRIVE the rules (hand-counted below); the REAL test reads the declared product's own registry through its own scope and is
 * the only source of reported figures. The capability rules are driven through the EXISTING admission (capability-claims.mjs) in a
 * constructed tenant world, as its own precondition test does. Nothing is fetched or re-checked; the production trail is not written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync, execFileSync } from "node:child_process";

import { auditFactSupply, FIELDS, DERIVED_WAIVED, VERDICT, MISSING } from "../src/facts/fact-supply.mjs";
import { readFactSupply, capabilityContext } from "../src/facts/fact-supply-reader.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { admitCapabilityClaim, CAPABILITY_KIND, INDEPENDENT } from "../src/facts/capability-claims.mjs";
import { capabilityClaimsOf, UNIT_REQUIRED_VALUE_TYPES, QUESTIONNAIRE_FILE } from "../src/questionnaire/product-questionnaire.mjs";
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
/* Amendment 1, C5: a capability record IS an approved questionnaire answer naming its committed approval record */
const APPROVAL = { state: "APPROVED", by: "owner", on: "2026-09-28", record: { repo: "records", path: "approval.md", commit: "a".repeat(40) } };
const OF_AN_ANSWER = { questionnaireId: "q-one", answerId: "cap-x", approval: APPROVAL };
const cap = (over = {}) => ({ questionnaire: OF_AN_ANSWER, kind: CAPABILITY_KIND, capabilityId: "cap-x", scope: { tenantId: TA, productId: "prod-one" }, source: { class: INDEPENDENT, origin: "https://outside.invalid", tier: 1 },
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

/* ================= C3 — the unit, by the owner's rule (Amendment 1) ================= */

test("C3 · FIRING CONTROL: a unit is counted recorded or recorded-empty by value type; an empty string is recorded-empty", () => {
  const a = auditFactSupply([fact(), fact({ value: { value: "r", valueType: "rule", unit: null } }), fact({ value: { value: "r", valueType: "rule", unit: "" } })], { admit: noAdmit });
  assert.deepEqual(a.unit.byValueType, { count: { recorded: 1, "recorded-empty": 0 }, rule: { recorded: 0, "recorded-empty": 2 } });
  assert.deepEqual([a.unit.required, a.unit.requiredWithAUnit, a.unit.requiredWithoutAUnit, a.unit.denominator], [1, 1, 0, 3]);
  const blank = auditFactSupply([fact({ value: { value: 1, valueType: "count", unit: "" } })], { admit: noAdmit });
  assert.deepEqual(blank.unit.byValueType, { count: { recorded: 0, "recorded-empty": 1 } }, "an empty unit was counted as recorded");
});

test("C3 · FIRING CONTROL: a unit is required ONLY of money, duration and count — one such record without it DISPROVES, each type alone", () => {
  assert.deepEqual([...UNIT_REQUIRED_VALUE_TYPES], ["money", "duration", "count"]);
  for (const valueType of UNIT_REQUIRED_VALUE_TYPES) {
    const withUnit = fact({ value: { value: 1, valueType, unit: "u" } });
    const bare = fact({ value: { value: 1, valueType, unit: null } });
    assert.equal(auditFactSupply([withUnit], { admit: noAdmit }).unit.verdict, VERDICT.PROVED, `${valueType}: every record carries a unit, yet the unit is not PROVED`);
    const a = auditFactSupply([withUnit, bare], { admit: noAdmit });
    assert.deepEqual([a.unit.required, a.unit.requiredWithoutAUnit, a.unit.verdict], [2, 1, VERDICT.DISPROVED], `${valueType}: a bare number did not DISPROVE the unit`);
    assert.equal(a.verdict, VERDICT.DISPROVED, `${valueType}: a bare number did not disprove the row`);
  }
});

test("C3 · a value type outside the owner's three is reported and NEVER judged; with no money, duration or count record the unit is COULD-NOT-PROVE", () => {
  const others = ["rule", "enum", "list", "entity", "grade-set", "boolean-with-consequence"].map((valueType) => fact({ value: { value: "v", valueType, unit: null } }));
  const none = auditFactSupply(others, { admit: noAdmit });
  assert.deepEqual([none.unit.required, none.unit.verdict, none.unit.missing], [0, VERDICT.COULD_NOT_PROVE, MISSING.noUnitRecord], "the unit read PROVED on an empty required population, or a type outside the three was judged");
  const mixed = auditFactSupply([fact(), ...others], { admit: noAdmit });
  assert.deepEqual([mixed.unit.required, mixed.unit.requiredWithoutAUnit, mixed.unit.verdict], [1, 0, VERDICT.PROVED], "a unit-less record of another value type was judged");
});

test("C3 · EACH record's unit is read, whatever its kind: a derived or a capability record with a bare money, duration or count value DISPROVES", () => {
  const derivedBare = { kind: "derived", claim: { subject: "s", predicate: "d", qualifier: null }, value: { value: 2, valueType: "duration", unit: null }, derivation: { inputs: ["a"] } };
  assert.equal(auditFactSupply([fact(), derivedBare], { admit: noAdmit }).unit.verdict, VERDICT.DISPROVED, "a derived record's bare duration was not read");
  const capBare = cap({ source: { class: INDEPENDENT, declarationRef: "owner-decl-1" }, value: { value: 12, valueType: "money", unit: null } });
  const a = auditFactSupply([fact(), capBare], { admit });
  assert.deepEqual([a.unit.byValueType.money, a.unit.verdict], [{ recorded: 0, "recorded-empty": 1 }, VERDICT.DISPROVED], "a capability record's bare price was not read");
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

test("C2/C5 · a capability record is NOT among the nine-field records: it is judged by C5, and it never moves a field's count", () => {
  const withCap = auditFactSupply([fact(), cap({ source: { class: INDEPENDENT, declarationRef: "owner-decl-1" } })], { admit });
  assert.deepEqual([withCap.records, withCap.primary, withCap.derived.records, withCap.capability.claims], [2, 1, 0, 1]);
  for (const [name, f] of Object.entries(withCap.fields)) assert.deepEqual([f.present, f.absent, f.denominator, f.verdict], [1, 0, 1, VERDICT.PROVED], `${name}: a capability record was counted among the nine-field records`);
});

test("C5 · FIRING CONTROL: a capability record that is not an APPROVED answer naming its committed record DISPROVES — each missing limb alone", () => {
  const self = { source: { class: INDEPENDENT, declarationRef: "owner-decl-1" } };
  assert.deepEqual((({ ofAnApprovedAnswer, notOfAnApprovedAnswer, verdict }) => [ofAnApprovedAnswer, notOfAnApprovedAnswer, verdict])(auditFactSupply([cap(self)], { admit }).capability), [1, 0, VERDICT.PROVED]);
  const broken = {
    "no questionnaire mark at all": undefined,
    "a PENDING answer": { ...OF_AN_ANSWER, approval: { ...APPROVAL, state: "PENDING" } },
    "a REJECTED answer": { ...OF_AN_ANSWER, approval: { ...APPROVAL, state: "REJECTED" } },
    "an approval naming no record": { ...OF_AN_ANSWER, approval: { ...APPROVAL, record: undefined } },
    "an approval whose record names no commit": { ...OF_AN_ANSWER, approval: { ...APPROVAL, record: { ...APPROVAL.record, commit: "abc123" } } },
    "an approval with no approver": { ...OF_AN_ANSWER, approval: { ...APPROVAL, by: "" } },
    "no answer id": { ...OF_AN_ANSWER, answerId: undefined },
  };
  for (const [why, questionnaire] of Object.entries(broken)) {
    const a = auditFactSupply([cap(self), cap({ ...self, capabilityId: "cap-y", questionnaire })], { admit });
    assert.deepEqual([a.capability.claims, a.capability.admitted, a.capability.notOfAnApprovedAnswer, a.capability.verdict], [2, 2, 1, VERDICT.DISPROVED], `${why}: the record was let stand`);
    assert.equal(a.verdict, VERDICT.DISPROVED, `${why}: the row was not disproved`);
  }
});

/* a neutral questionnaire, written to a temporary registry directory and read through the PRODUCTION reader with the PRODUCTION resolver:
 * the declared product and its own tenant come from the real declarations, the answers are stand-ins */
const REAL_PRODUCT = "almi-oet";
const realTenants = () => {
  const real = createTenantResolver();
  const own = resolveSide(real, RESOURCES.subject(REAL_PRODUCT)).tenantId;
  const d = readDeclarations();
  const other = (d.tenants?.tenants ?? d.tenants).map((x) => x.tenantId).find((id) => id !== own);
  assert.ok(own && other, "the real tenancy declares no two tenants");
  return { own, other };
};
const questionnaireOf = (state, over = {}) => ({
  schemaVersion: 1, contractId: "product-questionnaire/1", questionnaireId: "q-one", tenantId: realTenants().own, productId: REAL_PRODUCT, submittedBy: "actor:t", submittedOn: "2026-09-28",
  answers: [
    { answerId: "does-a-thing", section: "CAPABILITY", statement: "It does a thing.", value: null, basis: "CLIENT_DECLARED", inferredFrom: [], approval: state === "APPROVED" ? APPROVAL : { state } },
    { answerId: "costs-this", section: "PRICE", statement: "It costs this.", value: { value: 5, valueType: "money", unit: "XTS" }, basis: "CLIENT_DECLARED", inferredFrom: [], approval: state === "APPROVED" ? APPROVAL : { state } },
  ],
  ...over,
});
async function readWith(questionnaire) {
  const dir = mkdtempSync(join(tmpdir(), "f44-q-"));
  try {
    if (questionnaire) writeFileSync(join(dir, QUESTIONNAIRE_FILE), `export default ${JSON.stringify(questionnaire)};\n`);
    return await readFactSupply({ productId: REAL_PRODUCT, factsDir: dir });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("C5 · FIRING CONTROL, THE PRODUCTION READER: only an APPROVED answer is a record — PENDING, REJECTED and an INVALID questionnaire yield none", async () => {
  const approved = await readWith(questionnaireOf("APPROVED"));
  assert.deepEqual([approved.questionnaire.state, approved.questionnaire.answers, approved.questionnaire.approved, approved.capability.claims, approved.capability.admitted, approved.capability.ofAnApprovedAnswer, approved.capability.selfSourced, approved.capability.selfSourcedWithATier, approved.capability.selfSourcedVerified, approved.capability.verdict],
    ["READ", 2, 2, 2, 2, 2, 2, 0, 0, VERDICT.PROVED]);
  assert.deepEqual([approved.unit.byValueType.money, approved.unit.verdict], [{ recorded: 1, "recorded-empty": 0 }, VERDICT.PROVED], "the approved price's unit was not read");
  for (const state of ["PENDING", "REJECTED"]) {
    const a = await readWith(questionnaireOf(state));
    assert.deepEqual([a.questionnaire.state, a.questionnaire.approved, a.questionnaire.withheld, a.records, a.capability.claims, a.capability.verdict], ["READ", 0, 2, 0, 0, VERDICT.COULD_NOT_PROVE], `a ${state} answer became a record`);
  }
  const noRecord = questionnaireOf("APPROVED"); noRecord.answers[1] = { ...noRecord.answers[1], approval: { state: "APPROVED", by: "owner", on: "2026-09-28" } };
  const invalid = await readWith(noRecord);
  assert.deepEqual([invalid.questionnaire.state, invalid.questionnaire.approved, invalid.capability.claims, invalid.capability.verdict], ["INVALID", 0, 0, VERDICT.COULD_NOT_PROVE], "an approval naming no committed record made records");
  assert.ok(invalid.questionnaire.faults > 0);
  const other = await readWith(questionnaireOf("APPROVED", { productId: "another-product" }));
  assert.deepEqual([other.questionnaire.state, other.capability.claims], ["INVALID", 0], "another product's questionnaire spoke for this one");
  const none = await readWith(null);
  assert.deepEqual([none.questionnaire.state, none.capability.claims, none.capability.missing], ["NONE", 0, MISSING.noCapability]);
});

test("C5 · every record the questionnaire yields carries its answer and its committed approval record; an answer of another tenant is refused by the existing admission", async () => {
  const { claims } = capabilityClaimsOf(questionnaireOf("APPROVED"));
  assert.deepEqual(claims.map((c) => [c.kind, c.questionnaire.answerId, c.questionnaire.approval.state, c.questionnaire.approval.record.commit, c.source.tier, c.verificationState]),
    [[CAPABILITY_KIND, "does-a-thing", "APPROVED", "a".repeat(40), null, "UNVERIFIED"], [CAPABILITY_KIND, "costs-this", "APPROVED", "a".repeat(40), null, "UNVERIFIED"]]);
  const crossed = await readWith(questionnaireOf("APPROVED", { tenantId: realTenants().other }));
  assert.deepEqual([crossed.capability.claims, crossed.capability.admitted, crossed.capability.verdict], [2, 0, VERDICT.DISPROVED], "a questionnaire scoped to another tenant was admitted for this product");
});

test("C5 · an empty capability population is reported empty and COULD-NOT-PROVE, never PROVED", () => {
  const a = auditFactSupply([fact()], { admit: noAdmit });
  assert.deepEqual([a.capability.claims, a.capability.verdict, a.capability.missing], [0, VERDICT.COULD_NOT_PROVE, MISSING.noCapability]);
});

/* ================= C6 — verdicts ================= */

const derivedOk = { kind: "derived", claim: { subject: "s", predicate: "d", qualifier: null }, value: { value: 2, valueType: "derived", unit: null }, derivation: { formula: "f", inputs: ["a", "b"] } };
const capOk = () => cap({ source: { class: INDEPENDENT, declarationRef: "owner-decl-1" } });

test("C6 · FIRING CONTROL: the row is PROVED only when EVERY part is PROVED — one part DISPROVED disproves it, one part unproved leaves it COULD-NOT-PROVE", () => {
  const whole = auditFactSupply([fact(), derivedOk, capOk()], { admit });
  assert.deepEqual([...Object.values(whole.fields).map((f) => f.verdict), whole.unit.verdict, whole.derived.verdict, whole.capability.verdict].filter((v) => v !== VERDICT.PROVED), [], "the fixture is not PROVED in every part");
  assert.equal(whole.verdict, VERDICT.PROVED, "every part is PROVED, yet the row is not");
  /* one part DISPROVED, each kind of part */
  assert.equal(auditFactSupply([fact({ provenance: undefined }), derivedOk, capOk()], { admit }).verdict, VERDICT.DISPROVED, "an absent field");
  assert.equal(auditFactSupply([fact({ value: { value: 1, valueType: "count", unit: null } }), derivedOk, capOk()], { admit }).verdict, VERDICT.DISPROVED, "a bare count");
  assert.equal(auditFactSupply([fact(), { ...derivedOk, derivation: undefined }, capOk()], { admit }).verdict, VERDICT.DISPROVED, "a derived record without its derivation");
  assert.equal(auditFactSupply([fact(), derivedOk, cap({ scope: { tenantId: TB, productId: "prod-one" } })], { admit }).verdict, VERDICT.DISPROVED, "a refused capability record");
  /* one part with an EMPTY population: never PROVED, each kind of part */
  assert.equal(auditFactSupply([fact(), derivedOk], { admit }).verdict, VERDICT.COULD_NOT_PROVE, "no capability record");
  assert.equal(auditFactSupply([fact(), capOk()], { admit }).verdict, VERDICT.COULD_NOT_PROVE, "no derived record");
  assert.equal(auditFactSupply([derivedOk, capOk()], { admit }).verdict, VERDICT.COULD_NOT_PROVE, "no nine-field record");
  assert.equal(auditFactSupply([fact({ value: { value: "r", valueType: "rule", unit: null } }), derivedOk, capOk()], { admit }).verdict, VERDICT.COULD_NOT_PROVE, "no money, duration or count record");
});

/* ================= REAL ================= */

test("REAL · the declared product's registry: every part counted with its denominator on a NON-EMPTY population, and the row verdict is what the parts decide", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const a = await readFactSupply(product);
  assert.ok(a.primary > 0, "EMPTY real population");
  for (const [name, f] of Object.entries(a.fields)) assert.equal(f.present + f.absent, a.primary, `${name} lost a record`);
  assert.equal(a.primary + a.derived.records + a.capability.claims, a.records, "a record was skipped or read twice");
  assert.equal(Object.values(a.unit.byValueType).reduce((n, c) => n + c.recorded + c["recorded-empty"], 0), a.records, "the unit census lost a record");
  assert.equal(a.unit.requiredWithAUnit + a.unit.requiredWithoutAUnit, a.unit.required);
  /* C5 on the real recorded population: non-empty, every record an approved answer, every one admitted, none tiered, none VERIFIED */
  const c = a.capability, q = a.questionnaire;
  assert.equal(q.state, "READ", "the product's questionnaire is not readable");
  assert.ok(c.claims > 0, "EMPTY real capability population — C5 cannot be proved on it");
  assert.deepEqual([q.approved, c.ofAnApprovedAnswer, c.admitted, c.selfSourced], [c.claims, c.claims, c.claims, c.claims], "a real capability record is not an approved, admitted, self-sourced answer");
  assert.deepEqual([c.notOfAnApprovedAnswer, c.refused, c.selfSourcedWithATier, c.selfSourcedVerified], [0, 0, 0, 0]);
  assert.equal(q.approved + q.withheld, q.answers);
  const parts = [...Object.values(a.fields).map((f) => f.verdict), a.unit.verdict, a.derived.verdict, c.verdict];
  assert.equal(a.verdict, parts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : parts.every((v) => v === VERDICT.PROVED) ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE);
  assert.equal(a.verdict, VERDICT.PROVED, "the real recorded population does not prove every part");
  console.log(`  REAL (count-only, the declared product's own registry): ${JSON.stringify({ records: a.records, primary: a.primary, fields: Object.fromEntries(Object.entries(a.fields).map(([k, f]) => [k, `${f.present}/${f.denominator} ${f.verdict}`])), unit: { byValueType: a.unit.byValueType, required: a.unit.required, withAUnit: a.unit.requiredWithAUnit, withoutAUnit: a.unit.requiredWithoutAUnit, verdict: a.unit.verdict }, derived: a.derived, questionnaire: q, capability: { claims: c.claims, ofAnApprovedAnswer: c.ofAnApprovedAnswer, admitted: c.admitted, refused: c.refused, selfSourced: c.selfSourced, selfSourcedWithATier: c.selfSourcedWithATier, selfSourcedVerified: c.selfSourcedVerified, verdict: c.verdict }, verdict: a.verdict })}`);
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

test("C1 · THE ENTRY POINT: in a declared world it prints every field with its denominator, the unit rule, the questionnaire and capability counts, no URL, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/fact-supply.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+\d+ record\(s\): \d+ non-derived, \d+ derived, \d+ capability/);
    for (const name of Object.keys(FIELDS)) assert.match(ok.stdout, new RegExp(`  ${name}\\s+present \\d+ of \\d+ · absent \\d+ — `), `missing ${name}`);
    assert.match(ok.stdout, /unit\s+required only of money, duration, count: with a unit \d+ of \d+ · without \d+ · every other value type reported, never judged/);
    assert.match(ok.stdout, /questionnaire (READ|NONE|INVALID) — \d+ answer\(s\): APPROVED \(a record\) \d+ of \d+ · not approved \(no record\) \d+ of \d+/);
    assert.match(ok.stdout, /capability\s+(0 capability claim\(s\) recorded — the population is EMPTY, never a pass|\d+ claim\(s\): an approved answer naming its committed record \d+ of \d+ · admitted \d+ of \d+)/);
    assert.match(ok.stdout, /verdict\s+(PROVED|DISPROVED|COULD-NOT-PROVE)$/m);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C1 · the audit and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/facts/fact-supply.mjs", "src/facts/fact-supply-reader.mjs", "src/questionnaire/product-questionnaire.mjs", "src/questionnaire/product-questionnaire-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
