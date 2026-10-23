/**
 * 🔴 RR-307 E1 · GOOGLE SEARCH CONSOLE, FOR REAL (owner: "option 2 never connected, yet setup went on").
 *   · SIGN-IN: the client signs in to Google HIMSELF, in his browser — Visibility opens Google's own page and never sees the password. The
 *     access asked for is READ-ONLY (webmasters.readonly). It is the installed-app flow (a loopback address on this computer, with a PKCE
 *     proof), so the answer comes back to this app only. The refresh key Google gives is kept in Windows' secure store (desktop/secrets.mjs).
 *     It needs AlmiWorld's Google sign-in client (its id in the app's settings, its secret in the secure store) — until it is set, the
 *     status says "Not connected — Connect now" and what is missing. Owner decision 21 Oct 2026: build it now, switch on later.
 *   · THE SITE: the client picks one of the sites his Google account can see; status "Connected ✓".
 *   · THE DATA: the searches (queries) of the last 3 months, read through Google's own Search Console service.
 *   · OR AN EXPORT FILE: Search Console's own download (a ZIP, or its CSV files), read by the engine's own reader
 *     (src/discovery/search-console-export.mjs) — works today, with no sign-in.
 */
import { createHash, randomBytes } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { readSearchConsoleExport } from "../src/discovery/search-console-export.mjs";

export const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
/* RR-308 D4: ONE extra permission, asked only when the client ticks "also let Visibility tell Google about my new pages": it can submit a
 * sitemap (it can also change other Search Console settings — Google offers nothing narrower; Visibility only ever submits a sitemap) */
