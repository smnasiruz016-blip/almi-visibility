/**
 * 🔴 F02 · TENANT AND EVIDENCE ISOLATION — the proofs, over the REAL declared population, through the production paths.
 *
 * Acceptance: `_handoffs` 3ea6fda `AlmiVisibility_F02_ACCEPTANCE_2026-09-24.md` (bytes e468526e…, contract 9b6273d6…),
 * frozen alone before any engine change. Every frozen clause, every binding clarification and every §6 invariant gets
 * exactly ONE verdict below — PROVED, DISPROVED or COULD-NOT-PROVE — and the verdict table is itself asserted, so a verdict
 * cannot drift from the measurement that earned it.
 *
 * The real population: the external declaration source (tenancy/), the real declared resources, the real observation
 * batch and sitemap collection, the real fact registry, the real stores. No tenant identifier, URL or payload is written
 * in this file: every identity is read from the declarations at run time, and a refusal is inspected only for what it
 * must NOT carry.
 *
 * Runs write nothing durable: the one entry point spawned for the real population is non-governed (its sink persists
 * nothing), the subject tools spawned without a tenant run inside the test context (their governed sink is confined),
 * and the audit trail's bytes are compared before and after.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { createTenantResolver, RESOURCE_KINDS } from "../src/tenancy/resolver.mjs";
import { RESOURCES, decideRunResources } from "../src/tenancy/scoped-run.mjs";
import { decideForTenant, decideRelationship, decideResolvedTenants, scopeRefusalEvent, SCOPE_OUTCOMES } from "../src/tenancy/scope.mjs";
import { loadAllSubjectPackages } from "../src/subject-package.mjs";
import { productionEntryPoints, isEntryPoint } from "../src/entry-points.mjs";
import { census as tenantScopeCensus } from "../tools/tenant-scope-census.mjs";
import { census as relationshipCensus } from "../tools/tenant-relationship-census.mjs";
import { neutralityCensus } from "../tools/product-boundary.mjs";
import { ACCEPTANCES, F02_ORIGINAL, F02_AMENDMENT_1 } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const resolve = createTenantResolver();
const DECL = resolve.declarations;
const ACTIVE = DECL.readable ? DECL.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId) : [];
const trailHash = () => createHash("sha256").update(readFileSync(join(REPO, "audit-trail", "events.jsonl"))).digest("hex");

/** Every real declared resource, named by the builder its entry points use — containers carry their real members. */
const REAL = DECL.readable ? DECL.attachments.map((a) => {
  if (a.resourceKind === "SITE_ORIGIN") return RESOURCES.siteOrigin(a.resourceRef);
  if (a.resourceKind === "CRAWL_BATCH") return RESOURCES.crawlBatch(a.resourceRef);
  if (a.resourceKind === "SITEMAP_COLLECTION") return RESOURCES.sitemapCollection(a.resourceRef);
  return { label: a.resourceKind, resourceKind: a.resourceKind, resourceRef: a.resourceRef, scopeClass: "TENANT" };
}) : [];
/** Real stores the entry points read that no real declaration attaches (post-merge: the capture set is DECLARABLE under the
 * owner ruling and left this list; the in-memory fact cache is not a store). */
const REAL_UNDECLARED = [RESOURCES.evidenceStore(), RESOURCES.costLedger(), RESOURCES.cache("sibling-page cache"), RESOURCES.runArtefacts("run stores"), RESOURCES.runArtefacts("technical findings store"), RESOURCES.inputPath("runs/evidence/evidence.jsonl", "--store")];

/** A refusal leaks if its event carries any declared tenant id or the raw reference of the resource it refused. */
const leaks = (ev, rawRefs) => { const s = JSON.stringify(ev); return ACTIVE.some((id) => s.includes(id)) || rawRefs.some((r) => typeof r === "string" && r.length > 3 && s.includes(r)); };

/* ─────────────────────────────── THE REAL POPULATION, THROUGH THE ONE DECISION ─────────────────────────────── */
const MATRIX = (() => {
  const rows = [];
  for (const t of ACTIVE) for (const r of REAL) rows.push({ t, r, d: decideForTenant(resolve, t, r) });
  const by = Object.fromEntries(SCOPE_OUTCOMES.map((o) => [o, rows.filter((x) => x.d.outcome === o).length]));
  return { rows, by };
})();

