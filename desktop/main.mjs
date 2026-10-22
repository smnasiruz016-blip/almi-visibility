#!/usr/bin/env node
/**
 * 🔴 THE DOWNLOADABLE VISIBILITY — THE APP (RR-298 C; RR-299 C: the products home screen). It runs on the client's OWN computer: a local
 * server bound to 127.0.0.1 only, shown in its own window by the launcher (never a hosted dashboard). Its data lives in the client's data
 * folder (--data), apart from the program folder, so an update or an uninstall never touches it unless the client chooses.
 *   FIRST SCREEN (RR-299): the client's company — its name, its main website, its own logo if they add one — and below it its products,
 *   each with its own name and address and its state. "+ Add a product" opens that product's setup (the seven steps); picking a product
 *   opens its own work. The plan limit is said here in plain words. Each product's data stays in its own folder (desktop/products.mjs).
 *   EVERY SCREEN carries the maker's logo (AlmiWorld, "live beautifully") in its header; the client's logo never replaces it.
 *   node desktop/main.mjs --data=<dir> [--install=<program dir>] [--port=0]
 */
import { createServer } from "node:http";
import { browserOpener } from "./open-browser.mjs"; // RR-314 A1
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { PILOT_CHANNELS } from "../config/youtube/pilot-channels.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { licenceState, mayAddProduct, plansView, PLANS, planLimitLine, readOwnerLicenceText, isOwnerLicence, verifyLicence } from "./licence.mjs";
import { checkForUpdate, downloadUpdate, installUpdate } from "./updater.mjs";
import { LANGUAGES } from "../src/page/languages.mjs";
import { STEPS, checkStep, webAddress, stepsFor, CHOICES, HOWTO, recommended } from "./setup.mjs";
import { readSite, addressOpens } from "./site-read.mjs";
import { scoreCard, foundInfo, fixForMe } from "./product-check.mjs";
import { googleConnect, importExport } from "./google-connect.mjs";
import { seoPages, articleOfDay, socialFor, monthReport } from "./seo-pages.mjs";
import { menuFor, seoCheck, aeoCheck, geoCheck, linksCheck, languagesCheck } from "./features.mjs";
import { productStore, productCard } from "./products.mjs";
import { TARGETS, checkTarget, publishDraft, unpublish, editDraft } from "./publish.mjs";
import { homedir } from "node:os";
import { cssVariables } from "./theme.mjs";
import { articleSettings, settingsView, PUBLISH_MODE } from "../src/page/articles.mjs";
import { keyStore, windowsBackend, memoryBackend, KEY_NAMES, AI_PROVIDERS } from "./secrets.mjs";
import { youtubeApp } from "./youtube-app.mjs";
import { youtubeSignin, SIGNIN_ADDS } from "./youtube-signin.mjs";
import { aiLedger, askCoach, DEFAULT_CAP_USD } from "./ai-coach.mjs";
import { actionPlan, willDo, planDocument, isAlmiWorld, subjectOf } from "./action-plan.mjs";
import { plainYouTubeWhy } from "../src/video/youtube.mjs"; // RR-313 A3
import { newIndexNowKey, checkKeyFile, keyFileHowTo, keyFileUrl, indexNow, inSitemap, submissionLines, INDEXNOW_ENDPOINT } from "./submit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const DATA = arg("data");
if (!DATA) { console.error("usage: node desktop/main.mjs --data=<dir>"); process.exit(1); }
const INSTALL = arg("install", join(HERE, "..", ".."));
const VERSION = existsSync(join(HERE, "..", "version.txt")) ? readFileSync(join(HERE, "..", "version.txt"), "utf8").trim() : "0.0.0-dev";
mkdirSync(DATA, { recursive: true });
const store = productStore(DATA);
const LICENCE_FILE = join(DATA, "licence.json");
const licenceLast = () => (existsSync(LICENCE_FILE) ? JSON.parse(readFileSync(LICENCE_FILE, "utf8")).last : null);
const saveLicence = (last) => { writeFileSync(`${LICENCE_FILE}.tmp`, JSON.stringify({ last })); renameSync(`${LICENCE_FILE}.tmp`, LICENCE_FILE); };
const CONFIG = existsSync(join(DATA, "config.json")) ? JSON.parse(readFileSync(join(DATA, "config.json"), "utf8")) : {};
/* the public keys the app trusts: shipped with it (desktop/keys), or a test folder named in the data folder's config (tests only) */
const keyPem = (name) => { const f = join(CONFIG.keysDir ?? join(HERE, "keys"), name); return existsSync(f) ? readFileSync(f, "utf8") : null; };
/* RR-303 F: the licence check and the update channel are the site's own (almivisibility.almiworld.com, not live until the owner's GREEN) */
const LICENCE_URL = CONFIG.licenceUrl ?? "https://almivisibility.almiworld.com/";
const UPDATE_URL = CONFIG.updateChannelUrl ?? "https://almivisibility.almiworld.com/updates/";
const saveConfig = () => { writeFileSync(join(DATA, "config.json.tmp"), JSON.stringify(CONFIG, null, 1)); renameSync(join(DATA, "config.json.tmp"), join(DATA, "config.json")); };
/* RR-303 A: the licence key a purchase shows (av_…); kept in the app's own config, never shown back or logged */
export const LICENCE_KEY = /^av_[A-Za-z0-9_-]{20,64}$/;

async function licenceNow() {
  let check = { reached: false };
  try { const r = await fetch(new URL(`v1/licence?account=${encodeURIComponent(CONFIG.account ?? "unset")}`, LICENCE_URL), { signal: AbortSignal.timeout(4000) }); if (r.ok) check = { reached: true, signed: await r.json() }; } catch {}
  const st = licenceState({ now: Date.now(), check, last: licenceLast(), publicKeyPem: keyPem("licence-public.pem"), owner: CONFIG.owner ?? null });
  if (st.last) saveLicence(st.last);
  return st;
}
const limitLine = planLimitLine;

const page = () => readFileSync(join(HERE, "ui.html"), "utf8").replace("/*SUNRISE*/", cssVariables());
let updateFound = null;
/* RR-306 A3: the client's own keys — pasted in the app, kept in Windows' secure store (Credential Manager); this computer's settings by NAME
 * as a fallback. A memory store only for tests (config testSecretsInMemory) — nothing persists there. */
const KEYS = keyStore({ backend: CONFIG.testSecretsInMemory === true ? memoryBackend() : process.platform === "win32" ? windowsBackend() : null, env: process.env });
const KEY_ALLOWED = new Set([KEY_NAMES.youtube, KEY_NAMES.search, ...AI_PROVIDERS.map((p) => p.keyName)]);
/* RR-306 B + C: the product's YouTube — the right channel, always, and advice (desktop/youtube-app.mjs) */
/* RR-311: the client's AI cost ledger (a monthly cap the client sets, default $10) and the per-product YouTube sign-in */
const LEDGER = aiLedger(join(DATA, "ai-usage.json"), { cap: () => Number(CONFIG.aiMonthlyCapUSD ?? DEFAULT_CAP_USD) });
const YT_SIGNIN = youtubeSignin({ keys: KEYS, config: CONFIG });
const YT = youtubeApp({ store, dataDir: DATA, keys: KEYS, config: CONFIG, ledger: LEDGER, signin: YT_SIGNIN });
/* a YouTube or key error says what happened in plain words — never a URL (the key travels in one) */
/* RR-313 A3: what Google said, in plain words — never "could not be reached" when it answered */
const safeWhy = (e) => (e?.status ? plainYouTubeWhy(e) : "no answer from YouTube");

