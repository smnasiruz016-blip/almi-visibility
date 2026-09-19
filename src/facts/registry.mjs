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
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { queueFor, queueReason, manualQueueCost, automatedQueueIsUnattended, freshnessRuleFor } from "./queues.mjs";
import { quoteUsability } from "./freshness.mjs";
import { quotabilityState } from "./licences.mjs";
import { validateRegistry } from "./validate.mjs";
import { FACT_FRESHNESS_DAYS } from "./schema.mjs";
import { countFacts } from "../gate-a/facts.mjs";
import { declaredGaps, gapRegisterProducts } from "./gaps.mjs";

/**
 * Load every fact file. Files beginning with `_` are not facts.
 *
 * ⚠️ ORDER IS SORTED, NOT DIRECTORY ORDER, so two runs on two machines produce
 * the same report and a diff of two reports means something.
 *
 * 🔴 `dir` IS REQUIRED, AND THAT IS THE POINT.
 *
 * It used to default to a path this file computed for itself, which meant the
 * loader knew where exactly one product kept its facts. A default is a
 * dependency that never has to be declared by anyone, so it survives every
 * refactor by being invisible. The caller names the directory now, and the
 * caller is a product.
 */
export async function loadRegistry(dir, productId = null) {
  if (typeof dir !== "string" || dir.length === 0) {
    throw new Error("loadRegistry(dir): a product must say where its facts live — there is no default");
  }
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".mjs") && !f.startsWith("_"))
    .sort();
  const records = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(dir, file)).href);
    const exported = mod.default;
    if (!Array.isArray(exported)) throw new Error(`facts/${file} must default-export an array of records`);
    // 🔴 THE RECORD CARRIES ITS PRODUCT FROM THE MOMENT IT IS LOADED.
    // Licence terms are per product now, so every lookup downstream needs to
    // know whose record this is. Deriving it later from a path or a filename
    // would be a guess; carrying it is a fact.
    for (const r of exported) records.push({ ...r, _file: file, _productId: productId });
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
 * ── 🔴 ROW 17 · THE TWO KINDS, AND THE ONE PLACE THAT DECIDES WHICH ─────────
 *
 * A derived record reads no source, so `FACT_KINDS` and F28 waive the laws of
 * READING one for it — F3–F11, F13 and F17–F22. Every census column that
 * measures one of those laws is therefore a question about SOURCE-BEARING
 * records, and asking it of a derived record does not return a weaker answer:
 * it returns `undefined` as if it were a tier, or throws on a `source.url` that
 * by law is absent. Both are worse than not asking.
 *
 * 🔴 THIS IS A NARROWING OF THE POPULATION, NEVER OF THE WORD. "tier", "queue",
 * "licence" and "fact check" keep exactly the meanings they had; what changes is
 * that the registry can now hold a record to which they do not apply, and the
 * census says which records those are instead of silently folding them in.
 *
 * 🔴 AND IT IS ONE DEFINITION, EXPORTED. A second copy of `kind === "derived"`
 * inline in a caller is a control that does not share the rule's code, and this
 * project has already paid for that shape once.
 *
 * An absent `kind` still means primary — that is the schema's own rule for the
 * records written before kinds existed. It is NOT a permissive default for a
 * malformed new record: a record carrying a `derivation` without declaring the
 * kind is refused by F28, and `validation` below runs over EVERY record, derived
 * included, so nothing reaches a census column by being unclassifiable.
 */
export const isDerivedFact = (r) => r?.kind === "derived";
/** The source-bearing records — the population every source law governs. */
export const primaryFacts = (records = []) => records.filter((r) => !isDerivedFact(r));
/** The computed records — judged by F28 and F29 against the records they cite. */
export const derivedFacts = (records = []) => records.filter((r) => isDerivedFact(r));

/**
 * The census. Everything DOD-03A asks to be shown, and the gaps as well.
 */
