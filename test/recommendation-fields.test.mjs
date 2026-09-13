/**
 * 🔴 ITEM 51 — PRIORITY, CONFIDENCE AND COST: COMPUTED FROM STORED EVIDENCE, NEVER CHOSEN,
 * AND EACH ABLE TO SAY UNKNOWN.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { targetPageId } from "../src/evidence/ids.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const rec = (id) => ({ record_type: "draft_recommendation", recommendation_id: id, title: id, status: "RECOMMENDED — NOT APPROVED — NOT APPLIED", finding: `${id} finding` });
const issueOn = (id, url, evidence = ["obs-a"]) => ({ record_type: "issue", issue_id: id, target_page_id: targetPageId(url), verdict: "FAIL", evidence });
const pull = (rows) => ({ record_type: "observation", observation_id: "pull-1", method: "gsc.searchAnalytics.query:page-rows", observed_at: "2026-09-12T00:00:00Z", value: { dataState: "COMPLETE", startDate: "2026-08-15", endDate: "2026-09-12", rows } });
const obs = (id) => ({ record_type: "observation", observation_id: id, method: "crawl.fetch", observed_at: "2026-09-12T00:00:00Z", collector: "bin/crawl.mjs", value: {} });

test("🔴 PRIORITY is DERIVED from measured impressions on the pages the evidence names — and ranked, not scored", () => {
  const f = computeRecommendationFields({
    recommendations: [rec("A"), rec("B")],
    links: [
      { record_type: "recommendation_evidence", recommendation_id: "A", issues: ["i1"], observations: [], sources: [] },
      { record_type: "recommendation_evidence", recommendation_id: "B", issues: ["i2"], observations: [], sources: [] },
    ],
    records: [issueOn("i1", "https://e.example.com/x"), issueOn("i2", "https://e.example.com/y"), obs("obs-a"), pull([{ url: "https://e.example.com/x", impressions: 5 }, { url: "https://e.example.com/y", impressions: 50 }])],
    ledger: [],
  });
  const by = Object.fromEntries(f.map((x) => [x.recommendation_id, x]));
  assert.deepEqual([by.B.priority.rank, by.A.priority.rank], [1, 2]);
  assert.match(by.A.priority.basis, /5 search impressions on 1 of the 1 pages/);
});

test("🔴 PRIORITY says UNKNOWN when there is nothing measured to derive it from — no link, no page, or no joinable impressions", () => {
  const f = computeRecommendationFields({
    recommendations: [rec("NOLINK"), rec("NOPAGE"), rec("NOJOIN")],
    links: [
      { record_type: "recommendation_evidence", recommendation_id: "NOPAGE", issues: [], observations: ["obs-a"], sources: [] },
      { record_type: "recommendation_evidence", recommendation_id: "NOJOIN", issues: ["i9"], observations: [], sources: [] },
    ],
    records: [issueOn("i9", "https://e.example.com/unseen"), obs("obs-a"), pull([{ url: "https://e.example.com/other", impressions: 3 }])],
    ledger: [],
  });
  for (const x of f) assert.equal(x.priority.state, "UNKNOWN", `${x.recommendation_id} was given a priority with nothing to derive it from`);
});

test("🔴 CONFIDENCE is the WEAKEST tier of the evidence, never higher — and UNKNOWN when any linked id cannot be found", () => {
  const src = { record_type: "source", source_id: "s1", source_tier: "OFFICIAL" };
  const ok = computeRecommendationFields({ recommendations: [rec("A")], links: [{ record_type: "recommendation_evidence", recommendation_id: "A", issues: [], observations: ["obs-a"], sources: ["s1"] }], records: [src, obs("obs-a")], ledger: [] })[0];
  assert.equal(ok.confidence.weakestTier, "VERIFIED_ALMIWORLD", "an official source lifted the confidence above its weakest input");
  const missing = computeRecommendationFields({ recommendations: [rec("A")], links: [{ record_type: "recommendation_evidence", recommendation_id: "A", issues: [], observations: ["gone"], sources: ["s1"] }], records: [src], ledger: [] })[0];
  assert.equal(missing.confidence.state, "UNKNOWN");
  assert.match(missing.confidence.reason, /1 of 2 linked evidence ids cannot be found/);
});

test("🔴 COST comes from the ledger entries that produced the evidence — UNKNOWN with a lower bound when a run was never costed", () => {
  const link = { record_type: "recommendation_evidence", recommendation_id: "A", issues: [], observations: ["obs-a", "obs-b"], sources: [] };
  const entry = { entry_id: "run-1", sources: ["obs-a"], money: { amountState: "ZERO_BY_TARIFF", amount: 0 }, providerCalls: { state: "MEASURED", total: 4 }, founderTime: { state: "MEASURED", seconds: 2 } };
  const partial = computeRecommendationFields({ recommendations: [rec("A")], links: [link], records: [obs("obs-a"), obs("obs-b")], ledger: [entry] })[0].cost.ofEvidence;
  assert.equal(partial.providerCalls.state, "UNKNOWN");
  assert.equal(partial.providerCalls.lowerBound, 4);
  const full = computeRecommendationFields({ recommendations: [rec("A")], links: [{ ...link, observations: ["obs-a"] }], records: [obs("obs-a")], ledger: [entry] })[0].cost.ofEvidence;
  assert.deepEqual([full.money, full.providerCalls, full.founderSeconds], [{ state: "MEASURED", value: 0 }, { state: "MEASURED", value: 4 }, { state: "MEASURED", value: 2 }]);
  const none = computeRecommendationFields({ recommendations: [rec("A")], links: [], records: [], ledger: [entry] })[0];
  assert.equal(none.cost.ofEvidence.money.state, "UNKNOWN");
  assert.equal(none.cost.toApply.state, "UNKNOWN");
});

test("🔴 no number in the module is chosen: it holds no weight, threshold or score constant", () => {
  const code = readFileSync(`${REPO}src/report/recommendation-fields.mjs`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const numbers = [...code.matchAll(/(?<![\w.])(\d+(\.\d+)?)(?![\w.])/g)].map((m) => m[1]).filter((n) => !["0", "1"].includes(n));
  assert.deepEqual(numbers, [], `a chosen number sits in the derivation: ${numbers.join(", ")}`);
});

/* ---- the real recommendations ------------------------------------------- */

