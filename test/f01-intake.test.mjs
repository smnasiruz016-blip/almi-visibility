/**
 * 🔴 F01 · PRODUCT DECLARATION AND INTAKE — THE PROOFS (24 September 2026).
 *
 * Every submission here goes through the PRODUCTION entry point (bin/project-intake.mjs), spawned from this test so
 * its audit events land in the confined store F08 gives a verified test context. Each world is a fresh temporary
 * external root holding a tenancy registry and a declaration root, handed to the binary through
 * ALMIVISIBILITY_SUBJECT_ROOTS exactly as a real deployment would declare one. Neutral data only: every origin sits
 * under the `.example` top-level domain, which RFC 2606 reserves so it can never be anybody's site.
 *
 * Each proof carries a control able to give the opposite verdict.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { validateDeclaration, DECLARATION_STATES, PERMISSION_KINDS, TOP_LEVEL_FIELDS } from "../src/intake/contract.mjs";
import { normaliseOrigin } from "../src/intake/origin.mjs";
import { findSecrets } from "../src/intake/secrets.mjs";
import { legacyTenancyCandidates } from "../src/intake/legacy.mjs";
import { EVIDENCE_STATES, makeEvidenceState } from "../src/evidence/evidence-state.mjs";
import { auditRunScope, resolveAuditStoreLocation } from "../src/governance/governed-run.mjs";
import { auditClassOf } from "../src/governance/guard-audit.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors } from "../src/fboard/board.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { intakeAuthority } from "../src/intake/intake.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BIN = join(REPO, "bin", "project-intake.mjs");
const NEUTRAL = JSON.parse(readFileSync(join(REPO, "test", "fixtures", "intake", "neutral-third-declaration.json"), "utf8"));
const TENANT_N = NEUTRAL.tenantId;
const TENANT_A = `tenant:${"a1".repeat(16)}`;
const TENANT_B = `tenant:${"b2".repeat(16)}`;
const clone = (x) => JSON.parse(JSON.stringify(x));
const sha = (b) => createHash("sha256").update(b).digest("hex");

/* The confined audit store this process (and every binary it spawns) writes to. */
auditRunScope(process.env);
const auditPath = () => resolveAuditStoreLocation({ repo: REPO, env: process.env }).eventsPath;
const auditLines = () => (existsSync(auditPath()) ? readFileSync(auditPath(), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const auditText = () => (existsSync(auditPath()) ? readFileSync(auditPath(), "utf8") : "");

const worlds = [];
test.after(() => { for (const w of worlds) rmSync(w, { recursive: true, force: true }); });

/** A fresh external root: a tenancy registry and (unless told otherwise) a marked declaration root. */
function world({ tenants = [TENANT_N, TENANT_A, TENANT_B], attachments = [{ kind: "SITE_ORIGIN", ref: "https://ropewalk-b.example", tenant: TENANT_B }], root = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "f01-world-"));
  worlds.push(dir);
  mkdirSync(join(dir, "tenancy"), { recursive: true });
  writeFileSync(join(dir, "tenancy", "tenants.json"), JSON.stringify({ schemaVersion: 1, tenants: tenants.map((tenantId) => ({ schemaVersion: 1, tenantId, status: "ACTIVE", declaredOn: "2026-09-24", declarationBasis: "TEST_WORLD", label: "neutral test scope" })) }));
  writeFileSync(join(dir, "tenancy", "attachments.json"), JSON.stringify({ schemaVersion: 1, attachments: attachments.map((a) => ({ schemaVersion: 1, resourceKind: a.kind, resourceRef: a.ref, tenantId: a.tenant, declaredOn: "2026-09-24", declarationBasis: "TEST_WORLD" })) }));
  if (root) { mkdirSync(join(dir, "declarations"), { recursive: true }); writeFileSync(join(dir, "declarations", "ROOT.json"), JSON.stringify({ schemaVersion: 1, kind: "PROJECT_DECLARATION_ROOT" })); }
  return dir;
}
/** Run the production binary against one or more roots. Returns the parsed --json result, exit status and raw output. */
function run(roots, ...args) {
  const r = spawnSync(process.execPath, [BIN, ...args, "--json"], { cwd: REPO, encoding: "utf8", env: { ...process.env, ALMIVISIBILITY_SUBJECT_ROOTS: [roots].flat().join(process.platform === "win32" ? ";" : ":") } });
  const last = (r.stdout ?? "").trim().split("\n").pop();
  let json = null;
  try { json = JSON.parse(last); } catch { /* reported below */ }
  return { status: r.status, json, out: `${r.stdout}${r.stderr}` };
}
/** Write a declaration document into the world and return its path. */
function file(w, doc, name = `d-${Math.random().toString(16).slice(2)}.json`) {
  const p = join(w, name);
  writeFileSync(p, typeof doc === "string" ? doc : JSON.stringify(doc, null, 2));
  return p;
}
/** Every file under the declaration root, with its bytes' hash — the whole accepted store, as a value. */
function storeSnapshot(w) {
  const out = {};
  const walk = (d) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else out[p.slice(w.length)] = sha(readFileSync(p)); } };
  walk(join(w, "declarations"));
  return out;
}
/** A lawful declaration for a tenant, with fresh ids. */
function decl(tenantId = TENANT_N, over = {}) {
  const d = clone(NEUTRAL);
  d.tenantId = tenantId;
  d.declarationId = `decl_${createHash("md5").update(Math.random().toString()).digest("hex")}`;
  return Object.assign(d, over);
}
const tenantsOf = (w) => JSON.parse(readFileSync(join(w, "tenancy", "tenants.json"), "utf8")).tenants.map((t) => t.tenantId);
const validate = (doc, tenants = [TENANT_N, TENANT_A, TENANT_B], attachedTo) => validateDeclaration(doc, { tenants, attachedTo });
const codes = (v) => v.refusals.map((r) => r.code);
const f01Events = () => auditLines().filter((e) => e.eventType === "DECLARATION_DECISION");

/* ═══ SCHEMA AND VERSION ═════════════════════════════════════════════════════ */

test("P1 · a supported schema version passes — CONTROL: the same document at version 2 does not", () => {
  assert.equal(validate(decl()).ok, true);
  assert.deepEqual(codes(validate(decl(TENANT_N, { schemaVersion: 2 }))), ["SCHEMA_VERSION_UNSUPPORTED"]);
});

