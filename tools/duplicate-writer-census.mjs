#!/usr/bin/env node
/**
 * 🔴 WHICH WRITERS DUPLICATE A RECORD WHEN THE SAME JOB RUNS TWICE?
 *
 * Two were found by accident: the Search Console ingest (fixed in PR #36) and
 * the technical audit writer (found 12 September 2026, every issue stored
 * twice). This looks for the rest ON PURPOSE, two independent ways, so a blind
 * reading cannot report a clean zero:
 *
 *   1. SOURCE — every `.append(` / `.appendAll(` / `appendFileSync(` call site
 *      under bin/, src/ and tools/, classified GUARDED when the write is
 *      `appendIfNew`, or when the enclosing few lines test for an existing
 *      record first; UNGUARDED otherwise.
 *   2. DATA — every stored `runs/**.jsonl`, counted for the same logical record
 *      written more than once: an issue_id twice, an observation's
 *      measurement_key twice, or any other record identical apart from its clock.
 *
 * ⚠️ The source reading is a heuristic over a few lines and says so. The data
 * reading is exact but only sees jobs that have in fact been run twice. A
 * writer UNGUARDED in source with no doubles in data has simply not been
 * re-run yet — it is still a defect.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/* Tokens built from parts, so this file's own scan does not report itself. */
// The bare names AND the renamed unsafe verbs (13 Sep 2026) — a rename is not a way out.
const APPEND_CALL = new RegExp(["\\.app", "end(All)?(Without", "Dedupe)?\\(|app", "endFileSync\\("].join(""));
const IF_NEW = ["append", "IfNew"].join("");
/* 🔴 CORRECTED ON ITS FIRST RUN, IN BOTH DIRECTIONS.
 * The first pattern was `\b(already|existing|exists?|has\(|\.some\(|…)`. It
 * called `crawl.mjs`'s bare appendAll GUARDED because `existsSync(dirname(out))`
 * sat two lines above — a directory check read as a dedupe check, hiding a real
 * defect. And it called the ledger's deduping append UNGUARDED, because `\b`
 * before `\.some\(` needs a word character before the dot, and `readAll()` ends
 * in a bracket. A guard is now only a test for an existing RECORD. */
const GUARD_NEAR = /(\balready\b|\bexisting\b|\.some\(|\.find\(|\.has\()/;

export function sourceCensus({ repo = REPO, sources = null } = {}) {
  const files = sources
    ? sources.map((s) => s.file)
    : execFileSync("git", ["ls-files", "bin", "src", "tools", "subjects"], { cwd: repo, encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".mjs"));
  const text = (f) => (sources ? sources.find((s) => s.file === f).text : readFileSync(join(repo, f), "utf8"));
  const sites = [];
  for (const file of files) {
    const lines = text(file).split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line) || /^\s*import\b/.test(line)) return;
      // A CALL, not the word: its first run counted "appendIfNew" inside a
      // string or a reason text as a guarded write site.
      if (line.includes(`.${IF_NEW}(`) || line.includes(`${IF_NEW}(record`)) {
        sites.push({ file, line: i + 1, text: line.trim().slice(0, 110), guarded: true, by: IF_NEW });
        return;
      }
      if (!APPEND_CALL.test(line)) return;
      // The store's own primitive and the ledger's guarded wrapper are the definitions, not callers.
      const window = lines.slice(Math.max(0, i - 4), i + 1).join("\n");
      const guarded = GUARD_NEAR.test(window);
      sites.push({ file, line: i + 1, text: line.trim().slice(0, 110), guarded, by: guarded ? "an existence test in the enclosing lines" : null });
    });
  }
  return sites;
}

const CLOCK_FIELDS = ["observed_at", "opened_at", "drafted_at", "generated_at", "seen_at", "recorded_at", "changed_at", "started_at", "finished_at", "corrected_at", "built_at"];

export function dataCensus({ repo = REPO } = {}) {
  const files = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const f = join(d, n);
      if (statSync(f).isDirectory()) walk(f);
      else if (n.endsWith(".jsonl")) files.push(f);
    }
  };
  walk(join(repo, "runs"));
  return files.sort().map((f) => {
    const records = readFileSync(f, "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
    const count = (keyOf, filter) => {
      const m = new Map();
      for (const r of records.filter(filter)) {
        const k = keyOf(r);
        if (k === null || k === undefined) continue;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      let doubledKeys = 0;
      let extraCopies = 0;
      for (const v of m.values()) if (v > 1) { doubledKeys += 1; extraCopies += v - 1; }
      return { distinct: m.size, doubledKeys, extraCopies };
    };
    const stripClock = (r) => JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !CLOCK_FIELDS.includes(k))));
    const superseded = new Set(records.filter((r) => r.record_type === "duplicate_record_superseded").map((r) => `${r.issue_id}#${r.copy_index}`));
    const seen = new Map();
    let unsupersededIssueCopies = 0;
    for (const r of records.filter((x) => x.record_type === "issue")) {
      const k = (seen.get(r.issue_id) ?? 0) + 1;
      seen.set(r.issue_id, k);
      if (k > 1 && !superseded.has(`${r.issue_id}#${k}`)) unsupersededIssueCopies += 1;
    }
    return {
      file: relative(repo, f).split("\\").join("/"),
      records: records.length,
      unsupersededIssueCopies,
      issues: count((r) => r.issue_id, (r) => r.record_type === "issue"),
      observations: count((r) => r.measurement_key, (r) => r.record_type === "observation"),
      other: count(stripClock, (r) => !["issue", "observation", "resighting", "issue_state_change", "duplicate_record_superseded"].includes(r.record_type)),
    };
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const sites = sourceCensus();
  const files = new Set(sites.map((s) => s.file));
  console.log(`DUPLICATE-WRITER CENSUS [bound: ${sites.length} append sites in ${files.size} files under bin/, src/, tools/ (git-tracked .mjs); every runs/**.jsonl]`);
  console.log("\nSOURCE — append sites:");
  for (const s of sites) console.log(`  ${s.guarded ? "guarded  " : "🔴 UNGUARDED"}  ${s.file}:${s.line}  ${s.text}${s.by ? `   (${s.by})` : ""}`);
  console.log("\nDATA — the same logical record stored more than once:");
  for (const d of dataCensus()) {
    const bad = d.unsupersededIssueCopies + d.observations.extraCopies + d.other.extraCopies;
    console.log(`  ${bad ? "🔴" : "  "} ${d.file}  records=${d.records}  issue doubles=${d.issues.extraCopies} (of ${d.issues.distinct}), unsuperseded=${d.unsupersededIssueCopies}  observation doubles=${d.observations.extraCopies} (of ${d.observations.distinct})  other doubles=${d.other.extraCopies}`);
  }
}
