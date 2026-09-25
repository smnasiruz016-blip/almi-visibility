import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { productFromArgv, productIdFromArgv, availableProducts } from "../src/product-cli.mjs";
import { subjectRoots, subjectIndex, resolveSubject, importSubjectModule, ensureSubjectHook, SUBJECT_ROOTS_ENV } from "../src/subject-roots.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { subjectScope } from "./support/subjects.mjs";
import { declareRoot } from "./helpers/root-registry.mjs";

/**
 * 🔴 A2 — AN ENTRY POINT TAKES ITS PRODUCT AS AN ARGUMENT.
 *
 * Seven runners used to resolve a product at IMPORT time. Their arithmetic was
 * already generic; the BINDING was not, so none could be pointed at a second
 * product without editing its source.
 *
 * These tests exist to stop a default creeping back. Every default this project
 * has removed — `dir = FACTS_DIR`, `page = NURSING_PAGE`, `removeIds = ...` —
 * read as harmless when it was written.
 *
 * 🔴 AND SINCE 14 SEPTEMBER 2026 A PRODUCT IS FOUND THROUGH A LIST OF SUBJECT ROOTS (owner ruling, Option A): the
 * engine's own fixtures in this repository, a product's own data outside it.
 *
 * 🔴 F03 (25 Sep 2026) CHANGED FOUR THINGS THESE TESTS USED TO ASSERT, deliberately, and each is asserted the new way:
 *   1. a subject exists because a root's REGISTRY declares it — a directory holding a `product.mjs` no longer does;
 *   2. a refusal no longer lists the other declared subjects ("available: …") — that told one tenant's run about another's;
 *   3. a refusal carries a reason code and no filesystem path;
 *   4. a subject's descriptor or module is read only on a genuine decision allowing its root.
 */

test("🔴 there is NO default product", async () => {
  await assert.rejects(() => productFromArgv([]), /--product=<id> is required/);
  await assert.rejects(() => productFromArgv(["--page=nursing"]), /no default/);
  // An empty value is not a product id either.
  await assert.rejects(() => productFromArgv(["--product="]), /--product=<id> is required/);
});

test("🔴 F03 · the refusal does NOT list the other declared subjects — one run learns nothing about another tenant's", async () => {
  await assert.rejects(() => productFromArgv([]), (e) => !/available/.test(e.message) && !e.message.includes("almi-oet") && !e.message.includes("neutral-test-ferments"));
  // CONTROL: the subjects ARE declared — so the silence above is the refusal withholding them, not an empty registry
  assert.ok(availableProducts().includes("almi-oet") && availableProducts().includes("neutral-test-ferments"));
});

test("🔴 a product id may not become a path", async () => {
  for (const bad of ["../etc", "a/b", "..", "Almi-OET", "almi_oet", "./x", "..\\x", "C:"]) {
    await assert.rejects(
      () => productFromArgv([`--product=${bad}`]),
      /is not a product id/,
      `${bad} was accepted as an id`,
    );
  }
  // and the root module enforces the same law on its own, for callers that never pass through argv
  assert.throws(() => resolveSubject("../almi-oet"), /SUBJECT_ID_INVALID/);
});

test("an unknown product is refused by name, not by a crash — UNDECLARED, and never read", async () => {
  assert.throws(() => resolveSubject("no-such-product"), /SUBJECT_UNDECLARED: no root registry declares this subject/);
  await assert.rejects(() => productFromArgv(["--product=no-such-product"], { scope: subjectScope("no-such-product") }), /SUBJECT_NOT_RESOLVED/);
});

