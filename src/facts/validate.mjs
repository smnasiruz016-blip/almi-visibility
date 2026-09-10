/**
 * THE LAWS OF THE REGISTRY — each one a rejection, not a note.
 *
 * Every rule below exists because prose could not enforce it. `FACT_CACHE_DESIGN.md`
 * has said since §1 that a fact binds to a claim and that a tier-4 source is a
 * lead — and a document cannot stop a record being written that ignores both.
 *
 * ⚠️ EVERY LAW HERE HAS ITS RED FORCED in test/facts-registry.test.mjs. A law
 * shown only passing proves the code runs, not that it measures.
 */
import {
  factId,
  TIERS,
  TIER_LEAD_ONLY,
  SCOPES,
  STATUSES,
  CHECK_OUTCOMES,
  MACHINE_READABLE_VALUES,
  QUOTABLE_VALUES,
  FRESHNESS_RULES,
  FACT_CHECKED_BY_PATTERN,
  ROUTES,
} from "./schema.mjs";
import { queueFor, freshnessRuleFor } from "./queues.mjs";
import { urlShapeProblem } from "../gate-a/facts.mjs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (v) => typeof v === "string" && ISO_DATE.test(v);
const isFilled = (v) => typeof v === "string" && v.trim() !== "";

/**
 * Judge ONE record. Returns every broken law, never just the first — a record
 * fixed one error at a time is a record reviewed several times.
 */
