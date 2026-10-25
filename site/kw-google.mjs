/**
 * 🔴 RR-326 A · THE SITE'S GOOGLE ADS CONNECTION (server side) — Keyword Planner's own data through KeywordPlanIdeaService, for the OWNER'S
 * Google Ads account, with the AlmiWorld HQ Cloud project's Basic access. Google's rules, read 25 Oct 2026:
 *   · Basic access: 15,000 operations a day (a sliding 24 hours); a request that is not a mutate/search counts ONE operation
 *     (…/api/docs/best-practices/quotas). GenerateKeywordIdeas: 1 request per second per customer id — so every request of every Vercel
 *     instance takes ONE shared slot in the store first (SET NX PX), and is counted in the store before it is sent.
 *   · Developer tokens were sunset on 9 Sep 2026 — optional and ignored; access belongs to the Cloud project that owns the OAuth client
 *     (…/api-policy/developer-token). Known fault: a project upgraded after 9 Sep 2026 may get AUTHORIZATION_ERROR — said in plain words.
 *   · Our own ceilings, well inside Google's: the collector at most one third of the day (5,000), the public finder 2,000, the app's keyword
 *     service 3,000, and everything together at most two thirds (10,000). The owner has no cap of his own — only the total. A refused
 *     request is never sent.
 * Keys by NAME only (the owner puts them in Vercel himself — site/owner-google-sign-in.mjs puts the sign-in there without showing it):
 * GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID (+ GOOGLE_ADS_LOGIN_CUSTOMER_ID for a
 * manager account). Never printed, logged or stored anywhere else.
 */
import { randomBytes } from "node:crypto";
import { ADS_API, ideasRequest, rowsOfIdeas, periodOfRows, errorOf, errorLine } from "../desktop/ads-wire.mjs";

export const ADS_ENV = Object.freeze({ clientId: "GOOGLE_ADS_CLIENT_ID", secret: "GOOGLE_ADS_CLIENT_SECRET", refresh: "GOOGLE_ADS_REFRESH_TOKEN", customer: "GOOGLE_ADS_CUSTOMER_ID", login: "GOOGLE_ADS_LOGIN_CUSTOMER_ID" });
export const QUOTA = Object.freeze({ googleDaily: 15000, ceiling: 10000, collector: 5000, finder: 2000, app: 3000, paceMs: 1100 });
export const ACCESS_LINE = "Google Ads: Basic access — keyword data on";
const digits = (v) => String(v ?? "").replace(/\D/g, "");
const day = (t) => new Date(t).toISOString().slice(0, 10);
const TWO_DAYS = 2 * 86400;

/** what is set (by name) and what is missing — never a value */
export function adsConfigOf(env = process.env) {
  const missing = [ADS_ENV.clientId, ADS_ENV.secret, ADS_ENV.refresh, ADS_ENV.customer].filter((n) => !String(env[n] ?? "").trim());
  if (!missing.length && digits(env[ADS_ENV.customer]).length !== 10) missing.push(`${ADS_ENV.customer} (10 digits)`);
  return { ok: missing.length === 0, missing };
}
/** a refusal in plain words (Google's known AUTHORIZATION_ERROR fault included) */
export function plainError(code) {
  if (code === "AUTHORIZATION_ERROR") return "Google refused the access (AUTHORIZATION_ERROR). Google names a known fault for projects upgraded after 9 Sep 2026 and is rolling out a fix — nothing is wrong on this site. Please try again later.";
  return errorLine(code);
}

/**
 * The connection. kv: the shared store (limits.mjs kvStore). purpose: "collector" | "finder" | "owner" — each has its own daily cap,
 * and all of them together the ceiling. → ideas({ seeds, geo, language, purpose, maxPages, waitMs }) → { ok, rows, period, ops } |
 * { ok: false, code, why, ops }
 */
