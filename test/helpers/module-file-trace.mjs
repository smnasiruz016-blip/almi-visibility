// Preload: record every module URL loaded and every file path read, written to $TRACE_OUT on exit.
import { registerHooks } from "node:module";
import fs from "node:fs";
import fsp from "node:fs/promises";

const seen = { modules: new Set(), files: new Set() };
registerHooks({
  load(url, context, nextLoad) {
    seen.modules.add(url);
    return nextLoad(url, context);
  },
});
const wrap = (obj, name) => {
  const orig = obj[name];
  if (typeof orig !== "function") return;
  obj[name] = function (p, ...rest) {
    try { seen.files.add(String(p instanceof URL ? p.pathname : p)); } catch {}
    return orig.call(this, p, ...rest);
  };
};
for (const n of ["readFileSync", "openSync", "createReadStream", "readFile", "open", "readdirSync", "existsSync", "statSync"]) wrap(fs, n);
for (const n of ["readFile", "open", "readdir"]) wrap(fsp, n);
// Named ESM imports (`import { readFileSync } from "node:fs"`) bind the ORIGINAL unless the builtin exports are re-synced.
(await import("node:module")).syncBuiltinESMExports();
process.on("exit", () => {
  const out = process.env.TRACE_OUT;
  if (!out) return;
  fs.writeFileSync(out, JSON.stringify({ modules: [...seen.modules].sort(), files: [...seen.files].sort() }, null, 1));
});
