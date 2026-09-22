#!/usr/bin/env node
/**
 * 🔴 EVERY PRODUCTION ENTRY POINT, CLASSIFIED — AND EVERY GOVERNED WRITE ACCOUNTED FOR (22 September 2026).
 *
 *   node tools/governed-caller-census.mjs [--check] [--table]
 *
 * READ-ONLY. It writes nothing and needs no write gate. It answers two questions with one enumeration:
 *   1. what IS every entry point under bin/, and
 *   2. does any GOVERNED_STATE_CHANGE site still perform its write outside the shared boundary?
 *
 * ── THE CLASSIFICATION RULE, DECLARED BEFORE ANY SITE IS READ ──────────────
 *
 *   GOVERNED_STATE_CHANGE  the entry point's OWN SOURCE holds a write site — a filesystem primitive, a store
 *                          append, or the construction of a durable writer under its own gate — so when permission
 *                          is granted it mutates durable repository state.
 *   READ_ONLY_DIAGNOSTIC   its own source holds no write site. It reports, and §9 requires its behaviour to be
 *                          unchanged: it emits nothing and is not routed.
 *   TEST_ONLY              not a production entry point. Nothing under bin/ qualifies by construction; the bucket
 *                          exists so that "none" is a measured answer rather than an omission.
 *   DEAD_OR_ORPHANED       write-capable and reachable from no production entry point.
 *   UNKNOWN                cannot be settled by measurement. 🔴 EVERY UNKNOWN BLOCKS IMPLEMENTATION.
 *
 * 🔴 THE HELPER VOCABULARY IS RE-DERIVED FROM THE TREE, NOT REMEMBERED. An earlier pass listed `appendAll(` but
 * not `appendAllWithoutDedupe(` and left two entry points UNKNOWN; a third was missed because it CONSTRUCTS a
 * durable writer (`createCostLedger(`) rather than calling append itself. The list below was taken with
 *   grep -ohE "\.(append[A-Za-z]*)\(" bin/*.mjs | sort -u
 * and re-checked against the write primitives actually present.
 *
 * 🔴 NO ALLOWLIST TURNS AN UNEXPLAINED WRITER INTO "NOT GOVERNED." There is no exemption list in this file.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 28 });

export const FS_WRITE = /\b(writeFileSync|appendFileSync|mkdirSync|rmSync|renameSync|unlinkSync|createWriteStream|cpSync|copyFileSync)\(/;
/* 🔴 THE WRITING EXPORTS ARE DERIVED FROM src/, NOT LISTED FROM MEMORY. Every name below is an exported function
 * whose own body performs a filesystem write or a store append, found by scanning src/ rather than recalled:
 *   auditAuthorityMigration · createAuditStore · createDryRunStore · createJsonlStore · createPaidProviderGate ·
 *   persistCrawlObservations · recordCandidates · runIngest · runRobotsAndDnsAudit
 * plus createCostLedger, which CONSTRUCTS a durable writer under its caller's gate. Two of these were missed by
 * earlier passes — `appendAllWithoutDedupe` and `recordCandidates` — and each miss produced a false UNKNOWN. */
