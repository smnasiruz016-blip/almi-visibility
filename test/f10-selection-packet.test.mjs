/**
 * 🔴 F10 · C3 · THE ONE GOVERNED SELECTION AND THE OWNER'S LABELLING PACKET — its preconditions, its one-way door, the staged
 * labelling with durable progress, and the preflight that refuses an incomplete key.
 *
 * 🔴 NO TEST HERE COMPUTES THE REAL SELECTION. C3 (2ee6c2a): "the selection membership is computed only by the governed selection
 * act". Every proof runs on a CONSTRUCTED population with the REAL committed capacities (142 · 62 · 27 · 12 · 5 · 2 · 2 · 2 · 2),
 * constructed identities (computed, never literal) and constructed wording, in OS temporary stores. The real counts come only from
 * the one act. The production audit trail is hashed before and after.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";
import { COMMITTED_ACCOUNTING, PROTOCOL as C6_PROTOCOL } from "../config/human-questions.mjs";
import { C7_BAR, C7_PROTOCOL } from "../config/follow-up-questions.mjs";
import { planSelection, sealSelection, SelectionRefused, SEALED_LAYOUT, OWNER_README } from "../src/discovery/f10-selection.mjs";
import { F10_VERSIONS, versionStates } from "../src/discovery/f10-versions.mjs";
import { TASKS, parseAnswer, recordAnswer, standing, finishTask, readProgress, LabellingRefused } from "../src/discovery/f10-labelling.mjs";
import { versionHash } from "../src/governance/governed-scoring.mjs";
import { parseKeyRows, keyCommitment, parsePairStructure } from "../src/heldout/lifecycle.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();
const CONFINED_ENV = { ...process.env, NODE_TEST_CONTEXT: "child-v8", NODE_TEST_WORKER_ID: process.env.NODE_TEST_WORKER_ID || "1" };
const ENV_REF = SEALED_STORE_ROOTS["f10-marking-key"].name;

/* ── A constructed account with the REAL committed capacities and totals ── */
const RUN = Math.random().toString(36).slice(2, 8);
const WORDS = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa"];
function account({ caps = COMMITTED_ACCOUNTING.eligibleCapacitiesDescending, reverse = false } = {}) {
  const eligibleItems = new Map(caps.map((cap, t) => [`tenant:${sha(`${RUN}|t${t}`).slice(0, 32)}`, Array.from({ length: cap }, (_, k) => {
    const itemId = `obs${sha(`${RUN}|o`).slice(0, 12)}:${t * 1000 + k}`;
    return { itemId, rowIndex: t * 1000 + k, query: `${WORDS[k % 10]} ${WORDS[(k * 3 + t) % 10]} ${WORDS[(k * 7 + 1) % 10]}`, sourceRowIds: [itemId] };
  })]));
  const ordered = reverse ? new Map([...eligibleItems].reverse().map(([t, it]) => [t, [...it].reverse()])) : eligibleItems;
  const c = COMMITTED_ACCOUNTING;
  return {
    eligibleItems: ordered, remainder: 0,
    totals: { start: c.start, unattributed: c.unattributed, operator: c.operator, retired: c.retired, crossTenantDuplicates: c.crossTenantDuplicates, withinTenantDuplicates: c.withinTenantDuplicates, eligible: c.eligible, byFamily: { ...c.byFamily } },
    perTenant: new Map([...ordered].map(([t, it]) => [t, { eligible: it.length }])),
  };
}
const versions = () => F10_VERSIONS.map((v) => ({ role: v.role, id: v.id, codeHash: versionHash(REPO, v.files) }));
const frozenBefore = (at = "2026-09-27T01:00:00Z") => versions().map((v) => ({ action: "HELDOUT_MECHANISM_FROZEN", occurredAt: at, metadata: { mechanismId: v.id, mechanismHash: v.codeHash } }));
const NOW = "2026-09-27T02:00:00Z";
const plan = (over = {}) => planSelection({ versions: versions(), freezes: frozenBefore(), account: account(), committed: COMMITTED_ACCOUNTING, K: C7_BAR.candidatesPerNeed, now: NOW, ...over });
const refused = (fn, code, why) => assert.throws(fn, (e) => e instanceof SelectionRefused && e.code === code, why);
const tmpStore = () => fs.mkdtempSync(join(os.tmpdir(), "f10sel-"));

/* ═══ THE SELECTION — counts on the real committed capacities, never the real population ══════════════════════════════════ */

