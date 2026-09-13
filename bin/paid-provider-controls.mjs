#!/usr/bin/env node
/**
 * ITEM 47 — EXERCISE THE PAID-PROVIDER CONTROLS AGAINST A FAKE PROVIDER.
 *
 *   node bin/paid-provider-controls.mjs            dry run: the refusals are shown, nothing is recorded
 *   node bin/paid-provider-controls.mjs --confirm  record every refusal in runs/cost/ledger.jsonl
 *
 * 🔴 NO REAL PAID PROVIDER IS CALLED AND NO ACCOUNT EXISTS. The provider is a test
 * double from src/cost/paid-provider-gate.mjs that makes no request. What is real
 * is the gate, and the ledger entries its refusals write.
 */

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { createCostLedger, formatLedgerLine } from "../src/cost/ledger.mjs";
import { createPaidProviderGate, createKillSwitch, createFakePaidProvider, PaidCallRefused, REFUSAL_CODES } from "../src/cost/paid-provider-gate.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
const LEDGER = confineToRepo(`${REPO}runs/cost/ledger.jsonl`, { label: "the cost ledger" });

/* Dry run: an in-memory ledger with the same two verbs. --confirm: the real one. */
const memory = [];
const ledger = permission.mayWrite ? createCostLedger(LEDGER) : { append: (e) => memory.push(e), readAll: () => [...memory] };

const NAME = "fake-paid-provider";
const fake = createFakePaidProvider({ name: NAME, pricePerCall: { amount: 0.4, currency: "USD" } });
const killSwitch = createKillSwitch();
const authorization = (over = {}) => ({ provider: NAME, authorizedBy: "owner (fake provider exercise)", date: "2026-09-13", reason: "item 47 — exercising the controls against a test double", budget: { amount: 100, currency: "USD" }, cap: { maxCalls: 50 }, ...over });

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
const gateWith = (authorizations) => createPaidProviderGate({ providers: { [NAME]: fake }, authorizations, killSwitch, ledger });

console.log("ITEM 47 — PAID PROVIDER CONTROLS, AGAINST A FAKE PROVIDER");
console.log("[bound: 1 fake provider · price 0.4 USD per call · 7 attempts · no network]\n");

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

for (const r of results) console.log(`  ${r.label}\n     → ${r.outcome}`);
const refused = results.filter((r) => r.entry);
console.log(`\nrefusals: ${refused.length} · codes: ${[...new Set(refused.map((r) => r.entry.refusal.code))].join(", ")}`);
console.log(`calls that reached the fake provider: ${fake.callsReceived()}`);
console.log("no real paid provider was called and no account exists");
console.log("\nledger entries, one per refusal:");
for (const r of refused) console.log(`  ${formatLedgerLine(r.entry)}`);

const missing = REFUSAL_CODES.filter((c) => !refused.some((r) => r.entry.refusal.code === c));
const traced = ledger.readAll().filter((e) => e.outcome === "REFUSED" && refused.some((r) => r.entry.entry_id === e.entry_id)).length;
console.log(`\nevery refusal left a trace: ${traced} of ${refused.length} in the ${permission.mayWrite ? "REAL ledger (runs/cost/ledger.jsonl)" : "dry-run ledger (in memory)"}`);
const ok = missing.length === 0 && traced === refused.length && fake.callsReceived() === 2;
console.log(ok ? "\n✅ every control refused, before the call, and was recorded" : `\n🔴 NOT PROVED — codes never exercised: ${missing.join(", ") || "none"}; traced ${traced}/${refused.length}; provider calls ${fake.callsReceived()}`);
process.exit(ok ? 0 : 1);
