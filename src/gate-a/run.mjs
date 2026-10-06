/**
 * GATE A, IN ORDER.
 *
 * 🔴 RR-192 · T-1 (RTP-1 §17 S8; the owner's PG-A1): THE "reject here and STOP" BELOW IS RETIRED. 350 unique words, five facts and 0.40
 * overlap are review signals only — every page is measured on all three and none is rejected on them. What still REJECTS is not a number:
 * no why-this-url, and a pair whose overlap could not be measured (D-GATEA-1). Above 0.40 a page is REVIEW_REQUIRED. The history below
 * is kept as written.
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
 *
 * ── 🔴 AND THE DENOMINATOR RULE, ADDED 10 SEPTEMBER 2026 ────────────────────
 *
 * An earlier version compared survivors against SURVIVORS. On the first real
 * acceptance test that produced a perfect 0.0000 against a survivor population
 * of ZERO — a page scoring full marks for being the last one standing, while all
 * 190 of its near-identical siblings were still published and indexed.
 *
 *     A GATE MAY NOT BUILD ITS DENOMINATOR OUT OF ITS OWN OUTPUT.
 *     The more it rejects, the more unique the remainder looks. A gate that gets
 *     EASIER the more it rejects is not a gate.
 *
 *     "EVERY SIBLING" MEANS EVERY SIBLING A READER CAN STILL REACH.
 *
 * ══ 🔴 AND ITS GENERAL FORM, WHICH ARRIVED LATER ────────────────────══
 *
 *   THE SHARED HALF IS A PROPERTY OF THE PAGE AS IT RENDERS, NOT A PROPERTY OF
 *   THE RULING ABOUT IT. A MEASUREMENT THAT CHANGES BECAUSE A RULING CHANGED IS
 *   MEASURING THE RULING.
 *
 * The denominator rule is the special case: a gate may not build its
 * denominator out of its own OUTPUT. This is the same error one level up — a
 * gate may not build its denominator out of its own DECISIONS either.
 *
 * It has now been caught twice, both times by re-running an old baseline after
 * changing something that was not supposed to touch it:
 *   · repointing the shared set at a newly-ruled subset moved the AS-BUILT
 *     baseline 0.3921 → 0.1927
 *   · a hardcoded "repeated claims" list, assembled from one page, credited
 *     another page's profession-independent text as distinguishing
 *
 * THE CHECK THAT CATCHES IT: after any change, re-run the OLD baseline and
 * confirm it still prints the old number. A baseline that moves when you were
 * not measuring the baseline is the alarm.
 *
 * So stage 3 SCORES only survivors — D2-A is untouched, the work is still
 * candidates x population rather than population squared — but it scores them
 * against THE WHOLE PUBLISHED GROUP. What changed is the denominator, not the
 * workload. `overlapPopulation` and `overlapComparisons` are reported beside
 * `reachedOverlap` so the two can never again be confused.
 */
import { tokensOf } from "./tokens.mjs";
import { computeShells, uniqueWords, residualTokens, shellFor, MIN_PAGES_FOR_OWN_SHELL } from "./shell.mjs";
import { countFacts, MIN_FACTS } from "./facts.mjs";
import { maxAgainstPopulation, strategyFor, EXACT_ALL_PAIRS_MAX_GROUP } from "./overlap.mjs";

