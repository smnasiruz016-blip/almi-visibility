/**
 * 🔴 THE DECLARED EXTERNAL SOURCE ENUMERATOR — every required behaviour driven by a real input.
 *
 * Row 60's census exists so that "a file that was not read cannot pass unnoticed". When two of its
 * record files moved out of this repository, reading `runs/` alone stopped seeing 1,004 records and
 * nothing went red — the census had quietly become a census of what was left behind.
 *
 * ── THE ONE RULE THAT MATTERS HERE ─────────────────────────────────────────
 *
 * 🔴 AN OLD PATH AND AN EXTERNAL FILE ARE THE SAME SOURCE ONLY WHEN A MANIFEST SAYS SO.
 *
 * Not when the filenames match, not when the directories look alike, not when the record counts
 * agree, and — the tempting one — not when the bytes hash identically. Byte identity proves the
 * CONTENT is the same; it says nothing about whether one file was moved to replace another, and
 * acting on it would let any coincidence silently delete a source from the census.
 *
 * Both cases are driven below: a batch whose manifest declares `sourceFile` supersedes that path,
 * and a batch whose manifest does not stays separate EVEN WHEN THE BYTES ARE IDENTICAL.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { declaredObservationBatches, declaredObservationSources, mergeDeclaredSources, ObservationBatchFault, BATCH_FAULTS } from "../src/crawl/observation-batch.mjs";
import { SUBJECT_ROOTS_ENV } from "../src/subject-roots.mjs";

const RECORD = (i) => JSON.stringify({ record_type: "observation", observation_id: `synthetic-${i}`, method: "synthetic.collect", value: {} });

/** A synthetic external root — an invented client, sharing nothing with any connected material. */
function root({ batches }) {
  const dir = mkdtempSync(join(tmpdir(), "almivis-batches-"));
  for (const b of batches) {
    const bd = join(dir, "observations", b.batchId);
    mkdirSync(bd, { recursive: true });
    const files = [];
    for (const f of b.files) {
      const bytes = Buffer.from(`${f.records.map(RECORD).join("\n")}\n`, "utf8");
      writeFileSync(join(bd, f.name), bytes);
      if (!f.undeclared) {
        files.push({ name: f.name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), ...(f.sourceFile ? { sourceFile: f.sourceFile, sourceRepository: "almi-visibility" } : {}) });
      }
    }
    writeFileSync(join(bd, "manifest.json"), JSON.stringify({ batchId: b.batchId, classificationState: "UNASSIGNED", files }));
  }
  return dir;
}
const env = (dir) => ({ [SUBJECT_ROOTS_ENV]: dir });
const ids = (n) => Array.from({ length: n }, (_, i) => i);

