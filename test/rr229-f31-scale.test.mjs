/**
 * 🔴 RR-229 · F31 AT REAL SIZE — re-proof under its SAME acceptance (Amendment 1, C9: "its sitemap listings") after RR-228's real listing of
 * 240,328 URLs made F31's reader throw (RangeError: maximum call stack size exceeded). Two call-argument spreads were the cause:
 *   recordIdentities  (src/crawl/batch-partition.mjs)    urls.push(...listedUrls)      — now a loop
 *   scopeCompleteness (src/crawl/scope-completeness.mjs) Math.min(...observationTimes) — now a loop
 * Fixtures only (RR-177): a synthetic listing on an `.invalid` origin, built from nothing; no real page, no network. Each size test catches
 * the error itself and ASSERTS, so a spread put back turns it red by an AssertionError, never by a crash of the test. The same output as
 * the spread form is required wherever the spread form can still run: small listings, mixed types, and every stored record of the data
 * root as checked out (read only).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { recordIdentities } from "../src/crawl/batch-partition.mjs";
import { scopeCompleteness } from "../src/crawl/scope-completeness.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { f31FixtureRoot, FA, TA, SUBJECT_A, obs, sitemapRec } from "./helpers/f31-fixture-root.mjs";
import { DATA_ROOT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const N = 240328;
const NOW = new Date("2026-10-08T12:00:00Z");

/* the REFERENCE: recordIdentities exactly as it stood before RR-229 (with its spread) — it can still run on anything below the limit */
const originOf = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.origin : null; } catch { return null; } };
function referenceIdentities(r) {
  const urls = [];
  if (r?.target?.kind === "url") urls.push(r.target.ref);
  if (typeof r?.canonical_url === "string") urls.push(r.canonical_url);
  for (const k of ["requested_url", "final_url", "origin", "rootUrl"]) if (typeof r?.value?.[k] === "string") urls.push(r.value[k]);
  if (Array.isArray(r?.value?.urls)) urls.push(...r.value.urls.filter((u) => typeof u === "string"));
  return [...new Set(urls.map(originOf).filter(Boolean))].sort().map((o) => ({ resourceKind: "SITE_ORIGIN", resourceRef: o }));
}
const attempt = (fn) => { try { return { value: fn(), error: null }; } catch (e) { return { value: null, error: e }; } };
const bigUrls = () => Array.from({ length: N }, (_, i) => `${FA}/p/${i}`);

test("S1 · SIZE · recordIdentities reads a 240,328-URL listing without error, and gives its one origin", () => {
  const r = attempt(() => recordIdentities(sitemapRec(FA, bigUrls())));
  assert.equal(r.error, null, `F31's partition threw at real size: ${r.error?.name}`);
  assert.deepEqual(r.value, [{ resourceKind: "SITE_ORIGIN", resourceRef: FA }]);
});

test("S2 · SAME OUTPUT · on small listings, mixed values and two origins, the loop gives exactly the reference's result", () => {
  const cases = [
    sitemapRec(FA, [`${FA}/a`, `${FA}/b`]),
    sitemapRec(FA, [`${FA}/a`, 7, null, "not a url", "ftp://x.invalid/y", "https://other.invalid/z"]),
    sitemapRec(FA, []),
    { record_type: "observation", target: { kind: "url", ref: `${FA}/x` }, canonical_url: "https://c.invalid/", value: { requested_url: `${FA}/x`, final_url: "https://d.invalid/q", urls: "not an array" } },
    obs("o1", `${FA}/p`),
    {},
  ];
  for (const c of cases) assert.deepEqual(recordIdentities(c), referenceIdentities(c));
  const mid = sitemapRec(FA, Array.from({ length: 50000 }, (_, i) => (i % 2 ? `${FA}/m/${i}` : `https://two.invalid/m/${i}`)));
  assert.deepEqual(recordIdentities(mid), referenceIdentities(mid), "a 50,000-URL listing differs from the reference");
});

test("S3 · SAME OUTPUT ON THE STORED DATA · every record of the data root as checked out gives the reference's identities (read only)", () => {
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === ".git") continue; const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".jsonl")) files.push(p); } };
  for (const d of ["observations", "research"]) if (existsSync(join(DATA_ROOT, d))) walk(join(DATA_ROOT, d));
  let n = 0;
  for (const f of files) for (const line of readFileSync(f, "utf8").split("\n").filter(Boolean)) {
    let r; try { r = JSON.parse(line); } catch { continue; }
    const ref = attempt(() => referenceIdentities(r));
    if (ref.error) continue; /* past the spread's own limit there is nothing to compare: S1 covers that size */
    assert.deepEqual(recordIdentities(r), ref.value, `${f.split(/[\\/]/).slice(-2).join("/")} differs`);
    n += 1;
  }
  assert.ok(n > 1000, `only ${n} stored records were compared — the population shrank`);
  console.log(`[RR-229 S3] stored records compared: ${n}`);
});

test("S4 · SIZE · scopeCompleteness takes 240,328 observations without error; its as-of time is the earliest one", () => {
  const observations = Array.from({ length: N }, (_, i) => obs(`o${i}`, `${FA}/p/${i}`, { at: "2026-10-08T00:00:00.000Z" }));
  observations[123457] = obs("early", `${FA}/p/early`, { at: "2026-10-01T00:00:00.000Z" });
  const r = attempt(() => scopeCompleteness({ origins: [FA], observations, sitemaps: [], edges: [], freshnessRule: { freshnessDays: 30 }, now: NOW }));
  assert.equal(r.error, null, `F31's completeness threw at real size: ${r.error?.name}`);
  assert.equal(r.value.basis.asOf, "2026-10-01T00:00:00.000Z", "the as-of time is not the earliest observation");
  const small = scopeCompleteness({ origins: [FA], observations: observations.slice(0, 3).concat([observations[123457]]), sitemaps: [], edges: [], freshnessRule: { freshnessDays: 30 }, now: NOW });
  assert.equal(small.basis.asOf, "2026-10-01T00:00:00.000Z");
});

test("S5 · F31'S READER, END TO END · a research batch whose listing holds 240,328 URLs is read, merged and judged — no error, the whole listing counted", () => {
  const urls = bigUrls();
  const w = f31FixtureRoot({
    fixed: { records: [], bodies: [], edges: [], sitemaps: [] },
    batches: { "rr229-scale-batch": { attachTo: TA, namedBy: SUBJECT_A, sitemaps: [sitemapRec(FA, urls, { at: "2026-10-08T00:00:00Z", id: "big-listing" })], crawl: [obs("seen-1", urls[0], { at: "2026-10-08T00:01:00Z" })] } },
    tenants: { [TA]: { existingPageInventory: { freshnessDays: 30 } } },
  });
  try {
    const resolve = createTenantResolver({ env: w.env });
    const r = attempt(() => readExistingPagePopulation({ scope: { tenantId: TA }, resolve, env: w.env, now: NOW }));
    assert.equal(r.error, null, `F31's reader threw at real size: ${r.error?.name}`);
    assert.equal(r.value.fault, null);
    assert.deepEqual(r.value.newerBatches, ["rr229-scale-batch"]);
    const c = r.value.population.completeness;
    assert.equal(c.basis.counts.listedTotal, N, "the whole listing was not counted");
    assert.equal(c.basis.counts.listedUnobserved, N - 1, "a listed URL was lost or invented");
    assert.equal(c.state, "INCOMPLETE");
  } finally { w.cleanup(); }
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
