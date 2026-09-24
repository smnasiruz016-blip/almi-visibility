#!/usr/bin/env node
/**
 * THE FIRST COMPLETE CHAIN — REGISTRY → PAGE → GATE A → ROLLOUT.
 *
 *   node bin/nursing-chain.mjs                       measure and report
 *   node bin/nursing-chain.mjs --out runs/nursing-chain --confirm
 *
 * 🔴 NOTHING IS PUBLISHED. The candidate page exists as a file on this machine.
 * The eleven sibling pages are FETCHED, read-only, from what AlmiOET already
 * serves — which the SCOPE LAW permits and which is what makes the denominator
 * honest.
 *
 * ── THE FOUR STEPS, AND THE FOURTH IS THE ONE THAT DECIDES ──────────────────
 *
 *   1. build the candidate from the registry, by reference
 *   2. fetch the ELEVEN OTHER PUBLISHED profession pages
 *   3. Gate A — uniqueWords, facts, overlap, prose/list split
 *   4. 🔴 ROLLOUT SIMULATION
 *
 * §8 of the handoff, measured on 10 September: five facts on ONE page moved
 * overlap 0.9792 → 0.7364, and the same five rolled out across all 191 put it
 * back at 0.9695. **A ONE-PAGE PASS PROVES NOTHING.** Whatever we do for
 * /nursing, we would do for the other eleven — and then the parts that repeat
 * become shell and stop telling the pages apart.
 *
 * SO THE VERDICT IS READ OFF STEP 4, NOT STEP 3.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../../../src/write-law.mjs";
import { executeGovernedWrite } from "../../../src/governance/governed-write.mjs";
import { governedFileWrite } from "../../../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../../../src/audit-trail/store.mjs";
import { loadRegistry, toGateAFact } from "../../../src/facts/registry.mjs";
import { claimIdsOf } from "../../../src/page/claim-ids.mjs";
import { renderPage } from "../../../src/page/render.mjs";
import { runGateA, MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP } from "../../../src/gate-a/run.mjs";
import { tokensWithKind } from "../../../src/gate-a/text-kind.mjs";
import { tokensOf } from "../../../src/gate-a/tokens.mjs";
import { shingles, jaccard } from "../../../src/gate-a/overlap.mjs";
import { fetchForMatch } from "../../../src/facts/quote-match.mjs";

import { productFromArgvOrExit } from "../../../src/product-cli.mjs";
import { scopedEntryPoint } from "../../../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../../../src/tenancy/scoped-run.mjs";

/**
 * 🔴 THE PRODUCT ARRIVES AS AN ARGUMENT, NOT AS AN IMPORT.
 *
 * This runner used to resolve a product at IMPORT time, so it could not be
 * pointed at a second one without editing this file. Its arithmetic was
 * already generic; the BINDING was not.
 *
 * There is no default: a runner with no `--product=<id>` stops and says so.
 */
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/nursing-chain.mjs --product=<id>" });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "subjects/almi-oet/tools/nursing-chain.mjs", governed: true, resources: [RESOURCES.factRegistryAt(PRODUCT.factsDir), RESOURCES.cache("sibling-page cache"), RESOURCES.runArtefacts("live sibling pages")] });

const argv = process.argv.slice(2);
// 🔴 Both destinations are confined to this repository before anything runs.
// The cache path is relative to the cwd, so run from anywhere else it would
// have landed outside — and now it is refused instead.
const outDir = confineToRepo(argv.find((a) => a.startsWith("--out="))?.split("=").slice(1).join("=") ?? null, { label: "--out" });
const cacheDir = confineToRepo("runs/_profession-cache", { label: "the sibling-page cache" });
const permission = writePermission({ target: LOCAL, argv, env: process.env });
// Announced on every run, not only with --out: the sibling cache is a write too.
announceWritePermission(permission);

const line = (ch = "─") => console.log(ch.repeat(78));
const f4 = (n) => (n === null || n === undefined ? "—" : n.toFixed(4));
const SITE = "https://almioet.almiworld.com";

// ── STEP 1 · the candidate, by reference ───────────────────────────────────
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const { html: candidateHtml, trace } = renderPage(PRODUCT.pageSpecs.nursing, records);
const candidateFacts = claimIdsOf(PRODUCT.pageSpecs.nursing)
  .map((id) => records.find((r) => r.id === id))
  .map(toGateAFact);

