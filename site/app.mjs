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
import { testableUrl, runFreeTest, dailyLimiter } from "./free-test.mjs";
import { checkLead, testRecord, siteStore, adminSessions, dailyCounts, leadsCsv, KEY_NAMES } from "./leads.mjs";
import { reportEmail, sendEmail, sendingOn } from "./email.mjs";
import { createCheckout } from "./billing.mjs";
import { applyEvent, signedLicence, ownerRecord, verifyRouterSignature, verifyStripeSignature, ROUTER_KEY_NAME, KEY_NAMES as LICENCE_KEYS } from "../services/licence/service.mjs";
import { readOwnerLicenceText, isOwnerLicence, verifyLicence, OWNER } from "../desktop/licence.mjs";
import { createHash, createPublicKey, createPrivateKey } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SITE_KEY_NAMES = Object.freeze({ setupUrl: "VISIBILITY_SETUP_URL", updateBase: "VISIBILITY_UPDATE_BASE_URL", signingKey: "LICENCE_SIGNING_KEY" });
const SECURITY = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "SAMEORIGIN", "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; form-action 'self' https://checkout.stripe.com; frame-ancestors 'self'" };
const PRIVATE = { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" };
const httpsUrl = (v) => typeof v === "string" && /^https:\/\//.test(v);

/** Build the handler. `dataDir` holds the LOCAL store (local runs only); `setupFile` is a local Setup the Download button serves. */
export function createApp({ env = process.env, dataDir = join(HERE, "..", ".site-data"), setupFile = null, now = () => Date.now(), fetchImpl = fetch, freeTest = runFreeTest } = {}) {
  const store = siteStore({ env, localDir: dataDir });
  const limiter = dailyLimiter();
  const admin = adminSessions({ env });
  const LOGO = readFileSync(join(HERE, "..", "desktop", "brand", "almiworld-logo.png"));
  const ICON = readFileSync(join(HERE, "..", "installer", "almiworld.ico"));
  const localSetup = () => Boolean(setupFile && existsSync(setupFile));
  const setupAvailable = () => localSetup() || httpsUrl(env[SITE_KEY_NAMES.setupUrl]);
  const emailOn = () => sendingOn(env);
  const PAGES = { "/": () => P.home({ emailOn: emailOn() }), "/free-test": () => P.freeTest({ emailOn: emailOn() }), "/features": P.features, "/pricing": P.pricing, "/download": () => P.download({ setupAvailable: setupAvailable() }), "/privacy": P.privacy, "/terms": P.terms };
  const formOf = (body, type) => (/json/.test(type ?? "") ? JSON.parse(body || "{}") : Object.fromEntries(new URLSearchParams(body)));
  const cookie = (req, name) => (req.headers.cookie ?? "").split(/;\s*/).map((c) => c.split("=")).find(([k]) => k === name)?.[1] ?? null;
  const who = (req) => String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const originOf = (req) => (env.VERCEL ? P.ORIGIN : `http://${req.headers.host}`);
  const signingPem = () => env[SITE_KEY_NAMES.signingKey] ?? (env[LICENCE_KEYS.signingKeyFile] && existsSync(env[LICENCE_KEYS.signingKeyFile]) ? readFileSync(env[LICENCE_KEYS.signingKeyFile], "utf8") : null);
  /* RR-304: an admin row names a licence by a short hash of its key, never the key itself */
  const refOf = (account) => createHash("sha256").update(account).digest("hex").slice(0, 16);

  return async function handle(req, res) {
    const send = (code, body, type = "text/html; charset=utf-8", extra = {}) => { res.writeHead(code, { "content-type": type, ...SECURITY, ...extra }); res.end(body); };
    let body = "";
    for await (const c of req) { body += c; if (body.length > 200000) return send(413, "Too large", "text/plain"); }
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
      if (req.method === "GET" && PAGES[u.pathname]) return send(200, PAGES[u.pathname](u));
      if (req.method === "GET" && u.pathname === "/brand/almiworld-logo.png") return send(200, LOGO, "image/png", { "cache-control": "public, max-age=86400" });
      if (req.method === "GET" && u.pathname === "/favicon.ico") return send(200, ICON, "image/x-icon", { "cache-control": "public, max-age=86400" });
      if (req.method === "GET" && u.pathname === "/robots.txt") return send(200, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /buy/\nDisallow: /unsubscribe\nDisallow: /v1/\n\nSitemap: ${P.ORIGIN}/sitemap.xml\n`, "text/plain");
      if (req.method === "GET" && u.pathname === "/sitemap.xml") return send(200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/free-test", "/features", "/pricing", "/download"].map((p) => `<url><loc>${P.ORIGIN}${p}</loc></url>`).join("")}</urlset>\n`, "application/xml");
      /* the Setup: a local test Setup, or the one on Vercel Blob (its address in VISIBILITY_SETUP_URL) */
      if (req.method === "GET" && u.pathname === "/download/AlmiVisibility-Setup.exe") {
        if (localSetup()) { res.writeHead(200, { "content-type": "application/vnd.microsoft.portable-executable", "content-length": statSync(setupFile).size, "content-disposition": 'attachment; filename="AlmiVisibility-Setup.exe"', ...SECURITY }); return createReadStream(setupFile).pipe(res); }
        if (httpsUrl(env[SITE_KEY_NAMES.setupUrl])) return send(302, "", "text/plain", { location: env[SITE_KEY_NAMES.setupUrl] });
        return send(404, P.download({ setupAvailable: false }));
      }
      /* the app's update channel: the signed manifest and packages on Vercel Blob (VISIBILITY_UPDATE_BASE_URL) */
      if (req.method === "GET" && /^\/updates\/(manifest\.json|packages\/[\w.-]+)$/.test(u.pathname)) {
        if (!httpsUrl(env[SITE_KEY_NAMES.updateBase])) return send(404, JSON.stringify({ refused: "no update channel is configured" }), "application/json");
        return send(302, "", "text/plain", { location: new URL(u.pathname.slice("/updates/".length), env[SITE_KEY_NAMES.updateBase].replace(/\/?$/, "/")).href });
      }
      /* Buy: a Stripe Checkout session for the plan (TEST mode until launch), named for the router — or the page saying it is not connected */
      if (req.method === "POST" && u.pathname === "/api/billing/checkout") {
        const f = formOf(body, req.headers["content-type"]);
        const c = await createCheckout({ plan: f.plan, env, origin: originOf(req), fetchImpl });
        if (!c.ok) return send(c.state === "REFUSED" ? 400 : 503, P.buyNotConnected(f.plan, c.state), undefined, PRIVATE);
        await store.addCheckout({ sessionId: c.sessionId, licenceKey: c.licenceKey, plan: c.plan, at: new Date(now()).toISOString() });
        return send(303, "", "text/plain", { location: c.url, ...PRIVATE });
      }
      if (req.method === "GET" && u.pathname === "/buy/success") {
        const c = await store.checkout(u.searchParams.get("session_id") ?? "");
        return send(c ? 200 : 404, P.buySuccess(c), undefined, PRIVATE);
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
        const take = limiter.take(who(req));
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
      const me = admin.who(token);
      if (u.pathname === "/admin" && req.method === "GET") {
        if (!me) return send(200, P.adminLogin(env[KEY_NAMES.adminHash] ? null : "The admin page is off: no admin password is configured."), undefined, PRIVATE);
        const [tests, leads] = [await store.listTests(), await store.listLeads()];
        return send(200, P.adminOverview({ tests, leads, counts: dailyCounts(tests, leads), storeKind: store.kind, who: me }), undefined, PRIVATE);
      }
      if (u.pathname === "/admin/login" && req.method === "POST") {
        const f = formOf(body, req.headers["content-type"]);
        const r = admin.login(f.email, f.password, env[KEY_NAMES.adminHash], who(req));
        if (!r.ok) return send(401, P.adminLogin(r.why), undefined, PRIVATE);
        const secure = env.VERCEL || (req.headers["x-forwarded-proto"] ?? "") === "https" ? "; Secure" : "";
        return send(303, "", "text/plain", { location: "/admin", "set-cookie": `av_admin=${r.token}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=28800${secure}`, ...PRIVATE });
      }
      if (u.pathname === "/admin/logout" && req.method === "POST") { admin.logout(token); return send(303, "", "text/plain", { location: "/admin", "set-cookie": "av_admin=; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=0", ...PRIVATE }); }
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
