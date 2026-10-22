/**
 * 🔴 RR-311 A · YOUTUBE SIGN-IN — THE DATA A FREE CHATBOT DOES NOT HAVE (owner, 21 Oct 2026: "build it; the owner switches it on").
 *   · The CHANNEL OWNER signs in to Google himself, in his browser (Google's own page; Visibility never sees the password). Installed-app
 *     flow: a loopback address on this computer and a PKCE proof. One sign-in PER PRODUCT — the Dhanak channel's own Google account signs
 *     in for Dhanak — and it must be the product's confirmed channel, or it is refused and forgotten (main.mjs).
 *   · READ (youtube.readonly + yt-analytics.readonly): YouTube Analytics — views, watch time, average view duration and percentage, traffic
 *     sources, the YouTube search terms that brought viewers (at most 25, Google's own limit), countries, ages, audience retention per video;
 *     and the Reporting API's "reach" report (thumbnail impressions and click-through rate — Google makes it within 48 hours of the first
 *     sign-in, with the 30 days before it).
 *   · CAPTIONS AND "APPLY TO YOUTUBE" need Google's youtube.force-ssl permission. Google has NO read-only permission for downloading
 *     captions, so captions come only with the same switch as Apply ("Apply to YouTube" on) — said plainly in the app.
 *   · The refresh key Google gives is kept in Windows' secure store under the product's own name; nothing is printed or logged.
 * Official Google addresses only (or, in tests, a stand-in on this computer).
 * 🔴 RR-315 A (owner's live test: Google gave the account's DEFAULT channel, not the brand channel Almiworld): Google is asked to show its
 *   account / brand-account chooser every time (prompt=select_account consent); the app says beforehand which channel to choose.
 */
import { createHash, randomBytes } from "node:crypto";
import { csvRows } from "../src/video/youtube.mjs";

