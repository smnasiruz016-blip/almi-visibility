/**
 * RR-104 · THE COLLECTOR'S MISSING EVIDENCE FIELDS — headers by allowlist, link anchor text and accessible name, four kinds of provenance.
 *
 * Every expected value is written by hand from the fixture. A loopback fixture server only — the global fetch throws; nothing leaves the
 * machine. Stores are temp files; the production trail is not written (last test). No live collection; no row moves.
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { crawl } from "../src/crawl/crawler.mjs";
import { HEADER_SUBSET, HEADER_ALLOWLIST, SENSITIVE_HEADER, MAX_HEADER_VALUE_BYTES, allowlistedHeaders } from "../src/crawl/fetcher.mjs";
import { extractLinkDetails, MAX_LINK_TEXT } from "../src/crawl/seeds.mjs";
import { EVIDENCE_TYPES, PROVENANCE, NOT_MEASURED, evidenceRecord, publicationDateOf, renderStateOf, linkTargetState, recordedHeader, linkDetailOf, dateClaimsIn } from "../src/crawl/provenance.mjs";
import { measurementKey } from "../src/evidence/ids.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { persistCrawlObservations } from "../src/crawl/persist.mjs";
import { RECORDED_HEADERS } from "../src/audit/indexability-signals.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };
const COOKIE = "sid=SESSIONVALUE-must-never-be-stored";
const CSP = "default-src 'self'; " + "a".repeat(MAX_HEADER_VALUE_BYTES + 900);
const PAGE = [
  "<html><head>",
  '<meta property="article:published_time" content="2026-01-02T00:00:00Z">',
  '<meta property="article:modified_time" content="2026-03-04T00:00:00Z">',
  '<script type="application/ld+json">{"@type":"Article","datePublished":"2026-01-02","dateModified":"2026-03-04"}</script>',
  "</head><body>",
  '<a href="/inner">Visible <b>anchor</b>  text</a>',
  '<a href="/aria" aria-label="Named by aria">x</a>',
  '<a href="/img"><img src="i.png" alt="Image name"></a>',
  '<a href="/lb" aria-labelledby="h1">y</a>',
  '<a href="https://external.invalid/page">External</a>',
  '<a href="#top">skip</a><a href="mailto:x@y">mail</a>',
  '<time datetime="2025-12-31">then</time>',
  "</body></html>",
].join("");
let server, origin, hits, failNext = 0;
before(async () => {
  server = createServer((req, res) => {
    hits.set(req.url, (hits.get(req.url) ?? 0) + 1);
    if (req.url === "/robots.txt") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("User-agent: *\nAllow: /\n"); }
    if (failNext > 0 && req.url === "/flaky") { failNext -= 1; return req.socket.destroy(); }
    if (req.url === "/missing") { res.writeHead(404, { "content-type": "text/html", "x-frame-options": "DENY" }); return res.end("<html>gone</html>"); }
    if (req.url === "/lastmod-only") { res.writeHead(200, { "content-type": "text/html", "last-modified": "Wed, 01 Jan 2025 00:00:00 GMT" }); return res.end("<html><body><a href='/x'>x</a></body></html>"); }
    res.writeHead(200, {
      "content-type": "text/html",
      "set-cookie": COOKIE, "www-authenticate": "Basic realm=secret", "x-session-id": "S-123", "x-api-key": "K-456",
      "strict-transport-security": "max-age=63072000", "content-security-policy": CSP, "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer", "link": "<https://a.invalid/c>; rel=\"canonical\"", "last-modified": "Wed, 01 Jan 2025 00:00:00 GMT",
    });
    res.end(PAGE);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.closeAllConnections?.(); server?.close(); });
const run = async (paths, extra = {}) => { hits = new Map(); return crawl({ seeds: paths.map((p) => `${origin}${p}`), seedSource: "rr104-fixture", fetchImpl: (u, i) => realFetch(u, i), live: true, fetcherOptions: { intervalMs: 0 }, ...extra }); };
const ofType = (r, t) => r.evidence.filter((e) => e.record_type === t);

/* ================= 1.1 headers by explicit allowlist; sensitive headers never admitted ================= */

