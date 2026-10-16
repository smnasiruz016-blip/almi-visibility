#!/usr/bin/env node
/**
 * RR-273 · THE GUIDES HUB, built by the engine from the client's LIVE pages, and recorded as LIVE once it stands on the client's site.
 *
 *   node bin/guides-hub.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --url=<hub address> --title-phrase=<phraseId>
 *        --tenant=<id> --actor=<id> [--confirm]
 *   node bin/guides-hub.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --url=<hub address> --record-live
 *        --decision=_handoffs:<file>.md --tenant=<id> --actor=<id> [--confirm]
 *
 * BUILD: from the batch's stored builds only — every page whose latest published record stands on a host the client declares, in stored
 * order — the hub of src/page/guides-hub.mjs: each page's own H1 and two-line intro, the guides' own style, header and footer, a title
 * composed by the Title Law from the ONE recorded search phrase named (the batch's search-phrases.json), every check PASS. The hub's
 * address must be https on a declared host. With --confirm the hub is appended to the batch's guides-hub.jsonl as BUILT.
 * RECORD LIVE: the latest BUILT hub at that address is appended again, saying where and when it was published and by whose decision —
 * once. Nothing is fetched and nothing is deployed here: the hub reaches the site through the client's own repository, and whether it is
 * served as built is measured from its address. Without --confirm nothing is written. Counts only are printed.
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
import { HUB_RECORD, hubEntries, designOf, hubTitle, hubChecks, hubRecord, publishedHubRecord } from "../src/page/guides-hub.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on"), URL_ = arg("url"), PHRASE = arg("title-phrase"), DECISION = arg("decision");
const LIVE = process.argv.includes("--record-live");
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "") || !URL_ || (LIVE ? !DECISION : !PHRASE)) { console.error("usage: node bin/guides-hub.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --url=<hub address> (--title-phrase=<phraseId> | --record-live --decision=_handoffs:<file>.md) [--confirm] — nothing read, nothing written"); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/guides-hub.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
const rows = (name) => (existsSync(join(batchDir, name)) ? createJsonlStore(join(batchDir, name)).readAll() : []);
const hosts = declaredSiteHosts({ tenantId: SCOPE.tenantId });
let hubHost = null; try { const u = new URL(URL_); hubHost = u.protocol === "https:" && u.href === URL_ ? u.hostname : null; } catch { /* no address */ }
if (!hubHost || !hosts.includes(hubHost)) { console.error("🔴 REFUSED — HUB_NOT_ON_A_DECLARED_HOST: the hub's address is not https on a host this client declares; nothing written"); process.exit(3); }

const hubs = rows("guides-hub.jsonl").filter((r) => r?.record_type === HUB_RECORD && r.url === URL_);
let out;
console.log(`RR-273 · THE GUIDES HUB · ${LIVE ? "RECORDED AS LIVE" : "BUILT"} · counts only`);
if (LIVE) {
  const latest = hubs.at(-1) ?? null;
  if (!latest) { console.error("🔴 REFUSED — NO_HUB_BUILT: the batch holds no hub built at this address; nothing written"); process.exit(3); }
  if (typeof latest.publishedUrl === "string") { console.error(`🔴 REFUSED — ALREADY_PUBLISHED on ${latest.publishedOn}; nothing written`); process.exit(3); }
  out = publishedHubRecord(latest, { on: ON, decision: DECISION });
  if (out.state === "REFUSED") { console.error(`🔴 REFUSED — ${out.reason}; nothing written`); process.exit(3); }
  console.log(`  hub              ${out.entries.length} guide(s) listed · sha256 ${out.sha256.slice(0, 12)} · decision ${DECISION}`);
} else {
  /* the LIVE pages: each page's latest published record, on a declared host, in stored order */
  const live = [...new Map(rows("joined-pages.jsonl").filter((r) => r?.record_type === JOINED_RECORD && typeof r.publishedUrl === "string").map((r) => [r.value, r])).values()];
  const onHost = live.filter((r) => { try { return hosts.includes(new URL(r.publishedUrl).hostname); } catch { return false; } });
  const listed = hubEntries(onHost);
  if (listed.state === "REFUSED") { console.error(`🔴 REFUSED — ${listed.reason} ${listed.detail ?? ""}; nothing written`); process.exit(3); }
  const design = designOf(onHost);
  if (design.state === "REFUSED") { console.error(`🔴 REFUSED — ${design.reason}; nothing written`); process.exit(3); }
  let phrases = [];
  try { phrases = JSON.parse(readFileSync(join(batchDir, "search-phrases.json"), "utf8")); } catch { phrases = []; }
  const title = hubTitle({ phrase: (Array.isArray(phrases) ? phrases : []).find((p) => p?.phraseId === PHRASE), entries: listed.entries });
  if (title.state === "REFUSED") { console.error(`🔴 REFUSED — ${title.reason}: no recorded search phrase ${PHRASE} composes a title; nothing written`); process.exit(3); }
  out = hubRecord({ entries: listed.entries, design, title: title.title, trace: title.trace, url: URL_, subject: SUBJECT, assets: onHost[0].assets ?? [], on: ON });
  if (out.state === "REFUSED") { console.error(`🔴 REFUSED — ${out.reason}; nothing written`); process.exit(3); }
  const fails = Object.entries(hubChecks({ html: out.html, entries: listed.entries, design, title: title.title, url: URL_ })).filter(([, v]) => v.state !== "PASS").map(([k]) => k);
  console.log(`  live pages       ${live.length} · on a declared host ${onHost.length} · listed ${listed.entries.length}`);
  console.log(`  title            composed from recorded search phrase ${PHRASE} (${title.trace.length} part)`);
  console.log(`  checks           ${fails.length === 0 ? "every check PASS" : `FAIL ${fails.join(", ")}`} · sha256 ${out.sha256.slice(0, 12)}`);
  if (fails.length) { console.error("🔴 REFUSED — HUB_CHECK_FAILS; nothing written"); process.exit(3); }
  if (hubs.some((h) => h.sha256 === out.sha256 && typeof h.publishedUrl !== "string")) console.log("  the same hub is already recorded as built — appended only if new");
}
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: nothing recorded"); process.exit(0); }
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, "guides-hub.jsonl")), records: [out],
  targetClass: "GENERATED_CONFIG", action: "APPEND_GUIDES_HUB", occurredAt: instant, correlationId: `run:guides-hub:${instant}`, discipline: "APPEND_IF_NEW" }));
if (!(g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED")) { console.error(`  🔴 ${g.outcome} — the hub record did NOT persist`); process.exit(1); }
console.log(`  kept             the hub recorded as ${LIVE ? "LIVE" : "BUILT"} in the batch's guides-hub store (${g.outcome})`);
process.exit(0);
