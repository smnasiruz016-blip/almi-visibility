# Case Study #1 — FROZEN CORPUS

**Captured 10 September 2026.** This directory is the pinned input for
`CASE_STUDY_01_ACCEPTANCE_TEST.md`. It exists because most of the defects that test looks for
have been **fixed**: run against the live site, the test would find nothing and would decay every
time a page changed.

> **THIS DIRECTORY IS FROZEN.** Nothing in it may be edited, re-captured or "refreshed" to make
> an engine pass. A new capture is a **new corpus with a new date**, added beside this one, never
> written over it. The rule is the FREEZE LAW at the top of the test document.

---

## The pin

| | |
|---|---|
| **Repository** | `smnasiruz016-blip/almi-oet` |
| **Commit** | **`07852f9e87c4273c5486445986251d11e415ecdf`** |
| | `fix: GAP-054 — omitted safety information is a PURPOSE failure (rubric, not the scale); one LEVEL_VALUE (#112)` |
| **Deployed** | Production deployment `6360382081`, state **success**, 2026-09-09T22:16:29Z |
| **Rendered HTML captured** | 2026-09-10, from `https://almioet.almiworld.com` |
| **Capture method** | three consecutive GETs per URL, redirects **not** followed, `user-agent: AlmiVisibility-CaseStudy01-Corpus/1.0 (read-only, frozen capture)` |

**The repository half of the corpus is the commit, not a copy.** `git checkout 07852f9` restores
the source exactly; copying it here would only create a second thing to drift.

---

## What is stored, and what is deliberately not

| stored | why |
|---|---|
| `pages/*.html` | the rendered HTML, as served |
| `pages/*.headers.json` | status, `x-vercel-cache`, `age`, `cache-control`, body SHA-256, byte count — **for all three requests** |
| `robots.txt` | small, and RED 4 needs it |
| `sitemap/sitemap-index.xml` | small |
| `sitemap/child-sitemaps.json` | per-child URL count, byte count and **SHA-256** |
| `manifest.json` | machine-readable index of the above |

| NOT stored | why |
|---|---|
| the six child sitemaps in full | 240,328 URLs across six files. A documents repository is the wrong home for them; their **SHA-256 and URL counts are pinned instead**, which is enough to prove the corpus was not swapped |
| a copy of the repository | the commit SHA is the pin |
| any credential, `.env` file or `.vercel` directory | see `.gitignore` |

---

## The captured pages

| file | URL | role | 3 × `x-vercel-cache` |
|---|---|---|---|
| `control-1-uk-nmc` | `/nursing/from-india/uk-nmc` | **CONTROL 1** — a legitimate, sourced grade (L B · R B · W C+ · S B) | MISS MISS MISS |
| `control-2-uk-ukvi` | `/nursing/from-india/uk-ukvi` | **CONTROL 2** — correctly declines: *"Not published — confirm with…"* | MISS MISS MISS |
| `control-3-ie-nmbi` | `/nursing/from-bhutan/ie-nmbi` | **CONTROL 3** — a second sourced grade, different regulator | MISS MISS MISS |
| `red3-leaf-org-page` | `/nursing/from-austria/ca-cannn` | **RED 3 exhibit** — deliberately **not** one of the control URLs | MISS MISS MISS |
| `red3-profession-landing` | `/nursing` | RED 3 — same layout, 12 URLs | MISS MISS MISS |
| `red3-origin-page` | `/nursing/from-india` | RED 3 — same layout, 2,292 URLs | MISS MISS MISS |
| `red3-register-org` | `/register/uk-nmc` | RED 3 — a **different** layout, same cause, 610 URLs | MISS MISS MISS |
| `control-cache-home` | `/` | **CACHE CONTROL** — a route that *is* cached | **HIT HIT HIT** |
| `control-cache-forgot-password` | `/forgot-password` | **CACHE CONTROL** — a second cached route | **HIT HIT HIT** |

**The last two rows are the reason this corpus can prove anything about RED 3.** They are served
by the same platform, from the same deployment, on the same day — and they cache. **The defect is
therefore in the application, not in the platform**, and the corpus contains the evidence for
both halves of that sentence.

---

## Which defects this corpus can and cannot serve

| defect | this corpus is enough? | why |
|---|---|---|
| **RED 2** — external-authority claim with no source evidence | ✅ **YES** | `src/lib/oet/professions.ts:1` at commit `07852f9`, against `docs/sources/` at the same commit |
| **RED 3** — declared render mode ≠ served state | ✅ **YES** | four route patterns captured three times each, plus two cached controls |
| RED 1 — grade band never issued | ❌ **NO** | needs an **earlier** commit, where `scale.ts` asserted the disputed side. **Open: the owner names it (Q3).** |
| RED 4 — sitemap URL 404 / redirect | ❌ **NO** | 48 of 48 sampled URLs are 200 at this pin. **Open: pin a historical deployment, or nominate AlmiPathway (Q2).** |
| RED 5 — rendered count ≠ underlying data | ❌ **NO** | needs a commit **before** `scripts/gates/prompt-shape.ts` landed. **Open (Q3).** |
| RED 6 — link in source, absent from render | ❌ **NO** | needs the commit where the build pipeline changed the output. **Open (Q3).** |

**Four of the six still need a second, older pin.** That is recorded honestly rather than papered
over: **the test cannot run yet, and that is the correct state.**

---

## Integrity

**What the hash pins, precisely:** the SHA-256 is taken over the response body **as decoded and
stored here as UTF-8**, not over the raw bytes on the wire. It therefore proves that this
archived artefact has not been altered since capture; it is not a transport-level checksum.
`.gitattributes` marks this directory `-text` so a checkout cannot rewrite line endings and
silently break the match.

Every HTML file's SHA-256 is in its `.headers.json` beside it, and in `manifest.json`. Every child
sitemap's SHA-256 is in `sitemap/child-sitemaps.json`. If a file here is ever edited, the hash
recorded at capture time will not match it — **which is the point of writing them down.**
