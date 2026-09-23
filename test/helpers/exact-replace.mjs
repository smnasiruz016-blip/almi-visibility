/**
 * ROUTING CODEMOD — applies exact-literal replacements and REFUSES anything ambiguous.
 *
 * Every `from` must occur EXACTLY ONCE in the file. Zero occurrences means the file is not what the spec thought
 * it was; two means the edit would land in a place nobody looked at. Both are refused, and nothing is written for
 * that file, so a half-applied routing cannot exist.
 *
 *   node .test-scratch/f08e-route.mjs <spec.json> [--apply]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const spec = JSON.parse(readFileSync(process.argv[2], "utf8"));
const apply = process.argv.includes("--apply");

let ok = 0, refused = 0;
for (const entry of spec) {
  const path = join(REPO, entry.file);
  const original = readFileSync(path, "utf8");
  let text = original;
  const problems = [];

  for (const [from, to] of entry.replacements) {
    const count = text.split(from).length - 1;
    if (count !== 1) { problems.push(`${count} occurrence(s) of: ${from.slice(0, 70).split("\n")[0]}`); continue; }
    text = text.split(from).join(to);
  }

  if (problems.length) {
    refused += 1;
    console.log(`REFUSED ${entry.file}`);
    for (const p of problems) console.log(`         ${p}`);
    continue;
  }
  if (text === original) { console.log(`NO-OP   ${entry.file}`); continue; }
  if (apply) writeFileSync(path, text, "utf8");
  ok += 1;
  console.log(`${apply ? "ROUTED " : "WOULD  "} ${entry.file}`);
}
console.log(`\n${apply ? "applied" : "dry-run"}: ${ok} file(s) · REFUSED ${refused}`);
process.exit(refused === 0 ? 0 : 1);
