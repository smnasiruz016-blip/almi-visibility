/**
 * F16 · THE GOVERNED HUMAN-OBSERVATION PATH (RR-116; acceptance _handoffs 944f769; reconciliation 9d37eab).
 *
 * Every write here goes through the PRODUCTION entry point (bin/observe-question.mjs) and the governed boundary, inside a CONFINED world
 * (a copy of the data root, never the real one) holding TWO DIFFERENT clients — so the path is proved not to be shaped around the first.
 * Every question and reference below is synthetic, invented for the test. No reported figure comes from a fixture. Nothing is fetched;
 * the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { validateSubmission, reviewable, CATEGORIES, REQUIRED } from "../src/research/human-observation.mjs";
import { readClientQuestionRecords } from "../src/research/public-questions-reader.mjs";
import { intakeQuestions, COMPLETENESS_CLAIM, NOT_MEASURED } from "../src/research/public-questions.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN, inputPathRef } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PATH = ["src/research/human-observation.mjs", "bin/observe-question.mjs"];
/* submissions live OUTSIDE the repository, so no other test file's "writes nothing" check ever sees them */
const TMP = join(tmpdir(), `almi-f16-hobs-${process.pid}`);

const SUBJECT_B = "second-client-subject", ORIGIN_B = "https://second-client.invalid", BATCH_A = "hobs-client-a", BATCH_B = "hobs-client-b";
const base = (subject, over = {}) => ({ subject, wording: "  How long does it TAKE to hear back?  ", source: "a public discussion forum", surface: "forum thread", country: NOT_MEASURED, language: "en", method: "manual search by a person", limits: "one session, first results page only", observerRole: "researcher", ...over });
const obs = (subject, over = {}) => ({ ...base(subject), category: "RESEARCHER_OBSERVATION", reference: "https://forum.invalid/thread/1", observedAt: "2026-10-01T09:00:00Z", observerType: "PERSON_OBSERVED", verifiedOn: "ORIGINAL_PAGE", ...over });

/** One confined world with TWO clients: A (the fixture subject) and B (a second subject, origin and batch, attached to a second tenant). */
function twoClients(files) {
  const W = declaredWorld({ extra: [["RESEARCH_BATCH", BATCH_A], ["RESEARCH_BATCH", BATCH_B], ["SITE_ORIGIN", ORIGIN_B], ...files.map((f) => ["INPUT_PATH", inputPathRef(f.path)])], secondTenantOrigins: [ORIGIN_B] });
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  reg.subjects.push({ subjectId: SUBJECT_B, path: SUBJECT_B, members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: BATCH_B }], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: ORIGIN_B }] }] });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
  mkdirSync(join(W.root, SUBJECT_B), { recursive: true });
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  for (const a of att.attachments) {
    if (a.resourceKind === "RESEARCH_BATCH" && a.resourceRef === BATCH_B) a.tenantId = SECOND_FIXTURE_TENANT;
    if (a.resourceKind === "INPUT_PATH" && files.some((f) => f.tenant === SECOND_FIXTURE_TENANT && inputPathRef(f.path) === a.resourceRef)) a.tenantId = SECOND_FIXTURE_TENANT;
  }
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  for (const b of [BATCH_A, BATCH_B]) mkdirSync(join(W.root, "research", b), { recursive: true });
  return W;
}
const runAs = (W, tenant, args) => spawnSync(process.execPath, ["bin/observe-question.mjs", `--tenant=${tenant}`, `--actor=${W.actor}`, ...args], { cwd: REPO, encoding: "utf8", env: W.envWith() });
const stored = (W, batch) => { const p = join(W.root, "research", batch, "questions.jsonl"); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };

/* ================= §4 — what one observation must carry ================= */

