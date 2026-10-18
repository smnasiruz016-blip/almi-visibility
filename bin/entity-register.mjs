#!/usr/bin/env node
/**
 * F49 · KNOWLEDGE GRAPH AND ENTITY-LINKING SUPPORT (acceptance _handoffs AlmiVisibility_F49_ACCEPTANCE_2026-10-18.md, RR-285) — READ-ONLY.
 *
 *   node bin/entity-register.mjs --subject=<id> --research-batch=<id> --entities=entities-YYYY-MM-DD.json --on=<YYYY-MM-DD> --tenant=<id> --actor=<id> [--list]
 *
 * Every entity the batch's published pages name (each claim's responsible body; each regulator-table row) resolved to one entity of the
 * batch's recorded list, or UNRESOLVED / AMBIGUOUS by name; each entity's identifiers from the engine's stored reads only — its own official
 * site, or a Wikidata item whose official website names that site — or NO IDENTIFIER with what was checked; every structured-data sameAs
 * checked against the page; the product entity from the client's own declaration (src/research/entity-register.mjs). Nothing fetched or written.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { privateSourcesRoot, withPrivateTexts } from "../src/facts/private-texts.mjs";
import { pageMentions, resolveMention, identify, pageDataMismatches, productEntity, RESOLVED, ID_STATE } from "../src/research/entity-register.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ENTS = arg("entities"), ON = arg("on");
if (!SUBJECT || !BATCH || !/^entities-\d{4}-\d{2}-\d{2}\.json$/.test(ENTS ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) { console.error("usage: node bin/entity-register.mjs --subject=<id> --research-batch=<id> --entities=entities-YYYY-MM-DD.json --on=<YYYY-MM-DD> [--list] — nothing read"); process.exit(2); }
scopedEntryPoint({ entry: "bin/entity-register.mjs", governed: false, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(join(batchDir, ENTS))) { console.error("🔴 REFUSED — NO_ENTITY_LIST_FILED: the batch files no such entity list; nothing read"); process.exit(3); }
const PRIVATE = privateSourcesRoot(process.env);
/* bound on a line that names the RESEARCH store: THIS research batch's own private texts, decided by RESOURCES.researchBatch above */
const privateBatchDir = join(PRIVATE.dir ?? "", relative(lookupStore(index, "RESEARCH").rootPath, batchDir));
const json = (f) => JSON.parse(readFileSync(join(batchDir, f), "utf8"));
const rows = (f, dir = batchDir) => { try { return readFileSync(join(dir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const entities = json(ENTS).entities ?? [];
const body = new Map(); for (const p of json("page-drafts.json").pages ?? []) for (const n of p.needs ?? []) for (const c of n.answer?.claims ?? []) body.set(c.claimId, c.body ?? c.source?.body ?? null);
const pages = [...new Map(rows("joined-pages.jsonl").filter((r) => r.record_type === "joined_page_draft" && r.publishedUrl).map((r) => [r.publishedUrl, r])).values()];
const mentions = pages.flatMap((p) => pageMentions(p, (id) => body.get(id))).map((m) => ({ ...m, resolved: resolveMention(m.name, entities) }));
const reads = withPrivateTexts(rows("source-reads.jsonl"), PRIVATE.state === "DECLARED" ? rows("source-reads.jsonl", privateBatchDir) : [], { privateRoot: PRIVATE.state }).filter((r) => r.record_type === "source_page_read");
const latest = [...new Map(reads.map((r) => [r.url, r])).values()];
const identified = identify(entities, latest, { on: ON });
const mismatches = pages.flatMap((p) => pageDataMismatches(p.html, entities, identified).map((m) => ({ page: p.publishedUrl, ...m })));
const subject = lookupSubject(index, SUBJECT);
const descriptorPath = subject.state === "DECLARED" ? join(subject.dir, "descriptor.json") : null;
const product = productEntity(descriptorPath && existsSync(descriptorPath) ? { ...JSON.parse(readFileSync(descriptorPath, "utf8")), path: `${SUBJECT}/descriptor.json` } : null);
const n = (xs, k, v) => xs.filter((x) => x[k] === v).length;
console.log("F49 · ENTITIES AND IDENTIFIERS — the published pages as built and the stored reads; nothing fetched or written");
console.log(`  mentions         ${mentions.length} on ${pages.length} page(s): RESOLVED ${mentions.filter((m) => m.resolved.state === RESOLVED.ONE).length} · UNRESOLVED ${mentions.filter((m) => m.resolved.state === RESOLVED.NONE).length} · AMBIGUOUS ${mentions.filter((m) => m.resolved.state === RESOLVED.TWO).length}`);
console.log(`  entities         ${entities.length}: ${ID_STATE.IDENTIFIED} ${n(identified, "state", ID_STATE.IDENTIFIED)} · ${ID_STATE.NONE} ${n(identified, "state", ID_STATE.NONE)} · identifiers from Wikidata ${identified.flatMap((x) => x.identifiers ?? []).filter((i) => i.scheme === "WIKIDATA").length}, from official sites ${identified.flatMap((x) => x.identifiers ?? []).filter((i) => i.scheme === "OFFICIAL_SITE").length}`);
console.log(`  page = data      sameAs mismatches ${mismatches.length} (sameAs entries on the pages ${pages.reduce((s, p) => s + (p.html.match(/"sameAs"/g) ?? []).length, 0)})`);
console.log(`  product          ${product.refused ? `🔴 ${product.refused}` : `${product.canonical} — from ${product.source.kind} (${product.source.path})`}`);
if (process.argv.includes("--list")) {
  for (const m of mentions.filter((x) => x.resolved.state !== RESOLVED.ONE)) console.log(`    ${m.resolved.state} ${m.name} · ${m.page} · ${m.where}`);
  for (const x of identified.filter((y) => y.state === ID_STATE.NONE)) console.log(`    ${ID_STATE.NONE} ${x.entityId} · checked ${x.checked.map((c) => `${c.url} ${c.state}${c.reason ? ` (${c.reason})` : ""}`).join("; ")} · ${x.on}`);
  for (const m of mismatches) console.log(`    MISMATCH ${m.mismatch} · ${m.name} · ${m.page}`);
}
