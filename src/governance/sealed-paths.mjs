/**
 * 🔴 SEALED PATHS ARE REFUSED BEFORE THEY ARE READ (22 September 2026; hardened for F07, 23 September 2026).
 *
 * A sealed artefact is readable only by its own sealed evaluation. Every ORDINARY reader — the governance loaders, the
 * held-out firewall's enumerator, the authority-corpus migration — goes through `readUnsealed`, which CLASSIFIES the
 * target and refuses a sealed one BEFORE it is opened: the refusal never depends on the file's content, and the sealed
 * bytes are never touched. Generic: the sealed prefixes come from the registry, not from this file.
 *
 * ── F07 §5.1 · WHY A PREFIX MATCH ON THE PATH AS GIVEN WAS NOT ENOUGH (measured 23 September, synthetic files only) ──
 *
 * On the owner's host (win32, NTFS) each of these reached a synthetic sealed file through a path the old prefix match
 * did not recognise: a letter-case variant · a doubled separator · a `..` traversal · a JUNCTION · a file SYMLINK · an
 * NTFS 8.3 SHORT NAME (e.g. `SEALED~1`) · an alternate-data-stream suffix (`::$DATA`). A trailing dot or space did not
 * (ENOENT). And `realpathSync` (the JS implementation) does NOT expand an 8.3 name — only `realpathSync.native` does.
 *
 * So a target is classified TWICE, and refused if EITHER reading is sealed:
 *   1 · LEXICALLY, with no filesystem call at all — separators unified, `.`/`..` collapsed, trailing dots and spaces
 *       stripped from each segment, compared case-insensitively (stricter, never laxer, on a case-sensitive system);
 *   2 · REALLY, when the base is a real directory — `realpathSync.native` of the nearest EXISTING ancestor (which
 *       resolves symlinks, junctions, 8.3 names and case), plus the not-yet-existing tail. This touches directory
 *       METADATA only; the target is never opened.
 * A stream or control-character form is refused outright, and so is anything that cannot be resolved: FAIL CLOSED.
 *
 * 🔴 UNAVAILABLE METADATA FAILS CLOSED. A missing or empty registry, or a SEALED entry without usable prefixes, used to
 * read as "nothing is sealed" — which PERMITTED the read. It is now a typed refusal, SEAL_METADATA_UNAVAILABLE.
 *
 * 🔴 NO PATH IN ANY MESSAGE. An exception names the refusal code and the registry entry, never the path: exception text
 * is one of the places held-out material must not travel.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, posix, relative, resolve } from "node:path";
import { requireGuardSink } from "./guard-audit.mjs";

export const SEAL_REFUSALS = Object.freeze(["SEALED_PATH_REFUSED", "SEAL_METADATA_UNAVAILABLE", "SEAL_PATH_UNRESOLVABLE"]);

export class SealedPathRefused extends Error {
  constructor(code, entry) {
    super(`${code}: the requested path is refused before it is read${entry ? ` (${entry})` : ""} — an ordinary loader may not read sealed material`);
    this.name = "SealedPathRefused";
    this.code = code;
    this.entry = entry ?? null;
  }
}

/** The sealed prefixes a registry declares for a root. Throws the typed refusal when they cannot be read. */
function sealedPrefixes(registry, root) {
  if (!Array.isArray(registry) || registry.length === 0) return { unavailable: "no evidence-role registry was supplied" };
  const out = [];
  for (const e of registry) {
    /* Role SEALED, and ANY entry declared sealed that names paths (a held-out evaluation store, a marking key): an
     * ordinary loader refuses all of them. An entry with no paths (a derived population) has nothing to refuse. */
    if (!(e?.role === "SEALED" || (e?.sealed === true && e?.resource?.pathPrefixes))) continue;
    const pre = e.resource?.pathPrefixes;
    if (typeof e.resource?.root !== "string" || !Array.isArray(pre) || pre.length === 0 || pre.some((p) => typeof p !== "string" || p.trim() === "")) {
      return { unavailable: `sealed entry ${String(e.id ?? "?")} declares no usable root and path prefixes` };
    }
    if (e.resource.root !== root) continue;
    for (const p of pre) out.push({ entry: e, prefix: canonical(p).replace(/\/?$/, "/") });
  }
  return { prefixes: out };
}

