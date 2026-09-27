/**
 * 🔴 F10 · C7 · LIKELY FOLLOW-UP QUESTIONS — the frozen pair rule, the INFERRED follow-up mechanism, the frozen verdict, and the
 * SEPARATE governed C7 route through F07 Amendment 3's paired release (F10 Amendment 1, _handoffs 2ee6c2a; bar ed85493).
 *
 * THE TEN FIRING CONTROLS (ed85493 §4.1 / 148d48f §4.2), each a named test below and each turned RED by a named sabotage
 * (test/helpers/f10-c7-sabotage.mjs): 1 duplicates · 2 generic need-blind output · 3 re-paired negatives · 4 abstentions ·
 * 5 missing outputs · 6 cross-tenant access · 7 insufficient valid denominator · 8 insufficient class populations ·
 * 9 weak precision / kappa / need-sensitivity · 10 score retry.
 *
 * SYNTHETIC SEALED MATERIAL ONLY: constructed identities (computed, never literal), constructed wording and constructed
 * judgements in OS temporary stores and confined audit stores. No real selection, no real key, no real label. The production
 * audit trail is hashed before and after.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { EVIDENCE_ROLE_REGISTRY, SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { C7_PROTOCOL, C7_BAR, C7_JUDGEMENTS, C7_RELEASE_STORE } from "../config/follow-up-questions.mjs";
import { PROTOCOL as C6_PROTOCOL } from "../config/human-questions.mjs";
import { followUpPairs, pairFeasibility, PairRuleRefused } from "../src/discovery/follow-up-pairs.mjs";
import { judgePair, runFollowUpMechanism, asScoredAnswers, followUpOutputFaults, contentTerms, MECHANISM_ID, MECHANISM_FILES, EVIDENCE_STATE } from "../src/discovery/follow-up-questions.mjs";
import { followUpVerdict, FOLLOW_UP_SCORER_ID, FOLLOW_UP_SCORER_FILES } from "../src/heldout/follow-up-rule.mjs";
import { governedScoring, versionHash, RELEASE_STORE, SCORER_ID } from "../src/governance/governed-scoring.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedAuditContext } from "../src/governance/governed-run.mjs";
import { resolveSealedStoreRoots } from "../src/governance/sealed-store-roots.mjs";
import { SYNTHETIC_SEALED_FIXTURE_ENV } from "../src/governance/synthetic-sealed-fixture.mjs";
import { populationCommitment, keyCommitment, freezeMechanism, requestHeldOutAccess, scoreClassification, LINKED_ACTIONS, EVALUATION_ACTIONS, MAX_PAIRED_PROTOCOL_TOKENS } from "../src/heldout/lifecycle.mjs";
import { countingStore } from "../tools/heldout-access-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();
const CONFINED_ENV = { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: process.env.NODE_TEST_WORKER_ID || "1" };
const ENV_REF = SEALED_STORE_ROOTS["f10-marking-key"].name;
const frac = (s) => parseInt(sha(s).slice(0, 8), 16) / 0xffffffff;
const CLS = C7_PROTOCOL.paired.cls;

/* ── A constructed population: three synthetic tenants, 12 · 10 · 8 sealed items, ids COMPUTED (never literal in this file) ── */
const RUN = Math.random().toString(36).slice(2, 8);
const idOf = (t, k) => `c7${sha(`c7-fixture|${RUN}|${t}|${k}`).slice(0, 10)}`;
const TENANTS = ["tenant:" + "c7".repeat(16), "tenant:" + "d8".repeat(16), "tenant:" + "e9".repeat(16)];
const MEMBERS = new Map(TENANTS.map((t, n) => [t, Array.from({ length: [12, 10, 8][n] }, (_, k) => idOf(n, k))]));
const PAIRS = followUpPairs(MEMBERS, C7_BAR.candidatesPerNeed);
const ITEMS = PAIRS.map((p) => p.id);
const MATCHED = new Map(PAIRS.filter((p) => p.kind === "MATCHED").map((p) => [`${p.need}>${p.cand}`, p]));
/* Constructed judgements, as in the approved packet's controls: a matched pair is LIKELY_NEXT about half the time, a re-pair
 * (the same candidate against an unrelated need) rarely; 4% CANNOT_TELL. */
const JUDGE = new Map(PAIRS.map((p) => {
  const r = frac(`truth|${RUN}|${p.id}`);
  const j = frac(`excl|${RUN}|${p.id}`) < 0.04 ? "CANNOT_TELL" : p.kind === "MATCHED" ? (r < 0.5 ? "LIKELY_NEXT" : "NOT_LIKELY_NEXT") : (r < 0.08 ? "LIKELY_NEXT" : "NOT_LIKELY_NEXT");
  return [p.id, j];
}));
const keyRows = (judge = JUDGE) => PAIRS.map((p) => ({ item: p.id, ...C7_JUDGEMENTS[judge.get(p.id)] }));
const isYes = (p) => JUDGE.get(p.id) === "LIKELY_NEXT";
const out = (f) => new Map(PAIRS.map((p) => [p.id, f(p)]));
const YES = { classes: [CLS] }, NO = { classes: [] }, ABSTAIN = { abstain: true };
const candQuality = new Map();
for (const p of PAIRS) if (p.kind === "MATCHED") candQuality.set(p.cand, (candQuality.get(p.cand) ?? false) || isYes(p));
const OUT = {
  perfect: () => out((p) => (isYes(p) ? YES : NO)),
  alwaysYes: () => out(() => YES),
  alwaysNo: () => out(() => NO),
  allAbstain: () => out(() => ABSTAIN),
  coinFlip: () => out((p) => (frac(`coin|${RUN}|${p.id}`) < 0.5 ? YES : NO)),
  needBlind: () => out((p) => (candQuality.get(p.cand) ? YES : NO)),
  abstainOn40: () => out((p) => (frac(`hard|${RUN}|${p.id}`) < 0.4 ? ABSTAIN : isYes(p) ? YES : NO)),
};

