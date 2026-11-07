/**
 * 🔴 RR-388 PART C · THE MAC LAUNCHER (what installer/Setup.cs's launcher does on Windows): starts the app (main.mjs) with the client's data
 * folder (~/Library/Application Support/AlmiVisibility), waits for its run.json, and opens the window (Chrome in app mode, else the default
 * browser). An app already running is reused: its window is opened again, nothing is started twice.
 *   node desktop/mac-launch.mjs [--data=<dir>] [--nowindow]      (inside AlmiVisibility.app: Contents/MacOS/AlmiVisibility runs this)
 * UNSIGNED until the Apple account is approved (MAC_STORE_PLAN.md). Windows never runs this file.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDirFor, windowCommand } from "./platform.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const DATA = arg("data", dataDirFor(process.platform)), NOWINDOW = process.argv.includes("--nowindow");
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const runOf = () => { try { return JSON.parse(readFileSync(join(DATA, "run.json"), "utf8")); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch() {
  mkdirSync(DATA, { recursive: true });
  let run = runOf();
  if (!run || !alive(run.pid)) {
    const before = run?.pid ?? null;
    const log = openSync(join(DATA, "mac-launch.log"), "a"), c = spawn(process.execPath, [join(HERE, "main.mjs"), `--data=${DATA}`, `--install=${join(HERE, "..", "..")}`], { detached: true, stdio: ["ignore", log, log] }); /* what the app says on start, kept (no secret is ever printed by it) */ c.on("error", () => {}); c.unref();
    for (let i = 0; i < 120; i++) { await sleep(250); run = runOf(); if (run && run.pid !== before && alive(run.pid)) break; }
  }
  if (!run || !alive(run.pid)) { console.error("AlmiVisibility did not start (no run.json)."); return { ok: false }; }
  const url = `http://127.0.0.1:${run.port}/`;
  console.log(`AlmiVisibility ${run.version} on ${url} (pid ${run.pid})`);
  if (!NOWINDOW) { const w = windowCommand(process.platform, url, DATA, existsSync); if (w) { const c = spawn(w.file, w.args, { detached: true, stdio: "ignore" }); c.on("error", () => {}); c.unref(); } }
  return { ok: true, url, pid: run.pid };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) launch().then((r) => process.exit(r.ok ? 0 : 1));
