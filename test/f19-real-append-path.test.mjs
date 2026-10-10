/**
 * 🔴 RR-133 · F19 · THE REAL GOVERNED APPEND PATH, END TO END, WITH NO EGRESS.
 *
 * RR-105 spent a GREEN because the live run's governed append refused records nobody had tried to keep. RR-106 added a preflight that
 * BUILDS the binary's append descriptors, and a test that EXECUTES a look-alike — never the binary's own. This file closes that gap: it
 * runs the ACTUAL bin/crawl.mjs live path — its scope decision, its preflight, its connector, its pacer, its three governed appends, its
 * collection verdict — in a declared world, with the audit store confined by the verified test context and every network primitive
 * replaced in-process by test/helpers/no-egress-preload.mjs (counted; nothing leaves the machine). It also proves the run REFUSES before
 * its first request when a prerequisite fails, by a measured count of 0 network calls. The production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { AUDIT_STORE_OVERRIDE_ENV, AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT } from "../src/governance/governed-run.mjs";
import { declaredWorld, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN, FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;
const BATCH = "f19-rehearsal-batch";
const SEEDS = ["/a", "/b", "/c"].map((p) => `${FIXTURE_SUBJECT_ORIGIN}${p}`);

/** A declared world whose fixture subject declares ONE research batch, attached to the fixture tenant, holding SEEDS. */
function rehearsalWorld({ declareBatch = true } = {}) {
  const WORLD = declaredWorld({ extra: declareBatch ? [["RESEARCH_BATCH", BATCH]] : [] });
  const roots = JSON.parse(readFileSync(join(WORLD.root, "roots.json"), "utf8"));
  if (declareBatch) {
    const s = roots.subjects.find((x) => x.subjectId === FIXTURE_SUBJECT);
    s.members = [...s.members, { resourceKind: "RESEARCH_BATCH", resourceRef: BATCH }];
    writeFileSync(join(WORLD.root, "roots.json"), JSON.stringify(roots, null, 2) + "\n");
  }
  const research = roots.stores.find((x) => x.store === "RESEARCH");
  const dir = join(WORLD.root, research.path, BATCH);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "seeds.txt"), `# rehearsal seeds\n${SEEDS.join("\n")}\n`);
  return { WORLD, batchDir: dir };
}

/** Spawn the REAL binary under no-egress, with the audit store confined; returns the result, the network counts and the confined events. */
function runBin(WORLD, args, { mode }) {
  mkdirSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT), { recursive: true });
  const storeDir = mkdtempSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT, "f19-append-"));
  const log = join(storeDir, "egress.json");
  try {
    const r = spawnSync(process.execPath, ["--import", PRELOAD, ...WORLD.argv(["bin/crawl.mjs", ...args])], {
      cwd: REPO, encoding: "utf8", timeout: 120000,
      env: { ...WORLD.envWith(), [AUDIT_STORE_OVERRIDE_ENV]: storeDir, [AUDIT_RUN_ENV]: `f19-append-${Date.now()}`, NO_EGRESS_MODE: mode, NO_EGRESS_LOG: log },
    });
    const counts = existsSync(log) ? JSON.parse(readFileSync(log, "utf8")) : null;
    const files = [];
    const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) (e.isDirectory() ? walk(join(d, e.name)) : e.name === "events.jsonl" && files.push(join(d, e.name))); };
    walk(storeDir);
    const events = files.flatMap((f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
    return { r, counts, events };
  } finally { rmSync(storeDir, { recursive: true, force: true }); }
}
/* the page-body corpus is confined too: a rehearsal never writes into the engine's own local corpus */
const corpusArg = (dir) => `--corpus=${dir}`;
/* RR-243 (restated, F78 Amendment 1 C8): a live run now also needs --confirm — a run that cannot record its cost makes no request */
const LIVE = ["--research-batch=" + BATCH, `--subject=${FIXTURE_SUBJECT}`, "--live", "--i-have-the-owners-green", "--confirm"];

