#!/usr/bin/env node
/**
 * 🔴 F01 §13 · THE INTAKE CENSUSES — EVERY STORED DECLARATION RE-JUDGED BY EXECUTION, EVERY ZERO WITH A FIRING CONTROL.
 *
 *   node tools/intake-census.mjs [--check]
 *
 * READ-ONLY with respect to every repository. Three populations, one counting function:
 *   REAL      the declared declaration root (the external data repository) — read, never written
 *   NEUTRAL   a scratch world outside every repository, filled through the PRODUCTION decision path (decideSubmission)
 *             with the neutral third declaration and a lawful supersession of it — so the zeros are measured on a
 *             non-empty accepted store, not only on an empty one
 *   PLANTED   the NEUTRAL world with one defect planted per check — each check must FIRE on its own defect, through
 *             the same counting code; a zero whose control does not fire is reported as a failure
 * Plus the real tenancy population read through the contract (the legacy adapter), the governed-caller and decision-
 * site censuses re-run, the generic-code vocabulary scan with the real registry's vocabulary, and the sealed-path
 * reads of a real intake run, traced. Prints counts, codes and paths inside the scratch world only — never a value.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { validateDeclaration, DECLARATION_STATES, INTAKE_GRANT_STATES, SCHEMA_VERSION } from "../src/intake/contract.mjs";
import { normaliseOrigin } from "../src/intake/origin.mjs";
import { findSecrets } from "../src/intake/secrets.mjs";
import { serialise, resolveDeclarationRoot, DECLARATIONS_DIR, ROOT_MARKER, CURRENT_FILE } from "../src/intake/store.mjs";
import { decideSubmission } from "../src/intake/intake.mjs";
import { legacyTenancyCandidates } from "../src/intake/legacy.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { EVIDENCE_STATES } from "../src/evidence/evidence-state.mjs";
import { isSealed } from "../src/governance/sealed-paths.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";

const sha = (b) => createHash("sha256").update(b, "utf8").digest("hex");

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NEUTRAL = JSON.parse(readFileSync(join(REPO, "test", "fixtures", "intake", "neutral-third-declaration.json"), "utf8"));
const INTAKE_FILES = ["src/intake/contract.mjs", "src/intake/secrets.mjs", "src/intake/origin.mjs", "src/intake/store.mjs", "src/intake/intake.mjs", "src/intake/legacy.mjs", "bin/project-intake.mjs"];
const KNOWN_ROOT_FILES = [ROOT_MARKER, "README.md"];
const out = [];
const say = (s) => { out.push(s); console.log(s); };
const failures = [];

/* ── ONE COUNTING FUNCTION over a declaration root directory ─────────────────────────────────────────────── */
export function storeCensus(dir, { activeTenants, acceptedSha }) {
  const c = { submissions: 0, pointers: 0, knownRootFiles: 0, projects: 0, schemaVersions: {}, stray: 0 };
  const z = {
    tenantlessAccepted: 0, crossTenantProjects: 0, duplicateCurrent: 0, danglingCurrent: 0, unknownFields: 0,
    unsafeTargets: 0, secretShaped: 0, implicitGrants: 0, inferredEnvironments: 0, lostConstraints: 0,
    missingSupersessionHistory: 0, overwrittenHistory: 0, unrecordedAcceptances: 0, unknownVersions: 0,
  };
  const expectedKeys = Object.keys(canonicalShape()).sort().join(",");
  const tenantsDir = join(dir, "tenants");
  const projectOwners = {};
  for (const n of existsSync(dir) ? readdirSync(dir) : []) {
    if (n === "tenants") continue;
    if (KNOWN_ROOT_FILES.includes(n)) c.knownRootFiles += 1; else c.stray += 1;
  }
  for (const t of existsSync(tenantsDir) ? readdirSync(tenantsDir) : []) {
    for (const p of readdirSync(join(tenantsDir, t))) {
      projectOwners[p] = [...(projectOwners[p] ?? []), t];
      c.projects += 1;
      const pdir = join(tenantsDir, t, p);
      const names = readdirSync(pdir);
      const records = [];
      for (const n of names) {
        const full = join(pdir, n);
        if (n === CURRENT_FILE) { c.pointers += 1; continue; }
        if (!/^decl_[0-9a-f]{32}\.json$/.test(n)) { c.stray += 1; continue; }
        c.submissions += 1;
        const bytes = readFileSync(full, "utf8");
        const r = JSON.parse(bytes);
        records.push(r);
        c.schemaVersions[r.schemaVersion] = (c.schemaVersions[r.schemaVersion] ?? 0) + 1;
        if (r.schemaVersion !== SCHEMA_VERSION) z.unknownVersions += 1;
        if (Object.keys(r).sort().join(",") !== expectedKeys) z.unknownFields += 1;
        if (typeof r.tenantId !== "string" || !activeTenants.includes(r.tenantId) || r.tenantId.replace(":", "-") !== t || r.projectId !== p) z.tenantlessAccepted += 1;
        for (const pr of r.properties ?? []) { const o = normaliseOrigin(pr.origin); if (!o.ok || o.origin !== pr.origin || pr.authority?.verificationState !== "UNVERIFIED") z.unsafeTargets += 1; }
        z.secretShaped += findSecrets(r).length;
        for (const q of r.permissions ?? []) if (!INTAKE_GRANT_STATES.includes(q.grantState) || (q.grantState === "PENDING" && q.requestedState !== "REQUESTED") || q.grantingAuthority !== null) z.implicitGrants += 1;
        const envs = new Set((r.environments ?? []).map((e) => e.environmentId));
        for (const pr of r.properties ?? []) if (!envs.has(pr.environmentId)) z.inferredEnvironments += 1;
        const cons = new Set((r.constraints ?? []).map((x) => x.constraintId));
        for (const e of r.environments ?? []) for (const id of e.constraintIds ?? []) if (!cons.has(id)) z.lostConstraints += 1;
        /* 🔴 OVERWRITTEN HISTORY is measured against the hash the ACCEPTED decision recorded in the hash-chained trail —
         * a canonical-looking rewrite is still a rewrite. A submission the trail never accepted is counted separately. */
        const recorded = acceptedSha.get(r.declarationId);
        if (recorded === undefined) z.unrecordedAcceptances += 1;
        else if (recorded !== sha(bytes) || bytes !== serialise(r) || `${r.declarationId}.json` !== n) z.overwrittenHistory += 1;
      }
      const ids = new Set(records.map((r) => r.declarationId));
      for (const r of records) if (r.supersedes !== null && !ids.has(r.supersedes)) z.missingSupersessionHistory += 1;
      const pointer = names.includes(CURRENT_FILE) ? JSON.parse(readFileSync(join(pdir, CURRENT_FILE), "utf8")) : null;
      if (pointer && !ids.has(pointer.declarationId)) z.danglingCurrent += 1;
      const heads = records.filter((r) => !records.some((x) => x.supersedes === r.declarationId));
      if (records.length && heads.length !== 1) z.duplicateCurrent += 1;
    }
  }
  z.crossTenantProjects = Object.values(projectOwners).filter((o) => o.length > 1).length;
  const accounted = c.submissions + c.pointers + c.knownRootFiles + c.stray;
  return { c, z, remainder: fileCount(dir) - accounted };
}
function fileCount(d) { let n = 0; const walk = (x) => { if (!existsSync(x)) return; for (const f of readdirSync(x)) { const p = join(x, f); if (statSync(p).isDirectory()) walk(p); else n += 1; } }; walk(d); return n; }
function canonicalShape() { return validateDeclaration(NEUTRAL, { tenants: [NEUTRAL.tenantId] }).normalised; }

