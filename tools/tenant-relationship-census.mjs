#!/usr/bin/env node
/**
 * 🔴 F02 §6 · THE TENANT RELATIONSHIP CENSUS — every production site at which one resource's tenant is weighed against
 * another's, with a remainder of zero.
 *
 *   node tools/tenant-relationship-census.mjs [--check]
 *
 * The tenant-scope census (./tenant-scope-census.mjs) asks whether an ENTRY POINT decides scope before it reads. This one
 * asks the other half of F02: wherever the code relates two tenant identities — a join, a comparison, a merge — does it
 * reach the ONE decision (src/tenancy/scope.mjs), or does it decide tenancy for itself?
 *
 * POPULATION — every tracked .mjs under src/, bin/ and subjects/ (production code), code lines only (comments skipped).
 * A SITE is a code line that either
 *   · calls one of the one decision's functions (DECISION_CALL), or
 *   · compares a tenant identity with ===/!== against anything but null/undefined/"" (TENANT_COMPARISON), or
 *   · keys a Map/Set by a tenant identity (TENANT_KEY) — a partition.
 * CLASSES — each site is exactly one of:
 *   ROUTED          the line reaches the one decision
 *   PARTITION       a Map/Set keyed by a tenant id that GROUPS records apart — it separates tenants, it joins none
 *   EXCLUDED        a named site with its reason: the decision and the resolver themselves, a declaration read, an
 *                   identity-equality key
 *   SELF_DECIDED    🔴 a tenant comparison that does not reach the decision — a DEFECT; --check exits 1
 * The remainder (sites − all four) is printed and must be 0.
 *
 * 🔴 STATED BLIND SPOT: a comparison written without ===/!== or a Map/Set key (e.g. through a sort, a regex, or an
 * object key spread) is not seen. The population census below prints the token count so a reader can see what is read.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export const DECISION_CALL = /\b(decideForTenant|decideRelationship|decideSides|decideResolvedTenants|decideRunResources|decideScopedRun|requireScopedRun|scopedEntryPoint|bindResources|declaredSiteHosts)\(/;
const TENANT_ID = String.raw`[\w$.?\[\]"']*tenantId\b`;
/* Two identities compared: neither operand is a literal (a type name, "", a number), null or undefined, and the tenant side
 * is not under `typeof` — a shape check is not a relationship. */
const OPERAND = String.raw`(?!["'\d])(?!null\b|undefined\b)[\w$.?\[\]]+`;
export const TENANT_COMPARISON = new RegExp(String.raw`(?<!typeof\s+)(?<![\w$.?\[\]])${TENANT_ID}\s*(?:===|!==)\s*${OPERAND}|(?<!typeof\s+)(?<![\w$.?\[\]"'])${OPERAND}\s*(?:===|!==)\s*${TENANT_ID}`);
export const TENANT_KEY = /\.(?:get|has|set|add)\(\s*[\w$.?]*tenantId\b/;

/** Named sites that relate tenant ids WITHOUT being a relationship decision, each with the reason it is not one. */
export const EXCLUSIONS = Object.freeze([
  { file: "src/tenancy/scope.mjs", why: "THE decision itself — every other site is measured against it" },
  { file: "src/tenancy/resolver.mjs", why: "THE resolver — it reads the declarations and answers which tenant a reference is attached to; it relates no two resources" },
  { file: "src/intake/legacy.mjs", match: /a\?\.tenantId === t\.tenantId/, why: "a DECLARATION read: lists the attachments a declaration file itself attaches to one declared tenant — reading the declaration, not relating two resources" },
  { file: "src/detect/subject.mjs", match: /a\.tenantId === b\.tenantId && a\.type === b\.type && a\.identity === b\.identity/, why: "IDENTITY equality: two subject keys are the same key only if every component is equal — a dedupe of one subject, never a join of two; a tenantless subject (a file bundle) must still equal itself, which the decision would refuse" },
]);

const isComment = (t) => t.startsWith("*") || t.startsWith("//") || t.startsWith("/*");

export function census({ files = null, read = (f) => readFileSync(join(REPO, f), "utf8") } = {}) {
  const list = files ?? execFileSync("git", ["-C", REPO, "ls-files", "src", "bin", "subjects"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".mjs"));
  const sites = [];
  let lines = 0;
  for (const file of list) {
    const text = read(file).replace(/\r\n/g, "\n");
    text.split("\n").forEach((raw, i) => {
      const t = raw.trim();
      if (!t || isComment(t)) return;
      lines += 1;
      const call = DECISION_CALL.test(t), cmp = TENANT_COMPARISON.test(t), key = TENANT_KEY.test(t);
      if (!call && !cmp && !key) return;
      const ex = EXCLUSIONS.find((e) => e.file === file && (!e.match || e.match.test(t)));
      const cls = ex ? "EXCLUDED" : call ? "ROUTED" : key && !cmp ? "PARTITION" : "SELF_DECIDED";
      sites.push({ file, line: i + 1, cls, why: ex?.why ?? null, text: t.slice(0, 160) });
    });
  }
  const by = Object.fromEntries(["ROUTED", "PARTITION", "EXCLUDED", "SELF_DECIDED"].map((c) => [c, sites.filter((s) => s.cls === c).length]));
  const unmatchedExclusions = EXCLUSIONS.filter((e) => e.match && !sites.some((s) => s.file === e.file && s.cls === "EXCLUDED" && e.match.test(s.text)));
  return { files: list.length, lines, sites, by, remainder: sites.length - Object.values(by).reduce((a, b) => a + b, 0), unmatchedExclusions };
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/").replace(/^\//, "")}`) {
  const r = census();
  console.log(`TENANT RELATIONSHIP CENSUS — ${r.files} production file(s), ${r.lines} code line(s) read · ${r.sites.length} site(s)`);
  for (const [c, n] of Object.entries(r.by)) console.log(`  ${c.padEnd(14)} ${n}`);
  console.log(`  REMAINDER      ${r.remainder}`);
  for (const s of r.sites.filter((x) => x.cls === "SELF_DECIDED")) console.log(`  🔴 SELF_DECIDED ${s.file}:${s.line} — ${s.text}`);
  for (const s of r.sites.filter((x) => x.cls === "EXCLUDED" && x.why)) console.log(`  EXCLUDED ${s.file}:${s.line} — ${s.why}`);
  for (const s of r.sites.filter((x) => x.cls === "PARTITION")) console.log(`  PARTITION ${s.file}:${s.line}`);
  for (const e of r.unmatchedExclusions) console.log(`  🔴 STALE EXCLUSION ${e.file} — it matches no site any more`);
  if (process.argv.includes("--check") && (r.by.SELF_DECIDED || r.remainder || r.unmatchedExclusions.length)) process.exit(1);
}
