#!/usr/bin/env node
/**
 * 🔴 F01 · PROJECT DECLARATION INTAKE — THE PRODUCTION ENTRY POINT (24 September 2026).
 *
 *   node bin/project-intake.mjs --validate --file <path>                       check only; reads no store, writes nothing
 *   node bin/project-intake.mjs --submit --file <path> [--confirm]             decide; write only with --confirm
 *   node bin/project-intake.mjs --show <declarationId> --tenant <tenantId>     one declaration, inside one tenant
 *   node bin/project-intake.mjs --list --tenant <tenantId>                     every declaration of one tenant
 *   node bin/project-intake.mjs --current <projectId> --tenant <tenantId>      the current accepted declaration
 *   node bin/project-intake.mjs --inventory                                    the existing tenancy declarations, read
 *                                                                              through the contract (read-only)
 *   node bin/project-intake.mjs --mint-id declaration|project                  a fresh opaque identifier
 *   add --json for one machine-readable line instead of the human report
 *
 * 🔴 AN UNKNOWN FLAG IS REFUSED, NEVER IGNORED — a typo must not become a clean run of nothing.
 * 🔴 NOTHING OF A SUBMITTED DOCUMENT IS PRINTED except codes, JSON paths and identifiers that passed their patterns.
 *    A file that is not JSON is reported as NOT JSON — the parser's message is never shown, because it quotes text.
 * 🔴 EVERY WRITE PASSES F08's BOUNDARY (executeGovernedWrite), and every decision on a SUBMITTED declaration is an
 *    audit event. The read commands and --validate make no decision of that kind and append nothing.
 */
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedContext, governedAuditContext } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { validateDeclaration, DECLARATION_ID, PROJECT_ID } from "../src/intake/contract.mjs";
import { resolveDeclarationRoot, declarationWrite, findDeclaration, listTenant, currentDeclaration } from "../src/intake/store.mjs";
import { decideSubmission, decisionDraft, recordDeclarationDecisions, intakeAuthority, intakeCorrelationId } from "../src/intake/intake.mjs";
import { legacyTenancyCandidates } from "../src/intake/legacy.mjs";
import { TENANT_ID_PATTERN } from "../src/tenancy/resolver.mjs";
import { scopedEntryPoint, decideScopedRun, RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { diagnosticGuardSink } from "../src/governance/guard-audit.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/* ── ARGUMENTS: every flag is declared; anything else is refused before anything runs ─────────────────────── */
const MODES = ["--validate", "--submit", "--show", "--list", "--current", "--inventory", "--mint-id"];
const VALUED = new Set(["--file", "--show", "--current", "--tenant", "--mint-id"]);
const BOOLEAN = new Set(["--validate", "--submit", "--list", "--inventory", "--confirm", "--json"]);
const JSON_OUT = process.argv.slice(2).includes("--json");
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  const [flag, inline] = a.includes("=") ? [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)] : [a, undefined];
  if (VALUED.has(flag)) {
    const v = inline ?? argv[i + 1];
    if (inline === undefined) i += 1;
    if (v === undefined || v.startsWith("--")) exitWith(2, { outcome: "USAGE_REFUSED", reason: `${flag} needs a value` });
    args[flag] = v;
  } else if (BOOLEAN.has(flag) && inline === undefined) {
    args[flag] = true;
  } else {
    exitWith(2, { outcome: "USAGE_REFUSED", reason: "UNKNOWN_FLAG", position: i });
  }
}
const modes = MODES.filter((m) => args[m] !== undefined);
if (modes.length !== 1) exitWith(2, { outcome: "USAGE_REFUSED", reason: `exactly one of ${MODES.join(" ")} is required` });
const MODE = modes[0];

function exitWith(code, result, human = []) {
  if (JSON_OUT) console.log(JSON.stringify(result));
  else {
    for (const line of human) console.log(line);
    console.log(`RESULT ${JSON.stringify(result)}`);
  }
  process.exit(code);
}

const refusalLines = (refusals) => refusals.map((r) => `  🔴 ${r.code} at ${r.path}`);

/** The file, parsed — or a refusal that quotes nothing of it. */
function readDocument() {
  const file = args["--file"];
  if (!file) exitWith(2, { outcome: "USAGE_REFUSED", reason: "--file is required" });
  if (!existsSync(file)) exitWith(2, { outcome: "REFUSED", refusals: [{ code: "FILE_NOT_FOUND", path: "--file" }] });
  let text;
  try { text = readFileSync(file, "utf8"); } catch { exitWith(2, { outcome: "REFUSED", refusals: [{ code: "FILE_UNREADABLE", path: "--file" }] }); }
  try { return JSON.parse(text.replace(/^\uFEFF/, "")); } catch { exitWith(1, { outcome: "REFUSED", refusals: [{ code: "FILE_NOT_JSON", path: "--file" }] }, ["🔴 REFUSED — the file is not JSON (its text is not reproduced)"]); }
  return null;
}

