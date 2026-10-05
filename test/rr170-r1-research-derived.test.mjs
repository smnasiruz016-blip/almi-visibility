/**
 * 🔴 RR-170 · R1 · F16 C27–C32 · RESEARCH-DERIVED QUESTIONS (F16 Acceptance Amendment 5, _handoffs 91ef421; RTP-1 Revision 6 §22).
 *
 * Driven through the PRODUCTION module (src/research/research-derived.mjs), the PRODUCTION entry points (bin/collect-public-questions.mjs for
 * route 1, bin/research-derived-intake.mjs for route 2 and relevance) and the built adapter's own extractor — in a CONFINED copy of the data
 * root (test/helpers/rr170-world.mjs, rr159's helpers lifted verbatim). A FAKE provider and a FAKE source transport only — zero real requests.
 * The adapter stays UNREGISTERED. 🔴 Every question here is a FIXTURE: it proves the mechanism and is never reported as a real question.
 *
 *   T27a–d  C27 accepted with none of the five · three verdicts · no approval field · five fields, never "human", never OBSERVED or demand
 *   T28a–c  C28 neither route → ABSENT · kinds kept apart · an optional reference, with and without, flowing alike
 *   T29a–d  C29 answer prose never evidence · wording GENERATED, never a quote · the attribution pair · no F16 path refuses a sourced draft
 *   T30a–b  C30 no window on the question · an answer's fact past its window flagged
 *   T31     C31 each conversion, to and from each of the five kinds
 *   T32     C32 an owned search query is never a client-received question, research-derived or demand
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { REPO, trailSha, TRAIL_BEFORE, SUBJECT, TODAY, FORMED, SENTINEL, world, planOf, collect, connection, stored, batchFile, intake, ONE, providerText } from "./helpers/rr170-world.mjs";
import * as RD from "../src/research/research-derived.mjs";
import { generatedQuestionsOf } from "../src/research/ai-providers/anthropic.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { intakeQuestions } from "../src/research/public-questions.mjs";
import { judgeFact } from "../src/gate-a/facts.mjs";
import { LEAD_RECORD } from "../src/research/lead-intake.mjs";

const AT = `${TODAY}T00:00:00Z`;
const q1 = (over = {}) => RD.researchDerivedQuestion({ subject: SUBJECT, queryId: FORMED[0].queryId, route: RD.ROUTES.CLIENT_RESEARCH, wording: "How do I plan a family home from abroad?", at: AT, ...over });
const draftFor = (q, over = {}) => ({ questionId: q.question_id, verdict: "RELEVANT", reason: "a person planning to build a home", meaningTest: "is this person seeking to plan, design or build a home", declarationVersion: "descriptor@fixture", source: { kind: "METHOD", ref: "method:fixture-meaning-assessor" }, ...over });
const report = (out) => out.split("\n").find((l) => l.includes("RESEARCH-DERIVED questions:")) ?? "";

test("T27a · C27 — a research-derived question is ACCEPTED with none of the five: no link, no quote, no research date, no proof anyone asked, no demand category", () => {
  const W = world();
  try {
    /* five route-2 rows, each answering a FORMED question and each WITHOUT one more of the five — and none carries any of them */
    const rows = FORMED.slice(0, 5).map((f, i) => ({ formedQueryId: f.queryId, wording: `FIXTURE route-2 question ${i}: how do I start?` }));
    for (const r of rows) for (const k of ["link", "reference", "quote", "observedDate", "date", "proof", "demandCategories"]) assert.ok(!Object.hasOwn(r, k));
    const k = intake(W, { results: rows });
    assert.equal(k.r.status, 0, k.out);
    const rd = stored(W, "research-derived-questions.jsonl");
    assert.equal(rd.length, 5, `each missing item must still flow on — ${k.out}`);
    for (const q of rd) {
      assert.equal(q.record_type, RD.RESEARCH_DERIVED_RECORD);
      assert.equal(q.tier, "RESEARCH-DERIVED");
      assert.equal(q.reference, null, "a reference was invented where none was given");
    }
    assert.match(k.out, /research-derived 5 · client claims 0 · owned search evidence kept apart 0 · refused 0/, "a row was refused for a missing item");
  } finally { W.cleanup(); }
});

