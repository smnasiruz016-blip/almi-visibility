/**
 * F41 · CONTENT BRIEF ENGINE (acceptance _handoffs 454396e).
 *
 * Every expected state and section below is written by hand from its fixture. Nothing here writes to the production trail (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { buildBrief, selectFacts, SECTIONS, MISSING, BRIEF_STATE } from "../src/page/content-brief.mjs";
import { readClientBriefs } from "../src/page/content-brief-evidence.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { sameNeedPeers } from "../src/page/action-evidence.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { subject } from "./support/subjects.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- fixtures ---- */
const NOW = new Date("2026-09-29T00:00:00Z");
const chosen = (actions = ["IMPROVE"]) => ({ subject: { kind: "EXISTING_PAGE", pageId: "p1" }, decision: "CHOSEN", actions: actions.map((a) => ({ action: a, standing: "RECOMMENDATION" })), missing: [] });
const APPROVED = [{ subject: { kind: "EXISTING_PAGE", id: "p1" }, action: "IMPROVE", ref: "approval:p1" }];
/* a fact that is VERIFIED, sourced, and whose recheck date (the lifecycle reads checks.recheckAfter) is after NOW: USABLE */
const fact = (id, over = {}) => ({ id, verificationState: "VERIFIED", source: { documentRef: `doc:${id}`, url: null }, checks: { recheckAfter: "2027-03-01" }, ...over });
const FULL = {
  need: { value: "alpha", ref: "F33:COVERS:p1" },
  entities: { items: ["the alpha register"], ref: "entities:1" },
  questions: { items: ["how long does alpha take"], ref: "questions:1" },
  facts: [fact("f1")],
  gain: { kind: "USEFUL_COMPARISON", adds: "a side-by-side of the pathways", ref: "gain:p1" },
  localeTerms: { items: ["alpha licence"], ref: "locale:1" },
  links: { completeness: "COMPLETE", targets: ["p2"], ref: "inventory:1" },
  cta: { text: "start the alpha check", ref: "cta:1" },
  schema: { type: "HowTo", ref: "schema:1" },
  prohibitedClaims: { items: ["guaranteed pass"], ref: "prohibited:1" },
};
const brief = (evidence = FULL, { decision = chosen(), approvals = APPROVED } = {}) => buildBrief({ decision, approvals, evidence, now: NOW });

/* ================= C1 — only for an approved action ================= */

test("C1 · FIRING CONTROL: a recommendation with no recorded approval is NOT ISSUED — the approval named; CANNOT DECIDE is NOT ISSUED too", () => {
  const unapproved = brief(FULL, { approvals: [] });
  assert.equal(unapproved.state, BRIEF_STATE.NOT_ISSUED, "a brief was issued for an unapproved recommendation");
  assert.deepEqual(unapproved.missing, [MISSING.APPROVAL]);
  assert.equal(unapproved.sections, undefined, "an unapproved subject carries brief sections");
  /* an approval of a DIFFERENT action, or for a different subject, or with no ref, is no approval */
  for (const a of [{ ...APPROVED[0], action: "MERGE" }, { ...APPROVED[0], subject: { kind: "EXISTING_PAGE", id: "p9" } }, { ...APPROVED[0], ref: "" }]) {
    assert.equal(brief(FULL, { approvals: [a] }).state, BRIEF_STATE.NOT_ISSUED, `a mismatched approval issued a brief: ${JSON.stringify(a)}`);
  }
  const cannot = brief(FULL, { decision: { subject: { kind: "EXISTING_PAGE", pageId: "p1" }, decision: "CANNOT_DECIDE", actions: [], missing: ["x"] } });
  assert.deepEqual([cannot.state, cannot.missing], [BRIEF_STATE.NOT_ISSUED, [MISSING.NO_ACTION]]);
  assert.equal(brief().state, BRIEF_STATE.READY, "the control: an approved action with every section recorded IS a brief");
  assert.throws(() => buildBrief({ decision: chosen(), evidence: FULL }), /passed explicitly/);
});

/* ================= C2 — every section from measured evidence ================= */

test("C2 · each of the eleven sections is FILLED only from recorded evidence, with its identities and rule — or MISSING with its fact named", () => {
  const r = brief();
  assert.deepEqual(Object.keys(r.sections), SECTIONS);
  assert.equal(SECTIONS.length, 11);
  for (const k of SECTIONS) {
    assert.equal(r.sections[k].state, "FILLED", k);
    assert.ok(typeof r.sections[k].rule === "string" && r.sections[k].evidence.length > 0, `${k}: no rule or evidence`);
  }
  assert.deepEqual(r.sections.intent.evidence, ["F33:COVERS:p1"]);
  /* each recorded input removed, one at a time, makes exactly its own section MISSING with its own fact */
  for (const [key, section] of [["need", "intent"], ["entities", "entities"], ["questions", "questions"], ["gain", "uniqueValue"], ["localeTerms", "localeTerms"], ["links", "internalLinks"], ["cta", "cta"], ["schema", "schema"], ["prohibitedClaims", "prohibitedClaims"]]) {
    const d = brief({ ...FULL, [key]: null });
    assert.deepEqual(SECTIONS.filter((k) => d.sections[k].state === "MISSING"), [section], `removing ${key}`);
    assert.equal(d.sections[section].missing, MISSING[section]);
  }
  /* a recorded input with no ref is not recorded evidence */
  assert.equal(brief({ ...FULL, cta: { text: "buy now" } }).sections.cta.state, "MISSING", "an unreferenced input filled a section");
  /* links need a COMPLETE inventory */
  assert.equal(brief({ ...FULL, links: { ...FULL.links, completeness: "INCOMPLETE" } }).sections.internalLinks.state, "MISSING");
});

