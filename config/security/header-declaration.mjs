/**
 * 🔴 F27 C5 · THE DECLARATION OF WHICH RESPONSE HEADERS F27 CHECKS — made by CC under the owner's EXPRESS delegation (F27 Acceptance
 * Amendment 2, _handoffs 258141f): RR-127 §2b ("Do NOT ask the owner to choose headers by name. That is technical work and it is yours."
 * and "Do NOT silently make every header mandatory for every kind of site.") and RR-129 §3. Grounded in the established guidance recorded
 * at _handoffs db04da0 (OWASP HTTP Headers Cheat Sheet, 15 of 15 quotes verbatim).
 *
 * NO HEADER IS MANDATORY FOR EVERY PAGE. Each applies only where the page's OWN recorded type or behaviour calls for it, read from what F27's
 * INPUT holds — the final URL's scheme and the stored raw HTML. Header VALUES are never read (F27's INPUT is header NAMES).
 * Generic: no product, no client, no site.
 */
export const HEADER_DECLARATION = Object.freeze({
  declaredBy: "CC, under the owner's express delegation (RR-127 §2b; RR-129 §3)",
  amendment: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F27_ACCEPTANCE_AMENDMENT_2_2026-10-02.md", commit: "258141f75f5a89880711e2180a7765c88cc42243" }),
  headers: Object.freeze([
    Object.freeze({ name: "strict-transport-security", appliesWhen: "SERVED_OVER_HTTPS", why: "instructs browsers to only access the website using HTTPS" }),
    Object.freeze({ name: "content-security-policy", appliesWhen: "HTML_RUNS_SCRIPT", why: "helps to detect and mitigate certain types of attacks, including Cross-Site Scripting (XSS) and data injection attacks" }),
    Object.freeze({ name: "x-content-type-options", appliesWhen: "ANY_FETCHED_RESPONSE", why: "used to block browsers' MIME type sniffing" }),
    Object.freeze({ name: "referrer-policy", appliesWhen: "HTML_PAGE", why: "controls how much referrer information (sent via the Referer header) should be included with requests" }),
    Object.freeze({ name: "x-frame-options", appliesWhen: "HTML_PAGE", frameProtection: true, why: "to avoid clickjacking attacks, by ensuring that their content is not embedded into other sites" }),
    Object.freeze({ name: "permissions-policy", appliesWhen: "HTML_EMBEDS_FRAMES_OR_POWERFUL_APIS", why: "control which origins can use which browser features, both in the top-level page and in embedded frames" }),
  ]),
  /* "Do not set this header or explicitly turn it off." — its presence is never a credit, so it is never judged as one */
  neverCredited: Object.freeze(["x-xss-protection"]),
  /* tied to cross-origin isolation, which no recorded page behaviour shows; applying them blind can break a site */
  notAssessed: Object.freeze(["cross-origin-opener-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy"]),
});
