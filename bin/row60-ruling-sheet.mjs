#!/usr/bin/env node
/**
 * ROW 60 — THE OWNER RULING SHEET, GENERATED FROM THE STORE.
 *
 *   node bin/row60-ruling-sheet.mjs              reconcile the COMMITTED sheet with the store and the register;
 *                                                print it only if all three agree — otherwise REFUSE, exit 1
 *   node bin/row60-ruling-sheet.mjs --confirm    write the sheet from the store (Markdown + JSON), and only when
 *                                                the register already reconciles with the store
 *
 * 🔴 IT READS EVERY `.jsonl` UNDER runs/ **AND** EVERY DECLARED EXTERNAL OBSERVATION SOURCE — not a sample, not a
 * chosen list — and prints each file with what it held, so a file that was not read cannot pass unnoticed.
 * (It read only `runs/` until 20 September 2026, which silently dropped two sources the moment they moved out.)
 *
 * 🔴 A SHEET THAT DISAGREES IS NEVER PRINTED. A number a person rules on must be the store's number.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { declaredObservationSources, mergeDeclaredSources } from "../src/crawl/observation-batch.mjs";
import { buildRulingSheet, reconcileSheet, renderRulingSheet } from "../src/audit/ruling-sheet.mjs";
import { CONSEQUENCE_REGISTER, UNREACHABLE_RECOMMENDATIONS, SUPERSEDED_ENTRIES } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";
import { CLASS_SPLITS, UNMEASURED_REASON_CODES } from "../config/class-splits.mjs";
import { COVERAGE_REGISTER } from "../config/coverage-register.mjs";
import { DECISION_REGISTER } from "../config/decision-register.mjs";
import { AUDIT_TRAIL } from "../config/audit-trail.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { authorise, authorisationEvent, namedActor, AUTHORISATION_REFUSED_EXIT } from "../src/governance/authorisation.mjs";
import { diagnosticGuardSink } from "../src/governance/guard-audit.mjs";
import { governedGuardSink } from "../src/governance/governed-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const JSON_OUT = confineToRepo(join(REPO, "runs", "export", "row60-ruling-sheet.json"), { label: "sheet (json)" });
const MD_OUT = confineToRepo(join(REPO, "runs", "export", "row60-ruling-sheet.md"), { label: "sheet (markdown)" });
/* 🔴 RR-196 · A GLOBAL READ DECLARED UNDER F02 (owner approved, 7 Oct 2026; declaration 357a138) — NOT a tenant read and NOT a bypass.
 * The owner's ruling sheet reads every run store to count issues by class, so it names no tenant: F04 decides READ_OWNER_RULING_SHEET for
 * the named actor at GLOBAL_PRODUCT scope BEFORE anything is read; a refusal ends the process (exit 5). Its only output is the owner's
 * sheet (GLOBAL_PRODUCT-scoped governed writes); it changes no tenant's data. The decision reaches the audit trail ONLY on the --confirm
 * run, which writes; a reconcile run records it to the diagnostic sink and writes nothing at all. */
export const SHEET_SCOPE = Object.freeze({ scopeType: "GLOBAL_PRODUCT", action: "READ_OWNER_RULING_SHEET", authority: "RR-196 · owner, 7 Oct 2026" });
const confirmMode = process.argv.includes("--confirm");
const ENTRY = "bin/row60-ruling-sheet.mjs";
const sink = confirmMode
  ? governedGuardSink({ repo: REPO, env: process.env, correlationId: `run:${ENTRY}:global-read:${isoSeconds(Date.now())}`, now: isoSeconds(Date.now()).slice(0, 10), actor: ENTRY })
  : diagnosticGuardSink({ actor: ENTRY });
const decision = authorise({ actorRef: namedActor(process.argv), action: SHEET_SCOPE.action, scope: { scopeType: SHEET_SCOPE.scopeType }, resourceRef: "row60-ruling-sheet", now: new Date().toISOString() });
sink.emit(authorisationEvent(decision));
if (!decision.allowed) {
  console.error(`🔴 AUTHORISATION REFUSED — ${SHEET_SCOPE.action}: ${decision.outcome} (${decision.reason}); nothing was read`);
  process.exit(AUTHORISATION_REFUSED_EXIT);
}

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".jsonl") ? [p] : [];
});

/**
 * 🔴 THE POPULATION IS ENGINE-LOCAL SOURCES **PLUS** DECLARED EXTERNAL ONES.
 *
 * This used to read only `runs/`, which was the whole population when every record file lived here.
 * Two of them have since moved to the external data repository, and reading `runs/` alone quietly
 * dropped both — 999 records of crawl and 5 of sitemap — from a census whose entire purpose is that
 * "a file that was not read cannot pass unnoticed".
 *
 * The external sources are enumerated through the EXISTING external-root mechanism, never by a path
 * written here: no sibling directory is scanned, no machine path and no client name appears, and an
 * unreadable root or a file the manifest does not declare RAISES rather than shortening the list.
 *
 * 🔴 AND NOTHING IS DE-DUPLICATED, because nothing is duplicated. Each migrated file exists in
 * exactly one place — its external canonical path — and is counted once under that name. An old
 * engine path and an external file are never merged on a hash, a filename or a record count; where
 * both copies existed this would list both, loudly, rather than silently choosing one.
 */
