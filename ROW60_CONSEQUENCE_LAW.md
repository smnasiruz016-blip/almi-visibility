# ROW 60 — THE OWNER'S CONSEQUENCE LAW AND THE 17 ASSIGNMENTS · 14 SEPTEMBER 2026

🔴 **FROZEN. Do not edit.** `test/consequence-law.test.mjs` holds this file's hash, and every register entry in
`config/consequence-register.mjs` must appear in it word for word.

- **Ruled by:** the owner, 14 September 2026. He ruled the scale and the law, and adopted the 17
  assignments by handing over the command that carries them.
- **Where the wording came from:** the assignment wording is beta-g's proposal
  (`_handoffs/AlmiVisibility_ROW60_SEVERITY_ASSIGNMENTS_PROPOSAL.md`), which the owner adopted. It is
  reproduced unchanged in Part 2, including its own words "PROPOSAL" and "Not a ruling". Those words
  describe the document as written. The ruling is the adoption.
- **Row 60's frozen contract is unchanged:** `PASS_BOUNDARIES_AMENDMENT_3.md`.

---

## PART 1 — THE LAW (owner's words, verbatim)

```
THE SCALE — five levels, strongest first. UNCLASSIFIED is NOT one of them.
  CRITICAL  consequence irreversible, or practical recovery not dependable; credible risk of
            catastrophic or systemic loss to security, data, production or search visibility.
  HIGH      material serious harm possible, but recovery is possible — costly, complex, slow,
            or demanding broad intervention.
  MODERATE  meaningful harm, bounded and reversible, recoverable by normal corrective work.
  LOW       limited or minor consequence; easily reversible; does not materially threaten core
            production, data, security or indexation integrity.
  NONE      verified no material adverse consequence.

A1  Every class carries an explicit level AND a short evidence-based reason. A level is never
    assigned from a class's NAME — it is justified from actual consequence and blast radius.
A2  Ordering is strongest-first and DETERMINISTIC: the same evidence never classifies twice
    differently.
A3  🔴 SEVERITY = CONSEQUENCE FIRST; VOLUME / BLAST RADIUS = AMPLIFIER.
    Decision order, in this sequence: 1. consequence → 2. reversibility / recovery burden →
    3. blast radius as amplifier.
    Same intrinsic defect + more volume = higher priority INSIDE the same base severity.
    Escalation to the next severity ONLY when increased blast radius objectively changes the
    material consequence itself. Volume never defines primary severity.
A4  UNCLASSIFIED = UNKNOWN. Never LOW, never NONE, never safe-by-default. An unknown class is
    never executed on a fallback: classify first, or establish evidence; where a required
    safety decision cannot be made, FAIL CLOSED or route to owner review.
    🔴 UNKNOWN IS A CLASSIFICATION STATE, NOT A SIXTH SEVERITY. Keep the model clean.
    INFORMATIONAL and OBSERVATION are likewise NOT severities. If the system needs those
    labels, they are finding or reporting STATES, never members of the severity scale.

ENTRY SHAPE — all six, and the validator refuses a partial entry:
  FINDING CLASS → BASE SEVERITY → CONSEQUENCE → REVERSIBILITY → BLAST-RADIUS/VOLUME EFFECT → REASON
🔴 REVERSIBILITY is a NEW required field. It does not exist in the register today.
```

## PART 1B — THE THREE BUNDLED CLASSES AND PART C (owner's words, verbatim)

```
🔴 THREE CLASSES STAY UNCLASSIFIED, AND THE REASON IS STRUCTURAL, NOT LAZINESS:
  noindex                       bundles a DEFECT and a DELIBERATE DECISION — 134 of its 268
                                were ruled SUPERSEDED as intentional de-indexing
  indexability-preflight        bundles "a condition blocks eligibility" with "one left
                                UNMEASURED" — only one of those is a defect
  sitemap-advertises-blocked-url  bundles a real contradiction with "the inputs are not stored"
A class whose own definition holds two opposite consequences cannot carry one severity.
Record each as UNCLASSIFIED with the bundling named and the split that would fix it. DO NOT
guess a level and DO NOT pick the "dominant" half. Splitting them is separate, later work.
⚠️ status-and-redirects has a milder version (a redirect and a 404 differ). It is LOW because
both halves are limited and reversible, so the bundling does not change the level. Record that.

PART C — REC-AI-CRAWLER-BLOCK: UNCLASSIFIED / UNKNOWN. No entry is stretched to reach it, no
nearest class is guessed, no level comes from the words "AI" or "crawler" in its name. Record
the exact gap: it rests on crawler observations, not a finding class, so no class-keyed entry
can apply. Name what it needs — affected scope, crawler access, robots directives in force,
reversibility, and the measured visibility or indexation consequence — defined AND TESTED
before it can ever be executable.

IMPLEMENT: consequence-first ordering with volume as amplifier WITHIN a level; today's basis
(impressions alone — 484 and 219) now sits UNDER consequence, not beside it.
```