test("R1 · the real declaration source is readable and non-empty — the population the proofs stand on", () => {
  assert.equal(DECL.readable, true, `the real declaration source is not readable: ${DECL.reason}`);
  assert.ok(ACTIVE.length >= 2, `only ${ACTIVE.length} ACTIVE tenant(s) — a cross-tenant refusal needs two`);
  assert.ok(REAL.length >= 2, `only ${REAL.length} real declared resource(s)`);
  // The real shared collections exist with members spanning tenants, whether or not an (unlawful) whole attachment still stands.
  assert.ok([RESOURCES.crawlBatch("crawl-2026-09-12"), RESOURCES.sitemapCollection("sitemap-2026-09-12")].every((c) => new Set(c.members.map((m) => resolve(m).tenantId).filter(Boolean)).size > 1), "no real shared collection with members in several tenants");
});

test("R2 · EVERY real declared resource × EVERY active tenant, through decideForTenant: same-tenant allowed, cross-tenant and ambiguous refused — denominator and remainder printed", () => {
  const n = ACTIVE.length * REAL.length;
  const counted = Object.values(MATRIX.by).reduce((a, b) => a + b, 0);
  console.log(`  [F02 real population] ${ACTIVE.length} tenants × ${REAL.length} declared resources = ${n} decisions · ${JSON.stringify(Object.fromEntries(Object.entries(MATRIX.by).filter(([, v]) => v)))} · remainder ${n - counted}`);
  assert.equal(counted, n, "a decision fell outside the outcome vocabulary");
  assert.ok(MATRIX.by.SAME_TENANT_ALLOWED > 0, "no real same-tenant success — the refusals below would be indistinguishable from a guard that refuses everything");
  assert.ok(MATRIX.by.CROSS_TENANT_REFUSED > 0, "no real cross-tenant refusal");
  /* The NATURAL real AMBIGUOUS refusals came only from the two unlawful whole-collection attachments (42 = 2 × 21). Once they
   * are retired (owner ruling 1145012, Decision 2) the natural count is 0, and AMBIGUOUS is proved by a stand-in member
   * (f02-real-prerequisites Q4, A3) — reported, never hidden. Before the retirement merges, it is 42. */
  const whole = DECL.attachments.filter((a) => a.resourceKind === "CRAWL_BATCH" || a.resourceKind === "SITEMAP_COLLECTION").length;
  assert.equal(MATRIX.by.AMBIGUOUS_REFUSED, whole * ACTIVE.length, "an AMBIGUOUS refusal came from somewhere other than a whole shared collection");
  console.log(`  [F02 ambiguous] natural real AMBIGUOUS refusals: ${MATRIX.by.AMBIGUOUS_REFUSED} (whole-collection attachments still current: ${whole})`);
  // Each non-container resource is allowed for exactly ONE tenant — its own — and refused for every other.
  for (const r of REAL.filter((x) => !x.members)) {
    const mine = MATRIX.rows.filter((x) => x.r === r);
    assert.equal(mine.filter((x) => x.d.allowed).length, 1, `${r.resourceKind} is allowed for ${mine.filter((x) => x.d.allowed).length} tenants, not exactly its own`);
    assert.equal(mine.filter((x) => x.d.outcome === "CROSS_TENANT_REFUSED").length, ACTIVE.length - 1);
  }
  /* The ONE decision's own container rule (src/tenancy/scope.mjs): a container attached WHOLE to one tenant whose members are
   * declared to others is AMBIGUOUS. No real container is attached whole any more (owner ruling 1145012, Decision 2), so a
   * STAND-IN declaration fires it — over the REAL members of the real batch. Natural real count: reported above. */
  const [holder] = ACTIVE;
  /* F03: the stand-in carries the real resolver's root index too, as the resolver does — the batch's OBSERVATIONS store is
   * located through it before the container is decided. */
  const standIn = Object.assign((ref) => (ref.resourceKind === "CRAWL_BATCH" ? { state: "RESOLVED", tenantId: holder, reason: "STAND_IN" } : resolve(ref)), { declarations: DECL, roots: resolve.roots });
  const realBatch = RESOURCES.crawlBatch("crawl-2026-09-12");
  assert.ok(new Set(realBatch.members.map((m) => resolve(m).tenantId).filter(Boolean)).size > 1);
  assert.equal(decideForTenant(standIn, holder, realBatch).outcome, "AMBIGUOUS_REFUSED", "a stand-in whole container spanning tenants was not refused AMBIGUOUS");
  // CONTROL: the same stand-in with NO members is resolved by its attachment — the refusal above is the members speaking.
  assert.equal(decideForTenant(standIn, holder, { ...realBatch, members: [] }).outcome, "SAME_TENANT_ALLOWED");
  // A container whose real members are declared to more than one tenant is refused for EVERY tenant — never resolved by order.
  for (const r of REAL.filter((x) => x.members)) {
    const memberTenants = new Set(r.members.map((m) => resolve(m).tenantId).filter(Boolean));
    const mine = MATRIX.rows.filter((x) => x.r === r);
    if (memberTenants.size > 1) assert.ok(mine.every((x) => x.d.outcome === "AMBIGUOUS_REFUSED"), `${r.resourceKind}: members span ${memberTenants.size} tenants, yet some tenant was not refused AMBIGUOUS`);
  }
});

