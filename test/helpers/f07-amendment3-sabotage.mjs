/**
 * 🔴 F07 · AMENDMENT 3 — ONE SABOTAGE PER ADDED FAILURE LIMB, derived from the frozen amendment (governance 264c680).
 *
 *   node test/helpers/f07-amendment3-sabotage.mjs [--only=F7C-S1,…] [--out=<file>]
 *
 * Each sabotage replaces ONE anchor that occurs exactly once, proves the bytes changed (LANDED), runs its NAMED test, and
 * requires it RED for the INTENDED reason — an assertion message of that test, never a test name; then restores the file
 * byte-for-byte. The shared harness (f08-sabotage.mjs) fails a sabotage that does not land or whose named test never ran,
 * and never targets the production audit trail.
 *
 *   L6  ABSTAIN vs NO      a NO counted as an abstention · abstentions never counted · an ABSTAIN dropped from D · an ABSTAIN
 *                          scored positive · an ABSTAIN accepted where no count can show it              → F7C-S1…S4, S14
 *   L7  PAIRED RELEASE     discordance ignores the partner · "both ways" checks one side · a fourth aggregate released ·
 *                          paired aggregates released for an unpaired protocol                           → F7C-S5…S8
 *   L8  PAIR STRUCTURE     a malformed id accepted · a duplicate pair accepted · a dangling partner accepted · a structure
 *                          fault not refused                                                              → F7C-S9…S12
 *   L10 PREFLIGHT          the claim made before the preflight · the completeness check dropped           → F7C-S13, S15
 *   L5  CEILING            the seven-token paired ceiling not applied                                     → F7C-S16
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f07-amendment3-paired.test.mjs";
const LIFE = "src/heldout/lifecycle.mjs";
const RELEASE = "F07A3 · L7 · a paired run releases EXACTLY";
const UNPAIRED = "F07A3 · L7 · an UNPAIRED protocol";
const ABST = "F07A3 · L6 · an ABSTAIN stays in D";
const PAIRS = "F07A3 · L8 · a malformed, duplicate or dangling";
const INCOMPLETE = "F07A3 · L10 · an INCOMPLETE key";
const CEILING = "F07A3 · L5 · a paired protocol carries at most SEVEN";

const COUNT = "    if (isAbstain(outputs.get(i))) abstentions += 1;";
const POSITIVE = "  const positive = (i, c) => !isAbstain(outputs.get(i)) && outputs.get(i).classes.includes(c);";

export function f07Amendment3Sabotages() {
  return [
    { id: "F7C-S1", what: "a NO is counted as an abstention — ABSTAIN and NO cannot be told apart", file: LIFE, test: T, named: ABST,
      from: COUNT, to: "    if (isAbstain(outputs.get(i)) || outputs.get(i).classes.length === 0) abstentions += 1;",
      expect: /a NO was counted as an abstention/ },
    { id: "F7C-S2", what: "abstentions are never counted", file: LIFE, test: T, named: ABST,
      from: COUNT, to: "    // sabotaged: abstentions are not counted",
      expect: /an ABSTAIN was not counted as an abstention/ },
    { id: "F7C-S3", what: "an ABSTAIN is dropped from the denominator", file: LIFE, test: T, named: ABST,
      from: COUNT, to: `${COUNT}\n    if (isAbstain(outputs.get(i))) { denominator -= 1; continue; }`,
      expect: /an ABSTAIN left the denominator/ },
    { id: "F7C-S4", what: "an ABSTAIN is scored as positive in the tables", file: LIFE, test: T, named: ABST,
      from: POSITIVE, to: "  const positive = (i, c) => isAbstain(outputs.get(i)) || outputs.get(i).classes.includes(c);",
      expect: /an ABSTAIN was scored differently from not-positive in the table/ },
    { id: "F7C-S5", what: "discordance ignores the partner's judgement — every re-pair is counted discordant", file: LIFE, test: T, named: RELEASE,
      from: "    const ta = a.classes.includes(paired.cls), tb = b.classes.includes(paired.cls);", to: "    const tb = b.classes.includes(paired.cls), ta = !tb;",
      expect: /the release differs from the hand-worked counts/ },
    { id: "F7C-S6", what: "\"correct both ways\" checks only the matched side", file: LIFE, test: T, named: RELEASE,
      from: "    if (positive(matched, paired.cls) === ta && positive(rePair, paired.cls) === tb) discordantBothCorrect += 1;", to: "    if (positive(matched, paired.cls) === ta) discordantBothCorrect += 1;",
      expect: /the release differs from the hand-worked counts/ },
    { id: "F7C-S7", what: "a fourth aggregate is released", file: LIFE, test: T, named: RELEASE,
      from: "    ...(paired ? { abstentions: String(abstentions),", to: "    ...(paired ? { rePairs: String(pairs.links.length), abstentions: String(abstentions),",
      expect: /the release carries a field beyond the declared aggregates/ },
    { id: "F7C-S8", what: "the paired aggregates are released for an unpaired protocol", file: LIFE, test: T, named: UNPAIRED,
      from: "    ...(paired ? { abstentions: String(abstentions),", to: "    ...(true ? { abstentions: String(abstentions),",
      expect: /an unpaired run released a paired aggregate/ },
    { id: "F7C-S9", what: "a malformed pair id is accepted", file: LIFE, test: T, named: PAIRS,
      from: '    if (!m) return { fault: "PAIR_STRUCTURE_MALFORMED" };', to: "    if (!m) continue;",
      expect: /an id without a pair: the parser did not name PAIR_STRUCTURE_MALFORMED/ },
    { id: "F7C-S10", what: "a duplicate pair is accepted", file: LIFE, test: T, named: PAIRS,
      from: '    if (seen.has(pair)) return { fault: "PAIR_DUPLICATE" };', to: "    // sabotaged: duplicates are not detected",
      expect: /the parser did not name PAIR_DUPLICATE/ },
    { id: "F7C-S11", what: "a re-pair whose matched partner is absent is accepted", file: LIFE, test: T, named: PAIRS,
      from: '    if (!matched.has(partner)) return { fault: "PAIR_DANGLING" };', to: "    // sabotaged: the partner's presence is not checked",
      expect: /a re-pair whose matched partner is absent: the parser did not name PAIR_DANGLING/ },
    { id: "F7C-S12", what: "a pair-structure fault is parsed but not refused — a bad structure yields a result", file: LIFE, test: T, named: PAIRS,
      from: "  if (pairs?.fault) refuse(pairs.fault);", to: "  // sabotaged: a structure fault is ignored",
      expect: /an id without a pair: expected PAIR_STRUCTURE_MALFORMED/ },
    { id: "F7C-S13", what: "the run is claimed BEFORE the preflight — a set/key fault spends the once-only run", file: LIFE, test: T, named: INCOMPLETE,
      from: '  const refuse = (code) => stop("REFUSED", code, { combination });',
      to: '  emit(audit, { action: LINKED_ACTIONS.CLAIMED, outcome: "RECORDED", reasonCode: "SCORING_RUN_CLAIMED", occurredAt: at, metadata: { ...meta, combination, grantEventId: String(grant.eventId) } });\n  const refuse = (code) => stop("REFUSED", code, { combination });',
      expect: /an incomplete key SPENT the run, or was not refused/ },
    { id: "F7C-S14", what: "an ABSTAIN is accepted under an unpaired protocol, where no count can show it", file: LIFE, test: T, named: UNPAIRED,
      from: "const validAnswer = (o, classes, paired) => (paired && isAbstain(o)) ||", to: "const validAnswer = (o, classes, paired) => (isAbstain(o)) ||",
      expect: /an ABSTAIN was accepted under an unpaired protocol/ },
    { id: "F7C-S15", what: "the key's completeness is not checked before the claim", file: LIFE, test: T, named: INCOMPLETE,
      from: '  if (items.some((i) => !parsed.rows.has(i))) refuse("INPUT_MISSING");', to: "  // sabotaged: an incomplete key is not refused",
      expect: /an incomplete key was scored/ },
    { id: "F7C-S16", what: "the seven-token ceiling for a paired protocol is not applied", file: LIFE, test: T, named: CEILING,
      from: '  if (paired && classes.length + exclusions.length > MAX_PAIRED_PROTOCOL_TOKENS) stop("REFUSED", "PROTOCOL_INVALID");', to: "  // sabotaged: the paired ceiling is not applied",
      expect: /eight tokens was accepted/ },
  ];
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const all = f07Amendment3Sabotages();
  const list = only.length ? all.filter((s) => only.includes(s.id)) : all;
  console.log("F07 AMENDMENT 3 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F07 AMENDMENT 3 SABOTAGE EVIDENCE — one defect per added failure limb of the frozen amendment", head }));
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