test("P2 · an absent schema version is refused — CONTROL: present, it passes", () => {
  const d = decl(); delete d.schemaVersion;
  assert.ok(codes(validate(d)).includes("SCHEMA_VERSION_ABSENT"));
  assert.equal(validate(decl()).ok, true);
});

test("P3 · an unknown schema version is refused, whatever its shape", () => {
  for (const v of [0, 2, "1", 1.5, null]) assert.ok(codes(validate(decl(TENANT_N, { schemaVersion: v }))).includes("SCHEMA_VERSION_UNSUPPORTED"), `schema version ${JSON.stringify(v)} was not refused`);
  assert.equal(validate(decl(TENANT_N, { schemaVersion: 1 })).ok, true, "CONTROL");
});

test("P4 · an unknown top-level field is REFUSED, never ignored — and nested unknown fields too", () => {
  assert.deepEqual(codes(validate({ ...decl(), priorityLane: "fast" })), ["UNKNOWN_FIELD"]);
  const nested = decl(); nested.goals[0].hiddenScore = 9;
  assert.deepEqual(codes(validate(nested)), ["GOAL_SHAPE_INVALID"]);
  assert.equal(TOP_LEVEL_FIELDS.length, 15);
  assert.equal(validate(decl()).ok, true, "CONTROL: without the extra field it passes");
});

/* ═══ TENANT ══════════════════════════════════════════════════════════════════ */

test("P5 · an absent tenant is refused — never defaulted to a usual one", () => {
  for (const t of [undefined, null, ""]) {
    const d = decl(); if (t === undefined) delete d.tenantId; else d.tenantId = t;
    const c = codes(validate(d));
    assert.ok(c.includes("TENANT_ABSENT") || c.includes("FIELD_ABSENT"), `absent tenant ${JSON.stringify(t)} was not refused — a usual tenant was supplied`);
  }
  assert.equal(validate(decl()).ok, true, "CONTROL");
});

test("P6 · an unresolved tenant is refused, and an unreadable registry refuses every tenant", () => {
  assert.deepEqual(codes(validate(decl(`tenant:${"c3".repeat(16)}`))), ["TENANT_UNRESOLVED"]);
  assert.deepEqual(codes(validate(decl(), null)), ["TENANT_REGISTRY_UNREADABLE"]);
  assert.deepEqual(codes(validate(decl(TENANT_N, { tenantId: "tenant-shaped-name" }))), ["TENANT_ID_INVALID"]);
  // through the binary: a world whose registry does not declare the tenant
  const w = world({ tenants: [TENANT_A] });
  const r = run(w, "--validate", "--file", file(w, decl()));
  assert.equal(r.json.outcome, "REFUSED");
  assert.ok(r.json.refusals.some((x) => x.code === "TENANT_UNRESOLVED"));
  assert.equal(validate(decl(), [TENANT_N]).ok, true, "CONTROL: a declared tenant resolves");
});

test("P7 · one project cannot cross tenants — CONTROL: the same project in its own tenant moves on", () => {
  const w = world();
  const first = decl(TENANT_A);
  assert.equal(run(w, "--submit", "--file", file(w, first), "--confirm").json.outcome, "ACCEPTED");
  const intruder = decl(TENANT_B, { projectId: first.projectId });
  const r = run(w, "--submit", "--file", file(w, intruder), "--confirm");
  assert.equal(r.json.outcome, "REFUSED", "a project crossed tenants");
  assert.deepEqual(r.json.refusals.map((x) => x.code), ["PROJECT_BELONGS_TO_ANOTHER_TENANT"]);
  const lawful = decl(TENANT_A, { projectId: first.projectId, supersedes: first.declarationId });
  assert.equal(run(w, "--submit", "--file", file(w, lawful), "--confirm").json.outcome, "ACCEPTED");
});

/* ═══ IDENTITY, REPLAY, HISTORY ══════════════════════════════════════════════ */

test("P8 · stable ids round-trip exactly — CONTROL: a malformed id is refused", () => {
  const w = world();
  const d = decl();
  run(w, "--submit", "--file", file(w, d), "--confirm");
  const shown = run(w, "--show", d.declarationId, "--tenant", TENANT_N).json;
  assert.deepEqual([shown.declaration.declarationId, shown.declaration.projectId, shown.declaration.tenantId], [d.declarationId, d.projectId, d.tenantId]);
  const minted = run(w, "--mint-id", "declaration").json.id;
  assert.match(minted, /^decl_[0-9a-f]{32}$/);
  assert.deepEqual(codes(validate(decl(TENANT_N, { declarationId: "declaration-1" }))), ["DECLARATION_ID_INVALID"]);
});

test("P9 · an identical replay is idempotent: no second write, no second project, no new event", () => {
  const w = world();
  const p = file(w, decl());
  assert.equal(run(w, "--submit", "--file", p, "--confirm").json.outcome, "ACCEPTED");
  const before = { store: storeSnapshot(w), events: auditLines().length };
  const again = run(w, "--submit", "--file", p, "--confirm");
  assert.deepEqual([again.json.outcome, again.json.written], ["ALREADY_ACCEPTED", 0]);
  assert.deepEqual(storeSnapshot(w), before.store);
  assert.equal(auditLines().length, before.events);
  // CONTROL: a different declaration of the same project does write
  const next = decl(TENANT_N, { supersedes: JSON.parse(readFileSync(p, "utf8")).declarationId });
  assert.equal(run(w, "--submit", "--file", file(w, next), "--confirm").json.outcome, "ACCEPTED");
  assert.notDeepEqual(storeSnapshot(w), before.store);
});

test("P10 · the same declaration id with changed content is a conflict — CONTROL: identical content is a replay", () => {
  const w = world();
  const d = decl();
  run(w, "--submit", "--file", file(w, d), "--confirm");
  const changed = { ...clone(d), displayName: "a different name, same id" };
  const r = run(w, "--submit", "--file", file(w, changed), "--confirm");
  assert.equal(r.json.outcome, "REFUSED", "the same id with new bytes was accepted — an accepted declaration was rewritten");
  assert.deepEqual(r.json.refusals.map((x) => x.code), ["DECLARATION_ID_CONFLICT"]);
  assert.equal(run(w, "--submit", "--file", file(w, d), "--confirm").json.outcome, "ALREADY_ACCEPTED");
});

