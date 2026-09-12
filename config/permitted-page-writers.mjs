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
 * reason was not invented to fill the field.
 *
 * ── AND TWO THINGS ARE DECLARED SO THEY CAN BE CHECKED ──────────────────────
 *
 *   gateToken             the identifier each write site must sit behind.
 *                         `tools/permitted-writers.mjs` finds the enclosing
 *                         condition of every site and reports the ones that
 *                         write without it — i.e. that DEFAULT TO WRITING.
 *   destinationOverridable  true where an operator flag chooses the directory.
 *                         Nothing contains such a path to this repository, and
 *                         that is recorded rather than hidden.
 *
 * 🔴 THIS REGISTER DECLARES; IT DOES NOT ABSOLVE. Two entries below default to
 * writing. They are named here because they exist, and being named is what
 * lets the build see them — it does not make them lawful under (d).
 *
 * Lives in `config/`, outside the three directories the census scans, so the
 * list of writers is never itself counted as a writer.
 */

export const PERMITTED_PAGE_WRITERS = Object.freeze([
  {
    file: "bin/build-corpus.mjs",
    sites: 1,
    writes: "copies of pages FETCHED from a live sitemap (their HTML, as served), plus a corpus manifest",
    where: "the directory given by --out (required, no default); nothing restricts it to this repository",
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
    where: "the directory given by --out; without --out nothing is written; nothing restricts it to this repository",
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
    where: "runs/crawl/corpus/ by default, or the directory given by --corpus; nothing restricts it to this repository",
    gatedBy: "D-CRW-4: bodies are written only on a --live run, and --live is refused without --i-have-the-owners-green. It does not use write-law's --confirm",
    gateToken: "live",
    destinationOverridable: true,
    why: "the committed crawl record holds only hashes; the bodies are the evidence the hashes verify, uploaded as the CI artifact every content check reads (expires 2026-12-11)",
    whyKnown: true,
  },
  {
    file: "bin/nursing-chain.mjs",
    sites: 2,
    writes: "(1) a CACHE of the sibling pages it FETCHES live from the product site; (2) the candidate page rendered from the registry, plus a chain report",
    where: "(1) runs/_profession-cache/ — fixed, gitignored; (2) the directory given by --out",
    gatedBy: "(2) only: permission.mayWrite, which only --confirm grants. 🔴 (1) HAS NO GATE — on any run where a sibling is not already cached it fetches and writes, with no flag at all",
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "UNKNOWN. It produced PR #11's ROLLOUT verdict (runs/nursing-chain/chain-report.json). But bin/profession-chain.mjs --page=nursing runs the same chain through identical code, and no document in this repository states why both are kept",
    whyKnown: false,
  },
  {
    file: "bin/placement-measure.mjs",
    sites: 1,
    writes: "one candidate page with the shared block placed off-page, plus a placement report",
    where: "the directory given by --out; without --out nothing is written",
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
    where: "the directory given by --out; without --out nothing is written",
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
    where: "runs/report/index.html by default, or the file given by --out",
    gatedBy: "🔴 NOTHING. It does not import write-law and writes on every run",
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "the one owner-facing surface v0.1 has (items 51 and 56 inspect it). It is a report about evidence, not a product page",
    whyKnown: true,
  },
]);
