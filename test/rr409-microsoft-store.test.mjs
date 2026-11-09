/* RR-409 (owner, 9 Nov 2026) · ALMIVISIBILITY IS LIVE IN THE MICROSOFT STORE (9N1HKDNVTC7D).
 *   A · the site: Microsoft's own badge is the main download on the home hero, the Download page and the Pricing page, linking to the Store
 *       listing; the installer is the small second choice under it, and the blue-window guide sits ONLY beside it; the Store link in the
 *       footer and the install/update guides; SoftwareApplication markup with the Store URL and the real prices — no rating, no reviews.
 *   B · the app: Windows tells the launcher whether it runs as the Store package; a Store install's own updater does NOTHING (no check, no
 *       download, no take-over, no prompt) and says "Updates come from the Microsoft Store."; a direct install works as before; both
 *       installed never write each other's data. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../site/app.mjs";
import { MS_STORE, BADGE, INSTALLER } from "../site/ms-store.mjs";
import { PLANS } from "../site/pages.mjs"; // the list the Pricing page is drawn from
import { STORE_PACKAGE_FAMILY, STORE_LINE, KIND, installKind, selfUpdaterRuns, firstStoreStart, COPIED_MARK, NOT_COPIED } from "../desktop/store-package.mjs";
import { compileSetup, cscAvailable } from "../desktop/installer-compile.mjs";
import { signedBytes } from "../desktop/updater.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (f) => readFileSync(join(REPO, f), "utf8");
const STORE_URL = "https://apps.microsoft.com/detail/9N1HKDNVTC7D";
const SETUP_URL = "https://github.com/x/almivisibility-releases/releases/latest/download/AlmiVisibility-Setup.exe";
const BLUE_GUIDE = "/help/windows-protected-your-pc";

async function site(env = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rr409-site-"));
  const h = createApp({ mode: "sales", env, dataDir: dir, stripeFetch: async () => new Response("{}", { status: 404 }), fetchImpl: async () => new Response("", { status: 404 }), kvFetch: async () => new Response("", { status: 500 }) });
  const srv = createServer(h); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return { base, get: async (p) => { const r = await fetch(base + p, { redirect: "manual" }); return { status: r.status, type: r.headers.get("content-type"), body: Buffer.from(await r.arrayBuffer()) }; }, close: () => { srv.close(); rmSync(dir, { recursive: true, force: true }); } };
}
const BADGE_LINK = new RegExp(`<a class="ms-badge" href="${STORE_URL.replace(/[./]/g, "\\$&")}" rel="noopener" data-store-badge><img src="${BADGE.src.replace(/[./]/g, "\\$&")}" width="201" height="55" alt="Download from the Microsoft Store"></a>`);
/* every link to the blue-window guide on a page, and how many of them sit inside an installer line */
const guideLinks = (html) => ({ all: (html.match(new RegExp(`href="${BLUE_GUIDE}"`, "g")) ?? []).length, nextToInstaller: [...html.matchAll(/<p class="dl-alt" data-installer>([\s\S]*?)<\/p>/g)].filter((m) => m[1].includes(`href="${INSTALLER.href}"`) && m[1].includes(`href="${BLUE_GUIDE}"`)).length });

