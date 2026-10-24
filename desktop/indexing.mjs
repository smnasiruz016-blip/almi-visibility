/**
 * 🔴 RR-322 C3 · INDEXING AND RANKING, THE MARKET'S WAY (owner, 24 Oct 2026) — from the client's own Search Console (read-only):
 *   · the MONDAY REPORT: of the pages made live, how many Google has indexed, "crawled — not indexed", "discovered — not indexed"
 *     (its URL Inspection, one request per page, its own words for each state);
 *   · BATCHES 25 → 50 → 100 → 200 …: the next batch only when the last one is 80% indexed within 4 weeks; below 70% at 4 weeks: STOP and
 *     say why (the pages that are not indexed, and their state);
 *   · IMPROVE BEFORE EXPAND: before a new batch, the 20 pages with the most impressions and the lowest click rate (their titles), and the 20
 *     made pages with no impression at all (their data);
 *   · REFRESH every 3 months; HERO pages (position 15–30 with a click rate above 3%) strengthened first.
 * Nothing here promises a ranking; every number is Google's own. Pure.
 */
export const INDEX_RULE = Object.freeze({ weeks: 4, next: 0.8, stop: 0.7, improve: 20, refreshDays: 90, hero: { from: 15, to: 30, ctr: 0.03 } });
const DAY = 864e5;

/** Google's URL Inspection answer → one of: indexed · crawled-not-indexed · discovered-not-indexed · other (its own state in words) */
export function stateOf(inspection) {
  const s = String(inspection?.inspectionResult?.indexStatusResult?.coverageState ?? inspection?.coverageState ?? "");
  if (/submitted and indexed|indexed, not submitted|^indexed/i.test(s) && !/not indexed/i.test(s)) return "indexed";
  if (/crawled - currently not indexed|crawled — currently not indexed/i.test(s)) return "crawled-not-indexed";
  if (/discovered - currently not indexed|discovered — currently not indexed/i.test(s)) return "discovered-not-indexed";
  return s ? "other" : "unknown";
}
/** the Monday report over the live pages: counts per state, and each page's state */
export function mondayReport(results, { on }) {
  const per = { indexed: 0, "crawled-not-indexed": 0, "discovered-not-indexed": 0, other: 0, unknown: 0 };
  const pages = results.map((r) => { const st = stateOf(r.inspection); per[st]++; return { url: r.url, state: st, google: r.inspection?.inspectionResult?.indexStatusResult?.coverageState ?? null }; });
  return { on, pages, per, line: results.length ? `${on}: of ${results.length} live pages, Google has indexed ${per.indexed}; crawled but not indexed ${per["crawled-not-indexed"]}; discovered but not indexed ${per["discovered-not-indexed"]}${per.other + per.unknown ? `; other ${per.other + per.unknown}` : ""}.` : `${on}: no page is live yet — nothing for Google to index.` };
}
/** may the next batch be made? `last` = { made: ISO date, urls }; `states` = url → state */
export function nextBatch(last, states, { on }) {
  if (!last?.urls?.length) return { allowed: true, why: "the first batch" };
  const weeks = (Date.parse(on) - Date.parse(last.made)) / (7 * DAY), indexed = last.urls.filter((u) => states[u] === "indexed").length, share = indexed / last.urls.length;
  const not = last.urls.filter((u) => states[u] !== "indexed").map((u) => ({ url: u, state: states[u] ?? "not inspected" }));
  if (share >= INDEX_RULE.next && weeks <= INDEX_RULE.weeks + 0.01) return { allowed: true, share, why: `${Math.round(share * 100)}% of the last batch indexed within ${Math.ceil(weeks)} week${Math.ceil(weeks) === 1 ? "" : "s"} — the next batch can be made` };
  if (weeks >= INDEX_RULE.weeks && share < INDEX_RULE.stop) return { allowed: false, stop: true, share, not, why: `STOP: ${Math.round(share * 100)}% of the last batch indexed after ${INDEX_RULE.weeks} weeks (below ${INDEX_RULE.stop * 100}%) — no new batch until the reason is fixed; the pages not indexed and their state are listed` };
  if (share >= INDEX_RULE.next) return { allowed: true, share, why: `${Math.round(share * 100)}% indexed (after ${Math.ceil(weeks)} weeks)` };
  return { allowed: false, share, not, why: `${Math.round(share * 100)}% of the last batch indexed after ${Math.max(0, Math.floor(weeks))} week${Math.floor(weeks) === 1 ? "" : "s"} — the next batch waits for ${INDEX_RULE.next * 100}%` };
}
/** per page (Search Console's page rows summed over the window) → the work before a new batch, and the hero pages */
export function beforeExpand(rows, madeUrls = []) {
  const by = new Map();
  for (const r of rows) { const x = by.get(r.page) ?? { page: r.page, clicks: 0, impressions: 0, weighted: 0 }; x.clicks += r.clicks ?? 0; x.impressions += r.impressions ?? 0; x.weighted += (r.position ?? 0) * Math.max(1, r.impressions ?? 0); by.set(r.page, x); }
  const pages = [...by.values()].map((x) => ({ ...x, ctr: x.impressions ? x.clicks / x.impressions : 0, position: x.impressions ? Math.round((x.weighted / x.impressions) * 10) / 10 : null }));
  const titles = pages.filter((p) => p.impressions > 0).sort((a, b) => b.impressions - a.impressions || a.ctr - b.ctr).slice(0, INDEX_RULE.improve * 2).sort((a, b) => a.ctr - b.ctr).slice(0, INDEX_RULE.improve);
  const seen = new Set(pages.filter((p) => p.impressions > 0).map((p) => p.page)), zero = madeUrls.filter((u) => !seen.has(u)).slice(0, INDEX_RULE.improve);
  const heroes = pages.filter((p) => p.position >= INDEX_RULE.hero.from && p.position <= INDEX_RULE.hero.to && p.ctr > INDEX_RULE.hero.ctr).sort((a, b) => b.ctr - a.ctr);
  return { titles: titles.map((p) => ({ page: p.page, why: `${p.impressions} impressions, ${(p.ctr * 100).toFixed(1)}% clicked — improve its title` })), enrich: zero.map((u) => ({ page: u, why: "no impression yet — add data to it" })), heroes: heroes.map((p) => ({ page: p.page, why: `position ${p.position}, ${(p.ctr * 100).toFixed(1)}% clicked — strengthen it first` })), done: titles.length === 0 && zero.length === 0 };
}
/** made pages whose facts were last checked more than 3 months ago → refresh them */
export const refreshDue = (pages, { on }) => pages.filter((p) => p.lastChecked && (Date.parse(on) - Date.parse(p.lastChecked)) / DAY > INDEX_RULE.refreshDays).map((p) => ({ name: p.title, why: `last checked ${p.lastChecked}, more than ${INDEX_RULE.refreshDays} days ago` }));
