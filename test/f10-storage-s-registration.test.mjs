/**
 * 🔴 F10 · C3 · THE REAL REGISTRATION IN STORAGE S, UNDER THE PINNED LAW (F10 Amendment 1 C3, 2ee6c2a; owner ruling S, 84abe3d;
 * command 31320e0 — the CI-scope proposal 1f74a61 WITHDRAWN, unadopted).
 *
 * Two sealed sets are registered as HELD_OUT_EVIDENCE in the real store `f10-marking-key`, outside every repository.
 *
 *   ONE TEST HERE IS THE PRODUCTION CENSUS OF THE REAL REGISTRATION ("PRODUCTION CENSUS · REAL"). It asserts what the census
 *   must say where the owner's store is located. Where it is NOT located — CI — that test FAILS: that is C3's fail-closed red,
 *   PINNED EXACTLY in _handoffs (the registration record) and never absorbed. It is not made conditional and not skipped.
 *
 *   Every other test here is a CONTROL that holds in EVERY environment, each shown catching: a missing production store · a
 *   synthetic entry placed in the real store (cross-scope) · a registered role omitted from its census. (A substituted store is
 *   a named LIMIT of the census, not a control — see below.)
 *
 * Nothing here prints a member, a wording, a label or a store location. Confined runs only; the production trail is hashed.
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
import { sealedStoreStatus, resolveSealedStoreRoots } from "../src/governance/sealed-store-roots.mjs";
import { censusEntries, sealedManifest } from "../tools/heldout-firewall.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();
const ENV_REF = SEALED_STORE_ROOTS["f10-marking-key"].name;
const SEAL = JSON.parse(fs.readFileSync(join(REPO, "evaluation-releases", "selection-seals.jsonl"), "utf8").trim().split("\n")[0]);
const REAL = EVIDENCE_ROLE_REGISTRY.filter((e) => ["HELD_OUT_EVIDENCE", "MARKING_KEY"].includes(e.role));

function census(label, envOver) {
  const nonce = `f10s-${label}-${Math.random().toString(16).slice(2, 8)}`;
  const env = { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: process.env.NODE_TEST_WORKER_ID || "1", ALMIVISIBILITY_AUDIT_RUN: nonce, ...envOver };
  try {
    const r = spawnSync(process.execPath, ["bin/heldout-firewall.mjs", "--check"], { cwd: REPO, encoding: "utf8", env, timeout: 180_000 });
    /* The census's verdict is its FAILURES block — the lines after "FAILURES: n". (It also prints each root failure where it meets it,
     * in a different wording; counting those too would double the shape.) */
    const block = r.stdout.slice(r.stdout.lastIndexOf("\nFAILURES: "));
    return { status: r.status, out: r.stdout, fails: block.split("\n").filter((l) => /^\s+🔴 /.test(l)).map((l) => l.trim()) };
  } finally { fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true }); }
}

/* ═══ THE REGISTRATION, as data ═══════════════════════════════════════════════════════════════════════════════════════════ */

test("F10 · S · REAL · the registration: exactly two HELD_OUT_EVIDENCE entries in the real store, their commitments THOSE recorded at the one seal, no MARKING_KEY yet, and a lawful registry", () => {
  assert.deepEqual(REAL.map((e) => [e.id, e.role, e.resource.root, e.resource.pathPrefixes.join(",")]), [
    ["sealed:f10-c3-selection", "HELD_OUT_EVIDENCE", "f10-marking-key", "set/"],
    ["sealed:f10-c7-pairs", "HELD_OUT_EVIDENCE", "f10-marking-key", "pairs/"],
  ]);
  assert.deepEqual(REAL.map((e) => e.contentHash), [SEAL.setCommitment, SEAL.pairsCommitment], "a registered commitment is not the one recorded at the seal");
  assert.deepEqual([SEAL.selected, SEAL.remainder, SEAL.pairs, SEAL.tenantsConsumedToCapacity], [100, 0, 370, 6]);
  for (const e of REAL) assert.deepEqual([e.sealed, e.mayEvaluate, e.mayTrain, e.maySupplyExpectedAnswer, e.mandatoryReadable, e.tenantScope.length], [true, true, false, false, false, 9]);
  assert.deepEqual(registryErrors(EVIDENCE_ROLE_REGISTRY), []);
  assert.deepEqual(sealedStoreStatus({ registry: EVIDENCE_ROLE_REGISTRY }).map((s) => [s.store, s.requiredBy]), [["f10-marking-key", 2]], "the real store is not required by exactly the two registered sets");
});

/* ═══ THE PRODUCTION CENSUS OF THE REAL REGISTRATION — green only where the owner's store is located ═══════════════════ */

test("F10 · S · PRODUCTION CENSUS · REAL · the production census reads, enumerates and scans both registered sets in the owner's store, and passes", () => {
  const r = census("prod", {});
  assert.deepEqual(r.fails, [], `the production census did not pass: ${r.fails.join(" | ")}`);
  assert.equal(r.status, 0);
  assert.match(r.out, /SEALED STORE f10-marking-key · required by 2 registered entries · LOCATED/);
  assert.match(r.out, /HELD_OUT_EVIDENCE sealed:f10-c3-selection · 100 member\(s\) · source SEALED_PREFIX/);
  assert.match(r.out, /HELD_OUT_EVIDENCE sealed:f10-c7-pairs · 370 member\(s\) · source SEALED_PREFIX/);
});

