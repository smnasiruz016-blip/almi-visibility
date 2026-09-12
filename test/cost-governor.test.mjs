/**
 * ITEM 45 — THE HARD STOP, AND A COST FIELD THAT MEANS ITS OWN NAME.
 *
 * Both proved against the REAL Search Console adapter, driven through an
 * injected fetch that lies: pages that never end, so a loop has every chance
 * to run away. Requests are counted AT THE BOUNDARY — the fake fetch — never
 * read back from the thing being tested.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createCostGovernor, CostCapExceeded } from "../src/cost/governor.mjs";
import { createGoogleSearchConsoleProvider } from "../src/search/google-search-console.mjs";
import { costRecord } from "../src/search/provider.mjs";
import { runIngest } from "../src/search/ingest.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

/* ---- a key the signer can use; nothing real ------------------------------ */
function tempKey() {
  const dir = mkdtempSync(join(tmpdir(), "almivis-gov-"));
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const path = join(dir, "key.json");
  writeFileSync(path, JSON.stringify({ client_email: "test@example.invalid", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }));
  return { dir, path };
}

/** A Search Console that answers every analytics request with a FULL page, for ever, and counts calls. */
function lyingFetch({ fullPages = true } = {}) {
  let calls = 0;
  const fetchImpl = async (url, init = {}) => {
    calls += 1;
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
    if (url.includes("oauth2")) return json(200, { access_token: "t" });
    if (url.endsWith("/sites")) return json(200, { siteEntry: [{ siteUrl: "sc-domain:example.com", permissionLevel: "siteFullUser" }] });
    if (url.includes(encodeURIComponent("https://control.invalid/"))) return json(403, { error: { message: "forbidden" } });
    const { rowLimit } = JSON.parse(init.body);
    const n = fullPages ? rowLimit : 1;
    return json(200, { rows: Array(n).fill({ keys: ["x"], clicks: 0, impressions: 1, ctr: 0, position: 1 }) });
  };
  return { fetchImpl, calls: () => calls };
}

/* ================================================================== *
 * THE GOVERNOR.
 * ================================================================== */

test("🔴 the governor charges BEFORE the call: the call that would exceed the cap is never counted as issued", () => {
  const g = createCostGovernor({ label: "t", maxApiCalls: 3, maxWallClockMs: 1000, now: () => 0 });
  g.charge(); g.charge(); g.charge();
  assert.throws(() => g.charge(), CostCapExceeded);
  assert.equal(g.snapshot().apiCalls, 3, "the refused call was counted as issued");
});

test("🔴 the stop LATCHES — every later charge throws the same stop", () => {
  const g = createCostGovernor({ label: "t", maxApiCalls: 1, maxWallClockMs: 1000, now: () => 0 });
  g.charge();
  let first;
  try { g.charge(); } catch (e) { first = e; }
  for (let i = 0; i < 5; i += 1) assert.throws(() => g.charge(), (e) => e === first);
  assert.equal(g.snapshot().refused, 6);
});

test("🔴 founder time is bounded too: past maxWallClockMs the next call is refused", () => {
  let t = 0;
  const g = createCostGovernor({ label: "t", maxApiCalls: 1000, maxWallClockMs: 50, now: () => t });
  g.charge();
  t = 51;
  assert.throws(() => g.charge(), /maxWallClockMs=50/);
});

/* ================================================================== *
 * 🔴 THE RUNAWAY LOOP, HARD-STOPPED — through the real adapter and ingest.
 * ================================================================== */

