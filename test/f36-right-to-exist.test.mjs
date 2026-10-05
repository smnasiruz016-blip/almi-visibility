/**
 * F36 · URL RIGHT-TO-EXIST — the proofs of the frozen acceptance (_handoffs 2635153, RR-87).
 *
 * 🔴 EXPECTED OUTCOMES ARE WRITTEN BY HAND from the acceptance's definitions; the existing-page decisions fed in come from the
 * production check (existingPageFirst) over constructed populations, so the input is real behaviour and the expectation is not
 * computed by the code under test. The REAL declared candidates are run as they are, count-only. No production-trail write.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { rightToExist, mayProduceCandidate, RIGHT_TO_EXIST as E, NOT_MEASURED_RESIDUE } from "../src/page/right-to-exist.mjs";
import { existingPageFirst } from "../src/page/existing-page-first.mjs";
import { readExistingPagePopulation, rightToExistGate } from "../src/page/existing-page-population.mjs";
import { pageProductionCensus } from "../tools/existing-page-first-census.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { subject } from "./support/subjects.mjs";
import { execFileSync } from "node:child_process";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const T = "tenant:f36-fixture";
const VARIANTS = ["alpha", "beta", "gamma"];
const why = (humanNeed, distinctValue) => ({ whyThisUrlDeservesToExist: { humanNeed, distinctValue } });
const SPECS = {
  alpha: { variant: "alpha", ...why("a first-time applicant needs the alpha licensing steps in order", "the only page that sequences the alpha steps with their deadlines") },
  beta: { variant: "beta", ...why("a returning professional needs the beta renewal exceptions", "a worked renewal example with every exception case") },
  gamma: { variant: "gamma", ...why("an employer needs to verify gamma credentials quickly", "a verification checklist employers can follow in one pass") },
};
const siblingsOf = (slug, specs = SPECS) => Object.entries(specs).filter(([s]) => s !== slug).map(([s, spec]) => ({ slug: s, spec }));
const decide = (intent, pages, coverageState = "COMPLETE") =>
  existingPageFirst({ candidate: { slug: intent, intent, structure: { values: VARIANTS } }, tenantId: T, population: { tenantId: T, coverageState, pages } });
const NONE = decide("alpha", []); // no existing page, COMPLETE → the need is not served
const rte = (slug, over = {}) => rightToExist({ slug, spec: over.spec ?? SPECS[slug], siblings: over.siblings ?? siblingsOf(slug, over.specs), variants: VARIANTS, existingPageDecision: "decision" in over ? over.decision : NONE, rationaleReviews: over.reviews ?? [] });
/* a reason whose shingles overlap beta's above 0.40 (S38's review signal) */
const NEAR = { variant: "alpha", ...why("a returning professional needs the beta renewal exceptions quickly", "a worked renewal example with every exception case") };

test("C2/C4 · a specific reason and an unserved need → ESTABLISHED, still carrying the unmeasured residue", () => {
  const r = rte("alpha");
  assert.equal(r.outcome, E.ESTABLISHED);
  assert.deepEqual([r.parts.specific.state, r.parts.notServed.state], ["PASS", "PASS"]);
  assert.equal(r.notMeasured, NOT_MEASURED_RESIDUE);
  assert.match(r.notMeasured, /NOT ENFORCED/, "the residue that cannot be measured is not carried");
});

test("C1/C2 · no reason, a variable-only reason, a sibling's template, a near-identical reason → REFUSED, each failure named", () => {
  const cases = [
    ["no reason", { spec: { variant: "alpha" } }],
    ["variable only", { spec: { variant: "alpha", ...why("alpha", "alpha") } }],
    ["a sibling's template", { spec: { variant: "alpha", ...why("a returning professional needs the alpha renewal exceptions", "a worked renewal example with every exception case") } }],
    /* RR-179 · RTP-1 Rev 6 S38: near-identical is judged on SUBSTANCE — a recorded review that finds the reasons the SAME refuses */
    ["near-identical", { spec: NEAR, reviews: [{ pair: ["alpha", "beta"], verdict: "SAME", ref: "review:f36:near", source: { kind: "METHOD" } }] }],
  ];
  for (const [label, over] of cases) {
    const r = rte("alpha", over);
    assert.equal(r.outcome, E.REFUSED, `${label}: ${r.outcome}`);
    assert.deepEqual([...r.failed], ["specific"], label);
    assert.ok(r.parts.specific.reason, `${label}: the refusal names no failure`);
  }
});

