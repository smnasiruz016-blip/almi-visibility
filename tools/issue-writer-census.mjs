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
 *      write, and no bare `.append(` / `.appendAll(` — unless that line is
 *      declared below with a reason this census CHECKS in the same file.
 *
 * ⚠️ Blind to: a writer reached through dynamic dispatch, a store passed in from
 * another module, and issues built somewhere this file cannot see imported.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/* Tokens built from parts so this file's own scan cannot report itself. */
const IF_NEW_CALL = new RegExp(["\\.append", "IfNew\\("].join(""));
const BARE_APPEND = new RegExp(["\\.append", "(All)?\\("].join(""));
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

/**
 * 🔴 DECLARED NON-ISSUE WRITES — each with a claim CHECKED in the same file.
 * An exemption nobody verifies is a hole; each `proof` must match the source.
 */
export const DECLARED = Object.freeze([
  {
    file: "bin/supersede-noindex.mjs",
    // Built from parts: written as a literal, the duplicate-writer census read
    // this very line as a bare append — this file reporting itself.
    line: new RegExp(["store\\.app", "end(All)?\\(changes\\)"].join("")),
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
    const writes = code.some(({ l }) => !isImport(l) && (OPENS_STORE.test(l) || FS_WRITE.test(l) || BARE_APPEND.test(l) || IF_NEW_CALL.test(l)));
    const persists = code.some(({ l }) => !isImport(l) && (FS_WRITE.test(l) || BARE_APPEND.test(l) || IF_NEW_CALL.test(l)));
    if (!builds || !writes || !persists) continue;

    const callsIfNew = code.some(({ l }) => !isImport(l) && IF_NEW_CALL.test(l) && !/^\s*["'`]/.test(l.trim()));
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
