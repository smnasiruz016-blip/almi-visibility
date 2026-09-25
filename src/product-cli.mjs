/**
 * RESOLVING A PRODUCT AT CALL TIME, FROM AN ARGUMENT.
 *
 * ══ THE GAP THIS CLOSES — `A2`, MEASURED IN PHASE 0 ════════════════════════
 *
 * Seven of sixteen runners imported a product's descriptor **at import time**.
 * The arithmetic inside them was already generic — the axis was a parameter, the
 * facts directory was an argument — but **the BINDING was not**, so none of them
 * could be pointed at a second product without editing its source.
 *
 *   A GENERIC ENGINE REACHABLE ONLY THROUGH PRODUCT-BOUND ENTRY POINTS IS NOT
 *   YET A REUSABLE CAPABILITY. The capability existed; it was not addressable.
 *
 * ── 🔴 AND THERE IS NO DEFAULT ─────────────────────────────────────────────
 *
 * Not "defaults to the only product we have". A DEFAULT IS A DEPENDENCY NOBODY
 * HAS TO DECLARE, which is exactly how the first product got welded into the
 * engine the first time — through `dir = FACTS_DIR`, `page = NURSING_PAGE`,
 * `removeIds = REMOVED_FROM_...`. Every one of those read as harmless.
 *
 * A runner called without `--product=<id>` stops and says so.
 *
 * ── WHAT THE ENGINE KNOWS, AND WHAT IT DOES NOT ────────────────────────────
 *
 * It knows three rules and no products:
 *
 *   1. a product with id `X` exists because a root's registry DECLARES it (F03, 25 Sep 2026 —
 *      src/tenancy/root-registry.mjs), at a declared path whose `product.mjs` is its descriptor;
 *      a directory that merely holds a `product.mjs` is not a product
 *   2. the roots are a LIST, read from config/subject-roots.mjs (src/subject-roots.mjs) —
 *      since the owner's ruling of 14 September 2026 a product's own data lives OUTSIDE
 *      this repository, and only the engine's own fixtures stay in `products/`
 *   3. that module exports its registered descriptor as `PRODUCT`
 *
 * 🔴 F03 · THE DESCRIPTOR IS SUBJECT DATA, SO IT IS READ ONLY AFTER THE RUN'S DECISION. `productFromArgv` needs the
 * entry point's scoped run (src/governance/scoped-entry.mjs), and loads nothing unless that run holds a genuine decision
 * allowing this subject's root (RESOURCES.subject). After loading, the facts directory the descriptor names must be one
 * the registry DECLARES as the subject's member: a file's own content never widens what the declaration says.
 *
 * ⚠️ The third convention exists because the obvious alternative — reading a
 * named export like the first product's own constant — **would have put that
 * product's name in the engine**, and the boundary law would have failed this
 * very file. Caught while writing it.
 */
import { availableProductSubjects, allowsSubject, importSubjectModule, SubjectRootRefused } from "./subject-roots.mjs";
import { rootIndexFor } from "./tenancy/resolver.mjs";
import { lookupSubject } from "./tenancy/root-registry.mjs";
import { RESOURCES } from "./tenancy/scoped-run.mjs";

const FLAG = "--product=";

/** Every product a root registry declares. A missing root or a duplicate id is refused, not hidden. (Never echoed in a
 * refusal: listing every declared subject back to an operator would tell one tenant's run about another's subjects.) */
export function availableProducts() {
  /* F09: products only — a declared subject without a product module is a subject, not a product. */
  return availableProductSubjects();
}

/** The id given on the command line, or null. */
export function productIdFromArgv(argv = process.argv) {
  const arg = argv.find((a) => typeof a === "string" && a.startsWith(FLAG));
  const id = arg ? arg.slice(FLAG.length).trim() : "";
  return id.length > 0 ? id : null;
}

/**
 * Load the descriptor for the product named on the command line.
 *
 * Importing the descriptor is what registers the product — its licences, its
 * gaps and its declared variants — so this is also the moment the engine learns
 * anything about it at all.
 */
