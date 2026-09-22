#!/usr/bin/env node
/**
 * THE ACTIVE F-BOARD'S CAPABILITY LIST, DERIVED FROM THE COMMITTED SPECIFICATION EXTRACT.
 *
 *   node bin/fboard-derive.mjs --extract=<path to the committed extract>             dry-run: UP TO DATE or STALE
 *   node bin/fboard-derive.mjs --extract=<path to the committed extract> --confirm   rebuild config/fboard/capabilities.mjs
 *
 * The extract is the owner's specification made reviewable (_handoffs f6886155, sha256 6a8c0ba2…2c47). Every line that
 * begins with an F-number is a capability row: "ID | Class | Capability | Required outcome". The generated file carries
 * the id, the class, the capability name and the sha256 of the row's exact line, plus the extract's own hash — so the
 * board can be re-derived from the same bytes by anyone, and a hand edit to the list is visible.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OUT = confineToRepo(`${REPO}config/fboard/capabilities.mjs`, { label: "the generated capability rows" });
export const EXTRACT_PROVENANCE = Object.freeze({
  repo: "_handoffs",
  path: "AlmiVisibility_Standalone_Product_Feature_Specification_v1.extract.txt",
  commit: "f68861551136bb64a9551311f6fe0474d1833f2b",
  sha256: "6a8c0ba2dd13213b853cf0949387b8fc09372194552859f7d9d699c624f22c47",
});
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

export function deriveCapabilities(extractText) {
  if (sha(extractText) !== EXTRACT_PROVENANCE.sha256) throw new Error(`EXTRACT_MISMATCH: the extract hashes ${sha(extractText)}, not the committed ${EXTRACT_PROVENANCE.sha256}`);
  const rows = extractText.split("\n").filter((l) => /^F\d{2,3} \| /.test(l)).map((line) => {
    const [id, domain, name] = line.split(" | ");
    return { id, domain, name, lineSha256: sha(line) };
  });
  return rows;
}

export function render(rows) {
  const L = [
    "/**",
    " * 🔴 GENERATED — DO NOT EDIT BY HAND. `node bin/fboard-derive.mjs --extract=<extract> --confirm` rebuilds it.",
    " *",
    " * The active F-board's capabilities, F01–F89, derived from the committed specification extract named below. Each",
    " * row carries the sha256 of its exact extract line, so a hand edit is visible and the list re-derives byte for byte.",
    " */",
    `export const EXTRACT_PROVENANCE = Object.freeze(${JSON.stringify(EXTRACT_PROVENANCE)});`,
    "export const CAPABILITIES = Object.freeze([",
    ...rows.map((r) => `  Object.freeze(${JSON.stringify(r)}),`),
    "]);",
    "",
  ];
  return L.join("\n");
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("bin/fboard-derive.mjs")) {
  const arg = process.argv.find((a) => a.startsWith("--extract="));
  if (!arg) { console.log("--extract=<path> is required: the board is derived from the committed extract, never from memory"); process.exit(1); }
  const rows = deriveCapabilities(readFileSync(arg.slice("--extract=".length), "utf8"));
  const text = render(rows);
  const fresh = existsSync(OUT) && readFileSync(OUT, "utf8") === text;
  console.log(`derived ${rows.length} capability row(s), ${new Set(rows.map((r) => r.id)).size} unique — ${OUT} is ${fresh ? "UP TO DATE" : "STALE"}`);
  // write-law LOCAL: only --confirm grants the write; without it the run derives, compares and reports
  const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
  if (permission.mayWrite) {
    if (!fresh) writeFileSync(OUT, text, "utf8");
    console.log(fresh ? "nothing to write" : "written");
  }
}
