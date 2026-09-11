# PHASE 0 · FROZEN ITEM 5 — DATABASE GROWTH AND RETENTION

**11 September 2026.** Against the frozen boundary: **MEASURE FIRST. NO BUILD.**

**Read first, per AUDIT ONCE:** `ARCHITECTURE_AND_GAP_REPORT.md` **§8**. **It is not rewritten.**
§8 already gives the workloads, the per-table row shapes, the bytes-per-row estimates, the monthly
growth figures, two consequences and a retention proposal.

🔴 **No schema. No migration. No table. No database touched.** Nothing was created, altered or
written. The only network access was reading one public pricing page. No secret value printed,
hashed or measured.

---

# 1 · WHAT §8 ALREADY ANSWERS — RECORDED, NOT RE-DERIVED

| item-5 requirement | already answered in §8 |
|---|---|
| what would be stored | five tables named, with what each holds |
| how fast it grows | rows per page per pass, bytes per row, and monthly totals for three workloads |
| the three workloads | **small** 240,328 pages · **medium** ~12.4 M · **large** 12.86 M |
| growth per month (weekly pass, 1.5 KB/page/pass) | **~1.4 GB** · ~74 GB · ~77 GB |
| the architectural ruling | **raw HTML is never stored in Postgres** — store a hash and the extracted measurements |
| the scope ruling | **v0.1 must be the small workload, and even that a capped sample** |
| retention | latest snapshot per URL kept indefinitely · 90 days of history · roll up older to one row per URL per month · delete resolved issues keeping the count · purge 60 days after a URL leaves the sitemap |
| isolation | a dedicated Neon project |

**§8 is complete on shape and growth. It states one thing it could not do:**

> *"A growth estimate cannot be turned into a cost until the plan is known. **Indicative monthly
> cost: UNKNOWN. It depends on the Neon plan, which is UNKNOWN.**"*

---

# 2 · 🔴 THE PLAN WAS NOT UNKNOWN. IT WAS ANSWERED IN §15 OF THE SAME FILE.

| where | what it says |
|---|---|
| **§8** | *"the Neon plan, which is **UNKNOWN**"* |
| **§15** | *"✅ ~~Owner reads the Neon console (U1–U4)~~ — **DONE — answered by the owner 2026-09-10: FREE plan**, 10 branches per project… **U1–U4 are closed**"* |

> ## 🔴 RULE THIRTEEN, A SECOND TIME, IN THE SAME DOCUMENT — AND ON A DIFFERENT FACT.
>
> The first instance was the Search Console row (`DOC-1`). **This is not that instance recurring;
> it is a second, independent one.** A correction reached §15 and never reached §8, so §8 has been
> declaring a cost unknowable **while the number it needed sat 570 lines below it.**

**That is why this document exists at all.** With the plan known, §8's growth figures can finally be
compared against a ceiling — and the comparison is the finding.

---

# 3 · 🔴 THE COMPARISON §8 COULD NOT MAKE

## 3.1 · The ceiling, measured

**Source:** `https://neon.com/pricing` · read 11 September 2026

| Neon **Free** | verified |
|---|---|
| storage | **0.5 GB per project** |
| compute | **100 CU-hours per project** |
| branches | **10 per project** |
| 🔴 **penalty for exceeding any limit** | *"Hitting any Free monthly limit (100 CU-hours, **0.5 GB storage**, 5 GB egress) **suspends compute until the next billing month**."* |

**Next tier (Launch):** pay-as-you-go, storage at **$0.35/GB-month**; the page states **no included
storage allowance**, and this document does not invent one.

## 3.2 · The arithmetic — §8's own numbers against that ceiling

**This is arithmetic on §8's figures, not a new measurement**, and it was computed rather than
estimated by eye:

| | |
|---|---|
| Free allowance | **500,000 KB** |
| v0.1 workload, **one full pass** (240,328 pages × 1.5 KB) | **360,492 KB** = 🔴 **72.1 % of the entire allowance** |
| v0.1 workload, **one month** (4 weekly passes) | **1,441,968 KB** = 🔴 **288 % of the allowance** |
| how many full passes fit, ever | **1.39** |

> ## 🔴 THE SMALLEST WORKLOAD §8 DESCRIBES FILLS 72% OF THE PLAN IN A SINGLE PASS, AND EXCEEDS IT ON THE SECOND.
>
> **And the penalty is not a bill. It is COMPUTE SUSPENSION until the next billing month.** On a
> shared instance, that does not stop a crawl — **it stops whatever else uses that database.**

### And the retention proposal cannot save it

