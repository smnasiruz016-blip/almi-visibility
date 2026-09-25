/**
 * 🔴 F03 · DECLARE A TEST ROOT'S STORES AND SUBJECTS — the way a real root does, in its `roots.json`.
 *
 * Since F03 a store (observations, captures, research, declarations) and a subject's data root exist only because a root's
 * registry declares them (src/tenancy/root-registry.mjs). A test that builds a disposable root and expects the engine to
 * find what it put there must DECLARE it — a directory the test merely created is, correctly, invisible.
 *
 *   declareRoot(dir, { stores: { OBSERVATIONS: "observations" }, subjects: [{ subjectId, path, members, connectors }] })
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function declareRoot(dir, { stores = {}, subjects = [] } = {}) {
  const doc = {
    schemaVersion: 1,
    kind: "ROOT_REGISTRY",
    stores: Object.entries(stores).map(([store, path]) => ({ store, path })),
    subjects: subjects.map((s) => ({ subjectId: s.subjectId, path: s.path ?? s.subjectId, members: s.members ?? [], connectors: s.connectors ?? [] })),
  };
  writeFileSync(join(dir, "roots.json"), JSON.stringify(doc, null, 2) + "\n");
  return dir;
}
