/**
 * 🔴 ROW 60 — THE OWNER'S SEVERITY SCALE. Ruled 14 September 2026; the words are his, verbatim from
 * ROW60_CONSEQUENCE_LAW.md Part 1, and test/consequence-law.test.mjs holds every definition to that file.
 *
 * Five levels, strongest first. The ORDER of this array IS the law's order: nothing in the engine re-sorts it.
 *
 * 🔴 UNCLASSIFIED IS NOT A LEVEL (A4). It is a classification state — UNKNOWN — and so are INFORMATIONAL and
 * OBSERVATION, which are finding or reporting states. None of them may ever be admitted here; the census refuses
 * a scale that holds one.
 */

export const SCALE_RULING = Object.freeze({ ruledBy: "owner", ruledOn: "2026-09-14", law: "ROW60_CONSEQUENCE_LAW.md" });

export const SEVERITY_SCALE = Object.freeze([
  Object.freeze({
    level: "CRITICAL",
    definition:
      "consequence irreversible, or practical recovery not dependable; credible risk of catastrophic or systemic loss to security, data, production or search visibility.",
  }),
  Object.freeze({
    level: "HIGH",
    definition: "material serious harm possible, but recovery is possible — costly, complex, slow, or demanding broad intervention.",
  }),
  Object.freeze({ level: "MODERATE", definition: "meaningful harm, bounded and reversible, recoverable by normal corrective work." }),
  Object.freeze({
    level: "LOW",
    definition: "limited or minor consequence; easily reversible; does not materially threaten core production, data, security or indexation integrity.",
  }),
  Object.freeze({ level: "NONE", definition: "verified no material adverse consequence." }),
]);