test("T27b · C27 — three controls give the three verdicts: relevant → RELEVANT (carried forward), irrelevant → REJECTED, unclear → HELD; only RELEVANT leaves F16", () => {
  const W = world();
  try {
    const rows = ["relevant", "irrelevant", "unclear"].map((x, i) => ({ formedQueryId: FORMED[i].queryId, wording: `FIXTURE ${x} question?` }));
    const k1 = intake(W, { results: rows });
    assert.equal(k1.r.status, 0, k1.out);
    const rd = stored(W, "research-derived-questions.jsonl");
    const by = (w) => rd.find((q) => q.wording.text.includes(w));
    const drafts = [draftFor(by("relevant")), draftFor(by("irrelevant"), { verdict: "REJECTED", reason: "not about building a home" }), draftFor(by("unclear"), { verdict: "HELD", reason: "meaning unclear" })];
    const k2 = intake(W, { drafts });
    assert.equal(k2.r.status, 0, k2.out);
    assert.match(report(k2.out), /RESEARCH-DERIVED questions: 3/);
    assert.match(k2.out, /relevance: RELEVANT 1 \(carried forward\) · HELD 1 .* · REJECTED 1 \(irrelevant\)/, "the three verdicts were not kept apart");
    const as = stored(W, "relevance-assessments.jsonl");
    assert.equal(RD.relevanceOf(by("unclear").question_id, as), "HELD", "an unclear question was not held");
    const carried = RD.carriedForward(rd, as);
    assert.deepEqual(carried.map((q) => q.question_id), [by("relevant").question_id], "a HELD or REJECTED question was handed on, or the RELEVANT one was not");
    /* an unassessed question is HELD — never carried forward by default */
    assert.equal(RD.relevanceOf("never-assessed", as), "HELD");
  } finally { W.cleanup(); }
});

test("T27c · C27 — no approval field exists anywhere on the path: an assessment carrying one is REFUSED by name; no record has one", () => {
  const q = q1();
  const plain = RD.assessmentRecord({ question: q, draft: draftFor(q), at: AT });
  assert.equal(plain.outcome, "RECORDED", "CONTROL: a plain assessment was refused");
  for (const draft of [draftFor(q, { approvedBy: "actor:owner" }), draftFor(q, { approval: true }), draftFor(q, { source: { kind: "METHOD", ref: "m", approver: "x" } })]) {
    const r = RD.assessmentRecord({ question: q, draft, at: AT });
    assert.equal(r.outcome, "REFUSED", "an assessment with an approval field was accepted");
    assert.equal(r.code, "AN_ASSESSMENT_IS_NEVER_AN_APPROVAL");
  }
  const keys = (o) => (o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => [k, ...keys(v)]) : []);
  for (const rec of [q, plain.record, RD.researchDerivedQuestion({ subject: SUBJECT, queryId: "q", route: RD.ROUTES.CLIENT_AI, providerId: "p", wording: "w?", at: AT, reference: "r" })]) {
    assert.ok(!keys(rec).some((k) => /approv/i.test(k)), "a record carries an approval field");
  }
  assert.match(plain.record.meaning, /never the owner's approval, never observed demand/);
});

