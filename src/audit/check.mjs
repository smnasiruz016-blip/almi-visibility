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

/**
 * 🔴 RR-194 · T-2 (RTP-1 S10, P20, P21; the owner's PG-A1) — A REVIEW SIGNAL. A measured figure past a signal the owner kept ONLY as a
 * signal: the check DID answer (the value is measured), so this is not a could-not-answer UNKNOWN (UNKNOWN_REASONS above) — it is UNKNOWN
 * because the figure decides nothing: a recorded substance review decides (P20), completeness is judged for a need (P21). It carries the
 * measured value and the signal's recorded justification, so the page stays visible for review (the owner's RR-194 decision 2). Never FAIL.
 */
export function reviewSignal({ issueClass, canonicalUrl, targetPageId, evidence, detector, detectorVersion, openedAt, signal, summary, supersedes = null }) {
  if (!signal || typeof signal.name !== "string" || signal.name === "" || typeof signal.value !== "number" || !Number.isFinite(signal.value) || typeof signal.bound !== "number" || typeof signal.justification !== "string" || signal.justification === "") {
    throw new TypeError("a review signal names the signal, its measured value, the bound it is read against and its recorded justification");
  }
  return {
    ...makeIssue({
      issue_class: issueClass,
      canonical_url: canonicalUrl,
      target_page_id: targetPageId,
      verdict: "UNKNOWN",
      severity: "low",
      evidence,
      opened_at: openedAt,
      detector,
      detector_version: detectorVersion,
      supersedes,
    }),
    signal: Object.freeze({ name: signal.name, value: signal.value, bound: signal.bound, justification: signal.justification, decides: "nothing" }),
    summary,
  };
}

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

/* 🔴 RR-100 — A STRUCTURED BOUNDARY, READ FROM THE CODE. A check MAY declare `boundary`: the inputs its run reads (`observes`) and the exact
 * conditions under which it FIRES (`fires`: [{ id, when }]). A finding is void when a fresh observation of `observes` makes every `fires`
 * condition false. The declaration is not prose about the check: test/rr100-check-boundaries.test.mjs crosses every declared condition in
 * BOTH directions against the check's own run, and fails the moment the declaration and the code disagree. */
function validBoundary(id, b) {
  if (b === undefined) return undefined;
  const ok = b && Array.isArray(b.observes) && b.observes.length > 0 && b.observes.every((x) => typeof x === "string" && x !== "")
    && Array.isArray(b.fires) && b.fires.length > 0 && b.fires.every((f) => typeof f?.id === "string" && f.id !== "" && typeof f?.when === "string" && f.when !== "")
    && new Set(b.fires.map((f) => f.id)).size === b.fires.length;
  if (!ok) throw new TypeError(`${id}: a boundary must name what it observes and each condition it fires on, with a unique id and a stated condition`);
  return Object.freeze({ observes: Object.freeze([...b.observes]), fires: Object.freeze(b.fires.map((f) => Object.freeze({ id: f.id, when: f.when }))) });
}

/* 🔴 F90 — THE LIVE VERSION, DECLARED. A check MAY declare `version`: the detector_version its run() stamps on every finding it raises. F90
 * holds a recorded finding's method only when the registered check's declared version equals the finding's recorded detector_version;
 * with none declared, the live version is NOT MEASURED and never assumed. The crossing tests (rr100, rr102) fail if a run() stamps any
 * other version, so the declaration and the stamp cannot drift apart. */
export function registerCheck({ id, run, firingFixture, cleanControl, description, boundary, version }) {
  if (typeof id !== "string" || id === "") throw new TypeError("a check needs an id");
  if (version !== undefined && (typeof version !== "string" || version === "")) throw new TypeError(`${id}: a declared version must be a non-empty string`);
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
  REGISTRY.set(id, { id, run, firingFixture, cleanControl, description, boundary: validBoundary(id, boundary), version });
  return REGISTRY.get(id);
}

export const registeredChecks = () => [...REGISTRY.values()];
export const clearRegistryForTests = () => REGISTRY.clear();
