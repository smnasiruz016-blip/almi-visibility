import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createJsonlStore, RESIGHTING_TYPE } from "../src/evidence/store.mjs";
import { makeObservation } from "../src/evidence/records.mjs";
import { measurementKey, sha256Hex } from "../src/evidence/ids.mjs";
import { runIngest } from "../src/search/ingest.mjs";
import { fact } from "../src/facts/record.mjs";
import { judgeSupersession, toCheckOutcome, promoteOutcome } from "../src/evidence/verdict.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "almivis-idem-"));

/* ================================================================== *
 * A1 — 🔴 IDEMPOTENCY. THE DEFECT THIS REPOSITORY SHIPPED.
 *
 * `observation_id` includes `observed_at`, so re-running the ingest appended
 * duplicate measurements. The audit found it by TESTING the idempotency claim
 * instead of repeating it.
 * ================================================================== */

/** A provider that answers identically every time. Two runs, same data. */
function fakeProvider() {
  let calls = 0;
  return {
    providerId: "fake",
    calls: () => calls,
    async listProperties() {
      calls += 1;
      return [{
        propertyId: "sc-domain:example.com", propertyType: "DOMAIN",
        permissionLevel: "siteFullUser", authState: "GRANTED",
        /* 🔴 A LIVE CLOCK, ON PURPOSE.
         *
         * The first version of this fake returned the constant "t", which made
         * the fixture MORE IDEMPOTENT THAN REALITY and hid a real defect: the
         * ingest was storing this timestamp inside the measured value, so
         * `gsc.sites.list` could never deduplicate. Only the live API exposed
         * it. A fake that cannot reproduce the failure cannot guard it. */
        observedAt: new Date().toISOString(),
      }];
    },
    async queryRows({ propertyId, dimensions }) {
      calls += 1;
      const forbidden = propertyId === "https://control.invalid/";
      return {
        rows: forbidden ? [] : dimensions.includes("page")
          ? [{ keys: ["https://a.example.com/1"], clicks: 1, impressions: 9 }]
          : [{ clicks: 1, impressions: 9, ctr: 0.11, position: 4 }],
        rowCount: forbidden ? 0 : 1,
        requestCount: 1,
        exhausted: !forbidden,
        truncationReason: forbidden ? "API_ERROR" : null,
        dataState: forbidden ? "UNKNOWN" : "COMPLETE",
        rowLimitPerRequest: 25000,
        maxRequests: 20,
        httpStatus: forbidden ? 403 : 200,
        cost: { provider: "fake", apiCalls: 1, billableUnits: 0, currency: "USD", amount: 0, amountState: "ZERO_BY_TARIFF", basis: "free" },
        observedAt: "t",
      };
    },
  };
}

const INGEST = (store, now) => runIngest({
  provider: fakeProvider(),
  store,
  propertyId: "sc-domain:example.com",
  estateHostnames: ["a.example.com", "b.example.com"],
  controlProperty: "https://control.invalid/",
  now,
});

