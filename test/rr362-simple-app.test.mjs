/**
 * RR-362 Part 4 · a simple app (recipe R11): the first screen, four tabs, a progress bar on every wait, the update in the same window. The real app is started; a throwaway key; no network, no paid search.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, mkdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { productStore } from "../desktop/products.mjs";
import { compileSetup, cscAvailable } from "../desktop/installer-compile.mjs";
import { plainWhy } from "../desktop/plain-words.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), ".."), AT = new Date().toISOString(), SITE = "https://fixture.invalid";
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"), MAIN = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), SETUP = readFileSync(join(REPO, "installer", "Setup.cs"), "utf8"), BUILD = readFileSync(join(REPO, "desktop", "build.mjs"), "utf8");

async function boot(fill = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), "rr362-app-")), st = productStore(dir);
  st.setCompany({ name: "Co", site: SITE, logoFile: null });
  const a = st.create({ name: "Prod", site: SITE }), s = st.read(a.id); s.started = true; s.setup.product = { name: "Prod", site: SITE, what: "A product.", subject: "Pet Insurance", cta: { label: "Try it", href: `${SITE}/signup` } }; st.write(a.id, s);
  const pd = join(dir, "products", a.id); fill(pd);
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testOffline: true, almiSeoSync: false, updateChannelUrl: "http://127.0.0.1:9/", tourSeen: true, weeklyFirstMs: 864e5, toasts: false }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const call = async (u, o) => { const r = await fetch(root + u, o ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) } : {}); return { http: r.status, j: await r.json().catch(() => null) }; };
  return { id: a.id, pd, call, stop: () => { p.kill(); try { rmSync(dir, { recursive: true, force: true }); } catch { /* let go later */ } } };
}
const card = async (b) => (await b.call("/api/home")).j.products[0];

test("item 2: each product's card has one status line and ONE big next step, from what it really holds", async () => {
  const b = await boot((pd) => { writeFileSync(join(pd, "check.json"), JSON.stringify({ on: AT, score: 50, areas: [], pagesRead: 1 })); writeFileSync(join(pd, "pages.json"), JSON.stringify({ subject: "Pet Insurance", drafts: [{ url: `${SITE}/a`, title: "A", readyAsDraft: true }, { url: `${SITE}/b`, title: "B", readyAsDraft: false }, { url: `${SITE}/c`, title: "C", readyAsDraft: true, improve: { url: `${SITE}/old` } }] })); });
  try {
    const c = await card(b); assert.equal(c.next.button, "1 page waits for you → See them"); assert.equal(c.next.action, "pages"); assert.equal(c.next.status, "1 page ready · 0 published");
    const n = await b.call(`/api/products/${b.id}/next`); assert.deepEqual(n.j, c.next, "the card and the Home tab read one answer");
  } finally { b.stop(); }
});

test("item 7: a card never counts another subject's set-aside drafts", async () => {
  const b = await boot((pd) => { writeFileSync(join(pd, "check.json"), JSON.stringify({ on: AT, score: 50, areas: [], pagesRead: 1 })); writeFileSync(join(pd, "pages.json"), JSON.stringify({ subject: "OET", drafts: Array.from({ length: 20 }, (_, i) => ({ url: `${SITE}/${i}`, title: `OET ${i}`, readyAsDraft: i < 3 })) })); });
  try { const c = await card(b); assert.equal(c.pages, 0); assert.equal(c.ready, 0); assert.equal(c.next.action, "make", `20 made, 3 ready must not be counted: ${c.next.status}`); } finally { b.stop(); }
});

test("item 6: making pages is on the board from its first step to its last, and says how it ended", async () => {
  const b = await boot((pd) => { writeFileSync(join(pd, "check.json"), JSON.stringify({ on: AT, score: 50, areas: [], pagesRead: 1 })); writeFileSync(join(pd, "site-read.json"), JSON.stringify({ ok: true, origin: SITE, start: SITE, on: AT, readOn: AT, pages: [{ url: `${SITE}/`, title: "Prod", h1: "Prod", h2: [], qa: [], facts: [], lead: [], prices: [], text: "Prod" }], shell: { header: "<header data-site-shell>x</header>", footer: "<footer data-site-shell>x</footer>", head: "" } })); });
  try {
    assert.deepEqual((await b.call("/api/jobs")).j.jobs, [], "nothing runs yet");
    await b.call(`/api/products/${b.id}/do`, { what: "create-pages" });
    const j = (await b.call("/api/jobs")).j.jobs.find((x) => x.kind === "make");
    assert.equal(j.running, false); assert.equal(j.label, "Making your pages"); assert.ok(j.ok !== null); assert.ok(j.line);
  } finally { b.stop(); }
});

