/**
 * ALMIOET'S CLAIM PLACEMENT — which of its claims stay on a profession page,
 * and which are waiting for a layer that does not exist yet.
 *
 * The RULE that decides this is the engine's and stays there:
 *
 *   A CLAIM'S SCOPE DECIDES WHERE IT LIVES. A claim that turns on something a
 *   page cannot know does not belong on that page, however true it is.
 *
 * What is below is AlmiOET applying that rule to its own claim ids. `oet.
 * grade-bands-0-500` is universal FOR THIS PRODUCT; the UK red list is scoped
 * to a reader's origin, which a profession page never knows. Another product
 * would have entirely different ids and quite possibly different layers.
 */

/**
 * 🔴 UNIVERSAL — true wherever the reader is from and wherever they are going.
 * These STAY on every profession page, and the repetition is paid for in
 * overlap at a price that has been measured rather than assumed: best-case
 * 0.2409 / 0.2585 against a 0.40 bar.
 */
export const UNIVERSAL_CLAIMS = Object.freeze([
  // The page's own premise: why there is a NURSING page rather than one page
  // about OET. Without it /nursing starts mid-argument.
  "oet.subtests-and-which-are-profession-specific",
  // The scale and the grades. True for a dentist and a nurse alike, and the
  // thing every other claim on the page is denominated in.
  "oet.grade-bands-0-500",
]);

/**
 * 🔴 THE LAYERS THAT DO NOT EXIST YET.
 *
 * ⚠️ These claims are held in the registry, rendered NOWHERE, and counted as
 * owed. That is the honest state and it is NOT the same as being published
 * somewhere worse. They are NOT "behind a link" — there is no link, because
 * there is nowhere to send anybody. `exists: false` is checked by the engine,
 * which refuses a layer that claims otherwise.
 */
export const PENDING_LAYERS = Object.freeze([
  {
    // 🔴 ORIGIN-SCOPED — they turn on WHERE THE READER IS FROM, which a
    // profession page never knows. /nursing was showing these to every reader
    // alike.
    claims: Object.freeze([
      "uk-ukvi.majority-english-speaking-countries",
      "uk-code-of-practice.red-list-rule",
      "uk-code-of-practice.amber-list-rule",
      "uk-code-of-practice.direct-application-exception",
    ]),
    layer: "a layer that knows the reader's ORIGIN",
    exists: false,
    becomes: 'not "here are the rules" but "Nigeria is red-listed, and here is what that means for you"',
  },
  {
    // 🔴 DESTINATION-SCOPED — Immigration New Zealand's rule about how the test
    // must be taken. It is not a property of OET and not a property of nursing.
    claims: Object.freeze(["nz-immigration-nz.oet-must-be-taken-in-person"]),
    layer: "a layer that knows the DESTINATION",
    exists: false,
    becomes: 'not "New Zealand requires this" on a page about nursing, but on a page about going to New Zealand',
  },
]);
