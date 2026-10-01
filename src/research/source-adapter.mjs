/**
 * F16 · THE SOURCE-ADAPTER BOUNDARY — one shape any source plugs into; no source is named here (RR-118; F16 acceptance _handoffs 944f769;
 * eligibility record 2a4ef7d).
 *
 *   ADMISSION   a source is admitted only when its DURABLE-STORAGE right, its ATTRIBUTION terms and its LICENCE (with version) are each
 *               declared VERIFIED_FROM_PRIMARY_SOURCE with a citation (the quoted clause) and the date its page was read — a terms page is a
 *               snapshot (RR-119). Anything NOT_VERIFIED_BY_US refuses the whole source; a term the source RESTRICTS refuses it for that
 *               reason. Nothing a refused source returns may be kept.
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
import { RECORD_TYPE, NOT_MEASURED, OBSERVER_TYPES } from "./public-questions.mjs";

export const SOURCE_KINDS = Object.freeze({ QUESTION_SOURCE: "QUESTION_SOURCE", KEYWORD_SOURCE: "KEYWORD_SOURCE" });
export const VERIFIED = "VERIFIED_FROM_PRIMARY_SOURCE";
export const NOT_VERIFIED = "NOT_VERIFIED_BY_US";
/** RR-119: a term the primary source itself RESTRICTS is a finding, not an unknown — it refuses for its own reason, and no workaround follows. */
export const RESTRICTED = "RESTRICTED_BY_PRIMARY_SOURCE";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/**
 * RR-120: a source declares the coverage it can honestly stand for; no output may imply more, and the disclaimer says so in every output.
 */
export const SCOPE_DISCLAIMER = "this source cannot stand for any other product, any other subject or any other country — one source, its own topics, its own languages";
export const COVERAGE_OVERCLAIM = /\b(all|every) (products|subjects|countries|markets|languages|topics|sources)\b|\bworldwide\b|\bcomplete coverage\b/i;
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
    if (term?.status === RESTRICTED) refusals.push(`${t.toUpperCase()}_TERM_RESTRICTED_BY_SOURCE`);
    else if (term?.status !== VERIFIED) refusals.push(`${t.toUpperCase()}_TERM_NOT_VERIFIED`);
    else if (!present(term.citation)) refusals.push(`${t.toUpperCase()}_TERM_HAS_NO_CITATION`);
    else if (!ISO_DATE.test(term.retrievedOn ?? "")) refusals.push(`${t.toUpperCase()}_TERM_HAS_NO_SNAPSHOT_DATE`);
  }
  return refusals.length ? { admitted: false, refusals } : { admitted: true, refusals: [] };
}

/**
 * RR-126 · THE RELEVANCE GATE. A search hit is a LEAD, never by itself a question about the subject. Before an item may enter a
 * subject's batch, its own retained text (a question's title, a keyword's idea) is judged against a RELEVANCE PROFILE that is DECLARED
 * DATA for that subject — never a rule written here. One rule per item, in this order:
 *   an EXCLUDES pattern matches            → NOT_ABOUT_THE_DECLARED_SUBJECT (refused)
 *   a CONFIRMS pattern matches             → RELEVANT (kept, with the rule that decided it, in the record)
 *   only an AMBIGUOUS pattern matches      → RELEVANCE_AMBIGUOUS_KEPT_OUT (UNKNOWN: not stored, not counted as a question)
 *   nothing matches                        → NOT_ABOUT_THE_DECLARED_SUBJECT (refused)
 * No profile, a profile for another subject, one with no confirming rule, or a pattern that does not compile refuses the whole retrieval.
 * Limit, stated: relevance is judged on the retained text alone; a question whose subject is only in its body is refused (fails closed).
 */
