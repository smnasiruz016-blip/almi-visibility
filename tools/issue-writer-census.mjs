#!/usr/bin/env node
/**
 * 🔴 EVERY WRITER OF ISSUE RECORDS PERSISTS THEM THROUGH appendIfNew — CHECKED
 * ON EVERY COMMIT, IN MILLISECONDS.
 *
 * ── WHY THIS EXISTS BESIDE THE RECORDED DOUBLE RUNS ─────────────────────────
 *
 * Item 48's real double runs (runs/audit/idempotency-double-run-*.json) prove
 * the audit writers WORKED, once, for real. But a test that reads that file
 * reads a FILE, not the code: if a writer stopped calling appendIfNew tomorrow,
 * the pinned JSON would still say zero duplicates and the suite would stay
 * green — LAW-FIXTURE-1 in a different hat. This census proves the writers are
 * STILL WIRED. Neither half is enough alone.
 *
 * ── THE POPULATION IS FOUND, NOT LISTED ─────────────────────────────────────
 *
 * A module is an ISSUE WRITER when it BUILDS issues — it imports `makeIssue`,
 * or it runs a check imported from `src/audit/` (whose `run()` returns an issue)
 * — AND it WRITES — it opens a store or calls a filesystem write. A hand-kept
 * list is exactly how the audit writers stayed outside item 48's population, so
 * a new writer joins this census by existing.
 *
 * ── WHAT A MEMBER MUST DO ───────────────────────────────────────────────────
 *
 *   1. make a real `.appendIfNew(` CALL (a comment or a string does not count);
 *   2. write nothing else by a path that cannot deduplicate — no filesystem
 *      write, and no `appendWithoutDedupe` / `appendAllWithoutDedupe` (or the
 *      old bare names) — unless that line is declared below with a reason this
 *      census CHECKS in the same file.
 *
 * ── ⚠️ BLIND SPOTS — THREE WERE DECLARED; ONE IS CLOSED, TWO STAY OPEN ──────
 *
 *   CLOSED (13 September 2026) — "a store passed in from another module". Not
 *   by a better census: by the STORE. The unsafe verb is now named
 *   `appendWithoutDedupe`, so a module handed a store from elsewhere cannot
 *   write past the dedupe without typing that word, and the word is loud in any
 *   diff whether or not this census ever reads the file.
 *
 *   OPEN — a writer reached through DYNAMIC DISPATCH (`store[verb](…)`, a verb
 *   held in a variable). A source scan cannot resolve a computed property name,
 *   and pretending to would be a heuristic that reports clean when it has not
 *   looked. Kept declared because a named limit is worth more than a quiet one.
 *
 *   OPEN — issues BUILT somewhere this file cannot see imported (a module that
 *   receives finished issue objects and writes them, building none itself). The
 *   population rule is "builds AND writes"; such a module writes and does not
 *   build, so it is not in the population. The store rename narrows the harm —
 *   it would still have to call appendIfNew or type appendWithoutDedupe — but
 *   this census does not find it, and says so.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/* Tokens built from parts so this file's own scan cannot report itself. */
const IF_NEW_CALL = new RegExp(["\\.append", "IfNew\\("].join(""));
// The bare names AND the renamed unsafe verbs: a rename must not become a way out of the census.
const BARE_APPEND = new RegExp(["\\.append", "(All)?(Without", "Dedupe)?\\("].join(""));
const FS_WRITE = new RegExp(["(write", "FileSync|append", "FileSync|create", "WriteStream)\\("].join(""));
/* 🔴 A check imported RELATIVELY counts too. When the robots/DNS audit moved
 * from bin/audit.mjs into src/audit/run-audit.mjs it imports "./checks.mjs" —
 * and a pattern that only knew "src/audit/" would have let the real issue
 * writer drop out of the population the moment it moved. */