test("T27d · C27 — an assessment keeps its five fields; its source is a method or an agent, never 'human'; it is never approval, demand or OBSERVED", () => {
  const q = q1();
  const ok = RD.assessmentRecord({ question: q, draft: draftFor(q, { source: { kind: "AGENT", ref: "agent:fixture" } }), at: AT });
  assert.equal(ok.outcome, "RECORDED");
  assert.deepEqual(Object.keys(ok.record.value).sort(), ["declarationVersion", "meaningTest", "question_id", "reason", "source", "verdict"].sort());
  const refusedFor = (over) => RD.assessmentRecord({ question: q, draft: draftFor(q, over), at: AT });
  assert.equal(refusedFor({ reason: "" }).code, "ASSESSMENT_REASON_NOT_ONE_LINE", "an assessment without its reason was kept");
  assert.equal(refusedFor({ meaningTest: "" }).code, "ASSESSMENT_NAMES_NO_MEANING_TEST");
  assert.equal(refusedFor({ declarationVersion: "" }).code, "ASSESSMENT_NAMES_NO_DECLARATION_VERSION");
  assert.equal(refusedFor({ source: { kind: "METHOD", ref: "a human reviewer" } }).code, "ASSESSMENT_SOURCE_IS_A_METHOD_OR_AN_AGENT_NEVER_HUMAN", "the word 'human' was accepted as a source");
  assert.equal(refusedFor({ source: { kind: "PERSON", ref: "x" } }).code, "ASSESSMENT_NAMES_NO_METHOD_OR_AGENT");
  assert.equal(refusedFor({ verdict: "APPROVED" }).code, "ASSESSMENT_VERDICT_NOT_RELEVANT_HELD_OR_REJECTED");
  /* never OBSERVED: the evidence state of the question and of its assessment is INFERRED, and F16's OBSERVED list never counts it */
  assert.equal(evidenceStateOf(q).state, "INFERRED", "a research-derived question was placed OBSERVED");
  assert.equal(evidenceStateOf(ok.record).state, "INFERRED");
  assert.equal(intakeQuestions([q]).lists.OBSERVED.length, 0, "a research-derived question was counted OBSERVED");
  assert.equal(q.parent_kind, "INFERRED");
});

test("T28a · C28 — neither route is a condition: with neither, discovery is ABSENT and the run completes; the route-2 intake runs with nothing returned", () => {
  const W = world();
  try {
    const c = collect(W, { plan: planOf({ ai: null, suppliedLinks: [] }), aiFlag: false });
    assert.equal(c.r.status, 0, c.out);
    assert.match(c.out, /ABSENT/, "discovery with neither route did not read ABSENT");
    const k = intake(W, {});
    assert.equal(k.r.status, 0, `the intake refused to run with no route-2 result\n${k.out}`);
    assert.match(report(k.out), /RESEARCH-DERIVED questions: 0/);
  } finally { W.cleanup(); }
});

test("T28b · C28 — the kinds stay apart: a route-2 row tied to a formed question is research-derived; one tied to none is a CLIENT CLAIM; neither is a lead or OBSERVED", () => {
  const W = world();
  try {
    const k = intake(W, { results: [{ formedQueryId: FORMED[0].queryId, wording: "FIXTURE tied question?" }, { wording: "FIXTURE people ask us this" }, { formedQueryId: "not-a-formed-query", wording: "FIXTURE untied question?" }] });
    assert.equal(k.r.status, 0, k.out);
    const rd = stored(W, "research-derived-questions.jsonl");
    assert.deepEqual(rd.map((q) => q.wording.text), ["FIXTURE tied question?"], "an untied statement was taken as research-derived");
    assert.equal(rd[0].parent_kind, "INFERRED", "a route-2 result was filed as OBSERVED");
    assert.equal(rd[0].route, RD.ROUTES.CLIENT_RESEARCH);
    const claims = stored(W, "questions.jsonl").filter((x) => x.value?.kind === "CLIENT_CLAIM");
    assert.equal(claims.length, 2, "a statement tied to no formed question was not kept as a CLIENT CLAIM");
    assert.equal(intakeQuestions(stored(W, "questions.jsonl")).lists.OBSERVED.length, 0, "a route-2 row was counted OBSERVED");
    assert.ok(!existsSync(batchFile(W, "leads.jsonl")) || !readFileSync(batchFile(W, "leads.jsonl"), "utf8").includes("FIXTURE"), "a route-2 row became a lead");
  } finally { W.cleanup(); }
});

