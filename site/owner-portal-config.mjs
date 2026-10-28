#!/usr/bin/env node
/**
 * RR-340 · FOR THE OWNER (the website's own owner script, like owner-router-register.mjs — not engine code): make AlmiVisibility's OWN
 * Stripe customer-portal configuration. The Stripe account's default portal is shared by every AlmiWorld product, so AlmiVisibility never
 * uses it: this configuration lets an AlmiVisibility buyer cancel (at the end of the paid month), switch between the 4 AlmiVisibility plans
 * only, update the card, address and VAT number, and see invoices — with AlmiVisibility's own Terms and Privacy links.
 *   node site/owner-portal-config.mjs <price 1 product> <price up to 5> <price up to 10> <price unlimited>
 * You type the Stripe secret key (the same live key as the site's STRIPE_SECRET_KEY) at a hidden prompt; it is never shown, written or
 * printed. The tool prints only OK with the configuration's id (bpc_…, not a secret) and the Vercel step — or FAILED and why.
 */
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { checkPrices } from "./owner-router-register.mjs";
import { PORTAL_CONFIG_NAME } from "./billing.mjs";

export const SITE = "https://almivisibility.almiworld.com";

/** The configuration's form fields (Stripe's form encoding). Pure — the test reads exactly what would be sent. */
export function configFields(products) {
  const f = {
    "business_profile[headline]": "AlmiVisibility — manage or cancel your plan",
    "business_profile[privacy_policy_url]": `${SITE}/privacy`,
    "business_profile[terms_of_service_url]": `${SITE}/terms`,
    default_return_url: `${SITE}/manage`,
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
    "metadata[product]": "almi-visibility",
  };
  products.forEach((p, i) => { f[`features[subscription_update][products][${i}][product]`] = p.product; p.prices.forEach((x, k) => { f[`features[subscription_update][products][${i}][prices][${k}]`] = x; }); });
  return f;
}

/** Read the 4 prices (monthly USD, each with its product), then create the configuration. The result is words only, never a key. */
export async function makePortalConfig({ priceIds, stripeKey, fetchImpl = fetch }) {
  const auth = { Authorization: `Bearer ${stripeKey}` };
  try {
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
    const c = await fetchImpl("https://api.stripe.com/v1/billing_portal/configurations", { method: "POST", headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(configFields(products)).toString() });
    const j = await c.json().catch(() => ({}));
    if (!c.ok || !/^bpc_[A-Za-z0-9]+$/.test(String(j.id))) return { ok: false, line: `FAILED — Stripe answered ${c.status} when making the configuration${j.error?.message ? `: ${String(j.error.message).slice(0, 200)}` : ""}.` };
    return { ok: true, id: j.id, line: `OK — AlmiVisibility's own customer portal is made: ${j.id} (${products.length} product(s), the 4 plans; cancel at the end of the paid month).` };
  } catch { return { ok: false, line: "FAILED — Stripe could not be reached. Nothing is confirmed." }; }
}
export const vercelStep = (id) => `NEXT — Vercel → almi-visibility → Settings → Environment Variables → Production: ${PORTAL_CONFIG_NAME} = ${id}, then deploy again. /owner then shows it as set.`;

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(question); };
    rl.question(question, (a) => { rl.close(); process.stdout.write("\n"); resolve(a.trim()); });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const priceIds = process.argv.slice(2), c = checkPrices(priceIds);
  if (!c.ok) { console.error(`FAILED — ${c.why}. Nothing was sent.`); process.exit(1); }
  const stripeKey = await askHidden("Stripe secret key (the site's live key, hidden): ");
  if (!stripeKey) { console.error("FAILED — no key typed. Nothing was sent."); process.exit(1); }
  const r = await makePortalConfig({ priceIds, stripeKey });
  (r.ok ? console.log : console.error)(r.line);
  if (r.ok) console.log(vercelStep(r.id));
  process.exit(r.ok ? 0 : 1);
}