test("🔴 A1: running the SAME ingest twice adds ZERO new measurements and one re-sighting each", async () => {
  const dir = tmp();
  try {
    const store = createJsonlStore(join(dir, "e.jsonl"));

    /* 🔴 THE TWO RUNS ARE ON THE SAME DAY, AT DIFFERENT TIMES.
     *
     * That is precisely the defect's shape: `observed_at` moves, so the old
     * `observation_id` minted a fresh id for an identical measurement.
     *
     * ⚠️ It must be the same DAY. A first draft of this test advanced the clock
     * 24 hours and expected zero new measurements — and the code was right to
     * refuse: the 28-day window had shifted, so the aggregate and by-page
     * queries covered a different period and were genuinely NEW measurements,
     * not duplicates. Two of four appended, exactly as they should have. The
     * test was wrong, not the store. */
    const first = await INGEST(store, () => new Date("2026-09-12T00:00:00.000Z"));
    const second = await INGEST(store, () => new Date("2026-09-12T06:00:00.000Z"));

    // NINE since 12 September 2026: item 9 added the country and country×query
    // pulls, and they must be exactly as idempotent as the seven before them.
    assert.equal(first.appended, 9, "the first run must write its nine measurements");
    assert.equal(first.resighted, 0);

    assert.equal(second.appended, 0, "🔴 the second run appended a duplicate measurement");
    assert.equal(second.resighted, 9, "each measurement must be re-sighted exactly once");

    const all = store.readAll();
    const measurements = all.filter((r) => r.record_type === "observation");
    const resightings = all.filter((r) => r.record_type === RESIGHTING_TYPE);
    assert.equal(measurements.length, 9, `expected 9 measurements, found ${measurements.length}`);
    assert.equal(resightings.length, 9);

    // Every re-sighting points at a measurement that really exists.
    const ids = new Set(measurements.map((m) => m.observation_id));
    for (const r of resightings) {
      assert.ok(ids.has(r.observation_id), "a re-sighting points at no measurement");
      assert.equal(r.seen_at, "2026-09-12T06:00:00.000Z");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 A1: a CHANGED measurement is a new record, not a re-sighting — the time series survives", async () => {
  const dir = tmp();
  try {
    const store = createJsonlStore(join(dir, "e.jsonl"));
    const build = (value, at) => makeObservation({
      observed_at: at, method: "m", target: { kind: "property", ref: "p" },
      content_sha256: sha256Hex(JSON.stringify(value)), value, collector: "t", collector_version: "1",
    });

    store.appendIfNew(build({ impressions: 9 }, "2026-09-12T00:00:00.000Z"));
    const changed = store.appendIfNew(build({ impressions: 10 }, "2026-09-13T00:00:00.000Z"));

    assert.equal(changed.appended, true, "different content must append a second measurement");
    assert.equal(store.readAll().filter((r) => r.record_type === "observation").length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("A1: measurement_key excludes the clock; observation_id includes it", () => {
  const mk = (at) => makeObservation({
    observed_at: at, method: "m", target: { kind: "url", ref: "https://e.example.com/a" },
    content_sha256: "abc", value: 1, collector: "t", collector_version: "1",
  });
  const a = mk("2026-09-12T00:00:00.000Z");
  const b = mk("2026-09-13T00:00:00.000Z");
  assert.notEqual(a.observation_id, b.observation_id, "a second look IS a second record");
  assert.equal(a.measurement_key, b.measurement_key, "the same content is the same measurement");
});

test("A1: measurementKey refuses to be given a clock — the omission is the point", () => {
  const k = measurementKey({ target: "url:x", method: "m", contentSha256: "h" });
  assert.equal(k.length, 16);
  assert.throws(() => measurementKey({ target: "", method: "m", contentSha256: "h" }), /target is required/);
});

test("A1: appendIfNew refuses a record with no measurement_key", () => {
  const dir = tmp();
  try {
    const store = createJsonlStore(join(dir, "e.jsonl"));
    assert.throws(() => store.appendIfNew({ record_type: "observation" }), /no measurement_key/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * A2 — 🔴 THE VERDICT PATH IS REAL NOW.
 * ================================================================== */

test("🔴 A2: the verdict layer maps the registry vocabulary — and 'not-applicable' is UNKNOWN, not PASS", () => {
  assert.equal(toCheckOutcome("pass"), "PASS");
  assert.equal(toCheckOutcome("fail"), "FAIL");
  assert.equal(toCheckOutcome("could-not-check"), "UNKNOWN");
  // 🔴 "does not apply" carries no evidence about the claim. Mapping it to PASS
  // would let an inapplicable check promote a fact.
  assert.equal(toCheckOutcome("not-applicable"), "UNKNOWN");
  assert.throws(() => toCheckOutcome("probably-fine"), /add it to OUTCOME_ALIASES/);
});

test("🔴 A2: a supersession that promotes could-not-check → pass is a violation", () => {
  const v = judgeSupersession({
    previous: { checks: { linkCheckOutcome: "could-not-check", quoteMatchOutcome: "pass", fingerprintOutcome: "pass" } },
    next: { checks: { linkCheckOutcome: "pass", quoteMatchOutcome: "pass", fingerprintOutcome: "pass" } },
  });
  assert.equal(v.length, 1);
  assert.equal(v[0].field, "linkCheckOutcome");
  assert.match(v[0].message, /UNKNOWN never becomes PASS/);
});

test("A2: a lawful supersession reports nothing, and fail → pass is lawful", () => {
  assert.deepEqual(
    judgeSupersession({
      previous: { checks: { linkCheckOutcome: "fail", quoteMatchOutcome: "pass", fingerprintOutcome: "could-not-check" } },
      next: { checks: { linkCheckOutcome: "pass", quoteMatchOutcome: "pass", fingerprintOutcome: "could-not-check" } },
    }),
    [],
  );
  assert.equal(promoteOutcome("fail", "pass"), "PASS");
  assert.throws(() => promoteOutcome("could-not-check", "pass"), /UNKNOWN never becomes PASS/);
});

/* ================================================================== *
 * A3 — 🔴 A FACT MUST DECLARE ITS STANDING. IT IS NEVER DEFAULTED.
 * ================================================================== */

const RECORD = {
  id: "s.p",
  claim: { subject: "s", predicate: "p", qualifier: null },
  value: { value: 1, valueType: "count", unit: "x" },
};

test("🔴 A3: constructing a fact with NO verificationState throws", () => {
  assert.throws(() => fact({ ...RECORD }), /verificationState must be declared/);
});

test("🔴 A3: VERIFIED with no factCheckedOn throws — a verification without a date is not one", () => {
  assert.throws(
    () => fact({ ...RECORD, verificationState: "VERIFIED" }),
    /VERIFIED but checks.factCheckedOn is null/,
  );
});

test("🔴 A3: UNVERIFIED carrying a date throws — the two may not contradict", () => {
  assert.throws(
    () => fact({ ...RECORD, verificationState: "UNVERIFIED", checks: { factCheckedOn: "2026-09-12" } }),
    /UNVERIFIED but checks.factCheckedOn is/,
  );
});

test("A3: both honest combinations construct", () => {
  assert.equal(fact({ ...RECORD, verificationState: "UNVERIFIED" }).verificationState, "UNVERIFIED");
  const v = fact({ ...RECORD, verificationState: "VERIFIED", checks: { factCheckedOn: "2026-09-12", factCheckedBy: "human:NU" } });
  assert.equal(v.checks.factCheckedOn, "2026-09-12");
});

/**
 * 🔴 THIS TEST USED TO ASSERT THAT EVERY RECORD WAS UNVERIFIED. It was right to,
 * for as long as nobody had checked one: the failure it guarded was a record
 * quietly claiming a standing nobody had earned for it.
 *
 * On 12 September 2026 beta-g checked all 46 against official sources, and the
 * verdicts were ingested. So the SNAPSHOT it pinned is now false while the
 * INVARIANT it existed for is unchanged, and the two must not be confused —
 * relaxing the assertion to "any state is fine" would retire the guard along
 * with the snapshot.
 *
 * What earns a standing is therefore asserted directly: a named person, on a
 * named date. A machine may not fact-check, and an absent checker may not.
 */
test("🔴 A3: no record on disk claims a standing it has not earned", async () => {
  const { loadRegistry } = await import("../src/facts/registry.mjs");
  const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const { records } = await loadRegistry((await (await import("./support/subjects.mjs")).subject("almi-oet")).factsDir, "almi-oet");
  assert.ok(records.length >= 30, `only ${records.length} records — this law would be weak`);
  for (const r of records) {
    assert.ok(
      ["UNVERIFIED", "VERIFIED", "UNKNOWN"].includes(r.verificationState),
      `${r.id}: undeclared standing`,
    );
    if (r.verificationState === "UNVERIFIED") {
      assert.equal(r.checks.factCheckedOn, null, `${r.id} carries a fact-check date beside UNVERIFIED`);
      continue;
    }
    // VERIFIED or UNKNOWN: both are records of a check that RAN, so both owe a
    // date and a checker. UNKNOWN owes them just as much as VERIFIED — that is
    // what separates "checked and unresolved" from "never opened".
    assert.ok(r.checks.factCheckedOn, `${r.id}: ${r.verificationState} with no check date`);
    assert.match(
      r.checks.factCheckedBy ?? "",
      /^human:/,
      `${r.id}: a fact check must name a PERSON — a tool cannot read a source and judge a claim`,
    );
  }
});
