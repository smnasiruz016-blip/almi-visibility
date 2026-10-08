/**
 * 🔴 RR-223 · F31 ACCEPTANCE AMENDMENT 1 · C9 — NEWER DECLARED COLLECTIONS (_handoffs 7805047, approved by its hash db95b7ef…, contract
 * 1453dd16…). One test per EVIDENCE line of C9; C1–C8 are re-proved in test/f31-inventory.test.mjs (moved to fixture pages, RR-177).
 * Every client here is a FIXTURE data root built from nothing (test/helpers/f31-fixture-root.mjs); the one real read is the count-only,
 * records-only verdict control. Nothing here writes to the production trail; the trail is hashed at the end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readExistingPagePopulation, declaredScope } from "../src/page/existing-page-population.mjs";
import { declaredNewerBatches, readNewerCollections, mergeCollections } from "../src/crawl/newer-collections.mjs";
import { scopeCompleteness, COMPLETENESS as S, COMPLETENESS_REASONS as R } from "../src/crawl/scope-completeness.mjs";
import { readTenantPartition, readPartitionEdges } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { canonicalUrl, targetPageId } from "../src/evidence/ids.mjs";
import { f31FixtureRoot, FA, FZ, TA, TZ, SUBJECT_A, SUBJECT_Z, OLD, obs, page, sitemapRec, links, run, sha } from "./helpers/f31-fixture-root.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const NEW = "2026-10-05T00:00:00Z", NEWER = "2026-10-06T00:00:00Z";
const pid = (u) => targetPageId(canonicalUrl(u));
const NOW = new Date("2026-10-08T00:00:00Z");

/* the fixed batch every world starts from: tenant A's home and /one, tenant Z's home */
const FIXED = () => ({
  records: [obs("fa1", `${FA}/`, { body: "<h1>Home</h1>" }), page(`${FA}/`, ["fa1"]), obs("fa2", `${FA}/one`, { body: "<h1>One</h1>" }), page(`${FA}/one`, ["fa2"]),
    obs("fz1", `${FZ}/`, { body: "<h1>Zed</h1>" }), page(`${FZ}/`, ["fz1"])],
  bodies: [["fa1", "<h1>Home</h1>"], ["fa2", "<h1>One</h1>"], ["fz1", "<h1>Zed</h1>"]],
  /* fa1 also once linked to /gone: once fa1 is superseded by a newer observation of the home page, that link is no longer one the verdict uses */
  edges: [{ from_observation_id: "fa1", to: `${FA}/one` }, { from_observation_id: "fa1", to: `${FA}/gone` }, { from_observation_id: "fz1", to: `${FZ}/x` }],
  sitemaps: [sitemapRec(FA, [`${FA}/`, `${FA}/one`])],
});
function read(world, tenantId = TA) {
  const resolve = createTenantResolver({ env: world.env });
  return readExistingPagePopulation({ scope: { tenantId }, resolve, env: world.env, now: NOW });
}
function withWorld(spec, fn) { const w = f31FixtureRoot(spec); try { return fn(w); } finally { w.cleanup(); } }

/* ================= C9 · the newer observation decides; the older stays in the evidence ================= */
test("T31-C9-NEWER · F31 C9: a newer attached batch's observation decides the served state and fingerprint, the older stays in the evidence; a newer failed request makes the state UNKNOWN and the verdict INCOMPLETE; without the batch nothing changes", () => {
  const newer = (o) => ({ "newer-a": { attachTo: TA, namedBy: SUBJECT_A, crawl: [o, run()], bodies: o.value.status === 200 ? [[o.observation_id, "<h1>One, revised</h1>"]] : [] } });
  withWorld({ fixed: FIXED(), batches: newer(obs("na2", `${FA}/one`, { at: NEW, body: "<h1>One, revised</h1>" })) }, (w) => {
    const r = read(w);
    assert.deepEqual(r.newerBatches, ["newer-a"]);
    const p = r.population.inventory.pages.find((x) => x.pageId === pid(`${FA}/one`));
    assert.equal(p.servedState.observedAt, NEW, "the older observation decided the served state");
    assert.deepEqual([...p.evidence.observationIds], ["fa2", "na2"], "the older observation was dropped from the evidence");
    assert.deepEqual([...p.evidence.batches], [BATCH_ID, "newer-a"]);
    assert.equal(p.fingerprints.at(-1).sha256, sha("<h1>One, revised</h1>"));
    assert.equal(r.population.pages.find((x) => x.pageId === p.pageId).html, "<h1>One, revised</h1>", "the population read the older body");
  });
  withWorld({ fixed: FIXED(), batches: newer(obs("nf", `${FA}/one`, { at: NEW, status: null })) }, (w) => {
    const r = read(w);
    const p = r.population.inventory.pages.find((x) => x.pageId === pid(`${FA}/one`));
    assert.deepEqual(p.servedState, { state: "UNKNOWN" }, "an older served state outlived a newer failed request");
    assert.deepEqual([...p.evidence.observationIds], ["fa2", "nf"]);
    assert.equal(r.population.completeness.state, S.INCOMPLETE);
    assert.ok(r.population.completeness.basis.reasons.includes(R.NO_SERVED_STATE));
  });
  withWorld({ fixed: FIXED() }, (w) => {
    const p = read(w).population.inventory.pages.find((x) => x.pageId === pid(`${FA}/one`));
    assert.equal(p.servedState.observedAt, OLD, "CONTROL: without a newer batch the fixed observation decides");
  });
});

