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
import { browserOpener, STRIPE_BILLING_ORIGIN } from "./open-browser.mjs"; // RR-314 A1
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, rmSync, readdirSync, statSync } from "node:fs";
import { PILOT_CHANNELS } from "../config/youtube/pilot-channels.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { licenceState, mayAddProduct, plansView, PLANS, planLimitLine, readOwnerLicenceText, isOwnerLicence, verifyLicence, cleanLicenceText } from "./licence.mjs";
import { checkForUpdate, downloadUpdate, installUpdate } from "./updater.mjs";
import { LANGUAGES } from "../src/page/languages.mjs";
import { STEPS, checkStep, webAddress, stepsFor, CHOICES, HOWTO, recommended, ctaFrom, ctaOfSetup, NO_CTA } from "./setup.mjs";
import { FACTS_FILE, readFactsFile, addFactsFile, officialClaimsOf, countryLinesOf, factsFileView, factsOfStore } from "./facts-file.mjs"; // RR-351
import { examPlan, serviceFactsOf, usableFacts , settleLocal } from "./exam-plan.mjs"; // RR-354
import { destinationsFor, professionQuestions, connectByMeaning, searchMissing , readDetails } from "./research.mjs"; // RR-356
import { plainWhy, JOBS, jobReport, notMadeOf } from "./plain-words.mjs"; // RR-354
import { CF_PRIORITY } from "./country-facts.mjs"; // RR-354
import { bingQueries, bingPhrases, bingKeyName, BING_HOWTO, BING_SETUP_STEPS } from "./bing-webmaster.mjs"; // RR-353
import { SOCIAL_NETWORKS, socialFrom, socialShare, AUTO_POST_LINE } from "./social-links.mjs"; // RR-353
import { readSite, readShell, addressOpens, USER_AGENT } from "./site-read.mjs";
import { scoreCard, foundInfo, fixForMe } from "./product-check.mjs";
import { googleConnect, importExport } from "./google-connect.mjs";
import { seoPages, articleOfDay, socialFor, monthReport, inSiteLook } from "./seo-pages.mjs";
import { menuFor, seoCheck, aeoCheck, geoCheck, linksCheck, languagesCheck } from "./features.mjs";
import { productStore, productCard } from "./products.mjs";
import { TARGETS, checkTarget, publishDraft, unpublish, editDraft, mainOf, fixVia, fixExisting, improveExisting } from "./publish.mjs";
import { improvePack } from "./improve.mjs"; // RR-356
import { personOf, questionsOf, clusterIntents, coverageOf, secondSearch, decisionOf, rightToExist, afterPublish, BATCH } from "./recipe.mjs"; // RR-356 the recipe
import { searchGoogle, searchPages, SERP_OFF, SERP, realPrice, runEstimate, RETRY } from "./serp.mjs"; // RR-356 G1/G5 (OFF by default)
import { ARTICLE_DEST, EMAIL_SUMMARY, destOf, publishRefusal, todayNotice, markdownOf } from "./article-dest.mjs"; // RR-344 B
import { homedir } from "node:os";
import { cssVariables } from "./theme.mjs";
import { articleSettings, settingsView, PUBLISH_MODE } from "../src/page/articles.mjs";
import { keyStore, windowsBackend, memoryBackend, KEY_NAMES, AI_PROVIDERS } from "./secrets.mjs";
import { youtubeApp } from "./youtube-app.mjs";
import { SOCIAL_PLATFORMS, socialSetup, socialPlan, writeCaptionsAI } from "./social-app.mjs"; // RR-348 b
import { LOCATIONS } from "../site/kw-seeds.mjs"; // RR-348 c: a country name → its code for the creator data
import { youtubeSignin, SIGNIN_ADDS } from "./youtube-signin.mjs";
import { guidePage, guideList } from "./guides.mjs";
import { aiLedger, askCoach, DEFAULT_CAP_USD } from "./ai-coach.mjs";
import { actionPlan, willDo, planDocument, isAlmiWorld, publishBlocked, subjectOf, productSubject, NO_SUBJECT } from "./action-plan.mjs";
import { plainYouTubeWhy } from "../src/video/youtube.mjs"; // RR-313 A3
import { writeWebWithAI, webMaterial, suggestOfficialPages, KINDS as WEB_KINDS, understandFormulaAI, researchQuestionsAI, figureLeadAI } from "./web-ai.mjs"; // RR-318 A
import { officialReader, officialClaims } from "./official.mjs"; // RR-318 B6
import { realityFilter, advise, listFromFile, DIMENSIONS } from "./page-count.mjs"; // RR-318 C
import { parseFormula, fromGuided, groupQuestions, faqQuestions, planPages, subjectProblem, formulaOf } from "./page-plan.mjs"; // RR-319
import { fiveAnswers, fiveFromList, questionsByCountry, browserSearchList, takeHandIn, takeSearchFile, searchFileText, figureOf } from "./research5.mjs"; // RR-320 B
import { recognitionOf, callNames } from "./recognition.mjs"; // RR-321 A
import { planFromList } from "./plan-list.mjs"; // RR-321 B
import { venueCountries, statisticsOf, gazetteerOf } from "./venues.mjs"; // RR-321 G1, B2; RR-327 the venue cities
import { readRates, OPEN_RATES, openRates } from "./rates.mjs"; // RR-321 D5; RR-355 the one rate service
import { sortQuestions } from "./questions.mjs"; // RR-321 C
import { readRegulator } from "./regulator-read.mjs"; // RR-321 A2/A4
import { regulatorPagesOf } from "./recognition.mjs"; // RR-322 A2
import { subtestFactsOf } from "./pseo.mjs"; // RR-322 B5
import { lightCheck, teachesHealth, professionsOfFields, professionsInName } from "./universities.mjs"; // RR-322 A1
import { subjectFactsOf, SUBJECT_FACT_PAGES, FACTS_FOR } from "./subject-facts.mjs"; // RR-323
import { checkSample, hashesOfPages, labelOf, displayNameOf } from "./samples.mjs"; // RR-323; RR-324 D2
import { localKeywordStore, mergeFile, mergeObservations, itemsOf, summaryOf, trendOf, currentOf, keyOf, fileIdOf, FILE_NAME, SOURCES as KW_SOURCES, byLocationOf } from "./keyword-db.mjs"; // RR-324 A; RR-327 per country
import { googleAds, ADS_KEYS } from "./google-ads.mjs"; // RR-324 B
import { genericPlanPages, almiSeoClient, syncProduct, heldFor, keywordItems, questionItems, coverageRoutes, routeLine, coverageItems, coverageFromBrowser, reviewLinesFor, almiSeoView, searchedLists, searchCounts, ALMISEO_FILE, ALMISEO_KEYWORDS, BROWSER_COVERAGE, SYNC, ROUTES } from "./almiseo.mjs"; // RR-360 AlmiSEO Data
import { spawn } from "node:child_process"; // RR-362: the watcher
import { jobBoard, LONG_SECONDS } from "./jobs.mjs"; // RR-362
import { nextStepOf, checksDue, TOP_JOBS, MORE_JOBS } from "./next-step.mjs"; // RR-362
import { windowsToast } from "./notify.mjs"; // RR-362
import { TYPE_WORDS } from "./page-types.mjs"; // RR-362
import { keywordService, usageLine, SERVICE_LOCATIONS, serviceOnLine, SERVICE_OFF_LINE, PLAN_REUSE_DAYS, collectForPlan, countryFactsForPlan, ownDb } from "./keyword-service.mjs"; // RR-326 E; RR-327 the plan reads it
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
  /* RR-342: the key goes in the request BODY (a query string lands in the site's request logs); a site not yet updated answers 404 → the old GET */
  try {
    const account = CONFIG.account ?? "unset", wait = () => AbortSignal.timeout(4000);
    let r = await fetch(new URL("v1/licence", LICENCE_URL), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account }), signal: wait() });
    if (r.status === 404 || r.status === 405) r = await fetch(new URL(`v1/licence?account=${encodeURIComponent(account)}`, LICENCE_URL), { signal: wait() });
    if (r.ok) check = { reached: true, signed: await r.json() };
  } catch {}
  const st = licenceState({ now: Date.now(), check, last: licenceLast(), publicKeyPem: keyPem("licence-public.pem"), owner: CONFIG.owner ?? null, account: CONFIG.account ?? null });
  if (st.last) saveLicence(st.last);
  return st;
}
const limitLine = planLimitLine;
/* RR-326 E: the licence the app runs under (the owner's, or the last good check's) — what AlmiWorld's keyword service checks */
const currentLicence = () => { if (CONFIG.owner) return CONFIG.owner; const s = licenceLast()?.signed ?? null; return s?.licence?.account === CONFIG.account ? s : null; }; // RR-342: never another licence's check
const kwService = () => keywordService({ siteUrl: CONFIG.keywordServiceUrl ?? LICENCE_URL, signed: currentLicence() });

const page = () => readFileSync(join(HERE, "ui.html"), "utf8").replace("/*SUNRISE*/", cssVariables());
let updateFound = null, updateReady = null, updateDownloading = null; // RR-355: the newer version, downloaded and verified in the background
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
/* RR-340: the buyer's own Stripe page (the customer portal) — only Stripe's billing address is ever opened; tests never open a browser */
const openBilling = browserOpener({ only: [STRIPE_BILLING_ORIGIN, CONFIG.testBillingOrigin], mode: CONFIG.testSecretsInMemory === true ? "none" : null });
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
/* 🔴 RR-362 item 6 · ONE BOARD OF EVERY WAIT (desktop/jobs.mjs); a long job that ended tells Windows, for a closed window */
const BOARD = jobBoard({ onFinish: (j) => { if (j.tookSeconds >= LONG_SECONDS && CONFIG.toasts !== false && !allowLocal) windowsToast({ title: `AlmiVisibility: ${j.label}`, line: j.line ?? (j.ok ? "Done." : "It stopped. Open the app to see why.") }); } });
/** CHECK NOW: read the site (robots obeyed) and/or the confirmed YouTube channel; keep the facts (never the pages' HTML) and the score card */
async function checkProduct(id) {
  if (checking.has(id)) return checking.get(id);
  const started = Date.now();
  const jobKey = `check:${id}`; BOARD.start(jobKey, { product: id, kind: "check", label: "Checking your site", what: "Starting", unit: "pages" });
  const say = (p) => { progress.set(id, { ...p, started }); BOARD.step(jobKey, { done: p.done ?? 0, of: p.of > 1 ? p.of : 0, what: p.stage }); };
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
  })().then((card) => { BOARD.finish(jobKey, { ok: !card?.failed, line: card?.failed ? "The check could not finish. Open the app to see why." : "Your site is checked." }); return card; }, (e) => { BOARD.finish(jobKey, { ok: false }); throw e; }).finally(() => { checking.delete(id); progress.delete(id); });
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
  /* RR-358: an existing page to improve is never published as a second page */
  const mine = (pread(id, "pages.json")?.drafts ?? []).find((x) => x.url === url);
  if (mine?.improve) return { ok: false, improve: true, why: IMPROVE_NOT_PUBLISHED };
  if (publishBlocked(store.read(id))) return { ok: false, why: ALMIWORLD_NO }; // RR-310 D5
  const refusal = publishRefusal(destOf(pread(id, "articles-go.json"), store.read(id).setup?.publishMode?.mode)); // RR-344 B
  if (refusal) return { ok: false, why: refusal };
  if (!ctaOf(store.read(id))) return { ok: false, needsCta: true, why: NO_CTA }; // RR-351: no page goes out without the client's own offer button
  const conn = pread(id, "publish.json");
  if (!conn?.kind) return { ok: false, needsConnection: true, why: "First choose where your site is built (Publish settings)." };
  const { s, site, sc, files } = contextOf(id);
  if (!site) return { ok: false, why: "Check your product first — the gates need your site's latest read." };
  const again = seoPages({ site, target: pread(id, "publish.json")?.kind ?? null, searchConsole: sc, files, youtube: s.setup?.youtube?.confirmed ? YT.foundFor(id) : null, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}), official: officialForPages(id), cta: ctaOf(store.read(id)), planned: plannedOf(id), own: ownItemsOf(id), subject: aboutOf(store.read(id)), ...seoExtras(id), ...madePlanOf(id) });
  const d = again.drafts.find((x) => x.url === url);
  if (!d) return { ok: false, why: "This draft is out of date — what Visibility knows changed since it was made. Press Create SEO pages again." };
  if (!/data-cta>/.test(d.html ?? "")) return { ok: false, needsCta: true, why: `Not published — the page has no offer button. ${NO_CTA}` };
  if (!d.readyAsDraft) return { ok: false, gates: d.gates, why: `Not published — a check failed right before publishing: ${d.gates.filter((g) => !g.pass && g.failing.length).map((g) => `${g.words}: ${g.failing.join("; ")}`).join(" · ")}` };
  if ((pread(id, "published.json", [])).some((x) => x.url === url && x.state === "LIVE")) return { ok: false, why: "This page is already published." };
  /* RR-356 PART B: a topic the client already has a page for is IMPROVED on that page — never published as a second page */
  if (d.improve) {
    const pack = packOf(id, d), keyName = TARGETS.find((x) => x.id === conn.kind)?.keyName;
    const r = await improveExisting({ target: conn, key: keyName ? KEYS.get(publishKeyName(conn.kind, id)) : null, url: d.improve.url, section: pack.html, allowLocal, testBase: CONFIG.testPublishBase ?? null });
    if (r.ok) { pwrite(id, "published.json", [...pread(id, "published.json", []).filter((x) => x.url !== url), { url, state: "LIVE", live: d.improve.url, improved: true, on: new Date().toISOString() }]); didIt(id, `Improved your page ${d.improve.url}.`); }
    return r.ok ? { ok: true, line: r.line, improved: d.improve.url } : { ok: false, why: r.why, pack: `/api/products/${encodeURIComponent(id)}/improve-pack?url=${encodeURIComponent(url)}` };
  }
  const t = conn, keyNeeded = TARGETS.find((x) => x.id === t.kind).keyName;
  const out = await publishDraft({ draft: d, target: t, key: keyNeeded ? KEYS.get(publishKeyName(t.kind, id)) : null, downloadsDir: downloadsFor(id), allowLocal, testBase: CONFIG.testPublishBase ?? null });
  if (!out.ok) return out;
  pwrite(id, "published.json", [...pread(id, "published.json", []), { url, title: d.title, target: t, remote: out.remote, live: out.live, saved: out.saved ?? null, on: new Date().toISOString(), state: "LIVE" }]);
  /* D4: Search Console — the sitemap submitted only with the client's extra permission; otherwise said what to do */
  let sitemap = null;
  if (out.live && sc?.kind === "CONNECTED" && CONFIG.googleCanSubmit === true) { const g = await GOOGLE.submitSitemap(sc.site, `${site.origin}/sitemap.xml`); sitemap = g.ok ? `Your sitemap was sent to Google Search Console (${site.origin}/sitemap.xml).` : g.why; }
  else if (out.live) sitemap = "Tell Google about the new page: Search Console → Sitemaps → submit your sitemap (or connect Google with \"also tell Google about my new pages\").";
  /* RR-353 (owner: "IndexNow on publish"): a live page is sent to Bing at once — once the key file on the site is checked (Search engines) */
  let bing = null;
  const inx = pread(id, "indexnow.json");
  if (out.live && inx?.verified === true) {
    const b = await indexNow({ urls: [out.live], key: inx.key, origin: site.origin, endpoint: allowLocal && CONFIG.indexNowEndpoint ? CONFIG.indexNowEndpoint : INDEXNOW_ENDPOINT, fetchImpl: fetch }).catch(() => ({ ok: false, why: "IndexNow did not answer" }));
    const subs = pread(id, "submissions.json", {}); subs[out.live] = { ...subs[out.live], bing: b.ok ? { state: "SUBMITTED", on: new Date().toISOString(), note: "IndexNow, on publish" } : { state: "FAILED", on: new Date().toISOString(), why: b.why } }; pwrite(id, "submissions.json", subs);
    bing = b.ok ? "Sent to Bing at once (IndexNow)." : `Bing (IndexNow): ${b.why} — press Submit to try again.`;
  } else if (out.live) bing = "Bing: not sent yet — put your IndexNow key file on your site (Search engines), then every new page is sent at once.";
  return { ok: true, live: out.live, saved: out.saved ?? null, sitemap, bing, line: out.live ? `Published ✓ — live at ${out.live}` : `Saved ✓ — the page's files are in ${out.saved}. Put index.html on your site at ${url} (the folder has a note saying where).` };
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
const ALMIWORLD_NO = "AlmiWorld's own product: nothing is published or submitted from here (owner's rule). The plan and the drafts are yours to read. To publish it, mark it a real project in Settings → Your product.";
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
    const pages = web ? seoPages({ site: web, target: pread(id, "publish.json")?.kind ?? null, searchConsole: sc, files, youtube: ytData, on, overrides: pread(id, "edits.json", {}), official: officialForPages(id), cta: ctaOf(store.read(id)), planned: plannedOf(id), own: ownItemsOf(id), subject: aboutOf(store.read(id)), ...seoExtras(id), ...madePlanOf(id) }) : null;
    const found = foundInfo({ site: web, youtube: ytData, files, searchConsole: sc, keys: { ai: ctx.aiKey }, own: ownItemsOf(id), asked: askedOf(id), on });
    const plan = actionPlan({ product: s.product, on, card: ctx.check, site: web, pages, found, youtube: advice, languages: s.setup?.languages?.codes ?? [], youtubeOnly: !hasWebsite(s) });
    pwrite(id, "plan.json", plan);
    return plan;
  })().finally(() => planning.delete(id));
  planning.set(id, run);
  return run;
}
/** RR-358: the plan's sources — the keyword database, the search-data files, the pages, the research — newer than the plan itself */
const planTried = new Map();
const PLAN_SOURCES = ["keyword-db.json", "search-data-files.json", "pages.json", "research.json", "ai-research.json", "almiseo.json"];
const planStale = (id, plan) => { const t = Date.parse(plan?.on ?? ""); if (!Number.isFinite(t)) return false; return PLAN_SOURCES.some((n) => { try { return statSync(pfile(id, n)).mtimeMs > t + 2000; } catch { return false; } }); };
const weeklyOf = (id) => { const w = pread(id, "weekly.json", {}), c = pread(id, "check.json"); const last = c?.on ?? null; return { on: w.on !== false, last, next: last ? new Date(Date.parse(last) + 7 * 864e5).toISOString() : null }; };
const willDoOf = (id, plan) => { const s = store.read(id), sc = searchConsoleOf(id), inx = pread(id, "indexnow.json");
  return willDo(plan, { mode: s.setup?.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */, connected: Boolean(pread(id, "publish.json")?.kind), almiworld: publishBlocked(s), drafts: pread(id, "pages.json")?.drafts ?? [], live: pread(id, "published.json", []).filter((r) => r.state === "LIVE"), submitted: pread(id, "submissions.json", {}), canSubmitGoogle: sc?.kind === "CONNECTED" && CONFIG.googleCanSubmit === true, indexNowReady: inx?.verified === true, weekly: weeklyOf(id), product: subjectOf({ what: s.setup?.product?.what, name: s.product?.name }) }); };
