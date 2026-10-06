/**
 * F39 · ORIGINAL INFORMATION GAIN (acceptance _handoffs 90e798d, RR-90).
 *
 * Expected verdicts are written by hand from each fixture:
 *   · pages "a" and "b" share one 10-word nav and carry different 20-word bodies, so each has text outside the shared shell;
 *   · page "s" is the nav alone, so every one of its shingles recurs on another page: SHELL ONLY;
 *   · page "d" repeats "a"'s body under the same nav: an exact duplicate of "a".
 * Nothing here writes to the production trail (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { judgeInformationGain, informationGainForCandidate, validGainRecord, MISSING, NO_RECORDED_GAIN_EVIDENCE } from "../src/page/information-gain.mjs";
import { readClientInformationGain } from "../src/page/information-gain-evidence.mjs";
import { rightToExistGate } from "../src/page/existing-page-population.mjs";
import { pageProductionCensus } from "../tools/existing-page-first-census.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- fixtures ---- */
const seq = (p, n) => Array.from({ length: n }, (_, i) => `${p}${i + 1}`).join(" ");
const NAV = seq("n", 10);
const doc = (main) => `<html><head><title>t</title></head><body><nav>${NAV}</nav><main>${main}</main></body></html>`;
const pg = (pageId, main, verified = true) => ({ pageId, html: doc(main), verified });
const SIX = ["intent", "answer", "facts", "architecture", "examples", "userValue"];
const gain = (pageId, over = {}) => ({ pageId, kind: "USEFUL_COMPARISON", adds: "a side-by-side of the two pathways", ref: `gain:${pageId}`, ...over });
const cmp = (pageId, over = {}) => ({ pageId, competitorsCompared: 2, gainBeyond: true, ref: `cmp:${pageId}`, ...over });
/* RR-192: a counted review is recorded with needsGuidance: false (F32 C3 and F39 C3 as amended) */
const distinct = (a, b) => ({ pair: [a, b], compared: SIX, duplicate: false, documentedDistinctValue: "different pathway", needsGuidance: false, ref: `rev:${a}:${b}` });
const ev = (over = {}) => ({ gainRecords: [], competitorComparisons: [], reviews: [], ...over });
const A = () => pg("a", seq("a", 20)), B = () => pg("b", seq("b", 20));
const one = (r, id) => r.decisions.find((d) => d.pageId === id);
const FULL = ev({ gainRecords: [gain("a"), gain("b")], competitorComparisons: [cmp("a"), cmp("b")], reviews: [distinct("a", "b")] });

/* ================= C1 — three baselines, each with its own verdict ================= */

test("C1 · every page carries a verdict for templates, current pages and competitors — each with its evidence or its missing fact", () => {
  const r = judgeInformationGain({ pages: [A(), B()], evidence: NO_RECORDED_GAIN_EVIDENCE });
  for (const d of r.decisions) {
    assert.deepEqual(Object.keys(d.baselines), ["templates", "currentPages", "competitors"]);
    for (const [k, v] of Object.entries(d.baselines)) {
      assert.ok(["BEYOND", "NOT_BEYOND", "NOT_MEASURED"].includes(v.state), `${k}: ${v.state}`);
      assert.ok(v.evidence.length > 0 || typeof v.missing === "string", `${k}: neither evidence nor a missing fact`);
    }
  }
  const a = one(r, "a");
  assert.equal(a.baselines.templates.state, "NOT_MEASURED");
  assert.match(a.baselines.templates.missing, /text outside the shared shell exists; whether it is useful value needs a recorded information-gain record/);
  assert.equal(a.baselines.currentPages.missing, MISSING.REVIEW);
  assert.equal(a.baselines.competitors.missing, MISSING.COMPETITORS);
  const full = one(judgeInformationGain({ pages: [A(), B()], evidence: FULL }), "a");
  assert.deepEqual(Object.values(full.baselines).map((v) => v.state), ["BEYOND", "BEYOND", "BEYOND"]);
  assert.ok(full.baselines.templates.evidence.includes("gain:a") && full.baselines.competitors.evidence.some((e) => /cmp:a/.test(e)));
});

/* ================= C2 — gain is recorded, never assumed ================= */

