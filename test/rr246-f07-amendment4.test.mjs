/**
 * 🔴 RR-246 · F07 ACCEPTANCE AMENDMENT 4 (_handoffs 5afaae5, contract e5b88fd0…; owner ruling RR-80 §5, bba3446) — the three conditions
 * before F07 may be re-verified: every known out-of-band read REPRESENTED (one audit correction), the read guard INSTALLED in the
 * operator's tooling and shown refusing a planted read, and every existing F07 proof and sabotage re-run. Plus the technical ruling
 * of 10 Oct 2026: the two sets the known reads reached are RETIRED and may never evaluate again. Every expected answer is written by
 * hand. Spawned runs write only a confined audit store, each its own, read here and then removed. No sealed set is ever read.
 *
 *   KR-1  the register: ONE correction naming the 8 known reads, count-only — no sealed value, no store location, no file in a store
 *   KR-2  FIRING CONTROLS: a correction that claims an ACCESS record, claims a repair, miscounts, or names a path is refused
 *   KR-3  THE RECORDER PATH (in-process, CONFINED store): the correction is appended ONCE, under F07 Amendment 4's authority, and a
 *         second offer finds it already on the trail. 🔴 It never spawns bin/audit-trail.mjs: that entry point writes the PRODUCTION
 *         trail even inside a test run (RR-246: a first draft of this test did exactly that — the real correction, +2, recorded by a test)
 *   KR-3b KR-3 spawns no entry point and binds only a confined store (static; its sabotages add a dead spawn or drop the refusal)
 *   KR-4  REAL: the production trail holds exactly one such correction, naming 8 reads and both sets
 *   RT-1  REAL: both sets RETIRED, never evaluable, still sealed; the lifecycle refuses each (CONTROL: an evaluable copy is not refused)
 *   RT-2  REAL: retired, they still REQUIRE their store, which fails closed unlocated (CONTROL: an unsealed retired set requires nothing)
 *   RT-3  retired, they are still read and scanned inside the boundary, a leak named FAIL_RETIRED_PAYLOAD (on a constructed store)
 *   GD-1  LOCAL (owner machine only): ONE PreToolUse hook for every tool runs the guard; driven exactly as installed it refuses a planted
 *         read of a SYNTHETIC store by location and by dereference, names no location, and allows an unrelated read
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { registryErrors } from "../src/governance/evidence-roles.mjs";
import { requiredStores, sealedStoreStatus, resolveSealedStoreRoots, isStoreSealedEntry } from "../src/governance/sealed-store-roots.mjs";
import { scannedInBoundary, sealedRolePopulation, ROLE_DISPOSITION } from "../tools/heldout-firewall.mjs";
import { requestHeldOutAccess } from "../src/heldout/lifecycle.mjs";
import { countingStore } from "../tools/heldout-access-census.mjs";

import { KNOWN_OUT_OF_BAND_READS } from "../config/known-out-of-band-reads.mjs";
import { knownReadsFaults, knownReadsEventDraft, KNOWN_READS_EVENT } from "../src/audit-trail/known-reads.mjs";
import { metadataFaults } from "../src/audit-trail/event.mjs";
import { recordCandidates } from "../src/audit-trail/recorder.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { resolveAuditStoreLocation } from "../src/governance/governed-run.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { correctionsNotOnTrail } from "../src/audit-trail/known-reads.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const jsonl = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const SETS = ["sealed:f10-c3-selection", "sealed:f10-c7-pairs"];
const AUTH = { propositionId: "F07_ACCEPTANCE_AMENDMENT_4", scope: ["ALMIVISIBILITY", "F07"] };
const draftOf = (c) => knownReadsEventDraft({ correction: c, occurredAt: "2026-10-10T00:00:00Z", softwareVersion: "test", authorityRef: AUTH, authorityHash: "0".repeat(64), correlationId: "run:test" });


/* ================= KR ================= */

