/**
 * 🔴 RR-414 B · THE ALMIVISIBILITY ADMIN PANEL (owner-only, almivisibility.almiworld.com/admin) — its logic, kept pure where it can be.
 *   · Signed in the SAME way as /owner (owner.mjs: the av_owner cookie made from OWNER_ACCESS_KEY); never indexed.
 *   · Customers and licences: one row per licence — the store's licences (services/licence + leads.mjs visibility_licences) joined with
 *     Stripe's subscriptions by subscription id (email, start, renewal, trial).
 *   · Free licences: GRANT (new email, chosen expiry, optional reason), EXTEND, REVOKE (behind a confirm step). Each records who, when and
 *     why (granted_by / granted_at / reason, and a log line per change). The owner's own unlimited licence is never touched here.
 *   · Sales: READ ONLY from Stripe — every call is a GET (stripeGet refuses anything else). No charge, refund or price change, ever.
 *   · For HQ: the /api/admin/stats and /api/billing/health payloads, in the format every other product sends.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { PLANS, OWNER } from "../desktop/licence.mjs";
import { PRICE_ENV } from "../services/licence/service.mjs";
import { newLicenceKey, PRODUCT_ID, BILLING_KEY_NAMES } from "./billing.mjs";

export const FREE_KIND = "FREE";
export const PAGE_SIZE = 25;
export const ADMIN_SECRET_ENV = "ADMIN_API_SECRET";
const DAY = 86400000;
const EMAIL = /^[^\s@<>"]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const isPlan = (id) => PLANS.some((p) => p.id === id);
const planWords = (id) => PLANS.find((p) => p.id === id)?.words ?? id ?? "—";
/** a licence is named by a short hash of its key in every page and form, never by the key itself (RR-304) */
export const refOf = (account) => createHash("sha256").update(String(account)).digest("hex").slice(0, 16);
const iso = (ms) => new Date(ms).toISOString();
const dayOf = (v) => (v ? String(v).slice(0, 10) : null);

/* ── Stripe, read only ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The ONE way this panel talks to Stripe: a GET. Anything else is refused before it leaves the process. */
export async function stripeGet({ path, key, fetchImpl = fetch, init = {} }) {
  if (init.method && String(init.method).toUpperCase() !== "GET") throw new Error("the admin panel reads Stripe only (GET)");
  if (init.body !== undefined) throw new Error("the admin panel sends nothing to Stripe");
  const r = await fetchImpl(`https://api.stripe.com/v1/${path}`, { method: "GET", headers: { Authorization: `Bearer ${key}` } });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json: j };
}

const visPriceIds = (env) => new Set(Object.values(PRICE_ENV).map((n) => String(env[n] ?? "").trim()).filter(Boolean));
/** is this subscription AlmiVisibility's? its checkout's tag, one of its 4 prices, or a plan lookup key */
export function isVisibilitySub(s, env = process.env) {
  if (s?.metadata?.product === PRODUCT_ID) return true;
  const price = s?.items?.data?.[0]?.price;
  return Boolean(price && (visPriceIds(env).has(price.id) || isPlan(price.lookup_key)));
}
const MONTHS = { day: 1 / 30, week: 12 / 52, month: 1, year: 12 };
export const monthlyCents = (s) => (s?.items?.data ?? []).reduce((a, it) => {
  const p = it.price; if (!p || typeof p.unit_amount !== "number") return a;
  const m = (MONTHS[p.recurring?.interval ?? "month"] ?? 1) * (p.recurring?.interval_count ?? 1);
  return a + (m > 0 ? Math.round((p.unit_amount * (it.quantity ?? 1)) / m) : 0);
}, 0);
const planOfSub = (s, env) => {
  const price = s?.items?.data?.[0]?.price;
  const hit = Object.entries(PRICE_ENV).find(([, n]) => env[n] && env[n] === price?.id);
  return hit ? hit[0] : isPlan(price?.lookup_key) ? price.lookup_key : isPlan(s?.metadata?.plan) ? s.metadata.plan : null;
};

/**
 * Every AlmiVisibility subscription in Stripe (status=all, newest first, at most `pages` × 100), read only. The customer's email comes
 * from expanding the customer; a restricted key without "Customers: read" is asked again without it (the email then shows as —).
 * Returns { ok, subs, why }.
 */
