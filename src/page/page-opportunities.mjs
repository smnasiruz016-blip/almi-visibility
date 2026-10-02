/**
 * F91 · PAGE OPPORTUNITY PLANNING (acceptance _handoffs 2048dd3; Amendment 1 _handoffs 4ef1b9c, RR-130 §3–§4).
 *
 * THREE NUMBERS, NEVER ONE. Each is reported apart — its own count, its own denominator or stated unknown population, its inputs and their
 * sources, what was excluded and why, what is unknown, its method and its bound — never summed, never substituted, never a page total,
 * never a quota. Possible does not imply verified; verified does not authorise a page.
 *
 *   1 POSSIBLE COMBINATIONS   only dimensions the product declares and that APPLY: one → its declared values; several → only the
 *                             combinations the product declares relevant, else NOT MEASURED (never the product of the sizes). A CANDIDATE
 *                             UNIVERSE not yet verified for the product, a NOT APPLICABLE dimension, one with no value or no recorded
 *                             source is listed as EXCLUDED and never enters the arithmetic.
 *   2 VERIFIED OPPORTUNITIES  all four limbs RECORDED: qualifying demand (DEMAND_RULES, each state with the contract that decides it), a
 *                             credible source, verified product fit, a distinct need. Observed questions, inferred suggestions, owned
 *                             Search Console evidence and client claims are counted APART. A candidate with any limb unknown is UNKNOWN;
 *                             while one is, number 2 is NOT MEASURED — printed with verified-so-far, excluded-by-limb and unknown counts.
 *   3 GENUINELY NEEDED PAGES  only from a measured number 2. Questions merge only when identical after the stated normalisation, or by a
 *                             RECORDED sameness judgement (never across combinations without one, never by similarity); each need group is
 *                             COVERED (F33) · REFUSED (F36) · HELD (a named limb cannot be determined) · NEW (F33 NOT COVERED, F36
 *                             ESTABLISHED, facts, a sourced verified answer). Number 3 is the NEW count; HELD and COVERED are never pages.
 *   ORDER LAW                 all three measured → 1 ≥ 2 ≥ 3, else a planner DEFECT (DISPROVED), never reordered; any NOT MEASURED → the
 *                             order is NOT CHECKABLE, never "holding".
 *   A SAMPLE, THE HANDOFF     no claim that every question was collected; no promise of ranking, indexing or AI citation. A NEW group is an
 *                             OPPORTUNITY handed on in the page law's order — observed questions, then sourced and verified answers, then a
 *                             page. Nothing here drafts, answers or writes.
 * Pure: declared and recorded inputs in, counts out. Names no product, no dimension and no quota. Never fetches, renders or writes.
 */
export const NOT_MEASURED = "NOT MEASURED";
export const VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const LABELS = Object.freeze({
  possible: "POSSIBLE COMBINATIONS — candidates only; not pages, not a plan, not a target, not a potential, not a page estimate",
  verified: "VERIFIED OPPORTUNITIES — verified does not authorise a page",
  needed: "GENUINELY NEEDED PAGES — opportunities handed on; nothing is drafted or written here",
});
export const SAMPLE_NOTICE = "a recorded SAMPLE, never every question asked; no ranking, indexing or AI citation is promised";
export const APPLICABILITY = Object.freeze({ APPLIES: "APPLIES", CANDIDATE_UNIVERSE: "CANDIDATE UNIVERSE", NOT_APPLICABLE: "NOT APPLICABLE" });
export const MISSING = Object.freeze({
  noDimension: "a declared page dimension that applies to the product, with at least one declared value and a recorded source",
  combinationRule: "the product's declaration of which combinations of its several applicable dimensions are relevant",
  demandRecord: "a recorded demand state for the candidate — an empty sample is UNKNOWN, never zero demand",
  limb: "a recorded credible-source, product-fit or distinct-need record for the candidate",
});
/**
 * 🔴 THE DEMAND-STATE MAPPING (Amendment 1), each state with the contract that DECIDES it. A state not listed is UNKNOWN: no contract decides
 * it, and the implementation never does.
 */
