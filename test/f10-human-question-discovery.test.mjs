/**
 * 🔴 F10 · HUMAN QUESTION DISCOVERY — the frozen acceptance's proofs (governance _handoffs 504dbb9, contract c05e6789…).
 *
 * REAL populations where they exist: the real tenant declarations, the real Search Console store, the real registry and the
 * production entry points (confined — the production audit trail is hashed before and after). Every firing control runs on
 * CONSTRUCTED, non-sensitive stand-ins: synthetic wording, synthetic keys in scratch directories outside git, confined audit
 * stores. No real label exists and none is made. Nothing here prints or asserts on a query, URL, host or tenant id: hosts and
 * tenants are taken from the declarations at run time and only ever compared, never written into this file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

import { EVIDENCE_ROLE_REGISTRY, SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { PROTOCOL, SCORING_RULE, POPULATION_SOURCE, EXCLUSION_RULES, RULES_DIGEST, COMMITTED_ACCOUNTING } from "../config/human-questions.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { sealedStoreDescriptorRefusal } from "../src/tenancy/root-registry.mjs";
import { pinnedObservationRows, decidePartition, readTenantPartition, SearchConsolePartitionRefused } from "../src/discovery/search-console-partition.mjs";
import { accountPopulation, reconcileWithCommitted, retiredMembers } from "../src/discovery/human-question-population.mjs";
import { runMechanism, outputFaults, classifyWording, CLASSES, MECHANISM_ID, MECHANISM_FILES } from "../src/discovery/human-questions.mjs";
import { allocate, ALLOCATE_SOURCE_SHA256 } from "../src/discovery/seat-allocation.mjs";
import { classificationVerdict, cohensKappa, rawAgreement } from "../src/heldout/classification-rule.mjs";
import { resolveSealedStoreRoots, sealedStoreStatus, RESERVED_ROOTS } from "../src/governance/sealed-store-roots.mjs";
import { withSyntheticSealedFixture, SYNTHETIC_SEALED_FIXTURE_ENV } from "../src/governance/synthetic-sealed-fixture.mjs";
import { governedScoring, versionHash, combinationOf, SCORER_FILES, SCORER_ID } from "../src/governance/governed-scoring.mjs";
import { executeGovernedWrite, incompleteSagas } from "../src/governance/governed-write.mjs";
import { governedAuditContext } from "../src/governance/governed-run.mjs";
import { populationCommitment, keyCommitment, freezeMechanism, requestHeldOutAccess, LINKED_ACTIONS, EVALUATION_ACTIONS } from "../src/heldout/lifecycle.mjs";
import { scorerCensus } from "../tools/scorer-caller-census.mjs";
import { realCensus, sequenceFieldCensus, trackedStoreFiles } from "../tools/human-question-census.mjs";
import { loadAllSubjectPackages } from "../src/subject-package.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();
const CONFINED_ENV = { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: process.env.NODE_TEST_WORKER_ID || "1" };
const throwsCode = (fn, code, msg) => assert.throws(fn, (e) => e?.code === code, msg);

/* The real world, read once: declarations, the pinned rows, each ACTIVE tenant's partition, the accounting. */
const RECORDS = createJsonlStore(join(REPO, POPULATION_SOURCE.storePath)).readAll();
const ROWS = pinnedObservationRows({ repo: REPO, records: RECORDS });
const RESOLVE = createTenantResolver();
const ACTIVE = RESOLVE.declarations.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId);
const PARTS = new Map(ACTIVE.map((t) => [t, readTenantPartition({ decision: decidePartition(RESOLVE, t), tenantId: t, resolve: RESOLVE, rows: ROWS })]));
const RETIRED = retiredMembers({ records: RECORDS, entry: EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "RETIRED_CONTAMINATED") });
const ACCOUNT = accountPopulation({ start: ROWS.length, partitions: new Map([...PARTS].filter(([, p]) => p.items.length)), retired: RETIRED });
const originOf = (u) => { try { return new URL(u).origin; } catch { return null; } };

/* ═══ C1 · POPULATION AND SCOPE ════════════════════════════════════════════════════════════════════════════════════════ */

test("F10 · C1 · REAL · every ACTIVE tenant's partition is decided by F02 and read through the production reader; the accounting reconciles with the committed counts, remainder 0", () => {
  const r = realCensus();
  assert.ok(r.activeTenants > 0 && r.partitionsWithRows > 0, "the real population is empty — nothing was measured");
  assert.deepEqual(Object.keys(r.decisions), ["SAME_TENANT_ALLOWED"], "an ACTIVE tenant's partition was not allowed by F02");
  assert.equal(r.partitionArithmetic.remainder, 0, "the partition arithmetic leaves a remainder");
  assert.equal(r.totals.unattributed, r.partitionArithmetic.undeclared + r.partitionArithmetic.ambiguous, "unattributed rows are not the quarantined rows");
  assert.equal(r.remainder, 0, "the accounting leaves a remainder");
  assert.deepEqual(r.diffs, [], `C1 reconciliation differs from the committed accounting: ${r.diffs.join(",")}`);
  assert.equal(r.eligibleTenants, COMMITTED_ACCOUNTING.eligibleCapacitiesDescending.length);
  const perturbed = { ...COMMITTED_ACCOUNTING, eligible: COMMITTED_ACCOUNTING.eligible + 1 };
  assert.deepEqual(reconcileWithCommitted(ACCOUNT, perturbed), ["eligible"], "CONTROL: a perturbed expectation was not detected — the reconciliation cannot fire");
});

test("F10 · C1 · REAL · a row reaches only the tenant its own stored origin resolves to — no row in two partitions, the partitions sum to the store", () => {
  const seen = new Set();
  for (const [t, p] of PARTS) {
    for (const it of p.items) {
      const a = RESOLVE({ resourceKind: "SITE_ORIGIN", resourceRef: originOf(ROWS[it.rowIndex].url) });
      assert.ok(a.state === "RESOLVED" && a.tenantId === t, "a row reached a tenant its origin does not resolve to");
      assert.ok(!seen.has(it.itemId), "a row reached two partitions");
      seen.add(it.itemId);
    }
  }
  assert.equal(seen.size, ROWS.length - ACCOUNT.totals.unattributed, "the partitions do not sum to the attributed store");
});

test("F10 · C1 · the shared store is never read whole or for no tenant, and a decision is bound to its own tenant and resource", () => {
  const [a, b] = [...PARTS.keys()].filter((t) => PARTS.get(t).items.length).slice(0, 2);
  throwsCode(() => readTenantPartition({ decision: decidePartition(RESOLVE, a), tenantId: null, resolve: RESOLVE, rows: ROWS }), "NO_TENANT_REQUESTED", "a read for no tenant was not refused");
  assert.equal(decidePartition(RESOLVE, null).allowed, false, "F02 allowed a partition for no tenant");
  throwsCode(() => readTenantPartition({ decision: decidePartition(RESOLVE, a), tenantId: b, resolve: RESOLVE, rows: ROWS }), "DECISION_FOR_ANOTHER_TENANT", "a decision for one tenant opened another tenant's partition");
  throwsCode(() => readTenantPartition({ decision: { allowed: true, outcome: "SAME_TENANT_ALLOWED", source: {}, target: { resourceKind: "COLLECTION_PARTITION" } }, tenantId: a, resolve: RESOLVE, rows: ROWS }), "SCOPE_NOT_DECIDED", "a forged decision opened a partition");
  throwsCode(() => readTenantPartition({ decision: decideForTenant(RESOLVE, a, { resourceKind: "COLLECTION_PARTITION", resourceRef: "observed:another-store", scopeClass: "TENANT" }), tenantId: a, resolve: RESOLVE, rows: ROWS }), "DECISION_FOR_ANOTHER_RESOURCE", "a decision about another collection opened this one");
  throwsCode(() => readTenantPartition({ decision: decidePartition(RESOLVE, `tenant:${"0".repeat(32)}`), tenantId: `tenant:${"0".repeat(32)}`, resolve: RESOLVE, rows: ROWS }), "SCOPE_REFUSED", "an undeclared tenant's partition was read");
  assert.ok(readTenantPartition({ decision: decidePartition(RESOLVE, a), tenantId: a, resolve: RESOLVE, rows: ROWS }).items.length > 0, "CONTROL: the lawful read returned nothing");
});

