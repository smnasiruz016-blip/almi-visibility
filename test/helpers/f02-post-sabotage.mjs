/**
 * F02 POST-MERGE · SABOTAGE — one deliberate defect per enforcement limb this command added (the partition, the partition
 * consumers, the structural attachment proof, the phantom-resource removal), each aimed at the NAMED proof in
 * test/f02-real-prerequisites.test.mjs that must turn RED for the intended reason, restored byte-identically, the
 * production trail hashed around the whole run (shared harness: test/helpers/f08-sabotage.mjs).
 *
 *   node test/helpers/f02-post-sabotage.mjs --deliberate [--only=P2-S1,…] [--out=<file>]
 *
 * Why these ten: each is one way the ruling's NOT-ALLOWED list or §6's arithmetic could be broken in the code that now
 * enforces it — a member discarded, a shared member given to one tenant, a partition granted without a declared request,
 * a consumer reading past its partition, a run spanning tenants, a majority or a caller's tenant taken as proof, a
 * reassignment let through, a filename taken as identity, a phantom resource put back in a gate.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f02-real-prerequisites.test.mjs";
const PART = "src/tenancy/partition.mjs";
const ATT = "src/tenancy/attachment-declaration.mjs";

export const F02_POST_SABOTAGES = [
  { id: "P2-S1", what: "a quarantined member is discarded (never recorded)", file: PART, test: T, named: "Q1 ·",
    from: "    } else quarantine[c.place].push({ memberId: m.memberId, reason: c.reason });",
    to: "    } else void c;",
    expect: /a member was discarded|remainder|Expected values to be strictly equal/ },

  { id: "P2-S2", what: "a member declared to two tenants is given to the first (whichever passes)", file: PART, test: T, named: "Q4 ·",
    from: `  if (tenants.size > 1) return { place: QUARANTINE.AMBIGUOUS, reason: "MEMBER_IDENTITIES_DECLARED_TO_DIFFERENT_TENANTS" };`,
    to: `  if (false) return { place: QUARANTINE.AMBIGUOUS, reason: "MEMBER_IDENTITIES_DECLARED_TO_DIFFERENT_TENANTS" };`,
    expect: /\[\s*0,\s*2,\s*0\s*\]|\+\s+0|deepStrictEqual/ },

  { id: "P2-S3", what: "a collection partition granted without an ACTIVE declared request", file: "src/tenancy/scope.mjs", test: T, named: "Q5 ·",
    /* The requested side itself is bypassed — a first draft forged only the partition side, and the requested side still
     * refused, so the defect never took effect. */
    from: "    return decideSides(requested, part);",
    to: `    return decideSides({ ...part, state: "RESOLVED", tenantId: "tenant:any" }, { ...part, state: "RESOLVED", tenantId: "tenant:any" });`,
    probe: `const S = await import("./src/tenancy/scope.mjs"); const R = await import("./src/tenancy/resolver.mjs"); const P = await import("./src/tenancy/scoped-run.mjs"); console.log("DEFECT_TOOK_EFFECT:" + S.decideForTenant(R.createTenantResolver(), undefined, P.RESOURCES.collectionPartition("CRAWL_BATCH", "crawl-2026-09-12")).allowed);`,
    expect: /UNDECLARED_REFUSED|INVALID_REFUSED/ },

  { id: "P2-S4", what: "a partition consumer reads the WHOLE batch", file: "bin/edge-graph.mjs", test: T, named: "Q6 ·",
    from: "const crawlRecords = PART.records;",
    to: `const crawlRecords = (await import("../src/crawl/batch-partition.mjs")).collectionMembers({ batchId: BATCH_ID }).map((m) => m.record);`,
    expect: /!==|Expected values to be strictly equal/ },

  { id: "P2-S5", what: "a scheduled consumer reads the whole batch AND runs every tenant", test: T, named: "Q7 ·",
    edits: [
      { file: "bin/detect.mjs", from: "    const r = observedPageSubjects({ partition: crawlPartition() });", to: "    const r = observedPageSubjects();" },
      { file: "bin/detect.mjs", from: "    return groups.filter(onlyThisTenant).map((g) => ({ tenantId: g.tenantId, bundle: g.bundle }));", to: "    return groups.map((g) => ({ tenantId: g.tenantId, bundle: g.bundle }));" },
    ],
    expect: /more than the decided tenant was run/ },

  { id: "P2-S6", what: "a MAJORITY is taken as a structural proof", file: ATT, test: T, named: "A2 ·",
    from: `  if (tenants.length !== 1 || p.arithmetic.undeclared || p.arithmetic.ambiguous) return { proved: false, code: "PROOF_NOT_UNIQUE", arithmetic: p.arithmetic };`,
    to: `  if (tenants.length < 1) return { proved: false, code: "PROOF_NOT_UNIQUE", arithmetic: p.arithmetic };`,
    expect: /PROOF_NOT_UNIQUE/ },

  { id: "P2-S7", what: "the caller's requested tenant accepted in place of the proved one", file: ATT, test: T, named: "A2 ·",
    from: `  if (!decideResolvedTenants(requestedTenantId, tenants[0]).allowed) return { proved: false, code: "PROOF_NAMES_ANOTHER_TENANT", arithmetic: p.arithmetic };`,
    to: `  if (false) return { proved: false, code: "PROOF_NAMES_ANOTHER_TENANT", arithmetic: p.arithmetic };`,
    expect: /PROOF_NAMES_ANOTHER_TENANT/ },

  { id: "P2-S8", what: "an attachment held by another tenant silently reassigned", file: ATT, test: T, named: "A2 ·",
    from: `  if (held.length) return "CONFLICTING_ATTACHMENT";`,
    to: `  if (false) return "CONFLICTING_ATTACHMENT";`,
    expect: /CONFLICTING_ATTACHMENT/ },

  { id: "P2-S9", what: "a captured page's identity taken from its FILE NAME", file: ATT, test: T, named: "A1 ·",
    from: "    identities: [...new Set([p?.url, p?.origin].map(originOf).filter(Boolean))].map((o) => ({ resourceKind: \"SITE_ORIGIN\", resourceRef: o })),",
    to: "    identities: [...new Set([`https://${String(p?.file).split(\"__\")[0]}.example`].map(originOf).filter(Boolean))].map((o) => ({ resourceKind: \"SITE_ORIGIN\", resourceRef: o })),",
    expect: /PROOF_NOT_UNIQUE|Cannot read|undefined|deepStrictEqual/ },

  { id: "P2-S10", what: "an in-memory cache put back into a gate as a store", file: "bin/facts-lifecycle.mjs", test: T, named: "R2 ·",
    from: `RESOURCES.runArtefacts("audit findings")] });`,
    to: `RESOURCES.runArtefacts("audit findings"), RESOURCES.cache("fact cache")] });`,
    expect: /names an in-memory cache as a gated store/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F02_POST_SABOTAGES.filter((s) => only.includes(s.id)) : F02_POST_SABOTAGES;
  console.log("F02 POST-MERGE · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F02 POST-MERGE SABOTAGE EVIDENCE — one defect per new enforcement limb", head }) + `\nEXECUTION ASSERTION: ${executed} of ${list.length} sabotages executed.\n`);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
