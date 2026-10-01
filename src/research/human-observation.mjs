/**
 * F16 · THE GOVERNED HUMAN-OBSERVATION PATH — one submission, validated into exactly one public-question record or refused
 * (RR-116; F16 acceptance _handoffs 944f769; reconciliation 9d37eab). For ANY client's subject: nothing here names a product.
 *
 * THE ENGINE DOES NOT SEARCH. A person doing an ordinary, human-directed public search submits what they saw. The engine records that a
 * PERSON saw it (never that the engine did), names the observer's ROLE (never personal data), and never opens the reference it stores.
 *
 *   RESEARCHER_OBSERVATION  a person saw it asked, with a REVIEWABLE reference → F16 kind OBSERVED
 *   CLIENT_CLAIM            the client's own statement of what people ask — unsupported, never evidence → F16 kind CLIENT_CLAIM
 *   INFERRED_SUGGESTION     ours, derived, never observed → F16 kind INFERRED
 * A submission missing a required field is REFUSED — never stored with a default, as partial, or as pending. A question typed in with no
 * reviewable reference is never an observation: submitted as one it is refused; it may only ever be an INFERRED suggestion.
 * Country and language may be stated NOT MEASURED, explicitly; blank is refused, never guessed. The wording is kept byte for byte.
 */
import { createHash } from "node:crypto";
import { RECORD_TYPE, NOT_MEASURED } from "./public-questions.mjs";

export const CATEGORIES = Object.freeze({ RESEARCHER_OBSERVATION: "OBSERVED", CLIENT_CLAIM: "CLIENT_CLAIM", INFERRED_SUGGESTION: "INFERRED" });
const COMMON = ["subject", "wording", "source", "surface", "country", "language", "method", "limits", "observerRole"];
export const REQUIRED = Object.freeze({
  RESEARCHER_OBSERVATION: Object.freeze([...COMMON, "reference", "observedAt"]),
  CLIENT_CLAIM: Object.freeze([...COMMON, "recordedAt"]),
  INFERRED_SUGGESTION: Object.freeze([...COMMON, "basis", "recordedAt"]),
});
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
/** Personal data an observer ROLE must never carry: an e-mail address, or a run of seven or more digits (a telephone number). */
const PERSONAL = /@|\d[\d\s().-]{5,}\d/;
const present = (v) => typeof v === "string" && v.trim() !== "";

/** A reference a second person could check: an http(s) link, or a non-link reference stated as one ({ kind: "OTHER", text }). */
export function reviewable(ref) {
  if (typeof ref === "string") { try { return /^https?:$/.test(new URL(ref).protocol); } catch { return false; } }
  return ref !== null && typeof ref === "object" && ref.kind === "OTHER" && present(ref.text);
}

/** @returns {{ accepted: true, record: object } | { accepted: false, refusals: string[] }} */
export function validateSubmission(s, { origin }) {
  const refusals = [];
  const category = Object.hasOwn(CATEGORIES, s?.category) ? s.category : null;
  if (!category) return { accepted: false, refusals: ["CATEGORY_UNKNOWN"] };
  for (const f of REQUIRED[category]) {
    const v = s[f];
    if (f === "reference" ? v === undefined || v === null || (typeof v === "string" && v.trim() === "") : !present(v)) refusals.push(`${f.toUpperCase()}_ABSENT`);
  }
  if (category === "RESEARCHER_OBSERVATION" && s.reference !== undefined && s.reference !== null && !reviewable(s.reference)) refusals.push("REFERENCE_NOT_REVIEWABLE");
  for (const t of ["observedAt", "recordedAt"]) if (present(s[t]) && !ISO_TIME.test(s[t])) refusals.push(`${t.toUpperCase()}_NOT_A_TIME`);
  if (present(s.observerRole) && PERSONAL.test(s.observerRole)) refusals.push("OBSERVER_ROLE_CARRIES_PERSONAL_DATA");
  if (!present(origin)) refusals.push("SUBJECT_HAS_NO_DECLARED_SITE_ORIGIN");
  if (refusals.length) return { accepted: false, refusals };

  const at = category === "RESEARCHER_OBSERVATION" ? s.observedAt : s.recordedAt;
  const kind = CATEGORIES[category];
  const id = createHash("sha256").update(JSON.stringify([s.subject, kind, s.wording, s.reference ?? null, at])).digest("hex").slice(0, 32);
  return {
    accepted: true,
    record: Object.freeze({
      record_type: RECORD_TYPE,
      question_id: id,
      measurement_key: `${RECORD_TYPE}:${id}`,
      recorded_at: at,
      value: Object.freeze({
        kind,
        subject: s.subject,
        origin,
        original: s.wording,
        provenance: Object.freeze({ seenBy: category === "RESEARCHER_OBSERVATION" ? "A PERSON — not the engine" : null, observerRole: s.observerRole, engineObserved: false }),
        source: s.source,
        surface: s.surface,
        reference: s.reference ?? null,
        country: s.country,
        language: s.language,
        timeWindow: Object.freeze({ from: at, to: at }),
        method: s.method,
        limits: s.limits,
        basis: category === "INFERRED_SUGGESTION" ? s.basis : null,
      }),
    }),
  };
}

/** Country and language stated as NOT MEASURED are carried as the words, never blank, never 0. */
export const notMeasuredFields = (record) => ["country", "language"].filter((f) => record.value[f] === NOT_MEASURED);