test("F10 · C1 · a planted cross-tenant stand-in is refused from the requesting tenant and a planted undeclared origin is quarantined", () => {
  const [a, b] = [...PARTS.keys()].filter((t) => PARTS.get(t).items.length).slice(0, 2);
  const originA = originOf(ROWS[PARTS.get(a).items[0].rowIndex].url);
  const originB = originOf(ROWS[PARTS.get(b).items[0].rowIndex].url);
  const planted = [
    { query: "synthetic zzq stand-in one", url: `${originB}/synthetic-stand-in-a` },
    { query: "synthetic zzq stand-in two", url: `${originA}/synthetic-stand-in-b` },
    { query: "synthetic zzq stand-in three", url: "https://undeclared.example.invalid/synthetic" },
  ];
  const p = readTenantPartition({ decision: decidePartition(RESOLVE, a), tenantId: a, resolve: RESOLVE, rows: planted, observationId: "synthetic-obs" });
  assert.deepEqual(p.items.map((i) => i.rowIndex), [1], "a planted row of another tenant reached the requesting tenant");
  assert.equal(p.arithmetic.undeclared, 1, "a planted undeclared origin was not quarantined");
  assert.equal(p.arithmetic.remainder, 0);
});

const PLANT = { EMAIL: "a.b@c.de", PHONE: "call 0123 456 7890", IDENTITY_NUMBER: "ref ab123456", POSTAL_ADDRESS: "12 high street", SENSITIVE_HEALTH_PERSONAL: "pregnant test", SENSITIVE_IMMIGRATION_STATUS: "asylum rules", SENSITIVE_CHILD: "my child", DONATION: "donate now", PAYMENT: "payment options", D4_IMMIGRATION_SUBJECT: "visa rules", D4_HEALTH_SUBJECT: "hospital visit" };
test("F10 · C1 · each owner-authorised exclusion family removes its planted stand-in, for that family, by count — operator, retired and both duplicate rules too — and a neutral stand-in stays eligible", () => {
  let n = 0;
  const item = (query) => ({ itemId: `syn:${n++}`, rowIndex: n, query });
  const tA = [...Object.values(PLANT).map(item), item("site:example.invalid thing"), item("zzq retired stand-in words"), item("zzq shared wording"), item("zzq repeated wording"), item("zzq repeated wording"), item("zzq neutral wording")];
  const tB = [item("zzq shared wording")];
  const acc = accountPopulation({ start: tA.length + tB.length, partitions: new Map([["syn:A", { items: tA }], ["syn:B", { items: tB }]]), retired: new Set(["zzq retired stand-in words"]) });
  const c = acc.perTenant.get("syn:A");
  /* Over the COMMITTED rule names (the planted stand-ins), not the configuration's own list — a dropped rule cannot leave its check. */
  for (const name of Object.keys(PLANT)) assert.equal(c.byRule[name], 1, `the planted ${name} stand-in was not removed by its own rule`);
  assert.deepEqual([c.operator, c.retired, c.crossTenantDuplicates, acc.perTenant.get("syn:B").crossTenantDuplicates, c.withinTenantDuplicates], [1, 1, 1, 1, 1], "operator, retired or a duplicate rule did not fire on its stand-in");
  assert.deepEqual(acc.eligibleItems.get("syn:A").map((i) => i.query), ["zzq repeated wording", "zzq neutral wording"], "a neutral stand-in was excluded, or an excluded one survived");
  assert.equal(acc.eligibleItems.get("syn:A")[0].sourceRowIds.length, 2, "a within-tenant duplicate was not traced to its kept item");
  assert.equal(acc.remainder, 0, "the planted accounting leaves a remainder");
});

test("F10 · C1 · a changed, re-methoded or missing source observation fails closed (REOPEN TRIGGER)", () => {
  const edited = (f) => RECORDS.map((r) => (r?.observation_id === POPULATION_SOURCE.observationId ? f({ ...r }) : r));
  throwsCode(() => pinnedObservationRows({ repo: REPO, records: edited((r) => ({ ...r, content_sha256: "0".repeat(64) })) }), "OBSERVATION_CHANGED", "a changed source observation was used");
  throwsCode(() => pinnedObservationRows({ repo: REPO, records: edited((r) => ({ ...r, method: "gsc.other" })) }), "OBSERVATION_METHOD_CHANGED", "a re-methoded source observation was used");
  throwsCode(() => pinnedObservationRows({ repo: REPO, records: RECORDS.filter((r) => r?.observation_id !== POPULATION_SOURCE.observationId) }), "OBSERVATION_ABSENT", "a missing source observation read as empty");
  assert.equal(pinnedObservationRows({ repo: REPO, records: RECORDS }).length, COMMITTED_ACCOUNTING.start, "CONTROL: the pinned observation did not load");
});

test("F10 · C1 · the exclusion rules are the committed rules as written (canonical digest re-derived from _handoffs a58a385)", () => {
  const digest = (rules) => sha(JSON.stringify(rules.map((r) => [r.name, r.re.source, r.re.flags])));
  assert.equal(digest(EXCLUSION_RULES), RULES_DIGEST, "the exclusion rules differ from the committed rule text");
  assert.notEqual(digest([...EXCLUSION_RULES.slice(0, -1), { ...EXCLUSION_RULES.at(-1), re: /x/i }]), RULES_DIGEST, "CONTROL: a changed rule kept the digest");
});

/* ═══ C3 · THE ADOPTED ALLOCATION (count-only; nothing is selected) ════════════════════════════════════════════════════ */

test("F10 · C3 · the adopted allocation, byte-for-byte as written, recomputes the committed seats from the recounted capacities — and its controls fire", () => {
  const src = fs.readFileSync(join(REPO, "src/discovery/seat-allocation.mjs"), "utf8").replace(/\r\n/g, "\n");
  const fn = src.slice(src.indexOf("export function allocate("), src.indexOf("\n}\n", src.indexOf("export function allocate(")) + 2);
  assert.equal(sha(fn), ALLOCATE_SOURCE_SHA256, "the allocation's text differs from the adopted text");
  const caps = [...ACCOUNT.perTenant].filter(([, c]) => c.eligible > 0).map(([id, c]) => ({ id, cap: c.eligible }));
  const seats = allocate(caps, SCORING_RULE.declaredItems);
  assert.deepEqual([...seats.values()].sort((x, y) => y - x), [...COMMITTED_ACCOUNTING.allocationDescending], "the recounted capacities do not allocate to the committed seats");
  assert.equal([...seats.values()].reduce((x, y) => x + y, 0), 100);
  assert.ok(caps.every((t) => seats.get(t.id) >= 1 && seats.get(t.id) <= t.cap), "a tenant is unrepresented or above capacity");
  assert.equal(caps.filter((t) => seats.get(t.id) === t.cap).length, 6, "the six-tenants-consumed-to-capacity consequence changed");
  assert.throws(() => allocate([{ id: "t:1", cap: 60 }, { id: "t:2", cap: 39 }], 100), /REFUSED/, "CONTROL: total capacity below N was not refused");
  const shuffled = [...caps].reverse();
  assert.deepEqual([...allocate(shuffled, 100)].sort(), [...seats].sort(), "the allocation depends on input order");
});

/* ═══ C2 · THE DISCOVERY MECHANISM ═════════════════════════════════════════════════════════════════════════════════════ */

test("F10 · C2 · REAL · the mechanism emits exactly one INFERRED, traced entry for every eligible item of every tenant, and the same input gives the same output", () => {
  let items = 0;
  for (const [, list] of ACCOUNT.eligibleItems) {
    if (!list.length) continue;
    const out = runMechanism(list);
    items += list.length;
    assert.equal(out.size, list.length, "an item has no entry");
    assert.deepEqual(outputFaults(list, out), [], "a real output breaks the trace law");
    assert.equal(JSON.stringify([...runMechanism(list)]), JSON.stringify([...out]), "two runs over the same input differ");
  }
  assert.equal(items, COMMITTED_ACCOUNTING.eligible, "the mechanism did not run over the whole eligible population");
});

