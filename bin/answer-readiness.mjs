#!/usr/bin/env node
/**
 * 🔴 F54 · ANSWER-READINESS AUDIT of the pages one research batch has published, as built (acceptance _handoffs 4b5b01c, RR-283 item 2).
 *
 *   node bin/answer-readiness.mjs --subject=<id> --research-batch=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched; writes nothing
 *
 * Each published page's latest built record (its stored HTML, byte-equal to the file the client's site serves) gets five SEPARATE results —
 * clarity, extractability, provenance, entity consistency, direct answer — each PASS / FAIL / NOT_MEASURED with its reason, never one score
 * (src/page/answer-readiness.mjs). Counts only are printed: no page text, no question, no source. Not a claim about ranking or citation.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { JOINED_RECORD } from "../src/page/joined-page.mjs";
import { auditPages, READINESS_CHECKS } from "../src/page/answer-readiness.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch");
if (!SUBJECT || !BATCH) { console.error("usage: node bin/answer-readiness.mjs --subject=<id> --research-batch=<id> — nothing read, nothing written"); process.exit(2); }
scopedEntryPoint({ entry: "bin/answer-readiness.mjs", governed: false, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}; nothing read`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
/* every read below names batchDir, so each is this RESEARCH batch's (tenant-scope census) */
if (!existsSync(join(batchDir, "joined-pages.jsonl"))) { console.error("🔴 REFUSED — NO_BUILT_PAGES: the declared research batch holds no built pages; nothing read"); process.exit(3); }
const built = readFileSync(join(batchDir, "joined-pages.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r?.record_type === JOINED_RECORD && r.subject === SUBJECT);
/* each page's LATEST build stands for it; only a page the client has published is audited */
const published = [...new Map(built.map((r) => [r.value, r])).values()].filter((r) => typeof r.publishedUrl === "string" && typeof r.html === "string");
const a = auditPages(published.map((r) => ({ page: r.value, html: r.html })));
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ");
console.log("F54 · ANSWER-READINESS AUDIT — the published pages as built, count-only, five checks kept apart");
console.log(`  bound            ${a.pages} published page(s) of this batch, each its latest build; nothing fetched, nothing written`);
for (const k of READINESS_CHECKS) console.log(`  ${k.padEnd(19)}${fmt(a.counts[k])}`);
console.log(`  facts            ${a.facts} · with their source link and checked date ${a.sourcedAndDated}`);
console.log(`  limit            ${a.limit}`);
