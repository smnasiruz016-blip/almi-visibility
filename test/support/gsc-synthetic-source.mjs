/**
 * 🔴 GAP 2 — A SYNTHETIC SEARCH CONSOLE SOURCE, for `bin/gsc-ingest.mjs --source=`.
 *
 * Every value here is invented, and says so: the marker is declared at the top, and every property id contains it.
 * The file is written into a fresh directory under git-ignored .test-scratch — never under runs/, where
 * test/ungated-writers.test.mjs's guardDir sweeps by pattern (D-SWEEP-1). No credential, no request.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SYNTHETIC_MARKER = "synthetic-gsc-source";
export const SYNTHETIC_PROPERTY = `sc-domain:${SYNTHETIC_MARKER}.invalid`;
/** Values the run can only print if it consumed THIS file. */
export const SYNTHETIC_TOTALS = { clicks: 7, impressions: 4243 };
export const SYNTHETIC_PAGE = `https://${SYNTHETIC_MARKER}.invalid/page-one`;
/** One observation per pull: sites.list, aggregate, page-rows, query, query-page, country, country-query, control, by-page. */
export const SYNTHETIC_RECORDS = 9;

export function syntheticSource(overrides = {}) {
  return {
    marker: SYNTHETIC_MARKER,
    properties: [{ propertyId: SYNTHETIC_PROPERTY, propertyType: "DOMAIN", permissionLevel: "siteFullUser" }],
    rows: {
      "": [{ clicks: SYNTHETIC_TOTALS.clicks, impressions: SYNTHETIC_TOTALS.impressions, ctr: 0.0016, position: 12.5 }],
      page: [
        { keys: [SYNTHETIC_PAGE], clicks: 5, impressions: 4000 },
        { keys: [`https://${SYNTHETIC_MARKER}.invalid/page-two`], clicks: 2, impressions: 243 },
      ],
      query: [{ keys: ["synthetic query"], clicks: 7, impressions: 4243, ctr: 0.0016, position: 12.5 }],
      "query,page": [{ keys: ["synthetic query", SYNTHETIC_PAGE], clicks: 5, impressions: 4000, ctr: 0.0012, position: 11 }],
      country: [{ keys: ["zzz"], clicks: 7, impressions: 4243, ctr: 0.0016, position: 12.5 }],
      "country,query": [{ keys: ["zzz", "synthetic query"], clicks: 7, impressions: 4243, ctr: 0.0016, position: 12.5 }],
    },
    ...overrides,
  };
}

/** Writes a source into a fresh .test-scratch directory and returns { dir, file }. */
export function writeSyntheticSource(repoRoot, prefix = "gsc-source-", spec = syntheticSource()) {
  mkdirSync(join(repoRoot, ".test-scratch"), { recursive: true });
  const dir = mkdtempSync(join(repoRoot, ".test-scratch", prefix));
  const file = join(dir, "source.json");
  writeFileSync(file, JSON.stringify(spec, null, 2) + "\n", "utf8");
  return { dir, file };
}
