/**
 * 🔴 RR-156 · LAMZISH'S SCOPE, THE WITHDRAWN PLAN AND THE HARD STOP — real gates, a FAKE transport, zero external calls.
 *
 * Driven through bin/collect-public-questions.mjs in a CONFINED copy of the data root, under the subject's REAL declared tenant, with its
 * REAL declared descriptor, batch, plan and relevance profile (copied, never written back).
 *
 *   L1 the owner's declaration on record: the eight SERVICES are the declared dimensions; origin country is audience context, not a dimension
 *   L2 the WITHDRAWN plan never runs — under a fresh, otherwise valid GREEN naming it; CONTROL: a live plan in the same batch runs
 *   L3 a GREEN naming one plan never admits a different plan
 *   L4 under the subject's REAL relevance profile, a do-it-yourself or repair question is never admitted; a question about a declared
 *      service in Pakistan is
 *   L5 two clients' batches never mix: each batch holds only its own subject's records; a run naming the other's batch is refused
 *   L6 the hard stop at TWO: a plan for three is refused before any request, and the collector's cap never exceeds two
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { declaredWorld, inputPathRef, DATA_ROOT } from "./helpers/declared-world.mjs";
import { contentHashOf } from "../src/authority/corpus.mjs";
import { planSha256, runCollection, COLLECTION_REQUEST_CEILING } from "../src/research/collection.mjs";
import { WITHDRAWN_PLANS } from "../config/research/withdrawn-plans.mjs";
import { API_ORIGIN } from "../src/research/adapters/stack-exchange.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-rr156-${process.pid}`);
const BIN = "bin/collect-public-questions.mjs";
const SUBJECT = "lamzish";
const SENTINEL = "sentinel-credential-value-4e9b";
const TODAY = new Date().toISOString().slice(0, 10);
const E = (iso) => Date.parse(iso) / 1000;
const sha = (s) => createHash("sha256").update(s).digest("hex");

/* the REAL declarations, read from the data root */
const ROOTS = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8"));
const ENTRY = ROOTS.subjects.find((s) => s.subjectId === SUBJECT);
const ATT = JSON.parse(readFileSync(join(DATA_ROOT, "tenancy", "attachments.json"), "utf8")).attachments;
const ORIGIN = ENTRY.members.find((m) => m.resourceKind === "SITE_ORIGIN").resourceRef;
const TENANT = ATT.find((a) => a.resourceKind === "SITE_ORIGIN" && a.resourceRef === ORIGIN).tenantId;
const OLD_BATCH = ENTRY.members.find((m) => m.resourceKind === "RESEARCH_BATCH").resourceRef;
const KEY_NAME = ENTRY.connectors.find((c) => c.kind === "QUESTION_SOURCE_API").credential.name;
const PROFILE_TEXT = readFileSync(join(DATA_ROOT, SUBJECT, "relevance-profile.json"), "utf8");
const DEAD = WITHDRAWN_PLANS[0].planSha256;

let n = 0;
const file = (name, content) => { mkdirSync(TMP, { recursive: true }); const p = join(TMP, `${++n}-${name}`); writeFileSync(p, typeof content === "string" ? content : JSON.stringify(content)); return p; };
const post = (id, title, over = {}) => ({ question_id: id, title, link: `https://fixture-qa.invalid/q/${id}`, creation_date: E("2022-03-01T10:00:00Z"), owner: { display_name: `fixture-user-${id}` }, content_license: "CC BY-SA 4.0", ...over });

