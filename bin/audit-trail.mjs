#!/usr/bin/env node
/**
 * 🔴 F08 · THE AUDIT TRAIL'S PRODUCTION ENTRY POINT (22 September 2026).
 *
 *   node bin/audit-trail.mjs census                      the inclusion rule, every family's counts, the exclusions
 *   node bin/audit-trail.mjs record [--confirm]          append every lawful candidate; dry-run is the default
 *   node bin/audit-trail.mjs verify [--check]            verify the chain and print the detection boundary
 *   node bin/audit-trail.mjs read --all | --event=<id> | --tenant=<id> | --correlation=<id> | --parents=<id>
 *
 * `record` writes; write-law LOCAL applies, so only --confirm grants it (src/write-law.mjs). Everything else is
 * read-only. Nothing here prints protected payload: ids, codes, hashes, roles and counts only.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AUDIT_STORE } from "../config/audit-store.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { census as authorityCensus } from "../src/authority/corpus.mjs";
import { isSealed } from "../src/governance/sealed-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL, PRODUCTION } from "../src/write-law.mjs";
import {
  ADDED_FAMILIES, COMMANDED_FAMILIES, EXCLUSIONS, FAMILIES, INCLUSION_RULE, accountFamily, familyACandidates,
  familyBCandidates, familyCCandidates, familyTCandidates, refForEntry,
} from "../src/audit-trail/population.mjs";
import { recordCandidates, refusalEvent, writeGateEvent, MIGRATION_PROVES } from "../src/audit-trail/recorder.mjs";
import { productionAuditStore, productionAuditReader, softwareVersionOf } from "../src/audit-trail/wiring.mjs";
import { DETECTION_BOUNDARY } from "../src/audit-trail/store.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const sub = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "census";
const NOW_DAY = arg("now") ?? CORPUS_PROVENANCE.now;
const RUN_INSTANT = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const MIGRATION_CORRELATION = `migration:${CORPUS_PROVENANCE.governanceCommit.slice(0, 12)}`;
const RUN_CORRELATION = `run:${RUN_INSTANT}`;

const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 28 });
const tracked = () => git("ls-files").trim().split("\n").filter(Boolean);
const binFiles = () => tracked().filter((p) => /^bin\/.*\.mjs$/.test(p));
const textOf = (p) => readFileSync(join(REPO, p), "utf8");

/* ── THE DECLARED AUTHORITY OF EACH FAMILY'S SOURCE ──────────────────────────────────────────────────────────────
 * Named here, from the registry's and the board's own declarations — never guessed, never inferred from prose. */
const ROLE_SCOPE_AUTHORITY = { propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: ["ALMIVISIBILITY"] };
const RETIRED_AUTHORITY = { propositionId: "OWNER_RULING_RETIRED_CONTAMINATED_HELDOUT", scope: ["ALMIVISIBILITY"] };
const roleAuthority = (entry) => (entry.role === "RETIRED_CONTAMINATED" ? RETIRED_AUTHORITY : ROLE_SCOPE_AUTHORITY);
/** A row with no frozen acceptance is governed by the command record that recorded its blocker. */
const BLOCKER_AUTHORITY = { F40: { propositionId: "CC_COMMAND_F05_CURRENT_AUTHORITY_REGISTER_CHAIN", scope: ["ALMIVISIBILITY", "F05"] } };
/** This feature's own governing authority, for the events it records about itself. */
const F08_AUTHORITY = { propositionId: "OWNER_RULING_F08_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F08"] };
/** The owner's architecture ruling that declares what a tenant is and how a resource attaches to one. */
const TENANT_ATTACHMENT_AUTHORITY = { propositionId: "OWNER_RULING_TENANT_RESOURCE_ATTACHMENTS", scope: ["ALMIVISIBILITY"] };

/**
 * 🔴 WHEN AN EVIDENCE ROLE WAS REGISTERED — read from COMMITTED git history, never from the file's prose.
 * The first commit whose version of the registry contains the entry's id is when that registration was recorded.
 */
const REGISTRY_PATH = "config/evidence-roles.mjs";
const registrationDays = new Map();
function registeredAtOf(entryId) {
  if (registrationDays.has(entryId)) return registrationDays.get(entryId);
  let day = null;
  try {
    const out = git("log", "--reverse", "--format=%H %aI", "--", REGISTRY_PATH).trim().split("\n").filter(Boolean);
    for (const line of out) {
      const [sha, iso] = line.split(" ");
      let body = "";
      try { body = git("show", `${sha}:${REGISTRY_PATH}`); } catch { continue; }
      if (body.includes(entryId)) { day = iso.slice(0, 10); break; }
    }
  } catch { day = null; }
  registrationDays.set(entryId, day);
  return day;
}

