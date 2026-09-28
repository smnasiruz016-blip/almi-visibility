/**
 * 🔴 ROW 61 UNDER AMENDMENT 7 — THE ADAPTIVE PAGE FLOOR, ON THE REAL CONSTRUCTION PATH.
 *
 * Three numeric readings were superseded on 21 September 2026: ≥5 verified sourced facts, ≥350
 * unique words, and automatic rejection above 40% sibling overlap. Every proof below drives
 * `constructCandidates` — the same function `bin/build-page.mjs` calls — never the rule modules on
 * their own, because row 61's FAILURE clause is about what the CONSTRUCTION PATH emits.
 *
 * 🔴 EACH PROOF CARRIES ITS CONTROL. A rule seen only refusing could be a rule that refuses
 * everything, and a rule seen only passing could be a rule that is not wired in. Where a proof shows
 * a refusal, the same family with the one broken thing restored must be accepted.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { constructCandidates, ACCEPTED, REFUSED, PASS, FAIL, NOT_TESTED } from "../src/page/construct.mjs";
import {
  OVERLAP_REVIEW_TRIGGER, ADAPTIVE_RULES,
  PASS as ADAPTIVE_PASS, FAIL as ADAPTIVE_FAIL, NOT_TESTED as ADAPTIVE_NOT_TESTED,
} from "../src/gate-a/adaptive.mjs";

const NOW = new Date("2026-09-21T00:00:00Z");
const VARIANTS = ["alpha", "beta", "gamma"];

/** A fresh, approved, renderable fact — the only kind rule A counts as support. */
const supportedFact = (variant, i) => ({
  id: `fixture-subject.claim-${i}.axis=${variant}`,
  claim: { subject: "fixture-subject", predicate: `claim-${i}`, qualifier: `axis=${variant}` },
  scope: "destination",
  value: { value: `fixture value ${variant} ${i}`, valueType: "text", unit: null },
  source: { url: `https://example.org/fixture/${variant}/${i}`, label: "fixture", publisher: "fixture", tier: 1, documentRef: null },
  sourceMachineReadable: true, sourceMachineReadableBasis: "fixture",
  sourceQuotable: false, sourceQuotableBasis: "fixture",
  licence: "proprietary-no-reuse", sourceDocumentClass: "general",
  evidence: { quotedSpan: null, quoteLocation: null, ownWords: `Fixture statement ${i} for ${variant}.` },
  checks: { linkCheckedOn: "2026-09-20", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-20", fingerprintOutcome: "pass" },
  pageFingerprint: "a".repeat(64), queue: "AUTOMATED",
  freshness: { rule: "machine-fingerprint", days: 180 },
  life: { status: "active", firstSeenOn: "2026-09-20", extractedOn: "2026-09-20" },
  provenance: { route: "R3", acquiredBy: "fixture" },
  verificationState: "VERIFIED",
});

/** The same fact, but stale — verified far outside the freshness window. */
const staleFact = (variant, i) => ({
  ...supportedFact(variant, i),
  checks: { ...supportedFact(variant, i).checks, linkCheckedOn: "2020-01-01", fingerprintCheckedOn: "2020-01-01" },
  life: { status: "active", firstSeenOn: "2020-01-01", extractedOn: "2020-01-01" },
});

/* 🔴 HAND-WRITTEN PER VARIANT, NOT A TEMPLATE. judgeWhy refuses one rationale with the variant
 * swapped — correctly — so a templated fixture would prove nothing about the amended rules. */
const WHY = {
  alpha: { humanNeed: "a first-time applicant who must choose between two filing routes before a deadline", distinctValue: "sets the two routes side by side with the one condition that decides between them" },
  beta: { humanNeed: "a returning practitioner who lost a certificate and needs to know whether an older result still counts", distinctValue: "explains the expiry rule and the single exception that keeps an old result valid" },
  gamma: { humanNeed: "an employer checking documents who cannot tell which of three evidence forms is acceptable", distinctValue: "a checklist of acceptable evidence with what each one does not prove" },
};
const why = (variant) => WHY[variant];

const words = (seed, n) => Array.from({ length: n }, (_, i) => `w${seed}x${i}`).join(" ");

/**
 * Build a three-page family. Everything a proof needs to break is a parameter, so each test breaks
 * exactly ONE thing and the rest of the family stays lawful.
 */
function family({
  claimsPerPage = 2,
  sections = null,
  makesNoMaterialFactualClaim = null,
  stale = false,
  sharedBody = false,
  distinctUserValue = null,
  omitWhy = false,
  bodyWords = 30,
} = {}) {
  const pageSpecs = {};
  const records = [];
  VARIANTS.forEach((variant, p) => {
    for (let i = 0; i < Math.max(claimsPerPage, 1); i += 1) {
      records.push(stale ? staleFact(variant, i) : supportedFact(variant, i));
    }
    const claims = Array.from({ length: claimsPerPage }, (_, i) => `fixture-subject.claim-${i}.axis=${variant}`);
    /* 🔴 HIGH OVERLAP IS MADE BY TWO PAGES SHARING A BODY THE THIRD DOES NOT — a family where ALL
     * three share it would be absorbed by the shared shell and measure nothing. */
    const body = sharedBody && variant !== "gamma" ? words(0, bodyWords) : words(p + 1, bodyWords);
    const spec = {
      slug: variant, variant,
      title: `Fixture page ${variant}`,
      intro: "Fixture framing shared by every page of the family.",
      sections: sections ? sections(variant, p, claims) : [{ heading: "Body", framing: body, claims }],
    };
    if (!omitWhy) spec.whyThisUrlDeservesToExist = why(variant);
    if (makesNoMaterialFactualClaim !== null) spec.makesNoMaterialFactualClaim = makesNoMaterialFactualClaim;
    if (distinctUserValue !== null) spec.distinctUserValue = typeof distinctUserValue === "function" ? distinctUserValue(variant) : distinctUserValue;
    pageSpecs[variant] = spec;
  });
  return { pageSpecs, records };
}

/* F34: the synthetic family's tenant is DECLARED to have no existing page (a COMPLETE, empty population), so these tests judge
 * the adaptive rules alone; the existing-page check itself is proved in test/f34-no-blind-regeneration.test.mjs. */
const FIXTURE_TENANT = "tenant:gate-a-fixture";
const NO_EXISTING_PAGE = Object.freeze({ tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [] });
const judge = ({ pageSpecs, records }, slug = "alpha") =>
  constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: [slug], tenantId: FIXTURE_TENANT, existingPages: NO_EXISTING_PAGE, now: NOW })[0];

