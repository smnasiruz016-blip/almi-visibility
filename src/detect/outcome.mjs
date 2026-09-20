/**
 * THE THREE OUTCOMES A DETECTOR MAY RETURN, AND NOTHING ELSE.
 *
 * `src/audit/check.mjs` already carries this doctrine — *"the absence of a measurement is not a
 * measurement of absence"* — but its checks answer `Finding | null`, where `null` means clean. That
 * shape cannot say WHAT it checked when it found nothing, so a detector that never ran and a
 * detector that looked carefully and found nothing produce identical output.
 *
 * 🔴 THAT AMBIGUITY IS THE WHOLE RISK HERE. A scoring model in which "not flagged" earns a pass
 * must be able to tell *examined and clean* from *never examined*. So CLEAN carries the evidence it
 * checked, exactly as FINDING carries the evidence it found, and UNKNOWN carries a concrete reason.
 *
 *   FINDING   something is wrong, and here is the evidence
 *   CLEAN     I examined this, and here is what I examined
 *   UNKNOWN   I could not tell, and here is precisely why
 *
 * There is no fourth answer. `null`, `undefined`, a thrown error swallowed into a pass, an empty
 * array read as "nothing wrong" — none of those may reach a scorer.
 */

export const OUTCOMES = Object.freeze(["FINDING", "CLEAN", "UNKNOWN"]);

/**
 * Why a detector could not answer. Frozen — a new reason is a deliberate addition, never free text,
 * so that "I could not check" can itself be audited for honesty.
 */
export const UNKNOWN_REASONS = Object.freeze({
  INPUT_ABSENT: "a required input was not supplied",
  INPUT_UNREADABLE: "the input was supplied but could not be read or parsed",
  EVIDENCE_INCOMPLETE: "the evidence exists but does not cover what this comparison needs",
  RENDER_NOT_COMPLETE: "the rendered DOM is partial or failed, so absence from it proves nothing",
  REGISTRY_UNREADABLE: "the source registry could not be read, so absence of evidence is unmeasured",
});

const nonEmptyString = (v) => typeof v === "string" && v.trim() !== "";

/**
 * 🔴 EVERY OUTCOME NAMES ITS SUBJECT AND ITS DETECTOR. Without `subject` a result cannot be scored
 * against anything; without `detector` two detectors disagreeing about one subject are
 * indistinguishable. Both are required — neither carries a default.
 */
function base(detector, subject) {
  if (!nonEmptyString(detector)) throw new TypeError("detector is required — an unattributed outcome cannot be audited");
  if (!nonEmptyString(subject)) throw new TypeError("subject is required — an outcome about nothing cannot be scored");
  return { detector, subject };
}

/**
 * A defect, with the evidence that establishes it.
 *
 * 🔴 `evidence` MAY NOT BE EMPTY. A finding nobody can check is an accusation, and this project has
 * already paid for one. The `class` is the detector's own generic class name — never a label taken
 * from whatever is being examined.
 */
export function finding({ detector, subject, defectClass, evidence, summary }) {
  if (!nonEmptyString(defectClass)) throw new TypeError("defectClass is required");
  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw new TypeError(`${detector}/${subject}: a FINDING must cite the evidence it rests on — an unevidenced finding is an accusation`);
  }
  if (!nonEmptyString(summary)) throw new TypeError("summary is required");
  return Object.freeze({ ...base(detector, subject), outcome: "FINDING", defectClass, evidence: Object.freeze([...evidence]), summary });
}

/**
 * Examined, and nothing wrong.
 *
 * 🔴 `checked` MAY NOT BE EMPTY, and that is the point of this whole module. A CLEAN that cannot say
 * what it examined is worth exactly as much as no run at all, and under a scoring model where
 * "unflagged" earns a pass it is worth LESS than nothing — it converts blindness into a tick.
 */
export function clean({ detector, subject, checked, summary }) {
  if (!Array.isArray(checked) || checked.length === 0) {
    throw new TypeError(`${detector}/${subject}: a CLEAN must state what it checked — a silent pass is indistinguishable from a detector that never ran`);
  }
  if (!nonEmptyString(summary)) throw new TypeError("summary is required");
  return Object.freeze({ ...base(detector, subject), outcome: "CLEAN", checked: Object.freeze([...checked]), summary });
}

/** Could not tell, and says exactly why — from the frozen vocabulary, never free text. */
export function unknown({ detector, subject, reasonCode, detail }) {
  if (!(reasonCode in UNKNOWN_REASONS)) {
    throw new TypeError(`unknown reasonCode ${JSON.stringify(reasonCode)} — add it to UNKNOWN_REASONS deliberately`);
  }
  if (!nonEmptyString(detail)) throw new TypeError("an UNKNOWN must say what specifically was missing — the reason code alone is a category, not a reason");
  return Object.freeze({ ...base(detector, subject), outcome: "UNKNOWN", reasonCode, detail });
}

/**
 * 🔴 THE GATE EVERY DETECTOR'S OUTPUT PASSES THROUGH.
 *
 * A detector that returns `null`, `undefined`, a bare object or an unfrozen shape is a detector
 * whose silence would be scored. This refuses it at the boundary rather than letting the scorer
 * interpret it — because the scorer's most dangerous reading is the charitable one.
 */
export function assertOutcome(value, { detector = "(unnamed)", subject = "(unnamed)" } = {}) {
  if (value === null || value === undefined) {
    throw new TypeError(`${detector}/${subject}: returned ${String(value)} — a detector must answer FINDING, CLEAN or UNKNOWN, never nothing`);
  }
  if (typeof value !== "object" || !OUTCOMES.includes(value.outcome)) {
    throw new TypeError(`${detector}/${subject}: returned ${JSON.stringify(value)?.slice(0, 80)} — not one of ${OUTCOMES.join(", ")}`);
  }
  return value;
}

/** Every outcome in a list, gated. Used by the runner so one bad detector cannot slip through a batch. */
export function assertOutcomes(list, { detector = "(unnamed)" } = {}) {
  if (!Array.isArray(list)) throw new TypeError(`${detector}: expected an array of outcomes, got ${typeof list}`);
  for (const o of list) assertOutcome(o, { detector, subject: o?.subject });
  return list;
}
