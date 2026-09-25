/**
 * 🔴 OBSERVATION BATCHES — HOW THE ENGINE READS REAL OBSERVATIONS IT DOES NOT CONTAIN.
 *
 * Real crawl observations are a product's material, not the engine's. They live in the external data
 * repository, in one neutral batch directory per capture, and this engine reads them through the roots
 * already declared in config/subject-roots.mjs. There is no absolute path here and no product name:
 * a batch is identified by its capture id, and the root is whatever the configuration says it is.
 *
 * ── WHY EVERY ACCESSOR THROWS ──────────────────────────────────────────────
 *
 * These files used to sit inside this repository, so `existsSync(p) ? read(p) : []` was harmless —
 * the file was always there. Once the batch is external that fallback becomes the worst outcome
 * available: a caller reads zero records, reports success, and a suite goes green over nothing.
 * So the accessors here REFUSE. An absent root, an absent batch, a batch in two roots and a file
 * that fails its recorded hash each raise, naming the reason. A caller that wants to ask without
 * committing calls `batchAvailability()`, which answers UNKNOWN rather than pretending.
 *
 *   absent root / absent batch  -> UNAVAILABLE  (UNKNOWN to a caller, never an empty success)
 *   found in two roots          -> AMBIGUOUS    (never resolved by precedence)
 *   hash differs from manifest  -> INVALID      (the bytes are not the evidence they claim to be)
 *
 * ── WHAT THIS MODULE DOES NOT DO ───────────────────────────────────────────
 *
 * It does not assign a batch to a subject. A batch spans many hosts and its manifest says
 * classificationState UNASSIGNED; binding a host to a subject is Subject Binding V1's job, and until
 * it returns BOUND the material is evidence only — readable, never actionable.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { rootIndexFor } from "../tenancy/resolver.mjs";
import { lookupStore } from "../tenancy/root-registry.mjs";

/** The directory that holds every observation batch inside a root. */
export const OBSERVATIONS_DIR = "observations";

/** The capture this engine currently reads. A batch id is a date-stamped capture, never a product. */
export const BATCH_ID = "crawl-2026-09-12";

export const MANIFEST = "manifest.json";

export const BATCH_FAULTS = Object.freeze({
  UNAVAILABLE: "OBSERVATION_BATCH_UNAVAILABLE",
  AMBIGUOUS: "OBSERVATION_BATCH_AMBIGUOUS",
  INVALID: "OBSERVATION_BATCH_INVALID",
});

/** A refusal that names which of the three faults it is, so a caller can map it to UNKNOWN or INVALID. */
export class ObservationBatchFault extends Error {
  constructor(fault, detail) {
    super(`${fault}: ${detail}`);
    this.name = "ObservationBatchFault";
    this.fault = fault;
    this.detail = detail;
  }
}

const BATCH_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * 🔴 F03 · THE OBSERVATIONS STORE IS DECLARED, NOT FOUND. Its location is the OBSERVATIONS store a root registry declares
 * (src/tenancy/root-registry.mjs); the engine no longer probes every root for an `observations/` directory. A store
 * declared in two roots is AMBIGUOUS — a silent winner is how a stale copy gets read for a week — and an undeclared or
 * unreadable one is UNAVAILABLE, never "no batches". A batch is then located INSIDE that one store by its id.
 */
export function batchLocations({ batchId = BATCH_ID, env = process.env } = {}) {
  const store = lookupStore(rootIndexFor(env), "OBSERVATIONS");
  if (store.state !== "DECLARED" || typeof batchId !== "string" || !BATCH_ID_PATTERN.test(batchId)) return [];
  const dir = join(store.dir, batchId);
  return existsSync(dir) ? [{ rootId: store.rootId, dir }] : [];
}

/**
 * A non-throwing probe. This is what a caller uses when "I could not look" is a legitimate answer it
 * intends to report as UNKNOWN, rather than an error it intends to crash on. Its detail carries no filesystem path.
 */
