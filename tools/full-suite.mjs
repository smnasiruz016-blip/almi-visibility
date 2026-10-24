#!/usr/bin/env node
/**
 * 🔴 RR-324 D1 · THE FULL LOCAL TEST SUITE HOLDS THE HARNESS LOCK (owner: "the harness lock also covers the FULL local test suite: no
 * edit, test or git change while it runs"; RR-323: the implementer edited joined-page.mjs while the full suite ran — that run was invalid).
 *
 * `npm test` runs this: it MARKS the run (<git dir>/almivisibility-suite-runs/<pid>.json, with the pid of the test runner it starts too),
 * runs `node --test` over every test/*.test.mjs, and removes the mark when it ends. tools/harness-lock-guard.mjs reads these marks beside
 * the harnesses' and refuses an edit of the repository, a test or a git change while either pid is alive — so a runner whose parent was
 * stopped still holds the lock while its tests run (a reaped suite leaves its process tree). The marks live apart from the harness marks:
 * the trail's own guard (harness-run.mjs) and the harness gate never see a test run as a harness.
 * Started directly (`node --test test/*.test.mjs` over the whole folder) the guard refuses it and names this runner.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gitDirOf } from "../src/audit-trail/harness-run.mjs";

export const SUITE_RUNS_DIR = "almivisibility-suite-runs";
const REPO = resolve(fileURLToPath(new URL("..", import.meta.url)));
const files = readdirSync(join(REPO, "test")).filter((f) => f.endsWith(".test.mjs")).sort().map((f) => join("test", f));
const dir = join(gitDirOf(REPO), SUITE_RUNS_DIR); mkdirSync(dir, { recursive: true });
const mark = join(dir, `${process.pid}.json`), write = (child) => writeFileSync(mark, JSON.stringify({ pid: process.pid, child, file: "the full test suite (npm test)", startedAt: new Date().toISOString() }) + "\n");
write(null);
const off = () => rmSync(mark, { force: true }); process.on("exit", off);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => process.exit(130));
const run = spawn(process.execPath, ["--test", ...process.argv.slice(2), ...files], { cwd: REPO, stdio: "inherit", env: { ...process.env, ALMIV_SUITE_RUN: String(process.pid) } });
write(run.pid);
run.on("exit", (code, sig) => { off(); process.exit(code ?? (sig ? 1 : 0)); });
