/**
 * GATE A, IN ORDER.
 *
 * ── 🔴 D2-A · THE ORDER IS PART OF THE GATE, NOT AN OPTIMISATION ────────────
 *
 *     1. uniqueWords    linear, per page   → reject here and STOP
 *     2. verified facts linear, per page   → reject here and STOP
 *     3. sibling overlap QUADRATIC, pairwise → ONLY on what survived 1 and 2
 *
 * Overlap is Gate A's only quadratic check, and an earlier draft ran it over
 * everything. **A page that already failed uniqueWords is already rejected; its
 * overlap never needs computing.**
 *
 * On AlmiOET this is the difference between running and not running: the measured
 * pages carry 66, 95, 102, 111 and 167 unique words against a threshold of 350,
 * so the population reaching stage 3 is close to zero and the 28-billion-pair
 * problem mostly stops existing.
 *
 * ⚠️ AND IT MUST NOT BE ALLOWED TO HIDE ANYTHING. A stage that silently receives
 * an empty population is the vacuous-gate failure — count the population BEFORE
 * the guard. So the result carries `reachedOverlap`, and the reporter says in
 * words when it is zero. An empty stage 3 is a finding about the corpus, never a
 * pass.
 */
import { tokensOf } from "./tokens.mjs";
import { computeShells, uniqueWords, residualTokens } from "./shell.mjs";
import { countFacts, MIN_FACTS } from "./facts.mjs";
import { exactAllPairs, strategyFor, EXACT_ALL_PAIRS_MAX_GROUP } from "./overlap.mjs";

/** Gate A's published thresholds. */
export const MIN_UNIQUE_WORDS = 350;
export const MAX_SIBLING_OVERLAP = 0.40;

/**
 * @param {{ id: string, html: string, facts?: unknown[], whyThisUrl?: string }[]} group
 *        one TEMPLATE GROUP. Two templates are never compared to each other.
 */
export function runGateA(group, { now = new Date(), shellDefinition = "B" } = {}) {
  const pages = group.map((p) => ({ ...p, tokens: tokensOf(p.html) }));

  // Population before the guard — reported even when it is zero.
  if (pages.length === 0) {
    return {
      pages: 0, shell: null, results: [],
      reachedOverlap: 0, eliminatedBefore: 0,
      overlapStrategy: null,
      vacuous: true,
    };
  }

  const shellInfo = computeShells(pages.map((p) => p.tokens));
  const shell = shellDefinition === "A" ? shellInfo.shellA : shellInfo.shellB;

  // ── stage 1 and 2 · linear, per page ─────────────────────────────────────
  const results = pages.map((p) => {
    const unique = uniqueWords(p.tokens, shell);
    const uniquePass = unique >= MIN_UNIQUE_WORDS;

    // Not computed at all when stage 1 already rejected the page — that is the
    // whole point of the ordering, and it must be visible in the record.
    const facts = uniquePass ? countFacts(p.facts ?? [], now) : null;
    const factsPass = facts ? facts.passes : false;

    const why = typeof p.whyThisUrl === "string" && p.whyThisUrl.trim().length > 0;

    return {
      id: p.id,
      totalWords: p.tokens.length,
      uniqueWords: unique,
      uniquePass,
      facts,
      factsPass,
      whyThisUrlPresent: why,
      // stage 3 fields, filled below only for survivors
      maxOverlap: null,
      overlapAgainst: null,
      residualWords: null,
      overlapPass: null,
      verdict: "PENDING",
      rejectedAt: uniquePass ? (factsPass ? null : "facts") : "uniqueWords",
    };
  });

  // ── stage 3 · quadratic, survivors only ──────────────────────────────────
  const survivors = results.filter((r) => r.uniquePass && r.factsPass);
  const strategy = strategyFor(survivors.length);

  if (survivors.length > 1 && survivors.length <= EXACT_ALL_PAIRS_MAX_GROUP) {
    const byId = new Map(pages.map((p) => [p.id, p]));
    const withResidual = survivors.map((r) => ({
      id: r.id,
      residual: residualTokens(byId.get(r.id).tokens, shell),
    }));
    for (const o of exactAllPairs(withResidual)) {
      const row = results.find((r) => r.id === o.id);
      row.maxOverlap = o.maxOverlap;
      row.overlapAgainst = o.against;
      row.residualWords = o.residualWords;
      row.noisyResidual = o.noisy;
      row.overlapPass = o.maxOverlap <= MAX_SIBLING_OVERLAP;
    }
  } else if (survivors.length === 1) {
    const only = results.find((r) => r.id === survivors[0].id);
    const byId = new Map(pages.map((p) => [p.id, p]));
    only.residualWords = residualTokens(byId.get(only.id).tokens, shell).length;
    only.maxOverlap = 0;
    only.overlapAgainst = null;
    only.overlapPass = true;
    only.onlySurvivor = true; // an overlap of 0 here means "no sibling to compare", not "unique"
  }

  for (const r of results) {
    if (!r.uniquePass) r.verdict = "REJECT";
    else if (!r.factsPass) r.verdict = "REJECT";
    else if (!r.whyThisUrlPresent) { r.verdict = "REJECT"; r.rejectedAt = "whyThisUrl"; }
    else if (r.overlapPass === false) { r.verdict = "REJECT"; r.rejectedAt = "overlap"; }
    else r.verdict = "KEEP";
  }

  return {
    pages: pages.length,
    shell: {
      definition: shellDefinition,
      sizeA: shellInfo.sizeA,
      sizeB: shellInfo.sizeB,
      minPagesForShell: shellInfo.minPagesForShell,
      bEqualsA: shellInfo.bEqualsA,
    },
    results,
    reachedOverlap: survivors.length,
    eliminatedBefore: pages.length - survivors.length,
    overlapStrategy: strategy,
    thresholds: { MIN_UNIQUE_WORDS, MIN_FACTS, MAX_SIBLING_OVERLAP },
    vacuous: false,
  };
}
