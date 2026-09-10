# PROFESSION-PAGE CLAIM INVENTORY — `/nursing`

**10 September 2026.** The exercise `TARGET_SHAPE_FACT_COUNT.md` said would replace every 🟡.
**It did — and it moved the number in the direction I did not expect.** Measurement only: no
page created, no page deleted, no DB table, no production write, and nothing changed in any
other product.

---

## 0 · THE HEADLINE — MY OWN COUNT WAS OPTIMISTIC, AND THE OWNER'S GUESS WAS CLOSER

| | earlier count | **after this inventory** |
|---|---|---|
| distinct **acquisitions** | ~58 | 🔴 **~150** |
| manual share | ~43% | ~43% (unchanged) |
| human passes per year | ~50 | **~130** |
| **per week** | ≈ 1 | 🔴 **≈ 2.5** |

> **The owner's original estimate was 2–3 a week. Mine was about one. His was closer, and the
> reason is a structural fact I had assumed away.**

### The assumption that broke

`TARGET_SHAPE_FACT_COUNT.md` §2.4 treated the destination-regulator block as **one block
shared by all twelve profession pages** — 25 facts, written once, shown everywhere.

**It is not shared. Each profession has DIFFERENT regulators.**

| profession | UK | Ireland | Australia |
|---|---|---|---|
| nursing | **NMC** | **NMBI** | NMBA (under Ahpra) |
| medicine | **GMC** | Medical Council | MBA (under Ahpra) |
| dentistry | **GDC** | Dental Council | DBA (under Ahpra) |

**The UK block alone is twelve different bodies with twelve different rulebooks.** Ahpra
partially rescues it — one common English-language standard across its National Boards — but
the UK, Ireland and Canada do not.

---

## 1 · WHAT WAS VERIFIED — the three 🟡s this was meant to settle

### 🇮🇪 NMBI (Ireland) — ✅ **VERIFIED, and machine-readable**

`nmbi.ie/Registration/Qualified-outside-the-EU/Application-Process/English-Language-Requirements`
— fetched and read.

| claim | verbatim |
|---|---|
| OET requirement | *"Listening: B (350 - 450)"* · *"Reading: B (350 - 450)"* · *"Writing: C+ (300 - 340)"* · *"Speaking: B (350 - 450)"* |
| 🔴 profession-specific | *"OET **(Nursing)** with Grade B in three components and C+ in one component."* |
| recognised countries | *"Australia · Canada · New Zealand · The United States of America · United Kingdom"* — **five.** India absent |

**Two things worth keeping.** First, NMBI names the **Nursing** version of the test — so "which
version of OET does this regulator want" is a genuinely **per-profession** claim, not a shared
one. Second, its recognised-country list is **five countries** where UKVI's is eighteen: **the
origin table's columns do not agree with each other**, which is exactly why the table has to
carry them separately rather than collapsing them into "is your country English-speaking".

**Origin table: 8 facts → 9.** One 🟡 → ✅.

### 🇨🇦 NNAS (Canada) — ✅ fetchable, but 🔴 **NOT a language regulator**

*"We are a credentialing service for internationally educated nurses and the first step towards
becoming a nurse in Canada."* **It states no language requirement**, and its navigation carries
none. Canada's language rules sit with the **provincial** regulators — CNO in Ontario, BCCNM in
British Columbia, and so on.

> 🔴 **Canada is a FRAGMENTED destination, structurally like India is a fragmented origin.**
> "Five facts for Canada" was wrong: it is either ~10 provincial sources, or Canada is left out.

### 🇦🇺🇳🇿 Ahpra / NMBA and NCNZ — still **403**, unchanged from A1.

---

## 2 · 🔴 A THIRD KIND OF BARRIER, AND IT IS LEGAL RATHER THAN TECHNICAL

**OET's own site — the source for everything in §3 below.**

**First, a correction to our own record.** `reference_oet_ip_policy` (2026-09-01) states that an
automated fetch of `oet.com` returns **HTTP 403**. **Re-probed today, it does not:**

```
200  https://oet.com/
200  https://oet.com/en-us/about
200  https://oet.com/en-us/Intellectual-Property-policy
200  https://oet.com/robots.txt
```

**That memory's technical claim is out of date and is corrected here.** (Only the reachability
claim — the IP policy itself is unchanged and still binding.)

### And the policy is the real barrier

> *"Any redistribution or reproduction of part or all of the Content in any form is prohibited"*
> … *"store the Content in any other website or **other form of electronic retrieval system**"*
> — OET Intellectual Property policy

**A fact cache that stores `quotedSpan` IS an electronic retrieval system holding a reproduction
of their wording.**

| | |
|---|---|
| can a machine FETCH it? | ✅ yes |
| may we STORE its wording as `quotedSpan`? | 🔴 **no** |
| may the nightly quote-match run? | 🔴 **no — there is nothing lawful to match against** |

> ### THE FRESHNESS MECHANISM HAS A THIRD FAILURE MODE, AND IT IS NOT A 403.
> A **403** is a source that will not let a machine in. A **scanned PDF** is a source a machine
> cannot read. **This is a source a machine can read perfectly and may not quote.**

**What the design must do about it** — and this is a change to `FACT_CACHE_DESIGN.md`, not a
workaround:

