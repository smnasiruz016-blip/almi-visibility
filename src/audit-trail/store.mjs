/**
 * 🔴 F08 · THE APPEND-ONLY AUDIT STORE, AND THE TAMPER BOUNDARY IT ACTUALLY HAS (22 September 2026).
 *
 * ── THE STORE, DECLARED BEFORE IT WAS BUILT (§7) ───────────────────────────
 *
 *   WHERE      this repository (the ENGINE), at the path the caller hands in. The production path is
 *              `runs/audit-trail/events.jsonl` with its head record beside it at `runs/audit-trail/head.json`
 *              (config/audit-store.mjs). It is NOT in the data repository: what is audited here are the ENGINE's own
 *              governed decisions — authority resolutions, board transitions, evidence-role decisions, write-gate
 *              decisions and refusals. None of them is any tenant's data, and putting them in a tenant-data
 *              repository would put an engine-integrity record behind a tenant boundary it does not belong inside.
 *   NEUTRAL    every path segment — runs, audit-trail, events, head — names no client, product, host, regulator or
 *              subject. That is checked, not asserted (P34, and the product-boundary census).
 *   FORMAT     JSON Lines: one canonical event per line, LF-terminated, UTF-8. `.gitattributes` already declares
 *              `runs/** -text`, so the committed bytes survive a checkout on any platform and the hashes keep matching.
 *   ATOMICITY  an event is serialised in full and validated in full BEFORE the filesystem is touched, then handed to
 *              ONE append call. There is no partial-event path, because nothing is written until the whole line
 *              exists. A torn write at the OS level would leave a truncated FINAL line; `readAll` reports that as
 *              MALFORMED_TAIL and never as a valid event.
 *   RETENTION  append-only and never pruned — an audit trail that is pruned is not one. It is bounded instead by what
 *              is admitted: governed decisions only, read-only diagnostics excluded. `sizeReport()` gives bytes,
 *              events and bytes-per-event against a declared ceiling, so growth is a reported number and never a
 *              silent surprise.
 *
 * ── THE DETECTION BOUNDARY, STATED PLAINLY (§8.8) ──────────────────────────
 *
 * This is TAMPER EVIDENCE over a stored chain, inside a declared boundary. It is NOT cryptographic non-repudiation:
 * everything here is a plain hash chain over files that whoever runs the engine can write.
 *
 *   MUTATION of a stored event        DETECTED — its own hash stops matching.
 *   DELETION of a MIDDLE event        DETECTED — the link from the next event stops resolving.
 *   INSERTION or REORDERING           DETECTED — the same link check.
 *   DELETION of the FIRST event       DETECTED — the genesis pin. The first event's previousEventHash must be exactly
 *                                     GENESIS_PREVIOUS_HASH; an absent link is refused rather than read as genesis.
 *   TAIL TRUNCATION                   DETECTED — but ONLY through the separate head record, which carries the count
 *                                     and the head hash. 🔴 THE LIMIT, DECLARED: if the head record is truncated
 *                                     CONSISTENTLY WITH the events file — both rewritten together — the two agree and
 *                                     nothing here notices. Two files kept in step is exactly what an author with
 *                                     write access to both can do. That is the boundary; it is not claimed away.
 *
 * 🔴 27 Sep 2026: `git checkout` of the trail files IS that consistent rewrite, and it removed 65 governed events
 * before anyone noticed (_handoffs 5fd0435). The store's own boundary above is unchanged and still true of the store
 * alone. The PRODUCTION store now also carries an out-of-tree witness (witness.mjs, wired in wiring.mjs), which detects
 * that case and refuses to append past it. Its own limit is declared there.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import {
  AUDIT_VERSION, FIELD_ORDER, GENESIS_PREVIOUS_HASH, canonicalWithoutHash, canonicalJson, contentFingerprint,
  deriveEventId, eventFaults, hashEvent,
} from "./event.mjs";
import { linesOf } from "./witness.mjs";
import { withExclusiveLock } from "../governance/process-lock.mjs";

export class AuditRefused extends Error {
  constructor(faults, why) {
    super(`AUDIT_REFUSED: ${why ?? faults.map((f) => f.code).join(", ")}`);
    this.code = "AUDIT_REFUSED";
    this.faults = faults;
  }
}

/** The declared boundary, as data — so a reader can print it and a test can assert it. */
export const DETECTION_BOUNDARY = Object.freeze({
  mutation: "DETECTED",
  middleDeletion: "DETECTED",
  insertionOrReorder: "DETECTED",
  firstEventDeletion: "DETECTED",
  tailTruncation: "DETECTED_VIA_HEAD_RECORD",
  declaredLimit: "a tail truncation that also rewrites the head record consistently is NOT DETECTED by this design",
  notClaimed: "this is tamper evidence over a stored chain, not cryptographic non-repudiation",
});

