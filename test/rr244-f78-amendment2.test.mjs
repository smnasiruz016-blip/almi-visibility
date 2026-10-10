/**
 * 🔴 RR-244 · F78 ACCEPTANCE AMENDMENT 2 (_handoffs 2e623ff, contract 22fe6b21…) — C8's 'every run', a REQUIREMENT the code was made to meet:
 * a run that passes its scope gate AND carries --confirm writes exactly one cost entry, also when it ends in an error, a refusal by the
 * target or a provider failure; a run in a mode that would open a connector, refused at its scope gate or lacking --confirm, makes no
 * request, writes no cost entry, and its refusal is recorded on the trail; a mode that opens no connector makes no request and writes no
 * cost entry. Every expected answer below is written by hand. Spawned runs live in a DISPOSABLE declared world (RR-177), make no network
 * request outside this machine (test/helpers/net-sentinel.mjs counts and refuses every one) and write only the confined audit store,
 * each run into a store of its own that this file reads and then removes.
 *
 *   A2-1  the census: every connector entry point the F03 census finds, read against the Amendment 2 text (connector mode, a durable
 *         scope gate in that mode, the recorder straight after the gate, no refusal before the gate but a usage one)
 *   A2-2  REAL PATH, every entry point: a connector-mode run REFUSED AT ITS SCOPE GATE — no request, no cost entry, a REFUSAL on the trail
 *   A2-3  REAL PATH, every entry point: a connector-mode run WITHOUT --confirm — no request, no cost entry, and the write law's refusal of
 *         its cost entry on the trail
 *   A2-4  REAL PATH: modes that open no connector — no request, no cost entry; render-audit and mobile-audit offline write NOTHING to the trail
 *   A2-5  REAL PATH: a confirmed run that ends in a refusal by the target writes exactly one cost entry, the request counted
 *   A2-6  REAL PATH: a confirmed subject-tool run completes and writes its one cost entry; no subject tool names an undeclared REPO
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

import { liveRunCostCensus, liveAmendment2Census } from "../tools/run-cost-census.mjs";
import { TENANT_LEDGER_DIR } from "../src/cost/run-cost.mjs";
import { declaredWorld, FIXTURE_TENANT, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN } from "./helpers/declared-world.mjs";
import { SUBJECT_PACKAGE } from "../subjects/almi-oet/package.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const SENTINEL = pathToFileURL(join(REPO, "test", "helpers", "net-sentinel.mjs")).href;
const UNDECLARED = "tenant:000000000000000000000000000a2bad";
const BATCH = "rr244-a2", EVIDENCE = "rr244-a2-ev";
const S = `--subject=${FIXTURE_SUBJECT}`, P = `--product=${SUBJECT_PACKAGE.subjectId}`;
const jsonl = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

/* Each connector entry point in its CONNECTOR mode, with arguments that pass every usage check — written by hand; A2-1 proves the set
 * is exactly the census population. */
const CONNECTOR_MODE = Object.freeze([
  ["bin/collect-public-questions.mjs", [S, `--research-batch=${BATCH}`]],
  ["bin/crawl.mjs", [`--research-batch=${BATCH}`, S, "--live", "--i-have-the-owners-green"]],
  ["bin/gsc-ingest.mjs", ["--property=sc-domain:fixture-world.invalid", S]],
  ["bin/mobile-audit.mjs", [`--research-batch=${BATCH}`, S, "--live-render", "--i-have-the-owners-green"]],
  ["bin/quote-match.mjs", [P]],
  ["bin/render-audit.mjs", [`--research-batch=${BATCH}`, S, "--live-render", "--i-have-the-owners-green"]],
  ["bin/render-collect.mjs", [`--source-batch=${BATCH}`, `--evidence-batch=${EVIDENCE}`, S, "--live", "--i-have-the-owners-green"]],
  ["bin/source-integrity.mjs", [P, "--live"]],
  ["subjects/almi-oet/tools/build-corpus.mjs", ["--out", ".test-scratch/rr244-a2-corpus"]],
  ["subjects/almi-oet/tools/nursing-chain.mjs", [P]],
]);

