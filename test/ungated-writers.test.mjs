/**
 * 🔴 GAP 1 — THE UNGATED WRITE PATHS, PUT BEHIND THE WRITE LAW (15 September 2026). facts-lifecycle FIRST.
 *
 * On 14 September `node bin/facts-lifecycle.mjs` was run to read ONE number and rewrote
 * runs/export/facts-for-verification.csv — a committed evidence file — on the way. The fix is the DRY-RUN DEFAULT:
 * a reporter prints its numbers and writes nothing unless asked. These tests hold each writer to that, from the source
 * AND by running the real binary, and one of them is the incident itself, recorded as a test that can fail.
 *
 * ⚠️ Every run that could write guards the file it could damage: its bytes are snapshotted first and put back if a
 * failing run changed them, so a RED never leaves damaged evidence behind.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { REPO_ROOT } from "../src/write-law.mjs";
import { gateOf, confinementOf, destinationFlagIn, REQUIRED_FIELDS } from "../tools/permitted-writers.mjs";
import { ANY_WRITE_PATTERN } from "../tools/no-generation-census.mjs";
import { PERMITTED_LOCAL_WRITERS } from "../config/permitted-page-writers.mjs";

/** A write through a store is a write too — the page census never counted these, which is how they went unseen. */
const STORE_WRITE = /\b(?:persistCrawlObservations|appendWithoutDedupe|appendIfNew|appendAll)\(|\.append\(/;
const codeLine = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/^\s*import\b/.test(l);

/** Every line of a writer's source that writes: a filesystem write the census pattern names, or a store write. */
export function writeSitesOf(text) {
  return text.split(/\r?\n/).flatMap((l, i) => (codeLine(l) && (ANY_WRITE_PATTERN.test(l) || STORE_WRITE.test(l)) ? [{ line: i + 1, text: l.trim() }] : []));
}

const run = (args) => spawnSync(process.execPath, args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
const scratch = () => {
  mkdirSync(join(REPO_ROOT, ".test-scratch"), { recursive: true });
  return mkdtempSync(join(REPO_ROOT, ".test-scratch", "gap1-"));
};

/** Snapshot every file in a directory — bytes and mtime — and restore any a run changed. */
function guardDir(dir) {
  const files = existsSync(dir) ? readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile()) : [];
  const before = new Map(files.map((n) => [n, { bytes: readFileSync(join(dir, n)), mtimeMs: statSync(join(dir, n)).mtimeMs }]));
  return () => {
    const now = existsSync(dir) ? readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile()) : [];
    const report = { added: now.filter((n) => !before.has(n)), changed: [], touched: [] };
    for (const [n, b] of before) {
      const p = join(dir, n);
      const bytes = readFileSync(p);
      if (!bytes.equals(b.bytes)) {
        report.changed.push(n);
        writeFileSync(p, b.bytes);
      } else if (statSync(p).mtimeMs !== b.mtimeMs) report.touched.push(n);
    }
    for (const n of report.added) rmSync(join(dir, n), { force: true });
    return report;
  };
}

const EXPORT_DIR = join(REPO_ROOT, "runs", "export");
const FACTS_CSV = join(EXPORT_DIR, "facts-for-verification.csv");

/* ================================================================== *
 * facts-lifecycle — THE ONE THAT FIRED
 * ================================================================== */

test("🔴 THE INCIDENT, AS A TEST — `node bin/facts-lifecycle.mjs --product=almi-oet` with NO flags leaves runs/export/facts-for-verification.csv BYTE-IDENTICAL", () => {
  const before = readFileSync(FACTS_CSV);
  const mtimeMs = statSync(FACTS_CSV).mtimeMs;
  let r;
  try {
    r = run(["bin/facts-lifecycle.mjs", "--product=almi-oet"]);
  } finally {
    const after = readFileSync(FACTS_CSV);
    if (!after.equals(before)) writeFileSync(FACTS_CSV, before); // put the evidence back before failing, never after
    assert.ok(after.equals(before), "🔴 14 SEPTEMBER AGAIN — a run with no flags rewrote runs/export/facts-for-verification.csv (restored by this test)");
    assert.equal(statSync(FACTS_CSV).mtimeMs, mtimeMs, "a run with no flags touched runs/export/facts-for-verification.csv");
  }
  assert.equal(r.status, 0, r.stderr);
});

test("🔴 THE DRY RUN PRINTS EVERYTHING A READER CAME FOR — export count, conflict, freshness, dependency walk, changed inputs, cache — and writes NOTHING", () => {
  const check = guardDir(EXPORT_DIR);
  let r;
  try {
    r = run(["bin/facts-lifecycle.mjs", "--product=almi-oet"]);
  } finally {
    const w = check();
    assert.deepEqual(w, { added: [], changed: [], touched: [] }, `a run with no flags wrote into runs/export: ${JSON.stringify(w)} (restored)`);
  }
  assert.equal(r.status, 0, r.stderr);
  const o = r.stdout;
  assert.match(o, /\[dry-run\] no writes will happen — no --confirm/);
  assert.match(o, /^records: \d+$/m);
  assert.match(o, /PART 1 — \[dry-run\] would have exported \d+ rows → .*facts-for-verification\.csv \(nothing written — --confirm to write it\)/);
  assert.match(o, /every row UNVERIFIED: (true|false)/);
  assert.match(o, /PART 2 — CONFLICT: \d+ claim\(s\) with disagreeing values/);
  assert.match(o, /PART 2 — FRESHNESS: (\w+=\d+\s*)+/);
  assert.match(o, /PART 2C — DEPENDENCY WALK: /);
  assert.match(o, /PART 2D — CHANGED INPUTS: \d+ derived fact\(s\)/);
  assert.match(o, /PART 4 — CACHE over \d+ facts, each requested TWICE:\n\s+hits=\d+\s+misses=\d+\s+hitRate=(\d+\.\d%|n\/a)/);
  assert.match(o, /lookups that reached the source: \d+/);
});

test("🔴 facts-lifecycle — an operator --out inside the repository is NOT written without --confirm", () => {
  const dir = scratch();
  const target = join(dir, "facts.csv");
  try {
    const r = run(["bin/facts-lifecycle.mjs", "--product=almi-oet", `--out=${target}`]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(existsSync(target), false, "facts-lifecycle wrote its export without --confirm");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 RED, REAL: facts-lifecycle --confirm --out=<outside the repository> REFUSES, exits non-zero, and creates NOTHING", () => {
  const dir = mkdtempSync(join(tmpdir(), "almivis-gap1-facts-"));
  const target = join(dir, "nested", "facts.csv");
  try {
    const r = run(["bin/facts-lifecycle.mjs", "--product=almi-oet", "--confirm", `--out=${target}`]);
    assert.notEqual(r.status, 0, "facts-lifecycle exited 0 while pointed outside the repository");
    assert.match(r.stderr, /REFUSED — --out .* OUTSIDE this repository/);
    assert.equal(existsSync(join(dir, "nested")), false, "a directory was created outside the repository");
    assert.equal(existsSync(target), false, "the export was written outside the repository");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CONTROL: facts-lifecycle --confirm --out=<inside> DOES write — the gate opens, so its staying shut means something", () => {
  const dir = scratch();
  const target = join(dir, "facts.csv");
  try {
    const r = run(["bin/facts-lifecycle.mjs", "--product=almi-oet", "--confirm", `--out=${target}`]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /\[write:local\] --confirm given/);
    assert.match(readFileSync(target, "utf8"), /^# AlmiVisibility — the 46 fact records, exported for VERIFICATION\./);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * THE DECLARED LOCAL WRITERS — checked against their sources
 * ================================================================== */

test("🔴 THE DECLARED LOCAL WRITERS — each states writes · where · gatedBy · why, calls writePermission and confineToRepo before its first write, and every write site sits behind its gate", () => {
  assert.deepEqual(PERMITTED_LOCAL_WRITERS.map((e) => e.file), ["bin/facts-lifecycle.mjs"]);
  for (const e of PERMITTED_LOCAL_WRITERS) {
    for (const k of REQUIRED_FIELDS) assert.ok(typeof e[k] === "string" && e[k].length > 20, `${e.file}: ${k} is too thin to be read by a human`);
    assert.equal(e.whyKnown, true, `${e.file}: its reason is not stated`);
    const text = readFileSync(join(REPO_ROOT, e.file), "utf8");
    assert.match(text, /writePermission\(\{ target: LOCAL/, `${e.file} does not ask the write law`);
    assert.equal(confinementOf(text).confinedBeforeFirstWrite, true, `${e.file} does not confine before its first write`);
    const lines = text.split(/\r?\n/);
    const sites = writeSitesOf(text);
    assert.equal(sites.length, e.sites, `${e.file}: ${sites.length} write site(s) in the source, ${e.sites} declared`);
    for (const s of sites) assert.equal(gateOf(lines, s.line, e.gateToken).gated, true, `${e.file}:${s.line} DEFAULTS TO WRITING — ${s.text}`);
    assert.equal(destinationFlagIn(text), e.destinationOverridable, `${e.file}: the destination flag is declared wrongly`);
  }
});

test("🔴 CONTROL: the check FIRES on facts-lifecycle as it stood on 14 September — a top-level write behind nothing", () => {
  const incident = 'const out = arg("out", `${REPO}runs/export/facts-for-verification.csv`);\nif (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });\nwriteFileSync(out, csv, "utf8");\n';
  const lines = incident.split("\n");
  const sites = writeSitesOf(incident);
  assert.deepEqual(sites.map((s) => s.line), [2, 3]);
  for (const s of sites) assert.equal(gateOf(lines, s.line, "permission.mayWrite").gated, false);
  assert.equal(confinementOf(incident).confinedBeforeFirstWrite, false);
});

test("🔴 THE CENSUS IS NOT WIDENED — gap 2 is a separate slot: the page census still reconciles PAGE writes against the page register only", () => {
  const tool = readFileSync(join(REPO_ROOT, "tools", "permitted-writers.mjs"), "utf8");
  assert.doesNotMatch(tool, /PERMITTED_LOCAL_WRITERS/);
  assert.match(tool, /census\.hits\.PAGE_WRITE/);
});
