import type { NextConfig } from "next";

// ── SECURITY HEADERS ────────────────────────────────────────────────────────
// The app declared none: no CSP, no HSTS, no nosniff, no referrer policy, no frame
// protection. Everything below is applied to every route.
//
// ── ABOUT script-src, SAID PLAINLY ──────────────────────────────────────────
// `script-src` carries 'unsafe-inline' and that is NOT XSS protection. It is here because
// Next's App Router streams the RSC payload as inline `self.__next_f.push(...)` scripts, so a
// nonce-less CSP either allows inline script or breaks every page.
//
// The honest fix is a per-request nonce, which needs middleware this app does not have. Adding
// middleware to mint one is a real change with its own risks — it would run on every request in
// a repo that has no middleware today — so it is not being smuggled into a headers commit.
// What is NOT done here: pretending. A `script-src 'self'` that silently needs 'unsafe-inline'
// to work, or a nonce directive with no middleware to fill it, would read as protection in the
// config and provide none in the browser.
//
// The value in this policy therefore lives in the directives that DO hold without a nonce, and
// several of them close real classes of attack:
//   frame-ancestors 'none'  clickjacking — the one this app most plausibly faces
//   base-uri 'self'         stops an injected <base> repointing every relative URL
//   form-action 'self'      stops an injected form posting credentials off-site
//   object-src 'none'       kills the plugin vector outright
//   connect-src 'self'      an injected script cannot exfiltrate to an arbitrary host
//
// The origin list is short because the app genuinely has no third-party scripts, iframes or
// webfonts — checked, not assumed. The only remote origin is the AlmiWorld logo, already
// declared in `images` below. If a script, an embed or a font is ever added, it has to be
// added HERE too, on purpose.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://almiworld.com",
  "font-src 'self' data:",
  // Next injects inline <style> for critical CSS; same nonce story as scripts.
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // Vercel terminates TLS and sets HSTS on custom domains, but a header the app depends on and
  // does not declare is a header that silently disappears the day it is served from anywhere
  // else. Declared here so the guarantee belongs to the app.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Redundant with frame-ancestors for modern browsers, kept for the ones that only read this.
  { key: "X-Frame-Options", value: "DENY" },
  // Denying what this product does not use is free and makes that explicit.
  //
  // ⚠️ microphone=(self) IS LOAD-BEARING — do not "tidy" it back to microphone=().
  // Produzione orale records the learner through MediaRecorder/getUserMedia. This header used to
  // read microphone=(), which switches the microphone off at the BROWSER level: the recorder
  // shipped in #36 could not work in production no matter what the code did, and the failure is
  // silent from the app's side. The header predates the feature — it was written when "this
  // product asks for none of these" was true, and stayed after it stopped being true.
  //
  // (self) is the narrowest form that works: our own origin may ask for the microphone, and a
  // cross-origin iframe still may not.
  //
  // AlmiPTE solves the same problem by OMITTING microphone from its header entirely, which is
  // equivalent — the default allowlist for microphone is already `self`. It is written
  // explicitly here on purpose: an omitted directive is exactly what invited a hygiene sweep to
  // "complete" the list with microphone=() in the first place. Stated, it can be gated;
  // scripts/items/security-gate.mts now fails the build if it is removed or narrowed.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

// ── /guides -> /learn, PERMANENT ────────────────────────────────────────────
// The nine core guides become /learn articles. Slugs are unchanged 1:1, which is deliberate:
// the URLs have been live and indexed, and a rename would spend link equity for nothing.
//
// Listed one by one rather than as `/guides/:slug`. A wildcard would launder every typo and
// every dead URL under /guides into a /learn URL that then 404s, turning "this page never
// existed" into "this page moved and is now missing" — worse for a crawler and worse for a
// reader. An unlisted /guides/* stays a 404, which is the truth.
//
// statusCode: 301, NOT `permanent: true`.
//
// `permanent: true` emits **308**, not 301 — measured, not assumed: every one of these ten came
// back 308 on the first run. 308 and 301 are equivalent to Google, so nothing was broken, but the
// brief asks for 301 and a redirect table is exactly the kind of thing someone later verifies
// against a spec with curl. The only behavioural difference is that 308 preserves the request
// method on POST and 301 permits it to become GET; these are content URLs that are only ever
// GET, so the distinction costs nothing here.
const GUIDE_REDIRECTS: { from: string; to: string }[] = [
  { from: "/guides", to: "/learn" },
  { from: "/guides/cils-b1-cittadinanza", to: "/learn/cils-b1-cittadinanza" },
  { from: "/guides/a2-or-b1", to: "/learn/a2-or-b1" },
  { from: "/guides/how-italian-exams-score", to: "/learn/how-italian-exams-score" },
  { from: "/guides/capitalizzazione", to: "/learn/capitalizzazione" },
  { from: "/guides/2025-citizenship-reform", to: "/learn/2025-citizenship-reform" },
  { from: "/guides/reacquire-citizenship-2027", to: "/learn/reacquire-citizenship-2027" },
  { from: "/guides/celi-results-timeline", to: "/learn/celi-results-timeline" },
  { from: "/guides/cils-vs-celi", to: "/learn/cils-vs-celi" },
  { from: "/guides/exam-dates", to: "/learn/exam-dates" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "almiworld.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return GUIDE_REDIRECTS.map((r) => ({ source: r.from, destination: r.to, statusCode: 301 as const }));
  },
};

export default nextConfig;
