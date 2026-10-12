/**
 * 🔴 THE JOINED PAGE — ONE PAGE PER VALUE OF THE PRODUCT'S DECLARED DIMENSION, CARRYING EVERY CHOSEN NEED OF THAT VALUE, EACH WITH ITS OWN
 * ANSWER (the owner's page shape, RR-253: `_handoffs` AlmiVisibility_OWNER_DECISION_2026-10-12_RR-253_ANSWERS_TO_THE_BUILD_STOP.md, answer 1;
 * Specification Amendment 6). Pure: records in, pages out. It reads no store, fetches nothing and writes nothing.
 *
 * What it adds, and what it never does:
 *   JOIN      the needs F35 CHOSE to CREATE (decideGroupedNeeds' construction set, each with its spec compiled by F91 C19) are grouped by
 *             their page candidate. One candidate → one page. Each need is ONE question-and-answer item: its questions in their own recorded
 *             wording with their tier shown, and the need's own answer — every claim written ONLY as its recorded statement, with its
 *             label, its source's name and link and the date it was read. Nothing is composed here. A need F35 did not choose is not on
 *             the page; an unsupported part is shown UNKNOWN, never filled in.
 *   PRODUCT   a statement about the product itself is printed only when it IS an owner-approved answer of the product's client
 *             questionnaire (src/questionnaire): word for word, with its value and unit, marked as the product's own statement — never
 *             official, never independently verified — and linked to the product's own declared site. It is shown BESIDE an answer; it
 *             is never one of the answer's supporting claims, so what counts as "supported" (F91 C17) is untouched.
 *   CANCEL    Specification Amendment 6: when two pages would serve the same need, the engine itself cancels one and moves its questions
 *             into the survivor's item (cancelSameNeeds). Same need is decided only by a RECORDED judgement naming both needs — never by
 *             similarity (the owner's sameness rule, RR-152). Survivor rule, declared here before any run: SURVIVOR_RULE.
 *
 * 🔴 A joined page is NOT an accepted page. It is a rendered draft with its gate table; publication is never this module's act.
 * 🔴 Names no product, tenant, host, dimension or value.
 */
import { createHash } from "node:crypto";
import { PROMISE, CHECK } from "./draft-render.mjs";

export const JOINED_RECORD = "joined_page_draft";
export const CANCELLATION_RECORD = "same_need_cancellation";
export const SURVIVOR_RULE = "the need with more recorded questions survives; on a tie, the need whose page value sorts first; on a further tie, the need whose key sorts first";
export const PRODUCT_STATEMENT_LABEL = "THE PRODUCT'S OWN STATEMENT — owner-approved; self-sourced, not independently verified";
export const TIER_WORDS = Object.freeze({ OBSERVED: "OBSERVED — seen on an opened public page", "RESEARCH-DERIVED": "INFERRED — research-derived; nobody is shown to have asked it" });
export const REFUSAL = Object.freeze({
  JUDGEMENT: "SAME_NEED_JUDGEMENT_NAMES_NO_RECORDED_JUDGEMENT_OR_TWO_KNOWN_NEEDS",
  SAME_PAGE: "SAME_NEED_JUDGEMENT_WITHIN_ONE_PAGE_IS_A_SAMENESS_DRAFT_NOT_A_CANCELLATION",
  NOT_APPROVED: "PRODUCT_STATEMENT_IS_NOT_AN_APPROVED_ANSWER",
  NO_SITE: "PRODUCT_DECLARES_NO_OFFICIAL_SITE_TO_LINK",
});

const present = (v) => typeof v === "string" && v.trim() !== "";
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const words = (text) => String(text).split(/\s+/).filter(Boolean).length;
const valueOf = (combination) => Object.values(combination ?? {}).map(String).sort().join("+");

/**
 * Specification Amendment 6 · CANCEL AND MOVE, before any need is connected (one need has one page candidate — F91 C10 — so two pages can
 * hold the same need only as two proposed needs; the cancellation makes them one).
 * @param {{ pages: { combination: object, needs: { key: string, questions: string[] }[] }[], sameNeed: { needs: [string, string], judgementRef: string, reason: string }[] }} proposed
 * @returns {{ pages: object[], cancellations: object[], refused: object[] }}  pages with every cancelled need removed and its questions moved
 */
