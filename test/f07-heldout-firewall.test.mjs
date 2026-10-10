/**
 * 🔴 F07 · HELD-OUT EVIDENCE FIREWALL — P1–P34 (23 September 2026).
 *
 * Two kinds of proof, kept apart and named as such:
 *   REAL       the real sealed store (the evidence-role registry's SEALED entry) — every path refused before any read,
 *              measured by an instrumented filesystem; the real manifest; the real registry; the real authority corpus.
 *   SYNTHETIC  the held-out LIFECYCLE (freeze → access → score), on a synthetic sealed store with the same interface,
 *              because the only declared held-out set is RETIRED and no live evaluation set exists to run it against.
 *              SYNTHETIC_TEST_FIXTURE — NOT REAL EVIDENCE.
 *
 * 🔴 No sealed path string appears in this file: the real ones are computed from the registry at run time and never
 * printed; the synthetic ones are invented here. No held-out member, label or answer appears anywhere.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { ACCEPTANCES, F07_ORIGINAL, F07_AMENDMENT_1, F07_AMENDMENT_2, F07_AMENDMENT_3 } from "../config/fboard/acceptances.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { MANDATORY_READING, BOARD_AND_AUTHORITY_CONFIG } from "../config/governance/mandatory-reading.mjs";
import { readUnsealed, classifySealed, isSealed, SealedPathRefused } from "../src/governance/sealed-paths.mjs";
import { diagnosticGuardSink } from "../src/governance/guard-audit.mjs";
import { governedGuardSink, governedAuditContext, resolveAuditStoreLocation } from "../src/governance/governed-run.mjs";
import { requiredSources, manifestErrors } from "../src/governance/mandatory-reading.mjs";
import { freezeMechanism, requestHeldOutAccess, readHeldOutItem, scoreHeldOutEvaluation, presentAsUntouched, populationCommitment, mechanismHash, EXCLUSION_REASONS } from "../src/heldout/lifecycle.mjs";
import { census as authorityCensus } from "../src/authority/corpus.mjs";
import { resolve as resolveAuthority } from "../src/authority/register.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { buildBoard, boardErrors } from "../src/fboard/board.mjs";
import { scan } from "../tools/heldout-firewall.mjs";
import { heldoutAccessCensus, countingStore } from "../tools/heldout-access-census.mjs";
import { sealedPathPopulation, sameSixtyOne, manifestPopulation } from "../tools/heldout-population-census.mjs";
import { census as callerCensus, bypasses } from "../tools/governed-caller-census.mjs";
import { decisionSiteCensus } from "../tools/decision-site-census.mjs";
import { PRODUCT_WORDS } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();

/* ── THE INSTRUMENT: every CONTENT read primitive, counted by path, while `fn` runs. Metadata (realpath, exists) is not
 * a content read and is not counted; an open or a read is. ── */
