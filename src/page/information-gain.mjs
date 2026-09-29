/**
 * F39 · ORIGINAL INFORMATION GAIN — useful value beyond competitors, current pages and shared templates (acceptance _handoffs 90e798d,
 * RR-90).
 *
 * Spec row: "Require useful value beyond competitors, current pages and shared templates." V3 G12: "Add original information gain.
 * Provide verified synthesis, clearer decisions, useful comparison, tooling, examples or other defensible value." V3 §13: "Specific
 * right-to-exist and useful information gain are recorded." Competitors are "Supply diagnosis only; never factual authority" (V3 §3,
 * G5). THE CHECKER IS NOT THE VERDICT (RR-90 §3): an unmeasured baseline stays NOT MEASURED, and no page is called passed without it.
 *
 * ── ONE VERDICT PER BASELINE: BEYOND · NOT_BEYOND · NOT_MEASURED ─────────────────────────────────────────────────────────
 *
 *   shared templates   NOT_BEYOND: F32 SHELL ONLY · BEYOND: text outside the shared shell AND a recorded gain record · else NOT_MEASURED
 *   current pages      NOT_BEYOND: an exact duplicate, or a recorded review finds it duplicate (F32) · BEYOND: every sibling pair
 *                      reviewed DISTINCT (or no sibling) AND a recorded gain record · else NOT_MEASURED
 *   competitors        from a RECORDED competitor-supply comparison only: no gain → NOT_BEYOND · a gain against ≥ 1 competitor
 *                      compared → BEYOND · none recorded → NOT_MEASURED. Competitor content is never a fact; nothing is collected.
 *
 *   ESTABLISHED  every baseline BEYOND (which needs a recorded gain record naming its G12 kind)
 *   REFUSED      any baseline NOT_BEYOND, named
 *   CANNOT_DECIDE otherwise, every missing fact named
 *
 * A declared intention (a candidate's WHY), a first-party statement, length, word count or textual difference is never a gain record:
 * this module reads none of them. Pure — it writes nothing and names no product.
 */
import { detectDuplication } from "./duplication.mjs";

export const G12_KINDS = Object.freeze(["VERIFIED_SYNTHESIS", "CLEARER_DECISIONS", "USEFUL_COMPARISON", "TOOLING", "EXAMPLES", "OTHER_DEFENSIBLE_VALUE"]);
export const BASELINES = Object.freeze(["templates", "currentPages", "competitors"]);
export const GAIN_OUTCOME = Object.freeze({ ESTABLISHED: "ESTABLISHED", REFUSED: "REFUSED", CANNOT_DECIDE: "CANNOT_DECIDE" });
export const MISSING = Object.freeze({
  GAIN: "a recorded information-gain record naming its G12 kind and what it adds (V3 G12, §13) — none is recorded; a declared intention or first-party statement is not one",
  REVIEW: "a recorded semantic review of every sibling pair (F32, V3 §14.2) — similarity is a review trigger, not a verdict",
  COMPETITORS: "a recorded competitor-supply comparison for the page's need (V3: supply diagnosis only) — none is recorded, and F39 collects none",
  BODY: "a verified stored body for the page (F31) — without one no baseline can be measured",
});
/** Every evidence list F39 reads, empty: no store of any of them exists today. Callers pass it EXPLICITLY. */
export const NO_RECORDED_GAIN_EVIDENCE = Object.freeze({ gainRecords: Object.freeze([]), competitorComparisons: Object.freeze([]), reviews: Object.freeze([]) });

const verdict = (state, evidence, missing = null) => Object.freeze({ state, evidence: Object.freeze(evidence.filter(Boolean)), missing });

/** A gain record counts only when it names a G12 kind and what it adds. */
export function validGainRecord(r) {
  return Boolean(r) && G12_KINDS.includes(r.kind) && typeof r.adds === "string" && r.adds.trim() !== "" && typeof r.ref === "string" && r.ref !== "";
}

function requireEvidence(evidence) {
  if (!evidence || !Array.isArray(evidence.gainRecords) || !Array.isArray(evidence.competitorComparisons) || !Array.isArray(evidence.reviews)) {
    throw new TypeError("gain evidence must be passed explicitly (gainRecords, competitorComparisons, reviews) — an empty list is a recorded fact, not a default");
  }
}

