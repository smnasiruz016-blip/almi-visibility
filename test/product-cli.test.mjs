import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { productFromArgv, productIdFromArgv, availableProducts } from "../src/product-cli.mjs";
import { subjectRoots, subjectIndex, resolveSubject, importSubjectModule, ensureSubjectHook, SUBJECT_ROOTS_ENV } from "../src/subject-roots.mjs";

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
 * engine's own fixtures in this repository, a product's own data outside it. The four refusals are tested here.
 */

test("🔴 there is NO default product", async () => {
  await assert.rejects(() => productFromArgv([]), /--product=<id> is required/);
  await assert.rejects(() => productFromArgv(["--page=nursing"]), /no default/);
  // An empty value is not a product id either.
  await assert.rejects(() => productFromArgv(["--product="]), /--product=<id> is required/);
});

test("the error names what is available, so the operator is not left guessing", async () => {
  await assert.rejects(() => productFromArgv([]), /available: .*almi-oet/);
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
  assert.throws(() => resolveSubject("../almi-oet"), /is not a product id/);
});

test("an unknown product is refused by name, not by a crash", async () => {
  await assert.rejects(() => productFromArgv(["--product=no-such-product"]), /no descriptor for 'no-such-product' in any subject root/);
});

test("a real product resolves to its registered descriptor — from the EXTERNAL root", async () => {
  const p = await productFromArgv(["--product=almi-oet"]);
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

test("availableProducts is read from every root, and is not empty — or every test above is vacuous", () => {
  const found = availableProducts();
  assert.ok(found.includes("almi-oet"), "the product in the external root was not found");
  assert.ok(found.includes("neutral-test-ferments"), "the fixture in this repository was not found");
});

/* ---------- the roots and their refusals ---------- */

const scratch = () => mkdtempSync(join(tmpdir(), "subject-roots-"));
const declare = (root, id, body = `export const PRODUCT = { productId: "${id}" };\n`) => {
  mkdirSync(join(root, id), { recursive: true });
  writeFileSync(join(root, id, "product.mjs"), body);
};

test("🔴 an id found in TWO roots is refused, naming both paths — never resolved by precedence", () => {
  const a = scratch();
  const b = scratch();
  try {
    declare(a, "twin");
    declare(b, "twin");
    const roots = [{ id: "a", kind: "external", path: a }, { id: "b", kind: "external", path: b }];
    assert.throws(() => subjectIndex({ roots }), (e) => /declared in two roots/.test(e.message) && e.message.includes(join(a, "twin", "product.mjs")) && e.message.includes(join(b, "twin", "product.mjs")));
    // CONTROL: one root, the same id, resolves
    assert.equal(resolveSubject("twin", { roots: [roots[0]] }).dir, join(a, "twin"));
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("🔴 a missing root is refused, naming its path — never an empty list that reads as 'no such product'", () => {
  const gone = join(tmpdir(), "subject-roots-that-do-not-exist", "nowhere");
  assert.throws(() => subjectIndex({ roots: [{ id: "gone", kind: "external", path: gone }] }), (e) => e.message.includes(gone) && /is missing/.test(e.message));
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
    mkdirSync(join(root, "probe-subject"), { recursive: true });
    // written as a subject inside this repository would write it: two levels up, then src/
    writeFileSync(join(root, "probe-subject", "product.mjs"), `export { ID_PATTERN } from "../../src/subject-roots.mjs";\n`);
    writeFileSync(join(root, "probe-subject", "escape.mjs"), `export * from "../../package.json";\n`);
    const mod = await import(pathToFileURL(join(root, "probe-subject", "product.mjs")).href);
    const engine = await import("../src/subject-roots.mjs");
    assert.equal(mod.ID_PATTERN, engine.ID_PATTERN, "the subject reached a DIFFERENT copy of the engine");
    await assert.rejects(() => import(pathToFileURL(join(root, "probe-subject", "escape.mjs")).href), /leaves subject root .* does not land in the engine's src\//);
    // and a module path that leaves the subject's own folder is refused before any import
    await assert.rejects(() => importSubjectModule("probe-subject", "../other/product.mjs"), /is not a path inside subject/);
  } finally {
    if (prev === undefined) delete process.env[SUBJECT_ROOTS_ENV];
    else process.env[SUBJECT_ROOTS_ENV] = prev;
    rmSync(root, { recursive: true, force: true });
  }
});
