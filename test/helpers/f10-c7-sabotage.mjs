/**
 * 🔴 F10 · C7 — THE TEN FIRING CONTROLS, EACH SHOWN FIRING: one sabotage removes the branch a control depends on, the named
 * test must turn RED for the intended reason (an assertion message of that test, never a test name), and the file is restored
 * byte-for-byte (F10 Amendment 1, _handoffs 2ee6c2a; the controls of ed85493 §4.1 / 148d48f §4.2).
 *
 *   node test/helpers/f10-c7-sabotage.mjs [--only=C7-S1,…]
 *
 *   1 duplicates ............................. C7-S1, S2       6 cross-tenant access ............ C7-S4, S5
 *   2 generic need-blind output .............. C7-S6, S20      7 insufficient valid denominator . C7-S12
 *   3 re-paired negatives .................... C7-S3           8 insufficient class populations . C7-S13, S14
 *   4 abstentions ............................ C7-S10, S11     9 weak precision / kappa / sens. . C7-S7, S8, S9
 *   5 missing outputs ........................ C7-S15          10 score retry ................... C7-S16, S17
 *   and: the incomplete-key preflight (C7-S18) · the paired release on the route (C7-S19) · the trace law (C7-S21) ·
 *   the tenant-common-term rule (C7-S22) and its per-tenant isolation (C7-S23)
 */
import { runSabotages } from "./f08-sabotage.mjs";

const T = "test/f10-c7-follow-up.test.mjs";
const PAIRS = "src/discovery/follow-up-pairs.mjs";
const MECH = "src/discovery/follow-up-questions.mjs";
const RULE = "src/heldout/follow-up-rule.mjs";
const LIFE = "src/heldout/lifecycle.mjs";
const ROUTE = "src/governance/governed-scoring.mjs";
const N = {
  dup: "F10 · C7 · CONTROL 1 · DUPLICATES", repair: "F10 · C7 · CONTROL 3 · RE-PAIRED NEGATIVES", tenant: "F10 · C7 · CONTROL 6 · CROSS-TENANT ACCESS",
  blind: "F10 · C7 · CONTROL 2 · GENERIC NEED-BLIND OUTPUT", weak: "F10 · C7 · CONTROL 9 · WEAK PRECISION", abst: "F10 · C7 · CONTROL 4 · ABSTENTIONS",
  denom: "F10 · C7 · CONTROL 7 · INSUFFICIENT VALID DENOMINATOR", pop: "F10 · C7 · CONTROL 8 · INSUFFICIENT CLASS POPULATIONS",
  missing: "F10 · C7 · CONTROL 5 · MISSING OUTPUTS", retry: "F10 · C7 · CONTROL 10 · SCORE RETRY", incomplete: "F10 · C7 · an INCOMPLETE key",
  route: "F10 · C7 · the SEPARATE governed route", mech: "F10 · C7 · the mechanism is NEED-AWARE", common: "F10 · C7 · a term MOST of a tenant",
};

