/**
 * F74 · SAFE IMPLEMENTATION COMMAND GENERATION (acceptance _handoffs afe61ef, AlmiVisibility_F74_ACCEPTANCE_2026-10-18.md, RR-284).
 *
 * Firing controls on a fixture corpus; the REAL run over the batch's filed approved actions against the engine's own authority corpus — every
 * action an owner decision of the governance repository (beta-g decision E). Nothing run, fetched or written; the production trail is not
 * written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { generateCommands, approvalOf, COMMAND_REFUSAL } from "../src/governance/implementation-commands.mjs";
import { findSecrets } from "../src/intake/secrets.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const H = "a".repeat(64);
const CORPUS = [
  { authorityId: "_handoffs:X_OWNER_DECISION_2026-10-18_A.md", status: "CURRENT", issuer: { class: "OWNER" }, contentHash: H },
  { authorityId: "_handoffs:X_OWNER_DECISION_2026-09-01_OLD.md", status: "SUPERSEDED", issuer: { class: "OWNER" }, contentHash: H },
  { authorityId: "_handoffs:X_CC_COMMAND_2026-10-18_C.md", status: "CURRENT", issuer: { class: "OWNER" }, contentHash: H },
  { authorityId: "_handoffs:X_AGENT_DECISION_2026-10-18_D.md", status: "CURRENT", issuer: { class: "AGENT" }, contentHash: H },
];
const action = (over = {}) => ({ actionId: "a1", title: "do a thing", approval: { path: "X_OWNER_DECISION_2026-10-18_A.md", sha256: H }, change: "change x", scope: ["file x"], never: ["a deploy"], stop: ["x fails"], proofs: ["x is green"], ...over });
const run = (actions) => generateCommands({ actions, corpus: CORPUS });

test("C1 · ONLY APPROVED · FIRING CONTROL: a command only from an owner decision of the governance repository, CURRENT, with its committed bytes — every other action refused, named", () => {
  assert.equal(run([action()]).commands.length, 1);
  for (const [why, a, code] of [
    ["no approval", action({ approval: undefined }), COMMAND_REFUSAL.NO_APPROVAL],
    ["a record not in the corpus", action({ approval: { path: "X_OWNER_DECISION_2026-10-18_NONE.md", sha256: H } }), COMMAND_REFUSAL.NOT_ADMITTED],
    ["a superseded record", action({ approval: { path: "X_OWNER_DECISION_2026-09-01_OLD.md", sha256: H } }), COMMAND_REFUSAL.NOT_CURRENT],
    ["a record not the owner's", action({ approval: { path: "X_AGENT_DECISION_2026-10-18_D.md", sha256: H } }), COMMAND_REFUSAL.NOT_OWNER],
    ["a command, not a decision", action({ approval: { path: "X_CC_COMMAND_2026-10-18_C.md", sha256: H } }), COMMAND_REFUSAL.NOT_A_DECISION],
    ["other bytes", action({ approval: { path: "X_OWNER_DECISION_2026-10-18_A.md", sha256: "b".repeat(64) } }), COMMAND_REFUSAL.HASH_DIFFERS],
  ]) {
    const r = run([a]);
    assert.deepEqual([r.commands.length, r.refused[0]?.refused], [0, code], `${why}: a command was made`);
  }
});

test("C2 · ONE PER ACTION · FIRING CONTROL: each action gives exactly one command; an action seen twice is refused, never merged", () => {
  const r = run([action(), action({ actionId: "a2" }), action()]);
  assert.deepEqual(r.commands.map((c) => c.actionId), ["a1", "a2"]);
  assert.deepEqual(r.refused.map((x) => [x.actionId, x.refused]), [["a1", COMMAND_REFUSAL.DUPLICATE]]);
  assert.equal(r.commands.length + r.refused.length, r.actions, "an action gave no outcome, or two");
  assert.equal(new Set(r.commands.map((c) => c.commandId)).size, 2);
});

test("C3 · BOUNDED · FIRING CONTROL: a command names its scope, what must never happen and its stop conditions — one missing any is refused", () => {
  const ok = run([action()]).commands[0].text;
  for (const h of ["SCOPE (only these):", "MUST NEVER HAPPEN:", "STOP IF:"]) assert.ok(ok.includes(h), `${h} is missing`);
  for (const [k, code] of [["scope", COMMAND_REFUSAL.NO_SCOPE], ["never", COMMAND_REFUSAL.NO_NEVER], ["stop", COMMAND_REFUSAL.NO_STOP]]) {
    assert.equal(run([action({ [k]: [] })]).refused[0]?.refused, code, `a command with no ${k} was made`);
    assert.equal(run([action({ [k]: ["  "] })]).refused[0]?.refused, code, `a command with a blank ${k} was made`);
  }
});

test("C4 · PROOF STEPS · FIRING CONTROL: a command lists how to prove the change landed — none is refused", () => {
  assert.ok(run([action()]).commands[0].text.includes("PROVE IT LANDED:\n- x is green"));
  assert.equal(run([action({ proofs: [] })]).refused[0]?.refused, COMMAND_REFUSAL.NO_PROOF);
});

test("C5 · NO SECRETS · FIRING CONTROL: a credential is named by its name only — a secret-shaped value anywhere in the command is refused by path and detector, never by value", () => {
  assert.equal(run([action({ never: ["DATABASE_URL printed or written to disk"] })]).commands.length, 1, "naming a credential by name was refused");
  const planted = "password=" + "Zq8".repeat(5);
  const r = run([action({ change: `set it with ${planted}` })]);
  assert.equal(r.refused[0]?.refused, COMMAND_REFUSAL.SECRET, "a secret value reached a command");
  assert.ok(!JSON.stringify(r).includes(planted.slice(9)), "the refusal carries the secret value");
});

const BATCH = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "approved-actions-2026-10-18.json"));
test("REAL · the batch's approved actions: every one rests on an owner decision of the governance repository and gives exactly one command, bounded, with its proof steps and no secret value", { skip: HERE ? false : "the batch's approved actions are not on this machine" }, () => {
  const { actions } = JSON.parse(readFileSync(join(BATCH, "approved-actions-2026-10-18.json"), "utf8"));
  const r = generateCommands({ actions, corpus: AUTHORITY_CORPUS });
  assert.ok(actions.length >= 3, "too few real actions to believe the result");
  assert.deepEqual(r.refused, [], `a real action was refused: ${JSON.stringify(r.refused)}`);
  assert.equal(r.commands.length, actions.length, "commands ≠ approved actions");
  for (const a of actions) assert.ok(approvalOf(a, AUTHORITY_CORPUS).record, `${a.actionId} rests on no admitted owner decision`);
  for (const c of r.commands) for (const h of ["SCOPE (only these):\n- ", "MUST NEVER HAPPEN:\n- ", "STOP IF:\n- ", "PROVE IT LANDED:\n- "]) assert.ok(c.text.includes(h), `${c.actionId}: ${h.split(":")[0]} is empty`);
  assert.deepEqual(findSecrets(r.commands.map((c) => c.text)), [], "a real command holds a secret value");
  console.log(`  REAL (count-only): approved actions ${actions.length} · commands ${r.commands.length} · refused ${r.refused.length} · approval records ${new Set(actions.map((a) => a.approval.path)).size} (owner decisions in _handoffs) · secret values 0`);
});

test("ENTRY · bin/implementation-commands.mjs: counts and command ids only by default; a bad call is a usage exit", { skip: HERE ? false : "the batch's approved actions are not on this machine" }, () => {
  const go = (args) => spawnSync(process.execPath, ["bin/implementation-commands.mjs", "--subject=almi-oet", "--research-batch=rr254-test-pages-2026-10-12", ...args, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  const r = go(["--actions=approved-actions-2026-10-18.json"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /actions {10}\d+ filed · commands \d+ · refused 0/);
  assert.doesNotMatch(r.stdout, /MUST NEVER HAPPEN/, "a command's text was printed without --show");
  assert.equal(go(["--actions=other.json"]).status, 2);
});

test("the generator names no product and loads no module that can make a network, process, connector or paid call — and each control fires", () => {
  const F = "src/governance/implementation-commands.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
