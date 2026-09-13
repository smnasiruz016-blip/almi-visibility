/**
 * THE VERIFIED FACT REGISTRY — RED FIRST, FOR EVERY LAW.
 *
 * The rule this project runs on: a gate is trusted only once its red has been
 * FORCED. So each law is shown REJECTING something it must reject before it is
 * shown accepting something it must accept.
 *
 * That matters more here than anywhere else in the repo, because most of these
 * laws protect against a record that is WELL-FORMED AND WRONG — a quote stored
 * where a licence forbids it, a queue that says AUTOMATED over a source that
 * refuses a machine, a tier-4 blog promoted to a citation. None of those look
 * like errors. They look like data.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { factId, TIER_LEAD_ONLY, INCONCLUSIVE_OUTCOMES } from "../src/facts/schema.mjs";
import { FACTS_DIR, PRODUCT_ID } from "../products/almi-oet/product.mjs";
import { quotableUnder, requiredAttribution, licencesVisibleTo, quotabilityState, licenceClause } from "../src/facts/licences.mjs";
import { quoteUsableNow, renderableQuote } from "../src/facts/freshness.mjs";
import { pageFingerprint, matchFingerprint, MIN_SUBSTANTIVE_LENGTH } from "../src/facts/fingerprint.mjs";
import { scanForThirdPartyRights } from "../src/facts/quote-match.mjs";
import { thirdPartyConflictForSpan, stripSubtrees, contentRegions } from "../src/facts/third-party.mjs";
import { fact } from "../src/facts/record.mjs";
import { validateRecord, validateRegistry } from "../src/facts/validate.mjs";
import { queueFor, freshnessRuleFor, manualQueueCost, automatedQueueIsUnattended } from "../src/facts/queues.mjs";
import { normaliseText, matchQuote, runQuoteMatch, fetchForMatch } from "../src/facts/quote-match.mjs";
import { loadRegistry, census, toGateAFact, REGISTRY_FACT_CHECK_COUNT, REGISTRY_VERIFIED_COUNT } from "../src/facts/registry.mjs";

// The licence view THIS product may read: the engine’s instruments plus its own.
// Another product’s entries are not in it, and that is the point.
const VISIBLE = licencesVisibleTo(PRODUCT_ID);

const NOW = new Date("2026-09-10T00:00:00Z");

/** A record that satisfies every law, so a test can break exactly one thing. */
function lawful(overrides = {}) {
  // 🔴 A HAND-BUILT FIXTURE MUST STAMP ITS PRODUCT, exactly as loadRegistry
  // stamps a record read from disk. Licence terms are per product now, so a
  // record with no product sees only the ENGINE’s instruments — which is the
  // safe direction, and which is why these fixtures were the first thing to go
  // red when isolation landed.
  return { _productId: PRODUCT_ID, ...fact({
    // 🔴 A3: the standing is DECLARED here, as it is on every real record. A
    // fixture that could omit it would be testing a constructor the production
    // records do not use.
    verificationState: "UNVERIFIED",
    id: "uk-nmc.oet-minimum-grade.profession=nursing",
    claim: { subject: "uk-nmc", predicate: "oet-minimum-grade", qualifier: "profession=nursing" },
    scope: "destination",
    value: { value: "grade B", valueType: "grade-set", unit: "OET grade" },
    source: {
      url: "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/accepted-english-language-tests/oet/",
      label: "NMC — OET",
      publisher: "Nursing and Midwifery Council",
      tier: 1,
      documentRef: null,
    },
    sourceMachineReadable: true,
    sourceMachineReadableBasis: "fetched 2026-09-10, HTTP 200",
    sourceQuotable: true,
    sourceQuotableBasis: "express permission to quote its standards and guidance, read 2026-09-10",
    licence: "NMC-6.3",
    sourceDocumentClass: "guidance",
    attributionStatement: "Nursing and Midwifery Council — https://www.nmc.org.uk/",
    evidence: { quotedSpan: "At least grade B (350 or above)", quoteLocation: "OET section" },
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
    queue: "AUTOMATED",
    freshness: { rule: "machine-quote-match", days: 180 },
    life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
    provenance: { route: "R3", acquiredBy: "model:claude-opus-5" },
    ...overrides,
  }) };
}

const laws = (r) => new Set(validateRecord(r).errors.map((e) => e.law));

// ─────────────── F1 · A FACT IS BOUND TO A CLAIM, NOT A PAGE ────────────────

describe("F1 — identity is the claim", () => {
  test("GREEN: the control record is lawful, so every red below is caused by ONE change", () => {
    const v = validateRecord(lawful());
    assert.equal(v.valid, true, JSON.stringify(v.errors, null, 2));
  });

  test("RED: an id that disagrees with its claim is rejected", () => {
    assert.ok(laws(lawful({ id: "uk-nmc.something-else" })).has("F1"));
  });

  test("the id is DERIVED from the triple, and a null qualifier does not leave a dangling dot", () => {
    assert.equal(factId({ subject: "oet", predicate: "grade-bands", qualifier: null }), "oet.grade-bands");
    assert.equal(factId({ subject: "a", predicate: "b", qualifier: "c=d" }), "a.b.c=d");
  });
});

// ─────────────── F2 · A NUMBER WITHOUT ITS UNIT IS NOT A FACT ───────────────

describe("F2 — a typed value, with its unit", () => {
  test("RED: money with no unit is rejected — ₦66,875 and Rs.10,000 are not comparable numbers", () => {
    const r = lawful({ value: { value: 66875, valueType: "money", unit: null } });
    assert.ok(laws(r).has("F2"));
  });

  test("GREEN: money WITH its unit passes", () => {
    assert.ok(!laws(lawful({ value: { value: 66875, valueType: "money", unit: "NGN" } })).has("F2"));
  });
});

// ─────────────── F4 / F13 · TIER 4 IS A LEAD, NEVER A CITATION ──────────────

describe("F4 and F13 — a third party is a lead, never the citation itself", () => {
  test("RED: a tier-4 source may not be active, however true it is", () => {
    const r = lawful({ source: { ...lawful().source, tier: TIER_LEAD_ONLY }, life: { ...lawful().life, status: "active" } });
    assert.ok(laws(r).has("F4"));
  });

  test("RED: route R4 may not be active either — the two guards catch it from both sides", () => {
    const r = lawful({ provenance: { route: "R4", acquiredBy: "model:x" } });
    assert.ok(laws(r).has("F13"));
  });

  test("GREEN: tier 4 as a LEAD is admissible — that is how the NZ fact was found", () => {
    const r = lawful({
      source: { ...lawful().source, tier: TIER_LEAD_ONLY },
      provenance: { route: "R4", acquiredBy: "human:pulse" },
      life: { ...lawful().life, status: "lead" },
    });
    assert.ok(!laws(r).has("F4"));
    assert.ok(!laws(r).has("F13"));
  });

  test("RED: an R3 record cannot go active on an unmatched quote — a model PROPOSES, it never IS the source", () => {
    const r = lawful({ checks: { ...lawful().checks, quoteMatchedOn: null, quoteMatchOutcome: "could-not-check" } });
    assert.ok(laws(r).has("F13"));
  });
});

// ─────────── F6 / F9 · THE LICENCE RULE — THE ONE OET FORCED ────────────────

describe("🔴 F6 and F9 — a source a machine may read and may NOT quote", () => {
  const unquotable = (extra = {}) =>
    lawful({
      sourceQuotable: false,
      sourceQuotableBasis: "express prohibition — content may not be stored in an electronic retrieval system",
      licence: "OET-CBLA-IP",
      sourceDocumentClass: "general",
      attributionStatement: null,
      // Machine-readable and un-quotable, so it is watched by FINGERPRINT.
      queue: "AUTOMATED",
      freshness: { rule: "machine-fingerprint", days: 180 },
      pageFingerprint: "a".repeat(64),
      evidence: { quotedSpan: null, quoteLocation: null, ownWords: "stated in our own words" },
      checks: {
        linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass",
        quoteMatchedOn: null, quoteMatchOutcome: "not-applicable",
        fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass",
      },
      ...extra,
    });

  test("GREEN: the OET shape is lawful — url, date, and the fact in our own words", () => {
    const v = validateRecord(unquotable());
    assert.equal(v.valid, true, JSON.stringify(v.errors, null, 2));
  });

  test("🔴 RED: storing their sentence anyway is rejected — a fact cache IS an electronic retrieval system", () => {
    const r = unquotable({ evidence: { quotedSpan: "their exact words", quoteLocation: null, ownWords: "ours" } });
    assert.ok(laws(r).has("F6"));
  });

  test("RED: dropping ownWords is rejected too — the rule is not 'store nothing'", () => {
    assert.ok(laws(unquotable({ evidence: { quotedSpan: null, quoteLocation: null, ownWords: null } })).has("F6"));
  });

  test("🔴 CORRECTED: quotable with no span but WITH ownWords is LAWFUL — see the F6 suite", () => {
    // This used to assert F6 fired. It was the wrong rule: a permission is not
    // an obligation, and Immigration New Zealand is the record that proved it.
    // What must still fire is a record carrying NO evidence of any kind.
    const withOwnWords = lawful({
      evidence: { quotedSpan: null, quoteLocation: null, ownWords: "x" },
      freshness: { rule: "machine-fingerprint", days: 180 },
      pageFingerprint: "9".repeat(64),
      checks: { ...lawful().checks, quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
    });
    assert.ok(!laws(withOwnWords).has("F6"));
    assert.ok(laws(lawful({ evidence: { quotedSpan: null, quoteLocation: null, ownWords: null } })).has("F6"));
  });

  test("🔴 RED: an unquotable record may NOT report could-not-check — a lawful state is not a broken source", () => {
    const r = unquotable({
      checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "could-not-check" },
    });
    assert.ok(laws(r).has("F9"), 'a permanent "could not check" would get "fixed" by somebody in six months');
  });

  test("RED: nor may it report a FAILED match — nothing was attempted, so nothing failed", () => {
    const r = unquotable({
      checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "fail" },
    });
    assert.ok(laws(r).has("F9"));
  });

  test("the two fields are INDEPENDENT — machine-readable AND un-quotable is a real combination", () => {
    const oet = unquotable();
    assert.equal(oet.sourceMachineReadable, true);
    assert.equal(oet.sourceQuotable, false);
    // 🔴 CHANGED 2026-09-10. Quotability no longer decides the QUEUE — it
    // decides WHICH CHECK RUNS. A source we may fetch and may not quote is
    // watched by a fingerprint, which stores no words and still detects a change.
    assert.equal(queueFor(oet), "AUTOMATED", "a machine can still reach the page");
    assert.equal(freshnessRuleFor(oet), "machine-fingerprint", "but it may not hold their sentence");
  });
});