/* ── RR-307 · act at once: the check, the score card, what was found, the feature cards, Google, delete ── */
const GOOGLE = googleConnect({ keys: KEYS, config: CONFIG });
/* RR-314 A1: Google's sign-in page in the client's OWN browser (desktop/open-browser.mjs); the stand-in addresses only in tests */
const openInBrowser = browserOpener({ origins: [CONFIG.youtubeTestEndpoints?.auth, CONFIG.googleTestEndpoints?.auth], mode: CONFIG.testOpener === "fetch" ? "fetch" : null });
/* RR-313 B1: is Google sign-in switched on — the client id (not a secret) and whether its secret is saved; never the secret */
const googleClientStatus = () => ({ on: Boolean(CONFIG.googleClientId && KEYS.status("GOOGLE_CLIENT_SECRET").saved), clientId: CONFIG.googleClientId ?? null, secretSaved: KEYS.status("GOOGLE_CLIENT_SECRET").saved, signedIn: GOOGLE.status().signedIn });
const allowLocal = CONFIG.testAllowLocalSites === true; // TESTS ONLY: a stand-in site on this computer
const pfile = (id, name) => join(store.dirOf(id), name);
const pread = (id, name, d = null) => { try { return JSON.parse(readFileSync(pfile(id, name), "utf8")); } catch { return d; } };
const pwrite = (id, name, obj) => { writeFileSync(`${pfile(id, name)}.tmp`, JSON.stringify(obj)); renameSync(`${pfile(id, name)}.tmp`, pfile(id, name)); };
const hasWebsite = (s) => Boolean(s.product?.site) && !/youtube\.com/i.test(s.product.site) && s.setup?.goal?.hasWebsite !== false;
const checking = new Map(); // product id → a running check (one at a time per product)
/* RR-307 (owner, 22 Oct): a running check says how far it is — never a second "Check my product now" while one runs */
const progress = new Map(); // product id → { stage, done, of, secondsLeft, started }
/** CHECK NOW: read the site (robots obeyed) and/or the confirmed YouTube channel; keep the facts (never the pages' HTML) and the score card */
async function checkProduct(id) {
  if (checking.has(id)) return checking.get(id);
  const started = Date.now();
  const say = (p) => progress.set(id, { ...p, started });
  say({ stage: "Starting", done: 0, of: 1, secondsLeft: null }); // before the run: the reader's own first step must not be overwritten
  const run = (async () => {
    const s = store.read(id), on = new Date().toISOString();
    let site = null, youtube = null;
    /* RR-308 C6: before every check, the saved address must open — an old wrong address (a "www." that does not open) is caught here and the
     * client is sent to Settings; the site is not read and no score is given */
    if (hasWebsite(s)) {
      say({ stage: "Testing that your website's address opens", done: 0, of: 1, secondsLeft: null });
      const o = await addressOpens(s.product.site, { allowLocal }).catch(() => ({ ok: false, why: "That address does not open — check it in your browser." }));
      if (!o.ok) site = { ok: false, why: `${s.product.site}: ${o.why}`, suggestion: o.suggestion ?? null, unreachable: true };
      else { try { site = await readSite({ url: s.product.site, allowLocal, on, onProgress: say }); } catch (e) { site = { ok: false, why: "the site could not be read now" }; } }
    }
    const ytOpts = { productUrl: s.product?.site ?? null, productIsChannel: /youtube\.com/i.test(String(s.product?.site ?? "")), relatedPages: s.setup?.youtube?.relatedPages ?? [] };
    if (s.setup?.youtube?.confirmed) { say({ stage: "Reading your YouTube channel", done: 0, of: 1, secondsLeft: null }); try { const r = await YT.read(id); youtube = { confirmed: true, videos: r.videos, opts: ytOpts, check: (await import("../src/video/youtube.mjs")).channelCheck(r.videos, ytOpts) }; } catch (e) { youtube = { why: `YouTube could not be read now (${safeWhy(e)})` }; } }
    else if (s.setup?.youtube?.handle) youtube = { why: "Not measured — confirm your YouTube channel first (YouTube settings)" };
    const card = scoreCard({ site, youtube, on, noWebsite: !hasWebsite(s) });
    if (site?.ok) { const { pageReads, ...keep } = site; pwrite(id, "site-read.json", keep); }
    pwrite(id, "check.json", card);
    /* RR-310 A2: the action plan is made again after every check */
    say({ stage: "Making your action plan", done: 0, of: 1, secondsLeft: null });
    if (!card.failed) { try { await buildPlan(id); } catch {} } // a failed check keeps no plan made from an old read
    return card;
  })().finally(() => { checking.delete(id); progress.delete(id); });
  checking.set(id, run);
  return run;
}
const progressOf = (id) => { const p = progress.get(id); return p ? { ...p, seconds: Math.round((Date.now() - p.started) / 1000) } : null; };
const searchConsoleOf = (id) => pread(id, "search-console.json");
function contextOf(id) {
  const s = store.read(id), site = pread(id, "site-read.json"), sc = searchConsoleOf(id), files = (() => { try { return JSON.parse(readFileSync(pfile(id, "search-data-files.json"), "utf8")); } catch { return []; } })();
  return { s, site, sc, files, ctx: { hasSite: hasWebsite(s), noWebsite: !hasWebsite(s), siteRead: site, youtubeConfirmed: Boolean(s.setup?.youtube?.confirmed), youtubeKey: KEYS.status(KEY_NAMES.youtube).saved, searchConsole: Boolean(sc), files: files.length > 0, drafts: Boolean(pread(id, "pages.json")?.drafts?.length), check: pread(id, "check.json"), aiKey: AI_PROVIDERS.some((p) => KEYS.status(p.keyName).saved) } };
}
/* ── RR-308 D · publishing ── */
/* each product's connection key has its own NAME in Windows' secure store (two products may be two WordPress sites) */
const publishKeyName = (kind, id) => { const k = TARGETS.find((x) => x.id === kind)?.keyName; return k ? `${k}_${id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`.slice(0, 64) : null; }; // "Download the files" has no key
const downloadsFor = (id) => join(CONFIG.downloadsDir ?? join(homedir(), "Downloads", "AlmiVisibility"), id);
/** Approve & Publish ONE draft: the five gates judge it again right before (as the client edited it); a failing gate stops it, said */
async function publishOne(id, url) {
  if (isAlmiWorld(store.read(id))) return { ok: false, why: ALMIWORLD_NO }; // RR-310 D5
  const conn = pread(id, "publish.json");
  if (!conn?.kind) return { ok: false, needsConnection: true, why: "First choose where your site is built (Publish settings)." };
  const { s, site, sc, files } = contextOf(id);
  if (!site) return { ok: false, why: "Check your product first — the gates need your site's latest read." };
  const again = seoPages({ site, searchConsole: sc, files, youtube: s.setup?.youtube?.confirmed ? YT.foundFor(id) : null, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}) });
  const d = again.drafts.find((x) => x.url === url);
  if (!d) return { ok: false, why: "This draft is out of date — what Visibility knows changed since it was made. Press Create SEO pages again." };
  if (!d.readyAsDraft) return { ok: false, gates: d.gates, why: `Not published — a check failed right before publishing: ${d.gates.filter((g) => !g.pass && g.failing.length).map((g) => `${g.words}: ${g.failing.join("; ")}`).join(" · ")}` };
  if ((pread(id, "published.json", [])).some((x) => x.url === url && x.state === "LIVE")) return { ok: false, why: "This page is already published." };
  const t = conn, keyNeeded = TARGETS.find((x) => x.id === t.kind).keyName;
  const out = await publishDraft({ draft: d, target: t, key: keyNeeded ? KEYS.get(publishKeyName(t.kind, id)) : null, downloadsDir: downloadsFor(id), allowLocal, testBase: CONFIG.testPublishBase ?? null });
  if (!out.ok) return out;
  pwrite(id, "published.json", [...pread(id, "published.json", []), { url, title: d.title, target: t, remote: out.remote, live: out.live, saved: out.saved ?? null, on: new Date().toISOString(), state: "LIVE" }]);
  /* D4: Search Console — the sitemap submitted only with the client's extra permission; otherwise said what to do */
  let sitemap = null;
  if (out.live && sc?.kind === "CONNECTED" && CONFIG.googleCanSubmit === true) { const g = await GOOGLE.submitSitemap(sc.site, `${site.origin}/sitemap.xml`); sitemap = g.ok ? `Your sitemap was sent to Google Search Console (${site.origin}/sitemap.xml).` : g.why; }
  else if (out.live) sitemap = "Tell Google about the new page: Search Console → Sitemaps → submit your sitemap (or connect Google with \"also tell Google about my new pages\").";
  return { ok: true, live: out.live, saved: out.saved ?? null, sitemap, line: out.live ? `Published ✓ — live at ${out.live}` : `Saved ✓ — the page's files are in ${out.saved}. Put index.html on your site at ${url} (the folder has a note saying where).` };
}
/** the product's to-do: steps skipped, sources missing */
function todoOf(id) {
  const { s, ctx } = contextOf(id);
  const steps = stepsFor(s.setup);
  /* a source already connected another way (Search Console data, a confirmed channel) is not a to-do */
  const done = { searchData: Boolean(searchConsoleOf(id)) || ctx.files, youtube: ctx.youtubeConfirmed, aiConnection: ctx.aiKey };
  const skipped = steps.filter((x) => x.optional && !done[x.id] && (s.setup[x.id]?.skipped || !s.setup[x.id])).map((x) => ({ what: x.title, action: x.id }));
  const yt = s.setup?.youtube?.handle && !ctx.youtubeConfirmed ? [{ what: "Confirm your YouTube channel", action: "youtube" }] : [];
  return [...skipped, ...yt];
}

