/**
 * 🔴 F07 · AMENDMENT 1 — ONE SABOTAGE PER MATERIAL OBLIGATION, derived from the frozen amendment (governance a0b7e4b).
 *
 *   node test/helpers/f07-amendment-sabotage.mjs --deliberate [--only=F7A-S1,…] [--out=<file>]
 *
 * Each sabotage replaces ONE anchor that occurs exactly once, proves the bytes changed (LANDED), runs its NAMED test, and
 * requires it RED for the INTENDED reason; then restores the file byte-for-byte (raw-byte sha256 before == after). The
 * shared harness (f08-sabotage.mjs) FAILS a sabotage that does not land or whose named test never ran, and never targets
 * the production audit trail.
 *
 *   the census does not enumerate a registered HELD_OUT_EVIDENCE / MARKING_KEY entry        → F7A-S1
 *   a leak of a new role is named as a retired finding (the role is lost)                   → F7A-S2
 *   the detector returns leaked content                                                     → F7A-S3
 *   an unreadable registered entry is not failed closed (bare path)                         → F7A-S4
 *   A PATTERN THAT CANNOT FAIL — the member extractor extracts nothing                       → F7A-S5
 *   the in-boundary read goes unrecorded                                                     → F7A-S6
 *   the in-boundary read is not classified as an access                                      → F7A-S7
 *   a derivation that does not reproduce its commitment is accepted                          → F7A-S8
 *   the sealed store itself is read by the leak scan (sealed-path exclusion dropped)         → F7A-S9
 *   the production entry point stops reporting the zero population as NOT_MEASURED           → F7A-S10
 *   a governed caller behind an alias: the entry point routes the new roles around the
 *   recording function (a local alias that reads without recording)                          → F7A-S11
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f07-amendment-leak-census.test.mjs";
const TOOL = "tools/heldout-firewall.mjs";

export function f07AmendmentSabotages() {
  return [
    { id: "F7A-S1", what: "the census enumerates only retired populations — a registered HELD_OUT_EVIDENCE / MARKING_KEY entry is skipped", file: TOOL, test: T, named: "F07A · REAL · the census enumerates every sealed role",
      from: "export const censusEntries = (registry) => (registry || []).filter((e) => SEALED_CENSUS_ROLES.includes(e?.role));",
      to: "export const censusEntries = (registry) => (registry || []).filter((e) => e?.role === \"RETIRED_CONTAMINATED\");",
      expect: /a registered held-out set (and marking key were|or marking key was) not enumerated/ },

    { id: "F7A-S2", what: "a new role's finding is named as a retired finding — the role of what leaked is lost", file: TOOL, test: T, named: "F07A · FIRE · a planted leak of a registered HELD_OUT_EVIDENCE member",
      from: "    } else if (full && FAILING_CATEGORIES.includes(category)) disposition = payloadDisposition;",
      to: "    } else if (full && FAILING_CATEGORIES.includes(category)) disposition = \"FAIL_RETIRED_PAYLOAD\";",
      expect: /the planted held-out leak was not found/ },

    { id: "F7A-S3", what: "the detector returns the leaked content with its result", file: TOOL, test: T, named: "F07A · FIRE · a planted leak of a registered HELD_OUT_EVIDENCE member",
      from: "    results.push({ id: entry.id, role: entry.role, ok: true, members: pop.members.length, source: pop.source, files: pop.files, fragments: fragments.length, rows: s.rows });",
      to: "    results.push({ id: entry.id, role: entry.role, ok: true, members: pop.members.length, source: pop.source, files: pop.files, fragments: fragments.length, rows: s.rows, leaked: pop.members });",
      expect: /the detector returned the leaked content/ },

    { id: "F7A-S4", what: "a registered entry declared by a bare path is accepted instead of failed closed", file: TOOL, test: T, named: "F07A · FAIL-CLOSED",
      from: "  if (r.path && !r.pathPrefixes) return fail(\"SEALED_ROLE_NOT_BEHIND_A_PREFIX\", \"a bare path is not refused to ordinary loaders; a sealed role must be declared by path prefix\");",
      to: "  if (r.path && !r.pathPrefixes) return { ok: true, members: [], others: [], source: \"BARE_PATH\", files: 0 };",
      expect: /c:bare was not refused as SEALED_ROLE_NOT_BEHIND_A_PREFIX/ },

    { id: "F7A-S5", what: "A PATTERN THAT CANNOT FAIL — the member extractor keeps nothing, so no leak can ever be found", file: TOOL, test: T, named: "F07A · FIRE · a planted leak of a registered HELD_OUT_EVIDENCE member",
      from: "    for (const s of parsed === null ? [line] : strings(parsed)) { const m = s.trim().toLowerCase(); if (m.length >= MIN_MEMBER_LENGTH) out.add(m); }",
      to: "    for (const s of parsed === null ? [line] : strings(parsed)) { const m = s.trim().toLowerCase(); if (m.length >= Infinity) out.add(m); }",
      expect: /the constructed held-out population is empty — the control could not fire/ },

    { id: "F7A-S6", what: "the census reads sealed content without recording the access", file: TOOL, test: T, named: "F07A · ACCESS",
      from: "  audit.emit({\n    eventType: \"EVALUATION\", action: CENSUS_READ_ACTION,",
      to: "  (() => {})({\n    eventType: \"EVALUATION\", action: CENSUS_READ_ACTION,",
      expect: /the in-boundary read was not recorded exactly once/ },

    { id: "F7A-S7", what: "the in-boundary read is no longer classified as an ACCESS", file: "src/governance/guard-audit.mjs", test: T, named: "F07A · ACCESS",
      /* Re-anchored 10 Oct 2026 (RR-246): since 4e728af (28 Sep, Part D1) the line also names the key access; the span had not matched
       * since. Same intent — the census's in-boundary read is no longer classified as an ACCESS. */
      from: "  if (eventType === \"EVALUATION\") return action === \"HELDOUT_ACCESS\" || action === \"HELDOUT_CENSUS_READ\" || action === \"HELDOUT_KEY_ACCESS\" ? \"ACCESS\" : \"GOVERNED_CHANGE\";",
      to: "  if (eventType === \"EVALUATION\") return action === \"HELDOUT_ACCESS\" || action === \"HELDOUT_KEY_ACCESS\" ? \"ACCESS\" : \"GOVERNED_CHANGE\";",
      expect: /\+ 'GOVERNED_CHANGE'[\s\S]*- 'ACCESS'/ },

    { id: "F7A-S8", what: "a derivation that does not reproduce its registered commitment is accepted", file: TOOL, test: T, named: "F07A · FAIL-CLOSED",
      from: "    if (typeof commitment !== \"function\" || commitment(members) !== entry.contentHash) return fail(\"DERIVATION_MISMATCH\", \"the derivation does not reproduce the registered commitment\");",
      to: "    if (typeof commitment !== \"function\") return fail(\"DERIVATION_MISMATCH\", \"the derivation does not reproduce the registered commitment\");",
      expect: /c:mismatch was not refused as DERIVATION_MISMATCH/ },

    { id: "F7A-S9", what: "the leak scan opens the sealed store itself — the sealed-path exclusion is dropped", file: TOOL, test: T, named: "F07A · FIRE · a planted leak of a registered HELD_OUT_EVIDENCE member",
      from: "    if (isSealed(registry, root, path)) { sealedExcluded += 1; continue; } // never opened",
      to: "    if (false) { sealedExcluded += 1; continue; } // never opened",
      expect: /a clean tree reported a leak|the planted held-out leak was not found|the sealed store itself was scanned/ },

    { id: "F7A-S10", what: "the production entry point stops reporting a role's zero population as NOT_MEASURED", file: "bin/heldout-firewall.mjs", test: T, named: "F07A · REAL · the production entry point enumerates every sealed role",
      from: "for (const role of [\"HELD_OUT_EVIDENCE\", \"MARKING_KEY\"]) if (!ofRole(role).length) console.log(",
      to: "for (const role of []) if (!ofRole(role).length) console.log(",
      expect: /a zero was not reported as NOT_MEASURED/ },

    { id: "F7A-S11", what: "a governed caller behind an ALIAS — censusNewRoles obtains a new role's population through a local alias that reads the sealed files without recording", file: TOOL, test: T, named: "F07A · ACCESS",
      from: "    const pop = sealedRolePopulation(entry, { roots, filesOf, read, derivers, commitment, audit });",
      to: "    const readRole = (e, o) => sealedRolePopulation(e, { ...o, audit: { emit: () => {} } }); const pop = readRole(entry, { roots, filesOf, read, derivers, commitment, audit });",
      expect: /the in-boundary read was not recorded exactly once/ },
  ];
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const all = f07AmendmentSabotages();
  const list = only.length ? all.filter((s) => only.includes(s.id)) : all;
  console.log("F07 AMENDMENT 1 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F07 AMENDMENT 1 SABOTAGE EVIDENCE — one defect per obligation of the frozen amendment", head }));
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