function migratedCandidates(softwareVersion, migratedAt) {
  const dispositions = authorityCensus(AUTHORITY_CORPUS, NOW_DAY).dispositions;
  return [
    ...familyACandidates({ corpus: AUTHORITY_CORPUS, dispositions, provenance: CORPUS_PROVENANCE, softwareVersion, correlationId: MIGRATION_CORRELATION, migratedAt }),
    ...familyBCandidates({ declared: DECLARED, acceptances: ACCEPTANCES, softwareVersion, correlationId: MIGRATION_CORRELATION, migratedAt, blockerAuthority: BLOCKER_AUTHORITY }),
    ...familyCCandidates({ registry: EVIDENCE_ROLE_REGISTRY, softwareVersion, correlationId: MIGRATION_CORRELATION, migratedAt, roleAuthority, registeredAtOf }),
  ];
}

/** Families D, E and T, recorded NATIVELY: decisions this run actually made, not reconstructed from anything. */
function nativeCandidates(softwareVersion, f08Hash) {
  const localPermission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
  const productionPermission = writePermission({ target: PRODUCTION, argv: process.argv, env: process.env });
  const sealedEntry = EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "SEALED");
  const refusedUnread = sealedEntry ? tracked().filter((p) => isSealed(EVIDENCE_ROLE_REGISTRY, "engine", p)).length : 0;
  const common = { softwareVersion, correlationId: RUN_CORRELATION, occurredAt: RUN_INSTANT, authorityRef: F08_AUTHORITY, authorityHash: f08Hash };
  const out = [
    { family: "D", sourceId: "write-gate:local:audit-trail-store", draft: writeGateEvent({ ...common, permission: localPermission, target: "local", action: "WRITE_AUDIT_TRAIL_STORE", actor: "bin/audit-trail.mjs" }) },
    { family: "D", sourceId: "write-gate:production:audit-trail-store", draft: writeGateEvent({ ...common, permission: productionPermission, target: "production", action: "WRITE_BEYOND_THIS_MACHINE", actor: "bin/audit-trail.mjs" }) },
  ];
  if (sealedEntry) {
    out.push({
      family: "E",
      sourceId: `refusal:sealed:${sealedEntry.id}`,
      draft: refusalEvent({
        ...common,
        reasonCode: "SEALED_PATH_REFUSED",
        action: "REFUSE_SEALED_MATERIAL_TO_ORDINARY_READERS",
        actor: "src/governance/sealed-paths.mjs",
        evidenceRefs: [refForEntry(sealedEntry)],
        metadata: { pathsRefusedUnread: String(refusedUnread), note: "counted by PATH; not one was opened" },
      }),
    });
  }

  /* FAMILY T — the production scope resolver, asked about every declared attachment, answering now. */
  const resolveScope = createTenantResolver({});
  const declarations = resolveScope.declarations;
  if (declarations?.readable) {
    out.push(...familyTCandidates({
      attachments: declarations.attachments,
      resolveScope,
      refHash: (s) => createHash("sha256").update(String(s), "utf8").digest("hex"),
      softwareVersion,
      correlationId: RUN_CORRELATION,
      occurredAt: RUN_INSTANT,
      authorityRef: TENANT_ATTACHMENT_AUTHORITY,
    }));
  } else {
    // 🔴 "I could not look" is not "there is nothing there" — it is recorded as a refusal, never as an empty family.
    out.push({
      family: "T",
      sourceId: "scope:declaration-source",
      draft: refusalEvent({
        ...common,
        reasonCode: declarations?.reason ?? "DECLARATION_SOURCE_ABSENT",
        action: "READ_TENANT_DECLARATION_SOURCE",
        actor: "src/tenancy/resolver.mjs",
        metadata: { family: "T", note: "the declaration source could not be read; no scope was assumed" },
      }),
    });
  }
  return out;
}

// ── SUBCOMMANDS ────────────────────────────────────────────────────────────────────────────────────────────────────

