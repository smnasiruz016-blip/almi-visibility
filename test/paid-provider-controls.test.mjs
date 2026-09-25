/**
 * 🔴 ITEM 47 — PAID PROVIDER CONTROLS, BUILT BEFORE ANY PAID PROVIDER EXISTS.
 *
 * Every test here drives a FAKE provider (a test double that makes no request and
 * holds no account). One test per control, so removing a control turns exactly
 * its own test red — see runs/cost/paid-provider-controls-red-2026-09-13.txt.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  createPaidProviderGate, createKillSwitch, createFakePaidProvider, PaidCallRefused, REFUSAL_CODES, entryFromRefusedPaidCall, paidProviderRef,
} from "../src/cost/paid-provider-gate.mjs";
import { createCostLedger, formatLedgerLine } from "../src/cost/ledger.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const NAME = "fake-paid-provider";
const complete = (over = {}) => ({ provider: NAME, authorizedBy: "owner", date: "2026-09-13", reason: "item 47 control test against a fake provider", budget: { amount: 100, currency: "USD" }, cap: { maxCalls: 50 }, ...over });

/* F04: step 0 of every call is the one authorisation decision. These tests exercise the gate's OWN limits, so they pass
 * an in-memory TEST DOUBLE of the approval registry (accepted only because every provider here is a declared fake);
 * REAL is the recorded registry, which holds no SPEND approval — so a real spend is refused NOT_AUTHORISED_BY_F04. */
const SCOPE = Object.freeze({ scopeType: "TENANT", tenantId: "tenant:00000000000000000000000000000f02" });
const DOUBLE_ID = "approval:paid-gate-test-double";
const DOUBLE = { actorRef: "actor:cc", approvalRef: DOUBLE_ID, scope: SCOPE, approvals: { readable: true, events: 1, approvals: new Map([[DOUBLE_ID, {
  approvalId: DOUBLE_ID, approverRef: "actor:owner", approverClass: "HUMAN", executorRef: "actor:cc", executorClass: "AUTOMATION",
  action: "CALL_PAID_PROVIDER", resource: { resourceClass: "PAID_PROVIDER", resourceRef: paidProviderRef("fake-paid-provider") }, scope: SCOPE,
  decision: "APPROVED", oneUse: false, expiresAt: null, revoked: false, consumed: false,
}]]) } };
const REAL = { actorRef: "actor:cc", approvalRef: null, scope: SCOPE };

function rig({ authorizations = [], price } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "almivis-paid-"));
  const ledger = createCostLedger(join(dir, "ledger.jsonl"));
  const fake = createFakePaidProvider({ name: NAME, ...(price ? { pricePerCall: price } : {}) });
  const killSwitch = createKillSwitch();
  const gate = createPaidProviderGate({ providers: { [NAME]: fake }, authorizations, killSwitch, ledger, spendAuthority: DOUBLE });
  return { dir, ledger, fake, killSwitch, gate, done: () => rmSync(dir, { recursive: true, force: true }) };
}
const refusedWith = async (promise, code) => {
  await assert.rejects(promise, (e) => e instanceof PaidCallRefused && e.code === code, `expected a refusal with ${code}`);
};

test("🔴 CONTROL 1 · OFF BY DEFAULT — no authorization, no budget, no cap: REFUSED, and the provider is never called", async () => {
  const r = rig();
  try {
    await refusedWith(r.gate.call(NAME, { q: 1 }), "NOT_AUTHORIZED");
    await refusedWith(r.gate.call(NAME, { q: 2 }), "NOT_AUTHORIZED");
    assert.equal(r.fake.callsReceived(), 0, "an unauthorized paid call reached the provider");
  } finally {
    r.done();
  }
});

test("🔴 CONTROL 2 · EXPLICIT AUTHORIZATION — unnamed, undated, reasonless, budgetless or capless authorizes NOTHING", async () => {
  // the first case is complete in every way except the name — so without this control it WOULD go through
  const cases = [{ authorizedBy: "" }, { date: "13 Sep" }, { reason: "" }, { budget: null }, { cap: null }, { budget: { amount: 100, currency: "EUR" } }];
  for (const over of cases) {
    const r = rig({ authorizations: [complete(over)] });
    try {
      await refusedWith(r.gate.call(NAME, {}), "AUTHORIZATION_INCOMPLETE");
      assert.equal(r.fake.callsReceived(), 0, `an incomplete authorization (${JSON.stringify(over)}) let a paid call through`);
    } finally {
      r.done();
    }
  }
  // per provider: an authorization for ANOTHER provider is no authorization for this one
  const other = rig({ authorizations: [complete({ provider: "some-other-provider" })] });
  try {
    await refusedWith(other.gate.call(NAME, {}), "NOT_AUTHORIZED");
  } finally {
    other.done();
  }
  // CONTROL: a complete authorization is honoured
  const ok = rig({ authorizations: [complete()] });
  try {
    const res = await ok.gate.call(NAME, { q: "allowed" });
    assert.equal(res.calls, 1);
    assert.equal(ok.fake.callsReceived(), 1);
  } finally {
    ok.done();
  }
});