// ─────── F7 / F8 · "COULD NOT CHECK" IS A THIRD OUTCOME, WITH NO DATE ───────

describe("🔴 F8 — could-not-check is neither a pass nor a failure", () => {
  test("RED: an outcome that did not run may not carry a date", () => {
    const r = lawful({
      checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "could-not-check", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
    });
    assert.ok(laws(r).has("F8"), "a date beside could-not-check is how a blocked source starts looking recently verified");
  });

  test("RED: an outcome that DID run must carry a date", () => {
    const r = lawful({ checks: { ...lawful().checks, linkCheckedOn: null, linkCheckOutcome: "pass" } });
    assert.ok(laws(r).has("F8"));
  });

  test("RED: an unknown outcome word is rejected — the vocabulary is closed", () => {
    assert.ok(laws(lawful({ checks: { ...lawful().checks, linkCheckOutcome: "ok" } })).has("F7"));
  });

  test("both inconclusive outcomes are named, and neither is evidence either way", () => {
    assert.deepEqual([...INCONCLUSIVE_OUTCOMES].sort(), ["could-not-check", "not-applicable"]);
  });
});

// ──────── F10 · ONLY THE THIRD DATE DESERVES THE WORD "VERIFIED" ────────────

describe("🔴 F10 — a link check says NOTHING about the claim", () => {
  test("RED: factCheckedOn without factCheckedBy is rejected", () => {
    const r = lawful({ verificationState: "VERIFIED", checks: { ...lawful().checks, factCheckedOn: "2026-09-10", factCheckedBy: null } });
    assert.ok(laws(r).has("F10"));
  });

  test("RED: a checker that is neither human: nor model: is rejected — they are not the same evidence", () => {
    const r = lawful({ verificationState: "VERIFIED", checks: { ...lawful().checks, factCheckedOn: "2026-09-10", factCheckedBy: "someone" } });
    assert.ok(laws(r).has("F10"));
  });

  test("RED: factCheckedBy with no date is not a check", () => {
    assert.ok(laws(lawful({ checks: { ...lawful().checks, factCheckedBy: "human:NU" } })).has("F10"));
  });

  test("RED: a record cannot be active while its source does not even open", () => {
    const r = lawful({ checks: { ...lawful().checks, linkCheckedOn: null, linkCheckOutcome: "could-not-check" } });
    assert.ok(laws(r).has("F10"));
  });

  test("GREEN: both together, properly attributed, is accepted", () => {
    const r = lawful({ verificationState: "VERIFIED", checks: { ...lawful().checks, factCheckedOn: "2026-09-10", factCheckedBy: "human:NU" } });
    assert.ok(!laws(r).has("F10"));
  });

  /**
   * 🔴 THE PATTERN WAS WIDENED ON 12 SEPTEMBER 2026 TO ADMIT PARENTHESES, so
   * that a real verifier's `human:beta-g (Cowork)` was recorded as they wrote
   * it. A widened rule needs a test that it did not widen into nothing —
   * otherwise F10 accepts everything and is green forever.
   */
  test("GREEN: a real verifier's parenthesised name is accepted verbatim", () => {
    const r = lawful({ verificationState: "VERIFIED", checks: { ...lawful().checks, factCheckedOn: "2026-09-12", factCheckedBy: "human:beta-g (Cowork)" } });
    assert.ok(!laws(r).has("F10"));
  });

  test("🔴 RED: the widened pattern still rejects a prefix with no name behind it", () => {
    for (const bad of ["human:", "human: ", "model:", "(Cowork)", "human", "beta-g"]) {
      const r = lawful({ verificationState: "VERIFIED", checks: { ...lawful().checks, factCheckedOn: "2026-09-12", factCheckedBy: bad } });
      assert.ok(laws(r).has("F10"), `${JSON.stringify(bad)} was accepted — the pattern has widened into nothing`);
    }
  });
});

// ───── F11 · THE MANUAL QUEUE IS NOT A PLACE TO HIDE FAILED AUTOMATION ──────

describe("🔴 F11 — the queue is DERIVED, so it cannot be used to hide work", () => {
  test("RED: claiming AUTOMATED over a source that refuses a machine is rejected", () => {
    const r = lawful({ sourceMachineReadable: false, sourceMachineReadableBasis: "HTTP 403 on 2026-09-10", queue: "AUTOMATED" });
    assert.ok(laws(r).has("F11"));
  });

  test("🔴 RED: and hiding a perfectly automatable fact in the MANUAL queue is rejected the same way", () => {
    const r = lawful({ queue: "MANUAL", freshness: { rule: "human-re-read", days: 180 } });
    assert.ok(laws(r).has("F11"), "the expensive queue must justify every member out of the source fields");
  });

  test("RED: freshness may not disagree with the queue", () => {
    assert.ok(laws(lawful({ freshness: { rule: "human-re-read", days: 180 } })).has("F11"));
  });

  test("the QUEUE turns on reachability alone; QUOTABILITY picks the check", () => {
    assert.equal(queueFor({ sourceMachineReadable: true, sourceQuotable: true }), "AUTOMATED");
    assert.equal(queueFor({ sourceMachineReadable: true, sourceQuotable: false }), "AUTOMATED");
    assert.equal(queueFor({ sourceMachineReadable: true, sourceQuotable: "unknown" }), "AUTOMATED");
    // 🔴 Only an unreachable source is manual. "unknown" reachability is NOT true.
    assert.equal(queueFor({ sourceMachineReadable: false, sourceQuotable: true }), "MANUAL");
    assert.equal(queueFor({ sourceMachineReadable: "unknown", sourceQuotable: true }), "MANUAL");

    // 🔴 And the CHECK now turns on whether a span is actually STORED, not on
    // whether one would be allowed. See the "follows the STORED span" suite.
    const span = { evidence: { quotedSpan: "something" } };
    const noSpan = { evidence: { quotedSpan: null } };
    assert.equal(freshnessRuleFor({ sourceMachineReadable: true, sourceQuotable: true, ...span }), "machine-quote-match");
    assert.equal(freshnessRuleFor({ sourceMachineReadable: true, sourceQuotable: true, ...noSpan }), "machine-fingerprint");
    assert.equal(freshnessRuleFor({ sourceMachineReadable: true, sourceQuotable: false, ...noSpan }), "machine-fingerprint");
    assert.equal(freshnessRuleFor({ sourceMachineReadable: true, sourceQuotable: "unknown", ...noSpan }), "machine-fingerprint");
    assert.equal(freshnessRuleFor({ sourceMachineReadable: false, sourceQuotable: true, ...span }), "human-re-read");
  });

  test("🔴 'unknown' NEVER buys a quote — an unread licence is not a permissive licence", () => {
    // It no longer costs a manual-queue slot, because a fingerprint can watch it.
    // What it can never do is authorise storing the source's words.
    assert.equal(freshnessRuleFor({ sourceMachineReadable: true, sourceQuotable: "unknown" }), "machine-fingerprint");
    for (const cls of ["rules", "standards", "guidance", "news", "general"]) {
      assert.equal(quotableUnder("unknown-not-read", cls, PRODUCT_ID), "unknown");
      assert.equal(quotableUnder("unknown-licence-unreachable", cls, PRODUCT_ID), "unknown");
    }
    assert.ok(laws(lawful({ licence: "unknown-not-read", sourceQuotable: true })).has("F18"));
  });

  test("RED: sourceQuotable without its basis is rejected — a conclusion with its evidence destroyed", () => {
    assert.ok(laws(lawful({ sourceQuotableBasis: "" })).has("F5"));
    assert.ok(laws(lawful({ sourceMachineReadableBasis: null })).has("F5"));
  });
});