export const YT_SCOPES = Object.freeze({ read: ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"], write: "https://www.googleapis.com/auth/youtube.force-ssl" });
export const YT_ENDPOINTS = Object.freeze({ auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", data: "https://www.googleapis.com/youtube/v3/", analytics: "https://youtubeanalytics.googleapis.com/v2/", reporting: "https://youtubereporting.googleapis.com/v1/" });
export const REACH_REPORT = "channel_reach_basic_a1";
export const signinKeyName = (id) => `YT_SIGNIN_${String(id).toUpperCase().replace(/[^A-Z0-9]/g, "_")}`.slice(0, 64);
const allowed = (u) => /^https:\/\/(accounts\.google\.com|oauth2\.googleapis\.com|www\.googleapis\.com|youtubeanalytics\.googleapis\.com|youtubereporting\.googleapis\.com)\//.test(u) || /^http:\/\/127\.0\.0\.1:\d+\//.test(u);
const b64url = (b) => Buffer.from(b).toString("base64url");
const day = (t) => new Date(t).toISOString().slice(0, 10);

/** What signing in adds — shown until the channel owner signs in (A4) */
export const SIGNIN_ADDS = Object.freeze([
  "Which videos YouTube shows a lot but people click little (impressions and click-through rate)",
  "Where viewers stop watching (retention), and how long they stay",
  "The YouTube searches that brought viewers to your videos",
  "Where your viewers come from (countries, ages, traffic sources)",
  "With \"Apply to YouTube\" on: real chapters from your captions, and changes made on YouTube for you — with Undo",
]);

export function youtubeSignin({ keys, config = {}, wantOf = null, fetchImpl = (u, i) => fetch(u, { ...i, signal: AbortSignal.timeout(20000) }), now = () => Date.now() }) {
  const ep = { ...YT_ENDPOINTS, ...(config.youtubeTestEndpoints ?? {}) };
  for (const u of Object.values(ep)) if (!allowed(u)) throw new Error("Google addresses only");
  const clientId = () => config.googleClientId ?? null;
  const secret = () => keys.get("GOOGLE_CLIENT_SECRET");
  const pending = new Map(); // state → { verifier, redirect, id, write, at }
  const access = new Map(); // product id → { token, until } — memory only
  const saved = (id) => { try { return JSON.parse(keys.get(signinKeyName(id)) ?? "null"); } catch { return null; } };
  const token = async (id) => {
    const a = access.get(id); if (a && a.until > now() + 60000) return a.token;
    const s = saved(id); if (!s?.refresh) return null;
    const r = await fetchImpl(ep.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId(), client_secret: secret(), refresh_token: s.refresh, grant_type: "refresh_token" }) });
    if (!r.ok) return null;
    const j = await r.json(); access.set(id, { token: j.access_token, until: now() + (j.expires_in ?? 3600) * 1000 });
    return j.access_token;
  };
  const call = async (id, url, init = {}) => {
    if (!allowed(url)) throw new Error("Google addresses only");
    const t = await token(id); if (!t) throw Object.assign(new Error("not signed in"), { code: "NOT_SIGNED_IN" });
    const r = await fetchImpl(url, { ...init, headers: { authorization: `Bearer ${t}`, ...(init.body && typeof init.body === "string" ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}) } });
    if (!r.ok) throw Object.assign(new Error(`Google answered HTTP ${r.status}`), { status: r.status });
    return r;
  };
  const json = async (id, url, init) => (await call(id, url, init)).json();
  const q = (base, path, params = {}) => { const u = new URL(`${base}${path}`); for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) u.searchParams.set(k, String(v)); return u.href; };
  const report = (id, params) => json(id, q(ep.analytics, "reports", { ids: "channel==MINE", ...params }));
  const rowsOf = (j) => { const h = (j.columnHeaders ?? []).map((c) => c.name); return (j.rows ?? []).map((r) => Object.fromEntries(r.map((v, i) => [h[i], v]))); };

  const self = {
    ready: () => Boolean(clientId() && secret()),
    status(id) { const s = saved(id); return { ready: self.ready(), signedIn: Boolean(s?.refresh), write: s?.write === true, channelId: s?.channelId ?? null, since: s?.since ?? null }; },
    /** Google's own sign-in page, opened in the client's browser; "write" asks for the extra permission (captions + Apply) */
    start(id, redirect, { write = false } = {}) {
      if (!self.ready()) return { ok: false, why: "Google sign-in is not set up in this copy of AlmiVisibility yet (the Google sign-in client is missing — see the launch checklist)." };
      const verifier = b64url(randomBytes(32)), state = b64url(randomBytes(16));
      pending.set(state, { verifier, redirect, id, write, at: now() });
      const u = new URL(ep.auth);
      for (const [k, v] of Object.entries({ client_id: clientId(), redirect_uri: redirect, response_type: "code", scope: [...YT_SCOPES.read, ...(write ? [YT_SCOPES.write] : [])].join(" "), access_type: "offline", prompt: "select_account consent", include_granted_scopes: "true", state, code_challenge: b64url(createHash("sha256").update(verifier).digest()), code_challenge_method: "S256" })) u.searchParams.set(k, v);
      return { ok: true, url: u.href, state };
    },
    /** Google sends the browser back with a one-time code; the lasting access is kept for THIS product; the channel is asked (mine=true) */
    async finish({ code, state, error }) {
      const p = pending.get(state); pending.delete(state);
      if (error) return { ok: false, why: error === "access_denied" ? "You did not allow the access — nothing was connected." : "Google did not connect." };
      if (!p || now() - p.at > 15 * 60000) return { ok: false, why: "That sign-in was not started here, or it is too old — press Sign in again." };
      const r = await fetchImpl(ep.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId(), client_secret: secret(), redirect_uri: p.redirect, grant_type: "authorization_code", code_verifier: p.verifier }) });
      if (!r.ok) return { ok: false, why: "Google did not accept the sign-in — press Sign in again." };
      const j = await r.json();
      if (!j.refresh_token) return { ok: false, why: "Google gave no lasting access — press Sign in again." };
      const granted = String(j.scope ?? "").split(/\s+/);
      if (!YT_SCOPES.read.every((s) => granted.includes(s))) return { ok: false, id: p.id, why: "You did not tick every box Google showed — Visibility needs to read your channel and its analytics. Press Sign in again and allow both." };
      access.set(p.id, { token: j.access_token, until: now() + (j.expires_in ?? 3600) * 1000 });
      /* RR-315 A4: every channel the signed-in choice owns (for an ordinary Google account, Google gives the ONE channel picked in its own
       * chooser; "managedByMe" is for YouTube content partners only) — the product's confirmed channel is kept when it is among them */
      const ch = await fetchImpl(q(ep.data, "channels", { part: "snippet", mine: "true", maxResults: 50 }), { headers: { authorization: `Bearer ${j.access_token}` } }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      const channels = (ch?.items ?? []).map((x) => ({ id: x.id, title: x.snippet?.title ?? null }));
      const c = (wantOf?.(p.id) && ch?.items?.find((x) => x.id === wantOf(p.id))) || ch?.items?.[0];
      const k = keys.set(signinKeyName(p.id), JSON.stringify({ refresh: j.refresh_token, write: granted.includes(YT_SCOPES.write), channelId: c?.id ?? null, since: new Date(now()).toISOString() }));
      if (!k.ok) return { ok: false, why: k.why };
      return { ok: true, id: p.id, write: granted.includes(YT_SCOPES.write), channelId: c?.id ?? null, channelTitle: c?.snippet?.title ?? null, channels };
    },
    signOut(id) { keys.remove(signinKeyName(id)); access.delete(id); },

    /** the channel's own analytics, last 90 days (Google's data is about 2 days behind) */
    async analytics(id) {
      const d = (n) => day(now() - n * 864e5), win = { startDate: d(92), endDate: d(2) };
      const safe = (p) => p.catch((e) => ({ failed: e.status ?? e.code ?? "error" }));
      const [byVideo, sources, search, countries, ages] = await Promise.all([
        safe(report(id, { ...win, metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage", dimensions: "video", sort: "-views", maxResults: 200 })),
        safe(report(id, { ...win, metrics: "views", dimensions: "insightTrafficSourceType", sort: "-views" })),
        safe(report(id, { ...win, metrics: "views", dimensions: "insightTrafficSourceDetail", filters: "insightTrafficSourceType==YT_SEARCH", sort: "-views", maxResults: 25 })),
        safe(report(id, { ...win, metrics: "views", dimensions: "country", sort: "-views", maxResults: 10 })),
        safe(report(id, { ...win, metrics: "viewerPercentage", dimensions: "ageGroup" })),
      ]);
      return { window: `${win.startDate} to ${win.endDate}`, on: day(now()),
        byVideo: byVideo.failed ? null : rowsOf(byVideo).map((r) => ({ videoId: r.video, views: Number(r.views), minutes: Number(r.estimatedMinutesWatched), avgSec: Number(r.averageViewDuration), avgPct: Number(r.averageViewPercentage) })),
        sources: sources.failed ? null : rowsOf(sources).map((r) => ({ source: r.insightTrafficSourceType, views: Number(r.views) })),
        searchTerms: search.failed ? null : rowsOf(search).map((r) => ({ term: r.insightTrafficSourceDetail, views: Number(r.views) })),
        countries: countries.failed ? null : rowsOf(countries).map((r) => ({ country: r.country, views: Number(r.views) })),
        ages: ages.failed ? null : rowsOf(ages).map((r) => ({ age: r.ageGroup, pct: Number(r.viewerPercentage) })) };
    },
    /** where viewers stop: the share still watching along the video (one video per request — Google's own rule) */
    async retention(id, videoId) {
      const d = (n) => day(now() - n * 864e5);
      const j = await report(id, { startDate: d(365), endDate: d(2), metrics: "audienceWatchRatio", dimensions: "elapsedVideoTimeRatio", filters: `video==${videoId}` });
      return rowsOf(j).map((r) => ({ at: Number(r.elapsedVideoTimeRatio), watching: Number(r.audienceWatchRatio) }));
    },
    /** one video's views per day — the before → after of a change */
    async daily(id, videoId, from, to) {
      const j = await report(id, { startDate: from, endDate: to, metrics: "views", dimensions: "day", filters: `video==${videoId}`, sort: "day" });
      return rowsOf(j).map((r) => ({ day: r.day, views: Number(r.views) }));
    },
    /** thumbnail impressions and click-through rate: the Reporting API's reach report (a job is made once; Google fills it within 48 hours) */
    async reach(id) {
      const jobs = await json(id, q(ep.reporting, "jobs"));
      let job = (jobs.jobs ?? []).find((x) => x.reportTypeId === REACH_REPORT);
      if (!job) { job = await json(id, q(ep.reporting, "jobs"), { method: "POST", body: JSON.stringify({ reportTypeId: REACH_REPORT, name: "AlmiVisibility reach" }) }); return { state: "WAITING", line: "Asked Google for your impressions and click-through rate — Google makes them within 48 hours (with the 30 days before)." }; }
      const reps = (await json(id, q(ep.reporting, `jobs/${job.id}/reports`))).reports ?? [];
      if (!reps.length) return { state: "WAITING", line: "Google has not made your impressions report yet — it comes within 48 hours of the first sign-in." };
      const rows = [];
      for (const rep of reps.slice(0, 40)) { if (!allowed(rep.downloadUrl)) continue; const text = await (await call(id, rep.downloadUrl)).text(); const [h, ...rs] = csvRows(text); const ix = (n) => h.indexOf(n); for (const r of rs) rows.push({ day: r[ix("date")], videoId: r[ix("video_id")], impressions: Number(r[ix("video_thumbnail_impressions")] ?? 0), ctr: Number(r[ix("video_thumbnail_impressions_ctr")] ?? 0) }); }
      return { state: "READY", rows };
    },
    /** captions of the channel's own video (needs the Apply permission — Google has no read-only one for captions) */
    async captions(id, videoId) {
      const list = await json(id, q(ep.data, "captions", { part: "snippet", videoId }));
      const tracks = list.items ?? []; const pick = tracks.find((t) => t.snippet?.trackKind !== "asr") ?? tracks[0];
      if (!pick) return null;
      return (await call(id, q(ep.data, `captions/${pick.id}`, { tfmt: "vtt" }))).text();
    },
    async snippet(id, videoId) { const j = await json(id, q(ep.data, "videos", { part: "snippet", id: videoId })); return j.items?.[0]?.snippet ?? null; },
    /** Apply to YouTube: the video's snippet with the new title / description / tags (its category and language kept — Google requires them) */
    async updateSnippet(id, videoId, snippet) {
      const keep = { title: snippet.title, description: snippet.description, tags: snippet.tags ?? [], categoryId: snippet.categoryId, ...(snippet.defaultLanguage ? { defaultLanguage: snippet.defaultLanguage } : {}), ...(snippet.defaultAudioLanguage ? { defaultAudioLanguage: snippet.defaultAudioLanguage } : {}) };
      return json(id, q(ep.data, "videos", { part: "snippet" }), { method: "PUT", body: JSON.stringify({ id: videoId, snippet: keep }) });
    },
  };
  return Object.freeze(self);
}
