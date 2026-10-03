/**
 * 🔴 F62 · FROM A BODY'S OWN SOURCED RULE TO A REVIEWABLE ASSESSMENT (RR-150; acceptance _handoffs a5ec9f1). Pure: no fetch, no clock,
 * no write — the governed writer is bin/applicability-assess.mjs. Names no product, body, country or profession.
 *
 *   DRAFT       a PROPOSED assessment of ONE derived check (deriveDeclaration): its outcome, the KIND of statement it rests on, and the
 *               stored evidence (a record of that check, and an excerpt that occurs verbatim in that record's stored text). Drafting
 *               needs no declared person — F46's person rule applies at CONFIRMATION, never to reading or drafting.
 *   FOUR KINDS  EXPLICIT_REQUIREMENT → REQUIRED · ACCEPTANCE → ACCEPTED · EXPLICIT_NON_REQUIREMENT → NOT_REQUIRED · SILENT_OR_AMBIGUOUS →
 *               UNKNOWN, its missing fact named. No other pairing is admitted: ACCEPTED never REQUIRED; silence never NOT_REQUIRED.
 *   ONE SCOPE   the evidence must be a record OF THAT CHECK — the same body and exactly the same scope. A country's, another body's,
 *               another profession's or another pathway's record is refused (COPIED_SCOPE), never carried over.
 *   CURRENT     the evidence record must be CURRENT by F45 on the stated date; a stale or undated source is refused.
 *   CONFIRMED   a confirmation names the assessment and a checker DECLARED A PERSON (F46 C3), and the evidence must still be CURRENT.
 *   GUIDANCE    only a CONFIRMED REQUIRED or ACCEPTED assessment is research guidance for F16 — never a question, never a page.
 */
import { createHash } from "node:crypto";
import { assessFactHealth } from "../facts/fact-health.mjs";
import { OUTCOMES } from "./applicability.mjs";

export const ASSESSMENT_RECORD = "applicability_assessment";
export const CONFIRMATION_RECORD = "applicability_confirmation";
export const KINDS = Object.freeze({
  EXPLICIT_REQUIREMENT: OUTCOMES.REQUIRED,
  ACCEPTANCE: OUTCOMES.ACCEPTED,
  EXPLICIT_NON_REQUIREMENT: OUTCOMES.NOT_REQUIRED,
  SILENT_OR_AMBIGUOUS: OUTCOMES.UNKNOWN,
});
export const REFUSAL = Object.freeze({
  CHECK_UNKNOWN: "CHECK_UNKNOWN", OTHER_SUBJECT: "OTHER_SUBJECT", COPIED_SCOPE: "COPIED_SCOPE", STALE_SOURCE: "STALE_SOURCE",
  EVIDENCE_NOT_STORED: "EVIDENCE_NOT_STORED", KIND_OUTCOME_MISMATCH: "KIND_OUTCOME_MISMATCH", MISSING_FACT_UNNAMED: "MISSING_FACT_UNNAMED",
  DUPLICATE: "DUPLICATE", MISSING_CHECKER: "MISSING_CHECKER", ASSESSMENT_UNKNOWN: "ASSESSMENT_UNKNOWN", NOTHING_TO_CONFIRM: "NOTHING_TO_CONFIRM",
});
export const GUIDANCE_LIMITS = "research guidance only: a CONFIRMED statement of where the product applies — not a public question, not demand, not a page opportunity and not a page";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const present = (v) => typeof v === "string" && v.trim() !== "";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const sameScope = (a, b) => JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());
const storedTextOf = (f) => [f?.evidence?.quotedSpan, f?.evidence?.ownWords].filter(present);
export const checkRef = (c) => Object.freeze({ body: c.body, scope: Object.freeze({ ...c.scope }) });
export const assessmentIdOf = (subject, check, outcome, factId) => sha(JSON.stringify([subject, check.body, Object.entries(check.scope).sort(), outcome, factId])).slice(0, 24);

/**
 * Drafts → PROPOSED assessment records, or refusals with their code. Nothing is written here.
 * @param {{ subject: string, declaration: object, facts: object[], drafts: object[], on: string, existingIds?: string[], draftedBy: string }} input
 */
