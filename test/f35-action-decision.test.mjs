/**
 * F35 · ACTION DECISION ENGINE — the proofs of the frozen acceptance (_handoffs da659bd, RR-88).
 *
 * 🔴 EXPECTED OUTCOMES ARE WRITTEN BY HAND from the frozen evidence rules. The inputs that stand for upstream evidence are produced by
 * the production modules (F36 rightToExist, F34/F33 existingPageFirst) or are recorded-shape bundles; the expectations are never
 * computed by the decision under test. The REAL recorded structures run as they are, count-only. No production-trail write.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { decideForNeed, decideForPage, decideGroupedNeed, DECISION as D, OWNER_APPROVAL, STANDING, REVIEW_MISSING, reviewShowsOneIntent } from "../src/page/action-decision.mjs";
import { readClientActionEvidence, sameNeedPeers, sameIntentPeers } from "../src/page/action-evidence.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { NO_RECORDED_DECAY_EVIDENCE as NO_DECAY } from "../src/page/content-decay-evidence.mjs";
import { rightToExist } from "../src/page/right-to-exist.mjs";
import { existingPageFirst } from "../src/page/existing-page-first.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { scopeInventory } from "../src/crawl/scope-inventory.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { subject } from "./support/subjects.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- upstream evidence, produced by the production modules ---- */
const T = "tenant:f35-fixture";
const V = ["alpha", "beta", "gamma"];
const why = (n, v) => ({ whyThisUrlDeservesToExist: { humanNeed: n, distinctValue: v } });
const SPECS = {
  alpha: { variant: "alpha", ...why("a first-time applicant needs the alpha licensing steps in order", "the only page that sequences the alpha steps with deadlines") },
  beta: { variant: "beta", ...why("a returning professional needs the beta renewal exceptions", "a worked renewal example with every exception case") },
  gamma: { variant: "gamma", ...why("an employer needs to verify gamma credentials quickly", "a checklist employers can follow in one pass") },
};
const sibs = (s, specs = SPECS) => Object.entries(specs).filter(([k]) => k !== s).map(([slug, spec]) => ({ slug, spec }));
const ex = (intent, pages, coverageState = "COMPLETE") => existingPageFirst({ candidate: { slug: intent, intent, structure: { values: V } }, tenantId: T, population: { tenantId: T, coverageState, pages } });
const need = (slug, { spec = SPECS[slug], pages = [], coverageState = "COMPLETE", demand = null } = {}) => {
  const e = ex(slug, pages, coverageState);
  return decideForNeed({ slug, rightToExist: rightToExist({ slug, spec, siblings: sibs(slug), variants: V, existingPageDecision: e }), existingPageDecision: e, demand });
};
const STRONG = { outcome: "STRONG", independentCategories: 3, conflict: false, ref: "demand:fixture" };
const acts = (d) => d.actions.map((a) => a.action);

/* ---- an existing page's recorded evidence bundle ---- */
const page = (over = {}) => ({ pageId: "p1", servedState: { state: "OBSERVED", status: 200, evidence: ["o1"] }, signals: { state: "CONSISTENT", classes: [] }, sameNeedPeers: [], inboundLinks: 3, completeness: "INCOMPLETE", completenessRef: "c", staleFacts: [], quality: null, questionCoverage: null, postPublication: null, removal: null, ...over });

/* ================= C3 — an unmeasured need never becomes a new page ================= */

/* C3's demand gate is SUPERSEDED by F35 Amendment 1 C3 AS AMENDED (RR-174; RTP-1 P19, §17 S21): no demand outcome, category or observation
 * is required, under any name, and C9 (A1) makes a declared spec alone never a reason for a page. The one-CREATE-rule controls are
 * test/rr174-r3-f35-f34.test.mjs T3a–T3e. Here: a declared spec, whatever demand is recorded, is HOLD by its own name — never CREATE. */
test("C3 (as amended) · FIRING CONTROL: a declared spec alone never becomes a page — HOLD with A1's missing fact named, whatever demand says; STRONG recorded demand unlocks nothing", () => {
  for (const d of [null, STRONG, { ...STRONG, independentCategories: 2 }, { ...STRONG, conflict: true }]) {
    const n = need("alpha", { demand: d });
    assert.deepEqual([n.decision, n.class, n.outcome, acts(n)], [D.CANNOT_DECIDE, "HOLD", "HOLD", []], `demand ${JSON.stringify(d)} decided a declared spec`);
    assert.ok(n.missing.some((m) => /no recorded relevant question/.test(m)), "the HOLD names no missing fact");
  }
});

