/**
 * 🔴 F06 §4 · THE STATE-VOCABULARY REGISTER — every `*State` name in src/, bin/, tools/ and config/, classified by what
 * its CODE does with it, never by its English name (measured 24 September 2026: 33 distinct names, the same 33 the
 * pre-flight counted). tools/evidence-state-vocabulary.mjs re-derives the names from the tracked tree and fails on any
 * name found and not registered here, and on any name registered and no longer found.
 *
 * Classes: A CANONICAL_EVIDENCE_STATE · B LEGACY_EXACT_EQUIVALENT · C DOMAIN_SPECIFIC_STATE · D VERDICT_OR_OUTCOME ·
 * E WORKFLOW_OR_BOARD_STATE · F CONFIDENCE_OR_SCORE · G ACTION_OR_RECOMMENDATION_STATUS · H AMBIGUOUS · I DEAD_OR_TEST_ONLY
 *
 * 🔴 NONE OF THESE IS READ AS AN EVIDENCE STATE. The canonical state of a stored item is placed by
 * src/evidence/evidence-state-adapters.mjs from a record's STRUCTURE; C–G stay separate typed dimensions beside it and
 * are not rewritten; H names fail closed — their UNKNOWN is never mapped by name. Where an H or C vocabulary carries a
 * literal UNKNOWN, `unknownMeans` records what its code says it means, so the one word's many meanings stay visible.
 */
