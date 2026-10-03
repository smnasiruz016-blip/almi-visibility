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
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OUT = confineToRepo(`${REPO}config/fboard/capabilities.mjs`, { label: "the generated capability rows" });
export const EXTRACT_PROVENANCE = Object.freeze({
  repo: "_handoffs",
  /* Specification Amendment 4 (RR-153 §3; _handoffs 6c606b2): the amended_3 extract with ONE sentence APPENDED to F91's line — F91 owns the
   * governed question-to-page-candidate connection (the owner's assignment, RR-153 §2). Exactly one line differs; 91 rows; every other row
   * unchanged. Amendments 1–3 stay in history, their extracts byte-immutable. */
  /* (history) Specification Amendment 3 (RR-103 §2; _handoffs beb7362): the amended_2 extract with ONE row appended — F91 Page opportunity
   * planning — and its two count sentences 90 → 91. 91 rows; F01–F90 unchanged. The control F91 held ("the id one past the last row does
   * not exist") is restated as F92. Amendments 1 and 2 stay in history. */
  /* (history) Specification Amendment 2 (RR-80 §2; _handoffs 388ae02, applied 3f86fbf): the amended_1 extract with ten rows’ required
   * outcomes amended in place (F10 F14 F15 F16 F37 F38 F42 F44 F50 F62; F62 class to Core). 90 rows, ids unchanged. Amendment 1
   * (owner ruling a3a777b, amended_1 at 3738b25, sha256 56e2575a…) stays in history. The .docx and the v1 extract stay byte-immutable. */
  path: "AlmiVisibility_Standalone_Product_Feature_Specification_v1.amended_4.extract.txt",
  commit: "6c606b23effa9f5ae3bb9d94b1f6ee69fbbdfb04",
  sha256: "53db85b7968941a0e694022013bf4f11cb89f2ecd587581f17b63663e7cd892a",
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
    " * The active F-board's capabilities, F01–F91, derived from the committed specification extract named below. Each",
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
  /* Routed. TEXT, measured: `text` comes from render(rows). The freshness short-circuit is preserved by the
   * boundary itself: when the target already carries these exact bytes, inspect() returns ALREADY_COMMITTED and no
   * rename happens — which is the same decision `!fresh` was making, now recorded rather than silent. */
  const RUN_INSTANT = isoSeconds(Date.now());
  const governed = executeGovernedWrite(governedFileWrite({
    repo: new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    permission, target: OUT, targetClass: "GENERATED_CONFIG", bytes: text,
    action: "GENERATE_FBOARD_CAPABILITIES", occurredAt: RUN_INSTANT, correlationId: `run:fboard-derive:${RUN_INSTANT}`,
  }));
  if (governed.outcome === "COMMITTED") console.log("written");
  else if (governed.outcome === "ALREADY_COMMITTED") console.log("nothing to write");
  else if (governed.outcome !== "REFUSED") {
    console.error(`🔴 ${governed.outcome} — ${OUT} was not written; the governed attempt is on the audit trail`);
    process.exit(1);
  }
}
