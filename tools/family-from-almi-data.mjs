#!/usr/bin/env node
/**
 * RR-303 C · THE FAMILY LIST FROM almi-data, NEVER BY HAND. Reads the built package (its dist/family.js and package.json) from an
 * almi-data checkout and writes site/family.generated.json: its products and network links exactly as the package exports them, with the
 * package's name, version and the sha256 of the dist file it was read from. The site reads only this file (site/family.mjs).
 *   node tools/family-from-almi-data.mjs <path to almi-data checkout, built>
 * A test (test/rr303-*.test.mjs) re-reads the package when the checkout is beside this repo and fails on any difference.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

export function familyFromPackage(dir) {
  const distFile = join(dir, "dist", "family.js");
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const mod = createRequire(import.meta.url)(resolve(distFile));
  return {
    source: { package: pkg.name, version: pkg.version, file: "dist/family.js", sha256: createHash("sha256").update(readFileSync(distFile)).digest("hex") },
    products: mod.FAMILY_PRODUCTS.map((p) => ({ key: p.key, name: p.name, href: p.href })),
    network: Object.fromEntries(Object.entries(mod.NETWORK_LINKS).map(([k, v]) => [k, { name: v.name, href: v.href }])),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node tools/family-from-almi-data.mjs <almi-data checkout, built>"); process.exit(2); }
  const out = new URL("../site/family.generated.json", import.meta.url);
  const f = familyFromPackage(dir);
  writeFileSync(out, JSON.stringify(f, null, 1) + "\n");
  console.log(`family list from ${f.source.package} ${f.source.version}: ${f.products.length} products · ${Object.keys(f.network).length} network links`);
}
