/**
 * 🔴 F10 · THE ONE SELECTION AND THE OWNER'S PACKET — one sabotage per guard, each turning its named test RED for the intended
 * reason (an assertion message of that test), then restored byte-for-byte (command ec3bbaf §4–§6).
 *
 *   node test/helpers/f10-selection-sabotage.mjs [--only=SL-S1,…]
 *
 *   SL-S1  a version never frozen at this code does not refuse        SL-S6  the door opens twice (ALREADY_SEALED dropped)
 *   SL-S2  a freeze at the selection instant does not refuse          SL-S7  an incomplete key is written (the preflight dropped)
 *   SL-S3  an unreconciled population is selected from                SL-S8  an automated caller may label for the owner
 *   SL-S4  an allocation other than the frozen one is used            SL-S9  an answer is not saved when typed
 *   SL-S5  rows are taken in input order, not by identity hash (D5b)  SL-S10 a corrected answer does not replace the old one
 */
import { runSabotages } from "./f08-sabotage.mjs";

const T = "test/f10-selection-packet.test.mjs";
const SEL = "src/discovery/f10-selection.mjs";
const LAB = "src/discovery/f10-labelling.mjs";
const N = {
  pre: "F10 · SELECT · every precondition REFUSES", d5b: "F10 · SELECT · within a tenant its seats go to the LOWEST", seal: "F10 · SEAL · the packet is written into S ONCE",
  preflight: "F10 · LABEL · THE PREFLIGHT REFUSES AN INCOMPLETE KEY", tty: "F10 · LABEL · REAL entry point", durable: "F10 · LABEL · progress SURVIVES interruption",
};

