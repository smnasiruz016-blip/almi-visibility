/**
 * 🔴 FIRST-PARTY EVIDENCE DEMOTION (RR-80 §3; acceptance _handoffs 00f20db) — the owner: "an observation made by us, about our
 * own product, is first-party evidence and may never outrank an independent source or corroborate itself."
 * Proved on the production ranking (rankSources), classification (isIndependentSourceTier) and census (tierIndependenceCensus).
 * Constructed, non-sensitive source records only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { SOURCE_TIERS, FIRST_PARTY_TIERS, INDEPENDENT_SOURCE_TIERS, isIndependentSourceTier, tierRank, makeSource } from "../src/evidence/records.mjs";
import { rankSources, tierIndependenceCensus, sourceTierOfFact, INDEPENDENCE_CENSUS_BOUND } from "../src/evidence/source-tiers.mjs";

const src = (tier, i) => makeSource({ source_id: `demo-${tier}-${i}`, source_url: `https://demotion-${i}.invalid/`, source_tier: tier, publisher: null, retrieved_at: "2026-09-28" });

test("E1 · a first-party source never outranks ANY independent source, in either input order", () => {
  assert.ok(FIRST_PARTY_TIERS.length >= 1 && INDEPENDENT_SOURCE_TIERS.length >= 3, "the populations are not empty");
  for (const fp of FIRST_PARTY_TIERS) {
    for (const ind of INDEPENDENT_SOURCE_TIERS) {
      assert.ok(tierRank(ind) < tierRank(fp), `${fp} ranks at or above ${ind}`);
      assert.equal(rankSources([src(fp, 1), src(ind, 2)])[0].source_tier, ind, `first-party first when listed first (${ind})`);
      assert.equal(rankSources([src(ind, 3), src(fp, 4)])[0].source_tier, ind, `first-party first when listed second (${ind})`);
    }
  }
  // CONTROL: ranking still discriminates among independents, and keeps input order within a tier
  assert.equal(rankSources([src("COMPETITOR_COMMUNITY", 5), src("OFFICIAL", 6)])[0].source_tier, "OFFICIAL");
  const same = rankSources([src("OFFICIAL", 7), src("OFFICIAL", 8)]);
  assert.deepEqual(same.map((s) => s.source_id), ["demo-OFFICIAL-7", "demo-OFFICIAL-8"]);
});

test("E2 · a first-party tier is NEVER independent support, so it can never corroborate itself", () => {
  for (const fp of FIRST_PARTY_TIERS) assert.equal(isIndependentSourceTier(fp), false, `${fp} classified independent`);
  for (const ind of INDEPENDENT_SOURCE_TIERS) assert.equal(isIndependentSourceTier(ind), true, `CONTROL: ${ind} is independent`);
  assert.equal(isIndependentSourceTier("AGENT_INFERENCE"), false, "an inference is not independent support");
  assert.throws(() => isIndependentSourceTier("MADE_UP"), /unknown source tier/);
  // the numeric fact tier 2 ("official secondary") is an INDEPENDENT source and is no longer filed under the first-party tier
  assert.equal(sourceTierOfFact({ source: { tier: 2 } }), "REPUTABLE_SECONDARY");
  assert.equal(isIndependentSourceTier(sourceTierOfFact({ source: { tier: 2 } })), true);
  assert.equal(sourceTierOfFact({ source: { tier: 1 } }), "OFFICIAL", "CONTROL: tier 1 unchanged");
  assert.equal(sourceTierOfFact({ source: { tier: 3 } }), "REPUTABLE_SECONDARY", "CONTROL: tier 3 unchanged");
});

test("E3 · every stored tier NAME stays valid, and the first-party set is declared once and disjoint from the independent set", () => {
  for (const t of ["OFFICIAL", "OWNED_GSC_ANALYTICS", "VERIFIED_ALMIWORLD", "REPUTABLE_SECONDARY", "COMPETITOR_COMMUNITY", "AGENT_INFERENCE"]) {
    assert.doesNotThrow(() => tierRank(t), `${t} is no longer readable`);
  }
  assert.equal(SOURCE_TIERS.length, 6, "no tier added or removed");
  for (const fp of FIRST_PARTY_TIERS) {
    assert.ok(SOURCE_TIERS.includes(fp));
    assert.equal(INDEPENDENT_SOURCE_TIERS.includes(fp), false, `${fp} is in both sets`);
  }
});

test("E4 · the census counts first-party evidence APART from independent evidence, with its population and bound", () => {
  const pop = [src("OFFICIAL", 1), src("REPUTABLE_SECONDARY", 2), src("VERIFIED_ALMIWORLD", 3), src("VERIFIED_ALMIWORLD", 4), src("OWNED_GSC_ANALYTICS", 5), src("AGENT_INFERENCE", 6)];
  const c = tierIndependenceCensus(pop);
  console.log(`[E4] population ${c.population} · bound ${c.bound} · independent ${c.independent} · first-party ${c.firstParty} · other ${c.other}`);
  assert.deepEqual([c.population, c.independent, c.firstParty, c.other, c.bound], [6, 2, 2, 2, INDEPENDENCE_CENSUS_BOUND]);
  assert.equal(c.independent + c.firstParty + c.other, c.population, "remainder 0");
  assert.throws(() => tierIndependenceCensus({ length: 1 }), /must be an array/);
});
