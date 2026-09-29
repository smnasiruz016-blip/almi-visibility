/**
 * F33 · CANNIBALIZATION PREVENTION — the proofs of the frozen acceptance (_handoffs 9dc9bc2, RR-84 §2).
 *
 * THREE outcomes, each on the REAL registered page structure (the subject's declared values) and the REAL existing pages of its
 * tenant, with any condition the real record does not supply (a COMPLETE population) SET BY THE TEST AND SAID SO. The real record's
 * own outcome is run as it is and printed count-only. Nothing here prints page content, a host or a URL.
 *
 * 🔴 NOTHING HERE WRITES TO THE PRODUCTION TRAIL: the decision is pure; its production byte hash is checked at the end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { decideNeedCoverage, judgePage, stem, sameStem, evidenceSummary, NEED_OUTCOMES as N, NEED_REASONS as NR, PAGE_EVIDENCE as PE, PAGE_VERDICTS as PV } from "../src/page/need-coverage.mjs";
import { existingPageFirst, existingPageDecisionEvent, EXISTING_PAGE_OUTCOMES as O, EXISTING_PAGE_REASONS as R } from "../src/page/existing-page-first.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { GUARD_METADATA_KEYS } from "../src/governance/guard-audit.mjs";
import { metadataFaults } from "../src/audit-trail/event.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { subject } from "./support/subjects.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- the REAL registered structure and the REAL existing pages of its tenant (read once) ---- */
const resolve = createTenantResolver();
const SIDE = resolveSide(resolve, RESOURCES.subject("almi-oet"));
const REAL = readExistingPagePopulation({ scope: { tenantId: SIDE.tenantId }, resolve }).population;
const { variants: VALUES, pageSpecs: SPECS } = await subject("almi-oet");
const T = SIDE.tenantId;
const decide = (need, pages, coverageState = "COMPLETE") =>
  existingPageFirst({ candidate: { slug: `candidate-${VALUES.indexOf(need)}`, intent: need, structure: { values: VALUES } }, tenantId: T, population: { tenantId: T, coverageState, pages } });
const judged = (need) => REAL.pages.map((p) => ({ page: p, j: judgePage(p, need, VALUES) }));
const constructed = (pageId, html) => ({ pageId, tenantId: T, html });

test("the real inputs exist: a registered structure, and a non-empty same-tenant population (else every clause is COULD-NOT-PROVE)", () => {
  assert.equal(SIDE.state, "RESOLVED");
  assert.ok(VALUES.length >= 2, "the subject registers no page structure");
  assert.ok(REAL.pages.length > 0, "EMPTY real population");
  console.log(`  REAL (count-only): ${VALUES.length} registered values · ${REAL.pages.length} existing pages · coverage ${REAL.coverageState} · bound: one stored batch, this tenant's partition`);
});

/* ---- C1 · F34's refusal preserved ---- */

test("C1 · missing, malformed or foreign existing-page information is REFUSED before F33 judges anything — never COVERED or NOT COVERED", () => {
  const cand = { slug: "c", intent: VALUES[0], structure: { values: VALUES } };
  for (const population of [null, { tenantId: T, pages: [] }, { tenantId: "tenant:someone-else", coverageState: "COMPLETE", pages: [] }, { tenantId: T, coverageState: "COMPLETE", pages: [{ html: "<h1>x</h1>" }] }]) {
    const d = existingPageFirst({ candidate: cand, tenantId: T, population });
    assert.equal(d.outcome, O.REFUSED, JSON.stringify(population));
    assert.equal(d.mayProduce, false);
    assert.equal(d.needCoverage, undefined, "F33 judged information F34 should have refused");
  }
});

/* ---- C2 · COVERED ---- */

