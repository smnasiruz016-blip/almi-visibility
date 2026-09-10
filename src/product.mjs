/**
 * THE PRODUCT DESCRIPTOR — HOW A PRODUCT INTRODUCES ITSELF TO THE ENGINE.
 *
 * ══ THE RULING THIS IMPLEMENTS ══════════════════════════════════════════════
 *
 *   "ye 12 occupations OET ka hissa hain, visibility ka nahien. Visibility
 *    hamaray TAMAM products k liye hay — jo ban chuke hain aur jo abhi bannay
 *    wale hain."
 *
 * 🔴 SO THE ENGINE IS NOT GIVEN KNOWLEDGE OF NURSING. IT IS GIVEN THE ABILITY
 * TO HOLD NURSING.
 *
 * The difference is the whole design. An engine that knows about nursing has to
 * be edited before it can serve anything else, and every such edit is a chance
 * to special-case one product at another's expense. An engine that holds a
 * descriptor serves the second product on the day the second descriptor is
 * written, and `test/product-boundary.test.mjs` fails the build if that ever
 * stops being true.
 *
 * ── WHAT A DESCRIPTOR SAYS ──────────────────────────────────────────────────
 *
 *   productId       who this is
 *   axis            🔴 WHAT ITS PAGES VARY BY — the key, and a human label
 *   variants        the values of that axis it publishes a page for
 *   factsDir        where its records live
 *   pageSpecs       its page specs, by slug
 *   gapRegister     what it knows is missing
 *   licenceEntries  the terms of the documents it cites
 *   placement       which of its claims are universal, and which await a layer
 *
 * ⚠️ THE PRODUCT DECLARES ITS VARIANTS. The engine does not discover them, and
 * must never infer them from the records it happens to have — a registry that
 * covers two professions would then report that the product has two, and a
 * cohort of twelve would silently become a cohort of two. The list of variants
 * is a STATEMENT OF INTENT, and the gap between it and the supply is exactly
 * the number worth reporting.
 */
import { registerLicences } from "./facts/licences.mjs";
import { registerGaps } from "./facts/gaps.mjs";

const REGISTERED = new Map();

const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;

/**
 * Validate a descriptor and wire its knowledge into the engine.
 *
 * 🔴 EVERY FIELD IS CHECKED BEFORE ANYTHING IS REGISTERED. A descriptor that is
 * half-accepted leaves the engine holding one product's licences under another
 * product's name, and nothing downstream would ever notice.
 */
export function registerProduct(descriptor) {
  const d = descriptor ?? {};
  const fail = (why) => {
    throw new Error(`registerProduct: ${why}`);
  };

  if (!isNonEmptyString(d.productId)) fail("a product needs a productId");
  if (REGISTERED.has(d.productId)) fail(`${d.productId} is already registered`);
  if (!isNonEmptyString(d.axis?.key)) fail(`${d.productId}: axis.key — say what the pages vary BY, or the engine has to guess`);
  if (!isNonEmptyString(d.axis?.label)) fail(`${d.productId}: axis.label — the key is for code, the label is for a reader`);
  if (!Array.isArray(d.variants) || d.variants.length === 0) fail(`${d.productId}: variants — a product with no variants has no sibling pages, and no overlap to measure`);
  if (new Set(d.variants).size !== d.variants.length) fail(`${d.productId}: variants contains a duplicate`);
  if (!isNonEmptyString(d.factsDir)) fail(`${d.productId}: factsDir — the engine has no default place to look`);
  if (typeof d.pageSpecs !== "object" || d.pageSpecs === null) fail(`${d.productId}: pageSpecs must be an object keyed by slug`);

  for (const [slug, spec] of Object.entries(d.pageSpecs)) {
    if (!Array.isArray(spec?.sections)) fail(`${d.productId}: pageSpec "${slug}" has no sections`);
    // 🔴 A page must say which variant it is FOR, and it must be one the
    // product declared. A spec whose variant is not in the list is a page
    // nobody counts in the rollout — it would pass every test and never be
    // measured against its siblings.
    if (!d.variants.includes(spec?.variant)) {
      fail(`${d.productId}: pageSpec "${slug}" has variant ${JSON.stringify(spec?.variant)}, which is not one of this product's variants`);
    }
  }

  registerLicences(d.productId, d.licenceEntries ?? {});
  registerGaps(d.productId, d.gapRegister ?? []);
  REGISTERED.set(d.productId, Object.freeze({ ...d }));
  return REGISTERED.get(d.productId);
}

/** A registered product, by id. */
export function product(productId) {
  const found = REGISTERED.get(productId);
  if (!found) throw new Error(`product(${productId}): not registered — import its descriptor first`);
  return found;
}

/** Every registered product id. */
export function registeredProducts() {
  return Object.freeze([...REGISTERED.keys()]);
}

/**
 * How much of a product's declared shape actually has supply.
 *
 * 🔴 THE DENOMINATOR IS THE DECLARED VARIANTS, NOT THE PAGES WE MANAGED TO
 * BUILD. A gate may not build its denominator from its own output, and
 * "12 of 12 pages built" measured against the pages built is exactly that.
 */
export function coverage(productId, { pageSpecs = null } = {}) {
  const p = product(productId);
  const specs = pageSpecs ?? p.pageSpecs;
  const built = Object.values(specs).map((s) => s.variant);
  return {
    axis: p.axis.key,
    declared: p.variants.length,
    withAPage: built.length,
    missing: p.variants.filter((v) => !built.includes(v)),
  };
}
