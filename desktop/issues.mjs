/**
 * 🔴 RR-387 PART D · THE APP MUST NOT NEED beta-g (owner, 7 Nov 06:20: "a client has nobody to check his pages. The app does it.")
 * ONE Issues list per product, on its Home screen: every finding from every source — the site scan, the gate, the truth pass, publish
 * errors, outside services (Google, Bing, GitHub, Vercel, DataForSEO, Anthropic) and money. Each says what was found (plain words), where,
 * WHO ACTS ("Fixed by the app" · "The app fixes it at the next cycle" · "You: <one step>" · "A developer: <bug report ready>"), and the
 * dates found and fixed. D2: an outside error in the service's own words, then its one fix (never a secret). D3: the money warning, once.
 * D4: a fault only code can fix gets a bug report file (no secrets, no keys, no client data beyond page addresses).
 * Pure: the caller hands in what it holds; the list is kept with its dates (issuesMerge).
 */
import { createHash } from "node:crypto";

export const ISSUES_FILE = "issues.json", BUG_DIR = "Issues";
export const WHO = Object.freeze({ FIXED: "Fixed by the app", NEXT: "The app fixes it at the next cycle", YOU: "You", DEV: "A developer" });
const idOf = (...p) => createHash("sha1").update(p.join("|")).digest("hex").slice(0, 16);
const issue = (source, what, where, who, step = null, extra = {}) => ({ id: idOf(source, what.replace(/\d+/g, "#"), where), source, what, where, who, step, ...extra });

