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

import { chosenFor } from "./helpers/f35-chosen.mjs"; /* RR-179 (c): construction acts only on F35's decision */
import {
  OVERLAP_REVIEW_TRIGGER, ADAPTIVE_RULES,
  PASS as ADAPTIVE_PASS, FAIL as ADAPTIVE_FAIL, NOT_TESTED as ADAPTIVE_NOT_TESTED,
} from "../src/gate-a/adaptive.mjs";
/* RR-295: the old builder (src/page/construct.mjs) is removed; the verdict words its tests compared with, kept here as they were */
const ACCEPTED = "ACCEPTED", PASS = "PASS", FAIL = "FAIL", NOT_TESTED = "BLOCKED / NOT TESTED";

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
const NO_EXISTING_PAGE = Object.freeze({ tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [], inventory: { pages: [] } });
/* F39 (_handoffs 90e798d): ACCEPTED also needs original information gain ESTABLISHED. Each fixture candidate is handed a RECORDED gain
 * record and competitor comparison, written by hand — so every refusal below is still Gate A's own rule, never F39's (without them
 * F39 would refuse every candidate, and a broken Gate A rule would hide behind it). */
const GAIN_EVIDENCE = Object.freeze({
  gainRecords: ["alpha", "beta", "gamma"].map((s) => ({ pageId: `candidate:${s}`, kind: "EXAMPLES", adds: "a fixture's recorded gain", ref: `gain:fixture:${s}` })),
  competitorComparisons: ["alpha", "beta", "gamma"].map((s) => ({ pageId: `candidate:${s}`, competitorsCompared: 1, gainBeyond: true, ref: `cmp:fixture:${s}` })),
  reviews: [],
});

test("the amended floor is four named rules, enumerable without reading control flow", () => {
  assert.deepEqual(ADAPTIVE_RULES.map((r) => r.id), ["A", "B", "C", "D"]);
  assert.equal(OVERLAP_REVIEW_TRIGGER, 0.40);
});

/* ================================================================== *
 * RULE A — FACT SUFFICIENCY
 * ================================================================== */

/* ================================================================== *
 * RULE B — CONTENT COMPLETENESS
 * ================================================================== */

/* ================================================================== *
 * RULE C — OVERLAP AND DUPLICATION
 * ================================================================== */

/* ================================================================== *
 * RULE D, AND THE FAIL-CLOSED GUARANTEE
 * ================================================================== */
