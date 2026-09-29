#!/usr/bin/env node
/**
 * ITEM 47 — EXERCISE THE PAID-PROVIDER CONTROLS AGAINST A FAKE PROVIDER.
 *
 *   node bin/paid-provider-controls.mjs            dry run: the refusals are shown, nothing is recorded
 *   node bin/paid-provider-controls.mjs --confirm  record every refusal in runs/cost/ledger.jsonl
 *   node bin/paid-provider-controls.mjs --confirm --ledger=<path inside this repository>
 *                                                  record them in that ledger instead (the gap 2 test seam)
 *
 * 🔴 NO REAL PAID PROVIDER IS CALLED AND NO ACCOUNT EXISTS. The provider is a test
 * double from src/cost/paid-provider-gate.mjs that makes no request. What is real
 * is the gate, and the ledger entries its refusals write.
 */

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createCostLedger, formatLedgerLine } from "../src/cost/ledger.mjs";
import { createPaidProviderGate, createKillSwitch, createFakePaidProvider, PaidCallRefused, REFUSAL_CODES, paidProviderRef } from "../src/cost/paid-provider-gate.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { namedActor, namedApproval } from "../src/governance/authorisation.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/paid-provider-controls.mjs", governed: true, resources: [RESOURCES.costLedger()] });
/* --ledger=<path>: the testability seam (gap 2) — the ledger this run appends its refusals to, CONFINED to this
 * repository by the same confineToRepo as the default, which it refuses before the ledger is opened. It chooses
 * WHERE, never WHETHER: without --confirm the refusals still go to the in-memory ledger and the file is not opened. */
const ledgerArg = argv.find((a) => a.startsWith("--ledger="))?.slice("--ledger=".length);
const LEDGER = confineToRepo(ledgerArg ?? `${REPO}runs/cost/ledger.jsonl`, { label: ledgerArg === undefined ? "the cost ledger" : "--ledger" });
const LEDGER_SHOWN = ledgerArg === undefined ? "runs/cost/ledger.jsonl" : LEDGER;

/* 🔴 ROUTED, AND THE GATE STILL SEES A LEDGER. The paid-provider gate appends one refusal entry per refusal, as
 * it goes, and reads the ledger back to enforce caps and budgets. So the gate keeps a ledger-shaped object that
 * COLLECTS; the run then makes ONE governed decision about writing the collected entries to the real file, which
 * is what the write law actually decides — once per run, not once per refusal.
 *
 * The dry run is unchanged in substance: nothing is written, and the real file is not even READ, so `traced` below
 * still counts against the in-memory entries exactly as before. */
const memory = [];
const realLedger = createCostLedger(LEDGER);
const ledger = {
  path: LEDGER,
  append: (e) => { memory.push(e); return { appended: true, entry_id: e.entry_id }; },
  /* 🔴 DEDUPED BY entry_id, AND THAT IS NOT TIDINESS. Once the governed write commits, an entry is in BOTH the
   * real ledger and this run's collected list, and a plain concatenation counted every refusal twice — the run's
   * own trace check reported "10 of 5" and correctly failed. Before the commit, only the collected list has them,
   * so the same expression is right on both sides of the write. */
  readAll: () => {
    const seen = new Set();
    const out = [];
    for (const e of [...(permission.mayWrite ? realLedger.readAll() : []), ...memory]) {
      if (e?.entry_id !== undefined) {
        if (seen.has(e.entry_id)) continue;
        seen.add(e.entry_id);
      }
      out.push(e);
    }
    return out;
  },
};

const NAME = "fake-paid-provider";
const fake = createFakePaidProvider({ name: NAME, pricePerCall: { amount: 0.4, currency: "USD" } });
const killSwitch = createKillSwitch();
const authorization = (over = {}) => ({ provider: NAME, authorizedBy: "owner (fake provider exercise)", date: "2026-09-13", reason: "item 47 — exercising the controls against a test double", budget: { amount: 100, currency: "USD" }, cap: { maxCalls: 50 }, tenantId: SCOPE.writeScope?.tenantId ?? null, expiresOn: "2099-12-31" /* F78: the run's tenant, unexpired */, ...over });

const results = [];
async function attempt(label, gate) {
  try {
    const r = await gate.call(NAME, { label });
    results.push({ label, outcome: `ISSUED (call ${r.calls}, spent ${r.spent} USD)` });
  } catch (e) {
    if (!(e instanceof PaidCallRefused)) throw e;
    results.push({ label, outcome: `REFUSED ${e.code} — ${e.reason}`, entry: e.entry });
  }
}
/* 🔴 F04 · STEP 0 IS THE ONE AUTHORISATION DECISION. Two authorities, and they are never confused:
 *   REAL     the actor this run names, its F02 scope and the approval it names (--approval=), decided against the RECORDED
 *            approval registry and recorded durably through the run's guard sink. No owner SPEND approval exists, so this
 *            call is refused NOT_AUTHORISED_BY_F04 — a real refused spending decision.
 *   EXERCISE an in-memory TEST DOUBLE of the registry, so the gate's own limits (steps 1-4) can be exercised past step 0.
 *            The gate accepts a handed-in registry only when every provider is a declared fake; nothing of it is written,
 *            and its decisions are not recorded as real ones (F04 clarification 14: a fixture proves a branch, never a
 *            real population). */
