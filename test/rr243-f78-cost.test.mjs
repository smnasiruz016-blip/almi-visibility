/**
 * 🔴 RR-243 · F78 ACCEPTANCE AMENDMENT 1 (_handoffs d2bfd22, contract 1fc5b486…) — A1 THE BOUNDED C1, C8 RUN COMPLETENESS, C9 THE
 * TENANT'S OWN LEDGER. Every expected answer below is written by hand. Spawned runs live in a DISPOSABLE declared world (RR-177), make no
 * network request (test/helpers/net-sentinel.mjs counts and refuses every one) and write only the confined audit store.
 *
 *   A1-1  the frozen list: 25 gaps, its hash the one C1's frozen words name, its boundary, its kinds; refs never a client's name
 *   A1-2  the decisions: a listed pre-boundary gap is reported and does not disprove; an UNLISTED one and a post-boundary one DISPROVE;
 *         a list that no longer hashes to its pin DISPROVES
 *   A1-3  REAL: the recorded ledgers — every gap they show is listed and pre-boundary; all 25 reported by name; C1's gap part PROVED
 *   C8-1  the census: every entry point the F03 census finds opening a connector is metered, records, and names its own ledger
 *   C8-2  REAL PATH: one entry for every run — completed, refused, failed — and none twice when the run wrote its own
 *   C8-3  REAL PATH: without --confirm no request is made and no entry is written (the write law refuses it)
 *   C8-4  REAL ENTRY POINT: a dry crawl makes no network request at all (no egress probe, no DNS)
 *   C9-1  REAL declarations: each tenant's own ledger ALLOWED, another's and the shared one REFUSED; the shared one attached to nobody
 *   C9-2  REAL PATH: a tenant with no declared ledger is refused before any request; nothing is written anywhere
 *   C9-3  an entry in a tenant's ledger naming another tenant is FOREIGN, counted for nobody
 *   C9-4  the shared engine ledger: only read, or named by an entry point F02 refuses for every real tenant
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";

import { PRE_BOUNDARY_GAPS, PRE_BOUNDARY_GAP_LIST_SHA256, BOUNDARY, GAP_KINDS } from "../config/cost/pre-boundary-gaps.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { decideGaps, boundedGapReport, listSha256, GAP_STATE } from "../src/cost/gap-boundary.mjs";
import { readCostByTenant } from "../src/cost/cost-by-tenant.mjs";
import { attributeCostEntry } from "../src/cost/tenant-attribution.mjs";
import { tenantLedger, tenantLedgerRef, declaredTenantLedgers, connectorRunEntry, TENANT_LEDGER_DIR, runCost } from "../src/cost/run-cost.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { runCostCensus, liveRunCostCensus } from "../tools/run-cost-census.mjs";
import { productionFiles, censusOf } from "../tools/root-connector-census.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT, DATA_ROOT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const SENTINEL = pathToFileURL(join(REPO, "test", "helpers", "net-sentinel.mjs")).href;
const CHILD = "test/helpers/rr243-run-cost-child.mjs";
const jsonl = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const part = (over = {}) => ({ amountState: "MEASURED", amount: 0, currency: "USD", basis: "b".repeat(12), ...over });
const entry = (id, at, over = {}) => ({ record_type: "cost_entry", entry_id: id, run_kind: "gsc-ingest", run_ref: "r", recorded_at: at, money: part(), providerCalls: { state: "MEASURED", total: 1 }, founderTime: { state: "MEASURED", seconds: 1 }, budget: { kind: "x", used: { a: 1 }, bounds: { b: 1 }, capReached: false }, sources: [], ...over });
const gap = { state: "UNKNOWN", seconds: null, unknownKind: "MEASURABLE_BUT_NOT_RECORDED", unknownReason: "the run never recorded its span" };

/* ================= A1 ================= */

