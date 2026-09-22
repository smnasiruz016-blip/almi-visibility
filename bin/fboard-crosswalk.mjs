#!/usr/bin/env node
/**
 * 🔴 F05 §4 — GENERATE THE HISTORICAL CROSSWALK (config/fboard/crosswalk.mjs). Without a flag it reports UP TO DATE or
 * STALE; `--check` exits 1 when stale; `--confirm` writes it (write-law LOCAL — src/write-law.mjs).
 *
 * One entry per F01–F89 from the extracted specification, its frozen acceptance (if any) and the declared mappings —
 * and the historical ledger's 61 status records as PROVENANCE ONLY. Nothing here moves a state or imports authority.
 *
 * MAPPINGS: none is asserted. Which historical rows an F-row reuses is a judgement that belongs to that F-row's own
 * frozen acceptance; until one is frozen, the entry says so. No historical row carries a four-clause contract, so no
 * lawful IDENTICAL or CHANGED comparison exists yet: an F-row with a frozen acceptance is NEW, every other UNASSESSED.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { classify } from "../src/checklist/classification.mjs";
import { buildCrosswalk, crosswalkErrors } from "../src/fboard/crosswalk.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";

export const MAPPINGS = Object.freeze({});

export function renderCrosswalk() {
  const rows = classify();
  const historicalRows = Object.keys(rows).sort((a, b) => a - b).map((id) => ({ board: rows[id].board, id: Number(id), state: rows[id].state }));
  const cw = buildCrosswalk({ capabilities: CAPABILITIES, acceptances: ACCEPTANCES, mappings: MAPPINGS, historicalRows });
  const errors = crosswalkErrors(cw);
  const text = `/**
 * 🔴 GENERATED — DO NOT EDIT. node bin/fboard-crosswalk.mjs (--check verifies freshness).
 * One entry per F-row; the historical ledger's rows are PROVENANCE ONLY — no state, no acceptance, no authority transfers.
 */
export const CROSSWALK = Object.freeze(${JSON.stringify(cw, null, 2)});
`;
  return { cw, errors, text };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const OUT = confineToRepo(join(dirname(fileURLToPath(import.meta.url)), "..", "config", "fboard", "crosswalk.mjs"), { label: "the generated crosswalk" });
  const { cw, errors, text } = renderCrosswalk();
  const rel = cw.entries.reduce((m, e) => ((m[e.acceptanceRelation] = (m[e.acceptanceRelation] ?? 0) + 1), m), {});
  console.log(`entries ${cw.entries.length} · relations ${JSON.stringify(rel)} · provenance ${cw.provenance.length} (boards ${[...new Set(cw.provenance.map((p) => p.board))].join(", ")}) · errors ${errors.length}`);
  if (errors.length) { for (const e of errors) console.log("  ", JSON.stringify(e)); process.exit(1); }
  // write-law LOCAL: only --confirm grants the write; without it the run builds, compares and reports
  const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
  if (permission.mayWrite) {
    writeFileSync(OUT, text, "utf8");
    console.log(`wrote ${OUT}`);
  } else {
    console.log(cur === text ? "crosswalk UP TO DATE" : "crosswalk STALE — run node bin/fboard-crosswalk.mjs --confirm");
    if (process.argv.includes("--check") && cur !== text) process.exit(1);
  }
}
