#!/usr/bin/env node
/**
 * 🔴 F11 · KEYWORD AND SEARCH-LANGUAGE DISCOVERY — the six sources, into the product's own research batch (acceptance _handoffs d941e18).
 * 🔴 NOTHING IS FETCHED. No search engine is queried, no account is used and no credential is read here: every source is a HAND-IN the
 * client filed in the batch from its own browser and its own accounts, or the stored Search Console pull read as this tenant's partition.
 *
 *   node bin/search-phrases.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--confirm]
 *
 * Read from the batch, by fixed name (every one optional; a source with no hand-in is NOT MEASURED with the owner's step named):
 *   phrase-sources/client-ai-google-*.json     (a) what the client's own AI saw on Google, with its run record
 *   phrase-sources/bing-keyword-research-*.json (c) the source's own response, saved by the client
 *   phrase-sources/keyword-planner-*.csv        (d) the file the client exported, with <same name>.meta.json beside it
 *   phrase-sources/person-seen-*.json and search-phrases.json  (e) what a person saw
 *   phrase-sources/ai-suggestions-*.json        (f) an AI's suggestions — always INFERRED
 *   phrase-kind-lists.json                      the product's declared places, entities, language variants and primary language
 *   phrase-needs.json                           the recorded grouping of wording into needs
 * (b) is read from the recorded Search Console pulls, only as THIS tenant's partition (F02).
 * Written, only with --confirm and only into the batch's search-phrases.jsonl: the phrase records (each once), the run records of
 * source (a) — a refused run's record without one of its phrases —, the need groups and each source's status. No page, no page candidate.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor, createTenantResolver } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { clientQueryPulls } from "../src/discovery/search-phrase-reader.mjs";
import { clientAiHandIn, daySearchesBefore, searchConsoleRows, bingKeywordResearch, keywordPlannerFile, personSeen, aiSuggestions, freshPhrases, kindsOf, kindListFaults, groupPhrases, sourceStatus,
  PHRASE_RECORD, SOURCES, UNCLASSIFIED } from "../src/discovery/search-phrase-sources.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on");
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) { console.error("usage: node bin/search-phrases.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--confirm] — nothing read, nothing written"); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/search-phrases.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
/* Source (b) is not a resource of this run as a whole: the recorded Search Console store is read only as THIS tenant's partition, by
 * F02's own partition decision inside the reader (src/discovery/search-phrase-reader.mjs) — refused there when the tenant has none. */

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
/* every read below is of THIS batch, inside the RESEARCH store the gate decided: each names the batch directory on its own line */
const HAND_INS = "phrase-sources";
const raw = (...rel) => { try { return readFileSync(join(batchDir, ...rel), "utf8"); } catch { return null; } };
const json = (...rel) => { try { return JSON.parse(readFileSync(join(batchDir, ...rel), "utf8")); } catch { return null; } };
const filed = (prefix, ext) => (existsSync(join(batchDir, HAND_INS)) ? readdirSync(join(batchDir, HAND_INS)).filter((n) => n.startsWith(prefix) && n.endsWith(ext) && !n.endsWith(".meta.json")).sort() : []);

const target = join(batchDir, "search-phrases.jsonl");
const held = existsSync(join(batchDir, "search-phrases.jsonl")) ? createJsonlStore(join(batchDir, "search-phrases.jsonl")).readAll() : [];
const incoming = [], runs = [], refused = [];
const take = (r) => { incoming.push(...r.records); refused.push(...r.refused); if (r.runs) runs.push(...r.runs); };

/* (a) — the day's cap counts every search already recorded for that day, accepted or not */
for (const n of filed("client-ai-google-", ".json")) { const h = json(HAND_INS, n); take(clientAiHandIn(h, { searchesBefore: daySearchesBefore(held, h) })); }
/* (b) — the recorded pulls, this tenant's partition only (F02's decision and partition, through the reader) */
for (const pull of clientQueryPulls({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), repo: REPO })) take(searchConsoleRows(pull.rows, { date: pull.date }));
for (const n of filed("bing-keyword-research-", ".json")) take(bingKeywordResearch(json(HAND_INS, n)));
for (const n of filed("keyword-planner-", ".csv")) take(keywordPlannerFile(raw(HAND_INS, n), json(HAND_INS, `${n}.meta.json`)));
for (const n of filed("person-seen-", ".json")) take(personSeen(json(HAND_INS, n)));
if (existsSync(join(batchDir, "search-phrases.json"))) take(personSeen(json("search-phrases.json")));
for (const n of filed("ai-suggestions-", ".json")) take(aiSuggestions(json(HAND_INS, n)));

