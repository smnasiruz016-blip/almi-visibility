#!/usr/bin/env node
/**
 * 🔴 EVERY PRODUCTION ENTRY POINT, CLASSIFIED — AND EVERY GOVERNED WRITE ACCOUNTED FOR (22 September 2026).
 *
 *   node tools/governed-caller-census.mjs [--check] [--table]
 *
 * READ-ONLY. It writes nothing and needs no write gate. It answers two questions with one enumeration:
 *   1. what IS every entry point under bin/, and
 *   2. does any GOVERNED_STATE_CHANGE site still perform its write outside the shared boundary?
 *
 * ── THE CLASSIFICATION RULE, DECLARED BEFORE ANY SITE IS READ ──────────────
 *
 *   GOVERNED_STATE_CHANGE  the entry point's OWN SOURCE holds a write site — a filesystem primitive, a store
 *                          append, or the construction of a durable writer under its own gate — so when permission
 *                          is granted it mutates durable repository state.
 *   READ_ONLY_DIAGNOSTIC   its own source holds no write site. It reports, and §9 requires its behaviour to be
 *                          unchanged: it emits nothing and is not routed.
 *   TEST_ONLY              not a production entry point. Nothing under bin/ qualifies by construction; the bucket
 *                          exists so that "none" is a measured answer rather than an omission.
 *   DEAD_OR_ORPHANED       write-capable and reachable from no production entry point.
 *   UNKNOWN                cannot be settled by measurement. 🔴 EVERY UNKNOWN BLOCKS IMPLEMENTATION.
 *
 * 🔴 THE HELPER VOCABULARY IS RE-DERIVED FROM THE TREE, NOT REMEMBERED. An earlier pass listed `appendAll(` but
 * not `appendAllWithoutDedupe(` and left two entry points UNKNOWN; a third was missed because it CONSTRUCTS a
 * durable writer (`createCostLedger(`) rather than calling append itself. The list below was taken with
 *   grep -ohE "\.(append[A-Za-z]*)\(" bin/*.mjs | sort -u
 * and re-checked against the write primitives actually present.
 *
 * 🔴 NO ALLOWLIST TURNS AN UNEXPLAINED WRITER INTO "NOT GOVERNED." There is no exemption list in this file.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { AUDIT_STORE_ONLY_PRIMITIVES, verifyRegistry, verifiedPrimitives, splitTopLevel } from "./audit-store-primitives.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 28 });

export const FS_WRITE = /\b(writeFileSync|appendFileSync|mkdirSync|rmSync|renameSync|unlinkSync|createWriteStream|cpSync|copyFileSync)\(/;

/* ── 🔴 THE WRITING EXPORTS ARE DERIVED FROM src/ AT RUN TIME — NOT LISTED FROM MEMORY (23 September 2026) ────
 *
 * The list used to be written out by hand, and a hand-written list is a list someone forgot to update. Measured on
 * 23 September it had missed TWO writers: `runReplayPass` (bin/replay-crawl.mjs writes its crawl store through it,
 * so those writes were invisible to this census) and `createPaidProviderGate` (which appends to the ledger it is
 * handed). Each earlier miss — `appendAllWithoutDedupe`, `recordCandidates` — had produced a false answer too.
 *
 * THE RULE: an exported src/ function is a WRITER when its body calls `.append*(` on a store-like parameter, or
 * calls a function of the same tree already known to be a writer — iterated to a fixed point. The governed-write
 * boundary's own modules (src/governance/) are excluded BY NAME OF DIRECTORY: they ARE the boundary, and a call to
 * them is classified as routed, never as a bypass. */
export const BOUNDARY_MODULE_DIR = "src/governance/";
/* 🔴 ANY RECEIVER, not only one NAMED like a store (24 Sep 2026). It used to be `(store|ledger|s|target)`, so a recorder
 * written `const t = audit.store; t.append(d)` was not a writer at all and its callers were invisible here — an
 * unregistered recorder that turned nothing red. Widening it changed no measured writer: every one of the 21 append
 * sites in src/ already sat on one of those four names. */
