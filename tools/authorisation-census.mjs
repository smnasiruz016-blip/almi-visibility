#!/usr/bin/env node
/**
 * 🔴 F04 · THE AUTHORISATION CENSUS — every production entry point, every governed action it performs, and the route by
 * which the ONE decision (src/governance/authorisation.mjs) is reached before it acts (25 September 2026).
 *
 *   node tools/authorisation-census.mjs [--check] [--json]
 *
 * READ-ONLY. It writes nothing. Its population is the git-tracked entry points (src/entry-points.mjs) — never files that
 * happen to be on this disk — classified by the governed-caller census (tools/governed-caller-census.mjs), whose
 * comparator it REUSES rather than re-deriving who writes.
 *
 * ── THE ROUTE OF EVERY ENTRY POINT, DECLARED BEFORE ANY IS READ ──────────────
 *   AT_BOUNDARY      it writes through executeGovernedWrite, which authorises before it inspects or mutates.
 *   DIRECT           it writes the audit store itself (the checked exemption) and calls authorise( in its own source.
 *   AT_SCOPED_ENTRY  it reads tenant data through scopedEntryPoint, which authorises after F02 and before any read.
 *   READ_ONLY        it neither writes nor reads through a scoped entry (F02's census owns what it may read).
 *   🔴 UNAUTHORISED  it writes and reaches no decision — A DEFECT.
 *
 * ── THE ACTIONS, RESOLVED — NEVER GUESSED ────────────────────────────────────
 * At each governed call site (the boundary or one of its governed-run helpers, under ANY imported alias) the action is
 * resolved from the call's own arguments: a literal, a template whose prefix is a declared pattern, or — for a variable —
 * the literal names the same file hands it (an action: "X" field or an array whose last element is the name). Every name
 * must resolve in the registry (config/governance/authorisation.mjs). An unregistered name is UNKNOWN_ACTION and a site
 * whose action cannot be resolved at all is UNKNOWN_SITE — both DEFECTS (§8). A library module under src/ that passes its
 * caller's action through is LIBRARY_PASSTHROUGH: its callers are counted where they name the action.
 *
 * Every declared pattern must REFUSE a control name — a pattern that matches anything cannot fail, and is a defect.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { census as callerCensus } from "./governed-caller-census.mjs";
import { ACTIONS, ACTION_PATTERNS } from "../config/governance/authorisation.mjs";
import { actionEntry } from "../src/governance/authorisation.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** The boundary and the governed-run helpers that build a call to it. */
export const GOVERNED_CALLEES = Object.freeze(["executeGovernedWrite", "governedFileWrite", "governedStoreAppend", "governedDirectoryReplace", "governedRecordAppend", "declarationWrite"]);
const NAME = "[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+";
const CONTROL_NAME = "ZZ_F04_CONTROL_NAME_NO_PATTERN_MAY_MATCH";
/** The verbs the registry's own action names begin with — derived, never listed by hand. */
export const ACTION_VERBS = new Set(Object.keys(ACTIONS).map((a) => a.split("_")[0]));

/** Every local name a governed callee is reachable by in this text — its own name and any `import { x as y }` alias. */
export function governedNamesIn(text) {
  const names = new Set(GOVERNED_CALLEES);
  for (const m of text.matchAll(/import\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const a = part.trim().match(/^(\w+)\s+as\s+(\w+)$/);
      if (a && GOVERNED_CALLEES.includes(a[1])) names.add(a[2]);
    }
  }
  return [...names];
}

/** A relative import's text, resolved from the importing file; empty when it is not in this tree (or a control's sources). */
let IMPORT_SOURCES = null;
function readImport(fromFile, spec) {
  const target = join(fromFile, "..", spec).replace(/\\/g, "/");
  if (IMPORT_SOURCES) return IMPORT_SOURCES[target] ?? "";
  try { return readFileSync(join(REPO, target), "utf8"); } catch { return ""; }
}

/**
 * The governed call sites of one file and the action names each resolves to.
 * @returns {{ sites: {line:number, form:string, names:string[]}[] }}
 */