const BUILDS_ISSUES = [
  new RegExp(["\\bmake", "Issue\\b"].join("")),
  /from\s+["'](?:[^"']*\/src\/audit\/|\.\/)[^"'/]*check[^"'/]*\.mjs["']/,
];
const OPENS_STORE = new RegExp(["create", "JsonlStore\\("].join(""));
/* 🔴 ROUTED PERSISTENCE COUNTS, AND THIS CENSUS WENT BLIND WITHOUT IT.
 *
 * A caller routed through the governed-write boundary no longer contains the words `.appendIfNew(` — it names the
 * discipline and the boundary performs it. The moment two writers were routed they dropped straight out of this
 * population, which is exactly the failure the sibling test warns about: "if a writer stopped calling appendIfNew
 * tomorrow, the file would still say zero duplicates." Losing them silently would have been worse than a red test.
 *
 * Built from parts, like the patterns above, so this file does not read itself as a writer. */
const ROUTED_PERSIST = new RegExp(["governed", "StoreAppend\\("].join(""));
const ROUTED_IF_NEW = new RegExp(["discipline:\\s*[\"']APPEND", "_IF_NEW[\"']"].join(""));

/**
 * 🔴 DECLARED NON-ISSUE WRITES — each with a claim CHECKED in the same file.
 * An exemption nobody verifies is a hole; each `proof` must match the source.
 */
export const DECLARED = Object.freeze([
  {
    file: "bin/supersede-noindex.mjs",
    // Built from parts: written as a literal, the duplicate-writer census read
    // this very line as a bare append — this file reporting itself.
    line: new RegExp(["store\\.app", "end(All)?(Without", "Dedupe)?\\(changes\\)"].join("")),
    why: "appends issue_state_change records, not issues; built only from pending OPEN issues, so a re-run appends none",
    proof: /changes\.push\(\s*makeIssueStateChange\(/,
  },
]);

const isComment = (l) => /^\s*(\/\/|\*|\/\*)/.test(l);
const isImport = (l) => /^\s*import\b/.test(l);

export function issueWriterCensus({ repo = REPO, sources = null } = {}) {
  const files = sources
    ? sources.map((s) => s.file)
    : execFileSync("git", ["ls-files", "bin", "src", "tools"], { cwd: repo, encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".mjs"));
  const textOf = (f) => (sources ? sources.find((s) => s.file === f).text : readFileSync(join(repo, f), "utf8"));

  const population = [];
  for (const file of files) {
    // The definitions are not writers: records.mjs defines makeIssue, check.mjs builds issues and writes nothing.
    const text = textOf(file);
    const lines = text.split(/\r?\n/);
    const code = lines.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => !isComment(l));
    const builds = BUILDS_ISSUES.some((re) => code.some(({ l }) => re.test(l)));
    const writes = code.some(({ l }) => !isImport(l) && (OPENS_STORE.test(l) || FS_WRITE.test(l) || BARE_APPEND.test(l) || IF_NEW_CALL.test(l) || ROUTED_PERSIST.test(l)));
    const persists = code.some(({ l }) => !isImport(l) && (FS_WRITE.test(l) || BARE_APPEND.test(l) || IF_NEW_CALL.test(l) || ROUTED_PERSIST.test(l)));
    if (!builds || !writes || !persists) continue;

    /* Still wired to appendIfNew — either by calling it, or by naming it as the discipline the boundary performs. */
    const callsIfNew = code.some(({ l }) => !isImport(l) && (IF_NEW_CALL.test(l) || ROUTED_IF_NEW.test(l)) && !/^\s*["'`]/.test(l.trim()));
    const other = code
      .filter(({ l }) => !isImport(l) && !IF_NEW_CALL.test(l) && (BARE_APPEND.test(l) || FS_WRITE.test(l)))
      .map(({ l, n }) => {
        const d = DECLARED.find((x) => x.file === file && x.line.test(l));
        return { line: n, text: l.trim().slice(0, 110), declared: Boolean(d && d.proof.test(text)), why: d?.why ?? null };
      });
    const undeclared = other.filter((o) => !o.declared);
    population.push({ file, callsIfNew, otherWrites: other, undeclared, ok: callsIfNew && undeclared.length === 0 });
  }
  return { scanned: files.length, population: population.sort((a, b) => a.file.localeCompare(b.file)), failures: population.filter((p) => !p.ok) };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const r = issueWriterCensus();
  console.log(`ISSUE-WRITER CENSUS [bound: ${r.scanned} git-tracked .mjs under bin/, src/, tools/ · population found from the code: ${r.population.length}]`);
  for (const p of r.population) {
    console.log(`  ${p.ok ? "✅" : "🔴"} ${p.file}  appendIfNew call: ${p.callsIfNew ? "yes" : "🔴 NO"}`);
    for (const o of p.otherWrites) console.log(`       ${o.declared ? "declared" : "🔴 UNDECLARED"}  :${o.line}  ${o.text}${o.why ? `   (${o.why})` : ""}`);
  }
  console.log(r.failures.length ? `\n🔴 ${r.failures.length} issue writer(s) are not wired to appendIfNew` : "\n✅ every issue writer persists through appendIfNew");
  process.exit(r.failures.length ? 1 : 0);
}
