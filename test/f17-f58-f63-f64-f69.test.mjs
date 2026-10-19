/**
 * F17 · Second-search and information gaps, F58 · Competitor discovery, F63 · Local rank, F64 · NAP consistency, F69 · Benchmarks (acceptances
 * _handoffs AlmiVisibility_F17/F58/F63/F64/F69_ACCEPTANCE_2026-10-19.md; RR-291, light proof). Fixtures with firing controls; REAL on the
 * client's own stored records (count-only).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { inferFollowUps, admitSequence, opportunitiesOf, competitorsOf, inferDifficulty, napOf, napConsistency, benchmark, INFERRED } from "../src/research/follow-ups-and-competitors.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const cov = (needId, combo, pages) => ({ needId, combination: { p: combo }, measurement_key: `planning_coverage:${needId}`, pages: pages.map((pageId) => ({ pageId })) });

test("F17 C1–C3 · follow-ups INFERRED with their records; observed sequences their own kind; absence alone is never an opportunity", () => {
  const f = inferFollowUps([cov("a", "x", ["/1"]), cov("b", "x", ["/1"]), cov("c", "x", ["/2"]), cov("d", "x", []), cov("e", "y", ["/9"])]);
  assert.deepEqual(f.filter((x) => x.after === "a").map((x) => [x.next, x.gap]), [["c", false], ["d", true]]);
  assert.ok(f.every((x) => x.kind === INFERRED && x.inferredFrom.length === 2));
  assert.ok(!f.some((x) => x.after === "e" || x.next === "e"), "a follow-up across combinations");
  /* FIRING CONTROLS */
  assert.equal(admitSequence({ source: "s", bound: "b", date: "2026-10-19", questions: ["q1", "q2"] }).state, "KEPT");
  assert.deepEqual(admitSequence({ source: "s", questions: ["q1", "q2"] }).missing, ["bound", "date"]);
  assert.deepEqual(opportunitiesOf([{ topic: "t", competitorHasIt: true }]).map((o) => o.state), ["DROPPED"]);
  assert.deepEqual(opportunitiesOf([{ topic: "t", ownNeedEvidence: ["need:1"] }]).map((o) => o.state), ["OPPORTUNITY"]);
});

test("F58 C1–C2 · competitors only from the declaration or observed result surfaces, each sourced; difficulty INFERRED with its method", () => {
  const c = competitorsOf({ declared: [{ domain: "rival.example", source: "the client's declaration" }, { domain: "nosource.example" }], observedSurfaces: [{ state: "OBSERVED", observation_id: "o1", results: [{ domain: "own.example" }, { domain: "seen.example" }] }, { state: "BLOCKED", results: [{ domain: "x.example" }] }], ownDomains: ["own.example"] });
  assert.deepEqual(c.competitors.map((x) => [x.domain, x.from]), [["rival.example", "DECLARED"], ["seen.example", "OBSERVED_RESULT_SURFACE"]]);
  assert.equal(c.refused.length, 1);
  assert.deepEqual([inferDifficulty("oet").difficulty, inferDifficulty("oet for nurses").difficulty, inferDifficulty("oet nursing pakistan fee").difficulty], ["HIGHER", "MEDIUM", "LOWER"]);
  assert.equal(inferDifficulty("x").label, INFERRED);
});

test("F64 C1–C3 · NAP from the client's own pages with sources; a mismatch names both; no address is NOT APPLICABLE", () => {
  const p = (tel) => `<script type="application/ld+json">{"@type":"Organization","name":"Brand","telephone":"${tel}"}</script>`;
  const same = napConsistency([...napOf(p("+1 555 0100"), "/a"), ...napOf(p("+15550100"), "/b")]);
  assert.equal(same.phone.state, "CONSISTENT");
  assert.match(same.address, /^NOT APPLICABLE/);
  /* FIRING CONTROL: a different phone on one page is a mismatch naming both pages */
  const diff = napConsistency([...napOf(p("+15550100"), "/a"), ...napOf(p("+15550199"), "/b")]);
  assert.deepEqual([diff.phone.state, diff.phone.pairs[0].a.source, diff.phone.pairs[0].b.source], ["MISMATCH", "/a", "/b"]);
});

test("F69 C1–C3 · peers only declared with stored evidence; sample and limits printed; fewer than 3 is \"no benchmark\"", () => {
  const peer = (d, s) => ({ domain: d, from: "DECLARED", score: s, evidence: `e:${d}` });
  const b = benchmark({ clientScore: 80, peers: [peer("a", 70), peer("b", 90), peer("c", 60), { domain: "o", from: "OBSERVED_RESULT_SURFACE", score: 99, evidence: "e" }] });
  assert.deepEqual([b.state, b.sample, b.median], ["BENCHMARK", 3, 70]);
  assert.match(b.line, /limits:/);
  /* FIRING CONTROL: two peers is no benchmark */
  assert.equal(benchmark({ clientScore: 80, peers: [peer("a", 70), peer("b", 90)] }).state, "NO_BENCHMARK");
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "planning.jsonl"));
const run = (part) => spawnSync(process.execPath, ["bin/visibility-parts.mjs", `--part=${part}`, "--subject=almi-oet", `--research-batch=${BATCH}`, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
test("REAL · F17 C1, F58 C1–C2, F63 C1–C2, F64 C1, F69 C1 on the client's own stored records", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const out = Object.fromEntries(["follow-ups", "competitors", "local-rank", "nap"].map((p) => { const r = run(p); assert.equal(r.status, 0, `${p}: ${r.stderr}`); return [p, r.stdout]; }));
  assert.match(out["follow-ups"], /INFERRED follow-ups \d+ \(each names the two coverage records/);
  assert.match(out.competitors, /F58 difficulty\s+\d+ observed queries, each INFERRED/);
  assert.match(out.competitors, /F69 benchmark\s+(no benchmark — \d+ declared|client \d+ beside)/);
  /* F63: every rank record carries its declared location, surface, date and query — and a BLOCKED one never reads as a rank */
  const ranks = (out["local-rank"].match(/\n {4}\S.*/g) ?? []).map((l) => l.trim());
  assert.ok(ranks.length >= 1, "EMPTY real population: no rank record");
  assert.ok(ranks.every((l) => /^\S.* · ".+" · \S+ · \d{4}-\d{2}-\d{2} · (#\d+ of \d+|NOT_IN_THE_RESULTS_SHOWN|BLOCKED [A-Z_]+)$/.test(l)), ranks.join(" | "));
  assert.ok(ranks.filter((l) => /BLOCKED/.test(l)).every((l) => !/#\d/.test(l)));
  assert.match(out.nap, /own pages read\s+\d+ · NAP statements \d+/);
  console.log(`  REAL: ${out["follow-ups"].split(/\r?\n/)[1].trim()} | ${out.competitors.split(/\r?\n/)[1].trim()} | F63 ${ranks.join(" ; ")} | ${out.nap.split(/\r?\n/).slice(1).map((l) => l.trim()).join(" ; ")}`);
});
