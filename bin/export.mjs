#!/usr/bin/env node
/**
 * v0.1 ITEM 6 — build the Markdown / JSON / CSV exports.
 *
 * Reads the evidence store and builds three files. No network, no measurement,
 * no judgement.
 *
 * 🔴 DRY-RUN BY DEFAULT SINCE 15 SEPTEMBER 2026 (gap 1). Until then it wrote
 * runs/export/ — tracked EVIDENCE (.gitattributes runs/**) — on every run: the
 * same shape as the facts-lifecycle writer that rewrote a committed evidence file
 * on 14 September when it was run only to read a number. It now prints what it
 * built — every file's size, the states and the bounds — and writes only with
 * --confirm, into a directory confined to this repository.
 *
 *   node bin/export.mjs [--store=<path>] [--out=<dir>]             builds and prints, writes nothing
 *   node bin/export.mjs [--store=<path>] [--out=<dir>] --confirm   also writes the three files
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { collect, buildMarkdown, buildJson, buildCsv } from "../src/export/build.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const storePath = arg("store", `${REPO}runs/evidence/evidence.jsonl`);
// 🔴 Confined BEFORE the store is read: a destination outside this repository is refused while nothing has happened.
const outDir = confineToRepo(arg("out", `${REPO}runs/export`), { label: "--out" });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));

if (!existsSync(storePath)) {
  console.error(`no evidence store at ${storePath} — run bin/gsc-ingest.mjs first`);
  process.exit(2);
}

const records = createJsonlStore(storePath).readAll();
const c = collect(records, { generatedAt: new Date().toISOString() });

const files = [
  ["evidence.md", buildMarkdown(c)],
  ["evidence.json", buildJson(c)],
  ["estate.csv", buildCsv(c)],
];
if (permission.mayWrite) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  for (const [name, body] of files) {
    writeFileSync(join(outDir, name), body, "utf8");
    console.log(`written: ${join(outDir, name)}  (${Buffer.byteLength(body, "utf8")} bytes)`);
  }
} else {
  for (const [name, body] of files) console.log(`[dry-run] would have written: ${join(outDir, name)}  (${Buffer.byteLength(body, "utf8")} bytes) — nothing written, --confirm to write`);
}

console.log("");
console.log("STATES CARRIED THROUGH (an export never upgrades one):");
for (const [k, v] of Object.entries(c.provenance.states)) console.log(`  ${k.padEnd(28)} ${v}`);
console.log("");
console.log("BOUNDS STATED IN EVERY FILE (LAW-BOUND-1):");
for (const [k, v] of Object.entries(c.provenance.bounds)) console.log(`  ${k.padEnd(34)} ${v}`);
