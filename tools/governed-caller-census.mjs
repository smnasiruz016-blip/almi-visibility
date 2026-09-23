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

/* ── 🔴 THE CHECKED AUDIT-STORE EXEMPTION ──────────────────────────────────
 *
 * One entry point cannot be routed through the boundary: the one whose mutation IS the audit store. Routing it
 * would make the audit system recursively audit its own persistence, and it would hit the boundary's own
 * AUDIT_STORE_TARGET_FORBIDDEN fence.
 *
 * 🔴 THIS IS A DERIVED CLASS, NOT A DECLARED ONE. There is no list to add a file to and no flag a caller can set
 * on itself — the owner ruling's exemption is BY NAME, and "infrastructure" is not a word any future write may
 * claim for itself. A caller earns this class only by satisfying BOTH conditions, read from its own source:
 *
 *   A · every mutation it makes targets the declared audit-store implementation, and nothing else;
 *   B · it emits its WRITE_GATE_DECISION through the live recorder BEFORE that mutation.
 *
 * It fails closed on every other shape: one non-audit target, a missing or later write-gate event, no resolvable
 * target, or an ordinary governed writer that merely looks similar. */
export const AUDIT_STORE_REACHING = /recordCandidates\(|auditAuthorityMigration\(/;
export const AUDIT_STORE_CONSTRUCTOR = /productionAuditStore\(/;
export const LIVE_WRITE_GATE_EVENT = /writeGateEvent\(/;

/** Both conditions, each reported separately so a failure says WHICH one was missing. */
export function auditStoreInternalWrite(text, sites) {
  const lines = text.split("\n");
  const targetsOnlyAuditStore = sites.length > 0 && sites.every((s) => AUDIT_STORE_REACHING.test(s.text));
  const constructsAuditStore = AUDIT_STORE_CONSTRUCTOR.test(text);
  const conditionA = targetsOnlyAuditStore && constructsAuditStore;

  const gateLine = lines.findIndex((l) => isCode(l) && LIVE_WRITE_GATE_EVENT.test(l)) + 1;
  const firstMutation = sites.length ? Math.min(...sites.map((s) => s.line)) : 0;
  const conditionB = gateLine > 0 && firstMutation > 0 && gateLine < firstMutation;

  return {
    conditionA, conditionB, exempt: conditionA && conditionB,
    targetsOnlyAuditStore, constructsAuditStore, gateLine, firstMutation,
  };
}
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

/**
 * @param {{sources?: {file: string, text: string}[]}} [opts] a FIXED INPUT, used by the planted-bypass control.
 *   Injecting the population in memory lets that control plant a synthetic bypass and remove it without writing a
 *   byte into bin/ and without touching the git index — which is the difference between a control and an incident.
 */
export function census({ sources = null } = {}) {
  const bins = sources
    ? sources.map((s) => s.file)
    : git("ls-files", "bin").trim().split("\n").filter((p) => p.endsWith(".mjs"));
  const tests = git("ls-files", "test").trim().split("\n").filter((p) => p.endsWith(".mjs"));
  const testText = new Map(tests.map((f) => [f, readFileSync(join(REPO, f), "utf8")]));
  return bins.map((file) => {
    const text = sources ? sources.find((s) => s.file === file).text : readFileSync(join(REPO, file), "utf8");
    const sites = writeSitesOf(text);
    const asksWriteLaw = /writePermission\(/.test(text);
    const usesBoundary = BOUNDARY_CALL.test(text);
    const cls = sites.length > 0 || usesBoundary ? "GOVERNED_STATE_CHANGE" : asksWriteLaw ? "UNKNOWN" : "READ_ONLY_DIAGNOSTIC";
    /* Derived, never declared — see AUDIT_STORE_REACHING above. A routed caller is never also exempt. */
    const internal = usesBoundary ? { exempt: false, conditionA: false, conditionB: false } : auditStoreInternalWrite(text, sites);
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
      auditStoreExempt: internal.exempt,
      exemption: internal,
      sites: sites.length,
      coverage,
      cls,
    };
  });
}

/**
 * 🔴 THE BYPASS CENSUS: a governed site that mutates without reaching the boundary. Must be empty.
 *
 * A caller carrying the CHECKED audit-store exemption is not a bypass — but it is not hidden either. It stays in
 * the GOVERNED_STATE_CHANGE denominator and is named by its class, so routed + exempt + bypass always sums to the
 * governed population. Removing it from the denominator would be the one move that makes a zero meaningless.
 */
export const bypasses = (rows) => rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE" && !r.routed && !r.auditStoreExempt);
export const auditStoreExempt = (rows) => rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE" && r.auditStoreExempt);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const rows = census();
  const by = rows.reduce((m, r) => ((m[r.cls] = (m[r.cls] ?? 0) + 1), m), {});
  console.log(`GOVERNED CALLER CENSUS — ${rows.length} production entry point(s) under bin/`);
  for (const c of CLASSES) console.log(`  ${c.padEnd(24)} ${by[c] ?? 0}`);
  const accounted = CLASSES.reduce((n, c) => n + (by[c] ?? 0), 0);
  console.log(`  ${"REMAINDER".padEnd(24)} ${rows.length - accounted}`);
  const governed = rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE");
  const missed = bypasses(rows);
  const exempt = auditStoreExempt(rows);
  console.log(`\n  GOVERNED_STATE_CHANGE ${governed.length} · routed ${governed.filter((r) => r.routed).length} · audit-store exempt ${exempt.length} · BYPASSING ${missed.length}`);
  console.log(`  routed + exempt + bypassing = ${governed.filter((r) => r.routed).length + exempt.length + missed.length} (must equal ${governed.length})`);
  for (const r of exempt) console.log(`  EXEMPT ${r.file} — audit-store internal write (A: only audit-store targets · B: live write-gate event at line ${r.exemption.gateLine}, before the mutation at ${r.exemption.firstMutation})`);
  console.log(`  entry points with NO named test coverage: ${rows.filter((r) => r.coverage.length === 0).length}`);
  if (process.argv.includes("--table")) {
    console.log("\n  path · shape · target · sites · routed · tests");
    for (const r of rows) console.log(`  ${r.file.padEnd(36)} ${r.cls.padEnd(22)} ${r.shape.padEnd(24)} ${r.targetClass.padEnd(22)} ${String(r.sites).padStart(2)} ${r.routed ? "ROUTED" : "-     "} ${r.coverage.length}`);
  }
  for (const r of rows.filter((x) => x.cls === "UNKNOWN")) console.log(`  🔴 UNKNOWN ${r.file} — blocks implementation until resolved by measurement`);
  for (const r of missed) console.log(`  🔴 BYPASS ${r.file} — a governed write outside the shared boundary`);
  if (process.argv.includes("--check") && (missed.length || (by.UNKNOWN ?? 0) || rows.length !== accounted)) process.exit(1);
}
