/**
 * F78 · COST BUDGET AND PROVIDER GOVERNOR (acceptance _handoffs a1885de, RR-93).
 *
 * Every expected attribution, total and refusal below is written by hand from its fixture. The paid-provider controls are exercised
 * against a TEST DOUBLE only (no account, no real call). Nothing here writes to the production trail (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { attributeCostEntry, totalsByTenant } from "../src/cost/tenant-attribution.mjs";
import { readCostByTenant, viewForTenant, researchLedgers } from "../src/cost/cost-by-tenant.mjs";
import { coverageFailures, createCostLedger } from "../src/cost/ledger.mjs";
import { createPaidProviderGate, createFakePaidProvider, createKillSwitch, authorizationProblems, paidProviderRef, PaidCallRefused } from "../src/cost/paid-provider-gate.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- a stand-in resolver: exactly these declarations resolve ---- */
const A = "tenant:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", B = "tenant:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const DECLARED = { "RESEARCH_BATCH|batch-a": A, "RESEARCH_BATCH|batch-b": B, "SITE_ORIGIN|https://a.example": A, "SITE_ORIGIN|https://b.example": B };
const resolve = ({ resourceKind, resourceRef }) => (DECLARED[`${resourceKind}|${resourceRef}`] ? { state: "RESOLVED", tenantId: DECLARED[`${resourceKind}|${resourceRef}`] } : { state: "UNDECLARED" });
const ORIGINS = [{ host: "a.example", tenantId: A }, { host: "shop.a.example", tenantId: A }, { host: "b.example", tenantId: B }];
const entry = (over = {}) => ({ entry_id: "e1", run_kind: "crawl", sources: [], money: { amountState: "MEASURED", amount: 0, currency: "USD" }, providerCalls: { state: "MEASURED", total: 0 }, founderTime: { state: "MEASURED", seconds: 0 }, budget: {}, ...over });
const prop = (id, ref) => [id, { observation_id: id, target: { kind: "property", ref } }];

/* ================= C1 — spend and workload by tenant ================= */

test("C1 · FIRING CONTROL: an entry whose run declares no scope is UNATTRIBUTED with its reason — never assigned to a tenant", () => {
  for (const [e, why] of [[entry({ run_kind: "crawl" }), /shared crawl batch/], [entry({ run_kind: "render" }), /engine run \(render\)/], [entry({ run_kind: "paid-provider-call" }), /recorded no tenant scope/], [entry({ run_kind: "gsc-ingest", sources: ["x"] }), /names a property/]]) {
    const a = attributeCostEntry(e, { resolve });
    assert.deepEqual([a.state, a.tenantId], ["UNATTRIBUTED", null], `${e.run_kind} was assigned to a tenant`);
    assert.match(a.missing, why);
  }
  assert.equal(attributeCostEntry(entry(), { resolve, batch: "batch-z" }).state, "UNATTRIBUTED", "an undeclared research batch was attributed");
});

test("C1 · a declared scope attributes to exactly one tenant: research batch, recorded refusal scope, URL-prefix property, domain property covering one tenant", () => {
  assert.deepEqual([attributeCostEntry(entry(), { resolve, batch: "batch-a" }).tenantId], [A]);
  assert.equal(attributeCostEntry(entry({ run_kind: "paid-provider-call", scope: { tenantId: B } }), { resolve }).tenantId, B);
  const ev = new Map([prop("p1", "https://b.example/"), prop("p2", "sc-domain:a.example"), prop("p3", "sc-domain:example"), prop("p4", "*")]);
  assert.equal(attributeCostEntry(entry({ run_kind: "gsc-ingest", sources: ["p1", "p4"] }), { resolve, evidenceById: ev, origins: ORIGINS }).tenantId, B);
  const oneDomain = attributeCostEntry(entry({ run_kind: "gsc-ingest", sources: ["p2"] }), { resolve, evidenceById: ev, origins: ORIGINS });
  assert.deepEqual([oneDomain.state, oneDomain.tenantId], ["ATTRIBUTED", A], "a domain property whose covered origins are one tenant's was not attributed");
  const spanning = attributeCostEntry(entry({ run_kind: "gsc-ingest", sources: ["p3"] }), { resolve, evidenceById: ev, origins: ORIGINS });
  assert.deepEqual([spanning.state, spanning.missing], ["UNATTRIBUTED", "the ingest's properties span 2 tenants"], "a property spanning two tenants was given to one");
});

