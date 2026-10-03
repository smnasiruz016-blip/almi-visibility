/**
 * 🔴 RR-146 · F16 · PRODUCT-LED QUESTION RESEARCH — declared product → F13's dimensions → BOUNDED routes → LEADS → verified public
 * questions, offline. Nothing here fetches; every retrieval is a fixture held in the test. Fixtures are never public observations.
 *
 *   Q1 routes come from F13's EVIDENCED declared dimensions on two unrelated products, never combined; the universe is a count only
 *   Q2 a route set over the declared bound is refused whole, never truncated (control: within the bound it is built)
 *   Q3 a CANDIDATE never yields a route; a NOT EVIDENCED declaration is excluded with its reason; no research block → NOT MEASURED
 *   Q4 a lead becomes a question only through the boundary; unsupported attribution, unrelated, duplicate and another subject's route
 *      are each refused; the route never lends its value to the author
 *   Q5 the grouping MECHANISM with the owner's rule as input: none → nothing grouped; an undeclared, unknown or similarity rule refused
 *   Q6 the production entry points end to end in a declared world: leads kept apart, questions kept, duplicates refused on re-intake,
 *      the declared rule applied, routes counted — nothing printed but counts
 *   Q7 the new modules name no product and reach no network; REAL: the real store holds no public question — COULD-NOT-PROVE
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { researchRoutes, requestPlanFor, RESEARCH_KINDS, NOT_MEASURED, ROUTE_RECORD } from "../src/research/research-routes.mjs";
import { intakeFromRoute, LEAD_RECORD, AUTHOR_EVIDENCE } from "../src/research/lead-intake.mjs";
import { samenessFromDeclaration } from "../src/research/sameness.mjs";
import { applicabilityOf } from "../src/research/applicability.mjs";
import { intakeQuestions, groupQuestions, originalsOf, RECORD_TYPE } from "../src/research/public-questions.mjs";
import { DECLARATION as SOURCE } from "../src/research/adapters/stack-exchange.mjs";
import { readProductAxes } from "../src/discovery/context-axes-reader.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { declaredWorld, FIXTURE_TENANT, inputPathRef, DATA_ROOT } from "./helpers/declared-world.mjs";
import { PRODUCT as KNOTS } from "../products/neutral-test-knots/product.mjs";
import { PRODUCT as FERMENTS } from "../products/neutral-test-ferments/product.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f16-product-led-${process.pid}`);
const NEW = ["src/research/research-routes.mjs", "src/research/lead-intake.mjs", "src/research/sameness.mjs", "src/research/applicability.mjs", "src/research/research-plan-reader.mjs"];

/* Q1/Q2 test route derivation itself, so they use the second product WITHOUT its applicability declaration */
const UNSCOPED_FERMENTS = { ...FERMENTS, research: { ...FERMENTS.research, applicability: undefined } };
const axesOf = async (p) => (await readProductAxes({ product: p, tenantId: null, resolve: null })).axes;
const item = (n, over = {}) => ({ wording: `declared test topic one question ${n}?`, wordingOrigin: "SOURCE_TEXT", sourceUrl: `https://fixture-qa.invalid/q/${n}`, postVersion: `v${n}`,
  licenceName: "CC BY-SA", licenceVersion: "4.0", attribution: `fixture-author-${n}`, observedAt: "2026-10-03T09:00:00Z", country: NOT_MEASURED, language: "en", ...over });
const retrievalOf = (items) => ({ items, topic: "declared test topic one", coverageLimits: "one fixture listing, one page, its own topics only" });
const PROFILE = { subject: "neutral-test-knots", profileId: "fixture-profile-one", confirms: ["declared test topic one"], excludes: ["off-topic marker"] };

/* ================= routes ================= */

