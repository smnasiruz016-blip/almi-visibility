#!/usr/bin/env node
/**
 * THE SHARED BLOCK, EXTRACTED — ARITHMETIC ONLY. NO NEW FETCH, NO NEW WRITING.
 *
 *   node bin/split-measure.mjs [--out=runs/split --confirm]
 *
 * §5A: *"Page generation must not create independent untraceable copies of the
 * same factual claim."* We built the facts by reference and then rendered seven
 * of them onto twelve pages. **The by-reference rule stopped at the page
 * boundary.** This measures what happens when it does not: the shared claims get
 * their own page and the twelve link to it.
 *
 * 🔴 EVERYTHING HERE COMES FROM DATA ALREADY IN THE REPOSITORY. The eleven
 * sibling pages are read from the cache written by `npm run chain`. Nothing is
 * fetched and no new sentence is written except the one-line link that replaces
 * the extracted block — and that link is COUNTED, because it is words on the
 * page and it is the same words on all twelve.
 *
 * ── BOTH VARIANTS, BOTH BOOKKEEPINGS, SIDE BY SIDE ──────────────────────────
 *
 * The comparison is only worth anything if it is like-for-like, so the split
 * variant goes through THE SAME code path as the original: same renderer, same
 * Gate A, same rollout model, same two bookkeeping splits. Neither number is
 * chosen over the other; both are printed for both variants.
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { loadRegistry, toGateAFact } from "../src/facts/registry.mjs";
import { NURSING_PAGE, PROFESSIONS } from "../src/page/spec.mjs";
import { SHARED_CLAIM_IDS, SHARED_PAGE, splitSpec, TEST_SHARED, ORIGIN_SHARED, PENDING_ORIGIN_LAYER, PREMISE_CLAIM } from "../src/page/split.mjs";
import { renderPage } from "../src/page/render.mjs";
import { runGateA, MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP } from "../src/gate-a/run.mjs";
import { tokensWithKind } from "../src/gate-a/text-kind.mjs";
import { tokensOf } from "../src/gate-a/tokens.mjs";
import { shingles, jaccard } from "../src/gate-a/overlap.mjs";
import { uniqueWords } from "../src/gate-a/shell.mjs";

const argv = process.argv.slice(2);
const outDir = argv.find((a) => a.startsWith("--out="))?.split("=").slice(1).join("=") ?? null;
const permission = writePermission({ target: LOCAL, argv, env: process.env });
if (outDir) announceWritePermission(permission);

const line = (ch = "─") => console.log(ch.repeat(78));
const f4 = (n) => (n === null || n === undefined ? "—" : n.toFixed(4));
const CACHE = "runs/_profession-cache";

const { records } = await loadRegistry();

if (!existsSync(CACHE) || readdirSync(CACHE).length < 11) {
  console.error(`\n🔴 ${CACHE} is missing or short. Run \`npm run chain\` first — this script does not fetch.`);
  process.exit(2);
}
const siblings = readdirSync(CACHE)
  .filter((f) => f.endsWith(".html"))
  .map((f) => ({ id: f.replace(/\.html$/, ""), html: readFileSync(join(CACHE, f), "utf8") }));

/** Render + measure one variant end to end, through the same code path. */
function measure(spec, label) {
  const { html, trace } = renderPage(spec, records);
  const facts = trace.map((t) => toGateAFact(records.find((r) => r.id === t.claimId)));
  const { tokens, kinds } = tokensWithKind(html);
  const k = (kind) => kinds.filter((x) => x === kind).length;

  // stage 1-3 against the ELEVEN PUBLISHED siblings
  const group = [{ id: "candidate", html, facts, whyThisUrl: "x" }, ...siblings];
  const gate = runGateA(group);
  const me = gate.results.find((r) => r.id === "candidate");

  // ── 🔴 THE PESSIMISTIC ROLLOUT MODEL IS RETIRED. KEPT, NOT DELETED. ──
  //
  // RETIRED 2026-09-10 by the owner, on evidence this script produced.
  //
  // It models the other eleven pages as THE SAME SENTENCES WITH THE NOUNS
  // CHANGED. Before the shared block was extracted that was informative: it
  // showed the shared half becoming shell. AFTER the extraction it moved 45 -> 43
  // while the real measure moved 0.3921 -> 0.1292, because it assumes the
  // per-profession half is copied too.
  //
  //   A MODEL THAT ASSUMES THE THING IT IS TESTING IS NOT A MEASUREMENT.
  //   It was testing its own premise, and it would reject any design ever built.
  //
  // And OUR OWN REGISTRY DISPROVES THE PREMISE: NMBI answers the
  // recognised-country question with FIVE countries where UKVI says EIGHTEEN --
  // one claim, one profession, two regulators, two answers. Twelve regulators of
  // twelve professions will not be one text with the nouns swapped.
  //
  // It still RUNS, and its number is still printed under a RETIRED label, because
  // deleting it would hide that we ever relied on it. NOTHING READS IT AS A
  // VERDICT: the decision is the best case, below.
  const sim = (profession, i) => {
    let h = html;
    h = h.split("nursing").join(profession);
    h = h.split("Nursing").join(profession[0].toUpperCase() + profession.slice(1));
    h = h.split("nurse").join(`${profession} practitioner`);
    h = h.split("Nursing and Midwifery Council").join(`Regulator ${i} for ${profession}`);
    h = h.split("Nursing and Midwifery Board of Ireland").join(`Irish regulator ${i} for ${profession}`);
    return h;
  };
  const rolloutGroup = [
    { id: "candidate", html, facts, whyThisUrl: "x" },
    ...PROFESSIONS.filter((p) => p !== "nursing").map((p, i) => ({ id: `${p}-sim`, html: sim(p, i + 1), facts, whyThisUrl: "x" })),
  ];
  const rollout = runGateA(rolloutGroup);
  const meAfter = rollout.results.find((r) => r.id === "candidate");

  // ── the two bookkeeping splits, exactly as before ─────────────────────────
  // A: off the RENDERED HTML — a per-profession fact's citation counts as
  //    per-profession, because the regulator's name changes.
  const shared = new Set(SHARED_CLAIM_IDS);
  const blocks = html.split('<div class="fact" data-claim-id="').slice(1);
  let sharedA = html.split('<div class="fact"')[0];
  let uniqueA = "";
  for (const b of blocks) {
    const id = b.slice(0, b.indexOf('"'));
    const close = b.indexOf("</div>");
    if (shared.has(id)) sharedA += " " + b.slice(0, close);
    else uniqueA += " " + b.slice(0, close);
    sharedA += " " + b.slice(close);
  }
  const SA = shingles(tokensOf(sharedA));
  const UA = shingles(tokensOf(uniqueA));

  // B: off the RECORD TEXT — the citation boilerplate counts as shared, because
  //    "Source:" and "Checked …" repeat verbatim everywhere.
  const framing = [spec.title, spec.intro, ...spec.sections.map((s) => `${s.heading} ${s.framing ?? ""}`), spec.trailer ?? ""].join(" ");
  const textOf = (ids) =>
    ids
      .map((id) => records.find((r) => r.id === id))
      .filter(Boolean)
      .map((r) => `${r.value.value} ${r.evidence.ownWords ?? ""} ${r.evidence.quotedSpan ?? ""}`)
      .join(" ");
  const onPage = trace.map((t) => t.claimId);
  const SB = shingles(tokensOf(`${framing} ${textOf(onPage.filter((id) => shared.has(id)))}`));
  const UB = shingles(tokensOf(textOf(onPage.filter((id) => !shared.has(id)))));

  const best = (S, U) => S.size / (S.size + U.size + U.size);

  // 🔴 THE BEST-CASE ROLLOUT uniqueWords, and it needs saying why it exists.
  //
  // The PESSIMISTIC rollout models the other eleven as the same sentences with
  // the nouns changed. Before the split that was informative: it showed the
  // shared block dominating. AFTER the split it is close to VACUOUS — it assumes
  // the per-profession half is copied too, and if that were true no design could
  // pass, so it tests its own premise rather than the page.
  //
  // And we KNOW the premise is false: NMBI already answers the recognised-country
  // question with FIVE countries where UKVI says EIGHTEEN, on the same claim. Two
  // regulators of the same profession disagree; twelve regulators of twelve
  // professions will not be one text with the nouns swapped.
  //
  // So the honest companion number: if the per-profession halves are genuinely
  // different, the shell after rollout is the FRAMING, and uniqueWords is what
  // survives above it. Arithmetic, off the same rendered page.
  const perTokens = tokensOf(uniqueA);
  const framingTokens = tokensOf(sharedA);
  const framingCounts = new Map();
  for (const t of framingTokens) framingCounts.set(t, (framingCounts.get(t) ?? 0) + 1);
  const bestCaseRolloutUnique = uniqueWords(perTokens, framingCounts);

  return {
    label,
    claims: trace.length,
    words: tokens.length,
    prose: k("prose"),
    list: k("list"),
    heading: k("heading"),
    onePage: { uniqueWords: me.uniqueWords, facts: me.facts?.qualifying ?? 0, overlap: me.maxOverlap, verdict: me.verdict, pass: me.uniquePass },
    rollout: {
      uniqueWords: meAfter.uniqueWords,
      shellBefore: gate.shell.sizeB,
      shellAfter: rollout.shell.sizeB,
      overlap: meAfter.maxOverlap,
      verdict: meAfter.verdict,
    },
    bestCaseRolloutUnique,
    perProfessionWords: perTokens.length,
    sharedWords: framingTokens.length,
    bestCaseA: best(SA, UA),
    bestCaseB: best(SB, UB),
    shinglesA: { S: SA.size, U: UA.size },
    shinglesB: { S: SB.size, U: UB.size },
    pairwiseSim: jaccard(shingles(tokensOf(rolloutGroup[1].html)), shingles(tokensOf(rolloutGroup[2].html))),
  };
}