const APPEND_ON_STORE = /\b[\w$]+\??\.(append|appendIfNew|appendWithoutDedupe|appendAllWithoutDedupe)\(/;

export function derivedWriterExports({ files = null, read = null } = {}) {
  const list = files ?? execFileSync("git", ["-C", REPO, "ls-files", "src"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".mjs"));
  const readText = read ?? ((f) => readFileSync(join(REPO, f), "utf8"));
  const fns = [];
  for (const file of list) {
    const t = readText(file);
    const hits = [...t.matchAll(/^(export )?(async )?function (\w+)\s*\(/gm)];
    hits.forEach((m, i) => fns.push({ file, name: m[3], exported: Boolean(m[1]), body: t.slice(m.index, i + 1 < hits.length ? hits[i + 1].index : t.length) }));
  }
  const writers = new Set(fns.filter((f) => APPEND_ON_STORE.test(f.body)).map((f) => `${f.file}#${f.name}`));
  for (let grew = true; grew;) {
    grew = false;
    const names = fns.filter((f) => writers.has(`${f.file}#${f.name}`)).map((f) => f.name);
    for (const f of fns) {
      if (writers.has(`${f.file}#${f.name}`)) continue;
      const inner = f.body.slice(f.body.indexOf("{"));
      if (names.some((n) => new RegExp(`\\b${n}\\(`).test(inner))) { writers.add(`${f.file}#${f.name}`); grew = true; }
    }
  }
  return fns.filter((f) => f.exported && writers.has(`${f.file}#${f.name}`) && !f.file.startsWith(BOUNDARY_MODULE_DIR))
    .map((f) => ({ name: f.name, file: f.file }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const WRITER_EXPORTS = derivedWriterExports();
export const WRITER_NAMES = Object.freeze(WRITER_EXPORTS.map((w) => w.name));
export const STORE_WRITE = new RegExp(["\\.append\\(", "\\.appendIfNew\\(", "\\.appendAllWithoutDedupe\\(", "\\.appendWithoutDedupe\\(", ...WRITER_NAMES.map((n) => `\\b${n}\\(`)].join("|"));
export const BOUNDARY_CALL = /executeGovernedWrite\(/;

/* ── 🔴 THE CHECKED AUDIT-STORE EXEMPTION ──────────────────────────────────
 *
 * One entry point cannot be routed through the boundary: the one whose mutation IS the audit store. Routing it
 * would make the audit system recursively audit its own persistence, and it would hit the boundary's own
 * AUDIT_STORE_TARGET_FORBIDDEN fence.
 *
 * 🔴 THIS IS A DERIVED CLASS, NOT A DECLARED ONE. There is no list to add a file to and no flag a caller can set
 * on itself — the owner ruling's exemption is BY NAME, and "infrastructure" is not a word any future write may
 * claim for itself. A caller earns this class only by satisfying BOTH conditions, read from its own source:
 *
 *   A · every mutation it makes targets the declared audit-store implementation, and nothing else;
 *   B · it emits its WRITE_GATE_DECISION through the live recorder BEFORE that mutation.
 *
 * It fails closed on every other shape: one non-audit target, a missing or later write-gate event, no resolvable
 * target, or an ordinary governed writer that merely looks similar. */
/* 🔴 THE REGISTERED PRIMITIVES ARE VERIFIED, NOT NAMED (owner ruling, 24 Sep 2026 —
 * _handoffs/AlmiVisibility_OWNER_RULING_2026-09-24_AUDIT_STORE_ONLY_PRIMITIVES.md).
 *
 * This used to be a hand-written regex of nine names, and two comments here said F07's and F01's tests proved those
 * modules held no filesystem write. F01's test did (for src/intake/ only); F07's never did — the sentence cited a proof
 * that did not exist. Nothing read the functions behind the names: registering a mixed writer, or changing a
 * registered primitive to write another target, left this census green (measured on 987cda6).
 *
 * Now: the registry is `AUDIT_STORE_ONLY_PRIMITIVES` in tools/audit-store-primitives.mjs, entries are { name, module },
 * and an entry is registered ONLY while `verifyAuditStorePrimitive` proves from source that everything it can reach
 * writes nothing but the audit store its caller hands in. `AUDIT_STORE_REACHING` below is DERIVED from the verified
 * entries; an unverified entry is not in it, and `--check` exits 1 while one exists. */
function registryContext(verification) {
  const registered = verifiedPrimitives(verification);
  const names = registered.map((r) => r.name);
  return { verification, registered, reaching: names.length ? new RegExp(`\\b(${names.join("|")})\\(`) : /(?!)/ };
}
export const PRIMITIVE_VERIFICATION = Object.freeze(verifyRegistry());
const DEFAULT_REGISTRY = registryContext(PRIMITIVE_VERIFICATION);
export const AUDIT_STORE_REACHING = DEFAULT_REGISTRY.reaching;
export const AUDIT_STORE_CONSTRUCTOR = /\b(productionAuditStore|governedAuditContext)\(/;
export const LIVE_WRITE_GATE_EVENT = /writeGateEvent\(/;

/** Both conditions, each reported separately so a failure says WHICH one was missing.
 *  A reads the SITE RULE's verdict, not the line's names: a registered name on a line proves nothing by itself. */
export function auditStoreInternalWrite(text, sites, opts = {}) {
  const lines = text.split("\n");
  const targetsOnlyAuditStore = sites.length > 0 && sites.every((s) => classifySite(text, s, opts).cls === "CHECKED_AUDIT_STORE_EXEMPTION");
  const constructsAuditStore = AUDIT_STORE_CONSTRUCTOR.test(text);
  const conditionA = targetsOnlyAuditStore && constructsAuditStore;

  const gateLine = lines.findIndex((l) => isCode(l) && LIVE_WRITE_GATE_EVENT.test(l)) + 1;
  const firstMutation = sites.length ? Math.min(...sites.map((s) => s.line)) : 0;
  const conditionB = gateLine > 0 && firstMutation > 0 && gateLine < firstMutation;

  return {
    conditionA, conditionB, exempt: conditionA && conditionB,
    targetsOnlyAuditStore, constructsAuditStore, gateLine, firstMutation,
  };
}
export const CLASSES = Object.freeze(["GOVERNED_STATE_CHANGE", "READ_ONLY_DIAGNOSTIC", "TEST_ONLY", "DEAD_OR_ORPHANED", "UNKNOWN"]);

const isCode = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/^\s*import\b/.test(l);
export const writeSitesOf = (text) => text.split("\n").map((l, i) => ({ line: i + 1, text: l })).filter((r) => isCode(r.text) && (FS_WRITE.test(r.text) || STORE_WRITE.test(r.text)));

/* ═══════════════════════════════════════════════════════════════════════════
 * 🔴 THE SITE VOCABULARY — WHAT EACH WRITE-SHAPED LINE ACTUALLY DOES (§3, 23 September 2026)
 *
 * A keyword match says a line LOOKS like a write. After routing, most such lines are not: a ledger CONSTRUCTED and
 * handed to the boundary as its target; a ledger constructed only to be READ; a library operation handed a
 * COLLECTOR whose contents the boundary then commits. Counting those as bypasses produced "9 partially routed" where
 * the writes had in fact moved — and counting them as routed WITHOUT a rule would be the same false zero from the
 * other side. So every site gets a class, by a rule that reads the site's own text and the binding of the value it
 * writes through, and nothing else:
 *
 *   BOUNDARY_ROUTED               the durable writer is constructed as the ARGUMENT of a governed-write helper, so
 *                                 the only mutation it can suffer is the one the boundary performs.
 *   READ_ONLY                     the writer is constructed and only ever READ (`.readAll()` / `.path`).
 *   COLLECTOR_OR_LIBRARY_WRITE    a library writer handed a COLLECTOR (`createDryRunStore`, or a store in this
 *                                 process's own OS scratch directory) — nothing durable is written by that call; what it
 *                                 collected reaches durable state only through the boundary, elsewhere in the file.
 *   SCRATCH_OUTSIDE_REPOSITORY    a filesystem primitive whose target is a directory this process minted with
 *                                 `mkdtempSync(join(tmpdir(), …))`. Not repository state; never governed.
 *   CHECKED_AUDIT_STORE_EXEMPTION an audit-store writer handed the audit store itself. The emission IS the audit.
 *   DIRECT_DURABLE_WRITE          anything that writes durable state by any other route. A bypass.
 *   UNKNOWN                       a writer whose binding cannot be resolved. 🔴 FAILS CLOSED, counted as a bypass.
 *
 * Measured, not assumed, and re-proved by test/governed-caller-vocabulary.test.mjs with the real modules under an
 * instrumented filesystem: constructing a ledger or a store writes NOTHING, reading one writes nothing, a collector's
 * append writes nothing — and a real append DOES write, so the instrument is shown able to see a write at all.
 * ═══════════════════════════════════════════════════════════════════════════ */
export const SITE_CLASSES = Object.freeze([
  "BOUNDARY_ROUTED", "READ_ONLY", "COLLECTOR_OR_LIBRARY_WRITE", "SCRATCH_OUTSIDE_REPOSITORY",
  "CHECKED_AUDIT_STORE_EXEMPTION", "DIRECT_DURABLE_WRITE", "UNKNOWN",
]);
/** Caller classes (§3 A–G). F and G fail closed — each is counted as a bypass. */
export const CALLER_CLASSES = Object.freeze([
  "BOUNDARY_ROUTED", "DIRECT_DURABLE_WRITE", "COLLECTOR_OR_LIBRARY_WRITE", "CHECKED_AUDIT_STORE_EXEMPTION",
  "READ_ONLY", "PARTIALLY_ROUTED", "UNKNOWN",
]);
const NON_MUTATING_SITE = new Set(["BOUNDARY_ROUTED", "READ_ONLY", "COLLECTOR_OR_LIBRARY_WRITE", "SCRATCH_OUTSIDE_REPOSITORY", "CHECKED_AUDIT_STORE_EXEMPTION"]);

/* The governed-write helpers a writer may be handed to. Each returns the boundary's ARGUMENTS and the caller then
 * calls executeGovernedWrite itself — so "constructed as the helper's argument" means "mutated only by the boundary". */
const GOVERNED_HELPER = /\b(governedStoreAppend|governedFileWrite|governedRecordAppend|governedDirectoryReplace)\(/;
const COLLECTOR_CONSTRUCTOR = /\bcreateDryRunStore\(/;
const SCRATCH_DIR = /\bmkdtempSync\(\s*join\(\s*tmpdir\(\)/;

/* ── 🔴 THE CALL-SITE HALF OF THE RULING (24 Sep 2026) ─────────────────────────────────────────────────────────────
 * A verified primitive writes only to the store it is HANDED. So the site must prove what it hands in, and must not
 * smuggle anything else past the classification. Each rule below closes a hole measured on 987cda6:
 *   IDENTITY    the called name is imported, unaliased, from the registered module (a same-named function elsewhere
 *               was exempt);
 *   ONE WRITE   nothing else write-shaped shares the primitive's line (a product append after it on the line was exempt);
 *   THE STORE   the store argument is read from the primitive's OWN first argument (an inner call's `store:` was read
 *               instead), and its value is EXACTLY the entry point's own production audit store: a constructor call and
 *               nothing else — no ternary, no Object.assign, no key overriding `store` — with `repo` bound to this
 *               entry point's own root (import.meta.url), `env` only process.env, and no caller-chosen location (`at`).
 *               A relocated or alternate-root store, or one whose `append` was replaced, was exempt. */
const OWN_AUDIT_KEYS = Object.freeze({
  productionAuditStore: new Set(["repo", "clock"]),
  governedAuditContext: new Set(["repo", "env", "correlationId", "authorityRef", "authorityHash", "clock"]),
});

/** Import clauses of an entry point: named (with any alias) and namespace, each with its specifier and line. */
export function importsOf(text) {
  const out = [];
  for (const m of text.matchAll(/^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/gm)) {
    const line = text.slice(0, m.index).split("\n").length;
    const clause = m[1].trim();
    const ns = clause.match(/\*\s+as\s+([\w$]+)/);
    if (ns) out.push({ local: ns[1], exported: "*", spec: m[2], line, namespace: true });
    const named = clause.match(/\{([\s\S]*)\}/);
    if (named) for (const part of splitTopLevel(named[1])) {
      const a = part.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (a) out.push({ local: a[2] ?? a[1], exported: a[1], spec: m[2], line, namespace: false, aliased: Boolean(a[2]) });
    }
  }
  return out;
}
const resolveFrom = (file, spec) => (spec.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), spec)) : spec);

/** The value of the NEAREST `const name = …` before line `before`, as one expression (across lines, balanced). */
function constValueBefore(lines, name, before) {
  for (let i = Math.min(before, lines.length) - 1; i >= 0; i -= 1) {
    if (!isCode(lines[i])) continue;
    const m = lines[i].match(new RegExp(`^\\s*(const|let|var)\\s+${name}\\s*=\\s*`));
    if (!m) continue;
    if (m[1] !== "const") return { kind: "REASSIGNABLE" };
    const text = [lines[i].slice(m[0].length), ...lines.slice(i + 1, i + 40)].join("\n");
    let depth = 0; let out = "";
    for (let j = 0; j < text.length; j += 1) {
      const c = text[j];
      if (c === '"' || c === "'" || c === "`") { let k = j + 1; for (; k < text.length && text[k] !== c; k += 1) if (text[k] === "\\") k += 1; out += text.slice(j, k + 1); j = k; continue; }
      if ("([{".includes(c)) depth += 1;
      if (")]}".includes(c)) depth -= 1;
      if (depth === 0 && (c === ";" || (c === "\n" && out.trim() !== ""))) break;
      out += c;
    }
    return { kind: "CONST", value: out.trim(), line: i + 1 };
  }
  return { kind: "UNBOUND" };
}

/** `fn({ … })` exactly — the whole expression is the one call — → its object literal's top-level entries, else null. */
function exactCallArgs(expr, fnPattern) {
  const m = expr.match(new RegExp(`^(${fnPattern})\\(\\s*\\{`));
  if (!m) return null;
  let depth = 0; let end = -1;
  for (let j = m[1].length; j < expr.length; j += 1) {
    const c = expr[j];
    if (c === '"' || c === "'" || c === "`") { let k = j + 1; for (; k < expr.length && expr[k] !== c; k += 1) if (expr[k] === "\\") k += 1; j = k; continue; }
    if (c === "(") depth += 1;
    if (c === ")") { depth -= 1; if (depth === 0) { end = j; break; } }
  }
  if (end < 0 || expr.slice(end + 1).trim() !== "") return null;
  const obj = expr.slice(m[1].length + 1, end).trim();
  if (!obj.startsWith("{") || !obj.endsWith("}")) return null;
  return { fn: m[1], entries: splitTopLevel(obj.slice(1, -1)) };
}
const entryKey = (e) => (e.startsWith("...") ? "..." : (e.match(/^([\w$]+)\s*(?::|$)/) ?? [])[1] ?? null);
const entryValue = (e) => (e.includes(":") ? e.slice(e.indexOf(":") + 1).trim() : e.trim());

/** Is `id` bound (nearest const before `before`) to this entry point's own repository root? */
function isOwnRoot(lines, id, before) {
  if (!/^[\w$]+$/.test(id)) return false;
  const b = constValueBefore(lines, id, before);
  return b.kind === "CONST" && /\bimport\.meta\.url\b/.test(b.value);
}

/** A constructor call of the entry point's own production audit store, with nothing a caller can redirect. */
function ownAuditConstructor(lines, expr, before) {
  const call = exactCallArgs(expr, "productionAuditStore|governedAuditContext");
  if (!call) return { ok: false, why: "not exactly one audit-store constructor call" };
  const allowed = OWN_AUDIT_KEYS[call.fn];
  let repo = false;
  for (const e of call.entries) {
    const k = entryKey(e);
    if (k === null || k === "...") return { ok: false, why: `${call.fn} is handed a spread or an unreadable argument` };
    if (!allowed.has(k)) return { ok: false, why: `${call.fn} is handed \`${k}\` — a caller-chosen location or rule` };
    if (k === "repo") { if (!isOwnRoot(lines, entryValue(e), before)) return { ok: false, why: `${call.fn}'s repo is not this entry point's own root` }; repo = true; }
    if (k === "env" && entryValue(e) !== "process.env") return { ok: false, why: `${call.fn} is handed an env that is not process.env` };
  }
  return repo ? { ok: true } : { ok: false, why: `${call.fn} names no repo` };
}

/**
 * THE STORE A PRIMITIVE IS HANDED, proved to be the entry point's own production audit store — or the reason not.
 * @returns {{ok: boolean, why: string}}
 */
function provedOwnAuditStore(lines, value, before) {
  const v = value.trim();
  const viaHelper = v.match(/^([\w$]+)\.audit\.store$/);
  if (viaHelper) {
    const b = constValueBefore(lines, viaHelper[1], before);
    if (b.kind !== "CONST") return { ok: false, why: `${viaHelper[1]} is ${b.kind.toLowerCase()}` };
    const call = exactCallArgs(b.value, "governedStoreAppend|governedFileWrite|governedRecordAppend|governedDirectoryReplace");
    if (!call) return { ok: false, why: `${viaHelper[1]} is not exactly a governed-write helper call` };
    const repo = call.entries.find((e) => entryKey(e) === "repo");
    if (!repo || !isOwnRoot(lines, entryValue(repo), b.line)) return { ok: false, why: "the helper's repo is not this entry point's own root" };
    const env = call.entries.find((e) => entryKey(e) === "env");
    if (env && entryValue(env) !== "process.env") return { ok: false, why: "the helper is handed an env that is not process.env" };
    if (call.entries.some((e) => entryKey(e) === "...")) return { ok: false, why: "the helper is handed a spread" };
    return { ok: true, why: "the governed-write helper's own audit context" };
  }
  if (!/^[\w$]+$/.test(v)) return { ok: false, why: `\`${v}\` is an expression, not a bound audit store` };
  const b = constValueBefore(lines, v, before);
  if (b.kind !== "CONST") return { ok: false, why: `${v} is ${b.kind.toLowerCase()}` };
  const direct = ownAuditConstructor(lines, b.value, b.line);
  if (direct.ok) return direct;
  /* `{ ...governedAuditContext({…}), actor: … }` — the context spread once, and no key that replaces its store. */
  if (b.value.startsWith("{") && b.value.endsWith("}")) {
    const entries = splitTopLevel(b.value.slice(1, -1));
    const spreads = entries.filter((e) => e.startsWith("..."));
    if (spreads.length !== 1 || !entries[0].startsWith("...")) return { ok: false, why: `${v} is an object that is not one spread audit context` };
    if (entries.some((e) => entryKey(e) === "store")) return { ok: false, why: `${v} overrides the audit context's store` };
    const inner = ownAuditConstructor(lines, spreads[0].slice(3).trim(), b.line);
    return inner.ok ? { ok: true, why: "a spread of the entry point's own audit context" } : inner;
  }
  return direct;
}


/** `const X = <expr>` → the expression text (to the end of the statement), or null. First binding wins. */
function bindingOf(lines, name) {
  const re = new RegExp(`^\\s*(?:const|let|var)\\s+${name}\\s*=\\s*(.*)$`);
  for (let i = 0; i < lines.length; i += 1) {
    if (!isCode(lines[i])) continue;
    const m = lines[i].match(re);
    if (m) return m[1];
  }
  return null;
}

/** The text of a call starting on line i, up to where its parentheses balance (bounded, so a bad parse cannot run away). */
function callText(lines, i, maxLines = 40) {
  let depth = 0; let started = false; const out = [];
  for (let j = i; j < Math.min(lines.length, i + maxLines); j += 1) {
    out.push(lines[j]);
    for (const ch of lines[j]) { if (ch === "(") { depth += 1; started = true; } else if (ch === ")") depth -= 1; }
    if (started && depth <= 0) break;
  }
  return out.join("\n");
}

/** Is line i inside the argument list of a governed-write helper? Looks back to the helper's opening line. */
function insideGovernedHelper(lines, i, maxBack = 6) {
  for (let j = i; j >= Math.max(0, i - maxBack); j -= 1) {
    if (GOVERNED_HELPER.test(lines[j])) return callText(lines, j).split("\n").length > i - j;
    if (j < i && /;\s*$/.test(lines[j])) return false;
  }
  return false;
}

/** How a value bound to `name` is USED in the file: every use must be read-only or a hand-off to the boundary. */
/** A line with string CONTENT removed — quoted text is not a use of anything — keeping template ${…} expressions. */
const codeOnly = (l) => l
  .replace(/`(?:[^`\\]|\\.)*`/g, (t) => [...t.matchAll(/\$\{([^}]*)\}/g)].map((m) => ` ${m[1]} `).join(""))
  .replace(/"(?:[^"\\]|\\.)*"/g, '""')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/\/\/.*$/, "");

function usesOf(rawLines, name, bindingLine) {
  const lines = rawLines.map(codeOnly);
  const uses = [];
  lines.forEach((l, i) => {
    if (i === bindingLine || !isCode(rawLines[i])) return;
    for (const m of l.matchAll(new RegExp(`\\b${name}\\b(\\??\\.\\w+)?`, "g"))) {
      const member = m[1] ? m[1].replace(/^\??\./, "") : null;
      if (member === "readAll" || member === "path") uses.push({ i, kind: "READ" });
      else if (member === null && insideGovernedHelper(lines, i) && new RegExp(`\\bstore:\\s*${name}\\b`).test(l)) uses.push({ i, kind: "INTO_BOUNDARY" });
      else if (member === null && /\bstore:\s*\w+|[{,]\s*\w+\s*[,}]/.test(l) && !new RegExp(`\\b${name}\\s*\\(`).test(l)) uses.push({ i, kind: "HANDED_TO", line: l });
      else uses.push({ i, kind: member && /^append/.test(member) ? "APPENDED" : "OTHER", member });
    }
  });
  return uses;
}

/** Is the store value bound to `name` a collector (or a store inside this process's own OS scratch directory)? */
function isCollectorBinding(lines, name, depth = 0) {
  const b = bindingOf(lines, name);
  if (b === null || depth > 3) return false;
  if (COLLECTOR_CONSTRUCTOR.test(b)) return true;
  const scratch = b.match(/\bcreateJsonlStore\(\s*join\(\s*(\w+)\s*,/);
  if (scratch) return SCRATCH_DIR.test(bindingOf(lines, scratch[1]) ?? "");
  /* An object literal whose append only pushes into memory is a collector by construction. */
  if (/^\{/.test(b.trim())) {
    const at = lines.findIndex((l) => isCode(l) && new RegExp(`^\\s*(?:const|let)\\s+${name}\\s*=`).test(l));
    const body = blockText(lines, at);
    return /\bappend:\s*\([^)]*\)\s*=>\s*\{\s*\w+\.push\(/.test(body) && !FS_WRITE.test(body) && !STORE_WRITE.test(body.replace(/\bappend:/g, ""));
  }
  return false;
}

/** From line `at`, the text up to where its braces balance (bounded). */
function blockText(lines, at, maxLines = 80) {
  let depth = 0; let started = false; const out = [];
  for (let j = at; j < Math.min(lines.length, at + maxLines); j += 1) {
    out.push(lines[j]);
    for (const ch of lines[j]) { if (ch === "{") { depth += 1; started = true; } else if (ch === "}") depth -= 1; }
    if (started && depth <= 0) break;
  }
  return out.join("\n");
}

/**
 * THE SITE RULE. Reads the site line, its enclosing call and the bindings it names. Never a list of file names.
 * @returns {{cls: string, why: string}}
 */
export function classifySite(text, site, { file = "bin/_.mjs", registry = DEFAULT_REGISTRY } = {}) {
  const lines = text.split("\n");
  const i = site.line - 1;
  const l = lines[i];

  /* 1 · A filesystem primitive. Its first argument decides: this process's own OS scratch directory, or durable state. */
  const fs = l.match(FS_WRITE);
  if (fs) {
    const arg = (l.slice(l.indexOf(fs[0]) + fs[0].length).match(/^\s*(\w+)\s*[,)]/) ?? [])[1];
    if (arg && SCRATCH_DIR.test(bindingOf(lines, arg) ?? "")) return { cls: "SCRATCH_OUTSIDE_REPOSITORY", why: `${fs[1]} on ${arg}, a directory this process minted under the OS temp root` };
    return { cls: "DIRECT_DURABLE_WRITE", why: `${fs[1]} on durable state, outside the boundary` };
  }

  /* 2 · A VERIFIED audit-store-only primitive. The checked exemption only when the site proves all three call-site
   *     rules above; each failure says which. A registered name alone never exempts anything. */
  const hit = l.match(registry.reaching);
  if (hit) {
    const entry = registry.registered.find((e) => e.name === hit[1]);
    const imports = importsOf(text);
    const nsCall = l.match(new RegExp(`\\b([\\w$]+)\\s*\\.\\s*${entry.name}\\(`));
    const named = imports.find((x) => !x.namespace && x.local === entry.name);
    const identity = nsCall
      ? imports.some((x) => x.namespace && x.local === nsCall[1] && resolveFrom(file, x.spec) === entry.module)
      : Boolean(named && named.exported === entry.name && resolveFrom(file, named.spec) === entry.module);
    if (!identity) return { cls: "UNKNOWN", why: `${entry.name}( is not the registered ${entry.module} export — identity is the name AND the module` };

    const at = l.indexOf(hit[0]);
    const rest = l.slice(0, at) + l.slice(at + hit[0].length);
    if (FS_WRITE.test(rest) || STORE_WRITE.test(rest)) return { cls: "DIRECT_DURABLE_WRITE", why: `another write shares ${entry.name}'s line — registration never exempts a caller's own write` };

    /* The store argument of THIS call: the top-level `store` or `audit` entry of its first argument object. */
    const call = callText(lines, i);
    const open = call.indexOf(hit[0]) + hit[0].length - 1;
    let depth = 0; let close = -1;
    for (let j = open; j < call.length; j += 1) { if (call[j] === "(") depth += 1; else if (call[j] === ")") { depth -= 1; if (depth === 0) { close = j; break; } } }
    const args = close > 0 ? splitTopLevel(call.slice(open + 1, close)) : [];
    const first = args[0] ?? "";
    if (!first.startsWith("{") || !first.endsWith("}")) return { cls: "UNKNOWN", why: `${entry.name} is not called with an argument object this rule can read` };
    const carriers = splitTopLevel(first.slice(1, -1)).filter((e) => ["store", "audit"].includes(entryKey(e)));
    if (carriers.length !== 1) return { cls: "UNKNOWN", why: `${entry.name} is handed ${carriers.length} store carriers (store/audit) — ambiguous` };
    const proved = provedOwnAuditStore(lines, entryValue(carriers[0]), i + 1);
    return proved.ok
      ? { cls: "CHECKED_AUDIT_STORE_EXEMPTION", why: `an audit event appended to the audit store itself — the emission is the audit (${proved.why ?? "own audit store"})` }
      : { cls: "DIRECT_DURABLE_WRITE", why: `${entry.name} is handed something not proved to be this entry point's own audit store: ${proved.why}` };
  }

  /* 3 · A constructed durable writer (the only constructor among the derived writers is the cost ledger's). */
  const ctor = l.match(/\bcreateCostLedger\(/);
  if (ctor) {
    if (/createCostLedger\([^;]*\)\s*\.\s*readAll\(\)/.test(l)) return { cls: "READ_ONLY", why: "constructed and only read" };
    if (/\bstore:\s*createCostLedger\(/.test(l) && insideGovernedHelper(lines, i)) return { cls: "BOUNDARY_ROUTED", why: "constructed as the governed-write helper's target; only the boundary mutates it" };
    const bound = l.match(/^\s*(?:const|let)\s+(\w+)\s*=\s*createCostLedger\(/);
    if (!bound) return { cls: "UNKNOWN", why: "a constructed ledger whose use cannot be read" };
    const uses = usesOf(lines, bound[1], i);
    if (uses.some((u) => u.kind === "APPENDED")) return { cls: "DIRECT_DURABLE_WRITE", why: `${bound[1]} is appended to directly` };
    if (uses.some((u) => u.kind === "OTHER" || u.kind === "HANDED_TO")) return { cls: "UNKNOWN", why: `${bound[1]} is used in a way this rule cannot settle` };
    if (uses.some((u) => u.kind === "INTO_BOUNDARY")) return { cls: "BOUNDARY_ROUTED", why: `${bound[1]} is only read, or handed to the boundary as its target` };
    return { cls: "READ_ONLY", why: `${bound[1]} is only read` };
  }

  /* 4 · A library writer, or a store method. Whatever it writes through decides. */
  const call = callText(lines, i);
  const lib = l.match(new RegExp(`\\b(${WRITER_NAMES.join("|")})\\(`));
  if (lib) {
    const m = call.match(/\b(?:store|ledger)\s*:\s*(\w+)/) ?? (/[{,]\s*(store|ledger)\s*[,}]/.test(call) ? [null, call.match(/[{,]\s*(store|ledger)\s*[,}]/)[1]] : null);
    if (!m) return { cls: "UNKNOWN", why: `${lib[1]} is called with no store this rule can read` };
    return isCollectorBinding(lines, m[1])
      ? { cls: "COLLECTOR_OR_LIBRARY_WRITE", why: `${lib[1]} is handed ${m[1]}, a collector — it writes nothing durable` }
      : { cls: "DIRECT_DURABLE_WRITE", why: `${lib[1]} is handed ${m[1]}, a durable store, outside the boundary` };
  }
  const recv = l.match(/\b(\w+)\??\.(append|appendIfNew|appendWithoutDedupe|appendAllWithoutDedupe)\(/);
  if (recv) {
    return isCollectorBinding(lines, recv[1])
      ? { cls: "COLLECTOR_OR_LIBRARY_WRITE", why: `${recv[1]}.${recv[2]} appends to a collector` }
      : { cls: "DIRECT_DURABLE_WRITE", why: `${recv[1]}.${recv[2]} appends to durable state outside the boundary` };
  }
  return { cls: "UNKNOWN", why: "a write-shaped line no rule settles" };
}

/** THE CALLER RULE, from its sites. F (partial) and G (unknown) are bypasses. */
export function callerClassOf({ sites, usesBoundary, exemption }) {
  if (sites.some((s) => s.cls === "UNKNOWN")) return "UNKNOWN";
  const direct = sites.filter((s) => s.cls === "DIRECT_DURABLE_WRITE").length;
  if (direct > 0) return usesBoundary ? "PARTIALLY_ROUTED" : "DIRECT_DURABLE_WRITE";
  if (usesBoundary) return "BOUNDARY_ROUTED";
  if (sites.length > 0 && sites.every((s) => s.cls === "CHECKED_AUDIT_STORE_EXEMPTION")) return exemption?.exempt ? "CHECKED_AUDIT_STORE_EXEMPTION" : "DIRECT_DURABLE_WRITE";
  if (sites.length > 0 && sites.some((s) => s.cls === "CHECKED_AUDIT_STORE_EXEMPTION")) return "DIRECT_DURABLE_WRITE";
  if (sites.length > 0 && sites.every((s) => NON_MUTATING_SITE.has(s.cls))) return "COLLECTOR_OR_LIBRARY_WRITE";
  return "READ_ONLY";
}

/** What a caller writes to, from its own source. A class, never a path that could carry a client name. */
function targetClassOf(text) {
  if (/config\//.test(text)) return "GENERATED_CONFIG";
  if (/audit-trail\//.test(text)) return "AUDIT_TRAIL";
  if (/runs\//.test(text)) return "RUN_EVIDENCE";
  if (/arg\("out"\)|--out|outDir/.test(text)) return "OPERATOR_CHOSEN_OUTPUT";
  return "REPOSITORY_FILE";
}

/** Unconditional when the permission is taken once at module top level; conditional when it sits inside a branch. */
function shapeOf(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /(const|let)\s+permission\s*=/.test(l) && isCode(l));
  if (at < 0) return BOUNDARY_CALL.test(text) ? "BOUNDARY_ONLY" : "NO_PERMISSION_TAKEN";
  const indent = lines[at].match(/^\s*/)[0].length;
  const announces = lines.filter((l) => isCode(l) && /announceWritePermission\(/.test(l)).length;
  if (indent > 0) return "CONDITIONAL_PERMISSION";
  if (announces > 1) return "MULTI_ANNOUNCE";
  return "UNCONDITIONAL_TOP_LEVEL";
}

/**
 * @param {{sources?: {file: string, text: string}[]}} [opts] a FIXED INPUT, used by the planted-bypass control.
 *   Injecting the population in memory lets that control plant a synthetic bypass and remove it without writing a
 *   byte into bin/ and without touching the git index — which is the difference between a control and an incident.
 */
/**
 * 🔴 A WRITER IMPORTED UNDER ANOTHER NAME IS INVISIBLE TO A NAME-READING CENSUS — so it is refused, never read past.
 * `import { recordCandidates as rc }` made a real write to any store vanish: the entry point read as a diagnostic
 * (measured on 987cda6). Every static alias, and every renaming destructure of a dynamic import, of a derived writer or
 * of any DECLARED primitive, becomes an UNKNOWN site — a bypass until the alias is removed.
 */
export function aliasedWriterImports(text) {
  const names = new Set([...WRITER_NAMES, ...AUDIT_STORE_ONLY_PRIMITIVES.map((e) => e.name)]);
  const out = [];
  for (const x of importsOf(text)) if (x.aliased && names.has(x.exported)) out.push({ line: x.line, text: `import { ${x.exported} as ${x.local} }` });
  text.split("\n").forEach((l, i) => {
    for (const m of l.matchAll(/\{([^}]*)\}\s*=\s*(?:await\s+)?import\(/g)) {
      for (const part of splitTopLevel(m[1])) {
        const a = part.match(/^([\w$]+)\s*:\s*([\w$]+)$/);
        if (a && names.has(a[1])) out.push({ line: i + 1, text: `{ ${a[1]}: ${a[2]} } = import(…)` });
      }
    }
  });
  return out;
}

export function census({ sources = null, primitiveRead = null } = {}) {
  /* `primitiveRead` re-verifies the registry over stand-in module text, so a proof can change a primitive's body and
   * watch the census react — without writing a byte into src/. */
  const registry = primitiveRead ? registryContext(verifyRegistry({ read: primitiveRead })) : DEFAULT_REGISTRY;
  const bins = sources
    ? sources.map((s) => s.file)
    : git("ls-files", "bin").trim().split("\n").filter((p) => p.endsWith(".mjs"));
  const tests = git("ls-files", "test").trim().split("\n").filter((p) => p.endsWith(".mjs"));
  const testText = new Map(tests.map((f) => [f, readFileSync(join(REPO, f), "utf8")]));
  return bins.map((file) => {
    const text = (sources ? sources.find((s) => s.file === file).text : readFileSync(join(REPO, file), "utf8")).replace(/\r\n/g, "\n");
    const aliasSites = aliasedWriterImports(text);
    const rawSites = [...writeSitesOf(text), ...aliasSites].sort((a, b) => a.line - b.line);
    const asksWriteLaw = /writePermission\(/.test(text);
    const usesBoundary = BOUNDARY_CALL.test(text);
    /* The POPULATION rule is unchanged from 22 September — a raw write-shaped site or a boundary call makes an entry
     * point GOVERNED_STATE_CHANGE — so the denominator (40) is measured exactly as before. Only the ROUTING verdict
     * reads the site vocabulary below. */
    const cls = rawSites.length > 0 || usesBoundary ? "GOVERNED_STATE_CHANGE" : asksWriteLaw ? "UNKNOWN" : "READ_ONLY_DIAGNOSTIC";
    const opts = { file, registry };
    const siteDetail = rawSites.map((s) => (aliasSites.includes(s)
      ? { ...s, cls: "UNKNOWN", why: "a writer imported under an alias — invisible by name, so refused" }
      : { ...s, ...classifySite(text, s, opts) }));
    /* Derived, never declared — see AUDIT_STORE_REACHING above. A routed caller is never also exempt. */
    const internal = usesBoundary ? { exempt: false, conditionA: false, conditionB: false } : auditStoreInternalWrite(text, rawSites, opts);
    /* 🔴 ROUTED MEANS THE WRITE MOVED, NOT THAT A BOUNDARY CALL APPEARS SOMEWHERE IN THE FILE (LAW 3).
     *
     * `routed` once meant only "this file mentions executeGovernedWrite", and a caller with three writes, one routed,
     * counted as done — a false zero produced by doing MOST of the work. It then meant "boundary reached AND zero
     * write-SHAPED lines", which was honest but blind: a ledger handed TO the boundary looked like a write. It now
     * means: the boundary is reached AND no site is a DIRECT_DURABLE_WRITE or UNKNOWN — by the site rule above, which
     * reads what each line writes THROUGH. A surviving direct write still makes the caller PARTIALLY_ROUTED. */
    const callerClass = cls === "GOVERNED_STATE_CHANGE" ? callerClassOf({ sites: siteDetail, usesBoundary, exemption: internal }) : "READ_ONLY";
    const fullyRouted = callerClass === "BOUNDARY_ROUTED";
    const partiallyRouted = callerClass === "PARTIALLY_ROUTED";
    const sites = rawSites;
    const coverage = tests.filter((t) => testText.get(t).includes(file));
    return {
      file,
      command: `node ${file}`,
      actionType: cls === "GOVERNED_STATE_CHANGE" ? "AUTHORISED_WRITE" : "REPORT",
      permissionGuard: asksWriteLaw ? "write-law LOCAL (permission.mayWrite)" : "none — it writes nothing",
      targetClass: cls === "GOVERNED_STATE_CHANGE" ? targetClassOf(text) : "NONE",
      scope: "GLOBAL_PRODUCT",
      shape: shapeOf(text),
      auditRequired: cls === "GOVERNED_STATE_CHANGE",
      routed: fullyRouted,
      partiallyRouted,
      callerClass,
      siteDetail,
      directSites: siteDetail.filter((s) => s.cls === "DIRECT_DURABLE_WRITE" || s.cls === "UNKNOWN").length,
      reachesBoundary: usesBoundary,
      auditStoreExempt: callerClass === "CHECKED_AUDIT_STORE_EXEMPTION" && internal.exempt,
      exemption: internal,
      sites: sites.length,
      coverage,
      cls,
    };
  });
}

/**
 * 🔴 THE BYPASS CENSUS: a governed site that mutates without reaching the boundary. Must be empty.
 *
 * A caller carrying the CHECKED audit-store exemption is not a bypass — but it is not hidden either. It stays in
 * the GOVERNED_STATE_CHANGE denominator and is named by its class, so routed + exempt + bypass always sums to the
 * governed population. Removing it from the denominator would be the one move that makes a zero meaningless.
 */
export const BYPASS_CLASSES = Object.freeze(["DIRECT_DURABLE_WRITE", "PARTIALLY_ROUTED", "UNKNOWN"]);
export const bypasses = (rows) => rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE" && BYPASS_CLASSES.includes(r.callerClass));
export const auditStoreExempt = (rows) => rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE" && r.auditStoreExempt);
/** Governed callers that legitimately mutate nothing durable (a collector-only or read-only verdict). Named, never hidden. */
export const nonMutating = (rows) => rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE" && (r.callerClass === "COLLECTOR_OR_LIBRARY_WRITE" || r.callerClass === "READ_ONLY"));

/**
 * WHY `--check` FAILS, as data — the one decision the CLI exits on, so a proof can drive it with a stand-in registry.
 * Empty means green.
 */
export function checkVerdict(rows, verification = PRIMITIVE_VERIFICATION) {
  const why = [];
  for (const r of bypasses(rows)) why.push(`BYPASS ${r.file}`);
  for (const r of rows.filter((x) => x.cls === "UNKNOWN")) why.push(`UNKNOWN ${r.file}`);
  if (rows.some((r) => !CLASSES.includes(r.cls))) why.push("REMAINDER");
  for (const v of verification.filter((x) => !x.verified)) why.push(`UNVERIFIED_PRIMITIVE ${v.name}`);
  return why;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const rows = census();
  const by = rows.reduce((m, r) => ((m[r.cls] = (m[r.cls] ?? 0) + 1), m), {});
  console.log(`GOVERNED CALLER CENSUS — ${rows.length} production entry point(s) under bin/`);
  for (const c of CLASSES) console.log(`  ${c.padEnd(24)} ${by[c] ?? 0}`);
  const accounted = CLASSES.reduce((n, c) => n + (by[c] ?? 0), 0);
  console.log(`  ${"REMAINDER".padEnd(24)} ${rows.length - accounted}`);
  const governed = rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE");
  const missed = bypasses(rows);
  const exempt = auditStoreExempt(rows);
  const quiet = nonMutating(rows);
  console.log(`\n  GOVERNED_STATE_CHANGE ${governed.length} · routed ${governed.filter((r) => r.routed).length} · audit-store exempt ${exempt.length} · non-mutating ${quiet.length} · BYPASSING ${missed.length}`);
  console.log(`  routed + exempt + non-mutating + bypassing = ${governed.filter((r) => r.routed).length + exempt.length + quiet.length + missed.length} (must equal ${governed.length})`);
  const byCaller = governed.reduce((m, r) => ((m[r.callerClass] = (m[r.callerClass] ?? 0) + 1), m), {});
  console.log(`  caller classes: ${CALLER_CLASSES.map((c) => `${c} ${byCaller[c] ?? 0}`).join(" · ")}`);
  const allSites = governed.flatMap((r) => r.siteDetail);
  const bySite = allSites.reduce((m, s) => ((m[s.cls] = (m[s.cls] ?? 0) + 1), m), {});
  console.log(`  write-shaped sites ${allSites.length}: ${SITE_CLASSES.map((c) => `${c} ${bySite[c] ?? 0}`).join(" · ")}`);
  if (process.argv.includes("--sites")) for (const r of governed) for (const s of r.siteDetail) console.log(`    ${r.file}:${s.line} ${s.cls} — ${s.why}`);
  for (const r of exempt) console.log(`  EXEMPT ${r.file} — audit-store internal write (A: only audit-store targets · B: live write-gate event at line ${r.exemption.gateLine}, before the mutation at ${r.exemption.firstMutation})`);
  console.log(`  entry points with NO named test coverage: ${rows.filter((r) => r.coverage.length === 0).length}`);
  if (process.argv.includes("--table")) {
    console.log("\n  path · shape · target · sites · routed · tests");
    for (const r of rows) console.log(`  ${r.file.padEnd(36)} ${r.cls.padEnd(22)} ${r.shape.padEnd(24)} ${r.targetClass.padEnd(22)} ${String(r.sites).padStart(2)} ${r.routed ? "ROUTED" : "-     "} ${r.coverage.length}`);
  }
  const unverified = PRIMITIVE_VERIFICATION.filter((v) => !v.verified);
  console.log(`  AUDIT_STORE_ONLY_PRIMITIVES declared ${PRIMITIVE_VERIFICATION.length} · verified ${PRIMITIVE_VERIFICATION.length - unverified.length} · UNVERIFIED ${unverified.length}`);
  for (const v of unverified) console.log(`  🔴 UNVERIFIED PRIMITIVE ${v.name} (${v.module}) — not registered: ${v.faults.join(" | ")}`);
  for (const r of rows.filter((x) => x.cls === "UNKNOWN")) console.log(`  🔴 UNKNOWN ${r.file} — blocks implementation until resolved by measurement`);
  for (const r of missed) {
    console.log(`  🔴 BYPASS ${r.file} — ${r.callerClass}${r.partiallyRouted ? `: it reaches the boundary AND still holds ${r.directSites} direct write site(s)` : ": a governed write outside the shared boundary"}`);
    for (const s of r.siteDetail.filter((x) => x.cls === "DIRECT_DURABLE_WRITE" || x.cls === "UNKNOWN")) console.log(`       ${r.file}:${s.line} ${s.cls} — ${s.why}`);
  }
  if (process.argv.includes("--check") && checkVerdict(rows).length) process.exit(1);
}