/* ================= C4 — improve before create ================= */

/* C4 for a need is NARROWED by F35 Amendment 1 C4 AS AMENDED (P19's table): FULL coverage and no needed gap → KEEP / NO NEW PAGE on the
 * coverage record (no quality measurement is needed for a need); PARTIAL or a missing relevant question → IMPROVE / ADD SECTION. A covered
 * need never yields CREATE (FAILURE [C4]'s first limb stands). Each table row is test/rr174-r3-f35-f34.test.mjs T4a. */
test("C4 (as amended) · a covered need never becomes CREATE: FULL with no gap → KEEP / NO NEW PAGE; PARTIAL → IMPROVE / ADD SECTION — each naming the coverage record", () => {
  const g = (coverage) => decideGroupedNeed({ need: { needId: "n1", pageCandidate: "[]", questions: 2, tier: "OBSERVED", centralSupported: true }, coverage, rightToExist: { outcome: "ESTABLISHED", reason: "r" }, duplication: { state: "NO_COMPARISON_PAGE", ref: "d" } });
  const full = g({ coverage: "FULL", relevantQuestionMissing: false, pages: [{ pageId: "c1" }], measurement_key: "planning_coverage:k1" });
  assert.deepEqual([acts(full), full.outcome], [["KEEP"], "KEEP / NO NEW PAGE"]);
  assert.deepEqual(full.actions[0].evidence, ["planning_coverage:k1", "c1"], "KEEP does not name its coverage record and page");
  const part = g({ coverage: "PARTIAL", relevantQuestionMissing: true, pages: [{ pageId: "c1" }], measurement_key: "planning_coverage:k2" });
  assert.deepEqual([acts(part), part.outcome], [["ADD SECTION"], "IMPROVE / ADD SECTION"]);
  for (const d of [full, part]) assert.ok(!acts(d).includes("CREATE"), "a covered need was created");
});

/* ================= C5 — each action's own rule ================= */

/* REJECT's rule stands (C5), for a need that REACHES the decision: since F35 Amendment 1 C9 that is a grouped need with a recorded question
 * (a declared spec alone is HOLD). The spec's right-to-exist is F36's, read for the need's matching spec (ruling RR-174 (c)). */
test("C5 · REJECT only for a doorway-like reason (substitution or template); a missing reason is HOLD (CANNOT DECIDE), not REJECT", () => {
  const rteOf = (spec) => rightToExist({ slug: "alpha", spec, siblings: sibs("alpha"), variants: V, existingPageDecision: ex("alpha", []) });
  const g = (spec) => decideGroupedNeed({ need: { needId: "n1", pageCandidate: "[]", questions: 1, tier: "OBSERVED", centralSupported: true }, coverage: { coverage: "NONE", relevantQuestionMissing: false, pages: [], measurement_key: "k" }, rightToExist: rteOf(spec), duplication: { state: "NO_COMPARISON_PAGE", ref: "d" } });
  const template = g({ variant: "alpha", ...why("a returning professional needs the alpha renewal exceptions", "a worked renewal example with every exception case") });
  assert.deepEqual(acts(template), ["REJECT"]);
  const missing = g({ variant: "alpha" });
  assert.deepEqual([missing.decision, missing.class], [D.CANNOT_DECIDE, "HOLD"], "a missing reason was treated as proof of no value");
});

