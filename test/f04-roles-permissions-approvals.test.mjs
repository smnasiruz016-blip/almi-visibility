/**
 * 🔴 F04 · ROLES, PERMISSIONS AND APPROVALS — every frozen clause and every clarification, each with its opposite verdict.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F04_ACCEPTANCE_2026-09-25.md (b439309 · sha256 8d50f03f… · contract 2a2a98bf…).
 *
 * REAL POPULATIONS are the declared actors, the registered actions, the recorded approval registry (the owner's §3 advance
 * approval, transcribed from the F04 command), the git-tracked entry points (tools/authorisation-census.mjs) and the
 * committed audit trail. A test marked FIXTURE hands the decision an invented permission set or approval registry: it
 * proves a REFUSAL BRANCH and nothing else (clarification 14) — no real-population requirement rests on one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { ACTORS, ACTOR_CLASSES, ACTIONS, ACTION_PATTERNS, FAMILIES, FAMILY_RULES, PERMISSIONS } from "../config/governance/authorisation.mjs";
import {
  authorise, readApprovals, actionEntry, namedActor, namedApproval, authorisationEvent, isGenuineAuthorisation,
  AUTHORISATION_OUTCOMES, AUTHORISATION_REFUSED_EXIT, APPROVALS_FILE,
} from "../src/governance/authorisation.mjs";
import { approvalFaults, governanceFaults } from "../src/governance/approval-registry.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { stagedReplaceAdapter } from "../src/governance/durability-adapters.mjs";
import { auditClassOf, durableGuardSink, diagnosticGuardSink } from "../src/governance/guard-audit.mjs";
import { authoriseScopedRun, runAuthorisationRequests } from "../src/governance/scoped-entry.mjs";
import { createAuditStore, isoSeconds } from "../src/audit-trail/store.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { openConnector, ConnectorRefused } from "../src/tenancy/connectors.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createPaidProviderGate, createKillSwitch, createFakePaidProvider, PaidCallRefused, paidProviderRef } from "../src/cost/paid-provider-gate.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { ACCEPTANCES, F04_ORIGINAL } from "../config/fboard/acceptances.mjs";
import { authorisationCensus, actionSitesOf, unfalsifiablePatterns, routeOf } from "../tools/authorisation-census.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NOW = "2026-09-25T12:00:00Z";
const TENANT = "tenant:00000000000000000000000000000f02";
const G = { scopeType: "GLOBAL_PRODUCT" };
const T = { scopeType: "TENANT", tenantId: TENANT };
const REAL_APPROVAL = "approval:f04-engine-pr-merge-2026-09-25";
const PR = "almi-visibility:pull-request:head=f04-roles-permissions-approvals:base=main";
const REGISTERED = "WRITE_FACTS_CENSUS";
const scratch = () => { mkdirSync(join(REPO, ".test-scratch"), { recursive: true }); return mkdtempSync(join(REPO, ".test-scratch", "f04-")); };
const rel = (p) => p.slice(REPO.length).split("\\").join("/");
const quiet = () => {};

/* FIXTURE builders — a permission set or approval registry handed to the decision; a refusal branch only. */
const P = (role, family, resourceClass, scopeType, effect, extra = {}) => ({ role, family, resourceClass, scopeType, effect, ...extra });
const registry = (...approvals) => ({ readable: true, events: approvals.length, approvals: new Map(approvals.map((a) => [a.approvalId, { revoked: false, consumed: false, ...a }])) });
/* The REAL §3 record as it was ISSUED (history's first line) — the complete shape the validator checks, varied per case. */
const issued = () => JSON.parse(readFileSync(join(REPO, APPROVALS_FILE), "utf8").split("\n").filter(Boolean)[0]).approval;
const recorded = (over = {}) => ({ ...issued(), ...over });
const approval = (over = {}) => ({
  approvalId: "approval:fixture", approverRef: "actor:owner", approverClass: "HUMAN", executorRef: "actor:cc", executorClass: "AUTOMATION",
  action: "MERGE_PULL_REQUEST", resource: { resourceClass: "PULL_REQUEST", resourceRef: "fixture#pr" }, scope: { scopeType: "GLOBAL_PRODUCT", tenantId: null },
  decision: "APPROVED", oneUse: true, expiresAt: null, ...over,
});

/* ═══ EXPECTED — the ONE decision, and every named failure fails closed ═══════════════════════════════════════════ */

test("EXPECTED · one decision establishes identity class, role, scope, permission, approval and separation — a fully authorised action proceeds (REAL registry)", () => {
  const d = authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, resourceRef: "runs/x", now: NOW });
  assert.equal(d.outcome, "AUTHORISED");
  assert.deepEqual([d.actorClass, d.family, d.resourceClass, d.scopeType], ["AUTOMATION", "GOVERNED_STATE", "GENERATED_REPORT", "GLOBAL_PRODUCT"]);
  assert.ok(isGenuineAuthorisation(d));
  assert.equal(isGenuineAuthorisation({ ...d }), false, "a copy of a decision authorises nothing");
});

test("EXPECTED · missing identity, missing role, insufficient scope, missing approval, expired approval, conflicting duty and unsupported action each FAIL CLOSED with their own outcome", () => {
  const cases = {
    IDENTITY_MISSING: authorise({ actorRef: null, action: REGISTERED, scope: G, now: NOW }),
    ROLE_MISSING: authorise({ actorRef: "actor:engine", action: REGISTERED, scope: G, now: NOW }), // REAL: the SYSTEM actor holds no role
    SCOPE_UNRESOLVED: authorise({ actorRef: "actor:cc", action: "READ_PROTECTED_TENANT_DATA", scope: { scopeType: "TENANT" }, now: NOW }),
    APPROVAL_MISSING: authorise({ actorRef: "actor:cc", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: PR, now: NOW }), // REAL
    APPROVAL_EXPIRED: authorise({ actorRef: "actor:cc", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: "fixture#pr", approvalRef: "approval:fixture", now: NOW }, { approvals: registry(approval({ oneUse: false, expiresAt: "2026-09-25T00:00:00Z" })) }), // FIXTURE
    SELF_APPROVAL: authorise({ actorRef: "actor:owner", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: PR, approvalRef: REAL_APPROVAL, now: NOW }), // REAL: the owner executing his own approval
    ACTION_UNSUPPORTED: authorise({ actorRef: "actor:cc", action: "PUBLISH_ANYTHING", scope: G, now: NOW }),
  };
  for (const [want, d] of Object.entries(cases)) { assert.equal(d.outcome, want, want); assert.equal(d.allowed, false, want); }
  assert.equal(new Set(Object.values(cases).map((d) => d.outcome)).size, 7, "two named failures collapsed into one outcome");
});

