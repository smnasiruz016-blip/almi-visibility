/**
 * 🔴 F08 · AUTHORITY ADMISSIONS RECORDED WITH A WRONG DISPOSITION, CORRECTED AS WHAT THEY ARE (RR-272, 16 October 2026).
 *
 * A family-A admission (src/audit-trail/population.mjs familyACandidates) records the disposition the corpus in force gave a record. A
 * corpus migrated with a wrong day judges records after that day NOT_APPLICABLE ("not yet effective"); the admissions recorded from it
 * are wrong, and the trail never overwrites them — an id already held refuses a different event (EVENT_ID_CONFLICT). One
 * AUDIT_CORRECTION event per declared correction (config/known-wrong-admissions.mjs) names each wrong admission by its event id, the
 * disposition it stored and the one in force, and the cause. It rewrites nothing and re-derives nothing: `treatment` must say
 * REPRESENTED_NOT_REWRITTEN, or no draft is made.
 *
 * Its occurredAt is the moment the CORRECTION is recorded.
 */
import { METADATA_MAX_VALUE_CHARS } from "./event.mjs";

export const WRONG_ADMISSIONS_EVENT =Object.freeze({ eventType: "AUDIT_CORRECTION", action: "RECORD_WRONG_AUTHORITY_ADMISSIONS", reasonCode: "ADMISSION_JUDGED_ON_A_WRONG_DAY" });

const REQUIRED = ["correctionId", "wrongAdmissions", "admissions", "cause", "repair", "treatment", "evidenceRecord", "evidenceSha256"];
/* an admission is "<n> <32-hex event id> <stored disposition> -> <disposition in force> <authority id>" */
const ADMISSION_SHAPE = /^[1-9][0-9]* [0-9a-f]{32} [A-Z_]+ -> [A-Z_]+ \S+$/;

/** Every reason a declared correction may not become an event. `[]` means it may. */
export function wrongAdmissionsFaults(c) {
  const out = [];
  for (const k of REQUIRED) if (c?.[k] === undefined || c[k] === null || c[k] === "" || (Array.isArray(c[k]) && !c[k].length)) out.push({ code: "CORRECTION_FIELD_ABSENT", field: k });
  const list = Array.isArray(c?.admissions) ? c.admissions : [];
  if (!(Number.isInteger(c?.wrongAdmissions) && c.wrongAdmissions > 0 && c.wrongAdmissions === list.length)) out.push({ code: "CORRECTION_COUNT_MISMATCH", field: "wrongAdmissions" });
  list.forEach((a, i) => {
    const s = String(a);
    if (!ADMISSION_SHAPE.test(s) || !s.startsWith(`${i + 1} `)) out.push({ code: "CORRECTION_ADMISSION_MALFORMED", field: `admissions[${i}]` });
    else { const [, , stored, , inForce] = s.split(" "); if (stored === inForce) out.push({ code: "CORRECTION_NAMES_NO_DIFFERENCE", field: `admissions[${i}]` }); }
  });
  if (c?.treatment !== "REPRESENTED_NOT_REWRITTEN") out.push({ code: "CORRECTION_CLAIMS_REWRITE", field: "treatment" });
  if (!/^[0-9a-f]{64}$/.test(String(c?.evidenceSha256 ?? ""))) out.push({ code: "CORRECTION_EVIDENCE_UNPINNED", field: "evidenceSha256" });
  /* each value becomes one metadata value: one the trail would refuse as too long is refused here, before any draft or authorisation */
  for (const [k, v] of Object.entries(c ?? {})) for (const [i, s] of (Array.isArray(v) ? v : [v]).entries()) if (typeof s === "string" && s.length > METADATA_MAX_VALUE_CHARS) out.push({ code: "CORRECTION_VALUE_TOO_LONG", field: Array.isArray(v) ? `${k}[${i}]` : k });
  return out;
}

/** The event ids a declared correction names — the wrong admissions it represents. */
export const correctedAdmissionIds = (c) => (Array.isArray(c?.admissions) ? c.admissions.map((a) => String(a).split(" ")[1]) : []);

/** The draft for one correction. Throws on any fault — nothing partial, nothing defaulted. Flat metadata: each admission its own key. */
export function wrongAdmissionsEventDraft({ correction, occurredAt, softwareVersion, authorityRef, authorityHash, correlationId }) {
  const faults = wrongAdmissionsFaults(correction);
  if (faults.length) throw new Error(`CORRECTION_REFUSED: ${faults.map((f) => `${f.code}(${f.field})`).join(", ")}`);
  const metadata = { correctionId: correction.correctionId, identitySubject: correction.correctionId, wrongAdmissions: correction.wrongAdmissions };
  correction.admissions.forEach((a, i) => { metadata[`admission${i + 1}`] = String(a); });
  for (const k of ["cause", "repair", "treatment", "evidenceRecord", "evidenceSha256", "decision"]) if (correction[k] !== undefined) metadata[k] = correction[k];
  return {
    ...WRONG_ADMISSIONS_EVENT,
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
export const wrongAdmissionsNotOnTrail = (corrections, events) =>
  corrections.filter((c) => !events.some((e) => e.eventType === WRONG_ADMISSIONS_EVENT.eventType && e.action === WRONG_ADMISSIONS_EVENT.action && e.metadata?.correctionId === c.correctionId));