export const DEMAND_RULES = Object.freeze({
  OBSERVED: Object.freeze({ qualifies: true, kind: "observedQuestions", by: "RR-130 §3; F14's evidence state OBSERVED from a named source" }),
  OWNED_OBSERVED: Object.freeze({ qualifies: true, kind: "ownedEvidence", by: "specification S1; F14's owned-behaviour category — labelled OWNED, never global" }),
  STRONG: Object.freeze({ qualifies: true, kind: "strongOutcomes", by: "V3 §5 as implemented by F35" }),
  INFERRED: Object.freeze({ qualifies: false, kind: "inferredSuggestions", by: "F14 — never INFERRED presented as OBSERVED" }),
  CLIENT_CLAIM: Object.freeze({ qualifies: false, kind: "clientClaims", by: "F16 C3; RR-89 §1.2 — not evidence" }),
  MONITOR: Object.freeze({ qualifies: false, kind: "monitorOutcomes", by: "V3 §5; F14 — never proof of no demand" }),
  COMPETITOR_COVERAGE: Object.freeze({ qualifies: false, kind: "competitorCoverage", by: "F14 — supply diagnosis only" }),
});
const KINDS = [...new Set(Object.values(DEMAND_RULES).map((r) => r.kind)), "unknownStates"];
const OTHER_LIMBS = Object.freeze(["credibleSource", "productFit", "distinctNeed"]);
const measured = (v) => Number.isInteger(v);
const nm = (missing) => ({ value: NOT_MEASURED, missing });
export const candidateKey = (c) => JSON.stringify(Object.keys(c).sort().map((k) => [k, c[k]]));

/* ================= 1 ================= */

/** `dimensions`: [{ key, values, source, applicability, limits, exclusions }] as the product declares them. */
export function possibleCombinations({ dimensions = [], declaredCombinations = null }) {
  const excluded = [];
  const used = [];
  for (const d of dimensions) {
    const why = d.applicability === APPLICABILITY.NOT_APPLICABLE ? "NOT APPLICABLE to this product"
      : d.applicability === APPLICABILITY.CANDIDATE_UNIVERSE ? "a CANDIDATE UNIVERSE not yet verified for this product — never multiplied, never a target"
        : d.applicability !== APPLICABILITY.APPLIES ? "no recorded applicability"
          : !(typeof d.source === "string" && d.source.trim() !== "") ? "no recorded source"
            : !(Array.isArray(d.values) && d.values.length > 0) ? "no declared value" : null;
    if (why) excluded.push({ key: d.key, why }); else used.push(d);
  }
  const usedKeys = new Set(used.map((d) => d.key));
  let candidates = null, missing = null;
  if (used.length === 0) missing = MISSING.noDimension;
  else if (used.length === 1) candidates = used[0].values.map((v) => ({ [used[0].key]: v }));
  else if (Array.isArray(declaredCombinations)) {
    /* a declared combination counts only over the APPLYING dimensions' declared values — never an excluded dimension, never a new value */
    const ok = (c) => Object.keys(c).length > 0 && Object.entries(c).every(([k, v]) => usedKeys.has(k) && used.find((d) => d.key === k).values.includes(v));
    candidates = [...new Map(declaredCombinations.filter(ok).map((c) => [candidateKey(c), c])).values()];
    const dropped = declaredCombinations.length - candidates.length;
    if (dropped) excluded.push({ key: "declared combinations", why: `${dropped} name an excluded dimension, an undeclared value, or repeat another` });
  } else missing = MISSING.combinationRule;
  return {
    label: LABELS.possible,
    ...(candidates ? { value: candidates.length } : nm(missing)),
    candidates,
    dimensions: used.map((d) => ({ key: d.key, values: d.values.length, source: d.source, limits: d.limits ?? "none recorded", exclusions: d.exclusions ?? "none recorded" })),
    excluded,
    method: used.length > 1 ? "the combinations the product declares relevant — never the product of the dimensions' sizes" : "the declared values of the product's one applying dimension",
  };
}

