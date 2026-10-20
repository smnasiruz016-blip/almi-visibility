#!/usr/bin/env node
/**
 * ITEM 8 — HAS TEXT / EMPTY over the REAL corpus (RR-302: no word count), and the guard that keeps
 * a supply label from becoming a demand claim.
 *
 * ── 🔴 WHAT ITEM 8 ACTUALLY FORBIDS ─────────────────────────────────────────
 *
 * The labels describe WHAT CONTENT EXISTS. They say nothing whatever about
 * what anyone wants. A check that turns "thin" into "opportunity" has invented
 * a demand it never measured — and it would be believed, because it arrives
 * wearing a measurement's clothes. That is the failure that produced 43 million
 * pages elsewhere, and it is the cheapest one to defend against early.
 *
 * ── WHERE THE BODIES COME FROM, STATED PLAINLY ──────────────────────────────
 *
 * 🔴 THE COMMITTED CRAWL RECORDS CARRY NO BODIES. `runs/crawl/*.jsonl` holds
 * status, headers, timings and byte counts only; its own `inventory_note` says
 * the bodies live in GitHub artifact `crawl-corpus-34662527129`, which expires
 * **2026-12-11**. So this tool needs `--corpus=<dir>` pointing at that unpacked
 * artifact, and it REFUSES TO GUESS when the directory is absent: without it
 * there is no corpus, and a run over no corpus must not look like a clean one.
 *
 * Retrieving that artifact is reading OUR OWN stored evidence from a crawl the
 * owner already authorised. It is not a crawl and not a live fetch: no product
 * is touched and no new observation of the world is made.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";

import { EXACT_DUPLICATE, NEAR_DUPLICATE, RECOMMENDATION_FIELDS } from "../src/audit/content-checks.mjs";
import { measure, SHELL_DEFINITION } from "../src/audit/shell.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { partitionRecords } from "../src/crawl/batch-partition.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const CORPUS = arg("corpus", null);
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/supply-labels.mjs", governed: true, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.inputPath(CORPUS, "--corpus"), RESOURCES.inputPath(arg("crawl", null), "--crawl")] });
const CRAWL = arg("crawl", batchFile("first-real-crawl-2026-09-12.jsonl"));
/* 🔴 GAP 2 — confined BEFORE anything is read, and DRY-RUN BY DEFAULT. Until 16 September 2026 this
 * appended its findings on every run, with no flag and no gate: the shape that rewrote committed
 * evidence on 14 September when a writer was run only to read a number. */
