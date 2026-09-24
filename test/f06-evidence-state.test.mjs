/**
 * 🔴 F06 · EVIDENCE STATE MODEL — THE PROOFS, P1–P42 (24 September 2026).
 *
 * Acceptance: `_handoffs` a0c94ce `AlmiVisibility_F06_FROZEN_ACCEPTANCE_2026-09-24.md`, pinned in
 * config/fboard/acceptances.mjs. Every proof carries a control that can give the other verdict. SYNTHETIC records are
 * named as such and never counted as real evidence; the REAL proofs read the production stores through their
 * production readers. Governed events are written to a CONFINED store only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
import { join } from "node:path";

import {
  EVIDENCE_STATES, REQUIRED_METADATA, COUPLED_DIMENSIONS, EvidenceStateRefused, makeEvidenceState, requireEvidenceState,
  evidenceStateFaults, isolationFaults, serializeEvidenceState, parseEvidenceState, displayOf, UNMAPPED,
  checkTransition, recordEvidenceStateTransitions, TRANSITION_RULES,
} from "../src/evidence/evidence-state.mjs";
import { evidenceStateOf, adapterContext, costPartStates, moneyState, evidenceStateAuthority, REASONLESS_UNKNOWN_DETECTORS, FACT_UNKNOWN_REASON_STATE } from "../src/evidence/evidence-state-adapters.mjs";
import { labelFor, labelCensus, LABELS } from "../src/report/provenance-label.mjs";
import { renderRecords } from "../src/report/view.mjs";
import { formatLedgerLine } from "../src/cost/ledger.mjs";
import { governedAuditContext, governedStoreAppend, resolveAuditStoreLocation } from "../src/governance/governed-run.mjs";
import { auditClassOf } from "../src/governance/guard-audit.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors } from "../src/fboard/board.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { governedPopulations, census, controls } from "../tools/evidence-state-census.mjs";
import { vocabularyCensus } from "../tools/evidence-state-vocabulary.mjs";
import { PRODUCT_WORDS } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();
const refusedWith = (fn, code) => { try { fn(); } catch (e) { return e instanceof EvidenceStateRefused && e.code === code; } return false; };

/* SYNTHETIC — the lawful minimum of each state, one declared rule, varied one field at a time. */
const GOOD = Object.freeze({
  OBSERVED: { evidenceRef: "observation:o1", sourceId: "collector@1", observedAt: "2026-09-24T00:00:00Z" },
  INFERRED: { inputRefs: ["observation:o1"], method: "rule-x", computedAt: "2026-09-24T00:00:00Z" },
  RECOMMENDED: { supportingRefs: ["issue:i1"], rule: "recommendation:R1", proposedAt: "2026-09-24" },
  UNKNOWN: { checkId: "check:c", insufficiency: "EVIDENCE_IN_CONFLICT" },
  NOT_MEASURED: { checkId: "check:c", noMeasurementReason: "MISSING_INPUT" },
  NOT_APPLICABLE: { checkId: "check:c", scope: "scope:declared", applicabilityReason: "OUTSIDE_DECLARED_SCOPE" },
});
const mk = (s, over = {}) => makeEvidenceState(s, { assignedBy: "synthetic", ...GOOD[s], ...over });
const ISSUE = (over = {}) => ({ record_type: "issue", issue_id: "i1", issue_class: "c", verdict: "FAIL", evidence: ["o1"], detector: "d", detector_version: "1", opened_at: "2026-09-24T00:00:00Z", ...over });

/* ══════════ THE MODEL ══════════ */

test("P1 · exactly six canonical states exist, closed and frozen", () => {
  assert.deepEqual([...EVIDENCE_STATES], ["OBSERVED", "INFERRED", "RECOMMENDED", "UNKNOWN", "NOT_MEASURED", "NOT_APPLICABLE"]);
  assert.throws(() => { EVIDENCE_STATES.push("SEVENTH"); }, TypeError);
  for (const s of EVIDENCE_STATES) assert.equal(mk(s).state, s);
  assert.deepEqual([...LABELS], [...EVIDENCE_STATES], "the page's labels are the model's states");
  // CONTROL: a seventh literal is refused.
  assert.ok(refusedWith(() => makeEvidenceState("SEVENTH", {}), "EVIDENCE_STATE_UNKNOWN_LITERAL"));
});

test("P2 · an ABSENT state is refused — there is no default", () => {
  for (const c of [undefined, null, {}, { state: "" }, { state: null, meta: {} }]) assert.equal(evidenceStateFaults(c)[0]?.code, "EVIDENCE_STATE_ABSENT", JSON.stringify(c));
  assert.ok(refusedWith(() => makeEvidenceState(undefined, GOOD.OBSERVED), "EVIDENCE_STATE_ABSENT"));
  assert.deepEqual(evidenceStateFaults(mk("OBSERVED")), [], "CONTROL: a present lawful state passes");
});

