/**
 * 🔴 F06 · THE LOSSLESS ADAPTERS — every stored item the engine reports, placed in exactly one canonical evidence state
 * BY ITS STRUCTURE, or refused as UNMAPPED. Never by the English meaning of a word (24 September 2026).
 *
 * The stores are append-only and were written before F06; they are not rewritten. Each rule below names the structure it
 * reads and the code that proves what that structure means. A record no rule can place is UNMAPPED — visible, counted,
 * and never a canonical state by default. A legacy value is never renamed into an evidence state:
 *   · VERIFIED is NOT read as OBSERVED. A fact is OBSERVED only when it carries its check date, its checker and its
 *     source reference — and a VERIFIED fact that is a DERIVATION is INFERRED.
 *   · a failure or refusal is NOT read as UNKNOWN. A check that could not run (the producer's own UNKNOWN_REASONS) is
 *     NOT_MEASURED; a request refused before any row existed is NOT_MEASURED.
 *   · a missing value is NOT read as NOT_MEASURED, and an empty value never becomes NOT_APPLICABLE.
 *   · the other dimensions a record carries — verdict, verification, amountState, dataState, robotsState, workflow
 *     state, severity — stay where they are. They are read to place the state and are never folded into it.
 *
 * Product-neutral: references are ids and hashes; no client value, URL or text enters a state's metadata.
 */
import { createHash } from "node:crypto";
import { makeEvidenceState, EvidenceStateRefused, UNMAPPED } from "./evidence-state.mjs";
import { UNKNOWN_REASONS as CHECK_COULD_NOT_ANSWER } from "../audit/check.mjs";
import { AUTHORITY_CORPUS } from "../../config/authority/corpus.mjs";
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";

const h16 = (s) => createHash("sha256").update(String(s), "utf8").digest("hex").slice(0, 16);
const ISOISH = /^\d{4}-\d{2}-\d{2}/;
const present = (v) => v !== undefined && v !== null && v !== "";

/**
 * Detectors whose UNKNOWN issues carry no could-not-answer reason, and what their own code says the UNKNOWN means.
 * A detector absent from this table cannot place a reason-less UNKNOWN — it is UNMAPPED, not guessed.
 *   noindex.origin-review  bin/supersede-noindex.mjs: "UNKNOWN from our evidence: the premise it cites is not confirmed
 *                          by our similarity measurement" — reached, measured, not established. config/class-splits.mjs
 *                          declares the same half "noindex-declared-deliberate", a decision, not a check that never ran.
 *   human-verification     bin/verification-issues.mjs: UNKNOWN, not FAIL, because the source's two official pages
 *                          disagree and which is current cannot be known — the question is open: reached, evidence in conflict.
 */
export const REASONLESS_UNKNOWN_DETECTORS = Object.freeze({
  "noindex.origin-review": "PREMISE_NOT_ESTABLISHED_BY_MEASUREMENT",
  "human-verification": "EVIDENCE_DOES_NOT_ESTABLISH_ANSWER",
  /* RR-194 · T-2: src/audit/check.mjs reviewSignal() — "the check DID answer (the value is measured) … UNKNOWN because the figure decides
   * nothing: a recorded substance review decides (P20), completeness is judged for a need (P21)". Reached, measured, not established. */
  "thin-content": "REVIEW_SIGNAL_DECIDES_NOTHING",
  "near-duplicate": "REVIEW_SIGNAL_DECIDES_NOTHING",
  "template-dominance": "REVIEW_SIGNAL_DECIDES_NOTHING",
});

/** Fact verification reasons (src/facts/record.mjs UNKNOWN_REASONS) and the evidence state each one IS. */
export const FACT_UNKNOWN_REASON_STATE = Object.freeze({
  CONFLICT: "UNKNOWN", // checked: sources disagree
  INCOMPLETE: "UNKNOWN", // checked: the source does not state all of it
  PARTIAL_EVIDENCE: "UNKNOWN", // checked: some elements confirmed, not all
  SOURCE_UNREACHABLE: "NOT_MEASURED", // the check produced no reading at all
});

/**
 * Record types that are DERIVATIONS of other stored records: exactly the field that lists their inputs and exactly the
 * field that dates them, as measured in the real stores on 24 September 2026. No fallback field — a record missing its
 * field is UNMAPPED, not dated or sourced from a neighbouring field.
 */