test("Q1 · routes come from F13's EVIDENCED declared dimensions on TWO unrelated products — one topic route + one per declared value, never combined; the universe is a count", async () => {
  const k = researchRoutes({ subject: KNOTS.productId, product: KNOTS, axes: await axesOf(KNOTS) });
  const f = researchRoutes({ subject: FERMENTS.productId, product: UNSCOPED_FERMENTS, axes: await axesOf(FERMENTS) });
  assert.equal(k.routes.length, 1 + KNOTS.variants.length);
  assert.equal(f.routes.length, 1 + FERMENTS.variants.length);
  assert.deepEqual(k.dimensionsUsed, [{ key: KNOTS.axis.key, values: KNOTS.variants.length }]);
  assert.deepEqual(f.dimensionsUsed, [{ key: FERMENTS.axis.key, values: FERMENTS.variants.length }]);
  assert.ok(k.routes.every((r) => r.record_type === ROUTE_RECORD && r.kind === "PROPOSED_ROUTE" && r.subject === KNOTS.productId));
  assert.ok(!k.routes.some((r) => r.dimension === FERMENTS.axis.key) && !f.routes.some((r) => r.dimension === KNOTS.axis.key), "one product's dimension routed for the other");
  assert.equal(new Set([...k.routes, ...f.routes].map((r) => r.route_id)).size, k.routes.length + f.routes.length);
  assert.ok(k.routes.every((r) => r.dimension === null || typeof r.value === "string"), "a combined route exists");
  const plan = requestPlanFor(k.routes[1], KNOTS.research.sources[0], KNOTS);
  assert.deepEqual([plan.site, plan.q, plan.language], ["fixture-site-one", `${KNOTS.research.topic} ${k.routes[1].value}`, "en"]);
  assert.equal(Object.keys(RESEARCH_KINDS).length, 5, "the five kinds collapsed");
});

test("Q2 · a route set over the declared bound is REFUSED whole, never truncated (CONTROL: within the bound it is built)", async () => {
  const axes = await axesOf(FERMENTS);
  const tight = researchRoutes({ subject: FERMENTS.productId, product: { ...UNSCOPED_FERMENTS, research: { ...UNSCOPED_FERMENTS.research, maxRoutes: 3 } }, axes });
  assert.equal(tight.routes, NOT_MEASURED);
  assert.match(tight.refusals[0], /^ROUTE_BOUND_EXCEEDED — 6 route\(s\) against a declared maxRoutes of 3/);
  assert.equal(researchRoutes({ subject: FERMENTS.productId, product: UNSCOPED_FERMENTS, axes }).routes.length, 6, "CONTROL: the bound could not build");
});

test("Q3 · a CANDIDATE never yields a route; a NOT EVIDENCED declaration is excluded with its reason; without a research block routes are NOT MEASURED, the missing declaration named", async () => {
  const axes = { declared: [{ key: KNOTS.axis.key, status: "EVIDENCED" }, { key: "undeclared-values", status: "NOT EVIDENCED" }], candidates: [{ key: "candidate-dimension" }], discovered: [{ key: KNOTS.axis.key, distinctValues: 3 }, { key: "candidate-dimension", distinctValues: 196 }] };
  /* the candidate HAS declared values here, so a code path that routed candidates WOULD produce routes — this check can fail */
  const withValues = { ...KNOTS, research: { ...KNOTS.research, maxRoutes: 10 }, planning: { dimensions: [{ key: "candidate-dimension", values: ["cv-one", "cv-two"] }, { key: "undeclared-values", values: ["uv-one"] }] } };
  const r = researchRoutes({ subject: KNOTS.productId, product: withValues, axes });
  assert.ok(Array.isArray(r.routes), `routes were not built: ${JSON.stringify(r.refusals)}`);
  assert.ok(!r.routes.some((x) => x.dimension === "candidate-dimension"), "a candidate yielded a route");
  assert.ok(!r.routes.some((x) => x.dimension === "undeclared-values"), "a NOT EVIDENCED declaration yielded a route");
  assert.deepEqual(r.excluded.map((x) => x.key).sort(), ["candidate-dimension", "undeclared-values"]);
  assert.equal(r.universe, 588, "the universe is the product of every discovered dimension's values — a count");
  assert.equal(r.routes.length, 4, "the universe leaked into the routes");
  const none = researchRoutes({ subject: KNOTS.productId, product: { ...KNOTS, research: undefined }, axes });
  assert.equal(none.routes, NOT_MEASURED);
  assert.match(none.refusals.join(" "), /declared research block/);
  for (const bad of [{ topic: "", maxRoutes: 4, sources: [{ sourceId: "s", site: "x" }] }, { topic: "t", maxRoutes: 0, sources: [{ sourceId: "s", site: "x" }] }, { topic: "t", maxRoutes: 4, sources: [] }]) {
    assert.equal(researchRoutes({ subject: KNOTS.productId, product: { ...KNOTS, research: bad }, axes }).routes, NOT_MEASURED);
  }
});

