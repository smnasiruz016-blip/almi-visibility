/**
 * 🔴 THE TWO DURABILITY PROFILES. Each promises exactly what its target's primitive can deliver — no more.
 *
 * The boundary in `governed-write.mjs` owns validation, gating, auditing and the saga. These adapters own the
 * bytes. They are deliberately the only place a governed mutation touches the filesystem, so a change to how
 * durability works is one file, not forty.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";

/** The repository's content-hash rule for TEXT: sha256 over UTF-8 with CRLF normalised, so a checkout style
 * never moves it. */
export const contentHash = (bytes) =>
  createHash("sha256").update(Buffer.from(Buffer.from(bytes).toString("utf8").replace(/\r\n/g, "\n"), "utf8")).digest("hex");

/** Raw bytes, hashed as they are. */
export const byteHash = (bytes) => createHash("sha256").update(Buffer.from(bytes)).digest("hex");

/**
 * 🔴 BINARY CONTENT IS NEVER NORMALISED. The text rule decodes to UTF-8 and collapses CRLF, which is right for a
 * generated document and WRONG for a compressed archive: a brotli payload really does contain 0x0D 0x0A pairs that
 * mean nothing of the sort, and normalising them silently changes the hash of bytes that never changed. Two of the
 * governed callers write brotli buffers, so the rule is chosen by what the caller actually supplies.
 */
export const hashRuleFor = (bytes) => (Buffer.isBuffer(bytes) ? byteHash : contentHash);

/**
 * 🔴 THE APPEND DISCIPLINES, BY NAME — SO A ROUTED CALLER HOLDS NO WRITE-SHAPED TEXT AT ALL.
 *
 * Which discipline a caller uses is part of that caller's meaning, so the caller must still choose it. But passing
 * a lambda like `(s, r) => s.appendIfNew(r, ...)` left the words `.appendIfNew(` sitting in bin/, where the
 * ungated-writer censuses correctly read them as a write site that no gate encloses. Two censuses failed on
 * exactly that, and they were right to: a reader cannot tell an argument from a statement by looking.
 *
 * Naming the discipline moves the call into this file — which the writer census already covers with a declared
 * reason — and leaves the caller declaring WHAT it wants without performing it. No census had to be weakened.
 */
export const APPEND_DISCIPLINES = Object.freeze({
  APPEND_IF_NEW: Object.freeze({
    apply: (store, record, { seenAt }) => (seenAt ? store.appendIfNew(record, { seenAt }) : store.appendIfNew(record)),
    onRepeat: "appends a RE-SIGHTING — the record that we looked again — so one line lands either way",
    linesWritten: () => 1,
    /* The store itself THROWS on a record with no dedupe key, so demanding one here fails earlier and says why. */
    requiresKey: true,
  }),
  APPEND_WITHOUT_DEDUPE: Object.freeze({
    apply: (store, record) => store.appendWithoutDedupe(record),
    onRepeat: "appends again; there is NO duplicate check at all — 'the name is the warning'",
    linesWritten: () => 1,
    /* 🔴 NO KEY IS REQUIRED, AND THAT IS NOT A GAP. These disciplines exist precisely for records that are unique
     * by construction — a run record whose id carries its start time, a supersession note written once per copy —
     * and issue_state_change records carry no dedupe key BY DESIGN. Demanding one would refuse a lawful write. */
    requiresKey: false,
  }),
  APPEND_ALL_WITHOUT_DEDUPE: Object.freeze({
    apply: (store, record) => store.appendAllWithoutDedupe([record]),
    onRepeat: "appends again; no duplicate check",
    linesWritten: () => 1,
    requiresKey: false,
  }),
  LEDGER_APPEND: Object.freeze({
    apply: (ledger, entry) => ledger.append(entry),
    /* 🔴 A THIRD REPEAT BEHAVIOUR, AND IT IS NOT THE OTHER TWO. The cost ledger SKIPS a duplicate entry_id and
     * writes NOTHING, returning { appended: false }. A verify that demanded one line per record would call a
     * correct skip a failure — which is exactly why the expected delta is asked of the discipline rather than
     * assumed to be the record count. */
    onRepeat: "SKIPS — a duplicate entry_id writes nothing at all",
    linesWritten: (result) => (result?.appended ? 1 : 0),
    requiresKey: true,
  }),
});