test("a migrated external source available and verified is included EXACTLY ONCE, under its canonical path", () => {
  const dir = root({ batches: [{ batchId: "capture-0001", files: [{ name: "records.jsonl", records: ids(3) }] }] });
  try {
    const s = declaredObservationSources({ env: env(dir) });
    assert.equal(s.length, 1);
    assert.equal(s[0].canonical, "observations/capture-0001/records.jsonl");
    assert.equal(s[0].batchId, "capture-0001");
    /* Canonical means portable: no drive letter, no checkout location, no absolute segment. */
    assert.ok(!s[0].canonical.includes(":"), "the canonical path carries a drive letter");
    assert.ok(!s[0].canonical.startsWith("/"), "the canonical path is absolute");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("EVERY declared batch is enumerated — not just the one the engine names by default", () => {
  const dir = root({ batches: [
    { batchId: "capture-0001", files: [{ name: "a.jsonl", records: ids(2) }] },
    { batchId: "capture-0002", files: [{ name: "b.jsonl", records: ids(4) }] },
  ] });
  try {
    assert.deepEqual(declaredObservationBatches({ env: env(dir) }).map((b) => b.batchId), ["capture-0001", "capture-0002"]);
    assert.deepEqual(declaredObservationSources({ env: env(dir) }).map((s) => s.canonical),
      ["observations/capture-0001/a.jsonl", "observations/capture-0002/b.jsonl"]);
    /* This is the defect that lost 999 records: an enumerator that knew one batch. */
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("🔴 a DECLARED mapping supersedes the old path — and only a declared mapping does", () => {
  const dir = root({ batches: [{ batchId: "capture-0001", files: [{ name: "records.jsonl", records: ids(3), sourceFile: "runs/evidence/old.jsonl" }] }] });
  try {
    const [s] = declaredObservationSources({ env: env(dir) });
    assert.deepEqual(s.replaces, { path: "runs/evidence/old.jsonl", repository: "almi-visibility" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("🔴 IDENTICAL BYTES DO NOT MAKE A MAPPING — without a declaration the two stay separate sources", () => {
  /* The same records, the same byte count, the same hash — and no `sourceFile`. */
  const dir = root({ batches: [{ batchId: "capture-0001", files: [{ name: "records.jsonl", records: ids(3) }] }] });
  try {
    const [s] = declaredObservationSources({ env: env(dir) });
    assert.equal(s.replaces, null, "a source claimed to replace a path that no manifest named");

    /* CONTROL: the identical batch WITH the declaration does carry one — so the null above is the
     * missing declaration talking, not an enumerator that never reports a mapping. */
    const declared = root({ batches: [{ batchId: "capture-0001", files: [{ name: "records.jsonl", records: ids(3), sourceFile: "runs/evidence/old.jsonl" }] }] });
    try {
      assert.equal(declaredObservationSources({ env: env(declared) })[0].replaces.path, "runs/evidence/old.jsonl");
    } finally { rmSync(declared, { recursive: true, force: true }); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("🔴 an external source that is MISSING fails loudly — never an empty successful population", () => {
  const empty = mkdtempSync(join(tmpdir(), "almivis-noroot-"));
  try {
    assert.throws(() => declaredObservationSources({ env: env(join(empty, "does-not-exist")) }), (e) => e instanceof ObservationBatchFault);
  } finally { rmSync(empty, { recursive: true, force: true }); }

  /* A root with no observations directory yields no batches — and that is reported as zero sources,
   * not as a crash; the refusal above is for a root that cannot be resolved at all. */
  const bare = mkdtempSync(join(tmpdir(), "almivis-bare-"));
  try {
    assert.deepEqual(declaredObservationSources({ env: env(bare) }), []);
  } finally { rmSync(bare, { recursive: true, force: true }); }
});

test("🔴 a record file the manifest does not declare is INVALID — an unaccounted file is not a bonus source", () => {
  const dir = root({ batches: [{ batchId: "capture-0001", files: [
    { name: "records.jsonl", records: ids(2) },
    { name: "smuggled.jsonl", records: ids(9), undeclared: true },
  ] }] });
  try {
    assert.throws(() => declaredObservationSources({ env: env(dir) }), (e) => e instanceof ObservationBatchFault && e.fault === BATCH_FAULTS.INVALID);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("🔴 an unrelated external file is EXCLUDED — only .jsonl record files are sources", () => {
  const dir = root({ batches: [{ batchId: "capture-0001", files: [{ name: "records.jsonl", records: ids(2) }] }] });
  try {
    writeFileSync(join(dir, "observations", "capture-0001", "notes.txt"), "not a record file");
    writeFileSync(join(dir, "observations", "capture-0001", "bodies.jsonl.br"), "compressed, not a record file");
    const s = declaredObservationSources({ env: env(dir) });
    assert.deepEqual(s.map((x) => x.name), ["records.jsonl"], "an unrelated file was counted as a source");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("🔴 a batch declared in TWO roots at once is AMBIGUOUS — never resolved by precedence", () => {
  const a = root({ batches: [{ batchId: "capture-0001", files: [{ name: "records.jsonl", records: ids(1) }] }] });
  const b = root({ batches: [{ batchId: "capture-0001", files: [{ name: "records.jsonl", records: ids(2) }] }] });
  try {
    const both = [a, b].join(process.platform === "win32" ? ";" : ":");
    assert.throws(() => declaredObservationSources({ env: env(both) }), (e) => e instanceof ObservationBatchFault && e.fault === BATCH_FAULTS.AMBIGUOUS);
  } finally { rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true }); }
});

test("PRODUCT-NEUTRALITY · a future external client works with no production code change", () => {
  /* An invented client, an invented batch id, an invented record file — nothing shared with any
   * connected material, and no code edited between this and the real arm. */
  const dir = root({ batches: [{ batchId: "harbourline-capture-2031-04-02", files: [
    { name: "harbourline-records.jsonl", records: ids(7), sourceFile: "runs/evidence/harbourline-legacy.jsonl" },
  ] }] });
  try {
    const [s] = declaredObservationSources({ env: env(dir) });
    assert.equal(s.canonical, "observations/harbourline-capture-2031-04-02/harbourline-records.jsonl");
    assert.equal(s.replaces.path, "runs/evidence/harbourline-legacy.jsonl");
    assert.equal(s.batchId, "harbourline-capture-2031-04-02");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the enumerator names no client and no machine path", () => {
  const src = readFileSyncUtf8("src/crawl/observation-batch.mjs");
  assert.doesNotMatch(src, /almiworld|almi-oet|C:\\|\/Users\//i, "the enumerator carries a client or machine path");
});


test("🔴 MERGE · a declared mapping removes the local copy — counted ONCE, under the external name", () => {
  const local = [{ file: "runs/evidence/old.jsonl" }, { file: "runs/audit/kept.jsonl" }];
  const external = [{ canonical: "observations/cap/new.jsonl", replaces: { path: "runs/evidence/old.jsonl" } }];
  const r = mergeDeclaredSources({ local, external });
  assert.deepEqual(r.kept.map((f) => f.file), ["runs/audit/kept.jsonl"], "the superseded local copy survived");
  assert.deepEqual(r.dropped, ["runs/evidence/old.jsonl"]);
  assert.deepEqual(r.superseded, ["runs/evidence/old.jsonl"]);
});

test("🔴 MERGE · WITHOUT a declared mapping BOTH survive — no filename, hash or count may merge them", () => {
  const local = [{ file: "runs/evidence/old.jsonl" }];
  /* The same basename — everything a guesser would match on — and no declaration. */
  const external = [{ canonical: "observations/cap/old.jsonl", replaces: null }];
  const r = mergeDeclaredSources({ local, external });
  assert.deepEqual(r.kept.map((f) => f.file), ["runs/evidence/old.jsonl"], "a local copy was dropped without any declaration");
  assert.deepEqual(r.dropped, []);

  /* CONTROL: add the declaration and the same input drops it — so the survival above is the missing
   * declaration talking, not a merge that never drops anything. */
  const declared = mergeDeclaredSources({ local, external: [{ canonical: "observations/cap/old.jsonl", replaces: { path: "runs/evidence/old.jsonl" } }] });
  assert.deepEqual(declared.dropped, ["runs/evidence/old.jsonl"]);
});

test("🔴 MERGE · a declaration naming a path nobody holds drops nothing", () => {
  const r = mergeDeclaredSources({ local: [{ file: "runs/audit/kept.jsonl" }], external: [{ canonical: "observations/cap/n.jsonl", replaces: { path: "runs/evidence/never-existed.jsonl" } }] });
  assert.deepEqual(r.kept.map((f) => f.file), ["runs/audit/kept.jsonl"]);
  assert.deepEqual(r.dropped, []);
});

function readFileSyncUtf8(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}