export function cancelSameNeeds({ pages = [], sameNeed = [] }) {
  const out = pages.map((p) => ({ combination: p.combination, needs: p.needs.map((n) => ({ ...n, questions: [...n.questions], movedIn: [] })) }));
  const where = (key) => { for (const p of out) { const n = p.needs.find((x) => x.key === key); if (n) return { page: p, need: n }; } return null; };
  const cancellations = [], refused = [];
  for (const j of sameNeed) {
    const [a, b] = (Array.isArray(j?.needs) ? j.needs : []).map(where);
    if (!a || !b || a.need === b.need || !present(j.judgementRef) || !present(j.reason)) { refused.push(Object.freeze({ needs: j?.needs ?? null, code: REFUSAL.JUDGEMENT })); continue; }
    if (a.page === b.page) { refused.push(Object.freeze({ needs: j.needs, code: REFUSAL.SAME_PAGE })); continue; }
    /* the survivor rule, exactly as declared above */
    const rank = (x) => [-x.need.questions.length, valueOf(x.page.combination), x.need.key];
    const [survivor, cancelled] = [a, b].sort((x, y) => { const rx = rank(x), ry = rank(y); for (let i = 0; i < rx.length; i += 1) if (rx[i] !== ry[i]) return rx[i] < ry[i] ? -1 : 1; return 0; });
    const moved = [...cancelled.need.questions];
    survivor.need.questions.push(...moved);
    survivor.need.movedIn.push(...moved.map((questionId) => Object.freeze({ questionId, from: valueOf(cancelled.page.combination), judgementRef: j.judgementRef })));
    cancelled.page.needs = cancelled.page.needs.filter((n) => n !== cancelled.need);
    cancellations.push(Object.freeze({ record_type: CANCELLATION_RECORD, cancelledNeed: cancelled.need.key, cancelledOn: valueOf(cancelled.page.combination),
      survivorNeed: survivor.need.key, survivorOn: valueOf(survivor.page.combination), movedQuestions: Object.freeze(moved), judgementRef: j.judgementRef, reason: j.reason.trim(), rule: SURVIVOR_RULE }));
  }
  /* a page left with no need of its own is cancelled whole: nothing is built for it */
  return Object.freeze({ pages: Object.freeze(out.filter((p) => p.needs.length > 0)), cancelledPages: Object.freeze(out.filter((p) => p.needs.length === 0).map((p) => valueOf(p.combination))), cancellations: Object.freeze(cancellations), refused: Object.freeze(refused) });
}

/** After cancelSameNeeds: no two needs on different pages are named by one recorded same-need judgement. The proof Amendment 6 asks for. */
export function sameNeedPairs({ pages = [], sameNeed = [] }) {
  const on = new Map(pages.flatMap((p) => p.needs.map((n) => [n.key, valueOf(p.combination)])));
  return sameNeed.filter((j) => Array.isArray(j?.needs) && on.has(j.needs[0]) && on.has(j.needs[1]) && on.get(j.needs[0]) !== on.get(j.needs[1])).map((j) => Object.freeze([...j.needs]));
}

/**
 * The connection drafts (F91, src/page/demand-connection.mjs) of the resolved pages: a need's first question carries its combination and
 * answer; every other question of the need — its own, or one moved in — joins it by a recorded sameness judgement.
 */
export function connectionDrafts(resolved) {
  const drafts = [];
  for (const p of resolved.pages) for (const n of p.needs) {
    const [lead, ...rest] = n.questions;
    drafts.push({ questionId: lead, combination: p.combination, answer: n.answer, ...(n.sections ? { sections: n.sections } : {}) });
    for (const q of rest) {
      const moved = n.movedIn.find((m) => m.questionId === q);
      drafts.push({ questionId: q, combination: p.combination, sameAs: { questionId: lead, judgementRef: moved ? moved.judgementRef : n.sameness?.judgementRef, reason: moved ? "moved from a cancelled same-need item (Specification Amendment 6)" : n.sameness?.reason } });
    }
  }
  return drafts;
}