test("🔴 the adaptive rules speak the CONSTRUCTION PATH's state vocabulary — they drifted once", () => {
  /* An invented NOT_TESTED once failed to match "BLOCKED / NOT TESTED", and a rule-B refusal would
   * have been recorded in neither dataGaps nor notTested — refused with its reason nowhere. */
  assert.equal(ADAPTIVE_PASS, PASS);
  assert.equal(ADAPTIVE_FAIL, FAIL);
  assert.equal(ADAPTIVE_NOT_TESTED, NOT_TESTED);
});

test("the amended floor is four named rules, enumerable without reading control flow", () => {
  assert.deepEqual(ADAPTIVE_RULES.map((r) => r.id), ["A", "B", "C", "D"]);
  assert.equal(OVERLAP_REVIEW_TRIGGER, 0.40);
});

/* ================================================================== *
 * RULE A — FACT SUFFICIENCY
 * ================================================================== */

test("🔴 P1 · a zero-fact NON-FACTUAL utility is evaluated without a single invented fact", () => {
  const f = family({ claimsPerPage: 0, makesNoMaterialFactualClaim: true });
  const r = judge(f);
  assert.equal(r.parts.facts.state, PASS, r.parts.facts.reason);
  assert.equal(r.parts.facts.rule, "A");
  assert.equal(r.parts.facts.cited, 0);
  assert.deepEqual(r.parts.facts.unsupported, []);
});

test("🔴 P2 · a zero-fact candidate that does NOT declare itself non-factual FAILS as DATA GAP", () => {
  const r = judge(family({ claimsPerPage: 0 }));
  assert.equal(r.parts.facts.state, FAIL);
  assert.equal(r.parts.facts.kind, "DATA GAP");
  assert.match(r.parts.facts.reason, /silence is not a declaration/);
  assert.equal(r.verdict, REFUSED);
  assert.equal(r.html, null, "a refused candidate emitted HTML");
});

