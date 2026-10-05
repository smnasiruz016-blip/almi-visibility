/**
 * F91 · C19 · A GROUPED NEED BECOMES A DRAFTABLE SPEC (Acceptance Amendment 4, _handoffs 0abcd15; RTP-1 Rev 6 §19.7 and §21 R4; the owner's
 * ruling RR-174 (c) and RR-179).
 *
 * A PURE spec compiler: F91's planning-store rows and ONE F35 decision for one grouped need go in; one spec (or a named refusal) comes out.
 * It writes nothing, adds no fact, and never rewrites a question's wording.
 *
 *   F35 decision                                   purpose                     what the spec is
 *   HOLD only for want of a declared page spec     RIGHT_TO_EXIST              a page spec F36 judges; NEVER handed to construction
 *     (ruling RR-174 (c))                                                      (A1: a compiled spec is never by itself a reason for a page)
 *   CHOSEN · CREATE                                CONSTRUCTION                a page spec; the only purpose construction accepts
 *   CHOSEN · ADD SECTION / IMPROVE                 SECTION_PROPOSAL            the Q&A for each relevant question the coverage record names as
 *                                                                              missing, addressed to the covering existing page — never a new
 *                                                                              page, a new draft of a new page or a new URL (F34 C2, F33 C8); the
 *                                                                              existing page stays unchanged until the owner approves (F34 C3)
 *   anything else                                  —                           REFUSED, named (never compiled)
 *
 * The spec: one Q&A section per grouped question, its heading the question's OWN wording, carrying its tier and GENERATED marking (the
 * record's own marking: a route-1 wording from the client's AI connection is GENERATED, F16 C29; carried from the connection's route); its claims = the ids of the need's SUPPORTED answer claims (F91 C17); every unsupported
 * claim declared UNKNOWN with its reason, never as a fact; its subject = the group id. A wording that attributes itself to people (F16 C29's
 * attribution check, src/research/research-derived.mjs) never becomes a heading without observed evidence: it is named, never rewritten, and
 * no section is compiled under it. The same need compiled twice gives identical bytes (`specBytes`).
 *
 * The why-this-URL rationale is assembled ONLY from recorded content — the lead question's own wording, the other grouped questions' own
 * wordings and the supporting sources' names — never invented; F36 judges it like any other (a template or a near-identical one is caught).
 */
import { createHash } from "node:crypto";
import { CONNECTION, NEED, COVERAGE, TIERS } from "./demand-connection.mjs";
import { attributionRefusal, ROUTES } from "../research/research-derived.mjs";
import { ANSWER_STATES } from "./answer-support.mjs";
import { HOLD, NO_DECLARED_SPEC_HOLD } from "./action-decision.mjs";
import { EXISTING_PAGE_OUTCOMES } from "./existing-page-first.mjs";

export const PURPOSE = Object.freeze({ RIGHT_TO_EXIST: "RIGHT_TO_EXIST", CONSTRUCTION: "CONSTRUCTION", SECTION_PROPOSAL: "SECTION_PROPOSAL" });
export const SPEC_KIND = Object.freeze({ PAGE: "PAGE", SECTION_PROPOSAL: "SECTION_PROPOSAL" });
export const GENERATED = "GENERATED";
export const COMPILE_REFUSAL = Object.freeze({
  NOT_CHOSEN: "F35 neither chose this need nor held it only for want of a declared page spec (ruling RR-174 (c)) — nothing is compiled",
  NO_QUESTION: "the need has no recorded relevant question in the planning store (A1) — nothing is compiled",
  NO_SECTION: "every question of the need attributes itself to people without observed evidence (F16 C29) — no section is left to compile",
  NO_TARGET: "an IMPROVE / ADD SECTION decision names no existing page — a section proposal has nothing to address",
  NO_MISSING: "the coverage record names no missing relevant question — a section proposal has nothing to add",
});

const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);
const present = (v) => typeof v === "string" && v.trim() !== "";
const byQuestion = (a, b) => (a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0);

/** The compiled spec's slug, from the group id alone. */
export const compiledSlug = (needId) => `compiled-${hash(["C19", needId])}`;