/** Our own temporary files, and no others. The suffix is what makes "ours" a measurable claim rather than a hope. */
export const TEMP_MARKER = ".governed-staged-";
const tempNameFor = (target) => `${basename(target)}${TEMP_MARKER}${process.pid}-${Math.random().toString(36).slice(2, 10)}.tmp`;
const isOurTemp = (target, name) => name.startsWith(`${basename(target)}${TEMP_MARKER}`) && name.endsWith(".tmp");

/**
 * PROFILE 1 · STAGED_REPLACE — prepare into a temporary beside the target, verify the prepared bytes, replace by
 * atomic rename, verify the final target.
 *
 * 🔴 ON fsync: MEASURED, NOT ASSUMED — this repository has no fsync law. No module mentions fsync, fdatasync or
 * O_SYNC. The choice made here is therefore DECLARED rather than cited: this adapter does not fsync, and the
 * consequence is that COMMITTED means "the rename returned and the target re-read", not "durable through a power
 * loss". Citing a law that does not exist would have been the worse error.
 */
export function stagedReplaceAdapter({ repo, repoRelativeTarget, targetClass, bytes }) {
  const absolute = resolve(join(repo, repoRelativeTarget));
  const hashOf = hashRuleFor(bytes ?? "");
  const intended = hashOf(bytes ?? "");

  return {
    profile: "STAGED_REPLACE",
    occurrenceFingerprint: intended,

    describeTarget: () => ({ targetClass, repoRelativeTarget }),

    prevalidate() {
      const faults = [];
      if (bytes === null || bytes === undefined) faults.push({ code: "BYTES_ABSENT", why: "a staged replace needs the bytes it intends to commit" });
      if (!resolve(absolute).startsWith(resolve(repo))) faults.push({ code: "TARGET_OUTSIDE_REPOSITORY", why: "a governed target is confined to the repository" });
      return faults;
    },

    /** The target already holds exactly this occurrence's bytes, or it does not. Nothing in between. */
    inspect() {
      if (!existsSync(absolute)) return { state: "ABSENT" };
      return hashOf(readFileSync(absolute)) === intended ? { state: "COMMITTED" } : { state: "ABSENT" };
    },

    /**
     * 🔴 THE NAMED OWNER OF THE `PREPARED` DISCOVERED STATE. A temporary that outlived its process is discovered
     * by listing this directory. It is DISCARDED, never adopted: a prepared file of unknown provenance has no
     * proof it was ever complete. Only files matching OUR OWN naming are touched — an unrelated file never is.
     */
    discardAbandoned() {
      const dir = dirname(absolute);
      if (!existsSync(dir)) return [];
      const ours = readdirSync(dir).filter((n) => isOurTemp(absolute, n));
      for (const n of ours) rmSync(join(dir, n), { force: true });
      return ours;
    },

    prepare() {
      const dir = dirname(absolute);
      mkdirSync(dir, { recursive: true });
      const tmp = join(dir, tempNameFor(absolute));
      /* A Buffer is written as-is; an encoding would be ignored for one anyway, and saying "utf8" here invited the
       * reader to believe binary content was being decoded. */
      if (Buffer.isBuffer(bytes)) writeFileSync(tmp, bytes); else writeFileSync(tmp, bytes, "utf8");
      return tmp;
    },

    verifyPrepared(tmp) {
      if (!tmp || !existsSync(tmp)) return [{ code: "PREPARED_ABSENT", why: "the prepared temporary is not on disk" }];
      return hashOf(readFileSync(tmp)) === intended ? [] : [{ code: "PREPARED_BYTES_DIFFER", why: "the prepared bytes are not the bytes this occurrence declared" }];
    },

    /** The commit itself: one atomic replace. Before this call the target is untouched; after it, it is the new one. */
    commit(tmp) {
      renameSync(tmp, absolute);
    },

    verify() {
      if (!existsSync(absolute)) return [{ code: "TARGET_ABSENT_AFTER_COMMIT", why: "the target does not exist after a successful rename" }];
      return hashOf(readFileSync(absolute)) === intended ? [] : [{ code: "TARGET_BYTES_DIFFER", why: "the target does not carry this occurrence's bytes after commit" }];
    },

    recover() {
      return this.inspect();
    },
  };
}

