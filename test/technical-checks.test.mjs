import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import {
  STATUS_AND_REDIRECTS, HTTPS_ONLY, CANONICAL, NOINDEX, HEAD_ELEMENTS,
  BROKEN_INTERNAL_LINK, QUERY_PARAMETERS, INDEXABILITY_PREFLIGHT,
  parseHead, noindexState, preflight, STRUCTURALLY_UNKNOWN, INDEXABLE_IS_NOT_INDEXED,
  PREFLIGHT_CONDITIONS,
} from "../src/audit/technical-checks.mjs";
import { collectSitemapUrls, contradictions, SITEMAP_VS_ROBOTS, MAX_CHILD_SITEMAPS } from "../src/audit/sitemap-check.mjs";
import { detectCannibalization } from "../src/audit/content-checks.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OBS = (value = {}) => [{ observation_id: "o1", value: { status: 200, final_url: "https://e.example.com/a", requested_url: "https://e.example.com/a", response_headers_subset: {}, ...value } }];
const CTX = (o = {}) => ({ openedAt: "2026-09-12T00:00:00.000Z", statusByUrl: new Map(), titleCounts: new Map(), ...o });
const PAGE = { canonical_url: "https://e.example.com/a" };

const page = (head = "", body = "<main>words words words</main>") =>
  `<!doctype html><html><head><title>T</title><meta name="description" content="d">${head}</head><body><h1>H</h1>${body}</body></html>`;

/**
 * 🔴 LAW-FIXTURE-1 — these pages are hand-built and tidy. They do NOT test
 * malformed markup, duplicated <head>s, or framework hydration payloads. The
 * assertions at the foot run against the REAL findings file.
 */

/* ================================================================== *
 * 1 — STATUS AND REDIRECTS
 * ================================================================== */

test("🔴 STATUS — FIRES on a 404, SILENT on a clean 200", async () => {
  const fired = await STATUS_AND_REDIRECTS.run({ page: PAGE, observations: OBS({ status: 404 }), siteContext: CTX() });
  assert.equal(fired.verdict, "FAIL");
  const silent = await STATUS_AND_REDIRECTS.run({ page: PAGE, observations: OBS(), siteContext: CTX() });
  assert.equal(silent, null, "🔴 FALSE POSITIVE on a clean 200");
});

test("STATUS — a 200 reached via a redirect is reported, at low severity", async () => {
  const f = await STATUS_AND_REDIRECTS.run({
    page: PAGE, observations: OBS({ requested_url: "https://e.example.com/old", final_url: "https://e.example.com/a" }), siteContext: CTX(),
  });
  assert.equal(f.severity, "low");
  assert.match(f.summary, /redirected/);
});

/* ================================================================== *
 * 2 — HTTPS
 * ================================================================== */

test("🔴 HTTPS — FIRES on http://, SILENT on https://", async () => {
  const fired = await HTTPS_ONLY.run({ page: { canonical_url: "http://e.example.com/a" }, observations: OBS({ final_url: "http://e.example.com/a" }), siteContext: CTX() });
  assert.equal(fired.verdict, "FAIL");
  assert.equal(await HTTPS_ONLY.run({ page: PAGE, observations: OBS(), siteContext: CTX() }), null);
});

/* ================================================================== *
 * 3 — CANONICALS
 * ================================================================== */

test("🔴 CANONICAL — FIRES on a cross-host canonical, SILENT on a self canonical", async () => {
  const fired = await CANONICAL.run({
    page: PAGE, observations: OBS(),
    siteContext: CTX({ bodyHtml: page('<link rel="canonical" href="https://other.example.net/a">') }),
  });
  assert.equal(fired.verdict, "FAIL");
  assert.match(fired.summary, /another host/);

  const silent = await CANONICAL.run({
    page: PAGE, observations: OBS(),
    siteContext: CTX({ bodyHtml: page('<link rel="canonical" href="https://e.example.com/a">') }),
  });
  assert.equal(silent, null, "🔴 FALSE POSITIVE: a self canonical was flagged");
});

test("CANONICAL — a canonical pointing at a URL WE OBSERVED as non-200 fires; an unobserved one does not", async () => {
  const seen = new Map([["https://e.example.com/dead", 404]]);
  const fired = await CANONICAL.run({
    page: PAGE, observations: OBS(),
    siteContext: CTX({ bodyHtml: page('<link rel="canonical" href="https://e.example.com/dead">'), statusByUrl: seen }),
  });
  assert.equal(fired.verdict, "FAIL");

  // 🔴 A canonical to a URL we never fetched is UNMEASURED, not broken.
  const silent = await CANONICAL.run({
    page: PAGE, observations: OBS(),
    siteContext: CTX({ bodyHtml: page('<link rel="canonical" href="https://e.example.com/never-fetched">'), statusByUrl: seen }),
  });
  assert.equal(silent, null);
});

