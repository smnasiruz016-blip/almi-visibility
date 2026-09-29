/**
 * F21 · ROBOTS, SITEMAP, CANONICAL AND NOINDEX — the proofs of the frozen acceptance (_handoffs 804ebd1, RR-86 §3).
 *
 * 🔴 NO TEST HERE COMPUTES ITS EXPECTED ANSWER WITH THE LOGIC IT CHECKS: every fixture's expected state and classes are WRITTEN BY
 * HAND from the class definitions (K1–K6) in the acceptance. The real recorded data is run as it is and reported count-only.
 * Nothing here writes to the production trail; its bytes are hashed at the end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { indexabilitySignals, htmlCanonicals, robotsFor, RECORDED_HEADERS, URL_STATES as U } from "../src/audit/indexability-signals.mjs";
import { readClientIndexabilitySignals, clientRobots } from "../src/audit/indexability-reader.mjs";
import { canonicalUrl, targetPageId } from "../src/evidence/ids.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { declaredScope } from "../src/page/existing-page-population.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { spawnSync } from "node:child_process";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- a recorded-shape fixture site. A collector that RECORDED the Link header exists only here, declared as such. ---- */
const A = "https://signals-fixture-a.invalid";
const Z = "https://signals-fixture-z.invalid";
const FULL = { "fixture-collector@1": ["x-robots-tag", "link"] };
const at = "2026-09-20T00:00:00Z";
let n = 0;
const ob = (path, extra = {}, collector = "fixture-collector", version = "1") => ({ record_type: "observation", observation_id: `o${++n}`, observed_at: at, collector, collector_version: version, value: { requested_url: `${A}${path}`, final_url: `${A}${path}`, status: 200, truncated: false, error: null, skipped: false, response_headers_subset: {}, ...extra } });
const page = (canon = [], meta = null) => `<html><head>${canon.map((c) => `<link rel="canonical" href="${c}">`).join("")}${meta ? `<meta name="robots" content="${meta}">` : ""}<title>t</title></head><body><p>x</p></body></html>`;
const ROBOTS = { record_type: "observation", observation_id: "rob", value: { url: `${A}/robots.txt`, httpStatus: 200, body: "User-agent: *\nDisallow: /private/\n" } };
const sitemap = (paths, extra = {}) => ({ record_type: "observation", observation_id: "sm", value: { origin: A, urls: paths.map((p) => `${A}${p}`), coverageState: "COMPLETE", childrenSkipped: 0, urlsTotal: paths.length, urlsStored: paths.length, ...extra } });

function world() {
  n = 0;
  const obs = [], bodies = new Map();
  const add = (path, html, extra, collector, version) => { const o = ob(path, extra, collector, version); obs.push(o); if (html !== undefined) bodies.set(o.observation_id, html); return o; };
  add("/ok", page([`${A}/ok`]));
  add("/noindexed", page([`${A}/noindexed`], "noindex,follow"));
  add("/dup", page([`${A}/ok`]));
  add("/points-bad", page([`${A}/gone`]));
  add("/gone", undefined, { status: 404 });
  add("/two-canon", page([`${A}/ok`, `${A}/dup`]));
  add("/noindex-canon", page([`${A}/ok`], "noindex"));
  add("/header-noindex", page([`${A}/header-noindex`]), { response_headers_subset: { "x-robots-tag": "noindex" } });
  add("/truncated", page([`${A}/truncated`]), { truncated: true });
  add("/old-collector", page([`${A}/old-collector`]), {}, "src/crawl/crawler.mjs", "0.1");
  const z = ob("/z"); z.value.requested_url = z.value.final_url = `${Z}/z`; obs.push(z); bodies.set(z.observation_id, page([`${Z}/z`], "noindex"));
  return {
    origins: [A], observations: obs, bodies, robots: [ROBOTS], recordedHeaders: FULL,
    sitemaps: [sitemap(["/ok/", "/private/x", "/noindexed", "/dup", "/header-noindex", "/truncated", "/old-collector"])],
  };
}
const byUrl = (r) => new Map(r.urls.map((u) => [u.pageId, u]));
const id = (path) => targetPageId(canonicalUrl(`${A}${path}`));

