/**
 * 🔴 THE EXTERNAL OBSERVATION BATCH — IT RESOLVES, IT VERIFIES, AND IT REFUSES.
 *
 * The real crawl of 12 September lived inside this engine until 20 September 2026. It is a product's
 * material, not the engine's, and it now lives in the external data repository. Three things have to
 * be true for that to be an improvement rather than a hole:
 *
 *   1. the engine can still read it, through the roots it already declares;
 *   2. when it CANNOT read it, every path says so — no caller receives an empty list that reads as
 *      "this capture recorded nothing". That silent-zero is the failure this file exists to prevent;
 *   3. the bytes are still the evidence: the same sha256 and the same git object ids as before.
 *
 * 🔴 THE BYTE LAW MOVED HERE WITH THE FILES. test/evidence-eol.test.mjs holds every tracked file under
 * runs/ to its committed bytes under core.autocrlf=true and =false. The two migrated files were the
 * ONLY binary files it policed, so that half of its population left this repository. It is not lost:
 * the same check runs below, against the repository that now stores them.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { brotliCompressSync } from "node:zlib";
import { declareRoot } from "./helpers/root-registry.mjs";

import {
  batchAvailability, batchDir, batchFile, batchJsonlFiles, readBatchManifest,
  verifyBatchIntegrity, BATCH_FAULTS, BATCH_ID, ObservationBatchFault,
} from "../src/crawl/observation-batch.mjs";
import {
  classifyArtifact, classifyBytes, scanEngineTree, ARTIFACT_VERDICTS,
} from "../src/crawl/observation-guard.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

/** The frozen figures. They are the SAME numbers the engine pinned before the move. */
const FROZEN = {
  "first-real-crawl-2026-09-12.jsonl": { bytes: 629596, sha256: "0b9fb848436eca43dac54b0a4d3f220bb637e3c35b18a9d6297bc50b71bcc345", blob: "feabcaed628c8ffdd9a92df98b3ea463ab800ff7", records: 999 },
  "bodies-2026-09-12.jsonl.br": { bytes: 659647, sha256: "3d857a9e53fd4b015131bfd721788942a7c3df15b775e6633fb429bc84af3ded", blob: "e7983d1a7976bc5970205b2965114b8567745c0a", records: 394 },
  "edges-2026-09-12.jsonl.br": { bytes: 87754, sha256: "a367b8464fd1bd8f974e5538422e88d994058dc2f5428a090058fd4009975d3e", blob: "0626a123ea8b5b191288538e43f90ebf9e797aed", records: 19730 },
};

/* ================================================================== *
 * RESOLUTION
 * ================================================================== */

test("🔴 REAL: the batch resolves through the declared external root, and holds exactly the migrated population", () => {
  const a = batchAvailability();
  assert.equal(a.available, true, `the external observation batch did not resolve: ${a.detail}`);
  const m = readBatchManifest();
  assert.equal(m.batchId, BATCH_ID);
  assert.equal(m.classificationState, "UNASSIGNED", "a batch spanning many hosts must not arrive pre-assigned to a subject");
  assert.equal(m.assignmentRule, "requires lawful subject binding before actionable use");
  assert.deepEqual(m.files.map((f) => f.name).sort(), Object.keys(FROZEN).sort());
});

test("🔴 REAL: every migrated file has the bytes it had inside the engine — sha256, size AND git object id", () => {
  for (const [name, f] of Object.entries(FROZEN)) {
    const bytes = readFileSync(batchFile(name));
    assert.equal(bytes.length, f.bytes, `${name}: byte size changed`);
    assert.equal(sha256(bytes), f.sha256, `${name}: sha256 changed`);
    /* A git blob id is content-derived, so it survives the change of repository. That is why the
     * pins in test/renderer.test.mjs did not have to be rewritten. */
    const blob = execFileSync("git", ["hash-object", batchFile(name)], { cwd: REPO, encoding: "utf8" }).trim();
    assert.equal(blob, f.blob, `${name}: git object id changed`);
  }
});

