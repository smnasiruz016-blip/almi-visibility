/**
 * THE TWO QUEUES — §4b — AND THE COST OF THE EXPENSIVE ONE.
 *
 * ── WHY A QUEUE IS DERIVED AND NEVER TYPED ──────────────────────────────────
 *
 * A record states its queue, and the validator recomputes it and REJECTS any
 * record whose stated queue disagrees. That is not belt-and-braces; it is the
 * whole defence.
 *
 * 🔴 The one failure `§4b` names by name is the MANUAL QUEUE BECOMING A PLACE TO
 * HIDE WORK THAT FAILED TO AUTOMATE. If the queue were a free-text field, that
 * failure would look exactly like normal data entry, and it would be invisible
 * in review because the record would still be true about everything else.
 *
 * Derived, it cannot happen: a record moves to MANUAL only when
 * `sourceMachineReadable` or `sourceQuotable` says so, and each of those
 * carries a mandatory `Basis` naming the fetch attempt or the licence clause
 * that set it. Moving work into the manual queue now requires stating a false
 * fact about a source, in a field a reviewer reads.
 *
 * ── AND THE PASS CONDITION IS UNCHANGED AND STAYS HARD ──────────────────────
 *
 *   THE AUTOMATED QUEUE MUST GENUINELY RUN UNATTENDED.
 *
 * Not "mostly". Not "with a nudge". If it needs a person, it is not automated
 * and DOD-03A does not pass. `automatedQueueIsUnattended()` below is the check,
 * and it is deliberately unsatisfiable by a record that needs a human touch.
 */
import { INCONCLUSIVE_OUTCOMES, FACT_FRESHNESS_DAYS } from "./schema.mjs";

/**
 * 🔴 THE DERIVATION. Both conditions, not either.
 *
 * A fact enters the AUTOMATED queue only if a machine may FETCH the source AND
 * the licence permits STORING the span the machine would re-match. Fail either
 * and the nightly job has nothing to do — either it cannot reach the page, or
 * there is lawfully nothing to compare against — and a person must open it.
 *
 * `"unknown"` on either field is NOT true. An unread licence and an unattempted
 * fetch both route to MANUAL, because the automated queue's promise is that it
 * runs without supervision, and nothing unverified can be allowed to make that
 * promise on a source's behalf.
 */
export function queueFor({ sourceMachineReadable, sourceQuotable } = {}) {
  // 🔴 CHANGED 11 SEPTEMBER 2026, AND THE OLD RULE WAS TOO PESSIMISTIC.
  //
  // It required BOTH permissions, because the only automated check that existed
  // was the quote match and that needs a stored span. The page fingerprint
  // (fingerprint.mjs) needs no span at all — it hashes the page and stores only
  // the digest — so a source we may FETCH but may not QUOTE can now be watched
  // by a machine after all.
  //
  // What decides the queue is therefore ONE question: can a machine reach the
  // page unattended? `sourceQuotable` no longer decides the queue. It decides
  // WHICH CHECK RUNS, and how much that check's green is worth.
  return sourceMachineReadable === true ? "AUTOMATED" : "MANUAL";
}

/**
 * Freshness follows what the source permits — still never a preference, but now
 * a three-way answer rather than two.
 */
export function freshnessRuleFor(record) {
  const { sourceMachineReadable, sourceQuotable } = record ?? {};
  if (sourceMachineReadable !== true) return "human-re-read";
  return sourceQuotable === true ? "machine-quote-match" : "machine-fingerprint";
}

/**
 * ⚠️ AND THE HONEST COUNTERWEIGHT TO THE CHANGE ABOVE.
 *
 * Moving fifteen records from MANUAL to AUTOMATED looks like a large win and it
 * is a REAL but NARROW one. What the fingerprint automates is DETECTION. When it
 * goes red, a person still has to open the page and re-read it, because a hash
 * cannot say what moved.
 *
 * So the human cost does not vanish — it changes shape, from a calendar
 * obligation to an event one, AT AN UNMEASURED FREQUENCY. Nobody has counted how
 * often these pages actually change. If a regulator edits its page monthly, the
 * event cost is HIGHER than the twice-a-year calendar cost it replaces.
 *
 * 🔴 SO THE CALENDAR IS KEPT AS A BACKSTOP AND THE FINGERPRINT IS ADDED AS AN
 * EARLY TRIGGER: re-read on change OR at 180 days, whichever comes first. That
 * is strictly better than either alone and it claims no saving that has not been
 * measured. Dropping the calendar is available the day somebody measures change
 * frequency, and not before.
 */
