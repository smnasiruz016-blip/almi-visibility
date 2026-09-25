/**
 * 🔴 ROW 36 — OWNER AUTHORIZATION GATES · THE DESTRUCTIVE CATEGORY, EXECUTED.
 *
 * The frozen boundary: INPUT an attempt at a destructive, paid, production, large-scale or cross-product action WITHOUT
 * authorization · EXPECTED refusal · FAILURE it proceeds — or the guard is asserted only as text and never executed ·
 * EVIDENCE a test that RUNS each guard and observes the refusal, per category.
 *
 * ── THE GUARD RUN HERE ──────────────────────────────────────────────────────
 *
 * `bin/replay-crawl.mjs --recover` deletes a whole corpus directory (`rmSync(CORPUS, { recursive: true })`) and then
 * re-downloads an Actions artifact into it. Its refusal — no `--confirm`, exit 2 — stands directly in front of that
 * delete. The test points it at a SCRATCH corpus under `.test-scratch/` (the runner confines `--corpus` to this
 * repository; `.test-scratch/` is gitignored and is never `runs/`), and asserts the claim that matters: not "it
 * refused", but "IT DELETED NOTHING" — every marker file is still there, byte for byte.
 *
 * ── 🔴 THE GREEN HALF IS DELIBERATELY NOT EXECUTED ─────────────────────────
 *
 * The authorised path (`--recover --confirm`) deletes the directory and calls `gh run download` against a real Actions
 * artifact. Running it in a test would spend a download and replace a directory to prove a delete happens — which is
 * not in question. Only the refusal is under test, so only the refusal is run. An unexercised GREEN, stated plainly,
 * beats a GREEN faked.
 *
 * ── AND THE GUARD THAT COULD NOT BE RUN, NOW RUN — OWNER RULING, OPTION (a), 15 SEPTEMBER 2026 ──────────────────
 *
 * `bin/archive-corpus.mjs` refuses to overwrite the body archive. Its destination was hard-coded to the COMMITTED
 * `runs/crawl/bodies-2026-09-12.jsonl.br`, so a test of the refusal would have been a `--confirm` run aimed at the live
 * evidence — if the guard were broken, the test would destroy what the guard protects. It now takes `--out=` (default
 * IDENTICAL, confined to this repository), and the tests at the end of this file aim it at scratch archives under
 * `.test-scratch/` instead. To pass its verification — every one of the run's 394 fetched bodies, hash for hash, nothing
 * extra — the fixture COPIES those bodies, READ-ONLY, out of the committed archive into `.test-scratch/`. That copy is a
 * disposable fixture: NOT evidence, NOT a verified fact, NOT a corpus of record, and nothing cites or ingests it. The
 * verification and its binding to the real run record are untouched. The committed archive and the run record are hashed
 * when this file loads, and re-checked before the copy, after it, and after EVERY spawned run.
 */
import test, { after } from "node:test";
import { declaredWorld } from "./helpers/declared-world.mjs";
/* F02: every entry point decides its tenant first — the runs below go through a DECLARED FIXTURE WORLD (never the real population). */
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { unpackBodies, verifyBodiesAgainstRun } from "../src/evidence/body-archive.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");

/** Every file under a directory → sha256, so "deleted nothing" is a comparison of bytes, not of a listing. */
const snapshot = (dir) => Object.fromEntries(readdirSync(dir).sort().map((f) => [f, sha(readFileSync(join(dir, f)))]));