export function compileProfile(profile, subject) {
  if (!profile || typeof profile !== "object") return { refusal: "RELEVANCE_PROFILE_UNDECLARED" };
  if (profile.subject !== subject) return { refusal: "RELEVANCE_PROFILE_IS_ANOTHER_SUBJECTS" };
  if (!Array.isArray(profile.confirms) || profile.confirms.length === 0) return { refusal: "RELEVANCE_PROFILE_HAS_NO_CONFIRMING_RULE" };
  try {
    const rx = (list) => (Array.isArray(list) ? list : []).map((s) => new RegExp(s, "i"));
    return { refusal: null, id: profile.profileId ?? null, confirms: rx(profile.confirms), ambiguous: rx(profile.ambiguous), excludes: rx(profile.excludes) };
  } catch { return { refusal: "RELEVANCE_PATTERN_INVALID" }; }
}
export function relevanceOf(text, p) {
  const hit = (list) => list.findIndex((r) => r.test(text));
  const x = hit(p.excludes); if (x >= 0) return { verdict: "UNRELATED", rule: `excludes[${x}]` };
  const c = hit(p.confirms); if (c >= 0) return { verdict: "RELEVANT", rule: `confirms[${c}]` };
  const a = hit(p.ambiguous); if (a >= 0) return { verdict: "AMBIGUOUS", rule: `ambiguous[${a}]` };
  return { verdict: "UNRELATED", rule: null };
}

/** One retrieval → records of its declared kind, or refusals; a retrieval that never happened is NOT MEASURED, an empty one is EMPTY. */
export function recordsFrom(decl, retrieval, { subject, origin, dataPurpose = null, relevance = null }) {
  const admission = admitSource(decl);
  if (!admission.admitted) return { admitted: false, refusals: admission.refusals, retrieved: NOT_MEASURED, records: [], refused: {} };
  if (!retrieval || !Array.isArray(retrieval.items)) return { admitted: true, refusals: [], retrieved: NOT_MEASURED, records: [], refused: {} };
  /* an adapter may refuse items before they reach here (e.g. a post deleted since retrieval); they stay in the denominator */
  const before = Object.fromEntries(Object.entries(retrieval.adapterRefusals ?? {}).filter(([, n]) => Number.isInteger(n) && n > 0));
  const total = retrieval.items.length + Object.values(before).reduce((a, n) => a + n, 0);
  const head = [];
  if (!present(retrieval.topic)) head.push("TOPIC_ABSENT");
  if (!present(retrieval.coverageLimits)) head.push("COVERAGE_LIMITS_ABSENT");
  if (!present(origin)) head.push("SUBJECT_HAS_NO_DECLARED_SITE_ORIGIN");
  const profile = compileProfile(relevance, subject);
  if (profile.refusal) head.push(profile.refusal);
  if (head.length) return { admitted: true, refusals: head, retrieved: total, records: [], refused: Object.fromEntries(head.map((h) => [h, total])) };
  const question = decl.kind === SOURCE_KINDS.QUESTION_SOURCE;
  const records = [], refused = { ...before };
  const refuse = (why) => { refused[why] = (refused[why] ?? 0) + 1; };
  for (const item of retrieval.items) {
    const missing = (question ? QUESTION_FIELDS : KEYWORD_FIELDS).filter((f) => !present(item?.[f]));
    if (missing.length) { refuse(`${missing[0].toUpperCase()}_ABSENT`); continue; }
    if (!ISO_TIME.test(item.observedAt)) { refuse("OBSERVEDAT_NOT_A_TIME"); continue; }
    if (Array.isArray(decl.licenceVersions) && !decl.licenceVersions.includes(item.licenceVersion)) { refuse("LICENCE_VERSION_OUTSIDE_DECLARED_SET"); continue; }
    if (question && item.wordingOrigin !== "SOURCE_TEXT") { refuse("SNIPPET_IS_NOT_THE_AUTHORS_WORDING"); continue; }
    const rel = relevanceOf(question ? item.wording : item.idea, profile);
    if (rel.verdict === "AMBIGUOUS") { refuse("RELEVANCE_AMBIGUOUS_KEPT_OUT"); continue; }
    if (rel.verdict !== "RELEVANT") { refuse("NOT_ABOUT_THE_DECLARED_SUBJECT"); continue; }
    const relevanceRecord = Object.freeze({ profileId: profile.id, verdict: rel.verdict, rule: rel.rule, judgedOn: question ? "the question title as retained" : "the keyword idea as retained" });
    const shared = { subject, origin, sourceId: decl.sourceId, topic: retrieval.topic, country: item.country, language: item.language,
      limits: retrieval.coverageLimits, licence: Object.freeze({ name: item.licenceName, version: item.licenceVersion }), attribution: item.attribution, dataPurpose, relevance: relevanceRecord };
    if (question) {
      const id = hash([subject, decl.sourceId, item.sourceUrl, item.postVersion]);
      records.push(Object.freeze({ record_type: RECORD_TYPE, question_id: id, measurement_key: `${RECORD_TYPE}:${id}`, recorded_at: item.observedAt,
        value: Object.freeze({ ...shared, kind: "OBSERVED", original: item.wording, reference: item.sourceUrl, postVersion: item.postVersion, postedAt: item.postedAt ?? NOT_MEASURED,
          provenance: Object.freeze({ observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: OBSERVER_TYPES.SOURCE_ADAPTER_OBSERVED, sourceId: decl.sourceId, engineObserved: true }),
          source: decl.sourceId, surface: "source adapter", timeWindow: Object.freeze({ from: item.observedAt, to: item.observedAt }), method: `source-adapter:${decl.sourceId}` }) }));
    } else {
      const id = hash([subject, decl.sourceId, item.idea, item.observedAt]);
      records.push(Object.freeze({ record_type: KEYWORD_SIGNAL, signal_id: id, measurement_key: `${KEYWORD_SIGNAL}:${id}`, recorded_at: item.observedAt,
        value: Object.freeze({ ...shared, idea: item.idea, note: "a generated keyword idea — never a question someone asked" }) }));
    }
  }
  return { admitted: true, refusals: [], retrieved: total, records, refused, coverage: `${retrieval.topic} · ${retrieval.coverageLimits}`, notes: { ...(retrieval.notes ?? {}) }, checked: retrieval.items.length };
}