/** A world in which the fixture subject also declares a question source and the two research batches these runs name. */
function world(extra = []) {
  const W = declaredWorld({ extra: [["RESEARCH_BATCH", BATCH], ["RESEARCH_BATCH", EVIDENCE], ...extra] });
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  const sub = reg.subjects.find((s) => s.subjectId === FIXTURE_SUBJECT);
  sub.members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: BATCH }, { resourceKind: "RESEARCH_BATCH", resourceRef: EVIDENCE });
  sub.connectors.push({ connectorId: "questions", kind: "QUESTION_SOURCE_API", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: FIXTURE_SUBJECT_ORIGIN }] });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2) + "\n");
  const research = reg.stores.find((s) => s.store === "RESEARCH").path;
  for (const b of [BATCH, EVIDENCE]) mkdirSync(join(W.root, research, b), { recursive: true });
  writeFileSync(join(W.root, research, BATCH, "seeds.txt"), `${FIXTURE_SUBJECT_ORIGIN}/a\n`);
  return { ...W, research: join(W.root, research) };
}
const ledgerDir = (W) => join(W.root, "tenancy", TENANT_LEDGER_DIR);
const ledgerOf = (W, t = FIXTURE_TENANT) => join(ledgerDir(W), `${t.slice(7)}.jsonl`);

/** Spawn one run (async: a fixture server may live in this process) in its own confined audit store; read that store, then remove it. */
function run(W, file, args, { tenant = FIXTURE_TENANT, confirm = false, env = {} } = {}) {
  const nonce = `rr244-${randomBytes(5).toString("hex")}`;
  const sentinelFile = join(W.root, `sentinel-${nonce}.json`);
  const argv = ["--import", SENTINEL, file, ...args, `--tenant=${tenant}`, "--actor=actor:cc", ...(confirm ? ["--confirm"] : [])];
  return new Promise((resolve) => {
    const c = spawn(process.execPath, argv, { cwd: REPO, env: { ...W.envWith(), ALMIVISIBILITY_AUDIT_RUN: nonce, NET_SENTINEL_FILE: sentinelFile, ...env } });
    let out = "";
    c.stdout.on("data", (d) => { out += d; });
    c.stderr.on("data", (d) => { out += d; });
    const timer = setTimeout(() => c.kill(), 180_000);
    c.on("close", (status) => {
      clearTimeout(timer);
      const runDir = join(REPO, ".test-scratch", "audit", `run-${nonce}`);
      let events = [];
      if (existsSync(runDir)) for (const w of readdirSync(runDir)) events = events.concat(jsonl(join(runDir, w, "events.jsonl")));
      rmSync(runDir, { recursive: true, force: true }); // only the store this run minted
      const net = existsSync(sentinelFile) ? JSON.parse(readFileSync(sentinelFile, "utf8")).total : null;
      resolve({ status, out, events, net });
    });
  });
}
const scopeRefusals = (r) => r.events.filter((e) => e.eventType === "REFUSAL" && e.outcome === "REFUSED");
const costRefusals = (r) => r.events.filter((e) => e.action === "APPEND_RUN_COST_ENTRY" && e.outcome === "REFUSED");

/* ================= A2-1 ================= */

test("A2-1 · the census: every connector entry point against the Amendment 2 text — a durable gate in its connector mode, the recorder straight after it, no refusal before it but a usage one", () => {
  const rows = liveAmendment2Census();
  assert.deepEqual(rows.map((r) => r.file), liveRunCostCensus().map((r) => r.file), "Amendment 2's population is not the C8 census population");
  assert.deepEqual(rows.map((r) => r.file), CONNECTOR_MODE.map(([f]) => f), "the hand-written connector-mode table is not the census population");
  /* written by hand: each entry point's connector mode and the kinds of every way it can end before its gate */
  const expected = {
    "bin/collect-public-questions.mjs": ["ALWAYS", ["SEAM", "USAGE"]],
    "bin/crawl.mjs": ["live", ["USAGE", "USAGE", "CONFINEMENT", "CONFINEMENT"]],
    "bin/gsc-ingest.mjs": ['arg("source") === null', []],
    "bin/mobile-audit.mjs": ["LIVE", ["USAGE", "USAGE"]],
    "bin/quote-match.mjs": ["ALWAYS", ["USAGE"]],
    "bin/render-audit.mjs": ["LIVE", ["USAGE", "USAGE"]],
    "bin/render-collect.mjs": ["ALWAYS", ["USAGE"]],
    "bin/source-integrity.mjs": ["live", ["CONFINEMENT", "CONFINEMENT", "USAGE"]],
    "subjects/almi-oet/tools/build-corpus.mjs": ["ALWAYS", ["CONFINEMENT"]],
    "subjects/almi-oet/tools/nursing-chain.mjs": ["ALWAYS", ["USAGE"]],
  };
  for (const r of rows) {
    const [mode, exits] = expected[r.file];
    assert.equal(r.connectorMode, mode, `${r.file}: connector mode`);
    assert.equal(r.gateDurable, true, `${r.file}: its scope gate is not durable in its connector mode (governed: ${r.governed})`);
    assert.equal(r.recorderFollowsGate, true, `${r.file}: something can end a gate-passed run before its recorder exists`);
    assert.deepEqual(r.preGateExits.map((x) => x.kind), exits, `${r.file}: the ways it can end before its gate`);
    assert.equal(r.ok, true, r.file);
  }
  console.log(`  census (count-only): ${rows.length} entry points · connector mode ALWAYS ${rows.filter((r) => r.connectorMode === "ALWAYS").length} · by flag ${rows.filter((r) => r.connectorMode !== "ALWAYS").length} · pre-gate exits ${rows.reduce((n, r) => n + r.preGateExits.length, 0)} (REFUSAL 0)`);
});

