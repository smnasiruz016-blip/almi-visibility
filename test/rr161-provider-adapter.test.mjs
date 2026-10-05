/**
 * 🔴 RR-161 · F16 C25–C26 · THE ONE AI-PROVIDER ADAPTER, under the owner's ISSUED record (Acceptance Amendment 4, _handoffs 5c232f5).
 *
 * Driven ONLY through a FAKE network exit at the connector boundary — the adapter is handed an opened-connector shape whose `fetch` records
 * and answers, and reaches nothing. Zero real requests. The adapter is BUILT, NOT REGISTERED (src/research/ai-providers/index.mjs).
 *
 *   A1  the request: the record's origin and path, the documented headers, the client's credential ONLY on the outgoing request, the
 *       plan's search cap and output cap; and back come ONLY the search results' addresses and usage COUNTS — never prose, never an
 *       address the model wrote in its own text
 *   A2  a provider refusal, an HTTP error, a search error and a non-JSON answer each THROW a named code (the run stops, C26)
 *   A3  the provider's options are checked exactly; the finalised pilot plan's options pass
 *   A4  an opened connector that does not admit the record's origin is refused before any request
 *   A5  through the paid-provider controls: the REAL adapter is refused NOT_AUTHORISED_BY_F04 with no recorded owner approval, and the
 *       provider is never touched; every call is ledgered, an errored one too; money is NOT MEASURED where the price was not read
 *   A6  the owner's ISSUED record is in the authority register, CURRENT and owner-issued; the adapter is NOT registered (F77 untouched)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import * as adapter from "../src/research/ai-providers/anthropic.mjs";
import { AI_PROVIDER_ADAPTERS } from "../src/research/ai-providers/index.mjs";
import { addressesIn } from "../src/research/ai-connection.mjs";
import { governedProviderCall } from "../src/governance/governed-provider-call.mjs";
import { createPaidProviderGate, createKillSwitch, PaidCallRefused } from "../src/cost/paid-provider-gate.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { censusOf, productionFiles } from "../tools/paid-metered-call-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const KEY = "RR161_FIXTURE_CLIENT_AI_KEY", SECRET = "sentinel-client-key-value-5d21";
const OPTIONS = Object.freeze({ model: "fixture-model-1", toolType: "web_search_20260318", maxSearchesPerCall: 3, maxOutputTokens: 512 });
const PRICE = Object.freeze({ amount: 0.5, currency: "USD" });

/** A FAKE network exit: it admits only the record's origin, records each request, and answers from a script. Reaches nothing. */
function fakeExit(answers) {
  const calls = [];
  let i = 0;
  return {
    calls,
    opened: Object.freeze({
      admits: (u) => new URL(u).origin === adapter.ORIGIN,
      fetch: async (url, init) => { calls.push({ url: String(url), init }); const a = answers[i++] ?? { status: 200, body: {} }; return { ok: a.status >= 200 && a.status < 300, status: a.status, json: async () => (a.notJson ? (() => { throw new Error("x"); })() : a.body) }; },
    }),
  };
}
const searchAnswer = (urls, prose) => ({ status: 200, body: {
  stop_reason: "end_turn",
  content: [
    { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: { query: "q" } },
    { type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: urls.map((url) => ({ type: "web_search_result", url, title: "a title the model was shown", page_age: "x", encrypted_content: "y" })) },
    { type: "text", text: prose },
  ],
  usage: { input_tokens: 1200, output_tokens: 80, server_tool_use: { web_search_requests: 1 } },
} });

