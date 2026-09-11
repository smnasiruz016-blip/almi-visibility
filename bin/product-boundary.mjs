#!/usr/bin/env node
/**
 * Print the product-boundary census: which files under src/ still name a
 * product, in code and in comments, file by file.
 *
 * The test in test/product-boundary.test.mjs enforces the law. This prints the
 * same numbers from the SAME scanner so the report and the gate can never
 * disagree — a second implementation here would eventually give the quieter
 * answer, and the quieter answer is the one that gets believed.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { scanSource, distinctLines } from "../tools/product-boundary.mjs";
import { countDetectorFiles, MAX_DETECTOR_FILES } from "../tools/detector-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(REPO, "src");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".mjs")) out.push(full);
  }
  return out.sort();
}

const rows = [];
let codeLines = 0;
let commentLines = 0;
let codeHits = 0;

for (const file of walk(SRC)) {
  const { code, comment } = scanSource(readFileSync(file, "utf8"));
  const rel = "src/" + file.replace(/\\/g, "/").split("/src/")[1];
  const c = distinctLines(code);
  const m = distinctLines(comment);
  codeLines += c;
  commentLines += m;
  codeHits += code.length;
  rows.push({ rel, code: c, comment: m });
}

const width = Math.max(...rows.map((r) => r.rel.length));
console.log("PRODUCT BOUNDARY — lines under src/ naming a product\n");
console.log(`${"file".padEnd(width)}  CODE  comment`);
for (const r of rows.sort((a, b) => b.code - a.code || a.rel.localeCompare(b.rel))) {
  const flag = r.code > 0 ? " 🔴" : r.comment > 0 ? "  ·" : "";
  console.log(`${r.rel.padEnd(width)}  ${String(r.code).padStart(4)}  ${String(r.comment).padStart(7)}${flag}`);
}
console.log("-".repeat(width + 15));
console.log(`${"TOTAL".padEnd(width)}  ${String(codeLines).padStart(4)}  ${String(commentLines).padStart(7)}`);
console.log(`\ncode lines: ${codeLines}  (${codeHits} occurrences)   comment lines: ${commentLines} — allowed`);
console.log(codeLines === 0 ? "\n✅ the system names no product in code." : "\n🔴 the system still knows which product it is serving.");

/**
 * 🔴 C5 — THE DETECTOR CENSUS, PRINTED BY THE SAME COUNTER THE TEST USES.
 *
 * A second implementation here would eventually give the quieter answer, and the
 * quieter answer is the one that gets believed. So `bin/` and `test/` share
 * `tools/detector-census.mjs` and cannot disagree.
 */
const detectors = countDetectorFiles(REPO);
console.log(`\nDETECTOR CENSUS: ${detectors.count} detector files (ceiling ${MAX_DETECTOR_FILES})`);
if (detectors.count > 0) {
  for (const f of detectors.files) console.log(`  🔴 ${f}`);
  console.log("\n🔴 THIS PR BUILDS THE SHELF. IT DOES NOT BUILD WHAT GOES ON IT.");
} else {
  console.log("✅ zero detectors — the evidence store is not built to the six known RED classes.");
}

/**
 * 🔴 AND THE EXIT CODE, WHICH THIS SCRIPT DID NOT HAVE UNTIL A CI JOB NEEDED IT.
 *
 * It printed the breach and exited 0 — so run as a build step it would have
 * reported the failure in a log fold and passed the build anyway. **A check that
 * cannot fail is the pattern this project hunts**, and this one had been sitting
 * in `bin/` since the law was written.
 *
 * The test in `test/product-boundary.test.mjs` was always the real enforcement.
 * This makes the REPORT enforce it too, so the two cannot disagree.
 */
process.exit(codeLines === 0 && detectors.count <= MAX_DETECTOR_FILES ? 0 : 1);
