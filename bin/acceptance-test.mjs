#!/usr/bin/env node
/**
 * THE ACCEPTANCE TEST — one corridor, five hand-sourced facts, Gate A re-run.
 *
 *   node bin/acceptance-test.mjs --corpus <dir> --page nursing__from-india
 *
 * ⚠️ THE AUGMENTED PAGE IS BUILT IN MEMORY AND NEVER PUBLISHED. Nothing is
 * written to any product repo, no page is created, no deploy happens. This reads
 * the real corpus, splices a hand-written fact block into ONE page's HTML, and
 * asks Gate A what changes.
 *
 * ── 🔴 AND IT REPORTS TWO OVERLAP NUMBERS, NOT ONE ──────────────────────────
 *
 * D2-A runs overlap on SURVIVORS ONLY, and that is right for a page's own
 * verdict. But it has a consequence nobody wrote down:
 *
 *     IF EVERY SIBLING IS REJECTED EARLIER, THE ONE SURVIVOR HAS NOBODY TO BE
 *     COMPARED WITH, AND SCORES 0 — A PERFECT OVERLAP SCORE, EARNED BY BEING
 *     THE LAST ONE STANDING.
 *
 * That is a FALSE PASS unless the rejected siblings are actually removed from
 * the web. Today they are all still published. So this test computes both:
 *
 *   (a) against SURVIVORS — what Gate A does today
 *   (b) against ALL PUBLISHED SIBLINGS — the honest number while they are live
 *
 * "Every sibling" has to mean every sibling a reader can still reach.
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { tokensOf } from "../src/gate-a/tokens.mjs";
import { tokensWithKind, uniqueWordsByKind } from "../src/gate-a/text-kind.mjs";
import { computeShells, uniqueWords, residualTokens } from "../src/gate-a/shell.mjs";
import { shingles, jaccard } from "../src/gate-a/overlap.mjs";
import { countFacts } from "../src/gate-a/facts.mjs";
import { MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP } from "../src/gate-a/run.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(n);
  return i === -1 || i + 1 >= argv.length ? d : argv[i + 1];
};
const corpusDir = flag("--corpus");
const group = flag("--group", "profession-origin");
const pageId = flag("--page", "nursing__from-india");
const factsDir = flag("--facts", "acceptance/nursing-from-india");
const outFile = flag("--out");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:acceptance-test:${RUN_INSTANT}`;
if (!corpusDir || !existsSync(join(corpusDir, group))) {
  console.error("usage: node bin/acceptance-test.mjs --corpus <dir> [--group g] [--page id] [--facts dir] [--out f] [--confirm]");
  process.exit(2);
}

const facts = JSON.parse(readFileSync(join(factsDir, "facts.json"), "utf8"));
const factBlock = readFileSync(join(factsDir, "fact-block.html"), "utf8");

console.log("\n⚠️ The augmented page exists only in this process. Nothing is published.\n");

// ── the group, real ─────────────────────────────────────────────────────────
const dir = join(corpusDir, group);
const raw = new Map();
for (const name of readdirSync(dir)) {
  if (extname(name) !== ".html") continue;
  raw.set(basename(name, ".html"), readFileSync(join(dir, name), "utf8"));
}
if (!raw.has(pageId)) { console.error(`page not in corpus: ${pageId}`); process.exit(2); }

/** Splice the fact block in before </body> — where a real section would render. */
function augment(html) {
  const i = html.lastIndexOf("</body>");
  return i === -1 ? html + factBlock : html.slice(0, i) + factBlock + html.slice(i);
}

const profession = pageId.split("__")[0];
const siblingIds = [...raw.keys()].filter((id) => id.split("__")[0] === profession);

