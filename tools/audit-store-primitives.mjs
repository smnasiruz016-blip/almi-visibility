/**
 * 🔴 AUDIT_STORE_ONLY_PRIMITIVES — A REGISTRY OF VERIFIED PRIMITIVES, NEVER A NAME ALLOWLIST (owner ruling, 24 Sep 2026).
 *
 *   _handoffs/AlmiVisibility_OWNER_RULING_2026-09-24_AUDIT_STORE_ONLY_PRIMITIVES.md
 *
 * The caller census (tools/governed-caller-census.mjs) classifies a call to one of these functions, handed the audit
 * store itself, as the audit — CHECKED_AUDIT_STORE_EXEMPTION — instead of as a governed write that bypasses the
 * boundary. Until this module existed that set was a hand-written regex of nine names, and NOTHING read the functions
 * behind them: a mixed writer could be registered, or a registered primitive changed to write another target, and the
 * census stayed green (measured on 987cda6 before this change; the evidence record carries the probes).
 *
 * THE RULE NOW. An entry is a { name, module } pair — the module is part of the identity, so a same-named function from
 * anywhere else is not the primitive. An entry is REGISTERED only while `verifyAuditStorePrimitive` proves, from the
 * source, that everything the function can reach writes nothing but the audit store it is HANDED:
 *
 *   · every durable-looking call (`.append…(`, `.write…(`, `.save…(`, …) in the primitive's own module is made on its
 *     OWN PARAMETER's audit store — `store.append(` or `audit.store.append(`, `store`/`audit` being parameters;
 *   · no reachable function — in its module or in any module it calls into — holds a filesystem write, a process spawn,
 *     a dynamic import or eval, or a write-verb call on anything at all (a callee elsewhere writing even to an audit
 *     store would make the primitive a MIXED writer);
 *   · it never calls a function its caller supplies (a callback can do anything — that is not provable, so it is not
 *     proved);
 *   · every call it makes resolves: to a local, a module function, an import that is followed, a read-only builtin or
 *     a language global. An unresolvable call is UNKNOWN, and UNKNOWN fails closed.
 *
 * 🔴 AN ENTRY THAT FAILS IS NOT REGISTERED — immediately, by construction: the census derives its registered set from
 * the verified entries only, so the primitive's call sites fall back to ordinary writer classification (a bypass), and
 * `node tools/governed-caller-census.mjs --check` exits 1 while any declared entry is unverified.
 *
 * WHAT THIS DOES NOT DO. It does not decide where the store a caller hands in lives. That is the census's CALL-SITE
 * rule (the store must be the entry point's own production audit store, constructed with no caller-chosen location),
 * and the store's runtime location check (src/audit-trail/wiring.mjs). The three together are the ruling's eight.
 *
 * Matching is over raw source, comments and strings included. A write-shaped word in a comment can make an entry FAIL
 * (a false refusal, visible and fixable); it can never make one pass. That direction is chosen on purpose.
 */
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/* The declared entries. Declaring is not registering — see `verifiedPrimitives`. `readHeldOutItem` was in the
 * hand-written set until 24 Sep 2026; it reads through a function its caller supplies (`read`), which cannot be proved
 * audit-store-only, and it has no production caller. It lost registration under the ruling and is not declared. */
export const AUDIT_STORE_ONLY_PRIMITIVES = Object.freeze([
  Object.freeze({ name: "recordCandidates", module: "src/audit-trail/recorder.mjs" }),
  Object.freeze({ name: "auditAuthorityMigration", module: "src/audit-trail/callers.mjs" }),
  Object.freeze({ name: "recordGateDecisions", module: "src/heldout/lifecycle.mjs" }),
  Object.freeze({ name: "freezeMechanism", module: "src/heldout/lifecycle.mjs" }),
  Object.freeze({ name: "requestHeldOutAccess", module: "src/heldout/lifecycle.mjs" }),
  Object.freeze({ name: "scoreHeldOutEvaluation", module: "src/heldout/lifecycle.mjs" }),
  Object.freeze({ name: "recordEvidenceStateTransitions", module: "src/evidence/evidence-state.mjs" }),
  Object.freeze({ name: "recordDeclarationDecisions", module: "src/intake/intake.mjs" }),
]);

