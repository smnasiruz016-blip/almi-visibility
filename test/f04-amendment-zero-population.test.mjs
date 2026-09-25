/**
 * 🔴 F04 · AMENDMENT 1 · THE ZERO-APPROVED-ACTION POPULATION — proofs A1–A10, the confined controls, the reopen trigger.
 *
 *   Owner ruling _handoffs 4bf7b1d (decision c) · Amendment 1 _handoffs 68bd208 (sha256 95c2164e…, contract ff793319…),
 *   amending b439309 (contract 2a2a98bf…) · command 89e8664.
 *
 * REAL: the recorded approval registry, the committed audit trail, the production tree (tools/zero-population-census.mjs).
 * A CONFINED CONTROL reaches a family's authorised branch in-process (a test-double registry, a fake provider, a fixture
 * action): it proves the branch is reachable and is NEVER counted in the real population. A FIXTURE planted into the census
 * proves a zero can move (every zero has a firing positive control).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { ACTORS, ACTIONS, FAMILY_RULES, PERMISSIONS } from "../config/governance/authorisation.mjs";
import { ACCEPTANCES, F04_ORIGINAL } from "../config/fboard/acceptances.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { authorise, readApprovals, APPROVALS_FILE } from "../src/governance/authorisation.mjs";
import { approvalFaults } from "../src/governance/approval-registry.mjs";
import { contractSha256, normaliseClause } from "../src/fboard/acceptance.mjs";
import { createPaidProviderGate, createKillSwitch, createFakePaidProvider, paidProviderRef } from "../src/cost/paid-provider-gate.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { zeroPopulationCensus, ZERO_ROUTE_FAMILIES, REAL_POPULATION_FAMILIES, CONFINED_CONTROLS, CLASSES } from "../tools/zero-population-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NOW = "2026-09-25T12:00:00Z";
const TENANT = "tenant:00000000000000000000000000000f02";
const T = { scopeType: "TENANT", tenantId: TENANT };
const G = { scopeType: "GLOBAL_PRODUCT" };
const trail = () => readFileSync(join(REPO, "audit-trail/events.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const real = () => zeroPopulationCensus({ now: NOW });
const row = (c, f) => c.rows.find((r) => r.family === f);
const issued = () => JSON.parse(readFileSync(join(REPO, APPROVALS_FILE), "utf8").split("\n").filter(Boolean)[0]).approval;
/* FIXTURE — a registry holding one approval; planted into the census only, never recorded. */
const withApproval = (over) => { const reg = readApprovals(); const approvals = new Map(reg.approvals); approvals.set(over.approvalId, { revoked: false, consumed: false, ...over }); return { readable: true, events: reg.events + 1, approvals }; };
const fx = (over = {}) => ({ approvalId: "approval:fixture-spend", approverRef: "actor:owner", approverClass: "HUMAN", executorRef: "actor:cc", executorClass: "AUTOMATION", action: "CALL_PAID_PROVIDER", resource: { resourceClass: "PAID_PROVIDER", resourceRef: paidProviderRef("any") }, scope: T, decision: "APPROVED", oneUse: false, expiresAt: null, ...over });

/* ═══ §4 · THE FIVE FAMILIES, MEASURED ════════════════════════════════════════════════════════════════════════════ */

test("CENSUS · the five families: every column measured, approved real population 0 each, remainder 0, no reopen, none misapplied", () => {
  const c = real();
  assert.deepEqual(c.rows.map((r) => r.family), [...ZERO_ROUTE_FAMILIES]);
  assert.equal(c.remainder, 0);
  assert.deepEqual(c.misapplied, []);
  assert.deepEqual(c.reopen, []);
  for (const r of c.rows) {
    assert.equal(r.approvedRequests, 0, `${r.family} has an approved real action — the zero route does not apply`);
    assert.equal(r.authorisedExecutions, 0, `${r.family} executed`);
    assert.equal(r.route, "ZERO_APPROVED");
    assert.equal(Object.keys(r.by).join(), CLASSES.join());
  }
  // the real attempts made on 25 Sep, refused before effect (F02 scope gate — no production attachment for their stores)
  for (const f of ["SPEND", "EXPORT"]) assert.ok(row(c, f).refusedRealAttempts >= 1 && row(c, f).productionActionSites >= 1, `${f}: no real refused attempt measured`);
  for (const f of ["VERIFICATION", "PUBLISH", "CONNECTED_PROPERTY_CHANGE"]) assert.deepEqual([row(c, f).productionActionSites, row(c, f).realRequests, row(c, f).by.NO_REQUEST], [0, 0, 1], `${f} is not an empty family`);
});

