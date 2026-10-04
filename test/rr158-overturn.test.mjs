/**
 * 🔴 RR-158 §5 · AN OVERTURNED QUESTION LEAVES F16'S AND F91'S COUNTS — and every count says AS AT which moment it was taken.
 *
 *   O1 F16, through the production entry points in a CONFINED copy (fake transport, zero external requests): a question admitted by a
 *      judgement is counted; a person's later judgement that NAMES it and finds NOT_A_CANDIDATE takes it out of every F16 count; the report
 *      says AS AT, and names how many were taken out
 *   O2 F91, through the production code: an overturned question is refused at connection (its own code), leaves the connection read-back,
 *      and its demand leaves the three numbers; CONTROL: the same rows with no overturn still count
 *   O3 an overturn that does not NAME the judgement it replaces is refused (the judging entry point) — and the rule lives in ONE place
 *   O4 the F91 report says AS AT which moment it was taken
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
import { planSha256 } from "../src/research/collection.mjs";
import { overturnedIds, currentJudgements, asAt, JUDGEMENT_RECORD } from "../src/research/meaning-judgement.mjs";
import { refusalOf, connectQuestions, readConnections, REFUSAL, CONNECTION } from "../src/page/demand-connection.mjs";
import { planningInputs } from "../src/page/page-opportunities-reader.mjs";
import { API_ORIGIN } from "../src/research/adapters/stack-exchange.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-rr158-${process.pid}`);
const SUBJECT = "lamzish";
const TODAY = new Date().toISOString().slice(0, 10);
const E = (iso) => Date.parse(iso) / 1000;
const AS_AT = /as at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z — judgements taken into account up to /;

const ROOTS = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8"));
const ENTRY = ROOTS.subjects.find((s) => s.subjectId === SUBJECT);
const ATT = JSON.parse(readFileSync(join(DATA_ROOT, "tenancy", "attachments.json"), "utf8")).attachments;
const ORIGIN = ENTRY.members.find((m) => m.resourceKind === "SITE_ORIGIN").resourceRef;
const TENANT = ATT.find((a) => a.resourceKind === "SITE_ORIGIN" && a.resourceRef === ORIGIN).tenantId;
const KEY_NAME = ENTRY.connectors.find((c) => c.kind === "QUESTION_SOURCE_API").credential.name;
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
function green(planSha) {
  const text = `fixture GREEN record\n\nOWNER GREEN v1\nplan: ${planSha}\nrequests: 2\nEND OWNER GREEN\n`;
  const path = `AlmiVisibility_OWNER_DECISION_${TODAY}_FIXTURE_GREEN_o${++n}.md`;
  const record = { authorityId: `_handoffs:${path}`, propositionId: `OWNER_DECISION_FIXTURE_GREEN_o${n}`, scope: ["ALMIVISIBILITY"], issuer: { class: "OWNER", declaredBy: "fixture" },
    issuedAt: TODAY, issuedAtSource: "FILE_NAME", effectiveFrom: TODAY, sourceRef: { kind: "GOVERNANCE_RECORD", repo: "_handoffs", path, commit: "0".repeat(40), blob: "0".repeat(40) },
    status: "CURRENT", supersedes: [], supersededBy: [], contentHash: contentHashOf(text), recordedAt: `${TODAY}T00:00:00Z`, inclusionRule: "fixture" };
  return { id: record.authorityId, path: file("green.json", { record, text }) };
}
const post = (id, title, body) => ({ question_id: id, title, link: `https://fixture-qa.invalid/q/${id}`, creation_date: E("2022-03-01T10:00:00Z"), owner: { display_name: `fixture-user-${id}` }, content_license: "CC BY-SA 4.0", body });
const ONE = post(11, "Building back home from abroad", "<p>I live abroad and want to hire an architect to build our family home in Pakistan.</p>");
const spawn = (W, args, env = {}) => { const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), ...env } }); return { r, out: r.stdout + r.stderr }; };
const stored = (W, f) => { const p = join(W.root, "research", BATCH, f); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
function judge(W, drafts) {
  writeFileSync(join(W.root, "research", BATCH, "judgement-drafts.json"), JSON.stringify(drafts));
  return spawn(W, ["bin/judge-public-questions.mjs", `--subject=${SUBJECT}`, `--research-batch=${BATCH}`, `--tenant=${TENANT}`, "--actor=actor:cc", "--confirm"]);
}
const readBack = (W) => spawn(W, ["bin/public-questions.mjs", `--research-batch=${BATCH}`, `--tenant=${TENANT}`, "--actor=actor:cc"]);

test("O1 · F16 — an admitted question is counted; once a person's judgement NAMES and overturns it, it LEAVES every F16 count; the report says AS AT", () => {
  assert.ok(BATCH && PLAN_SHA, "no batch of the subject carries the owner's meaning test — the proof would be vacuous");
  const W = world();
  try {
    const g = green(PLAN_SHA);
    attach(W, "INPUT_PATH", inputPathRef(g.path), TENANT);
    const c = spawn(W, ["bin/collect-public-questions.mjs", `--subject=${SUBJECT}`, `--research-batch=${BATCH}`, `--green=${g.id}`, `--tenant=${TENANT}`, "--actor=actor:cc", "--confirm"],
      { [KEY_NAME]: "sentinel-credential-value-0b12", ALMIVISIBILITY_TEST_TRANSPORT: join(REPO, "test", "fixtures", "fake-question-source-transport.mjs"), ALMIVISIBILITY_TEST_GREEN: g.path, FAKE_QS_SCENARIO: file("scenario.json", { responses: [{ items: [ONE] }, { items: [ONE] }] }), FAKE_QS_CALLS: file("calls.jsonl", "") });
    assert.equal(c.r.status, 0, c.out);
    const held = stored(W, "held-for-judgement.jsonl")[0];
    assert.ok(held?.held_id, "nothing was held");
    const j1 = judge(W, [{ heldId: held.held_id, subject: SUBJECT, basis: "ORIGINAL_POST", verdict: "CANDIDATE", quote: "hire an architect to build our family home in Pakistan", judge: { observerType: "AGENT_OBSERVED", actorRef: "actor:cc" }, judgedAt: `${TODAY}T01:00:00Z` }]);
    assert.match(j1.out, /admitted 1/, j1.out);
    const before = readBack(W);
    assert.equal(before.r.status, 0, before.out);
    assert.match(before.out, /OBSERVED: 1 of 1 recorded question/, "the admitted question was not counted");
    assert.match(before.out, AS_AT, "the F16 count does not say as at which moment it was taken");
    const first = stored(W, "meaning-judgements.jsonl")[0];
    assert.ok(first?.judgement_id);
    const j2 = judge(W, [{ heldId: held.held_id, subject: SUBJECT, basis: "ORIGINAL_POST", verdict: "NOT_A_CANDIDATE", quote: "I live abroad", overturns: first.judgement_id, judge: { observerType: "PERSON_OBSERVED", actorRef: "the owner" }, judgedAt: `${TODAY}T02:00:00Z` }]);
    assert.match(j2.out, /rejected 1/, j2.out);
    const after = readBack(W);
    assert.equal(after.r.status, 0, after.out);
    assert.match(after.out, /OBSERVED: 0 of 0 recorded question/, "an overturned admission still counts in F16");
    assert.match(after.out, /overturned {2}1 admitted question\(s\)/, "the overturn was not named in the report");
    assert.match(after.out, new RegExp(`${AS_AT.source}${TODAY}T02:00:00Z`), "the report's AS AT does not name the latest judgement it took into account");
    assert.equal(stored(W, "questions.jsonl").length, 1, "the admitted record was erased — an overturn appends, never deletes");
  } finally { W.cleanup(); }
});

/* F91 fixtures — pure rows, through the production code */
const Q = (id) => ({ record_type: "public_question", question_id: id, value: { kind: "OBSERVED", subject: SUBJECT, original: `fixture question ${id}?`, provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } });
const J = (id, heldId, verdict, overturns = null, at = `${TODAY}T01:00:00Z`) => ({ record_type: JUDGEMENT_RECORD, judgement_id: id, recorded_at: at, value: { held_id: heldId, verdict, overturns } });
const JUDGEMENTS = [J("j1", "q1", "CANDIDATE"), J("j2", "q2", "CANDIDATE"), J("j3", "q1", "NOT_A_CANDIDATE", "j1", `${TODAY}T02:00:00Z`)];

