/**
 * 🔴 F03 · SUBJECT ROOT AND CONNECTOR REGISTRY — every clause of the frozen acceptance, each proof with a CONTROL that fires.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F03_FROZEN_ACCEPTANCE_2026-09-25.md (f9d1888, contract 4a65924a…).
 *
 * Test names carry the clause they prove (C1…C9, P). The sabotage harness (test/helpers/f03-sabotage.mjs) aims each defect
 * at ONE named test here and requires it to turn RED for the intended reason.
 *
 * Refusal outcomes are reported in F02's vocabulary (SAME_TENANT_ALLOWED / CROSS_TENANT_REFUSED / UNDECLARED_REFUSED /
 * AMBIGUOUS_REFUSED / SCOPE_MISMATCH_REFUSED / …). Worlds built here are disposable temp roots: every one of their
 * declarations is written by the test and named as such; nothing here reads or writes the real declarations except to READ
 * the real population.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep, isAbsolute, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { createTenantResolver, rootIndexFor, RESOURCE_KINDS } from "../src/tenancy/resolver.mjs";
import { readRootIndex, lookupSubject, lookupStore, lookupConnector, validateRegistry, declaredSubjectIds, REGISTRY_FILE } from "../src/tenancy/root-registry.mjs";
import { decideForTenant, resolveSide, isGenuineDecision, scopeRefusalEvent, scopeResolutionEvent } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { openConnector, ConnectorRefused, NO_REQUEST_FETCH } from "../src/tenancy/connectors.mjs";
import { subjectIndex, resolveSubject, importSubjectModule, subjectRoots, SUBJECT_ROOTS_ENV } from "../src/subject-roots.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { decideScopedRun } from "../src/governance/scoped-entry.mjs";
import { governedGuardSink, resolveAuditStoreLocation } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { censusOf, productionFiles } from "../tools/root-connector-census.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { authorise } from "../src/governance/authorisation.mjs";
import { subjectScope } from "./support/subjects.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NO_NETWORK = pathToFileURL(join(REPO, "test", "support", "no-network.mjs")).href;
const TA = `tenant:${"a1".repeat(16)}`;
const TB = `tenant:${"b2".repeat(16)}`;

/* ── the REAL population ────────────────────────────────────────────────────────────────────────────────────────── */
const REAL = createTenantResolver();
const INDEX = REAL.roots;
const ACTIVE = REAL.declarations.readable ? REAL.declarations.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId) : [];
const SUBJECTS = declaredSubjectIds(INDEX);
const EXTERNAL = SUBJECTS.filter((id) => lookupSubject(INDEX, id).rootKind === "external");
/** The tenant a subject's OWN members resolve to (never requested — read through the one decision's side resolution). */
const ownTenant = (resolve, id) => { const s = resolveSide(resolve, RESOURCES.subject(id)); return s.state === "RESOLVED" ? s.tenantId : null; };

/* ── disposable worlds ───────────────────────────────────────────────────────────────────────────────────────────── */
const worlds = [];
test.after(() => { for (const w of worlds) rmSync(w, { recursive: true, force: true }); });
/** A temp external root: tenancy (tenants + attachments), a root registry, and the directories it names. */
function world({ tenants = [TA, TB], attachments = [], registry = null, dirs = [], rawRegistry = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "f03-world-"));
  worlds.push(dir);
  mkdirSync(join(dir, "tenancy"), { recursive: true });
  writeFileSync(join(dir, "tenancy", "tenants.json"), JSON.stringify({ schemaVersion: 1, tenants: tenants.map((tenantId) => ({ schemaVersion: 1, tenantId, status: "ACTIVE", declaredOn: "2026-09-25", declarationBasis: "F03_TEST_WORLD", label: "f03 test scope" })) }));
  writeFileSync(join(dir, "tenancy", "attachments.json"), JSON.stringify({ schemaVersion: 1, attachments: attachments.map(([resourceKind, resourceRef, tenantId]) => ({ schemaVersion: 1, resourceKind, resourceRef, tenantId, declaredOn: "2026-09-25", declarationBasis: "F03_TEST_WORLD" })) }));
  for (const d of dirs) mkdirSync(join(dir, ...d.split("/")), { recursive: true });
  if (registry) writeFileSync(join(dir, REGISTRY_FILE), JSON.stringify({ schemaVersion: 1, kind: "ROOT_REGISTRY", stores: [], subjects: [], ...registry }));
  if (rawRegistry !== null) writeFileSync(join(dir, REGISTRY_FILE), rawRegistry);
  const env = { ...process.env, [SUBJECT_ROOTS_ENV]: dir };
  return { dir, env, resolve: () => createTenantResolver({ env }) };
}
const subjectEntry = (subjectId, members, connectors = []) => ({ subjectId, path: subjectId, members: members.map(([resourceKind, resourceRef]) => ({ resourceKind, resourceRef })), connectors });
const connectorEntry = (connectorId, kind, reaches, credential = null) => ({ connectorId, kind, credential, reaches: reaches.map(([resourceKind, resourceRef]) => ({ resourceKind, resourceRef })) });
const run = (decisions, authorisations = []) => ({ decisions: decisions.map((decision) => ({ label: "t", decision })), authorisations });
/* F04: the genuine decision to open one connector, for the declared automation actor, over the tenant F02 resolved. */
const openAuth = (tenantId, subjectId, kind) => authorise({ actorRef: "actor:cc", action: `OPEN_CONNECTOR_${kind}`, scope: { scopeType: "TENANT", tenantId }, resourceRef: `${subjectId}#${kind}` });

/* ═══ C1 · AUTHORITY ONLY FROM A COMMITTED DECLARATION — nothing else creates a root or a connector ═══ */

