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

import { decideForNeed, decideForPage, DECISION as D, OWNER_APPROVAL, STANDING, MERGE_NOT_MEASURED } from "../src/page/action-decision.mjs";
import { readClientActionEvidence } from "../src/page/action-evidence.mjs";
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

test("C3 · FIRING CONTROL: an ESTABLISHED right-to-exist with UNMEASURED demand is CANNOT DECIDE — never CREATE; STRONG recorded demand is the only way", () => {
  const unmeasured = need("alpha");
  assert.equal(unmeasured.decision, D.CANNOT_DECIDE);
  assert.ok(!acts(unmeasured).includes("CREATE"), "an unmeasured need became a new page");
  assert.ok(unmeasured.missing.some((m) => /demand/.test(m)), "the missing demand fact is not named");
  const strong = need("alpha", { demand: STRONG });
  assert.deepEqual(acts(strong), ["CREATE"], "the control: STRONG recorded demand with an established right CAN create");
  assert.equal(strong.actions[0].standing, "RECOMMENDATION");
  assert.deepEqual(acts(need("alpha", { demand: { ...STRONG, independentCategories: 2 } })), ["MONITOR"], "fewer than three categories created a page");
  assert.deepEqual(acts(need("alpha", { demand: { ...STRONG, conflict: true } })), ["MONITOR"], "conflicting demand created a page");
  assert.deepEqual(acts(need("alpha", { demand: { ...STRONG, zeroClickOnly: true, outcome: "MONITOR" } })), ["MONITOR"]);
  assert.ok(!acts(need("alpha", { spec: { variant: "alpha" }, demand: STRONG })).includes("CREATE"), "a candidate with no right to exist was created on demand alone");
});

/* ================= C4 — improve before create ================= */

test("C4 · a covered need never becomes CREATE: a recorded defect → IMPROVE; no quality evidence → CANNOT DECIDE (never KEEP)", () => {
  const covered = need("alpha", { pages: [{ pageId: "c1", tenantId: T, html: "<h1>Alpha</h1>" }], demand: STRONG });
  assert.ok(!acts(covered).includes("CREATE"), "a covered need was created");
  assert.equal(covered.decision, D.CANNOT_DECIDE);
  assert.ok(covered.missing.some((m) => /KEEP needs a recorded quality measurement/.test(m)));
  const defect = need("alpha", { pages: [{ pageId: "c1", tenantId: T, html: "<h1>Alpha</h1>", recordedDefect: "stale fact" }] });
  assert.deepEqual(acts(defect), ["IMPROVE"]);
  assert.deepEqual(defect.actions[0].evidence, ["c1"], "IMPROVE does not name the page it improves");
});

/* ================= C5 — each action's own rule ================= */

test("C5 · REJECT only for a doorway-like reason (substitution or template); a missing reason is CANNOT DECIDE, not REJECT", () => {
  const template = need("alpha", { spec: { variant: "alpha", ...why("a returning professional needs the alpha renewal exceptions", "a worked renewal example with every exception case") } });
  assert.deepEqual(acts(template), ["REJECT"]);
  const missing = need("alpha", { spec: { variant: "alpha" } });
  assert.equal(missing.decision, D.CANNOT_DECIDE, "a missing reason was treated as proof of no value");
});

test("C5 · the existing-page rules: FIX, MERGE, REDIRECT, LINK, REFRESH, KEEP, ADD SECTION, NOINDEX, REMOVE — each exactly on its evidence", () => {
  const cases = [
    ["a recorded contradiction", page({ signals: { state: "CONTRADICTED", classes: ["K1"], sources: ["s1"] } }), ["FIX"]],
    ["recorded not served, no successor", page({ servedState: { state: "OBSERVED", status: 404, evidence: ["o9"] } }), ["FIX"]],
    ["two pages cover one need", page({ sameNeedPeers: ["p2"] }), ["MERGE"]],
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
  const restoreOrRedirect = decideForPage(page({ servedState: { state: "OBSERVED", status: 404, evidence: ["o"] }, sameNeedPeers: ["p2"] }));
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
    decideForPage(page({ sameNeedPeers: ["p2"] })), decideForPage(page({ servedState: { state: "OBSERVED", status: 410 }, removal: { notServed: true, noSuccessor: true, noDemand: true, ref: "r" } })),
    decideForPage(page({ postPublication: { weakResult: true, ownerApprovalPath: true, ref: "pp" } })), decideForPage(page({ signals: { state: "CONTRADICTED", classes: ["K2"], sources: ["s"] } })),
  ];
  for (const d of all) for (const a of d.actions) {
    assert.ok(a.rule && a.evidence.length > 0, `${a.action}: no rule or evidence`);
    /* LITERALS from the frozen acceptance — never the module's own constants, or a changed constant would pass its own check */
    assert.equal(a.standing, "RECOMMENDATION", `${a.action} is presented as more than a recommendation`);
    assert.equal(a.ownerApprovalRequired, ["MERGE", "NOINDEX", "REMOVE", "REDIRECT"].includes(a.action), `${a.action}: owner-approval label wrong`);
  }
  const merge = decideForPage(page({ sameNeedPeers: ["p2"] })).actions[0];
  assert.equal(merge.notMeasured, MERGE_NOT_MEASURED, "a MERGE lost its unmeasured caveat");
});

/* ================= REAL — count-only, with the missing facts ================= */

test("REAL · the client's recorded structures, as they are — no CREATE, every CANNOT DECIDE names its missing facts", async () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const product = await subject("almi-oet");
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const r = readClientActionEvidence({ tenantId, product, records, resolve });
  assert.ok(r.pages.length > 0 && r.needs.length > 0, "EMPTY real population");
  assert.equal(r.summary.needs.byAction.CREATE, 0, "a real proposed need became a new page");
  for (const d of [...r.needs, ...r.pages]) {
    if (d.decision === D.CANNOT_DECIDE) assert.ok(d.missing.length > 0, "a real CANNOT DECIDE names no missing fact");
    for (const a of d.actions) assert.equal(a.standing, "RECOMMENDATION");
    for (const a of d.actions.filter((x) => x.action === "MERGE")) assert.equal(a.notMeasured, MERGE_NOT_MEASURED);
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
    assert.match(ok.stdout, /proposed needs\s+\d+ · CHOSEN \d+ · CANNOT_DECIDE \d+/);
    assert.match(ok.stdout, /existing pages\s+\d+ · CHOSEN \d+ · CANNOT_DECIDE \d+/);
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
