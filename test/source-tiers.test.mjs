/**
 * §623 — THE SOURCE-TIER LAYER, EXERCISED ON REAL RECORDS FOR THE FIRST TIME.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { sourceTierOfFact, sourceRecordFromFact, rankSources, tierCensus } from "../src/evidence/source-tiers.mjs";
import { makeSource, SOURCE_TIERS } from "../src/evidence/records.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { detectConflicts } from "../src/facts/lifecycle.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const realFacts = async () => (await loadRegistry(`${REPO}products/almi-oet/facts`, "almi-oet")).records;

// 🔴 34 since 13 Sep 2026 (item 50): two records verified that day, so two sources carry 13 Sep.
// 🔴 33 since the item-50 reopen (13 Sep 2026).
test("🔴 REAL: all 33 verified facts become Source records at the OFFICIAL tier, each dated and reviewed", async () => {
  const verified = (await realFacts()).filter((f) => f.verificationState === "VERIFIED");
  assert.equal(verified.length, 33);
  const sources = verified.map(sourceRecordFromFact);
  assert.deepEqual(tierCensus(sources), { OFFICIAL: 33, OWNED_GSC_ANALYTICS: 0, VERIFIED_ALMIWORLD: 0, REPUTABLE_SECONDARY: 0, COMPETITOR_COMMUNITY: 0, AGENT_INFERENCE: 0 });
  for (const s of sources) {
    assert.match(s.retrieved_at, /^2026-09-1[23]$/, `${s.source_id} carries no verification date`);
    assert.match(s.reviewer, /^human:/);
  }
});

test("🔴 REAL: the tier layer ORDERS real records of different tiers — facts first, our own analytics next, an inference last — whatever the input order", async () => {
  const facts = (await realFacts()).filter((f) => f.verificationState === "VERIFIED").map(sourceRecordFromFact);
  const gsc = makeSource({ source_id: "gsc-property:sc-domain:almiworld.com", source_url: "sc-domain:almiworld.com", source_tier: "OWNED_GSC_ANALYTICS", retrieved_at: "2026-09-12" });
  const draft = makeSource({ source_id: "draft:REC-NOINDEX-CV-GUIDE", source_url: "runs/audit/recommendations.jsonl#REC-NOINDEX-CV-GUIDE", source_tier: "AGENT_INFERENCE", retrieved_at: "2026-09-12" });
  const ranked = rankSources([draft, gsc, ...facts.slice().reverse()]);
  assert.deepEqual(ranked.map((s) => s.source_tier), [...Array(33).fill("OFFICIAL"), "OWNED_GSC_ANALYTICS", "AGENT_INFERENCE"]);
  // STABLE: equal tiers keep input order — the rule states no preference between two official sources.
  assert.deepEqual(ranked.slice(0, 33).map((s) => s.source_id), facts.slice().reverse().map((s) => s.source_id));
});

test("🔴 an unrecognised tier THROWS rather than defaulting — a tier silently read as OFFICIAL would outrank everything", () => {
  assert.throws(() => sourceTierOfFact({ verification: { sourceTier: "PRETTY_OFFICIAL" } }), /unknown source tier/);
  assert.equal(sourceTierOfFact({}), "AGENT_INFERENCE", "a fact with no tier must fall to the LOWEST tier");
  assert.deepEqual([...SOURCE_TIERS].slice(0, 1), ["OFFICIAL"]);
});

test("🔴 one reader of a fact's tier: the conflict detector ranks by the SAME rule — shown on two real facts given a disagreement", async () => {
  const [a, b] = (await realFacts()).filter((f) => f.verificationState === "VERIFIED");
  // The same claim, two values, and one source demoted in words — the detector must prefer the OFFICIAL one.
  const official = { ...a, id: "real-official", value: { ...a.value, value: "one" } };
  const lower = { ...a, id: "real-secondary", value: { ...a.value, value: "two" }, verification: { ...a.verification, sourceTier: "REPUTABLE_SECONDARY" } };
  const [c] = detectConflicts([lower, official]);
  assert.equal(c.suggestedAuthority, "real-official");
  assert.deepEqual(c.records.map((r) => r.tier).sort(), ["OFFICIAL", "REPUTABLE_SECONDARY"]);
  // And two OFFICIAL sources that disagree are a TIE — the tier rule cannot settle them, which is exactly UNKNOWN.
  const tie = detectConflicts([{ ...a, id: "o1", value: { ...a.value, value: "x" } }, { ...a, id: "o2", value: { ...a.value, value: "y" } }]);
  assert.equal(tie[0].suggestedAuthority, null);
  assert.ok(b, "a second real fact exists");
});
