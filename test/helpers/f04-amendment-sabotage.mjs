/**
 * F04 · AMENDMENT 1 · SABOTAGE — one deliberate defect per way the zero-approved-action reading could be abused, each aimed
 * at the NAMED proof in test/f04-amendment-zero-population.test.mjs, restored byte-identically, the production trail hashed
 * around the whole run (shared harness: test/helpers/f08-sabotage.mjs). Owner command _handoffs 89e8664 §6.
 *
 *   node test/helpers/f04-amendment-sabotage.mjs [--only=F4A-S1,…] [--out=<file>]
 *
 *   F4A-S1 hide an existing approval · F4A-S2 count a control as real · F4A-S3 convert a refusal to success ·
 *   F4A-S4 remove the future-reopen trigger · F4A-S5 let automation create an owner approval ·
 *   F4A-S6 apply the zero-population route to Research · F4A-S7 (original, not in the first set) drop the missing-approval refusal
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f04-amendment-zero-population.test.mjs";
const CENSUS = "tools/zero-population-census.mjs";

export const F04_AMENDMENT_SABOTAGES = [
  { id: "F4A-S1", what: "an existing approval in a high-risk family is hidden from the census", file: CENSUS, test: T, named: "A2 ·",
    from: `    const approvalRecords = [...reg.approvals.values()].filter((a) => inFamily(a.action));`,
    to: `    const approvalRecords = [...reg.approvals.values()].filter(() => false);`,
    expect: /an existing approval was hidden/ },

  { id: "F4A-S2", what: "a confined control is counted as a real request", file: CENSUS, test: T, named: "A4 ·",
    from: `    const realRequests = decisions.length + scopeRefusals.length;`,
    to: `    const realRequests = decisions.length + scopeRefusals.length + (CONFINED_CONTROLS[family] ?? []).length;`,
    expect: /a control was counted as real/ },

  { id: "F4A-S3", what: "a refused decision is counted as an approved action", file: CENSUS, test: T, named: "A3 ·",
    from: `      APPROVED_REAL_ACTION: approved.length,`,
    to: `      APPROVED_REAL_ACTION: approved.length + decisions.filter((e) => e.outcome === "REFUSED").length,`,
    expect: /a refusal counted as an approved action/ },

  { id: "F4A-S4", what: "the future-reopen trigger is removed — a first approved real action no longer forces a re-sit", file: CENSUS, test: T, named: "A6 ·",
    from: `      by, remainder, route, reopen: pinned.includes(family) && route !== "ZERO_APPROVED" ? "REOPEN_F04" : null,`,
    to: `      by, remainder, route, reopen: null,`,
    expect: /an approved real action did not force a re-sit/ },

  { id: "F4A-S5", what: "automation may create an owner approval by claiming the HUMAN class", file: "src/governance/approval-registry.mjs", test: T, named: "A5 ·",
    from: `  else if (approver.actorClass !== "HUMAN" || record.approverClass !== "HUMAN") faults.push("APPROVER_NOT_HUMAN");`,
    to: `  else if (record.approverClass !== "HUMAN") faults.push("APPROVER_NOT_HUMAN");`,
    expect: /automation posed as the owner/ },

  { id: "F4A-S6", what: "the zero-population route is applied to Research, whose real population exists", file: "config/fboard/acceptances.mjs", test: T, named: "AMEND · the zero route never applies",
    from: `    zeroApprovedFamilies: Object.freeze(["SPEND", "EXPORT", "VERIFICATION", "PUBLISH", "CONNECTED_PROPERTY_CHANGE"]),`,
    to: `    zeroApprovedFamilies: Object.freeze(["SPEND", "EXPORT", "VERIFICATION", "PUBLISH", "CONNECTED_PROPERTY_CHANGE", "RESEARCH"]),`,
    expect: /the zero route was applied to RESEARCH/ },

  { id: "F4A-S7", what: "an approval-gated action proceeds with NO approval named (missing approval)", file: "src/governance/authorisation.mjs", test: "test/f04-roles-permissions-approvals.test.mjs", named: "EXPECTED · missing identity, missing role",
    from: `    if (typeof approvalRef !== "string" || approvalRef === "") return decide("APPROVAL_MISSING", "AN_APPROVAL_GATED_FAMILY_NAMED_NO_APPROVAL");`,
    to: `    if (false) return decide("APPROVAL_MISSING", "AN_APPROVAL_GATED_FAMILY_NAMED_NO_APPROVAL");`,
    expect: /APPROVAL_MISSING/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F04_AMENDMENT_SABOTAGES.filter((s) => only.includes(s.id)) : F04_AMENDMENT_SABOTAGES;
  console.log("F04 · AMENDMENT 1 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F04 AMENDMENT 1 SABOTAGE EVIDENCE", head }) + `\nEXECUTION ASSERTION: ${executed} of ${list.length} executed · ${run.results.length - bad} proved\n`);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