test("T28c · C28 — the same question with and without an optional reference flows alike: the reference is STORED, never fetched, never a lead, never dead, never promoting", () => {
  const W = world();
  try {
    const k = intake(W, { results: [{ formedQueryId: FORMED[0].queryId, wording: "FIXTURE with a reference?", reference: "https://fixture-reference.invalid/thread/1" }, { formedQueryId: FORMED[1].queryId, wording: "FIXTURE without a reference?" }] });
    assert.equal(k.r.status, 0, k.out);
    const rd = stored(W, "research-derived-questions.jsonl");
    const withRef = rd.find((q) => q.wording.text.includes("with a reference")), without = rd.find((q) => q.wording.text.includes("without"));
    assert.ok(withRef && without, "a question with, or without, a reference did not flow");
    assert.deepEqual({ ...withRef.reference }, { kind: RD.OPTIONAL_REFERENCE, value: "https://fixture-reference.invalid/thread/1", fetched: false, meaning: RD.REFERENCE_MEANING }, "the reference was refused storage or altered");
    assert.ok(!Object.hasOwn(withRef.reference, "resolution"), "an unfetched reference was resolved, or marked a dead lead");
    assert.equal(without.reference, null);
    for (const q of [withRef, without]) { assert.equal(q.tier, "RESEARCH-DERIVED", "a reference promoted a question"); assert.equal(q.parent_kind, "INFERRED"); }
    assert.ok(!existsSync(batchFile(W, "leads.jsonl")), "a reference became a lead");
    assert.match(k.out, /with an optional reference \(never fetched\): 1/);
  } finally { W.cleanup(); }
});

test("T29a · C29 — the provider's ANSWER prose never reaches a record; its question WORDING arrives as a research-derived question (route 1, fake provider)", () => {
  const W = world();
  try {
    { const k = connection(W, "--connect"); assert.equal(k.r.status, 0, k.out); }
    const WORDING = "FIXTURE-GENERATED: what does it cost to design a family home?";
    const c = collect(W, { outputs: [{ text: `${SENTINEL} — an answer: it costs about this much.`, questions: [{ wording: WORDING, generated: true }, { wording: "unmarked wording", generated: false }] }], responses: [{ items: [] }, { items: [] }] });
    assert.equal(c.r.status, 0, c.out);
    const all = readdirSync(join(W.root, "research", "")).length >= 0 && readFileSync(batchFile(W, "research-derived-questions.jsonl"), "utf8");
    assert.ok(!all.includes(SENTINEL) && !all.includes("costs about"), "provider answer prose was kept as a research-derived question");
    const rd = stored(W, "research-derived-questions.jsonl");
    assert.deepEqual(rd.map((q) => q.wording.text), [WORDING], "the GENERATED wording was not kept, or an unmarked wording was");
    assert.match(c.out, /research-derived questions \(route 1, wording marked GENERATED; never OBSERVED, never demand\): 1/);
    /* the adapter's own extractor: QUESTION lines only; prose, and a QUESTION line holding an address, never */
    const body = { content: [{ type: "text", text: "An answer.\nQUESTION: Is it legal to build here?\nQUESTION: see https://x.invalid/q\nMore prose." }] };
    assert.deepEqual(generatedQuestionsOf(body).map((x) => ({ ...x })), [{ wording: "Is it legal to build here?", generated: true }]);
  } finally { W.cleanup(); }
});

test("T29b · C29 — wording is marked GENERATED, kept in its own field — never a quote field, never attributed to anyone", () => {
  const r1 = RD.researchDerivedQuestion({ subject: SUBJECT, queryId: FORMED[0].queryId, route: RD.ROUTES.CLIENT_AI, providerId: "fixture-ai", wording: "How long does a permit take?", at: AT });
  assert.deepEqual({ ...r1.wording }, { text: "How long does a permit take?", generated: true }, "route-1 wording was not marked GENERATED");
  const r2 = q1();
  assert.equal(r2.wording.generated, false, "the client's own research wording was marked as the provider's");
  const keys = (o) => (o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => [k, ...keys(v)]) : []);
  for (const r of [r1, r2]) {
    assert.ok(!keys(r).some((k) => /quote|author|asker|seenBy|observer/i.test(k)), "wording sits in a quote field or is attributed to someone");
  }
});

