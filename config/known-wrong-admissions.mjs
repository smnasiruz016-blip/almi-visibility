/**
 * 🔴 F08 · THE REGISTER OF AUTHORITY ADMISSIONS RECORDED WITH A WRONG DISPOSITION (RR-272, 16 October 2026).
 *
 * Each declared correction is recorded on the trail as ONE AUDIT_CORRECTION event (`node bin/audit-trail.mjs gap --confirm`,
 * src/audit-trail/wrong-admissions.mjs). The event REPRESENTS the wrong admissions; the trail is never rewritten.
 *
 * Every value is an id, a disposition, a count, an instant, a hash or a committed-record pointer.
 */
export const KNOWN_WRONG_ADMISSIONS = Object.freeze([
  Object.freeze({
    correctionId: "ADM-2026-10-16-A",
    wrongAdmissions: 6,
    /* "<n> <event id> <stored disposition> -> <disposition in force> <authority id>" — each read from the trail and from the corpus in force
     * (config/authority/corpus.mjs, now 2026-10-16, governance df82cbe8db3b) on 16 Oct 2026 */
    admissions: Object.freeze([
      "1 4921351679a03df1ca6febc0dcab3e98 NOT_APPLICABLE -> CURRENT _handoffs:AlmiVisibility_OWNER_DECISION_2026-10-15_RR-269_CLIENT_BROWSER_READS_PDF_READER_ABSENCE_RECORDS.md",
      "2 6c64ccbf80ac6ff430feaa0796163192 NOT_APPLICABLE -> CURRENT _handoffs:AlmiVisibility_OWNER_DECISION_2026-10-16_RR-270_PILOT_PAGE_FIXES.md",
      "3 52fa71052fa8ae9521b263c77bc7f8b5 NOT_APPLICABLE -> CURRENT _handoffs:AlmiVisibility_OWNER_DECISION_2026-10-16_RR-271_PUBLISH_THE_PILOT_PAGES.md",
      "4 7a96ea0db3f46eee2c6351fcc76f3c7d NOT_APPLICABLE -> CURRENT _handoffs:AlmiVisibility_OWNER_DECISION_2026-10-16_OVERNIGHT_F27_F22_READ_ONLY_LIVE_GUIDES.md",
      "5 e852cd972c93818f1325b36b327a284d NOT_APPLICABLE -> CURRENT _handoffs:AlmiVisibility_BETA_G_DECISION_2026-10-16_F27_LIVE_HEADER_BASELINE.md",
      "6 316427fbbbd92bed6cbffc34a4e841a0 NOT_APPLICABLE -> CURRENT _handoffs:AlmiVisibility_F27_ACCEPTANCE_AMENDMENT_3_2026-10-16.md",
    ]),
    cause: "authority-migrate ran at 2026-10-16T07:34:42Z without --now; its hidden default day 2026-09-22 judged later records not yet effective, and the next record run admitted these six so",
    repair: "authority-migrate requires --now (no default day); a family-A admission already on the trail is never offered again (src/audit-trail/population.mjs)",
    treatment: "REPRESENTED_NOT_REWRITTEN",
    decision: "OWNER DECISION RR-272 §2 (_handoffs a7b58ef): EVENT_ID_CONFLICT on every record run — find the cause; if a defect, fix it",
    evidenceRecord: "_handoffs a7b58efcd3672efee76a79a2b6dca67d964da309 AlmiVisibility_OWNER_DECISION_2026-10-16_RR-272_F22_LIVE_GREEN_AND_CLEANUPS.md",
    evidenceSha256: "de9f8b5cdb7cf76663602a1141a93e4eaed2b97976c633d6001e78f145aad49c",
  }),
]);
