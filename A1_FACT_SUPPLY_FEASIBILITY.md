# A1 — FACT-SUPPLY FEASIBILITY PROBE

**10 September 2026. Measurement only.** No page created, no page deleted, no DB table, no
production write, no other product touched. **No scraping workaround was used or proposed** —
no user-agent spoofing, no proxy. A refusal is recorded as a refusal.

> **The question this answers, and it is DOD-03A §5A.1's own words:**
> *can the supply continue acquiring and reverifying facts **without requiring manual
> hand-writing of every record**?*
>
> **The registry is not built until we know whether it can be filled.**

---

## 0 · THE ANSWER FIRST

**Eight origin countries have now been probed — three before, five in this pass.**

| grade | countries | n |
|---|---|---|
| **NIGERIA-GRADE** — named body, fees, forms, destination-specific process, machine-readable | **Nigeria · Pakistan** | **2** |
| **403** — exists centrally, refuses a machine | Philippines | 1 |
| **FRAGMENTED** — no single national answer | India | 1 |
| **ABSENT** — nothing a machine can acquire from a tier-1 source | Ghana · Kenya · Bangladesh · Egypt | **4** |

> ### 🔴 **2 OF 8. AUTOMATED FACT SUPPLY IS NOT GENERALLY AVAILABLE.**
> ### **`§5A.1` CANNOT PASS AS WRITTEN, AND I AM PROPOSING A SCOPE CHANGE.**

⚠️ **n = 8. This is an ESTIMATE, not a proven rate.** Read §4 for exactly what the probe can
and cannot claim before treating 25% as a number.

---

## 1 · THE FIVE NEW COUNTRIES, ONE BY ONE

Chosen to differ from each other and from the first three: **Pakistan** and **Ghana** and
**Bangladesh** are on the UK Code of Practice **red list**; **Kenya** is one of only two
**amber** countries; **Egypt** is green.

### 🇵🇰 PAKISTAN — **NIGERIA-GRADE** ✅

**Pakistan Nursing & Midwifery Council (PNMC)** ·
`https://pnmc.gov.pk/verification-registration-2/` · fetched and read, plain HTML.

| claim | value, verbatim |
|---|---|
| issuing body | Pakistan Nursing & Midwifery Council (PNMC) |
| 🔴 **fee, going abroad** | *"Processing fee PAK Rs.10000/-"* |
| 🔴 **fee, domestic** | Rs.1,000 — **a ten-fold difference that exists only because the destination is foreign** |
| document 1 | *"Application form for verification of Registration/Good Standing Certificate"* |
| document 2 | *"Letter/Verification form/email print with complete address of the council/regularity body/ organization where your verification is required/needed to be sent."* |
| document 3 | *"Photocopy of your PNMC/PNC registration Card and all Nursing, Midwifery, LHV, Post Basic Diplomas, and Degrees."* |
| response time | 3 working days |

**Claims found: 6 · machine-readable: YES.** The domestic/foreign fee split is the same shape
as Nigeria's NMC-UK line — **a genuinely corridor-dependent value.**

### 🇬🇭 GHANA — **ABSENT** (to a machine) 🔴

**Nursing and Midwifery Council of Ghana** · `nmc.gov.gh` · **the site is fetchable — it does
not refuse us.** The going-abroad content simply is not on it in readable form:

- `/web/ourservices-mobile/verification-mobile` fetched fine and **carries only inbound
  registration** — foreign nurses coming *into* Ghana, not Ghanaian nurses leaving.
- The verification form is a **PDF**: `Verification_of_Registration_or_Licensure.pdf`,
  193.8 KB. Fetched, then run through a stream-inflating text extractor. **It yielded no text
  at all** — the document is almost certainly a scanned image.
- The **fee** (GH¢550, with a GH¢3,000 increase "under review") exists only in a **newspaper
  report** — **tier 3. A lead, never a citation.**

**Claims found from a tier-1 machine-readable source: 0 · machine-readable: NO.**

### 🇰🇪 KENYA — **ABSENT** (to a machine) 🔴

**Nursing Council of Kenya.** Two domains, and neither yields it:

- `nckenya.org/services/registration-licensing/` → **HTTP 500**
- `nckenya.com/registration/` → fetched fine, and **carries only inbound registration**.
- The outmigration/emigration verification process is described only in **press and nursing
  blogs** — tier 3/4.

**Claims found from a tier-1 machine-readable source: 0 · machine-readable: NO.**
⚠️ Note Kenya is one of the two **amber** countries, so its corridor has a real, consequential
per-origin fact — **but it comes from gov.uk, not from Kenya.**

### 🇧🇩 BANGLADESH — **ABSENT** 🔴

**Bangladesh Nursing and Midwifery Council (BNMC)** · `bnmc.portal.gov.bd` →
**TLS failure: `unable to verify the first certificate`.** No published verification or
good-standing detail was located from any tier-1 source.