test("A1 · the request leaves for the record's origin with the documented headers, the client's key ONLY on it, the plan's caps; back come ONLY the search results' addresses, the GENERATED question wording (RR-170, C25 as narrowed) and usage counts", async () => {
  process.env[KEY] = SECRET;
  try {
    /* RR-170 · F16 Amendment 5, C29 (C25 as narrowed): the provider's QUESTION lines come back as GENERATED wording; its answer prose, and a
     * QUESTION line that holds an address, never do */
    const PROSE = ["SENTINEL-MODEL-PROSE-77 — see also https://invented-by-the-model.invalid/thread/9 which no search returned",
      "QUESTION: How do I find an architect for a family home?", "QUESTION: See https://invented-by-the-model.invalid/q/3 for more?",
      "The answer is SENTINEL-ANSWER-PROSE-12."].join("\n");
    const x = fakeExit([searchAnswer(["https://site-one.invalid/questions/11/a", "https://site-two.invalid/q/22"], PROSE)]);
    const p = adapter.create({ opened: x.opened, credentialName: KEY, pricePerCall: PRICE, options: OPTIONS });
    const out = await p.invoke({ query: "Where on the public web do people ask their own questions in this field?" });
    assert.equal(x.calls.length, 1);
    const c = x.calls[0];
    assert.equal(c.url, `${adapter.ORIGIN}/v1/messages`, "the request did not go to the record's origin and the messages path");
    assert.equal(c.init.method, "POST");
    assert.equal(c.init.headers["x-api-key"], SECRET, "the client's own key was not on the outgoing request");
    assert.equal(c.init.headers["anthropic-version"], "2023-06-01");
    assert.equal(c.init.headers["content-type"], "application/json");
    const body = JSON.parse(c.init.body);
    assert.equal(body.model, OPTIONS.model);
    assert.equal(body.max_tokens, OPTIONS.maxOutputTokens, "the plan's output cap was not sent");
    assert.deepEqual(body.tools, [{ type: OPTIONS.toolType, name: "web_search", max_uses: OPTIONS.maxSearchesPerCall }], "the plan's search cap was not sent");
    assert.equal(body.system, adapter.QUESTION_INSTRUCTION, "the adapter did not ask for question wording, or asked for something else");
    assert.ok(!c.init.body.includes(SECRET), "the key reached the request body");
    /* only the search results' addresses and the GENERATED question wording — the model's answer prose, and an address only the prose names, never come back */
    assert.deepEqual(out.questions.map((q) => ({ ...q })), [{ wording: "How do I find an architect for a family home?", generated: true }], "the GENERATED question wording did not come back, or came back unmarked, or a QUESTION line with an address came back");
    assert.deepEqual([...out.addresses], ["https://site-one.invalid/questions/11/a", "https://site-two.invalid/q/22"]);
    assert.deepEqual(addressesIn(out, 10), ["https://site-one.invalid/questions/11/a", "https://site-two.invalid/q/22"], "the address extractor saw something beyond the search results");
    const kept = JSON.stringify(out);
    assert.ok(!kept.includes("SENTINEL-MODEL-PROSE") && !kept.includes("SENTINEL-ANSWER-PROSE") && !kept.includes("invented-by-the-model") && !kept.includes("a title the model was shown"), "provider answer prose or an un-searched address came back");
    assert.ok(!kept.includes(SECRET) && !JSON.stringify(p).includes(SECRET), "the key is kept by what the adapter returns or holds");
    assert.deepEqual({ ...out.usage }, { input_tokens: 1200, output_tokens: 80, "server_tool_use.web_search_requests": 1 }, "usage was not kept as counts");
    /* the code touches the key's value in ONE place: the outgoing header */
    const src = readFileSync(join(REPO, "src/research/ai-providers/anthropic.mjs"), "utf8");
    const touches = src.split("\n").filter((l) => /process\.env\[/.test(l) && !/^\s*(\*|\/\/)/.test(l));
    assert.equal(touches.length, 1, "the credential's value is touched in more than one place");
    assert.match(touches[0], /"x-api-key": process\.env\[credentialName\]/);
    assert.doesNotMatch(src, /process\.env\[[^\]]*\]\s*\.(length|slice|substring|substr|charAt|at)\b|createHash\([^)]*process\.env|console\.\w+\([^)]*process\.env/, "the credential's value is measured, hashed or printed");
  } finally { delete process.env[KEY]; }
});

