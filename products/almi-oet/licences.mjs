/**
 * ALMIOET’S LICENCE ENTRIES — moved here from `src/facts/licences.mjs`,
 * unedited.
 *
 * These are the terms of two NAMED DOCUMENTS this product cites: the NMC’s
 * terms and conditions, and OET’s intellectual property policy. Neither is a
 * general instrument the way OGL v3.0 or CC BY 3.0 NZ are — they bind exactly
 * the sources AlmiOET reads, and a second product would have its own.
 *
 * 🔴 THE STATES, THE DERIVATION AND THE COUNTING STAY IN THE ENGINE.
 * `quotableUnder`, `quotabilityState`, PERMITTED/RESERVED/PROHIBITED/UNREAD and
 * the rule that an unread licence is never a permission are all general law
 * about handling other people’s words. What moved is only the reading of two
 * particular documents.
 *
 * ⚠️ AND THE ENGINE STILL ENFORCES THEM. `requiresCurrentVersion: true` below
 * is what makes `quoteUsableNow` withdraw an NMC quote when currency lapses,
 * and `state: "PROHIBITED"` is what stops OET wording being stored at all.
 * Moving these entries changed no behaviour — the tests that prove both are
 * unchanged.
 */
export const ALMI_OET_LICENCES = Object.freeze({

  /**
   * NMC clause 6.3 — read at nmc.org.uk/terms-and-conditions/.
   *
   * "you may reproduce the content of any of our rules, standards and guidance
   * in part or in full", on FOUR conditions:
   *   1. use the MOST UP-TO-DATE VERSION of the source document
   *   2. do not alter the text so as to change the meaning
   *   3. credit NMC as author
   *   4. provide a link to the website wherever possible
   *
   * 6.2 is the surrounding default and it is why the carve-out matters: it
   * permits local storage "(but not on any server or other storage device
   * connected to the network)". 6.4 forbids reproduction generally "except
   * where we have given you express permission" — and 6.3 IS that permission,
   * scoped to three document classes.
   */
  "NMC-6.3": {
    state: "PERMITTED",
    label: "NMC terms and conditions, clause 6.3",
    quotableClasses: ["rules", "standards", "guidance"],
    permitsCommercial: true,
    permitsNetworkedStorage: true,
    // 🔴 CONDITION 1 IS THE ONE THAT CHANGES THE ENGINEERING. See §9.3 of the
    // design and `quoteUsableNow` in freshness.mjs.
    requiresCurrentVersion: true,
    requiresPerPageThirdPartyCheck: false,
    requiredAttribution: "Nursing and Midwifery Council",
    attributionMustLinkTo: "https://www.nmc.org.uk/",
    clause:
      'NMC 6.3 — "you may reproduce the content of any of our rules, standards and guidance in part or in full", conditional on the most up-to-date version, unaltered meaning, credit and a link. 6.2 excludes storage on a networked server for everything else.',
  },

  /**
   * OET / Cambridge Boxhill Language Assessment — read at
   * oet.com/Intellectual-Property-policy.
   *
   * 🔴 STRONGER THAN THIS PROJECT HAD IT RECORDED. PR #9 cited only the
   * retrieval-system ground. Two others bite harder: reproducing or transmitting
   * any portion of the content, and distributing or exploiting it commercially,
   * are both forbidden too.
   *
   * And every permitted use is limited to personal use that is not commercial.
   * **AlmiWorld is commercial, so the carve-outs do not reach us at all** — we are
   * outside the permission before the retrieval-system ground is even reached.
   *
   * 🔴 The policy's own wording was quoted in this entry until 13 September 2026
   * and was removed: a record that the licence forbids storing its text must not
   * store that text.
   */
  "OET-CBLA-IP": {
    // 🔴 PROHIBITED, not RESERVED. The answer is written in their policy, and
    // asking would waste a day.
    state: "PROHIBITED",
    label: "OET / Cambridge Boxhill Language Assessment — Intellectual Property policy",
    quotableClasses: [],
    permitsCommercial: false,
    permitsNetworkedStorage: false,
    requiresCurrentVersion: false,
    requiresPerPageThirdPartyCheck: false,
    requiredAttribution: null,
    attributionMustLinkTo: null,
    clause:
      "OET IP policy — without prior written permission it forbids reproducing or transmitting any portion of its content, distributing it or exploiting it commercially, and keeping it in another website or any electronic retrieval system. Permitted uses are limited to personal use that is not commercial. (Recorded in our words; the policy's wording is deliberately not reproduced.)",
  },
});
