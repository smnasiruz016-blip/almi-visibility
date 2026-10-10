/**
 * 🔴 F10 · C3 · THE REAL REGISTRATION IN STORAGE S AND THE TWO DECLARED EVIDENCE SCOPES (F10 Acceptance Amendment 2, governance
 * 370a3b3, contract be7f7386 — made AFTER the seal; no selection, population, pair, bar or scoring rule changed).
 *
 *   PRODUCTION  every real registered sealed role, on the owner machine: the proof of the REAL registration. NOT run as a passing test
 *               — a test is CI evidence, and CI never reaches the owner's store. Its passing result, with its durable ACCESS evidence,
 *               is RECORDED in _handoffs before owner labelling and again before scoring.
 *   SYNTHETIC   CI: the same governed paths over the fixture's own stores; the real sealed-store roles are NAMED as not measured.
 *
 * THE FIVE CONTROLS, each shown catching, in every environment: a missing real store · a missing synthetic store · a cross-scope
 * substitution · an omitted role · a FALSE SCOPE CLAIM. Nothing here prints a member, a wording, a label or a store location.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { EVIDENCE_ROLE_REGISTRY, SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";
import { registryErrors } from "../src/governance/evidence-roles.mjs";
import { withSyntheticSealedFixture, SYNTHETIC_SEALED_FIXTURE_ENV } from "../src/governance/synthetic-sealed-fixture.mjs";
import { sealedStoreStatus } from "../src/governance/sealed-store-roots.mjs";
import { applyCensusScope, claimFaults, censusScopeOf, NOT_MEASURED_IN_CI } from "../src/governance/census-scope.mjs";
import { censusEntries } from "../tools/heldout-firewall.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();
const ENV_REF = SEALED_STORE_ROOTS["f10-marking-key"].name;
const SEAL = JSON.parse(fs.readFileSync(join(REPO, "evaluation-releases", "selection-seals.jsonl"), "utf8").trim().split("\n")[0]);
/* RR-246: both F10 sets RETIRED (read out of band on 27 Sep; correction OOB-2026-09-27-A) — named by their store, not by a role they no longer hold */
const REAL = EVIDENCE_ROLE_REGISTRY.filter((e) => e.resource?.root === "f10-marking-key");
const TEST_ENV = { NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: process.env.NODE_TEST_WORKER_ID || "1" };

function census(label, args, envOver = {}) {
  const nonce = `f10s-${label}-${Math.random().toString(16).slice(2, 8)}`;
  const env = { ...process.env, ...TEST_ENV, ALMIVISIBILITY_AUDIT_RUN: nonce, ...envOver };
  try {
    const r = spawnSync(process.execPath, ["bin/heldout-firewall.mjs", "--check", ...args], { cwd: REPO, encoding: "utf8", env, timeout: 180_000 });
    /* The verdict is the FAILURES block (the census also prints each root failure where it meets it, in other words). */
    const block = r.stdout.slice(r.stdout.lastIndexOf("\nFAILURES: "));
    return { status: r.status, out: r.stdout, err: r.stderr, fails: block.split("\n").filter((l) => /^\s+🔴 /.test(l)).map((l) => l.trim()) };
  } finally { fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true }); }
}
/** A synthetic world in its OWN store: one synthetic held-out set, located by its own reference. */
function synthetic(tag) {
  const dir = fs.mkdtempSync(join(os.tmpdir(), "f10s-syn-"));
  fs.mkdirSync(join(dir, "set"));
  const members = [`zq${tag}alpha${sha(tag).slice(0, 8)}`, `zq${tag}beta${sha(tag).slice(8, 16)}`];
  fs.writeFileSync(join(dir, "set", "items.txt"), members.join("\n") + "\n");
  const fixture = join(os.tmpdir(), `f10s-fixture-${tag}-${Math.random().toString(16).slice(2, 8)}.json`);
  const entry = { id: `synthetic:f10s-${tag}`, role: "HELD_OUT_EVIDENCE", resource: { root: "synthetic-f10s-store", pathPrefixes: ["set/"] }, scope: "constructed stand-in", source: "test", provenance: "test", capturedAt: "2026-09-27", contentHash: "a".repeat(64), mandatoryReadable: false, mayTrain: false, mayEvaluate: true, maySupplyExpectedAnswer: false, sealed: true, retiredReason: null, tenantScope: ["tenant:" + "f1".repeat(16)] };
  fs.writeFileSync(fixture, JSON.stringify({ entries: [entry], stores: { "synthetic-f10s-store": { mechanism: "ENV_REFERENCE", name: "ALMIVISIBILITY_SYNTHETIC_F10S_STORE" } } }));
  return { dir, fixture, cleanup: () => { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(fixture, { force: true }); } };
}

