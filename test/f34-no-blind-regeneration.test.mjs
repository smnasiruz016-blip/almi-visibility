/**
 * F34 · NO BLIND REGENERATION — the proofs of the frozen acceptance (_handoffs 53f74b4, RR-83 §2).
 *
 * The construct-level proofs (C1, C2, C4 through constructCandidates on a family Gate A otherwise ACCEPTS) sit beside that family in
 * test/page-construction.test.mjs, named "F34 · …". This file proves the rest: different wording and coverage (C2), the population
 * loader, the recorded decision (C6), the shared gate the subject tools use, the real runner end to end on a CONFINED store, the
 * census (C5), no overwrite path (C3), and the real same-tenant population, count-only.
 *
 * 🔴 NOTHING HERE WRITES TO THE PRODUCTION TRAIL (RR-83 §5). The runner runs in a declared fixture world with its audit store
 * relocated beneath .test-scratch/audit; the production trail's bytes are hashed before and after and must not move.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { execFileSync } from "node:child_process";

import { declaredWorld } from "./helpers/declared-world.mjs";
import { existingPageFirst, existingPageDecisionEvent, intentForms, EXISTING_PAGE_OUTCOMES as O, EXISTING_PAGE_REASONS as R } from "../src/page/existing-page-first.mjs";
import { populationFromPartition, readExistingPagePopulation, existingPageGate } from "../src/page/existing-page-population.mjs";
import { pageProductionCensus, staticImports } from "../tools/existing-page-first-census.mjs";
import { PAGE_PRODUCTION } from "../config/page-production.mjs";
import { census as noGenerationCensus } from "../tools/no-generation-census.mjs";
import { GUARD_METADATA_KEYS } from "../src/governance/guard-audit.mjs";
import { metadataFaults } from "../src/audit-trail/event.mjs";
import { AUDIT_STORE_OVERRIDE_ENV, AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT } from "../src/governance/governed-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { subject } from "./support/subjects.mjs";

const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const T = "tenant:f34-fixture";
const page = (pageId, html, extra = {}) => ({ pageId, tenantId: T, html, ...extra });
/* F33 (RR-84): the candidate carries the registered page structure its need belongs to. */
const VALUES = ["alpha", "beta", "gamma", "nursing", "speech-pathology"];
const decide = (intent, pages, coverageState = "COMPLETE") => existingPageFirst({ candidate: { slug: "candidate", intent, structure: { values: VALUES } }, tenantId: T, population: { tenantId: T, coverageState, pages } });

/* ---- C1 · the population is required, and it is this tenant's ------------------------------------------------------ */

test("C1 · a missing, unreadable, malformed or foreign population REFUSES — it is never treated as empty", () => {
  const base = { candidate: { slug: "s", intent: "alpha" }, tenantId: T };
  for (const population of [null, undefined, {}, { tenantId: T, pages: [] }, { tenantId: T, coverageState: "SOMETIMES", pages: [] }, { tenantId: T, coverageState: "COMPLETE", pages: [{ html: "x" }] }]) {
    const d = existingPageFirst({ ...base, population });
    assert.equal(d.outcome, O.REFUSED, JSON.stringify(population));
    assert.equal(d.mayProduce, false);
    assert.equal(d.reason, R.POPULATION_UNAVAILABLE);
  }
  assert.equal(existingPageFirst({ ...base, population: { tenantId: "tenant:other", coverageState: "COMPLETE", pages: [] } }).reason, R.CROSS_TENANT);
  assert.equal(existingPageFirst({ ...base, population: { tenantId: T, coverageState: "COMPLETE", pages: [{ pageId: "p", tenantId: "tenant:other", html: "" }] } }).reason, R.CROSS_TENANT, "another tenant's page reached this tenant's decision");
  assert.equal(existingPageFirst({ ...base, tenantId: null, population: { tenantId: T, coverageState: "COMPLETE", pages: [] } }).reason, R.NO_TENANT);
});

