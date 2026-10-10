/**
 * F02 §8 · SABOTAGE — one deliberate defect per independent enforcement limb of tenant isolation, each aimed at the NAMED
 * proof in test/f02-tenant-isolation.test.mjs that must turn RED for the intended reason, restored byte-identically, the
 * production trail hashed around the whole run.
 *
 *   node test/helpers/f02-sabotage.mjs --deliberate [--only=F2-S1,…] [--out=<file>]
 *
 * Shares F08's harness (test/helpers/f08-sabotage.mjs: runSabotages / renderEvidence) and F07's execution assertion:
 * every sabotage must EXECUTE, and the executed count is reported. Where the defect's behaviour can be observed directly,
 * a `probe` runs WHILE it is applied and must print DEFECT_TOOK_EFFECT:true — landed in the bytes is not landed in the
 * behaviour. No sabotage is aimed at the production audit trail: the named proofs spawn only non-governed runs or run
 * inside the test context, and the harness hashes the trail before and after.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SCOPE = "src/tenancy/scope.mjs";
const T = "test/f02-tenant-isolation.test.mjs";
/* A probe decides two real declared resources of DIFFERENT tenants through the production decision. */
const PROBE_HEAD = `const { createTenantResolver } = await import("./src/tenancy/resolver.mjs"); const S = await import("./src/tenancy/scope.mjs"); const r = createTenantResolver(); const a = r.declarations.attachments.filter((x) => x.resourceKind === "SITE_ORIGIN"); const res = (x) => ({ resourceKind: x.resourceKind, resourceRef: x.resourceRef, scopeClass: "TENANT" });`;