const before = measure(NURSING_PAGE, "AS BUILT (shared block on every page)");
const split = splitSpec();
const after = measure(split, "SPLIT (shared block extracted, linked)");
const sharedPage = measure(SHARED_PAGE, "THE SHARED PAGE ITSELF");

// The reader-safe split IS the default now (see src/page/split.mjs), so the
// useful comparison flips: what would removing the PREMISE as well have bought?
// That is the price of the ruling and it belongs on screen, not in an argument.
const premiseRemovedToo = measure(splitSpec(NURSING_PAGE, SHARED_CLAIM_IDS), "PREMISE REMOVED TOO (not taken)");

// 🔴 The four that are NOT duplicated but MISPLACED must render NOWHERE.
// Checked rather than asserted: a claim that is "awaiting its layer" and quietly
// still on a page would be the worst of both.
const renderedPending = renderPage(split, records).trace.filter((t) => PENDING_ORIGIN_LAYER.includes(t.claimId));

console.log(`\nTHE SHARED BLOCK, EXTRACTED — ARITHMETIC ONLY, NO NEW FETCH`);
line("═");
console.log(`  ${split.removedClaims.length} claims move to /${SHARED_PAGE.slug}; ${after.claims} stay on /nursing.`);
console.log(`  The eleven siblings come from the cache written by \`npm run chain\`. Nothing was fetched.`);