export function reverificationTrigger(record) {
  return freshnessRuleFor(record) === "human-re-read"
    ? "calendar only — 180 days"
    : "whichever comes first: the machine check goes red, or 180 days pass";
}

/**
 * Why this record is in the queue it is in, in words a reviewer can check
 * against the source. Printed by the CLI beside every MANUAL record, so the
 * expensive queue always has to justify each of its members out loud.
 */
export function queueReason({ sourceMachineReadable, sourceQuotable } = {}) {
  if (sourceMachineReadable === false) return "🔴 the source refuses a machine — a person must open it";
  if (sourceMachineReadable === "unknown") return "no fetch has been attempted — machine-readability is not yet known";
  if (sourceQuotable === false) return "watched by FINGERPRINT — the licence forbids storing its wording, so the hash is all a machine may hold";
  if (sourceQuotable === "unknown") return "watched by FINGERPRINT — the licence could not be read, and an unread licence is not a permissive one";
  return "watched by QUOTE MATCH — the source permits both a fetch and a stored quote";
}

/**
 * 🔴 DOD-03A'S PASS CONDITION, AS A PREDICATE.
 *
 * The automated queue runs unattended when EVERY record in it can be
 * re-verified by the cron job alone. A record fails this if:
 *
 *   - it has no `quotedSpan` — there is nothing for the job to match;
 *   - its last quote match was inconclusive — the job could not do its work and
 *     a person is now needed, which is precisely "with a nudge";
 *   - its freshness rule says a human re-read.
 *
 * ⚠️ Note what this does NOT accept as unattended: a record whose quote match
 * FAILED is fine here. A failure is the job working — it detected a change and
 * raised a flag, which is the entire point. It is the record that cannot be
 * checked at all that breaks the promise.
 */
export function automatedQueueIsUnattended(records = []) {
  const automated = records.filter((r) => queueFor(r) === "AUTOMATED");
  const blockers = [];
  for (const r of automated) {
    const rule = freshnessRuleFor(r);
    if (rule === "machine-quote-match") {
      const span = r?.evidence?.quotedSpan;
      if (typeof span !== "string" || span.trim() === "") {
        blockers.push({ id: r?.id, why: "quotable, but no quotedSpan — the nightly match has nothing to work on" });
        continue;
      }
      if (INCONCLUSIVE_OUTCOMES.includes(r?.checks?.quoteMatchOutcome)) {
        blockers.push({ id: r?.id, why: `quote match is "${r?.checks?.quoteMatchOutcome}" — a person is needed, so this is not unattended` });
        continue;
      }
    } else if (rule === "machine-fingerprint") {
      // A fingerprint record needs no span. What it needs is a stored hash — and
      // a record that has never been fingerprinted has never actually been
      // watched by anything, however automated its queue says it is.
      if (typeof r?.pageFingerprint !== "string" || r.pageFingerprint.length !== 64) {
        blockers.push({ id: r?.id, why: "no pageFingerprint stored — nothing is watching this record yet" });
        continue;
      }
      if (INCONCLUSIVE_OUTCOMES.includes(r?.checks?.fingerprintOutcome)) {
        blockers.push({ id: r?.id, why: `fingerprint check is "${r?.checks?.fingerprintOutcome}" — a person is needed` });
        continue;
      }
    } else {
      blockers.push({ id: r?.id, why: `freshness rule is "${rule}" — not a machine job` });
      continue;
    }
    if (r?.freshness?.rule !== rule) {
      blockers.push({ id: r?.id, why: `freshness.rule says "${r?.freshness?.rule}" but the source fields derive "${rule}"` });
    }
  }

  // 🔴 Reported apart so that growing the automated queue can never quietly
  // weaken what its green is worth. See EVIDENCE_STRENGTH in schema.mjs.
  const byEvidence = {
    strongQuoteMatch: automated.filter((r) => freshnessRuleFor(r) === "machine-quote-match").length,
    weakFingerprint: automated.filter((r) => freshnessRuleFor(r) === "machine-fingerprint").length,
  };
  return { unattended: blockers.length === 0, automatedCount: automated.length, byEvidence, blockers };
}

