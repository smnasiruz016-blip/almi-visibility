/**
 * 🔴 THE HELD-OUT FIREWALL, THE EVIDENCE-ROLE REGISTRY AND SEALED-PATH CONTAINMENT (22 September 2026).
 * GUARD, NOT EVIDENCE. Owner rulings: _handoffs a5452ee (RETIRED_CONTAMINATED), clarified by f4367b1 (role scope).
 *
 * REAL — the detector over the real tracked tree, the real registry, and the real observed-data carriers.
 * SYNTHETIC — NOT REAL EVIDENCE: sentinels and fixture trees built from test/support/synthetic-queries.mjs
 * (RULE there; SEEDS 7701 sentinels, 7702 sealed-path control). Nothing here names a real query or a real label.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { queryObservation } from "../src/discovery/row5.mjs";
import { splitPopulation } from "../src/discovery/query-population.mjs";
import { isHeldOut } from "../src/discovery/intent-clusters.mjs";
import { registryErrors, observedDataExemption, contentHashOf, ROLES, PERMISSIONS } from "../src/governance/evidence-roles.mjs";
import { readUnsealed, isSealed, SealedPathRefused } from "../src/governance/sealed-paths.mjs";
import { subjectRoots } from "../src/subject-roots.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { INTENT_REFERENCE } from "../config/discovery/intent-reference.mjs";
import { scan, derivePopulation, distinctiveFragments, registeredHashErrors, trackedFiles, categoryOf, HELD_OUT_EVALUATORS } from "../tools/heldout-firewall.mjs";
import { syntheticCorpus, EVIDENCE_CLASS } from "./support/synthetic-queries.mjs";
import { diagnosticGuardSink } from "../src/governance/guard-audit.mjs";
/* F08 §6 — the guards decide only with an audit sink; these proofs use a diagnostic one (never persisted). */
const SINK = () => diagnosticGuardSink({ actor: "test/heldout-firewall.test.mjs" });

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const REG = EVIDENCE_ROLE_REGISTRY;
const STORE = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const derive = (id) => {
  const rows = queryObservation(STORE, id).value.rows;
  const members = splitPopulation(rows).human.filter((r) => isHeldOut(r.query)).map((r) => r.query);
  const set = new Set(members.map((m) => m.toLowerCase()));
  return { members, others: rows.map((r) => r.query).filter((q) => !set.has(String(q).toLowerCase())) };
};
const RETIRED = REG.find((e) => e.role === "RETIRED_CONTAMINATED");
const FILES = trackedFiles(REPO);
const PROD = FILES.filter((p) => /^(src|bin|tools|config|subjects)\/.*\.mjs$/.test(p)).map((p) => readFileSync(join(REPO, p), "utf8"));
const EVAL = HELD_OUT_EVALUATORS.map((p) => readFileSync(join(REPO, p), "utf8"));

/* ═════════ REAL — THE TREE IS CLEAN ═════════ */

test("🔴 REAL — the retired population re-derives to its registered fingerprint (61 members), and the registry is lawful", () => {
  assert.deepEqual(registryErrors(REG), []);
  const pop = derivePopulation(RETIRED, derive);
  assert.equal(pop.ok, true, pop.why);
  assert.equal(pop.members.length, 61);
  assert.equal(RETIRED.population, 61);
});

