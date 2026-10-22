/**
 * RR-314 A1 (owner's live test, 22 Oct 2026: "Sign in to YouTube" showed "not a product id: https://accounts.google.com/o/oauth2/v2/").
 * Google's sign-in page opens in the client's OWN browser — the system browser, as Google requires for desktop apps — never inside the
 * app's window; Google sends the browser back to this app on 127.0.0.1 and the app finishes on its own. Only Google's own sign-in address
 * (or, in tests, the stand-in the config names) is ever opened. The address carries no secret.
 */
import { spawn } from "node:child_process";

export const GOOGLE_SIGNIN_ORIGIN = "https://accounts.google.com";

/** an opener for these sign-in addresses only. `mode` "fetch" is TESTS ONLY: a request plays the browser and follows the redirects back */
export function browserOpener({ origins = [], mode = null, spawnImpl = spawn, fetchImpl = fetch } = {}) {
  const allowed = new Set([GOOGLE_SIGNIN_ORIGIN, ...origins.filter(Boolean).map((x) => { try { return new URL(x).origin; } catch { return null; } }).filter(Boolean)]);
  return function openInBrowser(url) {
    let u; try { u = new URL(url); } catch { return false; }
    if (!allowed.has(u.origin)) return false;
    if (mode === "fetch") { fetchImpl(u.href, { redirect: "follow" }).catch(() => {}); return true; }
    try { spawnImpl("rundll32.exe", ["url.dll,FileProtocolHandler", u.href], { detached: true, stdio: "ignore", windowsHide: true }).unref(); return true; } catch { return false; }
  };
}
