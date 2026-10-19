#!/usr/bin/env node
/**
 * F59 · BACKLINK PROFILE, F60 · EARNED CITATIONS, F61 · BRAND MENTIONS — free data only (acceptances _handoffs
 * AlmiVisibility_F59/F60/F61_ACCEPTANCE_2026-10-18.md, RR-287; owner decision 3 of RR-285) — READ-ONLY; nothing fetched, sent or written.
 *
 *   node bin/links-and-mentions.mjs --subject=<id> --research-batch=<id> --entities=entities-YYYY-MM-DD.json --tenant=<id> --actor=<id>
 *
 * The client's own Search Console exports (links, queries), its stored reads (their private texts joined when declared), the verified claims
 * on its published pages and its own product entity (its declaration, F49 C5): the link profile on each export date (0 is a result), the
 * earned-citation opportunities from recorded sources only, and the brand mentions — LINKED and UNLINKED apart, namesakes and its own site
 * apart. Counts only: no page, source or mention is printed.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { privateSourcesRoot, withPrivateTexts } from "../src/facts/private-texts.mjs";
import { productEntity } from "../src/research/entity-register.mjs";
import { linkExports, linkProfile, newAndLost, WAITS as LINK_WAITS } from "../src/research/backlinks.mjs";
import { earnedCitations, unlinkedMentions } from "../src/research/earned-citations.mjs";
import { brandMentions, mentionsOverTime, WAITS as MENTION_WAITS } from "../src/research/brand-mentions.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ENTS = arg("entities");
if (!SUBJECT || !BATCH || !/^entities-\d{4}-\d{2}-\d{2}\.json$/.test(ENTS ?? "")) { console.error("usage: node bin/links-and-mentions.mjs --subject=<id> --research-batch=<id> --entities=entities-YYYY-MM-DD.json — nothing read"); process.exit(2); }
scopedEntryPoint({ entry: "bin/links-and-mentions.mjs", governed: false, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(join(batchDir, ENTS))) { console.error("🔴 REFUSED — NO_ENTITY_LIST_FILED: the batch files no such entity list; nothing read"); process.exit(3); }
const PRIVATE = privateSourcesRoot(process.env);
/* bound on a line that names the RESEARCH store: THIS research batch's own private texts, decided by RESOURCES.researchBatch above */
const privateBatchDir = join(PRIVATE.dir ?? "", relative(lookupStore(index, "RESEARCH").rootPath, batchDir));
const json = (f) => JSON.parse(readFileSync(join(batchDir, f), "utf8"));
const rows = (f, dir = batchDir) => { try { return readFileSync(join(dir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const exportsRecords = rows("search-console-exports.jsonl");
const published = [...new Map(rows("joined-pages.jsonl").filter((r) => r.record_type === "joined_page_draft" && r.publishedUrl).map((r) => [r.value, r])).values()];
const ownHosts = [...new Set(published.map((p) => new URL(p.publishedUrl).hostname))];
const reads = withPrivateTexts(rows("source-reads.jsonl"), PRIVATE.state === "DECLARED" ? rows("source-reads.jsonl", privateBatchDir) : [], { privateRoot: PRIVATE.state }).filter((r) => r.record_type === "source_page_read");
const latest = [...new Map(reads.map((r) => [r.url, r])).values()];
/* F60's sources: the verified claims on each published page (the page found by its own value), and the stored reads */
const valueOf = (p) => Object.values(p.combination ?? {})[0];
const claims = (json("page-drafts.json").pages ?? []).flatMap((p) => (p.needs ?? []).flatMap((n) => (n.answer?.claims ?? []).map((c) => ({ page: published.find((x) => x.value === valueOf(p))?.publishedUrl ?? null, claimId: c.claimId, text: c.text, source: c.source }))));
const subject = lookupSubject(index, SUBJECT);
const descriptorPath = subject.state === "DECLARED" ? join(subject.dir, "descriptor.json") : null;
const product = productEntity(descriptorPath && existsSync(descriptorPath) ? { ...JSON.parse(readFileSync(descriptorPath, "utf8")), path: `${SUBJECT}/descriptor.json` } : null);

const exports = linkExports(exportsRecords);
const profile = linkProfile({ exports, links: exportsRecords.filter((r) => r.record_type === "search_console_link") });
const earned = earnedCitations({ claims, reads: latest });
const off = latest.filter((r) => { try { return !ownHosts.includes(new URL(r.url).hostname); } catch { return true; } });
const unlinked = product.refused ? null : unlinkedMentions({ names: product.aliases, reads: off });
const mentions = product.refused ? null : brandMentions({ product, entities: json(ENTS).entities ?? [], queries: exportsRecords.filter((r) => r.record_type === "search_phrase").map((r) => ({ phrase: r.phrase, date: r.date ?? String(r.recorded_at ?? "").slice(0, 10) })), reads: latest, ownHosts });
console.log("F59 · F60 · F61 — LINKS, CITATIONS AND MENTIONS FROM THE CLIENT'S OWN DATA; nothing fetched, sent or written");
console.log(`  F59 links        ${profile.measured ? profile.dates.map((d) => `${d.exportedOn}: ${d.links} link(s), ${d.domains.length} domain(s)`).join(" · ") : `NOT MEASURED — missing ${profile.missing}`} · faults ${profile.faults.length} · refused ${profile.refused.length}`);
console.log(`  F59 new / lost   ${newAndLost({ exports, links: [] }).measured ? "measured" : `NOT MEASURED — waits on ${LINK_WAITS.C4}`}`);
console.log(`  F60 citations    ${earned.counts.opportunities} opportunit(ies) from ${earned.counts.sourcesKept} kept source(s) over ${earned.counts.pages} page(s) · refused ${earned.counts.refused} · dropped ${earned.counts.dropped} · sent ${earned.sent}`);
console.log(`  F60 unlinked     ${unlinked ? `${unlinked.state} over ${unlinked.readsWithText} stored read(s) with text` : `NOT MEASURED — ${product.refused}`}`);
console.log(`  F61 mentions     ${mentions?.measured ? `${mentions.counts.mentions} (LINKED ${mentions.counts.LINKED} · UNLINKED ${mentions.counts.UNLINKED}) · namesakes ${mentions.counts.namesakes} · own site ${mentions.counts.ownSite}` : `NOT MEASURED — ${mentions?.missing ?? product.refused}`}`);
console.log(`  F61 over time    NOT MEASURED — ${mentionsOverTime({ exportDates: exports.map((e) => e.exportedOn) }).missing ?? MENTION_WAITS.C4}`);
console.log(`  private texts    ${PRIVATE.state === "DECLARED" ? "joined" : "ABSENT — unlinked mentions read only the public reads"}`);