/** The tenant registry in force, through the production resolver. Unreadable → null, which refuses every tenant. */
function tenancy() {
  const resolve = createTenantResolver({ env: process.env });
  const d = resolve.declarations;
  const tenants = d?.readable ? d.tenants.filter((t) => t?.status === "ACTIVE" && TENANT_ID_PATTERN.test(String(t?.tenantId))).map((t) => t.tenantId) : null;
  const attachedTo = (origin) => {
    const r = resolve({ resourceKind: "SITE_ORIGIN", resourceRef: origin });
    return r.state === "RESOLVED" ? r.tenantId : null;
  };
  /* F02: a property's attachment is decided by the ONE tenant-scope decision, never compared here. */
  const relation = (origin, tenantId) => decideForTenant(resolve, tenantId, RESOURCES.siteOrigin(origin));
  return { tenants, attachedTo, relation, declarations: d, resolve };
}

function tenantArg() {
  const t = args["--tenant"];
  if (!t) exitWith(2, { outcome: "USAGE_REFUSED", reason: "--tenant is required — nothing is read across tenants" });
  if (!TENANT_ID_PATTERN.test(t)) exitWith(2, { outcome: "REFUSED", refusals: [{ code: "TENANT_ID_INVALID", path: "--tenant" }] });
  return t;
}
const view = (h) => (h ? { state: h.state, declaration: h.record } : null);

/* ── READ-ONLY MODES — no decision, no event, no write ──────────────────────────────────────────────────── */
if (MODE === "--mint-id") {
  const kind = args["--mint-id"];
  if (!["declaration", "project"].includes(kind)) exitWith(2, { outcome: "USAGE_REFUSED", reason: "--mint-id takes declaration or project" });
  exitWith(0, { outcome: "MINTED", id: `${kind === "declaration" ? "decl" : "proj"}_${randomBytes(16).toString("hex")}` });
}
if (MODE === "--validate") {
  const doc = readDocument();
  const { tenants, attachedTo, relation } = tenancy();
  const v = validateDeclaration(doc, { tenants, attachedTo, relation });
  if (!v.ok) exitWith(1, { outcome: "REFUSED", stage: "CONTRACT", refusals: v.refusals }, ["🔴 REFUSED by the contract (nothing was written, nothing recorded):", ...refusalLines(v.refusals)]);
  exitWith(0, { outcome: "VALID", declarationId: v.normalised.declarationId, projectId: v.normalised.projectId, tenantId: v.normalised.tenantId }, ["VALID — nothing was written, nothing recorded (--validate never writes)"]);
}
if (MODE === "--inventory") {
  const inv = legacyTenancyCandidates(tenancy().declarations);
  if (!inv.readable) exitWith(1, { outcome: "INVENTORY_UNAVAILABLE", reason: inv.reason });
  const summary = {
    outcome: "INVENTORY",
    tenantRecords: inv.tenantRecords, activeTenants: inv.activeTenants, attachmentRecords: inv.attachmentRecords, attachmentsByKind: inv.attachmentsByKind,
    adapted: inv.candidates.filter((c) => c.outcome === "ADAPTED").length, refused: inv.candidates.filter((c) => c.outcome === "REFUSED").length,
    refusalCodes: [...new Set(inv.candidates.flatMap((c) => c.refusalCodes))].sort(),
  };
  exitWith(0, summary, [`INVENTORY — ${inv.activeTenants} declared tenant(s), ${inv.attachmentRecords} attachment(s); every candidate read through the contract, nothing written`]);
}
if (MODE === "--show" || MODE === "--list" || MODE === "--current") {
  const tenantId = tenantArg();
  /* 🔴 F02 — the partition read below is decided FIRST: the requested tenant must be an ACTIVE declaration, or nothing is read. */
  scopedEntryPoint({ entry: "bin/project-intake.mjs", governed: false, repoUrl: import.meta.url, argv: [`--tenant=${tenantId}`], resources: [RESOURCES.tenantPartition(tenantId)] });
  const root = rootOrExit();
  if (MODE === "--list") {
    const all = listTenant(root, tenantId);
    exitWith(0, { outcome: "LISTED", tenantId, count: all.length, declarations: all.map((h) => ({ declarationId: h.record.declarationId, projectId: h.record.projectId, state: h.state })) });
  }
  if (MODE === "--show") {
    if (!DECLARATION_ID.test(args["--show"])) exitWith(2, { outcome: "REFUSED", refusals: [{ code: "DECLARATION_ID_INVALID", path: "--show" }] });
    const h = findDeclaration(root, tenantId, args["--show"]);
    // 🔴 Not found and "held by another tenant" answer identically: a cross-tenant read learns nothing.
    if (!h) exitWith(1, { outcome: "NOT_FOUND_IN_TENANT", tenantId });
    exitWith(0, { outcome: "FOUND", tenantId, ...view(h) });
  }
  if (!PROJECT_ID.test(args["--current"])) exitWith(2, { outcome: "REFUSED", refusals: [{ code: "PROJECT_ID_INVALID", path: "--current" }] });
  const h = currentDeclaration(root, tenantId, args["--current"]);
  if (!h) exitWith(1, { outcome: "NO_CURRENT_DECLARATION_IN_TENANT", tenantId });
  exitWith(0, { outcome: "CURRENT", tenantId, ...view(h) });
}

