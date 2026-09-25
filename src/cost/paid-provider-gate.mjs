/**
 * 🔴 ITEM 47 — THE CONTROLS BEFORE THE THING THEY CONTROL.
 *
 * The boundary's NOTE: "no paid provider exists today. ABSENCE IS NOT A CONTROL —
 * the controls must exist before one does." The day a paid provider is added is
 * the worst possible day to discover the controls were only a habit. So they are
 * built now, against a FAKE provider, and every one of them is proved by being
 * removed and watched fail.
 *
 * ── THE FOUR CONTROLS, IN THE ORDER A CALL MEETS THEM ───────────────────────
 *
 *   1. OFF BY DEFAULT          a provider with no authorization is refused.
 *   2. EXPLICIT AUTHORIZATION  an authorization counts only if it is NAMED (who
 *                              authorized), PER PROVIDER, DATED, gives a reason,
 *                              and carries a budget and a cap. Anything less
 *                              authorizes nothing.
 *   3. KILL SWITCH             once flipped — by a named person, with a reason and
 *                              a time — the very next call is refused.
 *   4. BUDGET AND CAP          a call that WOULD exceed either is refused BEFORE it
 *                              is made. Charged before the call, like the cost
 *                              governor: the call that crosses the line is never
 *                              issued.
 *
 * A gate cannot be built without a kill switch or a ledger: the FAILURE clause
 * names "a cap or kill switch is absent", so absence is refused at construction.
 *
 * ── 🔴 EVERY REFUSAL IS A LEDGER ENTRY ─────────────────────────────────────
 *
 * A refusal that leaves no trace is indistinguishable from a call nobody made.
 * Each refused call writes one cost entry, `outcome: "REFUSED"`, with its code
 * and reason, money 0 and provider calls 0 — each zero with its basis.
 *
 * ⚠️ WHAT THIS DOES NOT DO: force a future integration to call through it. It
 * binds every call made THROUGH the gate. No paid provider exists, so there is
 * no integration to census; the day one is written, its calls go through here or
 * it is a breach of item 47.
 *
 * 🔴 F04 (25 Sep 2026): THE AUTHORIZATION ABOVE IS A LIMIT, NOT AN AUTHORITY. Its `authorizedBy` is a string — and a name
 * is not proof that a person approved anything (F04 clarification 4); a gate that let its own list decide who may spend
 * would be the caller-specific allowlist F04's FAILURE clause names. So every call meets the ONE decision first (step 0):
 * the actor the gate was built for is AUTHORISED for CALL_PAID_PROVIDER over this provider — SPEND is approval-gated, so
 * only with a recorded HUMAN approval that is not the executor's own — or it is refused NOT_AUTHORISED_BY_F04, on the
 * ledger like every other refusal. The budget, cap and kill switch then bound what an authorised actor may spend.
 * A gate cannot be built without its F04 authority, as it cannot without a kill switch.
 *
 * This module names no product and calls no real provider.
 */

import { randomUUID } from "node:crypto";

import { makeCostEntry } from "./ledger.mjs";
import { authorise, authorisationEvent } from "../governance/authorisation.mjs";

export const REFUSAL_CODES = Object.freeze([
  "NOT_AUTHORIZED",
  "AUTHORIZATION_INCOMPLETE",
  "KILL_SWITCH_ON",
  "CAP_WOULD_BE_EXCEEDED",
  "BUDGET_WOULD_BE_EXCEEDED",
  "NOT_AUTHORISED_BY_F04",
]);

/** F04: the resource a paid call is decided over — the provider, by name (a provider name is not a secret). */
export const paidProviderRef = (provider) => `paid-provider:${provider}`;