---

## PART 2 — THE ADOPTED ASSIGNMENTS: THE PROPOSAL, REPRODUCED UNCHANGED

> The proposal follows as written. Only its heading levels are pushed down two, so it nests under this Part.

### ROW 60 — THE 17 FINDING CLASSES, ASSIGNED TO THE FIVE LEVELS

**beta-g's PROPOSAL, 14 September 2026. Not a ruling.** The register records the owner's name
against every level, so nothing here is written until he confirms or amends it.

Method, exactly as ruled: **1. Consequence → 2. Reversibility / recovery burden → 3. Blast
radius as amplifier.** No class was assigned from its name. Counts are the generated sheet's
(`runs/export/row60-ruling-sheet.md`), which the runner derives from the store.

---

#### THE HEADLINE, AND IT IS WORTH READING BEFORE THE TABLE

> ### 🔴 **Nothing in the store is CRITICAL, and that is a real finding, not a soft result.**
>
> `CRITICAL` means irreversible, or recovery not dependable. **Every one of the 17 classes is a
> configuration or content defect that a commit can undo.** Not one of them destroys data, leaks
> a secret, or costs money that cannot be recovered.
>
> The engine has never yet measured the kind of thing `CRITICAL` exists for. **That is a fact
> about where this engine has looked so far, not a clean bill of health** — and when the first
> irreversible class does appear, the level is already defined and waiting for it.

---

#### THE PROPOSED ASSIGNMENTS

##### HIGH — 4 classes

| class | open | consequence | reversibility | blast radius / volume effect | why this level |
|---|---|---|---|---|---|
| `official-source-contradicts-itself` | 1 | a person acting on a regulatory requirement could be misled in either direction — the harm lands on them, not on us | **not ours to fix.** The contradiction is inside the official source. Our only correct response is to withhold the claim and mark UNKNOWN | 1 fact today, but it is the kind of fact a reader acts on with money or a career | material serious harm is credible and recovery for the person is not in our hands. It is not CRITICAL because our own response — refuse to publish it — is available, cheap and already enforced |
| `instrument-disagreement` | 0 of 11 (all closed) | two of **our own** instruments disagree about the same page on the same inputs. Every tick downstream of either becomes suspect | reconcilable — all 11 were | narrow in count, wide in effect: it undermines the evidence layer the whole product stands on | the consequence is systemic to the product's credibility even at low volume. Base severity describes the class, not today's zero |
| `host-publishes-no-a-record` | 1 | an entire host is unresolvable to every IPv4 client and crawler | one DNS record — trivially reversible | **one host, therefore every page on it.** This is the amplifier doing what it was ruled to do: blast radius objectively changes the consequence from "a page" to "a site" | serious while it stands, recoverable. The record itself states it does NOT establish whether Googlebot is affected — so the level rests on the measured IPv4 fact, not on an assumed search impact |
| `exact-duplicate` | 106 | bodies byte-identical to other pages. This is the unambiguous half of the failure class that made a 43-million-page estate worthless | reversible — merge, noindex or remove | 106 pages, and duplication degrades the standing of the estate around them, not only themselves | assigned for the mechanism, not the memory: byte-identical inventory carries zero added value by definition, and it is the clearest low-value signal we produce about ourselves |

##### MODERATE — 6 classes

| class | open | consequence | reversibility | blast radius / volume effect | why this level |
|---|---|---|---|---|---|
| `robots-blocks-search-crawler` | 106 | pages that **are** answering real searches (verified: all 106 draw impressions, 216 in total) are disallowed to the crawler | one robots.txt edit | 106 of roughly 1,497 URLs — meaningful, not systemic | real, bounded, reversible by normal corrective work. Volume raises its priority inside MODERATE; it does not change what the defect *is* |
| `orphan-within-crawled-set` | 340 | no page inside the crawled set links to it — discovery depends entirely on sitemaps | add links | 🔴 **340 is where the amplifier legitimately escalates:** one orphan is a stranded page, 340 is a structural linking failure, and that is a different consequence, not merely more of the same | escalated from LOW to MODERATE by blast radius, under the rule that volume may cross a boundary only when it objectively changes the consequence. Flagged as the one escalation in this proposal |
| `near-duplicate` | 113 | bodies highly similar to a sibling | reversible — merge, differentiate or remove | 113 | the same family as exact-duplicate but at a judged threshold rather than a byte match, so the consequence is weaker and the remedy is ordinary editorial work |
| `template-dominance` | 110 | the shared shell makes up most of a page's words — the reader receives furniture, not answer | reversible — add real content or remove the page | 110 | bounded and reversible; it is a quality failure, not an integrity failure |
| `thin-content` | 226 | fewer unique body words than the floor after the shell is subtracted | reversible — write it properly or remove it | 226, the largest content class | the other named half of the historical failure, but unlike exact-duplicate a thin page may still carry some value, so the consequence is weaker |
| `commencement-date-ambiguous-against-source` | 1 | a date someone plans around cannot be read unambiguously from its source | our response is to mark UNKNOWN and withhold | 1 | bounded and handled. ⚠️ **It rises to HIGH the moment an ambiguous date is rendered on a page** — record that condition on the entry |