test("§4 · FIRING CONTROL: every required field is required — one missing field REFUSES the observation; it is never stored with a default", () => {
  for (const f of REQUIRED.RESEARCHER_OBSERVATION) {
    const s = obs("subj"); delete s[f];
    const v = validateSubmission(s, { origin: "https://subj.invalid" });
    assert.equal(v.accepted, false, `${f} missing, yet accepted`);
    assert.ok(v.refusals.includes(`${f.toUpperCase()}_ABSENT`), `${f} missing, refused for another reason`);
  }
  assert.equal(validateSubmission(obs("subj", { country: "" }), { origin: "https://subj.invalid" }).accepted, false, "a blank country was accepted");
  const nm = validateSubmission(obs("subj"), { origin: "https://subj.invalid" });
  assert.equal(nm.record.value.country, NOT_MEASURED, "an unknown country was not carried as NOT MEASURED");
  const notATime = validateSubmission(obs("subj", { observedAt: "yesterday" }), { origin: "https://subj.invalid" });
  assert.equal(notATime.accepted, false, "a time that is not a time was accepted");
  assert.deepEqual(notATime.refusals, ["OBSERVEDAT_NOT_A_TIME"]);
});

test("§4 · the original wording is kept byte for byte — nothing trims, folds or normalises it away", () => {
  const v = validateSubmission(obs("subj"), { origin: "https://subj.invalid" });
  assert.equal(v.record.value.original, "  How long does it TAKE to hear back?  ");
  assert.ok(Object.isFrozen(v.record.value), "an accepted record can be rewritten");
});

/* ================= §5 — an unreviewable source is not evidence ================= */

test("§5 · FIRING CONTROL: a typed question with no reviewable reference never becomes an observation — refused as one, at most an INFERRED suggestion", () => {
  assert.deepEqual(validateSubmission(obs("subj", { reference: undefined }), { origin: "https://subj.invalid" }).refusals, ["REFERENCE_ABSENT"]);
  assert.deepEqual(validateSubmission(obs("subj", { reference: "my notes" }), { origin: "https://subj.invalid" }).refusals, ["REFERENCE_NOT_REVIEWABLE"]);
  assert.equal(reviewable({ kind: "OTHER", text: "library catalogue entry, shelf mark 12" }), true);
  const typed = validateSubmission({ ...base("subj"), category: "INFERRED_SUGGESTION", basis: "a researcher's own wording", recordedAt: "2026-10-01T09:00:00Z" }, { origin: "https://subj.invalid" });
  assert.equal(typed.record.value.kind, "INFERRED");
  assert.equal(evidenceStateOf(typed.record).state, "INFERRED", "a typed suggestion was placed as evidence");
});

test("§5 · FIRING CONTROL: the STORE refuses an observed question without a reference — a typed question cannot reach the observed evidence even past the validator", () => {
  const good = validateSubmission(obs("subj"), { origin: "https://subj.invalid" }).record;
  assert.equal(evidenceStateOf(good).state, "OBSERVED");
  const forged = { ...good, value: { ...good.value, reference: null } };
  const placed = evidenceStateOf(forged);
  assert.equal(placed.unmapped, true, "an observed question with no reference was placed — the store would accept it");
  assert.match(placed.why, /no reviewable reference is not evidence/);
});

test("§5 · provenance: a PERSON saw it, never the engine; the observer is a ROLE — personal data in the role is refused", () => {
  const v = validateSubmission(obs("subj"), { origin: "https://subj.invalid" });
  assert.deepEqual([v.record.value.provenance.engineObserved, v.record.value.provenance.seenBy, v.record.value.provenance.observerRole], [false, "A PERSON — not the engine", "researcher"]);
  for (const role of ["someone@example.invalid", "researcher +44 20 7946 0000"]) {
    const v = validateSubmission(obs("subj", { observerRole: role }), { origin: "https://subj.invalid" });
    assert.equal(v.accepted, false, `a role carrying personal data was accepted`);
    assert.deepEqual(v.refusals, ["OBSERVER_ROLE_CARRIES_PERSONAL_DATA"]);
  }
});

/* ================= §6 — three categories, never merged ================= */

