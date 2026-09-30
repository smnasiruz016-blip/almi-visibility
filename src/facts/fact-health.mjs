/**
 * F45 · FACT CONFLICT, FRESHNESS AND RECOMPUTATION (acceptance _handoffs dcb9fbb, RR-94).
 *
 * Spec row: "Detect contradictions and expiry; recompute derived facts from declared formulas and inputs." V3 §10.4 (V3-STRICTER): "An
 * expired material fact cannot remain presented as current. The affected claim fails closed and the page enters REVIEW REQUIRED; one
 * expired fact does not automatically delete or noindex the page."
 *
 *   C1  CONTRADICTED   two or more active records of one claim with differing values — src/facts/lifecycle.mjs detectConflicts,
 *                      reused unchanged: every record retained, no winner picked. A RECORDED settlement is reported as recorded.
 *   C2  FRESHNESS      judged ON A STATED DATE (a date is a measurement — never the clock's default) by the fact's OWN declared rule
 *                      (freshness.days) from its OWN recorded check date (verification.checkedOn, which must agree with
 *                      checks.factCheckedOn where both exist). Where a recorded recheck date falls BEFORE the rule's due date, the
 *                      earlier governs — two declared windows that disagree are ambiguous, and ambiguous evidence fails closed (RR-94 §4).
 *                      CURRENT · EXPIRED · NOT_MEASURED (the missing fact named).
 *   C3  FAILS CLOSED   only a CURRENT, uncontradicted fact whose inputs are all sound is presented as current; every other fact is
 *                      REVIEW_REQUIRED with its reasons. Nothing is deleted or noindexed here.
 *   C4  RECOMPUTED     every derived fact from its declared formula (FORMULAS, reused) and recorded inputs (recomputeDerived, reused):
 *                      MATCH · MISMATCH · NOT_MEASURED; a bad input marks it (and, transitively, its dependents — markForReview,
 *                      reused) REVIEW_REQUIRED even when the arithmetic matches.
 * Pure: no fetch, no clock, no write. Names no product.
 */
import { detectConflicts, recomputeDerived, markForReview, FORMULAS } from "./lifecycle.mjs";

export const FRESHNESS = Object.freeze({ CURRENT: "CURRENT", EXPIRED: "EXPIRED", NOT_MEASURED: "NOT_MEASURED" });
export const RECOMPUTE = Object.freeze({ MATCH: "MATCH", MISMATCH: "MISMATCH", NOT_MEASURED: "NOT_MEASURED" });

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const day = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const plusDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/** C2 — one fact's freshness on the stated date `on` (YYYY-MM-DD). */
export function factFreshness(fact, { on }) {
  if (!ISO.test(on ?? "")) throw new TypeError("the judging date must be stated (YYYY-MM-DD) — a date is a measurement, never the clock's default");
  const days = fact?.freshness?.days;
  const checked = day(fact?.verification?.checkedOn), factChecked = day(fact?.checks?.factCheckedOn);
  if (!(Number.isInteger(days) && days > 0)) return { state: FRESHNESS.NOT_MEASURED, missing: "a declared freshness rule (days)" };
  if (!checked && !factChecked) return { state: FRESHNESS.NOT_MEASURED, missing: "a recorded check date" };
  if (checked && factChecked && checked !== factChecked) return { state: FRESHNESS.NOT_MEASURED, missing: "one recorded check date — the two recorded check dates disagree" };
  const check = checked ?? factChecked;
  const ruleDue = plusDays(check, days);
  const recorded = day(fact?.checks?.recheckAfter ?? fact?.verification?.recheckAfter);
  const due = recorded && recorded < ruleDue ? recorded : ruleDue;
  return {
    state: on > due ? FRESHNESS.EXPIRED : FRESHNESS.CURRENT,
    checkedOn: check,
    dueOn: due,
    windowsDisagree: Boolean(recorded && recorded !== ruleDue),
    governedBy: recorded && recorded < ruleDue ? "the earlier recorded recheck date" : "the declared rule",
  };
}

