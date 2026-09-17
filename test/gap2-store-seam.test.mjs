/**
 * 🔴 GAP 2 · THE CONFINED STORE-PATH TESTABILITY SEAM (owner ruling, 17 September 2026)
 *
 * Four gated writers kept their store at a fixed path, so the committed data decided whether a write was even
 * reachable — and for all four it was not, or not durably. Each now takes `--store=`, resolved by the SAME
 * confineToRepo as its default. This file proves the seam, then uses it:
 *
 *   CONFINEMENT      — a store outside this repository (an absolute temp path, and a `../` escape) is REFUSED,
 *                      by the confinement gate, before anything is written, even WITH --confirm.
 *   POSITIVE CONTROL — a store inside the repository is used when --confirm is given: the real write lands
 *                      in that store, and only there.
 *   NOT PERMISSION   — the same inside store WITHOUT --confirm: refused by the write law, reach reported,
 *                      the store byte-identical. An override chooses WHERE, never WHETHER.
 *
 * WHICH GATE FIRED is read from what each binary prints, never from the exit code alone:
 *   CONFINEMENT   — "REFUSED — --store "<path>" resolves to … OUTSIDE this repository" (confineToRepo)
 *   AUTHORIZATION — the binary's own dry-run refusal line
 *   WRITE         — the binary's own success line
 * exactly one must be present; a run showing none never reached either gate.
 *
 * Controlled state is built from COMMITTED records, in git-ignored .test-scratch — never under runs/export,
 * runs/evidence, runs/audit or runs/cost, where test/ungated-writers.test.mjs's guardDir sweeps by pattern
 * (D-SWEEP-1, recorded and not fixed here). The binaries, their store and their write law run for real.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const committed = (p) => readFileSync(join(REPO, p), "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l));
const fingerprint = (f) => (existsSync(f) ? createHash("sha256").update(readFileSync(f)).digest("hex") : "ABSENT");
const recordCount = (f) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim() !== "").length : 0);

const SWEPT = ["export", "evidence", "audit", "cost"].map((d) => join(REPO, "runs", d) + sep);
function scratchDir() {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const dir = mkdtempSync(join(REPO, ".test-scratch", "store-seam-"));
  assert.ok(SWEPT.every((s) => !(dir + sep).startsWith(s)), `fixture ${dir} sits under a guardDir-swept directory`);
  return dir;
}
const writeRecords = (file, records) => writeFileSync(file, records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""), "utf8");

const CONFINEMENT = /REFUSED — --store "[^\n]*" resolves to [^\n]*, which is OUTSIDE this repository/;

/** The four measured paths. `build` writes the controlled state into `file` and returns nothing. */
const PATHS = [
  {
    bin: "bin/supersede-noindex.mjs",
    pre: [],
    defaultStore: "runs/audit/technical-findings.jsonl",
    // the original noindex detector's issues, as committed, without the state changes that superseded them
    build: (file) => writeRecords(file, committed("runs/audit/technical-findings.jsonl").filter((r) => r.record_type === "issue" && r.detector === "noindex")),
    reach: /records to append\s+: 268 \(134 replacements \+ 134 state changes\)[\s\S]*\[dry-run\] would have appended 268 records — add --confirm/,
    refusal: /\[dry-run\] would have appended \d+ records/,
    wrote: /appended 268 records\. lifecycle errors: 0\./,
    added: 268,
  },
  {
    bin: "bin/instrument-disagreement.mjs",
    pre: ["--close"],
    defaultStore: "runs/audit/instrument-findings.jsonl",
    // the 11 disagreement issues, as committed, without the state changes that closed them
    build: (file) => writeRecords(file, committed("runs/audit/instrument-findings.jsonl").filter((r) => r.record_type === "issue")),
    reach: /OPEN instrument-disagreement issues to close: 11\r?\n\[dry-run\] nothing closed — add --confirm/,
    refusal: /\[dry-run\] nothing closed/,
    wrote: /closed 11 issue\(s\)/,
    added: 11,
  },
  {
    bin: "bin/link-recommendation-evidence.mjs",
    pre: [],
    defaultStore: "runs/audit/recommendations.jsonl",
    // the three drafted recommendations and their observations, as committed, without the links written for them
    build: (file) => writeRecords(file, committed("runs/audit/recommendations.jsonl").filter((r) => r.record_type !== "recommendation_evidence")),
    reach: /(?:REC-[A-Z-]+: finding states \d+, linked \d+[^\n]*\r?\n){3}\[dry-run\] nothing written — add --confirm/,
    refusal: /\[dry-run\] nothing written/,
    wrote: /linked 3 recommendation\(s\) in /,
    added: 3,
  },
  {
    bin: "bin/cost-ledger.mjs",
    pre: ["backfill"],
    defaultStore: "runs/cost/ledger.jsonl",
    // an EMPTY ledger: every entry the committed runs yield is new to it
    build: () => {},
    reach: /\[dry-run\] 10 entries not written — add --confirm/,
    refusal: /\[dry-run\] \d+ entries not written/,
    wrote: /appended 10, already present 0/,
    added: 10,
  },
];

