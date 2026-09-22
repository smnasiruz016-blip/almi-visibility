# Row 5 — mechanism spec, FROZEN BEFORE MEASUREMENT (§3D)

Written 22 Sep 2026 before any mechanism below was run against the reference or the held-out population. After
this file's sha256 is recorded, no definition or parameter may change; a mechanism that measures badly is dropped,
never tuned. Every mechanism is FITTED from the IN-SAMPLE rows and the declared lexicon only. None reads the
reference, a held-out row, or held-out membership. Each has a three-world rule: JOIN · KEEP SEPARATE · UNKNOWN (no join).

## Author exposure — declared, not hidden (§3B)
Before this spec was written, the author had read held-out wording in mandatory governance text:
- the frozen verdict of Row 5 (`CHECKLIST_BOUNDARIES.md:347`), which §1 orders quoted;
- `_handoffs/AlmiVisibility_ROW5_FEATURE_RESULT_2026-09-18.md` §2 and §3;
- the author's own 19 Sep memory, which also records the three prior "lawful" mechanisms.

The mechanism FAMILIES below are the owner's list A–L. Their parameters are fixed by the generic principles
stated, and none is a word, pair or threshold chosen to reach a known held-out row. Where that cannot be said
truthfully, the mechanism says so and is ineligible (§3B).

## Definitions (a token is a key token after the production normalisation, unless stated)

**A · Unicode.** Apply NFKC compatibility folding and Unicode case folding BEFORE the production surface
function. Three worlds: a compatibility character joins its base form · different base letters stay apart ·
nothing is ambiguous. Parameters: none.

**B · Punctuation/spacing.** Delete apostrophes (U+0027, U+2019) instead of spacing them. Join a hyphenated pair
into one token only when the joined form is an in-sample token; otherwise keep production behaviour. UNKNOWN
(no change) otherwise.

**C · Conservative plural.** A token t of length ≥ 4 is reduced to a stem s when t = s+"s" (or s+"es", or
y-stem+"ies"). Precision: s must be ANCHORED, meaning it is a declared lexicon value, a synonym key or target, or a
phrase target (C1 = declared-anchored), and t itself is not declared. JOIN if exactly one candidate stem is
anchored; UNKNOWN if two are. C2 (a separate candidate) also admits an anchor that is an in-sample key token.
Parameters: minimum length 4, and the three suffix rules. Both are fixed by the principle "the stem must already
be a word the system holds".

**D · Token order.** Keys are compared as sets. This is the production state already; measured as a control.

**E · Acronyms from declared multi-word values.** For every declared multi-word value (a slot value containing
"_", or a multi-word phrase target) derive its initials. Map a key token equal to those initials to that value.
Precision: the initials have ≥ 2 letters, are unique among all derived initials, and are not a declared word or
filler. A collision means UNKNOWN (no mapping). Derived at runtime and never written into the lexicon.

**F · Compound segmentation.** A key token t that is the exact concatenation a+b of two DECLARED lexicon words
(each ≥ 3 letters) is replaced by a and b. A second split point makes it UNKNOWN (no split).

**G · Edit similarity.** An in-sample-unseen key token t (length ≥ 6) is rewritten to the in-sample key token u
when Levenshtein(t,u) = 1, u has length ≥ 6, and u is the UNIQUE such token. Two candidates, or none, leave t
unchanged. Parameters: length ≥ 6 and distance 1, the most conservative typo rule.

**H · Rare-anchor containment.** A held-out query that would be left NEW joins in-sample cluster c only when all
three hold:
- every key token of c's members' shared core (the key tokens present in ALL of c's members) is in the query's key;
- that core contains at least one token of in-sample df ≤ 2 (the rare anchor);
- c is the ONLY cluster satisfying both.

Two or more such clusters is UNKNOWN (stays NEW).

**I · Reciprocal nearest neighbour.** A held-out query q placed in cluster c keeps the placement only if no
other in-sample cluster scores within 0.05 of c for q, i.e. the best is unambiguous. A near-tie makes it UNKNOWN
(NEW). Additionally, two held-out queries both left NEW are joined when each is the other's nearest among the NEW
set AND their similarity ≥ THRESHOLD (0.5, unchanged). I can only remove a join, or join held-out to held-out at
the unchanged threshold.

**J · Transitivity.** Final record built by single-linkage (connected components at similarity ≥ 0.5) over the
whole population's keys with in-sample idf. A chain whose endpoints score < 0.5 is still joined — J is measured
as the risk it is.

**K · In-sample co-occurrence substitution.** Tokens a and b are SUBSTITUTABLE when at least 2 distinct
in-sample contexts X exist such that X∪{a} and X∪{b} are both in-sample keys (X non-empty). Rewrite b → a
(lexicographically first as the representative). Two representatives make it UNKNOWN. Parameter m = 2, fixed as
"one co-occurrence is chance".

**L · Multilingual surface.** A + transliteration of Latin-script diacritics already done by production; add
removal of the Spanish/Portuguese/Italian/French elision and article forms ONLY where the lexicon declares them
as filler. The lexicon declares none, so L = A in effect; measured as declared.

## Eligibility (applied mechanically after measurement)
- product-neutral;
- reads no expected answer;
- fitting reads no held-out row and no reference id;
- 0 distinct-intent merges;
- closes ≥ 1 real split;
- precision enforced by a structural rule, not a list.

C, E, F and G use the DECLARED lexicon as their anchor, which is already-declared subject data, not new data.