test("RR-409 A1/A2 · the Store badge links to the Store listing on the home, Download and Pricing pages; the installer is the second choice; the blue-window guide is ONLY next to the installer link", async () => {
  assert.equal(MS_STORE.url, STORE_URL); assert.equal(MS_STORE.id, "9N1HKDNVTC7D"); assert.equal(MS_STORE.deepLink, "ms-windows-store://pdp/?productid=9N1HKDNVTC7D");
  for (const env of [{ VISIBILITY_SETUP_URL: SETUP_URL }, {}]) {
    const s = await site(env);
    try {
      for (const p of ["/", "/download", "/pricing"]) {
        const html = (await s.get(p)).body.toString("utf8");
        assert.match(html, BADGE_LINK, `${p}: Microsoft's badge, linking to the Store listing`);
        const g = guideLinks(html), installer = html.includes(`href="${INSTALLER.href}"`);
        if (env.VISIBILITY_SETUP_URL) {
          assert.ok(installer, `${p}: the installer stays as the second choice`);
          assert.ok(html.indexOf("data-store-badge") < html.indexOf("data-installer"), `${p}: the badge comes first`);
          assert.match(html, /Or download the installer \(\.exe\)/);
          assert.ok(g.all >= 1 && g.all === g.nextToInstaller, `${p}: the blue-window guide away from the installer link (${JSON.stringify(g)})`);
        } else assert.equal(g.all, 0, `${p}: no installer to download, so no blue-window guide`);
        assert.doesNotMatch(html, /not yet code-signed/, `${p}: the unsigned-installer warning outside the installer line`);
        assert.ok(html.includes(`<a href="${STORE_URL}">AlmiVisibility in the Microsoft Store</a>`), `${p}: the Store link in the footer`);
      }
    } finally { s.close(); }
  }
});

test("RR-409 A1 · the badge is Microsoft's own file, unchanged, served by this site (the page's CSP allows images from the site only)", async () => {
  const file = readFileSync(join(REPO, "site", "img", BADGE.file));
  assert.equal(createHash("sha256").update(file).digest("hex"), "0e0cd666d0b351bc2680658faf8485a5d2d78d2ab14086d37fca7f0e8c12fa69", "the badge file was changed");
  assert.doesNotMatch(file.toString("utf8"), /<script|xlink:href|\son[a-z]+=/i);
  const s = await site({});
  try { const r = await s.get(BADGE.src); assert.equal(r.status, 200); assert.equal(r.type, "image/svg+xml"); assert.ok(r.body.equals(file)); } finally { s.close(); }
  /* the deploy bundle carries files read at a literal join(HERE, "img", …) (site/owner-bundle.mjs importClosure) */
  assert.match(read("site/app.mjs"), /readFileSync\(join\(HERE, "img", "ms-store-badge-en-us-dark\.svg"\)\)/);
});

test("RR-409 A3 · the install and update guides carry the Store link; the update guide names the Store's own buttons", async () => {
  const s = await site({ VISIBILITY_SETUP_URL: SETUP_URL });
  try {
    for (const p of ["/help/install", "/help/update"]) { const r = await s.get(p); assert.equal(r.status, 200, p); assert.ok(r.body.toString("utf8").includes(STORE_URL), `${p}: the Store link`); }
    const up = (await s.get("/help/update")).body.toString("utf8");
    assert.match(up, /Updates come from the Microsoft Store\./); assert.match(up, /Get updates/); assert.match(up, /Update ready — Restart/);
  } finally { s.close(); }
});

test("RR-409 A4 · SoftwareApplication on the home: name, Windows, category, the Pricing page's own prices and the Store URL — NO rating and NO review count", async () => {
  const s = await site({ VISIBILITY_SETUP_URL: SETUP_URL });
  try {
    const html = (await s.get("/")).body.toString("utf8");
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const app = blocks.flatMap((b) => b["@graph"] ?? [b]).find((x) => x["@type"] === "SoftwareApplication");
    assert.ok(app, "no SoftwareApplication on the home");
    assert.deepEqual([app.name, app.operatingSystem, app.applicationCategory, app.downloadUrl, app.installUrl], ["AlmiVisibility", "Windows", "BusinessApplication", STORE_URL, STORE_URL]);
    assert.deepEqual(app.offers.map((o) => Number(o.price)).sort((a, b) => a - b), PLANS.map((p) => p.price).sort((a, b) => a - b));
    const pricing = (await s.get("/pricing")).body.toString("utf8");
    for (const o of app.offers) assert.ok(pricing.includes(`$${o.price}<small> / month</small>`), `the price ${o.price} is not on the Pricing page`);
    const keys = []; const walk = (x) => { if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { keys.push(k); walk(v); } }; blocks.forEach(walk);
    assert.deepEqual(keys.filter((k) => /^(aggregateRating|ratingValue|ratingCount|bestRating|worstRating|review|reviews|reviewCount|reviewRating)$/i.test(k)), [], "a rating or review field in the markup");
  } finally { s.close(); }
});

