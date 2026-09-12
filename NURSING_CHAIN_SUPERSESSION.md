# Is `bin/nursing-chain.mjs` superseded by `bin/profession-chain.mjs`?

**12 September 2026 (night).** Asked because the register of permitted writers carried one
UNKNOWN reason: nothing in the repository said why both exist. **This is a determination and a
recommendation. Nothing was removed** — deleting a tool is the owner's call.

## Answer: HALF of it is superseded. The other half is load-bearing, so it cannot go as it stands.

| | `nursing-chain.mjs` | `profession-chain.mjs` |
|---|---|---|
| **inputs** | `--product`; no page flag — always the nursing spec | `--product` and `--page=<slug>` (nursing or speech-pathology) |
| **the candidate page** | the spec **as written** (`renderPage(pageSpecs.nursing)`) | the spec **after placement** (`placeClaims(base, placement.removed)`) |
| **sibling population** | 🔴 **FETCHES the eleven live pages and writes the cache** `runs/_profession-cache/` | **reads that cache; refuses to run without it** — "this script does not fetch" |
| **what is shared** | a **hard-coded list** of seven claim ids (`SHARED_CLAIM_IDS`) | **derived** per record by `isSharedAcrossVariants` — its own comment says a hard-coded set "silently credited profession-independent text as distinguishing" |
| **rollout** | the **pessimistic simulation** (nouns swapped) plus the derived best case | the derived best case only — the pessimistic model was **retired** because it assumes the thing it tests |
| **outputs** | `nursing.html` + `chain-report.json` | `<page>.html` + `<page>-chain.json`, a different report shape |
| **who depends on it** | `package.json` `chain`; **`profession-chain.mjs` and `placement-measure.mjs` both require its cache** | nothing depends on it |

So they are **not** the same chain: different inputs (the unplaced spec), a different sharing rule
(a hard-coded list the later runner was written to replace), and a model that has been retired.

- **The CHAIN half (steps 1, 3, 4) is superseded.** `profession-chain.mjs --page=nursing` runs the
  chain on the current design with the rule that survived. The remaining difference is that it
  measures the pre-placement page with a retired model — a historical result (PR #11), recorded in
  `NURSING_PAGE_CHAIN.md` and `runs/nursing-chain/chain-report.json`, not a live instrument.
- **The FETCH half (step 2) is NOT superseded.** It is the only code that populates the sibling
  cache, and two other writers cannot run without it.

## Recommendation (the owner's decision)

1. **Split, then remove.** Move step 2 — fetch the siblings, keep them with `--confirm` — into its
   own small read-and-cache tool, point `profession-chain.mjs` and `placement-measure.mjs` at it,
   then **retire `nursing-chain.mjs`**. The register goes from seven writers to seven (one out, one
   in) with every reason stated.
2. **Do not remove it before the split.** Removing it today would leave two runners that refuse
   to start on a fresh checkout, because `runs/_profession-cache/` is gitignored and nothing else
   writes it.
