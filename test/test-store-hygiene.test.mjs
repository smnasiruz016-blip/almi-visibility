/**
 * 🔴 F08 §7 · A CONFINED AUDIT STORE IS REMOVED BY THE PROCESS THAT OWNS IT — SEEN, NOT ASSUMED.
 *
 * "No run directories were left behind" is also what a run that never created any would report. So these proofs
 * spawn REAL `node --test` children that create a confined store, have each child record that its directory existed
 * while it ran, and then look after it exited: gone after a pass; KEPT and marked RETAINED after a failure; never
 * removed by a process that merely INHERITED the nonce. Every directory this file creates, it removes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT, RETAINED_MARKER, retainedRunDirs, removeRetainedRunDirs } from "../src/governance/governed-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RUN_MOD = pathToFileURL(join(REPO, "src/governance/governed-run.mjs")).href;
const AUDIT_ROOT = join(REPO, TEST_SCRATCH_AUDIT_ROOT);

/** A one-test child suite that opens a confined store, records what it saw, and passes or fails on demand. */
function runChild({ fail = false, inherit = null }) {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const work = mkdtempSync(join(REPO, ".test-scratch", "hyg-"));
  const out = join(work, "seen.json");
  writeFileSync(join(work, "child.test.mjs"), [
    'import { test } from "node:test";',
    'import { existsSync, writeFileSync } from "node:fs";',
    'import { dirname } from "node:path";',
    `import { governedAuditContext, resolveAuditStoreLocation } from ${JSON.stringify(RUN_MOD)};`,
    'test("child", () => {',
    `  governedAuditContext({ repo: ${JSON.stringify(REPO)} });`,
    `  const loc = resolveAuditStoreLocation({ repo: ${JSON.stringify(REPO)} });`,
    `  writeFileSync(${JSON.stringify(out)}, JSON.stringify({ nonce: process.env.${AUDIT_RUN_ENV}, runDir: dirname(dirname(loc.eventsPath)), existed: existsSync(dirname(loc.eventsPath)), synthetic: loc.synthetic }));`,
    `  if (${fail ? "true" : "false"}) throw new Error("planted failure — this child is MEANT to fail");`,
    "});",
    "",
  ].join("\n"));
  const env = { ...process.env };
  delete env[AUDIT_RUN_ENV];
  /* The nested `node --test` must be a RUNNER, not a child: an inherited NODE_TEST_CONTEXT=child-v8 makes it run
   * nothing. It sets fresh signals for its own worker, which is what makes that worker a verified test context. */
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_TEST_WORKER_ID;
  if (inherit) env[AUDIT_RUN_ENV] = inherit;
  const r = spawnSync(process.execPath, ["--test", join(work, "child.test.mjs")], { cwd: REPO, env, encoding: "utf8", timeout: 120_000 });
  const seen = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
  return { r, seen, work };
}

test("H1 · a PASSING run removes the run directory it minted — which provably existed while it ran", () => {
  const { r, seen, work } = runChild({});
  try {
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(seen, "the child recorded nothing — it never ran");
    assert.equal(seen.synthetic, true, "the child was not in a verified test context");
    assert.equal(seen.existed, true, "the confined store never existed — a clean zero here would prove nothing");
    assert.equal(existsSync(seen.runDir), false, `the owner left its run directory behind: ${seen.runDir}`);
  } finally { rmSync(work, { recursive: true, force: true }); }
});

