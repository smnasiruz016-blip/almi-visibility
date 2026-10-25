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
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, rmSync, readdirSync } from "node:fs";
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
import { guidePage } from "./guides.mjs";
import { aiLedger, askCoach, DEFAULT_CAP_USD } from "./ai-coach.mjs";
import { actionPlan, willDo, planDocument, isAlmiWorld, subjectOf } from "./action-plan.mjs";
import { plainYouTubeWhy } from "../src/video/youtube.mjs"; // RR-313 A3
import { writeWebWithAI, webMaterial, suggestOfficialPages, KINDS as WEB_KINDS, understandFormulaAI, researchQuestionsAI, figureLeadAI } from "./web-ai.mjs"; // RR-318 A
import { officialReader, officialClaims } from "./official.mjs"; // RR-318 B6
import { realityFilter, advise, listFromFile, DIMENSIONS } from "./page-count.mjs"; // RR-318 C
import { parseFormula, fromGuided, groupQuestions, faqQuestions, planPages, subjectProblem, formulaOf } from "./page-plan.mjs"; // RR-319
import { fiveAnswers, fiveFromList, questionsByCountry, browserSearchList, takeHandIn, takeSearchFile, searchFileText, figureOf } from "./research5.mjs"; // RR-320 B
import { recognitionOf, callNames } from "./recognition.mjs"; // RR-321 A
import { planFromList } from "./plan-list.mjs"; // RR-321 B
import { venueCountries, statisticsOf, gazetteerOf } from "./venues.mjs"; // RR-321 G1, B2; RR-327 the venue cities
import { readRates } from "./rates.mjs"; // RR-321 D5
import { sortQuestions } from "./questions.mjs"; // RR-321 C
import { readRegulator } from "./regulator-read.mjs"; // RR-321 A2/A4
import { regulatorPagesOf } from "./recognition.mjs"; // RR-322 A2
import { subtestFactsOf } from "./pseo.mjs"; // RR-322 B5
import { lightCheck, teachesHealth, professionsOfFields, professionsInName } from "./universities.mjs"; // RR-322 A1
import { subjectFactsOf, SUBJECT_FACT_PAGES, FACTS_FOR } from "./subject-facts.mjs"; // RR-323
import { checkSample, hashesOfPages, labelOf, displayNameOf } from "./samples.mjs"; // RR-323; RR-324 D2
import { localKeywordStore, mergeFile, mergeObservations, itemsOf, summaryOf, trendOf, currentOf, keyOf, fileIdOf, FILE_NAME, SOURCES as KW_SOURCES, byLocationOf } from "./keyword-db.mjs"; // RR-324 A; RR-327 per country
import { googleAds, ADS_KEYS } from "./google-ads.mjs"; // RR-324 B
import { keywordService, usageLine, SERVICE_LOCATIONS, serviceOnLine, SERVICE_OFF_LINE, PLAN_REUSE_DAYS, collectForPlan, countryFactsForPlan } from "./keyword-service.mjs"; // RR-326 E; RR-327 the plan reads it
import { dataForSeo, DFS_KEYS, emptyLedger as emptyDfsLedger, PRICES as DFS_PRICES } from "./dataforseo.mjs"; // RR-324 C
import { explainPagesAI, translatePagesAI, samplesAI } from "./web-ai.mjs"; // RR-322 A5, B4; RR-323 samples
import { browserList, browserInstruction, takeBrowserReads, textReader, listFromRows } from "./browser-list.mjs"; // RR-322 A2–A4, C2
import { CENTRAL_BANKS, PEGS } from "./rates.mjs"; // RR-322 A3
import { mondayReport, nextBatch, beforeExpand, refreshDue } from "./indexing.mjs"; // RR-322 C3
import { builtInList, HOWTO as LIST_HOWTO, WORLD_LISTS, draftList } from "./lists.mjs"; // RR-319 B
import { searchPower, mergeHistory } from "./search-power.mjs"; // RR-318 D
import { siteNameOf } from "./web-text.mjs";
import { destinationsIn, COUNTRIES } from "./world.mjs";
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
/* RR-326 E: the licence the app runs under (the owner's, or the last good check's) — what AlmiWorld's keyword service checks */
const currentLicence = () => CONFIG.owner ?? licenceLast()?.signed ?? null;
const kwService = () => keywordService({ siteUrl: CONFIG.keywordServiceUrl ?? LICENCE_URL, signed: currentLicence() });

const page = () => readFileSync(join(HERE, "ui.html"), "utf8").replace("/*SUNRISE*/", cssVariables());
let updateFound = null;
/* RR-306 A3: the client's own keys — pasted in the app, kept in Windows' secure store (Credential Manager); this computer's settings by NAME
 * as a fallback. A memory store only for tests (config testSecretsInMemory) — nothing persists there. */
const KEYS = keyStore({ backend: CONFIG.testSecretsInMemory === true ? memoryBackend() : process.platform === "win32" ? windowsBackend() : null, env: process.env });
const KEY_ALLOWED = new Set([KEY_NAMES.youtube, KEY_NAMES.search, ...AI_PROVIDERS.map((p) => p.keyName), ADS_KEYS.secret, DFS_KEYS.login, DFS_KEYS.password]); // RR-324 B/C: by name only
/* RR-306 B + C: the product's YouTube — the right channel, always, and advice (desktop/youtube-app.mjs) */
/* RR-311: the client's AI cost ledger (a monthly cap the client sets, default $10) and the per-product YouTube sign-in */
const LEDGER = aiLedger(join(DATA, "ai-usage.json"), { cap: () => Number(CONFIG.aiMonthlyCapUSD ?? DEFAULT_CAP_USD) });
const confirmedChannel = (id) => { try { return store.read(id).setup?.youtube?.confirmed ?? null; } catch { return null; } };
const YT_SIGNIN = youtubeSignin({ keys: KEYS, config: CONFIG, wantOf: (id) => confirmedChannel(id)?.channelId ?? null });
/* RR-315 A3: the last sign-in that was refused, per product (memory only) — the YouTube tab says which channel came back and offers Try again */
const YT_LAST = new Map();
const chooseLine = (c) => `Google will ask which account or channel. Choose ${c?.title ?? "this product's channel"} (it may be listed as a brand account under your email).`;
const YT = youtubeApp({ store, dataDir: DATA, keys: KEYS, config: CONFIG, ledger: LEDGER, signin: YT_SIGNIN });
/* a YouTube or key error says what happened in plain words — never a URL (the key travels in one) */
/* RR-313 A3: what Google said, in plain words — never "could not be reached" when it answered */
const safeWhy = (e) => (e?.status ? plainYouTubeWhy(e) : "no answer from YouTube");

/* ── RR-307 · act at once: the check, the score card, what was found, the feature cards, Google, delete ── */
const GOOGLE = googleConnect({ keys: KEYS, config: CONFIG });
/* RR-314 A1: Google's sign-in page in the client's OWN browser (desktop/open-browser.mjs); the stand-in addresses only in tests */
const openInBrowser = browserOpener({ origins: [CONFIG.youtubeTestEndpoints?.auth, CONFIG.googleTestEndpoints?.auth], mode: CONFIG.testOpener === "fetch" ? "fetch" : CONFIG.testSecretsInMemory === true && CONFIG.testOpener !== "browser" ? "none" : null }); // a test app opens no real browser unless it asks to
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
  return { s, site, sc, files, ctx: { hasSite: hasWebsite(s), noWebsite: !hasWebsite(s), siteRead: site, youtubeConfirmed: Boolean(s.setup?.youtube?.confirmed), youtubeKey: KEYS.status(KEY_NAMES.youtube).saved, searchConsole: Boolean(sc), searchConsoleKind: sc?.kind ?? null, files: files.length > 0, drafts: Boolean(pread(id, "pages.json")?.drafts?.length), check: pread(id, "check.json"), aiKey: AI_PROVIDERS.some((p) => KEYS.status(p.keyName).saved) } };
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
  const again = seoPages({ site, searchConsole: sc, files, youtube: s.setup?.youtube?.confirmed ? YT.foundFor(id) : null, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}), official: officialOf(id), planned: plannedOf(id), subject: aboutOf(store.read(id)), ...madePlanOf(id) });
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
    const pages = web ? seoPages({ site: web, searchConsole: sc, files, youtube: ytData, on, overrides: pread(id, "edits.json", {}), official: officialOf(id), planned: plannedOf(id), subject: aboutOf(store.read(id)), ...madePlanOf(id) }) : null;
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
/* ── RR-318 · the official answers, "How many pages", the website's AI writing, Search Console power ── */
const officialOf = (id) => pread(id, "official.json", {});
/* RR-319: once the client made pages from "How many pages", THAT plan is the page list everywhere (one page per different answer) */
const madePlanOf = (id) => { const p = pread(id, "made-plan.json", null); return p?.length ? { pagePlan: p, max: p.length } : {}; };
const counting = new Map(), countProgress = new Map(); // product id → a running count, and what it reads now
const plannedOf = (id) => pread(id, "planned.json", []);
/* the client's AI (Settings → Your AI connection): its provider and key — the key only ever goes to the provider */
const aiOf = (s) => { const c = s.setup?.aiConnection, p = AI_PROVIDERS.find((x) => x.id === c?.provider || x.keyName === c?.keyName); return p && KEYS.status(p.keyName).saved ? { provider: p.id, key: KEYS.get(p.keyName) } : null; };
const reader = () => officialReader({ allowLocal, on: new Date().toISOString(), ...(Number.isInteger(CONFIG.testOfficialPaceMs) ? { paceMs: CONFIG.testOfficialPaceMs } : {}) });
/* what the product is about, and the official site of that (e.g. "OET", oet.com) — the client says it once in "How many pages"; a short
 * name in brackets in the product's own description is offered first */
const aboutOf = (s) => s.setup?.official?.subject ?? /\(([A-Z][A-Z0-9]{1,9})\)/.exec(String(s.setup?.product?.what ?? ""))?.[1] ?? null;
/** the official answers for the countries the searches are about: the subject's own page for each, and each body's own page — read here */
async function refreshOfficial(id, countries) {
  const s = store.read(id), o = s.setup?.official; if (!o?.subject || !o?.site) return { ok: false, why: "Tell Visibility what your product is about and that subject's official site (How many pages can I make? → step 1) — new pages are answered from the official bodies." };
  const have = officialOf(id), notSaid = pread(id, "official-notsaid.json", {}), leads = pread(id, "official-sources.json", {}), rd = reader();
  const sm = await rd.sitemapOf(o.site); if (!sm.ok) return { ok: false, why: `${o.site} could not be read: ${sm.why}` };
  const { itemOnSubjectSite } = await import("./official.mjs");
  for (const c of countries) {
    const kept = await itemOnSubjectSite({ item: c, subject: o.subject, subjectName: o.subject, sitemapUrls: sm.urls, reader: rd });
    /* RR-319 ADD 3: the health regulators the subject's own country page links to are read too (not only the bodies a client pasted) */
    const own = leads[c] ?? [], linked = (kept.regulatorLinks ?? []).filter((l) => !own.some((x) => { try { return new URL(x.url).hostname === new URL(l.url).hostname; } catch { return false; } }));
    const r = await officialClaims({ country: c, subject: o.subject, subjectName: o.subject, kept, bodyPages: [...own, ...linked], reader: rd });
    have[c] = r.claims; notSaid[c] = [...r.notSaid, ...(kept.kept ? [] : [{ body: o.subject, url: o.site, checkedOn: kept.checkedOn, line: `${o.subject}'s official site, checked ${kept.checkedOn}, does not say this (${kept.why}).` }])];
  }
  pwrite(id, "official.json", have); pwrite(id, "official-notsaid.json", notSaid);
  return { ok: true, requests: rd.requests() };
}
/**
 * RR-319 ADD 3 · THE QUESTIONS PEOPLE ASK, gathered before any page is counted: the client's Search Console, his YouTube niche, the subject's
 * official FAQ and help pages (read here, robots obeyed), and — when his AI is connected — its research, said as research, never as searches.
 */
