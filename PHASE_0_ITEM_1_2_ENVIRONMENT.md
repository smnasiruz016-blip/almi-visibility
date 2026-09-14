# PHASE 0 · ITEMS 1 & 2 — THE REAL ENVIRONMENT, MEASURED

**11 September 2026.** Written against the frozen boundary recorded in
`_handoffs/PHASE_0_FROZEN_BOUNDARY_AND_F_MAPPING.md` §1:

> **PHASE 0 = MEASURE FIRST. NO BUILD.**

Covers frozen item **1**'s remaining half (the real environment — the AlmiVisibility repository half
was already measured) and frozen item **2** in full: product isolation · database/infrastructure ·
analytics/funnel · public SEO surface · reusable assets · prerequisites.

**Measured at `origin/main = b832dc0`.** Every figure below names the command that produced it.
**Nothing was activated, changed, submitted, published or paid for.** All network access was
`GET`, with a truthful user-agent — no spoofing, no proxy. Secrets: **no value of any credential is
printed, echoed, logged, hashed or measured here — not a prefix, not a suffix, not a length.** Only
variable NAMES and project names appear.

---

# 1 · SECURITY POSTURE OF THIS MEASUREMENT, STATED FIRST

| rule | how it was kept |
|---|---|
| never print a secret's value | only env var **names** were read, from `schema.prisma` and source. **No `.env` file was opened. `vercel env pull` was never run** — it writes secrets to disk |
| never screenshot a terminal | none taken |
| shared-database question answered by **host**, never credential | not attempted here; recorded as an **UNKNOWN** with the host-comparison method named (§9, U-DB-1) |
| a refusal is a cost, not a detour | three hosts fail DNS. Recorded as failures. **No retry with a different agent string, no proxy** |
| `almi-oet` is read-only | not read at all in this item |

---

# 2 · ITEM 1 — THE REAL ENVIRONMENT

## 2.1 · The estate, counted

| | | command |
|---|---|---|
| directories under `C:\Projects` | **44** | `ls -d */ \| wc -l` |
| of those, linked to a Vercel project | **27** | `for d in */; do [ -d "$d/.vercel" ] && echo $d; done` |
| Vercel projects under org `almiworld` | **34** | `vercel project ls` (2 pages) |
| Node version on every project | **24.x** | `vercel project ls` |
| candidate hosts derived from repo source | **31** | ripgrep for `https://<sub>.almiworld.com` across `*.{ts,tsx,js,mjs,json,md}` |
| hosts answering `200` at `/` | **27** | `seo-surface` GET sweep, §4 |
| hosts failing DNS | **3** | `almipathway` · `almixyz` · `swedish` |
| host answering `404` at `/` | **1** | **`almivisibility.almiworld.com`** |

**More Vercel projects (34) than linked repos (27) and more than live hosts (27).** The surplus
includes at least one scratch project — `2026-04-21-build-a-production-ready-mvp-web` — and
duplicates of the same product (`almisalary-v2` alongside `almiworld-salary-checker`).

> **PRODUCT DATA GAP — none. ALMIVISIBILITY CAPABILITY GAP — none.** This is environment, recorded.
> ⚠️ The project/host/repo counts do not reconcile, and **which projects are live, retired or
> abandoned is UNKNOWN** (§9, U-ENV-1).

## 2.2 · 🔴 ALMIVISIBILITY'S OWN DEPLOYMENT SURFACE — IT EXISTS, AND IT SERVES NOTHING

| | measured |
|---|---|
| Vercel project | **exists**, named `almi-visibility`, org `almiworld` |
| production URL | `https://almi-visibility.vercel.app` → **404**, `text/plain`, 79 bytes |
| custom domain | `https://almivisibility.almiworld.com` → **404** |
| deployments | **11+ on the first page alone** (`vercel ls almi-visibility`) |
| latest project update | **~29 minutes before this measurement** |
| framework / dependencies | **none.** `package.json` declares `{}` for both `dependencies` and `devDependencies` |
| CI | 🔴 **none.** `.github/workflows` does not exist |

> ### 🔴 EVERY PUSH TO `main` DEPLOYS THIS REPOSITORY, AND THE DEPLOYMENT SERVES A 404.
>
> The timing is unambiguous: the project's latest update lands within half an hour of merging a
> **documentation-only** pull request. **A documentation merge in this repository is a production
> deployment.**

