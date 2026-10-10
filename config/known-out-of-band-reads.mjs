/**
 * 🔴 F07 AMENDMENT 4 · THE REGISTER OF KNOWN OUT-OF-BAND READS OF A GOVERNED SEALED STORE (RR-246, 10 October 2026).
 *
 * A known read is a read of a governed sealed store made outside the governed readers, with no ACCESS event, that became known by
 * record or by disclosure. Each declared correction is recorded on the trail as ONE AUDIT_CORRECTION event
 * (`node bin/audit-trail.mjs gap --confirm`, src/audit-trail/known-reads.mjs). The event REPRESENTS the reads; it repairs nothing
 * and claims no ACCESS record.
 *
 * Every value is a count, an instant, a tool class, a side name, an id, a hash or a committed-record pointer — never a sealed value,
 * a store location or a file inside a store. The reads are those classified at _handoffs be583fa §C3 (session transcripts searched
 * by tool INPUT only; tool results never read again).
 */
export const KNOWN_OUT_OF_BAND_READS = Object.freeze([
  Object.freeze({
    correctionId: "OOB-2026-09-27-A",
    knownReads: 8,
    /* "<n> <UTC instant> <tool class> <sides read> · <what became visible, as counts>" */
    reads: Object.freeze([
      "1 2026-09-27T02:19:23Z INLINE_DIRECTORY_WALK SET,PAIRS,QUEUES,PROGRESS,OWNER_NOTE · 100 set members, 370 pair ids, queues with wording",
      "2 2026-09-27T02:20:23Z SCRATCH_SCRIPT SET,PAIRS · 100 set members, 370 pair ids",
      "3 2026-09-27T03:53:19Z OWNER_TOOL_RUN_BY_ASSISTANT QUEUES,PROGRESS · both queues with wording, progress empty",
      "4 2026-09-27T04:08:36Z SCRATCH_SEAL_CHECK SET,PAIRS · 100 set members, 370 pair ids",
      "5 2026-09-27T04:56:02Z SCRATCH_SEAL_CHECK SET,PAIRS · 100 set members, 370 pair ids",
      "6 2026-09-27T06:04:14Z SCRATCH_SEAL_CHECK SET,PAIRS · 100 set members, 370 pair ids",
      "7 2026-09-27T21:35:01Z SCRATCH_SEAL_CHECK SET,PAIRS,QUEUES,PROGRESS · queues with wording, progress empty",
      "8 2026-09-27T21:44:19Z SCRATCH_SEAL_CHECK SET,PAIRS,QUEUES,PROGRESS · queues with wording, progress empty",
    ]),
    setsRead: Object.freeze(["sealed:f10-c3-selection", "sealed:f10-c7-pairs"]),
    accessRecorded: "NO — none of the eight has an ACCESS event; none is reconstructed",
    treatment: "REPRESENTED_NOT_REPAIRED",
    setsTreatedAs: "DISCLOSED — both sets retired (RETIRED_CONTAMINATED), never to evaluate again (technical ruling RR-246, 2026-10-10)",
    evidenceRecord: "_handoffs be583fa523427593debe259da1134cd6ca6a62cb AlmiVisibility_F10_C3_INCIDENT_CLASSIFICATION_2026-09-28.md",
    evidenceSha256: "63c6c54b9c564984f1f7d2c3ecf53cfd57acfbe7098d1d787ce0475d023a4f21",
    ruling: "OWNER RULING RR-80 §5 _handoffs bba3446 (a limit never licenses the thing it cannot see)",
    amendment: "F07 ACCEPTANCE AMENDMENT 4 _handoffs 5afaae5",
    guard: "tools/sealed-store-read-guard.mjs, installed as a user-level PreToolUse hook (owner GREEN E1, 2026-10-10)",
    searchLimit: "only these assistant session transcripts on this machine were searched; a read by any other program or person leaves no trace here",
  }),
]);