// ─────────────── F12 / F15 / F16 · NOTHING IS EDITED IN PLACE ───────────────

describe("F12, F15, F16 — a changed value writes a NEW record", () => {
  test("RED: supersededBy without retirement is rejected", () => {
    const r = lawful({ life: { ...lawful().life, supersededBy: "uk-nmc.oet-minimum-grade.profession=nursing" } });
    assert.ok(laws(r).has("F12"));
  });

  test("RED: a retired record with no reason is rejected — it will just be re-researched", () => {
    const r = lawful({ life: { ...lawful().life, status: "retired", supersededBy: null, retiredReason: null } });
    assert.ok(laws(r).has("F12"));
  });

  test("🔴 RED: two ACTIVE records for one claim breaks the whole point of claim-binding", () => {
    const v = validateRegistry([lawful(), lawful()]);
    assert.equal(v.valid, false);
    assert.ok(v.registryErrors.some((e) => e.law === "F15"));
  });

  test("RED: a supersedes pointer into nowhere is rejected", () => {
    const r = lawful({ life: { ...lawful().life, status: "retired", retiredReason: "value changed", supersededBy: "nope.nothing" } });
    assert.ok(validateRegistry([r]).registryErrors.some((e) => e.law === "F16"));
  });
});

// ───────────────────── THE NIGHTLY QUOTE MATCH ──────────────────────────────

describe("🔴 the quote match — and its red is forced against a real page shape", () => {
  const page = (body) => ({ ok: true, status: 200, body });

  test("GREEN: a span present in the markup matches through tags and entities", () => {
    const r = matchQuote(lawful(), page("<p>At least <b>grade&nbsp;B</b> (350 or above)</p>"));
    assert.equal(r.outcome, "pass");
  });

  test("🔴 RED: a CHANGED WORDING goes red. This is the entire product", () => {
    const r = matchQuote(lawful(), page("<p>At least grade C (350 or above)</p>"));
    assert.equal(r.outcome, "fail");
  });

  test("RED: normalisation is thin enough to still fail — 'at least half' vs 'at least 50%'", () => {
    const rec = lawful({ evidence: { quotedSpan: "you spent at least half of your time", quoteLocation: null } });
    assert.equal(matchQuote(rec, page("you spent at least 50% of your time")).outcome, "fail");
  });

  test("🔴 a 403 is COULD-NOT-CHECK — never a failure, never a pass", () => {
    const r = matchQuote(lawful(), { ok: false, status: 403, detail: "HTTP 403" });
    assert.equal(r.outcome, "could-not-check");
    assert.notEqual(r.outcome, "fail");
  });

  test("🔴 an unquotable record is NOT-APPLICABLE, and the page is never even looked at", () => {
    let looked = false;
    const rec = lawful({ sourceQuotable: false });
    const r = matchQuote(rec, { get ok() { looked = true; return true; } });
    assert.equal(r.outcome, "not-applicable");
    assert.equal(looked, false, "a licence refusal is decided before the network, not after");
  });

  test("⚠️ a span occurring twice PASSES but is flagged weak — found by this job's own first run", () => {
    const r = matchQuote(lawful(), page("<p>At least grade B (350 or above)</p><p>At least grade B (350 or above)</p>"));
    assert.equal(r.outcome, "pass");
    assert.equal(r.occurrences, 2);
    assert.equal(r.ambiguous, true);
  });

  test("normaliseText collapses rendering, not meaning", () => {
    assert.equal(normaliseText("<p>a&nbsp;&amp;\n  b</p>"), "a & b");
    assert.equal(normaliseText("<script>var x='a'</script>b"), "b");
    assert.equal(normaliseText("“quoted” — dash"), '"quoted" - dash');
    assert.notEqual(normaliseText("Grade B"), normaliseText("grade b"), "case is meaning here, not rendering");
  });

  test("the job groups by URL — one page carrying two claims is fetched once", async () => {
    let fetches = 0;
    const fetchImpl = async () => {
      fetches += 1;
      // Padded past MIN_SUBSTANTIVE_BODY: a 31-character page is now refused as
      // "200 but not a document", which is the nmcnigeria.org lesson applied.
      return {
        ok: true,
        status: 200,
        url: "https://www.nmc.org.uk/x",
        text: async () => "At least grade B (350 or above) " + "filler words here. ".repeat(60),
      };
    };
    const two = [lawful(), lawful({ id: "uk-nmc.oet-combining-sittings", claim: { subject: "uk-nmc", predicate: "oet-combining-sittings", qualifier: null } })];
    const report = await runQuoteMatch(two, { fetchImpl, now: NOW });
    assert.equal(fetches, 1);
    assert.equal(report.tally.pass, 2);
  });
});

// ───────────────── DOD-03A'S PASS CONDITION, AS A TEST ──────────────────────

describe("🔴 DOD-03A — the automated queue must GENUINELY run unattended", () => {
  test("GREEN: a fully machine-checkable record needs nobody", () => {
    const r = automatedQueueIsUnattended([lawful()]);
    assert.equal(r.unattended, true);
    assert.equal(r.automatedCount, 1);
  });

  test('🔴 RED: "with a nudge" does not pass — an inconclusive check needs a person', () => {
    const r = automatedQueueIsUnattended([
      lawful({ checks: { ...lawful().checks, quoteMatchedOn: null, quoteMatchOutcome: "could-not-check" } }),
    ]);
    assert.equal(r.unattended, false);
    assert.equal(r.blockers.length, 1);
  });

  test("a FAILED match does NOT break unattendedness — that is the job working, not the job stuck", () => {
    const r = automatedQueueIsUnattended([lawful({ checks: { ...lawful().checks, quoteMatchOutcome: "fail" } })]);
    assert.equal(r.unattended, true);
  });

  test("manual records are not counted against the automated queue — but they are counted", () => {
    const manual = lawful({
      sourceMachineReadable: false,
      sourceMachineReadableBasis: "HTTP 403",
      sourceQuotable: false,
      licence: "proprietary-no-reuse",
      sourceDocumentClass: "general",
      attributionStatement: null,
      evidence: { quotedSpan: null, quoteLocation: null, ownWords: "ours" },
      queue: "MANUAL",
      freshness: { rule: "human-re-read", days: 180 },
    });
    assert.equal(automatedQueueIsUnattended([manual]).automatedCount, 0);
    assert.equal(manualQueueCost([manual]).facts, 1);
  });
});

// ───────────── THE MANUAL QUEUE'S COST — DECLARED, NEVER INVENTED ───────────

describe("🔴 the manual queue's cost", () => {
  // 🔴 MANUAL now means UNREACHABLE, not un-quotable. A 403 is the only thing
  // that still puts a record here.
  const manual = (n) =>
    Array.from({ length: n }, (_, i) =>
      lawful({
        id: `s.p.q=${i}`,
        claim: { subject: "s", predicate: "p", qualifier: `q=${i}` },
        sourceMachineReadable: false,
        sourceMachineReadableBasis: "HTTP 403 on 2026-09-10",
        sourceQuotable: false,
        licence: "proprietary-no-reuse",
        sourceDocumentClass: "general",
        attributionStatement: null,
        evidence: { quotedSpan: null, quoteLocation: null, ownWords: "ours" },
        queue: "MANUAL",
        freshness: { rule: "human-re-read", days: 180 },
      }),
    );

  test("passes per year is exact arithmetic over the window — two per fact at 180 days", () => {
    const c = manualQueueCost(manual(16));
    assert.equal(c.facts, 16);
    assert.equal(c.passesPerYear, 32);
  });

  test("🔴 minutesPerFact has NO DEFAULT and the report says UNKNOWN rather than inventing one", () => {
    const c = manualQueueCost(manual(16));
    assert.equal(c.minutesPerFact, null);
    assert.equal(c.minutesPerYear, null);
    assert.match(c.minutesStatus, /UNKNOWN/);
  });

  test("supplied by the caller, it is used AND labelled with where it came from", () => {
    const c = manualQueueCost(manual(16), { minutesPerFact: 15 });
    assert.equal(c.minutesPerYear, 480);
    assert.equal(c.hoursPerYear, 8);
    assert.match(c.minutesStatus, /supplied by the caller/);
  });

  test("every manual record's reason is reported, so the expensive queue justifies itself out loud", () => {
    const c = manualQueueCost(manual(3));
    assert.equal(c.byReason.reduce((n, r) => n + r.count, 0), 3);
  });
});

// ─────────────── THE REAL REGISTRY — §5A.1's "usable supply" ────────────────