const strs = (xs) => (Array.isArray(xs) ? xs.filter((x) => typeof x === "string" && x !== "") : []);
const DERIVED_TYPES = Object.freeze({
  page: { inputs: (r) => strs(r.observations).map((x) => `observation:${x}`), at: (r) => r.last_seen, method: "page-identity-from-observations" },
  crawl_run: { inputs: (r) => (present(r.run_id) ? [`run:${r.run_id}`] : []), at: (r) => r.finished_at, method: "crawl-run-summary" },
  /* RR-138 §2: a live same-origin render run's own record (src/render/render-evidence.mjs) — its counts summarise the run, like a crawl run's */
  render_run: { inputs: (r) => (present(r.run_id) ? [`run:${r.run_id}`] : []), at: (r) => r.finished_at, method: "render-run-summary" },
  /* RR-155: F16's collection run record (src/research/collection.mjs) — counts and codes summarising one bounded run, like a crawl run's */
  collection_run: { inputs: (r) => (present(r.run_id) ? [`run:${r.run_id}`] : []), at: (r) => r.recorded_at, method: "collection-run-summary" },
  /* RR-159: the client's own connect or disconnect of its AI connection (src/research/ai-connection.mjs) — a record of the client's act, never
   * evidence about any question; its one input is the connector it names */
  ai_connection_event: { inputs: (r) => (present(r.value?.connectorId) ? [`connector:${h16(`${r.value.subject}#${r.value.connectorId}`)}`] : []), at: (r) => r.recorded_at, method: "client-ai-connection-event" },
  crawl_run_correction: { inputs: (r) => (present(r.corrects_run_id) ? [`run:${r.corrects_run_id}`] : []), at: (r) => r.corrected_at, method: "crawl-run-field-rederivation" },
  inventory_note: { inputs: (r) => (present(r.run_id) ? [`run:${r.run_id}`] : []), at: (r) => r.built_at, method: "inventory-from-stored-observations" },
  issue_state_change: { inputs: (r) => [...(present(r.issue_id) ? [`issue:${r.issue_id}`] : []), ...strs(r.evidence)], at: (r) => r.changed_at, method: "issue-lifecycle-decision" },
  duplicate_record_superseded: { inputs: (r) => [...(present(r.issue_id) ? [`issue:${r.issue_id}`] : []), ...strs(r.evidence)], at: (r) => r.superseded_at, method: "duplicate-record-note" },
  recommendation_evidence: { inputs: (r) => [...strs(r.issues).map((x) => `issue:${x}`), ...strs(r.observations).map((x) => `observation:${x}`), ...strs(r.sources).map((x) => `source:${x}`)], at: (r) => r.linked_at, method: "recommendation-evidence-link" },
  cost_entry: { inputs: (r) => (present(r.run_ref) ? [`cost-input:${h16(r.run_ref)}`] : []), at: (r) => r.recorded_at, method: "cost-entry-from-run-counts" },
  /* 🔴 RR-106 — the two collector v0.2 records PARSED from a stored raw-HTML body (src/crawl/provenance.mjs). Each is computed by our
   * parser from the observation it names, so it is INFERRED with that observation as its one input — never OBSERVED: the links are
   * what our parser found in raw HTML (a script-built link is invisible to it), and a date CLAIM is what the page says, not a date
   * anyone observed (naming rule 1). The parse time is the observation's own time: the parse runs on the response it came from. */
  page_links: { inputs: (r) => (present(r.source_observation_id) ? [`observation:${r.source_observation_id}`] : []), at: (r) => r.observed_at, method: "link-details-from-raw-html" },
  publication_date_claims: { inputs: (r) => (present(r.source_observation_id) ? [`observation:${r.source_observation_id}`] : []), at: (r) => r.observed_at, method: "date-claims-from-raw-html" },
});

/**
 * 🔴 RR-106 — a collector v0.2 `response_headers` record: the allowlisted response headers COPIED VERBATIM from the response the
 * collector received for the observation it names (a value over the cap is cut and named, never rewritten). Nothing is computed, so it
 * is a direct witnessing — OBSERVED, sourced from its collector, like the raw-HTML observation of the same response. It is traceable only
 * through its own evidence id and its source observation; a record missing either, or its time, is UNMAPPED — never placed by default.
 */
function ofResponseHeaders(r) {
  const rule = "response_headers";
  if (!present(r.evidence_id)) return unmapped("a response-headers record with no evidence_id cannot be referenced", rule);
  if (!present(r.source_observation_id)) return unmapped("a response-headers record names the observation whose response it copied", rule);
  if (!present(r.observed_at) || !ISOISH.test(r.observed_at)) return unmapped("a response-headers record with no observed_at has no time", rule);
  const source = [r.collector, r.collector_version].filter(present).join("@");
  if (!present(source)) return unmapped("a response-headers record names no collector", rule);
  return place(rule, "OBSERVED", { evidenceRef: `response_headers:${r.evidence_id}`, sourceId: source, observedAt: r.observed_at });
}

/**
 * 🔴 RR-116 — a `public_question` record (src/research/human-observation.mjs; F16 acceptance _handoffs 944f769), placed by its own kind:
 *   OBSERVED      a PERSON saw it asked; placed OBSERVED only with a reviewable reference, its own source and its own time — an observation
 *                 with no reference is UNMAPPED, so the store refuses it (a typed question is never evidence)
 *   INFERRED      our suggestion; its stated basis is its one input
 *   CLIENT_CLAIM  the client's own statement of what people ask: UNKNOWN, its insufficiency named — first-party, not evidence (RR-89 §1.2)
 * Any other kind, or a record missing what its kind needs, is UNMAPPED — never placed by default.
 */
function ofPublicQuestion(r) {
  const rule = "public_question";
  const v = r.value && typeof r.value === "object" ? r.value : {};
  if (!present(r.question_id)) return unmapped("a public question with no question_id cannot be referenced", rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped("a public question with no recorded time has no time", rule);
  if (v.kind === "OBSERVED") {
    const ref = v.reference;
    const hasRef = (typeof ref === "string" && ref.trim() !== "") || (ref !== null && typeof ref === "object" && ref.kind === "OTHER" && present(ref.text));
    if (!hasRef) return unmapped("an observed question with no reviewable reference is not evidence", rule);
    if (!present(v.source)) return unmapped("an observed question names no source", rule);
    return place(`${rule}.observed`, "OBSERVED", { evidenceRef: `public_question:${r.question_id}`, sourceId: v.source, observedAt: r.recorded_at });
  }
  if (v.kind === "INFERRED") {
    if (!present(v.basis)) return unmapped("an inferred suggestion states no basis", rule);
    return place(`${rule}.inferred`, "INFERRED", { inputRefs: [`basis:${h16(v.basis)}`], method: "human-submitted-suggestion", computedAt: r.recorded_at });
  }
  if (v.kind === "CLIENT_CLAIM") return place(`${rule}.client-claim`, "UNKNOWN", { checkId: `public_question:${r.question_id}`, insufficiency: "FIRST_PARTY_CLAIM_NOT_EVIDENCE" });
  return unmapped(`a public question of kind ${v.kind ?? "(none)"} has no declared placement`, rule);
}

/**
 * 🔴 RR-118 — a `keyword_signal` record (src/research/source-adapter.mjs): a keyword IDEA a source generated, never a question anyone was seen
 * asking. It is INFERRED, its source its one input — never OBSERVED. A record missing its id, its time or its source is UNMAPPED.
 */
function ofKeywordSignal(r) {
  const rule = "keyword_signal";
  const v = r.value && typeof r.value === "object" ? r.value : {};
  if (!present(r.signal_id)) return unmapped("a keyword signal with no signal_id cannot be referenced", rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped("a keyword signal with no recorded time has no time", rule);
  if (!present(v.sourceId)) return unmapped("a keyword signal names no source", rule);
  return place(rule, "INFERRED", { inputRefs: [`source:${h16(v.sourceId)}`], method: "source-generated-keyword-idea", computedAt: r.recorded_at });
}

/**
 * 🔴 RR-146 — a `research_lead` record (src/research/lead-intake.mjs): a hit a source's own listing or search returned. A search hit is a
 * LEAD, never an observed question: it is UNKNOWN, its insufficiency named — not yet read and rechecked on its original post. It is
 * never OBSERVED and never INFERRED. A lead missing its id, its time or its source is UNMAPPED.
 */
function ofResearchLead(r) {
  const rule = "research_lead";
  if (!present(r.lead_id)) return unmapped("a research lead with no lead_id cannot be referenced", rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped("a research lead with no recorded time has no time", rule);
  if (!present(r.sourceId)) return unmapped("a research lead names no source", rule);
  return place(rule, "UNKNOWN", { checkId: `research_lead:${r.lead_id}`, insufficiency: "LEAD_NOT_YET_VERIFIED_ON_ITS_ORIGINAL_POST" });
}

/**
 * 🔴 RR-150 — F62 (src/research/applicability-assessment.mjs). A PROPOSED `applicability_assessment` is a reading drafted from one stored
 * record: INFERRED, never OBSERVED — its input is that record. An assessment whose outcome is UNKNOWN stays UNKNOWN, its missing fact named.
 * An `applicability_confirmation` is a declared person's signature on one assessment: INFERRED from that assessment, never an observation
 * of the world. Either missing its id, its time or its input is UNMAPPED.
 */
function ofApplicabilityAssessment(r) {
  const rule = "applicability_assessment";
  if (!present(r.assessment_id)) return unmapped("an applicability assessment with no assessment_id cannot be referenced", rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped("an applicability assessment with no recorded time has no time", rule);
  if (!present(r.evidence?.factId)) return unmapped("an applicability assessment names no evidence record", rule);
  if (r.outcome === "UNKNOWN") return place(rule, "UNKNOWN", { checkId: `applicability_assessment:${r.assessment_id}`, insufficiency: "APPLICABILITY_NOT_STATED_BY_THE_STORED_SOURCE" });
  return place(rule, "INFERRED", { inputRefs: [`fact:${h16(r.evidence.factId)}`], method: "applicability-drafted-from-stored-evidence", computedAt: r.recorded_at });
}
function ofApplicabilityConfirmation(r) {
  const rule = "applicability_confirmation";
  if (!present(r.confirmation_id)) return unmapped("an applicability confirmation with no confirmation_id cannot be referenced", rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped("an applicability confirmation with no recorded time has no time", rule);
  if (!present(r.assessment_id)) return unmapped("an applicability confirmation names no assessment", rule);
  return place(rule, "INFERRED", { inputRefs: [`applicability_assessment:${h16(r.assessment_id)}`], method: "applicability-confirmed-by-a-declared-person", computedAt: r.recorded_at });
}

/**
 * 🔴 RR-153 — F91's connection records (src/page/demand-connection.mjs). A `planning_demand` connection and a `planning_sameness` join
 * are DERIVED from stored questions: INFERRED, their inputs named — never an observation themselves. A `planning_need` whose answer is
 * SOURCED is INFERRED from that source; one whose answer is UNKNOWN stays UNKNOWN, its insufficiency named. Missing id or time: UNMAPPED.
 * 🔴 RR-172 (Amendment 3) — a need's answer is judged claim by claim (C17): SUPPORTED or PARTLY SUPPORTED is INFERRED from the sources of its
 * SUPPORTED claims (the rest stays UNKNOWN inside the record); UNKNOWN stays UNKNOWN. A research-derived connection is INFERRED from its
 * research-derived question, never from a public question (C16). A `planning_coverage` record (C14) is INFERRED from the need's connections
 * and the pages it names — CANNOT DECIDE or REFUSED stays UNKNOWN, its insufficiency named; a `coverage_judgement` (F33 C8, ruling 3a) is a
 * method's or an agent's judgement of one question against one page — INFERRED, never an approval.
 */
function ofPlanning(r) {
  const rule = r.record_type;
  if (!present(r.measurement_key)) return unmapped(`a ${rule} record with no measurement_key cannot be referenced`, rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped(`a ${rule} record with no recorded time has no time`, rule);
  if (rule === "planning_need") {
    const supported = (r.answer?.claims ?? []).filter((c) => c?.state === "SUPPORTED" && present(c.source?.link));
    if (!["SUPPORTED", "PARTLY SUPPORTED"].includes(r.answer?.state) || !supported.length) return place(rule, "UNKNOWN", { checkId: `${rule}:${h16(r.measurement_key)}`, insufficiency: "ANSWER_NOT_SUPPORTED_CLAIM_BY_CLAIM" });
    return place(rule, "INFERRED", { inputRefs: supported.map((c) => `source:${h16(c.source.link)}`), method: "need-answer-supported-claim-by-claim", computedAt: r.recorded_at });
  }
  if (rule === "planning_coverage") {
    if (!present(r.needId)) return unmapped("a coverage record names no need", rule);
    if (!["FULL", "PARTIAL", "NONE"].includes(r.coverage)) return place(rule, "UNKNOWN", { checkId: `${rule}:${h16(r.measurement_key)}`, insufficiency: r.coverage === "REFUSED" ? "EXISTING_PAGE_POPULATION_REFUSED" : "COVERAGE_CANNOT_BE_DECIDED" });
    return place(rule, "INFERRED", { inputRefs: [`planning_need:${h16(r.needId)}`, ...(r.pages ?? []).map((p) => `existing_page:${h16(p.pageId)}`)], method: "f33-c8-grouped-need-coverage", computedAt: r.recorded_at });
  }
  if (rule === "coverage_judgement") {
    if (!present(r.value?.questionId) || !present(r.value?.pageId)) return unmapped("a coverage judgement names no question or page", rule);
    return place(rule, "INFERRED", { inputRefs: [`question:${h16(r.value.questionId)}`, `existing_page:${h16(r.value.pageId)}`], method: "per-question-coverage-judgement-by-a-method-or-an-agent", computedAt: r.recorded_at });
  }
  const inputs = rule === "planning_sameness" ? (r.questions ?? []) : [r.questionId];
  if (!inputs.length || inputs.some((q) => !present(q))) return unmapped(`a ${rule} record names no question`, rule);
  const kind = rule === "planning_demand" && r.tier === "RESEARCH-DERIVED" ? "research_derived_question" : "public_question";
  return place(rule, "INFERRED", { inputRefs: inputs.map((q) => `${kind}:${h16(q)}`), method: `${rule}-from-stored-questions`, computedAt: r.recorded_at });
}

/**
 * 🔴 RR-157 — a `held_for_judgement` item (src/research/source-adapter.mjs, MEANING profile): its original post is read, its meaning not yet
 * judged — UNKNOWN, never OBSERVED. A `meaning_judgement` is a named judge's reading of the original post — INFERRED from that held item.
 */
function ofHeld(r) {
  const rule = "held_for_judgement";
  if (!present(r.held_id)) return unmapped("a held item with no held_id cannot be referenced", rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped("a held item with no recorded time has no time", rule);
  return place(rule, "UNKNOWN", { checkId: `held_for_judgement:${r.held_id}`, insufficiency: "MEANING_NOT_YET_JUDGED_ON_THE_ORIGINAL_POST" });
}
function ofMeaningJudgement(r) {
  const rule = "meaning_judgement";
  if (!present(r.judgement_id) || !present(r.value?.held_id)) return unmapped("a judgement with no id or no held item cannot be referenced", rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped("a judgement with no time has no time", rule);
  return place(rule, "INFERRED", { inputRefs: [`held_for_judgement:${h16(r.value.held_id)}`], method: "meaning-judgement-on-the-original-post", computedAt: r.recorded_at });
}

/**
 * 🔴 RR-170 — a `research_derived_question` (src/research/research-derived.mjs; F16 Acceptance Amendment 5, C27–C31): wording research
 * returned for a research question Visibility FORMED — INFERRED from that formed query, never OBSERVED (nobody is shown to have asked it).
 * A `relevance_assessment` is a method's or an agent's assessment of one such question — INFERRED from that question, never an approval.
 */
function ofResearchDerived(r) {
  const rule = "research_derived_question";
  if (!present(r.question_id) || !present(r.query_id)) return unmapped("a research-derived question with no id or no formed query cannot be referenced", rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped("a research-derived question with no recorded time has no time", rule);
  return place(rule, "INFERRED", { inputRefs: [`formed-research-query:${h16(r.query_id)}`], method: "research-derived-wording-for-a-formed-question", computedAt: r.recorded_at });
}
function ofRelevanceAssessment(r) {
  const rule = "relevance_assessment";
  if (!present(r.assessment_id) || !present(r.value?.question_id)) return unmapped("an assessment with no id or no question cannot be referenced", rule);
  if (!present(r.recorded_at) || !ISOISH.test(r.recorded_at)) return unmapped("an assessment with no time has no time", rule);
  return place(rule, "INFERRED", { inputRefs: [`research_derived_question:${h16(r.value.question_id)}`], method: "relevance-from-the-declaration-and-the-meaning", computedAt: r.recorded_at });
}

const unmapped = (why, rule) => Object.freeze({ state: null, unmapped: true, why, assignedBy: rule });
const place = (rule, state, meta) => {
  try { return makeEvidenceState(state, { assignedBy: rule, ...meta }); }
  catch (e) { if (e instanceof EvidenceStateRefused) return unmapped(`${rule}: ${e.code} — ${e.message.split(": ").slice(1).join(": ")}`, rule); throw e; }
};

/* ── ONE RULE PER STRUCTURE ────────────────────────────────────────────────────────────────────────────────────── */

function ofObservation(r) {
  const rule = "observation";
  const v = r.value && typeof r.value === "object" ? r.value : {};
  if (!present(r.observation_id)) return unmapped("an observation with no observation_id cannot be referenced", rule);
  // A fetch skipped by the crawler's own policy (src/crawl/crawler.mjs: method crawl.skipped, skipped:true): the page
  // was not measured. It is NOT out of scope — the record declares no scope — so it is never NOT_APPLICABLE.
  if (v.skipped === true || r.method === "crawl.skipped") return place(`${rule}.skipped`, "NOT_MEASURED", { checkId: `measurement:${r.measurement_key ?? r.method}`, noMeasurementReason: "FETCH_SKIPPED_BY_CRAWL_POLICY" });
  // A request refused before any row existed (src/search/paginate.mjs API_ERROR, rowCount null — not 0): LAW-ABSENT-1.
  if (v.truncationReason === "API_ERROR" && v.rowCount === null) return place(`${rule}.request-refused`, "NOT_MEASURED", { checkId: `measurement:${r.measurement_key ?? r.method}`, noMeasurementReason: "REQUEST_REFUSED_NO_ROWS" });
  // A fetch that errored and produced no status.
  if (present(v.error) && (v.status === null || v.status === undefined)) return place(`${rule}.fetch-error`, "NOT_MEASURED", { checkId: `measurement:${r.measurement_key ?? r.method}`, noMeasurementReason: "FETCH_ERROR_NO_RESPONSE" });
  // An external capture recorded FAILED with no content captured (runs/evidence/external-observations: an HTTP 404,
  // normalisedLength null — the evidence establishes the failure and nothing about the claim; LAW-ABSENT-1).
  if (v.result === "FAILED" && v.normalisedLength === null) return place(`${rule}.check-failed`, "NOT_MEASURED", { checkId: `measurement:${r.measurement_key ?? r.method}`, noMeasurementReason: "EXTERNAL_CHECK_FAILED" });
  if (!present(r.observed_at) || !ISOISH.test(r.observed_at)) return unmapped("an observation with no observed_at has no time", rule);
  if (!present(r.content_sha256) && !present(r.raw_ref)) return unmapped("an observation with neither a content hash nor a raw reference is not traceable", rule);
  const source = [r.collector, r.collector_version].filter(present).join("@") || r.method;
  if (!present(source)) return unmapped("an observation with no collector or method names no source", rule);
  return place(rule, "OBSERVED", { evidenceRef: `observation:${r.observation_id}`, sourceId: String(source), observedAt: r.observed_at });
}

/**
 * A re-sighting records that a stored record appeared AGAIN on a date (src/evidence/store.mjs dedupe). Of an
 * OBSERVATION it is a new witnessing — OBSERVED. Of an ISSUE it is the detector re-deriving the same finding — INFERRED,
 * with the issue as its input. Which one it is, is read from which id it carries — never assumed.
 */
function ofResighting(r) {
  if (!present(r.seen_at)) return unmapped("a re-sighting names the date it was seen again", "resighting");
  if (present(r.observation_id) && !present(r.issue_id)) return place("resighting.observation", "OBSERVED", { evidenceRef: `observation:${r.observation_id}`, sourceId: `resighting:${r.measurement_key ?? "unkeyed"}`, observedAt: r.seen_at });
  if (present(r.issue_id) && !present(r.observation_id)) return place("resighting.issue", "INFERRED", { inputRefs: [`issue:${r.issue_id}`], method: "finding-re-derived", computedAt: r.seen_at });
  return unmapped("a re-sighting names exactly one of an observation or an issue", "resighting");
}

function ofSource(r) {
  if (!present(r.source_id) || !present(r.retrieved_at)) return unmapped("a source names its id and when it was retrieved", "source");
  return place("source", "OBSERVED", { evidenceRef: `source:${r.source_id}`, sourceId: `source-tier:${r.source_tier ?? "UNSTATED"}`, observedAt: r.retrieved_at });
}

function ofIssue(r) {
  const rule = "issue";
  const refs = strs(r.evidence);
  if (r.verdict === "FAIL") {
    // A finding: a named detector applied to stored evidence. Derived, never observed; the verdict stays beside it.
    if (!present(r.detector) || !present(r.opened_at)) return unmapped("a FAIL finding names its detector and when it was opened", rule);
    return place(`${rule}.finding`, "INFERRED", { inputRefs: refs, method: `${r.detector}@${r.detector_version ?? "unversioned"}`, computedAt: r.opened_at });
  }
  if (r.verdict === "UNKNOWN") {
    if (present(r.reason_code)) {
      if (Object.hasOwn(CHECK_COULD_NOT_ANSWER, r.reason_code)) return place(`${rule}.check-not-run`, "NOT_MEASURED", { checkId: `check:${r.issue_class}`, noMeasurementReason: r.reason_code });
      return unmapped(`reason_code ${r.reason_code} is not one of the producer's could-not-answer reasons`, rule);
    }
    const insufficiency = REASONLESS_UNKNOWN_DETECTORS[r.detector];
    if (!insufficiency) return unmapped(`an UNKNOWN issue with no reason code from detector ${r.detector ?? "(none)"} — no declared meaning`, rule);
    if (refs.length === 0) return unmapped("a reached question cites the evidence it reached it with", rule);
    return place(`${rule}.reached-unestablished`, "UNKNOWN", { checkId: `check:${r.issue_class}`, insufficiency, detail: `evidence:${refs.length}` });
  }
  return unmapped(`issue verdict ${r.verdict ?? "(none)"} is not FAIL or UNKNOWN`, rule);
}

function ofDraftRecommendation(r, ctx) {
  const rule = "draft_recommendation";
  if (!present(r.recommendation_id) || !present(r.drafted_at)) return unmapped("a drafted recommendation names its id and when it was drafted", rule);
  // Its supporting evidence is the recommendation_evidence link record(s) that name it. None linked: not RECOMMENDED.
  const links = ctx.recommendationEvidence?.get(r.recommendation_id) ?? [];
  const supportingRefs = links.flatMap((l) => DERIVED_TYPES.recommendation_evidence.inputs(l));
  if (supportingRefs.length === 0) return unmapped("a recommendation with no linked supporting evidence is not a lawful RECOMMENDED item", rule);
  // `applied` and `approved_by` are an ACTION state. They stay on the record; they never make it evidence or an implementation.
  return place(rule, "RECOMMENDED", { supportingRefs, rule: `recommendation:${r.recommendation_id}`, proposedAt: r.drafted_at });
}

function ofDerived(r) {
  const d = DERIVED_TYPES[r.record_type];
  const inputs = d.inputs(r);
  const at = d.at(r);
  if (inputs.length === 0) return unmapped(`${r.record_type} names none of the records it was derived from`, r.record_type);
  if (!present(at)) return unmapped(`${r.record_type} carries no computation time`, r.record_type);
  return place(r.record_type, "INFERRED", { inputRefs: inputs.map(String), method: d.method, computedAt: String(at) });
}

/** A product fact (src/facts/record.mjs). `verificationState` is READ, never renamed. */
function ofFact(f) {
  const rule = "fact";
  const id = f.id ?? "(no id)";
  if (f.derived === true || f.derivation) {
    const d = f.derivation ?? {};
    if (!Array.isArray(d.inputs) || d.inputs.length === 0 || !present(d.formula) || !present(d.computedOn)) return unmapped("a derived fact names its inputs, its formula and when it was computed", rule);
    return place(`${rule}.derived`, "INFERRED", { inputRefs: d.inputs.map((x) => `fact:${typeof x === "string" ? x : x?.id ?? h16(JSON.stringify(x))}`), method: `formula:${h16(d.formula)}`, computedAt: d.computedOn });
  }
  const v = f.verification ?? {};
  if (f.verificationState === "UNVERIFIED") return place(`${rule}.unverified`, "NOT_MEASURED", { checkId: `fact-check:${id}`, noMeasurementReason: "FACT_NOT_YET_CHECKED" });
  if (f.verificationState === "VERIFIED") {
    if (!present(v.checkedOn) || !present(v.checkedBy) || !present(v.sourceUrl)) return unmapped("a VERIFIED fact is OBSERVED only with its check date, checker and source reference — the label alone proves nothing", rule);
    return place(`${rule}.checked`, "OBSERVED", { evidenceRef: `fact:${id}#verification`, sourceId: `fact-source:${h16(v.sourceUrl)}`, observedAt: v.checkedOn });
  }
  if (f.verificationState === "UNKNOWN") {
    const state = FACT_UNKNOWN_REASON_STATE[v.reason];
    if (!state) return unmapped(`fact verification reason ${v.reason ?? "(none)"} has no declared evidence state`, rule);
    if (state === "NOT_MEASURED") return place(`${rule}.unreachable`, "NOT_MEASURED", { checkId: `fact-check:${id}`, noMeasurementReason: v.reason });
    if (!present(v.checkedOn)) return unmapped("an UNKNOWN fact was reached only if it was checked — it carries no check date", rule);
    return place(`${rule}.reached-unestablished`, "UNKNOWN", { checkId: `fact-check:${id}`, insufficiency: v.reason });
  }
  return unmapped(`verificationState ${f.verificationState ?? "(none)"} is not declared`, rule);
}

/**
 * THE ONE ENTRY POINT for a stored item. `ctx.recommendationEvidence` (Map recommendation_id → link records) is the
 * only context a rule reads; build it with `adapterContext(records)`.
 */
export function evidenceStateOf(record, ctx = {}) {
  if (record === null || typeof record !== "object") return unmapped("not a record", "none");
  if (!present(record.record_type)) {
    if (present(record.verificationState) || record.derived === true) return ofFact(record);
    return unmapped("a record with no record_type and no fact shape", "none");
  }
  switch (record.record_type) {
    case "observation": return ofObservation(record);
    case "resighting": return ofResighting(record);
    case "source": return ofSource(record);
    case "issue": return ofIssue(record);
    case "draft_recommendation": return ofDraftRecommendation(record, ctx);
    case "response_headers": return ofResponseHeaders(record);
    case "public_question": return ofPublicQuestion(record);
    case "keyword_signal": return ofKeywordSignal(record);
    case "research_lead": return ofResearchLead(record);
    case "held_for_judgement": return ofHeld(record);
    case "meaning_judgement": return ofMeaningJudgement(record);
    case "research_derived_question": return ofResearchDerived(record);
    case "relevance_assessment": return ofRelevanceAssessment(record);
    case "applicability_assessment": return ofApplicabilityAssessment(record);
    case "applicability_confirmation": return ofApplicabilityConfirmation(record);
    case "planning_demand": case "planning_sameness": case "planning_need": case "planning_coverage": case "coverage_judgement": return ofPlanning(record);
    default:
      if (Object.hasOwn(DERIVED_TYPES, record.record_type)) return ofDerived(record);
      return unmapped(`record_type ${record.record_type} has no declared rule`, "none");
  }
}

export function adapterContext(records) {
  const recommendationEvidence = new Map();
  for (const r of records) if (r?.record_type === "recommendation_evidence" && present(r.recommendation_id)) {
    if (!recommendationEvidence.has(r.recommendation_id)) recommendationEvidence.set(r.recommendation_id, []);
    recommendationEvidence.get(r.recommendation_id).push(r);
  }
  return { recommendationEvidence };
}

/**
 * The PARTS of a cost entry (src/cost/ledger.mjs), each its own item: money, provider calls, founder time.
 *   money MEASURED and ZERO_BY_TARIFF — every one carries a numeric amount and a `basis`: a zero or a figure CONCLUDED
 *     from counts by a stated rule (a free tariff; every request went to 127.0.0.1). INFERRED, value kept — never a bare
 *     0, never NOT_MEASURED, never UNKNOWN. The amountState stays on the record beside it.
 *   money UNKNOWN (unknownKind NOT_MEASURABLE_WITH_TOOLS_WE_HOLD) — no amount was produced: NOT_MEASURED.
 *   calls / time MEASURED — counted by the run itself: OBSERVED, value kept.
 *   calls / time UNKNOWN (MEASURABLE_BUT_NOT_RECORDED) — NOT_MEASURED.
 */
/**
 * One money figure (a ledger entry's `money`, or a crawl run's `cost`), with the reference and time of what holds it.
 * src/search/provider.mjs requires an UNKNOWN amount to be null ("nobody measured this"), and a MEASURED or
 * ZERO_BY_TARIFF amount to be a number with its basis — so the rule reads exactly those, and nothing looser.
 */
export function moneyState(m, { ref, at }) {
  const rule = "money";
  if (m?.amountState === "MEASURED" || m?.amountState === "ZERO_BY_TARIFF") {
    return typeof m.amount === "number" && present(m.basis) && present(at)
      ? place(rule, "INFERRED", { inputRefs: [`${ref}#basis:${h16(m.basis)}`], method: `money-${m.amountState.toLowerCase().replace(/_/g, "-")}`, computedAt: at, value: String(m.amount), valueUnit: String(m.currency ?? "") })
      : unmapped("a money figure carries a number, a basis and a time", rule);
  }
  if (m?.amountState === "UNKNOWN") {
    if (m.amount !== null) return unmapped("an UNKNOWN amount must be null — never a number", rule);
    return place(rule, "NOT_MEASURED", { checkId: `${ref}#money`, noMeasurementReason: /^[A-Z][A-Z0-9_]{1,63}$/.test(m.unknownKind ?? "") ? m.unknownKind : "AMOUNT_NOT_PRODUCED" });
  }
  return unmapped(`money amountState ${m?.amountState ?? "(none)"} is not declared`, rule);
}

export function costPartStates(entry) {
  const rule = "cost_entry.part";
  const out = {};
  const ref = `cost:${entry?.entry_id}`;
  out.money = moneyState(entry?.money, { ref, at: entry?.recorded_at });
  for (const part of ["providerCalls", "founderTime"]) {
    const p = entry?.[part] ?? {};
    if (p.state === "MEASURED") out[part] = present(entry?.recorded_at) ? place(`${rule}.${part}`, "OBSERVED", { evidenceRef: `${ref}#${part}`, sourceId: `run:${h16(entry.run_ref ?? entry.entry_id)}`, observedAt: entry.recorded_at }) : unmapped("a measured part carries the entry's time", `${rule}.${part}`);
    else if (p.state === "UNKNOWN") out[part] = present(p.unknownKind) ? place(`${rule}.${part}`, "NOT_MEASURED", { checkId: `${ref}#${part}`, noMeasurementReason: p.unknownKind }) : unmapped("an UNKNOWN part says which kind of unknown", `${rule}.${part}`);
    else out[part] = unmapped(`${part} state ${p.state ?? "(none)"} is not declared`, `${rule}.${part}`);
  }
  return out;
}

/**
 * The authority an evidence-state transition is recorded under: F06's own frozen acceptance, resolved LIVE through the
 * F05 register like any other record. Throws unless it resolves CURRENT — a transition is never recorded under an
 * authority that does not currently govern.
 */
export const EVIDENCE_STATE_AUTHORITY = Object.freeze({ propositionId: "F06_FROZEN_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F06"]) });
export function evidenceStateAuthority({ now, records = AUTHORITY_CORPUS }) {
  const res = resolveAuthority({ records, propositionId: EVIDENCE_STATE_AUTHORITY.propositionId, scope: [...EVIDENCE_STATE_AUTHORITY.scope], now });
  if (!permits(res)) throw new EvidenceStateRefused("EVIDENCE_STATE_AUTHORITY_UNRESOLVED", `${res.outcome} — a transition is not recorded under an authority that does not currently resolve`);
  return { authorityRef: { propositionId: EVIDENCE_STATE_AUTHORITY.propositionId, scope: [...EVIDENCE_STATE_AUTHORITY.scope] }, authorityHash: res.authority.contentHash };
}

export { UNMAPPED };
