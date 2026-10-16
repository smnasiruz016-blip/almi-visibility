#!/usr/bin/env node
/**
 * F44 · THE SOURCE READER'S RECHECK of the facts one research batch's pages use (F44 Acceptance Amendment 2, C7–C11; the owner's GREEN of
 * 15 October 2026, RR-268 §B3, for this recheck and nothing wider).
 *
 *   node bin/source-facts.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --tenant=<id> --actor=<id> [--live --confirm]
 *
 * WITHOUT --live: the plan is printed (counts only) and NO request is made. --live without --confirm opens nothing that can request
 * (F78: the metered connector refuses before any request when the run cannot record its cost). WITH both: each distinct source the facts
 * cite is read ONCE through the engine's one paced path (src/tenancy/connectors.mjs — at least 2 s per host; robots first, through the same
 * path), and NO request at all when the sources and their hosts' robots files outnumber the bound. A source the engine is refused, challenged
 * or handed an empty page by goes to the client's own browser route only when the client has connected and started one — none is declared
 * here, so it is BLOCKED with its URL and reason. Each fact is then CURRENT, CHANGED, BLOCKED or REJECTED (src/facts/source-reader.mjs);
 * a CHANGED fact flags every page that uses it for rebuild; no stored fact is rewritten. Written, through the governed boundary, into the
 * batch's own stores: every read (source-reads.jsonl — its sha256, URL and read date; RR-274: the page text itself only in the PRIVATE sources
 * root, src/facts/private-texts.mjs, at this batch's path there — the public store holds text null) and every recheck
 * (fact-rechecks.jsonl). The connector is the client's declared CITED_SOURCES connector, and it must reach this batch. Counts only are printed.
 *
 *   node bin/source-facts.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --extract=fact-proposals-YYYY-MM-DD.json --tenant=<id> --actor=<id> [--confirm]
 *
 * RR-268 C · C9 + C10 on the stored texts: the batch's filed proposals (one sentence, one source, one quotation each, from the client's own AI,
 * named by its route in the file) are each judged by extractFacts against the STORED text of their source's latest read — no connector is
 * opened and no request is made. Each is ADMITTED (the fact it names re-admitted on its own source, or a new fact for a need) or REJECTED
 * with its reason; every fact the stored recheck left REJECTED is counted RE-ADMITTED or STILL REJECTED, named. With --confirm the verdicts
 * are appended to fact-extractions.jsonl and the run's one cost entry names the route: NOT METERED (the owner's own subscription, no
 * paid-provider call). Without --confirm nothing is written.
 *
 *   node bin/source-facts.mjs ... --import=browser-captures-YYYY-MM-DD|client-files --tenant=<id> --actor=<id> [--confirm]
 *
 * RR-269 §1/§2 · the client's own reads filed in the batch: pages a person read in the client's browser (VIA CAPTURE — the engine drove no
 * route, so they never count as a C8 read) and documents the client supplied (CLIENT_FILE, with the original URL, the day supplied and,
 * when the client says so, OUT_OF_DATE — never a source a fact stands on). No connector is opened. Every fact whose source is imported is
 * rechecked against that text. --confirm keeps the reads and the rechecks.
 *
 *   node bin/source-facts.mjs ... --live --read-list=read-list-YYYY-MM-DD.json --tenant=<id> --actor=<id> --confirm
 *
 * RR-269 §2 · the live read of the sources a filed list names and of no other (a PDF is read by the PDF reader: its text, or
 * NOT_A_TEXT_DOCUMENT when it shows none); the facts that cite them are rechecked.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { privateSourcesRoot, publicCopy, withPrivateTexts } from "../src/facts/private-texts.mjs";
import { performance } from "node:perf_hooks";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupConnector } from "../src/tenancy/root-registry.mjs";
import { openConnector, pacingRecord } from "../src/tenancy/connectors.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { batchFacts } from "../src/facts/batch-facts.mjs";
import { readSource, robotsOn, recheckFacts, recheckCounts, readRecord, recheckRecord, hostOf, SOURCE_READ, READ_STATE, RECHECK, extractFacts, extractionRecord, EXTRACTION, captureRead, clientFileRead, CURRENCY } from "../src/facts/source-reader.mjs";
import { makeCostEntry } from "../src/cost/ledger.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const KIND = "CITED_SOURCES";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on");
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) { console.error("usage: node bin/source-facts.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--live --confirm] — nothing read, no request, nothing written"); process.exit(2); }
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const live = process.argv.includes("--live");
/* RR-268 C: the extraction of facts from the stored texts — a filed proposals file of this batch, never a path outside it */
const EXTRACT = arg("extract");
if (EXTRACT !== null && (live || !/^fact-proposals-\d{4}-\d{2}-\d{2}(-\d{1,2})?\.json$/.test(EXTRACT))) { console.error("usage: --extract=fact-proposals-YYYY-MM-DD[-N].json names the batch's own proposals file and never runs with --live — nothing read, no request, nothing written"); process.exit(2); }
/* RR-269 §1/§2: the import of the client's own reads filed in this batch — browser captures and supplied files; no request, no route */
const IMPORT = arg("import");
if (IMPORT !== null && (live || EXTRACT !== null || !/^(browser-captures-\d{4}-\d{2}-\d{2}|client-files)$/.test(IMPORT))) { console.error("usage: --import=browser-captures-YYYY-MM-DD|client-files names a folder of the batch's own and never runs with --live or --extract — nothing read, no request, nothing written"); process.exit(2); }
/* RR-269 §2: a live read of the sources a filed list names, and of no other — the facts that cite them are rechecked */
const READ_LIST = arg("read-list");
if (READ_LIST !== null && (!live || !/^read-list-\d{4}-\d{2}-\d{2}(-\d{1,2})?\.json$/.test(READ_LIST))) { console.error("usage: --read-list=read-list-YYYY-MM-DD[-N].json names the batch's own list and runs only with --live — nothing read, no request, nothing written"); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/source-facts.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), ...(live ? [RESOURCES.connector(SUBJECT, KIND), RESOURCES.costLedger(ownLedgerRef())] : EXTRACT && permission.mayWrite ? [RESOURCES.costLedger(ownLedgerRef())] : [])] });
/* F78: a run that opens a connector records its cost — constructed right after the scope gate */
const RUN_COST = live || (EXTRACT && permission.mayWrite) ? runCost({ entryPoint: "bin/source-facts.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}; no request was made`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store; no request was made"); process.exit(3); }
const json = (f) => { try { return JSON.parse(readFileSync(join(batchDir, f), "utf8")); } catch { return null; } };
/* RR-274: a page text of another organisation is kept PRIVATELY (src/facts/private-texts.mjs), at this batch's own path under the private
 * sources root — the public batch keeps its URL, read date and sha256 only. A run that would keep a text refuses without that root. */
