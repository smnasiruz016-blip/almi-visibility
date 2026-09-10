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
