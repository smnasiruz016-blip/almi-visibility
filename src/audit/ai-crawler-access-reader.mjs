/**
 * F55 · ONE CLIENT'S AI CRAWLER ACCESS, FROM RECORDED STRUCTURES ONLY (acceptance _handoffs 7323446, RR-93).
 *
 *   crawlers     config/blocked-crawlers.mjs — the declared list (its AI categories)
 *   pages        the client's crawl partition (declared host), each with its stored body and the URL it was served at
 *   robots       the client's robots.txt observations in the shared robots store, attributed ONLY by declared host (F21's reader)
 *   retrievals   NONE recorded and no store of them exists: [] is that recorded fact, passed EXPLICITLY
 * Nothing is fetched. Count-only output.
 */
import { BLOCKED_CRAWLERS } from "../../config/blocked-crawlers.mjs";
import { readTenantPartition, readPartitionBodies } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { clientRobots, ROBOTS_STORE } from "./indexability-reader.mjs";
import { canonicalUrl, targetPageId } from "../evidence/ids.mjs";
import { createJsonlStore } from "../evidence/store.mjs";
import { existsSync } from "node:fs";
import { declaredAiCrawlers, auditAiCrawlerAccess, summarise } from "./ai-crawler-access.mjs";

export const NO_RECORDED_RETRIEVALS = Object.freeze([]);
const originOf = (u) => { try { return new URL(u).origin; } catch { return null; } };

export function readClientAiCrawlerAccess({ tenantId, resolve, env = process.env, robotsPath = ROBOTS_STORE, declared = BLOCKED_CRAWLERS, retrievals = NO_RECORDED_RETRIEVALS }) {
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId, resolve, env });
  const bodies = readPartitionBodies({ batchId: BATCH_ID, observationIds: part.observationIds, env });
  const pages = part.records.filter((r) => r.record_type === "observation" && bodies.has(r.observation_id)).map((o) => {
    const url = o.value?.final_url ?? o.value?.requested_url ?? null;
    let pageId = null;
    try { pageId = targetPageId(canonicalUrl(url)); } catch { /* an unparseable URL has no page id */ }
    return { pageId, url, html: bodies.get(o.observation_id) };
  }).filter((p) => p.pageId && p.url);
  const robots = clientRobots({ tenantId, resolve, path: robotsPath });
  /* the most recent recorded robots.txt for the page's own origin — another origin's (or client's) never decides */
  const byOrigin = new Map();
  for (const r of robots.records) {
    const o = originOf(r.value?.url);
    if (!o) continue;
    const cur = byOrigin.get(o);
    if (!cur || Date.parse(r.observed_at) > Date.parse(cur.observed_at)) byOrigin.set(o, r);
  }
  const storeTotal = existsSync(robotsPath) ? createJsonlStore(robotsPath).readAll().filter((r) => r.record_type === "observation").length : 0;
  const crawlers = declaredAiCrawlers(declared);
  const audit = auditAiCrawlerAccess({ crawlers, robotsFor: (url) => byOrigin.get(originOf(url)) ?? null, pages, retrievals });
  return {
    audit,
    summary: audit.verdict === "AUDITED" ? summarise(audit) : null,
    pageOrigins: [...new Set(pages.map((p) => originOf(p.url)).filter(Boolean))], // for tests; never printed
    bound: `recorded data only · ${crawlers.length} declared AI crawler(s) · ${pages.length} page(s) · robots.txt records this client ${robots.records.length} of ${storeTotal} in the shared store (on no declared host: ${robots.rejected}; the rest are other clients', never read here) · recorded retrievals ${retrievals.length} · X-Robots-Tag not recorded · nothing fetched`,
  };
}