test("T29c · C29 — the attribution pair: wording as a plain heading passes; the same wording under 'people often ask' fails without observed evidence — and F16's report counts it", () => {
  assert.equal(RD.attributionRefusal("How do I plan a family home?", { tier: RD.TIER }), null, "CONTROL: a plain heading was refused");
  assert.equal(RD.attributionRefusal("People often ask: how do I plan a family home?", { tier: RD.TIER }), "ATTRIBUTION_NEEDS_OBSERVED_EVIDENCE", "an attribution heading passed without observed evidence");
  assert.equal(RD.attributionRefusal("What people ask about building at home", { tier: RD.TIER }), "ATTRIBUTION_NEEDS_OBSERVED_EVIDENCE");
  assert.equal(RD.attributionRefusal("People often ask: how do I plan a family home?", { tier: RD.TIER, observedEvidence: true }), null, "observed evidence did not allow the attribution");
  const W = world();
  try {
    const k = intake(W, { results: [{ formedQueryId: FORMED[0].queryId, wording: "People often ask how long a build takes?" }, { formedQueryId: FORMED[1].queryId, wording: "How long does a build take?" }] });
    assert.equal(k.r.status, 0, k.out);
    assert.match(k.out, /attributes itself to people .*: 1$/m, "F16's report did not count the attributing wording");
    assert.ok(!k.out.includes("how long a build takes"), "the report printed a question's wording");
  } finally { W.cleanup(); }
});

test("T29d · C29 — census: no F16 path refuses a draft built from supported sources (no blanket ban on source-based drafting)", () => {
  const F16 = [...readdirSync(join(REPO, "src", "research")).filter((f) => f.endsWith(".mjs")).map((f) => join("src", "research", f)),
    ...readdirSync(join(REPO, "src", "research", "ai-providers")).filter((f) => f.endsWith(".mjs")).map((f) => join("src", "research", "ai-providers", f)),
    "bin/collect-public-questions.mjs", "bin/research-derived-intake.mjs", "bin/judge-public-questions.mjs", "bin/public-questions.mjs", "bin/ai-connection.mjs"];
  const BAN = /\b[A-Z_]*DRAFT[A-Z_]*(REFUSED|BANNED|FORBIDDEN|NOT_ALLOWED)\b|\b(REFUSE|BAN|FORBID)[A-Z_]*_DRAFT[A-Z_]*\b/;
  const hits = F16.filter((f) => BAN.test(readFileSync(join(REPO, f), "utf8")));
  assert.ok(F16.length >= 10, "the census population is too small to mean anything");
  assert.deepEqual(hits, [], "an F16 path refuses a supported-source draft");
  assert.ok(BAN.test('throw coded("DRAFTING_REFUSED")'), "CONTROL: the census cannot see a planted draft refusal");
});

test("T30a · C30 — no freshness rule on the question: a question from long ago, or with no time window, is accepted and counted; the trail time is chronology only", () => {
  const old = q1({ at: "2001-01-01T00:00:00Z" });
  assert.equal(old.recorded_at, "2001-01-01T00:00:00Z");
  assert.equal(RD.classifySubmission({ formedQueryId: FORMED[0].queryId, wording: "an old question with no time window?" }, { formedIds: new Set([FORMED[0].queryId]) }).kind, RD.SUBMISSION.RESEARCH_DERIVED, "a question with no time window was refused");
  const lines = RD.researchDerivedReport({ questions: [old, q1({ wording: "a second old one?", at: "1999-06-01T00:00:00Z" })], at: AT });
  assert.match(lines[0], /RESEARCH-DERIVED questions: 2/, "an old question was aged out");
  assert.equal(RD.relevanceOf(old.question_id, []), "HELD", "an old question was expired rather than held for assessment");
});

