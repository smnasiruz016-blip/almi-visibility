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
 *   gateFlags               🔴 WHICH FLAG(S) GATE THE WRITE, named per writer. Six
 *                           use write-law's --confirm; the crawler uses --live AND
 *                           --i-have-the-owners-green, by technical-owner ruling of
 *                           12 September 2026 (its gateRuling). Named so the
 *                           variation is visible, and checked against each source.
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
    /* 🔴 ROUTED (23 September 2026). One fetched page is one target, so each is its own governed occurrence; the
     * manifest is another. The bare mkdir is gone — each write's prepare step creates its directory. */
    routed: true,
    sites: 0,
    writes: "copies of pages FETCHED from a live sitemap (their HTML, as served), plus a corpus manifest",
    where: `the directory given by --out (required, no default); ${CONFINED}`,
    gatedBy: "write-law LOCAL: every write sits behind permission.mayWrite, which only --confirm grants",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "builds the corpus Gate A was first calibrated on (runs/2026-09-10-almioet/GATE_A_RUN_01.md). It stores pages that already exist; it generates none",
    whyKnown: true,
  },
  {
    file: "bin/build-page.mjs",
    /* 🔴 ROUTED (23 September 2026). Two targets per candidate — the page and its trace — each a governed
     * occurrence, because a whole-file replacement is its own target. */
    routed: true,
    sites: 0,
    writes: "one candidate page rendered from the fact registry, plus its claim trace (JSON)",
    where: `the directory given by --out; without --out nothing is written; ${CONFINED}`,
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants",
    gateFlags: ["--confirm"],
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
    gateFlags: ["--live", "--i-have-the-owners-green"],
    gateRuling: "TECHNICAL-OWNER RULING, 12 Sep 2026 (PHASE_0_FROZEN_GAP_REGISTER.md): two explicit flags — one named for the owner's own green — satisfy dry-run by default",
    gateToken: "live",
    destinationOverridable: true,
    why: "the committed crawl record holds only hashes; the bodies are the evidence the hashes verify, uploaded as the CI artifact every content check reads (expires 2026-12-11)",
    whyKnown: true,
  },
  {
    file: "bin/nursing-chain.mjs",
    /* 🔴 ROUTED (23 September 2026). One cached sibling page is one target; the candidate page and its chain
     * report are two more. The pages are still FETCHED and MEASURED either way — a read, which the scope law
     * permits — and only KEPT when the write is allowed, exactly as before. */
    routed: true,
    sites: 0,
    writes: "(1) a CACHE of the eleven sibling pages it FETCHES from the product site; (2) the candidate page rendered from the registry, plus a chain report",
    where: `(1) runs/_profession-cache/ — fixed, gitignored; (2) the directory given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: both writes, and the cache directory itself, sit behind permission.mayWrite, which only --confirm grants. Without it the siblings are fetched and measured but not kept",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "it is the ONLY writer of runs/_profession-cache, and bin/profession-chain.mjs and bin/placement-measure.mjs both refuse to run without that cache ('this script does not fetch'). Its CHAIN half is superseded — see NURSING_CHAIN_SUPERSESSION.md — but its FETCH half is not, so it cannot be removed as it stands",
    whyKnown: true,
  },
  {
    file: "bin/placement-measure.mjs",
    /* 🔴 ROUTED (23 September 2026). Both bodies are TEXT, measured, so nothing is normalised without proof. */
    routed: true,
    sites: 0,
    writes: "one candidate page with the shared block placed off-page, plus a placement report",
    where: `the directory given by --out; without --out nothing is written; ${CONFINED}`,
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "the shared-block extraction measurement (SHARED_BLOCK_EXTRACTION.md): the page is written so a reader can see what the placement did to the page, beside the arithmetic",
    whyKnown: true,
  },
  {
    file: "bin/profession-chain.mjs",
    /* 🔴 ROUTED through the shared governed-write boundary (23 September 2026): two targets, two governed
     * occurrences, each audited allowed or refused. No direct page-write site remains. */
    routed: true,
    sites: 0,
    writes: "one candidate page for the named profession, rendered from the registry, plus a chain report",
    where: `the directory given by --out; without --out nothing is written; ${CONFINED}`,
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "runs the registry → page → Gate A → rollout chain on ANY profession through identical code, so two professions can be compared without the runner differing",
    whyKnown: true,
  },
  {
    file: "bin/report.mjs",
    /* 🔴 ROUTED through the shared governed-write boundary (23 September 2026). No direct page-write site
     * remains; the refusal is now recorded rather than only printed. */
    routed: true,
    sites: 0,
    writes: "the owner's report view — one HTML page summarising the evidence store, the crawl and the facts",
    where: `runs/report/index.html by default, or the file given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants. 🔴 Until 12 September 2026 it had NO gate and wrote on every run",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "the one owner-facing surface v0.1 has (items 51 and 56 inspect it). It is a report about evidence, not a product page",
    whyKnown: true,
  },
]);

