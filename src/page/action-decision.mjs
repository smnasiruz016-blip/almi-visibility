/**
 * F35 · ACTION DECISION ENGINE — a JUSTIFIED action for every decision subject, or CANNOT DECIDE (acceptance _handoffs da659bd, RR-88;
 * Acceptance Amendment 1 _handoffs dcddcb0, RR-174: grouped needs, RTP-1 P19's complete table, one CREATE rule, HOLD by its own name).
 *
 * Spec row: "Choose KEEP, FIX, IMPROVE, ADD SECTION, MERGE, REFRESH, LINK, CREATE, MONITOR, NOINDEX, REDIRECT, REMOVE or REJECT."
 * Spec §1: "Page creation is conditional" · "A finding, recommendation, approved roadmap item and implemented feature are different
 * states and must never be conflated." V3 §5's demand gate and its MONITOR are SUPERSEDED for a need (RTP-1 §17 S1, S21; P19), §8 (the actions),
 * §17.2 (MERGE and NOINDEX need owner approval; automatic deletion is forbidden). RR-88 §3: every action carries its recorded reason;
 * insufficient evidence is CANNOT DECIDE and never quietly becomes the safest-looking action; an unmeasured need never becomes a page.
 *
 * ── ONE EVIDENCE RULE PER ACTION (the acceptance's rules; each chosen action carries its rule and evidence ids) ─────────
 *
 *   grouped need    KEEP / NO NEW PAGE · IMPROVE / ADD SECTION · CREATE · HOLD · REJECT / CONNECT   (P19; Amendment 1 C3, C4, C8, C9)
 *   declared spec   HOLD — with no recorded question (A1), or decided as its grouped need(s); its `needs` shape is unchanged (F41)
 *   existing page   FIX · MERGE · REDIRECT · LINK · REFRESH · KEEP · ADD SECTION · NOINDEX · REMOVE
 *
 * Every chosen action is a RECOMMENDATION. MERGE, NOINDEX, REMOVE and REDIRECT are owner-approval-required. Nothing is created,
 * published, removed or written here — this module is pure and returns decisions only. No product is named here.
 */
import { SEMANTIC_ASPECTS } from "./duplication.mjs";

/* Amendment 1: MONITOR is no longer an outcome (M7–M9; demand strength is its own report line); CONNECT is new — a recommendation naming
 * the existing suitable page and the need's questions, never a record F35 writes (C6 stands). */
export const ACTIONS = Object.freeze(["KEEP", "FIX", "IMPROVE", "ADD SECTION", "MERGE", "REFRESH", "LINK", "CREATE", "CONNECT", "NOINDEX", "REDIRECT", "REMOVE", "REJECT"]);
export const OWNER_APPROVAL = Object.freeze(["MERGE", "NOINDEX", "REMOVE", "REDIRECT"]);
export const DECISION = Object.freeze({ CHOSEN: "CHOSEN", CANNOT_DECIDE: "CANNOT_DECIDE" });
export const STANDING = "RECOMMENDATION";
/* 🔴 RR-89 (reopened on CONCRETE_CONTRADICTORY_EVIDENCE, _handoffs 2f010f3): a shared broad need — or any similarity — is a REVIEW
 * TRIGGER, never proof that two pages should be merged (F32; V3 G15, §14.2). MERGE's authority is V3 §8 "Multiple pages split or
 * duplicate one intent", so a successor is a page a RECORDED semantic review finds to duplicate or split ONE intent with this one. */
export const REVIEW_MISSING = "a recorded semantic review, comparing intent, answer, facts, architecture, examples and user value (F32, V3 §14.2), that finds these pages duplicate or split ONE intent — a shared registered need is a review trigger, not that finding";

/** A recorded review supports MERGE only when it compared every aspect V3 names AND found one intent duplicated or split. */
export function reviewShowsOneIntent(review) {
  return Boolean(review) && SEMANTIC_ASPECTS.every((a) => review.compared?.includes(a)) && (review.duplicate === true || review.splitsOneIntent === true);
}