test("P11 · an accepted declaration is immutable: superseding it never rewrites its bytes — CONTROL: the current view does move", () => {
  const w = world();
  const d = decl();
  run(w, "--submit", "--file", file(w, d), "--confirm");
  const snap = storeSnapshot(w);
  const subKey = Object.keys(snap).find((k) => k.endsWith(`${d.declarationId}.json`));
  const curKey = Object.keys(snap).find((k) => k.endsWith("current.json"));
  run(w, "--submit", "--file", file(w, decl(TENANT_N, { supersedes: d.declarationId })), "--confirm");
  const after = storeSnapshot(w);
  assert.equal(after[subKey], snap[subKey], "the accepted submission was rewritten");
  assert.notEqual(after[curKey], snap[curKey], "CONTROL: the current view should have moved");
});

test("P12 · supersession creates new history: both remain readable, old SUPERSEDED, new ACCEPTED", () => {
  const w = world();
  const d1 = decl();
  run(w, "--submit", "--file", file(w, d1), "--confirm");
  const d2 = decl(TENANT_N, { supersedes: d1.declarationId });
  run(w, "--submit", "--file", file(w, d2), "--confirm");
  const list = run(w, "--list", "--tenant", TENANT_N).json;
  assert.equal(list.count, 2);
  assert.deepEqual(Object.fromEntries(list.declarations.map((x) => [x.declarationId, x.state])), { [d1.declarationId]: "SUPERSEDED", [d2.declarationId]: "ACCEPTED" });
  assert.equal(run(w, "--show", d1.declarationId, "--tenant", TENANT_N).json.state, "SUPERSEDED");
  // CONTROL: an update WITHOUT naming what it supersedes is refused, not merged
  const d3 = decl();
  const r3 = run(w, "--submit", "--file", file(w, d3), "--confirm").json;
  assert.equal(r3.outcome, "REFUSED", "an update naming nothing it supersedes was accepted — history was overwritten");
  assert.deepEqual(r3.refusals.map((x) => x.code), ["SUPERSESSION_REQUIRED"]);
  assert.deepEqual(run(w, "--submit", "--file", file(w, decl(TENANT_N, { supersedes: d1.declarationId })), "--confirm").json.refusals.map((x) => x.code), ["SUPERSEDES_NOT_CURRENT"]);
});

test("P13 · cross-tenant supersession is refused — CONTROL: the same supersession inside the tenant is accepted", () => {
  const w = world();
  const a = decl(TENANT_A);
  run(w, "--submit", "--file", file(w, a), "--confirm");
  const r = run(w, "--submit", "--file", file(w, decl(TENANT_B, { projectId: `proj_${"e5".repeat(16)}`, supersedes: a.declarationId })), "--confirm");
  assert.equal(r.json.outcome, "REFUSED");
  assert.deepEqual(r.json.refusals.map((x) => x.code), ["SUPERSEDES_UNKNOWN_DECLARATION"]);
  assert.equal(run(w, "--submit", "--file", file(w, decl(TENANT_A, { supersedes: a.declarationId })), "--confirm").json.outcome, "ACCEPTED");
});

test("P14 · exactly one current accepted declaration resolves, and it follows the supersession", () => {
  const w = world();
  const d1 = decl();
  run(w, "--submit", "--file", file(w, d1), "--confirm");
  assert.equal(run(w, "--current", d1.projectId, "--tenant", TENANT_N).json.declaration.declarationId, d1.declarationId, "CONTROL: before");
  const d2 = decl(TENANT_N, { supersedes: d1.declarationId });
  run(w, "--submit", "--file", file(w, d2), "--confirm");
  assert.equal(run(w, "--current", d1.projectId, "--tenant", TENANT_N).json.declaration.declarationId, d2.declarationId);
  const accepted = run(w, "--list", "--tenant", TENANT_N).json.declarations.filter((x) => x.state === "ACCEPTED");
  assert.equal(accepted.length, 1);
});

/* ═══ PUBLIC PROPERTIES ═══════════════════════════════════════════════════════ */

const originCode = (origin) => {
  const d = decl(); d.properties = [{ ...d.properties[0], origin }];
  return codes(validate(d));
};

test("P15 · a malformed origin is refused — CONTROL: a well-formed one passes", () => {
  for (const o of ["not a url", "https://", "https:// spaced.example", "https://bad..example", "https://-lead.example", ""]) assert.ok(originCode(o).some((c) => c.startsWith("ORIGIN_") || c === "PROPERTY_SHAPE_INVALID"), o);
  assert.deepEqual(originCode("https://ok.quillmoor.example"), []);
});

test("P16 · an unsupported scheme is refused", () => {
  for (const o of ["ftp://files.quillmoor.example", "javascript:alert(1)", "file:///etc/hosts", "ws://live.quillmoor.example"]) assert.deepEqual(originCode(o).filter((c) => c.startsWith("ORIGIN_")), ["ORIGIN_SCHEME_UNSUPPORTED"], o);
  assert.deepEqual(originCode("http://plain.quillmoor.example"), [], "CONTROL");
});

test("P17 · embedded credentials are refused — and the firewall names the shape, not the value", () => {
  assert.ok(originCode("https://ringer@bells.quillmoor.example").includes("ORIGIN_EMBEDDED_CREDENTIALS"), "an origin carrying a user was not refused");
  const c = originCode("https://ringer:belfry-f01-plant@bells.quillmoor.example");
  assert.ok(c.includes("ORIGIN_EMBEDDED_CREDENTIALS"));
  assert.ok(c.includes("SECRET_SHAPED_VALUE:URL_WITH_CREDENTIALS"));
  assert.deepEqual(originCode("https://bells.quillmoor.example"), [], "CONTROL");
});

test("P18 · local, loopback, private, link-local and single-label targets are refused as non-public", () => {
  for (const o of ["http://localhost", "http://app.localhost", "http://127.0.0.1", "http://10.1.2.3", "http://172.20.0.1", "http://192.168.1.10", "http://169.254.1.1", "http://100.64.0.1", "http://0.0.0.0", "http://[::1]", "http://[fd00::1]", "http://[fe80::1]", "http://intranet"]) {
    assert.deepEqual(originCode(o).filter((c) => c.startsWith("ORIGIN_")), ["ORIGIN_NOT_PUBLIC_ADDRESS"], o);
  }
  assert.deepEqual(originCode("http://93.184.215.14"), [], "CONTROL: a public address literal passes");
});

