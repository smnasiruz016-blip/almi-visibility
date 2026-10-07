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
 * addition, not a rewrite. That is the whole reason appending and `readAll` are
 * the only verbs: they are the ones a table can also offer.
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
 * ── 🔴 AND THE UNSAFE VERB SAYS SO IN ITS NAME (13 September 2026) ──────────
 *
 * The plain `append` / `appendAll` were renamed `appendWithoutDedupe` /
 * `appendAllWithoutDedupe`. Every audit writer that duplicated a record did it
 * through a verb whose name sounded like the normal way to write. A census can
 * miss a caller — a store passed in from another module was a declared blind
 * spot — but a name cannot be missed in a diff: whoever types
 * `appendWithoutDedupe` is told, by the word, what they are choosing.
 *
 * ── AND WHY APPENDING NEVER TRUNCATES ───────────────────────────────────────
 *
 * `appendFile`, never `writeFile`. A truncate-then-write that fails midway
 * leaves a zero-byte file where the evidence was; an append that fails midway
 * leaves the previous records intact.
 */

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { markReadFrom } from "./provenance.mjs";

/**
 * The verbs a store may expose. C2's test compares against this exact list.
 *
 * 🔴 `dedupeKeyOf` ADDED 23 September 2026, and deliberately, because this list is a pin and moving it silently is
 * the failure it exists to prevent. It is a PURE READ — it derives a record's identity and mutates nothing — and
 * it is exposed so the governed-write boundary can ask THIS store what makes two records the same thing instead of
 * carrying its own copy of the rule. C2's property is untouched: there is still no update, delete, remove, set,
 * patch, put, truncate, clear or drop, and the instance is still frozen.
 */
