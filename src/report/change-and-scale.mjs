/**
 * 🔴 F30 · F83 · F85 · CHANGES, BEFORE/AFTER AND COHORTS (acceptances _handoffs AlmiVisibility_F30/F83/F85_ACCEPTANCE_2026-10-19.md, RR-291).
 *
 *   F30 · a re-run of a declared check against the LAST stored run of the same check: added, removed and changed items, each named with the
 *         fields that changed under one RECORDED rule (CHANGE_RULE); unchanged items are suppressed, counted only. One run alone claims no change
 *         (the owner, RR-137: "DO NOT CLAIM A SECOND OBSERVATION EXISTS IF IT DOES NOT").
 *   F83 · a before and an after value, each with its date, paired; the wording says "before … after", never "caused", unless a control group
 *         is recorded beside them.
 *   F85 · the next cohort is refused while the last cohort's threshold is unmet; a failed cohort sets PAUSED.
 * Pure. Generic: it names no client, product or host.
 */
export const CHANGE_RULE = Object.freeze({ id: "F30-R1", fields: Object.freeze(["status", "final_url", "content_sha256"]), words: "an item changed when its status, its final address or the SHA-256 of its body differs between the two runs" });

/** One crawl observation's comparable fields. */
export const crawlItem = (o) => ({ key: o?.target?.ref ?? o?.value?.requested_url ?? null, at: o?.observed_at ?? null, status: o?.value?.status ?? null, final_url: o?.value?.final_url ?? null, content_sha256: o?.content_sha256 ?? null });

/** F30 · current run against the last stored run of the same check. */
export function diffRuns(previous, current, { rule = CHANGE_RULE } = {}) {
  if (!Array.isArray(previous) || previous.length === 0) return Object.freeze({ state: "NO_PREVIOUS_RUN", claim: "no change is claimed: there is one run only", added: [], removed: [], changed: [], unchanged: 0 });
  const prev = new Map(previous.filter((i) => i.key).map((i) => [i.key, i])), cur = new Map(current.filter((i) => i.key).map((i) => [i.key, i]));
  const added = [...cur.keys()].filter((k) => !prev.has(k)).sort();
  const removed = [...prev.keys()].filter((k) => !cur.has(k)).sort();
  const changed = [], same = [];
  for (const k of [...cur.keys()].filter((x) => prev.has(x)).sort()) {
    const fields = rule.fields.filter((f) => (prev.get(k)[f] ?? null) !== (cur.get(k)[f] ?? null));
    if (fields.length) changed.push(Object.freeze({ key: k, fields, before: Object.fromEntries(fields.map((f) => [f, prev.get(k)[f]])), after: Object.fromEntries(fields.map((f) => [f, cur.get(k)[f]])) }));
    else same.push(k);
  }
  return Object.freeze({ state: "COMPARED", rule: rule.id, ruleWords: rule.words, added, removed, changed, unchanged: same.length });
}

/** F83 · a before/after pair, dated, worded without cause unless a control group is recorded. */
export function beforeAfter({ metric, before, after, control = null }) {
  for (const [w, v] of [["before", before], ["after", after]]) if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v.date ?? "") || typeof v.value !== "number") return Object.freeze({ state: "REFUSED", reason: `the ${w} value needs a number and its date` });
  const causal = control && typeof control.before === "number" && typeof control.after === "number";
  const line = causal
    ? `${metric}: ${before.value} on ${before.date} → ${after.value} on ${after.date}; the control group moved ${control.before} → ${control.after} — the difference between the two is the measured effect`
    : `${metric}: ${before.value} on ${before.date} → ${after.value} on ${after.date} — before and after only; no control group, so no cause is claimed`;
  return Object.freeze({ state: "PAIRED", delta: after.value - before.value, line });
}
/** F83 C2 · the wording law over printed lines: "caused" (or "because of", "led to", "resulted in") only beside a control group. */
export const CAUSE_WORDS = /\b(caused|causes|because of|led to|resulted in|due to)\b/i;
export const causeClaimsWithoutControl = (lines) => lines.filter((l) => CAUSE_WORDS.test(l) && !/control group moved/.test(l));

/** F85 · whether a next cohort may start, from the cohort records: the last cohort's outcome against its own threshold. */
export function nextCohort(cohorts) {
  const last = [...(cohorts ?? [])].sort((a, b) => String(a.startedOn).localeCompare(String(b.startedOn))).pop();
  if (!last) return Object.freeze({ state: "MAY_START", reason: "no earlier cohort" });
  if (typeof last.threshold !== "number" || typeof last.result !== "number") return Object.freeze({ state: "REFUSED", reason: `the last cohort (${last.cohortId}) has no measured result against its threshold` });
  if (last.result < last.threshold) return Object.freeze({ state: "PAUSED", reason: `the last cohort (${last.cohortId}) failed: ${last.result} < ${last.threshold}`, cohort: last.cohortId });
  return Object.freeze({ state: "MAY_START", reason: `the last cohort (${last.cohortId}) met its threshold: ${last.result} ≥ ${last.threshold}` });
}
