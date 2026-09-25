/**
 * 🔴 A LOCAL REPLAY OF A REAL CRAWL — NOT A FIXTURE.
 *
 * The bodies served here are the bodies a real crawl captured (12 September
 * 2026, 394 pages), recovered from the run's own Actions artifact and verified
 * byte for byte against each observation's `content_sha256`. They are served
 * from 127.0.0.1 at their real sizes with their real headers. LAW-FIXTURE-1 is
 * satisfied because the double is production's own output, not a tidy
 * imitation of it.
 *
 * ── WHAT A REPLAY PROVES, AND WHAT IT DOES NOT ──────────────────────────────
 *
 * It proves ENGINE properties over real inputs: identity across runs, that the
 * same job twice does not duplicate, that a changed target is re-tested.
 *
 * 🔴 It does NOT prove the crawler still reaches the live internet today. The
 * 12 September run proved that; a replay does not re-prove it and must not
 * claim to. It also serves only the robots.txt files that were stored, and a
 * 404 for hosts whose file was not — which the robots cache reads as "no
 * robots.txt, allowed".
 *
 * This module names no product; the caller supplies the records.
 */

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { crawl } from "./crawler.mjs";
import { buildInventory } from "./inventory.mjs";
import { persistCrawlObservations } from "./persist.mjs";
import { sha256Hex } from "../evidence/ids.mjs";

/** The only hosts a replay may fetch from: this machine (the replay server binds 127.0.0.1). */
const LOCAL_HOSTS = Object.freeze(["127.0.0.1"]);

/**
 * The replay set: every FETCHED observation of the recorded run whose body is
 * in `corpusDir`, keyed by requested URL, with an integrity verdict per body.
 */
export function replayEntriesFrom({ crawlRecords, corpusDir = null, bodies = null }) {
  if (!corpusDir === !bodies) throw new TypeError("replayEntriesFrom: give exactly one of corpusDir or bodies (observation_id → body)");
  const entries = new Map();
  let missing = 0;
  for (const o of crawlRecords) {
    if (o.record_type !== "observation" || o.value?.skipped) continue;
    let body;
    if (bodies) {
      body = bodies.get(o.observation_id);
    } else {
      const file = join(corpusDir, `${o.observation_id}.html`);
      body = existsSync(file) ? readFileSync(file, "utf8") : undefined;
    }
    if (body === undefined) {
      missing += 1;
      continue;
    }
    entries.set(o.value.requested_url, {
      observation_id: o.observation_id,
      requested_url: o.value.requested_url,
      final_url: o.value.final_url ?? o.value.requested_url,
      status: o.value.status,
      headers: o.value.response_headers_subset ?? {},
      body,
      bytes: Buffer.byteLength(body, "utf8"),
      shaMatches: sha256Hex(body) === o.content_sha256,
    });
  }
  return { entries, missing };
}

export async function startReplayServer({ entries, robotsByHost, bodies }) {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    const u = new URL(req.url, "http://127.0.0.1");
    if (u.pathname === "/robots") {
      const r = robotsByHost.get(u.searchParams.get("h"));
      if (!r?.value?.body) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("no stored robots.txt");
      }
      res.writeHead(200, { "content-type": "text/plain" });
      return res.end(r.value.body);
    }
    const e = entries.get(u.searchParams.get("u"));
    if (!e) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("not in the replay set");
    }
    const headers = { "content-type": e.headers["content-type"] ?? "text/html" };
    for (const h of ["x-robots-tag", "cache-control", "last-modified", "etag"]) if (e.headers[h]) headers[h] = e.headers[h];
    res.writeHead(e.status ?? 200, headers);
    res.end(bodies.get(e.requested_url) ?? e.body);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    requests,
    close: () => new Promise((r) => server.close(r)),
  };
}

/**
 * The fetch the crawler is handed: every URL is rewritten to 127.0.0.1, the
 * local URL is RECORDED, and the response reports the recorded final URL so a
 * page that redirected in the real run redirects in the replay.
 */
