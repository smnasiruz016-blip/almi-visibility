#!/usr/bin/env node
/**
 * RR-300 / RR-302 · the almivisibility.almiworld.com server — RUN LOCALLY ONLY (bound to 127.0.0.1; the live deploy needs the owner's GREEN
 * after he has seen the screenshots). Plain Node, no framework: the pages (site/pages.mjs), the free website test (site/free-test.mjs), the
 * optional email and the test log (site/leads.mjs) and the private admin. robots.txt keeps the admin and the API out of search.
 *   node site/server.mjs [--port=0] [--data=<dir for the local store and run.json>] [--setup=<the Setup .exe the Download button serves>]
 * Keys by NAME only: VISIBILITY_SITE_DATABASE_URL (Neon), SITE_ADMIN_PASSWORD_HASH and ADMIN_EMAILS (the admin), and one checkout link per
 * plan in VISIBILITY_BUY_URL_<PLAN> (the owner's Stripe payment links, when they exist). None is ever printed.
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, createReadStream } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import * as P from "./pages.mjs";
import { testableUrl, runFreeTest, dailyLimiter } from "./free-test.mjs";
import { checkLead, testRecord, siteStore, adminSessions, dailyCounts, leadsCsv, KEY_NAMES } from "./leads.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const DATA = arg("data", join(HERE, "..", ".site-data"));
const SETUP = arg("setup") ? resolve(arg("setup")) : null;
mkdirSync(DATA, { recursive: true });
const store = siteStore({ env: process.env, localDir: DATA });
const limiter = dailyLimiter();
const admin = adminSessions();
const results = new Map(); // a result is shown at its own short id for one hour, then forgotten
const LOGO = readFileSync(join(HERE, "..", "desktop", "brand", "almiworld-logo.png"));
const ICON = readFileSync(join(HERE, "..", "installer", "almiworld.ico"));
const setupAvailable = () => Boolean(SETUP && existsSync(SETUP));
const PAGES = { "/": (u) => P.home(u.searchParams.get("r") && results.has(u.searchParams.get("r")) ? results.get(u.searchParams.get("r")) : {}), "/features": P.features, "/pricing": P.pricing, "/download": () => P.download({ setupAvailable: setupAvailable() }), "/privacy": P.privacy, "/terms": P.terms };
const PLAN_IDS = new Set(P.PLANS.map((p) => p.id));

const formOf = (body, type) => (/json/.test(type ?? "") ? JSON.parse(body || "{}") : Object.fromEntries(new URLSearchParams(body)));
const cookie = (req, name) => (req.headers.cookie ?? "").split(/;\s*/).map((c) => c.split("=")).find(([k]) => k === name)?.[1] ?? null;
const who = (req) => req.socket.remoteAddress ?? "unknown";
const SECURITY = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "SAMEORIGIN", "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'self'" };
const PRIVATE = { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" };

const server = createServer((req, res) => {
  const send = (code, body, type = "text/html; charset=utf-8", extra = {}) => { res.writeHead(code, { "content-type": type, ...SECURITY, ...extra }); res.end(body); };
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 20000) req.destroy(); });
  req.on("end", async () => {
    try {
      const u = new URL(req.url, "http://127.0.0.1");
      /* a form from another site is refused (the site's own forms only) */
      if (req.method === "POST" && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(403, "Forbidden", "text/plain");
      if (req.method === "GET" && PAGES[u.pathname]) return send(200, PAGES[u.pathname](u));
      if (req.method === "GET" && u.pathname === "/brand/almiworld-logo.png") return send(200, LOGO, "image/png", { "cache-control": "public, max-age=86400" });
      if (req.method === "GET" && u.pathname === "/favicon.ico") return send(200, ICON, "image/x-icon", { "cache-control": "public, max-age=86400" });
      if (req.method === "GET" && u.pathname === "/robots.txt") return send(200, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /buy/\n\nSitemap: ${P.ORIGIN}/sitemap.xml\n`, "text/plain");
      if (req.method === "GET" && u.pathname === "/sitemap.xml") return send(200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/free-test", "/features", "/pricing", "/download"].map((p) => `<url><loc>${P.ORIGIN}${p}</loc></url>`).join("")}</urlset>\n`, "application/xml");
      /* RR-302 decision 1: "Download here" serves the real Setup (locally: the latest test Setup handed to --setup) */
      if (req.method === "GET" && u.pathname === "/download/AlmiVisibility-Setup.exe") {
        if (!setupAvailable()) return send(404, P.download({ setupAvailable: false }));
        res.writeHead(200, { "content-type": "application/vnd.microsoft.portable-executable", "content-length": statSync(SETUP).size, "content-disposition": 'attachment; filename="AlmiVisibility-Setup.exe"', ...SECURITY });
        return createReadStream(SETUP).pipe(res);
      }
      /* Buy: the owner's checkout link for the plan, when its variable is set; otherwise nothing is charged and the page says so */
      if (req.method === "GET" && u.pathname.startsWith("/buy/")) {
        const plan = u.pathname.slice(5);
        if (!PLAN_IDS.has(plan)) return send(404, P.buyNotConnected(null), undefined, PRIVATE);
        const link = process.env[`VISIBILITY_BUY_URL_${plan.toUpperCase()}`];
        if (link && /^https:\/\//.test(link)) return send(303, "", "text/plain", { location: link, ...PRIVATE });
        return send(503, P.buyNotConnected(plan), undefined, PRIVATE);
      }
      /* the free test — the email is optional (RR-302 decision 2) */
      if (u.pathname === "/free-test") {
        if (req.method === "GET") { const r = u.searchParams.get("r"); return send(200, P.freeTest(r && results.has(r) ? results.get(r) : {})); }
        if (req.method === "POST") {
          const f = formOf(body, req.headers["content-type"]);
          const values = { url: typeof f.url === "string" ? f.url.slice(0, 300) : "", email: typeof f.email === "string" ? f.email.slice(0, 254) : "" };
          const pre = checkLead({ email: f.email, marketing: f.marketing === true || f.marketing === "yes" });
          if (!pre.ok) return send(400, P.freeTest({ error: pre.why, values }));
          const t = await testableUrl(f.url);
          if (!t.ok) return send(400, P.freeTest({ error: t.why, values }));
          const take = limiter.take(who(req));
          if (!take.ok) return send(429, P.freeTest({ error: take.why, values }));
          const result = await runFreeTest({ url: t.url });
          await store.addTest(testRecord(result));
          const lead = checkLead({ email: f.email, marketing: f.marketing === true || f.marketing === "yes", testedUrl: result.url, score: result.score }).lead;
          if (lead) await store.addLead(lead);
          const id = randomBytes(9).toString("base64url");
          results.set(id, { result, left: take.left, leadSaved: lead ? lead.email : null, values: { url: values.url } });
          setTimeout(() => results.delete(id), 3600000).unref();
          /* the result fills the card on the page the test was run from (the home hero, or the free-test page with the full detail below) */
          return send(303, "", "text/plain", { location: `${f.back === "/" ? "/" : "/free-test"}?r=${id}#test` });
        }
      }
      /* the private admin */
      const token = cookie(req, "av_admin");
      const me = admin.who(token);
      const gate = () => send(303, "", "text/plain", { location: "/admin", ...PRIVATE });
      if (u.pathname === "/admin" && req.method === "GET") {
        if (!me) return send(200, P.adminLogin(process.env[KEY_NAMES.adminHash] ? null : "The admin page is off: no admin password is configured."), undefined, PRIVATE);
        const [tests, leads] = [await store.listTests(), await store.listLeads()];
        return send(200, P.adminOverview({ tests, leads, counts: dailyCounts(tests, leads), storeKind: store.kind, who: me }), undefined, PRIVATE);
      }
      if (u.pathname === "/admin/login" && req.method === "POST") {
        const f = formOf(body, req.headers["content-type"]);
        const r = admin.login(f.email, f.password, process.env[KEY_NAMES.adminHash], who(req));
        if (!r.ok) return send(401, P.adminLogin(r.why), undefined, PRIVATE);
        const secure = (req.headers["x-forwarded-proto"] ?? "") === "https" ? "; Secure" : "";
        return send(303, "", "text/plain", { location: "/admin", "set-cookie": `av_admin=${r.token}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=28800${secure}`, ...PRIVATE });
      }
      if (u.pathname === "/admin/logout" && req.method === "POST") { admin.logout(token); return send(303, "", "text/plain", { location: "/admin", "set-cookie": "av_admin=; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=0", ...PRIVATE }); }
      if (u.pathname.startsWith("/admin/") && req.method === "GET") {
        if (!me) return gate();
        if (u.pathname === "/admin/leads") return send(200, P.adminLeads({ leads: await store.listLeads(), storeKind: store.kind, who: me }), undefined, PRIVATE);
        if (u.pathname === "/admin/leads.csv") return send(200, leadsCsv(await store.listLeads()), "text/csv; charset=utf-8", { "content-disposition": `attachment; filename="visibility-leads-${new Date().toISOString().slice(0, 10)}.csv"`, ...PRIVATE });
        if (u.pathname === "/admin/tests") return send(200, P.adminTests({ tests: await store.listTests(), storeKind: store.kind, who: me }), undefined, PRIVATE);
        if (u.pathname === "/admin/sales") return send(200, P.adminSales({ who: me }), undefined, PRIVATE);
      }
      send(404, P.frame({ path: u.pathname, title: "Not found — AlmiVisibility", description: "This page does not exist.", body: `<section class="page"><div class="wrap"><h1>Page not found</h1><p><a class="pill" href="/">Home</a></p></div></section>`, noindex: true }));
    } catch (e) { send(500, "Something went wrong.", "text/plain"); }
  });
});
server.listen(Number(arg("port", "0")), "127.0.0.1", () => writeFileSync(join(DATA, "run.json"), JSON.stringify({ port: server.address().port, pid: process.pid, store: store.kind, setup: setupAvailable() })));
