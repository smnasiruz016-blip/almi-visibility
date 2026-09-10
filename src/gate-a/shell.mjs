/**
 * THE SHARED SHELL — what a template says on every one of its pages, and what
 * must be subtracted before a page's own words can be counted.
 *
 * Measured on five live AlmiOET siblings, 10 September 2026: 577–678 rendered
 * words per page, of which **511 were shell**. Get this wrong in either
 * direction and Gate A either passes everything or fails everything.
 *
 * ── D1, RULED 10 SEPTEMBER 2026: DEFINITION B — AND THE REASON IS THE
 *    DIRECTION EACH DEFINITION FAILS IN ─────────────────────────────────────
 *
 *   A — EXACT INTERSECTION: a token is shell at the MINIMUM count it reaches
 *       across EVERY page. Exactly what "shared by all" means — and brittle: one
 *       odd page missing a word drops it from the shell for everyone.
 *
 *   B — DOCUMENT FREQUENCY >= 98%: a token is shell at the count it reaches in
 *       at least 98% of the pages.
 *
 * 🔴 A's ERROR SHRINKS THE SHELL. A smaller shell means LARGER uniqueWords, which
 * means PAGES PASS THAT SHOULD HAVE FAILED. B's error points the other way, at
 * REJECT — and this design already says REJECT is a valid and expected outcome.
 *
 *     A GATE WHOSE FAILURE DIRECTION IS A FALSE PASS IS NOT A GATE.
 *
 * That, not "B is more robust", is why B is the rule. Both are computed and both
 * are reported: if they disagree by more than a few tokens on a group, the
 * disagreement is itself a finding about that template.
 *
 * ⚠️ AND A THING NOBODY SHOULD HAVE TO DISCOVER FOR THEMSELVES. On a group of
 * fewer than ~50 pages, a 98% threshold ROUNDS TO "PRESENT IN EVERY PAGE":
 * ceil(0.98 x 12) = 12. So on small groups **B simply IS A, and the knob does
 * nothing.** `/[profession]` has TWELVE pages. Choosing B there changes no
 * outcome; it starts to matter at `/[profession]/from-[origin]` (2,292) and above.
 */
import { counts } from "./tokens.mjs";

/**
 * 🔴 THE SHARE OF A TEMPLATE'S PAGES A TOKEN MUST APPEAR IN TO COUNT AS SHELL.
 *
 * 0.98 — high enough that a handful of odd pages cannot dissolve the shell, low
 * enough that one broken page cannot either. It is a named constant with its
 * reason because an inline 0.98 is a number nobody can argue with later.
 *
 * ⚠️ PROVISIONAL. It has NOT been calibrated against a real corpus yet — Gate A's
 * first run on AlmiOET is that calibration. If it turns out to admit or exclude
 * the wrong tokens, the fix is a MEASUREMENT of where the shell boundary really
 * sits, not a nudge to make a result look better.
 */
export const SHELL_DOC_FREQUENCY = 0.98;

/** Below this many pages, SHELL_DOC_FREQUENCY rounds to "every page" and B == A. */
export const SMALL_GROUP_CEILING = Math.ceil(1 / (1 - SHELL_DOC_FREQUENCY)); // 50

/**
 * Compute both shells for one template group.
 *
 * @param {readonly (readonly string[])[]} pagesTokens one token list per page
 * @returns {{ shellA: Map<string, number>, shellB: Map<string, number>,
 *             sizeA: number, sizeB: number, pages: number,
 *             minPagesForShell: number, bEqualsA: boolean }}
 */
export function computeShells(pagesTokens) {
  const pages = pagesTokens.length;
  if (pages === 0) {
    // A gate over an empty population passes vacuously. Say so instead of
    // returning an empty shell that would make every page look unique.
    return {
      shellA: new Map(), shellB: new Map(), sizeA: 0, sizeB: 0, pages: 0,
      minPagesForShell: 0, bEqualsA: true, empty: true,
    };
  }

  const perPage = pagesTokens.map((t) => counts(t));

  // For every token, the sorted list of per-page counts (absent pages count 0).
  const seen = new Set();
  for (const m of perPage) for (const k of m.keys()) seen.add(k);

  const minPagesForShell = Math.ceil(SHELL_DOC_FREQUENCY * pages);
  const shellA = new Map();
  const shellB = new Map();

  for (const token of seen) {
    const perPageCounts = perPage.map((m) => m.get(token) ?? 0);
    perPageCounts.sort((a, b) => a - b);

    // A: the minimum across every page. Zero on any page => not shell at all.
    const min = perPageCounts[0];
    if (min > 0) shellA.set(token, min);

    // B: the count reached by at least `minPagesForShell` pages. That is the
    // (pages - minPagesForShell)-th value from the bottom of the sorted list —
    // i.e. we may discard the (pages - minPagesForShell) worst pages.
    const discard = pages - minPagesForShell;
    const kth = perPageCounts[discard];
    if (kth > 0) shellB.set(token, kth);
  }

  const size = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  return {
    shellA, shellB,
    sizeA: size(shellA), sizeB: size(shellB),
    pages, minPagesForShell,
    // Stated rather than left to be discovered: on a small group the two are the
    // same thing and the choice of definition is not doing any work.
    bEqualsA: minPagesForShell >= pages,
    empty: false,
  };
}

/**
 * Words this page has that the shell does not account for.
 * Multiset subtraction: a token present 5 times here and 4 times in the shell
 * contributes 1.
 */
export function uniqueWords(pageTokens, shell) {
  const page = counts(pageTokens);
  let unique = 0;
  for (const [token, n] of page) {
    const inShell = shell.get(token) ?? 0;
    if (n > inShell) unique += n - inShell;
  }
  return unique;
}

/** The residual token list — what is left after the shell, in page order. */
export function residualTokens(pageTokens, shell) {
  const budget = new Map(shell);
  const out = [];
  for (const t of pageTokens) {
    const left = budget.get(t) ?? 0;
    if (left > 0) budget.set(t, left - 1);
    else out.push(t);
  }
  return out;
}