/* ---- C2 · no recreation, whatever the wording ------------------------------------------------------------------------- */

test("C2 · an existing page that names the intent — in its declared form or with its hyphen as a space — is MATCHED and named", () => {
  assert.deepEqual(intentForms("speech-pathology"), [["speech-pathology"], ["speech", "pathology"]], "the declared form and its spaced form");
  assert.deepEqual(intentForms("Nursing"), [["nursing"]]);
  const d = decide("speech-pathology", [page("p2", "<p>Unrelated</p>"), page("p1", "<h1>Speech Pathology, explained</h1>")]);
  assert.equal(d.outcome, O.KEEP); /* F34 C7 (RR-174): a served need is KEEP / NO NEW PAGE (M1, M3) */
  assert.equal(d.reason, R.SERVED);
  assert.equal(d.matched, 1);
  assert.deepEqual(d.existingPages, ["p1", "p2"], "the matching page is named first, then every other existing page");
  assert.equal(d.mayProduce, false);
});

test("C2 · the SAME need in DIFFERENT WORDS is never produced — the outcome is KEEP (F34 C7) and still names the existing page", () => {
  /* F33 (RR-84): an inflected form ("nurse" for "nursing") is now RECOGNISED as the same need — matched, and still never produced. */
  const d = decide("nursing", [page("p9", "<h1>Preparing for the test as a registered nurse</h1><p>Care-sector writing tasks.</p>")]);
  assert.equal(d.matched, 1);
  assert.equal(d.outcome, O.KEEP); /* F34 C7 (RR-174): a served need is KEEP / NO NEW PAGE (M1, M3) */
  assert.equal(d.reason, R.SERVED);
  assert.deepEqual(d.existingPages, ["p9"]);
  assert.equal(d.mayProduce, false, "a differently worded existing page let a new page through");
  /* …and a page that serves it in words sharing NO registered form cannot be ruled out: HOLD (F34 C7), named, never produced. */
  const syn = decide("nursing", [page("p8", "<h1>Preparing for the test as an RN</h1><p>Care-sector writing tasks.</p>")]);
  assert.equal(syn.matched, 0, "the premise: the page shares no form of the registered need");
  assert.equal(syn.outcome, O.HOLD); /* F34 C7 (RR-174): an uncertain match is HOLD (M2, M4, M5) */
  assert.deepEqual(syn.existingPages, ["p8"]);
  assert.equal(syn.mayProduce, false, "a page that might serve the need in other words let a new page through");
});

test("C2 · with NO existing page, only a COMPLETE population lets production go on; PARTIAL or UNKNOWN is HOLD (F34 C7 M5)", () => {
  assert.equal(decide("alpha", [], "COMPLETE").outcome, O.NO_EXISTING_PAGE);
  assert.equal(decide("alpha", [], "COMPLETE").mayProduce, true, "the control: the check CAN let a page through, so its refusals mean something");
  for (const c of ["PARTIAL", "UNKNOWN"]) {
    const d = decide("alpha", [], c);
    assert.equal(d.outcome, O.HOLD, c); /* F34 C7 (RR-174): an uncertain match is HOLD (M2, M4, M5) */
    assert.equal(d.reason, R.NOT_COMPLETE, c);
    assert.equal(d.mayProduce, false, `${c}: an unseen page could serve it`);
  }
  const noIntent = decide("", [page("p1", "<p>x</p>")]);
  assert.equal(noIntent.mayProduce, false, "a candidate that declares no intent is not waved through");
  assert.deepEqual(noIntent.existingPages, ["p1"], "an undecidable outcome must still name the existing page");
});

/* ---- C4 · unknown quality is protected ---------------------------------------------------------------------------- */

