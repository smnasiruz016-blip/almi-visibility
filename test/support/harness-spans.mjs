/**
 * 🔴 RR-248 · READ EVERY SABOTAGE HARNESS'S SPANS WITHOUT RUNNING A SABOTAGE.
 *
 * A harness proves a protection by replacing an exact span of its target file. When the target is rewritten and the span no longer
 * occurs exactly once, the harness can no longer break that protection — and until RR-248 nothing noticed (49 stale spans in 26
 * harnesses by the RR-246 census). test/rr248-span-freshness.test.mjs uses this module to fail CI on the first stale span.
 *
 * A harness cannot be imported (its first import, the RR-247 gate, exits 2 without --deliberate — and must). So each harness's source
 * is evaluated in its own vm context with no module system: its imports are rebound to stand-ins in which every READ is real and
 * every WRITE, every child process, every network module and every timer throws STOP at the first attempt (process.exit is only
 * noted: the first write or spawn after it stops the evaluation anyway). Another harness is never imported: its exports stop too, and
 * the arguments they were called with are kept (the 22 harnesses that hand their limbs to f08-sabotage.mjs runSabotages). A harness
 * declares its limbs before it acts, so the limb table exists when the first STOP ends the evaluation. Nothing is applied or written;
 * the one process this module starts is `git ls-files` (the tracked population). The table is then read from the context: an object limb `{ file, from, … }` (or `from` under an object that names the
 * file), or a tuple `[…, "<repo path>", from, to, …]`. A span is FRESH when it occurs exactly once in its target (both read with LF).
 */
import { readFileSync, existsSync, readdirSync, statSync, lstatSync, realpathSync } from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import * as crypto from "node:crypto";
import * as os from "node:os";
import * as util from "node:util";
import { execFileSync } from "node:child_process"; // `git ls-files` only (harnessFiles) — read only
import vm from "node:vm";

const REPO = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
export const HELPERS = "test/helpers";
const GATE_IMPORT = /^import\s+["'](\.\.?\/)+(test\/helpers\/)?harness-gate\.mjs["']/m;
const STOP = Symbol("STOP");
const PATH_SHAPE = /^(src|bin|tools|config|test|subjects|scripts)\/[\w./-]+\.\w+$/;

class Stopped extends Error { constructor(what) { super(`STOP: ${what}`); this.stop = STOP; } }
const stopper = (what, calls) => (...args) => { calls?.push(args); throw new Stopped(what); };
/* a module stand-in whose every member stops — a write, a process, the network, another harness */
const stopping = (name, calls) => new Proxy({}, { get: (_, k) => (typeof k === "symbol" || k === "then" ? undefined : stopper(`${name}.${k}`, calls)) });

const READS = { readFileSync, existsSync, readdirSync, statSync, lstatSync, realpathSync };
const fsStandIn = new Proxy({}, { get: (_, k) => (k in READS ? READS[k] : typeof k === "symbol" || k === "then" ? undefined : k === "promises" ? stopping("fs.promises") : stopper(`fs.${k}`)) });
const PURE = { "node:path": path, path, "node:url": url, url, "node:crypto": crypto, crypto, "node:os": os, os, "node:util": util, util };

const lf = (s) => s.replace(/\r\n/g, "\n");
export const occurrences = (text, span) => (span ? lf(text).split(lf(span)).length - 1 : 0);

/** every TRACKED sabotage harness under test/helpers (the RR-247 population, *sabotage*.mjs) — git's list, so a local untracked file
 * never changes the verdict (read only: `git ls-files`) */
export function harnessFiles(repo = REPO) {
  return execFileSync("git", ["-C", repo, "ls-files", HELPERS], { encoding: "utf8" }).split(/\r?\n/)
    .filter((f) => /^test\/helpers\/[^/]*sabotage[^/]*\.mjs$/.test(f)).sort();
}

/** the stale spans of a set of results: every span that does not occur exactly once in its target (-1: the target is gone) */
export const staleOf = (results) => results.flatMap((r) => r.spans.filter((s) => s.occurrences !== 1)
  .map((s) => ({ harness: r.file, id: s.id, file: s.file, occurrences: s.occurrences })));

/** what each stand-in does when a harness acts: every write, spawn, network call and timer must STOP (nothing is performed) */
export function probeStandIns() {
  const calls = [];
  const attempt = (what, f) => { try { f(); return { what, stopped: false }; } catch (e) { return { what, stopped: e?.stop === STOP }; } };
  const { ctx } = contextFor("test/helpers/none-sabotage.mjs", {}, REPO);
  return [
    attempt("fs.writeFileSync", () => fsStandIn.writeFileSync("x", "y")),
    attempt("fs.appendFileSync", () => fsStandIn.appendFileSync("x", "y")),
    attempt("fs.mkdirSync", () => fsStandIn.mkdirSync("x")),
    attempt("fs.rmSync", () => fsStandIn.rmSync("x")),
    attempt("fs.promises", () => fsStandIn.promises.writeFile("x", "y")),
    attempt("node:child_process.spawnSync", () => stopping("node:child_process", calls).spawnSync("node")),
    attempt("node:http.request", () => stopping("node:http", calls).request("x")),
    attempt("another harness's export", () => stopping("f08-sabotage.mjs", calls).runSabotages([])),
    attempt("fetch", () => ctx.fetch("x")),
    attempt("setTimeout", () => ctx.setTimeout(() => {}, 1)),
    attempt("process.kill", () => ctx.process.kill(1)),
  ];
}

const isGated = (target) => GATE_IMPORT.test(readFileSync(target, "utf8"));
async function standInFor(spec, fromFile, repo, calls) {
  if (spec === "node:fs" || spec === "fs") return fsStandIn;
  if (spec in PURE) return PURE[spec];
  if (spec.startsWith("node:") || !spec.startsWith(".")) return stopping(spec, calls);
  const target = path.resolve(path.dirname(path.join(repo, fromFile)), spec);
  if (isGated(target)) return stopping(path.basename(target), calls); // another harness is never imported
  return import(url.pathToFileURL(target).href);
}

/* f09 builds its limbs from its subject's declared word, read at run time through three dynamic imports of src/ modules */
export const DYNAMIC_IMPORT = new Set(["test/helpers/f09-sabotage.mjs"]);
/* a harness whose limb file is not in its tuple: rr233 names it by fileOf(limb) — limb[5], else its rules file */
export const ADAPTERS = Object.freeze({
  "test/helpers/rr233-sabotage.mjs": (scope) => scope.SABOTAGES.map((s) => ({ id: s[0], file: scope.fileOf(s), from: s[3], to: s[4] })),
});

const IMPORT_RE =/^import\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}|\*\s+as\s+([\w$]+))?\s*(?:from\s+)?["']([^"']+)["'];?[^\n]*$/gm;
const MASKED_DECL = /\/\*__RR248_\d+__\*\/var (?:([\w$]+)|\{([^}]*)\})/g;

