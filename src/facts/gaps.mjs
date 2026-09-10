/**
 * DECLARED GAPS — claims we KNOW a page needs and have NOT acquired.
 *
 * ── WHY AN EMPTY SLOT IS A RECORD ───────────────────────────────────────────
 *
 * A registry that lists only what it has, tells you only what it has. The
 * question a reader of the census actually needs answered is "what is missing",
 * and a store of facts is structurally incapable of answering it — absence
 * leaves no row.
 *
 * 🔴 AND THE ALTERNATIVE TO DECLARING THEM IS INVENTING THEM. Every gap below
 * is a claim `PROFESSION_PAGE_CLAIM_INVENTORY.md` says `/nursing` must make. A
 * model asked to fill this registry could produce a plausible sentence for
 * every one of them from general knowledge, and each would look exactly like a
 * real record. THAT is the failure a fact registry exists to prevent, so the
 * gaps are counted out loud where the pressure to quietly close them is highest.
 *
 * ⚠️ These are NOT records. They have no value, no source and no date, they are
 * not loaded by `loadRegistry`, and nothing may render them.
 */
export const DECLARED_GAPS = Object.freeze([
  {
    claim: "oet · writing-task-type · profession=nursing",
    neededBy: "the /nursing profession page, Block A1",
    blockedBy: "🔴 LICENCE — oet.com is quotable:false. Acquirable, but only in our own words and only by a person",
    cost: "manual acquisition, then a human re-read every 180 days",
  },
  {
    claim: "oet · speaking-roleplay-setting · profession=nursing",
    neededBy: "the /nursing profession page, Block A2",
    blockedBy: "🔴 LICENCE — as above",
    cost: "manual acquisition, then a human re-read every 180 days",
  },
  {
    claim: "oet · subtests-and-which-are-profession-specific",
    neededBy: "every profession page, Block A3 (shared)",
    blockedBy: "🔴 LICENCE — as above",
    cost: "one manual acquisition, shared by all twelve profession pages",
  },
  {
    claim: "oet · grade-bands-0-500",
    neededBy: "every profession page, Block A4 (shared)",
    blockedBy: "🔴 LICENCE — as above. ⚠️ NMBI states the bands behind B and C+ independently, so a tier-1 alternative may exist",
    cost: "one manual acquisition",
  },
  {
    claim: "au-ahpra-nmba · * (about 5 claims)",
    neededBy: "the /nursing destination-regulator block",
    blockedBy: "🔴 HTTP 403 — ahpra.gov.au and nursingmidwiferyboard.gov.au both refuse a machine. A refusal is recorded, never routed around",
    cost: "manual acquisition and manual re-verification, forever",
  },
  {
    claim: "nz-ncnz · * (about 5 claims)",
    neededBy: "the /nursing destination-regulator block",
    blockedBy: "🔴 HTTP 403 — nursingcouncil.org.nz refuses a machine",
    cost: "manual acquisition and manual re-verification, forever",
  },
  {
    claim: "ca-* · * (about 5 claims PER PROVINCE)",
    neededBy: "the /nursing destination-regulator block",
    blockedBy:
      "🔴 STRUCTURAL — NNAS is a credentialing service and states no language requirement. Canada's rules are provincial (CNO, BCCNM, …). Canada is a FRAGMENTED DESTINATION, as India is a fragmented origin. 'Five facts for Canada' was wrong",
    cost: "~10 provincial sources, or Canada is left out of the target shape",
  },
  {
    claim: "in-* · verification-issuing-body",
    neededBy: "/nursing/from-india — the largest single corridor in the network",
    blockedBy:
      "🔴 STRUCTURAL — no single national answer exists. Verification for nurses going abroad is issued by ~30 State Nursing Councils, not by the Indian Nursing Council. For India this is a BRANCH, not a fact",
    cost: "~30 sources, or the page states the branch rather than an answer",
  },
  {
    claim: "ph-prc · verification-fee and document list",
    neededBy: "/nursing/from-philippines",
    blockedBy: "🔴 HTTP 403 — prc.gov.ph refuses a machine. The body exists centrally, unlike India's",
    cost: "manual acquisition",
  },

  // ── 🔴 A SECOND KIND OF GAP: A LICENCE NOBODY HAS READ ────────────────────
  //
  // Added 2026-09-10 after the owner's first-hand licence census. These are not
  // missing FACTS — they are missing PERMISSIONS, and they are listed here for
  // the same reason: the alternative to declaring them is assuming them.
  //
  //   AN UNREAD LICENCE IS NOT A PERMISSIVE LICENCE.
  //
  // Four of these sources return 403 to a machine. A licence cannot be read from
  // a page that will not open, so they will be recorded as
  // `unknown-licence-unreachable` — NEVER as permitted.
  {
    claim: "LICENCE · immigration.govt.nz",
    neededBy: "nz-immigration-nz.oet-must-be-taken-in-person, the registry's only human-acquired fact",
    blockedBy: "⚠️ NOT READ. NZ government material is commonly Creative Commons, but A CONVENTION IS NOT A LICENCE and this page's terms were never opened",
    cost: "five minutes of reading; until then the record is fingerprint-watched and un-quotable",
  },
  {
    claim: "LICENCE · ahpra.gov.au · nursingmidwiferyboard.gov.au · nursingcouncil.org.nz · prc.gov.ph",
    neededBy: "any future record from these four regulators",
    blockedBy: "🔴 HTTP 403 — the licence page itself cannot be opened by a machine. Recorded as `unknown-licence-unreachable`, never as permitted",
    cost: "a person with a browser, or nothing is ever quotable from them",
  },
  {
    claim: "LICENCE · nnas.ca",
    neededBy: "any Canadian record, if Canada is kept in the target shape at all",
    blockedBy: "⚠️ not read. NNAS is fetchable but is not a language regulator, so there may be nothing here worth licensing",
    cost: "five minutes, and only worth spending if Canada stays in scope",
  },
]);
