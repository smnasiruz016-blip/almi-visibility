/**
 * F09 · SABOTAGE — one deliberate defect per invariant of the frozen acceptance (cf10494), each aimed at the NAMED proof that
 * must turn RED for the intended reason, restored byte-identically, the production trail hashed around the whole run
 * (shared harness: test/helpers/f08-sabotage.mjs). Owner commands _handoffs e5f5fd4 §14 and the Option A continuation §13.
 *
 *   node test/helpers/f09-sabotage.mjs [--only=F9-S1,…] [--out=<file>]
 *
 * GENERIC: this file names no subject. The one sabotage that plants the subject's word reads it at run time from the subject's
 * own package (the subject whose external-root descriptor declares a research batch).
 *
 * invariant (frozen acceptance)                                   → sabotage
 *   shared code gains the client's name / host / vocabulary       → F9-S1
 *   a check whose pattern cannot fail (neutrality scanner blinded)→ F9-S14
 *   authority from a name instead of the declaration (F02)        → F9-S2
 *   an existing declaration reused or widened (F02)               → F9-S10
 *   connector boundary bypassed (F03)                             → F9-S4
 *   role / authorisation boundary bypassed (F04)                  → F9-S5
 *   evidence / audit boundary bypassed (F08)                      → F9-S6
 *   a read before the scope decision                              → F9-S7
 *   the new client affects another's evidence / outputs           → F9-S8
 *   onboarding works only from the original machine location      → F9-S9
 *   a fixture counted as the real client                          → F9-S11
 *   the F09 acceptance pin                                        → F9-S12
 *   a governed caller behind an alias                             → F9-S13
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f09-cross-client-portability.test.mjs";
const CRAWL = "bin/crawl.mjs";

/* The subject's declared word, read at run time — never written in this file. */
async function subjectWord() {
  const { createTenantResolver } = await import("../../src/tenancy/resolver.mjs");
  const { declaredSubjectIds, lookupSubject } = await import("../../src/tenancy/root-registry.mjs");
  const { loadAllSubjectPackages } = await import("../../src/subject-package.mjs");
  const r = createTenantResolver();
  const id = declaredSubjectIds(r.roots).find((s) => { const l = lookupSubject(r.roots, s); return l.state === "DECLARED" && l.rootKind === "external" && existsSync(join(l.dir, "descriptor.json")); });
  const pkg = (await loadAllSubjectPackages()).find((p) => p.subjectId === id);
  if (!pkg?.vocabulary?.length) throw new Error("no F09 subject package with a vocabulary — the neutrality sabotage cannot be built");
  return pkg.vocabulary[0];
}

