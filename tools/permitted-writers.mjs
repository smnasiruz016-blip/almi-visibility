#!/usr/bin/env node
/**
 * ITEM 14 · AMENDMENT 2 — THE CENSUS, THE REGISTER, AND WHETHER EACH WRITER
 * DEFAULTS TO WRITING.
 *
 * Three questions, answered from the source and never from a writer's comment:
 *
 *   1. RECONCILE — is every page write the census finds named in
 *      `config/permitted-page-writers.mjs`, with the right number of sites, and
 *      is every register entry still real?
 *   2. GATE — does every write site sit inside a condition on its declared gate
 *      token? A site that does not is a writer that DEFAULTS TO WRITING.
 *   3. DESTINATION — can an operator flag point the write anywhere?
 *
 * ── 🔴 HOW THE GATE IS FOUND, AND WHERE THAT METHOD IS BLIND ────────────────
 *
 * For each site: the line itself, then every ENCLOSING block opener above it
 * (a line with strictly smaller indentation). A site is gated if
 *   - its own line tests the token, or
 *   - an enclosing `if (...)` tests the token un-negated, or
 *   - an enclosing `else` belongs to an `if` that tests `!token`.
 * An enclosing `if (!token)` gates nothing — that branch runs when writing is
 * NOT permitted.
 *
 * It reads INDENTATION, so it trusts the formatter. An early `return` or
 * `process.exit` guarding a later top-level write is not recognised as a gate:
 * such a writer is reported UNGATED, which is the strict direction. It does not
 * check that the token is truly derived from a flag — the register says what
 * derives it, and `write-law.mjs` has its own tests.
 */

import { readFileSync } from "node:fs";

import { census, ANY_WRITE_PATTERN } from "./no-generation-census.mjs";
import { PERMITTED_PAGE_WRITERS } from "../config/permitted-page-writers.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const indentOf = (line) => line.match(/^\s*/)[0].length;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The four fields the ruling requires, plus the two that are checked. */
export const REQUIRED_FIELDS = Object.freeze(["writes", "where", "gatedBy", "why"]);

/**
 * Is the write on `lineNo` (1-based) behind `token`?
 * @returns {{ gated: boolean, by: string | null }}
 */
export function gateOf(lines, lineNo, token) {
  const tokenRe = new RegExp(`(^|[^\\w.$])${escape(token)}(?![\\w$])`);
  const negRe = new RegExp(`!\\s*${escape(token)}(?![\\w$])`);
  const site = lines[lineNo - 1];
  if (tokenRe.test(site) && !negRe.test(site)) return { gated: true, by: `line ${lineNo}` };

  let depth = indentOf(site);
  for (let i = lineNo - 2; i >= 0 && depth > 0; i -= 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const ind = indentOf(line);
    if (ind >= depth) continue;
    depth = ind;
    const t = line.trim();
    if (/^(\}\s*)?else\b/.test(t) && !/^(\}\s*)?else\s+if\b/.test(t)) {
      // Find the `if` this else belongs to: the nearest line above at the SAME indent opening an if.
      for (let j = i - 1; j >= 0; j -= 1) {
        if (!lines[j].trim() || indentOf(lines[j]) !== ind) continue;
        if (/^\s*(\}\s*else\s+)?if\s*\(/.test(lines[j])) {
          if (negRe.test(lines[j])) return { gated: true, by: `else of line ${j + 1}` };
          break;
        }
      }
      continue;
    }
    if (/^(\}\s*else\s+)?if\s*\(/.test(t) && tokenRe.test(t) && !negRe.test(t)) {
      return { gated: true, by: `line ${i + 1}` };
    }
  }
  return { gated: false, by: null };
}