/* Actions that cannot share a subject with any other: each ends or replaces the page (or the proposal), or declares it fine as it is. */
export const EXCLUSIVE = Object.freeze(["KEEP", "REMOVE", "REDIRECT", "CREATE", "REJECT"]);
export function contradicts(actions) {
  const names = actions.map((a) => a.action);
  return names.length > 1 && names.some((n) => EXCLUSIVE.includes(n));
}

const chosen = (action, rule, evidence) => Object.freeze({ action, standing: STANDING, ownerApprovalRequired: OWNER_APPROVAL.includes(action), rule, evidence: Object.freeze([...new Set(evidence.filter(Boolean))]) });

function settle(subject, actions, missing) {
  if (actions.length && !contradicts(actions)) return Object.freeze({ subject, decision: DECISION.CHOSEN, actions: Object.freeze(actions), missing: Object.freeze(missing) });
  const why = actions.length ? [`contradicting actions: ${actions.map((a) => a.action).join(" + ")}`, ...missing] : missing;
  return Object.freeze({ subject, decision: DECISION.CANNOT_DECIDE, actions: Object.freeze([]), missing: Object.freeze(why.length ? why : ["no action's evidence rule is met"]) });
}

/* ── 🔴 F35 AMENDMENT 1 (_handoffs dcddcb0, RR-174) — NEED-LEVEL DECISIONS ─────────────────────────────────────────────────────────
 * One CREATE rule (C3 as amended; RTP-1 P19): no demand outcome, category or observation is required, under any name — the V3 §5 gate is
 * superseded (RTP-1 §17 S1, S21), and demand strength is reported on its own line, never an outcome and never a gate (M9). HOLD is how a
 * CANNOT DECIDE is RECORDED (C2 as narrowed, ruling RR-174 (a)): the decision is CANNOT_DECIDE, its class and outcome are HOLD, its missing
 * fact is named, and every count shows it by its own name. */
export const HOLD = "HOLD";
/* Ruling RR-174 (c): the one HOLD the spec compiler (F91 C19) may lift — the words are unchanged, now named once so the compiler reads them. */
export const NO_DECLARED_SPEC_HOLD = "no declared page spec for the need's candidate — right-to-exist waits for R4's spec compiler (ruling RR-174 (c))";
/** Ruling RR-179 (c): construction acts only on this — a grouped need F35 CHOSE to CREATE (a CHOSEN need always has a recorded question, C9). */
export const isChosenCreate = (d) => d?.subject?.kind === "GROUPED_NEED" && d.decision === DECISION.CHOSEN && (d.actions ?? []).some((a) => a.action === "CREATE");
export const OUTCOMES = Object.freeze({ KEEP: "KEEP / NO NEW PAGE", IMPROVE: "IMPROVE / ADD SECTION", CREATE: "CREATE", HOLD: "HOLD", REJECT: "REJECT / CONNECT" });
const OUTCOME_OF = Object.freeze({ KEEP: OUTCOMES.KEEP, IMPROVE: OUTCOMES.IMPROVE, "ADD SECTION": OUTCOMES.IMPROVE, CREATE: OUTCOMES.CREATE, REJECT: OUTCOMES.REJECT, CONNECT: OUTCOMES.REJECT });
export const DUPLICATION = Object.freeze({ NO_COMPARISON: "NO_COMPARISON_PAGE", RESOLVED: "RESOLVED_BY_A_SUBSTANCE_REVIEW", DUPLICATE: "DUPLICATE", REFUSED: "REFUSED_PENDING_GUIDANCE" });
export const GUIDANCE_REFUSAL = "duplication verdict REFUSED: it would depend on guidance, and no guidance reference qualifies until the guidance read is approved and done (RTP-1 P20; ruling RR-174 (d))";
const hold = (subject, missing, extra = {}) => Object.freeze({ subject, decision: DECISION.CANNOT_DECIDE, class: HOLD, outcome: OUTCOMES.HOLD, actions: Object.freeze([]), missing: Object.freeze(missing), ...extra });
const decided = (subject, action, extra) => { const d = settle(subject, [action], []); return Object.freeze({ ...d, outcome: OUTCOME_OF[action.action], ...extra }); };

