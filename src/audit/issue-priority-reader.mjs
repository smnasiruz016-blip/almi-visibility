/**
 * F29 · ONE CLIENT'S RECORDED ISSUES, RANKED (acceptance _handoffs c8eee0c, RR-96).
 *
 *   issues        runs/audit/findings.jsonl — an issue is this client's only when its target page is in the client's OWN crawl partition
 *   reach         the client's own recorded owned Search Console page rows (F43's reader: declared host, then own pages), with the window
 *   severity      recorded on the issue · evidence: the count of its recorded evidence entries · effort, reversibility: recorded or none
 * Nothing is fetched or written. Count-only output.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJsonlStore } from "../evidence/store.mjs";
import { readTenantPartition } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { clientPerformance } from "../page/content-decay-evidence.mjs";
import { rankIssues } from "./issue-priority.mjs";

export const FINDINGS_STORE = fileURLToPath(new URL("../../runs/audit/findings.jsonl", import.meta.url));

export function clientPageIds({ tenantId, resolve, env = process.env }) {
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId, resolve, env });
  return new Set(part.records.map((r) => r.target_page_id ?? r.page_id).filter(Boolean));
}

export function readClientIssuePriority({ tenantId, resolve, env = process.env, path = FINDINGS_STORE }) {
  const all = existsSync(path) ? createJsonlStore(path).readAll().filter((r) => r.record_type === "issue" && r.state === "OPEN") : [];
  const pages = clientPageIds({ tenantId, resolve, env });
  const mine = all.filter((i) => pages.has(i.target_page_id));
  const perf = mine.length ? clientPerformance({ tenantId, resolve, pageIds: new Set(mine.map((i) => i.target_page_id)) }) : { byPage: new Map(), window: null };
  const issues = mine.map((i) => {
    const p = perf.byPage.get(i.target_page_id) ?? null;
    return {
      id: i.issue_id,
      issueClass: i.issue_class,
      evidence: Array.isArray(i.evidence) ? i.evidence.length : null,
      reach: p ? p.impressions : null,
      reachWindow: p ? `${p.windowStart}..${p.windowEnd}` : null,
      severity: i.severity ?? null,
      effort: typeof i.effort === "number" ? i.effort : null,
      reversibility: typeof i.reversibility === "number" ? i.reversibility : null,
    };
  });
  const r = rankIssues(issues);
  return { ranking: r, openInStore: all.length, bound: `recorded data only · ${all.length} open issue(s) in the findings store · ${mine.length} in this client's own partition · reach window ${r.windows.join(", ") || "none"} · effort and reversibility recorded for ${issues.filter((x) => x.effort !== null || x.reversibility !== null).length} · nothing fetched, nothing changed` };
}
