/**
 * F33 · C8 · COVERAGE FOR A GROUPED NEED (Acceptance Amendment 1, _handoffs 6ecc99f; RTP-1 Rev 6 P18; the owner's RR-172 §3 rulings).
 *
 * Its OWN function, beside F33's existing coverage function (src/page/need-coverage.mjs decideNeedCoverage), which — with F34 its only
 * caller — stays UNCHANGED (ruling 3(b)). F91's grouping makes a NEED: a group of questions with one meaning and one underlying need. This
 * decides, for one such need and the SAME tenant's existing-page population, whether an existing page already serves it:
 *
 *   FULL           every question of the need is served by an existing page, the pages named           → F33 COVERED (C2)
 *   PARTIAL        some are served, the pages named, and EACH relevant question they do not answer named → F33 COVERED (C2): a revision of
 *                  the covering page itself (IMPROVE / ADD SECTION, decided by F35) — never a new page, a new draft of a new page or a URL
 *   NONE           no question is served, over a population recorded COMPLETE, with POSITIVE evidence against every existing page for every
 *                  question                                                                             → F33 NOT COVERED (C3)
 *   CANNOT_DECIDE  anything else — undecidable evidence, or no positive evidence against a page, or a population not recorded COMPLETE
 *                  for a NONE                                                                           → F33 CANNOT DECIDE (C4)
 *   REFUSED        the population is missing, unreadable, of unknown shape or another tenant's — exactly as F34 refuses it (C1)
 *
 * 🔴 HOW A QUESTION IS SERVED (ruling 3(a)): either a RECORDED per-question coverage judgement — a page, COVERS or DOES_NOT_COVER, a one-line
 * reason, and its source (a METHOD or an AGENT; never an approval field, never the word "human") — or an EXACT match: one of the page's own
 * served question headings (an h2 or h3) equals the question's wording after the one declared normalisation (normaliseWording: letter case,
 * runs of white space, terminal punctuation). NEVER by similarity: no stem, no prefix, no overlap figure decides anything here.
 * Pure: records in, a decision out. It reads nothing, calls nothing and records nothing; it names no product.
 */
import { createHash } from "node:crypto";
import { COVERAGE_STATES } from "../crawl/inventory.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { normaliseWording } from "./page-opportunities.mjs";
import { NEED_OUTCOMES } from "./need-coverage.mjs";

export const COVERAGE_JUDGEMENT = "coverage_judgement";
export const GROUPED = Object.freeze({ FULL: "FULL", PARTIAL: "PARTIAL", NONE: "NONE", CANNOT_DECIDE: "CANNOT_DECIDE", REFUSED: "REFUSED" });
/** C8: the grouped outcome, as F33's own frozen outcome (C2–C4). */
export const AS_F33 = Object.freeze({ FULL: NEED_OUTCOMES.COVERED, PARTIAL: NEED_OUTCOMES.COVERED, NONE: NEED_OUTCOMES.NOT_COVERED, CANNOT_DECIDE: NEED_OUTCOMES.CANNOT_DECIDE, REFUSED: "REFUSED" });
export const JUDGED = Object.freeze({ COVERS: "COVERS", DOES_NOT_COVER: "DOES_NOT_COVER" });
export const ASSESSORS = Object.freeze(["METHOD", "AGENT"]);
export const GROUPED_REASONS = Object.freeze({
  NO_TENANT: "COVERAGE_CHECK_HAS_NO_TENANT",
  POPULATION_UNAVAILABLE: "EXISTING_PAGE_POPULATION_UNAVAILABLE",
  CROSS_TENANT: "EXISTING_PAGE_POPULATION_OF_ANOTHER_TENANT",
  NO_QUESTIONS: "THE_NEED_HAS_NO_QUESTION",
  FULL: "EVERY_QUESTION_OF_THE_NEED_IS_SERVED_BY_A_NAMED_PAGE",
  PARTIAL: "SOME_QUESTIONS_ARE_SERVED_THE_REST_NAMED",
  NONE: "NO_QUESTION_IS_SERVED_AND_EVERY_PAGE_SHOWS_POSITIVE_EVIDENCE_AGAINST_IT",
  UNDECIDED: "A_PAGE_CANNOT_BE_RULED_IN_OR_OUT_FOR_A_QUESTION",
  NOT_COMPLETE: "NO_QUESTION_IS_SERVED_BUT_THE_POPULATION_IS_NOT_RECORDED_COMPLETE",
});
const present = (v) => typeof v === "string" && v.trim() !== "";
const APPROVAL = /approv/i, HUMAN = /\bhuman\b/i;