/**
 * PROFILE 3 · STAGED_DIRECTORY_REPLACE — an EXTERNAL tool fills a staging directory beside the target; the staged
 * tree is validated and fingerprinted; the live directory is renamed aside, the staged one renamed into its place,
 * and the retired copy removed. See `PROFILES` in governed-write.mjs for why this is two renames and not one.
 *
 * @param {(dir: string) => void} populate  the external step. It is handed an EMPTY staging directory and must fill
 *   it; it never sees the live target. 🔴 It is the only place the tool runs, so a tool that dies mid-way leaves a
 *   staging directory — a DISCOVERED state with a named owner — and never a half-written target.
 * @param {(dir: string) => object[]} validate  faults of the staged tree; [] means it may become the target.
 * @param {string} occurrenceFingerprint  the declared content-identity of what is being fetched (a sha256), because
 *   the bytes themselves do not exist until the tool has run.
 * @param {(from: string, to: string) => void} [rename]  the rename primitive — injectable ONLY so a proof can make one
 *   rename fail on demand; production passes nothing and gets renameSync.
 */
export function stagedDirectoryReplaceAdapter({ repo, repoRelativeTarget, targetClass, occurrenceFingerprint, populate, validate = () => [], rename = renameSync }) {
  const absolute = resolve(join(repo, repoRelativeTarget));
  const parent = dirname(absolute);
  const base = basename(absolute);
  const STAGE = `${base}${TEMP_MARKER}dir-`;
  const RETIRE = `${base}.governed-retired-`;
  const ours = (n) => n.startsWith(STAGE) || n.startsWith(RETIRE);
  let intendedManifest = null;

  /** The tree's identity: every relative file name with the sha256 of its RAW bytes, sorted. Never normalised. */
  const manifestOf = (dir) => {
    const out = [];
    const walk = (d, prefix) => {
      for (const n of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const rel = prefix ? `${prefix}/${n.name}` : n.name;
        if (n.isDirectory()) walk(join(d, n.name), rel);
        else out.push(`${rel}\u0000${byteHash(readFileSync(join(d, n.name)))}`);
      }
    };
    walk(dir, "");
    return { files: out.length, hash: createHash("sha256").update(out.join("\n"), "utf8").digest("hex") };
  };

  return {
    profile: "STAGED_DIRECTORY_REPLACE",
    occurrenceFingerprint,
    retiredPath: null,
    cleanupFault: null,

    describeTarget: () => ({ targetClass, repoRelativeTarget }),

    prevalidate() {
      const faults = [];
      if (typeof populate !== "function") faults.push({ code: "POPULATE_ABSENT", why: "a directory replace needs the step that fills it" });
      /* Strictly BENEATH the repository: the repository root itself is never a directory this profile may replace. */
      if (!absolute.startsWith(resolve(repo) + sep)) faults.push({ code: "TARGET_OUTSIDE_REPOSITORY", why: "a governed target is confined beneath the repository" });
      return faults;
    },

    /* DECLARED-UNREACHABLE for this profile: the intended bytes do not exist before preparation. */
    inspect: () => ({ state: "ABSENT" }),

    /** The named owner of PREPARED and RETIRED: ours by name only; an unrelated sibling is never touched. */
    discardAbandoned() {
      if (!existsSync(parent)) return [];
      const found = readdirSync(parent).filter(ours);
      for (const n of found) rmSync(join(parent, n), { recursive: true, force: true });
      return found;
    },

    prepare() {
      mkdirSync(parent, { recursive: true });
      const staging = join(parent, `${STAGE}${process.pid}-${Math.random().toString(36).slice(2, 10)}`);
      mkdirSync(staging);
      populate(staging);
      return staging;
    },

    verifyPrepared(staging) {
      if (!staging || !existsSync(staging)) return [{ code: "PREPARED_ABSENT", why: "the staging directory is not on disk" }];
      const faults = [...(validate(staging) ?? [])];
      const m = manifestOf(staging);
      if (m.files === 0) faults.push({ code: "PREPARED_EMPTY", why: "the tool produced no files — an empty directory is not a recovered one" });
      if (faults.length === 0) intendedManifest = m;
      return faults;
    },

    /**
     * Rename the live copy aside, then the staged copy in. If the second rename fails, rename the live copy BACK;
     * the target is then unchanged and the throw is an ordinary failure. If that rollback ALSO fails, the throw
     * carries governedTargetState "TARGET_ABSENT", which the boundary returns as RECOVERY_REQUIRED.
     */
    commit(staging) {
      let retired = null;
      if (existsSync(absolute)) {
        retired = join(parent, `${RETIRE}${process.pid}-${Math.random().toString(36).slice(2, 10)}`);
        rename(absolute, retired);
      }
      try {
        rename(staging, absolute);
      } catch (err) {
        if (retired) {
          try { rename(retired, absolute); } catch (rollbackErr) {
            this.retiredPath = retired;
            const e = new Error(`the staged directory could not be moved in (${err?.code ?? err?.name}) and the live copy could not be moved back (${rollbackErr?.code ?? rollbackErr?.name})`);
            e.code = rollbackErr?.code ?? "ROLLBACK_FAILED";
            e.governedTargetState = "TARGET_ABSENT";
            throw e;
          }
        }
        throw err;
      }
      /* The new target is in place. Removing the retired copy is housekeeping: if it fails, the copy is a RETIRED
       * discovered state for the next write — the commit itself is not undone by it. */
      if (retired) {
        try { rmSync(retired, { recursive: true, force: true }); } catch (e) { this.cleanupFault = String(e?.code ?? e?.name); this.retiredPath = retired; }
      }
    },

    verify() {
      if (!existsSync(absolute)) return [{ code: "TARGET_ABSENT_AFTER_COMMIT", why: "the target does not exist after the rename" }];
      const m = manifestOf(absolute);
      return intendedManifest && m.hash === intendedManifest.hash && m.files === intendedManifest.files
        ? []
        : [{ code: "TARGET_TREE_DIFFERS", why: "the target's files are not the validated staged files" }];
    },

    recover() {
      return existsSync(absolute) && intendedManifest && manifestOf(absolute).hash === intendedManifest.hash ? { state: "COMMITTED" } : { state: "ABSENT" };
    },

    manifest: () => intendedManifest,
  };
}