test("C2 · S38: an overlap above 0.40 is a REVIEW SIGNAL — no recorded review → CANNOT DECIDE, never REFUSED on the number; a DISTINCT review passes", () => {
  const noReview = rte("alpha", { spec: NEAR });
  assert.equal(noReview.outcome, E.CANNOT_DECIDE, `the percentage alone decided: ${noReview.outcome}`);
  assert.match(noReview.parts.specific.reason, /review required/);
  const distinct = rte("alpha", { spec: NEAR, reviews: [{ pair: ["alpha", "beta"], verdict: "DISTINCT", ref: "review:f36:distinct", source: { kind: "AGENT" } }] });
  assert.equal(distinct.outcome, E.ESTABLISHED, "a recorded DISTINCT review did not let a specific reason through");
  /* a review carrying an approval field, or with no METHOD/AGENT source, is no review */
  for (const bad of [{ pair: ["alpha", "beta"], verdict: "SAME", ref: "r", source: { kind: "PERSON" } }, { pair: ["alpha", "beta"], verdict: "SAME", ref: "r", source: { kind: "METHOD" }, approvedBy: "x" }]) {
    assert.equal(rte("alpha", { spec: NEAR, reviews: [bad] }).outcome, E.CANNOT_DECIDE, `an invalid review decided: ${JSON.stringify(bad)}`);
  }
});

test("C2/C4 · a sibling with no reason → CANNOT DECIDE, never ESTABLISHED; a lone page with no sibling at all is not undecided for that alone (D1, record B)", () => {
  const noSiblingReason = rte("alpha", { specs: { ...SPECS, beta: { variant: "beta" } } });
  assert.equal(noSiblingReason.outcome, E.CANNOT_DECIDE);
  assert.deepEqual([...noSiblingReason.undecided], ["specific"]);
  /* RR-179 §4.4 · record B (_handoffs d014ca1): "differs from every sibling" holds with none to differ from; the residue stays NOT MEASURED */
  const lone = rte("alpha", { siblings: [] });
  assert.equal(lone.outcome, E.ESTABLISHED);
  assert.match(lone.checks.find((c) => c.check === "distinct from every sibling").basis, /no sibling spec exists/);
  assert.match(lone.notMeasured, /NOT ENFORCED/);
});

test("C3 · an existing page covering the need → REFUSED (improve, do not create); F33 cannot decide or refused information → CANNOT DECIDE", () => {
  const covered = rte("alpha", { decision: decide("alpha", [{ pageId: "p1", tenantId: T, html: "<h1>Alpha</h1>" }]) });
  assert.equal(covered.outcome, E.REFUSED);
  assert.deepEqual([...covered.failed], ["notServed"]);
  assert.match(covered.parts.notServed.reason, /COVERS_THE_NEED/);
  const defect = rte("alpha", { decision: decide("alpha", [{ pageId: "p1", tenantId: T, html: "<h1>Alpha</h1>", recordedDefect: "stale" }]) });
  assert.equal(defect.outcome, E.REFUSED, "an existing page to IMPROVE did not refuse creation");
  const undecidable = rte("alpha", { decision: decide("alpha", [{ pageId: "p2", tenantId: T, html: "<h1>Contact</h1>" }]) });
  assert.equal(undecidable.outcome, E.CANNOT_DECIDE, "F33 CANNOT DECIDE became a verdict");
  const partial = rte("alpha", { decision: decide("alpha", [], "PARTIAL") });
  assert.equal(partial.outcome, E.CANNOT_DECIDE);
  const refusedInfo = rte("alpha", { decision: existingPageFirst({ candidate: { slug: "alpha", intent: "alpha" }, tenantId: T, population: null }) });
  assert.equal(refusedInfo.outcome, E.CANNOT_DECIDE);
  assert.equal(rte("alpha", { decision: undefined }).outcome, E.CANNOT_DECIDE, "a missing decision was read as 'not served'");
  const notCovered = rte("gamma", { decision: decide("gamma", [{ pageId: "p3", tenantId: T, html: "<h1>Alpha</h1>" }]) });
  assert.equal(notCovered.outcome, E.ESTABLISHED, "F33 NOT COVERED did not let a specific candidate establish its right to exist");
});

