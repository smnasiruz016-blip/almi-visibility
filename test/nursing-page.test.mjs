/**
 * THE PAGE — RED FIRST, AND THE RED THAT MATTERS IS §5A's.
 *
 *   "Facts must be reusable by reference. Page generation must not create
 *    independent untraceable copies of the same factual claim."
 *
 * A page that COPIES its facts looks identical to one that REFERENCES them,
 * until the day a regulator changes a number and nobody can find every place it
 * was written down. That is the 240,328-page estate's whole disease, so the
 * check for it is forced red here rather than asserted in prose.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { loadRegistry } from "../src/facts/registry.mjs";
import { NURSING_PAGE, PROFESSIONS, claimIdsOf } from "../src/page/spec.mjs";
import { renderPage, renderFact, findCopiedFacts } from "../src/page/render.mjs";
import { splitSpec, SHARED_PAGE, SHARED_CLAIM_IDS, ORIGIN_SHARED, TEST_SHARED } from "../src/page/split.mjs";
import { fact } from "../src/facts/record.mjs";

const NOW = new Date("2026-09-10T00:00:00Z");

const base = (extra = {}) =>
  fact({
    id: "uk-nmc.oet-minimum-grade.profession=nursing",
    claim: { subject: "uk-nmc", predicate: "oet-minimum-grade", qualifier: "profession=nursing" },
    scope: "destination",
    value: { value: "grade B for reading, listening and speaking", valueType: "grade-set", unit: "OET grade" },
    source: { url: "https://www.nmc.org.uk/x/", label: "NMC — OET", publisher: "NMC", tier: 1, documentRef: null },
    sourceMachineReadable: true,
    sourceMachineReadableBasis: "fetched",
    sourceQuotable: true,
    sourceQuotableBasis: "clause 6.3",
    licence: "NMC-6.3",
    sourceDocumentClass: "guidance",
    attributionStatement: "Nursing and Midwifery Council — https://www.nmc.org.uk/",
    evidence: { quotedSpan: "At least grade B (350 or above)", quoteLocation: "x" },
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
    queue: "AUTOMATED",
    freshness: { rule: "machine-quote-match", days: 180 },
    life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
    provenance: { route: "R3", acquiredBy: "model:x" },
    ...extra,
  });

describe("🔴 §5A — by reference, never by copy", () => {
  test("the spec holds claim IDs and NOT ONE fact", async () => {
    const { records } = await loadRegistry();
    assert.deepEqual(findCopiedFacts(NURSING_PAGE, records), []);
  });

  test("🔴 RED: planting a record's own sentence into the spec IS detected", async () => {
    const { records } = await loadRegistry();
    const victim = records.find((r) => r.evidence.ownWords && r.evidence.ownWords.length > 80);
    const sabotaged = { ...NURSING_PAGE, intro: `${NURSING_PAGE.intro} ${victim.evidence.ownWords}` };
    const found = findCopiedFacts(sabotaged, records);
    assert.ok(found.length > 0, "a fact copied into the template must not pass unnoticed");
    assert.equal(found[0].claimId, victim.id);
  });

  test("every rendered fact carries its claim id into the HTML", async () => {
    const { records } = await loadRegistry();
    const { html, trace } = renderPage(NURSING_PAGE, records, NOW);
    for (const t of trace) {
      assert.ok(html.includes(`data-claim-id="${t.claimId}"`), t.claimId);
    }
    // A fact you cannot trace back to a record is a fact nobody will re-verify.
    const rendered = [...html.matchAll(/data-claim-id="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(rendered.length, trace.length);
    assert.deepEqual([...new Set(rendered)].sort(), [...new Set(trace.map((t) => t.claimId))].sort());
  });

  test("🔴 RED: a claim the registry does not have THROWS — it is never skipped", async () => {
    const { records } = await loadRegistry();
    const spec = { ...NURSING_PAGE, sections: [{ heading: "x", framing: "y", claims: ["nope.not-a-claim"] }] };
    assert.throws(() => renderPage(spec, records, NOW), /does not have/);
  });
});

describe("🔴 the renderer refuses what may not reach a reader", () => {
  test("RED: a candidate record is refused", () => {
    assert.throws(() => renderFact(base({ life: { status: "candidate", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" } }), NOW), /may not reach a reader/);
  });

  test("RED: a lead is refused", () => {
    assert.throws(() => renderFact(base({ life: { status: "lead", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" } }), NOW), /may not reach a reader/);
  });

  test("GREEN: an active record renders its value, its quote and its credit", () => {
    const { html } = renderFact(base(), NOW);
    assert.match(html, /grade B for reading/);
    assert.match(html, /At least grade B \(350 or above\)/);
    assert.match(html, /Nursing and Midwifery Council/);
  });

  test("🔴 RED: an NMC quote whose licence condition has lapsed is WITHHELD", () => {
    // The value still renders. The reproduction does not — and the record says
    // so rather than the page quietly showing a stale quotation.
    const lapsed = base({
      checks: { ...base().checks, quoteMatchedOn: "2026-01-01" },
      life: { status: "active", firstSeenOn: "2026-01-01", extractedOn: "2026-01-01" },
    });
    const { html, trace } = renderFact(lapsed, NOW);
    assert.ok(!html.includes("At least grade B (350 or above)"), "an out-of-licence reproduction must not reach a reader");
    assert.match(html, /grade B for reading/, "the FACT survives; only their wording is withdrawn");
    assert.equal(trace.quoteWithheld, true);
    assert.match(trace.quoteVerdict, /LICENCE CONDITION LAPSED/);
  });

  test("a record we may not quote renders OUR words, and that is the ordinary case", () => {
    const ours = base({
      sourceQuotable: false,
      licence: "proprietary-no-reuse",
      sourceDocumentClass: "general",
      attributionStatement: null,
      evidence: { quotedSpan: null, quoteLocation: null, ownWords: "Stated here in our own words, with the link." },
      freshness: { rule: "machine-fingerprint", days: 180 },
      pageFingerprint: "a".repeat(64),
      checks: { ...base().checks, quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
    });
    const { html, trace } = renderFact(ours, NOW);
    assert.match(html, /in our own words/);
    assert.equal(trace.renderedQuote, false);
    assert.equal(trace.quoteWithheld, false, "never quotable is not the same as withheld");
  });
});

describe("the page as it actually builds", () => {
  test("every referenced claim resolves, and the count is the count", async () => {
    const { records } = await loadRegistry();
    const { trace } = renderPage(NURSING_PAGE, records, NOW);
    assert.equal(trace.length, claimIdsOf(NURSING_PAGE).length);
    assert.ok(trace.length >= 15, `only ${trace.length} facts on the page`);
  });

  test("it draws on more than one regulator — a page from one source is that source's page", async () => {
    const { records } = await loadRegistry();
    const { trace } = renderPage(NURSING_PAGE, records, NOW);
    assert.ok(new Set(trace.map((t) => t.subject)).size >= 5);
  });

  test("🔴 both quotable and unquotable sources reach the page, and the split is visible", async () => {
    const { records } = await loadRegistry();
    const { trace } = renderPage(NURSING_PAGE, records, NOW);
    const quoted = trace.filter((t) => t.renderedQuote).length;
    const ourWords = trace.length - quoted;
    assert.ok(quoted > 0, "if nothing is quoted, the licence work bought nothing");
    assert.ok(ourWords > 0, "if nothing is in our own words, the un-quotable sources are missing");
  });

  test("the twelve professions are the published population, and nursing is one of them", () => {
    assert.equal(PROFESSIONS.length, 12);
    assert.ok(PROFESSIONS.includes("nursing"));
  });
});

describe("🔴 the shared block, extracted — §5A past the page boundary", () => {
  test("splitSpec REMOVES the shared claims and drops sections that empty out", () => {
    const split = splitSpec();
    const left = split.sections.flatMap((s) => s.claims);
    for (const id of SHARED_CLAIM_IDS) assert.ok(!left.includes(id), `${id} should have moved`);
    assert.equal(split.removedClaims.length, SHARED_CLAIM_IDS.length);
    // A heading over nothing is padding, and padding is what we are trying to
    // stop counting as content.
    for (const s of split.sections) assert.ok(s.claims.length > 0, `empty section kept: ${s.heading}`);
  });

  test("it is DERIVED from the original, so the two cannot drift apart", () => {
    const split = splitSpec();
    const originalIds = new Set(NURSING_PAGE.sections.flatMap((s) => s.claims));
    for (const s of split.sections) for (const c of s.claims) assert.ok(originalIds.has(c), c);
  });

  test("the link that replaces the block is COUNTED, not free", () => {
    const split = splitSpec();
    assert.ok(split.trailer && split.trailer.length > 40, "the replacement link must exist and be real text");
  });

  test("🔴 every removed claim lands on the shared page — nothing is silently dropped", () => {
    const split = splitSpec();
    const onShared = new Set(SHARED_PAGE.sections.flatMap((s) => s.claims));
    for (const id of split.removedClaims) assert.ok(onShared.has(id), `${id} was removed and landed nowhere`);
  });

  test("the shared page still renders every one of them from the registry", async () => {
    const { records } = await loadRegistry();
    const { trace } = renderPage(SHARED_PAGE, records, NOW);
    assert.equal(trace.length, SHARED_CLAIM_IDS.length);
  });

  test("🔴 the split page still holds enough facts for Gate A on its own", async () => {
    const { records } = await loadRegistry();
    const { trace } = renderPage(splitSpec(), records, NOW);
    assert.ok(trace.length >= 5, `only ${trace.length} facts left — the split must not starve the page`);
  });

  test("the origin-scoped claims are marked as such — they are misplaced, not merely duplicated", () => {
    // Four of the seven turn on WHERE THE READER IS FROM, which a profession
    // page never knows. That is the design finding, and it is encoded rather
    // than left in prose.
    assert.equal(ORIGIN_SHARED.length, 4);
    assert.equal(TEST_SHARED.length, 2);
    for (const id of [...ORIGIN_SHARED, ...TEST_SHARED]) assert.ok(SHARED_CLAIM_IDS.includes(id), id);
  });
});
