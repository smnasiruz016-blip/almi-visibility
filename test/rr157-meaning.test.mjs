/**
 * 🔴 RR-157 · F16 C15–C16 · MEANING, NOT LABELS — judged on the ORIGINAL POST, with a quoted reason (Acceptance Amendment 2, _handoffs 2a842c1).
 *
 * The subject's REAL plan, batch and profile (the owner's meaning test) run through the REAL gates in a CONFINED copy of the data root,
 * under the subject's real tenant, with a FAKE transport — zero external requests. Then fixture judgements go through the production
 * judging entry point (bin/judge-public-questions.mjs).
 *
 *   M1 the real step-one plan passes every gate but the GREEN; under the meaning test the run HOLDS every surviving item — admits none —
 *      keeps the original post's own text and NO reply
 *   M2 judged: a plainly relevant post judged CANDIDATE is ADMITTED · an unrelated post judged NOT_A_CANDIDATE is REJECTED · a borderline post
 *      judged UNKNOWN is HELD — each judgement recorded with its quote; residence recorded only with its own verified quote
 *   M3 refused, writing nothing: a judgement on a snippet or a title alone · with no quote · with a quote not in the post · residence
 *      without a quote from the post · no declared judge · a second judgement that does not name the one it overturns
 *   M4 overturn: a person's later judgement, naming the one it overturns, decides; an agent's judgement never reads as a person's
 *   M5 the pure guards, each with a control that applies
 *   M6 the example words are never a gate: a post with none of them is admitted on its meaning; a post with all of them is rejected on its
 *      meaning
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { declaredWorld, inputPathRef, DATA_ROOT } from "./helpers/declared-world.mjs";
import { contentHashOf } from "../src/authority/corpus.mjs";
import { planSha256 } from "../src/research/collection.mjs";
import { decide, quotedFrom, HELD_RECORD } from "../src/research/meaning-judgement.mjs";
import { API_ORIGIN } from "../src/research/adapters/stack-exchange.mjs";
import { NOT_MEASURED } from "../src/research/public-questions.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-rr157-${process.pid}`);
const SUBJECT = "lamzish";
const SENTINEL = "sentinel-credential-value-a17f";
const TODAY = new Date().toISOString().slice(0, 10);
const NOW_ISO = `${TODAY}T01:00:00Z`;
const E = (iso) => Date.parse(iso) / 1000;

const ROOTS = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8"));
const ENTRY = ROOTS.subjects.find((s) => s.subjectId === SUBJECT);
const ATT = JSON.parse(readFileSync(join(DATA_ROOT, "tenancy", "attachments.json"), "utf8")).attachments;
const ORIGIN = ENTRY.members.find((m) => m.resourceKind === "SITE_ORIGIN").resourceRef;
const TENANT = ATT.find((a) => a.resourceKind === "SITE_ORIGIN" && a.resourceRef === ORIGIN).tenantId;
const KEY_NAME = ENTRY.connectors.find((c) => c.kind === "QUESTION_SOURCE_API").credential.name;
/* the batch whose REAL plan names the owner's meaning test */
const BATCH = ENTRY.members.filter((m) => m.resourceKind === "RESEARCH_BATCH").map((m) => m.resourceRef)
  .find((b) => existsSync(join(DATA_ROOT, "research", b, "relevance-profile.json")) && JSON.parse(readFileSync(join(DATA_ROOT, "research", b, "relevance-profile.json"), "utf8")).mode === "MEANING_JUDGEMENT");
const PLAN_SHA = BATCH ? planSha256(readFileSync(join(DATA_ROOT, "research", BATCH, "collection-plan.json"), "utf8")) : null;