/** The product's own statements for one need: only approved answers, word for word; anything else is refused by name, never printed. */
export function productStatements({ answerIds = [], approved = [], officialSite = null, productName = null }) {
  const whose = present(productName) ? `${productName.trim()}'s own statement` : "the product's own statement";
  const byId = new Map(approved.filter((c) => c?.questionnaire?.approval?.state === "APPROVED").map((c) => [c.capabilityId, c]));
  const shown = [], refused = [];
  for (const id of answerIds) {
    const c = byId.get(id);
    if (!c) { refused.push(Object.freeze({ answerId: id, code: REFUSAL.NOT_APPROVED })); continue; }
    if (!present(officialSite)) { refused.push(Object.freeze({ answerId: id, code: REFUSAL.NO_SITE })); continue; }
    const value = c.value ? ` — ${c.value.value} ${c.value.unit}` : "";
    shown.push(Object.freeze({ answerId: id, text: `${c.statement}${value}`, label: PRODUCT_STATEMENT_LABEL, source: `${whose} (owner-approved, ${c.questionnaire.approval.on})`, link: officialSite, approvedOn: c.questionnaire.approval.on, approvalRecord: `${c.questionnaire.approval.record.path}@${c.questionnaire.approval.record.commit}` }));
  }
  return Object.freeze({ shown: Object.freeze(shown), refused: Object.freeze(refused) });
}

/**
 * JOIN · one page per page candidate, from F35's construction set.
 * @param {{ construction: { slug: string, decision: object, spec: object }[], questions: Map<string, object>, renderNeed: Function,
 *           statementsFor: (needId: string) => { shown: object[], refused: object[] }, stamp: string, titleFor: (value: string) => string }} input
 *   questions   the planning store's connections by question id (wording, tier, country, language)
 *   renderNeed  F37's own render of ONE need's compiled draft — its measurable checks are reported per item, unchanged
 */
export function joinPages({ construction = [], questions = new Map(), renderNeed, statementsFor = () => ({ shown: [], refused: [] }), stamp, titleFor = (v) => v }) {
  if (!present(stamp)) throw new TypeError("a joined page carries its stamp — a test page says it is one on every output");
  const byCandidate = new Map();
  for (const c of construction) {
    if (!c?.spec || !present(c.spec.basis?.pageCandidate)) continue;
    const list = byCandidate.get(c.spec.basis.pageCandidate) ?? [];
    list.push(c);
    byCandidate.set(c.spec.basis.pageCandidate, list);
  }
  const pages = [];
  for (const [candidate, list] of [...byCandidate].sort(([a], [b]) => (a < b ? -1 : 1))) {
    let value; try { value = JSON.parse(candidate).map(([, v]) => String(v)).sort().join("+"); } catch { continue; }
    const items = list.sort((a, b) => (a.spec.subject < b.spec.subject ? -1 : 1)).map(({ spec, decision }) => {
      const draft = renderNeed({ spec, decision });
      const qs = spec.sections.map((s) => { const q = questions.get(s.questionId) ?? {}; return Object.freeze({ questionId: s.questionId, wording: s.heading, tier: s.tier, country: q.country ?? null, language: q.language ?? null }); });
      const st = statementsFor(spec.subject);
      return Object.freeze({ needId: spec.subject, questions: Object.freeze(qs), claims: spec.answer.labels, unknown: spec.answer.unknown, answerJudged: spec.answer.state,
        countrySections: spec.countrySections, statements: st.shown, statementsRefused: st.refused,
        needChecks: draft?.checks ? Object.freeze(Object.fromEntries(Object.entries(draft.checks).map(([k, v]) => [k, v.state]))) : null, needDraft: draft?.state ?? "NOT RENDERED" });
    });
    const title = titleFor(value);
    const html = renderJoined({ title, stamp, items });
    const text = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");
    const trace = items.flatMap((it) => [...it.claims.map((c) => Object.freeze({ needId: it.needId, claimId: c.claimId, label: c.label, source: c.source, link: c.link, readOn: c.readOn })),
      ...it.statements.map((s) => Object.freeze({ needId: it.needId, answerId: s.answerId, label: s.label, source: s.source, link: s.link, approvalRecord: s.approvalRecord }))]);
    const checks = joinedChecks({ items, html, stamp });
    const value_ = { value, candidate, title, items: items.length, questions: items.reduce((n, it) => n + it.questions.length, 0), stamp };
    pages.push(Object.freeze({ record_type: JOINED_RECORD, measurement_key: `${JOINED_RECORD}:${hash([value_, html])}`, ...value_, wordCount: words(text), itemList: Object.freeze(items), checks, html, trace: Object.freeze(trace) }));
  }
  return Object.freeze(pages);
}

