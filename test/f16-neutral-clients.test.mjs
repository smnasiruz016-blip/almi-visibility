/**
 * F16 · PRODUCT NEUTRALITY, PILOT MARKING AND THE COMMIT GUARD (RR-117 §4–§6).
 *
 * TWO UNRELATED synthetic clients — a neighbourhood bakery and a bicycle-repair shop, unrelated to each other and to any exam — declared
 * by ONE declaration function and served by the SAME production entry points (bin/observe-question.mjs, the F16 reader). Every write goes
 * through the governed boundary inside a CONFINED world (a copy of the data root). Every question and reference here is synthetic. No
 * reported figure comes from a fixture. Nothing is fetched; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { readClientQuestionRecords } from "../src/research/public-questions-reader.mjs";
import { intakeQuestions, reportLines, PILOT_MARK, COMPLETENESS_CLAIM, NOT_MEASURED } from "../src/research/public-questions.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT, inputPathRef } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f16-neutral-${process.pid}`);

/* two unrelated synthetic clients — nothing about either appears in the code under test */
const BAKERY = { subject: "harbour-bakery", origin: "https://harbour-bakery.invalid", batch: "harbour-bakery-questions", tenant: FIXTURE_TENANT };
const BIKES = { subject: "trailside-bike-repair", origin: "https://trailside-bikes.invalid", batch: "trailside-bike-questions", tenant: SECOND_FIXTURE_TENANT };
const PILOT = { subject: "harbour-bakery", origin: BAKERY.origin, batch: "harbour-bakery-pilot", tenant: FIXTURE_TENANT, purpose: "TEST_PILOT" };

const ask = (client, wording, n) => ({ category: "RESEARCHER_OBSERVATION", subject: client.subject, wording, source: "a public discussion forum", surface: "forum thread", reference: `https://forum.invalid/t/${n}`, observedAt: "2026-10-01T09:00:00Z", country: NOT_MEASURED, language: "en", method: "manual search by a person", limits: "one session, first results page only", observerRole: "researcher" });

/** ONE declaration function for every client: its subject, its origin, its own research batch — and, optionally, the batch's purpose. */
function declareClient(W, c) {
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  const entry = reg.subjects.find((s) => s.subjectId === c.subject);
  if (entry) entry.members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: c.batch });
  else reg.subjects.push({ subjectId: c.subject, path: c.subject, members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: c.batch }], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: c.origin }] }] });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
  mkdirSync(join(W.root, c.subject), { recursive: true });
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  for (const [kind, ref] of [["RESEARCH_BATCH", c.batch], ["SITE_ORIGIN", c.origin]]) {
    const a = att.attachments.find((x) => x.resourceKind === kind && x.resourceRef === ref);
    if (a) a.tenantId = c.tenant; else att.attachments.push({ ...att.attachments[0], resourceKind: kind, resourceRef: ref, tenantId: c.tenant });
  }
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  mkdirSync(join(W.root, "research", c.batch), { recursive: true });
  if (c.purpose) writeFileSync(join(W.root, "research", c.batch, "batch.json"), JSON.stringify({ purpose: c.purpose }));
}
/** a submission file, declared as an input path of the tenant that hands it to the run */
function submission(W, name, tenant, rows) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(rows));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "INPUT_PATH", resourceRef: inputPathRef(p), tenantId: tenant });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  return p;
}
const world = () => declaredWorld({ secondTenantOrigins: [BIKES.origin] });
const write = (W, c, file, batch = c.batch) => spawnSync(process.execPath, ["bin/observe-question.mjs", `--tenant=${c.tenant}`, `--actor=${W.actor}`, `--subject=${c.subject}`, `--research-batch=${batch}`, `--submission=${file}`, "--confirm"], { cwd: REPO, encoding: "utf8", env: W.envWith() });
const stored = (W, batch) => { const p = join(W.root, "research", batch, "questions.jsonl"); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };

/* ================= §4 — two unrelated clients, the same code ================= */