function printCensus() {
  const softwareVersion = softwareVersionOf(REPO);
  const migratedAt = RUN_INSTANT;
  console.log("F08 · REAL POPULATION CENSUS — the inclusion rule is declared BEFORE anything is selected\n");
  for (const [k, v] of Object.entries(INCLUSION_RULE)) console.log(`  ${k}  ${v}`);
  console.log("\n  EXCLUDED, counted and named, never counted as real events:");
  for (const [k, v] of Object.entries(EXCLUSIONS)) console.log(`  ${k}  ${v}`);
  console.log("\n  DE-DUPLICATION: a write-gate decision is recorded ONCE, under family D, whatever its outcome.");

  const migrated = migratedCandidates(softwareVersion, migratedAt);
  const native = nativeCandidates(softwareVersion, "0".repeat(64));
  const all = [...migrated, ...native];
  console.log("\nFAMILY COUNTS\n");
  const line = (f) => {
    const a = accountFamily({ family: f, candidates: all.filter((c) => c.family === f), audited: 0 });
    console.log(`  ${f} · ${a.description}`);
    console.log(`      total ${a.total} · malformed/not-migratable ${a.malformed} · duplicate ${a.duplicate} · tenant-scoped ${a.tenantScoped} · global-product-scoped ${a.globalProductScoped} · unresolved scope ${a.unresolvedScope} · remainder ${a.remainder}`);
    return a.total;
  };
  let commanded = 0;
  for (const f of COMMANDED_FAMILIES) commanded += line(f);
  console.log(`\n  THE COMMAND'S FIVE FAMILIES · real candidate events ${commanded}`);
  let added = 0;
  for (const f of ADDED_FAMILIES) added += line(f);
  console.log(`\n  ADDED POPULATION · ${added} — every one of the five is GLOBAL_PRODUCT scoped, and a tenant limb proved`);
  console.log(`      only at global scope proves nothing about the tenant half. Declared as an addition, not a substitution.`);
  console.log(`\n  ALL · real candidate events ${commanded + added}`);

  const bins = binFiles();
  const writers = bins.filter((p) => textOf(p).includes("writePermission"));
  const diagnostics = bins.filter((p) => !textOf(p).includes("writePermission"));
  console.log(`\nPRODUCTION CALLERS — ${bins.length} tracked entry point(s) under bin/`);
  console.log(`  write-gate decision sites (family D's reachable population): ${writers.length}`);
  console.log(`  AUDITED by this feature: 2 — bin/audit-trail.mjs, bin/authority-migrate.mjs`);
  console.log(`  UNAUDITED write-gate sites: ${writers.length - 2} — PARKED; §9 forbids instrumenting every module mechanically`);
  console.log(`\n  X7 · READ-ONLY DIAGNOSTIC ENTRY POINTS, EXCLUDED BY THE RULE (${diagnostics.length}) — counted, named, behaviour unchanged:`);
  for (const d of diagnostics) console.log(`      ${d}`);

  /* 🔴 X6 IS APPLIED HERE TOO. A path under a declared sealed prefix is not listed, not counted per file and not
   * opened — printing "N files" under a sealed prefix would be listing its contents by another name. */
  const allRun = tracked().filter((p) => p.startsWith("runs/"));
  const sealedRun = allRun.filter((p) => isSealed(EVIDENCE_ROLE_REGISTRY, "engine", p));
  const runFiles = allRun.filter((p) => !isSealed(EVIDENCE_ROLE_REGISTRY, "engine", p));
  const groups = [...new Set(runFiles.map((p) => p.split("/").slice(0, 2).join("/")))].sort();
  console.log(`\nEXISTING COMMITTED AUDIT-LIKE RECORDS — ${runFiles.length} tracked file(s) under runs/, in ${groups.length} group(s)`);
  console.log(`      (${sealedRun.length} further path(s) under a declared sealed prefix are excluded unread and not listed — X6)`);
  for (const g of groups) {
    // The caller must name the GROUP PATH, not a word that happens to appear in it.
    const callers = bins.filter((p) => textOf(p).includes(g));
    console.log(`      ${g.padEnd(28)} ${String(runFiles.filter((p) => p.startsWith(g + "/") || p === g).length).padStart(4)} file(s) · production callers ${callers.length}${callers.length ? ` (${callers.join(", ")})` : ""}`);
  }
  console.log(`\n      config/audit-trail.mjs is Row 60's register of WITHDRAWN AUDIT ISSUE CLASSES — a different thing, not this store.`);
  console.log(`\nSTORE DECLARED: ${AUDIT_STORE.repository} · ${AUDIT_STORE.eventsPath} · ${AUDIT_STORE.format}`);
  console.log(`  retention: ${AUDIT_STORE.retention}`);
  console.log(`  ${MIGRATION_PROVES}`);
}