test("P19 · a public origin normalises deterministically — CONTROL: a non-default port is kept, a path is refused, not merged", () => {
  assert.deepEqual(normaliseOrigin("HTTPS://Bells.Quillmoor.example:443/"), { ok: true, origin: "https://bells.quillmoor.example" });
  assert.deepEqual(normaliseOrigin("https://bells.quillmoor.example#top"), { ok: true, origin: "https://bells.quillmoor.example" });
  assert.equal(normaliseOrigin("HTTPS://Bells.Quillmoor.example:443/").origin, normaliseOrigin("https://bells.quillmoor.example").origin);
  assert.deepEqual(normaliseOrigin("https://bells.quillmoor.example:8443"), { ok: true, origin: "https://bells.quillmoor.example:8443" });
  assert.deepEqual(normaliseOrigin("https://bells.quillmoor.example/towers"), { ok: false, code: "ORIGIN_HAS_PATH_OR_QUERY" });
  assert.deepEqual(normaliseOrigin("https://bells.quillmoor.example/?q=1"), { ok: false, code: "ORIGIN_HAS_PATH_OR_QUERY" });
  const d = decl(); d.properties[1] = { ...d.properties[1], origin: "https://BELLS.quillmoor.example" };
  assert.deepEqual(codes(validate(d)), ["DUPLICATE_ORIGIN"], "two spellings of one origin are one origin");
});

test("P20 · an environment is NEVER guessed from a hostname — a property must reference a declared one", () => {
  const d = decl();
  d.properties = [{ ...d.properties[0], origin: "https://staging.quillmoor.example", environmentId: "public-register" }];
  const v = validate(d);
  assert.equal(v.ok, true);
  assert.equal(v.normalised.properties[0].environmentId, "public-register", "a 'staging' host did not move the declared environment");
  const missing = decl(); delete missing.properties[0].environmentId;
  assert.ok(codes(validate(missing)).includes("PROPERTY_SHAPE_INVALID"));
  const undeclared = decl(); undeclared.properties[0].environmentId = "production";
  assert.deepEqual(codes(validate(undeclared)), ["PROPERTY_ENVIRONMENT_UNDECLARED"], "CONTROL: a plausible-sounding but undeclared environment is refused");
});

/* ═══ GOALS, PERMISSIONS, CONSTRAINTS, CONNECTORS ═════════════════════════════ */

test("P21 · goal wording is preserved byte for byte as isolated data", () => {
  const w = world();
  const d = decl();
  d.goals[1].wording = "Keep ‘Llanfair’ spelt as the parish spells it —  two spaces, and an em dash.";
  run(w, "--submit", "--file", file(w, d), "--confirm");
  const stored = run(w, "--show", d.declarationId, "--tenant", TENANT_N).json.declaration;
  assert.equal(stored.goals[1].wording, d.goals[1].wording);
  assert.notEqual(stored.goals[1].wording, d.goals[1].wording.replace(/\s+/g, " "), "CONTROL: a whitespace-normalised copy would differ");
});

test("P22 · a goal is never a fact, demand or recommendation: its submission is OBSERVED, its truth NOT_MEASURED", () => {
  const v = validate(decl());
  for (const g of v.normalised.goals) assert.deepEqual(g.evidence, { submission: "OBSERVED", validity: "NOT_MEASURED" });
  assert.ok(!v.normalised.goals.some((g) => ["INFERRED", "RECOMMENDED"].includes(g.evidence.validity) || g.evidence.validity === "OBSERVED"));
  const faked = decl(); faked.goals[0].verified = true;
  assert.deepEqual(codes(validate(faked)), ["GOAL_SHAPE_INVALID"], "a submitter cannot mark a goal verified");
  assert.throws(() => makeEvidenceState("OBSERVED", { assignedBy: "control" }), "CONTROL: the model refuses an OBSERVED state without its evidence");
});

test("P23 · an absent permission is DENIED, never allowed — all ten kinds are present, none GRANTED", () => {
  const d = decl(); d.permissions = [];
  const v = validate(d);
  assert.deepEqual(v.normalised.permissions.map((p) => p.permission), [...PERMISSION_KINDS]);
  assert.ok(v.normalised.permissions.every((p) => p.grantState === "DENIED" && p.grantingAuthority === null), "an absent permission was not DENIED — it was allowed");
  const asked = validate(decl()).normalised.permissions.find((p) => p.permission === "RESEARCH_PUBLIC_PROPERTY");
  assert.equal(asked.grantState, "PENDING", "CONTROL: a requested permission reads PENDING, not DENIED");
});

test("P24 · a requested permission is not a granted one, and a submitter cannot write a grant", () => {
  const v = validate(decl());
  assert.ok(v.normalised.permissions.every((p) => p.grantState !== "GRANTED"));
  const forged = decl(); forged.permissions[0].grantState = "GRANTED";
  assert.deepEqual(codes(validate(forged)), ["SUBMITTER_CANNOT_GRANT"]);
  const forged2 = decl(); forged2.permissions[0].grantedBy = "the submitter";
  assert.deepEqual(codes(validate(forged2)), ["SUBMITTER_CANNOT_GRANT"]);
  assert.equal(validate(decl()).ok, true, "CONTROL");
});

test("P25 · publish/modify is its own permission: crawling does not imply it, and there is no umbrella", () => {
  const d = decl();
  d.permissions = [{ permission: "CRAWL_PUBLIC_PROPERTY", requestedState: "REQUESTED" }];
  const v = validate(d);
  assert.equal(v.normalised.permissions.find((p) => p.permission === "PUBLISH_OR_MODIFY_PROPERTY").grantState, "DENIED");
  const all = decl(); all.permissions = [{ permission: "ALL", requestedState: "REQUESTED" }];
  assert.deepEqual(codes(validate(all)), ["PERMISSION_KIND_UNKNOWN"]);
  const pub = decl(); pub.permissions = [{ permission: "PUBLISH_OR_MODIFY_PROPERTY", requestedState: "REQUESTED" }];
  const pv = validate(pub).normalised.permissions;
  assert.equal(pv.find((p) => p.permission === "PUBLISH_OR_MODIFY_PROPERTY").grantState, "PENDING", "CONTROL");
  assert.equal(pv.find((p) => p.permission === "CRAWL_PUBLIC_PROPERTY").grantState, "DENIED", "and asking to publish grants no crawl");
});

