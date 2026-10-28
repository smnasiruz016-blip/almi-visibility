#!/usr/bin/env node
/**
 * RR-341: the /owner page has a button that does the same with the key already in Vercel — prefer it; this tool needs the key typed.
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
import { PORTAL_CONFIG_NAME, portalConfigFields, createPortalConfig } from "./billing.mjs";

/* RR-341: the same code as the /owner button (site/billing.mjs) — and, like it, a second run makes no second configuration */
export const configFields = portalConfigFields;
export const makePortalConfig = createPortalConfig;
export const vercelStep = (id) => `NEXT — nothing to set: the site finds this configuration by itself. (Optional, to pin it: Vercel → Production: ${PORTAL_CONFIG_NAME} = ${id}, then deploy again.)`;

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