test("C4 · an unmeasured existing page is protected (KEEP, F34 C7); a recorded defect routes to IMPROVE of THAT page; neither produces", () => {
  const unknown = decide("gamma", [page("g1", "<h1>gamma</h1>")]);
  assert.equal(unknown.outcome, O.KEEP); /* F34 C7 (RR-174): a served need is KEEP / NO NEW PAGE (M1, M3) */
  assert.equal(unknown.mayProduce, false);
  const defect = decide("gamma", [page("g2", "<h1>gamma too</h1>"), page("g1", "<h1>gamma</h1>", { recordedDefect: "stale fact recorded" })]);
  assert.equal(defect.outcome, O.IMPROVE);
  assert.equal(defect.existingPages[0], "g1");
  assert.equal(defect.mayProduce, false);
  const elsewhere = decide("gamma", [page("g3", "<p>gamma</p>"), page("x1", "<p>other</p>", { recordedDefect: "defect on an unrelated page" })]);
  assert.equal(elsewhere.outcome, O.HOLD, "a defect on a page that does not serve the intent must not license anything"); /* F34 C7 (RR-174): an uncertain match is HOLD (M2, M4, M5) */
});

/* ---- the population loader --------------------------------------------------------------------------------------- */

test("population · coverage applies the recorded correction (COMPLETE → PARTIAL), no run is UNKNOWN, and the latest served body is used", () => {
  const records = [
    { record_type: "crawl_run", run_id: "r1", coverageState: "COMPLETE" },
    { record_type: "crawl_run_correction", corrects_run_id: "r1", field: "coverageState", corrected_at: "2026-09-13", recorded_value: "COMPLETE", corrected_value: "PARTIAL" },
    { record_type: "observation", observation_id: "o1", observed_at: "2026-09-12T00:00:00Z" },
    { record_type: "observation", observation_id: "o2", observed_at: "2026-09-12T01:00:00Z" },
    { record_type: "page", page_id: "p1", observations: ["o1", "o2"] },
  ];
  const pop = populationFromPartition({ tenantId: T, records, bodies: new Map([["o1", "<p>old</p>"], ["o2", "<p>new</p>"]]) });
  assert.equal(pop.coverageState, "PARTIAL", "the corrected coverage did not win");
  assert.equal(pop.pages.length, 1);
  assert.equal(pop.pages[0].html, "<p>new</p>");
  assert.equal(populationFromPartition({ tenantId: T, records: records.filter((r) => r.record_type !== "crawl_run" && r.record_type !== "crawl_run_correction"), bodies: new Map() }).coverageState, "UNKNOWN");
});

/* ---- C6 · recorded, once, naming the page -------------------------------------------------------------------------- */

test("C6 · a stopped candidate owes ONE REFUSAL decision naming the existing pages; a candidate let through owes none; metadata only", () => {
  const ids = Array.from({ length: 11 }, (_, i) => `${String(i).padStart(2, "0")}${"a".repeat(14)}`);
  const d = decide("nursing", ids.map((id) => page(id, "<p>unrelated</p>")));
  const ev = existingPageDecisionEvent(d, { entry: "bin/build-page.mjs" });
  assert.equal(ev.eventType, "REFUSAL");
  assert.equal(ev.action, "REFUSE_PAGE_PRODUCTION_EXISTING_PAGE_FIRST");
  assert.equal(ev.reasonCode, "AN_EXISTING_PAGE_CANNOT_BE_RULED_IN_OR_OUT", "F33: pages naming no registered need cannot be ruled out");
  assert.match(ev.metadata.resourceRef, new RegExp(`^existing-pages:${ids.slice(0, 8).join(",")}\\+3$`));
  assert.deepEqual(Object.keys(ev.metadata).filter((k) => !GUARD_METADATA_KEYS.includes(k)), []);
  assert.deepEqual(metadataFaults(ev.metadata), []);
  assert.equal(existingPageDecisionEvent(decide("alpha", []), { entry: "bin/build-page.mjs" }), null);
  /* a REFUSAL of the check itself (no readable population) is recorded too, naming no page because none could be read */
  const refused = existingPageDecisionEvent(existingPageFirst({ candidate: { slug: "s", intent: "alpha" }, tenantId: T, population: null }), { entry: "bin/build-page.mjs" });
  assert.equal(refused.reasonCode, R.POPULATION_UNAVAILABLE);
  assert.equal(refused.metadata.resourceRef, "existing-pages:none");
  assert.deepEqual(metadataFaults(refused.metadata), []);
});