const run = (p, args) => spawnSync(process.execPath, [p.bin, ...p.pre, ...args], { cwd: REPO, encoding: "utf8", timeout: 180_000 });
function gateFired(p, r) {
  const seen = [
    CONFINEMENT.test(r.stderr) && "CONFINEMENT",
    p.refusal.test(r.stdout) && "AUTHORIZATION",
    p.wrote.test(r.stdout) && "WRITE",
  ].filter(Boolean);
  assert.ok(seen.length <= 1, `${p.bin}: more than one gate outcome printed (${seen.join(", ")})`);
  return seen[0] ?? "NEITHER";
}

for (const p of PATHS) {
  const name = basename(p.bin, ".mjs");

  test(`🔴 CONFINEMENT · ${name} · an absolute store OUTSIDE the repository is refused by the confinement gate, even with --confirm`, () => {
    const before = fingerprint(join(REPO, p.defaultStore));
    const outside = mkdtempSync(join(tmpdir(), "store-seam-outside-"));
    const target = join(outside, "store.jsonl");
    try {
      const r = run(p, [`--store=${target}`, "--confirm"]);
      assert.equal(gateFired(p, r), "CONFINEMENT", `${p.bin}: expected the confinement gate\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
      assert.notEqual(r.status, 0, `${p.bin}: a refused destination must not exit 0`);
      assert.equal(existsSync(target), false, `${p.bin} created the outside store`);
      assert.equal(fingerprint(join(REPO, p.defaultStore)), before, `${p.bin} changed its default store`);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test(`🔴 CONFINEMENT · ${name} · a ../ escape out of the repository is refused by the confinement gate, even with --confirm`, () => {
    const before = fingerprint(join(REPO, p.defaultStore));
    const escape = `.test-scratch/../../${basename(REPO.replace(/[\\/]+$/, ""))}-store-seam-escape-${process.pid}-${name}.jsonl`;
    const resolved = resolve(REPO, escape);
    assert.ok(relative(REPO, resolved).startsWith(".."), `the escape ${escape} does not actually leave the repository`);
    assert.equal(existsSync(resolved), false, `a file already exists at ${resolved}`);
    try {
      const r = run(p, [`--store=${escape}`, "--confirm"]);
      assert.equal(gateFired(p, r), "CONFINEMENT", `${p.bin}: expected the confinement gate\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
      assert.notEqual(r.status, 0);
      assert.equal(existsSync(resolved), false, `${p.bin} created ${resolved}`);
      assert.equal(fingerprint(join(REPO, p.defaultStore)), before, `${p.bin} changed its default store`);
    } finally {
      if (existsSync(resolved)) rmSync(resolved, { force: true });
    }
  });

  test(`CONTROL · ${name} · a store INSIDE the repository is used when --confirm is given: the real write lands there, and only there`, () => {
    const before = fingerprint(join(REPO, p.defaultStore));
    const dir = scratchDir();
    const store = join(dir, "store.jsonl");
    try {
      p.build(store);
      const count = recordCount(store);
      const r = run(p, [`--store=${store}`, "--confirm"]);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(gateFired(p, r), "WRITE", `${p.bin}: expected the write\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
      assert.equal(recordCount(store) - count, p.added, `${p.bin}: the controlled store did not receive exactly ${p.added} records`);
      assert.equal(fingerprint(join(REPO, p.defaultStore)), before, `${p.bin} wrote to its default store`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`🔴 NOT PERMISSION · ${name} · the same inside store WITHOUT --confirm: the write is reached and refused, and the store is untouched`, () => {
    const before = fingerprint(join(REPO, p.defaultStore));
    const dir = scratchDir();
    const store = join(dir, "store.jsonl");
    try {
      p.build(store);
      const fixture = fingerprint(store);
      const r = run(p, [`--store=${store}`]);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout + r.stderr, /\[dry-run\] no writes will happen — no --confirm/, `${p.bin} did not announce the dry run`);
      assert.equal(gateFired(p, r), "AUTHORIZATION", `${p.bin}: expected the write law's refusal\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
      assert.match(r.stdout, p.reach, `${p.bin} did not report the ${p.added} pending records it refused to write`);
      assert.equal(fingerprint(store), fixture, `${p.bin} wrote to the controlled store without --confirm`);
      assert.equal(fingerprint(join(REPO, p.defaultStore)), before, `${p.bin} changed its default store`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("the controlled stores are created directly inside .test-scratch, outside every guardDir-swept directory", () => {
  const dir = scratchDir();
  try {
    assert.equal(dirname(dir), join(REPO, ".test-scratch"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