§8's retention plan — 90 days of history, roll-ups, purges — reduces growth **over time**. **The
first pass already consumes 72%.** Retention answers month three; **nothing in it answers pass two.**

## 3.3 · What actually fits, if the plan does not change

Same arithmetic, inverted. **These are ceilings, not recommendations:**

| constraint | pages |
|---|---|
| one pass only, nothing else stored | **~333,000** |
| four passes per month | **~83,000** |
| four passes per month, **50 % headroom** for everything else | **~41,600** |

**So §8's instruction that v0.1 "should be a capped sample" is not caution — it is arithmetic.**
The cap has a number now: **on the order of 40,000 pages, not 240,328**, if the plan stays Free and
the pass is weekly.

⚠️ **Every figure here inherits §8's `1.5 KB per page per pass` estimate, which is an estimate.**
If the real row is 3 KB, halve every page count. **The estimate has never been checked against a
real row, because no row has ever been written** (`U-DB-3`).

## 3.4 · 🔴 AND PREVIEW SHARES THE SAME 0.5 GB

§2b measured that preview and production are **the same Neon database**. Combined with §3.1:

> **A crawl exercised "just on preview" consumes production's storage allowance, and suspending
> compute suspends both.** There is no test volume that is free of the production ceiling.

**Recorded. Not fixed** — the owner ruled on 10 September that no branch is created yet, because
the database is empty and there is nothing in it to protect. **That ruling stands and is not
reopened here**; what changes is that the ceiling is now a number rather than an unknown.

---

# 4 · UNKNOWNs — FOUR FIELDS

| # | UNKNOWN | reason | evidence required | who can resolve | recheck on |
|---|---|---|---|---|---|
| **U-DB-3** | whether **1.5 KB per page per pass** is real | it is §8's estimate and no row has ever been written; every page count in §3 scales inversely with it | measure one real `crawl_snapshot` row once any exist | later phase | first write |
| **U-DB-4** | current Neon storage consumed | §2b measured the database as empty apart from `neon_auth` scaffolding, but the **bytes** were never read | one read of the Neon console's usage panel | **owner** | before any crawl |
| **U-DB-5** | the Launch tier's **included** storage, if any | the pricing page states a per-GB rate and **no allowance**; inventing one would be a projection | one read of Neon's plan comparison, or the owner's console | **owner** | if the plan changes |
| **U-DB-6** | whether **egress** (5 GB free) binds before storage | egress was not modelled by §8 at all — only rows and bytes stored | model reads/writes per pass, or measure one pass | later phase | when a crawl plan exists |
| **U-DB-7** | what **compute** (100 CU-hours) a crawl consumes | §8 models storage only; compute is a separate Free-plan limit with the **same suspension penalty** | measure one pass | later phase | when a crawl plan exists |

⚠️ **`U-DB-6` and `U-DB-7` are the same shape of hole §8 had:** the Free plan has **three** limits
and **any one of them suspends compute**. §8 modelled one. **Two have never been modelled at all.**

---

# 5 · GAP REGISTER — ADDITIONS

## ALMIVISIBILITY CAPABILITY GAPS

| id | gap | evidence |
|---|---|---|
| **DB-1** | no persistence exists — no schema, no table, no migration — so every growth figure is a projection against a store that has never held a row | §2 of the items 1–2 document; `U-DB-3` |
| **DB-2** | **the storage plan's ceiling was never compared against the growth model**, because a correction recorded in §15 never reached §8 | §2 |
| **DB-3** | only **one** of the Free plan's three limits (storage) is modelled; **egress and compute are unmodelled**, and each carries the same suspension penalty | §4, `U-DB-6`, `U-DB-7` |
| **DOC-1** *(second instance)* | a fact corrected in one section of a document and left stale in another — now observed **twice**, on two different facts, in the same file | §2 |

## PRODUCT DATA GAPS

**None added by this document.**

---

## WHAT THIS DOCUMENT DID NOT DO

- 🔴 **No schema, no migration, no table, no index, no database connection opened.** Nothing was
  created, altered, written or deleted.
- **§8 not rewritten.** Its stale "plan is UNKNOWN" line is recorded here, not edited there.
- **No cost total stated.** A rate and a ceiling are given; **the volume is not authorised**, and
  inventing one to produce a headline figure is the projection Rule Eight forbids.
- **No Neon setting touched**, no branch created, no plan changed, no console action taken.
- **The owner's 10 September ruling on branching is not reopened.**
- **`A1`–`A4`, `ISO-1`, `DEP-1`, `DEP-2`, CRLF — recorded, not fixed.**
- **No claim, no page, no build, no refactor, no Phase 1 code. No new GREEN requested.**
