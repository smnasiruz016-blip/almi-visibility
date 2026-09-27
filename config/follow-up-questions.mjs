/**
 * 🔴 F10 · C7 · LIKELY FOLLOW-UP QUESTIONS — THE FROZEN PARAMETERS, AS DATA (F10 Amendment 1, _handoffs 2ee6c2a, contract
 * 964d424c…; the nine values approved by the owner WITHOUT ALTERATION, _handoffs ed85493 §0).
 *
 * STATED PLAINLY (ed85493 §0): these are PRE-RUN ACCEPTANCE VALUES. They are NOT a claim or a prediction that the owner's future
 * labels will satisfy the minimum populations. If the real labels come back thin, the outcome is UNKNOWN — never a PASS, and
 * never a reason to revisit these numbers afterwards. A bar revisited after a result is a bar fitted to the result.
 *
 * C6 is NOT applied to C7, and C7 changes nothing in C6 (config/human-questions.mjs). Generic: names no subject, client, host,
 * tenant or query.
 */

/**
 * The C7 protocol, scored through F07 Amendment 3's PAIRED release (_handoffs 264c680): one class — the owner's LIKELY_NEXT —
 * with NOT_LIKELY_NEXT recorded as an empty class list, the owner's two exclusions, and `paired` naming the class the three
 * paired aggregates are counted on. Three tokens, inside the seven-token paired ceiling.
 */
export const C7_PROTOCOL = Object.freeze({
  id: "follow-up-pairs-v1",
  classes: Object.freeze(["LIKELY_NEXT"]),
  exclusions: Object.freeze(["EXCLUDED_PERSONAL", "CANNOT_TELL"]),
  paired: Object.freeze({ cls: "LIKELY_NEXT" }),
});

/** The owner's four judgement words, and how each is written in the key (one JSON row per pair). */
export const C7_JUDGEMENTS = Object.freeze({
  LIKELY_NEXT: Object.freeze({ classes: Object.freeze(["LIKELY_NEXT"]) }),
  NOT_LIKELY_NEXT: Object.freeze({ classes: Object.freeze([]) }),
  EXCLUDED_PERSONAL: Object.freeze({ exclusion: "EXCLUDED_PERSONAL" }),
  CANNOT_TELL: Object.freeze({ exclusion: "CANNOT_TELL" }),
});

/**
 * THE NINE APPROVED VALUES (ed85493 §0).
 *   K = 2 candidates per need · D7 ≥ 0.8 × N7 · ≥ 20 LIKELY_NEXT · ≥ 20 NOT_LIKELY_NEXT · coverage ≥ 0.70 · kappa ≥ 0.60 ·
 *   precision ≥ 0.60 · ≥ 10 discordant pairs · need-sensitivity ≥ 0.60
 *
 * WHY THE BAR HAS THIS SHAPE (148d48f §4.4 — written down so nobody "simplifies" it back):
 *   · raw agreement ≥ 0.80 was DISPROVED as a bar: it passes a mechanism that finds nothing at low prevalence;
 *   · kappa near its threshold on a small denominator is NOT decisive;
 *   · coverage stops a mechanism that abstains its way to a high kappa;
 *   · need-sensitivity stops a need-blind mechanism: it answers both sides of a discordant pair alike, so it can never get
 *     both right.
 */
export const C7_BAR = Object.freeze({
  candidatesPerNeed: 2,
  minValidShare: 0.8,
  minPositives: 20,
  minNegatives: 20,
  minCoverage: 0.7,
  kappaBar: 0.6,
  minPrecision: 0.6,
  minDiscordant: 10,
  minNeedSensitivity: 0.6,
});

/** C7's own release store — a distinct store from C6's, so the two runs can never be one record. */
export const C7_RELEASE_STORE = "evaluation-releases/follow-up-releases.jsonl";
