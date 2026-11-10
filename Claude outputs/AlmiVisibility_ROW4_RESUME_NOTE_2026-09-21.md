# ROW 4 — RESUME NOTE, 21 September 2026

**Why this file exists:** DNS went down on the working machine mid-run. The measurements below were
completed and reported by CC before the outage, but they live only in that session's context. This note
carries them so **none of it is re-measured next session**.

> Everything here is **as CC reported it**, not as beta-g re-measured it. If a later CC run re-measures
> any of it and disagrees, **the re-measurement wins and this note is wrong.**

---

## 1 · HEADS AND STATE AT THE PAUSE

| | |
|---|---|
| Engine `almi-visibility` main | `12956f2` — clean, no branch created, nothing staged |
| Data `almi-visibility-data` main | `e0b85f9` — clean |
| `_handoffs` local main | **`24bcaab`** — ruling addendum, **committed locally, NOT pushed** |
| Row 4 | **BUILT-NOT-PROVED**, unchanged |
| Board | 26 / 61 · 26 / 38, unchanged |

🔴 **First action when DNS returns: push `_handoffs`.** The Row 4 ruling addendum is on one disk.
Verify by fetching and reading the ref, not by the push command's exit status.

**Prior records:** command `ea43c69` · ruling `eb05a3c` · addendum `24bcaab` (local only).

---

## 2 · LIMB (a) — MEASURED 0 ACROSS ALL THREE VERBS

The owner ruled `LIMB_A_SUBJECT: engine-behaviour`, scoping limb (a) to AlmiVisibility's own
**construction, acceptance and recommendation** behaviour. All three were measured.

| verb | denominator | result | live control |
|---|---|---|---|
| **construction** | all **170** `src/` and `bin/` files | **0** lines building a URL from a country value | the census's own RED test — "a consumer that turns a country into an address is caught" — still fires |
| **acceptance** | every path that accepts a page | **0** — the only accepting path builds from **product-declared specs**; the two real specs are professions (`nursing`, `speech-pathology`), not countries | a rationale naming only the variant is **REJECTED**; test passes |
| **recommendation** | every path that emits a verdict or proposal | **0 BUILD · 7 MONITOR · 7 UNKNOWN** | control test proving BUILD **is** reachable when every leg is measured passes |

**Verdict: limb (a) NOT MET across the ruling's full scope.** The owner's clause 2 therefore stands
complete, not on one verb out of three.

### Four third worlds found — none blocking

1. Country rows alone can produce **MONITOR**, which recommends no URL.
2. `bin/acceptance-test.mjs --rollout` generates per-country text, but only inside a measurement over
   **existing** pages — it creates no URLs.
3. **BUILD is not reachable from any `bin/` entry point today.**
4. The construction path multiplies pages only when **other evidence is also present** — not by country
   alone.

### 🔴 The condition the recommendation zero rests on

Third world 3 is a **condition of the proof, not a footnote.** The recommendation verb reads 0 partly
because BUILD cannot be reached from any CLI entry point. **If BUILD later becomes reachable, the
recommendation verb must be re-measured.** Write this condition into Row 4's evidence — a proof whose
condition is unwritten is a proof that expires silently, and no test will catch it.

---

## 3 · 🔴 A SECOND HARD-CODED COUNTRY LIST

`bin/acceptance-test.mjs --rollout` **hard-codes a country list in `bin/`.**

This is **not** the already-parked `config/discovery/axis-candidates.mjs`. It is a **separate, newly
found** item. CC reported it and did not touch it.

Consequence: the engine now has **two** known places with fixed countries in its tooling, so the
product-identity line *"no fixed countries in generic engine code"* carries two exceptions. Record it;
do not repair it; do not let a handoff claim a neutrality that is not yet true.

**Also recorded:** the parked `axis-candidates.mjs` **is read on Row 4's closure path**, at
`bin/localized-thinking.mjs:19,25`. If Row 4 ships on that path, the parked item ships with it.

---

## 4 · POPULATION — MEASURED, NOT STALE

The stored `runs/discovery/localized-thinking-2026-09-15.json` was checked against a fresh run:
**37 goals both times — not stale.**

