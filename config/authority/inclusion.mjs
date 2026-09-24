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
  /* 🔴 F07 (23 September 2026) — A FROZEN F-ROW ACCEPTANCE, BY THE NAME AN OWNER COMMAND GAVE IT. The F07 command
   * (§2) orders exactly `AlmiVisibility_F07_FROZEN_ACCEPTANCE_2026-09-23.md` and states that the authority to freeze it
   * comes directly from that owner-issued command. No earlier rule took that name (it carries no RULING/DECISION/OWNER
   * token), so the board could never have resolved it CURRENT — F07 would have been refused
   * ACCEPTANCE_NOT_CURRENT_AUTHORITY the moment it left UNASSESSED. The issuer is assigned BY PATTERN, exactly as the
   * command-record rule above assigns it: the file exists only as the verbatim act of an owner command. Narrow on
   * purpose: one F-row id, the fixed words, one date. */
  Object.freeze({ id: "frozen-f-row-acceptance", re: /^AlmiVisibility_F\d{2}_FROZEN_ACCEPTANCE_\d{4}-\d{2}-\d{2}\.md$/, issuer: "OWNER" }),
  /* 🔴 F02 (24 September 2026) — THE SAME ACT UNDER THE NAME THE F02 COMMAND GAVE IT. §2 of that command orders exactly
   * `AlmiVisibility_F02_ACCEPTANCE_2026-09-24.md` (no FROZEN token), so the rule above could not take it and F02's
   * acceptance resolved ABSENT (`node bin/authority-resolve.mjs --proposition=F02_ACCEPTANCE --scope=ALMIVISIBILITY/F02`,
   * measured before this line). Same terms as F07's: issuer by pattern, one F-row id, the fixed word, one date. On the day
   * it was added it matched exactly one committed file. */
  Object.freeze({ id: "f-row-acceptance", re: /^AlmiVisibility_F\d{2}_ACCEPTANCE_\d{4}-\d{2}-\d{2}\.md$/, issuer: "OWNER" }),
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