test("P3 · MULTIPLE states are refused", () => {
  assert.equal(evidenceStateFaults({ state: ["OBSERVED", "INFERRED"], meta: {} })[0].code, "EVIDENCE_STATE_MULTIPLE");
  assert.equal(evidenceStateFaults({ state: "OBSERVED|INFERRED", meta: {} })[0].code, "EVIDENCE_STATE_MULTIPLE");
  assert.ok(evidenceStateFaults({ state: "OBSERVED", meta: { assignedBy: "x", ruleVersion: "f06-1", ...GOOD.OBSERVED }, inferred: true }).some((f) => f.code === "EVIDENCE_STATE_MULTIPLE"));
  assert.deepEqual(evidenceStateFaults(mk("INFERRED")), [], "CONTROL");
});

test("P4 · an UNKNOWN LITERAL is refused — near-misses included", () => {
  for (const s of ["observed", "NOT MEASURED", "N/A", "MEASURED", "PASS", "UNVERIFIED", "VERIFIED"]) assert.equal(evidenceStateFaults({ state: s, meta: {} })[0].code, /[ ,|/]/.test(s) ? "EVIDENCE_STATE_MULTIPLE" : "EVIDENCE_STATE_UNKNOWN_LITERAL", s);
  assert.equal(mk("NOT_MEASURED").state, "NOT_MEASURED", "CONTROL");
});

test("P5 · MALFORMED metadata is refused — shape, codes, dates, references, undeclared keys", () => {
  const bad = [
    ["OBSERVED", { observedAt: "yesterday" }],
    ["INFERRED", { inputRefs: "o1" }],
    ["INFERRED", { inputRefs: [""] }],
    ["UNKNOWN", { insufficiency: "the evidence was weak" }],
    ["NOT_MEASURED", { noMeasurementReason: "no data" }],
    ["OBSERVED", { somethingElse: "x" }],
  ];
  for (const [s, over] of bad) assert.throws(() => mk(s, over), (e) => e instanceof EvidenceStateRefused && /MALFORMED/.test(e.code), `${s} ${JSON.stringify(over)}`);
  assert.equal(mk("UNKNOWN", { insufficiency: "EVIDENCE_IN_CONFLICT" }).state, "UNKNOWN", "CONTROL");
});

/* The required metadata, written out from the frozen acceptance and §6 of the command — NOT read from the module, so a
 * field quietly dropped from REQUIRED_METADATA cannot also drop out of the proof that requires it. */
const ACCEPTANCE_REQUIRES = Object.freeze({
  OBSERVED: ["evidenceRef", "sourceId", "observedAt"],
  INFERRED: ["inputRefs", "method", "computedAt"],
  RECOMMENDED: ["supportingRefs", "rule", "proposedAt"],
  UNKNOWN: ["checkId", "insufficiency"],
  NOT_MEASURED: ["checkId", "noMeasurementReason"],
  NOT_APPLICABLE: ["checkId", "scope", "applicabilityReason"],
});
test("P6–P11 · the module's required metadata is exactly what the acceptance requires", () => {
  for (const s of EVIDENCE_STATES) assert.deepEqual([...REQUIRED_METADATA[s]], ACCEPTANCE_REQUIRES[s], s);
});
for (const [p, s] of [["P6", "OBSERVED"], ["P7", "INFERRED"], ["P8", "RECOMMENDED"], ["P9", "UNKNOWN"], ["P10", "NOT_MEASURED"], ["P11", "NOT_APPLICABLE"]]) {
  test(`${p} · ${s} requires ${ACCEPTANCE_REQUIRES[s].join(", ")} — each one, alone`, () => {
    for (const k of ACCEPTANCE_REQUIRES[s]) {
      const meta = { ...GOOD[s] };
      delete meta[k];
      assert.ok(refusedWith(() => makeEvidenceState(s, { assignedBy: "synthetic", ...meta }), "EVIDENCE_STATE_METADATA_MISSING"), `${s} without ${k} was accepted`);
    }
    assert.equal(mk(s).state, s, "CONTROL: with all of them it is lawful");
  });
}

for (const [p, dim] of [["P12", "verdict"], ["P13", "confidence"], ["P14", "verificationState"], ["P15", "boardState"]]) {
  test(`${p} · ${dim} stays INDEPENDENT — it can never live inside an evidence state, and does not decide one`, () => {
    assert.ok(refusedWith(() => mk("OBSERVED", { [dim]: "X" }), "EVIDENCE_STATE_COUPLED"));
    assert.equal(evidenceStateFaults({ state: "OBSERVED", meta: { assignedBy: "x", ruleVersion: "f06-1", ...GOOD.OBSERVED }, [dim]: "X" })[0].code, "EVIDENCE_STATE_COUPLED");
    assert.ok(COUPLED_DIMENSIONS.includes(dim));
    assert.equal(mk("OBSERVED").state, "OBSERVED", "CONTROL");
  });
}
test("P12b · the SAME verdict yields different states, and different verdicts can share one — the two dimensions are independent", () => {
  const unknownNotRun = evidenceStateOf(ISSUE({ verdict: "UNKNOWN", reason_code: "MISSING_INPUT" }));
  const unknownReached = evidenceStateOf(ISSUE({ verdict: "UNKNOWN", detector: "noindex.origin-review" }));
  assert.deepEqual([unknownNotRun.state, unknownReached.state], ["NOT_MEASURED", "UNKNOWN"], "one verdict (UNKNOWN), two states");
  assert.equal(evidenceStateOf(ISSUE()).state, "INFERRED");
});
test("P14b · VERIFIED does not decide OBSERVED: a VERIFIED derivation is INFERRED, and a VERIFIED fact without its check is UNMAPPED", () => {
  assert.equal(evidenceStateOf({ id: "d", verificationState: "VERIFIED", derived: true, derivation: { formula: "a+b", inputs: ["f1", "f2"], computedOn: "2026-09-24" } }).state, "INFERRED");
  assert.equal(evidenceStateOf({ id: "v", verificationState: "VERIFIED", verification: {} }).unmapped, true);
  assert.equal(evidenceStateOf({ id: "v", verificationState: "VERIFIED", verification: { checkedOn: "2026-09-24", checkedBy: "c", sourceUrl: "s" } }).state, "OBSERVED", "CONTROL");
});