test("REAL APPEND PATH · the binary's live run, no egress: robots first, every page fetched in-process, all THREE governed appends COMMIT into the batch, KEPT", () => {
  const { WORLD, batchDir } = rehearsalWorld();
  try {
    mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
    const corpus = mkdtempSync(join(REPO, ".test-scratch", "f19-corpus-"));
    /* the engine's own corpus is git-ignored: absent in a fresh checkout (CI), present locally — either state must be left exactly as found */
    const ENGINE_CORPUS = join(REPO, "runs", "crawl", "corpus");
    const corpusState = () => (existsSync(ENGINE_CORPUS) ? readdirSync(ENGINE_CORPUS).length : "ABSENT");
    const before = corpusState();
    const { r, counts, events } = runBin(WORLD, [...LIVE, corpusArg(corpus)], { mode: "fixture" });
    assert.equal(corpusState(), before, "the rehearsal wrote into the engine's own corpus");
    /* RR-227 (F19 A1 · E): a research-batch run keeps its bodies IN THE BATCH — the --corpus directory is no longer written (it was
     * SEEDS.length files before; restated) */
    assert.equal(readdirSync(corpus).length, 0, "a research-batch run wrote a body into a corpus directory, not into its batch");
    rmSync(corpus, { recursive: true, force: true });
    assert.equal(r.status, 0, r.stdout.slice(-1500) + r.stderr.slice(-1500));
    assert.ok(existsSync(join(batchDir, "bodies.jsonl")), `no body store in the batch: ${r.stdout.slice(-1500)}`);
    const bodies = readFileSync(join(batchDir, "bodies.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(bodies.filter((b) => b.record_type === "page_body" && typeof b.body === "string").length, SEEDS.length, "a page body was not stored in the batch");
    assert.match(r.stdout, /PREFLIGHT\s+: PASS/);
    assert.deepEqual([counts.robots, counts.pages], [1, SEEDS.length], "the run did not read robots.txt once and each seed once");
    const kept = readFileSync(join(batchDir, "crawl.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const types = kept.reduce((m, x) => ((m[x.record_type] = (m[x.record_type] ?? 0) + 1), m), {});
    assert.equal(types.observation, SEEDS.length, "an observation was not kept");
    assert.equal(types.crawl_run, 1, "the run record was not kept");
    for (const t of ["response_headers", "page_links", "publication_date_claims"]) assert.equal(types[t], SEEDS.length, `${t} was not kept for every page`);
    const run = kept.find((x) => x.record_type === "crawl_run");
    for (const f of ["requestsIssued", "robotsRequestsIssued", "urlsFetched", "truncations", "refusals"]) assert.ok(Number.isInteger(run[f]), `the run record lacks ${f}`);
    assert.equal(run.pacing?.ok, true, "the repaired pacer's measurement is missing or breached");
    /* RR-243 (restated, F78 Amendment 1 C9): the cost entry goes to the tenant's OWN declared ledger, never into the batch */
    assert.equal(existsSync(join(batchDir, "ledger.jsonl")), false, "a cost entry was written into the batch");
    const ownLedger = join(WORLD.root, "tenancy", "cost-ledgers", `${FIXTURE_TENANT.slice(7)}.jsonl`);
    const ledger = readFileSync(ownLedger, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.deepEqual(ledger.filter((e) => e.record_type === "cost_entry").map((e) => [e.run_kind, e.scope?.tenantId]), [["crawl", FIXTURE_TENANT]], "the cost entry was not kept, once, in the tenant's own ledger");
    const committed = events.filter((e) => e.eventType === "GOVERNED_WRITE" && e.metadata?.governedWritePhase === "COMMITTED").map((e) => e.action).sort();
    /* RR-227 (F19 A1 · E): the bodies are ONE governed append into the batch (it was one WRITE_CRAWL_BODY per page into the corpus; restated) */
    assert.deepEqual(committed, ["APPEND_CRAWL_BODIES", "APPEND_CRAWL_COST_ENTRY", "APPEND_CRAWL_OBSERVATIONS", "APPEND_CRAWL_RUN_RECORD"], "the four real appends did not each commit through the boundary");
    assert.equal(events.filter((e) => e.eventType === "GOVERNED_WRITE" && e.outcome === "REFUSED").length, 0, "a governed write was refused");
    assert.match(r.stdout, /KEPT/);
  } finally { WORLD.cleanup(); }
});

test("REFUSES BEFORE THE FIRST REQUEST · no owner green, an undeclared batch: each refused with ZERO fetch, DNS or socket calls", () => {
  const a = rehearsalWorld();
  try {
    const { r, counts } = runBin(a.WORLD, ["--research-batch=" + BATCH, `--subject=${FIXTURE_SUBJECT}`, "--live"], { mode: "refuse" });
    assert.notEqual(r.status, 0, "a live run without the owner's green proceeded");
    assert.match(r.stderr + r.stdout, /--live requires --i-have-the-owners-green/);
    assert.deepEqual([counts.fetch, counts.dns, counts.connect], [0, 0, 0], "a network call was made before the refusal");
  } finally { a.WORLD.cleanup(); }
  const b = rehearsalWorld({ declareBatch: false });
  try {
    const { r, counts } = runBin(b.WORLD, LIVE, { mode: "refuse" });
    assert.equal(r.status, 3, `an undeclared batch was not refused by scope: ${r.status}`);
    assert.deepEqual([counts.fetch, counts.dns, counts.connect], [0, 0, 0], "a network call was made before the scope refusal");
    assert.ok(!existsSync(join(b.batchDir, "crawl.jsonl")), "a refused run wrote into the batch");
  } finally { b.WORLD.cleanup(); }
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
