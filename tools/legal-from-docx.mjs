#!/usr/bin/env node
/**
 * 🔴 RR-325 C · site/legal.generated.json FROM THE OWNER'S WORD FILE — the only writer of that file (no hand copy, no rewriting).
 *   node tools/legal-from-docx.mjs "<path to AlmiVisibility_Terms_and_Privacy_….docx>"
 * Reads the .docx (a ZIP) with the repository's own reader, keeps every paragraph's words, headings, lists, the table, bold words and links
 * (site/legal.mjs), splits the Terms of Service and the Privacy Policy, and records the file's name and the sha256 of its bytes. Every
 * "[FILL …]" still in a page is listed — that page is not published until it is filled and this is run again.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { createHash } from "node:crypto";
import { unzip } from "../desktop/google-connect.mjs";
import { docxBlocks, legalPages, fillsIn } from "../site/legal.mjs";

export function legalFromDocx(bytes, name) {
  const z = unzip(bytes); if (!z?.["document.xml"]) throw new Error("not a Word file (no word/document.xml)");
  const pages = legalPages(docxBlocks(z["document.xml"], z["document.xml.rels"] ?? ""));
  if (!pages.terms || !pages.privacy) throw new Error("the file has no \"Terms of Service\" or no \"Privacy Policy\" heading");
  return { source: { file: name, sha256: createHash("sha256").update(bytes).digest("hex"), readOn: new Date().toISOString().slice(0, 10) }, fills: { terms: fillsIn(pages.terms), privacy: fillsIn(pages.privacy) }, terms: pages.terms, privacy: pages.privacy };
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  const f = process.argv[2]; if (!f) { console.error("usage: node tools/legal-from-docx.mjs <the owner's .docx>"); process.exit(2); }
  const g = legalFromDocx(readFileSync(f), basename(f)), out = new URL("../site/legal.generated.json", import.meta.url); // inside this repository, as tools/family-from-almi-data.mjs writes
  writeFileSync(out, JSON.stringify(g, null, 1) + "\n");
  console.log(`site/legal.generated.json ← ${g.source.file} · terms ${g.terms.length} blocks${g.fills.terms.length ? ` · NOT PUBLISHED, to fill: ${g.fills.terms.join(" ")}` : " · ready"} · privacy ${g.privacy.length} blocks${g.fills.privacy.length ? ` · NOT PUBLISHED, to fill: ${g.fills.privacy.join(" ")}` : " · ready"}`);
}
