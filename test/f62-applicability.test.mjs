/**
 * 🔴 F62 · INTERNATIONAL AND LOCALE INTELLIGENCE — WHERE A PRODUCT APPLIES (acceptance _handoffs a5ec9f1, RR-148).
 *
 * Fixtures DRIVE the rules; they are never real applicability observations. Every fixture record is shaped so that the REAL F46 audit
 * (src/facts/citation-audit.mjs) and the REAL F45 assessment (src/facts/fact-health.mjs) judge it — nothing here copies their checks. The
 * two-product proof runs the production reader (src/research/research-plan-reader.mjs) over two unrelated neutral test products, each with
 * its own fixture registry on disk. The REAL test reads every declared product in the real data root, count-only. Nothing is fetched; the
 * production trail is not written (last test).
 *
 *   P1 C1 four outcomes, read only from a stated outcome; ACCEPTED never REQUIRED; a conflict names both and chooses none
 *   P2 C2 absent is UNKNOWN, "no source" named, never NOT_REQUIRED, never dropped; the outcomes sum to their population
 *   P3 C3 a record decides only when F46 ADMITS it at tier 1 and PROVES its citation and F45 presents it CURRENT — every failure named
 *   P4 C4 a scope speaks only for itself: a narrower record is listed apart, a wider record is never copied down
 *   P5 C5 bounded: routes in hand × the values the product's own records carry; every missing input is NOT MEASURED, named
 *   P6 C6 the hand-off: routes for REQUIRED/ACCEPTED only, each with its records, date and limits; no page; a route is not demand
 *   P7 C7 any product: the production reader on two unrelated products; no product word in the code; no network
 *   P8 C8 language, cultural and search differences: NOT MEASURED, named, in every result
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { applicabilityOf, applicableRoutes, neededCombinations, deriveDeclaration, OUTCOMES, OTHER_DIFFERENCES, MISSING, MISSING_FACT, CHECK_AUTHORITY, NOT_MEASURED, ROUTE_LIMITS } from "../src/research/applicability.mjs";
import { readDerivedDeclaration } from "../src/research/applicability-declaration-reader.mjs";
import { qualifierPairs } from "../src/discovery/context-axes.mjs";
import { researchRoutes } from "../src/research/research-routes.mjs";
import { readResearchPlan } from "../src/research/research-plan-reader.mjs";
import { readProductAxes } from "../src/discovery/context-axes-reader.mjs";
import { NO_DECLARED_PERSON_CHECKERS } from "../src/facts/citation-audit.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { declaredWorld, FIXTURE_TENANT, DATA_ROOT } from "./helpers/declared-world.mjs";
import { PRODUCT as KNOTS } from "../products/neutral-test-knots/product.mjs";
import { PRODUCT as FERMENTS } from "../products/neutral-test-ferments/product.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const CODE = ["src/research/applicability.mjs", "src/research/research-plan-reader.mjs", "src/research/applicability-declaration-reader.mjs", "bin/applicability.mjs"];
const TMP = join(tmpdir(), `almi-f62-${process.pid}`);

const PERSONS = ["human:Fixture Checker"];
const ON = "2026-10-03";
/* a fixture record the REAL F46 audit can PROVE and the REAL F45 assessment presents CURRENT on ON — unless `over` says otherwise */
const fact = (id, qualifier, outcome, over = {}) => ({
  id, claim: { subject: `fixture-${id}`, predicate: "fixture-applies", qualifier }, value: { value: outcome ?? "none" },
  ...(outcome ? { applicability: { outcome } } : {}), source: { tier: 1 }, freshness: { days: 180 }, life: { extractedOn: "2026-10-01" },
  verification: { checkedOn: "2026-10-01", verdict: "VERIFIED", checkedBy: PERSONS[0], elementsConfirmedKeys: ["outcome"] },
  checks: { linkCheckOutcome: "pass", linkCheckedOn: "2026-10-01", quoteMatchOutcome: "not-applicable", fingerprintOutcome: "pass", fingerprintCheckedOn: "2026-10-01" }, ...over,
});
const route = (dimension, value) => ({ dimension, value, route_id: `r-${dimension ?? "topic"}-${value ?? ""}` });
const AXES = { discovered: [{ key: "knot" }, { key: "region" }] };
const PRODUCT = { research: { applicability: { dimension: "region" } } };
const run = (facts, over = {}) => applicabilityOf({ product: PRODUCT, axes: AXES, routes: [route("knot", "bowline"), route("knot", "sheet-bend")], facts, persons: PERSONS, on: ON, ...over });
const at = (a, knot, region) => a.combinations.find((c) => c.scope.knot === knot && c.scope.region === region);

/* ================= C1 ================= */

