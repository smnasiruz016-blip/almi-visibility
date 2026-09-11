/**
 * SEEDS — EXACTLY THREE SOURCES IN v0.1.
 *
 *   (a) sitemap.xml
 *   (b) the page list already ingested from Search Console (item 4)
 *   (c) an explicit URL list passed in
 *
 * ── 🔴 LINK DISCOVERY DOES NOT FEED THE FRONTIER ────────────────────────────
 *
 * Links found in a fetched page are RECORDED AS EDGES and never become new
 * work. This is the single most important line in the crawler.
 *
 * Unbounded link-following across 240,328 dynamically-served pages is precisely
 * the shape that must not be able to exist here: each page we fetch would
 * suggest more pages, each of which costs a function invocation on our own
 * account, and the run would be bounded only by the cap — which is a backstop,
 * not a plan.
 *
 * 🔴 AND ORPHAN DETECTION STILL WORKS WITHOUT IT. An orphan is a page in the
 * inventory that nothing links to. That is the EDGE GRAPH compared against the
 * INVENTORY, and both come from pages we already fetched. It needs no extra
 * fetching at all. The feature people reach for link-following to get is
 * already available without it.
 */

/**
 * Extract `<loc>` entries from a sitemap or sitemap index.
 *
 * Deliberately a regex and not an XML parser: the repository has no
 * dependencies, and the only thing we need is the one element. A nested
 * sitemap index yields its child sitemap URLs, which the caller may choose to
 * fetch — subject to the same cap as everything else.
 */
export function parseSitemap(xml) {
  const locs = [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]));
  const isIndex = /<sitemapindex[\s>]/i.test(String(xml));
  return { urls: isIndex ? [] : locs, sitemaps: isIndex ? locs : [] };
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Pull the page URLs out of an item-4 evidence record.
 *
 * 🔴 Reads the STORED OBSERVATION, not the live API. The crawler does not
 * re-query Search Console: that would be a second measurement of the same
 * thing, taken at a different moment, and the two would disagree.
 */
export function urlsFromSearchConsoleObservations(records) {
  const urls = new Set();
  for (const r of records) {
    if (r?.record_type !== "observation") continue;
    for (const row of r.value?.estateTable ?? []) {
      if (row.state === "ROWS" && row.sampleUrl) urls.add(row.sampleUrl);
    }
    for (const u of r.value?.pageUrls ?? []) urls.add(u);
  }
  return [...urls];
}

/**
 * Extract outbound links from an HTML body, for the EDGE GRAPH only.
 *
 * 🔴 THE RETURN VALUE OF THIS FUNCTION MUST NEVER REACH `frontier.offer()`.
 * The crawler asserts that separation; see crawler.mjs.
 */
export function extractLinks(html, baseUrl) {
  const out = new Set();
  for (const m of String(html).matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    const raw = m[1].trim();
    if (raw === "" || raw.startsWith("#") || /^(mailto|tel|javascript):/i.test(raw)) continue;
    try {
      const u = new URL(raw, baseUrl);
      u.hash = "";
      out.add(u.toString());
    } catch {
      // A malformed href is not a link. Silently skipping it is correct here:
      // we are building a graph of what the page points at, and it points at
      // nothing parseable.
    }
  }
  return [...out];
}

export const SEED_SOURCES = Object.freeze(["SITEMAP", "SEARCH_CONSOLE", "EXPLICIT_LIST"]);