test("C5 · the existing-page rules: FIX, MERGE, REDIRECT, LINK, REFRESH, KEEP, ADD SECTION, NOINDEX, REMOVE — each exactly on its evidence", () => {
  const cases = [
    ["a recorded contradiction", page({ signals: { state: "CONTRADICTED", classes: ["K1"], sources: ["s1"] } }), ["FIX"]],
    ["recorded not served, no successor", page({ servedState: { state: "OBSERVED", status: 404, evidence: ["o9"] } }), ["FIX"]],
    ["a recorded review finds one intent duplicated", page({ sameNeedPeers: ["p2"], sameIntentPeers: [{ pageId: "p2", reviewRef: "rev:1" }] }), ["MERGE"]],
    ["no inbound link, COMPLETE inventory", page({ inboundLinks: 0, completeness: "COMPLETE" }), ["LINK"]],
    ["a stale fact on the page", page({ staleFacts: ["f1"] }), ["REFRESH"]],
    ["recorded quality satisfies the intent", page({ quality: { satisfiesIntent: true, ref: "q1" } }), ["KEEP"]],
    ["a recorded new question in the intent", page({ questionCoverage: { newQuestionInIntent: true, ref: "qc" } }), ["ADD SECTION"]],
    ["a recorded weak result after the window", page({ postPublication: { weakResult: true, ownerApprovalPath: true, ref: "pp" } }), ["NOINDEX"]],
    ["not served, no successor, no demand", page({ servedState: { state: "OBSERVED", status: 200 }, removal: { notServed: true, noSuccessor: true, noDemand: true, ref: "rm" } }), ["REMOVE"]],
  ];
  for (const [label, bundle, expected] of cases) {
    const d = decideForPage(bundle);
    assert.equal(d.decision, D.CHOSEN, `${label}: ${d.missing.join(" | ")}`);
    assert.deepEqual(acts(d), expected, label);
  }
  /* and never without their evidence */
  const bare = decideForPage(page());
  assert.equal(bare.decision, D.CANNOT_DECIDE, "a page with no met rule got an action");
  assert.equal(decideForPage(page({ inboundLinks: 0, completeness: "INCOMPLETE" })).decision, D.CANNOT_DECIDE, "LINK was chosen over an INCOMPLETE inventory");
  assert.ok(decideForPage(page({ inboundLinks: 0, completeness: "INCOMPLETE" })).missing.some((m) => /LINK needs a COMPLETE inventory/.test(m)));
  assert.equal(decideForPage(page({ postPublication: { weakResult: true } })).decision, D.CANNOT_DECIDE, "NOINDEX without its owner-approval path");
  assert.equal(decideForPage(page({ removal: { notServed: true, noSuccessor: true } })).decision, D.CANNOT_DECIDE, "REMOVE without the no-demand evidence");
});

/* ================= C2 — cannot decide, never forced ================= */

test("C2 · contradicting actions are CANNOT DECIDE, never both returned: KEEP + FIX, and restore-or-redirect", () => {
  const keepAndFix = decideForPage(page({ quality: { satisfiesIntent: true, ref: "q" }, signals: { state: "CONTRADICTED", classes: ["K3"], sources: ["s"] } }));
  assert.equal(keepAndFix.decision, D.CANNOT_DECIDE);
  assert.deepEqual(keepAndFix.actions, []);
  assert.match(keepAndFix.missing[0], /contradicting actions: FIX \+ KEEP|contradicting actions: KEEP \+ FIX/);
  const restoreOrRedirect = decideForPage(page({ servedState: { state: "OBSERVED", status: 404, evidence: ["o"] }, sameNeedPeers: ["p2"], sameIntentPeers: [{ pageId: "p2", reviewRef: "rev:1" }] }));
  assert.equal(restoreOrRedirect.decision, D.CANNOT_DECIDE, "FIX and REDIRECT were both returned");
  const none = need("beta", { coverageState: "PARTIAL" });
  assert.equal(none.decision, D.CANNOT_DECIDE);
  assert.ok(!acts(none).includes("MONITOR"), "CANNOT DECIDE quietly became MONITOR");
  assert.ok(none.missing.length > 0, "CANNOT DECIDE names no missing fact");
});

/* ================= C1 / C6 — the recorded reason, and recommendation only ================= */

test("C1/C6 · every chosen action carries its rule and evidence, is a RECOMMENDATION, and the four owner-approval actions say so", () => {
  const all = [
    need("alpha", { demand: STRONG }), need("alpha", { pages: [{ pageId: "c1", tenantId: T, html: "<h1>Alpha</h1>", recordedDefect: "d" }] }),
    decideForPage(page({ sameNeedPeers: ["p2"], sameIntentPeers: [{ pageId: "p2", reviewRef: "rev:1" }] })), decideForPage(page({ servedState: { state: "OBSERVED", status: 410 }, removal: { notServed: true, noSuccessor: true, noDemand: true, ref: "r" } })),
    decideForPage(page({ postPublication: { weakResult: true, ownerApprovalPath: true, ref: "pp" } })), decideForPage(page({ signals: { state: "CONTRADICTED", classes: ["K2"], sources: ["s"] } })),
  ];
  for (const d of all) for (const a of d.actions) {
    assert.ok(a.rule && a.evidence.length > 0, `${a.action}: no rule or evidence`);
    /* LITERALS from the frozen acceptance — never the module's own constants, or a changed constant would pass its own check */
    assert.equal(a.standing, "RECOMMENDATION", `${a.action} is presented as more than a recommendation`);
    assert.equal(a.ownerApprovalRequired, ["MERGE", "NOINDEX", "REMOVE", "REDIRECT"].includes(a.action), `${a.action}: owner-approval label wrong`);
  }
  const merge = decideForPage(page({ sameNeedPeers: ["p2"], sameIntentPeers: [{ pageId: "p2", reviewRef: "rev:1" }] })).actions[0];
  assert.deepEqual(merge.evidence, ["p2", "rev:1"], "a MERGE does not carry the review that justifies it");
});

