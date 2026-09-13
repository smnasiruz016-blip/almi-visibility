/**
 * ITEM 49 — AN ISSUE'S LIFECYCLE, IN AN APPEND-ONLY STORE.
 *
 * ── 🔴 THE STORE HAS NO UPDATE, SO A STATE CHANGE IS A RECORD ───────────────
 *
 * An Issue is written once with `state: "OPEN"` and is never edited (C2). It
 * leaves OPEN by a SECOND record — `issue_state_change` — that names the issue,
 * the move, when, why, the evidence for the move, and the action that made it.
 * A reader derives the current state by applying those records in order. The
 * original stays byte-for-byte what it was, so the history of a conclusion
 * that turned out to be wrong survives its correction.
 *
 * ── THE LAWS ────────────────────────────────────────────────────────────────
 *
 *   - OPEN → CLOSED and OPEN → SUPERSEDED are the only moves. Both are terminal.
 *   - A move must carry a reason, evidence, and the action that made it.
 *   - SUPERSEDED must name its replacement, and the replacement must name it
 *     back in `supersedes`. A supersession nobody can follow is a deletion.
 *   - A move for an issue the store does not hold is refused, not ignored.
 *
 * ── 🔴 AND WHAT THIS DOES NOT PERMIT ────────────────────────────────────────
 *
 * CLOSED means FIXED or no longer true, with evidence of that. It is not a way
 * to make a list shorter. Nothing here closes an issue because its lifecycle
 * "should" complete; the robots issues stay OPEN because they are.
 */

import { ISSUE_STATES } from "./records.mjs";
import { canTransition } from "./transitions.mjs";

export const STATE_CHANGE_TYPE = "issue_state_change";

/** Every legal move, and nothing else. CLOSED and SUPERSEDED are terminal. */
export const ISSUE_TRANSITIONS = Object.freeze({
  OPEN: Object.freeze(["CLOSED", "SUPERSEDED"]),
  CLOSED: Object.freeze([]),
  SUPERSEDED: Object.freeze([]),
});

export function makeIssueStateChange({ issue_id, from, to, changed_at, reason, evidence, action, actor, superseded_by = null }) {
  for (const s of [from, to]) if (!ISSUE_STATES.includes(s)) throw new TypeError(`state change: unknown state ${JSON.stringify(s)}`);
  if (!ISSUE_TRANSITIONS[from].includes(to)) {
    throw new TypeError(`state change: ${from} → ${to} is not a legal move — CLOSED and SUPERSEDED are terminal, and only OPEN may leave`);
  }
  for (const [k, v] of Object.entries({ issue_id, changed_at, reason, action, actor })) {
    if (typeof v !== "string" || v.trim() === "") throw new TypeError(`state change: ${k} is required — a move nobody can explain is an edit`);
  }
  if (!Array.isArray(evidence) || evidence.length === 0 || evidence.some((e) => typeof e !== "string" || e === "")) {
    throw new TypeError("state change: evidence is required — a conclusion leaves OPEN on evidence, not on preference");
  }
  if (to === "SUPERSEDED" && (typeof superseded_by !== "string" || superseded_by === "")) {
    throw new TypeError("state change: SUPERSEDED must name the record that supersedes it");
  }
  if (to !== "SUPERSEDED" && superseded_by !== null) {
    throw new TypeError("state change: only a SUPERSEDED move names a replacement");
  }
  return Object.freeze({
    record_type: STATE_CHANGE_TYPE,
    issue_id,
    from,
    to,
    changed_at,
    reason,
    evidence: Object.freeze([...evidence]),
    action,
    actor,
    superseded_by,
  });
}

/**
 * The derived lifecycle of every issue in `records`.
 *
 * 🔴 DUPLICATE COPIES ARE COUNTED, NOT HIDDEN. An issue written twice with the
 * same `issue_id` is one issue; `copies` says how many times it was written, so
 * a duplicate append stays visible.
 */
export function lifecycleOf(records) {
  const issues = new Map();
  for (const r of records) {
    if (r?.record_type !== "issue") continue;
    const cur = issues.get(r.issue_id);
    if (cur) cur.copies += 1;
    else issues.set(r.issue_id, { issue: r, copies: 1, state: r.state ?? "OPEN", changes: [] });
  }

  const errors = [];
  // The UNKNOWN→PASS guard's own count: every real transition it judged, refused, or allowed on a new measurement.
  const guard = { judged: 0, refused: 0, onNewMeasurement: 0 };
  const changes = records
    .filter((r) => r?.record_type === STATE_CHANGE_TYPE)
    .sort((a, b) => (a.changed_at < b.changed_at ? -1 : a.changed_at > b.changed_at ? 1 : 0));

  for (const c of changes) {
    const entry = issues.get(c.issue_id);
    if (!entry) {
      errors.push(`state change for ${c.issue_id}: no such issue in this store — a move cannot apply to nothing`);
      continue;
    }
    if (c.from !== entry.state) {
      errors.push(`state change for ${c.issue_id}: recorded from ${c.from} but the issue was ${entry.state}`);
      continue;
    }
    if (!ISSUE_TRANSITIONS[entry.state]?.includes(c.to)) {
      errors.push(`state change for ${c.issue_id}: ${entry.state} → ${c.to} is not a legal move`);
      continue;
    }
    if (c.to === "SUPERSEDED") {
      const replacement = issues.get(c.superseded_by);
      if (!replacement) {
        errors.push(`state change for ${c.issue_id}: superseded_by ${c.superseded_by} is not in this store — the replacement cannot be followed`);
        continue;
      }
      if (replacement.issue.supersedes !== c.issue_id) {
        errors.push(`state change for ${c.issue_id}: its replacement ${c.superseded_by} does not name it in supersedes`);
        continue;
      }
    }

    /* 🔴 ITEM 50 — THE UNKNOWN→PASS GUARD, ON THE ISSUE PATH (13 September 2026).
     * Closing an issue asserts that the defect is gone: a PASS. Superseding one
     * hands its verdict to the replacement. Both are check-outcome transitions,
     * and the ONE table in transitions.mjs decides them. Until this, an UNKNOWN
     * issue could be CLOSED on any evidence at all — a path that turned
     * "we could not tell" into "fixed" with nothing measured. An UNKNOWN issue
     * may now leave for PASS only on a NEW measurement: evidence that was not
     * already behind the issue. */
    const fromOutcome = entry.issue.verdict;
    const toOutcome = c.to === "CLOSED" ? "PASS" : issues.get(c.superseded_by).issue.verdict;
    guard.judged += 1;
    if (!canTransition(fromOutcome, toOutcome)) {
      const fresh = (c.evidence ?? []).filter((id) => !(entry.issue.evidence ?? []).includes(id));
      if (!(fromOutcome === "UNKNOWN" && toOutcome === "PASS" && fresh.length > 0)) {
        guard.refused += 1;
        errors.push(`state change for ${c.issue_id}: ${fromOutcome} → ${toOutcome} is forbidden — UNKNOWN never becomes PASS without a new measurement (DoD §170)`);
        continue;
      }
      guard.onNewMeasurement += 1;
    }
    entry.state = c.to;
    entry.changes.push(c);
  }

  const census = Object.fromEntries(ISSUE_STATES.map((s) => [s, 0]));
  for (const e of issues.values()) census[e.state] += 1;
  return { issues, errors, census, guard };
}

