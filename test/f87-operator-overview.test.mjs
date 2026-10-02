/**
 * F87 · THE OPERATOR'S CROSS-TENANT OVERVIEW (owner decision RR-130 §2) — the four proofs the owner named, each able to go red:
 *   1 the operator sees only the permitted overview, and nothing beyond it
 *   2 one tenant cannot read another tenant's detailed records
 *   3 an unattributed historical record is counted UNATTRIBUTED, never charged to a client
 *   4 a missing outcome, or a missing recovery observation, stays NOT MEASURED or COULD-NOT-PROVE
 * plus the authorisation that gates it. FIXTURE figures prove the rule fires; REAL figures come from the engine's own stores.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { operatorOverview, renderOverview, assertOverview, permittedValue, costAttribution, batchAttribution, OPERATOR_SCOPE, UNATTRIBUTED } from "../src/ops/operator-overview.mjs";
import { readOperatorOverview } from "../src/ops/operator-overview-reader.mjs";
import { watch, VERDICT, NOT_MEASURED } from "../src/ops/watchman.mjs";
import { partitionMembers } from "../src/tenancy/partition.mjs";
import { readTenantPartition, collectionMembers } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { attributeCostEntry } from "../src/cost/tenant-attribution.mjs";
import { authorise } from "../src/governance/authorisation.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const activeTenants = () => { const d = readDeclarations(); return (d.tenants?.tenants ?? d.tenants).filter((t) => t.status === "ACTIVE").map((t) => t.tenantId); };
const gw = (key, phase) => ({ eventType: "GOVERNED_WRITE", scopeType: "TENANT", metadata: { governedWriteKey: key, governedWritePhase: phase } });
const LEAK = /https?:\/\/|\b[a-z0-9-]+\.(com|org|net|io|pk|uk|au|ca|invalid|example)\b|tenant:[0-9a-f]{6,}|@|\?/i;

/* the smallest overview a watch can produce, from fixture records */
const fixtureOverview = (over = {}) => operatorOverview({
  watch: watch({ costEntries: [{ record_type: "cost_entry" }], crawlRuns: [], corrections: [], connectorObservations: [], externalObservations: [], renders: [], trailEvents: [gw("k", "ATTEMPTED"), gw("k", "COMMITTED")], facts: null, otherEvidence: 0, on: "2026-10-02" }),
  bound: { costEntries: 1 }, cost: [], batch: { population: 0, partitions: 0, inPartitions: 0, undeclared: 0, ambiguous: 0, remainder: 0 }, unscopedRecords: 0, trailScopes: { TENANT: 1 }, ...over,
});

/* ================= 1 · ONLY THE PERMITTED OVERVIEW ================= */

test("1 · FIRING CONTROL: the overview releases counts and state codes only — a URL, host, tenant id, question or sentence is REFUSED before print", () => {
  for (const ok of [0, 17, "NOT MEASURED", "KILL_SWITCH_ON", "gsc-ingest", "an engine run", "no real recorded mid-write failure — recovery UNPROVED, not passed"]) assert.ok(permittedValue(ok), `refused a permitted value: ${ok}`);
  for (const bad of ["https://a.example/p", "site.example", "tenant:0000000000000f02", "how do I renew my registration?", "The page says this. And that.", -1, 1.5, "x".repeat(200)]) assert.equal(permittedValue(bad), false, `released: ${bad}`);
  assert.doesNotThrow(() => fixtureOverview());
  /* a connector kind is a code name; a planted URL in its place is refused, not printed */
  const planted = watch({ connectorObservations: [{ collector: "x.mjs", value: { dataState: "COMPLETE" } }], on: "2026-10-02", facts: null, otherEvidence: 0, trailEvents: [] });
  planted.parts.connectors.perKind["https://client.example/page"] = { AVAILABLE: 1, UNAVAILABLE: 0, [NOT_MEASURED]: 0, of: 1 };
  assert.throws(() => operatorOverview({ watch: planted, bound: {}, cost: [], batch: null, unscopedRecords: 0, trailScopes: {} }), { code: "OVERVIEW_FIELD_NOT_PERMITTED" });
  assert.throws(() => assertOverview({ alerts: [{ condition: "a question: what is the fee?", count: 1, denominator: 1 }] }), { code: "OVERVIEW_FIELD_NOT_PERMITTED" });
  assert.throws(() => renderOverview({ scope: "GLOBAL_PRODUCT", note: "see client.example" }), { code: "OVERVIEW_FIELD_NOT_PERMITTED" }, "render printed an unchecked overview");
});

/* ================= 2 · TENANTS STAY SEPARATE ================= */

