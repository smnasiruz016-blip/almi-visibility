#!/usr/bin/env node
/**
 * ITEM 8 — HEAVY / THIN / EMPTY over the REAL corpus, and the guard that keeps
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

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { EXACT_DUPLICATE, THIN_CONTENT, NEAR_DUPLICATE, TEMPLATE_DOMINANCE, RECOMMENDATION_FIELDS } from "../src/audit/content-checks.mjs";
import { measure, SHELL_DEFINITION, THIN_UNIQUE_WORD_FLOOR } from "../src/audit/shell.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const CORPUS = arg("corpus", null);
const CRAWL = arg("crawl", `${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`);
const OUT = arg("out", `${REPO}runs/audit/supply-labels.jsonl`);

/* ---- the corpus ---------------------------------------------------------- */

if (!CORPUS || !existsSync(CORPUS)) {
  console.error("🔴 NO CORPUS. --corpus=<dir> must point at the unpacked crawl-corpus artifact.");
  console.error("   The committed crawl records carry no page bodies (see their inventory_note).");
  console.error("   Refusing to run: a supply census over zero pages is not a clean result, and");
  console.error("   LAW-ABSENT-1 — a failure to read is never a finding about the pages.");
  process.exit(2);
}

const records = readFileSync(CRAWL, "utf8").trim().split("\n").map((l) => JSON.parse(l));
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
for (const f of readdirSync(CORPUS).filter((f) => f.endsWith(".html"))) {
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
const CHECKS = [EXACT_DUPLICATE, THIN_CONTENT, NEAR_DUPLICATE, TEMPLATE_DOMINANCE];

const findings = [];
const labels = { HEAVY: 0, THIN: 0, EMPTY: 0, UNKNOWN: 0 };
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
  /**
   * 🔴 THE FIELD IS `bodyUniqueWordCount`, AND READING THE WRONG ONE IS SILENT.
   *
   * This first read `m.uniqueWords`, which `measure()` does not return. It was
   * `undefined`, `undefined < 350` is `false`, and so **every page fell through
   * to HEAVY**: 387 HEAVY, 0 THIN, and a census that looked entirely healthy.
   *
   * Nothing threw. What caught it was that the SAME RUN's `thin-content` check
   * fired 118 times while this census reported 0 — two counters over one corpus
   * disagreeing. That is why both are printed side by side below and why a test
   * asserts they agree: a lone counter has nothing to be wrong against.
   */
  const words = m.bodyUniqueWordCount;
  if (typeof words !== "number") {
    throw new TypeError(
      `measure() returned no bodyUniqueWordCount for ${p.canonical_url} — refusing to label a page ` +
        "from a field that does not exist. A missing field silently labels everything HEAVY.",
    );
  }
  if (words === 0) labels.EMPTY += 1;
  else if (words < THIN_UNIQUE_WORD_FLOOR) labels.THIN += 1;
  else labels.HEAVY += 1;
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

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, findings.map((f) => JSON.stringify(f)).join("\n") + (findings.length ? "\n" : ""), "utf8");

/* ---- report --------------------------------------------------------------- */

console.log(`ITEM 8 — SUPPLY LABELS OVER THE REAL CORPUS\n`);
console.log(`corpus dir : ${CORPUS}`);
console.log(`pages      : ${pages.length}   with a stored body: ${withBody}`);
console.log(`[bound: shell definition = ${SHELL_DEFINITION}]`);
console.log(`[bound: thin floor = ${THIN_UNIQUE_WORD_FLOOR} unique words, AFTER shell subtraction]\n`);

console.log(`  HEAVY   ${String(labels.HEAVY).padStart(4)}`);
console.log(`  THIN    ${String(labels.THIN).padStart(4)}`);
console.log(`  EMPTY   ${String(labels.EMPTY).padStart(4)}`);
console.log(`  UNKNOWN ${String(labels.UNKNOWN).padStart(4)}   ${Object.entries(unknownReasons).map(([k, v]) => `${k}=${v}`).join("  ") || ""}`);
console.log(`  total   ${String(Object.values(labels).reduce((a, b) => a + b, 0)).padStart(4)}`);

console.log(`\n🔴 THESE NUMBERS SAY NOTHING ABOUT DEMAND.`);
console.log(`   They are a census of WHAT CONTENT EXISTS on pages we crawled. Not one of them`);
console.log(`   is evidence that anybody wants a page, that a THIN page should be expanded, or`);
console.log(`   that an EMPTY one is an opportunity. No demand was measured, so none is reported.`);

/**
 * 🔴 THE CROSS-CHECK. The census above and the `thin-content` check below count
 * the same thing by different routes. They must agree, and when they did not it
 * was the census that was wrong.
 */
const thinFails = findings.filter((f) => f.issue_class === "thin-content" && f.verdict === "FAIL").length;
const agree = thinFails === labels.THIN;
console.log(`\nCROSS-CHECK — two counters over one corpus`);
console.log(`  census THIN          : ${labels.THIN}`);
console.log(`  thin-content FAILs   : ${thinFails}`);
console.log(`  ${agree ? "they agree" : "🔴 THEY DISAGREE — one of them is wrong, and neither number may be quoted"}`);

console.log(`\nfindings written: ${findings.length} → ${OUT}`);
const byClass = {};
for (const f of findings) byClass[`${f.issue_class}/${f.verdict}`] = (byClass[`${f.issue_class}/${f.verdict}`] ?? 0) + 1;
for (const k of Object.keys(byClass).sort()) console.log(`  ${k.padEnd(34)} ${byClass[k]}`);

console.log(`\nTHE ITEM 8 GUARD, over all ${findings.length} REAL findings:`);
console.log(`  forbidden fields hunted: ${RECOMMENDATION_FIELDS.join(", ")}, and the word "opportunity"`);
console.log(`  breaches: ${breaches.length}`);
for (const b of breaches.slice(0, 10)) console.log(`    🔴 ${b.issue} emitted ${b.field} on ${b.url}`);

process.exit(breaches.length ? 1 : 0);