export async function readStripeSubs({ env = process.env, fetchImpl = fetch, pages = 10 } = {}) {
  const key = env[BILLING_KEY_NAMES.stripeSecret];
  if (!key) return { ok: false, subs: [], why: `no Stripe key in Vercel (${BILLING_KEY_NAMES.stripeSecret})` };
  const subs = [];
  let after = null, expand = true;
  try {
    for (let i = 0; i < pages; i++) {
      const q = new URLSearchParams({ status: "all", limit: "100" });
      q.append("expand[]", "data.items.data.price");
      if (expand) q.append("expand[]", "data.customer");
      if (after) q.set("starting_after", after);
      const r = await stripeGet({ path: `subscriptions?${q}`, key, fetchImpl });
      if (!r.ok && expand && (r.status === 401 || r.status === 403)) { expand = false; i--; continue; }
      if (!r.ok) return { ok: false, subs, why: `Stripe answered HTTP ${r.status}` };
      const data = Array.isArray(r.json.data) ? r.json.data : [];
      subs.push(...data.filter((s) => isVisibilitySub(s, env)));
      if (!r.json.has_more || !data.length) break;
      after = data[data.length - 1].id;
    }
  } catch { return { ok: false, subs, why: "Stripe could not be reached just now" }; }
  return { ok: true, subs, why: null, emails: expand };
}

/** Sales over 7 and 30 days: active paid licences, MRR, new sales, cancellations. Pure. */
export function salesOf(subs, now = Date.now()) {
  const within = (s, d) => typeof s === "number" && s * 1000 >= now - d * DAY;
  const active = subs.filter((s) => s.status === "active");
  /* a new SALE: a subscription started in the window that is or was paid (a trial is not a sale until it is paid) */
  const paidNew = (d) => subs.filter((s) => within(s.created, d) && !["incomplete", "incomplete_expired", "trialing"].includes(s.status));
  const cancelled = (d) => subs.filter((s) => within(s.canceled_at, d));
  return {
    activePaid: active.length,
    trialing: subs.filter((s) => s.status === "trialing").length,
    mrrCents: active.reduce((a, s) => a + monthlyCents(s), 0),
    new7: paidNew(7).length, new30: paidNew(30).length,
    cancelled7: cancelled(7).length, cancelled30: cancelled(30).length,
    pastDue: subs.filter((s) => s.status === "past_due" || s.status === "unpaid").length,
  };
}

/* ── Customers and licences ───────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * One row per licence: the store's record joined with its Stripe subscription. Status words: active · trial · cancelled · expired · free ·
 * past due · pending · revoked · owner. Pure.
 */
export function licenceRows({ accounts = {}, subs = [], env = process.env, now = Date.now() }) {
  const bySub = new Map(subs.map((s) => [s.id, s]));
  const rows = Object.entries(accounts).map(([account, a]) => {
    const s = a.subscription ? bySub.get(a.subscription) : null;
    const end = a.periodEnd ? Date.parse(a.periodEnd) : null;
    let status;
    if (a.kind === OWNER.kind) status = "owner";
    else if (a.kind === FREE_KIND) status = a.status === "REVOKED" ? "revoked" : end !== null && end < now ? "expired" : "free";
    else if (s?.status === "trialing") status = "trial";
    else if (a.status === "CANCELED" || s?.status === "canceled") status = "cancelled";
    else if (a.status === "PAST_DUE") status = "past due";
    else if (a.status === "PENDING") status = "pending";
    else if (end !== null && end < now) status = "expired";
    else status = "active";
    const custEmail = s && typeof s.customer === "object" ? s.customer?.email ?? null : null;
    const startMs = s?.start_date ? s.start_date * 1000 : s?.created ? s.created * 1000 : a.startedAt ? Date.parse(a.startedAt) : a.grantedAt ? Date.parse(a.grantedAt) : null;
    const renewMs = s?.current_period_end ? s.current_period_end * 1000 : s?.items?.data?.[0]?.current_period_end ? s.items.data[0].current_period_end * 1000 : end;
    return Object.freeze({
      ref: refOf(account), kind: a.kind ?? "PAID", email: a.email ?? custEmail ?? null, plan: a.kind === OWNER.kind ? "Unlimited (owner)" : planWords(a.plan), planId: a.plan,
      status, start: startMs ? dayOf(iso(startMs)) : null, renews: a.kind === OWNER.kind ? null : renewMs ? dayOf(iso(renewMs)) : null,
      lastSeen: a.lastSeen ?? null, grantedBy: a.grantedBy ?? null, grantedAt: a.grantedAt ?? null, reason: a.reason ?? null,
      cancelAtPeriodEnd: Boolean(s?.cancel_at_period_end),
    });
  });
  return rows.sort((x, y) => String(y.start ?? "").localeCompare(String(x.start ?? "")) || x.ref.localeCompare(y.ref));
}

