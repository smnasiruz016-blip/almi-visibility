#!/usr/bin/env node
/**
 * ITEM 51 — LINK EACH DRAFTED RECOMMENDATION TO THE STORED RECORDS IT STANDS ON.
 *
 *   node bin/link-recommendation-evidence.mjs             dry run: resolve and print the links
 *   node bin/link-recommendation-evidence.mjs --confirm   append one recommendation_evidence record per recommendation
 *
 * The three recommendations were drafted on 12 September naming their findings
 * in prose ("106 URLs … Disallowed for Googlebot") but no record ids, so nothing
 * could be computed from their evidence. This writes the missing LINK — which
 * records — as its own append-only record, and never a number.
 *
 * 🔴 EACH LINK IS CHECKED AGAINST THE RECOMMENDATION'S OWN WORDS. The count its
 * finding states must equal the count of records linked, or the link is REFUSED:
 * a link that does not reproduce the finding it claims to support is a guess.
 */

import { existsSync } from "node:fs";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { scopedEntryPoint, RESOURCES } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv.slice(2), env: process.env }));
/* 🔴 GAP 2 · TESTABILITY SEAM (17 September 2026): `--store=` names a different recommendations store — the one
 * this reads its recommendations from AND links them in — CONFINED to this repository by the same confineToRepo
 * as the default, refusing before anything is read or written. It chooses WHERE, never WHETHER: the write still
 * needs --confirm. Without it, the default store, exactly as before. */
const storeArg = process.argv.slice(2).find((a) => a.startsWith("--store="))?.slice("--store=".length);
const REC_STORE = confineToRepo(storeArg ?? `${REPO}runs/audit/recommendations.jsonl`, { label: storeArg === undefined ? "the recommendations store" : "--store" });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/link-recommendation-evidence.mjs", governed: true, repoUrl: import.meta.url, resources: [RESOURCES.runArtefacts("recommendation and finding stores")] });
const read = (p) => (existsSync(`${REPO}${p}`) ? createJsonlStore(`${REPO}${p}`).readAll() : []);

const recRecords = existsSync(REC_STORE) ? createJsonlStore(REC_STORE).readAll() : [];
const recs = new Map(recRecords.filter((r) => r.record_type === "draft_recommendation").map((r) => [r.recommendation_id, r]));
const distinctIssues = (records, pred) => [...new Map(records.filter((r) => r.record_type === "issue" && pred(r)).map((r) => [r.issue_id, r])).keys()];
const crawlerRecords = read("runs/audit/crawler-classification.jsonl");

/* The basis of each link, in words, and the number in the recommendation's own finding it must reproduce. */
const LINKS = [
  {
    recommendation_id: "REC-ROBOTS-CORRIDOR",
    basis: "its finding counts URLs Disallowed for Googlebot — the robots-blocks-search-crawler issues; its evidence_source names the guidance it rests on",
    issues: distinctIssues(read("runs/audit/findings.jsonl"), (r) => r.issue_class === "robots-blocks-search-crawler"),
    observations: recRecords.filter((r) => r.record_type === "observation" && r.value?.source_id === recs.get("REC-ROBOTS-CORRIDOR")?.evidence_source).map((r) => r.observation_id),
    sources: [recs.get("REC-ROBOTS-CORRIDOR")?.evidence_source].filter(Boolean),
    stated: /(\d+) URLs/,
    linkedCount: (l) => l.issues.length,
  },
  {
    recommendation_id: "REC-NOINDEX-CV-GUIDE",
    basis: "its finding counts sampled cv-guide pages carrying noindex — the noindex issues as first raised (FAIL); the origin and premise-test observations drafted with it",
    issues: distinctIssues(read("runs/audit/technical-findings.jsonl"), (r) => r.issue_class === "noindex" && r.verdict === "FAIL"),
    observations: recRecords.filter((r) => r.record_type === "observation" && /^noindex\./.test(r.method)).map((r) => r.observation_id),
    sources: [],
    stated: /(\d+) sampled cv-guide pages/,
    linkedCount: (l) => l.issues.length,
  },
  {
    recommendation_id: "REC-AI-CRAWLER-BLOCK",
    basis: "its finding counts the user-agents blocked — the per-agent crawler classifications and the official documents they read",
    issues: [],
    observations: crawlerRecords.filter((r) => r.record_type === "observation" && r.method === "crawler.classify").map((r) => r.observation_id),
    sources: crawlerRecords.filter((r) => r.record_type === "source").map((r) => r.source_id),
    stated: /same (\d+) user-agents/,
    linkedCount: (l) => l.observations.length,
  },
];

const now = new Date().toISOString();
const out = [];
for (const l of LINKS) {
  const rec = recs.get(l.recommendation_id);
  if (!rec) throw new Error(`${l.recommendation_id} is not in the recommendations store`);
  const stated = Number(l.stated.exec(rec.finding ?? "")?.[1]);
  const linked = l.linkedCount(l);
  console.log(`${l.recommendation_id}: finding states ${stated}, linked ${linked} · issues ${l.issues.length} · observations ${l.observations.length} · sources ${l.sources.length}`);
  if (!Number.isFinite(stated) || stated !== linked) {
    console.error(`🔴 REFUSED — ${l.recommendation_id}: the link does not reproduce the count its own finding states`);
    process.exit(1);
  }
  out.push({
    record_type: "recommendation_evidence",
    recommendation_id: l.recommendation_id,
    linked_at: now,
    linked_by: "Claude (bin/link-recommendation-evidence.mjs), on beta-g's brief of 13 Sep 2026",
    basis: l.basis,
    countCheck: { stated, linked },
    issues: l.issues,
    observations: l.observations,
    sources: l.sources,
  });
}

/* Routed. The caller's OWN rule — one link per recommendation, an existing link is never re-written — still
 * decides the record set; it is applied before the governed call rather than inside the write loop, so the
 * decision is made once and audited once. Reading the store on a dry run mutates nothing. */
const store = createJsonlStore(REC_STORE);
const existing = store.readAll();
const toWrite = out.filter(
  (rec) => !existing.some((r) => r.record_type === "recommendation_evidence" && r.recommendation_id === rec.recommendation_id),
);
const RUN_INSTANT = isoSeconds(Date.now());
const governed = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
  repo: REPO, permission, store, records: toWrite, targetClass: "RUN_EVIDENCE",
  action: "LINK_RECOMMENDATION_EVIDENCE", occurredAt: RUN_INSTANT,
  correlationId: `run:link-recommendation-evidence:${RUN_INSTANT}`,
  discipline: "APPEND_WITHOUT_DEDUPE", keyOf: (r) => r.recommendation_id ?? null,
}));
if (governed.outcome === "REFUSED") {
  console.log("[dry-run] nothing written — add --confirm");
  process.exit(0);
}
if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
  console.error(`🔴 ${governed.outcome} — nothing was linked; the governed attempt is on the audit trail`);
  process.exit(1);
}
console.log(`linked ${toWrite.length} recommendation(s) in ${REC_STORE}`);
