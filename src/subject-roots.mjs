/**
 * 🔴 SUBJECT ROOTS — HOW THE ENGINE FINDS A SUBJECT IT DOES NOT CONTAIN.
 *
 * The engine knows two conventions and no subjects: a subject with id `X` declares itself in `<root>/X/product.mjs`,
 * and the roots are READ from config/subject-roots.mjs (or its environment override). It never names a subject.
 *
 * ── THE FOUR REFUSALS ──────────────────────────────────────────────────────
 *
 *   1. an id that is not /^[a-z0-9][a-z0-9-]*$/ — an id becomes a PATH, and a separator or traversal in it would
 *      reach outside a root. That matters MORE once a root is outside this repository.
 *   2. a root that does not exist — named, never read as "no such subject".
 *   3. an id present in two roots — named with both paths, never resolved by precedence.
 *   4. an import from inside an external root that leaves it for anywhere but this engine's `src/`.
 *
 * ── THE RESOLUTION HOOK (owner's answer, 14 September 2026) ────────────────
 *
 * A subject's files import the engine by relative path (`../../src/product.mjs`), written when they lived inside this
 * repository. They move byte for byte, so those paths now point beside the external root, at a `src/` that is not
 * there. Rather than rewrite them — or load a SECOND copy of the engine, whose registry the running engine would never
 * read — an in-thread module hook resolves such an import to THIS engine's `src/`: the same module instance, so a
 * subject registers into the registry the engine actually reads. Anything else that leaves a root is refused.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative, sep, delimiter, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

import { SUBJECT_ROOTS, SUBJECT_ROOTS_ENV } from "../config/subject-roots.mjs";

export const ENGINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export { SUBJECT_ROOTS_ENV };

const inside = (path, root) => {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
};

/** The roots in force: the fixtures root(s) from config, then the external roots — from the override when it is set. */
export function subjectRoots(env = process.env) {
  const declared = SUBJECT_ROOTS.map((r) => ({ ...r, path: resolve(ENGINE, r.path) }));
  const fixtures = declared.filter((r) => r.kind === "fixtures");
  const override = env?.[SUBJECT_ROOTS_ENV];
  const external = typeof override === "string" && override.trim() !== ""
    ? override.split(delimiter).map((p) => p.trim()).filter(Boolean).map((p, i) => ({ id: `${SUBJECT_ROOTS_ENV}[${i}]`, kind: "external", path: resolve(ENGINE, p), why: `from ${SUBJECT_ROOTS_ENV}` }))
    : declared.filter((r) => r.kind === "external");
  return [...fixtures, ...external];
}

/** Every subject id in one root. A missing root is refused, naming its path. */
export function subjectsIn(root) {
  if (!existsSync(root.path)) {
    throw new Error(`subject root '${root.id}' (${root.kind}) is missing: ${root.path} — no subject there can be resolved. ${root.kind === "external" ? `Clone or create it, or point ${SUBJECT_ROOTS_ENV} at it.` : ""}`.trim());
  }
  return readdirSync(root.path)
    .filter((d) => {
      try {
        return statSync(join(root.path, d)).isDirectory() && existsSync(join(root.path, d, "product.mjs"));
      } catch {
        return false;
      }
    })
    .sort();
}

/** id → { root, dir } over every root. An id in two roots is refused, naming both paths. */
export function subjectIndex({ roots = subjectRoots() } = {}) {
  const found = new Map();
  for (const root of roots) {
    for (const id of subjectsIn(root)) {
      const dir = join(root.path, id);
      if (found.has(id)) {
        throw new Error(`subject '${id}' is declared in two roots: ${join(found.get(id).dir, "product.mjs")} AND ${join(dir, "product.mjs")} — refused; a silent winner is how a stale copy gets read. Remove one.`);
      }
      found.set(id, { root, dir });
    }
  }
  return found;
}

/** Every subject id across every root, sorted. */
export const availableSubjects = (opts) => [...subjectIndex(opts).keys()].sort();

/** The folder of one subject, by id — validated, found in exactly one root. */
export function resolveSubject(id, opts = {}) {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    throw new Error(`${JSON.stringify(id)} is not a product id — lowercase letters, digits and hyphens only`);
  }
  const index = subjectIndex(opts);
  const hit = index.get(id);
  if (!hit) {
    throw new Error(`no descriptor for '${id}' in any subject root (${(opts.roots ?? subjectRoots()).map((r) => r.path).join(", ")}). available: ${[...index.keys()].sort().join(", ") || "(none)"}`);
  }
  return hit;
}

let hooked = false;
/**
 * Register the in-thread resolution hook, once. An import whose parent file sits inside an EXTERNAL root and whose
 * target leaves that root is resolved into this engine's `src/` when the path it named lands in `src/` beside the root;
 * any other escape is refused.
 */
export function ensureSubjectHook(env = process.env) {
  if (hooked) return;
  hooked = true;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
        const parent = fileURLToPath(context.parentURL);
        const root = subjectRoots(env).find((r) => r.kind === "external" && inside(parent, r.path));
        if (root) {
          const target = resolve(dirname(parent), specifier);
          if (!inside(target, root.path)) {
            const rel = relative(dirname(root.path), target);
            if (!rel.startsWith(`src${sep}`) || rel.split(sep).includes("..")) {
              throw new Error(`refused: ${parent} imports '${specifier}', which leaves subject root ${root.path} and does not land in the engine's src/`);
            }
            return { url: pathToFileURL(join(ENGINE, rel)).href, shortCircuit: true };
          }
        }
      }
      return nextResolve(specifier, context);
    },
  });
}

/**
 * Import one module of a subject by its path INSIDE the subject's folder (e.g. `licences.mjs`). The path may not leave
 * the folder. Tests and runners reach a subject's own modules only through this — never through a baked-in path.
 */
export async function importSubjectModule(id, relPath, opts = {}) {
  const { dir } = resolveSubject(id, opts);
  const file = resolve(dir, relPath);
  if (!inside(file, dir) || file === dir) throw new Error(`'${relPath}' is not a path inside subject '${id}'`);
  if (!existsSync(file)) throw new Error(`subject '${id}' has no ${relPath} (${file})`);
  ensureSubjectHook();
  return import(pathToFileURL(file).href);
}