test("🔴 THE BYTE LAW THAT MOVED WITH THE FILES: the batch checks out as its committed bytes under core.autocrlf=true AND =false", () => {
  const DATA = join(REPO, "..", "almi-visibility-data");
  const git = (args) => execFileSync("git", args, { cwd: DATA, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
  const paths = Object.keys(FROZEN).map((n) => `observations/${BATCH_ID}/${n}`);

  const committed = Object.fromEntries(paths.map((p) => [p, git(["rev-parse", `HEAD:${p}`])]));
  /* Hash the working-tree files as git would under each setting, and compare to what it stored. */
  for (const p of paths) {
    for (const autocrlf of ["true", "false"]) {
      const id = git(["-c", `core.autocrlf=${autocrlf}`, "hash-object", p]);
      assert.equal(id, committed[p], `${p} would change under core.autocrlf=${autocrlf} — the batch is not protected by -text`);
    }
  }
  assert.equal(paths.length, 3, "the population this law polices is not the one it was written for");
});

test("🔴 the archives still open, and their record counts are the ones recorded before the move", () => {
  const m = readBatchManifest();
  for (const [name, f] of Object.entries(FROZEN)) {
    assert.equal(m.recordCounts[name], f.records, `${name}: the manifest records a different count`);
  }
  assert.equal(batchJsonlFiles().length, 1, "the batch should expose exactly one plain .jsonl record file");
});

test("🔴 integrity: every file is verified against the hash the manifest recorded", () => {
  const v = verifyBatchIntegrity();
  assert.equal(v.checked.length, 3);
  assert.equal(v.classificationState, "UNASSIGNED");
});

/* ================================================================== *
 * IT FAILS CLOSED — the point of the whole exercise
 * ================================================================== */

const withRoot = (root) => ({ ALMIVISIBILITY_SUBJECT_ROOTS: root });

test("🔴 ABSENT ROOT: every accessor REFUSES — none of them returns an empty successful population", () => {
  const env = withRoot(join(REPO, ".test-scratch", "no-such-root"));
  const a = batchAvailability({ env });
  assert.equal(a.available, false);
  assert.equal(a.fault, BATCH_FAULTS.UNAVAILABLE);

  for (const [label, call] of [
    ["batchDir", () => batchDir({ env })],
    ["batchFile", () => batchFile("bodies-2026-09-12.jsonl.br", { env })],
    ["batchJsonlFiles", () => batchJsonlFiles({ env })],
    ["readBatchManifest", () => readBatchManifest({ env })],
    ["verifyBatchIntegrity", () => verifyBatchIntegrity({ env })],
  ]) {
    let threw = null;
    try { const r = call(); assert.fail(`${label} returned ${JSON.stringify(r)?.slice(0, 80)} instead of refusing`); }
    catch (e) { threw = e; }
    assert.ok(threw instanceof ObservationBatchFault, `${label} threw ${threw?.name}, not a named batch fault`);
    assert.equal(threw.fault, BATCH_FAULTS.UNAVAILABLE, `${label} did not report UNAVAILABLE`);
  }
});

test("🔴 A BATCH ID THAT DOES NOT EXIST is UNAVAILABLE, not empty", () => {
  const a = batchAvailability({ batchId: "crawl-1999-01-01" });
  assert.equal(a.available, false);
  assert.equal(a.fault, BATCH_FAULTS.UNAVAILABLE);
});

test("🔴 THE SAME BATCH IN TWO ROOTS is AMBIGUOUS — never resolved by precedence", () => {
  const a = mkdtempSync(join(tmpdir(), "almivis-root-a-"));
  const b = mkdtempSync(join(tmpdir(), "almivis-root-b-"));
  try {
    /* F03: two roots that each DECLARE an observations store holding the batch — the store itself is AMBIGUOUS. */
    for (const r of [a, b]) { mkdirSync(join(r, "observations", BATCH_ID), { recursive: true }); declareRoot(r, { stores: { OBSERVATIONS: "observations" } }); }
    const env = { ALMIVISIBILITY_SUBJECT_ROOTS: [a, b].join(process.platform === "win32" ? ";" : ":") };
    const av = batchAvailability({ env });
    assert.equal(av.available, false);
    assert.equal(av.fault, BATCH_FAULTS.AMBIGUOUS);
    assert.match(av.detail, /declared in more than one root registry/);
    /* and no filesystem path leaks into the refusal (F03 R3) */
    assert.ok(!av.detail.includes(a) && !av.detail.includes(b), "the refusal carries a private path");
    assert.throws(() => batchDir({ env }), (e) => e.fault === BATCH_FAULTS.AMBIGUOUS);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("🔴 TAMPERING: a single flipped byte makes the batch INVALID, not merely different", () => {
  const root = mkdtempSync(join(tmpdir(), "almivis-tamper-"));
  try {
    const dest = join(root, "observations", BATCH_ID);
    mkdirSync(dest, { recursive: true });
    declareRoot(root, { stores: { OBSERVATIONS: "observations" } });
    cpSync(batchDir(), dest, { recursive: true });
    const env = withRoot(root);
    /* Unmodified, the copy verifies. */
    assert.equal(verifyBatchIntegrity({ env }).checked.length, 3);

    const target = join(dest, "first-real-crawl-2026-09-12.jsonl");
    const bytes = readFileSync(target);
    bytes[100] = bytes[100] ^ 0x01;
    writeFileSync(target, bytes);
    assert.throws(() => verifyBatchIntegrity({ env }), (e) => e.fault === BATCH_FAULTS.INVALID, "a flipped byte verified as sound");

    /* A truncation is caught by size as well as by hash. */
    writeFileSync(target, readFileSync(target).subarray(0, 500));
    assert.throws(() => verifyBatchIntegrity({ env }), (e) => e.fault === BATCH_FAULTS.INVALID);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("🔴 A MANIFEST THAT DECLARES A FILE THE BATCH DOES NOT HOLD is INVALID", () => {
  const root = mkdtempSync(join(tmpdir(), "almivis-missing-"));
  try {
    const dest = join(root, "observations", BATCH_ID);
    mkdirSync(dest, { recursive: true });
    declareRoot(root, { stores: { OBSERVATIONS: "observations" } });
    cpSync(batchDir(), dest, { recursive: true });
    rmSync(join(dest, "edges-2026-09-12.jsonl.br"));
    assert.throws(() => verifyBatchIntegrity({ env: withRoot(root) }), (e) => e.fault === BATCH_FAULTS.INVALID);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * THE REPOSITORY GUARD — five cases, by CONTENT and LOCATION
 * ================================================================== */

const SYNTHETIC_RUN = [
  JSON.stringify({ record_type: "crawl_run", run_id: "aaa", started_at: "2026-01-01T00:00:00Z", perHostRequests: { "example.com": 2 } }),
  JSON.stringify({ record_type: "observation", observation_id: "o1", target: { ref: "https://example.com/a" } }),
].join("\n");

const REAL_RUN = [
  JSON.stringify({ record_type: "crawl_run", run_id: "bbb", started_at: "2026-01-01T00:00:00Z", perHostRequests: { "real-estate-host.test-not-reserved.io": 2 } }),
  JSON.stringify({ record_type: "observation", observation_id: "o1", target: { ref: "https://real-estate-host.test-not-reserved.io/a" } }),
].join("\n");

test("🔴 GUARD CASE 1: a synthetic fixture is ALLOWED, wherever it sits", () => {
  for (const location of ["engine", "external"]) {
    const c = classifyArtifact({ bytes: Buffer.from(SYNTHETIC_RUN), location });
    assert.equal(c.kind, "raw-crawl-batch", "the fixture was not even recognised as a crawl batch");
    assert.equal(c.verdict, ARTIFACT_VERDICTS.SYNTHETIC_FIXTURE, `a fixture about example.com was refused in ${location}`);
  }
});

test("🔴 GUARD CASE 2: a real observation artifact INSIDE the engine is FORBIDDEN", () => {
  const c = classifyArtifact({ bytes: Buffer.from(REAL_RUN), location: "engine" });
  assert.equal(c.verdict, ARTIFACT_VERDICTS.REAL_IN_ENGINE);
});

test("🔴 GUARD CASE 3: the same bytes in the EXTERNAL root are ALLOWED — location is half the rule", () => {
  const c = classifyArtifact({ bytes: Buffer.from(REAL_RUN), location: "external" });
  assert.equal(c.verdict, ARTIFACT_VERDICTS.EXTERNAL_REFERENCE);
});

test("🔴 GUARD CASE 4: missing external data is UNKNOWN, never a clean-looking pass", () => {
  const a = batchAvailability({ env: withRoot(join(REPO, ".test-scratch", "absent")) });
  assert.equal(a.available, false);
  assert.equal(a.fault, BATCH_FAULTS.UNAVAILABLE);
  /* F03: an absent root makes the root index UNKNOWN, so the declared store cannot be located — named, never empty */
  assert.match(a.detail, /OBSERVATIONS store is UNKNOWN \(ROOT_MISSING\)/, a.detail);
});

test("🔴 GUARD CASE 5: RENAMING AND COMPRESSING DOES NOT LAUNDER IT — filename is not consulted", () => {
  /* The same real batch, brotli-compressed and given a harmless name. */
  const disguised = brotliCompressSync(Buffer.from(REAL_RUN));
  const c = classifyArtifact({ bytes: disguised, location: "engine" });
  assert.equal(c.compressed, true, "the disguise was not even opened");
  assert.equal(c.verdict, ARTIFACT_VERDICTS.REAL_IN_ENGINE, "a compressed, renamed real artifact passed the guard");

  /* And a body archive, likewise. */
  const bodies = brotliCompressSync(Buffer.from(JSON.stringify({ observation_id: "x", body: '<a href="https://real-estate-host.test-not-reserved.io/p">p</a>' })));
  assert.equal(classifyArtifact({ bytes: bodies, location: "engine" }).verdict, ARTIFACT_VERDICTS.REAL_IN_ENGINE);

  /* A link graph is the third shape, and it is caught too. */
  const edges = brotliCompressSync(Buffer.from(JSON.stringify({ from: "https://real-estate-host.test-not-reserved.io/a", from_observation_id: "o1", to: "https://real-estate-host.test-not-reserved.io/b", to_parsed: true })));
  assert.equal(classifyArtifact({ bytes: edges, location: "engine" }).kind, "link-graph");
  assert.equal(classifyArtifact({ bytes: edges, location: "engine" }).verdict, ARTIFACT_VERDICTS.REAL_IN_ENGINE);
});

test("🔴 THE GUARD DOES NOT CONDEMN THE DERIVED ARTIFACTS THAT LEGITIMATELY LIVE HERE", () => {
  /* Replays, renders, evidence and audit findings all carry observation records about real hosts.
   * A rule of "observation record + real host" would have condemned fifteen files and taken the
   * suite down with it. Only a raw capture carries crawl_run records. */
  const derived = [
    JSON.stringify({ record_type: "observation", observation_id: "o1", target: { ref: "https://real-estate-host.test-not-reserved.io/a" } }),
    JSON.stringify({ record_type: "resighting", observation_id: "o1" }),
  ].join("\n");
  const c = classifyBytes(Buffer.from(derived));
  assert.equal(c.kind, null, "a derived observation store was classified as a raw crawl artifact");
  assert.equal(classifyArtifact({ bytes: Buffer.from(derived), location: "engine" }).verdict, ARTIFACT_VERDICTS.NOT_AN_ARTIFACT);
});

test("🔴 THE WHOLE TREE: this repository tracks NO real observation artifact", () => {
  const r = scanEngineTree({ repo: REPO });
  assert.ok(r.scanned > 400, `only ${r.scanned} files scanned — the guard would police almost nothing`);
  assert.deepEqual(
    r.forbidden.map((f) => f.path),
    [],
    "a real observation artifact is committed inside the engine again — it belongs in the external data repository",
  );
});

test("🔴 CONTROL: the tree scan FIRES when a real artifact is planted in a scanned repository", () => {
  /* A repository of its own, so the control shares the scanner's code path exactly. */
  const root = mkdtempSync(join(tmpdir(), "almivis-planted-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    writeFileSync(join(root, "harmless.md"), "# nothing to see\n");
    writeFileSync(join(root, "fixture.jsonl"), SYNTHETIC_RUN);
    /* Renamed and compressed, to prove the scan is not reading the extension. */
    writeFileSync(join(root, "notes.bin"), brotliCompressSync(Buffer.from(REAL_RUN)));
    execFileSync("git", ["add", "-A"], { cwd: root });

    const r = scanEngineTree({ repo: root });
    assert.equal(r.scanned, 3);
    assert.deepEqual(r.forbidden.map((f) => f.path), ["notes.bin"], "the planted real artifact was not caught, or the fixture was wrongly caught");
    assert.equal(r.forbidden[0].compressed, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
