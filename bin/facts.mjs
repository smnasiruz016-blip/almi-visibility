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

  console.log(`\nTHE TWO QUEUES — §4b`);
  line();
  console.log(`  AUTOMATED  ${c.byQueue.AUTOMATED}   fetch + machine quote-match. A cron job`);
  console.log(`  MANUAL     ${c.byQueue.MANUAL}   🔴 a person opens the page and looks`);
  const a = c.automatedQueue;
  console.log(
    `\n  DOD-03A PASS CONDITION — does the automated queue run UNATTENDED?  ${a.unattended ? "✅ YES" : "🔴 NO"}`,
  );
  console.log(`  measured over its ${a.automatedCount} records; ${a.blockers.length} need a person`);
  for (const b of a.blockers) console.log(`     🔴 ${b.id}: ${b.why}`);

  console.log(`\nTHE MANUAL QUEUE'S COST — a declaration for the owner, not a gate`);
  line();
  const cost = c.manualQueue.cost;
  console.log(`  facts in the manual queue      ${cost.facts}`);
  console.log(`  freshness window               ${cost.freshnessDays} days (⚠️ PROVISIONAL — nobody has measured how fast these sources change)`);
  console.log(`  human passes per year          ${cost.passesPerYear}`);
  console.log(`  per week                       ${cost.passesPerWeek}`);
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
