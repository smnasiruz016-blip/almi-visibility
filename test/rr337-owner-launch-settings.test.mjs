/**
 * RR-337 · /owner lists every launch variable by NAME as "set" or "missing" — never a value. VISIBILITY_BILLING_LIVE missing is correct until
 * the owner's launch GREEN. The router tool's next step names ROUTER_WEBHOOK_SECRET, never the secret.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { launchVarsOf, LAUNCH_VARS } from "../site/app.mjs";
import { ownerPage } from "../site/pages.mjs";
import { VERCEL_STEP } from "../site/owner-router-register.mjs";

const VALUE = "zz-a-value-that-must-never-be-shown-zz";

test("RR-337 · launch settings: names and set/missing only; a needed one missing opens the box; the billing switch is not a gap", () => {
  const names = LAUNCH_VARS.map(([n]) => n);
  for (const n of ["LICENCE_SIGNING_KEY", "LICENCE_PUBLIC_KEY", "SITE_ADMIN_PASSWORD_HASH", "STRIPE_SECRET_KEY", "STRIPE_PRICE_ID_VISIBILITY_1", "STRIPE_PRICE_ID_VISIBILITY_UNLIMITED", "ROUTER_WEBHOOK_SECRET", "VISIBILITY_BILLING_LIVE"]) assert.ok(names.includes(n), n);
  const all = Object.fromEntries(LAUNCH_VARS.filter(([, , needed]) => needed).map(([n]) => [n, VALUE]));
  const full = ownerPage({ launch: launchVarsOf(all) });
  assert.ok(!full.includes(VALUE), "a value reached the page");
  assert.match(full, /Launch settings in Vercel — all needed are set/);
  assert.match(full, /<code>VISIBILITY_BILLING_LIVE<\/code><\/td><td>[^<]*<\/td><td>missing \(correct for now\)/);
  assert.ok(!/<details open data-launch>/.test(full));
  const { ROUTER_WEBHOOK_SECRET, ...gap } = all;
  const html = ownerPage({ launch: launchVarsOf({ ...gap, OTHER: "  " }) });
  assert.match(html, /<details open data-launch><summary>Launch settings in Vercel — 1 needed missing/);
  assert.match(html, /<code>ROUTER_WEBHOOK_SECRET<\/code><\/td><td>[^<]*<\/td><td><span class="err">missing/);
  assert.equal(launchVarsOf({ STRIPE_SECRET_KEY: "   " }).find((r) => r.name === "STRIPE_SECRET_KEY").set, false, "blank is missing");
});

test("RR-337 · the router tool's next step names the Vercel variable, and carries no secret", () => {
  assert.match(VERCEL_STEP, /ROUTER_WEBHOOK_SECRET = the same forwardSecret/);
  assert.match(VERCEL_STEP, /deploy again/);
});
