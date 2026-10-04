/**
 * 🔴 F16 · C8–C14 · THE COLLECTION ENTRY POINT (Acceptance Amendment 1, _handoffs 45a1cbf; RR-155 §3–§4).
 *
 * FAKE TRANSPORT ONLY — ZERO REAL REQUESTS. bin/collect-public-questions.mjs is driven through its test seams (honoured only inside a
 * verified test run) on TWO REAL DECLARED SUBJECTS, read from the data root's own registry: the one the owner named in RR-155 §2 (declared
 * by him, not an exam product) and the other declared subject that is not the exam product. Each runs in a confined copy of the data root;
 * nothing here reaches a network, the real research batches or the production trail.
 *
 *   K1  the bounded run on both subjects: two requests, leads apart, only relevant, current, licensed questions admitted, observer type on
 *       record and report, SAMPLE, count-only; one subject's plan never runs for the other
 *   K2  no GREEN · a GREEN for another plan · a STALE GREEN · a REUSED GREEN → refused before any request, the refusal recorded
 *   K3  the cap · a quota exhausted · a backoff · a source refusal (no retry) — each stops the run; a refusal is never zero
 *   K4  an irrelevant result · a deleted or changed post · a missing licence · a duplicate → never admitted
 *   K5  zero results → zero, and the run ends; a lead is never a question
 *   K6  tenant and subject crossover refused; no --confirm refused; the test seams HALT outside a test run
 *   K7  the credential: absent → refused; its value never in any output, store or request the code builds; touched in one place only
 *   K8  C8 census: no read-back path holds a transport; the collection code names no product; an agent's record never reads as a person's
 *   K9  the source decision: VALID only when CURRENT with a declared issuer (the real register), refused otherwise
 *   REAL the real data root: collection runs and collected questions, count-only — fixtures never counted here
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { declaredWorld, inputPathRef, DATA_ROOT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";
import { contentHashOf } from "../src/authority/corpus.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { planSha256, preflight, planRefusals, declaredGreens, COLLECTION_RUN } from "../src/research/collection.mjs";
import { API_ORIGIN, SOURCE_DECISION, DECLARATION } from "../src/research/adapters/stack-exchange.mjs";
import { intakeQuestions, RECORD_TYPE } from "../src/research/public-questions.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";
import { buildBoard } from "../src/fboard/board.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f16-collection-${process.pid}`);
const BIN = "bin/collect-public-questions.mjs";
const KEY_NAME = "FIXTURE_QUESTION_SOURCE_KEY";
const SENTINEL = "sentinel-credential-value-7c1d";
const TODAY = new Date().toISOString().slice(0, 10);
const E = (iso) => Date.parse(iso) / 1000;
const post = (id, over = {}) => ({ question_id: id, title: `Synthetic fixture question ${id}?`, link: `https://fixture-qa.invalid/q/${id}`, creation_date: E("2021-03-01T10:00:00Z"),
  owner: { display_name: `fixture-user-${id}` }, content_license: "CC BY-SA 4.0", body: "SYNTHETIC BODY — never stored", ...over });
const sha = (s) => createHash("sha256").update(s).digest("hex");

/* the two REAL declared subjects, from the data root's own registry — the owner's named one, and the other that is not the exam product */
const REGISTRY = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8")).subjects.map((s) => s.subjectId);
const NAMED = "lamzish";
const OTHER = REGISTRY.find((s) => s !== NAMED && s !== "almi-oet");

