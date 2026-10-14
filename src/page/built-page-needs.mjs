/**
 * 🔴 F10 · BUILT PAGES AGAINST THEIR NEEDS (F10 Acceptance Amendment 4, _handoffs c063d3b, C3 to C6; Specification Amendment 6).
 *
 * PURE: no file, no network, no clock. It reads the pages the engine has built for ONE tenant and the stored need records that place
 * their questions into needs (F12), and from those records alone:
 *   C3  reports each page's question-and-answer section — PRESENT, ABSENT or MORE THAN ONE — and that every question keeps its wording;
 *   C4  decides each pair of built, unpublished pages SAME NEED (equal need sets — WHOLE pages only), DIFFERENT NEED or CANNOT DECIDE,
 *       each with its reason and INFERRED; and flags REVIEW a pair in which all of one page's needs are the other's and the declared
 *       audience is the same — a count of shared need records, never a text score, and never a cancellation;
 *   C5  for a SAME NEED pair cancels exactly one page by the owner's three-step survivor rule and moves every question of it into the
 *       survivor's question-and-answer section — unpublished pages only;
 *   C6  gives the result after a run: PROVED, DISPROVED or COULD-NOT-PROVE.
 * It groups nothing and judges no meaning: a question no need record holds makes its pair CANNOT DECIDE.
 */
import { createHash } from "node:crypto";
import { DECISIONS, REVIEW_FLAG, DECISION_LABEL, NEVER_A_DECISION_LABEL, SCORE_FIELDS, SURVIVOR_STEPS, PUBLICATION, PUBLISHED_FIELDS, SECTION, VERDICTS, MIN_PAGES } from "../../config/page/built-page-needs.mjs";
import { JOINED_RECORD, STRUCTURE, escapeText } from "./joined-page.mjs";
import { STAMP } from "./test-exception.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";

export const DECISION_RECORD = "built_page_pair_decision";
export const CANCEL_RECORD = "built_page_cancellation";
export const MOVE_RECORD = "built_page_question_move";
export const NEED_RECORD = "need_cluster";
export const NEED_PLACE = "A NEED";

export const REFUSAL = Object.freeze({
  CROSS_TENANT: "PAGES_OF_DIFFERENT_TENANTS_ARE_NEVER_COMPARED",
  NO_TENANT: "A_PAGE_WITHOUT_ITS_TENANT_IS_NOT_COMPARED",
  SCORE: "A_DECISION_IS_NEVER_MADE_FROM_A_SCORE",
  PUBLISHED: "A_PUBLISHED_PAGE_IS_NEVER_CANCELLED_OR_CHANGED",
  NOT_RECORDED: "A_PAGE_WITH_NO_RECORDED_PUBLICATION_STATE_IS_NEVER_CANCELLED_OR_CHANGED",
  NOT_SAME: "ONLY_A_SAME_NEED_PAIR_IS_CANCELLED",
  REVIEW: "A_REVIEW_PAIR_IS_NEVER_CANCELLED",
  AUDIENCE_LATE: "AUDIENCE_WORDS_ARE_DECLARED_BEFORE_THE_RUN",
  NO_SURVIVOR: "ALL_THREE_STEPS_TIE_NOTHING_IS_CANCELLED",
});
export const MISSING = Object.freeze({
  NO_RECORDS: "no need record is stored",
  UNPLACED: "a question of the page stands in no need record",
  NO_NEED: "the page has no need",
  TIE: "the survivor rule ties on all three steps",
});

const present = (v) => typeof v === "string" && v.trim() !== "";
const list = (v) => (Array.isArray(v) ? v : []);
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);
const isDay = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const holdsAny = (o, fields) => o !== null && typeof o === "object" && fields.some((f) => Object.hasOwn(o, f));

/** C5 · what a page's own record says about publication. Nothing is assumed: a record that says neither is NOT RECORDED. */
export function publicationOf(record) {
  if (PUBLISHED_FIELDS.some((f) => present(record?.[f]))) return PUBLICATION.PUBLISHED;
  if (record?.stamp === STAMP) return PUBLICATION.UNPUBLISHED;
  return PUBLICATION.NOT_RECORDED;
}