test("P26 · constraints survive the round trip intact — CONTROL: an unknown constraint type is refused, not dropped", () => {
  const w = world();
  const d = decl();
  run(w, "--submit", "--file", file(w, d), "--confirm");
  assert.deepEqual(run(w, "--show", d.declarationId, "--tenant", TENANT_N).json.declaration.constraints, d.constraints);
  const bad = decl(); bad.constraints[0].type = "MOOD";
  assert.deepEqual(codes(validate(bad)), ["CONSTRAINT_TYPE_UNKNOWN"]);
});

test("P27 · a connector stores intent and a REFERENCE only — a value field or a secret value is refused", () => {
  const v = validate(decl());
  assert.deepEqual(Object.keys(v.normalised.connectors[0].configRef).sort(), ["mechanism", "name"]);
  const valued = decl(); valued.connectors[0].configRef.value = "anything";
  assert.deepEqual(codes(validate(valued)), ["CONNECTOR_CONFIG_REF_INVALID"]);
  const keyed = decl(); keyed.connectors[0].apiKey = "x";
  assert.deepEqual(codes(validate(keyed)), ["CONNECTOR_SHAPE_INVALID"]);
  const inline = decl(); inline.connectors[0].intent = "use key AKIAF01PLANTEDFAKE00 please";
  assert.deepEqual(codes(validate(inline)), ["SECRET_SHAPED_VALUE:PROVIDER_KEY_PREFIX"]);
});

/* ═══ SECRETS ═════════════════════════════════════════════════════════════════ */

const PLANTED = "sk-F01PLANTEDFAKEmarkerDoNotUse000000";

test("P28 · a value-shaped secret is refused and REDACTED everywhere — output, audit and store never carry it", () => {
  const w = world();
  const d = decl(); d.goals[1].wording = `reach us with ${PLANTED}`;
  const p = file(w, d);
  assert.ok(readFileSync(p, "utf8").includes(PLANTED), "CONTROL: the planted marker IS in the input");
  const before = auditText();
  for (const mode of [["--validate", "--file", p], ["--submit", "--file", p], ["--submit", "--file", p, "--confirm"]]) {
    const r = run(w, ...mode);
    assert.ok(!r.out.includes(PLANTED) && !r.out.includes(PLANTED.slice(3, 20)), `${mode.join(" ")} printed the secret or a fragment of it`);
    assert.equal(r.json.outcome.endsWith("REFUSED"), true, `${mode.join(" ")}: a secret-shaped value was accepted`);
    assert.ok(r.json.refusals.some((x) => x.code === "SECRET_SHAPED_VALUE:PROVIDER_KEY_PREFIX" && x.path === "$.goals[1].wording"));
  }
  assert.ok(!auditText().slice(before.length).includes(PLANTED.slice(3, 20)), "the audit trail carries the secret");
  assert.ok(!JSON.stringify(storeSnapshot(w)).length || Object.keys(storeSnapshot(w)).every((k) => !readFileSync(join(w, k), "utf8").includes(PLANTED.slice(3, 20))));
  for (const s of ["-----BEGIN RSA PRIVATE KEY-----", "Authorization: Basic cmluZ2VyOmJlbGZyeQ==", "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJlZmFrZQ", "Cookie: sid=abcdef123456", "Server=db;Database=x;Password=hunter22;", "DB_PASSWORD=correcthorsebattery", "gh" + "p_" + "F01plantedFAKEtoken0000000000000000000", "Zq8Lm3Pw9Rt2Yx7Vb4Nc6Kd1Hs5Jg0Fa"]) {
    assert.ok(findSecrets({ x: s }).length > 0, "a detector missed a shape");
  }
});

test("P29 · a harmless label that merely MENTIONS a token passes — shape, not vocabulary", () => {
  const d = decl();
  d.goals[1].wording = "Rotate the analytics token monthly; the password policy is in the handbook; api key requests go to the archivist.";
  d.constraints[2].statement = "No secrets in declarations — tokens live in the vault.";
  assert.equal(validate(d).ok, true);
  assert.equal(validate(NEUTRAL).ok, true, "the fixture's QUILLMOOR_ANALYTICS_READ_TOKEN reference is a name, not a value");
  const d2 = clone(d); d2.goals[1].wording += " password=hunter2hunter2";
  assert.ok(codes(validate(d2)).includes("SECRET_SHAPED_VALUE:SECRET_ASSIGNMENT") && codes(validate(d2)).every((c) => c.startsWith("SECRET_SHAPED_VALUE:")), "CONTROL: the same text with a value in it fails, on its shape");
});

/* ═══ THE ZEROS — each proved by a control through the SAME mechanism ═══════════ */

test("P30 · validate-only writes nothing and records nothing — CONTROL: the SAME file through --submit --confirm writes and records", () => {
  const w = world();
  const p = file(w, decl());
  const before = { store: storeSnapshot(w), events: auditLines().length };
  const r = run(w, "--validate", "--file", p);
  assert.equal(r.json.outcome, "VALID");
  assert.deepEqual([storeSnapshot(w), auditLines().length], [before.store, before.events], "validate-only wrote or recorded something");
  // the SAME validator decides both: an invalid document is refused identically by --validate and --submit
  const bad = file(w, decl(TENANT_N, { schemaVersion: 9 }));
  assert.deepEqual(run(w, "--validate", "--file", bad).json.refusals, run(w, "--submit", "--file", bad).json.refusals);
  const s = run(w, "--submit", "--file", p, "--confirm");
  assert.equal(s.json.written, 2);
  assert.notDeepEqual(storeSnapshot(w), before.store);
  assert.ok(auditLines().length > before.events);
});

test("P31 · submit WITHOUT --confirm writes nothing and records no declaration decision — the write gate's refusal is recorded", () => {
  const w = world();
  const p = file(w, decl());
  const before = { store: storeSnapshot(w), events: auditLines().length, f01: f01Events().length };
  const r = run(w, "--submit", "--file", p);
  assert.deepEqual([r.json.outcome, r.json.written], ["DRY_RUN_ACCEPT", 0]);
  assert.deepEqual(storeSnapshot(w), before.store);
  assert.equal(f01Events().length, before.f01);
  const gate = auditLines().slice(before.events);
  assert.equal(gate.length, 1);
  assert.deepEqual([gate[0].eventType, gate[0].outcome, gate[0].reasonCode], ["GOVERNED_WRITE", "REFUSED", "GOVERNED_WRITE_REFUSED_BY_WRITE_LAW"]);
  assert.equal(run(w, "--submit", "--file", p, "--confirm").json.written, 2, "CONTROL: with --confirm, the same path writes");
});

