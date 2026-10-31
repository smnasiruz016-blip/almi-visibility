/**
 * 🔴 RR-353 (owner, 31 Oct 2026: "setup step 4/9 — add the Bing option, next to Google Search Console") · BING WEBMASTER TOOLS.
 *   · The searches people make in Bing before they reach the client's site: Bing Webmaster Tools' own query statistics, read through the
 *     client's OWN Bing Webmaster API key (Bing → Settings → API access). The key is kept in Windows' secure store; it goes only to Bing.
 *   · Or Bing's own download file (Search Performance → Export) — read by the search-data file reader, which already knows its columns.
 *   · Every search keeps its source: "your Bing Webmaster Tools: seen N times in Bing". Nothing is guessed when Bing gives no number.
 * Bing's API: GET https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=…&apikey=… → { d: [{ Query, Impressions, Clicks, Date,
 * AvgImpressionPosition, AvgClickPosition }] } (one row per query and week). Not yet tried against a live Bing account by AlmiWorld.
 */
export const BING_API = "https://ssl.bing.com/webmaster/api.svc/json/";
export const BING_KEY_PREFIX = "BING_WEBMASTER_KEY";
export const bingKeyName = (id) => `${BING_KEY_PREFIX}_${String(id).toUpperCase().replace(/[^A-Z0-9]/g, "_")}`.slice(0, 64);
export const BING_HOWTO = Object.freeze([
  "Open bing.com/webmasters and sign in (a Microsoft account). Your site not there yet? Press \"Import from Google Search Console\" — it adds your site and proves it is yours in one step — or add it by hand.",
  "Click the gear (Settings) at the top right → API access → API Key → Generate. Copy the key.",
  "Paste it here and press Connect Bing. Visibility reads your searches from Bing; the key is kept safely on this computer and goes only to Bing.",
  "No key? Download the file instead: Search Performance → Export (CSV), then add it with \"Add Bing's download\".",
]);
/** one-time guided step for Bing Webmaster Tools (the sitemap and IndexNow) — shown on the Search engines screen */
export const BING_SETUP_STEPS = Object.freeze([
  "Open bing.com/webmasters → \"Import from Google Search Console\" (fastest — your site and its sitemap come over at once), or add your site by hand.",
  "Sitemaps → Submit sitemap → your site's address followed by /sitemap.xml (Visibility shows yours below).",
  "IndexNow: put your key file on your site (shown below), then press \"Check my key file\" — after that every page Visibility publishes is sent to Bing at once.",
]);

const dateOf = (d) => { const m = /\/Date\((\d+)/.exec(String(d ?? "")); return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : null; };

/** Bing's rows → one line per search: its impressions and clicks added up, the weeks it covers */
export function bingRows(body) {
  const rows = Array.isArray(body?.d) ? body.d : [];
  const by = new Map();
  for (const r of rows) {
    const q = String(r?.Query ?? "").replace(/\s+/g, " ").trim(); if (!q) continue;
    const x = by.get(q.toLowerCase()) ?? { query: q, impressions: 0, clicks: 0, from: null, to: null };
    x.impressions += Number.isFinite(Number(r.Impressions)) ? Number(r.Impressions) : 0;
    x.clicks += Number.isFinite(Number(r.Clicks)) ? Number(r.Clicks) : 0;
    const d = dateOf(r.Date); if (d) { x.from = !x.from || d < x.from ? d : x.from; x.to = !x.to || d > x.to ? d : x.to; }
    by.set(q.toLowerCase(), x);
  }
  return [...by.values()].sort((a, b) => b.impressions - a.impressions);
}

/** the searches as the product's phrases (phrases.json's shape), each with its own Bing source */
export const bingPhrases = (rows, on) => rows.filter((r) => r.impressions > 0).map((r) => ({ text: r.query, kind: "bing", place: null, date: on, volume: r.impressions, source: `your Bing Webmaster Tools: seen ${r.impressions} time${r.impressions === 1 ? "" : "s"} in Bing${r.from && r.to ? ` (${r.from} – ${r.to})` : ""}` }));

/** read the site's searches from Bing with the client's own key → { ok, rows, line } | { ok: false, why } */
export async function bingQueries({ site, key, fetchImpl = fetch, base = BING_API }) {
  if (!String(key ?? "").trim()) return { ok: false, why: "Paste your Bing Webmaster API key first." };
  let siteUrl; try { siteUrl = new URL(site).origin + "/"; } catch { return { ok: false, why: "Your product has no website address yet." }; }
  let r, body;
  try { r = await fetchImpl(`${base}GetQueryStats?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${encodeURIComponent(String(key).trim())}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30000) }); body = await r.json().catch(() => null); }
  catch { return { ok: false, why: "Bing did not answer — check the internet connection and try again." }; }
  if (r.status === 401 || r.status === 403) return { ok: false, why: "Bing refused the key — copy it again from Bing Webmaster Tools (Settings → API access)." };
  if (!r.ok) return { ok: false, why: `Bing answered with an error (${r.status}). Is ${siteUrl} added in your Bing Webmaster Tools?${body?.Message ? ` Bing said: ${String(body.Message).slice(0, 160)}` : ""}` };
  const rows = bingRows(body);
  return { ok: true, rows, line: rows.length ? `${rows.length} search${rows.length === 1 ? "" : "es"} read from your Bing Webmaster Tools.` : "Connected ✓ — Bing has no searches for your site yet (a new site in Bing takes a few days)." };
}
