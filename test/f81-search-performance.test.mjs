/**
 * F81 · SEARCH PERFORMANCE AND RANK TRACKING (acceptance _handoffs ae4834b, RR-132 §3).
 *
 * FIXTURES prove the MECHANISM only — never a real-population clause (RR-132: "Fixtures prove the mechanism; they never satisfy a
 * real-population clause"). The REAL test reads the engine's own Search Console store as ONE declared client's partition under the
 * real declarations, and is the only source of reported figures. C6 runs the new pull types against the FAKE provider only. No live
 * call is made; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { trackPerformance, measuresOf, NOT_MEASURED, OWNED, NAMED } from "../src/search/performance-tracker.mjs";
import { clientObservations, readClientPerformance } from "../src/search/performance-reader.mjs";
import { decidePartition } from "../src/discovery/search-console-partition.mjs";
import { runIngest, PULL_SETS } from "../src/search/ingest.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { createGoogleSearchConsoleProvider } from "../src/search/google-search-console.mjs";
import { createCostGovernor, CostCapExceeded } from "../src/cost/governor.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const CODE = ["src/search/performance-tracker.mjs", "src/search/performance-reader.mjs"];

/* ---- fixture observations: the shape the store holds ---- */
let seq = 0;
const obs = (pull, dims, rows, over = {}) => ({ record_type: "observation", observation_id: `o${++seq}`, method: `gsc.searchAnalytics.query:${pull}`, observed_at: over.observedAt ?? `2026-09-12T00:00:0${seq % 10}Z`, target: { kind: "property", ref: "sc-domain:fixture.invalid" }, value: { startDate: over.startDate ?? "2026-08-15", endDate: over.endDate ?? "2026-09-12", dimensions: dims, rowCount: rows.length, requestCount: 1, rowLimitPerRequest: 25000, dataState: over.dataState ?? "COMPLETE", rows } });
const row = (url, extra = {}) => ({ url, clicks: 1, impressions: 10, ctr: 0.1, position: 4, ...extra });

/** A declared world with TWO tenants: the second owns exactly one of the real declared origins. */
function twoTenantWorld() {
  const origins = readDeclarations().attachments.filter((a) => a.resourceKind === "SITE_ORIGIN").map((a) => a.resourceRef);
  const [mineOrigin, otherOrigin] = [origins[0], origins[1]];
  const WORLD = declaredWorld({ secondTenantOrigins: [otherOrigin] });
  return { WORLD, mine: mineOrigin, other: otherOrigin, resolve: createTenantResolver({ env: WORLD.envWith() }) };
}

/* ================= C1 ================= */

test("C1 · FIRING CONTROL: a row reaches a client only by the origin it stores — another client's row, an undeclared row and a site-wide row never do", () => {
  const { WORLD, mine, other, resolve } = twoTenantWorld();
  try {
    const records = [
      obs("query-page", ["query", "page"], [row(`${mine}/a`, { query: "q" }), row(`${other}/b`, { query: "q" }), row("https://undeclared.invalid/c", { query: "q" })]),
      obs("query", ["query"], [{ query: "q", clicks: 5, impressions: 50 }, { query: "r", clicks: 1, impressions: 9 }]),
    ];
    const o = clientObservations({ records, tenantId: FIXTURE_TENANT, resolve, decision: decidePartition(resolve, FIXTURE_TENANT) });
    const qp = o.find((x) => x.pull === "query-page");
    assert.equal(qp.clientRows.length, 1, "another client's or an undeclared row reached this client");
    assert.equal(qp.quarantined, 1);
    const site = o.find((x) => x.pull === "query");
    assert.deepEqual([site.clientRows, site.siteWideRows], [null, 2], "a site-wide row became this client's");
    const second = clientObservations({ records, tenantId: SECOND_FIXTURE_TENANT, resolve, decision: decidePartition(resolve, SECOND_FIXTURE_TENANT) });
    assert.equal(second.find((x) => x.pull === "query-page").clientRows.length, 1);
    assert.throws(() => clientObservations({ records, tenantId: "tenant:nobody", resolve, decision: decidePartition(resolve, "tenant:nobody") }), { code: "SCOPE_REFUSED" });
    assert.throws(() => clientObservations({ records, tenantId: FIXTURE_TENANT, resolve, decision: { allowed: true } }), { code: "SCOPE_REFUSED" }, "a forged decision was honoured");
  } finally { WORLD.cleanup(); }
});

