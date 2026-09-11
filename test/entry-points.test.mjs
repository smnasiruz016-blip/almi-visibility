import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(REPO, "bin");

/**
 * 🔴 THE HOLE THIS CLOSES, AND IT HAD ALREADY SWALLOWED SOMETHING.
 *
 * `bin/placement-measure.mjs` imported two constants that were deleted from
 * `src/page/claim-placement.mjs` in the same change that deleted them. It threw
 * on its first line from that commit onwards, and **nobody noticed for a day**,
 * because the test suite tests `src/` and nothing runs the runners.
 *
 *   THE SUITE COVERED THE ENGINE. THE WAYS TO USE THE ENGINE WERE COVERED BY
 *   NOTHING.
 *
 * ⚠️ And a CI job running `npm test` would not have caught it either. This test
 * is what makes the gate real for `bin/`.
 *
 * ── WHY IT READS THE SOURCE INSTEAD OF IMPORTING IT ────────────────────────
 *
 * Importing a runner EXECUTES it — these are scripts, not libraries. They would
 * fetch, write files and exit. So the check is static: every named import in
 * every runner is resolved against what the target module actually exports.
 */

const files = readdirSync(BIN).filter((f) => f.endsWith(".mjs")).sort();

test("there are runners to check — this law is not passing on an empty set", () => {
  assert.ok(files.length >= 10, `only ${files.length} runners found`);
});

/** `import { a, b as c } from "./x.mjs";` → { spec, names } */
function namedImports(source) {
  const out = [];
  const re = /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const names = m[1]
      .split(",")
      .map((n) => n.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    out.push({ spec: m[2], names });
  }
  return out;
}

test("🔴 every named import in every runner resolves to a real export", async () => {
  const broken = [];

  for (const file of files) {
    const source = readFileSync(join(BIN, file), "utf8");
    for (const { spec, names } of namedImports(source)) {
      // Only our own modules. A bare specifier is node: or a dependency, and
      // this project has no dependencies.
      if (!spec.startsWith(".")) continue;
      const target = resolve(BIN, spec);
      let mod;
      try {
        mod = await import(pathToFileURL(target).href);
      } catch (e) {
        broken.push(`${file} → ${spec} — module failed to load: ${e.message.split("\n")[0]}`);
        continue;
      }
      for (const name of names) {
        if (!(name in mod)) broken.push(`${file} imports { ${name} } from ${spec} — THAT EXPORT DOES NOT EXIST`);
      }
    }
  }

  assert.deepEqual(broken, [], `\n  ${broken.join("\n  ")}\n`);
});

test("🔴 every runner that needs a product takes it as an ARGUMENT, never as an import", () => {
  const offenders = [];
  for (const file of files) {
    const source = readFileSync(join(BIN, file), "utf8");
    // A runner may not reach into a product folder at all. If it needs one it
    // resolves it from argv, which is what `productFromArgv` does.
    if (/from\s*["'][^"']*\/products\//.test(source)) {
      offenders.push(`${file} imports from products/ directly`);
    }
  }
  assert.deepEqual(offenders, [], `\n  ${offenders.join("\n  ")}\n`);
});
