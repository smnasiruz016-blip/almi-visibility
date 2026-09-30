/**
 * RR-100 · EVERY DECLARED CHECK BOUNDARY, CROSSED IN BOTH DIRECTIONS AGAINST THE CHECK'S OWN CODE.
 *
 * For each of the eight checks that raised F90's actionable findings, every declared firing condition has a minimal pair: JUST INSIDE (only
 * that condition holds) must make the check's real run() return a FAIL finding; JUST OUTSIDE (the same input with that one fact flipped
 * back) must make it return no finding. The declared condition ids and this table's ids must be the SAME set, so a firing path the
 * declaration omits, or a declaration no pair proves, fails here — the declaration and the code cannot drift apart unseen.
 * Pure fixtures; nothing fetched or written; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import "../src/audit/checks.mjs";
import "../src/audit/technical-checks.mjs";
import "../src/audit/content-checks.mjs";
import "../src/audit/sitemap-check.mjs";
import { registeredChecks, registerCheck } from "../src/audit/check.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const CHECKS = new Map(registeredChecks().map((c) => [c.id, c]));
export const F90_DETECTORS = Object.freeze(["robots-scope", "dns-family", "status-and-redirects", "canonical", "noindex", "head-elements", "query-parameters", "indexability-preflight"]);

const P = "https://a.example/p";
const obs = (value = {}) => [{ observation_id: "o1", value }];
const ctx = (over = {}) => ({ openedAt: "2026-09-30T00:00:00Z", ...over });
const run = async (id, { page = { canonical_url: P }, observations = obs(), siteContext = ctx() } = {}) => CHECKS.get(id).run({ page, observations, siteContext });
const html = (head = '<title>T</title><meta name="description" content="d">', body = "<h1>H</h1><h2>s</h2>") => `<html><head>${head}</head><body>${body}</body></html>`;
const robots = (body) => ctx({ robotsObservation: { observation_id: "r1", value: { body } } });
const status = (v) => ({ observations: obs({ status: 200, redirect_chain: [], requested_url: P, final_url: P, ...v }) });
const canonical = (href, statuses = []) => ({ siteContext: ctx({ bodyHtml: href === null ? html() : html(`<link rel="canonical" href="${href}">`), statusByUrl: new Map(statuses) }) });
const noindex = (meta, header = null) => ({ siteContext: ctx({ bodyHtml: meta === null ? html() : html(`<meta name="robots" content="${meta}">`) }), observations: obs(header === null ? {} : { response_headers_subset: { "x-robots-tag": header } }) });
const head = (h, b, titles = 1) => ({ siteContext: ctx({ bodyHtml: html(h, b), titleCounts: new Map([["T", titles]]) }) });
const OK = { status: 200, robotsAllowed: true, noindexed: false, canonicalOk: true, inSitemap: true, hasContent: true };
const pre = (over = {}) => ({ siteContext: ctx({ preflightInputs: { ...OK, ...over } }) });

/* each condition: one or more [justInside, justOutside] pairs */
const PAIRS = {
  "robots-scope": {
    "search-crawler-group-disallows": [
      [{ siteContext: robots("User-agent: Googlebot\nDisallow: /p\n") }, { siteContext: robots("User-agent: Googlebot\nDisallow: /q\n") }],
      /* a block in the * group while the search crawler's own group permits the path is NOT this finding */
      [{ siteContext: robots("User-agent: *\nDisallow: /p\n") }, { siteContext: robots("User-agent: *\nDisallow: /p\n\nUser-agent: Googlebot\nAllow: /\n") }],
    ],
  },
  "dns-family": {
    "aaaa-only": [
      [{ siteContext: ctx({ families: { state: "AAAA_ONLY", hostname: "a.example", resolvers: [] } }) }, { siteContext: ctx({ families: { state: "A_AND_AAAA", hostname: "a.example", resolvers: [] } }) }],
      [{ siteContext: ctx({ families: { state: "AAAA_ONLY", hostname: "a.example", resolvers: [] } }) }, { siteContext: ctx({ families: { state: "A_ONLY", hostname: "a.example", resolvers: [] } }) }],
    ],
  },
  "status-and-redirects": {
    "status-not-200": [[status({ status: 201 }), status({ status: 200 })], [status({ status: null }), status({ status: 200 })]],
    "chain-over-one-hop": [[status({ redirect_chain: ["h1", "h2"] }), status({ redirect_chain: ["h1"] })]],
    redirected: [[status({ final_url: `${P}/` }), status({ final_url: P })]],
  },
  canonical: {
    "canonical-missing": [[canonical(null), canonical(P)]],
    "canonical-unparseable": [[canonical("http://[::1"), canonical(P)]],
    "canonical-off-host": [[canonical("https://b.example/p"), canonical("https://a.example/q")]],
    "canonical-target-not-200": [[canonical("https://a.example/q", [["https://a.example/q", 404]]), canonical("https://a.example/q", [["https://a.example/q", 200]])]],
  },
  noindex: {
    noindexed: [[noindex("noindex"), noindex("index,follow")], [noindex(null, "noindex"), noindex(null, "index")], [noindex("index,follow", "noindex"), noindex("index,follow", "index")]],
  },
  "head-elements": {
    "no-title": [[head('<meta name="description" content="d">', "<h1>H</h1>"), head('<title>T</title><meta name="description" content="d">', "<h1>H</h1>")], [head('<title></title><meta name="description" content="d">', "<h1>H</h1>"), head('<title>T</title><meta name="description" content="d">', "<h1>H</h1>")]],
    "no-description": [[head("<title>T</title>", "<h1>H</h1>"), head('<title>T</title><meta name="description" content="d">', "<h1>H</h1>")]],
    "multiple-descriptions": [[head('<title>T</title><meta name="description" content="d"><meta name="description" content="e">', "<h1>H</h1>"), head('<title>T</title><meta name="description" content="d">', "<h1>H</h1>")]],
    "no-h1": [[head(undefined, "<p>x</p>"), head(undefined, "<h1>H</h1>")]],
    "multiple-h1": [[head(undefined, "<h1>H</h1><h1>I</h1>"), head(undefined, "<h1>H</h1>")]],
    "empty-h1": [[head(undefined, "<h1></h1>"), head(undefined, "<h1>H</h1>")]],
    "shared-title": [[head(undefined, "<h1>H</h1>", 2), head(undefined, "<h1>H</h1>", 1)]],
    "skipped-heading-level": [[head(undefined, "<h1>H</h1><h3>s</h3>"), head(undefined, "<h1>H</h1><h2>s</h2><h3>t</h3>")]],
  },
  "query-parameters": {
    "has-query-parameter": [[{ page: { canonical_url: `${P}?a` } }, { page: { canonical_url: `${P}?` } }]],
  },
  "indexability-preflight": {
    reachable200: [[pre({ status: 201 }), pre()]],
    notRobotsDisallowed: [[pre({ robotsAllowed: false }), pre()]],
    notNoindexed: [[pre({ noindexed: true }), pre()]],
    canonicalSelfOrResolving: [[pre({ canonicalOk: false }), pre()]],
    inSitemap: [[pre({ inSitemap: false }), pre()]],
    contentInRawHtml: [[pre({ hasContent: false }), pre()]],
  },
};

