/**
 * 🔴 F10 · ACCEPTANCE AMENDMENT 3 (governance 9c8b9f7, contract fe38acfe) — THE DISCLOSED SEAL.
 *
 * For THIS seal the membership-blind class is permanently unavailable; a result is DISCLOSED_POPULATION_AGREEMENT, named wherever it
 * appears, stored only in a class-named store, and it closes nothing. Proved here by behaviour, each limb with a firing control:
 *   D1 · the board refuses F10 VERIFIED-PASS while its registered set is the disclosed seal — silent without the disclosure, silent
 *        once the set is re-registered under another commitment, silent on the real (IN-PROGRESS) board;
 *   D2 · the helper decides the class and the store only from id AND commitment;
 *   D3 · the REAL entry point states the class before anything is requested — and does not for a set that is not disclosed;
 *   D4 · the real registered seal is the listed one, and the class string is exact.
 * Every run of the entry point is confined (verified test context, its own audit store); the production trail is hashed around it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { buildBoard, boardErrors } from "../src/fboard/board.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { DISCLOSED_SEALS, DISCLOSED_POPULATION_AGREEMENT } from "../config/fboard/disclosed-seals.mjs";
import { disclosureOf, releaseStoreFor, classStatement, DISCLOSED_RELEASE_DIR } from "../src/heldout/disclosed-seal.mjs";
import { SYNTHETIC_SEALED_FIXTURE_ENV } from "../src/governance/synthetic-sealed-fixture.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = () => ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => sha(fs.readFileSync(join(REPO, p))));
const ctx = { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } };
const codes = (errs) => errs.map((e) => `${e.code}:${e.id}`);
/* A board that CLAIMS F10 passed, with a REAL verification event so that no other check is what fires. */
const claimed = () => buildBoard(CAPABILITIES, DECLARED).map((r) => (r.featureId === "F10" ? { ...r, state: "VERIFIED-PASS", events: [...r.events, { kind: "VERIFIED", featureId: "F10", population: "REAL", on: "2026-09-28", from: "IN-PROGRESS", to: "VERIFIED-PASS" }] } : r));

test("D1 · the board REFUSES F10 VERIFIED-PASS on the disclosed seal — silent without the disclosure, after a re-registration, and on the real board", () => {
  assert.ok(codes(boardErrors(claimed(), ctx)).includes("VERIFIED_ON_DISCLOSED_SEAL:F10"), "a pass on the disclosed seal was not refused");
  assert.ok(!codes(boardErrors(claimed(), { ...ctx, disclosedSeals: [] })).includes("VERIFIED_ON_DISCLOSED_SEAL:F10"), "CONTROL: the check fired with no disclosure");
  const reRegistered = EVIDENCE_ROLE_REGISTRY.map((e) => (DISCLOSED_SEALS[0].sets.some((s) => s.id === e.id) ? { ...e, contentHash: "f".repeat(64) } : e));
  assert.ok(!codes(boardErrors(claimed(), { ...ctx, registry: reRegistered })).includes("VERIFIED_ON_DISCLOSED_SEAL:F10"), "CONTROL: a different (re-registered) seal is not this disclosure");
  assert.deepEqual(boardErrors(buildBoard(CAPABILITIES, DECLARED), ctx), [], "CONTROL: the real board, F10 IN-PROGRESS, is clean");
});

test("D2 · the class and the store are decided by id AND commitment only", () => {
  const d = DISCLOSED_SEALS[0], s = d.sets[0];
  assert.equal(disclosureOf({ id: s.id, contentHash: s.contentHash }, DISCLOSED_SEALS), d);
  assert.equal(disclosureOf({ id: s.id, contentHash: "0".repeat(64) }, DISCLOSED_SEALS), null, "CONTROL: same id, other commitment");
  assert.equal(disclosureOf({ id: "sealed:other", contentHash: s.contentHash }, DISCLOSED_SEALS), null, "CONTROL: same commitment, other id");
  assert.equal(releaseStoreFor("evaluation-releases/classification-releases.jsonl", d), `${DISCLOSED_RELEASE_DIR}/classification-releases.jsonl`);
  assert.equal(releaseStoreFor("evaluation-releases/classification-releases.jsonl", null), "evaluation-releases/classification-releases.jsonl", "CONTROL: an undisclosed set keeps the ordinary store");
  assert.match(classStatement(d), /^EVIDENCE CLASS DISCLOSED_POPULATION_AGREEMENT — /);
  assert.match(classStatement(d), /never membership-blind/);
  assert.equal(classStatement(null), null);
});