/* ================= C9 · only an attached, named batch of THIS tenant is read ================= */
test("T31-C9-SCOPE · F31 C9: a batch attached to another tenant, attached to none, or attached but named by no subject of this tenant is never read", () => {
  const spec = { fixed: FIXED(), batches: {
    "newer-a": { attachTo: TA, namedBy: SUBJECT_A, crawl: [obs("na", `${FA}/a`, { at: NEW }), run()] },
    "other-z": { attachTo: TZ, namedBy: SUBJECT_Z, crawl: [obs("nz", `${FZ}/z`, { at: NEW }), obs("nza", `${FA}/from-z`, { at: NEW }), run()] },
    "unattached": { attachTo: null, namedBy: null, crawl: [obs("nu", `${FA}/unattached`, { at: NEW }), run()] },
    "unnamed": { attachTo: TA, namedBy: null, crawl: [obs("nx", `${FA}/unnamed`, { at: NEW }), run()] },
  } };
  withWorld(spec, (w) => {
    const resolve = createTenantResolver({ env: w.env });
    assert.deepEqual(declaredNewerBatches({ tenantId: TA, resolve, env: w.env }), ["newer-a"]);
    assert.deepEqual(declaredNewerBatches({ tenantId: TZ, resolve, env: w.env }), ["other-z"]);
    const ids = new Set(read(w).population.inventory.pages.map((p) => p.pageId));
    for (const u of [`${FA}/from-z`, `${FA}/unattached`, `${FA}/unnamed`, `${FZ}/z`]) assert.ok(!ids.has(pid(u)), `a page from a batch this tenant may not read entered its inventory: ${u.slice(-10)}`);
    assert.ok(ids.has(pid(`${FA}/a`)), "CONTROL: the attached, named batch was not read");
    const z = new Set(read(w, TZ).population.inventory.pages.map((p) => p.pageId));
    assert.ok(z.has(pid(`${FZ}/z`)) && !z.has(pid(`${FA}/from-z`)), "another tenant's URL in a batch entered the batch-holder's inventory");
  });
});

/* ================= C9 · a body only from the batch's own declared store ================= */
test("T31-C9-BODY · F31 C9: a newer observation with no stored body keeps its served state and has no body (NOT MEASURED); the same bytes proved by hash are read; a local or undeclared file is never read for a body", () => {
  const changed = obs("nc", `${FA}/one`, { at: NEW, body: "<h1>Changed</h1>" });
  const same = obs("ns", `${FA}/`, { at: NEW, body: "<h1>Home</h1>" });
  const spec = { fixed: FIXED(), batches: { "newer-a": { attachTo: TA, namedBy: SUBJECT_A, crawl: [changed, same, run()],
    extraFiles: { "corpus/one.html": "<h1>Changed</h1>", "bodies-extra.jsonl": JSON.stringify({ observation_id: "nc", body: "<h1>Changed</h1>" }) + "\n" } } } };
  withWorld(spec, (w) => {
    const r = read(w);
    const one = r.population.pages.find((x) => x.pageId === pid(`${FA}/one`));
    assert.equal(one.html, "", "a body was read for a changed page that no declared store holds (or from an undeclared file)");
    assert.equal(r.population.inventory.pages.find((x) => x.pageId === one.pageId).servedState.state, "OBSERVED", "the served state was lost with the body");
    const home = r.population.pages.find((x) => x.pageId === pid(`${FA}/`));
    assert.equal(home.html, "<h1>Home</h1>", "the stored bytes the newer fingerprint proves were not read");
    assert.equal(home.bodyObservationId, "fa1");
  });
  const declared = { fixed: FIXED(), batches: { "newer-a": { attachTo: TA, namedBy: SUBJECT_A, crawl: [changed, run()], bodies: [["nc", "<h1>Changed</h1>"]] } } };
  withWorld(declared, (w) => assert.equal(read(w).population.pages.find((x) => x.pageId === pid(`${FA}/one`)).html, "<h1>Changed</h1>", "CONTROL: the batch's declared body store was not read"));
});

