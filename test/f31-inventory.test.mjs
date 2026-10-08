/**
 * F31 · EXISTING PAGE INVENTORY — the proofs of the frozen acceptance (_handoffs 3a8f7ba, RR-85 §2).
 *
 * C1–C5 on a FIXTURE data root (test/helpers/f31-fixture-root.mjs — RR-223 moved them off the 27 set-aside pages, RR-177) plus planted
 * conflicts; C6 on the REAL client's RECORDS (its verdict only, count-only, no body read) AND on recorded-shape fixtures for every state; C7 both consumer directions, each fixture's completeness COMPUTED by
 * the verdict code, never asserted; C8 the call-path enumeration. Count-only output: no page content, host or URL.
 *
 * 🔴 NOTHING HERE WRITES TO THE PRODUCTION TRAIL: every function driven is pure or records through a stub; hashed at the end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { scopeCompleteness, coverageForConsumers, COMPLETENESS as S, COMPLETENESS_REASONS as R, COMPLETENESS_METHOD } from "../src/crawl/scope-completeness.mjs";
import { scopeInventory } from "../src/crawl/scope-inventory.mjs";
import { readExistingPagePopulation, populationFromPartition, declaredScope, completenessEvent } from "../src/page/existing-page-population.mjs";
import { existingPageFirst } from "../src/page/existing-page-first.mjs";
import { NEED_OUTCOMES as N } from "../src/page/need-coverage.mjs";
import { canonicalUrl, targetPageId } from "../src/evidence/ids.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { GUARD_METADATA_KEYS } from "../src/governance/guard-audit.mjs";
import { metadataFaults } from "../src/audit-trail/event.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { readPartitionEdges, readTenantPartition } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { readNewerCollections, mergeCollections } from "../src/crawl/newer-collections.mjs";
import { f31FixtureRoot, FA, FZ, TA, TZ, obs, page, sitemapRec } from "./helpers/f31-fixture-root.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- RR-223 (F31 Amendment 1, re-proof on FIXTURE pages, RR-177): C1–C5 and the recorded event are driven through the production
 * loader over a fixture data root built from nothing (test/helpers/f31-fixture-root.mjs) — never the 27 set-aside pages. The real client
 * is read for its VERDICT only, from records (partitions, links, sitemap listings, newer declared collections) — no body is read. ---- */
const resolve = createTenantResolver();
const T = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
const FIXW = f31FixtureRoot({
  fixed: {
    records: [obs("fa1", `${FA}/`, { body: "<h1>Home</h1>" }), page(`${FA}/`, ["fa1"]), obs("fa2", `${FA}/one`, { body: "<h1>One</h1>" }), page(`${FA}/one`, ["fa2"]),
      obs("fz1", `${FZ}/`, { body: "<h1>Zed</h1>" }), page(`${FZ}/`, ["fz1"])],
    bodies: [["fa1", "<h1>Home</h1>"], ["fa2", "<h1>One</h1>"], ["fz1", "<h1>Zed</h1>"]],
    edges: [{ from_observation_id: "fa1", to: `${FA}/one` }, { from_observation_id: "fa1", to: `${FA}/two` }, { from_observation_id: "fz1", to: `${FZ}/x` }],
    sitemaps: [sitemapRec(FA, [`${FA}/`, `${FA}/one`])],
  },
});
process.on("exit", () => FIXW.cleanup());
const fresolve = createTenantResolver({ env: FIXW.env });
const RECORDED = [];
const FIX = readExistingPagePopulation({ scope: { tenantId: TA, recordDecision: (e) => RECORDED.push(e) }, resolve: fresolve, env: FIXW.env }).population;
const INV = FIX.inventory;
/* the real client's verdict from its RECORDS only — the same merge and verdict code the loader runs, no body read */
function realVerdict() {
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId: T, resolve });
  const sm = readTenantPartition({ batchId: SITEMAP_BATCH_ID, tenantId: T, resolve });
  const declared = declaredScope({ tenantId: T });
  const merged = mergeCollections({ fixed: { batchId: BATCH_ID, records: part.records, bodies: new Map(), sitemaps: sm.records.filter((r) => r.record_type === "observation"), edges: readPartitionEdges({ batchId: BATCH_ID, observationIds: part.observationIds }) }, newer: readNewerCollections({ tenantId: T, resolve }) });
  return scopeCompleteness({ origins: declared.origins, observations: merged.observations, sitemaps: merged.sitemaps, edges: merged.edges, freshnessRule: declared.freshnessRule, now: new Date(), crawlRunsCutShort: merged.crawlRunsCutShort });
}
const REAL_VERDICT = realVerdict();

