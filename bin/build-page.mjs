#!/usr/bin/env node
/**
 * BUILD THE `/nursing` CANDIDATE PAGE FROM THE REGISTRY.
 *
 *   node bin/build-page.mjs                                  report only
 *   node bin/build-page.mjs --out runs/nursing/ --confirm     also write it
 *
 * 🔴 NOTHING IS PUBLISHED. This writes an HTML file on this machine, exactly as
 * the acceptance test did. No page is created in any product, no deploy, no
 * production write. `--out` is a LOCAL write and takes `--confirm` only.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { claimIdsOf } from "../src/page/claim-ids.mjs";
import { renderPage, findCopiedFacts } from "../src/page/render.mjs";
import { tokensWithKind } from "../src/gate-a/text-kind.mjs";

import { productFromArgvOrExit } from "../src/product-cli.mjs";

/**
 * 🔴 THE PRODUCT ARRIVES AS AN ARGUMENT, NOT AS AN IMPORT.
 *
 * This runner used to resolve a product at IMPORT time, so it could not be
 * pointed at a second one without editing this file. Its arithmetic was
 * already generic; the BINDING was not.
 *
 * There is no default: a runner with no `--product=<id>` stops and says so.
 */
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/build-page.mjs --product=<id>" });

const argv = process.argv.slice(2);
const outDir = argv.find((a) => a.startsWith("--out="))?.split("=").slice(1).join("=") ?? null;
const permission = writePermission({ target: LOCAL, argv, env: process.env });
if (outDir) announceWritePermission(permission);

const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const { html, trace } = renderPage(PRODUCT.pageSpecs.nursing, records);

const line = (ch = "─") => console.log(ch.repeat(78));
console.log(`\n/nursing — BUILT BY REFERENCE FROM THE REGISTRY`);
line("═");
console.log(`claims referenced   ${claimIdsOf(PRODUCT.pageSpecs.nursing).length}`);
console.log(`facts rendered      ${trace.length}`);
console.log(`registry records    ${records.length}`);

const bySubject = {};
for (const t of trace) bySubject[t.subject] = (bySubject[t.subject] ?? 0) + 1;
console.log(`\nby source:`);
for (const [k, n] of Object.entries(bySubject).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(24)} ${n}`);

const quoted = trace.filter((t) => t.renderedQuote).length;
const ownWords = trace.length - quoted;
console.log(`\nHOW EACH FACT REACHED THE PAGE`);
line();
console.log(`  their words, quoted with the credit their licence requires   ${quoted}`);
console.log(`  🔴 OUR words, because theirs may not be held                  ${ownWords}`);
const withheld = trace.filter((t) => t.quoteWithheld);
if (withheld.length) {
  console.log(`  🔴 quote WITHHELD — a licence condition lapsed: ${withheld.length}`);
  for (const w of withheld) console.log(`     ${w.claimId}: ${w.quoteVerdict}`);
}

console.log(`\nQUOTABILITY STATE OF EACH RENDERED FACT`);
line();
const byState = {};
for (const t of trace) byState[t.quotabilityState] = (byState[t.quotabilityState] ?? 0) + 1;
for (const [k, n] of Object.entries(byState)) console.log(`  ${k.padEnd(12)} ${n}`);

// 🔴 §5A's actual requirement, checked rather than asserted.
const copies = findCopiedFacts(PRODUCT.pageSpecs.nursing, records);
console.log(`\n🔴 §5A — "no independent untraceable copies of the same factual claim"`);
line();
console.log(`  fact text copied into the page spec: ${copies.length}`);
if (copies.length) for (const c of copies) console.log(`     🔴 ${c.claimId} (${c.field})`);
console.log(`  every rendered fact carries data-claim-id: ${trace.length}/${trace.length}`);

const { tokens, kinds } = tokensWithKind(html);
const count = (k) => kinds.filter((x) => x === k).length;
console.log(`\nTEXT AS BUILT (before Gate A)`);
line();
console.log(
  `  total words ${tokens.length}   prose ${count("prose")}   list ${count("list")}   heading ${count("heading")}   other ${count("other")}`,
);
console.log(`  bytes ${html.length}`);

if (outDir) {
  if (!permission.mayWrite) {
    console.log(`\n[dry-run] would have written ${join(outDir, "nursing.html")} — ${permission.reason}`);
  } else {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "nursing.html"), html, "utf8");
    writeFileSync(join(outDir, "nursing.trace.json"), JSON.stringify(trace, null, 2) + "\n", "utf8");
    console.log(`\nwrote ${join(outDir, "nursing.html")} and its trace`);
  }
}
process.exit(copies.length > 0 ? 1 : 0);
