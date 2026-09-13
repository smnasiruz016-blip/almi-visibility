/**
 * 🔴 ITEM 53 — A PRELOAD THAT RECORDS WHAT A RUN LOADS AND READS.
 *
 *   node --import <this file's URL> bin/facts.mjs census --product=<id>
 *
 * Every module the run resolves, and every path it touches through the common
 * synchronous fs calls, is written to STDERR as one line:
 *
 *   [probe:module] <url>
 *   [probe:fs:<call>] <path>
 *
 * It writes no file. A test reads the lines and asserts the run touched nothing
 * of another product. ⚠️ It sees the sync fs calls named below and module
 * resolution; an fs.promises read or a native addon would be invisible to it.
 */
import { registerHooks, syncBuiltinESMExports } from "node:module";
import fs from "node:fs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    process.stderr.write(`[probe:module] ${result.url}\n`);
    return result;
  },
});

for (const name of ["readFileSync", "readdirSync", "existsSync", "statSync", "openSync"]) {
  const original = fs[name];
  fs[name] = function probed(path, ...rest) {
    process.stderr.write(`[probe:fs:${name}] ${String(path)}\n`);
    return original.call(this, path, ...rest);
  };
}
syncBuiltinESMExports();
