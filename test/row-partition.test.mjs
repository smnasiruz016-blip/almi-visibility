/**
 * 🔴 PARTITIONING A MIXED CAPTURE — the host partitions, the owner's declaration assigns.
 *
 * The owner's T1 decision was to attach the page rows per host to the site tenants he had ALREADY
 * declared, to reject the rows whose host is declared by nothing, and to fail closed on anything
 * unmatched — today's rows and tomorrow's alike. This drives that on the real population.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

import { partitionRowsByDeclaredHost, storedHost, ROW_PARTITION_STATES } from "../src/tenancy/row-partition.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { PAGE_ROWS_OBSERVATION } from "../src/discovery/row6.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const realRows = () => {
  const store = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
  return store.find((r) => r.observation_id === PAGE_ROWS_OBSERVATION && r.record_type === "observation").value.rows;
};

const T1 = "tenant:11111111111111111111111111111111";
const T2 = "tenant:22222222222222222222222222222222";
/** A resolver that declares exactly two origins and nothing else. */
const twoOrigins = (ref) => {
  const map = { "https://a.example.com": T1, "https://b.example.com": T2 };
  const t = map[ref.resourceRef];
  return t ? { state: "RESOLVED", tenantId: t } : { state: "UNDECLARED", tenantId: null };
};

test("the host is READ from the row, never composed or guessed", () => {
  assert.equal(storedHost({ url: "https://a.example.com/x" }), "a.example.com");
  assert.equal(storedHost({ page: "https://b.example.com/y" }), "b.example.com");
  assert.equal(storedHost({ nothing: "at all" }), null);
  assert.equal(storedHost({ url: "not-a-url" }), null);
  assert.equal(storedHost(null), null);
  assert.deepEqual([...ROW_PARTITION_STATES], ["ATTRIBUTED", "REJECTED", "UNREADABLE"]);
});

test("🔴 PROOF 6 · a row whose host NO declaration covers is REJECTED — an undeclared partition is refused", () => {
  const rows = [
    { url: "https://a.example.com/1" },
    { url: "https://undeclared.example.org/1" },
  ];
  const r = partitionRowsByDeclaredHost({ rows, resolve: twoOrigins });
  assert.deepEqual(Object.keys(r.byTenant), [T1]);
  assert.equal(r.rejected.length, 1);
  assert.equal(r.hosts.find((h) => h.host === "undeclared.example.org").state, "REJECTED");
  /* CONTROL: the declared host in the same call IS attributed, so the rejection is the declaration
   * talking and not a partitioner that rejects everything. */
  assert.equal(r.byTenant[T1].length, 1);
});

test("🔴 PROOF 7 · a FUTURE row whose host nobody declared cannot inherit today's tenant", () => {
  /* Today: one declared host, attributed. */
  const today = partitionRowsByDeclaredHost({ rows: [{ url: "https://a.example.com/1" }], resolve: twoOrigins });
  assert.equal(today.byTenant[T1].length, 1);

  /* Tomorrow: a new host appears in the same population. It must NOT join T1. */
  const tomorrow = partitionRowsByDeclaredHost({
    rows: [{ url: "https://a.example.com/1" }, { url: "https://new-site.example.net/1" }],
    resolve: twoOrigins,
  });
  assert.equal(tomorrow.byTenant[T1].length, 1, "a new host's row was absorbed into an existing tenant");
  assert.equal(tomorrow.rejected.length, 1);
  assert.equal(tomorrow.arithmetic.remainder, 0);
});

test("🔴 every resolution state that is not RESOLVED rejects — none of them is the owner having said so", () => {
  for (const state of ["UNDECLARED", "AMBIGUOUS", "INVALID", "UNKNOWN"]) {
    const r = partitionRowsByDeclaredHost({
      rows: [{ url: "https://x.example.com/1" }],
      resolve: () => ({ state, tenantId: state === "AMBIGUOUS" ? T1 : null }),
    });
    assert.deepEqual(Object.keys(r.byTenant), [], `${state} attributed a row`);
    assert.equal(r.rejected.length, 1, state);
  }
  /* CONTROL */
  const ok = partitionRowsByDeclaredHost({ rows: [{ url: "https://x.example.com/1" }], resolve: () => ({ state: "RESOLVED", tenantId: T1 }) });
  assert.equal(ok.byTenant[T1].length, 1);
});

test("a row storing no readable URL is UNREADABLE — never attributed, never silently dropped", () => {
  const r = partitionRowsByDeclaredHost({ rows: [{ nothing: 1 }, { url: "https://a.example.com/1" }], resolve: twoOrigins });
  assert.equal(r.unreadable.length, 1);
  assert.equal(r.arithmetic.total, 2);
  assert.equal(r.arithmetic.remainder, 0);
});

test("the resolver is a declared dependency — it is never built behind the caller's back", () => {
  assert.throws(() => partitionRowsByDeclaredHost({ rows: [] }), /needs the production resolver/);
});

/* ================================================================== *
 * THE REAL POPULATION — the owner's T1 decision, measured.
 * ================================================================== */

test("🔴 the REAL page rows partition per host through the owner's OWN declared origins, and the arithmetic closes", () => {
  const rows = realRows();
  const r = partitionRowsByDeclaredHost({ rows, resolve: createTenantResolver({}) });

  assert.ok(rows.length > 1000, `only ${rows.length} rows — too few to believe any count`);
  assert.equal(r.arithmetic.remainder, 0, "rows went missing between the buckets");
  assert.equal(r.arithmetic.total, rows.length);

  /* 🔴 THE CAPTURE IS MIXED, AND THAT IS THE POINT. One property, many declared tenants. */
  assert.ok(r.arithmetic.tenants > 1, "the partition collapsed a mixed capture into one tenant");

  /* 🔴 AND IT REJECTS. A host the owner has not declared keeps its rows out. */
  assert.ok(r.arithmetic.rejected > 0, "nothing was rejected — the fail-closed path is not exercised by the real data");
  for (const h of r.hosts.filter((x) => x.state === "REJECTED")) assert.match(h.why, /no declared site origin/);

  /* every attributed host resolves to a tenant the declarations actually carry */
  for (const h of r.hosts.filter((x) => x.state === "ATTRIBUTED")) assert.match(h.tenantId, /^tenant:[0-9a-f]{32}$/);
});
