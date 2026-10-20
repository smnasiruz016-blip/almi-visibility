/**
 * 🔴 F54 · ANSWER-READINESS AUDIT (acceptance _handoffs 4b5b01c, AlmiVisibility_F54_ACCEPTANCE_2026-10-17.md, RR-283 item 2).
 *
 * Can a search engine or an AI assistant read a clear answer from a built page? Five SEPARATE checks per page, each PASS / FAIL /
 * NOT_MEASURED with its reason — never one merged score:
 *
 *   CLARITY             every answer line is one sentence, to the point, with no internal record label — the page laws the engine
 *                       already applies to every built answer line (src/page/joined-page.mjs: sentencesOf,
 *                       RECORD_LABELS); no new rule is made here
 *   EXTRACTABILITY      the page's FAQ structured data parses (the engine's own reader, faqInPage), every entry holds a question and an
 *                       answer, and every answer line holds its words in the page's own HTML text
 *   PROVENANCE          every fact — an answer line, a key-fact card, a comparison-table cell — shows its source link and its checked date
 *   ENTITY CONSISTENCY  the same body or product is named the same way on the page and in its structured data: each FAQ entry is word for
 *                       word a visible question and its visible sourced answer lines (the FAQ's own content, faqOf), and every acronym the
 *                       structured data names is on the page
 *   DIRECT ANSWER       each question's answer starts right after it, in plain text; a FAIL names the question
 *
 * Pure: the page's HTML in, the five results out. No fetch, no write, no clock. It reads the engine's own page markup (the renderer of
 * src/page/joined-page.mjs) and names no product, client or host. Nothing here claims ranking or citation by any AI engine.
 */
import { RECORD_LABELS, sentencesOf, faqInPage } from "./joined-page.mjs";

export const READINESS = Object.freeze({ PASS: "PASS", FAIL: "FAIL", NOT_MEASURED: "NOT_MEASURED" });
export const READINESS_CHECKS = Object.freeze(["clarity", "extractability", "provenance", "entityConsistency", "directAnswer"]);
export const READINESS_LIMIT = "an answer-readiness audit of the page as built — not a claim about ranking or about being cited by any AI engine";