let n = 0;
function file(name, content) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, `${++n}-${name}`);
  writeFileSync(p, typeof content === "string" ? content : JSON.stringify(content));
  return p;
}
function attach(W, kind, ref, tenant = W.tenantId) {
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  if (!att.attachments.some((a) => a.resourceKind === kind && a.resourceRef === ref)) att.attachments.push({ ...att.attachments[0], resourceKind: kind, resourceRef: ref, tenantId: tenant });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
}
/** The subject's batch and its QUESTION_SOURCE_API connector, declared in the CONFINED copy only. */
function prepare(W, subject) {
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  const s = reg.subjects.find((x) => x.subjectId === subject);
  assert.ok(s, `${subject.length}-character subject is not declared in the registry`);
  const batch = `fixture-collection-${subject.length}`;
  if (!s.members.some((m) => m.resourceRef === batch)) s.members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: batch });
  s.connectors = s.connectors.filter((c) => c.kind !== "QUESTION_SOURCE_API");
  s.connectors.push({ connectorId: "question-source", kind: "QUESTION_SOURCE_API", credential: { mechanism: "ENV_REFERENCE", name: KEY_NAME }, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: API_ORIGIN }] });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
  for (const m of s.members) attach(W, m.resourceKind, m.resourceRef);
  attach(W, "SITE_ORIGIN", API_ORIGIN);
  mkdirSync(join(W.root, "research", batch), { recursive: true });
  return batch;
}
function inputs(W, subject, batch, { requests = 2, declaredOn = TODAY, tenantId = W.tenantId, planId = `fixture-plan-${subject.length}` } = {}) {
  const relText = JSON.stringify({ profileId: "fixture-profile", subject, declaredAs: "FIXTURE", confirms: ["synthetic fixture question"], excludes: ["off-topic"] });
  const dir = join(W.root, "research", batch);
  writeFileSync(join(dir, "relevance-profile.json"), relText);
  const planText = JSON.stringify({ schemaVersion: 1, kind: "PUBLIC_QUESTION_COLLECTION_PLAN", planId, subject, tenantId, researchBatch: batch, adapter: "stack-exchange",
    site: "fixture-site", query: { q: "fixture" }, language: "en", pagesize: 10, requests, relevanceProfileSha256: sha(relText), keeps: ["question title as written", "its link", "its dates", "its creator's name", "its licence"],
    retention: "kept in the subject's research batch until the owner removes it", declaredOn });
  return { planText, relText, dir, planSha: planSha256(planText), requests };
}
function green(planSha, { requests = 2, issuedAt = TODAY, tag = "a", issuer = "OWNER", blockFor = planSha } = {}) {
  const text = `fixture GREEN record\n\nOWNER GREEN v1\nplan: ${blockFor}\nrequests: ${requests}\nEND OWNER GREEN\n`;
  const path = `AlmiVisibility_OWNER_DECISION_${issuedAt}_FIXTURE_GREEN_${tag}.md`;
  const record = { authorityId: `_handoffs:${path}`, propositionId: `OWNER_DECISION_FIXTURE_GREEN_${tag}`, scope: ["ALMIVISIBILITY"], issuer: { class: issuer, declaredBy: "fixture" },
    issuedAt, issuedAtSource: "FILE_NAME", effectiveFrom: issuedAt, sourceRef: { kind: "GOVERNANCE_RECORD", repo: "_handoffs", path, commit: "0".repeat(40), blob: "0".repeat(40) },
    status: "CURRENT", supersedes: [], supersededBy: [], contentHash: contentHashOf(text), recordedAt: `${issuedAt}T00:00:00Z`, inclusionRule: "fixture" };
  return { id: record.authorityId, path: file("green.json", { record, text }) };
}
function run(W, subject, batch, io, g, responses, { env = {}, confirm = true, extra = [] } = {}) {
  const calls = file("calls.jsonl", "");
  const scenario = file("scenario.json", { responses });
  /* the plan and the profile are the batch's own data: written into the CONFINED batch before each run; the test GREEN is a declared input */
  if (g) attach(W, "INPUT_PATH", inputPathRef(g.path));
  writeFileSync(join(io.dir, "collection-plan.json"), io.planText);
  writeFileSync(join(io.dir, "relevance-profile.json"), io.relText);
  const args = [BIN, `--subject=${subject}`, `--research-batch=${batch}`, ...(g ? [`--green=${g.id}`] : []), ...extra, ...(confirm ? ["--confirm"] : [])];
  const fullEnv = { ...W.envWith(), [KEY_NAME]: SENTINEL, ALMIVISIBILITY_TEST_TRANSPORT: join(REPO, "test", "fixtures", "fake-question-source-transport.mjs"), ...(g ? { ALMIVISIBILITY_TEST_GREEN: g.path } : {}), FAKE_QS_SCENARIO: scenario, FAKE_QS_CALLS: calls, ...env };
  for (const k of Object.keys(fullEnv)) if (fullEnv[k] === undefined) delete fullEnv[k];
  const r = spawnSync(process.execPath, W.argv(args), { cwd: REPO, encoding: "utf8", env: fullEnv });
  const called = readFileSync(calls, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  return { r, out: r.stdout + r.stderr, calls: called };
}
const stored = (W, batch, f) => { const p = join(W.root, "research", batch, f); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
const GOOD = () => [{ items: [post(1), post(2)], quota_remaining: 9000 }, { items: [post(1), post(2)] }];
const world = () => { const W = declaredWorld(); return W; };

test("K1 · THE BOUNDED RUN ON BOTH REAL DECLARED SUBJECTS — two requests, leads apart, questions admitted only through the boundary, observer type, SAMPLE, count-only; one subject's plan never runs for the other", () => {
  assert.ok(OTHER, "the second declared subject is missing — the proof would rest on one subject");
  const desc = JSON.parse(readFileSync(join(DATA_ROOT, NAMED, "descriptor.json"), "utf8"));
  assert.equal(desc.ownerValues.examProduct, false, "the owner's named subject is not recorded outside the exam family");
  const W = world();
  try {
    const runs = {};
    for (const subject of [NAMED, OTHER]) {
      const batch = prepare(W, subject), io = inputs(W, subject, batch), g = green(io.planSha, { tag: `k1-${subject.length}` });
      const x = run(W, subject, batch, io, g, GOOD());
      assert.equal(x.r.status, 0, x.out);
      assert.equal(x.calls.length, 2, "not exactly the plan's two requests");
      assert.match(x.out, /outcome COMPLETED · requests sent 2 of cap 2/);
      assert.match(x.out, /leads 2 — search hits, kept apart/);
      assert.match(x.out, /observed questions 2\n/);
      assert.match(x.out, /observer type SOURCE_ADAPTER_OBSERVED, never a person/);
      assert.match(x.out, /SAMPLE — not a census/);
      assert.doesNotMatch(x.out, /https?:\/\/|Synthetic fixture question|fixture-user/, "a report carried a reference, wording or a name");
      const qs = stored(W, batch, "questions.jsonl"), leads = stored(W, batch, "leads.jsonl"), runsRec = stored(W, batch, "collection-runs.jsonl");
      assert.deepEqual([qs.length, leads.length, runsRec.length], [2, 2, 1]);
      for (const q of qs) {
        assert.ok(q.value.original && q.value.reference && q.recorded_at && q.value.limits && q.value.method, "an admitted question lost a kept field");
        assert.equal(q.value.provenance.observerType, "SOURCE_ADAPTER_OBSERVED");
        assert.equal(q.value.plan_id, `fixture-plan-${subject.length}`);
        assert.deepEqual(q.value.author, { authorCountry: "NOT MEASURED", authorRole: "NOT MEASURED" }, "an author's country or role was inferred");
      }
      assert.ok(leads.every((l) => l.record_type === "research_lead" && l.kind === "SEARCH_LEAD"), "a lead was stored as something else");
      assert.equal(runsRec[0].record_type, COLLECTION_RUN);
      runs[subject] = { batch, io };
    }
    /* the named subject's plan run as the other subject is refused before any request */
    const cross = run(W, OTHER, runs[NAMED].batch, runs[NAMED].io, green(runs[NAMED].io.planSha, { tag: "cross" }), GOOD());
    assert.equal(cross.r.status, 3, cross.out);
    assert.equal(cross.calls.length, 0, "a request was issued for another subject's plan");
  } finally { W.cleanup(); }
});

test("K2 · NO GREEN · A GREEN FOR ANOTHER PLAN · A STALE GREEN · A REUSED GREEN — each refused before any request, and the refusal is recorded", () => {
  const W = world();
  try {
    const batch = prepare(W, NAMED), io = inputs(W, NAMED, batch);
    const cases = [
      [null, "GREEN_ABSENT"],
      [green(io.planSha, { tag: "other", blockFor: "f".repeat(64) }), "GREEN_NAMES_ANOTHER_PLAN"],
      [green(io.planSha, { tag: "stale", issuedAt: "2026-01-01" }), "GREEN_PREDATES_THE_PLAN"],
      [green(io.planSha, { tag: "bound", requests: 1 }), "GREEN_BOUND_DIFFERS_FROM_PLAN"],
      [green(io.planSha, { tag: "issuer", issuer: "BETA_G" }), "GREEN_NOT_OWNER_ISSUED"],
    ];
    for (const [g, code] of cases) {
      const x = run(W, NAMED, batch, io, g, GOOD());
      assert.equal(x.r.status, 3, x.out);
      assert.equal(x.calls.length, 0, `${code}: a request was issued`);
      assert.match(x.out, new RegExp(`REFUSED before any request: .*${code}`), `${code} not named`);
      assert.match(x.out, /refusal recorded/);
    }
    assert.equal(stored(W, batch, "collection-runs.jsonl").filter((x) => x.value.outcome === "REFUSED_BEFORE_ANY_REQUEST").length, cases.length);
    /* CONTROL: a fresh GREEN for this plan runs — then the SAME GREEN, again, is spent */
    const g = green(io.planSha, { tag: "fresh" });
    const ok = run(W, NAMED, batch, io, g, GOOD());
    assert.equal(ok.r.status, 0, ok.out);
    const again = run(W, NAMED, batch, io, g, GOOD());
    assert.equal(again.r.status, 3, again.out);
    assert.equal(again.calls.length, 0, "a reused GREEN issued a request");
    assert.match(again.out, /GREEN_ALREADY_SPENT/);
  } finally { W.cleanup(); }
});

test("K3 · THE CAP · A QUOTA EXHAUSTED · A BACKOFF · A SOURCE REFUSAL — each stops the run with no further request and no retry; a refusal is never reported as zero", () => {
  const W = world();
  try {
    const batch = prepare(W, NAMED);
    const one = inputs(W, NAMED, batch, { requests: 1, planId: "fixture-plan-cap" });
    const cap = run(W, NAMED, batch, one, green(one.planSha, { tag: "cap", requests: 1 }), GOOD());
    assert.equal(cap.calls.length, 1, "the cap was exceeded");
    assert.match(cap.out, /stopped by REQUEST_CAP_REACHED/);
    assert.match(cap.out, /STOPPED by REQUEST_CAP_REACHED: not a completed zero/);
    const cases = [
      ["quota", [{ items: [post(1)], quota_remaining: 0 }, { items: [post(1)] }], "QUOTA_EXHAUSTED", 1],
      ["backoff", [{ items: [post(1)], backoff: 5 }, { items: [post(1)] }], "BACKOFF_REQUESTED", 1],
      ["throttle", [{ error_id: 502, error_name: "throttle_violation" }, { items: [post(1)] }], "SOURCE_REFUSED:throttle_violation", 1],
      ["challenge", [{ error_name: "NOT_JSON_BOT_CHALLENGE_OR_PAGE" }, { items: [post(1)] }], "SOURCE_REFUSED:NOT_JSON_BOT_CHALLENGE_OR_PAGE", 1],
    ];
    for (const [tag, responses, code, calls] of cases) {
      const io = inputs(W, NAMED, batch, { planId: `fixture-plan-${tag}` });
      const x = run(W, NAMED, batch, io, green(io.planSha, { tag }), responses);
      assert.equal(x.r.status, 3, x.out);
      assert.equal(x.calls.length, calls, `${tag}: a request followed the refusal`);
      assert.match(x.out, new RegExp(`stopped by ${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `${tag}: the refusal was not named`);
      assert.doesNotMatch(x.out, /ZERO IS THE ANSWER/, `${tag}: a refusal was reported as zero`);
    }
    const thr = stored(W, batch, "collection-runs.jsonl").find((x) => x.value.stoppedBy === "SOURCE_REFUSED:throttle_violation");
    assert.equal(thr.value.observedQuestions, "NOT MEASURED", "a source refusal was recorded as a measured count");
  } finally { W.cleanup(); }
});

test("K4 · AN IRRELEVANT RESULT · A DELETED OR CHANGED POST · A MISSING LICENCE · A DUPLICATE — none admitted, each counted by its rule", () => {
  const W = world();
  try {
    const batch = prepare(W, NAMED), io = inputs(W, NAMED, batch);
    const x = run(W, NAMED, batch, io, green(io.planSha, { tag: "k4" }), [
      { items: [post(1), post(2, { title: "An off-topic fixture question?" }), post(3), post(4), post(5, { content_license: undefined })] },
      { items: [post(1), post(2, { title: "An off-topic fixture question?" }), post(4, { title: "Synthetic fixture question 4, edited?", last_edit_date: E("2026-10-01T08:59:00Z") }), post(5, { content_license: undefined })] },
    ]);
    assert.equal(x.r.status, 0, x.out);
    assert.match(x.out, /observed questions 1\n/);
    for (const code of ["NOT_ABOUT_THE_DECLARED_SUBJECT 1", "POST_DELETED_SINCE_RETRIEVAL 1", "POST_CHANGED_SINCE_RETRIEVAL 1", "CONTENT_LICENSE_ABSENT 1"]) assert.match(x.out, new RegExp(code), `${code} not counted`);
    const io2 = inputs(W, NAMED, batch, { planId: "fixture-plan-dup" });
    const dup = run(W, NAMED, batch, io2, green(io2.planSha, { tag: "dup" }), [{ items: [post(1)] }, { items: [post(1)] }]);
    assert.match(dup.out, /DUPLICATE_INTAKE 1/);
    assert.match(dup.out, /observed questions 0/);
    assert.equal(stored(W, batch, "questions.jsonl").length, 1, "a duplicate was stored again");
  } finally { W.cleanup(); }
});

test("K5 · ZERO IS AN ANSWER — an empty search records zero and the run ends after one request; a lead never becomes a question", () => {
  const W = world();
  try {
    const batch = prepare(W, OTHER), io = inputs(W, OTHER, batch);
    const x = run(W, OTHER, batch, io, green(io.planSha, { tag: "zero" }), [{ items: [] }, { items: [post(9)] }]);
    assert.equal(x.r.status, 0, x.out);
    assert.equal(x.calls.length, 1, "zero was followed by another request");
    assert.match(x.out, /observed questions 0 — ZERO IS THE ANSWER: recorded, and the run ends/);
    assert.equal(stored(W, batch, "collection-runs.jsonl")[0].value.zero, true);
    /* every hit is a lead; a lead whose post is not admitted stays a lead and is never counted as a question */
    const io2 = inputs(W, OTHER, batch, { planId: "fixture-plan-leads" });
    const y = run(W, OTHER, batch, io2, green(io2.planSha, { tag: "leads" }), [{ items: [post(7, { title: "An off-topic fixture question?" })] }, { items: [post(7, { title: "An off-topic fixture question?" })] }]);
    assert.match(y.out, /leads 1 — search hits/);
    assert.match(y.out, /observed questions 0/);
    assert.equal(stored(W, batch, "questions.jsonl").length, 0, "a lead was admitted as an observed question");
    assert.ok(stored(W, batch, "leads.jsonl").every((l) => l.record_type !== RECORD_TYPE));
  } finally { W.cleanup(); }
});

test("K6 · TENANT AND SUBJECT CROSSOVER refused · NO --confirm refused · the test seams HALT outside a verified test run — no request in any case", () => {
  const W = world();
  try {
    const batch = prepare(W, NAMED);
    const io = inputs(W, NAMED, batch, { tenantId: SECOND_FIXTURE_TENANT, planId: "fixture-plan-tenant" });
    const t = run(W, NAMED, batch, io, green(io.planSha, { tag: "tenant" }), GOOD());
    assert.equal(t.calls.length, 0);
    assert.match(t.out, /PLAN_NOT_THIS_TENANTS/, "a plan for another tenant was not refused");
    /* a plan written for ANOTHER subject, placed in this subject's own batch, is refused by the plan's own subject check */
    const other = inputs(W, NAMED, batch, { planId: "fixture-plan-subject" });
    const foreign = { ...other, planText: other.planText.replace(`"subject":"${NAMED}"`, `"subject":"${OTHER}"`) };
    assert.notEqual(foreign.planText, other.planText, "the foreign plan was not built");
    foreign.planSha = planSha256(foreign.planText);
    const fs2 = run(W, NAMED, batch, foreign, green(foreign.planSha, { tag: "subject" }), GOOD());
    assert.equal(fs2.calls.length, 0);
    assert.match(fs2.out, /PLAN_NOT_THIS_SUBJECTS/, "a plan for another subject was not refused");
    const ok = inputs(W, NAMED, batch, { planId: "fixture-plan-noconfirm" });
    const nc = run(W, NAMED, batch, ok, green(ok.planSha, { tag: "nc" }), GOOD(), { confirm: false });
    assert.equal(nc.r.status, 2, nc.out);
    assert.equal(nc.calls.length, 0);
    assert.match(nc.out, /COLLECTION_REQUIRES_CONFIRM/);
    /* outside a verified test run the seam halts — and with no --confirm, so a removed halt could never reach a write */
    const env = { NODE_TEST_CONTEXT: "", NODE_TEST_WORKER_ID: "" };
    const h = run(W, NAMED, batch, ok, green(ok.planSha, { tag: "halt" }), GOOD(), { confirm: false, env });
    assert.equal(h.r.status, 4, h.out);
    assert.match(h.out, /HALTED — ALMIVISIBILITY_TEST_TRANSPORT, ALMIVISIBILITY_TEST_GREEN set outside a verified test run/);
    assert.equal(h.calls.length, 0);
  } finally { W.cleanup(); }
});

function filesUnder(dir) {
  const out = [];
  for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) out.push(...filesUnder(p)); else out.push(p); }
  return out;
}

test("K7 · THE CREDENTIAL — absent → refused before any request; present → its value is in no output, no store and no request the code builds; the code touches it in ONE place", () => {
  const W = world();
  try {
    const batch = prepare(W, NAMED), io = inputs(W, NAMED, batch);
    const absent = run(W, NAMED, batch, io, green(io.planSha, { tag: "nokey" }), GOOD(), { env: { [KEY_NAME]: undefined } });
    assert.equal(absent.calls.length, 0);
    assert.match(absent.out, /CREDENTIAL_ABSENT/);
    const x = run(W, NAMED, batch, io, green(io.planSha, { tag: "key" }), GOOD());
    assert.equal(x.r.status, 0, x.out);
    assert.ok(!x.out.includes(SENTINEL), "the credential's value reached an output");
    assert.ok(x.calls.every((c) => !Object.hasOwn(c.params, "key") && !JSON.stringify(c).includes(SENTINEL)), "the credential reached a request the code built for the transport");
    for (const f of filesUnder(W.root)) assert.ok(!readFileSync(f, "utf8").includes(SENTINEL), "the credential's value reached a stored file");
    const bin = readFileSync(join(REPO, BIN), "utf8");
    /* every line that indexes the environment by the credential's NAME — under either name the code gives it */
    const touches = bin.split("\n").filter((l) => /process\.env\[(?:name|credentialName)\]/.test(l));
    assert.equal(touches.length, 1, "the credential's value is touched in more than one place");
    assert.match(touches[0], /url\.searchParams\.set\("key", process\.env\[name\]\);/);
    assert.doesNotMatch(bin, /process\.env\[[^\]]*\]\s*\.(length|slice|substring|substr|charAt|at)\b|createHash\([^)]*process\.env|console\.\w+\([^)]*process\.env\[name/, "the credential's value is measured, hashed or printed");
    assert.doesNotMatch(readFileSync(join(REPO, "src/research/collection.mjs"), "utf8"), /process\.env/, "the collection module reads the environment");
  } finally { W.cleanup(); }
});

test("K8 · C8 — NO READ-BACK PATH HOLDS A TRANSPORT; the collection code names no product; an agent's record never reads as a person's", () => {
  const read = (f) => (existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null);
  const READBACK = ["src/research/public-questions.mjs", "src/research/public-questions-reader.mjs", "src/research/source-adapter.mjs", "src/research/lead-intake.mjs", "src/research/collection.mjs", "src/research/adapters/stack-exchange.mjs"];
  assert.deepEqual(decisionCallPaths({ entries: READBACK }).faults, [], "a read-back or collection module can call out by itself");
  assert.deepEqual(decisionCallPaths({ entries: [READBACK[0]], read: (f) => (f === READBACK[0] ? `${read(f)}\nawait fetch(u);\n` : read(f)) }).faults.map((x) => x.code), ["RAW_NETWORK_CALL"], "CONTROL: a planted raw call was not seen");
  /* among the F16 entry points, only the collection entry point opens a connector */
  const ENTRIES = ["bin/public-questions.mjs", "bin/source-intake.mjs", "bin/observe-question.mjs", BIN];
  const opens = ENTRIES.filter((f) => /\bopenConnector\(/.test(read(f)));
  assert.deepEqual(opens, [BIN], "a read-back entry point opens a connector, or the collection entry point does not");
  for (const f of ["src/research/collection.mjs", BIN]) assert.deepEqual(scanSource(read(f)).code, [], `${f} names a product`);
  /* an admitted record reads back as SOURCE_ADAPTER_OBSERVED, never a person; a relabel to a person is malformed and counted as nobody */
  const rec = (over) => ({ record_type: RECORD_TYPE, question_id: "x", value: { kind: "OBSERVED", original: "q", source: "s", surface: "s", country: "NOT MEASURED", language: "en", timeWindow: { from: "a", to: "a" }, method: "m", limits: "l",
    provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it", ...over } } });
  const ok = intakeQuestions([rec({})]);
  assert.deepEqual([ok.observerSplit.SOURCE_ADAPTER_OBSERVED, ok.observerSplit.PERSON_OBSERVED], [1, 0]);
  const relabelled = intakeQuestions([rec({ observerType: "PERSON_OBSERVED" })]);
  assert.equal(relabelled.observerSplit.PERSON_OBSERVED, 0, "an agent's record surfaced as a person's");
});

test("K9 · THE SOURCE DECISION is VALID only when CURRENT with a declared issuer — the real register's owner decision passes; an issuer-less or absent one refuses", () => {
  const base = { subjectDeclared: true, connectorDeclared: true, plan: null, planCheck: [], records: AUTHORITY_CORPUS, sourceDecision: SOURCE_DECISION, decl: DECLARATION, credentialPresent: true, green: [], relevanceSha: null, now: TODAY };
  assert.deepEqual(preflight(base).refusals, [], "CONTROL: the owner's real source decision does not read VALID");
  const stripped = AUTHORITY_CORPUS.map((r) => (r.propositionId === SOURCE_DECISION.propositionId ? { ...r, issuer: { class: null, declaredBy: "NOT DECLARED" } } : r));
  assert.ok(preflight({ ...base, records: stripped }).refusals.includes("SOURCE_DECISION_NOT_VALID"), "an issuer-less source decision passed");
  assert.ok(preflight({ ...base, sourceDecision: { propositionId: "RR-120_STACK_EXCHANGE_DECISION", scope: ["ALMIVISIBILITY"] } }).refusals.includes("SOURCE_DECISION_NOT_VALID"), "the INVALID earlier record passed");
  assert.ok(preflight({ ...base, decl: { ...DECLARATION, terms: { ...DECLARATION.terms, storage: { status: "NOT_VERIFIED_BY_US" } } } }).refusals.includes("SOURCE_TERMS:STORAGE_TERM_NOT_VERIFIED"), "unverified terms passed");
  assert.deepEqual(planRefusals({}, { subject: "s", tenantId: "t", batch: "b" }).length > 0, true);
  assert.deepEqual(declaredGreens("OWNER GREEN v1\nplan: " + "a".repeat(64) + "\nrequests: 2\nEND OWNER GREEN"), [{ plan: "a".repeat(64), requests: 2 }]);
  assert.deepEqual(declaredGreens("OWNER GREEN v1\nplan: " + "a".repeat(64) + "\nrequests: 2\n"), [], "an unclosed GREEN was read");
});

test("REAL · the real data root: collection runs and collected questions per declared subject — count-only; fixtures never counted; F16 stays IN-PROGRESS", () => {
  const roots = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8")).subjects;
  const out = roots.map((s) => {
    const batches = s.members.filter((m) => m.resourceKind === "RESEARCH_BATCH").map((m) => m.resourceRef);
    const rows = batches.flatMap((b) => ["collection-runs.jsonl", "questions.jsonl"].flatMap((f) => { const p = join(DATA_ROOT, "research", b, f); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; }));
    return { subject: s.subjectId.length, runs: rows.filter((r) => r.record_type === COLLECTION_RUN).length, collected: rows.filter((r) => r.record_type === RECORD_TYPE && r.value?.plan_id).length, fixture: rows.filter((r) => /fixture/i.test(JSON.stringify(r.value?.plan_id ?? ""))).length };
  });
  console.log(`REAL · ${out.length} declared subject(s) · ${JSON.stringify(out)}`);
  assert.equal(out.reduce((a, x) => a + x.fixture, 0), 0, "a fixture run entered the real population");
  assert.equal(buildBoard(CAPABILITIES, DECLARED).find((r) => r.featureId === "F16").state, "IN-PROGRESS");
});

test("the production trail is untouched by every proof above", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(trailSha(), TRAIL_BEFORE);
});