test("F03 · C1a · a directory holding a descriptor is NOT a subject until a registry declares it", () => {
  const w = world({ dirs: ["probe"] });
  writeFileSync(join(w.dir, "probe", "product.mjs"), `export const PRODUCT = { productId: "probe" };\n`);
  const roots = subjectRoots(w.env);
  assert.equal(lookupSubject(rootIndexFor(w.env), "probe").state, "UNDECLARED", "a present directory with a product.mjs created a subject");
  assert.throws(() => resolveSubject("probe", { roots }), /SUBJECT_UNDECLARED/);
  // CONTROL: the same directory, declared, is a subject
  writeFileSync(join(w.dir, REGISTRY_FILE), JSON.stringify({ schemaVersion: 1, kind: "ROOT_REGISTRY", stores: [], subjects: [subjectEntry("probe", [])] }));
  assert.equal(lookupSubject(rootIndexFor(w.env), "probe").state, "DECLARED");
});

test("F03 · C1b · a store directory that is present but undeclared is refused — declared, it is found", () => {
  const w = world({ dirs: ["captures/capture-0001", "observations"] });
  assert.equal(lookupStore(rootIndexFor(w.env), "CAPTURES").state, "UNDECLARED", "a present captures/ directory created a store");
  assert.equal(lookupStore(rootIndexFor(w.env), "OBSERVATIONS").state, "UNDECLARED");
  // CONTROL
  writeFileSync(join(w.dir, REGISTRY_FILE), JSON.stringify({ schemaVersion: 1, kind: "ROOT_REGISTRY", stores: [{ store: "CAPTURES", path: "captures" }], subjects: [] }));
  const s = lookupStore(rootIndexFor(w.env), "CAPTURES");
  assert.equal(s.state, "DECLARED");
  assert.equal(s.dir, join(w.dir, "captures"));
});

