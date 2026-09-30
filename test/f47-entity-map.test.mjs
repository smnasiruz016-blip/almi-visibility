/**
 * F47 · ENTITY RELATIONSHIP MAP (acceptance _handoffs ccd4c1e, RR-96).
 *
 * Every expected count below is written by hand from its fixture. Real structures are read, never written; nothing is fetched; the
 * production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { buildEntityMap, placementReferences, specReferences, MAP_VERDICT } from "../src/facts/entity-map.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { subject } from "./support/subjects.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const fact = (id, over = {}) => ({ id, claim: { subject: "Council", predicate: `p-${id}`, qualifier: null }, scope: "x", value: { value: 1 }, life: { status: "active" }, source: { url: `src-${id}`, publisher: "Pub" }, ...over });
const faq = (n) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: Array.from({ length: n }, (_, i) => ({ "@type": "Question", name: `Q${i}`, acceptedAnswer: { "@type": "Answer", text: `A${i}` } })) })}</script>`;
const base = () => ({ records: [fact("a"), fact("b")], placement: { universal: ["a"] }, pageSpecs: { s: { sections: [{ claims: ["b"] }] } }, pages: [{ pageId: "p1", html: `<html><body>${faq(2)}</body></html>` }] });
const realInputs = async () => {
  const p = await subject("almi-oet");
  const { records } = await loadRegistry(p.factsDir, p.productId);
  const resolve = createTenantResolver();
  const { population } = readExistingPagePopulation({ scope: { tenantId: resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId }, resolve });
  return { records, placement: p.placement, pageSpecs: p.pageSpecs, pages: population.pages.map((x) => ({ pageId: x.pageId, html: x.html })) };
};

/* ================= C1 — the map from recorded structures ================= */

test("C1 · nodes and relationships come only from recorded fields, each counted", () => {
  const m = buildEntityMap(base());
  assert.deepEqual(m.nodes, { entities: 1, attributes: 2, scopes: 1, sources: 2, publishers: 1, facts: 2, pages: 1, questions: 2 });
  assert.deepEqual(m.edges, { about: 2, hasAttribute: 2, inScope: 2, cites: 2, publishedBy: 2, placed: 2, asks: 2 });
  /* prose is never a source of questions: a question-looking sentence outside machine-readable data counts nothing */
  assert.equal(buildEntityMap({ ...base(), pages: [{ pageId: "p1", html: "<p>What is the fee? How long is it valid?</p>" }] }).nodes.questions, 0, "a question was counted from prose");
  assert.equal(buildEntityMap({ ...base(), records: [...base().records, fact("r", { life: { status: "retired" } })] }).nodes.facts, 2, "a retired fact entered the map");
});

/* ================= C2 — every reference resolves or is named ================= */

test("C2 · FIRING CONTROL: an unresolved reference is named where it appears; a declared awaiting entry is its own population; no entry is dropped", () => {
  const m = buildEntityMap({ ...base(), placement: { universal: ["a", "missing"], awaiting: [{ claim: "c", layer: "l", exists: false, becomes: "later" }, "a"] }, pageSpecs: { s: { sections: [{ claims: ["b", "gone"] }] } } });
  assert.deepEqual(m.references.byState, { RESOLVED: 2, UNRESOLVED: 2, DECLARED_AWAITING: 2 }, "a reference was dropped, or an awaiting entry was counted as resolved or broken");
  assert.deepEqual(m.references.unresolvedWhere, ["placement universal", "spec s section 0"]);
  assert.equal(m.edges.placed, 2, "an unresolved or awaiting reference was drawn as a relationship");
  assert.equal(m.verdict, MAP_VERDICT.COULD_NOT_PROVE);
  /* every placement entry is enumerated — objects included */
  assert.equal(placementReferences({ awaiting: [{ claim: "c" }], other: [{ x: 1 }] }).length, 2);
  assert.equal(buildEntityMap({ ...base(), placement: { other: [{ x: 1 }] } }).references.byState.UNRESOLVED, 1, "a non-string entry outside the awaiting list was dropped");
  assert.deepEqual(specReferences({ s: { sections: [{ claims: ["a", "b"] }, { claims: [] }] } }).map((r) => r.where), ["spec s section 0", "spec s section 0"]);
});