test("KR-1 · the register: ONE correction naming the 8 known reads, count-only — no sealed value, no store location, no file inside a store", () => {
  assert.equal(KNOWN_OUT_OF_BAND_READS.length, 1);
  const c = KNOWN_OUT_OF_BAND_READS[0];
  assert.deepEqual([c.correctionId, c.knownReads, c.reads.length, [...c.setsRead]], ["OOB-2026-09-27-A", 8, 8, SETS]);
  assert.deepEqual(knownReadsFaults(c), []);
  assert.deepEqual([c.accessRecorded.slice(0, 2), c.treatment], ["NO", "REPRESENTED_NOT_REPAIRED"]);
  assert.match(c.setsTreatedAs, /^DISCLOSED — both sets retired/);
  /* the eight instants, as classified at _handoffs be583fa §C3 — written here by hand */
  assert.deepEqual(c.reads.map((r) => r.split(" ")[1]), ["2026-09-27T02:19:23Z", "2026-09-27T02:20:23Z", "2026-09-27T03:53:19Z", "2026-09-27T04:08:36Z", "2026-09-27T04:56:02Z", "2026-09-27T06:04:14Z", "2026-09-27T21:35:01Z", "2026-09-27T21:44:19Z"]);
  /* no read names a file or a directory: every read is a count, an instant, a tool class and side words */
  for (const r of c.reads) assert.doesNotMatch(r, /[\\/]|\.txt|\.jsonl|\.json\b/, `a read names a path: ${r.slice(0, 40)}`);
  const d = draftOf(c);
  assert.deepEqual([d.eventType, d.action, d.metadata.knownReads, d.metadata.setsRead], [KNOWN_READS_EVENT.eventType, "RECORD_KNOWN_OUT_OF_BAND_READS", 8, SETS.join(",")]);
  assert.deepEqual(metadataFaults(d.metadata), [], "the correction's metadata is not a lawful audit body");
});

test("KR-2 · FIRING CONTROLS: a correction that claims an ACCESS record, claims a repair, miscounts, names a path or leaves a set undisclosed is refused", () => {
  const c = KNOWN_OUT_OF_BAND_READS[0];
  const codes = (x) => knownReadsFaults(x).map((f) => f.code);
  assert.ok(codes({ ...c, accessRecorded: "YES — recorded" }).includes("CORRECTION_CLAIMS_ACCESS_RECORDED"));
  assert.ok(codes({ ...c, treatment: "REPAIRED" }).includes("CORRECTION_CLAIMS_REPAIR"));
  assert.ok(codes({ ...c, knownReads: 7 }).includes("CORRECTION_COUNT_MISMATCH"));
  assert.ok(codes({ ...c, reads: [...c.reads.slice(0, 7), "8 2026-09-27T21:44:19Z SCRATCH_SEAL_CHECK set/items.txt"] }).includes("CORRECTION_READ_MALFORMED"));
  assert.ok(codes({ ...c, setsTreatedAs: "STILL EVALUABLE" }).includes("CORRECTION_SETS_NOT_DISCLOSED"));
  assert.throws(() => draftOf({ ...c, treatment: "REPAIRED" }), /CORRECTION_REFUSED/);
  /* CONTROL: the real register drafts */
  assert.doesNotThrow(() => draftOf(c));
});

test("KR-3 · THE RECORDER PATH (in-process, CONFINED store): the correction is appended ONCE under F07 Amendment 4's authority; a second offer adds nothing", () => {
  const loc = resolveAuditStoreLocation({ repo: REPO });
  assert.equal(loc.synthetic, true, "not a confined store — the proof would write the production trail");
  const store = productionAuditStore({ repo: REPO, at: { eventsPath: loc.eventsPath, headPath: loc.headPath } });
  const a4 = AUTHORITY_CORPUS.find((r) => r.propositionId === "F07_ACCEPTANCE_AMENDMENT_4");
  assert.ok(a4, "F07 Amendment 4 is not a CURRENT authority record");
  const offer = () => correctionsNotOnTrail(KNOWN_OUT_OF_BAND_READS, store.readAll().events).map((correction) => ({ family: KNOWN_READS_EVENT.eventType, sourceId: correction.correctionId, draft: knownReadsEventDraft({ correction, occurredAt: "2026-10-10T00:00:00Z", softwareVersion: "test", authorityRef: { propositionId: a4.propositionId, scope: [...a4.scope] }, authorityHash: a4.contentHash, correlationId: "run:test:kr3" }) }));
  const first = recordCandidates({ store, candidates: offer(), corpus: AUTHORITY_CORPUS });
  assert.deepEqual([first.counts.migrated, first.counts.invalid, first.remainder], [1, 0, 0], JSON.stringify(first.invalid));
  const mine = store.readAll().events.filter((e) => e.action === "RECORD_KNOWN_OUT_OF_BAND_READS");
  assert.deepEqual([mine.length, mine[0].metadata.knownReads, mine[0].authorityRef], [1, 8, AUTH]);
  assert.deepEqual(offer(), [], "a recorded correction was offered again");
});