test("🔴 DESTRUCTIVE · bin/replay-crawl.mjs --recover WITHOUT --confirm is REFUSED — exit 2 — and DELETES NOTHING, byte for byte", () => {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const corpus = mkdtempSync(join(REPO, ".test-scratch", "row36-recover-"));
  try {
    writeFileSync(join(corpus, "marker-a.html"), "<html><body>row 36 marker A — must survive a refused --recover</body></html>\n");
    writeFileSync(join(corpus, "marker-b.txt"), "row 36 marker B\n");
    const before = snapshot(corpus);
    assert.equal(Object.keys(before).length, 2, "the scratch corpus was not populated — a no-delete check over an empty directory proves nothing");

    const r = spawnSync(process.execPath, WORLD.argv(["bin/replay-crawl.mjs", "--recover", `--corpus=${corpus}`]), { cwd: REPO, encoding: "utf8", timeout: 60_000, env: WORLD.envWith() });

    // THE CLAIM FIRST: nothing was deleted, nothing was replaced, nothing was added. A broken guard fails HERE.
    assert.equal(existsSync(corpus), true, "the corpus directory was deleted");
    assert.deepEqual(snapshot(corpus), before, "the corpus directory's files changed — the refused run touched them");
    // and the refusal itself: its own exit code and its own words
    assert.equal(r.status, 2, `expected the refusal's exit 2, got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
    assert.match(r.stderr, /REFUSED — --recover replaces the local corpus directory and needs --confirm/);
    // and it never reached the download
    assert.doesNotMatch(r.stdout, /recovered crawl-corpus-/, "the refused run reported a recovery");
  } finally {
    rmSync(corpus, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * 🔴 NETWORK · D-CRW-4 — bin/crawl.mjs --live WITHOUT THE OWNER'S GREEN.
 *
 * `--live` issues billable requests against our own hosts. The gate (bin/crawl.mjs :60-72) refuses it without
 * `--i-have-the-owners-green`, exit 3 — and it stands BEFORE the first network call (the IPv6 egress probe, :81), the
 * DNS lookups of every estate host (:86) and every write (:202 onwards, including the cost ledger under runs/ at :259).
 * Until 15 September 2026 no test executed it: it was asserted only as workflow YAML text and a static flag census.
 *
 * The blast radius of this test is fenced three ways: the seeds file holds ONLY a 127.0.0.1 URL — never a real host,
 * not even one of ours; `--out` and `--corpus` point into .test-scratch/, never at their runs/crawl/ defaults; and
 * the assertion is not "it refused" but "IT DID NOTHING": exit EXACTLY 3 (2 is the usage gate, and would satisfy a
 * weaker check while proving nothing about D-CRW-4), no scratch output created, runs/crawl/ and the cost ledger unchanged.
 *
 * 🔴 THE AUTHORISED PATH IS NOT RUN. `--live --i-have-the-owners-green` is a live crawl, and D-CRW-4 is the owner's to
 * green — it was granted for ONE run only (12 September 2026), and that run is spent. Only the refusal is under test.
 * ================================================================== */

/** name → size and mtime for every file under a directory (recursive), or null when it does not exist. */
const fileState = (p) => {
  if (!existsSync(p)) return null;
  const s = statSync(p);
  if (!s.isDirectory()) return { [p]: `${s.size}:${s.mtimeMs}` };
  return Object.assign({}, ...readdirSync(p).sort().map((n) => fileState(join(p, n)) ?? {}));
};

test("🔴 NETWORK · D-CRW-4 · bin/crawl.mjs --live WITHOUT --i-have-the-owners-green is REFUSED — exit EXACTLY 3 — and DOES NOTHING", () => {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const scratch = mkdtempSync(join(REPO, ".test-scratch", "row36-dcrw4-"));
  const seeds = join(scratch, "seeds.txt");
  const out = join(scratch, "out", "crawl.jsonl");
  const corpus = join(scratch, "corpus");
  const crawlDir = join(REPO, "runs", "crawl");
  const ledger = join(REPO, "runs", "cost", "ledger.jsonl");
  try {
    // ONLY a loopback URL — the reader takes one URL per line
    writeFileSync(seeds, "http://127.0.0.1:9/row36-dcrw4-never-fetched\n");
    const crawlBefore = fileState(crawlDir);
    const ledgerBefore = existsSync(ledger) ? sha(readFileSync(ledger)) : null;

    /* F03: a live crawl names its subject, so it passes the connector decision and meets the owner's-green gate. */
    const r = spawnSync(process.execPath, WORLD.argv(["bin/crawl.mjs", `--seeds=${seeds}`, `--out=${out}`, `--corpus=${corpus}`, "--live", WORLD.subjectArg]), { cwd: REPO, encoding: "utf8", timeout: 20_000, env: WORLD.envWith() });

    // THE CLAIM FIRST: it did nothing
    assert.equal(existsSync(out), false, "the refused run wrote its crawl records");
    assert.equal(existsSync(join(scratch, "out")), false, "the refused run created its output directory");
    assert.equal(existsSync(corpus), false, "the refused run created its corpus directory");
    assert.deepEqual(fileState(crawlDir), crawlBefore, "runs/crawl/ changed — the refused run touched evidence");
    assert.equal(existsSync(ledger) ? sha(readFileSync(ledger)) : null, ledgerBefore, "runs/cost/ledger.jsonl changed — the refused run wrote a cost entry");
    assert.doesNotMatch(r.stdout, /IPv6 EGRESS|requests issued to host|written:/, "the refused run went past the gate");
    // and the refusal itself: EXACTLY 3, and its own words
    assert.equal(r.status, 3, `expected the D-CRW-4 refusal's exit 3, got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
    assert.match(r.stderr, /REFUSED\. --live requires --i-have-the-owners-green/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * 🔴 DESTRUCTIVE · bin/archive-corpus.mjs — THE OVERWRITE REFUSAL, RUN AT LAST (gap 3, owner ruling option (a)).
 *
 * The committed body archive and the run record it is verified against are EVIDENCE: 394 observation hashes depend on
 * the first, and the second is the binding at archive-corpus's run-record line. Neither may change — their sha256 is
 * recorded when this file loads and asserted before the copy, after it, after every spawned run, and at the end.
 * ================================================================== */

/* 🔴 20 September 2026: both moved to the external observation batch. The sha256 constants below are
 * UNCHANGED, because the bytes are unchanged — which is the whole claim the move had to satisfy. */
const ARCHIVE = batchFile("bodies-2026-09-12.jsonl.br");
const RUN_RECORD = batchFile("first-real-crawl-2026-09-12.jsonl");
const COMMITTED_ARCHIVE_SHA256 = "3d857a9e53fd4b015131bfd721788942a7c3df15b775e6633fb429bc84af3ded";
const COMMITTED_RUN_RECORD_SHA256 = "0b9fb848436eca43dac54b0a4d3f220bb637e3c35b18a9d6297bc50b71bcc345";
const EVIDENCE_AT_LOAD = { archive: sha(readFileSync(ARCHIVE)), run: sha(readFileSync(RUN_RECORD)) };

function evidenceUntouched(when) {
  assert.equal(sha(readFileSync(ARCHIVE)), EVIDENCE_AT_LOAD.archive, `🔴 the external batch's bodies-2026-09-12.jsonl.br CHANGED ${when}`);
  assert.equal(sha(readFileSync(RUN_RECORD)), EVIDENCE_AT_LOAD.run, `🔴 the external batch's first-real-crawl-2026-09-12.jsonl CHANGED ${when}`);
  /* The recorded sha256 did not move with the files: same bytes, new address. */
  assert.equal(EVIDENCE_AT_LOAD.archive, COMMITTED_ARCHIVE_SHA256, "the archive's bytes are not the committed evidence");
  assert.equal(EVIDENCE_AT_LOAD.run, COMMITTED_RUN_RECORD_SHA256, "the run record's bytes are not the committed evidence");
}

/** The disposable fixture: the 394 fetched bodies, copied READ-ONLY out of the committed archive into .test-scratch/. */
let FIXTURE = null;
function fixture() {
  if (FIXTURE) return FIXTURE;
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const root = mkdtempSync(join(REPO, ".test-scratch", "gap3-archive-"));
  const corpus = join(root, "corpus");
  mkdirSync(corpus);
  evidenceUntouched("before the read-only copy");
  const bodies = unpackBodies(readFileSync(ARCHIVE));
  for (const [id, body] of bodies) writeFileSync(join(corpus, `${id}.html`), body, "utf8");
  evidenceUntouched("after the read-only copy");
  FIXTURE = { root, corpus, count: bodies.size };
  return FIXTURE;
}
after(() => {
  if (FIXTURE) rmSync(FIXTURE.root, { recursive: true, force: true });
});

const archiveRun = (args) => spawnSync(process.execPath, WORLD.argv(["bin/archive-corpus.mjs", ...args]), { cwd: REPO, encoding: "utf8", timeout: 180_000, maxBuffer: 32 * 1024 * 1024, env: WORLD.envWith() });
const tmpLeftovers = (dir) => readdirSync(dir).filter((n) => n.includes(".tmp-"));
const VERIFIED_394 = /verify: expected 394, present 394, hash matches 394, missing 0, mismatched 0, extra 0/;

test("🔴 DESTRUCTIVE · archive-corpus — the 394 fetched bodies, copied read-only into .test-scratch/, REACH verification and pass it; and with no --out the destination is EXACTLY the committed archive's path", () => {
  const f = fixture();
  assert.equal(f.count, 394, "the fixture does not hold the run's 394 fetched bodies");
  const r = archiveRun([`--corpus=${f.corpus}`]);
  evidenceUntouched("after the dry run");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, VERIFIED_394);
  /* 🔴 WHAT THIS ASSERTION USED TO CATCH, AND WHAT REPLACED IT (20 September 2026).
   *
   * It caught the DEFAULT DESTINATION silently moving: with no --out the tool had to name exactly the
   * committed archive's in-repository path, proved from the runner's own dry-run statement and from
   * the literal in its source. The committed archive is now external, so that default no longer has a
   * lawful meaning — writing a fresh archive into this repository would recreate the real observation
   * artifact the migration removed.
   *
   * So the law changed from "the default must be this exact path" to "there is NO default". That is
   * strictly stronger: a value that does not exist cannot drift. Both halves are still proved from the
   * runner's own behaviour — the dry-run statement below, and the --confirm refusal in the next test —
   * and the source-literal check is replaced by one that no in-repository default was reintroduced.
   * Nothing the old assertion caught is unguarded: destination drift is impossible, not merely pinned. */
  assert.ok(r.stdout.includes("[dry-run] nothing written — add --confirm (destination: none — --out= is required)"), `the destination law moved:\n${r.stdout}`);
  const src = readFileSync(join(REPO, "bin", "archive-corpus.mjs"), "utf8");
  assert.doesNotMatch(src, /outArg \?\?/, "an in-repository default destination was reintroduced");
  assert.ok(src.includes('const OUT = outArg === null ? null : confineToRepo(outArg, { label: "--out" });'), "the destination is no longer --out-only, confined");
  // 🔴 AND NOTHING THE RULING FORBADE: the run record stays hard-coded, no --run exists, the verification is the same call.
  assert.ok(src.includes('createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl"))'), "the binding to the real run record is gone");
  assert.doesNotMatch(src, /arg\(\s*["']run["']\s*\)|--run=/, "a --run flag was added");
  assert.ok(src.includes("verifyBodiesAgainstRun({ bodies: unpackBodies(packed), crawlRecords })"), "the verification call changed");
});

test("🔴 DESTRUCTIVE · archive-corpus --confirm with NO --out is REFUSED — exit 2 — because there is no lawful in-repository destination left", () => {
  const f = fixture();
  const r = archiveRun([`--corpus=${f.corpus}`, "--confirm"]);
  evidenceUntouched("after the defaulted --confirm run");
  assert.equal(r.status, 2, `expected the no-destination refusal's exit 2, got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.match(r.stderr, /REFUSED — no destination/);
  assert.equal(tmpLeftovers(f.root).length, 0, "the refused run left a temp file behind");
});

test("🔴 DESTRUCTIVE · archive-corpus --confirm --out=<an EXISTING archive> is REFUSED — exit 2 — and OVERWRITES NOTHING, byte for byte", () => {
  const f = fixture();
  const existing = join(f.root, "existing-archive.jsonl.br");
  writeFileSync(existing, "row 36 · a scratch archive with known bytes — it must survive a --confirm run aimed at it\n");
  const before = sha(readFileSync(existing));
  const r = archiveRun([`--corpus=${f.corpus}`, "--confirm", `--out=${existing}`]);
  // THE CLAIM FIRST: the existing archive was NOT overwritten. A broken guard fails HERE.
  assert.equal(sha(readFileSync(existing)), before, "🔴 the existing archive was OVERWRITTEN — the refusal did not hold");
  assert.deepEqual(tmpLeftovers(f.root), [], "a temporary archive was left beside the refused destination");
  evidenceUntouched("after the refused overwrite");
  // and it got there honestly: past the full verification, to the guard
  assert.match(r.stdout, VERIFIED_394);
  // and the refusal itself: its own exit code and its own words
  assert.equal(r.status, 2, `expected the overwrite refusal's exit 2, got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.match(r.stderr, /REFUSED — .*existing-archive\.jsonl\.br already exists\. Recorded evidence is not re-recorded over itself\./);
});

test("CONTROL: archive-corpus --confirm --out=<a path with no archive> proceeds past the overwrite guard and writes a verified archive at exactly that path", () => {
  const f = fixture();
  const target = join(f.root, "control-archive.jsonl.br");
  const r = archiveRun([`--corpus=${f.corpus}`, "--confirm", `--out=${target}`]);
  evidenceUntouched("after the control write");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes(`written: ${resolve(target)}`), `the archive was not written at its --out path:\n${r.stdout}`);
  assert.equal(existsSync(target), true);
  assert.deepEqual(tmpLeftovers(f.root), []);
  const check = verifyBodiesAgainstRun({ bodies: unpackBodies(readFileSync(target)), crawlRecords: createJsonlStore(RUN_RECORD).readAll() });
  assert.deepEqual([check.expected, check.matches, check.missing.length, check.mismatched.length, check.extra.length], [394, 394, 0, 0, 0]);
});

test("🔴 archive-corpus — --out relaxes NO validation: a MISSING, an EXTRA and a MISMATCHED body are each still REFUSED at verification, exit 1, and nothing is written", () => {
  const f = fixture();
  const names = readdirSync(f.corpus).sort();
  const variant = (label, mutate) => {
    const dir = join(f.root, `corpus-${label}`);
    mkdirSync(dir);
    for (const n of names) writeFileSync(join(dir, n), readFileSync(join(f.corpus, n)));
    mutate(dir);
    return dir;
  };
  const cases = [
    ["missing", variant("missing", (d) => rmSync(join(d, names[0]))), /missing 1, mismatched 0, extra 0/],
    ["extra", variant("extra", (d) => writeFileSync(join(d, "0000000000000000.html"), "not a body of the run\n")), /missing 0, mismatched 0, extra 1/],
    ["mismatched", variant("mismatched", (d) => writeFileSync(join(d, names[0]), `${readFileSync(join(d, names[0]), "utf8")} `)), /missing 0, mismatched 1, extra 0/],
  ];
  for (const [label, dir, counts] of cases) {
    const target = join(f.root, `out-${label}.jsonl.br`);
    const r = archiveRun([`--corpus=${dir}`, "--confirm", `--out=${target}`]);
    evidenceUntouched(`after the ${label}-body run`);
    assert.equal(existsSync(target), false, `a ${label}-body corpus was archived`);
    assert.equal(r.status, 1, `${label}: expected the verification refusal's exit 1, got ${r.status}\n${r.stderr}`);
    assert.match(r.stdout, counts, `${label}: the verification did not see the ${label} body`);
    assert.match(r.stderr, /REFUSED — the bodies are not exactly the run's bodies/);
  }
});

test("🔴 archive-corpus --confirm --out=<outside the repository> is REFUSED before anything is read, and creates NOTHING", () => {
  const f = fixture();
  const outside = mkdtempSync(join(tmpdir(), "almivis-gap3-"));
  const target = join(outside, "nested", "archive.jsonl.br");
  try {
    const r = archiveRun([`--corpus=${f.corpus}`, "--confirm", `--out=${target}`]);
    evidenceUntouched("after the outside-repository refusal");
    assert.notEqual(r.status, 0, "archive-corpus exited 0 while pointed outside the repository");
    assert.match(r.stderr, /REFUSED — --out .* OUTSIDE this repository/);
    assert.equal(existsSync(join(outside, "nested")), false, "a directory was created outside the repository");
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("🔴 THE COMMITTED BODY ARCHIVE AND ITS RUN RECORD ARE EXACTLY UNCHANGED ACROSS THIS WHOLE FILE — and are the committed bytes", () => {
  evidenceUntouched("across the whole test file");
  assert.equal(EVIDENCE_AT_LOAD.archive, COMMITTED_ARCHIVE_SHA256, "the body archive this file loaded is not the committed one");
  assert.equal(EVIDENCE_AT_LOAD.run, COMMITTED_RUN_RECORD_SHA256, "the run record this file loaded is not the committed one");
});