export const STORE_WRITE = /\.append\(|\.appendIfNew\(|\.appendAllWithoutDedupe\(|\.appendWithoutDedupe\(|persistCrawlObservations\(|createCostLedger\(|recordCandidates\(|runIngest\(|runRobotsAndDnsAudit\(|auditAuthorityMigration\(/;
export const BOUNDARY_CALL = /executeGovernedWrite\(/;
export const CLASSES = Object.freeze(["GOVERNED_STATE_CHANGE", "READ_ONLY_DIAGNOSTIC", "TEST_ONLY", "DEAD_OR_ORPHANED", "UNKNOWN"]);

const isCode = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/^\s*import\b/.test(l);
export const writeSitesOf = (text) => text.split("\n").map((l, i) => ({ line: i + 1, text: l })).filter((r) => isCode(r.text) && (FS_WRITE.test(r.text) || STORE_WRITE.test(r.text)));

/** What a caller writes to, from its own source. A class, never a path that could carry a client name. */
function targetClassOf(text) {
  if (/config\//.test(text)) return "GENERATED_CONFIG";
  if (/audit-trail\//.test(text)) return "AUDIT_TRAIL";
  if (/runs\//.test(text)) return "RUN_EVIDENCE";
  if (/arg\("out"\)|--out|outDir/.test(text)) return "OPERATOR_CHOSEN_OUTPUT";
  return "REPOSITORY_FILE";
}

/** Unconditional when the permission is taken once at module top level; conditional when it sits inside a branch. */
function shapeOf(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /(const|let)\s+permission\s*=/.test(l) && isCode(l));
  if (at < 0) return BOUNDARY_CALL.test(text) ? "BOUNDARY_ONLY" : "NO_PERMISSION_TAKEN";
  const indent = lines[at].match(/^\s*/)[0].length;
  const announces = lines.filter((l) => isCode(l) && /announceWritePermission\(/.test(l)).length;
  if (indent > 0) return "CONDITIONAL_PERMISSION";
  if (announces > 1) return "MULTI_ANNOUNCE";
  return "UNCONDITIONAL_TOP_LEVEL";
}

export function census() {
  const bins = git("ls-files", "bin").trim().split("\n").filter((p) => p.endsWith(".mjs"));
  const tests = git("ls-files", "test").trim().split("\n").filter((p) => p.endsWith(".mjs"));
  const testText = new Map(tests.map((f) => [f, readFileSync(join(REPO, f), "utf8")]));
  return bins.map((file) => {
    const text = readFileSync(join(REPO, file), "utf8");
    const sites = writeSitesOf(text);
    const asksWriteLaw = /writePermission\(/.test(text);
    const usesBoundary = BOUNDARY_CALL.test(text);
    const cls = sites.length > 0 || usesBoundary ? "GOVERNED_STATE_CHANGE" : asksWriteLaw ? "UNKNOWN" : "READ_ONLY_DIAGNOSTIC";
    const coverage = tests.filter((t) => testText.get(t).includes(file));
    return {
      file,
      command: `node ${file}`,
      actionType: cls === "GOVERNED_STATE_CHANGE" ? "AUTHORISED_WRITE" : "REPORT",
      permissionGuard: asksWriteLaw ? "write-law LOCAL (permission.mayWrite)" : "none — it writes nothing",
      targetClass: cls === "GOVERNED_STATE_CHANGE" ? targetClassOf(text) : "NONE",
      scope: "GLOBAL_PRODUCT",
      shape: shapeOf(text),
      auditRequired: cls === "GOVERNED_STATE_CHANGE",
      routed: usesBoundary,
      sites: sites.length,
      coverage,
      cls,
    };
  });
}

/** 🔴 THE BYPASS CENSUS: a governed site that writes without reaching the boundary. Must be empty. */
export const bypasses = (rows) => rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE" && !r.routed);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const rows = census();
  const by = rows.reduce((m, r) => ((m[r.cls] = (m[r.cls] ?? 0) + 1), m), {});
  console.log(`GOVERNED CALLER CENSUS — ${rows.length} production entry point(s) under bin/`);
  for (const c of CLASSES) console.log(`  ${c.padEnd(24)} ${by[c] ?? 0}`);
  const accounted = CLASSES.reduce((n, c) => n + (by[c] ?? 0), 0);
  console.log(`  ${"REMAINDER".padEnd(24)} ${rows.length - accounted}`);
  const governed = rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE");
  const missed = bypasses(rows);
  console.log(`\n  GOVERNED_STATE_CHANGE ${governed.length} · routed through the boundary ${governed.length - missed.length} · BYPASSING ${missed.length}`);
  console.log(`  entry points with NO named test coverage: ${rows.filter((r) => r.coverage.length === 0).length}`);
  if (process.argv.includes("--table")) {
    console.log("\n  path · shape · target · sites · routed · tests");
    for (const r of rows) console.log(`  ${r.file.padEnd(36)} ${r.cls.padEnd(22)} ${r.shape.padEnd(24)} ${r.targetClass.padEnd(22)} ${String(r.sites).padStart(2)} ${r.routed ? "ROUTED" : "-     "} ${r.coverage.length}`);
  }
  for (const r of rows.filter((x) => x.cls === "UNKNOWN")) console.log(`  🔴 UNKNOWN ${r.file} — blocks implementation until resolved by measurement`);
  for (const r of missed) console.log(`  🔴 BYPASS ${r.file} — a governed write outside the shared boundary`);
  if (process.argv.includes("--check") && (missed.length || (by.UNKNOWN ?? 0) || rows.length !== accounted)) process.exit(1);
}
