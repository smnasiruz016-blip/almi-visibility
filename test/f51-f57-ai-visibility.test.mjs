/**
 * F51 · F52 · F53 · F56 · F57 · AI visibility from filed observations (acceptances _handoffs AlmiVisibility_F51/F52/F53/F56/F57_ACCEPTANCE_
 * 2026-10-19.md; RR-291, light proof; owner answer Q1 CHANGED). Fixtures with firing controls; REAL on the client's batch (count-only).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { admitObservation, perSystem, shareOfVoice, influenceGraph, gapsOf, admitDescription, actionsForGaps, ROUTES, NOT_MEASURED } from "../src/research/ai-visibility.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const o = (id, system, mentions, cited, extra = {}) => ({ observationId: id, prompt: "p", system, date: "2026-10-19", sampling: "one answer", method: "hand filing", citedUrls: cited, route: ROUTES.HAND_FILED, mentionsBrand: mentions, ...extra });
const obs = [o("1", "A", true, ["https://brand.example/x"]), o("2", "A", false, ["https://other.example/y"]), o("3", "B", true, ["https://other.example/z"], { mentionsCompetitors: ["Rival"], needId: "n1" })];
const brandDomains = ["brand.example"];

test("F51 C1 + C3 · an observation is admitted only whole, with its route; one without its date or method is refused, named", () => {
  assert.equal(admitObservation(obs[0]).state, "ADMITTED");
  assert.deepEqual(admitObservation({ ...obs[0], date: "" }).missing, ["date"]);
  assert.deepEqual(admitObservation({ ...obs[0], method: "" }).missing, ["method"]);
  /* FIRING CONTROL: a route that is neither the client's own connection nor a hand filing is refused */
  assert.match(admitObservation({ ...obs[0], route: "ENGINE_BROWSER_ROUTE" }).missing[0], /^route/);
  assert.equal(admitObservation({ ...obs[0], route: ROUTES.CLIENT_AI_CONNECTION }).state, "ADMITTED");
});

test("F51 C2 · mention, omission and citation counted per system, each over its own sample", () => {
  assert.deepEqual(perSystem(obs, { brandDomains }), { A: { sample: 2, mentioned: 1, omitted: 1, cited: 1 }, B: { sample: 1, mentioned: 1, omitted: 0, cited: 0 } });
});

test("F52 C1–C3 · share over the filed samples with the sample size, worded for that sample only; no sample is NOT MEASURED", () => {
  const s = shareOfVoice(obs, { brand: "Brand", competitors: ["Rival"] });
  assert.deepEqual([s.sample, s.shares], [3, { Brand: 67, Rival: 33 }]);
  assert.match(s.line, /^in 3 filed answer\(s\) from A, B .* — this sample only$/);
  assert.ok(!/\b(all|every|always|universal)\b/i.test(s.line), "worded as universal");
  assert.equal(shareOfVoice([], { brand: "Brand" }).state, NOT_MEASURED);
});

test("F53 C1–C3 · every link from an observation; an unobserved link is absent; a graph prints", () => {
  const gaps = gapsOf(obs, { brandDomains });
  assert.deepEqual(gaps.map((g) => g.kind), ["OMITTED", "NOT_CITED"]);
  const g = influenceGraph(obs, gaps, [{ gapId: gaps[0].gapId, action: "KEEP" }]);
  assert.deepEqual(g.kinds, { PROMPT: 1, ANSWER: 3, MENTION: 2, CITATION: 3, SOURCE: 2, GAP: 2, ACTION: 1 });
  /* FIRING CONTROL: no observation, no node — and a gap or action pointing at no observed answer is dropped */
  assert.deepEqual([influenceGraph([], [{ gapId: "x", observationId: "nope" }], [{ gapId: "x", action: "KEEP" }]).nodes], [0]);
});

test("F56 C1–C2 · a description is kept only with its observation id and an uncertainty label", () => {
  const ids = new Set(["1"]);
  assert.equal(admitDescription({ observationId: "1", description: "an online practice site", uncertainty: "MEDIUM" }, ids).state, "ADMITTED");
  assert.equal(admitDescription({ observationId: "9", description: "x", uncertainty: "LOW" }, ids).reason, "NO_OBSERVATION_BEHIND_IT");
  assert.equal(admitDescription({ observationId: "1", description: "x" }, ids).reason, "NO_UNCERTAINTY_LABEL");
});

test("F57 C1–C3 · each action names its gap and comes from F35's own rule; no gap, no action", () => {
  const gaps = gapsOf(obs, { brandDomains });
  const cov = { n1: { needId: "n1", coverage: "FULL", reason: "r", measurement_key: "planning_coverage:1", pages: [{ pageId: "https://brand.example/x" }] } };
  const acts = actionsForGaps(gaps, { coverageOf: (id) => cov[id] ?? null, needOf: (id) => (cov[id] ? { needId: id, pageCandidate: id, questions: 1, tier: "OBSERVED", centralSupported: true } : null) });
  assert.deepEqual(acts.map((a) => [a.gapId, a.action]), [[gaps[0].gapId, "HOLD"], [gaps[1].gapId, "KEEP"]]);
  assert.ok(acts.every((a) => /F35/.test(a.rule)));
  assert.match(acts[1].reason, /FULL_COVERAGE_AND_NO_NEEDED_GAP/);
  assert.deepEqual(actionsForGaps([], {}), []);
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "planning.jsonl"));
test("REAL · the client's batch: no observation filed by hand or through its own AI connection — NOT MEASURED; the browser-route answers are refused for their route", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=ai-visibility", "--subject=almi-oet", `--research-batch=${BATCH}`, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /F51 observations\s+filed \d+ · offered from the browser route \d+ · admitted \d+ · refused \d+/);
  assert.match(r.stdout, /F52 share\s+(share of AI mentions: NOT MEASURED|in \d+ filed answer)/);
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).slice(1, 7).map((l) => l.trim()).join(" | ")}`);
});
