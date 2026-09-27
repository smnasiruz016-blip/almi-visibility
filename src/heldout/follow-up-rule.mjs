/**
 * 🔴 F10 · C7 · THE FROZEN FOLLOW-UP VERDICT (F10 Amendment 1, _handoffs 2ee6c2a; the nine values in config/follow-up-questions.mjs,
 * approved WITHOUT ALTERATION, ed85493 §0).
 *
 * Computed from the RELEASED AGGREGATES ONLY — F07 Amendment 3's paired release (_handoffs 264c680): the one-class table, the
 * declared count, the denominator, the exclusion counts, abstentions, discordant pairs and discordant pairs correct both ways.
 * Nothing item-level ever reaches it.
 *
 *   N7 = declared pairs · D7 = N7 − EXCLUDED_PERSONAL − CANNOT_TELL; D7 < minValidShare · N7 → INVALID, no rate is reported.
 *   pos = tp + fn, neg = fp + tn (an ABSTAIN is not-YES); pos < minPositives or neg < minNegatives → UNKNOWN.
 *   discordant pairs < minDiscordant → UNKNOWN.
 *   Otherwise PASS only when ALL FOUR hold, and FAIL otherwise, naming each that fails:
 *     Cohen's kappa ≥ kappaBar · precision = tp / (tp + fp) ≥ minPrecision ·
 *     coverage = (D7 − abstentions) / D7 ≥ minCoverage · need-sensitivity = bothCorrect / discordant ≥ minNeedSensitivity.
 *
 * The reasons for this shape are written beside the values (config/follow-up-questions.mjs). C6's rule is never applied here.
 */
import { cohensKappa } from "./classification-rule.mjs";

export const FOLLOW_UP_SCORER_ID = "follow-up-scorer-v1";
/** The files whose bytes ARE the C7 scorer: the governed route, the aggregate scorer, this rule, the kappa it reuses, its parameters. */
export const FOLLOW_UP_SCORER_FILES = Object.freeze(["src/governance/governed-scoring.mjs", "src/heldout/lifecycle.mjs", "src/heldout/follow-up-rule.mjs", "src/heldout/classification-rule.mjs", "config/follow-up-questions.mjs"]);
const BAR_KEYS = ["candidatesPerNeed", "minValidShare", "minPositives", "minNegatives", "minCoverage", "kappaBar", "minPrecision", "minDiscordant", "minNeedSensitivity"];

/**
 * The verdict. `release` = { tables: { CLS: { tp, fp, fn, tn } }, declared, denominator, excluded: { CODE: n }, abstentions,
 * discordantPairs, discordantBothCorrect }; `bar` = C7_BAR; `protocol` = C7_PROTOCOL. Returns a count-only verdict object.
 */
export function followUpVerdict(release, { bar, protocol }) {
  for (const k of BAR_KEYS) if (typeof bar?.[k] !== "number") throw new TypeError(`the C7 bar's ${k} is not declared — a verdict never defaults its bar`);
  const cls = protocol?.paired?.cls;
  if (typeof cls !== "string") throw new TypeError("the C7 protocol names no paired class — C7 is scored only through the paired release");
  const t = release?.tables?.[cls];
  const N = Number(release?.declared);
  const excluded = (protocol.exclusions ?? []).reduce((s, x) => s + Number(release?.excluded?.[x] ?? 0), 0);
  const D = N - excluded;
  const counts = [t?.tp, t?.fp, t?.fn, t?.tn, release?.abstentions, release?.discordantPairs, release?.discordantBothCorrect].map(Number);
  if (!t || !Number.isInteger(N) || counts.some((x) => !Number.isInteger(x) || x < 0) || D !== Number(release.denominator) || t.tp + t.fp + t.fn + t.tn !== D || Number(release.abstentions) > D || Number(release.discordantBothCorrect) > Number(release.discordantPairs)) {
    return { result: "INVALID", reason: "RELEASE_INCONSISTENT" };
  }
  if (D < bar.minValidShare * N) return { result: "INVALID", reason: "DENOMINATOR_BELOW_MINIMUM", N, D };
  const pos = t.tp + t.fn, neg = t.fp + t.tn;
  if (pos < bar.minPositives || neg < bar.minNegatives) return { result: "UNKNOWN", reason: "CLASS_POPULATION_BELOW_MINIMUM", N, D, pos, neg };
  const discordant = Number(release.discordantPairs);
  if (discordant < bar.minDiscordant) return { result: "UNKNOWN", reason: "TOO_FEW_DISCORDANT_PAIRS", N, D, pos, neg, discordant };
  const kappa = cohensKappa(t);
  const precision = t.tp + t.fp ? t.tp / (t.tp + t.fp) : 0;
  const coverage = (D - Number(release.abstentions)) / D;
  const needSensitivity = Number(release.discordantBothCorrect) / discordant;
  const failing = [];
  if (kappa === null || kappa < bar.kappaBar) failing.push("KAPPA");
  if (precision < bar.minPrecision) failing.push("PRECISION");
  if (coverage < bar.minCoverage) failing.push("COVERAGE");
  if (needSensitivity < bar.minNeedSensitivity) failing.push("NEED_SENSITIVITY");
  return { result: failing.length ? "FAIL" : "PASS", failing, N, D, pos, neg, discordant, kappa, precision, coverage, needSensitivity };
}