export function f10C7Sabotages() {
  return [
    { id: "C7-S1", what: "1 · a duplicated sealed item is not refused", file: PAIRS, test: T, named: N.dup,
      from: " || new Set(items).size !== items.length)", to: ")", expect: /a duplicated sealed item was paired/ },
    { id: "C7-S2", what: "1 · re-pairs may coincide with existing pairs, and the distinct-pairs check is gone", test: T, named: N.dup,
      edits: [
        { file: PAIRS, from: "x !== m.need && x !== m.cand && !seen.has(key(x, m.cand))", to: "x !== m.need && x !== m.cand" },
        { file: PAIRS, from: '  if (new Set(out.map((p) => key(p.need, p.cand))).size !== out.length) throw new PairRuleRefused("PAIR_DUPLICATED", "the pair population holds a duplicate");', to: "  // sabotaged: distinctness is not checked" },
      ],
      expect: /the pair rule did not reproduce the approved feasibility/ },
    { id: "C7-S3", what: "3 · no re-paired negative control is made", file: PAIRS, test: T, named: N.repair,
      from: "      if (j) { out.push(", to: "      if (false) { out.push(", expect: /the negative-control population is too small or absent/ },
    { id: "C7-S4", what: "6 · a key and a pair set of different tenant scopes are granted", file: LIFE, test: T, named: N.tenant,
      from: '  if (!sameTenantScope(k, setEntry)) return "PAIR_CROSSES_TENANTS";', to: "  // sabotaged: tenant scopes are not compared",
      expect: /a key and pair set spanning different tenant scopes were granted/ },
    { id: "C7-S5", what: "6 · an item under two tenants is paired", file: PAIRS, test: T, named: N.tenant,
      from: "items.some((x) => everyItem.has(x)) || ", to: "", expect: /an item under two tenants was paired/ },
    { id: "C7-S6", what: "2 · need-sensitivity is not a condition of PASS — a need-blind mechanism escapes its failure", file: RULE, test: T, named: N.blind,
      from: '  if (needSensitivity < bar.minNeedSensitivity) failing.push("NEED_SENSITIVITY");', to: "  // sabotaged: need-sensitivity is not checked",
      expect: /a need-blind mechanism did not FAIL on need-sensitivity/ },
    { id: "C7-S7", what: "9 · precision is not a condition of PASS", file: RULE, test: T, named: N.weak,
      from: '  if (precision < bar.minPrecision) failing.push("PRECISION");', to: "  // sabotaged: precision is not checked",
      expect: /weak precision alone did not FAIL on precision/ },
    { id: "C7-S8", what: "9 · kappa is not a condition of PASS", file: RULE, test: T, named: N.weak,
      from: '  if (kappa === null || kappa < bar.kappaBar) failing.push("KAPPA");', to: "  // sabotaged: kappa is not checked",
      expect: /weak kappa alone did not FAIL on kappa/ },
    { id: "C7-S9", what: "9 · need-sensitivity is not a condition of PASS", file: RULE, test: T, named: N.weak,
      from: '  if (needSensitivity < bar.minNeedSensitivity) failing.push("NEED_SENSITIVITY");', to: "  // sabotaged: need-sensitivity is not checked",
      expect: /weak need-sensitivity alone did not FAIL on need-sensitivity/ },
    { id: "C7-S10", what: "4 · coverage is not a condition of PASS — a mechanism may abstain its way to agreement", file: RULE, test: T, named: N.abst,
      from: '  if (coverage < bar.minCoverage) failing.push("COVERAGE");', to: "  // sabotaged: coverage is not checked",
      expect: /all-ABSTAIN did not FAIL on coverage/ },
    { id: "C7-S11", what: "4 · the mechanism's ABSTAIN reaches the scorer as a NO", file: MECH, test: T, named: N.abst,
      from: 'e.answer === "ABSTAIN" ? { abstain: true } :', to: 'false ? { abstain: true } :',
      expect: /the mechanism's ABSTAIN reached the scorer as a NO/ },
    { id: "C7-S12", what: "7 · D7 below 0.8 × N7 still reports a rate", file: RULE, test: T, named: N.denom,
      from: '  if (D < bar.minValidShare * N) return { result: "INVALID", reason: "DENOMINATOR_BELOW_MINIMUM", N, D };', to: "  // sabotaged: the valid denominator is not checked",
      expect: /exclusions beyond 20% produced a rate/ },
    { id: "C7-S13", what: "8 · too few LIKELY_NEXT or NOT_LIKELY_NEXT is assessed", file: RULE, test: T, named: N.pop,
      from: '  if (pos < bar.minPositives || neg < bar.minNegatives) return { result: "UNKNOWN", reason: "CLASS_POPULATION_BELOW_MINIMUM", N, D, pos, neg };', to: "  // sabotaged: class minima are not checked",
      expect: /too few LIKELY_NEXT was assessed/ },
    { id: "C7-S14", what: "8 · too few discordant pairs is assessed", file: RULE, test: T, named: N.pop,
      from: '  if (discordant < bar.minDiscordant) return { result: "UNKNOWN", reason: "TOO_FEW_DISCORDANT_PAIRS", N, D, pos, neg, discordant };', to: "  // sabotaged: the discordant minimum is not checked",
      expect: /too few discordant pairs was assessed/ },
    { id: "C7-S15", what: "5 · a missing output is scored as a NO", test: T, named: N.missing,
      edits: [
        { file: LIFE, from: '  if (items.some((i) => !outputs.has(i))) invalid("INPUT_MISSING");', to: "  // sabotaged: a missing output is not refused" },
        { file: LIFE, from: "  const positive = (i, c) => !isAbstain(outputs.get(i)) && outputs.get(i).classes.includes(c);", to: "  const positive = (i, c) => !isAbstain(outputs.get(i)) && (outputs.get(i)?.classes ?? []).includes(c);" },
      ],
      expect: /a missing output yielded a result/ },
    { id: "C7-S16", what: "10 · the idempotency key is not stable across attempts, so a retry of a committed C7 run runs again", test: T, named: N.retry,
      edits: [
        { file: ROUTE, from: "  const combination = combinationOf(req);", to: "  const combination = combinationOf(req);\n  const NONCE = sha256(String(Math.random()));" },
        { file: ROUTE, from: "repoRelativeTarget: releaseStore, occurrenceFingerprint: combination });", to: "repoRelativeTarget: releaseStore, occurrenceFingerprint: NONCE });" },
        { file: ROUTE, from: "occurredAt, occurrenceFingerprint: combination, evidenceRefs: [] };", to: "occurredAt, occurrenceFingerprint: NONCE, evidenceRefs: [] };" },
      ],
      expect: /a retry of a committed C7 run ran again/ },
    { id: "C7-S16b", what: "10 · an unstable key AND no claim check — a retry makes a second claim and a second release", test: T, named: N.retry,
      edits: [
        { file: ROUTE, from: "  const combination = combinationOf(req);", to: "  const combination = combinationOf(req);\n  const NONCE = sha256(String(Math.random()));" },
        { file: ROUTE, from: "repoRelativeTarget: releaseStore, occurrenceFingerprint: combination });", to: "repoRelativeTarget: releaseStore, occurrenceFingerprint: NONCE });" },
        { file: ROUTE, from: "occurredAt, occurrenceFingerprint: combination, evidenceRefs: [] };", to: "occurredAt, occurrenceFingerprint: NONCE, evidenceRefs: [] };" },
        { file: LIFE, from: "  if (eventsOf(audit).some((e) => e.action === LINKED_ACTIONS.CLAIMED && e.metadata.combination === combination))", to: "  if (false)" },
      ],
      expect: /a retry of a committed C7 run ran again/ },
    { id: "C7-S17", what: "10 · a scorer whose frozen version no longer matches its code is run", file: ROUTE, test: T, named: N.retry,
      from: "      if (typeof currentScorerHash !== \"string\" || currentScorerHash !== req.scorerHash)", to: "      if (false)",
      expect: /a scorer whose frozen version no longer matches its code reached scoring/ },
    { id: "C7-S18", what: "an incomplete key is not refused before the claim — the owner's one run is spent", file: LIFE, test: T, named: N.incomplete,
      from: '  if (items.some((i) => !parsed.rows.has(i))) refuse("INPUT_MISSING");', to: "  // sabotaged: an incomplete key is not refused",
      expect: /an incomplete key SPENT the once-only run/ },
    { id: "C7-S19", what: "the C7 release drops the paired aggregates", file: ROUTE, test: T, named: N.route,
      from: "        ...(scored.discordantPairs !== undefined ? {", to: "        ...(false ? {",
      expect: /the C7 release lacks abstentions/ },
    { id: "C7-S20", what: "2 · the mechanism ignores the need — it judges the candidate alone", file: MECH, test: T, named: N.mech,
      from: "  const a = contentTerms(needText), b = contentTerms(candText);", to: "  const a = contentTerms(candText), b = contentTerms(candText);",
      expect: /the mechanism answered one candidate alike for two different needs/ },
    { id: "C7-S21", what: "a YES without the need's source rows passes the trace law", file: MECH, test: T, named: N.mech,
      from: "!t.needSourceRowIds?.length || ", to: "",
      expect: /a YES without a trace was not a fault/ },
    { id: "C7-S22", what: "2 · a tenant-wide topic word counts as a link — every question of a tenant looks like every other", file: MECH, test: T, named: N.common,
      from: "judgePair(n.query, c.query, common.get(p.need))", to: "judgePair(n.query, c.query)",
      expect: /a tenant-wide topic word made a YES/ },
    { id: "C7-S23", what: "6 · every tenant's wording is pooled into one common-term set", file: MECH, test: T, named: N.common,
      from: "for (const x of parent.keys()) { const r = find(x);", to: 'for (const x of parent.keys()) { const r = "ALL";',
      expect: /a term common only in ANOTHER tenant was treated as common here/ },
  ];
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const all = f10C7Sabotages();
  const list = only.length ? all.filter((s) => only.includes(s.id)) : all;
  console.log("F10 · C7 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
