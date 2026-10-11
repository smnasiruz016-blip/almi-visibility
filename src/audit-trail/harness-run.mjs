/**
 * 🔴 RR-248 Q4 · NO HARNESS RUN APPENDS TO THE PRODUCTION TRAIL OR ITS WITNESS — whatever limb it applies.
 *
 * A sabotage harness runs the proof tests, and a proof test can start a governed bin. When a limb removes a guard (RR-248:
 * f16-collection S19 removed the bin's test-seam halt), that bin ran outside a test context and appended 5 events to the
 * production trail and its witness. A harness is a measurement; it never makes the product's history.
 *
 * So the deliberate-invocation gate (test/helpers/harness-gate.mjs) MARKS each harness run: one file per process,
 * <git dir>/almivisibility-harness-runs/<pid>.json, written once, removed when that process exits. The production store
 * (wiring.mjs) asks assertNoHarnessRun() before every append — before a byte is read or written, before the witness — and
 * REFUSES while any marked process is alive. The mark is a file, not an environment variable: a test that builds a child's
 * environment from scratch cannot drop it. A mark left by a killed process names a pid that no longer runs and is ignored.
 * A confined (relocated) test store is never asked: it is not the product's history.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const HARNESS_RUNS_DIR = "almivisibility-harness-runs";

export class HarnessRunAppendRefused extends Error {
  constructor(pids) {
    super(`HARNESS_RUN_APPEND_REFUSED: a sabotage harness is running (pid ${pids.join(", ")}) — the production trail and its witness take no append from a harness run; nothing was read or written`);
    this.name = "HarnessRunAppendRefused";
    this.code = "HARNESS_RUN_APPEND_REFUSED";
    this.pids = pids;
  }
}

/** The repository's git directory — where the witness lives (witness.mjs). Read from `.git` itself, never by spawning git: a
 * process whose environment holds no PATH must still find the marks. A `.git` FILE (a worktree) names its directory. */
export function gitDirOf(repo) {
  const dot = join(repo, ".git");
  if (statSync(dot).isDirectory()) return resolve(dot);
  const named = readFileSync(dot, "utf8").match(/^gitdir:\s*(.+?)\s*$/m);
  if (!named) throw new Error("NO_GIT_DIR: .git is neither a directory nor a gitdir file");
  return resolve(repo, named[1]);
}

/** Is this pid a running process? EPERM means it runs under another user — still running. */
export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e?.code === "EPERM"; }
}

/** Mark THIS process as a harness run until it exits. Returns the mark's path. */
export function markHarnessRun(repo, { file = process.argv[1] ?? "", pid = process.pid, onExit = (fn) => process.on("exit", fn) } = {}) {
  const dir = join(gitDirOf(repo), HARNESS_RUNS_DIR);
  mkdirSync(dir, { recursive: true });
  const mark = join(dir, `${pid}.json`);
  writeFileSync(mark, JSON.stringify({ pid, file: String(file).replace(/\\/g, "/").split("/").slice(-3).join("/"), startedAt: new Date().toISOString() }) + "\n", { flag: "wx" });
  onExit(() => rmSync(mark, { force: true }));
  return mark;
}

/** The pids of the marked harness runs that are still alive. A git directory that cannot be found holds no mark. */
export function liveHarnessRuns(repo) {
  let dir;
  try { dir = join(gitDirOf(repo), HARNESS_RUNS_DIR); } catch { return []; }
  if (!existsSync(dir)) return [];
  const pids = [];
  for (const f of readdirSync(dir)) {
    if (!/^\d+\.json$/.test(f)) continue;
    let pid = Number(f.slice(0, -5));
    try { pid = JSON.parse(readFileSync(join(dir, f), "utf8")).pid ?? pid; } catch { /* a torn mark still names its pid by its file name */ }
    if (pidAlive(pid)) pids.push(pid);
  }
  return pids.sort((a, b) => a - b);
}

/** The production store's question before every append: throws while any harness run is alive. */
export function assertNoHarnessRun(repo) {
  const pids = liveHarnessRuns(repo);
  if (pids.length) throw new HarnessRunAppendRefused(pids);
}
