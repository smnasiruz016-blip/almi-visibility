/* RR-305 · THE INSTALLER TAKES OVER AND UPDATES ITSELF (owner decision: "it should take over and update the older version itself").
 * The Setup is compiled from installer/Setup.cs by the same compile step as the shipped one (desktop/installer-compile.mjs), with a small
 * payload: the real Node runtime and a stand-in app. It runs for REAL, silently, only inside this test's own folders: /D= (the install
 * folder), /DATA= (the data folder) and /NOSYSTEM (no desktop icon, no Start-menu entry, no Programs-list entry) — the user's own install,
 * data, desktop and registry are never touched. WINDOWS ONLY: CI runs on Linux, so there the real-run tests are SKIPPED by name; the
 * source checks below run everywhere. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { compileSetup, cscAvailable } from "../desktop/installer-compile.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SETUP_CS = readFileSync(join(REPO, "installer", "Setup.cs"), "utf8");
const WINDOWS_ONLY = cscAvailable() ? false : "Windows only — the Setup is a Windows program; CI runs on Linux (the real run is the owner's-PC proof)";

/* the stand-in app: a local server that writes run.json like desktop/main.mjs; with --stubborn it answers /api/quit and does NOT exit */
const APP = `import { createServer } from "node:http"; import { writeFileSync } from "node:fs"; import { join } from "node:path";
const data = process.argv.find((a) => a.startsWith("--data=")).slice(7).replace(/^"|"$/g, "");
const stubborn = process.argv.includes("--stubborn");
const s = createServer((q, r) => { if (q.method === "POST" && q.url === "/api/quit") { r.end("{}"); if (!stubborn) setTimeout(() => process.exit(0), 100); return; } r.end("ok"); });
s.listen(0, "127.0.0.1", () => writeFileSync(join(data, "run.json"), JSON.stringify({ port: s.address().port, pid: process.pid, version: "stand-in" })));
`;
const ps = (cmd) => execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cmd], { stdio: "pipe" });
function stage(dir, version) {
  mkdirSync(join(dir, "runtime"), { recursive: true }); mkdirSync(join(dir, "desktop"), { recursive: true });
  copyFileSync(process.execPath, join(dir, "runtime", "node.exe"));
  writeFileSync(join(dir, "desktop", "main.mjs"), APP);
  writeFileSync(join(dir, "version.txt"), version);
  return dir;
}
function packageOf(root, version) {
  const zip = join(root, `pkg-${version}.zip`);
  ps(`Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${stage(join(root, `stage-${version}`), version)}', '${zip}', [IO.Compression.CompressionLevel]::Fastest, $false)`);
  return zip;
}
function setupOf(root, version) {
  const zip = packageOf(root, version), v = join(root, `version-${version}.txt`);
  writeFileSync(v, version);
  return compileSetup({ repo: REPO, out: join(root, `Setup-${version}.exe`), payloadZip: zip, versionFile: v });
}
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const waitFor = async (f, ms = 15000) => { const until = Date.now() + ms; while (Date.now() < until) { if (f()) return true; await new Promise((r) => setTimeout(r, 100)); } return f(); };
/* the user's data, as bytes: every file except run.json (the running app's own address, rewritten on every start) */
const dataBytes = (dir) => { const out = {}; const walk = (d) => { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f); else if (n !== "run.json") out[relative(dir, f)] = createHash("sha256").update(readFileSync(f)).digest("hex"); } }; walk(dir); return out; };
function userData(dir) {
  mkdirSync(join(dir, "products", "p1"), { recursive: true }); mkdirSync(join(dir, "raw"), { recursive: true });
  writeFileSync(join(dir, "company.json"), JSON.stringify({ name: "Fixture Co", site: "https://fixture.invalid" }));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ account: "av_owner_fixture", owner: { licence: { kind: "OWNER" }, signature: "fixture" } }));
  writeFileSync(join(dir, "licence.json"), JSON.stringify({ last: null }));
  writeFileSync(join(dir, "products", "p1", "state.json"), JSON.stringify({ setup: { youtube: { handle: "@fixture", keyName: "YOUTUBE_API_KEY" } } }));
  writeFileSync(join(dir, "raw", "search-data.json"), "[1,2,3]");
}
/* an OLD install (like 1.3.0 on the owner's PC) whose app is RUNNING from its own app\runtime\node.exe */
async function oldInstallRunning(root, { stubborn }) {
  const D = join(root, "install"), DATA = join(root, "data");
  stage(join(D, "app"), "1.3.0"); writeFileSync(join(D, "app", "only-in-the-old-version.txt"), "old");
  userData(DATA);
  const p = spawn(join(D, "app", "runtime", "node.exe"), [join(D, "app", "desktop", "main.mjs"), `--data=${DATA}`, ...(stubborn ? ["--stubborn"] : [])], { stdio: "ignore" });
  assert.ok(await waitFor(() => existsSync(join(DATA, "run.json"))), "the old app did not start");
  return { D, DATA, pid: p.pid };
}
/* a fresh .exe can stay held for a while after its processes ended (seen on the owner's PC with Avast present): the temp folder is retried
 * for 30 s and, if still held, left for Windows' own temp clean-up and named — it is not what these tests measure */
