#!/usr/bin/env node
/**
 * ITEM 49 — SUPERSEDE THE cv-guide NOINDEX ISSUES. THE FIRST LIFECYCLE THIS
 * PROJECT HAS EVER COMPLETED.
 *
 *   node bin/supersede-noindex.mjs              dry-run: prints what it would append
 *   node bin/supersede-noindex.mjs --confirm    appends to runs/audit/technical-findings.jsonl
 *
 * ── WHAT WAS CLAIMED, AND WHAT LATER EVIDENCE SHOWS ─────────────────────────
 *
 * The noindex detector raised 134 issues on `almicv.almiworld.com/cv-guide/
 * {country}/{role}` pages: "noindex present", verdict FAIL — a DEFECT.
 *
 * Tracing the origin (observation 8b90879f2f7c290b, hissa 3) found it is a
 * DELIBERATE de-indexing decision: commit 50f8c20 in almi-cv-v2 (17 Aug 2026)
 * keys indexability on a verified country convention and states its intent.
 * The pages are noindex-but-crawlable, which Google's guidance (observation
 * 841c7b897287e0d3) names as the configuration that lets noindex work.
 *
 * ── 🔴 WHAT THE REPLACEMENT DOES NOT CLAIM ─────────────────────────────────
 *
 * It does NOT claim the decision is RIGHT. The commit's premise is that these
 * pages are "near-duplicates by construction"; our own measurement of same-role
 * siblings found 0.685 average similarity and none reaching 0.8. So the new
 * record is UNKNOWN — not PASS (an issue cannot be one), not FAIL (it is not a
 * defect) — and whether the gate is still the right rule is the owner's
 * decision (REC-NOINDEX-CV-GUIDE). A product decision is not a defect.
 *
 * ── HOW, IN AN APPEND-ONLY STORE ────────────────────────────────────────────
 *
 * Nothing is edited or deleted. For each old issue: a NEW issue that names it
 * in `supersedes`, and an `issue_state_change` OPEN → SUPERSEDED that names the
 * new one. The old record stays exactly as written. Re-running appends nothing
 * for an issue that has already moved.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { makeIssue } from "../src/evidence/records.mjs";
import { makeIssueStateChange, lifecycleOf, STATE_CHANGE_TYPE } from "../src/evidence/lifecycle.mjs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 GAP 2 · TESTABILITY SEAM (17 September 2026): `--store=` names a different findings store, CONFINED to this
 * repository by the same confineToRepo as the default — it refuses before anything is read or written. It chooses
 * WHERE, never WHETHER: the write still needs --confirm. Without it, the default store, exactly as before. */
const storeArg = process.argv.find((a) => a.startsWith("--store="))?.slice("--store=".length);
const TARGET = confineToRepo(storeArg ?? `${REPO}runs/audit/technical-findings.jsonl`, { label: storeArg === undefined ? "the technical findings store" : "--store" });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));

export const ORIGIN_OBSERVATION = "8b90879f2f7c290b";
export const GUIDANCE_OBSERVATION = "841c7b897287e0d3";
export const REVIEW_DETECTOR = "noindex.origin-review";
export const REVIEW_VERSION = "1";

const readJsonl = (p) => (existsSync(p) ? createJsonlStore(p).readAll() : []);
const auditDir = `${REPO}runs/audit`;
const audit = readdirSync(auditDir).filter((f) => f.endsWith(".jsonl")).flatMap((f) => readJsonl(join(auditDir, f)));
const crawl = batchJsonlFiles().flatMap((p) => createJsonlStore(p).readAll());

const observationIds = new Set([...audit, ...crawl].filter((r) => r.record_type === "observation").map((r) => r.observation_id));
for (const id of [ORIGIN_OBSERVATION, GUIDANCE_OBSERVATION]) {
  if (!observationIds.has(id)) {
    console.error(`🔴 REFUSED — evidence ${id} is not in the stores. A supersession on evidence nobody can follow is a deletion.`);
    process.exit(2);
  }
}

const pages = new Map(crawl.filter((r) => r.record_type === "page").map((p) => [p.page_id, p.canonical_url]));
const technical = readJsonl(TARGET);
const { issues } = lifecycleOf(technical);
const CV_GUIDE = /^https:\/\/almicv\.almiworld\.com\/cv-guide\/[^/]+\/[^/]+\/?$/;

/* 🔴 ONLY THE ORIGINAL DETECTOR'S ISSUES. A first version selected every
 * issue_class "noindex" — and the replacements it had just written ARE noindex
 * issues, OPEN, on the same pages. Its re-run superseded its own replacements:
 * 268 more records, 268 SUPERSEDED instead of 134. Caught by running it twice
 * before committing, and the store restored from git. */
