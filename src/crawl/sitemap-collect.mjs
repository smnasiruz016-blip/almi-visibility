/**
 * 🔴 F19 · ACCEPTANCE AMENDMENT 1 (_handoffs b6b3382, RR-227) · B — THE WHOLE SITEMAP, COLLECTED HONESTLY AND STORED WHOLE.
 *
 * RR-226 measured the old collector (src/audit/sitemap-check.mjs, before RR-227): a child sitemap that FAILED was counted as fetched and
 * the listing stayed COMPLETE with its URLs missing; a nested sitemap index added 0 URLs and stayed COMPLETE; no request had a byte bound or
 * a timeout; and its only writer kept the first 20,000 URLs. This module is the one collector now.
 *
 *   BOUNDED     every sitemap request goes through F19's own fetcher: the declared interval (one pacer, robots.txt included), a
 *               per-request timeout, and a byte bound per sitemap file; children per host are capped. Each bound is in the result.
 *   HONEST      the listing is COMPLETE only when the root and every child was fetched with a success status, whole (not truncated),
 *               and parsed as a sitemap, none was skipped or refused, and every nested sitemap index was followed. Anything else is
 *               PARTIAL, with the count of each cause; a root that cannot be read at all is UNKNOWN. Never COMPLETE by default.
 *   ROBOTS      a sitemap URL robots.txt does not allow (or whose robots state is unknown) is not requested, and is counted.
 *   SITE-HELD   a child on an origin the caller does not admit is not requested, and is counted.
 *   WHOLE       the stored record keeps EVERY URL read: urlsStored equals urlsTotal, with a hash over the whole list. There is no
 *               storage cap. A listing that would put its store over the declared ceiling is REFUSED WHOLE — never cut.
 *
 * Fetches only through the fetchImpl it is handed (the subject's PUBLIC_SITE connector in production; an in-process fetch in tests).
 * Names no product, tenant, host or batch.
 */
import { createFetcher, REQUEST_INTERVAL_MS } from "./fetcher.mjs";
import { createRobotsCache, USER_AGENT } from "./robots.mjs";
import { parseSitemap } from "./seeds.mjs";
import { makeObservation } from "../evidence/records.mjs";
import { sha256Hex } from "../evidence/ids.mjs";

/** The declared bounds of one sitemap collection, per host. Every one is printed in the plan and stored in the record. */
export const SITEMAP_BOUNDS = Object.freeze({
  /** child sitemaps fetched per host, nested indexes included — the rest are SKIPPED and counted */
  maxChildren: 10,
  /** bytes read from one sitemap file; the sitemaps protocol's own per-file limit is 50 MB uncompressed */
  maxSitemapBytes: 50 * 1024 * 1024,
  /** one sitemap request, start to last byte */
  timeoutMs: 60_000,
  /** between two requests to one host — the crawler's own interval, robots.txt included */
  intervalMs: REQUEST_INTERVAL_MS,
  /** sitemap indexes followed below the root index; an index deeper than this is NOT followed, and counted */
  maxIndexDepth: 3,
});

/**
 * 🔴 THE STORE CEILING, below the data repository host's per-file limit (a 100 MB hard limit; a warning from 50 MB). Checked BEFORE a
 * write, against the store as it stands plus the new record: a write that would cross it is refused whole. 45 MiB (47,185,920 bytes) stays
 * under 50,000,000 bytes, whichever unit the host's warning uses. Measured (RR-226): the
 * largest declared listing, 240,328 URLs at 83.9 bytes each, is about 20.2 MB in one record — inside the ceiling with room for one more.
 */
export const BATCH_STORE_CEILING_BYTES = 45 * 1024 * 1024;

/** Every cause that keeps a listing from COMPLETE, by name. */
export const SITEMAP_CAUSES = Object.freeze(["rootTruncated", "rootUnparsed", "childrenFailed", "childrenTruncated", "childrenUnparsed", "childrenSkipped", "childrenRobotsRefused", "childrenOffSite", "nestedIndexesNotFollowed"]);

