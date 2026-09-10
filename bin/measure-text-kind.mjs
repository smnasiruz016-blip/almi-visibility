#!/usr/bin/env node
/**
 * 🔴 MEASUREMENT ONLY — NO GATE, NO THRESHOLD, NO PAGE VERDICT.
 *
 *   node bin/measure-text-kind.mjs --corpus <dir>
 *
 * Decomposes the `uniqueWords` Gate A already reports into PROSE · LIST · HEADING
 * · OTHER, for every group in a corpus. See src/gate-a/text-kind.mjs for what the
 * four kinds mean and why the split is made by markup rather than by words.
 *
 * The owner's ruling: SEE THE DISTRIBUTION FIRST, SET A BAR AFTERWARDS. So there
 * is deliberately no threshold anywhere in this file, and `runGateA` does not
 * import `text-kind.mjs`. RULE EIGHT applies to a bar invented today too.
 */
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { tokensWithKind, uniqueWordsByKind, KINDS } from "../src/gate-a/text-kind.mjs";
import { computeShells } from "../src/gate-a/shell.mjs";
import { MIN_UNIQUE_WORDS } from "../src/gate-a/run.mjs";
import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(n);
  return i === -1 || i + 1 >= argv.length ? d : argv[i + 1];
};
const corpusDir = flag("--corpus");
const outFile = flag("--out");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
if (!corpusDir || !existsSync(corpusDir)) {
  console.error("usage: node bin/measure-text-kind.mjs --corpus <dir> [--out file.json] [--confirm]");
  process.exit(2);
}

console.log("\n🔴 MEASUREMENT ONLY. No threshold is applied to any number below, and no page's");
console.log("   verdict changes. The four kinds SUM to the uniqueWords Gate A already reports.\n");

const stat = (a) => {
  if (!a.length) return null;
  const v = [...a].sort((x, y) => x - y);
  const at = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return { n: v.length, min: v[0], p25: at(0.25), median: at(0.5), p75: at(0.75), p95: at(0.95), max: v[v.length - 1] };
};
const row = (label, s) =>
  `${label.padEnd(22)} min ${String(s.min).padStart(5)} · p25 ${String(s.p25).padStart(5)} · ` +
  `median ${String(s.median).padStart(5)} · p75 ${String(s.p75).padStart(5)} · ` +
  `p95 ${String(s.p95).padStart(5)} · MAX ${String(s.max).padStart(5)}`;

const report = { generatedAt: new Date().toISOString(), measurementOnly: true, groups: [] };

for (const g of readdirSync(corpusDir).filter((n) => statSync(join(corpusDir, n)).isDirectory())) {
  const dir = join(corpusDir, g);
  const pages = [];
  for (const name of readdirSync(dir)) {
    if (extname(name) !== ".html") continue;
    const { tokens, kinds } = tokensWithKind(readFileSync(join(dir, name), "utf8"));
    pages.push({ id: basename(name, ".html"), tokens, kinds });
  }
  if (!pages.length) continue;

  const shells = computeShells(pages.map((p) => p.tokens));
  const rows = pages.map((p) => {
    const r = uniqueWordsByKind(p.tokens, p.kinds, shells.shellB);
    return { id: p.id, uniqueWords: r.total, ...r.counts };
  });

  // 🔴 The decomposition must be exact, or the number is not the gate's number.
  const bad = rows.filter((r) => KINDS.reduce((a, k) => a + r[k], 0) !== r.uniqueWords);
  if (bad.length) { console.error(`🔴 DECOMPOSITION BROKEN on ${bad.length} page(s) in ${g} — refusing to report`); process.exit(1); }

  console.log(`── ${g} — ${pages.length.toLocaleString("en-US")} pages ──`);
  const all = { uniqueWords: stat(rows.map((r) => r.uniqueWords)) };
  console.log("  " + row("uniqueWords (total)", all.uniqueWords));
  for (const k of KINDS) { all[k] = stat(rows.map((r) => r[k])); console.log("    " + row(k, all[k])); }

  // The same decomposition for the pages that PASSED stage 1 — the only ones on
  // which the question "was it a table?" has any force.
  const passed = rows.filter((r) => r.uniqueWords >= MIN_UNIQUE_WORDS);
  console.log(`  passed uniqueWords >= ${MIN_UNIQUE_WORDS}: ${passed.length}`);
  let passedStats = null;
  if (passed.length) {
    passedStats = {};
    for (const k of ["uniqueWords", ...KINDS]) {
      passedStats[k] = stat(passed.map((r) => r[k]));
      console.log("    " + row(`${k} (survivors)`, passedStats[k]));
    }
    const stillPass = passed.filter((r) => r.prose >= MIN_UNIQUE_WORDS).length;
    console.log(`    🔴 of those ${passed.length}, how many would still reach ${MIN_UNIQUE_WORDS} on PROSE ALONE: ${stillPass}`);
    const share = passed.reduce((a, r) => a + r.list, 0) / passed.reduce((a, r) => a + r.uniqueWords, 0);
    console.log(`    list text is ${(share * 100).toFixed(1)}% of the survivors' uniqueWords`);
    passedStats.stillPassOnProse = stillPass;
    passedStats.listShare = share;
  }
  report.groups.push({ group: g, pages: pages.length, shellB: shells.sizeB, all, passed: passed.length, passedStats, rows });
  console.log("");
}

if (outFile) {
  if (!permission.mayWrite) console.log(`[dry-run] --out ${outFile} given, nothing written. Add --confirm.`);
  else { writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8"); console.log(`wrote ${outFile}`); }
}