test("F10 · C2 · an untraceable item, a class without a trace, a missing entry, an invalid class and an OBSERVED claim are each refused", () => {
  throwsCode(() => runMechanism([{ itemId: "syn:1", query: "how to learn zzq", sourceRowIds: [] }]), "ITEM_UNTRACEABLE", "an untraceable output was emitted");
  throwsCode(() => runMechanism([{ itemId: "syn:1", query: "a", sourceRowIds: ["r"] }, { itemId: "syn:1", query: "b", sourceRowIds: ["r"] }]), "ITEM_DUPLICATED", "a duplicated item was given two entries");
  const items = [{ itemId: "syn:1", query: "how to learn zzq", sourceRowIds: ["r1"] }];
  const good = runMechanism(items);
  assert.deepEqual(outputFaults(items, good), [], "CONTROL: a lawful output was faulted");
  const o = good.get("syn:1");
  assert.deepEqual(outputFaults(items, new Map([["syn:1", { ...o, trace: [] }]])), ["CLASS_WITHOUT_TRACE"], "a class without a trace was accepted");
  assert.deepEqual(outputFaults(items, new Map()), ["ITEM_WITHOUT_ENTRY"], "a missing entry was accepted");
  assert.deepEqual(outputFaults(items, new Map([["syn:1", { ...o, classes: ["GOAL", "GOAL"] }]])), ["ENTRY_CLASS_INVALID"], "a duplicated class was accepted");
  assert.deepEqual(outputFaults(items, new Map([["syn:1", { ...o, evidenceState: "OBSERVED" }]])), ["ENTRY_NOT_INFERRED"], "an inference was accepted as OBSERVED");
});

test("F10 · C2 · the mechanism's classes are the protocol's; an item that fits none gets an explicit empty list (an abstention)", () => {
  assert.deepEqual([...CLASSES], [...PROTOCOL.classes]);
  assert.deepEqual(classifyWording("zzq plain nouns only").classes, [], "an item was forced into a class");
  assert.deepEqual(classifyWording("how to learn zzq").classes, ["GOAL", "QUESTION"]);
  assert.deepEqual(classifyWording("zzq cost too high").classes, ["CONCERN"]);
  assert.deepEqual(classifyWording("difference between zzq or zzr").classes, ["CONFUSION"]);
  assert.equal(MECHANISM_ID, "human-question-discovery-v1");
});

/* ═══ C6 · THE SCORING RULE AND ITS LIMITS ═════════════════════════════════════════════════════════════════════════════ */

const P2 = { classes: ["GOAL", "QUESTION", "CONCERN", "CONFUSION"], exclusions: ["EXCLUDED_PERSONAL", "CANNOT_TELL"] };
const table = (tp, fp, fn, tn) => ({ tp, fp, fn, tn });
const rel = (tables, excluded = { EXCLUDED_PERSONAL: 0, CANNOT_TELL: 0 }) => ({ tables, declared: 100, excluded });
const V = (r) => classificationVerdict(r, { rule: SCORING_RULE, protocol: P2 });
/* Truth at D = 100: GOAL 40 positives, QUESTION 30, CONCERN 5 (rare), CONFUSION 5 (rare). */
const truth = { GOAL: 40, QUESTION: 30, CONCERN: 5, CONFUSION: 5 };
const fromErrors = (e) => Object.fromEntries(Object.entries(truth).map(([c, p]) => [c, table(p - e[c], e[c], e[c], 100 - p - e[c])]));

test("F10 · C6 · the rule's firing controls: all-NO, all-YES, coin-flip, perfect, weak-class, single-class, D = 79 — and the rare-class mechanism that finds nothing passes raw agreement and FAILS kappa (LIMIT a)", () => {
  const allNo = Object.fromEntries(Object.entries(truth).map(([c, p]) => [c, table(0, 0, p, 100 - p)]));
  const allYes = Object.fromEntries(Object.entries(truth).map(([c, p]) => [c, table(p, 100 - p, 0, 0)]));
  const perfect = Object.fromEntries(Object.entries(truth).map(([c, p]) => [c, table(p, 0, 0, 100 - p)]));
  const coin = Object.fromEntries(Object.entries(truth).map(([c, p]) => { const tp = Math.floor(p / 2), fp = Math.floor((100 - p) / 2); return [c, table(tp, fp, p - tp, 100 - p - fp)]; }));
  assert.equal(V(rel(allNo)).result, "FAIL", "all-NO was not FAIL");
  assert.equal(V(rel(allYes)).result, "FAIL", "all-YES was not FAIL");
  assert.equal(V(rel(coin)).result, "FAIL", "coin-flip was not FAIL");
  assert.equal(V(rel(perfect)).result, "PASS", "perfect agreement was not PASS");
  assert.deepEqual([V(rel(perfect)).classes.CONCERN.state, V(rel(perfect)).classes.CONCERN.reason], ["UNKNOWN", "NOT_ASSESSABLE"], "a rare class was assessed below its threshold");
  const weak = { ...perfect, QUESTION: table(15, 15, 15, 55) };
  assert.equal(V(rel(weak)).result, "FAIL", "a weak assessable class did not fail the run");
  const single = Object.fromEntries(Object.entries({ GOAL: 40, QUESTION: 5, CONCERN: 5, CONFUSION: 5 }).map(([c, p]) => [c, table(p, 0, 0, 100 - p)]));
  assert.deepEqual([V(rel(single)).result, V(rel(single)).reason], ["UNKNOWN", "FEWER_THAN_MIN_ASSESSABLE_CLASSES"], "one assessable class was reported as a result");
  const d79 = V(rel(perfect, { EXCLUDED_PERSONAL: 11, CANNOT_TELL: 10 }));
  assert.deepEqual([d79.result, d79.reason, d79.rate], ["INVALID", "DENOMINATOR_BELOW_MINIMUM", null], "D = 79 was reported as a rate");
  const d80 = V(rel(Object.fromEntries(Object.entries(perfect).map(([c, t]) => [c, table(t.tp, 0, 0, t.tn - 20)])), { EXCLUDED_PERSONAL: 10, CANNOT_TELL: 10 }));
  assert.equal(d80.denominator, 80, "CONTROL: D = 80 was not valid");
  /* LIMIT (a): rare classes at 5% — a mechanism that finds NOTHING. Raw agreement ≥ 0.80 passes it; kappa fails it. */
  const rare = Object.fromEntries(["GOAL", "QUESTION", "CONCERN", "CONFUSION"].map((c) => [c, table(0, 0, 5, 95)]));
  assert.ok(rawAgreement(rare) >= 0.8, "CONTROL: the rare-class nothing-finder does not reach raw agreement 0.80 — LIMIT (a) was not reproduced");
  assert.notEqual(V(rel(rare)).result, "PASS", "the rare-class nothing-finder passed the kappa rule");
  const rare10 = Object.fromEntries(["GOAL", "QUESTION", "CONCERN", "CONFUSION"].map((c) => [c, table(0, 0, 10, 90)]));
  assert.equal(V(rel(rare10)).result, "FAIL", "a mechanism that finds nothing passed once its classes were assessable");
  assert.equal(cohensKappa(table(0, 0, 10, 90)), 0, "kappa of a nothing-finder is not 0");
});