test("P1 · C1 FOUR OUTCOMES, NEVER MERGED: each read only from a stated outcome; ACCEPTED stays ACCEPTED; a claim's words never decide; a conflict is UNKNOWN with both named", () => {
  const a = run([
    fact("f1", "knot=bowline,region=r-one", "REQUIRED"),
    fact("f2", "knot=bowline,region=r-two", "ACCEPTED"),
    fact("f3", "knot=bowline,region=r-three", "NOT_REQUIRED"),
    fact("f4", "knot=sheet-bend,region=r-one", null, { claim: { subject: "fixture-f4", predicate: "this region requires it", qualifier: "knot=sheet-bend,region=r-one" } }),
    fact("f5", "knot=sheet-bend,region=r-two", "REQUIRED"), fact("f6", "knot=sheet-bend,region=r-two", "ACCEPTED"),
  ]);
  assert.deepEqual([at(a, "bowline", "r-one").outcome, at(a, "bowline", "r-two").outcome, at(a, "bowline", "r-three").outcome], ["REQUIRED", "ACCEPTED", "NOT_REQUIRED"], "a stated outcome was changed");
  assert.equal(at(a, "sheet-bend", "r-one").outcome, "UNKNOWN", "an outcome was inferred from a claim's words");
  assert.equal(at(a, "sheet-bend", "r-two").outcome, "UNKNOWN", "a conflict was resolved by choosing");
  assert.match(at(a, "sheet-bend", "r-two").why, /^CONFLICT — deciding records state (REQUIRED and ACCEPTED|ACCEPTED and REQUIRED); none is chosen/);
  assert.deepEqual(a.counts, { REQUIRED: 1, ACCEPTED: 1, NOT_REQUIRED: 1, UNKNOWN: 3 });
  /* CONTROL: ACCEPTED alone never becomes REQUIRED, even when it is the only applicable outcome in the population */
  const only = run([fact("g1", "knot=bowline,region=r-one", "ACCEPTED")]);
  assert.equal(at(only, "bowline", "r-one").outcome, "ACCEPTED");
  assert.equal(only.counts.REQUIRED, 0, "ACCEPTED was counted as REQUIRED");
});

/* ================= C2 ================= */

test("P2 · C2 ABSENT IS UNKNOWN: a carried value with no record for the exact scope is UNKNOWN with 'no source' — never NOT_REQUIRED, never dropped; the four outcomes sum to the population", () => {
  const a = run([fact("f1", "knot=bowline,region=r-one", "REQUIRED"), fact("f2", "region=r-two", null)]);
  assert.equal(a.population, 4, "2 routes × 2 carried values");
  for (const [k, r] of [["bowline", "r-two"], ["sheet-bend", "r-one"], ["sheet-bend", "r-two"]]) {
    assert.equal(at(a, k, r).outcome, "UNKNOWN");
    assert.match(at(a, k, r).why, /^no source/);
  }
  assert.equal(a.counts.NOT_REQUIRED, 0, "an absent source read NOT_REQUIRED");
  assert.equal(a.counts.UNKNOWN, 3, "UNKNOWN was dropped or zeroed");
  assert.equal(Object.values(a.counts).reduce((x, y) => x + y, 0), a.population);
});

/* ================= C3 ================= */