/** Search (email, plan, status, licence ref) and paging. Pure. */
export function pageOf(rows, { q = "", page = 1, size = PAGE_SIZE } = {}) {
  const t = String(q ?? "").trim().toLowerCase();
  const hit = t ? rows.filter((r) => [r.email, r.plan, r.planId, r.status, r.ref, r.reason].some((v) => String(v ?? "").toLowerCase().includes(t))) : rows;
  const pages = Math.max(1, Math.ceil(hit.length / size)), p = Math.min(Math.max(1, Math.floor(Number(page) || 1)), pages);
  return { rows: hit.slice((p - 1) * size, p * size), total: hit.length, page: p, pages, q: t };
}

/* ── Free licences: grant · extend · revoke ───────────────────────────────────────────────────────────────────────────── */

const untilOf = (v, now) => {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, why: "Choose an expiry date." };
  const ms = Date.parse(`${s}T23:59:59Z`);
  if (!Number.isFinite(ms) || ms <= now) return { ok: false, why: "The expiry date must be in the future." };
  if (ms > now + 5 * 366 * DAY) return { ok: false, why: "At most five years ahead." };
  return { ok: true, iso: iso(ms) };
};
const reasonOf = (v) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 300) || null;
const logLine = (o) => ({ at: o.at, by: o.by, what: o.what, until: o.until ?? null, reason: o.reason ?? null });
const findRef = (accounts, ref) => Object.keys(accounts).find((k) => refOf(k) === String(ref ?? "")) ?? null;

/**
 * GRANT a free licence to an email: a new licence key (av_…), the chosen plan, ACTIVE until the chosen day. Mutates `accounts`; returns
 * { ok, account, record } — the key is shown to the owner ONCE (he sends it to the person) — or { ok: false, why }.
 */
export function grantFree(accounts, { email, plan = "visibility_1", until, reason, by, now = Date.now() }) {
  const e = String(email ?? "").trim().toLowerCase();
  if (!EMAIL.test(e) || e.length > 254) return { ok: false, why: "That email address does not look right." };
  if (!isPlan(plan)) return { ok: false, why: "Choose a plan." };
  const u = untilOf(until, now); if (!u.ok) return u;
  const live = Object.values(accounts).find((a) => a.kind === FREE_KIND && a.email === e && a.status === "ACTIVE" && Date.parse(a.periodEnd) > now);
  if (live) return { ok: false, why: "This email already has a free licence that is still running — extend that one instead." };
  const account = newLicenceKey(), at = iso(now), r = reasonOf(reason);
  const record = { kind: FREE_KIND, plan, status: "ACTIVE", periodEnd: u.iso, subscription: null, email: e, grantedBy: by, grantedAt: at, reason: r, startedAt: at, lastSeen: null, log: [logLine({ at, by, what: "granted", until: u.iso, reason: r })] };
  accounts[account] = record;
  return { ok: true, account, record };
}

/** EXTEND a free licence (an expired one comes back to life; a revoked one stays revoked). */
export function extendFree(accounts, { ref, until, reason, by, now = Date.now() }) {
  const account = findRef(accounts, ref), a = account ? accounts[account] : null;
  if (!a) return { ok: false, why: "No such licence." };
  if (a.kind === OWNER.kind) return { ok: false, why: "The owner licence is not changed here." };
  if (a.kind !== FREE_KIND) return { ok: false, why: "Only a free licence can be extended here — a paid one follows Stripe." };
  if (a.status === "REVOKED") return { ok: false, why: "This free licence was revoked. Grant a new one instead." };
  const u = untilOf(until, now); if (!u.ok) return u;
  if (Date.parse(u.iso) <= Date.parse(a.periodEnd)) return { ok: false, why: "Choose a date after the current expiry." };
  const at = iso(now);
  accounts[account] = { ...a, periodEnd: u.iso, log: [...(a.log ?? []), logLine({ at, by, what: "extended", until: u.iso, reason: reasonOf(reason) })] };
  return { ok: true, account };
}

