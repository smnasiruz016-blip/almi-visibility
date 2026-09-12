# AlmiVisibility

**AlmiWorld Global Search & AI Visibility Engine** — internal infrastructure, not a product.

Discovers real search demand, audits what blocks discovery and citation, and produces
evidence-backed fix commands for **one authorized product at a time**.

> Evidence → action → reviewed fix command → re-test.
> Never decorative scores. Never ranking or AI-placement promises.

**This repository deploys nowhere:** it has no web application — only Node CLI scripts and a report file opened from disk — so `vercel.json` turns Git deployments off (`config/sources/vercel-git-configuration.mjs`); a preview built per PR spent build minutes on a check that meant nothing.

---

## 🔴 What this repository deliberately does NOT do

This is the most important section on the page. Read it before adding a feature.

| Absent by design | Why |
|---|---|
| **Page generation — in every form** | v0.1 has no page-generation capability at all |
| Any write to a product repository | AlmiVisibility recommends; CC implements |
| Autonomous publishing | A research agent that can publish will eventually publish its own research |
| Multi-provider agent orchestration | Provider-neutral *interfaces* only; no paid provider on by default |
| A full dashboard | One report/action view until the audit layer earns trust |

**THE SAFEST COST GATE IS THE ABSENT FEATURE.** A capability that does not exist cannot be
enabled by accident, reached by a misconfigured job, or triggered by an agent granted one
permission too many.

## 🔴 SEV-0 — the failure this exists to prevent

AlmiWorld previously ran a system that generated **~43,000,000 pages** — duplicate, thin and
largely non-indexable — at a reported **$100–150+ per week**. It was stopped because the cost
was not affordable and the inventory was not worth it.

This is not history. It is the architectural constraint.

### Absolute invariants

```
universe            != page count
database row        != route
candidate           != generated page
draft               != deployment
deployment          != sitemap admission
sitemap admission   != indexing, ranking or citation
fetched URL         != indexed URL
crawled inventory   != the site
```

No generate-all or publish-all control. No research agent publishes production.
No paid provider silently enabled. No uncontrolled recurring cost.

🔴 **The last two were added with the crawler (11 September 2026), and they are the SEV-0
failure seen from the other side.** Last time we *generated* the pages. A crawler we operate
reading 240,328 dynamically-served pages would *pay to read them* — same account, same
mechanism, opposite direction. So the crawler's cap is a module constant with no switch, its
default is a dry run, and every run states in words that its requests are billable traffic on
our own account.

## Status

**Phase 0 — measurement, not code.**

Phase 1 does not begin while any prerequisite reads UNKNOWN: Search Console verification and
API authorization per property · analytics available per product · execution layer for
long-running workers · database isolation and capacity · which existing artifacts are ingested
rather than re-derived · money and wall-clock budget for the next phase.

Each answer is recorded **with a date**.

## How it is judged

**Case Study #1 is falsifiable.** AlmiVisibility must independently find six historical
AlmiOET defects from public evidence, without being told where they are — **and must not flag
three correct control pages.**

Six of six RED with a clean control is a pass.
**Six of six RED with any control false positive is a FAIL, not a partial pass** — a reviewer
who cannot trust the findings stops reading them, and an engine nobody reads costs money and
returns nothing.

## Principles

```
GLOBAL BY DESIGN.              LOCAL BY EVIDENCE.
UNIVERSE IS NOT PAGE COUNT.    NO PAGE WITHOUT A REASON TO EXIST.
CODE BEFORE AI WHERE CODE IS ENOUGH.
CACHE BEFORE RESEARCHING THE SAME FACT AGAIN.
AGENTS RESEARCH; THEY DO NOT OWN PRODUCTION.
SMALL BATCH → VERIFY → SCALE.  SITEMAP IS AN ADMISSION GATE, NOT A DUMP.
MEASURE MONEY, TIME AND OUTCOME.
NEVER FAKE WHAT CANNOT BE MEASURED.
```

## Cost is measured on two axes

Money — and **which products are paused while this is built**. The second one appears in no
cost ledger and is the one actually in short supply. A phase that overruns its wall-clock
budget reopens the sequencing decision; it does not silently extend.

---

*Internal AlmiWorld infrastructure. Dashboard target: `almivisibility.almiworld.com` —
authenticated and non-indexable.*
