/**
 * RR-326 · GOOGLE ADS' REQUEST AND ANSWER, AS GOOGLE DOCUMENTS THEM — pure (no import, no network): the endpoints, the keyword-ideas
 * request, Google's answer read into rows, the period, and Google's refusals in plain words. Shared by the Visibility app
 * (desktop/google-ads.mjs, which re-exports them) and the website's keyword finder and collector (site/kw-google.mjs), so the website's
 * bundle does not carry the app's keyword database.
 */
export const ADS_API = Object.freeze({ version: "v26", base: "https://googleads.googleapis.com", auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token" });
export const ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
const digits = (id) => String(id ?? "").replace(/\D/g, "");

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