let n = 0;
const file = (name, content) => { mkdirSync(TMP, { recursive: true }); const p = join(TMP, `${++n}-${name}`); writeFileSync(p, typeof content === "string" ? content : JSON.stringify(content)); return p; };
function attach(W, kind, ref, tenant) {
  const af = join(W.root, "tenancy", "attachments.json");
  const a = JSON.parse(readFileSync(af, "utf8"));
  const hit = a.attachments.find((x) => x.resourceKind === kind && x.resourceRef === ref);
  if (hit) hit.tenantId = tenant; else a.attachments.push({ ...a.attachments[0], resourceKind: kind, resourceRef: ref, tenantId: tenant });
  writeFileSync(af, JSON.stringify(a, null, 2));
}
function world() {
  const W = declaredWorld();
  const tf = join(W.root, "tenancy", "tenants.json");
  const t = JSON.parse(readFileSync(tf, "utf8"));
  t.tenants.push({ schemaVersion: 1, tenantId: TENANT, status: "ACTIVE", declaredOn: TODAY, declarationBasis: "F02_DECLARED_FIXTURE_WORLD_NOT_THE_REAL_POPULATION", label: "the subject's real tenant, in a confined copy" });
  writeFileSync(tf, JSON.stringify(t, null, 2));
  for (const [k, r] of [...ENTRY.members.map((m) => [m.resourceKind, m.resourceRef]), ["SITE_ORIGIN", API_ORIGIN]]) attach(W, k, r, TENANT);
  return W;
}
function green(planSha, tag) {
  const text = `fixture GREEN record\n\nOWNER GREEN v1\nplan: ${planSha}\nrequests: 2\nEND OWNER GREEN\n`;
  const path = `AlmiVisibility_OWNER_DECISION_${TODAY}_FIXTURE_GREEN_${tag}.md`;
  const record = { authorityId: `_handoffs:${path}`, propositionId: `OWNER_DECISION_FIXTURE_GREEN_${tag}`, scope: ["ALMIVISIBILITY"], issuer: { class: "OWNER", declaredBy: "fixture" },
    issuedAt: TODAY, issuedAtSource: "FILE_NAME", effectiveFrom: TODAY, sourceRef: { kind: "GOVERNANCE_RECORD", repo: "_handoffs", path, commit: "0".repeat(40), blob: "0".repeat(40) },
    status: "CURRENT", supersedes: [], supersededBy: [], contentHash: contentHashOf(text), recordedAt: `${TODAY}T00:00:00Z`, inclusionRule: "fixture" };
  return { id: record.authorityId, path: file("green.json", { record, text }) };
}
const post = (id, title, body, over = {}) => ({ question_id: id, title, link: `https://fixture-qa.invalid/q/${id}`, creation_date: E("2022-03-01T10:00:00Z"), owner: { display_name: `fixture-user-${id}` }, content_license: "CC BY-SA 4.0", body, ...over });
/* fixture posts — written for this test, never anyone's real words */
const RELEVANT = post(1, "Building back home while I work in the Gulf", "<p>I am from Lahore and I live in Dubai now. I want to hire an architect to design and build our family home in Lahore. How can I supervise the work from abroad?</p>");
const UNRELATED = post(2, "Opening a bank account after moving", "<p>I moved for work and need to open a bank account here. Which documents do banks usually ask for?</p>");
const BORDERLINE = post(3, "Thinking of moving back", "<p>We may move back next year. Maybe we buy something, maybe we build, we have not decided anything.</p>");
const LABELS = post(4, "House flat mall building interior exterior architecture construction words", "<p>A quiz about English vocabulary: is a house, a flat or a mall a building? Which word means interior, exterior, architecture or construction?</p>");
const NOLABELS = post(5, "Getting my parents' place in Multan done while I am in Toronto", "<p>My parents' plot in Multan, Pakistan is empty. I want someone to draw the plans and put up a home for them while I stay in Toronto. Who do people use for this?</p>");
const REPLY = "REPLY TEXT — a forum member's answer, never stored";
const withReply = (p) => ({ ...p, answers: [{ body: REPLY }] });
const RESPONSES = () => [{ items: [RELEVANT, UNRELATED, BORDERLINE, LABELS, NOLABELS] }, { items: [withReply(RELEVANT), UNRELATED, BORDERLINE, LABELS, NOLABELS] }];

