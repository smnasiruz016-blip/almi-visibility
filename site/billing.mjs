/**
 * 🔴 RR-303 A · BUYING A PLAN, THE ALMIWORLD WAY (almi-oet src/lib/billing/stripe.ts; almi-billing-router README "new product").
 *   · The site's own server opens a Stripe Checkout session for the plan's price — the price id read from the variable NAMED for that plan
 *     (STRIPE_PRICE_ID_VISIBILITY_1/_5/_10/_UNLIMITED), the key from the variable named STRIPE_SECRET_KEY; neither is printed or logged.
 *   · The session carries metadata.product = "almi-visibility" (the router's registry id), the plan, and the buyer's new LICENCE KEY
 *     (metadata.almiworld_account, also on the subscription), so every later event routes to this product and names the licence.
 *   · A card is always collected. TEST MODE ONLY until the owner's launch GREEN: a live key is refused (RR-338: `closed`,
 *     and the buyer is told buying opens soon) until VISIBILITY_BILLING_LIVE=yes.
 *   · Stripe events arrive through the router at /api/webhooks/stripe (services/licence/service.mjs applies them).
 */
import { randomBytes } from "node:crypto";
import { PRICE_ENV } from "../services/licence/service.mjs";

export const PRODUCT_ID = "almi-visibility";
export const BILLING_KEY_NAMES = Object.freeze({ stripeSecret: "STRIPE_SECRET_KEY", testModeOnly: "VISIBILITY_BILLING_LIVE" });
export const newLicenceKey = () => `av_${randomBytes(18).toString("base64url")}`;