/* ══════════ THE FORBIDDEN CONVERSIONS ══════════ */

test("P16 · UNKNOWN never becomes PASS — no state carries a PASS, no display word reads PASS", () => {
  assert.ok(refusedWith(() => mk("UNKNOWN", { value: "PASS" }), "EVIDENCE_STATE_VALUE_FORBIDDEN"));
  assert.ok(refusedWith(() => mk("UNKNOWN", { pass: true }), "EVIDENCE_STATE_COUPLED"));
  for (const s of EVIDENCE_STATES) assert.notEqual(displayOf(s), "PASS", `UNKNOWN_READS_PASS: ${s} is displayed as PASS`);
  assert.ok(!TRANSITION_RULES["UNKNOWN->PASS"]);
  // CONTROL: the census's own detector DOES fire on an UNKNOWN item beside a PASS.
  assert.equal(controls().passFires, true);
});

test("P17 · NOT_MEASURED never becomes zero — it carries no value at all, and reads as words", () => {
  assert.ok(refusedWith(() => mk("NOT_MEASURED", { value: "0" }), "EVIDENCE_STATE_VALUE_FORBIDDEN"));
  const refused = evidenceStateOf({ record_type: "observation", observation_id: "o", method: "m", observed_at: "2026-09-24", content_sha256: "a", value: { truncationReason: "API_ERROR", rowCount: null } });
  assert.equal(refused.state, "NOT_MEASURED");
  assert.equal(refused.meta.value, undefined);
  assert.equal(displayOf("NOT_MEASURED"), "NOT MEASURED");
  // A request refused with rowCount 0 (a measured zero) is NOT placed NOT_MEASURED by that rule — the two stay apart.
  assert.notEqual(evidenceStateOf({ record_type: "observation", observation_id: "o", method: "m", observed_at: "2026-09-24", content_sha256: "a", value: { truncationReason: "API_ERROR", rowCount: 0 } }).state, "NOT_MEASURED");
  assert.equal(controls().zeroFires, true, "CONTROL: the census detector fires on a NOT_MEASURED item beside a 0");
});

