/**
 * F27 · SECURITY AND TRANSPORT CHECKS (acceptance _handoffs 8a6312b, amended 93fa696; RR-111).
 *
 * Every expected count below is written by hand from its fixture. Fixtures DRIVE the rules; they never stand in for the real population —
 * the REAL tests read every declared client's own recorded partition, and planted defects are made on in-memory copies of real bodies.
 * Nothing is fetched or rendered; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { auditTransport, mixedReferences, unsafeForms, attrOf, VERDICT, MISSING } from "../src/audit/transport-security.mjs";
import { readClientTransport, transportPages } from "../src/audit/transport-security-reader.mjs";
import { readTenantPartition, readPartitionBodies } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { declaredWorld, FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const S = "https://site.example/", H = "http://site.example/";
const doc = (body) => `<!doctype html><html lang="en"><head><title>T</title></head><body>${body}</body></html>`;
const pg = (url, body, extra = {}) => ({ url, fetched: true, html: body === null ? null : doc(body), truncated: false, httpFormRequested: false, ...extra });
const run = (pages, headerNames = {}) => auditTransport({ pages, headerNames, fetchedObservations: pages.filter((p) => p.fetched).length });
const tenants = () => { const d = readDeclarations(); return (d.tenants?.tenants ?? d.tenants).map((t) => t.tenantId); };

/* ================= C1 — one client's recorded pages ================= */

test("C1 · the reader keeps one entry per distinct page; a robots-skipped URL is NOT MEASURED; a truncated body is carried", () => {
  const records = [
    { record_type: "observation", observation_id: "o1", value: { requested_url: S + "a", final_url: S + "a", status: 200, truncated: true } },
    { record_type: "observation", observation_id: "o2", value: { requested_url: S + "a", final_url: S + "a", status: 200 } },
    { record_type: "observation", observation_id: "o3", value: { requested_url: S + "private", skipped: true } },
    { record_type: "observation", observation_id: "o4", value: { requested_url: H + "b", final_url: S + "b", status: 200 } },
  ];
  const pages = transportPages(records, new Map([["o1", doc("x")], ["o4", doc("y")]]));
  assert.equal(pages.length, 3, "a page was dropped or counted twice");
  assert.deepEqual(pages.filter((p) => !p.fetched).map((p) => p.url), [null]);
  assert.equal(pages.find((p) => p.url === S + "a").truncated, true, "the body's truncation was lost");
  assert.equal(pages.find((p) => p.url === S + "b").httpFormRequested, true, "a recorded request for the http: form was not seen");
  assert.equal(pages.find((p) => p.url === S + "a").httpFormRequested, false);
});

test("C1 · FIRING CONTROL: a page with no stored body or a truncated one is counted and named, never silently skipped", () => {
  const a = run([pg(S, "<form action='http://x.example/'></form>"), pg(S + "n", null), pg(S + "t", "<form action='http://x.example/'></form>", { truncated: true })]);
  assert.ok(a.absent.some((s) => s.startsWith("1 of 3 fetched page(s) have no stored body")));
  assert.ok(a.absent.some((s) => s.startsWith("1 of 2 stored bod(ies) were truncated")));
  assert.equal(a.parts.unsafeForms.pagesRead, 1, "a missing or truncated body was read as if complete");
  assert.equal(a.parts.unsafeForms.submissions, 1);
});

/* ================= C2 — HTTPS ================= */

test("C2 · FIRING CONTROL: the recorded final scheme decides; a skipped page is NOT MEASURED; TLS and the http: redirect are NOT MEASURED", () => {
  const a = run([pg(S, ""), pg(H + "x", ""), { url: null, fetched: false, html: null, truncated: false, httpFormRequested: false }]);
  assert.deepEqual([a.parts.https.https, a.parts.https.notHttps, a.parts.https.notMeasured, a.parts.https.denominator], [1, 1, 1, 3]);
  assert.equal(a.parts.https.verdict, VERDICT.DISPROVED);
  assert.equal(a.parts.https.tls, "NOT MEASURED");
  assert.equal(a.parts.https.redirectMeasured, 0);
  const clean = run([pg(S, "")]);
  assert.equal(clean.parts.https.verdict, VERDICT.COULD_NOT_PROVE, "HTTPS read PROVED while TLS was never recorded");
  assert.ok(clean.absent.some((s) => s.startsWith("TLS: ")) && clean.absent.some((s) => s.startsWith("redirect: ")));
});