/** C4 — one derived fact, recomputed from its declared formula and recorded inputs. */
export function recompute(fact, byId) {
  const d = fact?.derivation;
  if (!(d?.formula in FORMULAS)) return { state: RECOMPUTE.NOT_MEASURED, missing: "a declared formula" };
  const inputs = (d.inputs ?? []).map((id) => byId.get(id));
  if (!d.inputs?.length || inputs.some((f) => !f)) return { state: RECOMPUTE.NOT_MEASURED, missing: "a recorded input fact" };
  if (inputs.some((f) => typeof f?.value?.value !== "number")) return { state: RECOMPUTE.NOT_MEASURED, missing: "a numeric input value" };
  const r = recomputeDerived(fact, inputs);
  return { state: r.ok ? RECOMPUTE.MATCH : RECOMPUTE.MISMATCH, inputs: d.inputs };
}

/**
 * The client's registry, assessed on the stated date.
 * @param records  the registry's records (retired ones are not presented and are not judged)
 * @param on       the stated judging date, YYYY-MM-DD
 */
export function assessFactHealth(records, { on }) {
  if (!ISO.test(on ?? "")) throw new TypeError("the judging date must be stated (YYYY-MM-DD) — a date is a measurement, never the clock's default");
  const active = records.filter((f) => f?.life?.status !== "retired");
  const byId = new Map(active.map((f) => [f.id, f]));
  const contradictions = detectConflicts(active);
  const contradicted = new Set(contradictions.flatMap((c) => c.records.map((r) => r.id)));
  const fresh = new Map(active.map((f) => [f.id, factFreshness(f, { on })]));
  const derived = active.filter((f) => Array.isArray(f?.derivation?.inputs));
  const recomputed = new Map(derived.map((f) => [f.id, recompute(f, byId)]));

  /* C4 — the dependency walk: every fact that is not sound seeds it; derived facts built on one are marked, transitively */
  const unsound = active.filter((f) => contradicted.has(f.id) || fresh.get(f.id).state !== FRESHNESS.CURRENT).map((f) => f.id);
  const walk = markForReview({ facts: active, badFactIds: unsound, reason: "INPUT_UNKNOWN" });
  const markedByInput = new Map(walk.markedFacts.map((m) => [m.id, m.becauseOf]));

  const facts = active.map((f) => {
    const reasons = [];
    if (contradicted.has(f.id)) reasons.push("CONTRADICTED");
    const fr = fresh.get(f.id);
    if (fr.state === FRESHNESS.EXPIRED) reasons.push("EXPIRED");
    if (fr.state === FRESHNESS.NOT_MEASURED) reasons.push(`FRESHNESS NOT MEASURED — missing ${fr.missing}`);
    const rc = recomputed.get(f.id);
    if (rc && rc.state !== RECOMPUTE.MATCH) reasons.push(`RECOMPUTE ${rc.state}`);
    if (markedByInput.has(f.id)) reasons.push("AN INPUT IS NOT SOUND");
    return Object.freeze({ id: f.id, freshness: fr, recompute: rc ?? null, presentation: reasons.length ? "REVIEW_REQUIRED" : "CURRENT", reasons });
  });

  return Object.freeze({
    on,
    facts,
    contradictions,
    settlements: active.filter((f) => f?.conflict && typeof f.conflict === "object").map((f) => ({ id: f.id, settledBy: f.conflict.settledBy ? "RECORDED" : "NOT RECORDED" })),
    summary: Object.freeze({
      facts: facts.length,
      retiredNotJudged: records.length - active.length,
      contradicted: contradicted.size,
      contradictionGroups: contradictions.length,
      recordedSettlements: active.filter((f) => f?.conflict).length,
      freshness: count(facts.map((x) => x.freshness.state)),
      freshnessMissing: count(facts.filter((x) => x.freshness.missing).map((x) => x.freshness.missing)),
      windowsDisagree: facts.filter((x) => x.freshness.windowsDisagree).length,
      derived: derived.length,
      recompute: count([...recomputed.values()].map((x) => x.state)),
      presentation: count(facts.map((x) => x.presentation)),
    }),
  });
}

function count(xs) { return xs.reduce((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {}); }