async function researchFor({ id, s, sc, subject, subjectSite, rd, res }) {
  const items = [], sources = [];
  /* RR-327 · AlmiWorld's keyword service FIRST (the plan's licence decides): the subject for all locations and per country, into the ONE keyword
   * database (phraseItems below reads it) — unreachable: said plainly, and the plan goes on with the client's own data, never an invented number */
  const svc = await serviceForPlan(id, subject).catch(() => ({ on: false, asked: 0, line: SERVICE_OFF_LINE }));
  sources.push({ kind: "AlmiWorld keyword service", n: svc.asked ?? 0, on: Boolean(svc.on), line: svc.on ? `${svc.line} · ${svc.source} · ${svc.asked} searches now${svc.reused ? `, ${svc.reused} still fresh (asked within ${PLAN_REUSE_DAYS} days)` : ""}` : svc.line, ...(svc.why ? { why: svc.why } : {}) });
  /* RR-328 C · AlmiWorld's country facts (the same licence): the five parts of every country, read on their own official pages — once a day */
  const cfx = await countryFactsForPlan({ service: currentLicence() ? kwService() : null, cache: { load: () => pread(id, "country-facts.json", null), save: (v) => pwrite(id, "country-facts.json", v) }, countries: COUNTRIES }).catch(() => ({ on: false, countries: {}, line: "AlmiWorld country facts: not reachable just now" }));
  sources.push({ kind: "AlmiWorld country facts", n: Object.values(cfx.countries ?? {}).filter((x) => x.complete).length, on: Boolean(cfx.on), line: cfx.line });
  const scq = (sc?.queries ?? []).map((q) => ({ text: q.query, source: `your Search Console: seen ${q.impressions} time${q.impressions === 1 ? "" : "s"} (${sc.window})`, on: sc.on ?? null, kind: "search", weight: 10 + Math.log10(1 + (q.impressions ?? 0)) }));
  items.push(...scq); sources.push({ kind: "Search Console", n: scq.length, line: sc ? `${scq.length} searches from your Search Console (${sc.window})` : "Search Console is not connected" });
  const yt = s.setup?.youtube?.confirmed ? YT.foundFor(id) : null, ytq = (yt?.state === "READY" ? yt.questions ?? [] : []).map((q) => ({ text: q.text, source: q.source, on: null, kind: "youtube", weight: 3 }));
  items.push(...ytq); sources.push({ kind: "YouTube", n: ytq.length, line: s.setup?.youtube?.confirmed ? `${ytq.length} questions from the YouTube research` : "No YouTube channel confirmed for this product" });
  const sm = await rd.sitemapOf(subjectSite), faqUrls = (sm.urls ?? []).filter((u) => /faq|question|help|support|results-and-scoring|test-day|scoring/i.test(new URL(u).pathname)).slice(0, 6), faqPages = [];
  for (const u of faqUrls) { const p = await rd.read(u); if (p.ok) faqPages.push(p); }
  const fq = faqQuestions(faqPages);
  items.push(...fq); sources.push({ kind: "official FAQ", n: fq.length, line: `${fq.length} questions on ${subject}'s own FAQ and help pages (${faqPages.length} of ${faqUrls.length} read)` });
  /* RR-320 B · what the client's own AI saw in Google in the client's own browser (F11 source a, accepted runs only), and his search-data
   * files (Keyword Planner, Bing Webmaster) — each with its own label */
  const held = pread(id, "phrases.json", []);
  items.push(...phraseItems(id));
  sources.push({ kind: "your AI in your browser", n: held.filter((p) => p.kind === "observed").length, line: `${held.filter((p) => p.kind === "observed").length} phrases your AI saw in Google, in your own browser (client-started, 30 a day)` });
  if (held.some((p) => p.kind === "tool")) sources.push({ kind: "search-data files", n: held.filter((p) => p.kind === "tool").length, line: `${held.filter((p) => p.kind === "tool").length} from your Keyword Planner / Bing Webmaster files (the tool's own estimates)` });
  const ai = aiOf(s); let aiCost = null;
  if (ai && LEDGER.allowed().ok) {
    const origins = questionsByCountry(sc?.byCountry ?? []).slice(0, 12).map((c) => c.country).filter((c) => !/^other/.test(c));
    const a = await researchQuestionsAI({ ...ai, subject, what: s.setup?.official?.description ?? s.setup?.product?.what ?? "", countries: [...new Set([...(res.dims.countries?.kept ?? []).map((k) => k.name), ...origins])], professions: res.dims.roles?.professions ?? [], ...(CONFIG.aiApiBase ? { base: CONFIG.aiApiBase } : {}) });
    if (a.usage) LEDGER.add(a.usage); aiCost = LEDGER.line();
    const aq = (a.questions ?? []).map((q) => ({ text: q, source: "your AI's research — an AI estimate, not search data", on: new Date().toISOString().slice(0, 10), kind: "ai research", weight: 1 }));
    items.push(...aq); sources.push({ kind: "your AI", n: aq.length, line: a.ok ? `${aq.length} questions from your AI's research — research, not searches` : `Your AI's research: ${a.why}` });
  } else sources.push({ kind: "your AI", n: 0, line: "Connect your AI (Settings → Your AI connection) to add its research of the questions people ask" });
  return { items, sources, aiCost };
}
/* RR-320 B · a phrase is kept once (same words, same source kind, same place) */
const mergePhrases = (held, more) => { const key = (p) => `${p.kind}|${String(p.place ?? "")}|${String(p.text).toLowerCase().replace(/\s+/g, " ").trim()}`, seen = new Set(held.map(key)); return [...held, ...more.filter((p) => { const k = key(p); if (seen.has(k)) return false; seen.add(k); return true; })]; };
/* RR-324 A: the Keyword Planner keywords come from the ONE keyword database (each once, its current range); a search-data phrase read
 * before the database existed still counts until the database holds the same keyword */
const keywordStore = (id) => localKeywordStore({ read: (n, d) => pread(id, n, d), write: (n, v) => pwrite(id, n, v) });
const phraseItems = (id) => { const db = keywordStore(id).load(), held = new Set(Object.keys(db.keywords));
  return [...pread(id, "phrases.json", []).filter((p) => !(p.kind === "tool" && held.has(keyOf(p.text)))).map((p) => ({ text: p.text, source: p.source, on: p.date, kind: p.kind, place: p.place, volume: p.volume ?? null, weight: p.kind === "observed" ? 6 : 4 })),
    ...itemsOf(db).map((x) => ({ ...x, on: x.date }))]; };
/**
 * RR-327 · the plan's searches from AlmiWorld's keyword service: the subject for all locations, then for each country the service covers —
 * a location asked within PLAN_REUSE_DAYS is not asked again (its figures are still in the database). Each answer goes into the ONE keyword
 * database marked with its source and its country. → { on, asked, reused, line, source, why? }
 */
async function serviceForPlan(id, subject) { return collectForPlan({ service: currentLicence() ? kwService() : null, store: keywordStore(id), merge: mergeObservations, fileIdOf, source: KW_SOURCES.service, subject }); }
/* RR-324 A: the folder the client named — its Keyword Planner files (keyword-planner-*.csv, "Keyword Stats …") read once each, by fingerprint */
const keywordFolder = () => CONFIG.keywordFolder?.dir ? CONFIG.keywordFolder : null;
function pickUpFolder(id) {
  const f = keywordFolder(); if (!f || !existsSync(f.dir)) return { lines: f ? [`The folder ${f.dir} is not there.`] : [], read: 0 };
  const st = keywordStore(id); let db = st.load(); const lines = []; let read = 0;
  for (const name of readdirSync(f.dir).filter((n) => FILE_NAME.test(n)).sort()) {
    const bytes = readFileSync(join(f.dir, name)); if (db.files[fileIdOf(bytes)]) continue;
    const m = mergeFile(db, { name, bytes, text: searchFileText(bytes), location: f.location ?? null, readOn: new Date().toISOString().slice(0, 10) });
    lines.push(m.line); if (!m.refused && !m.alreadyRead) { db = m.db; read++; }
  }
  if (read) { st.save(db); replan(id); }
  return { lines, read };
}
/* RR-324 B/C: the two connectors, READY BUT OFF — their settings are the client's (CONFIG), their keys in the secure store by name */
const adsOf = () => googleAds({ keys: KEYS, settings: CONFIG.googleAds ?? {}, ...(CONFIG.googleAdsTestEndpoints ? { endpoints: CONFIG.googleAdsTestEndpoints } : {}) });
let ADS = null; const ads = () => (ADS ??= adsOf());
const DFS_LEDGER_FILE = join(DATA, "dataforseo-ledger.json");
const dfsLedger = () => { try { return JSON.parse(readFileSync(DFS_LEDGER_FILE, "utf8")); } catch { return emptyDfsLedger(); } };
const dfsOf = () => dataForSeo({ keys: KEYS, settings: CONFIG.dataForSeo ?? {}, ledger: dfsLedger(), save: (l) => writeFileSync(DFS_LEDGER_FILE, JSON.stringify(l)), ...(CONFIG.dataForSeoTestBase ? { base: CONFIG.dataForSeoTestBase } : {}) });
function keywordView(id) {
  const db = keywordStore(id).load(), plan = pread(id, "page-count.json")?.plan ?? null, today = new Date().toISOString().slice(0, 10);
  const top = Object.values(db.keywords).map((k) => ({ k, c: currentOf(k) })).sort((a, b) => (b.c?.high ?? 0) - (a.c?.high ?? 0) || a.k.text.localeCompare(b.k.text)).slice(0, 25)
    .map(({ k, c }) => { const t = trendOf(k); return { text: k.text, range: c?.label ?? null, period: c?.period ?? null, location: c?.location ?? null, source: c?.source ?? null, firstSeen: k.firstSeen, lastSeen: k.lastSeen, seen: t.points.length, direction: t.direction, change3m: t.change3m, yoy: t.yoy }; });
  const dfsSet = CONFIG.dataForSeo ?? {};
  return { summary: summaryOf(db, { today, plan }), folder: keywordFolder(), top, store: "this computer (the product's folder) — ready to move to AlmiWorld's own keyword service later",
    service: { plan: Boolean(currentLicence()), locations: SERVICE_LOCATIONS.map(({ code, name }) => ({ code, name })) }, // RR-326 E
    ads: { ...ads().status(), settings: { access: CONFIG.googleAds?.access ?? "test", applied: CONFIG.googleAds?.applied ?? [], clientIdSet: Boolean(CONFIG.googleAds?.clientId), customerIdSet: Boolean(CONFIG.googleAds?.customerId), secret: KEYS.status(ADS_KEYS.secret).saved } },
    dfs: { ...dfsOf().status(), settings: { on: dfsSet.on === true, capDay: dfsSet.capDay ?? null, capMonth: dfsSet.capMonth ?? null, prices: DFS_PRICES }, keySaved: KEYS.status(DFS_KEYS.login).saved && KEYS.status(DFS_KEYS.password).saved } };
}
/*
 * 🔴 RR-321 · THE COUNT FROM THE SUBJECT'S OWN LIST (AlmiWorld's OET: the built-in "who recognises OET" list, AlmiStudy's universities, OET's
 * 12 professions) — fast, and the plan, the tables, the five answers and the total all from ONE ledger. The regulators' own pages are read
 * while pages are BUILT (count/preview, count/make) and saved in regulator-reads.json; they add facts to the plan, never pages.
 */