/** The confined world, with the subject's REAL tenant declared and its own resources attached to it. */
function world() {
  const W = declaredWorld();
  const tf = join(W.root, "tenancy", "tenants.json");
  const t = JSON.parse(readFileSync(tf, "utf8"));
  t.tenants.push({ schemaVersion: 1, tenantId: TENANT, status: "ACTIVE", declaredOn: TODAY, declarationBasis: "F02_DECLARED_FIXTURE_WORLD_NOT_THE_REAL_POPULATION", label: "the subject's real tenant, in a confined copy" });
  writeFileSync(tf, JSON.stringify(t, null, 2));
  /* every member the subject declares (RR-157 added a second batch), and the source it reaches, to its own tenant */
  /* RR-243 (F78 Amendment 1, C9): the run writes its cost into its tenant's own declared ledger, so the tenant holds one here too */
  for (const [k, r] of [...ENTRY.members.map((m) => [m.resourceKind, m.resourceRef]), ["SITE_ORIGIN", API_ORIGIN], ["COST_LEDGER", `cost-ledger/${TENANT}`]]) attach(W, k, r, TENANT);
  return W;
}
function attach(W, kind, ref, tenant) {
  const af = join(W.root, "tenancy", "attachments.json");
  const a = JSON.parse(readFileSync(af, "utf8"));
  const hit = a.attachments.find((x) => x.resourceKind === kind && x.resourceRef === ref);
  if (hit) hit.tenantId = tenant; else a.attachments.push({ ...a.attachments[0], resourceKind: kind, resourceRef: ref, tenantId: tenant });
  writeFileSync(af, JSON.stringify(a, null, 2));
}
function green(planSha, { requests = 2, tag }) {
  const text = `fixture GREEN record\n\nOWNER GREEN v1\nplan: ${planSha}\nrequests: ${requests}\nEND OWNER GREEN\n`;
  const path = `AlmiVisibility_OWNER_DECISION_${TODAY}_FIXTURE_GREEN_${tag}.md`;
  const record = { authorityId: `_handoffs:${path}`, propositionId: `OWNER_DECISION_FIXTURE_GREEN_${tag}`, scope: ["ALMIVISIBILITY"], issuer: { class: "OWNER", declaredBy: "fixture" },
    issuedAt: TODAY, issuedAtSource: "FILE_NAME", effectiveFrom: TODAY, sourceRef: { kind: "GOVERNANCE_RECORD", repo: "_handoffs", path, commit: "0".repeat(40), blob: "0".repeat(40) },
    status: "CURRENT", supersedes: [], supersededBy: [], contentHash: contentHashOf(text), recordedAt: `${TODAY}T00:00:00Z`, inclusionRule: "fixture" };
  return { id: record.authorityId, path: file("green.json", { record, text }) };
}
/** A LIVE plan for the subject in its batch, naming the profile written beside it. */
function livePlan(W, { requests = 2, planId = "fixture-live-plan", profile = PROFILE_TEXT } = {}) {
  const dir = join(W.root, "research", OLD_BATCH);
  writeFileSync(join(dir, "relevance-profile.json"), profile);
  const text = JSON.stringify({ schemaVersion: 1, kind: "PUBLIC_QUESTION_COLLECTION_PLAN", planId, subject: SUBJECT, tenantId: TENANT, researchBatch: OLD_BATCH, adapter: "stack-exchange",
    site: "fixture-site", query: { q: "fixture" }, language: "en", pagesize: 10, requests, relevanceProfileSha256: sha(profile), keeps: ["title as written", "link", "dates", "author name", "licence"],
    retention: "fixture", declaredOn: TODAY });
  writeFileSync(join(dir, "collection-plan.json"), text);
  return planSha256(text);
}
function run(W, g, responses, { batch = OLD_BATCH, env = {} } = {}) {
  const calls = file("calls.jsonl", "");
  if (g) attach(W, "INPUT_PATH", inputPathRef(g.path), TENANT);
  const fullEnv = { ...W.envWith(), [KEY_NAME]: SENTINEL, ALMIVISIBILITY_TEST_TRANSPORT: join(REPO, "test", "fixtures", "fake-question-source-transport.mjs"), ...(g ? { ALMIVISIBILITY_TEST_GREEN: g.path } : {}), FAKE_QS_SCENARIO: file("scenario.json", { responses }), FAKE_QS_CALLS: calls, ...env };
  const r = spawnSync(process.execPath, [BIN, `--subject=${SUBJECT}`, `--research-batch=${batch}`, ...(g ? [`--green=${g.id}`] : []), `--tenant=${TENANT}`, "--actor=actor:cc", "--confirm"], { cwd: REPO, encoding: "utf8", env: fullEnv });
  return { r, out: r.stdout + r.stderr, calls: readFileSync(calls, "utf8").split("\n").filter(Boolean) };
}
const stored = (W, batch, f) => { const p = join(W.root, "research", batch, f); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
const TWO = (a, b) => [{ items: [a, b] }, { items: [a, b] }];

test("L1 · THE OWNER'S DECLARATION ON RECORD: the eight SERVICES are the declared dimensions, word for word; origin country is AUDIENCE CONTEXT, not a dimension", () => {
  const d = JSON.parse(readFileSync(join(DATA_ROOT, SUBJECT, "descriptor.json"), "utf8"));
  assert.deepEqual(d.productDimensions.services, ["house", "mall", "flat", "building", "interior", "exterior", "architecture", "construction"], "a service was invented, renamed, mapped or lost");
  assert.equal(d.productDimensions.dimension, "service type");
  assert.match(d.productDimensions.originCountry, /^AUDIENCE CONTEXT — not a dimension/);
  assert.ok(!Object.keys(d.productDimensions).some((k) => /countr/i.test(k) && k !== "originCountry"), "a country dimension was declared");
  assert.equal(d.ownerValues.examProduct, false);
});

test("L2 · THE WITHDRAWN PLAN NEVER RUNS — the real withdrawn plan under a fresh GREEN naming it is refused before any request; CONTROL: a live plan in the same batch runs", () => {
  const W = world();
  try {
    const dir = join(W.root, "research", OLD_BATCH);
    assert.equal(planSha256(readFileSync(join(dir, "collection-plan.json"), "utf8")), DEAD, "the batch no longer holds the withdrawn plan — the proof would be vacuous");
    const dead = run(W, green(DEAD, { tag: "dead" }), TWO(post(1, "Building a house in Pakistan?"), post(2, "Architecture firm in Pakistan?")));
    assert.equal(dead.r.status, 3, dead.out);
    assert.equal(dead.calls.length, 0, "the withdrawn plan issued a request");
    assert.match(dead.out, /REFUSED before any request: PLAN_WITHDRAWN — no request was issued/, "the withdrawn plan was refused for a reason other than its withdrawal alone");
    const live = livePlan(W);
    const ok = run(W, green(live, { tag: "live" }), TWO(post(1, "Building a house in Pakistan?"), post(2, "Architecture firm in Pakistan?")));
    assert.equal(ok.r.status, 0, ok.out);
    assert.equal(ok.calls.length, 2, "CONTROL: a live plan in the same world could not run");
  } finally { W.cleanup(); }
});

test("L3 · A GREEN NAMING ONE PLAN NEVER ADMITS A DIFFERENT PLAN — the withdrawn plan's GREEN, presented for a live plan, is refused", () => {
  const W = world();
  try {
    livePlan(W, { planId: "fixture-other-plan" });
    const x = run(W, green(DEAD, { tag: "wrong" }), TWO(post(1, "Building a house in Pakistan?"), post(2, "x")));
    assert.equal(x.calls.length, 0);
    assert.match(x.out, /GREEN_NAMES_ANOTHER_PLAN/);
  } finally { W.cleanup(); }
});

/* RESTATED 4 Oct 2026 (RR-157 §1), for a MEASURED reason: the owner corrected RR-156 — the eight service words were EXAMPLES, never a
 * matching rule, and the literal "Pakistan AND a label" profile is removed. The subject's REAL profile is now his MEANING TEST (data
 * lamzish/relevance-profile.json), judged on the original post by a named judge (test/rr157-meaning.test.mjs). What RR-156 proved still
 * holds and is proved here: under the real profile a do-it-yourself or repair question is NEVER admitted — and now nothing is admitted by the
 * collection run at all: every item that passes the boundary is HELD for judgement. */
test("L4 · UNDER THE SUBJECT'S REAL PROFILE (the owner's meaning test), a do-it-yourself or repair question is never admitted — every surviving item is HELD for a judgement, none admitted by the run", () => {
  const W = world();
  try {
    assert.equal(JSON.parse(PROFILE_TEXT).mode, "MEANING_JUDGEMENT", "the subject's real profile is not the owner's meaning test");
    const live = livePlan(W, { planId: "fixture-relevance-plan" });
    const good = post(1, "Hiring an architect to build a house in Pakistan from abroad?");
    const diy = post(2, "How do I repair a leaking concrete roof myself?");
    const diyPk = post(3, "DIY repair of the exterior of my house in Pakistan?");
    const x = run(W, green(live, { tag: "rel" }), [{ items: [good, diy, diyPk] }, { items: [good, diy, diyPk] }]);
    assert.equal(x.r.status, 0, x.out);
    assert.match(x.out, /observed questions 0/);
    assert.match(x.out, /held for meaning judgement 3/);
    assert.deepEqual(stored(W, OLD_BATCH, "questions.jsonl"), [], "the collection run admitted a question without a judgement");
    assert.equal(stored(W, OLD_BATCH, "held-for-judgement.jsonl").length, 3);
  } finally { W.cleanup(); }
});

test("L5 · TWO CLIENTS' BATCHES NEVER MIX — each batch holds only its own subject's records, and a run naming the other client's batch is refused", () => {
  const W = world();
  try {
    /* the other client: a fixture subject under the fixture tenant, its own batch */
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    const other = { subjectId: "fixture-other-client", path: "fixture-other-client", members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: "fixture-other-batch" }], connectors: [] };
    reg.subjects.push(other);
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
    attach(W, "RESEARCH_BATCH", "fixture-other-batch", W.tenantId);
    mkdirSync(join(W.root, "research", "fixture-other-batch"), { recursive: true });
    mkdirSync(join(W.root, "fixture-other-client"), { recursive: true });
    const foreign = { record_type: "public_question", question_id: "f1", value: { subject: other.subjectId } };
    writeFileSync(join(W.root, "research", "fixture-other-batch", "questions.jsonl"), JSON.stringify(foreign) + "\n");
    const live = livePlan(W, { planId: "fixture-mix-plan" });
    const x = run(W, green(live, { tag: "mix" }), TWO(post(1, "Building a house in Pakistan?"), post(2, "Interior design for a flat in Pakistan?")));
    assert.equal(x.r.status, 0, x.out);
    for (const f of ["questions.jsonl", "leads.jsonl", "collection-runs.jsonl"]) {
      const rows = stored(W, OLD_BATCH, f);
      assert.ok(rows.every((r) => (r.value?.subject ?? r.subject ?? SUBJECT) === SUBJECT), `${f}: another client's record is in this batch`);
    }
    assert.deepEqual(stored(W, "fixture-other-batch", "questions.jsonl"), [foreign], "the other client's batch was written by this client's run");
    /* the sharpest crossover: a plan of THIS subject and tenant, written into the OTHER client's batch — so only the isolation guards stand
     * between them (the tenant scope gate, the subject's batch membership, and the plan's tenant through the one decision) */
    const otherDir = join(W.root, "research", "fixture-other-batch");
    writeFileSync(join(otherDir, "relevance-profile.json"), PROFILE_TEXT);
    const crossText = JSON.stringify({ ...JSON.parse(readFileSync(join(W.root, "research", OLD_BATCH, "collection-plan.json"), "utf8")), planId: "fixture-cross-plan", researchBatch: "fixture-other-batch" });
    writeFileSync(join(otherDir, "collection-plan.json"), crossText);
    const cross = run(W, green(planSha256(crossText), { tag: "cross" }), TWO(post(1, "Building a house in Pakistan?"), post(2, "Interior of a flat in Pakistan?")), { batch: "fixture-other-batch" });
    assert.equal(cross.r.status, 3, cross.out);
    assert.equal(cross.calls.length, 0, "a run reached the other client's batch");
  } finally { W.cleanup(); }
});

test("L6 · THE HARD STOP AT TWO — a plan for three requests is refused before any request; the collector's cap never exceeds two", async () => {
  assert.equal(COLLECTION_REQUEST_CEILING, 2);
  const W = world();
  try {
    const three = livePlan(W, { requests: 3, planId: "fixture-three-plan" });
    const x = run(W, green(three, { tag: "three", requests: 3 }), [{ items: [post(1, "a")] }, { items: [post(1, "a")] }, { items: [] }]);
    assert.equal(x.calls.length, 0, "a plan for three issued a request");
    assert.match(x.out, /PLAN_EXCEEDS_REQUEST_CEILING/);
  } finally { W.cleanup(); }
  /* the cap the collector receives, for a plan that somehow asks for more */
  let cap = null;
  await runCollection({ collect: async (o) => { cap = o.cap; return {}; }, transport: null, clock: () => 0, plan: { requests: 7, site: "s", query: { q: "q" }, language: "en", pagesize: 1 } });
  assert.equal(cap, 2, "the collector was handed a cap above two");
});

test("the production trail is untouched by every proof above", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(trailSha(), TRAIL_BEFORE);
});
