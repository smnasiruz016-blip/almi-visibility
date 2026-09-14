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
import {
  verify, EXPECTED_BODY_SHA256, AMENDMENT_2_BODY_SHA256, AMENDMENT_4_BODY_SHA256, AMENDMENT_5_BODY_SHA256, amendment5, AMENDMENT_3_BODY_SHA256,
} from "../tools/verify-pass-boundaries-source.mjs";

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
L.push("# ALMIVISIBILITY — THE PASS BOUNDARIES (58 FROZEN, PLUS ROWS ADMITTED BY RULING) AND THE SEVEN-STATE LEDGER");
L.push("");
L.push("> 🔴 **GENERATED — DO NOT EDIT BY HAND.** `node bin/checklist-boundaries.mjs` rebuilds it.");
L.push("> Every boundary below is read out of `PASS_BOUNDARIES_SOURCE.md`, whose body is verified");
L.push(`> against sha256 \`${EXPECTED_BODY_SHA256}\`. Nothing here is retyped, so \`verbatim\` is a`);
L.push("> property of the mechanism rather than a promise about anyone's typing.");
L.push("");
const inForce = { P: 0, S: 0, D: 0 };
for (const b of Object.values(boundaries)) inForce[b.class] += 1;
const reclassed = Object.values(boundaries).filter((b) => b.classByA4);
const keptByA4 = Object.values(boundaries).filter((b) => b.a4 && !b.classByA4);

L.push(`Frozen source verified: **${check.matches ? "YES" : "🔴 NO"}** · features **${check.features.count}**`);
L.push(`(sequence 1..${check.features.sequential}) · classes as frozen **P=${check.counts.P} S=${check.counts.S} D=${check.counts.D}**`);
L.push(`· classes in force since Amendment 4 **P=${inForce.P} S=${inForce.S} D=${inForce.D}**`);
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