test("F10 · SELECT · on the committed capacities the plan selects 100 = 37 + 22 + 16 + 12 + 5 + 2 + 2 + 2 + 2, remainder 0, EXACTLY 192 matched pairs with at most one re-pair each, and SIX of nine tenants consumed to capacity", () => {
  const p = plan();
  assert.deepEqual(p.counts.seatsDescending, [37, 22, 16, 12, 5, 2, 2, 2, 2]);
  assert.deepEqual([p.counts.eligible, p.counts.tenants, p.counts.selected, p.counts.remainder], [256, 9, 100, 0]);
  assert.equal(p.counts.matched, 192, "the matched pairs are not K per need");
  assert.ok(p.counts.repaired > 0 && p.counts.repaired <= 192, "the re-paired negative controls are absent or exceed the matched pairs");
  assert.equal(p.counts.pairs, p.counts.matched + p.counts.repaired);
  assert.equal(p.counts.estimatedPairs, 374, "the packet's estimate on constructed identities moved");
  assert.equal(p.counts.tenantsConsumedToCapacity, 6, "the one-way-door count is not six");
  assert.match(p.commitments.set, /^[0-9a-f]{64}$/);
  assert.equal(parsePairStructure(p.pairs.map((x) => x.id)).links.length, p.counts.repaired, "the sealed pair set does not parse in the lifecycle grammar");
});

test("F10 · SELECT · within a tenant its seats go to the LOWEST identity hashes (D5b) — the same rows whatever the input order — CONTROL: the rows are not simply the first ones", () => {
  const a = plan(), b = plan({ account: account({ reverse: true }) });
  const ids = (p) => [...p.selected.values()].flat().map((x) => x.itemId).sort();
  assert.deepEqual(ids(b), ids(a), "the selection depends on the input order");
  for (const [t, chosen] of a.selected) {
    const all = account().eligibleItems.get(t);
    const worst = Math.max(...chosen.map((x) => parseInt(sha(x.itemId).slice(0, 12), 16)));
    const unchosen = all.filter((x) => !chosen.includes(x) && !chosen.some((c) => c.itemId === x.itemId));
    assert.ok(unchosen.every((x) => parseInt(sha(x.itemId).slice(0, 12), 16) > worst), "a row with a lower identity hash was passed over");
  }
  const t0 = [...a.selected.keys()].sort((x, y) => account().eligibleItems.get(y).length - account().eligibleItems.get(x).length)[0]; // the largest tenant: seats < rows, so "first rows" is a real alternative
  assert.notDeepEqual(a.selected.get(t0).map((x) => x.itemId), account().eligibleItems.get(t0).slice(0, a.selected.get(t0).length).map((x) => x.itemId), "CONTROL: the lowest hashes happen to be the first rows — the control would be vacuous");
});

test("F10 · SELECT · every precondition REFUSES, named: a version not frozen at this code, a freeze not before the selection, an unreconciled population, an allocation not the frozen one", () => {
  const vs = versions();
  refused(() => plan({ freezes: frozenBefore().slice(1) }), "VERSION_NOT_FROZEN_AT_THIS_CODE", "a selection ran with a version never frozen");
  refused(() => plan({ freezes: frozenBefore().map((e, i) => (i === 1 ? { ...e, metadata: { ...e.metadata, mechanismHash: "a".repeat(64) } } : e)) }), "VERSION_NOT_FROZEN_AT_THIS_CODE", "a selection ran with an EXPIRED version (frozen only at other code)");
  refused(() => plan({ freezes: frozenBefore(NOW) }), "FREEZE_NOT_BEFORE_SELECTION", "a selection ran with a freeze recorded at the same instant");
  const acc = account(); acc.totals.eligible = 255;
  refused(() => plan({ account: acc }), "POPULATION_NOT_RECONCILED", "an unreconciled population was selected from");
  refused(() => plan({ committed: { ...COMMITTED_ACCOUNTING, allocationDescending: [38, 21, 16, 12, 5, 2, 2, 2, 2] } }), "ALLOCATION_NOT_FROZEN", "an allocation other than the frozen one was used");
  assert.equal(vs.length, 4, "the four F10 versions are not all declared");
});

