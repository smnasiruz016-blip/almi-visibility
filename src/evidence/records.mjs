/**
 * THE THREE RECORD TYPES — OBSERVATION, SOURCE, ISSUE.
 *
 * ── 🔴 NOTHING IS AN OBSERVATION UNLESS IT WAS MEASURED ─────────────────────
 *
 * An Observation carries `observed_at`, `method` and `content_sha256`. All three
 * are required. A record that cannot say WHEN it was taken, HOW, and of WHAT
 * bytes is not a measurement — it is a belief, and beliefs belong in an
 * AGENT_INFERENCE Source, which is the lowest tier for exactly that reason.
 *
 * 🔴 PROVENANCE IS A TYPE, NOT A COMMENT. An inference has no `content_sha256`
 * to lie in, because it cannot be constructed as an Observation at all.
 */

import { observationId, issueId, targetPageId } from "./ids.mjs";

/* ------------------------------------------------------------------ *
 * SOURCE — provenance (V5.1 §14), tier order frozen from §623.
 * ------------------------------------------------------------------ */

/**
 * 🔴 ORDER IS MEANING HERE. Index 0 outranks index 1. The array is the ranking,
 * so there is no second copy of the order to drift away from it.
 */
export const SOURCE_TIERS = Object.freeze([
  "OFFICIAL",
  "OWNED_GSC_ANALYTICS",
  "VERIFIED_ALMIWORLD",
  "REPUTABLE_SECONDARY",
  "COMPETITOR_COMMUNITY",
  "AGENT_INFERENCE",
]);

/** Lower rank number = more authoritative. Throws on an unknown tier. */
export function tierRank(tier) {
  const i = SOURCE_TIERS.indexOf(tier);
  if (i === -1) throw new TypeError(`unknown source tier ${tier} — the order is frozen from §623`);
  return i;
}

export function makeSource({
  source_id,
  source_url,
  source_tier,
  publisher,
  retrieved_at,
  recheck_after = null,
  reviewer = null,
  excerpt_ref = null,
  confidence = null,
}) {
  tierRank(source_tier); // throws on an unknown tier
  if (typeof source_url !== "string" || source_url === "") throw new TypeError("source_url is required");
  if (typeof retrieved_at !== "string" || retrieved_at === "") throw new TypeError("retrieved_at is required");
  return Object.freeze({
    record_type: "source",
    source_id,
    source_url,
    source_tier,
    publisher: publisher ?? null,
    retrieved_at,
    // 🔴 null, not a default date. "Nobody set a recheck" and "recheck in 90
    // days" are different facts and a default would erase the first one.
    recheck_after,
    reviewer,
    excerpt_ref,
    confidence,
  });
}

/* ------------------------------------------------------------------ *
 * OBSERVATION — an immutable measured fact.
 * ------------------------------------------------------------------ */

export const TARGET_KINDS = Object.freeze(["property", "url", "artifact"]);

export function makeObservation({
  observed_at,
  method,
  target,
  content_sha256,
  value,
  collector,
  collector_version,
  raw_ref = null,
}) {
  if (!target || !TARGET_KINDS.includes(target.kind)) {
    throw new TypeError(`target.kind must be one of ${TARGET_KINDS.join("|")}`);
  }
  if (typeof target.ref !== "string" || target.ref === "") throw new TypeError("target.ref is required");
  for (const [name, v] of Object.entries({ observed_at, method, content_sha256, collector, collector_version })) {
    if (typeof v !== "string" || v === "") throw new TypeError(`observation: ${name} is required`);
  }
  const observation_id = observationId({
    target: `${target.kind}:${target.ref}`,
    method,
    observedAt: observed_at,
    contentSha256: content_sha256,
  });
  return Object.freeze({
    record_type: "observation",
    observation_id,
    observed_at,
    method,
    target: Object.freeze({ ...target }),
    content_sha256,
    raw_ref,
    value,
    collector,
    collector_version,
  });
}

/* ------------------------------------------------------------------ *
 * ISSUE — a claim that something is wrong.
 * ------------------------------------------------------------------ */

/**
 * 🔴 THERE IS NO 'PASS'.
 *
 * An Issue is a claim that something is WRONG. A passing check is not an issue;
 * it is the absence of one. Adding 'PASS' to this list would let a detector
 * write a green record into the issue store, and the first report that counted
 * rows would then report health as a quantity of issues.
 */
export const ISSUE_VERDICTS = Object.freeze(["FAIL", "UNKNOWN"]);
export const ISSUE_STATES = Object.freeze(["OPEN", "CLOSED", "SUPERSEDED"]);

export function makeIssue({
  issue_class,
  canonical_url,
  target_page_id,
  verdict,
  state = "OPEN",
  severity,
  evidence,
  sources = [],
  opened_at,
  detector,
  detector_version,
  supersedes = null,
  superseded_by = null,
}) {
  if (!ISSUE_VERDICTS.includes(verdict)) {
    throw new TypeError(
      `verdict must be one of ${ISSUE_VERDICTS.join("|")} — a PASS is not an issue`,
    );
  }
  if (!ISSUE_STATES.includes(state)) throw new TypeError(`state must be one of ${ISSUE_STATES.join("|")}`);

  /* ---- C1 --------------------------------------------------------- *
   * 🔴 AN ISSUE WITH NO EVIDENCE CANNOT BE CONSTRUCTED.
   *
   * Not "is rejected by a validator later" — cannot be built at all. A
   * validator runs somewhere else and can be skipped, forgotten, or run
   * against a different copy of the data. A constructor that throws is on the
   * only path into existence.
   * ------------------------------------------------------------------ */
  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw new TypeError(
      "an Issue must cite at least one observation_id — a claim with no evidence is an opinion",
    );
  }
  if (evidence.some((e) => typeof e !== "string" || e === "")) {
    throw new TypeError("every evidence entry must be an observation_id string");
  }

  for (const [name, v] of Object.entries({ issue_class, severity, opened_at, detector, detector_version })) {
    if (typeof v !== "string" || v === "") throw new TypeError(`issue: ${name} is required`);
  }

  const pageId = target_page_id ?? targetPageId(canonical_url);
  const issue_id = issueId({
    issueClass: issue_class,
    targetPageId: pageId,
    detector,
    detectorVersion: detector_version,
    evidence,
  });

  return Object.freeze({
    record_type: "issue",
    issue_id,
    issue_class,
    target_page_id: pageId,
    verdict,
    state,
    severity,
    evidence: Object.freeze([...evidence]),
    sources: Object.freeze([...sources]),
    opened_at,
    detector,
    detector_version,
    supersedes,
    superseded_by,
  });
}
