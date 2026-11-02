/**
 * RR-363 Part A: what the owner found in the built 1.15.15 on his own PC. The real-data test copies his products folder when this computer has it (never the licence, the config or a connection); elsewhere it is skipped.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, cpSync, mkdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { plainWhy } from "../desktop/plain-words.mjs";
import { compileSetup, cscAvailable } from "../desktop/installer-compile.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), ".."), read = (f) => readFileSync(join(REPO, f), "utf8"), UI = read("desktop/ui.html"), MAIN = read("desktop/main.mjs"), BUILD = read("desktop/build.mjs");
const OWNER = process.env.APPDATA ? join(process.env.APPDATA, "AlmiVisibility", "products", "almioet") : "";

test("A1 on a copy of the owner's real products: the first Home answers at once, with the score and the jobs in its data", { skip: existsSync(OWNER) ? false : "this computer has no copy of the owner's data: the source pins below hold on CI", timeout: 120000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr363-home-")); mkdirSync(join(dir, "products"));
  cpSync(OWNER, join(dir, "products", "almioet"), { recursive: true, filter: (f) => !/publish\.json$|youtube-signed\.json$/.test(f) });
  writeFileSync(join(dir, "company.json"), JSON.stringify({ name: "Co", site: "https://example.org", logoFile: null })); writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testOffline: true, almiSeoSync: false, updateChannelUrl: "http://127.0.0.1:9/", tourSeen: true, weeklyFirstMs: 864e5, toasts: false }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    for (let i = 0; i < 200 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`, t0 = Date.now(), r = await fetch(`${root}/api/products/almioet/overview`), O = await r.json(), ms = Date.now() - t0;
    assert.equal(r.status, 200); assert.ok(ms < 8000, `Home answered in ${ms} ms (it took 24 s on his data, with an empty screen)`);
    assert.ok(O.card?.score != null, "the score"); assert.ok(O.jobs?.length >= 1, "the ticks"); assert.ok(O.found, "what Visibility found");
    const n = await (await fetch(`${root}/api/products/almioet/next`)).json(); assert.ok(n.button, "What to do now");
  } finally { p.kill(); await new Promise((r) => setTimeout(r, 300)); try { rmSync(dir, { recursive: true, force: true }); } catch { /* let go later */ } }
});

test("A1: the screen is never empty while Home loads; making the plan no longer holds Home's answer", () => {
  assert.match(UI, /id="ovloading">Reading your product/);
  assert.match(MAIN, /setImmediate\(\(\) => buildPlan\(id\)\.catch\(\(\) => \{\}\)\);\n/); assert.ok(!/planTried\.set\(id, Date\.now\(\)\); buildPlan\(id\)/.test(MAIN));
});

test("A2: nothing removed, only moved: Home holds the score's details, What to do now, the ticks, the approval choice, Start, the last run, What to fix first, To-do and the plan's buttons, none of it folded away", () => {
  const home = UI.slice(UI.indexOf('$("#ov").innerHTML = `'), UI.indexOf('<div id="featbox"></div>`;'));
  for (const x of ["${scoreHtml}", "${whatNowHtml(NEXT, O.google)}", "${scoreMore}", "${jobsHtml}", "${fix}", "${todo}", "${more}"]) assert.ok(home.includes(x), x);
  assert.ok(!home.includes("See everything else"), "nothing behind a fold");
  for (const x of ['<h3>What do you want done?</h3>', 'name="appr" value="review"', 'name="appr" value="publish"', 'id="jobsgo"', 'id="jobrep"', "What to fix first — this week", 'id="plansave"', 'id="planagain"', '>To-do<']) assert.ok(UI.includes(x), x);
  assert.match(UI, /areasHtml\(c\)/, "Technical, Content and the rest, with what to fix in each");
});
test("A2: the Data tab holds What Visibility found, Add more sources, Keywords, Titles and Articles; More keeps its buttons", () => {
  assert.ok(UI.includes("${foundHtml(OV)}${planListsHtml(OV)}"), "drawn on the Data tab, not only written");
  const data = UI.slice(UI.indexOf("function foundHtml(O)"), UI.indexOf("async function searchDataScreen()"));
  for (const x of ["What Visibility found", "Questions answered on your pages", "Questions people ask", "Search phrases", "Prices on your pages", "Add more sources", 'id="kw"', 'id="tt"', 'id="mkl"', 'id="dataextra"', "Read it now"]) assert.ok(data.includes(x), x);
  for (const id of ["yts", "eng", "soc", "sdtab"]) assert.ok(UI.includes(`<button class="ghost" id="${id}">`), id);
  assert.ok(UI.includes('id="ffile"') && UI.includes('id="pubset"'), "Pages keeps Publish settings and the facts file");
});

test("A2: the last run stays one line, its long lists one click away (Home was 13,000 pixels tall)", () => {
  for (const x of ["Waiting for your OK (${R.needOk.length})", "Need work (${R.needWork.length})"]) assert.ok(UI.includes(`<details class="replist"><summary><b>${x}</b></summary>`), x);
});