export function census(records = [], { now = new Date(), minutesPerFact = null, productId = null } = {}) {
  /* 🔴 OVER EVERY RECORD, DERIVED INCLUDED. Validation is the one thing that must never be
   * narrowed: F28 and F29 exist precisely to judge the kind the columns below step around. */
  const validation = validateRegistry(records);

  /* The source-bearing population. Named once, used by every column that measures a source law. */
  const sourced = primaryFacts(records);
  const computed = derivedFacts(records);

  const byQueue = { AUTOMATED: [], MANUAL: [] };
  for (const r of sourced) byQueue[queueFor(r)].push(r);

  /* 🔴 STATUS, SUBJECT AND SCOPE ARE NOT SOURCE LAWS — F1 and F12 bind a derived record exactly as
   * they bind a primary one, so these three count the WHOLE registry. Only `byTier` narrows, and it
   * narrows because `source.tier` is the field F28 forbids a derived record to carry at all. */
  const byStatus = {};
  const byTier = {};
  const bySubject = {};
  const byScope = {};
  for (const r of records) {
    byStatus[r?.life?.status] = (byStatus[r?.life?.status] ?? 0) + 1;
    bySubject[r?.claim?.subject] = (bySubject[r?.claim?.subject] ?? 0) + 1;
    byScope[r?.scope] = (byScope[r?.scope] ?? 0) + 1;
  }
  for (const r of sourced) byTier[r?.source?.tier] = (byTier[r?.source?.tier] ?? 0) + 1;

  // 🔴 The three dates, counted apart. They are never summed into "verified".
  //
  // 🔴 ROW 17 — THIS COLUMN COUNTS CHECKS, AND A DERIVED RECORD CANNOT CARRY ONE.
  // F28 refuses `factCheckedOn` on a derived record and `fact()` throws if one is supplied: its
  // standing is INHERITED from its weakest input, not the outcome of a check that ran on a day.
  // Folding it in would put an inherited UNKNOWN in the same column as an UNKNOWN that a person
  // reached by reading a source — which is the exact merge the three dates were split to prevent.
  // The derived records' standings are reported in `derived` below, apart, where they belong.
  const checks = {
    linkChecked: sourced.filter((r) => r?.checks?.linkCheckOutcome === "pass").length,
    quoteMatched: sourced.filter((r) => r?.checks?.quoteMatchOutcome === "pass").length,
    quoteNotApplicable: sourced.filter((r) => r?.checks?.quoteMatchOutcome === "not-applicable").length,
    couldNotCheck: sourced.filter(
      (r) => r?.checks?.linkCheckOutcome === "could-not-check" || r?.checks?.quoteMatchOutcome === "could-not-check",
    ).length,
    // 🔴 HOW MANY CHECKS RAN — 46 since 12 September 2026. NOT how many passed.
    // `factConfirmed` below is the one to quote as "verified facts"; keeping
    // them apart is what stops 14 unresolved records being counted as good.
    factChecked: sourced.filter((r) => r?.checks?.factCheckedOn !== null).length,
    factConfirmed: sourced.filter((r) => r?.verificationState === "VERIFIED").length,
    factUnknown: sourced.filter((r) => r?.verificationState === "UNKNOWN").length,
  };

  // Freshness measured against the real clock, not assumed from the window.
  // 🔴 SOURCE-BEARING ONLY: "overdue" means a source has not been re-read, and a derived record has
  // no source to re-read. It goes stale when an INPUT moves, which `detectInputChanges` reports.
  const overdue = sourced
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
  /* 🔴 SOURCE-BEARING ONLY. A licence is a term somebody else set on THEIR words; a derived record
   * reproduces nobody's words, so it has no licence to be read, reserved or prohibited — and
   * counting it as UNREAD would invent a licence nobody has to go and read. Same for the document
   * class and the freshness rule, which are both properties of the source being re-checked. */
  for (const r of sourced) {
    byQuotabilityState[quotabilityState(r?.licence, r?._productId)] += 1;
    byLicence[r?.licence] = (byLicence[r?.licence] ?? 0) + 1;
    byDocumentClass[r?.sourceDocumentClass] = (byDocumentClass[r?.sourceDocumentClass] ?? 0) + 1;
    byFreshnessRule[freshnessRuleFor(r)] = (byFreshnessRule[freshnessRuleFor(r)] ?? 0) + 1;
  }

  return {
    generatedOn: now.toISOString().slice(0, 10),
    /* 🔴 THE WHOLE REGISTRY. `total` is every record of every kind, so a derived record can never
     * be hidden by the narrowing the columns below apply — `total` and `byKind` together say
     * exactly how many records the source columns did not measure, and why. */
    total: records.length,
    byKind: { primary: sourced.length, derived: computed.length },
    /* 🔴 REPORTED APART, NEVER FOLDED IN. Everything a derived record's standing rests on, named:
     * its formula, the records it cites, and the state it inherited. A reader who wants to know
     * what the registry computes rather than reads looks here, and finds it stated rather than
     * mixed into a tier or a licence column where it would silently distort both. */
    derived: computed.map((r) => ({
      id: r.id,
      formula: r?.derivation?.formula ?? null,
      inputs: r?.derivation?.inputs ?? [],
      verificationState: r?.verificationState ?? null,
    })),
    validation,
    byQueue: { AUTOMATED: byQueue.AUTOMATED.length, MANUAL: byQueue.MANUAL.length },
    byQuotabilityState,
    byLicence,
    byDocumentClass,
    byFreshnessRule,
    // 🔴 Which quotes may lawfully be used TODAY. Kept apart from freshness on
    // purpose: for a licence whose permission is conditional on currency, an
    // expired record is not a stale fact, it is an out-of-licence reproduction.
    quoteUsability: quoteUsability(sourced, now),
    byStatus,
    byTier,
    byScope,
    bySubject,
    checks,
    overdue,
    manualQueue: {
      cost: manualQueueCost(sourced, { minutesPerFact }),
      members: byQueue.MANUAL.map((r) => ({ id: r.id, reason: queueReason(r) })),
    },
    automatedQueue: automatedQueueIsUnattended(sourced),
    // Proof that the supply is usable BY THE GATE THAT WILL CONSUME IT, using
    // the gate's own code rather than a second copy of its rules. A control that
    // does not share the rule's code proves nothing about the rule.
    gateA: countFacts(sourced.map(toGateAFact), now),
    // 🔴 A product sees ITS OWN gaps. Passing none yields none — the safe
    // direction, and the reason the census also prints who has registered.
    gaps: declaredGaps(productId ?? records.find((r) => r?._productId)?._productId ?? null),
    // 🔴 So that "no gaps" cannot look like good news. An empty list means
    // either nothing is missing or no product registered, and those are
    // opposites.
    gapRegisterProducts: gapRegisterProducts(),
  };
}