/**
 * A declared page spec (the existing `needs` output, which F41 reads — its shape is unchanged until R4, ruling RR-174 (b)).
 * C9 (A1): a declared spec alone is never a reason for a page. With no recorded relevant question it is HOLD, its missing fact named; with
 * one, it is decided as its grouped need(s) in F35's own grouped-need field — one need, at most one page (C8c) — and HOLD here, naming them.
 * No existing page is deleted or changed because of it. `demand` is no longer read: it is never an outcome and never a gate (M9).
 * @param {{ slug: string, groupedNeedIds?: string[] }} input
 */
export function decideForNeed({ slug, groupedNeedIds = [] }) {
  const subject = Object.freeze({ kind: "PROPOSED_NEED", slug });
  if (!groupedNeedIds.length) return hold(subject, ["no recorded relevant question for this declared spec — a declared page spec alone is never a reason for a page (F35 C9, A1)"]);
  return hold(subject, [`decided as its grouped need(s) ${groupedNeedIds.join(", ")} (F35 C9) — one need, at most one page (C8c); the declared spec is never a second subject`]);
}

/**
 * The duplication verdict for one grouped need, under ruling RR-174 (d) until the guidance read is approved: resolved only where there is
 * NO comparison page among the tenant's existing pages and the other candidates (D1), or by a RECORDED substance review that needs no
 * guidance; a review finding a duplicate makes it DUPLICATE; anything else is REFUSED, the refusal recorded.
 * A review: { needId, against, verdict: "DISTINCT"|"DUPLICATE", needsGuidance: false, ref }.
 */
export function duplicationFor({ needId, comparisons = [], reviews = [] }) {
  if (!comparisons.length) return Object.freeze({ state: DUPLICATION.NO_COMPARISON, ref: "no comparison page among the tenant's existing pages and candidates (D1)", comparisons: 0 });
  const usable = reviews.filter((r) => r?.needId === needId && r.needsGuidance === false && typeof r.ref === "string" && r.ref.trim() !== "");
  const dup = usable.find((r) => r.verdict === "DUPLICATE" && comparisons.includes(r.against));
  if (dup) return Object.freeze({ state: DUPLICATION.DUPLICATE, against: dup.against, ref: dup.ref, comparisons: comparisons.length });
  const distinct = new Set(usable.filter((r) => r.verdict === "DISTINCT").map((r) => r.against));
  if (comparisons.every((c) => distinct.has(c))) return Object.freeze({ state: DUPLICATION.RESOLVED, ref: usable.filter((r) => r.verdict === "DISTINCT").map((r) => r.ref).join(","), comparisons: comparisons.length });
  return Object.freeze({ state: DUPLICATION.REFUSED, ref: GUIDANCE_REFUSAL, comparisons: comparisons.length, unreviewed: comparisons.filter((c) => !distinct.has(c)).length });
}

/**
 * A GROUPED NEED from F91 (C9), decided on P19's complete table (C4 as amended), the three guards (C8) and the one CREATE rule (C3 as
 * amended). Every decision carries the need's TIER.
 * @param {{ need: { needId: string, pageCandidate: string, questions: number, tier: string, centralSupported: boolean },
 *           coverage: object|null, rightToExist: object|null, duplication: object }} input
 */