/** The joined page's OWN measurable checks. A check whose input is not recorded is NOT MEASURED; none passes by default. */
export function joinedChecks({ items, html, stamp }) {
  const state = (ok, why) => (ok ? Object.freeze({ state: CHECK.PASS }) : Object.freeze({ state: CHECK.FAIL, why }));
  const claims = items.flatMap((it) => it.claims);
  const perNeed = (name) => { const s = items.map((it) => it.needChecks?.[name] ?? CHECK.NOT_MEASURED); return s.includes(CHECK.FAIL) ? CHECK.FAIL : s.includes(CHECK.NOT_MEASURED) ? CHECK.NOT_MEASURED : CHECK.PASS; };
  return Object.freeze({
    everyItemAnswered: state(items.length > 0 && items.every((it) => it.claims.some((c) => c.central !== false && present(c.text))), "an item has no supported central statement to answer its questions"),
    everyClaimSourced: state(claims.every((c) => present(c.source) && present(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "")), "a written claim lacks its source's name, link or the date it was read"),
    ownWording: state(items.every((it) => it.questions.every((q) => present(q.wording) && html.includes(esc(q.wording)))), "a question is not shown in its own recorded wording"),
    tierShown: state(items.every((it) => it.questions.every((q) => Object.hasOwn(TIER_WORDS, q.tier))), "a question's tier is not one the page can show"),
    productStatementsApproved: state(items.every((it) => it.statementsRefused.length === 0), "a product statement asked for is not an owner-approved answer"),
    stamped: state(html.split(esc(stamp)).length - 1 >= 2, "the page does not say, top and bottom, what it is"),
    noPromise: state(!PROMISE.test(html.replace(/<[^>]+>/g, " ")), "the page promises ranking, indexing or citation"),
    /* F37's own measurable checks, per need, aggregated — unchanged, never re-decided here */
    needDirectAnswer: Object.freeze({ state: perNeed("directAnswer") }),
    needEveryClaimSourced: Object.freeze({ state: perNeed("everyClaimSourced") }),
    needHeadingsMatch: Object.freeze({ state: perNeed("headingsMatch") }),
    internalLinks: Object.freeze({ state: perNeed("internalLinks") }),
    technical: Object.freeze({ state: perNeed("technical") }),
    engaging: Object.freeze({ state: CHECK.NOT_MEASURED, why: "no lawful judge is connected; real proof comes only after publication" }),
    acceptableToSearchAndAnswerEngines: Object.freeze({ state: CHECK.NOT_MEASURED, why: "no lawful judge is connected; real proof comes only after publication (index, impressions, citations)" }),
  });
}

/** Deterministic HTML. Every sentence of fact is a recorded claim's own text or an approved answer's own statement; framing only otherwise. */
export function renderJoined({ title, stamp, items }) {
  const claim = (c) => `<p class="claim" data-claim-id="${esc(c.claimId)}">${esc(c.text ?? "UNKNOWN — this claim records no statement")} <span class="source">[${esc(c.label)} · <a href="${esc(c.link)}" rel="nofollow">${esc(c.source)}</a> · read ${esc(c.readOn)}]</span></p>`;
  const item = (it) => [
    `<section class="qa" data-need-id="${esc(it.needId)}">`,
    `<h2>${esc(it.questions[0].wording)} <small>[${esc(TIER_WORDS[it.questions[0].tier] ?? it.questions[0].tier)}]</small></h2>`,
    it.questions.length > 1 ? `<ul class="also-asked">${it.questions.slice(1).map((q) => `<li>${esc(q.wording)} <small>[${esc(TIER_WORDS[q.tier] ?? q.tier)}]</small></li>`).join("")}</ul>` : "",
    ...it.claims.map(claim),
    ...it.unknown.map((u) => `<p class="unknown">UNKNOWN — ${esc(u.why)}</p>`),
    ...it.statements.map((s) => `<p class="product-statement" data-answer-id="${esc(s.answerId)}">${esc(s.text)} <span class="source">[${esc(s.label)} · <a href="${esc(s.link)}">${esc(s.source)}</a>]</span></p>`),
    `</section>`,
  ].filter(Boolean).join("\n");
  return [`<!doctype html>`, `<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>${esc(title)}</title></head><body>`,
    `<p class="stamp">${esc(stamp)}</p>`, `<h1>${esc(title)}</h1>`, ...items.map(item), `<p class="stamp">${esc(stamp)}</p>`, `</body></html>`, ""].join("\n");
}
