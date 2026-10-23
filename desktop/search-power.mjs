/**
 * 🔴 RR-318 D · SEARCH CONSOLE POWER — the client's own free data, read through Google's own Search Console service (desktop/google-connect.mjs
 * performance: per week, each search phrase with the page Google showed, its clicks, impressions and Google's AVERAGE position):
 *   1 RANK TRACKING — every phrase and page, week by week, with its trend (better, worse, the same, new, not seen this week);
 *   2 OPPORTUNITIES — phrases at an average position of 8 to 20 (the bottom of page 1 and page 2), each with what to do and ready text;
 *   3 ALERTS — a phrase that dropped, or a page whose clicks are falling, each with a refresh suggestion for that page;
 *   4 GENERATIVE AI — Search Console's Generative AI performance report (June 2026) is read only if Google's API offers it; today it does not,
 *     said plainly with where to see it.
 * A position is Google's average for the week, never a promise; a week with too few impressions says so. Pure: history in, lines out.
 */
import { asQuestion } from "./seo-pages.mjs";

export const GENAI = Object.freeze({ available: false, line: "Search Console's Generative AI performance report (June 2026) is not yet given by Google to other programs: Google's own reference for reading Search Console data lists only web, image, video, news, Discover and Google News results (last updated 11 Aug 2026). So Visibility cannot read it for you — open it yourself in Search Console → Performance → Generative AI.", sources: ["https://developers.google.com/webmaster-tools/v1/searchanalytics/query", "https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports"], checkedOn: "2026-10-23" });
export const POSITION_NOTE = "Position is Google's own average for that week (1 = the top). It moves day to day, and it is not a promise of where you will be.";
const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const avg = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const pathOf = (u) => { try { const x = new URL(u); return x.pathname === "/" ? x.hostname : x.pathname; } catch { return u; } };

/** Merge a new read into the kept history (each week once; the newest read of a week wins); up to 26 weeks. */
export function mergeHistory(old, read) {
  const weeks = new Map((old?.weeks ?? []).map((w) => [w.to, w]));
  for (const w of read?.weeks ?? []) weeks.set(w.to, w);
  return { kind: "HISTORY", site: read?.site ?? old?.site ?? null, on: read?.on ?? old?.on ?? null, weeks: [...weeks.values()].sort((a, b) => a.to.localeCompare(b.to)).slice(-26) };
}

/** 1 · RANK TRACKING: each phrase + page, its position per week, and the trend. */
export function rankTracking(history) {
  const weeks = history?.weeks ?? [];
  const rows = new Map();
  weeks.forEach((w, i) => { for (const r of w.rows) { const k = `${r.query}\u0000${r.page}`; const x = rows.get(k) ?? { query: r.query, page: r.page, byWeek: Array(weeks.length).fill(null), clicks: 0, impressions: 0 }; x.byWeek[i] = r.position; x.clicks += r.clicks; x.impressions += r.impressions; rows.set(k, x); } });
  const last = weeks.length - 1;
  const out = [...rows.values()].map((x) => {
    const seen = x.byWeek.map((p, i) => [p, i]).filter(([p]) => p !== null);
    const now = x.byWeek[last], before = seen.filter(([, i]) => i < last).at(-1)?.[0] ?? null;
    const trend = now === null ? "not seen this week" : before === null ? (seen.length === 1 ? "new" : "same") : now < before - 0.9 ? "better" : now > before + 0.9 ? "worse" : "same";
    return { ...x, latest: now ?? seen.at(-1)?.[0] ?? null, previous: before, trend, line: `"${x.query}" → ${pathOf(x.page)}: ${now === null ? `not seen this week (last at ${seen.at(-1)?.[0]})` : `position ${now}`}${before !== null && now !== null ? ` (was ${before})` : ""} — ${fmt(x.impressions)} impression${x.impressions === 1 ? "" : "s"}, ${fmt(x.clicks)} click${x.clicks === 1 ? "" : "s"} in ${weeks.length} weeks` };
  });
  return { weeks: weeks.map((w) => ({ from: w.from, to: w.to })), rows: out.sort((a, b) => b.impressions - a.impressions || a.latest - b.latest), note: POSITION_NOTE };
}