/**
 * 🔴 GAP 1 (15 September 2026) — THE LOCAL WRITERS THAT WRITE NO PAGE, DECLARED BESIDE THE PAGE WRITERS.
 *
 * The write law says EVERY write path defaults to dry-run. The census above reconciles PAGE writes only, so a CSV
 * export into runs/ was outside the population the law was enforced over — and on 14 September one such writer
 * rewrote committed evidence on a run made only to read a number (_handoffs/AlmiVisibility_WRITE_LAW_GAP_2026-09-14.md).
 *
 * Each entry states the same four things, and `test/ungated-writers.test.mjs` checks each against its source: that it
 * calls writePermission and confineToRepo before its first write, that every write site sits behind its gateToken, and
 * that its site count and destination flag are what the entry declares.
 *
 * ⚠️ WHAT THIS LIST IS NOT: a census. Nothing finds a writer that is missing from it — widening the census beyond
 * PAGE_WRITE so every write path must be declared is gap 2 in the owner's frozen register, a separate slot, and is NOT
 * done here. A new ungated local writer can still arrive unseen, exactly as these did.
 */
/**
 * 🔴 GAP 2, RECONCILED — WHAT #97 DECLARED, AND WHAT MEASUREMENT ACTUALLY FOUND (16 September 2026).
 *
 * #97's widened census reported ELEVEN binaries as ungated writers, and they were declared here BY
 * NAME as eleven real defects. THEY WERE NOT DEFECTS. The owner withdrew the premise after
 * measurement, and this list is reconciled to what was measured.
 *
 * WHAT WENT WRONG, IN ORDER — the record must not read as though #97 never made the error:
 *   · #97's census reported the eleven as ungated, and they were declared here as defects;
 *   · running each with no flags left every file it could write BYTE-IDENTICAL: the premise was
 *     overbroad, and this list described defects that do not exist;
 *   · gateOf had two NAMED control-flow blind spots — (a) a write on the `else` LINE of a top-level
 *     `if (!token)`, where the site IS the else and a walk that only looks ABOVE the site can never
 *     see it; (b) `} else if (…) {` read as the CLOSE of the guard rather than as the opening of its
 *     next branch, which made supersede-noindex's gated write look like a fall-through;
 *   · 🔴 THE ROOT CAUSE WAS NEITHER BLIND SPOT. IT WAS THE TWO-STATE DESIGN ITSELF: a shape gateOf
 *     could not READ fell to "ungated", so "I cannot determine" was written down as "no gate". That
 *     is fixed here by the third state — GATED / UNGATED / CANNOT_DETERMINE — counted in its own
 *     column and folded into neither of the others (LAW-ABSENT-1);
 *   · this PR corrects both blind spots and the design, and reconciles these declarations.
 *
 * 🔴 THIS LIST IS EMPTY BECAUSE THE DETECTOR WAS FIXED, NOT BECAUSE THE WRITERS WERE. No binary was
 * modified by that PR. A register emptied by repairing a census is NOT the same as a register
 * emptied by repairing writers, and gap 2 is not closed by this file being empty.
 *
 * THE EVIDENCE BEHIND EVERY REMOVAL (runs/audit/gap2-eleven-remeasured-2026-09-16.txt):
 *   · corrected static census — all eleven GATED; 0 UNGATED; 0 CANNOT_DETERMINE;
 *   · behavioural, write path demonstrably REACHED and nothing written — acceptance-test,
 *     edge-graph, instrument-disagreement, link-recommendation-evidence, measure-text-kind,
 *     replay-crawl, supersede-noindex (7 of 11);
 *   · 🔴 STATIC EVIDENCE ONLY, because no no-flag run could REACH the write path, and each says why:
 *     archive-corpus (its corpus must be byte-exact against an expiring artifact), cost-ledger (its
 *     write sits behind `capture-actions --run=`, which calls `gh api`), source-integrity (its write
 *     sits behind `--live`, which fetches), diagnose-overlap (threw on a synthetic corpus before the
 *     write decision). This PR forbids the network, so those runs were NOT made, and a run that
 *     exits before its write path is recorded as proving nothing rather than counted as agreement.
 *
 * A NAME RETURNS HERE only for a writer MEASURED as genuinely ungated. A writer whose state is
 * CANNOT_DETERMINE is never declared here: the census carries it, by name, as UNRESOLVED.
 */