/**
 * Gate A's published thresholds.
 *
 * ══ 🔴 WHAT THESE TWO HAVE AND HAVE NOT PROVEN — 10 September 2026 ═══════
 *
 * The shared-block extraction moved best-case overlap from 0.3921/0.4003 to
 * 0.1292/0.1468 by removing duplication and touching nothing else. Both
 * constants survived that run without being moved, and the cause turned out to
 * be ours rather than theirs.
 *
 * THE NARROW SENTENCE, BECAUSE THAT IS LESS THAN IT LOOKS LIKE:
 *
 *   These thresholds have proven that THEY CAN DISCRIMINATE — 0.39 against 0.13
 *   is a real separation between a duplicated design and a de-duplicated one.
 *   IT IS NOT PROVEN THAT THEIR POINT IS IN THE RIGHT PLACE.
 *   DISCRIMINATING AND BEING CORRECTLY PLACED ARE TWO DIFFERENT THINGS, AND THE
 *   SECOND IS STILL UNMEASURED.
 *
 * ⚠️ Both were REASONED TO, not measured from a page that ranks. Neither carries
 * a sample, and RULE TWELVE applies to both — a threshold that justifies itself
 * with a measurement must name that measurement, and these cannot.
 *
 * ══ THE DEBT, AND WHEN IT FALLS DUE ═══════════════════════════════════════
 *
 * 🔴 RECIPE — MANDATORY BEFORE THE FIRST COHORT IS PUBLISHED.
 *
 * Measure ten pages that actually rank for OET, with our own method: uniqueWords
 * after shell, the prose/list split, how many external sources they cite and at
 * what tier, and — if they have per-profession pages — THEIR OWN mutual overlap
 * measured with our shingles.
 *
 * Deferred, not cancelled, and the reason is a real one: CALIBRATION MATTERS AT
 * PUBLISH TIME, NOT AT DESIGN TIME. While nothing is being published, a
 * threshold set in the wrong place only keeps us stricter than necessary — which
 * is the safe direction to be wrong in. The day a cohort is published, it stops
 * being safe, because then a mis-placed bar either ships thin pages or blocks
 * good ones.
 */
/* 🔴 RR-192 · T-1 (RTP-1 §17 S8 and S9; the owner's PG-A1, _handoffs b5b616e): NEITHER NUMBER DECIDES ANY MORE. 350 unique words and five
 * facts are REVIEW SIGNALS, measured and reported; 0.40 is the overlap REVIEW SIGNAL of P20 — above it a page is REVIEW_REQUIRED (a recorded
 * substance review decides), never REJECT. Completeness is the adaptive gate's (P21, src/gate-a/adaptive.mjs), a claim's support P14's. The
 * names stay because frozen acceptances (F32 C6 as amended, F40 C6) name them in their censuses of what may never decide. */
export const MIN_UNIQUE_WORDS = 350;
export const MAX_SIBLING_OVERLAP = 0.40;

/**
 * @param {{ id: string, html: string, facts?: unknown[], whyThisUrl?: string }[]} group
 *        one TEMPLATE GROUP. Two templates are never compared to each other.
 */
