/**
 * F16 · FROM A LEAD TO A VERIFIED PUBLIC QUESTION (RR-146 §1–§3) — around the existing source boundary (source-adapter.mjs), never
 * instead of it. Pure: a route, one retrieval already in hand and the batch's existing question ids in; leads, questions and refusals
 * out. It fetches nothing.
 *
 *   LEADS        every item a source's own listing or search returned is first a SEARCH LEAD (`research_lead`), stored apart and counted
 *                apart: a search hit is a lead, never an observed question.
 *   ATTRIBUTION  an item may name its AUTHOR's country or role only with `authorEvidence` saying the original post itself
 *                establishes it. Otherwise the item is REFUSED (UNSUPPORTED_ATTRIBUTION). The route that found it never lends its
 *                dimension to the author: a question found by looking for a value is a question ABOUT it at most, and every admitted
 *                question's author fields read NOT MEASURED unless the source established them.
 *   THE BOUNDARY then admits only what source-adapter.mjs admits: an admitted source, every field, the author's own wording (never a
 *                snippet), the recheck that the post still exists unchanged, and the subject's declared relevance profile.
 *   DUPLICATES   a question already in the batch, or met twice in one retrieval, is REFUSED (DUPLICATE_INTAKE) and counted, never stored
 *                again and never counted twice.
 *   ROUTE        each admitted question names the route that found it, and that route is how it was looked for, not what it is.
 */
import { createHash } from "node:crypto";
import { recordsFrom } from "./source-adapter.mjs";
import { RECORD_TYPE, NOT_MEASURED } from "./public-questions.mjs";
import { ROUTE_RECORD } from "./research-routes.mjs";

export const LEAD_RECORD = "research_lead";
/** The only basis on which an author's country or role is recorded: the original post itself states it. */
export const AUTHOR_EVIDENCE = "STATED_ON_THE_ORIGINAL_POST";
const AUTHOR_FIELDS = Object.freeze(["authorCountry", "authorRole"]);
const present = (v) => typeof v === "string" && v.trim() !== "";
const id = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);

export function intakeFromRoute({ route, decl, retrieval, subject, origin, relevance, existingQuestionIds = [], dataPurpose = null }) {
  if (route?.record_type !== ROUTE_RECORD || route.subject !== subject) return { refused: { ROUTE_NOT_THIS_SUBJECTS: 1 }, leads: [], questions: [], retrieved: NOT_MEASURED };
  const items = Array.isArray(retrieval?.items) ? retrieval.items : null;
  if (items === null) return { refused: {}, leads: [], questions: [], retrieved: NOT_MEASURED };
  /* 1 · every hit is a LEAD first, stored apart */
  const leads = items.map((it) => { const leadId = id([subject, route.route_id, decl?.sourceId, it?.sourceUrl ?? null, it?.postVersion ?? null]); return Object.freeze({
    record_type: LEAD_RECORD, kind: "SEARCH_LEAD", lead_id: leadId, measurement_key: `${LEAD_RECORD}:${leadId}`,
    subject, route_id: route.route_id, sourceId: decl?.sourceId ?? null, reference: it?.sourceUrl ?? null, recorded_at: it?.observedAt ?? null,
    status: "LEAD — not an observed question until its original post is read and rechecked",
  }); });
  /* 2 · attribution: an author field without the original post's own statement refuses the item */
  const refusedBefore = {}, kept = [];
  for (const it of items) {
    const claims = AUTHOR_FIELDS.filter((f) => present(it?.[f]));
    if (claims.length && it?.authorEvidence !== AUTHOR_EVIDENCE) { refusedBefore.UNSUPPORTED_ATTRIBUTION = (refusedBefore.UNSUPPORTED_ATTRIBUTION ?? 0) + 1; continue; }
    kept.push(it);
  }
  const adapterRefusals = { ...(retrieval.adapterRefusals ?? {}) };
  for (const [k, n] of Object.entries(refusedBefore)) adapterRefusals[k] = (adapterRefusals[k] ?? 0) + n;
  /* 3 · the existing boundary decides admission, wording, currency and relevance */
  const r = recordsFrom(decl, { ...retrieval, items: kept, adapterRefusals }, { subject, origin, dataPurpose, relevance });
  const refused = { ...r.refused };
  if (!r.admitted) return { refused: Object.fromEntries(r.refusals.map((x) => [x, items.length])), leads, questions: [], retrieved: r.retrieved, sourceRefused: r.refusals };
  /* 4 · duplicates refused; route named; author fields as the source established them, else NOT MEASURED */
  const seen = new Set(existingQuestionIds);
  const byUrl = new Map(kept.map((it) => [`${it.sourceUrl}\u0000${it.postVersion}`, it]));
  const questions = [];
  for (const q of r.records.filter((x) => x.record_type === RECORD_TYPE)) {
    if (seen.has(q.question_id)) { refused.DUPLICATE_INTAKE = (refused.DUPLICATE_INTAKE ?? 0) + 1; continue; }
    seen.add(q.question_id);
    const it = byUrl.get(`${q.value.reference}\u0000${q.value.postVersion}`) ?? {};
    const author = Object.freeze(Object.fromEntries(AUTHOR_FIELDS.map((f) => [f, present(it[f]) && it.authorEvidence === AUTHOR_EVIDENCE ? it[f] : NOT_MEASURED])));
    questions.push(Object.freeze({ ...q, value: Object.freeze({ ...q.value, route_id: route.route_id, author }) }));
  }
  return { refused, leads, questions, keywordIdeas: r.records.filter((x) => x.record_type !== RECORD_TYPE), retrieved: r.retrieved };
}