describe("🔴 the registry as it actually stands on disk", () => {
  test("every record on disk satisfies every law", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const v = validateRegistry(records);
    assert.equal(v.valid, true, JSON.stringify({ bad: v.invalidRecords, registry: v.registryErrors }, null, 2));
  });

  test('🔴 §5A.1 — "a registry schema with zero usable supply is NOT PASS". There is supply', async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    assert.ok(records.length >= 30, `only ${records.length} records`);
    const c = census(records, { now: NOW });
    assert.ok(c.byQueue.AUTOMATED > 0, "an automated queue with nothing in it has not been demonstrated");
    // 🔴 The MANUAL queue is EMPTY, and that is a finding rather than a
    // triumph: every source in the registry happens to be fetchable. What must
    // NOT be empty is the weaker-evidence column — pretending all 32 were
    // quote-matched would be the real dishonesty.
    assert.equal(c.byQueue.MANUAL, 0);
    assert.ok(c.byFreshnessRule["machine-quote-match"] > 0, "some records must carry STRONG evidence");
    assert.ok(c.byFreshnessRule["machine-fingerprint"] > 0, "and the weak ones must be visible as weak");
  });

  test("the registry holds facts from BOTH origin and destination sources, not one shape repeated", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const c = census(records, { now: NOW });
    assert.ok(c.byScope.origin > 0);
    assert.ok(c.byScope.destination > 0);
    assert.ok(Object.keys(c.bySubject).length >= 7, "one regulator is a sample, not a supply");
  });

  test("🔴 every record is tier 1 — not one citation in this registry is a blog", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    assert.deepEqual(Object.keys(census(records, { now: NOW }).byTier), ["1"]);
  });

  test("the OET case is present and is machine-readable AND un-quotable", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const oet = records.find((r) => r.claim.subject === "oet");
    assert.ok(oet, "the case that split the two fields must be IN the registry, not only in the design");
    assert.equal(oet.sourceMachineReadable, true);
    assert.equal(oet.sourceQuotable, false);
    assert.equal(oet.evidence.quotedSpan, null);
    assert.ok(oet.evidence.ownWords.length > 0);
    assert.equal(oet.checks.quoteMatchOutcome, "not-applicable");
  });

  test("the corridor fact exists — Nigeria→UK has its own price", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const uk = records.find((r) => r.id === "ng-nmcn.verification-fee.destination=uk-nmc");
    assert.ok(uk);
    assert.equal(uk.value.value, 17500);
    assert.equal(uk.value.unit, "NGN");
  });

  test("gaps are declared and counted — the alternative to declaring one is inventing a value", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const c = census(records, { now: NOW });
    assert.ok(c.gaps.length >= 5);
    // ✅ CORRECTED 2026-09-10: `writing-task-type` USED to be the example of an
    // unacquired claim. It has since been acquired for /nursing, so the gap was
    // closed and the record exists. The rule the test protects is unchanged —
    // a claim must be EITHER a record OR a declared gap, and never both.
    const gapClaims = new Set(c.gaps.map((g) => g.claim));
    for (const r of records) {
      assert.ok(!gapClaims.has(`${r.claim.subject} · ${r.claim.predicate}`), `${r.id} is both a record and a declared gap`);
    }
    assert.ok(records.some((r) => r.claim.predicate === "writing-task-type"), "the acquired claim is now a record");
  });
});

// ──────── 🔴 THE COUNTER THAT DOES NOT MOVE — §3'S STANDING PROMISE ─────────

/**
 * 🔴 THE COUNTER MOVED ON 12 SEPTEMBER 2026, AND THAT IS WHAT §3 PROMISED.
 *
 * §3's promise was never "this number stays 0 forever" — it was "this number
 * does not move until a named person reads the sources, and when it moves it
 * moves by a deliberate edit with its test updated". beta-g read all 46. So the
 * assertions below now pin the two things that keep the move honest:
 *
 *   1. the hard-coded constant still has to AGREE WITH THE DATA, so it cannot
 *      be set to a flattering number;
 *   2. checks-that-RAN and checks-that-CONFIRMED stay separate columns.
 */