/* ── SUBMIT — decided first, then written only with --confirm, through the boundary ─────────────────────── */
const doc = readDocument();
const { tenants, attachedTo, relation, resolve: tenantResolve } = tenancy();
/* 🔴 F02 — the declared tenant partition this submission would read is decided BEFORE the store is touched. A refusal here
 * does not end the run: the F01 contract refuses the same undeclared tenant by its own code and records that decision, and
 * the store is never read for it. The two must agree — a contract that accepts what the scope decision refused is a defect. */
const partition = decideScopedRun({ argv: [`--tenant=${doc?.tenantId ?? ""}`], resolve: tenantResolve, resources: [RESOURCES.tenantPartition(doc?.tenantId ?? null)], sink: diagnosticGuardSink({ actor: "bin/project-intake.mjs" }), log: () => {} });
const root = rootOrExit();
const instant = isoSeconds(Date.now());
const decision = decideSubmission({ doc, root: partition.allowed ? root : null, tenants, attachedTo, relation, acceptedAt: instant });
if (!partition.allowed && decision.outcome !== "REFUSED") throw new Error("F02_SCOPE_CONTRACT_DISAGREEMENT: the contract accepted a submission whose tenant partition the scope decision refused");
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const correlationId = intakeCorrelationId(instant);

if (!permission.mayWrite) {
  // The write gate is consulted and its refusal recorded (F08) only when there is a write to gate.
  if (decision.outcome === "ACCEPT") {
    const w = decision.writes[0];
    const audit = governedContext({ repo: REPO, env: process.env, correlationId, now: instant.slice(0, 10) });
    executeGovernedWrite(declarationWrite({ root, audit, permission, repoRelativeTarget: w.rel, bytes: w.bytes, action: w.action, tenantId: decision.normalised.tenantId, occurredAt: instant }));
  }
  exitWith(decision.outcome === "REFUSED" ? 1 : 0, { outcome: `DRY_RUN_${decision.outcome}`, refusals: decision.refusals, written: 0 },
    [`[dry-run] ${permission.reason} — nothing written, no declaration decision recorded`, ...refusalLines(decision.refusals)]);
}

if (decision.outcome === "REPLAY") {
  exitWith(0, { outcome: "ALREADY_ACCEPTED", declarationId: decision.normalised.declarationId, written: 0 }, ["ALREADY ACCEPTED — the identical submission is current; nothing written, nothing recorded"]);
}

const { authorityRef, authorityHash } = intakeAuthority({ now: instant.slice(0, 10) });
const decisionCtx = governedAuditContext({ repo: REPO, env: process.env, correlationId, authorityRef, authorityHash });
const record = (transition) => recordDeclarationDecisions({
  audit: decisionCtx,
  drafts: [decisionDraft({ transition, refusals: transition.to === "REFUSED" ? decision.refusals : [], ctx: decisionCtx, occurredAt: instant })],
});

if (decision.outcome === "REFUSED") {
  for (const tr of decision.transitions) record(tr);
  exitWith(1, { outcome: "REFUSED", stage: decision.stage, refusals: decision.refusals, written: 0 }, [`🔴 REFUSED (${decision.stage}) — the accepted store is unchanged; the refusal is recorded:`, ...refusalLines(decision.refusals)]);
}

// ACCEPT: VALIDATED is recorded, then the submission and the current view are written through the boundary, and
// only when both committed is ACCEPTED (and any SUPERSEDED) recorded.
const [validated, ...after] = decision.transitions;
record(validated);
const writeAudit = governedContext({ repo: REPO, env: process.env, correlationId, now: instant.slice(0, 10) });
let written = 0;
for (const w of decision.writes) {
  const out = executeGovernedWrite(declarationWrite({ root, audit: writeAudit, permission, repoRelativeTarget: w.rel, bytes: w.bytes, action: w.action, tenantId: decision.normalised.tenantId, occurredAt: instant }));
  if (out.outcome !== "COMMITTED" && out.outcome !== "ALREADY_COMMITTED") {
    exitWith(1, { outcome: "WRITE_FAILED", governedOutcome: out.outcome, written }, [`🔴 ${out.outcome} — the declaration is NOT accepted; the attempt is on the audit trail`]);
  }
  if (out.outcome === "COMMITTED") written += 1;
}
for (const tr of after) record(tr);
exitWith(0, { outcome: "ACCEPTED", declarationId: decision.normalised.declarationId, projectId: decision.normalised.projectId, tenantId: decision.normalised.tenantId, supersedes: decision.normalised.supersedes, written },
  [`ACCEPTED — ${decision.normalised.declarationId} is now the current declaration of ${decision.normalised.projectId}`]);

/* Hoisted: defined here so it reads, in text as in execution, only AFTER the F02 partition decision above (F02 census). */
function rootOrExit() {
  const root = resolveDeclarationRoot({ env: process.env });
  if (!root.ok) exitWith(1, { outcome: "REFUSED", refusals: [{ code: root.code, path: "declaration root" }] }, [`🔴 ${root.code} — ${root.detail}`]);
  return root;
}