/* ── RR-318 · the official answers, "How many pages", the website's AI writing, Search Console power ── */
const officialOf = (id) => pread(id, "official.json", {});
/* RR-351: what a PAGE may say — the official pages Visibility read, then the owner's facts file (its VERIFIED facts only). The read store
 * (official.json) is never written with the file's facts: refreshOfficial and the plan read officialOf, the pages read this */
const officialForPages = (id) => { const out = { ...officialOf(id) }; for (const [c, xs] of Object.entries(officialClaimsOf(pread(id, FACTS_FILE, null)))) out[c] = [...xs, ...(out[c] ?? [])]; return out; };
/* RR-351: a country page's lines from the facts file — its VERIFIED facts first (as the owner's own checked lines), then "check the official page" */
const withFactsFile = (id, cfs) => { const out = { ...cfs }; for (const [c, x] of Object.entries(countryLinesOf(pread(id, FACTS_FILE, null)))) out[c] = { ...(out[c] ?? { country: c }), owner: [...x.owner, ...(out[c]?.owner ?? [])], checkOfficial: x.checkOfficial }; return out; };
/* RR-319: once the client made pages from "How many pages", THAT plan is the page list everywhere (one page per different answer) */
/* RR-354: else the exam plan Create SEO pages made by itself (auto-plan.json: profession pages, country pages, topics) — the same plan every call reads */
/* RR-359: the exam plan only for the subject it was made for (a plan made under another subject — or under a guessed one — is not this product's) */
const autoPlanOf = (id) => { const a = pread(id, "auto-plan.json", null), s = store.read(id); return a?.pages?.length && (examProduct(s, id) || a.fromAlmiSeo === true /* RR-360 */) && String(a.subject ?? seedOf(s)).toLowerCase() === String(seedOf(s)).toLowerCase() ? a : null; };
const madePlanOf = (id) => { const p = pread(id, "made-plan.json", null)?.length ? pread(id, "made-plan.json", null) : autoPlanOf(id)?.pages; return p?.length ? { pagePlan: p, max: p.length } : {}; };
const counting = new Map(), countProgress = new Map(); // product id → a running count, and what it reads now
const plannedOf = (id) => pread(id, "planned.json", []);
/* RR-353: a website's own name (no www., any path) — two products with the same one are the same site */
const hostOf = (u) => { try { return new URL(webAddress(u) ?? u).hostname.replace(/^www\./i, "").toLowerCase(); } catch { return null; } };
const sameSiteProduct = (site, exceptId = null) => { const h = hostOf(site); return h && !/(^|\.)youtube\.com$/.test(h) ? store.list().find((x) => x.id !== exceptId && hostOf(x.product?.site) === h) ?? null : null; };
/*
 * 🔴 RR-353 (owner, 31 Oct 2026: "use OUR OWN data first … Create SEO pages must work for AlmiOET without Search Console"). The searches a
 * product's pages are planned from: AlmiVisibility's own first — AlmiWorld's keyword service (into the ONE keyword database), the client's
 * search-data files (Keyword Planner, Bing Webmaster, Bing's own connection) — then Search Console, and the client's AI research only when
 * nothing else knew a search. Every call that makes the drafts reads the SAME list (publishing judges a draft made from the same data).
 */
/* 🔴 RR-359 (owner's run: "almiworld youtube" made OET pages — the first capital-letter word of its description was taken as its subject):
 * the product's OWN subject (action-plan.mjs productSubject) — none → Create SEO pages asks for it */
const seedOf = (s) => productSubject(s);
/* RR-355: the questions AlmiWorld's question collector found for the product (kept with the country facts) — each with its page and day */
const askedOf = (id) => (!examProduct(store.read(id), id) ? [] /* RR-359: collected for the exam's subject only */ : Object.values(pread(id, "country-facts.json", null)?.countries ?? {})).flatMap((p) => p?.questions ?? []).filter((q) => q?.value?.question && /^https:\/\//.test(q.source ?? "")).map((q) => ({ text: q.value.question, source: `AlmiWorld's question collector (answered from ${q.source})`, on: String(q.readOn ?? "").slice(0, 10) || null }));
/* 🔴 RR-360 · ALMISEO DATA FIRST (owner's ruling R13): the product's keywords and question groups, read from AlmiWorld's collectors for its OWN subject (desktop/almiseo.mjs) — each search once. A big file is read once per change */
const memoFile = new Map();
const preadMemo = (id, name) => { const f = pfile(id, name); let t = null; try { t = statSync(f).mtimeMs; } catch { return null; } const k = `${id}|${name}`, m = memoFile.get(k); if (m?.t === t) return m.v; const v = pread(id, name, null); memoFile.set(k, { t, v }); return v; };
const seoFileOf = (id) => heldFor(preadMemo(id, ALMISEO_FILE), seedOf(store.read(id)));
const ownItemsOf = (id) => {
  const subject = seedOf(store.read(id)), seen = new Set(), once = (x) => { const k = keyOf(x.text); if (!k || seen.has(k)) return false; seen.add(k); return true; };
  return [
    ...phraseItems(id).filter((x) => x.text).map((x) => ({ text: x.text, source: x.source, on: x.on ?? null, weight: (x.weight ?? 4) + 2 + (Number.isFinite(Number(x.volume)) && Number(x.volume) > 0 ? Math.log10(1 + Number(x.volume)) : 0) })).filter(once),
    ...questionItems(preadMemo(id, ALMISEO_FILE), subject).filter(once),
    ...keywordItems(preadMemo(id, ALMISEO_KEYWORDS), subject).filter(once),
    ...pread(id, "ai-research.json", []).map((x) => ({ text: x.text, source: x.source, weight: 1 })).filter(once),
  ];
};
/* every call that makes the drafts judges them by the same data: the coverage a page without a plan was given, and the facts AlmiSEO Data found changed */
const seoExtras = (id) => { const g = pread(id, "generic-coverage.json", {}); return { coverageFor: (t) => g[t] ?? null, reviewFor: (m) => reviewLinesFor({ country: m.country ?? null }, seoFileOf(id)) }; };
/* 🔴 OWNER'S RULING 2: a licence that is not AlmiWorld's own gets finished pages only */
const outsideClient = () => { const l = currentLicence(); return Boolean(l) && !isOwnerLicence(l.licence); };
/* 🔴 RR-362 item 14 (R13): each search this run made goes to AlmiSEO Data, so the server and every later run reuse it. A failed send is said in the count; the search stays kept here */
async function saveSearches(id, pages) {
  if (CONFIG.testOffline === true || !currentLicence()) return 0;
  const lists = searchedLists(pages, seoFileOf(id)); let saved = 0;
  for (let i = 0; i < lists.length; i += 50) { const r = await seoClient().saveSearches({ subject: seedOf(store.read(id)), lists: lists.slice(i, i + 50) }).catch(() => null); if (r?.ok) saved += r.saved + r.kept; }
  return saved;
}
const seoClient = () => almiSeoClient({ siteUrl: CONFIG.keywordServiceUrl ?? LICENCE_URL, signed: currentLicence() });
const seoSyncing = new Map();
/** one read of AlmiSEO Data for one product (at most one at a time); an exam product's country facts land where its plan reads them */
function syncAlmiSeo(id) {
  if (seoSyncing.has(id)) return seoSyncing.get(id);
  const run = (async () => {
    const s = store.read(id), subject = seedOf(s); if (!subject || !currentLicence()) return { ok: false, why: !subject ? "no subject" : "no plan" };
    const r = await syncProduct({ client: seoClient(), subject, name: s.product?.name ?? null, site: s.setup?.official?.site ?? null, intents: (pread(id, "auto-plan.json", null)?.pages ?? []).map((p) => p.title), read: (n, d) => pread(id, n, d), write: (n, v) => pwrite(id, n, v) });
    if (r.ok && !r.empty && !r.outside && examProduct(s, id)) { const f = pread(id, ALMISEO_FILE, null); if (Object.keys(f?.countries ?? {}).length) pwrite(id, "country-facts.json", { on: String(f.readOn).slice(0, 10), countries: f.countries, from: "AlmiSEO Data" }); }
    return r;
  })().catch((e) => ({ ok: false, why: String(e?.message ?? e).slice(0, 120) })).finally(() => seoSyncing.delete(id));
  seoSyncing.set(id, run); return run;
}
const seoFresh = (id) => { const f = seoFileOf(id); return Boolean(f?.readOn) && (Date.now() - Date.parse(f.readOn)) / 36e5 < SYNC.beforeRunHours; };
/** before the drafts are made: AlmiWorld's keyword service asked for the product's subject (fresh answers are reused 30 days); then, only
 *  when no search is known at all, the client's own AI researches the questions (said as research, never as searches) → { lines } */
async function gatherOwnDemand(id) {
  const s = store.read(id), subject = seedOf(s), lines = [];
  /* RR-360: AlmiSEO Data first — read within the last hours, or read now. The old one-word search stays only for a server that does not answer it yet */
  const seo = !subject || !currentLicence() ? null : seoFresh(id) ? { ok: true, line: seoFileOf(id)?.outside ? seoFileOf(id).line : seoFileOf(id)?.counts ? `AlmiSEO Data: ${seoFileOf(id).counts.keywords.toLocaleString("en-US")} keywords, ${seoFileOf(id).counts.questions} question groups, ${seoFileOf(id).counts.countries} countries, ${seoFileOf(id).counts.plan} planned pages (read ${String(seoFileOf(id).readOn).slice(0, 10)})` : null } : await syncAlmiSeo(id);
  if (seo?.line) lines.push(seo.line);
  const seoRead = seo?.ok === true;
  /* RULING 2: the old keyword route is AlmiWorld's own */
  if (subject && !seoRead && !outsideClient()) { const svc = await serviceForPlan(id, subject).catch(() => ({ on: false, line: SERVICE_OFF_LINE })); lines.push(svc.line); }
  /* RR-354 (owner: "the keyword, question and country-fact collectors connected automatically"): AlmiWorld's country facts for the main
   * countries — asked once a day, kept in country-facts.json, read by the plan beside the owner's facts file */
  if (examProduct(s, id) && !seoRead && !outsideClient()) { const cfx = await countryFactsForPlan({ service: currentLicence() ? kwService() : null, cache: { load: () => pread(id, "country-facts.json", null), save: (v) => pwrite(id, "country-facts.json", v) }, countries: examCountriesOf(id) }).catch(() => ({ line: "AlmiWorld country facts: not reachable just now" })); lines.push(cfx.line); }
  const sc = searchConsoleOf(id);
  if (!ownItemsOf(id).length && !(sc?.queries ?? []).length && !plannedOf(id).length) {
    const ai = aiOf(s);
    if (ai && LEDGER.allowed().ok) {
      const a = await researchQuestionsAI({ ...ai, subject: subject ?? s.product?.name ?? "", what: s.setup?.official?.description ?? s.setup?.product?.what ?? "", countries: [], professions: [], ...(CONFIG.aiApiBase ? { base: CONFIG.aiApiBase } : {}) }).catch((e) => ({ ok: false, why: String(e?.message ?? e).slice(0, 120) }));
      if (a.usage) LEDGER.add(a.usage);
      const on = new Date().toISOString().slice(0, 10);
      if (a.ok && a.questions?.length) pwrite(id, "ai-research.json", a.questions.map((q) => ({ text: q, source: `your AI's research (${on}) — an AI estimate, not search data`, on })));
      lines.push(a.ok ? `${a.questions?.length ?? 0} questions from your AI's research — research, not searches.` : `Your AI's research: ${a.why}`);
    }
  }
  return { lines, subject };
}
/*
 * 🔴 RR-354 · AN EXAM-PREP PRODUCT'S OWN PLAN (owner: "profession pages and country pages, not only keyword pages"): a product whose subject
 * has its built-in professions (AlmiWorld's OET) gets one page per profession and per main country, the searches joined to them — made by
 * Create SEO pages itself, kept in auto-plan.json. A plan the client made in "How many pages" (made-plan.json) still comes first.
 */
const examProduct = (s, id) => Boolean(listOf(s, seedOf(s), id));
/* RR-360: + every country AlmiSEO Data holds with all its parts (it was the first 10 only) */
const examCountriesOf = (id) => { const own = [...new Set(factsOfStore(pread(id, FACTS_FILE, null)).map((f) => f.country))], all = Object.values(seoFileOf(id)?.countries ?? {}).filter((p) => p.complete).map((p) => p.country); return [...new Set([...(own.length ? own : all.length ? [] : CF_PRIORITY).slice(0, 10), ...all])]; };
/*
 * 🔴 RR-355 · THE TWO MORE COLLECTORS A PAGE OF AN EXAM-PREP PRODUCT NEEDS, asked by Create SEO pages itself (the client never uploads them):
 *   · the subject's OWN pages about each sub-test, booking, results and scores (desktop/subject-facts.mjs) — read once a week, kept in
 *     subject-facts.json (its numbers in Visibility's own words, never the page's sentences);
 *   · the ONE exchange-rate service every page uses (owner decision: never a central bank's page) — read once a day, kept in rates-open.json.
 * Each said in plain words when it could not be read; nothing is made up in its place.
 */
async function subjectFactsFor(id, subject) {
  const kept = pread(id, "subject-facts.json", null), site = store.read(id).setup?.official?.site ?? (/^oet$/i.test(String(subject)) ? "https://oet.com" : null);
  if (!site || CONFIG.testOffline === true) return { facts: kept?.facts ?? {}, line: kept ? `${subject}'s own pages: read ${String(kept.on).slice(0, 10)}` : null };
  if (kept?.on && kept.v === 355 && (Date.now() - Date.parse(kept.on)) / 864e5 < 7) return { facts: kept.facts, line: `${subject}'s own pages: read ${String(kept.on).slice(0, 10)}` };
  try {
    const rd = reader(), urls = ((await rd.sitemapOf(site)).urls ?? []).filter((u) => SUBJECT_FACT_PAGES.test(String(u).replace(/\/$/, ""))).slice(0, 16), pages = [];
    for (const u of urls) pages.push(await rd.read(u));
    const facts = subjectFactsOf(pages, subject);
    if (Object.keys(facts).length) pwrite(id, "subject-facts.json", { v: 355, on: new Date().toISOString(), site, facts });
    return { facts: Object.keys(facts).length ? facts : kept?.facts ?? {}, line: `${subject}'s own pages: ${Object.keys(facts).length} facts read from ${pages.filter((p) => p.ok).length} pages` };
  } catch (e) { return { facts: kept?.facts ?? {}, line: `${subject}'s own pages could not be read just now` }; }
}
async function oneRatesFor(id) {
  const kept = pread(id, "rates-open.json", null), today = new Date().toISOString().slice(0, 10);
  const shown = (r) => (r ? { ...r, short: OPEN_RATES.short, source: OPEN_RATES.source, link: OPEN_RATES.link } : null);
  if (CONFIG.testOffline === true || (kept?.readOn === today)) return shown(kept);
  try { const res = await fetch(CONFIG.testRatesUrl ?? OPEN_RATES.url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15000) }); const r = res.ok ? openRates(await res.text()) : null; if (r) { pwrite(id, "rates-open.json", { ...r, readOn: today }); return shown(r); } } catch { /* said below */ }
  return shown(kept);
}
/* a site built by a framework (Next.js: its pages' titles are written in code) — its files are not plain pages a fix can be written into */
const siteFramework = (id) => /\/_next\/|__NEXT_DATA__|\/_nuxt\/|data-reactroot/.test(String(pread(id, "site-read.json")?.shell?.head ?? ""));
const fixViaOf = (id, s) => { const t = pread(id, "publish.json"); return t?.kind && !publishBlocked(s) ? ["title", "meta-description"].filter((k) => fixVia(t, k, { framework: siteFramework(id) })) : []; };
/*
 * 🔴 RR-356 · THE RESEARCH ENGINE, run by Create SEO pages before the plan is made (desktop/research.mjs): for each profession, the question
 * list (one score question per country the exam owner's list names a regulator in), the facts already checked connected by meaning, then
 * the regulators' own pages read for what is still open — at most RESEARCH_READS regulators a run (the rest on the next run), each page kept
 * 30 days in research-reads.json. The questions, their answers and where Visibility searched are kept in research.json (the ledger).
 */
