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
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv.slice(2), env: process.env }));
const REC_STORE = confineToRepo(`${REPO}runs/audit/recommendations.jsonl`, { label: "the recommendations store" });
const read = (p) => (existsSync(`${REPO}${p}`) ? createJsonlStore(`${REPO}${p}`).readAll() : []);

const recRecords = read("runs/audit/recommendations.jsonl");
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

if (!permission.mayWrite) {
  console.log("[dry-run] nothing written — add --confirm");
  process.exit(0);
}
const store = createJsonlStore(REC_STORE);
let written = 0;
for (const rec of out) {
  // Declared: one link per recommendation; an existing link for the same recommendation is never re-written.
  if (store.readAll().some((r) => r.record_type === "recommendation_evidence" && r.recommendation_id === rec.recommendation_id)) continue;
  store.appendWithoutDedupe(rec);
  written += 1;
}
console.log(`linked ${written} recommendation(s) in ${REC_STORE}`);
