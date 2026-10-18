#!/usr/bin/env node
/**
 * RR-285 · THE CLIENT'S OWN SEARCH CONSOLE EXPORT, imported from its files into the research batch — NOTHING IS FETCHED from Google.
 *
 *   node bin/search-console-export.mjs --subject=<id> --research-batch=<id> --folder=search-console-YYYY-MM-DD --tenant=<id> --actor=<id> [--confirm]
 *
 * The export the client filed PRIVATELY in the batch (client-files/<folder>/ with its meta.json: the day exported and the source named) is
 * read by src/discovery/search-console-export.mjs: each query a phrase record through the engine's existing Search Console route
 * (SEARCH_CONSOLE, OBSERVED), and one summary record — the window, the totals, the pages and the links (a link file with no row is 0 links).
 * Without --confirm counts are printed and nothing is recorded; with it both are appended to the batch's OWN export store,
 * search-console-exports.jsonl, each once — never to F11's phrase store (search-phrases.jsonl), whose real population F11 and F12 hold whole:
 * an imported query joins a need only through a recorded grouping (RR-285 repair).
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { privateSourcesRoot } from "../src/facts/private-texts.mjs";
import { readSearchConsoleExport } from "../src/discovery/search-console-export.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), FOLDER = arg("folder");
if (!SUBJECT || !BATCH || !/^search-console-\d{4}-\d{2}-\d{2}$/.test(FOLDER ?? "")) { console.error("usage: node bin/search-console-export.mjs --subject=<id> --research-batch=<id> --folder=search-console-YYYY-MM-DD [--confirm] — nothing read"); process.exit(2); }
const CONFIRM = process.argv.includes("--confirm");
/* governed only when it may write: a counting run records nothing on the trail */
const SCOPE = scopedEntryPoint({ entry: "bin/search-console-export.mjs", governed: CONFIRM, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
const PRIVATE = privateSourcesRoot(process.env);
if (PRIVATE.state !== "DECLARED") { console.error("🔴 REFUSED — PRIVATE_SOURCES_ABSENT: the client's export is filed privately and the private sources root is not here; nothing read"); process.exit(3); }
/* bound on a line that names the RESEARCH store: THIS research batch's own private files, decided by RESOURCES.researchBatch above */
const folder = join(PRIVATE.dir, relative(lookupStore(index, "RESEARCH").rootPath, batchDir), "client-files", FOLDER);
if (!existsSync(join(folder, "meta.json"))) { console.error("🔴 REFUSED — EXPORT_NOT_FILED: the batch files no such export (client-files/<folder>/meta.json); nothing read"); process.exit(3); }
const meta = JSON.parse(readFileSync(join(folder, "meta.json"), "utf8"));
const text = (f) => (typeof f === "string" && existsSync(join(folder, f)) ? readFileSync(join(folder, f), "utf8") : null);
const r = readSearchConsoleExport({ queries: text(meta.files?.queries), pages: text(meta.files?.pages), chart: text(meta.files?.chart), links: (meta.files?.links ?? []).map(text).filter((t) => t !== null) }, meta);
if (r.refusal) { console.error(`🔴 REFUSED — ${r.refusal}; nothing recorded`); process.exit(3); }
const s = r.record;
console.log("SEARCH CONSOLE EXPORT — the client's own files; nothing fetched from Google");
console.log(`  source           ${s.source}`);
console.log(`  window           ${s.window.from} – ${s.window.to} (${s.window.days} days) · clicks ${s.totals.clicks} · impressions ${s.totals.impressions}`);
console.log(`  queries          ${s.queries.rows} rows (${s.queries.impressions} impressions) · phrase records ${s.queries.phrasesRecorded} (SEARCH_CONSOLE, OBSERVED) · refused ${s.queries.refused}`);
console.log(`  pages            ${s.pages.rows} rows · clicks ${s.pages.clicks} · impressions ${s.pages.impressions}`);
console.log(`  links            ${s.links.rows} on ${s.exportedOn} (${s.links.files} link file(s))`);
if (!CONFIRM) { console.log("  NOT RECORDED — --confirm appends the phrases and the summary to the batch's search-console-exports.jsonl"); process.exit(0); }
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, "search-console-exports.jsonl")), records: [...r.phrases, s],
  targetClass: "GENERATED_CONFIG", action: "APPEND_SEARCH_PHRASES", occurredAt: instant, correlationId: `run:search-console-export:${instant}`, discipline: "APPEND_IF_NEW" }));
console.log(`  kept             ${g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED" ? `${r.phrases.length} phrase record(s) and the summary in the batch's search-console-exports.jsonl [${g.outcome}]` : `🔴 ${g.outcome} — nothing persisted`}`);
if (!(g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED")) process.exitCode = 1;
