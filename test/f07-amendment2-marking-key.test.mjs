/**
 * 🔴 F07 · AMENDMENT 2 (governance 051feb9) — THE MARKING-KEY EVALUATOR: linked grant · governed read · aggregate score ·
 * complete census, in BOTH marking-key location shapes (a git-tracked sealed path, and a governed sealed store outside any
 * git tree).
 *
 * These proofs drive the SAME functions the production entry points call (src/heldout/lifecycle.mjs, tools/heldout-
 * firewall.mjs, src/governance/sealed-paths.mjs), never a copy. Every firing control runs on CONSTRUCTED, non-sensitive
 * stand-ins registered only inside scratch trees and in-memory audit stores, removed afterwards.
 *
 * 🔴 THE REAL POPULATION IS ZERO: no HELD_OUT_EVIDENCE and no MARKING_KEY is registered, so these limbs are NOT_MEASURED on
 * real material (F06). No real sealed material is opened. The production audit trail is hashed before and after.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, relative } from "node:path";

import { EVIDENCE_ROLE_REGISTRY, SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { registryErrors } from "../src/governance/evidence-roles.mjs";
import { diagnosticGuardSink } from "../src/governance/guard-audit.mjs";
import { readUnsealed, SealedPathRefused } from "../src/governance/sealed-paths.mjs";
import { resolveSealedStoreRoots, storeFiles } from "../src/governance/sealed-store-roots.mjs";
import {
  populationCommitment, mechanismHash, freezeMechanism, requestHeldOutAccess, readHeldOutItem, readHeldOutDerivation,
  scoreClassification, keyCommitment, LINKED_ACTIONS, EVALUATION_ACTIONS, MAX_PROTOCOL_TOKENS,
} from "../src/heldout/lifecycle.mjs";
import { countingStore } from "../tools/heldout-access-census.mjs";
import { censusNewRoles, sealedManifest, ROLE_DISPOSITION } from "../tools/heldout-firewall.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();

/* ── Constructed, non-sensitive stand-ins. Never a real query, label or answer. ── */
const ITEMS = ["syn-item-01", "syn-item-02", "syn-item-03", "syn-item-04", "syn-item-05", "syn-item-06"];
const PROTOCOL = Object.freeze({ classes: ["ALPHA", "BETA"], exclusions: ["SKIPPED"] });
const KEY_ROWS = [
  { item: "syn-item-01", classes: ["ALPHA"] },
  { item: "syn-item-02", classes: ["ALPHA", "BETA"] },
  { item: "syn-item-03", classes: [] },
  { item: "syn-item-04", exclusion: "SKIPPED" },
  { item: "syn-item-05", classes: ["BETA"] },
  { item: "syn-item-06", classes: ["ALPHA"] },
];
const OUTPUTS = () => new Map([["syn-item-01", ["ALPHA"]], ["syn-item-02", ["ALPHA"]], ["syn-item-03", ["BETA"]], ["syn-item-04", ["ALPHA"]], ["syn-item-05", ["BETA"]], ["syn-item-06", []]].map(([i, c]) => [i, { classes: c }]));
/* The tables, worked by hand from the six rows above (item 04 excluded, so D = 5):
 *   ALPHA truth {01,02,06}, said {01,02}      → tp 2 · fp 0 · fn 1 · tn 2
 *   BETA  truth {02,05},    said {03,05}      → tp 1 · fp 1 · fn 1 · tn 2 */
const EXPECTED = { ALPHA: { tp: 2, fp: 0, fn: 1, tn: 2 }, BETA: { tp: 1, fp: 1, fn: 1, tn: 2 } };
const TENANTS = Object.freeze(["tenant:" + "a1".repeat(16), "tenant:" + "b2".repeat(16)]);
const KEY_TEXT = KEY_ROWS.map((r) => JSON.stringify(r)).join("\n") + "\n";

const MECH = mechanismHash({ "mechanism.mjs": "export const m = (x) => x; // synthetic amendment-2 mechanism" });
const SCORER = mechanismHash({ "scorer.mjs": "export const s = (x) => x; // synthetic amendment-2 scorer" });
const REAL_OWNER = AUTHORITY_CORPUS.find((r) => r.status === "CURRENT" && r.issuer?.class === "OWNER");
const AUTH = [...AUTHORITY_CORPUS, { ...REAL_OWNER, authorityId: "synthetic:f07a2-evaluator", propositionId: "SYNTHETIC_F07A2_EVALUATOR", scope: ["ALMIVISIBILITY"], supersedes: [], supersededBy: [], contentHash: "e".repeat(64), issuedAt: "2026-01-01", effectiveFrom: "2026-01-01" }];
const lifeAudit = (store = countingStore()) => ({ store, actor: "test/f07a2", softwareVersion: "engine:test", correlationId: `run:f07a2:${Math.random()}`, authorityRef: { propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: ["ALMIVISIBILITY"] }, authorityHash: "d".repeat(64) });

/**
 * A world: a scratch tree holding the sealed SET (always git-tracked shape) and — shape "G" — the KEY under a tracked
 * prefix, or — shape "S" — the KEY in a governed sealed store OUTSIDE the tree (an OS temporary directory).
 */