test("§6 · FIRING CONTROL: the three categories are three records with three evidence states; a client's claim is never evidence and never outranks an observation", () => {
  const o = validateSubmission(obs("subj"), { origin: "https://subj.invalid" }).record;
  const c = validateSubmission({ ...base("subj"), category: "CLIENT_CLAIM", recordedAt: "2026-10-01T09:00:00Z" }, { origin: "https://subj.invalid" }).record;
  const i = validateSubmission({ ...base("subj"), category: "INFERRED_SUGGESTION", basis: "a derivation", recordedAt: "2026-10-01T09:00:00Z" }, { origin: "https://subj.invalid" }).record;
  assert.deepEqual([o.value.kind, c.value.kind, i.value.kind], ["OBSERVED", "CLIENT_CLAIM", "INFERRED"]);
  assert.deepEqual([evidenceStateOf(o).state, evidenceStateOf(c).state, evidenceStateOf(i).state], ["OBSERVED", "UNKNOWN", "INFERRED"]);
  assert.equal(evidenceStateOf(c).meta.insufficiency, "FIRST_PARTY_CLAIM_NOT_EVIDENCE");
  assert.equal(new Set([o.question_id, c.question_id, i.question_id]).size, 3, "two categories merged into one record");
  assert.deepEqual(Object.keys(CATEGORIES), ["RESEARCHER_OBSERVATION", "CLIENT_CLAIM", "INFERRED_SUGGESTION"]);
});

/* ================= the production governed path, two clients ================= */

test("§6/§8 · PRODUCTION PATH, TWO CLIENTS: each client's observations land only in its own batch, are read only as its own, and a cross-client write is refused", () => {
  const dir = TMP;
  mkdirSync(dir, { recursive: true });
  const fileA = join(dir, "a.json"), fileB = join(dir, "b.json"), fileX = join(dir, "x.json");
  writeFileSync(fileA, JSON.stringify([obs(FIXTURE_SUBJECT), { ...base(FIXTURE_SUBJECT), category: "CLIENT_CLAIM", recordedAt: "2026-10-01T10:00:00Z" }, obs(FIXTURE_SUBJECT, { reference: undefined }), obs(SUBJECT_B, { wording: "A question gathered for the other client?", reference: "https://forum.invalid/thread/7" })]));
  writeFileSync(fileB, JSON.stringify([obs(SUBJECT_B, { wording: "Is the second client's service available abroad?", reference: "https://other-forum.invalid/q/9", language: NOT_MEASURED })]));
  writeFileSync(fileX, JSON.stringify([obs(FIXTURE_SUBJECT)]));
  const W = twoClients([{ path: fileA, tenant: FIXTURE_TENANT }, { path: fileB, tenant: SECOND_FIXTURE_TENANT }, { path: fileX, tenant: FIXTURE_TENANT }]);
  try {
    const a = runAs(W, FIXTURE_TENANT, [`--subject=${FIXTURE_SUBJECT}`, `--research-batch=${BATCH_A}`, `--submission=${fileA}`, "--confirm"]);
    assert.equal(a.status, 0, a.stdout + a.stderr);
    assert.match(a.stdout, /KEPT 2 of 4 — written through the governed boundary/);
    assert.match(a.stdout, /refusals by rule: REFERENCE_ABSENT 1 · SUBJECT_IS_NOT_THIS_RUNS_SUBJECT 1/);
    const b = runAs(W, SECOND_FIXTURE_TENANT, [`--subject=${SUBJECT_B}`, `--research-batch=${BATCH_B}`, `--submission=${fileB}`, "--confirm"]);
    assert.equal(b.status, 0, b.stdout + b.stderr);
    assert.match(b.stdout, /KEPT 1 of 1/);
    assert.deepEqual([stored(W, BATCH_A).length, stored(W, BATCH_B).length], [2, 1]);
    const cross = runAs(W, FIXTURE_TENANT, [`--subject=${FIXTURE_SUBJECT}`, `--research-batch=${BATCH_B}`, `--submission=${fileX}`, "--confirm"]);
    assert.notEqual(cross.status, 0, "a client wrote into another client's research batch");
    assert.equal(stored(W, BATCH_B).length, 1, "the other client's batch changed");
    const env = W.envWith();
    const resolve = createTenantResolver({ env });
    const readA = readClientQuestionRecords({ tenantId: FIXTURE_TENANT, resolve, batches: [BATCH_A, BATCH_B], env });
    const readB = readClientQuestionRecords({ tenantId: SECOND_FIXTURE_TENANT, resolve, batches: [BATCH_A, BATCH_B], env });
    assert.deepEqual([readA.records.length, readB.records.length], [2, 1], "a client's observations were read, counted or reported under the other client");
    assert.ok(readA.records.every((r) => r.value.subject === FIXTURE_SUBJECT) && readB.records.every((r) => r.value.subject === SUBJECT_B));
    const fA = intakeQuestions(readA.records);
    assert.deepEqual([fA.lists.OBSERVED.length, fA.lists.CLIENT_CLAIM.length, fA.lists.INFERRED.length], [1, 1, 0]);
    assert.equal(stored(W, BATCH_A).find((r) => r.value.kind === "OBSERVED").value.original, "  How long does it TAKE to hear back?  ", "the stored original was altered");
    for (const out of [a.stdout, b.stdout]) { assert.match(out, /SAMPLE — /); assert.doesNotMatch(out, COMPLETENESS_CLAIM); assert.doesNotMatch(out, /https?:\/\/|hear back/, "a report printed a reference or a wording"); }
  } finally { W.cleanup(); }
});