test("P32 · a confirmed lawful submission writes EXACTLY once: two files, each committed once through the boundary", () => {
  const w = world();
  const before = { store: Object.keys(storeSnapshot(w)).length, events: auditLines().length };
  const d = decl();
  const r = run(w, "--submit", "--file", file(w, d), "--confirm");
  assert.deepEqual([r.json.outcome, r.json.written], ["ACCEPTED", 2]);
  assert.equal(Object.keys(storeSnapshot(w)).length, before.store + 2);
  const writes = auditLines().slice(before.events).filter((e) => e.eventType === "GOVERNED_WRITE");
  assert.deepEqual(writes.map((e) => e.reasonCode).sort(), ["GOVERNED_WRITE_ATTEMPTED", "GOVERNED_WRITE_ATTEMPTED", "GOVERNED_WRITE_COMMITTED", "GOVERNED_WRITE_COMMITTED"].sort());
  assert.ok(writes.every((e) => e.scopeType === "TENANT" && e.tenantId === TENANT_N));
});

test("P33 · a refusal leaves the accepted store byte-identical — CONTROL: a lawful supersession changes it", () => {
  const w = world();
  const d = decl();
  run(w, "--submit", "--file", file(w, d), "--confirm");
  const snap = storeSnapshot(w);
  for (const bad of [decl(TENANT_N, { schemaVersion: 7 }), decl(TENANT_N, { supersedes: null }), { ...clone(d), displayName: "same id, other bytes" }, decl(TENANT_B, { projectId: d.projectId })]) {
    assert.equal(run(w, "--submit", "--file", file(w, bad), "--confirm").json.outcome, "REFUSED");
    assert.deepEqual(storeSnapshot(w), snap);
  }
  run(w, "--submit", "--file", file(w, decl(TENANT_N, { supersedes: d.declarationId })), "--confirm");
  assert.notDeepEqual(storeSnapshot(w), snap);
});

test("P34 · a missing declaration root fails CLOSED — nothing is written anywhere", () => {
  const w = world({ root: false });
  const r = run(w, "--submit", "--file", file(w, decl()), "--confirm");
  assert.deepEqual(r.json.refusals.map((x) => x.code), ["DECLARATION_ROOT_MISSING"]);
  assert.equal(existsSync(join(w, "declarations")), false);
  const ok = world();
  assert.equal(run(ok, "--submit", "--file", file(ok, decl()), "--confirm").json.outcome, "ACCEPTED", "CONTROL");
});

test("P35 · an ambiguous declaration root fails CLOSED — CONTROL: either root alone is accepted", () => {
  const w1 = world();
  const w2 = world();
  const p = file(w1, decl());
  assert.deepEqual(run([w1, w2], "--submit", "--file", p, "--confirm").json.refusals.map((x) => x.code), ["DECLARATION_ROOT_AMBIGUOUS"]);
  assert.deepEqual([storeSnapshot(w1), storeSnapshot(w2)].map((s) => Object.keys(s).length), [1, 1], "only the markers exist");
  const unmarked = world({ root: false });
  assert.equal(run([w1, unmarked], "--submit", "--file", p, "--confirm").json.outcome, "REFUSED", "two tenancy registries are themselves ambiguous");
});

/* ═══ TENANT ISOLATION OF READS ═══════════════════════════════════════════════ */

test("P36 · listing one tenant never shows another tenant's declarations", () => {
  const w = world();
  const a = decl(TENANT_A);
  run(w, "--submit", "--file", file(w, a), "--confirm");
  assert.equal(run(w, "--list", "--tenant", TENANT_B).json.count, 0);
  assert.equal(run(w, "--list", "--tenant", TENANT_A).json.count, 1, "CONTROL");
  assert.equal(run(w, "--list").json.outcome, "USAGE_REFUSED", "no tenant, no list");
});

test("P37 · inspecting across tenants learns nothing: another tenant's id answers exactly like an unknown one", () => {
  const w = world();
  const a = decl(TENANT_A);
  run(w, "--submit", "--file", file(w, a), "--confirm");
  const cross = run(w, "--show", a.declarationId, "--tenant", TENANT_B).json;
  const unknown = run(w, "--show", `decl_${"0".repeat(32)}`, "--tenant", TENANT_B).json;
  assert.equal(cross.outcome, "NOT_FOUND_IN_TENANT", "a cross-tenant inspection returned another tenant's declaration");
  assert.deepEqual(cross, unknown);
  assert.equal(run(w, "--current", a.projectId, "--tenant", TENANT_B).json.outcome, "NO_CURRENT_DECLARATION_IN_TENANT");
  assert.equal(run(w, "--show", a.declarationId, "--tenant", TENANT_A).json.outcome, "FOUND", "CONTROL");
});

/* ═══ F06, F08, F07 ═══════════════════════════════════════════════════════════ */

test("P38 · declaration workflow states and F06 evidence states are disjoint, and intake writes no evidence-state transition", () => {
  assert.deepEqual(DECLARATION_STATES.filter((s) => EVIDENCE_STATES.includes(s)), []);
  assert.deepEqual([...DECLARATION_STATES, "UNKNOWN"].filter((s) => EVIDENCE_STATES.includes(s)), ["UNKNOWN"], "CONTROL: the check sees an overlap when there is one");
  const w = world();
  const before = auditLines().length;
  run(w, "--submit", "--file", file(w, decl()), "--confirm");
  assert.equal(auditLines().slice(before).filter((e) => e.eventType === "EVIDENCE_STATE_TRANSITION").length, 0);
});

