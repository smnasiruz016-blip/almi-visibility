/**
 * F16 · THE STACK EXCHANGE COLLECTOR — one bounded search and one recheck, through the request governor (RR-121; pilot proposal
 * _handoffs AlmiVisibility_RR-121_API_SHAPE_AND_PILOT_2026-10-01.md). 🔴 It holds no transport: the caller injects one. In this
 * repository only tests inject one, and it is a recorded fixture. Its output is a recorded response and a recorded recheck — exactly what
 * the adapter (stack-exchange.mjs) and bin/source-intake.mjs --adapter read.
 *
 * DOCUMENTED (throttle page, read 2026-10-01): no semantically identical request more than once a minute; `backoff` = seconds to wait
 * before the same method again; > 30 requests a second per IP is cut off; the keyed daily quota defaults to 10,000. The pilot's own cap is
 * far below every one of them.
 */
import { createGovernor } from "../request-governor.mjs";

export const DOCUMENTED = Object.freeze({ dedupeWindowSeconds: 60, ipRequestsPerSecondCutoff: 30, defaultDailyQuota: 10000 });
/* RR-126: full-text search, `var method = "/2.3/search/advanced";` on its own documentation page — q matches "based on an undocumented
 * algorithm", so a hit is only a LEAD: the relevance gate (source-adapter.mjs) decides what may enter a subject's batch */
export const SEARCH = "/2.3/search/advanced", BY_IDS = "/2.3/questions/{ids}";
const isoAt = (s) => new Date(s * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

/** One page of one search, then one recheck of exactly the returned ids. Refusals stop the run; nothing is retried around them. */
export async function collect({ transport, clock, cap, site, q, language, pagesize }) {
  const g = createGovernor({ cap, dedupeWindowSeconds: DOCUMENTED.dedupeWindowSeconds, clock });
  const params = { site, q, pagesize, page: 1, filter: "default" };
  /* the first request of a fresh governor cannot be refused (cap ≥ 1 or it throws; no quota, backoff or prior identity yet) — RR-121 */
  const first = await g.request(SEARCH, params, transport);
  const items = Array.isArray(first.response?.items) ? first.response.items : [];
  const recorded = { recordedAt: isoAt(clock()), request: { site, q, language }, response: { items } };
  const ids = items.map((p) => p?.question_id).filter(Number.isInteger);
  if (ids.length === 0) return { recorded, recheck: { recordedAt: isoAt(clock()), response: { items: [] } }, tally: g.tally(), stoppedBy: null };
  const again = await g.request(BY_IDS, { site, ids: ids.join(";"), filter: "default" }, transport);
  if (again.refused) return { recorded, recheck: null, tally: g.tally(), stoppedBy: again.refused };
  return { recorded, recheck: { recordedAt: isoAt(clock()), response: { items: Array.isArray(again.response?.items) ? again.response.items : [] } }, tally: g.tally(), stoppedBy: null };
}
