/**
 * THE CLIENT PRODUCT QUESTIONNAIRE (owner answers A1 and A2, RR-250, _handoffs c3a19c2).
 *
 * Fixtures DRIVE the rules (hand-written below, neutral stand-ins). The REAL test reads the declared product's own questionnaire through
 * its own scope and reports counts only. Nothing is fetched; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { validateQuestionnaire, capabilityClaimsOf, plainWords, summarise, SECTIONS, UNIT_REQUIRED_VALUE_TYPES, QUESTIONNAIRE_FILE, CONTRACT_ID } from "../src/questionnaire/product-questionnaire.mjs";
import { readProductQuestionnaire } from "../src/questionnaire/product-questionnaire-reader.mjs";
import { admitCapabilityClaim, SELF_SOURCED, CAPABILITY_KIND } from "../src/facts/capability-claims.mjs";
import { capabilityContext } from "../src/facts/fact-supply-reader.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const TA = `tenant:${"5e1f".repeat(8)}`;
const APPROVED = { state: "APPROVED", by: "owner:one", on: "2026-10-12", record: { repo: "records", path: "APPROVAL.md", commit: "a".repeat(40) } };
const answer = (over = {}) => ({ answerId: "does-a-thing", section: "CAPABILITY", statement: "It does a thing.", value: null, basis: "CLIENT_DECLARED", inferredFrom: [], approval: { state: "PENDING" }, ...over });
const priced = (over = {}) => answer({ answerId: "costs-this", section: "PRICE", statement: "It costs this.", value: { value: 5, valueType: "money", unit: "XTS" }, ...over });
const sheet = (answers = [answer()], over = {}) => ({ schemaVersion: 1, contractId: CONTRACT_ID, questionnaireId: "prod-one-2026-10-12", tenantId: TA, productId: "prod-one", submittedBy: "client:one", submittedOn: "2026-10-12", answers, ...over });
const codes = (q) => validateQuestionnaire(q).faults.map((f) => f.code);

test("A2 · the four sections are exactly these, and a valid questionnaire is accepted", () => {
  assert.deepEqual(Object.keys(SECTIONS), ["CAPABILITY", "PRICE", "DURATION", "COUNT"]);
  assert.deepEqual(Object.values(SECTIONS).map((s) => s.valueType), [null, "money", "duration", "count"]);
  const q = sheet([answer(), priced(), answer({ answerId: "lasts-this", section: "DURATION", value: { value: 7, valueType: "duration", unit: "days" } }), answer({ answerId: "has-this-many", section: "COUNT", value: { value: 3, valueType: "count", unit: "things" } })]);
  assert.deepEqual(validateQuestionnaire(q), { valid: true, faults: [] });
});

test("A1 · FIRING CONTROL: a price, duration or count with no unit is REFUSED; a capability statement is never asked for one", () => {
  assert.deepEqual([...UNIT_REQUIRED_VALUE_TYPES], ["money", "duration", "count"]);
  for (const [section, valueType] of [["PRICE", "money"], ["DURATION", "duration"], ["COUNT", "count"]]) {
    for (const unit of [undefined, null, "", "  "]) assert.deepEqual(codes(sheet([answer({ section, value: { value: 1, valueType, unit } })])), ["UNIT_REQUIRED_AND_ABSENT"], `${section} with unit ${JSON.stringify(unit)} was accepted`);
    assert.deepEqual(codes(sheet([answer({ section, value: { value: 1, valueType, unit: "u" } })])), []);
  }
  assert.deepEqual(codes(sheet([answer()])), [], "a capability statement was asked for a unit");
  assert.deepEqual(codes(sheet([answer({ value: { value: 1, valueType: "count", unit: "u" } })])), ["CAPABILITY_CARRIES_A_VALUE"]);
});

test("A2 · FIRING CONTROL: deny by default — an unknown field, section, basis, state or value type is a fault, each by name", () => {
  assert.deepEqual(codes(sheet([answer()], { extra: 1 })), ["UNKNOWN_FIELD"]);
  assert.deepEqual(codes(sheet([answer({ extra: 1 })])), ["UNKNOWN_FIELD"]);
  assert.deepEqual(codes(sheet([answer({ section: "OPINION" })])), ["SECTION_UNKNOWN"]);
  assert.deepEqual(codes(sheet([answer({ basis: "GUESSED" })])), ["BASIS_UNKNOWN"]);
  assert.deepEqual(codes(sheet([answer({ approval: { state: "FINE" } })])), ["APPROVAL_STATE_UNKNOWN"]);
  assert.deepEqual(codes(sheet([priced({ value: { value: 5, valueType: "count", unit: "XTS" } })])), ["VALUE_TYPE_NOT_OF_ITS_SECTION"]);
  assert.deepEqual(codes(sheet([priced({ value: { value: "5", valueType: "money", unit: "XTS" } })])), ["VALUE_NOT_A_NUMBER"]);
  assert.deepEqual(codes(sheet([answer(), answer()])), ["ANSWER_ID_DUPLICATED"]);
  assert.deepEqual(codes(sheet([answer()], { tenantId: "tenant:short" })), ["TENANT_ID_ABSENT_OR_MALFORMED"]);
  assert.deepEqual(codes(sheet([answer({ statement: " " })])), ["STATEMENT_ABSENT"]);
  assert.equal(validateQuestionnaire(sheet([answer({ statement: "It does a private thing." })])).faults.some((f) => f.path.includes("private")), false, "a fault quoted the client's wording");
});

test("A2 · FIRING CONTROL: an INFERRED answer must name what it was inferred from; an APPROVED one must name its approver, date and committed record", () => {
  assert.deepEqual(codes(sheet([answer({ basis: "INFERRED" })])), ["INFERRED_WITHOUT_ITS_SOURCE"]);
  assert.deepEqual(codes(sheet([answer({ basis: "INFERRED", inferredFrom: [{ kind: "RUMOUR", ref: "x" }] })])), ["INFERRED_FROM_MALFORMED"]);
  assert.deepEqual(codes(sheet([answer({ basis: "INFERRED", inferredFrom: [{ kind: "CODE", ref: "repo:file" }] })])), []);
  assert.deepEqual(codes(sheet([answer({ approval: { state: "APPROVED" } })])), ["APPROVAL_WITHOUT_ITS_APPROVER", "APPROVAL_WITHOUT_ITS_DATE", "APPROVAL_WITHOUT_ITS_COMMITTED_RECORD"]);
  assert.deepEqual(codes(sheet([answer({ approval: { ...APPROVED, record: { ...APPROVED.record, commit: "abc123" } } })])), ["APPROVAL_WITHOUT_ITS_COMMITTED_RECORD"], "a short hash stood in for a committed record");
  assert.deepEqual(codes(sheet([answer({ approval: APPROVED })])), []);
});

test("A2 · FIRING CONTROL: only an APPROVED answer becomes a claim — PENDING and REJECTED yield nothing, and an invalid questionnaire yields none at all", () => {
  const q = sheet([answer({ answerId: "pending-one" }), answer({ answerId: "rejected-one", approval: { state: "REJECTED" } }), answer({ answerId: "approved-one", approval: APPROVED }), priced({ approval: APPROVED, basis: "INFERRED", inferredFrom: [{ kind: "CODE", ref: "repo:file" }] })]);
  const r = capabilityClaimsOf(q);
  assert.deepEqual([r.answers, r.approved, r.withheld, r.claims.length], [4, 2, 2, 2]);
  assert.deepEqual(r.claims.map((c) => c.capabilityId), ["approved-one", "costs-this"]);
  const broken = capabilityClaimsOf(sheet([answer({ approval: APPROVED }), priced({ approval: APPROVED, value: { value: 5, valueType: "money", unit: "" } })]));
  assert.deepEqual([broken.claims.length, broken.approved, broken.withheld, broken.faults.map((f) => f.code)], [0, 0, 2, ["UNIT_REQUIRED_AND_ABSENT"]], "half a questionnaire became evidence");
});

test("A2 · every claim is first-party: SELF-SOURCED by the owner's declaration, no tier, never VERIFIED — and the EXISTING admission decides it", () => {
  const PRODUCTS = { "prod-one": { state: "RESOLVED", tenantId: TA } };
  const resolve = (resource) => (resource.resourceKind === "FACT_REGISTRY" && PRODUCTS[resource.resourceRef] ? { ...PRODUCTS[resource.resourceRef], reason: "DECLARED" } : { state: "UNDECLARED", reason: "NOT_DECLARED", tenantId: null });
  resolve.declarations = { readable: true, tenants: [{ tenantId: TA, status: "ACTIVE" }], attachments: [] };
  const ctx = { resolve, productResourceOf: (id) => (Object.hasOwn(PRODUCTS, id) ? { resourceKind: "FACT_REGISTRY", resourceRef: id } : null) };
  const [claim] = capabilityClaimsOf(sheet([priced({ approval: APPROVED, basis: "INFERRED", inferredFrom: [{ kind: "PUBLIC_SITE", ref: "a page" }] })])).claims;
  assert.deepEqual([claim.kind, claim.source.class, claim.source.tier, claim.verificationState, claim.checker, claim.date], [CAPABILITY_KIND, SELF_SOURCED, null, "UNVERIFIED", "owner:one", "2026-10-12"]);
  assert.equal(claim.source.declarationRef, `records:APPROVAL.md@${"a".repeat(40)}`);
  assert.deepEqual([...claim.provenance], ["questionnaire:prod-one-2026-10-12", "basis:INFERRED", "inferred-from:PUBLIC_SITE:a page", "approved-by:owner:one"]);
  const a = admitCapabilityClaim(claim, ctx);
  assert.deepEqual([a.admitted, a.refusals, a.record?.firstParty.basis, a.record?.source.tier], [true, [], "OWNER_DECLARATION", null]);
  /* CONTROL: the same claim under a product that is not this tenant's is refused by the admission, not by this module */
  assert.equal(admitCapabilityClaim({ ...claim, scope: { tenantId: TA, productId: "another" } }, ctx).admitted, false);
});