function world(shape = "G", { keyText = KEY_TEXT, items = ITEMS, keyTenants = TENANTS } = {}) {
  const tree = fs.mkdtempSync(join(REPO, ".test-scratch", "f07a2-"));
  fs.mkdirSync(join(tree, "sealed-set"), { recursive: true });
  fs.writeFileSync(join(tree, "sealed-set", "items.txt"), items.join("\n") + "\n");
  fs.writeFileSync(join(tree, "AlmiVisibility_RULING_CLEAN.md"), "An ordinary governance note that quotes nothing held out.\n");
  const store = shape === "S" ? fs.mkdtempSync(join(os.tmpdir(), "f07a2-store-")) : null;
  const keyBase = shape === "S" ? store : tree;
  const keyRel = shape === "S" ? "keys/labels.jsonl" : "sealed-key/labels.jsonl";
  fs.mkdirSync(join(keyBase, keyRel.split("/")[0]), { recursive: true });
  fs.writeFileSync(join(keyBase, keyRel), keyText);
  const treeFiles = () => fs.readdirSync(tree, { recursive: true }).map(String).filter((p) => fs.statSync(join(tree, p)).isFile()).map((p) => p.replace(/\\/g, "/")).sort();
  const keyRoot = shape === "S" ? "vault" : "t";
  const SET = Object.freeze({
    id: "synthetic:f07a2-set", role: "HELD_OUT_EVIDENCE", resource: Object.freeze({ root: "t", pathPrefixes: Object.freeze(["sealed-set/"]) }),
    scope: "constructed stand-in", source: "test", provenance: "test", capturedAt: "2026-09-26", contentHash: populationCommitment(items),
    mandatoryReadable: false, mayTrain: false, mayEvaluate: true, maySupplyExpectedAnswer: false, sealed: true, retiredReason: null, tenantScope: TENANTS,
  });
  const KEY = Object.freeze({
    ...SET, id: "synthetic:f07a2-key", role: "MARKING_KEY", resource: Object.freeze({ root: keyRoot, pathPrefixes: Object.freeze([keyRel.split("/")[0] + "/"]) }),
    contentHash: keyCommitment({ [keyRel]: Buffer.from(keyText) }), maySupplyExpectedAnswer: true, mayEvaluate: false, linkedSet: SET.id, tenantScope: keyTenants,
    labelVocabulary: Object.freeze([...PROTOCOL.classes, ...PROTOCOL.exclusions]),
  });
  const roots = { t: tree, ...(store ? { vault: store } : {}) };
  const filesOf = (r) => (r === "t" ? treeFiles() : r === "vault" ? storeFiles(store) : []);
  const foreignRoots = store ? { vault: store } : {};
  const cleanup = () => { fs.rmSync(tree, { recursive: true, force: true }); if (store) fs.rmSync(store, { recursive: true, force: true }); };
  return { tree, store, keyRel, keyBase, SET, KEY, registry: [SET, KEY], roots, filesOf, foreignRoots, treeFiles, cleanup };
}
const linkedRequest = (w, over = {}) => ({
  mechanismId: "synthetic-f07a2-mechanism", mechanismHash: MECH, sealedSetId: w.SET.id, populationCommitment: w.SET.contentHash,
  protocolId: "synthetic-protocol-a2", evaluatorAuthority: { propositionId: "SYNTHETIC_F07A2_EVALUATOR", scope: ["ALMIVISIBILITY"] },
  purpose: "assessment", at: "2026-09-26T12:00:00Z", keySetId: w.KEY.id, keyCommitment: w.KEY.contentHash, scorerId: "synthetic-f07a2-scorer", scorerHash: SCORER, ...over,
});
function frozenAudit({ scorer = true } = {}) {
  const a = lifeAudit();
  freezeMechanism({ audit: a, mechanismId: "synthetic-f07a2-mechanism", mechanismHash: MECH, frozenAt: "2026-09-26T11:00:00Z" });
  if (scorer) freezeMechanism({ audit: a, mechanismId: "synthetic-f07a2-scorer", mechanismHash: SCORER, frozenAt: "2026-09-26T11:00:00Z" });
  return a;
}
const grantFor = (a, w, registry = w.registry, over = {}) => requestHeldOutAccess({ audit: a, registry, request: linkedRequest(w, over), authorityRecords: AUTH });
const score = (a, w, g, over = {}) => scoreClassification({ audit: a, grant: g, currentMechanismHash: MECH, registry: w.registry, roots: w.roots, filesOf: w.filesOf, outputs: OUTPUTS(), protocol: PROTOCOL, foreignRoots: w.foreignRoots, ...over });
const events = (a, action) => a.store.events.filter((e) => e.action === action);

/* ═══ REAL — the population, stated, and NOT_MEASURED ═══════════════════════════════════════════════════════════════════ */

