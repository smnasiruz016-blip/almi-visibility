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

export const RED_RESULTS = Object.freeze(["DETECTED", "MISSED", "NOT_DETECTED_UNKNOWN", "NOT_DETECTED_NOT_APPLICABLE", "NO_OUTPUT"]);
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

  /**
   * 🔴 A RED IS DETECTED ONLY WHERE THE FINDING IS ABOUT THAT RED's OWN LOCATOR.
   *
   * The obvious implementation — "this detector produced some finding somewhere, so the class was
   * found" — is a false-pass machine. Discovery over a real repository yields thousands of
   * candidates, so every comparator will report SOMETHING; scored loosely, all six would tick
   * without the engine having gone anywhere near the planted defect.
   *
   * So the finding must name the locator: as the subject itself, as a subject containing it (a page
   * URL for a route, a path for a file), or in the evidence the finding cites. The frozen contract
   * leaves it open (Q4) whether a DIFFERENT real instance of the same class should count, and that
   * question is the OWNER's — so this takes the reading that cannot manufacture a tick, and any
   * other-instance finding stays visible in the output for a human to rule on.
   */
  const mentions = (o, locator) =>
    o.subject === locator ||
    (typeof o.subject === "string" && o.subject.includes(locator)) ||
    (o.evidence ?? []).some((e) => String(e).includes(locator)) ||
    (typeof o.summary === "string" && o.summary.includes(locator));

  const redRows = requiredReds.map((r) => {
    const forClass = all.filter((o) => o.detectorKey === r.detectorKey);
    const pool = forClass.filter((o) => mentions(o, r.subject));

    if (forClass.length === 0) return { ...r, result: "NO_OUTPUT", evidence: `detector ${r.detectorKey} produced no outcome at all` };
    if (pool.length === 0) {
      const elsewhere = forClass.filter((o) => o.outcome === "FINDING").length;
      return { ...r, result: "NO_OUTPUT", evidence: `detector ${r.detectorKey} produced no outcome naming ${r.subject}; it reported ${elsewhere} finding(s) about other subjects, which are not this RED` };
    }
    if (pool.some((o) => o.outcome === "FINDING")) {
      const hit = pool.find((o) => o.outcome === "FINDING");
      return { ...r, result: "DETECTED", evidence: `${hit.detector} FINDING on ${hit.subject}: ${hit.summary}` };
    }
    if (pool.some((o) => o.outcome === "CLEAN")) {
      return { ...r, result: "MISSED", evidence: `${r.detectorKey} returned CLEAN on ${pool.filter((o) => o.outcome === "CLEAN").map((o) => o.subject).join(", ")}` };
    }
    /* 🔴 ON A REQUIRED RED, "nothing of this kind here" IS STILL NOT DETECTED. The defect is known
     * to exist, so a comparator that found no candidate did not exonerate the input — it failed to
     * see it. NOT_APPLICABLE is unscored on a CONTROL; on a RED it fails, like every non-FINDING. */
    if (pool.every((o) => o.outcome === "NOT_APPLICABLE")) {
      return { ...r, result: "NOT_DETECTED_NOT_APPLICABLE", evidence: `${r.detectorKey} found no candidate of its kind at all: ${pool.map((o) => o.subject).join(", ")}` };
    }
    return { ...r, result: "NOT_DETECTED_UNKNOWN", evidence: `${r.detectorKey} returned only UNKNOWN/NOT_APPLICABLE: ${pool.map((o) => `${o.subject} (${o.reasonCode})`).join("; ")}` };
  });

  /**
   * 🔴 A CONTROL IS SCORED PER PAGE, AND THAT IS READ OFF THE FROZEN TEXT, NOT CHOSEN.
   *
   *   PASS MARK      it counts CONTROL PAGES "flagged"    — the unit is the PAGE, the test is "flagged"
   *   rule heading   "what the engine reports about a control page"
   *   and in words   "A control is therefore clean AT THE PAGE LEVEL."
   *
   * No frozen text anywhere asks each comparator to return CLEAN on each control. So the order is:
   *
   *   any FINDING about the page            -> FALSE POSITIVE   (the contract's own rows)
   *   else any UNKNOWN about the page       -> UNEVALUATED      (Amendment 2: "not successfully evaluated")
   *   else at least one CLEAN               -> UNFLAGGED
   *   else nothing was positively examined  -> UNEVALUATED, never unflagged
   *
   * 🔴 NOT_APPLICABLE IS NOT SCORED IN EITHER DIRECTION, and the contract already carries that
   * shape: a Gate A "thin"/"duplicate" judgement about a control is "not scored either way". A
   * comparator with no candidate of its kind did not fail to evaluate — there was nothing of that
   * kind — so it neither fails the control nor earns it a tick.
   *
   * 🔴 AND IT CANNOT BECOME A QUIET PASS. A page whose every comparator returned NOT_APPLICABLE was
   * not examined at all, and Amendment 2 is explicit that "a skipped input or no output never earns
   * unflagged". Such a page scores UNEVALUATED. That is stricter than the alternative, not softer.
   */
  const controlRows = controls.map((c) => {
    const about = all.filter((o) => o.subject === c.subject);
    if (about.length === 0) return { ...c, result: "NO_OUTPUT", evidence: "no detector produced any outcome about this control" };
    const flagged = about.filter((o) => o.outcome === "FINDING");
    if (flagged.length > 0) {
      return { ...c, result: "FALSE_POSITIVE", evidence: flagged.map((o) => `${o.detector}: ${o.defectClass}`).join("; ") };
    }
    const unknowns = about.filter((o) => o.outcome === "UNKNOWN");
    if (unknowns.length > 0) {
      return { ...c, result: "UNEVALUATED", evidence: `a real candidate was discovered and left unresolved: ${unknowns.map((o) => `${o.detector} (${o.reasonCode})`).join("; ")}` };
    }
    const cleans = about.filter((o) => o.outcome === "CLEAN");
    const na = about.filter((o) => o.outcome === "NOT_APPLICABLE");
    if (cleans.length === 0) {
      return { ...c, result: "UNEVALUATED", evidence: `nothing was positively examined — ${na.length} comparator(s) found nothing of their kind, and an unexamined page is never unflagged` };
    }
    return { ...c, result: "UNFLAGGED", evidence: `${cleans.length} CLEAN outcome(s), ${na.length} NOT_APPLICABLE (not scored), 0 UNKNOWN, 0 FINDING` };
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