/* ---- a recorded-shape fixture site: origin A (in scope), origin Z (another client's) ---- */
const A = "https://inventory-fixture-a.invalid";
const Z = "https://inventory-fixture-z.invalid";
const at = "2026-09-20T00:00:00Z";
const ob = (id, url, extra = {}) => ({ record_type: "observation", observation_id: id, observed_at: at, content_sha256: "x", value: { requested_url: url, final_url: url, status: 200, redirect_chain: [], truncated: false, error: null, skipped: false, ...extra } });
const sitemap = (urls, extra = {}) => ({ record_type: "observation", observation_id: "sm", observed_at: at, value: { origin: A, urls, coverageState: "COMPLETE", childrenSkipped: 0, urlsTotal: urls.length, urlsStored: urls.length, ...extra } });
const SITE = [`${A}/`, `${A}/one`, `${A}/two`];
const full = () => ({ origins: [A], observations: SITE.map((u, i) => ob(`o${i}`, u)), sitemaps: [sitemap(SITE)], edges: [{ from_observation_id: "o0", to: `${A}/one` }, { from_observation_id: "o0", to: `${A}/two` }], freshnessRule: { freshnessDays: 30 }, now: new Date("2026-09-25T00:00:00Z") });

/* ================================ C1–C5 on the FIXTURE inventory ================================ */

test("the input exists: a non-empty fixture partition of the declared fixture client (else every clause is COULD-NOT-PROVE)", () => {
  assert.ok(INV.pages.length > 0);
  console.log(`  FIXTURE (count-only): ${INV.pages.length} known page(s) · ${INV.conflicts.length} identity conflict(s) · not placed in any tenant ${INV.unplaced.undeclared + INV.unplaced.ambiguous}`);
});

test("C1 · STABLE IDENTITY: every page's id derives from its URL, spellings keep one identity, and a conflict is REPORTED — never merged", () => {
  assert.deepEqual(INV.conflicts, []);
  assert.equal(new Set(INV.pages.map((p) => p.pageId)).size, INV.pages.length, "two real pages share one identity");
  const base = targetPageId(canonicalUrl(`${A}/path/page?b=2&a=1`));
  for (const v of [`${A.toUpperCase().replace("HTTPS", "https")}/path/page?a=1&b=2`, `${A}/path/page?a=1&b=2#frag`]) assert.equal(targetPageId(canonicalUrl(v)), base, "a spelling gained a second identity");
  assert.notEqual(targetPageId(canonicalUrl(`${A}/path/other`)), base, "two pages share one identity");
  const page = (id, url) => ({ record_type: "page", page_id: id, canonical_url: url, observations: [] });
  const twice = scopeInventory({ tenantId: T, batchId: "b", records: [page(targetPageId(canonicalUrl(`${A}/x`)), `${A}/x`), page("ffffffffffffffff", `${A}/x`)] });
  assert.ok(twice.conflicts.some((c) => c.code === "URL_CLAIMED_BY_TWO_IDENTITIES"), "a URL claimed by two identities was not reported");
  assert.equal(twice.pages.length, 2, "a conflict was merged silently");
  assert.ok(twice.conflicts.some((c) => c.code === "IDENTITY_NOT_DERIVED_FROM_URL"));
});

test("C2 · FINGERPRINTS: every fingerprint matches the stored bytes; changed bytes are caught; no bytes → no verification, never invented", () => {
  const fps = INV.pages.flatMap((p) => p.fingerprints);
  assert.ok(fps.length >= INV.pages.length);
  assert.ok(fps.every((f) => f.verified === true), "a fingerprint does not match its stored bytes");
  const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
  const rec = (id, h) => ({ record_type: "observation", observation_id: id, observed_at: at, content_sha256: h, value: { status: 200 } });
  const p = { record_type: "page", page_id: targetPageId(canonicalUrl(`${A}/f`)), canonical_url: `${A}/f`, observations: ["same", "changed", "nobody", "nohash"] };
  const inv = scopeInventory({ tenantId: T, batchId: "b", records: [p, rec("same", sha("<p>a</p>")), rec("changed", sha("<p>a</p>")), rec("nobody", sha("<p>c</p>")), rec("nohash", null)], bodies: new Map([["same", "<p>a</p>"], ["changed", "<p>b</p>"]]) });
  const by = Object.fromEntries(inv.pages[0].fingerprints.map((f) => [f.observationId, f.verified]));
  assert.equal(by.same, true);
  assert.equal(by.changed, false, "changed bytes kept a matching fingerprint");
  assert.equal(by.nobody, null, "a verification was invented where no bytes were stored");
  assert.ok(!("nohash" in by), "a fingerprint was invented where none was recorded");
});