export const DUPLICATE_SUPERSEDED_TYPE = "duplicate_record_superseded";

/**
 * 🔴 THE SAME ISSUE STORED MORE THAN ONCE — counted, and whether each extra
 * copy has been SUPERSEDED. Nothing is ever removed: an extra copy stays in the
 * store, and a `duplicate_record_superseded` note marks it, naming the copy it
 * yields to. The census is exact: physical copies, logical issues, extra
 * copies, and how many of those extras carry a note.
 */
export function duplicateCensus(records) {
  const copies = new Map();
  for (const r of records) {
    if (r?.record_type !== "issue") continue;
    copies.set(r.issue_id, [...(copies.get(r.issue_id) ?? []), r]);
  }
  const notes = new Set(records.filter((r) => r?.record_type === DUPLICATE_SUPERSEDED_TYPE).map((r) => `${r.issue_id}#${r.copy_index}`));
  let extra = 0;
  let superseded = 0;
  const unsuperseded = [];
  for (const [id, list] of copies) {
    for (let k = 2; k <= list.length; k += 1) {
      extra += 1;
      if (notes.has(`${id}#${k}`)) superseded += 1;
      else unsuperseded.push({ issue_id: id, copy_index: k });
    }
  }
  return {
    physicalIssueRecords: [...copies.values()].reduce((n, l) => n + l.length, 0),
    logicalIssues: copies.size,
    extraCopies: extra,
    superseded,
    unsuperseded,
  };
}

/**
 * 🔴 WALK ONE CONCLUSION END TO END — the five things item 49 names.
 *
 *   what       — the claim: its class, target and summary
 *   why        — the verdict, the detector and version that reached it, its stated reason
 *   evidence   — every cited id, RESOLVED to the stored record, or marked missing
 *   when       — when it was opened, and when each move happened
 *   changedBy  — every move, with the action that made it, its reason, its
 *                evidence and the replacement it points to
 *
 * A part is `present` only if the store actually supplies it. A missing piece
 * is reported as missing; nothing is filled in.
 */
export function walkChain(issueId, records) {
  const { issues } = lifecycleOf(records);
  const entry = issues.get(issueId);
  if (!entry) throw new Error(`walkChain: ${issueId} is not in these records`);
  const byObservation = new Map();
  for (const r of records) if (r?.observation_id && r.record_type === "observation") byObservation.set(r.observation_id, r);

  const resolve = (id) => {
    const o = byObservation.get(id);
    return o
      ? { id, found: true, method: o.method, target: o.target?.ref ?? null, observed_at: o.observed_at }
      : { id, found: false };
  };

  const i = entry.issue;
  const what = { issue_class: i.issue_class, target_page_id: i.target_page_id, summary: i.summary ?? null };
  const why = { verdict: i.verdict, detector: i.detector, detector_version: i.detector_version, reason: i.reason ?? i.summary ?? null };
  const evidence = (i.evidence ?? []).map(resolve);
  const when = { opened_at: i.opened_at, moves: entry.changes.map((c) => ({ to: c.to, at: c.changed_at })) };
  const changedBy = entry.changes.map((c) => {
    const rep = c.superseded_by ? issues.get(c.superseded_by)?.issue : null;
    return {
      to: c.to,
      action: c.action,
      actor: c.actor,
      reason: c.reason,
      evidence: c.evidence.map(resolve),
      replacement: rep
        ? { issue_id: rep.issue_id, verdict: rep.verdict, detector: rep.detector, detector_version: rep.detector_version, reason: rep.reason ?? null, evidence: rep.evidence.map(resolve) }
        : null,
    };
  });

  const present = {
    what: Boolean(what.issue_class && what.target_page_id),
    why: Boolean(why.verdict && why.detector && why.detector_version),
    evidence: evidence.length > 0 && evidence.every((e) => e.found),
    when: Boolean(when.opened_at),
    changedBy: changedBy.length > 0 && changedBy.every((c) => c.action && c.reason && c.evidence.length && c.evidence.every((e) => e.found)),
  };
  return { issue_id: issueId, state: entry.state, copies: entry.copies, what, why, evidence, when, changedBy, present };
}
