/**
 * 🔴 THE REAL SITEMAP JOIN, AND THE COLLISION IT REFUSES.
 *
 * ── P6 · THE PROOF THE REAL MATERIAL CANNOT DRIVE ──────────────────────────
 *
 * The join's whole reason for requiring a declared scope as well as a URL is the case where two
 * scopes serve the same address. The connected material contains no such collision — measured, 0 of
 * 20,895 — so the branch that refuses it cannot be reached by any real input, and a branch no input
 * reaches is a comment rather than a guard.
 *
 * So it is driven here, by a GENERIC SYNTHETIC declaration on invented domains. No real evidence is
 * modified to manufacture the state; the state is built from nothing, which is the only honest way
 * to reach a condition reality has not supplied.
 *
 * ── P7 · AND THE WHOLE CLIENT, NOT JUST THE RESOLVER ───────────────────────
 *
 * A synthetic client with its own site origin, its own fact registry and its own sitemap collection
 * goes through the SAME production resolver, the SAME judge and the SAME detector input builder as
 * the connected material, with no client-specific branch anywhere between them.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sitemapUrlSubjects, sitemapDetectorInputsByTenant, sitemapCollectionRef, sitemapOriginRef } from "../src/adapter/sitemap-subject.mjs";
import { judgeObservedPage, normaliseObservedUrl } from "../src/adapter/observed-page-subject.mjs";
import { createTenantResolver, TENANT_ID_PATTERN } from "../src/tenancy/resolver.mjs";
import { detectSitemapVsObserved } from "../src/detect/sitemap-observed.mjs";
import { SUBJECT_ROOTS_ENV } from "../src/subject-roots.mjs";

const SITE_A = "https://harbourline-registry.invalid";
const SITE_B = "https://beacon-survey.invalid";
const TENANT_A = "tenant:0f1e2d3c4b5a69788796a5b4c3d2e1f0";
const TENANT_B = "tenant:11223344556677889900aabbccddeeff";
const TENANT_COLLECTION = "tenant:99887766554433221100ffeeddccbbaa";
const BATCH = "sitemap-synthetic-0001";
const COLLIDING_PATH = "/reports/annual-filing";

const tenant = (tenantId, label) => ({ schemaVersion: 1, tenantId, status: "ACTIVE", declaredOn: "2026-09-20", declarationBasis: "OWNER_AUTHORISED_ISOLATION_SCOPE", label });
const attach = (resourceKind, resourceRef, tenantId) => ({ schemaVersion: 1, resourceKind, resourceRef, tenantId, declaredOn: "2026-09-20", declarationBasis: "OWNER_AUTHORISED_ATTACHMENT" });

/** A synthetic external root: declarations plus a sitemap collection, all invented. */
function syntheticRoot({ urls, attachments }) {
  const dir = mkdtempSync(join(tmpdir(), "almivis-sitemap-"));
  mkdirSync(join(dir, "tenancy"), { recursive: true });
  writeFileSync(join(dir, "tenancy", "tenants.json"), JSON.stringify({
    schemaVersion: 1,
    tenants: [tenant(TENANT_A, "synthetic site A"), tenant(TENANT_B, "synthetic site B"), tenant(TENANT_COLLECTION, "synthetic collection")],
  }));
  writeFileSync(join(dir, "tenancy", "attachments.json"), JSON.stringify({ schemaVersion: 1, attachments }));

  const batchDir = join(dir, "observations", BATCH);
  mkdirSync(batchDir, { recursive: true });
  const record = {
    record_type: "observation", observation_id: "synthetic-collection-0001",
    method: "sitemap.collect", observed_at: "2026-09-20T00:00:00.000Z",
    synthetic: true,
    target: { kind: "url", ref: `${SITE_A}/sitemap-index.xml` },
    value: { origin: SITE_A, rootUrl: `${SITE_A}/sitemap-index.xml`, urls, urlsTotal: urls.length },
  };
  const bytes = Buffer.from(`${JSON.stringify(record)}\n`, "utf8");
  writeFileSync(join(batchDir, "sitemaps.jsonl"), bytes);
  writeFileSync(join(batchDir, "manifest.json"), JSON.stringify({
    batchId: BATCH, classificationState: "UNASSIGNED",
    files: [{ name: "sitemaps.jsonl", bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }],
  }));
  return dir;
}

