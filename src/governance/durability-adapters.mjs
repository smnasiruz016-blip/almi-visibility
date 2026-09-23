/**
 * 🔴 THE TWO DURABILITY PROFILES. Each promises exactly what its target's primitive can deliver — no more.
 *
 * The boundary in `governed-write.mjs` owns validation, gating, auditing and the saga. These adapters own the
 * bytes. They are deliberately the only place a governed mutation touches the filesystem, so a change to how
 * durability works is one file, not forty.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

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