test("EXPECTED · fail closed BEFORE protected data is read — a real scoped entry point without an actor exits 5 and reads nothing; CONTROL: with the actor it reads", () => {
  const W = declaredWorld();
  try {
    const bare = spawnSync(process.execPath, ["bin/export.mjs", `--tenant=${W.tenantId}`], { cwd: REPO, encoding: "utf8", env: W.envWith(), timeout: 120_000 });
    assert.equal(bare.status, AUTHORISATION_REFUSED_EXIT, `the refused run exited ${bare.status}, not 5: ${bare.stderr.slice(-300)}`);
    assert.match(bare.stderr, /AUTHORISATION REFUSED — READ_PROTECTED_TENANT_DATA: IDENTITY_MISSING/);
    assert.doesNotMatch(bare.stdout, /STATES CARRIED THROUGH|would have written/, "the refused run read and reported the evidence store");
    const ok = spawnSync(process.execPath, ["bin/export.mjs", ...W.argv([])], { cwd: REPO, encoding: "utf8", env: W.envWith(), timeout: 120_000 });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /STATES CARRIED THROUGH/);
  } finally { W.cleanup(); }
});

test("EXPECTED · fail closed BEFORE state changes — the boundary refuses an undeclared actor with no ATTEMPTED and no byte written; CONTROL: the declared actor commits", () => {
  const dir = scratch();
  try {
    const store = createAuditStore({ eventsPath: join(dir, "e.jsonl"), headPath: join(dir, "h.json") });
    const audit = { store, actor: "engine", actorType: "ENGINE", softwareVersion: "engine:test", correlationId: "run:f04", authorityRef: { propositionId: "P", scope: ["T"] }, authorityHash: "d".repeat(64) };
    const run = (actorRef, name) => {
      const adapter = stagedReplaceAdapter({ repo: REPO, repoRelativeTarget: rel(join(dir, name)), targetClass: "REPOSITORY_FILE", bytes: "x\n" });
      return executeGovernedWrite({ permission: { mayWrite: true, reason: "T", actorRef }, audit, adapter, onAuthorisationRefused: quiet,
        action: { name: REGISTERED, scopeType: "GLOBAL_PRODUCT", occurredAt: isoSeconds(Date.now()), occurrenceFingerprint: adapter.occurrenceFingerprint, evidenceRefs: [] } });
    };
    const r = run("actor:somebody", "refused.txt");
    assert.deepEqual([r.outcome, r.authorisation], ["REFUSED", "IDENTITY_UNDECLARED"]);
    assert.equal(existsSync(join(dir, "refused.txt")), false, "a refused write left bytes");
    assert.deepEqual(store.readAll().events.map((e) => `${e.eventType}:${e.metadata.governedWritePhase ?? e.outcome}`), ["AUTHORISATION_DECISION:REFUSED", "GOVERNED_WRITE:REFUSED"], "the mutation began, or the decision was not recorded first");
    const ok = run("actor:cc", "committed.txt");
    assert.equal(ok.outcome, "COMMITTED");
    assert.equal(readFileSync(join(dir, "committed.txt"), "utf8"), "x\n");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("EXPECTED · fail closed BEFORE remote work begins — F02's allow alone opens no connector and no request is issued; CONTROL: the authorised actor's connector opens", () => {
  const w = declaredWorld();
  const real = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests += 1; throw new Error("no network in a test"); };
  try {
    const r = createTenantResolver({ env: w.envWith() });
    const d = decideForTenant(r, w.tenantId, RESOURCES.connector(w.subject, "SEARCH_CONSOLE_API"));
    assert.equal(d.allowed, true, "CONTROL: F02 allows this connector");
    const scope = (authorisations) => ({ decisions: [{ label: "c", decision: d }], authorisations });
    assert.throws(() => openConnector({ scope: scope([]), subjectId: w.subject, kind: "SEARCH_CONSOLE_API", resolve: r }), (e) => e instanceof ConnectorRefused && e.code === "CONNECTOR_NOT_AUTHORISED");
    const wrongKind = authorise({ actorRef: "actor:cc", action: "OPEN_CONNECTOR_PUBLIC_SITE", scope: { scopeType: "TENANT", tenantId: w.tenantId }, resourceRef: `${w.subject}#PUBLIC_SITE`, now: NOW });
    assert.throws(() => openConnector({ scope: scope([wrongKind]), subjectId: w.subject, kind: "SEARCH_CONSOLE_API", resolve: r }), (e) => e.code === "CONNECTOR_NOT_AUTHORISED", "an authorisation for ANOTHER connector opened this one");
    const right = authorise({ actorRef: "actor:cc", action: "OPEN_CONNECTOR_SEARCH_CONSOLE_API", scope: { scopeType: "TENANT", tenantId: w.tenantId }, resourceRef: `${w.subject}#SEARCH_CONSOLE_API`, now: NOW });
    assert.equal(openConnector({ scope: scope([right]), subjectId: w.subject, kind: "SEARCH_CONSOLE_API", resolve: r }).kind, "SEARCH_CONSOLE_API");
    assert.equal(requests, 0, "a request was issued");
  } finally { globalThis.fetch = real; w.cleanup(); }
});

test("EXPECTED · fail closed BEFORE money is committed — a real spend with no recorded owner approval never reaches the provider; CONTROL: the test double's approval reaches it", async () => {
  const dir = scratch();
  try {
    const ledger = createCostLedger(join(dir, "l.jsonl"));
    const fake = createFakePaidProvider({ name: "fake-paid-provider" });
    const auth = { provider: "fake-paid-provider", authorizedBy: "owner", date: "2026-09-25", reason: "F04 money-before-decision proof", budget: { amount: 10, currency: "USD" }, cap: { maxCalls: 5 } };
    const gate = createPaidProviderGate({ providers: { "fake-paid-provider": fake }, authorizations: [auth], killSwitch: createKillSwitch(), ledger, spendAuthority: { actorRef: "actor:cc", scope: T } });
    await assert.rejects(gate.call("fake-paid-provider", {}), (e) => e instanceof PaidCallRefused && e.code === "NOT_AUTHORISED_BY_F04" && /APPROVAL_MISSING/.test(e.reason));
    assert.equal(fake.callsReceived(), 0, "money was committed without the owner's approval");
    const id = "approval:double";
    const double = registry(approval({ approvalId: id, action: "CALL_PAID_PROVIDER", resource: { resourceClass: "PAID_PROVIDER", resourceRef: paidProviderRef("fake-paid-provider") }, scope: T, oneUse: false }));
    const ok = createPaidProviderGate({ providers: { "fake-paid-provider": fake }, authorizations: [auth], killSwitch: createKillSwitch(), ledger, spendAuthority: { actorRef: "actor:cc", scope: T, approvalRef: id, approvals: double } });
    await ok.call("fake-paid-provider", {});
    assert.equal(fake.callsReceived(), 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("EXPECTED · fail closed BEFORE content is published — PUBLISH and CONNECTED_PROPERTY_CHANGE are EMPTY families: no registered action, no site, and any such name is ACTION_UNSUPPORTED", () => {
  const c = authorisationCensus();
  for (const fam of ["PUBLISH", "CONNECTED_PROPERTY_CHANGE", "VERIFICATION"]) {
    assert.deepEqual(Object.entries(ACTIONS).filter(([, e]) => e.family === fam), [], `${fam} has a registered action — report it, do not assume empty`);
    assert.equal(ACTION_PATTERNS.filter((p) => p.family === fam).length, 0);
    assert.equal(FAMILY_RULES[fam]?.approval, "REQUIRED", `${fam} would not be approval-gated if an action were added`);
  }
  assert.equal([...c.entries, ...c.libraries].flatMap((e) => e.sites.flatMap((s) => s.names)).filter((n) => ["PUBLISH", "CONNECTED_PROPERTY_CHANGE", "VERIFICATION"].includes(actionEntry(n)?.family)).length, 0);
  for (const name of ["PUBLISH_PAGE", "CHANGE_CONNECTED_PROPERTY", "RECORD_HUMAN_VERIFICATION"]) assert.equal(authorise({ actorRef: "actor:owner", action: name, scope: G, now: NOW }).outcome, "ACTION_UNSUPPORTED");
});

/* ═══ FAILURE — each named way the mechanism fails, shown refused, with its opposite ═════════════════════════════════ */

test("FAILURE · a governed action never proceeds without a declared actor or a CURRENT permission (FIXTURE: revoked and expired allows)", () => {
  const perms = (x) => [P("operator-automation", "GOVERNED_STATE", "GENERATED_REPORT", "GLOBAL_PRODUCT", "ALLOW", x)];
  assert.equal(authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, now: NOW }, { permissions: perms({ revoked: true }) }).outcome, "PERMISSION_REVOKED");
  assert.equal(authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, now: NOW }, { permissions: perms({ expiresAt: "2026-09-01T00:00:00Z" }) }).outcome, "PERMISSION_EXPIRED");
  assert.equal(authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, now: NOW }, { permissions: perms({ expiresAt: "2026-12-01T00:00:00Z" }) }).outcome, "AUTHORISED", "CONTROL: a current allow authorises");
});

