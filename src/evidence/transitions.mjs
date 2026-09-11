/**
 * 🔴 C3 — UNKNOWN NEVER BECOMES PASS (DoD §170).
 *
 * ── WHY THIS IS A TABLE AND NOT SCATTERED `if`s ─────────────────────────────
 *
 * "UNKNOWN must never be reported as PASS" written in a document is a sentence.
 * Enforced as scattered conditionals it is a sentence with N places to get it
 * wrong, and the test can only ever check the places somebody remembered.
 *
 * Here every transition in the system is ONE ENTRY IN ONE FROZEN TABLE, so the
 * test can ENUMERATE the whole edge set and assert the absence of a forbidden
 * edge — rather than asserting that the four call sites it knows about behave.
 * A new transition added anywhere must be added here, where the test sees it.
 *
 * ── AND WHY 'PASS' EXISTS HERE BUT NOT IN ISSUE_VERDICTS ────────────────────
 *
 * An Issue cannot be a PASS (records.mjs). But a CHECK can be, and this table is
 * about check outcomes: the whole point is to police the edge INTO it. A law
 * that cannot express the forbidden state cannot forbid it — and would be
 * another gate that can never go red.
 */

export const CHECK_OUTCOMES = Object.freeze(["PASS", "FAIL", "UNKNOWN"]);

/**
 * Every legal transition, as `from -> [to, ...]`.
 *
 * 🔴 READ THE `UNKNOWN` ROW. It may become FAIL — evidence of a defect is
 * evidence. It may stay UNKNOWN. It may NOT become PASS, because nothing was
 * measured, and the absence of a measurement is not a clean bill of health.
 *
 * To go from UNKNOWN to PASS you must take a NEW measurement, which produces a
 * NEW record with its own provenance — not an edge on this graph.
 */
export const TRANSITIONS = Object.freeze({
  PASS: Object.freeze(["PASS", "FAIL", "UNKNOWN"]),
  FAIL: Object.freeze(["FAIL", "PASS", "UNKNOWN"]),
  UNKNOWN: Object.freeze(["UNKNOWN", "FAIL"]),
});

/** Every edge as a flat list, so a test can enumerate rather than sample. */
export function allEdges() {
  const edges = [];
  for (const [from, tos] of Object.entries(TRANSITIONS)) {
    for (const to of tos) edges.push({ from, to });
  }
  return edges;
}

/** Whether an edge is permitted. The single arbiter; nothing else decides. */
export function canTransition(from, to) {
  if (!CHECK_OUTCOMES.includes(from)) throw new TypeError(`unknown outcome ${from}`);
  if (!CHECK_OUTCOMES.includes(to)) throw new TypeError(`unknown outcome ${to}`);
  return TRANSITIONS[from].includes(to);
}

/**
 * Apply a transition, or throw.
 *
 * 🔴 THROWS RATHER THAN RETURNING THE OLD VALUE. Returning `from` on a refused
 * transition would let a caller believe it had promoted a check and carry on,
 * and the refusal would be invisible one stack frame away.
 */
export function transition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(
      `forbidden transition ${from} -> ${to}. ` +
        (from === "UNKNOWN" && to === "PASS"
          ? "UNKNOWN never becomes PASS (DoD §170): take a new measurement, do not promote an absence."
          : "add it to TRANSITIONS deliberately if it is legal."),
    );
  }
  return to;
}