/* ================= RR-89 — similarity or a shared need is a review trigger, never proof of MERGE ================= */

const SIX = ["intent", "answer", "facts", "architecture", "examples", "userValue"]; // V3 §14.2, written by hand

test("RR-89 · FIRING CONTROL: an UNREVIEWED shared need is CANNOT DECIDE with the missing review named — never MERGE, never REDIRECT", () => {
  const unreviewed = decideForPage(page({ sameNeedPeers: ["p2", "p3"] }));
  assert.equal(unreviewed.decision, D.CANNOT_DECIDE, "an unreviewed shared need became an action");
  assert.ok(!acts(unreviewed).includes("MERGE"), "an unreviewed pair was turned into MERGE");
  assert.ok(unreviewed.missing.some((m) => m.includes(REVIEW_MISSING) && /2 other page\(s\) share this page's registered need, none reviewed/.test(m)), "the missing review is not named");
  /* a not-served page whose only peer is unreviewed: FIX on its own evidence, no REDIRECT, and the review named */
  const notServed = decideForPage(page({ servedState: { state: "OBSERVED", status: 404, evidence: ["o9"] }, sameNeedPeers: ["p2"] }));
  assert.deepEqual(acts(notServed), ["FIX"], "REDIRECT was chosen to an unreviewed page");
  assert.ok(notServed.missing.some((m) => /MERGE and REDIRECT need a recorded semantic review/.test(m)));
  /* one reviewed peer among two: MERGE with that peer only, carrying its review */
  const partly = decideForPage(page({ sameNeedPeers: ["p2", "p3"], sameIntentPeers: [{ pageId: "p3", reviewRef: "rev:3" }] }));
  assert.deepEqual(acts(partly), ["MERGE"]);
  assert.deepEqual(partly.actions[0].evidence, ["p3", "rev:3"], "MERGE named an unreviewed peer");
});

test("RR-89 · what a review must show: every aspect compared AND one intent duplicated or split — a DISTINCT or partial review is no successor", () => {
  assert.equal(reviewShowsOneIntent({ compared: SIX, duplicate: true, ref: "r" }), true);
  assert.equal(reviewShowsOneIntent({ compared: SIX, duplicate: false, splitsOneIntent: true, ref: "r" }), true, "V3 §8 'split … one intent' was not accepted");
  assert.equal(reviewShowsOneIntent({ compared: SIX, duplicate: false, ref: "r" }), false, "a DISTINCT review became a MERGE successor");
  assert.equal(reviewShowsOneIntent({ compared: SIX.filter((a) => a !== "examples"), duplicate: true, ref: "r" }), false, "a review missing an aspect counted");
  assert.equal(reviewShowsOneIntent(null), false);
  /* the evidence reader keeps only the peers a qualifying review names, in either pair order */
  const reviews = [{ pair: ["a", "b"], compared: SIX, duplicate: false, ref: "distinct" }, { pair: ["c", "a"], compared: SIX, duplicate: true, ref: "dup" }];
  assert.deepEqual(sameIntentPeers("a", new Set(["b", "c", "d"]), reviews), [{ pageId: "c", reviewRef: "dup" }]);
  assert.throws(() => readClientActionEvidence({ tenantId: "tenant:x", product: {}, resolve: () => null }), /passed explicitly/, "missing reviews were silently defaulted");
});

test("RR-89 · REAL, both controls: with no review recorded no real page is MERGE and each shared-need page names the review; one real pair given a (test-only) review IS MERGE", async () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const product = await subject("almi-oet");
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const bare = readClientActionEvidence({ tenantId, product, records, resolve, reviews: [], decayEvidence: NO_DECAY });
  assert.equal(bare.summary.pages.byAction.MERGE, 0, "an unreviewed real pair was turned into MERGE");
  const named = bare.pages.filter((d) => d.missing.some((m) => m.includes(REVIEW_MISSING)));
  assert.ok(named.length > 0, "EMPTY: no real page shares a need — the control would prove nothing");
  /* a real same-need pair, from the production peer function over the real population */
  const { population } = readExistingPagePopulation({ scope: { tenantId }, resolve, env: process.env, now: new Date() });
  const peers = sameNeedPeers(population.pages, product.variants ?? []);
  const [a, set] = [...peers.entries()].find(([, s]) => s.size > 0);
  const b = [...set][0];
  const review = { pair: [a, b], compared: SIX, duplicate: true, ref: "test-review:f35-rr89" };
  const reviewed = readClientActionEvidence({ tenantId, product, records, resolve, reviews: [review], decayEvidence: NO_DECAY });
  const merged = reviewed.pages.filter((d) => d.actions.some((x) => x.action === "MERGE"));
  assert.deepEqual(merged.map((d) => d.subject.pageId).sort(), [a, b].sort(), "a properly evidenced real MERGE was suppressed, or spread to unreviewed pages");
  for (const d of merged) {
    const m = d.actions.find((x) => x.action === "MERGE");
    assert.ok(m.evidence.includes("test-review:f35-rr89"), "the real MERGE does not carry its review");
    assert.equal(m.ownerApprovalRequired, true, "a MERGE lost its owner-approval requirement");
  }
  console.log(`  REAL RR-89 (count-only): no review → MERGE 0, ${named.length} page(s) name the missing review · one reviewed real pair → MERGE ${merged.length} · bound: ${bare.bound}`);
});

/* ================= REAL — count-only, with the missing facts ================= */

test("REAL · the client's recorded structures, as they are — no CREATE, every CANNOT DECIDE names its missing facts", async () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const product = await subject("almi-oet");
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const r = readClientActionEvidence({ tenantId, product, records, resolve, reviews: [], decayEvidence: NO_DECAY });
  assert.ok(r.pages.length > 0 && r.needs.length > 0, "EMPTY real population");
  assert.equal(r.summary.needs.byAction.CREATE, 0, "a real proposed need became a new page");
  for (const d of [...r.needs, ...r.pages]) {
    if (d.decision === D.CANNOT_DECIDE) assert.ok(d.missing.length > 0, "a real CANNOT DECIDE names no missing fact");
    for (const a of d.actions) assert.equal(a.standing, "RECOMMENDATION");
  }
  const s = r.summary;
  console.log(`  REAL (count-only): proposed needs ${s.needs.population} · CHOSEN ${s.needs.chosen} · CANNOT_DECIDE ${s.needs.cannotDecide} | existing pages ${s.pages.population} · CHOSEN ${s.pages.chosen} · CANNOT_DECIDE ${s.pages.cannotDecide} · ${Object.entries(s.pages.byAction).filter(([, n]) => n).map(([a, n]) => `${a} ${n}`).join(" · ")} · bound: ${r.bound}`);
});

