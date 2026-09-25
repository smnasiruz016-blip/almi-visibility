/**
 * 🔴 SUBJECT ROOTS — HOW THE ENGINE FINDS A SUBJECT IT DOES NOT CONTAIN.
 *
 * The roots are READ from config/subject-roots.mjs (or its environment override). 🔴 F03 (25 Sep 2026): a subject exists
 * because a root's registry DECLARES it (src/tenancy/root-registry.mjs) — never because a directory holding a
 * `product.mjs` is present. The engine no longer lists a root to discover subjects: an undeclared directory is invisible,
 * and a declared one that is absent refuses. It never names a subject.
 *
 * ── THE REFUSALS — each a reason CODE; none carries a filesystem path, a host or another subject's id ─────────
 *
 *   1. an id that is not /^[a-z0-9][a-z0-9-]*$/ — an id becomes a PATH, and a separator or traversal in it would
 *      reach outside a root. That matters MORE once a root is outside this repository.
 *   2. a root that does not exist, or a registry that cannot be read — never read as "no such subject".
 *   3. an id declared in two roots — never resolved by precedence.
 *   4. an id no registry declares — the whole answer; the ids of other subjects are never listed back.
 *   5. an import from inside an external root that leaves it for anywhere but this engine's `src/`.
 *   6. (F03) an import of a subject's module WITHOUT a genuine decision that allowed that subject's root for the run.
 *
 * ── THE RESOLUTION HOOK (owner's answer, 14 September 2026) ────────────────
 *
 * A subject's files import the engine by relative path (`../../src/product.mjs`), written when they lived inside this
 * repository. They move byte for byte, so those paths now point beside the external root, at a `src/` that is not
 * there. Rather than rewrite them — or load a SECOND copy of the engine, whose registry the running engine would never
 * read — an in-thread module hook resolves such an import to THIS engine's `src/`: the same module instance, so a
 * subject registers into the registry the engine actually reads. Anything else that leaves a root is refused.
 */
import { existsSync } from "node:fs";
import { join, dirname, resolve, relative, sep, delimiter, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

import { SUBJECT_ROOTS, SUBJECT_ROOTS_ENV } from "../config/subject-roots.mjs";
import { RESOURCE_KINDS } from "./tenancy/resolver.mjs";
import { readRootIndex, lookupSubject, declaredSubjectIds } from "./tenancy/root-registry.mjs";
import { isGenuineDecision, refDigest } from "./tenancy/scope.mjs";

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

/** A refusal: a reason CODE and a sentence that carries no filesystem path, host or other subject's id. */
export class SubjectRootRefused extends Error {
  constructor(code, sentence) { super(`${code}: ${sentence}`); this.name = "SubjectRootRefused"; this.code = code; }
}

/** The root index over these roots (src/tenancy/root-registry.mjs). An unreadable index is refused, never read as empty. */
function readIndex(roots) {
  const index = readRootIndex({ roots, resourceKinds: RESOURCE_KINDS });
  if (index.state !== "READ") throw new SubjectRootRefused(`ROOT_INDEX_${index.reason}`, `the root registries could not be read${index.rootId ? ` (root '${index.rootId}')` : ""} — no subject can be resolved`);
  return index;
}

/** Every subject id ONE root's registry declares. A missing root or an unreadable registry is refused. */
export function subjectsIn(root) {
  return declaredSubjectIds(readIndex([root]));
}

/** id → { root, dir } over every root — DECLARED subjects only. An id declared in two roots, or declared at a path that is
 * absent, is refused. */
export function subjectIndex({ roots = subjectRoots() } = {}) {
  const index = readIndex(roots);
  const found = new Map();
  for (const id of declaredSubjectIds(index)) {
    const l = lookupSubject(index, id);
    if (l.state === "AMBIGUOUS") throw new SubjectRootRefused("SUBJECT_AMBIGUOUS", `subject '${id}' is declared in more than one root registry — refused; a silent winner is how a stale copy gets read`);
    if (l.state !== "DECLARED") throw new SubjectRootRefused(`SUBJECT_${l.reason}`, `subject '${id}' is declared, but its declared root cannot be used`);
    found.set(id, { root: roots.find((r) => r.id === l.rootId), dir: l.dir });
  }
  return found;
}

/** Every declared subject id across every root, sorted. */
export const availableSubjects = (opts) => [...subjectIndex(opts).keys()].sort();

/** The folder of one subject, by id — validated, DECLARED in exactly one root registry. */
export function resolveSubject(id, opts = {}) {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) throw new SubjectRootRefused("SUBJECT_ID_INVALID", "a subject id is lowercase letters, digits and hyphens only");
  const hit = subjectIndex(opts).get(id);
  if (!hit) throw new SubjectRootRefused("SUBJECT_UNDECLARED", "no root registry declares this subject");
  return hit;
}

/**
 * 🔴 F03 · IS THIS A DECISION THAT ALLOWED THIS SUBJECT'S ROOT? Only a decision object src/tenancy/scope.mjs itself made,
 * allowed, and about exactly this subject's SUBJECT_ROOT — never an object that merely looks like one.
 */
export const allowsSubject = (decision, id) => isGenuineDecision(decision) && decision.allowed === true && decision.target?.resourceKind === "SUBJECT_ROOT" && decision.target?.resourceRefDigest === refDigest("SUBJECT_ROOT", id);

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
              throw new SubjectRootRefused("SUBJECT_IMPORT_LEAVES_ROOT", `an import ('${specifier}') leaves its subject root and does not land in the engine's src/`);
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
 * 🔴 F03: importing a subject's module IS reading its data, so it needs `opts.decision` — the genuine decision that
 * allowed this subject's root for the run (src/tenancy/scoped-run.mjs RESOURCES.subject, decided at the entry point).
 */
export async function importSubjectModule(id, relPath, opts = {}) {
  if (!allowsSubject(opts.decision, id)) throw new SubjectRootRefused("SUBJECT_NOT_RESOLVED", "a subject's module is read only after a decision allowed its root for this run");
  const { dir } = resolveSubject(id, opts);
  const file = resolve(dir, relPath);
  if (!inside(file, dir) || file === dir) throw new SubjectRootRefused("SUBJECT_PATH_OUTSIDE_ROOT", `'${relPath}' is not a path inside subject '${id}'`);
  if (!existsSync(file)) throw new SubjectRootRefused("SUBJECT_MODULE_ABSENT", `subject '${id}' has no ${relPath}`);
  ensureSubjectHook();
  return import(pathToFileURL(file).href);
}
