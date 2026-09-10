# PROSE vs TABULAR — MEASUREMENT · 2026-09-10

## 🔴 NO GATE. NO THRESHOLD. NO PAGE VERDICT CHANGES.

The owner's ruling: **see the distribution first, set a bar afterwards.** Rule Eight
applies to a threshold invented today exactly as it applies to one invented last week, so
this document contains **no proposed limit**. `runGateA` does not import `text-kind.mjs`,
and nothing here fails a page.

---

## 1 · THE HOLE THIS MEASURES

Run 01's `roleCounts` evidence showed the `uniqueWords >= 350` cut fell on **table
length**, not on content:

| nursing | medicine | pharmacy | ‖ | occ. therapy | physio | dentistry | speech | … |
|---|---|---|---|---|---|---|---|---|
| 469 | 297 | 70 | ‖ | 56 | 56 | 47 | 46 | … |

So **`uniqueWords >= 350` can be satisfied by a data table.** On this corpus the overlap
check caught those pages anyway — **but that was this dataset's luck, not the gate's
doing.** A page whose table genuinely differed from its siblings' would clear *both*
checks and still be a data dump.

---

## 2 · HOW THE SPLIT IS MADE — and why this way

**By the MARKUP, not by the words.** A token's kind is decided by its **nearest enclosing
element**. That is not a guess about content — it is what the page's author declared the
text to be:

| kind | elements | what it means |
|---|---|---|
| **LIST** | `li` `td` `dd` | one item among many of the same shape |
| **PROSE** | `p` `blockquote` | a paragraph of argument |
| **HEADING** | `h1`–`h6` `dt` `th` `caption` `summary` `legend` `figcaption` | a label |
| **OTHER** | everything else | **no structural signal at all** |

🔴 **OTHER IS AN HONESTY BUCKET, NOT A DUMPING GROUND.** Text in a bare `div`, `span` or
`a` — navigation, buttons, footer links — declares nothing about itself. Calling it prose
would flatter the page; calling it list would flatter the gate. It is counted and shown.
**Headings are separate for the same reason:** twenty-one `<h2>`s of three words each are
labels, not an argument, and they are not table rows either.

### 🔴 And it is a DECOMPOSITION, not a second opinion

The shell is computed over all tokens exactly as before and subtracted exactly as before;
only the surviving occurrences are then labelled. **The four counts sum to the
`uniqueWords` Gate A already reports** — a test asserts it, and the runner refuses to
print a group where the sum fails. **This cannot disagree with the gate. It can only say
what the gate's own number is made of.**

**And the tokeniser was checked against the gate's, not assumed equal:** 57 real pages
across all four groups, token for token, **0 mismatches**.

---

## 3 · THE RESULT — the owner's suspicion, measured

### The 573 survivors of `/[prof]/from-[origin]`

| | min | p25 | median | p75 | p95 | **MAX** |
|---|---|---|---|---|---|---|
| uniqueWords (total) | 470 | 478 | 1,346 | 2,220 | 2,226 | 2,236 |
| **prose** | **34** | 37 | **56** | 58 | 61 | **65** |
| list | 411 | 415 | 1,255 | 2,119 | 2,125 | 2,128 |
| heading | 21 | 25 | 36 | 38 | 42 | 46 |
| other | 1 | 2 | 2 | 2 | 3 | 4 |

> ### 🔴 OF THE 573 PAGES THAT PASSED, **0** WOULD REACH 350 ON PROSE ALONE.
> ### LIST TEXT IS **93.7%** OF THEIR `uniqueWords`.

The suspicion was that the prose-only number would be very small. **It is smaller than
that.** The best-prose survivor in the group has **65 prose words** — not 65% of the bar,
**19% of it.** The worst has 34.

| the survivor with the MOST prose | `nursing__from-bahamas` | prose **65** · list 2,118 |
| the survivor with the LEAST prose | `pharmacy__from-yemen` | prose **34** · list 415 |

### Every group

| group | pages | uniqueWords median | **prose median** | **prose MAX** | list median | reach 350 on prose alone |
|---|---|---|---|---|---|---|
| `/[profession]` | 12 | 76 | **13** | **16** | 58 | **0** |
| `/[prof]/from-[origin]` | 2,292 | 220 | **37** | **65** | 164 | **0** |
| `/[prof]/from-[o]/[org]` | 500 | 131 | **70** | **169** | 38 | **0** |
| `/register/[org]` | 610 | 30 | **15** | **118** | 2 | **0** |

> ### 🔴 IN THE WHOLE 3,414-PAGE CORPUS, NOT ONE PAGE REACHES 350 ON PROSE.
> ### THE HIGHEST PROSE COUNT ANYWHERE IS **169**.

### And two things in that table are worth stopping on

**(a) The group we are DELETING has the most prose.** `/[prof]/from-[o]/[org]` — the
237,413 — has a prose median of **70**, nearly double the corridor group's **37**. The
pages being kept are, in prose terms, the thinner ones. That does not rescue the leaf
group (it is ruled on facts, not words) but it does say plainly: **the corridor pages are
not surviving on writing. They are surviving on a longer table.**

**(b) What an ORIGIN adds, split by kind.** Measured against each profession's own shell
— identical in all three professions, again:

| | min | median | max |
|---|---|---|---|
| total | 29 | **31** | 47 |
| **prose** | 19–21 | **25** | 32 |
| list | 1 | 5 | 9 |
| heading | 2 | 4 | 10 |

**A corridor's own prose is a median of 25 words — 7% of the bar** — and the diagnostic
already showed what those words are: the country name five times and the scattered
remainder of one shared sentence.

---

## 4 · 🔴 THE SINGLE MOST USEFUL PAGE IN THE CORPUS

The highest-prose page in all 3,414 is:

```
profession-origin-org/medicine__from-saudi-arabia__nz-immigration-nz
prose 169 · list 106 · heading 16 · other 6 · total 297
```

**It is the one page carrying the network's one hand-verified fact.** Its rendered text
contains the Immigration New Zealand note verbatim, ending `Source: Immigration New
Zealand — Update on English language testing for immigration applications`.

Against a leaf-group prose median of 70, **that one sourced note is worth about 99 prose
words.**

> **ONE HAND-WRITTEN, SOURCED FACT ≈ 100 PROSE WORDS.**
> **FIVE OF THEM ≈ 500 — which clears 350 on prose alone.**

That is a **measured prior**, taken from this corpus rather than guessed, and it is
exactly the number the acceptance test needs. It is a prior, not a result: one page is
n = 1, the note is unusually long, and nothing says the next four facts will be its size.
**The acceptance test is what turns it into a measurement.**

---

## 5 · WHAT IS **NOT** DECIDED HERE

- **No prose threshold is proposed.** Distribution first was the ruling, and the
  distribution now exists. The bar comes after the acceptance test, because that test
  will produce the first page whose prose was written on purpose — and a bar set on
  today's numbers alone would be a bar set on pages nobody defends.
- **No page's verdict changes.** All four groups' Gate A results stand exactly as run 01
  reported them.
- **`runGateA` does not import this module.** When a bar is eventually set, wiring it in
  is a separate, visible change — not something that happened quietly today.