/* ================= A2-2 / A2-3 ================= */

test("A2-2 · REAL PATH, every entry point: a connector-mode run refused at its scope gate makes no request, writes no cost entry, and its refusal is on the trail", async () => {
  const W = world();
  try {
    for (const [file, args] of CONNECTOR_MODE) {
      const r = await run(W, file, args, { tenant: UNDECLARED, confirm: true });
      assert.equal(r.status, 3, `${file}: ${r.out.slice(-400)}`);
      assert.match(r.out, /TENANT SCOPE REFUSED/, `${file}: not refused at its scope gate`);
      assert.equal(r.net, 0, `${file}: a request was made`);
      assert.ok(scopeRefusals(r).length >= 1, `${file}: the scope-gate refusal is not on the trail`);
      assert.equal(existsSync(ledgerDir(W)), false, `${file}: a cost entry was written for a gate-refused run`);
    }
  } finally { W.cleanup(); }
});

test("A2-3 · REAL PATH, every entry point: a connector-mode run without --confirm makes no request, writes no cost entry, and the refusal of its cost entry is on the trail", async () => {
  const W = world();
  try {
    for (const [file, args] of CONNECTOR_MODE) {
      const r = await run(W, file, args, { confirm: false });
      assert.equal(r.net, 0, `${file}: a request was made without --confirm`);
      assert.equal(scopeRefusals(r).length, 0, `${file}: refused at its scope gate — the proof never reached the --confirm decision: ${r.out.slice(-300)}`);
      assert.equal(costRefusals(r).length, 1, `${file}: the refusal of its cost entry is not on the trail exactly once: ${r.out.slice(-300)}`);
      assert.deepEqual(jsonl(ledgerOf(W)), [], `${file}: a cost entry was written without --confirm`);
    }
  } finally { W.cleanup(); }
});

/* ================= A2-4 ================= */

test("A2-4 · REAL PATH: modes that open no connector make no request and write no cost entry; render-audit and mobile-audit offline write nothing to the trail", async () => {
  const W = world();
  try {
    for (const file of ["bin/render-audit.mjs", "bin/mobile-audit.mjs"]) {
      for (const confirm of [false, true]) {
        const r = await run(W, file, [`--research-batch=${BATCH}`, S], { confirm });
        assert.match(r.out, /mode OFFLINE/, `${file}: the offline mode was not reached: ${r.out.slice(-300)}`);
        assert.deepEqual([r.net, r.events.length], [0, 0], `${file} offline (confirm ${confirm}): a request or a trail event`);
      }
      /* CONTROL: the same entry point refused at its scope gate offline is silent too — and in its connector mode it is not (A2-2) */
      const g = await run(W, file, [`--research-batch=${BATCH}`, S], { tenant: UNDECLARED, confirm: true });
      assert.deepEqual([g.status, g.net, g.events.length], [3, 0, 0], `${file} offline, gate-refused: ${g.out.slice(-300)}`);
    }
    for (const [file, args] of [["bin/crawl.mjs", [`--research-batch=${BATCH}`, S]], ["bin/source-integrity.mjs", [P]]]) {
      const r = await run(W, file, args, { confirm: false });
      assert.equal(r.net, 0, `${file}: its no-connector mode made a request`);
      assert.equal(r.events.some((e) => /COST_ENTRY/.test(e.action ?? "")), false, `${file}: its no-connector mode tried to write a cost entry`);
    }
    assert.equal(existsSync(ledgerDir(W)), false, "a no-connector mode wrote a cost entry");
    assert.equal(existsSync(join(W.research, BATCH, "ledger.jsonl")), false, "a dry crawl wrote a cost entry into its batch");
  } finally { W.cleanup(); }
});

