/**
 * 🔴 ROW 16 / D-FACT-1 — THE CONFLICT SHAPE EVERY REAL CONFLICT ACTUALLY HAS.
 *
 * `detectConflicts` compares records we HOLD against each other, and returns 0 on all six real
 * conflicts because each of them is one held record against a value on a page we do not hold.
 * `detectExternalConflicts` compares a held record against an external OBSERVATION that declares
 * which claim it speaks to.
 *
 * The real data here is the 15 September 2026 owner-authorised capture of the first product's
 * origin-regulator page: two claims read from ONE page, one that DISAGREES with what we hold and
 * one that AGREES. The agreeing one is the control — without it, "it found a conflict" would not
 * distinguish a working detector from one that flags everything.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { detectConflicts, detectExternalConflicts, EXTERNAL_CLAIM_OBSERVATION } from "../src/facts/lifecycle.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const { records } = await loadRegistry((await (await import("./support/subjects.mjs")).subject("almi-oet")).factsDir, "almi-oet");
const observations = createJsonlStore(`${REPO}runs/evidence/external-observations-2026-09-15.jsonl`).readAll();

const CONTESTED = "pk-pnmc.verification-documents";
const AGREEING = "pk-pnmc.verification-response-time";

/* ---- REAL DATA ----------------------------------------------------------------------------- */

test("🔴 D-FACT-1 · the detector FIRES on real data: a held record against a real external observation", () => {
  const { conflicts } = detectExternalConflicts({ records, observations });
  assert.equal(conflicts.length, 1, `expected exactly the one real disagreement, got ${JSON.stringify(conflicts.map((c) => c.claimKey))}`);
  const [c] = conflicts;
  assert.match(c.claimKey, /^pk-pnmc\|verification-documents\|/);
  // 🔴 BOTH VALUES RETAINED — ours and theirs. Dropping either destroys the evidence of a disagreement.
  assert.deepEqual(c.records.map((r) => [r.id, r.value]), [[CONTESTED, 3]]);
  assert.equal(c.external.value, 4);
  assert.match(c.external.sourceUrl, /^https:\/\//);
  assert.equal(c.external.observedOn.slice(0, 10), "2026-09-15");
  assert.ok(typeof c.external.inOurWords === "string" && c.external.inOurWords.length > 40, "the observation must say, in our words, what was read");
});

test("🔴 D-FACT-1 · a conflict is NEVER auto-resolved — UNKNOWN, needing a person, with no authority picked", () => {
  const [c] = detectExternalConflicts({ records, observations }).conflicts;
  assert.equal(c.state, "CONFLICTED");
  assert.equal(c.resolvedState, "UNKNOWN");
  assert.equal(c.needsExplicitReview, true);
  assert.equal(c.suggestedAuthority, null, "a record and a page are not two rankable records — nothing may be picked here");
  assert.equal(c.resolution, undefined, "a detector must not resolve anything");
});

test("🔴 CONTROL · the AGREEING observation from the same page, at the same moment, produces NO conflict", () => {
  const { conflicts, agreed } = detectExternalConflicts({ records, observations });
  assert.equal(agreed.length, 1, "the control observation is missing — a lone conflict proves nothing");
  assert.equal(agreed[0].id, AGREEING);
  assert.equal(agreed[0].value, 3);
  assert.ok(!conflicts.some((c) => c.records.some((r) => r.id === AGREEING)), "the agreeing claim was reported as a conflict");
});

test("🔴 the OLD detector is unchanged and still returns 0 on the same real registry", () => {
  assert.equal(detectConflicts(records).length, 0, "detectConflicts has learnt a new shape — update the defect note in facts-verification-ingest.test.mjs, do not delete it");
});

test("the seven page retrievals are not in this detector's population, and are not reported as ignored either", () => {
  const retrievals = observations.filter((o) => o?.value?.kind === "external_page_retrieval");
  assert.equal(retrievals.length, 7, "the run made seven requests and each one is an observation");
  const { conflicts, ignored } = detectExternalConflicts({ records, observations: retrievals });
  assert.deepEqual([conflicts.length, ignored.length], [0, 0]);
});

/* ---- FIXTURES — the shapes that must NOT fire, each with its own reason --------------------- */

const held = (over = {}) => ({
  id: "fx.subject.predicate",
  claim: { subject: "fx-subject", predicate: "fx-predicate", qualifier: null },
  scope: "origin",
  value: { value: 3, valueType: "count", unit: "x" },
  source: { tier: 1 },
  life: { status: "active", extractedOn: "2026-09-01" },
  ...over,
});
const obs = (value, over = {}) => ({ record_type: "observation", observation_id: "obs-1", observed_at: "2026-09-15T00:00:00.000Z", target: { kind: "artifact", ref: "claim:fx@https://example.test/p" }, value, ...over });
const claimValue = (over = {}) => ({ kind: EXTERNAL_CLAIM_OBSERVATION, claim: { subject: "fx-subject", predicate: "fx-predicate", qualifier: null }, scope: "origin", observedValue: 4, inOurWords: "the page says four", sourceUrl: "https://example.test/p", ...over });

test("a DIFFERENT claim does not fire — qualifier and scope are part of the identity", () => {
  const base = { records: [held()] };
  assert.equal(detectExternalConflicts({ ...base, observations: [obs(claimValue())] }).conflicts.length, 1, "the control: the same claim DOES fire");
  for (const [what, value] of [
    ["another predicate", claimValue({ claim: { subject: "fx-subject", predicate: "other", qualifier: null } })],
    ["another qualifier", claimValue({ claim: { subject: "fx-subject", predicate: "fx-predicate", qualifier: "country=x" } })],
    ["another scope", claimValue({ scope: "destination" })],
  ]) {
    const r = detectExternalConflicts({ ...base, observations: [obs(value)] });
    assert.equal(r.conflicts.length, 0, `${what}: a different claim was reported as a conflict`);
    assert.equal(r.ignored.length, 1, `${what}: it must be reported as ignored, never silently dropped`);
  }
});

test("an observation that declares no claim, or no observed value, is REPORTED as ignored — never dropped", () => {
  for (const value of [
    { kind: EXTERNAL_CLAIM_OBSERVATION, observedValue: 4 },
    { kind: EXTERNAL_CLAIM_OBSERVATION, claim: { subject: "fx-subject" }, observedValue: 4 },
    claimValue({ observedValue: undefined }),
  ]) {
    const r = detectExternalConflicts({ records: [held()], observations: [obs(value)] });
    assert.deepEqual([r.conflicts.length, r.ignored.length], [0, 1]);
    assert.match(r.ignored[0].why, /nothing to compare|declares no claim/);
  }
});

test("a RETIRED record is not compared — a superseded value cannot conflict with anything", () => {
  const retired = held({ life: { status: "retired", extractedOn: "2026-09-01" } });
  const r = detectExternalConflicts({ records: [retired], observations: [obs(claimValue())] });
  assert.deepEqual([r.conflicts.length, r.ignored.length], [0, 1]);
  assert.match(r.ignored[0].why, /no active record/);
});
