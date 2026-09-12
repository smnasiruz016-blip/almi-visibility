/**
 * 🔴 THE REGISTER OF PERMITTED PAGE-WRITING PATHS — Amendment 2, ruling 7 (d).
 *
 * > "A new page-writing path cannot appear silently. It must be added to a list
 * > a human reads."
 *
 * This is that list. The build fails if `tools/no-generation-census.mjs` finds
 * a page write in a file that is not here, or finds a different number of write
 * sites in a file than its entry declares. An entry for a file the census no
 * longer finds is STALE and also fails the build. Changing this file takes a
 * pull request somebody reads; that is the whole point of it.
 *
 * ── EVERY ENTRY STATES FOUR THINGS ──────────────────────────────────────────
 *
 *   writes  · where  · gatedBy  · why
 *
 * 🔴 `why` IS NOT DECORATION. Where the reason a writer still exists could not
 * be stated from the repository, it says UNKNOWN and `whyKnown` is false. A
 * reason is never invented to fill the field.
 *
 * ── AND TWO THINGS ARE DECLARED SO THEY CAN BE CHECKED ──────────────────────
 *
 *   gateToken               the identifier each write site must sit behind.
 *                           `tools/permitted-writers.mjs` finds the enclosing
 *                           condition of every site and reports any that
 *                           DEFAULT TO WRITING.
 *   destinationOverridable  true where an operator flag chooses the path.
 *
 * 🔴 SINCE 12 SEPTEMBER 2026 (night) EVERY DESTINATION IS CONFINED. Each writer
 * passes its destination through `confineToRepo` (src/write-law.mjs) before its
 * first write, and a path outside this repository THROWS before a byte is
 * written. That is checked from the source for all seven, and proved on a real
 * writer by `test/write-confinement.test.mjs`.
 *
 * Lives in `config/`, outside the three directories the census scans, so the
 * list of writers is never itself counted as a writer.
 */

const CONFINED = "confined by confineToRepo: a path outside this repository is REFUSED before anything is written";

export const PERMITTED_PAGE_WRITERS = Object.freeze([
  {
    file: "bin/build-corpus.mjs",
    sites: 1,
    writes: "copies of pages FETCHED from a live sitemap (their HTML, as served), plus a corpus manifest",
    where: `the directory given by --out (required, no default); ${CONFINED}`,
    gatedBy: "write-law LOCAL: every write sits behind permission.mayWrite, which only --confirm grants",
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "builds the corpus Gate A was first calibrated on (runs/2026-09-10-almioet/GATE_A_RUN_01.md). It stores pages that already exist; it generates none",
    whyKnown: true,
  },
  {
    file: "bin/build-page.mjs",
    sites: 1,
    writes: "one candidate page rendered from the fact registry, plus its claim trace (JSON)",
    where: `the directory given by --out; without --out nothing is written; ${CONFINED}`,
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants",
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "writes the page TOGETHER WITH its trace — the by-reference evidence that every rendered fact carries its claim id (§5A). The two chain runners render the same page but do not emit the trace",
    whyKnown: true,
  },
  {
    file: "bin/crawl.mjs",
    sites: 1,
    writes: "the raw HTML bodies of pages FETCHED by a live crawl, one file per observation",
    where: `runs/crawl/corpus/ by default, or the directory given by --corpus (and the run record at --out); ${CONFINED}`,
    gatedBy: "D-CRW-4: bodies are written only on a --live run, and --live is refused without --i-have-the-owners-green — two explicit flags, the second deliberately awkward to type. It does not use write-law's --confirm",
    gateToken: "live",
    destinationOverridable: true,
    why: "the committed crawl record holds only hashes; the bodies are the evidence the hashes verify, uploaded as the CI artifact every content check reads (expires 2026-12-11)",
    whyKnown: true,
  },
  {
    file: "bin/nursing-chain.mjs",
    sites: 2,
    writes: "(1) a CACHE of the eleven sibling pages it FETCHES from the product site; (2) the candidate page rendered from the registry, plus a chain report",
    where: `(1) runs/_profession-cache/ — fixed, gitignored; (2) the directory given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: both writes, and the cache directory itself, sit behind permission.mayWrite, which only --confirm grants. Without it the siblings are fetched and measured but not kept",
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "it is the ONLY writer of runs/_profession-cache, and bin/profession-chain.mjs and bin/placement-measure.mjs both refuse to run without that cache ('this script does not fetch'). Its CHAIN half is superseded — see NURSING_CHAIN_SUPERSESSION.md — but its FETCH half is not, so it cannot be removed as it stands",
    whyKnown: true,
  },
  {
    file: "bin/placement-measure.mjs",
    sites: 1,
    writes: "one candidate page with the shared block placed off-page, plus a placement report",
    where: `the directory given by --out; without --out nothing is written; ${CONFINED}`,
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants",
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "the shared-block extraction measurement (SHARED_BLOCK_EXTRACTION.md): the page is written so a reader can see what the placement did to the page, beside the arithmetic",
    whyKnown: true,
  },
  {
    file: "bin/profession-chain.mjs",
    sites: 1,
    writes: "one candidate page for the named profession, rendered from the registry, plus a chain report",
    where: `the directory given by --out; without --out nothing is written; ${CONFINED}`,
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants",
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "runs the registry → page → Gate A → rollout chain on ANY profession through identical code, so two professions can be compared without the runner differing",
    whyKnown: true,
  },
  {
    file: "bin/report.mjs",
    sites: 1,
    writes: "the owner's report view — one HTML page summarising the evidence store, the crawl and the facts",
    where: `runs/report/index.html by default, or the file given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants. 🔴 Until 12 September 2026 it had NO gate and wrote on every run",
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "the one owner-facing surface v0.1 has (items 51 and 56 inspect it). It is a report about evidence, not a product page",
    whyKnown: true,
  },
]);
