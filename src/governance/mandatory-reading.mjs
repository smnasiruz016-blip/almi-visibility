/**
 * 🔴 F07 §5.6 · THE MANDATORY-READING MANIFEST — WHAT A BUILDER MUST READ, AND PROOF THAT NONE OF IT IS SEALED.
 *
 * A builder or a command must read the governance that governs it. That reading is exactly where held-out material must
 * never be: a sealed item that sits in mandatory reading is exposed before any mechanism is frozen (F07's FAILURE text).
 * So the manifest is DECLARED (config/governance/mandatory-reading.mjs) and checked against what the loaders ACTUALLY
 * read, in both directions:
 *
 *   REQUIRED_SOURCE_MISSING   a source a loader reads is absent from the manifest — every CURRENT record in the
 *                             authority corpus (what the F05 register resolves), every acceptance source the F-board
 *                             pins, and the F-board's own configuration.
 *   SEALED_IN_MANIFEST        a manifest entry the seal classifier refuses.
 *   PROTECTED_ROLE_IN_MANIFEST a manifest entry registered SEALED, HELD_OUT_EVIDENCE, MARKING_KEY or RETIRED_CONTAMINATED,
 *                             or registered as not mandatory-readable.
 *   MANIFEST_ENTRY_MALFORMED  an entry that does not name a repository and a path.
 *
 * Generic: repositories are named by role (engine, governance), never by product.
 */
import { classifySealed } from "./sealed-paths.mjs";

export const PROTECTED_ROLES = Object.freeze(["SEALED", "HELD_OUT_EVIDENCE", "MARKING_KEY", "RETIRED_CONTAMINATED"]);
const key = (repo, path) => `${repo}:${String(path).replace(/\\/g, "/")}`;
const REGISTRY_ROOT = { engine: "engine", governance: "governance", _handoffs: "governance" };

/** What the loaders actually read: CURRENT authority sources, pinned acceptance sources, the board's configuration. */
export function requiredSources({ corpus, dispositions, acceptances, boardConfig }) {
  const req = new Map();
  corpus.forEach((r, i) => {
    if (dispositions[i]?.disposition !== "CURRENT") return;
    const repo = r.sourceRef?.repo === "_handoffs" ? "governance" : r.sourceRef?.repo;
    req.set(key(repo, r.sourceRef?.path), { repo, path: r.sourceRef?.path, loader: "authority register (CURRENT record)" });
  });
  for (const a of Object.values(acceptances)) req.set(key("governance", a.ruling.path), { repo: "governance", path: a.ruling.path, loader: `F-board acceptance ${a.featureId}` });
  for (const p of boardConfig) req.set(key("engine", p), { repo: "engine", path: p, loader: "F-board configuration" });
  return [...req.values()];
}

/** Every fault of a manifest against the loaders and the evidence-role registry. [] means lawful. */
export function manifestErrors({ manifest, required, registry }) {
  const errs = [];
  const have = new Set();
  for (const [i, m] of (manifest ?? []).entries()) {
    if (!m || typeof m.repo !== "string" || typeof m.path !== "string" || !m.path) { errs.push({ code: "MANIFEST_ENTRY_MALFORMED", at: i }); continue; }
    have.add(key(m.repo, m.path));
    const root = REGISTRY_ROOT[m.repo] ?? m.repo;
    const v = classifySealed({ registry, root, base: "", path: m.path });
    if (v.refuse) errs.push({ code: v.code === "SEALED_PATH_REFUSED" ? "SEALED_IN_MANIFEST" : v.code, at: i, entry: v.entryId });
    const reg = (registry ?? []).find((e) => e.resource?.root === root && e.resource?.path === m.path);
    if (reg && (PROTECTED_ROLES.includes(reg.role) || reg.mandatoryReadable === false && reg.sealed === true)) errs.push({ code: "PROTECTED_ROLE_IN_MANIFEST", at: i, entry: reg.id });
  }
  for (const r of required) if (!have.has(key(r.repo, r.path))) errs.push({ code: "REQUIRED_SOURCE_MISSING", source: `${r.repo}:${r.path}`, loader: r.loader });
  return errs;
}
