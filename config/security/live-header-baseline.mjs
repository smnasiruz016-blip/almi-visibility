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
    /* RR-272 (16 Oct 2026): the OWNER's decision replaces beta-g's referrer rule with Mozilla HTTP Observatory's, exactly
     * (_handoffs AlmiVisibility_OWNER_DECISION_2026-10-16_RR-272_F22_LIVE_GREEN_AND_CLEANUPS.md, a7b58ef; "3- ok."). See REFERRER_BASIS. */
    Object.freeze({ name: "referrer-policy", check: "REFERRER_POLICY", private: Object.freeze(["no-referrer", "same-origin", "strict-origin", "strict-origin-when-cross-origin"]), unsafe: Object.freeze(["origin", "origin-when-cross-origin", "unsafe-url", "no-referrer-when-downgrade"]) }),
  ]),
});

/**
 * The referrer rule's source, read 16 Oct 2026: mdn/mdn-http-observatory at main e486eba3a82c (14 Oct 2026) —
 * src/analyzer/tests/referrer-policy.js (last changed 1d5ec698fa75, 15 Jul 2026), and how its inputs are read: src/retriever/utils.js
 * parseHttpEquivHeaders (1d5ec698fa75) and src/analyzer/utils.js getHttpHeaders (2d230d2bb613). Its rule, as judgeHeaderRule applies it:
 *   - the values are every Referrer-Policy header value, then the content of the LAST <meta name="referrer"> (a meta that has both
 *     http-equiv and content is not read for it), joined by commas; the LAST value that is one of the eight named decides;
 *   - neither header nor meta: "not implemented" — PASS (the Observatory scores it 0 and passes it);
 *   - the deciding value is private: PASS; unsafe: FAIL; no value is one of the eight: FAIL ("header invalid");
 *   - it is read only for an HTML response (text/html or application/xhtml+xml); F27 applies every rule to an HTML page over https only.
 */
export const REFERRER_BASIS = Object.freeze({
  name: "Mozilla HTTP Observatory — the referrer-policy test",
  url: "https://github.com/mdn/mdn-http-observatory/blob/e486eba3a82c/src/analyzer/tests/referrer-policy.js",
  inputs: Object.freeze(["https://github.com/mdn/mdn-http-observatory/blob/e486eba3a82c/src/retriever/utils.js", "https://github.com/mdn/mdn-http-observatory/blob/e486eba3a82c/src/analyzer/utils.js"]),
  readOn: "2026-10-16",
});

/** The owner's GREEN of 16 Oct 2026 for the live pages: at most 60 read-only requests in all (both rows), at least 2 s apart, no retries. */
export const LIVE_CHECK_CEILING = 60;