function collectRun(W) {
  const g = green(PLAN_SHA, `m${++n}`);
  attach(W, "INPUT_PATH", inputPathRef(g.path), TENANT);
  const calls = file("calls.jsonl", "");
  const env = { ...W.envWith(), [KEY_NAME]: SENTINEL, ALMIVISIBILITY_TEST_TRANSPORT: join(REPO, "test", "fixtures", "fake-question-source-transport.mjs"), ALMIVISIBILITY_TEST_GREEN: g.path, FAKE_QS_SCENARIO: file("scenario.json", { responses: RESPONSES() }), FAKE_QS_CALLS: calls };
  const r = spawnSync(process.execPath, ["bin/collect-public-questions.mjs", `--subject=${SUBJECT}`, `--research-batch=${BATCH}`, `--green=${g.id}`, `--tenant=${TENANT}`, "--actor=actor:cc", "--confirm"], { cwd: REPO, encoding: "utf8", env });
  return { r, out: r.stdout + r.stderr, calls: readFileSync(calls, "utf8").split("\n").filter(Boolean) };
}
function judgeRun(W, drafts) {
  writeFileSync(join(W.root, "research", BATCH, "judgement-drafts.json"), JSON.stringify(drafts));
  const r = spawnSync(process.execPath, ["bin/judge-public-questions.mjs", `--subject=${SUBJECT}`, `--research-batch=${BATCH}`, `--tenant=${TENANT}`, "--actor=actor:cc", "--confirm"], { cwd: REPO, encoding: "utf8", env: W.envWith() });
  return { r, out: r.stdout + r.stderr };
}
const stored = (W, f) => { const p = join(W.root, "research", BATCH, f); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
const heldIdOf = (W, link) => stored(W, "held-for-judgement.jsonl").find((h) => h.value.reference === link)?.held_id;
const AGENT = { observerType: "AGENT_OBSERVED", actorRef: "actor:cc" };
const PERSON = { observerType: "PERSON_OBSERVED", actorRef: "the owner" };
const draft = (heldId, verdict, quote, over = {}) => ({ heldId, subject: SUBJECT, basis: "ORIGINAL_POST", verdict, quote, judge: AGENT, judgedAt: NOW_ISO, ...over });
function filesUnder(dir) { const out = []; for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) out.push(...filesUnder(p)); else out.push(p); } return out; }

test("M1 · THE REAL STEP-ONE PLAN passes every gate but the GREEN; under the owner's meaning test the run HOLDS every surviving item, admits none, keeps the original post's own text — and no reply", () => {
  assert.ok(BATCH, "no batch of the subject carries the owner's meaning test — the proof would be vacuous");
  const W = world();
  try {
    const x = collectRun(W);
    assert.equal(x.r.status, 0, x.out);
    assert.equal(x.calls.length, 2, "not exactly one search and one recheck");
    assert.match(x.out, /observed questions 0/);
    assert.match(x.out, /held for meaning judgement 5/);
    assert.deepEqual(stored(W, "questions.jsonl"), [], "the run admitted a question with no judgement");
    const held = stored(W, "held-for-judgement.jsonl");
    assert.equal(held.length, 5);
    assert.ok(held.every((h) => h.record_type === HELD_RECORD && h.value.kind === "HELD"));
    assert.match(held.find((h) => h.value.reference === RELEVANT.link).value.originalPost, /hire an architect to design and build our family home in Lahore/, "the original post's own text was not kept for the judge");
    for (const f of filesUnder(W.root)) assert.ok(!readFileSync(f, "utf8").includes(REPLY), "a reply was stored — a question source never answers");
    assert.equal(stored(W, "leads.jsonl").length, 5, "the hits were not kept as leads");
  } finally { W.cleanup(); }
});