export const STORE_INTERFACE = Object.freeze([
  "appendWithoutDedupe",
  "appendIfNew",
  "appendAllWithoutDedupe",
  "readAll",
  "count",
  "dedupeKeyOf",
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

/**
 * 🔴 GAP 2 — THE SAME INTERFACE, WRITING NOTHING.
 *
 * The write law's default is DRY RUN: with no flags a writer reports what it WOULD write and
 * writes nothing. Four bins could obey that by putting each write site behind `permission.mayWrite`.
 * Two cannot: they hand a store to a module (`runRobotsAndDnsAudit`, `runIngest`) and the write
 * happens in there. Teaching the store about permissions would put the decision inside the thing
 * being governed — so instead the CALLER chooses which store it hands over, and an unauthorised run
 * hands over this one.
 *
 * This is not a new mechanism. The header above already says the store's verbs are the ones a second
 * implementation can also offer; this is that second implementation, and `STORE_INTERFACE` is the
 * list it has to satisfy — the same list `test/store-recovery.test.mjs` enumerates.
 *
 * 🔴 IT RETURNS WHAT THE REAL STORE RETURNS. `runIngest` and `runRobotsAndDnsAudit` count appended
 * against resighted from the return value, so a shim that returned nothing would silently make every
 * dry run report zero writes — a lie in the safe-looking direction. Every record it is handed is
 * kept in memory and counted, so the caller can print exactly what the run would have stored.
 */
export function createDryRunStore(filePath, { mode = "FRESH" } = {}) {
  if (typeof filePath !== "string" || filePath === "") throw new TypeError("createDryRunStore: a path is required");
  if (mode !== "FRESH" && mode !== "RETRY") throw new TypeError(`createDryRunStore: mode is FRESH or RETRY, not ${mode}`);
  const existing = existsSync(filePath) ? createJsonlStore(filePath).readAll() : [];
  const wouldWrite = [];
  /* 🔴 F77 R2 (RR-82 §2.1) — a FRESH collection RECORDS A NEW SIGHTING: a record that already exists is handed to the commit so the
   * real store appends its re-sighting (measured 28 Sep: since this collector was introduced, a re-sighting was counted and never
   * saved). A RETRY of the same operation saves nothing twice: a record this operation already saved — the same observation id, or
   * a re-sighting at the same instant — is recognised and left out. */
  const resighted = [];
  const savedObservationIds = new Set(existing.filter((r) => r?.record_type !== RESIGHTING_TYPE && typeof r?.observation_id === "string").map((r) => r.observation_id));
  const savedResightings = new Set(existing.filter((r) => r?.record_type === RESIGHTING_TYPE).map((r) => `${r.measurement_key}|${r.seen_at}`));
  const keyOf = (r) => {
    if (typeof r?.measurement_key === "string" && r.measurement_key !== "") return r.measurement_key;
    if (r?.record_type === "issue" && typeof r.issue_id === "string" && r.issue_id !== "") return `issue:${r.issue_id}`;
    return null;
  };
  const indexKey = (r) => `${r.record_type}|${keyOf(r)}`;
  const seen = new Set(existing.filter((r) => keyOf(r) !== null).map(indexKey));

  function appendWithoutDedupe(record) {
    if (!record || typeof record !== "object") throw new TypeError("appendWithoutDedupe: a record object is required");
    if (typeof record.record_type !== "string") throw new TypeError("appendWithoutDedupe: every record must carry a record_type");
    wouldWrite.push(record);
    return record;
  }
  function appendIfNew(record, { seenAt = new Date().toISOString() } = {}) {
    if (!record || keyOf(record) === null) {
      throw new TypeError(
        "appendIfNew: the record carries no measurement_key and is not an issue with an issue_id. Only a measurement " +
          "or a content-identified issue can be deduplicated — use appendWithoutDedupe() for anything else, and declare why.",
      );
    }
    if (mode === "RETRY" && ((typeof record.observation_id === "string" && savedObservationIds.has(record.observation_id)) || savedResightings.has(`${keyOf(record)}|${seenAt}`))) {
      return { appended: false, observation_id: record.observation_id, issue_id: record.issue_id, resighting: false, alreadySaved: true };
    }
    const k = indexKey(record);
    if (seen.has(k)) {
      resighted.push(record);
      return { appended: false, observation_id: record.observation_id, issue_id: record.issue_id, resighting: true };
    }
    seen.add(k);
    wouldWrite.push(record);
    return { appended: true, observation_id: record.observation_id, issue_id: record.issue_id, resighting: false, seenAt };
  }
  /** What the governed commit hands the real store's appendIfNew: the new records AND the re-sighted ones (the store appends a
   * re-sighting for each of those). `wouldWrite` stays the new records only, for the dry-run report. */
  const commitInput = () => [...wouldWrite, ...resighted];
  const appendAllWithoutDedupe = (records) => {
    for (const r of records) appendWithoutDedupe(r);
    return records.length;
  };
  // 🔴 readAll returns what the file HOLDS. A dry run reads real evidence; it simply adds none.
  const readAll = () => [...existing];
  const count = () => existing.length;

  return Object.freeze({
    appendWithoutDedupe,
    appendIfNew,
    appendAllWithoutDedupe,
    readAll,
    count,
    path: filePath,
    /** 🔴 NOT part of STORE_INTERFACE — the dry run's own report, so a caller can print what it would have stored. */
    wouldWrite: () => [...wouldWrite],
    /** 🔴 NOT part of STORE_INTERFACE — what the governed commit hands the real store (F77 R2). */
    commitInput,
    mode,
  });
}

export function createJsonlStore(filePath) {
  if (typeof filePath !== "string" || filePath === "") throw new TypeError("createJsonlStore: a path is required");

  function ensureDir() {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  /**
   * 🔴 THE DEDUPE KEY. An observation's `measurement_key` (content, no clock).
   * An ISSUE's `issue_id` — already content-derived (C4), with no clock in it —
   * so the same finding written by the same job twice is ONE record.
   *
   * Added 12 September 2026, when the technical audit writer was found to have
   * stored 868 issues twice: the ingest had this discipline since PR #36, the
   * audit writers never did.
   */
  function dedupeKeyOf(r) {
    if (typeof r?.measurement_key === "string" && r.measurement_key !== "") return r.measurement_key;
    if (r?.record_type === "issue" && typeof r.issue_id === "string" && r.issue_id !== "") return `issue:${r.issue_id}`;
    return null;
  }

  /* 🔴 LOADED ONCE PER STORE INSTANCE, UPDATED ON EVERY APPEND. The first
   * appendIfNew re-read the whole file per call; an audit appending a thousand
   * findings into a two-thousand-record file would parse it a thousand times. */
  let index = null;
  const indexKey = (r) => `${r.record_type}|${dedupeKeyOf(r)}`;
  function ensureIndex() {
    if (index) return index;
    index = new Map();
    for (const r of readAll()) if (dedupeKeyOf(r) !== null && !index.has(indexKey(r))) index.set(indexKey(r), r);
    return index;
  }

  /**
   * Append ONE record with NO duplicate check. The name is the warning.
   *
   * Lawful for records that are unique by construction (a run record whose id
   * carries its start time, a supersession note written once per copy) — and
   * every such caller is declared, with a checked reason, in the censuses.
   */
  function appendWithoutDedupe(record) {
    if (!record || typeof record !== "object") throw new TypeError("appendWithoutDedupe: a record object is required");
    if (typeof record.record_type !== "string") {
      throw new TypeError("appendWithoutDedupe: every record must carry a record_type");
    }
    ensureDir();
    // 🔴 One record, one line, newline-terminated. A pretty-printed record would
    // make the file unparseable line-by-line and a partial write unrecoverable.
    const line = JSON.stringify(record);
    if (line.includes("\n")) throw new Error("appendWithoutDedupe: a serialised record must not contain a newline");
    appendFileSync(filePath, line + "\n", "utf8");
    if (index && dedupeKeyOf(record) !== null && !index.has(indexKey(record))) index.set(indexKey(record), record);
    return record;
  }

  function appendAllWithoutDedupe(records) {
    for (const r of records) appendWithoutDedupe(r);
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
    if (!record || dedupeKeyOf(record) === null) {
      throw new TypeError(
        "appendIfNew: the record carries no measurement_key and is not an issue with an issue_id. Only a measurement " +
          "or a content-identified issue can be deduplicated — use appendWithoutDedupe() for anything else, and declare why.",
      );
    }
    const existing = ensureIndex().get(indexKey(record));
    if (!existing) {
      appendWithoutDedupe(record);
      return { appended: true, observation_id: record.observation_id, issue_id: record.issue_id, resighting: false };
    }
    appendWithoutDedupe({
      record_type: RESIGHTING_TYPE,
      // 🔴 The EXISTING id, not the incoming one. A re-sighting points at the
      // record it confirms; minting a new id here would recreate the very
      // duplicate this function exists to prevent.
      ...(existing.observation_id ? { observation_id: existing.observation_id } : {}),
      ...(existing.record_type === "issue" ? { issue_id: existing.issue_id } : {}),
      measurement_key: dedupeKeyOf(existing),
      seen_at: seenAt,
    });
    return { appended: false, observation_id: existing.observation_id, issue_id: existing.issue_id, resighting: true };
  }

  function readAll() {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, "utf8")
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l, i) => {
        try {
          /* RR-196: each record remembers the store it was read from (src/evidence/provenance.mjs) — a fact about the object */
          return markReadFrom(JSON.parse(l), filePath);
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
  /* `dedupeKeyOf` is exposed so the governed-write boundary can ask THIS store what identifies a record, rather
   * than carrying its own copy of the rule. A copy is a second rule, and two rules drift. */
  return Object.freeze({ appendWithoutDedupe, appendIfNew, appendAllWithoutDedupe, readAll, count, dedupeKeyOf, path: filePath });
}