test("A2 · plain words: a value is printed with its unit, never bare; the summary is count-only", () => {
  assert.equal(plainWords(priced()), "It costs this. — 5 XTS");
  assert.equal(plainWords(answer()), "It does a thing.");
  assert.deepEqual(summarise(sheet([answer(), priced({ approval: APPROVED })])), { answers: 2, bySection: { CAPABILITY: 1, PRICE: 1 }, byBasis: { CLIENT_DECLARED: 2 }, byApproval: { PENDING: 1, APPROVED: 1 } });
});

test("REAL · the declared product's questionnaire: valid, read through its own scope, and exactly its APPROVED answers are claims the admission admits", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const r = await readProductQuestionnaire(product);
  assert.equal(r.state, "READ", JSON.stringify(r.faults));
  const s = summarise(r.questionnaire);
  assert.ok(s.answers > 0, "EMPTY real questionnaire");
  for (const section of Object.keys(SECTIONS)) assert.ok((s.bySection[section] ?? 0) > 0, `the real questionnaire answers nothing under ${section}`);
  assert.equal(r.claims.length, s.byApproval.APPROVED ?? 0);
  assert.equal(r.approved + r.withheld, s.answers);
  const ctx = capabilityContext(product, createTenantResolver());
  for (const c of r.claims) assert.deepEqual(admitCapabilityClaim(c, ctx).refusals, [], `the admission refused ${c.capabilityId}`);
  /* the questionnaire file is NOT a fact record: the registry loader never returns it */
  const { files } = await loadRegistry(product.factsDir, product.productId);
  assert.equal(files.includes(QUESTIONNAIRE_FILE), false, "the questionnaire was loaded as fact records");
  console.log(`  REAL (count-only, the declared product's own questionnaire): ${JSON.stringify({ ...s, claims: r.claims.length, withheld: r.withheld })}`);
});