/* ================================================================== *
 * 4 — NOINDEX. THE FALSE POSITIVE THIS CHECK ALREADY HAD.
 * ================================================================== */

test("🔴 NOINDEX — FIRES on meta noindex, SILENT on index,follow", async () => {
  const fired = await NOINDEX.run({
    page: PAGE, observations: OBS(), siteContext: CTX({ bodyHtml: page('<meta name="robots" content="noindex,follow">') }),
  });
  assert.equal(fired.verdict, "FAIL");

  const silent = await NOINDEX.run({
    page: PAGE, observations: OBS(), siteContext: CTX({ bodyHtml: page('<meta name="robots" content="index,follow">') }),
  });
  assert.equal(silent, null);
});

test("🔴 NOINDEX — AN ABSENT X-Robots-Tag IS NOT A DISAGREEMENT (LAW-ABSENT-1)", () => {
  /* The first version of this check called `meta=noindex, header absent` a
   * DISAGREEMENT and fired on 134 of 394 real pages — every one of them the
   * ordinary way to noindex a page. The absence of a measurement was being
   * reported as a conflicting measurement. */
  const s = noindexState({ metaRobots: ["noindex,follow"], xRobotsTag: null });
  assert.equal(s.noindexed, true);
  assert.equal(s.disagree, false, "🔴 an absent header must not count as a contradiction");
  assert.equal(s.headerPresent, false);
});

test("🔴 NOINDEX — a REAL disagreement is when both speak and differ", () => {
  const s = noindexState({ metaRobots: ["noindex"], xRobotsTag: "index" });
  assert.equal(s.disagree, true);
  assert.equal(s.noindexed, true, "Google takes the most restrictive, so it is still noindexed");
});

test("NOINDEX — an X-Robots-Tag header alone is enough", () => {
  const s = noindexState({ metaRobots: [], xRobotsTag: "noindex, nofollow" });
  assert.equal(s.inHeader, true);
  assert.equal(s.noindexed, true);
});

/* ================================================================== *
 * 5 — HEAD ELEMENTS
 * ================================================================== */

test("🔴 HEAD — FIRES on a missing h1 and empty title, SILENT on a well-formed head", async () => {
  const bad = '<!doctype html><html><head><title></title></head><body><p>x</p></body></html>';
  const fired = await HEAD_ELEMENTS.run({ page: PAGE, observations: OBS(), siteContext: CTX({ bodyHtml: bad }) });
  assert.equal(fired.verdict, "FAIL");
  assert.match(fired.summary, /no <h1>/);

  const silent = await HEAD_ELEMENTS.run({ page: PAGE, observations: OBS(), siteContext: CTX({ bodyHtml: page() }) });
  assert.equal(silent, null, "🔴 FALSE POSITIVE on a well-formed page");
});

test("HEAD — a duplicated title is reported, and a skipped heading level is caught", async () => {
  const dup = await HEAD_ELEMENTS.run({
    page: PAGE, observations: OBS(), siteContext: CTX({ bodyHtml: page(), titleCounts: new Map([["T", 3]]) }),
  });
  assert.match(dup.summary, /shared with 2 other page/);

  const skip = await HEAD_ELEMENTS.run({
    page: PAGE, observations: OBS(), siteContext: CTX({ bodyHtml: page("", "<main><h3>deep</h3></main>") }),
  });
  assert.match(skip.summary, /h3 used with no h2/);
});

/* ================================================================== *
 * 6 — BROKEN INTERNAL LINKS
 * ================================================================== */

test("🔴 BROKEN LINK — FIRES on a link to an observed 404, SILENT when every link is 200", async () => {
  const seen = new Map([["https://e.example.com/dead", 404], ["https://e.example.com/ok", 200]]);
  const fired = await BROKEN_INTERNAL_LINK.run({
    page: PAGE, observations: OBS(), siteContext: CTX({ statusByUrl: seen, outboundLinks: ["https://e.example.com/dead"] }),
  });
  assert.equal(fired.verdict, "FAIL");

  const silent = await BROKEN_INTERNAL_LINK.run({
    page: PAGE, observations: OBS(), siteContext: CTX({ statusByUrl: seen, outboundLinks: ["https://e.example.com/ok"] }),
  });
  assert.equal(silent, null);
});

test("🔴 BROKEN LINK — a link to a URL WE NEVER FETCHED is not broken, it is unmeasured", async () => {
  const f = await BROKEN_INTERNAL_LINK.run({
    page: PAGE, observations: OBS(),
    siteContext: CTX({ statusByUrl: new Map(), outboundLinks: ["https://e.example.com/never-seen"] }),
  });
  assert.equal(f, null, "🔴 an unmeasured link was reported as broken");
});

