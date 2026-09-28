/**
 * 🔴 DISCLOSED SEALS — sealed evaluation sets whose membership-blind evidence class has been PERMANENTLY withdrawn.
 *
 * A seal is listed here only by a frozen acceptance amendment that says so, and the entry names that amendment by both hashes.
 * For a listed seal, every result is stated ONLY in the weaker evidence class below, it is stored only in a store whose path
 * names that class, and the row it belongs to can never be VERIFIED-PASS while the seal is its registered set
 * (src/fboard/board.mjs VERIFIED_ON_DISCLOSED_SEAL). Copied from committed governance, never authored here.
 */
export const DISCLOSED_POPULATION_AGREEMENT = "DISCLOSED_POPULATION_AGREEMENT";

export const DISCLOSED_SEALS = Object.freeze([
  Object.freeze({
    featureId: "F10",
    evidenceClass: DISCLOSED_POPULATION_AGREEMENT,
    meaning: "agreement with independent owner labels on a DISCLOSED selected population — never membership-blind, never held-out generalisation; closes nothing",
    /* the registered sets of THIS seal, by id and by commitment — both must match for the disclosure to apply */
    sets: Object.freeze([
      Object.freeze({ id: "sealed:f10-c3-selection", contentHash: "cebcea248fad779fd147de1c8c819693baeb2246037b185fe7f43dab0f932e31" }),
      Object.freeze({ id: "sealed:f10-c7-pairs", contentHash: "14023fc21ab7b05de403b97540801e98968168d81a15d57369cb38ae9aa32712" }),
    ]),
    authority: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F10_ACCEPTANCE_AMENDMENT_3_2026-09-28.md", commit: "9c8b9f761d93bc9634bec019f7df7c06250b6aba", sha256: "5898073725d2787ff50c4cdb3aa3bfa514048456bf72b1ce4cf70ab586ea34d7", contractSha256: "fe38acfe8d3fa9faaf49ebe6643324a35e3e1156e9a479a25a4dd7ca421f244b" }),
    disclosure: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F10_C3_INCIDENT_CLASSIFICATION_2026-09-28.md", commit: "be583fa523427593debe259da1134cd6ca6a62cb", sha256: "63c6c54b9c564984f1f7d2c3ecf53cfd57acfbe7098d1d787ce0475d023a4f21" }),
  }),
]);