/**
 * THE PAGES AS THEY STAND for one tenant: of every stored build of a page, the latest is the page; a page a stored cancellation names by
 * that latest build is cancelled and is no longer a page. `builtAt` is when the page was FIRST built (the earlier-built page, C5).
 * `audiences`: { [pageId]: { audience, words: [text], declaredOn } } — the client's own declaration.
 */
export function builtPages({ records = [], tenantId = null, audiences = {} }) {
  const latest = new Map(), first = new Map();
  for (const r of list(records)) if (r?.record_type === JOINED_RECORD && present(r.value)) { latest.set(r.value, r); if (!first.has(r.value)) first.set(r.value, r.recorded_at ?? null); }
  const gone = new Set(list(records).filter((r) => r?.record_type === CANCEL_RECORD).map((r) => r.cancelledBuild));
  const pages = [];
  for (const [pageId, record] of [...latest].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (gone.has(record.measurement_key)) continue;
    const a = audiences?.[pageId] ?? null;
    pages.push(Object.freeze({ pageId, tenantId, build: record.measurement_key, builtAt: first.get(pageId), publication: publicationOf(record),
      audience: present(a?.audience) ? a.audience.trim() : null, audienceWords: Object.freeze(list(a?.words).filter(present).map((w) => w.trim())), audienceDeclaredOn: isDay(a?.declaredOn) ? a.declaredOn : null, record }));
  }
  return Object.freeze(pages);
}

/** The questions a built page holds in its question-and-answer section, in page order, with the item each stands in. */
export const questionsOf = (page) => list(page?.record?.itemList).flatMap((it) => list(it.questions).map((q) => Object.freeze({ questionId: q.questionId, wording: q.wording, item: it.needId })));

/**
 * C3 · THE QUESTION-AND-ANSWER SECTION of each built page: PRESENT, ABSENT or MORE THAN ONE, and every question in its recorded wording.
 * `recorded`: Map questionId -> the wording as recorded. With more than one section, a need whose questions stand in two is SPLIT.
 */
export function pageSections({ pages = [], recorded = new Map(), needOf = () => null }) {
  const mark = `<h2>${STRUCTURE.questions}</h2>`;
  const rows = [], faults = [];
  for (const p of list(pages)) {
    const html = String(p.record?.html ?? ""), n = html.split(mark).length - 1, qs = questionsOf(p);
    const section = n === 1 && qs.length > 0 ? SECTION.PRESENT : n > 1 ? SECTION.MORE : SECTION.ABSENT;
    rows.push(Object.freeze({ pageId: p.pageId, section, questions: qs.length }));
    if (section !== SECTION.PRESENT) faults.push(Object.freeze({ code: `SECTION_${section.replace(/ /g, "_")}`, pageId: p.pageId }));
    for (const q of qs) {
      if (recorded.has(q.questionId) && recorded.get(q.questionId) !== q.wording) faults.push(Object.freeze({ code: "WORDING_CHANGED", pageId: p.pageId, questionId: q.questionId }));
      /* the page's record keeps the original wording (checked above); the page may SHOW a heading in title case (the page law), so the
       * wording is looked for on the page in any letter case — a wording that is not there at all is lost */
      if (!html.toLowerCase().includes(escapeText(q.wording).toLowerCase())) faults.push(Object.freeze({ code: "WORDING_LOST", pageId: p.pageId, questionId: q.questionId }));
    }
    if (section === SECTION.MORE) {
      const at = new Map();
      /* where a question stands is looked for from the first section on — the page's head also names its lead questions, as data */
      const from = html.indexOf(mark);
      for (const q of qs) { const need = needOf(q.questionId), i = html.indexOf(escapeText(q.wording), from); if (need === null || i < 0) continue; const s = html.slice(0, i).split(mark).length - 1; at.set(need, new Set([...(at.get(need) ?? []), s])); }
      for (const [need, where] of at) if (where.size > 1) faults.push(Object.freeze({ code: "NEED_SPLIT_ACROSS_SECTIONS", pageId: p.pageId, need }));
    }
  }
  const count = (s) => rows.filter((r) => r.section === s).length;
  return Object.freeze({ rows: Object.freeze(rows), faults: Object.freeze(faults), counts: Object.freeze({ pages: rows.length, present: count(SECTION.PRESENT), absent: count(SECTION.ABSENT), moreThanOne: count(SECTION.MORE) }) });
}