L.push("## 🔴 AMENDMENT 4 — THE DISCOVERY ROWS ENTER SCOPE (owner ruling, 13 September 2026)");
L.push("");
L.push(`Amendment 4 verified against sha256 \`${AMENDMENT_4_BODY_SHA256}\`. **It changes CLASS, never text:** every`);
L.push("boundary below is still read out of the frozen source, which still verifies byte for byte.");
L.push("");
L.push("| class | as frozen | in force |");
L.push("|---|---|---|");
for (const k of ["P", "S", "D"]) L.push(`| **${k}** | ${check.counts[k]} | **${inForce[k]}** |`);
L.push(`| **in scope (P + S)** | ${check.counts.P + check.counts.S} | **${inForce.P + inForce.S}** |`);
L.push("");
const a4Steps = steps.filter((s) => s.kind === "ruling" && /AMENDMENT_4/.test(s.ruling ?? ""));
L.push(`- **moved because WORK HAPPENED:** none. **moved ONLY because a RULING changed:** ${a4Steps.length} — ${a4Steps.map((s) => `${s.id} ${s.from} → ${s.to}`).join(" · ")}.`);
L.push("- 🔴 **A class change is not progress.** Every row it opened arrives NOT-STARTED: nothing was built and nothing was run.");
for (const b of reclassed) L.push(`- **item ${b.id} · ${b.name}** — class \`${b.frozenClass}\` → \`${b.class}\`. Its INPUT clause, ${b.a4.inputClause}: ${b.a4.inputPresent}`);
for (const b of keptByA4) L.push(`- **item ${b.id} · ${b.name}** — **stays \`D\`, and why:** its INPUT clause, ${b.a4.inputClause}: ${b.a4.inputPresent}`);
L.push("");
const halves = Object.values(boundaries).filter((b) => b.halfContractByA4);
L.push("🔴 **The owner's dated addendum (13 September 2026) closed the three gaps this amendment first left:** row 7's");
L.push("**WORTHINESS** is assigned to the deferred half, and " + `${halves.map((b) => `item ${b.id}`).join(" and ")} carry a four-part contract for their owned half,`);
L.push("read from the amendment. **A contract is not progress:** both rows stay NOT-STARTED, and each keeps its §6 text below");
L.push("as the final boundary for when the deferred half opens.");
L.push("");
L.push("---");
L.push("");
/* ── 🔴 AMENDMENT 5 — ROW 61, RESERVED, READ FROM §4 ── */
const a5 = amendment5(`${REPO}PASS_BOUNDARIES_AMENDMENT_5.md`);
L.push(`## 🔴 AMENDMENT 5 — ROW ${a5.row.id}: ${a5.row.name} (reserved until 14 September 2026, now created)`);
L.push("");
L.push(`Amendment 5 verified against sha256 \`${AMENDMENT_5_BODY_SHA256}\`. **It adds one row and moves no text.**`);
L.push("");
L.push(`🔴 **Row ${a5.row.id} was RESERVED** while rows 59 and 60 existed nowhere, as the ruling said (*reserve 61, never renumber*).`);
L.push(`**On 14 September 2026 Amendment 3 admitted 59 and 60, and row ${a5.row.id} is CREATED** — its full verdict, missing leg and`);
L.push("blocker are on the row in the ledger below. In scope, as Amendment 5 states it: " + `**${a5.inScope.before} → ${a5.inScope.after}**; with rows 59 and 60, **38**.`);
L.push("");
L.push("---");
L.push("");
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
// 🔴 A row that LEFT FAILED is named too, with its route — a FAILED count that
// falls to zero must say why, or the fall reads as the column being tidied away.
for (const s of steps.filter((x) => x.from === "FAILED")) {
  L.push(`- **item ${s.id}** left FAILED for ${s.to} by route \`${s.route}\` on ${s.date} — ${esc(s.reason)}`);
}
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
L.push("🔴 **TESTABLE-NOW IS NOT A PASS.** The input exists; the test has not passed. Each row names");
L.push("the single test that would settle it, and (ruling 0B, 13 September 2026) whether it was");
L.push("NEVER TRIED or TRIED AND FELL SHORT — with the date and the specific gap when it was.");
L.push("");
for (const r of testable) {
  L.push(`### ${r.id} · ${r.name}`);
  L.push("");
  L.push(`**The one test:** ${r.test}`);
  L.push("");
  L.push(
    r.attemptCount > 0
      ? `**Attempted ${r.attemptCount} time(s), last on ${r.lastAttempt}. The gap that stopped it:** ${r.gap}`
      : "**Never attempted.**",
  );
  L.push("");
  L.push(`**Where it stands:** ${r.why}`);
  L.push("");
}
L.push("---");
L.push("");
L.push(`## 🔴 ${incomplete.length} BOUNDAR${incomplete.length === 1 ? "Y" : "IES"} THE DOCUMENTS DO NOT STATE IN FULL`);
L.push("");
L.push("§4 ruled the first six split features as `v0.1 PASS boundary` / `deferred` tables, and Amendment 1");
L.push("gave each its four parts. Amendment 4 split rows 3 and 7, and its addendum gave their owned half its");
L.push("four parts. **A row listed here cannot reach VERIFIED-PASS as the rulings stand** — the contract guard");
L.push("refuses it, and correctly.");
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
/* ── 🔴 AMENDMENT 3 — ROWS 59 AND 60, ADMITTED ONLY ── */
L.push("## 🔴 AMENDMENT 3 — ROWS 59 AND 60 ADMITTED (owner ruling 13 September 2026, re-issued 14 September 2026)");
L.push("");
L.push(`Amendment 3 verified against sha256 \`${AMENDMENT_3_BODY_SHA256}\`. **Admitted only**, by the owner's answer of 14 September`);
L.push("2026: contracts recorded, both rows NOT-STARTED, **moved because WORK HAPPENED: none.** The brief's two stale lines — *\"give to");
L.push("CC tonight\"* and *\"in scope becomes 32\"* — are corrected in the amendment itself; the in-scope count is measured, not copied.");
L.push("");
const ledgerCensus = { P: 0, S: 0, D: 0 };
for (const b of Object.values(boundaries)) ledgerCensus[b.class] += 1;
L.push(`**The ledger: ${Object.keys(boundaries).length} rows · P=${ledgerCensus.P} S=${ledgerCensus.S} D=${ledgerCensus.D} · in scope ${ledgerCensus.P + ledgerCensus.S}.**`);
L.push("");
L.push("---");
L.push("");
L.push(`## ALL ${Object.keys(boundaries).length} — BOUNDARY, VERBATIM, AND VERDICT`);
L.push("");

for (const id of Object.keys(boundaries).map(Number).sort((a, b) => a - b)) {
  const b = boundaries[id];
  const r = rows[id];
  L.push(`### ${id} · ${b.name}`);
  L.push("");
  const classNote = b.frozenClass !== b.class ? ` (frozen \`${b.frozenClass}\`, moved by Amendment 4)` : b.a4 ? " (kept by Amendment 4)" : "";
  L.push(`**${r.state}** · class \`${b.class}\`${classNote} · ruled in \`${b.via}\`${r.was && r.was !== r.state ? ` · was ${r.was} (${r.changeKind})` : ""}`);
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
  if (b.a4) L.push(`| **Amendment 4 — its INPUT tested** | ${esc(b.a4.inputPresent)} → **${esc(b.a4.verdict)}** |`);
  if (b.finalBoundary) {
    for (const p of CONTRACT_PARTS) L.push(`| **⏭ final ${p.toUpperCase()} (§6, when the deferred half opens)** | ${esc(b.finalBoundary[p])} |`);
  }
  L.push("");
  L.push(`**Verdict —** ${r.why}`);
  L.push("");
  if (r.missingLeg) {
    L.push(`**🔴 The missing leg —** ${r.missingLeg}`);
    L.push("");
    L.push(`**Blocked on —** ${r.blockedOn}`);
    L.push("");
    L.push("**What stops ANY real page being accepted —**");
    for (const x of r.realPageInputs) L.push(`- ${x}`);
    L.push("");
  }
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