/* ── The lifecycle, in memory: the SAME aggregate scorer the governed route calls (F07 Amendment 3), then the frozen verdict ── */
const MECH = versionHash(REPO, MECHANISM_FILES);
const SCORER = versionHash(REPO, FOLLOW_UP_SCORER_FILES);
const REAL_OWNER = AUTHORITY_CORPUS.find((r) => r.status === "CURRENT" && r.issuer?.class === "OWNER");
const AUTH = [...AUTHORITY_CORPUS, { ...REAL_OWNER, authorityId: "synthetic:f10c7-evaluator", propositionId: "SYNTHETIC_F10C7_EVALUATOR", scope: ["ALMIVISIBILITY"], supersedes: [], supersededBy: [], contentHash: "e".repeat(64), issuedAt: "2026-01-01", effectiveFrom: "2026-01-01" }];
function store({ items = ITEMS, rows = keyRows(), keyTenants = TENANTS } = {}) {
  const dir = fs.mkdtempSync(join(os.tmpdir(), "f10c7-store-"));
  fs.mkdirSync(join(dir, "pairs"), { recursive: true });
  fs.mkdirSync(join(dir, "pairs-key"), { recursive: true });
  fs.writeFileSync(join(dir, "pairs", "pairs.txt"), items.join("\n") + "\n");
  const keyText = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  fs.writeFileSync(join(dir, "pairs-key", "judgements.jsonl"), keyText);
  const base = { scope: "constructed stand-in", source: "test", provenance: "test", capturedAt: "2026-09-27", mandatoryReadable: false, mayTrain: false, retiredReason: null, sealed: true, tenantScope: TENANTS };
  const SET = { ...base, id: "synthetic:f10c7-pairs", role: "HELD_OUT_EVIDENCE", resource: { root: "f10-marking-key", pathPrefixes: ["pairs/"] }, contentHash: populationCommitment(items), mayEvaluate: true, maySupplyExpectedAnswer: false };
  const KEY = { ...base, id: "synthetic:f10c7-judgements", role: "MARKING_KEY", resource: { root: "f10-marking-key", pathPrefixes: ["pairs-key/"] }, contentHash: keyCommitment({ "pairs-key/judgements.jsonl": Buffer.from(keyText) }), mayEvaluate: false, maySupplyExpectedAnswer: true, linkedSet: SET.id, tenantScope: keyTenants, labelVocabulary: [...C7_PROTOCOL.classes, ...C7_PROTOCOL.exclusions] };
  return { dir, SET, KEY, keyText, registry: [...EVIDENCE_ROLE_REGISTRY, SET, KEY], cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
const requestFor = (s, over = {}) => ({
  mechanismId: MECHANISM_ID, mechanismHash: MECH, sealedSetId: s.SET.id, populationCommitment: s.SET.contentHash, protocolId: C7_PROTOCOL.id,
  evaluatorAuthority: { propositionId: "SYNTHETIC_F10C7_EVALUATOR", scope: ["ALMIVISIBILITY"] }, purpose: "assessment", at: "2026-09-26T11:00:00Z", role: "evaluator",
  keySetId: s.KEY.id, keyCommitment: s.KEY.contentHash, scorerId: FOLLOW_UP_SCORER_ID, scorerHash: SCORER, ...over });
function memAudit() {
  const a = { store: countingStore(), actor: "test/f10c7", softwareVersion: "engine:test", correlationId: `run:f10c7:${Math.random()}`, authorityRef: { propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: ["ALMIVISIBILITY"] }, authorityHash: "d".repeat(64) };
  freezeMechanism({ audit: a, mechanismId: MECHANISM_ID, mechanismHash: MECH, frozenAt: "2026-09-26T10:00:00Z" });
  freezeMechanism({ audit: a, mechanismId: FOLLOW_UP_SCORER_ID, mechanismHash: SCORER, frozenAt: "2026-09-26T10:00:00Z" });
  return a;
}
/** Score one output set on one fresh audit (the once-only run is per combination per trail), then the frozen C7 verdict. */
function scoreMem(outputs, opts = {}) {
  const s = store(opts);
  try {
    const a = memAudit();
    const grant = requestHeldOutAccess({ audit: a, registry: s.registry, authorityRecords: AUTH, request: requestFor(s) });
    assert.equal(grant.allowed, true, `CONTROL: the synthetic C7 grant was refused (${grant.code})`);
    const roots = { "f10-marking-key": s.dir };
    const filesOf = (r) => (r === "f10-marking-key" ? fs.readdirSync(s.dir, { recursive: true }).map(String).map((p) => p.replace(/\\/g, "/")).filter((p) => fs.statSync(join(s.dir, p)).isFile()) : []);
    const scored = scoreClassification({ audit: a, grant, currentMechanismHash: MECH, registry: s.registry, roots, filesOf, outputs, protocol: C7_PROTOCOL, foreignRoots: roots });
    return { scored, verdict: followUpVerdict(scored, { bar: C7_BAR, protocol: C7_PROTOCOL }), audit: a };
  } finally { s.cleanup(); }
}
/** A constructed release, for isolating ONE branch of the verdict. */
const rel = ({ tp, fp, fn, tn }, { abstentions = 0, disc = 20, both = 16, excluded = 0 } = {}) => ({
  tables: { [CLS]: { tp, fp, fn, tn } }, declared: tp + fp + fn + tn + excluded, denominator: tp + fp + fn + tn,
  excluded: { EXCLUDED_PERSONAL: excluded, CANNOT_TELL: 0 }, abstentions, discordantPairs: disc, discordantBothCorrect: both,
});
const V = (r) => followUpVerdict(r, { bar: C7_BAR, protocol: C7_PROTOCOL });

/* ═══ THE FROZEN VALUES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

test("F10 · C7 · the nine approved values are exactly those approved, and the C7 protocol is a PAIRED protocol inside the seven-token ceiling", () => {
  assert.deepEqual({ ...C7_BAR }, { candidatesPerNeed: 2, minValidShare: 0.8, minPositives: 20, minNegatives: 20, minCoverage: 0.7, kappaBar: 0.6, minPrecision: 0.6, minDiscordant: 10, minNeedSensitivity: 0.6 });
  assert.equal(C7_PROTOCOL.paired.cls, "LIKELY_NEXT");
  assert.ok(C7_PROTOCOL.classes.length + C7_PROTOCOL.exclusions.length <= MAX_PAIRED_PROTOCOL_TOKENS);
  assert.notEqual(C7_RELEASE_STORE, RELEASE_STORE, "C7 shares C6's release store");
  assert.notEqual(C7_PROTOCOL.id, C6_PROTOCOL.id);
  assert.throws(() => followUpVerdict(rel({ tp: 30, fp: 5, fn: 5, tn: 160 }), { bar: { ...C7_BAR, minCoverage: undefined }, protocol: C7_PROTOCOL }), TypeError, "a verdict ran with an undeclared bar value");
});

/* ═══ THE PAIR RULE ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("F10 · C7 · CONTROL 1 · DUPLICATES — the pair rule reproduces the approved feasibility exactly (374 = 192 + 182, per tenant) with every pair DISTINCT; a duplicated sealed item is refused", () => {
  const f = pairFeasibility([37, 22, 16, 12, 5, 2, 2, 2, 2], C7_BAR.candidatesPerNeed);
  assert.deepEqual([f.declared, f.matched, f.repaired], [374, 192, 182], "the pair rule did not reproduce the approved feasibility");
  assert.deepEqual(f.perTenant, [[74, 74], [44, 44], [32, 32], [24, 24], [10, 8], [2, 0], [2, 0], [2, 0], [2, 0]]);
  const keys = PAIRS.map((p) => `${p.need}>${p.cand}`);
  assert.equal(new Set(keys).size, keys.length, "the constructed pair population holds a duplicate");
  const t0 = MEMBERS.get(TENANTS[0]);
  assert.throws(() => followUpPairs(new Map([[TENANTS[0], [...t0, t0[0]]]]), 2), (e) => e instanceof PairRuleRefused && e.code === "ITEM_DUPLICATED", "a duplicated sealed item was paired");
  assert.throws(() => followUpPairs(new Map([[TENANTS[0], ["a>b", "c"]]]), 2), (e) => e.code === "ITEM_ID_INVALID", "an id carrying a pair delimiter was paired");
});

test("F10 · C7 · CONTROL 3 · RE-PAIRED NEGATIVES — every re-pair is the SAME candidate against a DIFFERENT need of the same tenant, drawn from a matched pair that exists; the negative-control population is non-empty", () => {
  const re = PAIRS.filter((p) => p.kind === "REPAIRED");
  assert.ok(re.length >= 20, `the negative-control population is too small or absent (${re.length})`);
  for (const r of re) {
    const m = MATCHED.get(`${r.partner}>${r.cand}`);
    assert.ok(m, "a re-pair names no matched pair");
    assert.notEqual(r.need, r.partner, "a re-pair reuses its partner's need");
    assert.equal(r.tenantId, m.tenantId);
    assert.equal(r.id, `${r.need}>${r.cand}|${r.partner}>${r.cand}`, "a re-pair id does not carry its partner in the lifecycle grammar");
  }
});

test("F10 · C7 · CONTROL 6 · CROSS-TENANT ACCESS — no pair spans two tenants, an item under two tenants is refused, and a key whose tenant scope differs from its pair set's is refused at the grant", () => {
  const tenantOf = new Map([...MEMBERS].flatMap(([t, ids]) => ids.map((i) => [i, t])));
  for (const p of PAIRS) assert.equal(tenantOf.get(p.need), tenantOf.get(p.cand), "a pair spans two tenants");
  assert.throws(() => followUpPairs(new Map([[TENANTS[0], MEMBERS.get(TENANTS[0])], [TENANTS[1], [MEMBERS.get(TENANTS[0])[0], ...MEMBERS.get(TENANTS[1])]]]), 2), (e) => e.code === "ITEM_DUPLICATED", "an item under two tenants was paired");
  const s = store({ keyTenants: [TENANTS[0]] });
  try {
    const g = requestHeldOutAccess({ audit: memAudit(), registry: s.registry, authorityRecords: AUTH, request: requestFor(s) });
    assert.equal(g.allowed, false, "a key and pair set spanning different tenant scopes were granted");
    assert.equal(g.code, "PAIR_CROSSES_TENANTS");
  } finally { s.cleanup(); }
});

/* ═══ THE MECHANISM ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("F10 · C7 · the mechanism is NEED-AWARE, INFERRED and traced: the same candidate is answered by its need; every answer names its rule and both sides' source rows — CONTROL: a stripped trace is a fault", () => {
  // need-awareness: ONE candidate, two needs, two different answers
  assert.notEqual(judgePair("alpha beta", "alpha gamma").answer, judgePair("delta epsilon", "alpha gamma").answer, "the mechanism answered one candidate alike for two different needs");
  assert.deepEqual(judgePair("zq alpha beta plan", "zq alpha gamma cost"), { answer: "YES", ruleId: "FU1_SHARED_TOPIC" });
  assert.deepEqual(judgePair("zq delta epsilon plan", "zq alpha gamma cost").answer, "YES", "CONTROL: a shared generic term is a shared term");
  assert.deepEqual(judgePair("delta epsilon", "alpha gamma"), { answer: "NO", ruleId: "FU2_UNRELATED" });
  assert.deepEqual(judgePair("alpha beta?", "Alpha, beta"), { answer: "NO", ruleId: "FU3_SAME_QUESTION" });
  assert.deepEqual(judgePair("what is it", "alpha gamma"), { answer: "ABSTAIN", ruleId: "FU4_TOO_LITTLE_WORDING" });
  assert.deepEqual(contentTerms("How do I do it?"), [], "function words were counted as content");
  const items = new Map([["n1", { query: "alpha beta", sourceRowIds: ["n1"] }], ["c1", { query: "alpha gamma", sourceRowIds: ["c1"] }], ["n2", { query: "delta epsilon", sourceRowIds: ["n2"] }], ["x1", { query: "omega psi", sourceRowIds: ["x1"] }], ["x2", { query: "chi phi", sourceRowIds: ["x2"] }]]);
  const pairs = [{ id: "n1>c1", need: "n1", cand: "c1" }, { id: "n2>c1|n1>c1", need: "n2", cand: "c1" }, { id: "x1>x2", need: "x1", cand: "x2" }, { id: "n2>x1", need: "n2", cand: "x1" }];
  const e = runFollowUpMechanism(pairs, items);
  assert.deepEqual(["n1>c1", "n2>c1|n1>c1"].map((k) => [e.get(k).answer, e.get(k).evidenceState, e.get(k).trace.ruleId]), [["YES", EVIDENCE_STATE, "FU1_SHARED_TOPIC"], ["NO", EVIDENCE_STATE, "FU2_UNRELATED"]], "the mechanism answered one candidate alike for its two needs inside a run");
  assert.equal(EVIDENCE_STATE, "INFERRED");
  assert.deepEqual(followUpOutputFaults(pairs, e), [], "a clean output reported a fault");
  const stripped = new Map([...e].map(([k, v]) => [k, { ...v, trace: { ...v.trace, needSourceRowIds: [] } }]));
  assert.ok(followUpOutputFaults(pairs, stripped).includes("YES_WITHOUT_TRACE"), "CONTROL: a YES without a trace was not a fault");
  assert.deepEqual(["n1>c1", "n2>c1|n1>c1"].map((k) => asScoredAnswers(e, CLS).get(k)), [{ classes: [CLS] }, { classes: [] }]);
  assert.throws(() => runFollowUpMechanism([{ id: "n1>c9", need: "n1", cand: "c9" }], items), (x) => x.code === "PAIR_UNTRACEABLE", "a pair with an unknown side was answered");
  assert.throws(() => runFollowUpMechanism([pairs[0], pairs[0]], items), (x) => x.code === "PAIR_DUPLICATED");
  for (const k of Object.keys(e.get("n1>c1"))) assert.ok(!/session|sequence|observed/i.test(k), "an answer carries a session or sequence claim");
});

test("F10 · C7 · a term MOST of a tenant's items share is its general topic, not a link: it never makes a YES — and one tenant's wording never decides another tenant's common terms", () => {
  // tenant A: "topicx" is in every item (common); tenant B: "topicx" appears once (distinctive there)
  const items = new Map([
    ["a1", { query: "topicx alpha beta", sourceRowIds: ["a1"] }], ["a2", { query: "topicx gamma delta", sourceRowIds: ["a2"] }], ["a3", { query: "topicx alpha zeta", sourceRowIds: ["a3"] }], ["a4", { query: "topicx rho sigma", sourceRowIds: ["a4"] }], ["a5", { query: "topicx tau upsilon", sourceRowIds: ["a5"] }],
    ["b1", { query: "topicx eta", sourceRowIds: ["b1"] }], ["b2", { query: "topicx theta", sourceRowIds: ["b2"] }], ["b3", { query: "iota kappa", sourceRowIds: ["b3"] }], ["b4", { query: "lambda mu", sourceRowIds: ["b4"] }], ["b5", { query: "nu xi", sourceRowIds: ["b5"] }],
  ]);
  const pairs = [{ id: "a1>a2", need: "a1", cand: "a2" }, { id: "a1>a3", need: "a1", cand: "a3" }, { id: "a2>a4", need: "a2", cand: "a4" }, { id: "a4>a5", need: "a4", cand: "a5" }, { id: "b1>b2", need: "b1", cand: "b2" }, { id: "b3>b4", need: "b3", cand: "b4" }, { id: "b4>b5", need: "b4", cand: "b5" }, { id: "b5>b1", need: "b5", cand: "b1" }];
  const e = runFollowUpMechanism(pairs, items);
  assert.equal(e.get("a1>a2").answer, "NO", "a tenant-wide topic word made a YES");
  assert.equal(e.get("a1>a3").answer, "YES", "CONTROL: a shared distinctive term did not make a YES");
  assert.equal(e.get("b1>b2").answer, "YES", "a term common only in ANOTHER tenant was treated as common here — tenants leaked into each other");
  assert.equal(judgePair("topicx alpha", "topicx gamma").answer, "YES", "CONTROL: without the tenant's common terms, a shared word is a link");
});

/* ═══ THE VERDICT — each branch isolated on a constructed release ═══════════════════════════════════════════════════════ */

test("F10 · C7 · CONTROL 9 · WEAK PRECISION / KAPPA / NEED-SENSITIVITY — each weakness alone FAILS, named — CONTROL: the strong release PASSES", () => {
  assert.deepEqual(V(rel({ tp: 40, fp: 5, fn: 5, tn: 150 }, { abstentions: 10 })).result, "PASS", "CONTROL: a strong release did not pass");
  const precision = V(rel({ tp: 25, fp: 18, fn: 0, tn: 357 }));
  assert.deepEqual([precision.result, precision.failing], ["FAIL", ["PRECISION"]], "weak precision alone did not FAIL on precision");
  const kappa = V(rel({ tp: 30, fp: 10, fn: 30, tn: 130 }));
  assert.deepEqual([kappa.result, kappa.failing], ["FAIL", ["KAPPA"]], "weak kappa alone did not FAIL on kappa");
  const sens = V(rel({ tp: 40, fp: 5, fn: 5, tn: 150 }, { both: 10 }));
  assert.deepEqual([sens.result, sens.failing], ["FAIL", ["NEED_SENSITIVITY"]], "weak need-sensitivity alone did not FAIL on need-sensitivity");
});

test("F10 · C7 · CONTROL 7 · INSUFFICIENT VALID DENOMINATOR — D7 below 0.8 × N7 is INVALID and reports no rate", () => {
  const v = V(rel({ tp: 40, fp: 5, fn: 5, tn: 150 }, { excluded: 60 }));
  assert.deepEqual([v.result, v.reason], ["INVALID", "DENOMINATOR_BELOW_MINIMUM"], "exclusions beyond 20% produced a rate");
  assert.equal(v.kappa, undefined, "an INVALID result reported a rate");
  assert.equal(V(rel({ tp: 40, fp: 5, fn: 5, tn: 150 }, { excluded: 50 })).result, "PASS", "CONTROL: exactly 0.8 × N7 was refused");
  assert.equal(V({ ...rel({ tp: 40, fp: 5, fn: 5, tn: 150 }), denominator: 199 }).reason, "RELEASE_INCONSISTENT", "an inconsistent release was scored");
});

test("F10 · C7 · CONTROL 8 · INSUFFICIENT CLASS POPULATIONS — fewer than 20 LIKELY_NEXT, fewer than 20 NOT_LIKELY_NEXT, or fewer than 10 discordant pairs is UNKNOWN, never PASS", () => {
  assert.deepEqual([V(rel({ tp: 19, fp: 0, fn: 0, tn: 181 })).result, V(rel({ tp: 19, fp: 0, fn: 0, tn: 181 })).reason], ["UNKNOWN", "CLASS_POPULATION_BELOW_MINIMUM"], "too few LIKELY_NEXT was assessed");
  assert.equal(V(rel({ tp: 181, fp: 0, fn: 0, tn: 19 })).reason, "CLASS_POPULATION_BELOW_MINIMUM", "too few NOT_LIKELY_NEXT was assessed");
  const few = V(rel({ tp: 40, fp: 5, fn: 5, tn: 150 }, { disc: 9, both: 9 }));
  assert.deepEqual([few.result, few.reason], ["UNKNOWN", "TOO_FEW_DISCORDANT_PAIRS"], "too few discordant pairs was assessed");
  assert.equal(V(rel({ tp: 20, fp: 0, fn: 0, tn: 180 }, { disc: 10, both: 10 })).result, "PASS", "CONTROL: exactly the minima were refused");
});

/* ═══ THE BEHAVIOURAL CONTROLS — constructed outputs through the SAME aggregate scorer the route calls ═══════════════════ */

test("F10 · C7 · the constructed population is ASSESSABLE (the controls below are not vacuous) and the perfect mechanism PASSES", () => {
  const { scored, verdict } = scoreMem(OUT.perfect());
  assert.ok(verdict.pos >= 20 && verdict.neg >= 20 && verdict.discordant >= 10, `the constructed population is not assessable: ${JSON.stringify(verdict)}`);
  assert.deepEqual([verdict.result, scored.abstentions, scored.discordantBothCorrect], ["PASS", 0, scored.discordantPairs], "the perfect mechanism did not PASS");
});

test("F10 · C7 · CONTROL 2 · GENERIC NEED-BLIND OUTPUT — a mechanism that judges the candidate alone FAILS on need-sensitivity, structurally: it can never get both sides of a discordant pair right", () => {
  const { scored, verdict } = scoreMem(OUT.needBlind());
  assert.equal(scored.discordantBothCorrect, 0, "a need-blind mechanism got both sides of a discordant pair right");
  assert.equal(verdict.result, "FAIL", "a need-blind mechanism did not FAIL");
  assert.ok(verdict.failing.includes("NEED_SENSITIVITY"), "a need-blind mechanism did not FAIL on need-sensitivity");
  for (const [name, f] of [["always-YES", OUT.alwaysYes], ["always-NO", OUT.alwaysNo], ["coin-flip", OUT.coinFlip]]) assert.equal(scoreMem(f()).verdict.result, "FAIL", `${name} did not FAIL`);
});

test("F10 · C7 · CONTROL 4 · ABSTENTIONS — an ABSTAIN stays in D7, is counted, and is never a NO: all-ABSTAIN FAILS on coverage (0), and right answers with 40% abstentions still FAIL on coverage", () => {
  const all = scoreMem(OUT.allAbstain());
  assert.equal(all.scored.abstentions, all.scored.denominator, "an ABSTAIN was dropped from D7 or not counted");
  assert.equal(all.verdict.result, "FAIL");
  assert.equal(all.verdict.coverage, 0, "all-ABSTAIN reported coverage");
  assert.ok(all.verdict.failing.includes("COVERAGE"), "all-ABSTAIN did not FAIL on coverage");
  const some = scoreMem(OUT.abstainOn40());
  assert.ok(some.verdict.coverage < C7_BAR.minCoverage, "the 40% abstainer is not below the coverage bar — the control would be vacuous");
  assert.ok(some.verdict.failing.includes("COVERAGE"), "a mechanism abstaining its way to agreement did not FAIL on coverage");
  const asNo = scoreMem(new Map([...OUT.abstainOn40()].map(([k, v]) => [k, v.abstain ? NO : v])));
  assert.equal(asNo.scored.abstentions, 0);
  assert.ok(some.scored.abstentions > 0, "an ABSTAIN reached the scorer as a NO");
  const mech = runFollowUpMechanism([{ id: "a>b", need: "a", cand: "b" }], new Map([["a", { query: "what is it", sourceRowIds: ["a"] }], ["b", { query: "why", sourceRowIds: ["b"] }]]));
  assert.deepEqual([...asScoredAnswers(mech, CLS).values()], [{ abstain: true }], "the mechanism's ABSTAIN reached the scorer as a NO");
});

/* ═══ THE SEPARATE GOVERNED C7 ROUTE — the production route, a confined audit store, an isolated synthetic store ═════════ */

function routeWorld(label, { outputs = OUT.perfect(), rows = keyRows(), currentScorerHash = SCORER } = {}) {
  const s = store({ rows });
  const nonce = `f10c7-${label}-${Math.random().toString(16).slice(2, 8)}`;
  const release = fs.mkdtempSync(join(os.tmpdir(), "f10c7-release-"));
  const cleanup = () => { s.cleanup(); fs.rmSync(release, { recursive: true, force: true }); fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true }); };
  try { return routeWorldIn({ s, nonce, release, outputs, currentScorerHash, cleanup }); } catch (e) { cleanup(); throw e; }
}
function routeWorldIn({ s, nonce, release, outputs, currentScorerHash, cleanup }) {
  const label = nonce;
  const a = governedAuditContext({ repo: REPO, env: { ...CONFINED_ENV, ALMIVISIBILITY_AUDIT_RUN: nonce }, correlationId: `run:f10c7:${label}`, authorityRef: { propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: ["ALMIVISIBILITY"] }, authorityHash: "d".repeat(64) });
  assert.equal(a.synthetic, true, "the audit context is not confined — refusing to touch the production trail");
  const audit = { ...a, actor: "test/f10c7" };
  freezeMechanism({ audit, mechanismId: MECHANISM_ID, mechanismHash: MECH, frozenAt: "2026-09-26T10:00:00Z" });
  freezeMechanism({ audit, mechanismId: FOLLOW_UP_SCORER_ID, mechanismHash: SCORER, frozenAt: "2026-09-26T10:00:00Z" });
  const grant = requestHeldOutAccess({ audit, registry: s.registry, authorityRecords: AUTH, request: requestFor(s) });
  const args = () => governedScoring({ repo: release, permission: { mayWrite: true, actorRef: "actor:cc", reason: "test" }, audit, grant, registry: s.registry,
    stores: resolveSealedStoreRoots({ env: { [ENV_REF]: s.dir } }), currentMechanismHash: MECH, currentScorerHash, outputsFor: () => outputs, protocol: C7_PROTOCOL, rule: C7_BAR,
    occurredAt: "2026-09-26T12:00:00Z", releaseStore: C7_RELEASE_STORE, verdictOf: (scored) => followUpVerdict(scored, { bar: C7_BAR, protocol: C7_PROTOCOL }) });
  const run = () => executeGovernedWrite({ ...args(), onAuthorisationRefused: () => {} });
  const releases = () => { const f = join(release, C7_RELEASE_STORE); return fs.existsSync(f) ? fs.readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []; };
  const trail = () => audit.store.readAll().events;
  return { s, grant, run, releases, release, trail, cleanup };
}