test("🔴 CONTROL 3 · KILL SWITCH — flips, and the very next call is REFUSED", async () => {
  const r = rig({ authorizations: [complete()] });
  try {
    await r.gate.call(NAME, { q: "before" });
    const state = r.killSwitch.flip({ by: "owner", reason: "item 47 kill switch exercised", at: "2026-09-13T12:00:00.000Z" });
    assert.equal(r.killSwitch.isOn(), true);
    await refusedWith(r.gate.call(NAME, { q: "after" }), "KILL_SWITCH_ON");
    assert.equal(r.fake.callsReceived(), 1, "a call went through after the kill switch was flipped");
    assert.deepEqual(state, { by: "owner", reason: "item 47 kill switch exercised", at: "2026-09-13T12:00:00.000Z" });
    assert.throws(() => createKillSwitch().flip({ by: "", reason: "x", at: "y" }), /all required/);
  } finally {
    r.done();
  }
});

test("🔴 CONTROL 4a · CAP — the call that WOULD exceed the cap is REFUSED BEFORE it is made", async () => {
  const r = rig({ authorizations: [complete({ cap: { maxCalls: 2 } })] });
  try {
    await r.gate.call(NAME, {});
    await r.gate.call(NAME, {});
    await refusedWith(r.gate.call(NAME, {}), "CAP_WOULD_BE_EXCEEDED");
    assert.equal(r.fake.callsReceived(), 2, "the call past the cap reached the provider");
  } finally {
    r.done();
  }
});

test("🔴 CONTROL 4b · BUDGET — the call that WOULD exceed the budget is REFUSED BEFORE it is made", async () => {
  const r = rig({ authorizations: [complete({ budget: { amount: 1, currency: "USD" } })], price: { amount: 0.4, currency: "USD" } });
  try {
    await r.gate.call(NAME, {});
    await r.gate.call(NAME, {});
    await refusedWith(r.gate.call(NAME, {}), "BUDGET_WOULD_BE_EXCEEDED");
    assert.equal(r.fake.callsReceived(), 2, "the call past the budget reached the provider");
    assert.equal(r.gate.spendOf(NAME).calls, 2);
  } finally {
    r.done();
  }
});

