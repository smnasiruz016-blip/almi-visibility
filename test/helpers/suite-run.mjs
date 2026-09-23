/**
 * 🔴 THE SUITE INSTRUMENT — A FAILING RUN THAT CANNOT NAME ITS FAILURE IS NOT EVIDENCE.
 *
 * Last session a full-suite run reported one failure and the harness recorded only the COUNT. The failing test was
 * never identified, could not be reproduced, and so could neither be repaired nor dismissed. A count without a name
 * is an INSTRUMENT_FAILURE, and this module says so rather than letting the number be cited.
 *
 * It runs the repository's exact suite command — `node --test test/*.test.mjs`, with the glob expanded here so the
 * file set is identical — and captures stdout, stderr, the exit code, the totals, and the FILE AND TEST NAME of
 * every failure.
 *
 * It also scopes the confined audit store to ONE invocation, so a run never inherits an earlier run's events.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT } from "../../src/governance/governed-run.mjs";

export const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** The suite's own file set, expanded the way the shell glob would. */
export const suiteFiles = (repo = REPO) =>
  readdirSync(join(repo, "test")).filter((f) => f.endsWith(".test.mjs")).sort().map((f) => `test/${f}`);

const INT = (out, key) => {
  const m = out.match(new RegExp(`^\u2139 ${key} (\\d+)$`, "m"));
  return m ? Number(m[1]) : null;
};

/**
 * Every failure, with the file it lives in.
 *
 * The runner prints a `✖ failing tests:` section in which each failure is introduced by `test at <file>:<line>`
 * and then named by `✖ <name> (<ms>)`. Parsing the SECTION rather than the live log matters: the live log also
 * prints `✖ <name>` for each failure as it happens, with no file beside it.
 */
export function parseFailures(out) {
  const at = out.indexOf("\u2716 failing tests:");
  if (at < 0) return [];
  const lines = out.slice(at).split(/\r?\n/);
  const failures = [];
  let file = null;
  for (const line of lines) {
    const loc = line.match(/^test at (.+?):\d+:\d+$/);
    if (loc) { file = loc[1].split("\\").join("/"); continue; }
    const name = line.match(/^\u2716 (.+?) \(\d+(?:\.\d+)?ms\)$/);
    if (name && name[1] !== "failing tests:") failures.push({ file, name: name[1] });
  }
  return failures;
}

/**
 * Run the suite once, in its own confined-store scope.
 *
 * @returns {{argv:string[], exitCode:number, stdout:string, stderr:string,
 *            totals:object, failures:{file:string,name:string}[],
 *            instrumentFailure:string|null, runNonce:string, storeDir:string, cleanup:()=>void}}
 */
export function runSuite({ repo = REPO, env = {}, files = null, keepStore = false } = {}) {
  const runNonce = `${process.pid}-${randomBytes(4).toString("hex")}`;
  const argv = ["--test", ...(files ?? suiteFiles(repo))];
  const r = spawnSync(process.execPath, argv, {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 1 << 29,
    env: { ...process.env, [AUDIT_RUN_ENV]: runNonce, ...env },
  });
  const stdout = r.stdout ?? "";
  const stderr = r.stderr ?? "";
  const combined = stdout + stderr;
  const totals = {
    tests: INT(combined, "tests"), suites: INT(combined, "suites"), pass: INT(combined, "pass"),
    fail: INT(combined, "fail"), cancelled: INT(combined, "cancelled"), skipped: INT(combined, "skipped"),
    todo: INT(combined, "todo"),
  };
  const failures = parseFailures(combined);

  /* 🔴 THE INSTRUMENT JUDGES ITSELF. Either of these means the run cannot be cited as suite evidence. */
  let instrumentFailure = null;
  if (totals.tests === null || totals.fail === null) instrumentFailure = "the runner printed no totals";
  else if (totals.fail > 0 && failures.length === 0) instrumentFailure = `${totals.fail} failure(s) reported and NONE named`;
  else if (totals.fail > 0 && failures.length !== totals.fail) instrumentFailure = `${totals.fail} failure(s) reported but ${failures.length} named`;
  else if (failures.some((f) => !f.file)) instrumentFailure = "a failure was named with no file";

  const storeDir = join(repo, TEST_SCRATCH_AUDIT_ROOT, `run-${runNonce}`);
  /* cleanup() ALWAYS removes when called. `keepStore` decides only whether it is called automatically — an
   * earlier version folded the flag into the closure, so an explicit cleanup() silently did nothing and two run
   * directories leaked. It removes ONLY the directory this run created. */
  const cleanup = () => { if (existsSync(storeDir)) rmSync(storeDir, { recursive: true, force: true }); };
  if (!keepStore) cleanup();

  return { argv, exitCode: r.status, stdout, stderr, totals, failures, instrumentFailure, runNonce, storeDir, cleanup };
}

/** One line a human can read, and that names what failed. */
export const describeRun = (run) =>
  `tests ${run.totals.tests} · pass ${run.totals.pass} · fail ${run.totals.fail} · skipped ${run.totals.skipped}` +
  (run.instrumentFailure ? `  🔴 INSTRUMENT_FAILURE: ${run.instrumentFailure}` : "") +
  run.failures.map((f) => `\n    ✖ ${f.file} :: ${f.name}`).join("");