test("F07A2 · REAL · the real registry holds 2 HELD_OUT_EVIDENCE and 0 MARKING_KEY, both in the one declared governed sealed store, which they now REQUIRE — CONTROL: a constructed linked pair added to a copy is lawful and enumerated", () => {
  const count = (reg, role) => reg.filter((e) => e.role === role).length;
  /* 0/0 → 2/0 since 27 Sep 2026 (F10's one selection, sealed and registered in storage S — engine cecf880 and its registration commit). At F07 Amendment 2's verification the population WAS zero; that record stays true for what it measured. */
  assert.deepEqual([count(EVIDENCE_ROLE_REGISTRY, "HELD_OUT_EVIDENCE"), count(EVIDENCE_ROLE_REGISTRY, "MARKING_KEY"), Object.keys(SEALED_STORE_ROOTS).length], [2, 0, 1]);
  assert.deepEqual(EVIDENCE_ROLE_REGISTRY.filter((e) => e.resource?.root === "f10-marking-key").map((e) => e.id), ["sealed:f10-c3-selection", "sealed:f10-c7-pairs"], "the declared store holds other than the two registered F10 sets");
  const w = world("S");
  try {
    assert.deepEqual(registryErrors([...EVIDENCE_ROLE_REGISTRY, ...w.registry]), [], "CONTROL: the constructed linked pair is not lawful registry structure");
    assert.equal(sealedManifest([...EVIDENCE_ROLE_REGISTRY, ...w.registry], { roots: w.roots, filesOf: w.filesOf }).length, 4, "CONTROL: the constructed pair was not enumerated beside the two real sets");
  } finally { w.cleanup(); }
});

/* ═══ CLAUSE 1 · LINKED GRANT ═══════════════════════════════════════════════════════════════════════════════════════════ */

test("F07A2 · C1 · a linked grant binds ONE set, its ONE linked distinct key, both commitments, the tenant scope, the evaluator and a frozen scorer in its own recorded event, before any access", () => {
  const w = world("G");
  try {
    const a = frozenAudit();
    const g = grantFor(a, w);
    assert.equal(g.allowed, true, `CONTROL: the lawful linked request was refused (${g.code})`);
    const ev = a.store.events.find((e) => e.eventId === g.eventId);
    for (const k of ["keySetId", "keyCommitment", "scorerId", "scorerHash", "evaluatorAuthority", "scopeDigest", "sealedSetId", "mechanismHash"]) assert.ok(ev.metadata[k] && ev.metadata[k] !== "INVALID", `the grant does not bind ${k}`);
    assert.equal(ev.metadata.keySetId, w.KEY.id);
    assert.equal(ev.metadata.keyCommitment, w.KEY.contentHash);
    assert.equal(events(a, LINKED_ACTIONS.ITEM_READ).length, 0, "an item was read before the grant was recorded");
  } finally { w.cleanup(); }
});

test("F07A2 · C1 · the grant FAILS CLOSED, recorded, on a missing link, a substituted key, substituted key content, either side unregistered, a non-key, a crossed tenant scope, a shared artefact, two keys, an unfrozen scorer and an incomplete linked request", () => {
  const w = world("G");
  try {
    const other = { ...w.SET, id: "synthetic:f07a2-other-set", resource: { root: "t", pathPrefixes: ["other-set/"] } };
    const otherKey = { ...w.KEY, id: "synthetic:f07a2-other-key", linkedSet: other.id, resource: { root: "t", pathPrefixes: ["other-key/"] } };
    const cases = [
      ["the link is missing", [w.SET, { ...w.KEY, linkedSet: undefined }], {}, "MARKING_KEY_NOT_LINKED"],
      ["a substituted key (another set's key)", [w.SET, w.KEY, other, otherKey], { keySetId: otherKey.id, keyCommitment: otherKey.contentHash }, "MARKING_KEY_NOT_LINKED"],
      ["substituted key content", w.registry, { keyCommitment: "f".repeat(64) }, "MARKING_KEY_COMMITMENT_MISMATCH"],
      ["the key unregistered", [w.SET], {}, "MARKING_KEY_UNDECLARED"],
      ["the set unregistered", [w.KEY], {}, "SET_UNDECLARED"],
      ["a non-key named as the key", [w.SET, other], { keySetId: other.id }, "MARKING_KEY_NOT_A_KEY"],
      ["the pair crosses tenants", [w.SET, { ...w.KEY, tenantScope: [TENANTS[0]] }], {}, "PAIR_CROSSES_TENANTS"],
      ["the key IS the set's artefact", [w.SET, { ...w.KEY, resource: w.SET.resource }], {}, "MARKING_KEY_NOT_DISTINCT"],
      ["two keys for one set", [w.SET, w.KEY, { ...w.KEY, id: "synthetic:f07a2-key-2", resource: { root: "t", pathPrefixes: ["key-2/"] } }], {}, "SET_KEY_AMBIGUOUS"],
      ["an incomplete linked request", w.registry, { scorerId: undefined }, "REQUEST_FIELD_INVALID"],
    ];
    assert.ok(cases.length >= 10);
    for (const [why, registry, over, code] of cases) {
      const a = frozenAudit();
      const g = grantFor(a, w, registry, over);
      assert.deepEqual([g.allowed, g.code], [false, code], `${why}: expected ${code}`);
      assert.equal(a.store.events.filter((e) => e.action === EVALUATION_ACTIONS.ACCESS && e.outcome === "REFUSED").length, 1, `${why}: the refusal was not recorded exactly once`);
    }
    const unfrozen = frozenAudit({ scorer: false });
    assert.equal(grantFor(unfrozen, w).code, "SCORER_NOT_FROZEN", "a grant bound a scorer that was never frozen");
    assert.equal(grantFor(frozenAudit(), w).allowed, true, "CONTROL: the lawful request is allowed");
  } finally { w.cleanup(); }
});

