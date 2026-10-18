/**
 * 🔴 F50 · PROMPT AND ANSWER-QUESTION LIBRARY (acceptance _handoffs AlmiVisibility_F50_ACCEPTANCE_2026-10-18.md, RR-284; capability
 * records by beta-g decision C).
 *
 * One entry per merged question — a need of a page as drafted, whose wordings the research agent judged the same need — holding two
 * SEPARATE determinations:
 *
 *   C1 ORIGINAL WORDING   every wording the need merges, each read back from its own stored record, word for word, with its source and
 *                         date; a wording whose record is missing or has no source or date is named, never dropped or rewritten
 *   C2 EVIDENCE ANSWER    the claims the page answers it with, each with its source link and read date — or DATA GAP by name
 *   C3 PRODUCT COVERAGE   ADDRESSES / PARTIALLY (both parts named) / DOES NOT ADDRESS / UNKNOWN, from a recorded judgement that names only
 *                         VERIFIED capability records: each a sentence of the product's own page found word for word in the engine's
 *                         stored read of that page, with the read's own sha256 (SELF-SOURCED, never third-party evidence). A judgement
 *                         resting on anything else is UNKNOWN, with its reason. Never merged into the answer.
 *   C4 GAPS NEVER FILLED  every DOES NOT ADDRESS entry is on the gap list; a page answer that speaks for the product on it is named
 *   C5 VERSIONED          a version id over the whole library; a change gives a new version record beside the old one, never over it
 *   C6 INTENT, LOCALE, STAGE  each recorded, or NOT RECORDED by name
 *
 * Pure: records in, the library out. The verbatim test is handed in by the caller (`contains`). Names no product, tenant or host.
 */
import { createHash } from "node:crypto";

export const COVERAGE = Object.freeze({ ADDRESSES: "ADDRESSES", PARTIALLY: "PARTIALLY", DOES_NOT_ADDRESS: "DOES NOT ADDRESS", UNKNOWN: "UNKNOWN" });
export const ANSWER = Object.freeze({ ANSWERED: "ANSWERED", DATA_GAP: "DATA GAP" });
export const NOT_RECORDED = "NOT RECORDED";
export const CAPABILITY_REFUSAL = Object.freeze({ NO_READ: "NO_STORED_READ_OF_ITS_PAGE", OTHER_READ: "STORED_READ_IS_ANOTHER_READ", NOT_VERBATIM: "NOT_FOUND_WORD_FOR_WORD", NO_DATE: "NO_READ_DATE" });
export const COVERAGE_WHY = Object.freeze({ NOT_JUDGED: "NO_RECORDED_JUDGEMENT", UNVERIFIED: "A_NAMED_CAPABILITY_IS_NOT_VERIFIED", NO_PARTS: "PARTIALLY_WITHOUT_BOTH_PARTS", NOT_AGAINST_ALL: "DOES_NOT_ADDRESS_NOT_JUDGED_AGAINST_THE_WHOLE_LIST", NO_CAPABILITY: "NO_VERIFIED_CAPABILITY_AT_ALL" });
export const VERSION_RECORD = "question_library_version";

const ISO = /^\d{4}-\d{2}-\d{2}/;
const named = (s) => typeof s === "string" && s.trim() !== "";

/** C3 · each capability record verified against the stored read of its own page — or refused, named. */
export function verifyCapabilities(capabilities, readOf, { contains }) {
  const verified = [], refused = [];
  for (const c of capabilities ?? []) {
    const r = readOf(c.url);
    const why = !ISO.test(c.readOn ?? "") ? CAPABILITY_REFUSAL.NO_DATE
      : !r || r.state !== "READ" || typeof r.text !== "string" ? CAPABILITY_REFUSAL.NO_READ
        : r.sha256 !== c.readSha256 ? CAPABILITY_REFUSAL.OTHER_READ
          : !named(c.says) || !contains(r.text, c.says) ? CAPABILITY_REFUSAL.NOT_VERBATIM : null;
    if (why) refused.push(Object.freeze({ capabilityId: c.capabilityId, refused: why }));
    else verified.push(c.capabilityId);
  }
  return Object.freeze({ verified: Object.freeze(verified), refused: Object.freeze(refused) });
}

/** C1 · one stored wording record → its words, source and date, as stored. */
export function wordingOf(r) {
  if (r?.record_type === "public_question") { const v = r.value ?? {}; return { text: v.original ?? null, source: v.reference ?? v.source ?? null, date: ISO.test(v.timeWindow?.from ?? "") ? v.timeWindow.from.slice(0, 10) : null, language: v.language ?? null, country: v.country ?? null }; }
  if (r?.record_type === "research_derived_question") return { text: r.wording?.text ?? null, source: r.reference ?? (r.sourceId ? `${r.sourceId} (${r.route ?? "route not recorded"})` : null), date: ISO.test(r.recorded_at ?? "") ? r.recorded_at.slice(0, 10) : null, language: r.language ?? null, country: r.country ?? null };
  return null;
}