**This is recorded, not fixed, and it is not treated as a Phase 0 breach.** Nothing is published —
there is nothing to publish — and no content, page or data reaches any reader. **But the owner
should know that merging here touches a deployment surface**, and that the surface currently
answers 404 to everyone including us.

⚠️ **And it means "no CI" is not the whole story:** there is no test gate, but there *is* an
automatic build. **The only thing standing between a bad merge and a deployment is that the project
has nothing to deploy.**

## 2.3 · Tooling actually available on this machine

| | measured | note |
|---|---|---|
| Node | **v24.15.0** | matches every Vercel project's 24.x |
| npm | **11.12.1** | |
| Vercel CLI | ✅ **55.0.0, authenticated** | 🔴 **the session environment banner states it is NOT installed. That is wrong.** Verified by `vercel --version` and `vercel whoami` |
| git | working; `origin` is the GitHub repo | a stale 0-byte `.git/index.lock` was found and removed (see `PHASE_0_VERIFICATION.md` §0) |

> **A tool the environment says you do not have may be sitting there.** Recorded because the
> earlier plan for item 1 assumed the deployment surface could not be inspected at all.

---

# 3 · ITEM 2 — PRODUCT ISOLATION, **MEASURED** FOR THE FIRST TIME

The architecture contract says *"a run for one product never reads another's evidence, axes,
records, costs or learning."* Until now that was **described and never exercised**, because exactly
one product has ever been registered.

⚠️ **A correction to my own earlier verification.** I wrote that isolation *"cannot be measured —
measuring it requires a second registered product, and there is exactly one."* **That was wrong.**
A throwaway second tenant can be registered **in memory**, measured, and discarded — no file, no
product folder, no record, no repository change. That is measurement, not building, and it is what
follows.

**Probe:** a second descriptor (`probe-tenant`, axis `country`) registered in memory from a script
**outside the repository**, then both tenants observed. `git status --porcelain` before and after:
**0**.

## 3.1 · 🔴 WHAT LEAKS — IN BOTH DIRECTIONS

| observation | result |
|---|---|
| tenant A's licence entries visible in the catalogue tenant B reads | 🔴 **LEAKS** |
| B can resolve A's licence by name (`quotabilityState("NMC-6.3")`) | 🔴 **LEAKS** |
| B can ask whether A's source is quotable (`quotableUnder`) | 🔴 **LEAKS** |
| A's declared gaps appear in the list B reads | 🔴 **LEAKS** |
| B's licence entry visible to A | 🔴 **LEAKS** |
| B's gaps appear in the list A reads | 🔴 **LEAKS** |

Registering the second tenant moved the shared counters: **licences 7 → 8, gaps 12 → 13.**

**The cause is structural and it is one sentence:** `LICENCES` and the gap register are
**module-level singletons**, so registration is *addition to a shared namespace*, not allocation of
a private one. `registerLicences` refuses a **duplicate key** — so one tenant cannot *redefine*
another's licence — **but nothing stops it reading one.**

## 3.2 · ✅ WHAT IS ALREADY ISOLATED

| | |
|---|---|
| **facts** | ✅ **isolated by argument.** `loadRegistry(dir)` has no default, so a tenant cannot read another's records without naming the other's directory |
| **coverage** | ✅ **per product.** A reports axis `profession`, 12 declared, 2 built; B reports axis `country`, 2 declared, 0 built |
| **attribution** | ✅ every gap carries `productId` and every registered licence carries `_productId`. Filtering is **possible** — A=12 gaps, B=1 — but **nothing filters today** |
| **redefinition** | ✅ refused across tenants |

> ## 🔴 ALMIVISIBILITY CAPABILITY GAP — ISO-1
> **Licence and gap registries are shared global namespaces. Two products can read each other's
> licence terms and declared gaps.** Evidence exists to scope them (`productId`, `_productId`) and
> no read path uses it. **Measured, not fixed. No interface is designed here.**

⚠️ **Not measured, because there is nothing to measure yet:** costs and learning. Neither exists in
any form (§4.3, §9). **Isolation of a thing that does not exist is not a finding.**

---

# 4 · ITEM 2 — DATABASE AND INFRASTRUCTURE

## 4.1 · What exists

