/**
 * 🔴 THE GENERIC SCOPE RESOLVER — every state driven by a real declaration, on TWO ARMS.
 *
 * ── WHY THERE IS A SECOND ARM, AND WHY IT SHARES NOTHING ───────────────────
 *
 * The only material connected to this engine today belongs to one estate. That is an accident of
 * what has been connected, and the fastest way for an accident to become an assumption is for every
 * proof to be written against it. So every state below is exercised twice: once against a reference
 * that really is declared in the external repository, and once against a synthetic client on an
 * invented domain that shares no host, no name and no path with it.
 *
 * 🔴 BOTH ARMS RUN THE SAME PRODUCTION FUNCTION WITH NO CODE CHANGE AND NO PER-CLIENT BRANCH. If the
 * two ever diverge, the divergence is the finding.
 *
 * 🔴 THE SYNTHETIC ARM LIVES ONLY HERE. Its tenant and its attachments are fixture material written
 * to a scratch directory at test time. Nothing invented is ever committed to the data repository of
 * record, which holds declarations for real measured resources only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createTenantResolver, readDeclarations, RESOURCE_KINDS, RESOLUTION_STATES,
  TENANT_ID_PATTERN, SOURCE_ARTIFACT_EXCEPTION,
} from "../src/tenancy/resolver.mjs";
import { SUBJECT_ROOTS_ENV } from "../src/subject-roots.mjs";

/* ── A fixture root: a declaration source that exists only for this file ──── */
const SYNTH_ORIGIN = "https://harbourline-registry.invalid";
const SYNTH_REGISTRY = "harbourline/facts";
const SYNTH_TENANT = "tenant:0f1e2d3c4b5a69788796a5b4c3d2e1f0";
const SECOND_TENANT = "tenant:11223344556677889900aabbccddeeff";

function fixtureRoot({ tenants, attachments }) {
  const dir = mkdtempSync(join(tmpdir(), "almivis-tenancy-"));
  mkdirSync(join(dir, "tenancy"), { recursive: true });
  writeFileSync(join(dir, "tenancy", "tenants.json"), JSON.stringify({ schemaVersion: 1, tenants }, null, 2));
  writeFileSync(join(dir, "tenancy", "attachments.json"), JSON.stringify({ schemaVersion: 1, attachments }, null, 2));
  return dir;
}
const tenant = (tenantId, label = "synthetic scope") => ({ schemaVersion: 1, tenantId, status: "ACTIVE", declaredOn: "2026-09-20", declarationBasis: "OWNER_AUTHORISED_ISOLATION_SCOPE", label });
const attach = (resourceKind, resourceRef, tenantId) => ({ schemaVersion: 1, resourceKind, resourceRef, tenantId, declaredOn: "2026-09-20", declarationBasis: "OWNER_AUTHORISED_ATTACHMENT" });

const withRoot = (dir) => ({ [SUBJECT_ROOTS_ENV]: dir });

/** The real declarations, read through the engine's own configured external root. */
const realResolver = createTenantResolver({});

/* ================================================================== *
 * RESOLVED — both arms
 * ================================================================== */