test("F07A2 · C1 · the registry law: a key with no link, a link to nothing, a crossed tenant scope, a tenant-blind held-out role, two keys for one set and a malformed vocabulary are each refused by name — CONTROL: the lawful pair is clean", () => {
  const w = world("G");
  try {
    const codes = (reg) => registryErrors(reg).map((e) => e.code).filter((c) => !["DUAL_ROLE"].includes(c));
    assert.deepEqual(codes(w.registry), [], "CONTROL: the lawful pair was refused");
    assert.ok(codes([w.SET, { ...w.KEY, linkedSet: undefined }]).includes("MARKING_KEY_LINK_MISSING"), "a key with no link was not refused");
    assert.ok(codes([w.SET, { ...w.KEY, linkedSet: "synthetic:nowhere" }]).includes("MARKING_KEY_LINK_UNRESOLVED"), "a key linked to nothing was not refused");
    assert.ok(codes([w.SET, { ...w.KEY, tenantScope: [TENANTS[1]] }]).includes("PAIR_CROSSES_TENANTS"), "a pair across tenant scopes was not refused");
    assert.ok(codes([{ ...w.SET, tenantScope: undefined }, w.KEY]).includes("TENANT_SCOPE_UNDECLARED"), "a tenant-blind held-out role was not refused");
    assert.ok(codes([w.SET, w.KEY, { ...w.KEY, id: "k2", resource: { root: "t", pathPrefixes: ["k2/"] } }]).includes("SET_HAS_MORE_THAN_ONE_KEY"), "two keys for one set were not refused");
    assert.ok(codes([w.SET, { ...w.KEY, labelVocabulary: [""] }]).includes("LABEL_VOCABULARY_MALFORMED"), "a malformed vocabulary was not refused");
  } finally { w.cleanup(); }
});

/* ═══ CLAUSE 2 · GOVERNED READ ══════════════════════════════════════════════════════════════════════════════════════════ */

test("F07A2 · C2 · every read of either side is recorded as a durable ACCESS BEFORE the value exists, in both key shapes; a read whose record cannot be made never happens; an unlinked grant cannot read the key", () => {
  for (const shape of ["G", "S"]) {
    const w = world(shape);
    try {
      const a = frozenAudit();
      const g = grantFor(a, w);
      assert.equal(g.allowed, true);
      for (const [root, base, path] of [["t", w.tree, "sealed-set/items.txt"], [w.KEY.resource.root, w.keyBase, w.keyRel]]) {
        let recordedWhenRead = -1; // the FIRST read counts: a second read must not mask an early one (found by F7B-S5)
        const before = events(a, LINKED_ACTIONS.ITEM_READ).length;
        const bytes = readHeldOutItem({ audit: a, grant: g, currentMechanismHash: MECH, registry: w.registry, root, base, path, foreignRoots: w.foreignRoots, read: (p) => { if (recordedWhenRead === -1) recordedWhenRead = events(a, LINKED_ACTIONS.ITEM_READ).length; return fs.readFileSync(p); } });
        assert.ok(bytes.length > 0);
        assert.equal(recordedWhenRead, before + 1, `shape ${shape}: ${path} was read before its ACCESS was recorded`);
      }
      // a record that cannot be made: the store refuses the append — the file must never be opened
      const failing = { ...a, store: { ...a.store, append: (d) => { if (d.action === LINKED_ACTIONS.ITEM_READ) throw new Error("STORE_UNAVAILABLE"); return a.store.append(d); } } };
      let opened = false;
      assert.throws(() => readHeldOutItem({ audit: failing, grant: g, currentMechanismHash: MECH, registry: w.registry, root: w.KEY.resource.root, base: w.keyBase, path: w.keyRel, foreignRoots: w.foreignRoots, read: () => { opened = true; return Buffer.from(""); } }));
      assert.equal(opened, false, `shape ${shape}: the key was read although its ACCESS could not be recorded`);
      // an UNLINKED grant (no key named) covers the set only
      const u = requestHeldOutAccess({ audit: a, registry: w.registry, request: { ...linkedRequest(w), keySetId: undefined, keyCommitment: undefined, scorerId: undefined, scorerHash: undefined }, authorityRecords: AUTH });
      assert.equal(u.allowed, true, "CONTROL: the unlinked request for the set is allowed");
      assert.throws(() => readHeldOutItem({ audit: a, grant: u, currentMechanismHash: MECH, registry: w.registry, root: w.KEY.resource.root, base: w.keyBase, path: w.keyRel, foreignRoots: w.foreignRoots, read: () => { throw new Error("READ"); } }), { code: "ITEM_OUTSIDE_GRANTED_SET" });
    } finally { w.cleanup(); }
  }
});

