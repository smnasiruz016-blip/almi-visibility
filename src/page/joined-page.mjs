/**
 * 🔴 THE JOINED PAGE — ONE PAGE PER VALUE OF THE PRODUCT'S DECLARED DIMENSION, CARRYING EVERY CHOSEN NEED OF THAT VALUE, EACH WITH ITS OWN
 * ANSWER (the owner's page shape, RR-253: `_handoffs` AlmiVisibility_OWNER_DECISION_2026-10-12_RR-253_ANSWERS_TO_THE_BUILD_STOP.md, answer 1;
 * Specification Amendment 6 and the owner's clarification of it, RR-254: `_handoffs`
 * AlmiVisibility_OWNER_CLARIFICATION_2026-10-12_RR-254_SPECIFICATION_AMENDMENT_6_WHOLE_PAGES_ONLY.md).
 * Pure: records in, pages out. It reads no store, fetches nothing and writes nothing.
 *
 * What it adds, and what it never does:
 *   JOIN      the needs F35 CHOSE to CREATE (decideGroupedNeeds' construction set, each with its spec compiled by F91 C19) are grouped by
 *             their page candidate. One candidate → one page. Each need is ONE question-and-answer item: its questions in their own recorded
 *             wording with their tier shown, and the need's own answer — every claim written ONLY as its recorded statement, with its
 *             label, its source's name and link and the date it was read. Nothing is composed here. A need F35 did not choose is not on
 *             the page: it is reported UNANSWERED (the owner's standard: "every need answered with its source"), never filled in.
 *   WORDING   RR-254 answer 3: the title and every heading are CHOSEN from the recorded questions, observed ones first — never written
 *             here. An item's heading is its first OBSERVED question (else its first recorded one); the title is the headings of the
 *             page's first items, in the order the page's needs were handed in. Each is traced to the question it came from.
 *   PRODUCT   a statement about the product itself is printed only when it IS an owner-approved answer of the product's client
 *             questionnaire (src/questionnaire): word for word, with its value and unit, marked as the product's own statement — never
 *             official, never independently verified — and linked to the product's own declared site. It is shown BESIDE an answer; it
 *             is never one of the answer's supporting claims, so what counts as "supported" (F91 C17) is untouched.
 *   CANCEL    Specification Amendment 6, as the owner clarified it (RR-254 answer 2): cancel-and-move applies ONLY when two WHOLE pages
 *             serve the same need — every need of each page is, by a RECORDED judgement, the same need as a need of the other. Then one
 *             page is cancelled whole and its questions move into the survivor's items (cancelSamePages). A question SHARED by two pages
 *             of different values stays on EACH page: it is counted, never cancelled, never moved. Same need is decided only by a
 *             recorded judgement naming both needs — never by similarity (the owner's sameness rule, RR-152). Survivor rule, declared
 *             here before any run: SURVIVOR_RULE.
 *
 * 🔴 A joined page is NOT an accepted page. It is a rendered draft with its gate table; publication is never this module's act.
 * 🔴 There is no word-count target (RR-254 answer 2). The word count is reported; nothing is decided on it.
 * 🔴 Names no product, tenant, host, dimension or value.
 */
import { createHash } from "node:crypto";
import { PROMISE, CHECK } from "./draft-render.mjs";

export const JOINED_RECORD = "joined_page_draft";
export const CANCELLATION_RECORD = "same_need_cancellation";
export const SURVIVOR_RULE = "of two whole pages serving the same need, the page with more recorded questions survives; on a tie, the page whose value sorts first";
export const TITLE_ITEMS = 3;
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
export const valueOf = (combination) => Object.values(combination ?? {}).map(String).sort().join("+");

