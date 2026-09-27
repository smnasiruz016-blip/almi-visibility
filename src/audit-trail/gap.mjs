/**
 * 🔴 F08 · AN AUDIT GAP, RECORDED AS WHAT IT IS (27 September 2026).
 *
 * One AUDIT_CORRECTION event per declared gap (config/audit-gaps.mjs). The event RECORDS THE GAP: it says events were
 * appended and later removed, how many, when (as a window), what the evidence is, and which later events replace
 * nothing. It never carries, re-derives or claims a lost event. `lostEventsRecordedHere` is the literal `false`, and a
 * gap that claims otherwise is refused before a draft exists.
 *
 * Its occurredAt is the moment the CORRECTION is recorded, which is what the event is about. The lost events' own
 * times are unknown and are never supplied here.
 */
export const GAP_EVENT = Object.freeze({ eventType: "AUDIT_CORRECTION", action: "RECORD_AUDIT_TRAIL_GAP", reasonCode: "AUDIT_EVENTS_REMOVED_AFTER_APPEND" });

const REQUIRED = ["gapId", "lostEvents", "lostAccessEvents", "originalRecordsExist", "lostEventBytes", "lostEventIds", "evidenceRecord", "evidenceSha256", "replacementIsSameReads"];

/** Every reason a declared gap may not become an event. `[]` means it may. */
export function gapFaults(gap) {
  const out = [];
  for (const k of REQUIRED) if (gap?.[k] === undefined || gap[k] === null || gap[k] === "") out.push({ code: "GAP_FIELD_ABSENT", field: k });
  if (!(Number.isInteger(gap?.lostEvents) && gap.lostEvents > 0)) out.push({ code: "GAP_COUNT_INVALID", field: "lostEvents" });
  if (!(Number.isInteger(gap?.lostAccessEvents) && gap.lostAccessEvents >= 0 && gap.lostAccessEvents <= gap.lostEvents)) out.push({ code: "GAP_COUNT_INVALID", field: "lostAccessEvents" });
  if (gap?.originalRecordsExist !== "NO") out.push({ code: "GAP_CLAIMS_RECORDS_EXIST", field: "originalRecordsExist" });
  if (!/^UNRECOVERABLE\b/.test(String(gap?.lostEventBytes ?? ""))) out.push({ code: "GAP_CLAIMS_RECOVERED_BYTES", field: "lostEventBytes" });
  if (!/^UNRECOVERABLE\b/.test(String(gap?.lostEventIds ?? ""))) out.push({ code: "GAP_CLAIMS_RECOVERED_IDS", field: "lostEventIds" });
  if (!/^NO\b/.test(String(gap?.replacementIsSameReads ?? ""))) out.push({ code: "GAP_CLAIMS_REPLACEMENT_RECORDS_THE_LOST", field: "replacementIsSameReads" });
  if (!/^[0-9a-f]{64}$/.test(String(gap?.evidenceSha256 ?? ""))) out.push({ code: "GAP_EVIDENCE_UNPINNED", field: "evidenceSha256" });
  return out;
}

/**
 * The draft for one gap. Throws on any fault — nothing partial, nothing defaulted.
 * @param {object} o
 * @param {object} o.gap              one AUDIT_GAPS entry
 * @param {string} o.occurredAt       the instant the correction is recorded
 * @param {string} o.softwareVersion
 * @param {object} o.authorityRef     F08's acceptance, as the recorder's native events use it
 * @param {string} o.authorityHash
 * @param {string} o.correlationId
 */
export function gapEventDraft({ gap, occurredAt, softwareVersion, authorityRef, authorityHash, correlationId }) {
  const faults = gapFaults(gap);
  if (faults.length) throw new Error(`GAP_REFUSED: ${faults.map((f) => `${f.code}(${f.field})`).join(", ")}`);
  const metadata = { identitySubject: gap.gapId, lostEventsRecordedHere: false };
  for (const [k, v] of Object.entries(gap)) if (k !== "gapId") metadata[k] = v;
  return {
    ...GAP_EVENT,
    outcome: "RECORDED",
    occurredAt,
    actor: "bin/audit-trail.mjs",
    actorType: "ENGINE",
    scopeType: "GLOBAL_PRODUCT",
    tenantId: null,
    subjectId: null,
    authorityRef,
    authorityHash,
    softwareVersion,
    evidenceRefs: [],
    correlationId,
    parentEventId: null,
    migration: false,
    migrationSource: null,
    migratedAt: null,
    metadata: { gapId: gap.gapId, ...metadata },
  };
}

/** Declared gaps that are not yet on the trail — one event per gap, ever. */
export const gapsNotOnTrail = (gaps, events) =>
  gaps.filter((g) => !events.some((e) => e.eventType === GAP_EVENT.eventType && e.metadata?.gapId === g.gapId));