const { fresh, repeated } = freshPhrases(held, incoming);
const all = [...held.filter((r) => r?.record_type === PHRASE_RECORD), ...fresh];
const lists = json("phrase-kind-lists.json") ?? {};
if (kindListFaults(lists).length) { console.error("🔴 REFUSED — KIND_LIST_NOT_DECLARED: phrase-kind-lists.json holds a list no kind rule declares; nothing written"); process.exit(3); }
const grouping = json("phrase-needs.json") ?? [];
const G = groupPhrases({ phrases: all, grouping, on: ON });
if (G.refused.length) { console.error(`🔴 REFUSED — PHRASE_IN_TWO_NEEDS: ${G.refused.length} wording(s) stand under two needs in phrase-needs.json; nothing written`); process.exit(3); }
const counts = Object.fromEntries(Object.keys(SOURCES).map((s) => [s, all.filter((r) => r.source === s).length]));
const status = sourceStatus({ counts, on: ON });
const kinds = {};
for (const r of all) for (const k of kindsOf(r, lists).kinds) kinds[k] = (kinds[k] ?? 0) + 1;

console.log("F11 · KEYWORD AND SEARCH-LANGUAGE DISCOVERY — this subject only; hand-ins and the recorded pull; nothing fetched, no credential read · counts only");
for (const s of status) console.log(`  (${s.letter}) ${s.source.padEnd(22)} ${s.label.padEnd(24)} phrases ${String(s.phrases).padStart(4)} · ${s.state} · live part ${s.livePart}${s.ownerStep ? ` — owner step: ${s.ownerStep}` : ""}`);
for (const r of runs) console.log(`  run ${String(r.runId ?? "(unnamed)").padEnd(18)} ${r.verdict}${r.refusedFor.length ? ` (${r.refusedFor.join(", ")})` : ""} · searches ${r.searchesUsed} (day ${r.searchesOfTheDay} of ${r.dailyCap}) · shortest pause ${r.shortestPauseSeconds === null ? "NOT MEASURED" : `${r.shortestPauseSeconds.toFixed(1)} s`} (floor ${r.minPauseSeconds} s) · stopped ${r.stopped} · handed in ${r.observationsHandedIn} · kept ${r.phrasesKept}`);
console.log(`  phrases          handed in ${incoming.length} · new ${fresh.length} · already held or repeated ${repeated.length} · refused ${refused.length}${refused.length ? ` (${Object.entries(refused.reduce((m, x) => ((m[x.code] = (m[x.code] ?? 0) + 1), m), {})).map(([k, n]) => `${k} ${n}`).join(" · ")})` : ""} · held after this run ${all.length}`);
console.log(`  kinds            ${Object.entries(kinds).sort().map(([k, n]) => `${k} ${n}`).join(" · ")} (a phrase may carry several; ${UNCLASSIFIED} = no rule decides)`);
console.log(`  needs            ${G.groups.length} group(s): in a need ${G.assigned} phrase(s) · no need yet ${G.noNeedYet} · a group is not a page`);

const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: nothing kept"); process.exit(0); }
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const records = [...runs, ...fresh, ...G.groups, ...status];
const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(target), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_SEARCH_PHRASES", occurredAt: instant, correlationId: `run:search-phrases:${instant}`, discipline: "APPEND_IF_NEW" }));
if (!(g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED")) { console.error(`  🔴 ${g.outcome} — the phrase records did NOT persist`); process.exit(1); }
console.log(`  kept             ${records.length} record(s) handed to the batch's search-phrases store (${g.outcome}; a record already held is not written twice)`);