test("C3 · SERVED STATE: every page carries its recorded state; a page never answered with a status is UNKNOWN, never inferred", () => {
  assert.ok(INV.pages.every((p) => p.servedState.state === "OBSERVED" && Number.isInteger(p.servedState.status) && p.servedState.observedAt));
  const p = { record_type: "page", page_id: targetPageId(canonicalUrl(`${A}/s`)), canonical_url: `${A}/s`, observations: ["e", "k"] };
  const inv = scopeInventory({ tenantId: T, batchId: "b", records: [p, { record_type: "observation", observation_id: "e", observed_at: at, value: { error: "TIMEOUT" } }, { record_type: "observation", observation_id: "k", observed_at: at, value: { skipped: true, robotsState: "DISALLOWED" } }] });
  assert.deepEqual(inv.pages[0].servedState, { state: "UNKNOWN" });
});

test("C4 · OWNERSHIP: every page is owned by the client's tenant only; another client's origin never enters its inventory", () => {
  assert.ok(INV.pages.every((p) => p.owner === TA));
  /* the SAME fixture batch read for the SECOND fixture tenant, whose origin is declared to it */
  const second = readExistingPagePopulation({ scope: { tenantId: TZ }, env: FIXW.env, resolve: fresolve }).population;
  const a = new Set(INV.pages.map((p) => p.pageId));
  assert.ok(second.inventory.pages.length > 0, "the second tenant owns no page — the control cannot fire");
  assert.ok(second.inventory.pages.every((p) => !a.has(p.pageId)), "a page entered two clients' inventories");
  assert.ok(second.inventory.pages.every((p) => p.owner === TZ));
});

test("C4 · the links read for a client are ONLY those recorded from its own observations — another client's link is never parsed", () => {
  const ids = new Set(INV.pages.flatMap((p) => p.evidence.observationIds));
  const mine = readPartitionEdges({ batchId: INV.pages[0].evidence.batchId, observationIds: ids, env: FIXW.env });
  const all = readPartitionEdges({ batchId: INV.pages[0].evidence.batchId, observationIds: { has: () => true }, env: FIXW.env });
  assert.ok(mine.length > 0 && all.length > mine.length, "the control cannot fire: the batch holds no other client's links");
  assert.ok(mine.every((e) => ids.has(e.from_observation_id)), "a link from another client's observation was read");
  console.log(`  C4 (count-only): ${mine.length} of ${all.length} recorded links belong to the client's own observations`);
});

test("C5 · EVIDENCE: every attribute of every page traces to recorded observations that exist", () => {
  for (const p of INV.pages) {
    assert.ok(p.evidence.batchId && p.evidence.observationIds.length > 0, "a page has no recorded source");
    for (const f of p.fingerprints) assert.ok(p.evidence.observationIds.includes(f.observationId), "a fingerprint names a source the page does not cite");
  }
});

/* ================================ C6 · the verdict ================================ */

test("C6 · the REAL record, as it is (records only, count-only): INCOMPLETE, with its method, scope, as-of time and counts — never a manufactured COMPLETE", () => {
  const v = REAL_VERDICT;
  assert.equal(v.state, S.INCOMPLETE);
  assert.equal(v.basis.method, COMPLETENESS_METHOD);
  assert.ok(v.basis.scope.origins >= 1 && v.basis.asOf);
  assert.ok(v.basis.counts.listedUnobserved > 0 || v.basis.counts.linkedUnobserved > 0 || v.basis.counts.sitemapCutShort > 0);
  assert.equal(coverageForConsumers(v), "PARTIAL");
  const c = v.basis.counts;
  console.log(`  REAL VERDICT (count-only): ${v.state} · method ${v.basis.method} · origins ${c.origins} · as of ${v.basis.asOf} · freshness rule ${v.basis.freshnessRule ? `${v.basis.freshnessRule.freshnessDays} days` : "NONE DECLARED"} · observed ${c.servedUrls} · sitemap lists ${c.listedTotal} (stored ${c.listedStored}, ${c.listedUnobserved} unobserved) · links to ${c.linked} unobserved-in-scope ${c.linkedUnobserved} · cut short ${c.sitemapCutShort} · reasons ${v.basis.reasons.join(",")} · bound: ${v.bound}`);
});

