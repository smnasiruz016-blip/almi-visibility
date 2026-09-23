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

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { census, ANY_WRITE_PATTERN } from "./no-generation-census.mjs";
import { PERMITTED_PAGE_WRITERS, PERMITTED_LOCAL_WRITERS, KNOWN_UNGATED_WRITERS } from "../config/permitted-page-writers.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const indentOf = (line) => line.match(/^\s*/)[0].length;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The four fields the ruling requires, plus the two that are checked. */
export const REQUIRED_FIELDS = Object.freeze(["writes", "where", "gatedBy", "why"]);

/** Is the write on `lineNo` (1-based) behind `token`? Three answers, never two. */
export const GATE_STATES = Object.freeze(["GATED", "UNGATED", "CANNOT_DETERMINE"]);

/* ── 🔴 THREE OUTCOMES, BECAUSE TWO INVENTED ELEVEN DEFECTS (16 September 2026) ─────────────────
 *
 * This function used to answer `{gated: true|false}`. A shape it could not READ therefore fell to
 * `false` — "I cannot determine" written down as "no gate". On 16 September the widened census
 * reported ELEVEN binaries as ungated on exactly that fall-through; every one of them was then
 * measured running with no flags and left every target file byte-identical, and they had already
 * been DECLARED in KNOWN_UNGATED_WRITERS as defects that do not exist.
 *
 * 🔴 LAW-ABSENT-1, APPLIED TO THE CENSUS ITSELF: the absence of a RECOGNISED gate shape is not
 * evidence of no gate. UNCLASSIFIED never defaults to safe, and never defaults to broken.
 *
 * So the third state is not a softening — it is the honest answer, and it is counted in its own
 * column. The danger it guards against runs both ways: a detector widened until it can read
 * everything stops being able to go red, and calling unsafe control flow GATED is worse than the
 * blind spot this replaces.
 *
 * @returns {{ state: "GATED"|"UNGATED"|"CANNOT_DETERMINE", gated: boolean, by: string|null, why: string|null }}
 *   `gated` stays a boolean for every existing caller, and it is true ONLY for GATED.
 */
const GATED = (by) => ({ state: "GATED", gated: true, by, why: null });
const UNGATED = (why) => ({ state: "UNGATED", gated: false, by: null, why });
const UNREADABLE = (why) => ({ state: "CANNOT_DETERMINE", gated: false, by: null, why });

