/**
 * 🔴 F07 · AMENDMENT 1 (governance a0b7e4b) — THE LEAK CENSUS ENUMERATES EVERY REGISTERED SEALED HELD-OUT ROLE.
 *
 * The frozen F07 text always claimed a leak census over any declared held-out set and its labels; the production entry
 * point enumerated only RETIRED_CONTAMINATED. These proofs drive the SAME function the production entry point calls
 * (`censusNewRoles`), never a copy.
 *
 * 🔴 THE REAL POPULATION IS ZERO. The real registry holds no HELD_OUT_EVIDENCE and no MARKING_KEY entry, so the new limbs
 * cannot be proved on real material: that state is NOT_MEASURED (F06), and it is asserted as such below. Every firing
 * control runs on a CONSTRUCTED, non-sensitive stand-in registered only inside a scratch tree, removed afterwards.
 * No real sealed material is opened. The production audit trail is hashed before and after.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { registryErrors } from "../src/governance/evidence-roles.mjs";
import { governedGuardSink, governedAuditContext } from "../src/governance/governed-run.mjs";
import { auditClassOf, diagnosticGuardSink } from "../src/governance/guard-audit.mjs";
import { readUnsealed, SealedPathRefused } from "../src/governance/sealed-paths.mjs";
import { populationCommitment, EVALUATION_ACTIONS } from "../src/heldout/lifecycle.mjs";
import { EVIDENCE_STATES } from "../src/evidence/evidence-state.mjs";
import { censusEntries, censusNewRoles, sealedRolePopulation, extractMembers, SEALED_CENSUS_ROLES, ROLE_DISPOSITION, CENSUS_READ_ACTION, scan } from "../tools/heldout-firewall.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();

/* Constructed, non-sensitive stand-ins. Never a real query, label or answer. */
const HO_MEMBER = "synthetic amendment held-out stand-in item";
const MK_MEMBER = "synthetic-item-0007,label-stand-in-alpha";

/** A scratch tree with a sealed held-out prefix, a sealed marking-key prefix and a clean governance file. */
function tree({ plantHeldOut = false, plantKey = false } = {}) {
  const dir = fs.mkdtempSync(join(REPO, ".test-scratch", "f07a-"));
  fs.mkdirSync(join(dir, "vault-heldout"), { recursive: true });
  fs.mkdirSync(join(dir, "vault-key"), { recursive: true });
  fs.mkdirSync(join(dir, "test"), { recursive: true });
  fs.writeFileSync(join(dir, "vault-heldout", "items.txt"), `${HO_MEMBER}\n`);
  fs.writeFileSync(join(dir, "vault-key", "labels.jsonl"), `${JSON.stringify({ row: MK_MEMBER })}\n`);
  fs.writeFileSync(join(dir, "AlmiVisibility_RULING_CLEAN.md"), "An ordinary governance note that quotes nothing held out.\n");
  if (plantHeldOut) fs.writeFileSync(join(dir, "AlmiVisibility_RULING_LEAK.md"), `A note that copied an item: ${HO_MEMBER}.\n`);
  if (plantKey) fs.writeFileSync(join(dir, "test", "fixture-leak.test.mjs"), `// a fixture that copied a label row: ${MK_MEMBER}\n`);
  const files = () => fs.readdirSync(dir, { recursive: true }).filter((p) => fs.statSync(join(dir, p)).isFile()).map((p) => String(p).replace(/\\/g, "/"));
  return { dir, files };
}
const HO_ENTRY = Object.freeze({
  id: "synthetic:f07a-heldout", role: "HELD_OUT_EVIDENCE", resource: Object.freeze({ root: "t", pathPrefixes: Object.freeze(["vault-heldout/"]) }),
  scope: "constructed stand-in", source: "test", provenance: "test", capturedAt: "2026-09-25", contentHash: populationCommitment(["item-1"]),
  mandatoryReadable: false, mayTrain: false, mayEvaluate: true, maySupplyExpectedAnswer: false, sealed: true, retiredReason: null,
  // F07 Amendment 2 (051feb9): every held-out role declares its tenant scope — the stricter registry law, intent unchanged.
  tenantScope: Object.freeze(["GLOBAL_PRODUCT"]),
});
const MK_ENTRY = Object.freeze({
  ...HO_ENTRY, id: "synthetic:f07a-key", role: "MARKING_KEY", resource: Object.freeze({ root: "t", pathPrefixes: Object.freeze(["vault-key/"]) }), maySupplyExpectedAnswer: true,
  // F07 Amendment 2 (051feb9): a marking key names the one set it marks.
  linkedSet: "synthetic:f07a-heldout",
});
const run = (registry, t, audit = diagnosticGuardSink({ actor: "test" })) =>
  censusNewRoles({ registry, root: "t", base: t.dir, files: t.files(), roots: { t: t.dir }, filesOf: () => t.files(), derivers: {}, commitment: populationCommitment, audit });