test("A1-1 · the frozen list: 25 gaps whose canonical JSON hashes to the pin C1's frozen words name; boundary and kinds as frozen", () => {
  assert.equal(PRE_BOUNDARY_GAPS.length, 25);
  assert.equal(listSha256(PRE_BOUNDARY_GAPS), PRE_BOUNDARY_GAP_LIST_SHA256);
  assert.equal(PRE_BOUNDARY_GAP_LIST_SHA256, "a38fd23ee10d9d3c84397d74eb894bfa6d4d7a7bd78c766fb21874270c49dacb");
  assert.equal(BOUNDARY, "2026-10-09");
  assert.ok(ACCEPTANCES.F78.expected.includes(PRE_BOUNDARY_GAP_LIST_SHA256) && ACCEPTANCES.F78.expected.includes(`the boundary is ${BOUNDARY}`), "C1's frozen words do not name this list and boundary");
  const kinds = PRE_BOUNDARY_GAPS.reduce((m, g) => ((m[g.kind] = (m[g.kind] ?? 0) + 1), m), {});
  assert.deepEqual(kinds, { LEDGER_PART_NOT_RECORDED: 12, CONNECTOR_RUN_NOT_LEDGERED: 4, PRE_CONNECTOR_RUN_NOT_LEDGERED: 9 });
  assert.ok(PRE_BOUNDARY_GAPS.every((g) => GAP_KINDS.includes(g.kind) && g.date < BOUNDARY));
  assert.ok(PRE_BOUNDARY_GAPS.filter((g) => g.kind === "PRE_CONNECTOR_RUN_NOT_LEDGERED").every((g) => /^(engine|data):sha256:[0-9a-f]{64}$/.test(g.ref)), "a pre-connector record is named by something other than its blob sha256");
  /* FIRING CONTROL: one changed character moves the hash */
  assert.notEqual(listSha256([{ ...PRE_BOUNDARY_GAPS[0], date: "2026-09-13" }, ...PRE_BOUNDARY_GAPS.slice(1)]), PRE_BOUNDARY_GAP_LIST_SHA256);
});

test("A1-2 · a listed pre-boundary gap is reported and does not disprove; an unlisted pre-boundary gap and a post-boundary gap DISPROVE", () => {
  const list = [{ id: "PBG-01", kind: "LEDGER_PART_NOT_RECORDED", date: "2026-09-12", ref: "e1 · founderTime" }];
  const listed = entry("e1", "2026-09-12T10:00:00Z", { founderTime: gap });
  const ok = boundedGapReport({ entries: [listed], list, boundary: BOUNDARY, listShaPinned: listSha256(list) });
  assert.deepEqual([ok.verdict, ok.listed.seenInLedgers, ok.listed.names, ok.unlisted, ok.postBoundary], ["PROVED", 1, ["PBG-01"], [], []]);
  assert.deepEqual(decideGaps({ entries: [listed], list, boundary: BOUNDARY }).map((d) => d.state), [GAP_STATE.LISTED]);
  const unlisted = entry("e2", "2026-09-20T10:00:00Z", { founderTime: gap });
  const u = boundedGapReport({ entries: [listed, unlisted], list, boundary: BOUNDARY, listShaPinned: listSha256(list) });
  assert.deepEqual([u.verdict, u.unlisted], ["DISPROVED", ["e2 · founderTime"]], "an UNLISTED pre-boundary gap was not refused");
  const post = entry("e3", "2026-10-09T00:00:01Z", { founderTime: gap });
  const p = boundedGapReport({ entries: [listed, post], list, boundary: BOUNDARY, listShaPinned: listSha256(list) });
  assert.deepEqual([p.verdict, p.postBoundary], ["DISPROVED", ["e3 · founderTime"]], "a gap on the boundary day did not disprove C1");
  /* a listed ref recorded on another date is not the listed gap */
  const moved = entry("e1", "2026-09-13T10:00:00Z", { founderTime: gap });
  assert.equal(boundedGapReport({ entries: [moved], list, boundary: BOUNDARY, listShaPinned: listSha256(list) }).verdict, "DISPROVED");
  const tampered = boundedGapReport({ entries: [listed], list, boundary: BOUNDARY, listShaPinned: "0".repeat(64) });
  assert.deepEqual([tampered.verdict, tampered.listIntact], ["DISPROVED", false], "a list that no longer hashes to its pin was trusted");
});

