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
      // Only our own modules. A bare specifier is node: or a dependency — the one
      // dependency, playwright-core, is loaded lazily by src/render/renderer.mjs.
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

/* ================================================================== *
 * 🔴 THE ORPHAN MODULE CENSUS — GENERALISED FROM TWO REAL INCIDENTS.
 *
 * Incident one: `bin/placement-measure.mjs` was dead from PR #20 and nobody
 * noticed for a day.
 *
 * Incident two: `src/evidence/transitions.mjs` encoded the law that UNKNOWN
 * never becomes PASS, was proved falsifiable by injection — and was imported
 * by NOTHING except its own test. It governed no production path at all.
 *
 * Same shape both times: a module whose only consumer is the thing that
 * verifies it. Its tests pass, its coverage looks fine, and it is doing no
 * work. **A guard that governs no production path is not a guard.**
 *
 * So this counts, for every module under src/, how many NON-TEST modules
 * import it. Zero is a failure.
 *
 * ── WHY AN ALLOWLIST EXISTS, AND WHY IT IS EMPTY ───────────────────────────
 *
 * Some module will one day legitimately have no importer — a CLI-only helper,
 * or code staged ahead of its caller. An exemption is fine; an exemption
 * NOBODY WROTE DOWN is how the last two got in. So an entry needs a one-line
 * reason, and the reason is read by a human at review time.
 *
 * 🔴 THE GOAL IS AN EMPTY ALLOWLIST. It is empty today.
 * ================================================================== */

/** module path (repo-relative, forward slashes) → why it has no importer. */
const ORPHAN_ALLOWLIST = Object.freeze({
  // "src/example.mjs": "reason, dated, and who accepted it",
});

function walkMjs(dir, prefix) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...walkMjs(join(dir, entry.name), `${prefix}${entry.name}/`));
    else if (entry.name.endsWith(".mjs")) out.push(`${prefix}${entry.name}`);
  }
  return out;
}

test("🔴 ORPHAN CENSUS: no module under src/ is imported ONLY by its own test", () => {
  const SRC = join(REPO, "src");
  const modules = walkMjs(SRC, "src/").sort();
  assert.ok(modules.length > 20, `only ${modules.length} modules found — the census would be weak`);

  // Every place that could import a src/ module, EXCEPT test files.
  const consumers = [
    ...walkMjs(SRC, "src/"),
    ...readdirSync(BIN).filter((f) => f.endsWith(".mjs")).map((f) => `bin/${f}`),
    ...walkMjs(join(REPO, "tools"), "tools/"),
    ...walkMjs(join(REPO, "products"), "products/"),
  ];

  const sources = new Map(consumers.map((rel) => [rel, readFileSync(join(REPO, rel), "utf8")]));

  const orphans = [];
  for (const mod of modules) {
    const base = mod.split("/").pop();
    let importers = 0;
    for (const [rel, src] of sources) {
      if (rel === mod) continue; // a module importing itself is not a consumer
      // Match the filename in any import specifier. Coarse on purpose: a
      // false NEGATIVE here would hide an orphan, and that is the failure
      // mode this test exists to prevent. A false positive is harmless.
      if (new RegExp(`from\\s*["'][^"']*${base.replace(/\./g, "\\.")}["']`).test(src)) {
        importers += 1;
        break;
      }
    }
    if (importers === 0 && !(mod in ORPHAN_ALLOWLIST)) orphans.push(mod);
  }

  assert.deepEqual(
    orphans,
    [],
    `\n  These modules under src/ are imported by nothing but their own tests:\n  ` +
      `${orphans.join("\n  ")}\n\n  Wire it into the real path, delete it, or add it to ` +
      `ORPHAN_ALLOWLIST with a written reason.\n`,
  );
});

test("🔴 ORPHAN CENSUS: every allowlist entry carries a written reason", () => {
  for (const [mod, reason] of Object.entries(ORPHAN_ALLOWLIST)) {
    assert.ok(
      typeof reason === "string" && reason.trim().length > 15,
      `${mod} is allowlisted with no real reason — an undocumented exemption is how the last two orphans got in`,
    );
  }
  // 🔴 Recorded, not asserted as a hard limit: the goal is zero. If this number
  // grows, the census is being managed rather than obeyed.
  assert.ok(Object.keys(ORPHAN_ALLOWLIST).length <= 3, "the allowlist is becoming a habit");
});