const confinedCount = () => governedAuditContext({ repo: REPO, correlationId: `run:f07a-count:${process.pid}` }).store.readAll().events.length;

/* ═══ THE REAL POPULATION — stated, and NOT_MEASURED ═════════════════════════════════════════════════════════════════════ */

test("F07A · REAL · the census enumerates every sealed role of the REAL registry: RETIRED 1, HELD_OUT_EVIDENCE 2, MARKING_KEY 0 — the new roles' real population is OBSERVED (F10's two sealed sets) — CONTROL: the same enumeration counts a constructed HELD_OUT_EVIDENCE and MARKING_KEY added to a copy of the real registry, and that copy is a VALID registry", () => {
  assert.ok(EVIDENCE_ROLE_REGISTRY.length > 0, "the real registry is empty — nothing can be enumerated");
  const real = censusEntries(EVIDENCE_ROLE_REGISTRY);
  const count = (list, role) => list.filter((e) => e.role === role).length;
  assert.deepEqual(SEALED_CENSUS_ROLES, ["RETIRED_CONTAMINATED", "HELD_OUT_EVIDENCE", "MARKING_KEY"]);
  /* 0 → 2 HELD_OUT_EVIDENCE since 27 Sep 2026 (F10's one selection, sealed and registered in storage S — engine cecf880 and its registration commit): the real population is no longer zero. At F07's verifications (A1–A3) it WAS zero, and those
   * records stay true for what they measured. No MARKING_KEY exists until the owner's keys are complete. */
  assert.deepEqual([count(real, "RETIRED_CONTAMINATED"), count(real, "HELD_OUT_EVIDENCE"), count(real, "MARKING_KEY")], [1, 2, 0], "a registered held-out set or marking key was not enumerated");
  const realNewRolePopulation = count(real, "HELD_OUT_EVIDENCE") + count(real, "MARKING_KEY");
  const state = realNewRolePopulation === 0 ? "NOT_MEASURED" : "OBSERVED";
  assert.ok(EVIDENCE_STATES.includes(state));
  assert.equal(state, "OBSERVED", "the registered sets were not enumerated as a real population");
  // CONTROL — the same enumeration is capable of a non-zero answer on real registry structure
  const copy = [...EVIDENCE_ROLE_REGISTRY, HO_ENTRY, MK_ENTRY];
  assert.deepEqual(registryErrors(copy), [], "the constructed entries are not lawful registry structure");
  const widened = censusEntries(copy);
  assert.deepEqual([count(widened, "RETIRED_CONTAMINATED"), count(widened, "HELD_OUT_EVIDENCE"), count(widened, "MARKING_KEY")], [1, 3, 1], "CONTROL: a registered held-out set and marking key were not enumerated");
});