/* ═══ §6 · A1–A10 ═════════════════════════════════════════════════════════════════════════════════════════════════ */

test("A1 · the zero is MEASURED, not assumed — a planted approval, a planted decision and a planted site each move it", () => {
  const base = row(real(), "SPEND");
  assert.equal(row(zeroPopulationCensus({ now: NOW, approvals: withApproval(fx()) }), "SPEND").approvedRequests, base.approvedRequests + 1, "a live approval did not move the approved population");
  const planted = [...trail(), { eventType: "AUTHORISATION_DECISION", action: "EXPORT_FACTS_FOR_VERIFICATION", outcome: "REFUSED", reasonCode: "APPROVAL_MISSING" }];
  assert.equal(row(zeroPopulationCensus({ now: NOW, trail: planted }), "EXPORT").refusedRealAttempts, row(real(), "EXPORT").refusedRealAttempts + 1, "a recorded refusal was not counted");
  assert.equal(row(zeroPopulationCensus({ now: NOW, decisionSites: [{ file: "bin/planted.mjs", action: "CALL_PAID_PROVIDER", line: 1 }], writeSites: [] }), "SPEND").productionActionSites, 1, "a planted site was not counted");
});

test("A2 · an existing approval prevents the zero-population route — it cannot be hidden", () => {
  const c = zeroPopulationCensus({ now: NOW, approvals: withApproval(fx({ approvalId: "approval:fixture-export", action: "EXPORT_FACTS_FOR_VERIFICATION", resource: { resourceClass: "EXPORT_ARTIFACT", resourceRef: "x" } })) });
  assert.equal(row(c, "EXPORT").approvedRequests, 1, "an existing approval was hidden");
  assert.equal(row(c, "EXPORT").route, "REAL_POPULATION_REQUIRED");
  assert.equal(row(c, "SPEND").route, "ZERO_APPROVED", "CONTROL: the other families stay zero");
});

test("A3 · a refusal is not an authorised success — refused decisions never count as approved or executed", () => {
  const planted = [...trail(), { eventType: "AUTHORISATION_DECISION", action: "CALL_PAID_PROVIDER", outcome: "REFUSED", reasonCode: "APPROVAL_MISSING" }];
  const r = row(zeroPopulationCensus({ now: NOW, trail: planted }), "SPEND");
  assert.equal(r.by.APPROVED_REAL_ACTION, 0, "a refusal counted as an approved action");
  assert.equal(r.authorisedExecutions, 0);
  assert.equal(r.route, "ZERO_APPROVED");
  const d = authorise({ actorRef: "actor:cc", action: "CALL_PAID_PROVIDER", scope: T, resourceRef: paidProviderRef("any"), now: NOW });
  assert.deepEqual([d.outcome, d.allowed], ["APPROVAL_MISSING", false]);
});

test("A4 · a control is not a real action — controls sit in their own column and outside real requests", () => {
  const c = real();
  const t = trail();
  for (const r of c.rows) {
    const recorded = t.filter((e) => e.eventType === "AUTHORISATION_DECISION" && ACTIONS[e.action]?.family === r.family).length + r.refusedByGate.F02_SCOPE;
    assert.equal(r.realRequests, recorded, `${r.family}: a control was counted as real`);
    assert.equal(r.confinedControls, CONFINED_CONTROLS[r.family].length);
  }
  const src = ["test/f04-amendment-zero-population.test.mjs", "test/f04-roles-permissions-approvals.test.mjs"].map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
  const BASE = "AMEND · confined control reaches the authorised branch · ";
  for (const name of Object.values(CONFINED_CONTROLS).flat()) {
    /* a literal test name, or one generated by the per-family loop (its template base plus the family in the loop list) */
    const generated = name.startsWith(BASE) && src.includes(`test(\`${BASE}\${family}`) && src.includes(`["${name.slice(BASE.length)}", "`);
    assert.ok(src.includes(`test("${name}`) || generated, `the declared control "${name}" is not a test`);
  }
});