const decode = (s) => String(s ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const textOf = (h) => decode(String(h ?? "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const SOURCE_LINK = /<a class="src" href="(https?:\/\/[^"\s]+)"[^>]*>(?:Source: )?[^<]+<\/a>/;
const CHECKED_DATE = /· checked (\d{4}-\d{2}-\d{2})\b/;
/** An answer line's own words: its text without the source link and source note the page shows beside it. */
const answerTextOf = (inner) => textOf(String(inner).replace(/<a class="src"[\s\S]*?<\/a>/g, "").replace(/<span class="src">[\s\S]*?<\/span>/g, ""));
const result = (failures, { none = null, total = 0, what = "" } = {}) => none
  ? Object.freeze({ state: READINESS.NOT_MEASURED, why: none })
  : failures.length
    ? Object.freeze({ state: READINESS.FAIL, why: `${failures.length} of ${total} ${what} fail`, failures: Object.freeze(failures) })
    : Object.freeze({ state: READINESS.PASS, measured: total, what });

/** The page's facts: every answer line and key-fact card that carries a claim, and every comparison-table cell. */
export function factsOf(html) {
  const out = [];
  for (const m of String(html).matchAll(/<(p|li)\b[^>]*\bdata-claim-id="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) out.push(Object.freeze({ kind: m[1] === "p" ? "answer line" : "key-fact card", id: m[2], inner: m[3] }));
  for (const t of String(html).matchAll(/<table class="cmp">([\s\S]*?)<\/table>/g)) {
    const caption = textOf(/<caption>([\s\S]*?)<\/caption>/.exec(t[1])?.[1] ?? "");
    for (const r of t[1].matchAll(/<tr><th scope="row">([\s\S]*?)<\/th>([\s\S]*?)<\/tr>/g)) {
      for (const [i, c] of [...r[2].matchAll(/<td>([\s\S]*?)<\/td>/g)].entries()) out.push(Object.freeze({ kind: "table cell", id: `${caption} · ${textOf(r[1])} · column ${i + 1}`, inner: c[1] }));
    }
  }
  return out;
}

/** The page's questions: each answer item, its question as shown, and everything after the question inside the item. */
export function questionsOf(html) {
  return [...String(html).matchAll(/<details\b[^>]*>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map((m) => Object.freeze({ question: textOf(m[1]), after: m[2] }));
}

/** CLARITY — the engine's own page laws on every answer line: one sentence, no record label (RR-302: never a word count). */
export function clarityCheck(html) {
  const lines = factsOf(html).filter((f) => f.kind === "answer line").map((f) => ({ id: f.id, text: answerTextOf(f.inner) }));
  const failures = lines.flatMap(({ id, text }) => {
    const why = [];
    if (!(sentencesOf(text).length === 1 && /[.!?]$/.test(text))) why.push(`not one sentence (${sentencesOf(text).length})`);
    if (RECORD_LABELS.test(text)) why.push("an internal record label is shown");
    return why.length ? [`${id}: ${why.join("; ")}`] : [];
  });
  return result(failures, { none: lines.length ? null : "no answer line is on the page", total: lines.length, what: "answer line(s)" });
}

/** EXTRACTABILITY — the structured data parses by the engine's own reader; every entry and every answer line holds its words in the HTML. */
export function extractabilityCheck(html) {
  const faq = faqInPage(html);
  const lines = factsOf(html).filter((f) => f.kind === "answer line");
  if (faq === null) return Object.freeze({ state: READINESS.FAIL, why: "the page holds no FAQ structured data its reader can parse", failures: Object.freeze(["no parseable FAQ structured data"]) });
  const failures = [
    ...(faq.length ? [] : ["the FAQ structured data holds no entry"]),
    ...faq.flatMap((e, i) => (String(e.question ?? "").trim() && String(e.answer ?? "").trim() ? [] : [`structured-data entry ${i + 1}: no question or no answer text`])),
    ...lines.flatMap((f) => (answerTextOf(f.inner) ? [] : [`${f.id}: the answer line holds no words in the page's HTML`])),
  ];
  return result(failures, { total: faq.length + lines.length, what: "structured-data entr(ies) and answer line(s)" });
}

/** PROVENANCE — every fact shows its source link and its checked date. */
export function provenanceCheck(html) {
  const facts = factsOf(html);
  const failures = facts.flatMap((f) => {
    const missing = [SOURCE_LINK.test(f.inner) ? null : "source link", CHECKED_DATE.test(f.inner) ? null : "checked date"].filter(Boolean);
    return missing.length ? [`${f.kind} ${f.id}: no ${missing.join(" and no ")}`] : [];
  });
  return result(failures, { none: facts.length ? null : "no fact is on the page", total: facts.length, what: "fact(s)" });
}

/** ENTITY CONSISTENCY — each structured-data entry is word for word a visible question and its visible answer; every acronym it names is on the page. */
export function entityConsistencyCheck(html) {
  const faq = faqInPage(html);
  if (!faq || faq.length === 0) return Object.freeze({ state: READINESS.NOT_MEASURED, why: "no FAQ structured data to compare with the page" });
  const visible = new Map(questionsOf(html).map((q) => [q.question, [...q.after.matchAll(/<p\b[^>]*\bdata-claim-id="[^"]+"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => answerTextOf(m[1])).filter(Boolean).join(" ")]));
  const page = textOf(String(html).replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " "));
  const failures = [];
  for (const e of faq) {
    const q = textOf(e.question), a = textOf(e.answer);
    if (!visible.has(q)) { failures.push(`"${q}": the structured data names a question the page does not show`); continue; }
    if (visible.get(q) !== a) failures.push(`"${q}": the structured data's answer is not the page's answer, word for word`);
    for (const ac of new Set(`${q} ${a}`.match(/\b[A-Z][A-Z0-9@]{1,7}\b/g) ?? [])) if (!new RegExp(`\\b${ac}\\b`).test(page)) failures.push(`"${q}": the structured data names ${ac}, the page never does`);
  }
  return result(failures, { total: faq.length, what: "structured-data entr(ies)" });
}

/** DIRECT ANSWER — the first thing after each question is its answer, in plain text: a paragraph with words (a product card's own
 * paragraph counts), never a table, a list, a bare link or nothing. */
export function directAnswerCheck(html) {
  const qs = questionsOf(html);
  const failures = qs.flatMap(({ question, after }) => {
    const first = /^\s*<(p|div)\b([^>]*)>([\s\S]*?)<\/\1>/.exec(after);
    if (!first) return [`"${question}": nothing in plain text stands right after the question`];
    const inner = first[1] === "div" ? (/^<p>([\s\S]*?)<\/p>$/.exec(first[3].trim())?.[1] ?? null) : first[3];
    if (inner === null || /<(table|ul|ol|div|details)\b/.test(inner) || !answerTextOf(inner)) return [`"${question}": the answer does not start right after the question in plain text`];
    if (/\bclass="(also|general-view)"/.test(first[2])) return [`"${question}": the first line after the question is not its answer`];
    return [];
  });
  return result(failures, { none: qs.length ? null : "no question is on the page", total: qs.length, what: "question(s)" });
}

const CHECK_OF = Object.freeze({ clarity: clarityCheck, extractability: extractabilityCheck, provenance: provenanceCheck, entityConsistency: entityConsistencyCheck, directAnswer: directAnswerCheck });

/** One page: its five results, each its own. */
export function auditPage(html) {
  return Object.freeze(Object.fromEntries(READINESS_CHECKS.map((k) => [k, CHECK_OF[k](html)])));
}

/** Many pages: each page's five results, and each check's own count of PASS / FAIL / NOT_MEASURED — five counts, never one. */
export function auditPages(pages) {
  const rows = pages.map((p) => Object.freeze({ page: p.page, results: auditPage(p.html) }));
  const counts = Object.freeze(Object.fromEntries(READINESS_CHECKS.map((k) => [k, Object.freeze(Object.fromEntries(Object.values(READINESS).map((s) => [s, rows.filter((r) => r.results[k].state === s).length])))])));
  const facts = pages.reduce((n, p) => n + factsOf(p.html).length, 0);
  const sourcedAndDated = pages.reduce((n, p) => n + factsOf(p.html).filter((f) => SOURCE_LINK.test(f.inner) && CHECKED_DATE.test(f.inner)).length, 0);
  return Object.freeze({ pages: rows.length, rows: Object.freeze(rows), counts, facts, sourcedAndDated, limit: READINESS_LIMIT });
}