/* ================= C2–C5 on the tracker ================= */

const cp = (pull, dims, clientRows, over = {}) => ({ pull, dims, startDate: over.startDate ?? "2026-08-15", endDate: over.endDate ?? "2026-09-12", observedAt: over.observedAt ?? "2026-09-12T00:00:00Z", complete: over.complete ?? true, state: over.state ?? "COMPLETE", rowLimit: 25000, requests: 1, recordsPosition: over.recordsPosition ?? true, clientRows, siteWideRows: over.siteWideRows ?? 0, quarantined: 0 });

test("C2 · FIRING CONTROL: each named dimension is TRACKED only from a client pull carrying it with the page — a site-wide country row never tracks country", () => {
  const r = trackPerformance({ observations: [cp("query-page", ["query", "page"], [row("u", { query: "q" })]), cp("country", ["country"], null, { siteWideRows: 9 })] });
  assert.deepEqual([r.dimensions.query.state, r.dimensions.page.state, r.dimensions.country.state, r.dimensions.device.state], ["TRACKED", "TRACKED", NOT_MEASURED, NOT_MEASURED]);
  assert.match(r.dimensions.device.missing, /device-page pull carrying device together with the page/);
  assert.equal(r.unattributedSiteWideRows, 9);
  const full = trackPerformance({ observations: [cp("country-page", ["country", "page"], [row("u", { country: "x" })]), cp("device-page", ["device", "page"], [row("u", { device: "d" })])] });
  assert.deepEqual([full.dimensions.country.state, full.dimensions.device.state], ["TRACKED", "TRACKED"]);
  assert.deepEqual(Object.keys(NAMED), ["query", "page", "country", "device"]);
});

test("C3 · FIRING CONTROL: measures per pull, never summed across pulls; CTR with both terms; position as recorded, impression-weighted; nothing invented", () => {
  const m = measuresOf([row("a", { clicks: 2, impressions: 10, position: 2 }), row("b", { clicks: 1, impressions: 30, position: 6 })], { recordsPosition: true });
  assert.deepEqual([m.impressions, m.clicks, m.ctr.clicks, m.ctr.impressions], [40, 3, 3, 40]);
  assert.equal(m.ctr.value, 3 / 40);
  assert.equal(m.position.value, (2 * 10 + 6 * 30) / 40);
  assert.match(m.position.method, /impression-weighted mean of the positions Search Console recorded per row/);
  assert.equal(measuresOf([row("a")], { recordsPosition: false }).position.value, NOT_MEASURED, "a position was invented for a pull that records none");
  assert.equal(measuresOf([row("a", { impressions: 0, clicks: 0 })], { recordsPosition: true }).ctr.value, NOT_MEASURED, "CTR over zero impressions read as 0");
  const r = trackPerformance({ observations: [cp("page-rows", ["page"], [row("a")], { recordsPosition: false }), cp("query-page", ["query", "page"], [row("a", { query: "q" })])] });
  assert.equal(r.perPull.length, 2, "two pulls of one window were summed into one figure");
  assert.ok(!Object.keys(r).some((k) => /total|sum|score|rank/i.test(k)), "a summed total or an invented rank measure appeared");
});

test("C4 · FIRING CONTROL: a trend only from two recorded points — one window or one date is NOT MEASURED, never a flat line", () => {
  const one = trackPerformance({ observations: [cp("page-rows", ["page"], [row("a")])] });
  assert.equal(one.trend.state, NOT_MEASURED);
  assert.ok(!("series" in one.trend), "an absent trend carried an (empty) series");
  const windows = trackPerformance({ observations: [cp("page-rows", ["page"], [row("a")]), cp("page-rows", ["page"], [row("a")], { startDate: "2026-07-15", endDate: "2026-08-12" })] });
  assert.deepEqual(windows.trend.series.map((s) => [s.by, s.points.length]), [["window", 2]]);
  const dated = trackPerformance({ observations: [cp("date-page", ["date", "page"], [row("a", { date: "2026-09-01" }), row("b", { date: "2026-09-02" })])] });
  assert.deepEqual(dated.trend.series.map((s) => [s.by, s.points.length, s.points[0].at]), [["date", 2, "2026-09-01"]]);
  const oneDate = trackPerformance({ observations: [cp("date-page", ["date", "page"], [row("a", { date: "2026-09-01" })])] });
  assert.equal(oneDate.trend.state, NOT_MEASURED, "one date was presented as a trend");
});