export function decideGroupedNeed({ need, coverage, rightToExist, duplication }) {
  const subject = Object.freeze({ kind: "GROUPED_NEED", needId: need.needId, pageCandidate: need.pageCandidate });
  const extra = { tier: need.tier };
  /* C9 (A1): every page decision starts from a recorded relevant question */
  if (!(need.questions > 0)) return hold(subject, ["no recorded relevant question (F35 C9, A1)"], extra);
  /* C8 (a), C9: existing pages first — no decision without the coverage record F91 writes */
  if (!coverage) return hold(subject, ["no coverage record for this need (F91 C14) — existing pages first (C8a)"], extra);
  if (!["FULL", "PARTIAL", "NONE"].includes(coverage.coverage)) return hold(subject, [`coverage is ${coverage.coverage} (${coverage.reason}) — the coverage record decides nothing (F35 C9)`], extra);
  const pages = (coverage.pages ?? []).map((p) => p.pageId);
  /* P19: FULL and no needed gap → KEEP / NO NEW PAGE, on the coverage record — no quality measurement is needed for a need (F35-7) */
  if (coverage.coverage === "FULL" && coverage.relevantQuestionMissing !== true) return decided(subject, chosen("KEEP", "FULL_COVERAGE_AND_NO_NEEDED_GAP", [coverage.measurement_key, ...pages]), extra);
  /* P19: PARTIAL, or a relevant question missing from a suitable page → IMPROVE / ADD SECTION — never CREATE */
  if (coverage.coverage === "PARTIAL" || coverage.relevantQuestionMissing === true) return decided(subject, chosen("ADD SECTION", "A_RELEVANT_QUESTION_MISSING_FROM_A_SUITABLE_PAGE", [coverage.measurement_key, ...pages]), extra);
  /* coverage NONE */
  if (duplication?.state === DUPLICATION.DUPLICATE) return decided(subject, chosen("CONNECT", "A_DUPLICATE_CANDIDATE_CONNECTS_TO_THE_EXISTING_SUITABLE_PAGE", [duplication.against, duplication.ref]), extra);
  if (need.centralSupported !== true) return hold(subject, ["the central answer is unsupported (F35 C8b; F91 C18)"], extra);
  if (rightToExist === null || rightToExist === undefined) return hold(subject, [NO_DECLARED_SPEC_HOLD], extra);
  if (rightToExist.parts?.specific?.state === "FAIL" && rightToExist.parts.specific.kind === "REJECT") return decided(subject, chosen("REJECT", "RIGHT_TO_EXIST_REFUSED_AS_SUBSTITUTION_OR_TEMPLATE", [rightToExist.parts.specific.reason]), extra);
  if (rightToExist.outcome !== "ESTABLISHED") return hold(subject, [`right-to-exist is ${rightToExist.outcome}${rightToExist.undecided?.length ? `: ${rightToExist.undecided.join(", ")}` : ""}`], extra);
  if (duplication?.state === DUPLICATION.REFUSED) return hold(subject, [duplication.ref], { ...extra, duplicationRefusal: duplication.ref });
  if (![DUPLICATION.NO_COMPARISON, DUPLICATION.RESOLVED].includes(duplication?.state)) return hold(subject, ["the duplication verdict is not recorded"], extra);
  /* C3 as amended: no suitable existing page · DISTINCT and USEFUL · right-to-exist ESTABLISHED · duplication resolved → CREATE */
  return decided(subject, chosen("CREATE", "NO_SUITABLE_PAGE_DISTINCT_USEFUL_ESTABLISHED_AND_DUPLICATION_RESOLVED", [coverage.measurement_key, rightToExist.reason, duplication.ref]), extra);
}

/**
 * An existing page of the client.
 * @param {object} e  the page's recorded evidence bundle (see readClientActionEvidence)
 */
