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
import { fact } from "../src/facts/record.mjs";
import { validateRecord, validateRegistry } from "../src/facts/validate.mjs";
import { queueFor, freshnessRuleFor, manualQueueCost, automatedQueueIsUnattended } from "../src/facts/queues.mjs";
import { normaliseText, matchQuote, runQuoteMatch } from "../src/facts/quote-match.mjs";
import { loadRegistry, census, toGateAFact, REGISTRY_FACT_CHECK_COUNT } from "../src/facts/registry.mjs";

const NOW = new Date("2026-09-10T00:00:00Z");

/** A record that satisfies every law, so a test can break exactly one thing. */
function lawful(overrides = {}) {
  return fact({
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
    evidence: { quotedSpan: "At least grade B (350 or above)", quoteLocation: "OET section" },
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: "2026-09-10", quoteMatchOutcome: "pass" },
    queue: "AUTOMATED",
    freshness: { rule: "machine-quote-match", days: 180 },
    life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
    provenance: { route: "R3", acquiredBy: "model:claude-opus-5" },
    ...overrides,
  });
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
      queue: "MANUAL",
      freshness: { rule: "human-re-read", days: 180 },
      evidence: { quotedSpan: null, quoteLocation: null, ownWords: "stated in our own words" },
      checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable" },
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

  test("RED: sourceQuotable true with NO span is rejected — that is the field the design turns on", () => {
    assert.ok(laws(lawful({ evidence: { quotedSpan: null, quoteLocation: null, ownWords: "x" } })).has("F6"));
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
    assert.equal(queueFor(oet), "MANUAL", "readable but unquotable still costs a person");
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
    const r = lawful({ checks: { ...lawful().checks, factCheckedOn: "2026-09-10", factCheckedBy: null } });
    assert.ok(laws(r).has("F10"));
  });

  test("RED: a checker that is neither human: nor model: is rejected — they are not the same evidence", () => {
    const r = lawful({ checks: { ...lawful().checks, factCheckedOn: "2026-09-10", factCheckedBy: "someone" } });
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
    const r = lawful({ checks: { ...lawful().checks, factCheckedOn: "2026-09-10", factCheckedBy: "human:NU" } });
    assert.ok(!laws(r).has("F10"));
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

  test("the derivation needs BOTH permissions, and 'unknown' is not one of them", () => {
    assert.equal(queueFor({ sourceMachineReadable: true, sourceQuotable: true }), "AUTOMATED");
    assert.equal(queueFor({ sourceMachineReadable: true, sourceQuotable: false }), "MANUAL");
    assert.equal(queueFor({ sourceMachineReadable: false, sourceQuotable: true }), "MANUAL");
    assert.equal(queueFor({ sourceMachineReadable: "unknown", sourceQuotable: true }), "MANUAL");
    assert.equal(queueFor({ sourceMachineReadable: true, sourceQuotable: "unknown" }), "MANUAL");
    assert.equal(freshnessRuleFor({ sourceMachineReadable: true, sourceQuotable: true }), "machine-quote-match");
  });

  test("🔴 'unknown' is the EXPENSIVE answer, so nobody can reach for it to make work cheaper", () => {
    const unknown = { sourceMachineReadable: true, sourceQuotable: "unknown" };
    assert.equal(queueFor(unknown), "MANUAL");
    assert.equal(manualQueueCost([unknown]).facts, 1);
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
      return { ok: true, status: 200, text: async () => "At least grade B (350 or above)" };
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
    const manual = lawful({ sourceQuotable: false, queue: "MANUAL", freshness: { rule: "human-re-read", days: 180 } });
    assert.equal(automatedQueueIsUnattended([manual]).automatedCount, 0);
    assert.equal(manualQueueCost([manual]).facts, 1);
  });
});

// ───────────── THE MANUAL QUEUE'S COST — DECLARED, NEVER INVENTED ───────────

