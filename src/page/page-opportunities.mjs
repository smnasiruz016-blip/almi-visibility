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
 *   3 NEEDED NEW PAGES        🔴 Amendment 3 C14 (_handoffs b8a4ea5): the needs F35 chooses CREATE for under P19, split by tier — no
 *                             number-2 limb and no demand limb, for any tier. Until F35 decides grouped needs (R3) it is NOT MEASURED, that
 *                             missing input named — never 0. (groupOpportunities below groups number 2's opportunities by C3's merge limbs;
 *                             it is NOT number 3.)
 *   C13 SEPARATE LINES        possible combinations · verified opportunities (observed and verified only) · research-derived opportunities
 *                             (never inside verified opportunities, never called demand) · client-received questions (NOT MEASURED until
 *                             their intake exists) · owned search evidence (never client-received, never public demand) · needed new pages
 *                             by tier · KEEP, IMPROVE, ADD SECTION, HOLD and REJECT/CONNECT, each on its own line. NEVER SUMMED. Every line
 *                             is AS AT its time and states how many it left out. NOT MEASURED is never zero.
 *   C15 NO ORDER              no ordering is asserted, checked or implied between the lines; possible combinations is not an upper bound
 *                             on anything.
 *   A SAMPLE, THE HANDOFF     no claim that every question was collected; no promise of ranking, indexing or AI citation. The order is
 *                             relevant questions, observed or research-derived, then supported answers, then the page (C16). Nothing here
 *                             drafts, answers or writes.
 * Pure: declared and recorded inputs in, counts out. Names no product, no dimension and no quota. Never fetches, renders or writes.
 */
export const NOT_MEASURED = "NOT MEASURED";
export const VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const LABELS = Object.freeze({
  possible: "POSSIBLE COMBINATIONS — candidates only; not pages, not a plan, not a target, not a potential, not a page estimate, not an upper bound on any other line",
  verified: "VERIFIED OPPORTUNITIES — observed and verified only; verified does not authorise a page",
  groups: "GROUPS OF VERIFIED OPPORTUNITIES (C3's merge limbs) — not number 3",
  researchDerived: "RESEARCH-DERIVED OPPORTUNITIES — page candidates a relevant research-derived question connects to; never inside verified opportunities, never demand",
  clientReceived: "CLIENT-RECEIVED QUESTIONS",
  ownedSearch: "OWNED SEARCH EVIDENCE — the client's own search records; never client-received, never public demand",
  needed: "NEEDED NEW PAGES — the needs F35 chooses CREATE for; nothing is drafted or written here",
});
/** C13: the five action lines, each its own line; until F35 decides grouped needs (R3) each is NOT MEASURED. */
export const ACTION_LINES = Object.freeze(["KEEP", "IMPROVE", "ADD SECTION", "HOLD", "REJECT/CONNECT"]);
export const TIER_NAMES = Object.freeze(["OBSERVED", "RESEARCH-DERIVED"]);
export const F35_GROUPED = "F35's decision for each grouped need (F35 Amendment 1, R3) — not yet recorded";
export const NO_CLIENT_INTAKE = "a client-received question intake — none exists yet";
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
  "RESEARCH-DERIVED": Object.freeze({ qualifies: false, kind: "researchDerived", by: "F91 Amendment 3 C13/C16 — never inside verified opportunities, never demand" }),
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
  /* C18: HELD means UNSUPPORTED — a supported answer under C17; never "not officially verified" */
  answer: "no supported answer under C17 recorded for the need's central answer — the answer-finding row's work, never F91's",
});

/**
 * `questions`: Map(candidateKey → [{ id, wording }]); `sameness`: [[questionIdA, questionIdB]] RECORDED judgements; `groupRecords`:
 * Map(groupKey → { coverage: "COVERED"|"NOT_COVERED"|"CANNOT_DECIDE", rightToExist: "ESTABLISHED"|"REFUSED"|"CANNOT DECIDE",
 * uniqueValue?: boolean, verifiedFacts?: boolean, verifiedAnswer?: boolean }) — F33, F36, F32, F44 and the answer row's records
 * (`verifiedAnswer` reads "a supported answer under C17", C18). 🔴 This groups NUMBER 2's opportunities by C3's merge limbs; it is NOT number 3
 * (C14) — number 3 is neededNewPages, which takes no number-2 limb.
 */
export function groupOpportunities({ verified, questions = new Map(), sameness = [], groupRecords = new Map() }) {
  if (!measured(verified.value)) return { label: LABELS.groups, ...nm(`number 2, which is itself NOT MEASURED — ${verified.missing}`) };
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
    label: LABELS.groups, value: out.new, groups: groups.size, of: verified.value,
    merged: { questions: mergedQuestions, of: questionsIn, candidatesJoined: mergedCandidates, judgementsApplied, judgementsIgnored },
    covered: out.covered, refused: out.refused, held: out.held, heldBy: out.heldBy,
    method: "merge only identical wording (stated normalisation) or a recorded sameness judgement; then F33 coverage, F36 right to exist, F32 unique value, verified facts and a sourced answer",
  };
}

