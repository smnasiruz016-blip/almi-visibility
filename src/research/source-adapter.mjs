/**
 * F16 · THE SOURCE-ADAPTER BOUNDARY — one shape any source plugs into; no source is named here (RR-118; F16 acceptance _handoffs 944f769;
 * eligibility record 2a4ef7d).
 *
 *   ADMISSION   a source is admitted only when its DURABLE-STORAGE right, its ATTRIBUTION terms and its LICENCE (with version) are each
 *               declared VERIFIED_FROM_PRIMARY_SOURCE with a citation. Anything NOT_VERIFIED_BY_US refuses the whole source — nothing it
 *               returns may be kept.
 *   TWO KINDS   QUESTION_SOURCE items are questions people wrote → `public_question` records (kind OBSERVED); KEYWORD_SOURCE items are
 *               generated keyword ideas → `keyword_signal` records, a SEPARATE type with its own evidence state. They never merge and never
 *               total together; a keyword idea is never reported as a question someone asked.
 *   EVERY ITEM  carries the original wording, the source URL, the post version, the licence and its version, the attribution required, the
 *               observed time, the topic, the country and language (or NOT MEASURED, stated) and the coverage limits of the retrieval. A
 *               missing field REFUSES the item — never a default, never blank.
 *   SNIPPETS    a search-result snippet is not the author's own wording: an item whose wording came from a snippet is refused as a
 *               question, and the refusal says so.
 *   EMPTY       a retrieval with no items is an honest EMPTY sample (0 of 0, measured) — never invented demand, never padded; no retrieval at
 *               all is NOT MEASURED. Every output is a SAMPLE with its limits.
 * Pure: a declaration and a retrieval in, records and refusals out. It fetches nothing; an adapter that fetches is built only for a source
 * this boundary admits.
 */
import { createHash } from "node:crypto";
import { RECORD_TYPE, NOT_MEASURED } from "./public-questions.mjs";

export const SOURCE_KINDS = Object.freeze({ QUESTION_SOURCE: "QUESTION_SOURCE", KEYWORD_SOURCE: "KEYWORD_SOURCE" });
export const VERIFIED = "VERIFIED_FROM_PRIMARY_SOURCE";
export const NOT_VERIFIED = "NOT_VERIFIED_BY_US";
export const ADMISSION_TERMS = Object.freeze(["storage", "attribution", "licence"]);
export const KEYWORD_SIGNAL = "keyword_signal";
const QUESTION_FIELDS = Object.freeze(["wording", "wordingOrigin", "sourceUrl", "postVersion", "licenceName", "licenceVersion", "attribution", "observedAt", "country", "language"]);
const KEYWORD_FIELDS = Object.freeze(["idea", "licenceName", "licenceVersion", "attribution", "observedAt", "country", "language"]);
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const present = (v) => typeof v === "string" && v.trim() !== "";
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 32);

/** ADMISSION: every term the store depends on, VERIFIED from its primary source with a citation — or the source is refused. */
export function admitSource(decl) {
  const refusals = [];
  if (!present(decl?.sourceId)) refusals.push("SOURCE_ID_ABSENT");
  if (!Object.hasOwn(SOURCE_KINDS, decl?.kind)) refusals.push("SOURCE_KIND_UNKNOWN");
  for (const t of ADMISSION_TERMS) {
    const term = decl?.terms?.[t];
    if (term?.status !== VERIFIED) refusals.push(`${t.toUpperCase()}_TERM_NOT_VERIFIED`);
    else if (!present(term.citation)) refusals.push(`${t.toUpperCase()}_TERM_HAS_NO_CITATION`);
  }
  return refusals.length ? { admitted: false, refusals } : { admitted: true, refusals: [] };
}

