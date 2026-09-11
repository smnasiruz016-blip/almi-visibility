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
 * It knows two conventions and no products:
 *
 *   1. a product with id `X` declares itself in `products/X/product.mjs`
 *   2. that module exports its registered descriptor as `PRODUCT`
 *
 * ⚠️ The second convention exists because the obvious alternative — reading a
 * named export like the first product's own constant — **would have put that
 * product's name in the engine**, and the boundary law would have failed this
 * very file. Caught while writing it.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const FLAG = "--product=";

/** Every product that has a descriptor on disk. Used to make errors useful. */
export function availableProducts() {
  const dir = join(REPO, "products");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) => {
      try {
        return statSync(join(dir, d)).isDirectory() && existsSync(join(dir, d, "product.mjs"));
      } catch {
        return false;
      }
    })
    .sort();
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
export async function productFromArgv(argv = process.argv, { usage = "" } = {}) {
  const id = productIdFromArgv(argv);
  const available = availableProducts();

  if (!id) {
    throw new Error(
      `--product=<id> is required. There is no default, and that is deliberate: a default is a ` +
        `dependency nobody has to declare, so it survives every refactor by being invisible.` +
        (usage ? `\n  usage: ${usage}` : "") +
        `\n  available: ${available.join(", ") || "(none found under products/)"}`,
    );
  }

  // 🔴 A product id becomes a PATH here, so it is checked rather than trusted.
  // A name with a separator or a traversal in it would otherwise reach outside
  // the products directory.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error(`--product=${JSON.stringify(id)} is not a product id — lowercase letters, digits and hyphens only`);
  }

  const file = join(REPO, "products", id, "product.mjs");
  if (!existsSync(file)) {
    throw new Error(`--product=${id}: no descriptor at products/${id}/product.mjs. available: ${available.join(", ") || "(none)"}`);
  }

  const mod = await import(pathToFileURL(file).href);
  const descriptor = mod.PRODUCT ?? mod.default;
  if (!descriptor?.productId) {
    throw new Error(`products/${id}/product.mjs must export its registered descriptor as PRODUCT`);
  }
  if (descriptor.productId !== id) {
    throw new Error(
      `products/${id}/product.mjs declares productId ${JSON.stringify(descriptor.productId)} — the folder and the id must agree`,
    );
  }
  return descriptor;
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
export async function productFromArgvOrExit(argv = process.argv, opts = {}) {
  try {
    return await productFromArgv(argv, opts);
  } catch (e) {
    console.error(`\n🔴 ${e.message}\n`);
    process.exit(1);
  }
}
