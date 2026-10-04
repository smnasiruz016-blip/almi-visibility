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
/** A source's own error shape (error_id / error_name, as its error page documents), or a transport's NOT_JSON / HTTP refusal, as a code. */
export function sourceRefusal(response) {
  if (!response || typeof response !== "object") return "SOURCE_REFUSED:NO_RESPONSE";
  if (response.error_id === undefined && response.error_name === undefined) return null;
  const name = String(response.error_name ?? response.error_id);
  return `SOURCE_REFUSED:${/^[A-Za-z0-9_]{1,40}$/.test(name) ? name : "UNNAMED"}`;
}

/** One page of one search, then one recheck of exactly the returned ids. Refusals stop the run; nothing is retried around them. */
export async function collect({ transport, clock, cap, site, q, language, pagesize }) {
  const g = createGovernor({ cap, dedupeWindowSeconds: DOCUMENTED.dedupeWindowSeconds, clock });
  const params = { site, q, pagesize, page: 1, filter: "default" };
  /* the first request of a fresh governor cannot be refused (cap ≥ 1 or it throws; no quota, backoff or prior identity yet) — RR-121 */
  const first = await g.request(SEARCH, params, transport);
  /* RR-155 (F16 C10, C13): an error, a throttle or a bot challenge is a REFUSAL, never an empty result — reading it as zero would be a
   * false zero. Nothing is recorded as retrieved and nothing is rechecked; the run ends. */
  const refusedBySource = sourceRefusal(first.response);
  if (refusedBySource) return { recorded: null, recheck: null, tally: g.tally(), stoppedBy: refusedBySource };
  const items = Array.isArray(first.response?.items) ? first.response.items : [];
  const recorded = { recordedAt: isoAt(clock()), request: { site, q, language }, response: { items } };
  const ids = items.map((p) => p?.question_id).filter(Number.isInteger);
  if (ids.length === 0) return { recorded, recheck: { recordedAt: isoAt(clock()), response: { items: [] } }, tally: g.tally(), stoppedBy: null };
  /* RR-155 (F16 C10): a backoff the source asks for is honoured as a refusal of the rest of this run — no recheck, nothing admitted */
  if (Number.isInteger(first.response?.backoff) && first.response.backoff > 0) return { recorded, recheck: null, tally: g.tally(), stoppedBy: "BACKOFF_REQUESTED" };
  /* RR-157 · C15: the recheck reads each original post with its body, so a judgement can quote it (filter name NOT VERIFIED live) */
  const again = await g.request(BY_IDS, { site, ids: ids.join(";"), filter: "withbody" }, transport);
  if (again.refused) return { recorded, recheck: null, tally: g.tally(), stoppedBy: again.refused };
  const recheckRefused = sourceRefusal(again.response);
  if (recheckRefused) return { recorded, recheck: null, tally: g.tally(), stoppedBy: recheckRefused };
  return { recorded, recheck: { recordedAt: isoAt(clock()), response: { items: Array.isArray(again.response?.items) ? again.response.items : [] } }, tally: g.tally(), stoppedBy: null };
}

/**
 * RR-159 · F16 C22 · READ THE ORIGINAL POSTS AT LEAD ADDRESSES — one read of exactly the posts the leads named, then one recheck of exactly
 * the posts that read returned (with their body, for the meaning judgement), through the same governor and cap. A post the read does not
 * return does not exist there: its lead is DEAD. `proceed` is asked before the recheck — a run in flight stops there when it says no.
 */
export async function collectByIds({ transport, clock, cap, site, ids, language, proceed = () => true }) {
  const g = createGovernor({ cap, dedupeWindowSeconds: DOCUMENTED.dedupeWindowSeconds, clock });
  const wanted = [...new Set((ids ?? []).filter(Number.isInteger))];
  if (wanted.length === 0) return { recorded: null, recheck: null, tally: g.tally(), stoppedBy: null, returnedIds: [] };
  const first = await g.request(BY_IDS, { site, ids: wanted.join(";"), filter: "default" }, transport);
  const refusedBySource = sourceRefusal(first.response);
  if (refusedBySource) return { recorded: null, recheck: null, tally: g.tally(), stoppedBy: refusedBySource, returnedIds: [] };
  const items = (Array.isArray(first.response?.items) ? first.response.items : []).filter((p) => wanted.includes(p?.question_id));
  const recorded = { recordedAt: isoAt(clock()), request: { site, language, leadAddresses: wanted.length }, response: { items } };
  const returnedIds = items.map((p) => p.question_id);
  if (returnedIds.length === 0) return { recorded, recheck: { recordedAt: isoAt(clock()), response: { items: [] } }, tally: g.tally(), stoppedBy: null, returnedIds };
  if (Number.isInteger(first.response?.backoff) && first.response.backoff > 0) return { recorded, recheck: null, tally: g.tally(), stoppedBy: "BACKOFF_REQUESTED", returnedIds };
  if (!proceed()) return { recorded, recheck: null, tally: g.tally(), stoppedBy: "DISCONNECTED", returnedIds };
  const again = await g.request(BY_IDS, { site, ids: returnedIds.join(";"), filter: "withbody" }, transport);
  if (again.refused) return { recorded, recheck: null, tally: g.tally(), stoppedBy: again.refused, returnedIds };
  const recheckRefused = sourceRefusal(again.response);
  if (recheckRefused) return { recorded, recheck: null, tally: g.tally(), stoppedBy: recheckRefused, returnedIds };
  return { recorded, recheck: { recordedAt: isoAt(clock()), response: { items: Array.isArray(again.response?.items) ? again.response.items : [] } }, tally: g.tally(), stoppedBy: null, returnedIds };
}