test("A1-3 · REAL: the recorded ledgers show only listed pre-boundary gaps; all 25 are reported by name on the read; C1's gap part PROVED", () => {
  const r = readCostByTenant({ resolve: createTenantResolver() });
  assert.deepEqual([r.gaps.listIntact, r.gaps.listed.total, r.gaps.listed.seenInLedgers, r.gaps.unlisted.length, r.gaps.postBoundary.length, r.gaps.verdict], [true, 25, 12, 0, 0, "PROVED"]);
  assert.deepEqual(r.gaps.listed.names, PRE_BOUNDARY_GAPS.map((g) => g.id));
  assert.equal(r.summary.measurableButNotRecorded, 12, "the twelve gaps are counted, never hidden");
  console.log(`  REAL (count-only): ${r.bound} | gaps ${JSON.stringify({ listed: r.gaps.listed.total, seen: r.gaps.listed.seenInLedgers, unlisted: r.gaps.unlisted.length, post: r.gaps.postBoundary.length, verdict: r.gaps.verdict })}`);
});

/* ================= C8 ================= */

test("C8-1 · the census: every entry point the F03 census finds opening a connector is metered, records under its own name and names its own ledger", () => {
  const rows = liveRunCostCensus();
  const f03 = new Set(censusOf(productionFiles().map((file) => ({ file, text: readFileSync(join(REPO, file), "utf8") }))).sites.filter((s) => s.kind === "CONNECTOR").map((s) => s.file));
  assert.deepEqual(rows.map((r) => r.file), [...f03].sort(), "the census population is not the F03 census's connector sites");
  assert.equal(rows.length, 10, "the population moved — re-measure");
  assert.equal(rows.reduce((n, r) => n + r.sites, 0), 12);
  for (const r of rows) assert.deepEqual([r.metered, r.recorder, r.ownLedger], [true, true, true], `${r.file} is not complete`);
  /* FIRING CONTROL: a stand-in entry point that opens a connector bare, records under another name and names the shared ledger */
  const planted = [{ file: "bin/planted.mjs", text: 'const SCOPE = scopedEntryPoint({ entry: "bin/planted.mjs", governed: true, resources: [RESOURCES.connector(S, "PUBLIC_SITE"), RESOURCES.costLedger()] });\nconst RUN_COST = runCost({ entryPoint: "bin/elsewhere.mjs", scope: SCOPE });\nconst C = openConnector({ scope: SCOPE, subjectId: S, kind: "PUBLIC_SITE" });\n' }];
  assert.deepEqual(runCostCensus(planted).map((r) => [r.metered, r.recorder, r.ownLedger, r.ok]), [[false, false, false, false]]);
});

const childRun = (W, mode, { confirm = true, tenant = FIXTURE_TENANT } = {}) => {
  const sentinelFile = join(W.root, `sentinel-${mode}-${confirm}.json`);
  const r = spawnSync(process.execPath, ["--import", SENTINEL, CHILD, `--mode=${mode}`, `--tenant=${tenant}`, "--actor=actor:cc", ...(confirm ? ["--confirm"] : [])], { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), NET_SENTINEL_FILE: sentinelFile }, timeout: 120_000 });
  return { ...r, out: r.stdout + r.stderr, net: existsSync(sentinelFile) ? JSON.parse(readFileSync(sentinelFile, "utf8")).total : null, standIn: Number((r.stdout.match(/STAND_IN_REQUESTS (\d+)/) ?? [])[1] ?? -1) };
};
const ledgerOf = (W, tenant) => join(W.root, "tenancy", TENANT_LEDGER_DIR, `${tenant.slice(7)}.jsonl`);

