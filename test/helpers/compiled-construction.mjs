/**
 * RR-335 · TEST-ONLY. RR-295 retired the old builder (src/page/construct.mjs) and with it the F37/F40/F41 tests that reached F37's draft, F40's
 * judgement and F41's preview through it. Those three rules are still live code; this helper hands their tests the SAME result the old
 * builder gave a compiled spec F35 chose (its parts: f35Decision, facts, completeness, draft, overlap, whyThisUrl, existingPage,
 * informationGain), computed by the live modules the builder called (F37's render, F36's right-to-exist, F34's coverage decision, F39's
 * information gain). Only the compiled-spec path is kept — a hand-declared page spec (renderPage) is retired with the builder.
 */
import { renderCompiledDraft, DRAFT, CHECK } from "../../src/page/draft-render.mjs";
import { isChosenCreate } from "../../src/page/action-decision.mjs";
import { rightToExist } from "../../src/page/right-to-exist.mjs";
import { existingPageDecisionFromCoverage } from "../../src/page/spec-compiler.mjs";
import { COVERAGE } from "../../src/page/demand-connection.mjs";
import { informationGainForCandidate, GAIN_OUTCOME } from "../../src/page/information-gain.mjs";
import { verifiedPages } from "../../src/page/duplication-evidence.mjs";
import { OVERLAP_REVIEW_TRIGGER } from "../../src/gate-a/adaptive.mjs";
import { LONE_PAGE } from "../../src/gate-a/why-this-url.mjs";

export const PASS = "PASS", FAIL = "FAIL", NOT_TESTED = "BLOCKED / NOT TESTED", ACCEPTED = "ACCEPTED", REFUSED = "REFUSED";
export const NO_F35_DECISION = "no F35 decision was handed in — construction acts only on F35's decision (the owner's ruling RR-179 (c); A1, P3); nothing is built";
export const NOT_CHOSEN = "F35 did not choose CREATE for this spec — a spec with no recorded relevant question, or one F35 did not choose, is never built (ruling RR-179 (c); A1, P3)";

export function decisionsForConstruction(ae) {
  if (!ae || ae.fault) return Object.freeze({ decisions: Object.freeze([]), why: `F35's evidence is unavailable (${ae?.fault ?? "none read"}) — nothing is chosen` });
  if (!ae.compiled) return Object.freeze({ decisions: Object.freeze([]), why: ae.groupedNeedsMissing ?? "F35 decided no grouped need" });
  const decisions = ae.compiled.forConstruction.filter((d) => isChosenCreate(d.decision));
  return Object.freeze({ decisions: Object.freeze(decisions), why: decisions.length ? null : "F35 chose CREATE for no need" });
}
export const planFor = (plans, decision) => (Array.isArray(plans) ? plans : []).find((p) => p?.subject?.ref === `F35:CREATE:${decision?.subject?.needId}`) ?? null;

