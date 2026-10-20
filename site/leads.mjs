/**
 * 🔴 LEAD CAPTURE AND THE PRIVATE ADMIN (RR-300 B; owner decision 3: "email list kisi jaga colect ho").
 *   · A lead is taken ONLY with the consent box ticked by the visitor (the box starts unticked); without it nothing is stored. The test's
 *     score is the same either way.
 *   · Leads live in Visibility's OWN database — Neon, reached by the connection string in the environment variable named
 *     VISIBILITY_SITE_DATABASE_URL (its value is never printed, logged or hashed). With no such variable a LOCAL file store is used (for
 *     local runs and tests only) and the live store is DEFERRED, named. Lead emails never leave Visibility's own database.
 *   · The owner sees the list on a PRIVATE admin page: a login (the password checked against a scrypt hash held in the variable named
 *     SITE_ADMIN_PASSWORD_HASH), an HttpOnly, SameSite=Strict session, a limit on failed logins; never indexed. No hash configured → the
 *     admin is OFF (it never opens without a password).
 */
import { scryptSync, timingSafeEqual, randomBytes, createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const KEY_NAMES = Object.freeze({ database: "VISIBILITY_SITE_DATABASE_URL", adminHash: "SITE_ADMIN_PASSWORD_HASH" });
export const PRIVACY_LINE = "We use your email only to send you the full report and news about AlmiVisibility. We never sell it. You can ask us to delete it at any time.";
const EMAIL = /^[^\s@<>"]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/** Check one lead: an email, the consent box TICKED (exactly true), the tested address. */
export function checkLead({ email, consent, testedUrl }) {
  if (consent !== true) return { ok: false, why: "Tick the box if you want the full report — nothing was saved." };
  if (typeof email !== "string" || email.length > 254 || !EMAIL.test(email.trim())) return { ok: false, why: "That email address does not look right." };
  return { ok: true, lead: Object.freeze({ email: email.trim().toLowerCase(), consent: true, consentText: PRIVACY_LINE, testedUrl: typeof testedUrl === "string" ? testedUrl.slice(0, 500) : null, at: new Date().toISOString() }) };
}

/** A local file store (local runs and tests only). */
export function fileLeadStore(dir) {
  mkdirSync(dir, { recursive: true });
  const f = join(dir, "leads.json");
  const all = () => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : []);
  return Object.freeze({
    kind: "LOCAL_FILE (live store DEFERRED)",
    async add(lead) { const a = all(); if (!a.some((x) => x.email === lead.email)) a.push(lead); writeFileSync(`${f}.tmp`, JSON.stringify(a, null, 1)); renameSync(`${f}.tmp`, f); return true; },
    async list() { return all(); },
  });
}

/** Visibility's own Neon database, over Neon's HTTP query endpoint (no driver needed). Parameterised queries only. */
export function neonLeadStore(connectionString, { fetchImpl = fetch } = {}) {
  const host = new URL(connectionString).hostname;
  const q = async (query, params = []) => {
    const r = await fetchImpl(`https://${host}/sql`, { method: "POST", headers: { "Neon-Connection-String": connectionString, "Content-Type": "application/json" }, body: JSON.stringify({ query, params }) });
    if (!r.ok) throw new Error(`the lead database answered HTTP ${r.status}`);
    return (await r.json()).rows ?? [];
  };
  let ready = null;
  const init = () => (ready ??= q("CREATE TABLE IF NOT EXISTS visibility_leads (email text PRIMARY KEY, consent boolean NOT NULL CHECK (consent), consent_text text NOT NULL, tested_url text, at timestamptz NOT NULL)"));
  return Object.freeze({
    kind: "NEON",
    async add(l) { await init(); await q("INSERT INTO visibility_leads (email, consent, consent_text, tested_url, at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING", [l.email, l.consent, l.consentText, l.testedUrl, l.at]); return true; },
    async list() { await init(); return q("SELECT email, consent, tested_url AS \"testedUrl\", at FROM visibility_leads ORDER BY at DESC"); },
  });
}

/** The store for this run: Neon when its variable is set, else the local file store — named either way. */
export const leadStore = ({ env = process.env, localDir }) => (env[KEY_NAMES.database] ? neonLeadStore(env[KEY_NAMES.database]) : fileLeadStore(localDir));

/** The admin password's hash, in the form scrypt$<salt hex>$<hash hex> (made once by the owner; never the password itself). */
export const hashPassword = (password, salt = randomBytes(16)) => `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 32).toString("hex")}`;
export function passwordMatches(password, stored) {
  const m = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{64})$/.exec(String(stored ?? ""));
  if (!m || typeof password !== "string") return false;
  const got = scryptSync(password, Buffer.from(m[1], "hex"), 32);
  return timingSafeEqual(got, Buffer.from(m[2], "hex"));
}

/** Admin sessions: random tokens, kept only as hashes, 8 hours; failed logins limited (5 per 15 minutes per person). */
export function adminSessions({ now = () => Date.now() } = {}) {
  const sessions = new Map(), fails = new Map();
  const h = (t) => createHash("sha256").update(t).digest("hex");
  return Object.freeze({
    login(password, stored, who) {
      if (!stored) return { ok: false, why: "The admin page is off: no admin password is configured." };
      const f = (fails.get(who) ?? []).filter((t) => now() - t < 15 * 60000);
      if (f.length >= 5) return { ok: false, why: "Too many tries — wait 15 minutes." };
      if (!passwordMatches(password, stored)) { fails.set(who, [...f, now()]); return { ok: false, why: "Wrong password." }; }
      const token = randomBytes(32).toString("hex");
      sessions.set(h(token), now() + 8 * 3600000);
      return { ok: true, token };
    },
    valid(token) { if (typeof token !== "string" || !token) return false; const exp = sessions.get(h(token)); return Boolean(exp && exp > now()); },
  });
}