/* ================= 2 ================= */

/** One candidate's demand from its recorded items: true (qualifies) · false (decided, not qualifying) · undefined (UNKNOWN). */
export function demandOf(items = []) {
  const rules = items.map((i) => DEMAND_RULES[i?.state] ?? null);
  if (rules.some((r) => r?.qualifies === true)) return true;
  if (rules.length === 0 || rules.some((r) => r === null)) return undefined;
  return false;
}

/** `records`: Map(candidateKey → { demand: [{ state, questionId?, wording? }], credibleSource, productFit, distinctNeed }) — RECORDED only. */
export function verifiedOpportunities({ possible, records = new Map() }) {
  const kinds = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const excluded = Object.fromEntries(["demand", ...OTHER_LIMBS].map((l) => [l, 0]));
  const base = { label: LABELS.verified, excluded, kinds, of: possible.value };
  if (!measured(possible.value)) return { ...base, ...nm(`number 1, which is itself NOT MEASURED — ${possible.missing}`), verifiedSoFar: null, unknown: null, opportunities: null };
  const opportunities = [];
  let unknown = 0;
  for (const c of possible.candidates) {
    const r = records.get(candidateKey(c));
    for (const i of r?.demand ?? []) kinds[DEMAND_RULES[i?.state]?.kind ?? "unknownStates"] += 1;
    const met = { demand: demandOf(r?.demand), credibleSource: r?.credibleSource, productFit: r?.productFit, distinctNeed: r?.distinctNeed };
    const failed = Object.keys(met).find((l) => met[l] === false);
    if (failed) { excluded[failed] += 1; continue; }
    if (Object.values(met).some((v) => v !== true)) { unknown += 1; continue; }
    opportunities.push(c);
  }
  const counts = { verifiedSoFar: opportunities.length, unknown };
  if (unknown > 0) return { ...base, ...nm(`${MISSING.demandRecord}, or ${MISSING.limb} — ${unknown} of ${possible.value} candidate(s) UNKNOWN`), ...counts, opportunities: null };
  return { ...base, value: opportunities.length, ...counts, opportunities };
}

/* ================= 3 ================= */

/** The stated normalisation for "identical": letter case, runs of white space, terminal punctuation. Nothing else — no similarity. */
export const normaliseWording = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim().replace(/[\s.?!,;:]+$/u, "");

export const HELD = Object.freeze({
  coverage: "existing-page coverage cannot be decided (F33 CANNOT DECIDE, or no decision recorded)",
  rightToExist: "the right to exist cannot be decided (F36 CANNOT DECIDE, or no outcome recorded)",
  facts: "no verified facts recorded for the need (F44)",
  answer: "no sourced and verified answer recorded — the answer-finding row's work, never F91's",
});

/**
 * `questions`: Map(candidateKey → [{ id, wording }]); `sameness`: [[questionIdA, questionIdB]] RECORDED judgements; `groupRecords`:
 * Map(groupKey → { coverage: "COVERED"|"NOT_COVERED"|"CANNOT_DECIDE", rightToExist: "ESTABLISHED"|"REFUSED"|"CANNOT DECIDE",
 * uniqueValue?: boolean, verifiedFacts?: boolean, verifiedAnswer?: boolean }) — F33, F36, F32, F44 and the answer row's records.
 */