export function validateRecord(record) {
  const errors = [];
  const push = (law, message) => errors.push({ law, message });
  const r = record ?? {};

  // ── F1 · IDENTITY IS THE CLAIM ────────────────────────────────────────────
  // The id is derived, so a record cannot carry an id that disagrees with the
  // claim it makes. A hand-typed id is exactly how two records come to describe
  // the same claim under different names and then both go stale separately.
  const derived = factId(r.claim);
  if (!derived) {
    push("F1", "claim must be an object with a non-empty `subject` and `predicate`");
  } else if (r.id !== derived) {
    push("F1", `id is ${JSON.stringify(r.id)} but the claim derives ${JSON.stringify(derived)} — the id is DERIVED, never typed`);
  }

  if (!SCOPES.includes(r.scope)) push("F1", `scope is ${JSON.stringify(r.scope)}, not one of ${SCOPES.join(", ")}`);

  // ── F2 · A VALUE, TYPED, WITH ITS UNIT ────────────────────────────────────
  const v = r.value ?? {};
  if (v.value === undefined || v.value === null || String(v.value).trim() === "") push("F2", "no value");
  if (!isFilled(v.valueType)) push("F2", "value.valueType is required — a fact cache of free text cannot be compared with anything");
  // A number without its unit is the shape of a defect this network has already
  // shipped: ₦66,875 and Rs.10,000 are both "10000-ish" and mean nothing alike.
  if (["money", "duration", "count"].includes(v.valueType) && !isFilled(v.unit)) {
    push("F2", `valueType is "${v.valueType}" and there is no unit — a bare number is not a fact`);
  }

  // ── F3 · THE SOURCE ───────────────────────────────────────────────────────
  const s = r.source ?? {};
  const urlProblem = urlShapeProblem(s.url);
  // A document reference is the lawful alternative to a URL, not an excuse for
  // its absence: one of the two must be there.
  if (urlProblem && !isFilled(s.documentRef)) push("F3", `${urlProblem} — and no source.documentRef either`);
  if (!isFilled(s.label)) push("F3", "source.label is required — a bare URL is not a citation a reader can judge");
  if (!isFilled(s.publisher)) push("F3", "source.publisher is required — who is asserting this");
  if (!Object.prototype.hasOwnProperty.call(TIERS, String(s.tier))) {
    push("F3", `source.tier is ${JSON.stringify(s.tier)}, not one of ${Object.keys(TIERS).join(", ")}`);
  }

  // ── F4 · TIER 4 IS A LEAD, NEVER A CITATION ───────────────────────────────
  // AlmiOET's own rule, adopted rather than reinvented. The NZ record exists
  // because it was obeyed: a law-firm blog found the change, a person then read
  // Immigration New Zealand's own page.
  if (Number(s.tier) === TIER_LEAD_ONLY && r.life?.status !== "lead") {
    push("F4", `tier 4 with status ${JSON.stringify(r.life?.status)} — a tier-4 source is A LEAD, NEVER A CITATION, and may only be status "lead"`);
  }

  // ── F5 · THE TWO INDEPENDENT FIELDS, EACH WITH ITS BASIS ──────────────────
  if (!MACHINE_READABLE_VALUES.includes(r.sourceMachineReadable)) {
    push("F5", `sourceMachineReadable is ${JSON.stringify(r.sourceMachineReadable)}, not one of true, false, "unknown"`);
  }
  if (!QUOTABLE_VALUES.includes(r.sourceQuotable)) {
    push("F5", `sourceQuotable is ${JSON.stringify(r.sourceQuotable)}, not one of true, false, "unknown"`);
  }
  // The basis is mandatory in every case, including `true`. Without it the
  // field records a conclusion and destroys the evidence for it, and a year
  // later nobody can tell a licence somebody read from a licence somebody
  // assumed.
  if (!isFilled(r.sourceMachineReadableBasis)) {
    push("F5", "sourceMachineReadableBasis is required — name the fetch attempt that set it, never guess");
  }
  if (!isFilled(r.sourceQuotableBasis)) {
    push("F5", "sourceQuotableBasis is required — quote the LICENCE term, or say plainly that none was located");
  }

  // ── F6 · 🔴 THE LICENCE RULE — THE ONE OET FORCED ─────────────────────────
  // When the licence does not expressly permit it, WE DO NOT HOLD THEIR
  // SENTENCE. We hold a URL, a date, and the fact in our own words.
  const e = r.evidence ?? {};
  if (r.sourceQuotable === true) {
    if (!isFilled(e.quotedSpan)) {
      push("F6", "sourceQuotable is true but there is no quotedSpan — this is the field the whole design turns on");
    }
  } else {
    if (isFilled(e.quotedSpan)) {
      push(
        "F6",
        `sourceQuotable is ${JSON.stringify(r.sourceQuotable)} and a quotedSpan is stored anyway — 🔴 a fact cache holding their wording IS an "electronic retrieval system". Store ownWords instead`,
      );
    }
    if (!isFilled(e.ownWords)) {
      push("F6", `sourceQuotable is ${JSON.stringify(r.sourceQuotable)}, so evidence.ownWords is required — a URL, a date, and the fact IN OUR OWN WORDS`);
    }
  }

  // ── F7 · THE THREE DATES, AND THEY ARE NEVER AVERAGED ─────────────────────
  const c = r.checks ?? {};
  for (const [field, outcomeField] of [
    ["linkCheckedOn", "linkCheckOutcome"],
    ["quoteMatchedOn", "quoteMatchOutcome"],
  ]) {
    if (c[field] !== null && !isIsoDate(c[field])) push("F7", `checks.${field} must be an ISO date or null, got ${JSON.stringify(c[field])}`);
    if (!Object.prototype.hasOwnProperty.call(CHECK_OUTCOMES, String(c[outcomeField]))) {
      push("F7", `checks.${outcomeField} is ${JSON.stringify(c[outcomeField])}, not one of ${Object.keys(CHECK_OUTCOMES).join(", ")}`);
    }
  }

  // ── F8 · 🔴 "COULD NOT CHECK" IS A THIRD OUTCOME AND KEEPS ITS OWN DATE ────
  // A check that could not run has no date, because a date is the record of a
  // check having happened. Writing today's date beside "could-not-check" is how
  // a blocked source starts to look recently verified.
  for (const [dateField, outcomeField] of [
    ["linkCheckedOn", "linkCheckOutcome"],
    ["quoteMatchedOn", "quoteMatchOutcome"],
  ]) {
    const outcome = c[outcomeField];
    if ((outcome === "could-not-check" || outcome === "not-applicable") && c[dateField] !== null) {
      push("F8", `checks.${outcomeField} is "${outcome}" but ${dateField} carries a date — a check that did not run did not happen on a day`);
    }
    if ((outcome === "pass" || outcome === "fail") && !isIsoDate(c[dateField])) {
      push("F8", `checks.${outcomeField} is "${outcome}" but ${dateField} is not a date — a check that ran happened on a day`);
    }
  }

  // ── F9 · A RECORD WE MAY NOT QUOTE MUST NOT LOOK BROKEN ───────────────────
  // §4c: mark the record so NOTHING attempts a quote-match, "because a permanent
  // 'could not check' would look like a broken source rather than a lawful one".
  if (r.sourceQuotable !== true && c.quoteMatchOutcome !== "not-applicable") {
    push(
      "F9",
      `sourceQuotable is ${JSON.stringify(r.sourceQuotable)} so quoteMatchOutcome must be "not-applicable", got ${JSON.stringify(c.quoteMatchOutcome)} — a lawful state must never be reported as a broken one`,
    );
  }

  // ── F10 · ONLY THE THIRD DATE DESERVES THE WORD "VERIFIED" ────────────────
  if (c.factCheckedOn !== null && !isIsoDate(c.factCheckedOn)) {
    push("F10", `checks.factCheckedOn must be an ISO date or null, got ${JSON.stringify(c.factCheckedOn)}`);
  }
  if (c.factCheckedOn !== null && !FACT_CHECKED_BY_PATTERN.test(String(c.factCheckedBy))) {
    push("F10", `factCheckedOn is set so factCheckedBy is mandatory as "human:<name>" or "model:<id>", got ${JSON.stringify(c.factCheckedBy)} — those are not the same evidence and must never average into one number`);
  }
  if (c.factCheckedOn === null && c.factCheckedBy !== null) {
    push("F10", "factCheckedBy is set without factCheckedOn — a checker with no date is not a check");
  }
  // A link check says NOTHING about the claim. This is the law that stops
  // `verifiedDate` quietly coming to mean "the date somebody pasted a link".
  if (r.life?.status === "active" && c.linkCheckOutcome !== "pass") {
    push("F10", `status is "active" but the link check is ${JSON.stringify(c.linkCheckOutcome)} — an active record's source must at least open`);
  }

  // ── F11 · THE QUEUE IS DERIVED, AND SO IS FRESHNESS ───────────────────────
  const derivedQueue = queueFor(r);
  if (r.queue !== derivedQueue) {
    push("F11", `queue says ${JSON.stringify(r.queue)} but the source fields derive ${JSON.stringify(derivedQueue)} — 🔴 the manual queue is not a place to hide work that failed to automate`);
  }
  const derivedFreshness = freshnessRuleFor(r);
  if (r.freshness?.rule !== derivedFreshness) {
    push("F11", `freshness.rule says ${JSON.stringify(r.freshness?.rule)} but the queue derives ${JSON.stringify(derivedFreshness)}`);
  }
  if (!Object.prototype.hasOwnProperty.call(FRESHNESS_RULES, String(r.freshness?.rule))) {
    push("F11", `freshness.rule is ${JSON.stringify(r.freshness?.rule)}, not a known rule`);
  }

  // ── F12 · LIFE, AND NOTHING IS EVER EDITED IN PLACE ───────────────────────
  const l = r.life ?? {};
  if (!Object.prototype.hasOwnProperty.call(STATUSES, String(l.status))) {
    push("F12", `life.status is ${JSON.stringify(l.status)}, not one of ${Object.keys(STATUSES).join(", ")}`);
  }
  if (!isIsoDate(l.extractedOn)) push("F12", "life.extractedOn (the extraction date) is required as an ISO date");
  if (!isIsoDate(l.firstSeenOn)) push("F12", "life.firstSeenOn is required as an ISO date");
  // A changed value writes a NEW record and points the old one at it. A cache
  // that overwrites cannot answer "when did this change and what did it say
  // before?" — which is the question a stale page always raises.
  if (isFilled(l.supersededBy) && l.status !== "retired") {
    push("F12", `supersededBy is set but status is ${JSON.stringify(l.status)} — a superseded record is retired, never silently edited`);
  }
  if (l.status === "retired" && !isFilled(l.retiredReason)) {
    push("F12", "a retired record must carry retiredReason — a fact that vanished without a reason will be re-researched");
  }

  // ── F13 · PROVENANCE IS A FIELD, NEVER A COMMENT ──────────────────────────
  const p = r.provenance ?? {};
  if (!Object.prototype.hasOwnProperty.call(ROUTES, String(p.route))) {
    push("F13", `provenance.route is ${JSON.stringify(p.route)}, not one of ${Object.keys(ROUTES).join(", ")}`);
  }
  if (!isFilled(p.acquiredBy)) push("F13", "provenance.acquiredBy is required — who or what put this here");
  // R3 is a MODEL reading a page. A model may PROPOSE a fact; it may never BE
  // the source. Until the span is machine-matched the record is a lead.
  if (p.route === "R3" && r.sourceQuotable === true && c.quoteMatchOutcome !== "pass" && l.status === "active") {
    push("F13", 'route R3 is active with an unmatched quote — a model may PROPOSE a fact, never BE the source. It is a lead until the span matches');
  }
  if (p.route === "R4" && l.status !== "lead") {
    push("F13", `route R4 with status ${JSON.stringify(l.status)} — a third party is a lead to verify, never the citation itself`);
  }

  // ── F14 · A CONFLICT IS FROZEN, NOT RESOLVED BY WHOEVER WROTE LAST ────────
  if (l.status === "conflict" && !r.conflict) {
    push("F14", 'status is "conflict" but no `conflict` block says what disagrees with what');
  }
  if (r.conflict && !isFilled(r.conflict.resolution)) {
    push("F14", "a conflict must name the resolution that would settle it — an open disagreement with no named test never closes");
  }

  return { id: r.id ?? derived ?? "(no id)", valid: errors.length === 0, errors };
}