/* ═══ THE CONTROLS — each holds in every environment, each shown catching ═════════════════════════════════════════════ */

test("F10 · S · CONTROL · MISSING PRODUCTION STORE — with the reference unset the census FAILS CLOSED, naming the store, its reason and each registered set — the exact shape CI shows", () => {
  const r = census("missing", { [ENV_REF]: "" });
  assert.equal(r.status, 1, "a missing production store did not fail the census");
  assert.deepEqual(r.fails, ["🔴 SEALED_STORE_REQUIRED_BUT_UNLOCATED f10-marking-key SEALED_STORE_REFERENCE_UNSET", "🔴 SEALED_ROLE_ROOT_NOT_SCANNED sealed:f10-c3-selection", "🔴 SEALED_ROLE_ROOT_NOT_SCANNED sealed:f10-c7-pairs"], "the fail-closed shape moved");
  assert.match(r.out, /SEALED STORE f10-marking-key · required by 2 registered entries · REQUIRED_BUT_UNLOCATED \(SEALED_STORE_REFERENCE_UNSET\)/);
});

/* 🔴 NOT A CONTROL HERE, BY MEASUREMENT (27 Sep 2026): the real reference pointed at a scratch directory with PLANTED members is
 * NOT failed by the leak census on its commitment — tools/heldout-firewall.mjs sealedRolePopulation verifies a registered
 * commitment only for a DERIVED set; a store-resident set is read, enumerated and scanned, never checked against it. F07's frozen
 * text requires enumeration, reading and scanning, not verification, so this is a named LIMIT (D-CENSUS-STORE-COMMITMENT), not an F07
 * failure. The commitment IS verified before any use: the evaluator's preflight refuses SET_CHANGED_SINCE_REGISTRATION before the
 * claim (test/f07-amendment3-paired.test.mjs). A test that could not catch the substitution is not kept as a control. */

test("F10 · S · CONTROL · CROSS-SCOPE — a synthetic entry placed in the REAL store is REFUSED, in the fixture law and at the production entry point — CONTROL: in its own synthetic store it is admitted", () => {
  const env = { NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: "1", [SYNTHETIC_SEALED_FIXTURE_ENV]: "x.json" };
  const inReal = { entries: [{ id: "synthetic:cross", resource: { root: "f10-marking-key", pathPrefixes: ["set/"] } }] };
  assert.throws(() => withSyntheticSealedFixture({ registry: EVIDENCE_ROLE_REGISTRY, declared: SEALED_STORE_ROOTS, env, read: () => JSON.stringify(inReal) }), (e) => e.code === "SYNTHETIC_ENTRY_IN_REAL_STORE", "a synthetic entry was admitted into the real store");
  const own = { entries: [{ id: "synthetic:own", resource: { root: "synthetic-own", pathPrefixes: ["set/"] } }], stores: { "synthetic-own": { mechanism: "ENV_REFERENCE", name: "SYN_OWN" } } };
  assert.equal(withSyntheticSealedFixture({ registry: EVIDENCE_ROLE_REGISTRY, declared: SEALED_STORE_ROOTS, env, read: () => JSON.stringify(own) }).synthetic.entries, 1, "CONTROL: a synthetic entry in its own store was refused");
  const dir = fs.mkdtempSync(join(os.tmpdir(), "f10s-x-"));
  try {
    const fixture = join(dir, "fixture.json");
    fs.writeFileSync(fixture, JSON.stringify(inReal));
    const r = spawnSync(process.execPath, ["bin/heldout-firewall.mjs", "--check"], { cwd: REPO, encoding: "utf8", env: { ...process.env, ...env, [SYNTHETIC_SEALED_FIXTURE_ENV]: fixture }, timeout: 180_000 });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /SYNTHETIC_ENTRY_IN_REAL_STORE/, "the production entry point admitted a synthetic entry into the real store");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("F10 · S · CONTROL · A REGISTERED ROLE OMITTED FROM ITS CENSUS — both real sets are in the census and the manifest; a planted third real set in a copy is enumerated too", () => {
  assert.deepEqual(censusEntries(EVIDENCE_ROLE_REGISTRY).filter((e) => e.role === "HELD_OUT_EVIDENCE").map((e) => e.id), ["sealed:f10-c3-selection", "sealed:f10-c7-pairs"], "a registered set is missing from the census");
  const roots = resolveSealedStoreRoots({ env: { [ENV_REF]: "" } });
  assert.deepEqual(sealedManifest(EVIDENCE_ROLE_REGISTRY, { roots: { engine: REPO }, filesOf: () => [], storeCodes: roots.codes }).map((m) => m.id), ["sealed:f10-c3-selection", "sealed:f10-c7-pairs"], "a registered set is missing from the manifest");
  const third = { ...REAL[0], id: "sealed:f10-planted-third", resource: { root: "f10-marking-key", pathPrefixes: ["third/"] }, contentHash: "a".repeat(64) };
  assert.ok(censusEntries([...EVIDENCE_ROLE_REGISTRY, third]).some((e) => e.id === third.id), "CONTROL: a newly registered set was omitted from the census");
  assert.equal(sealedStoreStatus({ registry: [...EVIDENCE_ROLE_REGISTRY, third] })[0].requiredBy, 3, "CONTROL: a newly registered set does not require its store");
});

test("F10 · S · residue and the production trail: nothing constructed is left behind, and the trail is byte-identical", () => {
  assert.deepEqual(fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith("f10s-")), []);
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
