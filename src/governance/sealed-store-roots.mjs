/**
 * 🔴 F07 AMENDMENT 2 (governance 051feb9) — WHERE A GOVERNED SEALED STORE OUTSIDE ANY GIT TREE IS, AND WHAT IT HOLDS.
 *
 * A held-out set or marking key may live in one of two shapes, and F07 must hold in both:
 *   GIT-TRACKED SEALED PATH  `resource.root` "engine" + `pathPrefixes` — the tracked files under the prefixes;
 *   GOVERNED SEALED STORE    `resource.root` <store name> declared in config/evidence-roles.mjs SEALED_STORE_ROOTS — a
 *                            directory located at run time by an ENVIRONMENT REFERENCE, BY NAME (never a committed path).
 * The owner chose the second shape for F10's real marking key (ruling S, _handoffs 84abe3d). Each declaration is an F03
 * storage descriptor, validated by F03's own vocabulary (src/tenancy/root-registry.mjs sealedStoreDescriptorRefusal).
 *
 * 🔴 A STORE THAT CANNOT BE LOCATED IS NOT AN EMPTY STORE. Undeclared, unset, relative, absent or not-a-directory each
 * resolve to `dir: null` with a named code; every caller fails closed on it.
 *
 * 🔴 REQUIRED VERSUS DECLARED (ruling S): a store is REQUIRED while a registered HELD_OUT_EVIDENCE or MARKING_KEY entry lives
 * in it. A REQUIRED store that cannot be located FAILS — in the census, in the evaluator and in CI alike — with a status
 * naming the store and the reason. A declared store no entry requires is reported, not failed: there is nothing in it to
 * protect or to read. Nothing here is conditional on the environment it runs in. Generic: no subject, product or client.
 * Returns names, codes and counts; never the directory in any message.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { SEALED_STORE_ROOTS } from "../../config/evidence-roles.mjs";
import { sealedStoreDescriptorRefusal } from "../tenancy/root-registry.mjs";

export const SEALED_STORE_MECHANISMS = Object.freeze(["ENV_REFERENCE"]);
/** Root names a governed sealed store may never take: the engine's own tree and the derivation pseudo-root. */
export const RESERVED_ROOTS = Object.freeze(["engine", "derived"]);
export const SEALED_ROLES_IN_STORES = Object.freeze(["HELD_OUT_EVIDENCE", "MARKING_KEY"]);

/**
 * Every declared store, resolved: { roots: { name: absoluteDir | null }, codes: { name: code } }.
 * `declared` and `env` are injectable so a proof can declare a scratch store without touching the real configuration.
 */
export function resolveSealedStoreRoots({ declared = SEALED_STORE_ROOTS, env = process.env } = {}) {
  const roots = {};
  const codes = {};
  for (const [name, ref] of Object.entries(declared ?? {})) {
    const set = (dir, code) => { roots[name] = dir; codes[name] = code; };
    const refusal = sealedStoreDescriptorRefusal(name, ref, { reserved: RESERVED_ROOTS });
    if (refusal) { set(null, refusal); continue; }
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

/** The stores a registry REQUIRES: store name → the ids of the registered sealed entries that live in it. */
export function requiredStores(registry) {
  const out = new Map();
  for (const e of registry ?? []) {
    const r = e?.resource ?? {};
    if (!SEALED_ROLES_IN_STORES.includes(e?.role) || r.derivation || typeof r.root !== "string" || RESERVED_ROOTS.includes(r.root)) continue;
    if (!out.has(r.root)) out.set(r.root, []);
    out.get(r.root).push(String(e.id));
  }
  return out;
}

/**
 * One status row per store that is declared OR required: { store, declared, requiredBy, code, status, fails }.
 *   LOCATED                         declared and located (required or not)
 *   DECLARED_NOT_REQUIRED (<code>)  declared, not located, and no registered entry lives in it — reported, not failed
 *   REQUIRED_BUT_UNLOCATED (<code>) a registered entry lives in it and it cannot be located — FAILS
 *   REQUIRED_BUT_UNDECLARED         a registered entry names a store no descriptor declares — FAILS
 * Names and codes only — never a directory.
 */
export function sealedStoreStatus({ registry, declared = SEALED_STORE_ROOTS, resolution = resolveSealedStoreRoots({ declared }) }) {
  const req = requiredStores(registry);
  const names = [...new Set([...Object.keys(declared ?? {}), ...req.keys()])].sort();
  return names.map((store) => {
    const isDeclared = Object.hasOwn(declared ?? {}, store);
    const requiredBy = (req.get(store) ?? []).length;
    const code = isDeclared ? resolution.codes[store] : "SEALED_STORE_UNDECLARED";
    const located = Boolean(isDeclared && resolution.roots[store]);
    const status = located ? "LOCATED" : !requiredBy ? `DECLARED_NOT_REQUIRED (${code})` : isDeclared ? `REQUIRED_BUT_UNLOCATED (${code})` : "REQUIRED_BUT_UNDECLARED";
    return Object.freeze({ store, declared: isDeclared, requiredBy, code, status, fails: requiredBy > 0 && !located });
  });
}
