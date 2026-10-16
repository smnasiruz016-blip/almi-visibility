/**
 * 🔴 F27 C5 (Acceptance Amendment 3, _handoffs 7b9a992) · THE HEADER DECLARATION F27 JUDGES THE LIVE PAGES UNDER — beta-g's TECHNICAL
 * decision of 16 October 2026 under the owner's standing delegation (RR-127 §2b), NOT owner policy:
 * _handoffs AlmiVisibility_BETA_G_DECISION_2026-10-16_F27_LIVE_HEADER_BASELINE.md. Basis: Mozilla HTTP Observatory's tests and scoring,
 * read 16 Oct 2026 (https://github.com/mozilla/http-observatory/blob/main/httpobs/docs/scoring.md).
 * Each rule is judged only on an HTML page served over https. The Content-Security-Policy is reported, never judged. Generic.
 */
export const LIVE_HEADER_BASELINE = Object.freeze({
  declaredBy: "beta-g, under the owner's standing delegation (RR-127 §2b) — technical, not owner policy",
  decision: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_BETA_G_DECISION_2026-10-16_F27_LIVE_HEADER_BASELINE.md", commit: "896eac8191ad5d2d8d1ef4b33ac208bb4a53ee47" }),
  basis: Object.freeze({ name: "Mozilla HTTP Observatory — tests and scoring", url: "https://github.com/mozilla/http-observatory/blob/main/httpobs/docs/scoring.md", readOn: "2026-10-16" }),
  rules: Object.freeze([
    Object.freeze({ name: "strict-transport-security", check: "HSTS_MIN_MAX_AGE", min: 15768000 }),
    Object.freeze({ name: "x-content-type-options", check: "NOSNIFF" }),
    Object.freeze({ name: "clickjacking (an enforced CSP frame-ancestors, or X-Frame-Options DENY or SAMEORIGIN)", check: "CLICKJACKING" }),
    Object.freeze({ name: "referrer-policy", check: "REFERRER_POLICY", failing: Object.freeze(["unsafe-url", "no-referrer-when-downgrade"]) }),
  ]),
});

/** The owner's GREEN of 16 Oct 2026 for the live pages: at most 60 read-only requests in all (both rows), at least 2 s apart, no retries. */
export const LIVE_CHECK_CEILING = 60;