test("F10 · C6 · LIMIT (b) travels with a near-bar kappa; kappa with pe = 1 is UNKNOWN; tables that do not sum to D are INVALID", () => {
  const near = V(rel({ GOAL: table(30, 5, 10, 55), QUESTION: table(24, 3, 6, 67), CONCERN: table(5, 0, 0, 95), CONFUSION: table(5, 0, 0, 95) }));
  assert.ok(Object.values(near.classes).some((c) => c.nearBar === "NEAR_BAR_NOT_DECISIVE"), "a kappa near the bar was reported as decisive");
  assert.ok(near.limits.b.includes("not decisive"), "LIMIT (b) did not travel with the result");
  assert.equal(cohensKappa(table(0, 0, 0, 100)), null, "kappa with total chance agreement was given a value");
  const bad = V(rel({ GOAL: table(1, 1, 1, 1), QUESTION: table(30, 0, 0, 70), CONCERN: table(5, 0, 0, 95), CONFUSION: table(5, 0, 0, 95) }));
  assert.deepEqual([bad.result, bad.reason], ["INVALID", "TABLES_INCONSISTENT"], "inconsistent tables yielded a result");
  assert.throws(() => classificationVerdict(rel({}), { rule: { ...SCORING_RULE, kappaBar: undefined }, protocol: P2 }), /never defaults its rule/, "a verdict defaulted its rule");
  assert.deepEqual([SCORING_RULE.kappaBar, SCORING_RULE.minPositives, SCORING_RULE.minNegatives, SCORING_RULE.minAssessableClasses, SCORING_RULE.minDenominator, SCORING_RULE.declaredItems], [0.6, 10, 10, 2, 80, 100], "the frozen scoring rule's parameters changed");
});

/* ═══ C3 · STORAGE S — THE PRODUCTION DESCRIPTOR, AND THE PRODUCTION CENSUS OVER AN ISOLATED SYNTHETIC STORE ══════════════ */

test("F10 · C3 · REAL · the key store's production descriptor is a lawful F03 storage descriptor, declared and NOT REQUIRED — 0 HELD_OUT_EVIDENCE and 0 MARKING_KEY are registered", () => {
  const entries = Object.entries(SEALED_STORE_ROOTS);
  assert.equal(entries.length, 1);
  for (const [name, ref] of entries) {
    assert.equal(sealedStoreDescriptorRefusal(name, ref, { reserved: RESERVED_ROOTS }), null, "the production descriptor is not a lawful F03 descriptor");
    assert.deepEqual(Object.keys(ref).sort(), ["mechanism", "name"], "the descriptor holds more than a mechanism and a name");
  }
  assert.equal(sealedStoreDescriptorRefusal("f10-marking-key", { mechanism: "PATH", name: "X_Y_Z" }), "SEALED_STORE_REFERENCE_INVALID", "CONTROL: a path mechanism was accepted");
  assert.equal(sealedStoreDescriptorRefusal("engine", { mechanism: "ENV_REFERENCE", name: "X_Y_Z" }, { reserved: RESERVED_ROOTS }), "SEALED_STORE_NAME_INVALID", "CONTROL: a reserved root was accepted");
  assert.deepEqual(["HELD_OUT_EVIDENCE", "MARKING_KEY"].map((r) => EVIDENCE_ROLE_REGISTRY.filter((e) => e.role === r).length), [0, 0]);
  const st = sealedStoreStatus({ registry: EVIDENCE_ROLE_REGISTRY, resolution: resolveSealedStoreRoots({ env: {} }) });
  assert.deepEqual(st.map((s) => [s.status, s.fails]), [["DECLARED_NOT_REQUIRED (SEALED_STORE_REFERENCE_UNSET)", false]], "the declared, unrequired store was failed or hidden");
});

/** A synthetic sealed world in the PRODUCTION-declared key store: a scratch directory OUTSIDE git, a linked pair registered by a
 *  synthetic fixture. Items are synthetic; labels are synthetic; tenant scope is taken from real declarations at run time. */
function syntheticWorld({ items, keyRows, tenants = [...PARTS.keys()].filter((t) => PARTS.get(t).items.length).slice(0, 2) }) {
  const store = fs.mkdtempSync(join(os.tmpdir(), "f10-store-"));
  const fixDir = fs.mkdtempSync(join(os.tmpdir(), "f10-fixture-"));
  fs.mkdirSync(join(store, "set"), { recursive: true });
  fs.mkdirSync(join(store, "key"), { recursive: true });
  fs.writeFileSync(join(store, "set", "items.txt"), items.join("\n") + "\n");
  const keyText = keyRows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  fs.writeFileSync(join(store, "key", "labels.jsonl"), keyText);
  const base = { scope: "constructed stand-in", source: "test", provenance: "test", capturedAt: "2026-09-26", mandatoryReadable: false, mayTrain: false, retiredReason: null, sealed: true, tenantScope: tenants };
  const SET = { ...base, id: "synthetic:f10-set", role: "HELD_OUT_EVIDENCE", resource: { root: "f10-marking-key", pathPrefixes: ["set/"] }, contentHash: populationCommitment(items), mayEvaluate: true, maySupplyExpectedAnswer: false };
  const KEY = { ...base, id: "synthetic:f10-key", role: "MARKING_KEY", resource: { root: "f10-marking-key", pathPrefixes: ["key/"] }, contentHash: keyCommitment({ "key/labels.jsonl": Buffer.from(keyText) }), mayEvaluate: false, maySupplyExpectedAnswer: true, linkedSet: SET.id, labelVocabulary: [...PROTOCOL.classes, ...PROTOCOL.exclusions] };
  const fixture = join(fixDir, "fixture.json");
  fs.writeFileSync(fixture, JSON.stringify({ entries: [SET, KEY] }));
  const cleanup = () => { fs.rmSync(store, { recursive: true, force: true }); fs.rmSync(fixDir, { recursive: true, force: true }); };
  return { store, fixture, SET, KEY, keyText, registry: [...EVIDENCE_ROLE_REGISTRY, SET, KEY], cleanup };
}
const ENV_REF = SEALED_STORE_ROOTS["f10-marking-key"].name;

test("F10 · C3 · the PRODUCTION census over an isolated synthetic store: located → scanned and clean; required but unlocated or absent → FAILS by name — the census is never weakened", () => {
  const before = prodHashes();
  const ct = tag();
  const w = syntheticWorld({ items: [`${ct}-01`, `${ct}-02`], keyRows: [{ item: `${ct}-01`, classes: ["GOAL"] }, { item: `${ct}-02`, classes: [] }] });
  try {
    const run = (extra) => spawnSync(process.execPath, ["bin/heldout-firewall.mjs", "--check"], { cwd: REPO, encoding: "utf8", env: { ...CONFINED_ENV, [SYNTHETIC_SEALED_FIXTURE_ENV]: w.fixture, ...extra }, timeout: 180_000 });
    const located = run({ [ENV_REF]: w.store });
    assert.equal(located.status, 0, `the located synthetic store was not scanned clean: ${located.stdout.slice(-600)}`);
    assert.match(located.stdout, /SYNTHETIC SEALED FIXTURE APPLIED \(verified test context only\) — \+2 entries/);
    assert.match(located.stdout, /SEALED STORE f10-marking-key · required by 2 registered entries · LOCATED/, "the located store's status was not reported");
    assert.match(located.stdout, /MARKING_KEY\s+synthetic:f10-key .* SEALED_STORE \(f10-marking-key\) · READABLE · 1 file/, "the synthetic key was not enumerated in the manifest");
    const unset = run({ [ENV_REF]: "" });
    assert.equal(unset.status, 1, "a required but unlocated store did not fail the census");
    assert.match(unset.stdout, /SEALED_STORE_REQUIRED_BUT_UNLOCATED f10-marking-key SEALED_STORE_REFERENCE_UNSET/, "a required but unlocated store did not fail the census by name");
    assert.match(unset.stdout, /SEALED_ROLE_ROOT_NOT_SCANNED synthetic:f10-key/, "the entry in the unlocated store was not failed");
    const absent = run({ [ENV_REF]: join(w.store, "does-not-exist") });
    assert.match(absent.stdout, /SEALED_STORE_REQUIRED_BUT_UNLOCATED f10-marking-key SEALED_STORE_ABSENT/, "an absent store read as present or empty");
    for (const r of [located, unset, absent]) assert.ok(!r.stdout.includes(w.store) && !r.stdout.includes(`${ct}-01`), "the census printed a store location or a member");
  } finally { w.cleanup(); }
  assert.deepEqual(prodHashes(), before, "a confined census run changed the production trail");
});

