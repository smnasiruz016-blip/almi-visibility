/**
 * F35 · ACTION DECISION ENGINE — a JUSTIFIED action for every decision subject, or CANNOT DECIDE (acceptance _handoffs da659bd, RR-88).
 *
 * Spec row: "Choose KEEP, FIX, IMPROVE, ADD SECTION, MERGE, REFRESH, LINK, CREATE, MONITOR, NOINDEX, REDIRECT, REMOVE or REJECT."
 * Spec §1: "Page creation is conditional" · "A finding, recommendation, approved roadmap item and implemented feature are different
 * states and must never be conflated." V3 §5 (CREATE needs three independent demand categories; conflict → MONITOR), §8 (the actions),
 * §17.2 (MERGE and NOINDEX need owner approval; automatic deletion is forbidden). RR-88 §3: every action carries its recorded reason;
 * insufficient evidence is CANNOT DECIDE and never quietly becomes the safest-looking action; an unmeasured need never becomes a page.
 *
 * ── ONE EVIDENCE RULE PER ACTION (the acceptance's rules; each chosen action carries its rule and evidence ids) ─────────
 *
 *   proposed need   CREATE · IMPROVE · MONITOR · REJECT
 *   existing page   FIX · MERGE · REDIRECT · LINK · REFRESH · KEEP · ADD SECTION · NOINDEX · REMOVE
 *
 * Every chosen action is a RECOMMENDATION. MERGE, NOINDEX, REMOVE and REDIRECT are owner-approval-required. Nothing is created,
 * published, removed or written here — this module is pure and returns decisions only. No product is named here.
 */
import { SEMANTIC_ASPECTS } from "./duplication.mjs";

export const ACTIONS = Object.freeze(["KEEP", "FIX", "IMPROVE", "ADD SECTION", "MERGE", "REFRESH", "LINK", "CREATE", "MONITOR", "NOINDEX", "REDIRECT", "REMOVE", "REJECT"]);
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

/** V3 §5, read from a RECORDED demand outcome only. */
const strongDemand = (d) => d?.outcome === "STRONG" && Number(d.independentCategories) >= 3 && d.conflict !== true;
const monitorDemand = (d) => d !== null && d !== undefined && (d.conflict === true || Number(d.independentCategories) < 3 || d.zeroClickOnly === true || d.outcome === "MONITOR");

/**
 * A proposed need (a candidate page).
 * @param {{ slug: string, rightToExist: object, existingPageDecision: object, demand: object|null }} input
 */
export function decideForNeed({ slug, rightToExist, existingPageDecision, demand = null }) {
  const subject = Object.freeze({ kind: "PROPOSED_NEED", slug });
  const actions = [];
  const missing = [];
  const rte = rightToExist;
  const ex = existingPageDecision;
  const covering = ex?.needCoverage?.covering ?? [];

  /* REJECT — right-to-exist refused for a named substitution or template failure (doorway-like) */
  if (rte?.parts?.specific?.state === "FAIL" && rte.parts.specific.kind === "REJECT") {
    actions.push(chosen("REJECT", "RIGHT_TO_EXIST_REFUSED_AS_SUBSTITUTION_OR_TEMPLATE", [rte.parts.specific.reason]));
  }
  /* IMPROVE — an existing page covers the need AND carries a recorded defect */
  if (ex?.outcome === "IMPROVE") actions.push(chosen("IMPROVE", "COVERING_PAGE_HAS_A_RECORDED_DEFECT", [...(ex.existingPages ?? []).slice(0, 1)]));
  /* CREATE — right-to-exist ESTABLISHED, recorded STRONG demand, and the need not already served */
  if (rte?.outcome === "ESTABLISHED" && ex?.mayProduce === true) {
    if (strongDemand(demand)) actions.push(chosen("CREATE", "ESTABLISHED_AND_STRONG_RECORDED_DEMAND_AND_NOT_SERVED", [demand.ref, ex.reason]));
    else if (demand === null || demand === undefined) missing.push("CREATE needs a recorded demand outcome — none is recorded (no row issues V3 §5's demand outcome; F14 has no public-evidence path)");
  }
  /* MONITOR — a recorded demand outcome showing conflict, fewer than three categories, or zero clicks alone */
  if (monitorDemand(demand) && !strongDemand(demand)) actions.push(chosen("MONITOR", "RECORDED_DEMAND_CONFLICTED_OR_INSUFFICIENT", [demand.ref]));

  /* what is missing when nothing was chosen, named — never defaulted */
  if (covering.length && ex?.outcome !== "IMPROVE") missing.push("an existing page covers this need: KEEP needs a recorded quality measurement (none is authoritative — F40 blocked) and ADD SECTION needs recorded question-level coverage");
  if (rte?.outcome === "CANNOT_DECIDE") missing.push(`right-to-exist cannot be decided: ${rte.undecided.join(", ")}`);
  if (ex && ex.mayProduce !== true && !covering.length && ex.outcome !== "IMPROVE") missing.push(`the existing-page decision does not let a page through: ${ex.reason}`);
  return settle(subject, actions, missing);
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
    byAction: Object.freeze(byAction),
  });
}
