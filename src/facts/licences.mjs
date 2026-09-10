/**
 * THE LICENCES, AS DATA — read first-hand in a browser by the owner, 11 September 2026.
 * Full clause-by-clause record: `C:\Projects\_handoffs\SOURCE_QUOTABILITY.md`.
 *
 * ══ WHY THIS FILE EXISTS AT ALL ════════════════════════════════════════════
 *
 * 🔴 `sourceQuotable` WAS A PER-DOMAIN BOOLEAN AND THAT SHAPE IS WRONG.
 *
 * The NMC proves it: **one domain, two different answers**, decided by WHICH
 * DOCUMENT you are standing on.
 *
 *   clause 6.3  rules, standards and guidance   -> quotable "in part or in full"
 *   clause 6.2  everything else                 -> may not be stored "on any
 *               server or other storage device connected to the network"
 *
 * **Our registry is a git repository deployed to Vercel. That is a networked
 * server.** So the identical fact is quotable from NMC *guidance* and NOT
 * quotable from an NMC *news item*. A per-domain boolean cannot express that,
 * and the version of this registry that shipped in PR #9 could not either.
 *
 * ══ AND WHY QUOTABILITY IS NOW DERIVED, NOT TYPED ══════════════════════════
 *
 * `sourceQuotable` is computed by `quotableUnder(licence, documentClass)` and
 * the validator REJECTS any record that disagrees with the computation. Same
 * defence as the queue: a licence judgement written by hand is a judgement
 * nobody can re-check, and six months later it is indistinguishable from a
 * licence somebody actually read. Written as data, it can be re-argued against
 * the clause.
 *
 * ⚠️ I AM NOT A LAWYER AND NEITHER IS THIS FILE. It encodes what the licensor's
 * own page says, so that a qualified reader can check the encoding against the
 * clause. It does not decide anything a licence does not already decide.
 */

/**
 * The document classes a source page can belong to. The NMC split is
 * meaningless without this field, which is why it is mandatory on every record
 * even for sources where every class gets the same answer.
 */
export const DOCUMENT_CLASSES = Object.freeze(["rules", "standards", "guidance", "news", "general"]);