export async function f09Sabotages() {
  const WORD = await subjectWord();
  return [
    { id: "F9-S1", what: "shared engine code gains the subject's word (a client-specific constant in the crawler)", file: CRAWL, test: T, named: "F09 · EVIDENCE · zero shared-engine specialisation",
      from: `const researchBatch = arg("research-batch");`,
      to: `const researchBatch = arg("research-batch");\nconst SPECIAL_HOST = "www.${WORD}.example";`,
      expect: /shared engine code names the subject/ },

    { id: "F9-S2", what: "the crawl's store scope comes from the requested tenant's own partition, not the batch's attachment (authority by name)", file: CRAWL, test: T, named: "F09 · EXPECTED · the crawler REFUSES the engine's shared stores",
      from: `const STORES = researchBatch ? [RESOURCES.researchBatch(researchBatch)] :`,
      to: `const STORES = researchBatch ? [RESOURCES.tenantPartition(arg("tenant"), "requested tenant")] :`,
      expect: /another tenant ran on this subject's research batch/ },

    { id: "F9-S4", what: "the live crawl reaches the web through the global fetch, not the declared connector (F03 bypass)", file: CRAWL, test: "test/f03-root-connector-registry.test.mjs", named: "F03 · C2c ·",
      from: `  fetchImpl: live ? openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: "PUBLIC_SITE" }).fetch : NO_REQUEST_FETCH,`,
      to: `  fetchImpl: live ? ((u, i) => fetch(u, i)) : NO_REQUEST_FETCH,`,
      expect: /a site constructs, reads or locates without resolving first/ },

    { id: "F9-S5", what: "a connector opens on F02's allow alone — the F04 authorisation check dropped", file: "src/tenancy/connectors.mjs", test: "test/f04-roles-permissions-approvals.test.mjs", named: "EXPECTED · fail closed BEFORE remote work",
      from: `  if (!(scope?.authorisations ?? []).some((d) => authorisesConnector(d, subjectId, kind))) throw new ConnectorRefused("CONNECTOR_NOT_AUTHORISED");`,
      to: `  if (false) throw new ConnectorRefused("CONNECTOR_NOT_AUTHORISED");`,
      expect: /Missing expected exception/ },

    { id: "F9-S6", what: "the research-batch run record is appended directly, outside the governed boundary (F08 bypass)", file: CRAWL, test: "test/governed-caller-vocabulary.test.mjs", named: "V7 ·",
      from: `const runGoverned = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,`,
      to: `if (researchBatch) appendFileSync(out, JSON.stringify(runRecord) + "\\n");\nconst runGoverned = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,`,
      expect: /Expected values to be strictly (deep-)?equal/ },

    { id: "F9-S7", what: "the crawler reads the research batch's seeds BEFORE its tenant scope is decided", file: CRAWL, test: "test/f02-tenant-isolation.test.mjs", named: "C1 ·",
      from: `const STORES = researchBatch ?`,
      to: `const EARLY = researchBatch ? readFileSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, researchBatch, "seeds.txt"), "utf8") : null;\nconst STORES = researchBatch ?`,
      expect: /Expected values to be strictly deep-equal/ },

    { id: "F9-S8", what: "a tenant's run writes into the engine's SHARED crawl store instead of its own batch (cross-client influence)", file: CRAWL, test: T, named: "F09 · EXPECTED · a tenant run writes ONLY into its own research batch",
      from: `  out = join(batchDir, "crawl.jsonl");`,
      to: `  out = join(REPO, ".test-scratch", "f09-sabotage-shared-crawl.jsonl");`,
      expect: /the run record did not land in the RELOCATED research batch/ },

    { id: "F9-S9", what: "the root index ignores the relocated root the run was given (works only from the original location)", file: "src/tenancy/resolver.mjs", test: T, named: "F09 · EVIDENCE · the subject resolves to the SAME stable identities from a RELOCATED copy",
      from: `export const rootIndexFor = (env = process.env) => readRootIndex({ roots: subjectRoots(env), resourceKinds: RESOURCE_KINDS });`,
      to: `export const rootIndexFor = (env = process.env) => readRootIndex({ roots: subjectRoots(process.env), resourceKinds: RESOURCE_KINDS });`,
      expect: /the relocated declaration was not what resolved/ },

    { id: "F9-S10", what: "an existing attachment may be widened to a second tenant (the conflict refusal dropped)", file: "src/tenancy/attachment-declaration.mjs", test: "test/f02-real-prerequisites.test.mjs", named: "A2 ·",
      from: `  if (held.length) return "CONFLICTING_ATTACHMENT";`,
      to: `  if (false) return "CONFLICTING_ATTACHMENT";`,
      expect: /CONFLICTING_ATTACHMENT/ },

    { id: "F9-S11", what: "the engine's fixture root is relabelled external — a fixture counted as a real client", file: "src/subject-roots.mjs", test: "test/product-cli.test.mjs", named: "the engine's own fixture resolves from the FIXTURES root",
      from: `  return [...fixtures, ...external];`,
      to: `  return [...fixtures.map((r) => ({ ...r, kind: "external" })), ...external];`,
      expect: /fixtures|external/ },

    { id: "F9-S12", what: "the F09 acceptance pin no longer names the frozen contract", file: "config/fboard/acceptances.mjs", test: T, named: "F09 · ACCEPTANCE ·",
      from: `    contractSha256: "d0c8bd96fcba46e712955379fa06e39cbd84186c7af8340adad90aa6fa535027",`,
      to: `    contractSha256: "d0c8bd96fcba46e712955379fa06e39cbd84186c7af8340adad90aa6fa535028",`,
      expect: /d0c8bd96fcba46e712955379fa06e39cbd84186c7af8340adad90aa6fa53502[78]/ },

    { id: "F9-S13", what: "a HIDDEN ALIASED governed caller writes under an unregistered action", file: CRAWL, test: "test/f04-roles-permissions-approvals.test.mjs", named: "CENSUS · the real tree",
      from: `import { governedFileWrite, governedStoreAppend } from "../src/governance/governed-run.mjs";`,
      to: `import { governedFileWrite, governedStoreAppend, governedStoreAppend as gsaHidden } from "../src/governance/governed-run.mjs";\nif (process.env.F09_NEVER) executeGovernedWrite(gsaHidden({ repo: REPO, permission: {}, store: null, records: [], action: "WRITE_F09_HIDDEN_UNREGISTERED" }));`,
      expect: /UNKNOWN_ACTION/ },

    { id: "F9-S14", what: "A PATTERN THAT CANNOT FAIL — the neutrality scanner's pattern matches nothing", file: "tools/product-boundary.mjs", test: T, named: "F09 · EVIDENCE · zero shared-engine specialisation",
      from: `const PRODUCT_WORD_RE = new RegExp(NEUTRALITY_TERMS.map(escapeRe).join("|"), "gi");`,
      to: `const PRODUCT_WORD_RE = new RegExp("(?!)", "gi");`,
      expect: /CONTROL: a planted breach was not seen/ },
  ];
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const all = await f09Sabotages();
  const list = only.length ? all.filter((s) => only.includes(s.id)) : all;
  console.log("F09 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F09 SABOTAGE EVIDENCE — one defect per invariant of the frozen acceptance", head }) + `\nEXECUTION ASSERTION: ${executed} of ${list.length} executed · ${run.results.length - bad} proved\n`);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
