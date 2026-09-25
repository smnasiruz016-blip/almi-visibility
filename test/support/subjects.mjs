/**
 * 🔴 HOW A TEST REACHES A SUBJECT — THROUGH THE SUBJECT ROOTS, NEVER A PATH BAKED INTO THE TEST.
 *
 * Owner ruling, 14 September 2026: a product's own data left this repository. A test that wrote the new path into
 * itself would be the same weld in a new place, so every test resolves a subject exactly as a runner does — by id,
 * through src/product-cli.mjs and src/subject-roots.mjs.
 *
 * 🔴 F03 (25 Sep 2026): and, as a runner does, only on a DECISION. Reading a subject's descriptor or module is reading its
 * data, so a test holds a genuine decision first:
 *   · a REAL subject (declared by an external root's registry) is decided, on the REAL declarations, for the one tenant its
 *     own members resolve to (censusSubjectScope) — a real refusal stays a refusal;
 *   · the engine's own FIXTURE subjects (declared by the fixtures root's registry) are not attached to any real tenant, so
 *     they are decided inside a DECLARED fixture world (test/helpers/declared-world.mjs) — never the real one. The fallback
 *     applies to fixture-root subjects only, so it can never mask a real subject's refusal.
 */
import { productFromArgv } from "../../src/product-cli.mjs";
import { importSubjectModule, resolveSubject, allowsSubject } from "../../src/subject-roots.mjs";
import { censusSubjectScope } from "../../src/tenancy/scoped-run.mjs";
import { createTenantResolver, rootIndexFor } from "../../src/tenancy/resolver.mjs";
import { lookupSubject } from "../../src/tenancy/root-registry.mjs";
import { declaredWorld } from "../helpers/declared-world.mjs";

let world = null;
const fixtureResolver = () => {
  if (!world) { world = declaredWorld(); process.on("exit", () => world.cleanup()); }
  return createTenantResolver({ env: world.envWith() });
};

/** The scope a test reads a subject under — a genuine decision, or the refusal the declarations give. */
export function subjectScope(id) {
  const real = censusSubjectScope(id);
  if (real.decisions.some((d) => allowsSubject(d.decision, id))) return real;
  if (lookupSubject(rootIndexFor(), id).rootKind === "fixtures") return censusSubjectScope(id, { resolve: fixtureResolver() });
  return real;
}

/** The registered descriptor of a subject, by id. */
export const subject = (id) => productFromArgv([`--product=${id}`], { scope: subjectScope(id) });

/** One module inside a subject's folder, by its path inside that folder. */
export const subjectModule = (id, relPath) => importSubjectModule(id, relPath, { decision: subjectScope(id).decisions[0].decision });

/** The folder a subject resolved to. */
export const subjectDir = (id) => resolveSubject(id).dir;
