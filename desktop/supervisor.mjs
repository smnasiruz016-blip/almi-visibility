/**
 * 🔴 RR-372 · THE APP'S PARENT. A native crash (the owner's 0xC0000409, 4 Nov 2026) runs no code of ours and leaves no trace: only a parent sees the exit code. The launcher starts this; this starts desktop/main.mjs with the same arguments and keeps what it prints.
 * When the app ends by itself with an error: the crash record is written (desktop/crash-record.mjs), and the app starts again on the same port, so the open window finds it; a run that was going goes on, what it had done kept.
 * It never restarts an app that was asked to stop, and at most RESTARTS times in WINDOW_MS: a crash that repeats must be seen, not hidden. It opens no network connection: the fault it watches for cannot reach it.
 *   node supervisor.mjs --data=<dir> [--install=<program dir>] [--port=0]
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeCrash, LOG_LINES, logLine } from "./crash-record.mjs";

export const RESTARTS = 3, WINDOW_MS = 15 * 60e3, GRACE_MS = 3000;
/** may it start again? `times` = when it did before */
export function mayRestart(times, now = Date.now(), { max = RESTARTS, windowMs = WINDOW_MS } = {}) { return times.filter((t) => now - t < windowMs).length < max; }
/** the same arguments, on the port the app was on: the open window finds it there */
export const withPort = (args, port) => (port ? [...args.filter((a) => !a.startsWith("--port=")), `--port=${port}`] : args);
export const ENDED_WELL = (code, signal) => code === 0 && !signal;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const HERE = dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2), DATA = args.find((a) => a.startsWith("--data="))?.slice(7);
  if (!DATA) { console.error("usage: node supervisor.mjs --data=<dir>"); process.exit(1); }
  const STOP = join(DATA, "app-asked-to-stop"), runPort = () => { try { return JSON.parse(readFileSync(join(DATA, "run.json"), "utf8")).port ?? null; } catch { return null; } }, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), times = [];
  const start = (a) => new Promise((resolve) => { const lines = [], keep = (d) => { for (const l of String(d).split(/\r?\n/)) if (l) { lines.push(l); if (lines.length > LOG_LINES) lines.shift(); } }, c = spawn(process.execPath, [join(HERE, "main.mjs"), ...a], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, env: { ...process.env, ALMIVISIBILITY_SUPERVISED: "1" } }); c.stdout.on("data", keep); c.stderr.on("data", keep); c.on("error", (e) => { lines.push(`could not start: ${e.message}`); resolve({ code: null, signal: null, lines }); }); c.on("exit", (code, signal) => resolve({ code, signal, lines })); });
  let a = args;
  for (;;) {
    const { code, signal, lines } = await start(a); if (ENDED_WELL(code, signal)) process.exit(0);
    /* an update or a Setup stops every process of the app: it may reach this one in a moment */
    const port = runPort(); await sleep(GRACE_MS); if (existsSync(STOP)) process.exit(0);
    const again = mayRestart(times); writeCrash(DATA, { code, signal, lines, restarted: again }); if (!again) process.exit(1);
    times.push(Date.now()); logLine(DATA, `started again after ${code ?? signal}`); a = withPort(args, port);
  }
}
