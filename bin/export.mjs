#!/usr/bin/env node
/**
 * v0.1 ITEM 6 — write the Markdown / JSON / CSV exports.
 *
 * Reads the evidence store and writes three files. No network, no measurement,
 * no judgement. Usage:
 *   node bin/export.mjs [--store=<path>] [--out=<dir>]
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { collect, buildMarkdown, buildJson, buildCsv } from "../src/export/build.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const storePath = arg("store", `${REPO}runs/evidence/evidence.jsonl`);
const outDir = arg("out", `${REPO}runs/export`);

if (!existsSync(storePath)) {
  console.error(`no evidence store at ${storePath} — run bin/gsc-ingest.mjs first`);
  process.exit(2);
}

const records = createJsonlStore(storePath).readAll();
const c = collect(records, { generatedAt: new Date().toISOString() });

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const files = [
  ["evidence.md", buildMarkdown(c)],
  ["evidence.json", buildJson(c)],
  ["estate.csv", buildCsv(c)],
];
for (const [name, body] of files) {
  writeFileSync(join(outDir, name), body, "utf8");
  console.log(`written: ${join(outDir, name)}  (${Buffer.byteLength(body, "utf8")} bytes)`);
}

console.log("");
console.log("STATES CARRIED THROUGH (an export never upgrades one):");
for (const [k, v] of Object.entries(c.provenance.states)) console.log(`  ${k.padEnd(28)} ${v}`);
console.log("");
console.log("BOUNDS STATED IN EVERY FILE (LAW-BOUND-1):");
for (const [k, v] of Object.entries(c.provenance.bounds)) console.log(`  ${k.padEnd(34)} ${v}`);
