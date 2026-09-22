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
 *   PATH         audit-trail/events.jsonl, with audit-trail/head.json beside it.
 *
 *   🔴 AND NOT UNDER runs/, FOR A MEASURED REASON. The first version put it at runs/audit-trail/events.jsonl, and
 *   the suite refused it: Row 60's ruling sheet enumerates EVERY .jsonl under runs/ as part of the issue and
 *   evidence corpus, so the audit trail became an input to another feature's derived artefact — and every future
 *   audit event would have left that artefact stale. This project has been burned by exactly that coupling four
 *   times. The trail is a governance-integrity record, not an audit FINDING, and it now lives in its own top-level
 *   directory where nobody else's generator reads it. `.gitattributes` declares `audit-trail/** -text` for the same
 *   reason runs/ carries it: the committed bytes must survive a checkout or the stored hashes stop matching.
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
 * hashes of its inputs. THIS FEATURE COMMITS NONE, deliberately: the §13 censuses (tools/audit-trail-census.mjs) and
 * the reader (bin/audit-trail.mjs read | verify) print to stdout and write nothing, so there is no artefact that can
 * go stale behind the store. A ledger change has invalidated artefacts built from it four times in this project; the
 * cheapest way not to be the fifth is to build none.
 */
export const AUDIT_STORE = Object.freeze({
  repository: "engine",
  eventsPath: "audit-trail/events.jsonl",
  headPath: "audit-trail/head.json",
  format: "JSONL/UTF-8/LF, one canonical event per line",
  sizeCeilingBytes: 8 * 1024 * 1024,
  retention: "append-only; never pruned; bounded by what is admitted, not by what is deleted",
  derivedArtefacts: Object.freeze([]),
  derivedArtefactRule: "regenerable from the store alone, and it records the sha256 of every input it was built from",
});

/** The path segments a neutrality census may read. Kept as data so the check reads the same value the store uses. */
export const AUDIT_STORE_PATH_SEGMENTS = Object.freeze(["audit-trail", "events.jsonl", "head.json"]);
