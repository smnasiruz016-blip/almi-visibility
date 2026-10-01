/**
 * F16 · PUBLIC-QUESTION RESEARCH INTAKE (acceptance _handoffs 944f769, RR-114; owner direction RR-89 §1).
 *
 * Fixtures DRIVE the rules (hand-counted below; every question here is synthetic and invented for the test, never a recorded one); they
 * never stand in for the real population. The REAL test reads every declared client's own research batches through its partition and
 * is the only source of reported figures. Nothing is fetched, rendered or harvested; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { intakeOne, intakeQuestions, groupQuestions, originalsOf, outranks, reportLines, KINDS, REQUIRED_FIELDS, CENSUS_PARTS, COMPLETENESS_CLAIM, NOT_MEASURED, VERDICT, MISSING, RECORD_TYPE } from "../src/research/public-questions.mjs";
import { readClientQuestionRecords } from "../src/research/public-questions-reader.mjs";
import { createTenantResolver, readDeclarations, rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld, FIXTURE_TENANT, FIXTURE_SUBJECT_ORIGIN } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PATH = ["src/research/public-questions.mjs", "src/research/public-questions-reader.mjs", "bin/public-questions.mjs"];
const ENTRIES = ["src/research/public-questions.mjs", "src/research/public-questions-reader.mjs"];

const FULL = { source: "src-a", surface: "surface-a", country: "XX", language: "xx", timeWindow: { from: "2026-09-01", to: "2026-09-30" }, method: "manual reading", limits: "first page only" };
const q = (id, kind, wording, over = {}) => ({ record_type: RECORD_TYPE, question_id: id, value: { kind, original: wording, provenance: { seenAt: "fixture" }, ...FULL, ...over } });

/* ================= C1 — lawful sources; nothing sealed, nothing owned ================= */