const PRIVATE = privateSourcesRoot(process.env);
/* bound on a line that names the RESEARCH store: these are THIS research batch's own texts, decided by RESOURCES.researchBatch above */
const privateBatchDir = join(PRIVATE.dir, relative(lookupStore(index, "RESEARCH").rootPath, batchDir));
const privateRows = (f) => { try { return readFileSync(join(privateBatchDir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
/* RR-274: one governed append into the PRIVATE sources root — the full texts, at this batch's own path there */
const appendPrivate = (records, file, instant) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: PRIVATE.dir, auditRepo: REPO, permission, store: createJsonlStore(join(privateBatchDir, file)), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_SOURCE_FACTS", occurredAt: instant, correlationId: `run:source-facts:private:${file}:${instant}`, discipline: "APPEND_IF_NEW" }));
const refuseWithoutPrivate = (what) => { if (PRIVATE.state !== "DECLARED") { console.error(`🔴 REFUSED — PRIVATE_SOURCES_ABSENT: ${what} keeps page texts, and the private sources root is not here (config/private-sources.mjs). NO REQUEST WAS MADE AND NOTHING WAS WRITTEN.`); process.exit(3); } };
/* the batch's fact registry: the one file it files as facts-registry-<day>.json — none, or more than one, refuses */
const registries = readdirSync(batchDir).filter((f) => /^facts-registry-\d{4}-\d{2}-\d{2}\.json$/.test(f));
if (registries.length !== 1) { console.error(`🔴 REFUSED — FACT_REGISTRY_NOT_ONE: the batch files ${registries.length} fact registries; no request was made`); process.exit(3); }
const drafts = json("page-drafts.json"), findings = json("findings.json"), registry = json(registries[0]), intervals = json("recheck-intervals.json");
if (!Array.isArray(drafts?.pages) || !Array.isArray(findings) || !Array.isArray(registry?.facts)) { console.error("🔴 REFUSED — INTAKE_FILE_UNREADABLE: page-drafts.json, findings.json or the fact registry is not readable in the batch; no request was made"); process.exit(3); }
const facts = batchFacts({ drafts, findings, registry, intervals: Array.isArray(intervals) ? intervals : [] });
/* RR-269 §2: a filed read list names the sources of this run — none outside it is read; a list that is not readable refuses */
const listed = READ_LIST ? json(READ_LIST) : null;
if (READ_LIST && !(Array.isArray(listed?.sources) && listed.sources.length > 0 && listed.sources.every((u) => /^https?:\/\/\S+$/.test(String(u))))) { console.error("🔴 REFUSED — READ_LIST_UNREADABLE: the batch's read list names no readable source URLs; no request was made"); process.exit(3); }
const rechecked = listed ? facts.filter((f) => listed.sources.includes(f.link)) : facts;
const checkable = rechecked.filter((f) => f.quotations.length > 0 && f.link);
/* every distinct source a fact cites is read — a fact with no quotation still has its source's text kept for a later extraction */
const urls = listed ? [...new Set(listed.sources)].sort() : [...new Set(facts.map((f) => f.link).filter(Boolean))].sort();
const hosts = [...new Set(urls.map(hostOf))].sort();
const t0 = performance.now();
if (EXTRACT) await extractRun();
if (IMPORT) await importRun();

console.log("F44 · SOURCE READER — the recheck of the facts this batch's pages use · counts only");
if (listed) console.log(`  read list        ${READ_LIST}: ${urls.length} source(s) named — no other source is read · facts citing them ${rechecked.length}`);
console.log(`  facts            ${facts.length} (registry ${facts.filter((f) => !f.factId.startsWith("claim:")).length} · claims naming no registry record ${facts.filter((f) => f.factId.startsWith("claim:")).length}) · with a recorded word-for-word quotation ${checkable.length} of ${facts.length} · used on ${new Set(facts.flatMap((f) => f.pages)).size} page(s)`);
console.log(`  plan             ${urls.length} distinct source(s) on ${hosts.length} host(s) · requests needed at most ${urls.length + hosts.length} (each source once, each host's robots file once)`);
console.log(`  bound            at most ${SOURCE_READ.maxRequests} request(s) in this run · the one paced path (at least 2 s between two requests to one host) · robots respected · a plain public request; nothing typed, no login`);
/* no request at all when the plan outnumbers the bound — decided before the connector is opened */
if (urls.length + hosts.length > SOURCE_READ.maxRequests) { console.error(`🔴 REFUSED — OVER_THE_BOUND: ${urls.length + hosts.length} request(s) against a bound of ${SOURCE_READ.maxRequests}. NO REQUEST WAS MADE.`); process.exit(3); }
if (!live) { console.log("  NOT RUN — no --live: the plan only; no request was made and nothing was written"); process.exit(0); }
/* the declared connector must reach THIS batch: a connector declared for another store is not this run's */
const declared = lookupConnector(index, SUBJECT, KIND);
if (declared.state !== "DECLARED" || !(declared.connector.reaches ?? []).some((x) => x.resourceKind === "RESEARCH_BATCH" && x.resourceRef === BATCH)) { console.error("🔴 REFUSED — CITED_SOURCES_CONNECTOR_DOES_NOT_REACH_THIS_BATCH: the client declares no such connector for this batch. NO REQUEST WAS MADE."); process.exit(3); }

refuseWithoutPrivate("a live read");
const CONNECTOR = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }));
const before = pacingRecord();
const robots = robotsOn(CONNECTOR.fetch);
/* the client's own browser route: none is declared for this client — a blocked read is BLOCKED with its URL, never retried by the engine */
const state = { engineReads: 0, reads: 0, stopped: null };
const reads = new Map();
for (const url of urls) reads.set(url, await readSource(url, { fetchImpl: CONNECTOR.fetch, robots, route: null, state, on: ON, maxReads: SOURCE_READ.maxRequests, requestsMade: () => pacingRecord().released - before.released }));
const results = await recheckFacts({ facts: rechecked, readOf: async (u) => reads.get(u), on: ON });
const counts = recheckCounts(results);
const paced = pacingRecord();
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const runId = `source-facts:${instant}`;
const tally = (xs, key) => Object.entries(xs.reduce((m, x) => ((m[x[key] ?? "-"] = (m[x[key] ?? "-"] ?? 0) + 1), m), {})).sort().map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log(`  requests         ${paced.released - before.released} released through the paced path (robots ${robots.requestsIssued()} · sources ${state.engineReads}) of a bound of ${SOURCE_READ.maxRequests} · waited ${paced.waited - before.waited} time(s), ${Math.round((paced.waitedMs - before.waitedMs) / 1000)} s in all`);
console.log(`  sources          ${urls.length}: ${tally([...reads.values()], "state")} · blocked by reason: ${tally([...reads.values()].filter((r) => r.state === READ_STATE.BLOCKED), "reason")} · browser route used ${state.reads}`);
{ const pdfs = [...reads.values()].filter((r) => r.document === "PDF"); console.log(`  PDF documents    ${pdfs.length}: text read ${pdfs.filter((r) => r.state === READ_STATE.READ).length} · NOT_A_TEXT_DOCUMENT ${pdfs.filter((r) => r.state !== READ_STATE.READ).length}`); }
console.log(`  recheck          ${counts.facts} fact(s): ${Object.entries(counts.byState).map(([k, n]) => `${k} ${n}`).join(" · ")} · due by their own interval ${results.filter((r) => r.due === true).length}`);
for (const [h, s] of Object.entries(counts.byHost).sort()) console.log(`    ${h.padEnd(28)} ${Object.entries(s).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log(`  pages flagged    ${counts.pagesFlagged.length} for rebuild (a CHANGED fact flags every page that uses it)${counts.pagesFlagged.length ? `: ${counts.pagesFlagged.join(", ")}` : ""}`);

const append = (records, file) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, file)), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_SOURCE_FACTS", occurredAt: instant, correlationId: `run:source-facts:${file}:${instant}`, discipline: "APPEND_IF_NEW" }));
const kept = (g) => g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED";
/* RR-274: the full read first, privately; then its public copy (no text) — a public record never names a text that is not kept */
const fullReads = [...reads.values()].map((r) => readRecord({ read: r, tenantId: SCOPE.tenantId, on: ON, run: runId }));
const gp = appendPrivate(fullReads, "source-reads.jsonl", instant);
if (!kept(gp)) { console.error(`  🔴 ${gp.outcome} — the texts did NOT persist privately; nothing public was written`); process.exit(1); }
const g = append(fullReads.map(publicCopy), "source-reads.jsonl");
if (!kept(g)) { console.error(`  🔴 ${g.outcome} — the reads did NOT persist`); process.exit(1); }
const h = append(results.map((r) => recheckRecord({ result: r, tenantId: SCOPE.tenantId, on: ON, run: runId })), "fact-rechecks.jsonl");
if (!kept(h)) { console.error(`  🔴 ${h.outcome} — the rechecks did NOT persist`); process.exit(1); }
console.log(`  kept             ${reads.size} read(s) in the batch's source-reads store · ${results.length} recheck(s) in its fact-rechecks store · ${Math.round((performance.now() - t0) / 1000)} s`);

/**
 * RR-269 §1/§2 · the client's own reads, filed in this batch, imported — no connector, no request, no route driven. A browser capture
 * (VIA CAPTURE) says its URL, read date and route in its first lines; a supplied file is named in the folder's manifest.json with its
 * original URL, the day it was supplied and, when the client says so, that it is out of date. Each is kept privately in source-reads with
 * its hash, URL and read date; every fact whose source is imported is rechecked against that text (CURRENT or CHANGED, the stored fact
 * untouched). With --confirm both are appended; without it nothing is written.
 */
function importRun() {
  /* RR-274: the client's captures and files are other organisations' texts — filed in the PRIVATE batch folder, never the public one */
  refuseWithoutPrivate("an import");
  if (!existsSync(join(privateBatchDir, IMPORT))) { console.error(`🔴 REFUSED — IMPORT_FOLDER_ABSENT: the batch files no folder ${IMPORT}; nothing written`); process.exit(3); }
  const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const run = `source-facts:import:${instant}`;
  const got = [], refused = [];
  if (IMPORT === "client-files") {
    const manifest = (() => { try { return JSON.parse(readFileSync(join(privateBatchDir, IMPORT, "manifest.json"), "utf8")); } catch { return null; } })();
    if (!Array.isArray(manifest?.files)) { console.error("🔴 REFUSED — CLIENT_FILES_MANIFEST_UNREADABLE: client-files/manifest.json names no files; nothing written"); process.exit(3); }
    for (const m of manifest.files) {
      if (typeof m?.file !== "string" || m.file.includes("/") || m.file.includes("\\") || !/^https?:\/\//.test(m?.url ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(m?.suppliedOn ?? "") || !existsSync(join(privateBatchDir, IMPORT, m.file))) { refused.push({ file: m?.file ?? "(none)", reason: "CLIENT_FILE_NOT_NAMED_WITH_URL_AND_DAY" }); continue; }
      got.push(clientFileRead({ bytes: readFileSync(join(privateBatchDir, IMPORT, m.file)), file: `${IMPORT}/${m.file}`, url: m.url, suppliedOn: m.suppliedOn, outOfDate: m.outOfDate ?? null }));
    }
  } else {
    for (const f of readdirSync(join(privateBatchDir, IMPORT)).filter((x) => x.endsWith(".txt")).sort()) {
      const r = captureRead({ raw: readFileSync(join(privateBatchDir, IMPORT, f), "utf8"), file: `${IMPORT}/${f}` });
      (r.state === "REFUSED" ? refused : got).push(r);
    }
  }
  /* a document the client says is out of date is kept as a record, and is no source a fact is rechecked against */
  const imported = new Map(got.filter((r) => r.state === READ_STATE.READ && r.currency?.state !== CURRENCY.OUT_OF_DATE).map((r) => [r.url, r]));
  const tally = (xs, k) => Object.entries(xs.reduce((m, x) => ((m[x[k] ?? "-"] = (m[x[k] ?? "-"] ?? 0) + 1), m), {})).sort().map(([a, n]) => `${a} ${n}`).join(" · ") || "none";
  const cited = facts.filter((f) => imported.has(f.link));
  console.log(`F44 · IMPORT OF THE CLIENT'S OWN READS — ${IMPORT} · no connector opened, no request made, no route driven · counts only`);
  console.log(`  files            ${got.length + refused.length}: imported ${got.length} (${tally(got, "state")}) · refused ${refused.length}${refused.length ? ` (${refused.map((r) => `${r.file} ${r.reason}`).join(" · ")})` : ""}`);
  for (const r of got) console.log(`    ${r.state === READ_STATE.READ ? "read" : r.state}  ${r.via} ${r.url} · read ${r.readOn ?? "-"} · ${r.chars ?? 0} chars${r.document ? ` · ${r.document}${r.pages ? ` ${r.pages} page(s)` : ""}` : ""}${r.currency ? ` · ${r.currency.state}` : ""}${r.reason ? ` · ${r.reason}` : ""}`);
  return recheckImported({ got, cited, imported, instant, run });
}
async function recheckImported({ got, cited, imported, instant, run }) {
  const results = await recheckFacts({ facts: cited, readOf: async (u) => imported.get(u), on: ON });
  const counts = recheckCounts(results);
  console.log(`  recheck          ${counts.facts} fact(s) cite an imported source: ${Object.entries(counts.byState).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
  for (const r of results.filter((x) => x.state !== RECHECK.CURRENT)) console.log(`    ${r.state.padEnd(9)} ${r.factId} — ${r.url}`);
  if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: no read and no recheck kept"); process.exit(0); }
  const put =(records, file) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, file)), records,
    targetClass: "GENERATED_CONFIG", action: "APPEND_SOURCE_FACTS", occurredAt: instant, correlationId: `run:source-facts:${file}:${instant}`, discipline: "APPEND_IF_NEW" }));
  const ok = (g) => g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED";
  /* RR-274: the full read privately first, then its public copy (no text) */
  const fullReads = got.map((r) => readRecord({ read: r, tenantId: SCOPE.tenantId, on: ON, run }));
  const gp = appendPrivate(fullReads, "source-reads.jsonl", instant);
  if (!ok(gp)) { console.error(`  🔴 ${gp.outcome} — the imported texts did NOT persist privately; nothing public was written`); process.exit(1); }
  const g = put(fullReads.map(publicCopy), "source-reads.jsonl");
  if (!ok(g)) { console.error(`  🔴 ${g.outcome} — the imported reads did NOT persist`); process.exit(1); }
  if (results.length) { const h = put(results.map((r) => recheckRecord({ result: r, tenantId: SCOPE.tenantId, on: ON, run })), "fact-rechecks.jsonl"); if (!ok(h)) { console.error(`  🔴 ${h.outcome} — the rechecks did NOT persist`); process.exit(1); } }
  console.log(`  kept             ${got.length} read(s) in the batch's source-reads store · ${results.length} recheck(s) in its fact-rechecks store · ${Math.round((performance.now() - t0) / 1000)} s`);
  process.exit(0);
}

/** C9 + C10 on the stored texts (RR-268 C) — no connector, no request; the verdicts and the route's NOT METERED cost entry kept with --confirm. */
async function extractRun() {
  const filed = json(EXTRACT);
  const proposals = Array.isArray(filed?.proposals) ? filed.proposals : null;
  if (!proposals || typeof filed.route !== "string" || filed.route === "") { console.error("🔴 REFUSED — PROPOSALS_FILE_UNREADABLE: the batch files no readable proposals with the route that proposed them; nothing written"); process.exit(3); }
  const rows = (f) => { try { return readFileSync(join(batchDir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
  /* the latest stored read of each source, and the latest stored recheck of each fact */
  /* RR-274: each public read joined to its private text (by key, and only when the text hashes to the public sha256) */
  const readOf = new Map(withPrivateTexts(rows("source-reads.jsonl"), privateRows("source-reads.jsonl"), { privateRoot: PRIVATE.state }).map((r) => [r.url, r]));
  const lastCheck = new Map(rows("fact-rechecks.jsonl").map((c) => [c.factId, c]));
  const linkOf = new Map(facts.map((f) => [f.factId, f.link]));
  const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const run = `source-facts:extract:${instant}`;
  const records = [];
  for (const p of proposals) {
    const read = readOf.get(p?.source);
    /* the stored read, as the reader returned it: its text, hash and day — the proposer is handed this one proposal, nothing else */
    const result = await extractFacts({ read: read?.state === READ_STATE.READ ? { ...read, readOn: read.readOn } : null, propose: async () => [p] });
    records.push(extractionRecord({ proposal: p, result, factLink: p?.fact ? linkOf.get(p.fact) ?? null : null, route: filed.route, tenantId: SCOPE.tenantId, on: ON, run }));
  }
  const was = facts.filter((f) => lastCheck.get(f.factId)?.state === RECHECK.REJECTED);
  const readmitted = was.filter((f) => records.some((r) => r.fact === f.factId && r.outcome === EXTRACTION.RE_ADMITTED));
  const blocked = facts.filter((f) => lastCheck.get(f.factId)?.state === RECHECK.BLOCKED);
  const tally = (xs, k) => Object.entries(xs.reduce((m, x) => ((m[x[k] ?? "-"] = (m[x[k] ?? "-"] ?? 0) + 1), m), {})).sort().map(([a, n]) => `${a} ${n}`).join(" · ") || "none";
  console.log("F44 · EXTRACT ON THE STORED TEXTS — C9 + C10 · no connector opened, no request made · counts only");
  console.log(`  route            ${filed.route} — NOT METERED (no paid-provider call)`);
  console.log(`  proposals        ${records.length}: ${tally(records, "outcome")} · rejected by reason: ${tally(records.filter((r) => r.outcome === EXTRACTION.REJECTED), "reason")}`);
  console.log(`  rejected facts   ${was.length} left REJECTED by the stored recheck: RE-ADMITTED ${readmitted.length} · STILL REJECTED ${was.length - readmitted.length}`);
  for (const f of was.filter((x) => !readmitted.includes(x))) console.log(`    still rejected ${f.factId} — ${readOf.get(f.link)?.state === READ_STATE.READ ? "no word-for-word quotation admitted from its stored text" : `its source is ${readOf.get(f.link)?.reason ?? "not read"}`} (${f.link ?? "no URL"})`);
  console.log(`  new for needs    ${tally(records.filter((r) => r.outcome === EXTRACTION.NEW_FOR_NEED), "need")}`);
  console.log(`  blocked facts    ${blocked.length} stay BLOCKED (no browser route connected):`);
  for (const f of blocked) console.log(`    blocked        ${f.factId} — ${f.link}`);
  if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: nothing kept"); process.exit(0); }
  const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, "fact-extractions.jsonl")), records,
    targetClass: "GENERATED_CONFIG", action: "APPEND_SOURCE_FACTS", occurredAt: instant, correlationId: `run:source-facts:fact-extractions.jsonl:${instant}`, discipline: "APPEND_IF_NEW" }));
  if (g.outcome !== "COMMITTED" && g.outcome !== "ALREADY_COMMITTED") { console.error(`  🔴 ${g.outcome} — the verdicts did NOT persist`); process.exit(1); }
  /* F78: the run's one cost entry — the route named, NOT METERED: the owner's own subscription, no paid-provider call, no request */
  const finishedAt = new Date().toISOString();
  const entry = { ...makeCostEntry({ entry_id: `run:bin/source-facts.mjs:extract:${instant}`, run_kind: "ai-extraction", run_ref: `bin/source-facts.mjs --extract · ${filed.route} · ${records.length} proposal(s)`, run_started_at: instant, recorded_at: finishedAt,
    money: { amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis: `NOT METERED — the proposals came from ${filed.route}, the owner's own already-paid subscription; no paid-provider call was made by this run` },
    providerCalls: { state: "MEASURED", total: 0, perProvider: {}, zeroBasis: "no paid-provider API call and no request: the run judged filed proposals against stored page texts" },
    budget: { kind: "ai-extraction", used: { proposals: records.length, requests: 0 }, bounds: { requestPath: "none — no connector is opened in this mode" }, capReached: false },
    founderTime: { state: "MEASURED", seconds: Math.max(0, (Date.parse(finishedAt) - Date.parse(instant)) / 1000), from: instant, to: finishedAt, ...((Date.parse(finishedAt) - Date.parse(instant)) <= 0 ? { zeroBasis: "the run started and ended within the clock's resolution" } : {}) } }),
    aiRoute: Object.freeze({ name: filed.route, metered: false }) };
  const c = RUN_COST.appendOwn(entry);
  if (c?.outcome !== "COMMITTED" && c?.outcome !== "ALREADY_COMMITTED") { console.error(`  🔴 ${c?.outcome} — the run's cost entry did NOT persist`); process.exit(1); }
  console.log(`  kept             ${records.length} verdict(s) in the batch's fact-extractions store · the route's NOT METERED cost entry · ${Math.round((performance.now() - t0) / 1000)} s`);
  process.exit(0);
}