export function gateOf(lines, lineNo, token) {
  const tokenRe = new RegExp(`(^|[^\\w.$])${escape(token)}(?![\\w$])`);
  const negRe = new RegExp(`!\\s*${escape(token)}(?![\\w$])`);
  const site = lines[lineNo - 1];
  if (tokenRe.test(site) && !negRe.test(site)) return GATED(`line ${lineNo}`);

  /* ── THE SITE LINE *IS* THE `else`: `if (!token) log();` / `else { write }` ────────────────────
   * Four binaries write exactly this way — acceptance-test:228, cost-ledger:76,
   * diagnose-overlap:170, measure-text-kind:100 — the report and the write one statement each on
   * two lines. 🔴 A walk that only looks ABOVE the site never sees the `else`, because the `else`
   * IS the site. That is why all four read as unreadable, and it is a blind spot, not a shape. */
  if (/^\}?\s*else\b/.test(site.trim())) {
    for (let k = lineNo - 2; k >= 0; k -= 1) {
      if (!lines[k].trim()) continue;
      if (!/^(\}\s*)?(else\s+)?if\s*\(/.test(lines[k].trim())) break;
      if (negRe.test(lines[k])) return GATED(`else of line ${k + 1}`);
      break;
    }
  }

  /* ── THE GUARDED ELSE, ATTACHED TO A TOP-LEVEL `if (!token)` ────────────────────────────────
   * `if (!token) report(); else { write }` and its `else if` form. The write runs only when the
   * token is true, because the false case is consumed by the branch above it. This is the shape
   * of four one-line guards and of supersede-noindex's `else if (records.length)`. */
  for (let j = lineNo - 2; j >= 0; j -= 1) {
    const t = lines[j].trim();
    if (!t) continue;
    if (indentOf(lines[j]) > indentOf(site)) continue;
    const attachedElse = /^\}?\s*else\b/.test(t) || /\belse\b\s*\{?\s*$/.test(t);
    if (attachedElse) {
      // Walk up to the `if (...)` this else belongs to.
      for (let k = j; k >= 0; k -= 1) {
        const open = lines[k].trim();
        if (!/^(\}\s*)?if\s*\(/.test(open)) continue;
        if (negRe.test(lines[k])) return GATED(`else of line ${k + 1}`);
        break;
      }
    }
    break;
  }

  /* ── 🔴 THE EARLY-EXIT GUARD, WHICH THIS FUNCTION USED TO CALL "UNGATED" ──────────────────────
   *
   * The walk below reads ENCLOSING blocks by indentation, so it can only see a gate that WRAPS the
   * write. A guard that says `if (!permission.mayWrite) { …; process.exit(0); }` and then falls
   * through to a TOP-LEVEL write has no enclosing block at all — and the header above admitted the
   * blind spot while calling it "the strict direction".
   *
   * 🔴 IT WAS NOT STRICT, IT WAS WRONG, AND IT COST SOMETHING. On 16 September 2026 the widened
   * census reported ELEVEN binaries as ungated on exactly this shape; every one of them was then
   * measured running with no flags and left every target file byte-identical. They had already
   * been DECLARED in KNOWN_UNGATED_WRITERS as defects that do not exist. A detector that cannot
   * see a real gate does not fail safe — it manufactures work and buries the true signal among
   * false ones.
   *
   * So a write is gated when, ABOVE it and at the top level of the same file, a block opened by
   * `if (!token)` leaves the program: `process.exit(...)` or a bare `return`. Anything else in that
   * block (a log line, a report of what would have been written) is irrelevant — what matters is
   * that the write below is unreachable when the token is false. */
  const siteIndent = indentOf(site);
  /** An `if (!token)` block that does NOT leave: after it closes, control reaches the write. */
  let fellThrough = null;
  for (let j = lineNo - 2; j >= 0; j -= 1) {
    const open = lines[j];
    const t = open.trim();
    if (!t) continue;
    // Only a guard at or outside the site's own nesting can make the site unreachable.
    if (indentOf(open) > siteIndent) continue;
    if (!/^(\}\s*else\s+)?if\s*\(/.test(t) || !negRe.test(open)) continue;

    /* `if (!token) …` — does the block LEAVE before the write, merely report and fall through, or
     * hand the write to a LATER BRANCH of its own if/else chain? */
    const guardIndent = indentOf(open);
    const braces = [];
    for (let k = j + 1; k < lineNo - 1; k += 1) {
      if (!lines[k].trim() || indentOf(lines[k]) !== guardIndent) continue;
      if (/^\}/.test(lines[k].trim())) braces.push(k);
    }
    if (!braces.length) {
      // Nothing closed above the site: a single-statement guard, or the site is INSIDE the block.
      if (/\bprocess\.exit\s*\(|\breturn\b/.test(t)) return GATED(`early exit of line ${j + 1}`);
      continue;
    }
    /* 🔴 `} else if (records.length) {` IS NOT THE END OF THE CONSTRUCT — IT OPENS THE NEXT BRANCH.
     * supersede-noindex:145 writes inside such a branch, reachable only when the token is true.
     * Reading that brace as "the guard closed, control falls through" is exactly what turned a
     * genuinely gated write into an ungated FINDING. The brace that ends a chain carries no else. */
    if (/^\}\s*else\b/.test(lines[braces[braces.length - 1]].trim())) return GATED(`else of line ${j + 1}`);
    const body = lines.slice(j + 1, braces[0]).join("\n");
    if (/\bprocess\.exit\s*\(|^\s*return\b/m.test(body)) return GATED(`early exit of line ${j + 1}`);
    // 🔴 It only reports. The write below is REACHABLE with the token false — a real defect shape.
    fellThrough = j + 1;
  }

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
          if (negRe.test(lines[j])) return GATED(`else of line ${j + 1}`);
          break;
        }
      }
      continue;
    }
    if (/^(\}\s*else\s+)?if\s*\(/.test(t)) {
      // 🔴 RETURN, DO NOT RECORD AND CARRY ON. The write sits in the branch taken when writing is
      // NOT permitted; an OUTER positive test must never be allowed to overturn that into GATED.
      // "A detector that calls unsafe control flow GATED is worse than the original blind spot."
      if (negRe.test(t)) return UNGATED(`the write is INSIDE \`if (!${token})\` at line ${i + 1} — that branch runs when writing is NOT permitted`);
      if (tokenRe.test(t)) return GATED(`line ${i + 1}`);
    }
  }

  /* ── 🔴 THE THIRD STATE, DECIDED — NEVER A FALL-THROUGH ──────────────────────────────────────
   * Each branch below states WHY. An UNGATED verdict must rest on control flow that provably
   * reaches the write; anything else is CANNOT_DETERMINE, which is a correct answer and not a
   * failure. The four unsafe shapes stay UNGATED, and that is what keeps this able to go red. */
  if (fellThrough !== null) {
    return UNGATED(`the \`if (!${token})\` at line ${fellThrough} only reports and falls through — control reaches this write with no permission`);
  }
  const testedAbove = lines.slice(0, lineNo - 1).some((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && tokenRe.test(l));
  if (!testedAbove) {
    return UNGATED(`\`${token}\` is never tested above this line — control flow reaches the write unguarded`);
  }
  return UNREADABLE(`\`${token}\` is tested above line ${lineNo}, but not in a shape this detector reads — it may or may not guard this write`);
}

