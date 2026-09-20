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

import { subjectRoots } from "../subject-roots.mjs";

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

const externalRoots = (env) => subjectRoots(env).filter((r) => r.kind === "external");

/**
 * Every root that actually holds this batch. Zero is not an error here — the callers below decide
 * whether to refuse or to report UNKNOWN — but two always is, because a silent winner is how a stale
 * copy gets read for a week.
 */
export function batchLocations({ batchId = BATCH_ID, env = process.env } = {}) {
  return externalRoots(env)
    .map((r) => ({ root: r, dir: join(r.path, OBSERVATIONS_DIR, batchId) }))
    .filter((c) => existsSync(c.dir));
}

/**
 * A non-throwing probe. This is what a caller uses when "I could not look" is a legitimate answer it
 * intends to report as UNKNOWN, rather than an error it intends to crash on.
 */
export function batchAvailability({ batchId = BATCH_ID, env = process.env } = {}) {
  const roots = externalRoots(env);
  if (roots.length === 0) {
    return { available: false, fault: BATCH_FAULTS.UNAVAILABLE, detail: "no external subject root is declared", dir: null };
  }
  const found = batchLocations({ batchId, env });
  if (found.length === 0) {
    return {
      available: false,
      fault: BATCH_FAULTS.UNAVAILABLE,
      detail: `observation batch '${batchId}' is in none of the declared external roots: ${roots.map((r) => r.path).join(", ")}`,
      dir: null,
    };
  }
  if (found.length > 1) {
    return {
      available: false,
      fault: BATCH_FAULTS.AMBIGUOUS,
      detail: `observation batch '${batchId}' is in ${found.length} roots at once: ${found.map((f) => f.dir).join(" and ")}`,
      dir: null,
    };
  }
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
    throw new ObservationBatchFault(BATCH_FAULTS.UNAVAILABLE, `'${name}' is not in the observation batch at ${dir}`);
  }
  return path;
}

export function readBatchManifest(opts = {}) {
  const path = batchFile(MANIFEST, opts);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new ObservationBatchFault(BATCH_FAULTS.INVALID, `${MANIFEST} at ${path} is not readable JSON: ${e.message}`);
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
    throw new ObservationBatchFault(BATCH_FAULTS.UNAVAILABLE, `the observation batch at ${dir} holds no .jsonl record file`);
  }
  return files.map((f) => join(dir, f));
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
    throw new ObservationBatchFault(BATCH_FAULTS.INVALID, `${MANIFEST} at ${dir} declares no files, so nothing can be verified`);
  }
  const checked = [];
  for (const f of declared) {
    const path = join(dir, f.name);
    if (!existsSync(path)) {
      throw new ObservationBatchFault(BATCH_FAULTS.INVALID, `${MANIFEST} declares '${f.name}', which is not in the batch at ${dir}`);
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