test("O2 · F91 — an overturned question is refused at connection, leaves the connection read-back, and its demand leaves the three numbers; CONTROL: with no overturn it counts", () => {
  const gone = overturnedIds(JUDGEMENTS);
  assert.deepEqual([...gone], ["q1"]);
  assert.equal(refusalOf(Q("q1"), { subject: SUBJECT, overturned: gone }), REFUSAL.OVERTURNED, "an overturned question was admitted to F91");
  assert.equal(refusalOf(Q("q2"), { subject: SUBJECT, overturned: gone }), null, "CONTROL: a question still CANDIDATE was refused");
  const combo = { offering: "offering-one" };
  const conn = (qid) => ({ record_type: CONNECTION, questionId: qid, needId: `need-${qid}`, combination: combo, wording: "x", country: "NOT MEASURED", language: "NOT MEASURED" });
  const rb = readConnections([conn("q1"), conn("q2")], { overturned: gone });
  assert.deepEqual([rb.counts.questions, rb.counts.overturned], [1, 1], "an overturned connection still counts in F91's read-back");
  assert.equal(readConnections([conn("q1"), conn("q2")]).counts.questions, 2, "CONTROL: with no overturn both connections count");
  const demand = (qid) => ({ record_type: "planning_demand", combination: combo, state: "OBSERVED", questionId: qid, wording: "x" });
  const withJ = planningInputs([demand("q1"), demand("q2"), ...JUDGEMENTS]);
  const noJ = planningInputs([demand("q1"), demand("q2")]);
  const items = (inp) => [...inp.records.values()].reduce((a, s) => a + s.demand.length, 0);
  assert.deepEqual([items(withJ), withJ.overturnedDemand, withJ.malformed], [1, 1, 0], "an overturned question's demand still counts in F91's numbers, or a judgement read as malformed");
  assert.equal(items(noJ), 2, "CONTROL: with no overturn both demand items count");
  /* connection drafts naming the overturned question are refused by name */
  const r = connectQuestions({ subject: SUBJECT, possible: { value: 1, candidates: [combo] }, records: [Q("q1")], drafts: [{ questionId: "q1", combination: combo }], on: TODAY, overturned: gone });
  assert.deepEqual(r.refused.map((x) => x.code), [REFUSAL.OVERTURNED]);
});

