#!/usr/bin/env node
/**
 * RR-336 · FOR THE OWNER: register AlmiVisibility in the AlmiWorld billing router (POST /api/admin/routes), so Stripe's subscription and
 * invoice events for its 4 prices reach https://almivisibility.almiworld.com/api/webhooks/stripe.
 *   node tools/router-register.mjs <price 1 product> <price up to 5> <price up to 10> <price unlimited>
 *   node tools/router-register.mjs --check <the same 4 price ids>     (reads only: is it registered with exactly these 4?)
 * The same tool registers the LIVE price ids later (test and live ids differ; the forwardSecret stays the same).
 * You type ROUTER_ADMIN_API_SECRET and the forwardSecret (= AlmiVisibility's ROUTER_WEBHOOK_SECRET in Vercel) at hidden prompts; nothing you
 * type is shown, written to a file or printed. It prints ONLY success or failure — never a secret, never the router's raw answer.
 */
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

export const ROUTER = "https://almi-billing-router.vercel.app/api/admin/routes";
export const PRODUCT = Object.freeze({ id: "almi-visibility", name: "AlmiVisibility", forwardUrl: "https://almivisibility.almiworld.com/api/webhooks/stripe" });
const PLANS = ["1 product", "up to 5", "up to 10", "unlimited"];

/** The 4 price ids, in plan order: each a Stripe price id, all different — or why not. */
export function checkPrices(ids) {
  if (ids.length !== 4) return { ok: false, why: `give exactly 4 price ids (${PLANS.join(", ")}) — ${ids.length} given` };
  const bad = ids.findIndex((x) => !/^price_[A-Za-z0-9]{6,}$/.test(x));
  if (bad >= 0) return { ok: false, why: `the "${PLANS[bad]}" id does not look like a Stripe price id (price_...)` };
  if (new Set(ids).size !== 4) return { ok: false, why: "two of the 4 price ids are the same" };
  return { ok: true };
}

/** Register (POST, then read back) or only check (GET). fetch is handed in; the result is words only, never a secret. */
export async function registerRoutes({ priceIds, adminSecret, forwardSecret = null, checkOnly = false, fetchImpl = fetch }) {
  const auth = { Authorization: `Bearer ${adminSecret}` };
  try {
    if (!checkOnly) {
      const r = await fetchImpl(ROUTER, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ product: { ...PRODUCT, forwardSecret, active: true }, priceIds }) });
      if (r.status === 401) return { ok: false, line: "FAILED — the router refused ROUTER_ADMIN_API_SECRET (401). Nothing was registered." };
      if (!r.ok) return { ok: false, line: `FAILED — the router answered ${r.status}. Nothing is confirmed.` };
    }
    const g = await fetchImpl(ROUTER, { method: "GET", headers: auth });
    if (g.status === 401) return { ok: false, line: "FAILED — the router refused ROUTER_ADMIN_API_SECRET (401)." };
    if (!g.ok) return { ok: false, line: `FAILED — the router's list answered ${g.status}.` };
    const list = await g.json();
    const p = (list.products ?? []).find((x) => x.id === PRODUCT.id);
    if (!p) return { ok: false, line: `FAILED — ${PRODUCT.id} is not in the router's registry.` };
    const missing = priceIds.filter((x) => !(p.priceIds ?? []).includes(x));
    const problems = [missing.length ? `${missing.length} of the 4 price ids not routed to it` : null, p.active ? null : "it is not active", p.forwardSecretSet ? null : "its forwardSecret is not set", p.forwardUrl === PRODUCT.forwardUrl ? null : "its forwardUrl is not AlmiVisibility's webhook"].filter(Boolean);
    if (problems.length) return { ok: false, line: `FAILED — ${PRODUCT.id} is registered, but ${problems.join("; ")}.` };
    return { ok: true, line: `OK — ${PRODUCT.id} ${checkOnly ? "is" : "is now"} registered: 4 price ids routed, active, forwardSecret set. Router counts: ${list.counts?.openUnrouted ?? "?"} unrouted, ${list.counts?.failed ?? "?"} failed.` };
  } catch {
    return { ok: false, line: "FAILED — the router could not be reached. Nothing is confirmed." };
  }
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(question); };
    rl.question(question, (a) => { rl.close(); process.stdout.write("\n"); resolve(a.trim()); });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), checkOnly = args.includes("--check"), priceIds = args.filter((a) => a !== "--check");
  const c = checkPrices(priceIds);
  if (!c.ok) { console.error(`FAILED — ${c.why}. Nothing was sent.`); process.exit(1); }
  const adminSecret = await askHidden("ROUTER_ADMIN_API_SECRET (hidden): ");
  if (!adminSecret) { console.error("FAILED — no ROUTER_ADMIN_API_SECRET typed. Nothing was sent."); process.exit(1); }
  let forwardSecret = null;
  if (!checkOnly) {
    forwardSecret = await askHidden("forwardSecret = AlmiVisibility's ROUTER_WEBHOOK_SECRET (hidden): ");
    const again = await askHidden("Type the forwardSecret again (hidden):  ");
    if (!forwardSecret || forwardSecret !== again) { console.error("FAILED — the two forwardSecrets are not the same. Nothing was sent."); process.exit(1); }
  }
  const r = await registerRoutes({ priceIds, adminSecret, forwardSecret, checkOnly });
  (r.ok ? console.log : console.error)(r.line);
  process.exit(r.ok ? 0 : 1);
}
