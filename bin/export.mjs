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
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/export.mjs", governed: true, resources: [RESOURCES.evidenceStore(), RESOURCES.inputPath(arg("store", null), "--store")] });

const storePath = arg("store", `${REPO}runs/evidence/evidence.jsonl`);
// 🔴 Confined BEFORE the store is read: a destination outside this repository is refused while nothing has happened.
const outDir = confineToRepo(arg("out", `${REPO}runs/export`), { label: "--out" });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:export:${RUN_INSTANT}`;

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
/* Three targets, three governed occurrences — one decision each, allowed or refused, each on the trail. The
 * directory is created by the boundary's own prepare step, so the bare mkdir site is gone rather than gated. */
for (const [name, body] of files) {
  const where = join(outDir, name);
  const size = `(${Buffer.byteLength(body, "utf8")} bytes)`;
  const governed = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
    repo: REPO, permission, target: where, targetClass: "RUN_EVIDENCE", bytes: body,
    action: `EXPORT_${name.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`,
    occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
  }));
  if (governed.outcome === "REFUSED") console.log(`[dry-run] would have written: ${where}  ${size} — nothing written, --confirm to write`);
  else if (governed.outcome === "COMMITTED" || governed.outcome === "ALREADY_COMMITTED") console.log(`written: ${where}  ${size} [${governed.outcome}]`);
  else { console.error(`🔴 ${governed.outcome} — ${where} was not written; the governed attempt is on the audit trail`); process.exitCode = 1; }
}

console.log("");
console.log("STATES CARRIED THROUGH (an export never upgrades one):");
for (const [k, v] of Object.entries(c.provenance.states)) console.log(`  ${k.padEnd(28)} ${v}`);
console.log("");
console.log("BOUNDS STATED IN EVERY FILE (LAW-BOUND-1):");
for (const [k, v] of Object.entries(c.provenance.bounds)) console.log(`  ${k.padEnd(34)} ${v}`);