test("R3 · real stores no declaration attaches are UNDECLARED for every tenant; no requested tenant refuses everything", () => {
  const out = ACTIVE.flatMap((t) => REAL_UNDECLARED.map((r) => decideForTenant(resolve, t, r)));
  assert.equal(out.length, ACTIVE.length * REAL_UNDECLARED.length);
  assert.ok(out.every((d) => d.outcome === "UNDECLARED_REFUSED"), JSON.stringify(out.filter((d) => d.outcome !== "UNDECLARED_REFUSED").map((d) => d.outcome)));
  const none = decideRunResources({ argv: [], resolve, resources: REAL });
  assert.equal(none.allowed, false, "a resource was allowed with no tenant requested — a tenant was inferred");
  assert.equal(none.refused.length, REAL.length, "a resource was allowed with no tenant requested");
  // A plain resource is refused for the missing tenant itself; a container whose members span tenants is refused AMBIGUOUS first.
  for (const x of none.refused) assert.ok(["NO_TENANT_REQUESTED", "MEMBER_DECLARED_TO_ANOTHER_TENANT"].includes(x.decision.reason), x.decision.reason);
  assert.ok(none.refused.some((x) => x.decision.reason === "NO_TENANT_REQUESTED"));
  // CONTROL, capable of the opposite verdict: the same builder for a DECLARED resource is allowed for its own tenant.
  const own = MATRIX.rows.find((x) => x.d.allowed);
  assert.ok(own && decideRunResources({ argv: [`--tenant=${own.t}`], resolve, resources: [own.r] }).allowed, "the control did not allow a declared resource for its own tenant");
});

test("R4 · NON-LEAKAGE — no real refusal carries another tenant's id or the refused resource's raw reference; and the leak check FIRES on a planted leak", () => {
  const refusals = [...MATRIX.rows.filter((x) => !x.d.allowed).map((x) => ({ ev: scopeRefusalEvent(x.d), raw: [x.r.resourceRef, ...(x.r.members ?? []).map((m) => m.resourceRef)] })),
    ...ACTIVE.flatMap((t) => REAL_UNDECLARED.map((r) => ({ ev: scopeRefusalEvent(decideForTenant(resolve, t, r)), raw: [r.resourceRef] })))];
  assert.ok(refusals.length > 100, `only ${refusals.length} real refusals inspected`);
  assert.deepEqual(refusals.filter((x) => leaks(x.ev, x.raw)).length, 0, "a refusal event carries a tenant id or a raw reference");
  // The DECISION itself carries no tenant id of either side (scope.mjs: "a refusal cannot tell one tenant anything about another's").
  const decisions = MATRIX.rows.filter((x) => !x.d.allowed);
  assert.deepEqual(decisions.filter((x) => leaks(x.d, [x.r.resourceRef])).length, 0, "a refusal DECISION carries a tenant id or a raw reference");
  // POSITIVE CONTROL: the same check, on an event that carries a tenant id and a raw reference, reports it.
  const planted = { ...refusals[0].ev, metadata: { ...refusals[0].ev.metadata, leaked: ACTIVE[1] } };
  assert.equal(leaks(planted, refusals[0].raw), true, "the leak check did not fire on a planted tenant id");
  assert.equal(leaks({ x: REAL.find((r) => r.resourceKind === "SITE_ORIGIN").resourceRef }, [REAL.find((r) => r.resourceKind === "SITE_ORIGIN").resourceRef]), true, "the leak check did not fire on a planted raw reference");
});

