#!/usr/bin/env node
/**
 * Generate `CHECKLIST_BOUNDARIES.md` — all 58 features with their four-part
 * PASS boundary VERBATIM, and their six-state classification.
 *
 * ── 🔴 WHY THIS IS GENERATED AND `CHECKLIST_STATUS.md` IS NOT ───────────────
 *
 * The boundaries must be verbatim, and the surest way to keep 232 quotations
 * verbatim is never to type them: they are read out of the hash-verified frozen
 * source every time this runs.
 *
 * `CHECKLIST_STATUS.md` is the opposite kind of document — it holds hand-written
 * analysis that took real work (the item 52 contradiction, the borderline
 * calls, the corrections). Regenerating a file like that deletes its comments.
 * So the two are kept apart: this one is derived and may be rebuilt at will,
 * that one is written and is edited by hand.
 */

import { writeFileSync, readFileSync } from "node:fs";

import { loadBoundaries, CONTRACT_PARTS } from "../src/checklist/boundaries.mjs";
import {
  classify, assertLawful, assertTransitions, tally, STATES, LOOKED, BEFORE_AMENDMENT_2, MOVES_AMENDMENT_2,
} from "../src/checklist/classification.mjs";
import { verify, EXPECTED_BODY_SHA256, AMENDMENT_2_BODY_SHA256 } from "../tools/verify-pass-boundaries-source.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OUT = `${REPO}CHECKLIST_BOUNDARIES.md`;



const boundaries = loadBoundaries();
const rows = classify();
// 🔴 Amendment 2 rules 1 and 2 are part of the refusal: a ledger that moves a
// row out of FAILED by any undeclared route is not written at all.
const errors = [...assertLawful(rows), ...assertTransitions(rows)];
if (errors.length) {
  console.error("🔴 the classification is unlawful — refusing to write a ledger that breaks its own contract:");
  for (const e of errors) console.error(`   ${e}`);
  process.exit(1);
}

const check = verify(`${REPO}PASS_BOUNDARIES_SOURCE.md`);
const after = tally(rows);
const before = Object.fromEntries(STATES.map((s) => [s, 0]));
for (const r of Object.values(rows)) if (r.was) before[r.was] += 1;

const work = Object.values(rows).filter((r) => r.changeKind === "work");
const vocab = Object.values(rows).filter((r) => r.changeKind === "vocabulary");
const still = Object.values(rows).filter((r) => r.changeKind === "none");
const testable = Object.values(rows).filter((r) => r.state === "TESTABLE-NOW");
const incomplete = Object.values(boundaries).filter((b) => b.missingParts.length);

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|");

const L = [];
L.push("# ALMIVISIBILITY — THE 58 PASS BOUNDARIES AND THE SEVEN-STATE LEDGER");
L.push("");
L.push("> 🔴 **GENERATED — DO NOT EDIT BY HAND.** `node bin/checklist-boundaries.mjs` rebuilds it.");
L.push("> Every boundary below is read out of `PASS_BOUNDARIES_SOURCE.md`, whose body is verified");
L.push(`> against sha256 \`${EXPECTED_BODY_SHA256}\`. Nothing here is retyped, so \`verbatim\` is a`);
L.push("> property of the mechanism rather than a promise about anyone's typing.");
L.push("");
L.push(`Frozen source verified: **${check.matches ? "YES" : "🔴 NO"}** · features **${check.features.count}**`);
L.push(`(sequence 1..${check.features.sequential}) · classes **P=${check.counts.P} S=${check.counts.S} D=${check.counts.D}**`);
L.push("");
L.push("## Precedence");
L.push("");
L.push("> The **KEY FEATURE CHECKLIST** states WHAT each feature must do.");
L.push("> **PASS BOUNDARIES** states EXACTLY WHEN it may be ticked.");
L.push("> Where any internal practice disagrees with either, **THEY WIN**.");
L.push("> A boundary changes **only by owner ruling**, recorded with its date and reason.");
L.push("");
L.push("---");
L.push("");
/* ── 🔴 AMENDMENT 2 — THIS PR, MEASURED AGAINST THE LEDGER IT STARTED FROM ── */
const beforeA2 = Object.fromEntries(STATES.map((s) => [s, 0]));
for (const s of Object.values(BEFORE_AMENDMENT_2)) beforeA2[s] += 1;
const steps = Object.entries(MOVES_AMENDMENT_2).flatMap(([id, chain]) => chain.map((s) => ({ id: Number(id), ...s })));
const afterRuling = { ...beforeA2 };
for (const s of steps.filter((x) => x.kind === "ruling")) { afterRuling[s.from] -= 1; afterRuling[s.to] += 1; }
const failedRows = Object.values(rows).filter((r) => r.state === "FAILED");
const newPasses = Object.values(rows).filter((r) => r.state === "VERIFIED-PASS" && BEFORE_AMENDMENT_2[r.id] !== "VERIFIED-PASS");

