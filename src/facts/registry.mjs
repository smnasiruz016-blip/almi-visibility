/**
 * THE REGISTRY — loading the fact files, and counting what is actually in them.
 *
 * §5A.1 is blunt about what this has to clear:
 *
 *   🔴 "A REGISTRY SCHEMA WITH ZERO USABLE SUPPLY IS NOT PASS."
 *
 * So a schema and a validator are not the deliverable. The deliverable is
 * records, and `census()` exists to make the supply countable rather than
 * assertable — including counting the things that are MISSING.
 */
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { queueFor, queueReason, manualQueueCost, automatedQueueIsUnattended, freshnessRuleFor } from "./queues.mjs";
import { quoteUsability } from "./freshness.mjs";
import { quotabilityState } from "./licences.mjs";
import { validateRegistry } from "./validate.mjs";
import { FACT_FRESHNESS_DAYS } from "./schema.mjs";
import { countFacts } from "../gate-a/facts.mjs";
import { DECLARED_GAPS } from "./gaps.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const FACTS_DIR = join(HERE, "..", "..", "facts");

/**
 * Load every fact file. Files beginning with `_` are not facts.
 *
 * ⚠️ ORDER IS SORTED, NOT DIRECTORY ORDER, so two runs on two machines produce
 * the same report and a diff of two reports means something.
 */
export async function loadRegistry(dir = FACTS_DIR) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".mjs") && !f.startsWith("_"))
    .sort();
  const records = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(dir, file)).href);
    const exported = mod.default;
    if (!Array.isArray(exported)) throw new Error(`facts/${file} must default-export an array of records`);
    for (const r of exported) records.push({ ...r, _file: file });
  }
  return { files, records };
}

/**
 * ── THE BRIDGE TO GATE A, AND IT IS DELIBERATELY UNCOMFORTABLE ──────────────
 *
 * Gate A counts a fact when it has a value, a source URL, a tier and a verified
 * date. A registry record has THREE dates and none of them is a verified date
 * in Gate A's sense, because `factCheckedOn` is null on every record here.
 *
 * 🔴 SO WHAT IS PASSED AS `verifiedDate` IS A MACHINE-CHECK DATE, AND THIS
 * FUNCTION SAYS SO OUT LOUD RATHER THAN QUIETLY SUPPLYING ONE. It is the most
 * recent date on which a machine confirmed the source opens, or that the span is
 * still there. It is evidence that the citation is live. IT IS NOT EVIDENCE
 * THAT ANYBODY READ IT.
 *
 * Gate A's own `factChecked` column stays 0 through this bridge, which is the
 * correct answer and not a limitation of the bridge — see `countFacts`, whose
 * two columns exist precisely so that this cannot be blurred.
 *
 * The alternative was to map `factCheckedOn` and let every record fail Gate A
 * for having no date. That is arguably more honest still, and it was rejected
 * for one reason: it would make the freshness window untestable, and a window
 * nothing can be measured against is the decorative kind this project keeps
 * finding. The compromise is that the date is passed and its meaning is
 * NEVER upgraded — no caller of this function may print the word "verified".
 */
export function toGateAFact(record) {
  const machineCheckDate = [record?.checks?.linkCheckedOn, record?.checks?.quoteMatchedOn].filter(Boolean).sort().at(-1) ?? null;
  return {
    value: record?.value?.value,
    sourceUrl: record?.source?.url,
    tier: record?.source?.tier,
    verifiedDate: machineCheckDate,
    linkChecked: record?.checks?.linkCheckOutcome === "pass",
    inShell: false,
    _machineCheckDateOnly: true,
  };
}

/** Days between two ISO dates, or null. */
function ageInDays(iso, now) {
  if (typeof iso !== "string") return null;
  return Math.floor((now.getTime() - new Date(iso + "T00:00:00Z").getTime()) / 86_400_000);
}

/**
 * The census. Everything DOD-03A asks to be shown, and the gaps as well.
 */
