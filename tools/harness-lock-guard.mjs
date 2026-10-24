#!/usr/bin/env node
/**
 * 🔴 RR-321 F1 · NO EDIT, NO TEST, NO COMMIT WHILE A SABOTAGE HARNESS RUNS — a lock that REFUSES, not a promise (owner: "make it
 * impossible to edit or test code while a sabotage harness is running"; RR-287 and RR-320: the implementer edited and tested during a run).
 *
 * The lock is the mark every deliberate harness run already leaves while it is alive (test/helpers/harness-gate.mjs →
 * src/audit-trail/harness-run.mjs: <git dir>/almivisibility-harness-runs/<pid>.json, removed when it exits; a dead pid's mark is ignored)
 * — in the repository and in each of its worktrees. This guard runs as a PreToolUse hook of the implementer's tooling: it reads the tool
 * call as JSON on stdin and, while any marked run is alive, exits 2 (refuse) for
 *   · an edit or a write of a file inside the repository or a worktree of it (Edit, Write, NotebookEdit, MultiEdit);
 *   · a shell command that runs tests (node --test, npm test, npm run test…, vitest, playwright test), changes git state (commit, add,
 *     stash, checkout, restore, reset, merge, rebase, cherry-pick, push), or starts a second harness — in any shell.
 * Everything else (reading, the harness's own output, other repositories' files) is allowed. A refusal names the harness and its pid.
 *   HARNESS_LOCK_REPOS (tests only): the repositories to watch, ";"-separated.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_REPO = resolve(fileURLToPath(new URL("..", import.meta.url)));
const REPOS = (process.env.HARNESS_LOCK_REPOS ? process.env.HARNESS_LOCK_REPOS.split(";") : [SELF_REPO]).filter(Boolean).map((r) => resolve(r));
const alive = (pid) => { if (!Number.isInteger(pid) || pid <= 0) return false; try { process.kill(pid, 0); return true; } catch (e) { return e?.code === "EPERM"; } };
/* every git directory of a repository: its own, and each worktree's */
function gitDirs(repo) {
  const dot = join(repo, ".git"); if (!existsSync(dot)) return [];
  const main = statSync(dot).isDirectory() ? dot : resolve(repo, (/^gitdir:\s*(.+?)\s*$/m.exec(readFileSync(dot, "utf8")) ?? [])[1] ?? dot);
  const wt = join(main, "worktrees"), out = [main];
  if (existsSync(wt)) for (const d of readdirSync(wt)) out.push(join(wt, d));
  return out;
}
/* the worktrees' own folders, so an edit there is seen as inside the repository */
function worktreeRoots(repo) {
  const out = [repo];
  for (const g of gitDirs(repo).slice(1)) { try { out.push(resolve(dirname2(readFileSync(join(g, "gitdir"), "utf8").trim()))); } catch {} }
  return out;
}
const dirname2 = (p) => p.replace(/[\\/]\.git$/, "");
/* RR-324 D1: the full local test suite (tools/full-suite.mjs) marks its run beside the harnesses' — alive while its runner OR the test
 * runner it started is alive (a stopped parent leaves its tests running) */
export const RUN_DIRS = ["almivisibility-harness-runs", "almivisibility-suite-runs"];
export function liveRuns(repos = REPOS) {
  const runs = [];
  for (const repo of repos) for (const g of gitDirs(repo)) for (const sub of RUN_DIRS) {
    const dir = join(g, sub); if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) { if (!/^\d+\.json$/.test(f)) continue; let m = { pid: Number(f.slice(0, -5)) }; try { m = { ...m, ...JSON.parse(readFileSync(join(dir, f), "utf8")) }; } catch {} if (alive(m.pid) || alive(m.child)) runs.push(m); }
  }
  return runs;
}
const norm = (p) => String(p ?? "").replace(/\\/g, "/").replace(/^\/([a-z])\//i, "$1:/").toLowerCase();
const TEST_OR_GIT = /\bnode(\.exe)?\b[^\n|;&]*\s--test\b|\bnpm(\.cmd)?\s+(run\s+)?test\b|\bnpx\s+(vitest|playwright\s+test)\b|\bvitest\b|\bgit\b[^\n|;&]*\s(commit|add|stash|checkout|switch|restore|reset|merge|rebase|cherry-pick|push|apply|am)\b|\s--deliberate\b|\bSAB_MODE=|\bsab\d{3}\w*\.mjs\b/i; // a SECOND harness never starts while one runs (RR-310: two overlapping runs left residue)
/* RR-324 D1: the WHOLE test folder started directly — or npm test, which is that command (CI runs it; the board's R-CI tests pin it) —
 * would hold no lock here: locally it goes through tools/full-suite.mjs, which marks its run */
const DIRECT_SUITE = /\bnode(\.exe)?\b[^\n|;&]*\s--test\b[^\n|;&]*\btest[\\/]\*(\.test\.mjs)?(?=$|[\s"'|;&])|(?:^|[\n;&|(]\s*)npm(\.cmd)?\s+(run\s+)?test\b/i; // npm test as the COMMAND — not words inside a search
export function verdict(call, runs, repos = REPOS) {
  const tool = call?.tool_name ?? "", input = call?.tool_input ?? {};
  const direct = /^(Bash|PowerShell)$/.test(tool) && DIRECT_SUITE.test(String(input.command ?? "")) ? { refuse: true, why: "REFUSED — on this computer the full test suite is run with node tools/full-suite.mjs, which holds the harness lock while it runs: no edit, test or git change until it ends (RR-324 D1)." } : null;
  if (!runs.length) return direct ?? { refuse: false }; // while a run lives, its own reason is said first (below)
  const roots = repos.flatMap(worktreeRoots).map(norm);
  const inRepo = (p) => { const x = norm(p); return roots.some((r) => x === r || x.startsWith(`${r}/`)); };
  const who = runs.map((r) => `${r.file ?? "a harness"} (pid ${r.pid}${r.child ? `, its tests pid ${r.child}` : ""})`).join(", ");
  if (/^(Edit|Write|NotebookEdit|MultiEdit)$/.test(tool) && inRepo(input.file_path ?? input.notebook_path)) return { refuse: true, why: `REFUSED — a sabotage harness is running: ${who}. No file of the repository is edited while it runs (RR-321 F1). Wait for it to finish.` };
  if (/^(Bash|PowerShell)$/.test(tool) && TEST_OR_GIT.test(String(input.command ?? ""))) return { refuse: true, why: `REFUSED — a sabotage harness is running: ${who}. No test is run and no git state is changed while it runs (RR-321 F1). Wait for it to finish.` };
  return direct ?? { refuse: false };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  let call = {}; try { call = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
  const v = verdict(call, liveRuns());
  if (v.refuse) { process.stderr.write(`${v.why}\n`); process.exit(2); }
  process.exit(0);
}