const OUT = confineToRepo(arg("out", `${REPO}runs/audit/supply-labels.jsonl`), { label: "--out" });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:supply-labels:${RUN_INSTANT}`;

/* ---- the corpus ---------------------------------------------------------- */

if (!CORPUS || !existsSync(CORPUS)) {
  console.error("🔴 NO CORPUS. --corpus=<dir> must point at the unpacked crawl-corpus artifact.");
  console.error("   The committed crawl records carry no page bodies (see their inventory_note).");
  console.error("   Refusing to run: a supply census over zero pages is not a clean result, and");
  console.error("   LAW-ABSENT-1 — a failure to read is never a finding about the pages.");
  process.exit(2);
}

/* F02 (partition): the crawl records are SHARED — the batch's, or an operator's --crawl file — so only the requested
 * tenant's partition is used, and only its observations' bodies are read from the corpus. */
const PART = partitionRecords({ records: readFileSync(CRAWL, "utf8").trim().split("\n").map((l) => JSON.parse(l)), fileName: CRAWL.split(/[\\/]/).pop(), tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
SCOPE.recordPartition(PART.partition, { collectionKind: "CRAWL_BATCH", collectionRef: BATCH_ID });
console.log(`[partition: ${PART.records.length} of ${PART.partition.arithmetic.population} crawl records are this tenant's · remainder ${PART.partition.arithmetic.remainder}]`);
const records = PART.records;
const pages = records.filter((r) => r.record_type === "page");
const obsById = new Map(records.filter((r) => r.record_type === "observation").map((o) => [o.observation_id, o]));

/**
 * 🔴 THE CORPUS IS KEYED BY `observation_id`, NOT BY `page_id`.
 *
 * The first version of this looked bodies up by `page_id` and reported
 * "with a stored body: 0" — then labelled all 495 pages UNKNOWN and exited 0.
 * A wrong key produces a perfectly plausible clean run, which is why the
 * with-a-body count is printed beside the labels and asserted by a test: an
 * all-UNKNOWN census must never be mistakable for a finished one.
 *
 * 394 of 500 observations carry a body. The rest are redirects, robots-blocked
 * URLs and errors — no body was ever stored for them, so they are UNKNOWN for a
 * real reason rather than a lookup bug.
 */
const bodies = new Map();
for (const f of readdirSync(CORPUS).filter((f) => f.endsWith(".html") && PART.observationIds.has(f.replace(/\.html$/, "")))) {
  bodies.set(f.replace(/\.html$/, ""), readFileSync(join(CORPUS, f), "utf8"));
}
const bodyFor = (observations) => {
  for (const o of observations) {
    const b = bodies.get(o.observation_id);
    if (b != null) return b;
  }
  return null;
};

/* ---- the shared site context -------------------------------------------- */

const byHash = new Map();
for (const p of pages) {
  const o = (p.observations ?? []).map((id) => obsById.get(id)).find((x) => x?.content_sha256);
  if (!o) continue;
  if (!byHash.has(o.content_sha256)) byHash.set(o.content_sha256, []);
  byHash.get(o.content_sha256).push(p.canonical_url);
}

const openedAt = new Date().toISOString();
const CHECKS = [EXACT_DUPLICATE, NEAR_DUPLICATE]; /* RR-302: the owner's law, no word count — thin and template removed */

const findings = [];
/* RR-302 · the owner's law, no word count: HEAVY / BELOW_SIGNAL (a unique-word count against 350) are REMOVED — a page either has text of
 * its own (HAS_TEXT) or none (EMPTY), or it is UNKNOWN. No page is labelled by how many words it has. */
const labels = { HAS_TEXT: 0, EMPTY: 0, UNKNOWN: 0 };
const unknownReasons = {};
let withBody = 0;

for (const p of pages) {
  const observations = (p.observations ?? []).map((id) => obsById.get(id)).filter(Boolean);
  const bodyHtml = bodyFor(observations);
  if (bodyHtml != null) withBody += 1;

  const siteContext = {
    bodyHtml,
    byHash,
    corpusBodies: bodies,
    anchorObservationId: observations[0]?.observation_id ?? null,
    openedAt,
    inboundCount: (p.inbound_edges ?? []).length,
  };

  for (const check of CHECKS) {
    const f = await check.run({ page: p, observations, siteContext });
    if (f) findings.push(f);
  }

  /* ---- the three supply labels, and ONLY as supply ---------------------- */
  if (bodyHtml == null) {
    labels.UNKNOWN += 1;
    unknownReasons.NO_STORED_BODY = (unknownReasons.NO_STORED_BODY ?? 0) + 1;
    continue;
  }
  const m = measure(bodyHtml);
  if (!m.confident) {
    labels.UNKNOWN += 1;
    const r = m.reason ?? "UNRECOGNISED_LAYOUT";
    unknownReasons[r] = (unknownReasons[r] ?? 0) + 1;
    continue;
  }
  /* 🔴 the field is `bodyUniqueWordCount` — a missing field must throw, never fall through to a label (it once labelled everything) */
  if (typeof m.bodyUniqueWordCount !== "number") {
    throw new TypeError(`measure() returned no bodyUniqueWordCount for ${p.canonical_url} — refusing to label a page from a field that does not exist`);
  }
  if (m.bodyUniqueWordCount === 0) labels.EMPTY += 1;
  else labels.HAS_TEXT += 1;
}

/* ---- 🔴 THE GUARD, OVER THE REAL FINDINGS -------------------------------- */

const breaches = [];
for (const f of findings) {
  for (const field of RECOMMENDATION_FIELDS) {
    if (field in f) breaches.push({ issue: f.issue_class, url: f.canonical_url, field });
  }
  if (JSON.stringify(f).toLowerCase().includes("opportunity")) {
    breaches.push({ issue: f.issue_class, url: f.canonical_url, field: "the word 'opportunity'" });
  }
}

/* 🔴 APPEND-ONLY, THROUGH THE STORE'S ONE DEDUPE ENTRY POINT.
 * This used to OVERWRITE the whole file on every run. It could not duplicate —
 * but it was the one issue writer that was not append-only, and the
 * issue-writer census found it by construction where no hand-kept list had.
 * A re-run now adds a re-sighting per finding it has already stored. */
const store = createJsonlStore(OUT);
const writes = { appended: 0, resighted: 0, wouldWrite: 0 };
/* ONE governed decision for the whole set: the write law decides once per run whether this store may be written.
 * The store still decides appended-versus-re-sighting per finding, and its answer is still reported — routing may
 * not cost the operator information the run was already giving them. */
if (findings.length) {
  const args = governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store, records: findings, targetClass: "RUN_EVIDENCE",
    action: "APPEND_SUPPLY_LABEL_FINDINGS", occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
    discipline: "APPEND_IF_NEW", seenAt: openedAt,
  });
  const governed = executeGovernedWrite(args);
  if (governed.outcome === "REFUSED") writes.wouldWrite = findings.length;
  else if (governed.outcome === "COMMITTED" || governed.outcome === "ALREADY_COMMITTED") {
    for (const w of args.adapter.result ?? []) writes[w?.appended ? "appended" : "resighted"] += 1;
  } else {
    console.error(`🔴 ${governed.outcome} — the findings were not written; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  }
}
if (!permission.mayWrite) console.log(`[dry-run] would have written ${writes.wouldWrite} finding(s) → ${OUT} — nothing written, --confirm to write`);

/* ---- report --------------------------------------------------------------- */

console.log(`ITEM 8 — SUPPLY LABELS OVER THE REAL CORPUS\n`);
console.log(`corpus dir : ${CORPUS}`);
console.log(`pages      : ${pages.length}   with a stored body: ${withBody}`);
console.log(`[bound: shell definition = ${SHELL_DEFINITION}]`);
console.log(`[bound: no word count — a page has text of its own, or none (RR-302)]\n`);

console.log(`  HAS_TEXT ${String(labels.HAS_TEXT).padStart(4)}`);
console.log(`  EMPTY   ${String(labels.EMPTY).padStart(4)}`);
console.log(`  UNKNOWN ${String(labels.UNKNOWN).padStart(4)}   ${Object.entries(unknownReasons).map(([k, v]) => `${k}=${v}`).join("  ") || ""}`);
console.log(`  total   ${String(Object.values(labels).reduce((a, b) => a + b, 0)).padStart(4)}`);

console.log(`\n🔴 THESE NUMBERS SAY NOTHING ABOUT DEMAND.`);
console.log(`   They are a census of WHAT CONTENT EXISTS on pages we crawled. Not one of them`);
console.log(`   is evidence that anybody wants a page, that a page should be expanded, or`);
console.log(`   that an EMPTY one is an opportunity. No demand was measured, so none is reported.`);

console.log(`\nfindings: ${findings.length} → ${OUT}  (this run: ${writes.appended} new, ${writes.resighted} re-sighting(s))`);
const byClass = {};
for (const f of findings) byClass[`${f.issue_class}/${f.verdict}`] = (byClass[`${f.issue_class}/${f.verdict}`] ?? 0) + 1;
for (const k of Object.keys(byClass).sort()) console.log(`  ${k.padEnd(34)} ${byClass[k]}`);

console.log(`\nTHE ITEM 8 GUARD, over all ${findings.length} REAL findings:`);
console.log(`  forbidden fields hunted: ${RECOMMENDATION_FIELDS.join(", ")}, and the word "opportunity"`);
console.log(`  breaches: ${breaches.length}`);
for (const b of breaches.slice(0, 10)) console.log(`    🔴 ${b.issue} emitted ${b.field} on ${b.url}`);

process.exit(breaches.length ? 1 : 0);
