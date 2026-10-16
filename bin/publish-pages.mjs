#!/usr/bin/env node
/**
 * RR-271 · THE BUILT PAGES RECORDED AS LIVE, once the owner has GREENed their publication and they stand on the client's site.
 *
 *   node bin/publish-pages.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --published=published-pages-YYYY-MM-DD.json
 *        --tenant=<id> --actor=<id> [--confirm]
 *
 * Its input is a filed list of the batch's own (published-pages-YYYY-MM-DD.json): the owner's decision record that GREENed the publication
 * and, for each page, its address. Nothing is fetched and nothing is deployed here — the page reached the site through the client's own
 * repository; whether it is served as built is measured from its address by the live checks and F23's bounded link check (bin/link-status.mjs).
 * For each listed page, from the batch's stored builds only:
 *   the page's LATEST build is the one published (src/page/publish-page.mjs publishedHtml: its noindex line a canonical link to its own
 *   address, its two stamps out, nothing else changed); its address must be https on a host the client declares, and end in the page's own
 *   recorded H1 phrase; a page already recorded as published, or not built, is named and not recorded again.
 * With --confirm each is appended to the batch's joined-pages.jsonl as the build's record again, saying where and when it was published,
 * with the sha256 of the published page (publishedRecord) — a page so recorded is PUBLISHED, and F10 never cancels or changes it.
 * Without --confirm nothing is written. Counts only are printed.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES, declaredSiteHosts } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { JOINED_RECORD } from "../src/page/joined-page.mjs";
import { publishedRecord, slugOf, PUBLISH_REFUSE } from "../src/page/publish-page.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on"), LIST = arg("published");
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "") || !/^published-pages-\d{4}-\d{2}-\d{2}\.json$/.test(LIST ?? "")) { console.error("usage: node bin/publish-pages.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --published=published-pages-YYYY-MM-DD.json [--confirm] — nothing read, nothing written"); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/publish-pages.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
if (!existsSync(join(batchDir, LIST))) { console.error("🔴 REFUSED — PUBLISHED_LIST_ABSENT: the batch holds no such list; nothing written"); process.exit(3); }
let listed;
try { listed = JSON.parse(readFileSync(join(batchDir, LIST), "utf8")); } catch { listed = null; }
const decision = typeof listed?.decision === "string" && /^_handoffs:\S+\.md$/.test(listed.decision) ? listed.decision : null;
if (!decision || !Array.isArray(listed?.pages) || listed.pages.length === 0) { console.error("🔴 REFUSED — PUBLISHED_LIST_UNREADABLE: the list names no owner decision record (_handoffs:<file>.md) or no page; nothing written"); process.exit(3); }

const hosts = declaredSiteHosts({ tenantId: SCOPE.tenantId });
const builds = existsSync(join(batchDir, "joined-pages.jsonl")) ? createJsonlStore(join(batchDir, "joined-pages.jsonl")).readAll() : [];
const latest = new Map(builds.filter((r) => r?.record_type === JOINED_RECORD).map((r) => [r.value, r]));
const out = [], refused = [];
for (const { page, url } of listed.pages) {
  const r = latest.get(page);
  if (!r) { refused.push(`${page}: ${PUBLISH_REFUSE.NO_BUILD}`); continue; }
  if (typeof r.publishedUrl === "string") { refused.push(`${page}: ALREADY_PUBLISHED at ${r.publishedUrl}`); continue; }
  let u = null; try { u = new URL(url); } catch { /* no address */ }
  if (!u || !hosts.includes(u.hostname)) { refused.push(`${page}: NOT_ON_A_DECLARED_HOST`); continue; }
  if (!present(slugOf(r)) || !u.pathname.endsWith(`/${slugOf(r)}`)) { refused.push(`${page}: ADDRESS_IS_NOT_THE_PAGES_OWN (its H1 phrase gives ${slugOf(r)})`); continue; }
  const rec = publishedRecord(r, { url, on: ON });
  if (rec.state === "REFUSED") { refused.push(`${page}: ${rec.reason}`); continue; }
  out.push({ ...rec, publishedBy: { decision }, recorded_at: `${ON}T00:00:00Z` });
}
function present(v) { return typeof v === "string" && v.trim() !== ""; }
console.log("RR-271 · BUILT PAGES RECORDED AS LIVE · counts only");
console.log(`  listed           ${listed.pages.length} page(s) · decision ${decision} · declared site host(s) ${hosts.length}`);
console.log(`  to record        ${out.length} page(s) PUBLISHED on ${ON}`);
for (const r of refused) console.log(`  not recorded     ${r}`);
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: nothing recorded"); process.exit(refused.length ? 3 : 0); }
if (refused.length) { console.error(`🔴 REFUSED — ${refused.length} listed page(s) cannot be recorded; nothing written`); process.exit(3); }
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, "joined-pages.jsonl")), records: out,
  targetClass: "GENERATED_CONFIG", action: "APPEND_PUBLISHED_PAGES", occurredAt: instant, correlationId: `run:publish-pages:${instant}`, discipline: "APPEND_IF_NEW" }));
if (!(g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED")) { console.error(`  🔴 ${g.outcome} — the publication records did NOT persist`); process.exit(1); }
console.log(`  kept             ${out.length} page(s) recorded as PUBLISHED in the batch's joined-pages store (${g.outcome})`);
process.exit(0);