test("F03 · C1c · a descriptor claiming a fact registry its declaration does not is refused — the matching one loads", async () => {
  const [id] = EXTERNAL;
  assert.ok(id, "no external subject declared — the real population is empty");
  // CONTROL first: the real descriptor, whose factsDir IS a declared member, loads
  const p = await productFromArgv([`--product=${id}`], { scope: subjectScope(id) });
  assert.equal(p.productId, id);
  /* The same subject in a relocated copy whose declaration names a DIFFERENT fact registry as its member — attached to the
   * same tenant, so the decision itself is ALLOWED and the descriptor IS read. Its own factsDir then claims a registry the
   * declaration does not name, and that claim must be refused. (A child process: the descriptor registers its product, and
   * a registry refuses a second registration in one process.) */
  const copy = mkdtempSync(join(tmpdir(), "f03-claim-"));
  worlds.push(copy);
  cpSync(lookupSubject(INDEX, id).rootPath, copy, { recursive: true, filter: (s) => !s.split(sep).includes(".git") });
  const reg = JSON.parse(readFileSync(join(copy, REGISTRY_FILE), "utf8"));
  const e = reg.subjects.find((s) => s.subjectId === id);
  const other = `${e.members.find((m) => m.resourceKind === "FACT_REGISTRY").resourceRef}-other`;
  e.members = [{ resourceKind: "FACT_REGISTRY", resourceRef: other }];
  writeFileSync(join(copy, REGISTRY_FILE), JSON.stringify(reg));
  const att = JSON.parse(readFileSync(join(copy, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ schemaVersion: 1, resourceKind: "FACT_REGISTRY", resourceRef: other, tenantId: ownTenant(REAL, id), declaredOn: "2026-09-25", declarationBasis: "F03_TEST_WORLD" });
  writeFileSync(join(copy, "tenancy", "attachments.json"), JSON.stringify(att));
  const script = join(mkdtempSync(join(tmpdir(), "f03-claim-run-")), "claim.mjs");
  worlds.push(join(script, ".."));
  const url = (f) => JSON.stringify(pathToFileURL(join(REPO, f)).href);
  writeFileSync(script, [
    `const { productFromArgv } = await import(${url("src/product-cli.mjs")});`,
    `const { censusSubjectScope } = await import(${url("src/tenancy/scoped-run.mjs")});`,
    `const scope = censusSubjectScope(${JSON.stringify(id)});`,
    `console.log("DECISION " + scope.decisions[0].decision.outcome);`,
    `try { await productFromArgv(["--product=${id}"], { scope }); console.log("LOADED"); } catch (err) { console.log("REFUSED " + err.message); }`,
  ].join("\n"));
  const r = spawnSync(process.execPath, [script], { cwd: REPO, encoding: "utf8", timeout: 60_000, env: { ...process.env, [SUBJECT_ROOTS_ENV]: copy } });
  assert.match(r.stdout, /DECISION SAME_TENANT_ALLOWED/, `the claim world's decision was not allowed, so the claim check was never reached${r.stderr}`);
  assert.match(r.stdout, /REFUSED .*DESCRIPTOR_CLAIMS_UNDECLARED_MEMBER/, r.stdout + r.stderr);
});

test("F03 · C1d · an attached host creates no connector — only a declared connector exists", () => {
  const origin = "https://c1d.invalid";
  const w = world({ attachments: [["SITE_ORIGIN", origin, TA], ["FACT_REGISTRY", "s/facts", TA]], registry: { subjects: [subjectEntry("s", [["FACT_REGISTRY", "s/facts"]])] }, dirs: ["s"] });
  const d = decideForTenant(w.resolve(), TA, RESOURCES.connector("s", "PUBLIC_SITE"));
  assert.equal(d.outcome, "UNDECLARED_REFUSED", "a host attachment created a connector");
  assert.match(d.reason, /NO_CONNECTOR_OF_THIS_KIND_DECLARED/);
  // CONTROL: declared, the same connector resolves
  writeFileSync(join(w.dir, REGISTRY_FILE), JSON.stringify({ schemaVersion: 1, kind: "ROOT_REGISTRY", stores: [], subjects: [subjectEntry("s", [["FACT_REGISTRY", "s/facts"]], [connectorEntry("site", "PUBLIC_SITE", [["SITE_ORIGIN", origin]])])] }));
  assert.equal(decideForTenant(w.resolve(), TA, RESOURCES.connector("s", "PUBLIC_SITE")).outcome, "SAME_TENANT_ALLOWED");
});

test("F03 · C1e · no default root: with no registry nothing resolves, and an unreadable registry is UNKNOWN — never empty", () => {
  const none = world({ dirs: ["almost-a-subject"] });
  const idx = rootIndexFor(none.env);
  assert.equal(idx.state, "READ");
  assert.deepEqual(declaredSubjectIds(idx).filter((id) => lookupSubject(idx, id).rootKind === "external"), [], "a subject appeared in a root that declares none");
  assert.equal(decideForTenant(none.resolve(), TA, RESOURCES.subject("almost-a-subject")).outcome, "UNDECLARED_REFUSED");
  const broken = world({ rawRegistry: "{ not json" });
  assert.equal(rootIndexFor(broken.env).state, "UNKNOWN");
  assert.equal(decideForTenant(broken.resolve(), TA, RESOURCES.subject("anything")).outcome, "UNKNOWN_REFUSED");
  // CONTROL: the real index reads, and declares subjects
  assert.equal(INDEX.state, "READ");
  assert.ok(EXTERNAL.length > 0);
});

test("F03 · C1f · the real declarations are byte-identical to their committed form (the index blob; HEAD in CI)", () => {
  const present = INDEX.registries.filter((r) => r.present);
  assert.ok(present.length >= 2, "fewer than two registries were read — the population is not the real one");
  for (const r of present) {
    const root = subjectRoots().find((x) => x.id === r.rootId);
    const top = execFileSync("git", ["-C", root.path, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const rel = relative(top, join(root.path, REGISTRY_FILE)).split(sep).join("/");
    const committed = execFileSync("git", ["-C", top, "show", `:${rel}`], { maxBuffer: 1 << 24 });
    assert.ok(Buffer.compare(committed, r.bytes) === 0, `${r.rootId}'s registry read differs from its committed form`);
    // CONTROL: a one-byte change is detected by the same comparison
    const changed = Buffer.from(r.bytes); changed[0] = changed[0] ^ 0x20;
    assert.notEqual(Buffer.compare(committed, changed), 0);
  }
});

/* ═══ C2 · ONE RESOLUTION, BEFORE ANY READ OR CONNECT ═══ */

test("F03 · C2a · a subject's module is read only on a genuine decision — refused without, refused on a forgery, read with", async () => {
  const [id] = EXTERNAL;
  await assert.rejects(() => importSubjectModule(id, "product.mjs"), /SUBJECT_NOT_RESOLVED/);
  const forged = Object.freeze({ outcome: "SAME_TENANT_ALLOWED", allowed: true, reason: "X", source: {}, target: { resourceKind: "SUBJECT_ROOT", resourceRefDigest: "0".repeat(16) } });
  assert.equal(isGenuineDecision(forged), false);
  await assert.rejects(() => importSubjectModule(id, "product.mjs", { decision: forged }), /SUBJECT_NOT_RESOLVED/);
  // a genuine decision about ANOTHER subject does not open this one
  const other = SUBJECTS.find((s) => s !== id);
  await assert.rejects(() => importSubjectModule(id, "product.mjs", { decision: subjectScope(other).decisions[0].decision }), /SUBJECT_NOT_RESOLVED/);
  // CONTROL
  const decision = subjectScope(id).decisions[0].decision;
  assert.equal(decision.outcome, "SAME_TENANT_ALLOWED");
  assert.ok(await importSubjectModule(id, "product.mjs", { decision }));
});

test("F03 · C2b · a connector is constructed only on a genuine decision; a dry run's fetch refuses every request", async () => {
  const [id] = EXTERNAL;
  assert.throws(() => openConnector({ scope: run([]), subjectId: id, kind: "CITED_SOURCES" }), (e) => e instanceof ConnectorRefused && e.code === "CONNECTOR_NOT_RESOLVED");
  const t = ownTenant(REAL, id);
  const refused = decideForTenant(REAL, ACTIVE.find((x) => x !== t), RESOURCES.connector(id, "CITED_SOURCES"));
  assert.throws(() => openConnector({ scope: run([refused]), subjectId: id, kind: "CITED_SOURCES" }), (e) => e.code === "CONNECTOR_NOT_RESOLVED");
  await assert.rejects(() => NO_REQUEST_FETCH("https://c2b.invalid/"), (e) => e.code === "A_DRY_RUN_ISSUES_NO_REQUEST");
  // F04: F02's allow alone is not permission — without the actor's authorisation the connector is refused
  const ok = decideForTenant(REAL, t, RESOURCES.connector(id, "CITED_SOURCES"));
  assert.throws(() => openConnector({ scope: run([ok]), subjectId: id, kind: "CITED_SOURCES" }), (e) => e.code === "CONNECTOR_NOT_AUTHORISED");
  // CONTROL
  const c = openConnector({ scope: run([ok], [openAuth(t, id, "CITED_SOURCES")]), subjectId: id, kind: "CITED_SOURCES" });
  assert.equal(c.kind, "CITED_SOURCES");
  assert.equal(typeof c.fetch, "function");
});

test("F03 · C2c · census: every root-locating, subject-reading and connection-constructing site resolves first — 0 BYPASS, and the zero FIRES", () => {
  const files = productionFiles().map((file) => ({ file, text: readFileSync(join(REPO, file), "utf8") }));
  const { sites } = censusOf(files);
  const bypass = sites.filter((s) => s.cls === "BYPASS");
  assert.deepEqual(bypass.map((s) => `${s.kind} ${s.file}:${s.line}`), [], "a site constructs, reads or locates without resolving first");
  const count = (k) => sites.filter((s) => s.kind === k).length;
  assert.ok(count("CONNECTION") > 0 && count("FETCH_IMPL") > 0 && count("CONNECTOR") > 0 && count("SUBJECT_READ") > 0 && count("ROOT") > 0, "a site kind has an empty population — the zero would prove nothing");
  // CONTROL: one stand-in per BYPASS class is counted; a lawful twin is not
  const standIns = censusOf([
    { file: "bin/s1.mjs", text: "const r = await fetch('https://x.invalid/');\n" },
    { file: "bin/s2.mjs", text: "await crawl({ fetchImpl: someFetch });\n" },
    { file: "bin/s3.mjs", text: "const CONNECTOR = openConnector({ scope: SCOPE });\nconst SCOPE = scopedEntryPoint({ resources: [RESOURCES.connector(ID, 'PUBLIC_SITE')] });\n" },
    { file: "bin/s4.mjs", text: "const P = await productFromArgvOrExit(process.argv, { usage: 'u' });\n" },
    { file: "src/s5.mjs", text: "const roots = subjectRoots(env);\n" },
    { file: "bin/twin.mjs", text: "const SCOPE = scopedEntryPoint({ resources: [RESOURCES.subject(ID), RESOURCES.connector(ID, 'PUBLIC_SITE')] });\nconst P = await productFromArgvOrExit(process.argv, { usage: 'u', scope: SCOPE });\nconst CONNECTOR = openConnector({ scope: SCOPE, subjectId: ID, kind: 'PUBLIC_SITE' });\nawait crawl({ fetchImpl: CONNECTOR.fetch });\n" },
  ]).sites;
  assert.deepEqual([...new Set(standIns.filter((s) => s.cls === "BYPASS").map((s) => s.file))].sort(), ["bin/s1.mjs", "bin/s2.mjs", "bin/s3.mjs", "bin/s4.mjs", "src/s5.mjs"]);
  assert.equal(standIns.filter((s) => s.file === "bin/twin.mjs" && s.cls === "BYPASS").length, 0);
});

test("F03 · C2d · an entry point refused on its subject exits 3 and reads nothing — CONTROL: its own tenant runs", () => {
  const [id] = EXTERNAL;
  const t = ownTenant(REAL, id);
  const other = ACTIVE.find((x) => x !== t);
  /* F04: both runs name the declared actor, so exit 3 is the subject's scope and exit 0 is a fully decided run. */
  const refused = spawnSync(process.execPath, ["bin/facts.mjs", "census", `--product=${id}`, `--tenant=${other}`, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", timeout: 60_000 });
  assert.equal(refused.status, 3, refused.stderr);
  assert.match(refused.stderr, /subject data root\s+CROSS_TENANT_REFUSED/);
  assert.doesNotMatch(refused.stdout, /records|census/i, "the refused run printed subject data");
  const ok = spawnSync(process.execPath, ["bin/facts.mjs", "census", `--product=${id}`, `--tenant=${t}`, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", timeout: 60_000 });
  assert.equal(ok.status, 0, ok.stderr);
});

test("F03 · C2e · an entry point refused on its connector constructs nothing and asks for no network — exit 3", () => {
  const [id] = EXTERNAL;
  const t = ownTenant(REAL, id);
  const other = ACTIVE.find((x) => x !== t);
  const r = spawnSync(process.execPath, ["--import", NO_NETWORK, "bin/quote-match.mjs", `--product=${id}`, `--tenant=${other}`], { cwd: REPO, encoding: "utf8", timeout: 60_000 });
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stderr, /connector CITED_SOURCES\s+CROSS_TENANT_REFUSED/);
  assert.doesNotMatch(r.stderr, /\[no-network\] refused/, "the refused run asked for the network");
});

/* ═══ C3 · INSIDE F02'S ONE DECISION — never a second decision, never beyond it ═══ */

test("F03 · C3a · every real subject × every active tenant: the subject decision equals F02's decisions over its declared members", () => {
  let n = 0;
  for (const id of SUBJECTS) {
    const members = lookupSubject(INDEX, id).entry.members;
    for (const t of ACTIVE) {
      const d = decideForTenant(REAL, t, RESOURCES.subject(id));
      const f02 = members.length > 0 && members.every((m) => decideForTenant(REAL, t, { ...m, scopeClass: "TENANT" }).allowed);
      assert.equal(d.allowed, f02, `${id} × ${t.slice(0, 15)}…: the subject decision (${d.outcome}) disagrees with F02 over its members`);
      n += 1;
    }
  }
  assert.equal(n, SUBJECTS.length * ACTIVE.length);
  assert.ok(n > 0);
});

test("F03 · C3b · every real connector × every active tenant: allowed exactly when its subject and every reach are allowed", () => {
  let n = 0, allowed = 0;
  for (const id of SUBJECTS) for (const c of lookupSubject(INDEX, id).entry.connectors) for (const t of ACTIVE) {
    const d = decideForTenant(REAL, t, RESOURCES.connector(id, c.kind));
    const f02 = decideForTenant(REAL, t, RESOURCES.subject(id)).allowed && c.reaches.length > 0 && c.reaches.every((r) => decideForTenant(REAL, t, { ...r, scopeClass: "TENANT" }).allowed);
    assert.equal(d.allowed, f02, `${id}/${c.kind} × tenant: ${d.outcome}`);
    n += 1; if (d.allowed) allowed += 1;
  }
  assert.ok(n > 0, "no real connector is declared — the equivalence proved nothing");
  assert.ok(allowed > 0, "no real connector is allowed for any tenant");
});

test("F03 · C3c · a registry cannot name a tenant, so it cannot disagree with F02 — a tenant field is refused", () => {
  const withTenant = { schemaVersion: 1, kind: "ROOT_REGISTRY", stores: [], subjects: [{ ...subjectEntry("s", [["FACT_REGISTRY", "s/facts"]]), tenantId: TA }] };
  assert.equal(validateRegistry(withTenant, { resourceKinds: RESOURCE_KINDS }).ok, false);
  assert.ok(validateRegistry(withTenant, { resourceKinds: RESOURCE_KINDS }).refusals.some((r) => r.code === "SUBJECT_SHAPE_INVALID"));
  // CONTROL
  assert.equal(validateRegistry({ ...withTenant, subjects: [subjectEntry("s", [["FACT_REGISTRY", "s/facts"]])] }, { resourceKinds: RESOURCE_KINDS }).ok, true);
});

test("F03 · C3d · members spanning tenants make a subject AMBIGUOUS; a reach into another tenant makes a connector AMBIGUOUS — CONTROL: one tenant is allowed", () => {
  const w = world({
    attachments: [["FACT_REGISTRY", "s/facts", TA], ["FACT_REGISTRY", "s/extra", TB], ["SITE_ORIGIN", "https://a.invalid", TA], ["SITE_ORIGIN", "https://b.invalid", TB]],
    registry: { subjects: [
      subjectEntry("span", [["FACT_REGISTRY", "s/facts"], ["FACT_REGISTRY", "s/extra"]]),
      subjectEntry("one", [["FACT_REGISTRY", "s/facts"]], [connectorEntry("far", "PUBLIC_SITE", [["SITE_ORIGIN", "https://b.invalid"]]), connectorEntry("near", "CITED_SOURCES", [["FACT_REGISTRY", "s/facts"]])]),
    ] },
    dirs: ["span", "one"],
  });
  const r = w.resolve();
  const span = decideForTenant(r, TA, RESOURCES.subject("span"));
  assert.equal(span.outcome, "AMBIGUOUS_REFUSED", "a subject whose members belong to two tenants was not refused AMBIGUOUS");
  const far = decideForTenant(r, TA, RESOURCES.connector("one", "PUBLIC_SITE"));
  assert.equal(far.outcome, "AMBIGUOUS_REFUSED", "a connector reaching another tenant's resource was not refused");
  assert.equal(decideForTenant(r, TA, RESOURCES.subject("one")).outcome, "SAME_TENANT_ALLOWED");
  assert.equal(decideForTenant(r, TA, RESOURCES.connector("one", "CITED_SOURCES")).outcome, "SAME_TENANT_ALLOWED");
  assert.equal(decideForTenant(r, TB, RESOURCES.subject("one")).outcome, "CROSS_TENANT_REFUSED");
});

/* ═══ C4 · FAIL CLOSED, WITH A REASON AND WITHOUT A PAYLOAD ═══ */

test("F03 · C4a · undeclared, ambiguous, scope-mismatched, cross-tenant and unreadable each refuse with a machine-readable reason", () => {
  const w = world({ attachments: [["FACT_REGISTRY", "s/facts", TA]], registry: { subjects: [subjectEntry("s", [["FACT_REGISTRY", "s/facts"]])] }, dirs: ["s"] });
  const twin = world({ attachments: [["FACT_REGISTRY", "s/facts", TA]], registry: { subjects: [subjectEntry("s", [["FACT_REGISTRY", "s/facts"]])] }, dirs: ["s"] });
  const both = { ...process.env, [SUBJECT_ROOTS_ENV]: [w.dir, twin.dir].join(process.platform === "win32" ? ";" : ":") };
  /* the ambiguous world holds two declaration sources as well, which F02 itself refuses as UNKNOWN; a root registry naming
   * the same subject twice under ONE declaration source is the ambiguity F03 owns — built by moving twin's tenancy away */
  rmSync(join(twin.dir, "tenancy"), { recursive: true, force: true });
  const cases = [
    ["UNDECLARED_REFUSED", decideForTenant(w.resolve(), TA, RESOURCES.subject("nobody"))],
    ["AMBIGUOUS_REFUSED", decideForTenant(createTenantResolver({ env: both }), TA, RESOURCES.subject("s"))],
    ["SCOPE_MISMATCH_REFUSED", decideForTenant(w.resolve(), TA, { ...RESOURCES.subject("s"), scopeClass: "SUBJECT" })],
    ["CROSS_TENANT_REFUSED", decideForTenant(w.resolve(), TB, RESOURCES.subject("s"))],
    ["UNKNOWN_REFUSED", decideForTenant(world({ rawRegistry: "[]" }).resolve(), TA, RESOURCES.subject("s"))],
  ];
  for (const [want, d] of cases) {
    assert.equal(d.outcome, want, `${want}: got ${d.outcome} (${d.reason})`);
    assert.match(String(d.reason), /^[A-Z][A-Z0-9_]+$/, `${want} refused without a machine-readable reason`);
    assert.equal(d.allowed, false);
  }
  // CONTROL
  assert.equal(decideForTenant(w.resolve(), TA, RESOURCES.subject("s")).outcome, "SAME_TENANT_ALLOWED");
});

test("F03 · C4b · a decision and its audit events carry no tenant id, host, path, credential name or payload", () => {
  const w = declaredWorld();
  try {
    const r = createTenantResolver({ env: w.envWith() });
    const decisions = [
      decideForTenant(r, w.tenantId, RESOURCES.connector(w.subject, "SEARCH_CONSOLE_API")),
      decideForTenant(r, w.tenantId, RESOURCES.subject(w.subject)),
      decideForTenant(r, TB, RESOURCES.connector(w.subject, "PUBLIC_SITE")),
      decideForTenant(r, w.tenantId, RESOURCES.connector("nobody", "PUBLIC_SITE")),
    ];
    const events = decisions.map((d) => (d.allowed ? scopeResolutionEvent(d) : scopeRefusalEvent(d)));
    const text = JSON.stringify({ decisions, events });
    for (const leak of [w.tenantId, TB, "tenant:", "https://", w.root, REPO, "GSC_SERVICE_ACCOUNT_KEY_FILE", w.subject, "fixture-world.invalid"]) {
      assert.ok(!text.includes(leak), `a decision or event carried ${leak.slice(0, 40)}`);
    }
    // CONTROL: the decisions really span allowed and refused, and the events really are the recorded shape
    assert.deepEqual(decisions.map((d) => d.allowed), [true, true, false, false]);
    assert.deepEqual(events.map((e) => e.eventType), ["SCOPE_RESOLUTION", "SCOPE_RESOLUTION", "REFUSAL", "REFUSAL"]);
  } finally { w.cleanup(); }
});

test("F03 · C4c · every root refusal message is free of filesystem paths", () => {
  const w = world({ registry: { subjects: [subjectEntry("ghost", [])] } });
  const twin = world({ registry: { subjects: [subjectEntry("t", [])] }, dirs: ["t"] });
  const twin2 = world({ registry: { subjects: [subjectEntry("t", [])] }, dirs: ["t"] });
  const messages = [];
  const grab = (f) => { try { f(); } catch (e) { messages.push(e.message); } };
  grab(() => subjectIndex({ roots: [{ id: "w", kind: "external", path: w.dir }] }));
  grab(() => subjectIndex({ roots: [{ id: "a", kind: "external", path: twin.dir }, { id: "b", kind: "external", path: twin2.dir }] }));
  grab(() => subjectIndex({ roots: [{ id: "gone", kind: "external", path: join(w.dir, "nowhere") }] }));
  grab(() => resolveSubject("nobody", { roots: [{ id: "w", kind: "external", path: twin.dir }] }));
  assert.equal(messages.length, 4, "a refusal did not happen");
  for (const m of messages) for (const p of [w.dir, twin.dir, twin2.dir, tmpdir()]) assert.ok(!m.includes(p), `a refusal carried a private path: ${m}`);
  for (const m of messages) assert.match(m, /^[A-Z][A-Z0-9_]+: /, `a refusal carried no reason code: ${m}`);
});

/* ═══ C5 · A CREDENTIAL IS NAMED, NEVER HELD ═══ */

test("F03 · C5a · a registry holding a secret-shaped value is refused whole — a credential named by env reference is accepted", () => {
  const base = { schemaVersion: 1, kind: "ROOT_REGISTRY", stores: [], subjects: [subjectEntry("s", [["FACT_REGISTRY", "s/facts"]], [connectorEntry("api", "SEARCH_CONSOLE_API", [["SITE_ORIGIN", "https://s.invalid"]], { mechanism: "ENV_REFERENCE", name: "S_KEY_FILE" })])] };
  assert.equal(validateRegistry(base, { resourceKinds: RESOURCE_KINDS }).ok, true, "CONTROL: a named credential was refused");
  const leaked = JSON.parse(JSON.stringify(base));
  leaked.subjects[0].connectors[0].connectorId = "api";
  leaked.subjects[0].path = "s";
  leaked.subjects[0].members[0].resourceRef = "Bearer abcdefghijklmnopqrstuvwxyz0123456789";
  const v = validateRegistry(leaked, { resourceKinds: RESOURCE_KINDS });
  assert.equal(v.ok, false, "a secret-shaped value was accepted into the registry");
  assert.ok(v.refusals.some((r) => /^SECRET_SHAPED_VALUE:/.test(r.code)));
  assert.ok(!JSON.stringify(v).includes("abcdefghijklmnop"), "the refusal carried the secret");
  const w = world({ rawRegistry: JSON.stringify(leaked) });
  assert.equal(rootIndexFor(w.env).state, "UNKNOWN", "an index over a secret-bearing registry was used");
  // a credential given as a value in place of a name is refused
  const valued = JSON.parse(JSON.stringify(base));
  valued.subjects[0].connectors[0].credential = { mechanism: "ENV_REFERENCE", name: "not a name" };
  assert.equal(validateRegistry(valued, { resourceKinds: RESOURCE_KINDS }).ok, false);
});

test("F03 · C5b · an opened connector carries the credential's NAME only — never its value", () => {
  const w = declaredWorld();
  const name = "GSC_SERVICE_ACCOUNT_KEY_FILE";
  const prev = process.env[name];
  const sentinel = `sk-${"F03SENTINELvalue".repeat(2)}`;
  process.env[name] = sentinel;
  try {
    const r = createTenantResolver({ env: w.envWith() });
    const d = decideForTenant(r, w.tenantId, RESOURCES.connector(w.subject, "SEARCH_CONSOLE_API"));
    const c = openConnector({ scope: run([d], [openAuth(w.tenantId, w.subject, "SEARCH_CONSOLE_API")]), subjectId: w.subject, kind: "SEARCH_CONSOLE_API", resolve: r });
    assert.equal(c.credentialName, name, "CONTROL: the connector does not name its credential");
    assert.ok(!JSON.stringify(c).includes(sentinel) && !Object.values(c).some((v) => v === sentinel), "the connector carried the credential's value");
    assert.ok(!JSON.stringify(scopeResolutionEvent(d)).includes(name), "the resolution event carried the credential name");
  } finally {
    if (prev === undefined) delete process.env[name]; else process.env[name] = prev;
    w.cleanup();
  }
});

/* ═══ C6 · AUDITABLE THROUGH THE GOVERNED WRITE PATH ═══ */

test("F03 · C6a · a resolution and a refusal are each recorded through the governed guard sink — a refused run records no resolution", () => {
  const loc = resolveAuditStoreLocation({ repo: REPO });
  assert.equal(loc.synthetic, true, "not a verified test context — this would write production");
  const lines = () => (existsSync(loc.eventsPath) ? readFileSync(loc.eventsPath, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  const [id] = EXTERNAL;
  const t = ownTenant(REAL, id);
  const now = isoSeconds(Date.now());
  const sink = () => governedGuardSink({ repo: REPO, correlationId: `run:f03-c6a:${now}:${process.pid}:${Math.random()}`, now: now.slice(0, 10), actor: "test/f03-root-connector-registry.test.mjs" });
  const before = lines().length;
  const ok = decideScopedRun({ argv: [`--tenant=${t}`], resolve: REAL, resources: [RESOURCES.subject(id), RESOURCES.connector(id, "CITED_SOURCES")], sink: sink(), log: () => {} });
  assert.equal(ok.allowed, true);
  const afterOk = lines();
  const added = afterOk.slice(before);
  assert.deepEqual(added.map((e) => `${e.eventType}:${e.action}:${e.outcome}`), ["SCOPE_RESOLUTION:RESOLVE_SUBJECT_ROOT:ALLOWED", "SCOPE_RESOLUTION:RESOLVE_CONNECTOR:ALLOWED"], "the resolutions were not each recorded durably, once");
  const refused = decideScopedRun({ argv: [`--tenant=${ACTIVE.find((x) => x !== t)}`], resolve: REAL, resources: [RESOURCES.subject(id), RESOURCES.connector(id, "CITED_SOURCES")], sink: sink(), log: () => {} });
  assert.equal(refused.allowed, false);
  const added2 = lines().slice(afterOk.length);
  assert.ok(added2.length === 2 && added2.every((e) => e.eventType === "REFUSAL" && e.outcome === "REFUSED"), "a refusal was not recorded, or a refused run recorded a resolution");
  // every one of them passed the store's own validation (it is the governed audit store) and carries a hash chain link
  for (const e of [...added, ...added2]) assert.match(e.eventHash, /^[0-9a-f]{64}$/);
});

/* ═══ C7 · PORTABLE — THE SAME DECLARATION IN TWO GENUINELY DIFFERENT ENVIRONMENTS ═══ */

const gitBlob = (bytes) => createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex");
/** The outcome of every real subject and connector for every active tenant — a digest that must not move with the machine. */
function outcomesDigest(resolve, index) {
  const tenants = resolve.declarations.readable ? resolve.declarations.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId) : [];
  const rows = [];
  for (const id of declaredSubjectIds(index)) {
    for (const t of tenants) rows.push(`${id}|${t}|SUBJECT|${decideForTenant(resolve, t, RESOURCES.subject(id)).outcome}`);
    for (const c of lookupSubject(index, id).entry.connectors) for (const t of tenants) rows.push(`${id}|${t}|${c.kind}|${decideForTenant(resolve, t, RESOURCES.connector(id, c.kind)).outcome}`);
  }
  return { rows: rows.length, digest: createHash("sha256").update(rows.sort().join("\n")).digest("hex") };
}

test("F03 · C7a · the real declaration resolves HERE, by relative paths only — fingerprint printed for the cross-environment comparison", (t) => {
  const external = subjectRoots().filter((r) => r.kind === "external");
  const out = outcomesDigest(REAL, INDEX);
  for (const id of SUBJECTS) {
    const l = lookupSubject(INDEX, id);
    assert.ok(!isAbsolute(l.entry.path) && !l.entry.path.includes("\\") && !l.entry.path.includes(":"), `${id}'s declared path is not relative`);
    assert.equal(l.dir, join(l.rootPath, ...l.entry.path.split("/")), "a resolution did not come from its root plus its declared relative path");
  }
  const fingerprint = {
    environment: process.env.GITHUB_ACTIONS === "true" ? "ci" : "local",
    platform: process.platform,
    externalRootLocation: external.map((r) => createHash("sha256").update(r.path).digest("hex").slice(0, 12)),
    registryBlobs: INDEX.registries.filter((r) => r.present).map((r) => `${r.rootId}:${gitBlob(r.bytes).slice(0, 12)}`),
    subjects: SUBJECTS.length,
    connectors: SUBJECTS.reduce((n, id) => n + lookupSubject(INDEX, id).entry.connectors.length, 0),
    outcomeRows: out.rows,
    outcomeDigest: out.digest.slice(0, 16),
  };
  console.log(`F03-R7-FINGERPRINT ${JSON.stringify(fingerprint)}`);
  t.diagnostic(`F03-R7-FINGERPRINT ${JSON.stringify(fingerprint)}`);
  assert.ok(out.rows > 0 && fingerprint.registryBlobs.length >= 2);
});

test("F03 · C7b · the resolution modules hold no environment branch", () => {
  const ENV_BRANCH = /process\.env|process\.platform|GITHUB_ACTIONS|\bos\.platform\(|\bplatform\(\)/;
  for (const f of ["src/tenancy/root-registry.mjs", "src/tenancy/connectors.mjs", "src/tenancy/scope.mjs"]) {
    const code = readFileSync(join(REPO, f), "utf8").split(/\r?\n/).filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l));
    assert.deepEqual(code.filter((l) => ENV_BRANCH.test(l)), [], `${f} branches on its environment`);
  }
  // CONTROL: the pattern sees a real environment read where there is one
  assert.ok(readFileSync(join(REPO, "src/subject-roots.mjs"), "utf8").split(/\r?\n/).some((l) => ENV_BRANCH.test(l)));
});

test("F03 · C7c · supplementary: a relocated COPY of the real root resolves identically (a test-made copy — it does not count toward R7)", () => {
  const external = subjectRoots().find((r) => r.kind === "external");
  const copy = mkdtempSync(join(tmpdir(), "f03-relocated-"));
  worlds.push(copy);
  cpSync(external.path, copy, { recursive: true, filter: (s) => !s.split(sep).includes(".git") });
  const env = { ...process.env, [SUBJECT_ROOTS_ENV]: copy };
  const r = createTenantResolver({ env });
  assert.equal(outcomesDigest(r, r.roots).digest, outcomesDigest(REAL, INDEX).digest, "the same declaration resolved differently when its root moved");
  // CONTROL: a changed declaration in the copy DOES change the digest
  const reg = JSON.parse(readFileSync(join(copy, REGISTRY_FILE), "utf8"));
  reg.subjects[0].connectors = [];
  writeFileSync(join(copy, REGISTRY_FILE), JSON.stringify(reg));
  const r2 = createTenantResolver({ env });
  assert.notEqual(outcomesDigest(r2, r2.roots).digest, outcomesDigest(REAL, INDEX).digest);
});

/* ═══ C8 · NO SUBJECT IDENTITY IN SHARED CODE ═══ */

test("F03 · C8 · the shared resolution code holds no subject id, host or credential name the real registry declares", () => {
  const names = new Set();
  for (const id of EXTERNAL) {
    names.add(id);
    for (const c of lookupSubject(INDEX, id).entry.connectors) {
      for (const r of c.reaches) if (r.resourceKind === "SITE_ORIGIN") names.add(new URL(r.resourceRef).hostname);
      if (c.credential) names.add(c.credential.name);
    }
  }
  assert.ok(names.size > 0, "nothing to look for — the check would be vacuous");
  const files = ["src/tenancy/root-registry.mjs", "src/tenancy/connectors.mjs", "src/tenancy/scope.mjs", "src/tenancy/scoped-run.mjs", "src/subject-roots.mjs", "src/product-cli.mjs", "tools/root-connector-census.mjs"];
  for (const f of files) {
    const code = readFileSync(join(REPO, f), "utf8").split(/\r?\n/).filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join("\n");
    for (const n of names) assert.ok(!code.includes(n), `${f} names a subject identity from the registry`);
  }
});

/* ═══ C9 · USEFUL SUBJECT-OWNED BEHAVIOUR IS KEPT ═══ */

test("F03 · C9 · every connection entry point runnable today still resolves its connector for its subject's tenant", async () => {
  const { loadSubjectPackage } = await import("../src/subject-package.mjs");
  const kindsIn = (f) => [...readFileSync(join(REPO, f), "utf8").matchAll(/RESOURCES\.connector\([^,]+,\s*"([A-Z_]+)"\)/g)].map((m) => m[1]);
  const [id] = EXTERNAL;
  const t = ownTenant(REAL, id);
  /* The two that ran before F03 on the real declarations: their subject is the real external subject — by --product for
   * quote-match, by its own package's declared subject for the corpus builder. */
  const pkg = (await loadSubjectPackage(id)).subjectId;
  const runnable = [["bin/quote-match.mjs", id], ["subjects/almi-oet/tools/build-corpus.mjs", pkg]];
  for (const [f, subject] of runnable) {
    const kinds = kindsIn(f);
    assert.ok(kinds.length > 0, `${f} names no connector`);
    for (const k of kinds) assert.equal(decideForTenant(REAL, t, RESOURCES.connector(subject, k)).outcome, "SAME_TENANT_ALLOWED", `${f}'s ${k} connector no longer resolves — behaviour was lost`);
  }
});

/* ═══ P · THE REAL POPULATION, WITH ITS ARITHMETIC ═══ */

test("F03 · P · the real declarations: every subject, store and connector counted, every subject × tenant decided — remainder 0", (t) => {
  const stores = [...INDEX.stores.keys()].sort();
  const external = EXTERNAL.length, fixtures = SUBJECTS.filter((id) => lookupSubject(INDEX, id).rootKind === "fixtures").length;
  const connectors = SUBJECTS.reduce((n, id) => n + lookupSubject(INDEX, id).entry.connectors.length, 0);
  const tally = {};
  for (const id of SUBJECTS) for (const tn of ACTIVE) { const o = decideForTenant(REAL, tn, RESOURCES.subject(id)).outcome; tally[o] = (tally[o] ?? 0) + 1; }
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const line = `F03-POPULATION subjects ${SUBJECTS.length} = ${external} external + ${fixtures} fixtures · stores ${stores.length} (${stores.join(", ")}) · connectors ${connectors} · subject×tenant ${total} = ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(" + ")} · remainder ${SUBJECTS.length * ACTIVE.length - total}`;
  console.log(line);
  t.diagnostic(line);
  assert.equal(SUBJECTS.length, external + fixtures);
  assert.equal(total, SUBJECTS.length * ACTIVE.length);
  assert.ok(external > 0 && connectors > 0 && stores.length === 4, "the real population is empty");
  assert.equal(tally.SAME_TENANT_ALLOWED, external, "each real subject should be allowed for exactly its own tenant");
});
