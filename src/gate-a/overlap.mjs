/**
 * SIBLING OVERLAP — Jaccard over 5-word shingles of the RESIDUAL text.
 *
 * ── D2 · BOTH HALVES OF THAT SENTENCE ARE LOAD-BEARING ──────────────────────
 *
 * SHINGLES, not bare words: bare-word overlap ignores order, so two pages saying
 * the same sentences in a different arrangement score as different.
 *
 * 🔴 RESIDUAL, NOT RAW — and this is measured, not argued. On five live AlmiOET
 * siblings the RAW rendered text overlapped 76.3%–94.5%. That number describes
 * the TEMPLATE, not the page. On raw text every sibling fails and the metric
 * says nothing anyone did not already know. Overlap is a question about what the
 * pages INDIVIDUALLY say, so it is asked of what is left after the shell.
 *
 * ── D3 · EXACT BELOW 5,000, AND THE THRESHOLD CARRIES ITS WALL-CLOCK ────────
 *
 * MEASURED 10 September 2026 — exact all-pairs Jaccard over ~120 residual words
 * per page, single-threaded, plain JavaScript:
 *
 *     group     pairs               time      throughput
 *       610       185,745           0.97 s    0.19 M pairs/s
 *     2,292     2,625,486          15.3  s    0.17 M pairs/s
 *     5,000    12,497,500          71    s    0.18 M pairs/s
 *   237,413    28,180,000,000     ~43.5  h    —
 *
 * The last row is WHY a threshold exists. The 71 seconds is why it sits at 5,000:
 * just over a minute at its own boundary is not slow enough to tempt anyone into
 * moving it — and nobody has to guess any more, because the number is written
 * down. It grows with the SQUARE: ~4.7 min at 10,000, ~19 min at 20,000.
 */

/** D2 · shingle length. Five is the usual choice for near-duplicate detection:
 *  long enough that ordinary shared phrasing does not collide, short enough that
 *  a genuinely reworded sentence still overlaps. */
export const SHINGLE_N = 5;

/** D3 · above this group size, exact all-pairs is replaced by MinHash + LSH
 *  candidate generation followed by EXACT verification of every candidate. See
 *  the table above before moving it. */
export const EXACT_ALL_PAIRS_MAX_GROUP = 5000;

/** D2 · a Jaccard computed over very few residual words is noise wearing a
 *  number's clothes. It is still reported — but never without this count beside
 *  it, so the reader sees it at a glance instead of deducing it. */
export const NOISY_RESIDUAL_WORDS = 40;

export function shingles(tokens, n = SHINGLE_N) {
  const out = new Set();
  for (let i = 0; i + n <= tokens.length; i++) out.add(tokens.slice(i, i + n).join(" "));
  return out;
}

export function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const s of small) if (large.has(s)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Exact all-pairs. Every page against EVERY sibling — no sample.
 *
 * @param {{ id: string, residual: readonly string[] }[]} pages
 * @returns {{ id: string, maxOverlap: number, against: string | null,
 *             residualWords: number, noisy: boolean }[]}
 */
export function exactAllPairs(pages) {
  const sig = pages.map((p) => shingles(p.residual));
  const best = pages.map(() => ({ score: 0, against: null }));

  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      const s = jaccard(sig[i], sig[j]);
      if (s > best[i].score) best[i] = { score: s, against: pages[j].id };
      if (s > best[j].score) best[j] = { score: s, against: pages[i].id };
    }
  }

  return pages.map((p, i) => ({
    id: p.id,
    maxOverlap: best[i].score,
    against: best[i].against,
    residualWords: p.residual.length,
    noisy: p.residual.length < NOISY_RESIDUAL_WORDS,
  }));
}

/**
 * 🔴 EVERY CANDIDATE AGAINST THE WHOLE PUBLISHED POPULATION.
 *
 * ── THE DEFECT THIS REPLACES, AND THE RULE THAT COMES OUT OF IT ─────────────
 *
 * `exactAllPairs` compares a set against ITSELF. Gate A used to hand it the
 * SURVIVORS, which meant the population a page was judged against was the gate's
 * own output. On the `nursing/from-india` acceptance test that produced:
 *
 *     overlap vs SURVIVORS ONLY   0.0000    survivor population: 0
 *
 * A PERFECT SCORE EARNED BY BEING THE LAST ONE STANDING — while all 190 of its
 * near-identical siblings were still published and still indexed.
 *
 *     🔴 A GATE MAY NOT BUILD ITS DENOMINATOR OUT OF ITS OWN OUTPUT.
 *     The more it rejects, the more unique the remainder looks. A gate that gets
 *     EASIER the more it rejects is not a gate.
 *
 *     "EVERY SIBLING" MEANS EVERY SIBLING A READER CAN STILL REACH — not every
 *     sibling that survived an earlier stage of the same run.
 *
 * This is the same illness as a check fed its own value, which this project has
 * now rejected three times: twice in proposed bucket boundaries, and here.
 *
 * ⚠️ D2-A IS NOT UNDONE BY THIS. D2-A says do not do quadratic WORK on pages
 * already rejected, and that still holds: only CANDIDATES get a score, so the
 * cost is candidates x population, not population squared. What changes is the
 * DENOMINATOR, not the workload.
 *
 * @param {{ id: string, residual: readonly string[] }[]} candidates pages being judged
 * @param {{ id: string, residual: readonly string[] }[]} population every PUBLISHED sibling
 */
export function maxAgainstPopulation(candidates, population) {
  const popSig = population.map((p) => shingles(p.residual));
  return candidates.map((c) => {
    const mine = shingles(c.residual);
    let best = { score: 0, against: null };
    let compared = 0;
    for (let i = 0; i < population.length; i++) {
      if (population[i].id === c.id) continue;
      compared++;
      const s = jaccard(mine, popSig[i]);
      if (s > best.score) best = { score: s, against: population[i].id };
    }
    return {
      id: c.id,
      maxOverlap: best.score,
      against: best.against,
      comparedWith: compared,
      residualWords: c.residual.length,
      noisy: c.residual.length < NOISY_RESIDUAL_WORDS,
      // 🔴 Zero comparisons is not a score of zero. It is an empty population,
      // and the caller must treat it as a finding rather than a pass.
      vacuous: compared === 0,
    };
  });
}

/**
 * The strategy this group size calls for. Returned rather than decided silently,
 * so the report can say which one ran and why.
 */
export function strategyFor(groupSize) {
  if (groupSize <= EXACT_ALL_PAIRS_MAX_GROUP) {
    const pairs = (groupSize * (groupSize - 1)) / 2;
    return { kind: "exact-all-pairs", pairs, complete: true, note: `${pairs.toLocaleString("en-US")} exact comparisons` };
  }
  const pairs = (groupSize * (groupSize - 1)) / 2;
  return {
    kind: "minhash-lsh",
    pairs,
    complete: false,
    // Honest about what it is: "against every sibling, with a stated and bounded
    // probability of missing a pair" — not "against every sibling".
    note:
      `${pairs.toLocaleString("en-US")} exact comparisons would take about ` +
      `${((pairs / 180_000) / 3600).toFixed(1)} hours at the measured 0.18M pairs/s, so candidates ` +
      "come from MinHash+LSH and every candidate is then verified EXACTLY. NOT YET IMPLEMENTED — " +
      "and its false-negative rate must be stated as a number against a written bound before it is.",
  };
}