test("A5 · a model or a tool cannot invent an approval — only a declared HUMAN, pointing at an owner-issued record", () => {
  assert.equal(authorise({ actorRef: "actor:model", action: "ISSUE_APPROVAL", scope: G, now: NOW }).outcome, "DENIED_BY_RULE");
  const a = issued();
  assert.ok(approvalFaults({ ...a, approverRef: "actor:cc", approverClass: "HUMAN", executorRef: "actor:owner", executorClass: "HUMAN" }).includes("APPROVER_NOT_HUMAN"), "automation posed as the owner");
  assert.ok(approvalFaults({ ...a, approverRef: "actor:model", approverClass: "MODEL" }).includes("APPROVER_NOT_HUMAN"));
  assert.ok(approvalFaults({ ...a, governingAuthority: { propositionId: "OWNER_RULING_F04_ZERO_APPROVED_ACTION_POPULATION", scope: ["ALMIVISIBILITY", "F04"] } }).includes("EVIDENCE_IS_NOT_THE_GOVERNING_RECORD"), "a ruling that authorises nothing was used as an approval's source");
  assert.deepEqual(approvalFaults(a, { now: NOW }), [], "CONTROL: the owner's recorded approval validates");
});

test("A6 · the FIRST future approved real action triggers an F04 re-sit (REOPEN_F04)", () => {
  assert.deepEqual([...ACCEPTANCES.F04.zeroApprovedFamilies], [...ZERO_ROUTE_FAMILIES]);
  for (const f of ZERO_ROUTE_FAMILIES) {
    const action = Object.entries(ACTIONS).find(([, e]) => e.family === f)?.[0] ?? "CALL_PAID_PROVIDER";
    const c = zeroPopulationCensus({ now: NOW, approvals: withApproval(fx({ approvalId: `approval:future-${f.toLowerCase()}`, action })) });
    if (ACTIONS[action].family !== f) continue; // an empty family has no action to approve
    assert.deepEqual(c.reopen, [f], `${f}: an approved real action did not force a re-sit`);
  }
  assert.deepEqual(real().reopen, [], "CONTROL: today nothing reopens");
});

test("A7 · the absence of an approval stays FAIL-CLOSED — every zero-approved family refuses for every actor (REAL registry)", () => {
  for (const f of ZERO_ROUTE_FAMILIES) {
    assert.deepEqual(FAMILY_RULES[f], { approval: "REQUIRED", approverClass: "HUMAN", separation: true }, `${f} is not approval-gated`);
    const actions = Object.entries(ACTIONS).filter(([, e]) => e.family === f).map(([a]) => a);
    for (const actorRef of ["actor:cc", "actor:owner", "actor:model"]) for (const action of actions.length ? actions : [`${f}_ANYTHING`]) {
      const d = authorise({ actorRef, action, scope: T, resourceRef: "r", now: NOW });
      assert.equal(d.allowed, false, `${actorRef} ${action} was authorised with no approval`);
    }
  }
});

test("A8 · an approval cannot cross action families — the real merge approval authorises no spend or export", () => {
  const pr = issued().resource.resourceRef;
  for (const action of ["CALL_PAID_PROVIDER", "EXPORT_FACTS_FOR_VERIFICATION"]) assert.equal(authorise({ actorRef: "actor:cc", action, scope: G, resourceRef: pr, approvalRef: issued().approvalId, now: NOW }).outcome, "APPROVAL_WRONG_TARGET", `the merge approval authorised ${action}`);
  const c = zeroPopulationCensus({ now: NOW, approvals: withApproval(fx()) });
  assert.equal(row(c, "EXPORT").approvedRequests, 0, "a SPEND approval counted for EXPORT");
  assert.equal(row(real(), "SPEND").approvalRecords, 0, "the merge approval counted as a SPEND record");
});

test("A9 · a stale, revoked or spent approval creates no approved population", () => {
  for (const [label, over] of [["revoked", { revoked: true }], ["expired", { expiresAt: "2026-09-01T00:00:00Z" }], ["spent", { oneUse: true, consumed: true }]]) {
    const r = row(zeroPopulationCensus({ now: NOW, approvals: withApproval(fx({ approvalId: `approval:${label}`, ...over })) }), "SPEND");
    assert.deepEqual([r.approvedRequests, r.by.INVALID_OR_EXPIRED_APPROVAL, r.route], [0, 1, "ZERO_APPROVED"], `a ${label} approval created a population`);
  }
});