/* ================= C3 — mixed content ================= */

test("C3 · FIRING CONTROL: every declared attribute is read, http: is counted, https: and relative are not, and data-src is never src", () => {
  const html = doc('<img src="http://cdn.example/a.png"><script src=http://cdn.example/a.js></script><iframe src="http://v.example/"></iframe>'
    + '<img srcset="https://c.example/1x.png 1x, http://c.example/2x.png 2x"><video poster="http://c.example/p.png"></video>'
    + '<object data="http://c.example/o"></object><link rel="stylesheet" href="http://c.example/s.css"><link rel="canonical" href="http://c.example/">'
    + '<img src="/rel.png"><img src="https://c.example/ok.png"><img data-src="http://c.example/lazy.png">');
  assert.deepEqual(mixedReferences(html, S), { http: 7, total: 10 });
  assert.equal(attrOf('<img data-src="x">', "src"), null, "data-src was read as src");
});

test("C3 · markup inside comments, script, style and template is not read; an http: page is not judged for mixed content", () => {
  assert.deepEqual(mixedReferences(doc('<!-- <img src="http://a.example/x"> --><script>var s=\'<img src="http://a.example/y">\'</script><style>.a{}</style><template><img src="http://a.example/z"></template>'), S), { http: 0, total: 0 });
  assert.deepEqual(mixedReferences(doc('<!-- <script src="http://a.example/c.js"></script> --><template><script src="http://a.example/t.js"></script></template><script>var u="<script src=http://a.example/i.js>";</script>'), S), { http: 0, total: 0 }, "a script in a comment, a template or a string was read");
  const a = run([pg(H, '<img src="http://a.example/x">')]);
  assert.equal(a.parts.mixedContent.references, 0);
  assert.equal(a.parts.mixedContent.pagesRead, 0);
});

test("C3 · REAL FIRING CONTROL: a planted http: reference in a copy of a REAL stored body is found; the untouched body is unchanged", () => {
  const resolve = createTenantResolver();
  for (const t of tenants()) {
    const part = readTenantPartition({ batchId: BATCH_ID, tenantId: t, resolve });
    const bodies = readPartitionBodies({ batchId: BATCH_ID, observationIds: part.observationIds });
    const page = transportPages(part.records, bodies).find((p) => p.html !== null && p.url.startsWith("https:"));
    if (!page) continue;
    const before = mixedReferences(page.html, page.url);
    const planted = page.html.replace(/<\/body>/i, '<img src="http://planted.example/x.png"></body>');
    assert.notEqual(planted, page.html, "the plant did not land");
    assert.deepEqual(mixedReferences(planted, page.url), { http: before.http + 1, total: before.total + 1 });
    return;
  }
  assert.fail("no real HTTPS page with a stored body was found");
});

/* ================= C4 — unsafe forms ================= */

test("C4 · FIRING CONTROL: an http: action or formaction is unsafe; https:, empty and missing actions on an HTTPS page are not; a password counts only on an http page", () => {
  assert.deepEqual(unsafeForms(doc('<form action="http://x.example/s"></form><form action="https://x.example/s"></form><form></form><form action=""></form><button formaction="http://x.example/b">b</button><input type="password">'), S), { submissions: 2, passwords: 0, forms: 4 });
  assert.deepEqual(unsafeForms(doc('<form></form><input type="password">'), H), { submissions: 1, passwords: 1, forms: 1 });
  const a = run([pg(S, '<form action="http://x.example/s"></form>')]);
  assert.equal(a.parts.unsafeForms.verdict, VERDICT.DISPROVED);
});

/* ================= C5 / C6 — headers, public exposure ================= */

test("C5 · no header is judged without an owner declaration; recorded names are counts only; C6 public exposure is NOT MEASURED", () => {
  const a = run([pg(S, "")], { "content-type": 1, "strict-transport-security": 1 });
  assert.equal(a.parts.headers.judged, 0);
  assert.deepEqual(a.parts.headers.recordedNames, { "content-type": 1, "strict-transport-security": 1 });
  assert.equal(a.parts.headers.verdict, VERDICT.COULD_NOT_PROVE, "a header was judged with no declaration");
  assert.match(MISSING.headers, /owner declaration .* none is declared/);
  assert.equal(a.parts.publicExposure.verdict, VERDICT.COULD_NOT_PROVE);
  assert.match(MISSING.publicExposure, /owner declaration .* none is declared/);
  const src = readFileSync(join(REPO, "src/audit/transport-security.mjs"), "utf8");
  assert.doesNotMatch(src, /strict-transport-security|content-security-policy|x-frame-options|x-content-type-options|referrer-policy/i, "a header list appeared in the F27 source");
});

