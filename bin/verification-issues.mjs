#!/usr/bin/env node
/**
 * ITEM 15, PART 4 — record what the 12 September verification turned up as
 * ISSUES, with evidence, in the append-only store.
 *
 * ── 🔴 WHAT THE EVIDENCE ACTUALLY IS, AND WHAT IT IS NOT ────────────────────
 *
 * C1 says an Issue must cite an observation. The tempting observation here is
 * "the official page says X" — and WE NEVER FETCHED THOSE PAGES. beta-g did the
 * reading; we hold the verdict rows they returned, and nothing else.
 *
 * So the observation recorded is of the ARTEFACT WE ACTUALLY HAVE: the verdict
 * row, hashed from its own bytes. That is honest about the chain of custody —
 * this is a report of a human's reading, not a measurement of a web page. A
 * content hash of a page we never retrieved would be a fabrication, and it
 * would be indistinguishable from a real one to every later reader.
 *
 * Idempotent: re-running appends nothing new (measurement_key excludes the
 * clock), so this can be re-run safely.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { makeObservation, makeIssue } from "../src/evidence/records.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
// The CSV is READ, not written: it is the verifier's returned rows and it lives wherever they put it.
const CSV = arg("csv", "C:/Users/Lenovo/OneDrive/Desktop/AlmiWorld project/Claude outputs/FACT_VERIFICATION_2026-09-12.csv");
/* 🔴 GAP 2 — the DESTINATION is confined before anything is read, and this run is DRY BY DEFAULT. */
const OUT = confineToRepo(arg("out", `${REPO}runs/audit/verification-issues.jsonl`), { label: "--out" });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const wouldWrite = { observations: 0, issues: 0 };
const CHECKED_ON = "2026-09-12";
const VERIFIER = "human:beta-g (Cowork)";

const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/* ---- the verdict rows, read back as bytes ------------------------------- */

function parseCsv(t) {
  const rows = []; let f = "", row = [], q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); f = ""; if (row.some((x) => x !== "")) rows.push(row); row = []; }
    else if (c !== "\r") f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const text = readFileSync(CSV, "utf8");
const rows = parseCsv(text);
const hdr = rows[0];
const byId = new Map(rows.slice(1).map((r) => [r[0], Object.fromEntries(hdr.map((h, i) => [h, r[i] ?? ""]))]));

// The raw line for each fact, so the hash is of bytes we hold rather than of a
// re-serialisation we invented.
const rawLine = new Map();
for (const line of text.split(/\r?\n/)) {
  const id = line.split(",")[0];
  if (byId.has(id) && !rawLine.has(id)) rawLine.set(id, line);
}

const store = createJsonlStore(OUT);
/* Routed: observations and issues are COLLECTED here and committed as two governed decisions below — one per
 * kind, because they are genuinely different writes, not because the boundary wants two. */
const pendingObservations = [];
const pendingIssues = [];

function observe(factId) {
  const line = rawLine.get(factId);
  if (!line) throw new Error(`no verdict row for ${factId} — refusing to invent one`);
  if (!permission.mayWrite) wouldWrite.observations += 1;
  const observation = makeObservation({
      observed_at: `${CHECKED_ON}T00:00:00.000Z`,
      /* 🔴 The method names the chain of custody. Not "fetch": nothing was
       * fetched. A later reader must be able to tell these apart. */
      method: "human-verification-return",
      target: { kind: "artifact", ref: `FACT_VERIFICATION_2026-09-12.csv#${factId}` },
      content_sha256: sha(line),
      value: { fact_id: factId, verdict: byId.get(factId).verdict, note: byId.get(factId).note, verifier: VERIFIER },
      collector: "verification-issues",
      collector_version: "1",
  });
  pendingObservations.push(observation);
  /* The same value this returned before: the id of the observation this run stands on. */
  return observation.observation_id;
}

/**
 * 🔴 ISSUES GO THROUGH THE STORE'S ONE DEDUPE ENTRY POINT.
 *
 * This file used to carry its own copy: an issue has no `measurement_key`, so it
 * checked `issue_id` inline before a bare append. Since 12 September 2026 the
 * store deduplicates an issue by its content-derived `issue_id` itself, and a
 * private second copy of that rule is a copy that can drift. The issue-writer
 * census now requires every issue writer to call `appendIfNew`.
 */
function appendIssueIfNew(issue) {
  /* 🔴 THE TOKEN IS ON THE WRITE LINE ITSELF, not only in a guard above it. An early return does
   * gate the run, but `tools/permitted-writers.mjs` reads the enclosing condition of each site —
   * a gate it cannot see is the shape this slot exists to close, so the site names the gate. */
  if (!permission.mayWrite) wouldWrite.issues += 1;
  /* The slot is returned NOW and filled at the flush below, so the report still reads the store's own answer —
   * appended, or already present and re-sighted — without this file deciding it for itself. */
  const slot = { appended: false, issue_id: issue.issue_id, ...(permission.mayWrite ? {} : { dryRun: true }) };
  pendingIssues.push({ issue, slot });
  return slot;
}

/* ================================================================== *
 * ISSUE 1 — THE REGULATOR CONTRADICTS ITSELF.
 * ================================================================== */

const NG_FEES = [
  "ng-nmcn.verification-fee.purpose=certificate-verification",
  "ng-nmcn.verification-fee.purpose=authentication",
  "ng-nmcn.verification-fee.purpose=letter-of-good-standing",
  "ng-nmcn.verification-fee.destination=uk-nmc",
  "ng-nmcn.verification-documents",
];