export function f10SelectionSabotages() {
  return [
    { id: "SL-S1", what: "a version never frozen at this code does not refuse the selection", file: SEL, test: T, named: N.pre,
      from: '    if (!at) throw new SelectionRefused("VERSION_NOT_FROZEN_AT_THIS_CODE"', to: '    if (false) throw new SelectionRefused("VERSION_NOT_FROZEN_AT_THIS_CODE"',
      expect: /a selection ran with a version never frozen/ },
    { id: "SL-S2", what: "a freeze recorded at the selection instant does not refuse", file: SEL, test: T, named: N.pre,
      from: '    if (!(at < now)) throw new SelectionRefused("FREEZE_NOT_BEFORE_SELECTION"', to: '    if (!(at <= now)) throw new SelectionRefused("FREEZE_NOT_BEFORE_SELECTION"',
      expect: /a selection ran with a freeze recorded at the same instant/ },
    { id: "SL-S3", what: "an unreconciled population is selected from", file: SEL, test: T, named: N.pre,
      from: '  if (diffs.length) throw new SelectionRefused("POPULATION_NOT_RECONCILED"', to: '  if (false) throw new SelectionRefused("POPULATION_NOT_RECONCILED"',
      expect: /an unreconciled population was selected from/ },
    { id: "SL-S4", what: "an allocation other than the frozen one is used", file: SEL, test: T, named: N.pre,
      from: '  if (JSON.stringify(desc) !== JSON.stringify([...committed.allocationDescending])) throw', to: '  if (false) throw',
      expect: /an allocation other than the frozen one was used/ },
    { id: "SL-S5", what: "a tenant's rows are taken in input order, not by the lowest identity hash (D5b)", file: SEL, test: T, named: N.d5b,
      from: "    const ranked = [...account.eligibleItems.get(t)].sort(", to: "    const ranked = [...account.eligibleItems.get(t)].slice(0).sort(() => 0) || [].sort(",
      expect: /the selection depends on the input order/ },
    { id: "SL-S6", what: "the door opens twice — a sealed store is written over", file: SEL, test: T, named: N.seal,
      from: '  if (readdirSync(store).length !== 0) throw new SelectionRefused("ALREADY_SEALED"', to: '  if (false) throw new SelectionRefused("ALREADY_SEALED"',
      expect: /the door opened twice/ },
    { id: "SL-S7", what: "the preflight is dropped — an incomplete key is written", file: LAB, test: T, named: N.preflight,
      from: '  if (missing > 0) throw new LabellingRefused("KEY_INCOMPLETE"', to: '  if (false) throw new LabellingRefused("KEY_INCOMPLETE"',
      expect: /an incomplete key was not refused/ },
    { id: "SL-S8", what: "an automated caller may label for the owner", file: "bin/f10-label.mjs", test: T, named: N.tty,
      from: "if (!process.stdin.isTTY && !inVerifiedTestContext(process.env))", to: "if (false)",
      expect: /an automated caller was allowed to label/ },
    { id: "SL-S9", what: "an answer is not saved when it is typed", file: LAB, test: T, named: N.durable,
      from: '  appendFileSync(path, JSON.stringify({ id, answer, at }) + "\\n");', to: "  // sabotaged: the answer is not saved",
      expect: /progress did not survive a new sitting/ },
    { id: "SL-S10", what: "a corrected answer does not replace the old one — the FIRST answer wins", file: LAB, test: T, named: N.durable,
      from: "export const readProgress = (store, task) => new Map(lines(join(store, TASKS[task].progress)).map((r) => [r.id, r.answer]));",
      to: "export const readProgress = (store, task) => new Map(lines(join(store, TASKS[task].progress)).reverse().map((r) => [r.id, r.answer]));",
      expect: /a corrected answer did not replace the old one/ },
    { id: "SL-S11", what: "the boundary's door guards are dropped — a sealed store is sealed again through the governed route", test: T, named: "F10 · SEAL · THROUGH THE BOUNDARY",
      edits: [
        { file: SEL, from: '      if (readdirSync(store).length !== 0) return [{ code: "ALREADY_SEALED" }];', to: "      // sabotaged: a sealed store is not refused" },
        { file: SEL, from: '      if (records().length !== 0) return [{ code: "ALREADY_SEALED" }];', to: "      // sabotaged: an existing seal record is not refused" },
        { file: SEL, from: '  if (readdirSync(store).length !== 0) throw new SelectionRefused("ALREADY_SEALED"', to: '  if (false) throw new SelectionRefused("ALREADY_SEALED"' },
      ],
      expect: /a sealed store was sealed again/ },
    { id: "SL-S12", what: "a synthetic entry is admitted into the REAL store (fixture law 4 dropped) — cross-scope", file: "src/governance/synthetic-sealed-fixture.mjs", test: "test/f10-storage-s-registration.test.mjs", named: "F10 · S · CONTROL 3 · CROSS-SCOPE",
      from: "    if (typeof root === \"string\" && Object.hasOwn(declared ?? {}, root)) throw", to: "    if (false) throw",
      expect: /a synthetic entry was admitted into the real store/ },
    { id: "SL-S13", what: "the PRODUCTION scope applies a synthetic fixture — substitution", file: "src/governance/census-scope.mjs", test: "test/f10-storage-s-registration.test.mjs", named: "F10 · S · CONTROL 3 · CROSS-SCOPE",
      from: "    if (effective.synthetic) throw new CensusScopeRefused(", to: "    if (false) throw new CensusScopeRefused(",
      expect: /a synthetic fixture was applied in the PRODUCTION scope/ },
    { id: "SL-S14", what: "a synthetic store resolving to the real store's directory is censused — the real store in disguise", file: "src/governance/census-scope.mjs", test: "test/f10-storage-s-registration.test.mjs", named: "F10 · S · CONTROL 3 · CROSS-SCOPE",
      from: "    if (typeof dir === \"string\" && realDirs.has(", to: "    if (false && realDirs.has(",
      expect: /a synthetic store resolving to the real store's directory was censused/ },
    { id: "SL-S15", what: "the SYNTHETIC scope drops the real roles silently instead of naming them as not measured", file: "src/governance/census-scope.mjs", test: "test/f10-storage-s-registration.test.mjs", named: "F10 · S · CONTROL 4 · OMITTED ROLE",
      from: "    notMeasured: effective.registry.filter(inRealStore).map((e) => String(e.id)),", to: "    notMeasured: [],",
      expect: /a real set was omitted instead of named as not measured/ },
    { id: "SL-S16", what: "a SYNTHETIC report is accepted as PRODUCTION proof — the false scope claim passes", file: "src/governance/census-scope.mjs", test: "test/f10-storage-s-registration.test.mjs", named: "F10 · S · CONTROL 5 · FALSE SCOPE CLAIM",
      from: "  if (claim?.scope && claim.scope !== scope) faults.push(\"FALSE_SCOPE_CLAIM\");", to: "  // sabotaged: the claimed scope is not compared",
      expect: /a synthetic result was accepted as production proof/ },
    { id: "SL-S17", what: "the census verdict line stops carrying its scope", file: "bin/heldout-firewall.mjs", test: "test/f10-storage-s-registration.test.mjs", named: "F10 · S · SYNTHETIC SCOPE",
      from: ' · SCOPE ${SCOPED.scope}${SCOPED.scope === "SYNTHETIC" ?', to: '${SCOPED.scope === "SYNTHETIC" ?',
      expect: /did not match the regular expression \/FAILURES: \\d\+ · SCOPE SYNTHETIC/ },
  ];
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const all = f10SelectionSabotages();
  const list = only.length ? all.filter((s) => only.includes(s.id)) : all;
  console.log("F10 · SELECTION AND PACKET · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