test("P39 · F08 records each governed declaration transition EXACTLY once — and a replay records none", () => {
  const w = world();
  const d1 = decl();
  const t0 = auditLines().length;
  run(w, "--submit", "--file", file(w, d1), "--confirm");
  const moves = (from) => auditLines().slice(from).filter((e) => e.eventType === "DECLARATION_DECISION").map((e) => `${e.metadata.from}>${e.metadata.to}:${e.metadata.declarationId === d1.declarationId ? "d1" : "d2"}`);
  assert.deepEqual(moves(t0), ["SUBMITTED>VALIDATED:d1", "VALIDATED>ACCEPTED:d1"], "a transition was recorded other than exactly once");
  const t1 = auditLines().length;
  run(w, "--submit", "--file", file(w, d1), "--confirm");
  assert.deepEqual(moves(t1), [], "a replay recorded a transition");
  const d2 = decl(TENANT_N, { supersedes: d1.declarationId });
  run(w, "--submit", "--file", file(w, d2), "--confirm");
  assert.deepEqual(moves(t1), ["SUBMITTED>VALIDATED:d2", "VALIDATED>ACCEPTED:d2", "ACCEPTED>SUPERSEDED:d1"]);
  const t2 = auditLines().length;
  run(w, "--submit", "--file", file(w, decl(TENANT_N, { schemaVersion: 5 })), "--confirm");
  assert.deepEqual(auditLines().slice(t2).filter((e) => e.eventType === "DECLARATION_DECISION").map((e) => `${e.metadata.from}>${e.metadata.to}`), ["SUBMITTED>REFUSED"], "CONTROL: a refusal records its own movement");
  assert.equal(auditClassOf({ eventType: "DECLARATION_DECISION" }), "GOVERNED_CHANGE");
});

test("P40 · clean read-only inspection emits no durable event — CONTROL: a submission through the same binary does", () => {
  const w = world();
  const d = decl();
  run(w, "--submit", "--file", file(w, d), "--confirm");
  const before = auditText();
  run(w, "--show", d.declarationId, "--tenant", TENANT_N);
  run(w, "--list", "--tenant", TENANT_N);
  run(w, "--current", d.projectId, "--tenant", TENANT_N);
  run(w, "--validate", "--file", file(w, decl()));
  run(w, "--inventory");
  run(w, "--show", d.declarationId, "--tenant", TENANT_A);
  assert.equal(auditText(), before, "a read appended to the trail");
  run(w, "--submit", "--file", file(w, decl(TENANT_N, { supersedes: d.declarationId })), "--confirm");
  assert.notEqual(auditText(), before);
});