test("C2 · FIRING CONTROL: every baseline otherwise clear but NO recorded gain record is CANNOT DECIDE — never ESTABLISHED; a declared or malformed record is no record", () => {
  const noGain = ev({ competitorComparisons: [cmp("a"), cmp("b")], reviews: [distinct("a", "b")] });
  const r = judgeInformationGain({ pages: [A(), B()], evidence: noGain });
  assert.equal(one(r, "a").outcome, "CANNOT_DECIDE", "gain was assumed without a recorded gain record");
  assert.ok(one(r, "a").missing.some((m) => m.includes(MISSING.GAIN)));
  /* each gain-dependent baseline names the missing gain itself, so neither can pass on reviews or comparisons alone */
  assert.deepEqual([one(r, "a").baselines.currentPages.state, one(r, "a").baselines.currentPages.missing], ["NOT_MEASURED", MISSING.GAIN]);
  for (const bad of [gain("a", { kind: "DECLARED_INTENTION" }), gain("a", { adds: "  " }), gain("a", { ref: "" }), { pageId: "a", whyThisUrlDeservesToExist: { distinctValue: "declared" } }]) {
    assert.equal(validGainRecord(bad), false, `a malformed or declared record counted: ${JSON.stringify(bad)}`);
    assert.equal(one(judgeInformationGain({ pages: [A(), B()], evidence: { ...noGain, gainRecords: [bad] } }), "a").outcome, "CANNOT_DECIDE");
  }
  const est = one(judgeInformationGain({ pages: [A(), B()], evidence: FULL }), "a");
  assert.equal(est.outcome, "ESTABLISHED", "the control: a recorded gain with every baseline BEYOND is ESTABLISHED");
  assert.equal(est.gainRecord, "gain:a");
});

/* ================= C3 — certain refusals ================= */

test("C3 · SHELL ONLY, an exact or reviewed duplicate, and a recorded no-gain comparison are NOT BEYOND — REFUSED with the baseline named, even with a gain record", () => {
  const shellOnly = judgeInformationGain({ pages: [A(), pg("s", "")], evidence: ev({ gainRecords: [gain("s")], competitorComparisons: [cmp("s")] }) });
  assert.equal(one(shellOnly, "s").baselines.templates.state, "NOT_BEYOND");
  assert.equal(one(shellOnly, "s").outcome, "REFUSED");
  assert.deepEqual(one(shellOnly, "s").refusedOn, ["templates"]);
  const exact = judgeInformationGain({ pages: [A(), pg("d", seq("a", 20))], evidence: ev({ gainRecords: [gain("d")], competitorComparisons: [cmp("d")] }) });
  assert.equal(one(exact, "d").baselines.currentPages.state, "NOT_BEYOND");
  /* "d" repeats "a" whole — nav AND body — so every shingle of "d" also recurs on "a": it is SHELL ONLY by recurrence as well */
  assert.deepEqual(one(exact, "d").refusedOn, ["templates", "currentPages"]);
  /* the same body under a DIFFERENT nav: its own nav is text outside the shared shell, so ONLY the exact duplicate refuses it */
  const ownNav = { pageId: "e", html: `<html><head><title>t</title></head><body><nav>${seq("m", 10)}</nav><main>${seq("a", 20)}</main></body></html>`, verified: true };
  const exactOnly = judgeInformationGain({ pages: [A(), ownNav], evidence: ev({ gainRecords: [gain("e")], competitorComparisons: [cmp("e")] }) });
  assert.equal(one(exactOnly, "e").baselines.templates.state, "BEYOND");
  assert.deepEqual(one(exactOnly, "e").refusedOn, ["currentPages"], "an exact duplicate of a current page was not refused on that baseline");
  const reviewedDup = judgeInformationGain({ pages: [A(), B()], evidence: { ...FULL, reviews: [{ ...distinct("a", "b"), duplicate: true }] } });
  assert.deepEqual(one(reviewedDup, "a").refusedOn, ["currentPages"], "a reviewed duplicate was not refused");
  const noGainBeyond = judgeInformationGain({ pages: [A(), B()], evidence: { ...FULL, competitorComparisons: [cmp("a", { gainBeyond: false }), cmp("b")] } });
  assert.deepEqual(one(noGainBeyond, "a").refusedOn, ["competitors"]);
  assert.equal(one(noGainBeyond, "b").outcome, "ESTABLISHED", "the control: the other page is untouched");
});

/* ================= C3 AS AMENDED — F39 follows F32 C3 as amended (RR-192) ================= */