test("F10 · C3 · a synthetic configuration is refused outside a verified test context and can never replace a real entry or descriptor", () => {
  const read = (doc) => () => JSON.stringify(doc);
  const base = { registry: EVIDENCE_ROLE_REGISTRY, declared: SEALED_STORE_ROOTS };
  throwsCode(() => withSyntheticSealedFixture({ ...base, env: { [SYNTHETIC_SEALED_FIXTURE_ENV]: "x.json" }, read: read({ entries: [] }) }), "SYNTHETIC_FIXTURE_OUTSIDE_TEST_CONTEXT", "a synthetic fixture was honoured outside a test context");
  const env = { [SYNTHETIC_SEALED_FIXTURE_ENV]: "x.json", NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: "1" };
  throwsCode(() => withSyntheticSealedFixture({ ...base, env, read: read({ entries: [{ id: "real-looking:1" }] }) }), "SYNTHETIC_ENTRY_NOT_LABELLED", "an unlabelled entry was added");
  throwsCode(() => withSyntheticSealedFixture({ ...base, env, read: read({ entries: [{ id: "synthetic:query-fixture-generator" }] }) }), "SYNTHETIC_ENTRY_OVERRIDES_REAL", "a synthetic entry replaced a real one");
  throwsCode(() => withSyntheticSealedFixture({ ...base, env, read: read({ stores: { "f10-marking-key": { mechanism: "ENV_REFERENCE", name: "OTHER_REF" } } }) }), "SYNTHETIC_STORE_NOT_LABELLED", "a synthetic descriptor replaced the real one");
  const ok = withSyntheticSealedFixture({ ...base, env, read: read({ entries: [{ id: "synthetic:x" }], stores: { "synthetic-y": { mechanism: "ENV_REFERENCE", name: "SYN_Y" } } }) });
  assert.deepEqual([ok.registry.length, Object.keys(ok.declared).length], [EVIDENCE_ROLE_REGISTRY.length + 1, Object.keys(SEALED_STORE_ROOTS).length + 1], "CONTROL: a lawful fixture was not additive");
  assert.equal(withSyntheticSealedFixture({ ...base, env: {} }).registry, EVIDENCE_ROLE_REGISTRY, "without a fixture the registry was not the real one");
});

test("F10 · C3 · no store location and no reference value is committed: every tracked file names the key store's reference only by name", () => {
  const files = execFileSync("git", ["-C", REPO, "ls-files"], { encoding: "utf8" }).split("\n").filter((p) => /\.(mjs|js|json|jsonl|md|yml|yaml|txt)$/.test(p) && !p.startsWith("runs/"));
  assert.ok(files.length > 100, "the tracked population is implausibly small");
  const assigned = new RegExp(`${ENV_REF}\\s*[=:]\\s*["']?([A-Za-z]:[\\\\/]|/)`);
  const hits = (read) => files.filter((p) => assigned.test(read(p)));
  assert.deepEqual(hits((p) => fs.readFileSync(join(REPO, p), "utf8")), [], "a store location was committed beside its reference");
  assert.deepEqual(hits((p) => (p === "config/human-questions.mjs" ? `${ENV_REF}=/tmp/planted` : "")), ["config/human-questions.mjs"], "CONTROL: a planted location was not found");
});

/* ═══ C4 · C5 · THE GOVERNED SCORING ROUTE — synthetic keys, the production route, a confined audit store ═══════════════ */

const REAL_OWNER = AUTHORITY_CORPUS.find((r) => r.status === "CURRENT" && r.issuer?.class === "OWNER");
const AUTH = [...AUTHORITY_CORPUS, { ...REAL_OWNER, authorityId: "synthetic:f10-evaluator", propositionId: "SYNTHETIC_F10_EVALUATOR", scope: ["ALMIVISIBILITY"], supersedes: [], supersededBy: [], contentHash: "e".repeat(64), issuedAt: "2026-01-01", effectiveFrom: "2026-01-01" }];
const MECH = versionHash(REPO, MECHANISM_FILES);
const SCORER = versionHash(REPO, SCORER_FILES);
const RULE_SMALL = { ...SCORING_RULE, declaredItems: 24, minDenominator: 20, minPositives: 4, minNegatives: 4 };
const tag = () => `zq${Math.random().toString(36).slice(2, 10)}`;
const items24 = (t) => Array.from({ length: 24 }, (_, i) => `${t}-${String(i + 1).padStart(2, "0")}`);
/* Key: GOAL on 1–12, QUESTION on 7–18, nothing on 19–22; items 23–24 excluded by the labeller. */
const key24 = (items) => items.map((item, i) => (i >= 22 ? { item, exclusion: i === 22 ? "EXCLUDED_PERSONAL" : "CANNOT_TELL" } : { item, classes: [...(i < 12 ? ["GOAL"] : []), ...(i >= 6 && i < 18 ? ["QUESTION"] : [])] }));
const truthFor = (key) => (ids) => new Map(ids.map((id) => { const r = key.find((k) => k.item === id); return [id, { classes: r?.classes ? [...r.classes] : [] }]; }));

function confinedAudit(label, nonce) {
  const a = governedAuditContext({ repo: REPO, env: { ...CONFINED_ENV, ALMIVISIBILITY_AUDIT_RUN: nonce }, correlationId: `run:f10:${label}:${Math.random().toString(16).slice(2)}`, authorityRef: { propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: ["ALMIVISIBILITY"] }, authorityHash: "d".repeat(64) });
  assert.equal(a.synthetic, true, "the audit context is not confined — refusing to touch the production trail");
  return { ...a, actor: "test/f10" };
}
function scoringWorld(label, { keyRows: keyFn = null, outputsFor: outFn = null, env = null, request = {}, scorerHash = SCORER, currentScorerHash = SCORER, store: storeFor = null } = {}) {
  const t = tag(), items = items24(t), keyRows = keyFn ? keyFn(key24(items)) : key24(items);
  const outputsFor = outFn ? outFn(truthFor(key24(items)), items) : truthFor(key24(items));
  const w = syntheticWorld({ items, keyRows });
  const nonce = `f10-${label}-${t}`;
  const release = fs.mkdtempSync(join(os.tmpdir(), "f10-release-"));
  const audit = confinedAudit(label, nonce);
  freezeMechanism({ audit, mechanismId: MECHANISM_ID, mechanismHash: MECH, frozenAt: "2026-09-26T10:00:00Z" });
  freezeMechanism({ audit, mechanismId: SCORER_ID, mechanismHash: SCORER, frozenAt: "2026-09-26T10:00:00Z" });
  const grant = requestHeldOutAccess({ audit, registry: w.registry, authorityRecords: AUTH, request: {
    mechanismId: MECHANISM_ID, mechanismHash: MECH, sealedSetId: w.SET.id, populationCommitment: w.SET.contentHash, protocolId: PROTOCOL.id,
    evaluatorAuthority: { propositionId: "SYNTHETIC_F10_EVALUATOR", scope: ["ALMIVISIBILITY"] }, purpose: "assessment", at: "2026-09-26T11:00:00Z", role: "evaluator",
    keySetId: w.KEY.id, keyCommitment: w.KEY.contentHash, scorerId: SCORER_ID, scorerHash, ...request } });
  const stores = resolveSealedStoreRoots({ env: env ?? { [ENV_REF]: storeFor ?? w.store } });
  const args = (au = audit) => governedScoring({ repo: release, permission: { mayWrite: true, actorRef: "actor:cc", reason: "test" }, audit: au, grant, registry: w.registry, stores,
    currentMechanismHash: MECH, currentScorerHash, outputsFor, protocol: PROTOCOL, rule: RULE_SMALL, occurredAt: "2026-09-26T12:00:00Z" });
  const run = (a = args()) => executeGovernedWrite({ ...a, onAuthorisationRefused: () => {} });
  const trail = () => audit.store.readAll().events;
  return { w, items, audit, grant, args, run, trail, release, cleanup: () => { w.cleanup(); fs.rmSync(release, { recursive: true, force: true }); fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true }); } };
}
const actionsOf = (events) => events.map((e) => e.action);