##### LOW — 4 classes

| class | open | consequence | reversibility | blast radius / volume effect | why this level |
|---|---|---|---|---|---|
| `status-and-redirects` | 7 | the URL does not return 200 directly — it redirects or errors | reversible | 7 | limited and reversible. ⚠️ a redirect and an error are not the same defect; see the impurity note below |
| `head-elements` | 18 | broken heading structure — no h1, or a level used before it | trivially reversible | 18 | affects comprehension and assistive technology; it threatens no integrity |
| `canonical` | 6 | no `rel=canonical` in the raw HTML, so a search engine chooses for us | trivially reversible | 6. ⚠️ **it interacts with the 106 exact duplicates** — on a duplicated page the absent canonical is what lets the wrong URL win | LOW on its own evidence today. If any of the 6 sit on duplicated pages, that intersection should be measured and the entry revisited |
| `query-parameters` | 1 | the URL carries query parameters | trivially reversible | 1 | limited, reversible, no integrity threat |

##### NONE — 0 classes

Nothing qualifies. `NONE` means *verified* no material adverse consequence, and no class here has
been verified to that standard.

---

#### 🔴 THREE CLASSES COME BACK UNCLASSIFIED — AND THE REASON IS STRUCTURAL

These are not assignments beta-g could not make. They are classes that **cannot carry one
severity, because their own definition bundles two different things.** Under the ruling —
*"agar evidence class ki severity determine nahi karta: UNCLASSIFIED / UNKNOWN → fail closed"* —
guessing a level here would be exactly the nearest-class fallback that was forbidden.

| class | open / distinct | what it bundles | what would fix it |
|---|---|---|---|
| `noindex` | 134 / 268 | 🔴 **a defect and a deliberate decision.** 134 of the 268 were already ruled SUPERSEDED as intentional de-indexing. The same class therefore holds pages we meant to hide and pages accidentally hidden — opposite consequences | split into *unintended noindex* (a defect) and *declared noindex* (not a finding at all) |
| `indexability-preflight` | 368 / 368 | *"a condition blocks eligibility, **or one left unmeasured**"* — a blocked page and an unrun check are not the same event, and only one of them is a defect | split the blocked condition from the unmeasured check |
| `sitemap-advertises-blocked-url` | 350 / 350 | *"a sitemap advertises a URL that robots.txt blocks — **or the inputs to check it are not stored**"* — same shape: a real contradiction bundled with a measurement gap | split the contradiction from the missing input |

**All three fail closed and stay UNKNOWN until they are split.** Splitting them is a separate,
small piece of work — and until it happens, the three largest counts in the whole store
(368, 350, 268) are carrying a severity nobody can honestly state.

⚠️ `status-and-redirects` has a milder version of the same impurity — a redirect and a 404 differ.
It is proposed at LOW rather than UNCLASSIFIED because both halves are limited and reversible, so
the bundling does not change the level. Recorded so it is not missed later.

---

#### PART C — `REC-AI-CRAWLER-BLOCK`

**UNCLASSIFIED / UNKNOWN**, as ruled, and no entry is stretched to reach it.

The exact gap, named: it rests on **crawler observations**, not on a finding class, so no
class-keyed register entry can ever apply to it. Its severity was not taken from the words "AI"
or "crawler" in its name, and no nearest class was guessed.

What it needs before it can be executable: a class or boundary defined and tested against its
**actual** evidence — affected scope, crawler access, the robots directives in force, the
reversibility of the block, and the measured search or AI visibility consequence.

---

#### SUMMARY

| level | classes |
|---|---|
| **CRITICAL** | 0 |
| **HIGH** | 4 |
| **MODERATE** | 6 |
| **LOW** | 4 |
| **NONE** | 0 |
| **UNCLASSIFIED** | 3 + `REC-AI-CRAWLER-BLOCK` |

**One escalation by blast radius:** `orphan-within-crawled-set`, LOW → MODERATE, because 340 is a
structural failure and one orphan is not. It is named here so the owner can reject that single
escalation without disturbing anything else.

**Every line above is beta-g's reasoning, not the owner's ruling.** Confirm, amend, or overturn
any of it; only then does it go into `config/consequence-register.mjs` under his name and date.