test("C4 · a named failure outranks a missing judgement; every outcome is one of three and carries its deciding parts", () => {
  const both = rte("alpha", { spec: { variant: "alpha" }, decision: decide("alpha", [], "PARTIAL") });
  assert.equal(both.outcome, E.REFUSED);
  for (const r of [rte("alpha"), both, rte("alpha", { siblings: [] })]) {
    assert.ok(Object.values(E).includes(r.outcome));
    assert.ok(r.parts.specific.state && r.parts.notServed.state, "an outcome without its deciding parts");
    assert.ok(r.notMeasured);
  }
});

test("C1 · the gate's rule: a candidate is produced only when the existing-page check lets it AND its right is ESTABLISHED", () => {
  const ok = rte("alpha");
  assert.equal(mayProduceCandidate({ mayProduce: true }, ok), true);
  assert.equal(mayProduceCandidate({ mayProduce: false }, ok), false, "a candidate the existing-page check stopped was produced");
  assert.equal(mayProduceCandidate({ mayProduce: true }, rte("alpha", { spec: { variant: "alpha" } })), false, "a candidate without a right to exist was produced");
  assert.equal(mayProduceCandidate({ mayProduce: true }, rte("alpha", { specs: { ...SPECS, beta: { variant: "beta" } } })), false, "CANNOT DECIDE produced a candidate");
  assert.equal(mayProduceCandidate(undefined, ok), false);
});

test("C1 · the tools' GATE: even when the existing-page check lets a candidate through, no right to exist → nothing produced", () => {
  const pass = () => ({ mayProduce: true, outcome: "NO_EXISTING_PAGE", reason: "NO_EXISTING_PAGE_IN_A_COMPLETE_POPULATION" });
  /* F39 (RR-90) is a third declared dependency of the gate; stubbed ESTABLISHED here so this test judges F36 alone */
  const baselines = (s) => ({ templates: { state: s }, currentPages: { state: s }, competitors: { state: s } });
  const gainPass = () => ({ outcome: "ESTABLISHED", baselines: baselines("BEYOND") });
  const base = { scope: {}, entry: "test", candidate: { slug: "alpha", intent: "alpha" }, siblings: siblingsOf("alpha"), variants: VARIANTS, gate: pass, gain: gainPass };
  const refused = rightToExistGate({ ...base, spec: { variant: "alpha" } });
  assert.equal(refused.rightToExist.outcome, E.REFUSED);
  assert.equal(refused.mayProduce, false, "the gate produced a candidate with no right to exist");
  const established = rightToExistGate({ ...base, spec: SPECS.alpha });
  assert.equal(established.rightToExist.outcome, E.ESTABLISHED);
  assert.equal(established.mayProduce, true, "the control: the gate CAN let an established candidate through");
  const stopped = rightToExistGate({ ...base, spec: SPECS.alpha, gate: () => ({ mayProduce: false, outcome: "MONITOR", reason: "AN_EXISTING_PAGE_SERVES_THIS_INTENT" }) });
  assert.equal(stopped.mayProduce, false);
  /* F39: an ESTABLISHED right to exist whose information gain cannot be decided is NOT produced */
  const noGain = rightToExistGate({ ...base, spec: SPECS.alpha, gain: () => ({ outcome: "CANNOT_DECIDE", baselines: baselines("NOT_MEASURED") }) });
  assert.equal(noGain.rightToExist.outcome, E.ESTABLISHED);
  assert.equal(noGain.mayProduce, false, "the gate produced a candidate whose information gain was not established");
});