test("C6 · COMPLETE only when every listed and linked in-scope URL has a served state, nothing was cut short, and a freshness rule is declared", () => {
  const v = scopeCompleteness(full());
  assert.equal(v.state, S.COMPLETE, v.basis.reasons.join(","));
  assert.equal(v.basis.asOf, "2026-09-20T00:00:00.000Z");
  assert.equal(v.basis.expiresAt, "2026-10-20T00:00:00.000Z");
  assert.deepEqual(v.basis.freshnessRule, { freshnessDays: 30 });
});

test("C6 · each gap is INCOMPLETE and named; missing records or no rule are UNKNOWN; no origin is OUT OF SCOPE; past the rule is STALE", () => {
  const cases = [
    [{ sitemaps: [sitemap([...SITE, `${A}/unseen`])] }, S.INCOMPLETE, R.LISTED_UNOBSERVED],
    [{ edges: [{ from_observation_id: "o0", to: `${A}/linked-unseen` }] }, S.INCOMPLETE, R.LINKED_UNOBSERVED],
    [{ sitemaps: [sitemap(SITE, { urlsTotal: 9, urlsStored: 3 })] }, S.INCOMPLETE, R.SITEMAP_CUT_SHORT],
    [{ sitemaps: [sitemap(SITE, { childrenSkipped: 1 })] }, S.INCOMPLETE, R.SITEMAP_CUT_SHORT],
    [{ sitemaps: [sitemap(SITE, { coverageState: "PARTIAL" })] }, S.INCOMPLETE, R.SITEMAP_CUT_SHORT],
    [{ observations: SITE.map((u, i) => ob(`o${i}`, u, i === 1 ? { truncated: true } : {})) }, S.INCOMPLETE, R.BODY_TRUNCATED],
    [{ observations: SITE.map((u, i) => ob(`o${i}`, u, i === 2 ? { status: null, error: "TIMEOUT" } : {})) }, S.INCOMPLETE, R.NO_SERVED_STATE],
    [{ sitemaps: [] }, S.UNKNOWN, R.NO_SITEMAP],
    [{ freshnessRule: null }, S.UNKNOWN, R.NO_FRESHNESS_RULE],
    [{ observations: [], sitemaps: [sitemap([])], edges: [] }, S.UNKNOWN, R.NO_OBSERVATION],
    [{ origins: [] }, S.OUT_OF_SCOPE, R.NO_ORIGIN],
    [{ now: new Date("2026-11-01T00:00:00Z") }, S.STALE, R.EXPIRED],
  ];
  const states = new Set([scopeCompleteness(full()).state]);
  for (const [change, state, reason] of cases) {
    const v = scopeCompleteness({ ...full(), ...change });
    assert.equal(v.state, state, `${reason}: got ${v.state}`);
    assert.ok(v.basis.reasons.includes(reason), `${state} did not name ${reason}`);
    assert.ok(v.bound.startsWith("recorded data only"), "a verdict without its bound");
    states.add(v.state);
  }
  assert.equal(states.size, 5, "the states were collapsed");
  /* a known gap outranks a missing record */
  assert.equal(scopeCompleteness({ ...full(), freshnessRule: null, edges: [{ from_observation_id: "o0", to: `${A}/linked-unseen` }] }).state, S.INCOMPLETE);
  /* another client's observation is excluded and COUNTED, never part of this scope */
  const z = scopeCompleteness({ ...full(), observations: [...full().observations, ob("z1", `${Z}/x`)] });
  assert.equal(z.state, S.COMPLETE);
  assert.equal(z.basis.counts.outOfScopeObservations, 1);
});