/** The old builder's result for each requested compiled spec F35 chose (the same shape and the same parts). */
export function constructCandidates({ requested = [], existingPages = null, gainEvidence = null, decisions = null, variants = [], rationaleReviews = [], plans = [] }) {
  const family = (Array.isArray(decisions) ? decisions : []).filter((d) => d?.spec && isChosenCreate(d.decision)).map((d) => {
    const draft = renderCompiledDraft({ spec: d.spec, decision: d.decision, plan: planFor(plans, d.decision) });
    return { slug: d.slug, spec: d.spec, html: draft.state === DRAFT.RENDERED ? draft.html : null, trace: draft.state === DRAFT.RENDERED ? draft.trace : [], renderError: draft.state === DRAFT.RENDERED ? null : draft.why, draft };
  });
  return requested.map((slug) => {
    const me = family.find((f) => f.slug === slug);
    if (!me) throw new Error(`constructCandidates: ${slug} is not in the declared family`);
    const chosen = decisions.find((d) => d?.slug === slug && isChosenCreate(d.decision));
    const siblings = family.filter((f) => f.slug !== slug);
    const d = me.draft, parts = {};
    parts.f35Decision = { state: PASS, kind: null, rule: "RR-179 (c): F35 CHOSE CREATE", value: chosen.decision.subject.needId, reason: null };
    const ok = d?.state === DRAFT.RENDERED && d.checks.everyClaimSourced.state === CHECK.PASS && d.trace.length > 0;
    parts.facts = { state: ok ? PASS : FAIL, kind: ok ? null : "DATA GAP", rule: "F37 C3: every written claim is a supported claim (F91 C17) with its own statement, label, source and trace",
      value: d?.trace?.length ?? 0, cited: d?.trace?.length ?? 0, unsupported: [], reason: ok ? null : (d?.why ?? "no supported claim written with its source"), notVerified: [], verifiedButNotCounted: [] };
    const unanswered = d?.state === DRAFT.RENDERED ? d.sectionsOut.filter((s) => s.claims === 0).map((s) => s.heading) : null;
    parts.completeness = { state: unanswered === null ? NOT_TESTED : unanswered.length ? FAIL : PASS, kind: unanswered?.length ? "REJECT" : null,
      rule: "F37 C5: every Q&A section answered by the need's supported answer (P21, P17)", sections: me.spec?.sections?.length ?? 0,
      reason: unanswered === null ? d?.why : unanswered.length ? `${unanswered.length} Q&A section(s) not answered: ${unanswered.map((h) => `"${h}"`).join(", ")}` : null, detail: null };
    const st = d?.checksVerdict;
    parts.draft = { state: d?.state !== DRAFT.RENDERED ? NOT_TESTED : st === CHECK.PASS ? PASS : st === CHECK.FAIL ? FAIL : NOT_TESTED, kind: st === CHECK.FAIL ? "REJECT" : null,
      rule: "F37 C5: P21's measurable checks — direct answer, every claim sourced, headings match, internal links in and out, technical eligibility, markup aligned",
      reason: d?.state !== DRAFT.RENDERED ? d?.why : Object.entries(d.checks).filter(([, c]) => c.state !== CHECK.PASS).map(([k, c]) => `${k} ${c.state}: ${c.why}`).join("; ") || null,
      checks: d?.checks ?? null, writer: d?.writer ?? null };
    parts.overlap = me.html === null ? { state: NOT_TESTED, reason: `the candidate does not render: ${me.renderError}` }
      : siblings.length === 0 ? { state: PASS, kind: null, rule: "D1 (S41, record B)", value: null, reviewTrigger: OVERLAP_REVIEW_TRIGGER, reviewRequired: false, reason: null, basis: LONE_PAGE }
      : { state: NOT_TESTED, reason: "a family of compiled specs is not judged here (the old builder's shared-shell overlap is retired)" };
    const existing = existingPageDecisionFromCoverage({ record_type: COVERAGE, coverage: me.spec?.basis?.coverage?.outcome ?? null, measurement_key: me.spec?.basis?.coverage?.ref ?? null, pages: [] });
    parts.existingPage = { state: existing.mayProduce ? PASS : existing.outcome === "REFUSED" ? NOT_TESTED : FAIL, kind: existing.mayProduce ? null : "REJECT", outcome: existing.outcome, value: existing.considered,
      matched: existing.matched, coverageState: existing.coverageState, existingPages: existing.existingPages, reason: existing.mayProduce ? null : `${existing.outcome} — ${existing.reason}`, decision: existing };
    const rte = rightToExist({ slug, spec: me.spec, siblings: siblings.map((s) => ({ slug: s.slug, spec: s.spec })), variants, existingPageDecision: existing, rationaleReviews });
    const specific = rte.parts.specific, partFour = specific.state === "PASS" ? PASS : specific.state === "FAIL" ? FAIL : NOT_TESTED;
    parts.whyThisUrl = { state: partFour, kind: partFour === FAIL ? specific.kind ?? "REJECT" : null, reason: specific.reason ?? null, checks: rte.checks, notEnforced: rte.notMeasured, rightToExist: rte };
    const currentPages = existingPages?.inventory ? verifiedPages(existingPages) : null;
    const gain = me.html === null || currentPages === null || gainEvidence === null ? null : informationGainForCandidate({ candidateId: `candidate:${slug}`, html: me.html, currentPages, evidence: gainEvidence });
    parts.informationGain = gain === null
      ? { state: NOT_TESTED, kind: null, outcome: GAIN_OUTCOME.CANNOT_DECIDE, reason: me.html === null ? `the candidate does not render: ${me.renderError}` : currentPages === null ? "the tenant's current pages with verified bodies were not handed in (F31)" : "no gain evidence was handed in — an empty list must be passed explicitly", decision: null }
      : { state: gain.outcome === GAIN_OUTCOME.ESTABLISHED ? PASS : gain.outcome === GAIN_OUTCOME.REFUSED ? FAIL : NOT_TESTED, kind: gain.outcome === GAIN_OUTCOME.REFUSED ? "REJECT" : null, outcome: gain.outcome,
        reason: gain.outcome === GAIN_OUTCOME.REFUSED ? `NOT BEYOND ${gain.refusedOn.join(", ")}` : gain.outcome === GAIN_OUTCOME.CANNOT_DECIDE ? gain.missing.join(" | ") : null, decision: gain };
    const rejects = [], notTested = [], dataGaps = [];
    if (me.html === null) rejects.push({ part: "render", reason: `the candidate does not render: ${me.renderError}` });
    for (const [part, p] of Object.entries(parts)) {
      if (p.state === NOT_TESTED) notTested.push({ part, reason: p.reason });
      else if (p.state === FAIL) (p.kind === "DATA GAP" ? dataGaps : rejects).push({ part, reason: p.reason });
    }
    const accepted = me.html !== null && Object.values(parts).every((p) => p.state === PASS);
    return { slug, verdict: accepted ? ACCEPTED : REFUSED, html: accepted ? me.html : null, trace: accepted ? me.trace : null, parts, dataGaps, rejects, notTested };
  });
}