test("P18 · an unavailable measurement never silently disappears — counted, labelled, and refused at the write", () => {
  const rs = [ISSUE(), { record_type: "never_seen_before" }];
  const c = labelCensus(rs);
  assert.equal(Object.values(c).reduce((a, b) => a + b, 0), rs.length, "a record vanished from the census");
  assert.equal(c[UNMAPPED], 1);
  const html = renderRecords(rs, { title: "T", limit: 5 });
  assert.match(html, /never_seen_before/);
  assert.match(html, />UNMAPPED</);
  // And a governed write REFUSES the unplaceable record rather than storing it without a state.
  const dir = fs.mkdtempSync(join(REPO, ".test-scratch", "f06-p18-"));
  try {
    const store = createJsonlStore(join(dir, "s.jsonl"));
    assert.ok(refusedWith(() => governedStoreAppend({ repo: REPO, permission: { mayWrite: false }, store, records: [{ record_type: "never_seen_before" }], action: "P18", occurredAt: "2026-09-24T00:00:00Z", correlationId: "run:f06-p18" }), "EVIDENCE_STATE_UNPLACEABLE"));
    // CONTROL: a placeable record passes the same check.
    assert.doesNotThrow(() => governedStoreAppend({ repo: REPO, permission: { mayWrite: false }, store, records: [ISSUE()], action: "P18", occurredAt: "2026-09-24T00:00:00Z", correlationId: "run:f06-p18" }));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("P19 · NOT_APPLICABLE never passes without a declared scope and reason — and is never inferred from an empty value", () => {
  assert.ok(refusedWith(() => mk("NOT_APPLICABLE", { applicabilityReason: undefined }), "EVIDENCE_STATE_METADATA_MISSING"));
  assert.ok(refusedWith(() => mk("NOT_APPLICABLE", { scope: "" }), "EVIDENCE_STATE_METADATA_MISSING"));
  // No adapter rule places NOT_APPLICABLE: empty values, skipped fetches and missing labels never become it.
  for (const r of [{ record_type: "observation", observation_id: "o", value: { skipped: true }, method: "crawl.skipped" }, { id: "f", verificationState: "" }, ISSUE({ verdict: "UNKNOWN", reason_code: "NOT_APPLICABLE_YET" })]) {
    assert.notEqual(evidenceStateOf(r).state, "NOT_APPLICABLE", JSON.stringify(r));
  }
  assert.equal(evidenceStateOf(ISSUE({ verdict: "UNKNOWN", reason_code: "NOT_APPLICABLE_YET" })).state, "NOT_MEASURED", "the producer's NOT_APPLICABLE_YET is data not yet stored — NOT_MEASURED, whatever its name");
  assert.equal(mk("NOT_APPLICABLE").state, "NOT_APPLICABLE", "CONTROL: with scope and reason it is lawful (synthetic — no real record declares a scope)");
});

test("P20 · an inference never presents as an observation", () => {
  assert.equal(evidenceStateOf({ record_type: "page", observations: ["o1"], last_seen: "2026-09-24" }).state, "INFERRED");
  assert.equal(evidenceStateOf(ISSUE()).state, "INFERRED", "a detector's FAIL is a derived finding");
  // A new derived item must keep the observation among its inputs; relabelling an observation is refused.
  const ctx = { actor: "t", at: "2026-09-24T00:00:00Z", rule: "R", softwareVersion: "v", correlationId: "run:t", authorityRef: { propositionId: "P", scope: ["S"] }, authorityHash: "a".repeat(64) };
  assert.ok(refusedWith(() => checkTransition({ from: mk("OBSERVED"), to: mk("INFERRED", { inputRefs: ["observation:other"] }), fromRef: "a", toRef: "b", newEvidenceRefs: ["x"] }, ctx), "EVIDENCE_TRANSITION_REFUSED"));
  assert.doesNotThrow(() => checkTransition({ from: mk("OBSERVED"), to: mk("INFERRED", { inputRefs: ["observation:o1"] }), fromRef: "a", toRef: "b", newEvidenceRefs: ["x"] }, ctx), "CONTROL");
  assert.equal(controls().inferenceFires, true);
});

test("P21 · a recommendation never presents as evidence — only RECOMMENDED, and only on linked evidence", () => {
  const draft = { record_type: "draft_recommendation", recommendation_id: "R1", drafted_at: "2026-09-24", applied: false };
  const link = { record_type: "recommendation_evidence", recommendation_id: "R1", linked_at: "2026-09-24", issues: ["i1"], observations: ["o1"], sources: [] };
  assert.equal(evidenceStateOf(draft).unmapped, true, "no linked evidence — not RECOMMENDED");
  const s = evidenceStateOf(draft, adapterContext([draft, link]));
  assert.equal(s.state, "RECOMMENDED", "RECOMMENDATION_AS_EVIDENCE: a drafted recommendation was placed as something else");
  assert.ok(refusedWith(() => mk("RECOMMENDED", { supportingRefs: [] }), "EVIDENCE_STATE_METADATA_MISSING"));
  assert.equal(controls().recommendationFires, true, "CONTROL: the census detector fires on a draft placed as anything else");
});

test("P22 · a recommendation never presents as an implementation — approved or applied, it stays RECOMMENDED; RECOMMENDED never becomes OBSERVED", () => {
  const link = { record_type: "recommendation_evidence", recommendation_id: "R2", linked_at: "2026-09-24", issues: ["i1"], observations: [], sources: [] };
  for (const extra of [{ applied: true }, { approved_by: "owner" }, { status: "APPLIED" }]) {
    const draft = { record_type: "draft_recommendation", recommendation_id: "R2", drafted_at: "2026-09-24", ...extra };
    assert.equal(evidenceStateOf(draft, adapterContext([draft, link])).state, "RECOMMENDED", JSON.stringify(extra));
  }
  const ctx = { actor: "t", at: "2026-09-24T00:00:00Z", rule: "R", softwareVersion: "v", correlationId: "run:t", authorityRef: { propositionId: "P", scope: ["S"] }, authorityHash: "a".repeat(64) };
  assert.ok(refusedWith(() => checkTransition({ from: mk("RECOMMENDED"), to: mk("OBSERVED"), fromRef: "a", toRef: "b", newEvidenceRefs: ["x"] }, ctx), "EVIDENCE_TRANSITION_REFUSED"));
  assert.ok(refusedWith(() => mk("RECOMMENDED", { applied: true }), "EVIDENCE_STATE_COUPLED"));
});

/* ══════════ THE LEGACY ADAPTERS ══════════ */

test("P23 · a MISSING legacy label returns UNMAPPED — never a default", () => {
  for (const r of [{ id: "f", verificationState: undefined, claim: "x" }, ISSUE({ verdict: undefined }), { record_type: "cost_entry" }, { record_type: "observation", observation_id: "o" }]) assert.equal(evidenceStateOf(r).unmapped, true, JSON.stringify(r));
  assert.equal(moneyState({}, { ref: "r", at: "2026-09-24" }).unmapped, true);
  assert.equal(evidenceStateOf(ISSUE()).unmapped, undefined, "CONTROL");
});

test("P24 · an AMBIGUOUS legacy label returns UNMAPPED — by structure, never by its English word", () => {
  assert.equal(evidenceStateOf(ISSUE({ verdict: "UNKNOWN", detector: "a-new-detector" })).unmapped, true, "a reason-less UNKNOWN from an undeclared detector");
  assert.equal(evidenceStateOf(ISSUE({ verdict: "UNKNOWN", reason_code: "SOMETHING_ELSE" })).unmapped, true);
  assert.equal(evidenceStateOf({ id: "f", verificationState: "UNKNOWN", verification: { reason: "NEW_REASON", checkedOn: "2026-09-24" } }).unmapped, true);
  assert.equal(moneyState({ amountState: "UNKNOWN", amount: 3 }, { ref: "r", at: "2026-09-24" }).unmapped, true, "an UNKNOWN amount that carries a number");
  assert.equal(evidenceStateOf(ISSUE({ verdict: "UNKNOWN", detector: "noindex.origin-review" })).state, "UNKNOWN", "CONTROL: a declared detector");
});

test("P25 · the EXACT legacy mappings succeed — each by the structure its producer declares, and ZERO_BY_TARIFF is preserved", () => {
  for (const code of ["NO_OBSERVATION", "NEEDS_RENDERED_HTML", "MISSING_INPUT", "TOOL_FAILED", "NOT_APPLICABLE_YET"]) assert.equal(evidenceStateOf(ISSUE({ verdict: "UNKNOWN", reason_code: code })).state, "NOT_MEASURED", code);
  for (const [reason, state] of Object.entries(FACT_UNKNOWN_REASON_STATE)) assert.equal(evidenceStateOf({ id: "f", verificationState: "UNKNOWN", verification: { reason, checkedOn: "2026-09-24" } }).state, state, reason);
  for (const d of Object.keys(REASONLESS_UNKNOWN_DETECTORS)) assert.equal(evidenceStateOf(ISSUE({ verdict: "UNKNOWN", detector: d })).state, "UNKNOWN", d);
  const zero = moneyState({ amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis: "a tariff with no charge" }, { ref: "r", at: "2026-09-24T00:00:00Z" });
  assert.deepEqual([zero.state, zero.meta.value, zero.meta.method], ["INFERRED", "0", "money-zero-by-tariff"], "a rule-derived zero, kept — never NOT_MEASURED, never UNKNOWN, never a bare 0");
  const unk = moneyState({ amountState: "UNKNOWN", amount: null, unknownKind: "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD" }, { ref: "r", at: "2026-09-24" });
  assert.deepEqual([unk.state, unk.meta.noMeasurementReason], ["NOT_MEASURED", "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD"]);
});

test("P26 · a direct observation retains its provenance — reference, source and time from the record itself", () => {
  const s = evidenceStateOf({ record_type: "observation", observation_id: "o9", method: "m", observed_at: "2026-09-24T01:02:03Z", content_sha256: "a", collector: "c", collector_version: "2" });
  assert.deepEqual([s.state, s.meta.evidenceRef, s.meta.sourceId, s.meta.observedAt], ["OBSERVED", "observation:o9", "c@2", "2026-09-24T01:02:03Z"]);
  assert.equal(evidenceStateOf({ record_type: "observation", observation_id: "o9", method: "m", observed_at: "2026-09-24" }).unmapped, true, "CONTROL: without a content hash or raw reference it is not traceable");
});

test("P27 · a derived conclusion retains its input lineage", () => {
  const s = evidenceStateOf({ record_type: "page", observations: ["o1", "o2"], last_seen: "2026-09-24" });
  assert.deepEqual([...s.meta.inputRefs], ["observation:o1", "observation:o2"]);
  assert.deepEqual([...evidenceStateOf(ISSUE({ evidence: ["o7", "o8"] })).meta.inputRefs], ["o7", "o8"]);
  assert.equal(evidenceStateOf({ record_type: "page", observations: [], last_seen: "2026-09-24" }).unmapped, true, "CONTROL: no inputs — not INFERRED");
});

test("P28 · a recommendation retains its supporting evidence", () => {
  const draft = { record_type: "draft_recommendation", recommendation_id: "R3", drafted_at: "2026-09-24" };
  const link = { record_type: "recommendation_evidence", recommendation_id: "R3", linked_at: "2026-09-24", issues: ["i1"], observations: ["o1"], sources: ["s1"] };
  assert.deepEqual([...evidenceStateOf(draft, adapterContext([draft, link])).meta.supportingRefs], ["issue:i1", "observation:o1", "source:s1"]);
});

/* ══════════ TRANSITIONS, ISOLATION, AUDIT ══════════ */

const TCTX = () => ({ actor: "test/f06", at: new Date(Date.now() - 1000).toISOString().replace(/\.\d{3}Z$/, "Z"), rule: "F06_PROOF", softwareVersion: "engine:test", correlationId: `run:f06:${process.pid}:${Date.now()}`, ...evidenceStateAuthority({ now: "2026-09-24" }) });

test("P29 · a state transition records its rule, software, time, actor and authority — and refuses any one missing", () => {
  const d = checkTransition({ from: mk("INFERRED"), to: mk("UNKNOWN"), fromRef: "issue:a", toRef: "issue:b", newEvidenceRefs: ["o2"] }, TCTX());
  assert.deepEqual([d.eventType, d.metadata.from, d.metadata.to, d.metadata.rule, d.softwareVersion, d.occurredAt, d.actor, d.authorityRef.propositionId], ["EVIDENCE_STATE_TRANSITION", "INFERRED", "UNKNOWN", "F06_PROOF", "engine:test", d.occurredAt, "test/f06", "F06_FROZEN_ACCEPTANCE"]);
  assert.ok(!JSON.stringify(d).includes("issue:a"), "a reference entered the event unhashed");
  for (const k of ["actor", "at", "rule", "softwareVersion", "correlationId", "authorityRef", "authorityHash"]) {
    const ctx = TCTX(); delete ctx[k];
    assert.ok(refusedWith(() => checkTransition({ from: mk("INFERRED"), to: mk("UNKNOWN"), fromRef: "a", toRef: "b", newEvidenceRefs: ["x"] }, ctx), "EVIDENCE_TRANSITION_REFUSED"), k);
  }
  assert.ok(refusedWith(() => checkTransition({ from: mk("INFERRED"), to: mk("UNKNOWN"), fromRef: "a", toRef: "b", newEvidenceRefs: [] }, TCTX()), "EVIDENCE_TRANSITION_REFUSED"), "no new evidence");
  assert.ok(refusedWith(() => checkTransition({ from: mk("NOT_APPLICABLE"), to: mk("OBSERVED"), fromRef: "a", toRef: "b", newEvidenceRefs: ["x"] }, TCTX()), "EVIDENCE_TRANSITION_REFUSED"), "leaving NOT_APPLICABLE without a scope change");
  assert.doesNotThrow(() => checkTransition({ from: mk("NOT_APPLICABLE"), to: mk("OBSERVED"), fromRef: "a", toRef: "b", newEvidenceRefs: ["x"], scopeChange: "SCOPE_WIDENED_BY_RULING" }, TCTX()), "CONTROL");
  assert.equal(auditClassOf(d), "GOVERNED_CHANGE", "the F08 sink derives it durable");
});

test("P30 · a cross-TENANT evidence reference is refused", () => {
  const s = mk("INFERRED", { tenantId: "t1", inputRefs: ["tenant:t2/observation:o1"] });
  assert.equal(isolationFaults(s)[0].code, "EVIDENCE_REF_CROSS_TENANT");
  assert.ok(refusedWith(() => checkTransition({ from: mk("OBSERVED"), to: s, fromRef: "a", toRef: "b", newEvidenceRefs: ["x"] }, TCTX()), "EVIDENCE_REF_CROSS_TENANT"));
  assert.equal(isolationFaults(mk("INFERRED", { tenantId: "t1", inputRefs: ["tenant:t1/observation:o1"] })).length, 0, "CONTROL: the tenant's own reference");
});

test("P31 · a cross-SUBJECT reference is refused where isolation requires it", () => {
  const s = mk("INFERRED", { subjectId: "s1", inputRefs: ["subject:s2/observation:o1"] });
  assert.equal(isolationFaults(s)[0].code, "EVIDENCE_REF_CROSS_SUBJECT");
  assert.ok(refusedWith(() => checkTransition({ from: mk("INFERRED", { subjectId: "s1" }), to: mk("UNKNOWN", { subjectId: "s2" }), fromRef: "a", toRef: "b", newEvidenceRefs: ["x"] }, TCTX()), "EVIDENCE_REF_CROSS_SUBJECT"));
  assert.equal(isolationFaults(mk("INFERRED", { subjectId: "s1", inputRefs: ["subject:s1/observation:o1"] })).length, 0, "CONTROL");
});

test("P32 · read-only diagnostics emit NO production event — the census and the report run, the trail is byte-identical", () => {
  const before = prodHashes();
  const r = spawnSync(process.execPath, ["tools/evidence-state-census.mjs"], { cwd: REPO, encoding: "utf8", env: process.env, timeout: 300_000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  labelCensus([ISSUE(), { record_type: "never_seen_before" }]);
  assert.deepEqual(prodHashes(), before, "a read-only diagnostic changed the production trail");
  // CONTROL: the same hash DOES change when anything is appended (measured on a copy, never on the trail).
  const dir = fs.mkdtempSync(join(REPO, ".test-scratch", "f06-p32-"));
  try { const p = join(dir, "e.jsonl"); fs.copyFileSync(PROD[0], p); const h = sha(fs.readFileSync(p)); fs.appendFileSync(p, "{}\n"); assert.notEqual(sha(fs.readFileSync(p)), h); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("P33 · a governed transition emits EXACTLY ONE event — and a replay emits none", () => {
  assert.equal(resolveAuditStoreLocation({ repo: REPO }).synthetic, true, "not confined — this would write production");
  const ctx = governedAuditContext({ repo: REPO, correlationId: `run:f06-p33:${process.pid}:${Date.now()}` });
  const count = () => ctx.store.readAll().events.length;
  const tag = `${process.pid}-${Date.now()}`;
  const d = checkTransition({ from: mk("INFERRED"), to: mk("UNKNOWN"), fromRef: `issue:${tag}-a`, toRef: `issue:${tag}-b`, newEvidenceRefs: ["o2"] }, TCTX());
  const before = count();
  const r1 = recordEvidenceStateTransitions({ audit: ctx, drafts: [d] });
  assert.equal(count() - before, 1, "not exactly one event");
  assert.equal(r1[0].status, "APPENDED");
  const r2 = recordEvidenceStateTransitions({ audit: ctx, drafts: [d] });
  assert.equal(count() - before, 1, "a replay appended a second event");
  assert.equal(r2[0].status, "IDEMPOTENT_RETRY");
  assert.equal(ctx.store.verify().ok, true);
});

test("P34 · report output distinguishes UNKNOWN / NOT MEASURED / NOT APPLICABLE — none reads as 0, PASS, clean or absent", () => {
  const words = ["UNKNOWN", "NOT_MEASURED", "NOT_APPLICABLE"].map(displayOf);
  assert.deepEqual(words, ["UNKNOWN", "NOT MEASURED", "NOT APPLICABLE"]);
  assert.equal(new Set(words).size, 3);
  for (const w of words) assert.ok(!/^(0|PASS|CLEAN|ABSENT|OK|—)$/i.test(w), w);
  const html = renderRecords([ISSUE({ verdict: "UNKNOWN", reason_code: "MISSING_INPUT" }), ISSUE({ issue_id: "i2", verdict: "UNKNOWN", detector: "noindex.origin-review" })], { title: "T", limit: 5 });
  assert.match(html, />NOT MEASURED</);
  assert.match(html, />UNKNOWN</);
  const line = formatLedgerLine({ entry_id: "e", recorded_at: "2026-09-24T00:00:00Z", run_ref: "r", money: { amountState: "UNKNOWN", amount: null, unknownKind: "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD" }, providerCalls: { state: "UNKNOWN", total: null, unknownKind: "MEASURABLE_BUT_NOT_RECORDED" }, founderTime: { state: "MEASURED", seconds: 5 }, budget: { kind: "k", bounds: { b: 1 }, used: { u: 1 }, capReached: false } });
  assert.match(line, /money=NOT MEASURED\(NOT_MEASURABLE_WITH_TOOLS_WE_HOLD\)/);
  assert.match(line, /calls=NOT MEASURED\(/);
  assert.doesNotMatch(line, /money=UNKNOWN|money=0 /, "an unmeasured amount printed as UNKNOWN or 0");
});

test("P35 · no canonical state defaults silently — every entry point without proof returns UNMAPPED or refuses", () => {
  assert.equal(evidenceStateOf({}).unmapped, true);
  assert.equal(evidenceStateOf(null).unmapped, true);
  assert.equal(labelFor({ record_type: "x" }).label, UNMAPPED, "SILENT_DEFAULT: an undeclared record was given a canonical state");
  assert.ok(refusedWith(() => makeEvidenceState(undefined, {}), "EVIDENCE_STATE_ABSENT"));
  assert.ok(refusedWith(() => requireEvidenceState({ meta: GOOD.OBSERVED }), "EVIDENCE_STATE_ABSENT"));
  assert.equal(controls().unmappedFires, true, "CONTROL");
});

test("P36 · stable serialisation round-trips, and key order cannot change it", () => {
  for (const s of EVIDENCE_STATES) {
    const e = mk(s);
    assert.equal(serializeEvidenceState(parseEvidenceState(serializeEvidenceState(e))), serializeEvidenceState(e));
    const reordered = { meta: Object.fromEntries(Object.entries(e.meta).reverse()), state: e.state };
    assert.equal(serializeEvidenceState(reordered), serializeEvidenceState(e));
  }
  assert.throws(() => parseEvidenceState('{"state":"PASS","meta":{}}'), EvidenceStateRefused, "CONTROL: an unlawful serialisation does not parse");
});

test("P37 · every exported production function has a PRODUCTION caller — no orphan adapter", () => {
  const prodFiles = execFileSync("git", ["-C", REPO, "ls-files", "src", "bin", "tools", "subjects"], { encoding: "utf8" }).trim().split("\n").filter((p) => p.endsWith(".mjs"));
  const texts = prodFiles.map((p) => [p, fs.readFileSync(join(REPO, p), "utf8")]);
  const orphans = [];
  for (const mod of ["src/evidence/evidence-state.mjs", "src/evidence/evidence-state-adapters.mjs"]) {
    const src = fs.readFileSync(join(REPO, mod), "utf8");
    for (const m of src.matchAll(/^export (?:const|function|class) (\w+)/gm)) {
      const name = m[1];
      // Used when another production file names it, or its own module references it beyond its declaration.
      const elsewhere = texts.some(([p, t]) => p !== mod && new RegExp(`\\b${name}\\b`).test(t));
      const internally = (src.match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length > 1;
      const used = elsewhere || internally;
      if (!used) orphans.push(`${mod}:${name}`);
    }
  }
  assert.deepEqual(orphans, [], "an exported F06 function has no production caller");
});

test("P38 · every REAL governed population accounts to ZERO remainder — five states reached on real material", async () => {
  const { pops, unavailable } = await governedPopulations();
  const c = census({ pops });
  assert.equal(c.remainder, 0);
  assert.deepEqual(c.unmapped, [], `${c.unmapped.length} unmapped`);
  assert.deepEqual(c.forbidden, [], `${c.forbidden.length} forbidden conversions`);
  for (const r of c.rows) assert.equal(r.remainder, 0, r.name);
  assert.ok(c.total >= 5000, `${c.total} items — the population shrank`);
  // Engine stores alone (present in every checkout) reach OBSERVED, INFERRED, RECOMMENDED, UNKNOWN and NOT_MEASURED.
  for (const s of ["OBSERVED", "INFERRED", "RECOMMENDED", "UNKNOWN", "NOT_MEASURED"]) assert.ok(c.byState[s] > 0, `${s} has no real material`);
  assert.equal(c.byState.NOT_APPLICABLE, 0, "no stored record declares a scope — NOT_APPLICABLE is synthetic only, and says so");
  for (const u of unavailable) assert.ok(u.why, "an unavailable population must say why");
  assert.ok(Object.values(controls()).every(Boolean), "a census control failed to fire");
});

test("P39 · no product or client vocabulary enters the generic F06 code", () => {
  for (const f of ["src/evidence/evidence-state.mjs", "src/evidence/evidence-state-adapters.mjs", "tools/evidence-state-census.mjs", "tools/evidence-state-vocabulary.mjs", "config/evidence-state-vocabulary.mjs"]) {
    const t = fs.readFileSync(join(REPO, f), "utf8");
    const hits = PRODUCT_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(t));
    assert.deepEqual(hits, [], `${f} names ${hits.join(", ")}`);
  }
  assert.ok(PRODUCT_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(`the ${PRODUCT_WORDS[0]} word`)), "CONTROL: the matcher fires");
});

test("P40 · F05, F07 and F08 remain satisfied — their acceptances pin, resolve CURRENT and validate on the board", () => {
  const board = buildBoard(CAPABILITIES, DECLARED);
  assert.deepEqual(boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } }), []);
  for (const f of ["F05", "F07", "F08"]) assert.equal(contractSha256(ACCEPTANCES[f]), ACCEPTANCES[f].contractSha256, f);
  // Their own acceptance suites are re-run in full outside this file (runs/audit/f06-acceptance-rerun-2026-09-24.txt).
});

test("P40b · the transition authority is the CURRENT ruling — a superseded one is never applied", () => {
  /* Found by the sabotage run: with the register made to pick the OLDEST applicable ruling, nothing above went red,
   * because today no proposition F06 relies on has two applicable rulings. So the case is built: a synthetic NEWER ruling
   * for F06's own proposition must govern, and the frozen acceptance it supersedes must not. */
  const real = AUTHORITY_CORPUS.find((r) => r.propositionId === "F06_FROZEN_ACCEPTANCE");
  const newer = { ...real, authorityId: "synthetic:f06-newer-ruling", issuedAt: "2026-09-25", effectiveFrom: "2026-09-25", contentHash: "f".repeat(64), recordedAt: "2026-09-25T00:00:00Z" };
  assert.equal(evidenceStateAuthority({ now: "2026-09-26", records: [...AUTHORITY_CORPUS, newer] }).authorityHash, "f".repeat(64), "SUPERSEDED_AUTHORITY_APPLIED: the older ruling governed a transition");
  assert.equal(evidenceStateAuthority({ now: "2026-09-24" }).authorityHash, real.contentHash, "CONTROL: today the frozen acceptance governs");
});

test("P41 · the historical 61/38 ledger is untouched", () => {
  const PIN = "149f936256debdc4b74b7298f707f48371d26ec4380a9f58f74254c6e9d9a65d";
  const h = createHash("sha256").update(fs.readFileSync(join(REPO, "src/checklist/classification.mjs"), "utf8").split("\r\n").join("\n"), "utf8").digest("hex");
  assert.equal(h, PIN, "the historical ledger changed");
});

test("P42 · the COMPLETE F06 acceptance: pinned, CURRENT, and one changed word is ACCEPTANCE_TAMPERED", () => {
  const acc = ACCEPTANCES.F06;
  assert.equal(acc.contractSha256, "b1c791d4f734652a84f88b170dfd020434625e9859fa97e7dde7ce560670337a");
  assert.equal(contractSha256(acc), acc.contractSha256);
  assert.equal(acc.ruling.sha256, AUTHORITY_CORPUS.find((r) => r.propositionId === "F06_FROZEN_ACCEPTANCE").contentHash);
  const tampered = { ...ACCEPTANCES, F06: { ...acc, input: acc.input.replace("prioritise", "ignore") } };
  assert.notEqual(tampered.F06.input, acc.input, "the control word was not present");
  const board = buildBoard(CAPABILITIES, DECLARED).map((r) => (r.featureId === "F06" ? { ...r, state: "ACCEPTANCE-FROZEN", events: [{ kind: "ACCEPTANCE_FROZEN", on: "2026-09-24", ruling: acc.ruling, contractSha256: acc.contractSha256 }] } : r));
  assert.ok(boardErrors(board, { capabilities: CAPABILITIES, acceptances: tampered }).some((e) => e.code === "ACCEPTANCE_TAMPERED" && e.id === "F06"));
  assert.deepEqual(boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES }).filter((e) => e.id === "F06"), [], "CONTROL: the untampered acceptance validates");
  const v = vocabularyCensus();
  assert.deepEqual([v.unregistered.length, v.stale.length, v.remainder], [0, 0, 0], "the state vocabulary register is incomplete");
});

test("P-TRAIL · nothing in this file touched the production trail", () => {
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