test("C5 · FIRING CONTROL: OWNED, never global; a pull not COMPLETE contributes nothing and is named; the latest reading of a pull and window is used", () => {
  const r = trackPerformance({ observations: [
    cp("page-rows", ["page"], [row("a")], { observedAt: "2026-09-12T01:00:00Z" }),
    cp("page-rows", ["page"], [row("a"), row("b")], { observedAt: "2026-09-12T02:00:00Z" }),
    cp("device-page", ["device", "page"], [row("a", { device: "d" })], { complete: false, state: "UNKNOWN" }),
  ] });
  assert.equal(r.label, OWNED);
  assert.match(OWNED, /never global demand/);
  assert.deepEqual(r.notComplete, [{ pull: "device-page", state: "UNKNOWN" }]);
  assert.equal(r.dimensions.device.state, NOT_MEASURED, "a pull not recorded COMPLETE tracked a dimension");
  assert.equal(r.supersededReadings, 1);
  assert.equal(r.perPull.find((p) => p.pull === "page-rows").rows, 2, "an older reading of the same pull and window was used");
});

/* ================= C6 — the new pull types, FAKE provider only ================= */

function fakeProvider({ visible = true, dataState = "COMPLETE" } = {}) {
  const calls = [];
  return {
    providerId: "fake", calls,
    async listProperties() { return visible ? [{ propertyId: "sc-domain:fixture.invalid", propertyType: "DOMAIN", permissionLevel: "siteFullUser", authState: "GRANTED", observedAt: new Date().toISOString() }] : []; },
    async queryRows({ propertyId, dimensions, rowLimitPerRequest, maxRequests }) {
      calls.push({ propertyId, dimensions: [...dimensions], rowLimitPerRequest, maxRequests });
      if (propertyId === "https://control.invalid/") return { rows: [], rowCount: 0, requestCount: 1, exhausted: false, truncationReason: "API_ERROR", dataState: "UNKNOWN", propertyId, httpStatus: 403, rowLimitPerRequest, maxRequests, cost: { provider: "fake", apiCalls: 1, amount: 0, currency: "USD", amountState: "ZERO_BY_TARIFF" } };
      const rows = [{ keys: [dimensions[0] === "date" ? "2026-09-01" : "x", "https://a.fixture.invalid/1"], clicks: 1, impressions: 9, ctr: 0.11, position: 3 }];
      return { rows, rowCount: 1, requestCount: 1, exhausted: dataState === "COMPLETE", truncationReason: dataState === "COMPLETE" ? null : "API_ERROR", dataState, propertyId, httpStatus: dataState === "COMPLETE" ? 200 : 500, rowLimitPerRequest, maxRequests, cost: { provider: "fake", apiCalls: 1, amount: 0, currency: "USD", amountState: "ZERO_BY_TARIFF" } };
    },
  };
}
const tmpStore = () => { const dir = mkdtempSync(join(tmpdir(), "almi-f81-")); return { dir, store: createJsonlStore(join(dir, "e.jsonl")) }; };
const FIXED = () => new Date("2026-10-02T00:00:00Z");