/**
 * PROFILE 2 · VALIDATED_APPEND — prevalidate, inspect for the occurrence, append exactly once, re-read.
 *
 * 🔴 `appendFileSync` DOES NOT SUPPLY A PREPARED STATE and this adapter never pretends otherwise. There is no
 * prepare() here, because an append either lands or it does not. What a torn append leaves is a PARTIAL TAIL,
 * which is a DISCOVERED state owned by the next run of the store — not something this call can return.
 *
 * @param {(rec:object)=>string} occurrenceKeyOf  how a stored record declares WHICH occurrence it is.
 */
export function jsonlAppendAdapter({ repo, repoRelativeTarget, targetClass, record, occurrenceKeyOf }) {
  const absolute = resolve(join(repo, repoRelativeTarget));
  const canonical = (r) => JSON.stringify(r, Object.keys(r).sort());
  const mine = occurrenceKeyOf(record);
  const intended = contentHash(canonical(record));

  const readRecords = () => {
    if (!existsSync(absolute)) return { records: [], malformedTail: false };
    const text = readFileSync(absolute, "utf8").replace(/\r\n/g, "\n");
    const hadFinalNewline = text.endsWith("\n");
    const lines = text.split("\n").filter((l, i, a) => !(i === a.length - 1 && l === ""));
    const records = [];
    let malformed = false;
    lines.forEach((l, i) => {
      try { records.push(JSON.parse(l)); } catch { if (i === lines.length - 1) malformed = true; }
    });
    return { records, malformedTail: malformed || (!hadFinalNewline && lines.length > 0) };
  };

  return {
    profile: "VALIDATED_APPEND",
    occurrenceFingerprint: intended,

    describeTarget: () => ({ targetClass, repoRelativeTarget }),

    prevalidate() {
      const faults = [];
      if (!record || typeof record !== "object") faults.push({ code: "RECORD_ABSENT", why: "a validated append needs the complete record before it appends anything" });
      if (mine === null || mine === undefined || mine === "") faults.push({ code: "OCCURRENCE_KEY_ABSENT", why: "the record does not declare which occurrence it is" });
      /* 🔴 DETECTED, AND REFUSED — NOT REPAIRED. The store's validated-tail law is detect-and-refuse; this
       * repository has no recovery law, and F08 does not invent one. The owner of this state is the next run. */
      if (readRecords().malformedTail) faults.push({ code: "MALFORMED_TAIL", why: "the target's final line is truncated — nothing is appended onto a damaged log, and it is not silently truncated either" });
      return faults;
    },

    inspect() {
      const { records } = readRecords();
      const matching = records.filter((r) => occurrenceKeyOf(r) === mine);
      if (matching.length === 0) return { state: "ABSENT" };
      const same = matching.filter((r) => contentHash(canonical(r)) === intended);
      if (same.length === matching.length) return { state: "COMMITTED", count: same.length };
      /* Field IDENTIFIERS only. A conflict report never carries the values that disagree. */
      const differing = matching.find((r) => contentHash(canonical(r)) !== intended);
      const fields = Object.keys(record).filter((k) => JSON.stringify(differing[k]) !== JSON.stringify(record[k]));
      return { state: "CONFLICTING", fields: fields.join(",") };
    },

    commit() {
      mkdirSync(dirname(absolute), { recursive: true });
      appendFileSync(absolute, JSON.stringify(record) + "\n", "utf8");
    },

    verify() {
      const found = this.inspect();
      if (found.state === "COMMITTED" && found.count === 1) return [];
      if (found.state === "COMMITTED") return [{ code: "OCCURRENCE_APPENDED_TWICE", why: `${found.count} copies of one occurrence` }];
      return [{ code: "OCCURRENCE_NOT_FOUND_AFTER_COMMIT", why: "the appended occurrence is not readable" }];
    },

    recover() {
      return this.inspect();
    },
  };
}