test("F07A2 · C2 · C4 · an ORDINARY governed loader handed a path that climbs into a governed sealed store is REFUSED before read and recorded — CONTROL: the same path with the store not declared would be read (the refusal is the store check, nothing else)", () => {
  const w = world("S");
  try {
    const climbing = relative(w.tree, join(w.store, w.keyRel));
    assert.ok(climbing.startsWith(".."), "the stand-in store is not outside the reader's root");
    const audit = diagnosticGuardSink({ actor: "test" });
    assert.throws(() => readUnsealed({ registry: w.registry, root: "t", base: w.tree, path: climbing, audit, foreignRoots: w.foreignRoots }), (e) => e instanceof SealedPathRefused && e.code === "SEALED_PATH_REFUSED");
    assert.equal(audit.events.filter((e) => e.action === "READ_SEALED_PATH" && e.outcome === "REFUSED").length, 1, "the refused read was not recorded");
    assert.ok(String(readUnsealed({ registry: w.registry, root: "t", base: w.tree, path: climbing, audit, foreignRoots: {} })).length > 0, "CONTROL: without the store check the climbing path is readable — so the check is what refuses");
  } finally { w.cleanup(); }
});

test("F07A2 · C2 · a derived held-out set is read through the lifecycle, recorded before its deriver runs, and checked against its commitment", () => {
  const w = world("G");
  try {
    let ranWith = -1;
    const DSET = { ...w.SET, id: "synthetic:f07a2-derived", resource: { root: "derived", derivation: { observationId: "obs", rule: "STANDIN" } } };
    const a = frozenAudit();
    const g = requestHeldOutAccess({ audit: a, registry: [DSET], request: { ...linkedRequest(w), sealedSetId: DSET.id, keySetId: undefined, keyCommitment: undefined, scorerId: undefined, scorerHash: undefined }, authorityRecords: AUTH });
    assert.equal(g.allowed, true);
    const items = readHeldOutDerivation({ audit: a, grant: g, currentMechanismHash: MECH, registry: [DSET], derivers: { STANDIN: () => { ranWith = events(a, LINKED_ACTIONS.ITEM_READ).length; return { items: ITEMS }; } } });
    assert.deepEqual(items, ITEMS);
    assert.equal(ranWith, 1, "the deriver ran before its read was recorded");
    assert.throws(() => readHeldOutDerivation({ audit: a, grant: g, currentMechanismHash: MECH, registry: [DSET], derivers: { STANDIN: () => ({ items: ITEMS.slice(1) }) } }), { code: "DERIVATION_MISMATCH" });
  } finally { w.cleanup(); }
});

/* ═══ CLAUSE 3 · AGGREGATE SCORE ════════════════════════════════════════════════════════════════════════════════════════ */

test("F07A2 · C3 · the frozen scorer releases EXACTLY the hand-worked per-class TP/FP/FN/TN tables, the denominator and the exclusion counts — identical in both key shapes — and nothing tied to an item", () => {
  const released = [];
  for (const shape of ["G", "S"]) {
    const w = world(shape);
    try {
      const a = frozenAudit();
      const r = score(a, w, grantFor(a, w));
      assert.deepEqual(r.tables, EXPECTED, `shape ${shape}: the tables differ from the hand-worked ones`);
      assert.deepEqual([r.denominator, r.declared, r.excluded.SKIPPED], [5, 6, 1]);
      assert.equal(r.evidenceState, "OBSERVED");
      const ev = events(a, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === "RECORDED");
      assert.equal(ev.length, 1);
      assert.equal(ev[0].metadata.c_ALPHA, "tp2-fp0-fn1-tn2");
      assert.equal(ev[0].metadata.c_BETA, "tp1-fp1-fn1-tn2");
      const everything = JSON.stringify([r, a.store.events]);
      for (const i of ITEMS) assert.ok(!everything.includes(i), `shape ${shape}: an item identity crossed out of the boundary`);
      assert.ok(!everything.includes(JSON.stringify(KEY_ROWS[1])), `shape ${shape}: a key row crossed out of the boundary`);
      const allowed = /^(family|mechanismId|mechanismHash|sealedSetId|scorerId|scorerHash|keySetId|combination|claimEventId|grantEventId|declared|denominator|evidenceState|untouched|c_[A-Z0-9_]+|x_[A-Z0-9_]+)$/;
      assert.deepEqual(Object.keys(ev[0].metadata).filter((k) => !allowed.test(k)), [], "the released result carries a field beyond the declared aggregate");
      released.push(JSON.stringify(r.tables));
    } finally { w.cleanup(); }
  }
  assert.equal(released[0], released[1], "the two key shapes scored differently");
});

/* Re-sat to F07 Amendment 3 (governance 264c680): a SET- or KEY-side fault is refused BEFORE the claim — the once-only run stays
 * UNSPENT — while a missing or invalid mechanism OUTPUT still INVALIDATES the claimed run. Every fault still yields no result. */
