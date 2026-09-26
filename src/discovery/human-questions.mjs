/**
 * 🔴 F10 · C2 · THE HUMAN-QUESTION DISCOVERY MECHANISM — version human-question-discovery-v1.
 *
 * For EVERY item it emits exactly ONE explicit entry: a list of zero or more of GOAL, QUESTION, CONCERN and CONFUSION. An empty
 * list is an explicit abstention — a valid negative for every class, never a missing entry. Every class it assigns carries a
 * TRACE: the rule that fired and the source rows the item stands for. Every entry is INFERRED (F06): a named rule applied to
 * an identified input — never OBSERVED, never verified.
 *
 * WHAT EACH CLASS MEANS, FOR THIS MECHANISM (the owner's reference labels decide how well it matches — C6):
 *   QUESTION   the searcher is asking something: an interrogative opening, an auxiliary-verb question, or a question mark;
 *   GOAL       the searcher is trying to achieve, obtain or learn to do something;
 *   CONCERN    the searcher is worried about a cost, a risk, a difficulty, a failure or whether something is worth it;
 *   CONFUSION  the searcher is unsure what something means, how two things differ, or which of them applies.
 *
 * Deterministic: a pure function of the item's wording — no randomness, no clock, no model, no network, no spend.
 * Generic: its rules are ordinary function words of the language; it holds no subject, client, host, tenant or query
 * material (proved by the F10 neutrality scan). It never prints, logs or records wording; its caller reports counts.
 *
 * VERSIONING (C2): the id below and a hash over THIS FILE identify the version. The version is frozen on the audit trail
 * only after its proofs; any change to this file is a new version that needs a new freeze.
 */
export const MECHANISM_ID = "human-question-discovery-v1";
/** The files whose bytes ARE the mechanism — its hash is taken over exactly these (src/heldout/lifecycle.mjs mechanismHash). */
export const MECHANISM_FILES = Object.freeze(["src/discovery/human-questions.mjs"]);
export const CLASSES = Object.freeze(["GOAL", "QUESTION", "CONCERN", "CONFUSION"]);
export const EVIDENCE_STATE = "INFERRED";

/* Each rule: an id (the trace names it), the class it assigns, and a whole-word pattern over the normalised wording. */
const w = (alternatives) => new RegExp(`(^| )(${alternatives})( |$)`);
export const RULES = Object.freeze([
  Object.freeze({ id: "Q1_INTERROGATIVE_OPENING", cls: "QUESTION", re: /^(what|whats|how|why|when|where|who|whom|whose|which)( |$)/ }),
  Object.freeze({ id: "Q2_AUXILIARY_OPENING", cls: "QUESTION", re: /^(can|could|is|are|was|were|do|does|did|should|shall|will|would|may|might|must|am|has|have|had)( )/ }),
  Object.freeze({ id: "Q3_QUESTION_MARK", cls: "QUESTION", re: /\?/ }),
  Object.freeze({ id: "G1_HOW_TO", cls: "GOAL", re: w("how to|how do i|how can i|how do you|how can you|ways to|steps to|way to") }),
  Object.freeze({ id: "G2_ACHIEVE_VERB", cls: "GOAL", re: w("learn|learning|become|becoming|improve|improving|prepare|preparing|preparation|practice|practise|practicing|practising|pass|passing|apply|applying|application|register|registration|book|booking|get|getting|find|finding|start|starting|study|studying|train|training|achieve|reach|increase|boost|write|writing") }),
  Object.freeze({ id: "G3_RESOURCE_SOUGHT", cls: "GOAL", re: w("tips|tip|guide|guides|tutorial|tutorials|course|courses|lessons|lesson|exercises|exercise|sample|samples|example|examples|template|templates|checklist|download|pdf|online|free") }),
  Object.freeze({ id: "G4_ASSESSMENT_SOUGHT", cls: "GOAL", re: w("test|tests|mock|mocks|quiz|exam|exams") }),
  Object.freeze({ id: "G5_OUTCOME_SOUGHT", cls: "GOAL", re: w("score|scores|band|bands|result|results|grade|grades|marks") }),
  Object.freeze({ id: "C1_COST", cls: "CONCERN", re: w("cost|costs|price|prices|fee|fees|expensive|cheap|cheapest|afford|budget") }),
  Object.freeze({ id: "C2_RISK_OR_FAILURE", cls: "CONCERN", re: w("fail|failed|failing|failure|risk|risks|risky|safe|safety|scam|legit|legitimate|problem|problems|issue|issues|mistake|mistakes|wrong|penalty|penalties|reject|rejected|rejection|deadline|late|delay|delayed|expire|expired|expiry") }),
  Object.freeze({ id: "C3_DIFFICULTY_OR_WORTH", cls: "CONCERN", re: w("hard|harder|hardest|difficult|difficulty|tough|worth|enough|minimum|requirement|requirements|required|eligible|eligibility|allowed|accepted|valid|validity") }),
  Object.freeze({ id: "F1_COMPARISON", cls: "CONFUSION", re: w("vs|versus|compare|compared|comparison|difference|differences|different|same as|or") }),
  Object.freeze({ id: "F2_MEANING", cls: "CONFUSION", re: w("meaning|means|mean|meant|definition|define|explained|explain|explanation|what is|what are|what does|whats") }),
  Object.freeze({ id: "F3_WHICH_OR_UNSURE", cls: "CONFUSION", re: w("which|which one|confused|confusing|unsure|not sure|understand|understanding") }),
]);

