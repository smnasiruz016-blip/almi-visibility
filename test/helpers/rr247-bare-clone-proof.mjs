/**
 * 🔴 RR-247 · ONE BARE `node --test` IN A FULL DISPOSABLE CLONE — the goal-2 proof, committed so it can be re-run.
 *
 *   node test/helpers/rr247-bare-clone-proof.mjs --deliberate      NOT part of `npm test`; runs the whole repository's tests in a clone
 *
 * It clones the CURRENT COMMIT of this repository into a fresh temporary directory, runs `node --test` there with NO file list (Node's
 * default discovery: every suite file, every harness, every helper), and then requires: no tracked file of the clone changed, the
 * clone's trail is byte-identical, and THIS working tree (its git status and its production trail) is untouched. The clone runs as a
 * shell would run it — not as a child of a test runner — and with no sealed-store variable, so it can reach no sealed store. The clone
 * is deleted afterwards. Test failures inside the clone are recorded but are not the subject (a clone has no witness and no local data).
 * Evidence: runs/audit/rr247-bare-clone-proof-<date>T<hhmm>.txt, written once (wx).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TRAIL = "audit-trail/events.jsonl";
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr247-bare-clone-proof-${DAY}.txt`);
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const sha = (b) => createHash("sha256").update(b).digest("hex");
const git = (cwd, ...a) => spawnSync("git", a, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });

const head = git(REPO, "rev-parse", "HEAD").stdout.trim();
const branch = git(REPO, "rev-parse", "--abbrev-ref", "HEAD").stdout.trim();
const realStatusBefore = git(REPO, "status", "--porcelain").stdout;
const realTrailBefore = sha(readFileSync(join(REPO, TRAIL)));

const dir = mkdtempSync(join(tmpdir(), "rr247-clone-"));
const lines = [`RR-247 bare \`node --test\` in a full disposable clone · ${new Date().toISOString()}`, `source: ${branch} @ ${head}`];
let ok = false;
try {
  const c = git(REPO, "clone", "--quiet", "--no-hardlinks", "--branch", branch, REPO, dir);
  if (c.status !== 0) throw new Error(`clone failed: ${c.stderr}`);
  const cloneHead = git(dir, "rev-parse", "HEAD").stdout.trim();
  const cloneTrailBefore = sha(readFileSync(join(dir, TRAIL)));
  const tracked = git(dir, "ls-files").stdout.split(/\r?\n/).filter(Boolean).length;
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; delete env.NODE_TEST_WORKER_ID;
  for (const k of Object.keys(env)) if (k.startsWith("ALMIVISIBILITY_SEALED")) delete env[k];
  const started = Date.now();
  const run = spawnSync(process.execPath, ["--test"], { cwd: dir, env, encoding: "utf8", timeout: 7200000, maxBuffer: 1 << 30 });
  const out = `${run.stdout}${run.stderr}`;
  const count = (re) => Number(out.match(re)?.[1] ?? NaN);
  const refusals = new Set([...out.matchAll(/REFUSED — (\S+) is a sabotage harness or a helper that writes/g)].map((m) => m[1]));
  const harnessesNamed = new Set([...out.matchAll(/test[\\/]helpers[\\/]([\w.-]*sabotage[\w.-]*\.mjs)/g)].map((m) => m[1]));
  const cloneStatus = git(dir, "status", "--porcelain", "--untracked-files=no").stdout;
  const cloneUntracked = git(dir, "status", "--porcelain", "--untracked-files=all").stdout.split(/\r?\n/).filter((l) => l.startsWith("??")).length;
  const cloneTrailAfter = sha(readFileSync(join(dir, TRAIL)));
  const realStatusAfter = git(REPO, "status", "--porcelain").stdout;
  const realTrailAfter = sha(readFileSync(join(REPO, TRAIL)));
  lines.push(
    `clone: ${dir.replace(/\\/g, "/").split("/").slice(-1)[0]} @ ${cloneHead} · ${tracked} tracked files · same commit as the source: ${cloneHead === head}`,
    `command: node --test   (no file list; cwd = the clone; not a child of a test runner; no sealed-store variable)`,
    `exit ${run.status}${run.error ? ` (${run.error.code})` : ""} · ${Math.round((Date.now() - started) / 1000)} s · tests ${count(/ℹ tests (\d+)/)} · pass ${count(/ℹ pass (\d+)/)} · fail ${count(/ℹ fail (\d+)/)} (failures inside a clone are not the subject)`,
    `sabotage harnesses the bare run DISCOVERED (named in its output): ${harnessesNamed.size} · gate refusal lines in its output: ${refusals.size}`,
    `clone tracked changes after the run: ${cloneStatus.trim() === "" ? "NONE" : cloneStatus.trim().split(/\r?\n/).length} · untracked entries (ignored scratch excluded): ${cloneUntracked}`,
    `clone trail sha256 before ${cloneTrailBefore} · after ${cloneTrailAfter} · unchanged ${cloneTrailAfter === cloneTrailBefore}`,
    `THIS working tree: git status unchanged ${realStatusAfter === realStatusBefore} · production trail sha256 ${realTrailAfter} · unchanged ${realTrailAfter === realTrailBefore}`,
  );
  if (cloneStatus.trim()) lines.push(...cloneStatus.trim().split(/\r?\n/).slice(0, 40).map((l) => `  changed: ${l}`));
  ok = cloneHead === head && cloneStatus.trim() === "" && cloneTrailAfter === cloneTrailBefore && realStatusAfter === realStatusBefore && realTrailAfter === realTrailBefore && harnessesNamed.size >= 118;
} finally {
  rmSync(dir, { recursive: true, force: true });
  lines.push(`clone deleted: ${!existsSync(dir)}`, `VERDICT: ${ok ? "PASS — a bare `node --test` ran no harness and changed no tracked file" : "FAIL"}`);
}
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.join("\n"));
process.exitCode = ok ? 0 : 1;