/**
 * PROFILE 2, over the shared evidence store.
 *
 * 🔴 IDENTITY IS THE STORE'S OWN DEDUPE KEY, ASKED FOR — NOT REIMPLEMENTED HERE. The store decides what makes two
 * records the same thing (`measurement_key`, or `issue:<issue_id>`), and a second copy of that rule living in this
 * file would be a second rule that drifts from the first.
 *
 * 🔴 THE OCCURRENCE IS THIS RUN'S OBSERVATION, NOT "THE RECORD EXISTS" — AND THAT IS NOT A CONVENIENCE.
 *
 * `appendIfNew` does NOT skip a repeat. On a second sighting it appends a RE-SIGHTING: a pointer to the original
 * record plus the date we looked. The fact that we re-checked is information this store exists to keep. So a
 * boundary that inspected "is this key already present?" and returned ALREADY_COMMITTED would stop the re-sighting
 * from ever being written — silently destroying the record of every re-check, in the name of idempotency.
 *
 * The occurrence is therefore keyed by the record AND the run. Within a run a retry commits once; a later run is a
 * genuinely new observation and the STORE decides what to write for it, which is exactly the division of labour the
 * writer census already declares. `CONFLICTING` is not producible here: the store's key is content-derived, so two
 * records sharing a key share their content, and there is no same-key-different-content state to find.
 */