test("1.1 · the headers record holds exactly the allowlisted headers the response sent — and no cookie, credential or session header anywhere", async () => {
  const r = await run(["/page"]);
  const [h] = ofType(r, EVIDENCE_TYPES.HEADERS);
  assert.deepEqual(Object.keys(h.value.headers).sort(), ["content-security-policy", "content-type", "last-modified", "link", "referrer-policy", "strict-transport-security", "x-content-type-options"]);
  assert.deepEqual(h.value.collected, HEADER_ALLOWLIST);
  const all = JSON.stringify([r.observations, r.evidence, r.run]);
  for (const bad of ["set-cookie", "www-authenticate", "x-session-id", "x-api-key", "SESSIONVALUE", "S-123", "K-456", "realm=secret"]) assert.equal(all.includes(bad), false, `${bad} reached a record`);
});

test("1.1 · REDACTION CONTROL: a sensitive name is refused even when an allowlist names it, and the shipped allowlist admits none", () => {
  const bag = new Map([["set-cookie", COOKIE], ["authorization", "Bearer X"], ["x-session-id", "S"], ["content-type", "text/html"]]);
  const { headers } = allowlistedHeaders((k) => bag.get(k) ?? null, { allowlist: ["set-cookie", "authorization", "x-session-id", "content-type"] });
  assert.deepEqual(Object.keys(headers), ["content-type"]);
  for (const h of HEADER_ALLOWLIST) assert.equal(SENSITIVE_HEADER.test(h), false, `${h} is sensitive`);
  for (const h of ["cookie", "set-cookie", "authorization", "proxy-authorization", "x-csrf-token", "x-amz-security-token"]) assert.equal(SENSITIVE_HEADER.test(h), true, `${h} would be admitted`);
});

test("SIZE BOUNDS: an over-long header value is cut at the cap and named; link count and link text are capped", async () => {
  const r = await run(["/page"]);
  const [h] = ofType(r, EVIDENCE_TYPES.HEADERS);
  assert.equal(Buffer.byteLength(h.value.headers["content-security-policy"], "utf8"), MAX_HEADER_VALUE_BYTES);
  assert.deepEqual(h.value.headersTruncated, ["content-security-policy"]);
  const many = Array.from({ length: 12 }, (_, i) => `<a href="/l${i}">${"w".repeat(MAX_LINK_TEXT + 50)}</a>`).join("");
  const d = extractLinkDetails(many, origin, { maxLinks: 5 });
  assert.deepEqual([d.links.length, d.linksSeen, d.linksTruncated], [5, 12, true]);
  assert.equal(d.links[0].anchorText.length, MAX_LINK_TEXT);
  assert.equal(d.links[0].anchorTextTruncated, true);
});

/* ================= the raw-HTML observation is unchanged; provenance is distinct and stable ================= */

test("STABLE PROVENANCE: the crawl observation keeps the v0.1 header subset and key; each evidence record names its kind and its source observation", async () => {
  const r = await run(["/page"]);
  const [o] = r.observations;
  assert.ok(Object.keys(o.value.response_headers_subset).every((k) => HEADER_SUBSET.includes(k)), "the observation's header subset grew");
  assert.equal(o.measurement_key, measurementKey({ target: `url:${origin}/page`, method: "crawl.fetch", contentSha256: o.content_sha256, journey: null }), "the observation's key changed");
  assert.deepEqual(r.evidence.map((e) => [e.record_type, e.provenance]).sort(), [[EVIDENCE_TYPES.LINKS, PROVENANCE.RAW_HTML], [EVIDENCE_TYPES.DATE_CLAIMS, PROVENANCE.PAGE_DECLARED_DATE_CLAIM], [EVIDENCE_TYPES.HEADERS, PROVENANCE.RESPONSE_HEADERS]].sort());
  for (const e of r.evidence) { assert.equal(e.source_observation_id, o.observation_id); assert.equal(e.collector_version, "0.2"); }
  assert.deepEqual(RECORDED_HEADERS["src/crawl/crawler.mjs@0.2"], HEADER_SUBSET);
});