/* ═══ THE REGISTRATION, as data — and the seal it came from, unchanged ════════════════════════════════════════════════════ */

test("F10 · S · REAL · the registration: exactly two HELD_OUT_EVIDENCE entries in the real store, their commitments THOSE recorded at the one seal, no MARKING_KEY yet, and a lawful registry", () => {
  assert.deepEqual(REAL.map((e) => [e.id, e.role, e.resource.root, e.resource.pathPrefixes.join(",")]), [
    ["sealed:f10-c3-selection", "RETIRED_CONTAMINATED", "f10-marking-key", "set/"],
    ["sealed:f10-c7-pairs", "RETIRED_CONTAMINATED", "f10-marking-key", "pairs/"],
  ]);
  assert.deepEqual(REAL.map((e) => e.contentHash), [SEAL.setCommitment, SEAL.pairsCommitment], "a registered commitment is not the one recorded at the seal");
  assert.deepEqual([SEAL.selected, SEAL.remainder, SEAL.pairs, SEAL.tenantsConsumedToCapacity], [100, 0, 370, 6]);
  for (const e of REAL) assert.deepEqual([e.sealed, e.mayEvaluate, e.mayTrain, e.maySupplyExpectedAnswer, e.mandatoryReadable, e.tenantScope.length, /^RETIRED 10 Oct 2026/.test(e.retiredReason)], [true, false, false, false, false, 9, true]); /* RR-246: retired, never to evaluate again, still sealed */
  assert.deepEqual(registryErrors(EVIDENCE_ROLE_REGISTRY), []);
  assert.deepEqual(sealedStoreStatus({ registry: EVIDENCE_ROLE_REGISTRY }).map((s) => [s.store, s.requiredBy]), [["f10-marking-key", 2]]);
});

/* ═══ THE SYNTHETIC SCOPE — what CI runs, and what its result says ═══════════════════════════════════════════════════════ */

test("F10 · S · SYNTHETIC SCOPE · the census names its scope on its first and last lines, states REAL REGISTERED POPULATION NOT MEASURED IN CI, names both real sets as not measured, and never resolves the real store — even with the real reference set", () => {
  const w = synthetic("scope");
  const elsewhere = fs.mkdtempSync(join(os.tmpdir(), "f10s-elsewhere-"));
  try {
    const r = census("syn", ["--scope=synthetic"], { [SYNTHETIC_SEALED_FIXTURE_ENV]: w.fixture, ALMIVISIBILITY_SYNTHETIC_F10S_STORE: w.dir, [ENV_REF]: elsewhere });
    assert.match(r.out, /^CENSUS SCOPE: SYNTHETIC — the declared synthetic store\(s\) only · REAL REGISTERED POPULATION NOT MEASURED IN CI: 2 real sealed-store role\(s\) not scanned/m);
    for (const id of ["sealed:f10-c3-selection", "sealed:f10-c7-pairs"]) assert.match(r.out, new RegExp(`NOT MEASURED IN THIS SCOPE \\(SYNTHETIC\\) — ${id}`));
    assert.match(r.out, /SEALED STORE synthetic-f10s-store · required by 1 registered entry · LOCATED/);
    assert.doesNotMatch(r.out, /SEALED STORE f10-marking-key/, "the SYNTHETIC scope resolved the real store");
    assert.match(r.out, new RegExp(`FAILURES: \\d+ · SCOPE SYNTHETIC · ${NOT_MEASURED_IN_CI}`));
    assert.ok(!r.out.includes(w.dir) && !r.out.includes(elsewhere), "a store location was printed");
  } finally { w.cleanup(); fs.rmSync(elsewhere, { recursive: true, force: true }); }
});