/* ================= C7 — denominators, incompleteness, three verdicts ================= */

test("C7 · FIRING CONTROL: every part carries its denominator; the population is INCOMPLETE and named; nothing reads PROVED on raw HTML; one defect is DISPROVED", () => {
  const a = run([pg(S, '<img src="https://c.example/a.png"><form action="/s"></form>')]);
  assert.equal(typeof a.parts.https.denominator, "number");
  assert.equal(typeof a.parts.mixedContent.denominator, "number");
  assert.equal(typeof a.parts.unsafeForms.denominator, "number");
  assert.equal(a.incomplete, true);
  assert.ok(a.absent.some((s) => s.startsWith("raw HTML: ")) && a.absent.some((s) => s.startsWith("headers: ")) && a.absent.some((s) => s.startsWith("public exposure: ")));
  assert.deepEqual(Object.values(a.parts).map((x) => x.verdict), Array(5).fill(VERDICT.COULD_NOT_PROVE));
  assert.equal(a.verdict, VERDICT.COULD_NOT_PROVE, "a row read PROVED with parts unmeasured");
  assert.equal(run([pg(S, '<img src="http://c.example/a.png">')]).verdict, VERDICT.DISPROVED);
  assert.equal(run([]).verdict, VERDICT.COULD_NOT_PROVE, "an empty population read PROVED");
});

/* ================= REAL — every declared client ================= */

test("REAL · every declared client: pages add up, populations are non-empty, nothing reads PROVED", () => {
  const resolve = createTenantResolver();
  const T = { clients: 0, pages: 0, fetched: 0, https: 0, notHttps: 0, notMeasured: 0, redirectMeasured: 0, referencesSeen: 0, httpReferences: 0, formsSeen: 0, unsafe: 0, headerNames: {}, verdicts: {} };
  for (const t of tenants()) {
    const { audit: a } = readClientTransport({ tenantId: t, resolve });
    const h = a.parts.https;
    assert.equal(h.https + h.notHttps + h.notMeasured, h.denominator, "a page has no HTTPS class, or two");
    assert.notEqual(a.verdict, VERDICT.PROVED);
    T.clients++; T.pages += a.pages; T.fetched += a.fetched; T.https += h.https; T.notHttps += h.notHttps; T.notMeasured += h.notMeasured; T.redirectMeasured += h.redirectMeasured;
    T.referencesSeen += a.parts.mixedContent.referencesSeen; T.httpReferences += a.parts.mixedContent.references;
    T.formsSeen += a.parts.unsafeForms.formsSeen; T.unsafe += a.parts.unsafeForms.submissions + a.parts.unsafeForms.passwordsOnNotHttps;
    for (const [k, n] of Object.entries(a.parts.headers.recordedNames)) T.headerNames[k] = (T.headerNames[k] ?? 0) + n;
    T.verdicts[a.verdict] = (T.verdicts[a.verdict] ?? 0) + 1;
  }
  assert.ok(T.fetched > 0 && T.referencesSeen > 0 && T.formsSeen > 0, "an EMPTY real population would make every zero meaningless");
  console.log(`  REAL (count-only, every declared client's own 12 September partition; RR-107 records not read): ${JSON.stringify(T)}`);
});

/* ================= the entry point, isolation, no network ================= */

test("C1 · THE ENTRY POINT: in a declared world it prints this tenant's parts with every denominator, no URL, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/transport-security.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const a = readClientTransport({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), env }).audit;
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ page\(s\)/);
    assert.ok(ok.stdout.includes(`HTTPS: HTTPS ${a.parts.https.https} · NOT HTTPS ${a.parts.https.notHttps} · NOT MEASURED ${a.parts.https.notMeasured} of ${a.parts.https.denominator} page(s)`), "the entry point printed another tenant's pages");
    assert.match(ok.stdout, /TLS NOT MEASURED/);
    assert.match(ok.stdout, /HEADERS: none judged — missing an owner declaration/);
    assert.match(ok.stdout, /PUBLIC EXPOSURE: NOT MEASURED/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C1 · the audit and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/audit/transport-security.mjs", "src/audit/transport-security-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
