#!/usr/bin/env node
/**
 * ROW 61 — SAFE LOCAL PAGE CONSTRUCTION. Build a declared page spec of a declared product from its fact
 * registry, and ACCEPT it only if every frozen part of Gate A passes.
 *
 *   node bin/build-page.mjs --product=<id> --slug=<slug>                 judge one declared candidate
 *   node bin/build-page.mjs --product=<id> --all-slugs                   judge every declared candidate of ONE product
 *   node bin/build-page.mjs --product=<id> --slug=<slug> --out=<dir> --confirm   also write it, IF accepted
 *
 * 🔴 NOTHING IS PUBLISHED. An accepted candidate is written as an HTML file on this machine, inside this
 * repository, behind --confirm. No page is created in any product, no route, no sitemap entry, no deploy,
 * no production write.
 *
 * 🔴 NO SLUG, NO DEFAULT. A runner with neither --slug nor --all-slugs stops and says so, as --product
 * already does. It used to build one hard-coded spec and could not reach the second spec its own product
 * declares.
 *
 * 🔴 --all-slugs loops the declared specs of ONE product (owner ruling, 14 September 2026). Each candidate
 * is judged on its own and every refusal is recorded separately. No cross-product loop, no cohort, no batch
 * publish, no page-count target. It exists to produce the DATA GAP list, not output.
 *
 * 🔴 FAILS CLOSED. constructCandidates (src/page/construct.mjs) hands back HTML only for an ACCEPTED
 * candidate. A refused one has nothing to write; the run records its DATA GAP / REJECT / BLOCKED reasons and
 * exits 2. This runner used to print "TEXT AS BUILT (before Gate A)" and write the file anyway.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { selectCandidates, constructCandidates, ACCEPTED, NOT_TESTED } from "../src/page/construct.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

/**
 * 🔴 THE ONE AUTHORISED EXIT — EVERY EXIT FROM THIS MODULE DRAINS FIRST.
 *
 * `process.exit()` forces the process down "even if there are still asynchronous operations
 * pending ... including I/O operations to process.stdout", and writes to stdout ARE
 * asynchronous when stdout is a pipe — which is exactly what `spawnSync` gives a child, and
 * what CI runs everything through. So a runner that prints its verdict and exits immediately
 * can lose the tail of its own output, and the reader sees a truncated report with a correct
 * exit code: a result that looks complete and is not.
 *
 * 🔴 THIS IS CORRECTED AS AN UNSAFE PROPERTY IN ITS OWN RIGHT, NOT AS A PROVEN ROOT CAUSE.
 * It was found while investigating #99's intermittent CI failure; whether it caused that
 * failure is UNKNOWN and is not claimed here.
 *
 * Why a choke point rather than "drain the paths that print": reachability in JavaScript is
 * where "I cannot determine" multiplies — callbacks, dynamic dispatch, writes inside imported
 * helpers. One helper, every exit routed through it, and a guard that only has to scan for
 * `process.exit(` outside it. Correctness lives in one place instead of three, and the cost —
 * paths that printed nothing also drain — is nothing.
 *
 * 🔴 THE WAIT IS BOUNDED. `process.exitCode` is NOT used: it makes exit depend on the event
 * loop draining, so one stray handle turns a truncated run into a hanging one, and a build
 * binary that hangs is worse than one that truncates. The zero-length write's callback fires
 * after every earlier write has been handled (stream callbacks run in order), and the timer
 * is a floor under the worst case, not a substitute for the drain.
 */
const DRAIN_TIMEOUT_MS = 5000;
function exitAfterDrain(code) {
  let exited = false;
  const go = () => {
    if (exited) return;
    exited = true;
    process.exit(code);
  };
  const timer = setTimeout(go, DRAIN_TIMEOUT_MS);
  timer.unref?.();
  process.stdout.write("", go);
}

const USAGE = "node bin/build-page.mjs --product=<id> (--slug=<slug> | --all-slugs) [--out=<dir> --confirm]";
/* 🔴 F03 — the subject's data root is decided (RESOURCES.subject) BEFORE its descriptor or any of its files is read. */
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/build-page.mjs", governed: true, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? null;

let requested;
try {
  requested = selectCandidates(PRODUCT.pageSpecs, { slug: flag("slug"), allSlugs: argv.includes("--all-slugs") });
} catch (e) {
  console.error(`\n🔴 ${e.message}\n  usage: ${USAGE}\n`);
  exitAfterDrain(1);
}

const outDir = confineToRepo(flag("out"), { label: "--out" });
const permission = writePermission({ target: LOCAL, argv, env: process.env });
if (outDir) announceWritePermission(permission);