/**
 * Specification Amendment 6 · CANCEL AND MOVE — WHOLE PAGES ONLY (the owner's clarification, RR-254).
 * Two pages serve the same need when EVERY need of each is named, by a recorded judgement, as the same need as a need of the other.
 * A judgement that joins two needs of two pages which are NOT wholly the same is a SHARED question: both needs stay where they are.
 * @param {{ pages: { combination: object, needs: { key: string, questions: string[] }[] }[], sameNeed: { needs: [string, string], judgementRef: string, reason: string }[] }} proposed
 * @returns {{ pages: object[], cancelledPages: string[], cancellations: object[], shared: object[], refused: object[] }}
 */
export function cancelSamePages({ pages = [], sameNeed = [] }) {
  const out = pages.map((p) => ({ ...p, needs: p.needs.map((n) => ({ ...n, questions: [...n.questions], movedIn: [] })) }));
  const where = (key) => { for (const p of out) { const n = p.needs.find((x) => x.key === key); if (n) return { page: p, need: n }; } return null; };
  const refused = [], joins = [];
  for (const j of sameNeed) {
    const [a, b] = (Array.isArray(j?.needs) ? j.needs : []).map(where);
    if (!a || !b || a.need === b.need || !present(j.judgementRef) || !present(j.reason)) { refused.push(Object.freeze({ needs: j?.needs ?? null, code: REFUSAL.JUDGEMENT })); continue; }
    if (a.page === b.page) { refused.push(Object.freeze({ needs: j.needs, code: REFUSAL.SAME_PAGE })); continue; }
    joins.push({ a, b, j });
  }
  const questionsOf = (p) => p.needs.reduce((n, x) => n + x.questions.length, 0);
  const cancelled = new Set(), cancellations = [];
  for (let i = 0; i < out.length; i += 1) for (let k = i + 1; k < out.length; k += 1) {
    const [P, Q] = [out[i], out[k]];
    if (cancelled.has(P) || cancelled.has(Q)) continue;
    const between = joins.filter(({ a, b }) => (a.page === P && b.page === Q) || (a.page === Q && b.page === P));
    const partner = (need) => between.find(({ a, b }) => a.need === need || b.need === need);
    /* WHOLE pages: every need of each has a recorded same-need partner on the other */
    if (!P.needs.length || !Q.needs.length || !P.needs.every(partner) || !Q.needs.every(partner)) continue;
    const rank = (p) => [-questionsOf(p), valueOf(p.combination)];
    const [survivor, loser] = [P, Q].sort((x, y) => { const rx = rank(x), ry = rank(y); for (let r = 0; r < rx.length; r += 1) if (rx[r] !== ry[r]) return rx[r] < ry[r] ? -1 : 1; return 0; });
    for (const need of loser.needs) {
      const { a, b, j } = partner(need);
      const into = a.need === need ? b.need : a.need;
      const moved = [...need.questions];
      into.questions.push(...moved);
      into.movedIn.push(...moved.map((questionId) => Object.freeze({ questionId, from: valueOf(loser.combination), judgementRef: j.judgementRef })));
      cancellations.push(Object.freeze({ record_type: CANCELLATION_RECORD, cancelledPage: valueOf(loser.combination), survivorPage: valueOf(survivor.combination), cancelledNeed: need.key, survivorNeed: into.key,
        movedQuestions: Object.freeze(moved), judgementRef: j.judgementRef, reason: j.reason.trim(), rule: SURVIVOR_RULE }));
    }
    cancelled.add(loser);
  }
  const kept = out.filter((p) => !cancelled.has(p));
  const on = new Map(kept.flatMap((p) => p.needs.map((n) => [n.key, valueOf(p.combination)])));
  /* a shared question on two pages that are not wholly the same: reported, never cancelled */
  const shared = joins.filter(({ j }) => on.has(j.needs[0]) && on.has(j.needs[1])).map(({ j }) => Object.freeze({ needs: Object.freeze([...j.needs]), on: Object.freeze([on.get(j.needs[0]), on.get(j.needs[1])]), judgementRef: j.judgementRef }));
  return Object.freeze({ pages: Object.freeze(kept), cancelledPages: Object.freeze([...cancelled].map((p) => valueOf(p.combination))), cancellations: Object.freeze(cancellations), shared: Object.freeze(shared), refused: Object.freeze(refused) });
}