const externalSources = declaredObservationSources();

/* The merge rule lives in src/, beside the enumerator, so it is driven by tests rather than sitting
 * unguarded in a runner. See mergeDeclaredSources. */
const allLocal = walk(join(REPO, "runs")).sort()
  .map((p) => ({ file: relative(REPO, p).split("\\").join("/"), records: createJsonlStore(p).readAll() }));
const { kept: localFiles, dropped } = mergeDeclaredSources({ local: allLocal, external: externalSources });
const externalFiles = externalSources.map((s) => ({ file: s.canonical, records: createJsonlStore(s.path).readAll() }));
const files = [...localFiles, ...externalFiles].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

const fresh = buildRulingSheet({ files, register: CONSEQUENCE_REGISTER, unreachable: UNREACHABLE_RECOMMENDATIONS, scale: SEVERITY_SCALE, splits: CLASS_SPLITS, superseded: SUPERSEDED_ENTRIES, coverage: COVERAGE_REGISTER, decisions: DECISION_REGISTER, auditTrail: AUDIT_TRAIL, unmeasuredCodes: UNMEASURED_REASON_CODES, generatedAt: new Date().toISOString() });
console.log("ROW 60 — OWNER RULING SHEET\n");
console.log(`files read: ${fresh.sources.length} — ${localFiles.length} under runs/ plus ${externalFiles.length} declared external observation source(s)${dropped.length ? `; ${dropped.length} local copy(ies) superseded by a declared mapping: ${dropped.join(", ")}` : ""}`);
for (const s of fresh.sources) console.log(`  ${s.file.padEnd(62)} records ${String(s.records).padStart(5)} · issues ${String(s.issueRecords).padStart(5)} · state changes ${String(s.stateChanges).padStart(4)} · recommendations ${s.recommendations}`);
console.log("");

if (confirmMode) {
  const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:row60-ruling-sheet:${RUN_INSTANT}`;
  // The register must already agree with the store: a sheet is never written over a disagreement.
  const pre = reconcileSheet({ sheet: fresh, fresh, register: CONSEQUENCE_REGISTER, unreachable: UNREACHABLE_RECOMMENDATIONS, scale: SEVERITY_SCALE, superseded: SUPERSEDED_ENTRIES, coverage: COVERAGE_REGISTER, decisions: DECISION_REGISTER, auditTrail: AUDIT_TRAIL });
  if (!pre.ok) {
    console.error("🔴 REFUSED — the register and the store disagree, so no sheet is written:");
    for (const e of pre.errors) console.error(`   [${e.limb}] ${e.class ?? ""} ${e.why}`);
    process.exit(1);
  }
  /* Two targets, two governed occurrences. The refusal is audited rather than silently skipped, which is what the
   * bare `if (permission.mayWrite)` did before. */
  let sheetFailed = false;
  let sheetRefused = false;
  for (const [target, body, what] of [
    [JSON_OUT, `${JSON.stringify(fresh, null, 2)}\n`, "WRITE_RULING_SHEET_JSON"],
    [MD_OUT, renderRulingSheet(fresh), "WRITE_RULING_SHEET_MARKDOWN"],
  ]) {
    const governed = executeGovernedWrite(governedFileWrite({ scopeType: SHEET_SCOPE.scopeType,
      repo: REPO, permission, target, targetClass: "GENERATED_CONFIG", bytes: body,
      action: what, occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
    }));
    if (governed.outcome === "REFUSED") sheetRefused = true;
    else if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
      console.error(`🔴 ${governed.outcome} — ${relative(REPO, target)} was not written; the governed attempt is on the audit trail`);
      sheetFailed = true;
    }
  }
  if (!sheetRefused && !sheetFailed) console.log(`wrote ${relative(REPO, JSON_OUT)} and ${relative(REPO, MD_OUT)}`);
  process.exit(sheetFailed ? 1 : 0);
}

if (!existsSync(JSON_OUT)) {
  console.error("🔴 REFUSED — no committed sheet to reconcile. Generate it with --confirm.");
  process.exit(1);
}
const committed = JSON.parse(readFileSync(JSON_OUT, "utf8"));
const r = reconcileSheet({ sheet: committed, fresh, register: CONSEQUENCE_REGISTER, unreachable: UNREACHABLE_RECOMMENDATIONS, scale: SEVERITY_SCALE, superseded: SUPERSEDED_ENTRIES, coverage: COVERAGE_REGISTER, decisions: DECISION_REGISTER, auditTrail: AUDIT_TRAIL });
if (!r.ok) {
  console.error("🔴 REFUSED — the sheet, the register and the store do not agree. The sheet is NOT printed:");
  for (const e of r.errors) console.error(`   [${e.limb}] ${e.class ?? ""} — ${e.why}`);
  process.exit(1);
}
console.log("✅ the committed sheet, the register and the store agree\n");
process.stdout.write(renderRulingSheet(committed));
process.exit(0);
