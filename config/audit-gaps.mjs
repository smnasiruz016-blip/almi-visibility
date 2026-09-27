/**
 * 🔴 F08 · THE REGISTER OF KNOWN AUDIT-TRAIL GAPS (27 September 2026).
 *
 * A gap is a set of governed events that WERE appended to the production trail and then removed from it, so that their
 * original records no longer exist. Each gap is recorded on the trail as ONE AUDIT_CORRECTION event
 * (`node bin/audit-trail.mjs gap --confirm`). That event POINTS TO the gap and to its evidence. It never recreates,
 * restates or claims any lost event: a reconstructed event would be a forgery.
 *
 * Every value is a count, a time window, a hash, an id or a committed-record pointer. There is no payload and no
 * sealed identity. What cannot be recovered is said to be UNRECOVERABLE in so many words.
 */
export const AUDIT_GAPS = Object.freeze([
  Object.freeze({
    gapId: "GAP-2026-09-27-A",
    /* The four discards, each a git checkout of the trail files in the main working tree (_handoffs 5fd0435, §3). */
    lostEvents: 65,
    lostDiscards: "L1 2026-09-22T21:25:47Z 25 · L2 2026-09-23T01:13:13Z 1 · L3 2026-09-26T21:54:48Z 37 · L4 2026-09-27T04:13:57Z 2",
    /* L4: two real production sealed reads, each ACCESS event appended (trail 1131 -> 1133), then removed by the same command. */
    lostAccessEvents: 2,
    lostAccessWindow: "2026-09-27T04:13:57Z..2026-09-27T04:14:02Z (command invoked..result; a bound, not an occurredAt)",
    lostAccessTrailCounts: "1131 -> 1133 -> 1131",
    lostEventBytes: "UNRECOVERABLE — never staged or committed; no git object holds them",
    lostEventIds: "UNRECOVERABLE — each id derives from an occurredAt that was never retained",
    originalRecordsExist: "NO",
    /* The later census: a DIFFERENT pair of reads, recorded and committed. It does not record the lost pair. */
    replacementCensusEventIds: "70af1508b85995fe0dd01e61e0cda429,6075a9c3e788a6c2185f2a6da5401407",
    replacementIsSameReads: "NO — a later, separate pair of reads (engine 9a7565c)",
    cause: "the production trail lived only in a git working tree; git checkout of events.jsonl and head.json removed uncommitted appends",
    repair: "out-of-tree witness in the git directory (src/audit-trail/witness.mjs): a shortened trail is detected by verify and refuses appends",
    evidenceRecord: "_handoffs 5fd0435127540d9879c7b573e7a33bf859d0a59c AlmiVisibility_PR171_AUDIT_INCIDENT_TIMELINE_AND_BLAST_RADIUS_2026-09-27.md",
    evidenceSha256: "a67dedd4faa0ff5c707371cab647078463e98ff60506556427ab5643999697ca",
    command: "_handoffs 788919908338c3ddb39217a7d60c62733eb29381",
  }),
]);