export function decideForPage(e) {
  const subject = Object.freeze({ kind: "EXISTING_PAGE", pageId: e.pageId });
  const actions = [];
  const missing = [];
  const served = e.servedState?.state === "OBSERVED" && e.servedState.status >= 200 && e.servedState.status < 300;
  const notServed = e.servedState?.state === "OBSERVED" && e.servedState.status >= 400;
  /* a successor is a same-need page a recorded review finds to duplicate or split one intent with this one; a merely shared need is not */
  const reviewed = (e.sameIntentPeers ?? []).filter((p) => p && p.pageId && p.reviewRef);
  const successor = reviewed.length > 0;
  const unreviewed = (e.sameNeedPeers ?? []).filter((id) => !reviewed.some((p) => p.pageId === id));

  /* FIX — a recorded technical contradiction (F21) or a recorded non-successful served state (the frozen rule, as written) */
  const fixEvidence = [];
  if (e.signals?.state === "CONTRADICTED") fixEvidence.push(`INDEXABILITY_CONTRADICTION_${e.signals.classes.join("_")}`, ...(e.signals.sources ?? []));
  if (e.servedState?.state === "OBSERVED" && !served) fixEvidence.push(`RECORDED_SERVED_STATE_${e.servedState.status}`, ...(e.servedState.evidence ?? []));
  if (fixEvidence.length) actions.push(chosen("FIX", "RECORDED_TECHNICAL_CONTRADICTION_OR_NON_SUCCESSFUL_SERVED_STATE", fixEvidence));
  const reviewEvidence = reviewed.flatMap((p) => [p.pageId, p.reviewRef]);
  /* REDIRECT — recorded not served, while a REVIEWED same-intent page exists to receive it (owner approval). Where FIX also holds,
   * restore-or-redirect is a genuine contradiction, and C2 makes it CANNOT DECIDE. */
  if (notServed && successor) actions.push(chosen("REDIRECT", "RECORDED_NOT_SERVED_AND_A_REVIEWED_SAME_INTENT_PAGE_EXISTS", reviewEvidence));
  /* MERGE — a recorded semantic review finds this page and another duplicate or split ONE intent (V3 §8; owner approval before any
   * merge is acted on). A shared broad need without that review is CANNOT DECIDE, the missing review named — never MERGE. */
  if (successor) actions.push(chosen("MERGE", "A_RECORDED_SEMANTIC_REVIEW_FINDS_ONE_INTENT_DUPLICATED_OR_SPLIT", reviewEvidence));
  else if (unreviewed.length) missing.push(`MERGE${notServed ? " and REDIRECT need" : " needs"} ${REVIEW_MISSING} — ${unreviewed.length} other page(s) share this page's registered need, none reviewed`);
  /* LINK — no recorded inbound link, within an inventory recorded COMPLETE */
  if (e.inboundLinks === 0) {
    if (e.completeness === "COMPLETE") actions.push(chosen("LINK", "NO_INBOUND_LINK_IN_A_COMPLETE_INVENTORY", [e.completenessRef]));
    else missing.push(`LINK needs a COMPLETE inventory to say a page has no inbound link — it is ${e.completeness ?? "UNKNOWN"}`);
  }
  /* REFRESH — a recorded measurement that a material fact on the page is past its freshness window */
  if ((e.staleFacts ?? []).length) actions.push(chosen("REFRESH", "A_MATERIAL_FACT_ON_THE_PAGE_IS_PAST_ITS_FRESHNESS", [...e.staleFacts]));
  /* KEEP / ADD SECTION / NOINDEX / REMOVE — only on their own recorded evidence */
  if (e.quality?.satisfiesIntent === true) actions.push(chosen("KEEP", "RECORDED_QUALITY_SATISFIES_THE_INTENT", [e.quality.ref]));
  else missing.push("KEEP needs a recorded quality measurement — none is authoritative (F40 blocked)");
  if (e.questionCoverage?.newQuestionInIntent === true) actions.push(chosen("ADD SECTION", "RECORDED_NEW_QUESTION_IN_THE_PAGE_INTENT", [e.questionCoverage.ref]));
  if (e.postPublication?.weakResult === true && e.postPublication.ownerApprovalPath === true) actions.push(chosen("NOINDEX", "RECORDED_WEAK_RESULT_AFTER_THE_EVALUATION_WINDOW", [e.postPublication.ref]));
  if (e.removal?.notServed === true && e.removal.noSuccessor === true && e.removal.noDemand === true) actions.push(chosen("REMOVE", "RECORDED_NOT_SERVED_NO_SUCCESSOR_NO_DEMAND", [e.removal.ref]));
  if (e.signals?.state === "NOT_MEASURED") missing.push("indexability signals are NOT MEASURED for this page (F21)");
  return settle(subject, actions, missing);
}

/** Count-only summary with its population. */
export function summarise(decisions) {
  const byAction = Object.fromEntries(ACTIONS.map((a) => [a, decisions.filter((d) => d.actions.some((x) => x.action === a)).length]));
  return Object.freeze({
    population: decisions.length,
    chosen: decisions.filter((d) => d.decision === DECISION.CHOSEN).length,
    cannotDecide: decisions.filter((d) => d.decision === DECISION.CANNOT_DECIDE).length,
    /* ruling RR-174 (a): HOLD is shown by its own name in every count */
    hold: decisions.filter((d) => d.class === HOLD).length,
    byOutcome: Object.freeze(Object.fromEntries(Object.values(OUTCOMES).map((o) => [o, decisions.filter((d) => d.outcome === o).length]))),
    byAction: Object.freeze(byAction),
  });
}
