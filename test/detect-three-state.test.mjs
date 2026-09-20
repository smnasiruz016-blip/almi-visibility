/**
 * THE SIX DETECTORS, EACH PROVED IN ALL THREE STATES ON SYNTHETIC FIXTURES.
 *
 * 🔴 EVERY FIXTURE HERE IS INVENTED FOR THIS FILE. Nothing is copied or derived from any corpus,
 * exhibit or captured page: the hosts are `example.invalid`, the identifiers are letters, the values
 * are shapes. A detector tuned against the material it will be examined on has not been tested — it
 * has been fitted.
 *
 * The three states are not three nice-to-haves. A detector with no FINDING state finds nothing; one
 * with no CLEAN state flags everything; one with no UNKNOWN state converts its own blindness into
 * an answer, and under a scoring model where "unflagged" earns a pass, that is the dangerous one.
 */
import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { detectClaimVsProducer } from "../src/detect/claim-producer.mjs";
import { detectClaimVsRegistry } from "../src/detect/claim-registry.mjs";
import { detectDeclaredVsServed } from "../src/detect/declared-served.mjs";
import { detectSitemapVsObserved } from "../src/detect/sitemap-observed.mjs";
import { detectCountVsData } from "../src/detect/count-data.mjs";
import { detectSourceLinkVsRendered } from "../src/detect/link-render.mjs";
import { finding, clean, unknown, notApplicable, assertOutcome, OUTCOMES } from "../src/detect/outcome.mjs";

const only = (list) => { assert.equal(list.length, 1, `expected exactly one outcome, got ${list.length}`); return list[0]; };

describe("A · claim versus the data or code that produces it", () => {
  const producers = [{ id: "p1", locator: "src/thing.ext", producedValues: ["w", "x", "y"] }];
  test("FINDING — a value is stated that the producer can never produce", () => {
    const o = only(detectClaimVsProducer({
      claims: [{ id: "c1", locator: "page/one", statedValues: ["w", "x", "y", "z"] }],
      producers, bindings: { c1: ["p1"] },
    }));
    assert.equal(o.outcome, "FINDING");
    assert.equal(o.defectClass, "claim-not-supported-by-producer");
    assert.ok(o.evidence.some((e) => e.includes("z")), "the evidence must name the unsupported value");
  });
  test("CLEAN — every stated value is producible, and it says what it checked", () => {
    const o = only(detectClaimVsProducer({
      claims: [{ id: "c1", locator: "page/one", statedValues: ["w", "x"] }],
      producers, bindings: { c1: ["p1"] },
    }));
    assert.equal(o.outcome, "CLEAN");
    assert.ok(o.checked.length > 0);
  });
  test("UNKNOWN — nothing is bound, and the absent side is not read as an empty side", () => {
    assert.equal(only(detectClaimVsProducer({ claims: [{ id: "c1", statedValues: ["w"] }], producers, bindings: {} })).outcome, "UNKNOWN");
    assert.equal(only(detectClaimVsProducer({ claims: [{ id: "c1", statedValues: ["w"] }], producers: [], bindings: { c1: ["p9"] } })).outcome, "UNKNOWN");
    assert.equal(only(detectClaimVsProducer({})).outcome, "UNKNOWN");
  });
});

describe("B · authority claim versus the source registry — the two absences kept apart", () => {
  const claim = { id: "c1", locator: "page/one", authority: "body-a", predicate: "pred-a", statedValue: "v1" };
  test("FINDING — the registry WAS read and holds nothing for the claim", () => {
    const o = only(detectClaimVsRegistry({ claims: [claim], registry: { readable: true, records: [{ authority: "body-b", predicate: "pred-z", value: "v9" }] } }));
    assert.equal(o.outcome, "FINDING");
    assert.equal(o.defectClass, "authority-claim-without-registry-evidence");
    assert.ok(o.evidence.some((e) => e.includes("registry READ")), "it must record that the registry was actually read");
  });
  test("CLEAN — an agreeing record exists", () => {
    const o = only(detectClaimVsRegistry({ claims: [claim], registry: { readable: true, records: [{ authority: "body-a", predicate: "pred-a", value: "v1" }] } }));
    assert.equal(o.outcome, "CLEAN");
  });
  test("🔴 UNKNOWN — the registry could not be READ, which is a different world from holding nothing", () => {
    const o = only(detectClaimVsRegistry({ claims: [claim], registry: { readable: false, unreadableReason: "not supplied" } }));
    assert.equal(o.outcome, "UNKNOWN");
    assert.equal(o.reasonCode, "REGISTRY_UNREADABLE");
    assert.equal(only(detectClaimVsRegistry({ claims: [claim] })).outcome, "UNKNOWN");
  });
  test("🔴 an EMPTY registry that was READ is a measurement — it finds, it does not shrug", () => {
    const o = only(detectClaimVsRegistry({ claims: [claim], registry: { readable: true, records: [] } }));
    assert.equal(o.outcome, "FINDING", "an empty-but-read registry must not be confused with an unreadable one");
  });
  test("a contradicting record is its own class, never folded into absence", () => {
    const o = only(detectClaimVsRegistry({ claims: [claim], registry: { readable: true, records: [{ authority: "body-a", predicate: "pred-a", value: "different" }] } }));
    assert.equal(o.defectClass, "authority-claim-contradicted-by-registry");
  });
});