export function draftAssessments({ subject, declaration, facts, drafts, on, existingIds = [], draftedBy }) {
  if (!ISO.test(on ?? "")) throw new TypeError("the judging date must be stated (YYYY-MM-DD)");
  if (!present(draftedBy)) throw new TypeError("a draft names who drafted it");
  if (!declaration?.derived) throw new TypeError("no derived declaration — nothing to assess");
  const byId = new Map(facts.map((f) => [f.id, f]));
  const health = new Map(assessFactHealth(facts.filter((f) => f?.life?.status !== "retired"), { on }).facts.map((x) => [x.id, x]));
  const seen = new Set(existingIds);
  const assessments = [], refused = [];
  const refuse = (d, code, why) => refused.push(Object.freeze({ draft: d?.ref ?? null, code, why }));
  for (const d of drafts) {
    if (d?.subject !== subject) { refuse(d, REFUSAL.OTHER_SUBJECT, "the draft names another subject — one tenant's assessment never crosses to another"); continue; }
    const check = declaration.checks.find((c) => c.body === d?.check?.body && sameScope(c.scope, d?.check?.scope));
    if (!check) { refuse(d, REFUSAL.CHECK_UNKNOWN, "no derived check has this body and exactly this scope"); continue; }
    if (!Object.hasOwn(KINDS, d?.kind) || KINDS[d.kind] !== d?.outcome) { refuse(d, REFUSAL.KIND_OUTCOME_MISMATCH, `kind ${d?.kind} does not give outcome ${d?.outcome} — ACCEPTED is never REQUIRED, and silence is never NOT_REQUIRED`); continue; }
    const f = byId.get(d?.evidence?.factId);
    if (!f || !check.provenance.some((p) => p.factId === f.id)) { refuse(d, REFUSAL.COPIED_SCOPE, "the evidence is not a record of this check (another body, or a wider or narrower scope) — a rule is never copied across scopes"); continue; }
    const h = health.get(f.id);
    if (h?.presentation !== "CURRENT") { refuse(d, REFUSAL.STALE_SOURCE, `F45 ${h?.presentation ?? "holds no assessment"}${h?.reasons?.length ? ` — ${h.reasons.join("; ")}` : ""}`); continue; }
    const excerpt = d?.evidence?.excerpt;
    if (!present(excerpt) || !storedTextOf(f).some((t) => t.includes(excerpt))) { refuse(d, REFUSAL.EVIDENCE_NOT_STORED, "the excerpt does not occur in the record's stored text — evidence is never paraphrased into existence"); continue; }
    if (d.outcome === OUTCOMES.UNKNOWN && !present(d?.missingFact)) { refuse(d, REFUSAL.MISSING_FACT_UNNAMED, "an UNKNOWN names its missing fact"); continue; }
    const id = assessmentIdOf(subject, check, d.outcome, f.id);
    if (seen.has(id)) { refuse(d, REFUSAL.DUPLICATE, "this assessment is already recorded"); continue; }
    seen.add(id);
    assessments.push(Object.freeze({
      record_type: ASSESSMENT_RECORD, assessment_id: id, measurement_key: `applicability_assessment:${id}`, subject,
      check: checkRef(check), outcome: d.outcome, kind: d.kind, status: "PROPOSED",
      evidence: Object.freeze({ factId: f.id, source: Object.freeze({ publisher: f.source?.publisher ?? null, url: f.source?.url ?? null, tier: f.source?.tier ?? null }), observedOn: h.freshness?.checkedOn ?? null, excerpt, excerptSha256: sha(excerpt) }),
      ...(d.outcome === OUTCOMES.UNKNOWN ? { missingFact: d.missingFact } : {}),
      draftedBy, draftedOn: on, recorded_at: `${on}T00:00:00Z`,
    }));
  }
  return Object.freeze({ assessments: Object.freeze(assessments), refused: Object.freeze(refused) });
}

/**
 * A confirmation of one PROPOSED assessment, or a refusal. F46 C3: only a checker DECLARED A PERSON confirms.
 */