export function batchAvailability({ batchId = BATCH_ID, env = process.env } = {}) {
  if (typeof batchId !== "string" || !BATCH_ID_PATTERN.test(batchId)) return { available: false, fault: BATCH_FAULTS.INVALID, detail: "a batch id is lowercase letters, digits and hyphens only", dir: null };
  const store = lookupStore(rootIndexFor(env), "OBSERVATIONS");
  if (store.state === "AMBIGUOUS") return { available: false, fault: BATCH_FAULTS.AMBIGUOUS, detail: `the OBSERVATIONS store is declared in more than one root registry (${store.reason})`, dir: null };
  if (store.state !== "DECLARED") return { available: false, fault: BATCH_FAULTS.UNAVAILABLE, detail: `the OBSERVATIONS store is ${store.state} (${store.reason})`, dir: null };
  const found = batchLocations({ batchId, env });
  if (found.length === 0) return { available: false, fault: BATCH_FAULTS.UNAVAILABLE, detail: `observation batch '${batchId}' is not in the declared OBSERVATIONS store`, dir: null };
  return { available: true, fault: null, detail: null, dir: found[0].dir };
}

/** The batch directory, or a refusal naming the fault. */
export function batchDir(opts = {}) {
  const a = batchAvailability(opts);
  if (!a.available) throw new ObservationBatchFault(a.fault, a.detail);
  return a.dir;
}

/** One file inside the batch. An absent file is UNAVAILABLE, never an empty read. */
export function batchFile(name, opts = {}) {
  const dir = batchDir(opts);
  const path = join(dir, name);
  if (!existsSync(path)) {
    throw new ObservationBatchFault(BATCH_FAULTS.UNAVAILABLE, `'${name}' is not in the observation batch`);
  }
  return path;
}

export function readBatchManifest(opts = {}) {
  const path = batchFile(MANIFEST, opts);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new ObservationBatchFault(BATCH_FAULTS.INVALID, `${MANIFEST} of the observation batch is not readable JSON`);
  }
}

/**
 * Every `.jsonl` record file in the batch — the external replacement for readdir() over the old
 * in-repository directory. It refuses rather than returning an empty list, because an empty list is
 * exactly the shape a caller cannot tell apart from "this capture recorded nothing".
 */
export function batchJsonlFiles(opts = {}) {
  const dir = batchDir(opts);
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort();
  if (files.length === 0) {
    throw new ObservationBatchFault(BATCH_FAULTS.UNAVAILABLE, `the observation batch holds no .jsonl record file`);
  }
  return files.map((f) => join(dir, f));
}

/**
 * 🔴 EVERY DECLARED OBSERVATION BATCH, not just the one this engine happens to name.
 *
 * `BATCH_ID` above is the capture the page adapter reads. It is not the list of what exists: two
 * batches are declared externally today, and a reader that knows only one of them silently reports a
 * population missing everything in the other. That is exactly how a source disappears from a census
 * without anything going red.
 *
 * So this enumerates the batch directories inside the ONE declared OBSERVATIONS store (F03: declared by a root registry,
 * never found by probing roots) and returns each one's record files under a CANONICAL EXTERNAL PATH —
 * `<the store's declared path>/<batchId>/<file>`, relative to the root that declares it. Relative, because an absolute path carries a drive letter and a checkout
 * location, and the same source would then be named differently on every machine and in CI.
 *
 * 🔴 IT REFUSES RATHER THAN SHORTENS. A root that cannot be read, a batch whose manifest will not
 * parse, or a batch directory found in two roots at once each raise. An empty list would be
 * indistinguishable from "nothing is declared", which is the one answer a census may not guess.
 */
export function declaredObservationBatches({ env = process.env } = {}) {
  /* 🔴 A STORE THAT IS NOT DECLARED, IS DECLARED TWICE, OR CANNOT BE READ IS A REFUSAL, NOT ZERO BATCHES. Answering [] would
   * turn a missing checkout or a missing declaration into "this estate declares no observations" — the shape a caller
   * cannot tell apart from a genuinely empty one. (A declared path that is absent is INVALID in the root registry.) */
  const store = lookupStore(rootIndexFor(env), "OBSERVATIONS");
  if (store.state === "AMBIGUOUS") throw new ObservationBatchFault(BATCH_FAULTS.AMBIGUOUS, "the OBSERVATIONS store is declared in more than one root registry, so no observation batch can be enumerated");
  if (store.state !== "DECLARED") throw new ObservationBatchFault(BATCH_FAULTS.UNAVAILABLE, `the OBSERVATIONS store is ${store.state} (${store.reason}), so no observation batch can be enumerated`);
  return readdirSync(store.dir).sort()
    .filter((batchId) => BATCH_ID_PATTERN.test(batchId) && existsSync(join(store.dir, batchId, MANIFEST)))
    .map((batchId) => ({ batchId, dir: join(store.dir, batchId), rootId: store.rootId, storePath: store.entry.path }));
}