test("C5 · every page-producing path reaches the one function: construction holds it, every tool calls its gate — and the census fires", () => {
  const files = execFileSync("git", ["-C", REPO, "ls-files", "*.mjs"], { encoding: "utf8" }).split("\n").filter((f) => f && !f.startsWith("test/")).map((file) => ({ file, text: readFileSync(join(REPO, file), "utf8") }));
  const r = pageProductionCensus({ files });
  assert.deepEqual(r.faults, []);
  console.log(`  C5 (count-only): ${r.population.length} page-producing path(s) · ROUTED ${r.rows.filter((x) => x.class === "ROUTED").length} · CHECKS ${r.rows.filter((x) => x.class === "CHECKS").length} · faults 0 · bound: ${r.scanned} tracked modules`);
  const tool = "subjects/almi-oet/tools/nursing-chain.mjs";
  const noGate = files.map((f) => (f.file === tool ? { ...f, text: f.text.split("rightToExistGate(").join("existingPageGate(") } : f));
  assert.deepEqual(pageProductionCensus({ files: noGate }).faults, [{ file: tool, code: "ROUTED_WITHOUT_THE_CHECK" }], "a tool that skips right-to-exist was not caught");
  const noCall = files.map((f) => (f.file === "src/page/construct.mjs" ? { ...f, text: f.text.split("rightToExist({").join("judgeWhyOnly({") } : f));
  assert.deepEqual(pageProductionCensus({ files: noCall }).faults, [{ file: "src/page/construct.mjs", code: "ROUTED_WITHOUT_THE_CHECK" }], "construction without right-to-exist was not caught");
});

test("REAL · the real declared candidates, as they are — outcomes count-only, with the missing facts named", async () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const { population } = readExistingPagePopulation({ scope: { tenantId }, resolve });
  const { pageSpecs, variants } = await subject("almi-oet");
  const slugs = Object.keys(pageSpecs);
  assert.ok(slugs.length > 0, "EMPTY real candidate population");
  const out = slugs.map((slug) => {
    const decision = existingPageFirst({ candidate: { slug, intent: pageSpecs[slug].variant, structure: { values: variants } }, tenantId, population });
    return rightToExist({ slug, spec: pageSpecs[slug], siblings: slugs.filter((s) => s !== slug).map((s) => ({ slug: s, spec: pageSpecs[s] })), variants, existingPageDecision: decision });
  });
  const count = (o) => out.filter((r) => r.outcome === o).length;
  assert.equal(count(E.ESTABLISHED) + count(E.REFUSED) + count(E.CANNOT_DECIDE), slugs.length);
  assert.equal(count(E.ESTABLISHED), 0, "a real candidate established a right to exist while an existing page covers its need or no reason is declared");
  const specific = out.filter((r) => r.parts.specific.state === "PASS").length;
  const covered = out.filter((r) => r.parts.notServed.state === "FAIL").length;
  console.log(`  REAL (count-only): ${slugs.length} declared candidate(s) · ESTABLISHED ${count(E.ESTABLISHED)} · REFUSED ${count(E.REFUSED)} · CANNOT_DECIDE ${count(E.CANNOT_DECIDE)} · reason specific ${specific} · need already covered by an existing page ${covered} · NOT MEASURED on all: whether the need is real and the value distinct in substance (no demand evidence recorded)`);
});

test("C6 · the right-to-exist function loads no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/page/right-to-exist.mjs"];
  const r = decisionCallPaths({ entries });
  assert.deepEqual(r.faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