/** The one normalisation: lower case, "?" kept as its own token, every other punctuation mark a space, whitespace collapsed. */
export const normalise = (text) => String(text).toLowerCase().normalize("NFKC").replace(/\?/g, " ? ").replace(/[^\p{L}\p{N}?\s]/gu, " ").replace(/\s+/g, " ").trim();

/** One item's classes and trace. Classes in protocol order, each once. */
export function classifyWording(text) {
  const n = normalise(text);
  const fired = RULES.filter((r) => r.re.test(n));
  const classes = CLASSES.filter((c) => fired.some((r) => r.cls === c));
  return { classes, rules: classes.map((c) => ({ cls: c, ruleIds: fired.filter((r) => r.cls === c).map((r) => r.id) })) };
}

export class MechanismRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "MechanismRefused"; this.code = code; }
}

/**
 * Run the mechanism over items [{ itemId, query, sourceRowIds }]. Returns Map itemId → { classes, trace, evidenceState } with
 * EXACTLY one entry per item. Refuses an item without an id or without source rows (an untraceable output is never emitted),
 * and a duplicated item id.
 */
export function runMechanism(items) {
  if (!Array.isArray(items)) throw new MechanismRefused("ITEMS_ABSENT", "the mechanism runs over a list of items");
  const out = new Map();
  for (const it of items) {
    if (typeof it?.itemId !== "string" || it.itemId === "") throw new MechanismRefused("ITEM_ID_ABSENT", "every item keeps its identity");
    if (!Array.isArray(it.sourceRowIds) || it.sourceRowIds.length === 0 || it.sourceRowIds.some((s) => typeof s !== "string" || s === "")) throw new MechanismRefused("ITEM_UNTRACEABLE", "an item without source rows cannot carry a trace");
    if (out.has(it.itemId)) throw new MechanismRefused("ITEM_DUPLICATED", "an item occurs twice");
    const { classes, rules } = classifyWording(it.query);
    out.set(it.itemId, Object.freeze({
      classes: Object.freeze(classes),
      trace: Object.freeze(rules.map((r) => Object.freeze({ cls: r.cls, ruleIds: Object.freeze(r.ruleIds), sourceRowIds: Object.freeze([...it.sourceRowIds]) }))),
      evidenceState: EVIDENCE_STATE,
    }));
  }
  return out;
}

/**
 * The trace law, checked over a whole output (C2): every item has one entry; every class is in the protocol, once; every
 * assigned class has a trace naming at least one rule and one source row; every entry is INFERRED. Returns fault codes.
 */
export function outputFaults(items, outputs) {
  const faults = [];
  for (const it of items) {
    const o = outputs.get(it.itemId);
    if (!o) { faults.push("ITEM_WITHOUT_ENTRY"); continue; }
    if (!Array.isArray(o.classes) || o.classes.some((c) => !CLASSES.includes(c)) || new Set(o.classes).size !== o.classes.length) faults.push("ENTRY_CLASS_INVALID");
    if (o.evidenceState !== EVIDENCE_STATE) faults.push("ENTRY_NOT_INFERRED");
    for (const c of o.classes ?? []) {
      const t = (o.trace ?? []).find((x) => x.cls === c);
      if (!t || !t.ruleIds?.length || !t.sourceRowIds?.length) faults.push("CLASS_WITHOUT_TRACE");
    }
  }
  for (const k of outputs.keys()) if (!items.some((it) => it.itemId === k)) faults.push("ENTRY_FOR_UNKNOWN_ITEM");
  return [...new Set(faults)];
}