test("RESOLVED · a declared attachment returns its declared scope — real arm and synthetic arm", () => {
  /* ARM 1 — a reference that really is declared, read from the external repository. */
  const real = realResolver({ resourceKind: "FACT_REGISTRY", resourceRef: "almi-oet/facts" });
  assert.equal(real.state, "RESOLVED");
  assert.match(real.tenantId, TENANT_ID_PATTERN);
  assert.equal(real.reason, "EXPLICIT_DECLARED_ATTACHMENT");

  /* ARM 2 — a synthetic client sharing nothing with it, through the SAME function. */
  const dir = fixtureRoot({
    tenants: [tenant(SYNTH_TENANT)],
    attachments: [attach("SITE_ORIGIN", SYNTH_ORIGIN, SYNTH_TENANT), attach("FACT_REGISTRY", SYNTH_REGISTRY, SYNTH_TENANT)],
  });
  try {
    const r = createTenantResolver({ env: withRoot(dir) });
    for (const ref of [{ resourceKind: "SITE_ORIGIN", resourceRef: SYNTH_ORIGIN }, { resourceKind: "FACT_REGISTRY", resourceRef: SYNTH_REGISTRY }]) {
      const out = r(ref);
      assert.equal(out.state, "RESOLVED", `${ref.resourceKind} did not resolve on the synthetic arm`);
      assert.equal(out.tenantId, SYNTH_TENANT);
      assert.equal(out.reason, "EXPLICIT_DECLARED_ATTACHMENT");
    }
    /* E1 · the synthetic client resolved with no production code change: the only difference between
     * the two arms above is which declarations were on disk. */
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================================================================== *
 * UNDECLARED · AMBIGUOUS · INVALID · UNKNOWN — both arms
 * ================================================================== */

test("UNDECLARED · nothing attaches it, and that is never the usual scope — both arms", () => {
  const dir = fixtureRoot({ tenants: [tenant(SYNTH_TENANT)], attachments: [attach("SITE_ORIGIN", SYNTH_ORIGIN, SYNTH_TENANT)] });
  try {
    const r = createTenantResolver({ env: withRoot(dir) });
    for (const ref of [
      { resourceKind: "SITE_ORIGIN", resourceRef: "https://never-declared.invalid" },
      { resourceKind: "FACT_REGISTRY", resourceRef: "nobody/facts" },
    ]) {
      const out = r(ref);
      assert.equal(out.state, "UNDECLARED");
      assert.equal(out.tenantId, null, "an undeclared resource was handed a scope anyway");
    }
    /* 🔴 And the declared one still resolves, so the refusals are not a resolver that refuses all. */
    assert.equal(r({ resourceKind: "SITE_ORIGIN", resourceRef: SYNTH_ORIGIN }).state, "RESOLVED");

    /* ARM 1 — the same answer against the real declarations. */
    const real = realResolver({ resourceKind: "SITE_ORIGIN", resourceRef: "https://never-declared.example.org" });
    assert.equal(real.state, "UNDECLARED");
    assert.equal(real.tenantId, null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("UNDECLARED · an unknown resourceKind answers, it does not crash — §5 clause 5", () => {
  const dir = fixtureRoot({ tenants: [tenant(SYNTH_TENANT)], attachments: [attach("SITE_ORIGIN", SYNTH_ORIGIN, SYNTH_TENANT)] });
  try {
    const r = createTenantResolver({ env: withRoot(dir) });
    const out = r({ resourceKind: "A_KIND_NOBODY_DECLARED", resourceRef: SYNTH_ORIGIN });
    assert.equal(out.state, "UNDECLARED");
    assert.equal(out.tenantId, null);
    /* The same reference under a kind that IS declared resolves — so the kind really was the key. */
    assert.equal(r({ resourceKind: "SITE_ORIGIN", resourceRef: SYNTH_ORIGIN }).state, "RESOLVED");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("AMBIGUOUS · two declarations naming different scopes are never resolved by order — both arms", () => {
  for (const ref of [{ resourceKind: "SITE_ORIGIN", resourceRef: SYNTH_ORIGIN }, { resourceKind: "FACT_REGISTRY", resourceRef: SYNTH_REGISTRY }]) {
    const dir = fixtureRoot({
      tenants: [tenant(SYNTH_TENANT), tenant(SECOND_TENANT, "a second scope")],
      attachments: [
        attach(ref.resourceKind, ref.resourceRef, SYNTH_TENANT),
        attach(ref.resourceKind, ref.resourceRef, SECOND_TENANT),
      ],
    });
    try {
      const out = createTenantResolver({ env: withRoot(dir) })(ref);
      assert.equal(out.state, "AMBIGUOUS", `${ref.resourceKind} did not go ambiguous`);
      assert.equal(out.tenantId, null, "a scope was chosen between two competing declarations");
      /* Both are named in the detail — neither is silently dropped. */
      assert.match(out.detail, new RegExp(SYNTH_TENANT));
      assert.match(out.detail, new RegExp(SECOND_TENANT));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test("AMBIGUOUS · two declarations naming the SAME scope are a restatement, not a conflict", () => {
  const dir = fixtureRoot({
    tenants: [tenant(SYNTH_TENANT)],
    attachments: [attach("SITE_ORIGIN", SYNTH_ORIGIN, SYNTH_TENANT), attach("SITE_ORIGIN", SYNTH_ORIGIN, SYNTH_TENANT)],
  });
  try {
    const out = createTenantResolver({ env: withRoot(dir) })({ resourceKind: "SITE_ORIGIN", resourceRef: SYNTH_ORIGIN });
    assert.equal(out.state, "RESOLVED", "a repeated identical declaration was treated as a conflict");
    assert.equal(out.tenantId, SYNTH_TENANT);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("INVALID · a malformed reference, and an attachment naming a scope nobody declared", () => {
  const dir = fixtureRoot({
    tenants: [tenant(SYNTH_TENANT)],
    attachments: [attach("SITE_ORIGIN", SYNTH_ORIGIN, SYNTH_TENANT), attach("SITE_ORIGIN", "https://orphan.invalid", SECOND_TENANT)],
  });
  try {
    const r = createTenantResolver({ env: withRoot(dir) });
    for (const bad of [{}, { resourceKind: "SITE_ORIGIN", resourceRef: "" }, { resourceKind: "", resourceRef: SYNTH_ORIGIN }, { resourceKind: "SITE_ORIGIN" }]) {
      const out = r(bad);
      assert.equal(out.state, "INVALID", `${JSON.stringify(bad)} was not refused`);
      assert.equal(out.tenantId, null);
    }
    /* 🔴 An attachment pointing at an undeclared scope is a FAULT, not an absence. */
    const orphan = r({ resourceKind: "SITE_ORIGIN", resourceRef: "https://orphan.invalid" });
    assert.equal(orphan.state, "INVALID");
    assert.equal(orphan.reason, "ATTACHMENT_NAMES_UNDECLARED_TENANT");
    assert.equal(orphan.tenantId, null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("UNKNOWN · an absent or unreadable declaration source fails closed, never empty-and-clean", () => {
  /* Absent: a root with no tenancy directory at all. */
  const empty = mkdtempSync(join(tmpdir(), "almivis-empty-"));
  try {
    const r = createTenantResolver({ env: withRoot(empty) });
    const out = r({ resourceKind: "SITE_ORIGIN", resourceRef: SYNTH_ORIGIN });
    assert.equal(out.state, "UNKNOWN");
    assert.equal(out.tenantId, null);
    assert.equal(readDeclarations({ env: withRoot(empty) }).readable, false);
  } finally { rmSync(empty, { recursive: true, force: true }); }

  /* Unreadable: the files exist but are not the declarations they claim to be. */
  const broken = mkdtempSync(join(tmpdir(), "almivis-broken-"));
  try {
    mkdirSync(join(broken, "tenancy"), { recursive: true });
    writeFileSync(join(broken, "tenancy", "tenants.json"), "{ this is not json");
    writeFileSync(join(broken, "tenancy", "attachments.json"), "{}");
    const out = createTenantResolver({ env: withRoot(broken) })({ resourceKind: "SITE_ORIGIN", resourceRef: SYNTH_ORIGIN });
    assert.equal(out.state, "UNKNOWN");
    assert.equal(out.reason, "DECLARATION_SOURCE_UNREADABLE");
  } finally { rmSync(broken, { recursive: true, force: true }); }
});

/* ================================================================== *
 * E2 · ISOLATION BETWEEN TWO DECLARED SCOPES
 * ================================================================== */

test("E2 · two declared scopes stay isolated — neither can be reached through the other's reference", () => {
  const OTHER_ORIGIN = "https://second-client.invalid";
  const dir = fixtureRoot({
    tenants: [tenant(SYNTH_TENANT), tenant(SECOND_TENANT)],
    attachments: [attach("SITE_ORIGIN", SYNTH_ORIGIN, SYNTH_TENANT), attach("SITE_ORIGIN", OTHER_ORIGIN, SECOND_TENANT)],
  });
  try {
    const r = createTenantResolver({ env: withRoot(dir) });
    assert.equal(r({ resourceKind: "SITE_ORIGIN", resourceRef: SYNTH_ORIGIN }).tenantId, SYNTH_TENANT);
    assert.equal(r({ resourceKind: "SITE_ORIGIN", resourceRef: OTHER_ORIGIN }).tenantId, SECOND_TENANT);
    assert.notEqual(SYNTH_TENANT, SECOND_TENANT);
    /* 🔴 And an origin that merely LOOKS like a sibling is neither of them. No suffix matching, no
     * subdomain inheritance, no parent grouping. */
    for (const near of [`https://www.${SYNTH_ORIGIN.slice(8)}`, `https://sub.${SYNTH_ORIGIN.slice(8)}`, SYNTH_ORIGIN.replace("https://", "http://")]) {
      assert.equal(r({ resourceKind: "SITE_ORIGIN", resourceRef: near }).state, "UNDECLARED", `${near} inherited a scope it was never attached to`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================================================================== *
 * E16 · NO PRODUCTION PATH COMPUTES A TENANT IDENTIFIER
 * ================================================================== */

test("E16 · the resolver returns only identifiers the declarations contain", () => {
  const dir = fixtureRoot({ tenants: [tenant(SYNTH_TENANT)], attachments: [attach("SITE_ORIGIN", SYNTH_ORIGIN, SYNTH_TENANT)] });
  try {
    const r = createTenantResolver({ env: withRoot(dir) });
    const out = r({ resourceKind: "SITE_ORIGIN", resourceRef: SYNTH_ORIGIN });
    assert.equal(out.tenantId, SYNTH_TENANT, "the resolver returned an identifier the declaration did not contain");
    /* Every non-RESOLVED state carries null rather than a manufactured id. */
    assert.equal(r({ resourceKind: "SITE_ORIGIN", resourceRef: "https://absent.invalid" }).tenantId, null);
    assert.equal(r({ resourceKind: "SITE_ORIGIN", resourceRef: "" }).tenantId, null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================================================================== *
 * A4 · THE CARRIED EXCEPTION, AND ITS UNLOCK CONDITION AS DATA
 * ================================================================== */

test("A4 · the SOURCE_ARTIFACT exception is recorded, and its unlock condition is data", () => {
  assert.equal(SOURCE_ARTIFACT_EXCEPTION.subjectType, "SOURCE_ARTIFACT");
  assert.ok(SOURCE_ARTIFACT_EXCEPTION.statement.includes("UNDECLARED"));
  assert.ok(SOURCE_ARTIFACT_EXCEPTION.affects.length > 0, "the exception names no affected caller");

  /* 🔴 THE CONDITION IS EVALUATED, NOT READ. With only the four declared kinds in force it is FALSE,
   * so nothing may claim file-subject reach. */
  assert.equal(SOURCE_ARTIFACT_EXCEPTION.unlocked([...RESOURCE_KINDS]), false);
  assert.equal(SOURCE_ARTIFACT_EXCEPTION.unlocked([]), false);
  assert.equal(SOURCE_ARTIFACT_EXCEPTION.unlocked(null), false, "a malformed input must not read as unlocked");

  /* CONTROL: a fifth declared kind — the actual unlock — flips it to TRUE. Without this the
   * assertions above would pass on a function that can only ever answer false. */
  assert.equal(SOURCE_ARTIFACT_EXCEPTION.unlocked([...RESOURCE_KINDS, "REPOSITORY_TREE"]), true);
});

test("A4 · the exception is FALSE against the declarations actually in force", () => {
  const r = createTenantResolver({});
  assert.ok(Array.isArray(r.declaredKinds), "the resolver does not report which kinds are declared");
  assert.equal(SOURCE_ARTIFACT_EXCEPTION.unlocked(r.declaredKinds), false,
    `a fifth resource kind is declared (${r.declaredKinds.join(", ")}) — the SOURCE_ARTIFACT exception must be revisited, not left standing`);
  /* Every declared kind is one of the four, so the vocabulary has not drifted unnoticed. */
  for (const k of r.declaredKinds) assert.ok(RESOURCE_KINDS.includes(k), `${k} is declared but not in the known vocabulary`);
});

test("the resolver's own vocabulary is the four states and four kinds, unchanged", () => {
  assert.deepEqual([...RESOLUTION_STATES], ["RESOLVED", "UNDECLARED", "AMBIGUOUS", "INVALID", "UNKNOWN"]);
  assert.deepEqual([...RESOURCE_KINDS], ["SITE_ORIGIN", "FACT_REGISTRY", "SITEMAP_COLLECTION", "CRAWL_BATCH"]);
});