test("F10 · C7 · the SEPARATE governed route: one C7 run commits ONE item-free release in C7's OWN store, carrying the paired aggregates and the frozen verdict; C6's store is never written", () => {
  const w = routeWorld("happy");
  try {
    assert.equal(w.grant.allowed, true, `CONTROL: the C7 grant was refused (${w.grant.code})`);
    const r = w.run();
    assert.equal(r.outcome, "COMMITTED", `the C7 run did not commit: ${JSON.stringify(r.faults)}`);
    const rel7 = w.releases();
    assert.equal(rel7.length, 1);
    assert.equal(rel7[0].verdict.result, "PASS");
    for (const k of ["abstentions", "discordantPairs", "discordantBothCorrect"]) assert.equal(typeof rel7[0][k], "number", `the C7 release lacks ${k}`);
    for (const k of ["kappa", "precision", "coverage", "needSensitivity"]) assert.equal(typeof rel7[0].verdict[k], "number", `the C7 verdict lacks ${k}`);
    assert.ok(!fs.existsSync(join(w.release, RELEASE_STORE)), "the C7 run wrote C6's release store");
    const text = JSON.stringify(rel7) + JSON.stringify(w.trail());
    for (const p of PAIRS.slice(0, 20)) assert.ok(!text.includes(p.need) && !text.includes(p.cand), "an item or pair identity crossed out of the boundary");
    assert.ok(!text.includes(w.s.dir), "a store location crossed out of the boundary");
  } finally { w.cleanup(); }
});