function world(tag, disclosed) {
  const dir = fs.mkdtempSync(join(os.tmpdir(), "f10a3-"));
  const id = `synthetic:f10a3-${tag}-${Math.random().toString(16).slice(2, 8)}`;
  const entry = { id, role: "HELD_OUT_EVIDENCE", resource: { root: "synthetic-f10a3-store", pathPrefixes: ["set/"] }, scope: "constructed stand-in", source: "test", provenance: "test", capturedAt: "2026-09-28", contentHash: sha(id), mandatoryReadable: false, mayTrain: false, mayEvaluate: true, maySupplyExpectedAnswer: false, sealed: true, retiredReason: null, tenantScope: ["tenant:synthetic"], ...(disclosed ? { disclosedSeal: true } : {}) };
  const fixture = join(dir, "fixture.json");
  fs.writeFileSync(fixture, JSON.stringify({ entries: [entry], stores: { "synthetic-f10a3-store": { mechanism: "ENV_REFERENCE", name: "ALMIVISIBILITY_SYNTHETIC_F10A3_STORE" } } }));
  return { id, entry, fixture, dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
function request(w) {
  const nonce = `f10a3-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  const env = { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: process.env.NODE_TEST_WORKER_ID || "1", ALMIVISIBILITY_AUDIT_RUN: nonce, [SYNTHETIC_SEALED_FIXTURE_ENV]: w.fixture, ALMIVISIBILITY_SYNTHETIC_F10A3_STORE: w.dir };
  try {
    return spawnSync(process.execPath, ["bin/heldout-evaluation.mjs", "request", "--actor=actor:cc", "--mechanism-id=syn-mech", `--mechanism-hash=${"a".repeat(64)}`, `--set=${w.id}`, `--commitment=${w.entry.contentHash}`, "--protocol=p1", "--purpose=assessment", "--authority=F10_ACCEPTANCE"], { cwd: REPO, encoding: "utf8", env, timeout: 120_000 });
  } finally { fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true }); }
}

test("D3 · REAL entry point · the class is STATED before anything is requested — CONTROL: an undisclosed set carries no class", () => {
  const before = PROD();
  const on = world("on", true), off = world("off", false);
  try {
    const r = request(on);
    const lines = r.stdout.split("\n").filter(Boolean);
    const cls = lines.findIndex((l) => l.startsWith(`EVIDENCE CLASS ${DISCLOSED_POPULATION_AGREEMENT}`));
    const decision = lines.findIndex((l) => /^(ALLOWED|REFUSED) /.test(l));
    assert.ok(cls >= 0, `a disclosed set's request did not state its class: ${r.stdout.slice(-400)} ${r.stderr.slice(-400)}`);
    assert.ok(decision > cls, "the class was not stated BEFORE the access decision");
    const c = request(off);
    assert.ok(!c.stdout.includes("EVIDENCE CLASS"), "CONTROL: an undisclosed set was given a class");
    assert.match(c.stdout, /^(ALLOWED|REFUSED) /m, "CONTROL: the undisclosed request did not reach its access decision");
  } finally { on.cleanup(); off.cleanup(); }
  assert.deepEqual(PROD(), before, "a confined request changed the production trail");
});

test("D4 · the REAL registered seal is the listed disclosed seal, by id and commitment, and nothing else is disclosed", () => {
  const listed = DISCLOSED_SEALS.flatMap((d) => d.sets.map((s) => `${s.id}@${s.contentHash}`)).sort();
  const registered = EVIDENCE_ROLE_REGISTRY.filter((e) => disclosureOf(e, DISCLOSED_SEALS)).map((e) => `${e.id}@${e.contentHash}`).sort();
  assert.deepEqual(registered, listed, "the disclosure does not name exactly the registered seal");
  assert.deepEqual(DISCLOSED_SEALS.map((d) => [d.featureId, d.evidenceClass, d.authority.contractSha256]), [["F10", "DISCLOSED_POPULATION_AGREEMENT", ACCEPTANCES.F10.contractSha256]], "the disclosure is not backed by F10's CURRENT acceptance");
});