test("M2 · JUDGED ON THE ORIGINAL POST: relevant → ADMITTED · unrelated → REJECTED · borderline → HELD — each recorded with its quote; residence only with its own quote", () => {
  const W = world();
  try {
    assert.equal(collectRun(W).r.status, 0);
    const x = judgeRun(W, [
      draft(heldIdOf(W, RELEVANT.link), "CANDIDATE", "I want to hire an architect to design and build our family home in Lahore", { authorResidence: "lives abroad (Dubai)", residenceQuote: "I live in Dubai now" }),
      draft(heldIdOf(W, UNRELATED.link), "NOT_A_CANDIDATE", "need to open a bank account here"),
      draft(heldIdOf(W, BORDERLINE.link), "UNKNOWN", "Maybe we buy something, maybe we build, we have not decided anything"),
    ]);
    assert.equal(x.r.status, 0, x.out);
    assert.match(x.out, /recorded 3 \(admitted 1 · rejected 1 · held as UNKNOWN 1\) · refused 0/);
    const qs = stored(W, "questions.jsonl");
    assert.deepEqual(qs.map((q) => q.value?.reference), [RELEVANT.link], "an unrelated or borderline post was admitted, or the relevant one rejected");
    assert.equal(qs[0].value.meaning.quote, "I want to hire an architect to design and build our family home in Lahore");
    assert.ok(quotedFrom(qs[0].value.meaning.quote, stored(W, "held-for-judgement.jsonl").find((h) => h.held_id === qs[0].question_id).value.originalPost), "the admitted question's reason is not the post's own words");
    assert.deepEqual(qs[0].value.author.authorResidence, { value: "lives abroad (Dubai)", quote: "I live in Dubai now" });
    assert.equal(qs[0].value.provenance.observerType, "SOURCE_ADAPTER_OBSERVED", "the judge was recorded as the question's observer");
    assert.equal(qs[0].value.meaning.judge.observerType, "AGENT_OBSERVED");
    const js = stored(W, "meaning-judgements.jsonl");
    assert.deepEqual(js.map((j) => j.value.outcome).sort(), ["ADMITTED", "HELD", "REJECTED"]);
    assert.ok(js.every((j) => typeof j.value.quote === "string" && j.value.quote.length > 0 && j.value.basis === "ORIGINAL_POST"), "a judgement was recorded without its quoted reason");
    assert.ok(js.filter((j) => j.value.outcome !== "ADMITTED").every((j) => j.value.authorResidence === NOT_MEASURED), "a residence was recorded that the post does not establish");
    assert.match(x.out, /AGENT_OBSERVED 3 — an agent's judgement is never a person's/);
  } finally { W.cleanup(); }
});

test("M3 · REFUSED AND NOTHING WRITTEN: a snippet or title basis · no quote · a quote not in the post · residence without the post's words · no judge · a second judgement that names nothing", () => {
  const W = world();
  try {
    assert.equal(collectRun(W).r.status, 0);
    const R = heldIdOf(W, RELEVANT.link), U = heldIdOf(W, UNRELATED.link);
    const x = judgeRun(W, [
      draft(R, "CANDIDATE", "hire an architect", { basis: "SNIPPET" }),
      draft(R, "CANDIDATE", "hire an architect", { basis: "TITLE_ONLY" }),
      draft(R, "CANDIDATE", ""),
      draft(R, "CANDIDATE", "build a home in Pakistan for my family"),
      draft(R, "CANDIDATE", "hire an architect", { authorResidence: "lives in Pakistan" }),
      draft(R, "CANDIDATE", "hire an architect", { judge: { observerType: "SOURCE_ADAPTER_OBSERVED", actorRef: "x" } }),
      draft(U, "NOT_A_CANDIDATE", "open a bank account"),
      draft(U, "CANDIDATE", "open a bank account"),
    ]);
    assert.equal(x.r.status, 0, x.out);
    for (const code of ["JUDGEMENT_NOT_ON_THE_ORIGINAL_POST 2", "REASON_NOT_QUOTED 1", "REASON_NOT_QUOTED_FROM_THE_ORIGINAL_POST 1", "RESIDENCE_NOT_ESTABLISHED_BY_THE_POST 1", "JUDGE_UNDECLARED 1", "ALREADY_JUDGED_NAME_THE_JUDGEMENT_YOU_OVERTURN 1"]) assert.match(x.out, new RegExp(code), `${code} not refused`);
    assert.deepEqual(stored(W, "questions.jsonl"), [], "a refused judgement admitted a question");
    assert.equal(stored(W, "meaning-judgements.jsonl").length, 1, "a refused judgement was recorded");
  } finally { W.cleanup(); }
});

