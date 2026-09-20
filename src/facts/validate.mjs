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
// 🔴 F23's arbiter. The transition table now governs the registry rather than
// only its own test — see src/evidence/verdict.mjs.
import { judgeSupersession, judgeLeavingUnknown, DIMENSION_DECLARATION_FAULTS } from "../evidence/verdict.mjs";
import { judgeGrandfathering } from "../evidence/pre-contract-grandfathering.mjs";
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
  FACT_KINDS,
} from "./schema.mjs";
import { FORMULAS, makeDerivedFact, recomputeDerived } from "./lifecycle.mjs";
import { queueFor, freshnessRuleFor } from "./queues.mjs";
import {
  licencesVisibleTo,
  DOCUMENT_CLASSES,
  UNKNOWN_LICENCES,
  quotabilityState,
  quotableUnder,
  requiredAttribution,
  requiresCurrentVersion,
  requiresPerPageThirdPartyCheck,
} from "./licences.mjs";
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

  // ── F28 · 🔴 ROW 17 — A DERIVED FACT IS A KIND, AND ITS SOURCE IS ITS INPUTS ─
  // A record is `primary` (read from a source) or `derived` (computed by a declared formula from other records).
  // The 46 records written before kinds existed declare none and are primary, and EVERY source law below still
  // binds them. A derived record is waived F3–F11, F13 and F17–F22 — the laws of reading a source — because it
  // reads none; it pays for that here and in F29, against the records it cites. Half a derived fact is refused
  // both ways: a derivation without the kind, and the kind without a derivation or while carrying a source.
  const kind = r.kind === undefined ? "primary" : r.kind;
  if (!Object.prototype.hasOwnProperty.call(FACT_KINDS, String(kind))) {
    push("F28", `kind is ${JSON.stringify(r.kind)}, not one of ${Object.keys(FACT_KINDS).join(", ")}`);
  }
  if (kind !== "derived" && r.derivation !== undefined && r.derivation !== null) {
    push("F28", 'the record carries a derivation but does not declare kind "derived" — half a derived fact is not one');
  }
  if (kind === "derived") {
    const d = r.derivation;
    if (!Object.prototype.hasOwnProperty.call(FORMULAS, String(d?.formula))) {
      push("F28", `derivation.formula is ${JSON.stringify(d?.formula)} — a formula must be one of ${Object.keys(FORMULAS).join(", ")}, re-executable, not described`);
    }
    if (!Array.isArray(d?.inputs) || d.inputs.length === 0 || !d.inputs.every(isFilled)) push("F28", "a derived fact must cite the fact_ids of its inputs");
    if (!Array.isArray(d?.inputValues) || d.inputValues.length !== (Array.isArray(d?.inputs) ? d.inputs.length : -1)) {
      push("F28", "derivation.inputValues must hold the value of every input it was computed from — without them a changed input cannot be detected");
    }
    if (Array.isArray(d?.inputs) && d.inputs.includes(r.id)) push("F28", "a derived fact cannot be its own input");
    if (r.source !== undefined && r.source !== null) push("F28", "a derived fact carries a source — its source is its inputs, and a source here is a primary fact dressed as derived");
    if ((r.checks?.factCheckedOn ?? null) !== null) push("F28", "a derived fact carries factCheckedOn — its standing is its weakest input's, not a check");
    if (!["UNVERIFIED", "VERIFIED", "UNKNOWN"].includes(r.verificationState)) push("F28", `verificationState is ${JSON.stringify(r.verificationState)} — a derived fact declares the standing it inherits`);
    lifeLaws(r, push);
    conflictLaws(r, push);
    return { id: r.id ?? derived ?? "(no id)", valid: errors.length === 0, errors };
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
    // 🔴 CORRECTED 2026-09-10: MAY QUOTE IS NOT MUST QUOTE.
    //
    // This law used to demand a quotedSpan whenever the licence permitted one,
    // which is a different rule from the one the design argues for. Immigration
    // New Zealand exposed it: its licence PERMITS quoting (CC BY 3.0 NZ), and
    // our record holds the fact in our own words because it came from
    // org-notes.ts and nobody ever extracted a span. That record was lawful,
    // useful, and rejected.
    //
    // A permission is not an obligation. What matters is that the record carries
    // EVIDENCE of some kind — their words where we may hold them, ours otherwise.
    if (!isFilled(e.quotedSpan) && !isFilled(e.ownWords)) {
      push("F6", "sourceQuotable is true but the record carries neither a quotedSpan nor ownWords — a permission is not evidence");
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
    ["fingerprintCheckedOn", "fingerprintOutcome"],
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
    ["fingerprintCheckedOn", "fingerprintOutcome"],
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
  lifeLaws(r, push);
  const l = r.life ?? {};

  // ── F13 · PROVENANCE IS A FIELD, NEVER A COMMENT ──────────────────────────
  const p = r.provenance ?? {};
  if (!Object.prototype.hasOwnProperty.call(ROUTES, String(p.route))) {
    push("F13", `provenance.route is ${JSON.stringify(p.route)}, not one of ${Object.keys(ROUTES).join(", ")}`);
  }
  if (!isFilled(p.acquiredBy)) push("F13", "provenance.acquiredBy is required — who or what put this here");
  // R3 is a MODEL reading a page. A model may PROPOSE a fact; it may never BE
  // the source. Until the span is machine-matched the record is a lead.
  // ⚠️ Keyed on a STORED SPAN, for the same reason as F20–F22. The rule is that
  // a MODEL'S PROPOSED QUOTE is a lead until a machine matches it. A record that
  // stores no span makes no such proposal — it rests on our own words, and the
  // page behind it is watched by a fingerprint instead.
  if (p.route === "R3" && isFilled(e.quotedSpan) && c.quoteMatchOutcome !== "pass" && l.status === "active") {
    push("F13", 'route R3 is active with an unmatched quote — a model may PROPOSE a fact, never BE the source. It is a lead until the span matches');
  }
  if (p.route === "R4" && l.status !== "lead") {
    push("F13", `route R4 with status ${JSON.stringify(l.status)} — a third party is a lead to verify, never the citation itself`);
  }

  // ── F17 · THE LICENCE AND THE DOCUMENT CLASS ARE BOTH NAMED ──────────────
  // Owner's licence census, 10 September 2026. A domain is not a licence and a
  // licence is not a document class: the NMC grants for guidance what it
  // refuses for news, on the same site.
  //
  // ⚠️ The date above read "11 September" until 2026-09-10 — a day that had not
  // happened, copied from a document header rather than read from the clock.
  // The same mistake once stamped 32 records with tomorrow's date and Gate A
  // caught it. A DATE IS A MEASUREMENT.
  const visible = licencesVisibleTo(r._productId);
  if (!Object.prototype.hasOwnProperty.call(visible, String(r.licence))) {
    push("F17", `licence is ${JSON.stringify(r.licence)}, not one of ${Object.keys(visible).join(", ")}`);
  }
  if (!DOCUMENT_CLASSES.includes(r.sourceDocumentClass)) {
    // The message names no source. A licence that grants for one class what it
    // refuses for another is meaningless without the class — that is true of
    // every such licence, and the engine cites none of them by name.
    push("F17", `sourceDocumentClass is ${JSON.stringify(r.sourceDocumentClass)}, not one of ${DOCUMENT_CLASSES.join(", ")} — a licence that splits by document class is meaningless without it`);
  }

  // ── F18 · 🔴 QUOTABILITY IS DERIVED FROM THE LICENCE, NEVER TYPED ─────────
  // Same defence as the queue. A licence judgement written by hand cannot be
  // re-checked, and six months later it is indistinguishable from a licence
  // somebody actually read.
  if (Object.prototype.hasOwnProperty.call(visible, String(r.licence)) && DOCUMENT_CLASSES.includes(r.sourceDocumentClass)) {
    const derivedQuotable = quotableUnder(r.licence, r.sourceDocumentClass, r._productId);
    if (r.sourceQuotable !== derivedQuotable) {
      push(
        "F18",
        `sourceQuotable says ${JSON.stringify(r.sourceQuotable)} but ${r.licence} over a "${r.sourceDocumentClass}" document derives ${JSON.stringify(derivedQuotable)} — quotability follows the clause, not a judgement`,
      );
    }
  }

  // ── F19 · 🔴 SILENCE IS `false`, NOT `"unknown"` ─────────────────────────
  // The owner's ruling, 11 September 2026: a bare copyright notice is not an
  // open question about the licence. IT IS THE LICENCE, and it reserves
  // everything. "unknown" survives only where the terms could not be READ —
  // because AN UNREAD LICENCE IS NOT A PERMISSIVE ONE, and letting silence
  // register as uncertainty would quietly re-open a closed question.
  if (r.sourceQuotable === "unknown" && quotabilityState(r.licence, r._productId) !== "UNREAD") {
    push(
      "F19",
      `sourceQuotable is "unknown" under licence ${JSON.stringify(r.licence)} — "unknown" is only for ${UNKNOWN_LICENCES.join(" or ")}. A copyright notice with no grant is "all rights reserved", which is false, not unknown`,
    );
  }

  // ── F20 · THE CREDIT IS PART OF THE PERMISSION, NOT A COURTESY ───────────
  // Both permissive licences require attribution, and each requires a DIFFERENT
  // one. A record carrying the quote but not the credit is a licence breach
  // THAT LOOKS EXACTLY LIKE COMPLIANCE — the quote is there, the source is
  // there, the date is there, and the permission has been exceeded.
  // ⚠️ Scoped to a STORED SPAN. Attribution is a condition attached to
  // REPRODUCING their words; a record holding only our own words reproduces
  // nothing and has nothing to credit.
  if (r.sourceQuotable === true && isFilled(r.evidence?.quotedSpan)) {
    const needed = requiredAttribution(r.licence, r._productId);
    if (needed && !isFilled(r.attributionStatement)) {
      push("F20", `${r.licence} requires attribution and attributionStatement is empty — the credit is a CONDITION of the permission, not a courtesy`);
    } else if (needed && !String(r.attributionStatement).includes(needed)) {
      push("F20", `attributionStatement does not contain what ${r.licence} requires (${JSON.stringify(needed)})`);
    }
  }

  // ── F21 · 🔴 WHERE CURRENCY IS A LICENCE CONDITION, EXPIRY IS NOT ADVISORY ─
  // NMC 6.3's first condition is "ensure that you are using the most up-to-date
  // version of any source document". A lapsed record is not a stale fact — it
  // is content reproduced outside the terms that allowed it. So such a record
  // must be watched by the check that can DEMONSTRATE currency, and a
  // fingerprint cannot: it proves the page did not move, not that our stored
  // sentence is the current wording.
  // ⚠️ Also scoped to a stored span: the currency condition governs a
  // reproduction, and there is no reproduction without one.
  if (requiresCurrentVersion(r.licence, r._productId) && isFilled(r.evidence?.quotedSpan) && r.freshness?.rule !== "machine-quote-match") {
    push(
      "F21",
      `${r.licence} makes currency a CONDITION OF THE PERMISSION, so this record must be watched by machine-quote-match, not ${JSON.stringify(r.freshness?.rule)}`,
    );
  }

  // ── F22 · THE PER-PAGE THIRD-PARTY CHECK THE WORD "MOST" FORCES ──────────
  // GOV.UK says MOST of its content is OGL, and that where it is not, it will
  // usually credit the author. So an OGL page is quotable because THIS page
  // carries no third-party credit — a per-page fact, not a domain-wide one.
  // ⚠️ Scoped the same way. The check exists to decide whether THIS page's
  // text may be stored — it is not owed for a record that stores none.
  if (requiresPerPageThirdPartyCheck(r.licence, r._productId) && isFilled(r.evidence?.quotedSpan)) {
    const check = r.thirdPartyRightsCheck;
    if (!check || !isIsoDate(check.checkedOn)) {
      push("F22", `${r.licence} requires a per-page third-party rights check before storing this page's text, and none is recorded`);
    } else if (check.spanRegionConflict === true) {
      // 🔴 NARROWED BY THE OWNER'S RULING, 2026-09-10. What blocks a stored
      // span is a third-party notice INSIDE THE CONTENT REGION THE SPAN CAME
      // FROM — not one anywhere on the page. A cookie banner in the footer is a
      // fact about the banner; it never acquired a veto over the article body.
      //
      // `check.clear` is still RECORDED and is deliberately NOT consulted here:
      // the whole-page observation survives, it simply no longer decides. An
      // observation that quietly became a veto is how a check ends up switched
      // off by whoever it inconveniences first.
      push("F22", `a third-party notice sits INSIDE the content region this span came from (${JSON.stringify(check.detail)}) — a person must rule before it is stored`);
    } else if (check.spanRegionConflict === undefined) {
      push("F22", `the third-party check predates the region ruling — re-run it, because "clear" over a whole page is not the question`);
    }
  }

  // ── F14 · A CONFLICT IS FROZEN, NOT RESOLVED BY WHOEVER WROTE LAST ────────
  conflictLaws(r, push);

  return { id: r.id ?? derived ?? "(no id)", valid: errors.length === 0, errors };
}

/** F12 — shared by every kind: a derived fact has a life too, and is never edited in place either. */
function lifeLaws(r, push) {
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
}

/** F14 — shared by every kind. */
function conflictLaws(r, push) {
  if (r.life?.status === "conflict" && !r.conflict) {
    push("F14", 'status is "conflict" but no `conflict` block says what disagrees with what');
  }
  if (r.conflict && !isFilled(r.conflict.resolution)) {
    push("F14", "a conflict must name the resolution that would settle it — an open disagreement with no named test never closes");
  }
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

  // ── 🔴 F23 · A SUPERSESSION MAY NOT PROMOTE AN UNKNOWN INTO A PASS ────────
  //
  // This is the real verdict path, and it is the reason `transitions.mjs`
  // exists. A new record replacing an old one is the ONE place a check outcome
  // legitimately changes — so it is the place the transition table must be
  // consulted. Before this, the table governed nothing: it was imported only by
  // its own test, the same shape as the dead runner PR #20 shipped.
  //
  // The forbidden move: an old record says "could-not-check", the replacement
  // says "pass", and no measurement happened in between. That is an absence
  // promoted to evidence.
  const byId = new Map(records.map((r) => [r?.id ?? factId(r?.claim), r]));
  for (const next of records) {
    const previousId = next?.life?.supersedes;
    if (!previousId) continue;
    const previous = byId.get(previousId);
    if (!previous) continue; // F16 already reports a dangling pointer
    for (const v of judgeSupersession({ previous, next })) {
      errors.push({
        law: "F23",
        message: `${next.id ?? "(no id)"} supersedes ${previousId} — ${v.message}`,
      });
    }
  }

  // ── 🔴 F24 · ITEM 50 — A RECORD LEAVES UNKNOWN ONLY THROUGH THE GUARD ─────
  //
  // Every record whose verification names the UNKNOWN it replaces is asked the
  // same question by judgeLeavingUnknown — may it advance to VERIFIED? — and the
  // answer comes from its evidence. The record's declared state must BE that
  // answer: declared past a refusal is a forced transition; held back when the
  // evidence is sufficient is a blocked one. Both are breaches, and the guard's
  // own count travels with the validation so "it judged nothing" is visible.
  //
  // 🔴 D-GUARD-1 (13 September 2026): "none missing" is DERIVED by reconciling the
  // record's declared element list against the keys its verdict names — never read
  // from a count a verdict supplies. Three laws keep the reconciliation honest, each
  // its own code so a failure names the one limb that broke:
  //   F25 · a supplied count, once every governed record declares its list
  //   F26 · a verdict key the record does not declare (stale), or a key named both ways
  //   F27 · a governed record with no element list at all
  //   F30 · 🔴 R4 — a record under the declaration contract whose claimDimensions is absent or malformed
  const guard = { judged: 0, advanced: 0, refused: 0, judgements: [] };
  const governed = records.filter((r) => judgeLeavingUnknown(r?.id, r?.verification, r?.claimElements, r));
  const everyGovernedDeclaresItsList = governed.length > 0 && governed.every((r) => Array.isArray(r.claimElements));
  for (const r of governed) {
    const j = judgeLeavingUnknown(r.id, r.verification, r.claimElements, r);
    guard.judged += 1;
    if (j.decision === "REFUSED") guard.refused += 1;
    else guard.advanced += 1;
    guard.judgements.push(j);
    if (!j.agrees) {
      /* 🔴 F24 EXCEPTION — INTERIM (13 September 2026 evening, beta-g ruling):
       * A record deliberately demoted for elementAmbiguity is lawful even when the
       * guard would advance it. The guard's formula (declared ∩ named-confirmed)
       * cannot police the qualifier, list completeness or binding party — three
       * classes of ambiguity CC flagged in the 13 Sep D-GUARD-1 pass by writing an
       * `elementAmbiguity` field onto the record. Under the owner steer "it will
       * not be made by picking the reading that keeps the label", beta-g demoted
       * these records to UNKNOWN / PARTIAL_EVIDENCE. F24 must not fire on them
       * because the demotion is the ruling, not a bug.
       *
       * This exception is to be REMOVED once the guard's formula is extended to
       * police qualifier / completeness / binder as first-class elements (R4 in
       * `_handoffs/AlmiVisibility_BETA_G_RULING_9_AMBIGUOUS_2026-09-13_NIGHT.md`).
       * At that point the formula would REFUSE these records itself, records and
       * guard would agree, and this exception would never fire.
       *
       * 🔴 16 September 2026 (owner ruling FAISLA 2): R4 LANDED, AND THIS EXCEPTION
       * STAYS. The declaration contract binds verifications dated after
       * DECLARATION_CONTRACT_AFTER (src/facts/schema.mjs); the nine are dated before
       * it, carry no claimDimensions, and are NOT re-judged by it — so the guard
       * still advances them and this exception still keeps them lawful. It goes
       * when R5 re-checks the nine under the contract on actual evidence:
       * R5 = WAITING FOR GREEN A / AUTHORIZED EVIDENCE FETCH. */
      const isAmbiguityDemotion =
        j.permitted === "VERIFIED" && j.declared === "UNKNOWN" && r?.verification?.elementAmbiguity;
      if (!isAmbiguityDemotion) {
        errors.push({
          law: "F24",
          message:
            j.permitted === "VERIFIED"
              ? `${j.id} is held ${j.declared} although the guard finds its evidence sufficient to leave UNKNOWN — a sufficient verdict may not be blocked`
              : `${j.id} is declared ${j.declared} but the guard REFUSES to let it leave UNKNOWN: ${j.reasons.join("; ")}`,
        });
      }
    }
    if (j.elements.suppliedCount.length && everyGovernedDeclaresItsList) {
      errors.push({ law: "F25", message: `${j.id}: the verdict supplies ${j.elements.suppliedCount.join(" and ")} — a count is derived by reconciling element keys, never taken from a verdict` });
    }
    if (j.elements.stale.length || j.elements.contradictory.length) {
      errors.push({
        law: "F26",
        message: `${j.id}: ${j.elements.stale.length ? `the verdict names element key(s) the record does not declare (stale): ${j.elements.stale.join(", ")}` : ""}${j.elements.stale.length && j.elements.contradictory.length ? "; " : ""}${j.elements.contradictory.length ? `key(s) named both confirmed and not found: ${j.elements.contradictory.join(", ")}` : ""}`,
      });
    }
    if (j.elements.missingList) {
      errors.push({ law: "F27", message: `${j.id}: a record leaving UNKNOWN declares no claimElements — what is missing cannot be reconciled` });
    }
    // 🔴 F30 · R4 — under the declaration contract every dimension is declared: as one of the record's elements, or
    // NOT_APPLICABLE where the claim's structure allows it. A declared dimension the verdict did not confirm is not a
    // fault of the declaration — the guard refuses it, and F24 fires if the record is declared past that refusal.
    const faults = Object.entries(j.dimensions ?? {}).filter(([, d]) => DIMENSION_DECLARATION_FAULTS.includes(d.state));
    if (faults.length) {
      errors.push({ law: "F30", message: `${j.id}: under the declaration contract its claimDimensions are not declared — ${faults.map(([dim, d]) => `${dim} ${d.state}`).join(", ")}` });
    }

    /* 🔴 F31 · THE PRE-CONTRACT GRANDFATHERING RULING, ENFORCED.
     *
     * A record that pre-dates the declaration contract may satisfy "labelled on its face" without
     * retrospective claimDimensions — but only when all five declared conditions hold. The five are
     * CONJUNCTIVE: a record failing any one is refused, never excused.
     *
     * 🔴 WHAT THIS CATCHES THAT NOTHING ELSE DID: a pre-contract record whose checker is a
     * `model:` signature. `judgeLeavingUnknown` asks only whether ANYBODY is named and accepts
     * either prefix, so such a record advances today. Grandfathering asks whether a PERSON signed
     * it, and this registry's law is that a model may propose a fact but never be its source.
     * No real record exercises that branch — all 46 signatures are `human:` — so it is driven by a
     * crafted verification in the tests, and is named here rather than left implicit. */
    const grandfathering = judgeGrandfathering({
      verificationState: r.verificationState,
      verification: r.verification,
      claimElements: r.claimElements,
      governed: true,
    });
    if (grandfathering.regime === "REFUSED_PRE_CONTRACT" && j.decision !== "REFUSED") {
      errors.push({
        law: "F31",
        message: `${j.id}: it pre-dates the declaration contract but fails ${grandfathering.failed.join(", ")} — grandfathering is conjunctive, so it may not advance on a pre-contract exemption`,
      });
    }
  }

  // ── 🔴 F29 · ROW 17 — A DERIVED FACT, JUDGED AGAINST THE RECORDS IT CITES ───
  // The source laws waived for a derived record (F28) are paid here instead. Every input resolves to a record in
  // this registry; its standing IS its weakest input's — decided by makeDerivedFact's own ceiling, never a copy of
  // it; and its stored value is what its formula gives over the inputs as they stand now. A mismatch is a finding,
  // never a repair. A primary record dressed as derived cannot pass: its value would have to BE the arithmetic.
  for (const r of records) {
    if (r?.kind !== "derived") continue;
    const inputs = Array.isArray(r.derivation?.inputs) ? r.derivation.inputs : [];
    const found = inputs.map((id) => byId.get(id));
    const dangling = inputs.filter((_, i) => !found[i]);
    if (dangling.length) {
      errors.push({ law: "F29", message: `${r.id}: input ${dangling.join(", ")} is not in the registry — a derived fact cites records, never memories` });
      continue;
    }
    let ceiling;
    try {
      ceiling = makeDerivedFact({ id: r.id, claim: r.claim, formula: r.derivation?.formula, inputs, inputFacts: found, verificationState: r.verificationState }).verificationState;
    } catch (err) {
      errors.push({ law: "F29", message: err.message });
      continue;
    }
    if (r.verificationState !== ceiling) {
      errors.push({ law: "F29", message: `${r.id} is declared ${r.verificationState}, but its weakest input makes it ${ceiling} — a derived fact's standing IS its weakest input's` });
    }
    const again = recomputeDerived(r, found);
    if (!again.ok) {
      errors.push({ law: "F29", message: `${r.id}: stored ${JSON.stringify(again.stored)}, but its formula over the current inputs gives ${JSON.stringify(again.recomputed)} — a finding, never a repair` });
    }
  }

  const recordErrors = results.filter((x) => !x.valid);
  return {
    total: records.length,
    valid: recordErrors.length === 0 && errors.length === 0,
    invalidRecords: recordErrors,
    registryErrors: errors,
    guard,
  };
}