test("🔴 REAL — ZERO retired payload in governance, the ledger, generated documents, tests, configuration and source; only registered observed data is exempt", () => {
  const pop = derivePopulation(RETIRED, derive);
  const fragments = distinctiveFragments(pop.members, pop.others, PROD);
  const r = scan({ registry: REG, root: "engine", base: REPO, files: FILES, members: pop.members, fragments, evaluatorSources: EVAL });
  assert.deepEqual(r.failures.map((f) => `${f.disposition} ${f.path}`), []);
  // the exemptions are exactly the registered engine carriers — and each is judged, not skipped
  const exempt = r.rows.filter((x) => x.disposition === "EXEMPT_REGISTERED_OBSERVED_DATA").map((x) => x.path).sort();
  assert.deepEqual(exempt, REG.filter((e) => e.role === "OBSERVED_DATA" && e.resource.root === "engine").map((e) => e.resource.path).sort());
  // live positive control over the same population: the store itself does carry the members (so zero elsewhere is not blindness)
  assert.ok(r.rows.find((x) => x.path === "runs/evidence/evidence.jsonl").full > 0);
  assert.ok(r.sealedExcluded > 0, "the sealed paths must be excluded, and there must be some to exclude");
});

test("🔴 REAL — every registered artefact still matches its hash, in the engine and in the declared external root", () => {
  assert.deepEqual(registeredHashErrors({ registry: REG, root: "engine", base: REPO, hashOf: contentHashOf }), []);
  const ext = REG.filter((e) => e.resource.root === "external");
  assert.ok(ext.length > 0);
  for (const e of ext) {
    const hit = subjectRoots(process.env).filter((r) => r.kind === "external").map((r) => join(r.path, e.resource.path)).filter(existsSync);
    assert.equal(hit.length, 1, `${e.id} must resolve in exactly one declared external root`);
    assert.equal(contentHashOf(readFileSync(hit[0])), e.contentHash, `${e.id} changed without re-registration`);
  }
});

test("🔴 REAL — the observed-data carriers are registered OBSERVED_DATA: not mandatory reading, never an expected answer, every permission explicit", () => {
  const obs = REG.filter((e) => e.role === "OBSERVED_DATA");
  assert.deepEqual(obs.map((e) => e.resource.path).sort(), [
    "research/local-reasoning-2026-09-21/records.jsonl", "runs/discovery/localized-reasoning-2026-09-21.json",
    "runs/discovery/localized-thinking-2026-09-15.json", "runs/discovery/search-language-2026-09-15.json", "runs/evidence/evidence.jsonl",
  ]);
  for (const e of obs) {
    for (const p of PERMISSIONS) assert.equal(typeof e[p], "boolean", `${e.id}.${p}`);
    assert.deepEqual([e.mandatoryReadable, e.mayEvaluate, e.maySupplyExpectedAnswer, e.sealed], [false, true, false, false], e.id);
  }
  // no held-out evaluator names any of them, and the only expected-answer configuration holds nothing
  for (const e of obs) for (const s of EVAL) assert.equal(s.includes(e.resource.path), false, e.id);
  assert.equal(INTENT_REFERENCE, null);
});

test("🔴 REAL — no replacement held-out set, marking key or expected-answer map was created for the RETIRED set", () => {
  /* since 27 Sep 2026 (F10's one selection, sealed and registered in storage S — engine cecf880 and its registration commit): two HELD_OUT_EVIDENCE entries exist — F10's OWN sealed sets, a new selection under F10's frozen acceptance, NOT a
   * replacement for the retired reference (which stays retired). No marking key and no expected-answer map exists. */
  /* RR-246: both F10 sets RETIRED (read out of band on 27 Sep; correction OOB-2026-09-27-A) — no held-out set or key exists; F10 needs fresh ones */
  assert.deepEqual(REG.filter((e) => ["HELD_OUT_EVIDENCE", "MARKING_KEY"].includes(e.role)).map((e) => e.id), []);
  assert.deepEqual(REG.filter((e) => e.role === "RETIRED_CONTAMINATED").map((e) => e.id), ["retired:held-out-set-3d4951d6673301bc", "sealed:f10-c3-selection", "sealed:f10-c7-pairs"]);
  assert.equal(REG.filter((e) => e.role === "MARKING_KEY").length, 0);
  assert.equal(INTENT_REFERENCE, null);
});

