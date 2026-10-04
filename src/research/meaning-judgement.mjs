/**
 * F16 · C15 · MEANING, NOT LABELS — A JUDGEMENT ON THE ORIGINAL POST, WITH ITS REASON (Acceptance Amendment 2, _handoffs 2a842c1; RR-157 §1).
 *
 * Where a subject's declared relevance profile states a MEANING TEST (mode MEANING_JUDGEMENT), the collection run admits nothing by
 * itself: every item that passes the existing boundary is HELD (`held_for_judgement`), with its original post's text kept so a judgement
 * can be checked against it. A judge — a person or an agent, named by observer type — then records a judgement of the test on that
 * original post, and only these guards decide what happens:
 *
 *   BASIS       the judgement is made on the ORIGINAL POST — a search result, a snippet, a title alone or a summary is refused
 *   REASON      the reason QUOTES the original post's own words, verbatim (whitespace aside) — a person can check it and overturn it
 *   VERDICT     CANDIDATE → admitted as an observed question · NOT_A_CANDIDATE → rejected, recorded with its quote ·
 *               UNKNOWN (a borderline case) → HELD, never admitted to make a count move
 *   JUDGE       its observer type (PERSON_OBSERVED or AGENT_OBSERVED) and a reference are named — an agent's judgement is never a person's
 *   RESIDENCE   an author's country of residence is recorded ONLY with a quote of the post's own words that establish it; otherwise
 *               NOT MEASURED — a question about a country never places its author
 *   OVERTURN    a later judgement may overturn the current one only by naming it; a held item is never judged twice silently
 *
 * Example words a profile carries are EXAMPLES: nothing here matches them, and nothing may turn them into a gate.
 * A question source never answers: the held text is the QUESTION's own post — no reply is read into it or kept.
 * Pure: held records and judgement drafts in, judgement records, admitted questions and refusals out. Generic: names no product or host.
 */
import { createHash } from "node:crypto";
import { RECORD_TYPE, NOT_MEASURED, OBSERVER_TYPES } from "./public-questions.mjs";

export const HELD_RECORD = "held_for_judgement";
export const JUDGEMENT_RECORD = "meaning_judgement";
export const VERDICTS = Object.freeze(["CANDIDATE", "NOT_A_CANDIDATE", "UNKNOWN"]);
export const OUTCOME_OF = Object.freeze({ CANDIDATE: "ADMITTED", NOT_A_CANDIDATE: "REJECTED", UNKNOWN: "HELD" });
export const BASIS = "ORIGINAL_POST";
export const JUDGE_TYPES = Object.freeze(["PERSON_OBSERVED", "AGENT_OBSERVED"]);
const present = (v) => typeof v === "string" && v.trim() !== "";
const squash = (s) => String(s).replace(/\s+/g, " ").trim().toLowerCase();
const id = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 32);
/** Does the quote occur, verbatim apart from whitespace and case, in the original post's own text? */
export const quotedFrom = (quote, post) => present(quote) && squash(quote).length >= 3 && present(post) && post !== NOT_MEASURED && squash(post).includes(squash(quote));

/**
 * One draft against the held item it names, and the judgements already recorded for it. Returns
 * { outcome: ADMITTED | REJECTED | HELD | REFUSED, code, judgement?, question? } — a REFUSED draft writes nothing.
 */
export function decide({ held, draft, subject, recorded = [] }) {
  const refuse = (code) => ({ outcome: "REFUSED", code });
  if (!held || held.record_type !== HELD_RECORD) return refuse("NO_HELD_ITEM_OF_THAT_ID");
  const v = held.value ?? {};
  if (v.subject !== subject || draft?.subject !== subject) return refuse("NOT_THIS_SUBJECTS");
  if (draft.basis !== BASIS) return refuse("JUDGEMENT_NOT_ON_THE_ORIGINAL_POST");
  if (!JUDGE_TYPES.includes(draft.judge?.observerType) || !present(draft.judge?.actorRef)) return refuse("JUDGE_UNDECLARED");
  if (!VERDICTS.includes(draft.verdict)) return refuse("VERDICT_UNKNOWN");
  if (!present(draft.quote)) return refuse("REASON_NOT_QUOTED");
  if (!quotedFrom(draft.quote, v.originalPost)) return refuse("REASON_NOT_QUOTED_FROM_THE_ORIGINAL_POST");
  if (!present(draft.judgedAt) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/.test(draft.judgedAt)) return refuse("JUDGED_AT_UNDECLARED");
  const current = recorded.filter((j) => j.value?.held_id === held.held_id).at(-1) ?? null;
  if (current && draft.overturns !== current.judgement_id) return refuse("ALREADY_JUDGED_NAME_THE_JUDGEMENT_YOU_OVERTURN");
  if (!current && draft.overturns != null) return refuse("OVERTURNS_A_JUDGEMENT_THAT_DOES_NOT_EXIST");
  let residence = NOT_MEASURED;
  if (draft.authorResidence != null) {
    if (!present(draft.authorResidence) || !quotedFrom(draft.residenceQuote, v.originalPost)) return refuse("RESIDENCE_NOT_ESTABLISHED_BY_THE_POST");
    residence = Object.freeze({ value: draft.authorResidence, quote: draft.residenceQuote });
  }
  const outcome = OUTCOME_OF[draft.verdict];
  const jid = id([held.held_id, draft.verdict, draft.quote, draft.judge, draft.judgedAt]);
  const judgement = Object.freeze({
    record_type: JUDGEMENT_RECORD, judgement_id: jid, measurement_key: `${JUDGEMENT_RECORD}:${jid}`, recorded_at: draft.judgedAt,
    value: Object.freeze({ held_id: held.held_id, subject, test: v.meaningTest, basis: BASIS, verdict: draft.verdict, outcome, quote: draft.quote,
      judge: Object.freeze({ observerType: draft.judge.observerType, seenBy: OBSERVER_TYPES[draft.judge.observerType], actorRef: draft.judge.actorRef }),
      overturns: draft.overturns ?? null, authorResidence: residence }),
  });
  if (outcome !== "ADMITTED") return { outcome, code: outcome === "HELD" ? "UNKNOWN_HELD" : "NOT_A_CANDIDATE", judgement };
  /* the admitted question: the held item's own fields, as an observed question of the source — the JUDGE is named apart, never as its observer */
  const { kind: _k, status: _s, originalPost: _p, meaningTest: _t, ...rest } = v;
  const question = Object.freeze({
    record_type: RECORD_TYPE, question_id: held.held_id, measurement_key: `${RECORD_TYPE}:${held.held_id}`, recorded_at: held.recorded_at,
    value: Object.freeze({ ...rest, kind: "OBSERVED", meaning: Object.freeze({ test: v.meaningTest, verdict: draft.verdict, quote: draft.quote, judgementId: jid, judge: judgement.value.judge }),
      author: Object.freeze({ ...(v.author ?? { authorCountry: NOT_MEASURED, authorRole: NOT_MEASURED }), authorResidence: residence }) }),
  });
  return { outcome, code: "CANDIDATE", judgement, question };
}
