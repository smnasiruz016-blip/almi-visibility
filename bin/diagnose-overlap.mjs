#!/usr/bin/env node
/**
 * 🔴 A DIAGNOSTIC RUN. NOT GATE A. NOT A VERDICT ON ANY PAGE.
 *
 *   node bin/diagnose-overlap.mjs --corpus <dir> --group profession-origin
 *
 * ── WHY THIS EXISTS, AND WHY IT IS NOT THE GATE ─────────────────────────────
 *
 * Gate A's run 01 rejected every one of these pages at the FACTS stage. Their
 * overlap was therefore never computed, and by D2-A that is correct: overlap is
 * the only quadratic check and it runs last, on survivors only.
 *
 * This script deliberately runs it anyway, on pages the gate ALREADY REJECTED,
 * to test something that is not a claim about the pages at all — it is a claim
 * about the OWNER'S CORRIDOR RULING:
 *
 *     "effort goes to /[profession]/from-[origin], because that is where we can
 *      be the best answer"
 *
 * That ruling carries an untested assumption: that those pages differ FROM EACH
 * OTHER. Gate A's run says most of their words come from a list of recognising
 * organisations. If that list is the same on from-india and from-pakistan, then
 * a profession's 191 corridor pages are copies of one another, and a content
 * project aimed at corridors buys nothing.
 *
 * ⚠️ SO NOTHING HERE CHANGES ANY PAGE'S VERDICT, AND NO NUMBER PRINTED HERE MAY
 * EVER BE READ AS "THESE PAGES PASSED OVERLAP". They did not reach overlap. They
 * were rejected two stages earlier and they stay rejected. This is a measurement
 * taken to falsify a RULING, not to grade a page.
 *
 * The residual is the gate's own residual — the group shell over all pages in
 * the group, subtracted exactly as `runGateA` subtracts it — so the numbers are
 * comparable with the gate's, not from a private definition.
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { tokensOf } from "../src/gate-a/tokens.mjs";
import { computeShells, uniqueWords, residualTokens } from "../src/gate-a/shell.mjs";
import { shingles, jaccard, SHINGLE_N, NOISY_RESIDUAL_WORDS } from "../src/gate-a/overlap.mjs";
import { MIN_UNIQUE_WORDS } from "../src/gate-a/run.mjs";
import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(n);
  return i === -1 || i + 1 >= argv.length ? d : argv[i + 1];
};
const corpusDir = flag("--corpus");
const groupName = flag("--group", "profession-origin");
const outFile = flag("--out");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));

if (!corpusDir || !existsSync(join(corpusDir, groupName))) {
  console.error("usage: node bin/diagnose-overlap.mjs --corpus <dir> --group <name> [--out file.json] [--confirm]");
  process.exit(2);
}

console.log("\n🔴 DIAGNOSTIC RUN — NOT GATE A. Every page below was ALREADY REJECTED at the");
console.log("   FACTS stage in run 01 and stays rejected. This measures the OWNER'S CORRIDOR");
console.log("   RULING, not the pages.\n");

// ── 1 · the group, exactly as the gate reads it ─────────────────────────────
const dir = join(corpusDir, groupName);
const pages = [];
for (const name of readdirSync(dir)) {
  if (extname(name) !== ".html") continue;
  const id = basename(name, ".html");
  pages.push({ id, tokens: tokensOf(readFileSync(join(dir, name), "utf8")) });
}
console.log(`group ${groupName}: ${pages.length.toLocaleString("en-US")} pages read`);

const shells = computeShells(pages.map((p) => p.tokens));
const shell = shells.shellB;
console.log(`shell B: ${shells.sizeB} tokens (A: ${shells.sizeA}); a token must appear on ${shells.minPagesForShell}/${shells.pages} pages`);

// ── 2 · the survivors of stage 1 — the same 573 the gate reported ───────────
const survivors = [];
for (const p of pages) {
  const uw = uniqueWords(p.tokens, shell);
  if (uw >= MIN_UNIQUE_WORDS) survivors.push({ id: p.id, uniqueWords: uw, residual: residualTokens(p.tokens, shell) });
}
console.log(`passed uniqueWords >= ${MIN_UNIQUE_WORDS}: ${survivors.length}\n`);

const professionOf = (id) => id.split("__")[0];
const originOf = (id) => (id.split("__")[1] ?? "").replace(/^from-/, "");

// ── 3 · exact all-pairs. Every pair, no sample. ─────────────────────────────
const sig = survivors.map((p) => shingles(p.residual, SHINGLE_N));
const n = survivors.length;
const started = Date.now();

const within = new Map(); // profession -> scores[]
const between = [];       // cross-profession scores
const bestWithin = new Map();
const bestBetween = [];
const perPageMax = survivors.map(() => ({ score: -1, against: null, sameProfession: null }));
let pairs = 0;

for (let i = 0; i < n; i++) {
  const pi = professionOf(survivors[i].id);
  for (let j = i + 1; j < n; j++) {
    const s = jaccard(sig[i], sig[j]);
    pairs++;
    const pj = professionOf(survivors[j].id);
    const same = pi === pj;
    if (same) {
      if (!within.has(pi)) within.set(pi, []);
      within.get(pi).push(s);
      if (!bestWithin.has(pi)) bestWithin.set(pi, []);
      bestWithin.get(pi).push({ s, a: survivors[i].id, b: survivors[j].id });
    } else {
      between.push(s);
      bestBetween.push({ s, a: survivors[i].id, b: survivors[j].id });
    }
    if (s > perPageMax[i].score) perPageMax[i] = { score: s, against: survivors[j].id, sameProfession: same };
    if (s > perPageMax[j].score) perPageMax[j] = { score: s, against: survivors[i].id, sameProfession: same };
  }
  // keep the top pairs only, so 164k objects do not become 164k retained rows
  if (bestBetween.length > 40_000) { bestBetween.sort((a, b) => b.s - a.s); bestBetween.length = 20; }
  for (const [k, v] of bestWithin) if (v.length > 40_000) { v.sort((a, b) => b.s - a.s); v.length = 20; }
}
const seconds = (Date.now() - started) / 1000;

const stat = (arr) => {
  if (arr.length === 0) return null;
  const v = [...arr].sort((a, b) => a - b);
  const at = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return { n: v.length, min: v[0], p25: at(0.25), median: at(0.5), p75: at(0.75), p95: at(0.95), max: v[v.length - 1] };
};
const f = (x) => (x === null ? "—" : x.toFixed(4));

console.log(`${pairs.toLocaleString("en-US")} exact comparisons in ${seconds.toFixed(1)}s ` +
  `(${(pairs / seconds / 1e6).toFixed(2)}M pairs/s)\n`);

// residual sizes, so nobody reads a Jaccard without knowing what it was taken over
const rs = stat(survivors.map((p) => p.residual.length));
console.log(`residual words per surviving page: min ${rs.min} · median ${rs.median} · max ${rs.max}` +
  (rs.min < NOISY_RESIDUAL_WORDS ? `  ⚠️ some residuals are under ${NOISY_RESIDUAL_WORDS} words — noise` : ""));

console.log("\n── WITHIN a profession (its own 191 corridor pages against each other) ──");
const report = { generatedAt: new Date().toISOString(), diagnostic: true, group: groupName, survivors: n, pairs, seconds, within: {}, between: null };
for (const [prof, scores] of [...within].sort()) {
  const s = stat(scores);
  report.within[prof] = { stats: s, top: bestWithin.get(prof).slice().sort((a, b) => b.s - a.s).slice(0, 5) };
  console.log(`  ${prof.padEnd(12)} ${s.n.toLocaleString("en-US").padStart(7)} pairs · ` +
    `min ${f(s.min)} · median ${f(s.median)} · p95 ${f(s.p95)} · MAX ${f(s.max)}`);
}

console.log("\n── BETWEEN professions ──");
const b = stat(between);
report.between = { stats: b, top: bestBetween.slice().sort((x, y) => y.s - x.s).slice(0, 5) };
console.log(`  ${String(b.n.toLocaleString("en-US")).padStart(19)} pairs · min ${f(b.min)} · median ${f(b.median)} · p95 ${f(b.p95)} · MAX ${f(b.max)}`);

console.log("\n── the most alike pairs ──");
for (const [prof, r] of Object.entries(report.within)) {
  console.log(`  within ${prof}:`);
  for (const t of r.top.slice(0, 3)) console.log(`    ${f(t.s)}  ${t.a}  vs  ${t.b}`);
}
console.log("  between professions:");
for (const t of report.between.top.slice(0, 3)) console.log(`    ${f(t.s)}  ${t.a}  vs  ${t.b}`);

// where does each page's NEAREST neighbour live?
const sameProf = perPageMax.filter((p) => p.sameProfession).length;
console.log(`\nnearest neighbour is in the SAME profession for ${sameProf}/${n} pages`);
report.nearestNeighbourSameProfession = sameProf;
report.residualWords = rs;

if (outFile) {
  if (!permission.mayWrite) console.log(`\n[dry-run] --out ${outFile} given, nothing written. Add --confirm.`);
  else { writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8"); console.log(`\nwrote ${outFile}`); }
}
console.log("");
