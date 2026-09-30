/**
 * 🔴 THE ACTIVE F-BOARD — F01–F90, ITS EIGHT STATES, AND THE RULES THAT MAKE IT TRUTHFUL (22 September 2026).
 *
 * Active completion is measured against F01–F90 only. The historical 61-row ledger (and its 38-row release view) is
 * HISTORICAL — SUPERSEDED FOR ACTIVE PRODUCT ACCOUNTING — DO NOT APPLY AS F-ROW AUTHORITY. It transfers no state and no
 * acceptance authority here.
 *
 * 🔴 TWO BOARDS, TWO VOCABULARIES, ONE NAMESPACE RULE. `VERIFIED-PASS` and `FAILED` exist on both boards. So no function
 * here accepts a bare state string: every state record names its board, and a record from any other board is refused BY
 * NAME — a historical VERIFIED-PASS offered to the F-board is HISTORICAL_STATE_REFUSED, never silently read.
 *
 * STRUCTURAL RULES (not intentions):
 *   · UNASSESSED is not PASS; it may not enter implementation.
 *   · A row leaves UNASSESSED only through a FROZEN four-part acceptance committed in the governance repository — the
 *     ruling's sha256 and the contract's sha256 are pinned, and re-derived here; a changed clause is ACCEPTANCE_TAMPERED.
 *   · Acceptance freezing and implementation are distinct recorded events; implementation may not precede acceptance.
 *   · VERIFIED-PASS needs a recorded verification; existing code never establishes completion.
 *   · BLOCKED-BY-AUTHORITY and BLOCKED-BY-EVIDENCE name their blocker.
 * Generic: no subject, product or client.
 */
import { contractSha256 } from "./acceptance.mjs";
import { resolve, permits } from "../authority/register.mjs";
import { ROW_CONSTRAINTS } from "../../config/fboard/row-constraints.mjs";
import { DISCLOSED_SEALS } from "../../config/fboard/disclosed-seals.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../../config/evidence-roles.mjs";
import { disclosureOf } from "../heldout/disclosed-seal.mjs";
import { CLAUSES } from "./acceptance.mjs";

export const F_BOARD = "F_BOARD";
export const HISTORICAL_BOARDS = Object.freeze(["HISTORICAL_61", "HISTORICAL_38"]);
export const F_STATES = Object.freeze(["UNASSESSED", "ACCEPTANCE-FROZEN", "READY", "IN-PROGRESS", "BLOCKED-BY-AUTHORITY", "BLOCKED-BY-EVIDENCE", "FAILED", "VERIFIED-PASS"]);
/* 89 → 90 on 28 Sep 2026 (Specification Amendment 1, owner ruling a3a777b in the governance repository: F90 appended; the v1 specification's 89 rows are unchanged). */
/* 90 → 91 on 30 Sep 2026 (Specification Amendment 3, RR-103 §2, governance beb7362: F91 Page opportunity planning appended; F01–F90 unchanged). */
export const DENOMINATOR = 91;
const NEEDS_ACCEPTANCE = new Set(["ACCEPTANCE-FROZEN", "READY", "IN-PROGRESS", "FAILED", "VERIFIED-PASS"]);
const IMPLEMENTABLE = new Set(["ACCEPTANCE-FROZEN", "READY", "IN-PROGRESS", "FAILED", "VERIFIED-PASS"]);

export class StateRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.code = code; }
}

/** The ONLY way to read an F-board state: a record naming its board. A bare string or another board's record is refused by name. */
export function fBoardState(record) {
  if (typeof record === "string") throw new StateRefused("BARE_STATE_REFUSED", `"${record}" carries no board identity — a state string is read only with the board that produced it`);
  if (!record || typeof record !== "object" || typeof record.board !== "string") throw new StateRefused("BARE_STATE_REFUSED", "the state record names no board");
  if (HISTORICAL_BOARDS.includes(record.board)) throw new StateRefused("HISTORICAL_STATE_REFUSED", `${record.board} "${record.state}" is historical — it is not F-row authority and transfers no state`);
  if (record.board !== F_BOARD) throw new StateRefused("FOREIGN_BOARD_REFUSED", `board "${record.board}" is not the active F-board`);
  if (!F_STATES.includes(record.state)) throw new StateRefused("UNKNOWN_STATE", `"${record.state}" is not an F-board state`);
  return record.state;
}

/** The full board: every capability, in order; a row not declared is UNASSESSED. */
export function buildBoard(capabilities, declared = {}) {
  return capabilities.map((c) => ({ featureId: c.id, board: F_BOARD, state: "UNASSESSED", events: [], ...(declared[c.id] ?? {}) }));
}

/**
 * Every fault of a board, each with a code. [] means the board is lawful.
 * With `authority` ({ records, now }), every frozen acceptance must ALSO be the CURRENT authority for its declared
 * proposition and scope, naming the very bytes the engine pinned — resolved by the register, no exemption (§6A).
 */
