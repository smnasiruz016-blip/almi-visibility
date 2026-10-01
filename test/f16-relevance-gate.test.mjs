/**
 * F16 · THE RELEVANCE GATE (RR-126). A search hit is a LEAD; only an item whose own retained text satisfies the subject's DECLARED
 * relevance profile may enter that subject's batch. The bare letters of an abbreviation prove nothing.
 *
 * The OET-shaped profile below is DECLARED TEST-SUBJECT DATA: it lives in this test as data handed to the production entry point, never
 * in core code (a firing control proves the core names no such subject). Every title, link and name is SYNTHETIC; nothing is fetched,
 * no real post is held, and the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { recordsFrom, compileProfile, relevanceOf, SOURCE_KINDS, VERIFIED } from "../src/research/source-adapter.mjs";
import { intakeQuestions } from "../src/research/public-questions.mjs";
import { readClientQuestionRecords } from "../src/research/public-questions-reader.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT, inputPathRef } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f16-relevance-${process.pid}`);
const CORE = ["src/research/source-adapter.mjs", "bin/source-intake.mjs", "src/research/adapters/stack-exchange.mjs", "src/research/adapters/stack-exchange-collector.mjs", "src/research/request-governor.mjs", "src/research/public-questions.mjs"];

/* the TEST SUBJECT and its DECLARED profile — data, not code */
const EXAM = { subject: "exam-prep-test-subject", origin: "https://exam-prep.invalid", batch: "exam-prep-research", tenant: FIXTURE_TENANT };
const OTHER = { subject: "harbour-ferry-times", origin: "https://harbour-ferry.invalid", batch: "harbour-ferry-research", tenant: SECOND_FIXTURE_TENANT };
const EXAM_PROFILE = Object.freeze({
  profileId: "oet-test-subject-profile-v1", subject: EXAM.subject, declaredAs: "TEST_SUBJECT_DATA",
  confirms: ["Occupational English Test", "\\bOET\\b.*\\b(exam|sub-?test|score|grade|band|nurs(e|ing)|doctor|writing|speaking|listening|reading)\\b"],
  ambiguous: ["\\bOET\\b"],
  excludes: ["\\bOET\\b.*\\b(shipping|freight|optics?|electronic|software)\\b"],
});

const E = (iso) => Date.parse(iso) / 1000;
const post = (id, title, over = {}) => ({ question_id: id, title, link: `https://fixture-qa.invalid/q/${id}`, creation_date: E("2021-03-01T10:00:00Z"),
  owner: { display_name: `fixture-user-${id}` }, content_license: "CC BY-SA 4.0", ...over });
const RELEVANT = post(1, "How is the OET writing sub-test marked for nurses?");
const UNRELATED = post(2, "Should I use a comma before which in this sentence?");
const AMBIGUOUS = post(3, "What does OET mean in this sentence?");
const recorded = (items) => ({ recordedAt: "2026-10-01T09:00:00Z", request: { site: "fixture-site.invalid", q: "OET", language: "en" }, response: { items } });

/* ================= the profile is data, and refuses when it is wrong ================= */

test("§3 · FIRING CONTROL: the gate needs the subject's OWN declared profile — absent, another subject's, no confirming rule or a broken pattern each refuses the whole retrieval", () => {
  const decl = { sourceId: "fixture", kind: SOURCE_KINDS.QUESTION_SOURCE, terms: Object.fromEntries(["storage", "attribution", "licence"].map((t) => [t, { status: VERIFIED, citation: "fixture — synthetic", retrievedOn: "2026-10-01" }])) };
  const item = { wording: RELEVANT.title, wordingOrigin: "SOURCE_TEXT", sourceUrl: RELEVANT.link, postVersion: "1", licenceName: "x", licenceVersion: "1", attribution: "x", observedAt: "2026-10-01T09:00:00Z", country: "NOT MEASURED", language: "en" };
  const ret = { topic: "t", coverageLimits: "one fixture", items: [item] };
  const run = (relevance) => recordsFrom(decl, ret, { subject: EXAM.subject, origin: EXAM.origin, relevance });
  assert.equal(run(EXAM_PROFILE).records.length, 1);
  for (const [profile, why] of [[null, "RELEVANCE_PROFILE_UNDECLARED"], [{ ...EXAM_PROFILE, subject: OTHER.subject }, "RELEVANCE_PROFILE_IS_ANOTHER_SUBJECTS"],
    [{ ...EXAM_PROFILE, confirms: [] }, "RELEVANCE_PROFILE_HAS_NO_CONFIRMING_RULE"], [{ ...EXAM_PROFILE, confirms: ["(unclosed"] }, "RELEVANCE_PATTERN_INVALID"]]) {
    const r = run(profile);
    assert.deepEqual([r.records.length, r.refusals], [0, [why]], `${why}: an item entered the batch`);
  }
});

test("§3 · FIRING CONTROL: one rule per item, in order — an exclusion beats a confirmation; a bare abbreviation is AMBIGUOUS, never relevant", () => {
  const p = compileProfile(EXAM_PROFILE, EXAM.subject);
  assert.deepEqual(relevanceOf("Is OET software free for small freight firms?", p), { verdict: "UNRELATED", rule: "excludes[0]" });
  assert.deepEqual(relevanceOf("Preparing for the Occupational English Test as a doctor", p), { verdict: "RELEVANT", rule: "confirms[0]" });
  assert.deepEqual(relevanceOf(RELEVANT.title, p), { verdict: "RELEVANT", rule: "confirms[1]" });
  assert.deepEqual(relevanceOf(AMBIGUOUS.title, p), { verdict: "AMBIGUOUS", rule: "ambiguous[0]" });
  assert.deepEqual(relevanceOf(UNRELATED.title, p), { verdict: "UNRELATED", rule: null });
  assert.deepEqual(relevanceOf("TOETOE grows by the coast", p).verdict, "UNRELATED", "letters inside another word were read as the abbreviation");
});

