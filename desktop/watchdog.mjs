/**
 * 🔴 RR-362 item 6 ("You can close this window: the work goes on"; found in the proof: the app stopped by itself in 4 of 13 full runs, with a native error and no message, cause not found). A small process
 * started with a long run: if the app is gone while the run is not finished, it starts the app again, without a window; the app then goes on with the run, what it already read kept.
 * It ends when the run ends, or when the app was asked to stop (an update, the client's own quit). It reads and sends nothing else.
 *   node watchdog.mjs <app pid> <run marker file> <stop file> <launcher> [launcher args…]
 */
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
const [pid, marker, stop, launcher, ...args] = process.argv.slice(2), EVERY = 5000, GRACE = 15000;
const alive = () => { try { process.kill(Number(pid), 0); return true; } catch { return false; } }, over = () => !existsSync(marker) || existsSync(stop), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (;;) {
  await sleep(EVERY);
  if (over()) process.exit(0);
  if (alive()) continue;
  await sleep(GRACE); // an update or a Setup may be at work: it writes the stop file first
  if (over()) process.exit(0);
  const c = spawn(launcher, ["/nowindow", ...args], { detached: true, stdio: "ignore", windowsHide: true }); c.on("error", () => {}); c.unref();
  await sleep(1000); process.exit(0);
}
