#!/usr/bin/env node
/**
 * RR-300 · the almivisibility.almiworld.com server — RUN LOCALLY ONLY in this round (bound to 127.0.0.1; the live deploy needs the owner's
 * GREEN after he has seen the screenshots). Plain Node, no framework: the pages (site/pages.mjs), the free website test
 * (site/free-test.mjs), the lead form (site/leads.mjs) and the private admin. robots.txt keeps the admin and the API out of search.
 *   node site/server.mjs [--port=0] [--data=<dir for the local lead store and run.json>]
 * Keys by NAME only: VISIBILITY_SITE_DATABASE_URL (Neon), SITE_ADMIN_PASSWORD_HASH (the admin). Neither is ever printed.
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import * as P from "./pages.mjs";
import { testableUrl, runFreeTest, dailyLimiter } from "./free-test.mjs";
import { checkLead, leadStore, adminSessions, KEY_NAMES } from "./leads.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const DATA = arg("data", join(HERE, "..", ".site-data"));
mkdirSync(DATA, { recursive: true });
const store = leadStore({ env: process.env, localDir: DATA });
const limiter = dailyLimiter();
const admin = adminSessions();
const results = new Map(); // a result is shown at its own short id for one hour, then forgotten
const LOGO = readFileSync(join(HERE, "..", "desktop", "brand", "almiworld-logo.png"));
const PAGES = { "/": P.home, "/features": P.features, "/pricing": P.pricing, "/download": P.download, "/privacy": P.privacy, "/terms": P.terms };

const formOf = (body, type) => (/json/.test(type ?? "") ? JSON.parse(body || "{}") : Object.fromEntries(new URLSearchParams(body)));
const cookie = (req, name) => (req.headers.cookie ?? "").split(/;\s*/).map((c) => c.split("=")).find(([k]) => k === name)?.[1] ?? null;
const who = (req) => req.socket.remoteAddress ?? "unknown";
const SECURITY = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "SAMEORIGIN", "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'self'" };

const server = createServer((req, res) => {
  const send = (code, body, type = "text/html; charset=utf-8", extra = {}) => { res.writeHead(code, { "content-type": type, ...SECURITY, ...extra }); res.end(body); };
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 20000) req.destroy(); });
  req.on("end", async () => {
    try {
      const u = new URL(req.url, "http://127.0.0.1");
      /* a form from another site is refused (the site's own forms only) */
      if (req.method === "POST" && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(403, "Forbidden", "text/plain");
      if (req.method === "GET" && PAGES[u.pathname]) return send(200, PAGES[u.pathname]());
      if (req.method === "GET" && u.pathname === "/brand/almiworld-logo.png") return send(200, LOGO, "image/png", { "cache-control": "public, max-age=86400" });
      if (req.method === "GET" && u.pathname === "/robots.txt") return send(200, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${P.ORIGIN}/sitemap.xml\n`, "text/plain");
      if (req.method === "GET" && u.pathname === "/sitemap.xml") return send(200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/free-test", "/features", "/pricing", "/download"].map((p) => `<url><loc>${P.ORIGIN}${p}</loc></url>`).join("")}</urlset>\n`, "application/xml");
      /* the free test */
      if (u.pathname === "/free-test") {
        if (req.method === "GET") { const r = u.searchParams.get("r"); return send(200, P.freeTest(r && results.has(r) ? results.get(r) : {})); }
        if (req.method === "POST") {
          const f = formOf(body, req.headers["content-type"]);
          const t = await testableUrl(f.url);
          if (!t.ok) return send(400, P.freeTest({ error: t.why }));
          const take = limiter.take(who(req));
          if (!take.ok) return send(429, P.freeTest({ error: take.why }));
          const result = await runFreeTest({ url: t.url });
          const id = randomBytes(9).toString("base64url");
          results.set(id, { result, left: take.left });
          setTimeout(() => results.delete(id), 3600000).unref();
          return send(303, "", "text/plain", { location: `/free-test?r=${id}#result` });
        }
      }
      /* the lead: only with the box ticked */
      if (req.method === "POST" && u.pathname === "/api/lead") {
        const f = formOf(body, req.headers["content-type"]);
        const c = checkLead({ email: f.email, consent: f.consent === true || f.consent === "yes", testedUrl: f.testedUrl });
        if (!c.ok) return send(400, P.freeTest({ error: c.why }));
        await store.add(c.lead);
        return send(200, P.freeTest({ error: null }).replace("<h1>Free website test</h1>", "<h1>Thank you — we will send your full report.</h1>"));
      }
      /* the private admin */
      if (u.pathname === "/admin" && req.method === "GET") return send(200, P.adminLogin(process.env[KEY_NAMES.adminHash] ? null : "The admin page is off: no admin password is configured."), undefined, { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" });
      if (u.pathname === "/admin/login" && req.method === "POST") {
        const f = formOf(body, req.headers["content-type"]);
        const r = admin.login(f.password, process.env[KEY_NAMES.adminHash], who(req));
        if (!r.ok) return send(401, P.adminLogin(r.why), undefined, { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" });
        const secure = (req.headers["x-forwarded-proto"] ?? "") === "https" ? "; Secure" : "";
        return send(303, "", "text/plain", { location: "/admin/leads", "set-cookie": `av_admin=${r.token}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=28800${secure}`, "cache-control": "no-store" });
      }
      if (u.pathname === "/admin/leads" && req.method === "GET") {
        if (!admin.valid(cookie(req, "av_admin"))) return send(303, "", "text/plain", { location: "/admin", "cache-control": "no-store" });
        return send(200, P.adminLeads(await store.list(), store.kind), undefined, { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" });
      }
      send(404, P.frame({ path: u.pathname, title: "Not found — AlmiVisibility", description: "This page does not exist.", body: `<div class="wrap hero"><h1>Page not found</h1><p><a class="btn" href="/">Home</a></p></div>`, noindex: true }));
    } catch (e) { send(500, "Something went wrong.", "text/plain"); }
  });
});
server.listen(Number(arg("port", "0")), "127.0.0.1", () => writeFileSync(join(DATA, "run.json"), JSON.stringify({ port: server.address().port, pid: process.pid, leadStore: store.kind })));