/** One observed page, judged by the REAL production judge under a given declared scope. */
function observedPageAt(url, tenantId) {
  const obsId = "synthetic-observation-0001";
  const body = "<html><head><title>filing</title></head><body>declared scope proof</body></html>";
  const hash = createHash("sha256").update(body, "utf8").digest("hex");
  const page = { record_type: "page", page_id: "synthetic-page-0001", canonical_url: url, observations: [obsId] };
  const judged = judgeObservedPage({
    page, tenantId, locator: "observations/synthetic/records.jsonl", batchId: "synthetic-crawl-0001",
    observations: new Map([[obsId, { observation_id: obsId, target: { ref: url }, content_sha256: hash, value: { status: 200, requested_url: url, final_url: url, robotsState: "ALLOWED" } }]]),
    bodies: new Map([[obsId, body]]),
    idsByUrl: new Map([[normaliseObservedUrl(url), new Set([page.page_id])]]),
  });
  return { ...judged, tenantId, origin: new URL(url).origin };
}

test("P6 · the SAME URL under two different declared scopes is INVALID, never a binding", () => {
  /* Site A declares the sitemap; the observed page at that exact URL belongs to site B. */
  const dir = syntheticRoot({
    urls: [`${SITE_A}${COLLIDING_PATH}`],
    attachments: [
      attach("SITE_ORIGIN", SITE_A, TENANT_A),
      attach("SITE_ORIGIN", SITE_B, TENANT_B),
      attach("SITEMAP_COLLECTION", BATCH, TENANT_COLLECTION),
    ],
  });
  try {
    const env = { [SUBJECT_ROOTS_ENV]: dir };
    /* 🔴 THE PAGE IS AT THE SAME NORMALISED URL — the host is site A's, but the page was resolved
     * into site B's scope. Only the scope differs, which is exactly the case under test. */
    const page = observedPageAt(`${SITE_A}${COLLIDING_PATH}`, TENANT_B);
    const result = sitemapUrlSubjects({ batchId: BATCH, env, observedPages: { pages: [page] } });

    assert.equal(result.population, 1);
    assert.equal(result.counts.INVALID, 1, `expected the collision to be INVALID, got ${JSON.stringify(result.counts)}`);
    assert.equal(result.counts.BOUND, 0, "a cross-scope URL match produced a binding");
    const entry = result.entries[0];
    assert.equal(entry.reason, "CROSS_TENANT_URL");
    assert.equal(entry.tenantId, TENANT_A, "the sitemap URL resolved to its own site's scope");
    assert.match(entry.detail, /not a binding/);
    assert.equal(entry.page, null, "a cross-scope entry must carry no joined page");

    /* 🔴 CONTROL: the identical URL and the identical collection, with the page in the SAME scope,
     * BINDS. Without this the INVALID above would be produced equally by a joiner that never binds. */
    const sameScope = observedPageAt(`${SITE_A}${COLLIDING_PATH}`, TENANT_A);
    const control = sitemapUrlSubjects({ batchId: BATCH, env, observedPages: { pages: [sameScope] } });
    assert.equal(control.counts.BOUND, 1, "the control did not bind — the refusal above proves nothing");
    assert.equal(control.entries[0].reason, "UNIQUE_EXACT_JOIN");

    /* And only the BOUND one is ever offered to the detector. */
    assert.equal(sitemapDetectorInputsByTenant(result, { pages: [page] }).length, 0, "a cross-scope entry was offered for comparison");
    assert.equal(sitemapDetectorInputsByTenant(control, { pages: [sameScope] }).length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P7 · a whole synthetic client — site, registry and collection — through the same production path", () => {
  const dir = syntheticRoot({
    urls: [`${SITE_A}/`, `${SITE_A}${COLLIDING_PATH}`, `${SITE_A}/never-crawled`],
    attachments: [
      attach("SITE_ORIGIN", SITE_A, TENANT_A),
      attach("FACT_REGISTRY", "harbourline/facts", TENANT_A),
      attach("SITEMAP_COLLECTION", BATCH, TENANT_COLLECTION),
    ],
  });
  try {
    const env = { [SUBJECT_ROOTS_ENV]: dir };
    const resolve = createTenantResolver({ env });

    /* E3a · a page and a sitemap URL on the SAME origin resolve to the SAME declared scope. */
    const viaSitemap = resolve(sitemapOriginRef(`${SITE_A}${COLLIDING_PATH}`));
    const viaPage = resolve({ resourceKind: "SITE_ORIGIN", resourceRef: SITE_A });
    assert.equal(viaSitemap.state, "RESOLVED");
    assert.equal(viaSitemap.tenantId, viaPage.tenantId, "the two sides of the join resolved to different scopes");
    assert.match(viaSitemap.tenantId, TENANT_ID_PATTERN);

    /* E3c · a SINGLE-ORIGIN collection CAN share its site's scope where the material permits it —
     * proving the connected material's separate collection scope is a property of that material,
     * not a limit of the resolver. */
    const shared = syntheticRoot({
      urls: [`${SITE_A}/`],
      attachments: [attach("SITE_ORIGIN", SITE_A, TENANT_A), attach("SITEMAP_COLLECTION", BATCH, TENANT_A)],
    });
    try {
      const r2 = createTenantResolver({ env: { [SUBJECT_ROOTS_ENV]: shared } });
      assert.equal(r2(sitemapCollectionRef(BATCH)).tenantId, TENANT_A, "a single-origin collection could not share its site's scope");
      assert.equal(r2({ resourceKind: "SITE_ORIGIN", resourceRef: SITE_A }).tenantId, TENANT_A);
    } finally { rmSync(shared, { recursive: true, force: true }); }

    /* E3b · here, the collection has its OWN scope and keeps its id as provenance. */
    const page = observedPageAt(`${SITE_A}${COLLIDING_PATH}`, TENANT_A);
    const result = sitemapUrlSubjects({ batchId: BATCH, env, observedPages: { pages: [page] } });
    assert.equal(result.collectionTenantId, TENANT_COLLECTION);
    assert.notEqual(result.collectionTenantId, TENANT_A, "the collection silently took a site's scope");
    assert.equal(result.provenance.batchId, BATCH, "the collection id must survive as provenance");

    /* The join and its accounting, on the synthetic arm. */
    assert.equal(result.population, 3);
    assert.equal(result.counts.BOUND, 1, JSON.stringify(result.counts));
    assert.equal(result.counts.UNBOUND, 2, "the two uncrawled sitemap URLs must be sitemap-only, not dropped");
    assert.equal(Object.values(result.counts).reduce((a, b) => a + b, 0), result.population, "the buckets do not sum to the population");
    assert.ok(result.entries.filter((e) => e.reason === "NO_OBSERVED_PAGE").length === 2);

    /* And it reaches the SAME generic detector, with the same shape as the connected arm. */
    const inputs = sitemapDetectorInputsByTenant(result, { pages: [page] });
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0].tenantId, TENANT_A);
    const out = detectSitemapVsObserved({ sitemapUrls: inputs[0].sitemapUrls, observations: inputs[0].observations });
    assert.equal(out.length, 1);
    assert.equal(out[0].outcome, "CLEAN", `the synthetic arm did not reach a verdict: ${JSON.stringify(out[0])}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P5 · malformed and undeclared sitemap URLs fail closed, each driven by a real input", () => {
  const dir = syntheticRoot({
    urls: ["not-a-url", `${SITE_B}/undeclared-origin`, `${SITE_A}/fine`],
    attachments: [attach("SITE_ORIGIN", SITE_A, TENANT_A), attach("SITEMAP_COLLECTION", BATCH, TENANT_COLLECTION)],
  });
  try {
    const env = { [SUBJECT_ROOTS_ENV]: dir };
    const page = observedPageAt(`${SITE_A}/fine`, TENANT_A);
    const r = sitemapUrlSubjects({ batchId: BATCH, env, observedPages: { pages: [page] } });

    const byReason = r.entries.reduce((m, e) => { m[e.reason] = (m[e.reason] ?? 0) + 1; return m; }, {});
    assert.equal(byReason.MALFORMED_URL, 1, `a malformed URL was not refused: ${JSON.stringify(byReason)}`);
    assert.equal(byReason.TENANT_UNDECLARED, 1, "an undeclared origin was not refused");
    assert.equal(byReason.UNIQUE_EXACT_JOIN, 1, "the control URL did not bind");
    assert.equal(r.counts.INVALID, 1);
    assert.equal(Object.values(r.counts).reduce((a, b) => a + b, 0), 3, "the buckets do not sum to the population");
    /* Only the bound one is offered. */
    assert.equal(sitemapDetectorInputsByTenant(r, { pages: [page] })[0].sitemapUrls.length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