/* ================================================================== *
 * 7 — QUERY PARAMETERS
 * ================================================================== */

test("🔴 PARAMS — FIRES on ?sort=asc&page=2, SILENT on a clean path", async () => {
  const fired = await QUERY_PARAMETERS.run({
    page: { canonical_url: "https://e.example.com/a?sort=asc&page=2" }, observations: OBS(), siteContext: CTX(),
  });
  assert.equal(fired.verdict, "FAIL");
  assert.equal(await QUERY_PARAMETERS.run({ page: PAGE, observations: OBS(), siteContext: CTX() }), null);
});

/* ================================================================== *
 * 🔴 THE TWO THAT CANNOT BE MEASURED — AND SAY SO.
 * ================================================================== */

test("🔴 rendering and crawl depth are declared permanently UNKNOWN, with reasons", () => {
  assert.equal(STRUCTURALLY_UNKNOWN.rendering.reasonCode, "NEEDS_RENDERED_HTML");
  assert.match(STRUCTURALLY_UNKNOWN.rendering.why, /no honest approximation/);
  assert.equal(STRUCTURALLY_UNKNOWN.crawlDepth.reasonCode, "NOT_APPLICABLE_YET");
  assert.match(STRUCTURALLY_UNKNOWN.crawlDepth.why, /deliberate design choice, not an oversight/);
});

/* ================================================================== *
 * PART 2 — SITEMAP VS ROBOTS.
 * ================================================================== */

const SITEMAP_BLOCKS = `User-Agent: Googlebot\nAllow: /\nDisallow: /exam/*/from/\n\nUser-Agent: *\nAllow: /\nDisallow: /exam/*/from/\n`;
const SITEMAP_CLEAN = `User-Agent: Googlebot\nAllow: /\n\nUser-Agent: *\nAllow: /\nDisallow: /exam/*/from/\n`;
const ADVERTISED = "https://e.example.com/exam/celi/from/cuba";

test("🔴 SITEMAP×ROBOTS — FIRES when a sitemap URL is disallowed for Googlebot", async () => {
  const f = await SITEMAP_VS_ROBOTS.run({
    page: { canonical_url: ADVERTISED }, observations: OBS(),
    siteContext: CTX({
      robotsObservation: { observation_id: "r1", value: { body: SITEMAP_BLOCKS } },
      sitemapUrls: [ADVERTISED], sitemapObservationId: "s1", impressions: 4,
    }),
  });
  assert.equal(f.verdict, "FAIL");
  assert.equal(f.severity, "critical");
  assert.deepEqual([...f.evidence].sort(), ["o1", "r1", "s1"]);
});

test("🔴 SITEMAP×ROBOTS — CLEAN CONTROL: the same sitemap with Googlebot permitted stays SILENT", async () => {
  const f = await SITEMAP_VS_ROBOTS.run({
    page: { canonical_url: ADVERTISED }, observations: OBS(),
    siteContext: CTX({
      robotsObservation: { observation_id: "r1", value: { body: SITEMAP_CLEAN } },
      sitemapUrls: [ADVERTISED], sitemapObservationId: "s1",
    }),
  });
  assert.equal(f, null, "🔴 FALSE POSITIVE: a block that applies only to us is not a contradiction");
});

test("the sitemap collector BOUNDS its fetch and reports what it skipped", async () => {
  let calls = 0;
  const children = Array.from({ length: 25 }, (_, i) => `<sitemap><loc>https://e.example.com/s${i}.xml</loc></sitemap>`).join("");
  const fetchImpl = async (url) => {
    calls += 1;
    if (url.endsWith("sitemap-index.xml")) return { ok: true, status: 200, text: async () => `<sitemapindex>${children}</sitemapindex>` };
    return { ok: true, status: 200, text: async () => "<urlset><url><loc>https://e.example.com/p</loc></url></urlset>" };
  };
  const r = await collectSitemapUrls({ origin: "https://e.example.com", fetchImpl, sleepImpl: async () => {} });
  assert.equal(r.childrenFetched, MAX_CHILD_SITEMAPS);
  assert.equal(r.childrenTotal, 25);
  assert.equal(r.childrenSkipped, 15);
  assert.equal(r.coverageState, "PARTIAL", "a bounded read must never claim COMPLETE");
  assert.equal(r.requests, 1 + MAX_CHILD_SITEMAPS, "every request must be counted");
});

test("a sitemap that cannot be read is UNKNOWN, not 'no URLs'", async () => {
  const r = await collectSitemapUrls({
    origin: "https://e.example.com",
    fetchImpl: async () => ({ ok: false, status: 500, text: async () => "" }),
    sleepImpl: async () => {},
  });
  assert.equal(r.coverageState, "UNKNOWN");
  assert.equal(r.urls.length, 0);
  assert.match(r.why, /no sitemap could be read/);
});