/** Which purpose an F35 decision admits, or null. */
export function purposeOf(decision) {
  if (decision?.subject?.kind !== "GROUPED_NEED") return null;
  if (decision.class === HOLD) return decision.missing?.length === 1 && decision.missing[0] === NO_DECLARED_SPEC_HOLD ? PURPOSE.RIGHT_TO_EXIST : null;
  if (decision.decision !== "CHOSEN") return null;
  const acts = (decision.actions ?? []).map((a) => a.action);
  if (acts.includes("CREATE")) return PURPOSE.CONSTRUCTION;
  if (acts.includes("ADD SECTION") || acts.includes("IMPROVE")) return PURPOSE.SECTION_PROPOSAL;
  return null;
}

/** The answer split claim by claim: the supported claim ids, and every other claim declared UNKNOWN with its reason. */
function answerParts(answer) {
  const claims = Array.isArray(answer?.claims) ? answer.claims : [];
  const supported = claims.filter((c) => c.state === ANSWER_STATES.SUPPORTED && present(c.claimId));
  const unknown = claims.filter((c) => !supported.includes(c)).map((c) => Object.freeze({ claimId: c.claimId ?? null, state: ANSWER_STATES.UNKNOWN, why: c.why ?? "unsupported" }));
  if (!claims.length) unknown.push(Object.freeze({ claimId: null, state: ANSWER_STATES.UNKNOWN, why: answer?.why ?? "no answer was recorded" }));
  return {
    claims: Object.freeze([...new Set(supported.map((c) => c.claimId))].sort()),
    labels: Object.freeze(supported.map((c) => Object.freeze({ claimId: c.claimId, label: c.label, source: c.source?.name ?? null })).sort((a, b) => (a.claimId < b.claimId ? -1 : 1))),
    unknown: Object.freeze(unknown.sort((a, b) => String(a.claimId) < String(b.claimId) ? -1 : 1)),
  };
}

/**
 * @param {{ decision: object, rows: object[], overturned?: Set<string> }} input
 *   decision  F35's decision for ONE grouped need (src/page/action-decision.mjs decideGroupedNeed)
 *   rows      F91's planning-store rows (connections, need records, coverage records) — read, never written
 * @returns {{ spec: object|null, refused: string|null, excluded: object[] }}
 */
