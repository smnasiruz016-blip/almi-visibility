/**
 * 🔴 F08 · WHERE THE AUDIT TRAIL LIVES — DECLARED BEFORE THE SCHEMA WAS WRITTEN (§7, 22 September 2026).
 *
 * Not `config/audit-trail.mjs`: that file is Row 60's register of WITHDRAWN AUDIT ISSUE CLASSES and has nothing to do
 * with this feature. The names sit one letter apart, so the difference is written down here rather than left to be
 * rediscovered.
 *
 *   REPOSITORY   the ENGINE. What is recorded are the engine's own governed decisions — authority resolutions and
 *                migrations, F-board transitions, evidence-role decisions, write-gate decisions and explicit
 *                refusals. None of that is a tenant's data, so none of it belongs in the tenant-data repository; and
 *                an integrity record kept behind a tenant boundary would be readable only by the boundary it exists
 *                to police. NO DATA-REPOSITORY PR IS REQUIRED BY THIS FEATURE, and none is opened.
 *   PATH         runs/audit-trail/events.jsonl, with runs/audit-trail/head.json beside it.
 *   NEUTRALITY   every segment — runs · audit-trail · events · head — is a generic word. No client, product, host,
 *                regulator or subject name appears in the path or in the format. P34 checks it; it is not asserted.
 *   FORMAT       JSON Lines, UTF-8, LF. `.gitattributes` declares `runs/** -text`, so committed bytes survive a
 *                checkout unchanged on any platform and the stored hashes keep matching.
 *   ATOMICITY    one validated, fully-serialised line per append call (src/audit-trail/store.mjs).
 *   RETENTION    append-only, never pruned. Bounded by ADMISSION, not by deletion: only governed decisions enter, and
 *                read-only diagnostics are excluded by the declared inclusion rule. SIZE_CEILING_BYTES is reported
 *                against on every run, so growth is a number somebody sees rather than a surprise.
 *
 * 🔴 DERIVED ARTEFACTS. Anything built FROM this store must be regenerable from the store alone and must record the
 * hashes of its inputs. `runs/audit-trail/census-*.txt` is the only derived artefact this feature commits, and it
 * carries the store's sha256, the head hash and the event count at the top. A derived artefact without its input
 * hashes is not committed.
 */
export const AUDIT_STORE = Object.freeze({
  repository: "engine",
  eventsPath: "runs/audit-trail/events.jsonl",
  headPath: "runs/audit-trail/head.json",
  format: "JSONL/UTF-8/LF, one canonical event per line",
  sizeCeilingBytes: 8 * 1024 * 1024,
  retention: "append-only; never pruned; bounded by what is admitted, not by what is deleted",
  derivedArtefacts: Object.freeze(["runs/audit-trail/census-<date>.txt"]),
  derivedArtefactRule: "regenerable from the store alone, and it records the sha256 of every input it was built from",
});

/** The path segments a neutrality census may read. Kept as data so the check reads the same value the store uses. */
export const AUDIT_STORE_PATH_SEGMENTS = Object.freeze(["runs", "audit-trail", "events.jsonl", "head.json"]);