const candidates = [...issues.values()].filter(
  (e) => e.issue.issue_class === "noindex" && e.issue.detector === "noindex" && CV_GUIDE.test(pages.get(e.issue.target_page_id) ?? ""),
);
const pending = candidates.filter((e) => e.state === "OPEN");

const now = new Date().toISOString();
const REASON =
  "SUPERSEDED — this issue's premise was that noindex on this page is a DEFECT. Later evidence shows it is a DELIBERATE " +
  "DE-INDEXING DECISION: commit 50f8c20 in almi-cv-v2 (17 Aug 2026) keys indexability on a verified country convention and " +
  "states its intent ('avoids the 99k near-duplicate trap'; unverified siblings are 'near-duplicates by construction'), and " +
  "the page is noindex-but-crawlable, the configuration Google's guidance names as the one that makes noindex effective. " +
  "NOT established: that the near-duplicate premise holds here — same-role siblings measured 0.685 average similarity and " +
  "none reaches 0.8. So the replacement is UNKNOWN, not FAIL: whether the gate is still the right rule is the owner's " +
  "decision (REC-NOINDEX-CV-GUIDE).";

const replacements = [];
const changes = [];
const records = { get length() { return replacements.length + changes.length; } };
for (const e of pending) {
  const old = e.issue;
  const replacement = {
    ...makeIssue({
      issue_class: "noindex",
      target_page_id: old.target_page_id,
      verdict: "UNKNOWN",
      severity: "info",
      evidence: [...old.evidence, ORIGIN_OBSERVATION, GUIDANCE_OBSERVATION],
      opened_at: now,
      detector: REVIEW_DETECTOR,
      detector_version: REVIEW_VERSION,
      supersedes: old.issue_id,
    }),
    summary: "noindex present and DELIBERATE (commit 50f8c20) — a product decision, not a defect; its near-duplicate premise is unconfirmed",
    reason:
      "The noindex is a stated, deliberate de-indexing gate, correctly configured (crawlable). Whether it is still the right rule is " +
      "UNKNOWN from our evidence: the premise it cites is not confirmed by our similarity measurement. Owner's decision: REC-NOINDEX-CV-GUIDE.",
  };
  replacements.push(replacement);
  changes.push(
    makeIssueStateChange({
      issue_id: old.issue_id,
      from: "OPEN",
      to: "SUPERSEDED",
      changed_at: now,
      reason: REASON,
      evidence: [ORIGIN_OBSERVATION, GUIDANCE_OBSERVATION],
      action: `bin/supersede-noindex.mjs — replacement issued by detector ${REVIEW_DETECTOR} v${REVIEW_VERSION}`,
      actor: "Claude (repo audit), on the owner's brief of 12 Sep 2026",
      superseded_by: replacement.issue_id,
    }),
  );
}

console.log("ITEM 49 — SUPERSEDE THE cv-guide NOINDEX ISSUES");
console.log(`[bound: ${technical.filter((r) => r.record_type === "issue").length} issue records in ${TARGET}; pattern ${CV_GUIDE}]`);
console.log(`  noindex issues on cv-guide role×country pages : ${candidates.length} distinct (the store holds each issue_id ${candidates[0]?.copies ?? 0} time(s))`);
console.log(`  already superseded                            : ${candidates.length - pending.length}`);
console.log(`  to supersede now                              : ${pending.length}`);
console.log(`  records to append                             : ${records.length} (${replacements.length} replacements + ${changes.filter((r) => r.record_type === STATE_CHANGE_TYPE).length} state changes)`);
console.log("  🔴 nothing is edited or deleted; no other issue class is touched — the robots issues stay OPEN");

if (!permission.mayWrite) {
  console.log(`\n[dry-run] would have appended ${records.length} records — add --confirm`);
} else if (records.length) {
  const store = createJsonlStore(TARGET);
  // 🔴 Issues through the dedupe entry point; state changes are not issues and
  // are made idempotent by the OPEN-only filter above.
  for (const issue of replacements) store.appendIfNew(issue, { seenAt: now });
  store.appendAllWithoutDedupe(changes);
  const after = lifecycleOf(store.readAll());
  console.log(`\nappended ${records.length} records. lifecycle errors: ${after.errors.length}. states now: ${JSON.stringify(after.census)}`);
  if (after.errors.length) {
    for (const e of after.errors) console.error(`  🔴 ${e}`);
    process.exit(1);
  }
}
