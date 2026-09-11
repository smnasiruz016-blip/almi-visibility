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
export const STORE_INTERFACE = Object.freeze(["append", "appendAll", "readAll", "count", "path"]);

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
  return Object.freeze({ append, appendAll, readAll, count, path: filePath });
}
