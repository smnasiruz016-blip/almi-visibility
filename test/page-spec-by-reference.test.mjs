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
import { PRODUCT, FACTS_DIR, PLACEMENT, VARIANTS, PRODUCT_ID } from "../products/almi-oet/product.mjs";

/* 🔴 RENAMED FROM nursing-page.test.mjs (row 61, Amendment 5). It was written around one subject, the same
 * way the runner was. The by-reference law now runs for EVERY page spec the product declares, read from the
 * product's own declaration. Only numbers MEASURED on one spec — its fact count, its subjects, its placement
 * arithmetic — stay pinned to that spec, named once, because a measured number belongs to the page it was
 * measured on. */
const SPECS_UNDER_TEST = Object.entries(PRODUCT.pageSpecs);
const MEASURED_SLUG = "nursing";
const MEASURED = PRODUCT.pageSpecs[MEASURED_SLUG];
import { claimIdsOf } from "../src/page/claim-ids.mjs";
import { renderPage, renderFact, findCopiedFacts } from "../src/page/render.mjs";
import { placeClaims } from "../src/page/claim-placement.mjs";
import { PENDING_LAYERS } from "../products/almi-oet/claim-placement.mjs";
import { fact } from "../src/facts/record.mjs";

const NOW = new Date("2026-09-10T00:00:00Z");

// A hand-built fixture stamps its product, exactly as loadRegistry stamps a
// record read from disk. Without it the record sees only the ENGINE’s licences,
// and the NMC currency condition — which is a PRODUCT licence — never fires.
const base = (extra = {}) => ({
  _productId: PRODUCT_ID,
  ...fact({ /*A3*/ verificationState: "UNVERIFIED",
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
  }) });

test("the specs under test are the product's declared specs — more than one, none hard-coded here", () => {
  assert.ok(SPECS_UNDER_TEST.length >= 2, "the by-reference law would be tested on one subject again");
  assert.ok(PRODUCT.pageSpecs[MEASURED_SLUG], `the measured spec ${MEASURED_SLUG} is no longer declared`);
});

for (const [slug, SPEC] of SPECS_UNDER_TEST) {
  describe(`🔴 §5A — by reference, never by copy — ${slug}`, () => {
    test("the spec holds claim IDs and NOT ONE fact", async () => {
      const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
      assert.deepEqual(findCopiedFacts(SPEC, records), []);
    });

    test("🔴 RED: planting a record's own sentence into the spec IS detected", async () => {
      const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
      const victim = records.find((r) => r.evidence.ownWords && r.evidence.ownWords.length > 80);
      const sabotaged = { ...SPEC, intro: `${SPEC.intro} ${victim.evidence.ownWords}` };
      const found = findCopiedFacts(sabotaged, records);
      assert.ok(found.length > 0, "a fact copied into the template must not pass unnoticed");
      assert.equal(found[0].claimId, victim.id);
    });

    test("every referenced claim resolves, and every rendered fact carries its claim id into the HTML", async () => {
      const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
      const { html, trace } = renderPage(SPEC, records, NOW);
      assert.equal(trace.length, claimIdsOf(SPEC).length);
      for (const t of trace) {
        assert.ok(html.includes(`data-claim-id="${t.claimId}"`), t.claimId);
      }
      // A fact you cannot trace back to a record is a fact nobody will re-verify.
      const rendered = [...html.matchAll(/data-claim-id="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(rendered.length, trace.length);
      assert.deepEqual([...new Set(rendered)].sort(), [...new Set(trace.map((t) => t.claimId))].sort());
    });

    test("🔴 RED: a claim the registry does not have THROWS — it is never skipped", async () => {
      const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
      const spec = { ...SPEC, sections: [{ heading: "x", framing: "y", claims: ["nope.not-a-claim"] }] };
      assert.throws(() => renderPage(spec, records, NOW), /does not have/);
    });
  });
}

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

describe(`the page as it actually builds — measured on ${MEASURED_SLUG}`, () => {
  test("the count is the count", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const { trace } = renderPage(MEASURED, records, NOW);
    assert.equal(trace.length, claimIdsOf(MEASURED).length);
    assert.ok(trace.length >= 15, `only ${trace.length} facts on the page`);
  });

  test("it draws on more than one regulator — a page from one source is that source's page", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const { trace } = renderPage(MEASURED, records, NOW);
    assert.ok(new Set(trace.map((t) => t.subject)).size >= 5);
  });

  test("🔴 both quotable and unquotable sources reach the page, and the split is visible", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const { trace } = renderPage(MEASURED, records, NOW);
    const quoted = trace.filter((t) => t.renderedQuote).length;
    const ourWords = trace.length - quoted;
    assert.ok(quoted > 0, "if nothing is quoted, the licence work bought nothing");
    assert.ok(ourWords > 0, "if nothing is in our own words, the un-quotable sources are missing");
  });

  test("the twelve professions are the published population, and every declared spec is one of them", () => {
    assert.equal(VARIANTS.length, 12);
    for (const [, spec] of SPECS_UNDER_TEST) assert.ok(VARIANTS.includes(spec.variant), spec.variant);
  });
});

