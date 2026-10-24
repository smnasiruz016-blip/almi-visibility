/**
 * RR-324 B · THE GOOGLE ADS API CONNECTOR — Keyword Planner's own data (keyword ideas and their search volume) through
 * KeywordPlanIdeaService, READY BUT OFF.
 *   · Google's rules as its own pages state them (read 2026-10-24): developer tokens were sunset on 9 Sep 2026 — access now belongs to the
 *     Google CLOUD PROJECT that owns the OAuth client (developers.google.com/google-ads/api/docs/api-policy/developer-token). Test access
 *     comes with enabling the API (test accounts only); Explorer is applied for in Cloud Console and does NOT allow the planning services
 *     (KeywordPlanIdeaService among them — …/api-policy/access-levels); Basic needs the project's brand verification first.
 *   · The client's OWN Google sign-in, with the client's OWN Cloud project's OAuth client: the owner signs in himself, in his own browser,
 *     on Google's page (never a login form typed by Visibility). Its lasting access is kept in the secure store under its own name, apart
 *     from Search Console's.
 *   · The request and the answer follow Google's documented REST shape (POST …/v26/customers/{id}:generateKeywordIdeas; results[].text,
 *     keywordIdeaMetrics.avgMonthlySearches / monthlySearchVolumes / competition). Results go into the keyword database (keyword-db.mjs),
 *     marked "Google Ads API" — shown as Google's RANGE, never the exact number.
 *   · OFF until the client switches it on; while off, nothing is sent anywhere. Tests use Google's documented answers only.
 */
import { createHash, randomBytes } from "node:crypto";
import { SOURCES } from "./keyword-db.mjs";

