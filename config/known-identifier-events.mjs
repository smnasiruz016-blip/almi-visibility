/**
 * 🔴 F08 · THE REGISTER OF AUDIT-TRAIL EVENTS KNOWN TO CARRY AN IDENTIFIER THEY MUST NOT (12 October 2026, RR-251).
 *
 * The law (test/audit-trail.test.mjs, P31): audit records carry ZERO client or product identifiers. The trail is append-only and is never
 * reset, so an event that broke the law cannot be removed. Each such event is DECLARED here — pinned by its id AND by the sha256 of its
 * exact line — and the guard sets aside exactly those lines and nothing else. An event not declared here still turns the guard red; a
 * declared event whose line no longer hashes to its pin turns it red too.
 *
 * Every value is an id, a hash, a count or a committed-record pointer. The identifier itself is never repeated here.
 *
 * 🔴 EACH ENTRY IS A DEFECT, NOT A PERMISSION. An entry is added only with the owner's word; `ownerRatification` says where that word is.
 */
export const KNOWN_IDENTIFIER_EVENTS = Object.freeze([
  Object.freeze({
    eventId: "0a2760485ad570aa27c728b847f0a89e",
    eventType: "AUTHORITY_RESOLUTION",
    trailLineWhenDeclared: 7389,
    lineSha256: "f3d1e288965aca7296ef1fdd4d879160ff1770c97cb6e9689203d2c5fb7233d8",
    field: "authorityRef.propositionId",
    cause: "an owner-decision record was committed under an admitted file name that carried a client's product name; an admitted name becomes the record's proposition id, and the migration's resolution event carries that id",
    repair: "the record was renamed to a neutral admitted name (bytes unchanged) and the register regenerated; the trail was NOT reset, so this one event stays as the true record of what was admitted at that moment",
    evidenceRecord: "_handoffs f7cd82179d8f1b1c74cbe49cdfb3cb413736f835 AlmiVisibility_RR-251_INCIDENT_CLIENT_WORD_IN_AN_ADMITTED_NAME_2026-10-12.md",
    evidenceSha256: "f41d9df0ff16ab9f972f3e0fc7865082cc8f103f750235fcc958ffa11d20c44c",
    ownerRatification: "RATIFIED 2026-10-12 — the owner, RR-252 answer 1 (keep it; one line, one declared exception, no reset): _handoffs 38d6e9182e1cc9c5b09a4c8109f27e6300bd6c4a AlmiVisibility_OWNER_DECISION_2026-10-12_RR-252_MERGE_ANSWERS.md",
  }),
  Object.freeze({
    eventId: "c087af48e3cfe1d383c544fe12a2f380",
    eventType: "AUTHORITY_RESOLUTION",
    trailLineWhenDeclared: 9077,
    lineSha256: "5e6b84409d72f48a6cbf733e3d7cfb826c28be6d82a21edca2423d1099a5c5fa",
    field: "authorityRef.propositionId",
    cause: "RR-283: the authority migration admitted an owner-decision record committed (by another hand) under a file name that carried a client's product name; an admitted name becomes the record's proposition id, and the migration's resolution event carries that id",
    repair: "the record was renamed to a neutral admitted name (bytes unchanged) and the corpus regenerated; the trail was NOT reset, so this one event stays as the true record of what was admitted at that moment",
    evidenceRecord: "_handoffs 6c5545c73a8a8c75e5e701e06f26c3db27949e3f AlmiVisibility_RR-283_INCIDENT_CLIENT_WORD_IN_AN_ADMITTED_NAME_2026-10-17.md",
    evidenceSha256: "6bd89f68cb67d9b8689f34478740b3931c51c456a9432411f34e7b1a99e53a64",
    ownerRatification: "PENDING — not yet ratified: the same class the owner ratified for RR-251 (RR-252 answer 1: keep the line, declare it, never reset); asked at the top of the RR-283 report, and removed if he refuses",
  }),
]);