describe("C · declared mode versus the state actually served", () => {
  const miss = { headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } };
  const hit = { headers: { "x-vercel-cache": "HIT", "cache-control": "public, max-age=60" } };
  test("FINDING — declared CACHED, a full run of misses", () => {
    const o = only(detectDeclaredVsServed({ routes: [{ id: "r1", locator: "/a", declaredMode: "CACHED", responses: [miss, miss, miss] }], missRunRequired: 3 }));
    assert.equal(o.outcome, "FINDING");
    assert.equal(o.defectClass, "declared-mode-contradicted-by-served-state");
  });
  test("CLEAN — declared CACHED and served from cache", () => {
    assert.equal(only(detectDeclaredVsServed({ routes: [{ id: "r1", locator: "/a", declaredMode: "CACHED", responses: [hit, hit, hit] }], missRunRequired: 3 })).outcome, "CLEAN");
  });
  test("🔴 one miss is not a cache measurement — below the required run it stays CLEAN", () => {
    assert.equal(only(detectDeclaredVsServed({ routes: [{ id: "r1", declaredMode: "CACHED", responses: [miss] }], missRunRequired: 3 })).outcome, "CLEAN");
  });
  test("UNKNOWN — no responses, no cache headers, or no declared threshold", () => {
    assert.equal(only(detectDeclaredVsServed({ routes: [{ id: "r1", declaredMode: "CACHED", responses: [] }], missRunRequired: 3 })).outcome, "UNKNOWN");
    assert.equal(only(detectDeclaredVsServed({ routes: [{ id: "r1", declaredMode: "CACHED", responses: [{ headers: {} }] }], missRunRequired: 3 })).outcome, "UNKNOWN");
    assert.equal(only(detectDeclaredVsServed({ routes: [{ id: "r1", declaredMode: "CACHED", responses: [miss] }] })).outcome, "UNKNOWN", "an absent threshold must not default");
  });
});

describe("D · sitemap membership versus the observed state", () => {
  const url = "https://example.invalid/a";
  test("FINDING — the sitemap advertises a URL that does not resolve", () => {
    const o = only(detectSitemapVsObserved({ sitemapUrls: [url], observations: { [url]: { status: 404 } } }));
    assert.equal(o.outcome, "FINDING");
    assert.equal(o.defectClass, "sitemap-entry-contradicted-by-observed-state");
  });
  test("CLEAN — advertised, resolves, indexable, self-canonical", () => {
    assert.equal(only(detectSitemapVsObserved({ sitemapUrls: [url], observations: { [url]: { status: 200, noindexed: false, robotsAllowed: true, canonical: url, hasContent: true } } })).outcome, "CLEAN");
  });
  test("🔴 UNKNOWN — advertised but never fetched: unmeasured, never healthy", () => {
    const o = only(detectSitemapVsObserved({ sitemapUrls: [url], observations: {} }));
    assert.equal(o.outcome, "UNKNOWN");
    assert.equal(o.reasonCode, "INPUT_ABSENT");
  });
  test("a redirect and a foreign canonical are both findings", () => {
    assert.equal(only(detectSitemapVsObserved({ sitemapUrls: [url], observations: { [url]: { status: 301, redirectTo: "https://example.invalid/b" } } })).outcome, "FINDING");
    assert.equal(only(detectSitemapVsObserved({ sitemapUrls: [url], observations: { [url]: { status: 200, canonical: "https://example.invalid/b" } } })).outcome, "FINDING");
  });
});

describe("E · a stated count versus the collection behind it", () => {
  test("FINDING — states 3, the data holds 4", () => {
    const o = only(detectCountVsData({ statements: [{ id: "s1", locator: "page/one", statedCount: 3, collectionRef: "k" }], collections: { k: [1, 2, 3, 4] } }));
    assert.equal(o.outcome, "FINDING");
    assert.ok(o.evidence.some((e) => e.includes("actual: 4")));
  });
  test("CLEAN — the number matches", () => {
    assert.equal(only(detectCountVsData({ statements: [{ id: "s1", statedCount: 4, collectionRef: "k" }], collections: { k: [1, 2, 3, 4] } })).outcome, "CLEAN");
  });
  test("UNKNOWN — unbound statement, absent collection, or a count that is not a number", () => {
    assert.equal(only(detectCountVsData({ statements: [{ id: "s1", statedCount: 3 }], collections: {} })).outcome, "UNKNOWN");
    assert.equal(only(detectCountVsData({ statements: [{ id: "s1", statedCount: 3, collectionRef: "missing" }], collections: {} })).outcome, "UNKNOWN");
    assert.equal(only(detectCountVsData({ statements: [{ id: "s1", statedCount: "three", collectionRef: "k" }], collections: { k: [] } })).outcome, "UNKNOWN");
  });
});