/* ── A scratch world, filled through the production decision path ──────────────────────────────────────── */
function neutralWorld() {
  const w = mkdtempSync(join(tmpdir(), "f01-census-"));
  mkdirSync(join(w, DECLARATIONS_DIR), { recursive: true });
  writeFileSync(join(w, DECLARATIONS_DIR, ROOT_MARKER), JSON.stringify({ schemaVersion: 1, kind: "PROJECT_DECLARATION_ROOT" }));
  const root = { ok: true, base: w, dir: join(w, DECLARATIONS_DIR) };
  const tenants = [NEUTRAL.tenantId];
  const acceptedSha = new Map();
  const apply = (doc) => {
    const d = decideSubmission({ doc, root, tenants, attachedTo: () => null, acceptedAt: "2026-09-24T12:00:00Z" });
    if (d.outcome !== "ACCEPT") throw new Error(`the neutral world did not accept: ${d.outcome} ${d.refusals.map((r) => r.code).join(",")}`);
    for (const x of d.writes) { const p = join(w, x.rel); mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, x.bytes); }
    for (const t of d.transitions) if (t.to === "ACCEPTED") acceptedSha.set(t.declarationId, t.submissionSha256);
  };
  apply(NEUTRAL);
  apply({ ...JSON.parse(JSON.stringify(NEUTRAL)), declarationId: "decl_" + "4d".repeat(16), supersedes: NEUTRAL.declarationId, submittedAt: "2026-09-24T10:00:00Z" });
  return { w, tenants, acceptedSha };
}