export const LICENCES = Object.freeze({
  /**
   * OGL v3.0 — read at nationalarchives.gov.uk/doc/open-government-licence/version/3/
   * and gov.uk/help/terms-conditions.
   *
   * Grants a worldwide, royalty-free, perpetual, non-exclusive licence to copy,
   * publish, distribute, transmit and adapt — and to EXPLOIT THE INFORMATION
   * COMMERCIALLY.
   *
   * 🔴 The commercial permission is the load-bearing part for us. AlmiWorld is a
   * commercial product, and it is the clause that makes OET's carve-outs
   * unreachable while making gov.uk's usable.
   */
  "OGL-v3.0": {
    label: "Open Government Licence v3.0",
    quotableClasses: DOCUMENT_CLASSES,
    permitsCommercial: true,
    permitsNetworkedStorage: true,
    requiresCurrentVersion: false,
    // 🔴 The per-page check the word "MOST" forces. GOV.UK says most content is
    // Crown copyright under the OGL, and that where it is not, "we'll usually
    // credit the author or copyright holder". So a page must be READ FOR A
    // THIRD-PARTY CREDIT before its text is stored. The OGL itself also excludes
    // personal data, departmental logos, crests and the Royal Arms, and
    // third-party rights.
    requiresPerPageThirdPartyCheck: true,
    requiredAttribution:
      "Contains public sector information licensed under the Open Government Licence v3.0.",
    attributionMustLinkTo: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    clause: "OGL v3.0 — copy, publish, distribute, transmit, adapt, and exploit commercially, subject to attribution.",
  },

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
   * 🔴 THE DEFAULT, AND IT IS THE COMMONEST ANSWER.
   *
   * A bare copyright notice and nothing else. NMBI, PNMC and NMCN are all this.
   *
   *   THE ABSENCE OF A LICENCE IS NOT PERMISSION.
   *   "ALL RIGHTS RESERVED" IS WHAT SILENCE MEANS.
   *
   * ⚠️ This is a CHANGE from PR #9, which recorded these three as `"unknown"`
   * and left the ruling open. The owner has now read all three pages and ruled:
   * they are `false`. Silence is not uncertainty about the licence — silence IS
   * the licence, and it reserves everything.
   */
  "proprietary-no-reuse": {
    label: "proprietary — no reuse terms granted",
    quotableClasses: [],
    permitsCommercial: false,
    permitsNetworkedStorage: false,
    requiresCurrentVersion: false,
    requiresPerPageThirdPartyCheck: false,
    requiredAttribution: null,
    attributionMustLinkTo: null,
    clause: "A copyright notice with no grant of reuse. All rights reserved by default.",
  },

  /**
   * OET / Cambridge Boxhill Language Assessment — read at
   * oet.com/Intellectual-Property-policy.
   *
   * 🔴 STRONGER THAN THIS PROJECT HAD IT RECORDED. PR #9 cited only the
   * "electronic retrieval system" clause. Two others bite harder:
   *
   *   - "transmit or reproduce ANY PART of the Content"  — prohibited
   *   - "distribute or commercially exploit the Content" — prohibited
   *
   * And every permitted use is expressly for "your own personal and
   * NON-COMMERCIAL use only". **AlmiWorld is commercial, so the carve-outs do
   * not reach us at all** — we are outside the permission before the retrieval-
   * system clause is even reached.
   */
  "OET-CBLA-IP": {
    label: "OET / Cambridge Boxhill Language Assessment — Intellectual Property policy",
    quotableClasses: [],
    permitsCommercial: false,
    permitsNetworkedStorage: false,
    requiresCurrentVersion: false,
    requiresPerPageThirdPartyCheck: false,
    requiredAttribution: null,
    attributionMustLinkTo: null,
    clause:
      'OET IP policy — prohibits "transmit or reproduce any part of the Content", "distribute or commercially exploit the Content", and storing the Content "in any other website or other form of electronic retrieval system". The permitted uses are personal and NON-COMMERCIAL only.',
  },

  /**
   * 🔴 THE ONLY TWO STATES IN WHICH `sourceQuotable` MAY BE `"unknown"`.
   *
   * A licence page that will not open cannot be read, and an unread licence is
   * NOT a permissive one. Four of the sources still to assess return 403 to a
   * machine, so this state will be needed and it must never soften into
   * "permitted".
   *
   *   AN UNREAD LICENCE IS NOT A PERMISSIVE LICENCE.
   *
   * Both behave identically — no quoting — and they are kept apart because the
   * work that closes them is different: one needs a person with a browser, the
   * other needs somebody to spend five minutes reading.
   */
  "unknown-licence-unreachable": {
    label: "UNKNOWN — the licence page could not be opened",
    quotableClasses: [],
    permitsCommercial: false,
    permitsNetworkedStorage: false,
    requiresCurrentVersion: false,
    requiresPerPageThirdPartyCheck: false,
    requiredAttribution: null,
    attributionMustLinkTo: null,
    clause: "No licence could be read because the page refused or did not exist. Not a grant of anything.",
  },
  "unknown-not-read": {
    label: "UNKNOWN — nobody has read this source's terms yet",
    quotableClasses: [],
    permitsCommercial: false,
    permitsNetworkedStorage: false,
    requiresCurrentVersion: false,
    requiresPerPageThirdPartyCheck: false,
    requiredAttribution: null,
    attributionMustLinkTo: null,
    clause: "The terms exist and have not been read. Not a grant of anything.",
  },
});

/** The two licences under which a record is allowed to say "unknown". */
export const UNKNOWN_LICENCES = Object.freeze(["unknown-licence-unreachable", "unknown-not-read"]);

/**
 * 🔴 THE DERIVATION. `sourceQuotable` is COMPUTED from the licence and the
 * document class — it is never a judgement typed into a record.
 *
 * Returns `true`, `false`, or `"unknown"`, and `"unknown"` ONLY when the
 * licence itself is one of the two unread states. **Silence from a licensor
 * produces `false`, not `"unknown"`** — that distinction is the whole of the
 * owner's ruling and collapsing it would quietly re-open a closed question.
 */
export function quotableUnder(licence, documentClass) {
  const l = LICENCES[licence];
  if (!l) return false;
  if (UNKNOWN_LICENCES.includes(licence)) return "unknown";
  return l.quotableClasses.includes(documentClass);
}

/** The exact credit this licence requires, or null where nothing may be quoted anyway. */
export function requiredAttribution(licence) {
  return LICENCES[licence]?.requiredAttribution ?? null;
}

/** Does this licence make freshness a CONDITION OF THE PERMISSION rather than hygiene? */
export function requiresCurrentVersion(licence) {
  return LICENCES[licence]?.requiresCurrentVersion === true;
}

/** Must each individual page be checked for a third-party credit before storing its text? */
export function requiresPerPageThirdPartyCheck(licence) {
  return LICENCES[licence]?.requiresPerPageThirdPartyCheck === true;
}
