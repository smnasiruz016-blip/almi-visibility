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
import { requireGuardSink } from "./guard-audit.mjs";

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

/**
 * Read a repository-relative file for an ORDINARY reader — refused, unread, when the path is sealed.
 *
 * 🔴 F08 §6.1 — THE REFUSAL IS AUDITED HERE, ONCE, AS IT IS MADE. `audit` is required and checked BEFORE anything
 * else (guard-audit.mjs): without it nothing is decided and nothing is read. A refusal emits exactly one metadata-only
 * event — the entry that sealed it and the root, never the path — and only then throws; the sealed resource is never
 * opened, whether or not the emission succeeds (if it fails, its error is thrown instead, still unread). A permitted
 * read emits nothing and behaves exactly as before.
 */
export function readUnsealed({ registry, root, base, path, encoding = "utf8", read = readFileSync, audit }) {
  requireGuardSink(audit, "readUnsealed");
  const sealed = sealedEntryFor(registry, root, path);
  if (sealed) {
    audit.emit({
      eventType: "REFUSAL", action: "READ_SEALED_PATH", outcome: "REFUSED", reasonCode: "SEALED_PATH_REFUSED",
      metadata: { guard: "readUnsealed", classification: "SEALED", ruleEntry: String(sealed.id), root: String(root) },
    });
    throw new SealedPathRefused(norm(path), sealed.id);
  }
  return read(join(base, path), encoding);
}
