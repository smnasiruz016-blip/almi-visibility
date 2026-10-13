/**
 * 🔴 THE JOINED PAGE — ONE PAGE PER VALUE OF THE PRODUCT'S DECLARED DIMENSION, CARRYING EVERY CHOSEN NEED OF THAT VALUE, EACH WITH ITS OWN
 * ANSWER, BUILT UNDER THE OWNER'S STANDING PAGE LAW (RR-255: `_handoffs` AlmiVisibility_OWNER_RULING_2026-10-12_RR-255_STANDING_PAGE_LAW.md —
 * "it applies to EVERY page AlmiVisibility builds, for any client and any product"). Earlier acts it stands on: the page shape (RR-253,
 * …ANSWERS_TO_THE_BUILD_STOP.md, answer 1) and Specification Amendment 6 as the owner clarified it (RR-254: whole pages only).
 * Pure: records in, pages out. It reads no store, fetches nothing and writes nothing.
 *
 * THE PAGE LAW, clause by clause, and where it is kept here:
 *   1 DESIGN    the page wears the CLIENT's own site design — header and navigation, colours, fonts, cards, footer — handed in as the
 *               design the client filed in its questionnaire (src/questionnaire). No design, no page-law pass: nothing is defaulted.
 *   2 HERO      a search-phrased H1 (composeTitle), a two-line intro (the client's own declared product line, and one line that counts
 *               what the page holds), and a call-to-action button to the client's product (the client's own label and address).
 *   3 KEY FACTS cards, each a recorded value that is found word for word inside the recorded claim it names, with a small source link.
 *   4 Q&A       expand/collapse items: the question in its own recorded wording and language, the need's own answer — every sentence a
 *               recorded claim's own statement — and a small "Source: <name>" link; one line on top: "Last checked: <date>".
 *   5 PRODUCT   the product's own facts are product CARDS with the call to action: owner-approved questionnaire answers, word for word.
 *   6 FAQPage   structured data (JSON-LD) whose questions and answers ARE the visible ones, compared after rendering.
 *   7 LABELS    record labels (tiers, source labels, states) stay in the page RECORD and its trace — never in the visible page.
 *   8 UNANSWERED a need with no supported answer is never on the page. It stays in the record by name.
 * THE TITLE LAW: the engine may COMPOSE a short title from RECORDED SEARCH PHRASES; every word must trace to a recorded search phrase or
 *   a recorded fact (the year is a date fact); the trace is recorded. With no recorded search phrase NOTHING is composed: the title is
 *   then recorded questions, and the page says the title law is not met for want of that record.
 *
 * Also kept: CANCEL AND MOVE on WHOLE pages only (cancelSamePages; a shared question stays on each page); a need F35 did not choose is
 * never joined. 🔴 A joined page is a rendered DRAFT with its gate table — never an accepted page; publication is never this module's act.
 * 🔴 There is no word-count target. 🔴 Names no product, tenant, host, dimension or value.
 */
import { createHash } from "node:crypto";
import { PROMISE, CHECK } from "./draft-render.mjs";

export const JOINED_RECORD = "joined_page_draft";
export const CANCELLATION_RECORD = "same_need_cancellation";
export const SURVIVOR_RULE = "of two whole pages serving the same need, the page with more recorded questions survives; on a tie, the page whose value sorts first";
export const TITLE_TOPICS = 4;
export const PRODUCT_STATEMENT_LABEL = "THE PRODUCT'S OWN STATEMENT — owner-approved; self-sourced, not independently verified";
/** What a tier is called IN THE RECORD. None of these words is ever written into the visible page (law 7). */
export const TIER_WORDS = Object.freeze({ OBSERVED: "OBSERVED — seen on an opened public page", "RESEARCH-DERIVED": "INFERRED — research-derived; nobody is shown to have asked it" });
/** Law 7: words of the record that must never be visible. Matched as whole words, case-sensitive where they are record codes. */
export const RECORD_LABELS = /\b(OBSERVED|INFERRED|RESEARCH-DERIVED|RESPONSIBLE BODY|SECONDARY|SELF-SOURCED|UNKNOWN|UNVERIFIED|NOT MEASURED|PASS|FAIL)\b|self-sourced|not independently verified|owner-approved/;
/** The page's own structural words. They are declared here, not composed: a section needs a name, and none of them states a fact. */
export const STRUCTURE = Object.freeze({ keyFacts: "Key facts", questions: "Questions and answers", lastChecked: "Last checked", source: "Source", alsoAsked: "Also asked", conversion: "A conversion, not a price set by the source" });
export const REFUSAL = Object.freeze({
  JUDGEMENT: "SAME_NEED_JUDGEMENT_NAMES_NO_RECORDED_JUDGEMENT_OR_TWO_KNOWN_NEEDS",
  SAME_PAGE: "SAME_NEED_JUDGEMENT_WITHIN_ONE_PAGE_IS_A_SAMENESS_DRAFT_NOT_A_CANCELLATION",
  NOT_APPROVED: "PRODUCT_STATEMENT_IS_NOT_AN_APPROVED_ANSWER",
  NO_SITE: "PRODUCT_DECLARES_NO_OFFICIAL_SITE_TO_LINK",
  KEY_FACT: "KEY_FACT_VALUE_IS_NOT_IN_ITS_RECORDED_CLAIM",
  CONVERSION: "CONVERSION_WITHOUT_ITS_AMOUNT_IN_THE_CLAIM_OR_ITS_DATED_SOURCED_RATE",
  STALE_RATE: "CONVERSION_RATE_IS_STALE_AND_MUST_BE_REFRESHED",
});

