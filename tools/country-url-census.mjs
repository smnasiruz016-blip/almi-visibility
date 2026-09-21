/**
 * 🔴 ROW 4 — THE COUNTRY→URL CENSUS. COUNTRY IS A RESEARCH LENS, NEVER AN AUTOMATIC URL AXIS.
 *
 * Row 3's keyword→URL census, run on row 4's module: every consumer of `localized-thinking.mjs` under src/ and bin/ —
 * by import, dynamic import, or a path string in a file that can load or run it, followed transitively — and a breach
 * for any URL-shaped construction inside one. It lives in tools/ for row 3's reason: the law sits outside the
 * territory it polices.
 *
 * It also answers the row's dependency question as code, not as a sentence: `reachesRowFive` walks the module's
 * import closure and names every file in it that references row 5's clusterer, lexicon or reference — or row 6's
 * modules, which import row 5's clusterer themselves. Row 4 is built on row 3 (VERIFIED-PASS), and a row standing on
 * row 5 (FAILED) without saying so is how a ledger starts lying.
 */
import { urlCensus, importClosure, forbiddenReferences } from "./keyword-url-census.mjs";

export const TARGET_BASENAME = "localized-thinking.mjs";

/** Row 4's reasoning layer (21 Sep 2026). Censused as its own target: it is imported by the runner, not by the module above. */
export const REASONING_BASENAME = "local-reasoning.mjs";

/** Both of row 4's modules, and every consumer of either. A second target is a WIDER census, never a narrower one. */
export function countryUrlCensus(sources) {
  const parts = [urlCensus(sources, TARGET_BASENAME), urlCensus(sources, REASONING_BASENAME)];
  const consumers = [...new Set(parts.flatMap((p) => p.consumers))].sort();
  const seen = new Set();
  const breaches = parts.flatMap((p) => p.breaches).filter((b) => { const k = `${b.file}:${b.line}:${b.shape}`; if (seen.has(k)) return false; seen.add(k); return true; });
  return { consumers, breaches };
}

/**
 * 🔴 LIMB (a) ACROSS ALL THREE VERBS, ON ROW 4's OWN PATH (owner ruling addendum 1, 21 Sep 2026): row 4 must not
 * CONSTRUCT, ACCEPT or RECOMMEND a URL because of country. Construction is the census above. Acceptance and
 * recommendation live in named modules — the page construction path, Gate A, the recommendation fields, the page
 * builder and the axis verdict — and row 4's import closure may reach none of them.
 */
export const DECISION_NAMES = Object.freeze(["construct.mjs", "gate-a", "recommendation-fields", "build-page", "axis-discovery", "row6.mjs"]);

export function reachesDecisionPaths(sources, starts) {
  const hits = [];
  const closures = [];
  for (const start of starts) {
    const closure = importClosure(sources, start);
    closures.push(...closure);
    for (const file of closure) {
      /* The laws in tools/ NAME the decision modules in order to forbid them; a law's list is not a dependency. They
       * are still in the closure and must still be READ — an unread law is reported by `unread` like any other file. */
      if (file.startsWith("tools/")) continue;
      const names = [...forbiddenReferences(sources.get(file) ?? "", DECISION_NAMES), ...DECISION_NAMES.filter((n) => file.includes(n))];
      if (names.length) hits.push({ file, names: [...new Set(names)] });
    }
  }
  return { closure: [...new Set(closures)].sort(), hits, unread: [...new Set(closures)].filter((f) => !sources.has(f)) };
}

export const ROW_FIVE_NAMES = Object.freeze(["intent-clusters", "intent-lexicon", "intent-reference", "row5.mjs", "row6.mjs", "axis-discovery"]);

/** Every file in `start`'s import closure that names a row-5 module in code, and every closure file that could not be read. */
export function reachesRowFive(sources, start) {
  const closure = importClosure(sources, start);
  const hits = closure.flatMap((file) => {
    const names = [...forbiddenReferences(sources.get(file) ?? "", ROW_FIVE_NAMES), ...ROW_FIVE_NAMES.filter((n) => file.includes(n))];
    return names.length ? [{ file, names: [...new Set(names)] }] : [];
  });
  return { closure, hits, unread: closure.filter((f) => !sources.has(f)) };
}

/**
 * 🔴 WHAT THIS CENSUS CANNOT SEE — printed with every run, and written on the row.
 */
export const CENSUS_LIMITS = Object.freeze([
  "it reads this repository's code under src/ and bin/: it cannot see a page written by hand, countries or wording copied out of the records, a consumer outside src/ and bin/, a computed import, or a path held only as text and run by another module",
  "🔴 it cannot see the connected products' OWN pages — and that is where a country-like axis ALREADY multiplies pages without evidence: the estate measurement below counts the pages in the page rows whose address hard-codes an origin. This census proves this engine builds no such path; it proves nothing about the pages the estate already has",
]);