test("C6 · the shared gate the subject tools call decides, records exactly once, and never lets a page through over existing pages", () => {
  const recorded = [];
  const partitions = [];
  const scope = { tenantId: WORLD.tenantId, recordDecision: (e) => recorded.push(e), recordPartition: (p) => partitions.push(p) };
  const d = existingPageGate({ scope, entry: "subjects/almi-oet/tools/nursing-chain.mjs", candidate: { slug: "nursing", intent: "nursing" }, env: WORLD.envWith() });
  assert.ok(d.considered > 0, "the fixture world's tenant holds the stored batch's pages — a non-empty population");
  assert.equal(d.mayProduce, false);
  const refusals = recorded.filter((e) => e.action === "REFUSE_PAGE_PRODUCTION_EXISTING_PAGE_FIRST");
  assert.equal(refusals.length, 1, "the decision was not recorded exactly once");
  /* F31 (RR-85): reading the population also records the scope's completeness verdict — once per read. */
  assert.equal(recorded.filter((e) => e.action === "DECIDE_EXISTING_PAGE_INVENTORY_COMPLETENESS").length, 1);
  assert.equal(recorded.length, 2);
  existingPageGate({ scope, entry: "subjects/almi-oet/tools/nursing-chain.mjs", candidate: { slug: "nursing", intent: "nursing" }, env: WORLD.envWith() });
  /* read once per run: a second gate call re-reads nothing — the completeness verdict (one per read) is still recorded once */
  assert.equal(recorded.filter((e) => e.action === "DECIDE_EXISTING_PAGE_INVENTORY_COMPLETENESS").length, 1, "the population is read once per run");
  assert.ok(partitions.length <= 2, "one read records at most its two partitions (crawl and sitemap)");
  const none = readExistingPagePopulation({ scope: { tenantId: WORLD.tenantId }, env: { ...WORLD.envWith(), ALMIVISIBILITY_SUBJECT_ROOTS: join(WORLD.root, "no-such-root") }, resolve: createTenantResolver({ env: WORLD.envWith() }) });
  assert.equal(none.population, null, "an unreadable batch became a population");
  assert.ok(none.fault, "an unreadable batch lost its named fault");
});