test("🔴 P3 · a fully supported candidate is NOT rejected for citing fewer than five claims", () => {
  const two = judge(family({ claimsPerPage: 2 }));
  assert.equal(two.parts.facts.state, PASS, two.parts.facts.reason);
  assert.equal(two.parts.facts.cited, 2, "the proof must actually cite fewer than the superseded five");
  assert.ok(two.parts.facts.supersededCount < 5, "the old floor would have rejected this page, so the proof is live");

  /* CONTROL: make ONE of those two claims unsupported and rule A must refuse — so the PASS above is
   * support talking, not a rule that passes anything. */
  const broken = family({ claimsPerPage: 2, stale: true });
  const r = judge(broken);
  assert.equal(r.parts.facts.state, FAIL);
  assert.equal(r.parts.facts.kind, "DATA GAP");
});

test("🔴 one unsupported claim fails a page that carries many supported ones — no count rescues it", () => {
  const f = family({ claimsPerPage: 6 });
  /* break exactly one claim by removing its record */
  f.records = f.records.filter((rec) => rec.id !== "fixture-subject.claim-3.axis=alpha");
  const r = judge(f);
  assert.equal(r.parts.facts.state, FAIL);
  assert.deepEqual(r.parts.facts.unsupported, ["fixture-subject.claim-3.axis=alpha"]);
  assert.ok(r.parts.facts.supersededCount >= 5, "the old ≥5 floor would have PASSED this page — that is the point");
});

/* ================================================================== *
 * RULE B — CONTENT COMPLETENESS
 * ================================================================== */

test("🔴 P4 · a complete but CONCISE answer is not rejected for being short", () => {
  const r = judge(family({ bodyWords: 12 }));
  assert.equal(r.parts.completeness.state, PASS, r.parts.completeness.reason);
  assert.ok(r.parts.completeness.supersededUniqueWords < 350, "the body must actually be under the superseded floor");
});

test("🔴 P5 · an INCOMPLETE answer fails even when it is long", () => {
  const f = family({
    /* alpha alone is long AND incomplete; its siblings stay lawful and DIFFERENT, so the shared
     * shell stays small and alpha's length is really measured. */
    sections: (variant, p, claims) => (variant === "alpha"
      ? [
          { heading: "Answered", framing: words(9, 500), claims },
          { heading: "Never answered", framing: "   ", claims: [] },
        ]
      : [{ heading: "Body", framing: words(p + 1, 40), claims }]),
  });
  const r = judge(f, "alpha");
  assert.equal(r.parts.completeness.state, FAIL);
  assert.match(r.parts.completeness.reason, /not answered/);
  assert.ok(r.parts.completeness.supersededUniqueWords > 350, "the page must actually clear the superseded floor, or the proof is not live");
});

test("🔴 P6 · FILLER cannot convert an incomplete answer into a pass", () => {
  const f = family({
    sections: (variant, p, claims) => (variant === "alpha"
      ? [
          { heading: "One", framing: words(7, 200), claims },
          { heading: "Two", framing: words(7, 200), claims: [] },
        ]
      : [{ heading: "Body", framing: words(p + 1, 40), claims }]),
  });
  const r = judge(f, "alpha");
  assert.equal(r.parts.completeness.state, FAIL);
  assert.match(r.parts.completeness.reason, /SAME answer|filler/i);
});

test("🔴 a spec declaring NO coverage cannot be judged — NOT TESTED, and NOT TESTED refuses", () => {
  const r = judge(family({ sections: (variant, p, claims) => (variant === "alpha" ? [] : [{ heading: "Body", framing: words(p + 1, 40), claims }]) }), "alpha");
  assert.equal(r.parts.completeness.state, NOT_TESTED);
  assert.equal(r.verdict, REFUSED);
  assert.equal(r.html, null);
});

/* ================================================================== *
 * RULE C — OVERLAP AND DUPLICATION
 * ================================================================== */