/** The page's own served question headings (h2 and h3), as text — the only place an exact match is looked for. */
export function servedHeadingsOf(html) {
  return [...String(html ?? "").matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim());
}

/** Ruling 3(a): why one recorded coverage judgement cannot be used, or null. */
export function judgementRefusal(j) {
  if (j?.record_type !== COVERAGE_JUDGEMENT) return "NOT_A_COVERAGE_JUDGEMENT";
  const v = j.value ?? {};
  if (Object.keys(v).some((k) => APPROVAL.test(k)) || Object.keys(v.source ?? {}).some((k) => APPROVAL.test(k))) return "A_COVERAGE_JUDGEMENT_IS_NEVER_AN_APPROVAL";
  if (!present(v.questionId) || !present(v.pageId)) return "JUDGEMENT_NAMES_NO_QUESTION_OR_PAGE";
  if (!Object.values(JUDGED).includes(v.verdict)) return "JUDGEMENT_VERDICT_NOT_COVERS_OR_DOES_NOT_COVER";
  if (!present(v.reason) || /\n/.test(v.reason.trim())) return "JUDGEMENT_REASON_NOT_ONE_LINE";
  if (!ASSESSORS.includes(v.source?.kind) || !present(v.source?.ref)) return "JUDGEMENT_NAMES_NO_METHOD_OR_AGENT";
  if ([v.source.ref, v.reason].some((s) => HUMAN.test(s))) return "JUDGEMENT_SOURCE_IS_A_METHOD_OR_AN_AGENT_NEVER_HUMAN";
  return null;
}

/**
 * Ruling 3(a) · drafts of per-question coverage judgements → records (each the judgement as given, with its id), or the refusal codes.
 * A draft: { questionId, pageId, verdict: COVERS|DOES_NOT_COVER, reason, source: { kind: METHOD|AGENT, ref } }.
 */
export function coverageJudgementRecords(drafts, { on }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on ?? "")) throw new TypeError("the run's stated date (YYYY-MM-DD)");
  const records = [], refused = [];
  for (const d of Array.isArray(drafts) ? drafts : []) {
    const value = d && typeof d === "object" ? { ...d, ...(present(d.reason) ? { reason: d.reason.trim() } : {}) } : d;
    const why = judgementRefusal({ record_type: COVERAGE_JUDGEMENT, value });
    if (why) { refused.push(why); continue; }
    const v = Object.freeze({ questionId: value.questionId, pageId: value.pageId, verdict: value.verdict, reason: value.reason, source: Object.freeze({ kind: value.source.kind, ref: value.source.ref.trim() }) });
    const id = createHash("sha256").update(JSON.stringify([v, on])).digest("hex").slice(0, 24);
    records.push(Object.freeze({ record_type: COVERAGE_JUDGEMENT, measurement_key: `${COVERAGE_JUDGEMENT}:${id}`, recorded_at: `${on}T00:00:00Z`, value: v }));
  }
  return Object.freeze({ records: Object.freeze(records), refused: Object.freeze(refused) });
}

/**
 * C8 · one grouped need's coverage.
 * @param {{ need: { needId: string, questions: { questionId: string, wording: string }[] }, tenantId: string,
 *           population: { tenantId: string, coverageState: string, pages: { pageId: string, tenantId?: string, html?: string }[] }|null,
 *           judgements?: object[] }} input
 */