export function siteAds({ env = process.env, kv, fetchImpl = fetch, now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), caps = {} }) {
  const C = { ...QUOTA, ...caps };
  let access = null;
  const cfg = () => adsConfigOf(env);
  const capOf = (purpose) => (purpose === "collector" ? C.collector : purpose === "finder" ? C.finder : purpose === "app" ? C.app : C.ceiling);
  /** count one operation BEFORE it is sent; refused (and given back) over the purpose's cap or the ceiling */
  const takeOp = async (purpose) => {
    const d = day(now()), all = `av:ads:ops:${d}`, mine = `av:ads:ops:${d}:${purpose}`;
    const [a, , m] = await kv.run([["INCR", all], ["EXPIRE", all, TWO_DAYS], ["INCR", mine], ["EXPIRE", mine, TWO_DAYS]]);
    if (a > C.ceiling || m > capOf(purpose)) { await kv.run([["DECR", all], ["DECR", mine]]); return false; }
    return true;
  };
  /** one request a second across every instance: a slot in the store */
  const slot = async (waitMs) => {
    const id = randomBytes(8).toString("hex"), until = now() + waitMs;
    for (;;) { const [ok] = await kv.run([["SET", "av:ads:slot", id, "NX", "PX", C.paceMs]]); if (ok === "OK") return true; if (now() >= until) return false; await sleep(250); }
  };
  const token = async () => {
    if (access && access.until > now() + 60000) return access.token;
    const r = await fetchImpl(ADS_API.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env[ADS_ENV.clientId], client_secret: env[ADS_ENV.secret], refresh_token: env[ADS_ENV.refresh], grant_type: "refresh_token" }), signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = await r.json(); access = { token: j.access_token, until: now() + (Number(j.expires_in) || 3600) * 1000 }; return access.token;
  };
  const remember = async (code) => { try { await kv.run([["SET", "av:ads:last", JSON.stringify({ code, at: new Date(now()).toISOString() }), "EX", 14 * 86400]]); } catch { /* the owner's page only */ } };
  return Object.freeze({
    configured: () => cfg().ok,
    missing: () => cfg().missing,
    /** today's operations (ours, counted before sending) and the last refusal — for the owner's page */
    async usage() { const d = day(now()); const [a, c, f, o, p, last] = await kv.run([["GET", `av:ads:ops:${d}`], ["GET", `av:ads:ops:${d}:collector`], ["GET", `av:ads:ops:${d}:finder`], ["GET", `av:ads:ops:${d}:owner`], ["GET", `av:ads:ops:${d}:app`], ["GET", "av:ads:last"]]); let l = null; try { l = last ? JSON.parse(last) : null; } catch { l = null; } return { day: d, all: Number(a ?? 0), collector: Number(c ?? 0), finder: Number(f ?? 0), owner: Number(o ?? 0), app: Number(p ?? 0), caps: C, last: l }; },
    async ideas({ seeds, geo = null, language, purpose, maxPages = 1, waitMs = 15000 }) {
      const c = cfg(); if (!c.ok) return { ok: false, code: "NOT_CONNECTED", why: "The keyword finder is not connected to Google yet.", ops: 0 };
      let ops = 0; const rows = []; let pageToken = null;
      for (let i = 0; i < maxPages; i++) {
        if (!(await takeOp(purpose))) return { ok: false, code: "OUR_DAILY_LIMIT", why: "Today's keyword searches are all used. Please try again tomorrow.", ops, rows };
        ops++;
        if (!(await slot(waitMs))) return { ok: false, code: "BUSY", why: "The keyword finder is busy. Please try again in a minute.", ops, rows };
        const t = await token(); if (!t) { await remember("UNAUTHENTICATED"); return { ok: false, code: "UNAUTHENTICATED", why: "The keyword finder's Google sign-in has ended — the owner signs in again.", ops, rows }; }
        const q = ideasRequest({ customerId: env[ADS_ENV.customer], seeds, geo: geo ? [geo] : [], language, pageToken });
        let r, j;
        try {
          r = await fetchImpl(q.url, { method: "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json", ...(digits(env[ADS_ENV.login]).length === 10 ? { "login-customer-id": digits(env[ADS_ENV.login]) } : {}) }, body: JSON.stringify(q.body), signal: AbortSignal.timeout(20000) });
          j = await r.json().catch(() => ({}));
        } catch (e) { return { ok: false, code: e?.name === "TimeoutError" ? "TIMEOUT" : "NO_ANSWER", why: "Google did not answer in time. Please try again.", ops, rows }; }
        if (!r.ok) {
          /* Google's AUTHORIZATION_ERROR is a family (errorCode: { authorizationError: <reason> }) — every reason of it is that error */
          const family = (j?.error?.details ?? []).flatMap((x) => x.errors ?? []).map((x) => Object.keys(x.errorCode ?? {})[0]).find(Boolean);
          const code = family === "authorizationError" ? "AUTHORIZATION_ERROR" : errorOf(j, r.status);
          await remember(code); return { ok: false, code, why: plainError(code), ops, rows };
        }
        rows.push(...rowsOfIdeas(j)); pageToken = j.nextPageToken ?? null; if (!pageToken) break;
      }
      return { ok: true, rows, period: periodOfRows(rows), ops };
    },
  });
}
