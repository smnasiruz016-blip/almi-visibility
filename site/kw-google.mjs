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
export const CHECK = Object.freeze({ accounts: 5, managers: 3 }); // the owner's access check reads at most this many reachable accounts / managers
export const ACCESS_LINE ="Google Ads: Basic access — keyword data on";
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
 * 🔴 RR-326 H · GOOGLE'S OWN REASON, KEPT — an AUTHORIZATION_ERROR is a family (errorCode: { authorizationError: <reason> }); the reason
 * and Google's message say WHICH account, permission or project is refused. Kept for the owner's page only. Google's message names ids
 * and policies, never a key; anything that looks like a key (a long unbroken run of letters and digits) is cut out all the same.
 */
const scrub = (s) => String(s ?? "").replace(/[A-Za-z0-9_\-.\/+=]{40,}/g, "[cut]").replace(/\s+/g, " ").trim().slice(0, 400);
export function failureOf(body, status = 0) {
  const errs = (body?.error?.details ?? []).flatMap((x) => x.errors ?? []), first = errs.find((x) => x.errorCode) ?? null;
  const [family, reason] = first ? Object.entries(first.errorCode)[0] : [null, null];
  const requestId = (body?.error?.details ?? []).map((x) => x.requestId).find(Boolean) ?? null;
  return { code: family === "authorizationError" ? "AUTHORIZATION_ERROR" : errorOf(body, status), family, reason: reason ?? null, message: scrub(first?.message ?? body?.error?.message ?? ""), requestId: requestId ? scrub(requestId) : null, status };
}
/** what Google's reason means, and what the owner does — Google's AuthorizationError reasons (v26), the ones a keyword request can meet */
export const REASONS = Object.freeze({
  USER_PERMISSION_DENIED: "The Google account you signed in with cannot reach this Google Ads account. Use a customer ID from the list below — or, if it is reached through a manager account, put that manager's ID in GOOGLE_ADS_LOGIN_CUSTOMER_ID.",
  CUSTOMER_NOT_ENABLED: "This Google Ads account is not active yet: finish its setup in Google Ads (billing, or the first-campaign steps), or use another account.",
  ACTION_NOT_PERMITTED: "The Cloud project's access level does not allow this call. If the project was upgraded to Basic after 9 Sep 2026, this is Google's known fault (a fix is being rolled out).",
  CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION: "Google still treats the Cloud project as Test access — real accounts are refused. If Basic was granted after 9 Sep 2026, this is Google's known fault.",
  DEVELOPER_TOKEN_NOT_APPROVED: "Google still treats the access as a test-only token.",
  DEVELOPER_TOKEN_PROHIBITED: "Google refuses this Cloud project for this account.",
  CUSTOMER_NOT_ALLOWED_FOR_PRODUCTION: "This Google Ads account is a test account seen from a production project (or the other way round).",
  MISSING_TOS: "The Google Ads API terms have not been accepted for this account.",
  MISSING_ACCESS_FOR_CUSTOMER: "This Cloud project has no access to this Google Ads account.",
  ACCESS_DENIED_FOR_ACCOUNT_TYPE: "This kind of Google Ads account cannot use this call.",
  SERVICE_ACCESS_DENIED: "This Cloud project may not use this service.",
});
export const reasonLine = (f) => (f?.reason ? `${f.reason}${REASONS[f.reason] ? ` — ${REASONS[f.reason]}` : ""}` : f?.code ?? "");

/**
 * The connection. kv: the shared store (limits.mjs kvStore). purpose: "collector" | "finder" | "owner" — each has its own daily cap,
 * and all of them together the ceiling. → ideas({ seeds, geo, language, purpose, maxPages, waitMs }) → { ok, rows, period, ops } |
 * { ok: false, code, why, ops }
 */
