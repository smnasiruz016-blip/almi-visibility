/**
 * 🔴 F44 C8 · THE BROWSER ROUTE THE ENGINE STARTS ON THE CLIENT'S OWN COMPUTER (RR-277; owner decision 17 Oct 2026, _handoffs d6d43af:
 * "yes it should" — a visible browser window on the client's computer, the client always starts it).
 *
 * A VISIBLE window with its own fresh, separate profile: a browser the engine launches with nothing of the client's — no profile, no tab,
 * no saved password, no imported cookie — and a NEW context for every read, so nothing one site sets reaches the next. It never types,
 * never clicks, never solves; it only opens a page, waits for it to settle and reads its visible text. What it saw is handed back with a
 * signal when the page is a captcha, a bot-check, a login wall or a consent wall; src/facts/source-reader.mjs browserRead decides from that
 * (it stops the route for the host, paces every read, keeps the run cap) — this file decides nothing.
 *
 * Generic: it names no client, product or host.
 */
import { BLOCK } from "./source-reader.mjs";
import { parseRobots, isAllowedByRules, USER_AGENT } from "../crawl/robots.mjs";

/* the marks of a page that is not the page — declared words, never a score */
const CAPTCHA = /(g-recaptcha|recaptcha\/api|hcaptcha|challenges\.cloudflare\.com\/turnstile|cf-turnstile|\bcaptcha\b)/i;
const CHALLENGE = /(just a moment\.\.\.|checking your browser|verify you are (a )?human|are you a robot|attention required|access denied|request unsuccessful\. incapsula|pardon our interruption|cf-challenge|challenge-platform|_incapsula_resource|perimeterx|px-captcha)/i;
const LOGIN = /<input[^>]+type=["']?password/i;
const LOGIN_PATH = /\/(log-?in|sign-?in|auth|account\/login)(\/|\?|$)/i;
const CONSENT = /(accept (all )?cookies|cookie (consent|settings|preferences)|we use cookies|manage (your )?consent|your privacy choices|consent to (the use of )?cookies)/i;
/** Below this many characters of visible text a consent prompt is taken to cover the page, not to sit beside it. */
export const CONSENT_COVERS_BELOW = 400;
/** Below this many characters of visible text a captcha, bot-check or login form IS the page; above it, it sits in a footer or a header
 *  ("protected by reCAPTCHA", a sign-in box) beside the content, and the page is read. */
export const WALL_COVERS_BELOW = 1500;

/** What a read saw, as a signal: CAPTCHA · CHALLENGE (a bot-check) · LOGIN_WALL · CONSENT_WALL · null. Pure. */
export function browserSignal({ html = "", text = "", landedUrl = "" } = {}) {
  const h = String(html), t = String(text);
  const wall = t.replace(/\s+/g, " ").trim().length < WALL_COVERS_BELOW;
  if (wall && (CAPTCHA.test(h) || CAPTCHA.test(t))) return BLOCK.CAPTCHA;
  if (wall && (CHALLENGE.test(h) || CHALLENGE.test(t))) return BLOCK.CHALLENGE;
  let path = ""; try { path = new URL(landedUrl).pathname; } catch { /* no landed URL */ }
  if (LOGIN_PATH.test(path) || (wall && LOGIN.test(h))) return BLOCK.LOGIN_WALL;
  if (CONSENT.test(t) && t.trim().length < CONSENT_COVERS_BELOW) return BLOCK.CONSENT_WALL;
  return null;
}

/** The robots verdict for a URL from a robots file the window read: ALLOWED · DISALLOWED · UNKNOWN (fail closed). Pure. */
export function robotsVerdict({ status, body, url }) {
  if (status === 404 || status === 410) return { state: "ALLOWED", reason: `no robots file (HTTP ${status})` };
  if (status !== 200 || typeof body !== "string") return { state: "UNKNOWN", reason: `HTTP ${status ?? "none"}` };
  if (browserSignal({ html: body, text: body }) !== null || /<html[\s>]/i.test(body)) return { state: "UNKNOWN", reason: "the robots address answered with a page, not a robots file" };
  const allowed = isAllowedByRules(parseRobots(body, USER_AGENT), url);
  return allowed ? { state: "ALLOWED", reason: "allowed by the host's robots file" } : { state: "DISALLOWED", reason: "disallowed by the host's robots file" };
}

/**
 * Open the route: a visible browser, launched by the engine — Playwright's own Chromium when it is installed, else the computer's Edge or
 * Chrome BINARY with a temporary, separate profile (Playwright never opens a launched browser with the computer's own profile). Returns the
 * route browserRead uses: { connected, startedByClient, cap, browser, read(url), robots(url), close() }.
 * @param {{ cap: number, startedByClient: boolean, loadPlaywright: () => Promise<{chromium?: object, unavailable?: string}>, settleMs?: number, timeoutMs?: number }} o
 */
export async function openBrowserRoute({ cap, startedByClient, loadPlaywright, settleMs = 6000, timeoutMs = 45000 }) {
  if (startedByClient !== true) throw new Error("the browser route opens only when the client starts it");
  const pw = await loadPlaywright();
  if (pw.unavailable) throw new Error(`no browser here: ${pw.unavailable}`);
  let browser = null, name = null, last = null;
  for (const [label, opts] of [["playwright-chromium", {}], ["edge", { channel: "msedge" }], ["chrome", { channel: "chrome" }]]) {
    try { browser = await pw.chromium.launch({ headless: false, ...opts }); name = `${label} ${browser.version()}`; break; } catch (e) { last = e; }
  }
  if (!browser) throw new Error(`no browser could be launched: ${String(last?.message ?? last).split("\n")[0]}`);
  /* a new context for every read: no cookie, storage or service worker crosses from one page to the next; downloads refused */
  const fresh = () => browser.newContext({ acceptDownloads: false, serviceWorkers: "block" });
  const robotsCache = new Map();
  return Object.freeze({
    connected: true,
    startedByClient: true,
    cap,
    browser: name,
    async robots(url) {
      const origin = new URL(url).origin;
      if (robotsCache.has(origin)) return robotsCache.get(origin);
      const ctx = await fresh();
      try {
        const page = await ctx.newPage();
        const res = await page.goto(`${origin}/robots.txt`, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        const body = res ? await res.text().catch(() => null) : null;
        const verdict = robotsVerdict({ status: res?.status() ?? null, body, url });
        robotsCache.set(origin, verdict);
        return verdict;
      } catch (e) {
        const verdict = { state: "UNKNOWN", reason: `the robots file could not be opened (${String(e?.message ?? e).split("\n")[0]})` };
        robotsCache.set(origin, verdict);
        return verdict;
      } finally { await ctx.close(); }
    },
    async read(url) {
      const ctx = await fresh();
      try {
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        /* let the page settle — its own scripts run; nothing is clicked or typed */
        await page.waitForLoadState("networkidle", { timeout: settleMs }).catch(() => {});
        const landedUrl = page.url();
        const html = await page.content();
        const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
        return { text, landedUrl, signal: browserSignal({ html, text, landedUrl }), browser: name };
      } finally { await ctx.close(); }
    },
    async close() { await browser.close(); },
  });
}
