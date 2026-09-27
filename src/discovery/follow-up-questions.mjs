/**
 * 🔴 F10 · C7 · THE LIKELY-FOLLOW-UP MECHANISM — version follow-up-discovery-v1.
 *
 * For EVERY pair — an initial need and a candidate next question, both sealed items of ONE tenant — it emits exactly ONE
 * explicit answer: YES (the candidate is a likely next question after that need), NO, or an explicit ABSTAIN. Every answer is
 * INFERRED (F06): a named rule applied to the two wordings. It is NEVER an observed user sequence — no session, visit order or
 * click is read, and none exists in any declared store. Every answer carries a TRACE: the rule that fired, the need's and the
 * candidate's source rows, and the inputs it read (the two wordings). A same-page co-occurrence is not read at all.
 *
 *   FU3_SAME_QUESTION       NO       the candidate's content terms are exactly the need's — the same question, not a NEXT one;
 *   FU1_SHARED_TOPIC        YES      the candidate shares a DISTINCTIVE content term with the need — one fewer than half of
 *                                    the tenant's items carry (a word most of a tenant shares is its general topic, not a link);
 *   FU2_UNRELATED           NO       both carry a distinctive content term and share none;
 *   FU4_TOO_LITTLE_WORDING  ABSTAIN  otherwise — a side carries no distinctive wording at all, so nothing can be told.
 *
 * NEED-AWARE BY CONSTRUCTION: the answer is a function of BOTH wordings, so the same candidate can be answered differently for
 * two needs (C7's re-paired negative controls). Deterministic: no randomness, clock, model, network or spend. Generic: a content
 * term is any normalised word outside a list of ordinary function words of the language; no subject, client, host, tenant or
 * query material is held here (the F10 neutrality scan covers this file). It never prints, logs or records wording.
 *
 * VERSIONING: the id and a hash over MECHANISM_FILES identify the version; it is frozen on the trail only after its proofs, and
 * any change to those files is a new version that needs a new freeze.
 */
import { normalise } from "./human-questions.mjs";

export const MECHANISM_ID = "follow-up-discovery-v1";
/** The files whose bytes ARE this mechanism — this file and the C2 normaliser it reuses. */
export const MECHANISM_FILES = Object.freeze(["src/discovery/follow-up-questions.mjs", "src/discovery/human-questions.mjs"]);
export const EVIDENCE_STATE = "INFERRED";
export const ANSWERS = Object.freeze(["YES", "NO", "ABSTAIN"]);
export const RULE_IDS = Object.freeze(["FU1_SHARED_TOPIC", "FU2_UNRELATED", "FU3_SAME_QUESTION", "FU4_TOO_LITTLE_WORDING"]);

const FUNCTION_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "so", "of", "to", "in", "on", "at", "by", "for", "from", "with", "without", "about",
  "into", "onto", "over", "under", "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did", "done", "doing", "have",
  "has", "had", "having", "can", "could", "should", "would", "will", "shall", "may", "might", "must", "i", "me", "my", "mine", "you", "your",
  "yours", "he", "him", "his", "she", "her", "hers", "it", "its", "we", "us", "our", "ours", "they", "them", "their", "theirs", "this",
  "that", "these", "those", "there", "here", "what", "whats", "how", "why", "when", "where", "who", "whom", "whose", "which", "not", "no",
  "yes", "vs", "versus", "than", "as", "also", "too", "very", "more", "most", "much", "many", "any", "some", "all", "?",
]);
/** The distinct content terms of a wording, after the C2 normalisation. */
export const contentTerms = (text) => [...new Set(normalise(text).split(" ").filter((w) => w && !FUNCTION_WORDS.has(w)))];

/** A term is DISTINCTIVE in a tenant when fewer than this share of that tenant's items carry it — a word most of a tenant's
 * questions share (its general topic) says nothing about which question comes NEXT. */
export const DISTINCTIVE_BELOW_SHARE = 0.5;

/**
 * One pair's answer and the rule that decided it, from the two wordings and — when given — `common`, the set of terms that are
 * NOT distinctive in the pair's own tenant. Without `common`, every shared term counts.
 */
export function judgePair(needText, candText, common = new Set()) {
  const a = contentTerms(needText), b = contentTerms(candText);
  const sharedAll = a.filter((w) => b.includes(w));
  if (a.length > 0 && sharedAll.length === a.length && sharedAll.length === b.length) return { answer: "NO", ruleId: "FU3_SAME_QUESTION" };
  if (sharedAll.some((w) => !common.has(w))) return { answer: "YES", ruleId: "FU1_SHARED_TOPIC" };
  const ad = a.filter((w) => !common.has(w)), bd = b.filter((w) => !common.has(w));
  if (ad.length >= 1 && bd.length >= 1) return { answer: "NO", ruleId: "FU2_UNRELATED" };
  return { answer: "ABSTAIN", ruleId: "FU4_TOO_LITTLE_WORDING" };
}