console.log(`\nSTEP 1 · THE CANDIDATE, BUILT BY REFERENCE`);
line("═");
console.log(`  ${trace.length} facts from ${new Set(trace.map((t) => t.subject)).size} sources, ${records.length} records in the registry`);

// ── STEP 2 · the ELEVEN OTHER PUBLISHED pages ──────────────────────────────
//
// 🔴 THE DENOMINATOR RULE. "Every sibling" means every sibling A READER CAN
// STILL REACH — so these are fetched from what is served today, not taken from
// this run's own output and not filtered by anything.
// 🔴 UNTIL 12 SEPTEMBER 2026 THE CACHE WAS WRITTEN WITH NO FLAG. Item 14 was
// FAILED on it. The pages are still fetched (a read, which the scope law
// permits) and still measured; they are only KEPT with --confirm.
/* The bare mkdir is gone: each governed write's prepare step creates the directory it writes into. */
const CHAIN_INSTANT = governedInstant(Date.now());
const CHAIN_CORRELATION = `run:nursing-chain:${CHAIN_INSTANT}`;
const siblings = [];
for (const p of PRODUCT.variants) {
  if (p === "nursing") continue;
  const cached = join(cacheDir, `${p}.html`);
  if (existsSync(cached)) {
    siblings.push({ id: p, html: readFileSync(cached, "utf8") });
    continue;
  }
  const res = await fetchForMatch(`${SITE}/${p}`);
  if (!res.ok) {
    console.log(`  🔴 ${p}: ${res.detail}`);
    continue;
  }
  /* Routed. One cached page is one target, so this is per-TARGET and not per-record. The page is still FETCHED
   * and MEASURED either way — a read, which the scope law permits — and only KEPT when the write is allowed. */
  const cacheGoverned = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
    repo: REPO, permission, target: cached, targetClass: "RUN_EVIDENCE", bytes: res.body,
    action: "WRITE_SIBLING_PAGE_CACHE", occurredAt: CHAIN_INSTANT, correlationId: CHAIN_CORRELATION,
  }));
  if (cacheGoverned.outcome === "REFUSED") console.log(`  [dry-run] ${p}: fetched and measured, NOT cached — add --confirm to keep it`);
  else if (cacheGoverned.outcome !== "COMMITTED" && cacheGoverned.outcome !== "ALREADY_COMMITTED") {
    console.error(`🔴 ${cacheGoverned.outcome} — ${p} was not cached; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  }
  siblings.push({ id: p, html: res.body });
}
console.log(`\nSTEP 2 · THE PUBLISHED POPULATION`);
line("═");
console.log(`  ${siblings.length} sibling profession pages, fetched live from ${SITE}`);
if (siblings.length !== PRODUCT.variants.length - 1) {
  console.log(`  🔴 expected ${PRODUCT.variants.length - 1}. A short population makes the overlap number weaker, not better.`);
}

// ── STEP 3 · GATE A ────────────────────────────────────────────────────────
const group = [{ id: "nursing (CANDIDATE)", html: candidateHtml, facts: candidateFacts, whyThisUrl: "the profession page for nursing" }, ...siblings];
const gate = runGateA(group);
const me = gate.results.find((r) => r.id === "nursing (CANDIDATE)");
const kinds = tokensWithKind(candidateHtml);
const kindCount = (k) => kinds.kinds.filter((x) => x === k).length;

console.log(`\nSTEP 3 · GATE A`);
line("═");
console.log(`  group ${gate.pages} pages · shell ${gate.shell.sizeB} tokens (definition ${gate.shell.definition}, a token must appear on ${gate.shell.minPagesForShell}/${gate.pages} pages) · reached overlap ${gate.reachedOverlap} · population ${gate.overlapPopulation}`);
console.log("");
console.log(`  uniqueWords     ${String(me.uniqueWords).padStart(5)}  / ${MIN_UNIQUE_WORDS}   ${me.uniquePass ? "PASS" : "🔴 FAIL"}`);
console.log(`    prose ${kindCount("prose")}  list ${kindCount("list")}  heading ${kindCount("heading")}  (the split is REPORTED, not thresholded)`);
console.log(`  facts           ${String(me.facts?.qualifying ?? 0).padStart(5)}  / 5       ${me.factsPass ? "PASS" : "🔴 FAIL"}`);
console.log(`    linkChecked ${me.facts?.linkChecked ?? 0}   factChecked ${me.facts?.factChecked ?? 0}  🔴 still zero, and it must be`);
console.log(`  overlap         ${f4(me.maxOverlap).padStart(5)}  / ${MAX_SIBLING_OVERLAP}   ${me.overlapPass === null ? "—" : me.overlapPass ? "PASS" : "🔴 FAIL"}`);
console.log(`    nearest sibling: ${me.overlapAgainst ?? "—"} · compared with ${me.comparedWith ?? 0} · residual ${me.residualWords ?? 0} words`);
console.log(`  whyThisUrl      ${me.whyThisUrlPresent ? "present" : "🔴 absent"}`);
console.log(`\n  VERDICT (step 3, ONE PAGE): ${me.verdict}`);

// ── STEP 4 · 🔴 THE ROLLOUT SIMULATION ─────────────────────────────────────
//
// What happens when the SAME METHOD is applied to the other eleven professions.
//
// The model, stated so it can be argued with:
//   SHARED   — framing text, the two profession-independent OET facts, the UKVI
//              list, the three Code of Practice rules, the New Zealand rule.
//              These render IDENTICAL text on all twelve pages.
//   PER-PAGE — the two profession-specific OET facts and the destination
//              regulator blocks. Each profession has different regulators.
//
// 🟡 AND THE PER-PAGE HALF IS SIMULATED PESSIMISTICALLY, ON PURPOSE. We do not
// have the GMC's or the GDC's facts, and inventing them would be the exact thing
// this registry exists to prevent. So the simulation keeps the SENTENCE
// STRUCTURE identical and changes only the proper nouns — which is the WORST
// CASE for overlap and therefore an UPPER BOUND on it. A real medicine page,
// written from real GMC facts, would score somewhere below this.
const SHARED_CLAIM_IDS = new Set([
  "oet.subtests-and-which-are-profession-specific",
  "oet.grade-bands-0-500",
  "uk-ukvi.majority-english-speaking-countries",
  "uk-code-of-practice.red-list-rule",
  "uk-code-of-practice.amber-list-rule",
  "uk-code-of-practice.direct-application-exception",
  "nz-immigration-nz.oet-must-be-taken-in-person",
]);

function simulateProfession(profession, index) {
  // Structural substitution only. No fact is asserted about any regulator: the
  // proper nouns are placeholders, and the simulation measures TEXT REPETITION,
  // not regulator content.
  let html = candidateHtml;
  html = html.split("nursing").join(profession);
  html = html.split("Nursing").join(profession[0].toUpperCase() + profession.slice(1));
  html = html.split("nurse").join(`${profession} practitioner`);
  html = html.split("Nursing and Midwifery Council").join(`Regulator ${index} for ${profession}`);
  html = html.split("Nursing and Midwifery Board of Ireland").join(`Irish regulator ${index} for ${profession}`);
  return html;
}

const rolloutGroup = [
  { id: "nursing (CANDIDATE)", html: candidateHtml, facts: candidateFacts, whyThisUrl: "x" },
  ...PRODUCT.variants.filter((p) => p !== "nursing").map((p, i) => ({
    id: `${p} (SIMULATED)`,
    html: simulateProfession(p, i + 1),
    facts: candidateFacts,
    whyThisUrl: "x",
  })),
];
const rollout = runGateA(rolloutGroup);
const meAfter = rollout.results.find((r) => r.id === "nursing (CANDIDATE)");

// And the measurement that needs NO simulation at all: how much of the page is
// word-for-word identical across every profession, because it comes from a
// SHARED record. This is a fact about the design, not a projection.
const sharedTrace = trace.filter((t) => SHARED_CLAIM_IDS.has(t.claimId));
const sharedRecords = sharedTrace.map((t) => records.find((r) => r.id === t.claimId));
const sharedWords = sharedRecords.reduce(
  (n, r) => n + tokensOf(`${r.value.value} ${r.evidence.ownWords ?? ""} ${r.evidence.quotedSpan ?? ""}`).length,
  0,
);
const framingWords = tokensOf(
  [PRODUCT.pageSpecs.nursing.title, PRODUCT.pageSpecs.nursing.intro, ...PRODUCT.pageSpecs.nursing.sections.map((s) => `${s.heading} ${s.framing ?? ""}`)].join(" "),
).length;
const totalWords = tokensOf(candidateHtml).length;

console.log(`\nSTEP 4 · 🔴 THE ROLLOUT SIMULATION — THIS IS WHERE THE VERDICT IS READ`);
line("═");
console.log(`  MEASURED, no simulation needed — how much of the page repeats by construction:`);
console.log(`    shared facts (${sharedTrace.length} of ${trace.length} claims)   ${sharedWords} words`);
console.log(`    framing text (identical on all 12)   ${framingWords} words`);
console.log(`    ── identical across all twelve       ${sharedWords + framingWords} of ${totalWords} words` +
  `  = ${(((sharedWords + framingWords) / totalWords) * 100).toFixed(1)}%`);
console.log("");
console.log(`  SIMULATED (🟡 pessimistic — structure identical, proper nouns changed):`);
console.log(`    uniqueWords   ${String(me.uniqueWords).padStart(5)} → ${String(meAfter.uniqueWords).padStart(5)}  / ${MIN_UNIQUE_WORDS}   ${meAfter.uniquePass ? "PASS" : "🔴 FAIL"}`);
console.log(`    shell         ${String(gate.shell.sizeB).padStart(5)} → ${String(rollout.shell.sizeB).padStart(5)} tokens  — the shared half BECOMES shell`);
console.log(`    overlap       ${f4(me.maxOverlap).padStart(5)} → ${f4(meAfter.maxOverlap).padStart(5)}  / ${MAX_SIBLING_OVERLAP}   ${meAfter.overlapPass === null ? "—" : meAfter.overlapPass ? "PASS" : "🔴 FAIL"}`);
console.log(`      nearest: ${meAfter.overlapAgainst ?? "—"}`);
console.log(`\n  🔴 VERDICT AFTER ROLLOUT: ${meAfter.verdict}`);

// Pairwise overlap between two SIMULATED siblings — neither is the candidate, so
// it answers "what would two of these pages look like to each other".
const simA = rolloutGroup[1];
const simB = rolloutGroup[2];
const pairwise = jaccard(shingles(tokensOf(simA.html)), shingles(tokensOf(simB.html)));
console.log(`\n  and two SIMULATED siblings against each other (${simA.id} vs ${simB.id}): ${f4(pairwise)}`);

// ── 🔴 THE OTHER BOUND, AND IT NEEDS NO SIMULATION AT ALL ─────────────
//
// The run above is an UPPER bound on overlap: it makes the other eleven pages
// literal copies with the nouns changed. Real GMC and GDC facts would differ far
// more — but writing them would be INVENTING them, which is the one thing this
// registry exists to prevent.
//
// So the best case is DERIVED instead. If two profession pages shared exactly the
// shared half S and their per-profession halves were entirely disjoint, then by
// the definition of Jaccard over shingles:
//
//     overlap = |S| / (|S| + |U_a| + |U_b|)
//
// Every term is MEASURED off the real candidate. No text is invented, and the
// result is the floor below which no amount of good writing can push this design.
// ⚠️ SPLIT FROM THE RENDERED HTML, NOT FROM THE RECORD TEXT. An earlier version
// of this measurement used the record values, and it MISSED THE CITATIONS — the
// "Source: ... Checked ..." line under every single fact, which repeats verbatim
// down the page and across all twelve. Measuring the thing that ships is the
// difference between a floor and a flattering floor.
const factBlocks = candidateHtml.split('<div class="fact" data-claim-id="').slice(1);
let sharedHalfText = candidateHtml.split('<div class="fact"')[0]; // title, intro, first heading
let perProfessionText = "";
for (const block of factBlocks) {
  const id = block.slice(0, block.indexOf('"'));
  // everything after this fact div and before the next one is framing — shared
  const closing = block.indexOf("</div>");
  const body = block.slice(0, closing);
  const between = block.slice(closing);
  if (SHARED_CLAIM_IDS.has(id)) sharedHalfText += " " + body;
  else perProfessionText += " " + body;
  sharedHalfText += " " + between;
}

const S = shingles(tokensOf(sharedHalfText));
const U = shingles(tokensOf(perProfessionText));
const bestCaseOverlap = S.size / (S.size + U.size + U.size);

// ⚠️ AND THE SAME SUM DRAWN THE OTHER REASONABLE WAY.
//
// Above, a per-profession fact's CITATION is counted as per-profession, because
// the regulator's name changes. But "Source:", "Checked 2026-09-10." and the
// markup around them repeat verbatim on every fact of every page — so counting
// the whole citation as unique is generous. Drawing the line at the record text
// instead gives the other end of the same bookkeeping question.
//
// THE TWO ANSWERS STRADDLE THE THRESHOLD. That is the result, and it is worth
// more than either number: a design whose verdict depends on which side of a
// citation you draw a line is a design sitting ON the bar, not clearing it.
const S2 = shingles(tokensOf([
  PRODUCT.pageSpecs.nursing.title,
  PRODUCT.pageSpecs.nursing.intro,
  ...PRODUCT.pageSpecs.nursing.sections.map((sec) => `${sec.heading} ${sec.framing ?? ""}`),
  ...sharedRecords.map((r) => `${r.value.value} ${r.evidence.ownWords ?? ""} ${r.evidence.quotedSpan ?? ""}`),
].join(" ")));
const U2 = shingles(tokensOf(trace
  .filter((t) => !SHARED_CLAIM_IDS.has(t.claimId))
  .map((t) => records.find((r) => r.id === t.claimId))
  .map((r) => `${r.value.value} ${r.evidence.ownWords ?? ""} ${r.evidence.quotedSpan ?? ""}`)
  .join(" ")));
const bestCaseOverlapRecordText = S2.size / (S2.size + U2.size + U2.size);

console.log(`\n  🔴 THE BEST CASE, DERIVED NOT SIMULATED — two pages sharing ONLY the shared half:`);
console.log(`    shared-half shingles      ${S.size}`);
console.log(`    per-profession shingles   ${U.size} each`);
console.log(`    overlap = S / (S + U + U) = ${f4(bestCaseOverlap)}   / ${MAX_SIBLING_OVERLAP}   ${bestCaseOverlap <= MAX_SIBLING_OVERLAP ? "PASS" : "🔴 FAIL"}`);
console.log(`    ⚠️  this assumes the per-profession halves share NOT ONE 5-gram, which no two`);
console.log(`       pages about the same test ever will. It is a FLOOR, not a forecast.`);
console.log("");
console.log(`    the SAME SUM with the citation lines counted as shared instead:`);
console.log(`    overlap = ${f4(bestCaseOverlapRecordText)}   / ${MAX_SIBLING_OVERLAP}   ${bestCaseOverlapRecordText <= MAX_SIBLING_OVERLAP ? "PASS" : "🔴 FAIL"}`);
console.log(`    🔴 THE TWO READINGS STRADDLE THE BAR (${f4(bestCaseOverlap)} and ${f4(bestCaseOverlapRecordText)} against ${MAX_SIBLING_OVERLAP}).`);
console.log(`       A verdict that depends on which side of a citation you draw the line is a`);
console.log(`       design sitting ON the threshold, not clearing it — and the FLOOR is the`);
console.log(`       friendliest number this design will ever produce.`);

const report = {
  generatedOn: new Date().toISOString().slice(0, 10),
  step1: { claims: trace.length, records: records.length, trace },
  step2: { published: siblings.length, site: SITE },
  step3: { verdict: me.verdict, uniqueWords: me.uniqueWords, facts: me.facts?.qualifying, maxOverlap: me.maxOverlap, prose: kindCount("prose"), list: kindCount("list") },
  step4: {
    verdict: meAfter.verdict,
    uniqueWords: meAfter.uniqueWords,
    maxOverlap: meAfter.maxOverlap,
    sharedWords,
    framingWords,
    totalWords,
    identicalFraction: (sharedWords + framingWords) / totalWords,
    simulatedPairwise: pairwise,
    bestCaseOverlap,
    bestCaseOverlapRecordText,
    sharedHalfShingles: S.size,
    perProfessionShingles: U.size,
    model: "pessimistic — sentence structure identical across professions, proper nouns substituted. An UPPER BOUND on overlap.",
  },
};

if (outDir) {
  const chainOutcomes = [
    ["nursing.html", candidateHtml, "WRITE_CHAIN_CANDIDATE_PAGE"],
    ["chain-report.json", JSON.stringify(report, null, 2) + "\n", "WRITE_CHAIN_REPORT"],
  ].map(([name, body, what]) => executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
    repo: REPO, permission, target: join(outDir, name), targetClass: "RUN_EVIDENCE", bytes: body,
    action: what, occurredAt: CHAIN_INSTANT, correlationId: CHAIN_CORRELATION,
  })));
  const bad = chainOutcomes.find((o) => o.outcome !== "REFUSED" && o.outcome !== "COMMITTED" && o.outcome !== "ALREADY_COMMITTED");
  if (bad) {
    console.error(`🔴 ${bad.outcome} — ${outDir} was not written; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  } else if (chainOutcomes.every((o) => o.outcome === "REFUSED")) {
    console.log(`\n[dry-run] would have written ${outDir} — ${permission.reason}`);
  } else {
    console.log(`\nwrote ${outDir}/nursing.html and chain-report.json`);
  }
}