const present = (v) => typeof v === "string" && v.trim() !== "";
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const words = (text) => String(text).split(/\s+/).filter(Boolean).length;
const visibleText = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"");
export const valueOf = (combination) => Object.values(combination ?? {}).map(String).sort().join("+");

/**
 * Specification Amendment 6 · CANCEL AND MOVE — WHOLE PAGES ONLY (the owner's clarification, RR-254).
 * Two pages serve the same need when EVERY need of each is named, by a recorded judgement, as the same need as a need of the other.
 * A judgement that joins two needs of two pages which are NOT wholly the same is a SHARED question: both needs stay where they are.
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
 * 🔴 RR-256: a joining question carries the need's SAME answer too. F91 writes a need's record from the drafts of the run that touches
 * it; a question joined in a later run with no answer would restate the need with none (found on the real batch: 9 answered needs lost theirs and were restated).
 */
export function connectionDrafts(resolved) {
  const drafts = [];
  for (const p of resolved.pages) for (const n of p.needs) {
    const [lead, ...rest] = n.questions;
    drafts.push({ questionId: lead, combination: p.combination, answer: n.answer, ...(n.sections ? { sections: n.sections } : {}) });
    for (const q of rest) {
      const moved = (n.movedIn ?? []).find((m) => m.questionId === q);
      drafts.push({ questionId: q, combination: p.combination, answer: n.answer, sameAs: { questionId: lead, judgementRef: moved ? moved.judgementRef : n.sameness?.judgementRef, reason: moved ? "moved from a cancelled same-need page (Specification Amendment 6)" : n.sameness?.reason } });
    }
  }
  return drafts;
}

/**
 * RR-256 · the need records to RESTATE: a proposed need whose latest stored record holds no supported answer although its draft carries
 * claims. Each is F91's own need record, judged by F91's own answer rule (handed in), appended — never an edit of a stored row.
 * @returns {object[]} planning_need records
 */