/* ── The vocabulary the proof reads ─────────────────────────────────────────────────────────────────────────────── */

/** Filesystem writes, sync, async and stream. Broader than the census's FS_WRITE on purpose: this is a proof, not a site finder. */
export const ANY_FS_WRITE = /\b(writeFileSync|appendFileSync|mkdirSync|mkdtempSync|rmSync|rmdirSync|renameSync|unlinkSync|createWriteStream|cpSync|copyFileSync|symlinkSync|linkSync|truncateSync|ftruncateSync|openSync|writeSync|writevSync|chmodSync|chownSync|utimesSync|writeFile|appendFile|mkdtemp|rmdir|copyFile|symlink|truncate)\s*\(/;
/** Any call whose member name says it persists or mutates something outside the process. */
export const WRITE_VERB_CALL = /\.\s*(append\w*|write\w*|save\w*|persist\w*|put\w*|commit\w*|unlink\w*|rename\w*|rm\w*|mkdir\w*|copy\w*|remove\w*|insert\w*|update\w*|upsert\w*|delete\w*|truncate\w*)\s*\(/g;
/** Process, code-loading and escape hatches. Never reachable from a primitive. */
const ESCAPE_HATCH = /\b(execFileSync|execSync|spawnSync|spawn|exec|execFile|fork|eval|require)\s*\(|\bnew\s+Function\s*\(|\bimport\s*\(/;
/** The only receivers a primitive may append through: its own parameter's audit store. */
const AUDIT_RECEIVER = /^(?:(\w+)\.store|(\w+))\s*\.\s*append\s*\($/;

const LANGUAGE_GLOBALS = new Set([
  "String", "Number", "Boolean", "BigInt", "Symbol", "Object", "Array", "Math", "JSON", "Date", "RegExp", "Error", "TypeError",
  "RangeError", "Map", "Set", "WeakMap", "WeakSet", "Promise", "Buffer", "URL", "isNaN", "isFinite", "parseInt", "parseFloat",
  "encodeURIComponent", "decodeURIComponent", "structuredClone",
]);
const KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "function", "return", "typeof", "new", "await", "yield", "void", "delete", "in", "of", "do", "else", "throw", "super", "class", "import", "export"]);
/** Builtin names that only read or compute. Anything else imported from a builtin module is refused when called. */
const READ_ONLY_BUILTINS = new Set([
  "readFileSync", "existsSync", "readdirSync", "statSync", "lstatSync", "realpathSync", "accessSync",
  "createHash", "randomBytes", "randomUUID", "timingSafeEqual",
  "join", "resolve", "dirname", "basename", "extname", "relative", "isAbsolute", "normalize", "sep", "posix", "win32",
  "fileURLToPath", "pathToFileURL", "inspect", "isDeepStrictEqual", "tmpdir", "EOL",
]);

/* ── Parsing, bounded and conservative ──────────────────────────────────────────────────────────────────────────── */

/**
 * The CODE of a module: comments and string contents blanked to spaces (newlines kept, so offsets and lines hold),
 * template `${…}` expressions and regex literals kept as code. A word in prose is not a call.
 * 🔴 FAILS CLOSED: if the scan does not end in plain code (an unterminated string, template, regex or comment) the
 * module is reported UNPARSEABLE and nothing it contains is verified — a mis-scan must never hide code.
 */
export function codeText(src) {
  const t = src.replace(/\r\n/g, "\n");
  let out = "";
  let i = 0;
  const templateDepth = [];
  let lastSignificant = "";
  const blank = (s) => s.replace(/[^\n]/g, " ");
  const regexMayStart = () => lastSignificant === "" || /[(,=:[!&|?{};+\-*%<>~^]$/.test(lastSignificant) || /\b(return|typeof|case|in|of|void|throw)$/.test(lastSignificant);
  while (i < t.length) {
    const c = t[i]; const n = t[i + 1];
    if (c === "/" && n === "/") { const e = t.indexOf("\n", i); const end = e < 0 ? t.length : e; out += blank(t.slice(i, end)); i = end; continue; }
    if (c === "/" && n === "*") { const e = t.indexOf("*/", i + 2); if (e < 0) return { ok: false, text: out }; out += blank(t.slice(i, e + 2)); i = e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      for (; j < t.length && t[j] !== c && t[j] !== "\n"; j += 1) if (t[j] === "\\") j += 1;
      if (t[j] !== c) return { ok: false, text: out };
      out += c + blank(t.slice(i + 1, j)) + c; i = j + 1; lastSignificant = "x"; continue;
    }
    if (c === "`" || (c === "}" && templateDepth.length && templateDepth[templateDepth.length - 1] === 0)) {
      if (c === "}") templateDepth.pop();
      let j = i + 1; let chunk = c;
      for (; j < t.length; j += 1) {
        if (t[j] === "\\") { chunk += "  "; j += 1; continue; }
        if (t[j] === "`") break;
        if (t[j] === "$" && t[j + 1] === "{") break;
        chunk += t[j] === "\n" ? "\n" : " ";
      }
      if (j >= t.length) return { ok: false, text: out };
      if (t[j] === "`") { out += `${chunk}\``; i = j + 1; lastSignificant = "x"; continue; }
      out += `${chunk}\${`; i = j + 2; templateDepth.push(0); lastSignificant = "{"; continue;
    }
    if (c === "/" && regexMayStart()) {
      let j = i + 1; let inClass = false;
      for (; j < t.length && t[j] !== "\n"; j += 1) {
        if (t[j] === "\\") { j += 1; continue; }
        if (t[j] === "[") inClass = true; else if (t[j] === "]") inClass = false;
        else if (t[j] === "/" && !inClass) break;
      }
      if (t[j] !== "/") return { ok: false, text: out };
      let k = j + 1; while (/[a-z]/.test(t[k] ?? "")) k += 1;
      out += t.slice(i, k); i = k; lastSignificant = "x"; continue;
    }
    if (templateDepth.length) {
      if (c === "{") templateDepth[templateDepth.length - 1] += 1;
      else if (c === "}") templateDepth[templateDepth.length - 1] -= 1;
    }
    out += c;
    if (!/\s/.test(c)) lastSignificant = /[\w$]/.test(c) ? (lastSignificant.match(/[\w$]*$/)[0] + c) : c;
    i += 1;
  }
  return { ok: templateDepth.length === 0, text: out };
}

/** From `open` (an index at "(" or "{"), the index just past its balancing close. Strings are skipped. */
function balanced(text, open) {
  const pair = { "(": ")", "{": "}", "[": "]" };
  const stack = [];
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i += 1; i < text.length && text[i] !== c; i += 1) if (text[i] === "\\") i += 1;
      continue;
    }
    if (pair[c]) stack.push(pair[c]);
    else if (c === ")" || c === "}" || c === "]") {
      if (stack.pop() !== c) return -1;
      if (stack.length === 0) return i + 1;
    }
  }
  return -1;
}

/** Split `a, b = 1, { c: d }, ...e` at depth-0 commas. */
export function splitTopLevel(text) {
  const out = []; let depth = 0; let cur = "";
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      for (; j < text.length && text[j] !== c; j += 1) if (text[j] === "\\") j += 1;
      cur += text.slice(i, j + 1); i = j; continue;
    }
    if ("([{".includes(c)) depth += 1;
    if (")]}".includes(c)) depth -= 1;
    if (c === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim() !== "") out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Every identifier a parameter list BINDS: plain, defaulted, destructured (`a: b` binds b), rest. */
function paramNames(list) {
  const names = [];
  for (const part of splitTopLevel(list)) {
    const p = part.replace(/^\.\.\./, "");
    if (/^[{[]/.test(p)) {
      const inner = p.slice(1, balanced(p, 0) - 1);
      names.push(...paramNames(inner));
      continue;
    }
    const colon = p.match(/^[\w$]+\s*:\s*([\s\S]+)$/);
    if (colon) { names.push(...paramNames(colon[1].replace(/=[\s\S]*$/, ""))); continue; }
    const id = p.match(/^([\w$]+)/);
    if (id) names.push(id[1]);
  }
  return names;
}

/** A module, parsed once: its top-level functions (body + parameters), its classes, and its imports. */
function parseModule(file, text) {
  const raw = text.replace(/\r\n/g, "\n");
  const scan = codeText(raw);
  const t = scan.text;
  const defs = new Map();
  const add = (name, at, kind) => {
    const open = t.indexOf(kind === "class" ? "{" : "(", at);
    const paramsEnd = kind === "class" ? open : balanced(t, open);
    if (open < 0 || paramsEnd < 0) return;
    const params = kind === "class" ? [] : paramNames(t.slice(open + 1, paramsEnd - 1));
    const bodyOpen = kind === "arrow" ? paramsEnd : t.indexOf("{", paramsEnd - (kind === "class" ? 1 : 0));
    const arrow = kind === "arrow" ? t.slice(paramsEnd).match(/^\s*=>\s*/) : null;
    let end;
    if (arrow) {
      const start = paramsEnd + arrow[0].length;
      end = /[({[]/.test(t[start]) ? balanced(t, start) : t.indexOf("\n", start);
      if (end > 0 && t[start] !== "{") { const semi = t.indexOf(";", end - 1); end = semi > 0 && semi - end < 400 ? semi + 1 : end; }
    } else end = balanced(t, bodyOpen);
    if (end < 0) end = t.length;
    if (!defs.has(name)) defs.set(name, { name, params, body: t.slice(at, end), kind });
  };
  for (const m of t.matchAll(/^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)\s*\(/gm)) add(m[1], m.index, "function");
  for (const m of t.matchAll(/^(?:export\s+)?class\s+([\w$]+)/gm)) add(m[1], m.index, "class");
  for (const m of t.matchAll(/^(?:export\s+)?const\s+([\w$]+)\s*=\s*(?:async\s+)?(\([^)]*\)|[\w$]+)\s*=>/gm)) {
    if (/^[\w$]+$/.test(m[2])) {
      const at = m.index; const eq = t.indexOf("=", at); const arrowAt = t.indexOf("=>", eq + 1);
      const pseudo = `${t.slice(at, eq + 1)} (${m[2]}) ${t.slice(arrowAt)}`;
      const local = parseModule(file, pseudo.split("\n")[0] + "\n" + t.slice(arrowAt + 2).split("\n").slice(1).join("\n")).defs.get(m[1]);
      if (local && !defs.has(m[1])) defs.set(m[1], { ...local, params: [m[2]], body: t.slice(at, at + (local.body.length)) });
    } else add(m[1], m.index + m[0].indexOf("("), "arrow");
  }
  const imports = new Map(); const namespaces = new Map(); const values = new Set();
  /* Import specifiers are strings, which the code scan blanks: they are read from the raw text, anchored at column 0. */
  for (const m of raw.matchAll(/^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/gm)) {
    const clause = m[1].trim(); const spec = m[2];
    const ns = clause.match(/\*\s+as\s+([\w$]+)/);
    if (ns) namespaces.set(ns[1], spec);
    const named = clause.match(/\{([\s\S]*)\}/);
    if (named) for (const part of splitTopLevel(named[1])) {
      const a = part.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (a) imports.set(a[2] ?? a[1], { exported: a[1], spec });
    }
    const def = clause.match(/^([\w$]+)\s*(?:,|$)/);
    if (def) namespaces.set(def[1], spec);
  }
  for (const m of t.matchAll(/^(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*=/gm)) values.add(m[1]);
  return { file, text: t, parseable: scan.ok, defs, imports, namespaces, values };
}

/** Identifiers bound INSIDE a body: local consts/lets, inner functions, arrow and callback parameters, catch bindings. */
function localBindings(body) {
  const out = new Set();
  for (const m of body.matchAll(/\b(?:const|let|var)\s+([\w$]+)\s*=/g)) out.add(m[1]);
  for (const m of body.matchAll(/\b(?:const|let|var)\s*([{[][^=]*?[}\]])\s*=/g)) for (const n of paramNames(m[1].slice(1, -1))) out.add(n);
  for (const m of body.matchAll(/\bfunction\s+([\w$]+)\s*\(/g)) out.add(m[1]);
  for (const m of body.matchAll(/\(([^()]*)\)\s*=>/g)) for (const n of paramNames(m[1])) out.add(n);
  for (const m of body.matchAll(/(?<![\w$.])([\w$]+)\s*=>/g)) out.add(m[1]);
  for (const m of body.matchAll(/\bcatch\s*\(\s*([\w$]+)\s*\)/g)) out.add(m[1]);
  for (const m of body.matchAll(/\bfor\s*\(\s*(?:const|let|var)\s+([\w$]+)/g)) out.add(m[1]);
  return out;
}

const resolveSpec = (fromFile, spec) => (spec.startsWith(".") ? posix.normalize(posix.join(posix.dirname(fromFile), spec)) : null);

/**
 * 🔴 THE PROOF FOR ONE ENTRY. Pure over `read`: a test hands in stand-in module text and never touches src/.
 * @returns {{ verified: boolean, faults: string[], reached: string[] }}
 */
export function verifyAuditStorePrimitive({ name, module }, { read = (f) => readFileSync(join(REPO, f), "utf8") } = {}) {
  const faults = [];
  const reached = [];
  const parsed = new Map();
  const load = (file) => {
    if (!parsed.has(file)) {
      let text = null;
      try { text = read(file); } catch { text = null; }
      parsed.set(file, text === null ? null : parseModule(file, text));
    }
    return parsed.get(file);
  };

  const home = load(module);
  if (!home) return { verified: false, faults: [`MODULE_UNREADABLE ${module}`], reached };
  const exportedHere = [...home.text.matchAll(new RegExp(`^export\\s+(?:async\\s+)?function\\s+${name}\\s*\\(`, "gm"))].length;
  if (exportedHere !== 1) return { verified: false, faults: [`NOT_EXPORTED_ONCE ${name} is exported ${exportedHere} time(s) as a function by ${module}`], reached };

  const seen = new Set();
  const visit = (mod, fnName, homeModule) => {
    const key = `${mod.file}#${fnName}`;
    if (seen.has(key)) return;
    seen.add(key);
    reached.push(key);
    if (!mod.parseable) { faults.push(`UNPARSEABLE ${mod.file} — its code could not be separated from prose, so nothing in it is verified`); return; }
    const def = mod.defs.get(fnName);
    if (!def) { faults.push(`UNRESOLVED ${key}`); return; }
    const where = `${key}`;
    const { body, params } = def;

    if (ANY_FS_WRITE.test(body)) faults.push(`FS_WRITE in ${where}: ${body.match(ANY_FS_WRITE)[1]}`);
    if (ESCAPE_HATCH.test(body)) faults.push(`ESCAPE_HATCH in ${where}: ${body.match(ESCAPE_HATCH)[0].trim()}`);

    /* Write-verb calls. In the primitive's own module: only on a parameter's audit store. Anywhere else: none. */
    for (const m of body.matchAll(WRITE_VERB_CALL)) {
      const before = body.slice(Math.max(0, m.index - 80), m.index).match(/([\w$]+(?:\s*\??\.\s*[\w$]+)*)\s*$/);
      const receiver = before ? before[1].replace(/\s+/g, "").replace(/\?\./g, ".") : "";
      const call = `${receiver}.${m[1]}(`;
      const audit = call.match(AUDIT_RECEIVER);
      const onOwnParam = audit && m[1] === "append" && params.includes(audit[1] ?? audit[2]);
      if (!(homeModule && onOwnParam)) faults.push(`WRITE_CALL in ${where}: ${call}${homeModule ? " — not the audit store its caller hands in" : " — a callee outside the primitive's module writes"}`);
    }

    /* Calls: every bare call must resolve; member calls on a namespace import must be read-only builtins. */
    const locals = localBindings(body.slice(body.indexOf(")") + 1));
    /* A class's method DEFINITIONS (`constructor(code) {`) are not calls; their bodies are part of the class and are checked. */
    if (def.kind === "class") for (const mm of body.matchAll(/^\s+(?:static\s+)?(?:async\s+)?([\w$]+)\s*\([^)]*\)\s*\{/gm)) locals.add(mm[1]);
    for (const m of body.matchAll(/(?<![\w$.])([\w$]+)\s*\(/g)) {
      const callee = m[1];
      if (callee === fnName && m.index < 80) continue;
      if (KEYWORDS.has(callee) || LANGUAGE_GLOBALS.has(callee)) continue;
      if (params.includes(callee)) { faults.push(`CALLS_CALLER_SUPPLIED_FUNCTION in ${where}: ${callee}(`); continue; }
      if (locals.has(callee)) continue;
      if (mod.defs.has(callee)) { visit(mod, callee, homeModule); continue; }
      const imp = mod.imports.get(callee);
      if (imp) {
        const target = resolveSpec(mod.file, imp.spec);
        if (target === null) {
          if (!READ_ONLY_BUILTINS.has(imp.exported)) faults.push(`BUILTIN_NOT_READ_ONLY in ${where}: ${imp.exported} from ${imp.spec}`);
          continue;
        }
        const next = load(target);
        if (!next) { faults.push(`UNRESOLVED_IMPORT in ${where}: ${callee} from ${imp.spec}`); continue; }
        visit(next, imp.exported, false);
        continue;
      }
      if (mod.values.has(callee)) { faults.push(`CALLS_A_VALUE in ${where}: ${callee}( is bound to a value this proof cannot follow`); continue; }
      faults.push(`UNRESOLVED_CALL in ${where}: ${callee}(`);
    }
    for (const m of body.matchAll(/(?<![\w$.])([\w$]+)\s*\.\s*([\w$]+)\s*\(/g)) {
      const spec = mod.namespaces.get(m[1]);
      if (spec === undefined) continue;
      const target = resolveSpec(mod.file, spec);
      if (target === null) { if (!READ_ONLY_BUILTINS.has(m[2])) faults.push(`BUILTIN_NOT_READ_ONLY in ${where}: ${m[1]}.${m[2]} from ${spec}`); continue; }
      const next = load(target);
      if (!next) { faults.push(`UNRESOLVED_IMPORT in ${where}: ${m[1]}.${m[2]}`); continue; }
      visit(next, m[2], false);
    }
    /* `new X(`: a class of the same module is checked like a function; a global is fine; anything else is unresolved. */
    for (const m of body.matchAll(/\bnew\s+([\w$]+)\s*\(/g)) {
      if (LANGUAGE_GLOBALS.has(m[1])) continue;
      if (mod.defs.has(m[1])) visit(mod, m[1], homeModule);
      else if (mod.imports.has(m[1]) && resolveSpec(mod.file, mod.imports.get(m[1]).spec)) {
        const imp = mod.imports.get(m[1]);
        const next = load(resolveSpec(mod.file, imp.spec));
        if (next) visit(next, imp.exported, false); else faults.push(`UNRESOLVED_IMPORT in ${where}: new ${m[1]}`);
      } else faults.push(`UNRESOLVED_CONSTRUCTOR in ${where}: new ${m[1]}(`);
    }
  };
  visit(home, name, true);
  return { verified: faults.length === 0, faults: [...new Set(faults)], reached };
}

/** Every declared entry, verified. The census registers ONLY the entries whose `verified` is true. */
export function verifyRegistry({ entries = AUDIT_STORE_ONLY_PRIMITIVES, read } = {}) {
  const dup = entries.map((e) => e.name).filter((n, i, a) => a.indexOf(n) !== i);
  return entries.map((e) => ({
    ...e,
    ...(dup.includes(e.name)
      ? { verified: false, faults: [`AMBIGUOUS_NAME ${e.name} is declared more than once`], reached: [] }
      : verifyAuditStorePrimitive(e, read ? { read } : {})),
  }));
}

/** The registered primitives: verified entries only. An unverified entry is simply not here — it lost registration. */
export const verifiedPrimitives = (verification) => verification.filter((v) => v.verified).map(({ name, module }) => ({ name, module }));

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const v = verifyRegistry();
  console.log(`AUDIT_STORE_ONLY_PRIMITIVES — declared ${v.length} · verified ${v.filter((x) => x.verified).length} · unverified ${v.filter((x) => !x.verified).length}`);
  for (const x of v) {
    console.log(`  ${x.verified ? "VERIFIED  " : "🔴 FAILED "} ${x.name} (${x.module}) — reached ${x.reached.length} function(s)`);
    if (process.argv.includes("--reach")) for (const r of x.reached) console.log(`      ${r}`);
    for (const f of x.faults) console.log(`      ${f}`);
  }
  if (process.argv.includes("--check") && v.some((x) => !x.verified)) process.exit(1);
}