/* ── RR-310 · the action plan, "What I will do for you", submitting, the weekly check ── */
/* AlmiWorld's OWN products (its sites, its channel): the plan is shown, nothing is published or submitted (owner's rule, RR-310 D5) */
const ALMIWORLD_NO = "AlmiWorld's own product: nothing is published or submitted from here (owner's rule). The plan and the drafts are yours to read.";
const didIt = (id, what) => pwrite(id, "done.json", [...pread(id, "done.json", []), { on: new Date().toISOString(), what }].slice(-100));
const planning = new Map();
/** the product's ACTION PLAN, from its last check, its YouTube advice (read today, or read now) and its page plan — kept in plan.json */
async function buildPlan(id) {
  if (planning.has(id)) return planning.get(id);
  const run = (async () => {
    const { s, site, sc, files, ctx } = contextOf(id), on = new Date().toISOString();
    let advice = null;
    if (ctx.youtubeConfirmed && ctx.youtubeKey) { try { const a = await YT.advice(id); advice = a.state === "READY" ? a : null; } catch { advice = null; } }
    const ytFound = ctx.youtubeConfirmed ? YT.foundFor(id) : null, ytData = ytFound?.state === "READY" ? ytFound : null;
    const web = hasWebsite(s) && site?.ok ? site : null;
    const pages = web ? seoPages({ site: web, searchConsole: sc, files, youtube: ytData, on, overrides: pread(id, "edits.json", {}) }) : null;
    const found = foundInfo({ site: web, youtube: ytData, files, searchConsole: sc, keys: { ai: ctx.aiKey }, on });
    const plan = actionPlan({ product: s.product, on, card: ctx.check, site: web, pages, found, youtube: advice, languages: s.setup?.languages?.codes ?? [], youtubeOnly: !hasWebsite(s) });
    pwrite(id, "plan.json", plan);
    return plan;
  })().finally(() => planning.delete(id));
  planning.set(id, run);
  return run;
}
const weeklyOf = (id) => { const w = pread(id, "weekly.json", {}), c = pread(id, "check.json"); const last = c?.on ?? null; return { on: w.on !== false, last, next: last ? new Date(Date.parse(last) + 7 * 864e5).toISOString() : null }; };
const willDoOf = (id, plan) => { const s = store.read(id), sc = searchConsoleOf(id), inx = pread(id, "indexnow.json");
  return willDo(plan, { mode: s.setup?.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES, connected: Boolean(pread(id, "publish.json")?.kind), almiworld: isAlmiWorld(s), drafts: pread(id, "pages.json")?.drafts ?? [], live: pread(id, "published.json", []).filter((r) => r.state === "LIVE"), submitted: pread(id, "submissions.json", {}), canSubmitGoogle: sc?.kind === "CONNECTED" && CONFIG.googleCanSubmit === true, indexNowReady: inx?.verified === true, weekly: weeklyOf(id), product: subjectOf({ what: s.setup?.product?.what, name: s.product?.name }) }); };
/** Create SEO pages: the drafts (kept in pages.json); published at once only when the client chose "automatically after the gates" */
async function createPages(id) {
  const { s, site, sc, files, ctx } = contextOf(id);
  const yt = ctx.youtubeConfirmed ? YT.foundFor(id) : null;
  const pages = seoPages({ site, searchConsole: sc, files, youtube: yt?.state === "READY" ? yt : null, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}) });
  pwrite(id, "pages.json", pages);
  /* RR-308 D5: the client chose "publish automatically after the gates" AND connected a site → each draft that passes is published now */
  let auto = null;
  if ((s.setup?.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES) === PUBLISH_MODE.AUTO_AFTER_GATES && pread(id, "publish.json")?.kind && !isAlmiWorld(s)) { auto = []; for (const d of pages.drafts.filter((x) => x.readyAsDraft)) auto.push({ url: d.url, ...(await publishOne(id, d.url)) }); }
  return { pages, auto };
}
/** D3 · submit the published pages: Google (the sitemap, through the client's own Search Console) and Bing (IndexNow, the client's key file) */
async function submitAll(id) {
  const s = store.read(id);
  if (isAlmiWorld(s)) return { ok: false, why: ALMIWORLD_NO };
  const live = pread(id, "published.json", []).filter((r) => r.state === "LIVE" && r.live);
  if (!live.length) return { ok: false, why: "Nothing is published yet — publish a page first, then submit it." };
  const site = pread(id, "site-read.json"), origin = site?.origin ?? new URL(s.product.site).origin, sc = searchConsoleOf(id), on = new Date().toISOString();
  const subs = pread(id, "submissions.json", {}), lines = [];
  const fx = fetch;
  /* Google: the sitemap, sent through the client's own connection; each page said "in it" or not */
  if (sc?.kind === "CONNECTED" && CONFIG.googleCanSubmit === true) {
    const g = await GOOGLE.submitSitemap(sc.site, `${origin}/sitemap.xml`);
    for (const r of live) subs[r.live] = { ...subs[r.live], google: g.ok ? ((await inSitemap({ origin, url: r.live, fetchImpl: fx })) ? { state: "SUBMITTED", on, note: "through your sitemap" } : { state: "FAILED", on, why: "your sitemap was sent, but this page is not in it yet — most website builders add it within a day; press Submit again then" }) : { state: "FAILED", on, why: g.why } };
    lines.push(g.ok ? `Google: your sitemap was sent through your Search Console (${origin}/sitemap.xml).` : `Google: ${g.why}`);
  } else { for (const r of live) subs[r.live] = { ...subs[r.live], google: { state: "NOT_YET", why: "connect Google Search Console with \"also tell Google about my new pages\"" } }; lines.push("Google: not sent — connect Google Search Console with \"also tell Google about my new pages\" (Overview → Connect Google)."); }
  /* Bing: IndexNow, after the key file is checked on the site */
  const inx = pread(id, "indexnow.json") ?? { key: newIndexNowKey() }; pwrite(id, "indexnow.json", inx);
  const kf = await checkKeyFile({ origin, key: inx.key, fetchImpl: fx });
  if (!kf.ok) { pwrite(id, "indexnow.json", { ...inx, verified: false }); for (const r of live) subs[r.live] = { ...subs[r.live], bing: { state: "FAILED", on, why: `your IndexNow key file is not on your site yet (${kf.why})` } }; lines.push(`Bing: not sent — first put your key file on your site: ${keyFileHowTo(origin, inx.key)[0]}`); }
  else {
    pwrite(id, "indexnow.json", { ...inx, verified: true });
    const b = await indexNow({ urls: live.map((r) => r.live), key: inx.key, origin, endpoint: allowLocal && CONFIG.indexNowEndpoint ? CONFIG.indexNowEndpoint : INDEXNOW_ENDPOINT, fetchImpl: fx });
    for (const r of live) subs[r.live] = { ...subs[r.live], bing: b.ok && b.urls.includes(r.live) ? { state: "SUBMITTED", on, note: "IndexNow" } : { state: "FAILED", on, why: b.why ?? "not on this site" } };
    lines.push(b.ok ? `Bing: ${b.line} (${b.urls.length} page${b.urls.length === 1 ? "" : "s"}, IndexNow).` : `Bing: ${b.why}.`);
  }
  pwrite(id, "submissions.json", subs);
  didIt(id, `Submitted ${live.length} published page${live.length === 1 ? "" : "s"} — ${lines.join(" ")}`);
  return { ok: true, lines, pages: submissionLines(live, subs) };
}
/* D4 · the weekly check: a product whose last check is a week old is checked again (its plan made again); a client who chose "publish
 * automatically" also gets the new drafts published and submitted — never for AlmiWorld's own products. Only while the app is open. */
async function weeklyRound() {
  for (const p of store.list()) {
    const id = p.id; if (!weeklyOf(id).on || checking.has(id)) continue;
    const c = pread(id, "check.json"); if (!c?.on || Date.now() - Date.parse(c.on) < 7 * 864e5) continue;
    try {
      await checkProduct(id); didIt(id, "Weekly check: checked again and made the action plan again.");
      const s = store.read(id);
      if (hasWebsite(s) && !isAlmiWorld(s) && (s.setup?.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES) === PUBLISH_MODE.AUTO_AFTER_GATES && pread(id, "publish.json")?.kind) {
        const r = await createPages(id); const n = (r.auto ?? []).filter((x) => x.ok).length;
        if (n) { didIt(id, `Weekly: published ${n} new page${n === 1 ? "" : "s"} (your choice: automatically after the five checks).`); await submitAll(id); }
      }
    } catch {}
  }
}
setTimeout(() => { weeklyRound(); setInterval(weeklyRound, 3600e3).unref(); }, Number.isInteger(CONFIG.weeklyFirstMs) ? CONFIG.weeklyFirstMs : 5 * 60e3).unref();

