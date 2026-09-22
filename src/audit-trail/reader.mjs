/**
 * 🔴 F08 · THE PRODUCTION READ PATH — RECONSTRUCT THE DECISION, NEVER THE PAYLOAD (22 September 2026).
 *
 * The reader answers only in EXPLICIT states. There is no empty success anywhere in this file: a store that is not
 * there is UNAVAILABLE, a chain that does not verify is INVALID, an id that is not held is UNAVAILABLE, a reference
 * that resolves to nothing is INVALID. "No rows" is never how any of those is reported.
 *
 * ── THE THREE AUTHORITY VALUES, AND WHY REPORTING ONE IS THE DEFECT ────────
 *
 *   authorityAtEvent      the hash of the authority bytes that GOVERNED WHEN THE EVENT HAPPENED. Stored on the event
 *                         and never rewritten — a later supersession does not reach backwards.
 *   authorityCurrentNow   what the register resolves for the same proposition and scope TODAY.
 *   supersededSinceEvent  whether those two differ.
 *
 * All three are returned on every event. Reporting only the first tells a reader the past but hides that it moved;
 * reporting only the second silently rewrites history; reporting only the third says something changed but not what.
 *
 * ── MIGRATION IS SURFACED, NOT FLAGGED ────────────────────────────────────
 *
 * Every view carries `migrationStatus` — "MIGRATED" or "NATIVE" — as a first-class field on EVERY read path, not as a
 * boolean a caller may forget to look at. A migrated event also names the committed evidence it came from and when it
 * was migrated, and says in its own words that the record's existence is proved, not the original action's
 * correctness.
 *
 * ── SEALED MATERIAL IS NAMED AND NEVER OPENED ─────────────────────────────
 *
 * A reference to sealed material is returned as an identity with `expanded: false` and no content hash. The reader
 * does not read it, does not list what is under it, and has no code path that could.
 */
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";
import { TENANT_ID_PATTERN } from "../tenancy/resolver.mjs";
import { DETECTION_BOUNDARY } from "./store.mjs";

export const READ_STATES = Object.freeze(["OK", "INVALID", "UNAVAILABLE"]);

export const MIGRATION_NOTE =
  "a migrated event proves the RECORD exists and what it was reconstructed from; it does not prove the original action was correct";

const ok = (payload) => ({ status: "OK", ...payload });
const invalid = (code, why, extra = {}) => ({ status: "INVALID", code, why, ...extra });
const unavailable = (code, why) => ({ status: "UNAVAILABLE", code, why });

/**
 * @param {object} o
 * @param {object} o.store             a store from createAuditStore
 * @param {readonly object[]} o.authorityRecords  the migrated authority corpus (F05's production data)
 * @param {string} o.now               the day authorityCurrentNow is resolved at
 * @param {(ref) => object|null} o.evidenceEntryFor  the production evidence-role lookup
 */