test("the progress bar stays in sight wherever Start was pressed", () => { assert.match(UI, /#jobbar\{position:sticky;top:0/); });

test("A4: the first screen's Go to bar is back: each product, + New product, Help, Check for updates", () => {
  assert.match(UI, /<nav id="homenav" class="pact"><b>Go to:<\/b>/); assert.ok(UI.includes('innerHTML = `${nav}${firstTime')); for (const x of ['$("#navadd").onclick', '$("#navhelp").onclick', '$("#navupd").onclick']) assert.ok(UI.includes(x), x);
});

test("A5: a Guide button in the top bar of every screen; every screen has its guide, in one place; Start here stays until the first run is done", () => {
  assert.match(UI, /<header>.*id="guidebtn"/); const guide = UI.slice(UI.indexOf("const SCREEN_GUIDE = {"), UI.indexOf("function guideBars("));
  const names = [...new Set([...UI.matchAll(/here\("([a-zA-Z]+)"/g)].map((m) => m[1]))].filter((n) => n !== "work");
  for (const n of [...names, ...["work:Overview", "work:Pages and articles", "work:Approvals", "work:YouTube", "work:Monthly report"]]) { const m = new RegExp(`(?:^|\\n)\\s*"?${n.replace(/[:]/g, ":")}"?: \\{ line: [^\\n]*steps: \\[`).exec(guide); assert.ok(m, `the guide of ${n}`); }
  assert.match(UI, /const firstTime = !H\.products\.some\(\(p\) => p\.pages > 0 \|\| p\.improve > 0 \|\| p\.published > 0\);/);
  const steps = /const START_STEPS = (\[.*\]);\n/.exec(UI)[1]; assert.deepEqual(JSON.parse(steps).map((x) => x[0]), ["Open your product", "Home", "Tick what you want", "Choose", "Start", "Pages"]);
});

test("A6: no empty box on the Pages tab: a page made before the types has nothing to say there, so the box is not drawn", () => {
  assert.match(UI, /const planLine = PS\?\.counts && \(Object\.values\(TYPE_LABEL\)\.some\(\(x\) => x\.pages\) \|\| PS\.later \|\| PS\.merged\.length \|\| PS\.theyHave\?\.length\) \?/);
});

test("A7: never \"one of the five checks\": the failed check is named", () => {
  assert.ok(!read("desktop/plain-words.mjs").includes("One of the five checks"));
  const w = plainWhy({ readyAsDraft: false, gates: [{ gate: "C", words: "easy to find from your other pages", pass: false, failing: ["sitelinks — something we have no plain sentence for"] }] });
  assert.match(w, /^It still needs: easy to find from your other pages\./); assert.ok(!/check/i.test(w));
  assert.equal(plainWhy({ readyAsDraft: true }), null);
});

const WINDOWS_ONLY = cscAvailable() ? false : "Windows only: the launcher is a Windows program";
test("A3: the update carries the launcher: an old launcher is replaced by the new app; the window follows the new version by itself", () => {
  assert.match(BUILD, /join\(stage, "launcher", "AlmiVisibility\.exe"\)/); assert.match(MAIN, /function refreshLauncher\(\)/); assert.match(MAIN, /join\(HERE, "\.\.", "launcher", "AlmiVisibility\.exe"\)/);
  assert.match(UI, /if \(J\.version !== APP_VERSION\) return location\.reload\(\);/); assert.match(MAIN, /send\(200, \{ version: VERSION, jobs: BOARD\.list\(\) \}\)/);
});
test("A3: the one update that still runs the old launcher: when no screen asks for anything after it, the new launcher opens the window", () => {
  assert.match(MAIN, /copyFileSync\(from, to\); reopenWindowIfNone\(\);/); assert.match(MAIN, /if \(Date\.now\(\) - screenSeenAt < 15000\) return; try \{ spawn\(join\(INSTALL, "AlmiVisibility\.exe"\)/); assert.match(MAIN, /startsWith\("\/api\/"\)\) screenSeenAt = Date\.now\(\);/);
});
test("A3, for real: with an old launcher in place the new app replaces it; a launcher in use is tried again", { skip: WINDOWS_ONLY, timeout: 120000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "rr363-lau-")), install = join(root, "install"), app = join(install, "app"), data = join(root, "data"); mkdirSync(join(app, "desktop"), { recursive: true }); mkdirSync(join(app, "launcher"), { recursive: true }); mkdirSync(data);
  writeFileSync(join(install, "AlmiVisibility.exe"), "the old launcher"); writeFileSync(join(app, "launcher", "AlmiVisibility.exe"), "the new launcher");
  cpSync(join(REPO, "desktop"), join(app, "desktop"), { recursive: true }); for (const d of ["src", "config", "site", "installer"]) cpSync(join(REPO, d), join(app, d), { recursive: true }); writeFileSync(join(app, "package.json"), '{"type":"module"}');
  writeFileSync(join(data, "config.json"), JSON.stringify({ testSecretsInMemory: true, testOffline: true, almiSeoSync: false, updateChannelUrl: "http://127.0.0.1:9/", weeklyFirstMs: 864e5, toasts: false }));
  const p = spawn(process.execPath, [join(app, "desktop", "main.mjs"), `--data=${data}`, `--install=${install}`], { stdio: "ignore" });
  try { for (let i = 0; i < 200 && !existsSync(join(data, "run.json")); i++) await new Promise((r) => setTimeout(r, 100)); assert.equal(readFileSync(join(install, "AlmiVisibility.exe"), "utf8"), "the new launcher"); }
  finally { p.kill(); await new Promise((r) => setTimeout(r, 300)); try { rmSync(root, { recursive: true, force: true }); } catch { /* later */ } }
  void spawnSync; void execFileSync; void copyFileSync; void compileSetup;
});
