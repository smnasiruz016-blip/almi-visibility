/**
 * A SYNTHETIC EVIDENCE BUNDLE — the development rehearsal set, and nothing else.
 *
 * 🔴 EVERY BYTE OF THIS IS INVENTED. Hosts are `example.invalid` (reserved, resolves nowhere).
 * Identifiers are letters and shapes. Nothing is copied or derived from any captured corpus,
 * exhibit, product repository or page. It exists to rehearse the MACHINERY — that the runner, the
 * output format, the hash and the scorer join up — never the examination.
 *
 * It plants one defect for each of the six classes and three clean controls, so a dry run that
 * scores 6/6 and 3/3 proves the pipeline can carry a pass, and the guard tests prove it can carry
 * a failure.
 */

const CLEAN_ROUTE_HEADERS = { "x-vercel-cache": "HIT", "cache-control": "public, max-age=300" };

export default {
  /* A — a surface offers a value its producer can never produce. */
  claimProducer: {
    claims: [
      { id: "surface-alpha", locator: "synthetic/surface-alpha", statedValues: ["t1", "t2", "t3", "t4"] },
      { id: "control-surface-a", locator: "synthetic/control-a", statedValues: ["t1", "t2"] },
    ],
    producers: [{ id: "producer-alpha", locator: "synthetic/producer-alpha", producedValues: ["t1", "t2", "t3"] }],
    bindings: { "surface-alpha": ["producer-alpha"], "control-surface-a": ["producer-alpha"] },
  },

  /* B — an authority claim with no registry evidence, beside one that has it. The registry is
   * declared READABLE, so absence here is a measurement rather than a shrug. */
  claimRegistry: {
    claims: [
      { id: "authority-claim-beta", locator: "synthetic/beta", authority: "authority-one", predicate: "threshold", statedValue: "level-3" },
      { id: "control-surface-b", locator: "synthetic/control-b", authority: "authority-two", predicate: "window", statedValue: "30" },
    ],
    registry: { readable: true, records: [{ authority: "authority-two", predicate: "window", value: "30" }] },
  },

  /* C — a route declaring CACHED that misses three consecutive times, beside one served from cache. */
  declaredServed: {
    missRunRequired: 3,
    routes: [
      {
        id: "route-gamma", locator: "synthetic/route-gamma", declaredMode: "CACHED",
        responses: [
          { headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } },
          { headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } },
          { headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } },
        ],
      },
      { id: "control-surface-c", locator: "synthetic/control-c", declaredMode: "CACHED", responses: [{ headers: CLEAN_ROUTE_HEADERS }, { headers: CLEAN_ROUTE_HEADERS }, { headers: CLEAN_ROUTE_HEADERS }] },
    ],
  },

  /* D — a sitemap advertising a URL that does not resolve, beside three that do. */
  sitemapObserved: {
    sitemapUrls: [
      "https://example.invalid/delta-missing",
      "https://example.invalid/control-one",
      "https://example.invalid/control-two",
      "https://example.invalid/control-three",
    ],
    observations: {
      "https://example.invalid/delta-missing": { status: 404, robotsAllowed: true, noindexed: false, canonical: null, hasContent: false },
      "https://example.invalid/control-one": { status: 200, robotsAllowed: true, noindexed: false, canonical: "https://example.invalid/control-one", hasContent: true },
      "https://example.invalid/control-two": { status: 200, robotsAllowed: true, noindexed: false, canonical: "https://example.invalid/control-two", hasContent: true },
      "https://example.invalid/control-three": { status: 200, robotsAllowed: true, noindexed: false, canonical: "https://example.invalid/control-three", hasContent: true },
    },
  },

  /* E — a surface stating three where the collection holds four. */
  countData: {
    statements: [
      { id: "count-epsilon", locator: "synthetic/epsilon", statedCount: 3, collectionRef: "set-epsilon" },
      { id: "control-surface-e", locator: "synthetic/control-e", statedCount: 2, collectionRef: "set-control" },
    ],
    collections: { "set-epsilon": ["i1", "i2", "i3", "i4"], "set-control": ["i1", "i2"] },
  },

  /* F — a declared link missing from a render that COMPLETED, beside a page where all survive. */
  linkRender: {
    pages: [
      { id: "page-zeta", locator: "synthetic/zeta", sourceLinks: ["/one", "/two", "/three"], renderedLinks: ["/one", "/three"], renderState: "COMPLETE" },
      { id: "control-surface-f", locator: "synthetic/control-f", sourceLinks: ["/one", "/two"], renderedLinks: ["/one", "/two"], renderState: "COMPLETE" },
    ],
  },
};
