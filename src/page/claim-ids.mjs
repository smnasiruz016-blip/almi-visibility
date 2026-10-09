/**
 * READING A PAGE SPEC — the one operation the engine performs on a spec.
 *
 * A page spec is a product's document: which sections, in which order, under
 * which headings, referencing which claim ids. The engine does not get to know
 * what any of it means. It gets to know one thing — WHICH CLAIMS ARE ASKED FOR —
 * because that is what it has to fetch from the registry and what it has to
 * refuse when a claim is missing.
 *
 * This function used to live at the bottom of `spec.mjs` with one profession's page
 * as its default argument, which is how a generic helper ends up owned by one
 * product: not by naming it, but by falling back to it.
 *
 * 🔴 SO THERE IS NO DEFAULT. A caller that has no page has nothing to read.
 */
export function claimIdsOf(page) {
  if (!Array.isArray(page?.sections)) {
    throw new Error("claimIdsOf(page): a page spec needs a sections array — there is no default page");
  }
  return [...new Set(page.sections.flatMap((s) => s.claims))];
}