/* the Store's package family name is Partner Center's identity: name + "_" + Windows' publisher id (the first 8 bytes of SHA-256 over the
 * publisher's UTF-16 text, in Crockford base32) — computed here from installer/msix-config.json, so the two can never drift apart */
const publisherId = (publisher) => { const b = createHash("sha256").update(Buffer.from(publisher, "utf16le")).digest().subarray(0, 8); let bits = ""; for (const x of b) bits += x.toString(2).padStart(8, "0"); bits += "0"; const A = "0123456789abcdefghjkmnpqrstvwxyz"; let out = ""; for (let i = 0; i < 65; i += 5) out += A[parseInt(bits.slice(i, i + 5), 2)]; return out; };
test("RR-409 B1 · the package family name the app looks for is the one Partner Center gave, and the one the Store package is built with", () => {
  const c = JSON.parse(read("installer/msix-config.json"));
  assert.equal(`${c.packageIdentityName}_${publisherId(c.publisher)}`, STORE_PACKAGE_FAMILY);
  assert.equal(STORE_PACKAGE_FAMILY, "Almiworld.AlmiVisibility_vx0w0v5schw1e"); assert.equal(MS_STORE.packageFamilyName, STORE_PACKAGE_FAMILY);
  assert.deepEqual([installKind(STORE_PACKAGE_FAMILY), installKind(STORE_PACKAGE_FAMILY.toUpperCase()), installKind("AlmiWorld.AlmiVisibilityTest_abc"), installKind(null), installKind("")], [KIND.store, KIND.store, KIND.package, KIND.direct, KIND.direct]);
  assert.deepEqual([selfUpdaterRuns(KIND.store), selfUpdaterRuns(KIND.package), selfUpdaterRuns(KIND.direct), selfUpdaterRuns(KIND.direct, false)], [false, false, true, false]);
  assert.equal(STORE_LINE, "Updates come from the Microsoft Store.");
});

/* ── the REAL app (desktop/main.mjs), once as the Store package and once as a direct install, against a local update channel that counts
 *    every request and offers a NEWER signed version ── */
