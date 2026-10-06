/**
 * 🔴 PART B3 (command _handoffs af4e9c8) — THE SHIPPED PAGE RULES MATCH THE ADOPTED AUTHORITY.
 *
 * After V3's adoption (_handoffs 5033788) the register records that Amendment 7 superseded three clauses of Amendment 5, and
 * that Row 25's narrower thresholds stand. This test binds each register fact to the code that must honour it, by BEHAVIOUR:
 *   · the construction path's rules decide as Amendment 7 / V3 say (no universal word or fact quota; overlap = review);
 *   · the legacy Row 25 existing-page gate still applies its thresholds, because nothing superseded them.
 * If either side drifts — a link removed, a floor re-applied in construction, Row 25 silently loosened — a case turns red.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { judgeFactSufficiency, judgeCompleteness, judgeOverlap, ADAPTIVE_RULES, PASS, FAIL } from "../src/gate-a/adaptive.mjs";
import { MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP, runGateA } from "../src/gate-a/run.mjs";
import { MIN_FACTS } from "../src/gate-a/facts.mjs";
import { measureExistingPages } from "../src/gate-a/existing-pages.mjs";

const A7 = "engine:PASS_BOUNDARIES_AMENDMENT_7.md";
const byId = (id) => AUTHORITY_CORPUS.find((r) => r.authorityId === id);
const clauseSuperseded = (clause) => AUTHORITY_CORPUS.some((r) => r.supersededBy.some((s) => s.startsWith(`${A7}#${clause}@`)));

test("V1 · the 350-word floor is superseded in the register, and construction's completeness rule has no word quota", () => {
  assert.ok(clauseSuperseded("UNIVERSAL_MIN_UNIQUE_WORDS_350"), "the register records the supersession");
  const concise = judgeCompleteness({ sections: [{ heading: "Is it free?", framing: "Yes." }, { heading: "How long?", framing: "Ten days." }] });
  assert.equal(concise.state, PASS, "a complete answer of a handful of words passes (V3: no universal word target)");
  assert.equal(judgeCompleteness({ sections: [{ heading: "Is it free?", framing: "Yes." }, { heading: "How long?", framing: "  " }] }).state, FAIL, "CONTROL: an unanswered section fails whatever the length");
  assert.equal(ADAPTIVE_RULES.find((r) => r.id === "B").supersedes, "the ≥350-unique-word floor");
});

test("V2 · the five-fact floor is superseded, and fact sufficiency judges support claim by claim", () => {
  assert.ok(clauseSuperseded("UNIVERSAL_MIN_VERIFIED_FACTS_5"));
  assert.equal(judgeFactSufficiency({ claimIds: ["c1"], unsupported: [] }).state, PASS, "one fully supported claim passes");
  assert.equal(judgeFactSufficiency({ claimIds: ["c1", "c2", "c3", "c4", "c5", "c6"], unsupported: ["c6"] }).state, FAIL, "CONTROL: one unsupported claim fails however many are supported");
});

test("V3 · automatic 40% rejection is superseded: above the trigger means REVIEW, and a duplicate value fails at any overlap", () => {
  assert.ok(clauseSuperseded("OVERLAP_ABOVE_40_PERCENT_AUTOMATIC_REJECTION"));
  const unreviewed = judgeOverlap({ maxOverlap: 0.55, against: "sib", distinctUserValue: null });
  assert.equal(unreviewed.reviewRequired, true, "above the trigger demands a review");
  assert.match(unreviewed.reason, /the percentage did not reject it, the missing review did/);
  assert.equal(judgeOverlap({ maxOverlap: 0.55, against: "sib", distinctUserValue: "a recorded distinct value" }).state, PASS, "above 40% PASSES on a recorded distinct value — no automatic percentage rejection");
  assert.equal(judgeOverlap({ maxOverlap: 0.05, distinctUserValue: "same", siblingDistinctValues: ["same"] }).state, FAIL, "CONTROL: a duplicate value fails at low overlap");
});

/* RR-192 · T-1 (RTP-1 §17 S8 and S9; the owner's PG-A1, _handoffs b5b616e): l.48 asserted "the legacy existing-page gate keeps Row 25's
 * thresholds" — that reading is overturned. Row 25's record stays CURRENT (its command names no number: "unique value · sibling overlap ·
 * verified-fact presence"), and 350 / five facts / 0.40 survive only as REVIEW SIGNALS that no Gate A or ROW25 verdict decides on. */
test("V4 · Row 25's record stays CURRENT; its 350 / five facts / 0.40 are carried only as review signals — no Gate A or ROW25 verdict decides on them (RR-192 T-1)", () => {
  const row25 = AUTHORITY_CORPUS.find((r) => r.propositionId === "CC_COMMAND_ROW25_PAGE_QUALITY_GATE");
  assert.equal(row25.status, "CURRENT");
  assert.deepEqual([...row25.supersededBy], [], "nothing supersedes Row 25's record");
  assert.deepEqual([MIN_UNIQUE_WORDS, MIN_FACTS, MAX_SIBLING_OVERLAP], [350, 5, 0.4], "the review signals are the figures RTP-1 S8–S9 name");
  /* behaviour, not values: a thin, factless page with a why-this-url is never REJECTED on a number, and no pass field remains */
  const thin = (id) => ({ id, html: `<p>short page ${id} with far too few words</p>`, whyThisUrl: "x", facts: [] });
  const g = runGateA([thin("a"), thin("b"), thin("c")]);
  for (const r of g.results) {
    assert.ok(!["uniqueWords", "facts", "overlap"].includes(r.rejectedAt), `Gate A rejected ${r.id} on a number (${r.rejectedAt})`);
    assert.equal(["uniquePass", "factsPass", "overlapPass"].some((k) => k in r), false, "Gate A still reports a pass");
  }
  const row = measureExistingPages([{ id: "https://x.invalid/a/one", html: "<p>a few words</p>" }], []).results[0];
  assert.equal(["uniquePass", "factsPass", "overlapPass"].some((k) => k in row), false, "ROW25 still reports a pass");
});

test("V5 · no record is loosened beyond the three named clauses (the negative control)", () => {
  const links = AUTHORITY_CORPUS.flatMap((r) => r.supersededBy);
  const clauses = [...new Set(links.map((s) => s.split("#")[1].split("@")[0]))].sort();
  assert.deepEqual(clauses, ["OVERLAP_ABOVE_40_PERCENT_AUTOMATIC_REJECTION", "UNIVERSAL_MIN_UNIQUE_WORDS_350", "UNIVERSAL_MIN_VERIFIED_FACTS_5"]);
  assert.ok(byId(A7), "the superseding record exists");
});
