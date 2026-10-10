/**
 * 🔴 RR-247 · A BARE `node --test` CAN RUN NO HARNESS — the deliberate-invocation gate (test/helpers/harness-gate.mjs).
 *
 * A bare `node --test` (no file list, or an empty one) runs every file Node's default discovery finds, and that includes every .mjs
 * under test/. Three times that put live sabotages into src. The population here is found by BEHAVIOUR, not by name: a file is in it
 * if, run bare, it tries to write, spawn or reach the network (test/support/bare-run-census-preload.mjs refuses and logs each try).
 *
 *   HG-1  the gated population: every sabotage harness and every census-found writer imports the gate FIRST — 124 files (RR-247)
 *   HG-2  BEHAVIOUR: every other file a bare run discovers, run bare, tries no write, no spawn and no network — except a PRODUCTION
 *         entry point, which is not a helper and is never gated: F02 governs it (test/f02-tenant-isolation.test.mjs L3: no tenant →
 *         exit 3, nothing read, the trail does not move), and run bare it may touch the confined test store and nothing else
 *   HG-3  every gated file, run bare, stops at the gate: exit 2 (a refusal is never a success), names the flag, tries nothing
 *   HG-4  a DISPOSABLE COPY (the real gate, byte for byte, and a harness that writes src): a bare `node --test` there changes no tracked
 *         file; the same harness run deliberately does (positive control: the copy can see a change)
 *   HG-5  every place in the repository that tells how to run a gated file says --deliberate
 *
 * Sabotages: test/helpers/rr247-sabotage.mjs --deliberate (G01–G05).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { productionEntryPoints } from "../src/entry-points.mjs";
import { TEST_SCRATCH_AUDIT_ROOT } from "../src/governance/governed-run.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const GATE = "test/helpers/harness-gate.mjs";
const PRELOAD = pathToFileURL(join(REPO, "test/support/bare-run-census-preload.mjs")).href;
const SUITE = /^test\/[^/]+\.test\.mjs$/; // what `npm test` runs (test/*.test.mjs)

/* Node's default discovery (node --test with no file list), node_modules excluded */
const DISCOVERED = /(^|\/)test\/.*\.(c|m)?js$|\.test\.(c|m)?js$|-test\.(c|m)?js$|_test\.(c|m)?js$|(^|\/)test-[^/]*\.(c|m)?js$|(^|\/)test\.(c|m)?js$/;
const tracked = spawnSync("git", ["ls-files"], { cwd: REPO, encoding: "utf8" }).stdout.split(/\r?\n/).filter(Boolean);
const discovered = tracked.filter((f) => !f.split("/").includes("node_modules") && DISCOVERED.test(f));
const outsideSuite = discovered.filter((f) => !SUITE.test(f));