export function boardErrors(board, { capabilities, acceptances = {}, authority = null, constraints = ROW_CONSTRAINTS, disclosedSeals = DISCLOSED_SEALS, registry = EVIDENCE_ROLE_REGISTRY }) {
  const errs = [];
  const ids = board.map((r) => r.featureId);
  const expected = Array.from({ length: DENOMINATOR }, (_, i) => `F${String(i + 1).padStart(2, "0")}`);
  if (board.length !== DENOMINATOR || new Set(ids).size !== DENOMINATOR || expected.some((x) => !ids.includes(x))) errs.push({ code: "DENOMINATOR", why: `the board holds ${board.length} row(s), ${new Set(ids).size} unique; F01–F90 (${DENOMINATOR}) is the only denominator` });
  if (capabilities && (capabilities.length !== DENOMINATOR || capabilities.some((c, i) => c.id !== ids[i]))) errs.push({ code: "NOT_THE_SPECIFICATION", why: "the board's rows are not the specification's capabilities, in order" });
  for (const r of board) {
    const at = r.featureId;
    try { fBoardState(r); } catch (e) { errs.push({ code: e.code, id: at, why: e.message }); continue; }
    if (Object.hasOwn(r, "historicalState") || (r.events || []).some((e) => /^HISTORICAL/.test(e.kind))) errs.push({ code: "HISTORICAL_STATE_IMPORTED", id: at, why: `${at} carries historical state — historical state never transfers to an F-row` });
    const acc = acceptances[at];
    /* 🔴 The GOVERNING freeze is the latest ACCEPTANCE_FROZEN or ACCEPTANCE_AMENDED. An amendment is lawful only when it
     * names, by BOTH hashes, the freeze it amends — the chain is checked link by link, and the original stays as history. */
    const freezes = (r.events || []).filter((e) => e.kind === "ACCEPTANCE_FROZEN" || e.kind === "ACCEPTANCE_AMENDED");
    const frozen = freezes.length && freezes[0].kind === "ACCEPTANCE_FROZEN" ? freezes[freezes.length - 1] : undefined;
    for (let i = 1; i < freezes.length; i += 1) {
      const [prev, next] = [freezes[i - 1], freezes[i]];
      if (next.kind !== "ACCEPTANCE_AMENDED" || next.amends?.contractSha256 !== prev.contractSha256 || next.amends?.ruling?.sha256 !== prev.ruling?.sha256) errs.push({ code: "ACCEPTANCE_CHAIN_BROKEN", id: at, why: `${at}'s ${next.kind} does not name, by both hashes, the freeze it amends` });
    }
    if (acc?.amends && freezes.length > 1 && (acc.amends.contractSha256 !== freezes[freezes.length - 2].contractSha256 || acc.amends.ruling?.sha256 !== freezes[freezes.length - 2].ruling?.sha256)) errs.push({ code: "ACCEPTANCE_CHAIN_BROKEN", id: at, why: `${at}'s acceptance amends a contract other than the freeze before it` });
    if (NEEDS_ACCEPTANCE.has(r.state)) {
      if (!acc || !frozen) errs.push({ code: "NO_FROZEN_ACCEPTANCE", id: at, why: `${at} is ${r.state} with no frozen, committed acceptance` });
      else {
        if (contractSha256(acc) !== acc.contractSha256) errs.push({ code: "ACCEPTANCE_TAMPERED", id: at, why: `${at}'s acceptance no longer hashes to the contract frozen in its ruling` });
        if (frozen.contractSha256 !== acc.contractSha256 || frozen.ruling?.sha256 !== acc.ruling.sha256) errs.push({ code: "ACCEPTANCE_TAMPERED", id: at, why: `${at}'s freeze event does not name the acceptance the engine carries` });
        if (authority) {
          const res = resolve({ records: authority.records, propositionId: acc.authority?.propositionId, scope: acc.authority?.scope, now: authority.now });
          if (!permits(res)) errs.push({ code: "ACCEPTANCE_NOT_CURRENT_AUTHORITY", id: at, why: `${at}'s acceptance ruling resolves ${res.outcome}, not CURRENT — no acceptance without a current authority` });
          else if (res.authority.contentHash !== acc.ruling.sha256) errs.push({ code: "ACCEPTANCE_NOT_THE_CURRENT_RULING", id: at, why: `${at}'s CURRENT authority is ${res.authority.contentHash.slice(0, 12)}…, not the pinned ruling ${acc.ruling.sha256.slice(0, 12)}…` });
        }
      }
    }
    const firstImpl = (r.events || []).findIndex((e) => e.kind === "IMPLEMENTATION");
    const freezeAt = (r.events || []).findIndex((e) => e.kind === "ACCEPTANCE_FROZEN");
    if (firstImpl >= 0 && (freezeAt < 0 || firstImpl < freezeAt)) errs.push({ code: "IMPLEMENTATION_BEFORE_ACCEPTANCE", id: at, why: `${at} records implementation before (or without) its frozen acceptance` });
    if (firstImpl >= 0 && r.state === "UNASSESSED") errs.push({ code: "UNASSESSED_IMPLEMENTED", id: at, why: `${at} is UNASSESSED and may not enter implementation` });
    // A verification counts only when it was run UNDER THIS F-ID over the REAL population — never a fixture, never a
    // historical row's result, and never implied by an IDENTICAL crosswalk relation.
    if (r.state === "VERIFIED-PASS" && !(r.events || []).some((e) => e.kind === "VERIFIED" && e.featureId === at && e.population === "REAL")) errs.push({ code: "PASS_WITHOUT_VERIFICATION", id: at, why: `${at} is VERIFIED-PASS with no verification recorded under ${at} over the real population` });
    if (/^BLOCKED-BY-/.test(r.state) && !(typeof r.blocker === "string" && r.blocker.trim())) errs.push({ code: "BLOCKER_UNNAMED", id: at, why: `${at} is ${r.state} and names no blocker` });
  }
  /* 🔴 A DISCLOSED SEAL CLOSES NOTHING (config/fboard/disclosed-seals.mjs; F10 Acceptance Amendment 3). While a row's registered
   * sealed set is a disclosed seal — its id AND commitment still registered — the row can never be VERIFIED-PASS: every result on
   * that seal is DISCLOSED_POPULATION_AGREEMENT, a weaker class that satisfies no clause requiring a real sealed evaluation. */
  for (const d of disclosedSeals) {
    const row = board.find((r) => r.featureId === d.featureId);
    const live = (registry ?? []).some((e) => disclosureOf(e, [d]));
    if (row && live && row.state === "VERIFIED-PASS") errs.push({ code: "VERIFIED_ON_DISCLOSED_SEAL", id: d.featureId, why: `${d.featureId} is VERIFIED-PASS while its registered sealed set is a DISCLOSED seal (${d.authority.path}); a ${d.evidenceClass} result closes nothing` });
  }
  /* 🔴 CONSTRAINTS ON FUTURE ROWS (config/fboard/row-constraints.mjs): an acceptance frozen for a constrained row must carry
   * the named precondition in one of its four clauses — or the freeze is refused. Each constraint's ruling must be CURRENT. */
  for (const c of constraints) {
    const acc = acceptances[c.featureId];
    const frozenHere = board.some((r) => r.featureId === c.featureId && (r.events || []).some((e) => e.kind === "ACCEPTANCE_FROZEN"));
    if ((acc || frozenHere) && !(acc && CLAUSES.some((k) => String(acc[k] ?? "").replace(/\s+/g, " ").toLowerCase().includes(c.requires.toLowerCase())))) {
      errs.push({ code: "ROW_CONSTRAINT_UNMET", id: c.featureId, why: `${c.featureId}'s acceptance cannot be frozen without "${c.requires}" as an explicit precondition in its four-part contract (${c.ruling.path})` });
    }
    if (authority) {
      const res = resolve({ records: authority.records, propositionId: c.authority.propositionId, scope: c.authority.scope, now: authority.now });
      if (!permits(res)) errs.push({ code: "ROW_CONSTRAINT_WITHOUT_AUTHORITY", id: c.featureId, why: `the constraint on ${c.featureId} is backed by ${c.authority.propositionId}, which resolves ${res.outcome}, not CURRENT` });
    }
  }
  /* 🔴 RR-98 — A CITED COMMAND MUST EXIST. Every board event that cites its governing command names a repository and a file path; that
   * repository and path must be a governance record in the committed authority corpus. Found 30 Sep 2026: three merged rows cited a
   * command file that never existed — a board script derived from the previous row by a global id swap had rewritten the file NAME (commit
   * and sha256 stayed correct), and no check looked. Resolution is against the committed corpus, never a local checkout, so CI decides it
   * too; no repository name is written here. */
  if (authority) {
    const known = new Set((authority.records ?? []).map((x) => (x?.sourceRef?.repo && x.sourceRef.path ? `${x.sourceRef.repo}\u0000${x.sourceRef.path}` : null)).filter(Boolean));
    for (const r of board) {
      for (const e of r.events || []) {
        const c = e?.command;
        if (c && !known.has(`${c.repo}\u0000${c.path}`)) errs.push({ code: "COMMAND_PATH_UNRESOLVED", id: r.featureId, why: `${r.featureId} cites command ${c.path}, which is no governance record in the authority corpus` });
      }
    }
  }
  return errs;
}

/** May this F-row enter implementation? Only with a frozen acceptance; UNASSESSED never. */
export function mayImplement(board, featureId, acceptances = {}) {
  const r = board.find((x) => x.featureId === featureId);
  if (!r) return false;
  return IMPLEMENTABLE.has(fBoardState(r)) && Boolean(acceptances[featureId]);
}

/** The state split (summing to DENOMINATOR, 90) and progress = VERIFIED-PASS / DENOMINATOR. Only F-board records count. */
export function progress(board) {
  const split = Object.fromEntries(F_STATES.map((s) => [s, 0]));
  for (const r of board) split[fBoardState(r)] += 1;
  const passed = split["VERIFIED-PASS"];
  return { split, total: board.length, passed, denominator: DENOMINATOR, progress: passed / DENOMINATOR };
}