/* HAND-WRITTEN EXPECTATIONS, from the class definitions */
const EXPECT = {
  "/ok": [U.CONSISTENT, []],
  "/private/x": [U.CONTRADICTED, ["K1"]],
  "/noindexed": [U.CONTRADICTED, ["K2"]],
  "/dup": [U.CONTRADICTED, ["K3"]],
  "/points-bad": [U.CONTRADICTED, ["K4"]],
  "/two-canon": [U.CONTRADICTED, ["K5"]],
  "/noindex-canon": [U.CONTRADICTED, ["K6"]],
  "/header-noindex": [U.CONTRADICTED, ["K2"]],
  "/gone": [U.NOT_MEASURED, []],
  "/truncated": [U.NOT_MEASURED, []],
  "/old-collector": [U.NOT_MEASURED, []],
};

test("C2 · every contradiction class K1–K6 is exposed where its two signals are known — expectations written from the definitions", () => {
  const r = byUrl(indexabilitySignals(world()));
  for (const [path, [state, classes]] of Object.entries(EXPECT)) {
    const u = r.get(id(path));
    assert.ok(u, `${path} missing from the population`);
    assert.equal(u.state, state, `${path}: ${u.state} ${u.classes.join(",")} unjudged ${u.unjudged.join(",")}`);
    assert.deepEqual([...u.classes], classes, `${path}: classes`);
  }
});

test("C1 · each signal is read from its own recorded source, with the states the acceptance defines", () => {
  const r = byUrl(indexabilitySignals(world()));
  assert.deepEqual(r.get(id("/ok")).signals, { robots: "ALLOWED", sitemap: "LISTED", canonical: "SELF", canonicalHeader: "RECORDED", noindex: "INDEXABLE" });
  assert.equal(r.get(id("/private/x")).signals.robots, "DISALLOWED");
  assert.equal(r.get(id("/header-noindex")).signals.noindex, "NOINDEX", "the recorded X-Robots-Tag was not read");
  assert.equal(r.get(id("/two-canon")).signals.canonical, "CONFLICTING");
  assert.equal(r.get(id("/points-bad")).signals.sitemap, "NOT_LISTED", "a fully stored sitemap could not say 'not listed'");
  assert.deepEqual(htmlCanonicals(page(["/rel", `${A}/abs`]), `${A}/base/`), [canonicalUrl(`${A}/rel`), canonicalUrl(`${A}/abs`)]);
  assert.ok(r.get(id("/dup")).sources.includes("rob") && r.get(id("/dup")).sources.includes("sm"), "a finding lost its sources");
  assert.equal(robotsFor({ observation_id: "r4", value: { httpStatus: 404 } }).known, true, "a recorded 4xx robots means no rules");
  assert.equal(robotsFor({ observation_id: "r5", value: { httpStatus: 503 } }).known, false, "a 5xx robots was treated as known");
  assert.equal(robotsFor({ observation_id: "rE", value: { fetchError: "TIMEOUT" } }).known, false);
});

test("C3 · agreeing signals are never reported; two spellings of one URL are one URL; a self-canonical is not a canonical elsewhere", () => {
  const r = indexabilitySignals(world());
  const ok = byUrl(r).get(id("/ok"));
  assert.equal(ok.state, U.CONSISTENT);
  assert.equal(ok.signals.sitemap, "LISTED", "the sitemap's '/ok/' spelling was not recognised as '/ok'");
  assert.equal(r.urls.filter((u) => u.pageId === id("/ok")).length, 1, "one URL became two");
  assert.equal(r.counts.CONTRADICTED, 7, "a URL with agreeing signals was reported, or one was missed");
});

test("C4 · UNKNOWN is never clean: an unrecorded header, a truncated body, an unserved page, a partly stored sitemap or no robots record", () => {
  const w = world();
  const r = byUrl(indexabilitySignals(w));
  const old = r.get(id("/old-collector"));
  assert.equal(old.signals.canonicalHeader, "NOT_RECORDED");
  assert.equal(old.state, U.NOT_MEASURED, "a URL whose canonical header was never recorded was called CONSISTENT");
  assert.ok(old.unjudged.includes("K5"));
  assert.equal(r.get(id("/truncated")).signals.canonical, "UNKNOWN");
  const partial = byUrl(indexabilitySignals({ ...w, sitemaps: [sitemap(["/ok"], { urlsTotal: 99 })] }));
  assert.equal(partial.get(id("/points-bad")).signals.sitemap, "UNKNOWN", "'not listed' was said over a partly stored sitemap");
  assert.equal(partial.get(id("/ok")).state, U.CONSISTENT, "a listed URL does not need the rest of the sitemap");
  /* 🔴 judged on '/ok', where robots is the ONLY signal that can be unknown — on an unobserved URL the state would be
   * NOT_MEASURED for other reasons and the assertion could not fail (caught by sabotage S14). */
  const noRobots = byUrl(indexabilitySignals({ ...w, robots: [] }));
  assert.equal(noRobots.get(id("/ok")).signals.robots, "UNKNOWN", "a missing robots record was read as a known permission");
  assert.equal(noRobots.get(id("/ok")).state, U.NOT_MEASURED, "a missing robots record was read as permission");
  assert.deepEqual([...noRobots.get(id("/ok")).unjudged], ["K1"]);
  const all = indexabilitySignals(w);
  assert.equal(all.counts.CONTRADICTED + all.counts.CONSISTENT + all.counts.NOT_MEASURED, all.urls.length);
  assert.ok(Object.values(all.counts).every((v) => v > 0), "the three states are not all exercised");
});