test("item 6: the bar stands on every screen; it shows how much, how long, what now, and that a long job may be left", () => {
  assert.match(UI, /<div id="jobbar"/); assert.match(UI, /jobLoop\(\); \/\/ RR-362 item 6/);
  for (const w of ['data-jobcount', "j.leftLine", "j.what", "You can close this window. The work goes on, and you get a notification when it is done."]) assert.ok(UI.includes(w), w);
  for (const k of ['kind: "make"', 'kind: "check"', 'kind: "publish"', 'kind: "sync"', 'kind: "update"']) assert.ok(MAIN.includes(k), `every wait: ${k}`);
  assert.match(MAIN, /windowsToast\(/, "a notification for a closed window");
});

test("item 2: \"Start here\" only the first time; + New product; item 3: the 17 cards are a short list, five on top, the rest under More jobs", () => {
  assert.ok(UI.includes('${firstTime ? startHereHtml(H) : ""}')); assert.ok(UI.includes('localStorage.setItem("av-started", "yes")')); assert.ok(UI.includes(">+ New product</button>"));
  assert.ok(UI.includes('id="jobtop"') && UI.includes('id="jobmore"')); assert.ok(UI.includes("jobListHtml(M.cards, M)")); assert.ok(UI.includes("jobListHtml(O.menu.cards,"));
  assert.ok(!UI.includes("${cardsHtml(M.cards)}") && !UI.includes("${cardsHtml(top,"), "no grid of big cards");
});

test("item 4: four tabs: Home, Pages, Data, Settings; the rest under More; Home is the score and one box with ONE button", () => {
  assert.match(UI, /MAIN_TABS = \["Overview", "Pages and articles"\], TAB_WORDS = \{ Overview: "Home", "Pages and articles": "Pages" \}/);
  assert.match(UI, /id="astab">Data<\/button><button class="ghost" id="set">Settings<\/button><details class="moretabs" id="moretabs"><summary>More<\/summary>/);
  assert.ok(UI.includes('<h3>What to do now</h3>')); assert.equal((/const whatNowHtml = [^\n]*/.exec(UI)[0].match(/<button/g) ?? []).length, 1, "ONE button");
  assert.ok(UI.indexOf("${whatNowHtml(NEXT)}") < UI.indexOf('id="homemore"'), "the box first; everything else closed");
  assert.ok(UI.includes("<summary>See everything else</summary>${scoreMore}"), "the long list of what to fix is closed");
  assert.ok(UI.includes("$(\"#app\").innerHTML = `${nav}${firstTime"), "the top menu is drawn: every button the screen wires exists");
  assert.ok(!UI.includes('$("#navadd")'));
});

test("item 5: no internal word on what the client reads", () => {
  /* the page's own words: templates and strings, its comments out */
  const shown = UI.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/<script[^>]*>|<\/script>/g, " ");
  const words = [/\bSERP\b/, /\bG\d{1,2}\b/, /\bcanonical(?! ?:)/, /structured data/, /\bcoverage lists?\b/, /\bintent\b/, /five gates/, /\bAEO\b/, /\bGEO\b/];
  for (const w of words) { const m = shown.split("\n").filter((l) => w.test(l.replace(/"[a-z-]+":|\.[a-zA-Z]+|\b[a-z][a-zA-Z]*:/g, " ") /* a word followed by a colon may still be shown: only code's own lower-case names are left out */.replace(/\b(?:coverage|canonical)\b(?=\??\.)/g, ""))); assert.deepEqual(m.map((l) => l.slice(0, 80)), [], String(w)); }
  const FEAT = readFileSync(join(REPO, "desktop", "features.mjs"), "utf8"); assert.ok(!/title: "[^"]*\((?:AEO|GEO)\)/.test(FEAT));
  assert.equal(plainWhy({ readyAsDraft: false, gates: [{ gate: "H", words: "answers its core questions", pass: false, failing: ["Missing: test centres."] }] }), "Missing: test centres.");
});

