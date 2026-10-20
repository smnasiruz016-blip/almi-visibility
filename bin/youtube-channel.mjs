#!/usr/bin/env node
/**
 * RR-302 C1 · THE CLIENT'S OWN YOUTUBE CHANNEL, THROUGH ITS OWN CONNECTOR (src/video/youtube.mjs).
 *
 *   node bin/youtube-channel.mjs --subject=<id> --channel=<UC… id | @handle> --on=YYYY-MM-DD [--product-url=<the product page>] [--live --confirm]
 *
 * A live run opens the subject's declared YOUTUBE_DATA_API connector (F03: only on the run's decision; it reaches only the API's declared
 * origin, paced) and reads the channel's videos with the key named by that declaration — read once, handed straight in, never printed.
 * It prints the channel check and the monthly report's YouTube lines. No youtube.com page is read. Raw data is held in memory only and
 * never written (the owner's rule: raw data never in git); the run's cost is recorded in the tenant's own ledger (F78).
 * Without --live: the plan only, no request. With no key: DEFERRED, named — the key is the only thing missing.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { openConnector } from "../src/tenancy/connectors.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { youtubeReaderFrom, channelCheck, youtubeForReport, YOUTUBE_CONNECTOR_KIND } from "../src/video/youtube.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const KIND = YOUTUBE_CONNECTOR_KIND;
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), CHANNEL = arg("channel"), ON = arg("on"), PRODUCT_URL = arg("product-url");
if (!SUBJECT || !/^(UC[\w-]{10,}|@[\w.-]{3,})$/.test(CHANNEL ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "") || (PRODUCT_URL !== null && !/^https:\/\//.test(PRODUCT_URL))) {
  console.error("usage: node bin/youtube-channel.mjs --subject=<id> --channel=<UC… id | @handle> --on=YYYY-MM-DD [--product-url=https://…] [--live --confirm] — nothing read, no request");
  process.exit(2);
}
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const live = process.argv.includes("--live");
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/youtube-channel.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), ...(live ? [RESOURCES.connector(SUBJECT, KIND), RESOURCES.costLedger(ownLedgerRef())] : [])] });
/* F78: a run that opens a connector records its cost — constructed right after the scope gate */
const RUN_COST = live ? runCost({ entryPoint: "bin/youtube-channel.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;

console.log("YOUTUBE · THE CLIENT'S OWN CHANNEL — through its own YouTube Data API connector · counts only");
console.log(`  channel          ${CHANNEL} · read on ${ON} · the API only (videos list, never a youtube.com page) · at most 3 requests`);
if (!live) { console.log("  NOT RUN — no --live: the plan only; no request was made and nothing was written"); process.exit(0); }

const CONNECTOR = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }));
const api = youtubeReaderFrom(CONNECTOR);
if (api.state !== "READY") { console.log(`  ${api.why}`); process.exit(api.state === "DEFERRED" ? 0 : 3); }
const videos = await api.channelVideos(CHANNEL);
const read = Object.freeze({ ok: true, source: "YOUTUBE_DATA_API", importedOn: ON, videos });
const check = channelCheck(videos, { productUrl: PRODUCT_URL });
console.log(`  videos           ${videos.length} read through the API`);
for (const line of youtubeForReport(read, check).lines) console.log(`  ${line}`);
console.log(`  kept             nothing — raw channel data is never written (the run's cost is in the tenant's ledger)`);
