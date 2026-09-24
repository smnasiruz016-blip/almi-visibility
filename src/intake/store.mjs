/**
 * 🔴 F01 §7 · THE DECLARATION STORE — A DECLARED PORTABLE ROOT, TENANT-PARTITIONED, IMMUTABLE HISTORY (24 September 2026).
 *
 * ── WHERE ────────────────────────────────────────────────────────────────────
 * Accepted declarations are client data, so they live where the owner's ruling of 14 September 2026 puts client data:
 * in a declared EXTERNAL subject root (config/subject-roots.mjs, overridable by ALMIVISIBILITY_SUBJECT_ROOTS), never
 * in this engine. The root is the directory `declarations/` inside it, and it exists only when it carries the marker
 * file ROOT.json declaring it. Exactly one external root may carry it:
 *   none        DECLARATION_ROOT_MISSING — fail closed; there is nowhere lawful to write
 *   two or more DECLARATION_ROOT_AMBIGUOUS — fail closed; a silent choice is how a write lands in the wrong place
 *   unreadable  DECLARATION_ROOT_UNREADABLE — fail closed
 * No absolute developer path is stored anywhere: every location is resolved at run time from the declared roots.
 *
 * ── LAYOUT ───────────────────────────────────────────────────────────────────
 *   declarations/tenants/<tenant>/<projectId>/<declarationId>.json   one immutable submission, canonical JSON + LF
 *   declarations/tenants/<tenant>/<projectId>/current.json           the accepted view: which declaration is current
 * A submission file is written once and never rewritten; supersession writes a NEW submission and moves the view.
 *
 * 🔴 THIS MODULE WRITES NOTHING. It reads, and it builds the arguments of a governed write; the entry point hands
 * those to F08's executeGovernedWrite itself, so every mutation passes the shared boundary and its audit.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { subjectRoots } from "../subject-roots.mjs";
import { canonicalJson } from "../audit-trail/event.mjs";
import { stagedReplaceAdapter } from "../governance/durability-adapters.mjs";
import { DECLARATION_ID, PROJECT_ID } from "./contract.mjs";
import { TENANT_ID_PATTERN } from "../tenancy/resolver.mjs";

export const DECLARATIONS_DIR = "declarations";
export const ROOT_MARKER = "ROOT.json";
export const ROOT_MARKER_CONTENT = Object.freeze({ schemaVersion: 1, kind: "PROJECT_DECLARATION_ROOT" });
export const CURRENT_FILE = "current.json";

/** Canonical bytes: sorted keys, no insignificant whitespace, UTF-8, one LF. Deterministic across machines. */
export const serialise = (value) => `${canonicalJson(value)}\n`;

/** A tenant id is `tenant:<hex>`; a directory name may not carry a colon on every platform. A bijection, not a hash. */
export const tenantDir = (tenantId) => {
  if (!TENANT_ID_PATTERN.test(String(tenantId))) throw new Error("TENANT_ID_INVALID: a directory is only ever made from a declared tenant id");
  return String(tenantId).replace(":", "-");
};

/** Resolve the one declared declaration root, or say exactly why there is none. Never throws, never guesses. */
export function resolveDeclarationRoot({ env = process.env } = {}) {
  let roots;
  try { roots = subjectRoots(env).filter((r) => r.kind === "external"); } catch (e) { return fail("DECLARATION_ROOT_UNREADABLE", e.message); }
  const marked = roots.filter((r) => existsSync(join(r.path, DECLARATIONS_DIR, ROOT_MARKER)));
  if (marked.length === 0) return fail("DECLARATION_ROOT_MISSING", `no declared external root holds ${DECLARATIONS_DIR}/${ROOT_MARKER}`);
  if (marked.length > 1) return fail("DECLARATION_ROOT_AMBIGUOUS", `${marked.length} declared external roots hold ${DECLARATIONS_DIR}/${ROOT_MARKER}`);
  const base = marked[0].path;
  try {
    const marker = JSON.parse(readFileSync(join(base, DECLARATIONS_DIR, ROOT_MARKER), "utf8"));
    if (marker?.schemaVersion !== ROOT_MARKER_CONTENT.schemaVersion || marker?.kind !== ROOT_MARKER_CONTENT.kind) return fail("DECLARATION_ROOT_UNREADABLE", "the root marker does not declare a project declaration root");
  } catch (e) {
    return fail("DECLARATION_ROOT_UNREADABLE", "the root marker could not be read as JSON");
  }
  return Object.freeze({ ok: true, base, dir: join(base, DECLARATIONS_DIR), rootId: marked[0].id });
}
const fail = (code, detail) => Object.freeze({ ok: false, code, detail });

