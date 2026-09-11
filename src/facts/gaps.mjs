/**
 * THE GAP REGISTER — claims a product KNOWS a page needs and has NOT acquired.
 *
 * ── WHY AN EMPTY SLOT IS A RECORD ───────────────────────────────────────────
 *
 * A registry that lists only what it has, tells you only what it has. The
 * question a reader of the census actually needs answered is "what is missing",
 * and a store of facts is structurally incapable of answering it — absence
 * leaves no row.
 *
 * 🔴 AND THE ALTERNATIVE TO DECLARING THEM IS INVENTING THEM. Every gap is a
 * claim some page inventory says a page must make. A model asked to fill a
 * registry could produce a plausible sentence for every one of them from
 * general knowledge, and each would look exactly like a real record. THAT is
 * the failure a fact registry exists to prevent, so gaps are counted out loud
 * where the pressure to quietly close them is highest.
 *
 * ⚠️ Gaps are NOT records. They have no value, no source and no date, they are
 * not loaded by `loadRegistry`, and nothing may render them.
 *
 * ── 🔴 WHY THIS FILE HOLDS NO GAPS OF ITS OWN ───────────────────────────────
 *
 * A gap is always a gap in SOME PRODUCT'S page. "AHPRA returns 403" is a fact
 * about AlmiOET's destination-regulator block, not about the machinery that
 * counts gaps. So this file is the REGISTER — the shape, the doctrine and the
 * counting — and every entry arrives from a product.
 *
 * The distinction is the same one that keeps `licences.mjs` here while its NMC
 * and OET entries live with the product: A CATALOGUE IS NOT ITS ENTRIES.
 */

const REGISTERED = [];

/**
 * Declare a product's gaps. Called once per product, at import time.
 *
 * 🔴 THE PRODUCT ID IS RECORDED WITH EACH GAP, not just for tidiness. Once a
 * second product exists, a census that says "14 gaps" without saying whose is a
 * number nobody can act on.
 */
export function registerGaps(productId, entries) {
  if (typeof productId !== "string" || productId.length === 0) {
    throw new Error("registerGaps(productId, entries): a gap belongs to a product, so name it");
  }
  if (!Array.isArray(entries)) {
    throw new Error(`registerGaps(${productId}): entries must be an array`);
  }
  if (REGISTERED.some((g) => g.productId === productId)) {
    throw new Error(`registerGaps(${productId}): already registered — a second call would silently double the count`);
  }
  for (const entry of entries) {
    if (typeof entry?.claim !== "string" || typeof entry?.blockedBy !== "string") {
      throw new Error(`registerGaps(${productId}): every gap needs a claim and a blockedBy — an unexplained gap is a shrug`);
    }
    REGISTERED.push(Object.freeze({ ...entry, productId }));
  }
}

/**
 * A product's declared gaps.
 *
 * 🔴 THE PRODUCT ID IS REQUIRED, AND THAT IS THE FIX.
 *
 * This used to return EVERY product's gaps to every caller, so a second tenant
 * read the first's declared shortfalls simply by asking. Measured before it was
 * fixed: registering a probe moved the shared count 12 to 13.
 *
 * ⚠️ A caller with no product gets an EMPTY list, not everything. The safe
 * direction is LESS, not more — an omitted argument must never widen what is
 * visible.
 */
export function declaredGaps(productId) {
  if (!productId) return Object.freeze([]);
  return Object.freeze(REGISTERED.filter((g) => g.productId === productId));
}

/**
 * Which products have declared their gaps.
 *
 * 🔴 THIS IS HERE SO THAT "NO GAPS" CANNOT LOOK LIKE GOOD NEWS. An empty gap
 * list means either that nothing is missing or that nobody registered, and
 * those two are opposites. The census prints this alongside the count so the
 * difference is visible instead of flattering.
 */
export function gapRegisterProducts() {
  return Object.freeze([...new Set(REGISTERED.map((g) => g.productId))]);
}