/** The first top-level static import of a module (comments skipped), or null. */
function firstImport(text) {
  let inBlock = false;
  for (const [i, l] of text.split(/\r?\n/).entries()) {
    if (i === 0 && l.startsWith("#!")) continue;
    if (!inBlock && /^import[\s{"'*]/.test(l)) return l;
    let s = l;
    while (s.length) {
      if (inBlock) { const e = s.indexOf("*/"); if (e < 0) s = ""; else { inBlock = false; s = s.slice(e + 2); } }
      else { const b = s.indexOf("/*"), c = s.indexOf("//"); if (b < 0 || (c >= 0 && c < b)) s = ""; else { inBlock = true; s = s.slice(b + 2); } }
    }
  }
  return null;
}
const isGated = (f) => /^import\s+["'](\.\.?\/)+(test\/helpers\/)?harness-gate\.mjs["']/.test(firstImport(readFileSync(join(REPO, f), "utf8")) ?? "");
const gated = outsideSuite.filter(isGated);
const ungated = outsideSuite.filter((f) => !isGated(f));
const bare = (f, extra = []) => spawnSync(process.execPath, ["--import", PRELOAD, f, ...extra], { cwd: REPO, encoding: "utf8", timeout: 180000 });
const tries = (r) => `${r.stderr ?? ""}`.split(/\r?\n/).filter((l) => l.startsWith("CENSUS would-"));

const WRITERS = ["test/helpers/f06-correction-section-a.mjs", "test/helpers/f08-counting-control.mjs", "test/helpers/f19-census-controls.mjs",
  "test/helpers/rr243-run-cost-child.mjs", "test/helpers/exact-replace.mjs", "test/helpers/rr247-bare-clone-proof.mjs"];
const ENTRY_POINTS = new Set(productionEntryPoints());
const CONFINED = new RegExp(`^CENSUS would-[\\w.:]+ ${TEST_SCRATCH_AUDIT_ROOT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/run-[\\w-]+/`);

test("HG-1 · every sabotage harness and every census-found writer imports the gate FIRST — 124 files", () => {
  assert.ok(discovered.length >= 400 && outsideSuite.length >= 140, `the discovered population is too small to be the repository (${discovered.length}/${outsideSuite.length})`);
  const harnesses = outsideSuite.filter((f) => /sabotage/.test(f));
  assert.ok(harnesses.length >= 118, `${harnesses.length} sabotage harnesses`);
  assert.deepEqual(harnesses.filter((f) => !isGated(f)), [], "a sabotage harness does not import the gate first");
  assert.deepEqual(WRITERS.filter((f) => !isGated(f)), [], "a census-found writer does not import the gate first");
  assert.equal(gated.length, 124, "the gated population moved — a new harness or writer must import the gate, and this census is restated by name"); /* RR-247: 118 harnesses (rr247-sabotage.mjs included) + 5 census-found writers + the clone proof */
});

test("HG-2 · BEHAVIOUR: every other file a bare `node --test` discovers, run bare, tries no write, no spawn and no network (a production entry point: the confined test store only)", () => {
  assert.ok(ungated.length >= 20, `${ungated.length} ungated files — the census cannot be this small`);
  const offenders = [];
  for (const f of ungated) {
    const r = bare(f);
    const t = tries(r).filter((l) => !(ENTRY_POINTS.has(f) && CONFINED.test(l)));
    if (t.length || r.error) offenders.push(`${f}: ${r.error ? r.error.code : t.slice(0, 2).join(" | ")}`);
  }
  assert.deepEqual(offenders, [], "a file that a bare run discovers writes, spawns or reaches the network without the gate");
  /* RR-247: the one production entry point a bare run discovers (by its name) — kept honest by name, so a second one is a decision */
  assert.deepEqual(ungated.filter((f) => ENTRY_POINTS.has(f)), ["subjects/almi-oet/tools/acceptance-test.mjs"]);
});

test("HG-3 · every gated file, run bare, stops at the gate: exit 2, the flag named, nothing tried", () => {
  assert.equal(gated.length, 124);
  const wrong = [];
  for (const f of gated) {
    const r = bare(f);
    const t = tries(r);
    if (r.status !== 2 || !/^REFUSED — .* runs only when invoked deliberately:/m.test(r.stderr) || !r.stderr.includes("--deliberate") || t.length) {
      wrong.push(`${f}: exit ${r.status} · tried ${t.length} · ${String(r.stderr).split(/\r?\n/)[0].slice(0, 90)}`);
    }
  }
  assert.deepEqual(wrong, [], "a gated file did not stop at the gate");
});

test("HG-4 · a disposable copy: a bare `node --test` changes no tracked file; the same harness run deliberately does", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr247-bare-"));
  const g = (...a) => spawnSync("git", ["-c", "core.autocrlf=false", "-c", "user.name=rr247", "-c", "user.email=rr247@localhost", ...a], { cwd: dir, encoding: "utf8" });
  try {
    mkdirSync(join(dir, "test", "helpers"), { recursive: true });
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, GATE), readFileSync(join(REPO, GATE))); // the REAL gate, byte for byte
    writeFileSync(join(dir, "src", "engine.mjs"), 'export const RULE = "clean";\n');
    writeFileSync(join(dir, "test", "helpers", "canary-sabotage.mjs"), [
      'import "./harness-gate.mjs";',
      'import { readFileSync, writeFileSync } from "node:fs";',
      'const p = new URL("../../src/engine.mjs", import.meta.url);',
      'writeFileSync(p, readFileSync(p, "utf8").replace("clean", "SABOTAGED"));',
      "",
    ].join("\n"));
    writeFileSync(join(dir, "test", "ok.test.mjs"), 'import test from "node:test";\ntest("ok", () => {});\n');
    assert.equal(g("init", "-q").status, 0);
    assert.equal(g("add", "-A").status, 0);
    assert.equal(g("commit", "-q", "-m", "fixture").status, 0);
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT; delete env.NODE_TEST_WORKER_ID; // a bare run from a shell, not a child of this runner
    const run = spawnSync(process.execPath, ["--test"], { cwd: dir, env, encoding: "utf8", timeout: 180000 });
    assert.match(`${run.stdout}${run.stderr}`, /canary-sabotage\.mjs/, "the bare run did not discover the harness — the copy proves nothing");
    assert.equal(g("status", "--porcelain").stdout, "", "a bare `node --test` changed a tracked file");
    assert.notEqual(run.status, 0, "the harness's refusal read as a success");
    const control = spawnSync(process.execPath, ["test/helpers/canary-sabotage.mjs", "--deliberate"], { cwd: dir, env, encoding: "utf8" });
    assert.equal(control.status, 0, control.stderr);
    assert.match(g("status", "--porcelain").stdout, /src\/engine\.mjs/, "CONTROL: run deliberately the harness must change the copy — else the check could not fail");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("HG-5 · every place in the repository that tells how to run a gated file says --deliberate", () => {
  /* runs/ holds evidence records of past runs, and CASE_STUDY_01_RUN_01.md is the dated record of one run (by its old bin/ path);
   * a record says how a run WAS made and is never rewritten. */
  const RECORDS = (f) => f.startsWith("runs/") || f === "CASE_STUDY_01_RUN_01.md";
  const names = new Set(gated.map((f) => f.split("/").pop()));
  const stale = [];
  for (const f of tracked.filter((x) => /\.(mjs|js|md|json|ya?ml|txt)$/.test(x) && !RECORDS(x))) {
    let text;
    try { text = readFileSync(join(REPO, f), "utf8"); } catch { continue; }
    for (const m of text.matchAll(/node (?:--import \S+ )?(?:test\/helpers|subjects\/almi-oet\/tools|bin)\/([\w.-]+\.mjs)(?! --deliberate)/g)) {
      if (names.has(m[1])) stale.push(`${f}: ${m[0]}`);
    }
  }
  assert.deepEqual(stale, [], "a how-to-run line for a gated file lacks --deliberate");
});
