#!/usr/bin/env node
/**
 * ITEM 48 · 2B — SUPERSEDE THE DUPLICATE ISSUE COPIES. DO NOT ERASE THEM.
 *
 *   node bin/supersede-duplicates.mjs              dry-run
 *   node bin/supersede-duplicates.mjs --confirm    append the notes
 *
 * The technical audit writer ran twice on 12 September 2026 (02:49 and 02:57)
 * and, with a bare `append`, stored the same issues twice. An issue_id is
 * content-derived (C4), so two records with one issue_id are ONE finding.
 *
 * 🔴 THE STORE IS APPEND-ONLY, AND THAT DOES NOT BEND FOR TIDINESS. No copy is
 * removed. For every copy after the first, one `duplicate_record_superseded`
 * record is appended: which issue, which copy, which copy it yields to, why,
 * and the evidence. A reader counts the logical issue once; the extra copy is
 * still there, marked, for anyone who wants to see what happened.
 *
 * Idempotent: a copy already carrying a note is skipped. Covers every
 * runs/audit/*.jsonl store — not just the one where the doubles were noticed.
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { duplicateCensus, DUPLICATE_SUPERSEDED_TYPE } from "../src/evidence/lifecycle.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const AUDIT = confineToRepo(`${REPO}runs/audit`, { label: "the audit stores" });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const now = new Date().toISOString();
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:supersede-duplicates:${RUN_INSTANT}`;

console.log("ITEM 48 — SUPERSEDE DUPLICATE ISSUE COPIES");
let totalNotes = 0;
for (const f of readdirSync(AUDIT).filter((x) => x.endsWith(".jsonl")).sort()) {
  const path = join(AUDIT, f);
  const store = createJsonlStore(path);
  const records = store.readAll();
  const before = duplicateCensus(records);

  const byId = new Map();
  for (const r of records) if (r.record_type === "issue") byId.set(r.issue_id, [...(byId.get(r.issue_id) ?? []), r]);
  const notes = [];
  for (const u of before.unsuperseded) {
    const list = byId.get(u.issue_id);
    const kept = list[0];
    const dup = list[u.copy_index - 1];
    notes.push({
      record_type: DUPLICATE_SUPERSEDED_TYPE,
      issue_id: u.issue_id,
      copy_index: u.copy_index,
      yields_to_copy: 1,
      retained_opened_at: kept.opened_at,
      duplicate_opened_at: dup.opened_at,
      superseded_at: now,
      reason:
        "the same authorized job (this store's audit writer) ran twice and wrote this finding again with a bare append. " +
        "issue_id is content-derived, so this copy is the SAME logical issue as copy 1. It is retained, not removed; " +
        "readers count the issue once. The writer now uses appendIfNew, so a re-run adds a re-sighting instead.",
      evidence: [...dup.evidence],
      action: "bin/supersede-duplicates.mjs",
      actor: "Claude (repo audit), on the owner's brief of 12 Sep 2026",
    });
  }
  /* Routed. Supersession notes carry no dedupe key and are written once per copy, so the bulk discipline is
   * preserved; the boundary measures the delta over the target rather than by key. */
  let after = null;
  if (notes.length) {
    const governed = executeGovernedWrite(governedStoreAppend({
      repo: REPO, permission, store, records: notes, targetClass: "RUN_EVIDENCE",
      action: "APPEND_DUPLICATE_SUPERSESSION_NOTES", occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
      discipline: "APPEND_ALL_WITHOUT_DEDUPE",
    }));
    if (governed.outcome === "COMMITTED" || governed.outcome === "ALREADY_COMMITTED") after = duplicateCensus(store.readAll());
    else if (governed.outcome !== "REFUSED") {
      console.error(`🔴 ${governed.outcome} — notes were not written for ${f}; the governed attempt is on the audit trail`);
      process.exitCode = 1;
    }
  }
  totalNotes += notes.length;
  console.log(
    `  ${f.padEnd(32)} [bound: ${records.length} records] issue records=${before.physicalIssueRecords} logical=${before.logicalIssues} ` +
      `extra copies=${before.extraCopies} already superseded=${before.superseded} → to supersede now=${notes.length}` +
      (after ? `  | after: superseded=${after.superseded} unsuperseded=${after.unsuperseded.length}` : ""),
  );
}
console.log(permission.mayWrite ? `\nappended ${totalNotes} note(s). Nothing was removed.` : `\n[dry-run] ${totalNotes} note(s) not written — add --confirm`);