test("F10 · C7 · the route with the REAL follow-up mechanism inside it: constructed wording, every pair answered, the release carries the mechanism's own abstentions", () => {
  const words = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta"];
  const wording = new Map([...MEMBERS.values()].flat().map((id, k) => [id, `${words[k % 8]} ${words[(k * 3 + 1) % 8]}${k % 5 === 0 ? "" : ` ${words[(k * 5 + 2) % 8]}`}`]));
  const items = new Map([...wording].map(([id, q]) => [id, { query: q, sourceRowIds: [id] }]));
  const entries = runFollowUpMechanism(PAIRS, items);
  assert.deepEqual(followUpOutputFaults(PAIRS, entries), [], "the mechanism broke its own trace law on the constructed population");
  const w = routeWorld("mechanism", { outputs: asScoredAnswers(entries, CLS) });
  try {
    assert.equal(w.run().outcome, "COMMITTED");
    const abst = [...entries.values()].filter((e) => e.answer === "ABSTAIN").length;
    assert.ok(w.releases()[0].abstentions <= abst, "the release counts more abstentions than the mechanism gave");
    assert.ok(["PASS", "FAIL", "UNKNOWN"].includes(w.releases()[0].verdict.result));
  } finally { w.cleanup(); }
});

test("F10 · C7 · CONTROL 5 · MISSING OUTPUTS — a pair without an answer INVALIDATES the run (ruling 1.3): no release, never a NO", () => {
  const outputs = OUT.perfect(); outputs.delete(PAIRS[3].id);
  const w = routeWorld("missing", { outputs });
  try {
    assert.equal(w.run().outcome, "FAILED_BEFORE_COMMIT", "a missing output yielded a result");
    assert.ok(w.trail().some((e) => e.action === EVALUATION_ACTIONS.SCORED && e.outcome === "INVALID" && e.reasonCode === "INPUT_MISSING"), "a missing output was not recorded INVALID (INPUT_MISSING)");
    assert.equal(w.releases().length, 0, "a run with a missing output released a result");
  } finally { w.cleanup(); }
});