test("2 · FIRING CONTROL: a tenant's partition holds only its own members — another tenant's record is never in it, and a contested one is in neither", () => {
  const resolve = ({ resourceRef }) => (resourceRef.includes("a.invalid") ? { state: "RESOLVED", tenantId: "tenant:A" } : resourceRef.includes("b.invalid") ? { state: "RESOLVED", tenantId: "tenant:B" } : { state: "UNDECLARED" });
  resolve.declarations = { readable: true };
  const members = [
    { memberId: "m1", identities: [{ resourceKind: "SITE_ORIGIN", resourceRef: "https://a.invalid" }] },
    { memberId: "m2", identities: [{ resourceKind: "SITE_ORIGIN", resourceRef: "https://b.invalid" }] },
    { memberId: "m3", identities: [{ resourceKind: "SITE_ORIGIN", resourceRef: "https://a.invalid" }, { resourceKind: "SITE_ORIGIN", resourceRef: "https://b.invalid" }] },
    { memberId: "m4", identities: [{ resourceKind: "SITE_ORIGIN", resourceRef: "https://c.invalid" }] },
  ];
  const p = partitionMembers({ members, resolve });
  assert.deepEqual(p.partitions.get("tenant:A"), ["m1"]);
  assert.deepEqual(p.partitions.get("tenant:B"), ["m2"]);
  assert.deepEqual([p.arithmetic.ambiguous, p.arithmetic.undeclared, p.arithmetic.remainder], [1, 1, 0]);
  assert.deepEqual(batchAttribution(p.arithmetic), { of: 4, inSomeTenantsPartition: 2, tenantsWithAPartition: 2, [UNATTRIBUTED]: 2, undeclared: 1, ambiguous: 1, remainder: 0 });
});

test("2 · REAL: every declared tenant's partition of the real batch is disjoint from every other's — no member is readable by two tenants", () => {
  const resolve = createTenantResolver();
  const seen = new Map();
  let total = 0;
  for (const t of activeTenants()) {
    for (const r of readTenantPartition({ batchId: BATCH_ID, tenantId: t, resolve }).records) {
      const id = r.observation_id ?? r.url ?? JSON.stringify(r).slice(0, 80);
      assert.ok(!seen.has(id) || seen.get(id) === t, "one batch member sits in two tenants' partitions");
      seen.set(id, t); total += 1;
    }
  }
  assert.ok(total > 0, "an empty real partition set would prove nothing");
});

test("2 · the operator overview names no tenant: no declared tenant identifier, and no per-tenant figure, reaches the printed text", () => {
  const text = renderOverview(readOperatorOverview({ on: "2026-10-02", resolve: createTenantResolver() })).join("\n");
  for (const t of activeTenants()) assert.ok(!text.includes(t), "a tenant identifier was printed");
  assert.doesNotMatch(text, LEAK, "the overview printed a URL, host, identifier or question");
});

/* ================= 3 · UNATTRIBUTED STAYS UNATTRIBUTED ================= */

test("3 · FIRING CONTROL: an unscoped historical cost record is UNATTRIBUTED — never charged to a client, by default, majority or elimination", () => {
  const resolve = () => ({ state: "RESOLVED", tenantId: "tenant:ONLY" });
  /* F78's own decision, reused: a refusal that recorded no tenant scope is unattributed even when ONE tenant exists to charge */
  const a = attributeCostEntry({ entry_id: "e1", run_kind: "paid-provider-call" }, { resolve });
  assert.equal(a.state, "UNATTRIBUTED");
  const c = costAttribution([a, attributeCostEntry({ entry_id: "e2", run_kind: "render" }, { resolve }), { entryId: "e3", state: "ATTRIBUTED", tenantId: "tenant:ONLY" }]);
  assert.deepEqual([c.ATTRIBUTED, c[UNATTRIBUTED], c.of, c.tenantsWithAttributedCost], [1, 2, 3, 1]);
  /* fail closed: an "ATTRIBUTED" decision that names no tenant is not charged to anyone */
  assert.equal(costAttribution([{ entryId: "e4", state: "ATTRIBUTED", tenantId: null }])[UNATTRIBUTED], 1, "an attribution with no tenant was counted as a client's");
  assert.equal(batchAttribution({ population: 3, partitions: 1, inPartitions: 1, undeclared: 1, ambiguous: 1, remainder: 0 })[UNATTRIBUTED], 2, "an undeclared or contested batch record was charged to a tenant");
  const o = fixtureOverview({ unscopedRecords: 7 });
  assert.equal(o.attribution.unscopedStores[UNATTRIBUTED], 7);
});

/* ================= 4 · ABSENCE IS NEVER A PASS ================= */

test("4 · FIRING CONTROL: a missing outcome stays NOT MEASURED and a missing recovery observation stays COULD-NOT-PROVE — the operator scope proves no recovery", () => {
  const o = fixtureOverview();
  assert.equal(o.jobs.costNoOutcome, 1, "a cost entry with no outcome was read as complete");
  assert.equal(o.writes.recordedFailures, 0);
  assert.equal(o.writes.recoveryVerdict, VERDICT.COULD_NOT_PROVE);
  assert.match(o.writes.recoveryWhy, /recovery UNPROVED, not passed/);
  assert.notEqual(o.verdict, VERDICT.PROVED, "an overview with no recorded failure read PROVED");
  assert.equal(o.staleness.facts, NOT_MEASURED);
});

