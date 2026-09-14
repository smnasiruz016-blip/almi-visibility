/**
 * 🔴 WHERE SUBJECTS LIVE — A LIST OF ROOTS, IN DECLARATION ORDER. CONFIGURATION, NOT A HARD-CODED FOLDER.
 *
 * OWNER RULING, 14 September 2026 (Option A — the subject registry leaves this repository). Row 1 of the frozen
 * checklist says "keep each product's data, evidence, costs and learning ISOLATED"; a product's own data inside this
 * repository was never what it said. The single `products/` folder was a build-time decision nobody put to the owner,
 * and it is reversed.
 *
 *   fixtures   this engine's OWN declared test material — it stays in this repository, relative to it
 *   external   a product's own data — outside this repository, in its own git repository
 *
 * Each root holds one folder per product: `<root>/<id>/product.mjs`. A product id resolves in the root that holds it,
 * and 🔴 an id found in TWO roots is refused, naming both paths — a silent winner is how a stale copy gets read for a
 * week. A missing root is refused, naming its path — never an empty list that reads as "this product does not exist".
 *
 * ── THE OVERRIDE ────────────────────────────────────────────────────────────
 *
 * `ALMIVISIBILITY_SUBJECT_ROOTS` replaces the EXTERNAL roots (never the fixtures root) with a list of paths separated
 * by the platform's path delimiter (`;` on Windows, `:` elsewhere). CI uses it to point at its checkout of the data
 * repository. A relative path is resolved against this repository.
 */

export const SUBJECT_ROOTS_ENV = "ALMIVISIBILITY_SUBJECT_ROOTS";

export const SUBJECT_ROOTS = Object.freeze([
  Object.freeze({
    id: "engine-fixtures",
    kind: "fixtures",
    path: "products",
    why: "this engine's own declared test material (the neutral declared test product) — not any product's data",
  }),
  Object.freeze({
    id: "almi-visibility-data",
    kind: "external",
    path: "../almi-visibility-data",
    why: "the products' own data, in its own git repository beside this one (owner ruling, 14 September 2026)",
  }),
]);