/* ================= A2-5 ================= */

test("A2-5 · REAL PATH: a confirmed run that ends in a refusal by the target (403) writes exactly one cost entry, the request counted", async () => {
  const W = world();
  try {
    const r = await run(W, "test/helpers/rr243-run-cost-child.mjs", ["--deliberate", "--mode=target-refusal"], { confirm: true }); // RR-247: the child is gated
    assert.equal(r.status, 3, r.out);
    assert.match(r.out, /REFUSED BY THE TARGET \(403\)/);
    const es = jsonl(ledgerOf(W));
    assert.equal(es.length, 1, "not exactly one cost entry");
    assert.deepEqual([es[0].outcome, es[0].providerCalls.total, es[0].scope.tenantId], ["ENDED (exit 3)", 1, FIXTURE_TENANT]);
    assert.equal(r.net, 0);
  } finally { W.cleanup(); }
});

/* ================= A2-6 ================= */

test("A2-6 · REAL PATH: a confirmed subject-tool run (build-corpus) completes and writes its one cost entry, every request counted", async () => {
  const pages = { "/sitemap-index.xml": null, "/sitemap-0.xml": null, "/nurse": "<html><body>nurse</body></html>", "/register/a": "<html><body>a</body></html>" };
  const server = createServer((req, res) => {
    const base = `http://127.0.0.1:${server.address().port}`;
    if (req.url === "/sitemap-index.xml") { res.end(`<sitemapindex><sitemap><loc>${base}/sitemap-0.xml</loc></sitemap></sitemapindex>`); return; }
    if (req.url === "/sitemap-0.xml") { res.end(`<urlset><url><loc>${base}/nurse</loc></url><url><loc>${base}/register/a</loc></url></urlset>`); return; }
    if (pages[req.url]) { res.end(pages[req.url]); return; }
    res.statusCode = 404; res.end("");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const W = world([["SITE_ORIGIN", origin]]);
  const out = `.test-scratch/rr244-a2-corpus-${randomBytes(4).toString("hex")}`;
  try {
    /* the world's subject package site reaches this machine's fixture origin, declared to the fixture tenant */
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    const sub = reg.subjects.find((s) => s.subjectId === SUBJECT_PACKAGE.subjectId);
    sub.connectors.find((c) => c.kind === "PUBLIC_SITE").reaches = [{ resourceKind: "SITE_ORIGIN", resourceRef: origin }];
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2) + "\n");
    const r = await run(W, "subjects/almi-oet/tools/build-corpus.mjs", ["--site", origin, "--out", out, "--concurrency", "1", "--spacing-ms", "0"], { confirm: true });
    assert.equal(r.status, 0, `the confirmed subject-tool run did not complete: ${r.out.slice(-600)}`);
    assert.doesNotMatch(r.out, /ReferenceError/);
    assert.ok(existsSync(join(REPO, out, "corpus-manifest.json")), "the corpus manifest was not written");
    const es = jsonl(ledgerOf(W));
    assert.equal(es.length, 1, "not exactly one cost entry");
    assert.deepEqual([es[0].outcome, es[0].providerCalls.total, es[0].run_ref.startsWith("subjects/almi-oet/tools/build-corpus.mjs · started ")], ["COMPLETED", 4, true]);
    assert.equal(r.net, 0, "a request left this machine");
  } finally { server.close(); W.cleanup(); rmSync(join(REPO, out), { recursive: true, force: true }); }
});

test("A2-6b · no subject tool names a REPO it does not declare (the RR-243 latent ReferenceError)", () => {
  const dir = join(REPO, "subjects");
  const tools = readdirSync(dir).flatMap((s) => (existsSync(join(dir, s, "tools")) ? readdirSync(join(dir, s, "tools")).filter((f) => f.endsWith(".mjs")).map((f) => join(dir, s, "tools", f)) : []));
  assert.ok(tools.length >= 2, "the subject tools were not found");
  for (const f of tools) {
    const t = readFileSync(f, "utf8");
    if (/\bREPO\b/.test(t.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""))) assert.match(t, /\b(?:const|let)\s+REPO\s*=/, `${f} uses REPO without declaring it`);
  }
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