/* ================= C3 — one identity, one representation ================= */

test("C3 · a fact id held twice or a source with two publishers is INCONSISTENT; names differing only in form go to a person, never merged", () => {
  const twice = buildEntityMap({ ...base(), records: [fact("a"), fact("a"), fact("b")] });
  assert.ok(twice.inconsistent.some((x) => x.kind === "FACT_ID_HELD_TWICE"));
  assert.equal(twice.verdict, MAP_VERDICT.DISPROVED);
  const pubs = buildEntityMap({ ...base(), records: [fact("a", { source: { url: "s", publisher: "One" } }), fact("b", { source: { url: "s", publisher: "Two" } })] });
  assert.ok(pubs.inconsistent.some((x) => x.kind === "SOURCE_WITH_TWO_PUBLISHERS"), "a source with two publishers read consistent");
  const forms = buildEntityMap({ ...base(), records: [fact("a"), fact("b", { claim: { subject: "council ", predicate: "q" } })] });
  assert.deepEqual([forms.needsAPerson.length, forms.nodes.entities, forms.inconsistent.length], [1, 2, 0], "two entity names were merged by the code, or called inconsistent");
  assert.equal(forms.verdict, MAP_VERDICT.COULD_NOT_PROVE);
});

/* ================= C4 — questions from machine-readable data ================= */

test("C4 · questions are counted from each page's machine-readable data; a page without a stored body is NOT MEASURED", () => {
  const m = buildEntityMap({ ...base(), pages: [{ pageId: "p1", html: `<html>${faq(3)}</html>` }, { pageId: "p2", html: null }] });
  assert.deepEqual([m.nodes.questions, m.pages.measured, m.pages.notMeasured], [3, 1, 1]);
  assert.equal(m.verdict, MAP_VERDICT.COULD_NOT_PROVE, "a page with no body left nothing open");
  assert.ok(!JSON.stringify(m).includes("Q0"), "question text was kept in the map");
});

/* ================= C5 — verdict ================= */

test("C5 · FIRING CONTROL: PROVED only when nothing is open or inconsistent", () => {
  assert.equal(buildEntityMap(base()).verdict, MAP_VERDICT.PROVED);
  assert.equal(buildEntityMap({ ...base(), placement: { awaiting: [{ claim: "c" }] } }).verdict, MAP_VERDICT.COULD_NOT_PROVE, "an awaiting reference left the map PROVED");
});

/* ================= REAL ================= */

test("REAL · the client's recorded structures: every reference accounted for, questions from machine-readable data, verdict with its reasons", async () => {
  const inputs = await realInputs();
  const m = buildEntityMap(inputs);
  const expectedRefs = Object.values(inputs.placement).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0) + Object.values(inputs.pageSpecs).reduce((n, s) => n + (s.sections ?? []).reduce((k, sec) => k + (sec.claims ?? []).length, 0), 0);
  assert.equal(m.references.total, expectedRefs, "a real reference was dropped");
  assert.equal(Object.values(m.references.byState).reduce((a, b) => a + b, 0), m.references.total);
  assert.ok(m.nodes.facts > 0 && m.nodes.pages > 0 && m.nodes.questions > 0, "EMPTY population");
  console.log(`  REAL (count-only): ${JSON.stringify({ nodes: m.nodes, edges: m.edges, references: m.references.byState, inconsistent: m.inconsistent.length, needsAPerson: m.needsAPerson.length, pages: m.pages, verdict: m.verdict })}`);
});

/* ================= the entry point ================= */

test("C5 · THE ENTRY POINT: in a declared world it prints the map's counts and verdict with its bound, and writes nothing", async () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/entity-map.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded registry, placement, page specs and stored page bodies only · \d+ fact\(s\) · \d+ page\(s\) · questions from machine-readable data, text never printed · nothing fetched/);
    const m = buildEntityMap(await realInputs());
    assert.match(ok.stdout, new RegExp(`references\\s+${m.references.total}:`));
    assert.match(ok.stdout, /verdict\s+(PROVED|DISPROVED|COULD-NOT-PROVE)/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C5 · the map loads no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/facts/entity-map.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
