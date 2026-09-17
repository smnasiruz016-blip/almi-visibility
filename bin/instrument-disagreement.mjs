#!/usr/bin/env node
/**
 * ITEM 26 · 1A — RAISE THE 340 / 341 DISAGREEMENT AS ISSUES, AND CLOSE THEM ONLY ON EVIDENCE.
 *
 *   node bin/instrument-disagreement.mjs                     dry run: reproduce the disagreement, print the issues
 *   node bin/instrument-disagreement.mjs --confirm           raise them in runs/audit/instrument-findings.jsonl
 *   node bin/instrument-disagreement.mjs --close --confirm   close each OPEN one — refused unless both runners'
 *                                                            recorded re-runs print the SAME count as the shared definition
 *
 * The closing evidence is the two runners' own recorded output, not a recount
 * here: a closer that recomputed the number with the shared function would be
 * checking the definition against itself.
 */

import { existsSync, readFileSync } from "node:fs";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { readBodyArchive } from "../src/evidence/body-archive.mjs";
import { pagesFromRun, inboundOf, unpackGraph } from "../src/crawl/inbound.mjs";
import { disagreementIssues, ISSUE_CLASS } from "../src/audit/instrument-agreement.mjs";
import { lifecycleOf, makeIssueStateChange } from "../src/evidence/lifecycle.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
/* 🔴 GAP 2 · TESTABILITY SEAM (17 September 2026): `--store=` names a different findings store, CONFINED to this
 * repository by the same confineToRepo as the default — it refuses before anything is read or written. It chooses
 * WHERE, never WHETHER: the write still needs --confirm. Without it, the default store, exactly as before. */
const storeArg = argv.find((a) => a.startsWith("--store="))?.slice("--store=".length);
const STORE = confineToRepo(storeArg ?? `${REPO}runs/audit/instrument-findings.jsonl`, { label: storeArg === undefined ? "the instrument findings store" : "--store" });
const CONTENT_RUN = `${REPO}runs/audit/item-13-26-content-run-2026-09-13.txt`;
const TECHNICAL_RUN = `${REPO}runs/audit/item-26-technical-run-2026-09-13.txt`;

const crawlRecords = createJsonlStore(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`).readAll();
const pages = pagesFromRun({ crawlRecords, bodies: readBodyArchive(`${REPO}runs/crawl/bodies-2026-09-12.jsonl.br`) });
const edges = unpackGraph(readFileSync(`${REPO}runs/crawl/edges-2026-09-12.jsonl.br`));
const now = new Date().toISOString();

if (!argv.includes("--close")) {
  const { issues, counts } = disagreementIssues({ pages, edges, openedAt: now });
  console.log(`[bound: ${pages.length} distinct pages · ${edges.length} stored edges]`);
  console.log(`the two instruments, reproduced from the stored graph: ${Object.entries(counts).map(([k, v]) => `${k} → ${v}`).join(" · ")}`);
  console.log(`issues: ${issues.length} — one per page they treat differently`);
  for (const i of issues) console.log(`  ${i.issue_id}  ${i.summary}`);
  if (!permission.mayWrite) {
    console.log("[dry-run] nothing raised — add --confirm");
    process.exit(0);
  }
  const store = createJsonlStore(STORE);
  let raised = 0;
  for (const i of issues) if (store.appendIfNew(i, { seenAt: now }).appended) raised += 1;
  console.log(`raised ${raised} new issue(s), ${issues.length - raised} re-sighted, in ${STORE}`);
  process.exit(0);
}

/* ---- CLOSE — only on the runners' own recorded agreement ---------------- */
const countIn = (path, re) => (existsSync(path) ? Number(re.exec(readFileSync(path, "utf8"))?.[1]) : NaN);
const content = countIn(CONTENT_RUN, /^\s*orphan-within-crawled-set\s+FAIL=\s*\d+\s+UNKNOWN=\s*(\d+)/m);
const technical = countIn(TECHNICAL_RUN, /pages with no inbound links inside the crawled set: (\d+)/);
const shared = inboundOf({ pages, edges }).zero.length;
console.log(`recorded re-runs: bin/audit-content.mjs → ${content} · bin/audit-technical.mjs → ${technical} · the shared definition → ${shared}`);
if (!(content === technical && technical === shared)) {
  console.error("🔴 REFUSED — the runners do not agree, so nothing is closed.");
  process.exit(1);
}
const store = createJsonlStore(STORE);
const open = [...lifecycleOf(store.readAll()).issues.values()].filter((e) => e.state === "OPEN" && e.issue.issue_class === ISSUE_CLASS);
const changes = [];
for (const e of open) {
  changes.push(
    makeIssueStateChange({
      issue_id: e.issue.issue_id,
      from: "OPEN",
      to: "CLOSED",
      changed_at: now,
      reason: `both runners now read one stored graph (runs/crawl/edges-2026-09-12.jsonl.br) through one definition (src/crawl/inbound.mjs) and their recorded re-runs print the same count: ${content}`,
      evidence: [...e.issue.evidence],
      action: "src/crawl/inbound.mjs · bin/edge-graph.mjs · bin/audit-content.mjs · bin/audit-technical.mjs",
      actor: "Claude (queue run), on beta-g's brief of 13 Sep 2026",
    }),
  );
}
console.log(`OPEN ${ISSUE_CLASS} issues to close: ${changes.length}`);
if (!permission.mayWrite) {
  console.log("[dry-run] nothing closed — add --confirm");
  process.exit(0);
}
// Declared: state changes are not issues and carry no dedupe key; built only from OPEN issues, so a re-run closes none.
store.appendAllWithoutDedupe(changes);
console.log(`closed ${changes.length} issue(s)`);