export function makeReplayFetch({ origin, entries, egress, realFetch = globalThis.fetch }) {
  /* 🔴 F03: LOCAL ONLY, ENFORCED — the replay server's own origin, never another host. Every request below is rewritten to
   * this origin, so a non-local origin would make the replay an undeclared external connection: it is refused here. */
  if (!LOCAL_HOSTS.includes(new URL(origin).hostname)) throw new Error("REPLAY_ORIGIN_NOT_LOCAL: a replay fetches only from this machine");
  return async (url, init = {}) => {
    const u = new URL(url);
    const local = u.pathname === "/robots.txt"
      ? `${origin}/robots?h=${encodeURIComponent(u.hostname)}`
      : `${origin}/page?u=${encodeURIComponent(url)}`;
    egress.push(local);
    const r = await realFetch(local, { headers: init.headers, signal: init.signal });
    const e = entries.get(url);
    return {
      status: r.status,
      ok: r.ok,
      url: e?.final_url ?? url,
      redirected: Boolean(e && e.final_url !== url),
      headers: r.headers,
      body: r.body,
      text: () => r.text(),
    };
  };
}

/** One crawl pass over the replay, persisted through the production write path. */
export async function runReplayPass({ entries, robotsByHost, bodies = new Map(), store, seedSource, now = () => new Date() }) {
  const server = await startReplayServer({ entries, robotsByHost, bodies });
  const egress = [];
  try {
    const t0 = Date.now();
    const result = await crawl({
      seeds: [...entries.keys()],
      seedSource,
      fetchImpl: makeReplayFetch({ origin: server.origin, entries, egress }),
      live: true,
      fetcherOptions: { intervalMs: 0 },
      now,
    });
    const persisted = persistCrawlObservations(store, result.observations);
    const inventory = buildInventory({
      observations: result.observations.map((o) => ({ ...o.value, observation_id: o.observation_id, observed_at: o.observed_at })),
      edges: [],
    });
    return { run: result.run, observations: result.observations, bodies: result.bodies, persisted, inventory, egress, seconds: (Date.now() - t0) / 1000 };
  } finally {
    await server.close();
  }
}

/** The page_id each requested URL resolved to in one pass. */
export function pageIdsByUrl(pass) {
  const byObs = new Map();
  for (const p of pass.inventory.pages) for (const id of p.observations) byObs.set(id, p.page_id);
  const out = new Map();
  for (const o of pass.observations) out.set(o.value.requested_url, byObs.get(o.observation_id) ?? null);
  return out;
}

/**
 * ITEM 11 and ITEM 48 over two passes. Every figure is kept apart: page_ids
 * that held and moved; for UNCHANGED bodies, new measurements versus
 * re-sightings; for CHANGED bodies, new observations and any new page record.
 */
export function comparePasses({ pass1, pass2, changedUrls, storedObservations }) {
  const ids1 = pageIdsByUrl(pass1);
  const ids2 = pageIdsByUrl(pass2);
  const moved = [...ids1.keys()].filter((u) => ids1.get(u) !== ids2.get(u));

  const outcome2 = new Map(pass2.persisted.outcomes.map((o) => [o.requested_url, o]));
  const unchanged = [...ids1.keys()].filter((u) => !changedUrls.includes(u));
  const unchangedNew = unchanged.filter((u) => outcome2.get(u)?.appended);
  const changedNew = changedUrls.filter((u) => outcome2.get(u)?.appended);

  const combined = buildInventory({
    observations: storedObservations
      .filter((o) => o.record_type === "observation")
      .map((o) => ({ ...o.value, observation_id: o.observation_id, observed_at: o.observed_at })),
    edges: [],
  });
  const byId = new Map(combined.pages.map((p) => [p.page_id, p]));
  const changedChains = changedUrls.map((u) => {
    const page = byId.get(ids2.get(u));
    return { url: u, page_id: ids2.get(u), sameIdBothRuns: ids1.get(u) === ids2.get(u), observationsOnPage: page?.observations.length ?? 0, pageRecordsWithThisUrl: combined.pages.filter((p) => p.page_id === ids2.get(u)).length };
  });

  return {
    urls: ids1.size,
    pageIdsIdentical: ids1.size - moved.length,
    pageIdsMoved: moved,
    pagesPass1: pass1.inventory.pages.length,
    pagesPass2: pass2.inventory.pages.length,
    pagesAcrossBothPasses: combined.pages.length,
    unchanged: { count: unchanged.length, newMeasurements: unchangedNew.length, resightings: unchanged.length - unchangedNew.length, newMeasurementUrls: unchangedNew },
    changed: { count: changedUrls.length, newObservations: changedNew.length, chains: changedChains },
  };
}