export const F02_SABOTAGES = [
  { id: "F2-S1", what: "two different declared tenants decided as the same (cross-tenant proceeds)", file: SCOPE, test: T, named: "R2 ·",
    from: `  if (a.tenantId !== b.tenantId) return decision("CROSS_TENANT_REFUSED", "DECLARED_TO_DIFFERENT_TENANTS", a, b);`,
    to: `  if (false && a.tenantId !== b.tenantId) return decision("CROSS_TENANT_REFUSED", "DECLARED_TO_DIFFERENT_TENANTS", a, b);`,
    probe: `${PROBE_HEAD} const d = S.decideRelationship(r, res(a[0]), res(a[1])); console.log("DEFECT_TOOK_EFFECT:" + (d.allowed === true));`,
    expect: /no real cross-tenant refusal|not exactly its own/ },

  { id: "F2-S2", what: "an UNDECLARED side read as allowed", file: SCOPE, test: T, named: "R3 ·",
    from: `  if (states.some((s) => s !== "RESOLVED")) return decision("UNDECLARED_REFUSED", [a, b].find((s) => s.state !== "RESOLVED").reason, a, b);`,
    to: `  if (states.some((s) => s !== "RESOLVED")) return decision("SAME_TENANT_ALLOWED", "UNDECLARED_READ_AS_OWN", a, b);`,
    expect: /SAME_TENANT_ALLOWED/ },

  { id: "F2-S3", what: "a container's members ignored (a batch spanning tenants resolves by its own attachment)", file: SCOPE, test: T, named: "R2 ·",
    from: `  for (const m of resource.members) {`,
    to: `  for (const m of []) {`,
    expect: /no real ambiguous refusal|not refused AMBIGUOUS/ },

  { id: "F2-S4", what: "a GLOBAL_PRODUCT / SUBJECT resource silently treated as TENANT-scoped", file: SCOPE, test: T, named: "R6 ·",
    from: `  if (scopeClass !== "TENANT") return { ...side, state: "NOT_TENANT", reason: \`\${scopeClass}_IS_NOT_A_TENANT_RESOURCE\`, tenantId: null };`,
    to: `  if (false) return { ...side, state: "NOT_TENANT", reason: \`\${scopeClass}_IS_NOT_A_TENANT_RESOURCE\`, tenantId: null };`,
    expect: /GLOBAL_PRODUCT: (CROSS_TENANT_REFUSED|SAME_TENANT_ALLOWED)/ },

  { id: "F2-S5", what: "a refusal decision carries both sides' tenant ids (leak)", file: SCOPE, test: T, named: "R4 ·",
    from: `const publicSide = ({ tenantId, ...rest }) => Object.freeze(rest);`,
    to: `const publicSide = (s) => Object.freeze({ ...s });`,
    expect: /a refusal DECISION carries a tenant id/ },

  { id: "F2-S6", what: "a missing tenant INFERRED from the resource's own declaration (a default tenant)", file: SCOPE, test: T, named: "R3 ·",
    from: `  const requested = requestSide(resolve, requestedTenantId);`,
    to: `  const requested = requestSide(resolve, requestedTenantId ?? resolveSide(resolve, resource).tenantId);`,
    probe: `${PROBE_HEAD} const d = S.decideForTenant(r, undefined, res(a[0])); console.log("DEFECT_TOOK_EFFECT:" + (d.allowed === true));`,
    expect: /allowed with no tenant requested/ },

  { id: "F2-S7", what: "the gate removed from a real production entry point", file: "bin/label-on-face.mjs", test: T, named: "R5 ·",
    from: `const SCOPE = scopedEntryPoint({ entry: "bin/label-on-face.mjs", governed: false, resources: [RESOURCES.factRegistryAt(PRODUCT.factsDir)] });`,
    to: `const SCOPE = { tenantId: null, writeScope: null }; void scopedEntryPoint;`,
    expect: /0 !== 3/ },

  { id: "F2-S8", what: "a relationship path decides tenancy for itself again (audit evidence join)", file: "src/audit-trail/event.mjs", test: T, named: "C2 ·",
    from: `    if (nonEmpty(ref.tenantId) && event.scopeType !== "GLOBAL_PRODUCT" && !decideResolvedTenants(event.tenantId, ref.tenantId).allowed) {`,
    to: `    if (nonEmpty(ref.tenantId) && event.scopeType !== "GLOBAL_PRODUCT" && ref.tenantId !== event.tenantId) {`,
    expect: /src\/audit-trail\/event\.mjs:\d+/ },

  { id: "F2-S9", what: "a client word enters the shared engine's configuration", file: "config/subject-roots.mjs", test: T, named: "L1 ·",
    from: `export const SUBJECT_ROOTS_ENV = "ALMIVISIBILITY_SUBJECT_ROOTS";`,
    to: `export const SUBJECT_ROOTS_ENV = "ALMIVISIBILITY_SUBJECT_ROOTS";\nexport const SUBJECT_HINT = "nursing";`,
    expect: /config\/subject-roots\.mjs/ },

  { id: "F2-S10", what: "the gate removed from a relocated subject tool", file: "subjects/almi-oet/tools/diagnose-overlap.mjs", test: T, named: "L3 ·",
    from: `const SCOPE = scopedEntryPoint({ entry: "subjects/almi-oet/tools/diagnose-overlap.mjs", governed: true, resources: [RESOURCES.inputPath(corpusDir, "--corpus")] });`,
    to: `const SCOPE = { tenantId: null, writeScope: null }; void scopedEntryPoint;`,
    expect: /diagnose-overlap\.mjs exited 2/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F02_SABOTAGES.filter((s) => only.includes(s.id)) : F02_SABOTAGES;
  console.log("F02 §8 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const probeFailed = run.results.filter((r) => r.tookEffect === false).map((r) => r.id);
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · probes that did not take effect: ${probeFailed.length ? probeFailed.join(", ") : "none"} · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const text = renderEvidence(run, { title: "F02 SABOTAGE EVIDENCE — one defect per tenant-isolation enforcement limb (§8)", head }) + `\nEXECUTION ASSERTION: ${executed} of ${list.length} sabotages executed.\n`;
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), text);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && probeFailed.length === 0 && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