/* 🔴 D2 · an outside service's error, in its own words, then the ONE fix. `text` is what the service said; nothing secret is ever passed in */
export function explainOutside(service, status, text = "") {
  const t = String(text ?? ""), s = Number(status) || 0, said = t ? `${t.replace(/\s+/g, " ").trim().slice(0, 240)}` : `answered ${s || "nothing"}`;
  const out = (fix) => ({ service, exact: `${service} said: ${said}${s && !t.includes(String(s)) ? ` (${s})` : ""}`, fix });
  if (service === "Google") {
    if (/client secret is invalid|invalid_client/i.test(t) || (s === 401 && /secret/i.test(t))) return out("Your Google client secret is disabled or wrong: make a new one in Google Cloud → Credentials → your Desktop client → Add secret, then paste it under Settings → Google sign-in → change the client.");
    if (/invalid_grant|expired or revoked/i.test(t)) return out("Your Google sign-in has expired or was removed: press Connect Google Search Console and sign in again.");
    if (/insufficient|scope|permission to submit/i.test(t) || s === 403) return out("The sign-in lacks a permission this needs: press Connect again and tick the box it names (e.g. \"Also tell Google about my new pages\").");
    if (/redirect_uri_mismatch/i.test(t)) return out("Your Google client must be of type \"Desktop app\": make one in Google Cloud → Credentials, then paste it under Settings → Google sign-in.");
    if (/unverified|hasn't verified|access_denied/i.test(t)) return out("Google has not verified the sign-in app yet: on Google's screen press Advanced → Continue (or use your own Google client: Settings → Google sign-in).");
    return out("Press Connect Google Search Console again; if it says the same, send the bug report under Issues.");
  }
  if (service === "Bing") {
    if (/key file|keyLocation|403/i.test(t) || s === 403) return out("Put your IndexNow key file on your site (Home → Search engines shows the file and where it goes), then the next cycle sends again.");
    if (s === 422 || s === 400) return out("Bing refused the addresses: they must be on the site whose key file you placed. The next cycle sends only those.");
    if (s === 429) return out("Bing asks to wait: the next cycle sends again by itself.");
    return out("Nothing to do: the next cycle tries again.");
  }
  if (service === "GitHub") {
    if (s === 401) return out("Your GitHub token was refused (expired or deleted): make a new fine-grained token with Contents: Read and write on your site's repository, then paste it under Publish settings.");
    if (s === 403 && /protect|required status|review/i.test(t)) return out("Your branch protection blocks the app's merge: allow it for the preview pull request, or merge \"Pages from AlmiVisibility\" yourself in GitHub.");
    if (s === 403) return out("Your GitHub token may not write to this repository: give it Contents: Read and write (and Pull requests: Read and write for going live) on that repository.");
    if (s === 404) return out("GitHub cannot see the repository or branch: check the repository name and branch under Publish settings, and that the token covers that repository.");
    if (s === 405 || s === 409 || /conflict|not mergeable/i.test(t)) return out("The preview branch has a conflict with your live branch: a person must resolve it once in GitHub; the app goes on after that.");
    return out("The next cycle tries again; if it says the same, send the bug report under Issues.");
  }
  if (service === "Vercel") {
    if (/protect|sso|401/i.test(t) || s === 401) return out("The preview is behind Vercel's protection: add the \"Protection Bypass for Automation\" secret (Vercel → your project → Settings → Deployment Protection) in the Autopilot box, so the scan can read it.");
    if (/not ready|did not finish|failure|error/i.test(t)) return out("The preview did not build: open the failed deployment in Vercel; the app takes the pages live once a preview is Ready.");
    return out("The next cycle waits for the preview again.");
  }
  if (service === "DataForSEO") {
    if (/balance|funds|payment|402/i.test(t) || s === 402) return out("Your DataForSEO balance is used up: top it up in your DataForSEO account; Google searches wait until then (free sources go on).");
    if (s === 401 || /login|password|auth/i.test(t)) return out("Your DataForSEO login was refused: paste the API login and password again under Settings → Search results data (the API ones, not your e-mail).");
    return out("Google searches wait for the next cycle; free sources go on.");
  }
  if (service === "Anthropic") {
    if (s === 401 || /invalid x-api-key|authentication/i.test(t)) return out("Your AI key was refused: make a new key in the Anthropic console and paste it under Settings → Your AI assistant.");
    if (/credit|balance|billing/i.test(t) || s === 402) return out("Your Anthropic credit is used up: add credit in the Anthropic console; the checks wait until then.");
    if (s === 429 || /rate limit/i.test(t)) return out("Anthropic asked the app to slow down: nothing to do; the next cycle goes on.");
    if (s === 403) return out("Your AI account may not do this: check what the key may do in the Anthropic console, or paste another key.");
    return out("The next cycle tries again.");
  }
  return out("The next cycle tries again.");
}

/* the scan's checks → who acts (an app page the app fixes by writing again; the site's own pages need the site's code) */
const SCAN_WHO = { status: "app-or-site", links: "app", noindexInSitemap: "site", forbidden: "app", faq: "app-or-site", canonical: "app-or-site", titles: "app-or-site", robots: "site", sitemap: "site", lastChecked: "app-or-site" };
const LOGIN_LIKE = /\/(?:login|log-in|signin|sign-in|signup|sign-up|register|account|forgot-password|reset-password|cart|checkout)(?:\/|$)/i;
/**
 * every issue from what the app holds. h: { scan, appPages (Set of addresses the app wrote), counts, google, truthRun, publishLast, goLive, cycle, budget, nextCycleUsd, dfs, aiWhy, bing, version }
 */
export function findIssues(h) {
  const out = [], app = h.appPages ?? new Set(), mine = (u) => app.has(String(u).split(":").slice(0, 2).join(":").replace(/\/+$/, "")) || app.has(String(u).replace(/\/+$/, ""));
  /* the scan */
  for (const r of h.scan?.rows ?? []) {
    if (r.ok || r.key === "notInSitemap") continue;
    const urls = (r.all ?? r.sample).map((x) => String(x).split(/: | → /)[0]), ours = urls.filter(mine), theirs = urls.filter((u) => !mine(u)), kind = SCAN_WHO[r.key] ?? "app";
    if (ours.length && kind !== "site") out.push(issue("scan", `${r.check}: ${ours.length} of the app's pages fail ("${r.mustBe}")`, ours.slice(0, 5).join(", "), WHO.NEXT, null, { sample: r.sample.filter((x) => mine(String(x).split(/: | → /)[0])).slice(0, 5) }));
    if (theirs.length && kind !== "app") out.push(issue("scan", `${r.check}: ${theirs.length} page${theirs.length === 1 ? "" : "s"} of your site's own code fail ("${r.mustBe}")`, theirs.slice(0, 5).join(", "), WHO.DEV, "The app cannot change your site's own code: the bug report under Issues tells your developer exactly what to change.", { bug: true, sample: r.sample.filter((x) => !mine(String(x).split(/: | → /)[0])).slice(0, 8) }));
  }
  /* pages that should never be in Google (sign-in, account) but are indexable — beta-g's /login and /signup */
  for (const l of h.scan?.listed ?? []) if (LOGIN_LIKE.test(new URL(l.url).pathname)) out.push(issue("scan", "A sign-in or account page is open to Google (no noindex)", l.url, WHO.DEV, "Give it noindex in your site's code (the bug report says how).", { bug: true }));
  /* the count: what Google is told vs what the app holds for Google — beta-g's 62 / 45 / 36 */
  if (h.counts && h.counts.inSitemap !== null && h.counts.inSitemap !== undefined && h.counts.forGoogle !== h.counts.inSitemap) out.push(issue("count", `Your live sitemap lists ${h.counts.inSitemap} of the app's pages; the app holds ${h.counts.forGoogle} for Google`, "Pages", WHO.NEXT, null, { counts: { inSitemap: h.counts.inSitemap, forGoogle: h.counts.forGoogle } }));
  /* Search Console — beta-g's "not connected, no error" */
  if (h.google) { const g = h.google; if (!g.connected) { const ex = g.lastError ? explainOutside("Google", g.status ?? 0, g.lastError.replace(/^Google said: /, "")) : null; out.push(issue("Google", ex ? ex.exact : g.signedIn ? "Search Console: signed in, but no site is picked" : "Search Console is not connected", "Google Search Console", WHO.YOU, ex ? ex.fix : g.signedIn ? "Pick your site on the Google Search Console screen." : "Press Connect Google Search Console and sign in.", { signin: g.signin?.result ?? null })); } }
  /* the truth pass: lines that could not be checked */
  if (h.truthRun?.unread) out.push(issue("truth", `${h.truthRun.unread} line${h.truthRun.unread === 1 ? "" : "s"} wait: their source pages block our reader`, "Data → Read these pages myself", WHO.YOU, "Open \"Read these pages myself\" and read the listed pages in your own browser (a VPN helps where a site blocks other countries).", { count: h.truthRun.unread }));
  if (h.truthRun?.failed) out.push(issue("truth", `${h.truthRun.failed} line${h.truthRun.failed === 1 ? "" : "s"} failed the truth check and are hidden`, "Pages", WHO.FIXED, null, { count: h.truthRun.failed }));
  /* publish */
  const pl = h.publishLast; if (pl && pl.ok === false && pl.why) { const ex = pl.status ? explainOutside("GitHub", pl.status, pl.why) : null; out.push(issue("publish", ex ? ex.exact : `Publishing stopped: ${pl.why.slice(0, 200)}`, "Publish", ex ? WHO.YOU : WHO.NEXT, ex?.fix ?? null)); }
  /* going live */
  const gl = h.goLive; if (gl?.held && !gl.ok) { const vercel = /preview|protect|Ready/i.test(gl.held), ex = vercel ? explainOutside("Vercel", 0, gl.held) : /outside .* only pages/i.test(gl.held) ? null : explainOutside("GitHub", Number((/answered (\d{3})/.exec(gl.held) ?? [])[1]) || 0, gl.held); out.push(issue("go-live", gl.held.slice(0, 220), "Go live", /failed the scan|scan/i.test(gl.held) ? WHO.NEXT : ex && !/tries again|waits/.test(ex.fix) ? WHO.YOU : WHO.NEXT, /failed the scan/i.test(gl.held) ? null : ex?.fix ?? null)); }
  if (gl?.rolledBack?.ok) out.push(issue("go-live", "A serious failure on the live site was rolled back", "Go live", WHO.FIXED));
  /* outside services the cycle met */
  if (h.aiWhy) { const s = Number((/\((\d{3})\)/.exec(h.aiWhy) ?? [])[1]) || 0, ex = explainOutside("Anthropic", s, h.aiWhy); out.push(issue("Anthropic", ex.exact, "Settings → Your AI assistant", /next cycle|nothing to do/i.test(ex.fix) ? WHO.NEXT : WHO.YOU, ex.fix)); }
  if (h.dfs?.why) { const ex = explainOutside("DataForSEO", h.dfs.status ?? 0, h.dfs.why); out.push(issue("DataForSEO", ex.exact, "Settings → Search results data", /wait|next cycle/i.test(ex.fix) && !/top it up|paste/i.test(ex.fix) ? WHO.NEXT : WHO.YOU, ex.fix)); }
  if (h.bing?.why) { const ex = explainOutside("Bing", h.bing.status ?? 0, h.bing.why); out.push(issue("Bing", ex.exact, "Search engines", /next cycle|wait/i.test(ex.fix) && !/Put your/.test(ex.fix) ? WHO.NEXT : WHO.YOU, ex.fix)); }
  /* 🔴 D3 · money, once, before it bites */
  if (h.budget && typeof h.nextCycleUsd === "number" && h.nextCycleUsd > h.budget.left + 1e-9) { const next = new Date(h.now ?? Date.now()); next.setUTCMonth(next.getUTCMonth() + 1, 1); out.push(issue("money", `Next cycle about $${h.nextCycleUsd.toFixed(2)}, left $${Math.max(0, h.budget.left).toFixed(2)}. The rest waits for ${next.toISOString().slice(0, 10)}.`, "Home", WHO.NEXT, null, { money: true })); }
  /* the last cycle's own steps that did not pass and are not said above */
  for (const s of h.cycle?.steps ?? []) if (!s.ok && !["goLive", "liveScan"].includes(s.key)) out.push(issue("cycle", `${s.name}: ${String(s.line).slice(0, 200)}`, "Autopilot", WHO.NEXT));
  return out;
}

/** the kept list with its dates: a new issue is found today; one no longer found is fixed today; one found again is open again */
export function issuesMerge(kept = [], now = [], today = new Date().toISOString().slice(0, 10)) {
  const was = new Map(kept.map((x) => [x.id, x])), seen = new Set(), out = [];
  for (const x of now) { seen.add(x.id); const w = was.get(x.id); out.push({ ...x, found: w && !w.fixed ? w.found : today, fixed: null }); }
  for (const w of kept) if (!seen.has(w.id)) out.push(w.fixed ? w : { ...w, fixed: today, who: w.who === WHO.YOU || w.who === WHO.DEV ? w.who : WHO.FIXED });
  return out.sort((a, b) => (a.fixed ? 1 : 0) - (b.fixed ? 1 : 0) || String(b.found).localeCompare(String(a.found))).slice(0, 400);
}
/** D4 · the bug report a developer reads: what happened, the steps, the exact errors, the version, the scan table — no secret, no key, no token, no client data beyond page addresses */
export function bugReport({ issue: x, version, product, scanTable = "", on = new Date().toISOString() }) {
  const clean = (t) => String(t ?? "").replace(/(?:sk-ant-|ghp_|github_pat_|AIza)[\w-]{6,}/g, "[removed]").replace(/[?&](?:key|token|code|secret)=[^\s&]+/gi, "[removed]");
  return clean([`# Bug report — ${x.what}`, "", `- Product: ${product}`, `- App version: ${version}`, `- Found: ${x.found ?? on.slice(0, 10)} (written ${on.slice(0, 16).replace("T", " ")} UTC)`, `- Where: ${x.where}`, `- Source: ${x.source}`, "", "## What happened", x.what, "", "## The steps", "1. The app's own scan (or check) ran on the live site.", `2. It found: ${x.what}.`, `3. ${x.step ?? "The app cannot change this itself."}`, "", "## The exact findings", ...(x.sample ?? []).map((s) => `- ${s}`), "", "## The scan table", scanTable || "(no scan table)", "", "No secret, key, token or client data is in this report beyond page addresses."].join("\n"));
}
/** D1 · the weekly report's part: only what changed this week and what still needs the owner */
export function issuesWeek(list, sinceDay) {
  const fixed = list.filter((x) => x.fixed && x.fixed >= sinceDay), fresh = list.filter((x) => !x.fixed && x.found >= sinceDay), you = list.filter((x) => !x.fixed && (x.who === WHO.YOU || x.who === WHO.DEV));
  return [`Issues: ${fixed.length} fixed this week, ${fresh.length} new.`, ...you.slice(0, 6).map((x) => `Needs ${x.who === WHO.YOU ? "you" : "a developer"}: ${x.what}${x.step ? ` — ${x.step}` : ""}`)].join("\n");
}
