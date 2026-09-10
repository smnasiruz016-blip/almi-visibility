# HOW MANY FACTS DOES THE TARGET SHAPE ACTUALLY NEED?

**10 September 2026.** A count, replacing an estimate. **Measurement only** — no page created,
no page deleted, no DB table, no production write.

> The owner's point, and it is the one that puts A1's 75% on its proper scale:
> **the origin table is not built from 191 sources. It is built from a FEW.** The UK Code of
> Practice red/amber/green list is **one source that fills 191 rows.**

---

## 🔴 SUPERSEDED IN PART — 10 September 2026

**`PROFESSION_PAGE_CLAIM_INVENTORY.md` ran the measurement this document said would replace its
🟡 marks, and it moved the number UP.**

| | this document | after the inventory |
|---|---|---|
| acquisitions | ~58 | 🔴 **~150** (range 150–205) |
| per week, manual | ≈ 1 | 🔴 **≈ 2.5** |

**Why:** §2.4 below treats the destination-regulator block as **shared by all twelve profession
pages**. It is not — **each profession has different regulators** (nursing → NMC, medicine →
GMC, dentistry → GDC). Ahpra's common standard rescues part of it; the UK, Ireland and Canada
do not.

**The owner's original 2–3 a week was the better estimate; mine was optimistic.**

**What still stands from this document:** the records-vs-acquisitions distinction, the origin
table (now **9** facts, not 8 — NMBI verified), and the organisation table's 1,243 records from
ONE acquisition. **Read §2.4's number as superseded**; the rest holds.

---

## 0 · THE ANSWER

| | |
|---|---|
| **distinct fact RECORDS** | **~1,300** |
| 🔴 **distinct ACQUISITIONS** (times somebody or something must go and get something) | **~58** |
| of those, **machine-readable** | **~33 (57%)** 🟡 |
| of those, **manual** | **~25 (43%)** 🟡 |
| **manual re-verification load** at `FACT_FRESHNESS_DAYS = 180` | **~50 per year ≈ 1 per week** |

**The owner's 60–100 estimate was right, and it was about ACQUISITIONS.** The count lands at
**~58**.

> ### 🔴 AND A1's 75% MANUAL DOES **NOT** CARRY OVER TO THE TARGET SHAPE.
> A1 measured **origin regulators**, and the target shape barely uses them. It leans on **list
> sources and a few large destination regulators**, which are far more often machine-readable.
> **~43% manual here, not 75%.**

---

## 1 · RECORDS ARE NOT ACQUISITIONS — the distinction the count turns on

`organisations.json` holds **1,243** profession-grade rows for **610** organisations. Under the
design each is its own claim `(org · oet-minimum-grade · profession)`, so that is **1,243
records**.

**It is also ONE fetch.** They came from OET's own index in a single dated acquisition
(`meta.fetchedAt 2026-06-27`).

> **The cost of a fact cache is paid in ACQUISITIONS, not in rows.** Counting rows makes the
> job look like 1,300 pieces of work. Counting acquisitions makes it 58 — and 58 is the number
> that decides whether one person can keep it fresh.

Both are reported below, and neither is allowed to stand alone.

---

## 2 · THE COUNT, BLOCK BY BLOCK

### 2.1 · The ORIGIN table — 191 rows, and it is the cheapest block in the design

Every column is a **list**: one source, 191 answers.

| column | source | facts | machine-readable |
|---|---|---|---|
| UK Code of Practice status (red / amber / green) | gov.uk + NHS Employers | 1 (the list) | ✅ verified |
| the two amber countries' G2G terms | gov.uk | 2 | 🟡 unchecked |
| UKVI EL 4.1 nationality exemption | gov.uk, **EL 4.1** | 1 | ✅ verified |
| NMC accepted English-speaking countries | nmc.org.uk **PDF** | 1 | 🔴 **PDF, not parsed** |
| AHPRA recognised countries | ahpra.gov.au | 1 | 🔴 **403** |
| NCNZ exempt education countries | nursingcouncil.org.nz | 1 | 🔴 **403** |
| NMBI (Ireland) equivalent | nmbi.ie | 1 | 🟡 **not yet checked** |
| **total** | | **8** | **3 ✅ · 3 🔴 · 2 🟡** |

> **EIGHT FACTS FILL 191 ROWS.** That is the whole argument for the table over 2,292 pages,
> and it is now counted rather than asserted.