/* RR-362 (G7): the regulator pages a type-C page needs: one address serves all its boards, kept 30 days */
const RESEARCH_READS = 6, DETAIL_READS = 12;
async function examResearch(id, subject, onRead = null) {
  const s = store.read(id), list = listOf(s, subject, id)?.items ?? [];
  const facts = usableFacts([...factsOfStore(pread(id, FACTS_FILE, null)), ...Object.values(serviceFactsOf(pread(id, "country-facts.json", null)?.countries ?? {}, subject)).flat()]);
  /* RR-362: each page read is kept at once: a run that stops never reads it twice */
  const reads = pread(id, "research-reads.json", {}), cache = { get: (u) => reads[u] ?? null, set: (u, v) => { reads[u] = v; pwrite(id, "research-reads.json", reads); } };
  const out = {}, budget = { left: CONFIG.testOffline === true ? 0 : Number.isInteger(CONFIG.testResearchReads) ? CONFIG.testResearchReads : RESEARCH_READS }, rd = budget.left > 0 ? reader() : null;
  for (const prof of professionsOf()) { const qs = professionQuestions({ subject, prof, destinations: destinationsFor(prof, list) }); connectByMeaning({ questions: qs, facts, prof, subject }); out[prof] = qs; }
  /* RR-359: with the client's search-results switch on, Google's results name each council's own page (its own website only; cached) */
  const st = serpSettings(), login = KEYS.get(DFS_KEYS.login), password = KEYS.get(DFS_KEYS.password), ledger = st.on === true && login && password ? dfsLedger() : null;
  const findPages = ledger ? async (body) => { const r = await searchGoogle({ keyword: `${body.short ?? body.name} ${subject} English language requirement`, settings: st, ledger, login, password, retry: Number.isInteger(CONFIG.testSerpPauseMs) ? { ...RETRY, pauseMs: CONFIG.testSerpPauseMs } : RETRY, ...(CONFIG.serpTestUrl ? { fetchImpl: (u2, init) => fetch(CONFIG.serpTestUrl, init) } : {}) }); return r.ok ? r.results.map((x) => x.url) : []; } : null;
  for (const prof of Object.keys(out)) await searchMissing({ questions: out[prof], subject, reader: rd ?? { on: new Date().toISOString().slice(0, 10) }, cache, budget, findPages, onRead }).catch(() => null);
  const details = { left: CONFIG.testOffline === true ? 0 : Number.isInteger(CONFIG.testDetailReads) ? CONFIG.testDetailReads : DETAIL_READS }, rd2 = details.left > 0 ? rd ?? reader() : null;
  for (const prof of Object.keys(out)) await readDetails({ questions: out[prof], subject, reader: rd2 ?? { read: async () => null }, cache, budget: details, onRead }).catch(() => null);
  lastResearchReads = (Number.isInteger(CONFIG.testResearchReads) ? CONFIG.testResearchReads : RESEARCH_READS) - budget.left + (Number.isInteger(CONFIG.testDetailReads) ? CONFIG.testDetailReads : DETAIL_READS) - details.left;
  if (ledger) writeFileSync(DFS_LEDGER_FILE, JSON.stringify(ledger));
  pwrite(id, "research-reads.json", reads);
  pwrite(id, "research.json", { on: new Date().toISOString(), questions: out });
  return out;
}
let lastResearchReads = 0;
/* RR-356 PART B · the improvement pack of a draft whose topic the client already has a page for (desktop/improve.mjs) */
const packOf = (id, d) => improvePack({ draft: d, existing: (pread(id, "site-read.json")?.pages ?? []).find((p) => p.url === d.improve?.url) ?? { url: d.improve?.url } });
function writePacks(id, drafts) {
  const site = pread(id, "site-read.json"), out = [];
  const seenUrls = new Set(); /* RR-362 item 16: one improve entry per existing page */
  for (const d of drafts.filter((x) => x.improve && !seenUrls.has(x.improve.url) && seenUrls.add(x.improve.url))) { const p = packOf(id, d), slug = String(d.improve.url).replace(/^https?:\/\/[^/]+\/?/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
    pwrite(id, `improve-${slug}.json`, { on: new Date().toISOString(), ...p, page: inSiteLook(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Improve: ${p.title}</title></head><body><main><h1>Improve: ${p.title}</h1><p>For your page ${p.url}</p>${p.html || "<p>Nothing to add.</p>"}</main></body></html>`, site?.shell ?? null) }); out.push({ title: d.title, url: d.improve.url, add: p.add.length, slug }); }
  return out;
}
/*
 * 🔴 RR-356 · THE RECIPE'S STEPS RUN BY CREATE SEO PAGES (desktop/recipe.mjs, desktop/serp.mjs):
 *   G1/G5/G6 — with the client's search-results switch ON (Settings → Search results data; OFF by default, at most $1 a day): for each page's
 *   intent, Google's top 10, "People also ask", related searches, and Reddit / Quora AS GOOGLE SHOWS THEM ("<intent> reddit",
 *   "site:quora.com <intent>") → questions people ask (never facts); the top results' own headings read (robots obeyed) → the coverage list;
 *   the second-search test → the questions the best result leaves open. With it OFF, nothing is bought and each ledger says so.
 */
/* 🔴 RR-357 (owner: "the switch only appears after pressing Count … and the app has NO place at all to enter the DataForSEO login and API
 * password"): ONE app-wide setting for the client's own DataForSEO account — the same switch, caps and spend serve the search-results steps
 * (G1/G5/G6) and the keyword data. OFF until the client switches it on; never more than $1 a day (R10); a month's cap too. */
const searchData = () => { const d = CONFIG.dataForSeo ?? {}; return { on: d.on === true, capDay: Math.min(SERP.capPerDay, Number(d.capDay) > 0 ? Number(d.capDay) : SERP.capPerDay), capMonth: Number(d.capMonth) > 0 ? Math.min(31, Number(d.capMonth)) : 30 }; };
const serpSettings = () => searchData();
/* RR-362 items 14 + 17: several pages side by side (each site still read politely), a search kept is reused free even with the switch off, a top page's headings read once a month */
const SERP_SIDE_BY_SIDE = 6;
const hasKeptSearch = (pages) => { const c = dfsLedger().serpCache ?? {}; return pages.some((p) => c[`${p.title}||`]); };
async function serpStep(id, plan, onPage = null) {
  const st = serpSettings(), ledger = dfsLedger(), on = new Date().toISOString();
  if (st.on !== true && !hasKeptSearch(plan.pages)) return { on: false, why: SERP_OFF, searches: 0, reddit: 0, quora: 0 };
  const login = st.on === true ? KEYS.get(DFS_KEYS.login) : null, password = st.on === true ? KEYS.get(DFS_KEYS.password) : null, rd = reader(), tops = pread(id, "top-reads.json", {});
  const out = await searchPages({ pages: plan.pages, ledger, settings: st, login, password, now: on, subject: seedOf(store.read(id)), retry: Number.isInteger(CONFIG.testSerpPauseMs) ? { ...RETRY, pauseMs: CONFIG.testSerpPauseMs } : RETRY, readHtml: (u) => rd.raw(u, "text/html"), concurrency: Number.isInteger(CONFIG.testSerpSideBySide) ? CONFIG.testSerpSideBySide : SERP_SIDE_BY_SIDE, topCache: { get: (u) => tops[u] ?? null, set: (u, v) => { tops[u] = v; } }, onPage, ...(CONFIG.serpTestUrl ? { fetchImpl: (u2, init) => fetch(CONFIG.serpTestUrl, init) } : {}) });
  writeFileSync(DFS_LEDGER_FILE, JSON.stringify(ledger)); pwrite(id, "top-reads.json", tops);
  pwrite(id, "auto-plan.json", { ...pread(id, "auto-plan.json", {}), pages: plan.pages });
  return { on: true, ...out };
}
/* ── G0, G2, G4, G8, G9 into each draft's ledger; G20 the verdicts after publishing ── */
function recipeLedger(id, pages, serp, rounds, generic = null) {
  const s = store.read(id), subject = seedOf(s) ?? s.product?.name ?? "", plan = pread(id, "auto-plan.json", null)?.pages ?? [];
  for (const d of pages.drafts ?? []) {
    const p = plan.find((x) => x.title === d.title) ?? generic?.find((x) => x.title === d.title) ?? { kind: "topic", title: d.title, questions: [] }, row = (pages.plan ?? []).find((r) => r.question === d.title) ?? { kind: "NEW" };
    const qs = questionsOf(p, { subject, on: String(pages.madeOn ?? "").slice(0, 10) }), answered = (d.html.match(/<details data-need-id/g) ?? []).length;
    const pack = d.improve ? packOf(id, d) : null;
    d.recipe = { ...(d.recipe ?? {}), ...personOf(p, { subject }), intents: clusterIntents(qs).map((c) => ({ intent: c.intent, wordings: c.wordings.length })), questions: qs.map((q) => ({ question: q.question, from: q.from, source: q.source })),
      fromReddit: qs.filter((q) => q.from === "reddit").length, fromQuora: qs.filter((q) => q.from === "quora").length,
      serp: { route: p.coverageRoute ?? ROUTES.none, on: p.coverageOn ?? null, read: p.topRead ?? [], line: p.coverageRoute && p.coverageRoute !== ROUTES.none ? routeLine(p) : p.serpWhy ? `Google's results were not read for this page: ${p.serpWhy}` : routeLine(p) },
      almiseo: (() => { const f = seoFileOf(id); return f?.counts && !f.outside ? { read: f.readOn, keywords: f.counts.keywords, questions: f.counts.questions, country: p.country && f.countries?.[p.country] ? { complete: f.countries[p.country].complete, missing: f.countries[p.country].missing ?? [] } : null } : null; })(), askedTotal: p.asked ?? (p.questions ?? []).length,
      decision: decisionOf({ row, pack }), right: rightToExist({ page: p, questions: qs, answered }), rounds };
  }
  return pages;
}
async function measuredAfter(id) {
  const live = pread(id, "published.json", []).filter((r) => r.state === "LIVE"), sc = searchConsoleOf(id), perPage = {};
  for (const r of sc?.pages ?? []) perPage[r.page ?? r.url] = { impressions: r.impressions ?? 0, clicks: r.clicks ?? 0 };
  return afterPublish({ live, perPage, improved: pread(id, "improved-once.json", {}) });
}
/* RR-357 · the Search results data screen's state, and THE ONE PICTURE OF WHAT CAN COST MONEY (owner: "what can cost money, its cap, and
 * today's spend") — only the client's own accounts cost the client; AlmiWorld's own services are included in the plan */
const spentDfs = () => { const l = dfsLedger(), now = new Date().toISOString(), sum = (p) => (l.spent ?? []).filter((x) => String(x.on).startsWith(p)).reduce((t, x) => t + (Number(x.cost) || 0), 0); return { day: sum(now.slice(0, 10)), month: sum(now.slice(0, 7)) }; };
function searchDataView(productId = null) {
  const st = searchData(), sp = spentDfs(), keys = KEYS.status(DFS_KEYS.login).saved && KEYS.status(DFS_KEYS.password).saved;
  /* 🔴 RR-359 (owner: the estimate said about $0.19, the run cost $0.40): the price DataForSEO really charged, and one run of THIS product */
  const l = dfsLedger(), price = realPrice(l), titles = (() => { try { return productId ? (autoPlanOf(String(productId))?.pages ?? []).map((p) => p.title) : []; } catch { return []; } })(), estimate = runEstimate({ titles, ledger: l, price: price.price });
  return { howTo: HOWTO.dataForSeo, on: st.on, capDay: st.capDay, capMonth: st.capMonth, maxDay: SERP.capPerDay, keysSaved: keys, loginSaved: KEYS.status(DFS_KEYS.login).saved, passwordSaved: KEYS.status(DFS_KEYS.password).saved, spentToday: sp.day, spentMonth: sp.month, pricePerSearch: price.price, priceFrom: price.from, priceOn: price.on, estimate,
    line: st.on ? `On — spent today $${sp.day.toFixed(4)} of $${st.capDay}, this month $${sp.month.toFixed(4)} of $${st.capMonth}.` : keys ? "Off — your login is saved; switch it on when you want Google's results read." : "Off — nothing is bought. Add your DataForSEO login first." };
}
function spendView() {
  const sd = searchDataView(), ai = LEDGER.month(), aiToday = LEDGER.today(), aiCap = Number(CONFIG.aiMonthlyCapUSD ?? DEFAULT_CAP_USD);
  const rows = [
    { what: "Search results data (your own DataForSEO account)", on: sd.on, cap: `$${sd.capDay} a day, $${sd.capMonth} a month`, today: `$${sd.spentToday.toFixed(4)}` },
    { what: "Your AI (your own key)", on: true, cap: `$${aiCap} a month`, today: `$${(aiToday.usd ?? 0).toFixed(2)} (this month $${(ai.usd ?? 0).toFixed(2)})` },
  ];
  return { rows, line: `What can cost you money: ${rows.map((r) => `${r.what} — ${r.on ? "on" : "off"}, cap ${r.cap}, today ${r.today}`).join(" · ")}. Everything else is free or included in your plan.` };
}
/* RR-357 (owner: the cards said "Pages 0 · Articles 0" while 29 drafts existed): made, ready, published — from the product's own files */
const IMPROVE_NOT_PUBLISHED = "This is your existing page — Visibility never publishes it as a second page. Press \"Get the content\" and add what it lacks to your page.";
/* RR-362 item 7 ("almiworld youtube" showed "20 made · 3 ready": OET's drafts, set aside as another subject's): the card counts this subject's drafts only */
/* RR-362 items 2 + 4: the one line and the one button of a product (desktop/next-step.mjs) */
const nextStepFor = (s) => { const id = s.id, c = cardCounts(id), chk = pread(id, "check.json", null), run = BOARD.list({ product: id }).find((j) => j.running && j.product === id) ?? null; return nextStepOf({ hasSite: Boolean(s.product?.site), checked: Boolean(chk), score: chk?.score ?? null, pages: c.pages, ready: c.ready, improve: c.improve, published: c.published, checkLater: pread(id, "pending-checks.json", null)?.titles?.length ?? 0, running: run }); };
const cardCounts = (id) => { const pg = pread(id, "pages.json", null), all = foreignDraftsOf(id).foreignPages ? [] : pg?.drafts ?? [], d = all.filter((x) => !x.improve) /* RR-358: new pages only */, live = pread(id, "published.json", []).filter((x) => x.state === "LIVE"); return { pages: d.length, improve: all.length - d.length, ready: d.filter((x) => x.readyAsDraft).length, published: live.length, articles: pread(id, "articles.json", []).length }; };
const examExtras = new Map(); // id → { subjectFacts, rates } of this run (createPages fills it before the plan is made)
/* the plan on disk: its pages, its merged list (RR-362); the live links to the bigger pages stay in memory */
const savePlan = (id, x) => { const { bigger, ...keep } = x; pwrite(id, "auto-plan.json", { on: new Date().toISOString(), subject: seedOf(store.read(id)) /* RR-359 */, ...keep }); };
function buildExamPlan(id) {
  const s = store.read(id), sc = searchConsoleOf(id), ex = examExtras.get(id) ?? { subjectFacts: pread(id, "subject-facts.json", null)?.facts ?? {}, rates: (() => { const r = pread(id, "rates-open.json", null); return r ? { ...r, short: OPEN_RATES.short, source: OPEN_RATES.source, link: OPEN_RATES.link } : null; })() };
  const facts = [...factsOfStore(pread(id, FACTS_FILE, null)), ...Object.values(serviceFactsOf(pread(id, "country-facts.json", null)?.countries ?? {}, seedOf(s))).flat()];
  const demand = [...ownItemsOf(id), ...(sc?.queries ?? []).map((q) => ({ text: q.query, source: `your Search Console: seen ${q.impressions} time${q.impressions === 1 ? "" : "s"} (${sc.window})`, weight: 10 + Math.log10(1 + (q.impressions ?? 0)) }))];
  const x = examPlan({ subject: seedOf(s), professions: professionsOf(), countries: examCountriesOf(id), facts, subjectFacts: ex.subjectFacts, rates: ex.rates, research: ex.research ?? pread(id, "research.json", null)?.questions ?? {}, searchedOn: ex.searchedOn ?? pread(id, "research.json", null)?.on ?? null, demand, site: pread(id, "site-read.json"), collector: seoFileOf(id)?.plan ?? [], maxCountries: 200 });
  savePlan(id, x);
  return x;
}
/** what to add when no search is known yet — each a one-click way (never a dead end) */
const DEMAND_ADDS = Object.freeze([
  { what: "Connect Google Search Console (or add its download)", action: "google" },
  { what: "Connect Bing Webmaster Tools (or add its file)", action: "bing" },
  { what: "Add a Keyword Planner or Bing Webmaster file", action: "google" },
  { what: "Connect your AI — it researches the questions people ask", action: "ai" },
]);
/* the client's AI (Settings → Your AI connection): its provider and key — the key only ever goes to the provider */
/* RR-348 c · the AlmiWorld creator data for a niche × platform, kept in the data folder once fetched ({ questions, hashtags, ideas, hooks, on })
 * — null until there is some; the plan then uses the niche's own words only */
const CREATOR_FILE = () => join(DATA, "creator-data.json"), CREATOR_REUSE_DAYS = 7;
const countryCodeOf = (name) => { const n = String(name ?? "").trim().toLowerCase(); return n ? LOCATIONS.find((l) => l.name.toLowerCase() === n || l.code.toLowerCase() === n)?.code ?? "" : ""; };
const creatorCache = () => { try { return JSON.parse(readFileSync(CREATOR_FILE(), "utf8")); } catch { return {}; } };
/* the service first (licence-checked, at most once a week per niche × platform), else what was kept; never a wait that blocks the plan */
async function creatorData(platform, niche, country = "") {
  const all = creatorCache(), k = String(niche).toLowerCase(), kept = all?.[platform]?.[k] ?? null;
  if (kept && Date.now() - Date.parse(kept.fetchedAt ?? 0) < CREATOR_REUSE_DAYS * 864e5) return kept.data;
  const r = await kwService().creators({ platform, niche, country }).catch(() => null);
  if (r?.ok) { (all[platform] ??= {})[k] = { fetchedAt: new Date().toISOString(), data: r.data ?? null }; try { writeFileSync(`${CREATOR_FILE()}.tmp`, JSON.stringify(all)); renameSync(`${CREATOR_FILE()}.tmp`, CREATOR_FILE()); } catch { /* used once */ } return r.data ?? null; }
  return kept?.data ?? null;
}
const aiOf = (s) => { const c = s.setup?.aiConnection, p = AI_PROVIDERS.find((x) => x.id === c?.provider || x.keyName === c?.keyName); return p && KEYS.status(p.keyName).saved ? { provider: p.id, key: KEYS.get(p.keyName) } : null; };
const reader = () => officialReader({ allowLocal, on: new Date().toISOString(), ...(Number.isInteger(CONFIG.testOfficialPaceMs) ? { paceMs: CONFIG.testOfficialPaceMs } : {}) });
/* what the product is about, and the official site of that (e.g. "OET", oet.com) — the client says it once in "How many pages"; a short
 * name in brackets in the product's own description is offered first */
const aboutOf = (s) => (String(s.setup?.product?.subject ?? "").trim() || null) ?? s.setup?.official?.subject ?? /\(([A-Z][A-Z0-9]{1,9})\)/.exec(String(s.setup?.product?.what ?? ""))?.[1] ?? null;
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
  /* RULING 2: AlmiWorld's keyword route and its raw country data are not an outside client's */
  const svc = outsideClient() ? { on: false, asked: 0, line: null } : await serviceForPlan(id, subject).catch(() => ({ on: false, asked: 0, line: SERVICE_OFF_LINE }));
  if (!outsideClient()) sources.push({ kind: "AlmiWorld keyword service", n: svc.asked ?? 0, on: Boolean(svc.on), line: svc.on ? `${svc.line} · ${svc.source} · ${svc.asked} searches now${svc.reused ? `, ${svc.reused} still fresh (asked within ${PLAN_REUSE_DAYS} days)` : ""}` : svc.line, ...(svc.why ? { why: svc.why } : {}) });
  /* RR-328 C · AlmiWorld's country facts (the same licence): the five parts of every country, read on their own official pages — once a day */
  const cfx = outsideClient() ? { on: false, countries: {}, line: null } : await countryFactsForPlan({ service: currentLicence() ? kwService() : null, cache: { load: () => pread(id, "country-facts.json", null), save: (v) => pwrite(id, "country-facts.json", v) }, countries: COUNTRIES }).catch(() => ({ on: false, countries: {}, line: "AlmiWorld country facts: not reachable just now" }));
  if (!outsideClient()) sources.push({ kind: "AlmiWorld country facts", n: Object.values(cfx.countries ?? {}).filter((x) => x.complete).length, on: Boolean(cfx.on), line: cfx.line });
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
const phraseItems = (id) => { const db = ownDb(keywordStore(id).load(), seedOf(store.read(id))) /* RR-359: its own subject's answers only */, held = new Set(Object.keys(db.keywords));
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
const dfsOf = () => dataForSeo({ keys: KEYS, settings: { ...searchData(), permission: true } /* RR-357: the client's OWN account — one switch */, ledger: dfsLedger(), save: (l) => writeFileSync(DFS_LEDGER_FILE, JSON.stringify(l)), ...(CONFIG.dataForSeoTestBase ? { base: CONFIG.dataForSeoTestBase } : {}) });
function keywordView(id) {
  const db = ownDb(keywordStore(id).load(), seedOf(store.read(id))) /* RR-359 */, plan = pread(id, "page-count.json")?.plan ?? null, today = new Date().toISOString().slice(0, 10);
  const top = Object.values(db.keywords).map((k) => ({ k, c: currentOf(k) })).sort((a, b) => (b.c?.high ?? 0) - (a.c?.high ?? 0) || a.k.text.localeCompare(b.k.text)).slice(0, 25)
    .map(({ k, c }) => { const t = trendOf(k); return { text: k.text, range: c?.label ?? null, period: c?.period ?? null, location: c?.location ?? null, source: c?.source ?? null, firstSeen: k.firstSeen, lastSeen: k.lastSeen, seen: t.points.length, direction: t.direction, change3m: t.change3m, yoy: t.yoy }; });
  const dfsSet = CONFIG.dataForSeo ?? {};
  return { summary: summaryOf(db, { today, plan }), folder: keywordFolder(), top, store: "this computer (the product's folder) — ready to move to AlmiWorld's own keyword service later",
    service: { outside: outsideClient(), plan: Boolean(currentLicence()), locations: SERVICE_LOCATIONS.map(({ code, name }) => ({ code, name })) }, // RR-326 E
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
/* RR-351 (owner, 31 Oct 2026): the call to act is the client's OWN offer button — its words and its link, set in Settings → Your product.
 * Never made up by Visibility (it was "Try a free … test on <site>" → /practice); with none set, no page is made or published */
const ctaOf = (s) => ctaOfSetup(s.setup);
/** RR-323 decision 8: the English pages that may now be made in another language — live, INDEXED (the Monday report) and showing impressions */
function translatableOf(id) {
  const states = pread(id, "index-states.json", {}), seen = pread(id, "page-impressions.json", {});
  return pread(id, "published.json", []).filter((x) => x.state === "LIVE" && states[x.url] === "indexed" && (seen[x.url] ?? 0) > 0).map((x) => x.title);
}
function listPlan(id, c) {
  const s = store.read(id), list = listOf(s, c.subject, id); if (!list) return null;
  const rec = recognitionOf(list, { professions: professionsOf() }), items = [...(c.items ?? []), ...phraseItems(id)], sorted = sortQuestions(items, c.subject, { fullName: "Occupational English Test", regulators: rec.regulators.map(callNames) }), groups = groupQuestions(sorted.kept);
  const plan = planFromList({ subject: c.subject, rec, professions: professionsOf(), universities: builtInList("universities")?.items ?? [], light: pread(id, "uni-light.json", {}), venues: c.venues ?? { countries: [] }, fee: c.fee ?? null, rates: ratesOf(id, c), stats: c.stats ?? null, subtests: c.subtests ?? {}, groups, sorted, byCountry: c.scRows ?? [], reads: pread(id, "regulator-reads.json", {}), on: c.on, councils: builtInList("origins"), ai: pread(id, "ai-content.json", {}), languages: s.setup?.languages?.codes ?? ["en"], items, cta: ctaOf(s), subjectPages: c.subjectPages ?? {}, facts: c.facts ?? {}, /* RR-327 */ kwByCountry: byLocationOf(keywordStore(id).load()), originFacts: builtInList("originFacts"), service: (c.research?.sources ?? []).find((x) => x.kind === "AlmiWorld keyword service") ?? null, /* RR-328 C */ countryFacts: withFactsFile(id, pread(id, "country-facts.json", null)?.countries ?? {}), translatable: translatableOf(id), by: displayNameOf(s.product) });
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
  const r = await readRegulator({ page: p, subject: seedOf(store.read(id)), reader: rd }).catch((e) => ({ ok: false, url: page.website, on: rd.on, why: `could not be read (${String(e?.message ?? e).slice(0, 80)})`, claims: [] }));
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
/* 🔴 RR-358 · THE CLIENT'S LOOK ON THE CLIENT'S PC: a site read made before RR-355 holds no shell, and nothing read it again — so
 * every page said "does not look like your site yet". Before pages are made, a missing look is read from the LIVE start page (one page);
 * when it truly cannot be read, the reason is kept (lookWhy) and every page's check says it, with how to fix it. */
async function ensureLook(id) {
  const s = store.read(id), site = pread(id, "site-read.json");
  if (!site?.ok || site.shell || !hasWebsite(s)) return site;
  const r = await readShell({ url: site.start ?? s.product.site, allowLocal }).catch(() => ({ ok: false, why: "your home page could not be read now" }));
  const { lookWhy, ...rest } = site, next = r.ok ? { ...rest, shell: r.shell, shellOn: new Date().toISOString() } : { ...rest, lookWhy: r.why, lookTriedOn: new Date().toISOString() };
  pwrite(id, "site-read.json", next);
  return next;
}
/** Create SEO pages: the drafts (kept in pages.json); published at once only when the client chose "automatically after the gates" */
/*
 * 🔴 RR-359 · DRAFTS AND A PLAN MADE FOR ANOTHER SUBJECT ARE NOT THIS PRODUCT'S (owner's run: "almiworld youtube" holds 32 OET drafts).
 * They are moved aside — pages-set-aside-<day>.json, auto-plan-set-aside-<day>.json, never deleted — and the Overview says so once.
 */
function foreignDraftsOf(id) {
  const s = store.read(id), mine = String(seedOf(s) ?? "").toLowerCase(), pg = pread(id, "pages.json", null), ap = pread(id, "auto-plan.json", null);
  const foreignPlan = ap?.pages?.length && (ap.subject != null ? String(ap.subject).toLowerCase() !== mine : !examProduct(s, id));
  /* drafts kept before RR-359 carry no subject: they are another subject's when they are that set-aside plan's pages (the owner's 20 OET drafts) */
  const foreignPages = pg?.drafts?.length && (pg.subject != null ? String(pg.subject).toLowerCase() !== mine : (Boolean(pg.examPlan) && !examProduct(s, id)) || (foreignPlan && pg.drafts.some((d) => ap.pages.some((x) => x.title === d.title))));
  return { s, pg, ap, foreignPlan: Boolean(foreignPlan), foreignPages: Boolean(foreignPages) };
}
function setAsideForeign(id) {
  const { s, pg, ap, foreignPlan, foreignPages } = foreignDraftsOf(id), moved = [];
  const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-"), files = [];
  if (foreignPages) { const n = `pages-set-aside-${stamp}.json`; renameSync(pfile(id, "pages.json"), pfile(id, n)); moved.push(`${pg.drafts.length} page drafts`); files.push(n); }
  if (foreignPlan) { const n = `auto-plan-set-aside-${stamp}.json`; renameSync(pfile(id, "auto-plan.json"), pfile(id, n)); moved.push(`a plan of ${ap.pages.length} pages`); files.push(n); }
  if (moved.length) { const was = pg?.subject ?? ap?.subject ?? null; pwrite(id, "set-aside.json", { on: new Date().toISOString(), what: moved, files, was, line: `Set aside: ${moved.join(" and ")} made earlier for "${was ?? "another subject"}" — not this product's subject${seedOf(s) ? ` ("${seedOf(s)}")` : ""}. Nothing was deleted: they are in the product's folder (${files.join(", ")}). Press Start to make this product's own pages.` }); replan(id); }
  return moved;
}
/* 🔴 RR-362 items 6 + 10: a run is on the board from its first step to its last, once per product (a second press joins the first), and it logs where its time goes (run-timing.json) */
const making = new Map(), STOP_FILE = () => join(DATA, "app-asked-to-stop");
/* if the app is gone in the middle of a run, a small process starts it again (desktop/watchdog.mjs); only an installed app */
function startWatchdog(id) { const launcher = join(INSTALL ?? "", "AlmiVisibility.exe"); if (!INSTALL || !existsSync(launcher)) return; try { const c = spawn(process.execPath, [join(HERE, "watchdog.mjs"), String(process.pid), pfile(id, "run-in-progress.json"), STOP_FILE(), launcher, "/nowindow", ...(Array.isArray(CONFIG.testUpdateArgs) ? CONFIG.testUpdateArgs : [])], { detached: true, stdio: "ignore", windowsHide: true }); c.on("error", () => {}); c.unref(); } catch { /* the next open goes on with the run */ } }
const askedToStop = () => { try { writeFileSync(STOP_FILE(), new Date().toISOString()); } catch { /* the watcher's grace time covers it */ } };
function createPages(id) {
  if (making.has(id)) return making.get(id);
  const key = `make:${id}`; BOARD.start(key, { product: id, kind: "make", label: "Making your pages", what: "Reading what we already hold", long: true, unit: "pages" });
  pwrite(id, "run-in-progress.json", { on: new Date().toISOString() }); startWatchdog(id);
  const run = makePages(id, key).then((r) => { rmSync(pfile(id, "run-in-progress.json"), { force: true }); BOARD.finish(key, { ok: !r.refused, line: r.refused ?? `${(r.pages?.drafts ?? []).filter((d) => d.readyAsDraft && !d.improve).length} pages are ready for you.` }); return r; }, (e) => { BOARD.finish(key, { ok: false, line: "Making the pages stopped. Open the app to try again." }); throw e; }).finally(() => making.delete(id));
  making.set(id, run); return run;
}
const stageClock = () => { const marks = [], t0 = Date.now(); let last = t0; return { mark: (stage) => { const n = Date.now(); marks.push({ stage, seconds: Math.round((n - last) / 100) / 10 }); last = n; }, done: () => ({ total: Math.round((Date.now() - t0) / 1000), stages: marks }) }; };
const breathe = () => new Promise((r) => setImmediate(r)); // the app answers its window between the long steps
async function makePages(id, key) {
  const clock = stageClock(), step = (x) => BOARD.step(key, x), reading = (name) => step({ add: 1, what: `Reading ${name}'s page` });
  step({ done: 0, of: RESEARCH_READS + DETAIL_READS, unit: "official pages" });
  await ensureLook(id);
  const { s, site, sc, files, ctx } = contextOf(id);
  if (!ctaOf(s)) return { refused: NO_CTA, needsCta: true }; // RR-351
  if (!seedOf(s)) return { refused: NO_SUBJECT, needsSubject: true }; // RR-359: its own subject, asked — never another product's, never a default
  setAsideForeign(id);
  /* RR-353: our own data first (read by ownItemsOf below); RR-354: an exam-prep product then gets its own plan (profession + country pages) */
  const councilFrom = (dfsLedger().spent ?? []).length; // RR-359: the searches of this run start here
  const handMade = Boolean(pread(id, "made-plan.json", null)?.length), own = handMade ? { lines: [] } : await gatherOwnDemand(id);
  if (!handMade && examProduct(s, id)) { const sf = await subjectFactsFor(id, seedOf(s)), rt = await oneRatesFor(id); const research = await examResearch(id, seedOf(s), reading); clock.mark("reading official pages"); examExtras.set(id, { subjectFacts: sf.facts, rates: rt, research, searchedOn: new Date().toISOString() }); if (sf.line) own.lines.push(sf.line); own.lines.push(rt ? `Exchange rates: ${OPEN_RATES.short}, ${rt.date} — the same one service for every page` : `Exchange rates: ${OPEN_RATES.short} could not be read just now — the fee is shown in AUD only`); }
  /* RR-360 B: a product of any kind: what AlmiSEO Data planned for its subject (desktop/almiseo.mjs genericPlanPages) */
  const buildGeneric = () => { const f = seoFileOf(id), x = f?.plan?.length ? genericPlanPages({ file: f, subject: seedOf(s) }) : null; if (!x?.pages.length) return null; x.fromAlmiSeo = true; savePlan(id, x); return x; };
  let exam = handMade ? null : seoFileOf(id)?.outside ? buildGeneric() ?? (examProduct(s, id) ? buildExamPlan(id) : null) /* RULING 2: the finished pages first */ : examProduct(s, id) ? buildExamPlan(id) : buildGeneric();
  /* 🔴 RR-360 D · G5's order for every intent: saved in AlmiSEO Data → your own AI in your own browser → your own paid service, only if you switched it on */
  /* R13: saved in AlmiSEO Data first; then a search this app already made, free; then the client's own paid switch */
  const routeOf = (list) => coverageRoutes({ pages: list, file: seoFileOf(id), browser: pread(id, BROWSER_COVERAGE, {}), paidOn: serpSettings().on === true || hasKeptSearch(list), paid: (left) => { step({ done: 0, of: left.length, unit: "pages", what: "Looking at what Google shows" }); return serpStep(id, { pages: left }, (p, state) => (state === "done" ? step({ add: 1 }) : step({ what: `Looking at what Google shows for ${p.title}` }))).catch((e) => ({ on: false, why: `the search-results step failed: ${String(e?.message ?? e).slice(0, 80)}` })); } });
  const routes = exam ? await routeOf(exam.pages) : null, serp = exam ? { ...(routes.paid ?? { on: false }), routes: routes.counts, routesLine: routes.line, why: routes.paid?.why ?? routes.line } : null;
  clock.mark("looking at what Google shows");
  /* 🔴 RR-362 (R3): with what the searches brought, each C and D page stays a page or its facts go into the bigger pages. Each search saved in AlmiSEO Data (R13) */
  const searchedPages = exam ? [...exam.pages] : [];
  if (exam?.bigger) settleLocal(exam);
  if (exam) savePlan(id, exam);
  let savedCount = await saveSearches(id, searchedPages);
  const yt = ctx.youtubeConfirmed ? YT.foundFor(id) : null;
  /* RR-318 B6: the countries the searches are about get their official answers first (read once; a country already read is kept) */
  const want = [...new Set([...(sc?.queries ?? []).map((q) => q.query), ...files.map((f) => f.phrase), ...plannedOf(id).map((p) => p.text)].flatMap((t) => destinationsIn(t)))].filter((c) => !(c in officialOf(id)));
  if (want.length && s.setup?.official?.site) await refreshOfficial(id, want.slice(0, 12)).catch(() => null);
  step({ done: 0, of: 0, unit: "pages", what: "Writing the pages" }); await breathe();
  const pages = seoPages({ site, target: pread(id, "publish.json")?.kind ?? null, searchConsole: sc, files, youtube: yt?.state === "READY" ? yt : null, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}), official: officialForPages(id), cta: ctaOf(store.read(id)), planned: plannedOf(id), own: ownItemsOf(id), subject: aboutOf(store.read(id)), ...seoExtras(id), ...madePlanOf(id) });
  clock.mark("writing the pages");
  /* v3 §15 · AT MOST TWO REPAIR ROUNDS: while pages still fail, Visibility searches the official pages again for what is missing and builds
   * again; a round that removes no named failure stops early; after two, each page shows its exact blocker */
  let rounds = 0;
  const failures = (p) => p.drafts.reduce((n, d) => n + d.gates.filter((g) => !g.pass).reduce((m, g) => m + g.failing.length, 0), 0);
  while (exam && examProduct(s, id) && !seoFileOf(id)?.outside && rounds < 2 && failures(pages) > 0 && CONFIG.testOffline !== true) {
    const before = failures(pages), prev = pread(id, "auto-plan.json", {}).pages ?? [];
    /* RR-362 item 17: a round in which no official page could be read finds nothing new: it is not written again */
    step({ done: 0, of: RESEARCH_READS + DETAIL_READS, unit: "official pages", what: "Looking again for what is still missing" }); const r2 = await examResearch(id, seedOf(s), reading); if (!lastResearchReads) break; examExtras.set(id, { ...examExtras.get(id), research: r2 }); exam = buildExamPlan(id); rounds++;
    /* what the search step found stays with each page through a repair round */
    if (serp) { for (const p of exam.pages) { const o = prev.find((x) => x.title === p.title); if (o) Object.assign(p, { coverage: o.coverage, second: o.second, topRead: o.topRead, questions: o.questions, serpWhy: o.serpWhy, coverageRoute: o.coverageRoute, coverageOn: o.coverageOn, searchedOn: o.searchedOn }); } settleLocal(exam); savePlan(id, exam); }
    const again = seoPages({ site, target: pread(id, "publish.json")?.kind ?? null, searchConsole: sc, files, youtube: yt?.state === "READY" ? yt : null, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}), official: officialForPages(id), cta: ctaOf(store.read(id)), planned: plannedOf(id), own: ownItemsOf(id), subject: aboutOf(store.read(id)), ...seoExtras(id), ...madePlanOf(id) });
    if (failures(again) >= before) break;
    Object.assign(pages, again);
  }
  clock.mark("looking again for what is missing");
  /* RR-360 D: a product with no exam plan — its drafts' intents go by the same order, and its pages are judged again with what they answered */
  let genericPages = null, genericRoutes = null;
  if (!exam) { /* drafts from its own demand */ genericPages = pages.drafts.map((d) => ({ kind: "topic", title: d.title })); genericRoutes = await routeOf(genericPages); const byTitle = new Map(genericPages.filter((p) => p.coverageRoute !== ROUTES.none).map((p) => [p.title, p])); savedCount += await saveSearches(id, genericPages); pwrite(id, "generic-coverage.json", Object.fromEntries([...byTitle].map(([t, p]) => [t, { coverage: p.coverage, second: p.second }]))); if (byTitle.size) Object.assign(pages, seoPages({ site, target: pread(id, "publish.json")?.kind ?? null, searchConsole: sc, files, youtube: yt?.state === "READY" ? yt : null, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}), official: officialForPages(id), cta: ctaOf(store.read(id)), planned: plannedOf(id), own: ownItemsOf(id), subject: aboutOf(store.read(id)), ...seoExtras(id), ...madePlanOf(id) })); }
  recipeLedger(id, pages, serp ?? (genericRoutes ? { on: false, routes: genericRoutes.counts, routesLine: genericRoutes.line } : null), rounds, genericPages);
  pages.subject = seedOf(s); // RR-359: the drafts say which subject they were made for
  pwrite(id, "pages.json", pages);
  if (existsSync(pfile(id, "set-aside.json"))) rmSync(pfile(id, "set-aside.json")); // its own pages are made now
  pages.improved = writePacks(id, pages.drafts); // RR-356 PART B
  /* RR-308 D5: the client chose "publish automatically after the gates" AND connected a site → each draft that passes is published now */
  let auto = null;
  if ((s.setup?.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */) === PUBLISH_MODE.AUTO_AFTER_GATES && pread(id, "publish.json")?.kind && !publishBlocked(s)) { auto = []; for (const d of pages.drafts.filter((x) => x.readyAsDraft && !x.improve).slice(0, BATCH) /* G19: a small batch at a time */) auto.push({ url: d.url, ...(await publishOne(id, d.url)) }); }
  /* RR-353: where the searches came from, said; nothing known → what to add, each with its one-click way */
  pages.sources = own.lines;
  /* RR-359: the councils' own pages found through Google's results are searches too — counted, and their cost, in the run's line */
  if (serp?.on) { const cs = (dfsLedger().spent ?? []).slice(councilFrom).filter((x) => / English language requirement$/.test(x.q ?? "")); if (cs.length) { const c = cs.reduce((t, x) => t + (Number(x.cost) || 0), 0); serp.line += ` The councils' own pages, found through Google's results: ${cs.length} more search${cs.length === 1 ? "" : "es"}, $${c.toFixed(4)} (all searches this run: ${(serp.searches ?? 0) + cs.length}, $${((serp.cost ?? 0) + c).toFixed(4)}).`; serp.searches = (serp.searches ?? 0) + cs.length; serp.cost = (serp.cost ?? 0) + c; } }
  /* RR-362 item 14: "saved / reused / bought", in one line; the long account stays beside it */
  const counts = searchCounts({ routes: serp?.routes ?? genericRoutes?.counts ?? null, paid: routes?.paid ?? genericRoutes?.paid ?? null, saved: savedCount, later: pages.drafts.filter((d) => d.checkLater).length });
  if (serp) pages.serp = { on: serp.on, line: counts.line, counts, detail: [serp.routesLine, serp.on ? serp.line : null].filter(Boolean).join(" "), searches: serp.searches ?? 0, cost: serp.cost ?? 0, stopped: serp.stopped ?? null, routes: serp.routes ?? null };
  else if (genericRoutes) pages.serp = { on: false, line: counts.line, counts, detail: genericRoutes.line, searches: genericRoutes.paid?.searches ?? 0, cost: genericRoutes.paid?.cost ?? 0, stopped: genericRoutes.paid?.stopped ?? null, routes: genericRoutes.counts };
  if (exam) pages.examPlan = { counts: exam.counts, skipped: exam.skipped, existing: exam.existing, notBuilt: exam.notBuilt ?? [], merged: exam.merged ?? [] };
  /* RR-362 item 13: pages not read yet are read tomorrow, by the app itself */
  { const later = pages.drafts.filter((d) => d.checkLater).map((d) => d.title); pwrite(id, "pending-checks.json", { day: new Date().toISOString().slice(0, 10), titles: later, switchOn: serpSettings().on === true }); }
  clock.mark("the rest"); pages.timing = clock.done(); pwrite(id, "run-timing.json", { on: new Date().toISOString(), ...pages.timing });
  if (pages.noDemand) pages.add = DEMAND_ADDS.filter((a) => !(a.action === "google" && sc) && !(a.action === "ai" && aiOf(s)));
  pwrite(id, "pages.json", pages); // RR-360: what the run says about its sources and routes stays with the drafts
  /* RR-355 (owner: "Keywords to use (0)" and "Articles to make (0)" beside 529 search phrases): the plan is made again from the same data */
  await buildPlan(id).catch(() => null);
  return { pages, auto };
}
/** D3 · submit the published pages: Google (the sitemap, through the client's own Search Console) and Bing (IndexNow, the client's key file) */
async function submitAll(id) {
  const s = store.read(id);
  if (publishBlocked(s)) return { ok: false, why: ALMIWORLD_NO };
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
  } else { for (const r of live) subs[r.live] = { ...subs[r.live], google: { state: "NOT_YET", why: "connect Google Search Console with \"also tell Google about my new pages\"" } }; lines.push("Google: not sent — connect Google Search Console with \"also tell Google about my new pages\" (Home → Connect Google)."); }
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
      if (hasWebsite(s) && !publishBlocked(s) && (s.setup?.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */) === PUBLISH_MODE.AUTO_AFTER_GATES && pread(id, "publish.json")?.kind) {
        const r = await createPages(id); const n = (r.auto ?? []).filter((x) => x.ok).length;
        if (n) { didIt(id, `Weekly: published ${n} new page${n === 1 ? "" : "s"} (your choice: automatically after the five checks).`); await submitAll(id); }
      }
    } catch {}
  }
}
/* 🔴 RR-362 item 13: "Not read yet" never blocks a page: the day after, the run goes on by itself for the pages not read yet (what is saved is reused free; nothing is bought twice) */
async function continueChecks() {
  const today = new Date().toISOString().slice(0, 10);
  /* RR-362: a run the app was stopped in (the computer turned off, the app crashed, an update) goes on by itself, what it already read kept */
  for (const p of store.list()) { try { const pending = pread(p.id, "pending-checks.json", null); if (!making.has(p.id) && (existsSync(pfile(p.id, "run-in-progress.json")) || checksDue(pending, { today, running: false }))) await createPages(p.id); } catch { /* tried again next hour */ } }
}
/* RR-362: the app started again in the middle of a run: it goes on at once */
rmSync(STOP_FILE(), { force: true });
setTimeout(() => { for (const p of store.list()) if (existsSync(pfile(p.id, "run-in-progress.json")) && !making.has(p.id)) createPages(p.id).catch(() => {}); }, 3000).unref();
setTimeout(() => { weeklyRound(); continueChecks(); setInterval(() => { weeklyRound(); continueChecks(); }, 3600e3).unref(); }, Number.isInteger(CONFIG.weeklyFirstMs) ? CONFIG.weeklyFirstMs : 5 * 60e3).unref();
/* 🔴 RR-360 A3 · AlmiSEO Data is read on start and on a schedule, for every product (the page says when it was last read) */
const syncAll = async () => { if (CONFIG.testOffline === true || !currentLicence()) return; for (const p of store.list()) { try { await syncAlmiSeo(p.id); } catch { /* the page says it could not be read */ } } };
if (CONFIG.almiSeoSync !== false) setTimeout(() => { syncAll(); setInterval(syncAll, SYNC.everyHours * 3600e3).unref(); }, Number.isInteger(CONFIG.almiSeoFirstMs) ? CONFIG.almiSeoFirstMs : SYNC.firstMs).unref();

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
      if (req.method === "GET" && u.pathname === "/api/guides") return send(200, { guides: guideList() }); // RR-353: the Help screen
      { const gm = /^\/guide\/([a-z-]{1,40})$/.exec(u.pathname); if (req.method === "GET" && gm) { const html = guidePage(gm[1]); return html ? send(200, html, "text/html; charset=utf-8") : send(404, { refused: "no such guide" }); } }
      if (req.method === "GET" && u.pathname === "/brand/almiworld-logo.png") return send(200, readFileSync(join(HERE, "brand", "almiworld-logo.png")), "image/png");
      if (req.method === "GET" && u.pathname === "/company-logo") { const c = store.company(); const f = c?.logoFile ? join(DATA, c.logoFile) : null; return f && existsSync(f) ? send(200, readFileSync(f), "image/png") : send(404, { refused: "no company logo" }); }
      /* the home screen: the company, its products, the plan limit */
      /* RR-362 item 6: every wait, for the bar on every screen */
      if (req.method === "GET" && u.pathname === "/api/jobs") return send(200, { jobs: BOARD.list() });
      if (req.method === "GET" && u.pathname === "/api/home") {
        const st = await licenceNow();
        const products = store.list();
        return send(200, { version: VERSION, company: store.company(), products: products.map((s) => ({ ...productCard(s), ...cardCounts(s.id), next: nextStepFor(s), sameSiteAs: products.find((o) => o.id !== s.id && o.created < s.created && s.product.site && o.product.site && hostOf(o.product.site) === hostOf(s.product.site))?.product.name ?? null })), licence: st.line, limit: limitLine(st, products.length), plans: plansView(), mayAdd: mayAddProduct(st, products.length).ok, accountSet: Boolean(CONFIG.account), google: googleClientStatus() });
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
        const p = json();
        /* RR-357: the website you already have a product for is said FIRST — with "open it" — whatever the plan */
        { const w = p.site ? webAddress(p.site) : null, same = w ? sameSiteProduct(w) : null; if (same) return send(409, { refused: `You already have a product with this website: ${same.product.name} (${hostOf(w)}). Open it — one product per website keeps all your pages, settings and drafts together.`, duplicate: { id: same.id, name: same.product.name } }); }
        const st = await licenceNow();
        const count = store.list().length;
        const may = mayAddProduct(st, count);
        if (!may.ok) return send(403, { refused: limitLine(st, count), licence: st.line });
        /* RR-307 D1: the two plain questions come first — what to grow, and whether there is a website; the website is asked only then */
        const goal = p.goal ?? null;
        if (goal && checkStep("goal", goal)) return send(400, { refused: checkStep("goal", goal) });
        const needsSite = !goal || goal.hasWebsite === true;
        p.site = p.site ? webAddress(p.site) : null;
        if (!p.name?.trim() || (needsSite && !p.site)) return send(400, { refused: needsSite ? "Give the product's name and its website (for example shop.almiworld.com)." : "Give the product's name." });
        /* RR-353 (owner: a second "AlmiOET" was made by mistake): the same website as a product you already have → said, with "Open it" */
        /* RR-357 (owner: two "AlmiOET" products): a second product for a website you already have is never made — "open the one you have" */
        const same = p.site ? sameSiteProduct(p.site) : null;
        if (same) return send(409, { refused: `You already have a product with this website: ${same.product.name} (${hostOf(p.site)}). Open it — one product per website keeps all your pages, settings and drafts together.`, duplicate: { id: same.id, name: same.product.name } });
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
        if (req.method === "GET" && m[2] === "state") return send(200, { id, checking: checking.has(id), product: s.product, almiworld: isAlmiWorld(s), realProject: s.setup?.realProject?.on === true, steps: stepsFor(s.setup), choices: CHOICES, howTo: HOWTO, recommended: Object.fromEntries(STEPS.map((x) => [x.id, recommended(x.id, s.setup)])), setup: s.setup, started: s.started, languages: LANGUAGES, articleSettings: settingsView(articleSettings({ articlesPerDay: s.setup.articlesPerDay?.perDay ?? 1, publishMode: s.setup.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */ })) });
        if (req.method === "POST" && m[2] === "setup") {
          let { id: step, value } = json();
          /* RR-357 (R1): the publish choice is the client's own preference — it is saved even with no plan (it starts no work) */
          const st = await licenceNow();
          if (!st.mayStartNewWork && step !== "publishMode") return send(403, { refused: st.line });
          if (step === "product" && value && webAddress(value.site)) value.site = webAddress(value.site);
          if (step === "product" && value && !value.site) value.site = s.setup?.goal?.hasWebsite === false ? (s.product?.site && /youtube\.com/i.test(s.product.site) ? s.product.site : null) : value.site;
          /* RR-307 E3: a changed website must really open (or "save anyway") */
          if (step === "product" && value?.site && value.site !== s.product?.site && value.saveAnyway !== true && !/youtube\.com/i.test(value.site)) { const o = await addressOpens(value.site, { allowLocal }); if (!o.ok) return send(400, { refused: `${o.why}${o.suggestion ? ` Did you mean ${o.suggestion}?` : ""}`, suggestion: o.suggestion ?? null, canSaveAnyway: true }); }
          if (step === "product" && value) delete value.saveAnyway;
          /* RR-306 A2: an optional step skipped — "not now"; it can be changed later from the product's Settings */
          if (value?.skipped === true) { if (!STEPS.find((x) => x.id === step)?.optional) return send(400, { refused: "This step cannot be skipped." }); value = { skipped: true }; }
          const why = checkStep(step, value);
          if (why) return send(400, { refused: why });
          /* RR-351: the offer button is kept with the product — typed now (both empty = removed), or the one set before when not sent */
          /* RR-352: an AlmiWorld product the owner marks a REAL project is published and submitted (default off; kept with its date) */
          if (step === "product" && value && "realProject" in value) { if (isAlmiWorld(s)) s.setup.realProject = { on: value.realProject === true, markedOn: new Date().toISOString() }; delete value.realProject; }
          /* RR-353: the client's social media pages — kept apart from the product's words (checked above: each on its own network's site) */
          if (step === "product" && value && "social" in value) { s.setup.social = socialFrom(value.social ?? {}).links ?? {}; delete value.social; }
          /* RR-359: "What it is about" — the product's own subject, short (e.g. OET); empty = none (Create SEO pages then asks) */
          if (step === "product" && value) { if ("subject" in value) { const t = String(value.subject ?? "").trim(); if (t && subjectProblem(t)) return send(400, { refused: subjectProblem(t) }); if (t) value.subject = t; else delete value.subject; } else if (s.setup?.product?.subject) value.subject = s.setup.product.subject; }
          if (step === "product" && value) { const typed = "ctaLabel" in value || "ctaHref" in value, c = ctaFrom(value); delete value.ctaLabel; delete value.ctaHref; if (typed ? c.cta : s.setup?.product?.cta) value.cta = typed ? c.cta : s.setup.product.cta; }
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
      { const r = /^\/api\/products\/([^/]+)\/(overview|next|plan-summary|check|fix|feature\/[a-z-]+|google\/start|google\/site|google\/export|delete|plan|plan\/save|do|indexnow|indexnow\/check|bing|search-engines|search-engines\/bing-done|social-links|jobs|pages-view|fix-existing|improve-pack|almiseo|almiseo\/sync|almiseo\/browser)$/.exec(u.pathname); // RR-353: Bing, Search engines, social pages; RR-354: the ticked jobs, the pages in plain words
        if (r) {
          const id = decodeURIComponent(r[1]);
          try { store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          const { s, site, sc, files, ctx } = contextOf(id);
          if (r[2] === "next" && req.method === "GET") return send(200, nextStepFor(s)); // RR-362 item 4: "What to do now"
          if (r[2] === "overview" && req.method === "GET") {
            /* RR-308: what the YouTube research found, read from the saved research — never the whole channel on every Overview */
            const yt = ctx.youtubeConfirmed ? YT.foundFor(id) : null;
            /* RR-310: the plan (made after every check; a product checked before RR-310 gets it made now, once), what Visibility will do,
             * the YouTube-only view of an older card, the weekly state and what was done since the last check */
            setAsideForeign(id); // RR-359: another subject's drafts never show as this product's
            const plan = pread(id, "plan.json");
            if (!plan && ctx.check && !checking.has(id) && !planning.has(id)) buildPlan(id).catch(() => {});
            /* 🔴 RR-358 (owner: "Keywords to use (0)" beside 529 search phrases — his plan was made at the 31 Oct 18:40 check, his keyword
             * database came at 20:23, and the plan was made again only at the end of a page run): a plan older than what it is made from is
             * made again now, and the screen says so meanwhile */
            const remaking = Boolean(plan && ctx.check && !checking.has(id) && (planning.has(id) || (planStale(id, plan) && Date.now() - (planTried.get(id) ?? 0) > 600000 /* once in 10 minutes, never a loop */)));
            if (remaking && !planning.has(id)) { planTried.set(id, Date.now()); buildPlan(id).catch(() => {}); }
            const c0 = ctx.check, card = c0 && ctx.noWebsite && !c0.youtubeOnly && !c0.failed ? { ...c0, youtubeOnly: true, score: c0.youtube?.score ?? null, gauge: c0.youtube?.gauge ?? "Not measured", word: c0.youtube?.word ?? "Not measured", areas: c0.areas.filter((a) => a.area === "YouTube") } : c0;
            const since = pread(id, "done.json", []).filter((d) => !c0?.on || d.on >= c0.on).slice(-8);
            return send(200, { almiseo: almiSeoView(preadMemo(id, ALMISEO_FILE), { subject: seedOf(s), planOk: Boolean(currentLicence()) }), subject: seedOf(s), noSubject: seedOf(s) ? null : NO_SUBJECT, setAside: pread(id, "set-aside.json", null), plan, remaking, planning: planning.has(id) || (!plan && Boolean(ctx.check)), willDo: plan ? willDoOf(id, plan) : null, /* RR-354: the ticked jobs, the approval asked once, the last report */ jobs: JOBS, fixVia: fixViaOf(id, s), review: (s.setup?.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */) === PUBLISH_MODE.REVIEW_FIRST, report: pread(id, "last-report.json"), weekly: weeklyOf(id), since, almiworld: publishBlocked(s), noWebsite: ctx.noWebsite,
              topJobs: TOP_JOBS, moreJobs: MORE_JOBS, checking: checking.has(id), progress: progressOf(id), card, found: foundInfo({ site, youtube: yt?.state === "READY" ? yt : null, files, searchConsole: sc, keys: { ai: ctx.aiKey }, own: ownItemsOf(id), asked: askedOf(id), on: new Date().toISOString() }), menu: menuFor(ctx), todo: todoOf(id), google: { ...GOOGLE.status(), site: sc?.site ?? null, kind: sc?.kind ?? null, window: sc?.window ?? null, searches: sc?.queries?.length ?? 0, on: sc?.on ?? null }, howTo: outsideClient() ? Object.fromEntries(Object.entries(HOWTO).filter(([k]) => k !== "dataForSeo")) /* its own screen carries it (ruling 5) */ : HOWTO });
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
          /*
           * 🔴 RR-354 (owner: "whatever the client picks, the app completes that job END TO END by itself") · THE TICKED JOBS: the approval
           * choice (asked once), then each ticked job in order, then ONE short report — made, published, waiting for the OK, needing work (why).
           */
          if (r[2] === "jobs" && req.method === "POST") {
            const v = json(), jobs = JOBS.map((j) => j.id).filter((j) => (Array.isArray(v.jobs) ? v.jobs : []).includes(j));
            if (!jobs.length) return send(400, { refused: "Tick at least one job." });
            if (v.approval === "review" || v.approval === "publish") { s.setup.publishMode = { mode: v.approval === "review" ? PUBLISH_MODE.REVIEW_FIRST : PUBLISH_MODE.AUTO_AFTER_GATES }; store.write(id, s); }
            const lines = [], blocked = publishBlocked(s), on = new Date().toISOString();
            if (jobs.includes("create-pages")) {
              if (!ctx.hasSite || !site) lines.push("Pages: Visibility first needs to read your website — press Check my product now, then Start again.");
              else { const x = await createPages(id); if (x.refused) return send(400, { refused: x.refused, needsCta: x.needsCta === true, needsSubject: x.needsSubject === true }); const pub = (x.auto ?? []).filter((a) => a.ok).length; didIt(id, `Made ${x.pages.drafts.length} page drafts${pub ? ` and published ${pub}` : ""}.`); if (x.pages.improved?.length) lines.push(`Your existing pages: ${x.pages.improved.length} improved instead of made twice — ${x.pages.improved.map((p) => `${p.url} (${p.add} new question${p.add === 1 ? "" : "s"})`).join(", ")}. Each one's content is under Pages and articles → Get the content.`); if (x.pages.serp?.line) lines.push(x.pages.serp.line); /* RR-358: how many Google searches the run made, their cost, what stopped it */ }
            }
            if (jobs.includes("structure")) { const p = pread(id, "plan.json"), n = p ? [...p.thisWeek, ...p.rest].filter((i) => i.fixForMe === "structure" || i.ready?.length).length : 0; const via = fixViaOf(id, s); lines.push(via.length ? `Fix existing pages: ${n} change${n === 1 ? "" : "s"} ready — Visibility can make the ${via.map((k) => (k === "title" ? "titles" : "descriptions")).join(" and ")} through your site's connection (Home → What to fix first → Fix it for me); the rest are ready to copy.` : `Fix existing pages: ${n} change${n === 1 ? "" : "s"} ready to copy into your site's own editor (Home → What to fix first → Give me the content) — your site is built in a way Visibility's connection cannot change by itself.`); }
            if (jobs.includes("submit")) { const x = await submitAll(id); lines.push(x.ok ? x.lines.join(" ") : `Google and Bing: ${x.why}`); }
            if (jobs.includes("social")) { const n = Object.keys(s.setup?.social ?? {}).length; lines.push(n ? `Social posts: a post for each new page is ready for your ${n} social page${n === 1 ? "" : "s"} — open Social media, then Copy and Open.` : "Social posts: the posts are ready to copy — add your social pages once under Social media to get an Open button for each."); }
            if (jobs.includes("reports")) { pwrite(id, "weekly.json", { ...pread(id, "weekly.json", {}), on: true }); lines.push("Reports: the weekly check is on; this month's report is under Monthly report.");
              /* G20 · after publishing: no verdict before 28 days; weak → improved once; MERGE / NOINDEX only proposed, with your OK */
              const after = await measuredAfter(id).catch(() => []); if (after.length) lines.push(`After publishing: ${after.map((a) => `${a.url} — ${a.line}`).join(" · ")}`); }
            const mode = store.read(id).setup?.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */;
            const rep = jobReport({ notMade: notMadeOf(pread(id, "pages.json")?.plan ?? []), drafts: pread(id, "pages.json")?.drafts ?? [], live: pread(id, "published.json", []).filter((x) => x.state === "LIVE").map((x) => x.url), approval: mode === PUBLISH_MODE.REVIEW_FIRST ? "review" : "publish", connected: Boolean(pread(id, "publish.json")?.kind), blocked: blocked ? ALMIWORLD_NO : null, lines });
            pwrite(id, "last-report.json", { on, jobs, ...rep });
            return send(200, { ok: true, report: rep });
          }
          /* RR-355 · "Fix it for me" on a page already on the client's site — through its own connection, only where it can really be done */
          if (r[2] === "fix-existing" && req.method === "POST") {
            const v = json(), plan = pread(id, "plan.json"), item = plan ? [...(plan.thisWeek ?? []), ...(plan.rest ?? [])].find((i) => i.id === v.item) : null, t = pread(id, "publish.json");
            if (publishBlocked(s)) return send(200, { ok: false, lines: [ALMIWORLD_NO] });
            if (!item || !t?.kind || !fixVia(t, item.id, { framework: siteFramework(id) })) return send(400, { refused: "Visibility cannot make this change through your site's connection — press \"Give me the content\" and paste it in your site's editor." });
            const keyName = TARGETS.find((x) => x.id === t.kind)?.keyName, key = keyName ? KEYS.get(publishKeyName(t.kind, id)) : null;
            if (keyName && !key) return send(400, { refused: "Your site's key is not saved on this computer — paste it again in Publish settings." });
            const perPage = new Map(); for (const x of item.ready ?? []) if (x.for && x.text && !perPage.has(x.for)) perPage.set(x.for, x.text);
            const lines = []; for (const [url, text] of perPage) { const x = await fixExisting({ target: t, key, url, kind: item.id, text, framework: siteFramework(id), allowLocal, testBase: CONFIG.testPublishBase ?? null }); lines.push(x.ok ? x.line : x.why); }
            didIt(id, `Fixed through the connection: ${lines.filter((l) => /^Fixed/.test(l)).length} of ${perPage.size} pages (${item.id}).`);
            return send(200, { ok: true, lines });
          }
          /* RR-356 PART B · the content for an existing page, ready to paste (or added through the connection on Approve) */
          if (r[2] === "improve-pack" && req.method === "GET") { const d = (pread(id, "pages.json")?.drafts ?? []).find((x) => x.url === u.searchParams.get("url") && x.improve); return d ? send(200, inSiteLook(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Improve: ${d.title}</title></head><body><main><h1>Improve your page</h1><p>${d.improve.url}</p>${packOf(id, d).html || "<p>Your page already answers every question Visibility has for it.</p>"}</main></body></html>`, pread(id, "site-read.json")?.shell ?? null), "text/html; charset=utf-8") : send(404, { refused: "no improvement for this page" }); }
          /* RR-356 · the search-results switch: OFF by default, the client's own choice, at most $1 a day */
          /* RR-362: what the plan merged, and the pages checked later: said once, in plain words */
          if (r[2] === "plan-summary" && req.method === "GET") { const pg = pread(id, "pages.json", null), m = pg?.examPlan?.merged ?? [], ds = (pg?.drafts ?? []).filter((d) => !d.improve); return send(200, { counts: pg?.examPlan?.counts ?? null, merged: m.map((x) => ({ title: x.title, into: x.into ?? [], why: x.why })), later: (pg?.drafts ?? []).filter((d) => d.checkLater).length, searches: pg?.serp?.counts ?? null, timing: pg?.timing ?? null, byType: Object.fromEntries(Object.entries(TYPE_WORDS).map(([k, w]) => [k, { words: w, pages: ds.filter((d) => d.type === k).length, ready: ds.filter((d) => d.type === k && d.readyAsDraft).length }])) }); }
          if (r[2] === "pages-view" && req.method === "GET") {
            const live = pread(id, "published.json", []).filter((x) => x.state === "LIVE"), drafts = pread(id, "pages.json")?.drafts ?? [];
            return send(200, { rows: drafts.map((d) => { const L = live.find((x) => x.url === d.url); return { title: d.title, url: d.url, ready: d.readyAsDraft === true, why: plainWhy(d), live: L ? L.live ?? L.saved ?? true : null, improve: d.improve?.url ?? null, open: d.open ?? [], ledger: d.ledger ?? null, recipe: d.recipe ?? null }; }), report: pread(id, "last-report.json"), connected: Boolean(pread(id, "publish.json")?.kind), blocked: publishBlocked(s) ? ALMIWORLD_NO : null, review: (s.setup?.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */) === PUBLISH_MODE.REVIEW_FIRST });
          }
          if (r[2] === "do" && req.method === "POST") {
            const what = json().what, aw = publishBlocked(s);
            if (what === "create-pages") { if (!ctx.hasSite || !site) return send(400, { refused: "Check your website first — the pages are answered from it." }); const x = await createPages(id); if (x.refused) return send(400, { refused: x.refused, needsCta: x.needsCta === true, needsSubject: x.needsSubject === true }); const n = x.pages.drafts.filter((d) => d.readyAsDraft).length, pub = (x.auto ?? []).filter((a) => a.ok).length; didIt(id, `Made ${n} page draft${n === 1 ? "" : "s"}${pub ? ` and published ${pub}` : ""}.`); return send(200, { ok: true, line: `${n} draft${n === 1 ? "" : "s"} made${pub ? `, ${pub} published` : ""} — read them under "Pages and articles".${aw ? ` ${ALMIWORLD_NO}` : ""}`, open: "pages" }); }
            if (what === "structure") { const p = pread(id, "plan.json"); return send(200, { ok: true, items: p ? [...p.thisWeek, ...p.rest].filter((i) => i.fixForMe === "structure" || i.id === "ai:faq") : [], line: "New pages have the structure built in. For your existing pages, here it is ready to paste:" }); }
            if (what === "publish") {
              if (aw) return send(200, { ok: false, refused: ALMIWORLD_NO });
              if (!pread(id, "publish.json")?.kind) return send(200, { ok: false, open: "publish-settings", line: "First tell Visibility where your site is built." });
              if ((s.setup?.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */) === PUBLISH_MODE.REVIEW_FIRST && json().approved !== true /* RR-354: "Publish all ready" is the client's OK */) return send(200, { ok: true, open: "approvals", line: "You chose to approve each page first — they wait for you under Approvals." });
              const live = new Set(pread(id, "published.json", []).filter((x) => x.state === "LIVE").map((x) => x.url)), out = [];
              /* RR-362 item 6: publishing is on the board too */
              const batch = (pread(id, "pages.json")?.drafts ?? []).filter((x) => x.readyAsDraft && !x.improve && !live.has(x.url)).slice(0, BATCH) /* G19: a small batch at a time */, pubKey = `publish:${id}`;
              BOARD.start(pubKey, { product: id, kind: "publish", label: "Publishing your pages", of: batch.length, unit: "pages" });
              for (const d of batch) { BOARD.step(pubKey, { what: `Publishing ${d.title}` }); out.push({ url: d.url, ...(await publishOne(id, d.url)) }); BOARD.step(pubKey, { add: 1 }); }
              BOARD.finish(pubKey, { ok: !out.length || out.some((x) => x.ok), line: `${out.filter((x) => x.ok).length} of ${out.length} published.` });
              if (out.some((x) => x.ok)) didIt(id, `Published ${out.filter((x) => x.ok).length} page(s).`);
              return send(200, { ok: true, line: out.length ? out.map((x) => (x.ok ? x.line : `${x.url}: ${x.why}`)).join(" · ") : "Nothing new to publish — make pages first (line 1)." });
            }
            if (what === "submit") { const x = await submitAll(id); return send(200, x.ok ? x : { ok: false, refused: x.why }); }
            if (what === "weekly") { const w = pread(id, "weekly.json", {}); const on = typeof json().on === "boolean" ? json().on : w.on === false; pwrite(id, "weekly.json", { ...w, on }); /* RR-353: a ticked job turns it ON (never a toggle) */return send(200, { ok: true, line: on ? "Weekly check: on — Visibility checks again a week after the last check, while it is open." : "Weekly check: off." }); }
            return send(400, { refused: "not something Visibility does" });
          }
          /* D3 · the IndexNow key file: the key (public by design — it sits on the client's own site), where to put it, and the check */
          /* RR-353 · Bing Webmaster Tools: the client's own key (Windows' secure store, sent only to Bing) → the searches people make in Bing */
          if (r[2] === "bing" && req.method === "GET") { const b = pread(id, "bing.json"); return send(200, { keySaved: KEYS.status(bingKeyName(id)).saved, last: b, howTo: BING_HOWTO, site: s.product?.site ?? null }); }
          if (r[2] === "bing" && req.method === "POST") {
            if (!ctx.hasSite) return send(400, { refused: "Bing Webmaster Tools needs your website — add it in Settings first." });
            const v = json(); if (String(v.key ?? "").trim()) { const k = KEYS.set(bingKeyName(id), String(v.key).trim()); if (!k.ok) return send(400, { refused: k.why }); }
            const out = await bingQueries({ site: s.product.site, key: KEYS.get(bingKeyName(id)), ...(allowLocal && CONFIG.bingApiBase ? { base: CONFIG.bingApiBase } : {}) });
            if (!out.ok) return send(400, { refused: out.why });
            const on = new Date().toISOString().slice(0, 10), ph = bingPhrases(out.rows, on);
            pwrite(id, "phrases.json", [...pread(id, "phrases.json", []).filter((p) => p.kind !== "bing"), ...ph]); // Bing's newest read replaces its last
            pwrite(id, "bing.json", { on, searches: ph.length, site: s.product.site }); replan(id);
            return send(200, { ok: true, searches: ph.length, line: `${out.line} They are used when Visibility plans your pages, each marked "from Bing".` });
          }
          /* RR-353 · the "Search engines" panel: Google, Bing (IndexNow + Webmaster Tools) and each published page — what is done and what is next */
          /* RR-360 E · the AlmiSEO Data page (numbers only as measured), "Read it now", and G5's free route: the client's own AI in the client's own browser */
          if (r[2] === "almiseo" && req.method === "GET") return send(200, { view: almiSeoView(pread(id, ALMISEO_FILE, null), { subject: seedOf(s), planOk: Boolean(currentLicence()) }), syncing: seoSyncing.has(id) });
          if (r[2] === "almiseo/sync" && req.method === "POST") { const syncKey = `sync:${id}`; BOARD.start(syncKey, { product: id, kind: "sync", label: "Reading AlmiWorld's research", what: "Asking for what is new" }); const x = await syncAlmiSeo(id).catch((e) => ({ ok: false, why: e.message })); BOARD.finish(syncKey, { ok: x.ok !== false, line: x.ok === false ? "It could not be read just now. The app tries again by itself." : "Read." }); return send(x.ok ? 200 : 400, x.ok ? { ok: true, line: x.line, view: almiSeoView(pread(id, ALMISEO_FILE, null), { subject: seedOf(s), planOk: Boolean(currentLicence()) }) } : { refused: x.line ?? `AlmiSEO Data could not be read just now: ${x.why}` }); }
          if (r[2] === "almiseo/browser" && req.method === "GET") { const items = coverageItems((pread(id, "auto-plan.json", null)?.pages ?? []).filter((p) => (p.coverageRoute ?? ROUTES.none) === ROUTES.none).map((p) => ({ ...p, coverageRoute: ROUTES.none }))); return send(200, { items, instruction: items.length ? browserInstruction(items) : null }); }
          if (r[2] === "almiseo/browser" && req.method === "POST") {
            let hand; try { hand = JSON.parse(Buffer.from(String(json().base64 ?? ""), "base64").toString("utf8")); } catch { return send(400, { refused: "That is not the file your AI gave you after its reading." }); }
            const items = coverageItems((pread(id, "auto-plan.json", null)?.pages ?? []).map((p) => ({ ...p, coverageRoute: ROUTES.none })), { max: 500 }), t = takeBrowserReads(hand, items);
            if (!t.ok) return send(400, { refused: `Refused — ${t.refusedFor.join(", ")}. Nothing from this file is kept.` });
            const got = coverageFromBrowser(t.pages, { subject: seedOf(s) }); pwrite(id, BROWSER_COVERAGE, { ...pread(id, BROWSER_COVERAGE, {}), ...got });
            return send(200, { ok: true, line: `${Object.keys(got).length} page${Object.keys(got).length === 1 ? "" : "s"}: what Google's top results cover is kept (addresses and headings only). The next run uses it.` });
          }
          if (r[2] === "search-engines" && req.method === "GET") {
            if (!ctx.hasSite) return send(400, { refused: "Search engines need a website." });
            const inx = pread(id, "indexnow.json") ?? { key: newIndexNowKey() }; pwrite(id, "indexnow.json", inx);
            const origin = site?.origin ?? new URL(s.product.site).origin, live = pread(id, "published.json", []).filter((x) => x.state === "LIVE"), b = pread(id, "bing.json");
            return send(200, { blocked: publishBlocked(s) ? ALMIWORLD_NO : null, sitemap: `${origin}/sitemap.xml`, pages: submissionLines(live, pread(id, "submissions.json", {})),
              google: { connected: sc?.kind === "CONNECTED", export: sc?.kind === "EXPORT", canSubmit: sc?.kind === "CONNECTED" && CONFIG.googleCanSubmit === true, site: sc?.site ?? null, line: sc?.kind === "CONNECTED" ? (CONFIG.googleCanSubmit === true ? "Connected ✓ — your sitemap is sent to Google after each publish." : "Connected ✓ to read your searches — to also send your sitemap after each publish, connect Google again with \"also tell Google about my new pages\".") : "Not connected — connect Google Search Console so your sitemap is sent after each publish." },
              indexNow: { verified: inx.verified === true, key: inx.key, url: keyFileUrl(origin, inx.key), howTo: keyFileHowTo(origin, inx.key), line: inx.verified === true ? "Ready ✓ — every page Visibility publishes is sent to Bing (and the AI search that reads Bing) at once." : "Not ready — put the key file on your site, then press Check my key file." },
              bing: { connected: KEYS.status(bingKeyName(id)).saved, last: b, steps: BING_SETUP_STEPS, done: pread(id, "bing-setup.json")?.done === true } });
          }
          if (r[2] === "search-engines/bing-done" && req.method === "POST") { pwrite(id, "bing-setup.json", { done: json().done !== false, on: new Date().toISOString() }); return send(200, { ok: true }); }
          /* RR-353 · the client's social media pages (Facebook Page, LinkedIn, Instagram, TikTok, X, YouTube): the posts open there */
          if (r[2] === "social-links" && req.method === "POST") { const x = socialFrom(json().links ?? {}); if (x.refused) return send(400, { refused: x.refused }); s.setup.social = x.links; store.write(id, s); return send(200, { ok: true, links: x.links, line: Object.keys(x.links).length ? `Saved ✓ — ${Object.keys(x.links).length} page${Object.keys(x.links).length === 1 ? "" : "s"}.` : "Saved ✓ — no social page set." }); }
          if (r[2] === "social-links" && req.method === "GET") { const p = pread(id, "pages.json"), d = p?.drafts?.[0] ?? null; return send(200, { links: s.setup?.social ?? {}, networks: SOCIAL_NETWORKS, posts: d ? socialShare({ post: socialFor(d, p?.plan?.find((x) => x.kind === "NEW" && d.title === x.question) ?? p?.plan?.find((x) => x.kind === "NEW")), links: s.setup?.social ?? {}, url: pread(id, "published.json", []).find((x) => x.url === d.url && x.state === "LIVE")?.live ?? null }) : [], autoPost: AUTO_POST_LINE }); }
          if (r[2] === "indexnow" && req.method === "GET") { if (!ctx.hasSite) return send(400, { refused: "IndexNow needs a website." }); const inx = pread(id, "indexnow.json") ?? { key: newIndexNowKey() }; pwrite(id, "indexnow.json", inx); const origin = site?.origin ?? new URL(s.product.site).origin; return send(200, { key: inx.key, url: keyFileUrl(origin, inx.key), howTo: keyFileHowTo(origin, inx.key), verified: inx.verified === true, pages: submissionLines(pread(id, "published.json", []), pread(id, "submissions.json", {})), almiworld: publishBlocked(s) }); }
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
            /* RR-351: the offer button is asked FIRST for anything that makes a page (the site's read is the next need) */
            if ((f === "seo-pages" || f === "articles") && hasWebsite(s) && !ctaOf(s)) return send(400, { refused: NO_CTA, needsCta: true });
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
            if (f === "keywords") return send(200, { found: foundInfo({ site, youtube: ytData, files, searchConsole: sc, keys: { ai: ctx.aiKey }, own: ownItemsOf(id), asked: askedOf(id), on: new Date().toISOString() }) });
            if (f === "youtube") return send(200, { open: "youtube" });
            if (f === "tiktok-instagram") return send(200, { open: "tiktok-instagram" }); // RR-348 b
            if (f === "google") return send(200, { open: "google" });
            if (f === "page-count") return send(200, { open: "page-count" }); // RR-318 C
            if (f === "search-power") return send(200, { open: "search" }); // RR-318 D
            if (f === "publish") return send(200, { open: "publish" });
            if (f === "seo-pages" || f === "articles") {
              if (!ctaOf(s)) return send(400, { refused: NO_CTA, needsCta: true }); // RR-351: no page is made without the client's own offer button
              /* RR-353: Create SEO pages = createPages (our own data first, the official answers read, auto-publish only where allowed) */
              if (f === "seo-pages") { const x = await createPages(id); if (x.refused) return send(400, { refused: x.refused, needsCta: x.needsCta === true, needsSubject: x.needsSubject === true }); return send(200, { pages: { ...x.pages, drafts: x.pages.drafts.map(({ html, ...d }) => ({ ...d, why: plainWhy(d) })) }, autoPublished: x.auto }); } // RR-354: each not-ready page with its plain reason
              const pages = seoPages({ site, target: pread(id, "publish.json")?.kind ?? null, searchConsole: sc, files, youtube: ytData, on: new Date().toISOString(), overrides: pread(id, "edits.json", {}), official: officialForPages(id), cta: ctaOf(store.read(id)), planned: plannedOf(id), own: ownItemsOf(id), subject: aboutOf(store.read(id)), ...seoExtras(id), ...madePlanOf(id) });
              pwrite(id, "pages.json", pages);
              /* RR-308 D5: the client chose "publish automatically after the gates" AND connected a site → each draft that passes is published now */
              let auto = null;
              if (f === "seo-pages" && (s.setup?.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */) === PUBLISH_MODE.AUTO_AFTER_GATES && pread(id, "publish.json")?.kind) { auto = []; for (const d of pages.drafts.filter((x) => x.readyAsDraft && !x.improve).slice(0, BATCH) /* G19: a small batch at a time */) auto.push({ url: d.url, ...(await publishOne(id, d.url)) }); }
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
      { const r = /^\/api\/products\/([^/]+)\/(web\/write|count|count\/make|count\/understand|count\/draftlist|count\/preview|count\/recheck|count\/light|count\/confirm|count\/ai|count\/index|research\/browser|research\/handin|research\/file|research\/own|keywords|keywords\/folder|keywords\/ads|keywords\/ads\/start|keywords\/ads\/ideas|keywords\/dfs|keywords\/dfs\/volume|keywords\/service|keywords\/service\/usage|official|official\/suggest|official\/page|search|search\/read|facts-file)$/.exec(u.pathname);
        if (r) {
          const id = decodeURIComponent(r[1]);
          try { store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          const { s, site, sc, files } = contextOf(id);
          /* 🔴 RR-351 · "Add official facts file": the product's verified-facts files — only a fact proved on its official page goes on a page;
           * the rest show "check the official page" with its link. The same file name again replaces that file's facts */
          if (r[2] === "facts-file" && req.method === "GET") return send(200, factsFileView(pread(id, FACTS_FILE, null)));
          if (r[2] === "facts-file" && req.method === "POST") {
            const v = json(), name = String(v.name ?? "").split(/[\\/]/).pop().slice(0, 120) || "facts.json";
            const got = readFactsFile(v.text, { name });
            if (!got.ok) return send(400, { refused: got.refused, skipped: got.skipped ?? [] });
            const next = addFactsFile(pread(id, FACTS_FILE, null), got, { on: new Date().toISOString() });
            pwrite(id, FACTS_FILE, next);
            didIt(id, `Added the official facts file ${name}: ${got.counts.verified} fact${got.counts.verified === 1 ? "" : "s"} for pages, ${got.counts.check} "check the official page".`);
            return send(200, { ok: true, line: `${name}: ${got.counts.verified} fact${got.counts.verified === 1 ? "" : "s"} proved on their official page go on your pages; ${got.counts.check} not proved show only "check the official page" with the link${got.counts.skipped ? `; ${got.counts.skipped} skipped` : ""}. Press Create SEO pages again to use them.`, skipped: got.skipped, view: factsFileView(next) });
          }
          /* A · "Write better with AI" under a website item: its page's fact sheet (and its official answers), the same truth guard as YouTube */
          if (r[2] === "web/write" && req.method === "POST") {
            const v = json(); if (!WEB_KINDS[v.kind]) return send(400, { refused: "Visibility does not write that with AI." });
            if (!site) return send(400, { refused: "Check your product first — the AI writes from your pages." });
            const ai = aiOf(s); if (!ai) return send(400, { refused: "Connect your AI key first (Settings → Your AI connection)." });
            const ok = LEDGER.allowed(); if (!ok.ok) return send(400, { refused: ok.why });
            const page = site.pages.find((p) => p.url === v.page) ?? (v.kind === "organization" ? site.pages[0] : null);
            const official = v.kind === "new page" || v.kind === "FAQ answer" ? destinationsIn(v.question ?? v.present ?? "").flatMap((c) => officialForPages(id)[c] ?? []) : [];
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
            return send(200, { browser: browser ? { ...browser, usedToday } : null, runs: runs.slice(-5), dimensions: DIMENSIONS, howto: LIST_HOWTO, worldLists: WORLD_LISTS, builtIn: aw ? { roles: bi("roles"), universities: bi("universities"), subjects: bi("subjects"), professions: bi("professions"), recognising: bi("recognising") } : null, listPath: Boolean(listOf(s, aboutOf(s))), aiConnected: Boolean(aiOf(s)), running: counting.has(id), progress: countProgress.get(id) ?? null, subject: aboutOf(s), description: s.setup?.official?.description ?? "", site: s.setup?.official?.site ?? "", formula: pread(id, "formula.json"), last: lastC?.list && lastC.plan ? { ...lastC, plan: { ...lastC.plan, kinds: undefined } } /* RR-321 proof: the screen shows the tables; the pages' bodies (MBs) stay in the file */ : lastC, make: pread(id, "make.json"), preview: pread(id, "preview.json"), updates: pread(id, "updates.json", []).slice(-30), almiworld: aw,
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
          if (r[2] === "keywords/service" && req.method === "POST" && outsideClient()) return send(403, { refused: "This is not part of your plan: AlmiWorld's research reaches you as finished pages." }); // RULING 2
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
          /* RR-357: DataForSEO has ONE place — Search results data (its keys, its switch, its caps); no second switch here */
          if (r[2] === "keywords/dfs" && req.method === "POST") return send(409, { refused: "DataForSEO is set in ONE place now: Search results data (its login, its switch and its caps).", open: "search-data", ...dfsOf().status() });
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
            const built = seoPages({ site, target: pread(id, "publish.json")?.kind ?? null, on: new Date().toISOString(), pagePlan: six, subject: c.subject, official: officialForPages(id), cta: ctaOf(s) });
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
            if (!ctaOf(s)) return send(400, { refused: NO_CTA, needsCta: true }); // RR-351
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
              const x = await createPages(id); if (x.refused) { pwrite(id, "make.json", { on: new Date().toISOString(), line: x.refused }); return; }
              const n = x.pages.drafts.filter((d) => d.readyAsDraft).length;
              /* RR-323 proof: 2 of the batch got no draft and the line said only "23 of 25" — each one is named, with the planner's reason */
              const notMade = pages.filter((p) => !x.pages.drafts.some((d) => d.title === p.title)).map((p) => `${p.title} — ${(x.pages.plan ?? []).find((r) => r.question === p.title)?.why ?? "not built"}`);
              pwrite(id, "batches.json", [...batchesMade, { made: new Date().toISOString(), titles: pages.map((p) => p.title), urls: x.pages.drafts.filter((d) => first.has(d.title)).map((d) => d.url) }]);
              didIt(id, `Made ${n} page draft${n === 1 ? "" : "s"} from "How many pages" (the first batch: ${pages.length} of ${all.length} planned; ${regs.length} regulator pages read).`);
              pwrite(id, "make.json", { on: new Date().toISOString(), drafts: n, planned: pages.length, all: all.length, read: regs.length, notMade, line: `${n} of the first batch's ${pages.length} pages made as drafts (${all.length} planned in all); ${regs.length} regulators' own pages read for it.${notMade.length ? ` Not made as a page of its own: ${notMade.join("; ")}.` : ""} Read them under "Pages and articles".${publishBlocked(s) ? ` ${ALMIWORLD_NO}` : ""}` });
            })().catch((e) => pwrite(id, "make.json", { on: new Date().toISOString(), line: `Making stopped: ${e.message}` })).finally(() => { counting.delete(id); countProgress.delete(id); });
            counting.set(id, run);
            return send(200, { ok: true, running: true, line: "Reading each regulator's own page of the first batch, then making the drafts — a few minutes. You can leave this screen." });
          }
          if (r[2] === "count/make" && req.method === "POST") {
            const c = pread(id, "page-count.json"); const all = c?.plan ? Object.values(c.plan.kinds).flat() : [], first = new Set(c?.plan?.rollout?.first ?? all.map((p) => p.title)), pages = all.filter((p) => first.has(p.title));
            if (!pages.length) return send(400, { refused: "Count first — then make the pages Visibility planned." });
            if (!site) return send(400, { refused: "Check your website first — the pages are made in its look and linked to it." });
            if (!ctaOf(s)) return send(400, { refused: NO_CTA, needsCta: true }); // RR-351
            pwrite(id, "planned.json", pages.map((p) => ({ text: p.title, source: `How many pages (${p.kind}${p.weak ? ", an opportunity page — no search yet" : `, answers ${p.questions.length} question${p.questions.length === 1 ? "" : "s"}`})` })));
            pwrite(id, "made-plan.json", pages);
            const x = await createPages(id); if (x.refused) return send(400, { refused: x.refused, needsCta: x.needsCta === true, needsSubject: x.needsSubject === true });
            const n = x.pages.drafts.filter((d) => d.readyAsDraft).length;
            didIt(id, `Made ${n} page draft${n === 1 ? "" : "s"} from "How many pages" (the first batch: ${pages.length} of ${all.length} planned).`);
            return send(200, { ok: true, line: `${n} of the first batch's ${pages.length} page${pages.length === 1 ? "" : "s"} made as drafts (${all.length} planned in all) — read them under "Pages and articles". A page that is not ready lacks an official fact with its source and date (it says which). The next batch comes when your Search Console shows Google showing these.${publishBlocked(s) ? ` ${ALMIWORLD_NO}` : ""}`, drafts: n, planned: pages.length, all: all.length });
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
          if (r[2] === "publish" && req.method === "GET") return send(200, { submitted: submissionLines(pread(id, "published.json", []), pread(id, "submissions.json", {})), almiworld: publishBlocked(s), targets: TARGETS, target: conn, keySaved: keyName ? KEYS.status(keyName).saved : false, mode: s.setup?.publishMode?.mode ?? PUBLISH_MODE.REVIEW_FIRST /* RR-355: never chosen = show me first (as Setup) */, records: pread(id, "published.json", []), drafts: (pread(id, "pages.json")?.drafts ?? []).map(({ html, ...d }) => d), folder: downloadsFor(id) });
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
      /* RR-344 B · where the articles go, today's notice (the dashboard asks it each time it opens), and the export file */
      { const r = /^\/api\/products\/([^/]+)\/articles\/(today|where|export)$/.exec(u.pathname);
        if (r) {
          const id = decodeURIComponent(r[1]); let s;
          try { s = store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          const saved = pread(id, "articles-go.json"), go = destOf(saved, s.setup?.publishMode?.mode);
          if (r[2] === "where" && req.method === "GET") return send(200, { go, options: Object.entries(ARTICLE_DEST).map(([k, v]) => ({ id: k, label: v.label })), notify: saved?.notify === true, email: EMAIL_SUMMARY });
          if (r[2] === "where" && req.method === "POST") {
            const v = json(); if (!ARTICLE_DEST[v.go]) return send(400, { refused: "Choose where your articles go." });
            pwrite(id, "articles-go.json", { go: v.go, notify: v.notify === true, on: new Date().toISOString() });
            s.setup.publishMode = { mode: ARTICLE_DEST[v.go].mode }; store.write(id, s);
            return send(200, { ok: true, line: `Saved: ${ARTICLE_DEST[v.go].label}.` });
          }
          if (r[2] === "today" && req.method === "GET") {
            const day = new Date().toISOString().slice(0, 10), pages = pread(id, "pages.json"), made = pread(id, "articles.json", []);
            let today = made.find((x) => x.day === day) ?? null, none = null;
            if (!hasWebsite(s)) none = "articles are made from a website, and this product has none";
            else if (Number(s.setup?.articlesPerDay?.perDay ?? 1) === 0) none = "you paused articles (0 a day, in Settings)";
            else if (!pages) none = "press \"Check my product now\", then \"Create SEO pages\" — the articles are made from them";
            else if (!today) { const a = articleOfDay({ pages, earlier: made.map((x) => x.url), day }); if (a.url) { pwrite(id, "articles.json", [...made, { url: a.url, title: a.title, day }]); today = { url: a.url, title: a.title, day }; } else none = String(a.none ?? "").replace(/^No new article today — /, ""); }
            const n = todayNotice({ go, today, none, live: pread(id, "published.json", []), connected: Boolean(pread(id, "publish.json")?.kind) });
            const d = today ? (pages?.drafts ?? []).find((x) => x.url === today.url) : null;
            const posts = d && (n.state === "published" || go === "social") ? socialFor(d, pages.plan?.find((x) => x.kind === "NEW" && x.question === d.title) ?? pages.plan?.find((x) => x.kind === "NEW")).posts ?? [] : [];
            return send(200, { ...n, go, notify: saved?.notify === true, posts });
          }
          if (r[2] === "export" && req.method === "GET") {
            const d = (pread(id, "pages.json")?.drafts ?? []).find((x) => x.url === u.searchParams.get("url")); if (!d) return send(404, { refused: "No such draft." });
            const md = u.searchParams.get("format") === "md", name = `${String(d.url).replace(/^https?:\/\/[^/]+/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "article"}.${md ? "md" : "html"}`;
            res.writeHead(200, { "content-type": md ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" });
            return res.end(md ? `# ${d.title}\n\n${markdownOf(mainOf(d.html)).replace(/^# [^\n]*\n+/, "")}` : d.html);
          }
          return send(405, { refused: "Not here." });
        } }
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
      if (req.method === "GET" && u.pathname === "/api/menu") return send(200, { ...menuFor({ hasSite: false, siteRead: null, youtubeConfirmed: false, youtubeKey: KEYS.status(KEY_NAMES.youtube).saved, searchConsole: false, files: false, drafts: false, check: null, aiKey: false }), topJobs: TOP_JOBS, moreJobs: MORE_JOBS });
      /* RR-307 D6: the first-run tour, shown once until closed */
      if (req.method === "GET" && u.pathname === "/api/tour") return send(200, { show: CONFIG.tourSeen !== true });
      if (req.method === "POST" && u.pathname === "/api/tour") { CONFIG.tourSeen = true; saveConfig(); return send(200, { ok: true }); }
      /* RR-303 A: the licence key from a purchase — saved, never echoed */
      if (req.method === "POST" && u.pathname === "/api/account") {
        const licenceKey = cleanLicenceText(json().licenceKey); // RR-342: the key as pasted from anywhere — only the av_ / avo_ text is kept
        /* RR-304: the owner licence (avo_…) — kept only when THIS copy's public key verifies it */
        if (String(licenceKey ?? "").trim().startsWith("avo_")) {
          const signed = readOwnerLicenceText(licenceKey);
          if (!signed || !isOwnerLicence(signed.licence) || !verifyLicence(signed, keyPem("licence-public.pem"))) return send(400, { refused: "This owner licence could not be verified by this copy of Visibility — it was made with a different signing key, or the text is incomplete." });
          CONFIG.owner = signed; CONFIG.account = signed.licence.account; saveConfig();
          const st = await licenceNow();
          return send(200, { ok: true, line: st.line });
        }
        if (!LICENCE_KEY.test(String(licenceKey ?? "").trim())) return send(400, { refused: "That is not a licence key. It starts with av_ — copy it from the page shown after you bought your plan." });
        /* RR-342 (owner's live test): a buyer key REPLACES the owner licence, and the last check of the old licence is dropped */
        delete CONFIG.owner; CONFIG.account = licenceKey; saveConfig(); saveLicence(null);
        const st = await licenceNow();
        return send(200, { ok: true, line: st.line });
      }
      /* RR-306 A3: the client's keys — status only (never the key), save (pasted), remove */
      /* 🔴 RR-357 · SEARCH RESULTS DATA — the client's own DataForSEO account: its state (never the login or password — only whether they are
       * saved), the switch and the caps (a day at most $1 — R10), "Test the connection" (ONE search, the client's own click, inside the caps) */
      if (u.pathname === "/api/search-data" && (req.method === "GET" || req.method === "POST")) {
        if (req.method === "POST") {
          const v = json(), d = { ...(CONFIG.dataForSeo ?? {}) };
          if (v.on !== undefined) d.on = v.on === true;
          if (v.capDay !== undefined) { const n = Number(v.capDay); if (!(n > 0 && n <= SERP.capPerDay)) return send(400, { refused: `The daily cap is between $0.01 and $${SERP.capPerDay} — never more than $${SERP.capPerDay} a day.` }); d.capDay = n; }
          if (v.capMonth !== undefined) { const n = Number(v.capMonth); if (!(n > 0 && n <= 31)) return send(400, { refused: "The monthly cap is between $0.01 and $31." }); d.capMonth = n; }
          if (d.on && !(KEYS.status(DFS_KEYS.login).saved && KEYS.status(DFS_KEYS.password).saved)) return send(400, { refused: "Save your DataForSEO API login and API password first (step 2), then switch it on." });
          CONFIG.dataForSeo = d; saveConfig();
        }
        return send(200, searchDataView(u.searchParams.get("product")));
      }
      if (u.pathname === "/api/search-data/test" && req.method === "POST") {
        const login = KEYS.get(DFS_KEYS.login), password = KEYS.get(DFS_KEYS.password);
        if (!login || !password) return send(400, { refused: "Save your DataForSEO API login and API password first (step 2)." });
        const ledger = dfsLedger(), spentBefore = (ledger.spent ?? []).length, v = json();
        /* RR-358 (the owner's four tests searched "almiworld youtube" from AlmiOET — the screen sent a name kept from another product): the OPEN product's own subject */
        const ps = (() => { try { return v.product ? store.read(String(v.product)) : null; } catch { return null; } })();
        const q = String(v.keyword ?? "").trim() || (ps ? `${seedOf(ps) ?? ps.product?.name ?? ""}`.trim() : "") || "how to choose a dentist";
        const r = await searchGoogle({ keyword: q, settings: searchData(), ledger, login, password, test: true, retry: Number.isInteger(CONFIG.testSerpPauseMs) ? { ...RETRY, pauseMs: CONFIG.testSerpPauseMs } : RETRY, ...(CONFIG.serpTestUrl ? { fetchImpl: (u2, init) => fetch(CONFIG.serpTestUrl, init) } : {}) });
        writeFileSync(DFS_LEDGER_FILE, JSON.stringify(ledger));
        const cost = (ledger.spent ?? []).length > spentBefore ? (ledger.spent.at(-1)?.cost ?? 0) : 0; // RR-358: only THIS search's cost
        /* RR-358: the test shows what Google returned (the top results' titles); a refusal is DataForSEO's own reason, in plain words */
        return send(200, r.ok ? { ...searchDataView(), ok: true, line: `Connected ✓ — Google's results for "${q}" were read: ${r.results.length} results, ${r.paa.length} "People also ask" questions. This search cost $${Number(cost).toFixed(4)}${r.tries > 1 ? ` (DataForSEO failed ${r.tries - 1} time${r.tries === 2 ? "" : "s"} first — tried again; a failed try costs nothing)` : ""}. The real price per search: $${realPrice(ledger).price.toFixed(4)} — ${realPrice(ledger).from}.`, top: r.results.slice(0, 10).map((x) => ({ title: x.title, url: x.url })), paa: r.paa.slice(0, 5) } : { ...searchDataView(), line: undefined, ok: false, refused: `Not connected — ${r.why} Nothing was charged for it${Number(cost) ? ` beyond $${Number(cost).toFixed(4)}` : ""}.` });
      }
      if (u.pathname === "/api/spend" && req.method === "GET") return send(200, spendView());
      if (req.method === "GET" && u.pathname === "/api/keys") return send(200, { where: KEYS.where, available: KEYS.available, keys: Object.fromEntries([...KEY_ALLOWED].map((n) => [n, KEYS.status(n)])), aiProviders: AI_PROVIDERS });
      { const k = /^\/api\/keys\/([A-Z][A-Z0-9_]{2,63})(\/remove)?$/.exec(u.pathname);
        if (k && req.method === "POST") {
          if (!KEY_ALLOWED.has(k[1])) return send(400, { refused: "not a key this app uses" });
          if (k[2]) { KEYS.remove(k[1]); return send(200, { ok: true, status: KEYS.status(k[1]) }); }
          const r = KEYS.set(k[1], json().key);
          return r.ok ? send(200, { ok: true, status: KEYS.status(k[1]) }) : send(400, { refused: r.why });
        } }
      /* RR-348 b · TikTok & Instagram: the client's handle and niche, the plan (checks, ideas, hooks, hashtag sets, advice, best times from their
       * own file), "Write better with AI" with their own key inside their own monthly AI limit. Nothing is read from or posted to TikTok or
       * Instagram. */
      { const t = /^\/api\/products\/([^/]+)\/social-creator(?:\/(setup|plan|write))?$/.exec(u.pathname);
        if (t) {
          const tid = decodeURIComponent(t[1]);
          let s; try { s = store.read(tid); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          const saved = pread(tid, "social-creator.json", {});
          if (!t[2] && req.method === "GET") return send(200, { setups: saved, aiCost: LEDGER.line(), ai: Boolean(aiOf(s)) });
          const v = json(), platform = SOCIAL_PLATFORMS.includes(v.platform) ? v.platform : null;
          if (t[2] === "setup" && req.method === "POST") { const r = socialSetup(v); if (!r.ok) return send(400, { refused: r.why }); pwrite(tid, "social-creator.json", { ...saved, [r.platform]: { handle: r.handle, niche: r.niche, country: String(v.country ?? "").slice(0, 40), on: new Date().toISOString() } }); return send(200, { ok: true }); }
          if (!platform || !saved[platform]) return send(400, { refused: "Add your handle and niche for TikTok or Instagram first." });
          const set = saved[platform];
          if (t[2] === "plan" && req.method === "POST") return send(200, { plan: socialPlan({ platform, handle: set.handle, niche: set.niche, country: set.country, captions: Array.isArray(v.captions) ? v.captions.map(String) : [], analytics: typeof v.analytics === "string" ? v.analytics.slice(0, 2_000_000) : null, data: await creatorData(platform, set.niche, countryCodeOf(set.country)) }) });
          if (t[2] === "write" && req.method === "POST") {
            const ai = aiOf(s); if (!ai) return send(400, { refused: "Connect your AI key first (Settings → Your AI connection)." });
            const ok = LEDGER.allowed(); if (!ok.ok) return send(400, { refused: ok.why });
            const r = await writeCaptionsAI({ provider: ai.provider, key: ai.key, platform, niche: set.niche, handle: set.handle, caption: String(v.caption ?? "").slice(0, 2200) });
            if (r.usage) LEDGER.add(r.usage);
            return send(r.ok ? 200 : 400, r.ok ? { ...r, usage: undefined, aiCost: LEDGER.line() } : { refused: r.why, aiCost: LEDGER.line() });
          }
          return send(404, { refused: "not found" });
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
      /* RR-340 · "Manage or cancel my plan": the site makes a portal session for THIS licence (the key goes in the request body, never an
       * address), and the app opens Stripe's page in the browser; the address is shown too, in case no browser opens */
      if (req.method === "POST" && u.pathname === "/api/plan/manage") {
        if (!CONFIG.account || CONFIG.owner) return send(400, { refused: CONFIG.owner ? "The owner licence has no paid plan to manage." : "Add your licence key first (Your plan)." });
        try {
          const r = await fetch(new URL("v1/manage", LICENCE_URL), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ licenceKey: CONFIG.account }), signal: AbortSignal.timeout(15000) });
          const j = await r.json().catch(() => ({}));
          if (!j.ok || typeof j.url !== "string") return send(r.status === 404 ? 404 : 503, { refused: j.why ?? "Plan management is not available just now. Please try again later." });
          return send(200, { ok: true, opened: Boolean(openBilling(j.url)), url: j.url });
        } catch { return send(503, { refused: "The AlmiVisibility website could not be reached. Check the internet connection and try again." }); }
      }
      if (req.method === "GET" && u.pathname === "/api/licence") { const st = await licenceNow(); return send(200, { state: st.state, line: st.line, mayStartNewWork: st.mayStartNewWork, plan: st.plan?.words ?? null, plans: PLANS.map((p) => p.words) }); }
      /* RR-353: the app asks on start and every few hours (the screen calls this); only a NEWER, verified version can be installed */
      if (req.method === "GET" && u.pathname === "/api/update") {
        let r; try { r = await checkForUpdate({ channelUrl: UPDATE_URL, current: VERSION, publicKeyPem: keyPem("update-public.pem") }); } catch { r = { state: "UNREACHABLE", line: `Could not check for updates just now. Visibility keeps working on ${VERSION}; try again later.` }; }
        updateFound = r.state === "AVAILABLE" ? r.manifest : null;
        /* 🔴 RR-355 (owner: "check at app start and every 4 hours, download in the background, then one button 'Update ready — Restart'; the client
         * never has to visit the website"): a newer, signed version is downloaded and its sha256 checked at once, in the background */
        if (updateFound && updateReady?.version !== updateFound.version && !updateDownloading) { BOARD.start("update", { kind: "update", label: "Downloading the update", what: `Version ${updateFound.version}`, unit: "MB" }); updateDownloading = downloadUpdate({ channelUrl: UPDATE_URL, manifest: updateFound, dataDir: DATA, publicKeyPem: keyPem("update-public.pem"), onProgress: (done, of) => BOARD.step("update", { done: Math.round(done / 1048576), of: Math.round(of / 1048576) }) }).then((d) => { if (d.ok) updateReady = { version: d.version, file: d.file }; BOARD.finish("update", { ok: d.ok, line: d.ok ? "The update is ready." : d.why }); }).catch(() => BOARD.finish("update", { ok: false, line: "The update could not be downloaded. It is tried again later." })).finally(() => { updateDownloading = null; }); }
        return send(200, { state: r.state, line: r.line, current: VERSION, version: r.version ?? null, checkedOn: new Date().toISOString(), ready: Boolean(updateFound && updateReady?.version === updateFound.version), downloading: Boolean(updateDownloading) });
      }
      if (req.method === "POST" && u.pathname === "/api/update/install") {
        const { agree } = json();
        if (!updateFound) return send(400, { refused: "Check for updates first — no newer version is waiting." });
        let d; try { d = updateReady && updateReady.version === updateFound.version ? { ok: true, ...updateReady } : await downloadUpdate({ channelUrl: UPDATE_URL, manifest: updateFound, dataDir: DATA, publicKeyPem: keyPem("update-public.pem") }); } catch { return send(400, { refused: "The update could not be downloaded — check the internet connection and try again. Nothing was changed." }); }
        if (!d.ok) return send(400, { refused: d.why });
        askedToStop();
        const r = installUpdate({ agreed: agree === true, verified: true, file: d.file, launcher: join(INSTALL, "AlmiVisibility.exe"), quiet: CONFIG.quietUpdate === true, extra: Array.isArray(CONFIG.testUpdateArgs) ? CONFIG.testUpdateArgs : [] /* TESTS ONLY: a sandbox install */ });
        if (!r.ok) return send(400, { refused: r.why });
        send(200, { ok: true, version: d.version, line: `Restarting with version ${d.version}. Your data is kept.` });
        return setTimeout(() => process.exit(0), 300);
      }
      if (req.method === "POST" && u.pathname === "/api/quit") { askedToStop(); send(200, { ok: true }); return setTimeout(() => process.exit(0), 200); }
      send(404, { refused: "not found" });
    } catch (e) { send(500, { refused: e.message }); }
  });
});
/* RR-362 item 1: after an update the app comes back on the port its window knows; taken by something else, any free port (the launcher then opens a window) */
server.once("error", (e) => { if (e.code === "EADDRINUSE") server.listen(0, "127.0.0.1"); else throw e; });
server.listen(Number(arg("port", "0")), "127.0.0.1", () => {
  writeFileSync(join(DATA, "run.json"), JSON.stringify({ port: server.address().port, pid: process.pid, version: VERSION }));
});