/* Re-sat to F07 Amendment 3 (governance 264c680): the key is read and checked in the PREFLIGHT, before the claim; the claim still
 * precedes every comparison and the release. */
test("F10 · C4 · one synthetic run through the governed route: authorised, attempted, key read (preflight), claimed, released, committed — in that order — with an aggregate-only release", () => {
  const s = scoringWorld("happy");
  try {
    assert.equal(s.grant.allowed, true, `CONTROL: the synthetic linked grant was refused: ${s.grant.code}`);
    const r = s.run();
    assert.equal(r.outcome, "COMMITTED", `the governed scoring run did not commit: ${JSON.stringify(r.faults)}`);
    const ev = s.trail();
    const at = (pred) => ev.findIndex(pred);
    const order = [
      at((e) => e.eventType === "AUTHORISATION_DECISION" && e.outcome === "ALLOWED"),
      at((e) => e.eventType === "GOVERNED_WRITE" && e.metadata?.governedWritePhase === "ATTEMPTED"),
      at((e) => e.action === LINKED_ACTIONS.ITEM_READ && e.reasonCode === "KEY_ITEM_READ"),
      at((e) => e.action === LINKED_ACTIONS.CLAIMED),
      at((e) => e.action === EVALUATION_ACTIONS.SCORED && e.outcome === "RECORDED"),
      at((e) => e.eventType === "GOVERNED_WRITE" && e.metadata?.governedWritePhase === "COMMITTED"),
    ];
    assert.ok(order.every((i) => i >= 0) && order.every((i, k) => k === 0 || i > order[k - 1]), `the audit sequence is out of order or incomplete: ${order.join(",")}`);
    const setRead = at((e) => e.action === LINKED_ACTIONS.ITEM_READ && e.reasonCode === "SET_ITEM_READ");
    assert.ok(setRead > order[1], "the set was read before the attempt was recorded");
    const rows = fs.readFileSync(join(s.release, "evaluation-releases/classification-releases.jsonl"), "utf8").trim().split("\n");
    assert.equal(rows.length, 1);
    const rec = JSON.parse(rows[0]);
    assert.equal(rec.combination, combinationOf(s.grant.request));
    assert.deepEqual(rec.tables.GOAL, { tp: 12, fp: 0, fn: 0, tn: 10 });
    assert.deepEqual([rec.declared, rec.denominator, rec.excluded.EXCLUDED_PERSONAL, rec.excluded.CANNOT_TELL], [24, 22, 1, 1]);
    assert.deepEqual([rec.verdict.result, rec.actor, rec.role], ["PASS", "actor:cc", "evaluator"]);
    const text = JSON.stringify(rec) + JSON.stringify(ev);
    for (const i of s.items) assert.ok(!text.includes(i), "an item identity crossed out of the boundary");
    assert.ok(!text.includes(s.w.store), "a store location crossed out of the boundary");
  } finally { s.cleanup(); }
});

test("F10 · C4 · a required store that cannot be located refuses BEFORE any attempt or claim — the one run is not spent — CONTROL: located, the same request proceeds", () => {
  const s = scoringWorld("missing-store", { env: {} });
  try {
    const r = s.run();
    assert.equal(r.outcome, "FAILED_BEFORE_COMMIT");
    assert.ok(r.faults.some((f) => f.code === "SEALED_STORE_REQUIRED_BUT_UNLOCATED" && f.why === "f10-marking-key:SEALED_STORE_REFERENCE_UNSET"), `a missing store was not refused by name: ${JSON.stringify(r.faults)}`);
    const ev = s.trail();
    assert.equal(ev.filter((e) => e.action === LINKED_ACTIONS.CLAIMED).length, 0, "a missing store spent the run");
    assert.equal(ev.filter((e) => e.metadata?.governedWritePhase === "ATTEMPTED").length, 0, "a missing store was attempted");
  } finally { s.cleanup(); }
  const ok = scoringWorld("missing-store-control");
  try { assert.equal(ok.run().outcome, "COMMITTED", "CONTROL: the located store did not proceed"); } finally { ok.cleanup(); }
});

test("F10 · C4 · a wrong key yields no result: a substituted commitment is refused at the grant, and a key changed after the grant is REFUSED before the claim — the run unspent (F07 Amendment 3)", () => {
  const s = scoringWorld("wrong-commitment", { request: { keyCommitment: "f".repeat(64) } });
  try {
    assert.equal(s.grant.code, "MARKING_KEY_COMMITMENT_MISMATCH", "a substituted key commitment was granted");
    const r = s.run();
    assert.ok(r.faults.some((f) => f.code === "NO_LINKED_GRANT"), "a refused grant reached scoring");
  } finally { s.cleanup(); }
  const t = scoringWorld("key-changed");
  try {
    /* A LAWFUL-LOOKING change: one existing item's label flipped. Every other input check still passes, so only the key's
     * commitment re-check can stop it — the proof isolates that one guard. */
    const keyPath = join(t.w.store, "key", "labels.jsonl");
    fs.writeFileSync(keyPath, fs.readFileSync(keyPath, "utf8").replace(`{"item":"${t.items[0]}","classes":["GOAL"]}`, `{"item":"${t.items[0]}","classes":[]}`));
    assert.notEqual(fs.readFileSync(keyPath, "utf8"), t.w.keyText, "CONTROL: the key was not changed");
    const r = t.run();
    assert.equal(r.outcome, "FAILED_BEFORE_COMMIT", "a changed key yielded a result");
    assert.ok(t.trail().some((e) => e.action === EVALUATION_ACTIONS.SCORED && e.outcome === "REFUSED" && e.reasonCode === "KEY_CHANGED_SINCE_GRANT"), "a changed key was not recorded REFUSED");
    assert.equal(t.trail().filter((e) => e.action === LINKED_ACTIONS.CLAIMED).length, 0, "a changed key SPENT the once-only run");
    assert.ok(!fs.existsSync(join(t.release, "evaluation-releases/classification-releases.jsonl")), "a changed key released a result");
  } finally { t.cleanup(); }
});

test("F10 · C4 · exactly ONE valid run per combination: a retry of a committed run runs nothing; a duplicate request is ALREADY_COMMITTED; a scorer changed since its freeze is refused", () => {
  const s = scoringWorld("one-run");
  try {
    assert.equal(s.run().outcome, "COMMITTED");
    const claims = () => s.trail().filter((e) => e.action === LINKED_ACTIONS.CLAIMED).length;
    assert.equal(claims(), 1);
    assert.equal(s.run().outcome, "ALREADY_COMMITTED", "a retry of a committed run ran again");
    assert.equal(claims(), 1, "a retry made a second claim");
    const lines = fs.readFileSync(join(s.release, "evaluation-releases/classification-releases.jsonl"), "utf8").trim().split("\n");
    assert.equal(lines.length, 1, "a second result was released for the same combination");
  } finally { s.cleanup(); }
  const c = scoringWorld("scorer-changed", { currentScorerHash: "a".repeat(64) });
  try {
    assert.equal(c.grant.allowed, true, "CONTROL: the grant for the frozen scorer was refused");
    const r = c.run();
    assert.ok(r.faults.some((f) => f.code === "SCORER_CHANGED_SINCE_FREEZE"), "a scorer changed since its freeze reached scoring");
    assert.equal(c.trail().filter((e) => e.action === LINKED_ACTIONS.CLAIMED).length, 0, "a changed scorer spent the run");
  } finally { c.cleanup(); }
});