/** Separators unified, `.`/`..` collapsed, trailing dots/spaces stripped per segment, lower-cased. No filesystem call. */
function canonical(p) {
  const segs = posix.normalize(String(p).replace(/\\/g, "/")).split("/")
    .map((s) => (s === "." || s === ".." ? s : s.replace(/[. ]+$/, "")));
  return posix.normalize(segs.join("/")).replace(/^\.\//, "").replace(/\/+$/, "").toLowerCase();
}

/** A form that must never reach classification: a stream suffix, a control character, or a drive-relative oddity. */
const UNRESOLVABLE = (p) => /[\u0000-\u001f]/.test(p) || /:/.test(String(p).replace(/^[A-Za-z]:[\\/]/, ""));

const matchPrefix = (prefixes, rel) => prefixes.find(({ prefix }) => rel === prefix.slice(0, -1) || rel.startsWith(prefix))?.entry ?? null;

/**
 * THE CLASSIFICATION. Never throws and never opens the target. Returns
 *   { refuse: false }                                   an ordinary path
 *   { refuse: true, code, entryId, classification }     one of SEAL_REFUSALS
 * `base` is the directory repository-relative paths are resolved against; "" means a VIRTUAL read (bytes supplied by
 * the caller's own reader, not a filesystem path), which is classified lexically only because nothing can be resolved.
 */
export function classifySealed({ registry, root, base = "", path, realpath = realpathSync.native }) {
  const got = sealedPrefixes(registry, root);
  if (got.unavailable) return { refuse: true, code: "SEAL_METADATA_UNAVAILABLE", entryId: null, classification: "SEAL_METADATA_UNAVAILABLE" };
  if (typeof path !== "string" || path === "" || UNRESOLVABLE(path)) return { refuse: true, code: "SEAL_PATH_UNRESOLVABLE", entryId: null, classification: "UNRESOLVABLE_PATH_FORM" };
  const { prefixes } = got;
  const baseAbs = base ? resolve(base) : null;

  // 1 · LEXICAL — relative to the base when the path is absolute, and never with a filesystem call.
  const lexical = isAbsolute(path) && baseAbs ? canonical(relative(baseAbs, path)) : canonical(path);
  const lex = matchPrefix(prefixes, lexical);
  if (lex) return { refuse: true, code: "SEALED_PATH_REFUSED", entryId: String(lex.id), classification: "SEALED" };

  // 2 · REAL — only when there is a real directory to resolve against.
  if (!baseAbs || !existsSync(baseAbs)) return { refuse: false };
  let realRel;
  try {
    const target = resolve(baseAbs, path);
    let anc = target;
    const tail = [];
    for (let i = 0; i < 256 && !existsSync(anc); i += 1) { tail.unshift(basename(anc)); anc = dirname(anc); }
    const realAnc = realpath(anc);
    realRel = canonical(relative(realpath(baseAbs), join(realAnc, ...tail)));
  } catch {
    /* Metadata that cannot be resolved is not permission. */
    return { refuse: true, code: "SEAL_PATH_UNRESOLVABLE", entryId: null, classification: "UNRESOLVABLE_PATH_FORM" };
  }
  const real = matchPrefix(prefixes, realRel);
  if (real) return { refuse: true, code: "SEALED_PATH_REFUSED", entryId: String(real.id), classification: "SEALED" };
  return { refuse: false };
}

/**
 * The sealed registry entry covering a repository-relative path in a root, or null — LEXICAL classification only (the
 * enumerators that use it hold tracked-file NAMES, not filesystem paths). 🔴 Unavailable metadata THROWS: an enumerator
 * must not read "no registry" as "nothing is sealed".
 */
export function sealedEntryFor(registry, root, path) {
  const got = sealedPrefixes(registry, root);
  if (got.unavailable) throw new SealedPathRefused("SEAL_METADATA_UNAVAILABLE", null);
  return matchPrefix(got.prefixes, canonical(path));
}
export const isSealed = (registry, root, path) => sealedEntryFor(registry, root, path) !== null;

/**
 * Read a repository-relative file for an ORDINARY reader — refused, unread, when the path is sealed.
 *
 * 🔴 F08 §6.1 — THE REFUSAL IS AUDITED HERE, ONCE, AS IT IS MADE. `audit` is required and checked BEFORE anything
 * else (guard-audit.mjs): without it nothing is decided and nothing is read. Every refusal — sealed, metadata
 * unavailable, unresolvable — emits exactly one metadata-only event (the refusal code, the classification, the entry
 * that sealed it and the root; never the path) and only then throws. The target is never opened, whether or not the
 * emission succeeds. A permitted read emits nothing and behaves exactly as before.
 */
export function readUnsealed({ registry, root, base, path, encoding = "utf8", read = readFileSync, audit, realpath }) {
  requireGuardSink(audit, "readUnsealed");
  const verdict = classifySealed({ registry, root, base, path, ...(realpath ? { realpath } : {}) });
  if (verdict.refuse) {
    audit.emit({
      eventType: "REFUSAL", action: "READ_SEALED_PATH", outcome: "REFUSED", reasonCode: verdict.code,
      metadata: { guard: "readUnsealed", classification: verdict.classification, ruleEntry: verdict.entryId ?? "NONE", root: String(root) },
    });
    throw new SealedPathRefused(verdict.code, verdict.entryId);
  }
  return read(join(base, path), encoding);
}