const tenantsDir = (root) => join(root.dir, "tenants");
const projectDir = (root, tenantId, projectId) => join(tenantsDir(root), tenantDir(tenantId), projectId);
const rel = (...parts) => [DECLARATIONS_DIR, "tenants", ...parts].join("/");
export const submissionRel = (tenantId, projectId, declarationId) => rel(tenantDir(tenantId), projectId, `${declarationId}.json`);
export const currentRel = (tenantId, projectId) => rel(tenantDir(tenantId), projectId, CURRENT_FILE);

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const dirs = (p) => (existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);

/** Which tenant, if any, already holds this project — the one integrity read that looks across partitions. */
export function tenantHoldingProject(root, projectId) {
  if (!PROJECT_ID.test(String(projectId))) return null;
  const holders = dirs(tenantsDir(root)).filter((t) => existsSync(join(tenantsDir(root), t, projectId)));
  return holders.length ? holders.map((t) => t.replace("-", ":")) : null;
}

/** The accepted view of one project inside one tenant: the current declaration id, or null. */
export function currentPointer(root, tenantId, projectId) {
  const p = join(projectDir(root, tenantId, projectId), CURRENT_FILE);
  return existsSync(p) ? readJson(p) : null;
}

/** Every stored submission of one project inside one tenant, with its DERIVED workflow state. */
export function projectHistory(root, tenantId, projectId) {
  const dir = projectDir(root, tenantId, projectId);
  if (!existsSync(dir)) return [];
  const records = readdirSync(dir).filter((n) => DECLARATION_ID.test(n.replace(/\.json$/, "")) && n.endsWith(".json")).map((n) => readJson(join(dir, n)));
  const current = currentPointer(root, tenantId, projectId)?.declarationId ?? null;
  const superseded = new Set(records.map((r) => r.supersedes).filter(Boolean));
  return records
    .map((r) => ({ record: r, state: r.declarationId === current ? "ACCEPTED" : superseded.has(r.declarationId) ? "SUPERSEDED" : "ORPHANED_SUBMISSION" }))
    .sort((a, b) => a.record.submittedAt.localeCompare(b.record.submittedAt) || a.record.declarationId.localeCompare(b.record.declarationId));
}

/** Every declaration of ONE tenant. 🔴 It reads that tenant's partition only; another tenant's is never opened. */
export function listTenant(root, tenantId) {
  return dirs(join(tenantsDir(root), tenantDir(tenantId))).flatMap((projectId) => projectHistory(root, tenantId, projectId));
}

/** One declaration, looked up INSIDE one tenant. An id held by another tenant answers exactly like an absent one. */
export function findDeclaration(root, tenantId, declarationId) {
  if (!DECLARATION_ID.test(String(declarationId))) return null;
  return listTenant(root, tenantId).find((h) => h.record.declarationId === declarationId) ?? null;
}

/** The one current accepted declaration of a project inside one tenant, or null. */
export function currentDeclaration(root, tenantId, projectId) {
  const accepted = projectHistory(root, tenantId, projectId).filter((h) => h.state === "ACCEPTED");
  if (accepted.length > 1) throw new Error("MORE_THAN_ONE_CURRENT_DECLARATION: the accepted view names more than one declaration");
  return accepted[0] ?? null;
}

/** Does any tenant already hold a submission with this declaration id? (Integrity only; never returned to a reader.) */
export function declarationIdHolder(root, declarationId) {
  for (const t of dirs(tenantsDir(root))) {
    for (const p of dirs(join(tenantsDir(root), t))) {
      const f = join(tenantsDir(root), t, p, `${declarationId}.json`);
      if (existsSync(f)) return { tenantId: t.replace("-", ":"), projectId: p, bytes: readFileSync(f, "utf8") };
    }
  }
  return null;
}

/**
 * The arguments of ONE governed whole-file write into the declaration root, for F08's executeGovernedWrite. The
 * adapter is confined beneath the declared external root; the audit context is the engine's own.
 */
export function declarationWrite({ root, audit, permission, repoRelativeTarget, bytes, action, tenantId, occurredAt }) {
  const adapter = stagedReplaceAdapter({ repo: root.base, repoRelativeTarget, targetClass: "REPOSITORY_FILE", bytes });
  return {
    permission,
    audit,
    adapter,
    action: { name: action, scopeType: "TENANT", tenantId, subjectId: null, occurredAt, occurrenceFingerprint: adapter.occurrenceFingerprint, evidenceRefs: [] },
  };
}