test("🔴 RUNAWAY, INJECTED: pages that never end are HARD-STOPPED at the run cap — exactly that many requests reach the boundary, and the run ends", async () => {
  const { dir, path } = tempKey();
  try {
    const lie = lyingFetch({ fullPages: true });
    const governor = createCostGovernor({ label: "runaway test", maxApiCalls: 12, maxWallClockMs: 60000 });
    const provider = createGoogleSearchConsoleProvider({ keyFilePath: path, fetchImpl: lie.fetchImpl, governor });
    const store = createJsonlStore(join(dir, "e.jsonl"));
    await assert.rejects(
      runIngest({ provider, store, propertyId: "sc-domain:example.com", estateHostnames: ["a.example.com"], controlProperty: "https://control.invalid/" }),
      (e) => e instanceof CostCapExceeded && /maxApiCalls=12/.test(e.message),
    );
    assert.equal(lie.calls(), 12, "a request past the cap reached the network");
    assert.equal(governor.snapshot().apiCalls, 12);
    // 🔴 The stop was not swallowed as an API_ERROR: no pull after it was recorded.
    assert.ok(!store.readAll().some((r) => r.value?.truncationReason === "API_ERROR"), "the hard stop was recorded as an API error and the run carried on");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CONTROL: the same lying source with a generous run cap is bounded by the per-pull law instead, and completes", async () => {
  const { dir, path } = tempKey();
  try {
    const lie = lyingFetch({ fullPages: true });
    const governor = createCostGovernor({ label: "control", maxApiCalls: 1000, maxWallClockMs: 60000 });
    const provider = createGoogleSearchConsoleProvider({ keyFilePath: path, fetchImpl: lie.fetchImpl, governor });
    const r = await runIngest({ provider, store: createJsonlStore(join(dir, "e.jsonl")), propertyId: "sc-domain:example.com", estateHostnames: ["a.example.com"], controlProperty: "https://control.invalid/" });
    assert.equal(r.pages.truncationReason, "MAX_REQUESTS");
    assert.equal(governor.snapshot().stopped, null);
    assert.equal(lie.calls(), governor.snapshot().apiCalls, "the governor and the boundary disagree about how many calls were made");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * 🔴 0A — apiCalls IS PER PULL; apiCallsCumulative IS THE RUN.
 * ================================================================== */

test("🔴 each pull's cost.apiCalls is THAT pull's calls, and apiCallsCumulative is the run's — they are two fields that diverge", async () => {
  const { dir, path } = tempKey();
  try {
    const lie = lyingFetch({ fullPages: false });
    const provider = createGoogleSearchConsoleProvider({ keyFilePath: path, fetchImpl: lie.fetchImpl });
    const r = await runIngest({ provider, store: createJsonlStore(join(dir, "e.jsonl")), propertyId: "sc-domain:example.com", estateHostnames: ["a.example.com"], controlProperty: "https://control.invalid/" });
    const pulls = [r.agg, r.pages, r.queryPulls.query.res, r.queryPulls["query-page"].res, r.countryPulls.country.res, r.countryPulls["country-query"].res];
    for (const p of pulls) {
      assert.equal(p.requestCount, 1);
      // The token and sites.list were issued before the first pull, so every pull issued exactly its own one request.
      assert.equal(p.cost.apiCalls, 1, "a per-pull apiCalls holds more than the pull issued — it has become a running total again");
    }
    const cumulative = pulls.map((p) => p.cost.apiCallsCumulative);
    for (let i = 1; i < cumulative.length; i += 1) assert.equal(cumulative[i], cumulative[i - 1] + 1, "the running total did not advance by the pull's own calls");
    assert.notEqual(r.countryPulls.country.res.cost.apiCalls, r.countryPulls.country.res.cost.apiCallsCumulative, "the two fields have silently merged");
    assert.equal(r.control.cost.apiCallsCumulative, lie.calls(), "the run's running total disagrees with the calls counted at the boundary");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 a cost record whose running total is smaller than its own step is refused", () => {
  const base = { provider: "p", apiCalls: 3, billableUnits: 0, currency: "USD", amount: 0, amountState: "ZERO_BY_TARIFF", basis: "free tariff" };
  assert.throws(() => costRecord({ ...base, apiCallsCumulative: 2 }), /no smaller than apiCalls/);
  assert.equal(costRecord({ ...base, apiCallsCumulative: 9 }).apiCallsCumulative, 9);
  assert.equal("apiCallsCumulative" in costRecord(base), false, "an absent running total must stay absent, not become 0");
});