/* ================================================================== *
 * PART 4 — ITEM 38. IT NEVER PROMISES ANYTHING.
 * ================================================================== */

test("🔴 PREFLIGHT — the INDEXABLE ≠ INDEXED note travels with every result", () => {
  const p = preflight({ status: 200, robotsAllowed: true, noindexed: false, canonicalOk: true, inSitemap: true, hasContent: true });
  assert.equal(p.state, "ELIGIBLE");
  assert.ok(p.note.includes("INDEXABLE ≠ INDEXED"));
});

test("🔴 PREFLIGHT — NEVER states or implies a page WILL be indexed, ranked or cited", async () => {
  const outputs = [
    JSON.stringify(preflight({ status: 200, robotsAllowed: true, noindexed: false, canonicalOk: true, inSitemap: true, hasContent: true })),
    JSON.stringify(preflight({ status: 404 })),
    JSON.stringify(await INDEXABILITY_PREFLIGHT.run({
      page: PAGE, observations: OBS(),
      siteContext: CTX({ preflightInputs: { status: 200, robotsAllowed: false, noindexed: true, canonicalOk: true, inSitemap: true, hasContent: true } }),
    })),
    INDEXABLE_IS_NOT_INDEXED,
  ].join(" ").toLowerCase();

  for (const promise of ["will be indexed", "will rank", "will be cited", "guaranteed", "ensures indexing", "this page will"]) {
    assert.ok(!outputs.includes(promise), `the preflight output promises: "${promise}"`);
  }
  assert.ok(outputs.includes("not a prediction"), "it must say outright that it is not a prediction");
});

test("🔴 PREFLIGHT — FIRES as BLOCKED on a noindexed, disallowed page; SILENT when every condition passes", async () => {
  const fired = await INDEXABILITY_PREFLIGHT.run({
    page: PAGE, observations: OBS(),
    siteContext: CTX({ preflightInputs: { status: 200, robotsAllowed: false, noindexed: true, canonicalOk: true, inSitemap: true, hasContent: true } }),
  });
  assert.equal(fired.verdict, "FAIL");
  assert.match(fired.summary, /BLOCKED/);

  const silent = await INDEXABILITY_PREFLIGHT.run({
    page: PAGE, observations: OBS(),
    siteContext: CTX({ preflightInputs: { status: 200, robotsAllowed: true, noindexed: false, canonicalOk: true, inSitemap: true, hasContent: true } }),
  });
  assert.equal(silent, null);
});

test("PREFLIGHT — an unmeasured condition yields UNKNOWN, never a pass", () => {
  const p = preflight({ status: 200, robotsAllowed: true, noindexed: false, canonicalOk: true, hasContent: true });
  assert.equal(p.state, "UNKNOWN");
  assert.deepEqual(p.unmeasured, ["inSitemap"]);
  assert.deepEqual(PREFLIGHT_CONDITIONS.length, 6);
});

/* ================================================================== *
 * AGAINST THE REAL DATA.
 * ================================================================== */

const TECH = `${REPO}runs/audit/technical-findings.jsonl`;
const EV = `${REPO}runs/evidence/evidence.jsonl`;

test("🔴 REAL: item 13 now HAS input and runs", { skip: !existsSync(EV) }, () => {
  const rows = createJsonlStore(EV).readAll().filter((r) => r.method === "gsc.searchAnalytics.query:query-page").at(-1)?.value?.rows;
  assert.ok(rows?.length > 0, "no query×page rows — item 13 is still blind");
  const f = detectCannibalization(rows);
  assert.ok(f.length > 0, "the check ran but found nothing — say so rather than implying it cannot run");
  for (const x of f) assert.ok(x.urls.length >= 2 && x.query);
});

test("🔴 REAL: no noindex finding claims a DISAGREEMENT any more", { skip: !existsSync(TECH) }, () => {
  const ni = createJsonlStore(TECH).readAll().filter((r) => r.issue_class === "noindex");
  assert.ok(ni.length > 0, "no noindex findings — this control would be vacuous");
  assert.equal(ni.filter((x) => x.summary.includes("DISAGREE")).length, 0, "the false-positive disagreement is back");
});

test("🔴 REAL: every finding is FAIL or UNKNOWN with evidence, never PASS", { skip: !existsSync(TECH) }, () => {
  for (const r of createJsonlStore(TECH).readAll()) {
    assert.ok(["FAIL", "UNKNOWN"].includes(r.verdict));
    assert.ok(r.evidence?.length > 0);
  }
});