test("M4 · OVERTURN: a person's later judgement that NAMES the one it overturns decides — the borderline post, held by an agent, is admitted on the person's quoted reading", () => {
  const W = world();
  try {
    assert.equal(collectRun(W).r.status, 0);
    const B = heldIdOf(W, BORDERLINE.link);
    judgeRun(W, [draft(B, "UNKNOWN", "maybe we build")]);
    const first = stored(W, "meaning-judgements.jsonl")[0];
    assert.ok(first?.judgement_id, "the first judgement was not recorded");
    const x = judgeRun(W, [draft(B, "CANDIDATE", "maybe we build", { judge: PERSON, overturns: first.judgement_id, judgedAt: `${TODAY}T02:00:00Z` })]);
    assert.match(x.out, /admitted 1/);
    const q = stored(W, "questions.jsonl")[0];
    assert.equal(q?.value?.meaning?.judge?.observerType, "PERSON_OBSERVED", "the person's overturn did not decide");
    assert.equal(stored(W, "meaning-judgements.jsonl")[1].value.overturns, first.judgement_id);
  } finally { W.cleanup(); }
});

const HELD = { record_type: HELD_RECORD, held_id: "h1", recorded_at: NOW_ISO, value: { subject: SUBJECT, originalPost: "I want to build a home in Lahore while I live in Oslo.", meaningTest: "t", reference: "r" } };
test("M5 · THE PURE GUARDS, each with a control that applies", () => {
  const ok = { heldId: "h1", subject: SUBJECT, basis: "ORIGINAL_POST", verdict: "CANDIDATE", quote: "build a home in Lahore", judge: AGENT, judgedAt: NOW_ISO };
  assert.equal(decide({ held: HELD, draft: ok, subject: SUBJECT }).outcome, "ADMITTED", "CONTROL: a valid CANDIDATE judgement was not admitted");
  assert.equal(decide({ held: HELD, draft: { ...ok, verdict: "NOT_A_CANDIDATE" }, subject: SUBJECT }).outcome, "REJECTED");
  assert.equal(decide({ held: HELD, draft: { ...ok, verdict: "UNKNOWN" }, subject: SUBJECT }).outcome, "HELD");
  assert.equal(decide({ held: HELD, draft: { ...ok, verdict: "PROBABLY" }, subject: SUBJECT }).code, "VERDICT_UNKNOWN");
  for (const basis of ["SEARCH_RESULT", "SNIPPET", "TITLE_ONLY", "SUMMARY"]) assert.equal(decide({ held: HELD, draft: { ...ok, basis }, subject: SUBJECT }).code, "JUDGEMENT_NOT_ON_THE_ORIGINAL_POST");
  assert.equal(decide({ held: HELD, draft: { ...ok, subject: "another-client" }, subject: SUBJECT }).code, "NOT_THIS_SUBJECTS", "another client's judgement crossed");
  assert.equal(decide({ held: { ...HELD, value: { ...HELD.value, originalPost: NOT_MEASURED } }, draft: ok, subject: SUBJECT }).code, "REASON_NOT_QUOTED_FROM_THE_ORIGINAL_POST", "a quote was accepted with no original post to check it against");
  const withRes = decide({ held: HELD, draft: { ...ok, authorResidence: "abroad", residenceQuote: "while I live in Oslo" }, subject: SUBJECT });
  assert.deepEqual(withRes.question.value.author.authorResidence, { value: "abroad", quote: "while I live in Oslo" });
  assert.equal(decide({ held: HELD, draft: ok, subject: SUBJECT }).question.value.author.authorResidence, NOT_MEASURED, "a residence appeared that no one established");
});

test("M6 · THE EXAMPLE WORDS ARE NEVER A GATE — a post with none of them is admitted on its meaning; a post using all of them is rejected on its meaning", () => {
  const W = world();
  try {
    assert.equal(collectRun(W).r.status, 0);
    const x = judgeRun(W, [
      draft(heldIdOf(W, NOLABELS.link), "CANDIDATE", "I want someone to draw the plans and put up a home for them while I stay in Toronto"),
      draft(heldIdOf(W, LABELS.link), "NOT_A_CANDIDATE", "A quiz about English vocabulary"),
    ]);
    assert.match(x.out, /admitted 1 · rejected 1/);
    assert.deepEqual(stored(W, "questions.jsonl").map((q) => q.value?.reference), [NOLABELS.link], "the example words acted as a gate");
  } finally { W.cleanup(); }
});

test("the production trail is untouched by every proof above", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(trailSha(), TRAIL_BEFORE);
});