/** 2 · OPPORTUNITIES: average position 8–20 over the last 4 weeks — what to do, with ready text. */
export function opportunities(history, { siteName = null } = {}) {
  const t = rankTracking(history), n = t.weeks.length;
  return t.rows.map((x) => ({ x, recent: avg(x.byWeek.slice(Math.max(0, n - 4)).filter((p) => p !== null)) })).filter(({ recent }) => recent !== null && recent >= 8 && recent <= 20).map(({ x, recent }) => {
    const q = asQuestion(x.query), title = siteName && `${q} | ${siteName}`.length <= 60 ? `${q} | ${siteName}` : q;
    return { query: x.query, page: x.page, position: recent, impressions: x.impressions,
      problem: `"${x.query}" — your page ${pathOf(x.page)} is at an average position of ${recent} (the bottom of page 1 or page 2): close, but few people look that far.`,
      solution: `Make ${pathOf(x.page)} answer "${x.query}" directly: put the words in its title and its main heading, and answer it in the first lines — then add a section with what people ask next.`,
      ready: [{ kind: "title", label: "A page title with these words", text: title, for: x.page, source: `the search "${x.query}" in your Search Console` }, { kind: "FAQ answer", label: "A section heading for the answer (write the answer from your official sources)", text: q, for: x.page, source: `the search "${x.query}" in your Search Console` }] };
  });
}

/** 3 · ALERTS: a phrase that dropped 3 places or more, or a page whose clicks fell by half — with a refresh suggestion for that page. */
export function alerts(history) {
  const t = rankTracking(history), n = t.weeks.length, out = [];
  for (const x of t.rows) {
    const now = x.byWeek[n - 1], before = avg(x.byWeek.slice(Math.max(0, n - 4), n - 1).filter((p) => p !== null));
    if (now !== null && before !== null && now - before >= 3) out.push({ kind: "PHRASE_DROP", query: x.query, page: x.page, line: `"${x.query}" dropped from about ${before} to ${now} on ${pathOf(x.page)}.`, refresh: `Refresh ${pathOf(x.page)}: check that its answer to "${x.query}" is still right and dated, open with it, and add what people ask now.` });
  }
  const pages = new Map();
  (history?.weeks ?? []).forEach((w, i) => { for (const r of w.rows) { const p = pages.get(r.page) ?? Array(n).fill(0); p[i] += r.clicks; pages.set(r.page, p); } });
  for (const [page, c] of pages) {
    const recent = c.slice(Math.max(0, n - 4)).reduce((a, b) => a + b, 0), earlier = c.slice(Math.max(0, n - 8), Math.max(0, n - 4)).reduce((a, b) => a + b, 0);
    if (earlier >= 5 && recent < earlier / 2) out.push({ kind: "CLICKS_FALL", page, line: `Clicks on ${pathOf(page)} fell from ${fmt(earlier)} to ${fmt(recent)} (the last 4 weeks against the 4 before).`, refresh: `Refresh ${pathOf(page)}: update its facts and dates, check its title still says what people search, and link to it from your newer pages.` });
  }
  return out;
}

/** Everything for the screen: the tracking, the opportunities, the alerts, the Generative AI line, and how much data there is. */
export function searchPower(history, { siteName = null } = {}) {
  const t = rankTracking(history);
  const total = t.rows.reduce((a, r) => a + r.impressions, 0);
  return { on: history?.on ?? null, weeks: t.weeks, tracking: t, opportunities: opportunities(history, { siteName }), alerts: alerts(history), genai: GENAI,
    thin: total === 0 ? `Google showed none of your pages for a search in these ${t.weeks.length} week${t.weeks.length === 1 ? "" : "s"} — your searches happened earlier, or were too few for Google to report. Positions appear here once people see your pages in search.` : total < 100 ? `Few searches so far: ${fmt(total)} impression${total === 1 ? "" : "s"} in ${t.weeks.length} week${t.weeks.length === 1 ? "" : "s"}. Positions from so few searches move a lot — read the trend, not one week.` : null };
}