export const CHAIN_FINDINGS = Object.freeze([
  "EVENT_HASH_MISMATCH", "LINK_BROKEN", "GENESIS_PIN_MISSING", "MALFORMED_TAIL", "MALFORMED_LINE",
  "DUPLICATE_EVENT_ID", "HEAD_RECORD_ABSENT", "HEAD_COUNT_MISMATCH", "HEAD_HASH_MISMATCH", "FIELD_ORDER_VIOLATION",
]);

/**
 * 🔴 ONE PRECISION FOR EVERY INSTANT THIS FEATURE WRITES — SECONDS, IN UTC.
 *
 * The first version let `recordedAt` keep its milliseconds while callers supplied second-precision `occurredAt`.
 * Both were valid ISO-8601 and both were the same moment, and the time rule still refused the event
 * OCCURRED_AT_IN_FUTURE — because "…15Z" sorts AFTER "…15.123Z" in a string comparison. The fail-closed path did
 * exactly what it should have (the authority corpus was not written), but the finding was about the clock, not the
 * event. Instants are now compared as INSTANTS, and one precision is used throughout.
 */
export const isoSeconds = (d) => new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
export const systemClock = () => isoSeconds(Date.now());

/**
 * Open the store. Nothing is read or written until a method is called.
 *
 * @param {object} o
 * @param {string} o.eventsPath   the JSONL file. The CALLER decides it, and the caller is where the write law lands.
 * @param {string} o.headPath     the head record beside it.
 * @param {() => string} o.clock  supplies recordedAt. Injected so a test can force every time-rule verdict.
 */