L.push("## 🔴 AMENDMENT 2 — THE SEVENTH STATE, AND ITEM 14 SAT AGAIN");
L.push("");
L.push(`Amendment 2 verified against sha256 \`${AMENDMENT_2_BODY_SHA256}\`.`);
L.push("");
L.push("| state | before Amendment 2 | after the RULING only | after the WORK |");
L.push("|---|---|---|---|");
for (const s of STATES) L.push(`| **${s}** | ${beforeA2[s]} | ${afterRuling[s]} | **${after[s]}** |`);
L.push("");
L.push(`### FAILED — counted and named separately: **${failedRows.length}**`);
L.push("");
L.push("> 🔴 **FAILED is counted and named separately in every report.** It is never folded into another");
L.push("> count and it is **not progress**. It is also **worth more than BUILT-NOT-PROVED**: a FAILED row");
L.push("> is one whose test was run against its own boundary — it means we looked.");
L.push("");
for (const r of failedRows) L.push(`- **item ${r.id} · ${r.name}** — FAILURE met: ${r.failureMet}`);
L.push("");
L.push(`**Rows that have been looked at (${LOOKED.join(" or ")}): ${Object.values(rows).filter((r) => LOOKED.includes(r.state)).length} of 58.**`);
L.push("");
L.push(`**Rows that reached VERIFIED-PASS in this PR: ${newPasses.length}.**`);
L.push("");
L.push("#### moved ONLY because a RULING changed");
L.push("");
L.push("| # | from | to | ruling | date | reason |");
L.push("|---|---|---|---|---|---|");
for (const s of steps.filter((x) => x.kind === "ruling")) L.push(`| ${s.id} | ${s.from} | ${s.to} | ${esc(s.ruling)} | ${s.date} | ${esc(s.reason)} |`);
L.push("");
L.push("#### moved because WORK HAPPENED");
L.push("");
L.push("| # | from | to | test | date | what happened |");
L.push("|---|---|---|---|---|---|");
for (const s of steps.filter((x) => x.kind === "work")) L.push(`| ${s.id} | ${s.from} | ${s.to} | \`${s.test}\` | ${s.date} | ${esc(s.reason)} |`);
L.push("");
L.push("---");
L.push("");
L.push("## THE HEADLINE — AGAINST THE FOUR-STATE BASELINE");
L.push("");
L.push("| state | before (4-state) | after (7-state) |");
L.push("|---|---|---|");
for (const s of STATES) L.push(`| **${s}** | ${before[s]} | **${after[s]}** |`);
L.push(`| **total** | ${Object.values(before).reduce((a, b) => a + b, 0)} | **${Object.values(after).reduce((a, b) => a + b, 0)}** |`);
L.push("");
L.push("### 🔴 THE MOST IMPORTANT LINE IN THIS DOCUMENT");
L.push("");
if (work.length === 0) {
  L.push("> **NOT ONE ROW CHANGED STATUS BECAUSE WORK HAPPENED. THE COUNT IS ZERO.**");
  L.push(">");
  L.push(`> ${vocab.length} rows moved. Every one moved because the vocabulary changed — 28 of them`);
  L.push("> from NOT-STARTED to DEFERRED, which is a more honest label for the same absence and is");
  L.push("> **not progress**. Nothing was built and nothing was proved in the change that produced");
  L.push("> this ledger. A ledger that looks better because we renamed its columns is the exact");
  L.push("> failure this instrument exists to prevent, so the number is stated first and plainly.");
} else {
  L.push(`> **${work.length} row(s) changed because work happened.** Listed in (i) below.`);
}
L.push("");
L.push("#### (i) changed because WORK HAPPENED");
L.push("");
if (work.length === 0) {
  L.push("**Zero rows. Nothing was built.**");
} else {
  L.push("| # | feature | from | to |");
  L.push("|---|---|---|---|");
  for (const r of work) L.push(`| ${r.id} | ${esc(r.name)} | ${r.was} | **${r.state}** |`);
}
L.push("");
L.push("#### (ii) changed ONLY because the vocabulary changed");
L.push("");
L.push("| move | count | features |");
L.push("|---|---|---|");
const byMove = {};
for (const r of vocab) (byMove[`${r.was} → ${r.state}`] ??= []).push(r.id);
for (const k of Object.keys(byMove).sort((a, b) => byMove[b].length - byMove[a].length)) {
  L.push(`| ${k} | ${byMove[k].length} | ${byMove[k].join(", ")} |`);
}
L.push("");
L.push(`**Did not move: ${still.length}** — ${still.map((r) => r.id).join(", ")}`);
L.push("");
L.push("---");
L.push("");
L.push("## 🧪 THE TESTABLE-NOW WORK QUEUE");
L.push("");
L.push("🔴 **TESTABLE-NOW IS NOT A PASS.** The input finally exists; the falsifiable test has not");
L.push("been run. Between here and VERIFIED-PASS there is exactly one thing: the test, run, with");
L.push("its evidence. Each row names the single test that would settle it.");
L.push("");
for (const r of testable) {
  L.push(`### ${r.id} · ${r.name}`);
  L.push("");
  L.push(`**The one test:** ${r.test}`);
  L.push("");
  L.push(`**Why it is testable now:** ${r.why}`);
  L.push("");
}
L.push("---");
L.push("");
L.push("## 🔴 SIX BOUNDARIES THE DOCUMENT DOES NOT STATE IN FULL");
L.push("");
L.push("§4 rules the split features as `v0.1 PASS boundary` / `deferred` tables rather than in the");
L.push("four-part form. **These six therefore cannot reach VERIFIED-PASS as the ruling stands** —");
L.push("the contract guard refuses it, and correctly.");
L.push("");
L.push("**They are not filled in.** Writing the missing parts myself would manufacture a boundary");
L.push("the owner never ruled, which the repository would then enforce as if he had. This is a");
L.push("question for the owner, recorded as one.");
L.push("");
L.push("| # | feature | class | parts the document does not state |");
L.push("|---|---|---|---|");
for (const b of incomplete) L.push(`| ${b.id} | ${esc(b.name)} | ${b.class} | ${b.missingParts.join(", ")} |`);
L.push("");
L.push("---");
L.push("");
L.push("## ALL 58 — BOUNDARY, VERBATIM, AND VERDICT");
L.push("");

