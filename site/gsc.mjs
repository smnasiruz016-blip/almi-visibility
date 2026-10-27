/**
 * 🔴 RR-331 · OUR OWN SEARCH CONSOLE (owner decision 27 Oct 2026): the searches people use to reach every AlmiWorld site we own, from
 * Google's official Search Console API with the READ-ONLY scope (webmasters.readonly) — the same sign-in the owner gave for Google Ads
 * (site/owner-google-sign-in.mjs now asks for both; GOOGLE_ADS_CLIENT_ID / _SECRET / _REFRESH_TOKEN, never printed).
 *   · every property of the sign-in that is an almiworld.com site (a domain property or a site), its last 28 days of final data;
 *   · each search's site → its product (almioet.almiworld.com → AlmiOET …), its country (Search Console's ISO 3166 alpha-3);
 *   · a search that asks something → the Questions collector (cf_question, source "gsc", with its clicks and impressions);
 *   · every other search → the keyword database, labelled "our Search Console" (its own language code "gsc", so it never mixes with
 *     Google Ads' figures; its number is Search Console's impressions in those 28 days, said so in its period).
 * Weekly (Vercel Cron → /cron/search-console; at most one read in 7 days). Nothing is written to Search Console.
 */
import { ADS_ENV } from "./kw-google.mjs";
import { ADS_API } from "../desktop/ads-wire.mjs";
import { countryOfCode } from "../desktop/world.mjs";
import { isQuestionForm } from "../desktop/real-questions.mjs";
import { LOCATIONS } from "./kw-seeds.mjs";

export const GSC = Object.freeze({ api: "https://www.googleapis.com/webmasters/v3", scope: "https://www.googleapis.com/auth/webmasters.readonly", days: 28, lagDays: 3, rowLimit: 25000, maxPages: 2, everyDays: 7, ours: /(^|\.)almiworld\.com\/?$|almiworld\.com/ });
/* a site's product (its subdomain: almi<name>.almiworld.com) */
const NAME_KEY = { job: "jobs" };
export function productOfHost(host) { const m = /^almi([a-z]+)\.almiworld\.com$/.exec(String(host ?? "").toLowerCase().replace(/^www\./, "")); return m ? NAME_KEY[m[1]] ?? m[1] : null; }
const dayBefore = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) - n * 864e5).toISOString().slice(0, 10);
export const gscConfigured = (env = process.env) => [ADS_ENV.clientId, ADS_ENV.secret, ADS_ENV.refresh].every((k) => String(env[k] ?? "").length > 10);