test("item 13: the Pages tab says what is left for tomorrow in one line, and what was merged, never a wall of warnings", () => {
  assert.match(UI, /will be checked tomorrow\./); assert.match(UI, /merged into bigger pages/); assert.match(MAIN, /r\[2\] === "plan-summary"/);
  assert.match(MAIN, /checksDue\(pending,/); assert.match(MAIN, /continueChecks\(\)/);
});

test("the app stopping loses nothing: a run in progress is remembered and goes on; each official page read is kept at once; the window says what to do", () => {
  assert.match(MAIN, /pwrite\(id, "run-in-progress\.json"/); assert.match(MAIN, /existsSync\(pfile\(p\.id, "run-in-progress\.json"\)\)/); assert.match(MAIN, /set: \(u, v\) => \{ reads\[u\] = v; pwrite\(id, "research-reads\.json", reads\); \}/);
  assert.match(UI, /id="appdown">Visibility stopped working just now/);
});

test("the watcher: while a run is not finished it starts the app again; never after the run ended or the app was asked to stop", { timeout: 120000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr362-dog-")), marker = join(dir, "run"), stop = join(dir, "stop"), out = join(dir, "started.txt"), fake = join(dir, "fake.cjs"); writeFileSync(fake, `require("node:fs").writeFileSync(${JSON.stringify(out)}, "started");`); writeFileSync(marker, "{}");
  const dead = spawn(process.execPath, ["-e", ""], { stdio: "ignore" }); await new Promise((r) => dead.on("exit", r));
  const go = (m) => new Promise((res) => { const c = spawn(process.execPath, [join(REPO, "desktop", "watchdog.mjs"), String(dead.pid), m, stop, process.execPath, fake], { stdio: "ignore" }); c.on("exit", res); });
  try {
    await go(join(dir, "no-such-marker")); assert.ok(!existsSync(out), "the run ended: nothing started");
    writeFileSync(stop, "x"); await go(marker); assert.ok(!existsSync(out), "asked to stop: nothing started"); rmSync(stop);
    await go(marker); for (let i = 0; i < 30 && !existsSync(out); i++) await new Promise((r) => setTimeout(r, 100)); assert.ok(existsSync(out), "the app is gone, the run is not finished: started again");
    assert.match(MAIN, /launcher, "\/nowindow"/); assert.match(MAIN, /askedToStop\(\);\n\s+const r = installUpdate/); assert.match(MAIN, /"\/api\/quit"\) \{ askedToStop\(\);/); assert.match(MAIN, /startWatchdog\(id\);/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the new modules ship in the Setup (a whitelist: a file not on it is missing)", () => {
  for (const f of ["page-types.mjs", "jobs.mjs", "next-step.mjs", "notify.mjs", "watchdog.mjs"]) assert.ok(BUILD.includes(`"${f}"`), f);
  const site = readFileSync(join(REPO, "tools", "bundle-site.mjs"), "utf8"); assert.ok(/desktop|site/.test(site));
});

test("item 1: one button; the window waits for the new version and reloads itself; no browser, no Setup, no page of the website", () => {
  assert.ok(UI.includes('<button id="updgo" type="button">Update ready — Restart</button>')); assert.ok(UI.includes("location.reload()")); assert.ok(UI.includes("This window comes back by itself."));
  assert.ok(!/window\.open\([^)]*(download|setup)/i.test(UI));
  assert.match(SETUP, /Has\(args, "\/same-window"\)/); assert.match(SETUP, /KeepPort == null\) CloseOwnWindow/); assert.match(SETUP, /the window stays open on port/);
  assert.match(MAIN, /server\.once\("error", \(e\) => \{ if \(e\.code === "EADDRINUSE"\)/);
});

const WINDOWS_ONLY = cscAvailable() ? false : "Windows only: the Setup is a Windows program; CI runs on Linux (the built app's walk is the proof there)";
test("item 1, for real: the update takes over the running app, brings it back on the SAME port, opens no second window, keeps the data", { skip: WINDOWS_ONLY, timeout: 240000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "rr362-upd-")), D = join(root, "install"), DATA = join(root, "data"); let pids = [];
  const APP = `import { createServer } from "node:http"; import { writeFileSync } from "node:fs"; import { join } from "node:path"; const a = (n) => process.argv.find((x) => x.startsWith(n))?.slice(n.length).replace(/^"|"$/g, ""); const s = createServer((q, r) => { if (q.method === "POST" && q.url === "/api/quit") { r.end("{}"); setTimeout(() => process.exit(0), 100); return; } r.end("ok"); }); s.listen(Number(a("--port=") ?? 0), "127.0.0.1", () => writeFileSync(join(a("--data="), "run.json"), JSON.stringify({ port: s.address().port, pid: process.pid })));`;
  const stage = (dir, v) => { mkdirSync(join(dir, "runtime"), { recursive: true }); mkdirSync(join(dir, "desktop"), { recursive: true }); copyFileSync(process.execPath, join(dir, "runtime", "node.exe")); writeFileSync(join(dir, "desktop", "main.mjs"), APP); writeFileSync(join(dir, "package.json"), '{"type":"module"}'); writeFileSync(join(dir, "version.txt"), v); return dir; };
  const pack = (v) => { const zip = join(root, `p-${v}.zip`); execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${stage(join(root, `s-${v}`), v)}', '${zip}', [IO.Compression.CompressionLevel]::Fastest, $false)`]); return zip; };
  const up = (f, ms = 20000) => new Promise((res) => { const t0 = Date.now(), i = setInterval(() => { const v = f(); if (v || Date.now() - t0 > ms) { clearInterval(i); res(v); } }, 100); });
  const runOf = () => { try { return JSON.parse(readFileSync(join(DATA, "run.json"), "utf8")); } catch { return null; } };
  try {
    mkdirSync(DATA, { recursive: true }); writeFileSync(join(DATA, "company.json"), '{"name":"Kept"}');
    const v = join(root, "v.txt"); writeFileSync(v, "9.9.1"); const setup = compileSetup({ repo: REPO, out: join(root, "Setup.exe"), payloadZip: pack("9.9.1"), versionFile: v });
    assert.equal(spawnSync(setup, ["/S", `/D=${D}`, `/DATA=${DATA}`, "/NOSYSTEM", "/NOLAUNCH"], { timeout: 120000 }).status, 0);
    const app = spawn(join(D, "app", "runtime", "node.exe"), [join(D, "app", "desktop", "main.mjs"), `--data=${DATA}`], { stdio: "ignore" }); pids.push(app.pid);
    assert.ok(await up(() => runOf()?.pid === app.pid), "the app runs"); const port = runOf().port;
    const u = spawnSync(join(D, "AlmiVisibility.exe"), ["/apply-update", pack("9.9.2"), "/same-window", `/DATA=${DATA}`, "/NOSYSTEM"], { encoding: "utf8", timeout: 120000 });
    assert.equal(u.status, 0, u.stderr);
    assert.ok(await up(() => runOf()?.pid && runOf().pid !== app.pid), "a new app runs"); pids.push(runOf().pid);
    assert.equal(runOf().port, port, "the same port: the window that stayed open finds it");
    assert.equal(readFileSync(join(D, "app", "version.txt"), "utf8"), "9.9.2"); assert.equal(readFileSync(join(DATA, "company.json"), "utf8"), '{"name":"Kept"}');
    const log = readFileSync(join(D, "install.log"), "utf8"); assert.match(log, /the window stays open on port/); assert.doesNotMatch(log.slice(log.indexOf("Update: starting")), /asked AlmiVisibility's window to close/);
  } finally { for (const p of pids) { try { process.kill(p); } catch { /* gone */ } } for (let i = 0; i < 20; i++) { try { rmSync(root, { recursive: true, force: true }); break; } catch { await new Promise((r) => setTimeout(r, 500)); } } }
});