test("STABLE PROVENANCE: the same bytes collected twice are re-sightings — every observation and evidence record keeps its key", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr104-"));
  try {
    const store = createJsonlStore(join(dir, "s.jsonl"));
    const a = await run(["/page"]);
    const first = persistCrawlObservations(store, [...a.observations, ...a.evidence]);
    const b = await run(["/page"]);
    const second = persistCrawlObservations(store, [...b.observations, ...b.evidence]);
    assert.deepEqual([first.appended, first.resighted, second.appended, second.resighted], [4, 0, 0, 4]);
    assert.deepEqual(b.evidence.map((e) => e.measurement_key), a.evidence.map((e) => e.measurement_key));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= 1.2 anchor text and accessible name, with source and target identity ================= */

test("1.2 · each link carries its visible anchor text and its accessible name with the name's source; aria-labelledby is NOT MEASURED", async () => {
  const r = await run(["/page"]);
  const [l] = ofType(r, EVIDENCE_TYPES.LINKS);
  assert.equal(l.value.from, `${origin}/page`);
  assert.deepEqual(l.value.links.map((x) => x.to).sort(), [`${origin}/aria`, `${origin}/img`, `${origin}/inner`, `${origin}/lb`, "https://external.invalid/page"].sort());
  const by = Object.fromEntries(l.value.links.filter((x) => x.to.startsWith(origin)).map((x) => [new URL(x.to).pathname, x]));
  assert.deepEqual([by["/inner"].anchorText, by["/inner"].accessibleName, by["/inner"].accessibleNameSource], ["Visible anchor text", "Visible anchor text", "visible-text"]);
  assert.deepEqual([by["/aria"].accessibleName, by["/aria"].accessibleNameSource], ["Named by aria", "aria-label"]);
  assert.deepEqual([by["/img"].anchorText, by["/img"].accessibleName, by["/img"].accessibleNameSource], ["", "Image name", "img-alt"]);
  assert.deepEqual([by["/lb"].accessibleName, by["/lb"].accessibleNameSource], [null, "NOT_MEASURED_ARIA_LABELLEDBY"]);
  assert.equal(l.value.links.filter((x) => x.to.startsWith("https://external.invalid")).length, 1);
  assert.equal(l.value.linksSeen, 5, "the fragment and mailto links are not links");
});

/* ================= 1.3 and the four naming rules — each with a firing control ================= */

test("RULE 1 · Last-Modified is NOT a publication date: a page with only Last-Modified has NO publication date; a claimed one is a claim", async () => {
  const r = await run(["/lastmod-only", "/page"]);
  const claims = (p) => ofType(r, EVIDENCE_TYPES.DATE_CLAIMS).find((e) => e.target.ref.endsWith(p));
  const none = publicationDateOf(claims("/lastmod-only"));
  assert.equal(none.state, NOT_MEASURED);
  assert.match(none.fact, /Last-Modified header is not/);
  assert.equal(JSON.stringify(ofType(r, EVIDENCE_TYPES.DATE_CLAIMS)).includes("2025 00:00:00 GMT"), false, "a Last-Modified value reached a date claim");
  const has = publicationDateOf(claims("/page"));
  assert.equal(has.state, "PAGE_CLAIM");
  assert.equal(has.authoritative, false);
  assert.deepEqual(has.claims.map((c) => c.source).sort(), ["jsonld:datePublished", "meta:article:published_time"]);
  assert.deepEqual(dateClaimsIn(PAGE).claims.find((c) => c.source === "time[datetime]").claimKind, "UNLABELLED");
});

test("RULE 2 · a raw-HTML observation is NOT a rendered page: it reads RAW_HTML, and the crawler cannot record RENDERED provenance", async () => {
  const r = await run(["/page"]);
  assert.match(renderStateOf(r.observations[0]), /^RAW_HTML — not rendered, not operated$/);
  assert.notEqual(renderStateOf(r.observations[0]), PROVENANCE.RENDERED);
  assert.equal(renderStateOf({ record_type: "observation", value: { renderMode: "RENDERED" } }), PROVENANCE.RENDERED, "control: a rendered record does read RENDERED");
  assert.throws(() => evidenceRecord({ recordType: EVIDENCE_TYPES.HEADERS, provenance: PROVENANCE.RENDERED, source: r.observations[0], value: {}, collector: "c", collectorVersion: "0.2" }), /cannot record provenance RENDERED/);
});

test("RULE 3 · an external link never fetched is NOT known to work; a fetched one carries its recorded status", async () => {
  const r = await run(["/page", "/missing"]);
  const fetched = new Map(r.observations.filter((o) => !o.value.skipped).map((o) => [o.value.requested_url, o.value.status]));
  const [l] = ofType(r, EVIDENCE_TYPES.LINKS).filter((e) => e.target.ref.endsWith("/page"));
  const ext = l.value.links.find((x) => x.to.startsWith("https://external.invalid"));
  const s = linkTargetState(ext, fetched);
  assert.deepEqual([s.state, s.status], ["NOT_FETCHED", null]);
  assert.match(s.fact, /not known/);
  assert.deepEqual(linkTargetState({ to: `${origin}/missing` }, fetched), { state: "FETCHED_IN_THIS_RUN", status: 404 });
});

test("RULE 4 · a field an OLD record never carried stays NOT MEASURED — no default, no backfill", () => {
  const v01 = { record_type: "observation", collector: "src/crawl/crawler.mjs", collector_version: "0.1", value: { response_headers_subset: { "content-type": "text/html" } } };
  assert.equal(recordedHeader(v01, "strict-transport-security").state, NOT_MEASURED);
  assert.equal(recordedHeader(v01, "link").state, NOT_MEASURED);
  assert.equal(recordedHeader(v01, "x-robots-tag").state, "ABSENT", "control: a header v0.1 DID collect reads ABSENT, not NOT MEASURED");
  assert.deepEqual(recordedHeader(v01, "content-type"), { state: "RECORDED", value: "text/html" });
  assert.equal(recordedHeader({ record_type: "observation", collector: "other", collector_version: "9", value: {} }, "content-type").state, NOT_MEASURED);
  const oldEdge = { from: "a", to: "b", to_parsed: true };
  assert.equal(linkDetailOf(oldEdge, "anchorText").state, NOT_MEASURED);
  assert.deepEqual(linkDetailOf({ ...oldEdge, anchorText: "" }, "anchorText"), { state: "RECORDED", value: "" });
});

/* ================= tenant isolation, retry, dry run ================= */

test("TENANT ISOLATION: two runs in one process share nothing — each run's evidence names only its own observations and pages", async () => {
  const a = await run(["/page"]);
  const b = await run(["/missing"]);
  const ids = (x) => new Set(x.observations.map((o) => o.observation_id));
  for (const [r, own] of [[a, ids(a)], [b, ids(b)]]) for (const e of r.evidence) assert.ok(own.has(e.source_observation_id), "an evidence record names another run's observation");
  assert.equal(b.evidence.some((e) => JSON.stringify(e).includes("/inner")), false, "run B carries run A's links");
});

test("RETRY: one network failure is retried once and the evidence comes from the attempt that answered; a 404 is not retried", async () => {
  failNext = 1;
  const r = await run(["/flaky"]);
  assert.equal(hits.get("/flaky"), 2);
  assert.equal(r.observations.length, 1);
  assert.equal(ofType(r, EVIDENCE_TYPES.HEADERS).length, 1);
  const m = await run(["/missing"]);
  assert.equal(hits.get("/missing"), 1);
  assert.deepEqual(ofType(m, EVIDENCE_TYPES.HEADERS)[0].value.headers["x-frame-options"], "DENY");
});

test("DRY RUN: no request and no evidence", async () => {
  let called = 0;
  const r = await crawl({ seeds: [`${origin}/page`], seedSource: "rr104-fixture", fetchImpl: () => { called += 1; }, live: false });
  assert.deepEqual([called, r.evidence.length], [0, 0]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
