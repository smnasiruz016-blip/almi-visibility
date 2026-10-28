/**
 * RR-314 A1 (owner's live test, 22 Oct 2026: "Sign in to YouTube" showed "not a product id: https://accounts.google.com/o/oauth2/v2/").
 * Google's sign-in page opens in the client's OWN browser — the system browser, as Google requires for desktop apps — never inside the
 * app's window; Google sends the browser back to this app on 127.0.0.1 and the app finishes on its own. Only Google's own sign-in address
 * (or, in tests, the stand-in the config names) is ever opened. The address carries no secret.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const GOOGLE_SIGNIN_ORIGIN = "https://accounts.google.com";
/* RR-340: the buyer's own Stripe page ("Manage or cancel my plan") — an opener made with `only` opens these addresses and nothing else */
export const STRIPE_BILLING_ORIGIN = "https://billing.stripe.com";
/* RR-314 (owner, 22 Oct: "please use Chrome — Chrome is set to the account"): Google's page opens in CHROME when it is installed (its
 * last-used profile, where the client is signed in to Google); only without Chrome, in the system's default browser */
export const CHROME_PATHS = Object.freeze([
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ...(process.env.LOCALAPPDATA ? [join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")] : []),
]);

/** an opener for these sign-in addresses only. `mode` "fetch" is TESTS ONLY: a request plays the browser and follows the redirects back */
export function browserOpener({ origins = [], only = null, mode = null, spawnImpl = spawn, fetchImpl = fetch, exists = existsSync, chromePaths = CHROME_PATHS, platform = process.platform } = {}) {
  const originOf = (x) => { try { return new URL(x).origin; } catch { return null; } };
  const allowed = new Set(only ? only.filter(Boolean).map(originOf).filter(Boolean) : [GOOGLE_SIGNIN_ORIGIN, ...origins.filter(Boolean).map(originOf).filter(Boolean)]);
  return function openInBrowser(url) {
    let u; try { u = new URL(url); } catch { return false; }
    if (!allowed.has(u.origin)) return false;
    if (mode === "fetch") { fetchImpl(u.href, { redirect: "follow" }).catch(() => {}); return true; }
    if (mode === "none") return false; // tests: never a real browser tab; the screen offers the address to copy
    const chrome = chromePaths.find((p) => { try { return exists(p); } catch { return false; } });
    /* a browser that cannot start is reported later as an 'error' EVENT, not a throw — unheard, it ends the whole app (CI, RR-314) */
    const run = (file, args, opts) => { const c = spawnImpl(file, args, opts); c.on?.("error", () => {}); c.unref(); };
    try {
      if (chrome) { run(chrome, [u.href], { detached: true, stdio: "ignore" }); return "Chrome"; } // the address is one argument — no shell reads it
      if (platform !== "win32") return false;
      run("rundll32.exe", ["url.dll,FileProtocolHandler", u.href], { detached: true, stdio: "ignore", windowsHide: true });
      return true;
    } catch { return false; }
  };
}