const read = (d) => readdirSync(`${REPO}${d}`).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(`${REPO}${d}/${f}`).readAll());

test("🔴 REAL: all three recommendations carry all six — two ranked by measured impressions, one honestly UNKNOWN", () => {
  const audit = read("runs/audit");
  const fields = computeRecommendationFields({
    recommendations: audit.filter((r) => r.record_type === "draft_recommendation"),
    links: audit.filter((r) => r.record_type === "recommendation_evidence"),
    records: [...audit, ...read("runs/evidence"), ...read("runs/crawl")],
    ledger: createJsonlStore(`${REPO}runs/cost/ledger.jsonl`).readAll(),
  });
  assert.equal(fields.length, 3);
  const by = Object.fromEntries(fields.map((x) => [x.recommendation_id, x]));
  for (const f of fields) {
    for (const k of ["priority", "evidence", "confidence", "cost", "status", "reason"]) assert.ok(f[k], `${f.recommendation_id} has no ${k}`);
    assert.equal(f.evidence.resolved, f.evidence.linked, `${f.recommendation_id}: a linked evidence id is missing`);
    assert.equal(f.cost.toApply.state, "UNKNOWN");
  }
  assert.equal(by["REC-NOINDEX-CV-GUIDE"].priority.rank, 1);
  assert.match(by["REC-NOINDEX-CV-GUIDE"].priority.basis, /^484 search impressions on 134 of the 134 pages/);
  assert.equal(by["REC-ROBOTS-CORRIDOR"].priority.rank, 2);
  assert.match(by["REC-ROBOTS-CORRIDOR"].priority.basis, /^219 search impressions on 106 of the 106 pages/);
  assert.equal(by["REC-AI-CRAWLER-BLOCK"].priority.state, "UNKNOWN");
  for (const f of fields) assert.equal(f.confidence.state, "DERIVED");
  assert.equal(by["REC-ROBOTS-CORRIDOR"].cost.ofEvidence.providerCalls.lowerBound, 9);
  assert.match(by["REC-AI-CRAWLER-BLOCK"].cost.ofEvidence.money.reason, /no ledger entry lists any of the 16 records/);
});

test("🔴 REAL: the committed report SHOWS all six fields for a real recommendation", () => {
  const html = readFileSync(`${REPO}runs/report/index.html`, "utf8");
  assert.match(html, /<section id="recommendations">/);
  assert.match(html, /<th>priority<\/th><th>evidence<\/th><th>confidence<\/th><th>cost<\/th><th>status<\/th><th>reason<\/th>/);
  assert.match(html, /REC-NOINDEX-CV-GUIDE[\s\S]*?<strong>1 of 2<\/strong>/);
  assert.match(html, /weakest source tier <strong>VERIFIED_ALMIWORLD<\/strong>/);
  assert.match(html, /to carry it out:<\/strong> <span class="lbl lbl-UNKNOWN">UNKNOWN<\/span>/);
});
