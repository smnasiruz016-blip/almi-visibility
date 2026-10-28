/**
 * RR-300 / RR-302 / RR-303 · the almivisibility.almiworld.com APPLICATION — one request handler, used by the local server (site/server.mjs,
 * 127.0.0.1 only) and by Vercel (api/index.mjs). Plain Node, no framework. Nothing here is live until the owner's GREEN.
 * Keys by NAME only (never printed): VISIBILITY_SITE_DATABASE_URL · SITE_ADMIN_PASSWORD_HASH · ADMIN_EMAILS · RESEND_API_KEY · EMAIL_FROM ·
 * STRIPE_SECRET_KEY · STRIPE_PRICE_ID_VISIBILITY_1/_5/_10/_UNLIMITED · ROUTER_WEBHOOK_SECRET · STRIPE_WEBHOOK_SECRET · LICENCE_SIGNING_KEY
 * (the licence signing key, PEM) · VISIBILITY_SETUP_URL and VISIBILITY_UPDATE_BASE_URL (the Setup and the update channel on Vercel Blob).
 */
import { readFileSync, existsSync, statSync, createReadStream } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as P from "./pages.mjs";
import { articleHtml } from "./articles.mjs";
import { testableUrl, runFreeTest, dailyLimiter } from "./free-test.mjs";
import { checkLead, testRecord, siteStore, adminSessions, dailyCounts, leadsCsv, KEY_NAMES } from "./leads.mjs";
import { reportEmail, sendEmail, sendingOn, EMAIL_KEY_NAMES } from "./email.mjs";
import { createCheckout, BILLING_KEY_NAMES, portalSession, PORTAL_CONFIG_NAME, ensurePortalConfig } from "./billing.mjs";
import { applyEvent, signedLicence, ownerRecord, verifyRouterSignature, verifyStripeSignature, ROUTER_KEY_NAME, KEY_NAMES as LICENCE_KEYS, PRICE_ENV } from "../services/licence/service.mjs";
import { readOwnerLicenceText, isOwnerLicence, verifyLicence, OWNER } from "../desktop/licence.mjs";
import { createHash, createPublicKey, createPrivateKey, timingSafeEqual, randomBytes } from "node:crypto";
import { storeOf, kvStore, liteLimits, LITE_LIMITS, FINDER_COUNTS } from "./limits.mjs"; // RR-325 B
import { siteAds } from "./kw-google.mjs"; // RR-326
import { dbUrlOf, pgStore } from "./kw-store.mjs";
import { runCollector, currentGroups, storageLimitOf } from "./kw-collector.mjs";
import { queueNow, saveQueue, ownerStatus, productName, PRODUCT_NAMES } from "./owner-status.mjs"; // RR-329
import { moveUp } from "./queue.mjs";
import { PRODUCT_FACTS, FACT_PRODUCTS, PART_INFO } from "../desktop/product-facts.mjs";
import { importFiles, parseMultipart, IMPORT } from "./kw-import.mjs"; // RR-326 I
import { findKeywords, lookupKeywords, finderQuery, csvOf, groupOf, FINDER } from "./kw-finder.mjs";
import { checkLicence, takeSearch, giveBack, usageOf, serviceSeeds, LICENCE_HEADER, publicKeyState, PUBLIC_KEY_ENV } from "./kw-service.mjs";
import { DEFAULT_SEEDS, parseSeeds, locationOf, LANGUAGES } from "./kw-seeds.mjs";
import { isOwner, ownerOn, ownerState, ownerCookie, ownerSignOut, ownerSignIn } from "./owner.mjs";
import { publicOnly } from "./free-test.mjs"; // RR-325 B
import { cfPgStore, SHOWN, PHOTO } from "./cf-store.mjs"; // RR-328 B
import { runCountryFacts, CF_ORDER, capsOf, finishedIn, costKey, CF_COLLECTOR } from "./cf-collector.mjs";
import { aiConfigured } from "./cf-ai.mjs";
import { coverageOf, countryPacket, productCoverageOf, CF_PROFESSIONS, doneIn } from "../desktop/country-facts.mjs";
import { officialReader } from "../desktop/official.mjs";
import { chainFetch } from "./chain-fetch.mjs"; // RR-330
import { runTestDates, datesTask } from "./cf-dates.mjs"; // RR-331
import { runSearchConsole } from "./gsc.mjs"; // RR-331
import { DATE_TESTS, NO_DATES, upcoming } from "../desktop/test-dates.mjs"; // RR-331
import { daysOf } from "./health.mjs"; // RR-331
import { ownerLines } from "../desktop/real-questions.mjs"; // RR-330
import { COUNTRIES } from "../desktop/world.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SITE_KEY_NAMES = Object.freeze({ setupUrl: "VISIBILITY_SETUP_URL", updateBase: "VISIBILITY_UPDATE_BASE_URL", signingKey: "LICENCE_SIGNING_KEY" });
/* RR-337 · the launch settings /owner lists: [name, what it is for, needed now?] — the page says "set" or "missing", never a value */
export const LAUNCH_VARS = Object.freeze([
  [SITE_KEY_NAMES.signingKey, "signs each buyer's licence", true], [PUBLIC_KEY_ENV, "the app's keyword service checks licences", true],
  [`${KEY_NAMES.database} or DATABASE_URL`, "buyers' licences and checkouts (RR-338: the Neon DATABASE_URL is used when the first is not set)", true, (env) => Boolean(String(env[KEY_NAMES.database] ?? "").trim() || dbUrlOf(env))],
  [BILLING_KEY_NAMES.stripeSecret, "opens Stripe Checkout", true], ...Object.values(PRICE_ENV).map((n) => [n, "the plan's Stripe price", true]),
  [ROUTER_KEY_NAME, "Stripe events through the billing router", true],
  [PORTAL_CONFIG_NAME, "optional — press “Create Manage-plan portal” below; the site then finds AlmiVisibility's own portal by itself", false],
  [SITE_KEY_NAMES.setupUrl, "the Setup download (the release's AlmiVisibility-Setup.exe link)", true], [SITE_KEY_NAMES.updateBase, "the app's updates (the release folder link, ending in /)", true],
  [BILLING_KEY_NAMES.testModeOnly, "takes payments — set it to yes only at your launch GREEN", false],
  [LICENCE_KEYS.webhookSecret, "only for a Stripe destination straight to this site (not needed with the router)", false],
  [KEY_NAMES.adminHash, "the /admin sign-in (admin is hidden on the sales site)", false],
  [EMAIL_KEY_NAMES.resend, "emails — the sales site sends none yet", false], [EMAIL_KEY_NAMES.from, "the emails' sender — not used yet", false]]);
