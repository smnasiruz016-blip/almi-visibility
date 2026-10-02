/**
 * 🔴 RR-133 §3 · F19 — THE ZERO-EXTERNAL-REQUEST PREFLIGHT FOR A PLANNED RUN, against the EXACT code and a FRESH batch.
 *
 *   F19_BATCH=<declared batch> F19_SUBJECT=<declared subject> node --test tools/f19-plan-rehearsal.test.mjs
 *   (NOT part of `npm test`: it reads the data root as checked out.) RR-135: generic — any declared subject, any declared batch, any
 *   seed count of at least one; nothing here names a site, a product or a population size.
 *
 * The REAL declarations (a byte copy of the data root as checked out — real tenant, real subject, the fresh batch), the EXACT arguments of
 * the plan, and the ACTUAL bin/crawl.mjs live path, with every network primitive answered in-process (test/helpers/no-egress-preload.mjs)
 * and the audit store confined by the verified test context. Nothing is written to the real data root, the engine's corpus or the
 * production trail. Evidence: runs/audit/f19-plan-preflight-<batch>-<day>.txt (count-only; never overwritten).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, cpSync } from "node:fs";
import { join, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { AUDIT_STORE_OVERRIDE_ENV, AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT } from "../src/governance/governed-run.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { SUBJECT_ROOTS_ENV, DATA_ROOT } from "../test/helpers/declared-world.mjs";
import { MAX_DEPTH } from "../src/crawl/crawler.mjs";
import { REQUEST_INTERVAL_MS, REQUEST_TIMEOUT_MS, MAX_RESPONSE_BYTES } from "../src/crawl/fetcher.mjs";
import { MAX_URLS_PER_RUN, MAX_REQUESTS_PER_HOST } from "../src/crawl/frontier.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;
/* RR-135 · GENERIC: any declared batch of any declared subject — named by the operator, never by this file. */
const BATCH = process.env.F19_BATCH ?? null, SUBJECT = process.env.F19_SUBJECT ?? null;
const lines = [];
const limb = (name, declared, measured, ok) => { lines.push(`${ok ? "PROVED " : "FAILED "} ${name.padEnd(34)} declared: ${declared} · measured: ${measured}`); return ok; };

function realCopy() {
  const root = mkdtempSync(join(tmpdir(), "almi-f19-real-copy-"));
  cpSync(DATA_ROOT, root, { recursive: true, filter: (s) => !s.split(sep).includes(".git") });
  return root;
}
function runBin(root, args, mode) {
  mkdirSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT), { recursive: true });
  const storeDir = mkdtempSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT, "f19-plan-"));
  const log = join(storeDir, "egress.json");
  try {
    const r = spawnSync(process.execPath, ["--import", PRELOAD, "bin/crawl.mjs", ...args], { cwd: REPO, encoding: "utf8", timeout: 300000,
      env: { ...process.env, [SUBJECT_ROOTS_ENV]: root, [AUDIT_STORE_OVERRIDE_ENV]: storeDir, [AUDIT_RUN_ENV]: `f19-plan-${Date.now()}`, NO_EGRESS_MODE: mode, NO_EGRESS_LOG: log } });
    const files = [];
    const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) (e.isDirectory() ? walk(join(d, e.name)) : e.name === "events.jsonl" && files.push(join(d, e.name))); };
    walk(storeDir);
    return { r, counts: existsSync(log) ? JSON.parse(readFileSync(log, "utf8")) : null, events: files.flatMap((f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))) };
  } finally { rmSync(storeDir, { recursive: true, force: true }); }
}