test("H2 · a FAILED run KEEPS its store, names it RETAINED, and the bounded cleanup removes exactly those — never an unmarked directory", () => {
  const { r, seen, work } = runChild({ fail: true });
  const unowned = join(AUDIT_ROOT, `run-zz-hygiene-unmarked-${process.pid}`);
  const otherRetained = join(AUDIT_ROOT, `run-zz-hygiene-other-retained-${process.pid}`);
  try {
    assert.notEqual(r.status, 0, "the planted failure did not fail the child");
    assert.equal(seen.existed, true);
    assert.equal(existsSync(seen.runDir), true, "a failed run's evidence was deleted");
    assert.match(readFileSync(join(seen.runDir, RETAINED_MARKER), "utf8"), /^exitCode=[1-9]\d* pid=\d+/);
    assert.ok(retainedRunDirs({ repo: REPO }).some((x) => x.dir === seen.runDir), "the retained directory is not listed");
    mkdirSync(join(unowned, "worker-1"), { recursive: true }); // an UNMARKED run directory nobody retained
    /* 🔴 ANOTHER run's RETAINED evidence — marked exactly like ours. A test removes only what it owns: this must
     * survive. (An earlier version swept the whole root and deleted a real failed run's retained directory.) */
    mkdirSync(join(otherRetained, "worker-1"), { recursive: true });
    writeFileSync(join(otherRetained, RETAINED_MARKER), "exitCode=1 pid=0\n");
    const removed = removeRetainedRunDirs({ repo: REPO, only: [seen.runDir] });
    assert.deepEqual(removed, [seen.runDir], "the bounded cleanup removed something other than the one directory it was given");
    assert.equal(existsSync(seen.runDir), false);
    assert.equal(existsSync(unowned), true, "the bounded cleanup removed an UNMARKED directory");
    assert.equal(existsSync(otherRetained), true, "the bounded cleanup removed ANOTHER run's retained evidence");
    assert.ok(retainedRunDirs({ repo: REPO }).some((x) => x.dir === otherRetained), "control: the other run's directory IS retained-marked");
  } finally {
    rmSync(work, { recursive: true, force: true });
    rmSync(unowned, { recursive: true, force: true });
    rmSync(otherRetained, { recursive: true, force: true });
    if (seen?.runDir) rmSync(seen.runDir, { recursive: true, force: true });
  }
});

test("H4 · a governed BINARY that exits non-zero on purpose (exit 2 — a lawful refusal) removes its store: only a failed TEST retains", () => {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const work = mkdtempSync(join(REPO, ".test-scratch", "hyg-"));
  const out = join(work, "seen.json");
  writeFileSync(join(work, "binary-like.mjs"), [
    'import { existsSync, writeFileSync } from "node:fs";',
    'import { dirname } from "node:path";',
    `import { governedAuditContext, resolveAuditStoreLocation, isTestFileProcess } from ${JSON.stringify(RUN_MOD)};`,
    `governedAuditContext({ repo: ${JSON.stringify(REPO)} });`,
    `const loc = resolveAuditStoreLocation({ repo: ${JSON.stringify(REPO)} });`,
    `writeFileSync(${JSON.stringify(out)}, JSON.stringify({ runDir: dirname(dirname(loc.eventsPath)), existed: existsSync(dirname(loc.eventsPath)), synthetic: loc.synthetic, testFile: isTestFileProcess() }));`,
    "process.exit(2);",
    "",
  ].join("\n"));
  const env = { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: "7" };
  delete env[AUDIT_RUN_ENV];
  try {
    const r = spawnSync(process.execPath, [join(work, "binary-like.mjs")], { cwd: REPO, env, encoding: "utf8", timeout: 120_000 });
    assert.equal(r.status, 2, r.stderr);
    const seen = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(seen.synthetic, true, "the child was not in a verified test context");
    assert.equal(seen.testFile, false);
    assert.equal(seen.existed, true, "the store never existed — a clean zero here would prove nothing");
    assert.equal(existsSync(seen.runDir), false, "a non-test process's non-zero exit left a RETAINED store nobody can read");
  } finally { rmSync(work, { recursive: true, force: true }); }
});

test("H3 · a process that INHERITS a nonce never removes that run's directory — it belongs to whoever set it", () => {
  const nonce = `hyg${process.pid}x${Date.now()}`;
  const runDir = join(AUDIT_ROOT, `run-${nonce}`);
  const { r, seen, work } = runChild({ inherit: nonce });
  try {
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(seen.nonce, nonce);
    assert.equal(seen.runDir, runDir);
    assert.equal(existsSync(runDir), true, "a child removed a run directory whose nonce it only inherited");
  } finally {
    rmSync(work, { recursive: true, force: true });
    rmSync(runDir, { recursive: true, force: true }); // this test set the nonce, so this test owns it
  }
});