export function siteAds({ env = process.env, kv, fetchImpl = fetch, now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), caps = {} }) {
  const C = { ...QUOTA, ...caps };
  let access = null, tokenError = null;
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
    if (!r.ok) { const e = await r.json().catch(() => ({})); tokenError = { code: "UNAUTHENTICATED", reason: scrub(e.error ?? `HTTP_${r.status}`).slice(0, 60), message: scrub(e.error_description ?? "") }; return null; }
    const j = await r.json(); tokenError = null; access = { token: j.access_token, until: now() + (Number(j.expires_in) || 3600) * 1000 }; return access.token;
  };
  const remember = async (code, f = null) => { try { await kv.run([["SET", "av:ads:last", JSON.stringify({ code, ...(f ? { reason: f.reason, message: f.message, requestId: f.requestId } : {}), at: new Date(now()).toISOString() }), "EX", 14 * 86400]]); } catch { /* the owner's page only */ } };
  const headersOf = (t, login) => ({ authorization: `Bearer ${t}`, "content-type": "application/json", ...(digits(login).length === 10 ? { "login-customer-id": digits(login) } : {}) });
  /** one owner request for the check: counted, paced, answered as { ok, j } | { ok: false, f } */
  const ask = async (t, url, { body = null, login = null } = {}) => {
    if (!(await takeOp("owner"))) return { ok: false, f: { code: "OUR_DAILY_LIMIT", reason: null, message: "Today's operations are all used." } };
    if (!(await slot(15000))) return { ok: false, f: { code: "BUSY", reason: null, message: "Busy — try again in a minute." } };
    try {
      const r = await fetchImpl(url, { method: body ? "POST" : "GET", headers: headersOf(t, login), ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
      const j = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, j } : { ok: false, f: failureOf(j, r.status) };
    } catch (e) { return { ok: false, f: { code: e?.name === "TimeoutError" ? "TIMEOUT" : "NO_ANSWER", reason: null, message: "Google did not answer in time." } }; }
  };
  const search = (t, id, query, login) => ask(t, `${ADS_API.base}/${ADS_API.version}/customers/${digits(id)}/googleAds:search`, { body: { query }, login });
  return Object.freeze({
    configured: () => cfg().ok,
    missing: () => cfg().missing,
    /** today's operations (ours, counted before sending) and the last refusal — for the owner's page */
    async usage() { const d = day(now()); const [a, c, f, o, p, last] = await kv.run([["GET", `av:ads:ops:${d}`], ["GET", `av:ads:ops:${d}:collector`], ["GET", `av:ads:ops:${d}:finder`], ["GET", `av:ads:ops:${d}:owner`], ["GET", `av:ads:ops:${d}:app`], ["GET", "av:ads:last"]]); let l = null; try { l = last ? JSON.parse(last) : null; } catch { l = null; } return { day: d, all: Number(a ?? 0), collector: Number(c ?? 0), finder: Number(f ?? 0), owner: Number(o ?? 0), app: Number(p ?? 0), caps: C, last: l }; },
    /**
     * 🔴 RR-326 H · THE OWNER'S ACCESS CHECK (the owner presses it; at most 1 + CHECK.accounts + 1 + CHECK.managers + 1 operations, counted as his):
     *   1. the sign-in (Google's token answer: its error NAME only), 2. the Google Ads accounts this sign-in reaches (ids only —
     *   customers:listAccessibleCustomers), 3. the configured account: manager or normal, test or real, its status, 4. for each reachable
     *   MANAGER account (at most CHECK.managers), the accounts under it — so an id reached only through a manager is found, 5. one tiny
     *   keyword request ("oet", all locations, one page) — Google's own reason if it is refused.
     * → { ok, steps: { signIn, accessible, configured, managers, ideas }, verdict: [plain lines] } — ids and Google's names only, never a key.
     */
    async check() {
      const c = cfg(); if (!c.ok) return { ok: false, verdict: [`Not connected — missing in Vercel: ${c.missing.join(", ")}.`] };
      const want = digits(env[ADS_ENV.customer]), login = digits(env[ADS_ENV.login]).length === 10 ? digits(env[ADS_ENV.login]) : null;
      const out = { ok: true, want, login, steps: {}, verdict: [] };
      const t = await token();
      if (!t) { out.ok = false; out.steps.signIn = tokenError; out.verdict.push(`The Google sign-in is refused (${tokenError?.reason ?? "no answer"}) — run owner-google-sign-in.mjs again in the deploy folder, then redeploy.`); return out; }
      out.steps.signIn = { ok: true };
      const acc = await ask(t, `${ADS_API.base}/${ADS_API.version}/customers:listAccessibleCustomers`);
      if (!acc.ok) { out.ok = false; out.steps.accessible = acc.f; out.verdict.push(`Google refused to list the accounts: ${reasonLine(acc.f)}`); return out; }
      const ids = (acc.j.resourceNames ?? []).map((x) => digits(x)).filter((x) => x.length === 10);
      out.steps.accessible = { ok: true, ids };
      const info = async (id, via) => { const r = await search(t, id, "SELECT customer.id, customer.manager, customer.test_account, customer.status FROM customer", via); const cu = r.ok ? r.j.results?.[0]?.customer ?? null : null; return r.ok ? { ok: true, id, manager: Boolean(cu?.manager), test: Boolean(cu?.testAccount), status: cu?.status ?? "UNKNOWN" } : { ok: false, id, f: r.f }; };
      /* the reachable accounts: which are managers, and what is under each manager (one level) */
      const direct = []; for (const id of ids.slice(0, CHECK.accounts)) direct.push(await info(id, null));
      out.steps.direct = direct;
      const managers = [];
      for (const m of direct.filter((d) => d.ok && d.manager).slice(0, CHECK.managers)) {
        const r = await search(t, m.id, "SELECT customer_client.id, customer_client.manager, customer_client.test_account, customer_client.status, customer_client.level FROM customer_client WHERE customer_client.level = 1", m.id);
        managers.push(r.ok ? { id: m.id, ok: true, clients: (r.j.results ?? []).map((x) => x.customerClient ?? {}).map((x) => ({ id: digits(x.id), manager: Boolean(x.manager), test: Boolean(x.testAccount), status: x.status ?? "UNKNOWN" })) } : { id: m.id, ok: false, f: r.f });
      }
      out.steps.managers = managers;
      const viaManager = managers.find((m) => m.ok && m.clients.some((x) => x.id === want))?.id ?? null;
      const mine = ids.includes(want) ? direct.find((d) => d.id === want) ?? (await info(want, login)) : viaManager ? { ...managers.find((m) => m.id === viaManager).clients.find((x) => x.id === want), ok: true } : null;
      out.steps.configured = { reachable: ids.includes(want) ? "directly" : viaManager ? `through manager ${viaManager}` : "no", info: mine };
      /* one tiny keyword request — Google's own reason when refused */
      const q = ideasRequest({ customerId: want, seeds: ["oet"], geo: [], language: "languageConstants/1000", pageSize: 10 });
      const id = await ask(t, q.url, { body: q.body, login });
      out.steps.ideas = id.ok ? { ok: true, count: (id.j.results ?? []).length } : { ok: false, f: id.f };
      if (!id.ok) await remember(id.f.code, id.f);
      /* the verdict, in order of what to fix first */
      const V = out.verdict;
      if (!ids.includes(want) && !viaManager) V.push(`GOOGLE_ADS_CUSTOMER_ID (${want}) is NOT an account this sign-in reaches. Reachable: ${ids.join(", ") || "none"}. Put one of those in GOOGLE_ADS_CUSTOMER_ID — or sign in again with the Google account that owns ${want}.`);
      else if (viaManager && login !== viaManager) V.push(`${want} is reached only through manager account ${viaManager}: add GOOGLE_ADS_LOGIN_CUSTOMER_ID = ${viaManager} in Vercel (Production), then redeploy.`);
      if (mine?.ok && mine.manager) V.push(`${want} is a MANAGER account. Keyword ideas are asked in a normal (client) account: put a client account's ID in GOOGLE_ADS_CUSTOMER_ID and ${want} in GOOGLE_ADS_LOGIN_CUSTOMER_ID.`);
      if (mine?.ok && mine.status && mine.status !== "ENABLED") V.push(`${want} has status ${mine.status} — Google serves only an ENABLED account. Finish its setup in Google Ads (billing), or use another account.`);
      if (mine?.ok && mine.test) V.push(`${want} is a TEST account — Keyword Planner gives no real search volumes there.`);
      if (mine && !mine.ok) V.push(`Google refused to read ${want}: ${reasonLine(mine.f)}`);
      if (id.ok) V.push(`The keyword request WORKS now (${out.steps.ideas.count} ideas for "oet").`);
      else V.push(`The keyword request is refused: ${reasonLine(id.f)}${id.f.message ? ` Google's message: "${id.f.message}"` : ""}`);
      if (!id.ok && V.length === 1 && [null, "ACTION_NOT_PERMITTED", "CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION", "DEVELOPER_TOKEN_NOT_APPROVED"].includes(id.f.reason)) V.push("The account, the sign-in and the id are all right — what is left is Google's side: the known fault for projects upgraded after 9 Sep 2026 (a fix is being rolled out).");
      out.ok = id.ok; return out;
    },
    async ideas({ seeds, geo = null, language, purpose, maxPages = 1, waitMs = 15000 }) {
      const c = cfg(); if (!c.ok) return { ok: false, code: "NOT_CONNECTED", why: "The keyword finder is not connected to Google yet.", ops: 0 };
      let ops = 0; const rows = []; let pageToken = null;
      for (let i = 0; i < maxPages; i++) {
        if (!(await takeOp(purpose))) return { ok: false, code: "OUR_DAILY_LIMIT", why: "Today's keyword searches are all used. Please try again tomorrow.", ops, rows };
        ops++;
        if (!(await slot(waitMs))) return { ok: false, code: "BUSY", why: "The keyword finder is busy. Please try again in a minute.", ops, rows };
        const t = await token(); if (!t) { await remember("UNAUTHENTICATED", tokenError); return { ok: false, code: "UNAUTHENTICATED", why: "The keyword finder's Google sign-in has ended — the owner signs in again.", ops, rows }; }
        const q = ideasRequest({ customerId: env[ADS_ENV.customer], seeds, geo: geo ? [geo] : [], language, pageToken });
        let r, j;
        try {
          r = await fetchImpl(q.url, { method: "POST", headers: headersOf(t, env[ADS_ENV.login]), body: JSON.stringify(q.body), signal: AbortSignal.timeout(20000) });
          j = await r.json().catch(() => ({}));
        } catch (e) { return { ok: false, code: e?.name === "TimeoutError" ? "TIMEOUT" : "NO_ANSWER", why: "Google did not answer in time. Please try again.", ops, rows }; }
        if (!r.ok) {
          /* Google's AUTHORIZATION_ERROR is a family (errorCode: { authorizationError: <reason> }) — every reason of it is that error; the
             reason and Google's message are kept for the owner's page (RR-326 H) */
          const f = failureOf(j, r.status);
          await remember(f.code, f); return { ok: false, code: f.code, reason: f.reason, why: plainError(f.code), ops, rows };
        }
        rows.push(...rowsOfIdeas(j)); pageToken = j.nextPageToken ?? null; if (!pageToken) break;
      }
      return { ok: true, rows, period: periodOfRows(rows), ops };
    },
  });
}
