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
import {
  placeClaims, UNIVERSAL_CLAIMS, ALL_REPEATED_CLAIMS, AWAITING_A_LAYER,
  PENDING_ORIGIN_LAYER, PENDING_DESTINATION_LAYER, REMOVED_FROM_PROFESSION_PAGE,
} from "../src/page/claim-placement.mjs";
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

describe("🔴 a claim's SCOPE decides where it lives", () => {
  test("the three kinds are named, disjoint, and cover everything repeated", () => {
    const all = new Set(ALL_REPEATED_CLAIMS);
    assert.equal(all.size, UNIVERSAL_CLAIMS.length + PENDING_ORIGIN_LAYER.length + PENDING_DESTINATION_LAYER.length);
    for (const id of [...UNIVERSAL_CLAIMS, ...PENDING_ORIGIN_LAYER, ...PENDING_DESTINATION_LAYER]) assert.ok(all.has(id), id);
    // disjoint: a claim cannot be universal AND owed a layer
    for (const id of UNIVERSAL_CLAIMS) assert.ok(!REMOVED_FROM_PROFESSION_PAGE.includes(id), id);
  });

  test("🔴 THERE IS NO SHARED PAGE — the module exports none", async () => {
    // The ruling: a page that exists only to hold what other pages should not
    // repeat does not thereby become a page.
    const mod = await import("../src/page/claim-placement.mjs");
    for (const key of Object.keys(mod)) {
      assert.ok(!/SHARED_PAGE/.test(key), `${key} still exposes a shared page`);
    }
  });

  test("universals STAY on the profession page", () => {
    const placed = placeClaims();
    const left = placed.sections.flatMap((s) => s.claims);
    for (const id of UNIVERSAL_CLAIMS) assert.ok(left.includes(id), `${id} must stay`);
  });

  test("🔴 out-of-scope claims render on NO page, and there is NO trailer", async () => {
    const { records } = await loadRegistry();
    const placed = placeClaims();
    // A trailer hinting at a destination is how "awaiting its layer" quietly
    // becomes "behind a link" in somebody's summary six weeks from now.
    assert.equal(placed.trailer, null);
    const rendered = renderPage(placed, records, NOW).trace.map((t) => t.claimId);
    for (const id of REMOVED_FROM_PROFESSION_PAGE) assert.ok(!rendered.includes(id), `${id} still renders`);
  });

  test("every removed claim names the layer it is waiting for, and that layer does NOT exist", () => {
    assert.equal(AWAITING_A_LAYER.length, REMOVED_FROM_PROFESSION_PAGE.length);
    for (const a of AWAITING_A_LAYER) {
      assert.ok(REMOVED_FROM_PROFESSION_PAGE.includes(a.claim), a.claim);
      assert.equal(a.exists, false, "no layer exists yet, and the record must say so");
      assert.ok(a.layer.length > 10 && a.becomes.length > 20, a.claim);
    }
  });

  test("the placed page still holds enough facts for Gate A", async () => {
    const { records } = await loadRegistry();
    const { trace } = renderPage(placeClaims(), records, NOW);
    assert.ok(trace.length >= 5, `only ${trace.length} facts left`);
    assert.equal(trace.length, 14);
  });

  test("🔴 the shared half is a property of the PAGE, not of the ruling", async () => {
    // This bit once: pointing the overlap set at UNIVERSAL_CLAIMS alone moved
    // the AS-BUILT baseline from 0.3921 to 0.1927, because the origin and
    // destination claims ARE on that page and ARE identical across the twelve.
    // A measurement that changes because a RULING changed is measuring the ruling.
    const { records } = await loadRegistry();
    const asBuilt = renderPage(NURSING_PAGE, records, NOW).trace.map((t) => t.claimId);
    const repeatedOnAsBuilt = asBuilt.filter((id) => ALL_REPEATED_CLAIMS.includes(id));
    assert.equal(repeatedOnAsBuilt.length, 7, "all seven are repeated on the as-built page");
    const placed = renderPage(placeClaims(), records, NOW).trace.map((t) => t.claimId);
    assert.equal(placed.filter((id) => ALL_REPEATED_CLAIMS.includes(id)).length, 2, "only the universals remain");
  });
});