/* ================= C9 · cut short keeps it INCOMPLETE ================= */
test("T31-C9-CUT · F31 C9: a capped sitemap listing in the newer batch, or a newer crawl run recorded as not COMPLETE, keeps the verdict INCOMPLETE", () => {
  const tenants = { [TA]: { existingPageInventory: { freshnessDays: 60 } } };
  const all = () => [obs("n1", `${FA}/`, { at: NEW }), obs("n2", `${FA}/one`, { at: NEW })];
  const capped = sitemapRec(FA, [`${FA}/`, `${FA}/one`], { at: NEW, id: "smn", urlsTotal: 9, urlsStored: 2 });
  withWorld({ fixed: FIXED(), tenants, batches: { "newer-a": { attachTo: TA, namedBy: SUBJECT_A, crawl: [...all(), run()], sitemaps: [capped] } } }, (w) => {
    const v = read(w).population.completeness;
    assert.equal(v.state, S.INCOMPLETE, "a capped newer listing counted as complete");
    assert.ok(v.basis.reasons.includes(R.SITEMAP_CUT_SHORT));
  });
  withWorld({ fixed: FIXED(), tenants, batches: { "newer-a": { attachTo: TA, namedBy: SUBJECT_A, crawl: [...all(), run("PARTIAL")] } } }, (w) => {
    const v = read(w).population.completeness;
    assert.equal(v.state, S.INCOMPLETE, "a cut-short newer crawl run counted as complete");
    assert.deepEqual([...v.basis.reasons], [R.CRAWL_CUT_SHORT]);
  });
  withWorld({ fixed: FIXED(), tenants, batches: { "newer-a": { attachTo: TA, namedBy: SUBJECT_A, crawl: [...all(), run()] } } }, (w) => assert.equal(read(w).population.completeness.state, S.COMPLETE, "CONTROL: a COMPLETE run was held as cut short"));
});

/* ================= C9 · the first COMPLETE from new data, as of its earliest used observation ================= */
test("T31-C9-COMPLETE · F31 C9: a newer batch that observes every listed and linked URL, with a declared freshness rule, gives COMPLETE; its as-of is the earliest observation the verdict uses", () => {
  const tenants = { [TA]: { existingPageInventory: { freshnessDays: 30 } } };
  const batch = { attachTo: TA, namedBy: SUBJECT_A, crawl: [obs("n1", `${FA}/`, { at: NEWER }), obs("n2", `${FA}/one`, { at: NEW }), obs("n3", `${FA}/two`, { at: NEWER }), links("n1", `${FA}/`, [`${FA}/two`], NEWER), run()],
    sitemaps: [sitemapRec(FA, [`${FA}/`, `${FA}/one`, `${FA}/two`], { at: NEWER, id: "smn" })] };
  withWorld({ fixed: FIXED(), tenants, batches: { "newer-a": batch } }, (w) => {
    const v = read(w).population.completeness;
    assert.equal(v.state, S.COMPLETE, v.basis.reasons.join(","));
    assert.equal(v.basis.asOf, new Date(NEW).toISOString(), "the as-of time is not the earliest observation the verdict uses");
    assert.equal(v.basis.expiresAt, new Date(Date.parse(NEW) + 30 * 86400000).toISOString());
  });
  withWorld({ fixed: FIXED(), tenants: {}, batches: { "newer-a": batch } }, (w) => assert.equal(read(w).population.completeness.state, S.UNKNOWN, "CONTROL: COMPLETE without a declared freshness rule"));
  const linkedOut = { ...batch, crawl: [...batch.crawl, links("n2", `${FA}/one`, [`${FA}/three`], NEW)] };
  withWorld({ fixed: FIXED(), tenants, batches: { "newer-a": linkedOut } }, (w) => assert.equal(read(w).population.completeness.state, S.INCOMPLETE, "CONTROL: a newly linked unobserved URL left it COMPLETE"));
});