- a new field beside `sourceMachineReadable`: **`sourceQuotable: true | false`**, set from the
  source's own licence terms, not from whether a fetch succeeded;
- when `sourceQuotable` is false, **store a URL, a date and a statement of the fact in our own
  words — never their sentence** — and mark the record so nothing tries to quote-match it;
- **freshness for such a record is a human re-read**, the same cost as a 403.

**And the existing practice is already at its limit:** the AlmiOET memory records that
`docs/sources/oet-…pdf` is committed to git and that `exam-shape.ts` holds short quoted
sentences — flagged on 1 September and **still unresolved**. **This design must not expand
that practice**, and it does not.

---

## 3 · THE INVENTORY — what `/nursing` must actually say

### Block A · What OET Nursing IS — profession-specific

| # | claim | scope | source | status |
|---|---|---|---|---|
| A1 | `oet` · `writing-task-type` · `profession=nursing` | **per profession** | oet.com | 🟡 fetchable, **not quotable** |
| A2 | `oet` · `speaking-roleplay-setting` · `profession=nursing` | **per profession** | oet.com | 🟡 same |
| A3 | `oet` · `subtests-and-which-are-profession-specific` | **shared** | oet.com | 🟡 same |
| A4 | `oet` · `grade-bands-0-500` | **shared** | oet.com | 🟡 same |

**Two per profession (A1, A2) plus two shared.** My earlier floor of "two per profession" was
right for this block — and every one of them sits behind the licence problem in §2.

### Block B · Destination regulators — 🔴 **per profession, not shared**

For **nursing**, the bodies that matter and what each needs stated:

| regulator | claims | verified? | machine-readable |
|---|---|---|---|
| **UK — NMC** | 5 (OET grades · combining sittings · three evidence routes · transcript evidence · approved-programme rule) | ✅ **all five** | ✅ |
| **UK — UKVI** | 1 (EL 4.1 nationality exemption) | ✅ | ✅ |
| **Ireland — NMBI** | 3 (OET grades · *OET Nursing* specifically · five recognised countries) | ✅ **all three** | ✅ |
| **Australia — Ahpra/NMBA** | ~5 | 🔴 unverified | 🔴 403 |
| **New Zealand — NCNZ** | ~5 | 🔴 unverified | 🔴 403 |
| **Canada — provincial** | ~5 **per province** | 🔴 unverified | 🟡 NNAS fetchable, regulators unchecked |
| **total for nursing** | **~24** | 9 verified | |

**Twelve professions × a block of this size, minus what Ahpra shares across its boards.**

### Block C · The origin table — **9 facts, and they are shared by all twelve pages**

Unchanged from `TARGET_SHAPE_FACT_COUNT.md` except NMBI's list, which makes it **9**:
UK Code of Practice (+2 amber terms) · UKVI EL 4.1 · NMC country PDF · Ahpra list · NCNZ list ·
**NMBI's five** · and the Ahpra/NCNZ entries remain 403.

### Block D · The organisation table — **1,243 records, ONE acquisition**

Unchanged, and still the best-value block in the design.

---

## 4 · THE REVISED COUNT

| block | acquisitions | shared or per-profession |
|---|---|---|
| A · what OET Nursing is | 2 shared + **2 × 12 = 24** | mixed |
| B · destination regulators | **~24 × 12 = 288**, **less ~120 saved by Ahpra's common standard ≈ 170** 🟡 | **per profession** |
| C · origin table | 9 | shared |
| D · organisation table | 1 | shared |
| **TOTAL** | 🔴 **~205** — call it **~150 after further regulator overlap** 🟡 | |

⚠️ **Both totals are estimates and the range is wide (150–205).** What decides it is how much of
Block B genuinely repeats across professions, and **that has been measured for exactly one
profession.** The next cheapest thing that narrows it is **one more profession page — medicine
or dentistry — because those have entirely different UK regulators (GMC, GDC) and would show
whether Block B really is ~24 each.**

### The cost, restated

| | |
|---|---|
| acquisitions | ~150 🟡 |
| manual (~43%, from A1's barrier mix) | ~65 |
| human passes per year | ~130 |
| **per week** | **≈ 2.5** |

---

## 5 · WHAT THIS INVENTORY CHANGED, IN ONE LIST

1. **My ~58 acquisitions was optimistic. It is ~150.** The destination-regulator block is
   **per profession**, not shared. **The owner's 2–3 a week was the better estimate.**
2. **NMBI verified and machine-readable** — one 🟡 resolved, and the origin table goes 8 → 9.
3. **Canada is a FRAGMENTED destination** — NNAS is a credentialing service, not a language
   regulator; the rules are provincial. "Five facts for Canada" was wrong.
4. **A third barrier class exists and it is LEGAL:** a source a machine can read and may not
   quote. `sourceQuotable` must join `sourceMachineReadable`, and OET — the single most
   important source in the product — is the case that proves it.
5. **A memory was out of date and is corrected:** `oet.com` no longer 403s an automated fetch.
6. **Every OET-sourced fact needs a human re-read at 180 days**, not because of a technical
   barrier but because we may not store the sentence a machine would re-match.

**None of this touches the frozen contract, the pass mark, or any gate.** It is a count, and it
replaces a guess with a wider, better-founded range that is honest about still being a range.