test("KR-3b · KR-3 spawns no entry point and binds ONLY a confined store — it can never write the production trail (the RR-246 first draft did)", () => {
  const self = readFileSync(new URL(import.meta.url), "utf8");
  const start = self.indexOf('test("KR-3 · THE RECORDER PATH');
  const end = self.indexOf('test("KR-3b ·', start);
  assert.ok(start > 0 && end > start, "the KR-3 block was not found");
  const block = self.slice(start, end);
  assert.doesNotMatch(block, /\bspawn(?:Sync)?\s*\(|\bexecFile(?:Sync)?\s*\(|\bexec(?:Sync)?\s*\(|\bfork\s*\(/, "KR-3 spawns a process");
  assert.doesNotMatch(block, /["'`]bin\//, "KR-3 names an entry point");
  assert.match(block, /assert\.equal\(loc\.synthetic, true,/, "KR-3 no longer refuses a non-confined store before it writes");
});

test("KR-4 · REAL: the production trail holds exactly one known-read correction, naming 8 reads and both sets, under Amendment 4's authority", () => {
  const real = jsonl(TRAIL).filter((e) => e.action === "RECORD_KNOWN_OUT_OF_BAND_READS");
  assert.equal(real.length, 1);
  assert.deepEqual([real[0].metadata.correctionId, real[0].metadata.knownReads, real[0].metadata.setsRead, real[0].authorityRef], ["OOB-2026-09-27-A", 8, SETS.join(","), AUTH]);
  for (let i = 1; i <= 8; i += 1) assert.ok(real[0].metadata[`read${i}`]?.startsWith(`${i} 2026-09-27T`), `read ${i} missing`);
});

/* ================= RT · the two sets the known reads reached are RETIRED (technical ruling 2026-10-10) ================= */

test("RT-1 · REAL: both sets are RETIRED_CONTAMINATED, never evaluable, still sealed with a stated reason — and the lifecycle refuses each; CONTROL: an evaluable copy is not", () => {
  const two = EVIDENCE_ROLE_REGISTRY.filter((e) => SETS.includes(e.id));
  assert.deepEqual(two.map((e) => [e.id, e.role, e.mayEvaluate, e.sealed, e.mandatoryReadable, /^RETIRED 10 Oct 2026/.test(e.retiredReason)]), SETS.map((id) => [id, "RETIRED_CONTAMINATED", false, true, false, true]));
  assert.deepEqual(registryErrors(EVIDENCE_ROLE_REGISTRY), []);
  assert.equal(EVIDENCE_ROLE_REGISTRY.filter((e) => e.role === "HELD_OUT_EVIDENCE" && e.mayEvaluate === true).length, 0, "an evaluable held-out set remains");
  /* FIRING CONTROL: a retired set that claims it may evaluate is an unlawful registry */
  assert.ok(registryErrors(EVIDENCE_ROLE_REGISTRY.map((e) => (e.id === SETS[0] ? { ...e, mayEvaluate: true } : e))).some((x) => x.code === "ROLE_PERMISSION_CONFLICT"));
  const audit = () => ({ store: countingStore(), actor: "test/rr246", softwareVersion: "engine:test", correlationId: `run:rr246-rt1:${Math.random()}`, authorityRef: { propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: ["ALMIVISIBILITY"] }, authorityHash: "d".repeat(64) });
  const ask = (registry, e) => requestHeldOutAccess({ audit: audit(), registry, request: { mechanismId: "rr246-mechanism", mechanismHash: "a".repeat(64), sealedSetId: e.id, populationCommitment: e.contentHash, protocolId: "rr246-protocol", evaluatorAuthority: { propositionId: "SYNTHETIC_F07_EVALUATOR", scope: ["ALMIVISIBILITY"] }, purpose: "assessment", at: "2026-10-10T00:00:00Z" } });
  for (const e of two) assert.deepEqual([ask(EVIDENCE_ROLE_REGISTRY, e).allowed, ask(EVIDENCE_ROLE_REGISTRY, e).code], [false, "SET_RETIRED_CONTAMINATED"]);
  /* CONTROL: the same request against a copy where the set is still an evaluable held-out set gets PAST the set check */
  const live = { ...two[0], role: "HELD_OUT_EVIDENCE", mayEvaluate: true, retiredReason: null };
  assert.notEqual(ask(EVIDENCE_ROLE_REGISTRY.map((e) => (e.id === live.id ? live : e)), live).code, "SET_RETIRED_CONTAMINATED");
});

test("RT-2 · REAL: retired, the two still REQUIRE their store — unlocated, it FAILS CLOSED by name; CONTROL: a retired set that is not sealed requires nothing", () => {
  assert.deepEqual([...requiredStores(EVIDENCE_ROLE_REGISTRY)], [["f10-marking-key", SETS]]);
  assert.deepEqual(sealedStoreStatus({ registry: EVIDENCE_ROLE_REGISTRY, resolution: resolveSealedStoreRoots({ env: {} }) }).map((s) => [s.store, s.requiredBy, s.fails]), [["f10-marking-key", 2, true]]);
  assert.equal(isStoreSealedEntry({ role: "RETIRED_CONTAMINATED", sealed: false }), false);
  assert.equal(isStoreSealedEntry({ role: "RETIRED_CONTAMINATED", sealed: true }), true);
});

test("RT-3 · retired, the two are still READ AND SCANNED inside the boundary by the leak census, and a leak of their content is named FAIL_RETIRED_PAYLOAD — on a constructed store", () => {
  const real = EVIDENCE_ROLE_REGISTRY.filter(scannedInBoundary).map((e) => e.id);
  assert.deepEqual(real, SETS, "a retired set that stays sealed is no longer read in the boundary");
  const entry = { ...EVIDENCE_ROLE_REGISTRY.find((e) => e.id === SETS[0]), resource: { root: "rr246-constructed", pathPrefixes: ["set/"] } };
  const pop = sealedRolePopulation(entry, { roots: { "rr246-constructed": "/constructed" }, filesOf: () => ["set/items.txt"], read: () => Buffer.from("constructed-member-alpha\nconstructed-member-bravo\n") });
  assert.deepEqual([pop.ok, pop.members.length, pop.source], [true, 2, "SEALED_PREFIX"]);
  assert.equal(ROLE_DISPOSITION.RETIRED_CONTAMINATED, "FAIL_RETIRED_PAYLOAD");
  /* CONTROL: a retired DERIVED population keeps its own route, never this one */
  assert.equal(scannedInBoundary({ role: "RETIRED_CONTAMINATED", sealed: false, resource: { derivation: { rule: "X" } } }), false);
});

/* ================= GD · the read guard, installed in the operator's tooling (owner GREEN E1, 2026-10-10) ================= */

const SETTINGS = join(homedir(), ".claude", "settings.json");
test("GD-1 · LOCAL: ONE PreToolUse hook for every tool runs the guard; driven exactly as installed, it refuses a planted read of a synthetic store by location and by dereference, names no location, and allows an unrelated read", { skip: existsSync(SETTINGS) ? false : "the operator's user-level settings exist only on the owner machine" }, () => {
  const hooks = JSON.parse(readFileSync(SETTINGS, "utf8")).hooks?.PreToolUse ?? [];
  const mine = hooks.filter((h) => (h.hooks ?? []).some((x) => /tools\/sealed-store-read-guard\.mjs/.test(String(x.command))));
  assert.equal(mine.length, 1, "not exactly one installed guard hook");
  assert.equal(mine[0].matcher, "*", "the guard does not cover every tool");
  const command = mine[0].hooks.find((x) => /sealed-store-read-guard/.test(String(x.command))).command;
  const script = command.match(/"([^"]+sealed-store-read-guard\.mjs)"/)[1];
  assert.equal(resolve(script).toLowerCase(), resolve(REPO, "tools", "sealed-store-read-guard.mjs").toLowerCase(), "the installed hook runs another file");
  const dir = mkdtempSync(join(tmpdir(), "rr246-syn-store-"));
  try {
    mkdirSync(join(dir, "set"));
    writeFileSync(join(dir, "set", "planted.txt"), "planted, synthetic\n");
    const env = { ...process.env, ALMIVISIBILITY_SEALED_STORE_F10_KEY: dir };
    const run = (input) => spawnSync(process.execPath, [script], { input: JSON.stringify(input), encoding: "utf8", env });
    const byLocation = run({ tool_name: "Read", tool_input: { file_path: join(dir, "set", "planted.txt") } });
    assert.equal(byLocation.status, 2, byLocation.stderr);
    assert.match(byLocation.stderr, /SEALED_STORE_DIRECT_READ_REFUSED \(LOCATION, store f10-marking-key\)/);
    assert.ok(!byLocation.stderr.toLowerCase().includes(dir.toLowerCase().replace(/\\/g, "/")) && !byLocation.stderr.includes(dir), "a refusal named the location");
    const byReference = run({ tool_name: "Bash", tool_input: { command: "cat \"${" + "ALMIVISIBILITY_SEALED_STORE_F10_KEY}/set/planted.txt\"" } });
    assert.equal(byReference.status, 2, byReference.stderr);
    assert.match(byReference.stderr, /ENV_REFERENCE_DEREFERENCE/);
    const unrelated = run({ tool_name: "Read", tool_input: { file_path: join(REPO, "README.md") } });
    assert.equal(unrelated.status, 0, "an unrelated read was refused");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
