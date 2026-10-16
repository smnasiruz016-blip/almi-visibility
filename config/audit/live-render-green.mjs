/**
 * F22 · THE OWNER'S GREEN FOR A LIVE RENDER OF THE CLIENT'S LIVE PAGES (16 Oct 2026, _handoffs AlmiVisibility_OWNER_DECISION_2026-10-16_
 * OVERNIGHT_F27_F22_READ_ONLY_LIVE_GUIDES.md): read-only requests to the client's own LIVE pages, at most 60 in all — shared with F27's
 * live check, which made 25 — at least 2 s apart, no retries. Nothing is written to the site, and no other host is requested.
 *
 * These are the bounds a live render runs under (src/render/same-origin-policy.mjs): the run's total request ceiling (robots, documents,
 * subresources, redirect hops — every request), the interval between two requests, and no retry. A run may ask for fewer, never more.
 */
export const LIVE_RENDER_GREEN = Object.freeze({
  maxRequests: 35,
  intervalMs: 2000,
  retries: 0,
});