test("C2 · COVERED on the REAL structure: each real declared spec is covered by a real page whose headline names its need only — nothing produced, the page named", () => {
  for (const spec of Object.values(SPECS)) {
    const d = decide(spec.variant, REAL.pages, REAL.coverageState);
    assert.equal(d.needCoverage.outcome, N.COVERED, `${VALUES.indexOf(spec.variant)}: not COVERED`);
    assert.equal(d.mayProduce, false);
    assert.ok(d.needCoverage.covering.length > 0);
    assert.equal(d.existingPages[0], d.needCoverage.covering[0], "the covering page is named first");
    assert.match(evidenceSummary(d.needCoverage), /H_THIS:\d+/);
  }
});

/* Two DECLARED LIMITS, measured here, not tuned away: a practitioner's name that shares no stem with its field's name
 * ("dietitians" / dietetics), and a two-word field whose practitioner name does not repeat both words ("veterinarians",
 * "veterinary scientists" / veterinary science). Each can only ever be CANNOT DECIDE — held, never produced. */
const LIMITS = { dietetics: "dietitians", "veterinary-science": "veterinarians" };

test("C2 · the SAME need in DIFFERENT WORDS is COVERED: a practitioner or inflected form of every registered value (except two declared limits)", () => {
  const derived = { dentistry: "dentists", dietetics: null, medicine: "medical", nursing: "nurses", "occupational-therapy": "occupational therapists", optometry: "optometrists", pharmacy: "pharmacists", physiotherapy: "physiotherapists", podiatry: "podiatrists", radiography: "radiographers", "speech-pathology": "speech pathologists", "veterinary-science": null };
  let proved = 0;
  for (const v of VALUES) {
    const words = derived[v];
    if (words === undefined) assert.fail(`no derived form declared in this test for registered value #${VALUES.indexOf(v)}`);
    if (words === null) continue; // declared limit: shares no stem with its practitioner name — can only be CANNOT_DECIDE
    assert.ok(!words.toLowerCase().includes(v.replace(/-/g, " ")), "the premise: the page does not use the candidate's own words");
    const d = decide(v, [constructed("p1", `<title>OET for ${words}</title><h1>For ${words}</h1>`)]);
    assert.equal(d.needCoverage.outcome, N.COVERED, `#${VALUES.indexOf(v)}: a differently worded covering page was not recognised`);
    proved += 1;
  }
  assert.equal(proved, VALUES.length - Object.keys(LIMITS).length);
  for (const [v, words] of Object.entries(LIMITS)) {
    const limit = decide(v, [constructed("p1", `<h1>For ${words}</h1>`)]);
    assert.equal(limit.needCoverage.outcome, N.CANNOT_DECIDE, `${v}: a declared limit must hold the candidate, never let it through`);
    assert.equal(limit.mayProduce, false);
  }
});

/* ---- C3 · NOT COVERED ---- */

const uncovered = VALUES.filter((v) => judged(v).every(({ j }) => j.verdict !== PV.COVERS));

test("C3 · NOT COVERED on the REAL structure: real pages that each show a DIFFERENT need do not block a new page (population set COMPLETE by the test)", () => {
  assert.ok(uncovered.length > 0, "every registered value is covered on the real record — no NOT COVERED world exists there");
  let proved = 0;
  for (const v of uncovered) {
    /* 🔴 NOT CIRCULAR: the population is not chosen only by the verdict under test. Every real page whose headline names at least
     * one registered need — a raw count, independent of the verdict mapping — and not this one MUST be judged DIFFERENT. */
    const headlineOthers = judged(v).filter(({ j }) => j.headlineNeeds > 0 && j.evidence !== PE.HEADLINE_THIS_ONLY && j.evidence !== PE.HEADLINE_THIS_AND_OTHERS);
    assert.ok(headlineOthers.length > 0);
    assert.ok(headlineOthers.every(({ j }) => j.verdict === PV.DIFFERENT), "a real page whose headline names only other needs was not judged DIFFERENT");
    const different = judged(v).filter(({ j }) => j.verdict === PV.DIFFERENT).map(({ page }) => page);
    assert.ok(different.length >= headlineOthers.length);
    const d = decide(v, different, "COMPLETE"); // SET BY THE TEST: the real record is not recorded COMPLETE
    assert.equal(d.needCoverage.outcome, N.NOT_COVERED);
    assert.equal(d.outcome, O.NOT_COVERED);
    assert.equal(d.mayProduce, true, "unrelated existing pages blocked a genuinely new page merely because the tenant owns them");
    assert.equal(d.needCoverage.pages.length, different.length);
    assert.ok(d.needCoverage.pages.every((p) => p.verdict === PV.DIFFERENT && p.evidence), "a page was passed over without its evidence");
    proved += 1;
  }
  assert.ok(proved > 0);
  console.log(`  C3 (count-only): ${uncovered.length} registered value(s) have no covering real page · NOT COVERED shown for ${proved} of them over their real DIFFERENT pages`);
});

