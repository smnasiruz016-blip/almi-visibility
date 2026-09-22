/**
 * 🔴 RETIRED — ROW 5's REFERENCE PLACEMENT (the expected-answer map, the marking key for intent clustering) IS NO
 * LONGER IN THE ENGINE.
 *
 * The owner's ruling of 22 September 2026 (_handoffs a5452ee, clarified by f4367b1) retired the Row 5 held-out
 * population (set fingerprint 3d4951d6…, population 61) as RETIRED_CONTAMINATED. The reference that scored it was an
 * expected-answer map over that population and is therefore no longer lawful evidence. Removing it takes away no lawful
 * capability.
 *
 * WHAT REMAINS HERE IS METADATA ONLY: no query, no intent label, no placement. The original bytes remain ONLY in Git
 * history (blob 6c27a872de8101b73d19bf4653d25657e55dba16, introduced in dd15acfab9d8e89de6b535bd6be22c15e017e40d) and
 * must not be used as held-out, unseen, marking-key or expected-answer evidence.
 *
 * 🔴 CONSEQUENCE, BY NAME: Row 5 scoring FAILS CLOSED with HELD_OUT_REFERENCE_RETIRED. It never reports an empty
 * reference, zero defects or PASS. Clustering itself never read the reference, and still runs: rows that consume
 * only the clusters (row 6) keep their lawful path.
 */
export const INTENT_REFERENCE = null;
export const AMBIGUOUS = null;
export const AMENDMENTS = Object.freeze([]);
export const REFERENCE_AUTHOR = null;
export const REFERENCE_STATUS = Object.freeze({
  state: "HELD_OUT_REFERENCE_RETIRED",
  role: "RETIRED_CONTAMINATED",
  retiredSetFingerprint: "3d4951d6673301bc",
  population: 61,
  originalBlob: "6c27a872de8101b73d19bf4653d25657e55dba16",
  introducedIn: "dd15acfab9d8e89de6b535bd6be22c15e017e40d",
  rulings: Object.freeze(["_handoffs/AlmiVisibility_OWNER_RULING_2026-09-22_RETIRED_CONTAMINATED_HELDOUT.md", "_handoffs/AlmiVisibility_OWNER_RULING_2026-09-22_HELDOUT_ROLE_SCOPE.md"]),
});
