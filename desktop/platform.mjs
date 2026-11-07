/**
 * 🔴 RR-388 PART C · THE ONE SMALL LAYER BETWEEN THE APP AND ITS OPERATING SYSTEM (Windows today, a Mac next). Windows behaviour is exactly
 * what it was: every Windows answer below is the code that ran before, moved here, unchanged. A Mac answer is added beside it.
 *   · the secure store for the client's keys: Windows' Credential Manager (secrets.mjs windowsBackend) · the macOS Keychain (below);
 *   · where the client's data lives: %APPDATA%\AlmiVisibility · ~/Library/Application Support/AlmiVisibility;
 *   · opening an address in the client's browser: rundll32 url.dll · /usr/bin/open;
 *   · the app's window: Edge in app mode (installer/Setup.cs) · Chrome in app mode, else the default browser (mac-launch.mjs);
 *   · a notice: a Windows toast (notify.mjs) · osascript "display notification";
 *   · the installer and the update: Setup.exe + MSIX, the app updates itself · a DMG (signed + notarised later, MAC_STORE_PLAN.md): the app
 *     says a new version is ready and links to it, it does not replace itself (Apple's rules for a Developer ID app allow it; not built yet).
 * The Keychain secret NEVER appears on a command line: it goes to /usr/bin/security on its standard input ("security -i"), base64-encoded so
 * no character of it is ever read by a shell or a quote; it is read back with -w (the value on standard output only).
 */
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

export const OS = Object.freeze({ win: "win32", mac: "darwin" });
const SERVICE = "AlmiVisibility";
const NAME = /^[A-Z][A-Z0-9_]{2,63}$/;

/** the macOS Keychain (login keychain, a generic password per key: service "AlmiVisibility", account = the key's NAME) */
export function macKeychainBackend({ run = (args, input = null) => spawnSync("/usr/bin/security", args, { input: input ?? undefined, encoding: "utf8", timeout: 20000 }) } = {}) {
  const ok = (r) => r && r.status === 0;
  const check = (name) => { if (!NAME.test(String(name))) throw new Error("not a key name"); };
  return Object.freeze({
    kind: "macOS Keychain",
    set(name, value) { check(name); const b = Buffer.from(String(value), "utf8").toString("base64"); const r = run(["-i"], `add-generic-password -U -s ${SERVICE} -a ${name} -w ${b}\n`); if (!ok(r)) throw new Error("The Mac's Keychain did not keep the key"); },
    get(name) { check(name); const r = run(["find-generic-password", "-s", SERVICE, "-a", name, "-w"]); if (!ok(r)) return null; const out = String(r.stdout ?? "").trim(); return out ? Buffer.from(out, "base64").toString("utf8") : null; },
    remove(name) { check(name); run(["delete-generic-password", "-s", SERVICE, "-a", name]); },
  });
}

/** which secure store this computer has: the Windows one exactly as before; the Keychain on a Mac; none elsewhere (said plainly by keyStore) */
export function secureBackendFor(platform = process.platform, { windows, mac = () => macKeychainBackend() } = {}) {
  if (platform === OS.win) return windows();
  if (platform === OS.mac) return mac();
  return null;
}
/** where the client's data lives (the launcher hands it to main.mjs as --data) */
export function dataDirFor(platform = process.platform, env = process.env, home = homedir()) {
  if (platform === OS.win) return join(env.APPDATA ?? join(home, "AppData", "Roaming"), "AlmiVisibility");
  if (platform === OS.mac) return join(home, "Library", "Application Support", "AlmiVisibility");
  return join(env.XDG_CONFIG_HOME ?? join(home, ".config"), "AlmiVisibility");
}
/** the program and arguments that open one address in the client's own browser when Chrome is not found (no shell reads the address) */
export function openUrlCommand(platform, url) {
  if (platform === OS.win) return { file: "rundll32.exe", args: ["url.dll,FileProtocolHandler", url] };
  if (platform === OS.mac) return { file: "/usr/bin/open", args: [url] };
  return null;
}
/** Chrome's places on each system (the browser opener tries them first) */
export function chromePathsFor(platform = process.platform, env = process.env) {
  if (platform === OS.win) return ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", ...(env.LOCALAPPDATA ? [join(env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")] : [])];
  if (platform === OS.mac) return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  return [];
}
/** the app's own window: on a Mac Chrome in app mode with its own profile in the data folder, else the default browser */
export function windowCommand(platform, url, dataDir, exists = () => false) {
  if (platform === OS.mac) { const chrome = chromePathsFor(OS.mac).find((p) => exists(p)); return chrome ? { file: chrome, args: [`--app=${url}`, `--user-data-dir=${join(dataDir, "window")}`, "--no-first-run", "--window-size=1200,820"] } : { file: "/usr/bin/open", args: [url] }; }
  return null; /* Windows: the launcher (installer/Setup.cs) opens Edge itself, unchanged */
}
/** a short notice on a Mac (the title and line are the app's own words, never a secret) */
export function macNotifyCommand(title, line) {
  const q = (s) => `"${String(s ?? "").replace(/[\\"]/g, " ").slice(0, 200)}"`;
  return { file: "/usr/bin/osascript", args: ["-e", `display notification ${q(line)} with title ${q(title)}`] };
}
/** can the app replace itself with a new version? Windows: yes (Setup.exe /SILENT, as before); a Mac: not yet — it links to the new DMG */
export const selfUpdates = (platform = process.platform) => platform === OS.win;
/** the launcher's file name the app looks for in its install folder */
export const launcherName = (platform = process.platform) => (platform === OS.mac ? "AlmiVisibility.app" : "AlmiVisibility.exe");