test("A2 · a questionnaire filed under another product is INVALID and yields nothing; a product with no file has NONE", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const other = await readProductQuestionnaire({ factsDir: product.factsDir, productId: "another-product" });
  assert.deepEqual([other.state, other.claims.length, other.faults.map((f) => f.code)], ["INVALID", 0, ["QUESTIONNAIRE_OF_ANOTHER_PRODUCT"]]);
  const none = await readProductQuestionnaire({ factsDir: join(REPO, "src", "intake"), productId: "x" });
  assert.deepEqual([none.state, none.claims.length], ["NONE", 0]);
});

test("THE ENTRY POINT: in a declared world it prints each answer in plain words with its basis and whether it is evidence, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/product-questionnaire.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /state\s+READ — \d+ answer\(s\) · evidence \(APPROVED\) \d+ of \d+ · withheld \d+ of \d+/);
    for (const section of Object.keys(SECTIONS)) assert.match(ok.stdout, new RegExp(`  ${section} — \\d+ answer\\(s\\)`));
    assert.match(ok.stdout, /\[(INFERRED|CLIENT_DECLARED) · (APPROVED|PENDING, not evidence|REJECTED, not evidence)\] /);
    assert.doesNotMatch(ok.stdout, /\(NO UNIT\)/, "a value was printed bare");
    const asked = spawnSync(process.execPath, WORLD.argv(["bin/product-questionnaire.mjs", "--product=almi-oet", "--questions"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(asked.status, 0, asked.stdout + asked.stderr);
    for (const s of Object.values(SECTIONS)) assert.ok(asked.stdout.includes(s.question));
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

/* ================= RR-255 · the client's design (page law 1) ================= */

test("DESIGN · FIRING CONTROL (RR-255): a questionnaire may carry the client's design; each malformed part is a fault by name; a design is never an answer or a claim", async () => {
  const { validateDesign, designOf, validateQuestionnaire, capabilityClaimsOf, DESIGN_FIELDS } = await import("../src/questionnaire/product-questionnaire.mjs");
  const design = { siteAddress: "https://client.invalid", brandName: "Standin", productLine: "A stand-in line.", logo: { mark: "S", wordmark: "Standin" }, colours: { background: "#FFFFFF", primary: "#AA3322", ink: "#111111", text: "#333333" },
    fonts: { body: "Verdana, sans-serif" }, card: { radius: "12px" }, nav: [{ label: "Try", href: "/try" }], cta: { label: "Start", href: "/start" }, footer: { columns: [{ title: "Company", links: [{ label: "About", href: "/about" }] }], notice: "© Standin." }, basis: "CLIENT_DECLARED" };
  assert.deepEqual(validateDesign(design), []);
  for (const k of Object.keys(design)) assert.ok(DESIGN_FIELDS.includes(k));
  const cases = [
    [{ siteAddress: "http://client.invalid" }, "DESIGN_SITE_ADDRESS_NOT_AN_HTTPS_ADDRESS"], [{ brandName: "" }, "DESIGN_BRAND_NAME_ABSENT"], [{ logo: { mark: "S" } }, "DESIGN_LOGO_ABSENT_OR_MALFORMED"],
    [{ colours: { ...design.colours, primary: "red" } }, "DESIGN_COLOUR_ABSENT_OR_NOT_HEX"], [{ colours: { ...design.colours, glow: "#FFFFFF" } }, "UNKNOWN_FIELD"], [{ fonts: { body: "x;}</style>" } }, "DESIGN_FONT_ABSENT_OR_MALFORMED"],
    [{ card: { radius: "big" } }, "DESIGN_CARD_MALFORMED"], [{ nav: [{ label: "x", href: "javascript:alert(1)" }] }, "DESIGN_NAVIGATION_MALFORMED"], [{ cta: { label: "", href: "/start" } }, "DESIGN_CALL_TO_ACTION_ABSENT_OR_MALFORMED"],
    [{ footer: { columns: [{ title: "", links: [] }] } }, "DESIGN_FOOTER_MALFORMED"], [{ basis: "GUESSED" }, "DESIGN_BASIS_UNKNOWN"], [{ basis: "READ_FROM_CLIENT_SITE" }, "DESIGN_READ_WITHOUT_ITS_SOURCE"], [{ script: "x" }, "UNKNOWN_FIELD"],
  ];
  for (const [over, code] of cases) assert.ok(validateDesign({ ...design, ...over }).some((x) => x.code === code), `${code} did not fire`);
  assert.deepEqual(validateDesign({ ...design, basis: "READ_FROM_CLIENT_SITE", readFrom: [{ kind: "CODE", ref: "repo:file" }] }), []);
  const q = { schemaVersion: 1, contractId: "product-questionnaire/1", questionnaireId: "q-one", tenantId: `tenant:${"5e1f".repeat(8)}`, productId: "prod-one", submittedBy: "actor:t", submittedOn: "2026-09-28", answers: [], design };
  assert.deepEqual([validateQuestionnaire(q).valid, designOf(q)?.brandName, capabilityClaimsOf(q).claims.length], [true, "Standin", 0], "a design became a claim, or a valid design was not handed on");
  assert.deepEqual([validateQuestionnaire({ ...q, design: { ...design, cta: undefined } }).valid, designOf({ ...q, design: { ...design, cta: undefined } })], [false, null], "a malformed design was handed on");
});

test("DESIGN · REAL: the declared product's questionnaire files a valid design, names how it was obtained, and yields no extra record for it", async () => {
  const { designOf, DESIGN_BASES } = await import("../src/questionnaire/product-questionnaire.mjs");
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const r = await readProductQuestionnaire(product);
  const d = designOf(r.questionnaire);
  assert.ok(d, "the declared product files no valid design");
  assert.ok(Object.hasOwn(DESIGN_BASES, d.basis) && (d.basis !== "READ_FROM_CLIENT_SITE" || d.readFrom.length > 0));
  assert.equal(r.claims.length, r.approved, "the design added a record");
  console.log(`  REAL (count-only, the declared product's design): ${JSON.stringify({ basis: d.basis, readFrom: (d.readFrom ?? []).length, colours: Object.keys(d.colours).length, nav: d.nav.length, footerColumns: d.footer.columns.length })}`);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