const ngEvidence = NG_FEES.map(observe);

const issue1 = makeIssue({
  issue_class: "official-source-contradicts-itself",
  canonical_url: "https://www.nmcn.gov.ng/verify.html",
  /* 🔴 UNKNOWN, NOT FAIL. We are not saying our number is wrong — we cannot
   * know which of the regulator's two pages is current. FAIL would be a verdict
   * on our value; the honest verdict is that the question is open. */
  verdict: "UNKNOWN",
  severity: "high",
  evidence: ngEvidence,
  sources: NG_FEES,
  opened_at: `${CHECKED_ON}T00:00:00.000Z`,
  detector: "human-verification",
  detector_version: "1",
});
const r1 = appendIssueIfNew(issue1);

/* ================================================================== *
 * ISSUE 2 — THE COMMENCEMENT DATE DOES NOT AGREE WITH ITSELF.
 * ================================================================== */

/**
 * 🔴 THE BRIEFED PREMISE DID NOT HOLD, SO THIS IS NOT THE BRIEFED ISSUE.
 *
 * The brief (and the verifier's note) say our fact OMITS the 13 July 2026
 * commencement and the transition for earlier results. The record on disk
 * contains BOTH — it ends "...completed before 13 July 2026 remain usable."
 * Recording an omission that is not there would have put a false finding in the
 * store, and it would have looked verified because a human signed the row.
 *
 * What IS wrong is narrower and easy to miss: our value commences the rule
 * "from midnight on 12 July 2026 NZST", the verifier's reading of the same page
 * says "ONLY FROM 13 JULY 2026", and "midnight on 12 July" is itself ambiguous
 * between the start and the end of that day. One reading of our own sentence
 * puts the rule in force a full day before the source does — against a
 * candidate whose test falls in that window.
 */
const nzId = "nz-immigration-nz.oet-must-be-taken-in-person";
const nzEvidence = [observe(nzId)];

const issue2 = makeIssue({
  issue_class: "commencement-date-ambiguous-against-source",
  canonical_url: "https://www.immigration.govt.nz/about-us/news-centre/update-on-english-language-testing-for-immigration-applications/",
  verdict: "UNKNOWN",
  severity: "high",
  evidence: nzEvidence,
  sources: [nzId],
  opened_at: `${CHECKED_ON}T00:00:00.000Z`,
  detector: "human-verification",
  detector_version: "1",
});
const r2 = appendIssueIfNew(issue2);

/* ---- the two governed writes, before anything is reported ---------------- */

const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:verification-issues:${RUN_INSTANT}`;
const SEEN_AT = `${CHECKED_ON}T00:00:00.000Z`;
for (const [records, action] of [[pendingObservations, "APPEND_VERIFICATION_OBSERVATIONS"], [pendingIssues.map((p) => p.issue), "APPEND_VERIFICATION_ISSUES"]]) {
  const args = governedStoreAppend({
    repo: REPO, permission, store, records, targetClass: "RUN_EVIDENCE",
    action, occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
    discipline: "APPEND_IF_NEW", seenAt: SEEN_AT,
  });
  const governed = executeGovernedWrite(args);
  if (governed.outcome !== "REFUSED" && governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
    console.error(`🔴 ${governed.outcome} — ${action} was not written; the governed attempt is on the audit trail`);
    process.exit(1);
  }
  if (action === "APPEND_VERIFICATION_ISSUES") {
    (args.adapter.result ?? []).forEach((r, i) => { pendingIssues[i].slot.appended = Boolean(r?.appended); });
  }
}

/* ---- report -------------------------------------------------------------- */

console.log(`ISSUES → ${OUT}\n`);
console.log(`1. ${issue1.issue_class}  [${issue1.verdict}/${issue1.severity}]  ${r1.appended ? "appended" : "already present (re-sighted)"}`);
console.log(`   ${issue1.issue_id}`);
console.log(`   NMCN states N8,750 for authentication on verify.html and ONE COMBINED N68,875 on`);
console.log(`   verification-of-certificates/ — two official pages of the SAME regulator.`);
console.log(`   documents: we store 5; verify.html lists 6; the other page lists 3.`);
console.log(`   🔴 NOT RESOLVED. Both values retained. ${ngEvidence.length} observations cited.`);
console.log(`   🔴 verdict UNKNOWN, not FAIL — we cannot know which page is current.\n`);

console.log(`2. ${issue2.issue_class}  [${issue2.verdict}/${issue2.severity}]  ${r2.appended ? "appended" : "already present (re-sighted)"}`);
console.log(`   ${issue2.issue_id}`);
console.log(`   🔴 THIS IS NOT THE BRIEFED ISSUE. The brief said the fact OMITS the 13 July 2026`);
console.log(`      date and the transition. The record on disk carries BOTH — the premise is false.`);
console.log(`   The real defect: our value commences "from midnight on 12 July 2026 NZST" while the`);
console.log(`   verifier's reading of the same page says "ONLY FROM 13 JULY 2026", and "midnight on`);
console.log(`   12 July" is ambiguous between that day's start and its end. On one reading we apply`);
console.log(`   the rule a day early, to a candidate whose result is in fact still usable.`);
console.log(`   🔴 NOT CORRECTED HERE. Amending the value is authoring, and needs the owner.\n`);

console.log(`[bound: ${byId.size} verdict rows read from FACT_VERIFICATION_2026-09-12.csv]`);
console.log(`🔴 EVIDENCE PROVENANCE: every observation above is of a VERDICT ROW we hold, hashed`);
console.log(`   from its own bytes — not of the official pages, which we never fetched.`);