const row = (name, a, b) => console.log(`  ${name.padEnd(34)} ${String(a).padStart(10)}   ${String(b).padStart(10)}`);
console.log(`\n${"".padEnd(36)} ${"AS BUILT".padStart(10)}   ${"SPLIT".padStart(10)}`);
line();
row("claims on the page", before.claims, after.claims);
row("total words", before.words, after.words);
row("  prose", before.prose, after.prose);
row("  list", before.list, after.list);
row("  heading", before.heading, after.heading);
console.log("");
row("uniqueWords — ONE PAGE", before.onePage.uniqueWords, after.onePage.uniqueWords);
row("facts", before.onePage.facts, after.onePage.facts);
row("overlap — ONE PAGE", f4(before.onePage.overlap), f4(after.onePage.overlap));
row("verdict — ONE PAGE", before.onePage.verdict, after.onePage.verdict);
console.log("");
console.log(`  RETIRED MODEL — pessimistic rollout. Printed, never acted on.`);
console.log(`    It assumes the per-profession half is copied too, so after the extraction`);
console.log(`    it tests its own premise. NMBI says 5 recognised countries where UKVI says 18.`);
row("uniqueWords", before.rollout.uniqueWords, after.rollout.uniqueWords);
row(`  (bar ${MIN_UNIQUE_WORDS})`, before.rollout.uniqueWords >= MIN_UNIQUE_WORDS ? "PASS" : "FAIL", after.rollout.uniqueWords >= MIN_UNIQUE_WORDS ? "PASS" : "FAIL");
row("group shell after rollout", before.rollout.shellAfter, after.rollout.shellAfter);
row("overlap (pessimistic)", f4(before.rollout.overlap), f4(after.rollout.overlap));
row("verdict", before.rollout.verdict, after.rollout.verdict);
console.log("");
console.log(`  🔴 AFTER ROLLOUT — THE NUMBER THAT DECIDES`);
console.log(`     the per-profession halves are genuinely different, which is the only`);
console.log(`     assumption our own registry supports`);
row("uniqueWords, best case", before.bestCaseRolloutUnique, after.bestCaseRolloutUnique);
row(`  (bar ${MIN_UNIQUE_WORDS})`, before.bestCaseRolloutUnique >= MIN_UNIQUE_WORDS ? "PASS" : "FAIL", after.bestCaseRolloutUnique >= MIN_UNIQUE_WORDS ? "PASS" : "FAIL");
row("shared words on the page", before.sharedWords, after.sharedWords);
row("per-profession words", before.perProfessionWords, after.perProfessionWords);
console.log("");
console.log(`  BEST CASE — both bookkeeping readings, neither chosen over the other`);
row("A · citations per-profession", f4(before.bestCaseA), f4(after.bestCaseA));
row(`     S / U shingles`, `${before.shinglesA.S}/${before.shinglesA.U}`, `${after.shinglesA.S}/${after.shinglesA.U}`);
row("B · citations shared", f4(before.bestCaseB), f4(after.bestCaseB));
row(`     S / U shingles`, `${before.shinglesB.S}/${before.shinglesB.U}`, `${after.shinglesB.S}/${after.shinglesB.U}`);
row(`  vs bar ${MAX_SIBLING_OVERLAP}`, `${before.bestCaseA <= MAX_SIBLING_OVERLAP ? "pass" : "FAIL"}/${before.bestCaseB <= MAX_SIBLING_OVERLAP ? "pass" : "FAIL"}`, `${after.bestCaseA <= MAX_SIBLING_OVERLAP ? "pass" : "FAIL"}/${after.bestCaseB <= MAX_SIBLING_OVERLAP ? "pass" : "FAIL"}`);
console.log("");
row("two simulated siblings", f4(before.pairwiseSim), f4(after.pairwiseSim));

