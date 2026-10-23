/**
 * RR-321 F · CC's OWN PROCESS (owner: "make it impossible to edit or test code while a sabotage harness is running: a lock that refuses,
 * not a promise"; "give the 4 older crawl sabotage harnesses an explicit mode"):
 *   F1  tools/harness-lock-guard.mjs, a PreToolUse hook: while a deliberate harness run's mark is alive (harness-run.mjs), an edit of the
 *       repository, a test run, a git change or a second harness is REFUSED (exit 2); a dead pid's mark, or no mark, refuses nothing
 *   F2  f19-sabotage, f19-generic-crawl-sabotage, rr227-sabotage, rr229c-sabotage: SAB_MODE=dry (pre-flight only) or SAB_MODE=run — no mode
 *       is refused, nothing changed
 * The guard is run on a temporary repository (its own git folder and marks); no harness is run here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { sabMode, dryPreflight, SAB_MODES } from "./helpers/sab-mode.mjs";

const GUARD = new URL("../tools/harness-lock-guard.mjs", import.meta.url);
const guard = (repo, call) => spawnSync(process.execPath, [GUARD.pathname.replace(/^\/([A-Za-z]:)/, "$1"), ], { input: JSON.stringify(call), encoding: "utf8", env: { ...process.env, HARNESS_LOCK_REPOS: repo } });
const repoWith = (pid) => { const r = mkdtempSync(join(tmpdir(), "rr321-lock-")); mkdirSync(join(r, ".git", "almivisibility-harness-runs"), { recursive: true }); if (pid) writeFileSync(join(r, ".git", "almivisibility-harness-runs", `${pid}.json`), JSON.stringify({ pid, file: "test/helpers/x-sabotage.mjs" })); return r; };

test("F1 · while a harness run is ALIVE: an edit of the repository, a test, a git change and a second harness are REFUSED (exit 2) — reading and other files are not", () => {
  const live = process.pid, repo = repoWith(live);
  try {
    for (const call of [{ tool_name: "Edit", tool_input: { file_path: join(repo, "desktop", "main.mjs") } }, { tool_name: "Write", tool_input: { file_path: join(repo, "src", "x.mjs").replace(/\\/g, "/") } },
      { tool_name: "Bash", tool_input: { command: "cd /x && node --test test/rr321-regulators-and-counting.test.mjs" } }, { tool_name: "PowerShell", tool_input: { command: "npm test" } },
      { tool_name: "Bash", tool_input: { command: "git commit -m x" } }, { tool_name: "Bash", tool_input: { command: "git -C /c/x add -A" } }, { tool_name: "Bash", tool_input: { command: "SAB_MODE=run node sab321.mjs" } }]) {
      const r = guard(repo, call);
      assert.equal(r.status, 2, `${call.tool_name} ${JSON.stringify(call.tool_input)} was not refused`); assert.match(r.stderr, /REFUSED — a sabotage harness is running: test\/helpers\/x-sabotage\.mjs \(pid \d+\)/);
    }
    for (const call of [{ tool_name: "Read", tool_input: { file_path: join(repo, "desktop", "main.mjs") } }, { tool_name: "Bash", tool_input: { command: "git status --short" } }, { tool_name: "Edit", tool_input: { file_path: join(tmpdir(), "elsewhere.txt") } }, { tool_name: "Bash", tool_input: { command: "tail -5 out.txt" } }])
      assert.equal(guard(repo, call).status, 0, `${call.tool_name} ${JSON.stringify(call.tool_input)} was refused`);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("F1 · no mark, or the mark of a process that no longer runs: nothing is refused", () => {
  const dead = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" }).stdout.trim();
  for (const repo of [repoWith(null), repoWith(Number(dead))]) {
    try { assert.equal(guard(repo, { tool_name: "Bash", tool_input: { command: "node --test test/x.test.mjs" } }).status, 0); assert.equal(guard(repo, { tool_name: "Edit", tool_input: { file_path: join(repo, "a.mjs") } }).status, 0); }
    finally { rmSync(repo, { recursive: true, force: true }); }
  }
});

test("F1 · the guard is a PreToolUse hook of the user's tooling, for every tool", () => {
  const s = JSON.parse(readFileSync(join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".claude", "settings.json"), "utf8"));
  const hooks = (s.hooks?.PreToolUse ?? []).flatMap((h) => (h.hooks ?? []).map((x) => ({ matcher: h.matcher, command: x.command })));
  assert.ok(hooks.some((h) => h.matcher === "*" && /harness-lock-guard\.mjs/.test(h.command)), "the lock is not wired");
}, { skip: !process.env.USERPROFILE || process.env.CI ? "the owner's machine only (CI has no user tooling)" : false });

test("F2 · the 4 crawl harnesses take an explicit SAB_MODE — none is refused with exit 2, dry is the pre-flight only", () => {
  assert.deepEqual(SAB_MODES, ["dry", "run"]);
  let code = null, said = ""; assert.equal(sabMode({}, { exit: (c) => { code = c; }, write: (s) => { said += s; } }), null); assert.equal(code, 2); assert.match(said, /REFUSED — set SAB_MODE=dry .* or SAB_MODE=run .*Nothing was changed/);
  assert.equal(sabMode({ SAB_MODE: "dry" }), "dry"); assert.equal(sabMode({ SAB_MODE: "run" }), "run");
  code = null; sabMode({ SAB_MODE: "DRY=1" }, { exit: (c) => { code = c; }, write: () => {} }); assert.equal(code, 2, "a near miss is no mode");
  const dir = mkdtempSync(join(tmpdir(), "rr321-dry-")); writeFileSync(join(dir, "a.mjs"), "const x = 1;\nconst y = 2;\n");
  try {
    const log = []; let ex = null; dryPreflight([{ id: "S1", file: "a.mjs", from: "const x = 1;" }, { id: "S2", file: "a.mjs", from: "const z" }], dir, { log: (l) => log.push(l), exit: (c) => { ex = c; } });
    assert.equal(ex, 1); assert.match(log.join("\n"), /DRY S2 a\.mjs: span found 0 times — NOT EXACTLY ONCE/); assert.equal(readFileSync(join(dir, "a.mjs"), "utf8"), "const x = 1;\nconst y = 2;\n", "dry writes nothing");
  } finally { rmSync(dir, { recursive: true, force: true }); }
  for (const f of ["f19-sabotage", "f19-generic-crawl-sabotage", "rr227-sabotage", "rr229c-sabotage"]) {
    const t = readFileSync(new URL(`./helpers/${f}.mjs`, import.meta.url), "utf8");
    assert.match(t, /import "\.\/harness-gate\.mjs";[^\n]*\r?\nimport \{ sabMode, dryPreflight \} from "\.\/sab-mode\.mjs";/, `${f}: the mode right after the gate`);
    assert.match(t, /const SAB = sabMode\(\);/); assert.match(t, /if \(SAB === "dry"\) dryPreflight\(/);
    assert.ok(t.indexOf('if (SAB === "dry") dryPreflight(') < Math.min(...["writeFileSync(join(REPO, file), text", "runSabotages(list)", "const baseOut"].map((a) => t.indexOf(a)).filter((i) => i >= 0)), `${f}: dry returns before anything is written or run`);
    const bare = spawnSync(process.execPath, [new URL(`./helpers/${f}.mjs`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "--deliberate"], { encoding: "utf8", env: { ...process.env, SAB_MODE: "" } });
    assert.equal(bare.status, 2, `${f}: no mode was not refused`); assert.match(bare.stderr, /REFUSED — set SAB_MODE=dry/);
  }
});
