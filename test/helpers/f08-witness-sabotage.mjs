/**
 * 🔴 F08 · THE OUT-OF-TREE WITNESS — ONE SABOTAGE PER BRANCH OF THE REPAIR (F07/F08 reopened 27 Sep 2026 on
 * CONCRETE_CONTRADICTORY_EVIDENCE, _handoffs 5fd0435).
 *
 *   node test/helpers/f08-witness-sabotage.mjs --deliberate [--only=WS-S1,…]
 *
 * Each case removes or bends ONE branch and proves the bytes changed (LANDED). It then runs its NAMED test, which must
 * go RED for the INTENDED reason (a WITNESS-* assertion message, never a test name), and restores the file
 * byte-for-byte (f08-sabotage.mjs harness). The named tests do the real thing: write through the production store,
 * run a real git operation, then check that the loss is detected or refused.
 *
 *   WS-S1  the store never consults the witness before an append — an append lands on the shortened trail
 *   WS-S2  verify ignores a witness that is ahead — the loss reads as a clean trail
 *   WS-S3  a witness that is AHEAD is tolerated — an append lands on the shortened trail
 *   WS-S4  the witness never receives the appended line — nothing survives the checkout
 *   WS-S5  the witness lives in the WORKING TREE, where clean -fdx deletes it
 *   WS-S6  the production store is built with no witness at all
 *   WS-S7  a DIVERGED witness is tolerated — an append lands on an altered trail
 *   WS-S8  an unlocatable witness is tolerated — a production append proceeds with nothing to check against
 *   WS-S9  an absent witness is not seeded — it starts from the new line alone and never matches the trail
 *   GP-S1  a gap may claim its original records exist
 *   GP-S2  a gap may present the later census as the record of the lost reads
 *   GP-S3  the gap event says the lost events are recorded here
 *   GP-S4  a gap already on the trail is offered again
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { runSabotages } from "./f08-sabotage.mjs";

const T = "test/f08-witness.test.mjs";
const W = "src/audit-trail/witness.mjs";
const STORE = "src/audit-trail/store.mjs";
const WIRING = "src/audit-trail/wiring.mjs";
const CHECKOUT = "W2 · checkout -- <trail> after an uncommitted production append";
const CLEAN = "W2 · the witness lives in the git directory";
const SEED = "W3 · WITNESS_ABSENT is seeded";
const DIVERGE = "W4 · DIVERGED";
const SCOPE = "W5 · a confined store";
const GAP = "src/audit-trail/gap.mjs";
const GT = "test/f08-audit-gap.test.mjs";
const GAP_CONTROL = "GAP-1 · CONTROL";
const GAP_REFUSE = "GAP-2 · a gap that CLAIMS";
const GAP_ONCE = "GAP-3 · appended once";

export function witnessSabotages() {
  return [
    { id: "WS-S1", what: "the store never consults the witness before an append", file: STORE, test: T, named: CHECKOUT,
      from: "    if (witness) witness.beforeAppend(rawLines());", to: "    if (false) witness.beforeAppend(rawLines());",
      expect: /WITNESS-REFUSE: an append onto the shortened trail was not refused/ },
    { id: "WS-S2", what: "verify ignores a witness that is ahead", file: STORE, test: T, named: CHECKOUT,
      from: "if (witnessStatus?.relation === \"WITNESS_AHEAD\") findings.push(", to: "if (false) findings.push(",
      expect: /WITNESS-DETECT: verify did not report the event the git operation removed/ },
    { id: "WS-S3", what: "a witness that is AHEAD is tolerated", file: W, test: T, named: CHECKOUT,
      from: "if (s.relation === \"WITNESS_AHEAD\" || s.relation === \"DIVERGED\") throw", to: "if (s.relation === \"DIVERGED\") throw",
      expect: /WITNESS-REFUSE: an append onto the shortened trail was not refused/ },
    { id: "WS-S4", what: "the witness never receives the appended line", file: STORE, test: T, named: CHECKOUT,
      from: "    if (witness) witness.afterAppend(line);", to: "",
      expect: /WITNESS-RECORD: the witness must hold both appends before the git operation/ },
    { id: "WS-S5", what: "the witness lives in the working tree", file: W, test: T, named: CLEAN,
      from: "  return join(gitDir, WITNESS_FILE);", to: "  return join(repo, WITNESS_FILE);",
      expect: /WITNESS-LOCATION: the witness is not inside the git directory/ },
    { id: "WS-S6", what: "the production store is built with no witness", file: WIRING, test: T, named: CHECKOUT,
      from: "    witness: at ? null : createWitness({ locate: gitDirWitnessLocator(repo) }),", to: "    witness: null,",
      expect: /WITNESS-RECORD: the witness must hold both appends before the git operation/ },
    { id: "WS-S7", what: "a DIVERGED witness is tolerated", file: W, test: T, named: DIVERGE,
      from: "if (s.relation === \"WITNESS_AHEAD\" || s.relation === \"DIVERGED\") throw", to: "if (s.relation === \"WITNESS_AHEAD\") throw",
      expect: /WITNESS-DIVERGE: an append onto a diverged trail was not refused/ },
    { id: "WS-S8", what: "an unlocatable witness is tolerated", file: W, test: T, named: SCOPE,
      from: "      throw new AuditWitnessRefused({ relation: \"WITNESS_UNLOCATABLE\"", to: "      return ({ relation: \"WITNESS_UNLOCATABLE\"",
      expect: /WITNESS-FAILCLOSED: a production append with no locatable witness was not refused/ },
    { id: "WS-S9", what: "an absent witness is not seeded", file: W, test: T, named: SEED,
      from: "if (s.relation === \"WITNESS_ABSENT\" || s.relation === \"TRAIL_EXTENDS_WITNESS\") {", to: "if (s.relation === \"TRAIL_EXTENDS_WITNESS\") {",
      expect: /WITNESS-SEED: an absent witness was not seeded/ },
    /* The gap record (§5.1): it must never claim what was lost is recorded, and never be recorded twice. */
    { id: "GP-S1", what: "a gap may claim its original records exist", file: GAP, test: GT, named: GAP_REFUSE,
      from: "  if (gap?.originalRecordsExist !== \"NO\") out.push(", to: "  if (false) out.push(",
      expect: /GAP-REFUSE: GAP_CLAIMS_RECORDS_EXIST did not fire/ },
    { id: "GP-S2", what: "a gap may present the later census as the record of the lost reads", file: GAP, test: GT, named: GAP_REFUSE,
      from: "  if (!/^NO\\b/.test(String(gap?.replacementIsSameReads ?? \"\"))) out.push(", to: "  if (false) out.push(",
      expect: /GAP-REFUSE: GAP_CLAIMS_REPLACEMENT_RECORDS_THE_LOST did not fire/ },
    { id: "GP-S3", what: "the gap event says the lost events are recorded here", file: GAP, test: GT, named: GAP_CONTROL,
      from: "lostEventsRecordedHere: false };", to: "lostEventsRecordedHere: true };",
      expect: /GAP-CLAIM: the gap event claims the lost events are recorded here/ },
    { id: "GP-S4", what: "a gap already on the trail is offered again", file: GAP, test: GT, named: GAP_ONCE,
      from: "gaps.filter((g) => !events.some(", to: "gaps.filter((g) => !events.some(() => false) || !events.some(",
      expect: /GAP-ONCE: a recorded gap is offered again/ },
  ];
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const all = witnessSabotages();
  const list = only.length ? all.filter((s) => only.includes(s.id)) : all;
  console.log("F08 WITNESS · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