describe(`🔴 a claim's SCOPE decides where it lives — measured on ${MEASURED_SLUG}`, () => {
  test("the three kinds are named, disjoint, and cover everything repeated", () => {
    const all = new Set(PLACEMENT.allRepeated);
    assert.equal(all.size, PLACEMENT.universal.length + PLACEMENT.removed.length);
    for (const id of PLACEMENT.allRepeated) assert.ok(all.has(id), id);
    // disjoint: a claim cannot be universal AND owed a layer
    for (const id of PLACEMENT.universal) assert.ok(!PLACEMENT.removed.includes(id), id);
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
    const placed = placeClaims(MEASURED, PLACEMENT.removed);
    const left = placed.sections.flatMap((s) => s.claims);
    for (const id of PLACEMENT.universal) assert.ok(left.includes(id), `${id} must stay`);
  });

  test("🔴 out-of-scope claims render on NO page, and there is NO trailer", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const placed = placeClaims(MEASURED, PLACEMENT.removed);
    // A trailer hinting at a destination is how "awaiting its layer" quietly
    // becomes "behind a link" in somebody's summary six weeks from now.
    assert.equal(placed.trailer, null);
    const rendered = renderPage(placed, records, NOW).trace.map((t) => t.claimId);
    for (const id of PLACEMENT.removed) assert.ok(!rendered.includes(id), `${id} still renders`);
  });

  test("every removed claim names the layer it is waiting for, and that layer does NOT exist", () => {
    assert.equal(PLACEMENT.awaiting.length, PLACEMENT.removed.length);
    for (const a of PLACEMENT.awaiting) {
      assert.ok(PLACEMENT.removed.includes(a.claim), a.claim);
      assert.equal(a.exists, false, "no layer exists yet, and the record must say so");
      assert.ok(a.layer.length > 10 && a.becomes.length > 20, a.claim);
    }
  });

  test("the placed page still holds enough facts for Gate A", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const { trace } = renderPage(placeClaims(MEASURED, PLACEMENT.removed), records, NOW);
    assert.ok(trace.length >= 5, `only ${trace.length} facts left`);
    assert.equal(trace.length, 14);
  });

  test("🔴 the shared half is a property of the PAGE, not of the ruling", async () => {
    // This bit once: pointing the overlap set at PLACEMENT.universal alone moved
    // the AS-BUILT baseline from 0.3921 to 0.1927, because the origin and
    // destination claims ARE on that page and ARE identical across the twelve.
    // A measurement that changes because a RULING changed is measuring the ruling.
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const asBuilt = renderPage(MEASURED, records, NOW).trace.map((t) => t.claimId);
    const repeatedOnAsBuilt = asBuilt.filter((id) => PLACEMENT.allRepeated.includes(id));
    assert.equal(repeatedOnAsBuilt.length, 7, "all seven are repeated on the as-built page");
    const placed = renderPage(placeClaims(MEASURED, PLACEMENT.removed), records, NOW).trace.map((t) => t.claimId);
    assert.equal(placed.filter((id) => PLACEMENT.allRepeated.includes(id)).length, 2, "only the universals remain");
  });
});