const REAL_AUTHORITY = { actorRef: namedActor(process.argv), approvalRef: namedApproval(process.argv), scope: SCOPE.writeScope, sink: { emit: SCOPE.recordDecision } };
const EXERCISE_APPROVAL = "approval:item47-fake-provider-exercise-double";
const EXERCISE_REGISTRY = { readable: true, events: 1, approvals: new Map([[EXERCISE_APPROVAL, {
  approvalId: EXERCISE_APPROVAL, approverRef: "actor:owner", approverClass: "HUMAN", executorRef: "actor:cc", executorClass: "AUTOMATION",
  action: "CALL_PAID_PROVIDER", resource: { resourceClass: "PAID_PROVIDER", resourceRef: paidProviderRef(NAME) }, scope: SCOPE.writeScope,
  decision: "APPROVED", oneUse: false, expiresAt: null, revoked: false, consumed: false,
}]]) };
const EXERCISE_AUTHORITY = { actorRef: "actor:cc", approvalRef: EXERCISE_APPROVAL, scope: SCOPE.writeScope, approvals: EXERCISE_REGISTRY };
const gateWith = (authorizations, spendAuthority = EXERCISE_AUTHORITY) => createPaidProviderGate({ providers: { [NAME]: fake }, authorizations, killSwitch, ledger, spendAuthority });

console.log("ITEM 47 — PAID PROVIDER CONTROLS, AGAINST A FAKE PROVIDER");
console.log("[bound: 1 fake provider · price 0.4 USD per call · 8 attempts · no network]\n");

await attempt("0 · the run's own actor, under the RECORDED approval registry (F04)", gateWith([authorization()], REAL_AUTHORITY));
await attempt("1 · no authorization at all", gateWith([]));
await attempt("2 · an authorization with no date", gateWith([authorization({ date: "" })]));
const capped = gateWith([authorization({ cap: { maxCalls: 1 } })]);
await attempt("4a · first call, inside a cap of 1", capped);
await attempt("4a · second call, past the cap of 1", capped);
const budgeted = gateWith([authorization({ budget: { amount: 0.5, currency: "USD" } })]);
await attempt("4b · first call, inside a budget of 0.5 USD", budgeted);
await attempt("4b · second call, past the budget of 0.5 USD", budgeted);
killSwitch.flip({ by: "owner (fake provider exercise)", reason: "item 47 — the kill switch exercised", at: new Date().toISOString() });
await attempt("3 · a fully authorized call after the kill switch was flipped", gateWith([authorization()]));

/* ONE governed decision for the run's refusal entries. The cost ledger SKIPS a duplicate entry_id and writes
 * nothing, so the expected line count is asked of that discipline rather than assumed to be the entry count. */
const LEDGER_INSTANT = isoSeconds(Date.now());
const ledgerGoverned = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
  repo: REPO, permission, store: realLedger, records: memory, targetClass: "RUN_EVIDENCE",
  action: "APPEND_PAID_PROVIDER_REFUSAL_ENTRIES", occurredAt: LEDGER_INSTANT,
  correlationId: `run:paid-provider-controls:${LEDGER_INSTANT}`,
  discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null,
}));
if (ledgerGoverned.outcome !== "REFUSED" && ledgerGoverned.outcome !== "COMMITTED" && ledgerGoverned.outcome !== "ALREADY_COMMITTED") {
  console.error(`🔴 ${ledgerGoverned.outcome} — the refusal entries were not written; the governed attempt is on the audit trail`);
  process.exit(1);
}

for (const r of results) console.log(`  ${r.label}\n     → ${r.outcome}`);
const refused = results.filter((r) => r.entry);
console.log(`\nrefusals: ${refused.length} · codes: ${[...new Set(refused.map((r) => r.entry.refusal.code))].join(", ")}`);
console.log(`calls that reached the fake provider: ${fake.callsReceived()}`);
console.log("no real paid provider was called and no account exists");
console.log("\nledger entries, one per refusal:");
for (const r of refused) console.log(`  ${formatLedgerLine(r.entry)}`);

const missing = REFUSAL_CODES.filter((c) => !refused.some((r) => r.entry.refusal.code === c));
const traced = ledger.readAll().filter((e) => e.outcome === "REFUSED" && refused.some((r) => r.entry.entry_id === e.entry_id)).length;
console.log(`\nevery refusal left a trace: ${traced} of ${refused.length} in the ${permission.mayWrite ? `REAL ledger (${LEDGER_SHOWN})` : "dry-run ledger (in memory)"}`);
const ok = missing.length === 0 && traced === refused.length && fake.callsReceived() === 2;
console.log(ok ? "\n✅ every control refused, before the call, and was recorded" : `\n🔴 NOT PROVED — codes never exercised: ${missing.join(", ") || "none"}; traced ${traced}/${refused.length}; provider calls ${fake.callsReceived()}`);
process.exit(ok ? 0 : 1);