const server = createServer((req, res) => {
  const send = (code, obj, type = "application/json") => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(type === "application/json" ? JSON.stringify(obj) : obj); };
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 6_000_000) req.destroy(); });
  req.on("end", async () => {
    try {
      const u = new URL(req.url, "http://127.0.0.1");
      const json = () => (body ? JSON.parse(body) : {});
      /* RR-306: the app answers its own window only — a POST sent by another website (its Origin header) is refused (keys are saved here) */
      if (req.method === "POST" && req.headers.origin && req.headers.origin !== `http://127.0.0.1:${server.address().port}`) return send(403, { refused: "not from this app" });
      if (req.method === "GET" && u.pathname === "/") return send(200, page(), "text/html; charset=utf-8");
      if (req.method === "GET" && u.pathname === "/brand/almiworld-logo.png") return send(200, readFileSync(join(HERE, "brand", "almiworld-logo.png")), "image/png");
      if (req.method === "GET" && u.pathname === "/company-logo") { const c = store.company(); const f = c?.logoFile ? join(DATA, c.logoFile) : null; return f && existsSync(f) ? send(200, readFileSync(f), "image/png") : send(404, { refused: "no company logo" }); }
      /* the home screen: the company, its products, the plan limit */
      if (req.method === "GET" && u.pathname === "/api/home") {
        const st = await licenceNow();
        const products = store.list();
        return send(200, { version: VERSION, company: store.company(), products: products.map(productCard), licence: st.line, limit: limitLine(st, products.length), plans: plansView(), mayAdd: mayAddProduct(st, products.length).ok, accountSet: Boolean(CONFIG.account), google: googleClientStatus() });
      }
      /* RR-313 B1: ONE place to switch Google sign-in on (YouTube AND Search Console use the same client) — the client id is shown, the secret never */
      if (req.method === "GET" && u.pathname === "/api/google/client") return send(200, googleClientStatus());
      if (req.method === "POST" && u.pathname === "/api/company") {
        const c = json();
        /* RR-305 B1: "www.almiworld.com" and "almiworld.com" are accepted; https:// is added */
        c.site = webAddress(c.site);
        if (!c.name?.trim() || !c.site) return send(400, { refused: "Give your company's name and its main website (for example almiworld.com)." });
        /* RR-307 E3: the address must really open (never a "www." added) — or the client says to save it anyway */
        if (c.saveAnyway !== true) { const o = await addressOpens(c.site, { allowLocal }); if (!o.ok) return send(400, { refused: `${o.why}${o.suggestion ? ` Did you mean ${o.suggestion}?` : ""}`, suggestion: o.suggestion ?? null, canSaveAnyway: true }); }
        let logoFile = store.company()?.logoFile ?? null;
        if (typeof c.logoPng === "string" && c.logoPng.startsWith("data:image/png;base64,")) { logoFile = "company-logo.png"; writeFileSync(join(DATA, logoFile), Buffer.from(c.logoPng.slice(22), "base64")); }
        store.setCompany({ name: c.name.trim(), site: c.site.trim(), logoFile });
        return send(200, { ok: true });
      }
      if (req.method === "POST" && u.pathname === "/api/products") {
        const st = await licenceNow();
        const count = store.list().length;
        const may = mayAddProduct(st, count);
        if (!may.ok) return send(403, { refused: limitLine(st, count), licence: st.line });
        const p = json();
        /* RR-307 D1: the two plain questions come first — what to grow, and whether there is a website; the website is asked only then */
        const goal = p.goal ?? null;
        if (goal && checkStep("goal", goal)) return send(400, { refused: checkStep("goal", goal) });
        const needsSite = !goal || goal.hasWebsite === true;
        p.site = p.site ? webAddress(p.site) : null;
        if (!p.name?.trim() || (needsSite && !p.site)) return send(400, { refused: needsSite ? "Give the product's name and its website (for example shop.almiworld.com)." : "Give the product's name." });
        if (p.site && p.saveAnyway !== true && !/youtube\.com/i.test(p.site)) { const o = await addressOpens(p.site, { allowLocal }); if (!o.ok) return send(400, { refused: `${o.why}${o.suggestion ? ` Did you mean ${o.suggestion}?` : ""}`, suggestion: o.suggestion ?? null, canSaveAnyway: true }); }
        const made = store.create({ name: p.name.trim(), site: p.site ? p.site.trim() : null });
        if (goal) { const st2 = store.read(made.id); st2.setup.goal = { grow: goal.grow, hasWebsite: goal.hasWebsite }; store.write(made.id, st2); }
        /* RR-307 A1: the check starts the moment the product is added — the client carries on with setup meanwhile */
        if (p.site) checkProduct(made.id).catch(() => {});
        return send(200, { ok: true, product: productCard(store.read(made.id)), checking: Boolean(p.site) });
      }
      /* one product's own work: only through its own id, only in its own folder */
      const m = /^\/api\/products\/([^/]+)\/(state|setup|views)$/.exec(u.pathname);
      if (m) {
        const id = decodeURIComponent(m[1]);
        let s;
        try { s = store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
        if (req.method === "GET" && m[2] === "state") return send(200, { id, checking: checking.has(id), product: s.product, steps: stepsFor(s.setup), choices: CHOICES, howTo: HOWTO, recommended: Object.fromEntries(STEPS.map((x) => [x.id, recommended(x.id, s.setup)])), setup: s.setup, started: s.started, languages: LANGUAGES, articleSettings: settingsView(articleSettings({ articlesPerDay: s.setup.articlesPerDay?.perDay ?? 1, publishMode: s.setup.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES })) });
        if (req.method === "POST" && m[2] === "setup") {
          const st = await licenceNow();
          if (!st.mayStartNewWork) return send(403, { refused: st.line });
          let { id: step, value } = json();
          if (step === "product" && value && webAddress(value.site)) value.site = webAddress(value.site);
          if (step === "product" && value && !value.site) value.site = s.setup?.goal?.hasWebsite === false ? (s.product?.site && /youtube\.com/i.test(s.product.site) ? s.product.site : null) : value.site;
          /* RR-307 E3: a changed website must really open (or "save anyway") */
          if (step === "product" && value?.site && value.site !== s.product?.site && value.saveAnyway !== true && !/youtube\.com/i.test(value.site)) { const o = await addressOpens(value.site, { allowLocal }); if (!o.ok) return send(400, { refused: `${o.why}${o.suggestion ? ` Did you mean ${o.suggestion}?` : ""}`, suggestion: o.suggestion ?? null, canSaveAnyway: true }); }
          if (step === "product" && value) delete value.saveAnyway;
          /* RR-306 A2: an optional step skipped — "not now"; it can be changed later from the product's Settings */
          if (value?.skipped === true) { if (!STEPS.find((x) => x.id === step)?.optional) return send(400, { refused: "This step cannot be skipped." }); value = { skipped: true }; }
          const why = checkStep(step, value);
          if (why) return send(400, { refused: why });
          /* RR-306 A3: a pasted key goes to Windows' secure store; the product's setup keeps only which key it uses */
          const keep = (name, key) => { if (!String(key ?? "").trim()) return null; const r = KEYS.set(name, key); return r.ok ? null : r.why; };
          if (!value?.skipped && step === "aiConnection" && value.provider) { const p = AI_PROVIDERS.find((x) => x.id === value.provider); const bad = keep(p.keyName, value.key); if (bad) return send(400, { refused: bad }); value = { provider: p.id, keyName: p.keyName }; }
          if (!value?.skipped && step === "searchData") { if (Number(value.option) === 1) { const bad = keep(KEY_NAMES.search, value.key); if (bad) return send(400, { refused: bad }); } value = { option: Number(value.option) }; }
          if (step === "youtube" && !value?.skipped && value.handle) { const bad = keep(KEY_NAMES.youtube, value.key); if (bad) return send(400, { refused: bad }); const r = YT.saveSettings(id, { handle: value.handle }); if (!r.ok) return send(400, { refused: r.why }); s = store.read(id); }
          else if (step === "start") { const open = stepsFor(s.setup).filter((x) => x.id !== "start" && !s.setup[x.id]); if (open.length) return send(400, { refused: `Answer these first: ${open.map((x) => x.title).join(", ")}.` }); s.started = true; }
          else s.setup[step] = step === "youtube" ? { skipped: true } : value;
          const siteChanged = step === "product" && (value.site ?? null) !== (s.product?.site ?? null);
          if (step === "product") s.product = { name: value.name, site: value.site ?? null };
          store.write(id, s);
          /* RR-307 A1: a new or changed website is checked at once */
          if (siteChanged && value.site) checkProduct(id).catch(() => {});
          return send(200, { ok: true });
        }
        if (req.method === "GET" && m[2] === "views") return send(200, {
          /* RR-307 A1: no "first report after the first day" — the check is made at once, on the product's Overview */
          reports: pread(id, "check.json") ? [`Last check: ${String(pread(id, "check.json").on).slice(0, 10)} — ${pread(id, "check.json").gauge} (${pread(id, "check.json").word}). Open the Overview for the details.`] : ["No check yet — press \"Check my product now\" on the Overview."],
          preview: (pread(id, "pages.json")?.drafts ?? []).length ? pread(id, "pages.json").drafts.map((p) => `Draft: ${p.title} — ${p.url}`) : ["No page or article yet. They appear here as drafts when you press \"Create SEO pages\"."],
          approvals: (s.approvals ?? []).length ? s.approvals : [s.setup.publishMode?.mode === PUBLISH_MODE.REVIEW_FIRST ? "Nothing waits for your approval yet." : "Publishing is automatic after the gates — nothing waits for you."],
          monthly: ["The monthly report appears at the end of the first month: bad news first, then what was made and refreshed, the search data, and next month's topics."],
          youtube: YT.quickLines(id),
        });
      }
      /* ── RR-307 · the product's Overview, Check now, Fix it for me, the feature cards, Google, delete ── */
      { const r = /^\/api\/products\/([^/]+)\/(overview|check|fix|feature\/[a-z-]+|google\/start|google\/site|google\/export|delete|plan|plan\/save|do|indexnow|indexnow\/check)$/.exec(u.pathname);
        if (r) {
          const id = decodeURIComponent(r[1]);
          try { store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          const { s, site, sc, files, ctx } = contextOf(id);
          if (r[2] === "overview" && req.method === "GET") {
            /* RR-308: what the YouTube research found, read from the saved research — never the whole channel on every Overview */
            const yt = ctx.youtubeConfirmed ? YT.foundFor(id) : null;
            /* RR-310: the plan (made after every check; a product checked before RR-310 gets it made now, once), what Visibility will do,
             * the YouTube-only view of an older card, the weekly state and what was done since the last check */
            const plan = pread(id, "plan.json");
            if (!plan && ctx.check && !checking.has(id) && !planning.has(id)) buildPlan(id).catch(() => {});
            const c0 = ctx.check, card = c0 && ctx.noWebsite && !c0.youtubeOnly && !c0.failed ? { ...c0, youtubeOnly: true, score: c0.youtube?.score ?? null, gauge: c0.youtube?.gauge ?? "Not measured", word: c0.youtube?.word ?? "Not measured", areas: c0.areas.filter((a) => a.area === "YouTube") } : c0;
            const since = pread(id, "done.json", []).filter((d) => !c0?.on || d.on >= c0.on).slice(-8);
            return send(200, { plan, planning: planning.has(id) || (!plan && Boolean(ctx.check)), willDo: plan ? willDoOf(id, plan) : null, weekly: weeklyOf(id), since, almiworld: isAlmiWorld(s), noWebsite: ctx.noWebsite,
              checking: checking.has(id), progress: progressOf(id), card, found: foundInfo({ site, youtube: yt?.state === "READY" ? yt : null, files, searchConsole: sc, keys: { ai: ctx.aiKey }, on: new Date().toISOString() }), menu: menuFor(ctx), todo: todoOf(id), google: { ...GOOGLE.status(), site: sc?.site ?? null, kind: sc?.kind ?? null, window: sc?.window ?? null }, howTo: HOWTO });
          }
          /* RR-307 (22 Oct): the check runs on; the screen follows its progress on the Overview (a running check is never started twice) */
          if (r[2] === "check" && req.method === "POST") { const already = checking.has(id); checkProduct(id).catch(() => {}); return send(200, { ok: true, started: !already, running: true, progress: progressOf(id) }); }
          /* RR-310 A2 · the action plan: made again on request; saved as a document the client keeps */
          if (r[2] === "plan" && req.method === "POST") { if (!ctx.check) return send(400, { refused: "Check your product first — the plan is made from the check." }); const p = await buildPlan(id); return send(200, { ok: true, plan: p, willDo: willDoOf(id, p) }); }
          if (r[2] === "plan/save" && req.method === "POST") {
            const p = pread(id, "plan.json"); if (!p) return send(400, { refused: "There is no action plan yet — press Check now first." });
            const dir = downloadsFor(id); mkdirSync(dir, { recursive: true });
            const file = join(dir, `Action plan - ${String(s.product?.name ?? id).replace(/[^\p{L}\p{N} ._-]+/gu, "").trim() || id} - ${String(p.on).slice(0, 10)}.html`);
            writeFileSync(file, planDocument(p, willDoOf(id, p)));
            didIt(id, "Saved the action plan as a document.");
            return send(200, { ok: true, file, line: `Saved ✓ — ${file}. Open it in your browser or in Word.` });
          }
          /* RR-310 D · "Do it for me", following the client's own publish choice; never published or submitted for AlmiWorld's own products */
          if (r[2] === "do" && req.method === "POST") {
            const what = json().what, aw = isAlmiWorld(s);
            if (what === "create-pages") { if (!ctx.hasSite || !site) return send(400, { refused: "Check your website first — the pages are answered from it." }); const x = await createPages(id); const n = x.pages.drafts.filter((d) => d.readyAsDraft).length, pub = (x.auto ?? []).filter((a) => a.ok).length; didIt(id, `Made ${n} page draft${n === 1 ? "" : "s"}${pub ? ` and published ${pub}` : ""}.`); return send(200, { ok: true, line: `${n} draft${n === 1 ? "" : "s"} made${pub ? `, ${pub} published` : ""} — read them under "Pages and articles".${aw ? ` ${ALMIWORLD_NO}` : ""}`, open: "pages" }); }
            if (what === "structure") { const p = pread(id, "plan.json"); return send(200, { ok: true, items: p ? [...p.thisWeek, ...p.rest].filter((i) => i.fixForMe === "structure" || i.id === "ai:faq") : [], line: "New pages have the structure built in. For your existing pages, here it is ready to paste:" }); }
            if (what === "publish") {
              if (aw) return send(200, { ok: false, refused: ALMIWORLD_NO });
              if (!pread(id, "publish.json")?.kind) return send(200, { ok: false, open: "publish-settings", line: "First tell Visibility where your site is built." });
              if ((s.setup?.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES) === PUBLISH_MODE.REVIEW_FIRST) return send(200, { ok: true, open: "approvals", line: "You chose to approve each page first — they wait for you under Approvals." });
              const live = new Set(pread(id, "published.json", []).filter((x) => x.state === "LIVE").map((x) => x.url)), out = [];
              for (const d of (pread(id, "pages.json")?.drafts ?? []).filter((x) => x.readyAsDraft && !live.has(x.url))) out.push({ url: d.url, ...(await publishOne(id, d.url)) });
              if (out.some((x) => x.ok)) didIt(id, `Published ${out.filter((x) => x.ok).length} page(s).`);
              return send(200, { ok: true, line: out.length ? out.map((x) => (x.ok ? x.line : `${x.url}: ${x.why}`)).join(" · ") : "Nothing new to publish — make pages first (line 1)." });
            }
            if (what === "submit") { const x = await submitAll(id); return send(200, x.ok ? x : { ok: false, refused: x.why }); }
            if (what === "weekly") { const w = pread(id, "weekly.json", {}); const on = w.on === false; pwrite(id, "weekly.json", { ...w, on }); return send(200, { ok: true, line: on ? "Weekly check: on — Visibility checks again a week after the last check, while it is open." : "Weekly check: off." }); }
            return send(400, { refused: "not something Visibility does" });
          }
          /* D3 · the IndexNow key file: the key (public by design — it sits on the client's own site), where to put it, and the check */
          if (r[2] === "indexnow" && req.method === "GET") { if (!ctx.hasSite) return send(400, { refused: "IndexNow needs a website." }); const inx = pread(id, "indexnow.json") ?? { key: newIndexNowKey() }; pwrite(id, "indexnow.json", inx); const origin = site?.origin ?? new URL(s.product.site).origin; return send(200, { key: inx.key, url: keyFileUrl(origin, inx.key), howTo: keyFileHowTo(origin, inx.key), verified: inx.verified === true, pages: submissionLines(pread(id, "published.json", []), pread(id, "submissions.json", {})), almiworld: isAlmiWorld(s) }); }
          if (r[2] === "indexnow/check" && req.method === "POST") { const inx = pread(id, "indexnow.json"); if (!inx) return send(400, { refused: "Open the IndexNow setup first." }); const origin = site?.origin ?? new URL(s.product.site).origin; const k = await checkKeyFile({ origin, key: inx.key }); pwrite(id, "indexnow.json", { ...inx, verified: k.ok }); return send(200, k.ok ? { ok: true, line: `Your key file is on your site ✓ (${keyFileUrl(origin, inx.key)}).` } : { ok: false, refused: k.why }); }
          if (r[2] === "fix" && req.method === "POST") { if (!site) return send(400, { refused: "Check your product first." }); return send(200, { items: fixForMe(json().id, site) }); }
          /* RR-309 A: delete removes THIS product's folder and THIS product's own publishing keys (named by its id) — never another product's,
           * never the licence, never the keys every product shares (YouTube, AI, search) */
          if (r[2] === "delete" && req.method === "POST") {
            if (json().confirm !== true) return send(400, { refused: "Say yes to delete." });
            if (checking.has(id)) return send(409, { refused: "A check of this product is running — wait for it to finish, then delete." });
            for (const t of TARGETS) { const k = publishKeyName(t.id, id); if (k && KEYS.status(k).saved) KEYS.remove(k); }
            store.remove(id);
            return send(200, { ok: true, line: `${s.product?.name} was deleted from this computer, with its saved data.` });
          }
          if (r[2] === "google/start" && req.method === "POST") { const g = GOOGLE.start(`http://127.0.0.1:${server.address().port}/oauth/google`, { submit: json().submit === true }); if (g.ok) CONFIG.googlePendingProduct = id; return send(g.ok ? 200 : 400, g.ok ? { ...g, opened: openInBrowser(g.url) } : { refused: g.why }); }
          if (r[2] === "google/site" && req.method === "POST") { const q = await GOOGLE.queries(json().site); if (!q) return send(400, { refused: "Google did not give the searches for that site — press Connect again." }); pwrite(id, "search-console.json", q); return send(200, { ok: true, line: `Connected ✓ — ${q.queries.length} searches read from Google Search Console (${q.window}).` }); }
          if (r[2] === "google/export" && req.method === "POST") { const x = importExport(json().files ?? [], { exportedOn: new Date().toISOString().slice(0, 10), source: `${s.product?.name} Search Console` }); if (!x.ok) return send(400, { refused: x.why }); pwrite(id, "search-console.json", x.data); return send(200, { ok: true, line: x.line }); }
          if (r[2].startsWith("feature/") && req.method === "POST") {
            const f = r[2].slice(8);
            const need = menuFor(ctx).cards.find((c) => c.id === f)?.needs ?? [{ what: "a feature this version has" }];
            if (need.length && f !== "keywords" && f !== "google") return send(200, { needs: need });
            /* RR-308: what the YouTube research found, read from the saved research — never the whole channel on every Overview */
            const yt = ctx.youtubeConfirmed ? YT.foundFor(id) : null;
            const ytData = yt?.state === "READY" ? yt : null;
            if (f === "check") { checkProduct(id).catch(() => {}); return send(200, { checking: true, progress: progressOf(id) }); }
            if (f === "seo-check") return send(200, { result: seoCheck(site, ctx.check) });
            if (f === "aeo") return send(200, { result: aeoCheck(site, pread(id, "plan.json")) });
            if (f === "geo") return send(200, { result: geoCheck(site) });
            if (f === "links") return send(200, { result: linksCheck(site) });
            if (f === "languages") return send(200, { result: languagesCheck(site, s.setup?.languages?.codes ?? []) });
            if (f === "keywords") return send(200, { found: foundInfo({ site, youtube: ytData, files, searchConsole: sc, keys: { ai: ctx.aiKey }, on: new Date().toISOString() }) });
            if (f === "youtube") return send(200, { open: "youtube" });
            if (f === "google") return send(200, { open: "google" });
            if (f === "publish") return send(200, { open: "publish" });
            if (f === "seo-pages" || f === "articles") {
              const pages = seoPages({ site, searchConsole: sc, files, youtube: ytData, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}) });
              pwrite(id, "pages.json", pages);
              /* RR-308 D5: the client chose "publish automatically after the gates" AND connected a site → each draft that passes is published now */
              let auto = null;
              if (f === "seo-pages" && (s.setup?.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES) === PUBLISH_MODE.AUTO_AFTER_GATES && pread(id, "publish.json")?.kind) { auto = []; for (const d of pages.drafts.filter((x) => x.readyAsDraft)) auto.push({ url: d.url, ...(await publishOne(id, d.url)) }); }
              if (f === "seo-pages") return send(200, { pages: { ...pages, drafts: pages.drafts.map(({ html, ...d }) => d) }, autoPublished: auto });
              const made = pread(id, "articles.json", []);
              const a = articleOfDay({ pages, earlier: made.map((x) => x.url), day: new Date().toISOString().slice(0, 10) });
              if (a.url) pwrite(id, "articles.json", [...made, { url: a.url, title: a.title, day: a.day }]);
              return send(200, { article: a.url ? { ...a, html: undefined, publishMode: s.setup?.publishMode?.mode ?? null } : a });
            }
            /* RR-310 B6: a YouTube-only product: posts from its newest videos (their own words), from the action plan */
            if (f === "social" && !pread(id, "pages.json")?.drafts?.length && ctx.noWebsite) { const p = pread(id, "plan.json"); return send(200, { socialVideos: p?.social ?? [], none: p ? null : "Press Check now first — the posts are made from your videos." }); }
            if (f === "social") { const p = pread(id, "pages.json"); const d = p?.drafts?.[0]; return send(200, { social: socialFor(d, p?.plan?.find((x) => x.kind === "NEW" && d?.title === x.question) ?? p?.plan?.find((x) => x.kind === "NEW")) }); }
            if (f === "monthly") { const rep = monthReport({ product: s.product?.name, month: new Date().toISOString().slice(0, 7), drafts: pread(id, "pages.json")?.drafts ?? [], searchRecord: sc?.record ?? null, youtube: ctx.youtubeConfirmed ? { connected: true, lines: await YT.lines(id) } : null }); return send(200, { report: { lines: rep.lines, attention: rep.attention } }); }
            return send(404, { refused: "not a feature of this version" });
          }
        } }
      /* ── RR-308 D · PUBLISH: where the site is built, Approve & Publish (the five gates again, right before), Edit, Unpublish ── */
      { const r = /^\/api\/products\/([^/]+)\/(publish|publish\/connect|publish\/draft|publish\/undo|draft\/edit)$/.exec(u.pathname);
        if (r) {
          const id = decodeURIComponent(r[1]);
          try { store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          const s = store.read(id), conn = pread(id, "publish.json"), keyName = conn?.kind ? publishKeyName(conn.kind, id) : null;
          if (r[2] === "publish" && req.method === "GET") return send(200, { submitted: submissionLines(pread(id, "published.json", []), pread(id, "submissions.json", {})), almiworld: isAlmiWorld(s), targets: TARGETS, target: conn, keySaved: keyName ? KEYS.status(keyName).saved : false, mode: s.setup?.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES, records: pread(id, "published.json", []), drafts: (pread(id, "pages.json")?.drafts ?? []).map(({ html, ...d }) => d), folder: downloadsFor(id) });
          if (r[2] === "publish/connect" && req.method === "POST") {
            const v = json(); const t = { kind: v.kind, site: v.site ? String(v.site).trim() : null, user: v.user ? String(v.user).trim() : null, repo: v.repo ? String(v.repo).trim() : null, branch: v.branch ? String(v.branch).trim() : null, folder: v.folder ? String(v.folder).trim() : "", shop: v.shop ? String(v.shop).trim().replace(/^https?:\/\//, "").replace(/\/+$/, "") : null };
            const bad = checkTarget(t, { allowLocal }); if (bad) return send(400, { refused: bad });
            const k = TARGETS.find((x) => x.id === t.kind).keyName;
            /* a WordPress application password is shown with spaces ("abcd efgh …"); WordPress takes it without them */
            if (k && String(v.key ?? "").trim()) { const saved = KEYS.set(publishKeyName(t.kind, id), t.kind === "wordpress" ? String(v.key).replace(/\s+/g, "") : v.key); if (!saved.ok) return send(400, { refused: saved.why }); }
            if (k && !KEYS.status(publishKeyName(t.kind, id)).saved) return send(400, { refused: "Paste the key for this connection — it is kept safely on this computer." });
            pwrite(id, "publish.json", t);
            return send(200, { ok: true, line: `Connected: ${TARGETS.find((x) => x.id === t.kind).label}. Drafts can now be published${t.kind === "download" ? ` as files in ${downloadsFor(id)}` : ""}.` });
          }
          if (r[2] === "draft/edit" && req.method === "POST") {
            const v = json(), p = pread(id, "pages.json"); const d = p?.drafts?.find((x) => x.url === v.url); if (!d) return send(404, { refused: "no such draft" });
            const e = editDraft(d, { title: v.title, main: v.main }); p.drafts = p.drafts.map((x) => (x.url === d.url ? e : x)); pwrite(id, "pages.json", p);
            pwrite(id, "edits.json", { ...pread(id, "edits.json", {}), [d.url]: e.html });
            return send(200, { ok: true, line: "Saved. The five checks run again when you press Approve & Publish." });
          }
          if (r[2] === "publish/draft" && req.method === "POST") return send(200, await publishOne(id, json().url));
          if (r[2] === "publish/undo" && req.method === "POST") {
            const v = json(), recs = pread(id, "published.json", []); const rec = recs.find((x) => x.url === v.url && x.state === "LIVE"); if (!rec) return send(404, { refused: "That page is not published." });
            const t = rec.target, k = TARGETS.find((x) => x.id === t.kind).keyName ? KEYS.get(publishKeyName(t.kind, id)) : null;
            const out = await unpublish({ record: rec, target: t, key: k, allowLocal, testBase: CONFIG.testPublishBase ?? null });
            if (!out.ok) return send(400, { refused: out.why });
            pwrite(id, "published.json", recs.map((x) => (x === rec ? { ...x, state: "UNPUBLISHED", undoneOn: new Date().toISOString() } : x)));
            return send(200, { ok: true, line: t.kind === "download" ? "Undone — the files were moved aside." : t.kind === "wordpress" ? "Undone — the page is a draft again on your WordPress site." : t.kind === "shopify" ? "Undone — the page is hidden in your shop." : "Undone — the page's file was removed from your repository (your site rebuilds by itself)." });
          }
        } }
      /* a draft page, opened in the app to read (never published) */
      { const r = /^\/api\/products\/([^/]+)\/draft$/.exec(u.pathname);
        if (r && req.method === "GET") { const id = decodeURIComponent(r[1]); try { store.read(id); } catch (e) { return send(400, { refused: e.message }); } const d = (pread(id, "pages.json")?.drafts ?? []).find((x) => x.url === u.searchParams.get("url")); return d ? send(200, d.html, "text/html; charset=utf-8") : send(404, { refused: "no such draft" }); } }
      /* RR-307 E1: Google sends the browser back here after the client signed in — the access is kept, then the site is picked in the app */
      /* RR-311 A · Google sends the channel owner's browser back here; it must be THIS product's confirmed channel, or it is forgotten */
      if (req.method === "GET" && u.pathname === "/oauth/youtube") {
        const r = await YT_SIGNIN.finish({ code: u.searchParams.get("code"), state: u.searchParams.get("state"), error: u.searchParams.get("error") });
        let ok = r.ok, why = r.why ?? "";
        if (r.ok) { const s = store.read(r.id), want = s.setup?.youtube?.confirmed?.channelId; if (!want || r.channelId !== want) { YT_SIGNIN.signOut(r.id); ok = false; why = `You signed in with the Google account of another channel (${r.channelTitle ?? "no channel"}) — sign in with the account that owns ${s.setup?.youtube?.confirmed?.title ?? "this product's channel"}. Nothing was kept.`; } else YT.refreshSigned(r.id, { force: true }).catch(() => {}); }
        const e = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
        return send(200, `<!doctype html><meta charset="utf-8"><title>AlmiVisibility</title><body style="font:16px system-ui;padding:40px"><h2>${ok ? "Signed in to YouTube ✓" : "Not connected"}</h2><p>${ok ? `${e(r.channelTitle ?? "")} — go back to AlmiVisibility; your channel's own data is read now.${r.write ? " \"Apply to YouTube\" is on." : ""}` : e(why)}</p></body>`, "text/html; charset=utf-8");
      }
      if (req.method === "GET" && u.pathname === "/oauth/google") {
        const r = await GOOGLE.finish({ code: u.searchParams.get("code"), state: u.searchParams.get("state"), error: u.searchParams.get("error") });
        const pid = CONFIG.googlePendingProduct ?? "";
        if (r.ok) { CONFIG.googleCanSubmit = r.canSubmit === true; saveConfig(); }
        return send(200, `<!doctype html><meta charset="utf-8"><title>AlmiVisibility</title><body style="font:16px system-ui;padding:40px"><h2>${r.ok ? "Signed in to Google ✓" : "Not connected"}</h2><p>${r.ok ? "Go back to AlmiVisibility and pick your site." : String(r.why).replace(/</g, "&lt;")}</p><p><a href="/#google=${encodeURIComponent(pid)}">Back to AlmiVisibility</a></p></body>`, "text/html; charset=utf-8");
      }
      if (req.method === "GET" && u.pathname === "/api/google/sites") { const sites = await GOOGLE.sites(); return send(sites ? 200 : 400, sites ? { sites } : { refused: "Not signed in to Google — press Connect." }); }
      if (req.method === "POST" && u.pathname === "/api/google/client") { const v = json(); if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(String(v.clientId ?? "").trim())) return send(400, { refused: "That is not a Google sign-in client id (it ends with .apps.googleusercontent.com)." }); const k = KEYS.set("GOOGLE_CLIENT_SECRET", v.secret); if (!k.ok) return send(400, { refused: k.why }); CONFIG.googleClientId = String(v.clientId).trim(); saveConfig(); return send(200, { ok: true, status: GOOGLE.status() }); }
      if (req.method === "POST" && u.pathname === "/api/google/signout") { GOOGLE.signOut(); return send(200, { ok: true }); }
      if (req.method === "GET" && u.pathname === "/api/choices") return send(200, CHOICES);
      /* RR-307 G1: the home screen asks too — the cards in general (a product is picked first) */
      if (req.method === "GET" && u.pathname === "/api/menu") return send(200, menuFor({ hasSite: false, siteRead: null, youtubeConfirmed: false, youtubeKey: KEYS.status(KEY_NAMES.youtube).saved, searchConsole: false, files: false, drafts: false, check: null, aiKey: false }));
      /* RR-307 D6: the first-run tour, shown once until closed */
      if (req.method === "GET" && u.pathname === "/api/tour") return send(200, { show: CONFIG.tourSeen !== true });
      if (req.method === "POST" && u.pathname === "/api/tour") { CONFIG.tourSeen = true; saveConfig(); return send(200, { ok: true }); }
      /* RR-303 A: the licence key from a purchase — saved, never echoed */
      if (req.method === "POST" && u.pathname === "/api/account") {
        const { licenceKey } = json();
        /* RR-304: the owner licence (avo_…) — kept only when THIS copy's public key verifies it */
        if (String(licenceKey ?? "").trim().startsWith("avo_")) {
          const signed = readOwnerLicenceText(licenceKey);
          if (!signed || !isOwnerLicence(signed.licence) || !verifyLicence(signed, keyPem("licence-public.pem"))) return send(400, { refused: "This owner licence could not be verified by this copy of Visibility — it was made with a different signing key, or the text is incomplete." });
          CONFIG.owner = signed; CONFIG.account = signed.licence.account; saveConfig();
          const st = await licenceNow();
          return send(200, { ok: true, line: st.line });
        }
        if (!LICENCE_KEY.test(String(licenceKey ?? "").trim())) return send(400, { refused: "That is not a licence key. It starts with av_ — copy it from the page shown after you bought your plan." });
        CONFIG.account = String(licenceKey).trim(); saveConfig();
        const st = await licenceNow();
        return send(200, { ok: true, line: st.line });
      }
      /* RR-306 A3: the client's keys — status only (never the key), save (pasted), remove */
      if (req.method === "GET" && u.pathname === "/api/keys") return send(200, { where: KEYS.where, available: KEYS.available, keys: Object.fromEntries([...KEY_ALLOWED].map((n) => [n, KEYS.status(n)])), aiProviders: AI_PROVIDERS });
      { const k = /^\/api\/keys\/([A-Z][A-Z0-9_]{2,63})(\/remove)?$/.exec(u.pathname);
        if (k && req.method === "POST") {
          if (!KEY_ALLOWED.has(k[1])) return send(400, { refused: "not a key this app uses" });
          if (k[2]) { KEYS.remove(k[1]); return send(200, { ok: true, status: KEYS.status(k[1]) }); }
          const r = KEYS.set(k[1], json().key);
          return r.ok ? send(200, { ok: true, status: KEYS.status(k[1]) }) : send(400, { refused: r.why });
        } }
      /* RR-303 D + RR-306 B/C: YouTube settings, the channel lookup and confirmation, the research, the advice, search-data files */
      { const y = /^\/api\/products\/([^/]+)\/youtube(?:\/(lookup|confirm|research|advice|file|write|signin|signout|signed|chapters|competitor|competitor\/remove|competitors\/refresh|apply|undo|coach|aicap|links))?$/.exec(u.pathname);
        if (y) {
          const yid = decodeURIComponent(y[1]);
          try { store.read(yid); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          try {
            if (!y[2] && req.method === "GET") return send(200, { ...YT.settings(yid), pilots: PILOT_CHANNELS });
            if (!y[2] && req.method === "POST") { const r = YT.saveSettings(yid, json()); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            if (y[2] === "lookup" && req.method === "POST") return send(200, await YT.lookup(yid, json().handle));
            /* RR-307 (22 Oct): a channel just confirmed is checked at once — the score card never keeps "confirm your channel first" */
            if (y[2] === "confirm" && req.method === "POST") { const r = await YT.confirm(yid, json()); if (r.ok) (checking.has(yid) ? checking.get(yid).catch(() => {}).then(() => checkProduct(yid)) : checkProduct(yid)).catch(() => {}); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            if (y[2] === "research" && req.method === "POST") { const r = await YT.research(yid); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            if (y[2] === "advice" && req.method === "GET") {
              const offset = Math.max(0, Number(u.searchParams.get("offset")) || 0);
              /* RR-311: the first page of the day brings the channel's own analytics (signed in) and the competitors' new uploads — once a day */
              if (!offset) { if (YT_SIGNIN.status(yid).signedIn) await YT.refreshSigned(yid).catch(() => null); const c = pread(yid, "youtube-competitors.json", {}); if (!c._on || String(c._on).slice(0, 10) !== new Date().toISOString().slice(0, 10)) await YT.refreshCompetitors(yid).catch(() => null); }
              return send(200, { ...(await YT.advice(yid, { offset })), almiworld: isAlmiWorld(store.read(yid)) });
            }
            if (y[2] === "write" && req.method === "POST") { const r = await YT.write(yid, json()); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            if (y[2] === "file" && req.method === "POST") { const r = YT.addFile(yid, json()); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            /* ── RR-311 A · YouTube sign-in (the channel owner, in his browser), its data, real chapters ── */
            if (y[2] === "signin" && req.method === "GET") { const st = YT_SIGNIN.status(yid); return send(200, { ready: st.ready, signedIn: st.signedIn, write: st.write }); } // RR-314 A1: the tab waits for this
            if (y[2] === "signin" && req.method === "POST") { const r = YT_SIGNIN.start(yid, `http://127.0.0.1:${server.address().port}/oauth/youtube`, { write: json().write === true }); return send(r.ok ? 200 : 400, r.ok ? { ok: true, url: r.url, opened: openInBrowser(r.url) } : { refused: r.why, adds: SIGNIN_ADDS }); }
            if (y[2] === "signout" && req.method === "POST") { YT_SIGNIN.signOut(yid); rmSync(pfile(yid, "youtube-signed.json"), { force: true }); return send(200, { ok: true, line: "Signed out of YouTube for this product. Visibility forgot the access and the analytics it had read." }); }
            if (y[2] === "signed" && req.method === "POST") { const r = await YT.refreshSigned(yid, { force: json().force === true }); return send(r.ok ? 200 : 400, r.ok ? { ok: true, on: r.data.on, reach: r.data.reach?.line ?? null } : { refused: r.why }); }
            if (y[2] === "chapters" && req.method === "POST") { const r = await YT.chapters(yid, json().videoId); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            /* ── C2 · competitors ── */
            if (y[2] === "competitor" && req.method === "POST") { const r = await YT.addCompetitor(yid, json()); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            if (y[2] === "competitor/remove" && req.method === "POST") return send(200, YT.removeCompetitor(yid, json().channelId));
            if (y[2] === "competitors/refresh" && req.method === "POST") { const r = await YT.refreshCompetitors(yid); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            /* ── D1 · Apply to YouTube (preview first; the old text kept; Undo) — with the client's permission; never AlmiWorld's own channel ── */
            if (y[2] === "apply" && req.method === "POST") {
              const v = json(), s = store.read(yid);
              if (isAlmiWorld(s)) return send(200, { ok: false, refused: "AlmiWorld's own channel: nothing is changed on YouTube from here (owner's rule)." });
              const st = YT_SIGNIN.status(yid);
              if (!st.signedIn || !st.write) return send(200, { ok: false, refused: "Turn on \"Apply to YouTube\" first: sign in to YouTube with that permission." });
              const items = (Array.isArray(v.items) ? v.items : []).slice(0, 50).filter((x) => /^[\w-]{6,20}$/.test(String(x.videoId ?? "")));
              if (!items.length) return send(400, { refused: "Nothing to apply." });
              const rows = [];
              for (const it of items) {
                const old = await YT_SIGNIN.snippet(yid, it.videoId); if (!old) { rows.push({ videoId: it.videoId, ok: false, why: "not found on YouTube" }); continue; }
                const next = { ...old, title: String(it.title ?? old.title).slice(0, 100), description: String(it.description ?? old.description).slice(0, 5000), tags: Array.isArray(it.tags) ? it.tags.slice(0, 30) : old.tags ?? [] };
                if (v.confirm !== true) { rows.push({ videoId: it.videoId, before: { title: old.title, description: old.description }, after: { title: next.title, description: next.description } }); continue; }
                try { await YT_SIGNIN.updateSnippet(yid, it.videoId, next); } catch (e) { rows.push({ videoId: it.videoId, ok: false, why: `YouTube refused (${e.status ?? "no answer"})` }); continue; }
                pwrite(yid, "youtube-applied.json", [...pread(yid, "youtube-applied.json", []), { videoId: it.videoId, on: new Date().toISOString(), before: { title: old.title, description: old.description, tags: old.tags ?? [] }, after: { title: next.title, description: next.description, tags: next.tags } }]);
                rows.push({ videoId: it.videoId, ok: true, title: next.title });
              }
              if (v.confirm === true && rows.some((x) => x.ok)) didIt(yid, `Applied to YouTube: ${rows.filter((x) => x.ok).length} video(s) changed (the old text kept — Undo puts it back).`);
              return send(200, { ok: true, preview: v.confirm !== true, rows });
            }
            if (y[2] === "undo" && req.method === "POST") {
              const v = json(), recs = pread(yid, "youtube-applied.json", []);
              const rec = recs.filter((x) => x.videoId === v.videoId && !x.undoneOn).at(-1); if (!rec) return send(404, { refused: "Nothing to undo for that video." });
              const old = await YT_SIGNIN.snippet(yid, rec.videoId); if (!old) return send(400, { refused: "That video was not found on YouTube." });
              await YT_SIGNIN.updateSnippet(yid, rec.videoId, { ...old, title: rec.before.title, description: rec.before.description, tags: rec.before.tags });
              pwrite(yid, "youtube-applied.json", recs.map((x) => (x === rec ? { ...x, undoneOn: new Date().toISOString() } : x)));
              didIt(yid, `Undone on YouTube: "${rec.before.title}" is back.`);
              return send(200, { ok: true, line: `Undone — the old title and description are back on YouTube ("${rec.before.title}").` });
            }
            /* ── D5 · the AI coach; B6 · the AI cost cap ── */
            if (y[2] === "coach" && req.method === "POST") {
              const s = store.read(yid), c = s.setup?.aiConnection, p = AI_PROVIDERS.find((x) => x.id === c?.provider || x.keyName === c?.keyName);
              if (!p || !KEYS.status(p.keyName).saved) return send(200, { ok: false, refused: "Connect your AI first (Settings → Your AI connection)." });
              if (p.id !== "anthropic") return send(200, { ok: false, refused: "The coach works with an Anthropic (Claude) key in this version." });
              const ok = LEDGER.allowed(); if (!ok.ok) return send(200, { ok: false, refused: ok.why });
              const facts = await YT.coachFacts(yid);
              const r = await askCoach({ key: KEYS.get(p.keyName), question: json().question, facts, ...(CONFIG.aiApiBase ? { base: CONFIG.aiApiBase } : {}) });
              if (r.usage) LEDGER.add(r.usage);
              return send(200, { ...r, refused: r.ok ? undefined : r.why, aiCost: LEDGER.line() });
            }
            if (y[2] === "links" && req.method === "POST") return send(200, YT.confirmLinks(yid, json())); // RR-314 B7: asked once
            if (y[2] === "aicap" && req.method === "POST") { const usd = Number(json().usd); if (!(usd >= 0 && usd <= 500)) return send(400, { refused: "Give a monthly limit between $0 and $500." }); CONFIG.aiMonthlyCapUSD = usd; saveConfig(); return send(200, { ok: true, line: LEDGER.line() }); }
          } catch (e) { return send(e.code === "NOT_SIGNED_IN" ? 400 : 502, { refused: e.code === "NOT_SIGNED_IN" ? "Sign in to YouTube again — Google's access has ended." : `${e?.status ? plainYouTubeWhy(e) : "YouTube could not be reached — no answer came."} Nothing was changed.` }); }
        } }
      if (req.method === "GET" && u.pathname === "/api/licence") { const st = await licenceNow(); return send(200, { state: st.state, line: st.line, mayStartNewWork: st.mayStartNewWork, plan: st.plan?.words ?? null, plans: PLANS.map((p) => p.words) }); }
      if (req.method === "GET" && u.pathname === "/api/update") { const r = await checkForUpdate({ channelUrl: UPDATE_URL, current: VERSION, publicKeyPem: keyPem("update-public.pem") }); updateFound = r.manifest ?? null; return send(200, { state: r.state, line: r.line }); }
      if (req.method === "POST" && u.pathname === "/api/update/install") {
        const { agree } = json();
        if (!updateFound) return send(400, { refused: "check for an update first" });
        const d = await downloadUpdate({ channelUrl: UPDATE_URL, manifest: updateFound, dataDir: DATA, publicKeyPem: keyPem("update-public.pem") });
        if (!d.ok) return send(400, { refused: d.why });
        const r = installUpdate({ agreed: agree === true, verified: true, file: d.file, launcher: join(INSTALL, "AlmiVisibility.exe"), quiet: CONFIG.quietUpdate === true });
        if (!r.ok) return send(400, { refused: r.why });
        send(200, { ok: true, line: `Installing ${d.version} — Visibility restarts by itself; your data is kept.` });
        return setTimeout(() => process.exit(0), 300);
      }
      if (req.method === "POST" && u.pathname === "/api/quit") { send(200, { ok: true }); return setTimeout(() => process.exit(0), 200); }
      send(404, { refused: "not found" });
    } catch (e) { send(500, { refused: e.message }); }
  });
});
server.listen(Number(arg("port", "0")), "127.0.0.1", () => {
  writeFileSync(join(DATA, "run.json"), JSON.stringify({ port: server.address().port, pid: process.pid, version: VERSION }));
});