test("F07A · REAL · the production entry point prints every sealed role's population — RETIRED 1, HELD_OUT_EVIDENCE 2, MARKING_KEY 0 — confined run, production trail unchanged", () => {
  const before = prodHashes();
  const r = spawnSync(process.execPath, ["bin/heldout-firewall.mjs", "--check"], { cwd: REPO, encoding: "utf8", env: { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: "1" }, timeout: 120_000 });
  assert.equal(r.status, 0, r.stdout.slice(-400));
  assert.match(r.stdout, /SEALED ROLES ENUMERATED — RETIRED_CONTAMINATED 1 · HELD_OUT_EVIDENCE 2 · MARKING_KEY 0/, "the production entry point does not enumerate the registered sealed roles");
  assert.match(r.stdout, /MARKING_KEY — 0 registered: its real population is NOT_MEASURED/, "a zero was not reported as NOT_MEASURED");
  assert.doesNotMatch(r.stdout, /HELD_OUT_EVIDENCE — 0 registered/, "a registered population was reported as zero");
  assert.match(r.stdout, /RETIRED SET retired:held-out-set-3d4951d6673301bc · 61 member\(s\)/, "the retired census changed");
  assert.deepEqual(prodHashes(), before, "the confined run changed the production trail");
});

/* ═══ THE FIRING CONTROLS — a constructed held-out set and its labels, registered, exercised, seen to FIRE, removed ═══════ */

test("F07A · FIRE · a planted leak of a registered HELD_OUT_EVIDENCE member into governance text is FOUND, named by role, category and path — never by content — and the clean tree reports zero", () => {
  const clean = tree();
  const dirty = tree({ plantHeldOut: true });
  try {
    const population = sealedRolePopulation(HO_ENTRY, { roots: { t: dirty.dir }, filesOf: () => dirty.files(), commitment: populationCommitment });
    assert.ok(population.ok && population.members.length >= 1, "the constructed held-out population is empty — the control could not fire");
    const c = run([HO_ENTRY], clean);
    assert.equal(c.results.length, 1, "the registered held-out set was not enumerated");
    assert.deepEqual(c.failures, [], "a clean tree reported a leak");
    const d = run([HO_ENTRY], dirty);
    assert.deepEqual(d.failures, [`${ROLE_DISPOSITION.HELD_OUT_EVIDENCE} AlmiVisibility_RULING_LEAK.md`], "the planted held-out leak was not found");
    assert.equal(d.results[0].rows[0].category, "MANDATORY_GOVERNANCE");
    const everything = JSON.stringify(d);
    assert.ok(!everything.toLowerCase().includes(HO_MEMBER.toLowerCase()), "the detector returned the leaked content");
    assert.ok(!d.results[0].rows.some((row) => row.path.startsWith("vault-heldout/")), "the sealed store itself was scanned as a leak");
  } finally { fs.rmSync(clean.dir, { recursive: true, force: true }); fs.rmSync(dirty.dir, { recursive: true, force: true }); }
});

test("F07A · FIRE · a planted leak of a MARKING_KEY label row into a test fixture is FOUND as marking-key content, named by role, category and path — never by content — and the clean tree reports zero", () => {
  const clean = tree();
  const dirty = tree({ plantKey: true });
  try {
    assert.ok(sealedRolePopulation(MK_ENTRY, { roots: { t: dirty.dir }, filesOf: () => dirty.files() }).members.length >= 1, "the constructed marking key is empty — the control could not fire");
    assert.deepEqual(run([MK_ENTRY], clean).failures, [], "a clean tree reported a marking-key leak");
    const d = run([MK_ENTRY], dirty);
    assert.deepEqual(d.failures, [`${ROLE_DISPOSITION.MARKING_KEY} test/fixture-leak.test.mjs`], "the planted marking-key leak was not found");
    assert.equal(d.results[0].rows[0].category, "ACTIVE_TEST");
    assert.ok(!JSON.stringify(d).toLowerCase().includes(MK_MEMBER.toLowerCase()), "the detector returned the leaked label row");
  } finally { fs.rmSync(clean.dir, { recursive: true, force: true }); fs.rmSync(dirty.dir, { recursive: true, force: true }); }
});

test("F07A · FIRE · residue: every constructed tree is removed — zero scratch left behind", () => {
  const leftovers = fs.existsSync(join(REPO, ".test-scratch")) ? fs.readdirSync(join(REPO, ".test-scratch")).filter((n) => n.startsWith("f07a-")) : [];
  assert.deepEqual(leftovers, [], "a constructed held-out tree was left behind");
});

