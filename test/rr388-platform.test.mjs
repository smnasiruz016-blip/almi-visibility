/**
 * RR-388 PART C · one small layer between the app and its operating system. Windows answers are exactly what they were; a Mac answer beside
 * each. The Keychain secret never appears on a command line.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, readdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { macKeychainBackend, secureBackendFor, dataDirFor, openUrlCommand, chromePathsFor, windowCommand, macNotifyCommand, selfUpdates, launcherName } from "../desktop/platform.mjs";
import { browserOpener, CHROME_PATHS } from "../desktop/open-browser.mjs";
import { windowsToast } from "../desktop/notify.mjs";
import { infoPlist, buildMacApp } from "../tools/build-mac-app.mjs";

test("WINDOWS UNCHANGED: the same store, data folder, browser call, Chrome list, toast, self-update and launcher", () => {
  let made = 0; const win = secureBackendFor("win32", { windows: () => { made++; return { kind: "Windows Credential Manager" }; }, mac: () => assert.fail("never on Windows") });
  assert.equal(win.kind, "Windows Credential Manager"); assert.equal(made, 1);
  assert.equal(dataDirFor("win32", { APPDATA: "C:\\Users\\x\\AppData\\Roaming" }), join("C:\\Users\\x\\AppData\\Roaming", "AlmiVisibility"));
  assert.deepEqual(openUrlCommand("win32", "https://accounts.google.com/x"), { file: "rundll32.exe", args: ["url.dll,FileProtocolHandler", "https://accounts.google.com/x"] });
  assert.deepEqual(chromePathsFor("win32", { LOCALAPPDATA: "L" }).slice(0, 2), CHROME_PATHS.slice(0, 2));
  assert.equal(selfUpdates("win32"), true); assert.equal(launcherName("win32"), "AlmiVisibility.exe"); assert.equal(windowCommand("win32", "u", "d"), null, "Setup.cs opens Edge itself, unchanged");
  const calls = []; const open = browserOpener({ chromePaths: [], exists: () => false, platform: "win32", spawnImpl: (f, a) => { calls.push([f, a]); return { on() {}, unref() {} }; } });
  assert.equal(open("https://accounts.google.com/o"), true); assert.deepEqual(calls[0], ["rundll32.exe", ["url.dll,FileProtocolHandler", "https://accounts.google.com/o"]]);
  const t = []; windowsToast({ title: "T", line: "L", platform: "win32", spawnImpl: (f) => { t.push(f); return { on() {}, unref() {} }; } }); assert.deepEqual(t, ["powershell.exe"]);
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"); assert.match(main, /secureBackendFor\(process\.platform, \{ windows: \(\) => windowsBackend\(\) \}\)/);
  const build = readFileSync(new URL("../desktop/build.mjs", import.meta.url), "utf8"); assert.match(build, /"platform\.mjs"/, "the Windows package carries the layer (a missing module would stop the app)");
});

test("MAC: the Keychain — the secret goes on STANDARD INPUT, base64, never on a command line; read back with -w", () => {
  const seen = [], kc = new Map();
  const run = (args, input = null) => { seen.push({ args, input }); if (args[0] === "-i") { const m = /-a (\S+) -w (\S+)/.exec(input); kc.set(m[1], m[2]); return { status: 0, stdout: "" }; } if (args[0] === "find-generic-password") { const v = kc.get(args[4]); return v ? { status: 0, stdout: `${v}\n` } : { status: 44, stdout: "" }; } if (args[0] === "delete-generic-password") { kc.delete(args[4]); return { status: 0 }; } return { status: 1 }; };
  const b = macKeychainBackend({ run }), secret = "sk-ant-'\"$(rm -rf ~) ;|`x`";
  b.set("ANTHROPIC_API_KEY", secret); assert.equal(b.get("ANTHROPIC_API_KEY"), secret);
  for (const s of seen) assert.ok(!s.args.join(" ").includes(secret) && !s.args.join(" ").includes(Buffer.from(secret).toString("base64")), "never in the arguments");
  assert.ok(!seen[0].input.includes(secret), "even on stdin only as base64");
  b.remove("ANTHROPIC_API_KEY"); assert.equal(b.get("ANTHROPIC_API_KEY"), null);
  assert.throws(() => b.set("bad name; rm", "x"), /not a key name/);
  assert.equal(secureBackendFor("darwin", { windows: () => assert.fail("never on a Mac"), mac: () => ({ kind: "macOS Keychain" }) }).kind, "macOS Keychain");
  assert.equal(secureBackendFor("linux", { windows: () => assert.fail("x") }), null);
});

test("MAC: data folder, browser, window, notice, update — each its Mac answer", () => {
  assert.equal(dataDirFor("darwin", {}, "/Users/a"), join("/Users/a", "Library", "Application Support", "AlmiVisibility"));
  assert.deepEqual(openUrlCommand("darwin", "https://x"), { file: "/usr/bin/open", args: ["https://x"] });
  assert.deepEqual(windowCommand("darwin", "http://127.0.0.1:5/", "/d", () => false), { file: "/usr/bin/open", args: ["http://127.0.0.1:5/"] });
  assert.match(windowCommand("darwin", "http://127.0.0.1:5/", "/d", () => true).args[0], /^--app=http:\/\/127\.0\.0\.1:5\/$/);
  assert.deepEqual(macNotifyCommand('A "q"', "line").args.slice(0, 1), ["-e"]); assert.ok(!macNotifyCommand('x"; do shell script "rm"', "y").args[1].includes('"; do'), "a quote cannot end the string");
  assert.equal(selfUpdates("darwin"), false); assert.equal(launcherName("darwin"), "AlmiVisibility.app");
  const calls = []; const open = browserOpener({ exists: () => false, platform: "darwin", spawnImpl: (f, a) => { calls.push([f, a]); return { on() {}, unref() {} }; } });
  assert.equal(open("https://accounts.google.com/o"), true); assert.deepEqual(calls[0], ["/usr/bin/open", ["https://accounts.google.com/o"]]);
});

test("MAC: the unsigned CI app — Info.plist, the launcher script, the files; the workflow proves it starts and never signs or deploys", () => {
  assert.match(infoPlist("1.2.3"), /<key>CFBundleIdentifier<\/key><string>com\.almiworld\.almivisibility<\/string>/);
  const out = mkdtempSync(join(tmpdir(), "macapp-")); rmSync(out, { recursive: true });
  try {
    const app = buildMacApp({ version: "1.2.3", node: process.execPath, out });
    for (const p of ["Contents/Info.plist", "Contents/MacOS/AlmiVisibility", "Contents/Resources/runtime/node", "Contents/Resources/app/desktop/mac-launch.mjs", "Contents/Resources/app/desktop/main.mjs", "Contents/Resources/app/desktop/platform.mjs"]) assert.ok(existsSync(join(app, p)), p);
    assert.throws(() => buildMacApp({ version: "1.2.3", node: process.execPath, out }), /not empty/);
  } finally { rmSync(out, { recursive: true, force: true }); }
  const wf = readFileSync(new URL("../.github/workflows/mac.yml", import.meta.url), "utf8");
  assert.match(wf, /runs-on: macos-latest/); assert.match(wf, /test "\$CODE" = "200"/); assert.match(wf, /kill "\$PID"/);
  assert.doesNotMatch(wf, /codesign|notarytool|vercel|deploy:|contents: write/i);
});