/** A body is parsed as a sitemap only when it carries a sitemap root element. HTML or anything else is UNPARSED, never "no URLs". */
export const isSitemapDocument = (body) => /<(urlset|sitemapindex)[\s>]/i.test(String(body ?? ""));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Collect ONE host's sitemap under the declared bounds.
 *
 * @param origin        the declared site origin (https://host)
 * @param fetchImpl     the only path to the network
 * @param admits        (url) => boolean — the connector's declared origins; a child elsewhere is not requested
 * @param honourRobots  read robots.txt first (production: always). Only the retired legacy entry turns it off.
 */
export async function collectSitemap({ origin, fetchImpl, admits = () => true, honourRobots = true, bounds = SITEMAP_BOUNDS, sleepImpl = sleep, monotonic = () => performance.now(), userAgent = USER_AGENT }) {
  const b = { ...SITEMAP_BOUNDS, ...bounds };
  const fetcher = createFetcher({ fetchImpl, userAgent, maxResponseBytes: b.maxSitemapBytes, timeoutMs: b.timeoutMs, intervalMs: b.intervalMs, sleepImpl, monotonic, admits });
  const robots = honourRobots ? createRobotsCache({ fetchImpl, userAgent, timeoutMs: b.timeoutMs, beforeRequest: () => fetcher.pace("robots") }) : null;
  const causes = Object.fromEntries(SITEMAP_CAUSES.map((k) => [k, 0]));
  const bound = { maxChildren: b.maxChildren, maxSitemapBytes: b.maxSitemapBytes, timeoutMs: b.timeoutMs, intervalMs: b.intervalMs, maxIndexDepth: b.maxIndexDepth, robots: honourRobots ? "HONOURED" : "NOT_READ" };
  const allowed = async (url) => {
    if (!robots) return true;
    const v = await robots.check(url);
    return v.state === "ALLOWED";
  };
  /* one GET through the fetcher: { ok, status, body, truncated, error } — a network error or timeout is a FAILED request, never "empty" */
  const get = async (url) => {
    const r = await fetcher.fetchUrl(url);
    return { ok: r.ok === true && r.status >= 200 && r.status < 300, status: r.status ?? null, body: r.body ?? null, truncated: r.truncated === true, error: r.error ?? null };
  };
  const requests = () => fetcher.requestsIssued() + (robots ? robots.requestsIssued() : 0);
  const result = (fields) => ({ origin, ...fields, causes, requests: requests(), bound, pacing: fetcher.pacing() });

  /* ── the root: the sitemap index, else the sitemap ── */
  let rootUrl = null;
  let root = null;
  for (const candidate of [`${origin}/sitemap-index.xml`, `${origin}/sitemap.xml`]) {
    if (!(await allowed(candidate))) continue;
    const r = await get(candidate);
    if (r.ok) { rootUrl = candidate; root = r; break; }
    root = r;
  }
  if (!rootUrl) {
    const why = honourRobots && root === null ? "no sitemap could be read: robots.txt does not allow it, or its state is unknown" : `no sitemap could be read (last status ${root?.status ?? root?.error})`;
    return result({ rootUrl: null, urls: [], childrenFetched: 0, childrenTotal: null, childrenSkipped: null, nestedIndexes: 0, nestedIndexesFollowed: 0, coverageState: "UNKNOWN", why });
  }
  if (root.truncated) causes.rootTruncated += 1;
  if (!isSitemapDocument(root.body)) causes.rootUnparsed += 1;

  const urls = new Set();
  const seen = new Set([rootUrl]);
  const queue = [];
  let childrenTotal = 0;
  let childrenFetched = 0;
  let nestedIndexes = 0;
  let nestedIndexesFollowed = 0;
  let budget = b.maxChildren;
  const take = (parsed, depth) => {
    for (const u of parsed.urls) urls.add(u);
    for (const s of parsed.sitemaps) {
      if (seen.has(s)) continue;
      seen.add(s);
      childrenTotal += 1;
      queue.push({ url: s, depth });
    }
  };
  if (isSitemapDocument(root.body)) take(parseSitemap(root.body), 1);

  while (queue.length) {
    const { url, depth } = queue.shift();
    if (budget <= 0) { causes.childrenSkipped += 1; continue; }
    if (!admits(url)) { causes.childrenOffSite += 1; continue; }
    if (!(await allowed(url))) { causes.childrenRobotsRefused += 1; continue; }
    budget -= 1;
    const r = await get(url);
    if (!r.ok) { causes.childrenFailed += 1; continue; }
    if (r.truncated) causes.childrenTruncated += 1;
    if (!isSitemapDocument(r.body)) { causes.childrenUnparsed += 1; continue; }
    const parsed = parseSitemap(r.body);
    if (parsed.sitemaps.length) {
      /* 🔴 A NESTED INDEX: followed (its children join the queue) while the depth bound allows — otherwise NOT followed, and counted */
      nestedIndexes += 1;
      if (depth >= b.maxIndexDepth) { causes.nestedIndexesNotFollowed += 1; continue; }
      nestedIndexesFollowed += 1;
      take(parsed, depth + 1);
    } else take(parsed, depth + 1);
    if (!r.truncated) childrenFetched += 1;
  }

  const open = SITEMAP_CAUSES.filter((k) => causes[k] > 0);
  return result({
    rootUrl,
    urls: [...urls],
    childrenFetched,
    childrenTotal,
    childrenSkipped: causes.childrenSkipped,
    nestedIndexes,
    nestedIndexesFollowed,
    /* 🔴 COMPLETE only when no cause is open — never by default */
    coverageState: open.length === 0 ? "COMPLETE" : "PARTIAL",
    why: open.length === 0 ? "the root and every child fetched whole and parsed; every nested index followed" : `NOT COMPLETE — ${open.map((k) => `${k} ${causes[k]}`).join(", ")}`,
  });
}

/**
 * The stored listing: ONE observation holding EVERY URL read. urlsStored === urlsTotal by construction, and urlsSha256 covers the whole
 * list (it is also the observation's content hash). The record shape is the existing sitemap store's (method sitemap.collect, value.urls,
 * origin, rootUrl, coverageState, childrenSkipped, urlsTotal, urlsStored), so F31 and F21 read it unchanged.
 */
export function sitemapListingRecord({ result, observedAt, collector = "bin/crawl.mjs", collectorVersion = "2" }) {
  const urls = [...result.urls];
  const urlsSha256 = sha256Hex(JSON.stringify(urls));
  return makeObservation({
    observed_at: observedAt,
    method: "sitemap.collect",
    target: { kind: "url", ref: result.rootUrl ?? `${result.origin}/sitemap-index.xml` },
    content_sha256: urlsSha256,
    value: {
      ...result,
      urls,
      urlsTotal: urls.length,
      urlsStored: urls.length,
      urlsSha256,
      storageBound: null,
      storageNote: "all sitemap URLs are stored (F19 Amendment 1: no storage cap)",
    },
    collector,
    collector_version: collectorVersion,
  });
}

/** The bytes one record adds to a JSONL store (the line and its newline). */
export const recordLineBytes = (record) => Buffer.byteLength(JSON.stringify(record), "utf8") + 1;

/**
 * 🔴 THE CEILING DECISION, made BEFORE the write: may `addBytes` more go into a store that already holds `existingBytes`? A write that
 * would cross the ceiling is refused WHOLE — the caller never cuts a listing or a body to fit.
 */
export function storeCeilingDecision({ existingBytes = 0, addBytes, ceiling = BATCH_STORE_CEILING_BYTES }) {
  const after = existingBytes + addBytes;
  return Object.freeze({ fits: after <= ceiling, existingBytes, addBytes, after, ceiling });
}

/** A count-only REFUSAL decision for the run's own scope record (F04 recordDecision): no URL, host, batch name or byte of content. */
export function ceilingRefusalEvent({ store }) {
  return Object.freeze({
    eventType: "REFUSAL",
    action: store === "sitemaps" ? "REFUSE_SITEMAP_LISTING_OVER_CEILING" : "REFUSE_PAGE_BODY_OVER_CEILING",
    outcome: "REFUSED",
    reasonCode: "OVER_THE_BATCH_STORE_CEILING",
    metadata: { guard: "batch-store-ceiling", classification: "REFUSED_WHOLE_NEVER_CUT", ruleEntry: "F19 A1: a write that would put a batch store over its declared ceiling is refused whole" },
  });
}

/** The plan line for a sitemap collection: the bounds and the number of declared origins. No host is printed. */
export function renderSitemapPlan({ origins, live }) {
  const b = SITEMAP_BOUNDS;
  return [
    `SITEMAP PLAN (${live ? "LIVE" : "DRY RUN — no request is made"})`,
    `  declared origins   : ${origins}`,
    `  per host           : robots.txt, then sitemap-index.xml (else sitemap.xml), then at most ${b.maxChildren} child sitemaps, nested indexes followed to depth ${b.maxIndexDepth}`,
    `  per request        : at most ${b.maxSitemapBytes} bytes, timeout ${b.timeoutMs} ms, interval ${b.intervalMs} ms (robots.txt included)`,
    `  store ceiling      : ${BATCH_STORE_CEILING_BYTES} bytes per batch store — a listing past it is refused whole, never cut`,
  ].join("\n");
}