test("F07A2 · C3 · missing, partial, duplicate, unreadable and inconsistent inputs FAIL CLOSED — a set/key fault is REFUSED before the claim (run unspent), an output fault is recorded INVALID — and no result is released", () => {
  const row = (r) => JSON.stringify(r);
  const cases = [
    ["a key row missing", { keyText: KEY_ROWS.slice(0, 5).map(row).join("\n") }, {}, "INPUT_MISSING"],
    ["a duplicated key row", { keyText: KEY_TEXT + row(KEY_ROWS[0]) + "\n" }, {}, "INPUT_DUPLICATE"],
    ["an unreadable key line", { keyText: KEY_TEXT + "{not json\n" }, {}, "INPUT_UNREADABLE"],
    ["a row with both classes and an exclusion", { keyText: KEY_TEXT.replace(row(KEY_ROWS[0]), row({ ...KEY_ROWS[0], exclusion: "SKIPPED" })) }, {}, "INPUT_INCONSISTENT"],
    ["a class outside the protocol", { keyText: KEY_TEXT.replace(row(KEY_ROWS[0]), row({ item: "syn-item-01", classes: ["GAMMA"] })) }, {}, "INPUT_INCONSISTENT"],
    ["a key row for an undeclared item", { keyText: KEY_TEXT + row({ item: "syn-item-99", classes: [] }) + "\n" }, {}, "INPUT_INCONSISTENT"],
    ["an output missing for a declared item", {}, { outputs: (() => { const m = OUTPUTS(); m.delete("syn-item-03"); return m; })() }, "INPUT_MISSING"],
    ["an output for an undeclared item", {}, { outputs: (() => { const m = OUTPUTS(); m.set("syn-item-99", { classes: [] }); return m; })() }, "INPUT_INCONSISTENT"],
  ];
  assert.ok(cases.length >= 8);
  for (const [why, worldOpts, over, code] of cases) {
    const w = world("G", worldOpts);
    try {
      const a = frozenAudit();
      const g = grantFor(a, w);
      assert.equal(g.allowed, true, `${why}: the grant itself was refused (${g.code})`);
      assert.throws(() => score(a, w, g, over), (e) => e.code === code, `${why}: expected ${code}`);
      assert.equal(events(a, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === "RECORDED").length, 0, `${why}: a result was released`);
      const outcome = over.outputs ? "INVALID" : "REFUSED";
      assert.equal(events(a, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === outcome && e.reasonCode === code).length, 1, `${why}: the ${outcome} run was not recorded`);
      assert.equal(events(a, LINKED_ACTIONS.CLAIMED).length, outcome === "INVALID" ? 1 : 0, `${why}: ${outcome === "INVALID" ? "an output fault did not spend the claimed run" : "a set/key fault SPENT the once-only run"}`);
    } finally { w.cleanup(); }
  }
  // the key changed AFTER the grant: the bytes read no longer match the commitment the grant bound
  const w = world("G");
  try {
    const a = frozenAudit();
    const g = grantFor(a, w);
    fs.writeFileSync(join(w.tree, w.keyRel), KEY_TEXT.replace('"ALPHA"]}', '"BETA"]}'));
    assert.throws(() => score(a, w, g), { code: "KEY_CHANGED_SINCE_GRANT" }, "a key changed after the grant was scored");
    assert.deepEqual([events(a, LINKED_ACTIONS.CLAIMED).length, events(a, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === "REFUSED").length], [0, 1], "a key changed after the grant spent the run, or was not refused");
  } finally { w.cleanup(); }
});

test("F07A2 · C3 · exactly ONE valid run per frozen combination: a re-invocation is refused, a crash after the claim spends the run, an unlinked grant cannot score — CONTROL: a different frozen scorer is a different combination", () => {
  const w = world("G");
  try {
    const a = frozenAudit();
    const g = grantFor(a, w);
    score(a, w, g);
    assert.throws(() => score(a, w, g), { code: "SCORING_ALREADY_CLAIMED" }, "a second run of the same combination was allowed");
    assert.equal(events(a, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === "RECORDED").length, 1, "a re-invocation manufactured a second valid result");

    const c = frozenAudit();
    const gc = grantFor(c, w);
    class CrashMap extends Map { keys() { throw new Error("SIMULATED_CRASH"); } }
    const crashed = new CrashMap([...OUTPUTS()]);
    assert.throws(() => score(c, w, gc, { outputs: crashed }), /SIMULATED_CRASH/);
    assert.equal(events(c, LINKED_ACTIONS.CLAIMED).length, 1, "the crashed run had not claimed its combination first");
    assert.ok(events(c, LINKED_ACTIONS.ITEM_READ).length >= 2, "the crash did not happen after both sides were read");
    assert.throws(() => score(c, w, gc), { code: "SCORING_ALREADY_CLAIMED" }, "a crash was retried into a valid result");
    assert.equal(events(c, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === "RECORDED").length, 0);

    const u = requestHeldOutAccess({ audit: c, registry: w.registry, request: { ...linkedRequest(w), keySetId: undefined, keyCommitment: undefined, scorerId: undefined, scorerHash: undefined }, authorityRecords: AUTH });
    assert.throws(() => score(c, w, u), { code: "NO_LINKED_GRANT" });
    const tooMany = { classes: Array.from({ length: MAX_PROTOCOL_TOKENS }, (_, i) => `C${i}`), exclusions: ["SKIPPED"] };
    assert.throws(() => score(frozenAudit(), w, grantFor(frozenAudit(), w), { protocol: tooMany }), { code: "PROTOCOL_INVALID" });

    // CONTROL — a DIFFERENT frozen scorer is a different combination, and may run once
    const SCORER2 = mechanismHash({ "scorer.mjs": "export const s = (x) => x; // a second synthetic scorer" });
    freezeMechanism({ audit: a, mechanismId: "synthetic-f07a2-scorer", mechanismHash: SCORER2, frozenAt: "2026-09-26T11:30:00Z" });
    const g2 = grantFor(a, w, w.registry, { scorerHash: SCORER2 });
    assert.deepEqual(score(a, w, g2).tables, EXPECTED, "CONTROL: a different frozen combination could not run");
  } finally { w.cleanup(); }
});