test("C6 · END TO END: the real runner, --confirm, in a declared world — F35 chose nothing, so every candidate stops before the check (ruling RR-180 (a)); NOTHING written, no decision owed, on a CONFINED store", () => {
  mkdirSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT), { recursive: true });
  const storeDir = mkdtempSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT, "f34-e2e-"));
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const out = mkdtempSync(join(REPO, ".test-scratch", "f34-out-"));
  try {
    /* The run nonce is set HERE, so this test — not the child — owns the confined run directory: a child that mints its own
     * removes it at exit, and its events could never be counted. It is removed below with the store. */
    const r = spawnSync(process.execPath, WORLD.argv(["bin/build-page.mjs", "--product=almi-oet", "--all-slugs", `--out=${out}`, "--confirm"]), { cwd: REPO, encoding: "utf8", env: { ...WORLD.envWith(), [AUDIT_STORE_OVERRIDE_ENV]: storeDir, [AUDIT_RUN_ENV]: `f34-e2e-${process.pid}` } });
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /existing pages {8}\d+ of this tenant \(coverage (PARTIAL|UNKNOWN)\)/);
    /* RR-179 (c): construction acts only on F35's decision; the runner hands in none, so neither declared candidate reaches the check */
    assert.equal((r.stdout.match(/REJECT {5}f35Decision: F35 did not choose CREATE/g) ?? []).length, 2);
    assert.equal((r.stdout.match(/existingPage +(KEEP|HOLD|IMPROVE) — \d+ existing page\(s\) considered/g) ?? []).length, 0, "a candidate F35 did not choose reached the existing-page check"); /* F34 C7 (RR-174): MONITOR is no longer an F34 outcome */
    assert.doesNotMatch(r.stdout, /https?:\/\//, "the run printed a URL");
    assert.deepEqual(readdirSync(out), [], "a candidate page was written over existing pages");
    const files = [];
    const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) (e.isDirectory() ? walk(join(d, e.name)) : e.name === "events.jsonl" && files.push(join(d, e.name))); };
    walk(storeDir);
    const events = files.flatMap((f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
    const decisions = events.filter((e) => e.action === "REFUSE_PAGE_PRODUCTION_EXISTING_PAGE_FIRST");
    /* a decision is owed only by a candidate the check STOPPED (C6, l.139); none reached it, so none is owed — and none is invented */
    assert.equal(decisions.length, 0, `a decision was recorded for a candidate the check never judged: ${decisions.length}`);
    for (const e of decisions) {
      assert.match(e.metadata.resourceRef, /^existing-pages:[0-9a-f]{16}/, "a recorded decision does not name an existing page");
      assert.match(e.reasonCode, /SERVES|CANNOT_BE_RULED|NOT_RECORDED_COMPLETE/);
      /* F33 C5 (RR-84): the one recorded decision carries F33's outcome and its per-page evidence counts. */
      assert.match(e.metadata.classification, /need=(COVERED|CANNOT_DECIDE) ev=[A-Z_:0-9,]+/);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
    rmSync(storeDir, { recursive: true, force: true });
  }
});

/* ---- C5 · the census --------------------------------------------------------------------------------------------- */

const tree = () => execFileSync("git", ["-C", REPO, "ls-files", "*.mjs"], { encoding: "utf8" }).split("\n").filter((f) => f && !f.startsWith("test/")).map((file) => ({ file, text: readFileSync(join(REPO, file), "utf8") }));

test("C5 · the real tree: every page-producing path is found and classified, each routed one really calls the check, 0 faults", () => {
  const r = pageProductionCensus({ files: tree() });
  assert.deepEqual(r.faults, []);
  assert.ok(r.scanned > 100, `the census scanned only ${r.scanned} files`);
  assert.deepEqual(r.importers, ["bin/build-page.mjs", "src/page/construct.mjs", "subjects/almi-oet/tools/nursing-chain.mjs", "subjects/almi-oet/tools/placement-measure.mjs", "subjects/almi-oet/tools/profession-chain.mjs"]);
  assert.equal(r.rows.filter((x) => x.class === "ROUTED").length, 4);
  assert.equal(r.rows.filter((x) => x.class === "CHECKS").length, 1);
});

test("C5 · FIRING CONTROLS: an unclassified renderer, a routed path without its check, and a 'not page production' path that renders — each is a fault", () => {
  const files = tree();
  const planted = [...files, { file: "bin/zz-f34-stand-in.mjs", text: 'import { renderPage } from "../src/page/render.mjs";\n' }];
  assert.deepEqual(pageProductionCensus({ files: planted }).faults.map((f) => f.code), ["UNCLASSIFIED_PAGE_PATH"]);
  const stripped = files.map((f) => (f.file === "bin/build-page.mjs" ? { ...f, text: f.text.split(PAGE_PRODUCTION["bin/build-page.mjs"].marks[0]).join("existingPages: null") } : f));
  assert.deepEqual(pageProductionCensus({ files: stripped }).faults, [{ file: "bin/build-page.mjs", code: "ROUTED_WITHOUT_THE_CHECK" }]);
  /* 🔴 the call kept, the CONDITION removed — the page written whatever the gate said — is a fault too */
  const unconditional = files.map((f) => (f.file === "subjects/almi-oet/tools/nursing-chain.mjs" ? { ...f, text: f.text.split("...(existingPage.mayProduce ? [[\"nursing.html\"").join("...(true ? [[\"nursing.html\"") } : f));
  assert.deepEqual(pageProductionCensus({ files: unconditional }).faults, [{ file: "subjects/almi-oet/tools/nursing-chain.mjs", code: "ROUTED_WITHOUT_THE_CHECK" }]);
  const rendering = files.map((f) => (f.file === "bin/crawl.mjs" ? { ...f, text: `import { renderPage } from "../src/page/render.mjs";\n${f.text}` } : f));
  assert.ok(pageProductionCensus({ files: rendering }).faults.some((f) => f.code === "RENDERS_A_CANDIDATE_BUT_CLASSIFIED_NOT_PAGE_PRODUCTION"));
  assert.deepEqual(staticImports("subjects/a/tools/x.mjs", 'import { a } from "../../../src/page/render.mjs";'), ["src/page/render.mjs"]);
});