test("REAL · the operator overview over the engine's own stores: every part has its denominator, unscoped history is UNATTRIBUTED, recovery UNPROVED", () => {
  const o = readOperatorOverview({ on: "2026-10-02", resolve: createTenantResolver() });
  const a = o.attribution;
  assert.equal(a.costEntries.ATTRIBUTED + a.costEntries[UNATTRIBUTED], a.costEntries.of);
  assert.equal(a.crawlBatch.inSomeTenantsPartition + a.crawlBatch[UNATTRIBUTED] + a.crawlBatch.remainder, a.crawlBatch.of);
  assert.equal(a.crawlBatch.remainder, 0);
  /* the batch is attributed by F02's own partition rule, never by a shortcut that could charge an undeclared member to a tenant */
  const resolve = createTenantResolver();
  const p = partitionMembers({ members: collectionMembers({ batchId: BATCH_ID }).map(({ memberId, identities }) => ({ memberId, identities })), resolve }).arithmetic;
  assert.deepEqual([a.crawlBatch.inSomeTenantsPartition, a.crawlBatch[UNATTRIBUTED]], [p.inPartitions, p.undeclared + p.ambiguous], "the batch attribution is not F02's partition");
  assert.ok(p.undeclared + p.ambiguous > 0, "the real batch has no undeclared member — this check would prove nothing");
  assert.ok(a.costEntries[UNATTRIBUTED] > 0, "the real ledger's unscoped history disappeared into some tenant");
  assert.equal(o.writes.applied + o.writes.refused + o.writes.recordedFailures + o.writes.silentLoss, o.writes.allowed);
  assert.equal(Object.values(o.writes.byScope).reduce((n, k) => n + k, 0), o.writes.allowed);
  if (o.writes.recordedFailures === 0) assert.equal(o.writes.recoveryVerdict, VERDICT.COULD_NOT_PROVE);
  assert.notEqual(o.verdict, VERDICT.PROVED);
  console.log(`  REAL operator overview (count-only): ${JSON.stringify({ jobs: o.jobs, writes: { allowed: o.writes.allowed, silentLoss: o.writes.silentLoss, failures: o.writes.recordedFailures, recovery: o.writes.recoveryVerdict, byScope: o.writes.byScope }, attribution: a, verdict: o.verdict })}`);
});

/* ================= the gate and the entry point ================= */

test("the operator read is AUTHORISED only for a declared actor at GLOBAL_PRODUCT scope — a model, an unnamed actor and a tenant scope with no tenant are refused", () => {
  const ask = (actorRef, scope = { scopeType: OPERATOR_SCOPE.scopeType }) => authorise({ actorRef, action: OPERATOR_SCOPE.action, scope, resourceRef: "operations-overview", now: "2026-10-02T00:00:00Z" });
  assert.equal(ask("actor:cc").allowed, true);
  assert.equal(ask("actor:owner").allowed, true);
  assert.equal(ask("actor:model").outcome, "DENIED_BY_RULE");
  assert.equal(ask(null).outcome, "IDENTITY_MISSING");
  assert.equal(ask("actor:cc", { scopeType: "TENANT" }).outcome, "SCOPE_UNRESOLVED");
});

test("THE ENTRY POINT: refuses with no date or no lawful actor before reading; prints counts only; writes nothing", () => {
  const run = (args) => spawnSync(process.execPath, ["bin/operations-overview.mjs", ...args], { cwd: REPO, encoding: "utf8" });
  const noDate = run(["--actor=actor:cc"]);
  assert.equal(noDate.status, 1);
  assert.match(noDate.stderr, /--on=<YYYY-MM-DD> is required/);
  for (const actor of ["--actor=actor:model", "--actor=actor:nobody"]) {
    const r = run(["--on=2026-10-02", actor]);
    assert.equal(r.status, 5, `a refused actor read the overview: ${actor}`);
    assert.doesNotMatch(r.stdout, /C1 jobs/);
  }
  const ok = run(["--on=2026-10-02", "--actor=actor:cc"]);
  assert.equal(ok.status, 0, ok.stderr);
  for (const re of [/OPERATOR OVERVIEW — cross-tenant counts and states only/, /C5 writes\s+ALLOWED \d+ .* SILENT LOSS \d+ of \d+/, /recovery\s+no real recorded mid-write failure — recovery UNPROVED, not passed — COULD-NOT-PROVE/, /ATTRIBUTION\s+cost entries ATTRIBUTED \d+ \(to \d+ tenant\(s\), never named\) · UNATTRIBUTED \d+ of \d+/, /unscoped stores UNATTRIBUTED \d+/]) assert.match(ok.stdout, re);
  assert.doesNotMatch(ok.stdout + ok.stderr, LEAK, "the entry point printed a URL, host, identifier or question");
});

test("the overview and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/ops/operator-overview.mjs", "src/ops/operator-overview-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