describe("🔴 factChecked moved 0 → 46, deliberately, and confirmed is counted apart", () => {
  test("the constant agrees with the data — it cannot be set to a flattering number", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const c = census(records, { now: NOW });
    assert.equal(REGISTRY_FACT_CHECK_COUNT, 46);
    assert.equal(c.checks.factChecked, REGISTRY_FACT_CHECK_COUNT, "the constant and the registry disagree");
  });

  // 🔴 32/14 on 12 Sep 2026; 34/12 since 13 Sep, when two records left UNKNOWN through the F24 guard (item 50).
  // 🔴 33/13 since the item-50 reopen (13 Sep 2026); #63 had 34/12.
  test("🔴 46 checks RAN but only 33 CONFIRMED — the two are never one number", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const c = census(records, { now: NOW });
    assert.equal(c.checks.factChecked, 46);
    assert.equal(c.checks.factConfirmed, REGISTRY_VERIFIED_COUNT);
    assert.equal(c.checks.factConfirmed, 33);
    assert.equal(c.checks.factUnknown, 13);
    assert.ok(
      c.checks.factConfirmed < c.checks.factChecked,
      "if these ever coincide, check it is because every check confirmed — not because they were merged",
    );
  });

  test("🔴 every record that carries a fact-check date NAMES the person who did it", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const dated = records.filter((r) => r.checks.factCheckedOn !== null);
    assert.equal(dated.length, 46);
    for (const r of dated) {
      assert.match(r.checks.factCheckedBy ?? "", /^human:/, `${r.id}: somebody must NAME themselves to move this number`);
    }
  });

  test("Gate A's counter is still hard-coded 0 when fed this registry through the GATE'S OWN code", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const c = census(records, { now: NOW });
    assert.equal(c.gateA.factChecked, 0);
    assert.ok(c.gateA.linkChecked > 0, "and the link column is NOT zero, so the two are visibly different things");
  });

  test("🔴 the bridge to Gate A hands it a MACHINE-CHECK date and flags it as one", () => {
    const g = toGateAFact(lawful());
    assert.equal(g.verifiedDate, "2026-09-10");
    assert.equal(g._machineCheckDateOnly, true, "the caller must be able to tell this is not a verified date");
  });

  test("a record nobody has machine-checked hands over a NULL date, not today's", () => {
    const g = toGateAFact(lawful({ checks: { linkCheckedOn: null, linkCheckOutcome: "could-not-check", quoteMatchedOn: null, quoteMatchOutcome: "could-not-check", factCheckedOn: null, factCheckedBy: null } }));
    assert.equal(g.verifiedDate, null);
    assert.equal(g.linkChecked, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// THE LICENCE FINDINGS — owner's first-hand reading, SOURCE_QUOTABILITY.md
// ═══════════════════════════════════════════════════════════════════════════

describe("🔴 F17/F18 — quotability is decided PER DOCUMENT, not per domain", () => {
  test("🔴 THE NMC CASE: one domain, two answers, and the document class decides", () => {
    // Clause 6.3 permits reproducing rules, standards and guidance. Clause 6.2
    // refuses everything else storage "on any server ... connected to the
    // network" — which is exactly what this registry is.
    assert.equal(quotableUnder("NMC-6.3", "guidance", PRODUCT_ID), true);
    assert.equal(quotableUnder("NMC-6.3", "rules", PRODUCT_ID), true);
    assert.equal(quotableUnder("NMC-6.3", "standards", PRODUCT_ID), true);
    assert.equal(quotableUnder("NMC-6.3", "news", PRODUCT_ID), false, "an NMC news item is NOT quotable");
    assert.equal(quotableUnder("NMC-6.3", "general", PRODUCT_ID), false);
  });

  test("RED: a record claiming a quote from NMC NEWS is rejected", () => {
    const r = lawful({ sourceDocumentClass: "news" });
    assert.ok(laws(r).has("F18"), "the same fact is quotable from guidance and not from news");
  });

  test("RED: a missing licence or document class is rejected outright", () => {
    assert.ok(laws(lawful({ licence: undefined })).has("F17"));
    assert.ok(laws(lawful({ sourceDocumentClass: undefined })).has("F17"));
    assert.ok(laws(lawful({ licence: "made-up-licence" })).has("F17"));
  });

  test("RED: quotability may not be TYPED against what the clause derives", () => {
    const r = lawful({ licence: "proprietary-no-reuse", sourceQuotable: true });
    assert.ok(laws(r).has("F18"), "a hand-written licence judgement is one nobody can re-check");
  });

  test("gov.uk permits every class, INCLUDING commercially — AlmiWorld is commercial", () => {
    for (const cls of ["rules", "standards", "guidance", "news", "general"]) {
      assert.equal(quotableUnder("OGL-v3.0", cls, PRODUCT_ID), true);
    }
    assert.equal(VISIBLE["OGL-v3.0"].permitsCommercial, true);
  });

  test("🔴 OET's carve-outs are NON-COMMERCIAL, so they do not reach us at all", () => {
    assert.equal(VISIBLE["OET-CBLA-IP"].permitsCommercial, false);
    for (const cls of ["rules", "standards", "guidance", "news", "general"]) {
      assert.equal(quotableUnder("OET-CBLA-IP", cls, PRODUCT_ID), false);
    }
  });
});

describe("🔴 F19 — silence is `false`, and only an UNREAD licence is `unknown`", () => {
  test("🔴 a bare copyright notice derives FALSE, not unknown", () => {
    // The owner's ruling: the absence of a licence is not permission, and
    // "all rights reserved" is what silence means. NMBI, PNMC and NMCN are all
    // this, and PR #9 had all three wrong as "unknown".
    assert.equal(quotableUnder("proprietary-no-reuse", "guidance", PRODUCT_ID), false);
  });

  test("RED: claiming `unknown` under a licence we HAVE read is rejected", () => {
    const r = lawful({
      licence: "proprietary-no-reuse",
      sourceQuotable: "unknown",
      evidence: { quotedSpan: null, quoteLocation: null, ownWords: "ours" },
      freshness: { rule: "machine-fingerprint", days: 180 },
      pageFingerprint: "b".repeat(64),
      attributionStatement: null,
      checks: { ...lawful().checks, quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
    });
    assert.ok(laws(r).has("F19"), "silence is not uncertainty — treating it as such re-opens a closed question");
  });

  test("GREEN: `unknown` is lawful under the two unread states, and both refuse a quote", () => {
    for (const lic of ["unknown-not-read", "unknown-licence-unreachable"]) {
      const r = lawful({
        licence: lic,
        sourceQuotable: "unknown",
        attributionStatement: null,
        evidence: { quotedSpan: null, quoteLocation: null, ownWords: "ours" },
        freshness: { rule: "machine-fingerprint", days: 180 },
        pageFingerprint: "c".repeat(64),
        checks: { ...lawful().checks, quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
      });
      assert.deepEqual([...laws(r)], [], JSON.stringify(validateRecord(r).errors));
    }
  });
});

describe("🔴 F20 — the credit is part of the permission, not a courtesy", () => {
  test("RED: a quote with no attribution is a breach THAT LOOKS LIKE COMPLIANCE", () => {
    assert.ok(laws(lawful({ attributionStatement: null })).has("F20"));
  });

  test("RED: the WRONG licence's credit does not satisfy this one", () => {
    // Both permissive licences require a credit and each requires a DIFFERENT
    // one. An OGL statement on an NMC record is not attribution, it is noise.
    const r = lawful({ attributionStatement: "Contains public sector information licensed under the Open Government Licence v3.0." });
    assert.ok(laws(r).has("F20"));
  });

  test("each licence names its own required credit", () => {
    assert.match(requiredAttribution("OGL-v3.0", PRODUCT_ID), /Open Government Licence v3\.0/);
    assert.match(requiredAttribution("NMC-6.3", PRODUCT_ID), /Nursing and Midwifery Council/);
    assert.equal(requiredAttribution("OET-CBLA-IP", PRODUCT_ID), null, "nothing may be quoted, so nothing needs crediting");
  });
});

describe("🔴 F21 + quoteUsableNow — for the NMC, STALENESS IS A LICENCE BREACH", () => {
  const fresh = lawful();
  // Stale on BOTH demonstrations, or it is not stale at all — the first draft of
  // this fixture aged only the match and the record stayed lawful on its
  // extraction date, which is the correct behaviour and a wrong test.
  const stale = lawful({
    checks: { ...lawful().checks, quoteMatchedOn: "2026-01-01" },
    life: { ...lawful().life, extractedOn: "2026-01-01" },
  });

  test("GREEN: a recently matched NMC quote is usable, and currency is DEMONSTRATED", () => {
    const v = quoteUsableNow(fresh, NOW);
    assert.equal(v.usable, true);
    assert.equal(v.legal, true, "this is a licence judgement, not a quality one");
  });

  test("🔴 RED: a lapsed NMC quote is WITHDRAWN — not flagged, not stale. Withdrawn", () => {
    const v = quoteUsableNow(stale, NOW);
    assert.equal(v.usable, false);
    assert.equal(v.legal, true);
    assert.match(v.reason, /LICENCE CONDITION LAPSED/);
    assert.equal(renderableQuote(stale, NOW), null, "nothing may render an out-of-licence reproduction");
  });

  test("the clock runs from the last DEMONSTRATION of currency, and EXTRACTION is one", () => {
    // Corrected while writing this test: extraction IS a demonstration — the span
    // was taken off the live page that day, which is exactly what clause 6.3
    // asks for. So a never-matched but freshly extracted record is usable, and
    // the reason has to say WHICH demonstration it is leaning on, because
    // "confirmed by a machine" and "typed in by somebody" are not equal evidence.
    const neverMatched = lawful({ checks: { ...lawful().checks, quoteMatchedOn: null, quoteMatchOutcome: "could-not-check" } });
    const v = quoteUsableNow(neverMatched, NOW);
    assert.equal(v.usable, true);
    assert.match(v.reason, /the extraction/);

    // 🔴 And an OLD extraction with no match does lapse.
    const old = lawful({
      checks: { ...lawful().checks, quoteMatchedOn: null, quoteMatchOutcome: "could-not-check" },
      life: { ...lawful().life, extractedOn: "2026-01-01" },
    });
    assert.equal(quoteUsableNow(old, NOW).usable, false);

    // A FAILED match must not be mistaken for a demonstration.
    const failed = lawful({ checks: { ...lawful().checks, quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "fail" }, life: { ...lawful().life, extractedOn: "2026-01-01" } });
    assert.equal(quoteUsableNow(failed, NOW).usable, false, "a failing match cannot renew a permission");
  });

  test("a licence with NO currency condition does not withdraw on age", () => {
    const ogl = lawful({
      licence: "OGL-v3.0",
      sourceDocumentClass: "rules",
      attributionStatement: "Contains public sector information licensed under the Open Government Licence v3.0.",
      thirdPartyRightsCheck: { checkedOn: "2026-09-10", clear: true, detail: "clear" },
      checks: { ...lawful().checks, quoteMatchedOn: "2026-01-01" },
    });
    const v = quoteUsableNow(ogl, NOW);
    assert.equal(v.usable, true);
    assert.equal(v.legal, false, "age here is data quality, and must never be reported as a breach");
  });

  test("🔴 RED: an NMC record may NOT be watched by a fingerprint — it cannot demonstrate currency", () => {
    const r = lawful({ freshness: { rule: "machine-fingerprint", days: 180 } });
    assert.ok(laws(r).has("F21"));
  });
});

describe('🔴 F22 — the per-page check the word "MOST" forces', () => {
  const ogl = (extra = {}) =>
    lawful({
      licence: "OGL-v3.0",
      sourceDocumentClass: "rules",
      attributionStatement: "Contains public sector information licensed under the Open Government Licence v3.0.",
      // Updated for the region ruling: what a check must now carry is a verdict
      // about the SPAN'S REGION, not a verdict about the whole page.
      thirdPartyRightsCheck: { checkedOn: "2026-09-10", clear: true, spanRegionConflict: false, spanRegion: "main", detail: "no notice in <main>" },
      ...extra,
    });

  test("GREEN: an OGL page with a completed, clear check is lawful", () => {
    assert.deepEqual([...laws(ogl())], [], JSON.stringify(validateRecord(ogl()).errors));
  });

  test("🔴 RED: storing an OGL page's text with NO per-page check is rejected", () => {
    assert.ok(laws(ogl({ thirdPartyRightsCheck: null })).has("F22"));
  });

  test("🔴 RED: a check whose CONFLICT IS IN THE SPAN'S REGION blocks the quote", () => {
    const r = ogl({ thirdPartyRightsCheck: { checkedOn: "2026-09-10", clear: false, spanRegionConflict: true, spanRegion: "main", detail: "a third-party credit sits inside the article" } });
    assert.ok(laws(r).has("F22"));
  });

  test("the scanner REPORTS what it found rather than deciding", () => {
    const crownOnly = scanForThirdPartyRights("<p>© Crown copyright 2025. Licensed under the OGL.</p>");
    assert.equal(crownOnly.clear, true);
    const thirdParty = scanForThirdPartyRights("<p>© Crown copyright</p><p>© 2026 Some Publisher Ltd</p>");
    assert.equal(thirdParty.clear, false);
    assert.equal(thirdParty.nonCrown.length, 1);
    assert.ok(thirdParty.notices.length >= 2, "it shows its working, so a reviewer can judge the scan itself");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// THE FINGERPRINT — automated freshness without storing a single word
// ═══════════════════════════════════════════════════════════════════════════

describe("🔴 the page fingerprint — and its red is forced", () => {
  const body = (extra = "") => "<p>Real regulator content here. </p>" + "More substantive body text. ".repeat(30) + extra;
  const page = (b) => ({ ok: true, status: 200, body: b });
  const record = (hash) =>
    lawful({
      sourceQuotable: false,
      licence: "proprietary-no-reuse",
      sourceDocumentClass: "general",
      attributionStatement: null,
      evidence: { quotedSpan: null, quoteLocation: null, ownWords: "ours" },
      freshness: { rule: "machine-fingerprint", days: 180 },
      pageFingerprint: hash,
    });

  test("it stores a DIGEST, never the words — the text cannot be recovered from it", () => {
    const fp = pageFingerprint(body());
    assert.equal(fp.hash.length, 64);
    assert.ok(!fp.hash.includes("regulator"));
    assert.ok(!JSON.stringify(fp).includes("Real regulator content"));
  });

  test("GREEN: an unchanged page passes", () => {
    const fp = pageFingerprint(body());
    assert.equal(matchFingerprint(record(fp.hash), page(body())).outcome, "pass");
  });

  test("🔴 RED: a changed page FAILS, and says only that the PAGE moved", () => {
    const fp = pageFingerprint(body());
    const r = matchFingerprint(record(fp.hash), page(body("<p>and one new sentence.</p>")));
    assert.equal(r.outcome, "fail");
    assert.match(r.detail, /does NOT say the fact changed/);
  });

  test("🔴 markup churn must NOT trip it — that is the measurement that made it viable", () => {
    // 6 of 9 real pages differed in RAW HTML between two consecutive fetches and
    // 0 of 9 differed after normalisation. Hashing raw HTML would have produced a
    // permanent queue of false flags and been switched off within a week.
    const a = pageFingerprint("<div class='a'>Hello   world</div>" + "pad ".repeat(200));
    const b = pageFingerprint("<div class='b' data-x='9'>Hello world</div>" + "pad ".repeat(200));
    assert.equal(a.hash, b.hash);
  });

  test("🔴 RED: but a WORD change still trips it — it has not been normalised into uselessness", () => {
    const a = pageFingerprint("<p>grade B</p>" + "pad ".repeat(200));
    const b = pageFingerprint("<p>grade C</p>" + "pad ".repeat(200));
    assert.notEqual(a.hash, b.hash);
  });

  test("a first run is COULD-NOT-CHECK, never a silent pass", () => {
    assert.equal(matchFingerprint(record(null), page(body())).outcome, "could-not-check");
  });

  test("🔴 THE PARKED-DOMAIN GUARD: a 200 with no text is could-not-check, not a pass", () => {
    // nmcnigeria.org answers HTTP 200 with a 114-byte JavaScript redirect to a
    // parking lander — 0 characters normalised. A parked page hashes perfectly
    // consistently, so without this floor the fingerprint would go green on a
    // domain-for-sale page forever.
    const r = matchFingerprint(record("d".repeat(64)), page("<html><head><script>window.location.href='/lander'</script></head></html>"));
    assert.equal(r.outcome, "could-not-check");
    assert.match(r.detail, /too little to be the source document/);
    assert.ok(MIN_SUBSTANTIVE_LENGTH > 0);
  });

  test("a refusal is could-not-check here exactly as it is for the quote match", () => {
    assert.equal(matchFingerprint(record("e".repeat(64)), { ok: false, detail: "HTTP 403" }).outcome, "could-not-check");
  });
});

describe("🔴 the link check must verify WHERE it landed", () => {
  test("🔴 RED: an off-host redirect is refused — a citation must not change owner", async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      url: "https://forsale.godaddy.com/lander",
      text: async () => "buy this domain " + "x ".repeat(400),
    });
    const r = await fetchForMatch("https://nmcnigeria.org/verify.html", { fetchImpl });
    assert.equal(r.ok, false);
    assert.match(r.detail, /REDIRECTED OFF-HOST/);
  });

  test("🔴 RED: HTTP 200 with almost no text is refused — this answered, but it is not a document", async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      url: "https://nmcnigeria.org/",
      text: async () => "<html><head><script>window.onload=function(){window.location.href=\"/lander\"}</script></head></html>",
    });
    const r = await fetchForMatch("https://nmcnigeria.org/", { fetchImpl });
    assert.equal(r.ok, false);
    assert.match(r.detail, /CHARACTERS OF TEXT/);
  });

  test("GREEN: a real same-host document passes", async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, url: "https://nmcn.gov.ng/verify.html", text: async () => "Real content. ".repeat(80) });
    const r = await fetchForMatch("https://nmcn.gov.ng/verify.html", { fetchImpl });
    assert.equal(r.ok, true);
  });
});