/* ================= C9 · the real-structure control, count-only, records only ================= */
test("T31-C9-REAL · F31 C9: every real tenant whose newer batches hold no observation of it keeps the verdict it had over the fixed batches; tenants with newer observations are reported count-only", () => {
  const resolve = createTenantResolver();
  const tally = { unchanged: 0, withNewer: 0 };
  for (const t of readDeclarations().tenants ?? []) {
    const declared = declaredScope({ tenantId: t.tenantId });
    if (!declared.origins.length) continue;
    const part = readTenantPartition({ batchId: BATCH_ID, tenantId: t.tenantId, resolve });
    const sm = readTenantPartition({ batchId: SITEMAP_BATCH_ID, tenantId: t.tenantId, resolve }).records.filter((r) => r.record_type === "observation");
    const edges = readPartitionEdges({ batchId: BATCH_ID, observationIds: part.observationIds });
    const fixedOnly = scopeCompleteness({ origins: declared.origins, observations: part.records.filter((r) => r.record_type === "observation"), sitemaps: sm, edges, freshnessRule: declared.freshnessRule, now: NOW });
    const newer = readNewerCollections({ tenantId: t.tenantId, resolve });
    const m = mergeCollections({ fixed: { batchId: BATCH_ID, records: part.records, bodies: new Map(), sitemaps: sm, edges }, newer });
    const withC9 = scopeCompleteness({ origins: declared.origins, observations: m.observations, sitemaps: m.sitemaps, edges: m.edges, freshnessRule: declared.freshnessRule, now: NOW, crawlRunsCutShort: m.crawlRunsCutShort });
    if (newer.some((n) => n.observations.length)) { tally.withNewer++; continue; }
    assert.equal(withC9.state, fixedOnly.state, `a real tenant with no newer observation changed its verdict (${t.tenantId.slice(7, 13)})`);
    tally.unchanged++;
  }
  assert.ok(tally.unchanged > 0, "no real tenant was compared — the control would prove nothing");
  console.log(`  REAL (count-only, records only): ${tally.unchanged} tenant(s) without newer observations — verdict unchanged · ${tally.withNewer} tenant(s) with newer declared observations, read through C9`);
});

/* ================= C9 · no consumer reads a batch outside F31's reader ================= */
const mjsUnder = (dir) => readdirSync(join(REPO, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? mjsUnder(`${dir}/${e.name}`) : e.name.endsWith(".mjs") ? [`${dir}/${e.name}`] : []));
const CONSUMERS = ["src/page/action-evidence.mjs", "src/page/answer-first-evidence.mjs", "src/page/content-brief-evidence.mjs", "src/page/content-decay-evidence.mjs", "src/page/duplication-evidence.mjs", "src/page/indexation-evidence.mjs", "src/page/information-gain-evidence.mjs", "src/page/media-visibility-evidence.mjs", "src/page/site-plan-evidence.mjs", "src/page/structured-data-evidence.mjs", "src/page/trust-signals-evidence.mjs", "bin/build-page.mjs", "bin/demand-connect.mjs", "bin/entity-map.mjs"];
const BATCH_READ = /newer-collections\.mjs|readNewerCollections|NEWER_FILES|["'`]crawl\.jsonl["'`]|["'`]bodies\.jsonl["'`]/;
test("T31-C9-CENSUS · F31 C9: every consumer reads the population through F31's one reader; none reads a newer batch on its own — and the census fires on a planted read", () => {
  for (const f of CONSUMERS) {
    const t = readFileSync(join(REPO, f), "utf8");
    assert.match(t, /readExistingPagePopulation|readExistingPagePopulation\(/, `${f} is not a consumer of F31's reader`);
    assert.doesNotMatch(t, BATCH_READ, `${f} reads a newer batch outside F31's reader`);
  }
  /* an IMPORT of the reader — F02's census names its file as an exclusion (F02 Amendment 2), which is not a read */
  const importers = ["src", "bin", "tools"].flatMap(mjsUnder).filter((f) => /\bfrom\s+["'][^"']*newer-collections\.mjs["']/.test(readFileSync(join(REPO, f), "utf8")));
  assert.deepEqual(importers, ["src/page/existing-page-population.mjs"], "a module other than F31's reader reads the newer collections");
  assert.match('import { readNewerCollections } from "../crawl/newer-collections.mjs";', BATCH_READ, "the census cannot see a planted read");
});

test("R31-BOARD · F31 moves only through the production validator and the audit trail: REOPENED by its own Amendment 1, VERIFIED-PASS only with a REAL VERIFIED event under it, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const ev = DECLARED.F31.events;
  const amended = ev.findIndex((e) => e.kind === "ACCEPTANCE_AMENDED");
  assert.ok(amended > 0 && ev[amended + 1]?.kind === "REOPENED" && ev[amended + 1].reason === "AUTHORITATIVE_REQUIREMENT_CHANGE");
  assert.equal(ev[amended].ruling.commit, "7805047ef3ae6beac8a3830bab5c28e3ce564363");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F31" && e.occurredAt.startsWith("2026-10-08")), "F31's reopening is not in the trail");
  if (DECLARED.F31.state === "VERIFIED-PASS") {
    const v = ev.slice(amended).find((e) => e.kind === "VERIFIED");
    assert.equal(v.population, "REAL");
    assert.deepEqual(Object.keys(v.clauses), ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"]);
    assert.ok(Object.values(v.clauses).every((x) => x === "PROVED"));
  } else assert.equal(DECLARED.F31.state, "IN-PROGRESS");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
