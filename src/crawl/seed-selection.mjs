/**
 * SEED SELECTION — the crawler's input comes from the evidence store.
 *
 * ── 🔴 WHY NOT THE SITEMAP ──────────────────────────────────────────────────
 *
 * The sitemap is a bucket of 240,328 URLs, most of which have no search
 * presence at all. The pages Google actually shows are the real ones, and they
 * are already measured. Seeding from Search Console means item 4's OUTPUT is
 * item 1's INPUT — integrated behaviour, rather than two components that exist
 * beside each other and have never met.
 *
 * ── 🔴 WHY THE RULE IS A STRING THAT TRAVELS WITH THE RESULT ────────────────
 *
 * A selection nobody can reproduce is not evidence. Six weeks from now the
 * impressions will have moved and this exact set will be unrecoverable unless
 * the rule that produced it is recorded verbatim beside it. So `SELECTION_RULE`
 * is written into the CrawlRun record, not just implemented here.
 *
 * ── AND WHY THE EXCLUDED COUNT IS RETURNED, NOT DISCARDED ───────────────────
 *
 * "150 of this host's 492 pages were selected" and "this host has 150 pages"
 * are different facts. The second is what a reader infers if the excluded count
 * is dropped, and it is false. Same failure as a zero that was really an
 * omission.
 */

/** 🔴 Verbatim. This exact string is stored in the CrawlRun record. */
export const SELECTION_RULE =
  "sort by impressions DESC, tie-break by URL ASC, take the first 500; per-host cap 150";

export const MAX_SEEDS = 500;
export const MAX_SEEDS_PER_HOST = 150;

/**
 * Apply the rule to the stored page rows.
 *
 * `rows` is `[{ url, clicks, impressions }]` as stored by the ingest.
 * Returns the selected URLs plus a per-host breakdown that keeps the
 * excluded count visible.
 */
export function selectSeeds(rows, { maxUrls = MAX_SEEDS, maxPerHost = MAX_SEEDS_PER_HOST } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new TypeError("selectSeeds: no page rows — the selection would be vacuous");
  }

  /* 🔴 DETERMINISTIC. `impressions DESC` alone is not a total order: rows tie
   * constantly at 1 impression, and Array.sort is not required to be stable
   * across engines for equal keys. The URL tie-break makes the output identical
   * on every machine and every run — which is what "reproducible" means. */
  const ordered = [...rows].sort(
    (a, b) => (b.impressions ?? 0) - (a.impressions ?? 0) || String(a.url).localeCompare(String(b.url)),
  );

  const hostOf = (u) => {
    try {
      return new URL(u).hostname.toLowerCase();
    } catch {
      return null;
    }
  };

  const available = new Map();
  for (const r of ordered) {
    const h = hostOf(r.url);
    if (!h) continue;
    available.set(h, (available.get(h) ?? 0) + 1);
  }

  const selected = [];
  const takenPerHost = new Map();
  const excludedByHostCap = new Map();
  let excludedByTotalCap = 0;
  const unparseable = [];

  for (const r of ordered) {
    const h = hostOf(r.url);
    if (!h) {
      unparseable.push(r.url);
      continue;
    }
    if (selected.length >= maxUrls) {
      excludedByTotalCap += 1;
      continue;
    }
    const taken = takenPerHost.get(h) ?? 0;
    if (taken >= maxPerHost) {
      excludedByHostCap.set(h, (excludedByHostCap.get(h) ?? 0) + 1);
      continue;
    }
    takenPerHost.set(h, taken + 1);
    selected.push(r.url);
  }

  const byHost = [...available.keys()]
    .map((host) => ({
      host,
      available: available.get(host),
      selected: takenPerHost.get(host) ?? 0,
      excludedByHostCap: excludedByHostCap.get(host) ?? 0,
    }))
    .sort((a, b) => b.selected - a.selected || a.host.localeCompare(b.host));

  return {
    rule: SELECTION_RULE,
    selected,
    byHost,
    seedPoolSize: rows.length,
    excludedByTotalCap,
    unparseable,
    bounds: { maxUrls, maxPerHost },
  };
}

/**
 * Render the pre-fetch breakdown (A3). Printed BEFORE anything is fetched.
 *
 * 🔴 It prints `available` beside `selected`, so the reader can see the
 * denominator without being asked to trust the numerator.
 */
export function renderSelection(sel) {
  const w = Math.max(...sel.byHost.map((h) => h.host.length), 4);
  const lines = [
    `SELECTION RULE: ${sel.rule}`,
    `seed pool      : ${sel.seedPoolSize} page rows from the evidence store`,
    `selected       : ${sel.selected.length}   [bound: maxUrls=${sel.bounds.maxUrls} maxPerHost=${sel.bounds.maxPerHost}]`,
    `excluded — total cap reached : ${sel.excludedByTotalCap}`,
    `excluded — per-host cap      : ${[...sel.byHost].reduce((n, h) => n + h.excludedByHostCap, 0)}`,
    "",
    `${"host".padEnd(w)}  selected  excl(host cap)  available`,
    "-".repeat(w + 34),
  ];
  for (const h of sel.byHost) {
    lines.push(
      `${h.host.padEnd(w)}  ${String(h.selected).padStart(8)}  ${String(h.excludedByHostCap).padStart(14)}  ${String(h.available).padStart(9)}`,
    );
  }
  lines.push("-".repeat(w + 34));
  const cover = ((sel.selected.length / sel.seedPoolSize) * 100).toFixed(1);
  lines.push(
    `TOTAL          ${String(sel.selected.length).padStart(w - 6)}  of a pool of ${sel.seedPoolSize}  = ${cover}% of the pages with any search presence`,
  );
  if (sel.unparseable.length) lines.push(`unparseable URLs skipped: ${sel.unparseable.length}`);
  return lines.join("\n");
}