test("🔴 a gate cannot be BUILT without a kill switch or a ledger — absence is the FAILURE, so absence is refused", () => {
  const fake = createFakePaidProvider();
  const dir = mkdtempSync(join(tmpdir(), "almivis-paid-"));
  try {
    const ledger = createCostLedger(join(dir, "l.jsonl"));
    assert.throws(() => createPaidProviderGate({ providers: { [NAME]: fake }, ledger, spendAuthority: DOUBLE }), /no kill switch/);
    assert.throws(() => createPaidProviderGate({ providers: { [NAME]: fake }, killSwitch: createKillSwitch(), spendAuthority: DOUBLE }), /no ledger/);
    // F04: nor without the one decision's authority — and a test double never reaches a provider that is not a fake
    assert.throws(() => createPaidProviderGate({ providers: { [NAME]: fake }, killSwitch: createKillSwitch(), ledger }), /no F04 spend authority/);
    assert.throws(() => createPaidProviderGate({ providers: { real: { invoke: async () => ({}), pricePerCall: { amount: 1, currency: "USD" } } }, killSwitch: createKillSwitch(), ledger, spendAuthority: DOUBLE }), /only when every provider is a declared fake/);
    // CONTROL: the same real-shaped provider under the RECORDED registry builds (and is then decided by F04 at each call)
    assert.ok(createPaidProviderGate({ providers: { real: { invoke: async () => ({}), pricePerCall: { amount: 1, currency: "USD" } } }, killSwitch: createKillSwitch(), ledger, spendAuthority: REAL }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 1D · EVERY refused call is in the cost ledger as REFUSED with its code and reason — none leaves no trace", async () => {
  const dir = mkdtempSync(join(tmpdir(), "almivis-paid-"));
  try {
    const ledger = createCostLedger(join(dir, "ledger.jsonl"));
    const fake = createFakePaidProvider({ name: NAME, pricePerCall: { amount: 0.4, currency: "USD" } });
    const killSwitch = createKillSwitch();
    // 🔴 ONE FROZEN CLOCK FOR EVERY GATE. Refusals in the same millisecond, from gates whose counters
    // restart, are exactly how the first version's ids collided and the ledger dropped two of five.
    const frozen = () => new Date("2026-09-13T12:00:00.000Z");
    const run = async (authorizations, fn, spendAuthority = DOUBLE) => {
      const gate = createPaidProviderGate({ providers: { [NAME]: fake }, authorizations, killSwitch, ledger, now: frozen, spendAuthority });
      return fn(gate);
    };
    let refused = 0;
    const attempt = async (p) => p.then(() => {}, (e) => { if (e instanceof PaidCallRefused) refused += 1; else throw e; });
    await run([complete()], (g) => attempt(g.call(NAME, {})), REAL); // F04: a real spend with no recorded approval
    await run([], (g) => attempt(g.call(NAME, {})));
    await run([complete({ date: "" })], (g) => attempt(g.call(NAME, {})));
    await run([complete({ cap: { maxCalls: 1 } })], async (g) => { await attempt(g.call(NAME, {})); await attempt(g.call(NAME, {})); });
    await run([complete({ budget: { amount: 0.5, currency: "USD" } })], async (g) => { await attempt(g.call(NAME, {})); await attempt(g.call(NAME, {})); });
    killSwitch.flip({ by: "owner", reason: "ledger trace test", at: "2026-09-13T12:00:00.000Z" });
    await run([complete()], (g) => attempt(g.call(NAME, {})));

    assert.equal(refused, 6);
    const entries = ledger.readAll();
    const refusedEntries = entries.filter((e) => e.outcome === "REFUSED");
    assert.equal(refusedEntries.length, refused, `${refused} calls were refused and ${refusedEntries.length} left a trace in the ledger`);
    assert.deepEqual(refusedEntries.map((e) => e.refusal.code).sort(), [...REFUSAL_CODES].sort());
    for (const e of refusedEntries) {
      assert.ok(e.refusal.reason.length >= 20);
      assert.deepEqual([e.money.amount, e.providerCalls.total, e.run_kind], [0, 0, "paid-provider-call"]);
      assert.match(e.money.basis, /REFUSED before the call was issued/);
      assert.match(formatLedgerLine(e), new RegExp(`REFUSED\\(${e.refusal.code}\\)`));
    }
    assert.equal(fake.callsReceived(), 2, "only the two calls inside cap and budget reached the provider");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a refusal entry cannot be written without a known code and a real reason", () => {
  assert.throws(() => entryFromRefusedPaidCall({ at: "2026-09-13T00:00:00Z", seq: 1, provider: NAME, code: "FELT_EXPENSIVE", reason: "a reason long enough to pass" }), /not one of/);
  assert.throws(() => entryFromRefusedPaidCall({ at: "2026-09-13T00:00:00Z", seq: 1, provider: NAME, code: "NOT_AUTHORIZED", reason: "no" }), /without its reason/);
});

/* ---- RECORDED: the demonstration run against the fake provider ----------- */

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRANSCRIPT = `${REPO}runs/cost/paid-provider-controls-2026-09-13.txt`;

/* The demonstration was recorded on 13 Sep 2026, BEFORE F04 added step 0 — so it holds the five codes that existed then.
 * Pinned by name, not by the current list, so the historical record is checked against what it could contain. */
const RECORDED_CODES = Object.freeze(["NOT_AUTHORIZED", "AUTHORIZATION_INCOMPLETE", "KILL_SWITCH_ON", "CAP_WOULD_BE_EXCEEDED", "BUDGET_WOULD_BE_EXCEEDED"]);
test("🔴 RECORDED: the demonstration run's five refusals are in the REAL cost ledger, one per code, each against the FAKE provider", { skip: !existsSync(TRANSCRIPT) && "the demonstration has not been recorded" }, () => {
  assert.deepEqual(REFUSAL_CODES.filter((c) => !RECORDED_CODES.includes(c)), ["NOT_AUTHORISED_BY_F04"], "a refusal code changed other than F04's step 0");
  const entries = createJsonlStore(`${REPO}runs/cost/ledger.jsonl`).readAll().filter((e) => e.run_kind === "paid-provider-call");
  const refused = entries.filter((e) => e.outcome === "REFUSED");
  assert.equal(refused.length, entries.length, "a paid-provider entry in the ledger is not a refusal");
  assert.deepEqual(refused.map((e) => e.refusal.code).sort(), [...RECORDED_CODES].sort());
  for (const e of refused) {
    assert.equal(e.refusal.fake, true);
    assert.match(e.run_ref, /FAKE provider/);
  }
  const transcript = readFileSync(TRANSCRIPT, "utf8");
  for (const code of RECORDED_CODES) assert.match(transcript, new RegExp(`REFUSED ${code}`));
  assert.match(transcript, /calls that reached the fake provider: 2/);
  assert.match(transcript, /no real paid provider was called and no account exists/);
});
