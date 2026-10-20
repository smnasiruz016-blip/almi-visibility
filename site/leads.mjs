/**
 * 🔴 LEADS, THE FREE-TEST LOG AND THE PRIVATE ADMIN (RR-300 B; RR-302 owner decisions 2 and 4).
 *   · RR-302 decision 2 (the owner chose option 2): the free-test RESULT shows to everyone; the email is OPTIONAL and is asked only for the
 *     full report; a SEPARATE, UNTICKED box asks for marketing emails. A lead is stored ONLY when an email is given — with the marketing
 *     answer as given (yes only when that box was ticked; never assumed). The score is the same either way.
 *   · Every free test is logged (the tested site, its score, the date) — never the visitor's address.
 *   · All of it lives in Visibility's OWN database — Neon, reached by the connection string in the environment variable named
 *     VISIBILITY_SITE_DATABASE_URL (never printed, logged or hashed). With no such variable a LOCAL file store is used (local runs and tests
 *     only) and the live store is DEFERRED, named. Lead emails never leave Visibility's own database.
 *   · RR-302 decision 4 — the admin "like every other AlmiWorld product" (almi-oet src/lib/founder.ts + src/lib/auth.ts): an EMAIL on the
 *     admin allow-list (the founder's address always; more in the variable named ADMIN_EMAILS) AND its password (checked against a scrypt hash
 *     in the variable named SITE_ADMIN_PASSWORD_HASH — almi-oet hashes with bcrypt, a package this engine does not have; the method is the
 *     same: a stored hash, never the password); a random session token kept only as a hash, in an HttpOnly cookie; failed logins limited;
 *     never indexed. No hash configured → the admin is OFF (it never opens without a password).
 */