/** Does this file let an operator choose where it writes? */
export function destinationFlagIn(text) {
  // 🔴 Three spellings exist in bin/ today — `arg("out")`, `"--out="` and
  // `flag("out")`. A first version knew two and declared profession-chain's
  // destination wrongly; the mismatch check is what caught it.
  //
  // 🔴 AND `store` IS A FOURTH NAME FOR THE SAME THING, added 16 September 2026 (gap 2). The Search
  // Console ingest lets an operator choose its destination with `--store=`, which is exactly what
  // this field is for — and because the detector did not know the word, the register declared that
  // writer's destination wrongly and the mismatch check caught it, a second time and the same way.
  // The lesson is the one already written above: a destination has more than one spelling, and the
  // detector learns them rather than the register lying about them.
  return /(?:arg|flag)\(\s*["'](?:--)?(out|corpus|store)["']|["']--(?:out|store)[="']/.test(text);
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

/* ══════════════════════════════════════════════════════════════════════════════════════════════ *
 * 🔴 GAP 2 — EVERY WRITE PATH, NOT ONLY THE PAGE ONES.
 *
 * `analyseWriters` below reconciles PAGE writes against the page register, and that is all it ever
 * did. A CSV export into runs/, an append into an evidence store, a cost-ledger entry — none of them
 * were in the population the write law was enforced over, which is how six binaries came to write
 * with no gate at all while a census stood beside them reporting nothing wrong.
 *
 * ── 🔴 WHY THE EARLIER FIGURE SAID FOUR, AND WHAT THAT TEACHES THIS ONE ────────────────────────
 *
 * The count that found "four" detected writes by PRIMITIVE NAME, so every write reached through a
 * helper — `appendIfNew`, `ledger.append` — was never in the population at all. That is the same
 * error shape as the PAGE_WRITE census it was meant to expose: IT CHECKED THE FILE, NOT THE WRITE
 * SITE. So a helper call IS a write site here, and the reaching binaries are resolved from the
 * import graph rather than assumed.
 *
 * ── 🔴 WHAT THIS CANNOT SEE, STATED RATHER THAN IMPLIED ────────────────────────────────────────
 *
 *   · a computed import, or a module reached through a variable — the graph is read statically
 *   · a path held only as text and run by something else (a shell script, a workflow, a human)
 *   · a consumer outside src/, bin/ and tools/ — node_modules included
 *   · WHETHER A SITE IN A MODULE IS GATED AT ITS CALLER. A module that receives a store as a
 *     parameter cannot be judged from its own source: the gate is the caller's choice of store.
 *     Those sites are reported GATED-AT-CALLER, never counted as gated, and the dynamic incident
 *     tests in test/ungated-writers.test.mjs are what actually prove them.
 * ══════════════════════════════════════════════════════════════════════════════════════════════ */

/** Tokens built from parts, so this file's own scan never reports itself. */
/* 🔴 D-CENSUS-1 (17 September 2026): `appendAll` matched only `appendAll(`, so the store's real bulk verb
 * `appendAllWithoutDedupe(` was never a site — three bin call sites were missing from the enumeration. */
const helperVerbs = [["append", "IfNew"].join(""), ["append", "All"].join(""), ["append", "WithoutDedupe"].join(""), ["persist", "CrawlObservations"].join(""), ["append", "AllWithoutDedupe"].join("")];
const HELPER_WRITE = new RegExp(`\\b(?:${helperVerbs.join("|")})\\(|\\.${["app", "end"].join("")}\\(`);

/* ══ 🔴 GAP 2 · THREE PROVED FALSE-POSITIVE SHAPES — AND ONLY THOSE (owner ruling, 16 September 2026) ══
 *
 * A helper verb followed by "(" was counted as a write wherever it appeared. Read by syntax and
 * enclosing scope, seven of the twelve sites this census reported in src/evidence/store.mjs are not
 * writes (runs/audit/gap2-close-decision-2026-09-16.txt). Exactly three shapes were proved there, so
 * exactly three are recognised here — nothing is generalised to a shape nobody measured:
 *
 *   declaration    — the line DECLARES a helper-named function (`function appendIfNew(…) {`); the
 *                    writes inside its body are sites of their own, on their own lines.
 *   string-literal — the WHOLE line is one quoted string (a continued error message that names a
 *                    helper); text is not a call.
 *   dry-run-call   — an unqualified helper call inside the dry-run store factory, whose body holds no
 *                    write primitive and no qualified store call: the callee is that factory's own
 *                    in-memory function.
 *
 * 🔴 THE FAILURE DIRECTION IS A MISSED WRITE, SO EVERY SHAPE IS NARROWED AGAINST IT: a line that
 * names a write PRIMITIVE is always a site; a declaration line that also calls a helper is a site; the
 * dry-run shape switches itself off the moment that factory's body gains a primitive or a qualified
 * store call, or its extent cannot be read. An excluded line is REPORTED (excludedNonWrites), never
 * silently dropped. test/gap2-census-non-write-shapes.test.mjs holds each shape and each real write.
 */
const HELPER_DECLARATION = new RegExp(`\\bfunction\\s+(?:${helperVerbs.join("|")})\\s*\\(`);
const WHOLE_LINE_STRING = /^\s*(["'])(?:\\.|(?!\1).)*\1\s*[,+;)]*\s*$/;
const DRY_RUN_FACTORY = new RegExp(`\\bfunction\\s+${["create", "DryRun", "Store"].join("")}\\s*\\(`);
const UNQUALIFIED_HELPER_CALL = new RegExp(`(?:^|[^.\\w])(?:${helperVerbs.join("|")})\\(`);
const QUALIFIED_HELPER_CALL = new RegExp(`\\.(?:${helperVerbs.join("|")})\\(|\\.${["app", "end"].join("")}\\(`);

/** Index of the line closing the block opened on line `start`, by brace balance; -1 if it cannot be read. */
function blockEnd(lines, start) {
  let depth = 0;
  let opened = false;
  for (let j = start; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === "{") { depth++; opened = true; } else if (ch === "}") depth--;
    }
    if (opened && depth === 0) return j;
    if (depth < 0) return -1;
  }
  return -1;
}

/**
 * Which proved non-write shape line `i` has, or null — null means "count it".
 * @returns {null | "declaration" | "string-literal" | "dry-run-call"}
 */
export function nonWriteShapeOf(lines, i) {
  const line = lines[i];
  if (ANY_WRITE_PATTERN.test(line)) return null;
  if (HELPER_DECLARATION.test(line) && !HELPER_WRITE.test(line.replace(HELPER_DECLARATION, "function _("))) return "declaration";
  if (WHOLE_LINE_STRING.test(line)) return "string-literal";
  if (UNQUALIFIED_HELPER_CALL.test(line) && !QUALIFIED_HELPER_CALL.test(line)) {
    for (let s = i - 1; s >= 0; s--) {
      if (!DRY_RUN_FACTORY.test(lines[s])) continue;
      const e = blockEnd(lines, s);
      if (e < i) return null;
      const body = lines.slice(s, e + 1);
      if (body.some((l) => ANY_WRITE_PATTERN.test(l) || QUALIFIED_HELPER_CALL.test(l))) return null;
      return "dry-run-call";
    }
  }
  return null;
}

/** What a site writes, decided by the path or store it names. Frozen, and `other` is never a default nobody reads. */
/* 🔴 ORDER MATTERS, AND `page` IS LAST FOR A REASON. A first version put `page` first and matched
 * `html` anywhere on the line, so a brotli archive and a JSON evidence file were both reported as
 * PAGE writes. A census whose classes are wrong is worse than none: it is a wrong answer wearing a
 * measurement's clothes. `page` now requires an HTML DESTINATION, not the mention of html. */
export const WRITE_CLASSES = Object.freeze({
  ledger: /\bledger\b|runs\/cost\b/,
  export: /runs\/export\b|\.csv\b|CHECKLIST_BOUNDARIES/,
  evidence: /runs\/(?:evidence|crawl|audit|replay|render|discovery)\b|\.jsonl\b|\bstore\b|\bcorpus\b|\.br\b/,
  page: /\.html\b|\bhtmlFile\b|\boutFile\b.*\.html/,
});

export function classOfSite(line, fileText = "") {
  for (const [name, re] of Object.entries(WRITE_CLASSES)) if (re.test(line)) return name;
  // The destination is often named a line or two above; fall back to the file's own subject.
  for (const [name, re] of Object.entries(WRITE_CLASSES)) if (re.test(fileText)) return name;
  return "other";
}

/** Every import this module resolves to, as repo-relative paths. Static only — a computed import is invisible. */
export function importsOf(file, text) {
  const dir = file.slice(0, file.lastIndexOf("/") + 1);
  return [...text.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => {
    const parts = (dir + m[1]).split("/");
    const out = [];
    for (const p of parts) {
      if (p === "." || p === "") continue;
      if (p === "..") out.pop();
      else out.push(p);
    }
    return out.join("/");
  });
}

/**
 * Every write site under src/, bin/ and tools/ — filesystem primitives AND helper calls — with its
 * class, the binaries that reach it, and whether its own source gates it.
 */
export function writeSiteCensus({ repo = REPO, sources = null, register = [...PERMITTED_PAGE_WRITERS, ...PERMITTED_LOCAL_WRITERS], knownUngated = KNOWN_UNGATED_WRITERS } = {}) {
  const files = sources
    ? sources.map((s) => s.file)
    : [...new Set(execFileSync("git", ["ls-files", "src", "bin", "tools"], { cwd: repo, encoding: "utf8" }).split("\n").filter((p) => p.endsWith(".mjs")))].sort();
  const textOf = (f) => (sources ? sources.find((s) => s.file === f)?.text ?? "" : readFileSync(repo + f, "utf8"));
  const texts = new Map(files.map((f) => [f, textOf(f)]));

  // Which binaries reach each module, transitively, through static imports.
  const graph = new Map([...texts].map(([f, t]) => [f, importsOf(f, t).filter((i) => texts.has(i))]));
  const reachedBy = new Map(files.map((f) => [f, new Set()]));
  for (const bin of files.filter((f) => f.startsWith("bin/"))) {
    const seen = new Set();
    const walk = (f) => {
      if (seen.has(f)) return;
      seen.add(f);
      reachedBy.get(f)?.add(bin);
      for (const next of graph.get(f) ?? []) walk(next);
    };
    walk(bin);
  }

  const byFile = new Map(register.map((e) => [e.file, e]));
  const isCode = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/^\s*import\b/.test(l);
  const sites = [];
  const excludedNonWrites = [];
  for (const file of files) {
    const text = texts.get(file);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!isCode(line) || !(ANY_WRITE_PATTERN.test(line) || HELPER_WRITE.test(line))) return;
      const shape = nonWriteShapeOf(lines, i);
      if (shape) {
        excludedNonWrites.push({ file, line: i + 1, shape, text: line.trim().slice(0, 120) });
        return;
      }
      const entry = byFile.get(file);
      const token = entry?.gateToken ?? "permission.mayWrite";
      const g = gateOf(lines, i + 1, token);
      // A module that takes its store from a caller cannot be judged here — say so, never assume.
      const gatedAtCaller = !g.gated && !file.startsWith("bin/") && /\bstore\b|\bledger\b/.test(line);
      sites.push({
        file,
        line: i + 1,
        text: line.trim().slice(0, 120),
        class: classOfSite(line, text),
        viaHelper: HELPER_WRITE.test(line) && !ANY_WRITE_PATTERN.test(line),
        reachedBy: [...(reachedBy.get(file) ?? [])].sort(),
        declared: Boolean(entry),
        gateToken: entry?.gateToken ?? null,
        state: g.state,
        gated: g.gated,
        by: g.by,
        why: g.why,
        gatedAtCaller,
      });
    });
  }

  const byClass = Object.fromEntries(["page", "evidence", "export", "ledger", "other"].map((k) => [k, sites.filter((s) => s.class === k).length]));
  // 🔴 THE FAILURE CONDITION IS ABOUT ENTRY POINTS. A library write is reached through a binary, and
  // the binary is where an operator's flag lands; a site in src/ that its caller gates is not a defect.
  /* 🔴 `state === "UNGATED"`, NOT `!gated`. Those differ by exactly the third state, and that
   * difference is the whole defect: `!gated` swept every shape the detector could not read into
   * the defect list, which is how eleven binaries came to be declared as defects that do not exist.
   * A site this census cannot read is counted below, in its own column, and is NOT a finding. */
  const ungatedBins = sites.filter((s) => s.file.startsWith("bin/") && s.state === "UNGATED");
  const cannotDetermine = sites.filter((s) => s.state === "CANNOT_DETERMINE");
  /* 🔴 DECLARED IS NOT FIXED. Widening the census found eleven more ungated binaries than the six
   * this slot gates. A census that failed on all of them would fail the build on day one and be
   * switched off; one that passed on all of them could never go red. So the known ones are DECLARED
   * BY NAME (config/permitted-page-writers.mjs) and only an UNDECLARED one fails — and a name whose
   * writer no longer has an ungated site is STALE, so the list cannot rot into a blanket exemption. */
  const declaredUngated = new Set(knownUngated.map((e) => e.file));
  const ungatedFiles = new Set(ungatedBins.map((s) => s.file));
  /* 🔴 AN UNREADABLE NAME IS NOT A STALE NAME. Stale means "gated now, so the name must go"; a
   * file this census CANNOT READ has not been shown to be gated, and striking its name would be
   * the third state quietly collapsing into the first. It is carried, by name, as UNRESOLVED. */
  const unreadableFiles = new Set(cannotDetermine.map((s) => s.file));
  return {
    scanned: files.length,
    sites,
    /** 🔴 Lines that matched the write patterns and were proved NOT to be writes — reported, not dropped. */
    excludedNonWrites,
    byClass,
    viaHelper: sites.filter((s) => s.viaHelper).length,
    ungatedBins,
    declaredUngated: ungatedBins.filter((s) => declaredUngated.has(s.file)),
    undeclaredUngated: ungatedBins.filter((s) => !declaredUngated.has(s.file)),
    staleUngatedDeclarations: [...declaredUngated].filter((f) => !ungatedFiles.has(f) && !unreadableFiles.has(f)).sort(),
    unresolvedDeclarations: [...declaredUngated].filter((f) => unreadableFiles.has(f)).sort(),
    /* 🔴 THE THIRD STATE'S OWN COLUMN. Never folded into gated, never folded into ungated, never
     * summed into a clean total. An unreadable site MAY be hiding a real ungated writer — that is
     * LAW-ABSENT-1, and "we could not tell" is not "there is nothing there". */
    cannotDetermine,
    cannotDetermineBins: cannotDetermine.filter((s) => s.file.startsWith("bin/")),
    gatedAtCaller: sites.filter((s) => s.gatedAtCaller),
    cannotSee: [
      "a computed import, or a module reached through a variable",
      "a path held only as text and run by a shell script, a workflow or a human",
      "a consumer outside src/, bin/ and tools/, node_modules included",
      "whether a site in a module is gated at its CALLER — reported GATED-AT-CALLER, proved only by the incident tests",
    ],
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

  /* 🔴 A ROUTED WRITER IS NOT A STALE ONE — AND THE CLAIM IS CHECKED, NOT BELIEVED.
   *
   * This census equated "register entry with no write site" with "stale entry": a name left behind after the code
   * stopped writing. Routing a writer through the governed-write boundary produces exactly that shape for the
   * opposite reason — the write did not stop, it moved inside the boundary, which audits the attempt and the
   * outcome. Treating those as stale would have pushed every routed writer OUT of the register, which is where
   * its gate, its destination rule and its reason are recorded.
   *
   * So `routed: true` excuses the missing site only when the file really does reach the boundary. An entry that
   * claims it and does not is reported separately and fails — declaring is not doing. */
  const reachesBoundary = (file) => /executeGovernedWrite\(/.test(read(file));
  const routedEntries = register.filter((e) => e.routed === true);
  const routedNotReaching = routedEntries.filter((e) => !reachesBoundary(e.file)).map((e) => e.file).sort();
  const routedFiles = new Set(routedEntries.filter((e) => reachesBoundary(e.file)).map((e) => e.file));
  const stale = register.map((e) => e.file).filter((f) => !sitesByFile.has(f) && !routedFiles.has(f)).sort();
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
      const g = entry
        ? gateOf(lines, h.line, entry.gateToken)
        : { state: "UNGATED", gated: false, by: null, why: "no register entry names a gate token for this file" };
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
    routed: [...routedFiles].sort(),
    routedNotReaching,
    siteMismatch,
    incomplete,
    destinationMismatch,
    unconfined,
    sites,
    /* 🔴 UNGATED ONLY — a page write whose gate this detector cannot READ is not a page write that
     * DEFAULTS TO WRITING, and saying so would be the same false claim in the other direction. It
     * is carried below, by name, and it still fails: unreadable is not clean. */
    defaultsToWriting: sites.filter((s) => s.state === "UNGATED"),
    undeterminedGate: sites.filter((s) => s.state === "CANNOT_DETERMINE"),
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
    const verdict = { GATED: "gated   ", UNGATED: "🔴 DEFAULTS TO WRITING", CANNOT_DETERMINE: "⚠️ CANNOT DETERMINE" }[s.state];
    console.log(`  ${s.declared ? "named " : "🔴 UNNAMED"}  ${verdict}  ${s.file}:${s.line}${s.by ? `  (gate: ${s.by})` : ""}${s.state === "CANNOT_DETERMINE" ? `  — ${s.why}` : ""}`);
  }
  console.log(`  undeclared writers : ${r.undeclared.length ? r.undeclared.join(", ") : "0"}`);
  console.log(`  stale entries      : ${r.stale.length ? r.stale.join(", ") : "0"}`);
  console.log(`  site-count mismatch: ${r.siteMismatch.length ? JSON.stringify(r.siteMismatch) : "0"}`);
  console.log(`  entries missing a field: ${r.incomplete.length ? JSON.stringify(r.incomplete) : "0"}`);
  console.log(`  destination declared wrongly: ${r.destinationMismatch.length ? r.destinationMismatch.join(", ") : "0"}`);
  console.log(`  reasons stated: ${r.register.filter((e) => e.whyKnown).length} of ${r.register.length} — UNKNOWN: ${r.register.filter((e) => !e.whyKnown).map((e) => e.file).join(", ") || "none"}`);
  console.log(`  destination chosen by an operator flag: ${r.register.filter((e) => e.destinationOverridable).length} of ${r.register.length}`);
  console.log(`  NOT confined to this repository before the first write: ${r.unconfined.length ? r.unconfined.join(", ") : "0"}`);

  /* ── 🔴 GAP 2 — EVERY WRITE PATH, NOT ONLY THE PAGE ONES ──────────────────────────────────── */
  const w = writeSiteCensus();
  console.log("\nGAP 2 — THE WRITE-SITE CENSUS (every write path under src/, bin/, tools/)");
  console.log(`[bound: ${w.scanned} git-tracked .mjs files · ${w.sites.length} write site(s) · ${w.viaHelper} reached through a HELPER, which a primitive-name census cannot see at all]`);
  console.log(`  by class: ${Object.entries(w.byClass).map(([k, v]) => `${k}=${v}`).join("  ")}`);
  console.log(`  gated: ${w.sites.filter((s) => s.state === "GATED").length}   ungated in bin/: ${w.ungatedBins.length} (declared ${w.declaredUngated.length}, UNDECLARED ${w.undeclaredUngated.length})`);
  console.log(`  ⚠️ CANNOT_DETERMINE: ${w.cannotDetermine.length} site(s), ${w.cannotDetermineBins.length} in bin/ — its OWN column, folded into neither state (LAW-ABSENT-1)`);
  for (const s of w.cannotDetermine) console.log(`     ⚠️ UNREADABLE  ${s.file}:${s.line}  [${s.class}]  ${s.why}`);
  for (const s of w.undeclaredUngated) console.log(`     🔴 UNDECLARED, UNGATED  ${s.file}:${s.line}  [${s.class}]  ${s.text.slice(0, 70)}`);
  for (const s of w.declaredUngated) console.log(`     declared (next slot)    ${s.file}:${s.line}  [${s.class}]  ${s.text.slice(0, 70)}`);
  console.log(`  GATED-AT-CALLER — a module that takes its store from a caller; this census CANNOT judge it, the incident tests do: ${w.gatedAtCaller.length}`);
  for (const s of w.gatedAtCaller) console.log(`     ${s.file}:${s.line}  [${s.class}]  reached by ${s.reachedBy.join(", ") || "nothing"}`);
  if (w.staleUngatedDeclarations.length) console.log(`  🔴 STALE declaration(s) — gated now, so the name must go: ${w.staleUngatedDeclarations.join(", ")}`);
  console.log("  🔴 CANNOT SEE:");
  for (const c of w.cannotSee) console.log(`     · ${c}`);

  const hard = ["PRODUCT_REPO_WRITE", "PUBLISH", "BULK_GENERATION", "OUTSIDE_REPO_WRITE"].filter((k) => r.census.hits[k].length);
  const failed = hard.length > 0 || !r.reconciles || r.defaultsToWriting.length > 0 || r.unconfined.length > 0 ||
    r.undeterminedGate.length > 0 || w.undeclaredUngated.length > 0 || w.staleUngatedDeclarations.length > 0;
  console.log(`\n${failed ? "🔴 item 14's FAILURE condition is MET" : "✅ item 14's FAILURE condition is not met"}` +
    (r.defaultsToWriting.length ? ` — ${r.defaultsToWriting.length} write site(s) DEFAULT TO WRITING` : "") +
    (r.undeterminedGate.length ? ` — ${r.undeterminedGate.length} PAGE write site(s) whose gate CANNOT BE DETERMINED (unreadable is not clean)` : "") +
    (r.unconfined.length ? ` — ${r.unconfined.length} writer(s) NOT CONFINED to this repository` : "") +
    (hard.length ? ` — non-empty: ${hard.join(", ")}` : "") +
    (!r.reconciles ? " — the register does not reconcile" : ""));
  process.exit(failed ? 1 : 0);
}
