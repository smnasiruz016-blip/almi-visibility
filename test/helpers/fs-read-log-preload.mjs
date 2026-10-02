/**
 * TEST USE ONLY (node --import). Records every path the process reads or lists through node:fs, so a test can prove a code path never
 * touched a directory it must not open (F22 C5: the sealed exam directory). The log is written to FS_READ_LOG on exit.
 */
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

const LOG = process.env.FS_READ_LOG ?? null;
const seen = new Set();
for (const name of ["readFileSync", "readdirSync", "existsSync", "statSync", "openSync", "readFile", "readdir", "createReadStream", "opendirSync"]) {
  const orig = fs[name];
  if (typeof orig !== "function") continue;
  fs[name] = function (p, ...rest) { if (typeof p === "string" || p instanceof URL) seen.add(String(p)); return orig.call(this, p, ...rest); };
}
for (const name of ["readFile", "readdir", "stat", "open"]) {
  const orig = fs.promises[name];
  fs.promises[name] = function (p, ...rest) { if (typeof p === "string" || p instanceof URL) seen.add(String(p)); return orig.call(this, p, ...rest); };
}
syncBuiltinESMExports();
process.on("exit", () => { if (LOG) fs.writeFileSync(LOG, JSON.stringify([...seen])); });