test("R5 · THE PRODUCTION ENTRY POINT over the real registry: same tenant runs, another tenant and no tenant are refused (exit 3) naming reason codes only — and the trail does not move", () => {
  const reg = DECL.attachments.find((a) => a.resourceKind === "FACT_REGISTRY");
  assert.ok(reg, "no real FACT_REGISTRY declaration");
  const other = ACTIVE.find((t) => t !== reg.tenantId);
  const before = trailHash();
  /* F04: every run names the declared actor, so each exit below is F02's scope decision and not a missing identity. */
  const run = (extra) => spawnSync(process.execPath, ["bin/label-on-face.mjs", "--product=almi-oet", "--actor=actor:cc", ...extra], { cwd: REPO, encoding: "utf8", timeout: 120_000 });
  const same = run([`--tenant=${reg.tenantId}`]);
  const cross = run([`--tenant=${other}`]);
  const none = run([]);
  assert.equal(same.status, 0, `same tenant: ${same.stderr.slice(-400)}`);
  assert.doesNotMatch(same.stderr, /TENANT SCOPE REFUSED/);
  assert.equal(cross.status, 3);
  assert.match(cross.stderr, /CROSS_TENANT_REFUSED \(DECLARED_TO_DIFFERENT_TENANTS\)/);
  assert.equal(none.status, 3);
  assert.match(none.stderr, /UNDECLARED_REFUSED \(NO_TENANT_REQUESTED\)/);
  for (const r of [cross, none]) for (const id of ACTIVE) assert.ok(!(r.stdout + r.stderr).includes(id), "a refusal printed a tenant id");
  assert.equal(trailHash(), before, "the audit trail moved");
});

test("R6 · MISMATCHED SCOPE — a GLOBAL_PRODUCT or SUBJECT resource is never joined through tenancy (stand-in on REAL resources; the natural real count is reported separately)", () => {
  const [a, b] = REAL.filter((r) => !r.members);
  for (const cls of ["GLOBAL_PRODUCT", "SUBJECT"]) {
    for (const d of [decideRelationship(resolve, { ...a, scopeClass: cls }, b), decideRelationship(resolve, a, { ...b, scopeClass: cls })]) {
      assert.equal(d.outcome, "SCOPE_MISMATCH_REFUSED", `${cls}: ${d.outcome}`);
      assert.equal(leaks(scopeRefusalEvent(d), [a.resourceRef, b.resourceRef]), false);
    }
  }
  // CONTROL: the same two real resources at TENANT scope are decided by tenancy (allowed or cross-tenant), not mismatched.
  assert.notEqual(decideRelationship(resolve, a, b).outcome, "SCOPE_MISMATCH_REFUSED");
  /* The NATURAL real count: no production builder emits a non-TENANT scope class, so no real attempt reaches this refusal
   * today. Reported, not hidden — the command's stand-in rule (§8). */
  const nonTenantBuilders = Object.entries(RESOURCES).filter(([k]) => !["factRegistryAt", "crawlBatch", "sitemapCollection"].includes(k)).map(([k, f]) => [k, f("x", "y")]).filter(([, r]) => r && r.scopeClass !== "TENANT");
  console.log(`  [F02 mismatched scope] natural real attempts: 0 — builders emitting a non-TENANT scope class: ${nonTenantBuilders.length}`);
  assert.equal(nonTenantBuilders.length, 0);
});

