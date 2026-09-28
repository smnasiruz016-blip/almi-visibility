/**
 * 🔴 D-WHOLE-STORE-ATTACHMENT CLOSED (command af4e9c8, Part E) — ON THE REAL, NON-EMPTY STRUCTURE.
 *
 * The shared Search Console evidence store holds rows of many tenants. Before this repair nothing stopped a declaration from
 * attaching it WHOLE to one tenant, after which every whole-store reader would take other tenants' rows as that tenant's
 * population. The repair (src/tenancy/scope.mjs SHARED_STORE_KINDS) makes such a store resolve to one tenant only when its members
 * are listed, non-empty and all that tenant's. Proved here on the REAL pinned rows and the REAL declarations; the only thing
 * simulated is the one unlawful act the repair must survive — the whole-store attachment itself. Counts and states only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { resolveSide, decideForTenant, SHARED_STORE_KINDS } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { pinnedObservationRows, rowMembers, decidePartition, readTenantPartition } from "../src/discovery/search-console-partition.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const real = createTenantResolver();
const rows = pinnedObservationRows({ repo: REPO });
const members = rowMembers(rows, "obs").flatMap((m) => m.identities);
const tenantOf = (id) => { const a = real(id); return a?.state === "RESOLVED" ? a.tenantId : null; };
const byTenant = new Map();
for (const m of members) { const t = tenantOf(m); if (t) byTenant.set(t, [...(byTenant.get(t) ?? []), m]); }
const [T, mine] = [...byTenant].sort((a, b) => b[1].length - a[1].length)[0] ?? [null, []];
/* The one simulated act: the owner attaches the WHOLE shared store to tenant T. Everything else is the real resolver. */
const attachedWhole = Object.assign((q) => (q?.resourceKind === "EVIDENCE_STORE" ? { state: "RESOLVED", tenantId: T, reason: "EXPLICIT_DECLARED_ATTACHMENT" } : real(q)), real);
const store = (extra = {}) => ({ ...RESOURCES.evidenceStore(), ...extra });

test("W0 · the structure is REAL and NON-EMPTY, and genuinely mixed — the population before the guard", () => {
  assert.ok(rows.length > 0, "the pinned observation holds no rows — an empty population proves nothing");
  assert.ok(byTenant.size >= 2, `the real rows resolve to ${byTenant.size} tenant(s); a mixed-tenant refusal needs at least two`);
  assert.ok(mine.length > 0, "the chosen tenant holds no rows");
  assert.deepEqual(SHARED_STORE_KINDS, ["EVIDENCE_STORE"]);
});

test("W1 · MIXED-TENANT REFUSAL: the whole store attached to one tenant is AMBIGUOUS — with no members, an empty list, or the real mixed members", () => {
  const whole = resolveSide(attachedWhole, store());
  assert.deepEqual([whole.state, whole.reason, whole.tenantId], ["AMBIGUOUS", "A_SHARED_STORE_ATTACHED_WHOLE_IS_NEVER_ONE_TENANTS", null]);
  assert.equal(resolveSide(attachedWhole, store({ members: [] })).state, "AMBIGUOUS", "an EMPTY member list made the whole store one tenant's");
  const mixed = resolveSide(attachedWhole, store({ members }));
  assert.deepEqual([mixed.state, mixed.reason], ["AMBIGUOUS", "MEMBER_DECLARED_TO_ANOTHER_TENANT"], "the real mixed rows were accepted as one tenant's");
  assert.equal(decideForTenant(attachedWhole, T, store()).allowed, false, "a request for tenant T was allowed to read the whole shared store");
});

test("W2 · LAWFUL SAME-TENANT SUCCESS: members that are all one tenant's resolve to it — and the partition route reads that tenant's real rows only", () => {
  const same = resolveSide(attachedWhole, store({ members: mine }));
  assert.deepEqual([same.state, same.tenantId], ["RESOLVED", T], "a genuinely single-tenant member list was refused");
  const part = readTenantPartition({ decision: decidePartition(real, T), tenantId: T, resolve: real, rows });
  assert.ok(part.items.length > 0, "the lawful per-tenant route returned an empty partition");
  assert.ok(part.items.every((it) => tenantOf(rowMembers([rows[it.rowIndex]], "x")[0].identities[0]) === T), "a partition item belongs to another tenant");
});

test("W3 · CONTROL: an ordinary (non-shared) resource attached to one tenant is NOT affected by the rule", () => {
  const siteOnly = Object.assign((q) => (q?.resourceKind === "CRAWL_BATCH" ? { state: "RESOLVED", tenantId: T, reason: "EXPLICIT_DECLARED_ATTACHMENT" } : real(q)), real);
  const r = resolveSide(siteOnly, { resourceKind: "CRAWL_BATCH", resourceRef: "x", scopeClass: "TENANT" });
  assert.equal(r.reason === "A_SHARED_STORE_ATTACHED_WHOLE_IS_NEVER_ONE_TENANTS", false, "the shared-store rule fired on a non-shared kind");
});