test("C8-2 · REAL PATH: one cost entry for every run — completed, refused after its gate, or failed — and never a second one beside the run's own", () => {
  const W = declaredWorld();
  try {
    const L = ledgerOf(W, FIXTURE_TENANT);
    const cases = [["complete", 0, "COMPLETED", 2], ["refuse", 3, "ENDED (exit 3)", 0], ["throw", 1, "FAILED (TypeError)", 1]];
    let n = 0;
    for (const [mode, code, outcome, requests] of cases) {
      const r = childRun(W, mode);
      assert.equal(r.status, code, `${mode}: ${r.out}`);
      assert.equal(r.net, 0, `${mode}: a network request was made`);
      const es = jsonl(L);
      assert.equal(es.length, ++n, `${mode}: the run did not write exactly one entry`);
      const e = es.at(-1);
      assert.deepEqual([e.run_kind, e.outcome, e.providerCalls.total, e.scope.tenantId], ["connector-run", outcome, requests, FIXTURE_TENANT], `${mode}: the entry`);
      assert.ok(e.run_ref.startsWith("test/helpers/rr243-run-cost-child.mjs · started ") && e.founderTime.state === "MEASURED");
    }
    const own = childRun(W, "own-entry");
    assert.equal(own.status, 0, own.out);
    assert.match(own.out, /OWN COMMITTED/);
    const es = jsonl(L);
    assert.equal(es.length, n + 1, "a run that wrote its own entry got a second one from the hook");
    assert.equal(es.at(-1).outcome, "OWN");
    /* nothing went anywhere else: no other ledger exists in the world's ledger directory, and the engine's shared ledger is untouched */
    assert.deepEqual(execFileSync("git", ["-C", REPO, "status", "--porcelain", "--", "runs/cost"], { encoding: "utf8" }), "");
  } finally { W.cleanup(); }
});

test("C8-3 · REAL PATH: without --confirm the run makes no request at all, and its entry is refused by the write law, never written", () => {
  const W = declaredWorld();
  try {
    const r = childRun(W, "open-only", { confirm: false });
    assert.equal(r.status, 3, r.out);
    assert.match(r.out, /NO_WRITE_PERMISSION/);
    assert.deepEqual([r.standIn, r.net], [0, 0], "a request was made without --confirm");
    assert.deepEqual(jsonl(ledgerOf(W, FIXTURE_TENANT)), [], "an entry was written without --confirm");
    /* CONTROL: the same run WITH --confirm opens the stand-in and records */
    const ok = childRun(W, "complete");
    assert.deepEqual([ok.status, ok.standIn, jsonl(ledgerOf(W, FIXTURE_TENANT)).length], [0, 2, 1], ok.out);
  } finally { W.cleanup(); }
});

test("C8-4 · REAL ENTRY POINT: a dry crawl (no --live) makes no network request at all — no egress probe, no DNS lookup", () => {
  const W = declaredWorld({ extra: [["RESEARCH_BATCH", "rr243-dry"]] });
  try {
    const store = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8")).stores.find((s) => s.store === "RESEARCH");
    const dir = join(W.root, store.path, "rr243-dry");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "seeds.txt"), "https://fixture-world.invalid/a\n");
    const sentinelFile = join(W.root, "sentinel-crawl.json");
    const r = spawnSync(process.execPath, ["--import", SENTINEL, ...W.argv(["bin/crawl.mjs", "--research-batch=rr243-dry", `--subject=fixture-world-subject`])], { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), NET_SENTINEL_FILE: sentinelFile }, timeout: 120_000 });
    const out = r.stdout + r.stderr;
    assert.match(out, /IPv6 EGRESS\s+: NOT_MEASURED — a dry run makes no request/, `the dry crawl did not reach its probe point: ${out}`);
    assert.equal(JSON.parse(readFileSync(sentinelFile, "utf8")).total, 0, "a dry crawl made a network request");
  } finally { W.cleanup(); }
});

/* ================= C9 ================= */