test("FAILURE · a role never silently widens tenant scope — the scope is F02's resolved tenant, and a role NAMED for a tenant grants nothing extra (FIXTURE)", () => {
  const actors = [...ACTORS, { actorRef: "actor:tenant-admin", actorClass: "HUMAN", roles: [`${TENANT}-admin`] }];
  assert.equal(authorise({ actorRef: "actor:tenant-admin", action: "READ_PROTECTED_TENANT_DATA", scope: T, now: NOW }, { actors }).outcome, "PERMISSION_MISSING", "a role's NAME granted access to its tenant");
  assert.equal(authorise({ actorRef: "actor:owner", action: "READ_PROTECTED_TENANT_DATA", scope: { scopeType: "TENANT" }, now: NOW }).outcome, "SCOPE_UNRESOLVED", "the owner's role supplied a tenant F02 did not resolve");
  assert.deepEqual(runAuthorisationRequests({ tenantId: TENANT, resources: [RESOURCES.connector("s", "PUBLIC_SITE")] }).map((q) => q.action), ["READ_PROTECTED_TENANT_DATA", "OPEN_CONNECTOR_PUBLIC_SITE"]);
  assert.equal(authorise({ actorRef: "actor:owner", action: "READ_PROTECTED_TENANT_DATA", scope: T, now: NOW }).outcome, "AUTHORISED", "CONTROL");
});

test("FAILURE · a model, tool, process or commit author is never a human approver", () => {
  const as = (approverRef, approverClass) => authorise({ actorRef: "actor:cc", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: "fixture#pr", approvalRef: "approval:fixture", now: NOW }, { approvals: registry(approval({ approverRef, approverClass })) }).outcome;
  assert.equal(as("actor:model", "MODEL"), "APPROVER_NOT_HUMAN");
  assert.equal(as("actor:ci", "SERVICE"), "APPROVER_NOT_HUMAN");
  assert.equal(as("actor:engine", "SYSTEM"), "APPROVER_NOT_HUMAN");
  assert.equal(as("git:author", "HUMAN"), "APPROVER_NOT_HUMAN", "a commit author became an approver");
  assert.equal(as("actor:model", "HUMAN"), "APPROVER_NOT_HUMAN", "a model claiming HUMAN was believed");
  assert.equal(as("actor:owner", "HUMAN"), "AUTHORISED", "CONTROL: the declared human approves");
});

