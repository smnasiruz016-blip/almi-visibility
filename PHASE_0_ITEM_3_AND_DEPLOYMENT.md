# PHASE 0 · THE DEPLOYMENT QUESTION, AND FROZEN ITEM 3 (GSC PREREQUISITES)

**11 September 2026.** Against the frozen boundary: **MEASURE FIRST. NO BUILD.**

**Read-only throughout.** Nothing on Vercel was changed — no integration disabled, no project
deleted, no setting touched. Every HTTP request was a `GET` with a truthful user-agent. **No secret
value is printed, echoed, logged, hashed or measured** — not a prefix, not a suffix, not a length.

**A stale 0-byte `.git/index.lock` was found again (11 Sep 02:08) and removed.** Second occurrence;
recorded, no blame.

---

# 1 · 🔴 THE DEPLOYMENT QUESTION — CONFIRMED, AND IT IS WORSE THAN THE QUESTION ASSUMED

The question put to me was whether tonight's documentation merges were production deployments.
**They were.** And measuring it revealed something the question did not ask about.

## 1.1 · The four questions, answered

| question | answer | evidence |
|---|---|---|
| Is Git integration ON for the Vercel project? | ✅ **YES** | the production deployment carries the alias `almi-visibility-git-main-almiworld.vercel.app`. **The `-git-main-` alias is issued only by a branch-connected project** |
| Does a push to `main` trigger a **production** deployment? | ✅ **YES** | `target: production` on every deployment created seconds after a merge commit |
| Do deployment times match our documentation PRs? | ✅ **YES — to the second** | table below |
| Build fail, or build pass and serve 404? | 🔴 **NEITHER. The build PASSES and the site SERVES THE REPOSITORY** | §1.3 |

## 1.2 · The correlation — five consecutive events, ±3 to 5 seconds

| git event (UTC) | | deployment created (UTC) | target |
|---|---|---|---|
| `5b88241` pushed, 00:20:48 | → | **00:20:52** | preview |
| **merge #22**, 00:23:34 | → | **00:23:37** | 🔴 **production** |
| `beef661` pushed, 00:55:48 | → | **00:55:53** | preview |
| `05fe556` pushed, 01:02:03 | → | **01:02:07** | preview |
| **merge #23**, 01:23:42 | → | **01:23:45** | 🔴 **production** |

> ### **EVERY BRANCH PUSH IS A PREVIEW DEPLOYMENT. EVERY MERGE TO `main` IS A PRODUCTION DEPLOYMENT.**
> Five for five, never more than five seconds apart. **This is not a correlation that needs a
> caveat.**

**So every documentation pull request tonight — #17, #21, #22, #23 — deployed to production**, and
so did the branch pushes that preceded them.

⚠️ **And `vercel project inspect` does not show it.** Its twenty lines of output name no repository,
no branch and no Git connection. **The integration is real and the project inspection is silent
about it** — which is why the earlier reading of "no framework, no `vercel.json`, no CI" looked like
"nothing happens on merge".

## 1.3 · 🔴 AND THE PART NOBODY ASKED ABOUT: THE REPOSITORY IS PUBLICLY READABLE

The project's **Output Directory** is *"`public` if it exists, or `.`"*. **There is no `public/`
directory.** The output directory is therefore the repository root, and the build — `.` at **0 ms**,
status `● Ready` — publishes the tree as a static site.

`/` returns **404** because there is no `index.html`. That is what made it look empty. **Every other
path is live.** Measured by `GET`:

| path | status | type | bytes |
|---|---|---|---|
| `/` | 404 | `text/plain` | 79 |
| `/PHASE_0_VERIFICATION.md` | 🔴 **200** | `text/markdown` | **24,272** |
| `/ARCHITECTURE_AND_GAP_REPORT.md` | 🔴 **200** | `text/markdown` | **70,442** |
| `/src/product.mjs` | 🔴 **200** | `application/javascript` | 5,267 |
| `/products/almi-oet/facts/uk-nmc.mjs` | 🔴 **200** | `application/javascript` | 14,353 |
| `/case-study-01/corpus/pages/control-1-uk-nmc.html` | 🔴 **200** | `text/html` | **62,938** |
| `/case-study-01/exhibits/…/src/app/layout.tsx` | 🔴 **200** | `application/octet-stream` | 2,731 |
| `/case-study-01/corpus/manifest.json` | 🔴 **200** | `application/json` | 4,263 |

> ## 🔴 ALL 163 TRACKED FILES ARE PUBLICLY DOWNLOADABLE AT `almivisibility.almiworld.com`.

### What that set contains

| class | count | what it is |
|---|---|---|
| `.md` | **28** | every internal audit, ruling, strategy and gap document — **including one that names infrastructure endpoints** (not reproduced here) |
| `.mjs` | **59** | the engine and the whole fact registry |
| `.html` | **15** | the case-study corpus — **verbatim captures of third parties' pages**, including a regulator's, at 62,938 bytes |
| `.tsx` / `.ts` | **18** | 🔴 **another product's application source code**, copied into `case-study-01/exhibits/` as defect evidence |
| `.json` | 37 | manifests, run reports, census output |