test("A10 · the amendment changes ONLY the EVIDENCE interpretation — INPUT, EXPECTED, FAILURE unchanged; the original is named and kept", () => {
  const a = ACCEPTANCES.F04;
  for (const k of ["input", "expected", "failure"]) assert.equal(normaliseClause(a[k]), normaliseClause(F04_ORIGINAL[k]), `${k} changed`);
  assert.ok(normaliseClause(a.evidence).startsWith(normaliseClause(F04_ORIGINAL.evidence)), "an original evidence demand was dropped");
  assert.notEqual(a.contractSha256, F04_ORIGINAL.contractSha256);
  assert.deepEqual([a.amends.contractSha256, a.amends.ruling.sha256], [F04_ORIGINAL.contractSha256, F04_ORIGINAL.ruling.sha256]);
  assert.equal(contractSha256(a), a.contractSha256);
  assert.notEqual(contractSha256({ ...a, evidence: a.evidence.replace("real refusal", "real success") }), a.contractSha256, "a one-word mutation did not change the contract");
  for (const p of ["F04_ACCEPTANCE", "F04_ACCEPTANCE_AMENDMENT_1", "OWNER_RULING_F04_ZERO_APPROVED_ACTION_POPULATION"]) assert.equal(AUTHORITY_CORPUS.find((r) => r.propositionId === p)?.status, "CURRENT", p);
  assert.equal(AUTHORITY_CORPUS.find((r) => r.propositionId === "F04_ACCEPTANCE_AMENDMENT_1").contentHash, a.ruling.sha256);
});

test("AMEND · the zero route never applies to Research, Approval or Merge — their real populations exist", () => {
  for (const f of REAL_POPULATION_FAMILIES) assert.ok(!ACCEPTANCES.F04.zeroApprovedFamilies.includes(f), `the zero route was applied to ${f}`);
  assert.deepEqual(zeroPopulationCensus({ now: NOW, pinned: [...ZERO_ROUTE_FAMILIES, "RESEARCH"] }).misapplied, ["RESEARCH"], "CONTROL: a misapplication is named");
  const t = trail().filter((e) => e.eventType === "AUTHORISATION_DECISION");
  assert.ok(t.some((e) => e.action === "ISSUE_APPROVAL" && e.outcome === "ALLOWED"), "no real authorised APPROVAL decision on the trail");
  assert.ok(readApprovals().approvals.size >= 1, "no real MERGE approval on record");
});

/* ═══ §7 · THE CLOSURE ═══════════════════════════════════════════════════════════════════════════════════════════════ */

test("CLOSURE · F04 is VERIFIED-PASS by UNASSESSED → IN-PROGRESS → VERIFIED-PASS under the CURRENT acceptance; the board reads 8/89; the movement is on the trail", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const { buildBoard, progress } = await import("../src/fboard/board.mjs");
  const { CAPABILITIES } = await import("../config/fboard/capabilities.mjs");
  const r = DECLARED.F04;
  assert.equal(r.state, "VERIFIED-PASS");
  const v = r.events.find((e) => e.kind === "VERIFIED");
  assert.deepEqual([v.from, v.to, v.reason, v.population, v.pullRequest, v.ciRun], ["IN-PROGRESS", "VERIFIED-PASS", "RETEST_PASSED_UNDER_CURRENT_ACCEPTANCE", "REAL", 159, "36134428770"]);
  assert.deepEqual([v.acceptanceUnchanged.contract, v.acceptanceUnchanged.ruling], [ACCEPTANCES.F04.contractSha256, ACCEPTANCES.F04.ruling.sha256], "verified under a contract other than the current one");
  assert.deepEqual(r.events.map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "ACCEPTANCE_AMENDED", "VERIFIED"]);
  const p = progress(buildBoard(CAPABILITIES, DECLARED));
  assert.deepEqual([p.passed, p.split.UNASSESSED, p.split["BLOCKED-BY-AUTHORITY"], p.split["IN-PROGRESS"]], [8, 79, 1, 1]); // F09 IN-PROGRESS since 25 Sep (movement 1)
  assert.ok(trail().some((e) => e.eventType === "BOARD_TRANSITION" && e.action === "VERIFIED" && e.metadata?.featureId === "F04"), "F04's movement is not on the trail");
});