/* ═══ CLAUSE 4 · COMPLETE CENSUS ════════════════════════════════════════════════════════════════════════════════════════ */

const plant = (w, name, text) => fs.writeFileSync(join(w.tree, name), text);
const census = (w) => censusNewRoles({ registry: w.registry, root: "t", base: w.tree, files: w.treeFiles(), roots: w.roots, filesOf: w.filesOf, derivers: {}, commitment: populationCommitment, audit: diagnosticGuardSink({ actor: "test" }) });

test("F07A2 · C4 · the census reads and scans BOTH roles in BOTH shapes: a planted leak of a key identity is FOUND as marking-key content, named by path and category only; a clean tree reports zero", () => {
  for (const shape of ["G", "S"]) {
    const w = world(shape);
    try {
      const clean = census(w);
      assert.deepEqual(clean.failures, [], `shape ${shape}: a clean tree reported a leak`);
      assert.deepEqual(clean.results.map((r) => [r.role, r.ok]).sort(), [["HELD_OUT_EVIDENCE", true], ["MARKING_KEY", true]], `shape ${shape}: a role was not read`);
      plant(w, "AlmiVisibility_RULING_LEAK.md", "A note that copied a key row: syn-item-02 ALPHA BETA.\n");
      const dirty = census(w);
      assert.ok(dirty.failures.includes(`${ROLE_DISPOSITION.MARKING_KEY} AlmiVisibility_RULING_LEAK.md`), `shape ${shape}: the planted key leak was not found (${dirty.failures.join(" | ")})`);
      assert.ok(!JSON.stringify(dirty).includes("syn-item-02"), `shape ${shape}: the detector returned leaked content`);
    } finally { w.cleanup(); }
  }
});

test("F07A2 · C4 · the key's declared label VOCABULARY is never a leak by itself — CONTROL: the same governance text IS reported when the vocabulary is not declared", () => {
  const vocab = ["QUESTIONING", "CONFUSIONS"];
  const text = KEY_ROWS.map((r) => JSON.stringify(r.exclusion ? r : { ...r, classes: [...r.classes, ...vocab] })).join("\n").replace(/"ALPHA"/g, '"QUESTIONING"');
  const w = world("G", { keyText: text });
  try {
    plant(w, "AlmiVisibility_RULING_WORDS.md", "A governance note that uses the words questioning and confusions in ordinary prose.\n");
    const declared = { ...w, registry: [w.SET, { ...w.KEY, contentHash: keyCommitment({ [w.keyRel]: Buffer.from(text) }), labelVocabulary: [...vocab, "SKIPPED"] }] };
    assert.deepEqual(census(declared).failures, [], "declared vocabulary in ordinary prose was reported as marking-key content");
    const undeclared = { ...w, registry: [w.SET, { ...w.KEY, contentHash: keyCommitment({ [w.keyRel]: Buffer.from(text) }), labelVocabulary: undefined }] };
    assert.ok(census(undeclared).failures.some((f) => f.includes("AlmiVisibility_RULING_WORDS.md")), "CONTROL: without the declared vocabulary the words are not reported — the control could not fire");
  } finally { w.cleanup(); }
});

