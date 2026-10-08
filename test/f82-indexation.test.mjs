/**
 * F82 · REAL INDEXATION LEARNING (acceptance _handoffs 25c7f49, RR-92).
 *
 * Every expected state below is written by hand from its fixture. Nothing here writes to the production trail (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { indexState, indexingChecks, summariseIndexation, MISSING, NOTICE } from "../src/page/indexation.mjs";
import { readClientIndexation } from "../src/page/indexation-evidence.mjs";
import { readClientDecay, NO_RECORDED_DECAY_EVIDENCE } from "../src/page/content-decay-evidence.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const win = (impressions) => ({ windowStart: "2026-08-15", windowEnd: "2026-09-12", impressions, ref: "obs:w" });
const NOT_INDEXED = (on) => ({ state: "NOT_INDEXED", on, ref: "insp:1" });

/* ================= C1 — index state from observed owned evidence ================= */

test("C1 · exactly one state: OBSERVED_INDEXED only with a recorded impression; OBSERVED_NOT_INDEXED only from a recorded inspection; UNKNOWN otherwise", () => {
  const seen = indexState({ pageId: "a", observation: win(3), queries: 4 });
  assert.equal(seen.state, "OBSERVED_INDEXED");
  assert.deepEqual(seen.observed, { windowStart: "2026-08-15", windowEnd: "2026-09-12", impressions: 3, ref: "obs:w" });
  assert.equal(indexState({ pageId: "b", inspection: NOT_INDEXED("2026-09-20") }).state, "OBSERVED_NOT_INDEXED");
  /* the most recent dated observation decides */
  assert.equal(indexState({ pageId: "c", observation: win(3), inspection: NOT_INDEXED("2026-09-20") }).state, "OBSERVED_NOT_INDEXED", "a later not-indexed record did not supersede the window");
  assert.equal(indexState({ pageId: "d", observation: win(3), inspection: NOT_INDEXED("2026-08-01") }).state, "OBSERVED_INDEXED", "an earlier not-indexed record overrode a later observation");
  /* an inspection without a ref is not recorded evidence */
  assert.equal(indexState({ pageId: "e", inspection: { state: "NOT_INDEXED", on: "2026-09-20", ref: "" } }).state, "UNKNOWN");
});

/* ================= C2 — indexable is not indexed ================= */

test("C2 · FIRING CONTROL: absence or zero impressions is UNKNOWN — never 'not indexed'; an indexable page with no observation is UNKNOWN — never indexed", () => {
  const absent = indexState({ pageId: "a", observation: null, indexability: "CONSISTENT" });
  assert.equal(absent.state, "UNKNOWN", "an indexable page with no observation became indexed");
  assert.equal(absent.indexability, "CONSISTENT", "indexability did not travel beside the state");
  const zero = indexState({ pageId: "b", observation: win(0) });
  assert.equal(zero.state, "UNKNOWN", "zero impressions became 'not indexed'");
  assert.deepEqual(zero.missing, [MISSING.OBSERVATION]);
  for (const s of [absent, zero, indexState({ pageId: "c", observation: win(9) })]) assert.equal(s.notice, "INDEXABLE ≠ INDEXED");
  assert.equal(NOTICE, "INDEXABLE ≠ INDEXED");
});

/* ================= C3 — dated, never promised ================= */