**Claims found: 0 · machine-readable: NO** — and this is a **third kind of machine barrier**,
distinct from a 403 and from a scanned PDF: a broken certificate chain.

### 🇪🇬 EGYPT — **ABSENT** 🔴

**Egyptian Nursing Syndicate.** No official syndicate page publishing verification or
good-standing requirements was located. Everything found was **recruiters, consultancies and
a UAE government page describing what IT wants from an Egyptian nurse** — tier 4, and about
the destination rather than the origin.

**Claims found: 0 · machine-readable: NO.**

---

## 2 · ALL EIGHT, TOGETHER

| country | grade | tier-1 claims found | what stopped the machine |
|---|---|---|---|
| 🇳🇬 Nigeria | **NIGERIA-GRADE** | **6+** — body, ₦66,875, ₦8,750 ×2, **₦17,500 NMC-UK line**, 2 document lists | — |
| 🇵🇰 Pakistan | **NIGERIA-GRADE** | **6** — body, Rs.10,000 foreign, Rs.1,000 domestic, 3 documents, 3-day response | — |
| 🇵🇭 Philippines | **403** | unknown | HTTP 403 |
| 🇮🇳 India | **FRAGMENTED** | n/a | **~30 State Nursing Councils — no single answer exists to acquire** |
| 🇬🇭 Ghana | **ABSENT** | 0 | PDF yielded **no extractable text** (scanned) |
| 🇰🇪 Kenya | **ABSENT** | 0 | HTTP 500 on one domain; content absent on the other |
| 🇧🇩 Bangladesh | **ABSENT** | 0 | **TLS certificate failure** |
| 🇪🇬 Egypt | **ABSENT** | 0 | no tier-1 source located |

### 🔴 And the barriers are not one problem, they are five

A 403, a scanned PDF, an HTTP 500, a broken TLS chain, and a country with no single
regulator are **five different failure modes**. There is no one engineering fix that
addresses them, and four of the five are outside our control entirely.

---

## 3 · THE RULING THIS FORCES

**`§5A.1` requires the supply to keep running "without requiring manual hand-writing of every
record". On this evidence it cannot.**

| if | then |
|---|---|
| most looked like Nigeria | build DOD-03A as written |
| **most look like India / Philippines / Ghana** | **§5A.1 cannot pass as written** |

**Six of eight look like the second row.** So, per the plan's own instruction and the
anti-circle rule, **I am proposing an owner-approved SCOPE CHANGE rather than a quiet
redefinition later or a registry that sits empty.**

### What I propose §5A.1 becomes — and it is narrower, not vaguer

> **The supply is AUTOMATED where the source permits it and MANUAL where it does not, and
> every record records which.** `sourceMachineReadable` is not a footnote — it becomes the
> field that splits the work into two queues with two different costs, and DOD-03A passes on
> **the automated queue being genuinely automated**, not on the whole corpus being automated.

**Why this is honest and not a climb-down:**

1. It matches what was measured — 2 of 8 machine-readable — instead of assuming.
2. It **keeps a hard pass condition**: the automated queue must actually run unattended.
   Nothing becomes unfalsifiable.
3. It makes the owner's own hours a **budgeted, visible input** with a number against it,
   instead of an unstated dependency that only surfaces when the registry sits empty.

### And the consequence, stated plainly rather than buried

**Facts for roughly three-quarters of origins will cost human minutes, at acquisition and
again at every 180-day re-verification.** With `FACT_FRESHNESS_DAYS = 180` that is **two
passes per fact per year, forever**, for every fact whose source refuses a machine.

**That is the real cost of DOD-03A, and it was not visible before this probe.**

---

## 4 · 🔴 WHAT THIS PROBE CANNOT CLAIM

**It measures what a machine can acquire unaided from the open web, in English, in one pass
per country.** That is exactly what `§5A.1` asks — so the finding stands for the DoD question.
It is **not** proof the facts do not exist. Specifically:

- **A native-language search was not run.** BNMC publishes in Bengali; Egypt's syndicate in
  Arabic. A Bengali or Arabic query might find a page this probe did not.
- **A human could email or telephone any of these councils.** That is precisely the manual
  cost the scope change is about — it does not make the supply automated.
- **A scanned PDF may become readable with OCR.** OCR was not attempted. It would be a real
  option to cost, and it does not change today's classification.
- **n = 8, chosen for contrast, not at random.** Nigeria and Pakistan came from the first
  three and this pass respectively; the other six were picked to differ. **25% is an
  ESTIMATE carrying its sample, not a rate.**

**What would move the number:** probe ten more origins, weighted by AlmiOET's actual traffic
rather than by contrast, and run each in the country's own language. If Nigeria-grade turns
out to be 50%+, the scope change should be revisited — **and the DoD should be amended by
measurement in that direction too, not only in this one.**