test("F10 · C7 · CONTROL 10 · SCORE RETRY — a retry of the committed run runs nothing, the combination is claimed once, one release exists; a scorer changed since its freeze is refused before any claim", () => {
  const w = routeWorld("retry");
  try {
    assert.equal(w.run().outcome, "COMMITTED");
    assert.equal(w.run().outcome, "ALREADY_COMMITTED", "a retry of a committed C7 run ran again");
    assert.equal(w.trail().filter((e) => e.action === LINKED_ACTIONS.CLAIMED).length, 1, "the C7 combination was claimed more than once");
    assert.equal(w.releases().length, 1, "a second C7 result was released");
  } finally { w.cleanup(); }
  const c = routeWorld("changed-scorer", { currentScorerHash: "a".repeat(64) });
  try {
    assert.ok(c.run().faults.some((f) => f.code === "SCORER_CHANGED_SINCE_FREEZE"), "a scorer whose frozen version no longer matches its code reached scoring");
    assert.equal(c.trail().filter((e) => e.action === LINKED_ACTIONS.CLAIMED).length, 0, "a changed scorer spent the run");
  } finally { c.cleanup(); }
});

test("F10 · C7 · an INCOMPLETE key is REFUSED before the claim on the route — the one C7 run stays UNSPENT for the owner's complete key", () => {
  const w = routeWorld("incomplete", { rows: keyRows().slice(0, -3) });
  try {
    assert.equal(w.run().outcome, "FAILED_BEFORE_COMMIT", "an incomplete key yielded a result");
    assert.equal(w.trail().filter((e) => e.action === LINKED_ACTIONS.CLAIMED).length, 0, "an incomplete key SPENT the once-only run");
    assert.ok(w.trail().some((e) => e.action === EVALUATION_ACTIONS.SCORED && e.outcome === "REFUSED" && e.reasonCode === "INPUT_MISSING"), "the incomplete key was not refused by name");
  } finally { w.cleanup(); }
});