test("C1 · per-tenant totals of the four costs, with every measurable-but-unrecorded gap counted — never read as zero", () => {
  const es = [
    entry({ entry_id: "a1", money: { amountState: "MEASURED", amount: 2.5, currency: "USD", basis: "b" }, providerCalls: { state: "MEASURED", total: 3 }, founderTime: { state: "MEASURED", seconds: 10 } }),
    entry({ entry_id: "a2", money: { amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis: "b" }, founderTime: { state: "UNKNOWN", unknownKind: "MEASURABLE_BUT_NOT_RECORDED", reason: "the run never recorded its span" } }),
    entry({ entry_id: "b1", money: { amountState: "MEASURED", amount: 1, currency: "USD", basis: "b" }, providerCalls: { state: "MEASURED", total: 7 } }),
  ];
  const at = [{ entryId: "a1", state: "ATTRIBUTED", tenantId: A }, { entryId: "a2", state: "ATTRIBUTED", tenantId: A }, { entryId: "b1", state: "ATTRIBUTED", tenantId: B }];
  const t = totalsByTenant(es, at);
  assert.deepEqual({ ...t.get(A), money: { ...t.get(A).money } }, { entries: 2, money: { USD: 2.5 }, moneyZeroByTariff: 1, moneyUnknown: 0, providerCalls: 3, providerCallsUnknown: 0, founderSeconds: 10, founderUnknown: 1, measurableButNotRecorded: 1 });
  assert.equal(t.get(B).providerCalls, 7);
  assert.equal(coverageFailures(es).length, 1, "the control: the ledger's own coverage check sees the gap");
});

/* ================= C2–C5 — off by default, caps, scoped approvals, kill switch (against a test double) ================= */

const NAME = "fake-paid-provider";
const approvalFor = (tenantId) => ({ readable: true, events: 1, approvals: new Map([[`approval:${tenantId}`, { approvalId: `approval:${tenantId}`, action: "CALL_PAID_PROVIDER", resource: { resourceClass: "PAID_PROVIDER", resourceRef: paidProviderRef(NAME) }, scope: { scopeType: "TENANT", tenantId }, approverRef: "actor:owner", approverClass: "HUMAN", executorRef: "actor:cc", executorClass: "AUTOMATION", decision: "APPROVED", oneUse: false, expiresAt: null, revoked: false, consumed: false }]]) });
const auth = (tenantId, over = {}) => ({ provider: NAME, authorizedBy: "owner", date: "2026-09-29", reason: "F78 scoped-approval proof against a test double", budget: { amount: 10, currency: "USD" }, cap: { maxCalls: 2 }, tenantId, expiresOn: "2099-12-31", ...over });
function gateFor(tenantId, authorizations, ledgerDir, killSwitch = createKillSwitch()) {
  const fake = createFakePaidProvider({ name: NAME });
  const gate = createPaidProviderGate({ providers: { [NAME]: fake }, authorizations, killSwitch, ledger: createCostLedger(join(ledgerDir, `${tenantId.slice(-4)}.jsonl`)), now: () => new Date("2026-09-29T12:00:00Z"),
    spendAuthority: { actorRef: "actor:cc", approvalRef: `approval:${tenantId}`, scope: { scopeType: "TENANT", tenantId }, approvals: approvalFor(tenantId) } });
  return { gate, fake, killSwitch };
}