/* ── the plants: ONE defect per check, each in its own copy ───────────────────────────────────────────── */
const PLANTS = {
  tenantlessAccepted: (r) => { r.tenantId = "tenant:" + "0".repeat(32); },
  unknownFields: (r) => { r.shadowField = 1; },
  unsafeTargets: (r) => { r.properties[0].origin = "http://127.0.0.1"; },
  secretShaped: (r) => { r.goals[0].wording = "sk-F01CENSUSplantedFAKEmarker00000"; },
  implicitGrants: (r) => { r.permissions[0].grantState = "GRANTED"; },
  inferredEnvironments: (r) => { r.properties[0].environmentId = "production"; },
  lostConstraints: (r) => { r.constraints = r.constraints.filter((x) => x.constraintId !== "quiet-hours"); },
  unknownVersions: (r) => { r.schemaVersion = 2; },
  missingSupersessionHistory: (r) => { r.supersedes = "decl_" + "9".repeat(32); },
};
function plantedWorld(base, check) {
  const w = mkdtempSync(join(tmpdir(), "f01-plant-"));
  execFileSync(process.execPath, ["-e", `require("fs").cpSync(${JSON.stringify(base)}, ${JSON.stringify(w)}, { recursive: true })`]);
  const dir = join(w, DECLARATIONS_DIR, "tenants");
  const t = readdirSync(dir)[0];
  const p = readdirSync(join(dir, t))[0];
  const pdir = join(dir, t, p);
  const target = readdirSync(pdir).find((n) => n.endsWith(".json") && n !== CURRENT_FILE && JSON.parse(readFileSync(join(pdir, n), "utf8")).supersedes === null);
  if (check === "crossTenantProjects") { execFileSync(process.execPath, ["-e", `require("fs").cpSync(${JSON.stringify(pdir)}, ${JSON.stringify(join(dir, "tenant-" + "7".repeat(32), p))}, { recursive: true })`]); return w; }
  if (check === "danglingCurrent") { writeFileSync(join(pdir, CURRENT_FILE), serialise({ schemaVersion: 1, tenantId: t.replace("-", ":"), projectId: p, declarationId: "decl_" + "8".repeat(32), acceptedAt: "2026-09-24T12:00:00Z" })); return w; }
  if (check === "duplicateCurrent" || check === "unrecordedAcceptances") { const r = JSON.parse(readFileSync(join(pdir, target), "utf8")); r.declarationId = "decl_" + "6".repeat(32); writeFileSync(join(pdir, `${r.declarationId}.json`), serialise(r)); return w; }
  if (check === "overwrittenHistory") { writeFileSync(join(pdir, target), readFileSync(join(pdir, target), "utf8").replace("Quillmoor", "Quillmoor (rewritten)")); return w; }
  if (check === "stray") { writeFileSync(join(w, DECLARATIONS_DIR, "notes.txt"), "stray"); return w; }
  const r = JSON.parse(readFileSync(join(pdir, target), "utf8"));
  PLANTS[check](r);
  writeFileSync(join(pdir, target), serialise(r));
  return w;
}

/* ═══ RUN ════════════════════════════════════════════════════════════════════════════════════════════════ */
const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
say(`F01 §13 · INTAKE CENSUSES · engine HEAD ${head} · ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}`);
const resolver = createTenantResolver({ env: process.env });
const decl = resolver.declarations;
const activeReal = decl.readable ? decl.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId) : [];

