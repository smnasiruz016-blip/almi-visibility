/**
 * THE EVIDENCE STORE — append-only JSONL.
 *
 * ── 🔴 WHY FILES AND NOT A TABLE, IN THIS PR ────────────────────────────────
 *
 * The standing stop-condition is to stop BEFORE the first migration that creates
 * a table whose loss would cost something. A JSONL file cannot be dropped by a
 * mistyped migration, cannot drift from a schema in another environment, and is
 * reviewable in a diff.
 *
 * Postgres later is a SECOND IMPLEMENTATION BEHIND THIS SAME INTERFACE — an
 * addition, not a rewrite. That is the whole reason `append` and `readAll` are
 * the only two verbs: they are the two a table can also offer.
 *
 * ── 🔴 C2 — THERE IS NO UPDATE AND NO DELETE ────────────────────────────────
 *
 * Not "we agree not to call them". They do not exist on the object, and a test
 * asserts their absence by enumerating the interface. A correction is a NEW
 * record carrying `supersedes`, which means the history of a mistake survives
 * the fixing of it.
 *
 * This matters more than it sounds. An evidence store you can edit is a store
 * whose past can be rewritten to agree with its present, and every audit run
 * against it afterwards measures the rewrite.
 *
 * ── AND WHY `append` NEVER TRUNCATES ────────────────────────────────────────
 *
 * `appendFile`, never `writeFile`. A truncate-then-write that fails midway
 * leaves a zero-byte file where the evidence was; an append that fails midway
 * leaves the previous records intact.
 */

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** The verbs a store may expose. C2's test compares against this exact list. */
export const STORE_INTERFACE = Object.freeze([
  "append",
  "appendIfNew",
  "appendAll",
  "readAll",
  "count",
  "path",
]);

/**
 * 🔴 A RE-SIGHTING IS NOT AN OBSERVATION.
 *
 * When a second run finds byte-identical content, appending the whole payload
 * again would be a duplicate measurement — the defect this fixes. But dropping
 * the run on the floor would lose a real fact: we looked again, on this date,
 * and it had not changed. "Unchanged since" is evidence.
 *
 * So the second run appends this instead: a pointer and a date, nothing else.
 * It is a distinct `record_type` so no reader can ever mistake it for a
 * measurement or sum it into a count of observations.
 */
export const RESIGHTING_TYPE = "resighting";

export function createJsonlStore(filePath) {
  if (typeof filePath !== "string" || filePath === "") throw new TypeError("createJsonlStore: a path is required");

  function ensureDir() {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  function append(record) {
    if (!record || typeof record !== "object") throw new TypeError("append: a record object is required");
    if (typeof record.record_type !== "string") {
      throw new TypeError("append: every record must carry a record_type");
    }
    ensureDir();
    // 🔴 One record, one line, newline-terminated. A pretty-printed record would
    // make the file unparseable line-by-line and a partial write unrecoverable.
    const line = JSON.stringify(record);
    if (line.includes("\n")) throw new Error("append: a serialised record must not contain a newline");
    appendFileSync(filePath, line + "\n", "utf8");
    return record;
  }

  function appendAll(records) {
    for (const r of records) append(r);
    return records.length;
  }

  /**
   * Append a measurement ONLY if its `measurement_key` is new.
   *
   * ── THE DEFECT THIS FIXES ───────────────────────────────────────────────
   *
   * `observation_id` includes `observed_at`, so re-running the ingest produced
   * a different id for the same measurement and the store filled with
   * duplicates. Every count over it was then wrong, and nothing said so.
   *
   * ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────
   *
   * 🔴 It does not overwrite, and it does not skip silently. On a repeat it
   * appends a RE-SIGHTING — a pointer to the original id plus the date we
   * looked. Append-only is intact, the fact that we re-checked is recorded,
   * and the payload is not duplicated.
   *
   * Returns `{ appended, observation_id, resighting }` so a caller can report
   * honestly instead of assuming its write landed.
   */
  function appendIfNew(record, { seenAt = new Date().toISOString() } = {}) {
    if (!record || typeof record.measurement_key !== "string" || record.measurement_key === "") {
      throw new TypeError(
        "appendIfNew: the record carries no measurement_key. Only a measurement can be deduplicated — " +
          "use append() for anything else.",
      );
    }
    const existing = readAll().find(
      (r) => r.record_type === record.record_type && r.measurement_key === record.measurement_key,
    );
    if (!existing) {
      append(record);
      return { appended: true, observation_id: record.observation_id, resighting: false };
    }
    append({
      record_type: RESIGHTING_TYPE,
      // 🔴 The EXISTING id, not the incoming one. A re-sighting points at the
      // measurement it confirms; minting a new id here would recreate the very
      // duplicate this function exists to prevent.
      observation_id: existing.observation_id,
      measurement_key: existing.measurement_key,
      seen_at: seenAt,
    });
    return { appended: false, observation_id: existing.observation_id, resighting: true };
  }

  function readAll() {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, "utf8")
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l, i) => {
        try {
          return JSON.parse(l);
        } catch (err) {
          // 🔴 Names the LINE. A corrupt evidence file that reports only "bad
          // JSON" is a file nobody can repair without re-running the ingest.
          throw new Error(`evidence store ${filePath}: line ${i + 1} is not valid JSON`);
        }
      });
  }

  const count = () => readAll().length;

  // 🔴 Frozen so a caller cannot bolt an `update` onto the instance at runtime
  // and defeat C2 from the outside.
  return Object.freeze({ append, appendIfNew, appendAll, readAll, count, path: filePath });
}