const READERS = ["readFileSync", "openSync", "createReadStream", "readSync", "readdirSync"];
function readsDuring(fn) {
  const orig = Object.fromEntries(READERS.map((m) => [m, fs[m]]));
  const seen = [];
  try {
    for (const m of READERS) fs[m] = (...a) => { seen.push({ m, p: String(a[0]).replace(/\\/g, "/") }); return orig[m](...a); };
    syncBuiltinESMExports();
    fn();
  } finally { for (const m of READERS) fs[m] = orig[m]; syncBuiltinESMExports(); }
  return seen;
}
const touchesSealed = (seen) => seen.filter(({ p }) => { const rel = p.startsWith(REPO) ? p.slice(REPO.length) : p; return isSealed(EVIDENCE_ROLE_REGISTRY, "engine", rel.replace(/^\//, "")); });

const REAL = sealedPathPopulation();

/* ══════════ REAL — THE SEALED STORE ══════════ */

test("P1 · REAL · the sealed population is identified WITHOUT a payload read — 61 names, by metadata, never opened", () => {
  let pop;
  const seen = readsDuring(() => { pop = sealedPathPopulation(); });
  assert.equal(pop.included, 61);
  /* [57, 4] → [57, 4, 0, 0] since 27 Sep 2026: F10's two sealed sets add two sealed rows whose prefixes live in storage S, OUTSIDE the
   * engine — so no engine file sits under them (0, 0), and the 61 engine names are unchanged. */
  assert.deepEqual(pop.byPrefix, [57, 4, 0, 0]);
  assert.equal(pop.untrackedUnderPrefix + pop.ignoredUnderPrefix, 0);
  assert.equal(touchesSealed(seen).length, 0, "identifying the population opened a sealed file");
  assert.equal(pop.control, true);
  // CONTROL: the same instrument SEES a read when one happens — so the zero above is a measurement.
  assert.ok(readsDuring(() => fs.readFileSync(join(REPO, "package.json"))).some((x) => x.p.endsWith("package.json")));
});

test("P1b · REAL · the two 61s are DIFFERENT populations — sealed paths vs retired members, intersection 0 by hash", () => {
  const same = sameSixtyOne({ sealedPaths: REAL.paths, retiredMembers: REAL.paths.map((p) => `not-a-member-${sha(p)}`) });
  assert.equal(same.intersection, 0);
  // CONTROL: the same comparison finds a full intersection when the populations ARE the same.
  assert.equal(sameSixtyOne({ sealedPaths: REAL.paths, retiredMembers: REAL.paths }).intersection, 61);
  /* The real members are derived by the firewall from registered observed data; tools/heldout-population-census.mjs
   * and runs/audit/f07-populations-2026-09-23.txt record the real intersection (0). They are never loaded here. */
});

test("P2 · P8 · P9 · REAL · every one of the 61 sealed paths is refused BEFORE a read — one metadata-only DURABLE event each, no path in it", () => {
  const loc = resolveAuditStoreLocation({ repo: REPO });
  assert.equal(loc.synthetic, true, "not in a verified test context — this would write production");
  const sink = governedGuardSink({ repo: REPO, correlationId: `run:f07-p2:${process.pid}:${Date.now()}`, now: "2026-09-23", actor: "test/f07" });
  let refused = 0;
  let readerCalls = 0;
  const seen = readsDuring(() => {
    for (const p of REAL.paths) {
      try { readUnsealed({ registry: EVIDENCE_ROLE_REGISTRY, root: "engine", base: REPO, path: p, audit: sink, read: () => { readerCalls += 1; return ""; } }); }
      catch (e) { if (e instanceof SealedPathRefused && e.code === "SEALED_PATH_REFUSED") refused += 1; else throw e; }
    }
  });
  assert.equal(refused, 61);
  assert.equal(readerCalls, 0, "the loader's reader was called for a sealed path");
  assert.equal(touchesSealed(seen).length, 0, "a sealed file was opened");
  assert.equal(sink.emitted, 61, "not one durable event per refusal");
  const blob = JSON.stringify(sink.events);
  for (const p of REAL.paths) assert.ok(!blob.includes(p) && !blob.toLowerCase().includes(p.toLowerCase().split("/").pop()), "a sealed path or name entered an event");
  for (const e of sink.events) assert.deepEqual([e.eventType, e.outcome, e.reasonCode, e.metadata.classification], ["REFUSAL", "REFUSED", "SEALED_PATH_REFUSED", "SEALED"]);
  // P8: the refusal itself carries no path.
  try { readUnsealed({ registry: EVIDENCE_ROLE_REGISTRY, root: "engine", base: REPO, path: REAL.paths[0], audit: diagnosticGuardSink() }); } catch (e) { assert.ok(!e.message.includes(REAL.paths[0]) && !String(e.stack).includes(REAL.paths[0])); }
});

test("P3 · REAL · the SAME loader reads an authorised ordinary file, and records nothing for it", () => {
  const sink = diagnosticGuardSink();
  const text = readUnsealed({ registry: EVIDENCE_ROLE_REGISTRY, root: "engine", base: REPO, path: "package.json", audit: sink });
  assert.match(text, /"name"/);
  assert.equal(sink.events.length, 0);
});

test("P10 · REAL · repeated refusal neither corrupts nor duplicates governed evidence — two attempts, two events, chain verifies", () => {
  const ctx = governedAuditContext({ repo: REPO, correlationId: `run:f07-p10:${process.pid}:${Date.now()}` });
  const before = ctx.store.readAll().events.length;
  const sink = governedGuardSink({ repo: REPO, correlationId: `run:f07-p10b:${process.pid}:${Date.now()}`, now: "2026-09-23", actor: "test/f07" });
  for (let i = 0; i < 2; i += 1) assert.throws(() => readUnsealed({ registry: EVIDENCE_ROLE_REGISTRY, root: "engine", base: REPO, path: REAL.paths[1], audit: sink }), SealedPathRefused);
  const after = ctx.store.readAll().events;
  assert.equal(after.length, before + 2);
  assert.equal(new Set(after.map((e) => e.eventId)).size, after.length, "an eventId was duplicated");
  assert.equal(ctx.store.verify().ok, true, "the confined chain does not verify");
});

/* ══════════ SYNTHETIC — ALIASING, METADATA, THE SEAL AT THE FILESYSTEM ══════════ */

function syntheticSealedStore() {
  fs.mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const dir = fs.mkdtempSync(join(REPO, ".test-scratch", "f07-seal-"));
  fs.mkdirSync(join(dir, "vault-area-long-name", "inner"), { recursive: true });
  fs.writeFileSync(join(dir, "vault-area-long-name", "inner", "item.txt"), "SYNTHETIC-SEALED-CONTENT-7d3e");
  fs.writeFileSync(join(dir, "ordinary.txt"), "ordinary");
  const registry = [{ id: "synthetic:vault", role: "SEALED", sealed: true, resource: { root: "syn", pathPrefixes: ["vault-area-long-name/"] } }];
  return { dir, registry };
}
const refusedWithoutRead = (registry, dir, path) => {
  let calls = 0;
  const sink = diagnosticGuardSink();
  let code = null;
  const seen = readsDuring(() => { try { readUnsealed({ registry, root: "syn", base: dir, path, audit: sink, read: () => { calls += 1; return ""; } }); } catch (e) { code = e.code; } });
  return { code, calls, contentReads: seen.filter(({ p }) => p.includes("vault-area-long-name") || p.includes("item.txt")).length, events: sink.events.length };
};

test("P4 · SYNTHETIC · traversal cannot bypass the seal — every ../ and ./ form is refused before a read", () => {
  const { dir, registry } = syntheticSealedStore();
  try {
    const forms = ["x/../vault-area-long-name/inner/item.txt", "./vault-area-long-name/./inner/item.txt", "vault-area-long-name/inner/../inner/item.txt", "a/b/../../vault-area-long-name/inner/item.txt"];
    for (const p of forms) {
      const r = refusedWithoutRead(registry, dir, p);
      assert.deepEqual([r.code, r.calls, r.contentReads, r.events], ["SEALED_PATH_REFUSED", 0, 0, 1], p);
      /* The LEXICAL limb alone (a virtual read: no filesystem to resolve), so a broken lexical limb cannot hide behind
       * the realpath limb above. */
      const v = refusedWithoutRead(registry, "", p);
      assert.deepEqual([v.code, v.calls], ["SEALED_PATH_REFUSED", 0], `${p} (lexical only)`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("P5 · SYNTHETIC · a JUNCTION, a directory SYMLINK and a file SYMLINK into the seal are refused by their REAL target", () => {
  const { dir, registry } = syntheticSealedStore();
  try {
    const made = [];
    try { fs.symlinkSync(join(dir, "vault-area-long-name"), join(dir, "innocent-junction"), "junction"); made.push("innocent-junction/inner/item.txt"); } catch {}
    try { fs.symlinkSync(join(dir, "vault-area-long-name"), join(dir, "innocent-dirlink"), "dir"); made.push("innocent-dirlink/inner/item.txt"); } catch {}
    try { fs.symlinkSync(join(dir, "vault-area-long-name", "inner", "item.txt"), join(dir, "innocent-file.txt"), "file"); made.push("innocent-file.txt"); } catch {}
    assert.ok(made.length >= 1, "no link of any kind could be created on this host — this proof would be vacuous");
    for (const p of made) {
      const r = refusedWithoutRead(registry, dir, p);
      assert.deepEqual([r.code, r.calls, r.contentReads], ["SEALED_PATH_REFUSED", 0, 0], p);
    }
    // CONTROL: a link to an ORDINARY file is read normally — the classifier refuses the seal, not links.
    try { fs.symlinkSync(join(dir, "ordinary.txt"), join(dir, "link-to-ordinary.txt"), "file"); assert.equal(readUnsealed({ registry, root: "syn", base: dir, path: "link-to-ordinary.txt", audit: diagnosticGuardSink() }), "ordinary"); } catch (e) { if (e instanceof SealedPathRefused) throw e; }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("P6 · SYNTHETIC · case, separator, trailing-dot, absolute, 8.3 and stream forms cannot bypass it", () => {
  const { dir, registry } = syntheticSealedStore();
  try {
    const forms = ["VAULT-AREA-LONG-NAME/inner/item.txt", "vault-area-long-name\\inner\\item.txt", "vault-area-long-name//inner//item.txt", "vault-area-long-name./inner/item.txt", "vault-area-long-name /inner/item.txt", join(dir, "vault-area-long-name", "inner", "item.txt"), "vault-area-long-name/inner/item.txt::$DATA"];
    if (process.platform === "win32") {
      try {
        const out = execFileSync("powershell", ["-NoProfile", "-Command", `(New-Object -ComObject Scripting.FileSystemObject).GetFolder('${join(dir, "vault-area-long-name")}').ShortName`], { encoding: "utf8" }).trim();
        if (out && out.includes("~")) forms.push(`${out}/inner/item.txt`);
      } catch {}
    }
    for (const p of forms) {
      const r = refusedWithoutRead(registry, dir, p);
      assert.ok(["SEALED_PATH_REFUSED", "SEAL_PATH_UNRESOLVABLE"].includes(r.code), `${JSON.stringify(p)} was not refused (${r.code})`);
      assert.deepEqual([r.calls, r.contentReads], [0, 0], `${JSON.stringify(p)} was read`);
    }
    /* The LEXICAL limb alone (a virtual read), for every form it is responsible for — case, separators, trailing dots
     * and spaces, and the stream forms (including a DIRECTORY stream alias) — so neither limb can hide behind the other. */
    for (const p of ["VAULT-AREA-LONG-NAME/inner/item.txt", "vault-area-long-name\\inner\\item.txt", "vault-area-long-name//inner//item.txt", "vault-area-long-name./inner/item.txt", "vault-area-long-name /inner/item.txt", "vault-area-long-name::$INDEX_ALLOCATION/inner/item.txt", "vault-area-long-name/inner/item.txt:secondary"]) {
      const v = refusedWithoutRead(registry, "", p);
      assert.ok(["SEALED_PATH_REFUSED", "SEAL_PATH_UNRESOLVABLE"].includes(v.code) && v.calls === 0, `${JSON.stringify(p)} passed the LEXICAL limb (${v.code})`);
    }
    // CONTROL: the ordinary file, in any case, is still readable — case-folding refuses the seal, not everything.
    assert.equal(readUnsealed({ registry, root: "syn", base: dir, path: "ORDINARY.txt".toLowerCase(), audit: diagnosticGuardSink() }), "ordinary");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("P7 · SYNTHETIC · UNAVAILABLE seal metadata FAILS CLOSED — no registry, an empty one, a sealed entry without prefixes, an unresolvable path", () => {
  const { dir } = syntheticSealedStore();
  try {
    for (const registry of [null, [], [{ id: "x", role: "SEALED", resource: { root: "syn" } }], [{ id: "x", role: "SEALED", resource: { root: "syn", pathPrefixes: [] } }]]) {
      const r = refusedWithoutRead(registry, dir, "ordinary.txt");
      assert.deepEqual([r.code, r.calls, r.events], ["SEAL_METADATA_UNAVAILABLE", 0, 1], JSON.stringify(registry));
    }
    const failingRealpath = () => { const e = new Error("denied"); e.code = "EACCES"; throw e; };
    const v = classifySealed({ registry: [{ id: "s", role: "SEALED", resource: { root: "syn", pathPrefixes: ["vault/"] } }], root: "syn", base: dir, path: "ordinary.txt", realpath: failingRealpath });
    assert.equal(v.code, "SEAL_PATH_UNRESOLVABLE", "metadata that could not be resolved was read as permission");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* ══════════ SYNTHETIC — THE HELD-OUT LIFECYCLE ══════════ */

const ITEMS = ["item-a", "item-b", "item-c", "item-d"];
const SYN_SET = { id: "synthetic:f07-heldout", role: "HELD_OUT_EVIDENCE", sealed: true, mayEvaluate: true, mandatoryReadable: false, maySupplyExpectedAnswer: false, mayTrain: false, retiredReason: null, contentHash: populationCommitment(ITEMS), resource: { root: "syn", pathPrefixes: ["heldout-store/"] } };
const REGISTRY = [SYN_SET, ...EVIDENCE_ROLE_REGISTRY];
const REAL_OWNER = AUTHORITY_CORPUS.find((r) => r.status === "CURRENT" && r.issuer?.class === "OWNER");
const AUTH = [...AUTHORITY_CORPUS, { ...REAL_OWNER, authorityId: "synthetic:f07-evaluator", propositionId: "SYNTHETIC_F07_EVALUATOR", scope: ["ALMIVISIBILITY"], supersedes: [], supersededBy: [], contentHash: "c".repeat(64), issuedAt: "2026-01-01", effectiveFrom: "2026-01-01" }];
const MECH_V1 = mechanismHash({ "mechanism.mjs": "export const f = (x) => x; // synthetic v1" });
const MECH_V2 = mechanismHash({ "mechanism.mjs": "export const f = (x) => !x; // synthetic v2" });
const lifeAudit = () => ({ store: countingStore(), actor: "test/f07", softwareVersion: "engine:test", correlationId: `run:f07-life:${Math.random()}`, authorityRef: { propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: ["ALMIVISIBILITY"] }, authorityHash: "d".repeat(64) });
const req = (over = {}) => ({ mechanismId: "synthetic-f07-mechanism", mechanismHash: MECH_V1, sealedSetId: SYN_SET.id, populationCommitment: SYN_SET.contentHash, protocolId: "synthetic-protocol-1", evaluatorAuthority: { propositionId: "SYNTHETIC_F07_EVALUATOR", scope: ["ALMIVISIBILITY"] }, purpose: "assessment", at: "2026-09-23T12:00:00Z", ...over });
const ask = (a, over) => requestHeldOutAccess({ audit: a, registry: REGISTRY, request: req(over), authorityRecords: AUTH });
const freeze = (a, hash = MECH_V1, at = "2026-09-23T11:00:00Z") => freezeMechanism({ audit: a, mechanismId: "synthetic-f07-mechanism", mechanismHash: hash, frozenAt: at });
const all = (outcome) => new Map(ITEMS.map((i) => [i, outcome]));

test("P11 · SYNTHETIC · access WITHOUT a frozen mechanism is refused, recorded, and nothing is read", () => {
  const a = lifeAudit();
  const g = ask(a);
  assert.deepEqual([g.allowed, g.code], [false, "MECHANISM_NOT_FROZEN"]);
  assert.throws(() => readHeldOutItem({ audit: a, grant: g, currentMechanismHash: MECH_V1, registry: REGISTRY, root: "syn", base: "", path: "heldout-store/item-a", read: () => { throw new Error("READ"); } }), { code: "NO_ACCESS_GRANT" });
  assert.equal(a.store.events.filter((e) => e.outcome === "REFUSED").length, 2);
});

test("P12 · SYNTHETIC · an authorised evaluation REQUIRES the mechanism hash (and all eight declared fields)", () => {
  const a = lifeAudit();
  freeze(a);
  for (const k of ["mechanismHash", "mechanismId", "sealedSetId", "populationCommitment", "protocolId", "evaluatorAuthority", "purpose", "at"]) {
    const g = ask(a, { [k]: undefined });
    assert.equal(g.allowed, false, `${k} missing, yet access was allowed`);
  }
  assert.equal(ask(a).code, "ACCESS_FIRST_ACCESS", "control: the complete, frozen request IS allowed");
});

test("P13 · P31 · SYNTHETIC · a mechanism changed AFTER access invalidates the evaluation, and a run cannot be relabelled untouched", () => {
  const a = lifeAudit();
  freeze(a);
  const g = ask(a);
  assert.equal(g.untouched, true);
  assert.throws(() => scoreHeldOutEvaluation({ audit: a, grant: g, currentMechanismHash: MECH_V2, declaredItems: ITEMS, outcomes: all({ verdict: "PASS" }) }), { code: "MECHANISM_CHANGED_AFTER_ACCESS" });
  assert.equal(a.store.events.filter((e) => e.action === "HELDOUT_EVALUATION_INVALIDATED").length, 1);
  // the changed mechanism, frozen and asking again, is NEVER untouched
  freeze(a, MECH_V2, "2026-09-23T12:30:00Z");
  const g2 = ask(a, { mechanismHash: MECH_V2, at: "2026-09-23T13:00:00Z" });
  assert.deepEqual([g2.status, g2.untouched], ["AFTER_MECHANISM_CHANGE", false]);
  const report = scoreHeldOutEvaluation({ audit: a, grant: g2, currentMechanismHash: MECH_V2, declaredItems: ITEMS, outcomes: all({ verdict: "PASS" }) });
  assert.equal(report.untouched, false);
  assert.throws(() => presentAsUntouched(report), { code: "NOT_AN_UNTOUCHED_EVALUATION" });
});

test("P14 · P15 · SYNTHETIC + REAL registry · every access decision is recorded — who, purpose, mechanism, set, outcome, time, authority, version", () => {
  const a = lifeAudit();
  freeze(a);
  ask(a);
  const denied = requestHeldOutAccess({ audit: a, registry: EVIDENCE_ROLE_REGISTRY, request: req({ sealedSetId: EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "RETIRED_CONTAMINATED").id, populationCommitment: "0".repeat(64) }), authorityRecords: AUTH });
  assert.deepEqual([denied.allowed, denied.code], [false, "SET_RETIRED_CONTAMINATED"], "the REAL retired set was not refused as retired");
  const sealedSet = requestHeldOutAccess({ audit: a, registry: EVIDENCE_ROLE_REGISTRY, request: req({ sealedSetId: EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "SEALED").id, populationCommitment: "0".repeat(64) }), authorityRecords: AUTH });
  assert.equal(sealedSet.code, "SET_NOT_AN_EVALUATION_SET", "the REAL sealed store granted an ordinary evaluation");
  const acc = a.store.events.filter((e) => e.action === "HELDOUT_ACCESS");
  assert.deepEqual(acc.map((e) => e.outcome), ["ALLOWED", "REFUSED", "REFUSED"]);
  for (const e of acc) {
    for (const k of ["role", "purpose", "mechanismHash", "sealedSetId", "accessStatus", "untouched"]) assert.ok(e.metadata[k], `${k} not recorded`);
    assert.ok(e.occurredAt && e.authorityRef && e.softwareVersion && e.actor);
  }
});

test("P16 · P17 · P18 · P19 · SYNTHETIC · the population is accounted to remainder 0 — UNKNOWN and UNAVAILABLE are never PASS, an exclusion needs a lawful reason", () => {
  const a = lifeAudit();
  freeze(a);
  const g = ask(a);
  const outcomes = new Map([["item-a", { verdict: "PASS" }], ["item-b", { verdict: "UNKNOWN" }], ["item-c", { verdict: "UNAVAILABLE" }], ["item-d", { verdict: "EXCLUDED", reason: EXCLUSION_REASONS[0] }]]);
  const r = scoreHeldOutEvaluation({ audit: a, grant: g, currentMechanismHash: MECH_V1, declaredItems: ITEMS, outcomes });
  assert.equal(r.declared, 4);
  assert.equal(r.scored + r.refused + r.unavailable + r.invalid + r.unscoredWithReason, 4);
  assert.equal(r.remainder, 0);
  assert.deepEqual([r.pass, r.unknown, r.unavailable], [1, 1, 1], "UNKNOWN or UNAVAILABLE became PASS or vanished");
  // a dropped item, an exclusion without a lawful reason, an undeclared verdict — each refused and recorded INVALID
  for (const bad of [new Map([...outcomes].slice(0, 3)), new Map([...outcomes.entries()].map(([k, v]) => [k, k === "item-d" ? { verdict: "EXCLUDED", reason: "because" } : v])), new Map([...outcomes.entries()].map(([k, v]) => [k, k === "item-a" ? { verdict: "MOSTLY_PASS" } : v]))]) {
    const b = lifeAudit(); freeze(b); const gg = ask(b);
    assert.throws(() => scoreHeldOutEvaluation({ audit: b, grant: gg, currentMechanismHash: MECH_V1, declaredItems: ITEMS, outcomes: bad }), { code: "POPULATION_NOT_ACCOUNTED" });
    assert.equal(b.store.events.at(-1).outcome, "INVALID");
  }
});

test("P32 · SYNTHETIC · an authorised rerun is VISIBLY a rerun — never an untouched test", () => {
  const a = lifeAudit();
  freeze(a);
  const first = ask(a);
  const again = ask(a, { at: "2026-09-23T14:00:00Z" });
  assert.deepEqual([first.status, first.untouched, again.status, again.untouched], ["FIRST_ACCESS", true, "RERUN", false]);
  const r = scoreHeldOutEvaluation({ audit: a, grant: again, currentMechanismHash: MECH_V1, declaredItems: ITEMS, outcomes: all({ verdict: "FAIL" }) });
  assert.match(r.label, /NOT AN UNTOUCHED HELD-OUT EVALUATION — RERUN/);
  assert.equal(presentAsUntouched(scoreHeldOutEvaluation({ audit: a, grant: first, currentMechanismHash: MECH_V1, declaredItems: ITEMS, outcomes: all({ verdict: "FAIL" }) })).untouched, true, "control: the first access IS presentable as untouched");
});

test("P-LIFE · SYNTHETIC · the lawful item read: only with a grant, only inside the granted set, and the ORDINARY loader still refuses the same path", () => {
  const dir = fs.mkdtempSync(join(REPO, ".test-scratch", "f07-life-"));
  try {
    fs.mkdirSync(join(dir, "heldout-store"));
    fs.writeFileSync(join(dir, "heldout-store", "item-a"), "SYNTHETIC-HELDOUT-ITEM-0b91");
    const a = lifeAudit(); freeze(a); const g = ask(a);
    assert.equal(readHeldOutItem({ audit: a, grant: g, currentMechanismHash: MECH_V1, registry: REGISTRY, root: "syn", base: dir, path: "heldout-store/item-a" }).toString(), "SYNTHETIC-HELDOUT-ITEM-0b91");
    assert.throws(() => readUnsealed({ registry: REGISTRY, root: "syn", base: dir, path: "heldout-store/item-a", audit: diagnosticGuardSink() }), SealedPathRefused, "an ordinary loader read a held-out item");
    assert.ok(!JSON.stringify(a.store.events).includes("SYNTHETIC-HELDOUT-ITEM-0b91"), "an item's content entered the trail");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("P-EXEC · the access decisions are LIVE-AUDITED BY EXECUTION — every exit reaches its branch and records exactly one event", () => {
  const c = heldoutAccessCensus();
  assert.equal(c.total, 18);
  assert.deepEqual(c.unrecorded, []);
});

/* ══════════ MANIFEST, CONTAMINATION, NEUTRALITY ══════════ */

const REQUIRED = requiredSources({ corpus: AUTHORITY_CORPUS, dispositions: authorityCensus(AUTHORITY_CORPUS, CORPUS_PROVENANCE.now).dispositions, acceptances: ACCEPTANCES, boardConfig: BOARD_AND_AUTHORITY_CONFIG });

test("P20 · P21 · P22 · REAL · the mandatory-reading manifest is complete for the loaders and excludes sealed payload — a planted sealed source and a removed required one are each RED", () => {
  assert.deepEqual(manifestErrors({ manifest: MANDATORY_READING, required: REQUIRED, registry: EVIDENCE_ROLE_REGISTRY }), []);
  assert.equal(MANDATORY_READING.length, REQUIRED.length);
  const planted = manifestErrors({ manifest: [...MANDATORY_READING, { repo: "engine", path: REAL.paths[3] }], required: REQUIRED, registry: EVIDENCE_ROLE_REGISTRY });
  assert.deepEqual(planted.map((e) => e.code), ["SEALED_IN_MANIFEST"]);
  const acceptanceSource = MANDATORY_READING.findIndex((m) => m.path === ACCEPTANCES.F07.ruling.path);
  assert.ok(acceptanceSource >= 0, "F07's own acceptance is not mandatory reading");
  const removed = manifestErrors({ manifest: MANDATORY_READING.filter((_, i) => i !== acceptanceSource), required: REQUIRED, registry: EVIDENCE_ROLE_REGISTRY });
  assert.deepEqual(removed.map((e) => e.code), ["REQUIRED_SOURCE_MISSING"]);
  assert.equal(manifestPopulation().control, true);
});

test("P23 · P24 · SYNTHETIC · governance may DESCRIBE evidence shape — and a governance file carrying a synthetic payload value is REJECTED", () => {
  const dir = fs.mkdtempSync(join(REPO, ".test-scratch", "f07-gov-"));
  try {
    const MEMBER = "synthetic held out probe phrase nine";
    fs.writeFileSync(join(dir, "AlmiVisibility_OWNER_RULING_SHAPE.md"), "The held-out set has 4 items, a population commitment and a frozen protocol. No item is quoted.\n");
    fs.writeFileSync(join(dir, "AlmiVisibility_OWNER_RULING_LEAK.md"), `A held-out example: ${MEMBER}.\n`);
    const reg = [{ id: "synthetic:none", role: "SEALED", resource: { root: "elsewhere", pathPrefixes: ["nowhere/"] } }];
    const r = scan({ registry: reg, root: "t", base: dir, files: ["AlmiVisibility_OWNER_RULING_SHAPE.md", "AlmiVisibility_OWNER_RULING_LEAK.md"], members: [MEMBER], fragments: [], audit: diagnosticGuardSink() });
    assert.deepEqual(r.failures.map((f) => f.path), ["AlmiVisibility_OWNER_RULING_LEAK.md"], "the shape description was rejected, or the leak was not");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("P25 · SYNTHETIC · the real entry point's output and records stay payload-free — a real request to the RETIRED set is refused, exit 3, and recorded", () => {
  const retired = EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "RETIRED_CONTAMINATED");
  /* F04: the run names the declared automation actor, so exit 3 below is the RETIRED set's refusal, not a missing identity. */
  const r = spawnSync(process.execPath, ["bin/heldout-evaluation.mjs", "request", "--actor=actor:cc", "--mechanism-id=synthetic-cli", `--mechanism-hash=${MECH_V1}`, `--set=${retired.id}`, `--commitment=${"0".repeat(64)}`, "--protocol=synthetic", "--purpose=assessment", "--authority=OWNER_RULING_HELDOUT_ROLE_SCOPE"], { cwd: REPO, encoding: "utf8", env: process.env, timeout: 120_000 });
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stdout, /REFUSED SET_RETIRED_CONTAMINATED · recorded as [0-9a-f]{32}/);
  for (const p of REAL.paths) assert.ok(!r.stdout.includes(p) && !r.stderr.includes(p));
  const st = spawnSync(process.execPath, ["bin/heldout-evaluation.mjs", "status"], { cwd: REPO, encoding: "utf8", env: process.env, timeout: 120_000 });
  assert.equal(st.status, 0);
  /* RR-246: both F10 sets RETIRED (read out of band on 27 Sep; correction OOB-2026-09-27-A) — no evaluable set remains */
  assert.match(st.stdout, /evaluation sets \(HELD_OUT_EVIDENCE, evaluable\): 0/); // 0 → 2 since 27 Sep 2026 (F10's one selection, sealed and registered in storage S — engine cecf880 and its registration commit)
});

test("P26 · P28 · REAL · the F07 modules carry no product or client vocabulary, and each has a production caller", () => {
  const files = ["src/governance/sealed-paths.mjs", "src/governance/mandatory-reading.mjs", "src/heldout/lifecycle.mjs", "bin/heldout-evaluation.mjs", "tools/heldout-access-census.mjs", "tools/heldout-population-census.mjs", "config/governance/mandatory-reading.mjs"];
  for (const f of files) {
    const code = fs.readFileSync(join(REPO, f), "utf8").split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    for (const w of PRODUCT_WORDS) assert.ok(!new RegExp(w, "i").test(code), `${f} names ${w}`);
  }
  const importers = (mod) => execFileSync("git", ["-C", REPO, "grep", "-l", mod.split("/").pop(), "--", "bin", "tools"], { encoding: "utf8" }).split("\n").filter(Boolean);
  assert.ok(importers("src/heldout/lifecycle.mjs").includes("bin/heldout-evaluation.mjs"));
  assert.ok(importers("src/governance/mandatory-reading.mjs").includes("bin/heldout-firewall.mjs"));
});

test("P27 · every F07 event is GLOBAL_PRODUCT with no tenant, no subject and no evidence reference to join", () => {
  const a = lifeAudit(); freeze(a); ask(a); ask(a, { sealedSetId: "synthetic:nothing" });
  for (const e of a.store.events) assert.deepEqual([e.scopeType, e.tenantId, e.subjectId, e.evidenceRefs.length], ["GLOBAL_PRODUCT", null, null, 0]);
});

test("P29 · REAL · the current authority is applied and a superseded one is ignored", () => {
  const f07 = resolveAuthority({ records: AUTHORITY_CORPUS, propositionId: ACCEPTANCES.F07.authority.propositionId, scope: [...ACCEPTANCES.F07.authority.scope], now: CORPUS_PROVENANCE.now });
  assert.equal(f07.outcome, "CURRENT");
  assert.equal(f07.authority.contentHash, ACCEPTANCES.F07.ruling.sha256);
  const superseded = AUTHORITY_CORPUS.filter((r) => r.status === "SUPERSEDED");
  assert.ok(superseded.length >= 1, "no real supersession to prove against");
  for (const s of superseded) {
    const res = resolveAuthority({ records: AUTHORITY_CORPUS, propositionId: s.propositionId, scope: [...s.scope], now: CORPUS_PROVENANCE.now });
    assert.notEqual(res.authority?.contentHash, s.contentHash, `${s.authorityId} is superseded yet was applied`);
  }
});

test("P30 · REAL · F07's acceptance hashes to its pin, and ONE changed word is ACCEPTANCE_TAMPERED on F07", () => {
  const acc = ACCEPTANCES.F07;
  /* F07 Amendment 3 (governance 264c680) governs; Amendment 2 (051feb9) is kept frozen as F07_AMENDMENT_2 and named by `amends`;
   * Amendment 1 (a0b7e4b) is kept frozen as F07_AMENDMENT_1 and is what Amendment 2 amends; the ORIGINAL (cd149ae) is kept frozen
   * as F07_ORIGINAL and is what Amendment 1 amends. */
  /* RR-246 (restated): F07 Amendment 4 (governance 5afaae5, owner ruling RR-80 §5) governs; Amendment 3 (264c680) is kept frozen as
   * F07_AMENDMENT_3 and named by `amends` */
  assert.equal(contractSha256(acc), "e5b88fd0198877b34445892d895cf7cbfc2dfa36c35c04bbba53df0cd756614b");
  assert.equal(acc.ruling.sha256, "6b6ee2f23ede86eb82f42162efae5c49d1ddac802feda68d786a04bffb92a4cd");
  assert.deepEqual(acc.amends, { ruling: F07_AMENDMENT_3.ruling, contractSha256: F07_AMENDMENT_3.contractSha256 });
  assert.equal(contractSha256(F07_AMENDMENT_3), "06634cdfd4c5404647644fa3f8797e4c4eeffc9cc770da7853c59d418df9036f");
  assert.equal(F07_AMENDMENT_3.ruling.sha256, "ad4dc1e67a7fd71b2c7b26e54c90cc1486c7d6f14e25e23764d227a222d8cd26");
  assert.equal(contractSha256(F07_AMENDMENT_2), "cafe48d471cbd09575e69ebc7c51114dd50f785bf3b59b49285a36249ee7db42");
  assert.equal(F07_AMENDMENT_2.ruling.sha256, "9e9a3f6e4ad875a9802ca07e7d5953b454d6d04d76426cbac43fceb897aabed5");
  assert.deepEqual(F07_AMENDMENT_2.amends, { ruling: F07_AMENDMENT_1.ruling, contractSha256: F07_AMENDMENT_1.contractSha256 });
  assert.equal(contractSha256(F07_AMENDMENT_1), "9917f41712400d538442fec5496b85a664a336cc67557e4b548932dc5e7ba9b1");
  assert.equal(F07_AMENDMENT_1.ruling.sha256, "80a5e650db7000d2787975ab8b87b77602775184f4eaf3b858b5a98da3a86a21");
  assert.deepEqual(F07_AMENDMENT_1.amends, { ruling: F07_ORIGINAL.ruling, contractSha256: F07_ORIGINAL.contractSha256 });
  assert.equal(contractSha256(F07_ORIGINAL), "263ebb5cd23aaf2e98c95b66b307a25308da8b6f35e4c0e25b654a524f80b0a5");
  assert.equal(F07_ORIGINAL.ruling.sha256, "a9fbccdd040cc20d3962635372f318c49308086de6a8613842f8d957eb8b1112");
  assert.deepEqual(F07_AMENDMENT_3.amends, { ruling: F07_AMENDMENT_2.ruling, contractSha256: F07_AMENDMENT_2.contractSha256 });
  assert.ok(acc.expected.includes("unchanged"), "the tamper word is not in the amended text — the mutation below could not land");
  const tampered = { ...ACCEPTANCES, F07: { ...acc, expected: acc.expected.replace("unchanged", "changed") } };
  assert.notEqual(tampered.F07.expected, acc.expected);
  const board = buildBoard(CAPABILITIES, { ...DECLARED, F07: { featureId: "F07", board: "F_BOARD", state: "IN-PROGRESS", events: [{ kind: "ACCEPTANCE_FROZEN", on: "2026-09-23", ruling: acc.ruling, contractSha256: acc.contractSha256 }] } });
  assert.deepEqual(boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).filter((e) => e.id === "F07"), []);
  assert.ok(boardErrors(board, { capabilities: CAPABILITIES, acceptances: tampered }).some((e) => e.id === "F07" && e.code === "ACCEPTANCE_TAMPERED"));
});

test("P33 · REAL · no Row 52 payload was opened by anything this file ran — and no sealed path string is written in this file", () => {
  const self = fs.readFileSync(new URL(import.meta.url), "utf8");
  for (const p of REAL.paths) assert.ok(!self.includes(p), "a real sealed path is written in the proof file");
  for (const pre of EVIDENCE_ROLE_REGISTRY.filter((e) => e.role === "SEALED").flatMap((e) => e.resource.pathPrefixes)) assert.ok(!self.includes(pre), "a sealed prefix is written in the proof file");
  let seen;
  seen = readsDuring(() => { sealedPathPopulation(); decisionSiteCensus(); });
  assert.equal(touchesSealed(seen).length, 0);
});

test("P34 · the full F07 acceptance on the real and synthetic populations — callers, decisions, access exits, manifest, real denial", () => {
  const rows = callerCensus();
  assert.equal(bypasses(rows).length, 0);
  const d = decisionSiteCensus();
  assert.equal(d.byClass.DEFECT, 0);
  assert.equal(d.remainder, 0);
  assert.ok(d.sites.some((s) => s.family === "HELDOUT" && s.cls === "LIVE_AUDITED"));
  assert.deepEqual(heldoutAccessCensus().unrecorded, []);
  assert.deepEqual(manifestErrors({ manifest: MANDATORY_READING, required: REQUIRED, registry: EVIDENCE_ROLE_REGISTRY }), []);
  assert.equal(REAL.included, 61);
  assert.deepEqual(prodHashes(), PROD_BEFORE, "the production audit trail changed during this file");
});
