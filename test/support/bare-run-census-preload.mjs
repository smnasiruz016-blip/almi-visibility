/**
 * 🔴 RR-247 · THE BARE-RUN CENSUS PRELOAD — run a file exactly as a bare `node --test` would (no arguments), but let NOTHING happen.
 *
 *   node --import ./test/support/bare-run-census-preload.mjs <file>
 *
 * Every filesystem write, every child process and every network attempt is refused and logged on stderr as
 * `CENSUS would-<what> <target>`. Reads proceed, and so does read-only git (a harness may count its spans). A file that prints no
 * such line neither writes nor spawns when it is run bare. Used by test/rr247-harness-gate.test.mjs (HG-2, HG-3). Run on its own,
 * this file only patches its own process and exits.
 */
import { createRequire, syncBuiltinESMExports } from "node:module";
import { relative, resolve, isAbsolute } from "node:path";

const require = createRequire(import.meta.url);
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const cp = require("node:child_process");
const net = require("node:net");
const http = require("node:http");
const https = require("node:https");

/* a filesystem target is logged relative to the working directory when it lies inside it (else as given), so a reader can tell a
 * write into the repository from a write into the confined test store (.test-scratch/audit/run-…) */
const where = (t) => {
  const s = String(t ?? "");
  try { const r = relative(process.cwd(), resolve(s)).replace(/\\/g, "/"); return r.startsWith("..") || isAbsolute(r) ? s.replace(/\\/g, "/") : r; } catch { return s; }
};
const note = (what, target, isPath = true) => {
  try { process.stderr.write(`CENSUS would-${what} ${isPath ? where(target) : String(target ?? "")}\n`); } catch { /* the census never throws for its own note */ }
};
const readOnly = (flags) => flags === undefined || flags === "r" || flags === 0;

for (const n of ["writeFileSync", "appendFileSync", "mkdirSync", "rmSync", "rmdirSync", "renameSync", "unlinkSync", "copyFileSync", "cpSync", "truncateSync", "symlinkSync", "linkSync", "utimesSync", "chmodSync"]) {
  if (typeof fs[n] === "function") fs[n] = (p) => { note(n, p); return undefined; };
}
fs.mkdtempSync = (p) => { note("mkdtempSync", p); throw new Error("CENSUS: mkdtemp refused"); };
for (const n of ["writeFile", "appendFile", "mkdir", "rm", "rmdir", "rename", "unlink", "copyFile", "cp", "mkdtemp", "truncate"]) {
  if (typeof fs[n] === "function") fs[n] = (p, ...rest) => { note(n, p); const cb = rest.find((x) => typeof x === "function"); if (cb) cb(null); };
  if (typeof fsp[n] === "function") fsp[n] = async (p) => { note(`promises.${n}`, p); };
}
fs.createWriteStream = (p) => { note("createWriteStream", p); throw new Error("CENSUS: write stream refused"); };
const realOpenSync = fs.openSync, realOpen = fs.open, realOpenP = fsp.open;
fs.openSync = (p, flags, ...rest) => { if (readOnly(flags)) return realOpenSync(p, flags, ...rest); note(`openSync:${flags}`, p); throw new Error(`CENSUS: open ${flags} refused`); };
fs.open = (p, flags, ...rest) => { if (readOnly(typeof flags === "function" ? undefined : flags)) return realOpen(p, flags, ...rest); note(`open:${flags}`, p); throw new Error(`CENSUS: open ${flags} refused`); };
fsp.open = async (p, flags, ...rest) => { if (readOnly(flags)) return realOpenP(p, flags, ...rest); note(`promises.open:${flags}`, p); throw new Error(`CENSUS: open ${flags} refused`); };

const READ_GIT = new Set(["ls-files", "show", "rev-parse", "log", "diff", "cat-file", "ls-tree", "status"]);
const realExecFileSync = cp.execFileSync;
const gitRead = (cmd, a) => /^git(\.exe)?$/i.test(String(cmd)) && READ_GIT.has(a[a.indexOf("-C") >= 0 ? a.indexOf("-C") + 2 : 0]);
cp.execFileSync = (cmd, args = [], opts) => {
  const a = Array.isArray(args) ? args : [];
  if (gitRead(cmd, a)) return realExecFileSync(cmd, args, opts);
  note("execFileSync", `${cmd} ${a.slice(0, 3).join(" ")}`, false);
  throw Object.assign(new Error("CENSUS: process not run"), { stdout: "", stderr: "CENSUS", status: 1 });
};
cp.spawnSync = (cmd, args = []) => { note("spawnSync", `${cmd} ${(Array.isArray(args) ? args : []).slice(0, 3).join(" ")}`, false); return { status: 1, signal: null, stdout: "", stderr: "CENSUS: process not run", output: [null, "", ""], error: undefined }; };
for (const n of ["execSync", "spawn", "exec", "execFile", "fork"]) cp[n] = (cmd) => { note(n, cmd, false); throw new Error(`CENSUS: ${n} not run`); };

net.connect = net.createConnection = (...a) => { note("net.connect", JSON.stringify(a[0] ?? null).slice(0, 60), false); throw new Error("CENSUS: network refused"); };
for (const m of [http, https]) for (const n of ["request", "get"]) m[n] = (u) => { note(`http.${n}`, String(u?.href ?? u?.host ?? u).slice(0, 60), false); throw new Error("CENSUS: network refused"); };
globalThis.fetch = async (u) => { note("fetch", String(u).slice(0, 60), false); throw new Error("CENSUS: network refused"); };

syncBuiltinESMExports();