export function createAuditStore({
  eventsPath, headPath, clock = systemClock, evidenceEntryFor = () => null, isSealedRef = () => false,
  forbiddenSubstrings = [], appendLine = defaultAppendLine, sizeCeilingBytes = 32 * 1024 * 1024 /* 32 MiB, REPORTED — NOT ENFORCED (owner ruling 8 Oct 2026, f11a415) */,
  assertLocation = () => {},
  /* 🔴 The production trail's out-of-tree witness (witness.mjs). null for every confined store. When present, an append
   * onto a trail the witness shows was shortened or altered is REFUSED, and verify reports it. */
  witness = null,
}) {
  if (typeof eventsPath !== "string" || eventsPath.trim() === "") throw new TypeError("the audit store needs an events path — it never chooses one for itself");
  if (typeof headPath !== "string" || headPath.trim() === "") throw new TypeError("the audit store needs a head-record path");

  /** Every stored line, in order. A truncated or unparseable FINAL line is reported, never read as an event. */
  function readAll() {
    if (!existsSync(eventsPath)) return { events: [], lines: 0, malformedTail: false, malformedLines: [] };
    const raw = readFileSync(eventsPath, "utf8");
    const text = raw.replace(/\r\n/g, "\n");
    const hadFinalNewline = text.endsWith("\n");
    const lines = text.split("\n").filter((l, i, a) => !(i === a.length - 1 && l === ""));
    const events = [];
    const malformedLines = [];
    lines.forEach((l, i) => {
      try { events.push(JSON.parse(l)); }
      catch { malformedLines.push(i + 1); }
    });
    const malformedTail = (!hadFinalNewline && lines.length > 0) || malformedLines.includes(lines.length);
    return { events, lines: lines.length, malformedTail, malformedLines };
  }

  /** The stored lines as text, CRLF-normalised — what the witness compares, byte for byte. */
  const rawLines = () => (existsSync(eventsPath) ? linesOf(readFileSync(eventsPath, "utf8")) : []);

  function readHead() {
    if (!existsSync(headPath)) return null;
    try { return JSON.parse(readFileSync(headPath, "utf8")); } catch { return { malformed: true }; }
  }

  function writeHead(count, headHash) {
    mkdirSync(dirname(headPath), { recursive: true });
    const tmp = headPath + ".tmp";
    const body = JSON.stringify({ auditVersion: AUDIT_VERSION, count, headHash, updatedAt: clock() }, null, 2) + "\n";
    writeFileSync(tmp, body, "utf8");
    renameSync(tmp, headPath);
  }

  /**
   * 🔴 APPEND, OR REFUSE. There is no third outcome and no partial one.
   *
   *   · the event is completed, validated and hashed IN MEMORY;
   *   · an honest retry (same eventId, same content fingerprint) appends NOTHING and says so;
   *   · a CONFLICTING duplicate (same eventId, different content) is REFUSED — never merged, never overwritten;
   *   · any fault throws AuditRefused before a byte is written, so a governed caller FAILS CLOSED by construction.
   */
  /* 🔴 F77 M2 — the whole read-check-append runs under ONE cross-process lock beside the store, so no second process can
   * append between this one's read and its append (measured: that gap duplicated event ids and broke the chain). */
  function append(draft, options = {}) {
    return withExclusiveLock(`${eventsPath}.lock`, () => appendUnlocked(draft, options));
  }

  function appendUnlocked(draft, { identity = null } = {}) {
    /* The wiring's location check (production path only): it throws before anything is read or written. */
    assertLocation();
    const { events, malformedTail } = readAll();
    if (malformedTail) throw new AuditRefused([{ code: "MALFORMED_TAIL", why: "the store's final line is truncated — nothing is appended onto a damaged chain" }]);
    /* Throws AuditWitnessRefused when the witness holds lines the trail lost, or disagrees with it — before a byte is written. */
    if (witness) witness.beforeAppend(rawLines());

    const recordedAt = clock();
    const previousEventHash = events.length === 0 ? GENESIS_PREVIOUS_HASH : events[events.length - 1].eventHash;
    const eventId = draft.eventId ?? deriveEventId(identity ?? defaultIdentity(draft));

    const event = {};
    for (const k of FIELD_ORDER) event[k] = null;
    Object.assign(event, {
      ...draft,
      auditVersion: AUDIT_VERSION,
      eventId,
      recordedAt,
      previousEventHash,
      eventHash: null,
      metadata: { ...(draft.metadata ?? {}) },
    });

    /* 🔴 THE THIRD TIME-WORLD, AND IT IS NEVER SILENT. An occurredAt EARLIER than the previous event's is lawful —
     * a migration appends old events after new ones — but it is flagged here by the STORE, and the reader prints the
     * flag on every event that carries one. Absent, malformed or FUTURE occurredAt is refused by eventFaults. */
    const previous = events[events.length - 1] ?? null;
    if (previous && Date.parse(event.occurredAt) < Date.parse(previous.occurredAt)) {
      event.metadata.timeAnomaly = "OUT_OF_ORDER_OCCURRED_AT";
    }

    const faults = eventFaults(event, { evidenceEntryFor, isSealedRef, forbiddenSubstrings });
    if (faults.length) throw new AuditRefused(faults);

    event.eventHash = hashEvent(event);

    // ── IDENTITY: an honest retry, or a conflict. Never a silent second copy, never an overwrite. ──
    const existing = events.find((e) => e.eventId === event.eventId);
    if (existing) {
      if (contentFingerprint(existing) === contentFingerprint(event)) return { status: "IDEMPOTENT_RETRY", event: existing, appended: false };
      throw new AuditRefused(
        [{ code: "EVENT_ID_CONFLICT", why: `eventId ${event.eventId} is already held by a DIFFERENT event — a conflicting duplicate is refused, not merged and not overwritten` }],
      );
    }

    // One fully-formed line, one call. Nothing partial can exist, because nothing existed until now.
    const line = JSON.stringify(orderedFor(event)) + "\n";
    mkdirSync(dirname(eventsPath), { recursive: true });
    appendLine(eventsPath, line);
    writeHead(events.length + 1, event.eventHash);
    /* Trail first, witness second: a crash between them leaves the TRAIL ahead, which the next append heals (catch-up).
     * The reverse order would leave the witness ahead of an event the trail never held — a false loss. */
    if (witness) witness.afterAppend(line);
    return { status: "APPENDED", event, appended: true };
  }

  /**
   * Verify the whole chain and report the boundary. Findings are codes and positions — never event payload.
   */
  function verify() {
    const { events, malformedTail, malformedLines } = readAll();
    const findings = [];
    if (malformedTail) findings.push({ code: "MALFORMED_TAIL", at: events.length + 1 });
    for (const at of malformedLines) findings.push({ code: "MALFORMED_LINE", at });

    const seen = new Set();
    events.forEach((e, i) => {
      const at = i + 1;
      if (seen.has(e.eventId)) findings.push({ code: "DUPLICATE_EVENT_ID", at, eventId: e.eventId });
      seen.add(e.eventId);
      if (Object.keys(e).join(",") !== FIELD_ORDER.join(",")) findings.push({ code: "FIELD_ORDER_VIOLATION", at, eventId: e.eventId });
      const expectedPrevious = i === 0 ? GENESIS_PREVIOUS_HASH : events[i - 1].eventHash;
      if (i === 0 && e.previousEventHash !== GENESIS_PREVIOUS_HASH) findings.push({ code: "GENESIS_PIN_MISSING", at, eventId: e.eventId });
      else if (e.previousEventHash !== expectedPrevious) findings.push({ code: "LINK_BROKEN", at, eventId: e.eventId });
      if (hashEvent(e) !== e.eventHash) findings.push({ code: "EVENT_HASH_MISMATCH", at, eventId: e.eventId });
    });

    const head = readHead();
    if (!head) findings.push({ code: "HEAD_RECORD_ABSENT", at: null });
    else {
      if (head.count !== events.length) findings.push({ code: "HEAD_COUNT_MISMATCH", at: null, headCount: head.count, stored: events.length });
      const storedHead = events.length ? events[events.length - 1].eventHash : GENESIS_PREVIOUS_HASH;
      if (head.headHash !== storedHead) findings.push({ code: "HEAD_HASH_MISMATCH", at: null });
    }
    /* The consistent truncation this store alone cannot see, seen from outside the working tree. */
    const witnessStatus = witness ? witness.status(rawLines()) : null;
    if (witnessStatus?.relation === "WITNESS_AHEAD") findings.push({ code: "TRAIL_BEHIND_WITNESS", at: witnessStatus.trail + 1, missing: witnessStatus.witness - witnessStatus.trail });
    if (witnessStatus?.relation === "DIVERGED") findings.push({ code: "TRAIL_DIVERGES_FROM_WITNESS", at: witnessStatus.common + 1 });
    return { ok: findings.length === 0, events: events.length, findings, boundary: DETECTION_BOUNDARY, witness: witnessStatus };
  }

  function sizeReport() {
    const bytes = existsSync(eventsPath) ? statSync(eventsPath).size : 0;
    const events = readAll().events.length;
    return {
      bytes, events, ceilingBytes: sizeCeilingBytes,
      bytesPerEvent: events ? Math.round(bytes / events) : 0,
      withinCeiling: bytes <= sizeCeilingBytes,
    };
  }

  const storeHash = () => (existsSync(eventsPath) ? createHash("sha256").update(readFileSync(eventsPath, "utf8").replace(/\r\n/g, "\n"), "utf8").digest("hex") : null);

  return { eventsPath, headPath, readAll, readHead, append, verify, sizeReport, storeHash };
}

/** The declared identity an eventId is derived from when the caller does not supply one. */
export const defaultIdentity = (d) => ({
  eventType: d.eventType ?? null, action: d.action ?? null, occurredAt: d.occurredAt ?? null, actor: d.actor ?? null,
  actorType: d.actorType ?? null, scopeType: d.scopeType ?? null, tenantId: d.tenantId ?? null,
  subjectId: d.subjectId ?? null, authorityRef: d.authorityRef ?? null, migrationSource: d.migrationSource ?? null,
  subject: d.metadata?.identitySubject ?? null,
});

/** An event object whose keys are in FIELD_ORDER — the stored form, and the form the hash covers. */
export function orderedFor(event) {
  const out = {};
  for (const k of FIELD_ORDER) out[k] = event[k] ?? null;
  return out;
}

function defaultAppendLine(path, line) {
  appendFileSync(path, line, "utf8");
}

export { canonicalWithoutHash, canonicalJson, GENESIS_PREVIOUS_HASH };