test("§4 · TWO UNRELATED CLIENTS, ONE CODE PATH: each declares its own batch, submits its own, reads only its own — and every cross reach is refused", () => {
  const W = world();
  try {
    declareClient(W, BAKERY);
    declareClient(W, BIKES);
    const fb = submission(W, "bakery.json", BAKERY.tenant, [ask(BAKERY, "Do you bake without nuts on weekdays?", 1), ask(BAKERY, "Can I order a cake two days ahead?", 2)]);
    const fk = submission(W, "bikes.json", BIKES.tenant, [ask(BIKES, "How long does a wheel truing take?", 3)]);
    const a = write(W, BAKERY, fb);
    const b = write(W, BIKES, fk);
    assert.equal(a.status, 0, a.stdout + a.stderr);
    assert.equal(b.status, 0, b.stdout + b.stderr);
    assert.match(a.stdout, /KEPT 2 of 2/);
    assert.match(b.stdout, /KEPT 1 of 1/);
    assert.deepEqual([stored(W, BAKERY.batch).length, stored(W, BIKES.batch).length], [2, 1]);

    const env = W.envWith();
    const resolve = createTenantResolver({ env });
    const both = [BAKERY.batch, BIKES.batch];
    const rb = readClientQuestionRecords({ tenantId: BAKERY.tenant, resolve, batches: both, env });
    const rk = readClientQuestionRecords({ tenantId: BIKES.tenant, resolve, batches: both, env });
    assert.deepEqual([rb.records.length, rb.outsidePartition, rk.records.length, rk.outsidePartition], [2, 1, 1, 2], "a client read, counted or reported another client's questions");
    assert.ok(rb.records.every((r) => r.value.subject === BAKERY.subject) && rk.records.every((r) => r.value.subject === BIKES.subject));

    const fx = submission(W, "cross.json", BAKERY.tenant, [ask(BAKERY, "Is there gluten-free bread?", 4)]);
    const cross = write(W, BAKERY, fx, BIKES.batch);
    assert.notEqual(cross.status, 0, "one client wrote into the other client's batch");
    assert.match(cross.stdout + cross.stderr, /TENANT SCOPE REFUSED/);
    assert.equal(stored(W, BIKES.batch).length, 1, "the other client's batch changed");
    const crossSubject = spawnSync(process.execPath, ["bin/observe-question.mjs", `--tenant=${BAKERY.tenant}`, `--actor=${W.actor}`, `--subject=${BIKES.subject}`, `--research-batch=${BAKERY.batch}`, `--submission=${fx}`, "--confirm"], { cwd: REPO, encoding: "utf8", env });
    assert.notEqual(crossSubject.status, 0, "one client wrote under the other client's subject");
  } finally { W.cleanup(); }
});

/* ================= §5 — pilot data says so, in the data ================= */

test("§5 · FIRING CONTROL: a TEST_PILOT batch stamps its records in the data, and every output derived from it carries the marking", () => {
  const W = world();
  try {
    declareClient(W, PILOT);
    const f = submission(W, "pilot.json", PILOT.tenant, [ask(PILOT, "Do you deliver on Sundays?", 5)]);
    const r = write(W, PILOT, f);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(r.stdout.includes(PILOT_MARK), "the writer's output lost the pilot marking");
    const rows = stored(W, PILOT.batch);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].value.dataPurpose, "TEST_PILOT", "the marking is not in the data itself");
    const env = W.envWith();
    const read = readClientQuestionRecords({ tenantId: PILOT.tenant, resolve: createTenantResolver({ env }), batches: [PILOT.batch], env });
    const lines = reportLines(intakeQuestions(read.records), { limits: "one pilot batch" });
    assert.ok(lines.some((l) => l.startsWith(PILOT_MARK)), "F16's report lost the pilot marking");
    for (const l of lines) assert.doesNotMatch(l, COMPLETENESS_CLAIM);
    assert.doesNotMatch(lines.join(" "), /represents (global|national|country) demand|production client result(?!\b)/i);
    writeFileSync(join(W.root, "research", PILOT.batch, "batch.json"), JSON.stringify({ purpose: "PRODUCTION" }));
    const undeclared = write(W, PILOT, f);
    assert.notEqual(undeclared.status, 0, "a batch purpose no rule declares was accepted");
    assert.match(undeclared.stderr, /BATCH_PURPOSE_UNDECLARED/);
  } finally { W.cleanup(); }
});

/* ================= §6 — KEPT only after a commit ================= */

test("§6 · FIRING CONTROL: when the governed commit FAILS (the boundary returns an uncommitted outcome, without throwing), nothing is reported KEPT", () => {
  const W = world();
  let target = null;
  try {
    declareClient(W, BIKES);
    target = join(W.root, "research", BIKES.batch, "questions.jsonl");
    writeFileSync(target, "");
    chmodSync(target, 0o444);
    const f = submission(W, "locked.json", BIKES.tenant, [ask(BIKES, "Do you fit tubeless tyres?", 6)]);
    const r = write(W, BIKES, f);
    assert.notEqual(r.status, 0, "a failed commit exited as a success");
    assert.doesNotMatch(r.stdout, /KEPT/, "KEPT was printed although the commit did not happen");
    assert.match(r.stderr, /(FAILED_BEFORE_COMMIT|RECOVERY_REQUIRED) — 1 accepted record\(s\) did NOT persist; nothing is kept/);
    chmodSync(target, 0o666);
    assert.equal(readFileSync(target, "utf8"), "", "a record persisted through a failed commit");
  } finally { if (target && existsSync(target)) chmodSync(target, 0o666); W.cleanup(); }
});

test("the test's own temporary submissions are removed, and none was ever inside the repository", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(existsSync(TMP), false);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