export function decideGroupedNeedCoverage({ need, tenantId, population, judgements = [] }) {
  const G = GROUPED, R = GROUPED_REASONS;
  const out = (outcome, reason, extra = {}) => Object.freeze({ needId: need?.needId ?? null, outcome, asF33: AS_F33[outcome], reason, coverageState: population?.coverageState ?? null,
    considered: Array.isArray(population?.pages) ? population.pages.length : 0, coveringPages: [], missingQuestions: [], perQuestion: [], refusedJudgements: [], missingFact: null, ...extra });
  /* C1 · F34's refusal, preserved: missing, unreadable, unknown-shape or another tenant's information is REFUSED, never read as empty */
  if (!present(tenantId)) return out(G.REFUSED, R.NO_TENANT);
  if (population === null || typeof population !== "object" || !Array.isArray(population.pages) || !COVERAGE_STATES.includes(population.coverageState)) return out(G.REFUSED, R.POPULATION_UNAVAILABLE);
  const sameTenant = (other) => decideResolvedTenants(tenantId, other).allowed;
  if (!sameTenant(population.tenantId) || population.pages.some((p) => p?.tenantId !== undefined && !sameTenant(p.tenantId))) return out(G.REFUSED, R.CROSS_TENANT);
  if (population.pages.some((p) => !present(p?.pageId))) return out(G.REFUSED, R.POPULATION_UNAVAILABLE);
  const questions = Array.isArray(need?.questions) ? need.questions.filter((q) => present(q?.questionId) && present(q?.wording)) : [];
  if (!questions.length) return out(G.CANNOT_DECIDE, R.NO_QUESTIONS, { missingFact: Object.freeze({ questions: "none recorded for the need" }) });

  const refusedJudgements = [];
  const usable = [];
  for (const j of judgements) { const why = judgementRefusal(j); if (why) refusedJudgements.push(why); else usable.push(j.value); }
  const headings = new Map(population.pages.map((p) => [p.pageId, new Set(servedHeadingsOf(p.html).map(normaliseWording).filter(Boolean))]));
  /* per question, per page: COVERS · DOES_NOT_COVER · UNDECIDED — a recorded judgement first (its latest for that pair), else an exact match */
  const perQuestion = questions.map((q) => {
    const pages = population.pages.map((p) => {
      const mine = usable.filter((j) => j.questionId === q.questionId && j.pageId === p.pageId);
      if (mine.length) return { pageId: p.pageId, verdict: mine.at(-1).verdict, by: "JUDGEMENT", source: mine.at(-1).source.kind };
      if (headings.get(p.pageId).has(normaliseWording(q.wording))) return { pageId: p.pageId, verdict: JUDGED.COVERS, by: "EXACT_MATCH" };
      return { pageId: p.pageId, verdict: "UNDECIDED", by: "NO_EVIDENCE" };
    });
    return Object.freeze({ questionId: q.questionId, covering: pages.filter((x) => x.verdict === JUDGED.COVERS).map((x) => x.pageId), pages: Object.freeze(pages) });
  });
  const served = perQuestion.filter((q) => q.covering.length > 0);
  const coveringPages = [...new Set(served.flatMap((q) => q.covering))].sort();
  const extra = { perQuestion: Object.freeze(perQuestion), refusedJudgements: Object.freeze(refusedJudgements), coveringPages: Object.freeze(coveringPages) };
  if (served.length === questions.length) return out(G.FULL, R.FULL, extra);
  if (served.length > 0) return out(G.PARTIAL, R.PARTIAL, { ...extra, missingQuestions: Object.freeze(perQuestion.filter((q) => q.covering.length === 0).map((q) => q.questionId)) });
  /* NONE needs POSITIVE evidence against every page, for every question — and only over a population recorded COMPLETE. CANNOT DECIDE
   * names its missing fact: each question with the pages no recorded judgement or exact match rules in or out, or the population state. */
  const undecided = perQuestion.map((q) => ({ questionId: q.questionId, pageIds: q.pages.filter((x) => x.verdict !== JUDGED.DOES_NOT_COVER).map((x) => x.pageId) })).filter((u) => u.pageIds.length);
  if (undecided.length) return out(G.CANNOT_DECIDE, R.UNDECIDED, { ...extra, missingFact: Object.freeze({ undecided: Object.freeze(undecided) }) });
  if (population.coverageState !== "COMPLETE") return out(G.CANNOT_DECIDE, R.NOT_COMPLETE, { ...extra, missingFact: Object.freeze({ populationRecordedComplete: false, coverageState: population.coverageState }) });
  return out(G.NONE, R.NONE, extra);
}
