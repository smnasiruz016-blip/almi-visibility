# RED 6 — HOW THE RENDERED SIDE WAS CAPTURED

**10 September 2026.** Read this before using `index.html` as evidence. It says exactly what
was built, and — more importantly — **what this artefact is not.**

## The result

```
🔴 SPACE EATEN   ProgressSection.tsx:61-64   "</strong>del nostro strumento, non un risultato u…"
🔴 SPACE EATEN   GlobalFooter.tsx:9-11       "</strong>— honest CILS &amp; CELI practice. Total…"
   SPACE KEPT    CONTROL, single line        "</strong> del nostro strumento."
```

**The source has the space in all three. The build keeps it in one.**

## The control is the point

The third fragment is **the same words as the first**, written on **one line** instead of
across a line break. It is in the same file, the same build, the same bundler — and its space
survives.

> **So the cause is the LINE BREAK, not the words, not the CSS, and not the component.**
> Without that control this artefact would show a missing space and prove nothing about why.

## What was built

| | |
|---|---|
| Next | **16.2.12** — the version `package.json` pins at commit `14a0f7d` |
| React / React-DOM | **19.2.4** — likewise |
| bundler | **Turbopack**, the default for `next build` in Next 16 |
| command | `next build` with `output: "export"` |
| input | the three JSX text nodes **copied verbatim** out of the commit, line breaks intact |

The verbatim source is in `repro-source/page.tsx`, and each fragment is labelled with the file
and line numbers it came from. Every file here is hashed in `../provenance.json`.

## 🔴 WHAT THIS IS NOT — and it must not be described as more than it is

**This is a TOOLCHAIN REPRODUCTION, not a build of AlmiItalian.**

A full product build at `14a0f7d` was not attempted, and the reason is concrete: that commit's
`build` script chains **thirty-plus gates** — a database, Prisma generation, seeded content and
live environment variables — before it ever reaches `next build`. Reproducing that is a day's
work and would prove the same one line of behaviour.

So the honest description of this exhibit is:

| claim | status |
|---|---|
| Turbopack at 16.2.12 eats that space, and a single-line control keeps it | ✅ **demonstrated here** |
| the same three fragments exist verbatim in the product at `14a0f7d` | ✅ **captured in `../files/`** |
| **AlmiItalian's own deployed build at `14a0f7d` shipped `</strong>del`** | 🟡 **inferred from those two, plus the recorded production report — NOT rebuilt here** |

**The third row is an inference, and it is marked as one.** What would close it is a full
product build at that commit, or a captured production DOM from that deployment — neither of
which exists today.

## What the engine is expected to do with it

Compare **`../files/src/components/ProgressSection.tsx`** with **`index.html`** and report that
the space after `</strong>` is present in one and absent from the other — **having read both.**
An engine that reads only the source finds nothing, and it should find nothing: that is the
whole reason this defect class is in the test.
