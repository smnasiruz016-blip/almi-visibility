/**
 * F22 · THE OWNER'S GREEN FOR A LIVE RENDER OF THE CLIENT'S LIVE PAGES.
 *
 * 16 Oct 2026, RR-272 (_handoffs AlmiVisibility_OWNER_DECISION_2026-10-16_RR-272_F22_LIVE_GREEN_AND_CLEANUPS.md; the owner, verbatim:
 * "logo ki permission to aap ko pehlay hi day dee thee." and "1- f22 green."): read-only requests to the client's LIVE pages AND their own
 * subresources on the same site (logo, CSS, JS, fonts, images served by the page's own origin) — at most 100 requests in all, at least 2 s
 * apart, no retries. No other host: a subresource on any other origin is refused and named in the stored render, never requested.
 * It replaces the overnight GREEN of 16 Oct 2026 (_handoffs AlmiVisibility_OWNER_DECISION_2026-10-16_OVERNIGHT_F27_F22_READ_ONLY_LIVE_
 * GUIDES.md: 35 requests, the page addresses only), whose "12 URLs" wording was beta-g's, not the owner's limit.
 *
 * These are the bounds a live render runs under (src/render/same-origin-policy.mjs): the run's total request ceiling (robots, documents,
 * subresources, redirect hops — every request), the interval between two requests, and no retry. A run may ask for fewer, never more.
 */
export const LIVE_RENDER_GREEN = Object.freeze({
  maxRequests: 100,
  intervalMs: 2000,
  retries: 0,
  /* false: a page's own subresources are inside the GREEN (RR-272) — they are requested through the bounded policy like the page itself */
  pagesOnly: false,
  /* a subresource is requested only from the PAGE'S OWN origin: any other origin — even one the client declares — is THIRD_PARTY, refused
   * before any request and recorded by host */
  sameOriginOnly: true,
});