export const ADS_API = Object.freeze({ version: "v26", base: "https://googleads.googleapis.com", auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token" });
export const ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
export const ADS_KEYS = Object.freeze({ secret: "GOOGLE_ADS_CLIENT_SECRET", refresh: "GOOGLE_ADS_REFRESH_TOKEN" });
/** the access levels of a Cloud project, as Google names them, and whether each one gives Keyword Planner data */
export const ACCESS = Object.freeze({
  test: Object.freeze({ name: "Test access", keywordData: false, why: "test accounts only" }),
  explorer: Object.freeze({ name: "Explorer access", keywordData: false, why: "Explorer does not allow the planning services (Keyword Planner)" }),
  basic: Object.freeze({ name: "Basic access", keywordData: true, why: null }),
  standard: Object.freeze({ name: "Standard access", keywordData: true, why: null }),
});
const b64url = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const digits = (id) => String(id ?? "").replace(/\D/g, "");

/**
 * the plain line about the client's access, and what to do next. settings: { on, access, applied: [levels applied for, under review],
 * customerId, clientId } — what the client states (Google's API does not report a project's level); lastError: the last refusal's code.
 */
export function adsStatus(settings = {}, { signedIn = false, lastError = null } = {}) {
  const level = ACCESS[settings.access] ? settings.access : "test", L = ACCESS[level];
  const review = (settings.applied ?? []).filter((x) => ACCESS[x] && x !== level).map((x) => `${ACCESS[x].name.replace(/ access$/, "")} under review`);
  const line = `Google Ads API: ${[L.name, ...review].join(", ")}${L.keywordData ? " — keyword data allowed" : "; Basic access needed for keyword data"}.`;
  const next = [];
  if (!L.keywordData) {
    if (level === "test" && !(settings.applied ?? []).includes("explorer")) next.push("In Google Cloud Console, open the Google Ads API's Overview page of your project and apply for Explorer access (you do this yourself).");
    next.push("Basic access gives Keyword Planner's data: first verify your project's brand in Google Cloud Console, then apply for Basic on the same page (you do this yourself).");
  }
  if (!settings.clientId) next.push("Add your Cloud project's sign-in client ID and its secret here (the access level belongs to the project that owns them).");
  if (!settings.customerId) next.push("Add your Google Ads customer ID (10 digits).");
  if (!signedIn) next.push("Sign in to Google Ads yourself (the button opens Google's own page in your browser).");
  if (lastError) next.unshift(`Google's last answer: ${errorLine(lastError)}`);
  const ready = Boolean(settings.on && L.keywordData && settings.clientId && settings.customerId && signedIn);
  return { on: Boolean(settings.on), level, line, next, ready, state: settings.on ? (ready ? "on" : "on, not ready") : "off", offLine: settings.on ? null : "Switched off — nothing is sent to Google Ads." };
}

/** Google's documented refusals → plain words (errors come in error.details[].errors[].errorCode, or a status) */
export function errorOf(body, status = 0) {
  const e = body?.error ?? {}, codes = (e.details ?? []).flatMap((d) => d.errors ?? []).map((x) => Object.values(x.errorCode ?? {})[0]).filter(Boolean);
  return codes[0] ?? e.status ?? (status ? `HTTP_${status}` : "UNKNOWN");
}
export function errorLine(code) {
  return ({ CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION: "your project has Test access only — real accounts need Explorer or Basic.",
    ACTION_NOT_PERMITTED: "your project's access level does not allow this.",
    AUTHORIZATION_ERROR: "Google refused the access (if your project was upgraded after 9 Sep 2026, Google's own page names a known problem being fixed).",
    USER_PERMISSION_DENIED: "the Google account you signed in with has no access to that Ads account.",
    CUSTOMER_NOT_ENABLED: "that Google Ads account is not active.",
    PERMISSION_DENIED: "Google refused the request — with Test or Explorer access, Keyword Planner's data needs Basic access.",
    UNAUTHENTICATED: "the sign-in has ended — sign in to Google Ads again.",
    RESOURCE_EXHAUSTED: "today's limit of requests is used up." })[code] ?? `Google answered with an error (${code}).`;
}

/** the request for keyword ideas (Google's documented body). seeds: keywords; url: the client's page; geo / language: Google's ids */
export function ideasRequest({ customerId, seeds = [], url = null, geo = [], language = "languageConstants/1000", pageToken = null, pageSize = 1000 }) {
  const id = digits(customerId); if (id.length !== 10) throw new Error("a Google Ads customer ID has 10 digits");
  const ks = seeds.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
  const body = { language, geoTargetConstants: geo, includeAdultKeywords: false, keywordPlanNetwork: "GOOGLE_SEARCH", pageSize, ...(pageToken ? { pageToken } : {}),
    ...(url && ks.length ? { keywordAndUrlSeed: { url, keywords: ks } } : url ? { urlSeed: { url } } : { keywordSeed: { keywords: ks } }) };
  return { url: `${ADS_API.base}/${ADS_API.version}/customers/${id}:generateKeywordIdeas`, body };
}

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
/** Google's answer → the database's rows: { text, said, months, competition } (int64 numbers come as strings in JSON) */
export function rowsOfIdeas(answer) {
  return (answer?.results ?? []).filter((r) => r?.text).map((r) => {
    const m = r.keywordIdeaMetrics ?? {}, ms = Object.fromEntries((m.monthlySearchVolumes ?? []).filter((x) => x.year && MONTHS.includes(x.month)).map((x) => [`${x.year}-${String(MONTHS.indexOf(x.month) + 1).padStart(2, "0")}`, Number(x.monthlySearches ?? 0)]));
    return { text: r.text, said: m.avgMonthlySearches === undefined ? null : Number(m.avgMonthlySearches), months: Object.keys(ms).length ? ms : null, competition: m.competition ? m.competition[0] + m.competition.slice(1).toLowerCase() : null, change3m: null, yoy: null };
  });
}
/** the period an answer's months cover ("2025-10-01..2026-09-30") */
export function periodOfRows(rows) {
  const ms = [...new Set(rows.flatMap((r) => Object.keys(r.months ?? {})))].sort(); if (!ms.length) return null;
  const [y, m] = ms.at(-1).split("-").map(Number), last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ms[0]}-01..${ms.at(-1)}-${String(last).padStart(2, "0")}`;
}

/**
 * the connection. keys = secrets.keyStore; settings = the client's Google Ads settings; fetchImpl handed in (tests: Google's documented
 * answers). Every call refuses while the connector is OFF — before anything is sent.
 */
export function googleAds({ keys, settings = {}, fetchImpl = (u, i) => fetch(u, { ...i, signal: AbortSignal.timeout(20000) }), now = () => Date.now(), endpoints = {} }) {
  const ep = { ...ADS_API, ...endpoints }, pending = new Map(); let access = null, lastError = null;
  const signedIn = () => Boolean(keys.get(ADS_KEYS.refresh));
  const status = () => adsStatus(settings, { signedIn: signedIn(), lastError });
  const off = () => (!settings.on ? { ok: false, off: true, why: "The Google Ads API connector is switched off — nothing was sent." } : null);
  const token = async () => {
    if (access && access.until > now() + 60000) return access.token;
    const r = await fetchImpl(ep.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: settings.clientId, client_secret: keys.get(ADS_KEYS.secret) ?? "", refresh_token: keys.get(ADS_KEYS.refresh) ?? "", grant_type: "refresh_token" }) });
    if (!r.ok) return null; const j = await r.json(); access = { token: j.access_token, until: now() + (j.expires_in ?? 3600) * 1000 }; return access.token;
  };
  return Object.freeze({
    status,
    /** Google's own sign-in page for the Ads permission, opened in the client's browser — the owner signs in himself */
    start(redirect) {
      const o = off(); if (o) return o;
      if (!settings.clientId || !keys.get(ADS_KEYS.secret)) return { ok: false, why: "Add your Cloud project's OAuth client ID and secret first." };
      const verifier = b64url(randomBytes(32)), state = b64url(randomBytes(16)); pending.set(state, { verifier, redirect, at: now() });
      const u = new URL(ep.auth);
      for (const [k, v] of Object.entries({ client_id: settings.clientId, redirect_uri: redirect, response_type: "code", scope: ADS_SCOPE, access_type: "offline", prompt: "select_account consent", state, code_challenge: b64url(createHash("sha256").update(verifier).digest()), code_challenge_method: "S256" })) u.searchParams.set(k, v);
      return { ok: true, url: u.href };
    },
    async finish({ code, state, error }) {
      const p = pending.get(state); pending.delete(state);
      if (error) return { ok: false, why: "You did not allow the access — nothing was connected." };
      if (!p || now() - p.at > 15 * 60000) return { ok: false, why: "That sign-in was not started here, or it is too old — press Sign in again." };
      const r = await fetchImpl(ep.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: settings.clientId, client_secret: keys.get(ADS_KEYS.secret) ?? "", redirect_uri: p.redirect, grant_type: "authorization_code", code_verifier: p.verifier }) });
      if (!r.ok) return { ok: false, why: "Google did not accept the sign-in — press Sign in again." };
      const j = await r.json(); if (!j.refresh_token) return { ok: false, why: "Google gave no lasting access — press Sign in again." };
      const k = keys.set(ADS_KEYS.refresh, j.refresh_token); if (!k.ok) return { ok: false, why: k.why };
      access = { token: j.access_token, until: now() + (j.expires_in ?? 3600) * 1000 }; return { ok: true };
    },
    /** keyword ideas (and their volume) for seeds → { ok, rows, period, source } — every page of the answer, at most `maxPages` */
    async ideas({ seeds = [], url = null, geo = [], language, maxPages = 5 }) {
      const o = off(); if (o) return o;
      const st = status(); if (!ACCESS[st.level].keywordData) return { ok: false, why: `${st.line} Nothing was sent.` };
      if (!st.ready) return { ok: false, why: `Not ready: ${st.next[0] ?? "finish the steps above"} Nothing was sent.` };
      const t = await token(); if (!t) return { ok: false, why: errorLine("UNAUTHENTICATED") };
      const rows = []; let pageToken = null;
      for (let i = 0; i < maxPages; i++) {
        const q = ideasRequest({ customerId: settings.customerId, seeds, url, geo, language, pageToken });
        const r = await fetchImpl(q.url, { method: "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json", ...(settings.loginCustomerId ? { "login-customer-id": digits(settings.loginCustomerId) } : {}) }, body: JSON.stringify(q.body) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { lastError = errorOf(j, r.status); return { ok: false, code: lastError, why: errorLine(lastError), rows }; }
        rows.push(...rowsOfIdeas(j)); pageToken = j.nextPageToken ?? null; if (!pageToken) break;
      }
      lastError = null;
      return { ok: true, rows, period: periodOfRows(rows), source: SOURCES.ads };
    },
  });
}