export function confirmAssessment({ assessment, checker, persons, facts, on, existingIds = [] }) {
  if (!Array.isArray(persons)) throw new TypeError("the roster of declared persons must be passed explicitly (F46)");
  if (!ISO.test(on ?? "")) throw new TypeError("the judging date must be stated (YYYY-MM-DD)");
  if (assessment?.record_type !== ASSESSMENT_RECORD) return Object.freeze({ refused: REFUSAL.ASSESSMENT_UNKNOWN, why: "no such assessment" });
  if (assessment.outcome === OUTCOMES.UNKNOWN) return Object.freeze({ refused: REFUSAL.NOTHING_TO_CONFIRM, why: `an UNKNOWN is confirmed by supplying its missing fact, not by a signature — missing: ${assessment.missingFact}` });
  if (!present(checker) || !persons.includes(checker)) return Object.freeze({ refused: REFUSAL.MISSING_CHECKER, why: "the checker is not declared a person (F46 C3) — drafting needs none, confirmation does" });
  const h = assessFactHealth(facts.filter((f) => f?.life?.status !== "retired"), { on }).facts.find((x) => x.id === assessment.evidence.factId);
  if (h?.presentation !== "CURRENT") return Object.freeze({ refused: REFUSAL.STALE_SOURCE, why: `the evidence is no longer CURRENT by F45 on ${on}` });
  const id = sha(JSON.stringify([assessment.assessment_id, checker])).slice(0, 24);
  if (existingIds.includes(id)) return Object.freeze({ refused: REFUSAL.DUPLICATE, why: "this confirmation is already recorded" });
  return Object.freeze({ record: Object.freeze({ record_type: CONFIRMATION_RECORD, confirmation_id: id, measurement_key: `applicability_confirmation:${id}`, assessment_id: assessment.assessment_id, subject: assessment.subject, checker, confirmedOn: on, recorded_at: `${on}T00:00:00Z` }) });
}

/** READBACK — every derived check with its state: CONFIRMED · PROPOSED · UNKNOWN (with the missing fact named), counted apart. */
export function readback({ declaration, records, persons }) {
  if (!Array.isArray(persons)) throw new TypeError("the roster of declared persons must be passed explicitly (F46)");
  const assessments = records.filter((r) => r?.record_type === ASSESSMENT_RECORD);
  const confirmations = records.filter((r) => r?.record_type === CONFIRMATION_RECORD && persons.includes(r.checker));
  const rows = declaration.checks.map((c) => {
    const mine = assessments.filter((a) => a.check.body === c.body && sameScope(a.check.scope, c.scope));
    const confirmed = mine.filter((a) => a.outcome !== OUTCOMES.UNKNOWN && confirmations.some((x) => x.assessment_id === a.assessment_id));
    const stated = [...new Set(confirmed.map((a) => a.outcome))];
    if (stated.length === 1) return Object.freeze({ check: checkRef(c), state: "CONFIRMED", outcome: stated[0], assessments: confirmed.map((a) => a.assessment_id) });
    if (stated.length > 1) return Object.freeze({ check: checkRef(c), state: "UNKNOWN", outcome: OUTCOMES.UNKNOWN, missingFact: `CONFLICT — confirmed assessments state ${stated.join(" and ")}; none is chosen` });
    const proposed = mine.filter((a) => a.outcome !== OUTCOMES.UNKNOWN);
    if (proposed.length) return Object.freeze({ check: checkRef(c), state: "PROPOSED", outcome: OUTCOMES.UNKNOWN, proposedOutcomes: [...new Set(proposed.map((a) => a.outcome))], missingFact: "a confirmation by a checker declared a person (F46 C3)" });
    const silent = mine.find((a) => a.outcome === OUTCOMES.UNKNOWN);
    return Object.freeze({ check: checkRef(c), state: "UNKNOWN", outcome: OUTCOMES.UNKNOWN, missingFact: silent?.missingFact ?? "no assessment drafted for this check" });
  });
  const count = (k) => rows.filter((r) => r.state === k).length;
  return Object.freeze({ rows: Object.freeze(rows), counts: Object.freeze({ checks: rows.length, CONFIRMED: count("CONFIRMED"), PROPOSED: count("PROPOSED"), UNKNOWN: count("UNKNOWN") }) });
}

/** F16 may use a check as research guidance ONLY once it is CONFIRMED REQUIRED or ACCEPTED. */
export function confirmedGuidance(rb) {
  return Object.freeze(rb.rows.filter((r) => r.state === "CONFIRMED" && [OUTCOMES.REQUIRED, OUTCOMES.ACCEPTED].includes(r.outcome)).map((r) => Object.freeze({ check: r.check, outcome: r.outcome, limits: GUIDANCE_LIMITS })));
}