/**
 * F12's stored need records, indexed for the pages: questionId -> { need | null, record }. A recorded question stands in exactly one
 * record; one the records hold as navigational or as no need yet gives no need (need null).
 */
export function needIndex(needRecords = []) {
  const byQuestion = new Map(), byNeed = new Map();
  for (const r of list(needRecords)) {
    if (r?.record_type !== NEED_RECORD) continue;
    const need = r.place === NEED_PLACE && present(r.need) ? r.need : null;
    if (need) byNeed.set(need, r);
    for (const m of list(r.members)) if (m?.kind === "QUESTION" && present(m.inputId)) byQuestion.set(m.inputId.slice(m.inputId.indexOf(":") + 1), Object.freeze({ need, record: r.measurement_key, wording: m.wording }));
  }
  return Object.freeze({ byQuestion, byNeed, records: byQuestion.size + byNeed.size > 0 });
}

/** A page's needs, by the stored need records and by nothing else: need -> { record, questions }. */
export function needsOfPage(page, index) {
  const needs = new Map(), unplaced = [];
  for (const q of questionsOf(page)) {
    const at = index.byQuestion.get(q.questionId);
    if (!at) { unplaced.push(q.questionId); continue; }
    if (at.need === null) continue;
    const n = needs.get(at.need) ?? { record: index.byNeed.get(at.need)?.measurement_key ?? at.record, questions: [] };
    n.questions.push(q.questionId);
    needs.set(at.need, n);
  }
  return Object.freeze({ needs, unplaced: Object.freeze(unplaced) });
}

const decisionRecord = (body, on) => { const id = hash(body); return Object.freeze({ record_type: DECISION_RECORD, measurement_key: `${DECISION_RECORD}:${id}`, decision_id: id, recorded_at: `${on}T00:00:00Z`, ...body }); };

/**
 * C4 · EVERY PAIR of the tenant's built, unpublished pages, decided from the stored need records and from nothing else.
 * `hint`: anything else a caller hands in to sway a decision — refused when it carries a score.
 * @returns {{ refused: object[], decisions: object[], excluded: object[] }}
 */
export function decidePairs({ pages = [], needRecords = [], on, hint = null }) {
  const refused = [], decisions = [], excluded = [];
  if (holdsAny(hint, SCORE_FIELDS)) return Object.freeze({ refused: Object.freeze([Object.freeze({ code: REFUSAL.SCORE })]), decisions: Object.freeze([]), excluded: Object.freeze([]) });
  const live = [];
  for (const p of list(pages)) {
    if (!present(p.tenantId)) { refused.push(Object.freeze({ code: REFUSAL.NO_TENANT, pageId: p.pageId })); continue; }
    if (p.publication !== PUBLICATION.UNPUBLISHED) { excluded.push(Object.freeze({ pageId: p.pageId, publication: p.publication })); continue; }
    live.push(p);
  }
  const index = needIndex(needRecords);
  for (let i = 0; i < live.length; i += 1) for (let k = i + 1; k < live.length; k += 1) {
    const [a, b] = [live[i], live[k]];
    /* whether two pages are one tenant's is not decided here: it is F02's one decision (src/tenancy/scope.mjs) */
    if (!decideResolvedTenants(a.tenantId, b.tenantId).allowed) { refused.push(Object.freeze({ code: REFUSAL.CROSS_TENANT, pages: Object.freeze([a.pageId, b.pageId]) })); continue; }
    const [na, nb] = [needsOfPage(a, index), needsOfPage(b, index)];
    const side = (p, n) => Object.freeze({ pageId: p.pageId, build: p.build, audience: p.audience, needs: Object.freeze([...n.needs.keys()].sort()), needRecords: Object.freeze([...new Set([...n.needs.values()].map((x) => x.record))].sort()) });
    const base = { tenantId: a.tenantId, pages: Object.freeze([a.pageId, b.pageId]), label: DECISION_LABEL };
    const missing = !index.records ? MISSING.NO_RECORDS : na.unplaced.length || nb.unplaced.length ? MISSING.UNPLACED : !na.needs.size || !nb.needs.size ? MISSING.NO_NEED : null;
    if (missing) { decisions.push(decisionRecord({ ...base, decision: DECISIONS.CANNOT, missing, reason: Object.freeze({ a: side(a, na), b: side(b, nb), unplaced: na.unplaced.length + nb.unplaced.length }) }, on)); continue; }
    const shared = [...na.needs.keys()].filter((n) => nb.needs.has(n)).sort();
    const onlyA = na.needs.size - shared.length, onlyB = nb.needs.size - shared.length;
    const same = onlyA === 0 && onlyB === 0;
    /* the owner's addition: all of one page's needs are the other's, the sets are not equal, the declared audience is the same */
    const subset = !same && (onlyA === 0 || onlyB === 0) && present(a.audience) && a.audience === b.audience;
    const reason = Object.freeze({ a: side(a, na), b: side(b, nb), shared: shared.length, onlyA, onlyB,
      why: same ? "every need of each page is a need of the other" : subset ? "all of one page's needs are needs of the other, the sets are not equal, and the declared audience is the same" : "each page serves a need the other does not, or the declared audiences differ" });
    decisions.push(decisionRecord({ ...base, decision: same ? DECISIONS.SAME : DECISIONS.DIFFERENT, sharedNeeds: Object.freeze(shared), reason,
      ...(subset ? { flag: REVIEW_FLAG, review: Object.freeze({ smaller: onlyA === 0 ? a.pageId : b.pageId, larger: onlyA === 0 ? b.pageId : a.pageId, sharedNeeds: shared.length, onlyTheLargerServes: onlyA + onlyB, audience: a.audience }) } : {}) }, on));
  }
  return Object.freeze({ refused: Object.freeze(refused), decisions: Object.freeze(decisions), excluded: Object.freeze(excluded) });
}

