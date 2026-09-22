/**
 * 🔴 FROZEN ACCEPTANCES OF THE ACTIVE F-BOARD — COPIED FROM COMMITTED RULINGS, NEVER AUTHORED HERE.
 *
 * Each entry is parsed (src/fboard/acceptance.mjs) from the ruling's committed bytes in the governance repository, and
 * pinned to BOTH the ruling's sha256 and the contract's own sha256 under the declared normalisation. The engine never
 * writes an acceptance: a change to any clause here without a new committed ruling turns the pins red.
 */
export const ACCEPTANCES = Object.freeze({
  F05: Object.freeze({
    featureId: "F05",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-22_F05_ACCEPTANCE.md", commit: "58685998b08fafb8bf3d6b1b7da9a2becf3fe004", sha256: "035ae68d09de3378a18d4935af146308fdeef34ab21f5121dde4db47fb3a1f70" }),
    // 🔴 §6A — the ruling is resolved through the register like any other record; the board accepts this acceptance only
    // while that resolution is CURRENT and names these exact bytes.
    authority: Object.freeze({ propositionId: "OWNER_RULING_F05_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F05"]) }),
    frozenOn: "2026-09-22",
    feature: "F05 · Current Authority Register",
    input: "Dated authority records whose proposition, governed scope, issuer,\neffective time, source and supersession relationship are declared.",
    expected: "For an exact proposition and requested scope, the resolver returns exactly\none CURRENT applicable authority, or an explicit ABSENT or OPEN_CONFLICT.\nA newer applicable ruling supersedes an older conflicting ruling only\ninside its declared scope. Superseded records remain immutable audit\nhistory and are never applied.",
    failure: "An older rule is applied after a newer applicable rule; a narrow ruling\nsupersedes unrelated scope; an unresolved conflict or absence quietly\nproduces permission; historical 61/38 material becomes F-row authority; or\nhistorical state transfers without fresh F-row verification.",
    evidence: "The resolver exercised over the real committed authority corpus, with every\napplicable authority accounted for, plus firing and clean controls for\nnewer-over-older, narrow-scope containment, equal-authority conflict,\nabsence, historical-only input and malformed provenance.",
    contractSha256: "942308f9d58f5c2960a49f6b4abe00b1a1899ebee813cadb715b6e881e4cf68d",
  }),
});