test("🔴 F03 · a REAL product's descriptor is read only on a genuine decision — refused without one, read with one", async () => {
  await assert.rejects(() => productFromArgv(["--product=almi-oet"]), /SUBJECT_NOT_RESOLVED/);
  // an object that merely LOOKS like an allowed decision is not one
  const forged = { decisions: [{ decision: { outcome: "SAME_TENANT_ALLOWED", allowed: true, target: { resourceKind: "SUBJECT_ROOT" } } }] };
  await assert.rejects(() => productFromArgv(["--product=almi-oet"], { scope: forged }), /SUBJECT_NOT_RESOLVED/);
  // CONTROL: with the genuine decision the descriptor is read, from the EXTERNAL root
  const p = await productFromArgv(["--product=almi-oet"], { scope: subjectScope("almi-oet") });
  assert.equal(p.productId, "almi-oet");
  assert.equal(p.axis.key, "profession");
  assert.equal(p.variants.length, 12);
  assert.ok(p.factsDir.length > 0);
  assert.ok(p.placement.allRepeated.length > 0);
  const { root } = resolveSubject("almi-oet");
  assert.equal(root.kind, "external");
});

test("the engine's own fixture resolves from the FIXTURES root, inside this repository", () => {
  const { root } = resolveSubject("neutral-test-ferments");
  assert.equal(root.kind, "fixtures");
});

test("the flag is read from anywhere in argv, not from a fixed position", () => {
  assert.equal(productIdFromArgv(["node", "x.mjs", "--page=nursing", "--product=almi-oet"]), "almi-oet");
  assert.equal(productIdFromArgv(["--product=almi-oet", "--page=nursing"]), "almi-oet");
  assert.equal(productIdFromArgv(["--page=nursing"]), null);
});

test("availableProducts is read from every root's registry, and is not empty — or every test above is vacuous", () => {
  const found = availableProducts();
  assert.ok(found.includes("almi-oet"), "the product in the external root was not found");
  assert.ok(found.includes("neutral-test-ferments"), "the fixture in this repository was not found");
});

/* ---------- the roots and their refusals ---------- */

const scratch = () => mkdtempSync(join(tmpdir(), "subject-roots-"));
const writeDescriptor = (root, id, body = `export const PRODUCT = { productId: "${id}" };\n`) => {
  mkdirSync(join(root, id), { recursive: true });
  writeFileSync(join(root, id, "product.mjs"), body);
};

test("🔴 F03 · a directory holding a product.mjs is NOT a subject until a registry declares it — convention creates nothing", () => {
  const a = scratch();
  try {
    writeDescriptor(a, "probe");
    const roots = [{ id: "a", kind: "external", path: a }];
    assert.deepEqual([...subjectIndex({ roots }).keys()], [], "a directory's presence created a subject");
    assert.throws(() => resolveSubject("probe", { roots }), /SUBJECT_UNDECLARED/);
    // CONTROL: the same directory, DECLARED, is one
    declareRoot(a, { subjects: [{ subjectId: "probe" }] });
    assert.equal(resolveSubject("probe", { roots }).dir, join(a, "probe"));
  } finally {
    rmSync(a, { recursive: true, force: true });
  }
});

