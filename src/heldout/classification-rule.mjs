/**
 * 🔴 F10 · C6 · THE CLASSIFICATION SCORING RULE — a pure verdict over the AGGREGATE release of one scoring run.
 *
 * It reads only counts: per class TP, FP, FN and TN, the declared item count and the labeller exclusion counts — the release
 * F07's scorer emits (src/heldout/lifecycle.mjs scoreClassification). It never sees an item, a label or an output.
 *
 *   D = declared − Σ exclusions                        D < minDenominator      → INVALID (DENOMINATOR_BELOW_MINIMUM), no rate
 *   the tables must each sum to D                      otherwise               → INVALID (TABLES_INCONSISTENT)
 *   labelled positives TP+FN, negatives FP+TN          either below its minimum → that class UNKNOWN (NOT_ASSESSABLE)
 *   kappa = (po − pe) / (1 − pe)                       pe = 1                   → that class UNKNOWN (KAPPA_UNDEFINED)
 *   fewer than minAssessableClasses assessable                                  → UNKNOWN
 *   every assessable kappa ≥ kappaBar                                           → PASS, otherwise FAIL
 *
 * The rule's parameters are the frozen SCORING_RULE (config/human-questions.mjs); they are handed in, never defaulted here.
 * LIMIT (b) is carried in the result: a kappa within `nearBarBand` of the bar is flagged NEAR_BAR_NOT_DECISIVE. Generic:
 * the classes are the protocol's; this file names no subject.
 */
export const RESULTS = Object.freeze(["PASS", "FAIL", "UNKNOWN", "INVALID"]);

const nonNegInt = (n) => Number.isInteger(n) && n >= 0;

/** Cohen's kappa for one 2×2 table, or null when chance agreement is total (pe = 1). */
export function cohensKappa({ tp, fp, fn, tn }) {
  const n = tp + fp + fn + tn;
  if (n === 0) return null;
  const po = (tp + tn) / n;
  const pe = ((tp + fp) * (tp + fn) + (fn + tn) * (fp + tn)) / (n * n);
  if (pe === 1) return null;
  return (po - pe) / (1 - pe);
}

/** Raw agreement over every class decision — reported for LIMIT (a) ONLY; it is never the bar. */
export const rawAgreement = (tables) => {
  const t = Object.values(tables);
  const n = t.reduce((a, x) => a + x.tp + x.fp + x.fn + x.tn, 0);
  return n ? t.reduce((a, x) => a + x.tp + x.tn, 0) / n : null;
};

/**
 * The verdict. `release` = { tables: { CLASS: { tp, fp, fn, tn } }, declared, excluded: { CODE: n } }; `rule` = SCORING_RULE;
 * `protocol` = { classes, exclusions }. Returns a count-only verdict object.
 */
export function classificationVerdict(release, { rule, protocol }) {
  for (const k of ["declaredItems", "minDenominator", "minPositives", "minNegatives", "minAssessableClasses", "kappaBar", "nearBarBand"]) {
    if (typeof rule?.[k] !== "number") throw new TypeError(`the scoring rule's ${k} is not declared — a verdict never defaults its rule`);
  }
  const invalid = (reason, extra = {}) => Object.freeze({ result: "INVALID", reason, rate: null, ...extra });
  if (!release || typeof release !== "object" || !release.tables || !release.excluded) return invalid("RELEASE_UNREADABLE");
  const declared = release.declared;
  if (!nonNegInt(declared)) return invalid("RELEASE_UNREADABLE");
  if (declared !== rule.declaredItems) return invalid("DECLARED_ITEMS_NOT_THE_FROZEN_N", { declared });
  const exclusions = protocol.exclusions.map((x) => release.excluded[x]);
  if (exclusions.some((n) => !nonNegInt(n))) return invalid("RELEASE_UNREADABLE");
  const D = declared - exclusions.reduce((a, b) => a + b, 0);
  if (D < rule.minDenominator) return invalid("DENOMINATOR_BELOW_MINIMUM", { denominator: D });
  const classes = {};
  for (const c of protocol.classes) {
    const t = release.tables[c];
    if (!t || !["tp", "fp", "fn", "tn"].every((k) => nonNegInt(t[k]))) return invalid("RELEASE_UNREADABLE", { denominator: D });
    if (t.tp + t.fp + t.fn + t.tn !== D) return invalid("TABLES_INCONSISTENT", { denominator: D });
    const positives = t.tp + t.fn, negatives = t.fp + t.tn;
    if (positives < rule.minPositives || negatives < rule.minNegatives) { classes[c] = Object.freeze({ state: "UNKNOWN", reason: "NOT_ASSESSABLE", positives, negatives, kappa: null }); continue; }
    const kappa = cohensKappa(t);
    if (kappa === null) { classes[c] = Object.freeze({ state: "UNKNOWN", reason: "KAPPA_UNDEFINED", positives, negatives, kappa: null }); continue; }
    classes[c] = Object.freeze({
      state: kappa >= rule.kappaBar ? "MEETS_BAR" : "BELOW_BAR", reason: null, positives, negatives, kappa,
      nearBar: Math.abs(kappa - rule.kappaBar) <= rule.nearBarBand ? "NEAR_BAR_NOT_DECISIVE" : null,
    });
  }
  const assessable = Object.values(classes).filter((x) => x.state === "MEETS_BAR" || x.state === "BELOW_BAR");
  const result = assessable.length < rule.minAssessableClasses ? "UNKNOWN" : assessable.every((x) => x.state === "MEETS_BAR") ? "PASS" : "FAIL";
  return Object.freeze({
    result, reason: result === "UNKNOWN" ? "FEWER_THAN_MIN_ASSESSABLE_CLASSES" : null, denominator: D, assessable: assessable.length,
    classes: Object.freeze(classes),
    limits: Object.freeze({
      a: "raw agreement is not the bar: it passes a mechanism that finds nothing when classes are rare",
      b: "kappa is noisy at D 80–100; a result near the bar is not decisive; it measures the mechanism against the owner's reference labels, not two humans",
    }),
  });
}