test("C3 · NOT COVERED is NEVER given over a population not recorded COMPLETE, nor when any page cannot be ruled out", () => {
  const v = uncovered[0];
  const different = judged(v).filter(({ j }) => j.verdict === PV.DIFFERENT).map(({ page }) => page);
  for (const c of ["PARTIAL", "UNKNOWN"]) {
    const d = decide(v, different, c);
    assert.equal(d.needCoverage.outcome, N.CANNOT_DECIDE, c);
    assert.equal(d.needCoverage.reason, NR.NOT_COMPLETE);
    assert.equal(d.mayProduce, false);
  }
  const withUndecidable = decide(v, [...different, constructed("zz", "<h1>Contact us</h1><p>Hours and address.</p>")], "COMPLETE");
  assert.equal(withUndecidable.needCoverage.outcome, N.CANNOT_DECIDE, "one page that cannot be ruled out must hold the decision");
  assert.equal(withUndecidable.needCoverage.reason, NR.UNDECIDED_PAGES);
});

/* ---- C4 · CANNOT DECIDE ---- */

test("C4 · CANNOT DECIDE — the REAL record as it is: every uncovered value is held, with its reason, and never reported as either other outcome", () => {
  for (const v of uncovered) {
    const d = decide(v, REAL.pages, REAL.coverageState);
    assert.equal(d.needCoverage.outcome, N.CANNOT_DECIDE);
    assert.ok([NR.UNDECIDED_PAGES, NR.NOT_COMPLETE].includes(d.needCoverage.reason));
    assert.equal(d.outcome, O.MONITOR);
    assert.equal(d.mayProduce, false);
  }
  const undecided = REAL.pages.filter((p) => uncovered.length && judgePage(p, uncovered[0], VALUES).verdict === PV.UNDECIDED).length;
  console.log(`  C4 (count-only): the real record holds ${uncovered.length} uncovered value(s) as CANNOT DECIDE · ${undecided} real page(s) cannot be ruled out for the first of them · coverage ${REAL.coverageState}`);
});

test("C4 · each undecidable world is CANNOT DECIDE: a synonym-only page, a shared headline, a body mention, no structure, an unregistered need", () => {
  const v = "nursing";
  const worlds = [
    [PE.NO_REGISTERED_NEED, [constructed("s", "<h1>For RNs</h1><p>Care-sector writing.</p>")]],
    [PE.HEADLINE_THIS_AND_OTHERS, [constructed("h", "<h1>Nursing and pharmacy</h1>")]],
    [PE.BODY_THIS_AMONG_OTHERS, [constructed("b", "<h1>Writing tasks</h1><p>Examples for nursing and medicine.</p>")]],
  ];
  for (const [evidence, pages] of worlds) {
    const d = decide(v, pages);
    assert.equal(d.needCoverage.pages[0].evidence, evidence);
    assert.equal(d.needCoverage.outcome, N.CANNOT_DECIDE, evidence);
    assert.equal(d.mayProduce, false, `${evidence}: an undecidable page let a new page through`);
  }
  const hub = decide(v, [constructed("x", `<h1>Choose your profession</h1><p>${VALUES.join(" ")}</p>`)]);
  assert.equal(hub.needCoverage.pages[0].evidence, PE.BODY_EVERY_NEED, "a page naming every registered need is about the structure itself");
  assert.equal(hub.needCoverage.outcome, N.NOT_COVERED);
  const noStructure = existingPageFirst({ candidate: { slug: "c", intent: v }, tenantId: T, population: { tenantId: T, coverageState: "COMPLETE", pages: [constructed("a", "<h1>Pharmacy</h1>")] } });
  assert.equal(noStructure.needCoverage.reason, NR.NO_STRUCTURE);
  assert.equal(noStructure.mayProduce, false);
  assert.deepEqual(noStructure.existingPages, ["a"], "an undecidable outcome must still name the existing page");
  assert.equal(decide("not-a-registered-value", [constructed("a", "<h1>Pharmacy</h1>")]).needCoverage.reason, NR.NEED_NOT_REGISTERED);
});