| | measured | command |
|---|---|---|
| repositories with a Prisma schema | **27** | `for d in */; do [ -f "$d/prisma/schema.prisma" ]; done` |
| datasource provider | **`postgresql`, 100%** — 53 declarations, no other provider | `grep -rhoE 'provider\s*=\s*"[a-z]+"' --include=schema.prisma` |
| connection variable **names** | `DATABASE_URL` ×53 · `DATABASE_URL_UNPOOLED` ×38 · `DIRECT_URL` ×3 | `grep -rhoE 'env\("[A-Z_]+"\)' --include=schema.prisma` |
| migration counts, top three | `almi-prep-v2` **24** · `almi-cv-v2` **16** · `almi-pte` **14** | `ls prisma/migrations \| grep -c '^2'` |

**`DATABASE_URL_UNPOOLED` on 38 of 53 is the pooled/unpooled pair characteristic of a serverless
Postgres provider.**

### 🔴 AND I LISTED TWO OF THESE AS UNKNOWN WHEN THE REPOSITORY ALREADY HELD THE ANSWER

`ARCHITECTURE_AND_GAP_REPORT.md` §2b answers both, **measured on 10 September by exactly the
sanctioned method** — host comparison plus asking each server to name itself, no credential
compared, no secret value printed:

| question I marked UNKNOWN | the answer already on record |
|---|---|
| which provider? | **Neon**, project `noisy-truth-88221617`, database `neondb` |
| do Preview and Production share an instance? | 🔴 **YES — the same database.** Same project id, same endpoint host, same `current_database()`, confirmed twice |