import { scryptSync, timingSafeEqual, randomBytes, createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const KEY_NAMES = Object.freeze({ database: "VISIBILITY_SITE_DATABASE_URL", adminHash: "SITE_ADMIN_PASSWORD_HASH", adminEmails: "ADMIN_EMAILS" });
/** almi-oet src/lib/founder.ts: the canonical founder address is always an admin */
export const FOUNDER_EMAIL = "almiworld@almiworld.com";
export const PRIVACY_LINE = "Your email is used only to send your full report — and, only if you tick the box, news about AlmiVisibility. We never sell it. Ask us any time and we delete it.";
export const MARKETING_LINE = "Yes, also send me news and tips about AlmiVisibility (optional).";
const EMAIL = /^[^\s@<>"]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/**
 * The visitor's optional email with the test. No email → no lead (ok, nothing stored). An email that does not look right → refused.
 * The marketing answer is YES only when the box was ticked (exactly true).
 */
export function checkLead({ email, marketing, testedUrl, score = null }) {
  const e = typeof email === "string" ? email.trim() : "";
  if (e === "") return { ok: true, lead: null };
  if (e.length > 254 || !EMAIL.test(e)) return { ok: false, why: "That email address does not look right. Leave it empty to see your result without one." };
  return { ok: true, lead: Object.freeze({ email: e.toLowerCase(), marketing: marketing === true, consentText: PRIVACY_LINE, testedUrl: typeof testedUrl === "string" ? testedUrl.slice(0, 500) : null, score: Number.isFinite(score) ? score : null, at: new Date().toISOString() }) };
}
/** One free test as logged: the site, its score (null when nothing could be measured), the pages read, the date. No visitor address. */
export const testRecord = (r) => Object.freeze({ site: String(r.url).slice(0, 500), score: Number.isFinite(r.score) ? r.score : null, pages: r.pagesRead, at: r.testedOn });

/** A local file store (local runs and tests only). */
export function fileSiteStore(dir) {
  mkdirSync(dir, { recursive: true });
  const read = (n) => (existsSync(join(dir, n)) ? JSON.parse(readFileSync(join(dir, n), "utf8")) : []);
  const write = (n, a) => { writeFileSync(join(dir, `${n}.tmp`), JSON.stringify(a, null, 1)); renameSync(join(dir, `${n}.tmp`), join(dir, n)); };
  return Object.freeze({
    kind: "LOCAL_FILE (live store DEFERRED)",
    async addLead(lead) { const a = read("leads.json"); if (!a.some((x) => x.email === lead.email && x.testedUrl === lead.testedUrl)) a.push(lead); write("leads.json", a); return true; },
    async listLeads() { return read("leads.json").sort((a, b) => String(b.at).localeCompare(String(a.at))); },
    async addTest(t) { const a = read("tests.json"); a.push(t); write("tests.json", a); return true; },
    async listTests() { return read("tests.json").sort((a, b) => String(b.at).localeCompare(String(a.at))); },
  });
}

/** Visibility's own Neon database, over Neon's HTTP query endpoint (no driver needed). Parameterised queries only. */
export function neonSiteStore(connectionString, { fetchImpl = fetch } = {}) {
  const host = new URL(connectionString).hostname;
  const q = async (query, params = []) => {
    const r = await fetchImpl(`https://${host}/sql`, { method: "POST", headers: { "Neon-Connection-String": connectionString, "Content-Type": "application/json" }, body: JSON.stringify({ query, params }) });
    if (!r.ok) throw new Error(`the site database answered HTTP ${r.status}`);
    return (await r.json()).rows ?? [];
  };
  let ready = null;
  const init = () => (ready ??= (async () => {
    await q("CREATE TABLE IF NOT EXISTS visibility_leads (email text NOT NULL, marketing boolean NOT NULL, consent_text text NOT NULL, tested_url text, score integer, at timestamptz NOT NULL, PRIMARY KEY (email, tested_url))");
    await q("CREATE TABLE IF NOT EXISTS visibility_free_tests (id bigserial PRIMARY KEY, site text NOT NULL, score integer, pages integer NOT NULL, at timestamptz NOT NULL)");
  })());
  return Object.freeze({
    kind: "NEON",
    async addLead(l) { await init(); await q("INSERT INTO visibility_leads (email, marketing, consent_text, tested_url, score, at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email, tested_url) DO NOTHING", [l.email, l.marketing, l.consentText, l.testedUrl, l.score, l.at]); return true; },
    async listLeads() { await init(); return q("SELECT email, marketing, tested_url AS \"testedUrl\", score, at FROM visibility_leads ORDER BY at DESC"); },
    async addTest(t) { await init(); await q("INSERT INTO visibility_free_tests (site, score, pages, at) VALUES ($1, $2, $3, $4)", [t.site, t.score, t.pages, t.at]); return true; },
    async listTests() { await init(); return q("SELECT site, score, pages, at FROM visibility_free_tests ORDER BY at DESC LIMIT 5000"); },
  });
}

/** The store for this run: Neon when its variable is set, else the local file store — named either way. */
export const siteStore = ({ env = process.env, localDir }) => (env[KEY_NAMES.database] ? neonSiteStore(env[KEY_NAMES.database]) : fileSiteStore(localDir));

/** Per day: the free tests, the leads, and how many leads said yes to marketing. Newest day first. */
export function dailyCounts(tests, leads) {
  const days = new Map();
  const day = (at) => String(at).slice(0, 10);
  const row = (d) => days.get(d) ?? days.set(d, { day: d, tests: 0, leads: 0, marketingYes: 0 }).get(d);
  for (const t of tests) row(day(t.at)).tests += 1;
  for (const l of leads) { const r = row(day(l.at)); r.leads += 1; if (l.marketing === true) r.marketingYes += 1; }
  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
}

/** The leads as CSV (email, site, date, marketing yes/no). A cell that a spreadsheet would run as a formula is made plain text. */
export function leadsCsv(leads) {
  const cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return ["email,site,date,marketing", ...leads.map((l) => [l.email, l.testedUrl ?? "", String(l.at).slice(0, 10), l.marketing === true ? "yes" : "no"].map(cell).join(","))].join("\r\n") + "\r\n";
}

/** almi-oet src/lib/founder.ts isAdmin: the founder always; others from the comma-separated list in ADMIN_EMAILS. */
export function isAdmin(email, env = process.env) {
  if (typeof email !== "string" || !email) return false;
  const e = email.trim().toLowerCase();
  if (e === FOUNDER_EMAIL) return true;
  return String(env[KEY_NAMES.adminEmails] ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).includes(e);
}

/** The admin password's hash, in the form scrypt$<salt hex>$<hash hex> (made once by the owner; never the password itself). */
export const hashPassword = (password, salt = randomBytes(16)) => `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 32).toString("hex")}`;
export function passwordMatches(password, stored) {
  const m = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{64})$/.exec(String(stored ?? ""));
  if (!m || typeof password !== "string") return false;
  const got = scryptSync(password, Buffer.from(m[1], "hex"), 32);
  return timingSafeEqual(got, Buffer.from(m[2], "hex"));
}

/** Admin sessions: an allowed email AND its password; random tokens, kept only as hashes, 8 hours; failed logins limited (5 per 15 min). */
export function adminSessions({ now = () => Date.now(), env = process.env } = {}) {
  const sessions = new Map(), fails = new Map();
  const h = (t) => createHash("sha256").update(t).digest("hex");
  return Object.freeze({
    login(email, password, stored, who) {
      if (!stored) return { ok: false, why: "The admin page is off: no admin password is configured." };
      const f = (fails.get(who) ?? []).filter((t) => now() - t < 15 * 60000);
      if (f.length >= 5) return { ok: false, why: "Too many tries — wait 15 minutes." };
      /* one answer for a wrong email and a wrong password: the page never says which emails are admins */
      if (!isAdmin(email, env) || !passwordMatches(password, stored)) { fails.set(who, [...f, now()]); return { ok: false, why: "Wrong email or password." }; }
      const token = randomBytes(32).toString("hex");
      sessions.set(h(token), { until: now() + 8 * 3600000, email: email.trim().toLowerCase() });
      return { ok: true, token };
    },
    who(token) { if (typeof token !== "string" || !token) return null; const s = sessions.get(h(token)); return s && s.until > now() ? s.email : null; },
    valid(token) { return this.who(token) !== null; },
    logout(token) { if (typeof token === "string") sessions.delete(h(token)); },
  });
}