/** One page's decision, from F32's per-page result and the recorded records for it. */
export function judgePage({ pageId, dup, evidence, siblings }) {
  const gain = evidence.gainRecords.find((r) => r.pageId === pageId && validGainRecord(r)) ?? null;
  const measured = dup.pages.find((p) => p.pageId === pageId) ?? null;
  const b = {};
  if (!measured) {
    for (const k of BASELINES) b[k] = verdict("NOT_MEASURED", [], MISSING.BODY);
  } else {
    /* shared templates */
    b.templates = measured.shell.state === "SHELL_ONLY" ? verdict("NOT_BEYOND", [`F32 SHELL_ONLY: shared-shell share ${measured.shell.share}`])
      : measured.shell.state === "HAS_UNIQUE_TEXT" && gain ? verdict("BEYOND", [`F32 shared-shell share ${measured.shell.share.toFixed(3)}`, gain.ref])
      : measured.shell.state === "HAS_UNIQUE_TEXT" ? verdict("NOT_MEASURED", [`F32 shared-shell share ${measured.shell.share.toFixed(3)}`], `text outside the shared shell exists; whether it is useful value needs ${MISSING.GAIN}`)
      : verdict("NOT_MEASURED", [], "the shared-shell share could not be measured (F32)");
    /* current pages */
    const pairs = dup.pairs.filter((p) => p.pair.includes(pageId));
    const reviewedDup = pairs.find((p) => p.semantic.state === "DUPLICATE");
    b.currentPages = measured.exact.state === "EXACT_DUPLICATE" ? verdict("NOT_BEYOND", ["F32 EXACT_DUPLICATE of another current page"])
      : reviewedDup ? verdict("NOT_BEYOND", [`F32 reviewed DUPLICATE: ${reviewedDup.semantic.ref}`])
      : measured.exact.state === "NOT_MEASURED" ? verdict("NOT_MEASURED", [], `the main text could not be read (${measured.exact.why})`)
      : pairs.every((p) => p.semantic.state === "DISTINCT") && gain ? verdict("BEYOND", [siblings === 0 ? "no other current page" : `all ${pairs.length} sibling pair(s) reviewed DISTINCT`, gain.ref])
      : pairs.every((p) => p.semantic.state === "DISTINCT") ? verdict("NOT_MEASURED", [`all ${pairs.length} sibling pair(s) reviewed DISTINCT`], MISSING.GAIN)
      : verdict("NOT_MEASURED", [`${pairs.filter((p) => p.semantic.state !== "DISTINCT").length} of ${pairs.length} sibling pair(s) not reviewed DISTINCT · ${pairs.filter((p) => p.textual === "REVIEW_REQUIRED").length} above the 40% review trigger`], MISSING.REVIEW);
    /* competitors — a recorded comparison only */
    const cmp = evidence.competitorComparisons.find((c) => c.pageId === pageId) ?? null;
    b.competitors = !cmp ? verdict("NOT_MEASURED", [], MISSING.COMPETITORS)
      : cmp.gainBeyond === false ? verdict("NOT_BEYOND", [`recorded comparison ${cmp.ref}: no gain beyond ${cmp.competitorsCompared ?? 0} competitor(s)`])
      : cmp.gainBeyond === true && Number(cmp.competitorsCompared) >= 1 ? verdict("BEYOND", [`recorded comparison ${cmp.ref}: gain beyond ${cmp.competitorsCompared} competitor(s)`])
      : verdict("NOT_MEASURED", [cmp.ref], `the recorded comparison ${cmp.ref} names no competitor compared, or no verdict`);
  }
  const states = BASELINES.map((k) => b[k].state);
  const outcome = states.includes("NOT_BEYOND") ? GAIN_OUTCOME.REFUSED
    : states.every((s) => s === "BEYOND") && gain ? GAIN_OUTCOME.ESTABLISHED
    : GAIN_OUTCOME.CANNOT_DECIDE;
  const missing = BASELINES.filter((k) => b[k].state === "NOT_MEASURED").map((k) => `${k}: ${b[k].missing}`);
  return Object.freeze({
    pageId,
    outcome,
    baselines: Object.freeze(b),
    refusedOn: Object.freeze(BASELINES.filter((k) => b[k].state === "NOT_BEYOND")),
    missing: Object.freeze(outcome === GAIN_OUTCOME.CANNOT_DECIDE ? missing : []),
    gainRecord: gain ? gain.ref : null,
  });
}

/**
 * Every page of one client, each against the others (F32), with the recorded evidence.
 * @param {{ pages: { pageId: string, html: string|null, verified: boolean }[], evidence: { gainRecords: object[], competitorComparisons: object[], reviews: object[] } }} input
 */
export function judgeInformationGain({ pages, evidence }) {
  requireEvidence(evidence);
  const dup = detectDuplication({ pages, reviews: evidence.reviews, valueRecords: [] });
  const decisions = pages.map((p) => judgePage({ pageId: p.pageId, dup, evidence, siblings: dup.pages.length - 1 }));
  const count = (f) => decisions.reduce((m, d) => ((m[f(d)] = (m[f(d)] ?? 0) + 1), m), {});
  return Object.freeze({
    decisions: Object.freeze(decisions),
    summary: Object.freeze({
      population: pages.length,
      outcome: count((d) => d.outcome),
      templates: count((d) => d.baselines.templates.state),
      currentPages: count((d) => d.baselines.currentPages.state),
      competitors: count((d) => d.baselines.competitors.state),
    }),
  });
}

/** A page the production path is about to accept, judged against the client's current pages (F39 C6). */
export function informationGainForCandidate({ candidateId, html, currentPages, evidence }) {
  requireEvidence(evidence);
  if (typeof html !== "string" || html === "") return judgePage({ pageId: candidateId, dup: { pages: [], pairs: [] }, evidence, siblings: 0 });
  const r = judgeInformationGain({ pages: [{ pageId: candidateId, html, verified: true }, ...currentPages.filter((p) => p.pageId !== candidateId)], evidence });
  return r.decisions[0];
}