function measure(label, htmlFor) {
  const ids = [...raw.keys()];
  const pagesTokens = ids.map((id) => tokensOf(htmlFor(id)));
  const shells = computeShells(pagesTokens);
  const shell = shells.shellB;

  const idx = ids.indexOf(pageId);
  const uw = uniqueWords(pagesTokens[idx], shell);
  const { tokens, kinds } = tokensWithKind(htmlFor(pageId));
  const kindSplit = uniqueWordsByKind(tokens, kinds, shell);

  const f = countFacts(label === "AFTER" ? facts : []);
  const residualOf = (id, i) => residualTokens(pagesTokens[i], shell);
  const mySig = shingles(residualOf(pageId, idx));

  // (b) against ALL published siblings of the same profession
  let bestAll = { score: 0, against: null };
  for (const id of siblingIds) {
    if (id === pageId) continue;
    const i = ids.indexOf(id);
    const s = jaccard(mySig, shingles(residualOf(id, i)));
    if (s > bestAll.score) bestAll = { score: s, against: id };
  }

  // (a) against SURVIVORS only — what Gate A does today
  const survivors = siblingIds.filter((id) => {
    if (id === pageId) return false;
    const i = ids.indexOf(id);
    if (uniqueWords(pagesTokens[i], shell) < MIN_UNIQUE_WORDS) return false;
    return countFacts([]).passes; // every sibling has no facts -> false
  });
  let bestSurv = { score: 0, against: null };
  for (const id of survivors) {
    const i = ids.indexOf(id);
    const s = jaccard(mySig, shingles(residualOf(id, i)));
    if (s > bestSurv.score) bestSurv = { score: s, against: id };
  }

  return {
    label, shellB: shells.sizeB, uniqueWords: uw, kinds: kindSplit.counts,
    residualWords: residualOf(pageId, idx).length,
    facts: { total: f.total, qualifying: f.qualifying, passes: f.passes, linkChecked: f.linkChecked, factChecked: f.factChecked },
    overlapAgainstSurvivors: { ...bestSurv, population: survivors.length },
    overlapAgainstAllPublished: { ...bestAll, population: siblingIds.length - 1 },
  };
}

/**
 * 🔴 THE ROLLOUT SIMULATION — the question the single-page test cannot answer.
 *
 * With the block on ONE page only, its four DESTINATION facts look unique,
 * because no sibling has them yet. That flatters the result. In a real rollout
 * every corridor page in the profession gets the same four — so they become
 * SHELL, and only the ORIGIN fact is left to tell the pages apart.
 *
 * This simulates that: every sibling gets the same destination paragraphs and
 * its OWN origin paragraph, built from the same EL 4.1 list.
 */
const EL41 = new Set([
  "antigua-and-barbuda", "australia", "bahamas", "barbados", "belize", "canada", "dominica",
  "grenada", "guyana", "jamaica", "malta", "new-zealand", "st-kitts-and-nevis", "saint-kitts-and-nevis",
  "st-lucia", "saint-lucia", "st-vincent-and-the-grenadines", "saint-vincent-and-the-grenadines",
  "trinidad-and-tobago", "united-states", "united-states-of-america", "usa",
]);
const titleCase = (slug) => slug.split("-").map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");

/** The destination half of the block — identical on every page, as it would be. */
const DESTINATION_HALF = factBlock.slice(0, factBlock.indexOf("<h2>What is different"));

