/**
 * 🔴 D-RECORDER-1 — ONE SABOTAGE PER BRANCH OF THE REPAIR (F08 reopened on CONCRETE_CONTRADICTORY_EVIDENCE, _handoffs 99f0732).
 *
 *   node test/helpers/d-recorder-1-sabotage.mjs --deliberate [--only=DR1-S1,…]
 *
 * Each sabotage removes or bends ONE branch, proves the bytes changed (LANDED), runs its NAMED test and requires it RED for the
 * INTENDED reason (an assertion message, never a test name), then restores the file byte-for-byte (f08-sabotage.mjs harness).
 *
 *   DR1-S1  the row's CURRENT (latest) acceptance governs every movement — B1/B2 re-attribution restored
 *   DR1-S2  stateAfter is the row's CURRENT state — B3(a) restored
 *   DR1-S3  no write-time key — two same-day, same-acceptance movements collapse into one (B3(b))
 *   DR1-S4  a legacy event may be matched more than once — a later identical movement hides behind it
 *   DR1-S5  legacy events are not recognised — every earlier real movement is re-emitted (B2)
 *   DR1-S6  the recorder drops the already-audited accounting — the arithmetic no longer reconciles
 *   DR1-S7  the consistency guard keys a movement on (row, from, to, instant) again — lawful same-day re-verifications collide
 *   DR1-S8  the guard ignores the identitySubject — the same keyed movement written twice passes
 *   DR1-S9  the guard forgives a keyed copy of a LEGACY movement under the same authority
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { runSabotages } from "./f08-sabotage.mjs";

const T = "test/d-recorder-1.test.mjs";
const POP = "src/audit-trail/population.mjs";
const REC = "src/audit-trail/recorder.mjs";
const SAME_DAY = "D-RECORDER-1 · two same-day amendments on one row";
const TWICE = "D-RECORDER-1 · two same-kind movements on one day under ONE acceptance";
const LEGACY = "D-RECORDER-1 · LEGACY events";
const REAL = "D-RECORDER-1 · REAL · the production derivation";
const GUARD = "D-RECORDER-1 · CONSISTENCY · two same-day re-verifications";
const CONS = "tools/board-audit-consistency.mjs";

export function dRecorder1Sabotages() {
  return [
    { id: "DR1-S1", what: "the row's latest acceptance governs every movement (re-attribution)", file: POP, test: T, named: SAME_DAY,
      /* RR-127: span moved to the live line (an event may now name its own authority); the sabotage is unchanged in intent */
      from: "      const authorityRef = governing ? refOf(governing) : own ?? blockerAuthority?.[row.featureId] ?? null;",
      to: "      const authorityRef = governing ? refOf(versionOf([...(row.events ?? [])].reverse().find((x) => x.ruling)?.ruling) ?? governing) : own ?? blockerAuthority?.[row.featureId] ?? null;",
      expect: /a movement was attributed to a later acceptance, or carries a state that was not true after it/ },
    { id: "DR1-S2", what: "stateAfter is the row's current state", file: POP, test: T, named: SAME_DAY,
      from: "stateAfter: state, identitySubject,", to: "stateAfter: row.state, identitySubject,",
      expect: /a movement was attributed to a later acceptance, or carries a state that was not true after it/ },
    { id: "DR1-S3", what: "no write-time key: two same-day same-acceptance movements share one identity", file: POP, test: T, named: TWICE,
      from: "stateAfter: state, identitySubject,", to: "stateAfter: state,",
      expect: /a second same-day movement under one acceptance was lost or refused/ },
    { id: "DR1-S4", what: "a legacy event may be matched more than once", file: POP, test: T, named: LEGACY,
      from: "!e.metadata.identitySubject && !consumed.has(e.eventId) &&", to: "!e.metadata.identitySubject &&",
      expect: /a legacy event was matched twice, or a later identical movement hid behind it/ },
    { id: "DR1-S5", what: "legacy events are not recognised at all", file: POP, test: T, named: REAL,
      from: "        ?? onTrail.find((e) => !e.metadata.identitySubject", to: "        ?? [].find((e) => !e.metadata.identitySubject",
      expect: /an earlier real movement was re-emitted/ },
    { id: "DR1-S6", what: "the recorder drops the already-audited accounting", file: REC, test: T, named: REAL,
      from: "alreadyAudited: prepared.filter((c) => c.alreadyAudited).map(", to: "alreadyAudited: [].filter((c) => c.alreadyAudited).map(",
      expect: /a real movement was refused or unresolvable/ },
    { id: "DR1-S7", what: "the consistency guard keys a movement on (row, from, to, instant) — the pre-repair key", file: CONS, test: T, named: GUARD,
      from: "|${e.occurredAt}|${e.authorityRef?.propositionId ?? \"NONE\"}`;", to: "|${e.occurredAt}`;",
      expect: /two lawful same-day re-verifications under different acceptances were called one duplicated movement/ },
    { id: "DR1-S8", what: "the guard ignores the identitySubject — the same keyed movement twice passes", file: CONS, test: T, named: GUARD,
      from: "earlier.some((s) => s === null || subject === null || s === subject)", to: "earlier.some((s) => s === null || subject === null)",
      expect: /the same keyed movement written twice was not reported/ },
    { id: "DR1-S9", what: "the guard forgives a keyed copy of a legacy movement under the same authority", file: CONS, test: T, named: GUARD,
      from: "earlier.some((s) => s === null || subject === null || s === subject)", to: "earlier.some((s) => s === subject)",
      expect: /a keyed copy of a legacy movement under the same authority was not reported/ },
  ];
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const all = dRecorder1Sabotages();
  const list = only.length ? all.filter((s) => only.includes(s.id)) : all;
  console.log("D-RECORDER-1 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