/* ═══ FAIL CLOSED — a registered entry the census cannot read or verify FAILS it; nothing is skipped ═══════════════════ */

test("F07A · FAIL-CLOSED · a bare path, an unscanned root, an empty prefix, an unregistered derivation and a derivation that does not reproduce its commitment each FAIL the census by name — CONTROL: a lawful entry passes", () => {
  const t = tree();
  try {
    const cases = [
      [{ ...HO_ENTRY, id: "c:bare", resource: { root: "t", path: "vault-heldout/items.txt" } }, "SEALED_ROLE_NOT_BEHIND_A_PREFIX"],
      [{ ...HO_ENTRY, id: "c:root", resource: { root: "elsewhere", pathPrefixes: ["vault-heldout/"] } }, "SEALED_ROLE_ROOT_NOT_SCANNED"],
      [{ ...HO_ENTRY, id: "c:empty", resource: { root: "t", pathPrefixes: ["nothing-here/"] } }, "SEALED_CONTENT_UNREADABLE"],
      [{ ...HO_ENTRY, id: "c:rule", resource: { root: "derived", derivation: { observationId: "o", rule: "NO_SUCH_RULE" } } }, "UNREGISTERED_DERIVATION"],
      [{ ...HO_ENTRY, id: "c:mismatch", resource: { root: "derived", derivation: { observationId: "o", rule: "STANDIN" } }, contentHash: "0".repeat(64) }, "DERIVATION_MISMATCH"],
      [{ ...HO_ENTRY, id: "c:unsealed", sealed: false }, "SEALED_ROLE_NOT_SEALED"],
    ];
    assert.ok(cases.length > 0);
    for (const [entry, code] of cases) {
      const r = censusNewRoles({ registry: [entry], root: "t", base: t.dir, files: t.files(), roots: { t: t.dir }, filesOf: () => t.files(), derivers: { STANDIN: () => ({ members: [HO_MEMBER], others: [] }) }, commitment: populationCommitment, audit: diagnosticGuardSink({ actor: "test" }) });
      assert.deepEqual(r.failures, [`${code} ${entry.id}`], `${entry.id} was not refused as ${code}`);
    }
    // CONTROL — a lawful derived entry reproduces its commitment and passes. Its stand-in member occurs nowhere in the tree
    // (a derived entry declares no sealed prefix, so a member lying unsealed in the tree would rightly be a leak).
    const DERIVED_MEMBER = "synthetic derived stand-in found nowhere";
    const lawful = { ...HO_ENTRY, id: "c:lawful", resource: { root: "derived", derivation: { observationId: "o", rule: "STANDIN2" } }, contentHash: populationCommitment([DERIVED_MEMBER]) };
    const ok = censusNewRoles({ registry: [lawful], root: "t", base: t.dir, files: t.files(), roots: { t: t.dir }, filesOf: () => t.files(), derivers: { STANDIN2: () => ({ members: [DERIVED_MEMBER], others: [] }) }, commitment: populationCommitment, audit: diagnosticGuardSink({ actor: "test" }) });
    assert.deepEqual(ok.failures, [], "CONTROL: a lawful derived entry was refused");
    assert.equal(ok.results[0].source, "DERIVED");
  } finally { fs.rmSync(t.dir, { recursive: true, force: true }); }
});

/* ═══ ACCESS — the in-boundary read is recorded, durably, and is not an evaluator access ════════════════════════════════ */