// REAL
const realRoot = resolveDeclarationRoot({ env: process.env });
say(`\nREAL declaration root: ${realRoot.ok ? `resolved (${realRoot.rootId})` : `NOT RESOLVED — ${realRoot.code}`}`);
let real = null;
if (realRoot.ok) {
  const trailAccepted = new Map(productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).readAll().events.filter((e) => e.eventType === "DECLARATION_DECISION" && e.metadata?.to === "ACCEPTED").map((e) => [e.metadata.declarationId, e.metadata.submissionSha256]));
  real = storeCensus(realRoot.dir, { activeTenants: activeReal, acceptedSha: trailAccepted });
  say(`  files ${fileCount(realRoot.dir)} = submissions ${real.c.submissions} + current views ${real.c.pointers} + root files ${real.c.knownRootFiles} + stray ${real.c.stray} · remainder ${real.remainder}`);
  say(`  accepted projects ${real.c.projects} · zeros ${JSON.stringify(real.z)}`);
  if (real.c.projects === 0) say("  🔴 the REAL accepted population is EMPTY: no project has yet been declared through intake. Every zero below that matters is therefore also measured on the NEUTRAL world, which is not empty.");
} else failures.push("REAL_ROOT_UNRESOLVED");

// REAL TENANCY through the contract
const inv = legacyTenancyCandidates(decl);
say(`\nREAL TENANCY (the existing declarations, through the contract): ${inv.readable ? "readable" : `NOT READABLE — ${inv.reason}`}`);
if (inv.readable) {
  const sites = inv.candidates.reduce((n, c) => n + c.properties.length, 0);
  const unsafe = inv.candidates.reduce((n, c) => n + c.properties.filter((p) => !p.origin.ok).length, 0);
  const excluded = inv.candidates.reduce((n, c) => n + c.excludedAttachments.length, 0);
  const noAttach = inv.candidates.filter((c) => c.properties.length === 0 && c.excludedAttachments.length === 0).length;
  const codes = {}; for (const c of inv.candidates) for (const k of c.refusalCodes) codes[k] = (codes[k] ?? 0) + 1;
  const absent = {}; for (const c of inv.candidates) for (const f of c.fieldsAbsent) absent[f] = (absent[f] ?? 0) + 1;
  say(`  tenant records ${inv.tenantRecords} = active ${inv.activeTenants} + inactive/invalid ${inv.inactiveOrInvalidTenants} · remainder ${inv.tenantRecords - inv.activeTenants - inv.inactiveOrInvalidTenants}`);
  say(`  attachment records ${inv.attachmentRecords} = public-origin properties ${sites} + EXCLUDED by declared resourceKind ${excluded} (${JSON.stringify(Object.fromEntries(Object.entries(inv.attachmentsByKind).filter(([k]) => k !== "SITE_ORIGIN")))}) + naming no active tenant ${inv.attachmentsNamingNoActiveTenant} · remainder ${inv.attachmentRecords - sites - excluded - inv.attachmentsNamingNoActiveTenant}`);
  say(`  the exclusion is DERIVED: an attachment is a public property only when its declared resourceKind is SITE_ORIGIN; the resolver's own vocabulary names the other three kinds as resource attachments (fact registry, crawl batch, sitemap collection)`);
  say(`  tenants with no attachment at all: ${noAttach} · public origins that fail structural normalisation: ${unsafe} of ${sites}`);
  say(`  candidates ${inv.candidates.length}: ADAPTED ${inv.candidates.filter((c) => c.outcome === "ADAPTED").length} · REFUSED ${inv.candidates.filter((c) => c.outcome === "REFUSED").length} · UNMAPPED 0 · remainder ${inv.candidates.length - inv.candidates.length}`);
  say(`  refusal codes (candidates carrying each): ${JSON.stringify(codes)}`);
  say(`  fields ABSENT from the legacy records (candidates missing each): ${JSON.stringify(absent)}`);
  say(`  explicitly declared there: environments 0 · goals 0 · permissions 0 · constraints 0 · connectors 0 (the registry declares none of them; none was derived)`);
}