export class PaidCallRefused extends Error {
  constructor(code, reason, entry) {
    super(`REFUSED ${code} — ${reason}`);
    this.name = "PaidCallRefused";
    this.code = code;
    this.reason = reason;
    this.entry = entry;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const filled = (v) => typeof v === "string" && v.trim() !== "";

/** A kill switch. Flipping it needs a person, a reason and a time; it does not flip back by itself. */
export function createKillSwitch() {
  let flipped = null;
  return Object.freeze({
    flip({ by, reason, at }) {
      if (!filled(by) || !filled(reason) || !filled(at)) throw new TypeError("killSwitch.flip: who flipped it, why, and when are all required");
      flipped = Object.freeze({ by, reason, at });
      return flipped;
    },
    isOn: () => flipped !== null,
    state: () => flipped,
  });
}

/** Everything that stops an authorization from being one. Empty means it is complete. */
export function authorizationProblems(auth, provider, price) {
  const problems = [];
  if (auth?.provider !== provider) problems.push(`it is not an authorization for ${provider}`);
  if (!filled(auth?.authorizedBy)) problems.push("it names nobody who authorized it");
  if (!ISO_DATE.test(auth?.date ?? "")) problems.push("it carries no date");
  if (!filled(auth?.reason) || auth.reason.trim().length < 10) problems.push("it gives no reason");
  if (!(typeof auth?.budget?.amount === "number" && auth.budget.amount > 0 && filled(auth.budget.currency))) problems.push("it sets no budget");
  if (!(Number.isInteger(auth?.cap?.maxCalls) && auth.cap.maxCalls >= 1)) problems.push("it sets no cap");
  if (price && auth?.budget?.currency && price.currency !== auth.budget.currency) problems.push(`its budget is in ${auth.budget.currency} and the provider charges in ${price.currency}`);
  return problems;
}

/** A REFUSED call, as a cost entry. Every zero carries its basis. */
export function entryFromRefusedPaidCall({ at, seq, provider, code, reason, authorization = null, callsIssued = 0, spent = 0, fake = false, attemptId = randomUUID() }) {
  if (!REFUSAL_CODES.includes(code)) throw new TypeError(`refused call: code ${JSON.stringify(code)} is not one of ${REFUSAL_CODES.join(" | ")}`);
  if (!filled(reason) || reason.length < 20) throw new TypeError("refused call: a refusal without its reason is indistinguishable from a call nobody made");
  /* 🔴 EVERY REFUSED ATTEMPT GETS ITS OWN ID. The first version built the id from the
   * clock and a per-gate counter — so two gates refusing in the same millisecond
   * produced ONE id, the ledger's dedupe kept one, and the other refusal vanished.
   * Found by the demonstration run's own trace check: 3 of 5 refusals recorded. A
   * refused retry is a second attempt, and it is a second entry. */
  const entry = makeCostEntry({
    entry_id: `paid-refusal:${provider}:${at}:${seq}:${attemptId}`,
    run_kind: "paid-provider-call",
    run_ref: `src/cost/paid-provider-gate.mjs — ${provider}${fake ? " (FAKE provider — a test double; no account exists)" : ""}`,
    run_started_at: at,
    recorded_at: at,
    money: {
      amountState: "MEASURED",
      amount: 0,
      currency: authorization?.budget?.currency ?? "USD",
      basis: `REFUSED before the call was issued (${code}): no request reached ${provider}, so nothing was charged`,
    },
    providerCalls: {
      state: "MEASURED",
      total: 0,
      perProvider: { [provider]: 0 },
      zeroBasis: `the gate refused the call before issuing it — ${code}`,
    },
    budget: {
      kind: "paid-provider",
      used: { attempted: 1, callsIssuedBefore: callsIssued, spentBefore: spent },
      bounds: authorization?.cap && authorization?.budget
        ? { maxCalls: authorization.cap.maxCalls, budget: `${authorization.budget.amount} ${authorization.budget.currency}` }
        : { authorization: "none complete — paid services are OFF by default" },
      capReached: code === "CAP_WOULD_BE_EXCEEDED" || code === "BUDGET_WOULD_BE_EXCEEDED",
    },
    founderTime: { state: "MEASURED", seconds: 0, zeroBasis: "a refusal is decided in-process before any request; no time was spent on the provider" },
    sources: [],
  });
  return Object.freeze({ ...entry, outcome: "REFUSED", refusal: Object.freeze({ code, reason, provider, fake }) });
}

/** A FAKE paid provider — a test double. It makes no request and holds no account; it counts. */
export function createFakePaidProvider({ name = "fake-paid-provider", pricePerCall = { amount: 0.4, currency: "USD" } } = {}) {
  let calls = 0;
  return Object.freeze({
    name,
    fake: true,
    pricePerCall: Object.freeze({ ...pricePerCall }),
    async invoke(request) {
      calls += 1;
      return { echo: request ?? null, call: calls };
    },
    callsReceived: () => calls,
  });
}

/**
 * @param {object} a
 * @param {Record<string, {invoke: Function, pricePerCall: {amount:number, currency:string}, fake?: boolean}>} a.providers
 * @param {object[]} [a.authorizations]   named, dated, per-provider — none by default
 * @param {{isOn: () => boolean, state: () => object}} a.killSwitch
 * @param {{append: Function, readAll: Function}} a.ledger
 * @param {{actorRef: string|null, scope: {scopeType: string, tenantId?: string|null}, approvalRef?: string|null, sink?: {emit: Function}, approvals?: object}} a.spendAuthority
 *        F04: WHO this gate spends for, in which F02 scope, under which recorded approval. `approvals` is the registry the
 *        decision reads (default: the recorded one); `sink` records each decision.
 */
export function createPaidProviderGate({ providers, authorizations = [], killSwitch, ledger, now = () => new Date(), spendAuthority } = {}) {
  if (!killSwitch || typeof killSwitch.isOn !== "function") throw new TypeError("paid-provider gate: no kill switch — a gate without one is the FAILURE item 47 names");
  if (!spendAuthority || typeof spendAuthority !== "object" || !spendAuthority.scope) throw new TypeError("paid-provider gate: no F04 spend authority — who may spend is decided by the one authorisation decision, never by the gate");
  /* 🔴 A HANDED-IN APPROVAL REGISTRY IS A TEST DOUBLE, AND A TEST DOUBLE NEVER REACHES A REAL PROVIDER. It lets a test or the
   * item-47 exercise drive the gate's own limits past step 0 — so it is accepted only when EVERY provider this gate holds
   * is a declared fake. A real provider is decided against the recorded registry, always. */
  if (spendAuthority.approvals && !Object.values(providers ?? {}).every((p) => p?.fake === true)) throw new TypeError("paid-provider gate: a handed-in approval registry is accepted only when every provider is a declared fake");
  if (!ledger || typeof ledger.append !== "function" || typeof ledger.readAll !== "function") throw new TypeError("paid-provider gate: no ledger — a refusal must leave a trace");
  const spend = new Map();
  const refusals = [];
  let seq = 0;

  function refuse(provider, code, reason, authorization, s) {
    const entry = entryFromRefusedPaidCall({ at: now().toISOString(), seq, provider, code, reason, authorization, callsIssued: s?.calls ?? 0, spent: s?.spent ?? 0, fake: Boolean(providers?.[provider]?.fake) });
    // appended once per entry_id — a retry of the same refusal is not a second refusal
    if (!ledger.readAll().some((e) => e.entry_id === entry.entry_id)) ledger.append(entry);
    refusals.push(entry);
    throw new PaidCallRefused(code, reason, entry);
  }

  async function call(provider, request) {
    seq += 1;
    const p = providers?.[provider];
    const auth = authorizations.find((x) => x?.provider === provider) ?? null;
    const s = spend.get(provider) ?? { calls: 0, spent: 0 };

    // 0 — F04: the ONE authorisation decision, before any of the gate's own limits and before the provider is touched
    const d = authorise({ actorRef: spendAuthority.actorRef ?? null, action: "CALL_PAID_PROVIDER", scope: spendAuthority.scope, resourceRef: paidProviderRef(provider), approvalRef: spendAuthority.approvalRef ?? null, now: now().toISOString() }, spendAuthority.approvals ? { approvals: spendAuthority.approvals } : {});
    spendAuthority.sink?.emit(authorisationEvent(d));
    if (!d.allowed) return refuse(provider, "NOT_AUTHORISED_BY_F04", `the one authorisation decision refused this spend: ${d.outcome}`, null, s);
    // 1 — OFF BY DEFAULT
    if (!auth) return refuse(provider, "NOT_AUTHORIZED", `paid services are OFF by default and ${provider} has no authorization`, null, s);
    // 2 — EXPLICIT AUTHORIZATION: named, per provider, dated, with a reason, a budget and a cap
    const problems = authorizationProblems(auth, provider, p?.pricePerCall);
    if (problems.length) return refuse(provider, "AUTHORIZATION_INCOMPLETE", `the authorization for ${provider} authorizes nothing: ${problems.join("; ")}`, null, s);
    // 3 — KILL SWITCH
    if (killSwitch.isOn()) return refuse(provider, "KILL_SWITCH_ON", `the kill switch is on (flipped by ${killSwitch.state()?.by} at ${killSwitch.state()?.at}: ${killSwitch.state()?.reason})`, auth, s);
    // 4 — CAP AND BUDGET, before the call is made
    if (s.calls + 1 > auth.cap.maxCalls) return refuse(provider, "CAP_WOULD_BE_EXCEEDED", `${s.calls} calls issued; one more would exceed the cap of ${auth.cap.maxCalls}`, auth, s);
    if (s.spent + p.pricePerCall.amount > auth.budget.amount) return refuse(provider, "BUDGET_WOULD_BE_EXCEEDED", `${s.spent} ${auth.budget.currency} spent; this call's ${p.pricePerCall.amount} would exceed the budget of ${auth.budget.amount}`, auth, s);

    spend.set(provider, { calls: s.calls + 1, spent: s.spent + p.pricePerCall.amount });
    const result = await p.invoke(request);
    return { result, ...spend.get(provider) };
  }

  return Object.freeze({ call, refusals: () => [...refusals], spendOf: (provider) => ({ ...(spend.get(provider) ?? { calls: 0, spent: 0 }) }) });
}