test("F10 · C4 · a crash after the claim leaves an EXPOSED incomplete attempt, and the re-invocation is refused — no second valid result", () => {
  const s = scoringWorld("crash");
  try {
    const store = s.audit.store;
    let dead = false;
    const dying = { ...store, append: (d, o) => { if (dead) throw new Error("PROCESS_DIED"); const x = store.append(d, o); if (d.action === LINKED_ACTIONS.CLAIMED) dead = true; return x; }, readAll: () => store.readAll() };
    const a = s.args({ ...s.audit, store: dying });
    assert.throws(() => executeGovernedWrite({ ...a, onAuthorisationRefused: () => {} }), /PROCESS_DIED/, "CONTROL: the simulated crash did not happen");
    const open = incompleteSagas(s.trail());
    assert.equal(open.length, 1, "a crash after the claim left no exposed incomplete attempt");
    const again = s.run();
    assert.equal(again.outcome, "FAILED_BEFORE_COMMIT", "a re-invocation after a crash produced a result");
    assert.ok(s.trail().some((e) => e.action === EVALUATION_ACTIONS.SCORED && e.reasonCode === "SCORING_ALREADY_CLAIMED"), "a re-invocation after a crash was not refused as already claimed");
    assert.ok(!fs.existsSync(join(s.release, "evaluation-releases/classification-releases.jsonl")), "a crashed run released a result");
  } finally { s.cleanup(); }
});

test("F10 · C5 · a MISSING output INVALIDATES the run — it is never a false negative — CONTROL: the same run complete is released", () => {
  const missing = scoringWorld("missing-output", { outputsFor: (truth) => (ids) => { const m = truth(ids); m.delete(ids[0]); return m; } });
  try {
    assert.equal(missing.run().outcome, "FAILED_BEFORE_COMMIT", "a missing output yielded a result");
    assert.ok(missing.trail().some((e) => e.action === EVALUATION_ACTIONS.SCORED && e.outcome === "INVALID" && e.reasonCode === "INPUT_MISSING"), "a missing output was not recorded INVALID (INPUT_MISSING)");
    assert.ok(!fs.existsSync(join(missing.release, "evaluation-releases/classification-releases.jsonl")), "a run with a missing output released tables");
  } finally { missing.cleanup(); }
  const complete = scoringWorld("missing-output-control");
  try { assert.equal(complete.run().outcome, "COMMITTED", "CONTROL: the complete run was not released"); } finally { complete.cleanup(); }
});

test("F10 · C5 · an EXPLICIT, VALID negative against a positive key is a FALSE NEGATIVE; an empty list is an abstention that stays in D — CONTROL: the positive prediction is a TRUE POSITIVE", () => {
  const neg = scoringWorld("explicit-negative", { outputsFor: (truth, items) => (ids) => { const m = truth(ids); m.set(items[0], { classes: [] }); return m; } });
  try {
    assert.equal(neg.run().outcome, "COMMITTED");
    const rec = JSON.parse(fs.readFileSync(join(neg.release, "evaluation-releases/classification-releases.jsonl"), "utf8").trim());
    assert.deepEqual(rec.tables.GOAL, { tp: 11, fp: 0, fn: 1, tn: 10 }, "an explicit negative against a positive key was not counted as a false negative");
    assert.equal(rec.denominator, 22, "an abstention was removed from D");
  } finally { neg.cleanup(); }
  const pos = scoringWorld("explicit-negative-control");
  try {
    assert.equal(pos.run().outcome, "COMMITTED");
    const rec = JSON.parse(fs.readFileSync(join(pos.release, "evaluation-releases/classification-releases.jsonl"), "utf8").trim());
    assert.deepEqual(rec.tables.GOAL, { tp: 12, fp: 0, fn: 0, tn: 10 }, "CONTROL: the positive prediction was not a true positive");
  } finally { pos.cleanup(); }
  const invalid = scoringWorld("invalid-entry", { outputsFor: (truth, items) => (ids) => { const m = truth(ids); m.set(items[0], { classes: ["GOAL", "GOAL"] }); return m; } });
  try {
    assert.equal(invalid.run().outcome, "FAILED_BEFORE_COMMIT", "an invalid entry yielded a result");
    assert.ok(invalid.trail().some((e) => e.action === EVALUATION_ACTIONS.SCORED && e.reasonCode === "INPUT_INCONSISTENT"), "an invalid entry was not recorded INVALID");
  } finally { invalid.cleanup(); }
});

test("F10 · C4 · the caller census finds every production call of the aggregate scorer on the governed route — CONTROL: a planted direct call is a BYPASS", () => {
  const clean = scorerCensus();
  assert.deepEqual(clean.failures, [], `the aggregate scorer is reached off the governed route: ${clean.failures.join(" | ")}`);
  assert.ok(clean.sites.some((s) => s.cls === "GOVERNED_ROUTE" && s.kind === "CALL"), "the census found no governed call at all");
  const read = (p) => (p === "bin/heldout-evaluation.mjs" ? `${fs.readFileSync(join(REPO, p), "utf8")}\nconst r = scoreClassification({});\n` : fs.readFileSync(join(REPO, p), "utf8"));
  const planted = scorerCensus({ read });
  assert.ok(planted.failures.some((f) => f.startsWith("BYPASS bin/heldout-evaluation.mjs")), "a planted direct call was not found");
});