/* ================= C6 / C7 — the entry point writes nothing; same client; no call-out ================= */

test("C6/C7 · THE ENTRY POINT: in a declared world it prints counts only and writes nothing; against the real declarations it is REFUSED", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/page-actions.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    /* ruling RR-174 (a): HOLD is printed by its own name; grouped needs and DEMAND MONITORING on their own lines (F35 Amendment 1) */
    assert.match(ok.stdout, /proposed needs\s+\d+ · CHOSEN \d+ · HOLD \d+ · CANNOT_DECIDE \d+/);
    assert.match(ok.stdout, /existing pages\s+\d+ · CHOSEN \d+ · HOLD \d+ · CANNOT_DECIDE \d+/);
    assert.match(ok.stdout, /grouped needs   NOT MEASURED — no research batch named/);
    assert.match(ok.stdout, /DEMAND MONITORING  NOT MEASURED — .* never an outcome, never a gate/);
    assert.doesNotMatch(ok.stdout, /MONITOR(?!ING)/, "MONITOR is printed as an outcome");
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
  const tenantId = resolveSide(createTenantResolver(), RESOURCES.subject("almi-oet")).tenantId;
  const real = spawnSync(process.execPath, ["bin/page-actions.mjs", "--product=almi-oet", `--tenant=${tenantId}`, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.notEqual(real.status, 0, "the entry point read a shared store no declaration assigns to this client");
});

test("C7 · the decision and its evidence reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/page/action-decision.mjs", "src/page/action-evidence.mjs"];
  const r = decisionCallPaths({ entries });
  assert.deepEqual(r.faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("C5 · LINK's input: the inventory counts each page's RECORDED inbound links; an absent list is null (unknown), never 0", () => {
  const rec = (id, inbound) => ({ record_type: "page", page_id: id, canonical_url: `https://f35.example/${id}`, observations: [], ...(inbound === undefined ? {} : { inbound_edges: inbound }) });
  const inv = scopeInventory({ tenantId: T, batchId: "b", records: [rec("a", ["x", "y"]), rec("b", []), rec("c")] });
  assert.deepEqual(inv.pages.map((p) => p.inboundLinks), [2, 0, null]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