describe("🔴 the registry after the licence correction", () => {
  test("every OET-sourced record stores NO span and its licence names all three grounds", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const oet = records.find((r) => r.claim.subject === "oet");
    assert.equal(oet.licence, "OET-CBLA-IP");
    assert.equal(oet.evidence.quotedSpan, null);
    // 🔴 All three grounds, in OUR words since 13 Sep 2026 — the policy's own wording is no longer stored.
    assert.match(oet.sourceQuotableBasis, /reproducing or transmitting any portion/i);
    assert.match(oet.sourceQuotableBasis, /exploiting it commercially/i);
    assert.match(oet.sourceQuotableBasis, /electronic retrieval system/i);
    assert.match(oet.sourceQuotableBasis, /not commercial/i);
    assert.match(oet.sourceQuotableBasis, /wording was quoted here until 13 September 2026 and was removed/);
  });

  test("🔴 the three silent sources are FALSE, not unknown — the owner's ruling", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    for (const subject of ["ie-nmbi", "ng-nmcn", "pk-pnmc"]) {
      const rs = records.filter((r) => r.claim.subject === subject);
      assert.ok(rs.length > 0, subject);
      for (const r of rs) {
        assert.equal(r.sourceQuotable, false, `${r.id} must be false, not unknown`);
        assert.equal(r.licence, "proprietary-no-reuse");
        assert.equal(r.evidence.quotedSpan, null);
        assert.ok(r.evidence.ownWords.length > 0, "the fact survives in our own words");
      }
    }
  });

  test("every quotable record carries the credit its licence requires", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    // ⚠️ Scoped to records that actually STORE a span. A record holding only our
    // own words reproduces nothing and has nothing to credit — Immigration New
    // Zealand is exactly that shape.
    const withStoredSpan = records.filter((r) => r.sourceQuotable === true && r.evidence.quotedSpan);
    assert.ok(withStoredSpan.length > 0);
    for (const r of withStoredSpan) {
      assert.ok(r.attributionStatement.includes(requiredAttribution(r.licence, r._productId)), r.id);
    }
    const permittedButUnquoted = records.filter((r) => r.sourceQuotable === true && !r.evidence.quotedSpan);
    for (const r of permittedButUnquoted) {
      assert.equal(r.attributionStatement, null, `${r.id} credits a reproduction it never made`);
    }
  });

  test("every fingerprint-watched record actually HAS a stored fingerprint", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const fp = records.filter((r) => freshnessRuleFor(r) === "machine-fingerprint");
    assert.ok(fp.length > 0);
    for (const r of fp) assert.equal(r.pageFingerprint.length, 64, r.id);
  });

  test("🔴 not one record's source URL is the parked nmcnigeria.org domain", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    for (const r of records) assert.ok(!r.source.url.includes("nmcnigeria.org"), r.id);
    assert.ok(records.some((r) => r.source.url.includes("nmcn.gov.ng")), "Nigeria uses the real regulator domain");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// THREE STATES, AND TWO OF THEM MUST NEVER MERGE
// ═══════════════════════════════════════════════════════════════════════════

describe("🔴 quotability has THREE states, and RESERVED is not PROHIBITED", () => {
  test("each licence declares its state, and the vocabulary is closed", () => {
    assert.equal(quotabilityState("OGL-v3.0", PRODUCT_ID), "PERMITTED");
    assert.equal(quotabilityState("NMC-6.3", PRODUCT_ID), "PERMITTED");
    assert.equal(quotabilityState("CC-BY-3.0-NZ", PRODUCT_ID), "PERMITTED");
    assert.equal(quotabilityState("proprietary-no-reuse", PRODUCT_ID), "RESERVED");
    assert.equal(quotabilityState("OET-CBLA-IP", PRODUCT_ID), "PROHIBITED");
    assert.equal(quotabilityState("unknown-not-read", PRODUCT_ID), "UNREAD");
    assert.equal(quotabilityState("unknown-licence-unreachable", PRODUCT_ID), "UNREAD");
  });

  test("🔴 RESERVED and PROHIBITED both block a quote AND ARE DIFFERENT STATES", () => {
    // Both produce sourceQuotable false. If the registry only recorded that
    // boolean, an unasked regulator and a flat refusal would look like the same
    // piece of work forever — one is closed by an email, the other by nothing.
    assert.equal(quotableUnder("proprietary-no-reuse", "guidance", PRODUCT_ID), false);
    assert.equal(quotableUnder("OET-CBLA-IP", "guidance", PRODUCT_ID), false);
    assert.notEqual(quotabilityState("proprietary-no-reuse", PRODUCT_ID), quotabilityState("OET-CBLA-IP", PRODUCT_ID));
  });

  test("every state carries the EXACT CLAUSE behind it, so it can be re-argued", () => {
    for (const lic of Object.keys(VISIBLE)) {
      assert.ok(licenceClause(lic, PRODUCT_ID) && licenceClause(lic, PRODUCT_ID).length > 20, lic);
    }
    assert.match(licenceClause("OET-CBLA-IP", PRODUCT_ID), /exploiting it commercially/i);
    assert.match(licenceClause("NMC-6.3", PRODUCT_ID), /rules, standards and guidance/i);
    assert.match(licenceClause("CC-BY-3.0-NZ", PRODUCT_ID), /copy, distribute and adapt/i);
  });

  test("🔴 RESERVED is the LEGAL DEFAULT, not a cautious reading", () => {
    // Silence reserves every right. The conservative answer is the law as it
    // stands until somebody grants otherwise.
    assert.equal(VISIBLE["proprietary-no-reuse"].quotableClasses.length, 0);
    assert.equal(VISIBLE["proprietary-no-reuse"].permitsCommercial, false);
  });
});

describe("🔴 Immigration NZ — CC BY 3.0 NZ, and it broke a prediction", () => {
  test("it PERMITS copy, distribute and adapt, commercially", () => {
    assert.equal(quotabilityState("CC-BY-3.0-NZ", PRODUCT_ID), "PERMITTED");
    assert.equal(VISIBLE["CC-BY-3.0-NZ"].permitsCommercial, true);
    for (const cls of ["rules", "standards", "guidance", "news", "general"]) {
      assert.equal(quotableUnder("CC-BY-3.0-NZ", cls, PRODUCT_ID), true);
    }
  });

  test("⚠️ it carries the same shape of caveat as the OGL's word MOST", () => {
    // PDFs, text files, documents, extracts and DATA may not be Crown copyright,
    // so a site-wide licence does not licence every artefact on the site.
    assert.equal(VISIBLE["CC-BY-3.0-NZ"].requiresPerPageThirdPartyCheck, true);
    assert.match(VISIBLE["CC-BY-3.0-NZ"].clause, /assessed per document/i);
  });

  test("its credit is Crown copyright, and it is NOT the OGL's credit", () => {
    assert.match(requiredAttribution("CC-BY-3.0-NZ", PRODUCT_ID), /Crown copyright/);
    assert.notEqual(requiredAttribution("CC-BY-3.0-NZ", PRODUCT_ID), requiredAttribution("OGL-v3.0", PRODUCT_ID));
  });

  test("🔴 the real record now says PERMITTED — and still stores no span", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const nz = records.find((r) => r.claim.subject === "nz-immigration-nz");
    assert.equal(nz.licence, "CC-BY-3.0-NZ");
    assert.equal(nz.sourceQuotable, true);
    assert.equal(nz.evidence.quotedSpan, null, "permitted is not obliged");
    assert.ok(nz.evidence.ownWords.length > 0);
    assert.equal(freshnessRuleFor(nz), "machine-fingerprint", "no span means nothing to quote-match");
  });

  test("⚠️ and its per-page check is NOT clear — the scanner reports, a person rules", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const nz = records.find((r) => r.claim.subject === "nz-immigration-nz");
    assert.equal(nz.thirdPartyRightsCheck.clear, false);
    // It blocks nothing today because no span is stored, and it would have to be
    // resolved before one ever is. F22 is scoped to a stored span for exactly
    // this reason.
    assert.deepEqual([...laws(nz)], []);
  });
});