test("F10 · C4 · REAL entry point · the production scoring route through bin/heldout-evaluation.mjs: without --confirm nothing is requested; a required store unlocated refuses before any claim; items no partition holds give MISSING outputs and an INVALID run (ruling 1.3)", () => {
  const before = prodHashes();
  const et = tag(), eItems = items24(et);
  const w = syntheticWorld({ items: eItems, keyRows: key24(eItems) });
  const releaseFile = join(REPO, "evaluation-releases", "classification-releases.jsonl");
  /* Bounded cleanup: only a release directory THIS test created (it must never exist beforehand) is removed afterwards. */
  const releaseDirExisted = fs.existsSync(join(REPO, "evaluation-releases"));
  assert.equal(releaseDirExisted, false, "a release directory already exists in the repository — refusing to run over it");
  const nonce = `f10-e2e-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  const env = { ...CONFINED_ENV, ALMIVISIBILITY_AUDIT_RUN: nonce, [SYNTHETIC_SEALED_FIXTURE_ENV]: w.fixture, [ENV_REF]: w.store };
  /* D-EVAL-SAME-SECOND (found here, F08 recorder family, D-RECORDER-1): two runs of this entry point inside ONE second collide on
   * the write-gate event identity and the second is refused EVENT_ID_CONFLICT before it acts. Each run starts in a fresh second. */
  const nextSecond = () => { const s = Math.floor(Date.now() / 1000); while (Math.floor(Date.now() / 1000) === s) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25); };
  const bin = (args, extra = {}) => (nextSecond(), spawnSync(process.execPath, ["bin/heldout-evaluation.mjs", ...args, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", env: { ...env, ...extra }, timeout: 180_000 }));
  const scoreArgs = [`--mechanism-id=${MECHANISM_ID}`, `--mechanism-hash=${MECH}`, `--set=${w.SET.id}`, `--commitment=${w.SET.contentHash}`, `--protocol=${PROTOCOL.id}`, "--purpose=assessment", "--authority=F10_ACCEPTANCE", "--authority-scope=ALMIVISIBILITY/F10", `--key-set=${w.KEY.id}`, `--key-commitment=${w.KEY.contentHash}`, `--scorer-id=${SCORER_ID}`, `--scorer-hash=${SCORER}`];
  try {
    const dry = bin(["score", ...scoreArgs]);
    assert.equal(dry.status, 0);
    assert.match(dry.stdout, /\[dry-run\] nothing is requested and nothing is scored/, "a dry scoring run requested or scored");
    const fm = bin(["freeze", `--mechanism-id=${MECHANISM_ID}`, `--mechanism-hash=${MECH}`, "--confirm"]);
    assert.equal(fm.status, 0, `CONTROL: the mechanism freeze failed: ${fm.stdout.slice(-300)} ${fm.stderr.slice(-500)}`);
    assert.equal(bin(["freeze", `--mechanism-id=${SCORER_ID}`, `--mechanism-hash=${SCORER}`, "--confirm"]).status, 0, "CONTROL: the scorer freeze failed");
    const unlocated = bin(["score", ...scoreArgs, "--confirm"], { [ENV_REF]: "" });
    assert.match(unlocated.stdout, /SCORING FAILED_BEFORE_COMMIT · SEALED_STORE_REQUIRED_BUT_UNLOCATED\(f10-marking-key:SEALED_STORE_REFERENCE_UNSET\)/, `an unlocated store did not refuse the production run: ${unlocated.stdout.slice(-500)}${unlocated.stderr.slice(-300)}`);
    const run = bin(["score", ...scoreArgs, "--confirm"]);
    assert.match(run.stdout, /ALLOWED ACCESS_/, `the production grant was not allowed: ${run.stdout.slice(-500)}`);
    assert.match(run.stdout, /SCORING FAILED_BEFORE_COMMIT/, "items no partition holds yielded a result");
    assert.equal(run.status, 4);
    const again = bin(["score", ...scoreArgs, "--confirm"]);
    assert.match(again.stdout, /SCORING FAILED_BEFORE_COMMIT/, "a second production run for the same combination yielded a result");
    const confined = join(REPO, ".test-scratch", "audit", `run-${nonce}`, `worker-${env.NODE_TEST_WORKER_ID}`, "events.jsonl");
    const ev = fs.readFileSync(confined, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(ev.filter((e) => e.action === LINKED_ACTIONS.CLAIMED).length, 1, "the production route claimed the combination more than once, or never");
    assert.ok(ev.some((e) => e.action === EVALUATION_ACTIONS.SCORED && e.reasonCode === "INPUT_MISSING"), "missing outputs were not recorded INVALID (INPUT_MISSING) on the production route");
    assert.ok(ev.some((e) => e.action === EVALUATION_ACTIONS.SCORED && e.reasonCode === "SCORING_ALREADY_CLAIMED"), "the re-invocation was not refused as already claimed");
    assert.ok(!fs.existsSync(releaseFile), "an INVALID run wrote a release into the repository");
    for (const r of [dry, unlocated, run, again]) assert.ok(!r.stdout.includes(w.store) && !r.stdout.includes(eItems[0]), "the evaluator printed a store location or an item");
  } finally {
    w.cleanup();
    fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true });
    if (!releaseDirExisted) fs.rmSync(join(REPO, "evaluation-releases"), { recursive: true, force: true });
  }
  assert.deepEqual(prodHashes(), before, "a confined evaluator run changed the production trail");
});

/* ═══ C7 · LIKELY FOLLOW-UP QUESTIONS ══════════════════════════════════════════════════════════════════════════════════ */

test("F10 · C7 · REAL · no tracked store carries a sequence field, so the follow-up limb is NOT_MEASURED and never zero — CONTROL: a planted sequence-field stand-in FIRES the reopen trigger", () => {
  const { files, sealedExcluded } = trackedStoreFiles();
  assert.ok(files.length > 50, "the store population is implausibly small — the census is blind");
  assert.ok(sealedExcluded > 0, "no sealed path was excluded — the sealed exclusion cannot be shown to run");
  const real = sequenceFieldCensus({ files });
  assert.deepEqual([real.withSequenceField, real.trigger, real.state], [0, "NOT_FIRED", "NOT_MEASURED"], "the follow-up limb was not NOT_MEASURED on the real stores");
  assert.notEqual(real.state, "PASS");
  const planted = sequenceFieldCensus({ files: [...files, { root: "synthetic", path: "planted.jsonl", text: () => JSON.stringify({ Session_Id: "s", query: "zzq" }) }] });
  assert.deepEqual([planted.withSequenceField, planted.trigger, planted.state], [1, "FIRED", "MEASURABLE_REOPEN_REQUIRED"], "a planted sequence field did not fire the reopen trigger");
});

/* ═══ C8 · NEUTRALITY — over the stated, non-empty population of files F10 adds or changes; the scan must FIRE ════════════ */

const F10_FILES = [
  "config/human-questions.mjs", "src/discovery/search-console-partition.mjs", "src/discovery/human-question-population.mjs", "src/discovery/human-questions.mjs",
  "src/discovery/seat-allocation.mjs", "src/heldout/classification-rule.mjs", "src/governance/governed-scoring.mjs", "src/governance/sealed-store-roots.mjs",
  "src/governance/synthetic-sealed-fixture.mjs", "tools/human-question-census.mjs", "tools/scorer-caller-census.mjs", "test/f10-human-question-discovery.test.mjs",
];
async function forbiddenTerms() {
  const d = RESOLVE.declarations;
  const hosts = new Set();
  for (const a of d.attachments ?? []) { try { if (a.resourceKind === "SITE_ORIGIN") hosts.add(new URL(a.resourceRef).host.toLowerCase()); } catch { /* not a URL */ } }
  const tenants = (d.tenants ?? []).map((t) => t.tenantId.toLowerCase());
  const labels = (d.tenants ?? []).flatMap((t) => [t.label, t.displayName, t.name, t.label?.display, t.label?.text].filter((x) => typeof x === "string" && x.length >= 4)).map((x) => x.toLowerCase());
  const vocab = (await loadAllSubjectPackages()).flatMap((p) => p.vocabulary ?? []).map((v) => v.toLowerCase());
  return { hosts: [...hosts], tenants, labels, vocab };
}
const scanNeutral = (texts, terms) => {
  const hits = [];
  for (const [file, raw] of Object.entries(texts)) {
    const t = raw.toLowerCase();
    for (const h of [...terms.hosts, ...terms.tenants, ...terms.labels]) if (t.includes(h)) hits.push(file);
    for (const v of terms.vocab) if (new RegExp(`(^|[^a-z0-9])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(t)) hits.push(file);
  }
  return [...new Set(hits)];
};

test("F10 · C8 · the files F10 adds or changes carry no host, tenant id, registry label or subject vocabulary — over a stated non-empty population — CONTROL: a planted host FIRES", async () => {
  const terms = await forbiddenTerms();
  assert.ok(terms.hosts.length > 0 && terms.tenants.length > 0 && terms.vocab.length > 0, "the forbidden-term population is empty — the scan would assert over nothing");
  const texts = Object.fromEntries(F10_FILES.map((f) => [f, fs.readFileSync(join(REPO, f), "utf8")]));
  assert.equal(Object.keys(texts).length, F10_FILES.length);
  assert.deepEqual(scanNeutral(texts, terms), [], "an F10 file carries client material");
  /* Each control must be INDEPENDENT of the other lists. Measured 26 Sep 2026: all 19 declared hosts contain a subject-vocabulary
   * word, so a real host is ALSO caught by the vocabulary scan and cannot show the host branch firing (the first control could
   * not fire under sabotage F10-S15). The host branch is therefore proved with a synthetic host-shaped term added to the list. */
  const synthHost = ["zzq", "planted", "host.invalid"].join("-"); // built from parts, so this file never carries it
  assert.ok(!terms.vocab.some((v) => synthHost.includes(v)), "the synthetic host shares a vocabulary word — the control would not be independent");
  assert.deepEqual(scanNeutral({ ...texts, "src/discovery/human-questions.mjs": `${texts["src/discovery/human-questions.mjs"]}\n// ${synthHost}\n` }, { ...terms, hosts: [...terms.hosts, synthHost] }), ["src/discovery/human-questions.mjs"], "CONTROL: a planted host was not found");
  assert.deepEqual(scanNeutral({ ...texts, "src/heldout/classification-rule.mjs": `${texts["src/heldout/classification-rule.mjs"]}\n// ${terms.tenants[0]}\n` }, terms), ["src/heldout/classification-rule.mjs"], "CONTROL: a planted tenant id was not found");
  assert.deepEqual(scanNeutral({ ...texts, "config/human-questions.mjs": `${texts["config/human-questions.mjs"]}\n// ${terms.vocab[0]}\n` }, terms), ["config/human-questions.mjs"], "CONTROL: a planted subject word was not found");
});

test("F10 · residue: every scratch store, fixture and release directory is removed", () => {
  const left = fs.readdirSync(os.tmpdir()).filter((n) => /^f10-(store|fixture|release)-/.test(n));
  assert.deepEqual(left, [], "a constructed world was left behind");
  assert.ok(!fs.existsSync(join(REPO, "evaluation-releases")), "a release store was created inside the repository");
});

test("F10 · the production audit trail is byte-identical after every proof in this file", () => {
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