test("FAILURE · an actor never approves its own restricted action where separation is required (REAL approval)", () => {
  assert.equal(authorise({ actorRef: "actor:owner", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: PR, approvalRef: REAL_APPROVAL, now: NOW }).outcome, "SELF_APPROVAL");
  assert.deepEqual(approvalFaults(recorded({ executorRef: "actor:owner", executorClass: "HUMAN" })).includes("SELF_APPROVAL"), true);
  assert.equal(authorise({ actorRef: "actor:cc", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: PR, approvalRef: REAL_APPROVAL, now: NOW }).outcome, "AUTHORISED", "CONTROL: the executor is not the approver");
});

test("FAILURE · a stale or unrelated approval is never reused — another resource, another action, a spent one-use, a revoked one", () => {
  const onReal = (over) => authorise({ actorRef: "actor:cc", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: PR, approvalRef: REAL_APPROVAL, now: NOW, ...over }).outcome;
  assert.equal(onReal({ resourceRef: "almi-visibility:pull-request:head=some-other-branch:base=main" }), "APPROVAL_WRONG_TARGET");
  assert.equal(onReal({ scope: T }), "APPROVAL_WRONG_TARGET");
  assert.equal(authorise({ actorRef: "actor:cc", action: "CALL_PAID_PROVIDER", scope: G, resourceRef: PR, approvalRef: REAL_APPROVAL, now: NOW }).outcome, "APPROVAL_WRONG_TARGET", "the merge approval authorised a spend");
  const spent = registry({ ...approval(), consumed: true });
  const revoked = registry({ ...approval({ oneUse: false, expiresAt: "2026-12-01T00:00:00Z" }), revoked: true });
  const f = (reg) => authorise({ actorRef: "actor:cc", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: "fixture#pr", approvalRef: "approval:fixture", now: NOW }, { approvals: reg }).outcome;
  assert.equal(f(spent), "APPROVAL_CONSUMED");
  assert.equal(f(revoked), "APPROVAL_REVOKED");
  assert.equal(onReal({}), "AUTHORISED", "CONTROL: the approval, for exactly its target");
});

test("FAILURE · export, spend, publishing and connected-property change never occur without their authority — REAL decisions over the real registry", () => {
  const exp = authorise({ actorRef: "actor:cc", action: "EXPORT_FACTS_FOR_VERIFICATION", scope: T, resourceRef: "runs/x", now: NOW });
  const expFmt = authorise({ actorRef: "actor:cc", action: "EXPORT_EVIDENCE_MD", scope: T, resourceRef: "runs/x", now: NOW });
  const spend = authorise({ actorRef: "actor:cc", action: "CALL_PAID_PROVIDER", scope: T, resourceRef: paidProviderRef("any"), now: NOW });
  const ownerSpend = authorise({ actorRef: "actor:owner", action: "CALL_PAID_PROVIDER", scope: T, resourceRef: paidProviderRef("any"), now: NOW });
  for (const d of [exp, expFmt, spend, ownerSpend]) assert.equal(d.outcome, "APPROVAL_MISSING", `${d.action} for ${d.actorClass}`);
  const reg = readApprovals();
  assert.equal([...reg.approvals.values()].filter((a) => ["EXPORT", "SPEND", "PUBLISH", "CONNECTED_PROPERTY_CHANGE"].includes(actionEntry(a.action)?.family)).length, 0, "an approval for a forbidden family is on record");
});