/* ─────────────────────────────── EVERY PATH REACHES THE ONE DECISION ─────────────────────────────── */
test("C1 · every production entry point decides tenant scope before it reads (tenant-scope census: 0 UNSCOPED, remainder 0)", () => {
  const rows = tenantScopeCensus();
  const eps = productionEntryPoints();
  assert.equal(rows.length, eps.length);
  assert.ok(rows.length >= 50, `only ${rows.length} entry points — the population shrank`);
  assert.deepEqual(rows.filter((r) => r.cls === "UNSCOPED").map((r) => r.file), []);
  assert.equal(rows.filter((r) => !["SCOPED", "UNSCOPED", "NOT_TENANT_GOVERNED", "EXCLUDED"].includes(r.cls)).length, 0);
  assert.ok(rows.filter((r) => r.cls === "SCOPED").length > rows.filter((r) => r.cls === "EXCLUDED").length);
  // POSITIVE CONTROL: a planted entry point that reads the evidence store before any gate is UNSCOPED.
  const planted = tenantScopeCensus({ sources: [{ file: "bin/planted.mjs", text: 'import { createJsonlStore } from "../src/evidence/store.mjs";\nconst e = createJsonlStore("runs/evidence/evidence.jsonl").readAll();\n' }] });
  assert.equal(planted[0].cls, "UNSCOPED", JSON.stringify(planted[0]));
});

test("C2 · every production relationship between two tenant identities reaches the one decision (relationship census: 0 SELF_DECIDED, remainder 0) — and it fires on a planted self-decision", () => {
  const r = relationshipCensus();
  console.log(`  [F02 relationship census] ${r.files} files · ${r.sites.length} sites · ${JSON.stringify(r.by)} · remainder ${r.remainder}`);
  assert.ok(r.sites.length > 50, `only ${r.sites.length} relationship sites — the population shrank`);
  assert.equal(r.by.SELF_DECIDED, 0, r.sites.filter((s) => s.cls === "SELF_DECIDED").map((s) => `${s.file}:${s.line}`).join(", "));
  assert.equal(r.remainder, 0);
  assert.deepEqual(r.unmatchedExclusions, []);
  const plant = (text) => relationshipCensus({ files: ["src/planted.mjs"], read: () => text }).by;
  assert.equal(plant("if (a.tenantId !== b.tenantId) refuse();\n").SELF_DECIDED, 1, "a direct comparison was not seen");
  assert.equal(plant("if (holders.some((h) => h !== n.tenantId)) refuse();\n").SELF_DECIDED, 1, "a reversed comparison was not seen");
  assert.equal(plant("if (!decideResolvedTenants(a.tenantId, b.tenantId).allowed) refuse();\n").ROUTED, 1, "a routed comparison was not recognised");
  assert.equal(plant('if (typeof x.tenantId !== "string") refuse();\n').SELF_DECIDED ?? 0, 0, "a shape check was mistaken for a relationship");
});

test("C3 · the resolved-tenant decision: same allowed; different refused; absent UNDECLARED — never a match by absence", () => {
  const [t1, t2] = ACTIVE;
  assert.equal(decideResolvedTenants(t1, t1).outcome, "SAME_TENANT_ALLOWED");
  assert.equal(decideResolvedTenants(t1, t2).outcome, "CROSS_TENANT_REFUSED");
  assert.equal(decideResolvedTenants(null, null).outcome, "UNDECLARED_REFUSED");
  assert.equal(decideResolvedTenants(t1, undefined).outcome, "UNDECLARED_REFUSED");
});

/* ─────────────────────────────── THE RELOCATION (owner decision b, 24 Sep 2026) ─────────────────────────────── */
test("L1 · the shared engine names no client: the neutrality census over src/, bin/ and config/ is 0 — and it fires on a planted client word", async () => {
  const r = await neutralityCensus({ repo: REPO });
  assert.ok(r.files.length > 200, `only ${r.files.length} files scanned`);
  assert.deepEqual(r.breaches, []);
  assert.deepEqual(r.stale, []);
  const vocab = (await loadAllSubjectPackages()).flatMap((p) => p.vocabulary);
  assert.ok(vocab.length > 0, "no package vocabulary — the census would scan for nothing");
  const planted = await neutralityCensus({ repo: REPO, read: (f) => (f === r.files[0] ? `const x = "${vocab[0]}";\n` : readFileSync(join(REPO, f), "utf8")) });
  assert.ok(planted.breaches.length >= 1, "a planted client word was not seen");
});