for (let id = 1; id <= 58; id += 1) {
  const b = boundaries[id];
  const r = rows[id];
  L.push(`### ${id} · ${b.name}`);
  L.push("");
  L.push(`**${r.state}** · class \`${b.class}\` · ruled in \`${b.via}\`${r.was && r.was !== r.state ? ` · was ${r.was} (${r.changeKind})` : ""}`);
  L.push("");
  L.push("| part | the owner's words |");
  L.push("|---|---|");
  for (const p of CONTRACT_PARTS) {
    L.push(`| **${p.toUpperCase()}** | ${b[p] ? esc(b[p]) : "🔴 *not stated in the ruling*"} |`);
  }
  if (b.v01PassBoundary) L.push(`| **v0.1 PASS boundary** | ${esc(b.v01PassBoundary)} |`);
  if (b.deferred) L.push(`| **⏭ deferred half** | ${esc(b.deferred)} |`);
  if (b.blockerToday) L.push(`| **BLOCKER TODAY** | ${esc(b.blockerToday)} |`);
  if (b.note) L.push(`| **NOTE** | ${esc(b.note)} |`);
  if (b.rule) L.push(`| **RULE** | ${esc(b.rule)} |`);
  L.push("");
  L.push(`**Verdict —** ${r.why}`);
  L.push("");
  if (r.test) {
    L.push(`**The one test that would settle it —** ${r.test}`);
    L.push("");
  }
}

writeFileSync(OUT, L.join("\n") + "\n", "utf8");

console.log(`wrote ${OUT}`);
console.log(`  frozen source verified: ${check.matches}`);
console.log(`  states: ${STATES.map((s) => `${s}=${after[s]}`).join("  ")}`);
console.log(`  before Amendment 2: ${STATES.map((s) => `${s}=${beforeA2[s]}`).join("  ")}`);
console.log(`  FAILED (named separately): ${failedRows.map((r) => r.id).join(", ") || "none"}   new VERIFIED-PASS this PR: ${newPasses.length}`);
console.log(`  moves by RULING: ${steps.filter((s) => s.kind === "ruling").map((s) => `${s.id} ${s.from}→${s.to}`).join("; ")}`);
console.log(`  moves by WORK:   ${steps.filter((s) => s.kind === "work").map((s) => `${s.id} ${s.from}→${s.to}`).join("; ")}`);
console.log(`  changed on WORK: ${work.length}   on VOCABULARY: ${vocab.length}   unmoved: ${still.length}`);
console.log(`  TESTABLE-NOW queue: ${testable.map((r) => r.id).join(", ")}`);
console.log(`  boundaries the ruling leaves incomplete: ${incomplete.map((b) => b.id).join(", ")}`);
console.log(`  [bound: ${Object.keys(boundaries).length} features × ${CONTRACT_PARTS.length} contract parts]`);
