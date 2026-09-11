import test from "node:test";
import assert from "node:assert/strict";

import { productFromArgv, productIdFromArgv, availableProducts } from "../src/product-cli.mjs";

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
  for (const bad of ["../etc", "a/b", "..", "Almi-OET", "almi_oet", "./x"]) {
    await assert.rejects(
      () => productFromArgv([`--product=${bad}`]),
      /is not a product id/,
      `${bad} was accepted as an id`,
    );
  }
});

test("an unknown product is refused by name, not by a crash", async () => {
  await assert.rejects(() => productFromArgv(["--product=no-such-product"]), /no descriptor at products\/no-such-product/);
});

test("a real product resolves to its registered descriptor", async () => {
  const p = await productFromArgv(["--product=almi-oet"]);
  assert.equal(p.productId, "almi-oet");
  assert.equal(p.axis.key, "profession");
  assert.equal(p.variants.length, 12);
  assert.ok(p.factsDir.length > 0);
  assert.ok(p.placement.allRepeated.length > 0);
});

test("the flag is read from anywhere in argv, not from a fixed position", () => {
  assert.equal(productIdFromArgv(["node", "x.mjs", "--page=nursing", "--product=almi-oet"]), "almi-oet");
  assert.equal(productIdFromArgv(["--product=almi-oet", "--page=nursing"]), "almi-oet");
  assert.equal(productIdFromArgv(["--page=nursing"]), null);
});

test("availableProducts is read from disk, and is not empty — or every test above is vacuous", () => {
  const found = availableProducts();
  assert.ok(found.includes("almi-oet"), "the one product on disk was not found");
  assert.ok(found.length >= 1);
});