test("§4 · without --confirm nothing is written, and a submission naming another subject is refused", () => {
  const dir = TMP;
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "n.json");
  writeFileSync(file, JSON.stringify([obs(FIXTURE_SUBJECT), obs(SUBJECT_B)]));
  const W = twoClients([{ path: file, tenant: FIXTURE_TENANT }]);
  try {
    const r = runAs(W, FIXTURE_TENANT, [`--subject=${FIXTURE_SUBJECT}`, `--research-batch=${BATCH_A}`, `--submission=${file}`]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /NOT WRITTEN — no --confirm: 0 records kept/);
    assert.match(r.stdout, /SUBJECT_IS_NOT_THIS_RUNS_SUBJECT 1/);
    assert.equal(stored(W, BATCH_A).length, 0);
  } finally { W.cleanup(); }
});

/* ================= sealed separation, no network, neutrality ================= */

test("§6 · FIRING CONTROL: the validator reaches no sealed store, no held-out module and no owned Search Console store — and the control fires", () => {
  const read = (f) => (existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null);
  const forbidden = (rd) => { const r = decisionCallPaths({ entries: [PATH[0]], read: rd }); return r.modules.filter((m) => /sealed-store-roots|sealed-paths|synthetic-sealed-fixture|config\/evidence-roles|src\/heldout\/|intent-clusters/.test(m) || /evidence\.jsonl|runs\/evidence/.test(rd(m) ?? "")); };
  assert.deepEqual(forbidden(read), []);
  assert.ok(forbidden((f) => (f === PATH[0] ? `${read(f)}\nimport "../governance/sealed-store-roots.mjs";\n` : read(f))).length > 0, "a planted sealed import was not seen");
  assert.deepEqual(decisionCallPaths({ entries: [PATH[0]] }).faults, []);
  assert.deepEqual(decisionCallPaths({ entries: [PATH[0]], read: (f) => (f === PATH[0] ? `${read(f)}\nawait fetch(u);\n` : read(f)) }).faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("§0 · FIRING CONTROL: the path names no product — and the scanner fires when one is planted", () => {
  assert.ok(PRODUCT_WORDS.length > 0);
  for (const f of PATH) assert.deepEqual(scanSource(readFileSync(join(REPO, f), "utf8")).code, [], `${f} names a product in code`);
  assert.ok(scanSource(`${readFileSync(join(REPO, PATH[0]), "utf8")}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0, "the scanner did not fire");
});

test("the test's own temporary submissions are removed, and none was ever inside the repository", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(existsSync(TMP), false);
  assert.equal(existsSync(join(REPO, "runs", "tmp-f16-human-observation-test")), false, "a submission was written inside the repository");
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