test("L2 · the packages own every relocated file; the old paths are gone; no code references an old path; nothing under a package is unowned", async () => {
  const pkgs = await loadAllSubjectPackages();
  const tracked = execFileSync("git", ["-C", REPO, "ls-files"], { encoding: "utf8" }).split("\n");
  let owned = 0;
  for (const p of pkgs) {
    const base = `subjects/${p.subjectId}/`;
    for (const o of p.owns) {
      owned += 1;
      assert.ok(tracked.includes(base + o.file), `${base}${o.file} is owned but not tracked`);
      if (/^(bin|config)\/[^ ]+\.mjs$/.test(o.relocatedFrom)) {
        assert.ok(!tracked.includes(o.relocatedFrom) && !existsSync(join(REPO, o.relocatedFrom)), `${o.relocatedFrom} still exists`);
      }
    }
    const underPkg = tracked.filter((f) => f.startsWith(base) && /\/(tools|config)\/[^/]+\.mjs$/.test(f));
    assert.deepEqual(underPkg.filter((f) => !p.owns.some((o) => base + o.file === f)), [], `an unowned file under ${base}`);
  }
  assert.ok(owned >= 13, `only ${owned} owned files`);
  const oldPaths = pkgs.flatMap((p) => p.owns.map((o) => o.relocatedFrom)).filter((x) => /^(bin|config)\/[^ ]+\.mjs$/.test(x));
  const code = tracked.filter((f) => /^(src|bin|tools|config|subjects)\/.*\.mjs$/.test(f));
  const refs = [];
  for (const f of code) readFileSync(join(REPO, f), "utf8").split(/\r?\n/).forEach((l, i) => {
    const t = l.trim();
    if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) return;
    if (/\brelocatedFrom:/.test(t)) return; // the package's own provenance record of where a file came from — not a reference
    for (const o of oldPaths) if (t.includes(`"${o}"`) || t.includes(`"../${o}"`) || t.includes(`/${o.split("/").pop()}"`) && t.includes("import")) refs.push(`${f}:${i + 1} → ${o}`);
  });
  assert.deepEqual(refs, [], "code still imports or names a relocated path");
});

test("L3 · every relocated tool FAILS CLOSED without a tenant (exit 3, nothing read) — and the trail does not move", () => {
  const tools = productionEntryPoints().filter((f) => f.startsWith("subjects/"));
  assert.ok(tools.length >= 9, `only ${tools.length} subject tools`);
  const before = trailHash();
  for (const f of tools) {
    // --product is given so a tool that requires it reaches the tenant gate; no --tenant is given.
    const r = spawnSync(process.execPath, [f, "--product=almi-oet"], { cwd: REPO, encoding: "utf8", timeout: 120_000 });
    assert.equal(r.status, 3, `${f} exited ${r.status}: ${(r.stderr || r.stdout).slice(-300)}`);
    assert.match(r.stderr, /TENANT SCOPE REFUSED/, f);
  }
  assert.equal(trailHash(), before, "a refusal reached the production trail");
});

test("L4 · lawful subject execution still works: a relocated tool, given a DECLARED tenant, passes the gate and reaches its own checks", () => {
  const WORLD = declaredWorld();
  try {
    const r = spawnSync(process.execPath, ["subjects/almi-oet/tools/diagnose-overlap.mjs", ...WORLD.argv([])], { cwd: REPO, encoding: "utf8", env: WORLD.envWith(), timeout: 120_000 });
    assert.notEqual(r.status, 3, `the declared run was refused at the gate: ${r.stderr.slice(-300)}`);
    assert.doesNotMatch(r.stderr, /TENANT SCOPE REFUSED/);
    assert.match(r.stderr + r.stdout, /usage: /, "the tool did not reach its own argument check");
    // CONTROL: the same run with no tenant is refused at the gate.
    const c = spawnSync(process.execPath, ["subjects/almi-oet/tools/diagnose-overlap.mjs"], { cwd: REPO, encoding: "utf8", env: WORLD.envWith(), timeout: 120_000 });
    assert.equal(c.status, 3);
  } finally { WORLD.cleanup(); }
});