async function cleanup(root) {
  for (let i = 0; i < 60; i++) { try { rmSync(root, { recursive: true, force: true }); return; } catch { await new Promise((r) => setTimeout(r, 500)); } }
  console.log(`# NOTE: ${root} was still held after 30 s and is left for the temp clean-up`);
}
const run = (exe, args) => spawnSync(exe, args, { encoding: "utf8", timeout: 180000 });
const logOf = (D) => readFileSync(join(D, "install.log"), "utf8");

test("THE OWNER'S CASE · 1.3.0 installed AND running, ignoring the request to close: Setup asks, waits 10 s, stops ONLY its own processes (another node.exe keeps running), updates in place, keeps every data file byte for byte, and reopens the app", { skip: WINDOWS_ONLY }, async () => {
  const root = mkdtempSync(join(tmpdir(), "rr305-take-"));
  const decoyDir = join(root, "elsewhere"); mkdirSync(decoyDir); copyFileSync(process.execPath, join(decoyDir, "node.exe"));
  const decoy = spawn(join(decoyDir, "node.exe"), ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  let reopened = null, oldPid = null;
  try {
    const setup = setupOf(root, "9.9.1");
    const { D, DATA, pid } = await oldInstallRunning(root, { stubborn: true }); oldPid = pid;
    const before = dataBytes(DATA);
    const t0 = Date.now();
    const r = run(setup, ["/S", `/D=${D}`, `/DATA=${DATA}`, "/NOSYSTEM"]);
    const took = (Date.now() - t0) / 1000;
    assert.equal(r.status, 0, `${r.stderr}\n${existsSync(join(D, "install.log")) ? logOf(D) : "no log"}`);
    /* 10 s asking + the stop + the install: a first build waited 2 min 20 s here (it re-scanned every process 40 times) */
    assert.ok(took < 60, `the takeover took ${took} s`);
    assert.equal(alive(pid), false, "the old app is still running");
    assert.equal(alive(decoy.pid), true, "a node.exe that is NOT AlmiVisibility's was stopped");
    assert.equal(readFileSync(join(D, "app", "version.txt"), "utf8"), "9.9.1");
    assert.ok(!existsSync(join(D, "app", "only-in-the-old-version.txt")) && !existsSync(join(D, "app.new")) && !existsSync(join(D, "app.old")), "the swap left old or half files");
    assert.ok(existsSync(join(D, "AlmiVisibility.exe")) && existsSync(join(D, "Uninstall.exe")));
    assert.deepEqual(dataBytes(DATA), before, "the user's data changed");
    const log = logOf(D);
    for (const line of [/STEP 8% AlmiVisibility is running — asking it to close: node\.exe \(process \d+\)/, /asked the app on port \d+ to quit/, /did not close within 10 seconds — stopping its own processes only: node\.exe/, /AlmiVisibility's processes stopped/, /Unpacking the new program files \(\d+ of \d+\)/, /TEST INSTALL \(\/NOSYSTEM\)/, /INSTALLED 9\.9\.1 .*\(AlmiVisibility was running: closed, updated\)/]) assert.match(log, line);
    /* reopened: the new launcher started the new app with the same data folder */
    assert.ok(await waitFor(() => { try { const j = JSON.parse(readFileSync(join(DATA, "run.json"), "utf8")); return j.pid !== pid && alive(j.pid) ? (reopened = j.pid) : false; } catch { return false; } }), "the app was not reopened");
    /* the launcher writes this line after it sees run.json — wait for it */
    assert.ok(await waitFor(() => /LAUNCHED the app on port \d+/.test(logOf(D)), 10000), logOf(D));
  } finally { for (const x of [reopened, oldPid]) if (x && alive(x)) try { process.kill(x); } catch {} decoy.kill(); await waitFor(() => !(reopened && alive(reopened)) && !alive(decoy.pid), 5000); await cleanup(root); }
});

test("GRACEFUL FIRST · an app that answers /api/quit closes by itself — nothing is stopped; then THE IN-APP UPDATE (/apply-update) takes the SAME path over a running app and keeps the data", { skip: WINDOWS_ONLY }, async () => {
  const root = mkdtempSync(join(tmpdir(), "rr305-grace-"));
  let stubborn = null, oldPid = null;
  try {
    const setup = setupOf(root, "9.9.1");
    const { D, DATA, pid } = await oldInstallRunning(root, { stubborn: false }); oldPid = pid;
    const r = run(setup, ["/S", `/D=${D}`, `/DATA=${DATA}`, "/NOSYSTEM", "/NOLAUNCH"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(alive(pid), false);
    assert.match(logOf(D), /AlmiVisibility closed by itself/);
    assert.doesNotMatch(logOf(D), /stopping its own processes/, "a cooperating app was stopped instead of asked");
    /* the in-app update: a verified package handed to the INSTALLED launcher while the (stubborn) app runs */
    const pkg = packageOf(root, "9.9.2");
    const before = dataBytes(DATA);
    const app = spawn(join(D, "app", "runtime", "node.exe"), [join(D, "app", "desktop", "main.mjs"), `--data=${DATA}`, "--stubborn"], { stdio: "ignore" });
    stubborn = app.pid;
    assert.ok(await waitFor(() => { try { return JSON.parse(readFileSync(join(DATA, "run.json"), "utf8")).pid === app.pid; } catch { return false; } }));
    const u = run(join(D, "AlmiVisibility.exe"), ["/apply-update", pkg, "/S", `/DATA=${DATA}`, "/NOSYSTEM"]);
    assert.equal(u.status, 0, `${u.stderr}\n${logOf(D)}`);
    assert.equal(alive(app.pid), false, "the running app was not taken over by the update");
    assert.equal(readFileSync(join(D, "app", "version.txt"), "utf8"), "9.9.2");
    assert.deepEqual(dataBytes(DATA), before, "the update changed the user's data");
    assert.match(logOf(D), /Update: starting from[\s\S]*stopping its own processes only[\s\S]*UPDATED to 9\.9\.2/);
  } finally { for (const x of [stubborn, oldPid]) if (x && alive(x)) try { process.kill(x); } catch {} await cleanup(root); }
});

test("NEVER HALF-DELETED, NEVER SILENT · a file held by ANOTHER program (as an antivirus can): Setup waits 30 s, then stops with BLOCKED, names the file and says what to do in plain English — the old version is left whole and still works", { skip: WINDOWS_ONLY }, async () => {
  const root = mkdtempSync(join(tmpdir(), "rr305-lock-"));
  let holder = null;
  try {
    const setup = setupOf(root, "9.9.1");
    const D = join(root, "install"), DATA = join(root, "data");
    stage(join(D, "app"), "1.3.0"); userData(DATA);
    const locked = join(D, "app", "held-by-another-program.txt"); writeFileSync(locked, "x");
    const filesBefore = readdirSync(join(D, "app"), { recursive: true }).length;
    /* a program outside the install folder holds the file open with no sharing — Setup must not stop it (it is not AlmiVisibility's) */
    holder = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `$f = [IO.File]::Open('${locked}', 'Open', 'ReadWrite', 'None'); Write-Output held; Start-Sleep -Seconds 120`], { stdio: ["ignore", "pipe", "ignore"] });
    await new Promise((res) => holder.stdout.once("data", res));
    const t0 = Date.now();
    const r = run(setup, ["/S", `/D=${D}`, `/DATA=${DATA}`, "/NOSYSTEM", "/NOLAUNCH"]);
    const took = (Date.now() - t0) / 1000;
    assert.equal(r.status, 3, `expected BLOCKED (3), got ${r.status}: ${r.stderr}`);
    assert.ok(took >= 25 && took < 120, `it waited ${took} s — the retry limit is 30 s`);
    assert.match(r.stderr, /^BLOCKED Windows would not let Setup replace the old version\. This file is in use:/);
    assert.match(r.stderr, /held-by-another-program\.txt/);
    assert.match(r.stderr, /What to do:\n1\. Wait one minute, then click Try again\.\n2\. If it stops again, restart the computer[\s\S]*Do not turn your antivirus off\./);
    assert.equal(alive(holder.pid), true, "Setup stopped a program that is not AlmiVisibility's");
    assert.equal(readdirSync(join(D, "app"), { recursive: true }).length, filesBefore, "the old version was partly deleted (the 1.3.0 bug)");
    assert.equal(readFileSync(join(D, "app", "version.txt"), "utf8"), "1.3.0");
    assert.match(logOf(D), /the old version is still in use[\s\S]*BLOCKED \/S/);
  } finally { if (holder) holder.kill(); await new Promise((r) => setTimeout(r, 500)); await cleanup(root); }
});

test("THE SOURCE · Install takes over BEFORE it unpacks and swaps, and deletes no working folder; the in-app update and the uninstaller take over the same way; the wizard installs on a worker thread with a 10-minute limit; the launcher reuses a running app", () => {
  const body = (start, end) => { const a = SETUP_CS.indexOf(start); const b = SETUP_CS.indexOf(end, a + 1); assert.ok(a >= 0 && b > a, start); return SETUP_CS.slice(a, b); };
  const install = body("public static bool Install(", "/* ── TAKE OVER");
  const order = ["TakeOver(dir, progress, -1)", "Unpack(dir, z, fresh, progress)", "CheckUnpacked(fresh)", "Swap(dir, fresh)", "CopyWithRetry("];
  assert.deepEqual(order.map((s) => install.indexOf(s) >= 0), order.map(() => true), "a step is missing from Install");
  assert.deepEqual([...order].sort((a, b) => install.indexOf(a) - install.indexOf(b)), order, "Install's steps are out of order");
  assert.doesNotMatch(install, /Directory\.Delete\(/, "Install deletes a folder itself (the 1.3.0 bug: the working version was deleted first)");
  const update = body("static int ApplyUpdate(", "/* ── the install wizard");
  for (const s of ["TakeOver(dir, null, -1)", "Unpack(dir, z, fresh, null)", "CheckUnpacked(fresh)", "Swap(dir, fresh)"]) assert.ok(update.includes(s), `the in-app update does not ${s}`);
  assert.doesNotMatch(update, /Thread\.Sleep\(1500\)/, "the update still guesses with a fixed sleep");
  assert.ok(body("static int Uninstall(bool removeData)", "static int UninstallWizard").includes("TakeOver(dir, null, -1)"));
  const wizard = body("class Wizard : Form", "\n}\n");
  assert.match(wizard, /new Thread\(\(\) => \{\s*try \{ var was = Program\.Install\(/);
  assert.match(wizard, /TimeSpan\.FromMinutes\(10\)/);
  assert.match(body("static string RunningPort(", "static int Launch("), /Process\.GetProcessById/);
  /* only its OWN processes: chosen by the program file's folder; Kill appears once, inside TakeOver */
  assert.match(body("public static List<Process> Ours(", "static string Describe("), /MainModule\.FileName; if \(f\.StartsWith\(root, StringComparison\.OrdinalIgnoreCase\)\)/);
  assert.equal(SETUP_CS.split(".Kill()").length - 1, 1);
  assert.ok(body("public static bool TakeOver(", "/* graceful first").includes("p.Kill()"));
});
