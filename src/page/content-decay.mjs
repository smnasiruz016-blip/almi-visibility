/**
 * F43 · CONTENT DECAY, REFRESH AND PRUNING — the evidence F35's contraction decisions need, from recorded performance only
 * (acceptance _handoffs 6c7627a, RR-91).
 *
 * Spec row: "Support evidence-based refresh, merge, noindex, redirect and removal decisions." V3 §17.1: no final demand judgement before
 * 28 days; a technical or indexing blocker must be resolved first; at least 100 impressions normally permits evaluation after day 28;
 * at day 90, a fallback review; technically healthy low exposure is WEAK or UNKNOWN, never automatic failure. §17.2: WEAK → diagnose →
 * improve once → re-measure → KEEP, MERGE or NOINDEX; MERGE and NOINDEX need owner approval; automatic deletion is forbidden.
 *
 * 🔴 AGE IS NOT MEASURED WHERE IT IS NOT RECORDED (RR-91 resumption). Age comes ONLY from a recorded publication date. A data window,
 * a first-seen date or a crawl date never stands in for one, and a page with none is never "old enough" or "too new". A page no
 * recorded row covers has NO performance evidence — NOT MEASURED, never zero impressions.
 *
 *   evaluation   BLOCKED · TOO_EARLY · EVALUABLE · FALLBACK_REVIEW · NOT_MEASURED   (age measured at the recorded window's end)
 *   result       WEAK (FALLBACK_REVIEW, technically clear) · NOT_WEAK (EVALUABLE) · UNKNOWN
 *   workflow     IMPROVE_ONCE · RE_MEASURE · DECIDED — only a re-measured, still-WEAK page yields F35's post-publication evidence
 *   removal      only when not served, no successor and no demand are ALL recorded
 *   world        SUPPORTED (evidence handed to F35) · NO_CONTRACTION (measured, no rule met) · NOT_MEASURED (missing facts named)
 *
 * F43 decides nothing on its own and writes, removes, redirects or noindexes nothing: every contraction leaves F35 as an
 * owner-approval RECOMMENDATION. Pure; no product is named here.
 */
export const EVALUATION = Object.freeze({ BLOCKED: "BLOCKED", TOO_EARLY: "TOO_EARLY", EVALUABLE: "EVALUABLE", FALLBACK_REVIEW: "FALLBACK_REVIEW", NOT_MEASURED: "NOT_MEASURED" });
export const MIN_DAYS = 28;
export const FALLBACK_DAYS = 90;
export const MIN_IMPRESSIONS = 100;
export const WORLD = Object.freeze({ SUPPORTED: "SUPPORTED", NO_CONTRACTION: "NO_CONTRACTION", NOT_MEASURED: "NOT_MEASURED" });
export const MISSING = Object.freeze({
  AGE: "a recorded publication date — without it the 28-day and 90-day rules (V3 §17.1) cannot be applied: it would decide TOO_EARLY, EVALUABLE or FALLBACK_REVIEW",
  PERFORMANCE: "a recorded Search Console window covering this page — without it exposure is unknown (never zero): it would decide EVALUABLE or FALLBACK_REVIEW",
  TECHNICAL: "a recorded technical and indexing state (F21 signals and a served state) — V3 §17.1 requires any blocker resolved before demand is judged: it would decide BLOCKED or clear",
  BETWEEN: `recorded age is between ${MIN_DAYS} and ${FALLBACK_DAYS} days with under ${MIN_IMPRESSIONS} impressions — neither evaluation (${MIN_IMPRESSIONS} impressions) nor the day-${FALLBACK_DAYS} fallback review applies yet`,
  NO_SUCCESSOR: "a recorded absence of any successor — no same-need page within a COMPLETE inventory (F31/F33)",
});

const DAY = 86400000;
const daysBetween = (from, to) => Math.floor((Date.parse(to) - Date.parse(from)) / DAY);
const iso = (d) => typeof d === "string" && !Number.isNaN(Date.parse(d));

/**
 * One page.
 * @param {object} p
 *   publishedOn   a RECORDED publication date (ISO) or null
 *   performance   { windowStart, windowEnd, impressions, ref } for this page, or null when no recorded row covers it
 *   technical     { state: "CLEAR" | "BLOCKED" | "UNKNOWN", evidence: string[] }
 *   improvement   { on, ref } — the one recorded improvement, or null
 *   remeasure     { windowStart, windowEnd, impressions, ref } — a recorded window after the improvement, or null
 *   notServed     { ref } when a 4xx/410 served state is recorded, else null
 *   noSuccessor   { ref } when the absence of any successor is recorded, else null
 */
