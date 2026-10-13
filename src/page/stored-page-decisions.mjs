/**
 * 🔴 THE PAGE BUILDER READS F10'S STORED DECISIONS — AND DECIDES NOTHING ITSELF (RR-262; F10 Acceptance Amendment 4, _handoffs c063d3b,
 * is the ONE rule about two pages that serve the same need).
 *
 * PURE: no file, no network, no clock. Whether two pages serve the same need, which of them survives and which questions move is decided
 * once, by src/page/built-page-needs.mjs over BUILT pages, and stored. A rebuild reads those stored records and honours them:
 *   - a page a stored cancellation names is never proposed again, and no need the planning store still holds for it is joined into a
 *     page, so it is never rebuilt;
 *   - every question a stored move carried into the survivor stands in the survivor's question-and-answer section after the rebuild;
 *   - a pair stored as REVIEW, or as CANNOT DECIDE, is built as it is and listed for the owner — nothing is cancelled for it.
 * There is no judgement, no count and no survivor rule in this file: it compares no two pages.
 */
import { CANCEL_RECORD, MOVE_RECORD, DECISION_RECORD, DECISIONS, REVIEW_FLAG, withMoved } from "./built-page-needs.mjs";
import { valueOf, candidateValue } from "./joined-page.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";

const present = (v) => typeof v === "string" && v.trim() !== "";
const list = (v) => (Array.isArray(v) ? v : []);

/**
 * The stored decisions of ONE tenant, as they stand. A record of another tenant, or of none, is not read.
 * @returns {{ cancelled: Map<string, object>, moves: object[], listed: object[] }}
 *   cancelled  the cancelled page -> its stored cancellation
 *   moves      the stored moves of those cancellations
 *   listed     the pairs the owner decides: REVIEW and CANNOT DECIDE, by the latest stored decision of each pair of standing pages
 */
export function storedDecisions({ records = [], tenantId = null }) {
  /* whether a stored record is this tenant's is not decided here: it is F02's one decision (src/tenancy/scope.mjs) */
  const mine = list(records).filter((r) => present(r?.tenantId) && present(tenantId) && decideResolvedTenants(r.tenantId, tenantId).allowed);
  const cancelled = new Map(mine.filter((r) => r.record_type === CANCEL_RECORD && present(r.cancelledPage) && present(r.survivorPage)).map((c) => [c.cancelledPage, c]));
  const moves = mine.filter((r) => r.record_type === MOVE_RECORD && cancelled.get(r.fromPage)?.decision === r.decision);
  const latest = new Map();
  for (const d of mine) if (d.record_type === DECISION_RECORD && list(d.pages).length === 2) latest.set([...d.pages].sort().join("\u0000"), d);
  const listed = [...latest.values()].filter((d) => d.pages.every((p) => !cancelled.has(p)) && (d.flag === REVIEW_FLAG || d.decision === DECISIONS.CANNOT))
    .map((d) => Object.freeze({ pages: Object.freeze([...d.pages]), as: d.flag === REVIEW_FLAG ? REVIEW_FLAG : DECISIONS.CANNOT, why: d.flag === REVIEW_FLAG ? d.reason?.why ?? null : d.missing ?? null, decision: d.measurement_key }));
  return Object.freeze({ cancelled, moves: Object.freeze(moves), listed: Object.freeze(listed) });
}

/** The proposed pages a rebuild may build: every proposed page but one a stored cancellation names. Nothing else is changed. */
export function proposedAfterDecisions({ pages = [], decisions }) {
  const kept = [], notBuilt = [];
  for (const p of list(pages)) {
    const c = decisions?.cancelled?.get(valueOf(p?.combination)) ?? null;
    if (c) notBuilt.push(Object.freeze({ page: c.cancelledPage, survivorPage: c.survivorPage, cancellation: c.measurement_key, decidedByStep: c.decidedByStep ?? null }));
    else kept.push(p);
  }
  return Object.freeze({ pages: Object.freeze(kept), notBuilt: Object.freeze(notBuilt) });
}

/**
 * The construction set a rebuild may join: every compiled need but one whose recorded page candidate is a page a stored cancellation
 * names. The planning store keeps a cancelled page's needs (it is append-only); this is what keeps them from being joined into it again.
 */
export function constructionAfterDecisions({ construction = [], decisions }) {
  const kept = [], heldBack = [];
  for (const c of list(construction)) (decisions?.cancelled?.has(candidateValue(c?.spec?.basis?.pageCandidate)) ? heldBack : kept).push(c);
  return Object.freeze({ construction: Object.freeze(kept), heldBack: heldBack.length });
}

/**
 * A rebuilt page with the questions its stored moves carried into it: each under the item the move names, wording unchanged, once.
 * A question the rebuilt page already holds is left as it is. A question whose item is not on the rebuilt page cannot be placed: it is
 * counted (`noItem`) and stays in the stored record — it is never dropped silently and never put under another need.
 */
export function withStoredMoves({ page, decisions }) {
  const held = new Set(list(page?.itemList).flatMap((it) => list(it.questions).map((q) => q.questionId)));
  const items = new Set(list(page?.itemList).map((it) => it.needId));
  const once = new Map();
  for (const m of list(decisions?.moves)) if (m.intoPage === page?.value && !once.has(m.questionId)) once.set(m.questionId, m);
  const mine = [...once.values()];
  const due = mine.filter((m) => !held.has(m.questionId));
  const place = due.filter((m) => items.has(m.intoItem));
  const record = place.length ? withMoved({ record: page }, place.map((m) => ({ ...m, alreadyHeld: false }))) : page;
  return Object.freeze({ record, moved: mine.length, alreadyHeld: mine.length - due.length, placed: place.length, noItem: due.length - place.length });
}
