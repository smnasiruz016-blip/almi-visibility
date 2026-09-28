/**
 * F19 · SABOTAGE — one deliberate defect per limb of the frozen acceptance's FAILURE clause, each aimed at the NAMED proof in
 * test/f19-crawler-bounds.test.mjs that must turn RED for the intended reason, restored byte-identically, the production
 * trail hashed around the whole run (shared harness: test/helpers/f08-sabotage.mjs). Each sabotage is applied ALONE.
 *
 *   node test/helpers/f19-sabotage.mjs [--only=F19-S1,…] [--out=<file>]
 *
 * FAILURE limbs → sabotages:
 *   more pages than the declared cap ............................................................. F19-S1
 *   more requests per host than the declared cap ................................................. F19-S2
 *   a link followed beyond the declared depth .................................................... F19-S3
 *   a body beyond the size cap stored whole, not marked truncated ................................ F19-S4
 *   two requests to one host closer than the declared interval (a page; robots.txt) .............. F19-S5, F19-S6
 *   a request running past its timeout (a page; robots.txt) ...................................... F19-S7, F19-S8
 *   a control undeclared in the run's record (depth, interval, timeout: the three the measurement
 *   found missing) ............................................................................... F19-S9, F19-S10, F19-S11
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f19-crawler-bounds.test.mjs";
const FRONTIER = "src/crawl/frontier.mjs";
const FETCHER = "src/crawl/fetcher.mjs";
const ROBOTS = "src/crawl/robots.mjs";
const CRAWLER = "src/crawl/crawler.mjs";
/* A multi-line anchor is written in the file's OWN line ending (a CRLF checkout here, LF in CI). */
const eolOf = (f) => (readFileSync(join(REPO, f), "utf8").includes("\r\n") ? "\r\n" : "\n");
const FE = eolOf(FRONTIER);

export const F19_SABOTAGES = [
  { id: "F19-S1", what: "the page cap is not enforced in offer()", file: FRONTIER, test: T, named: "F19 · B1 ·",
    from: `    if (this.#queue.length >= this.#capacity) {${FE}      this.#rejected += 1;`,
    to: `    if (false) {${FE}      this.#rejected += 1;`,
    expect: /F19-PAGES-EXCEEDED/ },

  { id: "F19-S2", what: "the per-host cap is not enforced", file: FRONTIER, test: T, named: "F19 · B2 ·",
    from: `    if (used >= this.#maxPerHost) {`, to: `    if (false) {`,
    expect: /F19-PER-HOST-EXCEEDED/ },

  { id: "F19-S3", what: "a found link is offered to the frontier (depth 1)", file: CRAWLER, test: T, named: "F19 · B3 ·",
    from: `        edges.push({ from: res.finalUrl ?? url, to });`, to: `        edges.push({ from: res.finalUrl ?? url, to }); plan.frontier.offer(to);`,
    expect: /F19-DEPTH-EXCEEDED/ },

  { id: "F19-S4", what: "the size ceiling is not applied to a streamed body", file: FETCHER, test: T, named: "F19 · B4 ·",
    from: `    if (total >= limit) {`, to: `    if (false) {`,
    expect: /F19-SIZE-(NOT-MARKED|STORED-WHOLE)/ },

  { id: "F19-S5", what: "the pacer does not wait between page requests", file: FETCHER, test: T, named: "F19 · B5 ·",
    from: `    if (wait > 0) await sleepImpl(wait);`, to: `    if (false) await sleepImpl(wait);`,
    expect: /F19-RATE-VIOLATED/ },

  { id: "F19-S6", what: "robots.txt is fetched outside the pacer (the defect the measurement found)", file: ROBOTS, test: T, named: "F19 · B5 ·",
    from: `      await beforeRequest();`, to: `      void beforeRequest;`,
    expect: /F19-RATE-VIOLATED: request 2 \(\/r1\)/ },

  { id: "F19-S7", what: "the per-request abort timer does not abort", file: FETCHER, test: T, named: "F19 · B6 ·",
    from: `    const timer = setTimeout(() => controller.abort(), timeoutMs);`, to: `    const timer = setTimeout(() => {}, timeoutMs);`,
    expect: /F19-TIMEOUT-NOT-ENFORCED/ },

  { id: "F19-S8", what: "robots.txt falls back to its own 10 s timeout instead of the declared one", file: CRAWLER, test: T, named: "F19 · B7 ·",
    from: `  const robots = createRobotsCache({ fetchImpl, timeoutMs, beforeRequest: fetcher.pace });`,
    to: `  const robots = createRobotsCache({ fetchImpl, beforeRequest: fetcher.pace });`,
    expect: /F19-ROBOTS-TIMEOUT-NOT-DECLARED-VALUE/ },

  { id: "F19-S9", what: "the record does not declare depth", file: CRAWLER, test: T, named: "F19 · D ·",
    from: `    maxDepth: MAX_DEPTH, requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,`,
    to: `    requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,`,
    expect: /F19-RECORD-UNDECLARED: the run record lacks maxDepth=0/ },

  { id: "F19-S10", what: "the record does not declare the request interval", file: CRAWLER, test: T, named: "F19 · D ·",
    from: `    maxDepth: MAX_DEPTH, requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,`,
    to: `    maxDepth: MAX_DEPTH, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,`,
    expect: /F19-RECORD-UNDECLARED: the run record lacks requestIntervalMs=0/ },

  { id: "F19-S11", what: "the record does not declare the request timeout", file: CRAWLER, test: T, named: "F19 · D ·",
    from: `    maxDepth: MAX_DEPTH, requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,`,
    to: `    maxDepth: MAX_DEPTH, requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE,`,
    expect: /F19-RECORD-UNDECLARED: the run record lacks requestTimeoutMs=700/ },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? F19_SABOTAGES.filter((s) => only.includes(s.id)) : F19_SABOTAGES;
  console.log("F19 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F19 SABOTAGE EVIDENCE — one defect per limb of the frozen acceptance", head }) + `\nEXECUTION ASSERTION: ${executed} of ${list.length} sabotages executed.\n`);
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