/** Every output is a SAMPLE with its limits; an empty retrieval says EMPTY (0 of 0, measured); no retrieval says NOT MEASURED. */
export function sampleLines(decl, r) {
  const q = r.records.filter((x) => x.record_type === RECORD_TYPE).length;
  const k = r.records.filter((x) => x.record_type === KEYWORD_SIGNAL).length;
  const lines = [`SAMPLE — not a census of the world's questions · declared limits: one retrieval from one admitted source, its coverage limits stored with each record`];
  if (!r.admitted) return [...lines, `source REFUSED — ${r.refusals.join(" · ")} — nothing it returns may be kept`];
  if (r.retrieved === NOT_MEASURED) return [...lines, "retrieved: NOT MEASURED — no retrieval was supplied"];
  const scope = ["coverage: as the source declared it for this retrieval, stored beside each record (not printed — count-only)", SCOPE_DISCLAIMER];
  if (r.retrieved === 0) return guardScope(r, [...lines, ...scope, "EMPTY SAMPLE — 0 of 0 item(s) retrieved: no question is invented, no keyword idea stands in, nothing is padded from another topic"]);
  return guardScope(r, [...lines, ...scope,
    decl.kind === SOURCE_KINDS.QUESTION_SOURCE ? `questions people wrote: kept ${q} of ${r.retrieved} retrieved · observer type SOURCE_ADAPTER_OBSERVED, the only one this path writes` : `keyword signals (generated ideas, never questions): kept ${k} of ${r.retrieved} retrieved`,
    `refusals by rule: ${Object.entries(r.refused).map(([w, n]) => `${w} ${n}`).join(" · ") || "none"}`,
    /* RR-121: a cross-check that disagrees is REPORTED — it decides nothing, and is never folded into the refusals */
    ...(Object.keys(r.notes ?? {}).length ? [`cross-checks (reported, not deciding): ${Object.entries(r.notes).map(([w, n]) => `${w} ${n} of ${r.checked} checked`).join(" · ")}`] : [])]);
}

/**
 * No output line, and not the source's own declared coverage, may name the broad populations: an output — or a declaration — implying
 * wider coverage than one source's scope THROWS.
 */
function guardScope(r, lines) {
  const over = [...lines, r.coverage ?? ""].filter((l) => COVERAGE_OVERCLAIM.test(l));
  if (over.length) throw Object.assign(new Error(`COVERAGE_OVERCLAIM — ${over.length} output line(s) imply coverage wider than the source's declared scope`), { code: "COVERAGE_OVERCLAIM" });
  return lines;
}
