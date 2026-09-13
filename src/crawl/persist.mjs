/**
 * PERSIST A CRAWL'S OBSERVATIONS — the one write path, shared.
 *
 * `bin/crawl.mjs` persists a live run through this, and `bin/replay-crawl.mjs`
 * persists a local replay through the SAME function. That is what lets a replay
 * prove the crawler's persistence is idempotent: it exercises the production
 * write path, not a copy of it.
 *
 * 🔴 appendIfNew, never append. A `measurement_key` carries no clock, so a page
 * read twice with identical bytes is ONE observation plus a re-sighting, and a
 * page whose bytes changed is a genuinely NEW observation. The outcome for every
 * observation is returned, so a caller can report the two apart.
 */
export function persistCrawlObservations(store, observations) {
  const out = { appended: 0, resighted: 0, outcomes: [] };
  for (const o of observations) {
    const w = store.appendIfNew(o, { seenAt: o.observed_at });
    out[w.appended ? "appended" : "resighted"] += 1;
    out.outcomes.push({
      observation_id: o.observation_id,
      stored_observation_id: w.observation_id,
      requested_url: o.value?.requested_url ?? null,
      appended: w.appended,
    });
  }
  return out;
}