/* RR-322 A4: the client's own AI's refresh of the list (written out in his browser) is used before AlmiOET's copy, with its date */
const listOf = (s, subject, id = null) => (isAlmiWorld(s) && /^oet$/i.test(String(subject ?? "")) ? (id && pread(id, "oet-list.json")?.items?.length ? pread(id, "oet-list.json") : builtInList("recognising")) : null);
const professionsOf = () => (builtInList("professions")?.items ?? []).map((x) => x.name.toLowerCase());
/* RR-322 A3: a rate the client's AI read in his browser (or a peg it confirmed) joins the central banks' rates of the count */
const ratesOf = (id, c) => { const b = pread(id, "browser-rates.json", {}); return c.rates ? { ...c.rates, banks: { ...(c.rates.banks ?? {}), ...b } } : c.rates; };
const ctaOf = (s) => { const o0 = s.product?.site ?? null, o = o0 && !/^https?:\/\//.test(o0) ? `https://${o0}` : o0; try { return o ? { label: `Try a free ${aboutOf(s) ?? "practice"} test on ${new URL(o).hostname}`, href: new URL("/practice", o).href } : null; } catch { return null; } };
/** RR-323 decision 8: the English pages that may now be made in another language — live, INDEXED (the Monday report) and showing impressions */
function translatableOf(id) {
  const states = pread(id, "index-states.json", {}), seen = pread(id, "page-impressions.json", {});
  return pread(id, "published.json", []).filter((x) => x.state === "LIVE" && states[x.url] === "indexed" && (seen[x.url] ?? 0) > 0).map((x) => x.title);
}
function listPlan(id, c) {
  const s = store.read(id), list = listOf(s, c.subject, id); if (!list) return null;
  const rec = recognitionOf(list, { professions: professionsOf() }), items = [...(c.items ?? []), ...phraseItems(id)], sorted = sortQuestions(items, c.subject, { fullName: "Occupational English Test", regulators: rec.regulators.map(callNames) }), groups = groupQuestions(sorted.kept);
  const plan = planFromList({ subject: c.subject, rec, professions: professionsOf(), universities: builtInList("universities")?.items ?? [], light: pread(id, "uni-light.json", {}), venues: c.venues ?? { countries: [] }, fee: c.fee ?? null, rates: ratesOf(id, c), stats: c.stats ?? null, subtests: c.subtests ?? {}, groups, sorted, byCountry: c.scRows ?? [], reads: pread(id, "regulator-reads.json", {}), on: c.on, councils: builtInList("origins"), ai: pread(id, "ai-content.json", {}), languages: s.setup?.languages?.codes ?? ["en"], items, cta: ctaOf(s), subjectPages: c.subjectPages ?? {}, facts: c.facts ?? {}, /* RR-327 */ kwByCountry: byLocationOf(keywordStore(id).load()), originFacts: builtInList("originFacts"), service: (c.research?.sources ?? []).find((x) => x.kind === "AlmiWorld keyword service") ?? null, /* RR-328 C */ countryFacts: pread(id, "country-facts.json", null)?.countries ?? {}, translatable: translatableOf(id), by: displayNameOf(s.product) });
  const five = fiveFromList({ subject: c.subject, plan, stats: c.stats, byCountry: c.byCountry, sc: searchConsoleOf(id), items, own: pread(id, "research-own.json", []), notApply: pread(id, "research-notapply.json", []) });
  return { plan, five, questions: groups };
}
/* ── RR-322 · the background work of the list path: the light check, the regulators' confirmation, the AI's explanation, the browser list ── */
const busy = new Map(); // product id → { what, done, of } (a light check or a confirmation running)
/** A1 · the light check of the next `n` universities the list names no profession for (robots obeyed, ≤ 2 pages each), saved as it goes */
function lightRun(id, n = 60) {
  if (busy.has(`${id}|light`)) return false;
  const c = pread(id, "page-count.json"); if (!c?.list) return false;
  const done = pread(id, "uni-light.json", {}), weight = Object.fromEntries((c.byCountry ?? []).map((x) => [x.country, x.impressions ?? 0]));
  /* RR-322 proof: 37 of the first 59 had no website in the list (nothing to read) — a university with a site, or a profession in its own name, first */
  const canCheck = (u) => (u.page || professionsInName(u.name).length ? 0 : 1);
  const todo = (builtInList("universities")?.items ?? []).filter((u) => teachesHealth(u) && !professionsOfFields(u.fields ?? u.subjects ?? []).length && !done[u.name]).sort((a, b) => canCheck(a) - canCheck(b) || (weight[b.country] ?? 0) - (weight[a.country] ?? 0) || String(a.name).localeCompare(String(b.name))).slice(0, n);
  if (!todo.length) return false;
  const st = { what: "light", done: 0, of: todo.length }; busy.set(`${id}|light`, st);
  (async () => { const rd = reader(); for (const u of todo) { const r = await lightCheck({ u, reader: rd }).catch((e) => ({ state: "UNREADABLE", why: String(e?.message ?? e).slice(0, 80), professions: [] })); const all = pread(id, "uni-light.json", {}); all[u.name] = { ...r, on: rd.on }; pwrite(id, "uni-light.json", all); st.done++; } replan(id); })().catch(() => null).finally(() => busy.delete(`${id}|light`));
  return true;
}
/** A2 · read every regulator's own page not read in the last 7 days (the ones that confirm a score leave "waiting") */
async function confirmRegulators(id, { say = () => {} } = {}) {
  const c = pread(id, "page-count.json"); if (!c?.list) return { read: 0 };
  const s = store.read(id), list = listOf(s, c.subject, id), rec = recognitionOf(list, { professions: professionsOf() }), pages = regulatorPagesOf(rec, { subject: c.subject, professions: professionsOf() }).pages;
  const reads = pread(id, "regulator-reads.json", {}), todo = pages.filter((p) => !(reads[p.listId] && (Date.now() - Date.parse(reads[p.listId].on ?? 0)) / 864e5 < 7)), rd = reader();
  for (const [i, p] of todo.entries()) { say(`Reading ${p.body}'s own page (${i + 1} of ${todo.length})`); await readRegulatorFor(id, p, rd); }
  replan(id);
  return { read: todo.length };
}
/** A5 + B4 · the client's AI explains the topic and sub-test pages (numbers only from their facts), and writes the strongest pages in the
 * languages people ask in — saved; the plan made again */
/** RR-323: the licence-barred pages' 8-word hashes (config/licence-withheld-shingles.json — hashes only), for the samples' check */
const licenceShingles = () => { try { return new Set(JSON.parse(readFileSync(new URL("../config/licence-withheld-shingles.json", import.meta.url), "utf8")).shingles ?? []); } catch { return new Set(); } };
async function aiContentFor(id, { only = null } = {}) {
  const s = store.read(id), ai = aiOf(s); if (!ai || !LEDGER.allowed().ok) return { ok: false };
  const c = pread(id, "page-count.json"); if (!c?.plan) return { ok: false };
  const all = pread(id, "ai-content.json", {}), base = CONFIG.aiApiBase ? { base: CONFIG.aiApiBase } : {};
  const facts = (p) => [...(p.claims ?? []).filter((x) => !x.pointer).map((x) => x.text), ...(p.dataPoints ?? []).map((d) => `${d.label} ${d.value}`)];
  const topicPages = [...(c.plan.kinds.topic ?? []), ...(c.plan.gates?.topic?.sections ?? []).map((x) => ({ title: x.name, questions: [], claims: [] }))].filter((p) => !all.topics?.[p.title] && (!only || only.includes(p.title)));
  const want = [...topicPages.map((p) => ({ title: p.title, questions: (p.questions ?? []).map((g) => g.question), facts: facts(p) })), ...(c.plan.kinds.subtest ?? []).filter((p) => !all.subtests?.[`${p.subtest}|${p.profession}`] && (!only || only.includes(p.title))).map((p) => ({ title: p.title, key: `${p.subtest}|${p.profession}`, questions: (p.questions ?? []).map((g) => g.question), facts: facts(p) }))];
  for (let i = 0; i < want.length; i += 12) {
    const part = want.slice(i, i + 12), out = await explainPagesAI({ ...ai, subject: c.subject, pages: part, ...base }); if (out.usage) LEDGER.add(out.usage); if (!out.ok) break;
    for (const p of part) if (out.pages[p.title]) { if (p.key) (all.subtests ??= {})[p.key] = out.pages[p.title]; else (all.topics ??= {})[p.title] = out.pages[p.title]; }
  }
  /* RR-323 · the practice pages: the tips explained; each sample page's ORIGINAL sample written, then CHECKED (desktop/samples.mjs) — a sample
   * that fails is kept with its reason, and its page keeps waiting */
  const PK = c.plan.practiceKeys ?? {}, factText = (s) => (FACTS_FOR[s] ?? []).map((f) => c.facts?.[f]?.text).filter(Boolean);
  const tips = Object.entries(PK).filter(([t, k]) => k.startsWith("practice|tips|") && !all.practice?.[k] && (!only || only.includes(t)));
  for (let i = 0; i < tips.length; i += 12) {
    const part = tips.slice(i, i + 12).map(([title, key]) => ({ title, key, questions: [], facts: factText(key.split("|")[2]) })), out = await explainPagesAI({ ...ai, subject: c.subject, pages: part, ...base }); if (out.usage) LEDGER.add(out.usage); if (!out.ok) break;
    for (const p of part) if (out.pages[p.title]) (all.practice ??= {})[p.key] = out.pages[p.title];
  }
  const by = displayNameOf(s.product), sh = pread(id, "subject-shingles.json", null), read = new Set(sh?.hashes ?? []), barred = licenceShingles();
  const toWrite = Object.entries(PK).filter(([t, k]) => k.startsWith("practice|sample|") && k.split("|")[2] !== "-" && !all.samples?.[k]?.check?.ok && (!only || only.includes(t)));
  for (let i = 0; i < toWrite.length; i += 4) {
    const part = toWrite.slice(i, i + 4).map(([title, key]) => { const [, , st, prof] = key.split("|"); return { key, title, subtest: st, profession: prof === "-" ? null : prof, facts: factText(st) }; });
    const out = await samplesAI({ ...ai, subject: c.subject, by, pages: part, ...base }); if (out.usage) LEDGER.add(out.usage); if (!out.ok) break;
    for (const p of part) { const sm = out.samples[p.key]; if (!sm) continue; const full = { ...sm, label: labelOf(by, c.subject), on: new Date().toISOString().slice(0, 10) }; full.check = { ...checkSample(full, { subtest: p.subtest, by, subject: c.subject, read, barred, facts: c.facts ?? {} }), against: `${sh?.pages?.length ?? 0} of ${c.subject}'s own pages read ${String(sh?.on ?? "").slice(0, 10)} + the licence-barred pages` }; (all.samples ??= {})[p.key] = full; }
  }
  pwrite(id, "ai-content.json", all); replan(id);
  /* the languages: after the plan knows its strongest pages */
  const c2 = pread(id, "page-count.json"), byLang = new Map(); for (const p of c2.plan.kinds.language ?? []) if (!all.translations?.[`${p.lang}|${p.base}`]) byLang.set(p.lang, [...(byLang.get(p.lang) ?? []), p.base]);
  const fullKinds = c2.plan.kinds, kept = Object.values(fullKinds).flat();
  for (const [lang, titles] of byLang) { const pages = titles.map((t) => kept.find((p) => p.title === t)).filter(Boolean); const out = await translatePagesAI({ ...ai, lang, langName: LANGUAGES.find((l) => l.code === lang)?.name ?? lang, pages, ...base }); if (out.usage) LEDGER.add(out.usage); if (out.ok) Object.assign((all.translations ??= {}), out.pages); }
  pwrite(id, "ai-content.json", all); replan(id);
  return { ok: true };
}
/** A2 + A3 + A4 + C2 · the day's browser list for the client's own AI */
function browserListFor(id) {
  const c = pread(id, "page-count.json"); if (!c?.list || !c.plan) return null;
  const reads = pread(id, "regulator-reads.json", {}), list = listOf(store.read(id), c.subject, id);
  const regs = Object.entries(reads).filter(([, r]) => r.browser).map(([listId, r]) => ({ listId, url: r.url, body: r.body, why: r.why }));
  const rates = [...new Map((c.plan.kinds.taking?.[0]?.sections ?? []).filter((x) => x.browser).map((x) => [x.browser.url, x.browser])).values()];
  for (const [cur, p] of Object.entries(PEGS)) if (!pread(id, "browser-rates.json", {})[cur]) rates.push({ kind: "rate", currency: cur, url: p.link, label: p.source, why: "to confirm the official peg on the central bank's own page" });
  const formats = Object.entries(c.plan.kinds).filter(([k, xs]) => xs.length && !["hub", "language"].includes(k)).map(([k, xs]) => ({ family: k, query: (xs.find((p) => p.main)?.main) ?? xs[0].title }));
  return browserList({ regulators: regs, rates, listPage: list?.page ?? null, listOn: list?.listOn ?? null, formats });
}
/** what the client's AI handed in → each page MEASURED (scores, a rate, the list's rows, Google's shape); the text itself is never kept */
async function takeBrowser(id, hand) {
  const bl = browserListFor(id); if (!bl) return { ok: false, line: "Count first." };
  const t = takeBrowserReads(hand, bl.items); if (!t.ok) return { ok: false, line: `Refused — ${t.refusedFor.join(", ")}. Nothing from this file is kept.` };
  const c = pread(id, "page-count.json"), lines = [];
  for (const p of t.pages) {
    if (p.kind === "regulator") { const page = (c.plan.kinds.regulator ?? []).find((x) => x.listId === p.listId) ?? regulatorPagesOf(recognitionOf(listOf(store.read(id), c.subject, id), { professions: professionsOf() }), { subject: c.subject, professions: professionsOf() }).pages.find((x) => x.listId === p.listId);
      if (!page) continue; const r = await readRegulator({ page: { ...page, record: { ...(page.record ?? {}), officialUrl: p.url } }, subject: c.subject, reader: textReader(p.url, p.text, p.date) });
      const all = pread(id, "regulator-reads.json", {}); all[p.listId] = { ...r, body: page.body, title: page.title, via: `read by your AI in your browser, ${p.date}`, browser: !r.ok }; pwrite(id, "regulator-reads.json", all); lines.push(`${page.body}: ${r.ok ? "its score confirmed" : r.why}`); }
    if (p.kind === "rate") { const b = CENTRAL_BANKS[p.currency], v = b?.row ? b.row(p.text) : b?.rate ? { rate: b.rate(p.text), date: p.date } : null, peg = PEGS[p.currency];
      const rate = v?.rate ?? (peg && p.text.includes(peg.rate) ? peg.rate : null);
      if (rate && p.text.includes(rate)) { const all = pread(id, "browser-rates.json", {}); all[p.currency] = { rate, date: v?.date ?? p.date, link: p.url, source: `${b?.source ?? peg.source} (read by your AI in your browser)`, short: b?.short ?? peg.short }; pwrite(id, "browser-rates.json", all); lines.push(`${p.currency}: ${rate} (${p.date})`); } else lines.push(`${p.currency}: no rate stands on what your AI handed in`); }
    if (p.kind === "oet-list" && p.rows.length) { const l = listFromRows(p.rows, { date: p.date, page: p.url }); if (l.items.length >= 100) { pwrite(id, "oet-list.json", l); lines.push(`OET's list: ${l.items.length} organisations (${p.date})`); } else lines.push(`OET's list: only ${l.items.length} rows — kept AlmiOET's copy (a refresh needs the whole list)`); }
    if (p.kind === "format" && p.shape) { const all = pread(id, "formats.json", {}); all[p.family] = { shape: p.shape, query: p.label, on: p.date }; pwrite(id, "formats.json", all); lines.push(`${p.family}: Google shows a ${p.shape}`); }
  }
  replan(id);
  return { ok: true, line: `${t.pages.length} page${t.pages.length === 1 ? "" : "s"} read by your AI: ${lines.join(" · ") || "nothing measured"}.${t.notOnList.length ? ` ${t.notOnList.length} not on today's list — not used.` : ""}` };
}
/** C3 · the index report (each Monday, or when asked): Google's own state of each live page, the next-batch rule, the work before a new batch */
async function indexReport(id) {
  const sc = searchConsoleOf(id), live = pread(id, "published.json", []).filter((x) => x.state === "LIVE").map((x) => x.url), on = new Date().toISOString().slice(0, 10), results = [];
  if (sc?.kind === "CONNECTED" && sc.site) for (const u of live.slice(0, 200)) results.push({ url: u, inspection: await GOOGLE.inspect(sc.site, u).catch(() => null) });
  const rep = mondayReport(results, { on }), states = Object.fromEntries(rep.pages.map((p) => [p.url, p.state])); pwrite(id, "index-states.json", states);
  const rows = sc?.kind === "CONNECTED" && sc.site ? await GOOGLE.pageRows(sc.site).catch(() => null) : null, batchesMade = pread(id, "batches.json", []);
  if (rows) pwrite(id, "page-impressions.json", Object.fromEntries(rows.map((r) => [r.page, r.impressions ?? 0]))); // RR-323 decision 8: a page is translated only once it shows impressions
  const x = { on, report: rep, next: nextBatch(batchesMade.at(-1), states, { on }), before: beforeExpand(rows ?? [], batchesMade.flatMap((b) => b.urls ?? [])), refresh: refreshDue(pread(id, "made-plan.json", []), { on }), searchConsole: Boolean(rows) };
  pwrite(id, "index-report.json", x); return x;
}
/** read one regulator's own page (RFC 9309 robots) and keep what it states, by the list's id — a lead the client or his AI gave for the same
 * site is read first */
async function readRegulatorFor(id, page, rd) {
  const leads = Object.values(pread(id, "official-sources.json", {})).flat(), host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
  const lead = leads.find((l) => host(l.url) && [page.record?.officialUrl, page.website].some((u) => host(u) === host(l.url)));
  const p = lead && !page.record?.officialUrl ? { ...page, record: { ...(page.record ?? {}), officialUrl: lead.url } } : page;
  const r = await readRegulator({ page: p, subject: "OET", reader: rd }).catch((e) => ({ ok: false, url: page.website, on: rd.on, why: `could not be read (${String(e?.message ?? e).slice(0, 80)})`, claims: [] }));
  const all = pread(id, "regulator-reads.json", {}); all[page.listId] = { ...r, body: page.body, title: page.title }; pwrite(id, "regulator-reads.json", all);
  return r;
}
/** the plan and the five answers made again from what is saved — no page is read again (pages never wait for the browser search) */
function replan(id) {
  const c = pread(id, "page-count.json"); if (!c?.result?.ok) return false;
  if (c.list) { const x = listPlan(id, c); if (!x) return false; pwrite(id, "page-count.json", { ...c, ...x, replannedOn: new Date().toISOString() }); return true; }
  const items = [...(c.items ?? []), ...phraseItems(id)], questions = groupQuestions(items);
  const plan = planPages({ r: c.result, official: officialOf(id), notSaid: pread(id, "official-notsaid.json", {}), questions, formula: c.formula, subject: c.subject });
  const five = fiveAnswers({ subject: c.subject, res: c.result, plan, official: officialOf(id), byCountry: c.byCountry, sc: searchConsoleOf(id), items, figure: c.figure, own: pread(id, "research-own.json", []), notApply: pread(id, "research-notapply.json", []), dims: c.dims });
  pwrite(id, "page-count.json", { ...c, plan, questions, five, replannedOn: new Date().toISOString() });
  return true;
}
/** Create SEO pages: the drafts (kept in pages.json); published at once only when the client chose "automatically after the gates" */
async function createPages(id) {
  const { s, site, sc, files, ctx } = contextOf(id);
  const yt = ctx.youtubeConfirmed ? YT.foundFor(id) : null;
  /* RR-318 B6: the countries the searches are about get their official answers first (read once; a country already read is kept) */
  const want = [...new Set([...(sc?.queries ?? []).map((q) => q.query), ...files.map((f) => f.phrase), ...plannedOf(id).map((p) => p.text)].flatMap((t) => destinationsIn(t)))].filter((c) => !(c in officialOf(id)));
  if (want.length && s.setup?.official?.site) await refreshOfficial(id, want.slice(0, 12)).catch(() => null);
  const pages = seoPages({ site, searchConsole: sc, files, youtube: yt?.state === "READY" ? yt : null, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}), official: officialOf(id), planned: plannedOf(id), subject: aboutOf(store.read(id)), ...madePlanOf(id) });
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
/*
 * 🔴 RR-321 E4 · FRESHNESS: Visibility rechecks the sources of the pages it made, on its own (with the weekly check, or when asked); when a
 * number on a source changed, it PROPOSES the update (updates.json) — it never changes a page by itself. A source that cannot be read now is
 * tried again next time.
 */
const numbersOfText = (t) => (String(t ?? "").replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ").match(/\d+(?:\.\d+)?|\b[ABC]\+?(?=\s|\)|$)/g) ?? []).join(" ");
async function recheckSources(id) {
  const made = pread(id, "made-plan.json", []), reads = pread(id, "regulator-reads.json", {}), rd = reader(), proposals = [];
  for (const p of made.filter((x) => x.kind === "regulator" && reads[x.listId])) {
    const old = reads[p.listId]; if (old.on && (Date.now() - Date.parse(old.on)) / 864e5 < 7) continue;
    const r = await readRegulatorFor(id, p, rd);
    if (!r.ok) continue;
    for (const c of r.claims) { const was = (old.claims ?? []).find((x) => x.fact === c.fact); if (was && numbersOfText(was.text) !== numbersOfText(c.text)) proposals.push({ page: p.title, fact: c.fact, before: was.text, after: c.text, source: c.link, on: r.on }); }
  }
  if (proposals.length) pwrite(id, "updates.json", [...pread(id, "updates.json", []), ...proposals].slice(-200));
  if (made.length) replan(id);
  return { proposals: proposals.length };
}
/* D4 · the weekly check: a product whose last check is a week old is checked again (its plan made again); a client who chose "publish
 * automatically" also gets the new drafts published and submitted — never for AlmiWorld's own products. Only while the app is open. */
async function weeklyRound() {
  for (const p of store.list()) {
    const id = p.id; if (!weeklyOf(id).on || checking.has(id)) continue;
    /* RR-322 C3: the Monday report — Google's own index state of the live pages, once each Monday (independent of the weekly check) */
    if (new Date().getUTCDay() === 1 && pread(id, "batches.json", []).length && !(Date.now() - Date.parse(pread(id, "index-report.json")?.on ?? 0) < 6 * 864e5)) await indexReport(id).catch(() => null);
    const c = pread(id, "check.json"); if (!c?.on || Date.now() - Date.parse(c.on) < 7 * 864e5) continue;
    try {
      await checkProduct(id); didIt(id, "Weekly check: checked again and made the action plan again.");
      await recheckSources(id).catch(() => null); // RR-321 E4
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
      /* RR-315 C: the key and sign-in guides — part of the app, opened in their own window */
      { const gm = /^\/guide\/([a-z-]{1,40})$/.exec(u.pathname); if (req.method === "GET" && gm) { const html = guidePage(gm[1]); return html ? send(200, html, "text/html; charset=utf-8") : send(404, { refused: "no such guide" }); } }
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
              checking: checking.has(id), progress: progressOf(id), card, found: foundInfo({ site, youtube: yt?.state === "READY" ? yt : null, files, searchConsole: sc, keys: { ai: ctx.aiKey }, on: new Date().toISOString() }), menu: menuFor(ctx), todo: todoOf(id), google: { ...GOOGLE.status(), site: sc?.site ?? null, kind: sc?.kind ?? null, window: sc?.window ?? null, searches: sc?.queries?.length ?? 0, on: sc?.on ?? null }, howTo: HOWTO });
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
            if (f === "page-count") return send(200, { open: "page-count" }); // RR-318 C
            if (f === "search-power") return send(200, { open: "search" }); // RR-318 D
            if (f === "publish") return send(200, { open: "publish" });
            if (f === "seo-pages" || f === "articles") {
              const pages = seoPages({ site, searchConsole: sc, files, youtube: ytData, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}), official: officialOf(id), planned: plannedOf(id), subject: aboutOf(store.read(id)), ...madePlanOf(id) });
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
      /* ── RR-318 · the website's AI writing, "How many pages can I make?", the official answers, Search Console power ── */
      { const r = /^\/api\/products\/([^/]+)\/(web\/write|count|count\/make|count\/understand|count\/draftlist|count\/preview|count\/recheck|count\/light|count\/confirm|count\/ai|count\/index|research\/browser|research\/handin|research\/file|research\/own|keywords|keywords\/folder|keywords\/ads|keywords\/ads\/start|keywords\/ads\/ideas|keywords\/dfs|keywords\/dfs\/volume|keywords\/service|keywords\/service\/usage|official|official\/suggest|official\/page|search|search\/read)$/.exec(u.pathname);
        if (r) {
          const id = decodeURIComponent(r[1]);
          try { store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          const { s, site, sc, files } = contextOf(id);
          /* A · "Write better with AI" under a website item: its page's fact sheet (and its official answers), the same truth guard as YouTube */
          if (r[2] === "web/write" && req.method === "POST") {
            const v = json(); if (!WEB_KINDS[v.kind]) return send(400, { refused: "Visibility does not write that with AI." });
            if (!site) return send(400, { refused: "Check your product first — the AI writes from your pages." });
            const ai = aiOf(s); if (!ai) return send(400, { refused: "Connect your AI key first (Settings → Your AI connection)." });
            const ok = LEDGER.allowed(); if (!ok.ok) return send(400, { refused: ok.why });
            const page = site.pages.find((p) => p.url === v.page) ?? (v.kind === "organization" ? site.pages[0] : null);
            const official = v.kind === "new page" || v.kind === "FAQ answer" ? destinationsIn(v.question ?? v.present ?? "").flatMap((c) => officialOf(id)[c] ?? []) : [];
            const material = webMaterial({ kind: v.kind, page, siteName: siteNameOf(site), origin: site.origin, question: v.question ?? null, present: v.present ?? null, official, productWhat: v.kind === "organization" ? s.setup?.product?.what : null });
            const out = await writeWebWithAI({ ...ai, kind: v.kind, material, siteName: siteNameOf(site), ...(CONFIG.aiApiBase ? { base: CONFIG.aiApiBase } : {}) });
            for (const x of out.usages ?? []) LEDGER.add(x);
            return send(out.ok ? 200 : 400, out.ok ? { ...out, aiCost: LEDGER.line() } : { refused: out.why, fallback: out.fallback === true, aiCost: LEDGER.line() });
          }
          /* C · "How many pages can I make?" — RR-319: the client's own formula, the lists (built in for AlmiWorld, pasted, CSV/Excel, drafted),
           * the questions people ask, and the plan per kind of page */
          if (r[2] === "count" && req.method === "GET") {
            const aw = isAlmiWorld(s), bi = (k) => { const x = aw ? builtInList(k) : null; return x ? { n: x.items.length, source: x.source } : null; };
            /* RR-320 B: today's browser-search list for the client's own AI (Visibility never runs it), and the runs his AI handed in */
            const lastC = pread(id, "page-count.json"), runs = pread(id, "phrase-runs.json", []), today = new Date().toISOString().slice(0, 10);
            const fromList = lastC?.list && lastC.plan; // RR-321: the countries and professions of the list's count
            const browser = aboutOf(s) ? browserSearchList({ subject: aboutOf(s), countries: fromList ? lastC.plan.tables.regulator.rows[1].kept.map((k) => k.name) : (lastC?.result?.dims?.countries?.kept ?? []).map((k) => k.name), origins: (lastC?.byCountry ?? []).map((c) => c.country).filter((c) => !/^other/.test(c)), professions: fromList ? professionsOf() : lastC?.result?.dims?.roles?.professions ?? [], own: pread(id, "research-own.json", []) }) : null;
            const usedToday = runs.filter((x) => x.date === today && x.verdict === "ACCEPTED").reduce((n, x) => n + (x.searchesUsed ?? 0), 0);
            return send(200, { browser: browser ? { ...browser, usedToday } : null, runs: runs.slice(-5), dimensions: DIMENSIONS, howto: LIST_HOWTO, worldLists: WORLD_LISTS, builtIn: aw ? { roles: bi("roles"), universities: bi("universities"), subjects: bi("subjects"), professions: bi("professions"), recognising: bi("recognising") } : null, listPath: Boolean(listOf(s, aboutOf(s) ?? "OET")), aiConnected: Boolean(aiOf(s)), running: counting.has(id), progress: countProgress.get(id) ?? null, subject: aboutOf(s), description: s.setup?.official?.description ?? "", site: s.setup?.official?.site ?? "", formula: pread(id, "formula.json"), last: lastC?.list && lastC.plan ? { ...lastC, plan: { ...lastC.plan, kinds: undefined } } /* RR-321 proof: the screen shows the tables; the pages' bodies (MBs) stay in the file */ : lastC, make: pread(id, "make.json"), preview: pread(id, "preview.json"), updates: pread(id, "updates.json", []).slice(-30), almiworld: aw,
              /* RR-322: the client's AI browser list, the light check and confirmation running, the index report */
              browserRead: (() => { const b = browserListFor(id); return b ? { ...b, instruction: browserInstruction(b.items) } : null; })(), light: busy.get(`${id}|light`) ?? null, confirming: busy.get(`${id}|confirm`) ?? null, indexReport: pread(id, "index-report.json") });
          }
          /* RR-319 ADD · the client's own words → what Visibility understood (his AI when connected; else the plain reader); he confirms */
          if (r[2] === "count/understand" && req.method === "POST") {
            const v = json(); let f = v.guided ? fromGuided(v.guided) : parseFormula(v.text), byAI = false;
            const ai = aiOf(s);
            if (!v.guided && ai && String(v.text ?? "").trim() && LEDGER.allowed().ok) { const a = await understandFormulaAI({ ...ai, text: v.text, ...(CONFIG.aiApiBase ? { base: CONFIG.aiApiBase } : {}) }); if (a.usage) LEDGER.add(a.usage); if (a.ok) { f = formulaOf(a.parts); byAI = true; } /* RR-320 B: the AI's parts read with the same relations as the plain reader */ }
            /* RR-321 D1: the client's words are ALWAYS saved (they come back when he opens the screen again), understood or not */
            if (!f.ok) { pwrite(id, "formula.json", { text: v.text ?? null, guided: v.guided ?? null, ok: false, line: null, parts: [], run: [], confirmed: false, on: new Date().toISOString() }); return send(400, { refused: "Your words are saved. Visibility could not read which pages you mean — use the three boxes: from what → to what → for what (for example: from 197 countries → to 9 countries → for 519 job roles).", saved: true }); }
            const saved = { text: v.text ?? null, guided: v.guided ?? null, ...f, byAI, confirmed: false, on: new Date().toISOString() };
            pwrite(id, "formula.json", saved);
            return send(200, { ok: true, ...saved });
          }
          if (r[2] === "count/draftlist" && req.method === "POST") { const v = json(); return send(200, draftList({ dim: v.dim, site, searchConsole: sc, subject: aboutOf(s) })); }
          if (r[2] === "count" && req.method === "POST") {
            const v = json();
            const formula = v.useFormula ? pread(id, "formula.json") : null;
            /* RR-321 B1: for AlmiWorld's OET the five questions and the count ALWAYS run on the built-in lists — no tick is needed */
            const list = listOf(s, String(v.subject ?? "").trim(), id);
            const dims = list ? ["countries", "origins", "roles", "universities"] : formula?.run?.length ? formula.run : (Array.isArray(v.dims) ? v.dims : []).filter((d) => DIMENSIONS.some((x) => x.id === d) || d === "origins");
            if (!dims.length) return send(400, { refused: "Tell Visibility which pages you have in mind (in your own words, or tick countries, universities, professions …)." });
            const subject = String(v.subject ?? "").trim(), offSite = webAddress(String(v.site ?? "").trim());
            /* RR-319 C1 (owner typed a long description here → 0 of 197 kept): the subject is a SHORT name */
            if (subjectProblem(subject)) return send(400, { refused: subjectProblem(subject) });
            if (!subject || !offSite) return send(400, { refused: "Say what your product is about (for example OET) and that subject's own official site (for example oet.com)." });
            if (counting.has(id)) return send(409, { refused: "A count is running for this product — wait for it to finish." });
            const lists = {}, aw = isAlmiWorld(s);
            for (const f of Array.isArray(v.files) ? v.files : []) { const x = listFromFile(String(f.name ?? ""), Buffer.from(String(f.base64 ?? ""), "base64")); if (!x.ok) return send(400, { refused: `${f.name}: ${x.why}` }); lists[f.dim] = [...(lists[f.dim] ?? []), ...x.items]; }
            for (const [dim, text] of Object.entries(v.typed ?? {})) { const items = String(text ?? "").split(/\r?\n/).map((t) => t.trim()).filter(Boolean).map((name) => ({ name })); if (items.length) lists[dim] = [...(lists[dim] ?? []), ...items]; }
            for (const k of ["roles", "universities", "subjects"]) if (aw && v.builtin?.[k] && dims.includes(k) && !lists[k]?.length) { const b = builtInList(k); if (b) lists[k] = b.items; }
            /* RR-320 A: "12 professions" are the subject's professions — for AlmiWorld, OET's own 12 (oet.com), never AlmiStudy's 12 subjects */
            if (aw && dims.includes("roles") && v.builtin?.professions !== false && (formula?.professions || v.builtin?.professions) &&!Object.keys(v.typed ?? {}).some((k) => k === "roles" && String(v.typed.roles).trim())) { const b = builtInList("professions"); if (b) lists.roles = b.items; }
            const universityReads = Math.max(0, Math.min(300, Number.isInteger(v.universityReads) ? v.universityReads : 0)); // RR-321 B3: no deep reading of university sites while counting
            const st = store.read(id); st.setup.official = { subject, site: offSite, description: String(v.description ?? "").slice(0, 2000) || null }; store.write(id, st);
            if (formula) pwrite(id, "formula.json", { ...formula, confirmed: true });
            const run = (async () => {
              const say = (p) => countProgress.set(id, { stage: p, at: new Date().toISOString() });
              const rd = reader();
              /* RR-320 D · Search Console again, now WITH its country dimension (read-only; the client's own connection) — the saved one if not */
              let scNow = sc;
              if (sc?.kind === "CONNECTED" && sc.site) { say("Reading your Search Console, by country"); const q = await GOOGLE.queries(sc.site).catch(() => null); if (q) { pwrite(id, "search-console.json", q); scNow = q; } }
              const byCountry = scNow?.byCountry ? questionsByCountry(scNow.byCountry) : null;
              /* RR-321 · the fast count from the subject's own list: its venue pages, its fee, the central banks' rates, its statistics, the
               * questions — no regulator's and no university's site is read here */
              if (list) {
                const before = pread(id, "page-count.json"), was = before?.list ? before.before : { accepted: before?.result?.dims?.countries?.kept?.map((k) => k.name) ?? null, taking: before?.result?.dims?.origins?.kept?.map((k) => k.name) ?? null, on: before?.on ?? null };
                say(`Reading ${subject}'s own pages: where it can be taken, and its fee`);
                const res = await realityFilter({ dims: ["origins"], lists: {}, subject, subjectName: subject, subjectSite: offSite, reader: rd, onProgress: say });
                if (!res.ok) { pwrite(id, "page-count.json", { on: new Date().toISOString(), list: true, dims, subject, site: offSite, formula, result: res, plan: null }); return; }
                const urls = (await rd.sitemapOf(offSite)).urls ?? [];
                say(`Reading ${subject}'s pages about venues and taking it at home`);
                /* RR-321 proof: the RR-319 per-country check kept a country on a "Book a test now" button of its recognition page — no
                 * venue named there; only a sentence of the subject's own pages that names a venue in it counts */
                const venues = await venueCountries({ urls, subject, reader: rd, already: [], gazetteer: gazetteerOf(builtInList("universities")?.items ?? []) }); // RR-327: and the cities it names
                say(`Reading ${subject}'s test statistics`);
                const stats = await statisticsOf({ urls, subject, reader: rd });
                say("Reading the central banks' official rates");
                const rates = await readRates({ reader: rd, countries: [...new Set([...venues.countries.map((x) => x.name), "Pakistan", "Kenya", "United Arab Emirates", "Qatar", "Saudi Arabia", ...(builtInList("originFacts")?.items ?? []).map((x) => x.country), ...SERVICE_LOCATIONS.map((l) => l.name).filter((n) => n !== "All locations")])] }); // RR-327: every country a country page can be for
                /* RR-322 B5: each sub-test's own facts (OET's "at a glance" pages) — four pages, read once */
                say(`Reading ${subject}'s pages about each sub-test`);
                const subtestPages = []; for (const u of urls.filter((x) => /\/ready\/(listening|reading|writing|speaking)$/i.test(x))) subtestPages.push(await rd.read(u));
                const subtests = subtestFactsOf(subtestPages);
                /* RR-323 · the demand pages' facts: booking, test dates, results, scores, each sub-test's format — the subject's own pages, read
                 * once; their 8-word sequences kept as HASHES ONLY (never their words) so every practice sample can be proven not to copy them */
                say(`Reading ${subject}'s pages about booking, results and scores`);
                const factPages = [...subtestPages]; for (const u of urls.filter((x) => SUBJECT_FACT_PAGES.test(x.replace(/\/$/, "")) && !factPages.some((p) => p.url === x))) factPages.push(await rd.read(u));
                const facts = subjectFactsOf(factPages, subject);
                pwrite(id, "subject-shingles.json", { on: new Date().toISOString(), pages: factPages.filter((p) => p.ok).map((p) => ({ url: p.url, on: p.checkedOn })), hashes: [...hashesOfPages(factPages)] });
                say("Gathering the questions people ask");
                const research = await researchFor({ id, s, sc: scNow, subject, subjectSite: offSite, rd, res });
                const c = { on: new Date().toISOString(), list: true, dims, subject, site: offSite, formula, before: was,
                  result: { ok: true, subject, subjectName: subject, subjectSite: res.subjectSite, checkedOn: res.checkedOn, pagesListed: res.pagesListed, dims: {}, requests: rd.requests() },
                  venues, fee: res.fee, rates, stats, subtests, facts, subjectPages: { urls: urls.filter((u) => !/\/(post|blog)\//.test(u)), faq: urls.find((u) => /faq/i.test(u)) ?? null, on: res.checkedOn }, byCountry, scRows: scNow?.byCountry ?? [], items: research.items.filter((x) => x.kind !== "observed" && x.kind !== "tool"), research: { sources: research.sources, aiCost: research.aiCost } };
                pwrite(id, "page-count.json", { ...c, ...listPlan(id, c) });
                /* RR-322 A5 + B4: the client's AI explains the topic and sub-test pages, and writes the strongest pages in a language people ask in */
                if (aiOf(s) && LEDGER.allowed().ok) { say("Your AI is explaining the topic and sub-test pages"); await aiContentFor(id).catch(() => null); }
                lightRun(id, 60); // RR-322 A1: the light check of 60 more universities, in the background
                return;
              }
              const res = await realityFilter({ dims, lists, subject, subjectName: subject, subjectSite: offSite, reader: rd, onProgress: say, maxUniversityReads: universityReads, siteProfessions: Boolean(formula?.professions), queries: (scNow?.queries ?? []).map((q) => q.query), countryWeight: Object.fromEntries((byCountry ?? []).map((c) => [c.country, c.impressions])) });
              let plan = null, questions = [], research = null, offRead = null, five = null, figure = null;
              if (res.ok) {
                const kept = (res.dims.countries?.kept ?? []).map((k) => k.name);
                /* RR-319 C5 + ADD 3, RR-320: each kept country's health regulators, for each profession — the client's AI suggests their pages when it
                 * is connected (a lead, never a source); Visibility reads every one itself */
                const ai = aiOf(s), leads = pread(id, "official-sources.json", {}), need = kept.filter((c) => !(leads[c] ?? []).length);
                if (ai && need.length && LEDGER.allowed().ok) { say("Asking your AI where each country's health regulators state it"); const g = await suggestOfficialPages({ ...ai, subject, items: need.slice(0, 10), professions: res.dims.roles?.professions ?? [], ...(CONFIG.aiApiBase ? { base: CONFIG.aiApiBase } : {}) }).catch(() => ({ ok: false })); if (g.usage) LEDGER.add(g.usage); if (g.ok) { for (const p of g.pages) leads[p.item] = [...(leads[p.item] ?? []).filter((x) => x.url !== p.url), { url: p.url, body: p.body, from: "your AI's search (read by Visibility before it is used)" }]; pwrite(id, "official-sources.json", leads); } }
                say("Reading the official bodies' pages for the kept countries");
                offRead = kept.length ? await refreshOfficial(id, kept).catch((e) => ({ ok: false, why: `The official bodies' pages could not be read: ${e.message}` })) : null; // RR-319: never swallowed
                /* RR-320 B · Q1: a figure of how many take it — the subject's own pages, and the page the client's AI points to (read here) */
                say(`Looking for how many people take ${subject}`);
                let lead = null; if (ai && LEDGER.allowed().ok) { const l = await figureLeadAI({ ...ai, subject, ...(CONFIG.aiApiBase ? { base: CONFIG.aiApiBase } : {}) }).catch(() => ({ ok: false })); if (l.usage) LEDGER.add(l.usage); if (l.ok) lead = { url: l.url }; }
                figure = await figureOf({ urls: (await rd.sitemapOf(offSite)).urls ?? [], subject, reader: rd, lead });
                say("Gathering the questions people ask");
                research = await researchFor({ id, s, sc: scNow, subject, subjectSite: offSite, rd, res });
                questions = groupQuestions(research.items);
                plan = planPages({ r: res, official: officialOf(id), notSaid: pread(id, "official-notsaid.json", {}), questions, formula, subject });
                five = fiveAnswers({ subject, res, plan, official: officialOf(id), byCountry, sc: scNow, items: research.items, figure, own: pread(id, "research-own.json", []), notApply: pread(id, "research-notapply.json", []), dims });
              }
              pwrite(id, "page-count.json", { on: new Date().toISOString(), dims, subject, site: offSite, formula, result: res, plan, questions, five, figure, byCountry, items: research?.items.filter((x) => x.kind !== "observed" && x.kind !== "tool") ?? [], research: research ? { sources: research.sources, aiCost: research.aiCost } : null, officialRead: offRead ?? null, advice: advise(res, { demand: [...(scNow?.queries ?? []).map((q) => ({ text: q.query }))] }) });
            })().catch((e) => pwrite(id, "page-count.json", { on: new Date().toISOString(), dims, subject, site: offSite, result: { ok: false, why: `The count stopped: ${e.message}` }, plan: null })).finally(() => { counting.delete(id); countProgress.delete(id); });
            counting.set(id, run);
            return send(200, { ok: true, running: true });
          }
          /* RR-320 B · the browser search (F11 source a): what the client's OWN AI saw in Google in his OWN browser — accepted only by the F11
           * rules (client-started, notice first, ≥20 s apart, ≤30 a day, stopped at once on a captcha); the plan is made again at once from it */
          if (r[2] === "research/handin" && req.method === "POST") {
            let hand; try { hand = JSON.parse(Buffer.from(String(json().base64 ?? ""), "base64").toString("utf8")); } catch { return send(400, { refused: "That file is not the file your AI gave you after its search." }); }
            const runs = pread(id, "phrase-runs.json", []), t = takeHandIn(hand, { runsBefore: runs });
            pwrite(id, "phrase-runs.json", [...runs, ...t.runs]);
            if (t.phrases.length) pwrite(id, "phrases.json", mergePhrases(pread(id, "phrases.json", []), t.phrases));
            const re = replan(id);
            return send(t.runs.some((x) => x.verdict === "ACCEPTED") ? 200 : 400, { ok: t.runs.some((x) => x.verdict === "ACCEPTED"), line: `${t.line}${re ? " The plan is made again with them." : ""}`, ...(t.runs.some((x) => x.verdict === "ACCEPTED") ? {} : { refused: t.line }) });
          }
          if (r[2] === "research/file" && req.method === "POST") {
            const v = json(), bytes = Buffer.from(String(v.base64 ?? ""), "base64"), text = searchFileText(bytes); // RR-323: a Keyword Planner export is UTF-16
            /* RR-324 A: a Keyword Planner file goes into the ONE keyword database (a file read twice adds nothing; a newer one updates the ranges) */
            if (/Avg\. monthly searches/i.test(text.slice(0, 4000))) {
              const st = keywordStore(id), before = st.load(), m = mergeFile(before, { name: String(v.name ?? "keyword-planner.csv").slice(0, 200), bytes, text, location: v.country ? String(v.country) : null, readOn: new Date().toISOString().slice(0, 10), exportedOn: /^\d{4}-\d{2}-\d{2}$/.test(v.exportedOn ?? "") ? v.exportedOn : null });
              if (m.refused) return send(400, { refused: m.refused });
              if (!m.alreadyRead) { st.save(m.db); replan(id); }
              const sum = keywordView(id).summary;
              return send(200, { ok: true, alreadyRead: m.alreadyRead, added: m.added, merged: m.merged, updated: m.updated, before: Object.keys(before.keywords).length, after: sum.total, line: `${m.line} ${sum.line} Google's ranges, never exact numbers.` });
            }
            const f = takeSearchFile(text, { country: v.country ? String(v.country) : null, language: v.language ? String(v.language) : null, exportedOn: /^\d{4}-\d{2}-\d{2}$/.test(v.exportedOn ?? "") ? v.exportedOn : new Date().toISOString().slice(0, 10) });
            if (!f.kind) return send(400, { refused: "That is not a Keyword Planner or Bing Webmaster file (it needs a \"Keyword\" column and \"Avg. monthly searches\" or \"Impressions\")." });
            pwrite(id, "phrases.json", mergePhrases(pread(id, "phrases.json", []), f.phrases)); replan(id);
            const dl = pread(id, "page-count.json")?.plan?.demand?.line; // RR-323: keywords → clusters → pages, said at once
            return send(200, { ok: true, line: `${f.phrases.length} phrases read from your ${f.kind} file — the tool's own estimates (Google's ranges), labelled so.${dl ? ` ${dl}.` : ""}` });
          }
          /* RR-324 A: the keyword database — the screen (the folder the client named is read first, new files only), and its folder */
          if (r[2] === "keywords" && req.method === "GET") { const pk = CONFIG.keywordFolder?.auto ? pickUpFolder(id) : { lines: [], read: 0 }; return send(200, { ...keywordView(id), picked: pk }); }
          if (r[2] === "keywords/folder" && req.method === "POST") {
            const v = json(), dir = String(v.dir ?? "").trim();
            if (!dir) { delete CONFIG.keywordFolder; saveConfig(); return send(200, { ok: true, line: "No folder — files are added one by one." }); }
            if (!existsSync(dir)) return send(400, { refused: "That folder is not on this computer." });
            CONFIG.keywordFolder = { dir, auto: v.auto !== false, location: v.location ? String(v.location).slice(0, 80) : null }; saveConfig();
            const pk = pickUpFolder(id); return send(200, { ok: true, line: pk.read ? `${pk.read} new file${pk.read === 1 ? "" : "s"} read. ${pk.lines.join(" ")}` : `No new Keyword Planner file in that folder (keyword-planner-*.csv or "Keyword Stats …").${pk.lines.length ? ` ${pk.lines.join(" ")}` : ""}` });
          }
          /* RR-324 B: Google Ads API — the client's settings (stated by him: his project's access level), his own sign-in; OFF until he switches it on */
          if (r[2] === "keywords/ads" && req.method === "POST") {
            const v = json(), g = { ...(CONFIG.googleAds ?? {}) };
            if (v.access !== undefined) g.access = ["test", "explorer", "basic", "standard"].includes(v.access) ? v.access : "test";
            if (Array.isArray(v.applied)) g.applied = v.applied.filter((x) => ["explorer", "basic", "standard"].includes(x));
            if (v.clientId !== undefined) { if (v.clientId && !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(String(v.clientId))) return send(400, { refused: "That is not an OAuth client ID (it ends .apps.googleusercontent.com)." }); g.clientId = v.clientId || null; }
            if (v.customerId !== undefined) { const d = String(v.customerId ?? "").replace(/\D/g, ""); if (d && d.length !== 10) return send(400, { refused: "A Google Ads customer ID has 10 digits." }); g.customerId = d || null; }
            if (v.on !== undefined) g.on = v.on === true;
            CONFIG.googleAds = g; saveConfig(); ADS = null; return send(200, { ok: true, ...ads().status() });
          }
          if (r[2] === "keywords/ads/start" && req.method === "POST") { const g = ads().start(`http://127.0.0.1:${server.address().port}/oauth/google-ads`); if (g.ok) { CONFIG.googleAdsPendingProduct = id; saveConfig(); } return send(g.ok ? 200 : 400, g.ok ? { ok: true, opened: openInBrowser(g.url), line: "Google's own page is open in your browser — sign in there yourself." } : { refused: g.why }); }
          if (r[2] === "keywords/ads/ideas" && req.method === "POST") {
            const v = json(), seeds = (Array.isArray(v.seeds) ? v.seeds : String(v.seeds ?? "").split(/[,\n]/)).map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
            const out = await ads().ideas({ seeds, url: v.url ?? null, geo: Array.isArray(v.geo) ? v.geo : [] }); if (!out.ok) return send(400, { refused: out.why });
            const st = keywordStore(id), m = mergeObservations(st.load(), { id: `ads-${fileIdOf(JSON.stringify(out.rows))}`, name: `Google Ads API ideas (${seeds.join(", ").slice(0, 60)})`, on: new Date().toISOString().slice(0, 10), source: KW_SOURCES.ads, period: out.period, location: v.location ?? null }, out.rows);
            if (!m.alreadyRead) { st.save(m.db); replan(id); } return send(200, { ok: true, line: m.line });
          }
          /* RR-326 E: AlmiWorld's keyword service — the plan's licence decides; no Google account, no Google sign-in for the client */
          if (r[2] === "keywords/service" && req.method === "POST") {
            const v = json(), seeds = (Array.isArray(v.seeds) ? v.seeds : String(v.seeds ?? "").split(/[,\n]/)).map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
            if (!seeds.length) return send(400, { refused: "Type at least one word." });
            const loc = SERVICE_LOCATIONS.find((l) => l.code === String(v.location ?? "ALL")) ?? SERVICE_LOCATIONS[0];
            const out = await kwService().search({ seeds, location: loc.code }); if (!out.ok) return send(400, { refused: [out.why, usageLine(out.usage)].filter(Boolean).join(" ") });
            const st = keywordStore(id), m = mergeObservations(st.load(), { id: `svc-${fileIdOf(JSON.stringify([loc.code, out.rows]))}`, name: `AlmiWorld keyword service (${seeds.join(", ").slice(0, 60)})`, on: new Date().toISOString().slice(0, 10), source: KW_SOURCES.service, period: out.period, location: loc.name }, out.rows);
            if (!m.alreadyRead) { st.save(m.db); replan(id); }
            return send(200, { ok: true, line: [m.line, usageLine(out.usage)].filter(Boolean).join(" ") });
          }
          if (r[2] === "keywords/service/usage" && req.method === "GET") { const u = await kwService().usage(); return send(200, { ok: u.ok, line: u.ok ? `${serviceOnLine(u)} (${usageLine(u)})` : `${SERVICE_OFF_LINE} (${u.why})` }); } // RR-327: "on — N searches left this month"
          /* RR-324 C: DataForSEO — OFF, "waiting for the provider's written permission", until the owner ticks it AND switches it on; caps first */
          if (r[2] === "keywords/dfs" && req.method === "POST") {
            const v = json(), d = { ...(CONFIG.dataForSeo ?? {}) };
            if (v.permission !== undefined) d.permission = v.permission === true;
            if (v.on !== undefined) d.on = v.on === true;
            for (const k of ["capDay", "capMonth"]) if (v[k] !== undefined) { const n = Number(v[k]); if (!(n >= 0 && n <= 1000)) return send(400, { refused: "A cap is a number of US dollars, 0 to 1,000." }); d[k] = n; }
            CONFIG.dataForSeo = d; saveConfig(); return send(200, { ok: true, ...dfsOf().status() });
          }
          if (r[2] === "keywords/dfs/volume" && req.method === "POST") {
            const v = json(), db0 = keywordStore(id).load(), words = Array.isArray(v.keywords) ? v.keywords : Object.values(db0.keywords).map((k) => k.text);
            const out = await dfsOf().volume(words, { location: v.location ?? null, language: v.language ?? null }); if (!out.ok && !out.rows?.length) return send(400, { refused: out.why });
            const st = keywordStore(id), m = mergeObservations(st.load(), { id: `dfs-${fileIdOf(JSON.stringify(out.rows))}`, name: "DataForSEO search volume", on: new Date().toISOString().slice(0, 10), source: KW_SOURCES.dataforseo, period: null, location: v.location ? String(v.location) : null }, out.rows);
            if (!m.alreadyRead) { st.save(m.db); replan(id); } return send(200, { ok: true, line: `${m.line} Bought ${out.bought ?? 0}, from the cache ${out.cached ?? 0}; cost $${(out.cost ?? 0).toFixed(4)}.` });
          }
          /* the client's own question, added to the five (free text) */
          if (r[2] === "research/own" && req.method === "POST") {
            const v = json(), own = pread(id, "research-own.json", []);
            if (v.notApply) { const na = new Set(pread(id, "research-notapply.json", [])); if (v.on === false) na.delete(String(v.notApply)); else na.add(String(v.notApply)); pwrite(id, "research-notapply.json", [...na].filter((x) => /^q[1-5]$/.test(x))); replan(id); return send(200, { ok: true }); }
            const text = String(v.text ?? "").trim().slice(0, 300); if (text.length < 5) return send(400, { refused: "Write your question (a few words at least)." });
            pwrite(id, "research-own.json", [...own, { id: `own-${own.length + 1}`, text, on: new Date().toISOString().slice(0, 10) }]); replan(id);
            return send(200, { ok: true, line: "Added — it is answered from the sources below, and goes first on your AI's browser-search list." });
          }
          /* C5 · "Make these pages (drafts)" — THE FIRST BATCH (RR-320: 50–100; the next only when Google shows them), answered from their official
           * pages; nothing is published for AlmiWorld */
          /* RR-321 E5 · BEFORE a batch is made: one full regulator page and one full university page, so the client judges their quality first
           * (the regulator's own page is read now — robots by RFC 9309 — and kept for the batch) */
          if (r[2] === "count/preview" && req.method === "POST") {
            const v = json(), c = pread(id, "page-count.json");
            if (!c?.list || !c.plan) return send(400, { refused: "Count first — the preview shows two of the planned pages." });
            if (!site) return send(400, { refused: "Check your website first — the pages are made in its look." });
            /* RR-322 PROOF: six full pages — a regulator (NMBI), "OET Writing for <profession>", a university, a topic, a page in another
             * language and "Where to take" — each judged against B6–B7 (the answer first, its table, steps, checklist, tip, last updated,
             * the call to action, at least 3 links) */
            const K = c.plan.kinds, rp = K.regulator.find((p) => p.title === v.regulator) ?? K.regulator.find((p) => /\(NMBI\)/.test(p.title)) ?? K.regulator[0];
            if (!rp) return send(400, { refused: "No regulator page is planned." });
            const rd = reader(); await readRegulatorFor(id, rp, rd);
            const sub = K.subtest.find((p) => p.title === v.subtest) ?? K.subtest.find((p) => p.subtest === "Writing" && p.profession === "pharmacy") ?? K.subtest[0];
            /* RR-323 PROOF: the demand pages — "OET Writing sample for nurses", "OET exam fees", "How to book OET / the test dates",
             * "OET Listening practice test" — with the regulator (NMBI) and "Where to take"; their samples written and checked first */
            const PK = c.plan.practiceKeys ?? {}, keyOf = (re) => Object.entries(PK).find(([t]) => re.test(t))?.[0] ?? null;
            const wantTitles = [keyOf(/Writing sample for nurses/), keyOf(/^\S+ Listening practice test/)].filter(Boolean);
            if (aiOf(s) && LEDGER.allowed().ok) await aiContentFor(id, { only: [sub?.title, ...wantTitles, ...K.topic.slice(0, 1).map((p) => p.title)].filter(Boolean) }).catch(() => null);
            replan(id);
            const c2 = pread(id, "page-count.json"), K2 = c2.plan.kinds, pick = (k, t) => (t ? K2[k].find((p) => p.title === t) : null) ?? null, by = (k, re) => (K2[k] ?? []).find((p) => re.test(p.title)) ?? null;
            const demandFirst = Boolean(c2.plan.numbers?.kpKeywords);
            /* RR-327 PROOF: one page from each of seven families — a country (Pakistan), nurses from Pakistan, a city (Lahore), the regulator
             * (NMBI), "OET Writing sample for nurses", "OET exam fees", a university — a family whose page is a SECTION is named with its gate */
            const local = c2.plan.numbers?.countryPages !== undefined, G2 = c2.plan.gates ?? {};
            /* RR-328 (owner): "OET in Pakistan" (all five parts) and "OET for nurses from Pakistan" — no city pages any more */
            const SEVEN = [["country", /^\S+ in Pakistan:/, "OET in Pakistan"], ["countryprof", /for nurses from Pakistan/, "OET for nurses from Pakistan"]];
            const stopWhy = (k) => { const S = c2.plan.localStopped ?? {}; if (k === "country") return S.country?.find((x) => x.country === "Pakistan")?.why ?? null; const x = S.countryprof?.find((y) => y.country === "Pakistan" && y.profession === "nursing"); return x ? `stopped — missing: ${x.missing.map((m) => (m === "council" ? "its own council in Pakistan" : "searches from Pakistan that name nurses")).join(" and ")}` : null; };
            const sevenLocal = SEVEN.map(([k, re]) => by(k, re) ?? (K2[k] ?? [])[0] ?? null);
            const six = local ? [...sevenLocal, pick("regulator", rp.title) ?? K2.regulator.find((p) => p.listId === rp.listId), by("practice", /Writing sample for nurses/), by("topic", /exam fees$/), K2.university.find((p) => p.title === v.university) ?? K2.university.find((p) => p.country === "Pakistan") ?? K2.university[0]].filter(Boolean) : (demandFirst ? [pick("regulator", rp.title) ?? K2.regulator.find((p) => p.listId === rp.listId), by("practice", /Writing sample for nurses/), by("topic", /exam fees$/), by("topic", /^How to book/), by("practice", /Listening practice test/), K2.taking[0]]
              : [pick("regulator", rp.title) ?? K2.regulator.find((p) => p.listId === rp.listId), pick("subtest", sub?.title), K2.university.find((p) => p.title === v.university) ?? K2.university[0], K2.topic[0] ?? null, K2.language[0] ?? null, K2.taking[0]]).filter(Boolean);
            const built = seoPages({ site, on: new Date().toISOString(), pagePlan: six, subject: c.subject, official: officialOf(id) });
            const html = (p) => built.drafts.find((d) => d.title === p.title) ?? null;
            const judge = (p) => { const x = p.content ?? {}; return { answerWords: x.answerWords, answerOk: x.answerWords >= 40 && x.answerWords <= 60 && x.answerHasNumber, table: (x.table?.length ?? 1) - 1, steps: x.steps?.length ?? 0, checklist: x.checklist?.length ?? 0, faq: x.faq?.length ?? 0, tip: Boolean(x.tip), cta: Boolean(x.cta), lastUpdated: x.lastUpdated, links: p.links?.length ?? 0, dataPoints: p.dataPoints?.length ?? 0, status: p.status, range: p.kp?.label ?? null, waitFor: p.waitFor ?? null, sample: p.sampleCheck ? { ok: p.sampleCheck.ok, why: p.sampleCheck.why, run: p.sampleCheck.run, labelled: p.sampleCheck.labelled, words: p.sampleCheck.words, against: p.sampleCheck.against ?? null } : null }; };
            const out = six.map((p) => ({ kind: p.kind, title: p.title, read: p.read ?? null, lastChecked: p.lastChecked, claims: p.claims, content: p.content, links: p.links, judge: judge(p), draft: html(p) ? { html: html(p).html, readyAsDraft: html(p).readyAsDraft, gates: html(p).gates } : null }));
            const missing = local ? SEVEN.map(([k, re, name]) => (by(k, re) ? null : `${name}: ${(G2[k]?.sections ?? []).find((x) => re.test(x.name))?.why ?? (G2[k]?.merged ?? []).find((x) => re.test(x.name))?.why ?? stopWhy(k) ?? "not in the universe (no data for it)"}${sevenLocal[SEVEN.findIndex((x) => x[0] === k)] ? ` — previewed instead: ${sevenLocal[SEVEN.findIndex((x) => x[0] === k)].title}` : ""}`)).filter(Boolean) : demandFirst ? [[/Writing sample for nurses/, "practice", "OET Writing sample for nurses"], [/exam fees$/, "topic", "OET exam fees"], [/^How to book/, "topic", "How to book OET and the test dates"], [/Listening practice test/, "practice", "OET Listening practice test"]].map(([re, k, name]) => { const p = by(k, re); return !p ? `${name} (not a page: too thin or not searched)` : p.waitFor ? `${name} — ${p.waitFor}` : null; }).filter(Boolean)
              : [!K2.topic.length && "a topic page (no topic page yet — connect your AI so it can explain them)", !K2.language.length && "a page in another language (no language with demand among your chosen ones yet)"].filter(Boolean);
            pwrite(id, "preview.json", { on: new Date().toISOString(), pages: out, missing });
            const r2 = pick("regulator", rp.title) ?? K2.regulator.find((p) => p.listId === rp.listId) ?? rp; // RR-327: the regulator previewed (no longer always the first page)
            return send(200, { ok: true, pages: out, missing, line: `${r2.read?.ok ? `${r2.body}'s own page was read (${r2.read.on})` : `${r2.body}'s own page could not be read (${r2.read?.why ?? "not read"}) — it waits for a confirmed score`}. ${out.length} pages previewed${missing.length ? `; not yet: ${missing.join("; ")}` : ""}.` });
          }
          /* RR-322 A1 · the light check of the next universities, in the background (a batch at a time) */
          if (r[2] === "count/light" && req.method === "POST") { const n = Math.max(10, Math.min(200, Number(json().n) || 60)); const ok = lightRun(id, n); return send(ok ? 200 : 409, ok ? { ok: true, line: `Checking ${n} more universities' own sites in the background (robots obeyed, at most two pages each).` } : { refused: busy.has(`${id}|light`) ? "A light check is already running." : "No university left to check, or count first." }); }
          /* RR-322 A2 · every regulator's own page read now (in the background) */
          if (r[2] === "count/confirm" && req.method === "POST") { if (busy.has(`${id}|confirm`)) return send(409, { refused: "Already reading the regulators' pages." }); const st = { what: "confirm", done: 0 }; busy.set(`${id}|confirm`, st); confirmRegulators(id, { say: (x) => { st.stage = x; } }).catch(() => null).finally(() => busy.delete(`${id}|confirm`)); return send(200, { ok: true, line: "Reading each regulator's own page in the background — a page whose score is confirmed leaves \"waiting\"." }); }
          /* RR-322 A5 + B4 · the client's AI explains the topic and sub-test pages and writes the strongest pages in a language people ask in */
          if (r[2] === "count/ai" && req.method === "POST") { if (!aiOf(s)) return send(400, { refused: "Connect your AI first (Settings → Your AI connection)." }); const x = await aiContentFor(id); return send(x.ok ? 200 : 400, x.ok ? { ok: true, line: `Your AI's explanations and translations are added — every number in them stands in the page's own facts. ${LEDGER.line()}` } : { refused: "Your AI could not be used now." }); }
          /* RR-322 A2–A4 + C2 · what the client's own AI read in his own browser (a file) — measured, never kept as text */
          if (r[2] === "research/browser" && req.method === "POST") { let hand; try { hand = JSON.parse(Buffer.from(String(json().base64 ?? ""), "base64").toString("utf8")); } catch { return send(400, { refused: "That is not the file your AI gave you after reading the pages." }); } const x = await takeBrowser(id, hand); return send(x.ok ? 200 : 400, x.ok ? x : { refused: x.line }); }
          /* RR-322 C3 · the index report: Google's own state of each made, live page; the next batch rule; the work before a new batch */
          if (r[2] === "count/index" && req.method === "POST") return send(200, { ok: true, ...(await indexReport(id)) });
          if (r[2] === "count/recheck" && req.method === "POST") { const x = await recheckSources(id); return send(200, { ok: true, line: x.proposals ? `${x.proposals} number${x.proposals === 1 ? "" : "s"} changed on their sources — the updates are proposed below; nothing was changed by itself.` : "The sources were checked again — no number changed." }); }
          if (r[2] === "count/make" && req.method === "POST" && pread(id, "page-count.json")?.list) {
            /* RR-321 · the first batch: each regulator page of it read now (slow — a few minutes), then the drafts, in the background */
            const c = pread(id, "page-count.json"); if (!c?.plan) return send(400, { refused: "Count first — then make the pages Visibility planned." });
            if (!site) return send(400, { refused: "Check your website first — the pages are made in its look and linked to it." });
            if (counting.has(id)) return send(409, { refused: "Visibility is still working on this product — wait for it to finish." });
            const run = (async () => {
              const say = (p) => countProgress.set(id, { stage: p, at: new Date().toISOString() });
              /* RR-322 A2: every regulator's own page first — a page whose score is confirmed leaves "waiting"; then the batch (25 → 50 → …) */
              const conf = await confirmRegulators(id, { say }), regs = { length: conf.read };
              const batchesMade = pread(id, "batches.json", []), states = pread(id, "index-states.json", {}), rule = nextBatch(batchesMade.at(-1), states, { on: new Date().toISOString() });
              if (!rule.allowed) { pwrite(id, "make.json", { on: new Date().toISOString(), line: `No new batch: ${rule.why}.` }); return; }
              const c2 = pread(id, "page-count.json"), all = Object.values(c2.plan.kinds).flat(), made = new Set(batchesMade.flatMap((b) => b.titles ?? []));
              const batchTitles = (c2.plan.rollout.batchTitles ?? [c2.plan.rollout.first]).find((b) => b.some((t) => !made.has(t))) ?? c2.plan.rollout.first, first = new Set(batchTitles.filter((t) => !made.has(t)));
              const pages = all.filter((p) => first.has(p.title));
              pwrite(id, "planned.json", pages.map((p) => ({ text: p.title, source: `How many pages (${p.kind}${p.weak ? ", an opportunity page — no search yet" : `, answers ${p.questions.length} question${p.questions.length === 1 ? "" : "s"}`})` })));
              pwrite(id, "made-plan.json", pages);
              say("Making the drafts");
              const x = await createPages(id); const n = x.pages.drafts.filter((d) => d.readyAsDraft).length;
              /* RR-323 proof: 2 of the batch got no draft and the line said only "23 of 25" — each one is named, with the planner's reason */
              const notMade = pages.filter((p) => !x.pages.drafts.some((d) => d.title === p.title)).map((p) => `${p.title} — ${(x.pages.plan ?? []).find((r) => r.question === p.title)?.why ?? "not built"}`);
              pwrite(id, "batches.json", [...batchesMade, { made: new Date().toISOString(), titles: pages.map((p) => p.title), urls: x.pages.drafts.filter((d) => first.has(d.title)).map((d) => d.url) }]);
              didIt(id, `Made ${n} page draft${n === 1 ? "" : "s"} from "How many pages" (the first batch: ${pages.length} of ${all.length} planned; ${regs.length} regulator pages read).`);
              pwrite(id, "make.json", { on: new Date().toISOString(), drafts: n, planned: pages.length, all: all.length, read: regs.length, notMade, line: `${n} of the first batch's ${pages.length} pages made as drafts (${all.length} planned in all); ${regs.length} regulators' own pages read for it.${notMade.length ? ` Not made as a page of its own: ${notMade.join("; ")}.` : ""} Read them under "Pages and articles".${isAlmiWorld(s) ? ` ${ALMIWORLD_NO}` : ""}` });
            })().catch((e) => pwrite(id, "make.json", { on: new Date().toISOString(), line: `Making stopped: ${e.message}` })).finally(() => { counting.delete(id); countProgress.delete(id); });
            counting.set(id, run);
            return send(200, { ok: true, running: true, line: "Reading each regulator's own page of the first batch, then making the drafts — a few minutes. You can leave this screen." });
          }
          if (r[2] === "count/make" && req.method === "POST") {
            const c = pread(id, "page-count.json"); const all = c?.plan ? Object.values(c.plan.kinds).flat() : [], first = new Set(c?.plan?.rollout?.first ?? all.map((p) => p.title)), pages = all.filter((p) => first.has(p.title));
            if (!pages.length) return send(400, { refused: "Count first — then make the pages Visibility planned." });
            if (!site) return send(400, { refused: "Check your website first — the pages are made in its look and linked to it." });
            pwrite(id, "planned.json", pages.map((p) => ({ text: p.title, source: `How many pages (${p.kind}${p.weak ? ", an opportunity page — no search yet" : `, answers ${p.questions.length} question${p.questions.length === 1 ? "" : "s"}`})` })));
            pwrite(id, "made-plan.json", pages);
            const x = await createPages(id); const n = x.pages.drafts.filter((d) => d.readyAsDraft).length;
            didIt(id, `Made ${n} page draft${n === 1 ? "" : "s"} from "How many pages" (the first batch: ${pages.length} of ${all.length} planned).`);
            return send(200, { ok: true, line: `${n} of the first batch's ${pages.length} page${pages.length === 1 ? "" : "s"} made as drafts (${all.length} planned in all) — read them under "Pages and articles". A page that is not ready lacks an official fact with its source and date (it says which). The next batch comes when your Search Console shows Google showing these.${isAlmiWorld(s) ? ` ${ALMIWORLD_NO}` : ""}`, drafts: n, planned: pages.length, all: all.length });
          }
          /* B6 · the official pages per country: what was read, what each says, and the leads to read (pasted, or suggested by the client's AI) */
          if (r[2] === "official" && req.method === "GET") return send(200, { subject: aboutOf(s), site: s.setup?.official?.site ?? null, claims: officialOf(id), notSaid: pread(id, "official-notsaid.json", {}), leads: pread(id, "official-sources.json", {}) });
          if (r[2] === "official/page" && req.method === "POST") {
            const v = json(), item = String(v.item ?? "").trim(); let url; try { url = new URL(String(v.url ?? "").trim()); } catch { return send(400, { refused: "That is not a web address." }); }
            if (!/^https?:$/.test(url.protocol) || !item) return send(400, { refused: "Give the country and the official page's address." });
            const leads = pread(id, "official-sources.json", {}); leads[item] = v.remove ? (leads[item] ?? []).filter((x) => x.url !== url.href) : [...(leads[item] ?? []).filter((x) => x.url !== url.href), { url: url.href, body: String(v.body ?? "").trim() || null, from: "you" }];
            pwrite(id, "official-sources.json", leads);
            const o = await refreshOfficial(id, [item]); return send(o.ok ? 200 : 400, o.ok ? { ok: true, claims: officialOf(id)[item] ?? [], notSaid: pread(id, "official-notsaid.json", {})[item] ?? [] } : { refused: o.why });
          }
          if (r[2] === "official/suggest" && req.method === "POST") {
            const ai = aiOf(s); if (!ai) return send(400, { refused: "Connect your AI key first (Settings → Your AI connection) — or paste the official pages yourself." });
            const ok = LEDGER.allowed(); if (!ok.ok) return send(400, { refused: ok.why });
            const items = (Array.isArray(json().items) ? json().items : []).slice(0, 10).map(String); if (!items.length || !aboutOf(s)) return send(400, { refused: "Count first, then ask for the official pages of the countries kept." });
            const g = await suggestOfficialPages({ ...ai, subject: aboutOf(s), items, ...(CONFIG.aiApiBase ? { base: CONFIG.aiApiBase } : {}) }); if (g.usage) LEDGER.add(g.usage);
            if (!g.ok) return send(400, { refused: g.why, aiCost: LEDGER.line() });
            const leads = pread(id, "official-sources.json", {}); for (const p of g.pages) leads[p.item] = [...(leads[p.item] ?? []).filter((x) => x.url !== p.url), { url: p.url, body: p.body, from: "your AI's search (read by Visibility before it is used)" }];
            pwrite(id, "official-sources.json", leads);
            const o = await refreshOfficial(id, items);
            return send(o.ok ? 200 : 400, o.ok ? { ok: true, suggested: g.pages.length, claims: officialOf(id), notSaid: pread(id, "official-notsaid.json", {}), aiCost: LEDGER.line() } : { refused: o.why });
          }
          /* D · Search Console power: rank tracking, opportunities, alerts — and the Generative AI report, said plainly */
          if (r[2] === "search" && req.method === "GET") { const h = pread(id, "search-history.json"); return send(200, { connected: sc?.kind === "CONNECTED", site: sc?.site ?? null, searches: sc?.queries?.length ?? 0, window: sc?.window ?? null, power: h ? searchPower(h, { siteName: site ? siteNameOf(site) : null }) : null }); }
          if (r[2] === "search/read" && req.method === "POST") {
            if (sc?.kind !== "CONNECTED") return send(400, { refused: "Connect Google Search Console first — rank tracking reads Google's own figures for your site, week by week." });
            const p = await GOOGLE.performance(sc.site, { weeks: 13 }); if (!p) return send(400, { refused: "Google did not give the weekly figures — press Connect again in Google Search Console." });
            const h = mergeHistory(pread(id, "search-history.json"), p); pwrite(id, "search-history.json", h);
            return send(200, { ok: true, line: `Read ✓ — ${h.weeks.length} weeks of positions from Google Search Console (the last 3 months).`, power: searchPower(h, { siteName: site ? siteNameOf(site) : null }) });
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
        let ok = r.ok, why = r.why ?? "", again = null;
        const e = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
        /* RR-315 A3 + A4: another channel came back — say which, say which is needed, list what Google gave, and offer Try again */
        if (r.ok) { const want = confirmedChannel(r.id); if (!want?.channelId || r.channelId !== want.channelId) { YT_SIGNIN.signOut(r.id); ok = false;
          const others = (r.channels ?? []).map((c) => c.title ?? "a channel with no name");
          why = `Google gave the channel ${r.channelTitle ?? "(none — this Google account has no YouTube channel)"}, but this product needs ${want?.title ?? "its confirmed channel"}. Nothing was kept.${others.length > 1 ? ` The channels Google gave: ${others.join(", ")}.` : ""} Press Try again and, when Google asks which account or channel, choose ${want?.title ?? "the product's channel"} (it may be listed as a brand account under your email).`;
          YT_LAST.set(r.id, { line: why, came: r.channelTitle ?? null, needed: want?.title ?? null }); again = { id: r.id, title: want?.title ?? "the right channel", write: r.write === true };
        } else { YT_LAST.delete(r.id); YT.refreshSigned(r.id, { force: true }).catch(() => {}); } }
        else if (r.id) YT_LAST.set(r.id, { line: why });
        return send(200, `<!doctype html><meta charset="utf-8"><title>AlmiVisibility</title><body style="font:16px system-ui;padding:40px"><h2>${ok ? "Signed in to YouTube ✓" : again ? "Not connected — another channel came back" : "Not connected"}</h2><p>${ok ? `${e(r.channelTitle ?? "")} — go back to AlmiVisibility; your channel's own data is read now.${r.write ? " \"Apply to YouTube\" is on." : ""}` : e(why)}</p>${again ? `<p><a href="/oauth/youtube/again?product=${encodeURIComponent(again.id)}${again.write ? "&write=1" : ""}" style="display:inline-block;background:#F4A58A;color:#1A1A2E;padding:10px 18px;border-radius:999px;font-weight:600;text-decoration:none">Try again — choose ${e(again.title)}</a></p>` : ""}</body>`, "text/html; charset=utf-8");
      }
      /* RR-315 A3: "Try again" on that page — a new sign-in, straight to Google's chooser in the same browser tab */
      if (req.method === "GET" && u.pathname === "/oauth/youtube/again") {
        const id = u.searchParams.get("product") ?? ""; if (!confirmedChannel(id)) return send(400, "No such product.", "text/plain; charset=utf-8");
        const s = YT_SIGNIN.start(id, `http://127.0.0.1:${server.address().port}/oauth/youtube`, { write: u.searchParams.get("write") === "1" });
        if (!s.ok) return send(400, s.why, "text/plain; charset=utf-8");
        res.writeHead(302, { location: s.url }); return res.end();
      }
      /* RR-324 B: Google sends the browser back here after the client signed in to Google Ads himself */
      if (req.method === "GET" && u.pathname === "/oauth/google-ads") {
        const r = await ads().finish({ code: u.searchParams.get("code"), state: u.searchParams.get("state"), error: u.searchParams.get("error") });
        return send(200, `<!doctype html><meta charset="utf-8"><title>AlmiVisibility</title><body style="font:16px system-ui;padding:40px"><h2>${r.ok ? "Signed in to Google Ads ✓" : "Not connected"}</h2><p>${r.ok ? "Go back to AlmiVisibility." : String(r.why).replace(/</g, "&lt;")}</p><p><a href="/#count=${encodeURIComponent(CONFIG.googleAdsPendingProduct ?? "")}">Back to AlmiVisibility</a></p></body>`, "text/html; charset=utf-8");
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
            if (y[2] === "write" && req.method === "POST") { const r = await YT.write(yid, json()); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why, fallback: r.fallback === true, aiCost: r.aiCost ?? null }); } // RR-317 A: the templates instead, said plainly
            if (y[2] === "file" && req.method === "POST") { const r = YT.addFile(yid, json()); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            /* ── RR-311 A · YouTube sign-in (the channel owner, in his browser), its data, real chapters ── */
            if (y[2] === "signin" && req.method === "GET") { const st = YT_SIGNIN.status(yid); return send(200, { ready: st.ready, signedIn: st.signedIn, write: st.write, last: st.signedIn ? null : YT_LAST.get(yid)?.line ?? null }); } // RR-314 A1: the tab waits for this; RR-315 A3: or for a refusal
            if (y[2] === "signin" && req.method === "POST") { YT_LAST.delete(yid); const r = YT_SIGNIN.start(yid, `http://127.0.0.1:${server.address().port}/oauth/youtube`, { write: json().write === true }); return send(r.ok ? 200 : 400, r.ok ? { ok: true, url: r.url, choose: chooseLine(confirmedChannel(yid)), opened: openInBrowser(r.url) } : { refused: r.why, adds: SIGNIN_ADDS }); }
            if (y[2] === "signout" && req.method === "POST") { YT_SIGNIN.signOut(yid); rmSync(pfile(yid, "youtube-signed.json"), { force: true }); return send(200, { ok: true, line: "Signed out of YouTube for this product. Visibility forgot the access and the analytics it had read." }); }
            if (y[2] === "signed" && req.method === "POST") { const r = await YT.refreshSigned(yid, { force: json().force === true }); return send(r.ok ? 200 : 400, r.ok ? { ok: true, on: r.data.on, reach: r.data.reach?.line ?? null } : { refused: r.why }); }
            if (y[2] === "chapters" && req.method === "POST") { const r = await YT.chapters(yid, json().videoId); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why, neutral: r.neutral === true }); }
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