/** Does this file let an operator choose where it writes? */
export function destinationFlagIn(text) {
  // 🔴 Three spellings exist in bin/ today — `arg("out")`, `"--out="` and
  // `flag("out")`. A first version knew two and declared profession-chain's
  // destination wrongly; the mismatch check is what caught it.
  return /(?:arg|flag)\(\s*["'](?:--)?(out|corpus)["']|["']--out[="']/.test(text);
}

/**
 * 🔴 (d) "WRITES ONLY INSIDE THIS REPOSITORY" — IS IT EXERCISED?
 *
 * A writer is confined when it calls `confineToRepo(` BEFORE its first
 * filesystem write. Read from the source, never from the register.
 *
 * ⚠️ WHAT THIS CANNOT SEE: that EVERY destination a writer uses passed through
 * the call — only that the call precedes the first write. The dynamic RED proof
 * in `test/write-confinement.test.mjs` points a real writer outside the
 * repository and watches it refuse; this static check is what stops a new
 * writer arriving without the call at all.
 */
export function confinementOf(text) {
  const lines = text.split(/\r?\n/);
  const code = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/^\s*import\b/.test(l);
  const firstConfine = lines.findIndex((l) => code(l) && /\bconfineToRepo\(/.test(l));
  const firstWrite = lines.findIndex((l) => code(l) && ANY_WRITE_PATTERN.test(l));
  return {
    firstConfineLine: firstConfine === -1 ? null : firstConfine + 1,
    firstWriteLine: firstWrite === -1 ? null : firstWrite + 1,
    confinedBeforeFirstWrite: firstConfine !== -1 && (firstWrite === -1 || firstConfine < firstWrite),
  };
}

/**
 * @param {object} [opts]
 * @param {Array}  [opts.sources]  INJECTED `[{file, text}]` — for RED proofs, never a back door
 * @param {Array}  [opts.register] INJECTED register — for RED proofs
 */
export function analyseWriters({ repo = REPO, sources = null, register = PERMITTED_PAGE_WRITERS } = {}) {
  const c = census({ repo, sources });
  const read = (file) => (sources ? sources.find((s) => s.file === file)?.text ?? "" : readFileSync(repo + file, "utf8"));

  const sitesByFile = new Map();
  for (const h of c.hits.PAGE_WRITE) sitesByFile.set(h.file, [...(sitesByFile.get(h.file) ?? []), h]);
  const byFile = new Map(register.map((e) => [e.file, e]));

  const undeclared = [...sitesByFile.keys()].filter((f) => !byFile.has(f)).sort();
  const stale = register.map((e) => e.file).filter((f) => !sitesByFile.has(f)).sort();
  const siteMismatch = register
    .filter((e) => sitesByFile.has(e.file) && sitesByFile.get(e.file).length !== e.sites)
    .map((e) => ({ file: e.file, declared: e.sites, found: sitesByFile.get(e.file).length }));
  const incomplete = register
    .map((e) => ({ file: e.file, missing: REQUIRED_FIELDS.filter((k) => typeof e[k] !== "string" || !e[k].trim()) }))
    .filter((e) => e.missing.length);

  const sites = [];
  for (const [file, hits] of [...sitesByFile.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const entry = byFile.get(file);
    const lines = read(file).split(/\r?\n/);
    for (const h of hits) {
      const g = entry ? gateOf(lines, h.line, entry.gateToken) : { gated: false, by: null };
      sites.push({ file, line: h.line, text: h.text, declared: Boolean(entry), gateToken: entry?.gateToken ?? null, ...g });
    }
  }

  const unconfined = [...sitesByFile.keys()].filter((f) => !confinementOf(read(f)).confinedBeforeFirstWrite).sort();

  const destinationMismatch = register
    .filter((e) => sitesByFile.has(e.file) && destinationFlagIn(read(e.file)) !== e.destinationOverridable)
    .map((e) => e.file);

  return {
    census: c,
    register,
    undeclared,
    stale,
    siteMismatch,
    incomplete,
    destinationMismatch,
    unconfined,
    sites,
    defaultsToWriting: sites.filter((s) => !s.gated),
    reconciles: undeclared.length === 0 && stale.length === 0 && siteMismatch.length === 0 && incomplete.length === 0,
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const r = analyseWriters();
  console.log("ITEM 14 — THE REGISTER OF PERMITTED PAGE WRITERS, RECONCILED\n");
  console.log(`[bound: ${r.census.scanned} git-tracked .mjs files under src/, bin/, tools/ · register ${r.register.length} entries]`);
  console.log("🔴 CANNOT SCAN: dynamic dispatch, workflow YAML, node_modules, or anything a human does by hand.\n");

  for (const key of ["PRODUCT_REPO_WRITE", "PUBLISH", "BULK_GENERATION", "OUTSIDE_REPO_WRITE"]) {
    const n = r.census.hits[key].length;
    console.log(`${n === 0 ? "✅" : "🔴"} ${key}: ${n}`);
    for (const h of r.census.hits[key]) console.log(`     ${h.file}:${h.line}  ${h.text}`);
  }
  console.log(`   PAGE_WRITE: ${r.census.hits.PAGE_WRITE.length} site(s) in ${new Set(r.census.hits.PAGE_WRITE.map((h) => h.file)).size} file(s)\n`);

  console.log("RECONCILIATION — census against register, line by line:");
  for (const s of r.sites) {
    console.log(`  ${s.declared ? "named " : "🔴 UNNAMED"}  ${s.gated ? "gated   " : "🔴 DEFAULTS TO WRITING"}  ${s.file}:${s.line}${s.by ? `  (gate: ${s.by})` : ""}`);
  }
  console.log(`  undeclared writers : ${r.undeclared.length ? r.undeclared.join(", ") : "0"}`);
  console.log(`  stale entries      : ${r.stale.length ? r.stale.join(", ") : "0"}`);
  console.log(`  site-count mismatch: ${r.siteMismatch.length ? JSON.stringify(r.siteMismatch) : "0"}`);
  console.log(`  entries missing a field: ${r.incomplete.length ? JSON.stringify(r.incomplete) : "0"}`);
  console.log(`  destination declared wrongly: ${r.destinationMismatch.length ? r.destinationMismatch.join(", ") : "0"}`);
  console.log(`  reasons stated: ${r.register.filter((e) => e.whyKnown).length} of ${r.register.length} — UNKNOWN: ${r.register.filter((e) => !e.whyKnown).map((e) => e.file).join(", ") || "none"}`);
  console.log(`  destination chosen by an operator flag: ${r.register.filter((e) => e.destinationOverridable).length} of ${r.register.length}`);
  console.log(`  NOT confined to this repository before the first write: ${r.unconfined.length ? r.unconfined.join(", ") : "0"}`);

  const hard = ["PRODUCT_REPO_WRITE", "PUBLISH", "BULK_GENERATION", "OUTSIDE_REPO_WRITE"].filter((k) => r.census.hits[k].length);
  const failed = hard.length > 0 || !r.reconciles || r.defaultsToWriting.length > 0 || r.unconfined.length > 0;
  console.log(`\n${failed ? "🔴 item 14's FAILURE condition is MET" : "✅ item 14's FAILURE condition is not met"}` +
    (r.defaultsToWriting.length ? ` — ${r.defaultsToWriting.length} write site(s) DEFAULT TO WRITING` : "") +
    (r.unconfined.length ? ` — ${r.unconfined.length} writer(s) NOT CONFINED to this repository` : "") +
    (hard.length ? ` — non-empty: ${hard.join(", ")}` : "") +
    (!r.reconciles ? " — the register does not reconcile" : ""));
  process.exit(failed ? 1 : 0);
}