export const STATE_VOCABULARY = Object.freeze({
  amountState: { class: "H", where: "src/search/provider.mjs:43 · src/cost/ledger.mjs", unknownMeans: "an amount no tool produced (amount null) — placed NOT_MEASURED by structure (amount null), never by the word; ZERO_BY_TARIFF and MEASURED are rule-derived figures with a basis — INFERRED, value kept", reason: "an epistemic kind of a money figure whose values do not each map to one canonical state by name; the adapter reads amount and basis, not the label" },
  authState: { class: "C", where: "src/search/provider.mjs:25", unknownMeans: "no request reached the property (not queried, or unreachable)", reason: "an HTTP-grant dimension (GRANTED / FORBIDDEN / UNKNOWN)" },
  bindingState: { class: "C", where: "src/detect/subject.mjs:32", reason: "subject-binding dimension; its own code says 'NOT A CONFIDENCE SCALE'" },
  boardState: { class: "E", where: "src/fboard/record-authority.mjs:48", reason: "F-board row state" },
  byQuotabilityState: { class: "I", where: "src/facts/registry.mjs:213", reason: "an aggregate count object, not a field with states" },
  canonicalEvidenceState: { class: "A", where: "src/evidence/legacy-artefacts.mjs", reason: "F06 correction (24 September 2026): the canonical state the compatibility adapter reads from a historical artefact's STRUCTURE — NOT_MEASURED only on a declared measured:false, otherwise UNMAPPED" },
  evidenceState: { class: "A", where: "src/heldout/lifecycle.mjs (scoreClassification)", reason: "F07 Amendment 2 (26 September 2026): the canonical F06 state of a released aggregate score — OBSERVED when counted over a non-empty denominator, NOT_MEASURED when the denominator is empty; assigned by structure, never by a word" },
  byState: { class: "I", where: "bin/facts-lifecycle.mjs:139 · bin/label-on-face.mjs:32", reason: "a local tally variable" },
  classificationState: { class: "C", where: "src/crawl/observation-batch.mjs:269", reason: "a batch's subject-assignment marker, carried as provenance only" },
  collectionState: { class: "C", where: "src/tenancy/resolver.mjs:56", unknownMeans: "the tenancy declaration source could not be read", reason: "a tenancy-resolution dimension" },
  controlState: { class: "I", where: "src/search/ingest.mjs:226", reason: "a local variable holding a classify() result" },
  coverageState: { class: "H", where: "src/crawl/inventory.mjs:23", unknownMeans: "mixes 'measured nothing' (dry run, unreadable sitemap, no run record) with 'measured but coverage not establishable' (unreadable robots for a host)", reason: "a completeness dimension whose UNKNOWN has more than one structural cause" },
  dataState: { class: "H", where: "src/search/provider.mjs:35 · src/search/paginate.mjs:108", unknownMeans: "MAX_REQUESTS (rows kept, total not established) or API_ERROR (a request refused, rowCount null) or a missing record (export fallback)", reason: "a completeness claim whose UNKNOWN has three causes; the adapter reads truncationReason and rowCount, never the word" },
  declarationState: { class: "E", where: "src/intake/contract.mjs", reason: "F01 (24 September 2026): a project declaration's workflow state (SUBMITTED / VALIDATED / ACCEPTED / REFUSED / SUPERSEDED) — disjoint from the canonical evidence states by construction" },
  discoveredState: { class: "E", where: "src/governance/governed-write.mjs:519", reason: "a governed-write recovery state" },
  fBoardState: { class: "E", where: "src/fboard/board.mjs:36", reason: "the F-board state reader (a function)" },
  governedTargetState: { class: "E", where: "src/governance/durability-adapters.mjs:256", reason: "a write-saga flag" },
  grantState: { class: "C", where: "src/intake/contract.mjs", reason: "F01: what intake has done with a permission — DENIED or PENDING only; intake never writes GRANTED" },
  historicalState: { class: "I", where: "src/fboard/board.mjs:64", reason: "only a forbidden property name; never assigned" },
  indexState: { class: "I", where: "src/detect/declared-served.mjs:94", reason: "a local variable holding booleans" },
  memberState: { class: "H", where: "src/discovery/local-reasoning.mjs:294", unknownMeans: "no READ reasoning record for the locality", reason: "mixes an evaluation status, a validity fault and epistemic values" },
  noindexState: { class: "I", where: "src/audit/technical-checks.mjs:64", reason: "a function returning booleans" },
  originalState: { class: "H", where: "src/evidence/legacy-artefacts.mjs", unknownMeans: "the 15 September writer's UNKNOWN, kept verbatim: it covered both never measured and reached-not-established", reason: "a legacy literal preserved losslessly; it is never read as a canonical state" },
  outcomesState: { class: "H", where: "src/search/dimensions.mjs:77", reason: "mixes pipeline status (BUILT_NOT_RUN) with measurement status" },
  overlapState: { class: "H", where: "src/gate-a/existing-pages.mjs:87", reason: "MEASURED names a computed score (OBSERVED or INFERRED is not provable by name); UNMEASURABLE_PAIR and VACUOUS are structural but the set is not an exact equivalent" },
  quotabilityState: { class: "C", where: "src/facts/licences.mjs:71", reason: "a licence standing (PERMITTED / RESERVED / PROHIBITED / UNREAD)" },
  reachabilityState: { class: "I", where: "src/crawl/ipv6.mjs:144", reason: "a function; its returned state is a domain reachability value" },
  readState: { class: "C", where: "src/discovery/local-reasoning.mjs:99", reason: "how reading a reasoning source ended (READ / NOT_READ / REFUSED)" },
  recordState: { class: "E", where: "src/fboard/record-authority.mjs:48", reason: "the board state an evidence record claims" },
  recordedCoverageState: { class: "H", where: "src/report/view.mjs:61", reason: "a display copy of coverageState" },
  renderState: { class: "C", where: "src/render/render-state.mjs:28", reason: "render completeness (COMPLETE / PARTIAL / FAILED)" },
  requestedState: { class: "C", where: "src/intake/contract.mjs", reason: "F01: whether a declaration REQUESTED a permission — a request, never a grant" },
  resolvedState: { class: "A", where: "src/facts/lifecycle.mjs:62", unknownMeans: "two sources disagree and nothing is auto-resolved — the question reached, not established", reason: "its one value is exactly canonical UNKNOWN in meaning; it remains a lifecycle field and is not re-typed" },
  robotsState: { class: "C", where: "src/crawl/robots.mjs:32", unknownMeans: "robots.txt could not be read (5xx, error, timeout)", reason: "a robots permission dimension" },
  /* F31 (RR-85, 29 Sep 2026) */
  servedState: { class: "C", where: "src/crawl/scope-inventory.mjs", unknownMeans: "no recorded observation came back with a status (never requested, an error, or skipped) — never inferred", reason: "an inventory page's served-state dimension (OBSERVED with status and time / UNKNOWN)" },
  hasServedState: { class: "I", where: "src/crawl/scope-completeness.mjs", reason: "a predicate's name, not a field with states" },
  requestedWithoutState: { class: "I", where: "src/crawl/scope-completeness.mjs", reason: "a count of in-scope requests with no served state, not a field with states" },
  storedState: { class: "E", where: "src/audit/class-split.mjs:126", reason: "issue lifecycle state (OPEN / CLOSED / SUPERSEDED)" },
  transfersState: { class: "I", where: "src/checklist/classification.mjs:62", reason: "a boolean constant of the historical ledger" },
  unlockState: { class: "I", where: "src/search/row9-terminal.mjs:166", reason: "a function returning an array" },
  verificationState: { class: "C", where: "src/facts/record.mjs:57", unknownMeans: "a check RAN and could not confirm (CONFLICT / INCOMPLETE / PARTIAL_EVIDENCE — or SOURCE_UNREACHABLE, where no reading was produced)", reason: "fact verification — kept separate by the acceptance; the adapter reads its reason and dates, never renames VERIFIED to OBSERVED" },
  waitForLoadState: { class: "I", where: "src/render/renderer.mjs:200", reason: "a third-party method name" },
  /* ── F06's own names (24 September 2026) ─────────────────────────────────────────────────────────────────────── */
  makeEvidenceState: { class: "A", where: "src/evidence/evidence-state.mjs", reason: "the canonical model's one constructor" },
  requireEvidenceState: { class: "A", where: "src/evidence/evidence-state.mjs", reason: "the canonical model's validator for a state from anywhere else" },
  serializeEvidenceState: { class: "A", where: "src/evidence/evidence-state.mjs", reason: "the canonical model's stable serialisation" },
  parseEvidenceState: { class: "A", where: "src/evidence/evidence-state.mjs", reason: "the canonical model's parser, re-validating what it reads" },
  moneyState: { class: "A", where: "src/evidence/evidence-state-adapters.mjs", reason: "the canonical adapter for one money figure" },
  actionState: { class: "I", where: "src/evidence/evidence-state.mjs (COUPLED_DIMENSIONS)", reason: "a name in the list of dimensions forbidden INSIDE an evidence state — not a field" },
  workflowState: { class: "I", where: "src/evidence/evidence-state.mjs (COUPLED_DIMENSIONS)", reason: "a name in the list of dimensions forbidden INSIDE an evidence state — not a field" },
});

export const VOCABULARY_CLASSES = Object.freeze(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);
