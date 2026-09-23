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
import { pathToFileURL } from "node:url";

import { REPO_ROOT } from "../src/write-law.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { gateOf, confinementOf, destinationFlagIn, REQUIRED_FIELDS, writeSiteCensus } from "../tools/permitted-writers.mjs";
import { ANY_WRITE_PATTERN } from "../tools/no-generation-census.mjs";
import { PERMITTED_LOCAL_WRITERS, KNOWN_UNGATED_WRITERS } from "../config/permitted-page-writers.mjs";
import { SYNTHETIC_PROPERTY, writeSyntheticSource } from "./support/gsc-synthetic-source.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";

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
 * export — THE SAME SHAPE, A WHOLE DIRECTORY OF EVIDENCE
 * ================================================================== */

test("🔴 export — with NO flags the three exports in runs/export stay byte-identical and untouched, and the run still prints every size, state and bound", () => {
  const check = guardDir(EXPORT_DIR);
  let r;
  try {
    r = run(["bin/export.mjs"]);
  } finally {
    const w = check();
    assert.deepEqual(w, { added: [], changed: [], touched: [] }, `export with no flags wrote into runs/export: ${JSON.stringify(w)} (restored)`);
  }
  assert.equal(r.status, 0, r.stderr);
  for (const name of ["evidence.md", "evidence.json", "estate.csv"]) {
    assert.match(r.stdout, new RegExp(`\\[dry-run\\] would have written: .*${name.replace(".", "\\.")}  \\(\\d+ bytes\\) — nothing written, --confirm to write`));
  }
  assert.match(r.stdout, /STATES CARRIED THROUGH/);
  assert.match(r.stdout, /BOUNDS STATED IN EVERY FILE/);
});