export async function productFromArgv(argv = process.argv, { usage = "", scope = null } = {}) {
  const id = productIdFromArgv(argv);

  if (!id) {
    throw new Error(
      `--product=<id> is required. There is no default, and that is deliberate: a default is a ` +
        `dependency nobody has to declare, so it survives every refactor by being invisible.` +
        (usage ? `\n  usage: ${usage}` : ""),
    );
  }

  // 🔴 A product id becomes a PATH here, so it is checked rather than trusted.
  // A name with a separator or a traversal in it would otherwise reach outside
  // a subject root — and a root may now be outside this repository.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error(`--product=${JSON.stringify(id)} is not a product id — lowercase letters, digits and hyphens only`);
  }

  /* 🔴 F03: the run's genuine decision for THIS subject's root, or nothing is read. */
  const decision = (scope?.decisions ?? []).map((d) => d?.decision).find((d) => allowsSubject(d, id));
  let mod;
  try {
    if (!decision) throw new SubjectRootRefused("SUBJECT_NOT_RESOLVED", "the run holds no decision allowing this subject's root — its descriptor is not read");
    mod = await importSubjectModule(id, "product.mjs", { decision });
  } catch (e) {
    throw new Error(`--product=${id}: ${e.message}`);
  }
  const descriptor = mod.PRODUCT ?? mod.default;
  if (!descriptor?.productId) {
    throw new Error(`--product=${id}: its descriptor must export its registered descriptor as PRODUCT`);
  }
  if (descriptor.productId !== id) {
    throw new Error(`--product=${id}: its descriptor declares a different productId — the declaration and the descriptor must agree`);
  }
  /* 🔴 F03: the descriptor may not claim a fact registry its declaration does not. */
  if (typeof descriptor.factsDir === "string") {
    const ref = RESOURCES.factRegistryAt(descriptor.factsDir).resourceRef;
    const members = lookupSubject(rootIndexFor(), id).entry?.members ?? [];
    if (!members.some((m) => m.resourceKind === "FACT_REGISTRY" && m.resourceRef === ref)) {
      throw new Error(`--product=${id}: DESCRIPTOR_CLAIMS_UNDECLARED_MEMBER — the descriptor names a fact registry the subject's declaration does not`);
    }
  }
  return descriptor;
}

/**
 * 🔴 F03 · The product id an entry point decides its subject root for — checked, READING NOTHING. A runner calls this
 * first, names RESOURCES.subject(id) in its scoped run, and only then loads the descriptor with that run. A missing or
 * malformed id is an operator mistake: the message and exit 1, exactly as productFromArgvOrExit reports it.
 */
export function productIdOrExit(argv = process.argv, { usage = "" } = {}) {
  const id = productIdFromArgv(argv);
  if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    console.error(`\n🔴 ${id ? `--product=${JSON.stringify(id)} is not a product id — lowercase letters, digits and hyphens only` : `--product=<id> is required. There is no default, and that is deliberate: a default is a dependency nobody has to declare, so it survives every refactor by being invisible.${usage ? `\n  usage: ${usage}` : ""}`}\n`);
    process.exit(1);
  }
  return id;
}

/**
 * The form a command-line runner uses.
 *
 * 🔴 A MISSING ARGUMENT IS AN OPERATOR MISTAKE, NOT A CRASH. Left to reject,
 * `productFromArgv` produces an unhandled rejection and a stack trace, and the
 * one line that says what to do scrolls past inside it. This prints the message
 * and exits 1 — the message IS the output.
 *
 * The throwing form stays exported because a test needs to catch it, and a
 * function that calls `process.exit` cannot be tested.
 */
export async function productFromArgvOrExit(argv = process.argv, { usage = "", scope = null } = {}) {
  try {
    return await productFromArgv(argv, { usage, scope });
  } catch (e) {
    console.error(`\n🔴 ${e.message}\n`);
    process.exit(1);
  }
}
