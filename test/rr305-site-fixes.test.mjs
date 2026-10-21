/* RR-305 B · the small fixes: (1) website fields take "www.almiworld.com" and "almiworld.com" and add https:// themselves; (2) the false line
 * "the licence key is in your Stripe receipt email" is gone; (3) the admin sessions, the failed-login limit and the daily free-test limit
 * live in the STORE — two separate site instances (as on Vercel) share them. LOCAL only; every key is made for the test. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../site/app.mjs";
import { hashPassword, FOUNDER_EMAIL, fileSiteStore, adminSessions } from "../site/leads.mjs";
import { dailyLimiter } from "../site/free-test.mjs";
import { webAddress, checkStep } from "../desktop/setup.mjs";
import * as P from "../site/pages.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("B1 · WEBSITE FIELDS: \"www.almiworld.com\" and \"almiworld.com\" get https:// added; a full address is kept as typed; not-an-address is refused", () => {
  assert.deepEqual(["www.almiworld.com", "almiworld.com", " almiworld.com/pte ", "https://www.almiworld.com", "http://127.0.0.1:3000/x"].map(webAddress), ["https://www.almiworld.com", "https://almiworld.com", "https://almiworld.com/pte", "https://www.almiworld.com", "http://127.0.0.1:3000/x"]);
  for (const bad of ["", "almiworld", "almi world.com", "ftp://almiworld.com", "javascript:alert(1)", "mailto:a@b.co", null]) assert.equal(webAddress(bad), null, String(bad));
  assert.equal(checkStep("product", { name: "AlmiPTE", site: "www.almiworld.com", what: "PTE practice" }), null);
});

test("B1 · THE APP saves the company and a product with https:// added (the owner's \"www.almiworld.com\" was refused before)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr305-app-"));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/" }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    for (let i = 0; i < 80 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const base = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const post = (path, o) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) });
    assert.equal((await post("/api/company", { name: "AlmiWorld", site: "www.almiworld.com" })).status, 200);
    assert.equal((await (await fetch(`${base}/api/home`)).json()).company.site, "https://www.almiworld.com");
    const bad = await post("/api/company", { name: "AlmiWorld", site: "almiworld" });
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).refused, /for example almiworld\.com/);
    assert.equal((await (await fetch(`${base}/api/home`)).json()).company.site, "https://www.almiworld.com", "a refused answer changed the saved company");
  } finally { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
});

test("B2 · /buy/success never says the licence key is in a Stripe receipt — a checkout not found says to contact us with the email paid with", () => {
  const notFound = P.buySuccess(null);
  assert.doesNotMatch(notFound, /receipt/i);
  assert.match(notFound, /contact us<\/a> with the email address you paid with — we find your payment and send you your licence key/);
  assert.doesNotMatch(readFileSync(join(REPO, "site", "pages.mjs"), "utf8"), /Stripe receipt/);
});

test("B3 · THE STORE, NOT ONE PROCESS: two separate site instances on one store — a login on one is a login on the other, a logout on one ends it on both, failed logins and the daily free-test limit are counted once across both", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr305-store-"));
  try {
    const env = { ADMIN_EMAILS: "" }, h = hashPassword("a-test-password-only");
    /* two instances = two store objects and two session/limiter objects over the same storage, like two Vercel instances over one database */
    const a = adminSessions({ env, store: fileSiteStore(dir) }), b = adminSessions({ env, store: fileSiteStore(dir) });
    const ok = await a.login(FOUNDER_EMAIL, "a-test-password-only", h, "visitor");
    assert.equal(await b.who(ok.token), FOUNDER_EMAIL, "the other instance did not know the session");
    await b.logout(ok.token);
    assert.equal(await a.who(ok.token), null, "a logout on one instance left the session open on the other");
    for (let i = 0; i < 3; i++) await a.login(FOUNDER_EMAIL, "wrong", h, "attacker");
    for (let i = 0; i < 2; i++) await b.login(FOUNDER_EMAIL, "wrong", h, "attacker");
    assert.match((await a.login(FOUNDER_EMAIL, "a-test-password-only", h, "attacker")).why, /Too many tries/, "failed logins were counted per instance");
    const day = Date.parse("2026-10-21T10:00:00Z");
    const la = dailyLimiter({ now: () => day, store: fileSiteStore(dir) }), lb = dailyLimiter({ now: () => day, store: fileSiteStore(dir) });
    const takes = [(await la.take("visitor")).ok, (await lb.take("visitor")).ok, (await la.take("visitor")).ok, (await lb.take("visitor")).ok];
    assert.deepEqual(takes, [true, true, true, false], "the daily limit was counted per instance");
    /* no visitor address is stored: only a hash with the day's salt */
    const counters = readFileSync(join(dir, "counters.json"), "utf8");
    assert.ok(!counters.includes("visitor") && !counters.includes("attacker"), "a visitor's address was stored");
    assert.deepEqual(Object.keys(JSON.parse(counters).salts), ["2026-10-21"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("B3 · THE SITE: an admin login made through one app instance opens the admin through ANOTHER instance on the same store", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr305-two-"));
  const env = { SITE_ADMIN_PASSWORD_HASH: hashPassword("a-test-password-only"), ADMIN_EMAILS: "", VISIBILITY_SITE_DATABASE_URL: "" };
  const servers = [];
  const up = async () => { const h = createApp({ env, dataDir: dir, fetchImpl: async () => { throw new Error("no outside call"); } }); const s = createServer((q, r) => { h(q, r); }); await new Promise((r) => s.listen(0, "127.0.0.1", r)); servers.push(s); return `http://127.0.0.1:${s.address().port}`; };
  try {
    const [one, two] = [await up(), await up()];
    const login = await fetch(`${one}/admin/login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ email: FOUNDER_EMAIL, password: "a-test-password-only" }).toString(), redirect: "manual" });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const r = await fetch(`${two}/admin/leads`, { headers: { cookie }, redirect: "manual" });
    assert.equal(r.status, 200, "the second instance did not know the login made on the first");
  } finally { for (const s of servers) s.close(); rmSync(dir, { recursive: true, force: true }); }
});