test("F19 PLAN PREFLIGHT · every prerequisite of the one planned run, proved with zero external requests", () => {
  assert.ok(BATCH && SUBJECT, "name the batch and the subject: F19_BATCH=<declared batch> F19_SUBJECT=<declared subject>");
  const resolve = createTenantResolver();
  const decl = readDeclarations();
  const tenant = decl.attachments.find((a) => a.resourceKind === "RESEARCH_BATCH" && a.resourceRef === BATCH)?.tenantId ?? null;
  /* the subject's own declaration: the batch is its member, and every origin its PUBLIC_SITE connector reaches is attached to the batch's tenant */
  const subj = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8")).subjects.find((s) => s.subjectId === SUBJECT) ?? null;
  const member = Boolean(subj?.members.some((m) => m.resourceKind === "RESEARCH_BATCH" && m.resourceRef === BATCH));
  const siteConnector = subj?.connectors.find((c) => c.kind === "PUBLIC_SITE") ?? null;
  const declaredOrigins = (siteConnector?.reaches ?? []).filter((x) => x.resourceKind === "SITE_ORIGIN").map((x) => new URL(x.resourceRef).origin);
  const originsOfTenant = declaredOrigins.filter((o) => decl.attachments.some((a) => a.resourceKind === "SITE_ORIGIN" && new URL(a.resourceRef).origin === o && a.tenantId === tenant)).length;
  const ok = [];
  ok.push(limb("tenant attachment", "the batch is the subject's member, attached to the tenant its declared site belongs to", tenant ? `RESEARCH_BATCH attached · member of the subject: ${member} · declared site origins ${declaredOrigins.length}, of the same tenant ${originsOfTenant}` : "NOT ATTACHED", Boolean(tenant) && member && declaredOrigins.length >= 1 && originsOfTenant === declaredOrigins.length));
  const dBatch = decideForTenant(resolve, tenant, RESOURCES.researchBatch(BATCH));
  ok.push(limb("scope (F02)", "SAME_TENANT_ALLOWED", dBatch.outcome, dBatch.outcome === "SAME_TENANT_ALLOWED"));

  const root = realCopy();
  const store = JSON.parse(readFileSync(join(root, "roots.json"), "utf8")).stores.find((s) => s.store === "RESEARCH");
  const batchDir = join(root, store.path, BATCH);
  const startFiles = readdirSync(batchDir).sort();
  const seeds = readFileSync(join(batchDir, "seeds.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
  const N = seeds.length, HOSTS = new Set(seeds.map((u) => new URL(u).host)).size;
  const onSite = seeds.filter((u) => declaredOrigins.includes(new URL(u).origin)).length;
  ok.push(limb("clean starting state", "the batch holds only seeds.txt, at least one seed", `files: ${startFiles.join(", ")} · seeds ${N} · hosts ${HOSTS}`, startFiles.join() === "seeds.txt" && N >= 1));
  ok.push(limb("seed scope (RR-135)", "every seed on a site origin the subject declares", `${onSite} of ${N}`, onSite === N));

  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const corpus = mkdtempSync(join(REPO, ".test-scratch", "f19-plan-corpus-"));
  const ARGS = [`--research-batch=${BATCH}`, `--tenant=${tenant}`, `--subject=${SUBJECT}`, "--actor=actor:cc", "--live", "--i-have-the-owners-green", `--corpus=${corpus}`];
  try {
    /* 1 · REFUSAL BEFORE THE FIRST REQUEST — no green; an undeclared batch (each in REFUSE mode: any network call would be counted) */
    const noGreen = runBin(root, ARGS.filter((a) => a !== "--i-have-the-owners-green"), "refuse");
    const undeclared = runBin(root, ARGS.map((a) => (a.startsWith("--research-batch=") ? "--research-batch=f19-undeclared-batch-2026-10-02" : a)), "refuse");
    const calls = (c) => (c ? c.fetch + c.dns + c.connect + (c.otherEgress ?? 0) : "NOT MEASURED");
    ok.push(limb("refuses before 1st request: green", "refused, 0 network calls", `exit ${noGreen.r.status} · network calls ${calls(noGreen.counts)}`, noGreen.r.status !== 0 && calls(noGreen.counts) === 0));
    ok.push(limb("refuses before 1st request: scope", "exit 3, 0 network calls", `exit ${undeclared.r.status} · network calls ${calls(undeclared.counts)}`, undeclared.r.status === 3 && calls(undeclared.counts) === 0));
    /* an off-site seed added to the COPY's batch, then restored before the live rehearsal */
    const seedsPath = join(batchDir, "seeds.txt");
    const seedsBytes = readFileSync(seedsPath);
    writeFileSync(seedsPath, Buffer.concat([seedsBytes, Buffer.from("\nhttps://undeclared-origin.invalid/x\n")]));
    const offSite = runBin(root, ARGS, "refuse");
    writeFileSync(seedsPath, seedsBytes);
    ok.push(limb("refuses before 1st request: off-site seed", "exit 3, 0 network calls", `exit ${offSite.r.status} · network calls ${calls(offSite.counts)} · ${/SEED_OUTSIDE_DECLARED_SITE/.test(offSite.r.stderr) ? "SEED_OUTSIDE_DECLARED_SITE" : "no seed-scope refusal"}`, offSite.r.status === 3 && calls(offSite.counts) === 0 && /SEED_OUTSIDE_DECLARED_SITE/.test(offSite.r.stderr)));

    /* 2 · THE EXACT LIVE PATH, IN-PROCESS — the real appends executed into the COPY's fresh batch */
    const live = runBin(root, ARGS, "fixture");
    const out = live.r.stdout;
    ok.push(limb("binary preflight (pre-request)", "PASS, 0 external calls", (out.match(/PREFLIGHT\s+: [^\n]{0,60}/) ?? ["NOT PRINTED"])[0], /PREFLIGHT\s+: PASS/.test(out)));
    const kept = existsSync(join(batchDir, "crawl.jsonl")) ? readFileSync(join(batchDir, "crawl.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const types = kept.reduce((m, x) => ((m[x.record_type] = (m[x.record_type] ?? 0) + 1), m), {});
    const ledger = existsSync(join(batchDir, "ledger.jsonl")) ? readFileSync(join(batchDir, "ledger.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const committed = live.events.filter((e) => e.eventType === "GOVERNED_WRITE" && e.metadata?.governedWritePhase === "COMMITTED").reduce((m, e) => ((m[e.action] = (m[e.action] ?? 0) + 1), m), {});
    const refused = live.events.filter((e) => e.eventType === "GOVERNED_WRITE" && e.outcome === "REFUSED").length;
    for (const t of ["observation", "response_headers", "page_links", "publication_date_claims", "crawl_run"]) ok.push(limb(`placement + write: ${t}`, t === "crawl_run" ? "1 committed" : `${N} committed`, `${types[t] ?? 0} kept`, (types[t] ?? 0) === (t === "crawl_run" ? 1 : N)));
    ok.push(limb("cost-record path", "1 cost entry committed in the batch ledger", `${ledger.filter((e) => e.record_type === "cost_entry").length} kept`, ledger.filter((e) => e.record_type === "cost_entry").length === 1));
    ok.push(limb("writeability of every target", "every governed write COMMITTED, 0 refused", `${JSON.stringify(committed)} · refused ${refused}`, refused === 0 && committed.APPEND_CRAWL_OBSERVATIONS === 1 && committed.APPEND_CRAWL_RUN_RECORD === 1 && committed.APPEND_CRAWL_COST_ENTRY === 1 && committed.WRITE_CRAWL_BODY === N));
    const run = kept.find((x) => x.record_type === "crawl_run") ?? {};
    const p = run.pacing ?? {};
    ok.push(limb("robots.txt first", `${HOSTS} robots request(s), one per host, before its pages`, `robots ${live.counts?.robots} · pages ${live.counts?.pages} · robotsRequestsIssued ${run.robotsRequestsIssued} · first starts ${(p.starts ?? []).slice(0, 1).map((s) => s.kind).join()}`, live.counts?.robots === HOSTS && run.robotsRequestsIssued === HOSTS && p.starts?.[0]?.kind === "robots"));
    ok.push(limb("rate, from request starts", `${REQUEST_INTERVAL_MS} ms minimum, monotonic`, `gaps ${p.gaps} · fastest ${typeof p.fastestGapMs === "number" ? p.fastestGapMs.toFixed(1) : "NOT MEASURED"} ms · breaches ${p.breaches}`, p.ok === true));
    ok.push(limb("run record fields", "seeds, requests, robots, fetched, truncations, refusals", ["seedPoolSize", "requestsIssued", "robotsRequestsIssued", "urlsFetched", "truncations", "refusals"].map((f) => `${f} ${Number.isInteger(run[f]) ? run[f] : "ABSENT"}`).join(" · "), ["seedPoolSize", "requestsIssued", "robotsRequestsIssued", "urlsFetched", "truncations", "refusals"].every((f) => Number.isInteger(run[f]))));
    ok.push(limb("collection verdict", "KEPT", (out.match(/\bKEPT\b[^\n]{0,40}|NOT KEPT[^\n]{0,60}/) ?? ["NOT PRINTED"])[0], /\bKEPT\b/.test(out) && !/NOT KEPT/.test(out)));
    const c = live.counts ?? {};
    const beforeProbe = (c.order ?? []).slice(0, Math.max(0, (c.order ?? []).indexOf("socket")));
    ok.push(limb("pre-request phase: network calls", "0 fetch, 0 DNS before the IPv6 probe (the first network step after the preflight)", `first recorded call: ${(c.order ?? [])[0] ?? "none"} · calls before it: ${beforeProbe.length}`, (c.order ?? [])[0] === "socket" && beforeProbe.length === 0));
    ok.push(limb("external requests (left the machine)", "0", `http/https/tls attempts ${c.otherEgress} · every fetch (${c.fetch}), DNS (${c.dns}) and socket (${c.connect}) call answered in-process`, c.otherEgress === 0 && c.fetch === N + HOSTS && Number.isInteger(c.dns) && Number.isInteger(c.connect)));
    lines.push(`bounds in the code: depth ${MAX_DEPTH} · interval ${REQUEST_INTERVAL_MS} ms · timeout ${REQUEST_TIMEOUT_MS} ms · size ${MAX_RESPONSE_BYTES} bytes · URL caps ${MAX_URLS_PER_RUN}/run, ${MAX_REQUESTS_PER_HOST}/host · retry ≤ 1, network error only`);
    lines.push(`in-process calls of the rehearsal (never external): fetch ${live.counts?.fetch} (robots ${live.counts?.robots}, pages ${live.counts?.pages}) · dns ${live.counts?.dns} · socket ${live.counts?.connect}`);
  } finally { rmSync(corpus, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true }); }
  lines.push(`production trail unchanged: ${trailSha() === TRAIL_BEFORE}`);
  mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
  /* never overwrites an earlier evidence file: one file per batch and day, and a later run of the same day gets its own */
  const day = new Date().toISOString().slice(0, 10);
  let evidence = join(REPO, "runs", "audit", `f19-plan-preflight-${BATCH}-${day}.txt`);
  if (existsSync(evidence)) evidence = evidence.replace(/.txt$/, `-${Date.now()}.txt`);
  writeFileSync(evidence, [`F19 plan preflight · ${new Date().toISOString()} · batch ${BATCH} · count-only`, ...lines, ""].join("\n"));
  console.log(lines.join("\n"));
  assert.ok(ok.every(Boolean), "a prerequisite failed — the run must not be asked for");
  assert.equal(trailSha(), TRAIL_BEFORE, "the production trail was written");
});