function doRecord() {
  const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
  confineToRepo(join(REPO, AUDIT_STORE.eventsPath), { label: "the audit trail store" });
  confineToRepo(join(REPO, AUDIT_STORE.headPath), { label: "the audit trail head record" });
  const softwareVersion = softwareVersionOf(REPO);
  const migratedAt = RUN_INSTANT;

  // The authority for this feature's own native events — resolved through F05's production path, or nothing is recorded.
  const f08 = AUTHORITY_CORPUS.find((r) => r.propositionId === F08_AUTHORITY.propositionId);
  if (!f08) { console.log("NO CURRENT AUTHORITY for F08 — nothing is recorded"); process.exit(1); }

  const candidates = [...migratedCandidates(softwareVersion, migratedAt), ...nativeCandidates(softwareVersion, f08.contentHash)];
  // 🔴 THE WRITE SITS INSIDE THE GATE, not after an early return: a guard the census can READ is a guard.
  if (permission.mayWrite) {
    const store = productionAuditStore({ repo: REPO });
    const result = recordCandidates({ store, candidates, corpus: AUTHORITY_CORPUS });
    console.log("\nREAL MIGRATION ARITHMETIC");
    console.log(`  real candidate events ${result.counts.realCandidateEvents} = migrated ${result.counts.migrated} + already audited ${result.counts.alreadyAudited} + not migratable ${result.counts.notMigratable} + invalid ${result.counts.invalid} + excluded ${result.counts.excluded}`);
    console.log(`  remainder ${result.remainder}`);
    for (const n of result.notMigratable) console.log(`  NOT_MIGRATABLE  ${n.family} ${n.sourceId} — ${n.notMigratable}`);
    for (const i of result.invalid) console.log(`  INVALID         ${i.family} ${i.sourceId} — ${i.codes.join(", ")}`);
    const size = store.sizeReport();
    console.log(`  store: ${size.events} event(s) · ${size.bytes} bytes · ${size.bytesPerEvent} bytes/event · ceiling ${size.ceilingBytes} · within ceiling ${size.withinCeiling}`);
    console.log(`  store sha256 ${store.storeHash()}`);
    console.log(`  ${MIGRATION_PROVES}`);
    if (result.remainder !== 0) process.exit(1);
  } else {
    console.log(`would consider ${candidates.length} real candidate event(s); nothing is appended without --confirm`);
  }
}

function doVerify() {
  const store = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] });
  const v = store.verify();
  const size = store.sizeReport();
  console.log(`AUDIT TRAIL · ${v.events} event(s) · ${size.bytes} bytes · chain ${v.ok ? "VERIFIES" : "DOES NOT VERIFY"}`);
  console.log(`  store sha256 ${store.storeHash()}`);
  console.log("  DETECTION BOUNDARY, as declared:");
  for (const [k, val] of Object.entries(DETECTION_BOUNDARY)) console.log(`    ${k.padEnd(20)} ${val}`);
  for (const f of v.findings) console.log(`  🔴 ${f.code}${f.at ? ` at line ${f.at}` : ""}${f.eventId ? ` (${f.eventId})` : ""}`);
  if (process.argv.includes("--check") && !v.ok) process.exit(1);
}

function doRead() {
  const store = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] });
  const reader = productionAuditReader({ repo: REPO, authorityRecords: AUTHORITY_CORPUS, now: NOW_DAY, store });
  const id = arg("event"), tenant = arg("tenant"), corr = arg("correlation"), parents = arg("parents");
  const res = id ? reader.byId(id) : tenant ? reader.byTenant(tenant) : corr ? reader.byCorrelation(corr) : parents ? reader.parentChain(parents) : reader.all();
  console.log(`STATUS ${res.status}${res.code ? ` · ${res.code}` : ""}${res.why ? ` — ${res.why}` : ""}`);
  if (res.status !== "OK") { for (const f of res.findings ?? []) console.log(`  🔴 ${f.code}${f.at ? ` at ${f.at}` : ""}`); process.exit(1); }
  const list = res.events ?? res.chain ?? (res.event ? [res.event] : []);
  console.log(`  ${list.length} event(s)`);
  for (const e of list) {
    console.log(`  ${e.eventId} ${e.migrationStatus.padEnd(8)} ${e.eventType.padEnd(22)} ${e.action.padEnd(38)} ${e.outcome.padEnd(8)} ${e.scopeType.padEnd(14)} ${e.occurredAt}`);
    console.log(`      authorityAtEvent ${String(e.authority.authorityAtEvent).slice(0, 12)}… · authorityCurrentNow ${String(e.authority.authorityCurrentNow).slice(0, 12)}… · supersededSinceEvent ${e.authority.supersededSinceEvent} (${e.authority.currentOutcome})`);
    if (e.timeAnomaly) console.log(`      ⚠️ timeAnomaly ${e.timeAnomaly}`);
    if (e.migrationStatus === "MIGRATED") console.log(`      migrationSource ${e.migrationSource} · migratedAt ${e.migratedAt} · ${e.migrationNote}`);
    for (const ev of e.evidence) console.log(`      evidence ${ev.status === "OK" ? `${ev.role} ${ev.root}:${ev.ref}${ev.expanded === false ? " (not expanded)" : ""}` : `INVALID ${ev.code}`}`);
  }
}

const RUNNERS = { census: printCensus, record: doRecord, verify: doVerify, read: doRead };
if (!RUNNERS[sub]) { console.error(`unknown subcommand ${JSON.stringify(sub)} — census | record | verify | read`); process.exit(2); }
RUNNERS[sub]();