/** The recorded wordings of the given needs, each once: every wording the need records hold for them, phrases and questions alike. */
export const wordingsOf = (needs, index) => [...new Set(list(needs).flatMap((n) => list(index.byNeed.get(n)?.members).map((m) => m.wording)))];
const holdsWord = (wording, word) => new RegExp(`(^|[^\\p{L}\\p{N}])${String(word).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "u").test(String(wording).toLowerCase());
/** C5, step two: the number of a page's needs it answers with a source. */
export function sourcedNeeds(page, index) {
  const sourced = new Set();
  for (const it of list(page.record?.itemList)) {
    if (!list(it.claims).some((c) => present(c?.link) && present(c?.source) && present(c?.text))) continue;
    for (const q of list(it.questions)) { const need = index.byQuestion.get(q.questionId)?.need; if (need) sourced.add(need); }
  }
  return sourced.size;
}

/**
 * C5 · WHICH PAGE SURVIVES, by the owner's rule and no other, in its order: the audience match, then the sourced answers, then the
 * earlier build. A later step is read only when every earlier one ties; when all three tie there is no survivor.
 */
export function survivorOf({ a, b, sharedNeeds = [], index, on }) {
  for (const p of [a, b]) if (p.audienceWords.length && !(isDay(p.audienceDeclaredOn) && isDay(on) && p.audienceDeclaredOn <= on)) return Object.freeze({ refused: REFUSAL.AUDIENCE_LATE, pageId: p.pageId });
  const wordings = wordingsOf(sharedNeeds, index);
  const match = (p) => wordings.filter((w) => p.audienceWords.some((x) => holdsWord(w, x))).length;
  const steps = [
    [SURVIVOR_STEPS[0], match(a), match(b), (x, y) => x - y],
    [SURVIVOR_STEPS[1], sourcedNeeds(a, index), sourcedNeeds(b, index), (x, y) => x - y],
    [SURVIVOR_STEPS[2], a.builtAt, b.builtAt, (x, y) => (present(x) && present(y) && x !== y ? (x < y ? 1 : -1) : 0)],
  ];
  const read = [];
  for (const [step, va, vb, cmp] of steps) {
    read.push(Object.freeze({ step, [a.pageId]: va, [b.pageId]: vb }));
    const d = cmp(va, vb);
    if (d !== 0) return Object.freeze({ survivor: d > 0 ? a : b, cancelled: d > 0 ? b : a, step, counts: Object.freeze(read), wordings: wordings.length });
  }
  return Object.freeze({ survivor: null, cancelled: null, step: null, counts: Object.freeze(read), wordings: wordings.length, missing: MISSING.TIE });
}

/** The survivor's page with the moved questions in its question-and-answer section: each under the item of its own need, wording unchanged.
 * Exported for the page builder's rebuild (src/page/stored-page-decisions.mjs), which places stored moves by this one function. */
export function withMoved(page, moves) {
  const also = `<p class="also">${STRUCTURE.alsoAsked}: `;
  let html = String(page.record.html);
  const itemList = list(page.record.itemList).map((it) => {
    const add = moves.filter((m) => m.intoItem === it.needId && !m.alreadyHeld);
    if (!add.length) return it;
    const questions = Object.freeze([...it.questions, ...add.map((m) => Object.freeze({ questionId: m.questionId, wording: m.wording, tier: m.tier ?? null, country: m.country ?? null, language: m.language ?? null, movedFrom: m.fromPage }))]);
    const open = `<details data-need-id="${escapeText(it.needId)}"`, from = html.indexOf(open), to = from < 0 ? -1 : html.indexOf("</details>", from);
    if (from >= 0 && to > from) {
      let block = html.slice(from, to);
      const line = `${also}${questions.slice(1).map((q) => escapeText(q.wording)).join(" · ")}</p>`;
      const had = block.indexOf(also);
      if (had >= 0) block = block.slice(0, had) + line + block.slice(block.indexOf("</p>", had) + 4);
      /* the line stands before the item's product cards — except in an item that leads with them (RR-262), where it closes the item */
      else { const product = it.lead ? -1 : block.indexOf(`<div class="product"`); block = product >= 0 ? `${block.slice(0, product)}${line}\n${block.slice(product)}` : `${block}${line}\n`; }
      html = html.slice(0, from) + block + html.slice(to);
    }
    return Object.freeze({ ...it, questions });
  });
  const body = { ...page.record, itemList: Object.freeze(itemList), questions: itemList.reduce((n, it) => n + it.questions.length, 0), html, movedIn: Object.freeze(moves.map((m) => m.measurement_key)) };
  delete body.measurement_key;
  return Object.freeze({ ...body, measurement_key: `${JOINED_RECORD}:${hash([body.value, body.html, body.movedIn])}` });
}

/**
 * C5 · CANCEL AND MOVE one SAME NEED pair. Exactly one page is cancelled; every question of it moves, wording unchanged, into the
 * survivor's question-and-answer section — a question the survivor already holds is kept once, both wordings retrievable from the record.
 * Refused, by name, and nothing changed: a pair that is not SAME NEED, a REVIEW pair, a published page, a page with no recorded state.
 */
export function cancelAndMove({ decision, a, b, needRecords = [], on }) {
  const no = (code, extra = {}) => Object.freeze({ refused: Object.freeze({ code, ...extra }), cancellation: null, moves: Object.freeze([]), survivor: null });
  if (decision?.flag === REVIEW_FLAG) return no(REFUSAL.REVIEW);
  if (decision?.decision !== DECISIONS.SAME) return no(REFUSAL.NOT_SAME);
  for (const p of [a, b]) {
    if (p.publication === PUBLICATION.PUBLISHED) return no(REFUSAL.PUBLISHED, { pageId: p.pageId });
    if (p.publication !== PUBLICATION.UNPUBLISHED) return no(REFUSAL.NOT_RECORDED, { pageId: p.pageId });
  }
  const index = needIndex(needRecords);
  const s = survivorOf({ a, b, sharedNeeds: decision.sharedNeeds, index, on });
  if (s.refused) return no(s.refused, { pageId: s.pageId });
  if (!s.survivor) return no(REFUSAL.NO_SURVIVOR, { counts: s.counts });
  const held = new Map(questionsOf(s.survivor).map((q) => [q.questionId, q]));
  const itemOf = new Map();
  for (const q of questionsOf(s.survivor)) { const need = index.byQuestion.get(q.questionId)?.need; if (need && !itemOf.has(need)) itemOf.set(need, q.item); }
  const detail = new Map(list(s.cancelled.record.itemList).flatMap((it) => list(it.questions).map((q) => [q.questionId, q])));
  const moves = questionsOf(s.cancelled).map((q) => {
    const need = index.byQuestion.get(q.questionId)?.need ?? null, d = detail.get(q.questionId) ?? {};
    const body = { tenantId: a.tenantId, questionId: q.questionId, wording: q.wording, tier: d.tier ?? null, country: d.country ?? null, language: d.language ?? null, fromPage: s.cancelled.pageId, fromBuild: s.cancelled.build, intoPage: s.survivor.pageId,
      need, intoItem: need ? itemOf.get(need) ?? null : null, alreadyHeld: held.has(q.questionId), ...(held.has(q.questionId) ? { heldWording: held.get(q.questionId).wording } : {}), decision: decision.measurement_key, label: DECISION_LABEL };
    const id = hash(body);
    return Object.freeze({ record_type: MOVE_RECORD, measurement_key: `${MOVE_RECORD}:${id}`, move_id: id, recorded_at: `${on}T00:00:00Z`, ...body });
  });
  const cBody = { tenantId: a.tenantId, cancelledPage: s.cancelled.pageId, cancelledBuild: s.cancelled.build, survivorPage: s.survivor.pageId, survivorBuild: s.survivor.build, decision: decision.measurement_key,
    rule: Object.freeze([...SURVIVOR_STEPS]), decidedByStep: s.step, counts: s.counts, sharedNeeds: decision.sharedNeeds, sharedWordings: s.wordings, movedQuestions: moves.length,
    reason: `the two pages serve the same needs (${decision.sharedNeeds.length}); the survivor was chosen by the step ${s.step}`, label: DECISION_LABEL };
  const cid = hash(cBody);
  const cancellation = Object.freeze({ record_type: CANCEL_RECORD, measurement_key: `${CANCEL_RECORD}:${cid}`, cancellation_id: cid, recorded_at: `${on}T00:00:00Z`, ...cBody });
  const record = withMoved(s.survivor, moves);
  return Object.freeze({ refused: null, cancellation, moves: Object.freeze(moves), survivor: Object.freeze({ ...s.survivor, build: record.measurement_key, record }), cancelled: s.cancelled });
}

/** C6 · the result over the pages as they stand after a run. */
export function pagesVerdict({ pages = [], decisions = [], refused = [] }) {
  const of = (d) => list(decisions).filter((x) => x.decision === d).length;
  const live = list(pages).filter((p) => p.publication === PUBLICATION.UNPUBLISHED).length;
  const counts = Object.freeze({ pages: live, pairs: list(decisions).length, same: of(DECISIONS.SAME), different: of(DECISIONS.DIFFERENT), review: list(decisions).filter((x) => x.flag === REVIEW_FLAG).length, cannotDecide: of(DECISIONS.CANNOT) });
  const expected = (live * (live - 1)) / 2;
  const verdict = counts.same > 0 ? VERDICTS.DISPROVED : live < MIN_PAGES || counts.cannotDecide > 0 || counts.pairs !== expected || list(refused).length > 0 ? VERDICTS.COULD_NOT : VERDICTS.PROVED;
  return Object.freeze({ verdict, counts, why: verdict === VERDICTS.DISPROVED ? "a SAME NEED pair remains" : verdict === VERDICTS.PROVED ? "every pair is decided and none is SAME NEED" : live < MIN_PAGES ? "fewer than two built, unpublished pages" : counts.cannotDecide > 0 ? "a pair is CANNOT DECIDE" : "a pair is unmeasured or refused" });
}

/**
 * ONE RUN: decide every pair; cancel and move each SAME NEED pair, one at a time, re-deciding over the pages that stand; stop when no
 * pair can be cancelled. What it returns is everything to keep: the decisions as they stand, the cancellations, the moves, the new
 * builds of the survivors, the pairs listed for the owner, and the result.
 */
export function runBuiltPages({ pages = [], needRecords = [], on, hint = null }) {
  let live = [...list(pages)];
  const cancellations = [], moves = [], rebuilt = [], notCancelled = [];
  let d = decidePairs({ pages: live, needRecords, on, hint });
  for (let guard = 0; guard <= list(pages).length * list(pages).length; guard += 1) {
    const skip = new Set(notCancelled.map((x) => x.decision));
    const next = d.decisions.find((x) => x.decision === DECISIONS.SAME && !skip.has(x.measurement_key));
    if (!next) break;
    const [a, b] = next.pages.map((id) => live.find((p) => p.pageId === id));
    const r = cancelAndMove({ decision: next, a, b, needRecords, on });
    if (r.refused) { notCancelled.push(Object.freeze({ decision: next.measurement_key, pages: next.pages, ...r.refused })); continue; }
    cancellations.push(r.cancellation); moves.push(...r.moves); rebuilt.push(r.survivor.record);
    live = live.filter((p) => p.pageId !== r.cancelled.pageId).map((p) => (p.pageId === r.survivor.pageId ? r.survivor : p));
    d = decidePairs({ pages: live, needRecords, on, hint });
  }
  /* a SAME NEED pair the survivor rule could not decide is CANNOT DECIDE: nothing was cancelled and the result cannot read PROVED */
  const tied = new Set(notCancelled.filter((x) => x.code === REFUSAL.NO_SURVIVOR).map((x) => x.decision));
  const decisions = d.decisions.map((x) => (tied.has(x.measurement_key) ? decisionRecord({ tenantId: x.tenantId, pages: x.pages, label: x.label, decision: DECISIONS.CANNOT, missing: MISSING.TIE, sharedNeeds: x.sharedNeeds, reason: x.reason }, on) : x));
  const refused = [...d.refused, ...notCancelled.filter((x) => x.code !== REFUSAL.NO_SURVIVOR)];
  const faults = decisions.filter((x) => x.label !== DECISION_LABEL || x.label === NEVER_A_DECISION_LABEL || holdsAny(x, SCORE_FIELDS) || !x.reason);
  return Object.freeze({ pages: Object.freeze(live), decisions: Object.freeze(decisions), cancellations: Object.freeze(cancellations), moves: Object.freeze(moves), rebuilt: Object.freeze(rebuilt),
    review: Object.freeze(decisions.filter((x) => x.flag === REVIEW_FLAG)), excluded: d.excluded, refused: Object.freeze(refused), faults: Object.freeze(faults), result: pagesVerdict({ pages: live, decisions, refused }) });
}

/**
 * THE NEED RECORDS A RUN MAY READ: the records the recorded grouping gives as it stands (`derived`, F12's own derivation), and only when
 * every one of them is in the need store exactly as derived. An earlier grouping's records stay in the store as history and are not read.
 */
export function storedNeedRecords({ derived = null, stored = [] }) {
  if (!derived || list(derived.refused).length || !list(derived.records).length) return Object.freeze({ refused: "NEED_GROUPING_ABSENT_OR_REFUSED", records: Object.freeze([]) });
  /* RR-264: the store keeps a need record ONCE, on the day it was first derived (F12 appends only what is new), so a need unchanged since an
   * earlier run is held under that earlier day. The day is not the record's content: every other field must still match, byte for byte. */
  const content = (r) => JSON.stringify({ ...r, recorded_at: null });
  const held = new Map(list(stored).filter((r) => r?.record_type === NEED_RECORD).map((r) => [r.measurement_key, content(r)]));
  const absent = derived.records.filter((r) => held.get(r.measurement_key) !== content(r));
  if (absent.length) return Object.freeze({ refused: "NEED_RECORDS_NOT_STORED_AS_DERIVED", records: Object.freeze([]), absent: absent.length });
  return Object.freeze({ refused: null, records: Object.freeze([...derived.records]) });
}

/** C3 with C6: a section ABSENT or MORE THAN ONE, a changed or lost wording, or a need split across sections DISPROVES; else the run's result. */
export function rowResult({ sections = null, run = null }) {
  if (list(sections?.faults).length) return Object.freeze({ result: VERDICTS.DISPROVED, why: `a built page's question-and-answer section is at fault (${sections.faults.length})` });
  if (list(run?.faults).length) return Object.freeze({ result: VERDICTS.DISPROVED, why: "a decision lacks its reason or its label" });
  return Object.freeze({ result: run?.result?.verdict ?? VERDICTS.COULD_NOT, why: run?.result?.why ?? "no run" });
}

export { DECISIONS, REVIEW_FLAG, DECISION_LABEL, SURVIVOR_STEPS, PUBLICATION, SECTION, VERDICTS };