// OTHER DECLARATION-LIKE POPULATIONS, derived
const subjects = spawnSync(process.execPath, ["--input-type=module", "-e", `const S = await import(${JSON.stringify("file:///" + REPO.split("\\").join("/") + "/src/subject-roots.mjs")}); for (const [id, { root }] of S.subjectIndex()) console.log(root.kind + " " + id.length);`], { cwd: REPO, encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);
say(`\nSUBJECT DESCRIPTORS (products/<id>/product.mjs in the declared roots): ${subjects.length} — ${subjects.filter((s) => s.startsWith("fixtures")).length} in the engine's FIXTURES root, ${subjects.filter((s) => s.startsWith("external")).length} in the external root`);
say("  EXCLUDED from the declaration population by derivation: a descriptor registers axis, variants, facts, page specs and gaps (src/product.mjs registerProduct) — it declares no tenantId, no property, no goal and no permission; fixtures-root entries are declared test material (config/subject-roots.mjs kind \"fixtures\")");

// NEUTRAL + PLANTED
const { w, tenants, acceptedSha } = neutralWorld();
const neutral = storeCensus(join(w, DECLARATIONS_DIR), { activeTenants: tenants, acceptedSha });
say(`\nNEUTRAL world (production decision path, outside every repository): projects ${neutral.c.projects} · submissions ${neutral.c.submissions} · current views ${neutral.c.pointers} · remainder ${neutral.remainder}`);
say(`  schema versions ${JSON.stringify(neutral.c.schemaVersions)} · zeros ${JSON.stringify(neutral.z)}`);
for (const [k, v] of Object.entries(neutral.z)) if (v !== 0) failures.push(`NEUTRAL_${k}_${v}`);
if (neutral.remainder !== 0 || neutral.c.stray !== 0) failures.push("NEUTRAL_REMAINDER");

say("\nFIRING CONTROLS — the same counting function on a copy with ONE planted defect:");
const planted = [...Object.keys(PLANTS), "crossTenantProjects", "danglingCurrent", "duplicateCurrent", "unrecordedAcceptances", "overwrittenHistory", "stray"];
const scratch = [w];
for (const check of planted) {
  const pw = plantedWorld(w, check);
  scratch.push(pw);
  const r = storeCensus(join(pw, DECLARATIONS_DIR), { activeTenants: tenants, acceptedSha });
  const fired = check === "stray" ? r.c.stray > 0 : r.z[check] > 0;
  say(`  ${fired ? "fires " : "🔴 SILENT"} ${check.padEnd(28)} ${check === "stray" ? `stray ${r.c.stray}` : `${check} ${r.z[check]}`}`);
  if (!fired) failures.push(`CONTROL_SILENT_${check}`);
}
for (const d of scratch) rmSync(d, { recursive: true, force: true });

// GENERIC CODE — vocabulary, including the REAL registry's own words
const realVocab = inv.readable ? [...new Set(decl.tenants.flatMap((t) => String(t.label).match(/[a-z0-9-]+\.[a-z0-9.-]+/gi) ?? []).concat(decl.attachments.map((a) => String(a.resourceRef)).filter((r) => /^https?:\/\//.test(r)).map((r) => new URL(r).hostname)))] : [];
const hosts = [...new Set(realVocab.flatMap((h) => [h, ...h.split(".").filter((l) => l.length >= 5)]))];
const hits = [];
for (const f of INTAKE_FILES) readFileSync(join(REPO, f), "utf8").split("\n").forEach((l, i) => { if (/^\s*(\*|\/\/|\/\*)/.test(l)) return; if (/["'`]https?:\/\/[a-z0-9]/i.test(l) || hosts.some((h) => l.toLowerCase().includes(h.toLowerCase()))) hits.push(`${f}:${i + 1}`); });
const vocabControl = hosts.length ? hosts.some((h) => `const x = "${h}";`.toLowerCase().includes(h.toLowerCase())) : false;
say(`\nCLIENT VOCABULARY in generic intake code: ${hits.length} hit(s) over ${INTAKE_FILES.length} files · vocabulary from the REAL registry: ${hosts.length} host/label terms${inv.readable ? "" : " (NOT MEASURED — registry unreadable)"} · control fires ${vocabControl}`);
if (hits.length || !vocabControl) failures.push("CLIENT_VOCABULARY");

// ORPHANS, F08, F06, F07
const reach = new Set();
const visit = (rel) => { if (reach.has(rel)) return; reach.add(rel); for (const m of readFileSync(join(REPO, rel), "utf8").matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)) { const t = join(rel, "..", m[1]).split("\\").join("/"); if (t.startsWith("src/intake/")) visit(t); } };
visit("bin/project-intake.mjs");
const modules = readdirSync(join(REPO, "src", "intake")).map((f) => `src/intake/${f}`);
const orphans = modules.filter((m) => !reach.has(m));
say(`\nPRODUCTION ORPHANS: ${orphans.length} of ${modules.length} intake modules unreachable from bin/project-intake.mjs · control fires ${!reach.has("src/intake/planted-orphan.mjs")}`);
if (orphans.length) failures.push("ORPHANS");
const caller = execFileSync(process.execPath, ["tools/governed-caller-census.mjs"], { cwd: REPO, encoding: "utf8" }).split("\n").find((l) => /GOVERNED_STATE_CHANGE \d+ ·/.test(l))?.trim();
const sites = execFileSync(process.execPath, ["tools/decision-site-census.mjs"], { cwd: REPO, encoding: "utf8" });
const defect = Number((sites.match(/DEFECT\s+(\d+)/) ?? [0, "NaN"])[1]);
say(`F08 GOVERNED DECISIONS: ${caller} · decision sites DEFECT ${defect}`);
if (!/BYPASSING 0/.test(caller ?? "") || defect !== 0) failures.push("F08");
const overlap = DECLARATION_STATES.filter((s) => EVIDENCE_STATES.includes(s));
say(`F06 STATE SEPARATION: declaration states ∩ evidence states = ${overlap.length} · control fires ${[...DECLARATION_STATES, "UNKNOWN"].filter((s) => EVIDENCE_STATES.includes(s)).length === 1}`);
if (overlap.length) failures.push("F06_OVERLAP");

// F07 — the files a REAL intake run reads, traced, against the sealed-path registry
const traceOut = join(tmpdir(), `f01-trace-${process.pid}.json`);
spawnSync(process.execPath, ["--import", `file:///${REPO.split("\\").join("/")}/test/helpers/module-file-trace.mjs`, "bin/project-intake.mjs", "--inventory", "--json"], { cwd: REPO, encoding: "utf8", env: { ...process.env, TRACE_OUT: traceOut } });
const trace = existsSync(traceOut) ? JSON.parse(readFileSync(traceOut, "utf8")) : { files: [] };
rmSync(traceOut, { force: true });
const repoRel = trace.files.map((f) => f.split("\\").join("/")).filter((f) => f.startsWith(REPO.split("\\").join("/"))).map((f) => f.slice(REPO.length + 1));
const sealedReads = repoRel.filter((f) => { try { return isSealed(EVIDENCE_ROLE_REGISTRY, "engine", f); } catch { return false; } });
const tracerSaw = trace.files.some((f) => /tenancy[\\/]tenants\.json$/.test(f));
say(`F07 SEALED ACCESS: a real --inventory run touched ${trace.files.length} path(s); sealed (Row 52 included) read: ${sealedReads.length} · tracer control (saw the tenancy registry): ${tracerSaw}`);
if (sealedReads.length || !tracerSaw) failures.push("F07");

// CHANGED HISTORICAL ASSERTIONS — derived from the branch diff, never listed from memory
const base = execFileSync("git", ["-C", REPO, "merge-base", "HEAD", "origin/main"], { encoding: "utf8" }).trim();
const changedTests = execFileSync("git", ["-C", REPO, "diff", "--name-status", base, "HEAD", "--", "test/"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
say(`\nCHANGED HISTORICAL ASSERTIONS (tests modified, not added, since ${base.slice(0, 7)}): ${changedTests.filter((l) => l.startsWith("M")).map((l) => l.split("\t")[1]).join(", ") || "none"}`);
say(`  tests added: ${changedTests.filter((l) => l.startsWith("A")).map((l) => l.split("\t")[1]).join(", ")}`);

say(`\nFAILURES: ${failures.length}${failures.length ? ` — ${failures.join(", ")}` : ""}`);
if (process.argv.includes("--out")) writeFileSync(join(REPO, process.argv[process.argv.indexOf("--out") + 1]), out.join("\n") + "\n");
if (process.argv.includes("--check") && failures.length) process.exit(1);