export function storeAppendAdapter({ repo, repoRelativeTarget, targetClass, store, records, keyOf, append, linesWritten = () => 1, requiresKey = true, occurrenceScope }) {
  void repo;
  /* 🔴 THE OCCURRENCE IS THE BATCH, NOT THE RECORD — AND THAT IS NOT ONLY AN OPTIMISATION.
   *
   * Routing per record made every finding its own governed decision. A dry run of one audit binary then appended
   * one REFUSED event per finding, and each append re-read the growing trail: the run hung and was killed at 120
   * seconds, and its own incident test caught it. It was also wrong in principle — the write law decides ONCE per
   * run whether this store may be written, so that is one decision and one saga, however many records it covers.
   * A trail that grew by thousands of events per audit run would drown the decisions it exists to record. */
  const list = Array.isArray(records) ? records : [records];
  const keys = list.map((r) => keyOf(r));
  const keySet = new Set(keys.filter((k) => k !== null && k !== undefined && k !== ""));
  /* Unkeyed records cannot be found again by key, so the delta is measured over the whole target instead. The
   * proof "exactly as many lines landed as the discipline wrote" survives either way; only the denominator moves. */
  const countFor = () => (keySet.size > 0 ? store.readAll().filter((r) => keySet.has(keyOf(r))).length : store.readAll().length);
  let before = null;
  let committed = false;

  return {
    profile: "VALIDATED_APPEND",
    /* 🔴 THE CONTENT IS IN THE FINGERPRINT, AND LEAVING IT OUT WAS A REAL COLLISION.
     *
     * Keying only on the records' dedupe keys made two genuinely different governed writes identical whenever
     * neither had keys: an EMPTY batch joined to "", and a batch of UNKEYED records joined to "" as well. In
     * bin/crawl.mjs that is exactly what happens — a dry run has no observations, and the run record carries no
     * dedupe key by design — so both writes derived the same idempotency key, the same saga eventId, and the
     * store correctly refused the second as EVENT_ID_CONFLICT. The crawl dry-run test caught it.
     *
     * The count and the canonical content distinguish them. Two IDENTICAL batches in one run still collide, which
     * is right: that is the same occurrence, and it is what makes a retry append nothing. */
    occurrenceFingerprint: createHash("sha256")
      .update(`${keys.join("\u0001")}\u0000${list.length}\u0000${JSON.stringify(list)}\u0000${occurrenceScope ?? ""}`, "utf8")
      .digest("hex"),

    describeTarget: () => ({ targetClass, repoRelativeTarget }),

    prevalidate() {
      const faults = [];
      if (!Array.isArray(records) && (!records || typeof records !== "object")) {
        faults.push({ code: "RECORD_ABSENT", why: "a validated append needs the complete records before it appends anything" });
        return faults;
      }
      const missing = requiresKey ? keys.findIndex((k) => k === null || k === undefined || k === "") : -1;
      if (missing !== -1) {
        faults.push({ code: "OCCURRENCE_KEY_ABSENT", why: `record ${missing} carries no key this store can identify it by, so nothing can say whether it has been seen before` });
      }
      return faults;
    },

    /* Within this run: has THIS attempt already committed? Across runs the answer is ABSENT by design — see above. */
    inspect: () => (committed ? { state: "COMMITTED", count: list.length } : { state: "ABSENT" }),

    /* `result` holds the STORE'S OWN return for each record, so a caller can still report honestly what happened —
     * appended, or a re-sighting. Routing must not cost a caller information it was already telling the operator. */
    result: null,
    commit() {
      before = countFor();
      this.result = list.map((r) => append(store, r));
      committed = true;
    },

    /* EXACTLY AS MANY LINES AS THE DISCIPLINE SAYS IT WROTE must have landed. The expected number is asked of the
     * discipline, because the three of them differ: appendIfNew always writes one (new or re-sighting), the
     * without-dedupe pair always write one, and the cost ledger writes NONE for a duplicate entry_id. Counting the
     * DELTA rather than the total is what makes this provable on a store that already held these keys. */
    verify() {
      const expected = (this.result ?? []).reduce((n, r) => n + linesWritten(r), 0);
      const after = countFor();
      if (after === before + expected) return [];
      if (after === before && expected > 0) return [{ code: "OCCURRENCE_NOT_FOUND_AFTER_COMMIT", why: "the append did not land" }];
      return [{ code: "OCCURRENCE_COUNT_WRONG", why: `${after - before} line(s) landed where the discipline wrote ${expected}` }];
    },

    recover() { return this.inspect(); },
  };
}

/**
 * PROFILE 2, over the hash-chained audit store. The store already refuses a conflicting duplicate and an honest
 * retry, so this adapter reports what the store decides rather than deciding it again in a second place.
 */
export function auditEventAdapter({ store, draft, identity, repoRelativeTarget, targetClass = "AUDIT_TRAIL" }) {
  let appended = null;
  return {
    profile: "VALIDATED_APPEND",
    describeTarget: () => ({ targetClass, repoRelativeTarget }),
    prevalidate: () => (draft && typeof draft === "object" ? [] : [{ code: "RECORD_ABSENT", why: "no event draft" }]),
    inspect: () => (appended ? { state: "COMMITTED", count: 1 } : { state: "ABSENT" }),
    commit() { appended = store.append(draft, { identity }); },
    verify: () => (appended ? [] : [{ code: "OCCURRENCE_NOT_FOUND_AFTER_COMMIT", why: "the event did not append" }]),
    recover: () => (appended ? { state: "COMMITTED" } : { state: "ABSENT" }),
  };
}
