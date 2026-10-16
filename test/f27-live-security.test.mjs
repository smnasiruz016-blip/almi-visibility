/**
 * F27 · SECURITY AND TRANSPORT ON THE CLIENT'S LIVE PAGES (Acceptance Amendment 3, _handoffs 7b9a992).
 *
 * One firing control per clause (each fault alone turns its own verdict), the connector's one read (refused off its origins, released through
 * the paced path, no redirect followed, never retried), the production path in a declared fixture world (no request without --live and
 * --confirm; over the limit, nothing at all), and the REAL result on the client's LIVE pages, count-only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { judgeTls, judgeRedirect, styleUrls, runsScript, judgeHeaderRule, cspPresence, exposureOf, auditLive, STATE, LIVE_SECURITY_RECORD } from "../src/audit/live-security.mjs";
import { VERDICT } from "../src/audit/transport-security.mjs";
import { LIVE_HEADER_BASELINE, LIVE_CHECK_CEILING } from "../config/security/live-header-baseline.mjs";
import { PUBLIC_EXPOSURE_DECLARATION } from "../config/security/public-exposure-declaration.mjs";
import { transportReader, ConnectorRefused } from "../src/tenancy/connectors.mjs";
import { JOINED_RECORD } from "../src/page/joined-page.mjs";
import { STAMP } from "../src/page/test-exception.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ON = "2026-10-16";
const PAGE = "https://fixture-world.invalid/guides/a-page";
const HTML = `<!doctype html><html><head><title>A page</title><style>.x{background:url("/i.png")}</style><script type="application/ld+json">{"a":1}</script></head><body><h1>A page</h1><img src="https://fixture-world.invalid/i.png"><form action="/s"></form></body></html>`;
const GOOD_HEADERS = { "content-type": "text/html; charset=utf-8", "strict-transport-security": "max-age=63072000; includeSubDomains", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "strict-origin-when-cross-origin", "content-security-policy-report-only": "default-src 'self'; frame-ancestors 'none'" };
const TLS = { protocol: "TLSv1.3", authorized: true, authorizationError: null, validFrom: "2026-09-01T00:00:00.000Z", validTo: "2026-12-01T00:00:00.000Z" };
const read = (over = {}) => ({ finalUrl: PAGE, status: 200, headers: { ...GOOD_HEADERS }, tls: { ...TLS }, body: HTML, truncated: false, ...over });
const page = (over = {}) => ({ pageId: "a", url: PAGE, read: read(), http: { status: 308, location: PAGE }, ...over });
const audit = (pages, extra = {}) => auditLive({ pages, robots: { url: "https://fixture-world.invalid/robots.txt", status: 200, body: "User-Agent: *\nAllow: /\n" }, headerDeclaration: LIVE_HEADER_BASELINE, exposureDeclaration: PUBLIC_EXPOSURE_DECLARATION, on: ON, ...extra });

test("C2 · HTTPS AND TLS · FIRING CONTROL (F27 A3): a recorded 301/308 to the same host on https passes; a 302, 307, 200, a redirect to http or to another host fails; TLS passes only on TLSv1.2/1.3, a certificate the platform verified, read inside its validity; what was not recorded is NOT MEASURED, never a pass", () => {
  assert.deepEqual([judgeRedirect({ status: 308, location: PAGE }, PAGE).state, judgeRedirect({ status: 301, location: "/guides/a-page" }, PAGE).state], [STATE.PASS, STATE.FAIL], "a relative Location resolves on http, so it is not https");
  for (const [r, why] of [[{ status: 302, location: PAGE }, "302"], [{ status: 307, location: PAGE }, "307"], [{ status: 200, location: null }, "200"], [{ status: 301, location: "http://fixture-world.invalid/guides/a-page" }, "to http"], [{ status: 301, location: "https://elsewhere.invalid/guides/a-page" }, "another host"]])
    assert.equal(judgeRedirect(r, PAGE).state, STATE.FAIL, why);
  assert.equal(judgeRedirect(null, PAGE).state, STATE.NOT_MEASURED);
  assert.equal(judgeTls(TLS, ON).state, STATE.PASS);
  assert.equal(judgeTls({ ...TLS, protocol: "TLSv1.2" }, ON).state, STATE.PASS);
  for (const [t, why] of [[{ ...TLS, protocol: "TLSv1.1" }, "an old protocol"], [{ ...TLS, authorized: false, authorizationError: "ERR_TLS_CERT_ALTNAME_INVALID" }, "a certificate not verified for the host"], [{ ...TLS, validTo: "2026-10-01T00:00:00.000Z" }, "an expired certificate"], [{ ...TLS, validFrom: "2026-11-01T00:00:00.000Z" }, "a certificate not yet valid"]])
    assert.equal(judgeTls(t, ON).state, STATE.FAIL, why);
  assert.deepEqual([judgeTls(null, ON).state, judgeTls({ ...TLS, validTo: null }, ON).state], [STATE.NOT_MEASURED, STATE.NOT_MEASURED]);
  const a = audit([page()]);
  assert.deepEqual([a.parts.https.https, a.parts.https.redirect.PASS, a.parts.https.tls.PASS, a.parts.https.verdict], [1, 1, 1, VERDICT.PROVED]);
  assert.equal(audit([page({ http: { status: 302, location: PAGE } })]).parts.https.verdict, VERDICT.DISPROVED);
  assert.equal(audit([page({ http: null })]).parts.https.verdict, VERDICT.COULD_NOT_PROVE, "a redirect that was not recorded reads PROVED");
  assert.equal(audit([page({ read: read({ finalUrl: "http://fixture-world.invalid/guides/a-page" }) })]).parts.https.notHttps, 1);
});

test("C3 · MIXED CONTENT · FIRING CONTROL (F27 A3): a url() in a style element or a style attribute is read, an http: one counted; a page that runs script leaves script-inserted references NOT MEASURED; a page that runs none is measured completely", () => {
  assert.deepEqual(styleUrls(`<style>a{background:url(http://x.invalid/a.png)} b{background:url('/b.png')} /* url(http://c.invalid) */</style><p style="background:url(&quot;x&quot;)">`, PAGE), { http: 1, total: 3 });
  assert.deepEqual(styleUrls(`<p style="background:url('http://x.invalid/a.png')">`, PAGE), { http: 1, total: 1 });
  assert.deepEqual([runsScript(HTML), runsScript(`${HTML}<script>1</script>`), runsScript(`<button onclick="x()">`), runsScript(`<script src="/a.js"></script>`)], [false, true, true, true]);
  assert.equal(audit([page()]).parts.mixedContent.verdict, VERDICT.PROVED);
  assert.equal(audit([page({ read: read({ body: HTML.replace("url(\"/i.png\")", "url(http://x.invalid/i.png)") }) })]).parts.mixedContent.verdict, VERDICT.DISPROVED);
  assert.equal(audit([page({ read: read({ body: HTML.replace("https://fixture-world.invalid/i.png", "http://fixture-world.invalid/i.png") }) })]).parts.mixedContent.verdict, VERDICT.DISPROVED);
  const scripted = audit([page({ read: read({ body: `${HTML}<script>document.write(1)</script>` }) })]);
  assert.deepEqual([scripted.parts.mixedContent.verdict, scripted.incomplete], [VERDICT.COULD_NOT_PROVE, true], "a page that runs script read complete");
});

test("C4 · UNSAFE FORMS · FIRING CONTROL (F27 A3): an http: action is counted; an https: or relative one is not", () => {
  assert.equal(audit([page()]).parts.unsafeForms.verdict, VERDICT.PROVED);
  assert.equal(audit([page({ read: read({ body: HTML.replace('action="/s"', 'action="http://fixture-world.invalid/s"') }) })]).parts.unsafeForms.verdict, VERDICT.DISPROVED);
});

test("C5 · HEADERS · FIRING CONTROL (F27 A3): each rule of beta-g's declaration fails on its own fault alone; a report-only policy never counts for clickjacking; a page that is not HTML over https is NOT APPLICABLE; an unrecorded response is NOT MEASURED; the CSP is reported, never judged", () => {
  const [HSTS, NOSNIFF, CLICK, REF] = LIVE_HEADER_BASELINE.rules;
  assert.deepEqual(LIVE_HEADER_BASELINE.rules.map((r) => judgeHeaderRule(r, read()).state), [STATE.PASS, STATE.PASS, STATE.PASS, STATE.PASS]);
  const without = (k) => { const h = { ...GOOD_HEADERS }; delete h[k]; return read({ headers: h }); };
  for (const [rule, r, why] of [
    [HSTS, without("strict-transport-security"), "HSTS absent"], [HSTS, read({ headers: { ...GOOD_HEADERS, "strict-transport-security": "max-age=15767999" } }), "HSTS one second short"],
    [NOSNIFF, without("x-content-type-options"), "nosniff absent"], [NOSNIFF, read({ headers: { ...GOOD_HEADERS, "x-content-type-options": "sniff" } }), "not nosniff"],
    [CLICK, without("x-frame-options"), "a report-only frame-ancestors only"], [CLICK, read({ headers: { ...GOOD_HEADERS, "x-frame-options": "ALLOW-FROM https://a.invalid" } }), "ALLOW-FROM"],
    [REF, without("referrer-policy"), "referrer-policy absent"], [REF, read({ headers: { ...GOOD_HEADERS, "referrer-policy": "unsafe-url" } }), "unsafe-url"], [REF, read({ headers: { ...GOOD_HEADERS, "referrer-policy": "no-referrer-when-downgrade" } }), "no-referrer-when-downgrade"],
  ]) assert.equal(judgeHeaderRule(rule, r).state, STATE.FAIL, why);
  assert.equal(judgeHeaderRule(HSTS, read({ headers: { ...GOOD_HEADERS, "strict-transport-security": "max-age=15768000" } })).state, STATE.PASS, "the boundary 15768000 fails");
  assert.equal(judgeHeaderRule(CLICK, read({ headers: { ...without("x-frame-options").headers, "content-security-policy": "frame-ancestors 'self'" } })).state, STATE.PASS, "an enforced frame-ancestors did not count");
  assert.equal(judgeHeaderRule(HSTS, read({ headers: { ...GOOD_HEADERS, "content-type": "application/json" } })).state, STATE.NOT_APPLICABLE);
  assert.equal(judgeHeaderRule(HSTS, null).state, STATE.NOT_MEASURED);
  assert.deepEqual(cspPresence(read()), { enforced: false, reportOnly: true });
  const a = audit([page()]);
  assert.deepEqual([a.parts.headers.verdict, a.parts.headers.csp.verdict], [VERDICT.PROVED, "REPORTED — NO VERDICT"]);
  assert.equal(audit([page({ read: without("x-content-type-options") })]).parts.headers.verdict, VERDICT.DISPROVED);
});

test("C6 · PUBLIC EXPOSURE · FIRING CONTROL (F27 A3): each of the owner's three classes is found on a recorded response only as wide as his words; an intended public page, a 404 with no trace and a trace on a 2xx page are not exposures; with no declaration it is NOT MEASURED", () => {
  const D = PUBLIC_EXPOSURE_DECLARATION;
  assert.equal(exposureOf({ url: "https://x.invalid/files/", status: 200, body: "<title>Index of /files</title><h1>Index of /files</h1>" }, D), "DIRECTORY_LISTING");
  assert.equal(exposureOf({ url: "https://x.invalid/a", status: 500, body: "Error: boom\n    at handler (/srv/app/server.js:10:5)" }, D), "STACK_TRACE");
  assert.equal(exposureOf({ url: "https://x.invalid/.env", status: 200, body: "A=1" }, D), "SENSITIVE_ARTEFACT");
  assert.equal(exposureOf({ url: "https://x.invalid/.git/config", status: 200, body: "" }, D), "SENSITIVE_ARTEFACT");
  for (const r of [{ url: PAGE, status: 200, body: HTML }, { url: "https://x.invalid/x", status: 404, body: "Not found" }, { url: "https://x.invalid/doc", status: 200, body: "Error: boom\n    at handler (/srv/app/server.js:10:5)" }, { url: "https://x.invalid/.env", status: 404, body: "" }, { url: "https://x.invalid/files/", status: 200, body: "<title>Our files</title><h1>Index of /files</h1>" }])
    assert.equal(exposureOf(r, D), null, `${r.url} ${r.status}`);
  assert.equal(audit([page()]).parts.publicExposure.verdict, VERDICT.PROVED);
  assert.equal(audit([page()], { robots: { url: "https://fixture-world.invalid/.env", status: 200, body: "A=1" } }).parts.publicExposure.verdict, VERDICT.DISPROVED);
  assert.equal(audit([page()], { exposureDeclaration: null }).parts.publicExposure.verdict, VERDICT.COULD_NOT_PROVE);
});

test("C1 C7 · POPULATION, DENOMINATORS, THREE VERDICTS · FIRING CONTROL (F27 A3): a LIVE page with no recorded read, or a truncated body, is counted and named; an empty population never reads PROVED; one DISPROVED part disproves the row", () => {
  const a = audit([page(), page({ pageId: "b", url: "https://fixture-world.invalid/guides/b", read: null })]);
  assert.deepEqual([a.pages, a.read, a.incomplete, a.absent.some((x) => /1 of 2 LIVE page\(s\) have no recorded read/.test(x)), a.verdict], [2, 1, true, true, VERDICT.COULD_NOT_PROVE]);
  const t = audit([page({ read: read({ truncated: true }) })]);
  assert.deepEqual([t.incomplete, t.parts.mixedContent.verdict], [true, VERDICT.COULD_NOT_PROVE]);
  const empty = audit([]);
  assert.ok(Object.values(empty.parts).every((p) => p.verdict !== VERDICT.PROVED) && empty.verdict !== VERDICT.PROVED, "an empty population read PROVED");
  assert.deepEqual([audit([page()]).verdict, audit([page()]).incomplete], [VERDICT.PROVED, false], "CONTROL: a clean, complete page must read PROVED");
  assert.equal(audit([page({ http: { status: 200, location: null } })]).verdict, VERDICT.DISPROVED);
});

/* a fake platform request: a response object with a socket that reports TLS facts, and a request that can fail */
const fakeSend = (log, answer) => (url, opts, cb) => {
  log.push({ url, method: opts.method });
  const req = new EventEmitter(); req.end = () => setImmediate(() => {
    const a = answer(url);
    if (a.error) return req.emit("error", new Error(a.error));
    const res = new EventEmitter(); res.statusCode = a.status; res.headers = a.headers ?? {}; res.socket = a.tls ? { getProtocol: () => a.tls.protocol, authorized: a.tls.authorized, authorizationError: null, getPeerCertificate: () => ({ valid_from: a.tls.validFrom, valid_to: a.tls.validTo }) } : {};
    cb(res); res.emit("data", Buffer.from(a.body ?? "")); res.emit("end");
  }); req.destroy = () => {}; return req;
};

test("CONNECTOR · ONE READ · FIRING CONTROL (F27 A3): a read is released through the paced path, once; an address off the connector's origins is refused before any request, and an http: form only of an admitted https origin; no redirect is followed; a failure is answered, never retried; TLS facts are the platform's", async () => {
  const log = [], released = [];
  const admits = (u) => new URL(u).origin === "https://fixture-world.invalid";
  const r = transportReader({ admits, gapMs: 2000, release: async (u, g) => { released.push([u, g]); }, userAgent: "x", sendFor: () => fakeSend(log, (u) => (u.startsWith("http:") ? { status: 308, headers: { location: PAGE } } : u.endsWith("/fail") ? { error: "ECONNRESET" } : { status: 200, headers: { "content-type": "text/html" }, body: "<p>x</p>", tls: TLS })) });
  const ok = await r(PAGE);
  assert.deepEqual([ok.status, ok.body, ok.tls.protocol, ok.tls.authorized, ok.tls.validTo, log.length, released.length, released[0][1]], [200, "<p>x</p>", "TLSv1.3", true, TLS.validTo, 1, 1, 2000]);
  const h = await r("http://fixture-world.invalid/guides/a-page");
  assert.deepEqual([h.status, h.location, h.tls, log.length], [308, PAGE, null, 2], "a redirect was followed, or the http: form was not read once");
  const f = await r("https://fixture-world.invalid/fail");
  assert.deepEqual([f.error, log.length], ["ECONNRESET", 3], "a failure was retried");
  for (const u of ["https://elsewhere.invalid/x", "http://elsewhere.invalid/x", "ftp://fixture-world.invalid/x"]) await assert.rejects(r(u), ConnectorRefused, u);
  assert.equal(log.length, 3, "a refused address was requested");
  assert.equal(released.length, 3, "a refused address took a paced slot");
});

test("PRODUCTION PATH (F27 A3): in a declared fixture world — the plan and the audit from the stored reads with no request; nothing without --confirm; more requests than the limit, nothing at all; a limit above the owner's ceiling is a usage refusal", () => {
  const BATCH = "fixture-live-security";
  const W = declaredWorld({ extra: [["RESEARCH_BATCH", BATCH]] });
  try {
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    const fw = reg.subjects.find((s) => s.subjectId === "fixture-world-subject");
    fw.members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: BATCH });
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2) + "\n");
    const b = join(W.root, "research", BATCH); mkdirSync(b, { recursive: true });
    const built = { record_type: JOINED_RECORD, value: "a-page", measurement_key: `${JOINED_RECORD}:a`, stamp: STAMP, html: HTML, itemList: [{ needId: "n1", questions: [] }], recorded_at: `${ON}T00:00:00Z` };
    const pub = { ...built, measurement_key: `${JOINED_RECORD}:a-live`, publishedUrl: PAGE, publishedOn: ON };
    writeFileSync(join(b, "joined-pages.jsonl"), [built, pub].map((r) => JSON.stringify(r)).join("\n") + "\n");
    writeFileSync(join(b, "live-security.jsonl"), [
      { record_type: LIVE_SECURITY_RECORD, kind: "PAGE", tenantId: W.tenantId, pageId: "a-page", url: PAGE, readOn: ON, run: "r1", read: read(), http: { status: 308, location: PAGE } },
      { record_type: LIVE_SECURITY_RECORD, kind: "ROBOTS", tenantId: W.tenantId, url: "https://fixture-world.invalid/robots.txt", readOn: ON, run: "r1", read: { status: 200, body: "User-Agent: *\nAllow: /\n" } },
    ].map((r) => JSON.stringify(r)).join("\n") + "\n");
    const run = (...extra) => spawnSync(process.execPath, ["bin/live-security.mjs", ...W.argv(["--subject=fixture-world-subject", `--research-batch=${BATCH}`, `--on=${ON}`, ...extra])], { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), NO_EGRESS_MODE: "refuse" } });
    const dry = run();
    assert.equal(dry.status, 0, dry.stdout + dry.stderr);
    assert.match(dry.stdout, /pages {12}LIVE 1 /);
    assert.match(dry.stdout, /plan {13}3 request\(s\)/);
    assert.match(dry.stdout, /NOT RUN — no --live/);
    assert.match(dry.stdout, /verdict {10}PROVED/, "the audit of the stored reads did not run, or did not read PROVED on a clean page");
    const unconfirmed = run("--live");
    assert.notEqual(unconfirmed.status, 0, "a live run without --confirm went on");
    assert.match(unconfirmed.stdout + unconfirmed.stderr, /NO REQUEST WAS MADE/);
    const tight = run("--max-requests=2", "--live", "--confirm");
    assert.deepEqual([tight.status, /REQUESTS_OUTNUMBER_THE_LIMIT: 3 planned against a limit of 2\. NO REQUEST WAS MADE\./.test(tight.stderr)], [3, true], tight.stdout + tight.stderr);
    for (const bad of [`${LIVE_CHECK_CEILING + 1}`, "0", "x"]) assert.equal(run(`--max-requests=${bad}`).status, 2, bad);
    assert.equal(LIVE_CHECK_CEILING, 60, "the owner's ceiling moved");
  } finally { W.cleanup(); }
});

test("REAL (F27 A3): the client's LIVE pages and their stored live reads — every LIVE page read, count-only; each part's verdict as the reads stand", () => {
  const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
  const f = join(dir, "live-security.jsonl");
  assert.ok(existsSync(f), "EMPTY real population: no live security read is stored");
  const rows = readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === LIVE_SECURITY_RECORD);
  const pagesRead = rows.filter((r) => r.kind === "PAGE");
  assert.ok(pagesRead.length >= 12, "fewer than the 12 LIVE pages were read");
  const live = readFileSync(join(dir, "joined-pages.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === JOINED_RECORD && typeof r.publishedUrl === "string");
  const pages = live.map((p) => { const r = pagesRead.filter((x) => x.url === p.publishedUrl).at(-1); return { pageId: p.value, url: p.publishedUrl, read: r?.read?.error ? null : r?.read ?? null, http: r?.http?.error ? null : r?.http ?? null }; });
  const robots = rows.filter((r) => r.kind === "ROBOTS").at(-1);
  const a = auditLive({ pages, robots: robots ? { url: robots.url, status: robots.read.status, body: robots.read.body } : null, headerDeclaration: LIVE_HEADER_BASELINE, exposureDeclaration: PUBLIC_EXPOSURE_DECLARATION, on: robots?.readOn ?? ON });
  assert.equal(a.read, a.pages, `a LIVE page has no stored read: ${a.absent.join(" · ")}`);
  for (const [k, p] of Object.entries(a.parts)) assert.ok([VERDICT.PROVED, VERDICT.DISPROVED, VERDICT.COULD_NOT_PROVE].includes(p.verdict), k);
});