/**
 * Judge the WHOLE registry. Some laws are only visible across records.
 */
export function validateRegistry(records = []) {
  const results = records.map(validateRecord);
  const errors = [];

  // ── F15 · ONE ACTIVE RECORD PER CLAIM ─────────────────────────────────────
  // The point of binding to a claim rather than a page is that a fact is
  // researched ONCE. Two active records for one claim is that guarantee broken,
  // and it is how the same fact comes to hold two different verified dates.
  const activeById = new Map();
  for (const r of records) {
    if (r?.life?.status !== "active") continue;
    const id = r.id ?? factId(r.claim);
    if (activeById.has(id)) {
      errors.push({
        law: "F15",
        message: `two ACTIVE records for claim ${JSON.stringify(id)} — a claim is researched once. Retire one with supersededBy`,
      });
    }
    activeById.set(id, r);
  }

  // ── F16 · A SUPERSEDING POINTER MUST POINT AT SOMETHING ───────────────────
  const known = new Set(records.map((r) => r?.id ?? factId(r?.claim)));
  for (const r of records) {
    const target = r?.life?.supersededBy;
    if (target && !known.has(target)) {
      errors.push({ law: "F16", message: `${r.id} is supersededBy ${JSON.stringify(target)}, which is not in the registry` });
    }
  }

  const recordErrors = results.filter((x) => !x.valid);
  return {
    total: records.length,
    valid: recordErrors.length === 0 && errors.length === 0,
    invalidRecords: recordErrors,
    registryErrors: errors,
  };
}