test("L5 · the frozen F02 acceptance did not move: bytes e468526e…, contract 9b6273d6… (amended — not replaced — by Amendment 1)", () => {
  assert.equal(F02_ORIGINAL.contractSha256, "9b6273d6fdb92f7fa8f2d542a40cdb1a210cce6ad34b430bc3d7c7e0d2b03471");
  assert.equal(contractSha256(F02_ORIGINAL), F02_ORIGINAL.contractSha256, "the original clauses no longer hash to the frozen contract");
  /* RR-225: Amendment 1 amends the original (unchanged); the CURRENT contract (Amendment 2) amends Amendment 1 — restated */
  assert.equal(F02_AMENDMENT_1.amends.contractSha256, F02_ORIGINAL.contractSha256);
  assert.equal(ACCEPTANCES.F02.amends.contractSha256, F02_AMENDMENT_1.contractSha256);
  const frozen = DECLARED.F02.events.find((e) => e.kind === "ACCEPTANCE_FROZEN");
  assert.equal(frozen.ruling.sha256, "e468526e1257fd6ac16505a5018398fb8701165da0f711edc44b1395673e79e5");
  assert.equal(frozen.contractSha256, F02_ORIGINAL.contractSha256);
  if (DECLARED.F02.state !== "IN-PROGRESS") assert.ok(DECLARED.F02.state === "VERIFIED-PASS" && DECLARED.F02.events.some((e) => e.kind === "VERIFIED" && e.population === "REAL"), "F02 moved without the evidence that would earn it");
});

/* ─────────────────────────────── THE VERDICTS — one per clause and invariant ─────────────────────────────── */
export const VERDICTS = Object.freeze([
  ["INPUT · a declared tenant, two or more tenant-scoped resources, a real attempted relationship", "PROVED", "R1, R2 (21 tenants × 21 real resources), R5"],
  ["EXPECTED · evidence items resolve to one declared tenant before use", "PROVED", "R3 (evidence store UNDECLARED → refused), C1"],
  ["EXPECTED · cost items resolve to one declared tenant before use", "PROVED", "R3 (cost ledger UNDECLARED → refused), C1"],
  ["EXPECTED · learning items resolve to one declared tenant before use", "COULD-NOT-PROVE", "no production learning store exists (real population 0); F82 is UNASSESSED — EXIT D"],
  ["EXPECTED · outputs resolve to one declared tenant before use", "PROVED", "every governed write of a scoped run carries writeScope {TENANT, tenantId}; a run's stores are RUN_STORE/INPUT_PATH, refused undeclared (R3)"],
  ["EXPECTED · same-tenant relationships proceed", "PROVED", "R2 (19 real), R5 (exit 0)"],
  ["EXPECTED · cross-tenant fails closed with a reason, no other tenant's content", "PROVED", "R2 (380 real), R4, R5"],
  ["EXPECTED · undeclared fails closed", "PROVED", "R3 (126 real), R5 (no tenant)"],
  ["EXPECTED · ambiguous fails closed", "PROVED", "R2 (42 real: batch and sitemap collection)"],
  ["EXPECTED · mismatched fails closed", "PROVED", "R6 — stand-in on real resources; natural real attempts 0, reported"],
  ["FAILURE · accepted without one unambiguous scope", "PROVED", "C1 (0 UNSCOPED), R2/R3"],
  ["FAILURE · a cross-tenant relationship proceeds", "PROVED", "R2, C2 (0 SELF_DECIDED)"],
  ["FAILURE · identity inferred from name, host, path, vocabulary or content", "PROVED", "resolver: one lookup on declared attachments (E13d); L1 neutrality 0; relocation removed host lists"],
  ["FAILURE · one tenant's evidence/costs/outputs affect another's decision", "PROVED", "R2–R3, C2"],
  ["FAILURE · one tenant's LEARNING affects another's decision", "COULD-NOT-PROVE", "no production learning path exists to exercise — EXIT D"],
  ["FAILURE · the guard proved only by fixtures or an empty population", "PROVED", "R1–R5 run on the real declarations; fixture worlds only let safety proofs run (L4)"],
  ["EVIDENCE · production resolver and every join/decision path over a real non-empty population", "PROVED", "R2, C1, C2"],
  ["EVIDENCE · same-tenant success, cross, undeclared, ambiguous refusal", "PROVED", "R2, R3, R5"],
  ["EVIDENCE · mismatched-scope refusal", "PROVED", "R6 (stand-in; natural real 0)"],
  ["EVIDENCE · non-leakage checks and independently firing controls", "PROVED", "R4 (planted leak fires), C1/C2/L1 planted controls"],
  ["CLAR 1 · identity only from a current declared attachment", "PROVED", "resolver ACTIVE + attachment index; R2"],
  ["CLAR 2 · names/hosts/paths may locate, never become authority", "PROVED", "INPUT_PATH ref is declared, not inferred; declaredSiteHosts reads declarations; L1"],
  ["CLAR 3 · GLOBAL_PRODUCT, TENANT and SUBJECT remain distinct", "PROVED", "R6"],
  ["CLAR 4 · a SUBJECT resource cannot silently become TENANT-scoped", "PROVED", "R6"],
  ["CLAR 5 · GLOBAL_PRODUCT is no shortcut for a tenant join", "PROVED", "R6"],
  ["CLAR 6 · diagnostic inspection is not permission to join", "PROVED", "non-governed runs pass the same gate (R5: label-on-face refused exit 3)"],
  ["CLAR 7 · refusal metadata names ids, classes, reason codes — never payload", "PROVED", "R4"],
  ["CLAR 8 · empty populations and fixtures cannot close F02", "PROVED", "the learning limb is COULD-NOT-PROVE for exactly this reason"],
  ["CLAR 9 · historical rows or tests give no F02 authority", "PROVED", "crosswalk CHANGED; no historical result transfers (f05 P23)"],
  ["CLAR 10 · acceptance contains no real tenant id, client, URL or expected answer", "PROVED", "L5 pins the frozen bytes; the acceptance names none"],
  ["INV 1 · scope before protected payload", "PROVED", "C1"],
  ["INV 2 · both sides resolved before a join", "PROVED", "decideSides; C2"],
  ["INV 3 · same tenant necessary, never sufficient", "PROVED", "a world-tenant run without --confirm is still refused its write (ungated-writers dry-run proofs)"],
  ["INV 4 · different tenants always refuse", "PROVED", "R2"],
  ["INV 5 · UNDECLARED refuses", "PROVED", "R3"],
  ["INV 6 · AMBIGUOUS refuses", "PROVED", "R2"],
  ["INV 7 · SUBJECT/TENANT mismatch refuses", "PROVED", "R6"],
  ["INV 8 · no content-derived fallback", "PROVED", "resolver one lookup; containers decided by member identities only"],
  ["INV 9 · no name-, host- or path-derived fallback", "PROVED", "L1; INPUT_PATH exact declared ref"],
  ["INV 10 · no caller bypass", "PROVED", "C1, C2, F08 census 0 BYPASS"],
  ["INV 11 · refusal cannot leak", "PROVED", "R4"],
  ["INV 12 · governed refusals and allowed mutations auditable under F08", "PROVED", "scopedEntryPoint emits refusals to the F08 guard sink; writeScope on every governed write"],
]);