test("FAILURE · no caller-specific allowlist bypasses the shared decision — every entry point reaches it, and the paid gate's own list cannot grant", async () => {
  const c = authorisationCensus();
  assert.deepEqual(c.defects, [], JSON.stringify(c.defects));
  assert.equal(c.entries.filter((e) => e.route === "UNAUTHORISED").length, 0);
  const dir = scratch();
  try {
    const fake = createFakePaidProvider({ name: "fake-paid-provider" });
    const gate = createPaidProviderGate({ providers: { "fake-paid-provider": fake }, killSwitch: createKillSwitch(), ledger: createCostLedger(join(dir, "l.jsonl")),
      authorizations: [{ provider: "fake-paid-provider", authorizedBy: "owner", date: "2026-09-25", reason: "a complete item-47 authorization", budget: { amount: 9, currency: "USD" }, cap: { maxCalls: 9 } }],
      spendAuthority: { actorRef: "actor:cc", scope: T } });
    await assert.rejects(gate.call("fake-paid-provider", {}), (e) => e.code === "NOT_AUTHORISED_BY_F04", "the gate's own authorization list granted a spend");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("FAILURE · the mechanism is not proved only by fixtures or an empty population — REAL counts", () => {
  const c = authorisationCensus();
  assert.ok(c.entryPoints >= 60 && c.governedSites >= 70, `population ${c.entryPoints}/${c.governedSites}`);
  assert.equal(c.entryPoints, Object.values(c.byRoute).reduce((a, b) => a + b, 0), "an entry point has no route");
  const reg = readApprovals();
  assert.ok(reg.approvals.has(REAL_APPROVAL), "the owner's §3 approval is not on record");
  const trail = readFileSync(join(REPO, "audit-trail/events.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.eventType === "AUTHORISATION_DECISION");
  for (const a of ["WRITE_AUTHORITY_CORPUS", "ISSUE_APPROVAL"]) assert.ok(trail.some((e) => e.action === a && e.outcome === "ALLOWED"), `no real ${a} decision on the committed trail`);
  const families = new Set(Object.values(ACTIONS).map((e) => e.family));
  assert.equal(families.size, FAMILIES.length - 3, "the non-empty families changed — re-measure the empty ones");
});

/* ═══ EVIDENCE — every family over the real registry, both verdicts; isolation, separation, expiry, non-leakage, audit ═ */

test("EVIDENCE · every non-empty family: the automation actor is authorised (or refused APPROVAL_MISSING where gated) and the model is refused — REAL registry", () => {
  const rows = [];
  for (const fam of FAMILIES) {
    const actions = Object.entries(ACTIONS).filter(([, e]) => e.family === fam);
    if (!actions.length) { rows.push(`${fam}: EMPTY`); continue; }
    const [name] = actions[0];
    const scope = name === "READ_PROTECTED_TENANT_DATA" || name.startsWith("OPEN_CONNECTOR_") ? T : G;
    const cc = authorise({ actorRef: "actor:cc", action: name, scope, resourceRef: "r", now: NOW });
    const model = authorise({ actorRef: "actor:model", action: name, scope, resourceRef: "r", now: NOW });
    assert.equal(cc.outcome, FAMILY_RULES[fam]?.approval === "REQUIRED" ? "APPROVAL_MISSING" : "AUTHORISED", `${fam} ${name}`);
    assert.equal(model.outcome, "DENIED_BY_RULE", `${fam}: the model was not refused`);
    rows.push(`${fam}: ${cc.outcome} / model ${model.outcome}`);
  }
  assert.equal(rows.filter((r) => r.endsWith("EMPTY")).length, 3);
});

test("EVIDENCE · non-leakage — a decision and its audit event carry digests and classes, never the tenant, the resource, the actor or the approval reference", () => {
  const d = authorise({ actorRef: "actor:cc", action: "READ_PROTECTED_TENANT_DATA", scope: T, resourceRef: `tenant-partition:${TENANT}`, approvalRef: REAL_APPROVAL, now: NOW });
  const text = JSON.stringify([d, authorisationEvent(d)]);
  for (const raw of [TENANT, "tenant-partition", "actor:cc", REAL_APPROVAL]) assert.ok(!text.includes(raw), `leaked ${raw}`);
  assert.match(text, /"resourceRefDigest":"[0-9a-f]{16}"/, "CONTROL: the reference is carried as a digest");
  const records = readFileSync(join(REPO, APPROVALS_FILE), "utf8");
  assert.doesNotMatch(records, /password|secret|token|api[_-]?key|bearer|https?:\/\/|@[a-z0-9-]+\.[a-z]/i, "the approval registry carries a credential, address or URL shape");
});

test("EVIDENCE · audit events — every decision, allowed or refused, is a durable ACCESS event the F08 store accepts; a diagnostic run keeps its own and persists none", () => {
  const dir = scratch();
  try {
    const store = createAuditStore({ eventsPath: join(dir, "e.jsonl"), headPath: join(dir, "h.json") });
    const sink = durableGuardSink({ store, actor: "t", softwareVersion: "v", correlationId: "run:f04-audit", authorityRef: { propositionId: "P", scope: ["T"] }, authorityHash: "d".repeat(64) });
    const allowed = authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, now: NOW });
    const refused = authorise({ actorRef: "actor:model", action: REGISTERED, scope: G, now: NOW });
    for (const d of [allowed, refused]) { assert.equal(auditClassOf(authorisationEvent(d)), "ACCESS"); sink.emit(authorisationEvent(d)); }
    assert.deepEqual(store.readAll().events.map((e) => `${e.action}:${e.outcome}:${e.reasonCode}`), [`${REGISTERED}:ALLOWED:AUTHORISED`, `${REGISTERED}:REFUSED:DENIED_BY_RULE`]);
    const diag = diagnosticGuardSink({ actor: "t" });
    const r = authoriseScopedRun({ actorRef: null, tenantId: TENANT, resources: [], sink: diag, log: quiet });
    assert.equal(r.allowed, false);
    assert.equal(diag.events.length, 1, "the diagnostic run did not keep its decision");
    assert.equal(diag.durable, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ═══ CLARIFICATIONS 1–17 ═══════════════════════════════════════════════════════════════════════════════════════════ */

test("C1 · actor classes are distinct: HUMAN · SERVICE · AUTOMATION · MODEL · SYSTEM — and every declared actor holds exactly one", () => {
  assert.deepEqual([...ACTOR_CLASSES], ["HUMAN", "SERVICE", "AUTOMATION", "MODEL", "SYSTEM"]);
  for (const a of ACTORS) assert.ok(ACTOR_CLASSES.includes(a.actorClass), a.actorRef);
  assert.equal(new Set(ACTORS.map((a) => a.actorRef)).size, ACTORS.length);
  assert.equal(authorise({ actorRef: "actor:x", action: REGISTERED, scope: G, now: NOW }, { actors: [{ actorRef: "actor:x", actorClass: "ROBOT", roles: ["owner"] }] }).outcome, "IDENTITY_UNDECLARED", "an undeclared class was accepted");
});

test("C2 · an identity class never implies permission — the same class with and without a role decides differently (FIXTURE twin of the owner)", () => {
  const actors = [...ACTORS, { actorRef: "actor:another-human", actorClass: "HUMAN", roles: [] }];
  assert.equal(authorise({ actorRef: "actor:another-human", action: REGISTERED, scope: G, now: NOW }, { actors }).outcome, "ROLE_MISSING");
  assert.equal(authorise({ actorRef: "actor:owner", action: REGISTERED, scope: G, now: NOW }).outcome, "AUTHORISED", "CONTROL: the role, not the class, grants");
});

test("C3 · a model may propose but never becomes the source, verifier, approver or owner signature", () => {
  assert.equal(authorise({ actorRef: "actor:model", action: "ISSUE_APPROVAL", scope: G, now: NOW }).outcome, "DENIED_BY_RULE", "the model may record an approval");
  assert.ok(approvalFaults(recorded({ approverRef: "actor:model", approverClass: "MODEL" })).includes("APPROVER_NOT_HUMAN"));
  assert.equal(PERMISSIONS.filter((p) => p.role === "proposer" && p.effect === "ALLOW").length, 0, "the proposer role holds an allow");
  assert.equal(authorise({ actorRef: "actor:cc", action: "ISSUE_APPROVAL", scope: G, now: NOW }).outcome, "AUTHORISED", "CONTROL: the automation actor may RECORD (never approve)");
});

test("C4 · git author, email, chat speaker, environment user, process name and commit metadata are not proof of a person — only an explicitly named declared actor, and naming grants nothing", () => {
  const src = readFileSync(join(REPO, "src/governance/authorisation.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(src, /process\.env|execFileSync|execSync|\bgit\b|os\.userInfo|process\.title|argv0/, "the decision reads an identity from the environment");
  const env = { USER: "actor:owner", USERNAME: "actor:owner", GIT_AUTHOR_NAME: "actor:owner", GIT_AUTHOR_EMAIL: "owner@example.invalid" };
  assert.equal(namedActor(["node", "bin/x.mjs"]), null, "an actor was inferred with none named");
  assert.equal(authorise({ actorRef: namedActor(["node", "bin/x.mjs"]), action: REGISTERED, scope: G, now: NOW, env }).outcome, "IDENTITY_MISSING");
  assert.ok(approvalFaults(recorded({ approverRef: "owner@example.invalid" })).includes("CARRIES_A_CREDENTIAL_ADDRESS_OR_URL_SHAPE"));
  assert.ok(approvalFaults(recorded({ approverRef: "git:commit-author" })).includes("APPROVER_UNDECLARED"));
  assert.equal(namedActor(["--actor=actor:cc"]), "actor:cc", "CONTROL: the named reference is read");
});

test("C5 · tenant and subject scope come from F02, never from the role name — the scoped entry point decides over F02's tenant", () => {
  const src = readFileSync(join(REPO, "src/governance/scoped-entry.mjs"), "utf8");
  assert.match(src, /authoriseScopedRun\(\{ actorRef, tenantId: run\.tenantId, resources, sink \}\)/, "the authorisation is not decided over F02's resolved tenant");
  assert.equal(authorise({ actorRef: "actor:owner", action: "READ_PROTECTED_TENANT_DATA", scope: { scopeType: "TENANT", tenantId: "" }, now: NOW }).outcome, "SCOPE_UNRESOLVED");
  assert.equal(authorise({ actorRef: "actor:owner", action: "READ_PROTECTED_TENANT_DATA", scope: T, now: NOW }).outcome, "AUTHORISED", "CONTROL");
});

test("C6 · resource resolution comes from F03, never from the permission name — a connector needs F03's decision AND F04's, for exactly that connector", () => {
  const right = authorise({ actorRef: "actor:cc", action: "OPEN_CONNECTOR_CITED_SOURCES", scope: T, resourceRef: "s#CITED_SOURCES", now: NOW });
  assert.equal(right.outcome, "AUTHORISED");
  assert.throws(() => openConnector({ scope: { decisions: [], authorisations: [right] }, subjectId: "s", kind: "CITED_SOURCES" }), (e) => e.code === "CONNECTOR_NOT_RESOLVED", "F04's permission resolved a resource F03 never decided");
});

test("C7 · a permission grants only the named action over the named scope and resource class (FIXTURE)", () => {
  const permissions = [P("operator-automation", "GOVERNED_STATE", "GENERATED_REPORT", "TENANT", "ALLOW")];
  assert.equal(authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, now: NOW }, { permissions }).outcome, "PERMISSION_WRONG_SCOPE");
  assert.equal(authorise({ actorRef: "actor:cc", action: "WRITE_BODY_ARCHIVE", scope: T, now: NOW }, { permissions }).outcome, "PERMISSION_MISSING", "a GENERATED_REPORT allow granted a RUN_EVIDENCE action");
  assert.equal(authorise({ actorRef: "actor:cc", action: REGISTERED, scope: T, now: NOW }, { permissions }).outcome, "AUTHORISED", "CONTROL");
});

test("C8 · deny overrides allow (FIXTURE)", () => {
  const allow = P("operator-automation", "GOVERNED_STATE", "GENERATED_REPORT", "GLOBAL_PRODUCT", "ALLOW");
  const deny = P("operator-automation", "GOVERNED_STATE", "GENERATED_REPORT", "GLOBAL_PRODUCT", "DENY");
  const d = authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, now: NOW }, { permissions: [allow, deny] });
  assert.deepEqual([d.outcome, d.allowed], ["PERMISSION_CONFLICTING", false]);
  assert.equal(authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, now: NOW }, { permissions: [deny] }).outcome, "DENIED_BY_RULE");
  assert.equal(authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, now: NOW }, { permissions: [allow] }).outcome, "AUTHORISED", "CONTROL");
});

test("C9 · missing, ambiguous, conflicting, expired, revoked and wrong-scope permissions are SIX different outcomes (FIXTURE)", () => {
  const a = (x = {}) => P("operator-automation", "GOVERNED_STATE", "GENERATED_REPORT", "GLOBAL_PRODUCT", "ALLOW", x);
  const sets = {
    PERMISSION_MISSING: [], PERMISSION_AMBIGUOUS: [a(), a({ id: 2 })], PERMISSION_CONFLICTING: [a(), { ...a(), effect: "DENY" }],
    PERMISSION_EXPIRED: [a({ expiresAt: "2026-01-01T00:00:00Z" })], PERMISSION_REVOKED: [a({ revoked: true })], PERMISSION_WRONG_SCOPE: [{ ...a(), scopeType: "TENANT" }],
  };
  const got = Object.fromEntries(Object.entries(sets).map(([k, permissions]) => [k, authorise({ actorRef: "actor:cc", action: REGISTERED, scope: G, now: NOW }, { permissions }).outcome]));
  for (const [k, v] of Object.entries(got)) assert.equal(v, k);
  assert.equal(new Set(Object.values(got)).size, 6);
  for (const k of Object.keys(sets)) assert.ok(AUTHORISATION_OUTCOMES.includes(k));
});

test("C10 · an approval is a durable record carrying every required field — the REAL §3 record, with revocation state derived from history", () => {
  const line = JSON.parse(readFileSync(join(REPO, APPROVALS_FILE), "utf8").split("\n").filter(Boolean)[0]);
  assert.equal(line.recordedBy, "actor:cc", "the transcription names its recorder, who is not the approver");
  assert.equal(line.event, "ISSUED");
  const a = line.approval;
  for (const k of ["approverRef", "approverClass", "executorClass", "action", "resource", "scope", "decision", "issuedAt", "oneUse", "evidenceRef", "governingAuthority"]) assert.ok(k in a, k);
  assert.ok(a.oneUse === true || a.expiresAt, "neither an expiry nor a one-use rule");
  assert.equal(readApprovals().approvals.get(REAL_APPROVAL).revoked, false, "revocation state is not derived");
  assert.deepEqual(approvalFaults(a, { now: NOW }), [], "the recorded approval no longer validates");
  assert.ok(approvalFaults({ ...a, governingAuthority: undefined }).length > 0, "CONTROL: a record missing a field is refused");
});

test("C11 · approval records contain no credential and no protected payload — the validator refuses one that does", () => {
  const a = readApprovals().approvals.get(REAL_APPROVAL);
  assert.ok(approvalFaults(recorded({ resource: { resourceClass: "PULL_REQUEST", resourceRef: "x token=abc" } })).includes("CARRIES_A_CREDENTIAL_ADDRESS_OR_URL_SHAPE"));
  assert.ok(approvalFaults(recorded({ payload: "anything" })).some((f) => f.startsWith("UNDECLARED_KEY_")), "an undeclared key (a payload) was accepted");
  assert.deepEqual(approvalFaults(recorded(), { now: NOW }), [], "CONTROL: the recorded approval itself validates");
  assert.ok(!JSON.stringify(a).match(/tenant:[0-9a-f]{8}/), "the record carries a tenant id");
});

test("C12 · publishing, external spend, export and connected-property mutation stay forbidden unless the owner separately authorised that real action", () => {
  for (const fam of ["PUBLISH", "SPEND", "EXPORT", "CONNECTED_PROPERTY_CHANGE"]) assert.deepEqual(FAMILY_RULES[fam], { approval: "REQUIRED", approverClass: "HUMAN", separation: true }, fam);
  const live = [...readApprovals().approvals.values()].map((a) => actionEntry(a.action)?.family);
  assert.deepEqual(live, ["MERGE"], "the registry holds an approval other than the owner's §3 merge approval");
});

test("C13 · diagnostic inspection cannot grant a permission or an approval — `approval show` writes nothing and only bin/approval.mjs writes the registry", () => {
  const before = createHash("sha256").update(readFileSync(join(REPO, APPROVALS_FILE))).digest("hex");
  const r = spawnSync(process.execPath, ["bin/approval.mjs", "show"], { cwd: REPO, encoding: "utf8", timeout: 60_000 });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(createHash("sha256").update(readFileSync(join(REPO, APPROVALS_FILE))).digest("hex"), before);
  const c = authorisationCensus();
  const writers = c.entries.filter((e) => /approvals\.jsonl|APPROVALS_FILE/.test(readFileSync(join(REPO, e.file), "utf8")));
  assert.deepEqual(writers.map((e) => e.file), ["bin/approval.mjs"]);
  assert.equal(writers[0].route, "AT_BOUNDARY", "the approval recorder does not reach the decision");
});

test("C14 · fixtures prove refusal branches only — the census and the approval come from the real tree, and the census's population is git-tracked", () => {
  const c = authorisationCensus();
  assert.ok(c.entries.every((e) => /^(bin|subjects)\//.test(e.file)));
  assert.ok(readApprovals().approvals.has(REAL_APPROVAL));
  assert.deepEqual(governanceFaults(readApprovals().approvals.get(REAL_APPROVAL), { now: NOW }), [], "the real approval's owner-issued source no longer resolves");
});

test("C15 · historical roles, gates and tests give no F04 authority — the crosswalk imports none and the historical 61/38 ledger is untouched", async () => {
  const { CROSSWALK } = await import("../config/fboard/crosswalk.mjs");
  const row = (CROSSWALK.entries ?? CROSSWALK).find((e) => e.featureId === "F04");
  assert.equal(row.acceptanceRelation, "NEW");
  assert.deepEqual(row.historicalRows ?? [], []);
  assert.equal(row.authorityImported ?? false, false);
  const h = createHash("sha256").update(readFileSync(join(REPO, "src/checklist/classification.mjs"), "utf8").split("\r\n").join("\n"), "utf8").digest("hex");
  assert.equal(h, "149f936256debdc4b74b7298f707f48371d26ec4380a9f58f74254c6e9d9a65d");
  assert.doesNotMatch(readFileSync(join(REPO, "config/governance/authorisation.mjs"), "utf8"), /checklist\/classification|HISTORICAL_61/);
});

test("C16 · a CLI flag, an environment variable or a confirmation switch expresses intent and never grants authority", () => {
  const p = writePermission({ target: LOCAL, argv: ["--confirm"], env: { ALLOW_PROD_WRITE: "1" } });
  assert.equal(p.mayWrite, true);
  assert.equal(p.actorRef, null);
  assert.equal(authorise({ actorRef: p.actorRef, action: REGISTERED, scope: G, now: NOW }).outcome, "IDENTITY_MISSING", "--confirm authorised a write");
  assert.equal(authorise({ actorRef: "actor:cc", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: PR, approvalRef: namedApproval(["--approval=approval:made-up"]), now: NOW }).outcome, "APPROVAL_UNKNOWN", "a named approval that was never issued authorised");
});

test("C17 · the owner's advance approval is valid: one action, one resource and scope, one use, the owner as approver — and its EXECUTOR is never its approver (REAL)", () => {
  const a = readApprovals().approvals.get(REAL_APPROVAL);
  assert.deepEqual([a.approverRef, a.approverClass, a.executorRef, a.executorClass, a.action, a.oneUse], ["actor:owner", "HUMAN", "actor:cc", "AUTOMATION", "MERGE_PULL_REQUEST", true]);
  assert.equal(a.resource.resourceRef, PR);
  assert.equal(authorise({ actorRef: "actor:cc", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: PR, approvalRef: REAL_APPROVAL, now: NOW }).outcome, "AUTHORISED");
  assert.equal(authorise({ actorRef: "actor:owner", action: "MERGE_PULL_REQUEST", scope: G, resourceRef: PR, approvalRef: REAL_APPROVAL, now: NOW }).outcome, "SELF_APPROVAL");
  assert.ok(approvalFaults(recorded({ oneUse: false, expiresAt: null })).includes("NEITHER_EXPIRY_NOR_ONE_USE"), "CONTROL: an approval with neither rule is refused");
  assert.ok(approvalFaults(recorded({ evidenceRef: { ...a.evidenceRef, blob: "0".repeat(40) } })).includes("EVIDENCE_IS_NOT_THE_GOVERNING_RECORD"), "a fabricated evidence reference validated");
  assert.ok(approvalFaults(recorded({ governingAuthority: { propositionId: "F04_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F04"] } })).includes("EVIDENCE_IS_NOT_THE_GOVERNING_RECORD"), "an approval pointing at a record other than its evidence validated");
});

/* ═══ THE CENSUS AND ITS CONTROLS — a zero that could not fire proves nothing ════════════════════════════════════════ */

test("CENSUS · the real tree: every entry point has a route, every governed site resolves to a registered action — 0 defects", () => {
  const c = authorisationCensus();
  assert.equal(c.defects.length, 0, JSON.stringify(c.defects));
  assert.equal(c.libraries.length, 0, "a src/ library now calls the boundary itself — count its callers");
  assert.ok(c.byRoute.AT_BOUNDARY > 0 && c.byRoute.DIRECT > 0 && c.byRoute.AT_SCOPED_ENTRY > 0, JSON.stringify(c.byRoute));
});

test("CENSUS CONTROLS · an unknown action, an unresolved site, a HIDDEN ALIASED caller, an unauthorised exempt writer and a pattern that cannot fail are each named", () => {
  const rows = [
    { file: "bin/p1.mjs", cls: "GOVERNED_STATE_CHANGE", callerClass: "BOUNDARY_ROUTED" },
    { file: "bin/p2.mjs", cls: "GOVERNED_STATE_CHANGE", callerClass: "BOUNDARY_ROUTED" },
    { file: "bin/p3.mjs", cls: "GOVERNED_STATE_CHANGE", callerClass: "BOUNDARY_ROUTED" },
    { file: "bin/p4.mjs", cls: "GOVERNED_STATE_CHANGE", callerClass: "CHECKED_AUDIT_STORE_EXEMPTION" },
    { file: "bin/twin.mjs", cls: "GOVERNED_STATE_CHANGE", callerClass: "CHECKED_AUDIT_STORE_EXEMPTION" },
  ];
  const sources = {
    "bin/p1.mjs": `executeGovernedWrite(governedFileWrite({ repo, action: "WRITE_SOMETHING_UNDECLARED", occurredAt }));\n`,
    "bin/p2.mjs": `executeGovernedWrite(governedFileWrite({ repo, action: someValue, occurredAt }));\n`,
    "bin/p3.mjs": `import { governedFileWrite as gfw } from "../src/governance/governed-run.mjs";\nconst w = gfw({ repo, action: "WRITE_HIDDEN_ALIAS_UNDECLARED" });\n`,
    "bin/p4.mjs": `const store = productionAuditStore({ repo });\nstore.append(x);\n`,
    "bin/twin.mjs": `const d = authorise({ actorRef, action: "WRITE_AUDIT_TRAIL_STORE" });\nstore.append(x);\n`,
  };
  const c = authorisationCensus({ sources, rows, libraries: [] });
  const named = c.defects.map((d) => `${d.code} ${d.file ?? ""} ${d.action ?? ""}`.trim());
  assert.ok(named.includes("UNKNOWN_ACTION bin/p1.mjs WRITE_SOMETHING_UNDECLARED"), named.join(" | "));
  assert.ok(named.some((n) => n.startsWith("UNKNOWN_SITE bin/p2.mjs")), named.join(" | "));
  assert.ok(named.includes("UNKNOWN_ACTION bin/p3.mjs WRITE_HIDDEN_ALIAS_UNDECLARED"), "the aliased caller was not seen");
  assert.ok(named.includes("UNAUTHORISED_WRITER bin/p4.mjs"));
  assert.ok(!named.some((n) => n.includes("bin/twin.mjs")), "CONTROL: the lawful twin was flagged");
  assert.equal(unfalsifiablePatterns([{ pattern: /.*/ }]).length, 1, "a pattern that matches anything was not caught");
  assert.equal(unfalsifiablePatterns().length, 0, "CONTROL: the real patterns refuse a control name");
  assert.equal(routeOf({ cls: "READ_ONLY_DIAGNOSTIC" }, "scopedEntryPoint({})"), "AT_SCOPED_ENTRY");
  assert.equal(actionSitesOf(`// executeGovernedWrite(governedFileWrite({ action: "WRITE_IN_A_COMMENT" }))\n`).sites.length, 0, "a comment was counted as a site");
});

test("ACCEPTANCE · F04 is pinned from its committed blob, CURRENT in the register, and the contract hash is the frozen one", () => {
  /* The ORIGINAL frozen acceptance (b439309) is kept byte-immutable as F04_ORIGINAL; Amendment 1 (68bd208) is the current
   * contract and names it by both hashes (test/f04-amendment-zero-population.test.mjs A10). */
  const acc = F04_ORIGINAL;
  assert.equal(ACCEPTANCES.F04.amends.contractSha256, acc.contractSha256);
  assert.equal(acc.contractSha256, "2a2a98bfb8eb88071102de18a6e3ff727f682948830c58aeb03ba90eaacda12e");
  assert.equal(acc.ruling.sha256, "8d50f03fc5c72399344e3e368e342d2ed849f0b9201333028ce5111086c347b7");
  const rec = AUTHORITY_CORPUS.find((r) => r.propositionId === "F04_ACCEPTANCE");
  assert.equal(rec.status, "CURRENT");
  assert.equal(rec.contentHash, acc.ruling.sha256);
});
