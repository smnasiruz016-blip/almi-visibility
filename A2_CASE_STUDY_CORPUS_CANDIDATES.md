# A2 — CASE STUDY CORPUS: PRE-FIX COMMIT CANDIDATES

**10 September 2026. Candidates for the owner's ruling. Nothing is frozen here.**
Four of the six RED defects (1, 4, 5, 6) are fixed on live sites, so they cannot be tested
against production. Each needs a pinned commit where the defect was still **present** — and
for each, presence is **proved**, not asserted.

**FREEZE LAW reminder:** once the owner rules, neither I nor any later implementation may
change this test to match the engine's behaviour.

---

## SUMMARY

| RED | repo | 🔴 **candidate pin (defect PRESENT)** | fix commit | proved from the repo alone? |
|---|---|---|---|---|
| **1** | `almi-oet` | **`8877c6e`** | `4ed34bb` (#56) | ✅ **yes** |
| **4** | `almi-italian` | **`d83ddd9`** (#43) | `a191883` (#44) | ✅ **yes** |
| **5** | `almi-oet` | **`e99b199`** (#102) | `45355be` (#103) | ✅ **yes** |
| **6** | `almi-italian` | **`14a0f7d`** (#62) | `a2a6a2a` (#63) | ⚠️ **no — needs a BUILD** |

**Three of four are provable from source alone. The fourth cannot be, and that is the whole
point of its defect class.**

---

## RED 1 — a public promise of a grade band the engine never issued

**Candidate pin: `8877c6e`** — `test(scale): 44 tests on the file that graded 200-240 as D for
27 days (#55)`, the parent of the fix `4ed34bb` *"the public pages promised an A-E grade the
engine has never given (#56)"*.

### 🔴 Proof the defect is present at `8877c6e`

**What the engine could issue at that exact commit** — `src/lib/oet/scale.ts`:

```js
const GRADE_FLOORS = [
  { grade: "A",  floor: 450 },
  { grade: "B",  floor: 350 },
  { grade: "C+", floor: 300 },
  { grade: "C",  floor: 200 },
];
export function gradeForScore(score) { … return null; }
```

**Four letters. A, B, C+, C. No D. No E.** Below 200 it returns `null`, and the file exports
`BELOW_PUBLISHED_BANDS = "below the published grade bands"` for exactly that case.

**What the public surfaces promised at the same commit** — twelve instances found by grep,
including the site metadata that appears on every page:

```
src/app/layout.tsx:18       "…with an A–E grade per sub-test…"     <- every page
src/app/layout.tsx:24       "…with an A–E grade per sub-test…"
src/app/page.tsx:21,25,35,56,190
src/app/pricing/page.tsx
src/app/(auth)/signup/page.tsx:73
src/app/(app)/practice/mock/page.tsx:47
src/app/(app)/practice/[profession]/page.tsx:196
src/app/(app)/practice/[profession]/[task]/page.tsx:85
```

**This is a better exhibit than the `scale.ts` overall-score flip-flop originally pinned**, and
I recommend it instead: the flip-flop is a *disputed external fact*, whereas this is exactly
RED 1's class — **the product's own public surfaces promising a band its own scoring code
cannot produce**, and the mismatch is decidable from two files in the same commit.

*(The `scale.ts` alternative remains available: `de75091` (#64) removed the unsourced "OET
reports an overall score since January 2025"; its parent holds that assertion.)*

**What counts as FOUND:** the ledger names the grade claim, says the engine issues only four
letters, and points at the file — without being told the file.

---

## RED 4 — a sitemap URL that 404s, redirects, or is non-indexable

**Candidate pin: `d83ddd9`** — `almi-italian`, *"Migrate /guides to /learn with a corpus-wide
engine-token mechanism (#43)"*, the parent of the fix `a191883` *"Drop the 52 /learn articles,
and point the /guides redirects at pages that exist (#44)"*.

### 🔴 Proof — and it is stronger than the recorded lesson

`next.config.ts` at `d83ddd9` declares nine article redirects, 301, on **live indexed URLs**:

```
/guides/cils-b1-cittadinanza        -> /learn/cils-b1-cittadinanza
/guides/a2-or-b1                    -> /learn/a2-or-b1
/guides/how-italian-exams-score     -> /learn/how-italian-exams-score
/guides/capitalizzazione            -> /learn/capitalizzazione
/guides/2025-citizenship-reform     -> /learn/2025-citizenship-reform
/guides/reacquire-citizenship-2027  -> /learn/reacquire-citizenship-2027
/guides/celi-results-timeline       -> /learn/celi-results-timeline
/guides/cils-vs-celi                -> /learn/cils-vs-celi
/guides/exam-dates                  -> /learn/exam-dates
```

`src/lib/learn/articles.ts` at the same commit builds every route from `content/learn/*.md`.
**`content/learn/` at `d83ddd9` contains exactly two files:**

```
content/learn/scaffold-example.md
content/learn/scaffold-tokens.md
```

**All nine destinations checked at `d83ddd9`: MISSING, 9 of 9.** Every one of those 301s landed
on a 404.

And the fix repointed eight of them at slugs that actually exist —
`cils-b1-cittadinanza-overview`, `which-italian-exam-do-i-need`,
`how-italian-exams-are-scored`, `cils-capitalizzazione-explained`,
`the-2025-citizenship-reform`, `reacquiring-citizenship`, `cils-or-celi`,
`exam-dates-and-deadlines` — leaving only `celi-results-timeline` unchanged, **because it was
the one that happened to match.** That is the recorded "8 of 9", confirmed from the tree.

**Note for the owner:** this is a **second repository** in the corpus. Question Q2 offered
AlmiPathway (registered, domain does not resolve) as the alternative. **I recommend
`d83ddd9`** — it is a precise, provable, self-contained instance, whereas AlmiPathway is an
absence rather than a broken entry, and an absence is a different fault class.

**What counts as FOUND:** the ledger names the specific URLs and their actual status, and does
not report a 200 as broken.

---

## RED 5 — a rendered count that does not match the underlying data

**Candidate pin: `e99b199`** — `almi-oet`, *"tooling: name the rows, and point the retire gun
one way (#102)"*, the parent of the fix `45355be` *"GAP-046 — the prompt tells the truth about
the item, and a gate says so (#103)"*.

### 🔴 Proof — six named instances, from the repository alone

Parsed `scripts/seed/gen/reading_c.ts` at `e99b199`: **42 items.** Six of them carry a prompt
promising **three** options while every one of their **eight** questions offers **four**:

```
rea-c-f1-the-quiet-skill-of-listening        questions 8 · options 4
rea-c-f1-rethinking-resilience               questions 8 · options 4
rea-c-f2-the-trouble-with-just-in-case       questions 8 · options 4
rea-c-f2-what-checklists-can-and-can-t-do    questions 8 · options 4
rea-c-f3-the-fifteen-minute-appointment      questions 8 · options 4
rea-c-f3-resilience-is-not-the-answer        questions 8 · options 4

prompt: "Read the text and answer questions 1-8. Choose the answer (A, B or C) which fits best."
```

**Exactly six — the same count the fix commit states.** A learner would be told there are three
answers and then shown four.

⚠️ **One honesty note.** The fix's own message says part of this mismatch also lived in the
**database** (*"still two questions of three options in the DATABASE"*). **The six above do not
depend on that** — prompt and options sit in the same file at the same commit, so the corpus
needs the repository and nothing else.

**What counts as FOUND:** the ledger names the item, the number it renders, the number the data
holds, and the difference — without being told which page to compare.

---

## RED 6 — an internal link present in the source but absent from the rendered HTML

**Candidate pin: `14a0f7d`** — `almi-italian`, the parent of `a2a6a2a` *"Turbopack was eating a
space after `</strong>`; make it explicit (#63)"*.

### ⚠️ THIS ONE CANNOT BE PROVED FROM SOURCE — AND THAT IS THE DEFECT CLASS

At `14a0f7d` the source is **correct**. Three files —
`src/components/ProgressSection.tsx`, `src/components/GlobalFooter.tsx`,
`src/app/privacy/page.tsx` — contain JSX like:

```jsx
Ogni punteggio qui è una <strong className="font-semibold">stima</strong> del nostro
```

The space after `</strong>` is there in the source. **Turbopack — the default bundler for
`next build` in Next 16 — trims the leading space of a multi-line JSX text node that follows an
element**, so the shipped markup reads `</strong>del nostro`. esbuild and SWC both keep it.

> **A render question needs a render answer. The source at this commit is innocent; the
> artefact is not.**

**So the corpus for RED 6 must be a BUILT artefact** — the `.next` output, or a captured DOM —
at `14a0f7d` with that Next version. **A source-only pin would contain no defect at all**, and
an engine reading only the source would be right to report nothing.

**Two things the owner should weigh:**

1. This instance is a **whitespace** defect. RED 6's stated class is an **internal link**
   present in source and absent from render. **Same failure shape, different payload** — the
   spec already says so, but it is the owner's call whether the exhibit must be a link.
2. Reproducing it requires pinning the **toolchain**, not only the commit: Next 16 with
   Turbopack. If that build no longer reproduces, this exhibit is gone and RED 6 needs a
   different one.

**What counts as FOUND:** the ledger names the thing that exists in the component and is
missing from the rendered HTML, **having compared the two** — not having read only one.

---

## WHAT I NEED FROM THE OWNER

| # | question |
|---|---|
| 1 | **RED 1** — take `8877c6e` (the A–E promise, provable in one commit), or the originally-pinned `scale.ts` overall-score flip-flop at `de75091^`? |
| 2 | **RED 4** — accept a **second repository** (`almi-italian d83ddd9`) into the corpus, or nominate AlmiPathway? |
| 3 | **RED 6** — is a **whitespace** instance acceptable for a class stated as an internal **link**? And do we accept that this exhibit needs a **built artefact plus a pinned toolchain**, not a commit? |
| 4 | Does the corpus freeze **repositories at commits**, or **captured artefacts** (rendered HTML, responses)? RED 6 forces the second at least once. |

**Nothing is frozen until these are ruled.** No page created, no page deleted, no DB table, no
production write, no other product touched.