const SEALED_OR_OWNED = /sealed-store-roots|sealed-paths|synthetic-sealed-fixture|config\/evidence-roles|src\/heldout\/|intent-clusters/;
/** C1: the path's closure reaches no sealed, held-out or owned-Search-Console module, and asks the root index for RESEARCH only. */
function reachesForbidden(read) {
  const r = decisionCallPaths({ entries: ENTRIES, read });
  const modules = r.modules.filter((m) => SEALED_OR_OWNED.test(m));
  const namesOwnedStore = r.modules.filter((m) => { const t = read(m); return t !== null && /evidence\.jsonl|runs\/evidence/.test(t); });
  const otherStores = r.modules.filter((m) => { const t = read(m); return t !== null && /lookupStore\(.*?,\s*"(?!RESEARCH")[A-Z_]+"/.test(t) && m.startsWith("src/research/"); });
  return [...modules, ...namesOwnedStore, ...otherStores];
}
const readRepo = (f) => (existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null);

test("C1 · FIRING CONTROL: the intake path reaches no sealed store, no held-out module and no owned Search Console store — and the control fires", () => {
  assert.deepEqual(reachesForbidden(readRepo), [], "the intake path can reach sealed, held-out or owned material");
  const plantedSealed = reachesForbidden((f) => (f === ENTRIES[1] ? `${readRepo(f)}\nimport { x } from "../governance/sealed-store-roots.mjs";\n` : readRepo(f)));
  assert.ok(plantedSealed.length > 0, "a planted sealed-store import was not seen");
  const plantedOwned = reachesForbidden((f) => (f === ENTRIES[1] ? `${readRepo(f)}\nconst P = "runs/evidence/evidence.jsonl";\n` : readRepo(f)));
  assert.ok(plantedOwned.length > 0, "a planted owned-store path was not seen");
  const plantedStore = reachesForbidden((f) => (f === ENTRIES[1] ? `${readRepo(f)}\nconst s = lookupStore(rootIndexFor(env), "OBSERVATIONS");\n` : readRepo(f)));
  assert.ok(plantedStore.length > 0, "a planted lookup of another store was not seen");
});

/* ================= C2 — required fields ================= */

test("C2 · FIRING CONTROL: every required field is carried; a field not captured is NOT MEASURED and named — never blank, never 0", () => {
  assert.deepEqual([...REQUIRED_FIELDS], ["source", "surface", "country", "language", "timeWindow", "method", "limits"]);
  const full = intakeOne(q("a", "OBSERVED", "fixture wording one"));
  assert.deepEqual(full.notMeasured, []);
  const gaps = intakeOne(q("b", "OBSERVED", "fixture wording two", { country: "", language: undefined, timeWindow: {}, limits: null }));
  assert.deepEqual(gaps.notMeasured, ["country", "language", "timeWindow", "limits"]);
  for (const f of gaps.notMeasured) assert.equal(gaps.fields[f], NOT_MEASURED, `${f} was blank or 0 instead of NOT MEASURED`);
});

/* ================= C3 — three kinds, never merged ================= */

test("C3 · FIRING CONTROL: OBSERVED, INFERRED and CLIENT_CLAIM land in three lists with their own evidence states; a client claim never outranks an observation", () => {
  const r = intakeQuestions([q("o1", "OBSERVED", "w1"), q("o2", "OBSERVED", "w2"), q("i1", "INFERRED", "w3"), q("c1", "CLIENT_CLAIM", "w4")]);
  assert.deepEqual(Object.fromEntries(Object.keys(KINDS).map((k) => [k, r.lists[k].map((x) => x.id)])), { OBSERVED: ["o1", "o2"], INFERRED: ["i1"], CLIENT_CLAIM: ["c1"] });
  assert.match(r.lists.CLIENT_CLAIM[0].evidenceState, /^NOT EVIDENCE/);
  assert.match(r.lists.OBSERVED[0].evidenceState, /^OBSERVED/);
  assert.equal(outranks(r.lists.OBSERVED[0], r.lists.CLIENT_CLAIM[0]), true);
  assert.equal(outranks(r.lists.CLIENT_CLAIM[0], r.lists.OBSERVED[0]), false, "a client claim outranked an independent observation");
  const unknown = intakeQuestions([q("x", "SUGGESTED", "w5")]);
  assert.equal(unknown.malformed, 1);
  assert.equal(unknown.verdict, VERDICT.DISPROVED, "a question with no recorded kind was accepted");
});

/* ================= C4 — originals survive grouping ================= */

test("C4 · FIRING CONTROL: no sameness rule is picked — nothing is grouped and the decision is named; with a declared rule every original survives, unchanged", () => {
  const recs = [q("a", "OBSERVED", "How long does it take?"), q("b", "OBSERVED", "how long does it take"), q("c", "OBSERVED", "What does it cost?")];
  const qs = recs.map(intakeOne);
  const none = groupQuestions(qs);
  assert.deepEqual([none.grouped, none.missing, none.groups.length], [false, MISSING.sameness, 3], "a sameness rule was assumed");
  const declared = (x, y) => x.original.wording.toLowerCase().replace(/[?]/g, "") === y.original.wording.toLowerCase().replace(/[?]/g, "");
  const g = groupQuestions(qs, declared);
  assert.deepEqual(g.groups.map((m) => [...m]), [["a", "b"], ["c"]]);
  assert.deepEqual(originalsOf(qs, g.groups).map((o) => o.wording), ["How long does it take?", "how long does it take", "What does it cost?"], "an original was lost or rewritten by grouping");
  assert.ok(Object.isFrozen(qs[0].original), "an original can be overwritten");
});

/* ================= C5 / C6 — a sample, never the world; finds and records only ================= */

test("C5 · FIRING CONTROL: every report says SAMPLE with its limits, and a completeness claim in any line is refused", () => {
  const lines = reportLines(intakeQuestions([q("a", "OBSERVED", "A fixture question about timing?")]), { limits: "two named batches" });
  assert.match(lines[0], /^SAMPLE — .* declared limits: two named batches$/);
  for (const l of lines) assert.doesNotMatch(l, COMPLETENESS_CLAIM, "a report line claims completeness");
  for (const claim of ["all questions", "complete set", "full coverage", "every question", "worldwide"]) assert.ok(COMPLETENESS_CLAIM.test(claim), `"${claim}" is not caught`);
  assert.throws(() => reportLines(intakeQuestions([q("a", "OBSERVED", "A fixture question about timing?")]), { limits: "all of them" }), /COMPLETENESS_CLAIM_IN_OUTPUT/);
});

test("C6 · FIRING CONTROL: no answer field survives intake, and a report line carrying a recorded wording is refused", () => {
  const rec = q("a", "OBSERVED", "A fixture question with distinct wording?");
  rec.value.answer = "A fixture answer that must never travel";
  rec.value.pageContent = "fixture page text";
  const one = intakeOne(rec);
  assert.ok(!JSON.stringify(one).includes("fixture answer") && !JSON.stringify(one).includes("fixture page text"), "an answer or page content travelled through intake");
  const r = intakeQuestions([rec]);
  for (const l of reportLines(r, { limits: "fixture" })) assert.ok(!l.includes("distinct wording"), "a report printed a question's wording");
  assert.throws(() => reportLines(r, { limits: "fixture: A fixture question with distinct wording?" }), /QUESTION_WORDING_IN_OUTPUT/);
});

/* ================= C7 — census parts, honest verdicts ================= */

test("C7 · the census parts are NOT MEASURED with their missing observations named; an empty sample is COULD-NOT-PROVE, never PROVED", () => {
  const empty = intakeQuestions([]);
  assert.deepEqual(Object.values(empty.census), Array(CENSUS_PARTS.length).fill(NOT_MEASURED));
  assert.equal(empty.verdict, VERDICT.COULD_NOT_PROVE, "an empty sample read PROVED");
  assert.ok(empty.missing.includes(MISSING.population) && empty.missing.includes(MISSING.census));
  assert.match(MISSING.census, /not authorised \(RR-89 §1\.3\)/);
  assert.equal(intakeQuestions([q("a", "OBSERVED", "A fixture question about cost?")]).verdict, VERDICT.COULD_NOT_PROVE, "a sample read PROVED while the census parts are unmeasured");
});

/* ================= C7 — neutrality ================= */

test("C7 · FIRING CONTROL: the intake path names no declared product word — and the scanner fires when one is planted", () => {
  assert.ok(PRODUCT_WORDS.length > 0);
  for (const f of PATH) assert.deepEqual(scanSource(readFileSync(join(REPO, f), "utf8")).code, [], `${f} names a product in code`);
  assert.ok(scanSource(`${readFileSync(join(REPO, PATH[0]), "utf8")}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0, "the scanner did not fire");
});

/* ================= REAL ================= */

test("REAL · every declared client's own research batches: the recorded public-question sample is counted; empty is reported empty", () => {
  const store = lookupStore(rootIndexFor(), "RESEARCH");
  assert.equal(store.state, "DECLARED");
  const batches = readdirSync(store.dir).filter((n) => statSync(join(store.dir, n)).isDirectory());
  assert.ok(batches.length > 0, "no research batch is declared");
  const d = readDeclarations();
  const resolve = createTenantResolver();
  let population = 0, read = 0;
  for (const t of (d.tenants?.tenants ?? d.tenants).map((x) => x.tenantId)) { const r = readClientQuestionRecords({ tenantId: t, resolve, batches }); population += r.records.length; read = r.read; }
  assert.ok(read > 0, "nothing was read — the population of records was empty");
  const verdict = intakeQuestions([]).verdict;
  console.log(`  REAL (count-only, every declared client's research batches): ${JSON.stringify({ batches: batches.length, recordsRead: read, publicQuestionRecords: population, verdict: population === 0 ? verdict : "see per-client run" })}`);
});

test("C1 · FIRING CONTROL: the production reader returns only records whose own identity resolves to the client — another origin is never read as the client's", () => {
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const dir = join(WORLD.root, "research", "f16-fixture-batch");
    mkdirSync(dir, { recursive: true });
    const own = q("own-1", "OBSERVED", "A fixture question for the client?", { origin: FIXTURE_SUBJECT_ORIGIN });
    const other = q("other-1", "OBSERVED", "A fixture question for nobody?", { origin: "https://not-declared-to-anyone.invalid" });
    writeFileSync(join(dir, "questions.jsonl"), `${JSON.stringify(own)}\n${JSON.stringify(other)}\n`);
    const r = readClientQuestionRecords({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), batches: ["f16-fixture-batch"], env });
    assert.deepEqual(r.records.map((x) => x.question_id), ["own-1"], "a record outside the client's partition was read as the client's");
    assert.equal(r.outsidePartition, 1);
  } finally { WORLD.cleanup(); }
});

/* ================= the entry point ================= */

test("C1 · THE ENTRY POINT: in a declared world it reads nothing until a batch is named, refuses a batch not declared to the tenant, prints no URL, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const none = spawnSync(process.execPath, WORLD.argv(["bin/public-questions.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(none.status, 2, none.stdout + none.stderr);
    assert.match(none.stderr, /name at least one --research-batch=<id>; nothing is read, and the sample is EMPTY — never a pass/);
    const undeclared = spawnSync(process.execPath, WORLD.argv(["bin/public-questions.mjs", "--research-batch=undeclared-batch-fixture"]), { cwd: REPO, encoding: "utf8", env });
    assert.notEqual(undeclared.status, 0, "a research batch not declared to this tenant was read");
    assert.doesNotMatch(undeclared.stdout, /SAMPLE —/, "an undeclared batch produced a report");
    assert.doesNotMatch(none.stdout + none.stderr + undeclared.stdout + undeclared.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C1 · the intake path loads no module that can make a network, process, connector or paid call — and it fires", () => {
  assert.deepEqual(decisionCallPaths({ entries: ENTRIES }).faults, []);
  const planted = decisionCallPaths({ entries: ENTRIES, read: (f) => (f === ENTRIES[0] ? `${readRepo(f)}\nawait fetch(u);\n` : readRepo(f)) });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
