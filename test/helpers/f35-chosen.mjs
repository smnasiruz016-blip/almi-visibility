/**
 * 🔴 RR-179 (c) · CONSTRUCTION ACTS ONLY ON F35'S DECISION. A test that wants construction to JUDGE a candidate hands in F35's decision
 * for it — built here by F35's OWN rule (src/page/action-decision.mjs decideGroupedNeed) over a hand-written need that meets every limb of
 * the one CREATE rule (a recorded question, coverage NONE, a supported central answer, right-to-exist ESTABLISHED, no comparison). Never a
 * hand-typed CHOSEN object: if F35's rule stops choosing CREATE for such a need, every test using this goes red with it.
 */
import { decideGroupedNeed, duplicationFor, isChosenCreate } from "../../src/page/action-decision.mjs";

export function chosenFor(slugs) {
  return slugs.map((slug) => {
    const decision = decideGroupedNeed({
      need: { needId: `need:${slug}`, pageCandidate: JSON.stringify([["fixture", slug]]), questions: 1, tier: "OBSERVED", centralSupported: true },
      coverage: { coverage: "NONE", relevantQuestionMissing: false, pages: [], measurement_key: `planning_coverage:${slug}`, reason: "fixture" },
      rightToExist: { outcome: "ESTABLISHED", reason: "RIGHT_TO_EXIST_ESTABLISHED", parts: { specific: { state: "PASS" } } },
      duplication: duplicationFor({ needId: `need:${slug}`, comparisons: [] }),
    });
    if (!isChosenCreate(decision)) throw new Error(`F35's rule did not choose CREATE for the fixture need of ${slug}`);
    return Object.freeze({ slug, decision, spec: null });
  });
}