test("🔴 an id DECLARED in TWO roots is refused — never resolved by precedence — and the refusal names no path", () => {
  const a = scratch();
  const b = scratch();
  try {
    for (const r of [a, b]) { writeDescriptor(r, "twin"); declareRoot(r, { subjects: [{ subjectId: "twin" }] }); }
    const roots = [{ id: "a", kind: "external", path: a }, { id: "b", kind: "external", path: b }];
    assert.throws(() => subjectIndex({ roots }), (e) => e.code === "SUBJECT_AMBIGUOUS" && !e.message.includes(a) && !e.message.includes(b));
    // CONTROL: one root, the same id, resolves
    assert.equal(resolveSubject("twin", { roots: [roots[0]] }).dir, join(a, "twin"));
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("🔴 a DECLARED subject whose declared path is absent is refused — absence never reads as 'no such product'", () => {
  const a = scratch();
  try {
    declareRoot(a, { subjects: [{ subjectId: "ghost" }] });
    assert.throws(() => subjectIndex({ roots: [{ id: "a", kind: "external", path: a }] }), (e) => e.code === "SUBJECT_DECLARED_PATH_ABSENT" && !e.message.includes(a));
  } finally {
    rmSync(a, { recursive: true, force: true });
  }
});

test("🔴 a missing root is refused, naming its id and not its path — never an empty list that reads as 'no such product'", () => {
  const gone = join(tmpdir(), "subject-roots-that-do-not-exist", "nowhere");
  assert.throws(() => subjectIndex({ roots: [{ id: "gone", kind: "external", path: gone }] }), (e) => e.code === "ROOT_INDEX_ROOT_MISSING" && e.message.includes("'gone'") && !e.message.includes(gone));
});

test("the override replaces the EXTERNAL roots and never the fixtures root", () => {
  const roots = subjectRoots({ [SUBJECT_ROOTS_ENV]: ["x", "y"].join(process.platform === "win32" ? ";" : ":") });
  assert.deepEqual(roots.map((r) => r.kind), ["fixtures", "external", "external"]);
  assert.match(roots[0].path.replace(/\\/g, "/"), /\/products$/);
  assert.deepEqual(subjectRoots({}).map((r) => r.kind), ["fixtures", "external"]);
});

test("🔴 THE HOOK: an import leaving an external root lands in THIS engine's src/ — the same module instance — and any other escape is refused", async () => {
  ensureSubjectHook();
  const root = scratch();
  const prev = process.env[SUBJECT_ROOTS_ENV];
  try {
    process.env[SUBJECT_ROOTS_ENV] = root;
    mkdirSync(join(root, "probe-subject", "facts"), { recursive: true });
    // written as a subject inside this repository would write it: two levels up, then src/
    writeFileSync(join(root, "probe-subject", "product.mjs"), `export { ID_PATTERN } from "../../src/subject-roots.mjs";\n`);
    writeFileSync(join(root, "probe-subject", "escape.mjs"), `export * from "../../package.json";\n`);
    const mod = await import(pathToFileURL(join(root, "probe-subject", "product.mjs")).href);
    const engine = await import("../src/subject-roots.mjs");
    assert.equal(mod.ID_PATTERN, engine.ID_PATTERN, "the subject reached a DIFFERENT copy of the engine");
    await assert.rejects(() => import(pathToFileURL(join(root, "probe-subject", "escape.mjs")).href), /SUBJECT_IMPORT_LEAVES_ROOT/);

    /* F03: a subject's module is read only on a genuine decision — refused without one … */
    await assert.rejects(() => importSubjectModule("probe-subject", "product.mjs"), /SUBJECT_NOT_RESOLVED/);
    /* … and, WITH one (a declared world: registry + tenancy for this root), a module path that leaves the subject's own
     * folder is still refused before any import. */
    const tenantId = `tenant:${"ab".repeat(16)}`;
    mkdirSync(join(root, "tenancy"), { recursive: true });
    writeFileSync(join(root, "tenancy", "tenants.json"), JSON.stringify({ schemaVersion: 1, tenants: [{ schemaVersion: 1, tenantId, status: "ACTIVE", declaredOn: "2026-09-25", declarationBasis: "TEST_WORLD", label: "probe" }] }));
    writeFileSync(join(root, "tenancy", "attachments.json"), JSON.stringify({ schemaVersion: 1, attachments: [{ schemaVersion: 1, resourceKind: "FACT_REGISTRY", resourceRef: "probe-subject/facts", tenantId, declaredOn: "2026-09-25", declarationBasis: "TEST_WORLD" }] }));
    declareRoot(root, { subjects: [{ subjectId: "probe-subject", members: [{ resourceKind: "FACT_REGISTRY", resourceRef: "probe-subject/facts" }] }] });
    const decision = decideForTenant(createTenantResolver({ env: process.env }), tenantId, RESOURCES.subject("probe-subject"));
    assert.equal(decision.outcome, "SAME_TENANT_ALLOWED", "the probe world did not allow its own subject");
    await assert.rejects(() => importSubjectModule("probe-subject", "../other/product.mjs", { decision }), /SUBJECT_PATH_OUTSIDE_ROOT/);
    // CONTROL: the same decision reads the subject's own module
    assert.equal((await importSubjectModule("probe-subject", "product.mjs", { decision })).ID_PATTERN, engine.ID_PATTERN);
  } finally {
    if (prev === undefined) delete process.env[SUBJECT_ROOTS_ENV];
    else process.env[SUBJECT_ROOTS_ENV] = prev;
    rmSync(root, { recursive: true, force: true });
  }
});