describe("🔴 the manual queue's cost", () => {
  const manual = (n) =>
    Array.from({ length: n }, (_, i) =>
      lawful({
        id: `s.p.q=${i}`,
        claim: { subject: "s", predicate: "p", qualifier: `q=${i}` },
        sourceQuotable: false,
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
    const { records } = await loadRegistry();
    const v = validateRegistry(records);
    assert.equal(v.valid, true, JSON.stringify({ bad: v.invalidRecords, registry: v.registryErrors }, null, 2));
  });

  test('🔴 §5A.1 — "a registry schema with zero usable supply is NOT PASS". There is supply', async () => {
    const { records } = await loadRegistry();
    assert.ok(records.length >= 30, `only ${records.length} records`);
    const c = census(records, { now: NOW });
    assert.ok(c.byQueue.AUTOMATED > 0, "an automated queue with nothing in it has not been demonstrated");
    assert.ok(c.byQueue.MANUAL > 0);
  });

  test("the registry holds facts from BOTH origin and destination sources, not one shape repeated", async () => {
    const { records } = await loadRegistry();
    const c = census(records, { now: NOW });
    assert.ok(c.byScope.origin > 0);
    assert.ok(c.byScope.destination > 0);
    assert.ok(Object.keys(c.bySubject).length >= 7, "one regulator is a sample, not a supply");
  });

  test("🔴 every record is tier 1 — not one citation in this registry is a blog", async () => {
    const { records } = await loadRegistry();
    assert.deepEqual(Object.keys(census(records, { now: NOW }).byTier), ["1"]);
  });

  test("the OET case is present and is machine-readable AND un-quotable", async () => {
    const { records } = await loadRegistry();
    const oet = records.find((r) => r.claim.subject === "oet");
    assert.ok(oet, "the case that split the two fields must be IN the registry, not only in the design");
    assert.equal(oet.sourceMachineReadable, true);
    assert.equal(oet.sourceQuotable, false);
    assert.equal(oet.evidence.quotedSpan, null);
    assert.ok(oet.evidence.ownWords.length > 0);
    assert.equal(oet.checks.quoteMatchOutcome, "not-applicable");
  });

  test("the corridor fact exists — Nigeria→UK has its own price", async () => {
    const { records } = await loadRegistry();
    const uk = records.find((r) => r.id === "ng-nmcn.verification-fee.destination=uk-nmc");
    assert.ok(uk);
    assert.equal(uk.value.value, 17500);
    assert.equal(uk.value.unit, "NGN");
  });

  test("gaps are declared and counted — the alternative to declaring one is inventing a value", async () => {
    const { records } = await loadRegistry();
    const c = census(records, { now: NOW });
    assert.ok(c.gaps.length >= 8);
    assert.equal(records.some((r) => r.claim.predicate === "writing-task-type"), false, "an unacquired claim must NOT appear as a record");
  });
});

// ──────── 🔴 THE COUNTER THAT DOES NOT MOVE — §3'S STANDING PROMISE ─────────

describe("🔴 factChecked stays ZERO, and records existing does not change that", () => {
  test("the registry's own count is zero, and the constant agrees with the data", async () => {
    const { records } = await loadRegistry();
    const c = census(records, { now: NOW });
    assert.equal(c.checks.factChecked, 0);
    assert.equal(REGISTRY_FACT_CHECK_COUNT, 0);
    assert.equal(c.checks.factChecked, REGISTRY_FACT_CHECK_COUNT);
  });

  test("🔴 not one record on disk carries factCheckedOn — link-checked is not read-and-judged", async () => {
    const { records } = await loadRegistry();
    const claimed = records.filter((r) => r.checks.factCheckedOn !== null);
    assert.deepEqual(claimed.map((r) => r.id), [], "somebody must NAME themselves to move this number");
  });

  test("Gate A's counter is still hard-coded 0 when fed this registry through the GATE'S OWN code", async () => {
    const { records } = await loadRegistry();
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