export function compileNeedSpec({ decision, rows = [], overturned = new Set() }) {
  const purpose = purposeOf(decision);
  if (!purpose) return Object.freeze({ spec: null, refused: COMPILE_REFUSAL.NOT_CHOSEN, excluded: Object.freeze([]) });
  const needId = decision.subject.needId;
  const qs = rows.filter((r) => r?.record_type === CONNECTION && r.needId === needId && present(r.wording) && !overturned.has(r.questionId))
    .map((r) => ({ questionId: r.questionId, wording: r.wording, tier: r.tier ?? TIERS.OBSERVED, generated: r.tier === TIERS.RESEARCH_DERIVED && r.route === ROUTES.CLIENT_AI })).sort(byQuestion);
  if (!qs.length) return Object.freeze({ spec: null, refused: COMPILE_REFUSAL.NO_QUESTION, excluded: Object.freeze([]) });
  let need = null, coverage = null;
  for (const r of rows) {
    if (r?.record_type === NEED && r.needId === needId) need = r;
    if (r?.record_type === COVERAGE && r.needId === needId) coverage = r;
  }
  const excluded = [];
  const usable = qs.filter((q) => {
    const why = attributionRefusal(q.wording, { tier: q.tier });
    if (why) excluded.push(Object.freeze({ questionId: q.questionId, why }));
    return !why;
  });
  let target = null, wanted = usable;
  if (purpose === PURPOSE.SECTION_PROPOSAL) {
    target = (decision.actions.find((a) => a.action === "ADD SECTION" || a.action === "IMPROVE")?.evidence ?? []).filter((e) => (coverage?.pages ?? []).some((p) => p.pageId === e));
    if (!target.length) return Object.freeze({ spec: null, refused: COMPILE_REFUSAL.NO_TARGET, excluded: Object.freeze(excluded) });
    const missing = new Set(coverage?.missingQuestions ?? []);
    wanted = usable.filter((q) => missing.has(q.questionId));
    if (!missing.size) return Object.freeze({ spec: null, refused: COMPILE_REFUSAL.NO_MISSING, excluded: Object.freeze(excluded) });
  }
  if (!wanted.length) return Object.freeze({ spec: null, refused: COMPILE_REFUSAL.NO_SECTION, excluded: Object.freeze(excluded) });
  const answer = answerParts(need?.answer);
  const sections = wanted.map((q) => Object.freeze({
    heading: q.wording, questionId: q.questionId, tier: q.tier, marking: q.generated ? GENERATED : null,
    claims: answer.claims, unknown: answer.unknown,
  }));
  const countrySections = (need?.sections ?? []).map((s) => {
    const a = answerParts(s.answer);
    return Object.freeze({ country: s.country, claims: a.claims, unknown: a.unknown });
  }).sort((a, b) => (a.country < b.country ? -1 : 1));
  const lead = wanted[0];
  const sources = [...new Set(answer.labels.map((l) => l.source).filter(present))].sort();
  const spec = Object.freeze({
    kind: purpose === PURPOSE.SECTION_PROPOSAL ? SPEC_KIND.SECTION_PROPOSAL : SPEC_KIND.PAGE,
    purpose,
    subject: needId,
    variant: needId,
    title: lead.wording,
    sections: Object.freeze(sections),
    countrySections: Object.freeze(countrySections),
    answer: Object.freeze({ state: need?.answer?.state ?? ANSWER_STATES.UNKNOWN, claims: answer.claims, labels: answer.labels, unknown: answer.unknown }),
    whyThisUrlDeservesToExist: Object.freeze({
      humanNeed: lead.wording,
      distinctValue: `${wanted.length} grouped question(s) answered in one place: ${wanted.map((q) => q.wording).join(" · ")}${sources.length ? ` — supported by ${sources.join(", ")}` : ""}`,
    }),
    target: target ? Object.freeze({ existingPages: Object.freeze([...target].sort()), unchangedUntilOwnerApproves: true }) : null,
    basis: Object.freeze({ needId, pageCandidate: decision.subject.pageCandidate ?? null, tier: decision.tier ?? null, coverage: coverage ? Object.freeze({ outcome: coverage.coverage, ref: coverage.measurement_key }) : null }),
  });
  return Object.freeze({ spec, refused: null, excluded: Object.freeze(excluded) });
}

/**
 * The existing-page decision for a COMPILED spec, read from the need's own coverage record (F91 C14, written through F33 C8's own function
 * — the record F35 decided on). F34's `existingPageFirst` and F33's `decideNeedCoverage` judge only registered values and stay UNCHANGED
 * (RR-178 I-2); a group id is not a registered value, so they are not asked. NONE over a COMPLETE population → NOT COVERED (F33 C3, the
 * only outcome that lets a page through); FULL / PARTIAL → COVERED, served (F33 C2); a REFUSED record → REFUSED; anything else or no record
 * → HOLD, its missing fact named. The shape is the one F36's right-to-exist reads.
 */
export function existingPageDecisionFromCoverage(record) {
  const O = EXISTING_PAGE_OUTCOMES;
  const pages = (record?.pages ?? []).map((p) => p.pageId).sort();
  const base = { coverageRecord: record?.measurement_key ?? null, considered: record?.considered ?? 0, existingPages: pages };
  const out = (outcome, reason, need) => Object.freeze({ ...base, outcome, reason, needCoverage: need ? Object.freeze({ outcome: need }) : null, mayProduce: outcome === O.NOT_COVERED });
  if (record?.record_type !== COVERAGE) return out(O.HOLD, "no coverage record for the need (F91 C14) — existing pages first", null);
  if (record.coverage === "NONE") return out(O.NOT_COVERED, record.reason ?? "NONE over a COMPLETE population", "NOT_COVERED");
  if (record.coverage === "FULL" || record.coverage === "PARTIAL") return out(record.coverage === "FULL" ? O.KEEP : O.IMPROVE, "AN_EXISTING_PAGE_SERVES_THIS_INTENT", "COVERED");
  if (record.coverage === "REFUSED") return out(O.REFUSED, record.reason ?? "the existing-page population was refused", null);
  return out(O.HOLD, record.reason ?? `coverage ${record.coverage}`, "CANNOT_DECIDE");
}

/** The spec's bytes, in its fixed field order — the same need compiled twice gives identical bytes. */
export const specBytes = (spec) => JSON.stringify(spec);
