#!/usr/bin/env node
/**
 * ROW 60 — THE OWNER RULING SHEET, GENERATED FROM THE STORE.
 *
 *   node bin/row60-ruling-sheet.mjs              reconcile the COMMITTED sheet with the store and the register;
 *                                                print it only if all three agree — otherwise REFUSE, exit 1
 *   node bin/row60-ruling-sheet.mjs --confirm    write the sheet from the store (Markdown + JSON), and only when
 *                                                the register already reconciles with the store
 *
 * 🔴 IT READS EVERY `.jsonl` UNDER runs/ — not a sample, not a chosen list — and prints each file with what it held,
 * so a file that was not read cannot pass unnoticed.
 *
 * 🔴 A SHEET THAT DISAGREES IS NEVER PRINTED. A number a person rules on must be the store's number.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { buildRulingSheet, reconcileSheet, renderRulingSheet } from "../src/audit/ruling-sheet.mjs";
import { CONSEQUENCE_REGISTER, UNREACHABLE_RECOMMENDATIONS } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const JSON_OUT = confineToRepo(join(REPO, "runs", "export", "row60-ruling-sheet.json"), { label: "sheet (json)" });
const MD_OUT = confineToRepo(join(REPO, "runs", "export", "row60-ruling-sheet.md"), { label: "sheet (markdown)" });

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".jsonl") ? [p] : [];
});
const files = walk(join(REPO, "runs")).sort().map((p) => ({ file: relative(REPO, p).split("\\").join("/"), records: createJsonlStore(p).readAll() }));

const fresh = buildRulingSheet({ files, register: CONSEQUENCE_REGISTER, unreachable: UNREACHABLE_RECOMMENDATIONS, scale: SEVERITY_SCALE, generatedAt: new Date().toISOString() });
const confirmMode = process.argv.includes("--confirm");

console.log("ROW 60 — OWNER RULING SHEET\n");
console.log(`files read: ${fresh.sources.length} — every .jsonl under runs/`);
for (const s of fresh.sources) console.log(`  ${s.file.padEnd(62)} records ${String(s.records).padStart(5)} · issues ${String(s.issueRecords).padStart(5)} · state changes ${String(s.stateChanges).padStart(4)} · recommendations ${s.recommendations}`);
console.log("");

if (confirmMode) {
  const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
  // The register must already agree with the store: a sheet is never written over a disagreement.
  const pre = reconcileSheet({ sheet: fresh, fresh, register: CONSEQUENCE_REGISTER, unreachable: UNREACHABLE_RECOMMENDATIONS, scale: SEVERITY_SCALE });
  if (!pre.ok) {
    console.error("🔴 REFUSED — the register and the store disagree, so no sheet is written:");
    for (const e of pre.errors) console.error(`   [${e.limb}] ${e.class ?? ""} ${e.why}`);
    process.exit(1);
  }
  if (permission.mayWrite) {
    if (!existsSync(dirname(JSON_OUT))) mkdirSync(dirname(JSON_OUT), { recursive: true });
    writeFileSync(JSON_OUT, `${JSON.stringify(fresh, null, 2)}\n`, "utf8");
    writeFileSync(MD_OUT, renderRulingSheet(fresh), "utf8");
    console.log(`wrote ${relative(REPO, JSON_OUT)} and ${relative(REPO, MD_OUT)}`);
  }
  process.exit(0);
}

if (!existsSync(JSON_OUT)) {
  console.error("🔴 REFUSED — no committed sheet to reconcile. Generate it with --confirm.");
  process.exit(1);
}
const committed = JSON.parse(readFileSync(JSON_OUT, "utf8"));
const r = reconcileSheet({ sheet: committed, fresh, register: CONSEQUENCE_REGISTER, unreachable: UNREACHABLE_RECOMMENDATIONS, scale: SEVERITY_SCALE });
if (!r.ok) {
  console.error("🔴 REFUSED — the sheet, the register and the store do not agree. The sheet is NOT printed:");
  for (const e of r.errors) console.error(`   [${e.limb}] ${e.class ?? ""} — ${e.why}`);
  process.exit(1);
}
console.log("✅ the committed sheet, the register and the store agree\n");
process.stdout.write(renderRulingSheet(committed));
process.exit(0);