export const launchVarsOf = (env) => LAUNCH_VARS.map(([name, use, needed, isSet]) => ({ name, use, needed, set: isSet ? isSet(env) : String(env[name] ?? "").trim() !== "" }));
const SECURITY = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "SAMEORIGIN", "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; form-action 'self' https://checkout.stripe.com; frame-ancestors 'self'" };
const PRIVATE = { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" };
const httpsUrl = (v) => typeof v === "string" && /^https:\/\//.test(v);

/** Build the handler. `dataDir` holds the LOCAL store (local runs only); `setupFile` is a local Setup the Download button serves. */
/** RR-325 A · the site's ONE switch: "public-lite" (ON until sales open) or "full". On Vercel it is public-lite unless set otherwise. */
/** RR-338 · a third: "sales" = everything public-lite has, PLUS selling (SALES_PATHS, served by the full handler). */
export const modeOf = (env = process.env, mode = null) => { const m = mode ?? env.VISIBILITY_SITE_MODE ?? (env.VERCEL ? "public-lite" : "full"); return m === "full" || m === "sales" ? m : "public-lite"; };
/* RR-338 · the selling routes the sales site adds to public-lite (admin, the old free test and unsubscribe stay hidden) */
export const SALES_PATHS = Object.freeze({ GET: ["/pricing", "/download", "/download/AlmiVisibility-Setup.exe", "/buy/success", "/v1/licence", "/manage"], POST: ["/api/billing/checkout", "/api/webhooks/stripe", "/manage", "/v1/manage"] });
export const isSalesPath = (method, path) => (SALES_PATHS[method] ?? []).includes(path) || (method === "GET" && /^\/updates\/(manifest\.json|packages\/[\w.-]+)$/.test(path));

export function createApp({ env = process.env, dataDir = join(HERE, "..", ".site-data"), setupFile = null, now = () => Date.now(), fetchImpl = fetch, freeTest = runFreeTest, mode = null, kvFetch = fetch, resolve = null, adsFetch = fetch, kwStore = null, sleep = null, cfStore = null, cfReader = null, cfAi = null, gscFetch = null, stripeFetch = null } = {}) {
  const m = modeOf(env, mode);
  if (m === "public-lite") return createLiteApp({ env, now, fetchImpl, freeTest, kvFetch, resolve, adsFetch, kwStore, sleep, cfStore, cfReader, cfAi, gscFetch });
  /* RR-338: the sales site's store is the same Neon database as the collectors' when VISIBILITY_SITE_DATABASE_URL is not set (its own visibility_* tables) */
  if (m === "sales") return createLiteApp({ env, now, fetchImpl, freeTest, kvFetch, resolve, adsFetch, kwStore, sleep, cfStore, cfReader, cfAi, gscFetch, stripeFetch,
    salesHandle: fullApp({ env, storeEnv: env[KEY_NAMES.database] || !dbUrlOf(env) ? env : { ...env, [KEY_NAMES.database]: dbUrlOf(env) }, dataDir, setupFile, now, fetchImpl: stripeFetch ?? fetchImpl, freeTest, sales: true }) });
  return fullApp({ env, dataDir, setupFile, now, fetchImpl, freeTest });
}

function fullApp({ env, storeEnv = env, dataDir, setupFile, now, fetchImpl, freeTest, sales = false }) {
  const store = siteStore({ env: storeEnv, localDir: dataDir });
  const limiter = dailyLimiter({ store });
  const admin = adminSessions({ env, store });
  const LOGO = readFileSync(join(HERE, "..", "desktop", "brand", "almiworld-logo.png"));
  const ICON = readFileSync(join(HERE, "..", "installer", "almiworld.ico"));
  const localSetup = () => Boolean(setupFile && existsSync(setupFile));
  const setupAvailable = () => localSetup() || httpsUrl(env[SITE_KEY_NAMES.setupUrl]);
  const emailOn = () => sendingOn(env);
  const PAGES = { "/": () => P.home({ emailOn: emailOn() }), "/free-test": () => P.freeTest({ emailOn: emailOn() }), "/features": P.features, "/pricing": () => P.pricing({ sales }), "/download": () => P.download({ setupAvailable: setupAvailable(), sales }), "/privacy": () => P.privacy({ preview: legalPreview(env) }), "/terms": () => P.terms({ preview: legalPreview(env) }) };
  const formOf = (body, type) => (/json/.test(type ?? "") ? JSON.parse(body || "{}") : Object.fromEntries(new URLSearchParams(body)));
  const cookie = (req, name) => (req.headers.cookie ?? "").split(/;\s*/).map((c) => c.split("=")).find(([k]) => k === name)?.[1] ?? null;
  const who = (req) => String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const originOf = (req) => (env.VERCEL ? P.ORIGIN : `http://${req.headers.host}`);
  const signingPem = () => env[SITE_KEY_NAMES.signingKey] ?? (env[LICENCE_KEYS.signingKeyFile] && existsSync(env[LICENCE_KEYS.signingKeyFile]) ? readFileSync(env[LICENCE_KEYS.signingKeyFile], "utf8") : null);
  /* RR-304: an admin row names a licence by a short hash of its key, never the key itself */
  const refOf = (account) => createHash("sha256").update(account).digest("hex").slice(0, 16);

  return async function handle(req, res, preRead = null) {
    const send = (code, body, type = "text/html; charset=utf-8", extra = {}) => { res.writeHead(code, { "content-type": type, ...SECURITY, ...extra }); res.end(body); };
    let body = "";
    if (preRead !== null) body = preRead; else for await (const c of req) { body += c; if (body.length > 200000) return send(413, "Too large", "text/plain"); } // RR-338: the sales site hands the body over
    try {
      const u = new URL(req.url, "http://127.0.0.1");
      /* the Stripe events, through the AlmiWorld billing router (its own HMAC), or Stripe's own signature — before the origin check: a webhook has no browser origin */
      if (req.method === "POST" && u.pathname === "/api/webhooks/stripe") {
        const nowS = Math.floor(now() / 1000);
        const viaRouter = verifyRouterSignature({ header: req.headers["x-almi-router-signature"], body, secret: env[ROUTER_KEY_NAME], nowS });
        const viaStripe = viaRouter.ok ? viaRouter : verifyStripeSignature({ header: req.headers["stripe-signature"], body, secret: env[LICENCE_KEYS.webhookSecret], nowS });
        if (!viaStripe.ok) return send(400, JSON.stringify({ refused: viaRouter.why }), "application/json");
        const accounts = await store.accounts();
        const changed = applyEvent(accounts, JSON.parse(body), { env });
        if (changed) await store.saveAccounts(accounts);
        return send(200, JSON.stringify({ received: true, licenceChanged: Boolean(changed) }), "application/json");
      }
      /* the app's licence check: a SIGNED answer for one licence key */
      if (req.method === "GET" && u.pathname === "/v1/licence") {
        const pem = signingPem();
        if (!pem) return send(503, JSON.stringify({ deferred: `the licence signing key is not configured (${SITE_KEY_NAMES.signingKey})` }), "application/json", PRIVATE);
        return send(200, JSON.stringify(signedLicence({ accounts: await store.accounts(), account: u.searchParams.get("account"), privateKeyPem: pem, now: now() })), "application/json", PRIVATE);
      }
      /* a form from another site is refused (the site's own forms only) */
      if (req.method === "POST" && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(403, "Forbidden", "text/plain");
      if (req.method === "GET" && PAGES[u.pathname]) { const html = PAGES[u.pathname](u); return html === null ? send(404, P.notFound(u.pathname)) : send(200, html); } // RR-325: a legal page with a [FILL] is not published
      if (req.method === "GET" && u.pathname === "/brand/almiworld-logo.png") return send(200, LOGO, "image/png", { "cache-control": "public, max-age=86400" });
      if (req.method === "GET" && u.pathname === "/favicon.ico") return send(200, ICON, "image/x-icon", { "cache-control": "public, max-age=86400" });
      if (req.method === "GET" && u.pathname === "/robots.txt") return send(200, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /buy/\nDisallow: /unsubscribe\nDisallow: /v1/\n\nSitemap: ${P.ORIGIN}/sitemap.xml\n`, "text/plain");
      if (req.method === "GET" && u.pathname === "/sitemap.xml") return send(200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/free-test", "/features", "/pricing", "/download"].map((p) => `<url><loc>${P.ORIGIN}${p}</loc></url>`).join("")}</urlset>\n`, "application/xml");
      /* the Setup: a local test Setup, or the one on Vercel Blob (its address in VISIBILITY_SETUP_URL) */
      if (req.method === "GET" && u.pathname === "/download/AlmiVisibility-Setup.exe") {
        if (localSetup()) { res.writeHead(200, { "content-type": "application/vnd.microsoft.portable-executable", "content-length": statSync(setupFile).size, "content-disposition": 'attachment; filename="AlmiVisibility-Setup.exe"', ...SECURITY }); return createReadStream(setupFile).pipe(res); }
        if (httpsUrl(env[SITE_KEY_NAMES.setupUrl])) return send(302, "", "text/plain", { location: env[SITE_KEY_NAMES.setupUrl] });
        return send(404, P.download({ setupAvailable: false, sales }));
      }
      /* the app's update channel: the signed manifest and packages on Vercel Blob (VISIBILITY_UPDATE_BASE_URL) */
      if (req.method === "GET" && /^\/updates\/(manifest\.json|packages\/[\w.-]+)$/.test(u.pathname)) {
        if (!httpsUrl(env[SITE_KEY_NAMES.updateBase])) return send(404, JSON.stringify({ refused: "no update channel is configured" }), "application/json");
        /* RR-338: the channel is a GitHub release folder — its files sit side by side, so packages/<file> is <base>/<file> */
        return send(302, "", "text/plain", { location: new URL(u.pathname.slice("/updates/".length).replace(/^packages\//, ""), env[SITE_KEY_NAMES.updateBase].replace(/\/?$/, "/")).href });
      }
      /* Buy: a Stripe Checkout session for the plan (TEST mode until launch), named for the router — or the page saying it is not connected */
      if (req.method === "POST" && u.pathname === "/api/billing/checkout") {
        const f = formOf(body, req.headers["content-type"]);
        const c = await createCheckout({ plan: f.plan, env, origin: originOf(req), fetchImpl });
        if (!c.ok) return send(c.state === "REFUSED" ? 400 : 503, P.buyNotConnected(f.plan, c.state, { sales, closed: Boolean(c.closed) }), undefined, PRIVATE);
        await store.addCheckout({ sessionId: c.sessionId, licenceKey: c.licenceKey, plan: c.plan, at: new Date(now()).toISOString() });
        return send(303, "", "text/plain", { location: c.url, ...PRIVATE });
      }
      if (req.method === "GET" && u.pathname === "/buy/success") {
        const c = await store.checkout(u.searchParams.get("session_id") ?? "");
        return send(c ? 200 : 404, P.buySuccess(c, { sales }), undefined, PRIVATE);
      }
      /* RR-340 · "Manage or cancel my plan": the page (the buyer pastes the licence key) and the app's own request (JSON) — each opens
       * that buyer's Stripe customer portal only; the key travels in the request body, never in an address */
      if (u.pathname === "/manage" && req.method === "GET") return send(200, P.managePage({ sales }), undefined, PRIVATE);
      if (req.method === "POST" && (u.pathname === "/manage" || u.pathname === "/v1/manage")) {
        const app = u.pathname === "/v1/manage", f = app ? JSON.parse(body || "{}") : formOf(body, req.headers["content-type"]);
        const r = await portalSession({ licenceKey: f.licenceKey, accounts: await store.accounts(), env, origin: originOf(req), fetchImpl });
        const code = r.ok ? 200 : r.state === "NOT_FOUND" ? 404 : r.state === "REFUSED" ? 400 : 503;
        if (app) return send(code, JSON.stringify(r.ok ? { ok: true, url: r.url } : { ok: false, why: r.state === "NOT_FOUND" || r.closed ? r.why : "Plan management is not available just now." }), "application/json", PRIVATE);
        return r.ok ? send(303, "", "text/plain", { location: r.url, ...PRIVATE }) : send(code, P.managePage({ sales, error: r.state === "NOT_FOUND" ? r.why : r.closed ? "Payments are not switched on yet, so there is no plan to manage. Nothing was changed." : "Plan management is not available just now. Please try again later, or write to almiworld@almiworld.com." }), undefined, PRIVATE);
      }
      /* unsubscribe: a page with one button (a mail client's link check never unsubscribes anyone); POST — and List-Unsubscribe-Post — does it */
      if (u.pathname === "/unsubscribe") {
        const t = u.searchParams.get("t") ?? "";
        if (req.method === "GET") return send(200, P.unsubscribe({ token: t }), undefined, PRIVATE);
        if (req.method === "POST") { const done = await store.unsubscribe(t); return send(done ? 200 : 404, P.unsubscribe({ token: t, done }), undefined, PRIVATE); }
      }
      /* the free test — the email is optional and asked for only while sending works (RR-302 decision 2; RR-303 B) */
      if (req.method === "POST" && u.pathname === "/free-test") {
        const f = formOf(body, req.headers["content-type"]);
        const back = f.back === "/" ? "/" : "/free-test";
        const page = (o) => (back === "/" ? P.home({ emailOn: emailOn(), ...o }) : P.freeTest({ emailOn: emailOn(), ...o }));
        const values = { url: typeof f.url === "string" ? f.url.slice(0, 300) : "", email: typeof f.email === "string" ? f.email.slice(0, 254) : "" };
        const email = emailOn() ? f.email : "";
        const marketing = f.marketing === true || f.marketing === "yes";
        const pre = checkLead({ email, marketing });
        if (!pre.ok) return send(400, page({ error: pre.why, values }));
        const t = await testableUrl(f.url);
        if (!t.ok) return send(400, page({ error: t.why, values }));
        const take = await limiter.take(who(req));
        if (!take.ok) return send(429, page({ error: take.why, values }));
        const result = await freeTest({ url: t.url });
        await store.addTest(testRecord(result));
        const lead = checkLead({ email, marketing, testedUrl: result.url, score: result.score }).lead;
        let emailed = null;
        if (lead) {
          await store.addLead(lead);
          const unsubscribeUrl = `${originOf(req)}/unsubscribe?t=${encodeURIComponent(lead.unsubToken)}`;
          const m = reportEmail({ result, unsubscribeUrl });
          const s = await sendEmail({ to: lead.email, ...m, unsubscribeUrl, env, fetchImpl });
          await store.markEmailed(lead.email, lead.testedUrl, s.sent);
          emailed = { to: lead.email, sent: s.sent };
        }
        return send(200, page({ result, left: take.left, emailed, values: { url: values.url } }));
      }
      /* the private admin */
      const token = cookie(req, "av_admin");
      const me = await admin.who(token);
      if (u.pathname === "/admin" && req.method === "GET") {
        if (!me) return send(200, P.adminLogin(env[KEY_NAMES.adminHash] ? null : "The admin page is off: no admin password is configured."), undefined, PRIVATE);
        const [tests, leads] = [await store.listTests(), await store.listLeads()];
        return send(200, P.adminOverview({ tests, leads, counts: dailyCounts(tests, leads), storeKind: store.kind, who: me }), undefined, PRIVATE);
      }
      if (u.pathname === "/admin/login" && req.method === "POST") {
        const f = formOf(body, req.headers["content-type"]);
        const r = await admin.login(f.email, f.password, env[KEY_NAMES.adminHash], who(req));
        if (!r.ok) return send(401, P.adminLogin(r.why), undefined, PRIVATE);
        const secure = env.VERCEL || (req.headers["x-forwarded-proto"] ?? "") === "https" ? "; Secure" : "";
        return send(303, "", "text/plain", { location: "/admin", "set-cookie": `av_admin=${r.token}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=28800${secure}`, ...PRIVATE });
      }
      if (u.pathname === "/admin/logout" && req.method === "POST") { await admin.logout(token); return send(303, "", "text/plain", { location: "/admin", "set-cookie": "av_admin=; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=0", ...PRIVATE }); }
      /* RR-304: the owner licence — registered by pasting its text (verified with the site's own signing key), revoked from Licences */
      if (req.method === "POST" && (u.pathname === "/admin/licences/owner" || u.pathname === "/admin/licences/revoke")) {
        if (!me) return send(303, "", "text/plain", { location: "/admin", ...PRIVATE });
        const f = formOf(body, req.headers["content-type"]);
        const accounts = await store.accounts();
        const sales = (code, note) => send(code, P.adminSales({ who: me, licences: accounts, connected: Boolean(env.STRIPE_SECRET_KEY), refOf, note }), undefined, PRIVATE);
        if (u.pathname === "/admin/licences/owner") {
          const pem = signingPem();
          const signed = readOwnerLicenceText(f.licence);
          if (!pem) return sales(503, `The owner licence cannot be checked: the licence signing key is not configured (${SITE_KEY_NAMES.signingKey}).`);
          if (!signed || !isOwnerLicence(signed.licence) || !verifyLicence(signed, createPublicKey(createPrivateKey(pem)).export({ type: "spki", format: "pem" }))) return sales(400, "That owner licence was not made with this site's signing key, or the text is incomplete. Nothing was saved.");
          accounts[signed.licence.account] = ownerRecord(signed.licence);
        } else {
          const account = Object.keys(accounts).find((k) => refOf(k) === f.ref);
          if (!account || accounts[account].kind !== OWNER.kind) return sales(400, "No such owner licence. Nothing was changed.");
          accounts[account] = { ...accounts[account], status: "REVOKED" };
        }
        await store.saveAccounts(accounts);
        return send(303, "", "text/plain", { location: "/admin/sales", ...PRIVATE });
      }
      if (u.pathname.startsWith("/admin/") && req.method === "GET") {
        if (!me) return send(303, "", "text/plain", { location: "/admin", ...PRIVATE });
        if (u.pathname === "/admin/leads") return send(200, P.adminLeads({ leads: await store.listLeads(), storeKind: store.kind, who: me }), undefined, PRIVATE);
        if (u.pathname === "/admin/leads.csv") return send(200, leadsCsv(await store.listLeads()), "text/csv; charset=utf-8", { "content-disposition": `attachment; filename="visibility-leads-${new Date(now()).toISOString().slice(0, 10)}.csv"`, ...PRIVATE });
        if (u.pathname === "/admin/tests") return send(200, P.adminTests({ tests: await store.listTests(), storeKind: store.kind, who: me }), undefined, PRIVATE);
        if (u.pathname === "/admin/sales") return send(200, P.adminSales({ who: me, licences: await store.accounts(), connected: Boolean(env.STRIPE_SECRET_KEY), refOf }), undefined, PRIVATE);
      }
      send(404, P.frame({ path: u.pathname, title: "Not found — AlmiVisibility", description: "This page does not exist.", body: `<section class="page"><div class="wrap"><h1>Page not found</h1><p><a class="pill" href="/">Home</a></p></div></section>`, noindex: true }));
    } catch { send(500, "Something went wrong.", "text/plain"); }
  };
}

/** RR-325 C: the owner's legal pages with each [FILL] marked — on this computer only, never on Vercel */
const legalPreview = (env) => env.VISIBILITY_LEGAL_PREVIEW === "1" && !env.VERCEL;

/**
 * 🔴 RR-325 · PUBLIC-LITE (the owner's GREEN for almivisibility.almiworld.com, this site only, until sales open). A handler of its own: it
 * serves the home page (the free score first), the owner's Privacy Policy and Terms of Service (each only when it has no [FILL]), the
 * logo, the icon, robots.txt, the sitemap and the page script (/score.js) — the free score, and (RR-326) the free keyword finder, the
 * owner's own page and the collector's cron. EVERYTHING ELSE IS "NOT FOUND": download, pricing, buy and checkout, the licence check,
 * updates, unsubscribe, admin and every /api route. No Stripe, Resend, licence or admin code runs: none of their keys is even opened here.
 *   THE FREE SCORE: only while the limit store is connected (limits.mjs — the owner adds it in Vercel); a one-use form ticket and a hidden
 *   field (bot protection); per visitor per day and one daily total for the site; only public http(s) sites — every request of a check
 *   (robots.txt and each page) is checked again for a public address; robots.txt obeyed; at most 10 pages; a 30-second time limit. The
 *   result is shown on screen only — nothing about the visitor or the result is stored.
 *   RR-326 THE KEYWORD FINDER: only while Google (kw-google.mjs), the store and the database (kw-store.mjs) are all connected — else the
 *   page says "coming soon"; the same ticket and hidden field; per visitor per day and a daily total of searches, and Google's own
 *   operations capped (kw-google.mjs QUOTA); the words searched and Google's figures are stored — no visitor, no address.
 *   RR-326 THE OWNER (owner.mjs): no limit on his own browser; his page /owner (counts, Google's operations used, the seed list).
 *   RR-326 THE COLLECTOR: /cron/keywords, only with Vercel's own `Authorization: Bearer <CRON_SECRET>` (kw-collector.mjs).
 */
function createLiteApp({ env, now, fetchImpl, freeTest, kvFetch, resolve, adsFetch, kwStore, sleep, cfStore, cfReader, cfAi, gscFetch = null, salesHandle = null, stripeFetch = null }) {
  const sales = Boolean(salesHandle); // RR-338
  const total = Number(env.FREE_SCORE_DAILY_TOTAL) > 0 ? Math.floor(Number(env.FREE_SCORE_DAILY_TOTAL)) : LITE_LIMITS.siteTotalPerDay; // the owner may set the site's daily total
  const st = storeOf(env), kv = st ? kvStore(st, { fetchImpl: kvFetch }) : null, limits = kv ? liteLimits({ kv, now, siteTotal: total }) : null;
  const finderLimits = kv ? liteLimits({ kv, now, perVisitor: FINDER.perVisitorPerDay, siteTotal: FINDER.siteSearchesPerDay, counts: FINDER_COUNTS }) : null;
  const ads = kv ? siteAds({ env, kv, fetchImpl: adsFetch, now, ...(sleep ? { sleep } : {}) }) : null;
  const db = kwStore ?? (dbUrlOf(env) ? pgStore({ url: dbUrlOf(env) }) : null);
  const finderOn = () => Boolean(kv && db && ads && ads.configured());
  /* RR-328 B · the country facts: the same database; the official reader (robots obeyed, public addresses only, paced) */
  const cf = cfStore ?? (dbUrlOf(env) ? cfPgStore({ url: dbUrlOf(env) }) : null);
  /* RR-329 A: both collectors follow the owner's queue (his order from /owner, else the default) */
  /* RR-330: an official site that leaves out a certificate of its chain is read as a browser reads it (chain-fetch.mjs) — verification kept */
  const cfFetch = chainFetch(fetchImpl, { allowed: async (url) => (await testableUrl(url, resolve ? { resolve } : {})).ok });
  const cfRun = async (o = {}) => runCountryFacts({ store: cf, kwStore: db, kv, env, reader: cfReader ?? officialReader({ fetchImpl: cfFetch, on: new Date(now()).toISOString() }), ...(cfAi ? { ai: cfAi } : {}), now, queue: await queueNow(kv), youtubeFetch: fetchImpl, ...o });
  const kwRun = async (o = {}) => runCollector({ store: db, ads, kv, now, queue: await queueNow(kv), limitMb: storageLimitOf(env), ...o });
  /* RR-329 B/E: one product's grid at a time (light on a phone); AlmiOET keeps its five-part grid */
  const countriesPage = async (o = {}) => {
    const d = new Date(now()).toISOString().slice(0, 10), product = FACT_PRODUCTS.includes(o.product) ? o.product : "oet", all = await cf.facts(), sel = o.country && COUNTRIES.includes(o.country) ? o.country : null;
    const facts = all.filter((f) => (f.product ?? "oet") === product), order = (await queueNow(kv)).countries;
    let last = null; if (kv) { try { const [l] = await kv.run([["GET", "av:cf:last"]]); last = l ? JSON.parse(l) : null; } catch { last = null; } }
    /* RR-335: the collector's per-template counts (RR-334 wrote them; no page read them) — today and yesterday */
    const yesterday = new Date(Date.parse(`${d}T00:00:00Z`) - 864e5).toISOString().slice(0, 10);
    let templates = null; if (kv) { try { const [a, b] = await kv.run([["GET", `av:cf:tpl:${d}`], ["GET", `av:cf:tpl:${yesterday}`]]); templates = { today: a ? JSON.parse(a) : {}, yesterday: b ? JSON.parse(b) : {} }; } catch { templates = null; } }
    const history = {}; if (sel) for (const f of facts.filter((x) => x.country === sel)) history[f.key] = await cf.history(f.key);
    /* RR-328 addition (rule R1): each country's body search — "searching" with the names already tried */
    const task = product === "oet" ? "councils" : `${product}:facts`;
    const search = Object.fromEntries([...(await cf.tasks()).entries()].filter(([k]) => k.endsWith(`|${task}`)).map(([k, t]) => [k.slice(0, -(task.length + 1)), { state: t.state, day: t.day, note: t.note, tried: t.tried ?? {} }]));
    const template = PRODUCT_FACTS[product], coverage = product === "oet" ? coverageOf(facts, { countries: order }) : productCoverageOf(product, all, { countries: order, template });
    /* RR-330: each country's questions (asked, groups, a page may carry — from its last questions run), the first 15's progress and ETA */
    const tasks = await cf.tasks(), qstats = product === "oet" ? Object.fromEntries([...tasks.entries()].filter(([k]) => k.endsWith("|questions")).map(([k, t]) => [k.slice(0, -10), t.tried?.stats ?? null]).filter(([, s]) => s)) : {};
    const asked = sel && product === "oet" ? (await cf.questions({ product: "oet", country: sel })).slice(0, 12) : [];
    let first15 = null;
    if (product === "oet") {
      const cs = order.slice(0, 15), rows = coverage.rows.filter((r) => cs.includes(r.country)), filled = rows.reduce((a, r) => a + Object.values(r.parts).filter((p) => p.filled).length, 0);
      /* RR-332: "done" = the five parts filled — the same meaning as /owner's queue line, the table and the page counter */
      const done = doneIn(all, { templates: PRODUCT_FACTS }), left = cs.filter((c) => !done("oet", c)).length, caps = capsOf(env);
      let cost = null; try { const [v] = kv ? await kv.run([["GET", costKey("oet")]]) : [null]; cost = v ? JSON.parse(v) : null; } catch { cost = null; }
      const usd = cost && cost.n >= 3 ? cost.usd : CF_COLLECTOR.defaultCost.oet, reads = cost && cost.n >= 3 && cost.reads !== undefined ? cost.reads : CF_COLLECTOR.defaultReads.oet;
      const days = left ? Math.max(Math.ceil((left * usd) / Math.max(0.01, caps.aiUsd * 0.75)), Math.ceil((left * reads) / Math.max(1, caps.reads * 0.75))) : 0;
      first15 = { countries: cs.length, percent: Math.round((100 * filled) / Math.max(1, cs.length * 5)), byPart: Object.fromEntries(["fee", "questions", "centres", "councils", "rules"].map((p) => [p, rows.filter((r) => r.parts[p].filled).length])),
        councils: rows.reduce((a, r) => a + Object.values(r.councils).filter(Boolean).length, 0), councilPairs: rows.length * CF_PROFESSIONS.length, left, eta: left ? new Date(Date.parse(`${d}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10) : null, measured: Boolean(cost && cost.n >= 3) };
    }
    const taskObj = Object.fromEntries(tasks.entries()), summary = await summaryOf({ all, first15 });
    return P.ownerCountries({ coverage, facts, country: sel, history, last, templates, aiOn: aiConfigured(env), caps: capsOf(env), spend: await cf.spend(d), order, search, product, products: FACT_PRODUCTS.map((p) => ({ key: p, name: productName(p) })), template, parts: template.parts.map((k) => ({ key: k, name: PART_INFO[k]?.name ?? k })), professions: CF_PROFESSIONS, qstats, asked, first15, tasks: taskObj, today: d, dated: Boolean(DATE_TESTS[product] || NO_DATES[product]), summary, ...o, country: sel, product });
  };
  const LOGO = readFileSync(join(HERE, "..", "desktop", "brand", "almiworld-logo.png")), ICON = readFileSync(join(HERE, "..", "installer", "almiworld.ico"));
  const preview = legalPreview(env), dns = resolve ? { resolve } : {};
  const who = (req) => String(req.headers["x-real-ip"] ?? "").trim() || String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const owner = (req) => isOwner(req, env, now());
  /* each form gets its own one-use ticket */
  const home = async (req, o = {}) => {
    let ticket = null, finderTicket = null;
    if (limits) { try { ticket = await limits.ticket(); } catch { ticket = null; } }
    if (finderOn()) { try { finderTicket = await limits.ticket(); } catch { finderTicket = null; } }
    return P.liteHome({ sales, scoreOn: Boolean(ticket), ticket, owner: owner(req), ...o, finder: { on: Boolean(finderTicket), ticket: finderTicket, ...(o.finder ?? {}) } });
  };
  const published = () => [...["/privacy", "/terms"].filter((p) => (p === "/privacy" ? P.privacy() : P.terms()) !== null), ...(sales ? ["/pricing", "/download"] : [])];
  const groupNames = async () => { try { return (await currentGroups(db)).groups; } catch { return []; } };
  /* RR-331 · the one-line summary of the other collectors on each owner page (keywords today, first 15, questions, test dates, Search Console) */
  const summaryOf = async ({ all = null, first15 = null } = {}) => {
    const d = new Date(now()).toISOString().slice(0, 10), s = { keywordsToday: 0, first15: first15?.percent ?? null, questionGroups: 0, datesFound: 0, gsc: null };
    try { const [k] = kv ? await daysOf(kv, "keywords", d, 1) : [null]; s.keywordsToday = k?.progress ?? 0; } catch { /* 0 */ }
    try { const facts = all ?? (cf ? await cf.facts() : []); s.questionGroups = facts.filter((f) => f.part === "questions").length; s.datesFound = facts.filter((f) => f.part === "dates" && (f.value?.dates ?? []).some((x) => x.date >= d)).length;
      if (s.first15 === null && cf) { const order = (await queueNow(kv)).countries.slice(0, 15), cov = coverageOf(facts.filter((f) => (f.product ?? "oet") === "oet"), { countries: order }); s.first15 = Math.round((100 * cov.rows.reduce((a, r) => a + Object.values(r.parts).filter((p) => p.filled).length, 0)) / Math.max(1, order.length * 5)); } } catch { /* the counts stay 0 */ }
    try { const [g] = kv ? await kv.run([["GET", "av:gsc:last"]]) : [null]; const x = g ? JSON.parse(g) : null; s.gsc = x ? (x.ok ? `read ${x.at.slice(0, 10)} — ${x.sites} sites, ${x.questions} questions, ${x.keywords} keywords` : x.why) : "not read yet"; } catch { s.gsc = null; }
    return s;
  };
  const ownerPage = async (o = {}) => {
    const d = new Date(now()).toISOString().slice(0, 10);
    let counts = null, usage = null, last = null, list = null, dbError = null;
    if (db) { try { counts = await db.counts(d); list = await db.seedList(); } catch { dbError = "The keyword database could not be read just now."; } }
    if (ads) { try { usage = await ads.usage(); } catch { usage = null; } }
    if (kv) { try { const [l] = await kv.run([["GET", "av:collector:last"]]); last = l ? JSON.parse(l) : null; } catch { last = null; } }
    /* RR-329: what matters first on his phone — red lines, this week, progress, ETA, spend, the database */
    let status = null; try { status = await ownerStatus({ kv, db, cf, env, now }); } catch { status = null; }
    return P.ownerPage({ launch: launchVarsOf(env), /* RR-337 */ licenceKey: publicKeyState(env), /* RR-327 */ connected: Boolean(ads?.configured()), missing: ads ? ads.missing() : ["KV_REST_API_URL", "KV_REST_API_TOKEN"], dbOn: Boolean(db), dbError, counts, usage, last, groups: db ? await groupNames() : [], seedText: list?.text ?? DEFAULT_SEEDS, seedAt: list?.at ?? null, status, names: PRODUCT_NAMES, summary: await summaryOf(), ...o });
  };
  return async function handle(req, res) {
    const send = (code, body, type = "text/html; charset=utf-8", extra = {}) => { res.writeHead(code, { "content-type": type, ...SECURITY, ...extra }); res.end(body); };
    /* RR-326 I: the body as BYTES (a UTF-16 upload must not be decoded as text); the owner's file upload alone may be larger */
    /* RR-329 D: the owner's "Add what I know" may carry one photo (PHOTO.maxBytes) */
    const path0 = String(req.url ?? "").split("?")[0], big = req.method === "POST" && ["/owner/import", "/owner/countries/know"].includes(path0) && owner(req), max = big ? (path0 === "/owner/import" ? IMPORT.maxBodyBytes : PHOTO.maxBytes + 64000) : sales && path0 === "/api/webhooks/stripe" ? 200000 : 64000;
    const chunks = []; let size = 0;
    for await (const c of req) { const b = Buffer.isBuffer(c) ? c : Buffer.from(c); size += b.length; if (size > max) return send(413, "Too large", "text/plain"); chunks.push(b); }
    const raw = Buffer.concat(chunks), body = raw.toString("utf8");
    try {
      const u = new URL(req.url, "http://127.0.0.1");
      if (req.method === "POST" && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(403, "Forbidden", "text/plain");
      const form = () => (/json/.test(req.headers["content-type"] ?? "") ? JSON.parse(body || "{}") : Object.fromEntries(new URLSearchParams(body)));
      if (req.method === "GET" && u.pathname === "/") return send(200, await home(req), undefined, { "cache-control": "no-store" });
      if (req.method === "GET" && (u.pathname === "/privacy" || u.pathname === "/terms")) { const html = u.pathname === "/privacy" ? P.privacy({ preview, lite: true }) : P.terms({ preview, lite: true }); return html === null ? send(404, P.notFound(u.pathname, { lite: true })) : send(200, html); }
      if (req.method === "GET" && u.pathname === "/brand/almiworld-logo.png") return send(200, LOGO, "image/png", { "cache-control": "public, max-age=86400" });
      if (req.method === "GET" && u.pathname === "/favicon.ico") return send(200, ICON, "image/x-icon", { "cache-control": "public, max-age=86400" });
      if (req.method === "GET" && u.pathname === "/score.js") return send(200, P.SCORE_JS, "text/javascript; charset=utf-8", { "cache-control": "public, max-age=3600" }); // RR-325: the moving meter
      if (req.method === "GET" && u.pathname === "/robots.txt") return send(200, `User-agent: *\nAllow: /\nDisallow: /score\nDisallow: /keywords\nDisallow: /owner\nDisallow: /cron\nDisallow: /v1\n\nSitemap: ${P.ORIGIN}/sitemap.xml\n`, "text/plain");
      if (req.method === "GET" && u.pathname === "/sitemap.xml") return send(200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", ...published()].map((p) => `<url><loc>${P.ORIGIN}${p}</loc></url>`).join("")}</urlset>\n`, "application/xml");
      if (req.method === "POST" && u.pathname === "/score") {
        const f = form();
        const values = { url: typeof f.url === "string" ? f.url.slice(0, 300) : "" };
        const again = async (code, error) => send(code, await home(req, { error, values }), undefined, { "cache-control": "no-store" });
        if (!limits) return again(503, "The free score is being switched on. Please come back soon.");
        if (f.homepage) return again(400, "Please use the form on this page.");
        const tk = await limits.useTicket(f.ticket); if (!tk.ok) return again(400, tk.why);
        const t = await testableUrl(f.url, dns); if (!t.ok) return again(400, t.why);
        const take = owner(req) ? { ok: true, left: null } : await limits.take(who(req)); if (!take.ok) return again(429, take.why); // RR-326 D: the owner has no limit
        const result = await freeTest({ url: t.url, fetchImpl: publicOnly(fetchImpl, dns), deadlineMs: LITE_LIMITS.checkDeadlineMs, linksAndSecurity: true });
        return send(200, await home(req, { result, left: take.left, values }), undefined, { "cache-control": "no-store" });
      }
      /* RR-326 C · the keyword finder */
      if (req.method === "POST" && u.pathname === "/keywords") {
        const f = form(), me = owner(req);
        const values = { q: typeof f.q === "string" ? f.q.slice(0, 120) : "", location: typeof f.location === "string" ? f.location.slice(0, 3).toUpperCase() : "ALL" };
        const again = async (code, error) => send(code, await home(req, { finder: { error, values } }), undefined, { "cache-control": "no-store" });
        if (!finderOn()) return again(503, "The keyword finder is being switched on. Please come back soon.");
        if (f.homepage) return again(400, "Please use the form on this page.");
        const tk = await limits.useTicket(f.ticket); if (!tk.ok) return again(400, tk.why);
        const qq = finderQuery(values.q); if (!qq.ok) return again(400, qq.why);
        const take = me ? { ok: true, left: null } : await finderLimits.take(who(req)); if (!take.ok) return again(429, take.why);
        const result = await findKeywords({ q: qq.q, location: values.location, store: db, ads, purpose: me ? "owner" : "finder", now });
        if (!result.ok) return again(result.code === "OUR_DAILY_LIMIT" ? 429 : 503, result.why);
        return send(200, await home(req, { finder: { result, left: take.left, values } }), undefined, { "cache-control": "no-store" });
      }
      if (req.method === "GET" && u.pathname === "/keywords.csv") {
        /* from the database only — a download never asks Google */
        if (!db) return send(404, P.notFound(u.pathname, { lite: true }));
        const qq = finderQuery(u.searchParams.get("q")), loc = locationOf(u.searchParams.get("location") ?? "ALL");
        if (!qq.ok || !loc) return send(404, P.notFound(u.pathname, { lite: true }));
        const d = new Date(now()).toISOString().slice(0, 10), since = new Date(Date.parse(`${d}T00:00:00Z`) - FINDER.reuseDays * 86400000).toISOString().slice(0, 10);
        let found = await db.findFetch({ seedKey: `q:${qq.q}`, location: loc.code, language: FINDER.language, since }), source = null;
        if (!found) { found = await db.fileKeywords({ phrases: [qq.q], location: loc.code, language: FINDER.language }).catch(() => null); source = found ? "file" : null; } // RR-326 I: the owner's files
        if (!found) return send(404, P.notFound(u.pathname, { lite: true }));
        const result = { rows: found.rows.map((r) => ({ ...r, group: groupOf(r.keyword) })), locationName: loc.name, language: LANGUAGES[FINDER.language].name, period: found.period, source };
        return send(200, csvOf(result), "text/csv; charset=utf-8", { "content-disposition": `attachment; filename="keywords-${qq.q.replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "search"}-${loc.code.toLowerCase()}.csv"`, "cache-control": "no-store", "x-robots-tag": "noindex" });
      }
      /* RR-326 B + D · the owner's own page — only when he has set his key in Vercel */
      if (u.pathname.startsWith("/owner")) {
        const priv = { ...PRIVATE };
        /* RR-326 fix: the page says WHY it is off (the key missing, or too short to be accepted) instead of a bare "not found" — never a
         * sign-in form while the key is not usable */
        if (!ownerOn(env) || !kv) return u.pathname === "/owner" && req.method === "GET" ? send(503, P.ownerOff(!kv ? "store" : ownerState(env)), undefined, priv) : send(404, P.notFound(u.pathname, { lite: true }), undefined, priv);
        if (req.method === "GET" && u.pathname === "/owner") return send(200, owner(req) ? await ownerPage({ moved: u.searchParams.get("moved") }) : P.ownerSignIn(), undefined, priv);
        if (req.method === "POST" && u.pathname === "/owner/sign-in") {
          const r = await ownerSignIn({ typed: form().key, who: who(req), env, kv, now: now() });
          if (!r.ok) return send(r.why.startsWith("Too many") ? 429 : 403, P.ownerSignIn(r.why), undefined, priv);
          return send(303, "", "text/plain", { ...priv, location: "/owner", "set-cookie": ownerCookie(env, now()) });
        }
        if (req.method === "POST" && u.pathname === "/owner/sign-out") return send(303, "", "text/plain", { ...priv, location: "/", "set-cookie": ownerSignOut() });
        if (!owner(req)) return send(403, P.ownerSignIn(), undefined, priv);
        if (req.method === "POST" && u.pathname === "/owner/seeds") {
          if (!db) return send(503, await ownerPage({ message: "The keyword database is not connected." }), undefined, priv);
          const text = String(form().seeds ?? ""), p = parseSeeds(text);
          if (!p.ok) return send(400, await ownerPage({ message: `Not saved — ${p.why}.`, seedDraft: text }), undefined, priv);
          await db.setSeedList(text, new Date(now()).toISOString());
          return send(200, await ownerPage({ message: `Saved: ${p.groups.length} groups.` }), undefined, priv);
        }
        /* RR-326 I · the owner's Keyword Planner files → the live keyword database (kw-import.mjs) */
        if (req.method === "POST" && u.pathname === "/owner/import") {
          if (!db) return send(503, await ownerPage({ message: "The keyword database is not connected." }), undefined, priv);
          const mp = parseMultipart(raw, req.headers["content-type"]);
          const uploads = mp ? Object.keys(mp.files).filter((k) => /^file\d+$/.test(k)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4))).map((k) => ({ ...mp.files[k], country: mp.fields[`country${k.slice(4)}`] ?? "", date: mp.fields[`date${k.slice(4)}`] ?? "" })) : [];
          if (!uploads.length) return send(400, await ownerPage({ message: "Choose at least one Keyword Planner file." }), undefined, priv);
          const r = await importFiles({ uploads, store: db, groups: await groupNames(), now });
          return send(200, await ownerPage({ imported: r }), undefined, priv);
        }
        /* RR-326 H · the owner's Google access check: Google's own reason, the accounts this sign-in reaches (ids only) */
        if (req.method === "POST" && u.pathname === "/owner/check-google") {
          if (!ads?.configured()) return send(503, await ownerPage({ message: "Google is not connected yet." }), undefined, priv);
          return send(200, await ownerPage({ check: await ads.check() }), undefined, priv);
        }
        if (req.method === "POST" && u.pathname === "/owner/collect") {
          if (!finderOn()) return send(503, await ownerPage({ message: "Google, the store and the database must all be connected first." }), undefined, priv);
          const r = await kwRun({ budgetMs: 50000 });
          return send(200, await ownerPage({ message: r.ok ? `This run: ${r.saved} requests saved (${r.keywords} keywords)${r.stoppedBy ? ` — ${r.why}` : ""}.` : r.why }), undefined, priv);
        }
        /* RR-329 A · the queue: one product or country one place up (one tap) — both collectors follow it from their next run */
        if (req.method === "POST" && u.pathname === "/owner/queue") {
          const f = form(), q = await queueNow(kv), kind = f.kind === "country" ? "countries" : "products", item = String(f.item ?? "");
          if (!q[kind].includes(item)) return send(400, await ownerPage({ message: "Not in the queue. Nothing was changed." }), undefined, priv);
          await saveQueue(kv, { ...q, [kind]: moveUp(q[kind], item) });
          return send(303, "", "text/plain", { ...priv, location: `/owner?moved=${encodeURIComponent(item)}#queue` });
        }
        /* RR-333 D · the owner's own questions about AlmiVisibility (no country: "*") */
        if (req.method === "POST" && u.pathname === "/owner/visibility/questions") {
          const lines = ownerLines(String(form().text ?? "").slice(0, 20000));
          if (!lines.length || !cf) return send(400, await ownerPage({ message: "Paste at least one question (one a line). Nothing was saved." }), undefined, priv);
          const r = await cf.putQuestions({ product: "visibility", country: "*", source: "owner", items: lines.map((text) => ({ text })), at: new Date(now()).toISOString() });
          return send(200, await ownerPage({ message: `Saved ${lines.length} AlmiVisibility question${lines.length === 1 ? "" : "s"} (${r.added} new).` }), undefined, priv);
        }
        /* RR-341 · "Create Manage-plan portal": AlmiVisibility's OWN Stripe portal configuration, made with the key and the 4 prices already in
         * Vercel (the owner types nothing); once only — a second press finds the first. The shared default portal is never touched. */
        if (req.method === "POST" && u.pathname === "/owner/portal") {
          const r = await ensurePortalConfig({ env, fetchImpl: stripeFetch ?? fetch });
          return send(r.ok ? 200 : 503, await ownerPage({ message: `Manage-plan portal: ${r.line}` }), undefined, priv);
        }
        /* RR-332 · the owner's own Search Console read, now (the weekly cron reads it too) — the answer in one line */
        if (req.method === "POST" && u.pathname === "/owner/search-console") {
          const r = await runSearchConsole({ env, kv, kwStore: db, cfStore: cf, fetchImpl: gscFetch ?? fetchImpl, now, force: true });
          return send(200, await ownerPage({ message: r.ok ? `Search Console read: ${r.sites} almiworld.com site${r.sites === 1 ? "" : "s"}, ${r.rows.toLocaleString("en-US")} rows — ${r.questions} questions, ${r.keywords} keywords (${r.period}).` : `Search Console: ${r.why}` }), undefined, priv);
        }
        /* RR-334 · the article drafts: the owner's one-tap word (nothing is published here) */
        if (u.pathname.startsWith("/owner/articles")) {
          if (!cf?.articles) return send(503, await ownerPage({ message: "The database is not connected (DATABASE_URL) — the articles need it." }), undefined, priv);
          const page = async (message = null) => P.ownerArticles({ articles: await cf.articles(), html: articleHtml, message });
          if (req.method === "GET" && u.pathname === "/owner/articles") return send(200, await page(), undefined, priv);
          if (req.method === "POST" && u.pathname === "/owner/articles/decide") {
            const f = form();
            if (!["approve", "reject", "reopen"].includes(f.action)) return send(400, await page("No such action. Nothing was changed."), undefined, priv);
            const r = await cf.decideArticle(String(f.id ?? ""), { action: f.action, at: new Date(now()).toISOString() });
            return send(r.ok ? 200 : 400, await page(r.ok ? `Saved: ${r.status}.` : r.why), undefined, priv);
          }
        }
        /* RR-328 B · the owner's country facts: the grid, one short run, and his word on a fact (his edit wins) */
        if (u.pathname.startsWith("/owner/countries")) {
          if (!cf) return send(503, await ownerPage({ message: "The database is not connected (DATABASE_URL) — country facts need it." }), undefined, priv);
          if (req.method === "GET" && u.pathname === "/owner/countries") return send(200, await countriesPage({ country: u.searchParams.get("c"), product: u.searchParams.get("p") }), undefined, priv);
          /* RR-329 D · "Add what I know": the owner's own fact (text, an optional link, an optional photo) — stored "owner", dated, shown first */
          if (req.method === "POST" && u.pathname === "/owner/countries/know") {
            const mp = /multipart\/form-data/.test(req.headers["content-type"] ?? "") ? parseMultipart(raw, req.headers["content-type"]) : null, f = mp ? mp.fields : form();
            const country = String(f.country ?? ""), product = FACT_PRODUCTS.includes(f.product) ? f.product : "oet", part = String(f.part ?? ""), text = String(f.text ?? "").trim().slice(0, 2000), link = String(f.link ?? "").trim().slice(0, 400);
            const back = (code, message) => countriesPage({ country: COUNTRIES.includes(country) ? country : null, product, message }).then((h) => send(code, h, undefined, priv));
            if (!COUNTRIES.includes(country) || !(PRODUCT_FACTS[product].parts.includes(part) || part === "other")) return back(400, "Choose a country and what it is about. Nothing was saved.");
            if (text.length < 3) return back(400, "Write what you know (a few words at least). Nothing was saved.");
            if (link && !/^https?:\/\/[^\s]+$/.test(link)) return back(400, "The link must start with https:// — nothing was saved.");
            const profession = product === "oet" && part === "councils" && CF_PROFESSIONS.includes(f.profession) ? f.profession : null;
            const file = mp?.files?.photo, at = new Date(now()).toISOString(); let photo = null;
            if (file && file.bytes?.length) {
              /* the photo's kind from its own first bytes (never from the browser's word) */
              const b = file.bytes; file.type = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? "image/jpeg" : b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? "image/png" : b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" ? "image/webp" : null;
              if (file.bytes.length > PHOTO.maxBytes || !PHOTO.types.includes(file.type)) return back(400, `The photo must be a JPEG, PNG or WebP of at most ${Math.round(PHOTO.maxBytes / 1e6 * 10) / 10} MB. Nothing was saved.`);
              photo = randomBytes(12).toString("hex"); await cf.putPhoto({ id: photo, country, type: file.type, bytes: file.bytes, at });
            }
            const id = randomBytes(6).toString("hex"), key = product === "oet" ? `own|${country}|${part}|${id}` : `${product}:own|${country}|${part}|${id}`;
            await cf.supply({ key, product, country, profession, part, kind: "owner", value: { text, ...(link ? { link } : {}), ...(photo ? { photo } : {}), on: at.slice(0, 10), label: "AlmiWorld's own checked information" }, sourceUrl: link || null, sourceTitle: link ? "the owner's link" : null, readOn: at.slice(0, 10) }, { at });
            return back(200, `Saved as your own information (${at.slice(0, 10)}) — it is shown first, before anything the collector finds.`);
          }
          /* RR-330 · the owner's own questions (what nurses and doctors asked him): one a line, kept as asked, grouped with the rest */
          if (req.method === "POST" && u.pathname === "/owner/countries/questions") {
            const f = form(), country = String(f.country ?? ""), lines = ownerLines(String(f.text ?? "").slice(0, 20000));
            const back = (code, message) => countriesPage({ country: COUNTRIES.includes(country) ? country : null, message }).then((h) => send(code, h, undefined, priv));
            if (!COUNTRIES.includes(country)) return back(400, "Choose a country. Nothing was saved.");
            if (!lines.length) return back(400, "Paste at least one question (one a line). Nothing was saved.");
            const r = await cf.putQuestions({ product: "oet", country, source: "owner", items: lines.map((text) => ({ text })), at: new Date(now()).toISOString() });
            /* his questions are due at once — the collector's next run groups and answers them */
            await cf.setTask(country, "questions", { day: new Date(now()).toISOString().slice(0, 10), state: "retry", note: "the owner added questions — answered on the next run" });
            return back(200, `Saved ${lines.length} question${lines.length === 1 ? "" : "s"} (${r.added} new) for ${country} — grouped and answered on the collector's next run.`);
          }
          if (req.method === "GET" && u.pathname === "/owner/countries/photo") {
            const ph = /^[0-9a-f]{24}$/.test(u.searchParams.get("id") ?? "") ? await cf.photo(u.searchParams.get("id")) : null;
            return ph ? send(200, ph.bytes, ph.type, { ...priv, "cache-control": "private, max-age=86400" }) : send(404, "Not found", "text/plain", priv);
          }
          if (req.method === "POST" && u.pathname === "/owner/countries/run") {
            const r = await cfRun({ budgetMs: 50000 });
            return send(200, await countriesPage({ message: r.ok ? `This run: ${r.saved} facts saved (${r.unconfirmed} unconfirmed), ${r.reads} pages read, $${r.aiUsd.toFixed(2)} of AI${r.stoppedBy ? ` — ${r.why}` : ""}.` : r.why }), undefined, priv);
          }
          if (req.method === "POST" && u.pathname === "/owner/countries/fact") {
            const f = form(), old = await cf.fact(String(f.key ?? ""));
            if (!old || !["approve", "edit", "reject"].includes(f.action)) return send(400, await countriesPage({ message: "No such fact or action. Nothing was changed." }), undefined, priv);
            const t = (k, n = 600) => String(f[k] ?? "").trim().slice(0, n);
            const value = f.action !== "edit" ? null : (old.product ?? "oet") !== "oet" && old.part !== "questions" ? { ...old.value, ...(old.value?.name !== undefined ? { name: t("name", 200), website: t("website", 300) } : {}), text: t("text", 1200) } : old.part === "councils" ? { ...old.value, name: t("name", 200), website: t("website", 300), address: t("address", 400), addressWhy: undefined } : old.part === "questions" ? { ...old.value, question: t("question", 200), answer: t("answer", 1200), label: "written by the owner" } : old.part === "rules" ? { ...old.value, rule: t("rule", 600) } : old.part === "fee" ? { ...old.value, line: t("line", 400) } : { ...old.value, home: t("home", 400) };
            if (value && old.part === "councils" && value.website && !/^https?:\/\//.test(value.website)) return send(400, await countriesPage({ country: old.country, message: "The website must start with https:// — nothing was changed." }), undefined, priv);
            const r = await cf.decide(old.key, { action: f.action, value: value ? JSON.parse(JSON.stringify(value)) : null, at: new Date(now()).toISOString() });
            return send(200, await countriesPage({ country: old.country, message: r.ok ? `Saved: ${r.status}.` : r.why }), undefined, priv);
          }
        }
        return send(404, P.notFound(u.pathname, { lite: true }), undefined, priv);
      }
      /* RR-326 E · the app's keyword service — the licence decides; while sales are not open, the owner's licence only */
      if (u.pathname === "/v1/keywords" || u.pathname === "/v1/keywords/usage") {
        const json = (code, o) => send(code, JSON.stringify(o), "application/json; charset=utf-8", { "cache-control": "no-store", "x-robots-tag": "noindex" });
        if (!kv || !db || !ads) return json(503, { ok: false, why: "The keyword service is not connected yet." });
        const lic = checkLicence({ header: req.headers[LICENCE_HEADER], env, now: now(), salesOpen: false });
        if (!lic.ok) return json(lic.status, { ok: false, why: lic.why });
        if (req.method === "GET" && u.pathname === "/v1/keywords/usage") return json(200, { ok: true, owner: lic.owner, ...(await usageOf({ kv, lic, now: now() })) });
        if (req.method !== "POST" || u.pathname !== "/v1/keywords") return json(405, { ok: false, why: "Not here." });
        if (!ads.configured()) return json(503, { ok: false, why: "The keyword service is not connected to Google yet." });
        const v = form(), s = serviceSeeds(v.seeds); if (!s.ok) return json(400, { ok: false, why: s.why });
        if (!locationOf(v.location ?? "ALL")) return json(400, { ok: false, why: "Choose a country from the list." });
        const t = await takeSearch({ kv, lic, now: now() }); if (!t.ok) return json(429, { ok: false, why: t.why, usage: { used: t.used, limit: lic.limit } });
        const r = await lookupKeywords({ seeds: s.seeds, location: v.location ?? "ALL", store: db, ads, purpose: lic.owner ? "owner" : "app", kind: "app", now });
        if (!r.ok) { await giveBack({ kv, lic, now: now() }); return json(r.code === "OUR_DAILY_LIMIT" ? 429 : 503, { ok: false, why: r.why }); }
        return json(200, { ok: true, seeds: s.seeds, ...r, source: "Google Ads Keyword Planner", usage: { month: new Date(now()).toISOString().slice(0, 7), used: t.used, limit: lic.limit } });
      }
      /* RR-328 C · the app's country facts — the same licence as the keywords (while sales are not open: the owner's only); ONLY facts a page may
       * show (confirmed, or approved/edited by the owner) — never an unconfirmed one */
      if (u.pathname === "/v1/countries/facts") {
        const json = (code, o) => send(code, JSON.stringify(o), "application/json; charset=utf-8", { "cache-control": "no-store", "x-robots-tag": "noindex" });
        if (!cf) return json(503, { ok: false, why: "The country facts are not connected yet." });
        const lic = checkLicence({ header: req.headers[LICENCE_HEADER], env, now: now(), salesOpen: false });
        if (!lic.ok) return json(lic.status, { ok: false, why: lic.why });
        if (req.method !== "GET") return json(405, { ok: false, why: "Not here." });
        const asked = String(u.searchParams.get("countries") ?? "").split(",").map((s) => s.trim()).filter((c) => COUNTRIES.includes(c)).slice(0, 197), want = asked.length ? asked : COUNTRIES;
        const facts = (await cf.facts()).filter((f) => SHOWN.includes(f.status) && want.includes(f.country));
        return json(200, { ok: true, on: new Date(now()).toISOString().slice(0, 10), countries: Object.fromEntries(want.map((c) => [c, countryPacket(c, facts)])), source: "AlmiWorld's country facts — each fact read on its own official page" });
      }
      /* RR-328 B · the country-facts collector — Vercel Cron only (CRON_SECRET), several short runs a day within today's caps */
      const cronAuth = () => { const secret = String(env.CRON_SECRET ?? ""), got = String(req.headers.authorization ?? ""); return secret.length >= 16 && got.length === secret.length + 7 && timingSafeEqual(Buffer.from(got), Buffer.from(`Bearer ${secret}`)); };
      if (req.method === "GET" && u.pathname === "/cron/country-facts") {
        if (!cronAuth()) return send(401, JSON.stringify({ ok: false }), "application/json", { "cache-control": "no-store" });
        if (!cf) return send(200, JSON.stringify({ ok: false, why: "The database is not connected." }), "application/json", { "cache-control": "no-store" });
        return send(200, JSON.stringify(await cfRun()), "application/json", { "cache-control": "no-store" });
      }
      /* RR-331 · the test-dates collector (inside the same daily caps) and our own Search Console (weekly) — Vercel Cron only */
      if (req.method === "GET" && (u.pathname === "/cron/test-dates" || u.pathname === "/cron/search-console")) {
        if (!cronAuth()) return send(401, JSON.stringify({ ok: false }), "application/json", { "cache-control": "no-store" });
        if (!cf) return send(200, JSON.stringify({ ok: false, why: "The database is not connected." }), "application/json", { "cache-control": "no-store" });
        const r = u.pathname === "/cron/test-dates" ? await runTestDates({ store: cf, kv, env, reader: cfReader ?? officialReader({ fetchImpl: cfFetch, on: new Date(now()).toISOString() }), ...(cfAi ? { ai: cfAi } : {}), now, queue: await queueNow(kv) })
          : await runSearchConsole({ env, kv, kwStore: db, cfStore: cf, fetchImpl: gscFetch ?? fetchImpl, now });
        return send(200, JSON.stringify(r), "application/json", { "cache-control": "no-store" });
      }
      /* RR-326 B · the daily collector — Vercel Cron only (its Authorization header carries CRON_SECRET) */
      if (req.method === "GET" && u.pathname === "/cron/keywords") {
        const okAuth = cronAuth();
        if (!okAuth) return send(401, JSON.stringify({ ok: false }), "application/json", { "cache-control": "no-store" });
        if (!finderOn()) return send(200, JSON.stringify({ ok: false, why: "Google, the store or the database is not connected." }), "application/json", { "cache-control": "no-store" });
        const r = await kwRun();
        return send(200, JSON.stringify(r), "application/json", { "cache-control": "no-store" });
      }
      if (sales && isSalesPath(req.method, u.pathname)) return salesHandle(req, res, body); // RR-338: selling, by the full handler
      send(404, P.notFound(u.pathname, { lite: true }));
    } catch { send(503, "The free score is not available just now. Please try again later.", "text/plain"); }
  };
}
