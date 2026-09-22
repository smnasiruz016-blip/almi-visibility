/**
 * 🔴 THE REAL AUTHORITY CORPUS — THE INCLUSION RULE, DECLARED BEFORE SELECTION (22 September 2026, F05 §7).
 *
 * INCLUDE, from committed material only:
 *   · owner rulings, decisions and clarifications;
 *   · feature master commands and command records (feature-specific governance, recorded verbatim from the owner);
 *   · other governance files whose name declares a ruling — issuer taken ONLY from a name token that declares one;
 *   · the frozen acceptance source and its amendments.
 * EXCLUDE entirely: reports (results, resumes, handoffs, packets, censuses, verifications, plans, registers, briefs);
 * subject facts and product content; directional market descriptions; held-out payload; sealed material; and the
 * historical ledger's status records — those enter the F-board crosswalk as PROVENANCE, never this candidate set.
 *
 * Every record field is taken from STRUCTURED IDENTITY — the file's name pattern, the date in its name (else its first
 * commit date, marked as such), its committed bytes' hash — never from its prose. A file whose name declares a ruling
 * but no issuer is recorded with an undeclared issuer, and the resolver finds it INVALID rather than guessing.
 */
export const GOVERNANCE_RULES = Object.freeze([
  Object.freeze({ id: "owner-ruling-decision-clarification", re: /^AlmiVisibility_([A-Z0-9]+_)*OWNER_[A-Z0-9_]*?(RULING|RULINGS|DECISION|CLARIFICATION)[A-Za-z0-9_-]*\.md$/, issuer: "OWNER" }),
  Object.freeze({ id: "feature-master-command", re: /^AlmiVisibility_FEATURE_MASTER_COMMAND_[A-Za-z0-9_-]+\.md$/, issuer: "OWNER" }),
  Object.freeze({ id: "command-record", re: /^(AlmiVisibility_)?CC_COMMAND_[A-Za-z0-9_-]+\.md$/, issuer: "OWNER" }),
  Object.freeze({ id: "other-declared-ruling", re: /^AlmiVisibility_[A-Za-z0-9_-]*(RULING|DECISION)[A-Za-z0-9_-]*\.md$/, issuer: null, issuerTokens: Object.freeze({ BETA_G: "BETA_G", OWNER: "OWNER" }) }),
]);
/**
 * EXCLUDED BEFORE ANY RULE IS TRIED: a name that declares a REPORT about governance rather than an act of it — a
 * register, resume, report, result, packet, handoff, census, verification, plan, brief, or a sheet prepared FOR a decision.
 *
 * REVISED ONCE, 22 September, after the first census listed its near-misses (names carrying RULING, DECISION, COMMAND or
 * CLARIFICATION that no rule took, and included names that were reports): the owner rule now finds OWNER after a row
 * token (ROW61_OWNER_DECISION); an undated command record is taken with its first-commit date; an issuer-less DECISION
 * is recorded like an issuer-less RULING (and found INVALID); and this exclusion was added — two ruling REGISTERS had
 * entered as rulings. The report word must be the document's TYPE — it FOLLOWS the ruling/decision token — never its
 * topic: GAP2_MEASURE_CENSUS_BEFORE_FIXING_RULING is a ruling about a census, and a command record is never excluded
 * (…_AUTHORITY_REGISTER_CHAIN is a command whose subject is a register). A first draft of this line excluded by topic
 * and dropped seven governing records; its near-miss listing caught it.
 */
export const EXCLUDE = /^(?!(AlmiVisibility_)?CC_COMMAND_|AlmiVisibility_FEATURE_MASTER_COMMAND_).*(RULINGS?|DECISION|CLARIFICATION)_([A-Za-z0-9-]+_)*?(REGISTER|RESUME|REPORT|RESULTS?|PACKET|HANDOFF|CENSUS|VERIFICATION|PLAN|BRIEF|SHEET)(_|\.|$)/;
export const ENGINE_RULES = Object.freeze([
  Object.freeze({ id: "frozen-acceptance-source", re: /^PASS_BOUNDARIES_SOURCE\.md$/, issuer: "OWNER" }),
  Object.freeze({ id: "amendment", re: /^PASS_BOUNDARIES_AMENDMENT_\d+\.md$/, issuer: "OWNER" }),
]);
export const SCOPE_ROOT = "ALMIVISIBILITY";