test("P3 · C3 AUTHORITATIVE, CURRENT, PROVED — OR UNKNOWN: F46 admissibility, tier 1, F46 PROVED and F45 CURRENT each decide, each failure named; an undated record never decides", () => {
  const ok = fact("ok", "knot=bowline,region=r-one", "REQUIRED");
  const cases = [
    ["not admissible", fact("c1", "knot=bowline,region=r-one", "REQUIRED", { source: { tier: 4 } }), /source not admissible \(F46 AUTHORITY NOT_ADMISSIBLE/],
    /* F46 ADMITS a record NAMED official with no numeric tier: only the tier-1 rule keeps it out */
    ["not tier 1", fact("c2", "knot=bowline,region=r-one", "REQUIRED", { source: {}, verification: { ...ok.verification, sourceTier: "OFFICIAL" } }), /not tier 1/],
    ["citation not proved", fact("c3", "knot=bowline,region=r-one", "REQUIRED", { verification: { ...ok.verification, checkedBy: "someone undeclared" } }), /citation COULD-NOT-PROVE by F46 — FIT NEEDS_A_PERSON \(the recorded verdict's checker is not declared a person\)/],
    ["expired", fact("c4", "knot=bowline,region=r-one", "REQUIRED", { verification: { ...ok.verification, checkedOn: "2025-01-01" } }), /F45 REVIEW_REQUIRED — EXPIRED/],
    ["undated", fact("c5", "knot=bowline,region=r-one", "REQUIRED", { verification: { verdict: "VERIFIED", checkedBy: PERSONS[0], elementsConfirmedKeys: ["outcome"] } }), /F46 AUTHORITY NOT_MEASURED — missing a recorded verification date/],
  ];
  for (const [name, f, re] of cases) {
    const a = run([f]);
    assert.equal(at(a, "bowline", "r-one").outcome, "UNKNOWN", `${name}: it decided`);
    assert.match(at(a, "bowline", "r-one").why, re, `${name}: the reason is not named`);
  }
  /* F45 CONTRADICTED: two active records of one claim with differing values — neither decides */
  const c1 = fact("k1", "knot=bowline,region=r-one", "REQUIRED", { claim: { subject: "fixture-k", predicate: "fixture-applies", qualifier: "knot=bowline,region=r-one" }, value: { value: "a" } });
  const c2 = fact("k2", "knot=bowline,region=r-one", "REQUIRED", { claim: { subject: "fixture-k", predicate: "fixture-applies", qualifier: "knot=bowline,region=r-one" }, value: { value: "b" } });
  const k = run([c1, c2]);
  assert.equal(at(k, "bowline", "r-one").outcome, "UNKNOWN", "a contradicted record decided");
  assert.match(at(k, "bowline", "r-one").why, /F45 REVIEW_REQUIRED — CONTRADICTED/);
  /* with NO declared person (the real roster today) nothing is PROVED, so nothing decides */
  assert.equal(at(run([ok], { persons: NO_DECLARED_PERSON_CHECKERS }), "bowline", "r-one").outcome, "UNKNOWN");
  /* CONTROL: the sound record decides, and it carries its observed date */
  const good = run([ok]);
  assert.equal(at(good, "bowline", "r-one").outcome, "REQUIRED", "CONTROL: a sound record cannot decide — every refusal above is unproved");
  assert.deepEqual(at(good, "bowline", "r-one").records, [{ factId: "ok", observedOn: "2026-10-01" }]);
});

/* ================= C4 ================= */

test("P4 · C4 A SCOPE SPEAKS ONLY FOR ITSELF: a narrower record (more keys) is listed apart and decides nothing wider; a wider record (fewer keys) is never copied down", () => {
  const a = run([
    fact("n1", "knot=bowline,region=r-one,body=b-one", "REQUIRED"),
    fact("w1", "region=r-two", "REQUIRED"),
    fact("x1", "knot=sheet-bend,region=r-one", "ACCEPTED"),
  ]);
  assert.equal(at(a, "bowline", "r-one").outcome, "UNKNOWN", "one body's record decided the wider combination");
  assert.match(at(a, "bowline", "r-one").why, /^no source/);
  assert.deepEqual(a.narrower.map((x) => [x.factId, x.outcome, x.extraKeys]), [["n1", "REQUIRED", 1]], "a narrower record was not listed apart");
  for (const k of ["bowline", "sheet-bend"]) {
    assert.equal(at(a, k, "r-two").outcome, "UNKNOWN", "a region-wide rule was copied down to a narrower combination");
    assert.match(at(a, k, "r-two").why, /^scope not covered — only a wider record/);
  }
  /* CONTROL: the record whose scope IS the combination decides it */
  assert.equal(at(a, "sheet-bend", "r-one").outcome, "ACCEPTED", "CONTROL: an exact-scope record cannot decide");
});

/* ================= C5 ================= */

test("P5 · C5 BOUNDED TO THE WORK IN HAND: routes × carried values and nothing wider; every missing input is NOT MEASURED with its name — never 0", () => {
  const facts = [fact("f1", "knot=bowline,region=r-one", "REQUIRED"), fact("f2", "region=r-two", null)];
  const n = neededCombinations({ routes: [route(null, null), route("knot", "bowline")], dimension: "region", facts });
  assert.equal(n.values, 2);
  assert.deepEqual(n.combinations.map((c) => Object.fromEntries(c.scope)), [{ region: "r-one" }, { region: "r-two" }, { knot: "bowline", region: "r-one" }, { knot: "bowline", region: "r-two" }]);
  const a = run(facts);
  assert.equal(a.population, 4);
  assert.match(a.bound, /2 route\(s\) in hand need × the 2 value\(s\) of the declared dimension carried by the product's own records/);
  assert.equal(a.on, ON);
  assert.ok(!a.combinations.some((c) => c.scope.region === "r-three"), "a value no record carries was measured — a catalogue");
  const missing = [
    [{ on: null }, MISSING.date], [{ on: "today" }, MISSING.date],
    [{ product: { research: {} } }, MISSING.dimension],
    [{ product: { research: { applicability: { dimension: "region", values: ["typed", "by", "hand"] } } }, facts: null }, MISSING.facts],
    [{ routes: [] }, MISSING.routes], [{ routes: "NOT MEASURED" }, MISSING.routes],
    [{ axes: { discovered: [{ key: "knot" }] } }, MISSING.discovered],
  ];
  for (const [over, why] of missing) {
    const x = run(facts, over);
    assert.equal(x.measured, false, `measured without ${why}`);
    assert.equal(x.missing, why);
    assert.equal(x.counts, undefined, "an unmeasured result carried counts — they would read as 0");
  }
  const none = run([fact("z", "knot=bowline", "REQUIRED")]);
  assert.deepEqual([none.measured, none.missing], [false, MISSING.carried]);
  /* a hand-typed list of values is ignored: only what the records carry is measured */
  const typed = run(facts, { product: { research: { applicability: { dimension: "region", values: ["r-nine"] } } } });
  assert.ok(!typed.combinations.some((c) => c.scope.region === "r-nine"), "a hand-typed value was measured");
});

/* ================= C6 ================= */

test("P6 · C6 NOT A PAGE, NOT DEMAND: only REQUIRED and ACCEPTED combinations become routes — every route, the topic route included — each with its records, date and limits; nothing is a page", async () => {
  const facts = [fact("f1", "knot=bowline,region=r-one", "REQUIRED"), fact("f2", "knot=bowline,region=r-two", "ACCEPTED"), fact("f3", "knot=sheet-bend,region=r-one", "NOT_REQUIRED"), fact("f4", "region=r-one", "ACCEPTED")];
  const product = { ...KNOTS, research: { ...KNOTS.research, maxRoutes: 10, applicability: { dimension: "region" } } };
  const axes = { ...(await readProductAxes({ product: KNOTS, tenantId: null, resolve: null })).axes };
  const inHand = researchRoutes({ subject: KNOTS.productId, product: KNOTS, axes });
  const a = applicabilityOf({ product, axes: { ...axes, discovered: [...axes.discovered, { key: "region" }] }, routes: inHand.routes, facts, persons: PERSONS, on: ON });
  const handed = applicableRoutes(a);
  assert.deepEqual(handed.map((h) => [h.route.dimension, h.route.value, h.scope.region, h.outcome]), [[null, null, "r-one", "ACCEPTED"], ["knot", "bowline", "r-one", "REQUIRED"], ["knot", "bowline", "r-two", "ACCEPTED"]]);
  for (const h of handed) {
    assert.ok(h.records.length > 0 && h.records.every((x) => x.observedOn), "a handed route carries no dated record");
    assert.equal(h.measuredOn, ON);
    assert.equal(h.limits, ROUTE_LIMITS);
    assert.match(h.limits, /not an observed question, not a page opportunity and not evidence of demand/);
  }
  const r = researchRoutes({ subject: KNOTS.productId, product, axes, applicability: a });
  assert.deepEqual([r.narrowing.before, r.narrowing.after], [4, 3], "the topic route escaped the narrowing, or a non-applicable one was routed");
  assert.ok(!r.routes.some((x) => !["REQUIRED", "ACCEPTED"].includes(x.context?.outcome)), "an UNKNOWN or NOT_REQUIRED combination was routed");
  assert.deepEqual([a.pagesCreated, a.pagesCounted], [0, 0]);
  assert.doesNotMatch(JSON.stringify([a, r]), /"(page|pages|pageCount|opportunit\w*|demand)":/i, "applicability carried a page, an opportunity or demand");
  /* unmeasured applicability hands over nothing */
  assert.equal(applicableRoutes(run(facts, { on: null })), NOT_MEASURED);
  assert.equal(researchRoutes({ subject: KNOTS.productId, product, axes, applicability: run(facts, { on: null }) }).routes, NOT_MEASURED);
});

/* ================= C7 ================= */

const registryOf = (name, records) => { const d = join(TMP, name); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "facts.mjs"), `export default ${JSON.stringify(records)};\n`); return d; };

test("P7 · C7 ANY PRODUCT: the PRODUCTION reader on two unrelated products, each over its own registry on disk — one product's records never counted for another", async () => {
  try {
    const knots = { ...KNOTS, factsDir: registryOf("knots", [fact("k1", "knot=bowline,region=r-one", "REQUIRED"), fact("k2", "knot=clove-hitch,region=r-one", "NOT_REQUIRED")]), research: { ...KNOTS.research, maxRoutes: 10, applicability: { dimension: "region" } } };
    const ferments = { ...FERMENTS, factsDir: registryOf("ferments", [fact("m1", "ferment=miso,declared-scope=scope-two", "ACCEPTED"), fact("m2", "declared-scope=scope-one", null)]), research: { ...FERMENTS.research, maxRoutes: 10 } };
    const k = await readResearchPlan({ product: knots, subject: knots.productId, tenantId: null, resolve: null, on: ON, persons: PERSONS });
    const f = await readResearchPlan({ product: ferments, subject: ferments.productId, tenantId: null, resolve: null, on: ON, persons: PERSONS });
    assert.deepEqual([k.applicability.population, k.applicability.counts], [4, { REQUIRED: 1, ACCEPTED: 0, NOT_REQUIRED: 1, UNKNOWN: 2 }]);
    assert.deepEqual([f.applicability.population, f.applicability.counts], [12, { REQUIRED: 0, ACCEPTED: 1, NOT_REQUIRED: 0, UNKNOWN: 11 }]);
    /* optional reads: a route that escaped the narrowing carries no context, and must fail here by assertion, not crash (RR-148 run 1, S17) */
    assert.deepEqual(k.plan.routes.map((x) => [x.value, x.context?.scope?.region, x.context?.outcome]), [["bowline", "r-one", "REQUIRED"]]);
    assert.deepEqual(f.plan.routes.map((x) => [x.value, x.context?.scope?.["declared-scope"], x.context?.outcome]), [["miso", "scope-two", "ACCEPTED"]]);
    assert.ok(!JSON.stringify(k).includes("scope-two") && !JSON.stringify(f).includes("r-one"), "one product's records were counted for another");
    /* the real roster today: no declared person, so the same registries decide nothing */
    const k0 = await readResearchPlan({ product: knots, subject: knots.productId, tenantId: null, resolve: null, on: ON });
    assert.deepEqual(k0.applicability.counts, { REQUIRED: 0, ACCEPTED: 0, NOT_REQUIRED: 0, UNKNOWN: 4 });
  } finally { rmSync(TMP, { recursive: true, force: true }); }
});

test("P7b · C7 the applicability code and its reader name no product word and reach no network — and each control fires", () => {
  const read = (f) => readFileSync(join(REPO, f), "utf8");
  for (const f of CODE) assert.deepEqual(scanSource(read(f)).code, [], `${f} names a product`);
  assert.ok(scanSource(`${read(CODE[0])}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0, "CONTROL: the product scanner cannot fire");
  /* the decision modules only: an entry point reaches the audit trail's wiring through its scoped run, as every entry point does */
  assert.deepEqual(decisionCallPaths({ entries: CODE.filter((f) => f.startsWith("src/")) }).faults, []);
  assert.deepEqual(decisionCallPaths({ entries: [CODE[0]], read: (f) => (f === CODE[0] ? `${read(f)}\nawait fetch(u);\n` : read(f)) }).faults.map((x) => x.code), ["RAW_NETWORK_CALL"], "CONTROL: the network scanner cannot fire");
});

/* ================= C8 ================= */

test("P8 · C8 THE REST OF THE ROW'S LINE: language, cultural and search differences are NOT MEASURED with the missing definition named — in a measured and an unmeasured result alike", () => {
  for (const a of [run([fact("f1", "knot=bowline,region=r-one", "REQUIRED")]), run([], { on: null })]) {
    assert.deepEqual(Object.keys(a.otherDifferences), [...OTHER_DIFFERENCES]);
    for (const d of OTHER_DIFFERENCES) assert.deepEqual({ ...a.otherDifferences[d] }, { state: NOT_MEASURED, missing: MISSING.otherEvidence }, `${d} reads measured, 0 or blank`);
  }
});

/* ================= the entry point ================= */

test("ENTRY · the entry point on two declared products: one declares a dimension no record carries (NOT MEASURED, named; no routes), one declares none (said so) — both print C8 and that no page was created", () => {
  const W = declaredWorld();
  try {
    const go = (p, on) => spawnSync(process.execPath, ["bin/research-routes.mjs", `--product=${p}`, `--tenant=${FIXTURE_TENANT}`, `--actor=${W.actor}`, ...(on ? [`--on=${on}`] : [])], { cwd: REPO, encoding: "utf8", env: W.envWith() });
    const f = go(FERMENTS.productId, ON), f0 = go(FERMENTS.productId, null), k = go(KNOTS.productId, ON);
    for (const x of [f, f0, k]) assert.equal(x.status, 0, x.stdout + x.stderr);
    assert.match(f.stdout, new RegExp(`applicability {4}NOT MEASURED — missing ${MISSING.discovered}`));
    assert.match(f0.stdout, /applicability {4}NOT MEASURED — missing a stated judging date/);
    assert.match(f.stdout, /routes {11}NOT MEASURED — missing APPLICABILITY_NOT_MEASURED/);
    assert.match(k.stdout, /applicability {4}NOT DECLARED by the product/);
    for (const d of OTHER_DIFFERENCES) assert.match(f.stdout, new RegExp(`  ${d} +NOT MEASURED — missing an owner-defined recorded evidence path`));
    for (const x of [f, f0, k]) assert.match(x.stdout, /pages {12}0 created and 0 counted/);
  } finally { W.cleanup(); }
});

/* ================= REAL ================= */

test("REAL · every declared product in the real data root, count-only, on the stated date: fixtures are never counted here", async () => {
  const roots = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8")).subjects.map((s) => s.subjectId);
  const out = [];
  for (const id of roots) {
    if (!existsSync(join(DATA_ROOT, id, "product.mjs"))) { out.push({ subject: id, applicability: NOT_MEASURED, missing: "a product declaration (no product.mjs) and its fact registry" }); continue; }
    const product = await productFromArgv(["node", "x", `--product=${id}`], { scope: censusSubjectScope(id) });
    const records = (await loadRegistry(product.factsDir, product.productId)).records.filter((f) => f?.life?.status !== "retired");
    const stating = records.filter((f) => ["REQUIRED", "ACCEPTED", "NOT_REQUIRED"].includes(f?.applicability?.outcome)).length;
    const plan = await readResearchPlan({ product, subject: id, tenantId: null, resolve: null, on: ON });
    out.push({ subject: id, activeRecords: records.length, statingAnOutcome: stating, applicabilityDeclared: Boolean(product.research?.applicability), researchDeclared: Boolean(product.research), routes: plan.plan.routes === NOT_MEASURED ? NOT_MEASURED : plan.plan.routes.length, declaredPersons: NO_DECLARED_PERSON_CHECKERS.length });
  }
  console.log(`  REAL (${ON}, count-only, every declared subject in the real data root): ${JSON.stringify(out)}`);
  /* pins — re-measured, never assumed: a change here must be read, not edited */
  assert.deepEqual(roots.length, 2);
  const oet = out.find((x) => x.activeRecords !== undefined);
  assert.deepEqual({ ...oet, subject: undefined }, { subject: undefined, activeRecords: 47, statingAnOutcome: 0, applicabilityDeclared: false, researchDeclared: false, routes: NOT_MEASURED, declaredPersons: 0 });
  assert.equal(out.filter((x) => x.applicability === NOT_MEASURED).length, 1);
});

/* ================= RR-149 · the derived research declaration ================= */

/* a record of a NAMED deciding body (its own claim.subject) — everything else as `fact` */
const bodyFact = (id, body, qualifier, outcome, over = {}) => fact(id, qualifier, outcome, { claim: { subject: body, predicate: `fixture-${id}`, qualifier }, ...over });
const AXES2 = { declared: [{ key: "knot", status: "EVIDENCED" }], discovered: [{ key: "knot", records: 2, verifiedRecords: 2, distinctValues: 2 }, { key: "region", records: 1, verifiedRecords: 1, distinctValues: 1 }] };
const derive = (facts, over = {}) => deriveDeclaration({ axes: AXES2, facts, persons: PERSONS, on: ON, ...over });
const check = (d, body, q) => d.checks.find((c) => c.body === body && JSON.stringify(c.scope) === JSON.stringify(q));

test("D1 · DERIVED, NOT LISTED: one proposed check per deciding body (a tier-1 record's own subject) and scope (its qualifiers) — a non-tier-1 record never makes a body; dimensions are F13's", () => {
  const d = derive([
    bodyFact("a1", "body-a", "knot=bowline", null), bodyFact("a2", "body-a", "knot=bowline", null), bodyFact("a3", "body-a", null, null),
    bodyFact("b1", "body-b", "knot=sheet-bend,region=r-one", null),
    bodyFact("c1", "body-c", "knot=bowline", null, { source: { tier: 4 } }),
  ]);
  assert.equal(d.derived, true);
  assert.deepEqual(d.checks.map((c) => [c.body, c.scope]), [["body-a", { knot: "bowline" }], ["body-a", {}], ["body-b", { knot: "sheet-bend", region: "r-one" }]]);
  assert.deepEqual(check(d, "body-a", { knot: "bowline" }).provenance.map((p) => [p.factId, p.observedOn]), [["a1", "2026-10-01"], ["a2", "2026-10-01"]]);
  assert.ok(!d.checks.some((c) => c.body === "body-c"), "a tier-4 source became a deciding body");
  assert.deepEqual({ ...d.counts, byOutcome: { ...d.counts.byOutcome } }, { checks: 3, bodies: 2, byOutcome: { REQUIRED: 0, ACCEPTED: 0, NOT_REQUIRED: 0, UNKNOWN: 3 }, activeRecords: 5, decidingRecords: 4, notDeciding: 1, statingRecords: 0 });
  assert.deepEqual(d.dimensions.map((x) => [x.key, x.status]), [["knot", "EVIDENCED"], ["region", "CANDIDATE"]]);
  for (const c of d.checks) assert.equal(c.requiredAuthority, CHECK_AUTHORITY);
});

test("D2 · A CHECK IS DECIDED ONLY BY ITS OWN BODY AND EXACT SCOPE: ACCEPTED stays ACCEPTED; a body-wide record never decides a narrower check; another body's record never decides; absent is UNKNOWN 'no source'", () => {
  const d = derive([
    bodyFact("a1", "body-a", "knot=bowline", "ACCEPTED"),
    bodyFact("a2", "body-a", null, "REQUIRED"),
    bodyFact("a3", "body-a", "knot=sheet-bend", null),
    bodyFact("b1", "body-b", "knot=sheet-bend", "REQUIRED"),
    bodyFact("b2", "body-b", "knot=clove-hitch", "REQUIRED", { verification: { ...fact("x", null, null).verification, checkedBy: "someone undeclared" } }),
  ]);
  assert.equal(check(d, "body-a", { knot: "bowline" }).outcome, "ACCEPTED", "ACCEPTED was changed");
  assert.equal(check(d, "body-a", {}).outcome, "REQUIRED");
  assert.equal(check(d, "body-a", { knot: "sheet-bend" }).outcome, "UNKNOWN", "a body-wide rule or another body's rule decided a narrower check");
  assert.match(check(d, "body-a", { knot: "sheet-bend" }).why, /^no source/);
  assert.equal(check(d, "body-b", { knot: "sheet-bend" }).outcome, "REQUIRED");
  assert.equal(check(d, "body-b", { knot: "clove-hitch" }).outcome, "UNKNOWN", "a record whose checker is not a declared person decided");
  assert.match(check(d, "body-b", { knot: "clove-hitch" }).why, /citation COULD-NOT-PROVE by F46 — FIT NEEDS_A_PERSON/);
  assert.deepEqual({ ...d.counts.byOutcome }, { REQUIRED: 2, ACCEPTED: 1, NOT_REQUIRED: 0, UNKNOWN: 2 });
  /* CONTROL: with no declared person (the real roster today) the same records decide nothing */
  assert.deepEqual({ ...derive([bodyFact("a1", "body-a", "knot=bowline", "ACCEPTED")], { persons: [] }).counts.byOutcome }, { REQUIRED: 0, ACCEPTED: 0, NOT_REQUIRED: 0, UNKNOWN: 1 });
});

test("D3 · WHAT IS MISSING IS NAMED, ONE BY ONE — never 0, never guessed: the stated outcome, the declared person, a tier-1 record, the registry, the date", () => {
  const none = derive([bodyFact("a1", "body-a", "knot=bowline", null)], { persons: [] });
  assert.deepEqual([...check(none, "body-a", { knot: "bowline" }).unknownFields], [MISSING_FACT.outcome, MISSING_FACT.person]);
  assert.deepEqual([...none.missing], [MISSING_FACT.outcome, MISSING_FACT.person]);
  const signed = derive([bodyFact("a1", "body-a", "knot=bowline", "REQUIRED")]);
  assert.deepEqual([...signed.missing], [], "a stated, signed check still reports something missing");
  assert.deepEqual([...derive([bodyFact("c1", "body-c", "knot=bowline", null, { source: { tier: 4 } })]).missing], [MISSING_FACT.tier1]);
  assert.deepEqual([...derive([bodyFact("a1", "body-a", "knot=bowline", null)], { axes: null }).missing], [MISSING_FACT.dimensions, MISSING_FACT.outcome]);
  assert.equal(derive([bodyFact("a1", "body-a", "knot=bowline", null)], { axes: null }).dimensions, NOT_MEASURED);
  assert.deepEqual([derive(null).derived, [...derive(null).missing]], [false, [MISSING_FACT.registry]]);
  assert.deepEqual([derive([], { on: null }).derived, [...derive([], { on: null }).missing]], [false, [MISSING.date]]);
  assert.equal(derive([], { on: null }).counts, undefined, "an underived declaration carried counts — they would read as 0");
});

test("D4 · A PROPOSED CHECK IS NOT a verdict, a question, demand, a page opportunity or permission to make a page — and no page is created or counted", () => {
  const d = derive([bodyFact("a1", "body-a", "knot=bowline", "REQUIRED")]);
  assert.deepEqual([...d.notA], ["an applicability verdict", "a public question", "demand evidence", "a page opportunity", "permission to make a page"]);
  for (const c of d.checks) assert.match(c.status, /^PROPOSED — not a verdict, not a question, not demand, not a page/);
  assert.deepEqual([d.pagesCreated, d.pagesCounted], [0, 0]);
  assert.doesNotMatch(JSON.stringify(d), /"(page|pages|pageCount|opportunit\w*|demand|route|routes|maxRoutes)":/i, "the declaration carried a page, an opportunity, demand or a route budget");
  for (const x of OTHER_DIFFERENCES) assert.deepEqual({ ...d.otherDifferences[x] }, { state: NOT_MEASURED, missing: MISSING.otherEvidence });
});

test("D5 · THE PRODUCTION READER on two unrelated products, each over its own registry on disk — nothing listed by hand, one product's records never counted for another", async () => {
  try {
    const knots = { ...KNOTS, factsDir: registryOf("d-knots", [bodyFact("k1", "knot-body-one", "knot=bowline", "REQUIRED"), bodyFact("k2", "knot-body-two", "knot=clove-hitch", null)]) };
    const ferments = { ...FERMENTS, factsDir: registryOf("d-ferments", [bodyFact("m1", "ferment-body-one", "ferment=miso", "ACCEPTED"), bodyFact("m2", "ferment-body-one", null, null), bodyFact("m3", "ferment-body-two", "ferment=kimchi", null, { source: { tier: 3 } })]) };
    const k = await readDerivedDeclaration({ product: knots, tenantId: null, resolve: null, on: ON, persons: PERSONS });
    const f = await readDerivedDeclaration({ product: ferments, tenantId: null, resolve: null, on: ON, persons: PERSONS });
    assert.deepEqual([k.counts.checks, k.counts.bodies, { ...k.counts.byOutcome }], [2, 2, { REQUIRED: 1, ACCEPTED: 0, NOT_REQUIRED: 0, UNKNOWN: 1 }]);
    assert.deepEqual([f.counts.checks, f.counts.bodies, f.counts.notDeciding, { ...f.counts.byOutcome }], [2, 1, 1, { REQUIRED: 0, ACCEPTED: 1, NOT_REQUIRED: 0, UNKNOWN: 1 }]);
    assert.ok(k.dimensions.some((x) => x.key === "knot") && f.dimensions.some((x) => x.key === "ferment"), "F13's dimensions were not read through each product");
    assert.ok(!JSON.stringify(k).includes("ferment-body") && !JSON.stringify(f).includes("knot-body"), "one product's records were counted for another");
  } finally { rmSync(TMP, { recursive: true, force: true }); }
});

/* RR-149: on the demonstration product, whose 46 tier-1 records make real checks — the neutral ferments product holds no tier-1 record, so
 * a "nothing printed" assertion over it could never fail (0 checks print nothing) */
test("ENTRY2 · bin/applicability.mjs in a declared world on the demonstration product: counts only — no body, value or wording printed; without --on it is NOT MEASURED", async () => {
  const W = declaredWorld();
  try {
    const go = (on) => spawnSync(process.execPath, W.argv(["bin/applicability.mjs", "--product=almi-oet", ...(on ? [`--on=${on}`] : [])]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    const f = go(ON), f0 = go(null);
    for (const x of [f, f0]) assert.equal(x.status, 0, x.stdout + x.stderr);
    const m = f.stdout.match(/proposed checks {2}(\d+) over (\d+) deciding bod\(ies\): REQUIRED \d+ · ACCEPTED \d+ · NOT_REQUIRED \d+ · UNKNOWN \d+/);
    assert.ok(m && Number(m[1]) > 0, "the entry point derived no check — the no-print assertion below would be vacuous");
    assert.match(f.stdout, /a proposed check is NOT: an applicability verdict · a public question · demand evidence · a page opportunity · permission to make a page/);
    assert.match(f0.stdout, /declaration {6}NOT MEASURED — missing a stated judging date/);
    for (const x of [f, f0]) assert.match(x.stdout, /pages {12}0 created and 0 counted/);
    const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
    const recs = (await loadRegistry(product.factsDir, product.productId)).records;
    const words = new Set([...recs.map((r) => r.claim?.subject), ...recs.flatMap((r) => qualifierPairs(r).map(([, v]) => v))].filter((v) => typeof v === "string" && v.length > 3));
    assert.ok(words.size > 0);
    for (const v of words) assert.ok(!f.stdout.includes(v), "the entry point printed a body or a value");
    assert.doesNotMatch(f.stdout, /https?:\/\//);
  } finally { W.cleanup(); }
});

test("REAL2 · the derived declaration for every declared subject in the real data root, count-only, on the stated date — reported apart from any fixture", async () => {
  const roots = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8")).subjects.map((s) => s.subjectId);
  const out = [];
  for (const id of roots) {
    if (!existsSync(join(DATA_ROOT, id, "product.mjs"))) { out.push({ subject: id, declaration: NOT_MEASURED, missing: "a product declaration (no product.mjs) and its fact registry" }); continue; }
    const product = await productFromArgv(["node", "x", `--product=${id}`], { scope: censusSubjectScope(id) });
    const d = await readDerivedDeclaration({ product, tenantId: null, resolve: null, on: ON });
    out.push({ subject: id, dimensions: d.dimensions === NOT_MEASURED ? NOT_MEASURED : d.dimensions.map((x) => `${x.key}:${x.status}:${x.records}r:${x.distinctValues}v`), counts: d.counts, missing: d.missing, unknownFieldsPerCheck: d.checks.map((c) => c.unknownFields.length) });
  }
  console.log(`  REAL2 (${ON}, count-only, every declared subject; persons declared: ${NO_DECLARED_PERSON_CHECKERS.length}): ${JSON.stringify(out)}`);
  /* pins — re-measured, never assumed */
  const oet = out.find((x) => x.counts);
  assert.deepEqual([oet.counts.activeRecords, oet.counts.decidingRecords, oet.counts.statingRecords], [47, 46, 0]);
  assert.equal(oet.counts.byOutcome.UNKNOWN, oet.counts.checks, "a real check was decided without a stated outcome");
  assert.ok(oet.counts.checks > 0, "EMPTY real population");
  assert.deepEqual([...oet.missing], [MISSING_FACT.outcome, MISSING_FACT.person]);
  assert.equal(out.filter((x) => x.declaration === NOT_MEASURED).length, 1);
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