test("F10 · SELECT · the REAL trail: each F10 version's state is measured, never assumed — and until all four are FROZEN at this code, a selection is refused", () => {
  const events = fs.readFileSync(join(REPO, "audit-trail", "events.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const states = versionStates(REPO, events);
  assert.equal(states.length, 4);
  for (const s of states) assert.ok(["FROZEN", "EXPIRED", "NOT_FROZEN"].includes(s.state));
  if (states.some((s) => s.state !== "FROZEN")) refused(() => plan({ freezes: events.filter((e) => e.action === "HELDOUT_MECHANISM_FROZEN") }), "VERSION_NOT_FROZEN_AT_THIS_CODE", "the real trail's unfrozen version did not refuse the selection");
});

/* ═══ THE SEAL — one door, opened once, into storage S only ═══════════════════════════════════════════════════════════════ */

test("F10 · SEAL · the packet is written into S ONCE — a second seal is ALREADY_SEALED, an unlocated store refuses — and its queues carry no mechanism output", () => {
  const S = tmpStore();
  try {
    const p = plan();
    const written = sealSelection({ store: S, plan: p, ownerReadme: OWNER_README });
    for (const rel of Object.values(SEALED_LAYOUT)) assert.ok(written.includes(rel) && fs.existsSync(join(S, rel)), `${rel} was not written`);
    assert.equal(fs.readFileSync(join(S, SEALED_LAYOUT.set), "utf8").trim().split("\n").length, 100);
    assert.equal(fs.readFileSync(join(S, SEALED_LAYOUT.pairs), "utf8").trim().split("\n").length, p.counts.pairs);
    refused(() => sealSelection({ store: S, plan: p, ownerReadme: OWNER_README }), "ALREADY_SEALED", "the door opened twice");
    refused(() => sealSelection({ store: join(S, "absent"), plan: p, ownerReadme: OWNER_README }), "SEALED_STORE_UNLOCATED", "an unlocated store was written");
    for (const q of [SEALED_LAYOUT.c6Queue, SEALED_LAYOUT.c7Queue]) {
      const rows = fs.readFileSync(join(S, q), "utf8").trim().split("\n").map((l) => JSON.parse(l));
      for (const r of rows) assert.deepEqual(Object.keys(r).filter((k) => !["n", "item", "question", "pair", "first", "next"].includes(k)), [], "a queue carries a field beyond what the owner needs");
    }
    assert.match(fs.readFileSync(join(S, SEALED_LAYOUT.readme), "utf8"), /node bin\/f10-label\.mjs c6/);
  } finally { fs.rmSync(S, { recursive: true, force: true }); }
});

test("F10 · SEAL · THROUGH THE BOUNDARY: authorised, ATTEMPTED, sealed once with ONE count-only record, COMMITTED; a retry runs nothing; a refused plan and a sealed store are refused before any attempt, writing nothing", async () => {
  const { governedSealing, SEAL_RECORD_STORE } = await import("../src/discovery/f10-selection.mjs");
  const { executeGovernedWrite } = await import("../src/governance/governed-write.mjs");
  const { governedAuditContext } = await import("../src/governance/governed-run.mjs");
  const S = tmpStore(), repo = fs.mkdtempSync(join(os.tmpdir(), "f10sel-repo-"));
  const nonce = `f10sel-route-${Math.random().toString(16).slice(2, 8)}`;
  try {
    const a = governedAuditContext({ repo: REPO, env: { ...CONFINED_ENV, ALMIVISIBILITY_AUDIT_RUN: nonce }, correlationId: `run:f10sel:${nonce}`, authorityRef: { propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: ["ALMIVISIBILITY"] }, authorityHash: "d".repeat(64) });
    assert.equal(a.synthetic, true, "the audit context is not confined — refusing to touch the production trail");
    const audit = { ...a, actor: "test/f10sel" };
    const permission = { mayWrite: true, actorRef: "actor:cc", reason: "test" };
    const run = (over) => executeGovernedWrite({ ...governedSealing({ repo, permission, audit, store: S, plan: plan(), ownerReadme: OWNER_README, occurredAt: "2026-09-26T12:00:00Z", ...over }), onAuthorisationRefused: () => {} });
    const refusedPlan = run({ plan: null, planFault: new SelectionRefused("VERSION_NOT_FROZEN_AT_THIS_CODE", "x") });
    assert.equal(refusedPlan.outcome, "FAILED_BEFORE_COMMIT", "a refused plan was attempted");
    assert.ok(refusedPlan.faults.some((f) => f.code === "VERSION_NOT_FROZEN_AT_THIS_CODE"));
    assert.deepEqual(fs.readdirSync(S), [], "a refused plan wrote into S");
    assert.equal(run().outcome, "COMMITTED", "the lawful seal did not commit");
    const recs = fs.readFileSync(join(repo, SEAL_RECORD_STORE), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(recs.length, 1);
    assert.deepEqual([recs[0].selected, recs[0].remainder, recs[0].tenantsConsumedToCapacity], [100, 0, 6]);
    assert.match(recs[0].oneWayDoor, /SEALING IS IRREVERSIBLE/);
    const text = JSON.stringify(recs) + JSON.stringify(audit.store.readAll().events);
    for (const x of [...plan().selected.values()].flat().slice(0, 30)) assert.ok(!text.includes(x.itemId) && !text.includes(x.query), "an identity or a wording crossed out of S");
    assert.equal(run().outcome, "ALREADY_COMMITTED", "a retry of the seal ran again");
    fs.rmSync(join(repo, SEAL_RECORD_STORE));
    const again = run();
    assert.ok(again.faults.some((f) => f.code === "ALREADY_SEALED"), "a sealed store was sealed again");
  } finally {
    fs.rmSync(S, { recursive: true, force: true }); fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true });
  }
});

/* ═══ THE LABELLING — staged, durable, and a preflight that refuses an incomplete key ════════════════════════════════════ */

function sealedPacket() {
  const S = tmpStore();
  sealSelection({ store: S, plan: plan(), ownerReadme: OWNER_README });
  return S;
}

test("F10 · LABEL · answers parse exactly as the owner is told — anything else is refused, never guessed", () => {
  assert.deepEqual(parseAnswer("c6", "gq").answer, { classes: ["GOAL", "QUESTION"] });
  assert.deepEqual(parseAnswer("c6", "F C").answer, { classes: ["CONCERN", "CONFUSION"] });
  assert.deepEqual(parseAnswer("c6", "0").answer, { classes: [] });
  assert.deepEqual(parseAnswer("c6", "p").answer, { exclusion: "EXCLUDED_PERSONAL" });
  assert.deepEqual(parseAnswer("c7", "y").answer, { classes: ["LIKELY_NEXT"] });
  assert.deepEqual(parseAnswer("c7", "n").answer, { classes: [] });
  assert.deepEqual(parseAnswer("c7", "t").answer, { exclusion: "CANNOT_TELL" });
  for (const [t, bad] of [["c6", "gx"], ["c6", "gg"], ["c6", ""], ["c7", "yes please"], ["c7", "gq"], ["c7", "0"]]) assert.ok(parseAnswer(t, bad).error, `${t} accepted "${bad}"`);
});

test("F10 · LABEL · progress SURVIVES interruption: every answer is on disk when recorded; a new sitting starts at the first unanswered one; a changed answer replaces the old", () => {
  const S = sealedPacket();
  try {
    const q = fs.readFileSync(join(S, TASKS.c6.queue), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    recordAnswer(S, "c6", q[0].item, { classes: ["GOAL"] }, "2026-09-27T03:00:00Z");
    recordAnswer(S, "c6", q[1].item, { classes: [] }, "2026-09-27T03:00:01Z");
    // "the window was closed": a fresh read from disk is the only memory
    assert.deepEqual(standing(S, "c6"), { total: 100, answered: 2, next: 3 }, "progress did not survive a new sitting");
    recordAnswer(S, "c6", q[0].item, { classes: ["QUESTION"] }, "2026-09-27T03:00:02Z");
    assert.deepEqual(readProgress(S, "c6").get(q[0].item), { classes: ["QUESTION"] }, "a corrected answer did not replace the old one");
    assert.equal(standing(S, "c6").answered, 2);
  } finally { fs.rmSync(S, { recursive: true, force: true }); }
});

test("F10 · LABEL · THE PREFLIGHT REFUSES AN INCOMPLETE KEY — nothing is written and the one run is untouched — CONTROL: the complete key is written in the scorer's own key format", () => {
  const S = sealedPacket();
  try {
    for (const task of ["c6", "c7"]) {
      const q = fs.readFileSync(join(S, TASKS[task].queue), "utf8").trim().split("\n").map((l) => JSON.parse(l));
      const ids = q.map((x) => x.item ?? x.pair);
      ids.slice(0, -1).forEach((id, n) => recordAnswer(S, task, id, n % 3 === 0 ? { exclusion: "CANNOT_TELL" } : { classes: task === "c6" ? ["GOAL"] : ["LIKELY_NEXT"] }, "2026-09-27T03:00:00Z"));
      assert.throws(() => finishTask(S, task), (e) => e instanceof LabellingRefused && e.code === "KEY_INCOMPLETE", `${task}: an incomplete key was not refused`);
      assert.ok(!fs.existsSync(join(S, TASKS[task].key)), `${task}: an incomplete key was written`);
      recordAnswer(S, task, ids.at(-1), { classes: [] }, "2026-09-27T03:00:05Z");
      const r = finishTask(S, task);
      assert.equal(r.rows, ids.length, `${task}: CONTROL: the complete key was not written`);
      const text = fs.readFileSync(join(S, TASKS[task].key), "utf8");
      assert.equal(r.commitment, keyCommitment({ [TASKS[task].key]: Buffer.from(text) }));
      const protocol = task === "c6" ? C6_PROTOCOL : C7_PROTOCOL;
      const parsed = parseKeyRows([text], { classes: protocol.classes, exclusions: protocol.exclusions });
      assert.ok(!parsed.fault && parsed.rows.size === ids.length, `${task}: the written key is not in the scorer's key format (${parsed.fault})`);
      assert.deepEqual(finishTask(S, task), r, `${task}: finishing twice changed the key`);
    }
  } finally { fs.rmSync(S, { recursive: true, force: true }); }
});

/* ═══ THE ENTRY POINTS — confined, synthetic store ════════════════════════════════════════════════════════════════════════ */

test("F10 · LABEL · REAL entry point · judging needs a real terminal — an automated caller is REFUSED outside a verified test context; inside one, a piped answer is saved and `finish` says NOT YET", () => {
  const S = sealedPacket();
  try {
    const run = (args, env, input) => spawnSync(process.execPath, ["bin/f10-label.mjs", ...args], { cwd: REPO, encoding: "utf8", env, input, timeout: 120_000 });
    const plainEnv = { ...process.env, [ENV_REF]: S }; delete plainEnv.NODE_TEST_CONTEXT; delete plainEnv.NODE_TEST_WORKER_ID;
    const bot = run(["c6"], plainEnv, "gq\n");
    assert.equal(bot.status, 4, "an automated caller was allowed to label");
    assert.equal(standing(S, "c6").answered, 0, "an automated caller's answer was saved");
    const piped = run(["c6"], { ...CONFINED_ENV, [ENV_REF]: S }, "gq\ns\n");
    assert.equal(piped.status, 0, piped.stderr);
    assert.equal(standing(S, "c6").answered, 1, "CONTROL: a piped answer in a verified test context was not saved");
    const fin = run(["finish", "c6"], { ...CONFINED_ENV, [ENV_REF]: S });
    assert.equal(fin.status, 3);
    assert.match(fin.stderr, /NOT YET — KEY_INCOMPLETE: 99 of 100 still to judge/);
    assert.ok(!fin.stdout.includes(S) && !fin.stderr.includes(S), "the store's location was printed");
  } finally { fs.rmSync(S, { recursive: true, force: true }); }
});

test("F10 · SELECT · REAL entry point · without every version frozen at this code the seal is REFUSED and nothing is written into S — and a dry run writes nothing either", () => {
  const before = prodHashes();
  const S = tmpStore();
  const nonce = `f10sel-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  try {
    const env = { ...CONFINED_ENV, ALMIVISIBILITY_AUDIT_RUN: nonce, [ENV_REF]: S };
    const dry = spawnSync(process.execPath, ["bin/f10-select.mjs", "seal", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", env, timeout: 180_000 });
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /\[dry-run\]/);
    const r = spawnSync(process.execPath, ["bin/f10-select.mjs", "seal", "--actor=actor:cc", "--confirm"], { cwd: REPO, encoding: "utf8", env, timeout: 180_000 });
    assert.notEqual(r.status, 0, "a seal ran with no version frozen on the (confined) trail");
    assert.match(r.stdout + r.stderr, /VERSION_NOT_FROZEN_AT_THIS_CODE/);
    assert.deepEqual(fs.readdirSync(S), [], "a refused seal wrote into S");
    assert.ok(!(r.stdout + r.stderr).includes(S), "the store's location was printed");
  } finally {
    fs.rmSync(S, { recursive: true, force: true });
    fs.rmSync(join(REPO, ".test-scratch", "audit", `run-${nonce}`), { recursive: true, force: true });
  }
  assert.deepEqual(prodHashes(), before, "a confined entry-point run changed the production trail");
});

test("F10 · SELECT · residue: every constructed store is removed", () => {
  assert.deepEqual(fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith("f10sel-")), []);
});

test("F10 · SELECT · the production audit trail is byte-identical after every proof in this file", () => {
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