/** one read → { ok, why?, sites, rows, questions, keywords, skipped } */
export async function runSearchConsole({ env = process.env, kv = null, kwStore = null, cfStore = null, fetchImpl = fetch, now = () => Date.now(), force = false }) {
  const today = new Date(now()).toISOString().slice(0, 10), at = new Date(now()).toISOString();
  const remember = async (o) => { if (kv) try { await kv.run([["SET", "av:gsc:last", JSON.stringify({ at, ...o }), "EX", 60 * 86400]]); } catch { /* the owner's page only */ } return o; };
  if (!gscConfigured(env)) return { ok: false, why: "Not connected — the Google sign-in is not in Vercel yet." };
  if (!force && kv) { try { const [l] = await kv.run([["GET", "av:gsc:last"]]); const last = l ? JSON.parse(l) : null; if (last?.ok && Date.parse(today) - Date.parse(last.at.slice(0, 10)) < GSC.everyDays * 864e5) return { ok: true, skipped: true, why: `Read on ${last.at.slice(0, 10)} — again after ${GSC.everyDays} days.` }; } catch { /* read now */ } }
  const t = await fetchImpl(ADS_API.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env[ADS_ENV.clientId], client_secret: env[ADS_ENV.secret], refresh_token: env[ADS_ENV.refresh], grant_type: "refresh_token" }), signal: AbortSignal.timeout(10000) });
  const tj = await t.json().catch(() => ({}));
  if (!t.ok || !tj.access_token) return remember({ ok: false, why: `Google did not accept the sign-in (${String(tj.error ?? t.status).slice(0, 40)}) — run the sign-in script again.` });
  if (tj.scope && !String(tj.scope).split(" ").includes(GSC.scope)) return remember({ ok: false, why: "The sign-in has no Search Console access yet — run the sign-in script again (it now asks for Search Console, read only), then redeploy." });
  const get = async (path, body = null) => { const r = await fetchImpl(`${GSC.api}${path}`, { method: body ? "POST" : "GET", headers: { authorization: `Bearer ${tj.access_token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) }); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, j }; };
  const s = await get("/sites");
  if (!s.ok) return remember({ ok: false, why: s.status === 403 ? "Search Console refused (403): the sign-in has no Search Console access, or the API is not switched on in the Google Cloud project." : `Search Console answered ${s.status}.` });
  const sites = (s.j.siteEntry ?? []).filter((e) => GSC.ours.test(e.siteUrl) && e.permissionLevel !== "siteUnverifiedUser").map((e) => e.siteUrl);
  const endDate = dayBefore(today, GSC.lagDays), startDate = dayBefore(endDate, GSC.days - 1), period = `Search Console impressions, ${startDate}..${endDate}`;
  const q = new Map(), k = new Map(); let rows = 0;
  for (const site of sites) for (let page = 0; page < GSC.maxPages; page++) {
    const r = await get(`/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { startDate, endDate, dimensions: ["query", "country", "page"], rowLimit: GSC.rowLimit, startRow: page * GSC.rowLimit, dataState: "final" });
    if (!r.ok) break;
    const rs = r.j.rows ?? []; rows += rs.length;
    for (const x of rs) {
      const [text, cc, url] = x.keys ?? []; let host = null; try { host = new URL(url).hostname; } catch { continue; }
      const product = productOfHost(host); if (!product || !text) continue;
      const country = countryOfCode(cc) ?? null, impressions = Math.round(Number(x.impressions ?? 0)), clicks = Math.round(Number(x.clicks ?? 0));
      const add = (m, key, v) => { const o = m.get(key); if (o) { o.impressions += v.impressions; o.clicks += v.clicks; } else m.set(key, v); };
      if (country && isQuestionForm(text)) add(q, `${product}|${country}|${text}`, { product, country, text, impressions, clicks, ref: host });
      else add(k, `${host}|${country ?? "ALL"}|${text}`, { host, product, country, text, impressions });
    }
    if (rs.length < GSC.rowLimit) break;
  }
  /* the questions, per (product, country) */
  const byPc = new Map(); for (const v of q.values()) { const key = `${v.product}|${v.country}`; (byPc.get(key) ?? byPc.set(key, []).get(key)).push(v); }
  let questions = 0;
  if (cfStore) for (const [key, items] of byPc) { const [product, country] = key.split("|"); await cfStore.putQuestions({ product, country, source: "gsc", items: items.map((v) => ({ text: v.text, ref: v.ref, clicks: v.clicks, impressions: v.impressions })), at }); questions += items.length;
    /* RR-333: new questions make that country's questions due at the next run */
    await cfStore.setTask(country, product === "oet" ? "questions" : `${product}:questions`, { day: today, state: "retry", note: "new questions from our Search Console" }); }
  /* the rest, per (site, location) — the keyword database's own label "our Search Console" */
  const byHl = new Map(); for (const v of k.values()) { const loc = LOCATIONS.find((l) => l.name === v.country)?.code ?? "ALL", key = `${v.host}|${loc}`; (byHl.get(key) ?? byHl.set(key, { host: v.host, product: v.product, loc, rows: [] }).get(key)).rows.push({ text: v.text, said: v.impressions }); }
  let keywords = 0;
  if (kwStore) for (const x of byHl.values()) { const r = await kwStore.saveFetch({ kind: "gsc", group: `our Search Console · ${x.product}`, seedKey: `gsc:${x.host}`, location: x.loc, language: "gsc", day: today, at, period, ops: 1, rows: x.rows }); keywords += r.stored ?? 0; }
  return remember({ ok: true, sites: sites.length, rows, questions, keywords, period });
}