/* ═══ THE FIVE CONTROLS ══════════════════════════════════════════════════════════════════════════════════════════════════ */

test("F10 · S · CONTROL 1 · MISSING REAL STORE — the PRODUCTION census with the real reference unset FAILS CLOSED, naming the store and both registered sets, and carries its scope", () => {
  const r = census("missing-real", [], { [ENV_REF]: "" });
  assert.equal(r.status, 1, "a missing real store did not fail the production census");
  assert.deepEqual(r.fails, ["🔴 SEALED_STORE_REQUIRED_BUT_UNLOCATED f10-marking-key SEALED_STORE_REFERENCE_UNSET", "🔴 SEALED_ROLE_ROOT_NOT_SCANNED sealed:f10-c3-selection", "🔴 SEALED_ROLE_ROOT_NOT_SCANNED sealed:f10-c7-pairs"], "the fail-closed shape moved");
  assert.match(r.out, /^CENSUS SCOPE: PRODUCTION/m);
  assert.match(r.out, /FAILURES: 3 · SCOPE PRODUCTION/);
});

test("F10 · S · CONTROL 2 · MISSING SYNTHETIC STORE — the SYNTHETIC census with its own store unset FAILS CLOSED, naming the synthetic store — it is never read as empty", () => {
  const w = synthetic("missing");
  try {
    const r = census("missing-syn", ["--scope=synthetic"], { [SYNTHETIC_SEALED_FIXTURE_ENV]: w.fixture, ALMIVISIBILITY_SYNTHETIC_F10S_STORE: "" });
    assert.equal(r.status, 1, "a missing synthetic store did not fail the synthetic census");
    assert.ok(r.fails.includes("🔴 SEALED_STORE_REQUIRED_BUT_UNLOCATED synthetic-f10s-store SEALED_STORE_REFERENCE_UNSET"), `the missing synthetic store was not named: ${r.fails.join(" | ")}`);
  } finally { w.cleanup(); }
});

test("F10 · S · CONTROL 3 · CROSS-SCOPE SUBSTITUTION — a fixture in the PRODUCTION scope, a synthetic store resolving to the real store's directory, and a synthetic entry in the real store are each REFUSED", () => {
  const w = synthetic("cross");
  try {
    const prodWithFixture = census("x-prod", [], { [SYNTHETIC_SEALED_FIXTURE_ENV]: w.fixture, ALMIVISIBILITY_SYNTHETIC_F10S_STORE: w.dir });
    assert.equal(prodWithFixture.status, 2, "a synthetic fixture was applied in the PRODUCTION scope");
    assert.match(prodWithFixture.err, /SYNTHETIC_FIXTURE_IN_PRODUCTION_SCOPE/);
    const disguised = census("x-dir", ["--scope=synthetic"], { [SYNTHETIC_SEALED_FIXTURE_ENV]: w.fixture, ALMIVISIBILITY_SYNTHETIC_F10S_STORE: w.dir, [ENV_REF]: w.dir });
    assert.equal(disguised.status, 2, "a synthetic store resolving to the real store's directory was censused");
    assert.match(disguised.err, /CROSS_SCOPE_STORE/);
    const env = { ...TEST_ENV, [SYNTHETIC_SEALED_FIXTURE_ENV]: "x.json" };
    assert.throws(() => withSyntheticSealedFixture({ registry: EVIDENCE_ROLE_REGISTRY, declared: SEALED_STORE_ROOTS, env, read: () => JSON.stringify({ entries: [{ id: "synthetic:cross", resource: { root: "f10-marking-key", pathPrefixes: ["set/"] } }] }) }), (e) => e.code === "SYNTHETIC_ENTRY_IN_REAL_STORE", "a synthetic entry was admitted into the real store");
    assert.throws(() => censusScopeOf(["--scope=guess"]), (e) => e.code === "CENSUS_SCOPE_UNKNOWN", "a guessed scope was accepted");
  } finally { w.cleanup(); }
});