test("C9-1 · REAL declarations: each tenant's own ledger ALLOWED, another tenant's and the shared one REFUSED; the shared ledger is attached to nobody", () => {
  const resolve = createTenantResolver();
  const decl = resolve.declarations;
  const tenants = JSON.parse(readFileSync(join(DATA_ROOT, "tenancy", "tenants.json"), "utf8")).tenants.map((t) => t.tenantId);
  const withLedger = declaredTenantLedgers().map((l) => l.tenantId);
  assert.ok(withLedger.length >= 3, "fewer than three real tenant ledgers — the proof would be thin");
  for (const t of withLedger) {
    assert.equal(decideForTenant(resolve, t, RESOURCES.costLedger(tenantLedgerRef(t))).allowed, true, "a tenant's own ledger was refused");
    for (const o of withLedger.filter((x) => x !== t)) assert.equal(decideForTenant(resolve, t, RESOURCES.costLedger(tenantLedgerRef(o))).allowed, false, "another tenant's ledger was allowed");
    assert.equal(tenantLedger({ tenantId: t }).state, "DECLARED");
  }
  for (const t of tenants) assert.equal(decideForTenant(resolve, t, RESOURCES.costLedger()).allowed, false, "the shared engine ledger was allowed to a real tenant");
  assert.ok(!decl.attachments.some((a) => a.resourceKind === "COST_LEDGER" && a.resourceRef === "cost-ledger"), "the shared engine ledger is attached to a tenant");
  for (const t of tenants.filter((x) => !withLedger.includes(x))) assert.equal(tenantLedger({ tenantId: t }).state, "UNDECLARED");
  console.log(`  REAL (count-only): tenants ${tenants.length} · with their own declared ledger ${withLedger.length} · shared ledger refused to all ${tenants.length}`);
});

test("C9-2 · REAL PATH: a run for a tenant with no declared cost ledger is refused BEFORE any request; nothing is written anywhere", () => {
  const W = declaredWorld({ secondTenantOrigins: ["https://fixture-world.invalid"], secondTenantLedger: false });
  try {
    const r = childRun(W, "complete", { tenant: SECOND_FIXTURE_TENANT });
    assert.equal(r.status, 3, r.out);
    assert.deepEqual([r.standIn, r.net], [-1, 0], "the refused run made a request or reached its connector");
    assert.equal(existsSync(join(W.root, "tenancy", TENANT_LEDGER_DIR)), false, "a ledger was written for a refused run");
  } finally { W.cleanup(); }
});

test("C9-3 · an entry in a tenant's ledger naming another tenant is FOREIGN — counted for nobody; a ledger attached to another tenant is not this one's", () => {
  const A = "tenant:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", B = "tenant:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const e = connectorRunEntry({ entryPoint: "bin/x.mjs", tenantId: B, startedAt: "2026-10-10T00:00:00.000Z", finishedAt: "2026-10-10T00:00:01.000Z", outcome: "COMPLETED", requests: 1, kinds: { PUBLIC_SITE: 1 } });
  const a = attributeCostEntry(e, { resolve: () => ({ state: "UNDECLARED" }), ledgerTenant: A });
  assert.deepEqual([a.state, a.tenantId, a.foreign], ["UNATTRIBUTED", null, true]);
  assert.deepEqual([attributeCostEntry(e, { resolve: () => ({}), ledgerTenant: B }).tenantId], [B]);
  const decl = { readable: true, dir: "/d/tenancy", attachments: [{ resourceKind: "COST_LEDGER", resourceRef: tenantLedgerRef(A), tenantId: B }] };
  assert.equal(tenantLedger({ tenantId: A, declarations: decl }).state, "UNDECLARED", "A's ledger attached to B was taken as A's");
  assert.equal(tenantLedger({ tenantId: B, declarations: decl }).state, "UNDECLARED", "a ledger named for A was taken as B's");
  assert.equal(tenantLedger({ tenantId: A, declarations: { ...decl, attachments: [{ ...decl.attachments[0], tenantId: A }] } }).path.replace(/\\/g, "/"), `/d/tenancy/${TENANT_LEDGER_DIR}/${"a".repeat(32)}.jsonl`);
});