export function actionSitesOf(text, { file = "bin/_.mjs" } = {}) {
  /* Comments are blanked (same length, newlines kept) so a name in prose is never a site and line numbers still hold. */
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
  const names = governedNamesIn(code);
  const callee = new RegExp(`\\b(${names.join("|")})\\(`, "g");
  /* The names a variable can carry: an action: "X" field, an array's last element, or a call's last positional argument —
   * in this file, or (when this file names none) the action: "X" fields of the local modules it imports, where a caller's
   * names are built. A positional or array literal counts only when it begins with an ACTION VERB — the first word of a
   * declared action, DERIVED from the registry (ACTION_VERBS) — so a resource kind or a reason code is not a candidate,
   * while an undeclared name with a declared verb (WRITE_SOMETHING_NEW) is, and is then UNKNOWN_ACTION. */
  const verb = (n) => ACTION_VERBS.has(n.split("_")[0]);
  const literalsOf = (src, { fieldsOnly = false } = {}) => new Set([
    /* An imported module's action: fields include its AUDIT EVENT actions too, so those need the verb as well. */
    ...[...src.matchAll(new RegExp(`action:\\s*"(${NAME})"`, "g"))].map((m) => m[1]).filter((n) => !fieldsOnly || verb(n)),
    ...(fieldsOnly ? [] : [...src.matchAll(new RegExp(`,\\s*"(${NAME})"\\s*[\\])]`, "g"))].map((m) => m[1]).filter(verb)),
    /* an assignment to the variable the call passes (`action = "X"`) — read as a name only with a declared verb */
    ...(fieldsOnly ? [] : [...src.matchAll(new RegExp(`\\baction\\s*=\\s*"(${NAME})"`, "g"))].map((m) => m[1]).filter(verb)),
  ]);
  const own = literalsOf(code);
  const imported = new Set(own.size ? [] : [...code.matchAll(/from\s+"(\.\.?\/[^"]+\.mjs)"/g)].flatMap((m) => [...literalsOf(readImport(file, m[1]), { fieldsOnly: true })]));
  const fileLiterals = own.size ? own : imported;
  /* The exact extent of the call that opens at `open` — bracket-balanced, strings skipped. */
  const extent = (open) => {
    let depth = 0, quote = null;
    for (let i = open; i < code.length; i += 1) {
      const c = code[i];
      if (quote) { if (c === "\\") i += 1; else if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "(" || c === "{" || c === "[") depth += 1;
      else if (c === ")" || c === "}" || c === "]") { depth -= 1; if (depth === 0) return code.slice(open, i + 1); }
    }
    return code.slice(open);
  };
  const sites = [];
  for (const m of code.matchAll(callee)) {
    const before = code.slice(code.lastIndexOf("\n", m.index) + 1, m.index);
    if (/\bfunction\s*$/.test(before) || /\bimport\b/.test(before)) continue;
    const call = extent(m.index + m[0].length - 1);
    /* An outer call whose FIRST argument is another governed call: the inner call is the site. */
    if (new RegExp(`^\\(\\s*(${names.join("|")})\\(`).test(call)) continue;
    const literal = [...call.matchAll(new RegExp(`(?:action|name):\\s*"(${NAME})"`, "g"))].map((x) => x[1]);
    const template = [...call.matchAll(/action:\s*`([A-Z][A-Z0-9_]*_)\$\{/g)].map((x) => `${x[1]}X`);
    const variable = /action:\s*(\{\s*name:\s*)?[a-z_$][\w$.]*\s*[,}\n]/.test(call);
    const shorthand = /[{,]\s*action\s*[,}]/.test(call);
    let form, resolved;
    if (literal.length) { form = "LITERAL"; resolved = [...new Set(literal)]; }
    else if (template.length) { form = "TEMPLATE"; resolved = template; }
    else if ((variable || shorthand) && file.startsWith("src/")) { form = "LIBRARY_PASSTHROUGH"; resolved = []; }
    else if ((variable || shorthand) && fileLiterals.size) { form = own.size ? "VARIABLE" : "VARIABLE_FROM_IMPORT"; resolved = [...fileLiterals]; }
    /* executeGovernedWrite(x) with no action of its own: x was built at a governed helper site of this file (counted there). */
    else if (m[1] === "executeGovernedWrite" && !/\baction\b/.test(call)) { form = "OUTER_CALL"; resolved = []; }
    else { form = "UNRESOLVED"; resolved = []; }
    sites.push({ line: code.slice(0, m.index).split("\n").length, callee: m[1], form, names: resolved });
  }
  return { sites };
}

/** One entry point's route to the decision. */
export function routeOf(row, text) {
  const writes = row.cls === "GOVERNED_STATE_CHANGE";
  const scoped = /\bscopedEntryPoint\(/.test(text);
  if (writes && row.callerClass === "BOUNDARY_ROUTED") return "AT_BOUNDARY";
  if (writes && row.callerClass === "CHECKED_AUDIT_STORE_EXEMPTION") return /\bauthorise\(/.test(text) ? "DIRECT" : "UNAUTHORISED";
  if (writes) return "UNAUTHORISED";
  return scoped ? "AT_SCOPED_ENTRY" : "READ_ONLY";
}

/** Patterns that fail to refuse a control name — each is a defect. */
export const unfalsifiablePatterns = (patterns = ACTION_PATTERNS) => patterns.filter((p) => p.pattern.test(CONTROL_NAME) || p.pattern.test("") || p.pattern.test("_"));

/**
 * The census. `sources` (file → text) and `rows` may be handed in for a control; by default both are the real tree.
 */
export function authorisationCensus({ sources = null, rows = null, libraries = null } = {}) {
  const read = (f) => (sources ? sources[f] ?? "" : readFileSync(join(REPO, f), "utf8"));
  IMPORT_SOURCES = sources;
  /* An OUTER_CALL is lawful only beside a helper site of the same file that names its action; alone, it is unresolved. */
  const unresolvedOf = (sites) => { const named = sites.some((s) => s.names.length > 0); return sites.filter((s) => s.form === "UNRESOLVED" || (s.form === "OUTER_CALL" && !named)).map((s) => s.line); };
  const entryRows = rows ?? callerCensus();
  const libs = libraries ?? execFileSync("git", ["-C", REPO, "ls-files", "src"], { encoding: "utf8" }).split("\n").filter((f) => /\.mjs$/.test(f) && !f.startsWith("src/governance/"));
  const entries = entryRows.map((r) => {
    const text = read(r.file);
    const { sites } = actionSitesOf(text, { file: r.file });
    const unknownActions = [...new Set(sites.flatMap((s) => s.names).filter((n) => !actionEntry(n)))];
    return { file: r.file, cls: r.cls, route: routeOf(r, text), sites, unknownActions, unresolved: unresolvedOf(sites) };
  });
  const libraries_ = libs.map((file) => ({ file, sites: actionSitesOf(read(file), { file }).sites })).filter((l) => l.sites.length);
  for (const l of libraries_) {
    l.unknownActions = [...new Set(l.sites.flatMap((s) => s.names).filter((n) => !actionEntry(n)))];
    l.unresolved = unresolvedOf(l.sites);
  }
  const used = new Set([...entries, ...libraries_].flatMap((e) => e.sites.flatMap((s) => s.names)));
  const defects = [
    ...entries.filter((e) => e.route === "UNAUTHORISED").map((e) => ({ code: "UNAUTHORISED_WRITER", file: e.file })),
    ...[...entries, ...libraries_].flatMap((e) => e.unknownActions.map((a) => ({ code: "UNKNOWN_ACTION", file: e.file, action: a }))),
    ...[...entries, ...libraries_].flatMap((e) => e.unresolved.map((line) => ({ code: "UNKNOWN_SITE", file: e.file, line }))),
    ...unfalsifiablePatterns().map((p) => ({ code: "UNFALSIFIABLE_PATTERN", pattern: String(p.pattern) })),
  ];
  const byRoute = entries.reduce((m, e) => ((m[e.route] = (m[e.route] ?? 0) + 1), m), {});
  return {
    entryPoints: entries.length,
    byRoute,
    governedSites: [...entries, ...libraries_].reduce((n, e) => n + e.sites.length, 0),
    declaredActions: Object.keys(ACTIONS).length,
    actionsAtSites: [...used].filter((n) => actionEntry(n)).length,
    declaredButNotAtAWriteSite: Object.keys(ACTIONS).filter((a) => !used.has(a)).sort(),
    entries,
    libraries: libraries_,
    defects,
  };
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/").replace(/^\//, "")}` || process.argv[1]?.endsWith("authorisation-census.mjs")) {
  const c = authorisationCensus();
  if (process.argv.includes("--json")) console.log(JSON.stringify(c, null, 2));
  else {
    console.log("F04 · AUTHORISATION CENSUS (read-only; git-tracked entry points)");
    console.log(`  entry points ${c.entryPoints} = ${Object.entries(c.byRoute).map(([k, v]) => `${k} ${v}`).join(" + ")}`);
    console.log(`  governed call sites ${c.governedSites} · declared actions ${c.declaredActions} · resolved at a write site ${c.actionsAtSites}`);
    console.log(`  declared but reached by another route (read, connector, approval, spend, merge, audit): ${c.declaredButNotAtAWriteSite.length}`);
    console.log(`  DEFECTS ${c.defects.length}`);
    for (const d of c.defects) console.log(`    ${d.code} ${d.file ?? ""}${d.line ? `:${d.line}` : ""} ${d.action ?? d.pattern ?? ""}`);
  }
  if (process.argv.includes("--check") && c.defects.length) process.exit(1);
}