test("🔴 REAL — row 4 reaches its outcome from observations: its inputs are registered OBSERVED_DATA and its path reaches no held-out evaluator", () => {
  const lt = readFileSync(join(REPO, "src", "discovery", "localized-thinking.mjs"), "utf8");
  const lr = readFileSync(join(REPO, "src", "discovery", "local-reasoning.mjs"), "utf8");
  const bin = readFileSync(join(REPO, "bin", "localized-thinking.mjs"), "utf8");
  for (const s of [lt, lr, bin]) {
    assert.equal(/intent-clusters|intent-reference|heldOutCheck|compareToReference/.test(s), false, "row 4 must not reach a held-out evaluator or reference");
  }
  // its inputs are the registered observed data: the query store, row 3's output, and the external research batch
  const inputs = ["runs/evidence/evidence.jsonl", "runs/discovery/search-language-2026-09-15.json", "research/local-reasoning-2026-09-21/records.jsonl"];
  for (const p of inputs) assert.equal(REG.find((e) => e.resource.path === p)?.role, "OBSERVED_DATA", p);
});

test("🔴 REAL — the tombstones expose metadata only, and name the original blob each came from", () => {
  const T = FILES.filter((p) => /^runs\/audit\/.*\.txt$/.test(p)).filter((p) => readFileSync(join(REPO, p), "utf8").startsWith("TOMBSTONE — RETIRED_CONTAMINATED"));
  assert.equal(T.length, 6);
  for (const p of T) {
    const t = readFileSync(join(REPO, p), "utf8");
    assert.match(t, /^original blob {8}[0-9a-f]{40}$/m, p);
    assert.match(t, /^introduced in {8}[0-9a-f]{40}$/m, p);
    assert.match(t, /REPRODUCIBLE ONLY FROM GIT HISTORY/, p);
    assert.match(t, /MUST NOT be used as held-out, unseen, marking-key or expected-answer evidence/, p);
  }
});