test("🔴 RED, REAL: export --confirm --out=<outside the repository> REFUSES, exits non-zero, and creates NOTHING", () => {
  const dir = mkdtempSync(join(tmpdir(), "almivis-gap1-export-"));
  const target = join(dir, "nested");
  try {
    const r = run(["bin/export.mjs", "--confirm", `--out=${target}`]);
    assert.notEqual(r.status, 0, "export exited 0 while pointed outside the repository");
    assert.match(r.stderr, /REFUSED — --out .* OUTSIDE this repository/);
    assert.equal(existsSync(target), false, "a directory was created outside the repository");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CONTROL: export --confirm --out=<inside> DOES write all three — the gate opens", () => {
  const dir = scratch();
  try {
    const r = run(["bin/export.mjs", "--confirm", `--out=${dir}`]);
    assert.equal(r.status, 0, r.stderr);
    for (const name of ["evidence.md", "evidence.json", "estate.csv"]) assert.equal(existsSync(join(dir, name)), true, `${name} was not written with --confirm`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * checklist-boundaries — A GENERATED DOCUMENT, GATED ON PURPOSE
 * ================================================================== */

const BOUNDARIES = join(REPO_ROOT, "CHECKLIST_BOUNDARIES.md");

test("🔴 checklist-boundaries — with NO flags CHECKLIST_BOUNDARIES.md is byte-identical and untouched, and the run says whether it is stale", () => {
  const before = readFileSync(BOUNDARIES);
  const mtimeMs = statSync(BOUNDARIES).mtimeMs;
  let r;
  try {
    r = run(["bin/checklist-boundaries.mjs"]);
  } finally {
    const after = readFileSync(BOUNDARIES);
    if (!after.equals(before)) writeFileSync(BOUNDARIES, before);
    assert.ok(after.equals(before), "checklist-boundaries with no flags rewrote CHECKLIST_BOUNDARIES.md (restored)");
    assert.equal(statSync(BOUNDARIES).mtimeMs, mtimeMs, "checklist-boundaries with no flags wrote CHECKLIST_BOUNDARIES.md — same bytes, but written");
  }
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\[dry-run\] no writes will happen/);
  assert.match(r.stdout, /states: NOT-STARTED=\d+/);
  assert.match(r.stdout, /\[dry-run\] .*CHECKLIST_BOUNDARIES\.md is UP TO DATE — nothing to write/, "the committed document is not what the generator builds — rebuild it with --confirm");
});

/* ================================================================== *
 * crawl — ALREADY CONFINED, BUT A DRY RUN WROTE ITS RECORD
 * ================================================================== */

const NO_NETWORK = pathToFileURL(join(REPO_ROOT, "test", "support", "no-network.mjs")).href;
const crawlRun = (dir, extra) => {
  writeFileSync(join(dir, "seeds.txt"), "https://almioet.almiworld.com/\n");
  return run(["--import", NO_NETWORK, "bin/crawl.mjs", `--seeds=${join(dir, "seeds.txt")}`, ...extra]);
};

test("🔴 crawl — a DRY run with NO flags writes no record and no corpus, issues no request, and every network call it asks for is refused", () => {
  const dir = scratch();
  const out = join(dir, "record", "crawl.jsonl");
  const corpus = join(dir, "corpus");
  try {
    const r = crawlRun(dir, [`--out=${out}`, `--corpus=${corpus}`]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /\[no-network\] refused/, "the preload refused nothing — this run's network was not contained");
    // The filesystem first: what the limb protects is that nothing was WRITTEN, not how the run words it.
    assert.equal(existsSync(join(dir, "record")), false, "a dry crawl created its record directory without --confirm");
    assert.equal(existsSync(out), false, "a dry crawl wrote its record without --confirm");
    assert.equal(existsSync(corpus), false, "a dry crawl created a corpus");
    assert.match(r.stdout, /\[dry-run\] no writes will happen/);
    assert.match(r.stdout, /0 requests issued — dry run/);
    assert.match(r.stdout, /\[dry-run\] the crawl record was NOT written/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 RED, REAL: crawl --confirm --out=<outside the repository> REFUSES, exits non-zero, and creates NOTHING", () => {
  const dir = scratch();
  const outside = mkdtempSync(join(tmpdir(), "almivis-gap1-crawl-"));
  const target = join(outside, "nested", "crawl.jsonl");
  try {
    const r = crawlRun(dir, ["--confirm", `--out=${target}`, `--corpus=${join(dir, "corpus")}`]);
    assert.notEqual(r.status, 0, "crawl exited 0 while pointed outside the repository");
    assert.match(r.stderr, /REFUSED — --out .* OUTSIDE this repository/);
    assert.equal(existsSync(join(outside, "nested")), false, "a directory was created outside the repository");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("CONTROL: crawl --confirm on a DRY run DOES write its record — the gate opens, and still no request is issued", () => {
  const dir = scratch();
  const out = join(dir, "crawl.jsonl");
  try {
    const r = crawlRun(dir, ["--confirm", `--out=${out}`, `--corpus=${join(dir, "corpus")}`]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /0 requests issued — dry run/);
    assert.equal(existsSync(out), true, "crawl --confirm did not write its record");
    assert.equal(existsSync(join(dir, "corpus")), false, "a dry run wrote a corpus — bodies are for a live run only");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * THE DECLARED LOCAL WRITERS — checked against their sources
 * ================================================================== */

test("🔴 THE DECLARED LOCAL WRITERS — each states writes · where · gatedBy · why, calls writePermission and confineToRepo before its first write, and every write site sits behind its gate", () => {
  // 🔴 FOUR until gap 1; TEN since gap 2 (16 September 2026) put the six ungated binaries behind the same law.
  assert.deepEqual(PERMITTED_LOCAL_WRITERS.map((e) => e.file), [
    "bin/facts-lifecycle.mjs",
    "bin/export.mjs",
    "bin/checklist-boundaries.mjs",
    "bin/audit.mjs",
    "bin/audit-content.mjs",
    "bin/audit-technical.mjs",
    "bin/supply-labels.mjs",
    "bin/verification-issues.mjs",
    "bin/gsc-ingest.mjs",
    "bin/crawl.mjs",
    "bin/detect.mjs",
    // 🔴 +3 on 22 September 2026 (F05): the F-board and authority-corpus generators, gated when this census found them
    "bin/fboard-derive.mjs",
    "bin/fboard-crosswalk.mjs",
    "bin/authority-migrate.mjs",
  ]);
  for (const e of PERMITTED_LOCAL_WRITERS) {
    for (const k of REQUIRED_FIELDS) assert.ok(typeof e[k] === "string" && e[k].length > 20, `${e.file}: ${k} is too thin to be read by a human`);
    assert.equal(e.whyKnown, true, `${e.file}: its reason is not stated`);
    const text = readFileSync(join(REPO_ROOT, e.file), "utf8");
    assert.match(text, /writePermission\(\{ target: LOCAL/, `${e.file} does not ask the write law`);
    assert.equal(confinementOf(text).confinedBeforeFirstWrite, true, `${e.file} does not confine before its first write`);
    const lines = text.split(/\r?\n/);
    const sites = writeSitesOf(text);
    assert.equal(sites.length, e.sites, `${e.file}: ${sites.length} write site(s) in the source, ${e.sites} declared`);
    if (e.routed) {
      /* 🔴 STRICTER, NOT LOOSER — and this repair is what made the old form wrong. A routed writer has no direct
       * write site to gate, because the mutation moved inside the shared boundary. So it must have ZERO sites AND
       * actually reach the boundary. Declaring `routed` without calling it is precisely the hole this closes. */
      assert.equal(sites.length, 0, `${e.file}: declared routed but still holds ${sites.length} direct write site(s)`);
      assert.match(text, /executeGovernedWrite\(/, `${e.file}: declared routed but never reaches the shared boundary`);
    } else {
      for (const s of sites) assert.equal(gateOf(lines, s.line, e.gateToken).gated, true, `${e.file}:${s.line} DEFAULTS TO WRITING — ${s.text}`);
    }
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

/* ================================================================== *
 * 🔴 GAP 2 (16 September 2026) — THE CENSUS IS NOW WIDENED, AND THE SIX ARE GATED.
 *
 * The test that stood here asserted the OPPOSITE: that `permitted-writers.mjs` named no local
 * writer and still reconciled PAGE writes only. That was the marker saying gap 2 was unfinished,
 * and this slot is the work it was waiting for — so it is replaced, not deleted, by tests of what
 * the widened census actually does.
 * ================================================================== */

test("🔴 GAP 2 · the census covers EVERY write path, and a HELPER-reached write is a site", () => {
  const w = writeSiteCensus();
  /* 🔴 RE-BASED FOR ROUTING — A RE-BASE, NOT A RELAXATION.
   *
   * The floor of 90 caught the census NARROWING: a write path silently dropping out of the population. Routing
   * removes sites for the OPPOSITE reason — the write moved inside the shared boundary, which audits it — so a
   * fixed floor would now have to be edited on every batch, and a number edited to stay green stops being
   * evidence. The claim is therefore made DIRECTLY, and it is harder to satisfy than a count: every declared
   * writer that is NOT routed must still be seen by the census, so a path cannot leave the population unless its
   * caller really reached the boundary. */
  assert.ok(w.sites.length > 0, "the census sees no write sites at all");
  const seen = new Set(w.sites.map((s) => s.file));
  for (const e of PERMITTED_LOCAL_WRITERS.filter((x) => !x.routed)) {
    assert.ok(seen.has(e.file), `${e.file} is an UNROUTED declared writer and the census sees no write site in it`);
  }
  for (const e of PERMITTED_LOCAL_WRITERS.filter((x) => x.routed)) {
    assert.ok(!seen.has(e.file), `${e.file} is declared routed yet the census still sees a direct write site in it`);
  }
  // 🔴 THE FIGURE THAT SAID "FOUR" MISSED EXACTLY THESE: a write reached through appendIfNew or
  // ledger.append is invisible to a primitive-name scan, and they are more than a third of all sites.
  /* 🔴 RE-BASED 16/17 SEPTEMBER 2026 (owner ruling) — A RE-BASE, NOT A RELAXATION.
   * This floor was `viaHelper > 30`, set when the census counted 38 helper-reached sites. Eight of those
   * 38 were since proved NOT to be writes, by syntax and enclosing scope, and the census now excludes
   * exactly those three shapes (tools/permitted-writers.mjs, nonWriteShapeOf):
   *   src/evidence/store.mjs:100 :106 :181 :220 — function declarations (declaration)
   *   src/evidence/store.mjs:110 :224           — whole-line error-message strings (string-literal)
   *   src/evidence/store.mjs:120                — the dry-run store's call to its own in-memory append (dry-run-call)
   *   src/crawl/persist.mjs:14                  — a function declaration (declaration)
   * The corrected count is 30. The set of sites that left the helper count was proved EQUAL, as a set, to
   * those eight, with the population held fixed and only the census implementation swapped
   * (runs/audit/gap2-close-decision-2026-09-16.txt). Removing proved non-writes does not shrink coverage,
   * so the floor keeps its purpose — to fail if the census stops seeing helper-reached writes — at the
   * measured value, with no headroom: `>= 30`, a floor because a new real writer may raise it.
   * The exclusions are pinned beside it, so the correction cannot hide census drift behind itself.
   *
   * 🔴 RE-PINNED 8 -> 9, 17 SEPTEMBER 2026 (D-CENSUS-1, owner ruling "D-CENSUS-1 · SET PROOF, RE-PIN, CLOSE
   * DECISION"). The census did not recognise `appendAllWithoutDedupe(` as a write-helper call, so three real
   * gated bin call sites were missing. Adding that call shape also brings
   *   src/evidence/store.mjs:196               — `function appendAllWithoutDedupe(records) {` (declaration)
   * into the enumeration, and the existing declaration exclusion above then excludes it — an over-count
   * PREVENTED, not re-created. The ninth exclusion is that line. The set of exclusions was proved to have gained
   * exactly {store.mjs:196} and lost nothing, with the population held fixed and only the census implementation
   * swapped (runs/audit/gap2-close-decision-2026-09-16.txt). The floor above is unchanged; the helper-reached
   * count is now 33. */
  assert.ok(w.viaHelper >= 30, `only ${w.viaHelper} helper-reached sites — the census is counting primitives again`);
  assert.equal(w.excludedNonWrites.length, 9, `the census excluded ${w.excludedNonWrites.length} lines as non-writes, not the 9 proved: ${w.excludedNonWrites.map((e) => `${e.file}:${e.line} ${e.shape}`).join(" · ")}`);
  const excludedPerFile = w.excludedNonWrites.reduce((m, e) => ({ ...m, [e.file]: (m[e.file] ?? 0) + 1 }), {});
  assert.deepEqual(excludedPerFile, { "src/crawl/persist.mjs": 1, "src/evidence/store.mjs": 8 }, "the proved non-writes are 8 in the store and 1 in persist.mjs");
  assert.deepEqual(Object.keys(w.byClass).sort(), ["evidence", "export", "ledger", "other", "page"]);
  assert.ok(w.byClass.evidence > 0 && w.byClass.ledger > 0, "evidence and ledger writes are not being classified");
  assert.ok(w.cannotSee.length >= 4, "the census must state what it cannot see");
  assert.match(w.cannotSee.join(" "), /computed import/);
  assert.match(w.cannotSee.join(" "), /gated at its CALLER/);
});

test("🔴 GAP 2 · the six that had NO gate at all are gated at every site — or ROUTED through the boundary", () => {
  const w = writeSiteCensus();
  const six = ["bin/audit.mjs", "bin/audit-content.mjs", "bin/audit-technical.mjs", "bin/supply-labels.mjs", "bin/verification-issues.mjs", "bin/gsc-ingest.mjs"];
  for (const file of six) {
    const sites = w.sites.filter((s) => s.file === file);
    const text = readFileSync(join(REPO_ROOT, file), "utf8");
    if (/executeGovernedWrite\(/.test(text)) {
      /* 🔴 STRICTER, AND THIS ROUTING IS WHAT MADE THE OLD FORM WRONG. The original required at least one write
       * site, to catch the census going blind. A ROUTED writer has none — the write moved inside the shared
       * boundary — so for it the demand becomes ZERO direct sites and a real call to that boundary, which is a
       * harder thing to satisfy than a gated site, not an easier one. */
      assert.deepEqual(sites.map((s) => `${s.file}:${s.line}`), [], `${file}: routed, yet the census still sees a direct write site`);
    } else {
      assert.ok(sites.length > 0, `${file}: no write site found — the census stopped seeing this writer`);
      for (const s of sites) assert.equal(s.gated, true, `${file}:${s.line} DEFAULTS TO WRITING — ${s.text}`);
    }
    assert.match(text, /writePermission\(\{ target: LOCAL/, `${file} does not ask the write law`);
    assert.equal(confinementOf(text).confinedBeforeFirstWrite, true, `${file} does not confine before its first write`);
  }
});

test("🔴 GAP 2 · an UNDECLARED ungated writer FAILS; every declared name matches the census and none is stale", () => {
  const w = writeSiteCensus();
  assert.deepEqual(w.undeclaredUngated.map((s) => `${s.file}:${s.line}`), [], "a binary writes with no gate and nobody declared it");
  assert.deepEqual(w.staleUngatedDeclarations, [], "a declared ungated writer is gated now — remove the name, do not keep the exemption");
  // The declaration is a LIST OF DEFECTS, not an exemption: every name is still an ungated writer.
  assert.deepEqual(
    [...new Set(w.declaredUngated.map((s) => s.file))].sort(),
    KNOWN_UNGATED_WRITERS.map((e) => e.file).sort(),
    "the declared list and the census disagree about which writers are still ungated",
  );
  for (const e of KNOWN_UNGATED_WRITERS) assert.ok(e.writes && e.why, `${e.file}: a declaration with no reason is an exemption`);
  /* 🔴 AND A NAME IS NEVER DECLARED UNGATED ON A SITE THE CENSUS COULD NOT READ. That is how the
   * eleven were declared in the first place: "cannot determine" written down as "no gate". */
  assert.deepEqual(w.unresolvedDeclarations, [], "a name is declared ungated while its own state is CANNOT_DETERMINE");
});

/**
 * 🔴 THE THIRD STATE, AT CENSUS LEVEL, AND IT MUST GO RED IN BOTH DIRECTIONS.
 *
 * `gateOf` answering only yes/no is what turned eleven gated binaries into eleven declared defects.
 * The census must now carry a site it CANNOT READ in its own column: not a finding, not a clean
 * pass, and — for a declared name — UNRESOLVED rather than stale.
 *
 * Collapse CANNOT_DETERMINE into UNGATED and the `ungatedBins` assertion fails; collapse it into
 * GATED and both the `cannotDetermine` and `unresolvedDeclarations` assertions fail. A third state
 * that cannot go red is decoration.
 */
test("🔴 CONTROL: a site the census CANNOT READ is CANNOT_DETERMINE — not a finding, not clean, and a declared one is UNRESOLVED, never stale", () => {
  // A real gate (the write runs only when mayWrite is true) in a shape this detector cannot read.
  const sources = [{ file: "bin/switchy.mjs", text: "switch (permission.mayWrite) {\n  case true:\n    store.appendIfNew(rec);\n    break;\n}\n" }];

  const undeclared = writeSiteCensus({ sources, register: [], knownUngated: [] });
  assert.equal(undeclared.cannotDetermine.length, 1, "an unreadable guard was not carried in the third state's own column");
  assert.deepEqual(undeclared.ungatedBins.map((s) => s.file), [], "an unreadable guard was reported as an ungated writer — that is the defect this PR removes");
  assert.deepEqual(undeclared.undeclaredUngated, [], "an unreadable guard was raised as a finding against a binary nobody could judge");
  assert.ok(undeclared.cannotDetermine[0].why, "the census must say WHY it could not read the site");

  const declared = writeSiteCensus({ sources, register: [], knownUngated: [{ file: "bin/switchy.mjs", writes: "x", why: "y" }] });
  assert.deepEqual(declared.unresolvedDeclarations, ["bin/switchy.mjs"], "a declared name whose state is CANNOT_DETERMINE was not carried as UNRESOLVED");
  assert.deepEqual(declared.staleUngatedDeclarations, [], "a name the census cannot read was called STALE — striking it would collapse the third state into GATED");
});

test("🔴 GAP 2 · a site in a MODULE that takes its store from a caller is reported GATED-AT-CALLER, never counted as gated", () => {
  const w = writeSiteCensus();
  assert.ok(w.gatedAtCaller.length > 0, "nothing is reported gated-at-caller — the census is claiming to judge what it cannot see");
  for (const s of w.gatedAtCaller) {
    assert.equal(s.gated, false, `${s.file}:${s.line} is counted as gated AND as gated-at-caller`);
    assert.ok(!s.file.startsWith("bin/"), "a binary's own site must be judged, not deferred to a caller");
    assert.ok(s.reachedBy.length > 0, `${s.file}:${s.line} is reached by nothing — then nothing gates it`);
  }
  // The two this PR relies on: each bin hands its store to a module, and THAT is where the write is.
  const files = w.gatedAtCaller.map((s) => s.file);
  assert.ok(files.includes("src/audit/run-audit.mjs"), "the audit's write site is not being tracked to its caller");
  assert.ok(files.includes("src/search/ingest.mjs"), "the ingest's write site is not being tracked to its caller");
});

test("🔴 CONTROL: the census FIRES on a new ungated writer, and on a stale declaration", () => {
  const sources = [{ file: "bin/new-writer.mjs", text: 'const store = createJsonlStore(out);\nstore.appendIfNew(rec);\n' }];
  const fired = writeSiteCensus({ sources, register: [], knownUngated: [] });
  assert.equal(fired.undeclaredUngated.length, 1, "a brand-new ungated writer was not reported");
  const declared = writeSiteCensus({ sources, register: [], knownUngated: [{ file: "bin/new-writer.mjs", writes: "x", why: "y" }] });
  assert.deepEqual(declared.undeclaredUngated, [], "a declared writer still failed");
  const stale = writeSiteCensus({ sources, register: [], knownUngated: [{ file: "bin/gone.mjs", writes: "x", why: "y" }] });
  assert.deepEqual(stale.staleUngatedDeclarations, ["bin/gone.mjs"], "a declaration for a writer with no ungated site was not called stale");
});

/* ---- 🔴 THE INCIDENT TEST, PER BIN: no flags → the files it would touch are BYTE-IDENTICAL ---- */

const EVIDENCE_DIR = join(REPO_ROOT, "runs", "evidence");
const AUDIT_DIR = join(REPO_ROOT, "runs", "audit");
const COST_DIR = join(REPO_ROOT, "runs", "cost");

/**
 * 🔴 A CORPUS THAT EXISTS EVERYWHERE, BUILT FROM COMMITTED RECORDS.
 *
 * `bin/supply-labels.mjs` REFUSES to run without `--corpus`, and the real corpus is an expiring
 * GitHub artifact that is present on a developer's machine and absent in CI. Pointing the incident
 * test at it passed locally and failed in CI, where the bin exited at "NO CORPUS" and never reached
 * the write path the test exists to guard — caught by this case's own assertion that the run must
 * REPORT what it would have written.
 *
 * So the corpus is built here from `runs/crawl/first-real-crawl-2026-09-12.jsonl`, which IS
 * committed. The bodies are keyed by `observation_id` (the bin's own lookup key — by `page_id` it
 * silently finds nothing and labels everything UNKNOWN), and they are deliberately THIN so the
 * content checks fire: a run that reached its write path and had nothing to write would satisfy a
 * "wrote nothing" assertion while proving as little as the early exit did.
 */
function scratchCorpus() {
  const crawl = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll();
  const withBody = crawl.filter((r) => r.record_type === "observation" && r.content_sha256).slice(0, 12);
  assert.ok(withBody.length >= 2, "the committed crawl record holds too few observations to build a corpus from");
  mkdirSync(join(REPO_ROOT, ".test-scratch"), { recursive: true });
  const dir = mkdtempSync(join(REPO_ROOT, ".test-scratch", "corpus-"));
  for (const o of withBody) {
    writeFileSync(join(dir, `${o.observation_id}.html`), "<html><head><title>t</title></head><body><p>one two three</p></body></html>", "utf8");
  }
  return dir;
}

/**
 * 🔴 THE VERDICT ROWS, BUILT FROM COMMITTED RECORDS — GAP 2, 16 SEPTEMBER 2026.
 *
 * `bin/verification-issues.mjs` reads its CSV from a default path outside this repository, so in CI it
 * printed the dry-run banner and then died at `readFileSync` before its first write decision — and this
 * case, which asserted only the banner, passed on that death exactly as it passed on a refused write.
 * A banner is printed BEFORE any input is read; it is not evidence that the write was reached.
 *
 * The six verdict rows the bin records are the six `human-verification-return` observations it has
 * already committed to runs/audit/verification-issues.jsonl, so the CSV is rebuilt from those, into
 * git-ignored `.test-scratch`. `[bound: 6 verdict rows read …]` is printed after BOTH issue write
 * decisions, so seeing it — with exactly 6 — proves the run reached them.
 */
function scratchVerdictCsv() {
  const rows = createJsonlStore(join(REPO_ROOT, "runs", "audit", "verification-issues.jsonl")).readAll()
    .filter((r) => r.record_type === "observation" && r.method === "human-verification-return");
  assert.equal(rows.length, 6, "the committed verification store no longer holds the six verdict rows this case is built from");
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = ["fact_id,verdict,note", ...rows.map((r) => [r.value.fact_id, cell(r.value.verdict), cell(r.value.note)].join(","))].join("\n") + "\n";
  mkdirSync(join(REPO_ROOT, ".test-scratch"), { recursive: true });
  const file = join(mkdtempSync(join(REPO_ROOT, ".test-scratch", "verdicts-")), "verdicts.csv");
  writeFileSync(file, csv, "utf8");
  return file;
}

for (const [bin, args, dirs, expect] of [
  ["bin/audit-content.mjs", [], [AUDIT_DIR], /\[dry-run\] would have written \d+ finding\(s\)/],
  ["bin/audit-technical.mjs", [], [AUDIT_DIR, EVIDENCE_DIR], /\[dry-run\] would have written \d+ finding\(s\)/],
  // 🔴 REACH, NOT THE BANNER: given its input, and required to print the line that follows both write decisions.
  ["bin/verification-issues.mjs", [`--csv=${scratchVerdictCsv()}`], [AUDIT_DIR], /\[bound: 6 verdict rows read from /],
  /* 🔴 GAP 2 · BLOCKER 2 (17 September 2026) — REACH, NOT THE BANNER. With no flag the bin rebuilds the 11
   * disagreement issues from the COMMITTED graph and stops in its refusal branch, immediately before the
   * write block. With --confirm every one of those 11 goes through appendIfNew, which always writes (a new
   * issue, or a re-sighting of one already stored) — so reaching that branch with 11 means a real store
   * write was pending and was refused. The count comes before the refusal line, and both are required.
   * Only the default path: `--close` finds nothing OPEN on the committed data, so it cannot show a refusal.
   * WHERE 11 COMES FROM (rationale added 17 September 2026, value unchanged): disagreementIssues() over the
   * committed crawl record runs/crawl/first-real-crawl-2026-09-12.jsonl, its body archive
   * runs/crawl/bodies-2026-09-12.jsonl.br and its link graph runs/crawl/edges-2026-09-12.jsonl.br — one issue per
   * page the two instruments treat differently (340 vs 341). WHAT WOULD LEGITIMATELY MOVE IT: a different committed
   * crawl, body archive or graph, or a change to either instrument's definition (src/crawl/inbound.mjs,
   * src/audit/instrument-agreement.mjs). Then re-measure, and re-base this number with the reason recorded here. */
  ["bin/instrument-disagreement.mjs", [], [AUDIT_DIR], /issues: 11 — one per page they treat differently[\s\S]*\[dry-run\] nothing raised — add --confirm/],
  ["bin/audit.mjs", [], [AUDIT_DIR], /\[dry-run\] would have written \d+ record\(s\)/],
  // 🔴 These two exit early without their input, so they are given it — a dry run that never
  // reaches its write path would prove nothing at all.
  //
  // 🔴 AND THE CORPUS IS BUILT HERE, NOT BORROWED FROM THE MACHINE. The first version pointed at
  // runs/crawl/corpus, which exists on a developer's machine and NOT in CI — the committed crawl
  // records carry no bodies, they live in an expiring artifact. So in CI the bin exited at
  // "NO CORPUS" and never reached its write path, and this case's own assertion caught it: a run
  // that stopped early writes nothing for a reason that proves nothing.
  ["bin/supply-labels.mjs", [`--corpus=${scratchCorpus()}`], [AUDIT_DIR], /\[dry-run\] would have written \d+ finding\(s\)/],
  /* 🔴 GAP 2 (17 September 2026) — REACH, NOT THE BANNER. The old expect, /\[dry-run\] no writes will happen/, repeated
   * the banner asserted below, which gsc-ingest prints BEFORE building its provider: without credentials the run died
   * there and this case passed on that death. It is now given a SYNTHETIC source (test/support/gsc-synthetic-source.mjs;
   * no request, no key) and must print the line that exists only after runIngest has handed all 9 observations to the
   * store gate — aimed at the canonical evidence store, which must stay byte-identical. See
   * test/gap2-gsc-ingest-source.test.mjs for the seam's own proof. */
  ["bin/gsc-ingest.mjs", [`--property=${SYNTHETIC_PROPERTY}`, `--source=${writeSyntheticSource(REPO_ROOT, "gsc-incident-").file}`], [EVIDENCE_DIR, COST_DIR],
    /\[dry-run\] would have written 9 evidence record\(s\) → [^\n]*runs[\\/]evidence[\\/]evidence\.jsonl \(synthetic source: never the cost ledger\)/],
]) {
  test(`🔴 INCIDENT TEST — \`node ${bin}\` with NO flags writes NOTHING: every file it would touch stays byte-identical`, () => {
    const checks = dirs.map((d) => guardDir(d));
    let r;
    try {
      r = run([bin, ...args]);
    } finally {
      const damage = checks.map((c) => c()).filter((w) => w.added.length || w.changed.length || w.touched.length);
      assert.deepEqual(damage, [], `${bin} with no flags wrote into runs/: ${JSON.stringify(damage)} (restored)`);
    }
    assert.match(r.stdout + r.stderr, /\[dry-run\] no writes will happen — no --confirm/, `${bin} did not announce the dry run`);
    assert.match(r.stdout + r.stderr, expect, `${bin} did not report what it would have written`);
  });
}