/**
 * Every declared observation RECORD FILE, across every declared batch, named canonically.
 *
 * Returns `{ batchId, name, path, canonical }`. `canonical` is what a census should record: a path
 * that identifies the source wherever the repository is checked out.
 */
export function declaredObservationSources({ env = process.env } = {}) {
  return declaredObservationBatches({ env }).flatMap(({ batchId, dir, storePath }) => {
    const manifest = readBatchManifest({ batchId, env });
    const declared = new Set((Array.isArray(manifest?.files) ? manifest.files : []).map((f) => f.name));
    return readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
      .map((name) => {
        /* 🔴 A RECORD FILE THE MANIFEST DOES NOT DECLARE IS A FAULT, not a bonus source. The manifest
         * travelled with the bytes; a file beside it that it never mentioned is unaccounted for. */
        if (!declared.has(name)) {
          throw new ObservationBatchFault(BATCH_FAULTS.INVALID, `'${name}' is in observation batch '${batchId}' but ${MANIFEST} does not declare it`);
        }
        /* 🔴 THE DECLARED MIGRATION MAPPING, WHEN THE MANIFEST CARRIES ONE — and only then.
         *
         * A manifest may record where a file came from (`sourceFile` in `sourceRepository`). That is
         * the ONLY thing that makes an old path and this file the same source. Byte identity does not:
         * two captures of one endpoint can hash alike, and a filename or a record count says nothing
         * at all. Where no mapping is declared, `replaces` is null and a caller must treat the two as
         * separate sources rather than guessing that one supersedes the other. */
        const declaredFile = (manifest.files ?? []).find((f) => f.name === name);
        const replaces = typeof declaredFile?.sourceFile === "string" && declaredFile.sourceFile.trim() !== ""
          ? { path: declaredFile.sourceFile, repository: declaredFile.sourceRepository ?? null }
          : null;
        return { batchId, name, path: join(dir, name), canonical: `${storePath}/${batchId}/${name}`, replaces };
      });
  });
}

/**
 * 🔴 THE CENSUS POPULATION: engine-local sources PLUS declared external ones, each counted ONCE.
 *
 * Lives here, beside the enumerator, rather than inline in the runner that needs it — because the
 * rule it encodes is the one that can silently lose a source, and a rule written inside a `bin/`
 * script is a rule no test ever drives. (It was inline, and three sabotages of it stayed green.)
 *
 * The ONLY thing that removes a local path is an external manifest DECLARING that it replaced it.
 * Not a matching filename, not a neighbouring directory, not an equal record count, not an equal
 * hash. Where nothing is declared, both survive — loudly, as two sources — because this code may
 * not decide on its own that one supersedes the other.
 *
 * @param {{file: string}[]} local     engine-local sources, already named repo-relative
 * @param {{canonical: string, replaces: ?{path: string}}[]} external  declared external sources
 */
export function mergeDeclaredSources({ local, external }) {
  const superseded = new Set(external.filter((s) => s.replaces).map((s) => s.replaces.path));
  const kept = local.filter((f) => !superseded.has(f.file));
  return { kept, superseded: [...superseded].sort(), dropped: local.filter((f) => superseded.has(f.file)).map((f) => f.file) };
}

/**
 * Verify every file against the hash and size the manifest recorded. This is what makes a tampered or
 * truncated copy INVALID rather than quietly different: the manifest travelled with the bytes and was
 * written from them at the moment of the move.
 */
export function verifyBatchIntegrity(opts = {}) {
  const dir = batchDir(opts);
  const manifest = readBatchManifest(opts);
  const declared = Array.isArray(manifest?.files) ? manifest.files : null;
  if (!declared || declared.length === 0) {
    throw new ObservationBatchFault(BATCH_FAULTS.INVALID, `${MANIFEST} declares no files, so nothing can be verified`);
  }
  const checked = [];
  for (const f of declared) {
    const path = join(dir, f.name);
    if (!existsSync(path)) {
      throw new ObservationBatchFault(BATCH_FAULTS.INVALID, `${MANIFEST} declares '${f.name}', which is not in the batch`);
    }
    const bytes = readFileSync(path);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== f.bytes || sha256 !== f.sha256) {
      throw new ObservationBatchFault(
        BATCH_FAULTS.INVALID,
        `'${f.name}' does not match the manifest: recorded ${f.bytes} bytes / ${f.sha256}, found ${bytes.length} bytes / ${sha256}`,
      );
    }
    checked.push({ name: f.name, bytes: bytes.length, sha256 });
  }
  return { dir, batchId: manifest.batchId, classificationState: manifest.classificationState, checked };
}
