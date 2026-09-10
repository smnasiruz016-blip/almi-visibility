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
  return sourceMachineReadable === true && sourceQuotable === true ? "AUTOMATED" : "MANUAL";
}

/** Freshness follows the queue. It is never a preference. */
export function freshnessRuleFor(record) {
  return queueFor(record ?? {}) === "AUTOMATED" ? "machine-quote-match" : "human-re-read";
}

/**
 * Why this record is in the queue it is in, in words a reviewer can check
 * against the source. Printed by the CLI beside every MANUAL record, so the
 * expensive queue always has to justify each of its members out loud.
 */
export function queueReason({ sourceMachineReadable, sourceQuotable } = {}) {
  if (sourceMachineReadable === false) return "the source refuses a machine — a person must open it";
  if (sourceMachineReadable === "unknown") return "no fetch has been attempted — machine-readability is not yet known";
  if (sourceQuotable === false) return "🔴 LICENCE: the source forbids storing its wording — there is nothing lawful to re-match";
  if (sourceQuotable === "unknown") return "the source's licence has not been read — no express permission located";
  return "the source permits both a fetch and a stored quote";
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
    const span = r?.evidence?.quotedSpan;
    if (typeof span !== "string" || span.trim() === "") {
      blockers.push({ id: r?.id, why: "no quotedSpan — the nightly job has nothing to match" });
      continue;
    }
    const outcome = r?.checks?.quoteMatchOutcome;
    if (INCONCLUSIVE_OUTCOMES.includes(outcome)) {
      blockers.push({ id: r?.id, why: `quote match is "${outcome}" — a person is needed, so this is not unattended` });
      continue;
    }
    if (r?.freshness?.rule !== "machine-quote-match") {
      blockers.push({ id: r?.id, why: `freshness rule is "${r?.freshness?.rule}" — not a machine job` });
    }
  }
  return { unattended: blockers.length === 0, automatedCount: automated.length, blockers };
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
