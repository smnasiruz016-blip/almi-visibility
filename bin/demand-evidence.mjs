#!/usr/bin/env node
/**
 * F18 · OBSERVED DEMAND AND ESTIMATES, KEPT APART (acceptance _handoffs AlmiVisibility_F18_ACCEPTANCE_2026-10-18.md, RR-284; beta-g
 * decision D) — READ-ONLY; counts only by default.
 *
 *   node bin/demand-evidence.mjs --subject=<id> --research-batch=<id> --tenant=<id> --actor=<id> [--list]
 *
 * Every need of the batch labelled OBSERVED (with the records it is observed in, each with its own source and date) or ESTIMATE (with the
 * records it is estimated from); an estimate beside an observation is SUPERSEDED, never deleted; only an OBSERVED need may create a page
 * candidate; and on the published pages as built, every page question with no source of its own (src/research/demand-evidence.mjs).
 * --list prints those page questions, for the page-fix queue. Nothing is fetched, written or published.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { needDemand, pageCandidates, unsourcedPageQuestions, pageNeedDemand, DEMAND } from "../src/research/demand-evidence.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch");
if (!SUBJECT || !BATCH) { console.error("usage: node bin/demand-evidence.mjs --subject=<id> --research-batch=<id> [--list] — nothing read"); process.exit(2); }
scopedEntryPoint({ entry: "bin/demand-evidence.mjs", governed: false, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(join(batchDir, "need-clusters.jsonl"))) { console.error("🔴 REFUSED — NO_NEEDS_FILED: the batch files no need clusters; nothing read"); process.exit(3); }
const rows = (f) => { try { return readFileSync(join(batchDir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const json = (f) => { try { return JSON.parse(readFileSync(join(batchDir, f), "utf8")); } catch { return null; } };
const records = new Map();
for (const r of [...rows("questions.jsonl"), ...rows("research-derived-questions.jsonl"), ...rows("search-phrases.jsonl").filter((x) => x.record_type === "search_phrase")]) { records.set(r.measurement_key, r); records.set(r.question_id ?? r.phrase_id, r); }
for (const p of json("search-phrases.json") ?? []) records.set(p.phraseId, p);
const recordOf = (id) => records.get(id) ?? null;
const needs = rows("need-clusters.jsonl").filter((c) => c.record_type === "need_cluster").map((c) => needDemand(c, recordOf));
const pages = new Map();
for (const r of rows("joined-pages.jsonl")) if (r.record_type === "joined_page_draft" && r.publishedUrl) pages.set(r.publishedUrl, r);
/* RR-285: the batch's recorded joins of observed records to page needs (the latest observed-question-joins-<day>.json), when it files one */
const joinFile = readdirSync(batchDir).filter((f) => /^observed-question-joins-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1) ?? null;
const joins = joinFile ? (json(joinFile)?.joins ?? []) : [];
const pc = pageCandidates(needs), u = unsourcedPageQuestions([...pages.values()], recordOf, { joins });
const joinedNeeds = [...new Set(joins.map((j) => `${j.page}#${j.needKey}`))].map((k) => { const [pg, key] = k.split("#"); const it = pages.get(pg)?.itemList?.find((x) => x.needKey === key); return it ? pageNeedDemand(pg, it, recordOf, { joins }) : null; }).filter(Boolean);
const count = (l) => needs.filter((n) => n.label === l).length;
console.log("F18 · OBSERVED DEMAND AND ESTIMATES — nothing fetched, written or published");
console.log(`  needs            ${needs.length}: OBSERVED ${count(DEMAND.OBSERVED)} · ESTIMATE ${count(DEMAND.ESTIMATE)} · estimate beside an observation (SUPERSEDED, kept) ${needs.filter((n) => n.estimate?.state === DEMAND.SUPERSEDED).length} · records refused ${needs.reduce((s, n) => s + n.refused.length, 0)}`);
console.log(`  page candidates  ${pc.candidates.length} from observed needs · refused ${pc.refused.length} (an estimate alone)`);
console.log(`  published pages  ${pages.size}: page questions ${u.items} · with no source of their own ${u.unsourced.length} (for the page-fix queue; no live page changes)`);
console.log(`  joined           ${joins.length} recorded join(s)${joinFile ? ` (${joinFile})` : ""} · page needs joined ${joinedNeeds.length}: observation beside a SUPERSEDED estimate ${joinedNeeds.filter((n) => n.label === DEMAND.OBSERVED && n.estimate?.state === DEMAND.SUPERSEDED).length}`);
if (process.argv.includes("--list")) for (const x of u.unsourced) console.log(`    ${x.page} · ${x.needKey} · ${x.question}`);