⚠️ **What is deliberately NOT in this table: a per-origin verification body, fee and form.**
That column is the one A1 measured, and it is the one that costs ~191 separate acquisitions of
which only ~25% are machine-readable. **It is excluded from the target shape's baseline** and
becomes a later, optional enrichment for the origins where it is cheap (Nigeria, Pakistan).

### 2.2 · The ORGANISATION table — 1,243 records, ONE acquisition

| | |
|---|---|
| organisations | **610** |
| profession-grade rows (`meta.roleInstances`) | **1,243** |
| acquisitions | **1** — OET's own index |
| machine-readable | ✅ — it is how `organisations.json` was built |

⚠️ **It is not a fact cache entry yet.** Per `FACT_CACHE_DESIGN.md` §2 it is missing a per-fact
source URL, a tier, and a per-fact verified date; the collective `fetchedAt` cannot carry a
freshness window for 1,243 rows individually. **Promoting it is the first concrete job of
DOD-03A, and it is one automated job, not 1,243 manual ones.**

### 2.3 · The TWELVE PROFESSION PAGES

| what | per page | total | source |
|---|---|---|---|
| the profession's Writing task type | 1 | **12** | OET's own profession materials 🟡 |
| the profession's Speaking role-play context | 1 | **12** | same 🟡 |
| how many organisations recognise OET for it | — | **0** | *derived from §2.2, not a new fact* |
| the main destination regulators and their grades | — | **0** | *derived from §2.2* |
| **total** | | **24** | machine-readability **unchecked** |

🟡 **This is the least certain block.** Nobody has yet listed what a profession page must say
to be the best answer — the claim inventory was done for a *corridor*, not for a profession.
**Two facts per profession is a floor, not a measurement**, and it is the number most likely to
grow.

### 2.4 · The DESTINATION REGULATORS — the same block on every profession page

From the verified corridor inventory: NMC needed **5** claims (OET grades, combining sittings,
the three evidence routes, the transcript evidence, the approved-programme rule). Assume the
same depth for the four other regulators that matter:

| regulator | facts | machine-readable |
|---|---|---|
| UK — NMC / UKVI | 5 | ✅ **verified** |
| Australia — AHPRA / NMBA | 5 | 🔴 **403** |
| New Zealand — NCNZ | 5 | 🔴 **403** |
| Ireland — NMBI | 5 | 🟡 unchecked |
| Canada — NNAS | 5 | 🟡 unchecked |
| **total** | **25** | **5 ✅ · 10 🔴 · 10 🟡** |

### 2.5 · Together

| block | records | acquisitions | machine-readable acquisitions |
|---|---|---|---|
| origin table | 8 | 8 | 3 ✅ (2 unknown) |
| organisation table | **1,243** | **1** | **1 ✅** |
| profession pages | 24 | 24 | unknown 🟡 |
| destination regulators | 25 | 25 | 5 ✅ (10 unknown) |
| **TOTAL** | **~1,300** | **~58** | **~33 of 58 if the unknowns split evenly** |

---

## 3 · WHAT THIS COSTS THE OWNER, PER WEEK

At `FACT_FRESHNESS_DAYS = 180` every manual fact needs **two human passes a year**.

| | |
|---|---|
| manual acquisitions | **~25** 🟡 |
| human passes per year | **~50** |
| **per week** | **≈ 1** |

**The owner's guess was 2–3 a week. The count says about one** — because the org table's 1,243
rows collapse into a single automated import, and the origin table's 191 rows collapse into
eight list facts.

⚠️ **Two things this does not include**, and both are real:
- **the first acquisition**, which is heavier than a re-verification;
- **the profession-page block (§2.3)**, the one number most likely to grow, and whose sources
  have not been checked for machine-readability at all.

---

## 4 · WHAT THIS COUNT IS, AND IS NOT

**IS:** an arithmetic over a defined page shape, with each block's source named and its
machine-readability marked ✅ verified / 🔴 refused / 🟡 unchecked.

**IS NOT a measurement.** Three of the four blocks contain unchecked assumptions:

1. **Two facts per profession page is a floor I chose, not a count.** No claim inventory has
   been done for a profession page. **This is the first thing to measure next.**
2. **Five facts per destination regulator is copied from the NMC**, the only one inventoried.
3. **NMBI, NNAS and OET's own profession materials have never been fetched.** Five of the eight
   origin-table sources and twenty of the twenty-five regulator facts are 🟡.

**What would turn this into a measurement, and it is cheap:** run the claim inventory once for
**one profession page** — the same exercise done for `nursing/from-india` — and fetch NMBI,
NNAS and OET's profession pages to classify them. **That is a morning, and it replaces every 🟡
in this document.**
