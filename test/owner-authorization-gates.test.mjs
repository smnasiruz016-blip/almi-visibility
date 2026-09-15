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
 * ── AND THE GUARD NOT RUN HERE, ON PURPOSE ──────────────────────────────────
 *
 * `bin/archive-corpus.mjs` refuses to overwrite the body archive — but its destination is hard-coded to the COMMITTED
 * `runs/crawl/bodies-2026-09-12.jsonl.br`, and the refusal sits behind `--confirm`. A test of it would be a `--confirm`
 * run aimed at the live evidence: if the guard were broken, the test would destroy what the guard protects. It is not
 * run. The gap is written onto row 36.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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

    const r = spawnSync(process.execPath, ["bin/replay-crawl.mjs", "--recover", `--corpus=${corpus}`], { cwd: REPO, encoding: "utf8", timeout: 60_000 });

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
