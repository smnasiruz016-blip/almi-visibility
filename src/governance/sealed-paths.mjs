/**
 * 🔴 SEALED PATHS ARE REFUSED BEFORE THEY ARE READ (22 September 2026).
 *
 * A sealed artefact is readable only by its own sealed evaluation. Every ORDINARY reader — the governance loaders, the
 * held-out firewall's enumerator, the authority-corpus migration — goes through `readUnsealed`, which checks the path
 * against the registry's SEALED prefixes and throws BEFORE any file-system call: the refusal never depends on the file
 * existing, and it never touches the bytes. Generic: the sealed prefixes come from the registry, not from this file.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export class SealedPathRefused extends Error {
  constructor(path, entry) {
    super(`SEALED_PATH_REFUSED: ${path} lies under sealed material (${entry}) and may not be read by an ordinary loader`);
    this.code = "SEALED_PATH_REFUSED";
    this.path = path;
    this.entry = entry;
  }
}

const norm = (p) => String(p).replace(/\\/g, "/").replace(/^\.\//, "");

/** The sealed registry entry covering a repository-relative path in a root, or null. Prefix equality, never similarity. */
export function sealedEntryFor(registry, root, path) {
  const p = norm(path);
  return (registry || []).find((e) => e.role === "SEALED" && e.resource?.root === root && (e.resource.pathPrefixes || []).some((pre) => p === pre.replace(/\/$/, "") || p.startsWith(pre))) ?? null;
}
export const isSealed = (registry, root, path) => sealedEntryFor(registry, root, path) !== null;

/** Read a repository-relative file for an ORDINARY reader — refused, unread, when the path is sealed. */
export function readUnsealed({ registry, root, base, path, encoding = "utf8", read = readFileSync }) {
  const sealed = sealedEntryFor(registry, root, path);
  if (sealed) throw new SealedPathRefused(norm(path), sealed.id);
  return read(join(base, path), encoding);
}