/**
 * The terms that are NOT distinctive within each tenant. A tenant is never named: its items are recovered as the connected
 * groups of the pairs themselves (a pair never spans two tenants), so one tenant's wording never shapes another's answers.
 * Returns Map itemId → Set of common terms for that item's group.
 */
export function commonTermsByItem(pairs, items) {
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  for (const p of pairs) for (const x of [p.need, p.cand]) if (!parent.has(x)) parent.set(x, x);
  for (const p of pairs) parent.set(find(p.need), find(p.cand));
  const groups = new Map();
  for (const x of parent.keys()) { const r = find(x); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(x); }
  const out = new Map();
  for (const members of groups.values()) {
    const df = new Map();
    for (const m of members) for (const w of contentTerms(items.get(m)?.query ?? "")) df.set(w, (df.get(w) ?? 0) + 1);
    const common = new Set([...df].filter(([, n]) => n / members.length >= DISTINCTIVE_BELOW_SHARE).map(([w]) => w));
    for (const m of members) out.set(m, common);
  }
  return out;
}

export class MechanismRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "MechanismRefused"; this.code = code; }
}

/**
 * Run over pairs [{ id, need, cand }] with `items`: Map itemId → { query, sourceRowIds }. Returns Map pairId → { answer, trace,
 * evidenceState } with EXACTLY one entry per pair. Refuses a pair without an id, a duplicated pair, and a pair whose need or
 * candidate is unknown or has no source rows (an untraceable answer is never emitted).
 */
export function runFollowUpMechanism(pairs, items) {
  if (!Array.isArray(pairs) || !(items instanceof Map)) throw new MechanismRefused("INPUT_ABSENT", "the mechanism runs over pairs and their items");
  const out = new Map();
  const common = commonTermsByItem(pairs, items);
  for (const p of pairs) {
    if (typeof p?.id !== "string" || p.id === "") throw new MechanismRefused("PAIR_ID_ABSENT", "every pair keeps its identity");
    if (out.has(p.id)) throw new MechanismRefused("PAIR_DUPLICATED", "a pair occurs twice");
    const n = items.get(p.need), c = items.get(p.cand);
    for (const x of [n, c]) if (!x || !Array.isArray(x.sourceRowIds) || x.sourceRowIds.length === 0 || x.sourceRowIds.some((s) => typeof s !== "string" || s === "")) throw new MechanismRefused("PAIR_UNTRACEABLE", "a side without source rows cannot carry a trace");
    const { answer, ruleId } = judgePair(n.query, c.query, common.get(p.need));
    out.set(p.id, Object.freeze({
      answer,
      trace: Object.freeze({ ruleId, needSourceRowIds: Object.freeze([...n.sourceRowIds]), candidateSourceRowIds: Object.freeze([...c.sourceRowIds]), inputs: Object.freeze(["NEED_WORDING", "CANDIDATE_WORDING"]) }),
      evidenceState: EVIDENCE_STATE,
    }));
  }
  return out;
}

/** The mechanism's answers in F07 Amendment 3's answer shape: YES → { classes: [cls] }, NO → { classes: [] }, ABSTAIN → { abstain: true }. */
export const asScoredAnswers = (entries, cls) => new Map([...entries].map(([id, e]) => [id, e.answer === "ABSTAIN" ? { abstain: true } : { classes: e.answer === "YES" ? [cls] : [] }]));

/**
 * The trace law over a whole output (C7): every pair has one entry; every answer is YES, NO or ABSTAIN; every entry is INFERRED;
 * every entry — a YES above all — names a known rule, the need's source rows and the candidate's. Returns fault codes.
 */
export function followUpOutputFaults(pairs, entries) {
  const faults = [];
  for (const p of pairs) {
    const e = entries.get(p.id);
    if (!e) { faults.push("PAIR_WITHOUT_ENTRY"); continue; }
    if (!ANSWERS.includes(e.answer)) faults.push("ANSWER_INVALID");
    if (e.evidenceState !== EVIDENCE_STATE) faults.push("ENTRY_NOT_INFERRED");
    const t = e.trace;
    if (!t || !RULE_IDS.includes(t.ruleId) || !t.needSourceRowIds?.length || !t.candidateSourceRowIds?.length) faults.push(e.answer === "YES" ? "YES_WITHOUT_TRACE" : "ENTRY_WITHOUT_TRACE");
  }
  for (const k of entries.keys()) if (!pairs.some((p) => p.id === k)) faults.push("ENTRY_FOR_UNKNOWN_PAIR");
  return [...new Set(faults)];
}