/* ═══ CONFINED CONTROLS — the authorised branch is reachable; nothing here is real ══════════════════════════════════ */

const reg1 = (a) => ({ readable: true, events: 1, approvals: new Map([[a.approvalId, { revoked: false, consumed: false, ...a }]]) });

test("AMEND · confined control reaches the authorised branch · SPEND", async () => {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const dir = mkdtempSync(join(REPO, ".test-scratch", "f04z-"));
  const before = trail().length;
  try {
    const fake = createFakePaidProvider({ name: "fake-paid-provider" });
    const a = fx({ approvalId: "approval:control-spend", resource: { resourceClass: "PAID_PROVIDER", resourceRef: paidProviderRef("fake-paid-provider") } });
    const gate = createPaidProviderGate({ providers: { "fake-paid-provider": fake }, killSwitch: createKillSwitch(), ledger: createCostLedger(join(dir, "l.jsonl")),
      authorizations: [{ provider: "fake-paid-provider", authorizedBy: "control", date: "2026-09-25", reason: "confined control of the authorised branch", budget: { amount: 5, currency: "USD" }, cap: { maxCalls: 2 } }],
      spendAuthority: { actorRef: "actor:cc", scope: T, approvalRef: a.approvalId, approvals: reg1(a) } });
    await gate.call("fake-paid-provider", {});
    assert.equal(fake.callsReceived(), 1, "the authorised branch is not reachable");
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.equal(trail().length, before, "the control reached the production trail");
  assert.equal(row(real(), "SPEND").approvedRequests, 0, "the control was counted as a real approved action");
});

for (const [family, action, resourceClass] of [["EXPORT", "EXPORT_FACTS_FOR_VERIFICATION", "EXPORT_ARTIFACT"], ["VERIFICATION", "RECORD_HUMAN_VERIFICATION", "VERIFICATION_RECORD"], ["PUBLISH", "PUBLISH_PAGE", "PUBLIC_CONTENT"], ["CONNECTED_PROPERTY_CHANGE", "CHANGE_CONNECTED_PROPERTY", "CONNECTED_PROPERTY"]]) {
  test(`AMEND · confined control reaches the authorised branch · ${family}`, () => {
    const registered = Object.hasOwn(ACTIONS, action);
    const actions = registered ? ACTIONS : { ...ACTIONS, [action]: { family, resourceClass } }; // FIXTURE action for an empty family
    const a = { approvalId: `approval:control-${family.toLowerCase()}`, approverRef: "actor:owner", approverClass: "HUMAN", executorRef: "actor:cc", executorClass: "AUTOMATION", action, resource: { resourceClass, resourceRef: "control#r" }, scope: T, decision: "APPROVED", oneUse: true, expiresAt: null };
    const ok = authorise({ actorRef: "actor:cc", action, scope: T, resourceRef: "control#r", approvalRef: a.approvalId, now: NOW }, { actions, approvals: reg1(a) });
    assert.equal(ok.outcome, "AUTHORISED", `${family}: the authorised branch is not reachable`);
    const without = authorise({ actorRef: "actor:cc", action, scope: T, resourceRef: "control#r", now: NOW }, { actions });
    assert.equal(without.outcome, "APPROVAL_MISSING", "CONTROL: without its approval the same branch refuses");
    assert.equal(authorise({ actorRef: "actor:cc", action, scope: T, resourceRef: "control#r", now: NOW }).outcome, registered ? "APPROVAL_MISSING" : "ACTION_UNSUPPORTED", "REAL: the real registry refuses");
    assert.equal(row(real(), family).approvedRequests, 0, "the control was counted as a real approved action");
  });
}

test("AMEND · no approval or high-risk action was fabricated — the registry holds only the owner's §3 merge approval", () => {
  const all = [...readApprovals().approvals.values()];
  assert.deepEqual(all.map((a) => a.action), ["MERGE_PULL_REQUEST"]);
  assert.equal(trail().filter((e) => e.eventType === "GOVERNED_WRITE" && ZERO_ROUTE_FAMILIES.includes(ACTIONS[e.action]?.family)).length, 0, "a high-risk write reached the trail");
  assert.equal(ACTORS.filter((x) => x.actorClass === "HUMAN").length, 1, "a human actor was added");
  assert.equal(PERMISSIONS.filter((p) => p.role === "proposer" && p.effect === "ALLOW").length, 0);
});