/* ---- C5 · the recorded reason ---- */

test("C5 · every outcome carries its reason and per-page evidence; COVERED and CANNOT DECIDE record ONE REFUSAL, NOT COVERED ONE EVALUATION — metadata only", () => {
  const v = uncovered[0];
  const different = judged(v).filter(({ j }) => j.verdict === PV.DIFFERENT).map(({ page }) => page);
  const cases = [
    [decide(Object.values(SPECS)[0].variant, REAL.pages, REAL.coverageState), "REFUSAL", /need=COVERED ev=[A-Z_:0-9,]*H_THIS:/],
    [decide(v, different, "COMPLETE"), "EVALUATION", /need=NOT_COVERED ev=/],
    [decide(v, REAL.pages, REAL.coverageState), "REFUSAL", /need=CANNOT_DECIDE ev=/],
  ];
  for (const [d, type, pattern] of cases) {
    assert.ok(typeof d.reason === "string" && d.reason.length > 0, "an outcome with no reason");
    assert.ok(d.needCoverage.pages.every((p) => typeof p.evidence === "string" && p.verdict), "a page judged with no evidence");
    const ev = existingPageDecisionEvent(d, { entry: "bin/build-page.mjs" });
    assert.equal(ev.eventType, type);
    assert.equal(ev.reasonCode, d.reason);
    assert.match(ev.metadata.classification, pattern);
    assert.ok(ev.metadata.classification.length <= 200);
    assert.deepEqual(Object.keys(ev.metadata).filter((k) => !GUARD_METADATA_KEYS.includes(k)), []);
    assert.deepEqual(metadataFaults(ev.metadata), []);
    assert.doesNotMatch(JSON.stringify(ev), /https?:\/\//, "a recorded reason carries a URL");
  }
});

/* ---- C6 · routed ---- */

test("C6 · the one check every routed path calls reaches F33: a non-empty population always carries F33's judgement of every page", () => {
  const d = decide(VALUES[0], REAL.pages, REAL.coverageState);
  assert.ok(d.needCoverage, "existingPageFirst answered without F33");
  assert.equal(d.needCoverage.pages.length, REAL.pages.length, "a page was not judged");
});

/* ---- C7 · no paid or metered call ---- */

test("C7 · the decision loads no module that can make a network, process, connector or paid-provider call — and the enumeration fires when one is planted", () => {
  const r = decisionCallPaths();
  assert.deepEqual(r.faults, []);
  assert.ok(r.modules.includes("src/page/need-coverage.mjs") && r.modules.length >= 3, `the enumeration saw ${r.modules.length} modules`);
  const planted = decisionCallPaths({ read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === "src/page/need-coverage.mjs" ? `${t}\nconst r = await fetch(x);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  console.log(`  C7 (count-only): ${r.modules.length} module(s) in the decision's static import closure · 0 call-out paths`);
});

/* ---- the stemmer, stated ---- */

test("the free matcher's rules: inflections join, different registered values never do", () => {
  assert.ok(sameStem(stem("nursing"), stem("nurses")));
  for (let i = 0; i < VALUES.length; i += 1) for (let k = i + 1; k < VALUES.length; k += 1) {
    const a = judgePage(constructed("p", `<h1>${VALUES[k].replace(/-/g, " ")}</h1>`), VALUES[i], VALUES);
    assert.equal(a.verdict, PV.DIFFERENT, `registered value #${k} was read as #${i}`);
  }
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