export function runGateA(group, { now = new Date(), shellDefinition = "B", reference = null } = {}) {
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
  /* 🔴 D-GATEA-1 (13 September 2026). A group smaller than MIN_PAGES_FOR_OWN_SHELL
   * cannot learn its own shell: in a pair, a duplicated body IS the shell and an
   * identical pair scores 0. With a `reference` (other pages of the same site)
   * the shell is borrowed from it. Without one, a PAIR's overlap is UNMEASURABLE
   * and the page cannot be kept on it — see the verdict below. A single page is
   * unchanged: the shell eats it at stage 1, as before. */
  const borrowed =
    pages.length < MIN_PAGES_FOR_OWN_SHELL && reference
      ? shellFor({ groupTokens: pages.map((p) => p.tokens), referenceTokens: reference.map((r) => tokensOf(r.html)), definition: shellDefinition })
      : null;
  const shell = borrowed?.shell ?? (shellDefinition === "A" ? shellInfo.shellA : shellInfo.shellB);
  const pairUnmeasurable = pages.length === 2 && !borrowed?.shell;

  // ── stage 1 and 2 · linear, per page — MEASURED AND REPORTED, NEVER A STOP (RR-192 · T-1) ──
  // The 350-word and five-fact figures decide nothing any more (RTP-1 S8), so nothing stops at them: every page is measured on
  // every stage. D2-A's ordering was a workload rule built on those stops; the workload stays bounded by EXACT_ALL_PAIRS_MAX_GROUP.
  const results = pages.map((p) => {
    const unique = uniqueWords(p.tokens, shell);
    const facts = countFacts(p.facts ?? [], now);
    const why = typeof p.whyThisUrl === "string" && p.whyThisUrl.trim().length > 0;

    return {
      id: p.id,
      totalWords: p.tokens.length,
      uniqueWords: unique,
      belowUniqueWordsSignal: unique < MIN_UNIQUE_WORDS, // a labelled signal, never a stop
      facts,
      factsReachSignal: facts.reachesSignal, // a labelled signal, never a stop
      whyThisUrlPresent: why,
      // stage 3 fields, filled below
      maxOverlap: null,
      overlapAgainst: null,
      residualWords: null,
      overlapAboveReviewSignal: null,
      verdict: "PENDING",
      rejectedAt: null,
    };
  });

  // ── stage 3 · every page is scored against the WHOLE PUBLISHED GROUP ─
  //
  // 🔴 The denominator is the published population, never the run's own output.
  // See maxAgainstPopulation() in overlap.mjs for the defect this replaces.
  // RR-192 · T-1: no page is eliminated before it, so every page is a candidate.
  const survivors = results;
  const strategy = strategyFor(pages.length);

  if (survivors.length > 0 && pages.length <= EXACT_ALL_PAIRS_MAX_GROUP) {
    const withResidual = pages.map((p) => ({ id: p.id, residual: residualTokens(p.tokens, shell) }));
    const byId = new Map(withResidual.map((p) => [p.id, p]));
    const candidates = survivors.map((r) => byId.get(r.id));

    for (const o of maxAgainstPopulation(candidates, withResidual)) {
      const row = results.find((r) => r.id === o.id);
      row.maxOverlap = o.maxOverlap;
      row.overlapAgainst = o.against;
      row.residualWords = o.residualWords;
      row.noisyResidual = o.noisy;
      row.comparedWith = o.comparedWith;
      // An empty population is a finding, not a pass. A page alone in its group
      // has nothing to be different FROM, and must not collect a free pass here.
      row.overlapVacuous = o.vacuous;
      // A pair with no reference shell: the score exists but measures nothing, so it is neither pass nor fail.
      row.overlapUnmeasurable = pairUnmeasurable;
      row.overlapAboveReviewSignal = o.vacuous || pairUnmeasurable ? null : o.maxOverlap > MAX_SIBLING_OVERLAP;
    }
  }

  for (const r of results) {
    if (!r.whyThisUrlPresent) { r.verdict = "REJECT"; r.rejectedAt = "whyThisUrl"; }
    // RR-192 · T-1 (P20): above the 0.40 review signal a page needs a recorded substance review — REVIEW_REQUIRED, never REJECT.
    else if (r.overlapAboveReviewSignal === true) { r.verdict = "REVIEW_REQUIRED"; r.reviewAt = "overlap"; }
    // 🔴 D-GATEA-1: a page is never kept on an overlap that could not be measured.
    else if (r.overlapUnmeasurable) { r.verdict = "REJECT"; r.rejectedAt = "overlap-unmeasurable"; }
    else if (r.overlapVacuous) {
      // The ONLY way this can happen now is a template group of exactly one page:
      // there is genuinely no sibling to differ from. That is a real KEEP, not the
      // old false pass — which came from an empty SURVIVOR set inside a full group
      // and is now impossible, because the denominator is the published group.
      // It is still flagged, loudly, so a one-page group is never mistaken for a
      // page that was measured against siblings and won.
      r.verdict = "KEEP";
    } else r.verdict = "KEEP";
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
    // 🔴 The two numbers must be reported together. `reachedOverlap` is how many
    // pages were SCORED; `overlapPopulation` is what they were scored AGAINST —
    // and it is the published group, not the survivors. A report that showed only
    // the first is how the survivor-population false pass stayed invisible.
    overlapPopulation: pages.length,
    overlapComparisons: survivors.length * Math.max(0, pages.length - 1),
    overlapStrategy: strategy,
    signals: { MIN_UNIQUE_WORDS, MIN_FACTS, MAX_SIBLING_OVERLAP }, // RR-192 · T-1: review signals, reported; none decides
    vacuous: false,
  };
}