test("T30b · C30 — the ANSWER's facts keep their own freshness rule: a fact past its window is flagged by the existing check (read-only use)", () => {
  const fresh = judgeFact({ value: "x", sourceUrl: "https://fixture-body.invalid/rule", tier: 1, verifiedDate: TODAY });
  const stale = judgeFact({ value: "x", sourceUrl: "https://fixture-body.invalid/rule", tier: 1, verifiedDate: "2001-01-01" });
  assert.equal(fresh.counts, true, "CONTROL: a fresh answer fact was flagged");
  assert.equal(stale.counts, false, "an answer fact past its window escaped its freshness rule");
  assert.ok(stale.reasons.some((r) => /window is/.test(r)));
});

test("T31 · C31 — its own record type and count: no conversion to or from any of the five kinds, in either direction; a lead is never let into its store", () => {
  for (const [name, kind] of Object.entries(RD.FIVE_KINDS)) {
    assert.equal(RD.kindConversionRefusal(kind, RD.RESEARCH_DERIVED_RECORD), "RESEARCH_DERIVED_NEVER_CONVERTS", `a ${name} converted INTO a research-derived question`);
    assert.equal(RD.kindConversionRefusal(RD.RESEARCH_DERIVED_RECORD, kind), "RESEARCH_DERIVED_NEVER_CONVERTS", `a research-derived question converted INTO a ${name}`);
  }
  assert.equal(RD.kindConversionRefusal(RD.RESEARCH_DERIVED_RECORD, RD.RESEARCH_DERIVED_RECORD), null, "CONTROL: a research-derived question was refused as itself");
  const lead = { record_type: LEAD_RECORD, lead_id: "l" };
  assert.deepEqual(RD.researchDerivedStoreRefusals([q1(), lead]), ["RESEARCH_DERIVED_NEVER_CONVERTS"], "a lead was let into the research-derived store");
  /* its own count: a keyword idea and a lead beside it change nothing */
  /* a keyword idea as the store keeps one — a signal, with no question wording of its own */
  const lines = RD.researchDerivedReport({ questions: [q1(), { record_type: "keyword_signal", signal_id: "fixture-signal" }, lead], at: AT });
  assert.match(lines[0], /RESEARCH-DERIVED questions: 1 /, "another kind shared the research-derived count");
  assert.equal(new Set([RD.RESEARCH_DERIVED_RECORD, ...Object.values(RD.FIVE_KINDS)]).size, 6, "two kinds share an identity");
});

test("T32 · C32 — an owned search query is OWNED SEARCH EVIDENCE: never a client-received question, never research-derived, never demand", () => {
  assert.equal(RD.classifySubmission({ source: RD.OWNED_SEARCH_SOURCE, formedQueryId: FORMED[0].queryId, wording: "build cost" }, { formedIds: new Set([FORMED[0].queryId]) }).kind, RD.SUBMISSION.OWNED_SEARCH_EVIDENCE, "an owned query tied to a formed question was taken as research-derived");
  const W = world();
  try {
    const k = intake(W, { results: [{ source: RD.OWNED_SEARCH_SOURCE, wording: "FIXTURE owned query" }, { source: RD.OWNED_SEARCH_SOURCE, formedQueryId: FORMED[0].queryId, wording: "FIXTURE owned query two" }] });
    assert.equal(k.r.status, 0, k.out);
    assert.equal(stored(W, "research-derived-questions.jsonl").length, 0, "an owned query became research-derived");
    assert.equal(stored(W, "questions.jsonl").length, 0, "an owned query became a question or a client claim");
    assert.match(k.out, /owned search evidence kept apart 2/);
  } finally { W.cleanup(); }
});

test("TRAIL · the production audit trail is byte-identical after every proof in this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE, "a proof wrote to the production audit trail");
});
