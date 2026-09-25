#!/usr/bin/env node
/**
 * THE NIGHTLY QUOTE MATCH — the automated queue's whole job.
 *
 *   node bin/quote-match.mjs
 *   node bin/quote-match.mjs --out runs/quote-match-01.json --confirm
 *
 * ── THIS IS THE THING DOD-03A ACTUALLY TESTS ────────────────────────────────
 *
 * §4b's pass condition is not "a design for an automated queue". It is:
 *
 *   🔴 THE AUTOMATED QUEUE MUST GENUINELY RUN UNATTENDED.
 *   Not "mostly". Not "with a nudge".
 *
 * So this takes no input, asks no questions, needs no flag to do its work, and
 * exits with a code a cron job can act on. If it ever needs a person to run it,
 * the queue is not automated and DOD-03A does not pass.
 *
 * ── AND IT REPORTS THREE OUTCOMES, NEVER TWO ────────────────────────────────
 *
 *   pass              the span is still verbatim on the page
 *   fail              🔴 IT IS NOT — one record is flagged and a person looks
 *   could-not-check   the check could not run at all. NOT a failure
 *   not-applicable    the licence forbids a stored quote. NOT a broken source
 *
 * A 403 collapsing into "fail" would make four regulators look like they had
 * silently rewritten their pages. A 403 collapsing into "pass" would be worse.
 * Both are lies and the exit code below keeps them apart: a FAIL is red because
 * a person must act; a COULD-NOT-CHECK is reported loudly and is not red,
 * because nothing about the fact has changed and there is nothing to fix.
 *
 * ── WHAT IT NEVER DOES ──────────────────────────────────────────────────────
 *
 * It never writes `factCheckedOn`. A passing quote match establishes that this
 * string is on this page today. It does not establish that the string supports
 * the value, or that it is in context. Only a person reading it does that.
 *
 * It never edits a fact file. The machine PROPOSES an outcome; a human reviews
 * it in a PR and the file records it. The day that stops being fast enough is
 * the day a table starts earning itself (FACT_CACHE_DESIGN.md §5) — and on that
 * day the Neon branch comes first, in both its halves.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { runQuoteMatch } from "../src/facts/quote-match.mjs";

import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { openConnector } from "../src/tenancy/connectors.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

/**
 * 🔴 THE PRODUCT ARRIVES AS AN ARGUMENT, NOT AS AN IMPORT.
 *
 * This runner used to resolve a product at IMPORT time, so it could not be
 * pointed at a second one without editing this file. Its arithmetic was
 * already generic; the BINDING was not.
 *
 * There is no default: a runner with no `--product=<id>` stops and says so.
 */
/* 🔴 F03 — the subject's data root is decided (RESOURCES.subject) BEFORE its descriptor or any of its files is read. */
const PRODUCT_ID = productIdOrExit(process.argv, { usage: "node bin/quote-match.mjs --product=<id>" });

/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/quote-match.mjs", governed: true, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.connector(PRODUCT_ID, "CITED_SOURCES")] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/quote-match.mjs --product=<id>", scope: SCOPE });
const argv = process.argv.slice(2);
const out = argv.find((a) => a.startsWith("--out="))?.split("=").slice(1).join("=") ?? null;

const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const permission = writePermission({ target: LOCAL, argv, env: process.env });
if (out) announceWritePermission(permission);

console.log(`\nNIGHTLY QUOTE MATCH — ${records.length} records in the registry`);
console.log("─".repeat(78));

/* 🔴 F03 — the sources are fetched only through the CITED_SOURCES connector the run's decision allowed. */
const CONNECTOR = openConnector({ scope: SCOPE, subjectId: PRODUCT_ID, kind: "CITED_SOURCES" });
const report = await runQuoteMatch(records, { fetchImpl: CONNECTOR.fetch });

console.log(`fetched ${report.urlsFetched} distinct URLs\n`);
for (const r of report.results.sort((a, b) => a.id.localeCompare(b.id))) {
  const mark = { pass: "✅", fail: "🔴", "could-not-check": "⚠️ ", "not-applicable": "  " }[r.outcome];
  console.log(`${mark} ${r.outcome.padEnd(16)} ${r.id}`);
  if (r.outcome !== "pass") console.log(`     ${r.detail}`);
}

console.log("\n" + "─".repeat(78));
console.log(
  `pass ${report.tally.pass}   🔴 fail ${report.tally.fail}   ⚠️ could-not-check ${report.tally["could-not-check"]}   not-applicable ${report.tally["not-applicable"]}`,
);
console.log(`weak passes (span not anchored to one sentence): ${report.ambiguous.length}`);

if (report.ambiguous.length) {
  console.log(`\n⚠️  ${report.ambiguous.length} span(s) occur MORE THAN ONCE on their page. The match passed and nothing`);
  console.log(`   is known to have changed — but the span is not anchored to the sentence carrying`);
  console.log(`   the value, so this check could keep passing after that sentence was deleted:`);
  for (const r of report.ambiguous) console.log(`   ${r.id} — found ${r.occurrences}×`);
}

if (report.flaggedForAPerson.length) {
  console.log(`\n🔴 ${report.flaggedForAPerson.length} record(s) need a person — the source changed under them:`);
  for (const r of report.flaggedForAPerson) console.log(`   ${r.id}`);
}
if (report.inconclusive.length) {
  console.log(`\n⚠️  ${report.inconclusive.length} record(s) could not be checked. THIS IS NOT A FAILURE and nothing about`);
  console.log(`   the facts has changed. Recorded as a cost, not routed around:`);
  for (const r of report.inconclusive) console.log(`   ${r.id} — ${r.detail}`);
}

if (out) {
  /* Routed by a BYTE-PRESERVING edit: this file holds 115 CRLF lines and one bare LF, and every ordinary patch
   * mechanism here normalises before matching and restores one style on write — which would have rewritten 116
   * lines to change four. The bare LF is untouched. TEXT, measured: the body is a JSON.stringify. */
  const QM_INSTANT = governedInstant(Date.now());
  const governed = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
    repo: REPO, permission, target: out, targetClass: "RUN_EVIDENCE",
    bytes: JSON.stringify(report, null, 2) + "\n",
    action: "WRITE_QUOTE_MATCH_REPORT", occurredAt: QM_INSTANT, correlationId: `run:quote-match:${QM_INSTANT}`,
  }));
  if (governed.outcome === "REFUSED") console.log(`\n[dry-run] would have written ${out} — ${permission.reason}`);
  else if (governed.outcome === "COMMITTED" || governed.outcome === "ALREADY_COMMITTED") console.log(`\nwrote ${out}`);
  else {
    console.error(`🔴 ${governed.outcome} — ${out} was not written; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  }
}

// Red ONLY on a real failure. See the header.
process.exit(report.tally.fail > 0 ? 1 : 0);