**And nothing restricts it:** `/robots.txt` returns **404**, so there is no `Disallow` of any kind.
The tree is unlinked rather than protected — **obscure, not private.**

### ✅ BUT PREVIEW DEPLOYMENTS ARE PROTECTED — AND THAT NARROWS THIS CONSIDERABLY

Measured rather than assumed, because the difference decides how far the exposure reaches:

| | result |
|---|---|
| **production** (`almivisibility.almiworld.com`) | 🔴 **200 — public to anyone** |
| **preview** (a branch deployment) | ✅ **302 → `vercel.com/sso-api`** — Vercel Deployment Protection |

> **A branch push publishes NOTHING. Only a merge to `main` does.**

**So the exposed set is exactly what has been merged to `main`**, and the three branch pushes in the
correlation table above — despite each producing a deployment — put nothing in public.

⚠️ **I had listed this as an UNKNOWN and then measured it**, because a conclusion that says "every
push deploys" without saying *what a preview deployment is readable by* is a finding shaped to
alarm rather than to inform. **One `GET` was the whole cost.**

### 🔴 Why this is a finding and not a footnote

Three of the project's own standing laws land on it at once:

1. **The Phase 0 forbidden list names "production changes" and "page generation/publishing".**
   Every documentation merge tonight did both, unknowingly. **The boundary was crossed by the act
   of documenting the boundary.**
2. **The licence law.** This project holds that a source's wording may be stored only under its
   licence, that `RESERVED` is the legal default, and that OET's terms are `PROHIBITED`. **A
   verbatim third-party page republished on our own domain is redistribution**, and no such
   permission was ever assessed for the corpus.
3. **A connected product's source code is being served from a different product's domain.**

**Register: ALMIVISIBILITY CAPABILITY / INFRA GAP — `DEP-2`.** Recorded with `DEP-1`.

> ### 🔴 NOTHING WAS CHANGED, AND NOTHING WILL BE.
> No Vercel setting touched, no integration disabled, no file deleted, no `.gitignore` edited, no
> deployment removed. **This is the owner's decision and I am not asking for it** — the boundary
> says record the result and stop, so the result is recorded and I have stopped.
>
> **One consequence belongs in the record, though:** every further documentation merge republishes
> this tree. **That is now a known consequence rather than an unknown one**, and the next merge is
> made in knowledge of it.

⚠️ **Whether any of it has been crawled or indexed is UNKNOWN** and cannot be answered without
Search Console — which is item 3, below, and blocked on the same read-only access.

---

# 2 · FROZEN ITEM 3 — GSC / SEARCH MEASUREMENT PREREQUISITES

**Read first: `ARCHITECTURE_AND_GAP_REPORT.md` §6.** Per the AUDIT ONCE rule, that section is
**not rewritten.** What follows records what it already answers, and adds only what is genuinely
uncovered.

## 2.1 · What §6 already establishes — complete, and not re-derived

| requirement | already answered in §6 |
|---|---|
| **property type** | a **GSC Domain property for `almiworld.com` ALREADY EXISTS** — the owner's first-hand correction of 10 September. Domain-property identifiers take the `sc-domain:` form |
| **what is actually open** | **one thing only: read-only API access to that property** |
| **API** | **Search Console API** — Search Analytics (queries, pages, impressions, clicks, position) and the **URL Inspection API** for per-URL index status |
| **minimum scope** | **`https://www.googleapis.com/auth/webmasters.readonly`** |
| **OAuth or service account** | **service account** is the right shape for an unattended worker — no refresh-token expiry, no browser. Requires the owner to add the service account's email as a user on the property |
| **what the owner must authorise** | four numbered steps in §6, ending with *"hand over the property identifier and the key by a route that is not this chat"* |
| **data freshness / lag** | **UNKNOWN** — and Gate B's waiting period depends on the real lag, not an assumed one |
| **reusable prior art** | `almi-seo-ops/submit-sitemaps.mjs` already encodes the property-mode question (`url-prefix` vs `sc-domain`) and the per-product feed paths |

**Item 3's substance is covered.** Nothing here is missing that Phase 0 could supply.

## 2.2 · 🔴 THE DEFECT FOUND BY READING IT — A DOCUMENT THAT CONTRADICTS ITSELF

| where | what it says |
|---|---|
| §1, executive table, line 89 | *"Google Search Console access \| **UNKNOWN** — nothing enabled, nothing authorized"* |
| §6 | *"A GSC Domain property for `almiworld.com` **ALREADY EXISTS** … **WHAT IS ACTUALLY OPEN IS ONE THING AND ONLY ONE: READ-ONLY API ACCESS**"* |

The commit that introduced the correction says it was *"corrected in every copy"*. **It was not
corrected in the executive summary of the same file.**

> ### 🔴 RULE THIRTEEN: A FACT WRITTEN IN TWO PLACES IS NOT CORRECTED ONCE.
> And it broke **inside the document that states that rule**, in §11a.7.
>
> **An executive summary that lags its own document's correction does not merely fail to help — it
> RE-ASSERTS the error.** A summary is what gets read. The correction sits 280 lines below it.