export function neededPages({ verified, questions = new Map(), sameness = [], groupRecords = new Map() }) {
  if (!measured(verified.value)) return { label: LABELS.needed, ...nm(`number 2, which is itself NOT MEASURED — ${verified.missing}`) };
  /* union-find over question ids and candidates: a question belongs to its candidate; identical wording merges inside ONE candidate only */
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const add = (x) => { if (!parent.has(x)) parent.set(x, x); };
  const union = (a, b) => { add(a); add(b); const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  const qOwner = new Map();
  let questionsIn = 0, mergedQuestions = 0;
  for (const c of verified.opportunities) {
    const ck = `c:${candidateKey(c)}`;
    add(ck);
    const seen = new Map();
    for (const q of questions.get(candidateKey(c)) ?? []) {
      questionsIn += 1;
      const qk = `q:${q.id}`;
      qOwner.set(q.id, ck);
      union(qk, ck);
      const w = normaliseWording(q.wording);
      if (w !== "" && seen.has(w)) mergedQuestions += 1; else seen.set(w, q.id);
    }
  }
  let judgementsApplied = 0, judgementsIgnored = 0;
  for (const [a, b] of sameness) {
    if (qOwner.has(a) && qOwner.has(b)) { if (find(`q:${a}`) !== find(`q:${b}`)) mergedQuestions += 1; union(`q:${a}`, `q:${b}`); judgementsApplied += 1; } else judgementsIgnored += 1;
  }
  const groups = new Map();
  for (const c of verified.opportunities) {
    const root = find(`c:${candidateKey(c)}`);
    groups.set(root, [...(groups.get(root) ?? []), candidateKey(c)]);
  }
  const out = { covered: 0, refused: 0, held: 0, heldBy: Object.fromEntries(Object.keys(HELD).map((k) => [k, 0])), new: 0 };
  for (const members of groups.values()) {
    const g = groupRecords.get(JSON.stringify([...members].sort())) ?? {};
    const hold = (why) => { out.held += 1; out.heldBy[why] += 1; };
    if (g.coverage === "COVERED") { out.covered += 1; continue; }
    if (g.coverage !== "NOT_COVERED") { hold("coverage"); continue; }
    if (g.rightToExist === "REFUSED" || g.uniqueValue === false) { out.refused += 1; continue; }
    if (g.rightToExist !== "ESTABLISHED") { hold("rightToExist"); continue; }
    if (g.verifiedFacts !== true) { hold("facts"); continue; }
    if (g.verifiedAnswer !== true) { hold("answer"); continue; }
    out.new += 1;
  }
  const mergedCandidates = verified.opportunities.length - groups.size;
  return {
    label: LABELS.needed, value: out.new, groups: groups.size, of: verified.value,
    merged: { questions: mergedQuestions, of: questionsIn, candidatesJoined: mergedCandidates, judgementsApplied, judgementsIgnored },
    covered: out.covered, refused: out.refused, held: out.held, heldBy: out.heldBy,
    method: "merge only identical wording (stated normalisation) or a recorded sameness judgement; then F33 coverage, F36 right to exist, F32 unique value, verified facts and a sourced answer",
  };
}

/** The order law: checked only when all three are numbers; a breach is a DEFECT, never reordered. */
export function orderLaw(n1, n2, n3) {
  if (![n1, n2, n3].every((n) => measured(n.value))) return { state: "NOT CHECKABLE", verdict: VERDICT.COULD_NOT_PROVE };
  return n1.value >= n2.value && n2.value >= n3.value ? { state: "HOLDS", verdict: VERDICT.PROVED } : { state: "BREACHED — a planner defect", verdict: VERDICT.DISPROVED };
}

export function planPages({ dimensions, declaredCombinations = null, records = new Map(), questions = new Map(), sameness = [], groupRecords = new Map() }) {
  const possible = possibleCombinations({ dimensions, declaredCombinations });
  const verified = verifiedOpportunities({ possible, records });
  const needed = neededPages({ verified, questions, sameness, groupRecords });
  const order = orderLaw(possible, verified, needed);
  return { possible, verified, needed, order, verdict: order.verdict, notice: SAMPLE_NOTICE };
}

/** C4/C6: one number's line — a value or NOT MEASURED with its missing input; never 0 in its place, never summed with another. */
export const formatNumber = (n) => (measured(n.value) ? `${n.label}: ${n.value}` : `${n.label}: NOT MEASURED — missing ${n.missing}`);