export function createAuditReader({ store, authorityRecords = [], now, evidenceEntryFor = () => null }) {
  /** Nothing is answered from a chain that does not verify. This runs FIRST on every public read. */
  function guard() {
    const { events, malformedTail } = store.readAll();
    if (events.length === 0 && !malformedTail) {
      const head = store.readHead();
      if (!head) return unavailable("STORE_EMPTY_OR_ABSENT", `no audit events are held at ${store.eventsPath}`);
    }
    const v = store.verify();
    if (!v.ok) return invalid("CHAIN_INVALID", "the stored chain does not verify — no event is served from it", { findings: v.findings, boundary: v.boundary });
    return null;
  }

  function authorityView(event) {
    const ref = event.authorityRef ?? null;
    const res = ref ? resolveAuthority({ records: authorityRecords, propositionId: ref.propositionId, scope: ref.scope, now }) : null;
    const currentNow = res && permits(res) ? res.authority.contentHash : null;
    return Object.freeze({
      authorityAtEvent: event.authorityHash ?? null,
      authorityCurrentNow: currentNow,
      currentOutcome: res ? res.outcome : "NO_AUTHORITY_REF",
      supersededSinceEvent: (event.authorityHash ?? null) !== currentNow,
    });
  }

  /** An evidence reference as the trail holds it: identity, declared role, hash, scope. Sealed material is NEVER opened. */
  function evidenceView(ref) {
    const entry = evidenceEntryFor(ref);
    if (!entry) return invalid("EVIDENCE_UNRESOLVABLE", `${ref?.root}:${ref?.ref} resolves to no registry entry — an unresolvable reference is INVALID, never an empty success`);
    if (entry.sealed === true) {
      return ok({ root: ref.root, ref: ref.ref, role: entry.role, registryId: entry.id, contentHash: null, expanded: false, note: "SEALED — named, never opened, never listed, never expanded" });
    }
    return ok({ root: ref.root, ref: ref.ref, role: entry.role, registryId: entry.id, contentHash: ref.contentHash ?? null, expanded: false, tenantId: ref.tenantId ?? null });
  }

  /** The view every read path returns. Migration status and the three authority values are always present. */
  function view(event) {
    return Object.freeze({
      eventId: event.eventId,
      eventType: event.eventType,
      action: event.action,
      outcome: event.outcome,
      reasonCode: event.reasonCode,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      actor: event.actor,
      actorType: event.actorType,
      scopeType: event.scopeType,
      tenantId: event.tenantId,
      subjectId: event.subjectId,
      softwareVersion: event.softwareVersion,
      correlationId: event.correlationId,
      parentEventId: event.parentEventId,
      eventHash: event.eventHash,
      previousEventHash: event.previousEventHash,
      authority: authorityView(event),
      evidence: (event.evidenceRefs ?? []).map(evidenceView),
      // 🔴 SURFACED ON EVERY READ PATH — never a flag a reader may ignore.
      migrationStatus: event.migration === true ? "MIGRATED" : "NATIVE",
      migrationSource: event.migrationSource ?? null,
      migratedAt: event.migratedAt ?? null,
      migrationNote: event.migration === true ? MIGRATION_NOTE : null,
      // 🔴 The third time-world, shown. A flag no reader shows is not a flag.
      timeAnomaly: event.metadata?.timeAnomaly ?? null,
      metadata: event.metadata ?? {},
    });
  }

  function byId(eventId) {
    const g = guard();
    if (g) return g;
    if (typeof eventId !== "string" || eventId.trim() === "") return invalid("EVENT_ID_MALFORMED", "an event id is required");
    const e = store.readAll().events.find((x) => x.eventId === eventId);
    if (!e) return unavailable("EVENT_NOT_FOUND", `no event is held under ${eventId}`);
    return ok({ event: view(e) });
  }

  /** 🔴 TENANT FILTER — EQUALITY ON THE DECLARED OPAQUE ID, AND NOTHING ELSE. A GLOBAL_PRODUCT event has no tenant,
   *  so it is not "everyone's": it is excluded too. Zero events from any other tenant can survive this. */
  function byTenant(tenantId) {
    const g = guard();
    if (g) return g;
    if (typeof tenantId !== "string" || !TENANT_ID_PATTERN.test(tenantId)) {
      return invalid("TENANT_ID_NOT_OPAQUE", "a tenant filter takes a declared opaque tenant identifier — never a host, product, path or name");
    }
    const events = store.readAll().events.filter((e) => e.scopeType !== "GLOBAL_PRODUCT" && e.tenantId === tenantId);
    return ok({ tenantId, events: events.map(view), count: events.length });
  }

  function byCorrelation(correlationId) {
    const g = guard();
    if (g) return g;
    if (typeof correlationId !== "string" || correlationId.trim() === "") return invalid("CORRELATION_ID_MALFORMED", "a correlation id is required");
    const events = store.readAll().events.filter((e) => e.correlationId === correlationId);
    if (events.length === 0) return unavailable("CORRELATION_NOT_FOUND", `no event is held under correlation ${correlationId}`);
    return ok({ correlationId, events: events.map(view), count: events.length });
  }

  /** The ancestry of an event, child-first, following parentEventId. A parent that is not held is INVALID. */
  function parentChain(eventId) {
    const g = guard();
    if (g) return g;
    const all = store.readAll().events;
    const start = all.find((x) => x.eventId === eventId);
    if (!start) return unavailable("EVENT_NOT_FOUND", `no event is held under ${eventId}`);
    const chain = [start];
    const seen = new Set([start.eventId]);
    let cur = start;
    while (cur.parentEventId) {
      if (seen.has(cur.parentEventId)) return invalid("PARENT_CYCLE", `the parent chain from ${eventId} cycles`);
      const next = all.find((x) => x.eventId === cur.parentEventId);
      if (!next) return invalid("PARENT_NOT_FOUND", `${cur.eventId} names parent ${cur.parentEventId}, which this store does not hold — an unresolvable reference is INVALID`);
      seen.add(next.eventId);
      chain.push(next);
      cur = next;
    }
    return ok({ eventId, chain: chain.map(view), depth: chain.length });
  }

  function all() {
    const g = guard();
    if (g) return g;
    const events = store.readAll().events;
    return ok({ events: events.map(view), count: events.length });
  }

  /** Chain verification, with the boundary stated in the output — including what it does NOT detect. */
  function integrity() {
    const v = store.verify();
    return { status: v.ok ? "OK" : "INVALID", ...v, boundary: DETECTION_BOUNDARY };
  }

  return { byId, byTenant, byCorrelation, parentChain, all, integrity, view, authorityView, evidenceView };
}