test("P41 · F07's firewall stays intact: the held-out firewall passes on this tree and appends nothing", () => {
  const r = spawnSync(process.execPath, [join(REPO, "bin", "heldout-firewall.mjs"), "--check"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout.split("\n").filter((l) => l.includes("🔴")).join("\n"));
  assert.match(r.stdout, /AUDIT \(whole run\) — appended to the audit trail: 0 /);
  assert.match(r.stdout, /FAILURES: 0/);
});

/* ═══ NEUTRALITY, ORPHANS, POPULATIONS ═════════════════════════════════════════ */

const INTAKE_FILES = ["src/intake/contract.mjs", "src/intake/secrets.mjs", "src/intake/origin.mjs", "src/intake/store.mjs", "src/intake/intake.mjs", "src/intake/legacy.mjs", "bin/project-intake.mjs"];
const LEAK = [/["'`]https?:\/\/[a-z0-9]/i, /["'`][a-z0-9-]+(\.[a-z0-9-]+)*\.(com|org|net|io|dev|co|uk|ai|app|example)["'`]/i, /quillmoor|ropewalk/i];

test("P42 · the generic intake source contains no client, product, host or fixture vocabulary", () => {
  const hits = [];
  for (const f of INTAKE_FILES) {
    readFileSync(join(REPO, f), "utf8").split("\n").forEach((l, i) => { const t = l.trim(); if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) return; for (const re of LEAK) if (re.test(l)) hits.push(`${f}:${i + 1}`); });
  }
  assert.deepEqual(hits, []);
  assert.ok(LEAK.every((re) => ['const o = "https://bells.quillmoor.example";', "const h = 'ropewalk-b.example';"].some((c) => re.test(c))), "CONTROL: each pattern matches a planted line");
});

test("P43 · no production intake module is orphaned: every one is reachable from the production entry point", () => {
  const reach = new Set();
  const visit = (rel) => {
    if (reach.has(rel)) return;
    reach.add(rel);
    const src = readFileSync(join(REPO, rel), "utf8");
    for (const m of src.matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)) {
      const target = join(rel, "..", m[1]).split("\\").join("/");
      if (target.startsWith("src/intake/") || target.startsWith("bin/")) visit(target);
    }
  };
  visit("bin/project-intake.mjs");
  const modules = readdirSync(join(REPO, "src", "intake")).map((f) => `src/intake/${f}`);
  assert.deepEqual(modules.filter((m) => !reach.has(m)), []);
  assert.deepEqual([...modules, "src/intake/unreferenced.mjs"].filter((m) => !reach.has(m)), ["src/intake/unreferenced.mjs"], "CONTROL: an unreferenced module is found");
});

test("P43b · the decision recorder can reach nothing but the audit store it is handed: its module holds no filesystem write primitive", () => {
  const FS_WRITE = /\b(writeFileSync|appendFileSync|mkdirSync|rmSync|renameSync|unlinkSync|createWriteStream|cpSync|copyFileSync)\(/;
  for (const f of ["src/intake/intake.mjs", "src/intake/contract.mjs", "src/intake/store.mjs", "src/intake/legacy.mjs", "src/intake/origin.mjs", "src/intake/secrets.mjs"]) {
    assert.equal(FS_WRITE.test(readFileSync(join(REPO, f), "utf8")), false, `${f} holds a filesystem write primitive`);
  }
  assert.equal(FS_WRITE.test("writeFileSync(p, x)"), true, "CONTROL: the pattern sees a write primitive");
});

test("P44 · population arithmetic: every registry record accounted for, remainder zero — synthetic always, real where declared", () => {
  const w = world({ tenants: [TENANT_A, TENANT_B, TENANT_N], attachments: [
    { kind: "SITE_ORIGIN", ref: "https://ropewalk-a.example", tenant: TENANT_A },
    { kind: "SITE_ORIGIN", ref: "https://ropewalk-b.example", tenant: TENANT_B },
    { kind: "CRAWL_BATCH", ref: "batch-1", tenant: TENANT_B },
    { kind: "SITE_ORIGIN", ref: "https://orphan.example", tenant: `tenant:${"d4".repeat(16)}` },
  ] });
  const inv = legacyTenancyCandidates(createTenantResolver({ env: { ...process.env, ALMIVISIBILITY_SUBJECT_ROOTS: w } }).declarations);
  const sites = inv.candidates.reduce((n, c) => n + c.properties.length, 0);
  const excluded = inv.candidates.reduce((n, c) => n + c.excludedAttachments.length, 0);
  assert.deepEqual([inv.tenantRecords, inv.activeTenants, inv.attachmentRecords, sites, excluded, inv.attachmentsNamingNoActiveTenant], [3, 3, 4, 2, 1, 1]);
  assert.equal(inv.attachmentRecords - sites - excluded - inv.attachmentsNamingNoActiveTenant, 0, "remainder");
  assert.equal(inv.tenantRecords - inv.candidates.length - inv.inactiveOrInvalidTenants, 0, "remainder");
  assert.ok(inv.candidates.every((c) => c.outcome === "REFUSED" && c.refusalCodes.includes("FIELD_ABSENT")), "legacy input is refused with its absences named, never completed");
  assert.equal(legacyTenancyCandidates({ readable: false, reason: "X" }).readable, false, "CONTROL: an unreadable registry is NOT a zero");
  const real = createTenantResolver({ env: process.env }).declarations;
  if (real.readable) {
    const r = legacyTenancyCandidates(real);
    const rs = r.candidates.reduce((n, c) => n + c.properties.length, 0);
    const rx = r.candidates.reduce((n, c) => n + c.excludedAttachments.length, 0);
    assert.equal(r.attachmentRecords - rs - rx - r.attachmentsNamingNoActiveTenant, 0, "real remainder");
    assert.equal(r.tenantRecords - r.candidates.length - r.inactiveOrInvalidTenants, 0, "real tenant remainder");
  } else {
    test.diagnostic(`real tenancy registry NOT MEASURED here (${real.reason}); the committed census carries it`);
  }
});

test("P45 · a NEW unrelated neutral declaration passes the production path with no source change", () => {
  const w = world();
  const r = run(w, "--submit", "--file", file(w, NEUTRAL), "--confirm");
  assert.equal(r.json.outcome, "ACCEPTED", JSON.stringify(r.json));
  const stored = run(w, "--show", NEUTRAL.declarationId, "--tenant", TENANT_N).json.declaration;
  assert.equal(stored.properties[0].origin, "https://bells.quillmoor.example");
  assert.equal(stored.properties[1].origin, "https://rehearsal.bells.quillmoor.example:8443");
  assert.deepEqual(stored.environments, NEUTRAL.environments);
  const src = [...readdirSync(join(REPO, "src"), { recursive: true })].filter((f) => String(f).endsWith(".mjs")).map((f) => readFileSync(join(REPO, "src", String(f)), "utf8")).join("\n");
  for (const word of ["quillmoor", "bell foundry", "tower register", "rehearsal copy"]) assert.ok(!src.toLowerCase().includes(word), `generic source knows "${word}"`);
  assert.ok(JSON.stringify(NEUTRAL).toLowerCase().includes("quillmoor"), "CONTROL: the words ARE in the declaration");
  assert.ok(!["neutral-test-ferments", "neutral-test-knots"].some((n) => JSON.stringify(NEUTRAL).includes(n)), "the third declaration reuses an earlier fixture");
});

/* ═══ REGRESSION AND THE ACCEPTANCE ═══════════════════════════════════════════ */

test("P47 · F40 stays BLOCKED and the historical 61/38 ledger is untouched", () => {
  assert.deepEqual([DECLARED.F40.state, DECLARED.F40.blocker], ["BLOCKED-BY-AUTHORITY", "UNIVERSAL_350_WORD_FLOOR_STILL_APPLICABLE"]);
  const h = sha(readFileSync(join(REPO, "src/checklist/classification.mjs"), "utf8").split("\r\n").join("\n"));
  assert.equal(h, "149f936256debdc4b74b7298f707f48371d26ec4380a9f58f74254c6e9d9a65d");
});

test("P48 · the COMPLETE F01 acceptance: pinned, CURRENT, re-derived — and one changed word is ACCEPTANCE_TAMPERED", () => {
  const acc = ACCEPTANCES.F01;
  assert.equal(acc.contractSha256, "5d7ddb4c6d37a3d96cbc8ce65797eb20f3119816a20084c9176aa089b5d80ccb");
  assert.equal(acc.ruling.sha256, "eb445a1e4c856519bdcb0380b5d152633b40d1e52911344a981915afbb3749de");
  assert.equal(contractSha256(acc), acc.contractSha256);
  assert.equal(acc.ruling.sha256, AUTHORITY_CORPUS.find((r) => r.propositionId === "F01_FROZEN_ACCEPTANCE").contentHash);
  const tampered = { ...ACCEPTANCES, F01: { ...acc, expected: acc.expected.replace("refuses ambiguous", "accepts ambiguous") } };
  assert.notEqual(tampered.F01.expected, acc.expected, "the control word was not present");
  const board = buildBoard(CAPABILITIES, DECLARED).map((r) => (r.featureId === "F01" ? { ...r, state: "ACCEPTANCE-FROZEN", events: [{ kind: "ACCEPTANCE_FROZEN", on: "2026-09-24", ruling: acc.ruling, contractSha256: acc.contractSha256 }] } : r));
  assert.ok(boardErrors(board, { capabilities: CAPABILITIES, acceptances: tampered }).some((e) => e.code === "ACCEPTANCE_TAMPERED" && e.id === "F01"));
  assert.deepEqual(boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).filter((e) => e.id === "F01"), [], "CONTROL: the untampered acceptance validates");
});

test("P48b · a declaration decision is taken under the CURRENT ruling — a superseded one is never applied", () => {
  const real = AUTHORITY_CORPUS.find((r) => r.propositionId === "F01_FROZEN_ACCEPTANCE");
  const newer = { ...real, authorityId: "synthetic:f01-newer-ruling", issuedAt: "2026-09-25", effectiveFrom: "2026-09-25", contentHash: "e".repeat(64), recordedAt: "2026-09-25T00:00:00Z" };
  assert.equal(intakeAuthority({ now: "2026-09-26", records: [...AUTHORITY_CORPUS, newer] }).authorityHash, "e".repeat(64), "SUPERSEDED_AUTHORITY_APPLIED: the older ruling governed a declaration decision");
  assert.equal(intakeAuthority({ now: "2026-09-24" }).authorityHash, real.contentHash, "CONTROL: today the frozen acceptance governs");
});