test("F07A2 · C4 · a governed sealed store that cannot be located FAILS CLOSED — undeclared, unset, relative, absent, a reserved name and a bad reference each named; the census fails the entry instead of reading an empty store", () => {
  const dir = fs.mkdtempSync(join(os.tmpdir(), "f07a2-roots-"));
  try {
    const r = resolveSealedStoreRoots({
      declared: { vault: { mechanism: "ENV_REFERENCE", name: "F07A2_SET" }, unset: { mechanism: "ENV_REFERENCE", name: "F07A2_UNSET" }, rel: { mechanism: "ENV_REFERENCE", name: "F07A2_REL" }, gone: { mechanism: "ENV_REFERENCE", name: "F07A2_GONE" }, engine: { mechanism: "ENV_REFERENCE", name: "F07A2_SET" }, bad: { mechanism: "PATH", name: "F07A2_SET" } },
      env: { F07A2_SET: dir, F07A2_REL: "relative/dir", F07A2_GONE: join(dir, "missing") },
    });
    assert.deepEqual(r.codes, { vault: "SEALED_STORE_LOCATED", unset: "SEALED_STORE_REFERENCE_UNSET", rel: "SEALED_STORE_NOT_ABSOLUTE", gone: "SEALED_STORE_ABSENT", engine: "SEALED_STORE_NAME_INVALID", bad: "SEALED_STORE_REFERENCE_INVALID" }, "a store that cannot be located was reported located, or a code changed");
    assert.equal(r.roots.vault, dir, "CONTROL: a declared, set, present store was not located");
    const w = world("S");
    try {
      const unlocated = censusNewRoles({ registry: w.registry, root: "t", base: w.tree, files: w.treeFiles(), roots: { t: w.tree }, filesOf: w.filesOf, derivers: {}, commitment: populationCommitment, audit: diagnosticGuardSink({ actor: "test" }) });
      assert.deepEqual(unlocated.failures, [`SEALED_ROLE_ROOT_NOT_SCANNED ${w.KEY.id}`], "an unlocated store was not failed closed");
    } finally { w.cleanup(); }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("F07A2 · C4 · registration yields a discoverable manifest — ids, roles, link, shape, readability, file count, commitment — and NO value; an unreadable store is reported UNREADABLE, never as zero files", () => {
  const w = world("S");
  try {
    const m = sealedManifest(w.registry, { roots: w.roots, filesOf: w.filesOf, trackedRoots: ["t"] });
    assert.deepEqual(m.map((x) => [x.role, x.shape, x.location, x.files, x.linkedSet]), [["HELD_OUT_EVIDENCE", "GIT_TRACKED_PREFIX", "READABLE", 1, null], ["MARKING_KEY", "SEALED_STORE", "READABLE", 1, w.SET.id]]);
    const text = JSON.stringify(m);
    for (const i of ITEMS) assert.ok(!text.includes(i), "the manifest exposed a member");
    assert.ok(!text.includes(w.store), "the manifest exposed the store's directory");
    const blind = sealedManifest(w.registry, { roots: { t: w.tree }, filesOf: w.filesOf, storeCodes: { vault: "SEALED_STORE_REFERENCE_UNSET" }, trackedRoots: ["t"] });
    assert.deepEqual([blind[1].location, blind[1].files], ["UNREADABLE (SEALED_STORE_REFERENCE_UNSET)", null], "an unreadable store was reported as a readable or empty one");
  } finally { w.cleanup(); }
});

/* ═══ PRODUCTION ENTRY POINTS — confined runs, the production trail unchanged ═══════════════════════════════════════════ */

test("F07A2 · REAL · the production firewall prints the sealed-role manifest (2 entries, 1 store declared, REQUIRED and LOCATED) and passes; the production evaluator refuses an INCOMPLETE linked request, recorded — CONTROL: without key flags the same request reaches the set check", () => {
  const before = prodHashes();
  const env = { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: "1" };
  const f = spawnSync(process.execPath, ["bin/heldout-firewall.mjs", "--check"], { cwd: REPO, encoding: "utf8", env, timeout: 120_000 });
  assert.equal(f.status, 0, f.stdout.slice(-400));
  /* since 27 Sep 2026 (F10's one selection, sealed and registered in storage S — engine cecf880 and its registration commit): the manifest lists the two sealed sets and the store they REQUIRE. Where the owner's store is not located (CI), this
   * production census FAILS CLOSED instead — C3's pinned red, recorded exactly in _handoffs, never absorbed. */
  assert.match(f.stdout, /SEALED-ROLE MANIFEST — 2 registered HELD_OUT_EVIDENCE \/ MARKING_KEY entries · governed sealed stores declared 1, located 1/);
  assert.match(f.stdout, /SEALED STORE f10-marking-key · required by 2 registered entries · LOCATED/);
  const h = (c) => c.repeat(64);
  const base = ["bin/heldout-evaluation.mjs", "request", "--mechanism-id=syn-mech", `--mechanism-hash=${h("a")}`, "--set=synthetic:none", `--commitment=${h("b")}`, "--protocol=p1", "--purpose=assessment", "--authority=SYNTHETIC_X", "--actor=actor:cc"];
  const linked = spawnSync(process.execPath, [...base, "--key-set=syn-key", `--key-commitment=${h("c")}`], { cwd: REPO, encoding: "utf8", env, timeout: 120_000 });
  assert.equal(linked.status, 3, linked.stdout + linked.stderr);
  assert.match(linked.stdout, /REFUSED REQUEST_FIELD_INVALID/, "an incomplete linked request was not refused");
  const plain = spawnSync(process.execPath, base, { cwd: REPO, encoding: "utf8", env, timeout: 120_000 });
  assert.match(plain.stdout, /REFUSED SET_UNDECLARED/, "CONTROL: the plain request did not reach the set check");
  assert.deepEqual(prodHashes(), before, "a confined run changed the production trail");
});

test("F07A2 · residue: every constructed tree and store is removed — zero scratch left behind", () => {
  const inTree = fs.existsSync(join(REPO, ".test-scratch")) ? fs.readdirSync(join(REPO, ".test-scratch")).filter((n) => n.startsWith("f07a2-")) : [];
  const inTmp = fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith("f07a2-store-") || n.startsWith("f07a2-roots-"));
  assert.deepEqual([inTree, inTmp], [[], []], "a constructed world was left behind");
});

test("F07A2 · the production audit trail is byte-identical after every proof in this file", () => {
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