/** REVOKE a free licence — only with confirm === "yes" (the confirm step). The app reads REVOKED as ended. */
export function revokeFree(accounts, { ref, confirm, reason, by, now = Date.now() }) {
  const account = findRef(accounts, ref), a = account ? accounts[account] : null;
  if (!a) return { ok: false, why: "No such licence." };
  if (a.kind === OWNER.kind) return { ok: false, why: "The owner licence is not changed here." };
  if (a.kind !== FREE_KIND) return { ok: false, why: "Only a free licence can be revoked here — a paid one is cancelled in Stripe by its buyer." };
  if (confirm !== "yes") return { ok: false, why: "Not revoked: the confirm step was not taken." };
  if (a.status === "REVOKED") return { ok: true, account, already: true };
  const at = iso(now);
  accounts[account] = { ...a, status: "REVOKED", log: [...(a.log ?? []), logLine({ at, by, what: "revoked", reason: reasonOf(reason) })] };
  return { ok: true, account };
}

/* ── For HQ ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** HQ's header check: x-admin-secret equal to ADMIN_API_SECRET, in constant time. FAIL-CLOSED: no secret set → never open. */
export function hqAuthorized(req, env = process.env) {
  const want = String(env[ADMIN_SECRET_ENV] ?? "");
  const got = String(req.headers["x-admin-secret"] ?? "");
  if (!want || !got) return false;
  const a = createHash("sha256").update(got).digest(), b = createHash("sha256").update(want).digest();
  return timingSafeEqual(a, b) && got.length === want.length;
}

/**
 * /api/admin/stats in the network's format: { accounts, signups: { today, d7, d30 }, trialing, paid, free, owner, asOf } — the buckets add
 * up to accounts (free = every licence that is not paid, trialing or the owner's: free grants and ended ones). Plus AlmiVisibility's own
 * figures for HQ: customers, licencesActive, freeLicences, leads, mrrCents.
 */
export function statsOf({ rows, sales, leads = 0, now = Date.now() }) {
  const startOfDay = Date.parse(`${iso(now).slice(0, 10)}T00:00:00Z`);
  const since = (ms) => rows.filter((r) => r.start && Date.parse(`${r.start}T00:00:00Z`) >= ms).length;
  const owner = rows.filter((r) => r.status === "owner").length, paid = rows.filter((r) => r.status === "active").length, trialing = rows.filter((r) => r.status === "trial").length;
  const accounts = rows.length;
  return {
    accounts, signups: { today: since(startOfDay), d7: since(now - 7 * DAY), d30: since(now - 30 * DAY) },
    trialing, paid, free: Math.max(0, accounts - paid - trialing - owner), owner,
    customers: rows.filter((r) => r.status !== "owner").length,
    licencesActive: rows.filter((r) => ["active", "trial", "free"].includes(r.status)).length,
    freeLicences: rows.filter((r) => r.status === "free").length,
    leads, mrrCents: sales?.mrrCents ?? null, asOf: iso(now),
  };
}

/** /api/billing/health: words and booleans only — never a key, its length or its shape (almi-oet's gate:no-secret-shape). */
export function healthOfBilling({ env = process.env, dbConnected, signingOk }) {
  const key = String(env[BILLING_KEY_NAMES.stripeSecret] ?? "");
  const keyMode = !key ? "missing" : key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "live" : key.startsWith("sk_test_") || key.startsWith("rk_test_") ? "test" : "unknown";
  const priceVarsPresent = Object.values(PRICE_ENV).filter((n) => String(env[n] ?? "").trim());
  const ok = Boolean(key) && priceVarsPresent.length === Object.keys(PRICE_ENV).length && Boolean(dbConnected) && Boolean(signingOk);
  return { ok, product: PRODUCT_ID, keyPresent: Boolean(key), keyMode, priceVarsPresent, databaseConnected: Boolean(dbConnected), licenceSigningKey: Boolean(signingOk), takesPayments: env[BILLING_KEY_NAMES.testModeOnly] === "yes" || keyMode === "test" };
}

/** The free tests as CSV (site, score, pages, date). A cell a spreadsheet would run as a formula is made plain text. */
export function testsCsv(tests) {
  const cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return ["site,score,pages,date", ...tests.map((t) => [t.site, t.score ?? "", t.pages ?? "", String(t.at ?? "").slice(0, 10)].map(cell).join(","))].join("\r\n") + "\r\n";
}
