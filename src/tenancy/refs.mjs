/**
 * Declared references for resources whose identity is a LOCATION — kept in the tenancy package so the scope decision can
 * name them without importing the subjects, facts or detectors that use them (F02, 24 Sep 2026: importing it from the
 * external-subject adapter dragged those modules into every gated entry point's module graph).
 */
import { relative, sep } from "node:path";

/**
 * The declared reference for a subject's fact registry: its directory RELATIVE TO the external root
 * that resolves it. 🔴 A relative reference, not an absolute path — an absolute one carries a drive
 * letter and a checkout location, so the same registry would need a different declaration on every
 * machine and CI would resolve nothing.
 *
 * 🔴 AND IT IS A LOOKUP KEY, NOT A DERIVATION. The scope is whatever the declaration says it is;
 * this function only says WHICH declaration to read. Nothing about the path contributes to the
 * identifier, which is why the identifier is opaque and assigned once elsewhere.
 */
export function factRegistryRef({ factsDir, rootPath }) {
  if (typeof factsDir !== "string" || factsDir === "" || typeof rootPath !== "string" || rootPath === "") return null;
  const rel = relative(rootPath, factsDir);
  if (rel === "" || rel.startsWith("..")) return null;
  return { resourceKind: "FACT_REGISTRY", resourceRef: rel.split(sep).join("/") };
}