/* ================= lead → question ================= */

test("Q4 · a LEAD becomes a VERIFIED question only through the boundary; unsupported attribution, unrelated, duplicate and another subject's route are refused; the route never lends its value to the author", async () => {
  const routes = researchRoutes({ subject: KNOTS.productId, product: KNOTS, axes: await axesOf(KNOTS) }).routes;
  const route = routes[1];
  const items = [
    item(1),
    item(2, { authorCountry: "fixture-country" }),
    item(3, { authorRole: "fixture-role", authorEvidence: AUTHOR_EVIDENCE }),
    item(4, { wording: "an off-topic marker question?" }),
    item(5, { wordingOrigin: "SNIPPET" }),
    item(1),
  ];
  const r = intakeFromRoute({ route, decl: SOURCE, retrieval: retrievalOf(items), subject: KNOTS.productId, origin: "https://fixture-one.invalid", relevance: PROFILE, existingQuestionIds: [] });
  assert.equal(r.leads.length, items.length, "a hit was not recorded as a lead");
  assert.ok(r.leads.every((l) => l.record_type === LEAD_RECORD && l.kind === "SEARCH_LEAD"));
  assert.equal(r.questions.length, 2);
  assert.deepEqual(r.refused, { UNSUPPORTED_ATTRIBUTION: 1, NOT_ABOUT_THE_DECLARED_SUBJECT: 1, SNIPPET_IS_NOT_THE_AUTHORS_WORDING: 1, DUPLICATE_INTAKE: 1 });
  const [q1, q3] = r.questions;
  assert.deepEqual(q1.value.author, { authorCountry: NOT_MEASURED, authorRole: NOT_MEASURED }, "an author field was filled without the source");
  assert.deepEqual(q3.value.author, { authorCountry: NOT_MEASURED, authorRole: "fixture-role" });
  assert.ok(r.questions.every((q) => q.record_type === RECORD_TYPE && q.value.kind === "OBSERVED" && q.value.route_id === route.route_id));
  assert.ok(!JSON.stringify(q1.value.author).includes(route.value), "the route lent its value to the author");
  const again = intakeFromRoute({ route, decl: SOURCE, retrieval: retrievalOf([item(1), item(3, { authorRole: "fixture-role", authorEvidence: AUTHOR_EVIDENCE })]), subject: KNOTS.productId, origin: "https://fixture-one.invalid", relevance: PROFILE, existingQuestionIds: r.questions.map((q) => q.question_id) });
  assert.deepEqual([again.questions.length, again.refused.DUPLICATE_INTAKE], [0, 2], "a question already in the batch was taken again");
  const other = intakeFromRoute({ route, decl: SOURCE, retrieval: retrievalOf([item(1)]), subject: FERMENTS.productId, origin: "https://fixture-two.invalid", relevance: { ...PROFILE, subject: FERMENTS.productId } });
  assert.deepEqual(other.refused, { ROUTE_NOT_THIS_SUBJECTS: 1 });
  const notMeasured = intakeFromRoute({ route, decl: SOURCE, retrieval: null, subject: KNOTS.productId, origin: "https://fixture-one.invalid", relevance: PROFILE });
  assert.equal(notMeasured.retrieved, NOT_MEASURED, "no retrieval read as an empty one");
});

