#!/usr/bin/env node
/**
 * RR-291 · THE PARTS OF THE VISIBILITY REPORT, ONE AT A TIME — READ-ONLY; count-only; nothing fetched, sent, published or written.
 *
 *   node bin/visibility-parts.mjs --part=<name> --subject=<id> --research-batch=<id> --tenant=<id> --actor=<id> [--list]
 *
 * One declared client's own stored records, read through its own subject and research batch (decided by the scope gate first). Each part is a
 * row of the board built under light proof in RR-291; its rules live in src/ (named per part below), never here. The output is counts, states
 * and named gaps; a part with nothing to read says NOT MEASURED, never 0.
 *
 * Generic: it names no client, product or host.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { privateSourcesRoot, withPrivateTexts } from "../src/facts/private-texts.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { PARTS } from "../src/report/visibility-parts.mjs";
import { readProductQuestionnaire } from "../src/questionnaire/product-questionnaire-reader.mjs";
import { designOf } from "../src/questionnaire/product-questionnaire.mjs";
import { ensureSubjectHook } from "../src/subject-roots.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const PART = arg("part"), SUBJECT = arg("subject"), BATCH = arg("research-batch");
if (!PART || !Object.hasOwn(PARTS, PART) || !SUBJECT || !BATCH) { console.error(`usage: node bin/visibility-parts.mjs --part=<${Object.keys(PARTS).join("|")}> --subject=<id> --research-batch=<id> — nothing read`); process.exit(2); }
/* F30: a second batch of the same client to compare against (its earlier run of the same check) — decided by the same scope gate */
const COMPARE = arg("compare-batch");
const SCOPE = scopedEntryPoint({ entry: "bin/visibility-parts.mjs", governed: false, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), ...(COMPARE ? [RESOURCES.researchBatch(COMPARE)] : [])] });
const index = rootIndexFor(process.env);
const subject = lookupSubject(index, SUBJECT);
if (subject.state !== "DECLARED") { console.error(`🔴 REFUSED — the subject is not declared (${subject.state}); nothing read`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
/* RR-299: the batch's stored page texts, joined from the PRIVATE sources root at this batch's own path (as bin/build-joined-pages.mjs does) */
const PRIVATE = privateSourcesRoot(process.env);
/* bound on a line that names the RESEARCH store: these are THIS research batch's own texts, decided by RESOURCES.researchBatch above */
const privateBatchDir = join(PRIVATE.dir, relative(lookupStore(index, "RESEARCH").rootPath, batchDir));
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT; nothing read"); process.exit(3); }
/* RR-294: the client's own design, from the questionnaire filed under THIS declared subject (RESOURCES.subject above) */
ensureSubjectHook();
const filed = await readProductQuestionnaire({ factsDir: join(subject.dir, "facts"), productId: SUBJECT });
const io = Object.freeze({
  design: filed.state === "READ" ? designOf(filed.questionnaire) : null,
  batch: BATCH,
  subject: SUBJECT,
  tenantId: SCOPE.tenantId,
  rows: (f) => { try { return readFileSync(join(batchDir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } },
  json: (f) => { try { return JSON.parse(readFileSync(join(batchDir, f), "utf8")); } catch { return null; } },
  own: (f) => { try { return JSON.parse(readFileSync(join(subject.dir, f), "utf8")); } catch { return null; } },
  exists: (f) => existsSync(join(batchDir, f)),
  listBatch: () => readdirSync(batchDir),
  storedReads: () => {
    const lines = (p) => { try { return readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
    return withPrivateTexts(lines(join(batchDir, "source-reads.jsonl")), lines(join(privateBatchDir, "source-reads.jsonl")), { privateRoot: PRIVATE.state });
  },
  list: process.argv.includes("--list"),
  on: arg("on"),
  compareBatch: COMPARE,
  /* bound on the line that names the RESEARCH store: the compared batch is that store's, decided by RESOURCES.researchBatch above */
  compareRows: (f) => { if (!COMPARE) return []; try { return readFileSync(join(lookupStore(index, "RESEARCH").dir, COMPARE, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } },
});
const out = await PARTS[PART].run(io);
/* a raw part (the F70 report file) is printed as it is — save it with "> report.html" */
if (PARTS[PART].raw) { process.stdout.write(out.join("\n")); process.exit(0); }
console.log(`${PARTS[PART].title} — the client's own stored records; read-only, nothing fetched, sent or written`);
for (const l of out) console.log(`  ${l}`);