test("C3 AS AMENDED · a duplicate review with needsGuidance: false is NOT BEYOND and REFUSED as before; with needsGuidance: true or absent the current-pages baseline is NOT MEASURED naming the missing guidance-free review and the page CANNOT DECIDE; a DISTINCT review makes BEYOND only when needsGuidance: false", () => {
  const dupReview = (over) => ({ ...distinct("a", "b"), duplicate: true, ...over });
  /* recorded guidance-free: as before */
  const counted = one(judgeInformationGain({ pages: [A(), B()], evidence: { ...FULL, reviews: [dupReview({ needsGuidance: false })] } }), "a");
  assert.deepEqual([counted.baselines.currentPages.state, counted.outcome], ["NOT_BEYOND", "REFUSED"]);
  /* guidance-dependent, and unmarked: NOT MEASURED, never NOT BEYOND or BEYOND; CANNOT DECIDE, never REFUSED or ESTABLISHED */
  for (const over of [{ needsGuidance: true }, { needsGuidance: undefined }]) {
    for (const review of [dupReview(over), { ...distinct("a", "b"), ...over }]) {
      const d = one(judgeInformationGain({ pages: [A(), B()], evidence: { ...FULL, reviews: [review] } }), "a");
      assert.equal(d.baselines.currentPages.state, "NOT_MEASURED", `a ${over.needsGuidance === true ? "guidance-dependent" : "unmarked"} ${review.duplicate ? "DUPLICATE" : "DISTINCT"} review decided the baseline`);
      assert.ok(d.baselines.currentPages.missing.includes("needs no guidance"), `the missing guidance-free review is not named: ${d.baselines.currentPages.missing}`);
      assert.equal(d.outcome, "CANNOT_DECIDE");
    }
  }
  /* the DISTINCT review with a gain record makes BEYOND only when recorded guidance-free */
  assert.equal(one(judgeInformationGain({ pages: [A(), B()], evidence: FULL }), "a").baselines.currentPages.state, "BEYOND");
});

/* ================= C4 — competitors are diagnostic only ================= */