/**
 * ── THE MANUAL QUEUE'S COST — DECLARED, NOT ESTIMATED INTO EXISTENCE ────────
 *
 * §4b requires this to be an ANNOUNCEMENT the owner can accept or reject, with
 * a measured number against it. Two of the three numbers are exact arithmetic
 * over the registry. The third is not, and it is NOT invented here.
 *
 * 🔴 `minutesPerFact` HAS NO DEFAULT AND NEVER GETS ONE.
 *
 * `FACT_CACHE_DESIGN.md` §4 records it as UNKNOWN — "one record exists and
 * nobody timed it" — and a plausible default here would convert that honest
 * UNKNOWN into a number that gets quoted, planned against, and eventually
 * believed. So the caller must supply it or the report says UNKNOWN and names
 * the experiment that closes it. That experiment is one afternoon:
 *
 *   TIME TEN R2 ACQUISITIONS BY HAND AND RECORD THE CLOCK.
 *
 * Then this function stops returning UNKNOWN, and Rule Twelve applies: the
 * number carries its sample, and changing what was measured re-opens it.
 */
export function manualQueueCost(records = [], { minutesPerFact = null, freshnessDays = FACT_FRESHNESS_DAYS } = {}) {
  const manual = records.filter((r) => queueFor(r) === "MANUAL");
  const passesPerYear = Math.round((365 / freshnessDays) * manual.length);

  // 🔴 THE COST THAT MOVED RATHER THAN DISAPPEARED.
  //
  // Fifteen records left the MANUAL queue when the fingerprint arrived, and the
  // human work attached to them did not leave with them. It changed TRIGGER: a
  // person re-reads when the hash moves instead of when six months pass.
  //
  // Whether that is cheaper depends entirely on how often these pages change,
  // AND NOBODY HAS MEASURED THAT. A regulator editing monthly costs MORE than
  // the calendar it replaced. So both bounds are reported and neither is called
  // the answer.
  const fingerprintWatched = records.filter((r) => freshnessRuleFor(r) === "machine-fingerprint");
  const worstCase = Math.round((365 / freshnessDays) * (manual.length + fingerprintWatched.length));

  const byReason = new Map();
  for (const r of manual) {
    const reason = queueReason(r);
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  }

  const cost = {
    facts: manual.length,
    freshnessDays,
    passesPerYear,
    passesPerWeek: Number((passesPerYear / 52).toFixed(2)),
    // Both bounds, always together. The floor assumes a fingerprint pass renews
    // freshness on its own; the ceiling keeps the 180-day calendar backstop for
    // fingerprint records as well. The truth is between them and depends on a
    // number nobody has measured.
    fingerprintWatched: fingerprintWatched.length,
    humanPassesPerYearFloor: passesPerYear,
    humanPassesPerYearCeiling: worstCase,
    boundsNote:
      "🟡 FLOOR assumes an unchanged fingerprint renews freshness. CEILING keeps the 180-day human backstop for fingerprint records too. The gap is UNMEASURED page-change frequency — measure it before quoting either as the cost.",
    byReason: [...byReason.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    minutesPerFact: null,
    minutesPerYear: null,
    hoursPerYear: null,
    minutesStatus:
      "🔴 UNKNOWN — never defaulted. Closed by timing ten R2 acquisitions by hand (FACT_CACHE_DESIGN.md §4)",
  };

  if (typeof minutesPerFact === "number" && Number.isFinite(minutesPerFact) && minutesPerFact > 0) {
    cost.minutesPerFact = minutesPerFact;
    cost.minutesPerYear = Math.round(passesPerYear * minutesPerFact);
    cost.hoursPerYear = Number((cost.minutesPerYear / 60).toFixed(1));
    cost.minutesStatus = `supplied by the caller as ${minutesPerFact} min/pass — 🟡 carries whatever sample the caller measured`;
  }
  return cost;
}
