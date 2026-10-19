/**
 * 🔴 F15 · SUPPLY / VISIBILITY / DEMAND / NEED — FOUR MEASURES, NEVER BLENDED (acceptance _handoffs AlmiVisibility_F15_ACCEPTANCE_2026-10-19.md,
 * RR-291).
 *
 * Each measure has its own function, reads its own records and keeps its own denominator (C1):
 *   NEED       — the need exists in the batch, with its own answer state (planning_need);
 *   SUPPLY     — whether the client's own pages serve it (the need's latest coverage record: FULL / PARTIAL / NONE);
 *   VISIBILITY — whether the pages that serve it were SHOWN in the client's own Search Console export (impressions in its window);
 *   DEMAND     — how many INDEPENDENT evidence categories show people asking it: STRONG only when at least 3 agree, MONITOR when any
 *                category records the opposite, UNKNOWN when fewer than 3 (C2). A research-derived or AI-suggested wording is not evidence.
 * No function reads another's result, and no line adds them up. Pure.
 *
 * Generic: it names no client, product or host.
 */
export const DEMAND_STATE = Object.freeze({ STRONG: "STRONG", MONITOR: "MONITOR", UNKNOWN: "UNKNOWN" });
export const STRONG_AT = 3;

const latestBy = (rows, key) => { const m = new Map(); for (const r of rows) m.set(r[key], r); return m; };
const tally = (xs) => xs.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});

/** NEED · one per need id: its answer state, or NO_ANSWER_RECORD named. */
export function needMeasure(planningNeeds) {
  const by = latestBy(planningNeeds.filter((r) => r?.needId), "needId");
  const per = [...by.values()].map((r) => ({ needId: r.needId, state: r.answer?.state ?? "NO_ANSWER_RECORD" }));
  return Object.freeze({ measure: "NEED", denominator: per.length, per, counts: tally(per.map((p) => p.state)) });
}

/** SUPPLY · over the needs given: the latest coverage record's value, or NOT MEASURED when none. */
export function supplyMeasure(needIds, coverageRows) {
  const by = latestBy(coverageRows.filter((r) => r?.needId), "needId");
  const per = needIds.map((id) => ({ needId: id, state: by.get(id)?.coverage ?? "NOT MEASURED", pages: (by.get(id)?.pages ?? []).map((p) => p.pageId) }));
  return Object.freeze({ measure: "SUPPLY", denominator: per.length, per, counts: tally(per.map((p) => p.state)) });
}

/** VISIBILITY · over the needs given: impressions of the pages that serve each, in the export's window; no page or no export is NOT MEASURED. */
export function visibilityMeasure(needIds, coverageRows, exportRecord) {
  const pages = latestBy(coverageRows.filter((r) => r?.needId), "needId");
  const shown = new Map((exportRecord?.pages?.urls ?? []).map((u) => [u.url, Number(u.impressions) || 0]));
  const per = needIds.map((id) => {
    const urls = (pages.get(id)?.pages ?? []).map((p) => p.pageId).filter((u) => /^https?:\/\//.test(u));
    if (!exportRecord || urls.length === 0) return { needId: id, state: "NOT MEASURED", impressions: null };
    const n = urls.reduce((s, u) => s + (shown.get(u) ?? 0), 0);
    return { needId: id, state: n > 0 ? "SHOWN" : "NOT SHOWN IN THE WINDOW", impressions: n };
  });
  return Object.freeze({ measure: "VISIBILITY", denominator: per.length, window: exportRecord?.window ?? null, per, counts: tally(per.map((p) => p.state)) });
}

/**
 * DEMAND · per need, its evidence items: { needId, category, polarity: "FOR" | "AGAINST" }. Independent categories FOR are counted once each;
 * any AGAINST makes MONITOR (a conflict); at least STRONG_AT categories FOR with none AGAINST is STRONG; fewer is UNKNOWN — never weak, never 0.
 */
export function demandState(items) {
  const forCats = new Set(items.filter((i) => i.polarity === "FOR").map((i) => i.category));
  const against = items.some((i) => i.polarity === "AGAINST");
  return against && forCats.size > 0 ? DEMAND_STATE.MONITOR : forCats.size >= STRONG_AT && !against ? DEMAND_STATE.STRONG : DEMAND_STATE.UNKNOWN;
}
export function demandMeasure(needIds, evidence) {
  const per = needIds.map((id) => { const items = evidence.filter((e) => e.needId === id); return { needId: id, state: demandState(items), categories: [...new Set(items.filter((i) => i.polarity === "FOR").map((i) => i.category))] }; });
  return Object.freeze({ measure: "DEMAND", denominator: per.length, per, counts: tally(per.map((p) => p.state)), categoriesPerNeed: tally(per.map((p) => p.categories.length)) });
}

/**
 * The demand evidence a batch holds for its needs: an OBSERVED public question drawn into a need is PUBLIC_QUESTION; a recorded join of the
 * client's own Search Console query to a page that serves the need is SEARCH_CONSOLE. A research-derived wording is not evidence (it is
 * counted apart, by the caller).
 */
export function demandEvidenceOf({ demandRows, coverageRows, joins }) {
  const out = [];
  for (const r of demandRows) if (r?.needId && r.tier === "OBSERVED") out.push({ needId: r.needId, category: "PUBLIC_QUESTION", polarity: "FOR", ref: r.measurement_key });
  const pagesOf = latestBy(coverageRows.filter((r) => r?.needId), "needId");
  for (const [needId, c] of pagesOf) for (const j of joins ?? []) if ((c.pages ?? []).some((p) => p.pageId === j.page)) out.push({ needId, category: "SEARCH_CONSOLE", polarity: "FOR", ref: j.inputId });
  return out;
}
