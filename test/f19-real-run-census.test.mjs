/**
 * 🔴 RR-135 · F19 · THE REAL POPULATION — the committed records of two real live crawl runs, censused count-only against every
 * clause of F19's frozen acceptance (_handoffs AlmiVisibility_F19_ACCEPTANCE_2026-09-28).
 *
 * GENERIC: the population is DISCOVERED, never listed — every research batch in the data root's RESEARCH store holding a run record of
 * the current crawler (one that records its seed scope, RR-135), each attributed to the subject that declares the batch as a member.
 * Nothing here names a subject, a batch or a site. The runs of RR-135 were declared before their first request (_handoffs 34fff79).
 * The population must hold at least two runs, on at least two tenants and two registered domains, or it FAILS: an empty or
 * single-site population is not a pass. Nothing here prints a host, URL, tenant id or page content.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { DATA_ROOT } from "./helpers/declared-world.mjs";

/* F19_CENSUS_ROOT: a CONTROL run only — a corrupted copy of the data root, to show each clause can fail (test/helpers/f19-census-controls.mjs) */
const ROOT = process.env.F19_CENSUS_ROOT ?? DATA_ROOT;
const roots = JSON.parse(readFileSync(join(ROOT, "roots.json"), "utf8"));
const attachments = JSON.parse(readFileSync(join(ROOT, "tenancy", "attachments.json"), "utf8")).attachments;
const research = roots.stores.find((s) => s.store === "RESEARCH");
const jsonl = (f) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