| | |
|---|---|
| total goals | **37** |
| differently worded | **12** |
| same wording | **25** |
| rows in goals | 106 |
| human rows in no goal | 273 |
| operator rows | 9 |
| **total** | 106 + 273 + 9 = **388** |
| fixtures | **0** |

---

## 5 · RANKED CANDIDATES — DECLARED BEFORE ANY SOURCE WAS OPENED

Ranked on observable stored properties only: country count · presence of a real wording difference ·
query population · primary-source reachability. **Top: `G01` — "daily habits" / "life habits", 6 countries.**

🔴 **Open question before spending requests.** The ranking is sound and non-circular, but criterion 4
tests **reachability**, not **existence**. "Daily habits" is a subject no authority governs, so the
research could burn requests proving that a subject nobody regulates has no regulator.

**Before research resumes:** state for each of the top three candidates whether its subject matter is
governed by any official, regulatory, governmental or educational body **at all**. That asks what *kind*
of source could exist — not what the local reason is — so it presumes no answer. If the top candidate
has none, record that and move down the ranking, saying why.

---

## 6 · WHAT THE PAUSE IS — AND IS NOT

**INFRASTRUCTURE PAUSE — DNS UNAVAILABLE.** The working machine could not resolve any host, including
`api.anthropic.com`, so the assistant itself could not run.

**This is NOT an external-source blocker.** An external-source blocker is a *measured finding* that no
lawful source exists, and it requires a live positive control proving the search could have found one.
**No search ran. Nothing was learned about any source.**

---

## 7 · WHEN DNS RETURNS — ORDER OF OPERATIONS

1. **Push `_handoffs`** and verify origin contains `24bcaab` by fetching and reading the ref.
2. **Write these measurements into the addendum file** and commit under RR-76, so they stop living in a
   context window. Do this **before** any research.
3. Answer the authority-existence question for the top three candidates (§5).
4. Then resume the bounded research: **30 requests max**, public and free only, request ledger kept.
5. Then schema if needed, implementation, three-world proofs, sabotages, real evidence, tests, data and
   engine PRs, merge, main CI, truthful ledger movement.

**Do not re-measure anything in §2, §4 or §5.** It is measured, controlled and recorded here.

### The research laws that must not be lost

- **WebFetch output may never be a source-of-truth citation.** It may only find *which* page to open.
  Every stored proposition, quote, figure and date comes from opening the page in a browser and reading
  its text. A page that cannot be opened that way is recorded **UNAVAILABLE** and nothing from it is stored.
- **Bot detection is a stop, never a puzzle.** CAPTCHA, interstitial, rate-limit, paywall or ToS refusal
  → **UNAVAILABLE**. Never evade, never retry around it, never use a mirror, cache or archive.
- **A language model's interpretation is never the stored source.**
- **A tenant is externally declared** and is never derived from a country, locality, hostname, product
  name, repository name, folder path, batchId or page content.
- **Finding nothing is D, never B.** A failure to measure is never a finding about the subject.
  **D never becomes C.** **CONFLICTING is its own state** and is never resolved by silently preferring
  one source.

---

## 8 · STILL OPEN ON ROW 4

Row 4's FAILURE is settled: limb (a) NOT MET across all three verbs → **the frozen FAILURE is not met.**

So closure now rests **entirely on EXPECTED and EVIDENCE**:

> EXPECTED: *"local phrasing and reasoning are researched; country is a research lens, never an
> automatic URL axis."*
> EVIDENCE: *"the local-wording records and their sources."*

Three things must still be established, and the **coverage** question must be answered from the frozen
text **before** research, not discovered afterwards:

1. what makes *"local phrasing researched"* satisfied — and whether stored records already satisfy it
2. what makes *"local reasoning researched"* satisfied, under the owner's definition: independent public
   evidence explaining **why** the same goal is understood, constrained, prioritised or expressed
   differently in that locality
3. how the *"research lens, never an automatic URL axis"* clause is **proved**, not asserted
4. **coverage** — does the frozen EVIDENCE clause require the whole population, or the existence of
   qualifying records? If the frozen text is silent, that is a measured G1 ambiguity and it is reported
   before any research begins.

---

*Nothing in this note is a ruling. Nothing in it is a tick.*
