#!/usr/bin/env node
/**
 * 🔴 F05 §4 — GENERATE THE HISTORICAL CROSSWALK (config/fboard/crosswalk.mjs). Without a flag it reports UP TO DATE or
 * STALE; `--check` exits 1 when stale; `--confirm` writes it (write-law LOCAL — src/write-law.mjs).
 *
 * One entry per F01–F96 from the extracted specification, its frozen acceptance (if any) and the declared mappings —
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
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";

/* F02 (24 Sep 2026): the two historical rows whose contracts concern isolation, in their LATEST applicable wording —
 * PASS_BOUNDARIES_AMENDMENT_6.md §3 "v0.1 half" (commit c317e9a, sha256 cb510255…), which supersedes the source's row 1
 * and row 54 text. Compared clause by clause; nothing is imported (authorityImported stays false, fresh verification
 * stays required). Non-mappings, with reasons, are in _handoffs/AlmiVisibility_F02_EVIDENCE_2026-09-24.md. */
export const MAPPINGS = Object.freeze({
  F02: Object.freeze({
    historicalRows: Object.freeze([1, 54]),
    historicalCommits: Object.freeze(["c317e9a34257cfdfee5db55e8d36aab9332dd52a"]),
    reusableModules: Object.freeze(["src/tenancy/resolver.mjs", "src/tenancy/attachment.mjs", "src/tenancy/row-partition.mjs", "src/tenancy/sitemap-residency.mjs"]),
    reusableTests: Object.freeze([]),
    contracts: Object.freeze([
      Object.freeze({
        row: "HISTORICAL_61:1 (amendment 6, v0.1 half)",
        input: "two declared products, and an accessor from each reaching for the other's data, evidence and cost records.",
        expected: "each of the three applicable record classes is reachable only from its own product.",
        failure: "any cross-product read succeeds, or an applicable class does not exist to be isolated.",
        evidence: "adversarial accessor tests over non-empty populations of all three applicable classes.",
      }),
      Object.freeze({
        row: "HISTORICAL_61:54 (amendment 6, v0.1 half)",
        input: "two declared products, each holding private evidence, facts and costs.",
        expected: "neither can see any of the other's three applicable classes.",
        failure: "any cross read succeeds, or an applicable class does not exist to be tested.",
        evidence: "adversarial tests over non-empty populations of all three applicable.",
      }),
    ]),
    notes: "CHANGED against both: F02 governs declared tenant scope over relationships (undeclared, ambiguous and scope-mismatch refusals, non-leakage) and names learning items and outputs; rows 1 and 54 isolate products over three record classes with learning deferred. No historical result transfers.",
  }),
});

/* 🔴 THE 61↔89 RECONCILIATION (command 65d05e2 §2.4). A POINTER, NOT A MAPPING: the row-by-row judgement (SAME · CHANGED · SPLIT ·
 * MERGED · PARTIAL · NO MATCH) lives in the committed artifact below, because this crosswalk's vocabulary (NEW · IDENTICAL · CHANGED ·
 * UNASSESSED) cannot hold it and flattening it would be a false record. Nothing here moves a row, maps a row or transfers a status:
 * MAPPINGS above stay the only asserted mappings, and only a frozen acceptance may add one. Disputed (D-CROSSWALK-DISPUTE-5): F03,
 * F04, F06, F08, F09 — the artifact proposes old counterparts, this crosswalk records them NEW; unresolved, so NOT overwritten. */
export const RECONCILIATION_ARTIFACT = Object.freeze({
  repo: "_handoffs", commit: "c09aa81c3344ec50ea987fea7486616dd8e892fb", dir: "AlmiVisibility_RECONCILIATION_61_89_2026-09-28",
  files: Object.freeze({
    "old_to_new.jsonl": "dc53268b280b671165ff8a34257f1e618d8b5390e624630da5d6f8c81877e1f2",
    "new_to_old.jsonl": "7bfc2e4bde344ae29a5073bf5f6f64285e4c9a505d12acc5df5ba5407670ccb5",
    "REPORT.md": "b83d6473ace00816239b098b960431204b5923d9bf2380a907a68cde44e83a7b",
  }),
  labelsHeldThere: Object.freeze(["SAME", "CHANGED", "SPLIT", "MERGED", "PARTIAL", "NO MATCH"]),
  openDisputes: Object.freeze(["F03", "F04", "F06", "F08", "F09"]),
});

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
/* Where the row-by-row 61↔89 judgement lives — a pointer, never a mapping (bin/fboard-crosswalk.mjs RECONCILIATION_ARTIFACT). */
export const RECONCILIATION_ARTIFACT = Object.freeze(${JSON.stringify(RECONCILIATION_ARTIFACT)});
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
  /* Routed. TEXT, measured: `text` comes from renderCrosswalk(). The --check exit code is preserved exactly. */
  const RUN_INSTANT = isoSeconds(Date.now());
  const governed = executeGovernedWrite(governedFileWrite({
    repo: new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    permission, target: OUT, targetClass: "GENERATED_CONFIG", bytes: text,
    action: "GENERATE_FBOARD_CROSSWALK", occurredAt: RUN_INSTANT, correlationId: `run:fboard-crosswalk:${RUN_INSTANT}`,
  }));
  if (governed.outcome === "COMMITTED" || governed.outcome === "ALREADY_COMMITTED") {
    console.log(`wrote ${OUT}`);
  } else if (governed.outcome === "REFUSED") {
    console.log(cur === text ? "crosswalk UP TO DATE" : "crosswalk STALE — run node bin/fboard-crosswalk.mjs --confirm");
    if (process.argv.includes("--check") && cur !== text) process.exit(1);
  } else {
    console.error(`🔴 ${governed.outcome} — ${OUT} was not written; the governed attempt is on the audit trail`);
    process.exit(1);
  }
}