test("every detector behind F90's actionable findings declares a structured boundary", () => {
  for (const id of F90_DETECTORS) assert.ok(CHECKS.get(id)?.boundary, `${id} declares no boundary`);
});

test("DRIFT GUARD: each check's declared conditions and the proved pairs are exactly the same set", () => {
  for (const id of F90_DETECTORS) {
    assert.deepEqual([...CHECKS.get(id).boundary.fires.map((f) => f.id)].sort(), Object.keys(PAIRS[id]).sort(), `${id}: a declared condition has no crossing proof, or a proved condition is not declared`);
  }
});

for (const id of F90_DETECTORS) {
  test(`BOTH DIRECTIONS · ${id}: just inside each declared condition it fires; just outside it does not`, async () => {
    for (const [cond, pairs] of Object.entries(PAIRS[id])) {
      for (const [inside, outside] of pairs) {
        const hit = await run(id, inside);
        assert.equal(hit?.verdict, "FAIL", `${id} · ${cond}: just inside the boundary it did not fire`);
        /* F90: the finding names this check, stamped with the check's DECLARED live version — the stamp and the declaration cannot drift */
        assert.equal(hit.detector, id, `${id} · ${cond}: the finding names another detector`);
        assert.equal(hit.detector_version, CHECKS.get(id).version, `${id} · ${cond}: run() stamps a version other than the declared one`);
        assert.equal(await run(id, outside), null, `${id} · ${cond}: just outside the boundary it still fired`);
      }
    }
  });
}

test("an UNMEASURED input is never a finding across the boundary: preflight with a missing input and a missing robots body are UNKNOWN", async () => {
  const { status: _s, ...noStatus } = OK;
  assert.equal((await run("indexability-preflight", { siteContext: ctx({ preflightInputs: noStatus }) }))?.verdict, "UNKNOWN");
  assert.equal((await run("robots-scope", { siteContext: ctx() }))?.verdict, "UNKNOWN");
});

test("the registry refuses a malformed boundary — a condition without an id or a statement cannot be declared", () => {
  const base = { run: () => null, firingFixture: "f", cleanControl: "c" };
  assert.throws(() => registerCheck({ ...base, id: "rr100-bad-1", boundary: { observes: [], fires: [{ id: "x", when: "y" }] } }), /boundary/);
  assert.throws(() => registerCheck({ ...base, id: "rr100-bad-2", boundary: { observes: ["o"], fires: [{ id: "x" }] } }), /boundary/);
  assert.throws(() => registerCheck({ ...base, id: "rr100-bad-3", boundary: { observes: ["o"], fires: [{ id: "x", when: "y" }, { id: "x", when: "z" }] } }), /boundary/);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
