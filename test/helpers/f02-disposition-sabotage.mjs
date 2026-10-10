/**
 * F02 DISPOSITION · SABOTAGE — one deliberate defect per limb of Amendment 1's FAILURE clause and of the F79 freeze
 * constraint, each aimed at the NAMED proof in test/f02-disposition.test.mjs that must turn RED for the intended reason,
 * restored byte-identically, the production trail hashed around the whole run (shared harness: test/helpers/f08-sabotage.mjs).
 *
 *   node test/helpers/f02-disposition-sabotage.mjs --deliberate [--only=D2-S1,…] [--out=<file>]
 *
 * FAILURE: "An existing population crosses tenants" → D2-S1 · "an undeclared learning resource is accepted" → D2-S2 ·
 * "F79 later introduces learning without F02 isolation" → D2-S3 (the freeze constraint dropped) and D2-S4 (its authority
 * check dropped) · "the absence of a learning population is disguised by fixtures or fabricated records" → D2-S5.
 * And the disposition's own mechanisms: the amendment chain (D2-S6), the lawful-retirement proof (D2-S7), an unresolved
 * resource treated as operational (D2-S8).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f02-disposition.test.mjs";
const BOARD = "src/fboard/board.mjs";

export const F02_DISPOSITION_SABOTAGES = [
  { id: "D2-S1", what: "a WHOLE shared collection authorises a tenant read (an existing population crosses tenants)", file: "src/tenancy/scoped-run.mjs", test: T, named: "D6 ·",
    from: `  crawlBatch: (batchId, { env = process.env } = {}) => ({ label: "observation batch", resourceKind: "CRAWL_BATCH",`,
    to: `  crawlBatch: (batchId, { env = process.env } = {}) => ({ label: "observation batch", resourceKind: "COLLECTION_PARTITION",`,
    probe: `const S = await import("./src/tenancy/scope.mjs"); const R = await import("./src/tenancy/resolver.mjs"); const P = await import("./src/tenancy/scoped-run.mjs"); const r = R.createTenantResolver(); const t = r.declarations.tenants[0].tenantId; console.log("DEFECT_TOOK_EFFECT:" + S.decideForTenant(r, t, P.RESOURCES.crawlBatch("crawl-2026-09-12")).allowed);`,
    expect: /a WHOLE CRAWL_BATCH authorised a tenant read/ },

  { id: "D2-S2", what: "an undeclared LEARNING resource is accepted", file: "src/tenancy/scope.mjs", test: T, named: "D4 ·",
    from: "  const requested = requestSide(resolve, requestedTenantId);",
    to: "  const requested = requestSide(resolve, requestedTenantId);\n  if (/LEARNING/.test(String(resource?.resourceKind))) return decideSides(requested, { ...requested });",
    expect: /UNDECLARED_REFUSED|false !== true|true !== false|Expected values to be strictly equal/ },

  { id: "D2-S3", what: "F79's acceptance frozen WITHOUT F02 conformance is accepted (the constraint dropped)", file: BOARD, test: T, named: "D3 ·",
    from: "    if ((acc || frozenHere) && !(acc && CLAUSES.some(",
    to: "    if (false && (acc || frozenHere) && !(acc && CLAUSES.some(",
    expect: /a stand-in F79 freeze without the precondition was NOT refused/ },

  { id: "D2-S4", what: "the F79 constraint silently loses its authority (the CURRENT-ruling check dropped)", file: BOARD, test: T, named: "D3 ·",
    from: `      if (!permits(res)) errs.push({ code: "ROW_CONSTRAINT_WITHOUT_AUTHORITY",`,
    to: `      if (false) errs.push({ code: "ROW_CONSTRAINT_WITHOUT_AUTHORITY",`,
    expect: /ROW_CONSTRAINT_WITHOUT_AUTHORITY|The expression evaluated to a falsy value/ },

  { id: "D2-S5", what: "a learning population fabricated in the resource census", file: "tools/resource-census.mjs", test: T, named: "D5 ·",
    from: `  add({ id: "LEARNING_STORE:(none exists)", kind: "LEARNING_STORE", locator: "— no production learning store or path exists", owner: "—", declared: "—", evidence: "capability gap (its own F-row, unaccepted)", payload: null, members: null, verdict: "NOT_GOVERNED",`,
    to: `  add({ id: "LEARNING_STORE:(none exists)", kind: "LEARNING_STORE", locator: "runs/learning/store.jsonl", owner: "—", declared: "—", evidence: "fixture records", payload: true, members: { population: 3, inPartitions: 3, partitions: 1, undeclared: 0, ambiguous: 0, remainder: 0 }, verdict: "DECLARABLE",`,
    expect: /NOT_GOVERNED|a learning population was measured where none exists|does not match/ },

  { id: "D2-S6", what: "a broken amendment chain accepted", file: BOARD, test: T, named: "D2 ·",
    from: `      if (next.kind !== "ACCEPTANCE_AMENDED" || next.amends?.contractSha256 !== prev.contractSha256 || next.amends?.ruling?.sha256 !== prev.ruling?.sha256) errs.push(`,
    to: `      if (false) errs.push(`,
    expect: /The expression evaluated to a falsy value|ACCEPTANCE_CHAIN_BROKEN/ },

  { id: "D2-S7", what: "a single-tenant collection treated as shared (a lawful attachment could be retired)", file: "src/tenancy/attachment-declaration.mjs", test: T, named: "D7 ·",
    from: "  const shared = p.partitions.size > 1 || p.arithmetic.undeclared > 0 || p.arithmetic.ambiguous > 0;",
    to: "  const shared = true;",
    expect: /true !== false|Expected values to be strictly equal/ },

  { id: "D2-S8", what: "an unresolved resource treated as operational (a gate drops it)", file: "subjects/almi-oet/tools/profession-census.mjs", test: T, named: "D9 ·",
    from: `const SCOPE = scopedEntryPoint({ entry: "subjects/almi-oet/tools/profession-census.mjs", governed: false, resources: [RESOURCES.inputPath(ORGANISATIONS, "a connected product's organisations file")] });`,
    to: `const SCOPE = { tenantId: null, writeScope: null }; void scopedEntryPoint;`,
    expect: /an unresolved resource was treated as operational/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F02_DISPOSITION_SABOTAGES.filter((s) => only.includes(s.id)) : F02_DISPOSITION_SABOTAGES;
  console.log("F02 DISPOSITION · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const probeFailed = run.results.filter((r) => r.tookEffect === false).map((r) => r.id);
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · probes not taking effect: ${probeFailed.length ? probeFailed.join(", ") : "none"} · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F02 DISPOSITION SABOTAGE EVIDENCE — one defect per Amendment 1 FAILURE limb and F79 constraint limb", head }) + `\nEXECUTION ASSERTION: ${executed} of ${list.length} sabotages executed.\n`);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && probeFailed.length === 0 && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