test("🔴 REAL — governance loading reads the CURRENT tree only: no loader or detector reaches Git history for content", () => {
  /* 🔴 F05's runtime loaders join the list: the register, the census, the board and their entry points read the migrated
   * corpus, never Git. The one reader of Git objects is bin/authority-migrate.mjs, by design and by name: it reads the
   * committed bytes of ONE named governance commit (recorded as CORPUS_PROVENANCE.governanceCommit), after the
   * remediation — never an arbitrary earlier revision — and hashes them without printing them. */
  for (const p of ["tools/heldout-firewall.mjs", "bin/heldout-firewall.mjs", "src/governance/sealed-paths.mjs", "src/governance/evidence-roles.mjs",
    "src/authority/register.mjs", "src/authority/corpus.mjs", "src/fboard/board.mjs", "src/fboard/crosswalk.mjs", "src/fboard/acceptance.mjs", "bin/authority-resolve.mjs", "bin/fboard-status.mjs", "bin/fboard-crosswalk.mjs"]) {
    const s = readFileSync(join(REPO, p), "utf8");
    assert.equal(/cat-file|git["'`,\s]+show|"show"/.test(s), false, `${p} must not read contaminated history`);
  }
});

/* ═════════ SYNTHETIC — THE DETECTOR FIRES, THEN FALLS SILENT (seed 7701) ═════════ */

const G = syntheticCorpus({ seed: 7701 }).lexicon.filler;
/* F07 §5.1 — an EMPTY registry is unavailable seal metadata and now FAILS CLOSED (it used to read as "nothing is
 * sealed", which permitted every read). These detector proofs register nothing in root "t", so they are given one sealed
 * entry for an unrelated root: the metadata is available, and nothing in "t" is sealed — exactly what [] used to mean. */
const SEALED_ELSEWHERE = [{ id: "synthetic:sealed-elsewhere", role: "SEALED", resource: { root: "synthetic-elsewhere", pathPrefixes: ["nowhere/"] } }];
const SENTINEL = `${G[0]} ${G[1]} ${G[2]}`; // a generated, non-sensitive stand-in for a retired member
const CLASSES = {
  "CHECKLIST_NOTES.md": "MANDATORY_GOVERNANCE",
  "src/checklist/classification.mjs": "LEDGER",
  "runs/audit/report.txt": "GENERATED_DOCUMENT",
  "test/x.test.mjs": "ACTIVE_TEST",
  "config/discovery/expected.mjs": "EXPECTED_ANSWER_CONFIG",
  "config/other.mjs": "CONFIGURATION",
  "src/module.mjs": "PRODUCTION_SOURCE",
  "runs/data/observed.json": "DATA",
};
const tree = (plant) => {
  const base = mkdtempSync(join(tmpdir(), "firewall-"));
  for (const p of Object.keys(CLASSES)) { mkdirSync(join(base, p, ".."), { recursive: true }); writeFileSync(join(base, p), `header line\n${plant ? SENTINEL : "nothing to see"}\nfooter\n`); }
  return base;
};

test(`SYNTHETIC · seed 7701 · ${EVIDENCE_CLASS} — a planted sentinel is caught in EVERY file class, and each class is categorised as declared`, () => {
  const base = tree(true);
  try {
    for (const [p, c] of Object.entries(CLASSES)) assert.equal(categoryOf(p), c, p);
    const r = scan({ registry: SEALED_ELSEWHERE, root: "t", base, files: Object.keys(CLASSES), members: [SENTINEL.toLowerCase()], fragments: [] });
    assert.deepEqual(r.failures.map((f) => [f.path, f.category]).sort(), Object.entries(CLASSES).sort());
    assert.equal(r.failures.find((f) => f.category === "DATA").disposition, "FAIL_UNREGISTERED", "an unregistered observed file is refused");
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test("SYNTHETIC · seed 7701 — with each sentinel removed, the same detector is SILENT", () => {
  const base = tree(false);
  try {
    const r = scan({ registry: SEALED_ELSEWHERE, root: "t", base, files: Object.keys(CLASSES), members: [SENTINEL.toLowerCase()], fragments: [] });
    assert.deepEqual(r.failures, []);
    assert.deepEqual(r.rows, []);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test("SYNTHETIC · seed 7701 — the detector's output never carries the matched text, and the real runner's never carries a retired member", () => {
  const base = tree(true);
  try {
    const r = scan({ registry: SEALED_ELSEWHERE, root: "t", base, files: Object.keys(CLASSES), members: [SENTINEL.toLowerCase()], fragments: [] });
    assert.equal(JSON.stringify(r).toLowerCase().includes(SENTINEL.toLowerCase()), false);
    for (const g of G) assert.equal(JSON.stringify(r).includes(g), false);
  } finally { rmSync(base, { recursive: true, force: true }); }
  const out = spawnSync(process.execPath, [join(REPO, "bin", "heldout-firewall.mjs"), "--check", "--scope=synthetic"], { encoding: "utf8" }); // F10 Amendment 2 (governance 370a3b3): a test is CI evidence, so it runs the census in the declared SYNTHETIC scope; the REAL registration is proved by the recorded owner-machine PRODUCTION census, never by a test
  assert.equal(out.status, 0, out.stdout.slice(-600));
  const low = out.stdout.toLowerCase();
  for (const m of derive(RETIRED.resource.derivation.observationId).members) assert.equal(low.includes(m.toLowerCase()), false, "the runner printed a retired member");
});

test("SYNTHETIC · seed 7701 — a registered observed file is exempt only while its hash matches; a changed file is refused", () => {
  const base = tree(true);
  try {
    const p = "runs/data/observed.json";
    const entry = { ...REG.find((e) => e.id === "observed:search-console-store"), id: "synthetic:observed", resource: { root: "t", path: p }, contentHash: contentHashOf(readFileSync(join(base, p))) };
    assert.equal(observedDataExemption({ audit: SINK(), registry: [entry], root: "t", path: p, read: () => readFileSync(join(base, p)) }).code, "REGISTERED_OBSERVED_DATA");
    writeFileSync(join(base, p), `${readFileSync(join(base, p), "utf8")}changed\n`);
    assert.equal(observedDataExemption({ audit: SINK(), registry: [entry], root: "t", path: p, read: () => readFileSync(join(base, p)) }).code, "HASH_MISMATCH");
    assert.deepEqual(registeredHashErrors({ registry: [entry], root: "t", base, hashOf: contentHashOf }).map((e) => e.code), ["HASH_MISMATCH"]);
    // every other exemption condition, each refused by name
    const read = () => readFileSync(join(base, p));
    const refused = (over, code, extra = {}) => assert.equal(observedDataExemption({ audit: SINK(), registry: [{ ...entry, contentHash: contentHashOf(read()), ...over }], root: "t", path: p, read, ...extra }).code, code);
    refused({ maySupplyExpectedAnswer: true }, "MAY_SUPPLY_EXPECTED_ANSWER");
    refused({ mandatoryReadable: true }, "MANDATORY_READING");
    refused({ role: "TRAINING_DATA" }, "NOT_OBSERVED_DATA");
    refused({}, "IMPORTED_BY_HELD_OUT_EVALUATOR", { evaluatorSources: [`readFileSync("${p}")`] });
  } finally { rmSync(base, { recursive: true, force: true }); }
});

/* ═════════ SYNTHETIC — THE REGISTRY FAILS CLOSED ═════════ */

test("SYNTHETIC — the registry fails closed: a missing role, an unstated or non-boolean permission, two roles, or a forbidden permission", () => {
  const good = REG.find((e) => e.id === "observed:search-console-store");
  const codes = (reg) => registryErrors(reg).map((e) => e.code);
  assert.deepEqual(codes([]), ["REGISTRY_EMPTY"]);
  const { role, ...noRole } = good;
  assert.ok(codes([noRole]).includes("ROLE_MISSING"));
  assert.ok(codes([{ ...good, role: "WHATEVER" }]).includes("ROLE_UNKNOWN"));
  const { mayTrain, ...noTrain } = good;
  assert.ok(codes([noTrain]).includes("FIELD_MISSING"));
  assert.ok(codes([{ ...good, mayTrain: "as already lawfully governed" }]).includes("PERMISSION_NOT_BOOLEAN"));
  assert.ok(codes([good, { ...good, id: "dup", role: "TRAINING_DATA" }]).includes("DUAL_ROLE"));
  assert.ok(codes([{ ...good, maySupplyExpectedAnswer: true }]).includes("ROLE_PERMISSION_CONFLICT"));
  assert.ok(codes([{ ...good, id: "mk", role: "MARKING_KEY", sealed: false, resource: { root: "engine", path: "x.json" } }]).includes("ROLE_PERMISSION_CONFLICT"));
  const syn = REG.find((e) => e.role === "SYNTHETIC_TEST_FIXTURE");
  assert.ok(codes([{ ...syn, mayEvaluate: true }]).includes("ROLE_PERMISSION_CONFLICT"), "a synthetic fixture may never count as real evidence");
  assert.ok(codes([{ ...RETIRED, mayEvaluate: true }]).includes("ROLE_PERMISSION_CONFLICT"), "the retired population may never evaluate");
  assert.equal(ROLES.length, 9);
});

test("REAL — the synthetic fixture generator is registered SYNTHETIC_TEST_FIXTURE, never real evidence, and its bytes are pinned", () => {
  const syn = REG.find((e) => e.role === "SYNTHETIC_TEST_FIXTURE");
  assert.equal(syn.resource.path, "test/support/synthetic-queries.mjs");
  assert.deepEqual([syn.mayEvaluate, syn.maySupplyExpectedAnswer, syn.mayTrain], [false, false, false]);
  assert.equal(contentHashOf(readFileSync(join(REPO, syn.resource.path))), syn.contentHash);
  // no production module IMPORTS a test fixture. 🔴 22 Sep: a first draft matched the bare path string, and fired on the
  // registry that DECLARES this fixture (config/evidence-roles.mjs names its path to pin it) — a declaration, not an import.
  const IMPORTS_FIXTURE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'`][^"'`]*support\/synthetic-queries(?:\.mjs)?["'`]/;
  assert.ok(IMPORTS_FIXTURE.test('import { syntheticCorpus } from "../test/support/synthetic-queries.mjs";') && IMPORTS_FIXTURE.test('await import("../test/support/synthetic-queries.mjs")'), "control: the import shape fires");
  assert.equal(IMPORTS_FIXTURE.test('resource: { root: "engine", path: "test/support/synthetic-queries.mjs" }'), false, "control: a declared path is not an import");
  const prodFiles = FILES.filter((x) => /^(src|bin|tools|config|subjects)\/.*\.mjs$/.test(x));
  assert.ok(prodFiles.length > 100, `only ${prodFiles.length} production modules`);
  for (const p of prodFiles) assert.equal(IMPORTS_FIXTURE.test(readFileSync(join(REPO, p), "utf8")), false, p);
});

test("REAL — every synthetic fixture set in the remediated tests names its generating rule and seed", () => {
  for (const p of ["test/intent-clustering.test.mjs", "test/row5-guards.test.mjs", "test/heldout-firewall.test.mjs", "test/search-language.test.mjs", "test/axis-discovery.test.mjs"]) {
    const t = readFileSync(join(REPO, p), "utf8");
    assert.match(t, /SYNTHETIC/, p);
    assert.match(t, /seed:? ?\d{4}|SEEDS?:? ?\d{4}/i, p);
    assert.match(t, /NOT REAL EVIDENCE/, p);
  }
});

/* ═════════ SYNTHETIC — SEALED PATHS ARE REFUSED UNREAD (seed 7702) ═════════ */

test("SYNTHETIC · seed 7702 — an ordinary loader refuses a sealed path WITHOUT reading it, even when the file does not exist", () => {
  const g = syntheticCorpus({ seed: 7702 }).lexicon.filler;
  const registry = [{ id: "synthetic:sealed", role: "SEALED", resource: { root: "t", pathPrefixes: [`${g[0]}/`] } }];
  let reads = 0;
  const read = () => { reads += 1; return "should never be read"; };
  assert.throws(() => readUnsealed({ audit: SINK(), registry, root: "t", base: "/nowhere", path: `${g[0]}/${g[1]}.json`, read }), (e) => e instanceof SealedPathRefused && e.code === "SEALED_PATH_REFUSED");
  assert.equal(reads, 0, "the sealed path was read before it was refused");
  assert.equal(readUnsealed({ audit: SINK(), registry, root: "t", base: "/nowhere", path: `${g[1]}/${g[2]}.json`, read }), "should never be read");
  assert.equal(reads, 1, "an unsealed path is read normally");
  // the detector excludes it the same way: counted, never opened
  const r = scan({ registry, root: "t", base: "/nowhere", files: [`${g[0]}/${g[1]}.json`], members: ["x"], fragments: [], read });
  assert.deepEqual([r.sealedExcluded, reads], [1, 1]);
});

test("REAL — the sealed case-study paths are refused by prefix, by path-presence only", () => {
  const sealed = REG.find((e) => e.role === "SEALED");
  assert.equal(sealed.contentHash, null, "sealed content is never hashed");
  const present = FILES.filter((p) => isSealed(REG, "engine", p));
  assert.ok(present.length > 0);
  for (const p of present) assert.throws(() => readUnsealed({ audit: SINK(), registry: REG, root: "engine", base: REPO, path: p, read: () => { throw new Error("READ"); } }), SealedPathRefused);
});