test("F10 · C7 · C6 IS UNCHANGED — a route without a verdict function writes exactly C6's record fields, and the C6 and C7 versions are separate", () => {
  assert.notEqual(FOLLOW_UP_SCORER_ID, SCORER_ID, "C7 shares C6's scorer version");
  assert.ok(!MECHANISM_FILES.includes("src/heldout/lifecycle.mjs"));
  const src = fs.readFileSync(join(REPO, "src/governance/governed-scoring.mjs"), "utf8");
  assert.match(src, /const verdict = verdictOf \? verdictOf\(scored\) : classificationVerdict\(\{ tables: scored\.tables, declared: scored\.declared, excluded: scored\.excluded \}, \{ rule, protocol \}\);/, "C6's verdict call changed");
  assert.match(src, /\.\.\.\(verdictOf \? \{ failing:/, "C7's verdict fields are not confined to the C7 route");
  assert.match(src, /\.\.\.\(scored\.discordantPairs !== undefined \?/, "the paired aggregates are not confined to a paired release");
});

/* ═══ THE PRODUCTION ENTRY POINT ═════════════════════════════════════════════════════════════════════════════════════════ */

test("F10 · C7 · REAL entry point · bin/heldout-evaluation.mjs refuses an unknown route, and its status reports each F10 version against the code — CONTROL: the C7 versions are reported", () => {
  const before = prodHashes();
  const nonce = `f10c7-bin-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  const env = { ...CONFINED_ENV, ALMIVISIBILITY_AUDIT_RUN: nonce };
  try {
    const bad = spawnSync(process.execPath, ["bin/heldout-evaluation.mjs", "score", "--route=guess", "--confirm", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", env, timeout: 180_000 });
    assert.notEqual(bad.status, 0);
    const st = spawnSync(process.execPath, ["bin/heldout-evaluation.mjs", "status"], { cwd: REPO, encoding: "utf8", env, timeout: 180_000 });
    assert.equal(st.status, 0);
    assert.match(st.stdout, new RegExp(`version C7 mechanism\\s+${MECHANISM_ID}\\s+code ${MECH.slice(0, 12)}`), "the C7 mechanism version was not reported");
    assert.match(st.stdout, new RegExp(`version C7 scorer\\s+${FOLLOW_UP_SCORER_ID}\\s+code ${SCORER.slice(0, 12)}`), "the C7 scorer version was not reported");
  } finally { fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true }); }
  assert.deepEqual(prodHashes(), before, "a confined entry-point run changed the production trail");
});

test("F10 · C7 · REAL · COUNT-ONLY · the pair rule and the mechanism over every tenant's FULL eligible population (not a selection): every pair answered, the trace law holds, the answers reconcile — nothing item-level is printed", async () => {
  const { createJsonlStore } = await import("../src/evidence/store.mjs");
  const { pinnedObservationRows, decidePartition, readTenantPartition } = await import("../src/discovery/search-console-partition.mjs");
  const { createTenantResolver } = await import("../src/tenancy/resolver.mjs");
  const { accountPopulation, retiredMembers } = await import("../src/discovery/human-question-population.mjs");
  const records = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
  const rows = pinnedObservationRows({ repo: REPO, records });
  const resolve = createTenantResolver();
  const partitions = new Map();
  for (const t of resolve.declarations.tenants.filter((x) => x.status === "ACTIVE").map((x) => x.tenantId)) {
    const p = readTenantPartition({ decision: decidePartition(resolve, t), tenantId: t, resolve, rows });
    if (p.items.length) partitions.set(t, p);
  }
  const account = accountPopulation({ start: rows.length, partitions, retired: retiredMembers({ records, entry: EVIDENCE_ROLE_REGISTRY.find((e) => e.role === "RETIRED_CONTAMINATED") }) });
  const byTenant = new Map([...account.eligibleItems].filter(([, it]) => it.length).map(([t, it]) => [t, it.map((x) => x.itemId)]));
  const items = new Map([...account.eligibleItems.values()].flat().map((x) => [x.itemId, { query: x.query, sourceRowIds: x.sourceRowIds }]));
  assert.ok(items.size > 0 && byTenant.size > 0, "the real eligible population is empty — the measurement would be over nothing");
  const P = followUpPairs(byTenant, C7_BAR.candidatesPerNeed);
  const entries = runFollowUpMechanism(P, items);
  assert.equal(entries.size, P.length, "a real pair has no answer");
  assert.deepEqual(followUpOutputFaults(P, entries), [], "the mechanism broke its trace law on the real population");
  const count = (a) => [...entries.values()].filter((e) => e.answer === a).length;
  const [yes, no, abst] = ["YES", "NO", "ABSTAIN"].map(count);
  assert.equal(yes + no + abst, P.length);
  console.log(`  [C7 real, count-only] eligible ${items.size} · pairs ${P.length} · YES ${yes} · NO ${no} · ABSTAIN ${abst} · coverage ${((yes + no) / P.length).toFixed(3)}`);
});

test("F10 · C7 · residue: every constructed store and release directory is removed", () => {
  assert.deepEqual(fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith("f10c7-")), []);
});

test("F10 · C7 · the production audit trail is byte-identical after every proof in this file", () => {
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