/* ================= C3 — no fact without a source ================= */

test("C3 · only VERIFIED, sourced, fresh facts enter a brief; every other one is EXCLUDED and named", () => {
  const facts = [fact("ok"), fact("nosrc", { source: null }), fact("unverified", { verificationState: "UNKNOWN" }), fact("old", { checks: { recheckAfter: "2026-01-01" } })];
  const sel = selectFacts(facts, { now: NOW });
  assert.deepEqual(sel.included.map((f) => f.factId), ["ok"]);
  assert.deepEqual(Object.fromEntries(sel.excluded.map((x) => [x.factId, x.why])).nosrc, "NO_SOURCE");
  assert.equal(Object.fromEntries(sel.excluded.map((x) => [x.factId, x.why])).unverified, "NOT_VERIFIED");
  assert.match(Object.fromEntries(sel.excluded.map((x) => [x.factId, x.why])).old, /^FRESHNESS_/, "a stale fact was not excluded");
  const r = brief({ ...FULL, facts });
  assert.deepEqual(r.sections.verifiedFactsAndSources.content.map((f) => f.factId), ["ok"]);
  assert.equal(r.sections.verifiedFactsAndSources.content[0].source, "doc:ok");
  assert.equal(r.excludedFacts.length, 3);
  assert.equal(brief({ ...FULL, facts: [fact("nosrc", { source: null })] }).sections.verifiedFactsAndSources.state, "MISSING", "an unsourced fact filled the section");
});

/* ================= C4 — ready only when complete ================= */

test("C4 · FIRING CONTROL: one MISSING section makes the brief INCOMPLETE naming it — never READY", () => {
  const d = brief({ ...FULL, questions: null });
  assert.equal(d.state, BRIEF_STATE.INCOMPLETE, "a brief with a missing section was READY");
  assert.deepEqual(d.missing, [`questions: ${MISSING.questions}`]);
  const bare = brief({});
  assert.equal(bare.state, BRIEF_STATE.INCOMPLETE);
  assert.equal(bare.missing.length, 10, "every missing section must be named (acceptance criteria are the frozen gates, always recorded)");
});

/* ================= C5 / C6 — reviewable, not a draft; competitor evidence is input only ================= */

test("C5/C6 · every filled section is traceable; no length or word target anywhere; competitor evidence is a diagnostic, never a fact", () => {
  const r = brief({ ...FULL, competitorInputs: [{ ref: "cmp:1", words: 2400 }] });
  const keys = new Set();
  (function walk(o) { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { keys.add(k); walk(v); } })(r);
  for (const k of keys) assert.doesNotMatch(k, /word|length|minimum|target/i, `a brief carries a length-like field: ${k}`);
  assert.deepEqual(r.diagnostics, ["cmp:1"]);
  assert.ok(!r.sections.verifiedFactsAndSources.content.some((f) => f.factId === "cmp:1"), "competitor evidence became a fact");
  for (const k of SECTIONS) assert.ok(r.sections[k].evidence.every((x) => typeof x === "string" && x !== ""), `${k}: untraceable evidence`);
  const code = readFileSync(join(REPO, "src/page/content-brief.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(code, /writeFileSync|executeGovernedWrite|renderPage/, "F41 writes or renders a page");
});

/* ================= REAL — count-only; and the control on the REAL structures ================= */

test("REAL · the client's recorded structures: no approval → every subject NOT ISSUED; one real page given a TEST-ONLY review and approval gets an INCOMPLETE brief naming its missing sections", async () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const product = await subject("almi-oet");
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const r = readClientBriefs({ tenantId, product, records, resolve, approvals: [], reviews: [] });
  assert.equal(r.fault, null, r.bound);
  assert.ok(r.summary.population > 0, "EMPTY real population");
  assert.deepEqual(Object.keys(r.summary.state), ["NOT_ISSUED"], "a real brief was issued without a recorded approval");
  for (const b of r.briefs) assert.ok(b.missing.length > 0);
  const { population } = readExistingPagePopulation({ scope: { tenantId }, resolve, env: process.env, now: new Date() });
  const [a, set] = [...sameNeedPeers(population.pages, product.variants ?? []).entries()].find(([, s]) => s.size > 0);
  const reviews = [{ pair: [a, [...set][0]], compared: ["intent", "answer", "facts", "architecture", "examples", "userValue"], duplicate: true, ref: "test-review:f41" }];
  const c = readClientBriefs({ tenantId, product, records, resolve, approvals: [{ subject: { kind: "EXISTING_PAGE", id: a }, action: "MERGE", ref: "test-approval:f41" }], reviews });
  const b = c.briefs.find((x) => x.subject.id === a);
  assert.equal(b.state, "INCOMPLETE", "a real brief was READY with sections unrecorded");
  assert.equal(b.sections.intent.state, "FILLED", "the real need (F33) did not reach the brief");
  assert.equal(b.approval, "test-approval:f41");
  assert.deepEqual(c.summary.state, { NOT_ISSUED: r.summary.population - 1, INCOMPLETE: 1 }, "an approval spread to another subject");
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify(r.summary)} · control: ${JSON.stringify(c.summary)} · missing sections ${b.missing.length}`);
});

test("C7 · THE ENTRY POINT: in a declared world it prints counts only, with its bound, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/page-briefs.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ subject\(s\)/);
    assert.match(ok.stdout, /briefs\s+NOT_ISSUED \d+/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C7 · the brief and its evidence reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/page/content-brief.mjs", "src/page/content-brief-evidence.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
