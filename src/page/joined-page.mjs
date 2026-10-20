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
 * THE AI-SEARCH PAGE LAW (RR-257, AlmiVisibility_OWNER_RULING_2026-10-13_RR-257_AI_SEARCH_PAGE_LAW.md; B2 to B8 are checked here, each
 *   as far as a page that is not published can be measured — these are implementation rules, never a search engine's formula and never
 *   a promise of inclusion, ranking or citation): the title promises only what the page holds; the direct answer stands right after its
 *   question; every fact shows its source and the day THAT fact was checked, and has a recorded recheck interval; one question lives
 *   under one need; the answers are plain HTML text; the business is identified and its own claims are set apart; nothing reads as an
 *   instruction to a machine.
 * HEADER AND LOGOS (RR-258, AlmiVisibility_OWNER_RULING_2026-10-13_RR-258_HEADER_AND_LOGOS.md): every page shows the client's COMPANY
 *   logo and the PRODUCT's logo/name in the header, and the client's FULL header navigation and footer — every item, the same order, the
 *   same links. A logo is the client's own FILE, shown as it is (assetsOf names the file the page needs); it is never drawn here.
 * THE HEADING RULE (RR-257 A2): where a need has a full recorded QUESTION, the question is the heading; otherwise the recorded phrase,
 *   the same words in title case. A raw lower-case phrase is never a heading.
 * THE TITLE LAW: the engine may COMPOSE a short title from RECORDED SEARCH PHRASES; every word must trace to a recorded search phrase or
 *   a recorded fact (the year is a date fact); the trace is recorded. With no recorded search phrase NOTHING is composed: the title is
 *   then recorded questions, and the page says the title law is not met for want of that record.
 *
 * THE LEAD (RR-262; the owner's page-content decision of RR-261): a need recorded to LEAD WITH THE PRODUCT'S OWN STATEMENTS shows its
 *   product cards — owner-approved answers — right after its question, then ONE call-to-action button for the item (the owner's answer
 *   of 14 October 2026: one button, not one per card), then ONE sourced line: one recorded claim of one sentence, with its source. The
 *   product's own statement is never written into the FAQ structured data. Which need leads so is recorded with the need; it is never decided here.
 *
 * 🔴 NO PAGE IS CANCELLED HERE (RR-262). Whether two pages serve the same need is decided once, over BUILT pages, by F10
 * (src/page/built-page-needs.mjs, Acceptance Amendment 4) and stored; a rebuild honours the stored records
 * (src/page/stored-page-decisions.mjs). The earlier build-time step of this module is retired. A need F35 did not choose is
 * never joined. 🔴 A joined page is a rendered DRAFT with its gate table — never an accepted page; publication is never this module's act.
 * 🔴 There is no word-count target. 🔴 Names no product, tenant, host, dimension or value.
 */
import { createHash } from "node:crypto";
import { PROMISE, CHECK } from "./draft-render.mjs";

export const JOINED_RECORD = "joined_page_draft";
/** What a need may be recorded to lead with. Any other recorded value is granted nothing and fails the page's own check. */
export const LEAD = Object.freeze({ PRODUCT: "PRODUCT_STATEMENTS" });
/** How many sourced lines follow the product cards in an item that leads with them: one recorded claim of one sentence. */
export const LEAD_SOURCED_LINES = 1;
export const TITLE_TOPICS = 4;
export const PRODUCT_STATEMENT_LABEL = "THE PRODUCT'S OWN STATEMENT — owner-approved; self-sourced, not independently verified";
/** What a tier is called IN THE RECORD. None of these words is ever written into the visible page (law 7). */
export const TIER_WORDS = Object.freeze({ OBSERVED: "OBSERVED — seen on an opened public page", "RESEARCH-DERIVED": "INFERRED — research-derived; nobody is shown to have asked it" });
/** Law 7: words of the record that must never be visible. Matched as whole words, case-sensitive where they are record codes. */
export const RECORD_LABELS = /\b(OBSERVED|INFERRED|RESEARCH-DERIVED|RESPONSIBLE BODY|SECONDARY|SELF-SOURCED|UNKNOWN|UNVERIFIED|NOT MEASURED|PASS|FAIL)\b|self-sourced|not independently verified|owner-approved/;
/** The page's own structural words. They are declared here, not composed: a section needs a name, and none of them states a fact. */
export const STRUCTURE = Object.freeze({ related: "Related guides", keyFacts: "Key facts", questions: "Questions and answers", lastChecked: "Last checked", source: "Source", alsoAsked: "Also asked", conversion: "estimate", checked: "checked", generalView: "General view — not an official fact", pagesChecked: "Official pages checked" });
/* RR-265 (owner decision RR-265 item 3): a question no official source answers may carry ONE general-view sentence — after part a, that no
 * official body ranks the one thing over the other, and part b, the real differences, each one sourced sentence from the owners' own pages;
 * visibly labelled, never in the FAQ structured data, counted apart from sourced answers. It never attributes a view to people.
 * RR-269 §3: part a is a CHECKED_NOT_FOUND record (src/facts/checked-not-found.mjs) — an absence is never quoted — shown with the official
 * pages checked, linked, and never in the FAQ structured data. */
export const ANSWER_KIND = Object.freeze({ SOURCED: "SOURCED", GENERAL_VIEW: "GENERAL_VIEW", CHECKED_NOT_FOUND: "CHECKED_NOT_FOUND" });
/** part b of a general view: at least this many sourced sentences, after its part a (a CHECKED_NOT_FOUND line) */
export const GENERAL_VIEW_MIN_SOURCED = 1;
/* RR-265 (owner decision RR-265 item 7, standing): TO THE POINT. Every answer opens with ONE short sentence — the direct answer; every
 * sourced line is one sentence of at most TO_THE_POINT_MAX_WORDS words; no filler phrase of the client's DECLARED list stands in an answer.
 * Whether the first sentence answers its question is the research agent's recorded judgement; the engine measures its shape. */
export const TO_THE_POINT_MAX_WORDS = 30;
export const sentencesOf = (text) => String(text ?? "").trim().split(/(?<=[.!?])\s+(?=[A-Z(])/).filter(Boolean);
const wordsIn = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
const PEOPLE_SAY = /\b(people|most|many|everyone|candidates|students|test[- ]takers)\b[^.]{0,30}\b(say|says|said|think|thinks|feel|feels|find|finds|agree|agrees|believe|believes|report|reports)\b/i;
export const REFUSAL = Object.freeze({
  NOT_APPROVED: "PRODUCT_STATEMENT_IS_NOT_AN_APPROVED_ANSWER",
  NO_SITE: "PRODUCT_DECLARES_NO_OFFICIAL_SITE_TO_LINK",
  KEY_FACT: "KEY_FACT_VALUE_IS_NOT_IN_ITS_RECORDED_CLAIM",
  /* RR-294 (the owner's addition 1): a card's shown value must stand WORD FOR WORD in its claim's own verbatim quotation of the source —
   * our restatement of the claim is not the source, and a value that is only in it is refused */
  KEY_FACT_QUOTE: "KEY_FACT_VALUE_IS_NOT_IN_ITS_VERBATIM_QUOTATION",
  CONVERSION: "CONVERSION_WITHOUT_ITS_AMOUNT_IN_THE_CLAIM_OR_ITS_DATED_SOURCED_RATE",
  STALE_RATE: "CONVERSION_RATE_IS_STALE_AND_MUST_BE_REFRESHED",
  COMPARISON: "COMPARISON_CELL_IS_NOT_IN_ITS_RECORDED_CLAIM_OR_NAMES_NO_SHOWN_CONVERSION",
});

const present = (v) => typeof v === "string" && v.trim() !== "";
/* RR-268 A2 (beta-g technical decision): a need recorded UNANSWERABLE is complete for the page gate when its record names the official
 * source that was checked and the day it was checked. It stays off the page and is counted apart: never as answered, never as nothing.
 * One without its named source or its day is an unanswered need, and the gate still fails on it. */
export const UNANSWERABLE = "UNANSWERABLE";
export const unanswerableRecorded = (u) => u?.unanswerable?.disposition === UNANSWERABLE && present(u.unanswerable.source?.name) && /^\d{4}-\d{2}-\d{2}$/.test(u.unanswerable.checkedOn ?? "");
const hash =(x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** the page's own escaping, for a reader that must find a wording in a built page exactly as the page shows it (F10, src/page/built-page-needs.mjs) */
export const escapeText = esc;
const words = (text) => String(text).split(/\s+/).filter(Boolean).length;
const visibleText = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"");
export const valueOf = (combination) => Object.values(combination ?? {}).map(String).sort().join("+");
/** The page value a compiled need's recorded page candidate names — the same value valueOf gives its combination — or null. */
export const candidateValue = (candidate) => { try { return JSON.parse(candidate).map(([, v]) => String(v)).sort().join("+"); } catch { return null; } };

/**
 * The connection drafts (F91, src/page/demand-connection.mjs) of the proposed pages: a need's first question carries its combination and
 * answer; every other question of the need joins it by the need's own recorded sameness judgement.
 * 🔴 RR-256: a joining question carries the need's SAME answer too. F91 writes a need's record from the drafts of the run that touches
 * it; a question joined in a later run with no answer would restate the need with none (found on the real batch: 9 answered needs lost theirs and were restated).
 */
export function connectionDrafts(proposed) {
  const drafts = [];
  for (const p of proposed.pages) for (const n of p.needs) {
    const [lead, ...rest] = n.questions;
    drafts.push({ questionId: lead, combination: p.combination, answer: n.answer, ...(n.sections ? { sections: n.sections } : {}) });
    for (const q of rest) drafts.push({ questionId: q, combination: p.combination, answer: n.answer, sameAs: { questionId: lead, judgementRef: n.sameness?.judgementRef, reason: n.sameness?.reason } });
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
    if (!needId || !Array.isArray(n.answer?.claims)) continue;
    /* RR-268 C: a draft with no claims restates only a need whose latest stored record still holds claims — a need REOPENED in its draft
     * (its facts stayed REJECTED) must not keep showing the stored answer; a need never answered is left alone */
    if (n.answer.claims.length === 0 && (latest.get(needId)?.answer?.claims ?? []).length === 0) continue;
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

/** RR-257 B3 · the direct answer stands right after its question: an item's central statements lead, the rest follow, each group in its
 * recorded order. Nothing is added or dropped. */
export const centralFirst = (claims = []) => Object.freeze([...claims.filter((c) => c?.central !== false), ...claims.filter((c) => c?.central === false)]);

/** A full question, as recorded: its wording ends in a question mark. A search phrase such as "widget fee in atlantis" is not one. */
export const isQuestion = (wording) => /[?؟]\s*$/.test(String(wording ?? ""));

/** A need's questions in the order the page shows them (RR-257 A2): FULL QUESTIONS before phrases — among questions, one that is itself
 * a recorded search phrase first, then OBSERVED ones, then the rest; then the phrases, a recorded search phrase first. Each group by id. */
export function orderedQuestions(questions, searched = new Set()) {
  const rank = (q) => (isQuestion(q.wording) ? (searched.has(q.wording) ? 0 : q.tier === "OBSERVED" ? 1 : 2) : searched.has(q.wording) ? 3 : q.tier === "OBSERVED" ? 4 : 5);
  return [...questions].sort((a, b) => rank(a) - rank(b) || (a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0));
}

const SMALL = new Set(["for", "in", "of", "the", "and", "to", "a", "an", "at", "on", "by", "or"]);
/** Title casing that invents no spelling: a word is written in capitals only when the page's own records write it in capitals. */
const titleCase = (s, capitals = new Set()) => String(s).trim().split(/\s+/).map((w, i) => (capitals.has(w.toUpperCase()) ? w.toUpperCase() : i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(" ");
/** The words the page's records write in capitals (2 to 6 letters): the only words a composed title may capitalise whole. */
export const capitalsIn = (texts) => new Set(texts.flatMap((t) => String(t ?? "").match(/\b[A-Z]{2,6}\b/g) ?? []));
const tokens = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
/** The heading a recorded wording is shown as: a question as it is; a phrase in title case — the same words, nothing added. */
export const headingShown = (wording, capitals = new Set()) => (isQuestion(wording) ? String(wording).trim() : titleCase(wording, capitals));
const sameWords = (a, b) => tokens(a).join(" ") === tokens(b).join(" ");

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

/**
 * 🔴 SAME MEANING (RR-295, owner decision 2 and its beta-g safeguard): a card may say what its source says in words of the same meaning —
 * "45 mins" = "45 minutes", "Approximately 20 minutes" = "about 20 minutes", "Grade B (Minimum Score of 350)" = "grade B (350)" — but every
 * NUMBER, its UNIT, an "about" before it and every CONDITION on it ("with no elements below 300") must be the source's. A dropped or changed
 * one changes the meaning and is refused, named: "1400" where the source says "1400 with no elements below 300" is refused.
 * Only these equivalences are taken; nothing else is guessed.
 */
const UNIT = "minutes|hours|seconds|days|weeks|months|years|%";
const canon = (s) => ` ${String(s ?? "").toLowerCase()
  .replace(/[–—]/g, "-")
  .replace(/\bwith no (?:elements?|parts?|components?|modules?|sections?|sub-?tests?|skills?) (?:below|under|lower than)\b/g, " nobelow ")
  .replace(/\bno (?:elements?|parts?|components?|modules?|sections?|sub-?tests?|skills?) (?:below|under|lower than)\b/g, " nobelow ")
  .replace(/\b(?:approximately|approx\.?|around|roughly)\s/g, "about ")
  .replace(/\bmins?\b/g, "minutes").replace(/\bhrs?\b/g, "hours").replace(/\bsecs?\b/g, "seconds")
  .replace(/\b(?:a minimum of|minimum of|minimum scale score of|minimum score of|scale score of|score of|at least|minimum|or above|or higher|or more)\b/g, " ")
  .replace(/\bgrade\b/g, " ")
  .replace(/[()[\],;:"*]/g, " ")
  .replace(/\s+/g, " ").trim()} `;
export function sameMeaning(value, quote) {
  const v = canon(value), q = canon(quote);
  if (!present(String(value ?? "")) || !present(String(quote ?? ""))) return Object.freeze({ same: false, why: "no source quotation to compare with" });
  if (!q.includes(v)) return Object.freeze({ same: false, why: "a number, unit or word of the value is not in the source" });
  /* the safeguard: what the source binds to each of the value's numbers — its unit, an "about" before it, a "no part below" after it */
  for (const n of v.match(/\d[\d,.]*/g) ?? []) {
    const bound = `(about )?(?<![\\d,.])${n.replace(/[.]/g, "\\.")}(?![\\d,.])(?: ?(${UNIT}))?(?: nobelow ([\\d,.]+))?`;
    const at = [...q.matchAll(new RegExp(bound, "g"))];
    const inV = new RegExp(bound).exec(v);
    if (!at.length || !inV) continue;
    const kept = at.some((m) => (!m[1] || inV[1]) && (!m[2] || inV[2] === m[2]) && (!m[3] || inV[3] === m[3]));
    if (!kept) {
      const m = at[0];
      const lost = m[3] && !inV[3] ? `the condition "no part below ${m[3]}"` : m[2] && inV[2] !== m[2] ? `the unit "${m[2]}"` : `the word "about"`;
      return Object.freeze({ same: false, why: `the source binds ${lost} to ${n}; the value drops it` });
    }
  }
  return Object.freeze({ same: true, why: null });
}

/** Law 3 · key-fact cards: a recorded value that stands inside the recorded claim it names, under that item's own recorded question — word
 * for word, or in words of the same meaning (RR-295, sameMeaning above); anything else is refused. */
export function keyFactCards({ facts = [], items = [], quotationOf = null }) {
  const claims = new Map(items.flatMap((it) => it.claims.map((c) => [c.claimId, { ...c, needId: it.needId, question: it.heading.shown ?? it.heading.wording }])));
  const cards = [], refused = [];
  for (const f of facts) {
    const c = claims.get(f?.claimId);
    /* the card belongs to its claim: the value stands in the claim's text, or every number of it does (the meaning is the quote's check below) */
    const numbersIn = (s) => String(s ?? "").match(/\d[\d,.]*\d|\d/g) ?? [];
    const ofClaim = present(f.value) && c && (String(c.text ?? "").includes(f.value) || sameMeaning(f.value, c.text).same || (numbersIn(f.value).length > 0 && numbersIn(f.value).every((n) => numbersIn(c.text).includes(n))));
    if (!c || !ofClaim) { refused.push(Object.freeze({ claimId: f?.claimId ?? null, code: REFUSAL.KEY_FACT })); continue; }
    /* RR-294 / RR-295: with the quotations handed in, the value must say what its claim's own verbatim quotation says — the same words, or
     * words of the same meaning with every number, unit and condition kept */
    const sm = typeof quotationOf === "function" ? sameMeaning(f.value, quotationOf(c.claimId)) : null;
    if (sm && !sm.same) { refused.push(Object.freeze({ claimId: c.claimId, code: REFUSAL.KEY_FACT_QUOTE, value: f.value.trim(), quotation: String(quotationOf(c.claimId) ?? "").replace(/\s+/g, " ").trim() || null, why: sm.why })); continue; }
    cards.push(Object.freeze({ claimId: c.claimId, needId: c.needId, label: c.question, value: f.value.trim(), source: c.source, link: c.link, readOn: c.readOn }));
  }
  return Object.freeze({ cards: Object.freeze(cards), refused: Object.freeze(refused) });
}

/**
 * A DATED CONVERSION beside a recorded price (RR-256; RR-257 A1: through one or MORE official rates of the SAME day, multiplied in order —
 * e.g. the price's currency to a second currency by one central bank's rate, and that to the reader's currency by another's). It is
 * computed here, never typed in. The amount converted must stand in the recorded claim it names; every step is a dated fact with its
 * source's name and link and its own recheck interval; the steps must chain and share one date. Past the shortest recheck interval on
 * the run's date the conversion is STALE and nothing is shown. The line says it is an estimate and whose price it is NOT.
 */
export function conversions({ rates = [], items = [], on }) {
  const claims = new Map(items.flatMap((it) => it.claims.map((c) => [c.claimId, { ...c, needId: it.needId, needKey: it.needKey }])));
  const shown = [], refused = [];
  const day = (d) => Date.parse(`${d}T00:00:00Z`);
  const date = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? "");
  for (const r of rates) {
    const c = claims.get(r?.claimId), steps = Array.isArray(r?.steps) ? r.steps : [];
    const stepOk = (s) => Number.isFinite(s?.rate) && s.rate > 0 && present(s.from) && present(s.to) && date(s.rateDate) && present(s.source) && present(s.short) && /^https:\/\//.test(s.link ?? "") && Number.isInteger(s.recheckDays) && s.recheckDays > 0;
    const ok = c && Number.isFinite(r.amount) && r.amount > 0 && present(r.from) && present(r.to) && present(r.toName) && present(r.label) && present(r.notA) && present(r.shown) && String(c.text ?? "").includes(r.shown)
      && steps.length > 0 && steps.every(stepOk) && steps[0].from === r.from && steps.at(-1).to === r.to && steps.every((s, i) => i === 0 || (steps[i - 1].to === s.from && steps[i - 1].rateDate === s.rateDate));
    if (!ok) { refused.push(Object.freeze({ claimId: r?.claimId ?? null, code: REFUSAL.CONVERSION })); continue; }
    const rateDate = steps[0].rateDate, shelf = Math.min(...steps.map((s) => s.recheckDays));
    if (!date(on) || (day(on) - day(rateDate)) / 86400000 > shelf) { refused.push(Object.freeze({ claimId: r.claimId, code: REFUSAL.STALE_RATE })); continue; }
    const amount = Math.round(steps.reduce((a, s) => a * s.rate, r.amount));
    const short = `≈ ${r.to} ${amount.toLocaleString("en-US")}`;
    shown.push(Object.freeze({ claimId: c.claimId, needId: c.needId, needKey: c.needKey, from: r.from, to: r.to, amount, rateDate, recheckDays: shelf, short,
      steps: Object.freeze(steps.map((s) => Object.freeze({ from: s.from, to: s.to, rate: s.rate, rateDate: s.rateDate, source: s.source, short: s.short, link: s.link, recheckDays: s.recheckDays }))),
      text: `${r.label} ${r.shown} (${short}). The ${r.toName} figure is an ${STRUCTURE.conversion} from the ${steps.map((s) => s.short).join(" and ")} rates of ${rateDate}, not ${r.notA}.` }));
  }
  return Object.freeze({ shown: Object.freeze(shown), refused: Object.freeze(refused) });
}

/**
 * RR-257 B7 · A SMALL COMPARISON TABLE inside one need's answer — the page's own added value. Every cell is a recorded value found word
 * for word in the recorded claim it names (with that claim's source), or the shown conversion of a claim; anything else refuses the table.
 */
export function comparisonTables({ tables = [], items = [], converted = [] }) {
  const claims = new Map(items.flatMap((it) => it.claims.map((c) => [c.claimId, c])));
  const keys = new Set(items.map((it) => it.needKey));
  const shown = [], refused = [];
  for (const t of tables) {
    const cols = Array.isArray(t?.columns) ? t.columns : [], rows = Array.isArray(t?.rows) ? t.rows : [];
    const cell = (x) => {
      if (present(x?.conversionOf)) { const v = converted.find((k) => k.claimId === x.conversionOf); return v ? Object.freeze({ value: `${v.short} (${STRUCTURE.conversion})`, source: v.steps.map((s) => s.short).join(" and "), link: v.steps[0].link, readOn: claims.get(x.conversionOf)?.readOn ?? null, claimId: v.claimId }) : null; }
      const c = claims.get(x?.claimId);
      return c && present(x.value) && String(c.text ?? "").includes(x.value) ? Object.freeze({ value: x.value.trim(), source: c.source, link: c.link, readOn: c.readOn ?? null, claimId: c.claimId }) : null;
    };
    const built = rows.map((r) => ({ label: r?.label, cells: (Array.isArray(r?.cells) ? r.cells : []).map(cell) }));
    const ok = keys.has(t?.need) && present(t.caption) && cols.length >= 2 && cols.slice(1).every(present) && built.length > 0 && built.every((r) => present(r.label) && r.cells.length === cols.length - 1 && r.cells.every(Boolean));
    if (!ok) { refused.push(Object.freeze({ need: t?.need ?? null, code: REFUSAL.COMPARISON })); continue; }
    shown.push(Object.freeze({ need: t.need, caption: t.caption.trim(), columns: Object.freeze([...cols]), rows: Object.freeze(built.map((r) => Object.freeze({ label: r.label.trim(), cells: Object.freeze(r.cells) }))) }));
  }
  return Object.freeze({ shown: Object.freeze(shown), refused: Object.freeze(refused) });
}

/** Law 6 · the FAQPage data: exactly the visible questions and the visible answer text of each item. */
export function faqOf(items, converted = []) {
  /* RR-294 (the owner's addition 2): a question that ASKS in the reader's currency ("in rupees") is answered in it in the FAQ too — its dated
   * estimate first, as on the page. Any other answer's FAQ data stays the source's words alone (RR-256: an estimate is not the answer). */
  return Object.freeze(items.map((it) => {
    const mine = converted.filter((v) => it.claims.some((c) => c.claimId === v.claimId));
    const lead = asksForCurrency(it.heading.wording, mine) ? mine.map((v) => v.text) : [];
    return Object.freeze({ question: it.heading.shown ?? it.heading.wording, answer: [...lead, ...it.claims.filter((c) => present(c.text)).map((c) => c.text.trim())].join(" ") });
  }));
}
/** RR-294: a question that asks for the reader's currency (e.g. "in rupees") — its answer leads with the converted figure. */
export const asksForCurrency = (wording, converted) => converted.some((v) => new RegExp(`\\b(${v.to}|${CURRENCY_WORDS[v.to] ?? v.to})\\b`, "i").test(String(wording ?? "")));
const CURRENCY_WORDS = Object.freeze({ PKR: "rupees?" });

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
 *   ratesFor       the recorded conversion records of a page value · comparisonsFor  its recorded comparison tables (RR-257 B7)
 *   recheckOf      a claim's recorded recheck interval in days (RR-257 B4) · on  the day of the run
 *   leadOf         what a need is RECORDED to lead with (LEAD), or null (RR-262)
 */
export function joinPages({ construction = [], questions = new Map(), renderNeed, statementsFor = () => ({ shown: [], refused: [] }), stamp, orderOf = () => 0, unansweredFor = () => [],
  design = null, productLine = null, phrasesFor = () => [], keyFactsFor = () => [], ratesFor = () => [], comparisonsFor = () => [], recheckOf = () => null, on = null, needKeyOf = (id) => id, leadOf = () => null, generalViewOf = () => null, checkedNotFoundOf = () => [], fillerPhrases = [], relatedFor = () => [], quotationOf = null }) {
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
    const value = candidateValue(candidate);
    if (value === null) continue;
    const phrases = [...phrasesFor(value)];
    /* a question that IS a recorded search phrase leads its item (RR-256) */
    const searched = new Set(phrases.map((p) => p?.text).filter(present));
    const capitals = capitalsIn([...list.flatMap(({ spec }) => [...spec.sections.map((s) => s.heading), ...spec.answer.labels.map((c) => c.text)]), ...phrases.map((p) => p?.text)]);
    const items = list.sort((a, b) => orderOf(a.spec.subject) - orderOf(b.spec.subject) || (a.spec.subject < b.spec.subject ? -1 : 1)).map(({ spec, decision }) => {
      const draft = renderNeed({ spec, decision });
      const qs = orderedQuestions(spec.sections.map((s) => { const q = questions.get(s.questionId) ?? {}; return Object.freeze({ questionId: s.questionId, wording: s.heading, tier: s.tier, country: q.country ?? null, language: q.language ?? null }); }), searched);
      const st = statementsFor(spec.subject);
      /* RR-262: the lead is granted only as recorded, and only when an approved statement is there to lead with */
      const asked = leadOf(spec.subject) ?? null;
      /* RR-265: a recorded general view (INFERRED, the client AI's research), kept apart from the sourced claims */
      const gv = generalViewOf(spec.subject);
      const generalView = gv && present(gv.text) && present(gv.source) ? Object.freeze({ text: gv.text.trim(), source: gv.source, label: "INFERRED", ref: gv.ref ?? null }) : null;
      /* RR-269 §3: what was checked and not found, as recorded — a line with its checked pages, never a claim */
      const checkedNotFound = Object.freeze([...(checkedNotFoundOf(spec.subject) ?? [])].filter((r) => r?.kind === ANSWER_KIND.CHECKED_NOT_FOUND));
      return Object.freeze({ ...(generalView ? { answerKind: ANSWER_KIND.GENERAL_VIEW, generalView } : {}), ...(checkedNotFound.length ? { checkedNotFound } : {}), ...(asked !== null ? { leadAsked: asked, lead: asked === LEAD.PRODUCT && st.shown.length > 0 ? LEAD.PRODUCT : null } : {}), needId: spec.subject, needKey: needKeyOf(spec.subject), heading: Object.freeze({ wording: qs[0].wording, shown: headingShown(qs[0].wording, capitals), questionId: qs[0].questionId, tier: qs[0].tier, searchPhrase: phrases.find((p) => p?.text === qs[0].wording)?.phraseId ?? null }), questions: Object.freeze(qs), claims: centralFirst(spec.answer.labels), unknown: spec.answer.unknown, answerJudged: spec.answer.state,
        countrySections: spec.countrySections, statements: st.shown, statementsRefused: st.refused,
        needChecks: draft?.checks ? Object.freeze(Object.fromEntries(Object.entries(draft.checks).map(([k, v]) => [k, v.state]))) : null, needDraft: draft?.state ?? "NOT RENDERED" });
    });
    const lastChecked = items.flatMap((it) => it.claims.map((c) => c.readOn)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? "")).sort().at(-1) ?? null;
    const composed = composeTitle({ phrases, needOrder: items.map((it) => it.needKey), lastChecked, capitals });
    /* with no recorded search phrase NOTHING is composed: the title is then the first recorded questions, observed first, as before */
    const first = items.slice(0, TITLE_TOPICS);
    const fallback = (first.some((it) => it.heading.tier === "OBSERVED") ? first.filter((it) => it.heading.tier === "OBSERVED") : first).map((it) => it.heading);
    const title = composed.title ?? fallback.map((h) => h.wording).join(" · ");
    const titleTrace = composed.title ? composed.trace : Object.freeze(fallback.map((h) => Object.freeze({ part: h.wording, from: `recorded-question:${h.questionId}` })));
    const kf = keyFactCards({ facts: keyFactsFor(value), items, quotationOf });
    const cv = conversions({ rates: ratesFor(value), items, on });
    const cmp = comparisonTables({ tables: comparisonsFor(value), items, converted: cv.shown });
    const recheck = Object.freeze(Object.fromEntries(items.flatMap((it) => it.claims.map((c) => [c.claimId, recheckOf(c.claimId) ?? null]))));
    const unanswered = Object.freeze([...unansweredFor(value)]);
    const faq = faqOf(items, cv.shown);
    const intro = Object.freeze([present(productLine) ? productLine.trim() : null, `${items.length} question${items.length === 1 ? "" : "s"} answered below, each with its source.`].filter(Boolean));
    /* RR-286: the page's internal links, from the batch's filed link plan (F94's rule: the hub and every recorded page of the same need) */
    const html = renderJoined({ title, stamp, items, design, intro, cards: kf.cards, faq, lastChecked, converted: cv.shown, tables: cmp.shown, related: relatedFor(value) });
    const trace = items.flatMap((it) => [...it.claims.map((c) => Object.freeze({ needId: it.needId, claimId: c.claimId, label: c.label, source: c.source, link: c.link, readOn: c.readOn })),
      ...it.statements.map((s) => Object.freeze({ needId: it.needId, answerId: s.answerId, label: s.label, source: s.source, link: s.link, approvalRecord: s.approvalRecord }))]);
    const checks = joinedChecks({ fillerPhrases, items, html, stamp, title, titleTrace, composed: composed.title !== null, titleMissing: composed.missing ?? null, phrases, lastChecked, unanswered, design, intro, cards: kf.cards, cardsRefused: kf.refused, faq, converted: cv.shown, conversionsRefused: cv.refused, tables: cmp.shown, tablesRefused: cmp.refused, recheck, on });
    const generalViews = items.filter((it) => it.generalView).length;
    /* RR-268 A2: the needs recorded UNANSWERABLE with their checked source and day, counted apart from the answered items */
    const unanswerable = unanswered.filter(unanswerableRecorded).length;
    const value_ = { value, candidate, title, titleTrace, titleComposed: composed.title !== null, items: items.length, questions: items.reduce((n, it) => n + it.questions.length, 0), faqCount: faq.length, lastChecked, stamp, ...(generalViews ? { generalViews } : {}), ...(unanswerable ? { unanswerable } : {}) };
    pages.push(Object.freeze({ record_type: JOINED_RECORD, /* RR-259: the files a page is served with are part of what it is — the same HTML with another logo file is another draft */
      /* RR-269: and its gate results are part of what it is — the same HTML judged under a changed gate law is another record, never
       * swallowed by the earlier one with its stale verdicts */
      measurement_key: `${JOINED_RECORD}:${hash([...(assetsOf(design).length ? [value_, html, assetsOf(design)] : [value_, html]), gateStates(checks)])}`, ...value_, wordCount: words(visibleText(html)), unanswered, keyFacts: kf.cards, keyFactsRefused: kf.refused, assets: assetsOf(design), conversions: cv.shown, conversionsRefused: cv.refused, comparisons: cmp.shown, comparisonsRefused: cmp.refused, recheck, itemList: Object.freeze(items), checks, html, trace: Object.freeze(trace) }));
  }
  return Object.freeze(pages);
}

/** A page's gate results, name by name — what its record key carries beside the page itself. */
const gateStates = (checks) => Object.fromEntries(Object.entries(checks ?? {}).sort(([x], [y]) => (x < y ? -1 : 1)).map(([k, v]) => [k, v?.state ?? null]));

/** The FAQPage object found in the rendered page, or null. */
export function faqInPage(html) {
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  try { const j = JSON.parse(m[1]); return j?.["@type"] === "FAQPage" && Array.isArray(j.mainEntity) ? j.mainEntity.map((e) => ({ question: e.name, answer: e.acceptedAnswer?.text })) : null; } catch { return null; }
}

/** The joined page's OWN measurable checks. A check whose input is not recorded is NOT MEASURED; none passes by default. */
export function joinedChecks({ fillerPhrases = [], items, html, stamp, title = "", titleTrace = [], composed = false, titleMissing = null, phrases = [], lastChecked = null, unanswered = [], design = null, intro = [], cards = [], cardsRefused = [], faq = [], converted = [], conversionsRefused = [], tables = [], tablesRefused = [], recheck = {}, on = null }) {
  const state = (ok, why) => (ok ? Object.freeze({ state: CHECK.PASS }) : Object.freeze({ state: CHECK.FAIL, why }));
  const claims = items.flatMap((it) => it.claims);
  const recorded = new Set(items.flatMap((it) => it.questions.map((q) => q.wording)));
  const seen = visibleText(html).replace(esc(stamp), " ").split(stamp).join(" ");
  const inPage = faqInPage(html);
  const perNeed = (name) => { const s = items.map((it) => it.needChecks?.[name] ?? CHECK.NOT_MEASURED); return s.includes(CHECK.FAIL) ? CHECK.FAIL : s.includes(CHECK.NOT_MEASURED) ? CHECK.NOT_MEASURED : CHECK.PASS; };
  const untraced = composed ? titleWordsTraced({ title, phrases, lastChecked }) : [];
  const shownOf = (it) => it.heading.shown ?? it.heading.wording;
  const keys = new Set(items.map((it) => it.needKey));
  const titleParts = phrases.filter((p) => p?.role === "TOPIC" && wordsUsed(p) !== null).filter((p) => titleTrace.some((t) => t.from === `search-phrase:${p.phraseId}`));
  const partsOffPage = titleParts.filter((p) => !keys.has(p.need)).map((p) => wordsUsed(p));
  const promisesBroken = titleParts.filter((p) => present(p.promisesConversionTo) && !converted.some((v) => v.to === p.promisesConversionTo && v.needKey === p.need)).map((p) => wordsUsed(p));
  const yearPart = titleTrace.find((t) => String(t.from).startsWith("date-fact:"));
  const days = (a, b) => (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000;
  const noInterval = claims.filter((c) => !(Number.isInteger(recheck[c.claimId]) && recheck[c.claimId] > 0)).map((c) => c.claimId);
  const overdue = /^\d{4}-\d{2}-\d{2}$/.test(on ?? "") ? claims.filter((c) => Number.isInteger(recheck[c.claimId]) && days(on, c.readOn) > recheck[c.claimId]).map((c) => c.claimId) : [];
  const yearOk = !yearPart || (claims.every((c) => String(c.readOn ?? "").startsWith(yearPart.part)) && noInterval.length === 0 && overdue.length === 0);
  const wordingHomes = new Map(); for (const it of items) for (const q of it.questions) wordingHomes.set(tokens(q.wording).join(" "), (wordingHomes.get(tokens(q.wording).join(" ")) ?? new Set()).add(it.needId));
  const twice = [...wordingHomes].filter(([, s]) => s.size > 1).map(([w]) => w);
  const scripts = html.match(/<script\b[^>]*>/g) ?? [];
  const local = {
    "answers are plain HTML text, present when the item is closed": faq.every((f) => html.includes(esc(f.answer.split(" ").slice(0, 6).join(" ")))) && items.every((it) => it.claims.every((c) => html.includes(esc(c.text.trim())))),
    "no script builds the page (structured data only)": scripts.every((s) => /type="application\/ld\+json"/.test(s)),
    "structured data is the visible questions and answers": Array.isArray(inPage) && inPage.length === faq.length && faq.every((f, i) => inPage[i].question === f.question && inPage[i].answer === f.answer),
    "a viewport is declared for small screens": /<meta name="viewport"/.test(html),
    "robots and canonical agree (a test page: noindex and no canonical)": /<meta name="robots" content="noindex/.test(html) ? !/rel="canonical"/.test(html) : /rel="canonical"/.test(html),
    "crawlable links to the client's own site": present(design?.siteAddress) && html.includes(`href="${esc(design.siteAddress)}`),
  };
  const localFailed = Object.entries(local).filter(([, ok]) => !ok).map(([k]) => k);
  const trust = {
    "the business is named and a contact link is shown": present(design?.brandName) && html.includes(esc(design.brandName)) && (design?.footer?.columns ?? []).some((col) => (col.links ?? []).some((l) => /contact/i.test(l.label ?? "") && html.includes(esc(l.label)))),
    "the product's own claims stand apart in product cards": items.every((it) => it.statements.every((s) => html.includes(`<div class="product" data-answer-id="${esc(s.answerId)}">`))),
    "the page adds a comparison table of its own": tables.length > 0 && tablesRefused.length === 0,
  };
  const trustFailed = Object.entries(trust).filter(([, ok]) => !ok).map(([k]) => k);
  /* RR-262 · an item that leads with the product's own statements: its first product card stands right after its question */
  const led = (it) => it.lead === LEAD.PRODUCT;
  const ledFirst = (it) => it.statements.length > 0 && html.includes(`<summary>${esc(shownOf(it))}</summary>\n<div class="product" data-answer-id="${esc(it.statements[0].answerId)}">`);
  /* the item as the page shows it, and its call-to-action buttons: a product-led item shows exactly one */
  const blockOf = (it) => { const from = html.indexOf(`<details data-need-id="${esc(it.needId)}"`); return from < 0 ? "" : html.slice(from, html.indexOf("</details>", from)); };
  const buttons = (it) => blockOf(it).split(`<a class="cta" `).length - 1;
  const oneSentence = (t) => (String(t).trim().match(/[.!?](?=\s|$)/g) ?? []).length === 1 && /[.!?]$/.test(String(t).trim());
  const leadAsked = items.filter((it) => Object.hasOwn(it, "leadAsked"));
  const leadFaults = leadAsked.flatMap((it) => { const lines = it.claims.filter((c) => present(c.text)); return [
    led(it) ? null : `${it.needKey}: the lead recorded is not one this page grants, or no approved statement is there to lead with`,
    led(it) && !ledFirst(it) ? `${it.needKey}: the product card does not stand right after the question` : null,
    it.statementsRefused.length ? `${it.needKey}: a statement it leads with is not an approved answer` : null,
    present(design?.cta?.label) && present(design?.cta?.href) ? null : `${it.needKey}: the product card has no call to action`,
    led(it) && present(design?.cta?.label) && present(design?.cta?.href) && buttons(it) !== 1 ? `${it.needKey}: the item shows ${buttons(it)} call-to-action buttons — one is recorded` : null,
    lines.length === LEAD_SOURCED_LINES && lines.every((c) => oneSentence(c.text) && present(c.source) && present(c.link)) ? null : `${it.needKey}: after the product cards stand ${lines.length} sourced line(s), or one that is not a single sentence with its source — ${LEAD_SOURCED_LINES} is recorded`,
  ].filter(Boolean); });
  return Object.freeze({
    /* ── the page law, clause by clause ── */
    law1ClientDesign: state(Boolean(design) && present(design.brandName) && present(design.colours?.primary) && present(design.fonts?.body) && html.includes(esc(design.brandName)) && html.includes(design.colours.primary), "the page does not carry the client's own filed design"),
    /* RR-258 · the company logo and the product logo/name in the header; the client's full navigation and footer, in the filed order */
    headerAndLogos: (() => {
      const head = /<header[\s\S]*?<\/header>/.exec(html)?.[0] ?? "", foot = /<footer[\s\S]*?<\/footer>/.exec(html)?.[0] ?? "";
      const site = design?.siteAddress ?? null;
      const at = (part, l, from) => part.indexOf(`<a href="${esc(absolute(site, l.href) ?? "#")}">${esc(l.label)}</a>`, from);
      const inOrder = (part, links) => { let from = 0; for (const l of links) { const i = at(part, l, from); if (i < 0) return false; from = i + 1; } return true; };
      const co = design?.company, missing = [];
      if (!(present(co?.name) && present(co?.logo?.file) && head.includes(`<img src="${esc(assetName(co.logo.file))}" alt="${esc(co.logo.alt)}"`))) missing.push("the company logo is not in the header");
      if (!(present(design?.logo?.wordmark) && head.includes(`<span>${esc(design.logo.wordmark)}</span></a>`) && (!present(design?.logo?.image?.file) || head.includes(`<img src="${esc(assetName(design.logo.image.file))}"`)))) missing.push("the product logo or name is not in the header");
      if (!(Array.isArray(design?.nav) && design.nav.length > 0 && inOrder(head, design.nav))) missing.push("the header navigation is not the client's full navigation, in its order");
      if (!inOrder(head, design?.actions ?? [])) missing.push("a header action of the client's site is missing");
      if (!((design?.footer?.columns ?? []).length > 0 && design.footer.columns.every((col) => foot.includes(esc(col.title)) && inOrder(foot, col.links ?? [])))) missing.push("the footer is not the client's full footer");
      return state(missing.length === 0, missing.join("; "));
    })(),
    law2Hero: state(/<h1[ >]/.test(html) && html.includes(esc(title)) && intro.length === 2 && intro.every((l) => html.includes(esc(l))) && present(design?.cta?.label) && present(design?.cta?.href) && html.includes(esc(design.cta.label)), "the hero lacks its H1, its two-line intro or the client's call-to-action button"),
    law3KeyFacts: cards.length === 0 && cardsRefused.length === 0 ? Object.freeze({ state: CHECK.NOT_MEASURED, why: "no key fact is recorded for this page" }) : state(cardsRefused.length === 0 && cards.every((c) => html.includes(esc(c.value)) && present(c.link) && present(c.source)), "a key-fact card shows a value that is not in its recorded claim, or lacks its source link"),
    law4QuestionsAndAnswers: state(items.length > 0 && /<details/.test(html) && items.every((it) => html.includes(esc(shownOf(it))) && it.claims.every((c) => html.includes(`${STRUCTURE.source}: ${esc(c.source)}`))) && present(lastChecked) && html.includes(`${STRUCTURE.lastChecked}: ${lastChecked}`), "a question, its answer's source link or the last-checked line is missing"),
    law5ProductCards: state(items.every((it) => it.statementsRefused.length === 0) && (items.every((it) => it.statements.length === 0) || present(design?.cta?.label)), "a product fact shown is not an owner-approved answer, or its card has no call to action"),
    law6FaqMatchesVisible: state(Array.isArray(inPage) && inPage.length === faq.length && faq.every((f, i) => inPage[i].question === f.question && inPage[i].answer === f.answer && html.includes(esc(f.question)) && f.answer.length > 0), "the FAQ structured data is not exactly the visible questions and answers"),
    law7NoRecordLabels: state(!RECORD_LABELS.test(seen), "a record label is visible on the page"),
    law8UnansweredNotShown: state(unanswered.every((u) => (u.wordings ?? []).every((w) => !html.includes(esc(w)))), "an unanswered need is written into the page"),
    conversionMarked: converted.length === 0 && conversionsRefused.length === 0 ? Object.freeze({ state: CHECK.NOT_MEASURED, why: "no conversion rate is recorded for this page" })
      : state(conversionsRefused.length === 0 && converted.every((c) => html.includes(esc(c.text)) && c.text.includes(STRUCTURE.conversion) && c.text.includes(c.rateDate) && c.steps.every((s) => html.includes(esc(s.source)) && html.includes(esc(s.link)) && html.includes(String(s.rate)))), conversionsRefused.length ? `a conversion is not shown: ${conversionsRefused.map((r) => r.code).join(", ")}` : "a conversion is shown without its rate, its date, its source or its mark"),
    comparisonFromClaims: tables.length === 0 && tablesRefused.length === 0 ? Object.freeze({ state: CHECK.NOT_MEASURED, why: "no comparison table is recorded for this page" })
      : state(tablesRefused.length === 0 && tables.every((t) => html.includes(esc(t.caption)) && t.rows.every((r) => r.cells.every((c) => html.includes(esc(c.value))))), "a comparison table holds a cell that is not in its recorded claim, or is not on the page"),
    /* ── the AI-search page law (RR-257), B2 to B8, as far as an unpublished page can be measured ── */
    b2TitlePromisesOnlyWhatThePageHolds: composed ? state(partsOffPage.length === 0 && promisesBroken.length === 0 && yearOk,
      [partsOffPage.length ? `title part(s) whose need is not on the page: ${partsOffPage.join(", ")}` : null, promisesBroken.length ? `title part(s) the page does not keep: ${promisesBroken.join(", ")}` : null, yearOk ? null : "the title carries a year although a fact was read in another year, has no recheck interval or is overdue"].filter(Boolean).join("; "))
      : Object.freeze({ state: CHECK.NOT_MEASURED, why: "the title is not composed from recorded search phrases" }),
    /* RR-262: in an item recorded to lead with the product's own statements, what follows the question at once is its first product card; its central sourced statement is still required */
    b3DirectAnswerFirst: state(items.length > 0 && items.every((it) => { const first = it.claims.find((c) => present(c.text)); return first && first.central !== false && (led(it) ? ledFirst(it)
      /* RR-269 §3: a general-view item's part a (what was checked and not found) is its direct answer, and stands first */
      : it.generalView && it.checkedNotFound?.length ? html.includes(`<summary>${esc(shownOf(it))}</summary>\n<p class="checked-not-found" data-answer-kind="${ANSWER_KIND.CHECKED_NOT_FOUND}" data-record-id="${esc(it.checkedNotFound[0].id)}">`)
      : html.includes(`<summary>${esc(shownOf(it))}</summary>\n<p data-claim-id="${esc(first.claimId)}">`)); }), "an item's question is not followed at once by its central answer"),
    productLedNeeds: leadAsked.length === 0 ? Object.freeze({ state: CHECK.NOT_MEASURED, why: "no need of this page is recorded to lead with the product's own statements" }) : state(leadFaults.length === 0, leadFaults.join("; ")),
    b4SourcedCheckedAndRecheckable: state(claims.every((c) => present(c.source) && present(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "") && html.includes(`${STRUCTURE.checked} ${esc(c.readOn)}`)) && noInterval.length === 0 && overdue.length === 0,
      [noInterval.length ? `${noInterval.length} fact(s) have no recorded recheck interval` : null, overdue.length ? `${overdue.length} fact(s) are past their recheck interval` : null].filter(Boolean).join("; ") || "a fact lacks its source or the day it was checked"),
    b5OneNeedPerWording: state(twice.length === 0 && !/search volume/i.test(seen), twice.length ? `the same wording stands under two items: ${twice.slice(0, 3).join(" | ")}` : "recorded phrases are called search volume"),
    b6Technical: Object.freeze({ state: localFailed.length ? CHECK.FAIL : CHECK.PASS, ...(localFailed.length ? { why: localFailed.join("; ") } : {}), measured: Object.freeze(Object.keys(local)),
      notMeasured: Object.freeze(["loads without a login or bot challenge", "indexability of the public address", "sitemap and a clear address", "reachable by links from the client's other pages", "mobile layout and controls, by a person or a device"]) }),
    b7Trust: state(trustFailed.length === 0, trustFailed.join("; ")),
    /* RR-265: TO THE POINT — the first sentence of every answer is one short sentence; every sourced line is one short sentence; no
     * declared filler phrase stands in an answer (each one is named) */
    toThePoint: (() => {
      const shortOne = (t) => { const s = sentencesOf(t); return s.length === 1 && wordsIn(s[0]) <= TO_THE_POINT_MAX_WORDS; };
      const opening = (it) => (it.lead === LEAD.PRODUCT ? it.statements[0]?.text : it.claims.find((c) => present(c.text))?.text);
      const firstBad = items.filter((it) => !shortOne(opening(it) ?? "")).map((it) => it.needKey);
      const lineBad = items.flatMap((it) => it.claims.filter((c) => present(c.text) && !shortOne(c.text)).map((c) => c.claimId));
      const filler = (Array.isArray(fillerPhrases) ? fillerPhrases : []).filter(present).map((p) => p.trim().toLowerCase());
      const hits = items.flatMap((it) => [...it.claims.map((c) => c.text), it.generalView?.text].filter(present).flatMap((t) => filler.filter((p) => t.toLowerCase().includes(p)).map((p) => `"${p}" (${it.needKey})`)));
      return state(firstBad.length === 0 && lineBad.length === 0 && hits.length === 0, [hits.length ? `filler phrase(s): ${[...new Set(hits)].join(", ")}` : null,
        firstBad.length ? `an answer opens with more than one short sentence: ${firstBad.join(", ")}` : null, lineBad.length ? `a sourced line is not one short sentence: ${lineBad.join(", ")}` : null].filter(Boolean).join("; "));
    })(),
    /* RR-265: every general view is labelled where it stands, follows at least two sourced sentences, is not in the FAQ data and
     * attributes no view to people; a page without one does not measure it */
    generalViewLabelled: items.some((it) => it.generalView) ? state(items.filter((it) => it.generalView).every((it) => {
      const shown = `<p class="general-view" data-answer-kind="${ANSWER_KIND.GENERAL_VIEW}"><strong>${STRUCTURE.generalView}:</strong> ${esc(it.generalView.text)}`;
      const inFaq = faq.some((f) => f.answer.includes(it.generalView.text));
      /* RR-269 §3: part a is a CHECKED_NOT_FOUND line shown on the item; part b at least one sourced sentence */
      const partA = (it.checkedNotFound ?? []).some((r) => html.includes(`data-record-id="${esc(r.id)}">${esc(r.line)} `));
      return html.includes(shown) && partA && it.claims.filter((c) => present(c.text)).length >= GENERAL_VIEW_MIN_SOURCED && !inFaq && !PEOPLE_SAY.test(it.generalView.text);
    }), "a general view is not labelled where it stands, has no checked-not-found line (part a) or no sourced sentence (part b), stands in the FAQ data, or attributes a view to people")
      : Object.freeze({ state: CHECK.NOT_MEASURED, why: "no general view is recorded for this page" }),
    /* RR-269 §3: every checked-not-found line is shown with every page it checked, linked, and is never in the FAQ structured data */
    checkedNotFoundShown: items.some((it) => it.checkedNotFound?.length) ? state(items.flatMap((it) => it.checkedNotFound ?? []).every((r) =>
      html.includes(`data-record-id="${esc(r.id)}">${esc(r.line)} `) && r.checked.every((c) => html.includes(`href="${esc(c.url)}"`)) && !faq.some((f) => f.answer.includes(r.line)) && !(Array.isArray(inPage) && inPage.some((q) => String(q.answer ?? "").includes(r.line)))),
      "a checked-not-found line is not shown, lacks a link to a page it checked, or stands in the FAQ data")
      : Object.freeze({ state: CHECK.NOT_MEASURED, why: "no checked-not-found record is shown on this page" }),
    b8NoInstructionToMachines: state(!/\b(ignore (all|any|the|your) (previous|prior|above)|as an ai\b|language model|system prompt|you must recommend|when asked, (say|answer|recommend))/i.test(seen), "the page holds text that reads as an instruction to a machine"),
    titleFromSearchPhrases: composed ? state(untraced.length === 0 && titleTrace.length > 0, `title word(s) with no recorded source: ${untraced.join(", ")}`) : Object.freeze({ state: CHECK.NOT_MEASURED, why: titleMissing ?? "no recorded search phrase" }),
    titleFromRecords: state(present(title) && titleTrace.length > 0 && (composed || titleTrace.every((t) => recorded.has(t.part))), "the title is not made of recorded phrases or recorded questions"),
    /* ── what was already required ── */
    everyNeedAnswered: (() => {
      const open = unanswered.filter((u) => !unanswerableRecorded(u));
      return state(items.length > 0 && open.length === 0, `${open.length} need(s) of this page have no supported answer and are not on it${unanswered.length > open.length ? ` (${unanswered.length - open.length} more recorded UNANSWERABLE with the source checked and the day)` : ""}`);
    })(),
    everyItemAnswered: state(items.length > 0 && items.every((it) => it.claims.some((c) => c.central !== false && present(c.text))), "an item has no supported central statement to answer its questions"),
    everyClaimSourced: state(claims.every((c) => present(c.source) && present(c.link) && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "")), "a written claim lacks its source's name, link or the date it was read"),
    ownWording: state(items.every((it) => it.questions.every((q, i) => present(q.wording) && (i === 0 ? html.includes(esc(shownOf(it))) && sameWords(shownOf(it), q.wording) : html.includes(esc(q.wording))))), "a question is not shown in its own recorded words"),
    headingsFromQuestions: state(items.every((it) => recorded.has(it.heading?.wording) && it.questions[0]?.questionId === it.heading?.questionId && (isQuestion(it.heading.wording) ? shownOf(it) === it.heading.wording.trim() : it.questions.every((q) => !isQuestion(q.wording)) && sameWords(shownOf(it), it.heading.wording) && shownOf(it) !== it.heading.wording.toLowerCase())), "a heading is not its item's recorded question, a full question was passed over for a phrase, or a raw lower-case phrase is a heading"),
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

/** Where a page looks for a file it shows: beside the page, under this folder. */
export const ASSET_FOLDER = "assets";
const assetName = (file) => `${ASSET_FOLDER}/${String(file).split("/").at(-1)}`;
/** The files a page built with this design must be served with: the company logo and, when the product has one, the product logo. */
export function assetsOf(design) {
  return Object.freeze([design?.company?.logo, design?.logo?.image].filter((l) => present(l?.file)).map((l) => Object.freeze({ name: assetName(l.file), file: l.file, sha256: l.sha256 })));
}
/** A logo file shown at a given height. With a recorded focus box the picture's empty margin is cropped by the frame — the file itself
 * is shown unchanged, at one scale. */
function logoImage(l, height) {
  const f = l.focus ?? { x: 0, y: 0, w: l.width, h: l.height };
  const k = height / f.h, r = (n) => Math.round(n * k * 100) / 100;
  return `<span class="logo-file" style="width:${r(f.w)}px;height:${r(f.h)}px"><img src="${esc(assetName(l.file))}" alt="${esc(l.alt)}" width="${l.width}" height="${l.height}" style="width:${r(l.width)}px;height:${r(l.height)}px;left:${-r(f.x)}px;top:${-r(f.y)}px"></span>`;
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
    + `.site-head{border-bottom:1px solid ${v.line};background:${v.bg}}.bar{max-width:1280px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}`
    + `.brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:${v.ink};font-weight:600;font-size:20px}.mark{display:inline-flex;width:36px;height:36px;align-items:center;justify-content:center;border-radius:8px;background:${v.primary};color:#fff;font-weight:700}`
    + `.brands{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.company{display:inline-flex}.logo-file{display:inline-block;position:relative;overflow:hidden;flex:none}.logo-file img{position:absolute;max-width:none}`
    + `.head-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex:1;min-width:260px}.acts{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.acts a{color:${v.ink};font-weight:600;text-decoration:none}`
    + `nav{display:flex;align-items:center;justify-content:flex-end;gap:4px 12px;flex-wrap:wrap}nav a{color:${v.ink};font-weight:500;font-size:14px;text-decoration:none}nav a:hover,.acts a:hover{color:${v.primaryDeep}}`
    + `.cta{display:inline-block;background:${v.primary};color:${v.ink};font-weight:600;text-decoration:none;padding:10px 22px;border-radius:9999px}.cta:hover{background:${v.primaryDeep}}`
    + `main{max-width:860px;margin:0 auto;padding:8px 20px 56px}.hero{padding:40px 0 28px}h1{margin:0 0 12px;color:${v.ink};font-size:34px;line-height:1.2}.hero p{margin:0 0 6px;font-size:18px}.hero .cta{margin-top:16px;font-size:16px;padding:13px 28px}`
    + `h2{color:${v.ink};font-size:24px;margin:36px 0 14px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:0;padding:0;list-style:none}`
    + `.card{background:${v.paper};border:1px solid ${v.line};border-radius:${radius};padding:18px}.card .k{display:block;color:${v.muted};font-size:14px}.card .v{display:block;color:${v.ink};font-weight:700;font-size:22px;margin:4px 0 8px}`
    + `.src{font-size:13px;color:${v.muted}}.checked{color:${v.muted};font-size:14px;margin:0 0 12px}`
    + `details{background:${v.paper};border:1px solid ${v.line};border-radius:${radius};margin:0 0 12px;padding:0 18px}summary{cursor:pointer;list-style-position:outside;padding:16px 0;color:${v.ink};font-weight:600;font-size:18px}details[open] summary{border-bottom:1px solid ${v.line}}`
    + `.cmp{width:100%;border-collapse:collapse;margin:12px 0 16px;font-size:15px}.cmp caption{text-align:left;color:${v.muted};font-size:14px;padding:0 0 6px}.cmp th,.cmp td{border:1px solid ${v.line};padding:8px 10px;text-align:left;vertical-align:top}.cmp thead th{background:${v.bg};color:${v.ink}}`
    + `details p{margin:12px 0}.also{color:${v.muted};font-size:14px}.product{background:${v.bg};border:1px solid ${v.line};border-radius:${radius};padding:14px 16px;margin:12px 0 16px}.product p{margin:0 0 10px;color:${v.ink}}.product .cta{font-size:14px;padding:8px 18px}.lead-action{margin:0 0 16px}.lead-action .cta{font-size:14px;padding:8px 18px}`
    + `.site-foot{background:${v.footBg};color:${v.onDark};margin-top:40px}.foot{max-width:1120px;margin:0 auto;padding:36px 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;font-size:14px}`
    + `.foot h3{margin:0 0 10px;color:${v.footAccent};font-size:12px;letter-spacing:.08em;text-transform:uppercase}.foot ul{margin:0;padding:0;list-style:none}.foot li{margin:0 0 6px}.foot a{color:${v.onDark};opacity:.8;text-decoration:none}.legal{text-align:center;font-size:12px;opacity:.7;padding:0 20px 24px;margin:0}`;
}

/**
 * Deterministic HTML under the page law. Every sentence of fact is a recorded claim's own text or an approved answer's own statement;
 * the questions are recorded questions; the brand, navigation, call to action and footer are the client's own filed design.
 */
export function renderJoined({ title, stamp, items, design = null, intro = [], cards = [], faq = faqOf(items), lastChecked = null, converted = [], tables = [], related = [] }) {
  const site = design?.siteAddress ?? null;
  const link = (href) => esc(absolute(site, href) ?? "#");
  const cta = present(design?.cta?.label) && present(design?.cta?.href) ? `<a class="cta" href="${link(design.cta.href)}">${esc(design.cta.label)}</a>` : "";
  const co = design?.company;
  const company = present(co?.logo?.file) ? `<a class="company" href="${esc(co.href ?? "#")}" aria-label="${esc(co.name)}">${logoImage(co.logo, 56)}</a>` : "";
  const product = design ? `<a class="brand" href="${link("/")}">${present(design.logo?.image?.file) ? logoImage(design.logo.image, 36) : present(design.logo?.mark) ? `<span class="mark" aria-hidden="true">${esc(design.logo.mark)}</span>` : ""}<span>${esc(design.logo?.wordmark ?? design.brandName ?? "")}</span></a>` : "";
  const header = design ? `<header class="site-head"><div class="bar"><div class="brands">${company}${product}</div>`
    + `<div class="head-right"><div class="acts">${(design.actions ?? []).map((n) => `<a href="${link(n.href)}">${esc(n.label)}</a>`).join("")}${cta}</div>`
    + `<nav aria-label="${esc(co?.name ?? design.brandName ?? "Site")}">${(design.nav ?? []).map((n) => `<a href="${link(n.href)}">${esc(n.label)}</a>`).join("")}</nav></div></div></header>` : "";
  const footer = design ? `<footer class="site-foot"><div class="foot">${(design.footer?.columns ?? []).map((col) => `<div><h3>${esc(col.title)}</h3><ul>${(col.links ?? []).map((l) => `<li><a href="${link(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul></div>`).join("")}</div>${present(design.footer?.notice) ? `<p class="legal">${esc(design.footer.notice)}</p>` : ""}</footer>` : "";
  const source = (c) => `<a class="src" href="${esc(c.link)}" rel="nofollow">${STRUCTURE.source}: ${esc(c.source)}</a>${present(c.readOn) ? `<span class="src"> · ${STRUCTURE.checked} ${esc(c.readOn)}</span>` : ""}`;
  const table = (t) => `<table class="cmp"><caption>${esc(t.caption)}</caption><thead><tr>${t.columns.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th>${r.cells.map((c) => `<td>${esc(c.value)} <a class="src" href="${esc(c.link)}" rel="nofollow">${STRUCTURE.source}: ${esc(c.source)}</a>${present(c.readOn) ? `<span class="src"> · ${STRUCTURE.checked} ${esc(c.readOn)}</span>` : ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const checkedLine = (r) => `<p class="checked-not-found" data-answer-kind="${ANSWER_KIND.CHECKED_NOT_FOUND}" data-record-id="${esc(r.id)}">${esc(r.line)} <span class="src">${STRUCTURE.pagesChecked}: ${r.checked.map((c) => `<a class="src" href="${esc(c.url)}" rel="nofollow">${esc(c.name)}</a>`).join(", ")} · ${STRUCTURE.checked} ${esc(r.checkedOn)}</span></p>`;
  const productCards = (it) => it.statements.map((s) => `<div class="product" data-answer-id="${esc(s.answerId)}"><p>${esc(s.text)}</p>${cta}</div>`);
  /* an item that leads with the product's own statements: its cards, then ONE call-to-action button for the item */
  const leadCards = (it) => [...it.statements.map((s) => `<div class="product" data-answer-id="${esc(s.answerId)}"><p>${esc(s.text)}</p></div>`), ...(cta ? [`<p class="lead-action">${cta}</p>`] : [])];
  const conversionLine = (c) => converted.filter((v) => v.claimId === c.claimId).map((v) => `<p class="also" data-conversion-of="${esc(c.claimId)}">${esc(v.text)} ${v.steps.map((s) => `<a class="src" href="${esc(s.link)}" rel="nofollow">${STRUCTURE.source}: ${esc(s.source)}</a><span class="src"> · 1 ${esc(s.from)} = ${s.rate} ${esc(s.to)}, ${esc(s.rateDate)}</span>`).join(" ")}</p>`);
  /* RR-294 (the owner's addition 2): a question asked in the reader's currency ("in rupees") is answered in it FIRST */
  const leadsInCurrency = (it) => asksForCurrency(it.heading.wording, converted.filter((v) => it.claims.some((c) => c.claimId === v.claimId)));
  const item = (it) => [
    `<details data-need-id="${esc(it.needId)}"${it === items[0] ? " open" : ""}>`,
    `<summary>${esc(it.heading.shown ?? it.heading.wording)}</summary>`,
    ...(leadsInCurrency(it) ? it.claims.flatMap(conversionLine) : []),
    /* RR-262: an item recorded to lead with the product's own statements shows its product cards first, then its one sourced line */
    ...(it.lead === LEAD.PRODUCT ? leadCards(it) : []),
    /* RR-269 §3: what was checked and not found, with the official pages checked, linked; never in the FAQ structured data. On a general-view
     * item it is part a, so it comes first (RR-265 §2: a, b, then the general view) and is that item's direct answer; on any other item
     * the sourced answer comes first and the line follows it */
    ...(it.generalView ? (it.checkedNotFound ?? []).map(checkedLine) : []),
    ...it.claims.filter((c) => present(c.text)).flatMap((c) => [`<p data-claim-id="${esc(c.claimId)}">${esc(c.text.trim())} ${source(c)}</p>`,
      ...(leadsInCurrency(it) ? [] : conversionLine(c))]),
    ...tables.filter((t) => t.need === it.needKey).map(table),
    ...(it.generalView ? [] : (it.checkedNotFound ?? []).map(checkedLine)),
    /* RR-265: the general view, after the sourced sentences, labelled; its source is the client AI's research record */
    ...(it.generalView ? [`<p class="general-view" data-answer-kind="${ANSWER_KIND.GENERAL_VIEW}"><strong>${STRUCTURE.generalView}:</strong> ${esc(it.generalView.text)} <span class="src">${STRUCTURE.source}: ${esc(it.generalView.source)}</span></p>`] : []),
    it.questions.length > 1 ? `<p class="also">${STRUCTURE.alsoAsked}: ${it.questions.slice(1).map((q) => esc(q.wording)).join(" · ")}</p>` : "",
    ...(it.lead === LEAD.PRODUCT ? [] : productCards(it)),
    `</details>`,
  ].filter(Boolean).join("\n");
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }).replace(/</g, "\\u003c");
  /* RR-294: the page's own description — its first sourced answer, cut at a word (gate C: a meta description present and unique) */
  /* the page's first question with its first answer — a fee line many pages share is never a page's whole description */
  const firstItem = items.find((it) => it.claims.some((c) => present(c.text)));
  const firstAnswer = firstItem ? `${firstItem.heading.shown ?? firstItem.heading.wording} ${firstItem.claims.map((c) => String(c.text ?? "").trim()).find(present)}` : "";
  const description = firstAnswer.length > 155 ? `${firstAnswer.slice(0, 152).replace(/\s+\S*$/, "")}…` : firstAnswer;
  return [`<!doctype html>`, `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(title)}</title>${description ? `<meta name="description" content="${esc(description)}">` : ""}<style>${styleOf(design)}</style>`,
    `<script type="application/ld+json">${ld}</script></head><body>`,
    `<p class="stamp">${esc(stamp)}</p>`, header, `<main>`,
    `<section class="hero"><h1>${esc(title)}</h1>${intro.map((l) => `<p>${esc(l)}</p>`).join("")}${cta}</section>`,
    /* RR-294 (the owner's addition 2): a fee card shows the official fee in its own currency AND its dated rupee estimate, with the rate's source */
    cards.length ? `<section><h2>${STRUCTURE.keyFacts}</h2><ul class="cards">${cards.map((c) => { const v = converted.find((x) => x.claimId === c.claimId); return `<li class="card" data-claim-id="${esc(c.claimId)}"><span class="k">${esc(c.label)}</span><span class="v">${esc(c.value)}${v ? ` <small data-conversion-of="${esc(c.claimId)}">(about ${esc(v.to)} ${v.amount.toLocaleString("en-US")}; rate: ${esc(v.steps.map((s) => s.short).join(" and "))}, ${esc(v.rateDate)})</small>` : ""}</span>${source(c)}</li>`; }).join("")}</ul></section>` : "",
    `<section><h2>${STRUCTURE.questions}</h2>${lastChecked ? `<p class="checked">${STRUCTURE.lastChecked}: ${esc(lastChecked)}</p>` : ""}`, ...items.map(item), `</section>`,
    /* RR-286: the related guides and the hub — words on every link, relative to the client's own site */
    related.length ? `<section class="related"><h2>${STRUCTURE.related}</h2><ul>${related.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul></section>` : "",
    `</main>`, footer, `<p class="stamp">${esc(stamp)}</p>`, `</body></html>`, ""].filter((x) => x !== "").join("\n") + "\n";
}