/** Every batch holding a run of the CURRENT crawler (its record carries seedScope), sorted, with the subject that declares it. */
export function discoverRuns(root = ROOT) {
  const store = join(root, research.path);
  return readdirSync(store, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
    .filter((batch) => jsonl(join(store, batch, "crawl.jsonl")).some((r) => r.record_type === "crawl_run" && r.seedScope))
    .map((batch) => ({ batch, subject: roots.subjects.find((s) => (s.members ?? []).some((m) => m.resourceKind === "RESEARCH_BATCH" && m.resourceRef === batch))?.subjectId ?? null }));
}
const RUNS = discoverRuns();
/* the registered domain: the last two labels of the host (enough to tell two unrelated sites apart; no public-suffix list is needed for it) */
const domainOf = (origin) => new URL(origin).hostname.split(".").slice(-2).join(".");

test("F19 · REAL · the population: at least two runs of the current crawler, on at least two tenants and two registered domains", () => {
  assert.ok(RUNS.length >= 2, `${RUNS.length} run(s) — an empty or single-run population is not a pass`);
  assert.equal(RUNS.filter((r) => r.subject === null).length, 0, "a run's batch is declared by no subject");
  const tenants = new Set(RUNS.map((r) => attachments.find((a) => a.resourceKind === "RESEARCH_BATCH" && a.resourceRef === r.batch)?.tenantId));
  const domains = new Set(RUNS.flatMap((r) => load(r).origins.map(domainOf)));
  assert.ok(tenants.size >= 2, "every run is on one tenant — genericness is unproved");
  assert.ok(domains.size >= 2, "every run is on one registered domain — genericness is unproved");
  console.log(`[F19 REAL population] runs ${RUNS.length} · subjects ${new Set(RUNS.map((r) => r.subject)).size} · tenants ${tenants.size} · registered domains ${domains.size}`);
});

function load({ batch, subject }) {
  const dir = join(ROOT, research.path, batch);
  assert.ok(existsSync(dir), `the batch of a declared real run is absent`);
  const records = jsonl(join(dir, "crawl.jsonl"));
  const ledger = jsonl(join(dir, "ledger.jsonl"));
  const seedList = readFileSync(join(dir, "seeds.txt"), "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
  const runs = records.filter((r) => r.record_type === "crawl_run");
  const obs = records.filter((r) => r.record_type === "observation");
  const subj = roots.subjects.find((s) => s.subjectId === subject);
  const site = subj.connectors.find((c) => c.kind === "PUBLIC_SITE");
  const origins = site.reaches.filter((x) => x.resourceKind === "SITE_ORIGIN").map((x) => new URL(x.resourceRef).origin);
  return { dir, records, ledger, seedList, runs, obs, subj, site, origins };
}

for (const [i, R] of RUNS.entries()) {
  const label = `run ${i + 1}`;
  test(`F19 · REAL ${label} · the committed record of a real live run exists, once, and is never empty`, () => {
    const d = load(R);
    assert.equal(d.runs.length, 1, "exactly one run record per declared run");
    /* a LIVE record: a dry run issues nothing and carries dryRun: true; this one issued requests and kept their pacing */
    assert.notEqual(d.runs[0].dryRun, true, "the record is of a dry run");
    assert.ok(d.runs[0].requestsIssued + d.runs[0].robotsRequestsIssued >= 1 && d.runs[0].pacing?.gaps >= 1, "the record is not of a live run");
    assert.ok(d.seedList.length >= 1, "a run with no seed");
    assert.equal(d.runs[0].seedPoolSize, d.seedList.length, "the run did not read the batch's own seeds");
    assert.equal(d.runs[0].urlsRequested, d.seedList.length);
    assert.ok(d.obs.length >= 1, "an empty population is not a pass");
    console.log(`[F19 REAL ${label}] seeds ${d.seedList.length} · observations ${d.obs.length} · requests ${d.runs[0].requestsIssued} + robots ${d.runs[0].robotsRequestsIssued} · truncations ${d.runs[0].truncations} · refusals ${d.runs[0].refusals} · pacing gaps ${d.runs[0].pacing.gaps}, fastest ${d.runs[0].pacing.fastestGapMs.toFixed(1)} ms, breaches ${d.runs[0].pacing.breaches} · redirect hops ${d.runs[0].redirects?.hopsFollowed} · money ${d.ledger[0]?.money?.amount === null ? "NOT MEASURED" : "RECORDED"} · provider calls ${d.ledger[0]?.providerCalls?.total}`);
  });

  test(`F19 · REAL ${label} · PAGES: no more pages per run or per host than the declared caps`, () => {
    const { runs: [run], obs } = load(R);
    const fetched = obs.filter((o) => !o.value.skipped).length;
    assert.equal(fetched, run.urlsFetched);
    assert.ok(run.urlsFetched <= run.capacity && run.capacity <= run.maxUrlsPerRun, "more pages than the declared per-run cap");
    for (const n of Object.values(run.perHostRequests)) assert.ok(n <= run.maxRequestsPerHost, "more requests to one host than the declared cap");
  });

  test(`F19 · REAL ${label} · DEPTH: declared 0, and every page read was a seed — no link was followed`, () => {
    const { runs: [run], obs, seedList } = load(R);
    assert.equal(run.maxDepth, 0);
    const seeds = new Set(seedList);
    assert.equal(obs.filter((o) => !seeds.has(o.value.requested_url)).length, 0, "a page beyond the declared depth was read");
  });

  test(`F19 · REAL ${label} · RESPONSE SIZE: no body over the declared cap stored whole; truncations counted`, () => {
    const { runs: [run], obs } = load(R);
    assert.equal(run.maxResponseBytes, 2 * 1024 * 1024);
    for (const o of obs) {
      assert.ok(o.value.bytes <= run.maxResponseBytes, "a body beyond the size cap was stored");
      if (o.value.bytes === run.maxResponseBytes) assert.equal(o.value.truncated, true, "a body at the cap is not marked truncated");
    }
    assert.equal(run.truncations, obs.filter((o) => o.value.truncated).length);
  });

  test(`F19 · REAL ${label} · RATE: every request start, robots.txt first, at least the declared interval after the last`, () => {
    const { runs: [run] } = load(R);
    const p = run.pacing;
    assert.equal(p.intervalMs, run.requestIntervalMs);
    assert.equal(p.starts[0].kind, "robots", "robots.txt was not the first request");
    assert.equal(p.gaps, run.requestsIssued + run.robotsRequestsIssued - 1, "a request is missing from the pacing record");
    assert.equal(p.breaches, 0, "two requests started closer than the declared interval");
    assert.ok(p.fastestGapMs >= run.requestIntervalMs);
    assert.equal(p.ok, true);
  });

  test(`F19 · REAL ${label} · TIMEOUT: declared, and no request ran past it`, () => {
    const { runs: [run], obs } = load(R);
    assert.equal(run.requestTimeoutMs, 15000);
    for (const o of obs.filter((x) => !x.value.skipped)) assert.ok(o.value.error === "timeout" || (Number.isFinite(o.value.timing_ms) && o.value.timing_ms <= run.requestTimeoutMs), "a request ran past its timeout");
  });

  test(`F19 · REAL ${label} · ROBOTS: read first for the one host and obeyed; refusals counted`, () => {
    const { runs: [run], obs } = load(R);
    assert.equal(run.robotsRequestsIssued, Object.keys(run.perHostRequests).length);
    for (const o of obs.filter((x) => !x.value.skipped)) assert.equal(o.value.robotsState, "ALLOWED", "a page was fetched without robots allowing it");
    assert.equal(run.refusals, obs.filter((o) => o.value.skipped).length);
  });

  test(`F19 · REAL ${label} · SCOPE: only the declared tenant's declared site was read, through the F02 route`, () => {
    const d = load(R);
    for (const o of d.obs) assert.ok(d.origins.includes(new URL(o.value.requested_url).origin), "a resource not declared for the tenant was read");
    for (const o of d.obs) if (o.value.final_url) assert.ok(d.origins.includes(new URL(o.value.final_url).origin), "a redirect led off the declared site");
    const batchTenant = attachments.find((a) => a.resourceKind === "RESEARCH_BATCH" && a.resourceRef === R.batch)?.tenantId;
    for (const origin of d.origins) assert.equal(attachments.find((a) => a.resourceKind === "SITE_ORIGIN" && new URL(a.resourceRef).origin === origin)?.tenantId, batchTenant, "the batch and the site belong to different tenants");
    assert.equal(d.runs[0].seedScope?.seedsOutside, 0);
  });

  test(`F19 · REAL ${label} · PUBLIC ONLY: no login, no credential, no payment, no paid provider; money NOT MEASURED, never 0`, () => {
    const d = load(R);
    assert.equal(d.site.credential, null, "the site connector carries a credential");
    assert.equal(d.runs[0].cost.provider, "self-operated-crawler");
    assert.equal(d.runs[0].cost.amount, null, "an unmeasured cost was written as a number");
    assert.equal(d.ledger.length, 1);
    assert.equal(d.ledger[0].money.amount, null, "money written as a number nobody measured");
    assert.equal(d.ledger[0].money.amountState, "UNKNOWN");
    assert.equal(d.ledger[0].providerCalls.total, d.runs[0].requestsIssued + d.runs[0].robotsRequestsIssued, "the ledger does not count every request");
    assert.deepEqual(Object.keys(d.ledger[0].providerCalls.perProvider), ["self-operated-crawler"], "a provider other than the self-operated crawler was called");
  });

  test(`F19 · REAL ${label} · RECORD: count-only, no page content in the committed record, and no body in the data repository`, () => {
    const d = load(R);
    for (const f of ["requestsIssued", "robotsRequestsIssued", "urlsFetched", "truncations", "refusals", "seedPoolSize"]) assert.ok(Number.isInteger(d.runs[0][f]), `the run record lacks ${f}`);
    const text = readFileSync(join(d.dir, "crawl.jsonl"), "utf8");
    assert.doesNotMatch(text, /<html|<body|<!doctype/i, "the committed record carries page content");
    for (const r of d.records) assert.equal(Object.hasOwn(r.value ?? {}, "body"), false);
    assert.deepEqual(readdirSync(d.dir).sort(), ["crawl.jsonl", "ledger.jsonl", "seeds.txt"], "something other than the governed records landed in the batch");
  });
}
