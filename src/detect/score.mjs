/**
 * THE SCORER — the three-state model, applied exactly as the owner ruled it.
 *
 * ── THE RULE, NOT PARAPHRASED ───────────────────────────────────────────────────────────────────
 *
 *   REQUIRED RED     matching FINDING = detected
 *                    CLEAN            = missed  -> FAIL
 *                    UNKNOWN          = not detected -> FAIL
 *
 *   CLEAN CONTROL    CLEAN            = unflagged
 *                    FINDING          = false positive -> FAIL
 *                    UNKNOWN          = not successfully evaluated -> FAIL,
 *                                       recorded as UNEVALUATED, never as a false positive
 *
 *   An absent detector, null result, crash, skipped input or no output never earns "unflagged"
 *   and never contributes to a PASS.
 *
 * 🔴 THE DEFAULT IS FAILURE, EVERYWHERE. Each expectation starts NOT MET and only a positive,
 * matching outcome moves it. Written the other way round — start clean, subtract on evidence — a
 * missing row would score as a pass, which is the vacuous pass this model exists to forbid.
 *
 * 🔴 FALSE POSITIVE AND UNEVALUATED ARE COUNTED APART, though both fail. One is noise, the other is
 * blindness; an owner who cannot tell them apart cannot fix either. They are never summed.
 */

export const RED_RESULTS = Object.freeze(["DETECTED", "MISSED", "NOT_DETECTED_UNKNOWN", "NO_OUTPUT"]);
export const CONTROL_RESULTS = Object.freeze(["UNFLAGGED", "FALSE_POSITIVE", "UNEVALUATED", "NO_OUTPUT"]);

/**
 * @param {object} input
 * @param {object} input.findings            the frozen output of runDetectors
 * @param {{id:string, detectorKey:string, subject:string}[]} input.requiredReds
 * @param {{id:string, subject:string}[]} input.controls
 */
export function score({ findings, requiredReds, controls } = {}) {
  if (!findings || !Array.isArray(findings.detectors)) {
    throw new TypeError("score({findings}): the findings output is required — scoring an absent run would report zero false positives on zero evaluated controls");
  }
  if (!Array.isArray(requiredReds) || !Array.isArray(controls)) {
    throw new TypeError("score(): requiredReds and controls are both required — neither has an empty default");
  }

  const all = [];
  for (const d of findings.detectors) for (const o of d.outcomes) all.push({ detectorKey: d.key, ...o });

  const redRows = requiredReds.map((r) => {
    const forClass = all.filter((o) => o.detectorKey === r.detectorKey);
    const exact = forClass.filter((o) => o.subject === r.subject);
    const pool = exact.length > 0 ? exact : forClass;

    if (forClass.length === 0) return { ...r, result: "NO_OUTPUT", evidence: `detector ${r.detectorKey} produced no outcome at all` };
    if (pool.some((o) => o.outcome === "FINDING")) {
      const hit = pool.find((o) => o.outcome === "FINDING");
      return { ...r, result: "DETECTED", evidence: `${hit.detector} FINDING on ${hit.subject}: ${hit.summary}` };
    }
    if (pool.some((o) => o.outcome === "CLEAN")) {
      return { ...r, result: "MISSED", evidence: `${r.detectorKey} returned CLEAN on ${pool.filter((o) => o.outcome === "CLEAN").map((o) => o.subject).join(", ")}` };
    }
    return { ...r, result: "NOT_DETECTED_UNKNOWN", evidence: `${r.detectorKey} returned only UNKNOWN: ${pool.map((o) => `${o.subject} (${o.reasonCode})`).join("; ")}` };
  });

  const controlRows = controls.map((c) => {
    const about = all.filter((o) => o.subject === c.subject);
    if (about.length === 0) return { ...c, result: "NO_OUTPUT", evidence: "no detector produced any outcome about this control" };
    const flagged = about.filter((o) => o.outcome === "FINDING");
    if (flagged.length > 0) {
      return { ...c, result: "FALSE_POSITIVE", evidence: flagged.map((o) => `${o.detector}: ${o.defectClass}`).join("; ") };
    }
    const cleans = about.filter((o) => o.outcome === "CLEAN");
    if (cleans.length === 0) {
      return { ...c, result: "UNEVALUATED", evidence: `only UNKNOWN: ${about.map((o) => `${o.detector} (${o.reasonCode})`).join("; ")}` };
    }
    return { ...c, result: "UNFLAGGED", evidence: `${cleans.length} CLEAN outcome(s), ${about.length - cleans.length} UNKNOWN, 0 FINDING` };
  });

  const detected = redRows.filter((r) => r.result === "DETECTED").length;
  const unflagged = controlRows.filter((r) => r.result === "UNFLAGGED").length;
  const falsePositives = controlRows.filter((r) => r.result === "FALSE_POSITIVE").length;
  const unevaluated = controlRows.filter((r) => r.result === "UNEVALUATED" || r.result === "NO_OUTPUT").length;

  /* 🔴 PASS IS A CONJUNCTION OF POSITIVES. Every RED positively detected AND every control
   * positively left clean. Nothing here is expressed as "no failures found". */
  const pass = detected === requiredReds.length && unflagged === controls.length;

  return Object.freeze({
    pass,
    detected,
    redTotal: requiredReds.length,
    unflagged,
    controlTotal: controls.length,
    falsePositives,
    unevaluated,
    reds: Object.freeze(redRows),
    controls: Object.freeze(controlRows),
  });
}