/** The checkout session's form fields (Stripe's form encoding). Pure — the test reads exactly what would be sent. */
export function checkoutFields({ plan, priceId, licenceKey, origin }) {
  return {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    payment_method_collection: "always",
    /* RR-338 (owner, 28 Oct 2026): Stripe Tax on — prices are tax-exclusive; the buyer's address is asked for the tax, and a business may
     * give its VAT number. A promotion-code field (only the codes the owner makes in Stripe work). */
    "automatic_tax[enabled]": "true",
    billing_address_collection: "required",
    "tax_id_collection[enabled]": "true",
    allow_promotion_codes: "true",
    success_url: `${origin}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    client_reference_id: licenceKey,
    "metadata[product]": PRODUCT_ID,
    "metadata[plan]": plan,
    "metadata[almiworld_account]": licenceKey,
    "subscription_data[metadata][product]": PRODUCT_ID,
    "subscription_data[metadata][plan]": plan,
    "subscription_data[metadata][almiworld_account]": licenceKey,
  };
}

/**
 * RR-340 · "MANAGE OR CANCEL MY PLAN": the buyer's own Stripe customer portal. The buyer proves who they are with their licence key (a
 * random secret only they were shown); the key names ONE subscription in our store, Stripe names its customer, and the portal session is
 * for that customer only — no other buyer can be reached. Every miss answers the same words (a key is never confirmed or denied).
 * Returns { ok, url } or { ok: false, state, why }. `fetchImpl` is injected (tests answer it locally).
 */
export const PORTAL_CONFIG_NAME = "STRIPE_PORTAL_CONFIGURATION_VISIBILITY";
/* RR-341 · AlmiVisibility's OWN portal configuration carries this tag; the shared default portal never does, and is never touched */
export const PORTAL_TAG = Object.freeze({ key: "product", value: PRODUCT_ID });
export const PORTAL_SITE = "https://almivisibility.almiworld.com";

/** The configuration's form fields (Stripe's form encoding). Pure — the test reads exactly what would be sent. */
export function portalConfigFields(products) {
  const f = {
    "business_profile[headline]": "AlmiVisibility — manage or cancel your plan",
    "business_profile[privacy_policy_url]": `${PORTAL_SITE}/privacy`,
    "business_profile[terms_of_service_url]": `${PORTAL_SITE}/terms`,
    default_return_url: `${PORTAL_SITE}/manage`,
    "features[invoice_history][enabled]": "true",
    "features[payment_method_update][enabled]": "true",
    "features[customer_update][enabled]": "true",
    "features[customer_update][allowed_updates][0]": "email",
    "features[customer_update][allowed_updates][1]": "address",
    "features[customer_update][allowed_updates][2]": "tax_id",
    "features[subscription_cancel][enabled]": "true",
    "features[subscription_cancel][mode]": "at_period_end",
    "features[subscription_cancel][cancellation_reason][enabled]": "true",
    "features[subscription_cancel][cancellation_reason][options][0]": "too_expensive",
    "features[subscription_cancel][cancellation_reason][options][1]": "missing_features",
    "features[subscription_cancel][cancellation_reason][options][2]": "unused",
    "features[subscription_cancel][cancellation_reason][options][3]": "other",
    "features[subscription_update][enabled]": "true",
    "features[subscription_update][default_allowed_updates][0]": "price",
    "features[subscription_update][proration_behavior]": "create_prorations",
    [`metadata[${PORTAL_TAG.key}]`]: PORTAL_TAG.value,
  };
  products.forEach((p, i) => { f[`features[subscription_update][products][${i}][product]`] = p.product; p.prices.forEach((x, k) => { f[`features[subscription_update][products][${i}][prices][${k}]`] = x; }); });
  return f;
}

/** AlmiVisibility's own configuration, found by its tag among the account's configurations (active only) — its id, or null. */
export async function findPortalConfig({ stripeKey, fetchImpl = fetch }) {
  const r = await fetchImpl("https://api.stripe.com/v1/billing_portal/configurations?limit=100&active=true", { headers: { Authorization: `Bearer ${stripeKey}` } });
  if (!r.ok) throw Object.assign(new Error(`Stripe answered ${r.status}`), { status: r.status });
  const j = await r.json();
  return (j.data ?? []).find((c) => c?.active !== false && c?.metadata?.[PORTAL_TAG.key] === PORTAL_TAG.value && !c?.is_default && /^bpc_/.test(String(c.id)))?.id ?? null;
}

/**
 * Make AlmiVisibility's own portal configuration — ONCE: if one already carries the tag, that one is returned (a second press makes no
 * second configuration). The 4 prices must be monthly USD prices; only they can be switched to. Words only in the result, never a key.
 */
export async function createPortalConfig({ priceIds, stripeKey, fetchImpl = fetch }) {
  const auth = { Authorization: `Bearer ${stripeKey}` };
  try {
    let existing = null;
    try { existing = await findPortalConfig({ stripeKey, fetchImpl }); } catch (e) { if (e.status === 401 || e.status === 403) return { ok: false, line: `FAILED — Stripe refused the key (${e.status}). If it is a restricted key, give it "Customer portal: write" and "Prices: read". Nothing was made.` }; throw e; }
    if (existing) return { ok: true, id: existing, created: false, line: `OK — AlmiVisibility's own customer portal is already there: ${existing}. Nothing new was made.` };
    const byProduct = new Map();
    for (const id of priceIds) {
      const r = await fetchImpl(`https://api.stripe.com/v1/prices/${encodeURIComponent(id)}`, { headers: auth });
      if (r.status === 401 || r.status === 403) return { ok: false, line: `FAILED — Stripe refused the key (${r.status}). If it is a restricted key, give it "Prices: read" and "Customer portal: write". Nothing was made.` };
      if (!r.ok) return { ok: false, line: `FAILED — Stripe does not know the price ${id} (${r.status}). Nothing was made.` };
      const p = await r.json();
      if (p.recurring?.interval !== "month" || p.currency !== "usd" || typeof p.product !== "string") return { ok: false, line: `FAILED — the price ${id} is not a monthly USD price of a product. Nothing was made.` };
      byProduct.set(p.product, [...(byProduct.get(p.product) ?? []), id]);
    }
    const products = [...byProduct].map(([product, prices]) => ({ product, prices }));
    const c = await fetchImpl("https://api.stripe.com/v1/billing_portal/configurations", { method: "POST", headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(portalConfigFields(products)).toString() });
    const j = await c.json().catch(() => ({}));
    if (!c.ok || !/^bpc_[A-Za-z0-9]+$/.test(String(j.id))) return { ok: false, line: `FAILED — Stripe answered ${c.status} when making the configuration${j.error?.message ? `: ${String(j.error.message).slice(0, 200)}` : ""}.` };
    return { ok: true, id: j.id, created: true, line: `OK — AlmiVisibility's own customer portal is made: ${j.id} (${products.length} product(s), the 4 plans; cancel at the end of the paid month).` };
  } catch { return { ok: false, line: "FAILED — Stripe could not be reached. Nothing is confirmed." }; }
}