/* ================= three items through the REAL intake path ================= */

function declareClient(W, c) {
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  reg.subjects.push({ subjectId: c.subject, path: c.subject, members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: c.batch }], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: c.origin }] }] });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
  mkdirSync(join(W.root, c.subject), { recursive: true });
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  for (const [kind, ref] of [["RESEARCH_BATCH", c.batch], ["SITE_ORIGIN", c.origin]]) {
    const a = att.attachments.find((x) => x.resourceKind === kind && x.resourceRef === ref);
    if (a) a.tenantId = c.tenant; else att.attachments.push({ ...att.attachments[0], resourceKind: kind, resourceRef: ref, tenantId: c.tenant });
  }
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  mkdirSync(join(W.root, "research", c.batch), { recursive: true });
}
function input(W, name, tenant, content) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(content));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "INPUT_PATH", resourceRef: inputPathRef(p), tenantId: tenant });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  return p;
}
const intake = (W, c, files, batch = c.batch) => spawnSync(process.execPath, ["bin/source-intake.mjs", `--tenant=${c.tenant}`, `--actor=${W.actor}`, `--subject=${c.subject}`, `--research-batch=${batch}`, "--adapter=stack-exchange", ...files, "--confirm"], { cwd: REPO, encoding: "utf8", env: W.envWith() });
const stored = (W, batch) => { const p = join(W.root, "research", batch, "questions.jsonl"); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };

test("§3 · THREE ITEMS THROUGH THE REAL INTAKE: the relevant one is kept; the unrelated and the ambiguous are refused by name, never stored, never counted", () => {
  const W = declaredWorld({ secondTenantOrigins: [OTHER.origin] });
  try {
    declareClient(W, EXAM);
    declareClient(W, OTHER);
    const three = [RELEVANT, UNRELATED, AMBIGUOUS];
    const files = [`--retrieval=${input(W, "r.json", EXAM.tenant, recorded(three))}`, `--recheck=${input(W, "c.json", EXAM.tenant, recorded(three))}`, `--relevance=${input(W, "p.json", EXAM.tenant, EXAM_PROFILE)}`];
    const r = intake(W, EXAM, files);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /questions people wrote: kept 1 of 3 retrieved/);
    assert.match(r.stdout, /NOT_ABOUT_THE_DECLARED_SUBJECT 1/);
    assert.match(r.stdout, /RELEVANCE_AMBIGUOUS_KEPT_OUT 1/);
    const rows = stored(W, EXAM.batch);
    assert.equal(rows.length, 1, "an unrelated or ambiguous item was stored in the subject's batch");
    assert.deepEqual([rows[0].value.original, rows[0].value.relevance.verdict, rows[0].value.relevance.rule, rows[0].value.relevance.profileId], [RELEVANT.title, "RELEVANT", "confirms[1]", "oet-test-subject-profile-v1"]);
    const env = W.envWith();
    const read = intakeQuestions(readClientQuestionRecords({ tenantId: EXAM.tenant, resolve: createTenantResolver({ env }), batches: [EXAM.batch], env }).records);
    assert.deepEqual([read.population, read.observerSplit.SOURCE_ADAPTER_OBSERVED, read.malformed], [1, 1, 0], "the ambiguous or unrelated item was counted as a question");
    assert.doesNotMatch(r.stdout, /OET|Occupational|comma|https?:\/\//, "a report printed a title or a link");
    /* the profile belongs to its subject: handed to another subject's run, it refuses everything */
    const wrong = intake(W, OTHER, [`--retrieval=${input(W, "r2.json", OTHER.tenant, recorded([RELEVANT]))}`, `--recheck=${input(W, "c2.json", OTHER.tenant, recorded([RELEVANT]))}`, `--relevance=${input(W, "p2.json", OTHER.tenant, EXAM_PROFILE)}`]);
    assert.match(wrong.stdout, /RELEVANCE_PROFILE_IS_ANOTHER_SUBJECTS/);
    assert.equal(stored(W, OTHER.batch).length, 0);
    /* no profile at all: nothing may enter */
    const none = intake(W, EXAM, files.filter((f) => !f.startsWith("--relevance")));
    assert.match(none.stdout, /RELEVANCE_PROFILE_UNDECLARED/);
    assert.equal(stored(W, EXAM.batch).length, 1, "a run without a profile added to the batch");
  } finally { W.cleanup(); }
});

/* ================= the core names no subject ================= */

test("§3 · FIRING CONTROL: the core names no subject — no OET rule and no product name in code; the controls fire when one is planted", () => {
  const SUBJECT_WORDS = /\bOET\b|Occupational English/i;
  for (const f of CORE) {
    const t = readFileSync(join(REPO, f), "utf8");
    assert.doesNotMatch(t, SUBJECT_WORDS, `${f} carries a subject's rule`);
    assert.deepEqual(scanSource(t).code, [], `${f} names a product`);
  }
  assert.match(`${readFileSync(join(REPO, CORE[0]), "utf8")}\nconst SUBJECT = "OET";\n`, SUBJECT_WORDS, "the subject-word control did not fire");
  assert.ok(scanSource(`${readFileSync(join(REPO, CORE[0]), "utf8")}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0);
});

test("the test's own temporary inputs are removed", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(existsSync(TMP), false);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