test("🔴 P7 · overlap above the trigger demands REVIEW rather than rejecting on the percentage", () => {
  const r = judge(family({ sharedBody: true }), "alpha");
  assert.ok(r.parts.overlap.value > OVERLAP_REVIEW_TRIGGER, `overlap was ${r.parts.overlap.value}; the fixture must actually exceed the trigger`);
  assert.equal(r.parts.overlap.reviewRequired, true);
  assert.equal(r.parts.overlap.state, FAIL, "with no recorded distinct value it must still refuse");
  assert.match(r.parts.overlap.reason, /MANDATORY REVIEW/);
  assert.match(r.parts.overlap.reason, /the percentage did not reject it, the missing review did/);
});

test("🔴 P8 · high overlap PASSES where a distinct user value is recorded", () => {
  const r = judge(family({ sharedBody: true, distinctUserValue: (v) => `the ${v} reader's decision, recorded and measured` }), "alpha");
  assert.ok(r.parts.overlap.value > OVERLAP_REVIEW_TRIGGER);
  assert.equal(r.parts.overlap.reviewRequired, true);
  assert.equal(r.parts.overlap.state, PASS, r.parts.overlap.reason);
});

test("🔴 P9 · LOW overlap but a DUPLICATE recorded value fails — the old number could never see this", () => {
  const r = judge(family({ sharedBody: false, distinctUserValue: "the very same value on every page" }), "alpha");
  assert.ok(r.parts.overlap.value <= OVERLAP_REVIEW_TRIGGER, `overlap was ${r.parts.overlap.value}; this proof needs a LOW overlap`);
  assert.equal(r.parts.overlap.state, FAIL);
  assert.match(r.parts.overlap.reason, /identical to a sibling/);
});

/* ================================================================== *
 * RULE D, AND THE FAIL-CLOSED GUARANTEE
 * ================================================================== */

test("🔴 P10 · a missing WHY_THIS_URL_DESERVES_TO_EXIST fails, unchanged by this amendment", () => {
  const r = judge(family({ omitWhy: true }), "alpha");
  assert.notEqual(r.parts.whyThisUrl.state, PASS);
  assert.equal(r.verdict, REFUSED);
});

test("🔴 P11 · every failure is recorded as DATA GAP or REJECT with a concrete reason", () => {
  for (const [label, f] of [
    ["unsupported claim", family({ claimsPerPage: 2, stale: true })],
    ["incomplete coverage", family({ sections: (variant, p, claims) => (variant === "alpha" ? [{ heading: "h", framing: "", claims: [] }] : [{ heading: "Body", framing: words(p + 1, 40), claims }]) })],
    ["unreviewed overlap", family({ sharedBody: true })],
  ]) {
    const r = judge(f, "alpha");
    assert.equal(r.verdict, REFUSED, label);
    const recorded = [...r.dataGaps, ...r.rejects];
    assert.ok(recorded.length > 0, `${label}: refused with nothing recorded`);
    for (const x of recorded) {
      assert.ok(typeof x.part === "string" && x.part !== "", `${label}: a recorded failure names no part`);
      assert.ok(typeof x.reason === "string" && x.reason.length > 20, `${label}: "${x.reason}" is not a concrete reason`);
    }
  }
});

test("🔴 P12 · no accepted artefact bypasses the amended gate — and the gate can still ACCEPT", () => {
  /* the lawful family: supported claims, answered coverage, low overlap, a rationale */
  const good = judge(family());
  assert.equal(good.verdict, ACCEPTED, JSON.stringify({ gaps: good.dataGaps, rejects: good.rejects, notTested: good.notTested }));
  assert.ok(typeof good.html === "string" && good.html.length > 0, "an accepted candidate produced no HTML");

  /* 🔴 and every single-broken variant refuses AND writes nothing */
  for (const [label, f] of [
    ["rule A", family({ claimsPerPage: 0 })],
    ["rule B", family({ sections: (variant, p, claims) => (variant === "alpha" ? [{ heading: "h", framing: " ", claims: [] }] : [{ heading: "Body", framing: words(p + 1, 40), claims }]) })],
    ["rule C", family({ sharedBody: true })],
    ["rule D", family({ omitWhy: true })],
  ]) {
    const r = judge(f, "alpha");
    assert.equal(r.verdict, REFUSED, `${label} did not refuse`);
    assert.equal(r.html, null, `${label} refused but emitted HTML`);
    assert.equal(r.trace, null, `${label} refused but emitted a trace`);
  }
});