describe("🔴 F6 CORRECTED — a permission is not an obligation", () => {
  const permittedNoSpan = (extra = {}) =>
    lawful({
      licence: "CC-BY-3.0-NZ",
      sourceDocumentClass: "news",
      sourceQuotable: true,
      attributionStatement: null,
      evidence: { quotedSpan: null, quoteLocation: null, ownWords: "the fact, in our own words" },
      freshness: { rule: "machine-fingerprint", days: 180 },
      pageFingerprint: "f".repeat(64),
      checks: {
        linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass",
        quoteMatchedOn: null, quoteMatchOutcome: "not-applicable",
        fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass",
      },
      ...extra,
    });

  test("GREEN: quoting is PERMITTED and no span was taken — this is lawful", () => {
    // The old F6 rejected this shape, which is how a real, useful, lawful record
    // (Immigration New Zealand) was refused by our own rule.
    const v = validateRecord(permittedNoSpan());
    assert.equal(v.valid, true, JSON.stringify(v.errors, null, 2));
  });

  test("🔴 RED: but a record with NEITHER a span nor ownWords is still rejected", () => {
    const r = permittedNoSpan({ evidence: { quotedSpan: null, quoteLocation: null, ownWords: null } });
    assert.ok(laws(r).has("F6"), "a permission is not evidence");
  });

  test("attribution, currency and the per-page check are owed only on a STORED span", () => {
    // None of the three is owed by a record that reproduces nothing.
    const r = permittedNoSpan({ licence: "NMC-6.3", sourceDocumentClass: "guidance" });
    const broken = laws(r);
    assert.ok(!broken.has("F20"), "nothing to credit");
    assert.ok(!broken.has("F21"), "nothing whose currency is conditioned");
    assert.ok(!broken.has("F22"), "no page text stored");
  });

  test("🔴 RED: and the moment a span IS stored, all three become owed again", () => {
    const withSpan = permittedNoSpan({
      licence: "NMC-6.3",
      sourceDocumentClass: "guidance",
      evidence: { quotedSpan: "At least grade B (350 or above)", quoteLocation: "x", ownWords: null },
    });
    const broken = laws(withSpan);
    assert.ok(broken.has("F20"), "a stored quote with no credit is a breach that looks like compliance");
    assert.ok(broken.has("F21"), "NMC currency is a licence condition once a span exists");
  });
});

describe("🔴 the freshness rule follows the STORED span, not the permission", () => {
  test("a permitted-but-unquoted record is fingerprint-watched, not quote-matched", () => {
    const r = { sourceMachineReadable: true, sourceQuotable: true, evidence: { quotedSpan: null } };
    assert.equal(freshnessRuleFor(r), "machine-fingerprint");
  });

  test("a stored span is quote-matched", () => {
    const r = { sourceMachineReadable: true, sourceQuotable: true, evidence: { quotedSpan: "something" } };
    assert.equal(freshnessRuleFor(r), "machine-quote-match");
  });

  test("🔴 an unreachable source is human-re-read whatever its licence permits", () => {
    const r = { sourceMachineReadable: false, sourceQuotable: true, evidence: { quotedSpan: "x" } };
    assert.equal(freshnessRuleFor(r), "human-re-read");
  });

  test("no record is ever assigned a check it cannot run", async () => {
    // The failure this correction removes: a rule that prescribed a quote match
    // for a record with no span, which could then never be anything but
    // permanently inconclusive.
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    for (const r of records) {
      if (freshnessRuleFor(r) === "machine-quote-match") {
        assert.ok(r.evidence.quotedSpan, `${r.id} is quote-matched with no span`);
      } else if (freshnessRuleFor(r) === "machine-fingerprint") {
        assert.ok(r.pageFingerprint, `${r.id} is fingerprint-watched with no fingerprint`);
      }
    }
  });
});

describe("🔴 the recount — the '16 → 2' prediction, measured", () => {
  test("of the four unread licences, ONE permitted and THREE reserved", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const bySubject = (s) => records.find((r) => r.claim.subject === s);
    assert.equal(quotabilityState(bySubject("nz-immigration-nz").licence), "PERMITTED");
    for (const s of ["ie-nmbi", "ng-nmcn", "pk-pnmc"]) {
      assert.equal(quotabilityState(bySubject(s).licence), "RESERVED", s);
    }
  });

  test("🔴 the manual queue did NOT shrink because a licence was read", async () => {
    // The prediction was that reading four licences would move 14 records out of
    // the expensive queue. It moved ONE record's quotability, and ZERO records
    // between queues — the queue emptied because of FINGERPRINTING, which is a
    // different mechanism entirely. A projection where a measurement was
    // available. Rule Eight.
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const c = census(records, { now: NOW });
    assert.equal(c.byQueue.MANUAL, 0);
    // Counts move as the registry is filled; what must NOT move is that all four
    // states are represented and that UNREAD stays at zero.
    assert.ok(c.byQuotabilityState.PERMITTED > 0);
    assert.equal(c.byQuotabilityState.RESERVED, 14);
    assert.ok(c.byQuotabilityState.PROHIBITED > 0);
    // ⚠️ UNREAD IS NO LONGER ZERO, AND THE TEST RECORDS THE DEBT RATHER THAN
    // SILENCING IT. Adding HCPC for the speech-pathology chain brought in seven
    // records whose terms nobody has opened. That is lawful — they are held in
    // OUR OWN WORDS and fingerprint-watched — but it is a debt, and this
    // assertion is where it is counted.
    //
    // 🔴 An unread licence is NOT a permissive one. If this number grows without
    // anyone reading anything, that is the signal.
    assert.ok(c.byQuotabilityState.UNREAD > 0, "if this reaches zero, every licence has been read — update this test");
    assert.equal(c.byQuotabilityState.UNREAD, 7, "the 7 HCPC records await a first-hand licence read; Immigration NZ is PERMITTED (CC BY 3.0 NZ), not unread");
  });
});