test("C6 · the freshness rule is READ from the tenant's declaration — absent today, and when declared it is carried", () => {
  assert.equal(declaredScope({ tenantId: T }).freshnessRule, null, "a freshness rule was found that nobody declared");
  assert.equal(declaredScope({ tenantId: TA, env: FIXW.env }).freshnessRule, null);
  const world = f31FixtureRoot({ fixed: { records: [] }, tenants: { [TA]: { existingPageInventory: { freshnessDays: 14 } } } });
  try {
    assert.deepEqual(declaredScope({ tenantId: TA, env: world.env }).freshnessRule, { freshnessDays: 14 });
  } finally { world.cleanup(); }
});

test("C6 · the verdict is RECORDED once per read, metadata only, with its basis", () => {
  const ev = RECORDED.filter((e) => e.action === "DECIDE_EXISTING_PAGE_INVENTORY_COMPLETENESS");
  assert.equal(ev.length, 1);
  assert.equal(ev[0].eventType, "EVALUATION");
  assert.equal(ev[0].outcome, "FAIL");
  assert.match(ev[0].metadata.classification, /^state=INCOMPLETE method=RECORDED_SITEMAPS_AND_LINKS .* asOf=\S+ freshDays=none$/);
  assert.deepEqual(Object.keys(ev[0].metadata).filter((k) => !GUARD_METADATA_KEYS.includes(k)), []);
  assert.deepEqual(metadataFaults(ev[0].metadata), []);
  assert.doesNotMatch(JSON.stringify(ev[0]), /https?:\/\//);
  assert.equal(completenessEvent(scopeCompleteness(full())).outcome, "PASS");
});

/* ================================ C7 · the consumers act on it ================================ */

const VALUES = ["alpha", "beta"];
/* The consumers receive the LOADER's population — its coverage comes from the verdict through populationFromPartition, the same
 * mapping the production loader uses; only the pages are set by the test. */
const decideWith = (verdict, pages) => existingPageFirst({
  candidate: { slug: "c", intent: "beta", structure: { values: VALUES } }, tenantId: T,
  population: { ...populationFromPartition({ tenantId: T, records: [], bodies: new Map(), completeness: verdict, inventory: null }), pages },
});
const UNRELATED = [{ pageId: "p1", tenantId: T, html: "<h1>Alpha</h1>" }];

test("C7 · 5.1 — an INCOMPLETE, UNKNOWN, STALE or OUT OF SCOPE inventory HOLDS a new page, even when the only existing page is unrelated", () => {
  for (const change of [{ edges: [{ from_observation_id: "o0", to: `${A}/linked-unseen` }] }, { freshnessRule: null }, { now: new Date("2026-11-01T00:00:00Z") }, { origins: [] }]) {
    const v = scopeCompleteness({ ...full(), ...change });
    assert.notEqual(v.state, S.COMPLETE);
    const d = decideWith(v, UNRELATED);
    assert.equal(d.mayProduce, false, `${v.state}: a new page went through`);
    assert.equal(d.needCoverage.outcome, N.CANNOT_DECIDE);
    const empty = decideWith(v, []);
    assert.equal(empty.mayProduce, false, `${v.state}: an empty but not-complete population let a page through`);
  }
  assert.equal(decideWith(REAL_VERDICT, UNRELATED).mayProduce, false, "the REAL incomplete inventory let a page through");
});

test("C7 · 5.2 — a genuinely COMPLETE inventory lets F33 decide: an unrelated page does NOT block; a covering page still does", () => {
  const v = scopeCompleteness(full());
  assert.equal(v.state, S.COMPLETE);
  const d = decideWith(v, UNRELATED);
  assert.equal(d.needCoverage.outcome, N.NOT_COVERED);
  assert.equal(d.mayProduce, true, "a COMPLETE inventory could not let F33 decide");
  const covered = decideWith(v, [{ pageId: "p2", tenantId: T, html: "<h1>Beta</h1>" }]);
  assert.equal(covered.needCoverage.outcome, N.COVERED);
  assert.equal(covered.mayProduce, false);
});

/* ================================ C8 · recorded data only ================================ */

test("C8 · the inventory, its verdict and its loader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/crawl/scope-completeness.mjs", "src/crawl/scope-inventory.mjs", "src/page/existing-page-population.mjs"];
  const r = decisionCallPaths({ entries });
  assert.deepEqual(r.faults, []);
  assert.ok(r.modules.length >= entries.length);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === "src/crawl/scope-completeness.mjs" ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  console.log(`  C8 (count-only): ${r.modules.length} module(s) in the inventory's static import closure · 0 call-out paths`);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