test("A2 · a provider refusal, an HTTP error, a search error and a non-JSON answer each THROW a named code — never read as a result", async () => {
  const cases = [
    [{ status: 200, body: { stop_reason: "refusal", content: [] } }, "REFUSAL"],
    [{ status: 429, body: { type: "error" } }, "HTTP_429"],
    [{ status: 401, body: { type: "error" } }, "HTTP_401"],
    [{ status: 200, body: { stop_reason: "end_turn", content: [{ type: "web_search_tool_result", content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" } }] } }, "SEARCH_ERROR_MAX_USES_EXCEEDED"],
    [{ status: 200, notJson: true }, "NOT_JSON"],
  ];
  for (const [answer, code] of cases) {
    const p = adapter.create({ opened: fakeExit([answer]).opened, credentialName: KEY, pricePerCall: PRICE, options: OPTIONS });
    await assert.rejects(p.invoke({ query: "q" }), (e) => e.code === code, `${code} was not thrown by name`);
  }
  /* CONTROL: a plain answer with no search result is an empty list, not an error */
  const ok = adapter.create({ opened: fakeExit([{ status: 200, body: { stop_reason: "end_turn", content: [{ type: "text", text: "no search" }] } }]).opened, credentialName: KEY, pricePerCall: PRICE, options: OPTIONS });
  assert.deepEqual([...(await ok.invoke({ query: "q" })).addresses], []);
});

test("A3 · the provider's options are checked exactly — each limit refused by name; the finalised pilot plan's options pass", () => {
  assert.deepEqual(adapter.optionsRefusals(OPTIONS), []);
  assert.deepEqual(adapter.optionsRefusals(null), ["PROVIDER_OPTIONS_ABSENT"]);
  assert.ok(adapter.optionsRefusals({ ...OPTIONS, maxSearchesPerCall: adapter.LIMITS.maxSearchesPerCall + 1 }).includes("PROVIDER_OPTIONS_SEARCH_CAP"), "a search cap above the hard limit was accepted");
  assert.ok(adapter.optionsRefusals({ ...OPTIONS, maxOutputTokens: 0 }).includes("PROVIDER_OPTIONS_OUTPUT_CAP"));
  assert.ok(adapter.optionsRefusals({ ...OPTIONS, extra: 1 }).includes("PROVIDER_OPTIONS_NOT_EXACT"));
  assert.ok(adapter.optionsRefusals({ ...OPTIONS, toolType: "code_execution" }).includes("PROVIDER_OPTIONS_SEARCH_TOOL"));
  assert.throws(() => adapter.create({ opened: fakeExit([]).opened, credentialName: KEY, pricePerCall: PRICE, options: { ...OPTIONS, maxOutputTokens: 0 } }), (e) => e.code === "PROVIDER_OPTIONS_OUTPUT_CAP");
  const pilot = join(REPO, "test", "fixtures", "rr161-pilot-plan.json");
  if (existsSync(pilot)) assert.deepEqual(adapter.optionsRefusals(JSON.parse(readFileSync(pilot, "utf8")).discovery.ai.providerOptions), [], "the finalised pilot plan's options would be refused");
});

test("A4 · an opened connector that does not admit the record's origin is refused before any request; so is an unnamed credential", () => {
  const x = fakeExit([]);
  const elsewhere = Object.freeze({ admits: () => false, fetch: x.opened.fetch });
  assert.throws(() => adapter.create({ opened: elsewhere, credentialName: KEY, pricePerCall: PRICE, options: OPTIONS }), (e) => e.code === "ORIGIN_NOT_THE_CONNECTORS");
  assert.throws(() => adapter.create({ opened: x.opened, credentialName: "", pricePerCall: PRICE, options: OPTIONS }), (e) => e.code === "CREDENTIAL_UNNAMED");
  assert.equal(x.calls.length, 0, "a request was made");
});

test("A5 · through the paid-provider controls: the REAL adapter is refused NOT_AUTHORISED_BY_F04 without the owner's recorded approval; every call is ledgered, an errored one too; money NOT MEASURED where the price was not read", async () => {
  const x = fakeExit([searchAnswer(["https://site-one.invalid/questions/11/a"], "x")]);
  const real = adapter.create({ opened: x.opened, credentialName: KEY, pricePerCall: PRICE, options: OPTIONS });
  const T = { scopeType: "TENANT", tenantId: "tenant:00000000000000000000000000000f02" };
  const auth = { provider: adapter.PROVIDER_ID, tenantId: T.tenantId, expiresOn: "2099-12-31", authorizedBy: "fixture GREEN", date: "2026-10-04", reason: "RR-161 A5 — the real adapter behind the controls", budget: { amount: 1, currency: "USD" }, cap: { maxCalls: 1 } };
  const entries = [];
  const ledger = { append: (e) => { entries.push(e); return { appended: true }; }, readAll: () => [...entries] };
  const gate = createPaidProviderGate({ providers: { [adapter.PROVIDER_ID]: real }, authorizations: [auth], killSwitch: createKillSwitch(), ledger, spendAuthority: { actorRef: "actor:cc", scope: T } });
  await assert.rejects(gate.call(adapter.PROVIDER_ID, { query: "q" }), (e) => e instanceof PaidCallRefused && e.code === "NOT_AUTHORISED_BY_F04");
  assert.equal(x.calls.length, 0, "the real provider was reached without the owner's recorded F04 approval");
  assert.equal(entries.filter((e) => e.outcome === "REFUSED").length, 1, "the refusal left no ledger entry");
  assert.throws(() => createPaidProviderGate({ providers: { [adapter.PROVIDER_ID]: real }, authorizations: [auth], killSwitch: createKillSwitch(), ledger, spendAuthority: { actorRef: "actor:cc", scope: T, approvals: { readable: true, events: 0, approvals: new Map() } } }), /declared fake/, "a test-double approval was accepted for a real provider");
  /* the governed call over FAKE providers: an errored call is a ledgered call; an unmeasured price is NOT MEASURED money */
  const approvalRef = "approval:rr161-a5";
  const approvals = { readable: true, events: 1, approvals: new Map([[approvalRef, { approvalId: approvalRef, approverRef: "actor:owner", approverClass: "HUMAN", executorRef: "actor:cc", executorClass: "AUTOMATION", action: "CALL_PAID_PROVIDER", resource: { resourceClass: "PAID_PROVIDER", resourceRef: "paid-provider:fixture-ai" }, scope: T, decision: "APPROVED", oneUse: false, expiresAt: null, revoked: false, consumed: false }]]) };
  const fakeOf = (invoke, priceMeasured) => Object.freeze({ name: "fixture-ai", fake: true, priceMeasured, pricePerCall: PRICE, invoke });
  const g = (fake) => governedProviderCall({ providerId: "fixture-ai", fakeProvider: fake, pricePerCall: PRICE, authorization: { ...auth, provider: "fixture-ai", cap: { maxCalls: 2 } }, now: () => "2026-10-04T10:00:00Z", spendAuthority: { actorRef: "actor:cc", scope: T, approvalRef, approvals } });
  const failing = g(fakeOf(async () => { throw Object.assign(new Error("x"), { code: "HTTP_500" }); }, false));
  await assert.rejects(failing.call("q"), (e) => e.code === "HTTP_500");
  assert.deepEqual(failing.entries().map((e) => [e.outcome, e.error?.code]), [["CALLED_ERROR", "HTTP_500"]], "a call the provider answered with an error was not ledgered");
  const unpriced = g(fakeOf(async () => ({ addresses: [], usage: { input_tokens: 10 } }), false));
  await unpriced.call("q");
  const e = unpriced.entries()[0];
  assert.equal(e.money.amountState, "UNKNOWN", "a money amount was reported where the price was not read");
  assert.equal(e.money.amount, null);
  assert.deepEqual({ ...e.usage }, { input_tokens: 10 }, "the provider's usage was not ledgered");
  const priced = g(fakeOf(async () => ({ addresses: [] }), true));
  await priced.call("q");
  assert.equal(priced.entries()[0].money.amountState, "MEASURED", "CONTROL: a measured price was not reported as measured");
  /* the budget: the call that would exceed it is refused and ledgered */
  const tight = governedProviderCall({ providerId: "fixture-ai", fakeProvider: fakeOf(async () => ({ addresses: [] }), false), pricePerCall: PRICE, authorization: { ...auth, provider: "fixture-ai", budget: { amount: 0.6, currency: "USD" }, cap: { maxCalls: 5 } }, now: () => "2026-10-04T10:00:00Z", spendAuthority: { actorRef: "actor:cc", scope: T, approvalRef, approvals } });
  await tight.call("q");
  await assert.rejects(tight.call("q2"), (er) => er instanceof PaidCallRefused && er.code === "BUDGET_WOULD_BE_EXCEEDED", "a call over the hard budget was made");
  assert.deepEqual(tight.entries().map((x2) => x2.outcome), ["CALLED", "REFUSED"]);
});

test("A6 · the owner's ISSUED record is in the register, CURRENT and owner-issued; the adapter is NOT registered, so no real paid provider is constructible (F77 untouched)", () => {
  const rec = AUTHORITY_CORPUS.find((r) => r.propositionId === "OWNER_DECISION_RR-161_ANTHROPIC_PROVIDER_RECORD");
  assert.ok(rec, "the issued provider record is not in the authority register");
  assert.equal(rec.status, "CURRENT");
  assert.equal(rec.issuer?.class, "OWNER");
  assert.deepEqual(Object.keys(AI_PROVIDER_ADAPTERS), [], "the adapter is registered — that is the pilot round's act, with F77's reopening");
  const c = censusOf(productionFiles());
  assert.equal(c.realPaidProviders, 0);
  assert.equal(c.ok, true);
});

test("TRAIL · the production audit trail is byte-identical after every proof in this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