test("Q4b · a LEAD's evidence state is UNKNOWN (not yet verified on its original post) — never OBSERVED; a lead missing its id, time or source is UNMAPPED", async () => {
  const route = researchRoutes({ subject: KNOTS.productId, product: KNOTS, axes: await axesOf(KNOTS) }).routes[1];
  const { leads, questions } = intakeFromRoute({ route, decl: SOURCE, retrieval: retrievalOf([item(1)]), subject: KNOTS.productId, origin: "https://fixture-one.invalid", relevance: PROFILE });
  const s = evidenceStateOf(leads[0]);
  assert.equal(s.state, "UNKNOWN", "a lead was placed as evidence");
  assert.equal(evidenceStateOf(questions[0]).state, "OBSERVED", "CONTROL: the verified question is OBSERVED");
  for (const drop of ["lead_id", "recorded_at", "sourceId"]) assert.equal(evidenceStateOf({ ...leads[0], [drop]: null }).unmapped, true, `a lead with no ${drop} was placed`);
});

/* ================= grouping ================= */

test("Q5 · the grouping MECHANISM takes the OWNER's declared rule as input — none → nothing grouped and the decision named; an undeclared, unknown or similarity rule REFUSED; the dial changes the result", () => {
  const q = (id, wording) => ({ id, original: { wording, provenance: {} } });
  const qs = [q("a", "How long is the test?"), q("b", "how long is the test"), q("c", "When are results out?")];
  assert.equal(samenessFromDeclaration(null).sameAs, null);
  assert.equal(groupQuestions(qs, samenessFromDeclaration(null).sameAs).grouped, false, "grouped with no owner rule");
  for (const [decl, code] of [
    [{ declaredBy: "CC", ruleId: "r", authorityRef: "x", methods: ["NORMALISED_IDENTICAL"] }, "SAMENESS_RULE_NOT_OWNER_DECLARED"],
    [{ declaredBy: "OWNER", ruleId: "r", methods: ["NORMALISED_IDENTICAL"] }, "SAMENESS_RULE_HAS_NO_ID_OR_AUTHORITY"],
    [{ declaredBy: "OWNER", ruleId: "r", authorityRef: "x", methods: ["SIMILARITY"], threshold: 0.8 }, "SAMENESS_METHOD_NOT_ACCEPTED"],
    [{ declaredBy: "OWNER", ruleId: "r", authorityRef: "x", methods: ["NORMALISED_IDENTICAL"], steps: ["stemming"] }, "SAMENESS_STEP_UNKNOWN"],
  ]) assert.equal(samenessFromDeclaration(decl).refusal, code);
  const owner = (steps) => samenessFromDeclaration({ declaredBy: "OWNER", ruleId: "fixture-rule", authorityRef: "fixture", methods: ["NORMALISED_IDENTICAL"], steps }).sameAs;
  assert.equal(groupQuestions(qs, owner(["case", "whitespace", "terminal-punctuation"])).groups.length, 2, "the declared steps did not group the equal wordings");
  assert.equal(groupQuestions(qs, owner(["whitespace"])).groups.length, 3, "a step the owner did not declare was applied");
  const judged = samenessFromDeclaration({ declaredBy: "OWNER", ruleId: "j", authorityRef: "fixture", methods: ["RECORDED_JUDGEMENT"], judgements: [["a", "c"]] }).sameAs;
  const g = groupQuestions(qs, judged);
  assert.deepEqual(g.groups.map((x) => [...x].sort()), [["a", "c"], ["b"]]);
  assert.deepEqual(originalsOf(qs, g.groups).map((o) => o.wording).sort(), qs.map((x) => x.original.wording).sort(), "an original was lost or rewritten by grouping");
});

