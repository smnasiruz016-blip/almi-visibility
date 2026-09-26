/**
 * 🔴 F07 AMENDMENT 2 (governance 051feb9) — WHERE A GOVERNED SEALED STORE OUTSIDE ANY GIT TREE IS, AND WHAT IT HOLDS.
 *
 * A held-out set or marking key may live in one of two shapes, and F07 must hold in both (the owner chooses which a real
 * marking key uses; this module decides neither):
 *   GIT-TRACKED SEALED PATH  `resource.root` "engine" + `pathPrefixes` — the tracked files under the prefixes;
 *   GOVERNED SEALED STORE    `resource.root` <store name> declared in config/evidence-roles.mjs SEALED_STORE_ROOTS — a
 *                            directory located at run time by an ENVIRONMENT REFERENCE, BY NAME (never a committed path).
 *
 * 🔴 A STORE THAT CANNOT BE LOCATED IS NOT AN EMPTY STORE. Undeclared, unset, relative, absent or not-a-directory each
 * resolve to `dir: null` with a named code; every caller fails closed on it. Generic: no subject, product or client.
 * Returns names, codes and counts; never the directory in any message.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { SEALED_STORE_ROOTS } from "../../config/evidence-roles.mjs";

export const SEALED_STORE_MECHANISMS = Object.freeze(["ENV_REFERENCE"]);
const STORE_NAME = /^[a-z][a-z0-9-]{0,63}$/;
const ENV_NAME = /^[A-Z][A-Z0-9_]{2,63}$/;
/** Root names a governed sealed store may never take: the engine's own tree and the derivation pseudo-root. */
export const RESERVED_ROOTS = Object.freeze(["engine", "derived"]);

/**
 * Every declared store, resolved: { roots: { name: absoluteDir | null }, codes: { name: code } }.
 * `declared` and `env` are injectable so a proof can declare a scratch store without touching the real configuration.
 */
export function resolveSealedStoreRoots({ declared = SEALED_STORE_ROOTS, env = process.env } = {}) {
  const roots = {};
  const codes = {};
  for (const [name, ref] of Object.entries(declared ?? {})) {
    const set = (dir, code) => { roots[name] = dir; codes[name] = code; };
    if (!STORE_NAME.test(name) || RESERVED_ROOTS.includes(name)) { set(null, "SEALED_STORE_NAME_INVALID"); continue; }
    if (!SEALED_STORE_MECHANISMS.includes(ref?.mechanism) || !ENV_NAME.test(String(ref?.name ?? ""))) { set(null, "SEALED_STORE_REFERENCE_INVALID"); continue; }
    const value = env?.[ref.name];
    if (typeof value !== "string" || value.trim() === "") { set(null, "SEALED_STORE_REFERENCE_UNSET"); continue; }
    if (!isAbsolute(value)) { set(null, "SEALED_STORE_NOT_ABSOLUTE"); continue; }
    if (!existsSync(value) || !statSync(value).isDirectory()) { set(null, "SEALED_STORE_ABSENT"); continue; }
    set(value, "SEALED_STORE_LOCATED");
  }
  return { roots, codes };
}

/** The files a located store holds: repository-style "/" paths relative to it, sorted. A missing directory lists nothing. */
export function storeFiles(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true }).map(String).filter((p) => statSync(join(dir, p)).isFile()).map((p) => p.replace(/\\/g, "/")).sort();
}
