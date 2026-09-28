/**
 * 🔴 F77 · R2 — A RETRY IS NOT A NEW COLLECTION (owner ruling RR-82 §2.1, _handoffs a726cc3; F77 Amendment 1, b443e5e).
 *
 * "A retry is the SAME LOGICAL OPERATION with the SAME OPERATION IDENTITY, repeated after an interruption or an uncertain outcome. A
 *  retry MUST NOT reissue a metered query and MUST NOT repeat a save. An intentionally authorised FRESH Search Console collection is a
 *  NEW OPERATION, even over the same date range. It MAY query again, it records a new sighting, and every query it makes counts
 *  against the quota."
 *
 * So a Search Console ingest is an OPERATION with an identity and a JOURNAL:
 *   · every metered call (the property list and every query) is journaled BEFORE it is issued (ISSUED) and again when answered
 *     (ANSWERED, with its response). The journal is written through the governed boundary by the entry point, one file per operation;
 *   · a RETRY (the journal exists) replays every ANSWERED call from the journal and issues ONLY the calls never issued. A call journaled
 *     ISSUED with no answer is an UNCERTAIN outcome — it may have spent quota — so the retry REFUSES it by name rather than reissue it;
 *   · a retry reuses the operation's ORIGINAL start instant, so the records it rebuilds are byte-identical to the ones the operation
 *     saved, and the retry-aware collector (src/evidence/store.mjs) saves nothing twice;
 *   · a COMMITTED operation's retry issues no call and saves nothing;
 *   · a FRESH collection is a new identity: nothing is replayed, every call is issued and charged, and it records a new sighting.
 *
 * Generic: no subject, host, property or query appears here. The journal holds responses, so it is never committed (.gitignore).
 */
import { createHash } from "node:crypto";

export const OPERATION_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,79}$/;
export const JOURNAL_SCHEMA = 1;
export const MODES = Object.freeze({ FRESH: "FRESH", RETRY: "RETRY" });
export const CALL_STATES = Object.freeze({ ISSUED: "ISSUED", ANSWERED: "ANSWERED" });

export class OperationRefused extends Error {
  constructor(code, why) {
    super(`${code}: ${why}`);
    this.name = "OperationRefused";
    this.code = code;
  }
}

/** Keys sorted at every depth, so the same call always has the same key. */
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}
/** The identity of one metered call within an operation: its method and its exact arguments. */
export const callKey = (method, args = {}) => createHash("sha256").update(stable({ method, args }), "utf8").digest("hex");

/** A journal read back from disk: validated, or refused. */
export function parseJournal(text) {
  let j;
  try { j = JSON.parse(text); } catch { throw new OperationRefused("JOURNAL_UNREADABLE", "the operation journal is not valid JSON"); }
  if (j?.schema !== JOURNAL_SCHEMA || !OPERATION_ID_PATTERN.test(String(j?.operationId)) || typeof j?.startedAt !== "string" || typeof j?.calls !== "object" || j.calls === null) {
    throw new OperationRefused("JOURNAL_INVALID", "the operation journal does not have the declared shape");
  }
  return j;
}

/**
 * Open an operation. `existing` is the parsed journal of this identity, or null. With a journal it is a RETRY of that operation;
 * without one it is a FRESH operation starting now.
 */
export function openOperation({ operationId, existing = null, now = () => new Date() }) {
  if (!OPERATION_ID_PATTERN.test(String(operationId ?? ""))) throw new OperationRefused("OPERATION_ID_INVALID", "an operation id is lower-case letters, digits and hyphens, 3 to 80 characters");
  if (existing !== null) {
    if (existing.operationId !== operationId) throw new OperationRefused("JOURNAL_IDENTITY_MISMATCH", "the journal belongs to another operation");
    return { schema: JOURNAL_SCHEMA, operationId, mode: MODES.RETRY, startedAt: existing.startedAt, committed: existing.committed === true, calls: { ...existing.calls } };
  }
  return { schema: JOURNAL_SCHEMA, operationId, mode: MODES.FRESH, startedAt: now().toISOString(), committed: false, calls: {} };
}

/** The journal bytes of an operation. */
export const serialiseOperation = (op) => `${JSON.stringify({ schema: op.schema, operationId: op.operationId, startedAt: op.startedAt, committed: op.committed, calls: op.calls }, null, 2)}\n`;

/**
 * The provider seam, journaled. `persist(bytes)` writes the journal durably (the entry point routes it through the governed
 * boundary); it is called BEFORE a call is issued and AFTER it is answered. Counters report what was issued and what was replayed.
 */
export function journaledProvider({ provider, operation, persist }) {
  const counters = { issued: 0, replayed: 0 };
  const save = () => persist(serialiseOperation(operation));
  async function through(method, args, call) {
    const key = callKey(method, args);
    const held = operation.calls[key];
    if (held?.state === CALL_STATES.ANSWERED) {
      counters.replayed += 1;
      return structuredClone(held.response);
    }
    if (held?.state === CALL_STATES.ISSUED) {
      throw new OperationRefused("UNCERTAIN_METERED_QUERY", `a ${method} call of this operation was issued and never answered — it may already have counted against the quota, so a retry does not reissue it; start a FRESH authorised collection instead`);
    }
    operation.calls[key] = { state: CALL_STATES.ISSUED, method };
    save();
    counters.issued += 1;
    const response = await call();
    operation.calls[key] = { state: CALL_STATES.ANSWERED, method, response: structuredClone(response) };
    save();
    return response;
  }
  const wrapped = {
    providerId: provider.providerId,
    listProperties: () => through("listProperties", {}, () => provider.listProperties()),
    queryRows: (args) => through("queryRows", args, () => provider.queryRows(args)),
  };
  return { provider: wrapped, counters };
}

/** Record that the operation's evidence was committed: a later retry of it issues nothing and saves nothing. */
export function markCommitted(operation, persist) {
  operation.committed = true;
  persist(serialiseOperation(operation));
}

/** The instant a retry must reuse, so its rebuilt records are byte-identical to the ones the operation saved. */
export const operationClock = (operation) => () => new Date(operation.startedAt);
