#!/usr/bin/env node
/**
 * F62 · C9 · THE VERDICT OF EACH DERIVED CHECK, FROM THE VERBATIM OFFICIAL TEXT (Acceptance Amendment 1, _handoffs 94a6d17, RR-283 item 9).
 *
 *   node bin/applicability-verdicts.mjs --product=<id> --research-batch=<id> --verdicts=applicability-verdicts-YYYY-MM-DD.json --on=YYYY-MM-DD --tenant=<id> --actor=<id>
 *                                                                                                  READ-ONLY; nothing fetched or written
 *
 * Every derived check of the product (bin/applicability.mjs) is judged against the verdict filed for it in the batch and the batch's stored
 * reads (their private texts joined): OFFICIAL with its excerpt word for word in the deciding body's own page, CHECKED_NOT_FOUND, BLOCKED,
 * or UNKNOWN with the refusal named (src/research/applicability-verdicts.mjs). Counts only: no body, excerpt or page is printed.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver, rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { privateSourcesRoot, withPrivateTexts } from "../src/facts/private-texts.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { readDerivedDeclaration } from "../src/research/applicability-declaration-reader.mjs";
import { judgeChecks, checksWithVerdicts } from "../src/research/applicability-verdicts.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";

const USAGE = "node bin/applicability-verdicts.mjs --product=<id> --research-batch=<id> --verdicts=applicability-verdicts-YYYY-MM-DD.json --on=YYYY-MM-DD";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const BATCH = arg("research-batch"), FILE = arg("verdicts"), ON = arg("on");
if (!BATCH || !/^applicability-verdicts-\d{4}-\d{2}-\d{2}\.json$/.test(FILE ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) { console.error(`usage: ${USAGE} — nothing read`); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/applicability-verdicts.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.researchBatch(BATCH), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });
const index = rootIndexFor(process.env);
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(join(batchDir, FILE))) { console.error("🔴 REFUSED — NO_VERDICTS_FILED: the batch holds no such verdicts file; nothing judged"); process.exit(3); }
const PRIVATE = privateSourcesRoot(process.env);
/* bound on a line that names the RESEARCH store: this research batch's own private texts */
const privateBatchDir = join(PRIVATE.dir, relative(lookupStore(index, "RESEARCH").rootPath, batchDir));
const lines = (t) => t.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const publicReads = existsSync(join(batchDir, "source-reads.jsonl")) ? lines(readFileSync(join(batchDir, "source-reads.jsonl"), "utf8")) : [];
const privateReads = existsSync(join(privateBatchDir, "source-reads.jsonl")) ? lines(readFileSync(join(privateBatchDir, "source-reads.jsonl"), "utf8")) : [];
const reads = withPrivateTexts(publicReads, privateReads, { privateRoot: PRIVATE.state });
const { verdicts } = JSON.parse(readFileSync(join(batchDir, FILE), "utf8"));
const facts = (await loadRegistry(PRODUCT.factsDir, PRODUCT.productId)).records;
const declaration = await readDerivedDeclaration({ product: PRODUCT, tenantId: SCOPE.tenantId, resolve: createTenantResolver(), on: ON });
const j = judgeChecks({ declaration, facts, reads, filed: verdicts });
console.log("F62 · C9 · THE VERDICT OF EACH DERIVED CHECK — from the verbatim official text; count-only; nothing fetched or written");
console.log(`  checks           ${j.counts.checks} derived on ${ON}`);
console.log(`  official         ${j.counts.OFFICIAL}: REQUIRED ${j.counts.REQUIRED} · ACCEPTED ${j.counts.ACCEPTED} · NOT_REQUIRED ${j.counts.NOT_REQUIRED} — each with its excerpt word for word in the body's own stored page`);
console.log(`  not found        ${j.counts.CHECKED_NOT_FOUND} — each naming what was not found, the pages checked and the date`);
console.log(`  blocked          ${j.counts.BLOCKED} — each with its page and reason; never NOT_REQUIRED`);
console.log(`  unknown          ${j.counts.UNKNOWN}${j.counts.UNKNOWN ? ` — refused: ${[...new Set(j.rows.filter((r) => r.kind === "UNKNOWN").map((r) => r.refused))].join(", ")}` : ""}`);
{ const back = checksWithVerdicts({ declaration, judged: j }).byOutcome; console.log(`  checks' outcomes REQUIRED ${back.REQUIRED} · ACCEPTED ${back.ACCEPTED} · NOT_REQUIRED ${back.NOT_REQUIRED} · UNKNOWN ${back.UNKNOWN} — each OFFICIAL verdict read back into its check (RR-286); every other check UNKNOWN with its reason`); }
console.log(`  private texts    ${PRIVATE.state === "DECLARED" ? "joined" : "ABSENT — an official verdict cannot be judged without them"}`);