test("F07A · ACCESS · the census's in-boundary read of a sealed role is recorded as exactly ONE durable ACCESS in a confined store, under an action the evaluation lifecycle never counts as held-out access", () => {
  const t = tree();
  try {
    const sink = governedGuardSink({ repo: REPO, correlationId: `run:f07a-access:${process.pid}:${Date.now()}`, now: "2026-09-25", actor: "bin/heldout-firewall.mjs" });
    const before = confinedCount();
    const r = run([HO_ENTRY], t, sink);
    assert.equal(r.results[0].ok, true);
    assert.equal(confinedCount(), before + 1, "the in-boundary read was not recorded exactly once");
    assert.equal(auditClassOf({ eventType: "EVALUATION", action: CENSUS_READ_ACTION, outcome: "ALLOWED" }), "ACCESS");
    assert.equal(auditClassOf({ eventType: "EVALUATION", action: "HELDOUT_ACCESS", outcome: "ALLOWED" }), "ACCESS", "CONTROL: the evaluator's own access class changed");
    assert.equal(auditClassOf({ eventType: "EVALUATION", action: "SOMETHING_ELSE", outcome: "ALLOWED" }), "GOVERNED_CHANGE", "CONTROL: an unrelated evaluation action changed class");
    assert.notEqual(CENSUS_READ_ACTION, EVALUATION_ACTIONS.ACCESS, "the census read would be counted as an evaluator access");
    const last = governedAuditContext({ repo: REPO, correlationId: `run:f07a-count:${process.pid}` }).store.readAll().events.at(-1);
    assert.equal(last.action, CENSUS_READ_ACTION);
    assert.equal(last.metadata.family, "G", "the census read carries the lifecycle's family and could be mistaken for evaluation access");
  } finally { fs.rmSync(t.dir, { recursive: true, force: true }); }
});

/* ═══ THE IMPLEMENTER NEVER READS A MARKING KEY — an ordinary loader is refused before the filesystem ════════════════════ */

test("F07A · SEALED · an ordinary loader is REFUSED a marking-key file before any read — CONTROL: the same loader reads an ordinary file in the same tree", () => {
  const t = tree();
  try {
    const audit = diagnosticGuardSink({ actor: "test" });
    assert.throws(() => readUnsealed({ registry: [MK_ENTRY], root: "t", base: t.dir, path: "vault-key/labels.jsonl", audit }), (e) => e instanceof SealedPathRefused && e.code === "SEALED_PATH_REFUSED");
    assert.throws(() => readUnsealed({ registry: [HO_ENTRY], root: "t", base: t.dir, path: "vault-heldout/items.txt", audit }), (e) => e instanceof SealedPathRefused && e.code === "SEALED_PATH_REFUSED");
    assert.equal(audit.events.filter((e) => e.action === "READ_SEALED_PATH" && e.outcome === "REFUSED").length, 2, "a refused read was not recorded");
    assert.match(String(readUnsealed({ registry: [MK_ENTRY], root: "t", base: t.dir, path: "AlmiVisibility_RULING_CLEAN.md", audit })), /ordinary governance note/, "CONTROL: the loader could not read an ordinary file");
  } finally { fs.rmSync(t.dir, { recursive: true, force: true }); }
});

/* ═══ UNCHANGED — the retired census and every existing caller of scan() ══════════════════════════════════════════════════ */

test("F07A · UNCHANGED · scan() names a retired finding exactly as before unless a new role asks otherwise — members are extracted from lines and JSON strings of at least 8 characters", () => {
  const t = tree({ plantHeldOut: true });
  try {
    const base = { registry: [HO_ENTRY], root: "t", base: t.dir, files: t.files(), members: [HO_MEMBER.toLowerCase()], fragments: [], audit: diagnosticGuardSink({ actor: "test" }) };
    assert.deepEqual(scan(base).failures.map((f) => f.disposition), ["FAIL_RETIRED_PAYLOAD"], "the default disposition changed for every existing caller");
    assert.deepEqual(scan({ ...base, payloadDisposition: ROLE_DISPOSITION.HELD_OUT_EVIDENCE }).failures.map((f) => f.disposition), ["FAIL_HELD_OUT_PAYLOAD"]);
    assert.deepEqual(extractMembers(`short\n${JSON.stringify({ a: "long enough string", b: ["tiny", "another long one"] })}\nplain line of text`).sort(), ["another long one", "long enough string", "plain line of text"]);
  } finally { fs.rmSync(t.dir, { recursive: true, force: true }); }
});

test("F07A · the production audit trail is byte-identical after every proof in this file", () => {
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