/**
 * C14 · NUMBER 3, BY TIER — the needs F35 chooses CREATE for. `needs`: [{ needId, tier }]; `decisions`: Map(needId → F35's decision) or null.
 * It takes NO number-2 limb and NO demand limb. With no F35 decision for grouped needs (R3), every tier is NOT MEASURED with that input named.
 */
export function neededNewPages({ needs = [], decisions = null }) {
  return Object.freeze(Object.fromEntries(TIER_NAMES.map((tier) => {
    const mine = needs.filter((n) => n.tier === tier);
    if (!(decisions instanceof Map)) return [tier, Object.freeze({ label: `${LABELS.needed} · ${tier}`, ...nm(F35_GROUPED), leftOut: mine.length, leftOutWhy: "every need of this tier — none decided by F35 yet" })];
    const decided = mine.filter((n) => decisions.has(n.needId));
    const create = decided.filter((n) => (decisions.get(n.needId)?.actions ?? []).some((a) => a.action === "CREATE")).length;
    if (decided.length < mine.length) return [tier, Object.freeze({ label: `${LABELS.needed} · ${tier}`, ...nm(`${F35_GROUPED} for ${mine.length - decided.length} of ${mine.length} need(s)`), leftOut: mine.length - decided.length, leftOutWhy: "needs F35 has not decided" })];
    return [tier, Object.freeze({ label: `${LABELS.needed} · ${tier}`, value: create, of: mine.length, leftOut: 0, leftOutWhy: "none" })];
  })));
}

/** C13 · the five action lines — each NOT MEASURED, its missing input named, until F35 decides grouped needs (R3). Never 0. */
export function actionLines({ needs = [] }) {
  return Object.freeze(Object.fromEntries(ACTION_LINES.map((a) => [a, Object.freeze({ label: a, ...nm(F35_GROUPED), leftOut: needs.length, leftOutWhy: "every need — none decided by F35 yet" })])));
}

/**
 * `needs`: the connection readback's needs ({ needId, tier }); `asAt`: the moment the lines are taken; `demandCounts`: per-state item counts
 * of the planning store's demand rows, with those left out. Every line is its own; nothing here sums two of them, and no order is checked.
 */
export function planPages({ dimensions, declaredCombinations = null, records = new Map(), questions = new Map(), sameness = [], groupRecords = new Map(), needs = [], decisions = null, asAt = NOT_MEASURED, leftOutByDemand = {} }) {
  const possible = possibleCombinations({ dimensions, declaredCombinations });
  const verified = verifiedOpportunities({ possible, records });
  const groups = groupOpportunities({ verified, questions, sameness, groupRecords });
  const rdCandidates = [...records.entries()].filter(([, r]) => (r?.demand ?? []).some((i) => i?.state === "RESEARCH-DERIVED")).length;
  const ownedItems = [...records.values()].reduce((n, r) => n + (r?.demand ?? []).filter((i) => i?.state === "OWNED_OBSERVED").length, 0);
  const lines = {
    possible: { ...possible, leftOut: possible.excluded.length, leftOutWhy: "excluded dimensions or declarations" },
    verified: { ...verified, leftOut: measured(verified.of) ? Object.values(verified.excluded).reduce((a, b) => a + b, 0) + (verified.unknown ?? 0) : NOT_MEASURED, leftOutWhy: "candidates excluded by a limb, or UNKNOWN — a research-derived item never qualifies" },
    researchDerived: { label: LABELS.researchDerived, value: rdCandidates, leftOut: leftOutByDemand["RESEARCH-DERIVED"] ?? 0, leftOutWhy: "research-derived connections whose question was overturned" },
    clientReceived: { label: LABELS.clientReceived, ...nm(NO_CLIENT_INTAKE), leftOut: NOT_MEASURED, leftOutWhy: NO_CLIENT_INTAKE },
    ownedSearch: { label: LABELS.ownedSearch, value: ownedItems, leftOut: leftOutByDemand.OWNED_OBSERVED ?? 0, leftOutWhy: "owned items whose question was overturned" },
  };
  const needed = neededNewPages({ needs, decisions });
  const actions = actionLines({ needs });
  return { possible, verified, groups, lines, needed, actions, asAt, notice: SAMPLE_NOTICE };
}

/** C4/C6/C13: one line — a value or NOT MEASURED with its missing input; never 0 in its place, never summed with another. */
export const formatNumber = (n) => (measured(n.value) ? `${n.label}: ${n.value}` : `${n.label}: NOT MEASURED — missing ${n.missing}`);
/** C13: a line with its AS AT and its left-out count. */
export const formatLine = (n, asAt) => `${formatNumber(n)} · ${asAt} · left out ${n.leftOut} (${n.leftOutWhy})`;
