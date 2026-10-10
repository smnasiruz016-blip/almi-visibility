/**
 * 🔴 F07 AMENDMENT 4 · A KNOWN OUT-OF-BAND READ, RECORDED AS WHAT IT IS (RR-246, 10 October 2026).
 *
 * Owner ruling RR-80 §5 (_handoffs bba3446): "a limit never licenses the thing it cannot see". A read of a governed sealed store
 * outside the governed paths that becomes KNOWN is a FAILURE event for the set it read: it is REPRESENTED, never repaired. One
 * AUDIT_CORRECTION event per declared correction (config/known-out-of-band-reads.mjs) names every known read — when, by what
 * class of tool, which sides — count-only. It never carries a sealed value, a store location or a file inside a store, and it
 * never claims an ACCESS record exists for any of the reads: `accessRecorded` must say NO, and `treatment` must say
 * REPRESENTED_NOT_REPAIRED, or no draft is made.
 *
 * Its occurredAt is the moment the CORRECTION is recorded. The reads' own instants are carried as recorded in the evidence.
 */
export const KNOWN_READS_EVENT = Object.freeze({ eventType: "AUDIT_CORRECTION", action: "RECORD_KNOWN_OUT_OF_BAND_READS", reasonCode: "SEALED_READ_OUTSIDE_GOVERNED_PATHS" });

const REQUIRED = ["correctionId", "knownReads", "reads", "setsRead", "accessRecorded", "treatment", "setsTreatedAs", "evidenceRecord", "evidenceSha256", "ruling", "amendment"];
/* a read is "<n> <ISO instant> <TOOL_CLASS> <SIDES>" — classes and sides are words, never a path */
const READ_SHAPE = /^[1-9][0-9]* \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z [A-Z_]+ [A-Z_]+(,[A-Z_]+)*( · [a-z0-9 ,]+)?$/;

/** Every reason a declared correction may not become an event. `[]` means it may. */
export function knownReadsFaults(c) {
  const out = [];
  for (const k of REQUIRED) if (c?.[k] === undefined || c[k] === null || c[k] === "" || (Array.isArray(c[k]) && !c[k].length)) out.push({ code: "CORRECTION_FIELD_ABSENT", field: k });
  const reads = Array.isArray(c?.reads) ? c.reads : [];
  if (!(Number.isInteger(c?.knownReads) && c.knownReads > 0 && c.knownReads === reads.length)) out.push({ code: "CORRECTION_COUNT_MISMATCH", field: "knownReads" });
  reads.forEach((r, i) => { if (!READ_SHAPE.test(String(r)) || !String(r).startsWith(`${i + 1} `)) out.push({ code: "CORRECTION_READ_MALFORMED", field: `reads[${i}]` }); });
  if (!/^NO\b/.test(String(c?.accessRecorded ?? ""))) out.push({ code: "CORRECTION_CLAIMS_ACCESS_RECORDED", field: "accessRecorded" });
  if (c?.treatment !== "REPRESENTED_NOT_REPAIRED") out.push({ code: "CORRECTION_CLAIMS_REPAIR", field: "treatment" });
  if (!/^DISCLOSED\b/.test(String(c?.setsTreatedAs ?? ""))) out.push({ code: "CORRECTION_SETS_NOT_DISCLOSED", field: "setsTreatedAs" });
  if (!(Array.isArray(c?.setsRead) && c.setsRead.length && c.setsRead.every((s) => /^sealed:[a-z0-9-]+$/.test(String(s))))) out.push({ code: "CORRECTION_SETS_UNNAMED", field: "setsRead" });
  if (!/^[0-9a-f]{64}$/.test(String(c?.evidenceSha256 ?? ""))) out.push({ code: "CORRECTION_EVIDENCE_UNPINNED", field: "evidenceSha256" });
  return out;
}

/**
 * The draft for one correction. Throws on any fault — nothing partial, nothing defaulted. Flat metadata: each read is its own key.
 * @param {object} o
 * @param {object} o.correction  one KNOWN_OUT_OF_BAND_READS entry
 */
export function knownReadsEventDraft({ correction, occurredAt, softwareVersion, authorityRef, authorityHash, correlationId }) {
  const faults = knownReadsFaults(correction);
  if (faults.length) throw new Error(`CORRECTION_REFUSED: ${faults.map((f) => `${f.code}(${f.field})`).join(", ")}`);
  const metadata = { correctionId: correction.correctionId, identitySubject: correction.correctionId, knownReads: correction.knownReads };
  correction.reads.forEach((r, i) => { metadata[`read${i + 1}`] = String(r); });
  for (const k of ["accessRecorded", "treatment", "setsTreatedAs", "evidenceRecord", "evidenceSha256", "ruling", "amendment", "guard", "searchLimit"]) if (correction[k] !== undefined) metadata[k] = correction[k];
  metadata.setsRead = correction.setsRead.join(",");
  return {
    ...KNOWN_READS_EVENT,
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
    metadata,
  };
}

/** Declared corrections that are not yet on the trail — one event per correction, ever. */
export const correctionsNotOnTrail = (corrections, events) =>
  corrections.filter((c) => !events.some((e) => e.eventType === KNOWN_READS_EVENT.eventType && e.action === KNOWN_READS_EVENT.action && e.metadata?.correctionId === c.correctionId));