describe("F · a source-declared link versus the rendered body", () => {
  const base = { id: "p1", locator: "page/one", sourceLinks: ["/a", "/b"] };
  test("FINDING — a declared link is absent from a COMPLETE render", () => {
    const o = only(detectSourceLinkVsRendered({ pages: [{ ...base, renderedLinks: ["/a"], renderState: "COMPLETE" }] }));
    assert.equal(o.outcome, "FINDING");
    assert.ok(o.evidence.some((e) => e.includes("/b")));
  });
  test("CLEAN — every declared link is present, trailing slashes and fragments normalised", () => {
    assert.equal(only(detectSourceLinkVsRendered({ pages: [{ ...base, renderedLinks: ["/a/", "/b#x"], renderState: "COMPLETE" }] })).outcome, "CLEAN");
  });
  test("🔴 UNKNOWN — the render did not COMPLETE, so absence from the DOM establishes nothing", () => {
    for (const state of ["PARTIAL", "FAILED"]) {
      const o = only(detectSourceLinkVsRendered({ pages: [{ ...base, renderedLinks: [], renderState: state, renderReason: "a resource was refused" }] }));
      assert.equal(o.outcome, "UNKNOWN", state);
      assert.equal(o.reasonCode, "RENDER_NOT_COMPLETE");
    }
  });
  test("🔴 an absent render state does NOT default to COMPLETE — and is told apart from PARTIAL", () => {
    const o = only(detectSourceLinkVsRendered({ pages: [{ ...base, renderedLinks: [] }] }));
    assert.equal(o.outcome, "UNKNOWN");
    /* 🔴 THE REASON CODE IS THE ASSERTION. Both an absent state and a PARTIAL render answer
     * UNKNOWN, so checking only the outcome would pass even if the absent case fell through to the
     * PARTIAL branch — which is a permissive default wearing the right answer's clothes. */
    assert.equal(o.reasonCode, "INPUT_ABSENT", "an absent render state fell through to the incomplete-render branch");
    assert.match(o.detail, /supplies no default/);
    const partial = only(detectSourceLinkVsRendered({ pages: [{ ...base, renderedLinks: [], renderState: "PARTIAL" }] }));
    assert.equal(partial.reasonCode, "RENDER_NOT_COMPLETE");
    assert.notEqual(o.reasonCode, partial.reasonCode, "the two UNKNOWNs must be distinguishable");
  });
});

describe("🔴 the outcome type refuses everything that is not one of the four", () => {
  test("null, undefined and a bare object are all refused at the boundary", () => {
    for (const v of [null, undefined, {}, { outcome: "OK" }, 7, "CLEAN"]) {
      assert.throws(() => assertOutcome(v, { detector: "d", subject: "s" }), /must answer|not one of/);
    }
    assert.deepEqual(OUTCOMES, ["FINDING", "CLEAN", "UNKNOWN", "NOT_APPLICABLE"]);
  });

  test("🔴 NOT_APPLICABLE is distinguishable from UNKNOWN, and must say what it looked for", () => {
    const na = notApplicable({ detector: "d", subject: "s", reasonCode: "NO_CANDIDATE_OF_THIS_KIND", examined: ["scanned 0 candidates"], summary: "nothing of this kind here" });
    const un = unknown({ detector: "d", subject: "s", reasonCode: "INPUT_ABSENT", detail: "a candidate was found and could not be bound" });
    assert.equal(na.outcome, "NOT_APPLICABLE");
    assert.equal(un.outcome, "UNKNOWN");
    assert.notEqual(na.outcome, un.outcome, "the two absences must never collapse into one");
    /* 🔴 It is not scored, so it must not be the cheapest way to make an input vanish. */
    assert.throws(() => notApplicable({ detector: "d", subject: "s", reasonCode: "NO_CANDIDATE_OF_THIS_KIND", examined: [], summary: "x" }), /indistinguishable from never looking/);
    assert.throws(() => notApplicable({ detector: "d", subject: "s", reasonCode: "NOPE", examined: ["x"], summary: "x" }), /add it to NOT_APPLICABLE_REASONS/);
  });
  test("🔴 a FINDING without evidence and a CLEAN without what it checked are both refused", () => {
    assert.throws(() => finding({ detector: "d", subject: "s", defectClass: "c", evidence: [], summary: "x" }), /unevidenced finding/);
    assert.throws(() => clean({ detector: "d", subject: "s", checked: [], summary: "x" }), /silent pass/);
    assert.throws(() => unknown({ detector: "d", subject: "s", reasonCode: "NOPE", detail: "x" }), /add it to UNKNOWN_REASONS/);
    assert.throws(() => unknown({ detector: "d", subject: "s", reasonCode: "INPUT_ABSENT", detail: "" }), /category, not a reason/);
  });
});