async function channel() {
  const kp = generateKeyPairSync("ed25519"), pkg = Buffer.from("a package"), m = { version: "99.0.0", package: "AlmiVisibility-99.0.0.zip", sha256: createHash("sha256").update(pkg).digest("hex") };
  m.signature = sign(null, signedBytes(m), kp.privateKey).toString("base64");
  const hits = []; const srv = createServer((q, r) => { hits.push(q.url); if (q.url.endsWith("/manifest.json")) { r.setHeader("content-type", "application/json"); return r.end(JSON.stringify(m)); } if (q.url.endsWith(".zip")) return r.end(pkg); r.statusCode = 404; r.end(); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${srv.address().port}/updates/`, hits, pub: kp.publicKey.export({ type: "spki", format: "pem" }), close: () => srv.close() };
}
async function app(extra, ch) {
  const dir = mkdtempSync(join(tmpdir(), "rr409-app-")), keys = join(dir, "keys"); mkdirSync(keys);
  writeFileSync(join(keys, "update-public.pem"), ch.pub);
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: keys, licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: ch.url }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`, ...extra], { stdio: "ignore" });
  for (let i = 0; i < 150 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const call = async (u, method = "GET", body) => { const r = await fetch(root + u, method === "GET" ? {} : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }); return { status: r.status, j: await r.json() }; };
  return { call, stop: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}
test("RR-409 B2/B3 · as the Store package the self-updater does not run (no request to the channel, no download, no install, the Store line); as a direct install it does", async () => {
  const ch = await channel();
  try {
    const st = await app([`--package-family=${STORE_PACKAGE_FAMILY}`], ch);
    try {
      const u = await st.call("/api/update");
      assert.deepEqual([u.j.state, u.j.line, u.j.store, u.j.ready, u.j.downloading], ["STORE", "Updates come from the Microsoft Store.", true, false, false]);
      const i = await st.call("/api/update/install", "POST", { agree: true });
      assert.deepEqual([i.status, i.j.refused], [400, "Updates come from the Microsoft Store."]);
      const h = await st.call("/api/home"); assert.deepEqual([h.j.install, h.j.updatesLine], ["store", "Updates come from the Microsoft Store."]);
      await new Promise((r) => setTimeout(r, 300));
      assert.deepEqual(ch.hits, [], "a Store install asked the update channel");
    } finally { st.stop(); }
    const other = await app(["--package-family=AlmiWorld.AlmiVisibilityTest_0123456789abc"], ch);
    try { assert.equal((await other.call("/api/update")).j.state, "STORE"); assert.equal((await other.call("/api/update/install", "POST", { agree: true })).status, 400); assert.deepEqual(ch.hits, [], "a test package asked the channel"); } finally { other.stop(); }
    const di = await app([], ch);
    try {
      const u = await di.call("/api/update");
      assert.deepEqual([u.j.state, u.j.version], ["AVAILABLE", "99.0.0"], JSON.stringify(u.j));
      assert.ok(ch.hits.some((x) => x.endsWith("/manifest.json")), "a direct install never asked the channel");
      const h = await di.call("/api/home"); assert.deepEqual([h.j.install, h.j.updatesLine], ["direct", null]);
    } finally { di.stop(); }
  } finally { ch.close(); }
});

test("RR-409 B5 · BOTH installed: the Store install's first start takes a COPY of the direct install's data, once; later the two never write each other's files", () => {
  const root = mkdtempSync(join(tmpdir(), "rr409-both-")), direct = join(root, "Roaming", "AlmiVisibility"), storeData = join(root, "Packages", STORE_PACKAGE_FAMILY, "LocalState", "AlmiVisibility");
  try {
    mkdirSync(join(direct, "products", "p1"), { recursive: true }); mkdirSync(join(direct, "window"), { recursive: true }); mkdirSync(join(direct, "updates"), { recursive: true }); mkdirSync(join(direct, "crash"), { recursive: true });
    writeFileSync(join(direct, "config.json"), JSON.stringify({ account: "av_fixture" })); writeFileSync(join(direct, "licence.json"), "{}"); writeFileSync(join(direct, "products", "p1", "state.json"), "{\"a\":1}");
    writeFileSync(join(direct, "run.json"), "{\"port\":1}"); writeFileSync(join(direct, "window", "Profile"), "edge"); writeFileSync(join(direct, "updates", "x.zip"), "z"); writeFileSync(join(direct, "crash", "app.log"), "l");
    mkdirSync(storeData, { recursive: true }); writeFileSync(join(storeData, "run.json"), "{}"); /* the launcher made the folder and its run.json may be there */
    const first = firstStoreStart({ data: storeData, from: direct, now: () => "2026-11-09T00:00:00.000Z" });
    assert.deepEqual(first, { copied: true, items: 3 });
    assert.deepEqual(readdirSync(storeData).sort(), [COPIED_MARK, "config.json", "licence.json", "products", "run.json"].sort());
    for (const n of NOT_COPIED) if (n !== "run.json") assert.equal(existsSync(join(storeData, n)), false, `${n} was copied`);
    assert.equal(readFileSync(join(storeData, "config.json"), "utf8"), JSON.stringify({ account: "av_fixture" }), "the licence key did not come along");
    /* the Store install changes its own copy; the direct install's file is untouched, and a later start copies nothing */
    writeFileSync(join(storeData, "products", "p1", "state.json"), "{\"a\":2}");
    assert.equal(readFileSync(join(direct, "products", "p1", "state.json"), "utf8"), "{\"a\":1}");
    assert.deepEqual(firstStoreStart({ data: storeData, from: direct }), { copied: false, why: "already copied once" });
    assert.equal(readFileSync(join(storeData, "products", "p1", "state.json"), "utf8"), "{\"a\":2}", "the Store install's own data was overwritten");
    /* a Store install that already has its own data never takes the direct one */
    const own = join(root, "own"); mkdirSync(own); writeFileSync(join(own, "config.json"), "{\"mine\":1}");
    assert.equal(firstStoreStart({ data: own, from: direct }).copied, false); assert.equal(readFileSync(join(own, "config.json"), "utf8"), "{\"mine\":1}");
    assert.equal(firstStoreStart({ data: join(root, "none"), from: join(root, "missing") }).copied, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ── THE LAUNCHER, for real (Windows only: compiled by the same step as the shipped Setup, installed into this test's own folders with
 *    /D= /DATA= /NOSYSTEM; /PACKAGE= acts as if Windows had named the package). It hands the app --package-family and --copy-from only
 *    as a package; Windows' own answer for this unpackaged test process is "no package". As a package it refuses /apply-update and
 *    /uninstall and changes nothing. ── */
const WINDOWS_ONLY = cscAvailable() ? false : "Windows only — the launcher is a Windows program; CI runs on Linux";
const APP = `import { createServer } from "node:http"; import { writeFileSync } from "node:fs"; import { join } from "node:path";
const data = process.argv.find((a) => a.startsWith("--data=")).slice(7).replace(/^"|"$/g, "");
writeFileSync(join(data, "args.json"), JSON.stringify(process.argv.slice(2)));
const s = createServer((q, r) => { if (q.method === "POST" && q.url === "/api/quit") { r.end("{}"); setTimeout(() => process.exit(0), 100); return; } r.end("ok"); });
s.listen(0, "127.0.0.1", () => writeFileSync(join(data, "run.json"), JSON.stringify({ port: s.address().port, pid: process.pid, version: "stand-in" })));
`;
const ps = (cmd) => execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cmd], { stdio: "pipe" });
function packageZip(root, version) {
  const dir = join(root, `stage-${version}`); mkdirSync(join(dir, "runtime"), { recursive: true }); mkdirSync(join(dir, "desktop"), { recursive: true });
  copyFileSync(process.execPath, join(dir, "runtime", "node.exe")); writeFileSync(join(dir, "desktop", "main.mjs"), APP); writeFileSync(join(dir, "version.txt"), version);
  const zip = join(root, `pkg-${version}.zip`); ps(`Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${dir}', '${zip}', [IO.Compression.CompressionLevel]::Fastest, $false)`); return zip;
}
test("RR-409 B1/B2 · THE LAUNCHER: Windows says 'no package' here → a direct start, as before; as the Store package it passes the family and its own data folder, and refuses to apply an update or uninstall", { skip: WINDOWS_ONLY }, async () => {
  const root = mkdtempSync(join(tmpdir(), "rr409-launcher-")), D = join(root, "install"), DATA = join(root, "data"), pids = [];
  const run = (exe, args) => spawnSync(exe, args, { encoding: "utf8", timeout: 120000 });
  const started = () => { const j = JSON.parse(readFileSync(join(DATA, "run.json"), "utf8")); pids.push(j.pid); return JSON.parse(readFileSync(join(DATA, "args.json"), "utf8")); };
  const quit = async () => { const j = JSON.parse(readFileSync(join(DATA, "run.json"), "utf8")); try { await fetch(`http://127.0.0.1:${j.port}/api/quit`, { method: "POST" }); } catch {} for (let i = 0; i < 50; i++) { try { process.kill(j.pid, 0); await new Promise((r) => setTimeout(r, 100)); } catch { break; } } rmSync(join(DATA, "run.json"), { force: true }); };
  try {
    const v = join(root, "v.txt"); writeFileSync(v, "9.9.1");
    const setup = compileSetup({ repo: REPO, out: join(root, "Setup.exe"), payloadZip: packageZip(root, "9.9.1"), versionFile: v });
    mkdirSync(DATA, { recursive: true });
    assert.equal(run(setup, ["/S", `/D=${D}`, `/DATA=${DATA}`, "/NOSYSTEM", "/NOLAUNCH"]).status, 0);
    const launcher = join(D, "AlmiVisibility.exe");
    /* direct: Windows itself answers (GetCurrentPackageFamilyName) — no package */
    let r = run(launcher, ["/nowindow", `/DATA=${DATA}`]); assert.equal(r.status, 0, r.stderr);
    let a = started(); assert.ok(!a.some((x) => x.startsWith("--package-family") || x.startsWith("--copy-from")), JSON.stringify(a));
    await quit();
    /* the Store package */
    r = run(launcher, ["/nowindow", `/DATA=${DATA}`, `/PACKAGE=${STORE_PACKAGE_FAMILY}`]); assert.equal(r.status, 0, r.stderr);
    a = started(); assert.ok(a.includes(`--package-family=${STORE_PACKAGE_FAMILY}`), JSON.stringify(a)); assert.ok(a.some((x) => /^--copy-from=.+AlmiVisibility$/.test(x)), JSON.stringify(a));
    const appPid = pids.at(-1);
    /* no take-over, no update, no uninstall of a package */
    const pkg = packageZip(root, "9.9.2");
    const u = run(launcher, ["/apply-update", pkg, "/S", `/DATA=${DATA}`, "/NOSYSTEM", `/PACKAGE=${STORE_PACKAGE_FAMILY}`]);
    assert.equal(u.status, 3, `${u.stdout}${u.stderr}`); assert.match(u.stderr, /Updates come from the Microsoft Store\./);
    assert.equal(readFileSync(join(D, "app", "version.txt"), "utf8"), "9.9.1", "the package's folder was updated");
    assert.doesNotThrow(() => process.kill(appPid, 0), "the running Store app was taken over");
    const x = run(launcher, ["/uninstall", "/S", `/DATA=${DATA}`, "/NOSYSTEM", `/PACKAGE=${STORE_PACKAGE_FAMILY}`]);
    assert.equal(x.status, 3); assert.ok(existsSync(launcher), "the package was uninstalled by the app");
    await quit();
    /* positive control: the same update as a direct install IS applied */
    const d = run(launcher, ["/apply-update", pkg, "/S", `/DATA=${DATA}`, "/NOSYSTEM"]);
    assert.equal(d.status, 0, d.stderr); assert.equal(readFileSync(join(D, "app", "version.txt"), "utf8"), "9.9.2");
  } finally {
    for (const p of pids) { try { process.kill(p); } catch {} }
    for (let i = 0; i < 60; i++) { try { rmSync(root, { recursive: true, force: true }); break; } catch { await new Promise((r) => setTimeout(r, 500)); } }
  }
});

test("RR-409 · the source: the launcher asks Windows (GetCurrentPackageFamilyName), keeps a package's data in its own LocalState, and never updates a package; the package carries the new module", () => {
  const cs = read("installer/Setup.cs");
  assert.match(cs, /static extern int GetCurrentPackageFamilyName\(ref int length, System\.Text\.StringBuilder name\)/);
  assert.match(cs, /"Packages", PackageFamily, "LocalState", Name/);
  assert.match(cs, /if \(Has\(args, "\/apply-update"\)\) \{ NotInAPackage\(\); return ApplyUpdate\(args\); \}/);
  assert.match(read("desktop/build.mjs"), /"store-package\.mjs"/);
  assert.match(read("desktop/main.mjs"), /if \(STORE_BUILD\) return true; \/\* RR-409/, "the launcher refresh writes into a package's folder");
});