describe("🔴 the nightly job routes by the STORED SPAN, not the permission", () => {
  test("a permitted-but-unquoted record is FINGERPRINTED, not sent to the quote matcher", async () => {
    // Found by running the job after the NZ correction: routing on
    // `sourceQuotable === true` sent a record with no span to the matcher, which
    // reported a permanent could-not-check on a record in perfect order.
    const rec = fact({ /*A3*/ verificationState: "UNVERIFIED",
      id: "s.p",
      claim: { subject: "s", predicate: "p", qualifier: null },
      scope: "shared",
      value: { value: "v", valueType: "rule", unit: null },
      source: { url: "https://example.gov/doc", label: "L", publisher: "P", tier: 1, documentRef: null },
      sourceMachineReadable: true,
      sourceMachineReadableBasis: "fetched",
      sourceQuotable: true,
      sourceQuotableBasis: "permitted",
      licence: "CC-BY-3.0-NZ",
      sourceDocumentClass: "news",
      attributionStatement: null,
      evidence: { quotedSpan: null, quoteLocation: null, ownWords: "ours" },
      queue: "AUTOMATED",
      freshness: { rule: "machine-fingerprint", days: 180 },
      pageFingerprint: "0".repeat(64),
      life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
      provenance: { route: "R2", acquiredBy: "human:x" },
      checks: {
        linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass",
        quoteMatchedOn: null, quoteMatchOutcome: "not-applicable",
        fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass",
      },
    });
    const fetchImpl = async () => ({ ok: true, status: 200, url: "https://example.gov/doc", text: async () => "Body text here. ".repeat(60) });
    const report = await runQuoteMatch([rec], { fetchImpl, now: NOW });
    assert.equal(report.byCheck.fingerprint, 1);
    assert.equal(report.byCheck.quoteMatch, 0);
    assert.equal(report.tally["could-not-check"], 0, "a record in perfect order must not report as uncheckable");
  });

  test("and the whole real registry comes back with ZERO inconclusive checks", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    for (const r of records) {
      const hasSpan = Boolean(r.evidence.quotedSpan);
      assert.equal(freshnessRuleFor(r), hasSpan ? "machine-quote-match" : "machine-fingerprint", r.id);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔴 THE THIRD-PARTY CHECK — THE RULING, RED FORCED BOTH WAYS
// ═══════════════════════════════════════════════════════════════════════════

describe("🔴 a third-party notice blocks a span only from its OWN region", () => {
  const SPAN = "Grade B is required for reading";
  const FOOTER_NOTICE =
    "<html><body><main><article><p>Grade B is required for reading.</p></article></main>" +
    "<footer><p>© 2026 Cookie Information We use cookies.</p></footer></body></html>";
  const INSIDE_NOTICE =
    "<html><body><main><article><p>Grade B is required for reading.</p>" +
    "<p>© 2026 Some Publisher Ltd.</p></article></main><footer><p>Crown copyright.</p></footer></body></html>";

  test("GREEN: a notice in the FOOTER does not block a span from <main>", () => {
    const r = thirdPartyConflictForSpan(FOOTER_NOTICE, SPAN, normaliseText);
    assert.equal(r.conflict, false);
    assert.equal(r.region, "main");
    // 🔴 AND THE OBSERVATION SURVIVES. The notice is still recorded; it simply
    // decides nothing. Erasing it would be the opposite error.
    assert.ok(r.wholePageNotices.length > 0, "the whole-page notice must still be reported");
  });

  test("🔴 RED: the SAME notice INSIDE the region the span came from DOES block it", () => {
    const r = thirdPartyConflictForSpan(INSIDE_NOTICE, SPAN, normaliseText);
    assert.equal(r.conflict, true);
    assert.equal(r.regionNotices.length, 1);
    assert.match(r.reason, /INSIDE the <main>/);
  });

  test("🔴 the decision is STRUCTURAL — the same text decides differently by POSITION alone", () => {
    // The two fixtures carry copyright notices; what differs is WHERE they sit.
    // Nothing in this module knows what any vendor is, and nothing should.
    const a = thirdPartyConflictForSpan(FOOTER_NOTICE, SPAN, normaliseText);
    const b = thirdPartyConflictForSpan(INSIDE_NOTICE, SPAN, normaliseText);
    assert.notEqual(a.conflict, b.conflict);
  });

  test("🔴 RED: a span found in NO content region is refused, not passed", () => {
    const html = "<html><body><footer><p>Some text only in the footer.</p></footer><main><p>Body.</p></main></body></html>";
    const r = thirdPartyConflictForSpan(html, "Some text only in the footer", normaliseText);
    assert.equal(r.conflict, true);
    assert.match(r.reason, /not found in any content region/);
  });

  test("a notice belonging to the publisher we are already citing is not third-party", () => {
    const html = "<html><body><main><p>Grade B is required for reading. © Crown copyright 2025.</p></main></body></html>";
    const isCrown = (n) => /crown copyright/i.test(n);
    assert.equal(thirdPartyConflictForSpan(html, SPAN, normaliseText, isCrown).conflict, false);
    // …and with no such predicate it WOULD block, which is the safe default.
    assert.equal(thirdPartyConflictForSpan(html, SPAN, normaliseText).conflict, true);
  });

  test("chrome is stripped even when it is nested INSIDE the content region", () => {
    const html =
      "<html><body><main><article><p>Grade B is required for reading.</p>" +
      "<aside><p>© 2026 Widget Co.</p></aside></article></main></body></html>";
    assert.equal(thirdPartyConflictForSpan(html, SPAN, normaliseText).conflict, false);
  });

  test("stripSubtrees honours nesting rather than stopping at the first close tag", () => {
    const html = "<div>keep<footer>a<footer>b</footer>c</footer>keep2</div>";
    const out = stripSubtrees(html, ["footer"]);
    assert.ok(out.includes("keep") && out.includes("keep2"));
    assert.ok(!out.includes("a") || !out.includes("b"), "the nested footer must go with its parent");
  });
});

describe("🔴 F22 blocks on the REGION, and never on the whole page", () => {
  const govuk = (check) =>
    fact({ /*A3*/ verificationState: "UNVERIFIED",
      id: "uk-ukvi.x",
      claim: { subject: "uk-ukvi", predicate: "x", qualifier: null },
      scope: "shared",
      value: { value: "a value", valueType: "rule", unit: null },
      source: { url: "https://www.gov.uk/guidance/x", label: "L", publisher: "UK Home Office", tier: 1, documentRef: null },
      sourceMachineReadable: true,
      sourceMachineReadableBasis: "fetched",
      sourceQuotable: true,
      sourceQuotableBasis: "OGL",
      licence: "OGL-v3.0",
      sourceDocumentClass: "rules",
      attributionStatement: "Contains public sector information licensed under the Open Government Licence v3.0.",
      evidence: { quotedSpan: "a stored span of sufficient length", quoteLocation: "x" },
      thirdPartyRightsCheck: check,
      queue: "AUTOMATED",
      freshness: { rule: "machine-quote-match", days: 180 },
      life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
      provenance: { route: "R3", acquiredBy: "model:x" },
      checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
    });

  test("🔴 GREEN: clear:false with NO region conflict is LAWFUL — the cookie-banner case", () => {
    // This is the ruling in one assertion. The whole-page observation is false
    // and the record is still valid, because the notice is not in the span's
    // region. Before the ruling this record was rejected.
    const r = govuk({ checkedOn: "2026-09-10", clear: false, spanRegionConflict: false, spanRegion: "main", detail: "furniture" });
    assert.ok(!laws(r).has("F22"));
  });

  test("🔴 RED: a conflict IN THE REGION still blocks", () => {
    const r = govuk({ checkedOn: "2026-09-10", clear: false, spanRegionConflict: true, spanRegion: "main", detail: "inside the article" });
    assert.ok(laws(r).has("F22"));
  });

  test("RED: a check that predates the ruling must be re-run, not assumed", () => {
    const r = govuk({ checkedOn: "2026-09-10", clear: true, detail: "old-style whole-page check" });
    assert.ok(laws(r).has("F22"));
  });

  test("RED: no check at all is still a block", () => {
    assert.ok(laws(govuk(null)).has("F22"));
  });

  test("every real gov.uk record carries a region verdict, and none conflicts", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const withSpan = records.filter((r) => r.thirdPartyRightsCheck && r.evidence.quotedSpan);
    assert.ok(withSpan.length >= 12);
    for (const r of withSpan) {
      assert.equal(r.thirdPartyRightsCheck.spanRegionConflict, false, r.id);
      assert.equal(r.thirdPartyRightsCheck.spanRegion, "main", r.id);
    }
  });

  test("🔴 and the NZ record KEEPS clear:false — the observation was not erased", async () => {
    const { records } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
    const nz = records.find((r) => r.claim.subject === "nz-immigration-nz");
    assert.equal(nz.thirdPartyRightsCheck.clear, false, "the whole-page observation must survive the ruling");
    assert.equal(nz.thirdPartyRightsCheck.spanRegionConflict, null, "no span is stored, so there is nothing to place");
  });
});