/* ================= the production path ================= */

function declareSubject(W, subject, batch, origin, factRegistry) {
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  reg.subjects.push({ subjectId: subject, path: subject, members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: batch }, ...(factRegistry ? [{ resourceKind: "FACT_REGISTRY", resourceRef: factRegistry }] : [])], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: origin }] }] });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
  mkdirSync(join(W.root, subject), { recursive: true });
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  for (const [kind, ref] of [["RESEARCH_BATCH", batch], ["SITE_ORIGIN", origin]]) att.attachments.push({ ...att.attachments[0], resourceKind: kind, resourceRef: ref, tenantId: FIXTURE_TENANT });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  mkdirSync(join(W.root, "research", batch), { recursive: true });
}
function input(W, name, content) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(content));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "INPUT_PATH", resourceRef: inputPathRef(p), tenantId: FIXTURE_TENANT });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  return p;
}

test("Q6 · THE PRODUCTION ENTRY POINTS, offline: routes counted; a route run keeps LEADS apart and QUESTIONS in the batch; re-intake refuses duplicates; the owner's declared rule groups; nothing but counts printed", async () => {
  const S = KNOTS.productId, SUBJ = "fixture-research-subject", BATCH = "fixture-question-research", ORIGIN = "https://fixture-one.invalid";
  const route = researchRoutes({ subject: SUBJ, product: KNOTS, axes: await axesOf(KNOTS) }).routes[2];
  const W = declaredWorld();
  try {
    declareSubject(W, SUBJ, BATCH, ORIGIN, `engine-fixtures:${S}/facts`);
    const run = (bin, args) => spawnSync(process.execPath, [bin, `--tenant=${FIXTURE_TENANT}`, `--actor=${W.actor}`, ...args], { cwd: REPO, encoding: "utf8", env: W.envWith() });
    const routes = run("bin/research-routes.mjs", [`--product=${S}`]);
    assert.equal(routes.status, 0, routes.stdout + routes.stderr);
    assert.match(routes.stdout, /routes {11}4 PROPOSED/);
    assert.match(routes.stdout, /request plans {4}4 over 1 declared source/);
    const decl = input(W, "decl.json", SOURCE), prof = input(W, "profile.json", { ...PROFILE, subject: SUBJ });
    const ret = input(W, "ret.json", retrievalOf([item(1), item(2, { authorCountry: "fixture-country" }), item(4, { wording: "an off-topic marker question?" })]));
    const intake = () => run("bin/source-intake.mjs", [`--subject=${SUBJ}`, `--product=${S}`, `--route=${route.route_id}`, `--research-batch=${BATCH}`, `--source=${decl}`, `--retrieval=${ret}`, `--relevance=${prof}`, "--confirm"]);
    const first = intake();
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.match(first.stdout, /LEADS 3 kept apart in leads\.jsonl/);
    assert.match(first.stdout, /questions people wrote: kept 1 of 3 retrieved/);
    assert.match(first.stdout, /UNSUPPORTED_ATTRIBUTION 1/);
    assert.match(first.stdout, /NOT_ABOUT_THE_DECLARED_SUBJECT 1/);
    assert.doesNotMatch(first.stdout, /https?:\/\/|declared test topic one question|fixture-author/);
    const dir = join(W.root, "research", BATCH);
    const lines = (f) => readFileSync(join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(lines("leads.jsonl").length, 3);
    assert.equal(lines("questions.jsonl").length, 1);
    assert.ok(lines("leads.jsonl").every((l) => l.record_type === LEAD_RECORD));
    const second = intake();
    assert.match(second.stdout, /DUPLICATE_INTAKE 1/, second.stdout);
    assert.equal(lines("questions.jsonl").length, 1, "a duplicate was stored");
    const unknown = run("bin/source-intake.mjs", [`--subject=${SUBJ}`, `--product=${S}`, "--route=no-such-route", `--research-batch=${BATCH}`, `--source=${decl}`, `--retrieval=${ret}`, `--relevance=${prof}`, "--confirm"]);
    assert.equal(unknown.status, 3);
    assert.match(unknown.stderr, /ROUTE_UNKNOWN/);
    const read = run("bin/public-questions.mjs", [`--research-batch=${BATCH}`]);
    assert.equal(read.status, 0, read.stdout + read.stderr);
    assert.match(read.stdout, /leads {2}3 search lead\(s\) recorded — leads, never observed questions/);
    assert.match(read.stdout, /OBSERVED: 1 of 1 recorded question/);
    assert.match(read.stdout, /sameness rule NONE DECLARED/);
    const rule = input(W, "rule.json", { declaredBy: "OWNER", ruleId: "fixture-rule", authorityRef: "fixture", methods: ["NORMALISED_IDENTICAL"], steps: ["case"] });
    assert.match(run("bin/public-questions.mjs", [`--research-batch=${BATCH}`, `--sameness=${rule}`]).stdout, /sameness rule fixture-rule/);
    const bad = input(W, "bad.json", { declaredBy: "OWNER", ruleId: "x", authorityRef: "y", methods: ["SIMILARITY"] });
    const refused = run("bin/public-questions.mjs", [`--research-batch=${BATCH}`, `--sameness=${bad}`]);
    assert.equal(refused.status, 3);
    assert.match(refused.stderr, /SAMENESS_METHOD_NOT_ACCEPTED/);
  } finally { W.cleanup(); rmSync(TMP, { recursive: true, force: true }); }
});

/* ================= applicability (owner addendum) ================= */

const PERSONS = ["human:Fixture Checker"];
const NOW = new Date("2026-10-03T00:00:00Z");
/* a fixture fact shaped so the EXISTING F46 audit can PROVE it and F45 finds it USABLE — the checks are the real ones, not copies */
const fact = (id, locale, outcome, over = {}) => ({
  id, locale, ...(outcome ? { applicability: { outcome } } : {}), source: { tier: 1 }, freshness: { days: 180 }, life: { extractedOn: "2026-10-01" },
  verification: { checkedOn: "2026-10-01", verdict: "VERIFIED", checkedBy: PERSONS[0], elementsConfirmedKeys: ["outcome"] },
  checks: { linkCheckOutcome: "pass", linkCheckedOn: "2026-10-01", quoteMatchOutcome: "not-applicable", fingerprintOutcome: "pass", fingerprintCheckedOn: "2026-10-01" }, ...over,
});
const DECL = { dimension: "region", values: ["r-one", "r-two", "r-three"] };

test("Q8 · FOUR OUTCOMES, KEPT DISTINCT: read only from a stated outcome on a tier-1 record the existing F46 audit PROVES and F45 finds USABLE; ACCEPTED is never REQUIRED; a conflict, a weaker source, a failed audit, a stale record or an unstated outcome stays UNKNOWN; one institution is one institution", () => {
  const facts = [
    fact("f1", { knot: "bowline", region: "r-one" }, "REQUIRED"),
    fact("f2", { knot: "bowline", region: "r-two" }, "ACCEPTED"),
    fact("f3", { knot: "bowline", region: "r-three" }, "NOT_REQUIRED"),
    fact("f4", { knot: "clove-hitch", region: "r-one" }, "REQUIRED"), fact("f5", { knot: "clove-hitch", region: "r-one" }, "NOT_REQUIRED"),
    /* F46 ADMITS a record NAMED OFFICIAL with no numeric tier — it never says it is the deciding body (tier 1), so only the tier-1 rule keeps it out */
    fact("f6", { knot: "clove-hitch", region: "r-two" }, "REQUIRED", { source: {}, verification: { checkedOn: "2026-10-01", verdict: "VERIFIED", checkedBy: PERSONS[0], elementsConfirmedKeys: ["outcome"], sourceTier: "OFFICIAL" } }),
    fact("f7", { knot: "clove-hitch", region: "r-three" }, "REQUIRED", { life: { extractedOn: "2025-01-01" } }),
    fact("f8", { knot: "sheet-bend", region: "r-one" }, null, { claim: "this region requires it" }),
    fact("f9", { knot: "sheet-bend", region: "r-two", institution: "inst-one" }, "REQUIRED"),
  ];
  const a = applicabilityOf({ facts, axisKey: "knot", routeValues: KNOTS.variants, declaration: DECL, persons: PERSONS, now: NOW });
  const at = (k, r) => a.combinations.find((c) => c.combination.knot === k && c.combination.region === r);
  assert.equal(a.population, 9);
  assert.equal(a.date, "2026-10-03");
  assert.deepEqual([at("bowline", "r-one").outcome, at("bowline", "r-two").outcome, at("bowline", "r-three").outcome], ["REQUIRED", "ACCEPTED", "NOT_REQUIRED"], "an outcome was changed");
  assert.match(at("clove-hitch", "r-one").why, /^CONFLICT/);
  assert.match(at("clove-hitch", "r-two").why, /not tier 1/, "a source F46 admits but that is not the deciding body was counted");
  assert.match(at("clove-hitch", "r-three").why, /freshness STALE/);
  assert.equal(at("sheet-bend", "r-one").outcome, "UNKNOWN", "an outcome was inferred from a claim's words");
  assert.equal(at("sheet-bend", "r-two").outcome, "UNKNOWN", "one institution decided the whole combination");
  assert.deepEqual(a.institutions.map((x) => [x.institution, x.outcome]), [["inst-one", "REQUIRED"]]);
  assert.deepEqual(a.counts, { REQUIRED: 1, ACCEPTED: 1, NOT_REQUIRED: 1, UNKNOWN: 6 });
  assert.equal(Object.values(a.counts).reduce((x, y) => x + y, 0), a.population, "the outcomes do not sum to their population");
  const noRoster = applicabilityOf({ facts, axisKey: "knot", routeValues: KNOTS.variants, declaration: DECL, persons: [], now: NOW });
  assert.deepEqual(noRoster.counts, { REQUIRED: 0, ACCEPTED: 0, NOT_REQUIRED: 0, UNKNOWN: 9 }, "with no declared checker no citation is PROVED, so nothing is known");
  assert.equal(applicabilityOf({ facts, axisKey: "knot", routeValues: KNOTS.variants, declaration: null, persons: PERSONS, now: NOW }).measured, false);
});

test("Q9 · applicability NARROWS routes on two unrelated products — only REQUIRED and ACCEPTED combinations survive, before and after counted; unmeasured applicability yields NO routes; nothing is a page", async () => {
  const product = { ...KNOTS, research: { ...KNOTS.research, maxRoutes: 10, applicability: DECL } };
  const facts = [fact("f1", { knot: "bowline", region: "r-one" }, "REQUIRED"), fact("f2", { knot: "bowline", region: "r-two" }, "ACCEPTED"), fact("f3", { knot: "sheet-bend", region: "r-one" }, "NOT_REQUIRED")];
  const a = applicabilityOf({ facts, axisKey: "knot", routeValues: KNOTS.variants, declaration: DECL, persons: PERSONS, now: NOW });
  const r = researchRoutes({ subject: KNOTS.productId, product, axes: await axesOf(KNOTS), applicability: a });
  assert.deepEqual([r.narrowing.before, r.narrowing.after], [4, 3]);
  assert.deepEqual(r.routes.slice(1).map((x) => [x.value, x.context.value, x.context.outcome]), [["bowline", "r-one", "REQUIRED"], ["bowline", "r-two", "ACCEPTED"]]);
  assert.ok(!r.routes.some((x) => x.context?.outcome === "NOT_REQUIRED" || x.context?.outcome === "UNKNOWN"), "a non-applicable combination was routed");
  const unmeasured = researchRoutes({ subject: KNOTS.productId, product, axes: await axesOf(KNOTS), applicability: null });
  assert.equal(unmeasured.routes, NOT_MEASURED);
  assert.match(unmeasured.refusals[0], /^APPLICABILITY_NOT_MEASURED/);
  const ferm = applicabilityOf({ facts: [fact("g1", { ferment: "miso", "declared-scope": "scope-two" }, "ACCEPTED")], axisKey: "ferment", routeValues: FERMENTS.variants, declaration: FERMENTS.research.applicability, persons: PERSONS, now: NOW });
  const rf = researchRoutes({ subject: FERMENTS.productId, product: FERMENTS, axes: await axesOf(FERMENTS), applicability: ferm });
  assert.deepEqual([rf.narrowing.before, rf.narrowing.after, rf.routes.length], [6, 2, 2]);
  assert.doesNotMatch(JSON.stringify([r, rf]), /"page|pages":/i, "a route or a narrowing carried a page");
});

test("Q10 · THE ENTRY POINT on two declared products: one declares applicability (counted over its population and date, routes narrowed), one does not (said so) — and both print that no page was created or counted", () => {
  const W = declaredWorld();
  try {
    const run = (p) => spawnSync(process.execPath, ["bin/research-routes.mjs", `--product=${p}`, `--tenant=${FIXTURE_TENANT}`, `--actor=${W.actor}`], { cwd: REPO, encoding: "utf8", env: W.envWith() });
    const f = run(FERMENTS.productId), k = run(KNOTS.productId);
    assert.equal(f.status, 0, f.stdout + f.stderr);
    assert.match(f.stdout, /applicability {4}of 10 combination\(s\) the routes need, measured \d{4}-\d{2}-\d{2}: REQUIRED 0 · ACCEPTED 0 · NOT_REQUIRED 0 · UNKNOWN 10/);
    assert.match(f.stdout, /narrowing {8}routes before 6 → after 1/);
    assert.match(k.stdout, /applicability {4}NOT DECLARED by the product/);
    for (const x of [f, k]) assert.match(x.stdout, /pages {12}0 created and 0 counted/);
  } finally { W.cleanup(); }
});

/* ================= neutrality, network, real ================= */

test("Q7 · the new modules name no product word and reach no network — and each control fires", () => {
  const read = (f) => (existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null);
  for (const f of NEW) assert.deepEqual(scanSource(read(f)).code, [], `${f} names a product`);
  assert.ok(scanSource(`${read(NEW[0])}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0, "CONTROL: the product scanner cannot fire");
  assert.deepEqual(decisionCallPaths({ entries: NEW }).faults, []);
  assert.deepEqual(decisionCallPaths({ entries: [NEW[1]], read: (f) => (f === NEW[1] ? `${read(f)}\nawait fetch(u);\n` : read(f)) }).faults.map((x) => x.code), ["RAW_NETWORK_CALL"], "CONTROL: the network scanner cannot fire");
});

test("REAL · F16's real population: the real data root holds NO public question record — the sample is EMPTY, COULD-NOT-PROVE, never a pass", () => {
  const research = join(DATA_ROOT, "research");
  let questions = 0;
  for (const b of existsSync(research) ? readdirSync(research) : []) {
    const d = join(research, b);
    for (const f of existsSync(d) && !f0(d) ? readdirSync(d).filter((n) => n.endsWith(".jsonl")) : []) questions += readFileSync(join(d, f), "utf8").split("\n").filter((l) => l.includes(`"record_type":"${RECORD_TYPE}"`)).length;
  }
  assert.equal(questions, 0, "the real store now holds public questions — this pin must be re-measured, never assumed");
  assert.equal(intakeQuestions([]).verdict, "COULD-NOT-PROVE");
});
function f0(d) { try { readdirSync(d); return false; } catch { return true; } }

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