test("C5 · SAME CLIENT ONLY: another origin's page is never in the population; robots rows are attributed only through declared origins", () => {
  const r = indexabilitySignals(world());
  assert.ok(!r.urls.some((u) => u.pageId === targetPageId(canonicalUrl(`${Z}/z`))), "another client's page was judged");
  const resolve = createTenantResolver();
  const T = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const origins = declaredScope({ tenantId: T }).origins;
  const mine = clientRobots({ tenantId: T, resolve });
  assert.ok(mine.records.length >= 1);
  assert.ok(mine.records.every((rec) => origins.includes(new URL(rec.value.url).origin)), "another client's robots record was attributed");
  const planted = clientRobots({ tenantId: T, resolve: () => ({ state: "UNDECLARED" }) });
  assert.equal(planted.records.length, 0, "an undeclared host was attributed");
});

test("C6 · the result carries its bound and its population; findings carry page identities and sources, never a URL", () => {
  const r = indexabilitySignals(world());
  assert.match(r.bound, /^recorded data only · \d+ in-scope URL\(s\) \(\d+ observed, \d+ listed in the stored sitemap\) · \d+ stored bodies · robots known for 1 of 1 origin\(s\)$/);
  assert.doesNotMatch(JSON.stringify(r.urls), /https?:\/\//, "a finding carries a URL");
  assert.ok(r.urls.filter((u) => u.state === U.CONTRADICTED).every((u) => /^[0-9a-f]{16}$/.test(u.pageId) && u.sources.length > 0));
});

test("REAL · the client's recorded data, as it is — three-state and per-class counts, count-only", () => {
  const resolve = createTenantResolver();
  const T = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const r = readClientIndexabilitySignals({ tenantId: T, resolve });
  assert.ok(r.urls.length > 0, "EMPTY real population");
  assert.equal(r.counts.CONTRADICTED + r.counts.CONSISTENT + r.counts.NOT_MEASURED, r.urls.length);
  /* the real collector did not record the Link header, so no real URL may be CONSISTENT */
  assert.equal(RECORDED_HEADERS["src/crawl/crawler.mjs@0.1"].includes("link"), false);
  assert.equal(r.counts.CONSISTENT, 0, "a real URL was called CONSISTENT although its canonical header was never recorded");
  assert.ok(r.urls.filter((u) => u.signals.sitemap === "LISTED").every((u) => !u.unjudged.includes("K1")), "K1 was not judged for a listed URL with a known robots record");
  console.log(`  REAL (count-only): ${JSON.stringify(r.counts)} · per class ${JSON.stringify(r.byClass)} · unjudged per class ${JSON.stringify(r.unjudgedByClass)} · bound: ${r.bound}`);
});

test("C7 · the audit and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/audit/indexability-signals.mjs", "src/audit/indexability-reader.mjs"];
  const r = decisionCallPaths({ entries });
  assert.deepEqual(r.faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  console.log(`  C7 (count-only): ${r.modules.length} module(s) in the static import closure · 0 call-out paths`);
});

test("C5/C6 · THE ENTRY POINT: in a declared world it runs and prints counts only; against the real declarations it is REFUSED before any read", () => {
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/indexability-audit.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /URLs {9}CONTRADICTED \d+ · CONSISTENT \d+ · NOT_MEASURED \d+/);
    assert.match(ok.stdout, /bound {8}recorded data only · \d+ in-scope URL\(s\)/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  const resolve = createTenantResolver();
  const T = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const real = spawnSync(process.execPath, ["bin/indexability-audit.mjs", `--tenant=${T}`, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.notEqual(real.status, 0, "the entry point read a shared store no declaration assigns to this client");
  assert.doesNotMatch(real.stdout, /URLs {9}CONTRADICTED/, "a refused run printed a result");
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
