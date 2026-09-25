/**
 * F04 · SABOTAGE — one deliberate defect per limb of the frozen acceptance's FAILURE clause and per EXPECTED guarantee,
 * each aimed at the NAMED proof that must turn RED for the intended reason, restored byte-identically, the production
 * trail hashed around the whole run (shared harness: test/helpers/f08-sabotage.mjs).
 *
 *   node test/helpers/f04-sabotage.mjs [--only=F4-S1,…] [--out=<file>]
 *
 * FAILURE limbs → sabotages:
 *   proceeds without a declared actor or current permission ........................... F4-S1, F4-S19
 *   a role silently widens tenant or subject scope ..................................... F4-S7
 *   a model, tool, process or commit author treated as a human approver ................ F4-S3, F4-S15
 *   an actor approves its own restricted decision ...................................... F4-S4
 *   a stale or unrelated approval reused ................................................ F4-S5, F4-S6
 *   publishing, payment, export or connected-property change without authority ......... F4-S11, F4-S12, F4-S20
 *   a caller-specific allowlist bypasses the shared decision ........................... F4-S11, F4-S13 (HIDDEN ALIASED CALLER)
 *   proved only by fixtures or an empty population ...................................... F4-S14 (A PATTERN THAT CANNOT FAIL)
 * EXPECTED guarantees → sabotages:
 *   deny overrides allow · the decision before state change · before protected read · before remote work ....
 *                                                                      F4-S2, F4-S8, F4-S9, F4-S10
 * EVIDENCE → non-leakage F4-S17 · audit events F4-S18 · a fabricated owner approval F4-S16
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f04-roles-permissions-approvals.test.mjs";
const AUTH = "src/governance/authorisation.mjs";
const GW = "src/governance/governed-write.mjs";
const ENTRY = "src/governance/scoped-entry.mjs";
const CONN = "src/tenancy/connectors.mjs";
const GATE = "src/cost/paid-provider-gate.mjs";
const REGY = "src/governance/approval-registry.mjs";
const CENSUS = "tools/authorisation-census.mjs";
const CONFIG = "config/governance/authorisation.mjs";
const GUARD = "src/governance/guard-audit.mjs";

export const F04_SABOTAGES = [
  { id: "F4-S1", what: "a governed action proceeds with NO actor named — the identity check is dropped", file: AUTH, test: T, named: "C16 ·",
    from: `  if (typeof actorRef !== "string" || actorRef.trim() === "") return decide("IDENTITY_MISSING", "NO_ACTOR_NAMED");`,
    to: `  if (false) return decide("IDENTITY_MISSING", "NO_ACTOR_NAMED");`,
    expect: /--confirm authorised a write/ },

  { id: "F4-S2", what: "an ALLOW beats a matching DENY", file: AUTH, test: T, named: "C8 ·",
    from: `  if (denies.length && allows.length) return decide("PERMISSION_CONFLICTING", "A_DENY_AND_AN_ALLOW_MATCH_AND_THE_DENY_WINS");`,
    to: `  if (denies.length && allows.length) return decide("AUTHORISED", "EVERY_CHECK_PASSED");`,
    expect: /'AUTHORISED'/ },

  { id: "F4-S3", what: "a model, a service or a commit author is accepted as the human approver", file: AUTH, test: T, named: "FAILURE · a model, tool, process or commit author",
    from: `    if (!approver || approver.actorClass !== (rule.approverClass ?? "HUMAN") || a.approverClass !== approver.actorClass) return decide("APPROVER_NOT_HUMAN", "THE_APPROVER_IS_NOT_A_DECLARED_HUMAN");`,
    to: `    if (false) return decide("APPROVER_NOT_HUMAN", "THE_APPROVER_IS_NOT_A_DECLARED_HUMAN");`,
    expect: /APPROVER_NOT_HUMAN/ },

  { id: "F4-S4", what: "separation of duty dropped — the executor may be its own approver", file: AUTH, test: T, named: "FAILURE · an actor never approves its own",
    from: `    if (rule.separation && a.approverRef === actorRef) return decide("SELF_APPROVAL", "THE_EXECUTOR_IS_ITS_OWN_APPROVER");`,
    to: `    if (false) return decide("SELF_APPROVAL", "THE_EXECUTOR_IS_ITS_OWN_APPROVER");`,
    expect: /SELF_APPROVAL/ },

  { id: "F4-S5", what: "an approval for another action, resource or scope is reused", file: AUTH, test: T, named: "FAILURE · a stale or unrelated approval",
    from: `    if (a.action !== action || a.resource?.resourceClass !== entry.resourceClass || a.resource?.resourceRef !== resourceRef || !sameScope) return decide("APPROVAL_WRONG_TARGET", "THE_APPROVAL_NAMES_ANOTHER_ACTION_RESOURCE_OR_SCOPE");`,
    to: `    if (false) return decide("APPROVAL_WRONG_TARGET", "THE_APPROVAL_NAMES_ANOTHER_ACTION_RESOURCE_OR_SCOPE");`,
    expect: /APPROVAL_WRONG_TARGET/ },

  { id: "F4-S6", what: "an EXPIRED approval still authorises", file: AUTH, test: T, named: "EXPECTED · missing identity, missing role",
    from: `    if (a.expiresAt && a.expiresAt <= now) return decide("APPROVAL_EXPIRED", "THE_APPROVAL_HAS_EXPIRED");`,
    to: `    if (false) return decide("APPROVAL_EXPIRED", "THE_APPROVAL_HAS_EXPIRED");`,
    expect: /APPROVAL_EXPIRED/ },

  { id: "F4-S7", what: "a TENANT action proceeds without F02's resolved tenant — the role supplies the scope", file: AUTH, test: T, named: "FAILURE · a role never silently widens",
    from: `  if (scope.scopeType === "TENANT" && (typeof scope.tenantId !== "string" || scope.tenantId === "")) return decide("SCOPE_UNRESOLVED", "TENANT_ACTION_WITHOUT_AN_F02_RESOLVED_TENANT");`,
    to: `  if (false) return decide("SCOPE_UNRESOLVED", "TENANT_ACTION_WITHOUT_AN_F02_RESOLVED_TENANT");`,
    expect: /the owner's role supplied a tenant F02 did not resolve/ },

  { id: "F4-S8", what: "the boundary writes although the decision refused (state changes before / without authority)", file: GW, test: T, named: "EXPECTED · fail closed BEFORE state changes",
    from: `  if (!authorisation.allowed) {`,
    to: `  if (false) {`,
    expect: /'COMMITTED'/ },

  { id: "F4-S9", what: "a scoped entry point reads on although its actor was refused (protected data read before authority)", file: ENTRY, test: T, named: "EXPECTED · fail closed BEFORE protected data",
    from: `  if (!auth.allowed) process.exit(AUTHORISATION_REFUSED_EXIT);`,
    to: `  if (false) process.exit(AUTHORISATION_REFUSED_EXIT);`,
    expect: /the refused run exited 0, not 5/ },

  { id: "F4-S10", what: "a connector opens on F02's allow alone (remote work before authority)", file: CONN, test: T, named: "EXPECTED · fail closed BEFORE remote work",
    from: `  if (!(scope?.authorisations ?? []).some((d) => authorisesConnector(d, subjectId, kind))) throw new ConnectorRefused("CONNECTOR_NOT_AUTHORISED");`,
    to: `  if (false) throw new ConnectorRefused("CONNECTOR_NOT_AUTHORISED");`,
    expect: /Missing expected exception/ },

  { id: "F4-S11", what: "the paid gate decides by its own authorization list — step 0 dropped (a caller-specific allowlist; money without the owner)", file: GATE, test: T, named: "FAILURE · no caller-specific allowlist",
    from: `    if (!d.allowed) return refuse(provider, "NOT_AUTHORISED_BY_F04", \`the one authorisation decision refused this spend: \${d.outcome}\`, null, s);`,
    to: `    if (false) return refuse(provider, "NOT_AUTHORISED_BY_F04", \`the one authorisation decision refused this spend: \${d.outcome}\`, null, s);`,
    expect: /the gate's own authorization list granted a spend/ },

  { id: "F4-S12", what: "a test-double approval registry is accepted for a REAL provider", file: GATE, test: "test/paid-provider-controls.test.mjs", named: "🔴 a gate cannot be BUILT",
    from: `  if (spendAuthority.approvals && !Object.values(providers ?? {}).every((p) => p?.fake === true)) throw new TypeError(`,
    to: `  if (false) throw new TypeError(`,
    expect: /Missing expected exception/ },

  { id: "F4-S13", what: "a HIDDEN ALIASED CALLER — `import { governedFileWrite as gfw }` — is invisible to the census", file: CENSUS, test: T, named: "CENSUS CONTROLS ·",
    from: `      if (a && GOVERNED_CALLEES.includes(a[1])) names.add(a[2]);`,
    to: `      if (false) names.add(a[2]);`,
    expect: /the aliased caller was not seen/ },

  { id: "F4-S14", what: "A PATTERN THAT CANNOT FAIL — the export pattern matches every name", file: CONFIG, test: T, named: "CENSUS · the real tree",
    from: `  Object.freeze({ pattern: /^EXPORT_[A-Z0-9_]+$/, ...A("EXPORT", "EXPORT_ARTIFACT"), declaredFor: "bin/export.mjs EXPORT_<format>" }),`,
    to: `  Object.freeze({ pattern: /^EXPORT_[A-Z0-9_]+$|.*/, ...A("EXPORT", "EXPORT_ARTIFACT"), declaredFor: "bin/export.mjs EXPORT_<format>" }),`,
    expect: /UNFALSIFIABLE_PATTERN/ },

  { id: "F4-S15", what: "the approval validator accepts a non-human approver", file: REGY, test: T, named: "C3 ·",
    from: `  else if (approver.actorClass !== "HUMAN" || record.approverClass !== "HUMAN") faults.push("APPROVER_NOT_HUMAN");`,
    to: `  else if (false) faults.push("APPROVER_NOT_HUMAN");`,
    expect: /falsy value/ },

  { id: "F4-S16", what: "a FABRICATED owner approval — evidence that is not the governing owner record — validates", file: REGY, test: T, named: "C17 ·",
    from: `  if (!(res.authority.sourceRefs ?? []).some((s) => s?.repo === ev.repo && s?.path === ev.path && s?.blob === ev.blob)) faults.push("EVIDENCE_IS_NOT_THE_GOVERNING_RECORD");`,
    to: `  if (false) faults.push("EVIDENCE_IS_NOT_THE_GOVERNING_RECORD");`,
    expect: /a fabricated evidence reference validated/ },

  { id: "F4-S17", what: "a decision carries the raw resource reference (a tenant id leaks)", file: AUTH, test: T, named: "EVIDENCE · non-leakage",
    from: `    resourceRefDigest: digest(resourceRef),`,
    to: `    resourceRefDigest: digest(resourceRef), resourceRef,`,
    expect: /leaked / },

  { id: "F4-S18", what: "an authorisation decision is classified away from the durable trail", file: GUARD, test: T, named: "EVIDENCE · audit events",
    from: `  if (eventType === "AUTHORISATION_DECISION") return "ACCESS";`,
    to: `  if (eventType === "AUTHORISATION_DECISION") return "CLASSIFICATION";`,
    expect: /'CLASSIFICATION'/ },

  { id: "F4-S19", what: "an identity is inferred from the environment user when none is named", file: AUTH, test: T, named: "C4 ·",
    from: `export const namedActor = (argv = process.argv) => { const h = argv.find((a) => typeof a === "string" && a.startsWith(\`--\${ACTOR_ARG}=\`)); return h ? h.slice(ACTOR_ARG.length + 3) : null; };`,
    to: `export const namedActor = (argv = process.argv) => { const h = argv.find((a) => typeof a === "string" && a.startsWith(\`--\${ACTOR_ARG}=\`)); return h ? h.slice(ACTOR_ARG.length + 3) : (process.env.USERNAME ?? process.env.USER ?? null); };`,
    expect: /reads an identity from the environment|an actor was inferred with none named/ },

  { id: "F4-S20", what: "an authorisation refusal reads as a dry run — the boundary's signal is silenced (an unapproved export exits 0)", file: GW, test: "test/ungated-writers.test.mjs", named: "CONTROL: facts-lifecycle --confirm",
    from: `    onAuthorisationRefused(authorisation);\n`,
    to: ``,
    expect: /did not match/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F04_SABOTAGES.filter((s) => only.includes(s.id)) : F04_SABOTAGES;
  console.log("F04 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F04 SABOTAGE EVIDENCE — one defect per limb of the frozen acceptance", head }) + `\nEXECUTION ASSERTION: ${executed} of ${list.length} executed · ${run.results.length - bad} proved\n`);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