/** After cancelSamePages: the pairs of WHOLE pages that still serve the same need. The proof Amendment 6 asks for is that this is empty. */
export function samePagePairs({ pages = [], sameNeed = [] }) {
  const r = cancelSamePages({ pages, sameNeed });
  return [...new Set(r.cancellations.map((c) => `${c.cancelledPage}|${c.survivorPage}`))].map((s) => Object.freeze(s.split("|")));
}

/**
 * The connection drafts (F91, src/page/demand-connection.mjs) of the resolved pages: a need's first question carries its combination and
 * answer; every other question of the need — its own, or one moved in from a cancelled page — joins it by a recorded sameness judgement.
 */
export function connectionDrafts(resolved) {
  const drafts = [];
  for (const p of resolved.pages) for (const n of p.needs) {
    const [lead, ...rest] = n.questions;
    drafts.push({ questionId: lead, combination: p.combination, answer: n.answer, ...(n.sections ? { sections: n.sections } : {}) });
    for (const q of rest) {
      const moved = (n.movedIn ?? []).find((m) => m.questionId === q);
      drafts.push({ questionId: q, combination: p.combination, sameAs: { questionId: lead, judgementRef: moved ? moved.judgementRef : n.sameness?.judgementRef, reason: moved ? "moved from a cancelled same-need page (Specification Amendment 6)" : n.sameness?.reason } });
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

/** RR-254 answer 3 · a need's questions in the order the page shows them: OBSERVED first, then the rest; each tier by question id. */
export function orderedQuestions(questions) {
  const rank = (q) => (q.tier === "OBSERVED" ? 0 : 1);
  return [...questions].sort((a, b) => rank(a) - rank(b) || (a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0));
}

/**
 * JOIN · one page per page candidate, from F35's construction set.
 * @param {{ construction: { slug: string, decision: object, spec: object }[], questions: Map<string, object>, renderNeed: Function,
 *           statementsFor: (needId: string) => { shown: object[], refused: object[] }, stamp: string, orderOf: (needId: string) => number,
 *           unansweredFor: (value: string) => object[] }} input
 *   questions      the planning store's connections by question id (wording, tier, country, language)
 *   renderNeed     F37's own render of ONE need's compiled draft — its measurable checks are reported per item, unchanged
 *   orderOf        the place of a need on its page, as the page's needs were handed in (never decided here)
 *   unansweredFor  the page's needs F35 did not choose — reported on the page record, never written into the page
 */
export function joinPages({ construction = [], questions = new Map(), renderNeed, statementsFor = () => ({ shown: [], refused: [] }), stamp, orderOf = () => 0, unansweredFor = () => [] }) {
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
    const items = list.sort((a, b) => orderOf(a.spec.subject) - orderOf(b.spec.subject) || (a.spec.subject < b.spec.subject ? -1 : 1)).map(({ spec, decision }) => {
      const draft = renderNeed({ spec, decision });
      const qs = orderedQuestions(spec.sections.map((s) => { const q = questions.get(s.questionId) ?? {}; return Object.freeze({ questionId: s.questionId, wording: s.heading, tier: s.tier, country: q.country ?? null, language: q.language ?? null }); }));
      const st = statementsFor(spec.subject);
      return Object.freeze({ needId: spec.subject, heading: Object.freeze({ wording: qs[0].wording, questionId: qs[0].questionId, tier: qs[0].tier }), questions: Object.freeze(qs), claims: spec.answer.labels, unknown: spec.answer.unknown, answerJudged: spec.answer.state,
        countrySections: spec.countrySections, statements: st.shown, statementsRefused: st.refused,
        needChecks: draft?.checks ? Object.freeze(Object.fromEntries(Object.entries(draft.checks).map(([k, v]) => [k, v.state]))) : null, needDraft: draft?.state ?? "NOT RENDERED" });
    });
    /* the title: the headings of the first items, observed headings first among them — chosen from the recorded questions, never written */
    const first = items.slice(0, TITLE_ITEMS);
    const titleFrom = (first.some((it) => it.heading.tier === "OBSERVED") ? first.filter((it) => it.heading.tier === "OBSERVED") : first).map((it) => it.heading);
    const title = titleFrom.map((h) => h.wording).join(" · ");
    const unanswered = Object.freeze([...unansweredFor(value)]);
    const html = renderJoined({ title, stamp, items });
    const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ");
    const trace = items.flatMap((it) => [...it.claims.map((c) => Object.freeze({ needId: it.needId, claimId: c.claimId, label: c.label, source: c.source, link: c.link, readOn: c.readOn })),
      ...it.statements.map((s) => Object.freeze({ needId: it.needId, answerId: s.answerId, label: s.label, source: s.source, link: s.link, approvalRecord: s.approvalRecord }))]);
    const checks = joinedChecks({ items, html, stamp, title, titleFrom, unanswered });
    const value_ = { value, candidate, title, titleFrom: Object.freeze(titleFrom.map((h) => h.questionId)), items: items.length, questions: items.reduce((n, it) => n + it.questions.length, 0), stamp };
    pages.push(Object.freeze({ record_type: JOINED_RECORD, measurement_key: `${JOINED_RECORD}:${hash([value_, html])}`, ...value_, wordCount: words(text), unanswered, itemList: Object.freeze(items), checks, html, trace: Object.freeze(trace) }));
  }
  return Object.freeze(pages);
}

/** The joined page's OWN measurable checks. A check whose input is not recorded is NOT MEASURED; none passes by default. */
export function joinedChecks({ items, html, stamp, title = "", titleFrom = [], unanswered = [] }) {
  const state = (ok, why) => (ok ? Object.freeze({ state: CHECK.PASS }) : Object.freeze({ state: CHECK.FAIL, why }));
  const claims = items.flatMap((it) => it.claims);
  const recorded = new Set(items.flatMap((it) => it.questions.map((q) => q.wording)));
  const perNeed = (name) => { const s = items.map((it) => it.needChecks?.[name] ?? CHECK.NOT_MEASURED); return s.includes(CHECK.FAIL) ? CHECK.FAIL : s.includes(CHECK.NOT_MEASURED) ? CHECK.NOT_MEASURED : CHECK.PASS; };
  return Object.freeze({
    everyNeedAnswered: state(items.length > 0 && unanswered.length === 0, `${unanswered.length} need(s) of this page have no supported answer and are not on it`),
    everyItemAnswered: state(items.length > 0 && items.every((it) => it.claims.some((c) => c.central !== false && present(c.text))), "an item has no supported central statement to answer its questions"),
    everyClaimSourced: state(claims.every((c) => present(c.source) && present(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "")), "a written claim lacks its source's name, link or the date it was read"),
    ownWording: state(items.every((it) => it.questions.every((q) => present(q.wording) && html.includes(esc(q.wording)))), "a question is not shown in its own recorded wording"),
    headingsFromQuestions: state(items.every((it) => recorded.has(it.heading?.wording) && it.questions[0]?.questionId === it.heading?.questionId && (it.heading.tier === "OBSERVED" || it.questions.every((q) => q.tier !== "OBSERVED"))), "a heading is not a recorded question of its item, or an observed question was passed over"),
    titleFromQuestions: state(present(title) && titleFrom.length > 0 && titleFrom.every((h) => recorded.has(h.wording)) && title === titleFrom.map((h) => h.wording).join(" · "), "the title is not made of recorded questions of this page"),
    tierShown: state(items.every((it) => it.questions.every((q) => Object.hasOwn(TIER_WORDS, q.tier))), "a question's tier is not one the page can show"),
    productStatementsApproved: state(items.every((it) => it.statementsRefused.length === 0), "a product statement asked for is not an owner-approved answer"),
    stamped: state(html.split(esc(stamp)).length - 1 >= 2, "the page does not say, top and bottom, what it is"),
    noPromise: state(!PROMISE.test(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ")), "the page promises ranking, indexing or citation"),
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

/** The page's layout: plain, readable, self-contained — no script, no outside file, nothing fetched when it is opened. */
const STYLE = "body{margin:0;background:#f6f7f9;color:#1c2430;font:17px/1.6 Georgia,'Times New Roman',serif}main{max-width:760px;margin:0 auto;padding:24px 20px 64px;background:#fff}"
  + ".stamp{margin:0;padding:10px 20px;background:#b42318;color:#fff;font:600 14px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.04em;text-align:center}"
  + "h1{font:700 30px/1.25 Arial,Helvetica,sans-serif;margin:28px 0 8px}h2{font:700 21px/1.3 Arial,Helvetica,sans-serif;margin:0 0 6px}"
  + ".qa{border-top:1px solid #e3e6ea;padding:22px 0 6px}.tier{display:inline-block;font:600 11px/1.6 Arial,Helvetica,sans-serif;color:#475467;background:#eef1f4;border-radius:3px;padding:0 6px;margin-left:6px;vertical-align:middle}"
  + ".also-asked{margin:0 0 10px;padding-left:18px;color:#475467;font-size:15px}.claim{margin:10px 0}.source{display:block;font:13px/1.5 Arial,Helvetica,sans-serif;color:#475467}"
  + ".product-statement{margin:10px 0;padding:10px 14px;background:#f2f7ff;border-left:4px solid #2e6bd9}.unknown{color:#b42318}a{color:#1a4fb3}";

/** Deterministic HTML. Every sentence of fact is a recorded claim's own text or an approved answer's own statement; the headings and the
 * title are recorded questions. Nothing else on the page states anything. */
export function renderJoined({ title, stamp, items }) {
  const tier = (t) => `<span class="tier">${esc(TIER_WORDS[t] ?? t)}</span>`;
  const claim = (c) => `<p class="claim" data-claim-id="${esc(c.claimId)}">${esc(c.text ?? "UNKNOWN — this claim records no statement")} <span class="source">${esc(c.label)} · <a href="${esc(c.link)}" rel="nofollow">${esc(c.source)}</a> · read ${esc(c.readOn)}</span></p>`;
  const item = (it) => [
    `<section class="qa" data-need-id="${esc(it.needId)}">`,
    `<h2>${esc(it.questions[0].wording)} ${tier(it.questions[0].tier)}</h2>`,
    it.questions.length > 1 ? `<ul class="also-asked">${it.questions.slice(1).map((q) => `<li>${esc(q.wording)} ${tier(q.tier)}</li>`).join("")}</ul>` : "",
    ...it.claims.map(claim),
    ...it.unknown.map((u) => `<p class="unknown">UNKNOWN — ${esc(u.why)}</p>`),
    ...it.statements.map((s) => `<p class="product-statement" data-answer-id="${esc(s.answerId)}">${esc(s.text)} <span class="source">${esc(s.label)} · <a href="${esc(s.link)}">${esc(s.source)}</a></span></p>`),
    `</section>`,
  ].filter(Boolean).join("\n");
  return [`<!doctype html>`, `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(title)}</title><style>${STYLE}</style></head><body>`,
    `<p class="stamp">${esc(stamp)}</p>`, `<main>`, `<h1>${esc(title)}</h1>`, ...items.map(item), `</main>`, `<p class="stamp">${esc(stamp)}</p>`, `</body></html>`, ""].join("\n");
}
