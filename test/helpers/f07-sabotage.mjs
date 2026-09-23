/**
 * F07 §7 · SABOTAGE — one deliberate defect per independent enforcement limb, each aimed at the NAMED proof that must
 * turn RED for the intended reason, restored byte-identically, the production trail hashed around the whole run.
 *
 *   node test/helpers/f07-sabotage.mjs [--only=F7-S1,…] [--out=runs/audit/<file>.txt]
 *
 * Shares F08's harness (test/helpers/f08-sabotage.mjs: runSabotages / renderEvidence). 🔴 ADDED FOR F07: the run
 * ASSERTS THAT EVERY SABOTAGE EXECUTED. In F08 one sabotage never ran and the harness said nothing; a no-op is worse
 * than a failure because it is invisible. The executed count is reported, and a shortfall fails the run.
 *
 * Synthetic payload and confined stores only. No sabotage touches or opens the real sealed material.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SEALED = "src/governance/sealed-paths.mjs";
const GUARD = "src/governance/guard-audit.mjs";
const LIFE = "src/heldout/lifecycle.mjs";
const MANIFEST = "src/governance/mandatory-reading.mjs";
const REGISTER = "src/authority/register.mjs";
const T = "test/f07-heldout-firewall.test.mjs";

export const F07_SABOTAGES = [
  { id: "F7-S1", what: "denial moved AFTER the read", file: SEALED, test: T, named: "P2 ·",
    from: "  const verdict = classifySealed({ registry, root, base, path, ...(realpath ? { realpath } : {}) });",
    to: "  const early = read(join(base, path), encoding); void early;\n  const verdict = classifySealed({ registry, root, base, path, ...(realpath ? { realpath } : {}) });",
    expect: /the loader's reader was called for a sealed path/ },

  /* 🔴 BOTH collapses go. A first draft removed only the leading normalize: the return line normalised again, `..`
   * still collapsed, and the run said "LANDED BUT GREEN" about a defect that had not really landed. */
  { id: "F7-S2", what: "traversal check removed (the lexical limb no longer collapses ./..)", file: SEALED, test: T, named: "P4 ·",
    from: "  const segs = posix.normalize(String(p).replace(/\\\\/g, \"/\")).split(\"/\")\n    .map((s) => (s === \".\" || s === \"..\" ? s : s.replace(/[. ]+$/, \"\")));\n  return posix.normalize(segs.join(\"/\"))",
    to: "  const segs = String(p).replace(/\\\\/g, \"/\").split(\"/\")\n    .map((s) => (s === \".\" || s === \"..\" ? s : s.replace(/[. ]+$/, \"\")));\n  return segs.join(\"/\")",
    expect: /lexical only/ },

  { id: "F7-S3", what: "symlink / junction / 8.3 check removed (the real limb no longer resolves)", file: SEALED, test: T, named: "P5 ·",
    from: "    const realAnc = realpath(anc);",
    to: "    const realAnc = anc;",
    expect: /SEALED_PATH_REFUSED/ },

  { id: "F7-S4", what: "case folding removed from the lexical limb", file: SEALED, test: T, named: "P6 ·",
    from: "  return posix.normalize(segs.join(\"/\")).replace(/^\\.\\//, \"\").replace(/\\/+$/, \"\").toLowerCase();",
    to: "  return posix.normalize(segs.join(\"/\")).replace(/^\\.\\//, \"\").replace(/\\/+$/, \"\");",
    expect: /passed the LEXICAL limb/ },

  { id: "F7-S5", what: "stream / control-character forms no longer refused", file: SEALED, test: T, named: "P6 ·",
    from: "  if (typeof path !== \"string\" || path === \"\" || UNRESOLVABLE(path)) return",
    to: "  if (typeof path !== \"string\" || path === \"\") return",
    expect: /passed the LEXICAL limb/ },

  { id: "F7-S6", what: "unavailable seal metadata read as \"nothing is sealed\" (fail OPEN)", file: SEALED, test: T, named: "P7 ·",
    from: "  if (!Array.isArray(registry) || registry.length === 0) return { unavailable: \"no evidence-role registry was supplied\" };",
    to: "  if (!Array.isArray(registry) || registry.length === 0) return { prefixes: [] };",
    expect: /SEAL_METADATA_UNAVAILABLE/ },

  { id: "F7-S7", what: "mechanism-freeze requirement removed", file: LIFE, test: T, named: "P11 ·",
    from: "  if (!frozen.some((e) => e.metadata.mechanismHash === r.mechanismHash && e.occurredAt <= at)) {",
    to: "  if (false && !frozen.some((e) => e.metadata.mechanismHash === r.mechanismHash && e.occurredAt <= at)) {",
    expect: /MECHANISM_NOT_FROZEN/ },

  { id: "F7-S8", what: "post-access mechanism change allowed at scoring", file: LIFE, test: T, named: "P13 · P31 ·",
    from: "  if (currentMechanismHash !== grant.request.mechanismHash) refuseChangedMechanism(audit, grant, at, meta);\n  const counts",
    to: "  const counts",
    expect: /MECHANISM_CHANGED_AFTER_ACCESS|Missing expected exception/ },

  { id: "F7-S9", what: "access logging removed (an ACCESS decision appends nothing)", file: LIFE, test: T, named: "P14 · P15 ·",
    from: "  const seq = eventsOf(audit).filter((e) => e.action === action).length + 1;",
    to: "  const seq = eventsOf(audit).filter((e) => e.action === action).length + 1;\n  if (action === EVALUATION_ACTIONS.ACCESS) return { event: { eventId: \"0\".repeat(32) } };",
    expect: /Expected values to be strictly deep-equal|not recorded/ },

  { id: "F7-S10", what: "a denominator item silently dropped", file: LIFE, test: T, named: "P16 · P17 · P18 · P19 ·",
    from: "  const declared = [...new Set(declaredItems.map(String))];",
    to: "  const declared = [...new Set(declaredItems.map(String))].slice(1);",
    expect: /Expected values to be strictly equal|POPULATION_NOT_ACCOUNTED/ },

  { id: "F7-S11", what: "UNKNOWN converted to PASS", file: LIFE, test: T, named: "P16 · P17 · P18 · P19 ·",
    from: "    counts[o.verdict] += 1;",
    to: "    counts[o.verdict === \"UNKNOWN\" ? \"PASS\" : o.verdict] += 1;",
    expect: /UNKNOWN or UNAVAILABLE became PASS or vanished/ },

  { id: "F7-S12", what: "payload inserted into an event's metadata (and the metadata-only rule disabled)", test: T, named: "P2 · P8 · P9 ·",
    edits: [
      { file: SEALED, from: "metadata: { guard: \"readUnsealed\", classification: verdict.classification, ruleEntry: verdict.entryId ?? \"NONE\", root: String(root) },", to: "metadata: { guard: \"readUnsealed\", classification: verdict.classification, ruleEntry: verdict.entryId ?? \"NONE\", root: String(root), where: String(path) }," },
      { file: GUARD, from: "  if (extra.length) throw new Error(`GUARD_EVENT_NOT_METADATA_ONLY", to: "  if (false && extra.length) throw new Error(`GUARD_EVENT_NOT_METADATA_ONLY" },
    ],
    expect: /a sealed path or name entered an event/ },

  { id: "F7-S13", what: "the mandatory-reading manifest accepts a sealed path", file: MANIFEST, test: T, named: "P20 · P21 · P22 ·",
    from: "    if (v.refuse) errs.push(",
    to: "    if (false && v.refuse) errs.push(",
    expect: /SEALED_IN_MANIFEST|Expected values to be strictly deep-equal/ },

  { id: "F7-S14", what: "current-authority selection replaced by the OLDEST ruling", file: REGISTER, test: T, named: "P29 ·",
    from: "  const newest = applicable.reduce((m, r) => (key(r) > m ? key(r) : m), \"\");",
    to: "  const newest = applicable.reduce((m, r) => (m === \"\" || key(r) < m ? key(r) : m), \"\");",
    expect: /is superseded yet was applied|CURRENT/ },

  { id: "F7-S15", what: "a product/client term inserted into generic F07 code", file: LIFE, test: T, named: "P26 · P28 ·",
    from: "const HEX64 = /^[0-9a-f]{64}$/;",
    to: "const HEX64 = /^[0-9a-f]{64}$/;\nconst SUBJECT_HINT = \"nursing\"; void SUBJECT_HINT;",
    expect: /names nursing/ },

  { id: "F7-S16", what: "a rerun presented as an untouched evaluation", file: LIFE, test: T, named: "P32 ·",
    from: "  const untouched = status === \"FIRST_ACCESS\";",
    to: "  const untouched = true;",
    expect: /Expected values to be strictly deep-equal/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F07_SABOTAGES.filter((s) => only.includes(s.id)) : F07_SABOTAGES;
  console.log("F07 §7 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const text = renderEvidence(run, { title: "F07 SABOTAGE EVIDENCE — one defect per enforcement limb (§7)", head }) + `\nEXECUTION ASSERTION: ${executed} of ${list.length} sabotages executed (a sabotage that did not run is a failure of this run, never a pass).\n`;
    writeFileSync(join(REPO, outArg), text);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