test("C4 · the competitor baseline reads only a RECORDED comparison: none → NOT MEASURED; one that names no competitor → NOT MEASURED; the module collects nothing", () => {
  const none = one(judgeInformationGain({ pages: [A(), B()], evidence: { ...FULL, competitorComparisons: [] } }), "a");
  assert.equal(none.baselines.competitors.state, "NOT_MEASURED");
  assert.equal(none.outcome, "CANNOT_DECIDE", "a page was established without any competitor comparison");
  const empty = one(judgeInformationGain({ pages: [A(), B()], evidence: { ...FULL, competitorComparisons: [cmp("a", { competitorsCompared: 0 }), cmp("b")] } }), "a");
  assert.equal(empty.baselines.competitors.state, "NOT_MEASURED", "a comparison against no competitor counted");
  const code = readFileSync(join(REPO, "src/page/information-gain.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(code, /\bfetch\(|http|collect[A-Z(]/, "F39 contains a collection path");
});

/* ================= C5 — cannot decide, never forced; the checker is not the verdict ================= */

test("C5 · FIRING CONTROL: an unmeasured baseline is CANNOT DECIDE naming each missing fact — never ESTABLISHED, never REFUSED by default", () => {
  const r = judgeInformationGain({ pages: [A(), B()], evidence: NO_RECORDED_GAIN_EVIDENCE });
  for (const d of r.decisions) {
    assert.equal(d.outcome, "CANNOT_DECIDE", `${d.pageId}: an unmeasured page was given a verdict`);
    assert.equal(d.missing.length, Object.values(d.baselines).filter((b) => b.state === "NOT_MEASURED").length, "a missing fact is not named");
    assert.deepEqual(d.refusedOn, []);
  }
  const partial = one(judgeInformationGain({ pages: [A(), B()], evidence: { ...FULL, reviews: [] } }), "a");
  assert.equal(partial.outcome, "CANNOT_DECIDE", "two BEYOND baselines and one unmeasured became a verdict");
  assert.deepEqual(partial.missing, [`currentPages: ${MISSING.REVIEW}`]);
});

/* ================= C6 — required on the production path ================= */

test("C6 · the gate produces nothing unless information gain is ESTABLISHED, and the census sees F39 on every accepting path — and fires", () => {
  const pass = () => ({ mayProduce: true, outcome: "NO_EXISTING_PAGE", reason: "NO_EXISTING_PAGE_IN_A_COMPLETE_POPULATION" });
  const spec = { variant: "alpha", whyThisUrlDeservesToExist: { humanNeed: "a first-time applicant needs the alpha licensing steps in order", distinctValue: "the only page that sequences the alpha steps with deadlines" } };
  const sibs = [{ slug: "beta", spec: { variant: "beta", whyThisUrlDeservesToExist: { humanNeed: "a returning professional needs the beta renewal exceptions", distinctValue: "a worked renewal example with every exception case" } } }];
  const base = { scope: {}, entry: "test", candidate: { slug: "alpha", intent: "alpha" }, spec, siblings: sibs, variants: ["alpha", "beta"], gate: pass };
  for (const outcome of ["REFUSED", "CANNOT_DECIDE"]) {
    const g = rightToExistGate({ ...base, gain: () => ({ outcome, baselines: { templates: { state: "NOT_MEASURED" }, currentPages: { state: "NOT_MEASURED" }, competitors: { state: "NOT_MEASURED" } } }) });
    assert.equal(g.rightToExist.outcome, "ESTABLISHED");
    assert.equal(g.mayProduce, false, `the gate produced a candidate whose information gain was ${outcome}`);
  }
  const ok = rightToExistGate({ ...base, gain: () => ({ outcome: "ESTABLISHED", baselines: { templates: { state: "BEYOND" }, currentPages: { state: "BEYOND" }, competitors: { state: "BEYOND" } } }) });
  assert.equal(ok.mayProduce, true, "the control: an ESTABLISHED gain lets an established candidate through");
  /* a candidate with no html is CANNOT DECIDE, never judged as empty-and-fine */
  assert.equal(informationGainForCandidate({ candidateId: "c", html: null, currentPages: [], evidence: FULL }).outcome, "CANNOT_DECIDE");
  /* the census: every accepting path carries F39, and removing F39 from one fires */
  const files = execFileSync("git", ["-C", REPO, "ls-files", "*.mjs"], { encoding: "utf8" }).split("\n").filter((f) => f && !f.startsWith("test/")).map((file) => ({ file, text: readFileSync(join(REPO, file), "utf8") }));
  assert.deepEqual(pageProductionCensus({ files }).faults, []);
  const stripped = files.map((f) => (f.file === "src/page/construct.mjs" ? { ...f, text: f.text.split("informationGainForCandidate(").join("skipped(") } : f));
  assert.deepEqual(pageProductionCensus({ files: stripped }).faults.map((x) => x.code), ["ROUTED_WITHOUT_THE_CHECK"], "the census did not see F39 removed from construction");
});

/* ================= C7 — same client, verified bodies, bound printed, no call-out ================= */

test("C7 · an unverified body measures nothing; the evidence must be passed explicitly", () => {
  const r = judgeInformationGain({ pages: [A(), pg("x", seq("x", 20), false)], evidence: FULL });
  assert.deepEqual(Object.values(one(r, "x").baselines).map((b) => b.missing), [MISSING.BODY, MISSING.BODY, MISSING.BODY]);
  assert.equal(one(r, "x").outcome, "CANNOT_DECIDE");
  /* only the comparisons are missing — F32's own guard (reviews) cannot answer for F39's, which must name ITS evidence */
  assert.throws(() => judgeInformationGain({ pages: [A()], evidence: { gainRecords: [], reviews: [] } }), /gain evidence must be passed explicitly/);
});

test("REAL · the client's recorded pages, as they are — no page ESTABLISHED or REFUSED without recorded evidence; every missing fact named; bound printed", () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const r = readClientInformationGain({ tenantId, resolve, evidence: NO_RECORDED_GAIN_EVIDENCE });
  assert.equal(r.fault, null, r.bound);
  assert.ok(r.summary.population > 0, "EMPTY real population");
  assert.equal(r.summary.outcome.ESTABLISHED ?? 0, 0, "a real page was called passed with no recorded gain");
  for (const d of r.decisions) {
    if (d.outcome === "CANNOT_DECIDE") assert.ok(d.missing.length > 0, "a real CANNOT DECIDE names no missing fact");
    if (d.outcome === "REFUSED") assert.ok(d.refusedOn.every((k) => d.baselines[k].state === "NOT_BEYOND"));
  }
  assert.match(r.bound, /information-gain records 0 · competitor comparisons 0 · semantic reviews 0/);
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify(r.summary)}`);
});

test("C5/C7 · THE ENTRY POINT: counts only, with its bound, never a PASS for an unmeasured page, and it writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/page-information-gain.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ page\(s\)/);
    assert.match(ok.stdout, /CANNOT_DECIDE is not passed/);
    assert.doesNotMatch(ok.stdout, /\bPASS(ED)?\b/, "the entry point presented a page as passed");
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C7 · the decision and its evidence reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/page/information-gain.mjs", "src/page/information-gain-evidence.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