const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const verifiedInRegistry = records.filter((r) => r.verificationState === "VERIFIED").length;

const line = (ch = "─") => console.log(ch.repeat(78));
console.log(`\nSAFE LOCAL PAGE CONSTRUCTION — product ${PRODUCT.productId}`);
line("═");
console.log(`declared page specs   ${Object.keys(PRODUCT.pageSpecs).length}   requested ${requested.length}`);
console.log(`registry records      ${records.length}   VERIFIED ${verifiedInRegistry}`);
if (requested.length === 0) {
  console.log(`\n🔴 DATA GAP — ${PRODUCT.productId} declares no page spec. Nothing to construct, and nothing was.`);
  exitAfterDrain(2);
}

const results = constructCandidates({ pageSpecs: PRODUCT.pageSpecs, variants: PRODUCT.variants, records, requested });

for (const c of results) {
  console.log(`\n${c.verdict === ACCEPTED ? "✅" : "🔴"} ${c.slug} — ${c.verdict}`);
  line();
  console.log(`  template family: ${c.family.rendered} of ${c.family.declared} declared spec(s) rendered · shell ${c.family.shellSource} (${c.family.shellPages} page(s))`);
  if (c.renderedWords !== null) console.log(`  rendered words ${c.renderedWords}`);
  for (const [part, p] of Object.entries(c.parts)) {
    const measured = p.value === undefined ? "" : ` ${p.value}${p.threshold === undefined ? "" : ` (bar ${p.threshold})`}`;
    console.log(`  ${part.padEnd(12)} ${p.state}${measured}${p.reason ? ` — ${p.reason}` : ""}`);
  }
  for (const g of c.dataGaps) console.log(`  DATA GAP   ${g.part}: ${g.reason}`);
  for (const r of c.rejects) console.log(`  REJECT     ${r.part}: ${r.reason}`);
  for (const n of c.notTested) console.log(`  ${NOT_TESTED}  ${n.part}: ${n.reason}`);
  if (c.parts.facts.notVerified.length) console.log(`  cited but not VERIFIED: ${c.parts.facts.notVerified.join(" · ")}`);
  console.log(`  ${c.parts.whyThisUrl.notEnforced}`);
  console.log(`  ${c.pageOne.id} ${c.pageOne.state}: ${c.pageOne.statement} — missing: ${c.pageOne.missingGateFamilies.join(", ")}`);
  console.log(`  §5A fact text copied into the spec: ${c.copies.length} DETECTED · ${c.copiesNotTested.length} value(s) NOT TESTED · ${c.copiesFullyChecked} fully checked and clean`);
  for (const n of c.copiesNotTested) console.log(`    NOT TESTED  ${n.claimId} (${n.field}): ${n.reason}`);
}

const accepted = results.filter((c) => c.verdict === ACCEPTED);
console.log(`\nACCEPTED ${accepted.length} of ${results.length} candidate(s). A refusal is a result, not an error.`);

if (outDir) {
  for (const c of results) {
    if (c.html === null) {
      console.log(`[refused] nothing written for ${c.slug}`);
    } else {
      /* Routed. Two targets per candidate, two governed occurrences — a whole-file replacement is its own target,
       * so this is per-TARGET, not per-record. The bare mkdir is gone: the boundary's prepare step makes it. */
      const PAGE_INSTANT = governedInstant(Date.now());
      const outcomes = [
        [`${c.slug}.html`, c.html, "WRITE_CANDIDATE_PAGE"],
        [`${c.slug}.trace.json`, JSON.stringify(c.trace, null, 2) + "\n", "WRITE_CANDIDATE_TRACE"],
      ].map(([name, body, what]) => executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
        repo: REPO, permission, target: join(outDir, name), targetClass: "OPERATOR_CHOSEN_OUTPUT", bytes: body,
        action: what, occurredAt: PAGE_INSTANT, correlationId: `run:build-page:${PAGE_INSTANT}`,
      })));
      const bad = outcomes.find((o) => o.outcome !== "REFUSED" && o.outcome !== "COMMITTED" && o.outcome !== "ALREADY_COMMITTED");
      if (bad) {
        console.error(`🔴 ${bad.outcome} — ${c.slug} was not written; the governed attempt is on the audit trail`);
        process.exitCode = 1;
      } else if (outcomes.every((o) => o.outcome === "REFUSED")) {
        console.log(`[dry-run] would have written ${join(outDir, `${c.slug}.html`)} — ${permission.reason}`);
      } else {
        console.log(`wrote ${join(outDir, `${c.slug}.html`)} and its trace`);
      }
    }
  }
}
exitAfterDrain(accepted.length === results.length ? 0 : 2);