test("C6 · FIRING CONTROL: the performance set runs exactly its three page-carrying pulls, within the ingest's ceiling, through the same pipeline — and nothing of the estate set", async () => {
  const p = fakeProvider(); const { dir, store } = tmpStore();
  try {
    /* the estate set's inputs are given too, so a fall-through into it would RUN (and be caught below by the call list), not crash */
    const r = await runIngest({ provider: p, store, propertyId: "sc-domain:fixture.invalid", estateHostnames: ["a.fixture.invalid"], days: 28, now: FIXED, controlProperty: "https://control.invalid/", pullSet: "performance" });
    assert.deepEqual(p.calls.map((c) => c.dimensions), [["date", "page"], ["device", "page"], ["country", "page"]]);
    assert.ok(p.calls.every((c) => c.rowLimitPerRequest === 25000 && c.maxRequests === 20), "a performance pull escaped the ingest's request ceiling");
    const stored = store.readAll().filter((o) => o.method?.startsWith("gsc.searchAnalytics.query:"));
    assert.deepEqual(stored.map((o) => o.method.split(":").pop()), ["date-page", "device-page", "country-page"]);
    assert.ok(stored.every((o) => o.value.rows.every((x) => typeof x.url === "string")), "a performance row lost its page, so it cannot be attributed");
    assert.equal(r.pullSet, "performance");
    await assert.rejects(() => runIngest({ provider: fakeProvider(), store, propertyId: "sc-domain:fixture.invalid", estateHostnames: [], now: FIXED, pullSet: "everything" }), /unknown pull set/);
    const est = fakeProvider(); const t2 = tmpStore();
    await runIngest({ provider: est, store: t2.store, propertyId: "sc-domain:fixture.invalid", estateHostnames: ["a.fixture.invalid"], now: FIXED, controlProperty: "https://control.invalid/" });
    assert.ok(!est.calls.some((c) => c.dimensions.includes("date") || c.dimensions.includes("device")), "the default estate set started making performance pulls");
    rmSync(t2.dir, { recursive: true, force: true });
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.deepEqual(PULL_SETS.performance.map(([k]) => k), ["date-page", "device-page", "country-page"]);
});

test("C6 · FIRING CONTROL: a property the account cannot see is refused before any pull; a duplicate or retried run appends nothing new; a failure is recorded not COMPLETE and contributes nothing", async () => {
  const blind = fakeProvider({ visible: false }); const a = tmpStore();
  await assert.rejects(() => runIngest({ provider: blind, store: a.store, propertyId: "sc-domain:fixture.invalid", estateHostnames: [], now: FIXED, pullSet: "performance" }), /not among the properties/);
  assert.equal(blind.calls.length, 0, "a pull was issued against a property the account cannot see");
  rmSync(a.dir, { recursive: true, force: true });
  const b = tmpStore();
  try {
    const first = await runIngest({ provider: fakeProvider(), store: b.store, propertyId: "sc-domain:fixture.invalid", estateHostnames: [], now: FIXED, pullSet: "performance" });
    const again = await runIngest({ provider: fakeProvider(), store: b.store, propertyId: "sc-domain:fixture.invalid", estateHostnames: [], now: FIXED, pullSet: "performance" });
    assert.ok(first.appended >= 3);
    assert.equal(again.appended, 0, "a duplicate or retried run appended new measurements");
  } finally { rmSync(b.dir, { recursive: true, force: true }); }
  const c = tmpStore();
  try {
    await runIngest({ provider: fakeProvider({ dataState: "UNKNOWN" }), store: c.store, propertyId: "sc-domain:fixture.invalid", estateHostnames: [], now: FIXED, pullSet: "performance" });
    const failed = c.store.readAll().filter((o) => o.method?.endsWith("-page"));
    assert.ok(failed.length === 3 && failed.every((o) => o.value.dataState !== "COMPLETE"), "a failed pull was recorded COMPLETE");
    const t = trackPerformance({ observations: failed.map((o) => ({ pull: o.method.split(":").pop(), dims: o.value.dimensions, startDate: o.value.startDate, endDate: o.value.endDate, observedAt: o.observed_at, complete: o.value.dataState === "COMPLETE", state: o.value.dataState, rowLimit: 25000, requests: 1, recordsPosition: true, clientRows: o.value.rows, siteWideRows: 0, quarantined: 0 })) });
    assert.equal(t.dimensions.device.state, NOT_MEASURED, "a failed pull tracked a dimension");
    assert.equal(t.notComplete.length, 3);
  } finally { rmSync(c.dir, { recursive: true, force: true }); }
});

test("C6 · FIRING CONTROL: through the REAL provider code over a fake transport, a performance pull stops at its request ceiling and the run stops at its absolute cap", async () => {
  const dir = mkdtempSync(join(tmpdir(), "almi-f81-key-"));
  try {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const key = join(dir, "k.json");
    writeFileSync(key, JSON.stringify({ client_email: "test@example.invalid", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }));
    let analytics = 0;
    const fetchImpl = async (url, init = {}) => {
      const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
      if (url.includes("oauth2")) return json(200, { access_token: "t" });
      if (url.endsWith("/sites")) return json(200, { siteEntry: [{ siteUrl: "sc-domain:fixture.invalid", permissionLevel: "siteFullUser" }] });
      analytics += 1;
      const { rowLimit } = JSON.parse(init.body);
      return json(200, { rows: Array(rowLimit).fill({ keys: ["2026-09-01", "https://a.fixture.invalid/1"], clicks: 0, impressions: 1, ctr: 0, position: 1 }) });
    };
    const ceiling = createGoogleSearchConsoleProvider({ keyFilePath: key, fetchImpl, governor: createCostGovernor({ label: "f81 ceiling", maxApiCalls: 1000, maxWallClockMs: 600000 }) });
    const res = await ceiling.queryRows({ propertyId: "sc-domain:fixture.invalid", startDate: "2026-09-01", endDate: "2026-09-28", dimensions: ["date", "page"], rowLimitPerRequest: 10, maxRequests: 3 });
    assert.equal(analytics, 3, "a performance pull issued more requests than its ceiling");
    assert.notEqual(res.dataState, "COMPLETE", "a truncated pull read COMPLETE");
    analytics = 0;
    const capped = createGoogleSearchConsoleProvider({ keyFilePath: key, fetchImpl, governor: createCostGovernor({ label: "f81 cap", maxApiCalls: 2, maxWallClockMs: 600000 }) });
    await assert.rejects(() => capped.queryRows({ propertyId: "sc-domain:fixture.invalid", startDate: "2026-09-01", endDate: "2026-09-28", dimensions: ["device", "page"], rowLimitPerRequest: 10, maxRequests: 20 }), CostCapExceeded);
    assert.ok(analytics <= 2, "the run's absolute cap was exceeded");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= REAL ================= */

test("REAL · one declared client's own Search Console rows: page and query tracked, country, device and the trend NOT MEASURED — site-wide rows never its own", () => {
  const resolve = createTenantResolver();
  const t = readDeclarations().attachments.find((a) => a.resourceKind === "FACT_REGISTRY").tenantId;
  const r = readClientPerformance({ tenantId: t, resolve, repo: REPO });
  assert.ok(r.perPull.length > 0 && r.dimensions.page.rows > 0, "EMPTY real population");
  assert.equal(r.dimensions.device.state, NOT_MEASURED, "a device dimension was reported with no recorded device pull");
  assert.equal(r.dimensions.country.state, NOT_MEASURED, "a client country was taken from site-wide rows");
  assert.equal(r.trend.state, NOT_MEASURED, "a trend was reported from one window");
  assert.ok(r.unattributedSiteWideRows > 0, "the real site-wide rows vanished — or were charged to this client");
  for (const p of r.perPull) assert.equal(p.ctr.clicks <= p.ctr.impressions, true);
  console.log(`  REAL (count-only; one declared client's partition of the owned store): ${JSON.stringify({ dimensions: Object.fromEntries(Object.entries(r.dimensions).map(([k, v]) => [k, v.state === "TRACKED" ? v.rows : v.state])), pulls: r.perPull.map((p) => ({ pull: p.pull, rows: p.rows, impressions: p.impressions, clicks: p.clicks, position: typeof p.position.value === "number" ? "recorded" : p.position.value })), trend: r.trend.state, siteWide: r.unattributedSiteWideRows, quarantined: r.quarantinedRows, superseded: r.supersededReadings })}`);
});

/* ================= the entry point ================= */

test("C7 · THE ENTRY POINT: in a declared world it prints counts and rates with their terms — never a query, URL or tenant id — and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const queries = createJsonlStore(join(REPO, "runs/evidence/evidence.jsonl")).readAll().flatMap((o) => (o.value?.rows ?? []).map((x) => x.query)).filter((q) => typeof q === "string" && q.length > 6);
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/search-performance.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    for (const re of [/OWNED — this property's own Search Console evidence, never global demand/, /device\s+NOT MEASURED — missing a recorded device-page pull/, /trend\s+NOT MEASURED/, /unattributed \d+ site-wide row\(s\) carry no page — never this client's/, /CTR [\d.]+ \(\d+ \/ \d+\)/]) assert.match(ok.stdout, re);
    assert.doesNotMatch(ok.stdout, /NaN/, "an unrecorded bound printed as NaN");
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\/|tenant:[0-9a-f]{6,}/, "the entry point printed a URL or a tenant id");
    for (const q of [...new Set(queries)].slice(0, 400)) assert.ok(!ok.stdout.includes(q), "the entry point printed a query");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("the tracker and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  assert.deepEqual(decisionCallPaths({ entries: CODE }).faults, []);
  const planted = decisionCallPaths({ entries: CODE, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === CODE[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