export function needsToRestate({ pages = [], stored = [], keyToNeed = new Map(), judge, subject, on, recordType = "planning_need" }) {
  const latest = new Map();
  for (const r of stored) if (r?.record_type === recordType && present(r.needId)) latest.set(r.needId, r);
  const out = [];
  for (const p of pages) for (const n of p.needs) {
    const needId = keyToNeed.get(n.key);
    if (!needId || !Array.isArray(n.answer?.claims) || n.answer.claims.length === 0) continue;
    const answer = judge(n.answer);
    if (JSON.stringify(latest.get(needId)?.answer ?? null) === JSON.stringify(answer)) continue;
    out.push(Object.freeze({ record_type: recordType, measurement_key: `${recordType}:${hash([needId, answer, on, "restated"])}`, recorded_at: `${on}T00:00:00Z`, subject, needId, combination: Object.freeze({ ...p.combination }), answer, sections: Object.freeze([]),
      restated: "the need's latest stored record did not hold its draft's answer (RR-256)" }));
  }
  return out;
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

/** A need's questions in the order the page shows them: a question that is itself a RECORDED SEARCH PHRASE first (the words people search,
 * RR-256), then OBSERVED questions, then the rest; each group by question id. */
export function orderedQuestions(questions, searched = new Set()) {
  const rank = (q) => (searched.has(q.wording) ? 0 : q.tier === "OBSERVED" ? 1 : 2);
  return [...questions].sort((a, b) => rank(a) - rank(b) || (a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0));
}

const SMALL = new Set(["for", "in", "of", "the", "and", "to", "a", "an", "at", "on", "by", "or"]);
/** Title casing that invents no spelling: a word is written in capitals only when the page's own records write it in capitals. */
const titleCase = (s, capitals = new Set()) => String(s).trim().split(/\s+/).map((w, i) => (capitals.has(w.toUpperCase()) ? w.toUpperCase() : i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(" ");
/** The words the page's records write in capitals (2 to 6 letters): the only words a composed title may capitalise whole. */
export const capitalsIn = (texts) => new Set(texts.flatMap((t) => String(t ?? "").match(/\b[A-Z]{2,6}\b/g) ?? []));
const tokens = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

/** The words of a recorded phrase a title part uses: `use` when given — and then every word of it must be a word of THAT phrase, in the
 * phrase's own order — else the whole phrase. A `use` that is not inside its phrase yields null: nothing is composed from it. */
export function wordsUsed(phrase) {
  if (!present(phrase?.use)) return present(phrase?.text) ? phrase.text.trim() : null;
  const have = tokens(phrase.text), want = tokens(phrase.use);
  let at = 0;
  for (const w of want) { const i = have.indexOf(w, at); if (i < 0) return null; at = i + 1; }
  return want.length ? phrase.use.trim() : null;
}

/**
 * THE TITLE LAW (b) · COMPOSE a short title from RECORDED SEARCH PHRASES, or compose nothing.
 *   head     the page's recorded head phrase (role HEAD) — the words people search for the page as a whole;
 *   topics   up to TITLE_TOPICS recorded topic phrases (role TOPIC), in the order of the page's items they are recorded for;
 *   tail     at most one recorded phrase closing the title (role TAIL);
 *   year     a DATE FACT, written only when the head phrase's record asks for it: the year of the day the sources were last read.
 * A part may use only SOME words of its phrase (`use`), in the phrase's own order — never a word the phrase does not hold.
 * Shape: "<Head> <year>: <Topic>, <Topic> & <Topic> <Tail>". The trace says which phrase every part came from.
 * @returns {{ title: string, trace: object[] } | { title: null, missing: string }}
 */
export function composeTitle({ phrases = [], needOrder = [], lastChecked = null, capitals = new Set() }) {
  const usable = phrases.filter((p) => present(p?.phraseId) && present(p?.text) && wordsUsed(p) !== null);
  const head = usable.find((p) => p.role === "HEAD");
  if (!head) return Object.freeze({ title: null, missing: "no recorded search phrase names this page as a whole (role HEAD) — nothing is composed" });
  const place = (p) => { const i = needOrder.indexOf(p.need); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  const topics = usable.filter((p) => p.role === "TOPIC").sort((a, b) => place(a) - place(b) || (a.phraseId < b.phraseId ? -1 : 1)).slice(0, TITLE_TOPICS);
  const tailPhrase = usable.find((p) => p.role === "TAIL") ?? null;
  const year = head.withYear === true && /^\d{4}-\d{2}-\d{2}$/.test(lastChecked ?? "") ? lastChecked.slice(0, 4) : null;
  const say = (p) => titleCase(wordsUsed(p), capitals);
  const list = topics.map(say);
  const joined = list.length > 1 ? `${list.slice(0, -1).join(", ")} & ${list.at(-1)}` : list[0] ?? "";
  const tail = tailPhrase ? wordsUsed(tailPhrase).split(/\s+/).map((w) => (capitals.has(w.toUpperCase()) ? w.toUpperCase() : SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(" ") : "";
  const title = `${say(head)}${year ? ` ${year}` : ""}${joined ? `: ${joined}` : ""}${tail ? `${joined ? " " : ": "}${tail}` : ""}`;
  const part = (p, text) => Object.freeze({ part: text, from: `search-phrase:${p.phraseId}`, phrase: p.text });
  const trace = [part(head, say(head)), ...(year ? [Object.freeze({ part: year, from: `date-fact:last-checked:${lastChecked}` })] : []), ...topics.map((t) => part(t, say(t))), ...(tailPhrase ? [part(tailPhrase, tail)] : [])];
  return Object.freeze({ title, trace: Object.freeze(trace) });
}

/** Every word of a composed title is a word of a recorded search phrase, or the year of the date fact. */
export function titleWordsTraced({ title, phrases = [], lastChecked = null }) {
  const allowed = new Set([...phrases.filter((p) => ["HEAD", "TOPIC", "TAIL"].includes(p.role)).flatMap((p) => tokens(wordsUsed(p) ?? "")), ...(lastChecked ? [lastChecked.slice(0, 4)] : [])]);
  return tokens(title).filter((w) => !allowed.has(w));
}

/** Law 3 · key-fact cards: a recorded value that stands, word for word, inside the recorded claim it names, under that item's own recorded
 * question; anything else is refused. */
export function keyFactCards({ facts = [], items = [] }) {
  const claims = new Map(items.flatMap((it) => it.claims.map((c) => [c.claimId, { ...c, needId: it.needId, question: it.heading.wording }])));
  const cards = [], refused = [];
  for (const f of facts) {
    const c = claims.get(f?.claimId);
    if (!c || !present(f.value) || !String(c.text ?? "").includes(f.value)) { refused.push(Object.freeze({ claimId: f?.claimId ?? null, code: REFUSAL.KEY_FACT })); continue; }
    cards.push(Object.freeze({ claimId: c.claimId, needId: c.needId, label: c.question, value: f.value.trim(), source: c.source, link: c.link, readOn: c.readOn }));
  }
  return Object.freeze({ cards: Object.freeze(cards), refused: Object.freeze(refused) });
}

/**
 * RR-256 · A DATED CONVERSION beside a recorded price: "≈ <to> <amount> at the <date> exchange rate", from ONE recorded rate fact — its rate,
 * its date, its source's name and link. It is computed here, never typed in. The amount converted must stand in the recorded claim it
 * names; a rate older than its own stated shelf life on the run's date is STALE and nothing is shown (it must be refreshed).
 */
export function conversions({ rates = [], items = [], on }) {
  const claims = new Map(items.flatMap((it) => it.claims.map((c) => [c.claimId, { ...c, needId: it.needId }])));
  const shown = [], refused = [];
  const day = (d) => Date.parse(`${d}T00:00:00Z`);
  for (const r of rates) {
    const c = claims.get(r?.claimId);
    const ok = c && Number.isFinite(r.amount) && r.amount > 0 && Number.isFinite(r.rate) && r.rate > 0 && present(r.from) && present(r.to) && present(r.shown) && String(c.text ?? "").includes(r.shown)
      && /^\d{4}-\d{2}-\d{2}$/.test(r.rateDate ?? "") && present(r.source) && /^https:\/\//.test(r.link ?? "") && Number.isInteger(r.staleAfterDays) && r.staleAfterDays > 0;
    if (!ok) { refused.push(Object.freeze({ claimId: r?.claimId ?? null, code: REFUSAL.CONVERSION })); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(on ?? "") || (day(on) - day(r.rateDate)) / 86400000 > r.staleAfterDays) { refused.push(Object.freeze({ claimId: r.claimId, code: REFUSAL.STALE_RATE })); continue; }
    const amount = Math.round(r.amount * r.rate);
    shown.push(Object.freeze({ claimId: c.claimId, needId: c.needId, from: r.from, to: r.to, amount, rate: r.rate, rateDate: r.rateDate, source: r.source, link: r.link,
      text: `${r.shown} ≈ ${r.to} ${amount.toLocaleString("en-US")} at the ${r.rateDate} exchange rate (1 ${r.from} = ${r.to} ${r.rate}). ${STRUCTURE.conversion}.` }));
  }
  return Object.freeze({ shown: Object.freeze(shown), refused: Object.freeze(refused) });
}

/** Law 6 · the FAQPage data: exactly the visible questions and the visible answer text of each item. */
export function faqOf(items) {
  return Object.freeze(items.map((it) => Object.freeze({ question: it.heading.wording, answer: it.claims.filter((c) => present(c.text)).map((c) => c.text.trim()).join(" ") })));
}

/**
 * JOIN · one page per page candidate, from F35's construction set, under the page law.
 * @param {object} input
 *   construction   F35's construction set: { slug, decision, spec } per chosen need
 *   questions      the planning store's connections by question id
 *   renderNeed     F37's own render of ONE need's compiled draft — its measurable checks are reported per item, unchanged
 *   statementsFor  the product's approved statements for a need (productStatements)
 *   orderOf        the place of a need on its page, as handed in · unansweredFor  the page's needs F35 did not choose (record only)
 *   design         the client's own site design, from its questionnaire (law 1) · productLine  the client's declared product line (law 2)
 *   phrasesFor     the recorded search phrases of a page value (title law) · keyFactsFor  the recorded key facts of a page value (law 3)
 *   needKeyOf      a need's recorded key (what phrases and key facts name)
 */
export function joinPages({ construction = [], questions = new Map(), renderNeed, statementsFor = () => ({ shown: [], refused: [] }), stamp, orderOf = () => 0, unansweredFor = () => [],
  design = null, productLine = null, phrasesFor = () => [], keyFactsFor = () => [], ratesFor = () => [], on = null, needKeyOf = (id) => id }) {
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
    const phrases = [...phrasesFor(value)];
    /* a question that IS a recorded search phrase leads its item (RR-256) */
    const searched = new Set(phrases.map((p) => p?.text).filter(present));
    const items = list.sort((a, b) => orderOf(a.spec.subject) - orderOf(b.spec.subject) || (a.spec.subject < b.spec.subject ? -1 : 1)).map(({ spec, decision }) => {
      const draft = renderNeed({ spec, decision });
      const qs = orderedQuestions(spec.sections.map((s) => { const q = questions.get(s.questionId) ?? {}; return Object.freeze({ questionId: s.questionId, wording: s.heading, tier: s.tier, country: q.country ?? null, language: q.language ?? null }); }), searched);
      const st = statementsFor(spec.subject);
      return Object.freeze({ needId: spec.subject, needKey: needKeyOf(spec.subject), heading: Object.freeze({ wording: qs[0].wording, questionId: qs[0].questionId, tier: qs[0].tier, searchPhrase: phrases.find((p) => p?.text === qs[0].wording)?.phraseId ?? null }), questions: Object.freeze(qs), claims: spec.answer.labels, unknown: spec.answer.unknown, answerJudged: spec.answer.state,
        countrySections: spec.countrySections, statements: st.shown, statementsRefused: st.refused,
        needChecks: draft?.checks ? Object.freeze(Object.fromEntries(Object.entries(draft.checks).map(([k, v]) => [k, v.state]))) : null, needDraft: draft?.state ?? "NOT RENDERED" });
    });
    const lastChecked = items.flatMap((it) => it.claims.map((c) => c.readOn)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? "")).sort().at(-1) ?? null;
    const capitals = capitalsIn([...items.flatMap((it) => [...it.questions.map((q) => q.wording), ...it.claims.map((c) => c.text)]), ...phrases.map((p) => p?.text)]);
    const composed = composeTitle({ phrases, needOrder: items.map((it) => it.needKey), lastChecked, capitals });
    /* with no recorded search phrase NOTHING is composed: the title is then the first recorded questions, observed first, as before */
    const first = items.slice(0, TITLE_TOPICS);
    const fallback = (first.some((it) => it.heading.tier === "OBSERVED") ? first.filter((it) => it.heading.tier === "OBSERVED") : first).map((it) => it.heading);
    const title = composed.title ?? fallback.map((h) => h.wording).join(" · ");
    const titleTrace = composed.title ? composed.trace : Object.freeze(fallback.map((h) => Object.freeze({ part: h.wording, from: `recorded-question:${h.questionId}` })));
    const kf = keyFactCards({ facts: keyFactsFor(value), items });
    const cv = conversions({ rates: ratesFor(value), items, on });
    const unanswered = Object.freeze([...unansweredFor(value)]);
    const faq = faqOf(items);
    const intro = Object.freeze([present(productLine) ? productLine.trim() : null, `${items.length} question${items.length === 1 ? "" : "s"} answered below, each with its source.`].filter(Boolean));
    const html = renderJoined({ title, stamp, items, design, intro, cards: kf.cards, faq, lastChecked, converted: cv.shown });
    const trace = items.flatMap((it) => [...it.claims.map((c) => Object.freeze({ needId: it.needId, claimId: c.claimId, label: c.label, source: c.source, link: c.link, readOn: c.readOn })),
      ...it.statements.map((s) => Object.freeze({ needId: it.needId, answerId: s.answerId, label: s.label, source: s.source, link: s.link, approvalRecord: s.approvalRecord }))]);
    const checks = joinedChecks({ items, html, stamp, title, titleTrace, composed: composed.title !== null, titleMissing: composed.missing ?? null, phrases, lastChecked, unanswered, design, intro, cards: kf.cards, cardsRefused: kf.refused, faq, converted: cv.shown, conversionsRefused: cv.refused });
    const value_ = { value, candidate, title, titleTrace, titleComposed: composed.title !== null, items: items.length, questions: items.reduce((n, it) => n + it.questions.length, 0), faqCount: faq.length, lastChecked, stamp };
    pages.push(Object.freeze({ record_type: JOINED_RECORD, measurement_key: `${JOINED_RECORD}:${hash([value_, html])}`, ...value_, wordCount: words(visibleText(html)), unanswered, keyFacts: kf.cards, keyFactsRefused: kf.refused, conversions: cv.shown, conversionsRefused: cv.refused, itemList: Object.freeze(items), checks, html, trace: Object.freeze(trace) }));
  }
  return Object.freeze(pages);
}

/** The FAQPage object found in the rendered page, or null. */
export function faqInPage(html) {
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  try { const j = JSON.parse(m[1]); return j?.["@type"] === "FAQPage" && Array.isArray(j.mainEntity) ? j.mainEntity.map((e) => ({ question: e.name, answer: e.acceptedAnswer?.text })) : null; } catch { return null; }
}

/** The joined page's OWN measurable checks. A check whose input is not recorded is NOT MEASURED; none passes by default. */
export function joinedChecks({ items, html, stamp, title = "", titleTrace = [], composed = false, titleMissing = null, phrases = [], lastChecked = null, unanswered = [], design = null, intro = [], cards = [], cardsRefused = [], faq = [], converted = [], conversionsRefused = [] }) {
  const state = (ok, why) => (ok ? Object.freeze({ state: CHECK.PASS }) : Object.freeze({ state: CHECK.FAIL, why }));
  const claims = items.flatMap((it) => it.claims);
  const recorded = new Set(items.flatMap((it) => it.questions.map((q) => q.wording)));
  const seen = visibleText(html).replace(esc(stamp), " ").split(stamp).join(" ");
  const inPage = faqInPage(html);
  const perNeed = (name) => { const s = items.map((it) => it.needChecks?.[name] ?? CHECK.NOT_MEASURED); return s.includes(CHECK.FAIL) ? CHECK.FAIL : s.includes(CHECK.NOT_MEASURED) ? CHECK.NOT_MEASURED : CHECK.PASS; };
  const untraced = composed ? titleWordsTraced({ title, phrases, lastChecked }) : [];
  return Object.freeze({
    /* ── the page law, clause by clause ── */
    law1ClientDesign: state(Boolean(design) && present(design.brandName) && present(design.colours?.primary) && present(design.fonts?.body) && html.includes(esc(design.brandName)) && html.includes(design.colours.primary), "the page does not carry the client's own filed design"),
    law2Hero: state(/<h1[ >]/.test(html) && html.includes(esc(title)) && intro.length === 2 && intro.every((l) => html.includes(esc(l))) && present(design?.cta?.label) && present(design?.cta?.href) && html.includes(esc(design.cta.label)), "the hero lacks its H1, its two-line intro or the client's call-to-action button"),
    law3KeyFacts: cards.length === 0 && cardsRefused.length === 0 ? Object.freeze({ state: CHECK.NOT_MEASURED, why: "no key fact is recorded for this page" }) : state(cardsRefused.length === 0 && cards.every((c) => html.includes(esc(c.value)) && present(c.link) && present(c.source)), "a key-fact card shows a value that is not in its recorded claim, or lacks its source link"),
    law4QuestionsAndAnswers: state(items.length > 0 && /<details/.test(html) && items.every((it) => html.includes(esc(it.heading.wording)) && it.claims.every((c) => html.includes(`${STRUCTURE.source}: ${esc(c.source)}`))) && present(lastChecked) && html.includes(`${STRUCTURE.lastChecked}: ${lastChecked}`), "a question, its answer's source link or the last-checked line is missing"),
    law5ProductCards: state(items.every((it) => it.statementsRefused.length === 0) && (items.every((it) => it.statements.length === 0) || present(design?.cta?.label)), "a product fact shown is not an owner-approved answer, or its card has no call to action"),
    law6FaqMatchesVisible: state(Array.isArray(inPage) && inPage.length === faq.length && faq.every((f, i) => inPage[i].question === f.question && inPage[i].answer === f.answer && html.includes(esc(f.question)) && f.answer.length > 0), "the FAQ structured data is not exactly the visible questions and answers"),
    law7NoRecordLabels: state(!RECORD_LABELS.test(seen), "a record label is visible on the page"),
    law8UnansweredNotShown: state(unanswered.every((u) => (u.wordings ?? []).every((w) => !html.includes(esc(w)))), "an unanswered need is written into the page"),
    conversionMarked: converted.length === 0 && conversionsRefused.length === 0 ? Object.freeze({ state: CHECK.NOT_MEASURED, why: "no conversion rate is recorded for this page" })
      : state(conversionsRefused.length === 0 && converted.every((c) => html.includes(esc(c.text)) && html.includes(esc(c.source)) && c.text.includes(STRUCTURE.conversion) && c.text.includes(c.rateDate)), conversionsRefused.length ? `a conversion is not shown: ${conversionsRefused.map((r) => r.code).join(", ")}` : "a conversion is shown without its rate, its date, its source or its mark"),
    titleFromSearchPhrases: composed ? state(untraced.length === 0 && titleTrace.length > 0, `title word(s) with no recorded source: ${untraced.join(", ")}`) : Object.freeze({ state: CHECK.NOT_MEASURED, why: titleMissing ?? "no recorded search phrase" }),
    titleFromRecords: state(present(title) && titleTrace.length > 0 && (composed || titleTrace.every((t) => recorded.has(t.part))), "the title is not made of recorded phrases or recorded questions"),
    /* ── what was already required ── */
    everyNeedAnswered: state(items.length > 0 && unanswered.length === 0, `${unanswered.length} need(s) of this page have no supported answer and are not on it`),
    everyItemAnswered: state(items.length > 0 && items.every((it) => it.claims.some((c) => c.central !== false && present(c.text))), "an item has no supported central statement to answer its questions"),
    everyClaimSourced: state(claims.every((c) => present(c.source) && present(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "")), "a written claim lacks its source's name, link or the date it was read"),
    ownWording: state(items.every((it) => it.questions.every((q) => present(q.wording) && html.includes(esc(q.wording)))), "a question is not shown in its own recorded wording"),
    headingsFromQuestions: state(items.every((it) => recorded.has(it.heading?.wording) && it.questions[0]?.questionId === it.heading?.questionId && (present(it.heading.searchPhrase) || it.heading.tier === "OBSERVED" || it.questions.every((q) => q.tier !== "OBSERVED"))), "a heading is not a recorded question of its item, or an observed question was passed over"),
    stamped: state(html.split(esc(stamp)).length - 1 >= 2, "the page does not say, top and bottom, what it is"),
    noPromise: state(!PROMISE.test(seen), "the page promises ranking, indexing or citation"),
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

const colour = (v, fallback) => (/^#[0-9a-fA-F]{3,8}$/.test(v ?? "") ? v : fallback);
const fontStack = (v) => (present(v) && !/[<>{};]/.test(v) ? v : "system-ui, sans-serif");
const absolute = (site, href) => { try { return new URL(href, site).href; } catch { return null; } };

/** The page's stylesheet, from the client's own design tokens. Self-contained: no script, no outside file, nothing fetched when opened. */
function styleOf(design) {
  const c = design?.colours ?? {};
  const v = { bg: colour(c.background, "#ffffff"), paper: colour(c.surface, "#ffffff"), line: colour(c.border, "#e3e6ea"), primary: colour(c.primary, "#333333"), primaryDeep: colour(c.primaryDeep, colour(c.primary, "#333333")),
    accent: colour(c.accent, colour(c.primary, "#333333")), ink: colour(c.ink, "#111111"), text: colour(c.text, "#333333"), muted: colour(c.muted, "#555555"), footBg: colour(c.footerBackground, "#111111"), footAccent: colour(c.footerAccent, "#cccccc"), onDark: colour(c.onDark, "#ffffff") };
  const radius = /^\d{1,2}px$/.test(design?.card?.radius ?? "") ? design.card.radius : "12px";
  return `*{box-sizing:border-box}body{margin:0;background:${v.bg};color:${v.text};font:17px/1.6 ${fontStack(design?.fonts?.body)}}a{color:${v.accent}}`
    + `.stamp{margin:0;padding:9px 16px;background:#b42318;color:#fff;font-weight:700;font-size:13px;letter-spacing:.05em;text-align:center}`
    + `.site-head{border-bottom:1px solid ${v.line};background:${v.bg}}.bar{max-width:1120px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}`
    + `.brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:${v.ink};font-weight:600;font-size:20px}.mark{display:inline-flex;width:36px;height:36px;align-items:center;justify-content:center;border-radius:8px;background:${v.primary};color:#fff;font-weight:700}`
    + `nav{display:flex;align-items:center;gap:18px;flex-wrap:wrap}nav a{color:${v.ink};font-weight:600;text-decoration:none}`
    + `.cta{display:inline-block;background:${v.primary};color:${v.ink};font-weight:600;text-decoration:none;padding:10px 22px;border-radius:9999px}.cta:hover{background:${v.primaryDeep}}`
    + `main{max-width:860px;margin:0 auto;padding:8px 20px 56px}.hero{padding:40px 0 28px}h1{margin:0 0 12px;color:${v.ink};font-size:34px;line-height:1.2}.hero p{margin:0 0 6px;font-size:18px}.hero .cta{margin-top:16px;font-size:16px;padding:13px 28px}`
    + `h2{color:${v.ink};font-size:24px;margin:36px 0 14px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:0;padding:0;list-style:none}`
    + `.card{background:${v.paper};border:1px solid ${v.line};border-radius:${radius};padding:18px}.card .k{display:block;color:${v.muted};font-size:14px}.card .v{display:block;color:${v.ink};font-weight:700;font-size:22px;margin:4px 0 8px}`
    + `.src{font-size:13px;color:${v.muted}}.checked{color:${v.muted};font-size:14px;margin:0 0 12px}`
    + `details{background:${v.paper};border:1px solid ${v.line};border-radius:${radius};margin:0 0 12px;padding:0 18px}summary{cursor:pointer;list-style-position:outside;padding:16px 0;color:${v.ink};font-weight:600;font-size:18px}details[open] summary{border-bottom:1px solid ${v.line}}`
    + `details p{margin:12px 0}.also{color:${v.muted};font-size:14px}.product{background:${v.bg};border:1px solid ${v.line};border-radius:${radius};padding:14px 16px;margin:12px 0 16px}.product p{margin:0 0 10px;color:${v.ink}}.product .cta{font-size:14px;padding:8px 18px}`
    + `.site-foot{background:${v.footBg};color:${v.onDark};margin-top:40px}.foot{max-width:1120px;margin:0 auto;padding:36px 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;font-size:14px}`
    + `.foot h3{margin:0 0 10px;color:${v.footAccent};font-size:12px;letter-spacing:.08em;text-transform:uppercase}.foot ul{margin:0;padding:0;list-style:none}.foot li{margin:0 0 6px}.foot a{color:${v.onDark};opacity:.8;text-decoration:none}.legal{text-align:center;font-size:12px;opacity:.7;padding:0 20px 24px;margin:0}`;
}

/**
 * Deterministic HTML under the page law. Every sentence of fact is a recorded claim's own text or an approved answer's own statement;
 * the questions are recorded questions; the brand, navigation, call to action and footer are the client's own filed design.
 */
export function renderJoined({ title, stamp, items, design = null, intro = [], cards = [], faq = faqOf(items), lastChecked = null, converted = [] }) {
  const site = design?.siteAddress ?? null;
  const link = (href) => esc(absolute(site, href) ?? "#");
  const cta = present(design?.cta?.label) && present(design?.cta?.href) ? `<a class="cta" href="${link(design.cta.href)}">${esc(design.cta.label)}</a>` : "";
  const header = design ? `<header class="site-head"><div class="bar"><a class="brand" href="${link("/")}">${present(design.logo?.mark) ? `<span class="mark" aria-hidden="true">${esc(design.logo.mark)}</span>` : ""}<span>${esc(design.logo?.wordmark ?? design.brandName ?? "")}</span></a>`
    + `<nav>${(design.nav ?? []).map((n) => `<a href="${link(n.href)}">${esc(n.label)}</a>`).join("")}${cta}</nav></div></header>` : "";
  const footer = design ? `<footer class="site-foot"><div class="foot">${(design.footer?.columns ?? []).map((col) => `<div><h3>${esc(col.title)}</h3><ul>${(col.links ?? []).map((l) => `<li><a href="${link(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul></div>`).join("")}</div>${present(design.footer?.notice) ? `<p class="legal">${esc(design.footer.notice)}</p>` : ""}</footer>` : "";
  const source = (c) => `<a class="src" href="${esc(c.link)}" rel="nofollow">${STRUCTURE.source}: ${esc(c.source)}</a>`;
  const item = (it) => [
    `<details data-need-id="${esc(it.needId)}"${it === items[0] ? " open" : ""}>`,
    `<summary>${esc(it.heading.wording)}</summary>`,
    ...it.claims.filter((c) => present(c.text)).flatMap((c) => [`<p data-claim-id="${esc(c.claimId)}">${esc(c.text.trim())} ${source(c)}</p>`,
      ...converted.filter((v) => v.claimId === c.claimId).map((v) => `<p class="also" data-conversion-of="${esc(c.claimId)}">${esc(v.text)} <a class="src" href="${esc(v.link)}" rel="nofollow">${STRUCTURE.source}: ${esc(v.source)}</a></p>`)]),
    it.questions.length > 1 ? `<p class="also">${STRUCTURE.alsoAsked}: ${it.questions.slice(1).map((q) => esc(q.wording)).join(" · ")}</p>` : "",
    ...it.statements.map((s) => `<div class="product" data-answer-id="${esc(s.answerId)}"><p>${esc(s.text)}</p>${cta}</div>`),
    `</details>`,
  ].filter(Boolean).join("\n");
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }).replace(/</g, "\\u003c");
  return [`<!doctype html>`, `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(title)}</title><style>${styleOf(design)}</style>`,
    `<script type="application/ld+json">${ld}</script></head><body>`,
    `<p class="stamp">${esc(stamp)}</p>`, header, `<main>`,
    `<section class="hero"><h1>${esc(title)}</h1>${intro.map((l) => `<p>${esc(l)}</p>`).join("")}${cta}</section>`,
    cards.length ? `<section><h2>${STRUCTURE.keyFacts}</h2><ul class="cards">${cards.map((c) => `<li class="card" data-claim-id="${esc(c.claimId)}"><span class="k">${esc(c.label)}</span><span class="v">${esc(c.value)}</span>${source(c)}</li>`).join("")}</ul></section>` : "",
    `<section><h2>${STRUCTURE.questions}</h2>${lastChecked ? `<p class="checked">${STRUCTURE.lastChecked}: ${esc(lastChecked)}</p>` : ""}`, ...items.map(item), `</section>`,
    `</main>`, footer, `<p class="stamp">${esc(stamp)}</p>`, `</body></html>`, ""].filter((x) => x !== "").join("\n") + "\n";
}