/* ---- C3 · no overwrite path ---------------------------------------------------------------------------------------- */

test("C3 · rediscovery has NO path to an existing page: nothing writes into a product repository, publishes or generates in bulk", () => {
  const c = noGenerationCensus();
  assert.deepEqual(c.hits.PRODUCT_REPO_WRITE, [], "a path writes into a product repository — an existing page could be overwritten");
  assert.deepEqual(c.hits.PUBLISH, [], "a path publishes — an existing page could be replaced or removed");
  assert.deepEqual(c.hits.BULK_GENERATION, []);
  /* firing control: the census still sees a product-repository write when one is put in front of it */
  const planted = noGenerationCensus({ sources: [{ file: "bin/zz-f34-stand-in.mjs", text: 'writeFileSync("../almi-oet/app/page.html", html);\n' }] });
  assert.ok(planted.hits.PRODUCT_REPO_WRITE.length >= 1, "the census no longer sees a write into a product repository");
  /* firing control: the census still sees a publish (built from parts, so this file never reads as one) */
  const deploy = `execFileSync("${["ver", "cel"].join("")}", ["${["dep", "loy"].join("")}"]);\n`;
  assert.ok(noGenerationCensus({ sources: [{ file: "bin/zz-f34-stand-in.mjs", text: deploy }] }).hits.PUBLISH.length >= 1, "the census no longer sees a publish");
});

/* ---- the REAL population, count-only ------------------------------------------------------------------------------- */

test("REAL · the subject that declares page specs has a non-empty same-tenant existing-page population, and both real specs are stopped", async () => {
  const resolve = createTenantResolver();
  const side = resolveSide(resolve, RESOURCES.subject("almi-oet"));
  assert.equal(side.state, "RESOLVED", "the subject's tenant is not lawfully declared");
  const { population, fault } = readExistingPagePopulation({ scope: { tenantId: side.tenantId }, resolve });
  assert.equal(fault, null);
  assert.ok(population.pages.length > 0, "EMPTY real population — the acceptance makes that COULD-NOT-PROVE, never a pass");
  assert.notEqual(population.coverageState, "COMPLETE", "the stored crawl's coverage was corrected to PARTIAL; it must not read as COMPLETE");
  const { NURSING_PAGE, SPEECH_PATHOLOGY_PAGE } = await import(new URL("../../almi-visibility-data/almi-oet/page-specs.mjs", import.meta.url));
  const { variants } = await subject("almi-oet");
  for (const spec of [NURSING_PAGE, SPEECH_PATHOLOGY_PAGE]) {
    const d = existingPageFirst({ candidate: { slug: spec.slug ?? spec.variant, intent: spec.variant, structure: { values: variants } }, tenantId: side.tenantId, population });
    assert.equal(d.mayProduce, false, `${spec.variant}: a real declared candidate would be produced over the tenant's existing pages`);
    assert.ok(d.existingPages.length > 0);
  }
  console.log(`  REAL (count-only): ${population.pages.length} existing page(s) in the subject's tenant · coverage ${population.coverageState} · bound: one stored batch, this tenant's partition`);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE, "a test in this file wrote to the production audit trail");
});