**Consequences already recorded there, and not re-derived here:** AlmiVisibility has **no harmless
place to test** — the first preview deployment that writes a row writes where production reads. The
database is **empty** (`public` holds nothing but Neon's `neon_auth` scaffolding), the account is on
**Neon Free** where branches are a limited resource (10), and **the owner ruled that no branch is
created yet** precisely because there is nothing in it to protect.

**U-DB-1 and U-DB-2 are therefore struck from my UNKNOWN list (§9).** They were never unknown; they
were unread.

## 4.2 · 🔴 ALMIVISIBILITY HAS NO DATABASE AT ALL

```
ls prisma  →  NONE — no prisma, no schema, no migrations
```

**This is the standing rule holding, not a defect:** *stop before the first valuable table.* It is
recorded here so that the day a table appears, it is a visible change from a measured zero.

## 4.3 · Analytics and funnel sources — **AND MY FIRST ANSWER HERE WAS WRONG**

🔴 **I first measured this as "NONE, zero across 27 live hosts". That was false, and it was caught
by reconciling against `ARCHITECTURE_AND_GAP_REPORT.md` §3 — see **§10, AUDIT ONCE**.** The
corrected measurement:

| | measured |
|---|---|
| third-party analytics (GA4 · GTM · Vercel Analytics · PostHog · Mixpanel) | ✅ **NONE, estate-wide** |
| **Plausible page-view analytics** | ✅ **NONE, estate-wide** — see the tie-break below |
| **first-party funnel event capture** | 🔴 **EXISTS — on exactly ONE product** |

### What actually exists, verified first-hand

`almi-oet/src/lib/analytics/` holds `track.ts`, `events.ts` and `funnel-report.ts`.
`export function track(name: FunnelEventName, …)` emits a log line **and** persists via
`prisma.funnelEvent.create(...)` into a **`FunnelEvent` Postgres table** — and the file says why in
its own header: *"FunnelEvent table rather than GA4, because UK/EU healthcare learners…"*. A build
gate fails on an uncatalogued event name.

**That is a real, readable data source, and it is one product of 27.**

### 🔴 THE TIE-BREAK — TWO REPORTS DISAGREED AND A THIRD MEASUREMENT SETTLED IT

`ARCHITECTURE_AND_GAP_REPORT.md` §3 records *"Plausible page-view analytics"* on **eleven**
products. My first sweep found none. **Both were checked against the instrumentation signature
rather than the word:**

```
rg "plausible\.io|data-domain=|script\.plausible"  across C:\Projects   →  NO MATCHES
rg "[Pp]lausible" --glob "*.{ts,tsx,js,jsx,mjs}"                        →  20 files, ALL
      ordinary English ("a plausible sentence") — including THIS repository's own fact-registry
      comments, which I wrote
```

> **There is no Plausible anywhere. §3's eleven-product row is a keyword false positive** — the
> exact trap that section's own method note says it guarded against. **Recorded, not quietly
> dropped: a correction to another agent's report is worth as much as a correction to my own.**

And my own sweep had a false positive too, in the other direction: of five files matched by
`G-[A-Z0-9]{9}` etc., one was `G-PROBABILI` inside a comment about Whisper log-probabilities, three
were third-party exam-board pages saved as research data, and one was an audit check that *looks
for* analytics.

> ### 🔴 I TRUSTED A ZERO FROM A PATTERN LIST I HAD NEVER VALIDATED AGAINST A KNOWN POSITIVE.
> A package-manifest sweep cannot see instrumentation written by hand with no dependency, which is
> precisely what AlmiOET's is. **Validate the scanner before trusting its zero** — a rule already on
> this project's record, broken here by me.

> ## 🔴 ALMIVISIBILITY CAPABILITY GAP — ANL-1 *(restated after correction)*
> **Funnel evidence exists for 1 of 27 products and for no other. There is no page-view analytics
> anywhere.** So an outcome claim of the form *"this page produced a signup"* is answerable for one
> product and unanswerable for 26 — and AlmiVisibility has no capability that reads even the one
> source that exists. Recorded, not built.

---

# 5 · ITEM 2 — THE PUBLIC SEO SURFACE (READ-ONLY `GET`s)

31 hosts, three `GET`s each — `/`, `/robots.txt`, `/sitemap.xml` — then every sitemap **declared in
robots.txt** was fetched and checked for being real XML. **Nothing submitted, pinged or changed.**

## 5.1 · Reachability

| | count |
|---|---|
| `/` → **200** | **27** |
| `/robots.txt` → **200**, `text/plain` | **27** |
| DNS failure | **3** (`almipathway`, `almixyz`, `swedish`) |
| `/` → **404** | **1** (`almivisibility`) |

## 5.2 · THE SITEMAP SURFACE — **AND A CORRECTION TO MY OWN FRAMING**

🔴 **I first wrote that this "reverses a long-standing belief". It does not, and the claim was
withdrawn before merge.** `ARCHITECTURE_AND_GAP_REPORT.md` §4 — in this repository, dated 10
September — **had already established it**, by following `robots.txt` → declared sitemap → every
child sitemap, and counting **12,855,354 URLs** across the network. It also already caught its own
robots-parsing error. **The belief I thought I was overturning had been corrected a day earlier, in
a file I had not read.**

What follows is therefore a **re-derivation on a wider host set**, and its value is the three hosts
§4's product-name inventory did not include.

**`/sitemap.xml` returns 404 on 26 of 27 live hosts — because that is the wrong URL.**

| | measured |
|---|---|
| hosts whose `robots.txt` **declares** a sitemap | **26 of 27** |
| declared at `/sitemap-index.xml` | **24** |
| declared at `/sitemap_index.xml` | **1** (`www.almiworld.com`) |
| declared at `/sitemap.xml` | **1** (`almiarchitect`) |
| ✅ **declared sitemaps that return valid XML** | **25 of 26** |
| 🔴 declared sitemaps that are broken | **1** |

> ### ✅ THE ESTATE'S SITEMAPS ARE LARGELY HEALTHY. THEY SIMPLY DO NOT LIVE AT `/sitemap.xml`.
> `/sitemap-index.xml` is the de facto standard, on 24 of 26 hosts.

### The three real defects, named

**All three are hosts `ARCHITECTURE_AND_GAP_REPORT.md` §4 did not cover.** Its inventory is keyed by
product name and lists 24; it does not include `AlmiHQ`, `AlmiArchitect` or `AlmiVisibility`, and
its "AlmiWorld Hub" row is `world.almiworld.com`, **not** `almihq`. (`almiswiss` was also outside
it and is **healthy** — `/sitemap-index.xml` returns XML.)

| host | defect | probed |
|---|---|---|
| 🔴 `almihq` | **no working sitemap anywhere.** `robots.txt` declares none; **both** `/sitemap.xml` **and** `/sitemap-index.xml` return `200 text/html`, byte-identical to its own homepage, **0 `<loc>` entries** | both paths |
| 🔴 `almiarchitect` | its `robots.txt` declares `/sitemap.xml` — **and both** `/sitemap.xml` **and** `/sitemap-index.xml` return **404** | both paths |
| ⚠️ `www.almiworld.com` | declares `/sitemap_index.xml` (underscore) **on a different host** — the apex — while its own `/sitemap-index.xml` is **404**. The declared one resolves and returns XML. The estate's only cross-host declaration and its only underscore | both paths |

> ### 🔴 A `200` THAT IS THE HOMEPAGE IS WORSE THAN A `404`.
> A 404 tells a crawler there is no sitemap. `almihq` tells it *"here is your sitemap"* and hands
> over the app shell. Verified by fetching both paths and comparing SHA-256 of the bodies —
> **identical to the homepage, and containing zero `<loc>` elements.**
>
> ⚠️ **And it fooled the first sweep**: counting `200` responses alone, `almihq` was the estate's
> *one working* `/sitemap.xml`. **A status code is not a content type, and neither is a parse.**

**Register: PRODUCT DATA GAP** for all three — these are connected products' own published
surfaces, not a missing AlmiVisibility mechanism. **Not fixed. Not touched.**

## 5.3 · And the capability gap underneath them

> ## 🔴 ALMIVISIBILITY CAPABILITY GAP — SEO-1
> **Nothing in AlmiVisibility performs this check.** Every number in §5 was produced by throwaway
> scripts written for this measurement and kept **outside** the repository, because Phase 0 forbids
> adding code. The estate has no standing way to notice that a declared sitemap has started
> returning a homepage. **Recorded, not built.**

---

# 6 · ITEM 2 — REUSABLE ASSETS

**What already exists that a later phase can use rather than rebuild.** Measured, not proposed.

| asset | where | state |
|---|---|---|
| **Verified fact supply** | `src/facts/` — 11 modules, 59 exported names, 134 tests | ✅ complete; the only complete stage |
| **Gate A** | `src/gate-a/` — 6 modules, 30 exports, 55 tests | 🟡 3 of 7 gate families |
| **Write law** | `src/write-law.mjs`, 7 exports | ✅ dry-run default; `--confirm` local; `--confirm` **and** `ALLOW_PROD_WRITE=1` for production |
| **Product descriptor + registration** | `src/product.mjs`, 4 exports, 26 tests | ✅ validates before registering |
| **Boundary law + scanner** | `tools/product-boundary.mjs`, `test/product-boundary.test.mjs` | ✅ green at 0, sabotage-proven |
| **Frozen case-study corpus** | `case-study-01/` — **57 files, all tracked**, `manifest.json` carries `sha256` + `bytes` per page | ✅ frozen bytes; contract not yet frozen — item 6 |
| **Corpus builder** | `bin/build-corpus.mjs` | ✅ fetches rendered HTML from a live sitemap |
| **Product-neutral runners** | 9 of 16 `bin/` scripts | ✅ `gate-a`, `acceptance-test`, `build-corpus`, `diagnose-overlap`, `measure-text-kind`, `freeze-exhibit`, `product-boundary` + 2 that use no engine |
| **Estate sitemap standard** | `/sitemap-index.xml` on 24 hosts | ✅ a real convention to build on, now that it is known |
| **Postgres everywhere** | 27 schemas, one provider | ✅ one technology, not five |
| **Uniform runtime** | Node 24.x on all 34 projects | ✅ |

---

# 7 · ITEM 2 — REQUIRED PREREQUISITES

**The complete list, as measured. Each names who can supply it.** No permission is requested for
any of them here; absence is recorded as a gap, not as a request.

| # | prerequisite | for what | who |
|---|---|---|---|
| **PRQ-1** | read-only Search Console API access | any demand evidence, S11 | **owner** |
| **PRQ-2** | preview/production database separation — the branch **and** the environment variables moved off "All Environments" | any future AlmiVisibility persistence | **owner** |
| **PRQ-3** | first-party analytics on at least one host | outcome/funnel learning — **today there is none anywhere** | **owner decision**, then build (later phase) |
| **PRQ-4** | a deployment surface that serves something | AlmiVisibility's own operator interface | later phase |
| **PRQ-5** | a persistence store for AlmiVisibility | growth/retention — none exists today | later phase, after **PRQ-2** |
| **PRQ-6** | licence terms read for 7 registry sources | **publish** of any page citing them | **owner or a person with a browser** |
| **PRQ-7** | per-variant claim supply for 10 of 12 variants | a cohort larger than two | connected product |
| **PRQ-8** | a test gate before merge (there is no CI) | any change landing safely — **merges deploy** | later phase |
| **PRQ-9** | crawler/research-worker hosting | S4/S5 at estate scale | **owner** (cost), later phase (build) |

---

# 8 · GAP REGISTER — ITEMS 1 & 2 ONLY

**Every gap in exactly one register. None in both.** These feed the single frozen register at the
end of Phase 0; they are not a second register.

## ALMIVISIBILITY CAPABILITY GAPS

| id | gap | evidence |
|---|---|---|
| **ISO-1** | licence and gap registries are shared global namespaces; two products read each other's | §3.1 — probe moved shared counters 7→8 and 12→13; six leak observations |
| **ANL-1** | funnel evidence exists for **1 of 27** products and nowhere else; no page-view analytics anywhere; AlmiVisibility reads neither | §4.3 — `almi-oet`'s `FunnelEvent` table verified first-hand; Plausible disproved estate-wide |
| **AUD-1** | seven of the nine frozen items already had a document, and two successive audits were written without reading it | §10 |
| **SEO-1** | no standing check of the public SEO surface; the sitemap sweep exists only as throwaway scripts | §5.3 |
| **DEP-1** | AlmiVisibility deploys on every push and serves 404; no CI stands between a merge and that deployment. 🔄 **SUPERSEDED 14 September 2026 — both halves are now false** (`DOC-1`, fifth instance; full evidence in `PHASE_0_FROZEN_GAP_REGISTER.md` `DEP-1`): `vercel.json` reads `{"git": {"deploymentEnabled": false}}` since `774791b` (12 Sep 2026), and CI (`.github/workflows/test.yml`) ran and passed on every PR head and every merge commit since — #71, #72, #73 and `a498a85` named there. Whether that check is **required** is not measured: branch protection returns HTTP 403 on this plan | §2.2 · superseded, see the register's `DEP-1` |

## PRODUCT DATA GAPS

| id | gap | evidence |
|---|---|---|
| **PD-SEO-1** | `almiarchitect` declares `/sitemap.xml` in robots.txt and that URL 404s | §5.2 |
| **PD-SEO-2** | `almihq` declares no sitemap and serves its homepage at `/sitemap.xml` with `text/html` | §5.2 |
| **PD-SEO-3** | `www.almiworld.com` declares an underscore sitemap on a different host | §5.2 |
| **PD-DNS-1** | three referenced hosts fail DNS (`almipathway`, `almixyz`, `swedish`) | §5.1 |

---

# 9 · UNKNOWNs FROM ITEMS 1 & 2 — FOUR FIELDS, AS THE BOUNDARY REQUIRES

| # | UNKNOWN | reason | evidence required | who can resolve | recheck on |
|---|---|---|---|---|---|
| **U-ENV-1** | which of the 34 Vercel projects are live, retired or scratch | project count (34) exceeds linked repos (27) and live hosts (27); at least one is a dated scratch project | per-project domain assignment and last **production** deployment, read-only | **owner** (or a read-only CLI sweep, later phase) | next estate change |
| ~~U-DB-1~~ | ~~do preview and production share a database~~ | 🔴 **STRUCK — NOT UNKNOWN, UNREAD.** Answered in `ARCHITECTURE_AND_GAP_REPORT.md` §2b: **yes, the same Neon database**, measured by host comparison and by asking each server its identity | — | — | — |
| ~~U-DB-2~~ | ~~which Postgres provider~~ | 🔴 **STRUCK — same source: Neon, project `noisy-truth-88221617`** | — | — | — |
| **U-SEO-1** | whether the 25 healthy sitemaps are **submitted** and being fetched | submission state lives in Search Console, not in the artefact | Search Console coverage report | **owner**, after **PRQ-1** | after PRQ-1 |
| **U-SEO-2** | whether `almihq`'s homepage-as-sitemap has been indexed as one | a `200 text/html` at a sitemap URL may or may not have been consumed | Search Console, or a crawl log | **owner**, after **PRQ-1** | after PRQ-1 |
| **U-DEP-1** | whether the ~29-minute-old deployment was caused by the documentation merge. 🔄 **RESTATED 14 September 2026 — STILL OPEN.** Still unread: the commit that ONE deployment was built from — its entry in Vercel's deployment history, with the commit SHA, compared with the documentation merge. That later merges produced no deployment, because Git deployments are now off, answers a different question and does **not** close this | the timing matches within the hour; deployment-to-commit attribution was not read | a read-only deployment list with commit SHAs | ~~**owner** or a later read-only sweep~~ **owner** — reading Vercel's deployment history is the owner's, as `U8` is; no sweep here reads it | ~~next merge~~ when the owner reads that history — merges no longer deploy |
| **U-ISO-1** | isolation of **costs** and **learning** | neither exists in any form, so neither can leak | the first cost record and the first learning record | later phase | when either exists |

---

# 10 · 🔴 AUDIT ONCE — AND IT HAD ALREADY BEEN BREACHED BEFORE I STARTED

The owner's rule is **AUDIT ONCE → FREEZE GAP REGISTER → FIX → TARGETED VERIFY → CLOSE.**

`ARCHITECTURE_AND_GAP_REPORT.md` — **1,064 lines, in this repository, dated 10 September** — already
covers, by its own section headings:

| frozen item | already covered by | |
|---|---|---|
| **2** database/infrastructure | §2, **§2b**, §2c | including the shared-database answer |
| **2** analytics | §3 | |
| **2** public SEO surface | §4 | 12,855,354 URLs counted, child sitemaps followed |
| **2** reusable assets | §5 | *"what must NOT be rebuilt"* |
| **3** GSC prerequisites | §6 | property type, API, scope, service account, what the owner must authorise |
| **4** worker hosting | §7 | |
| **5** DB growth and retention | §8 | |
| **6** Case Study #1 | §9 | |
| **7** gates | §10, §11, §11a, **§11b** | Gate A, B **and C** frozen |
| **9** UNKNOWNs | §12, §13, §14 | |

> ## 🔴 SEVEN OF THE NINE FROZEN ITEMS ALREADY HAD A DOCUMENT, AND TWO AUDITS WERE WRITTEN WITHOUT READING IT.
>
> The Phase 0 report re-audited without reconciling against it. **I then compounded the breach** by
> re-measuring the SEO surface, the analytics coverage and the database questions from scratch —
> and published a "reversal" of a belief this repository had already corrected a day earlier.

**The cost is measurable and it is not only wasted effort:**

| | |
|---|---|
| 🔴 | I reported analytics as **NONE** when one product has a full funnel table. **A fresh measurement is not automatically a better one** |
| 🔴 | I raised **two UNKNOWNs that were already answered**, one of them the shared-database question — the single most consequential infrastructure fact in the estate |
| 🔴 | I framed a re-derivation as a discovery |
| ✅ | and the reconciliation paid for itself: it caught **§3's own false positive** — eleven products credited with Plausible analytics that do not exist |

> ### THE RULE THIS PRODUCED
> **Before measuring anything, read what the repository already measured. An audit that does not
> start from the existing audit is not AUDIT ONCE — it is audit again, and the second one is not
> automatically the right one.**

⚠️ **What this does NOT mean:** the existing report is not assumed correct either. Where the two
disagreed on Plausible, the tie was broken by a **third measurement against the instrumentation
signature**, not by seniority. **Reconcile, then measure what is genuinely uncovered.**

**Consequence for the remaining frozen items (3, 4, 5, 6, 7):** each begins by reading
`ARCHITECTURE_AND_GAP_REPORT.md`'s corresponding section and recording what it already answers.
**No section of it is rewritten.**

---

## WHAT THIS DOCUMENT DID NOT DO

- **Nothing built, activated, paid for or submitted.** No paid provider or API touched.
- **No product content, claim or page.** No production write. No deploy initiated by hand.
- **No schema, no migration, no DB.**
- **`A1`–`A4` not touched** — item 8 is closed. **CRLF not fixed.** **`bin/` imports not generalised.**
- **No `src/`, `bin/` or `test/` file changed.** The measurement scripts were written **outside the
  repository on purpose**, and their code is reproduced nowhere in it.
- **`almi-oet` not read.**
- **No secret value printed, hashed or measured** — names and project names only.
- **No new GREEN requested.** Missing capability is recorded as a gap, not raised as a permission.