export function census(records = [], { now = new Date(), minutesPerFact = null } = {}) {
  const validation = validateRegistry(records);

  const byQueue = { AUTOMATED: [], MANUAL: [] };
  for (const r of records) byQueue[queueFor(r)].push(r);

  const byStatus = {};
  const byTier = {};
  const bySubject = {};
  const byScope = {};
  for (const r of records) {
    byStatus[r?.life?.status] = (byStatus[r?.life?.status] ?? 0) + 1;
    byTier[r?.source?.tier] = (byTier[r?.source?.tier] ?? 0) + 1;
    bySubject[r?.claim?.subject] = (bySubject[r?.claim?.subject] ?? 0) + 1;
    byScope[r?.scope] = (byScope[r?.scope] ?? 0) + 1;
  }

  // 🔴 The three dates, counted apart. They are never summed into "verified".
  const checks = {
    linkChecked: records.filter((r) => r?.checks?.linkCheckOutcome === "pass").length,
    quoteMatched: records.filter((r) => r?.checks?.quoteMatchOutcome === "pass").length,
    quoteNotApplicable: records.filter((r) => r?.checks?.quoteMatchOutcome === "not-applicable").length,
    couldNotCheck: records.filter(
      (r) => r?.checks?.linkCheckOutcome === "could-not-check" || r?.checks?.quoteMatchOutcome === "could-not-check",
    ).length,
    // 🔴 ZERO, AND IT IS SUPPOSED TO BE ZERO. Not one record in this registry
    // has been read and judged by a named person. See REGISTRY_FACT_CHECK_COUNT.
    factChecked: records.filter((r) => r?.checks?.factCheckedOn !== null).length,
  };

  // Freshness measured against the real clock, not assumed from the window.
  const overdue = records
    .map((r) => {
      const newest = [r?.checks?.linkCheckedOn, r?.checks?.quoteMatchedOn, r?.life?.extractedOn].filter(Boolean).sort().at(-1) ?? null;
      return { id: r.id, queue: queueFor(r), lastTouched: newest, age: ageInDays(newest, now) };
    })
    .filter((x) => x.age === null || x.age > FACT_FRESHNESS_DAYS);

  const byLicence = {};
  const byDocumentClass = {};
  const byFreshnessRule = {};
  // 🔴 RESERVED and PROHIBITED are counted APART, though both stop a quote.
  // One is closed by an email to a regulator; the other by nothing short of the
  // licensor changing their mind. A single "not quotable" number would have made
  // those look like the same piece of work forever.
  const byQuotabilityState = { PERMITTED: 0, RESERVED: 0, PROHIBITED: 0, UNREAD: 0 };
  for (const r of records) {
    byQuotabilityState[quotabilityState(r?.licence)] += 1;
    byLicence[r?.licence] = (byLicence[r?.licence] ?? 0) + 1;
    byDocumentClass[r?.sourceDocumentClass] = (byDocumentClass[r?.sourceDocumentClass] ?? 0) + 1;
    byFreshnessRule[freshnessRuleFor(r)] = (byFreshnessRule[freshnessRuleFor(r)] ?? 0) + 1;
  }

  return {
    generatedOn: now.toISOString().slice(0, 10),
    total: records.length,
    validation,
    byQueue: { AUTOMATED: byQueue.AUTOMATED.length, MANUAL: byQueue.MANUAL.length },
    byQuotabilityState,
    byLicence,
    byDocumentClass,
    byFreshnessRule,
    // 🔴 Which quotes may lawfully be used TODAY. Kept apart from freshness on
    // purpose: for a licence whose permission is conditional on currency, an
    // expired record is not a stale fact, it is an out-of-licence reproduction.
    quoteUsability: quoteUsability(records, now),
    byStatus,
    byTier,
    byScope,
    bySubject,
    checks,
    overdue,
    manualQueue: {
      cost: manualQueueCost(records, { minutesPerFact }),
      members: byQueue.MANUAL.map((r) => ({ id: r.id, reason: queueReason(r) })),
    },
    automatedQueue: automatedQueueIsUnattended(records),
    // Proof that the supply is usable BY THE GATE THAT WILL CONSUME IT, using
    // the gate's own code rather than a second copy of its rules. A control that
    // does not share the rule's code proves nothing about the rule.
    gateA: countFacts(records.map(toGateAFact), now),
    gaps: DECLARED_GAPS,
  };
}

/**
 * 🔴 THE COUNT THAT IS HARD-CODED AND STAYS HARD-CODED.
 *
 * `FACT_CACHE_DESIGN.md` §3: "Gate A's `factChecked` counter stays hard-coded 0
 * until `factCheckedOn` exists on real records. The test that asserts it stays.
 * This design does not quietly switch it on."
 *
 * Records now exist. THE COUNTER STILL DOES NOT MOVE, because what §3 requires
 * is not records — it is a named person or model having READ THE SOURCE AND
 * JUDGED that the quote supports the value. Thirty-two records have been
 * link-checked and sixteen quote-matched by machine. NONE has been fact-checked.
 *
 * This constant exists so that the day somebody does the reading, the change is
 * a deliberate edit here with a test to update — and not a number that drifted
 * upward because a field got filled in by a script.
 */
export const REGISTRY_FACT_CHECK_COUNT = 0;