async function prepare(file, repo, calls) {
  const src = readFileSync(path.join(repo, file), "utf8");
  const imports = {};
  const prologue = [];
  /* Every rewrite below may also land inside a string (a probe's source, a span that quotes code), so each is a unique MASK that
   * unmask() turns back into the original text in every span read from the context — a span is compared byte for byte. */
  const masks = [];
  const mask = (original, code) => { const m = `/*__RR248_${masks.length}__*/`; masks.push([m + code, original]); return m + code; };
  const firstCode = src.search(/^(?!import\b|\s*$|\s*\/\/|\s*\/?\*)/m); // the import header ends at the first other line
  const body = src.replace(IMPORT_RE, (line, def, named, ns, spec, at) => {
    if (at > firstCode) return line;
    if (def || named || ns) {
      imports[spec] = null;
      const ref = `__imports[${JSON.stringify(spec)}]`;
      if (def) prologue.push(`var ${def} = (${ref}.default ?? ${ref});`);
      if (ns) prologue.push(`var ${ns} = ${ref};`);
      if (named) prologue.push(`var { ${named.replace(/\bas\b/g, ":")} } = ${ref};`);
    }
    return mask(line, ""); // a side-effect import (the gate) binds nothing
  })
    .replace(/import\.meta/g, () => mask("import.meta", "__META__"))
    .replace(/^export (default )?/gm, (e) => mask(e, ""))
    .replace(/^(\/\*__RR248_\d+__\*\/)?(const|let) /gm, (_, pre, d) => (pre ?? "") + mask(`${d} `, "var "));
  for (const spec of Object.keys(imports)) imports[spec] = await standInFor(spec, file, repo, calls);
  imports.__meta = { url: url.pathToFileURL(path.join(repo, file)).href, dirname: path.dirname(path.join(repo, file)), filename: path.join(repo, file) };
  prologue.push("var __META__ = __imports.__meta;");
  const unmask = (s) => masks.reduceRight((t, [m, original]) => t.split(m).join(original), s);
  let code = `${prologue.join("\n")}\n${body}`;
  let isAsync = false;
  try { new vm.Script(code); }
  catch {
    /* A top-level await (the harness acts, or computes a value its table needs). The body runs as an async function; its top-level
     * names are read through a hoisted __grab(), which sees them at any moment — after a STOP too. */
    const names = new Set();
    for (const m of body.matchAll(MASKED_DECL)) {
      if (m[1]) names.add(m[1]);
      else for (const p of m[2].split(",")) { const n = p.split(":").pop().split("=")[0].trim().replace(/^\.\.\./, ""); if (/^[\w$]+$/.test(n)) names.add(n); }
    }
    const grab = [...names].map((n) => `${JSON.stringify(n)}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ");
    code = `globalThis.__run = (async function () {\nfunction __grab() { return { ${grab} }; }\nglobalThis.__grab = __grab;\n${code}\n})();`;
    isAsync = true;
  }
  return { code, imports, unmask, isAsync };
}

function contextFor(file, imports, repo) {
  const noted = [];
  const proc = {
    argv: [process.execPath, path.join(repo, file)], env: {}, platform: process.platform, execPath: process.execPath, pid: 0,
    cwd: () => repo, exit: (c) => { noted.push(`process.exit(${c})`); }, on: () => proc, once: () => proc, kill: stopper("process.kill"),
    stdout: { write: () => true, isTTY: false }, stderr: { write: () => true, isTTY: false }, exitCode: undefined, hrtime: process.hrtime,
  };
  const quiet = { log() {}, error() {}, warn() {}, info() {}, table() {} };
  const ctx = vm.createContext({ __imports: imports, process: proc, console: quiet, Buffer, URL, TextEncoder, TextDecoder,
    setTimeout: stopper("setTimeout"), setInterval: stopper("setInterval"), setImmediate: stopper("setImmediate"), queueMicrotask: () => {},
    fetch: stopper("fetch") });
  return { ctx, noted };
}

/* the limbs: objects with a string `from`, and tuples whose element i is a repo path followed by from, to */
function spansIn(roots) {
  const out = [];
  const seen = new Set();
  const LIMB_ID = /^[A-Z][A-Z0-9]*[-\d][\w-]*$/; // S1, F9-S2, G05, R1 … — a limb's own id, carried down to its edits
  const walk = (v, file, depth, id) => {
    if (v === null || typeof v !== "object" || depth > 8 || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) {
      const own = typeof v[0] === "string" && LIMB_ID.test(v[0]) ? v[0] : id;
      const i = v.findIndex((x, k) => typeof x === "string" && PATH_SHAPE.test(x) && typeof v[k + 1] === "string" && typeof v[k + 2] === "string"
        && !PATH_SHAPE.test(v[k + 1]) && !PATH_SHAPE.test(v[k + 2])); // a list of paths is not a limb
      if (i >= 0) out.push({ file: v[i], from: v[i + 1], to: v[i + 2], id: own ?? null });
      for (const x of v) walk(x, file, depth + 1, own);
      return;
    }
    if (v instanceof Map || v instanceof Set) { for (const x of v.values()) walk(x, file, depth + 1, id); return; }
    const own = typeof v.file === "string" ? v.file : typeof v.target === "string" && PATH_SHAPE.test(v.target) ? v.target : file;
    const ownId = typeof v.id === "string" ? v.id : id;
    if (typeof v.from === "string" && own) out.push({ file: own, from: v.from, to: typeof v.to === "string" ? v.to : null, id: ownId ?? null });
    for (const k of Object.keys(v)) walk(v[k], own, depth + 1, ownId);
  };
  for (const r of roots) walk(r, null, 0, null);
  return out;
}

/** one harness: its spans and how each occurs in its target today. `ended` says why the evaluation stopped. */
export async function harnessSpans(file, repo = REPO) {
  const calls = [];
  const { code, imports, unmask, isAsync } = await prepare(file, repo, calls);
  const { ctx, noted } = contextFor(file, imports, repo);
  const why = (e) => (e?.stop === STOP ? e.message : `ERROR ${e?.name}: ${String(e?.message).slice(0, 160)}`);
  let ended = "END";
  /* A dynamic import cannot be given a stand-in (that needs --experimental-vm-modules): it loads the REAL module. So it is enabled
   * only for a harness named in DYNAMIC_IMPORT and only when every import(...) its source names is a relative, ungated module — never
   * a node built-in, never another harness. Every other harness has no dynamic import at all. */
  const options = { filename: path.join(repo, file), timeout: 20000 };
  if (DYNAMIC_IMPORT.has(file)) {
    for (const m of readFileSync(path.join(repo, file), "utf8").matchAll(/\bimport\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
      if (!m[1].startsWith(".") || isGated(path.resolve(path.dirname(path.join(repo, file)), m[1]))) {
        return { file, ended: `REFUSED: a dynamic import(${m[1]}) cannot be loaded safely`, spans: [] };
      }
    }
    options.importModuleDynamically = vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER;
  }
  try {
    vm.runInContext(code, ctx, options);
    if (isAsync) await ctx.__run;
  } catch (e) { ended = why(e); }
  const scope = isAsync ? (ctx.__grab?.() ?? {}) : ctx;
  const roots = [...Object.getOwnPropertyNames(scope).filter((k) => !["__imports", "process", "console", "__run", "__grab"].includes(k)).map((k) => scope[k]), calls];
  let found;
  try { found = ADAPTERS[file] ? ADAPTERS[file](scope) : spansIn(roots); }
  catch (e) { return { file, ended: `ADAPTER ${why(e)}`, spans: [] }; }
  const spans = [...new Map(found.map((s) => ({ ...s, from: unmask(s.from), to: s.to === null ? null : unmask(s.to) }))
    .map((s) => [`${s.id}\0${s.file}\0${s.from}`, s])).values()].map((s) => { /* two limbs on one span are two limbs (one is never hidden) */
    const target = path.join(repo, s.file);
    const n = existsSync(target) && statSync(target).isFile() ? occurrences(readFileSync(target, "utf8"), s.from) : -1;
    return { ...s, occurrences: n };
  });
  return { file, ended: noted.length ? `${ended} (after ${noted.join(", ")})` : ended, spans };
}