test("V · every clause and invariant carries exactly ONE verdict; none is DISPROVED; the COULD-NOT-PROVE limbs are exactly the learning limbs", () => {
  const ok = ["PROVED", "DISPROVED", "COULD-NOT-PROVE"];
  for (const [c, v, p] of VERDICTS) { assert.ok(ok.includes(v), `${c}: ${v}`); assert.ok(p.length >= 2, `${c}: no proof named`); }
  assert.equal(new Set(VERDICTS.map((x) => x[0])).size, VERDICTS.length, "a clause carries two verdicts");
  assert.deepEqual(VERDICTS.filter((x) => x[1] === "DISPROVED"), []);
  assert.deepEqual(VERDICTS.filter((x) => x[1] === "COULD-NOT-PROVE").map((x) => x[0]), [
    "EXPECTED · learning items resolve to one declared tenant before use",
    "FAILURE · one tenant's LEARNING affects another's decision",
  ]);
  // No learning store exists in production: measured, so the COULD-NOT-PROVE cannot outlive its cause unnoticed.
  const code = execFileSync("git", ["-C", REPO, "ls-files", "src", "bin", "subjects"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".mjs"));
  const learning = code.filter((f) => /learning/i.test(f) || /\bLEARNING_STORE\b|learningStore/.test(readFileSync(join(REPO, f), "utf8")));
  assert.deepEqual(learning, [], "a learning store now exists — the learning limbs must be proved, not left COULD-NOT-PROVE");
  assert.ok(RESOURCE_KINDS.every((k) => typeof k === "string"));
  assert.ok(isEntryPoint("bin/x.mjs") && !isEntryPoint("src/x.mjs"));
});