**Corrected in this PR**, in place, marked rather than silently rewritten: §1's row now carries the
owner's finding with a pointer to §6. **The old text is struck, not deleted** — a status that
changed when the evidence changed is worth keeping visible.

**Register: ALMIVISIBILITY CAPABILITY GAP — `DOC-1`** (a documentation-integrity gap: no mechanism
ensures a summary follows a correction to its own body).

## 2.3 · ⚠️ A SECOND SUMMARY ROW, CORRECTED ON MY OWN INITIATIVE — REJECT IT IF THAT IS WRONG

One row was named for correction. **I corrected a second one and am flagging it rather than
burying it**, because it is the same defect class and I had just measured it:

> §1: *"`/sitemap.xml` on the 23 product hosts — **404 on every one of them**"*

**The row is TRUE and it is MISLEADING**, and §4 of the same document already shows why: 26 hosts
declare a sitemap in `robots.txt`, 24 at `/sitemap-index.xml`, and **25 of 26 declared sitemaps
return valid XML.** Read alone — which is what a summary is for — the row says the estate has no
sitemaps. It has them, at a different path.

**I did not reword the claim.** I appended the §4 context and the re-measurement date. **If
touching a row nobody asked me to touch is outside the boundary, revert that one hunk** — the GSC
correction stands independently of it.

---

# 3 · GAP REGISTER — ADDITIONS

## ALMIVISIBILITY CAPABILITY / INFRA GAPS

| id | gap | evidence |
|---|---|---|
| **DEP-2** | the repository is published as a public static site; **163 tracked files downloadable**, including a third party's captured pages and another product's source code; no `robots.txt` | §1.3 |
| **DOC-1** | no mechanism makes an executive summary follow a correction made to its own body | §2.2 |

`DEP-1` (deploys on push, no CI) stands and is now **measured rather than inferred**.

🔄 **SUPERSEDED 14 September 2026:** it no longer stands. Git deployments are off (`vercel.json`
`{"git": {"deploymentEnabled": false}}`, since `774791b`), and CI runs on every pull request and every merge commit.
The evidence, and what is still not measured (whether the check is required), is in `PHASE_0_FROZEN_GAP_REGISTER.md`
under `DEP-1`. The measurement above was true on the day it was made and is kept as it was.

## PRODUCT DATA GAPS

**None added by this document.**

## Confirmed, not re-measured

**`ISO-1` stands as recorded.** Beta-g's four attempts to reproduce the isolation probe failed on
incomplete descriptor input, and the baseline reconciles exactly: **`almi-oet` alone gives licences
7 and gaps 12** — the same figures my probe moved to 8 and 13. **The measurement is confirmed and
is not repeated here. Not fixed — that is Phase 1.**

---

# 4 · UNKNOWNs — FOUR FIELDS

| # | UNKNOWN | reason | evidence required | who can resolve | recheck on |
|---|---|---|---|---|---|
| **U-DEP-2** | whether the published tree has been **crawled or indexed** | it is unlinked and has no `robots.txt`, so discovery depends on external linking and on crawler behaviour, neither of which is visible from here | Search Console coverage / URL Inspection for the host | **owner**, after read-only API access | after that access |
| ~~U-DEP-3~~ | ~~whether preview deployments are equally public~~ | ✅ **RESOLVED — measured, not left open.** A preview returns **302 to `vercel.com/sso-api`**: Vercel Deployment Protection. **Previews publish nothing; only merges to `main` do** | — | — | — |
| **U-GSC-1** | the real Search Console **data lag** | Gate B's waiting period depends on the measured lag, not an assumed one | a first query against the property | **owner**, after read-only API access | after that access |
| **U-GSC-2** | the **URL Inspection API quota** in practice | quota is per property and per day, and has never been exercised | a first run | **owner**, after read-only API access | after that access |
| **U-DOC-1** | whether the same correction lags elsewhere | only the GSC fact was traced across the document | a sweep of every fact stated in both a summary and a body | later phase | — |

---

## WHAT THIS DOCUMENT DID NOT DO

- 🔴 **Nothing on Vercel was changed.** No integration disabled, no setting touched, no project or
  deployment deleted. **Read-only inspection only.**
- **No file deleted, no `.gitignore` edited, nothing unpublished.** The exposure is recorded, not
  acted on. **The decision is the owner's and no permission is requested for it.**
- **`A1`–`A4` and `ISO-1` not fixed.** CRLF not fixed. `bin/` imports not generalised.
- **No section of `ARCHITECTURE_AND_GAP_REPORT.md` rewritten** — one wrong row corrected in place,
  marked, with the old text struck rather than removed.
- **No claim, no page, no build, no schema, no activation, no paid provider, no cost incurred.**
- **No secret value printed, hashed or measured.** The one document that names infrastructure
  endpoints is identified by that fact alone; **its identifiers are not reproduced here.**
- **`almi-oet` not modified.** Its source was read only where this repository already contains a
  copy of it.
- **No new GREEN requested.**