/** C3 · the coverage of one topic from its recorded judgement and the verified capabilities. */
export function coverageOf(judgement, verified) {
  if (!judgement) return Object.freeze({ state: COVERAGE.UNKNOWN, why: COVERAGE_WHY.NOT_JUDGED });
  const v = new Set(verified);
  if (judgement.coverage === COVERAGE.DOES_NOT_ADDRESS) {
    if (judgement.against !== "ALL") return Object.freeze({ state: COVERAGE.UNKNOWN, why: COVERAGE_WHY.NOT_AGAINST_ALL });
    if (v.size === 0) return Object.freeze({ state: COVERAGE.UNKNOWN, why: COVERAGE_WHY.NO_CAPABILITY });
    return Object.freeze({ state: COVERAGE.DOES_NOT_ADDRESS, against: Object.freeze([...v]) });
  }
  if (judgement.coverage !== COVERAGE.ADDRESSES && judgement.coverage !== COVERAGE.PARTIALLY) return Object.freeze({ state: COVERAGE.UNKNOWN, why: COVERAGE_WHY.NOT_JUDGED });
  const caps = judgement.capabilities ?? [];
  if (!caps.length || caps.some((id) => !v.has(id))) return Object.freeze({ state: COVERAGE.UNKNOWN, why: COVERAGE_WHY.UNVERIFIED });
  if (judgement.coverage === COVERAGE.PARTIALLY && !(named(judgement.addressed) && named(judgement.unaddressed))) return Object.freeze({ state: COVERAGE.UNKNOWN, why: COVERAGE_WHY.NO_PARTS });
  return Object.freeze({ state: judgement.coverage, capabilities: Object.freeze([...caps]), ...(judgement.coverage === COVERAGE.PARTIALLY ? { addressed: judgement.addressed, unaddressed: judgement.unaddressed } : {}) });
}

export const topicOf = (needKey) => String(needKey).replace(/^[a-z]+-/, "");

/** The library: one entry per need of each page as drafted. */
export function buildLibrary({ pages, recordOf, judgements = [], verified = [] }) {
  const judged = new Map(judgements.map((j) => [j.topic, j]));
  const entries = [];
  for (const p of pages ?? []) {
    const page = Object.values(p.combination ?? {}).map(String).sort().join("+");
    for (const n of p.needs ?? []) {
      const wordings = [], wordingsMissing = [];
      for (const id of n.questions ?? []) {
        const w = wordingOf(recordOf(id));
        if (w && named(w.text) && named(w.source) && w.date) wordings.push(Object.freeze({ questionId: id, text: w.text, source: w.source, date: w.date, language: w.language, country: w.country }));
        else wordingsMissing.push(Object.freeze({ questionId: id, missing: !w || !named(w.text) ? "its stored record" : !named(w.source) ? "a source" : "a date" }));
      }
      const claims = (n.answer?.claims ?? []).filter((c) => named(c.source?.link) && ISO.test(c.source?.readOn ?? "")).map((c) => Object.freeze({ claimId: c.claimId, link: c.source.link, readOn: c.source.readOn, text: c.text ?? null }));
      const langs = [...new Set(wordings.map((w) => w.language).filter((x) => named(x) && x !== "NOT MEASURED"))];
      entries.push(Object.freeze({
        questionKey: `${page}:${n.key}`, page, topic: topicOf(n.key),
        wordings: Object.freeze(wordings), wordingsMissing: Object.freeze(wordingsMissing),
        answer: claims.length ? Object.freeze({ state: ANSWER.ANSWERED, claims: Object.freeze(claims) }) : Object.freeze({ state: ANSWER.DATA_GAP }),
        coverage: coverageOf(judged.get(topicOf(n.key)), verified),
        intent: named(n.intent) ? n.intent : NOT_RECORDED,
        locale: langs.length ? langs.join("+") : NOT_RECORDED,
        stage: named(n.stage) ? n.stage : NOT_RECORDED,
      }));
    }
  }
  return Object.freeze(entries);
}

/** C4 · the gap list, and every gap a page answer speaks for the product on (a claim naming one of the product's own names). */
export function gapsOf(entries, { productNames = [] } = {}) {
  const gaps = entries.filter((e) => e.coverage.state === COVERAGE.DOES_NOT_ADDRESS);
  const names = productNames.filter(named).map((s) => s.toLowerCase());
  const answeredForProduct = gaps.filter((e) => e.answer.state === ANSWER.ANSWERED && e.answer.claims.some((c) => names.some((n) => String(c.text ?? "").toLowerCase().includes(n))));
  return Object.freeze({ gaps: Object.freeze(gaps.map((e) => e.questionKey)), answeredForProduct: Object.freeze(answeredForProduct.map((e) => e.questionKey)) });
}

/** C5 · the version id of a library: the sha256 of its entries in key order. */
export function libraryVersion(entries) {
  const canon = [...entries].sort((a, b) => a.questionKey.localeCompare(b.questionKey));
  return createHash("sha256").update(JSON.stringify(canon)).digest("hex").slice(0, 16);
}
/** C5 · the record a change makes — null when the library is the latest version already. Never replaces an earlier record. */
export function nextVersionRecord(versions, entries, { on }) {
  const version = libraryVersion(entries), latest = versions.at(-1) ?? null;
  if (latest?.version === version) return null;
  return Object.freeze({ record_type: VERSION_RECORD, measurement_key: `${VERSION_RECORD}:${version}`, version, previous: latest?.version ?? null, on, questions: entries.length, entries });
}
/** C5 · every version a store holds, oldest first. */
export const readVersions = (rows) => rows.filter((r) => r?.record_type === VERSION_RECORD);

/** C6 · counts per field: recorded or NOT RECORDED. */
export function fieldCounts(entries) {
  const f = (k) => ({ recorded: entries.filter((e) => e[k] !== NOT_RECORDED).length, notRecorded: entries.filter((e) => e[k] === NOT_RECORDED).length });
  return Object.freeze({ intent: f("intent"), locale: f("locale"), stage: f("stage") });
}
