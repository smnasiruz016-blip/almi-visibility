/**
 * ALMIOET'S DECLARED GAPS — moved here from `src/facts/gaps.mjs`, unedited.
 *
 * Every entry below is a claim about AlmiOET's profession pages: an Australian
 * regulator that refuses a machine, an Irish page that renders client-side, a
 * New Zealand profession with no regulator at all. None of it is a fact about
 * how a gap register works, so none of it belongs in the engine.
 *
 * The doctrine — why an empty slot is a record, and why the alternative to
 * declaring a gap is inventing one — stays in `src/facts/gaps.mjs`.
 */
export const ALMI_OET_GAPS = Object.freeze([
  // ✅ CLOSED 2026-09-10 — the four OET Block A claims that stood here were
  // ACQUIRED for the /nursing page: writing-task-type, speaking-roleplay-setting,
  // subtests-and-which-are-profession-specific and grade-bands-0-500. They are
  // records now (products/almi-oet/facts/oet.mjs), stated in our own words
  // because the licence PROHIBITS holding OET wording, and watched by
  // fingerprint.
  //
  // 🔴 A GAP IS DELETED FROM THIS LIST ONLY WHEN A RECORD EXISTS. Deleting one
  // because it now feels handled is how a registry comes to believe it is full.

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

  // ── 🔴 SPEECH PATHOLOGY — the hardest profession, measured 2026-09-10 ──
  //
  // Its /speech-pathology page FAILED the rollout: 34 uniqueWords against a bar
  // of 350, overlap 0.70 against 0.40. Not a near miss. The cause is that only
  // ONE of its four regulators says anything PER-PROFESSION.
  {
    claim: "ie-coru · english-language-requirement · profession=speech-pathology",
    neededBy: "/speech-pathology — Ireland",
    blockedBy:
      "⚠️ REACHABLE BUT EMPTY. coru.ie returns 200 at ~3,400 characters and its registration pages carry no requirement text — a shell, most likely rendered client-side. Not a refusal, and not a fact either",
    cost: "a person with a browser, or nothing from Ireland",
  },
  {
    claim: "au-speech-pathology-australia · oet-minimum-grade",
    neededBy: "/speech-pathology — Australia",
    blockedBy: "🔴 HTTP 404 on both candidate paths. organisations.json records grades for it (L B, R A, W A, S A) but with no per-fact source URL, so they are an import, not a citation",
    cost: "manual acquisition",
  },
  {
    claim: "nz-* · speech-language-therapy registration",
    neededBy: "/speech-pathology — New Zealand",
    blockedBy:
      "🔴 STRUCTURAL — THERE IS NO REGULATOR. Speech-language therapy is not statutorily regulated in New Zealand, so no organisation appears in the recognition index. This gap cannot be closed by acquisition",
    cost: "nothing will close it; the page is simply shorter",
  },
  {
    claim: "oet · writing-task-type / speaking-roleplay-setting · profession=speech-pathology",
    neededBy: "/speech-pathology — Block A",
    blockedBy: "🔴 LICENCE (oet.com is PROHIBITED) plus not yet acquired. The nursing equivalents exist; these do not",
    cost: "manual acquisition in our own words — and it is the cheapest way to add PER-PROFESSION words to this page",
  },
]);