test("C9-4 · the shared engine ledger: every production file that can WRITE it is an entry point F02 refuses for every real tenant", () => {
  /* a writer: it builds a cost ledger (createCostLedger) and names the shared ledger's path; every other mention only reads or describes it */
  const text = (f) => readFileSync(join(REPO, f), "utf8");
  const files = productionFiles().filter((f) => /runs\/cost\/ledger\.jsonl/.test(text(f)) && /\bcreateCostLedger\(/.test(text(f)));
  const readers = ["bin/report.mjs"];
  const sharedNamed = files.filter((f) => !readers.includes(f) && /RESOURCES\.costLedger\(\)/.test(text(f)));
  assert.deepEqual(files.filter((f) => !readers.includes(f) && !sharedNamed.includes(f)), [], "a file can write the shared ledger without naming it to F02");
  assert.doesNotMatch(text("bin/report.mjs"), /\.append\(|governedStoreAppend\(/, "the report, a reader, writes");
  /* crawl and gsc-ingest name it only off their live path (source-integrity no longer names it at all); the four engine-run writers name it always — and F02 refuses it for every real tenant (C9-1) */
  assert.deepEqual(sharedNamed.sort(), ["bin/cost-ledger.mjs", "bin/crawl.mjs", "bin/gsc-ingest.mjs", "bin/paid-provider-controls.mjs", "bin/render-archive.mjs", "bin/replay-crawl.mjs"]);
  for (const f of ["bin/crawl.mjs", "bin/gsc-ingest.mjs", "bin/source-integrity.mjs"]) assert.match(readFileSync(join(REPO, f), "utf8"), /RESOURCES\.costLedger\(ownLedgerRef\(\)\)/, `${f}'s live path does not name its own ledger`);
});

test("C9-2b · THE RECORDER'S OWN LAYER (in-process): no declared ledger → refused before the connector; a test run never writes the real data repository; the hook writes once", () => {
  const W = declaredWorld({ secondTenantOrigins: ["https://fixture-world.invalid"], secondTenantLedger: false });
  try {
    const env = W.envWith();
    const calls = [];
    const exits = [];
    const hooks = [];
    const make = (tenantId, e = env) => runCost({ entryPoint: "bin/x.mjs", scope: { tenantId, writeScope: { scopeType: "TENANT", tenantId } }, permission: { mayWrite: true }, auditRepo: REPO, write: (w) => { calls.push(w); return { outcome: "COMMITTED" }; }, env: e, onExit: (fn) => hooks.push(fn), exit: (c) => { exits.push(c); return undefined; }, log: () => {} });
    /* a tenant with no declared ledger: refused (exit 3) by the recorder itself, before any connector can be held */
    const attempt = (...a) => { try { return { got: make(...a), threw: null }; } catch (e) { return { got: "threw", threw: e?.name ?? "Error" }; } };
    assert.deepEqual([attempt(SECOND_FIXTURE_TENANT).got, exits, hooks.length], [undefined, [3], 0], "a tenant with no declared ledger was not refused by the recorder");
    /* the real data repository, in a verified test run: refused — a test never writes a real tenant's ledger */
    const realTenant = declaredTenantLedgers()[0].tenantId;
    exits.length = 0;
    assert.deepEqual([attempt(realTenant, process.env).got, exits], [undefined, [3]], "a test run would have written the real data repository's ledger");
    /* the fixture tenant: one entry through the boundary, counted requests, once */
    exits.length = 0;
    const rc = make(FIXTURE_TENANT);
    const c = rc.metered({ kind: "PUBLIC_SITE", fetch: async () => "ok" });
    c.fetch("https://fixture-world.invalid/1"); c.fetch("https://fixture-world.invalid/2");
    assert.equal(hooks.length, 1);
    hooks[0](0); hooks[0](0);
    assert.equal(calls.length, 1, "the exit hook wrote more than once");
    assert.deepEqual([calls[0].entry.run_kind, calls[0].entry.scope.tenantId, calls[0].entry.providerCalls.total], ["connector-run", FIXTURE_TENANT, 2], "the entry handed to the entry point's write");
    assert.ok(String(calls[0].path).split("\\").join("/").endsWith(`tenancy/${TENANT_LEDGER_DIR}/${FIXTURE_TENANT.slice(7)}.jsonl`), `the entry is not aimed at the tenant's own ledger: ${calls[0].path}`);
    /* covered: the entry point wrote its own entry; the hook writes none */
    const rc2 = make(FIXTURE_TENANT);
    rc2.covered("own");
    hooks.at(-1)(0);
    assert.equal(calls.length, 1, "the hook wrote beside the run's own entry");
  } finally { W.cleanup(); }
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