test("F10 · S · CONTROL 4 · OMITTED ROLE — every registered real role is carried in BOTH scopes: scanned in PRODUCTION, NAMED as not measured in SYNTHETIC — a planted third real set is carried too", () => {
  const eff = { registry: EVIDENCE_ROLE_REGISTRY, declared: SEALED_STORE_ROOTS, synthetic: null };
  const prod = applyCensusScope({ scope: "PRODUCTION", realDeclared: SEALED_STORE_ROOTS, effective: eff, env: {} });
  assert.deepEqual(prod.registry.filter((e) => e.resource?.root === "f10-marking-key").map((e) => e.id), ["sealed:f10-c3-selection", "sealed:f10-c7-pairs"], "a real set is missing from the PRODUCTION scope"); /* RR-246: by store, not by role — retired and still carried */
  const syn = applyCensusScope({ scope: "SYNTHETIC", realDeclared: SEALED_STORE_ROOTS, effective: eff, env: TEST_ENV });
  assert.deepEqual(syn.notMeasured, ["sealed:f10-c3-selection", "sealed:f10-c7-pairs"], "a real set was omitted instead of named as not measured");
  const third = { ...REAL[0], id: "sealed:f10-planted-third", role: "HELD_OUT_EVIDENCE", mayEvaluate: true, retiredReason: null, resource: { root: "f10-marking-key", pathPrefixes: ["third/"] } }; /* RR-246: a newly registered EVALUABLE set */
  const eff3 = { ...eff, registry: [...EVIDENCE_ROLE_REGISTRY, third] };
  assert.ok(applyCensusScope({ scope: "PRODUCTION", realDeclared: SEALED_STORE_ROOTS, effective: eff3, env: {} }).registry.some((e) => e.id === third.id), "CONTROL: a newly registered set was omitted from PRODUCTION");
  assert.ok(applyCensusScope({ scope: "SYNTHETIC", realDeclared: SEALED_STORE_ROOTS, effective: eff3, env: TEST_ENV }).notMeasured.includes(third.id), "CONTROL: a newly registered set was omitted from the SYNTHETIC not-measured list");
  assert.ok(censusEntries([...EVIDENCE_ROLE_REGISTRY, third]).some((e) => e.id === third.id), "CONTROL: a newly registered set was omitted from the enumeration");
});

test("F10 · S · CONTROL 5 · FALSE SCOPE CLAIM — a SYNTHETIC result presented as PRODUCTION proof, a result with no scope, a verdict without its not-measured statement, and a failing result presented as a pass are each REFUSED — CONTROL: the true claim is accepted", () => {
  const w = synthetic("claim");
  try {
    const r = census("claim", ["--scope=synthetic"], { [SYNTHETIC_SEALED_FIXTURE_ENV]: w.fixture, ALMIVISIBILITY_SYNTHETIC_F10S_STORE: w.dir });
    assert.ok(claimFaults(r.out, { scope: "PRODUCTION", pass: true }).includes("FALSE_SCOPE_CLAIM"), "a synthetic result was accepted as production proof");
    assert.deepEqual(claimFaults(r.out.replace(/^CENSUS SCOPE: .*$/m, ""), { scope: "SYNTHETIC" }), ["SCOPE_ABSENT"], "a result with no scope was accepted");
    assert.ok(claimFaults(r.out.replace(/ · REAL REGISTERED POPULATION NOT MEASURED IN CI \(/, " ("), { scope: "SYNTHETIC" }).includes("SCOPE_NOT_CARRIED"), "a synthetic verdict line without its not-measured statement was accepted");
    const failing = census("claim-fail", [], { [ENV_REF]: "" });
    assert.ok(claimFaults(failing.out, { scope: "PRODUCTION", pass: true }).includes("NOT_A_PASS"), "a failing production result was accepted as a pass");
    assert.deepEqual(claimFaults(r.out, { scope: "SYNTHETIC", pass: r.fails.length === 0 }), [], "CONTROL: the true synthetic claim was refused");
  } finally { w.cleanup(); }
});

test("F10 · S · residue and the production trail: nothing constructed is left behind, and the trail is byte-identical", () => {
  assert.deepEqual(fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith("f10s-")), []);
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