test("O3 · an overturn that does not NAME the judgement it replaces never decides — and an unnamed second judgement leaves the first CURRENT", () => {
  const unnamed = [J("j1", "q1", "CANDIDATE"), J("j9", "q1", "NOT_A_CANDIDATE", null, `${TODAY}T03:00:00Z`)];
  /* the judging entry point refuses such a draft (rr157 M3); here: had one been recorded, the rule would not let it overturn silently */
  assert.equal(currentJudgements([J("j1", "q1", "CANDIDATE"), J("j3", "q1", "NOT_A_CANDIDATE", "j1")]).get("q1").judgement_id, "j3", "CONTROL: a named overturn did not decide");
  assert.equal(currentJudgements(unnamed).get("q1").judgement_id, "j1", "an overturn that names nothing decided");
  assert.deepEqual([...overturnedIds(unnamed)], [], "an unnamed judgement took an admitted question out of the count");
  assert.ok(asAt([J("j1", "q1", "CANDIDATE"), J("j3", "q1", "NOT_A_CANDIDATE", "j1", `${TODAY}T03:00:00Z`)]).includes(`${TODAY}T03:00:00Z`), "AS AT does not name the latest judgement taken into account");
});

test("O4 · the F91 report says AS AT which moment it was taken", () => {
  const W = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, W.argv(["bin/page-opportunities.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, AS_AT, "the F91 count does not say as at which moment it was taken");
    assert.match(ok.stdout, /demand left out because its question was overturned: 0/);
  } finally { W.cleanup(); }
});

test("the production trail is untouched by every proof above", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(trailSha(), TRAIL_BEFORE);
});
