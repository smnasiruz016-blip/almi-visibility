/**
 * THE SHAPE OF EVERY CHECK.
 *
 *   check(page, observations, siteContext) -> Finding | null
 *
 * A Finding IS an Issue under the existing evidence model, so it inherits C1:
 * **an Issue with no evidence cannot be constructed.** A check that wants to
 * report something must cite the observations it read.
 *
 * ── 🔴 THREE RULES, WHICH ARE REALLY ONE RULE ───────────────────────────────
 *
 *   · a check that CANNOT RUN returns UNKNOWN with a reason code — never null,
 *     never PASS;
 *   · a check whose INPUT IS ABSENT returns UNKNOWN and NAMES what was missing;
 *   · a check needing RENDERED HTML returns UNKNOWN in v0.1, because
 *     `renderMode` is `RAW_HTML` on every record we hold.
 *
 * The one rule underneath: **the absence of a measurement is not a measurement
 * of absence.** `null` means "I ran, and there is nothing wrong". UNKNOWN means
 * "I could not tell you". Collapsing those two is how a page nobody could
 * assess comes to look clean.
 *
 * That third rule is why `renderMode` exists at all. A check that silently
 * treats an unrendered body as the whole truth produces a confident wrong
 * answer — and "declared render != served" is one of the six known RED classes,
 * so it is the exact mistake we would be graded on.
 */

import { makeIssue } from "../evidence/records.mjs";

/** Why a check could not answer. Frozen: a new reason is a deliberate addition. */
export const UNKNOWN_REASONS = Object.freeze({
  NO_OBSERVATION: "no observation exists for this page",
  NEEDS_RENDERED_HTML: "the check needs rendered HTML; every record is renderMode RAW_HTML in v0.1",
  MISSING_INPUT: "a required input was absent",
  TOOL_FAILED: "the tool failed — this says nothing about the subject (LAW-ABSENT-1)",
  NOT_APPLICABLE_YET: "the data this check reads does not exist in the store yet",
});

export const CHECK_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);

/**
 * Build a FAIL finding.
 *
 * 🔴 `evidence` is not defaulted. `makeIssue` throws on an empty list, and that
 * throw is the point: a check that found something must be able to say what it
 * read. See C1.
 */
export function fail({ issueClass, canonicalUrl, severity, evidence, sources = [], detector, detectorVersion, openedAt, summary }) {
  if (!CHECK_SEVERITIES.includes(severity)) {
    throw new TypeError(`severity must be one of ${CHECK_SEVERITIES.join("|")}`);
  }
  return {
    ...makeIssue({
      issue_class: issueClass,
      canonical_url: canonicalUrl,
      verdict: "FAIL",
      severity,
      evidence,
      sources,
      opened_at: openedAt,
      detector,
      detector_version: detectorVersion,
    }),
    summary,
  };
}

/**
 * Build an UNKNOWN finding.
 *
 * 🔴 An UNKNOWN still needs evidence. "I could not check this" is a claim about
 * a specific page at a specific moment, and it has to say which observation it
 * was looking at when it gave up — otherwise it is an opinion, and there is no
 * way to tell a considered UNKNOWN from a check that never ran.
 */
export function unknown({ issueClass, canonicalUrl, reasonCode, evidence, detector, detectorVersion, openedAt, summary }) {
  if (!(reasonCode in UNKNOWN_REASONS)) {
    throw new TypeError(
      `unknown reasonCode ${JSON.stringify(reasonCode)} — add it to UNKNOWN_REASONS deliberately, do not free-text it`,
    );
  }
  return {
    ...makeIssue({
      issue_class: issueClass,
      canonical_url: canonicalUrl,
      verdict: "UNKNOWN",
      severity: "low",
      evidence,
      opened_at: openedAt,
      detector,
      detector_version: detectorVersion,
    }),
    reason_code: reasonCode,
    reason: UNKNOWN_REASONS[reasonCode],
    summary: summary ?? UNKNOWN_REASONS[reasonCode],
  };
}

/* ------------------------------------------------------------------ *
 * 🔴 1C — EVERY CHECK NEEDS A FALSE-POSITIVE CONTROL.
 *
 * A check with only a firing fixture proves it can shout. It proves nothing
 * about whether it shouts at the wrong things, and a detector that flags clean
 * pages is worse than no detector: it costs the reader's trust on the first
 * false alarm and every real finding after it.
 *
 * So the REGISTRY refuses a check that does not name both. This is not a
 * convention — `registerCheck` throws, and a test asserts the throw.
 * ------------------------------------------------------------------ */

const REGISTRY = new Map();

export function registerCheck({ id, run, firingFixture, cleanControl, description }) {
  if (typeof id !== "string" || id === "") throw new TypeError("a check needs an id");
  if (typeof run !== "function") throw new TypeError(`${id}: a check needs a run function`);
  if (typeof firingFixture !== "string" || firingFixture === "") {
    throw new TypeError(`${id}: a check must NAME a fixture that violates it and makes it fire`);
  }
  if (typeof cleanControl !== "string" || cleanControl === "") {
    throw new TypeError(
      `${id}: a check must NAME a clean control that must NOT make it fire. ` +
        "A check with no false-positive control is not accepted, however elegant.",
    );
  }
  if (REGISTRY.has(id)) throw new TypeError(`${id}: already registered`);
  REGISTRY.set(id, { id, run, firingFixture, cleanControl, description });
  return REGISTRY.get(id);
}

export const registeredChecks = () => [...REGISTRY.values()];
export const clearRegistryForTests = () => REGISTRY.clear();