test("C2/C3 · with no recorded authorization every paid call is refused before it is made; past the cap it is refused before it is made", async () => {
  const dir = mkdtempSync(join(tmpdir(), "f78-"));
  try {
    const off = gateFor(A, [], dir);
    await assert.rejects(off.gate.call(NAME, {}), (e) => e instanceof PaidCallRefused && e.code === "NOT_AUTHORIZED");
    assert.equal(off.fake.callsReceived(), 0, "a paid call reached the provider with no authorization");
    const capped = gateFor(A, [auth(A)], dir);
    await capped.gate.call(NAME, {}); await capped.gate.call(NAME, {});
    await assert.rejects(capped.gate.call(NAME, {}), (e) => e.code === "CAP_WOULD_BE_EXCEEDED");
    assert.equal(capped.fake.callsReceived(), 2, "the third call reached the provider past its cap");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("C4/C6 · FIRING CONTROL: an approval authorises only its own tenant, only while unexpired — another tenant's or an expired one authorises nothing", async () => {
  assert.deepEqual(authorizationProblems(auth(A), NAME, null, { tenantId: A, now: new Date("2026-09-29") }), []);
  assert.ok(authorizationProblems(auth(A), NAME, null, { tenantId: B, now: new Date("2026-09-29") }).includes("it is not an authorization for this tenant"));
  assert.ok(authorizationProblems(auth(A, { expiresOn: "2026-09-01" }), NAME, null, { tenantId: A, now: new Date("2026-09-29") }).includes("it expired on 2026-09-01"));
  assert.ok(authorizationProblems(auth(A, { expiresOn: undefined }), NAME, null, { tenantId: A, now: new Date("2026-09-29") }).includes("it carries no expiry"));
  const dir = mkdtempSync(join(tmpdir(), "f78-"));
  try {
    /* one shared list holding ONLY tenant A's authorization: tenant B's gate must refuse */
    const b = gateFor(B, [auth(A)], dir);
    await assert.rejects(b.gate.call(NAME, {}), (e) => e.code === "AUTHORIZATION_INCOMPLETE" && /not an authorization for this tenant/.test(e.reason), "tenant A's approval authorised tenant B's call");
    assert.equal(b.fake.callsReceived(), 0);
    const expired = gateFor(A, [auth(A, { expiresOn: "2026-09-01" })], dir);
    await assert.rejects(expired.gate.call(NAME, {}), (e) => e.code === "AUTHORIZATION_INCOMPLETE" && /expired/.test(e.reason));
    /* the refusals are attributed to the tenant they were made for — never to another */
    const refusal = b.gate.refusals()[0];
    assert.deepEqual(refusal.scope, { tenantId: B });
    assert.equal(attributeCostEntry(refusal, { resolve }).tenantId, B);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("C5 · an engaged kill switch refuses the very next call, mid-run; a runaway loop stops at the cap", async () => {
  const dir = mkdtempSync(join(tmpdir(), "f78-"));
  try {
    const k = createKillSwitch();
    const g = gateFor(A, [auth(A, { cap: { maxCalls: 5 } })], dir, k);
    await g.gate.call(NAME, {});
    k.flip({ by: "owner", reason: "F78 mid-run kill proof", at: "2026-09-29T12:00:01Z" });
    await assert.rejects(g.gate.call(NAME, {}), (e) => e.code === "KILL_SWITCH_ON", "a call proceeded after the kill switch was engaged");
    const runaway = gateFor(A, [auth(A, { cap: { maxCalls: 3 } })], dir);
    let issued = 0;
    for (let i = 0; i < 50; i++) { try { await runaway.gate.call(NAME, {}); issued++; } catch (e) { if (e.code !== "CAP_WOULD_BE_EXCEEDED") throw e; } }
    assert.equal(issued, 3, "the runaway loop was not hard-stopped at its cap");
    assert.equal(runaway.fake.callsReceived(), 3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= REAL — the recorded ledgers, as they are ================= */

test("REAL · every recorded cost entry is ATTRIBUTED to one declared tenant or UNATTRIBUTED with its reason; two real tenants never share a total; every gap counted", () => {
  const r = readCostByTenant({ resolve: createTenantResolver() });
  assert.ok(r.summary.entries > 0, "EMPTY real ledger");
  for (const a of r.attributions) {
    assert.ok(["ATTRIBUTED", "UNATTRIBUTED"].includes(a.state));
    if (a.state === "ATTRIBUTED") assert.ok(typeof a.tenantId === "string" && a.via);
    else assert.ok(a.tenantId === null && a.missing);
  }
  const tenants = [...r.totals.keys()].filter((k) => k !== "UNATTRIBUTED");
  assert.ok(tenants.length >= 2, "fewer than two real tenants — separation would be proved against an empty side");
  assert.equal(new Set(tenants).size, tenants.length);
  assert.equal([...r.totals.values()].reduce((n, s) => n + s.entries, 0), r.summary.entries, "an entry was counted in two totals, or none");
  /* C1's failure on the real ledger is counted, not hidden: the ledger's own coverage check and F78's totals agree */
  assert.equal(r.summary.measurableButNotRecorded, coverageFailures([...createCostLedger(join(REPO, "runs/cost/ledger.jsonl")).readAll()]).length, "a measurable-but-unrecorded gap was hidden");
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify(r.summary)}`);
});

test("C6 · REAL: each tenant's view holds only its own totals; a tenant with no entry sees nothing — never another client's figures", () => {
  const r = readCostByTenant({ resolve: createTenantResolver() });
  const tenants = [...r.totals.keys()].filter((k) => k !== "UNATTRIBUTED");
  for (const t of tenants) assert.equal(viewForTenant(r, t).mine, r.totals.get(t));
  assert.notEqual(viewForTenant(r, tenants[0]).mine, viewForTenant(r, tenants[1]).mine);
  /* FIRING CONTROL: a tenant that owns no recorded entry, and the UNATTRIBUTED bucket itself, are never shown a total */
  assert.equal(viewForTenant(r, "tenant:ffffffffffffffffffffffffffffffff").mine, null, "a tenant with no entry was shown another tenant's totals");
  assert.equal(viewForTenant(r, "UNATTRIBUTED").mine, null);
  assert.equal(viewForTenant(r, tenants[0]).unattributedEntries, r.summary.state.UNATTRIBUTED);
});

test("C7 · THE ENTRY POINT: in a declared world it prints only its own tenant's totals, with its bound, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    /* C6: with no batch named, NO research ledger is read — a batch is read only when the scope gate has decided it for this tenant */
    const none = spawnSync(process.execPath, WORLD.argv(["bin/cost-by-tenant.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(none.status, 0, none.stdout + none.stderr);
    assert.match(none.stdout, /research ledgers 0 entr\(ies\) from 0 named batch\(es\)/, "research ledgers were read without being named to the scope gate");
    const batches = [...new Set(researchLedgers({ env }).entries.map((x) => x.batch))];
    assert.ok(batches.length > 0, "the declared world holds no research batch — this check would be vacuous");
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/cost-by-tenant.mjs", ...batches.map((b) => `--research-batch=${b}`)]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded ledgers only/);
    assert.match(ok.stdout, /this tenant only/);
    /* the printed line is exactly THIS tenant's view over the batches it named, computed in the same declared world — and a tenant of the world owning no entry sees none */
    const view = viewForTenant(readCostByTenant({ resolve: createTenantResolver({ env }), env, batches }), FIXTURE_TENANT);
    assert.ok(view.mine, "the fixture world attributes no entry to its tenant — this check would be vacuous");
    assert.match(ok.stdout, new RegExp(`this tenant\\s+entries ${view.mine.entries} · `), "the entry point printed a total other than its own tenant's");
    assert.match(ok.stdout, new RegExp(`unattributed\\s+${view.unattributedEntries} entr`));
    assert.equal(viewForTenant(readCostByTenant({ resolve: createTenantResolver({ env }), env }), SECOND_FIXTURE_TENANT).mine, null);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C7 · attribution and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/cost/tenant-attribution.mjs", "src/cost/cost-by-tenant.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