/** The /owner button: the Stripe key and the 4 price ids already in Vercel — the owner types nothing. */
export async function ensurePortalConfig({ env = process.env, fetchImpl = fetch }) {
  const stripeKey = env[BILLING_KEY_NAMES.stripeSecret];
  if (!stripeKey) return { ok: false, line: `FAILED — no Stripe key in Vercel (${BILLING_KEY_NAMES.stripeSecret}). Nothing was made.` };
  const names = Object.values(PRICE_ENV), missing = names.filter((n) => !env[n]);
  if (missing.length) return { ok: false, line: `FAILED — missing in Vercel: ${missing.join(", ")}. Nothing was made.` };
  return createPortalConfig({ priceIds: names.map((n) => String(env[n]).trim()), stripeKey, fetchImpl });
}
/** RR-342 · read-only: is AlmiVisibility's own portal in Stripe? One list call (5 s at most); words only — the bpc_ id is not a secret. */
export async function portalStatus({ env = process.env, fetchImpl = fetch }) {
  const stripeKey = env[BILLING_KEY_NAMES.stripeSecret];
  if (!stripeKey) return { ok: false, line: `no Stripe key in Vercel (${BILLING_KEY_NAMES.stripeSecret})` };
  const pinned = String(env[PORTAL_CONFIG_NAME] ?? "").trim();
  try {
    const id = await Promise.race([findPortalConfig({ stripeKey, fetchImpl }), new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 5000))]);
    if (!id) return { ok: false, line: "not made yet — press “Create Manage-plan portal”" };
    return { ok: true, id, line: `OK — AlmiVisibility's own portal is in Stripe: ${id}${pinned && pinned !== id ? ` (${PORTAL_CONFIG_NAME} names another one, and the site uses that)` : ""}` };
  } catch (e) { return { ok: false, line: `Stripe could not be read just now (${e.status ? `HTTP ${e.status}` : "no answer"})${e.status === 401 || e.status === 403 ? " — the key needs “Customer portal: Read”" : ""}` }; }
}
export const LICENCE_KEY_SHAPE = /^av_[A-Za-z0-9_-]{20,40}$/;
export const NO_PLAN_FOUND = "No paid plan was found for this licence key. Check the key (it starts with av_), or write to almiworld@almiworld.com.";
export async function portalSession({ licenceKey, accounts, env = process.env, origin, fetchImpl = fetch }) {
  const key = String(licenceKey ?? "").trim(), miss = { ok: false, state: "NOT_FOUND", why: NO_PLAN_FOUND };
  if (!LICENCE_KEY_SHAPE.test(key)) return miss;
  const sub = accounts?.[key]?.subscription;
  if (!sub || !/^sub_[A-Za-z0-9]+$/.test(sub)) return miss;
  const stripeKey = env[BILLING_KEY_NAMES.stripeSecret];
  if (!stripeKey) return { ok: false, state: "DEFERRED", why: `plan management is not connected: no Stripe key in the environment (${BILLING_KEY_NAMES.stripeSecret})` };
  if (!String(stripeKey).startsWith("sk_test_") && env[BILLING_KEY_NAMES.testModeOnly] !== "yes") return { ok: false, state: "REFUSED", closed: true, why: "payments are not switched on yet" };
  /* RR-340: the Stripe account's DEFAULT portal is shared by every AlmiWorld product — AlmiVisibility opens ONLY its own configuration
   * (site/owner-portal-config.mjs makes it), never the default */
  const auth = { Authorization: `Bearer ${stripeKey}` };
  /* RR-341: the configuration's id from Vercel if the owner set one, else found in Stripe by its tag (the /owner button made it) */
  const set = String(env[PORTAL_CONFIG_NAME] ?? "").trim();
  const config = /^bpc_[A-Za-z0-9]+$/.test(set) ? set : await findPortalConfig({ stripeKey, fetchImpl }).catch(() => null);
  if (!config) return { ok: false, state: "DEFERRED", why: "plan management is not set up: press “Create Manage-plan portal” on /owner" };
  const s = await fetchImpl(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub)}`, { headers: auth });
  const so = await s.json().catch(() => ({}));
  /* the subscription must still name this licence key (our checkout stamped it) — else the store and Stripe disagree, and nothing opens */
  if (!s.ok || typeof so.customer !== "string" || so.metadata?.almiworld_account !== key) return miss;
  const p = await fetchImpl("https://api.stripe.com/v1/billing_portal/sessions", { method: "POST", headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ customer: so.customer, configuration: config, return_url: `${origin}/manage` }).toString() });
  const pj = await p.json().catch(() => ({}));
  if (!p.ok || typeof pj.url !== "string" || !pj.url.startsWith("https://billing.stripe.com/")) return { ok: false, state: "FAILED", why: `Stripe answered HTTP ${p.status} — is the customer portal switched on in Stripe (Settings → Billing → Customer portal)?` };
  return { ok: true, url: pj.url };
}

/**
 * Open a checkout session. Returns { ok, url, sessionId, licenceKey } or { ok: false, state, why } — DEFERRED (a variable is missing,
 * named) or REFUSED (a live key before launch). `fetchImpl` is injected (tests answer it locally).
 */
export async function createCheckout({ plan, env = process.env, origin, fetchImpl = fetch }) {
  const priceName = PRICE_ENV[plan];
  if (!priceName) return { ok: false, state: "REFUSED", why: "unknown plan" };
  const key = env[BILLING_KEY_NAMES.stripeSecret];
  if (!key) return { ok: false, state: "DEFERRED", why: `checkout is not connected: no Stripe key in the environment (${BILLING_KEY_NAMES.stripeSecret})` };
  if (!String(key).startsWith("sk_test_") && env[BILLING_KEY_NAMES.testModeOnly] !== "yes") return { ok: false, state: "REFUSED", closed: true, why: "only a Stripe TEST-mode key is accepted before the owner's launch GREEN" };
  const priceId = env[priceName];
  if (!priceId) return { ok: false, state: "DEFERRED", why: `checkout is not connected: no price for this plan (${priceName})` };
  const licenceKey = newLicenceKey();
  const r = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(checkoutFields({ plan, priceId, licenceKey, origin })).toString() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || typeof j.url !== "string") return { ok: false, state: "FAILED", why: `Stripe answered HTTP ${r.status}` };
  return { ok: true, url: j.url, sessionId: j.id, licenceKey, plan };
}