/** One retrieval → records of its declared kind, or refusals; a retrieval that never happened is NOT MEASURED, an empty one is EMPTY. */
export function recordsFrom(decl, retrieval, { subject, origin, dataPurpose = null }) {
  const admission = admitSource(decl);
  if (!admission.admitted) return { admitted: false, refusals: admission.refusals, retrieved: NOT_MEASURED, records: [], refused: {} };
  if (!retrieval || !Array.isArray(retrieval.items)) return { admitted: true, refusals: [], retrieved: NOT_MEASURED, records: [], refused: {} };
  const head = [];
  if (!present(retrieval.topic)) head.push("TOPIC_ABSENT");
  if (!present(retrieval.coverageLimits)) head.push("COVERAGE_LIMITS_ABSENT");
  if (!present(origin)) head.push("SUBJECT_HAS_NO_DECLARED_SITE_ORIGIN");
  if (head.length) return { admitted: true, refusals: head, retrieved: retrieval.items.length, records: [], refused: Object.fromEntries(head.map((h) => [h, retrieval.items.length])) };
  const question = decl.kind === SOURCE_KINDS.QUESTION_SOURCE;
  const records = [], refused = {};
  const refuse = (why) => { refused[why] = (refused[why] ?? 0) + 1; };
  for (const item of retrieval.items) {
    const missing = (question ? QUESTION_FIELDS : KEYWORD_FIELDS).filter((f) => !present(item?.[f]));
    if (missing.length) { refuse(`${missing[0].toUpperCase()}_ABSENT`); continue; }
    if (!ISO_TIME.test(item.observedAt)) { refuse("OBSERVEDAT_NOT_A_TIME"); continue; }
    const shared = { subject, origin, sourceId: decl.sourceId, topic: retrieval.topic, country: item.country, language: item.language,
      limits: retrieval.coverageLimits, licence: Object.freeze({ name: item.licenceName, version: item.licenceVersion }), attribution: item.attribution, dataPurpose };
    if (question) {
      if (item.wordingOrigin !== "SOURCE_TEXT") { refuse("SNIPPET_IS_NOT_THE_AUTHORS_WORDING"); continue; }
      const id = hash([subject, decl.sourceId, item.sourceUrl, item.postVersion]);
      records.push(Object.freeze({ record_type: RECORD_TYPE, question_id: id, measurement_key: `${RECORD_TYPE}:${id}`, recorded_at: item.observedAt,
        value: Object.freeze({ ...shared, kind: "OBSERVED", original: item.wording, reference: item.sourceUrl, postVersion: item.postVersion,
          provenance: Object.freeze({ seenBy: "A SOURCE ADAPTER — the text as the source holds it", sourceId: decl.sourceId, engineObserved: true }),
          source: decl.sourceId, surface: "source adapter", timeWindow: Object.freeze({ from: item.observedAt, to: item.observedAt }), method: `source-adapter:${decl.sourceId}` }) }));
    } else {
      const id = hash([subject, decl.sourceId, item.idea, item.observedAt]);
      records.push(Object.freeze({ record_type: KEYWORD_SIGNAL, signal_id: id, measurement_key: `${KEYWORD_SIGNAL}:${id}`, recorded_at: item.observedAt,
        value: Object.freeze({ ...shared, idea: item.idea, note: "a generated keyword idea — never a question someone asked" }) }));
    }
  }
  return { admitted: true, refusals: [], retrieved: retrieval.items.length, records, refused };
}

/** Every output is a SAMPLE with its limits; an empty retrieval says EMPTY (0 of 0, measured); no retrieval says NOT MEASURED. */
export function sampleLines(decl, r) {
  const q = r.records.filter((x) => x.record_type === RECORD_TYPE).length;
  const k = r.records.filter((x) => x.record_type === KEYWORD_SIGNAL).length;
  const lines = [`SAMPLE — not a census of the world's questions · declared limits: one retrieval from one admitted source, its coverage limits stored with each record`];
  if (!r.admitted) return [...lines, `source REFUSED — ${r.refusals.join(" · ")} — nothing it returns may be kept`];
  if (r.retrieved === NOT_MEASURED) return [...lines, "retrieved: NOT MEASURED — no retrieval was supplied"];
  if (r.retrieved === 0) return [...lines, "EMPTY SAMPLE — 0 of 0 item(s) retrieved: no question is invented, no keyword idea stands in, nothing is padded from another topic"];
  return [...lines,
    decl.kind === SOURCE_KINDS.QUESTION_SOURCE ? `questions people wrote: kept ${q} of ${r.retrieved} retrieved` : `keyword signals (generated ideas, never questions): kept ${k} of ${r.retrieved} retrieved`,
    `refusals by rule: ${Object.entries(r.refused).map(([w, n]) => `${w} ${n}`).join(" · ") || "none"}`];
}
