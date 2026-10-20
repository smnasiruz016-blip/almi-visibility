/**
 * 🔴 THE MONTHLY CLIENT REPORT (RR-297, item 3). One plain page per product per month, readable on a phone, BAD NEWS FIRST:
 *   1 needs your attention (rechecks blocked or rejected, pages a gate refused, search data not connected);
 *   2 pages and articles made; 3 pages refreshed (what changed); 4 search data from the client's connected source (Search Console:
 *     impressions, clicks, top pages and queries) — or NOT CONNECTED, never zero; 5 next month's planned topics.
 * It promises no ranking or result. Pure: it renders from records handed in; nothing is fetched or sent. Generic: no client is named.
 */
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const NOT_CONNECTED = "NOT CONNECTED — no Search Console is connected for this product, so there are no search numbers (this is not zero)";

/** The search part from a stored Search Console export record (and its recorded query phrases), or NOT CONNECTED. */
export function searchFromExport(exportRecord, phrases = []) {
  if (!exportRecord || exportRecord.record_type !== "search_console_export") return Object.freeze({ connected: false, line: NOT_CONNECTED });
  const top = [...(exportRecord.pages?.urls ?? [])].sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks).slice(0, 5);
  return Object.freeze({ connected: true, source: exportRecord.source, window: exportRecord.window, clicks: exportRecord.totals?.clicks ?? null, impressions: exportRecord.totals?.impressions ?? null,
    topPages: Object.freeze(top), topQueries: Object.freeze(phrases.filter((p) => p.source === "SEARCH_CONSOLE").slice(0, 5).map((p) => p.phrase)),
    queryNumbers: "the export records the queries' words; its per-query numbers are not in the stored record" });
}

/** The report: { product, month, made: { pages: [{url,title}], articles: [{url,question,day}] }, refresh: { notes, reported }, refused: [lines], search, nextTopics: [questions] } */
export function monthlyReport({ product, month, made = { pages: [], articles: [] }, refresh = { notes: [], reported: [] }, refused = [], search = null, nextTopics = [] }) {
  const s = search ?? { connected: false, line: NOT_CONNECTED };
  /* a long list is counted by its reason, so a phone page stays readable — every one is still counted, none dropped */
  const rep = refresh.reported;
  const repLines = rep.length <= 5 ? rep.map((r) => r.line) : Object.entries(rep.reduce((m, r) => ((m[`${r.state}${r.reason ? ` (${r.reason})` : ""}`] = (m[`${r.state}${r.reason ? ` (${r.reason})` : ""}`] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} source recheck(s) ${k} — no page was changed`);
  const attention = [...repLines, ...refused, ...(s.connected ? [] : [s.line])];
  const sections = [
    ["Needs your attention", attention.length ? attention : ["Nothing needs your attention this month."]],
    ["Made this month", [...made.pages.map((p) => `Page: ${p.title} — ${p.url}`), ...made.articles.map((a) => `Article (${a.day}): ${a.question} — ${a.url}`)].concat(made.pages.length + made.articles.length ? [] : ["No page or article was made this month."])],
    ["Refreshed this month", refresh.notes.length ? refresh.notes : ["No source fact changed, so no page was refreshed."]],
    ["Search (your Search Console)", s.connected ? [`${s.source}: ${s.impressions} impressions, ${s.clicks} clicks over ${s.window?.days} days (${s.window?.from} to ${s.window?.to}).`, ...s.topPages.map((p) => `Top page: ${p.url} — ${p.impressions} impressions, ${p.clicks} clicks`), ...s.topQueries.map((q) => `Query seen: ${q}`), `Note: ${s.queryNumbers}.`] : [s.line]],
    ["Planned for next month", nextTopics.length ? nextTopics.map((q) => `Topic: ${q}`) : ["No unanswered real question is recorded yet — no topic is planned (none is made up)."]],
  ];
  const lines = [`${product} — monthly report, ${month}`, ...sections.flatMap(([h, xs]) => [`## ${h}`, ...xs.map((x) => `- ${x}`)]), "This report states what happened; it promises no ranking or result."];
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(product)} — ${esc(month)}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:16px;max-width:640px;margin:auto;color:#222}h1{font-size:1.3rem}h2{font-size:1.05rem;margin-top:1.4rem;border-bottom:1px solid #ddd}li{margin:.3rem 0;word-break:break-word}.bad{color:#a00}</style></head><body>
<h1>${esc(product)} — monthly report, ${esc(month)}</h1>
${sections.map(([h, xs], i) => `<h2${i === 0 && attention.length ? ' class="bad"' : ""}>${esc(h)}</h2><ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`).join("\n")}
<p><small>This report states what happened; it promises no ranking or result.</small></p></body></html>`;
  return Object.freeze({ lines: Object.freeze(lines), html, attention: attention.length });
}