export function assessPage({ pageId, publishedOn = null, performance = null, technical, improvement = null, remeasure = null, notServed = null, noSuccessor = null }) {
  const missing = [];
  const age = iso(publishedOn) && performance && iso(performance.windowEnd) ? daysBetween(publishedOn, performance.windowEnd) : null;
  if (!iso(publishedOn)) missing.push(`age: ${MISSING.AGE}`);
  if (!performance) missing.push(`performance: ${MISSING.PERFORMANCE}`);
  if (technical?.state !== "CLEAR" && technical?.state !== "BLOCKED") missing.push(`technical: ${MISSING.TECHNICAL}`);

  /* ── the evaluation window (V3 §17.1) ── */
  let state;
  let evidence = [];
  if (technical?.state === "BLOCKED") { state = EVALUATION.BLOCKED; evidence = [...(technical.evidence ?? [])]; }
  else if (age === null) state = EVALUATION.NOT_MEASURED;
  else if (age < MIN_DAYS) { state = EVALUATION.TOO_EARLY; evidence = [`age ${age} days at ${performance.windowEnd}`]; }
  else if (technical?.state !== "CLEAR") state = EVALUATION.NOT_MEASURED;
  else if (performance.impressions >= MIN_IMPRESSIONS) { state = EVALUATION.EVALUABLE; evidence = [`age ${age} days`, `${performance.impressions} impressions`, performance.ref]; }
  else if (age >= FALLBACK_DAYS) { state = EVALUATION.FALLBACK_REVIEW; evidence = [`age ${age} days`, `${performance.impressions} impressions`, performance.ref]; }
  else { state = EVALUATION.NOT_MEASURED; missing.push(`window: ${MISSING.BETWEEN}`); }

  /* ── the result: WEAK only at the fallback review, on a technically clear page ── */
  const result = state === EVALUATION.FALLBACK_REVIEW ? "WEAK" : state === EVALUATION.EVALUABLE ? "NOT_WEAK" : "UNKNOWN";

  /* ── the weak-result workflow (V3 §17.2): improve once, then re-measure — never skipped ── */
  let workflow = null;
  let postPublication = null;
  if (result === "WEAK") {
    if (!improvement || !iso(improvement.on)) workflow = Object.freeze({ step: "IMPROVE_ONCE", reason: "WEAK with no recorded improvement: diagnose, then improve once" });
    else if (!remeasure || !iso(remeasure.windowStart) || daysBetween(improvement.on, remeasure.windowEnd) < MIN_DAYS || Date.parse(remeasure.windowStart) < Date.parse(improvement.on)) {
      workflow = Object.freeze({ step: "RE_MEASURE", reason: `improved ${improvement.on}; no recorded window starting after it and ending at least ${MIN_DAYS} days later` });
    } else if (remeasure.impressions < MIN_IMPRESSIONS) {
      workflow = Object.freeze({ step: "DECIDED", reason: "still WEAK after one improvement and a re-measurement" });
      postPublication = Object.freeze({ weakResult: true, ownerApprovalPath: true, ref: remeasure.ref });
    } else {
      workflow = Object.freeze({ step: "DECIDED", reason: "no longer WEAK after one improvement and a re-measurement" });
    }
  }

  /* ── removal evidence: all three recorded, or none. No demand = zero impressions in a recorded window at recorded age ≥ day 90 ── */
  const noDemand = performance && age !== null && age >= FALLBACK_DAYS && performance.impressions === 0 ? { ref: performance.ref } : null;
  const removal = notServed && noSuccessor && noDemand
    ? Object.freeze({ notServed: true, noSuccessor: true, noDemand: true, ref: [notServed.ref, noSuccessor.ref, noDemand.ref].join(" + ") })
    : null;
  if (notServed && !removal) {
    if (!noSuccessor) missing.push(`removal: ${MISSING.NO_SUCCESSOR}`);
    if (!noDemand) missing.push(`removal: zero impressions in a recorded window at a recorded age of at least ${FALLBACK_DAYS} days`);
  }

  const world = postPublication || removal ? WORLD.SUPPORTED : state === EVALUATION.NOT_MEASURED || (notServed && !removal) ? WORLD.NOT_MEASURED : WORLD.NO_CONTRACTION;
  return Object.freeze({
    pageId,
    evaluation: Object.freeze({ state, evidence: Object.freeze(evidence.filter(Boolean)) }),
    result,
    workflow,
    postPublication,
    removal,
    world,
    missing: Object.freeze(missing),
  });
}

export function summariseDecay(assessments) {
  const by = (f) => assessments.reduce((m, a) => ((m[f(a)] = (m[f(a)] ?? 0) + 1), m), {});
  return Object.freeze({ population: assessments.length, evaluation: by((a) => a.evaluation.state), result: by((a) => a.result), world: by((a) => a.world) });
}