function originParagraph(originSlug) {
  const name = titleCase(originSlug.replace(/^from-/, ""));
  const listed = EL41.has(originSlug.replace(/^from-/, ""));
  return (
    `<section><h2>What is different because you qualified in ${name}</h2><p>Registration with the NMC and ` +
    `permission to enter the UK are two separate requirements, and the second one treats nationality ` +
    `differently. Under the Immigration Rules, Appendix English Language, rule EL 4.1, an applicant meets ` +
    `the English language requirement automatically if they are a national of a listed ` +
    `majority-English-speaking country. That list is Antigua and Barbuda, Australia, The Bahamas, Barbados, ` +
    `Belize, The British Overseas Territories, Canada, Dominica, Grenada, Guyana, Jamaica, Malta, New ` +
    `Zealand, St Kitts and Nevis, St Lucia, St Vincent and the Grenadines, Trinidad and Tobago, and the ` +
    `United States of America. ${name} ${listed ? "is on it" : "is not on it"}. ` +
    `${listed
      ? `Because ${name} is listed, nationality alone meets the immigration English language requirement, ` +
        `and the test question is only about the NMC's own registration standard.`
      : `English being an official language of ${name}, and the whole of your nursing degree having been ` +
        `taught in English, does not change this: the exemption is by nationality, not by the language you ` +
        `were educated in.`} ` +
    `Source: GOV.UK, Immigration Rules Appendix English Language, read 10 September 2026.</p></section>`
  );
}

function rolloutHtml(id) {
  const html = raw.get(id);
  const i = html.lastIndexOf("</body>");
  const origin = id.split("__")[1] ?? "";
  const block = id.split("__")[0] === profession ? DESTINATION_HALF + originParagraph(origin) : "";
  return i === -1 ? html + block : html.slice(0, i) + block + html.slice(i);
}

const before = measure("BEFORE", (id) => raw.get(id));
const after = measure("AFTER", (id) => (id === pageId ? augment(raw.get(id)) : raw.get(id)));
const rollout = argv.includes("--rollout") ? measure("ROLLOUT", rolloutHtml) : null;

const f4 = (x) => x.toFixed(4);
const line = (k, b, a) => `${k.padEnd(30)} ${String(b).padStart(10)}   ->   ${String(a).padStart(10)}`;

console.log(`── ${group}/${pageId} — ${siblingIds.length - 1} published siblings in profession "${profession}" ──\n`);
console.log(`${"".padEnd(30)} ${"BEFORE".padStart(10)}        ${"AFTER".padStart(10)}`);
console.log(line("shell B (group)", before.shellB, after.shellB));
console.log(line(`uniqueWords (bar ${MIN_UNIQUE_WORDS})`, before.uniqueWords, after.uniqueWords));
for (const k of ["prose", "list", "heading", "other"]) console.log(line(`  ${k}`, before.kinds[k], after.kinds[k]));
console.log(line("residual words", before.residualWords, after.residualWords));
console.log(line("facts: total", before.facts.total, after.facts.total));
console.log(line("facts: qualifying (bar 5)", before.facts.qualifying, after.facts.qualifying));
console.log(line("facts: linkChecked", before.facts.linkChecked, after.facts.linkChecked));
console.log(line("facts: factChecked", before.facts.factChecked, after.facts.factChecked));
console.log(
  line(`overlap vs ALL published (bar ${MAX_SIBLING_OVERLAP})`, f4(before.overlapAgainstAllPublished.score), f4(after.overlapAgainstAllPublished.score)),
);
console.log(`${"".padEnd(30)} nearest: ${after.overlapAgainstAllPublished.against}`);
console.log(
  line("overlap vs SURVIVORS ONLY", f4(before.overlapAgainstSurvivors.score), f4(after.overlapAgainstSurvivors.score)),
);
console.log(`${"".padEnd(30)} survivor population: ${after.overlapAgainstSurvivors.population}`);

if (rollout) {
  console.log("\n🔴 ROLLOUT SIMULATION — every corridor page in this profession gets the SAME four");
  console.log("   destination facts and its OWN origin fact, which is what a real rollout does.\n");
  console.log(line("shell B (group)", after.shellB, rollout.shellB));
  console.log(line("uniqueWords", after.uniqueWords, rollout.uniqueWords));
  console.log(line("  prose", after.kinds.prose, rollout.kinds.prose));
  console.log(
    line("overlap vs ALL published", f4(after.overlapAgainstAllPublished.score), f4(rollout.overlapAgainstAllPublished.score)),
  );
  console.log(`${"".padEnd(30)} nearest: ${rollout.overlapAgainstAllPublished.against}`);
}

// ── the verdict, stage by stage, and it is allowed to fail ─────────────────
const stages = [
  ["1 · uniqueWords >= " + MIN_UNIQUE_WORDS, after.uniqueWords >= MIN_UNIQUE_WORDS],
  ["2 · qualifying facts >= 5", after.facts.passes],
  [`3 · overlap < ${MAX_SIBLING_OVERLAP} vs ALL published siblings`, after.overlapAgainstAllPublished.score < MAX_SIBLING_OVERLAP],
];
console.log("\n── VERDICT ──");
for (const [name, ok] of stages) console.log(`  ${ok ? "PASS" : "🔴 FAIL"}  ${name}`);
const passed = stages.every(([, ok]) => ok);
console.log(`\n  ${passed ? "KEEP" : "REJECT"} — and a FAIL here is a result, not a setback.\n`);

if (outFile) {
  /* 🔴 CONFINED, WHICH IT WAS NOT BEFORE. This binary wrote an operator-chosen path with no confinement at all,
   * so `--out` could name anywhere on the machine. Routing it puts it under the same law as every other governed
   * output. That is a deliberate tightening, recorded rather than slipped in: an outside-repository destination
   * is now refused instead of written. */
  const governed = executeGovernedWrite(governedFileWrite({
    repo: REPO, permission, target: confineToRepo(outFile, { label: "--out" }),
    targetClass: "OPERATOR_CHOSEN_OUTPUT",
    bytes: JSON.stringify({ page: pageId, group, before, after, stages }, null, 2),
    action: "WRITE_ACCEPTANCE_TEST_REPORT", occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
  }));
  if (governed.outcome === "REFUSED") console.log(`[dry-run] --out ${outFile} given, nothing written. Add --confirm.`);
  else if (governed.outcome === "COMMITTED" || governed.outcome === "ALREADY_COMMITTED") console.log(`wrote ${outFile} [${governed.outcome}]`);
  else { console.error(`🔴 ${governed.outcome} — ${outFile} was not written; the governed attempt is on the audit trail`); process.exitCode = 1; }
}
