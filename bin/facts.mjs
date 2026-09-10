#!/usr/bin/env node
/**
 * THE FACT REGISTRY CLI.
 *
 *   node bin/facts.mjs validate            every law, over every record
 *   node bin/facts.mjs census              the supply, the queues, the cost, the gaps
 *   node bin/facts.mjs census --minutes-per-fact=12 --out runs/facts-census-01.json --confirm
 *
 * ── THE WRITE LAW APPLIES HERE, AND IT IS THE FIRST THING IN main() ─────────
 *
 * Reading and reporting need no flag. `--out` writes a file on this machine and
 * therefore needs `--confirm`; it is a LOCAL write and deliberately does NOT
 * need `ALLOW_PROD_WRITE`, because a flag spent on a JSON report is a flag that
 * has stopped meaning anything by the day it stands between somebody and
 * production.
 *
 * Nothing here writes to a database, and no database table exists.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { loadRegistry, census, REGISTRY_FACT_CHECK_COUNT } from "../src/facts/registry.mjs";
import { queueReason } from "../src/facts/queues.mjs";

const argv = process.argv.slice(2);
const command = argv[0] ?? "census";
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? null;

const pad = (s, n) => String(s).padEnd(n);
const line = (ch = "─") => console.log(ch.repeat(78));

function reportValidation(v) {
  console.log(`\nVALIDATION — ${v.total} records`);
  line();
  if (v.valid) {
    console.log("✅ every record satisfies every law in src/facts/validate.mjs");
    return true;
  }
  for (const rec of v.invalidRecords) {
    console.log(`\n🔴 ${rec.id}`);
    for (const e of rec.errors) console.log(`     [${e.law}] ${e.message}`);
  }
  for (const e of v.registryErrors) console.log(`\n🔴 REGISTRY [${e.law}] ${e.message}`);
  console.log(`\n🔴 ${v.invalidRecords.length} invalid record(s), ${v.registryErrors.length} registry-level error(s)`);
  return false;
}

function reportCensus(c) {
  console.log(`\nVERIFIED FACT REGISTRY — census ${c.generatedOn}`);
  line("═");
  console.log(`records: ${c.total}   (files on disk, in git. 🔴 NO DATABASE TABLE EXISTS)`);

  console.log(`\nBY SUBJECT`);
  for (const [k, n] of Object.entries(c.bySubject).sort((a, b) => b[1] - a[1])) console.log(`  ${pad(k, 26)} ${n}`);
  console.log(`\nBY SCOPE      ${Object.entries(c.byScope).map(([k, n]) => `${k}=${n}`).join("  ")}`);
  console.log(`BY TIER       ${Object.entries(c.byTier).map(([k, n]) => `tier ${k}=${n}`).join("  ")}`);
  console.log(`BY STATUS     ${Object.entries(c.byStatus).map(([k, n]) => `${k}=${n}`).join("  ")}`);

  console.log(`\nTHE THREE DATES — counted apart, never summed into "verified"`);
  line();
  console.log(`  linkCheckedOn   pass on ${c.checks.linkChecked}/${c.total}   — the URL opened. SAYS NOTHING ABOUT THE CLAIM`);
  console.log(`  quoteMatchedOn  pass on ${c.checks.quoteMatched}/${c.total}   — the span is still verbatim on the page`);
  console.log(`                  not-applicable on ${c.checks.quoteNotApplicable}  — lawfully not attempted, NOT a broken source`);
  console.log(`                  could-not-check on ${c.checks.couldNotCheck}   — a third outcome. Not a pass, not a failure`);
  console.log(`  🔴 factCheckedOn  ${c.checks.factChecked}/${c.total}   — NOBODY HAS READ AND JUDGED A SINGLE RECORD`);
  if (c.checks.factChecked !== REGISTRY_FACT_CHECK_COUNT) {
    console.log(`  🔴🔴 factChecked is ${c.checks.factChecked}, and REGISTRY_FACT_CHECK_COUNT says ${REGISTRY_FACT_CHECK_COUNT}.`);
    console.log(`       This counter does not drift upward. Edit the constant deliberately, with its test.`);
  }

  console.log(`\nGATE A, USING THE GATE'S OWN COUNTING CODE`);
  line();
  console.log(`  qualifying ${c.gateA.qualifying}/${c.gateA.total}   linkChecked ${c.gateA.linkChecked}   factChecked ${c.gateA.factChecked}`);
  console.log(`  ⚠️ the date handed to the gate is a MACHINE-CHECK date, not a verified date — see toGateAFact()`);
  if (c.gateA.rejected.length) {
    console.log(`  rejected by the gate: ${c.gateA.rejected.length}`);
    for (const r of c.gateA.rejected.slice(0, 8)) console.log(`     - ${r.reasons.join("; ")}`);
  }

  console.log(`\nWHAT EACH LICENCE PERMITS — read first-hand, never inferred from a domain`);
  line();
  for (const [k, n] of Object.entries(c.byLicence).sort((a, b) => b[1] - a[1])) console.log(`  ${pad(k, 30)} ${n}`);
  console.log(`  document classes:  ${Object.entries(c.byDocumentClass).map(([k, n]) => `${k}=${n}`).join("  ")}`);
  console.log(`  🔴 quotability is DERIVED from (licence × document class). The NMC grants for`);
  console.log(`     guidance what clause 6.2 refuses for everything else ON THE SAME DOMAIN.`);

  const q = c.quoteUsability;
  console.log(`\n🔴 MAY THESE QUOTES BE USED TODAY? — a LICENCE question, not a freshness one`);
  line();
  console.log(`  usable now                 ${q.usable.length}`);
  console.log(`  🔴 WITHDRAWN                ${q.withdrawn.length}   the permission lapsed — an out-of-licence reproduction, not a stale fact`);
  console.log(`  never quotable             ${q.neverQuotable.length}   the licence never permitted a stored quote. Facts held in our own words`);
  for (const w of q.withdrawn) console.log(`     🔴 ${w.id}\n        ${w.reason}`);

  console.log(`\nTHE TWO QUEUES — §4b`);
  line();
  console.log(`  AUTOMATED  ${c.byQueue.AUTOMATED}   a machine can reach the page unattended`);
  console.log(`  MANUAL     ${c.byQueue.MANUAL}   🔴 a person opens the page and looks`);
  console.log(`\n  WHICH CHECK WATCHES EACH — and the two are NOT equal evidence:`);
  console.log(`    machine-quote-match  ${c.byFreshnessRule["machine-quote-match"] ?? 0}   STRONG — the exact wording carrying the value is still there`);
  console.log(`    machine-fingerprint  ${c.byFreshnessRule["machine-fingerprint"] ?? 0}   WEAK — only that the page did not move. Stores no words`);
  console.log(`    human-re-read        ${c.byFreshnessRule["human-re-read"] ?? 0}`);
  const a = c.automatedQueue;
  console.log(
    `\n  DOD-03A PASS CONDITION — does the automated queue run UNATTENDED?  ${a.unattended ? "✅ YES" : "🔴 NO"}`,
  );
  console.log(`  measured over its ${a.automatedCount} records; ${a.blockers.length} need a person`);
  for (const b of a.blockers) console.log(`     🔴 ${b.id}: ${b.why}`);

  console.log(`\nTHE MANUAL QUEUE'S COST — a declaration for the owner, not a gate`);
  line();
  const cost = c.manualQueue.cost;
  if (cost.facts === 0) {
    // 🔴 AN EMPTY POPULATION IS A FINDING, NOT A PASS. Every number below is
    // zero because there is nothing to count, and a zero that means "nothing was
    // measured" must never be read as "nothing to worry about". The human work
    // did not disappear — it moved into the fingerprint population, whose bounds
    // are printed underneath.
    console.log(`  🔴 THE MANUAL QUEUE IS EMPTY, so every figure in this block is a`);
    console.log(`     VACUOUS ZERO. Every source in the registry is machine-fetchable.`);
    console.log(`     Read the FLOOR/CEILING below instead — that is where the human cost went.`);
  }
  console.log(`  facts in the manual queue      ${cost.facts}`);
  console.log(`  freshness window               ${cost.freshnessDays} days (⚠️ PROVISIONAL — nobody has measured how fast these sources change)`);
  console.log(`  human passes per year          ${cost.passesPerYear}`);
  console.log(`  per week                       ${cost.passesPerWeek}`);
  // 🔴 The cost that MOVED rather than vanished when the fingerprint arrived.
  console.log(`\n  ⚠️ AND THE COST THAT MOVED RATHER THAN DISAPPEARED:`);
  console.log(`     ${cost.fingerprintWatched} records left the manual queue when fingerprinting arrived. The human work`);
  console.log(`     attached to them did NOT leave with them — it changed TRIGGER.`);
  console.log(`     human passes/year   FLOOR ${cost.humanPassesPerYearFloor}   CEILING ${cost.humanPassesPerYearCeiling}`);
  console.log(`     ${cost.boundsNote}`);
  console.log(`  minutes per pass               ${cost.minutesPerFact ?? "UNKNOWN"}`);
  console.log(`    ${cost.minutesStatus}`);
  if (cost.hoursPerYear !== null) console.log(`  hours per year                 ${cost.hoursPerYear}`);
  console.log(`\n  why each one is in the expensive queue:`);
  for (const r of cost.byReason) console.log(`     ${pad(r.count, 4)} ${r.reason}`);

  if (c.overdue.length) {
    console.log(`\n🔴 OVERDUE — past the ${cost.freshnessDays}-day window today`);
    line();
    for (const o of c.overdue) console.log(`  ${pad(o.id, 46)} last touched ${o.lastTouched ?? "never"} (${o.age ?? "?"} days)`);
  }

  console.log(`\n🔴 DECLARED GAPS — claims a page NEEDS and this registry DOES NOT HAVE`);
  line();
  console.log(`  ${c.gaps.length} known-missing claims. Counted here because the alternative to`);
  console.log(`  declaring a gap is inventing a plausible value to fill it.`);
  for (const g of c.gaps) {
    console.log(`\n  ${g.claim}`);
    console.log(`     needed by  ${g.neededBy}`);
    console.log(`     blocked by ${g.blockedBy}`);
  }
  line("═");
}

async function main() {
  const { files, records } = await loadRegistry();
  const out = flag("out");

  // 🔴 THE WRITE LAW, BEFORE ANYTHING CAN WRITE.
  const permission = writePermission({ target: LOCAL, argv, env: process.env });
  if (out) announceWritePermission(permission);

  const minutes = flag("minutes-per-fact");
  const c = census(records, { minutesPerFact: minutes === null ? null : Number(minutes) });

  console.log(`loaded ${records.length} records from ${files.length} files: ${files.join(", ")}`);

  let ok = true;
  if (command === "validate") {
    ok = reportValidation(c.validation);
  } else if (command === "census") {
    ok = reportValidation(c.validation);
    reportCensus(c);
  } else {
    console.error(`unknown command ${JSON.stringify(command)} — expected validate or census`);
    process.exit(2);
  }

  if (out) {
    if (!permission.mayWrite) {
      console.log(`\n[dry-run] would have written ${out} — ${permission.reason}`);
    } else {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(c, null, 2) + "\n", "utf8");
      console.log(`\nwrote ${out}`);
    }
  }

  // A validation failure is a red exit. A census of a valid registry is not
  // made red by the gaps it declares — a declared gap is the report working.
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