export const KNOWN_UNGATED_WRITERS = Object.freeze([]);

export const PERMITTED_LOCAL_WRITERS = Object.freeze([
  {
    file: "bin/facts-lifecycle.mjs",
    /* 🔴 ROUTED (23 September 2026). TEXT content, measured. The bare mkdir is gone rather than gated — the
     * boundary's prepare step creates the directory it writes into. */
    routed: true,
    sites: 0,
    writes: "the fact registry exported for VERIFICATION as one CSV — the list of questions a verifier must answer, never the answers",
    where: `runs/export/facts-for-verification.csv by default — a tracked EVIDENCE file (.gitattributes runs/**) — or the file given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: the directory and the file sit behind permission.mayWrite, which only --confirm grants. Every figure — conflict, freshness, the dependency walk, changed inputs, the cache — prints with no flag. 🔴 Until 15 September 2026 it wrote on EVERY run, and on 14 September a run made to read one number rewrote committed evidence",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "the verification hand-off for rows 16, 17 and 46: a person verifies the registry by reading official sources, and this file tells them which claims to read for and what kind of authority settles each",
    whyKnown: true,
  },
  {
    file: "bin/export.mjs",
    /* 🔴 ROUTED through the shared governed-write boundary (23 September 2026): three targets, three governed
     * occurrences, each audited allowed or refused. The direct write site and the bare mkdir are GONE rather than
     * gated — the boundary's own prepare step creates the directory — so the declared count is 0. */
    routed: true,
    sites: 0,
    writes: "the three exports of the evidence store — evidence.md, evidence.json and estate.csv — each carrying the states and bounds of what it summarises",
    where: `runs/export/ by default — three tracked EVIDENCE files (.gitattributes runs/**) — or the directory given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: the directory and all three files sit behind permission.mayWrite, which only --confirm grants. With no flag it still builds all three and prints each one's size, the states and the bounds. 🔴 Until 15 September 2026 it wrote on every run — the same shape as the writer that fired on 14 September. `npm run export` is therefore a dry run; `npm run export -- --confirm` writes",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "item 6: the evidence store rendered for a reader who does not read JSONL — the Markdown and CSV an owner opens, and the JSON another tool reads — with every state carried through and never upgraded",
    whyKnown: true,
  },
  {
    file: "bin/checklist-boundaries.mjs",
    /* 🔴 ROUTED through the shared governed-write boundary (23 September 2026). The direct write site is GONE,
     * not merely gated: the mutation happens inside the boundary, which audits the attempt and the outcome. The
     * declared count is therefore 0, and the STRICTER routed rule in the census applies. */
    routed: true,
    sites: 0,
    writes: "CHECKLIST_BOUNDARIES.md — every row's four-part boundary quoted verbatim from the hash-verified frozen sources, beside its seven-state verdict",
    where: `CHECKLIST_BOUNDARIES.md at the repository root — a fixed path, no operator flag; a GENERATED document, not evidence; ${CONFINED}`,
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants. Without it the run still builds the document and reports whether the committed one is UP TO DATE, STALE or MISSING. Judged on 15 September 2026: routine regeneration makes the flag a daily keystroke, and the write law already names --confirm as the right price for a local write",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: false,
    why: "the boundaries must be verbatim, and the surest way to keep them verbatim is never to type them: they are read from the frozen sources on every run, so this document can be rebuilt and never hand-edited",
    whyKnown: true,
  },
  /* ── 🔴 GAP 2 (16 September 2026) — THE SIX THAT WROTE WITH NO GATE AT ALL ──────────────────────
   *
   * Gap 1 gated four writers and said plainly that nothing yet FINDS one that is missing from this
   * list. These six were exactly that: zero occurrences of writePermission, mayWrite or --confirm in
   * any of them, appending findings, observations and ledger entries on every run. Two of them do not
   * write at their own call site at all — they hand a store to a module — so their gate is WHICH
   * STORE they hand over, and `createDryRunStore` (src/evidence/store.mjs) is the second
   * implementation of the frozen STORE_INTERFACE they pass when the write is not permitted.
   */
  {
    file: "bin/audit.mjs",
    /* 🔴 ROUTED (23 September 2026). The dry-run store is now always the collector — it already kept every record
     * and returned the real appended-versus-resighted answer — so the audit runs and reports identically either
     * way, and the run makes ONE governed decision about committing what it collected. */
    routed: true,
    sites: 0,
    writes: "the robots-scope and DNS-family findings, and one DNS observation per estate host — written inside runRobotsAndDnsAudit, through the store this bin hands it",
    where: `runs/audit/findings.jsonl by default, or the file given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: the directory sits behind permission.mayWrite, and without it the store handed to the audit is createDryRunStore — the same interface, writing nothing and counting what it would have stored. 🔴 Until 16 September 2026 it had NO gate and appended on every run",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "items 10 and 26: whether a URL blocked in robots.txt is blocked for GOOGLEBOT, and which DNS families each estate host answers on — the evidence both rows' verdicts rest on",
    whyKnown: true,
  },
  {
    file: "bin/audit-content.mjs",
    /* 🔴 ROUTED (23 September 2026). Zero direct writes; the one remaining site is the append discipline handed
     * to the boundary by NAME, so no write-shaped text is left here at all. The bare mkdir is gone rather than
     * gated — the boundary's prepare step creates the directory. */
    routed: true,
    sites: 0,
    writes: "the content findings — exact duplicate, thin content, near duplicate, template dominance and the orphan check — over the archived corpus",
    where: `runs/audit/content-findings.jsonl by default, or the file given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: the directory and every append sit behind permission.mayWrite, which only --confirm grants. With no flag it runs every check and prints how many findings it WOULD store. 🔴 Until 16 September 2026 it had NO gate",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "items 12 and 13: the duplicate/thin/template census and the cannibalisation report, both read from the committed body archive rather than from a fresh crawl",
    whyKnown: true,
  },
  {
    file: "bin/audit-technical.mjs",
    /* 🔴 ROUTED (23 September 2026). Sitemap observations and findings are collected and committed as two
     * governed decisions. The bare mkdir is gone rather than gated, and the store still decides
     * appended-versus-re-sighted so the run reports its answer unchanged. */
    routed: true,
    sites: 0,
    writes: "the technical findings (status, https, canonical, noindex, head elements, broken links, query parameters, indexability preflight) and, with --sitemaps, one observation per host's sitemap collection",
    where: `runs/audit/technical-findings.jsonl by default, or the file given by --out; the sitemap observations at runs/evidence/sitemaps.jsonl; ${CONFINED}`,
    gatedBy: "write-law LOCAL: the directory, the findings and the sitemap observations each sit behind permission.mayWrite. 🔴 Until 16 September 2026 it had NO gate — and it is the writer that once stored 868 issues twice",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "items 10 and 38: the per-page technical state and the indexability preflight over the 394 archived pages, with INDEXABLE ≠ INDEXED kept apart",
    whyKnown: true,
  },
  {
    file: "bin/supply-labels.mjs",
    /* 🔴 ROUTED (23 September 2026). Zero direct writes; the one site is the append discipline the boundary
     * invokes, named rather than written out, and the store still decides appended-versus-re-sighting so the run
     * reports it exactly as before. */
    routed: true,
    sites: 0,
    writes: "the HEAVY / THIN / EMPTY supply labels as findings, over the unpacked crawl corpus",
    where: `runs/audit/supply-labels.jsonl by default, or the file given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: the append sits behind permission.mayWrite, which only --confirm grants. With no flag it labels the whole corpus and prints how many findings it WOULD store. 🔴 Until 16 September 2026 it had NO gate",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "item 8: a census of WHAT CONTENT EXISTS, with the guard that stops a supply label being read as a demand claim",
    whyKnown: true,
  },
  {
    file: "bin/verification-issues.mjs",
    /* 🔴 ROUTED (23 September 2026). Observations and issues are collected and committed as two governed
     * decisions — one per kind, because they are genuinely different writes. The store still decides
     * appended-versus-re-sighted, and the report still prints its answer. */
    routed: true,
    sites: 0,
    writes: "the issues a human verification returned, each citing an observation of the VERDICT ROW we hold — never of a page we did not fetch",
    where: `runs/audit/verification-issues.jsonl by default, or the file given by --out; ${CONFINED}`,
    gatedBy: "write-law LOCAL: the append sits behind permission.mayWrite, which only --confirm grants. With no flag it prints every issue it would record, marked already-present or new. 🔴 Until 16 September 2026 it had NO gate",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "item 15, part 4: what the 12 September verification turned up, recorded as issues with an honest chain of custody",
    whyKnown: true,
  },
  {
    file: "bin/gsc-ingest.mjs",
    /* 🔴 ROUTED (23 September 2026). The dry-run store is always the collector, so the ingest runs and reports
     * identically either way; the observations and the cost entry are then two governed decisions. The rule that
     * a SYNTHETIC source is NEVER written to the ledger is intact — where it applies there is no governed write
     * at all, so the boundary is not called. */
    routed: true,
    sites: 0,
    writes: "the Search Console measurements — written inside runIngest through the store this bin hands it — and one cost-ledger entry per run",
    where: `runs/evidence/evidence.jsonl by default, or the file given by --store; the ledger at runs/cost/ledger.jsonl; ${CONFINED}`,
    gatedBy: "write-law LOCAL: both ledger appends sit behind permission.mayWrite, and without it the store handed to runIngest is createDryRunStore — so a run queries, reports every row count, bound and cost, and stores nothing. 🔴 Until 16 September 2026 it had NO gate",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "item 9: the owned Search Console evidence every discovery row reads, and item 45's cost of the run that fetched it",
    whyKnown: true,
  },
  {
    file: "bin/crawl.mjs",
    sites: 6,
    writes: "the crawl record — its observations and one run record — and, on a LIVE run, the raw bodies (also declared above as a page writer) and a cost-ledger entry",
    where: `runs/crawl/crawl.jsonl by default (not tracked; uploaded as a CI artifact), or the file given by --out; bodies under --corpus; the ledger at runs/cost/ledger.jsonl; ${CONFINED}`,
    gatedBy: "mayRecord = a LIVE run OR write-law LOCAL permission.mayWrite. A DRY run records nothing unless --confirm; a LIVE run has already passed D-CRW-4's --live AND --i-have-the-owners-green and records what it fetched and spent, because a billable run that kept no record would be the worse failure. 🔴 Until 15 September 2026 every DRY run appended a run record: the D-CRW-4 gate was on the network, not on these local writes",
    gateFlags: ["--confirm", "--live", "--i-have-the-owners-green"],
    gateToken: "mayRecord",
    destinationOverridable: true,
    why: "the crawl's record is item 1's evidence — every fetched page's hash and bounds — and the run record is what a later reviewer commits by hand; the ledger entry is item 45's cost of a live run",
    whyKnown: true,
  },
  {
    file: "bin/detect.mjs",
    /* 🔴 ROUTED (23 September 2026). Three targets — findings, their digest, and the score. All TEXT, MEASURED:
     * serialiseFindings returns a JSON string, so the missing encoding argument at the old call sites never made
     * them binary. The output is still written and closed before any expectation is read. */
    routed: true,
    sites: 0,
    writes: "the findings output of one detection run — every outcome of every generic detector, with its evidence — plus that output's sha256, and the score when an expectation set is supplied",
    where: `the directory given by --out; there is no default destination, so a run that names none writes nothing at all; ${CONFINED}`,
    gatedBy: "write-law LOCAL: the output directory and all three files sit behind permission.mayWrite, which only --confirm grants. With no flag the whole run still executes and prints every count and the output's own hash — the detectors, the serialisation and the digest are identical, and only the write is withheld",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: true,
    why: "row 52's evidence is a findings output that can be hashed and CLOSED before anything holding the expected answers reads it. That ordering is only auditable if the output is a file on disk with its digest beside it, so the score can be shown to have been computed against bytes that were already fixed",
    whyKnown: true,
  },
  /* ── 🔴 F05 (22 September 2026) — THREE GENERATORS OF THE ACTIVE F-BOARD AND THE AUTHORITY CORPUS ──────────────
   * Each rebuilds one GENERATED config file from committed sources and, with no flag, only reports UP TO DATE or
   * STALE. Found by this census the moment they were tracked; gated the same day rather than declared ungated. */
  {
    file: "bin/fboard-derive.mjs",
    /* 🔴 ROUTED (23 September 2026). Its `!fresh` short-circuit is now the boundary's own: when the target already
     * carries these exact bytes, inspect() returns ALREADY_COMMITTED and no rename happens — the same decision,
     * recorded instead of silent. */
    routed: true,
    sites: 0,
    writes: "config/fboard/capabilities.mjs — F01–F89, derived line by line from the committed specification extract, each row pinned to its line's sha256",
    where: "config/fboard/capabilities.mjs — a fixed path inside this repository, no operator flag; a GENERATED file, not evidence",
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants. Without it the run derives every row and reports whether the committed file is UP TO DATE or STALE",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: false,
    why: "the active completion denominator must be the specification's own 89 rows, never typed: it is re-derived from the committed extract, so it can be rebuilt and never hand-edited",
    whyKnown: true,
  },
  {
    file: "bin/fboard-crosswalk.mjs",
    /* 🔴 ROUTED (23 September 2026). The --check exit code is preserved exactly. */
    routed: true,
    sites: 0,
    writes: "config/fboard/crosswalk.mjs — one entry per F-row with its acceptance relation, and the historical ledger's rows as provenance only",
    where: "config/fboard/crosswalk.mjs — a fixed path inside this repository, no operator flag; a GENERATED file, not evidence",
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants. Without it the run builds the crosswalk and reports UP TO DATE or STALE; --check exits 1 when stale",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: false,
    why: "F05 §4: the crosswalk points F-rows to reusable historical work without importing authority; generated so its provenance cannot drift from the ledger it reads",
    whyKnown: true,
  },
  {
    file: "bin/authority-migrate.mjs",
    /* 🔴 ROUTED (23 September 2026) — the CORPUS write. This caller's write-gate DECISION was already emitted
     * live by auditAuthorityMigration before the boundary existed; what was unaudited was the mutation, and that
     * is what now goes through the boundary. The audit append still comes first and still gates it. */
    routed: true,
    sites: 0,
    writes: "config/authority/corpus.mjs — the real authority corpus: paths, structured identity and content hashes of committed governance records, never their prose",
    where: "config/authority/corpus.mjs — a fixed path inside this repository, no operator flag; a GENERATED file, not evidence",
    gatedBy: "write-law LOCAL: permission.mayWrite, which only --confirm grants. Without it the run migrates in memory, prints the census, and reports UP TO DATE or STALE (exit 1 when stale)",
    gateFlags: ["--confirm"],
    gateToken: "permission.mayWrite",
    destinationOverridable: false,
    why: "F05 §7: the register resolves over the committed corpus, and the corpus must be read from COMMITTED bytes at a named commit — so it is migrated by a program, never assembled by hand",
    whyKnown: true,
  },
]);