console.log(`\n🔴 THE RULING, MEASURED`);
line();
console.log(`  the PREMISE claim stays on the profession page.`);
console.log(`    remove it too and overlap would be ${f4(premiseRemovedToo.bestCaseA)} / ${f4(premiseRemovedToo.bestCaseB)}`);
console.log(`    keeping it costs ${f4(premiseRemovedToo.bestCaseA)} → ${f4(after.bestCaseA)} — still about half the bar.`);
console.log(`    ONE claim has been shown to earn its repetition. It is the only one.`);
console.log("");
console.log(`  🔴 THE FOUR THAT ARE NOT DUPLICATED — THEY ARE MISPLACED`);
for (const id of PENDING_ORIGIN_LAYER) console.log(`     ${id}`);
console.log(`     A profession page NEVER KNOWS THE READER'S ORIGIN, so these were shown to`);
console.log(`     every reader alike. They are NOT behind a link — they are AWAITING A LAYER`);
console.log(`     THAT KNOWS THE ORIGIN, where "here are the rules" becomes "Nigeria is`);
console.log(`     red-listed, and here is what that means for you".`);
console.log(`     rendered on a page today: ${renderedPending.length}   held in the registry: ${PENDING_ORIGIN_LAYER.length}`);
console.log("");
console.log(`     ⚠️  AND THIS DOES NOT BRING BACK 191 CORRIDOR PAGES. The red list is ONE`);
console.log(`        CLAIM WITH 191 VALUES — a TABLE, not 191 pages. The per-origin measurement`);
console.log(`        STANDS: outside a handful of regulators an origin is still about ONE BIT`);
console.log(`        (31/47 median/max words over 573 pages). This CONFIRMS the narrow ruling`);
console.log(`        rather than reopening it: a corridor page is defensible only where the`);
console.log(`        origin GENUINELY CHANGES THE ANSWER — and a red-listed country is exactly`);
console.log(`        where it does.`);
console.log(`\nTHE SHARED PAGE ITSELF (/${SHARED_PAGE.slug})`);
line();
console.log(`  ${sharedPage.claims} claims · ${sharedPage.words} words · prose ${sharedPage.prose} · uniqueWords ${sharedPage.onePage.uniqueWords} · facts ${sharedPage.onePage.facts}`);
console.log(`  It is ONE page carrying claims that were rendered TWELVE times. That is the`);
console.log(`  by-reference rule finally reaching past the page boundary.`);

if (outDir) {
  if (!permission.mayWrite) console.log(`\n[dry-run] would have written ${outDir} — ${permission.reason}`);
  else {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "split-report.json"), JSON.stringify({ before, after, premiseRemovedToo, sharedPage, pendingOriginLayer: PENDING_ORIGIN_LAYER, premiseClaim: PREMISE_CLAIM, removed: split.removedClaims, testShared: TEST_SHARED, originShared: ORIGIN_SHARED }, null, 2) + "\n", "utf8");
    writeFileSync(join(outDir, "nursing-split.html"), renderPage(split, records).html, "utf8");
    writeFileSync(join(outDir, "shared-page.html"), renderPage(SHARED_PAGE, records).html, "utf8");
    console.log(`\nwrote ${outDir}/`);
  }
}