export const SUBMIT_SCOPE = "https://www.googleapis.com/auth/webmasters";
export const GOOGLE = Object.freeze({ auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", api: "https://www.googleapis.com/webmasters/v3/" });
export const KEYS = Object.freeze({ secret: "GOOGLE_CLIENT_SECRET", refresh: "GOOGLE_REFRESH_TOKEN" });
const b64url = (b) => Buffer.from(b).toString("base64url");
/* only Google's own addresses — or, in tests, a stand-in on this computer */
const allowed = (u) => /^https:\/\/(accounts\.google\.com|oauth2\.googleapis\.com|www\.googleapis\.com)\//.test(u) || /^http:\/\/127\.0\.0\.1:\d+\//.test(u);

/** A ZIP's files (Search Console's own download) — stored or deflated entries; names → text. */
export function unzip(buf) {
  const b = Buffer.from(buf), out = {};
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  let p = b.readUInt32LE(eocd + 16);
  const n = b.readUInt16LE(eocd + 10);
  for (let k = 0; k < n; k++) {
    if (b.readUInt32LE(p) !== 0x02014b50) return null;
    const method = b.readUInt16LE(p + 10), csize = b.readUInt32LE(p + 20), nlen = b.readUInt16LE(p + 28), xlen = b.readUInt16LE(p + 30), clen = b.readUInt16LE(p + 32), off = b.readUInt32LE(p + 42);
    const name = b.subarray(p + 46, p + 46 + nlen).toString("utf8");
    const lnlen = b.readUInt16LE(off + 26), lxlen = b.readUInt16LE(off + 28);
    const data = b.subarray(off + 30 + lnlen + lxlen, off + 30 + lnlen + lxlen + csize);
    if (!name.endsWith("/") && csize < 20_000_000) out[name.split("/").pop()] = method === 8 ? inflateRawSync(data).toString("utf8") : method === 0 ? data.toString("utf8") : null;
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

/** Search Console's download (a ZIP, or its CSV files by name) → the engine's export record. `exportedOn` is the day the client added it. */
export function importExport(files, { exportedOn, source }) {
  const texts = {};
  for (const f of files) {
    const raw = Buffer.from(f.base64 ?? "", "base64");
    if (/\.zip$/i.test(f.name)) Object.assign(texts, unzip(raw) ?? {});
    else texts[f.name.split(/[\\/]/).pop()] = raw.toString("utf8");
  }
  const pick = (re) => Object.entries(texts).find(([n]) => re.test(n))?.[1];
  const r = readSearchConsoleExport({ queries: pick(/^queries\.csv$/i), pages: pick(/^pages\.csv$/i), chart: pick(/^(chart|dates)\.csv$/i), links: Object.entries(texts).filter(([n]) => /links\.csv$/i.test(n)).map(([, t]) => t) }, { exportedOn, source });
  if (r.refusal) return { ok: false, why: { QUERIES_FILE_UNREADABLE: "The Queries file is missing — choose Search Console's whole download (the ZIP), or its Queries, Pages and Chart files.", PAGES_FILE_UNREADABLE: "The Pages file is missing — choose Search Console's whole download (the ZIP).", CHART_FILE_UNREADABLE: "The Chart (dates) file is missing — choose Search Console's whole download (the ZIP)." }[r.refusal] ?? "That is not a Search Console download." };
  const q = (texts[Object.keys(texts).find((n) => /^queries\.csv$/i.test(n))] ?? "").replace(/^﻿/, "").split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')); return { query: c[0], clicks: Number(c[1]) || 0, impressions: Number(c[2]) || 0 }; }).filter((x) => x.query);
  const rec = r.record;
  return { ok: true, data: { kind: "EXPORT", on: exportedOn, window: rec.window.from ? `${rec.window.from} to ${rec.window.to}` : "export", totals: rec.totals, pages: rec.pages.urls.slice(0, 500), queries: q.slice(0, 1000), record: { ...rec, pages: { ...rec.pages, urls: rec.pages.urls.slice(0, 500) } } },
    line: `Search Console export added: ${q.length} searches and ${rec.pages.rows} pages, ${rec.window.from ?? "?"} to ${rec.window.to ?? "?"}.` };
}

/**
 * The live connection. `keys` = desktop/secrets.mjs keyStore; `config` holds the client id (and, in tests only, stand-in addresses).
 * Every call returns plain words on failure; nothing is ever written but the secure store and what the caller keeps.
 */
export function googleConnect({ keys, config, fetchImpl = (u, i) => fetch(u, { ...i, signal: AbortSignal.timeout(15000) }), now = () => Date.now() }) {
  const ep = { ...GOOGLE, ...(config.googleTestEndpoints ?? {}) };
  for (const u of Object.values(ep)) if (!allowed(u)) throw new Error("Google addresses only");
  const pending = new Map(); // state → { verifier, redirect, at }
  const clientId = () => config.googleClientId ?? null;
  const ready = () => Boolean(clientId() && keys.get(KEYS.secret));
  let access = null; // { token, until } — memory only
  const token = async () => {
    if (access && access.until > now() + 60000) return access.token;
    const refresh = keys.get(KEYS.refresh); if (!refresh) return null;
    const r = await fetchImpl(ep.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId(), client_secret: keys.get(KEYS.secret), refresh_token: refresh, grant_type: "refresh_token" }) });
    if (!r.ok) return null;
    const j = await r.json(); access = { token: j.access_token, until: now() + (j.expires_in ?? 3600) * 1000 };
    return access.token;
  };
  const api = async (path, init = {}) => { const t = await token(); if (!t) return null; const r = await fetchImpl(`${ep.api}${path}`, { ...init, headers: { authorization: `Bearer ${t}`, "content-type": "application/json", ...(init.headers ?? {}) } }); return r.ok ? r.json() : null; };
  return Object.freeze({
    status() { return { ready: ready(), signedIn: Boolean(keys.get(KEYS.refresh)), clientIdSet: Boolean(clientId()) }; },
    /** the address of Google's own sign-in page, opened in the client's browser */
    start(redirect, { submit = false } = {}) {
      if (!ready()) return { ok: false, why: "Google sign-in is not set up in this copy of AlmiVisibility yet (AlmiWorld's Google sign-in client is missing). Meanwhile, add a Search Console export file — it works today." };
      const verifier = b64url(randomBytes(32)), state = b64url(randomBytes(16));
      pending.set(state, { verifier, redirect, at: now() });
      const u = new URL(ep.auth);
      for (const [k, v] of Object.entries({ client_id: clientId(), redirect_uri: redirect, response_type: "code", scope: submit ? `${SCOPE} ${SUBMIT_SCOPE}` : SCOPE, access_type: "offline", prompt: "select_account consent", state, code_challenge: b64url(createHash("sha256").update(verifier).digest()), code_challenge_method: "S256" })) u.searchParams.set(k, v);
      return { ok: true, url: u.href };
    },
    /** Google sends the browser back here with a one-time code; it is exchanged for the read-only access, kept in the secure store */
    async finish({ code, state, error }) {
      const p = pending.get(state); pending.delete(state);
      if (error) return { ok: false, why: error === "access_denied" ? "You did not allow the access — nothing was connected." : "Google did not connect." };
      if (!p || now() - p.at > 15 * 60000) return { ok: false, why: "That sign-in was not started here, or it is too old — press Connect again." };
      const r = await fetchImpl(ep.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId(), client_secret: keys.get(KEYS.secret), redirect_uri: p.redirect, grant_type: "authorization_code", code_verifier: p.verifier }) });
      if (!r.ok) return { ok: false, why: "Google did not accept the sign-in — press Connect again." };
      const j = await r.json();
      if (!j.refresh_token) return { ok: false, why: "Google gave no lasting access — press Connect again." };
      const k = keys.set(KEYS.refresh, j.refresh_token); if (!k.ok) return { ok: false, why: k.why };
      access = { token: j.access_token, until: now() + (j.expires_in ?? 3600) * 1000 };
      return { ok: true, canSubmit: String(j.scope ?? "").split(/\s+/).includes(SUBMIT_SCOPE) };
    },
    /** RR-308 D4: after publishing, tell Google the sitemap's address — only with the extra permission the client gave */
    async submitSitemap(siteUrl, sitemapUrl) {
      const t = await token(); if (!t) return { ok: false, why: "Not signed in to Google." };
      const r = await fetchImpl(`${ep.api}sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`, { method: "PUT", headers: { authorization: `Bearer ${t}` } });
      return r.ok ? { ok: true } : { ok: false, why: r.status === 403 ? "Google refused: the permission to submit a sitemap was not given — connect Google again and tick \"also tell Google about my new pages\"." : `Google answered with an error (${r.status}).` };
    },
    async sites() { const j = await api("sites"); return j ? (j.siteEntry ?? []).filter((s) => s.permissionLevel !== "siteUnverifiedUser").map((s) => s.siteUrl) : null; },
    /** the searches of the last 3 months (Search Console's data is a few days old) */
    async queries(siteUrl) {
      const d = (n) => new Date(now() - n * 86400000).toISOString().slice(0, 10);
      const j = await api(`sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: "POST", body: JSON.stringify({ startDate: d(93), endDate: d(3), dimensions: ["query"], rowLimit: 1000 }) });
      if (!j) return null;
      return { kind: "CONNECTED", on: d(0), window: `${d(93)} to ${d(3)}`, queries: (j.rows ?? []).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions })), site: siteUrl };
    },
    /**
     * RR-318 D1 · RANK TRACKING from Search Console's own data (free): each of the last `weeks` weeks (Search Console's data is a few days
     * old), every search phrase with the page Google showed, its clicks, impressions and AVERAGE position — Google's own figure, never ours.
     */
    async performance(siteUrl, { weeks = 8 } = {}) {
      const d = (n) => new Date(now() - n * 86400000).toISOString().slice(0, 10);
      const out = [];
      for (let k = 0; k < weeks; k++) {
        const from = d(3 + 7 * k + 6), to = d(3 + 7 * k);
        const j = await api(`sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: "POST", body: JSON.stringify({ startDate: from, endDate: to, dimensions: ["query", "page"], rowLimit: 1000, type: "web" }) });
        if (!j) return k ? { kind: "PERFORMANCE", on: d(0), site: siteUrl, weeks: out, partial: `Google gave ${k} of ${weeks} weeks — press Read again later for the rest.` } : null;
        out.push({ from, to, rows: (j.rows ?? []).map((r) => ({ query: r.keys[0], page: r.keys[1], clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10 })) });
      }
      return { kind: "PERFORMANCE", on: d(0), site: siteUrl, weeks: out.reverse() };
    },
    signOut() { keys.remove(KEYS.refresh); access = null; },
  });
}