/**
 * 🔴 THE COUNT THAT IS HARD-CODED AND STAYS HARD-CODED.
 *
 * `FACT_CACHE_DESIGN.md` §3: "Gate A's `factChecked` counter stays hard-coded 0
 * until `factCheckedOn` exists on real records. The test that asserts it stays.
 * This design does not quietly switch it on."
 *
 * 🔴 12 SEPTEMBER 2026 — SOMEBODY DID THE READING, SO THIS IS THAT EDIT.
 *
 * beta-g read an official source for all 46 records and returned a verdict on
 * each. That is what §3 was waiting for, and the counter moves — deliberately,
 * here, with the tests updated in the same commit. It did not drift.
 *
 * 🔴 46 IS THE NUMBER OF CHECKS THAT RAN, NOT THE NUMBER OF FACTS CONFIRMED.
 * Only 32 came back confirmed; 14 came back UNKNOWN. Those are different
 * questions and one number cannot answer both, so the second is counted apart
 * below. Summing them is precisely the "verified fact supply" overstatement the
 * 11 September audit caught.
 */
export const REGISTRY_FACT_CHECK_COUNT = 46;

/**
 * 🔴 HOW MANY CHECKS CAME BACK CONFIRMED. The one to quote if anybody asks how
 * many verified facts this registry holds — never REGISTRY_FACT_CHECK_COUNT.
 *
 * The remaining 14 are UNKNOWN: 6 contested by a second official page,
 * 4 true-but-incomplete, 4 whose source could not be read (and by LAW-ABSENT-1
 * that last group is a fact about our reach, not about the claim).
 */
export const REGISTRY_VERIFIED_COUNT = 16; // MEASURED 13 Sep 2026 evening: 32 on 12 Sep; #63 counted 34; #64 33; 8 of the 32 returned to UNKNOWN on 13 Sep morning; 9 more demoted by beta-g ruling 13 Sep evening (item 50)

/**
 * 🔴 GATE A'S OWN `factChecked` COLUMN IS STILL HARD-CODED 0, KNOWINGLY.
 *
 * It is not an oversight and it is not this change. Gate A decides what
 * PUBLISHES; letting 32 newly-verified facts count towards it would change
 * which pages pass, and that is a product decision for the owner, not a
 * side-effect of ingesting verdicts. It is carried as an open item instead.
 */