test("C3 · every observed state carries its window and source; nothing predicts or promises indexing", () => {
  assert.equal(indexState({ pageId: "a", observation: { ...win(3), windowEnd: "not-a-date" } }).state, "UNKNOWN", "an undated window gave a state");
  const s = indexState({ pageId: "a", observation: win(3) });
  assert.equal(s.observed.windowEnd, "2026-09-12");
  const code = readFileSync(join(REPO, "src/page/indexation.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  assert.doesNotMatch(code, /will be indexed|expected to index|predict|forecast/i, "F82 predicts or promises indexing");
  assert.equal(indexingChecks([s])[0].ref, "F82:obs:w:2026-08-15..2026-09-12", "the supplied check lost its window");
});

/* ================= C4 — owned is not public ================= */

test("C4 · every state is labelled OWNED_SEARCH_CONSOLE; queries are counted, and a page with no recorded query row is NOT OBSERVED — never zero", () => {
  const a = indexState({ pageId: "a", observation: win(3), queries: null });
  assert.equal(a.sourceClass, "OWNED_SEARCH_CONSOLE");
  assert.equal(a.queriesObserved, null, "unrecorded queries became a count");
  assert.equal(indexState({ pageId: "b", observation: win(3), queries: 2 }).queriesObserved, 2);
  assert.deepEqual(summariseIndexation([a]).queriesObserved, { NOT_OBSERVED: 1 });
  const keys = new Set();
  (function walk(o) { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { keys.add(k); walk(v); } })(summariseIndexation([a]));
  for (const k of keys) assert.doesNotMatch(k, /demand|public|independent|category/i, `owned evidence is labelled as ${k}`);
});

/* ================= C5 — it supplies the missing indexing fact ================= */

test("C5 · OBSERVED_INDEXED → a CLEAR check for F43; OBSERVED_NOT_INDEXED → BLOCKED; UNKNOWN → nothing", () => {
  const checks = indexingChecks([
    indexState({ pageId: "i", observation: win(3) }),
    indexState({ pageId: "n", inspection: NOT_INDEXED("2026-09-20") }),
    indexState({ pageId: "u" }),
  ]);
  assert.deepEqual(checks.map((c) => [c.pageId, c.state]), [["i", "CLEAR"], ["n", "BLOCKED"]], "an UNKNOWN page supplied a check");
});

test("REAL · the client's owned evidence: every page carries one state and its window; F43's missing technical fact is supplied — its missing age is not", () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const r = readClientIndexation({ tenantId, resolve, inspections: [] });
  assert.equal(r.fault, null, r.bound);
  assert.ok(r.summary.population > 0, "EMPTY real population");
  for (const s of r.states) {
    assert.ok(["OBSERVED_INDEXED", "UNKNOWN"].includes(s.state), "a real page was OBSERVED_NOT_INDEXED with no inspection recorded");
    if (s.state === "OBSERVED_INDEXED") assert.ok(s.observed.windowStart && s.observed.windowEnd && s.observed.ref);
    else assert.ok(s.missing.length > 0);
  }
  assert.ok((r.summary.state.OBSERVED_INDEXED ?? 0) > 0, "no real page observed — the supply would prove nothing");
  /* measured count-only (RR-92 work): not one recorded owned query-page row maps to this client's pages — so none is a count of zero */
  assert.deepEqual(r.summary.queriesObserved, { NOT_OBSERVED: r.summary.population }, "an unrecorded query count became zero");
  const before = readClientDecay({ tenantId, resolve, decayEvidence: NO_RECORDED_DECAY_EVIDENCE });
  const after = readClientDecay({ tenantId, resolve, decayEvidence: { ...NO_RECORDED_DECAY_EVIDENCE, indexing: r.indexingChecks } });
  const technical = (x) => x.assessments.filter((a) => a.missing.some((m) => m.startsWith("technical:"))).length;
  /* RR-223 (F31 Amendment 1, C9): the client's population now also holds the pages its newer declared crawl observed; those carry no
   * recorded indexing evidence, so F82 holds them UNKNOWN and their technical fact stays missing — exactly those pages, no other. */
  const unknownPages = new Set(r.states.filter((s) => s.state === "UNKNOWN").map((s) => s.pageId));
  const stillMissing = after.assessments.filter((a) => a.missing.some((m) => m.startsWith("technical:")));
  assert.ok(technical(before) > 0 && technical(after) < technical(before), "F82 did not supply F43's missing technical fact");
  assert.deepEqual(stillMissing.map((a) => a.pageId).filter((id) => !unknownPages.has(id)), [], "F82 did not supply the technical fact of a page it observed");
  assert.equal(stillMissing.length, unknownPages.size, "a page F82 holds UNKNOWN gained a technical fact");
  assert.ok(after.assessments.every((a) => a.missing.some((m) => m.startsWith("age:"))), "the missing age was hidden by the indexing supply");
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify(r.summary)} | F43 missing technical ${technical(before)} → ${technical(after)}`);
});

test("C6 · THE ENTRY POINT: in a declared world it prints counts only, with its bound and the notice, and writes nothing; inspections must be passed", () => {
  assert.throws(() => readClientIndexation({ tenantId: "t", resolve: () => null }), /passed explicitly/);
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/page-indexation.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded data only · OWNED Search Console evidence · \d+ page\(s\)/);
    assert.match(ok.stdout, /INDEXABLE ≠ INDEXED/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C6 · the state and its evidence reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/page/indexation.mjs", "src/page/indexation-evidence.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
